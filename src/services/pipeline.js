import { prisma } from '../lib/prisma';
import { stepMeta } from '../lib/steps';
import { crawlUrl } from '../crawlers/crawler';
import { analyzeOnPage, analyzeTechnical, analyzeSchema, analyzeRobotsAndSitemap } from './analyzers';
import { getPageSpeed, getSearchConsole, getRankings, sendWhatsApp, sendReportEmail } from './integrations';
import { analyzeSeoData } from './claude/claude.service';
import { generatePdfReport } from '../reports/pdf';

function isTransient(error) {
  if (error?.transient) return true;
  const message = String(error?.message || '').toLowerCase();
  return (
    message.includes('econnrefused') ||
    message.includes('etimedout') ||
    message.includes('timeout') ||
    message.includes('fetch failed') ||
    message.includes('redis') ||
    message.includes("can't reach database") ||
    message.includes('prisma') ||
    message.includes('browser') ||
    message.includes('puppeteer') ||
    (message.includes('supabase storage') && (message.includes('http 5') || message.includes('http 429') || message.includes('http 408')))
  );
}

async function setStage(auditId, jobRecordId, step, extra = {}, onProgress) {
  const meta = stepMeta(step);
  await prisma.audit.update({
    where: { id: auditId },
    data: {
      status: meta.status,
      progress: meta.progress,
      currentStep: step,
      errorMessage: null,
      ...extra,
    },
  });
  if (jobRecordId) {
    await prisma.auditJob.update({
      where: { id: jobRecordId },
      data: {
        stage: step,
        progress: meta.progress,
        status: meta.status,
        error: null,
      },
    });
  }
  console.log(`[worker] ${auditId} → ${step} (${meta.progress}%)`);
  if (onProgress) {
    await Promise.resolve(onProgress(meta.progress)).catch((error) => {
      console.error(`[worker] progress update failed: ${error.message}`);
    });
  }
}

async function saveSignals(auditId, signals) {
  const data = {
    crawl: signals.crawl || undefined,
    onPage: signals.onPage || undefined,
    technical: signals.technical || undefined,
    schemaData: signals.schema || undefined,
    robots: signals.robots || undefined,
    pagespeed: signals.pagespeed || undefined,
    gsc: signals.gsc || undefined,
    rankings: signals.rankings || undefined,
    stageErrors: signals.stageErrors || [],
  };
  await prisma.auditSignal.upsert({
    where: { auditId },
    create: { auditId, ...data },
    update: data,
  });
}

async function capture(signals, key, label, task) {
  try {
    signals[key] = await task();
  } catch (error) {
    signals.stageErrors.push({ stage: label, message: error.message, at: new Date().toISOString() });
    signals[key] = { error: error.message, failed: true };
    console.log(`[worker] ${label} continued after error: ${error.message}`);
  }
}

export async function deliverAudit(audit) {
  const score = audit.result?.overallScore ?? 0;
  const pdfPath = audit.report?.filePath;
  if (!pdfPath) {
    const error = new Error('PDF report is not available yet');
    error.status = 409;
    throw error;
  }
  if (audit.status !== 'COMPLETED' && audit.status !== 'DELIVERING') {
    const error = new Error('Only a completed audit can be delivered');
    error.status = 409;
    throw error;
  }

  const client = audit.website.client;
  let whatsapp;
  try {
    whatsapp = await sendWhatsApp({
      clientId: client.id,
      pdfPath,
      score,
      to: client.phone,
    });
    await prisma.deliveryLog.create({
      data: {
        auditId: audit.id,
        clientId: client.id,
        channel: 'whatsapp',
        status: whatsapp.status,
        provider: whatsapp.sid?.startsWith('MOCK_') ? 'twilio-mock' : 'twilio',
        externalId: whatsapp.sid || null,
        detail: { score, report: audit.report.fileName },
      },
    });
  } catch (error) {
    await prisma.deliveryLog.create({
      data: {
        auditId: audit.id,
        clientId: client.id,
        channel: 'whatsapp',
        status: 'failed',
        provider: 'twilio',
        error: error.message,
      },
    });
    throw error;
  }

  const emailSubject = `EdgeLink SEO report — ${score}/100`;
  const email = await sendReportEmail({
    to: client.email,
    subject: emailSubject,
    pdfPath,
    score,
  });
  await prisma.deliveryLog.create({
    data: {
      auditId: audit.id,
      clientId: client.id,
      channel: 'email',
      status: email.status,
      provider: email.provider,
      detail: { subject: emailSubject, report: audit.report.fileName, delivered: email.delivered },
      error: email.error || null,
    },
  });

  return { whatsapp, email };
}

export async function markAuditFailed(auditId, message) {
  const audit = await prisma.audit.findUnique({ where: { id: auditId } });
  if (!audit || audit.status === 'COMPLETED') return;
  await prisma.audit.update({
    where: { id: auditId },
    data: {
      status: 'FAILED',
      currentStep: 'failed',
      errorMessage: message.slice(0, 500),
    },
  });
  await prisma.auditJob.updateMany({
    where: { auditId, status: { not: 'COMPLETED' } },
    data: { status: 'FAILED', error: message.slice(0, 500), stage: 'failed' },
  });
}

export async function runAuditPipeline(auditId, options = {}) {
  const audit = await prisma.audit.findUnique({
    where: { id: auditId },
    include: { website: { include: { client: true } }, jobs: { orderBy: { createdAt: 'desc' }, take: 1 } },
  });
  if (!audit) throw new Error(`Audit ${auditId} was not found`);
  if (audit.status === 'COMPLETED' && !options.force) return audit;

  const jobRecordId = options.jobRecordId || audit.jobs[0]?.id || null;
  if (jobRecordId) {
    await prisma.auditJob.update({
      where: { id: jobRecordId },
      data: { attempts: options.attempts || 0, bullJobId: options.bullJobId || undefined },
    });
  }

  const signals = { stageErrors: [] };

  try {
    await setStage(audit.id, jobRecordId, 'crawling', {
      startedAt: audit.startedAt || new Date(),
    }, options.onProgress);
    signals.crawl = await crawlUrl(audit.website.url);

    await setStage(audit.id, jobRecordId, 'pagespeed', {}, options.onProgress);
    await capture(signals, 'pagespeed', 'pagespeed', () => getPageSpeed(audit.website.url));

    await setStage(audit.id, jobRecordId, 'search-console', {}, options.onProgress);
    await capture(signals, 'gsc', 'search-console', () => getSearchConsole({ siteUrl: audit.website.url, keyword: audit.targetKeyword }));

    await setStage(audit.id, jobRecordId, 'schema', {}, options.onProgress);
    signals.schema = analyzeSchema(signals.crawl);

    await setStage(audit.id, jobRecordId, 'on-page', {}, options.onProgress);
    signals.onPage = analyzeOnPage(signals.crawl);
    signals.technical = analyzeTechnical(signals.crawl);

    await setStage(audit.id, jobRecordId, 'robots-sitemap', {}, options.onProgress);
    signals.robots = analyzeRobotsAndSitemap(signals.crawl);

    await setStage(audit.id, jobRecordId, 'rankings', {}, options.onProgress);
    await capture(signals, 'rankings', 'rankings', () => getRankings({ keyword: audit.targetKeyword, url: audit.website.url }));

    await setStage(audit.id, jobRecordId, 'ai-analysis', {}, options.onProgress);
    const analysis = await analyzeSignals({
      url: audit.website.url,
      businessType: audit.businessType,
      city: audit.city,
      state: audit.state,
      keyword: audit.targetKeyword,
      crawl: signals.crawl,
      onPage: signals.onPage,
      technical: signals.technical,
      schema: signals.schema,
      robots: signals.robots,
      pagespeed: signals.pagespeed,
      gsc: signals.gsc,
      rankings: signals.rankings,
    });

    await setStage(audit.id, jobRecordId, 'saving', {}, options.onProgress);
    await saveSignals(audit.id, signals);
    const resultData = {
      auditVersion: analysis.data.audit_version,
      overallScore: analysis.data.overall_score,
      scoreBreakdown: analysis.data.score_breakdown,
      criticalIssues: analysis.data.critical_issues,
      importantIssues: analysis.data.important_issues,
      quickWins: analysis.data.quick_wins,
      recommendations: analysis.data.recommendations,
      executiveSummary: analysis.data.executive_summary,
      aiSource: analysis.source,
    };
    await prisma.auditResult.upsert({
      where: { auditId: audit.id },
      create: { auditId: audit.id, ...resultData },
      update: resultData,
    });

    await setStage(audit.id, jobRecordId, 'generating-pdf', {}, options.onProgress);
    const saved = await generatePdfReport(
      {
        result: {
          overallScore: resultData.overallScore,
          scoreBreakdown: resultData.scoreBreakdown,
          criticalIssues: resultData.criticalIssues,
          importantIssues: resultData.importantIssues,
          quickWins: resultData.quickWins,
          recommendations: resultData.recommendations,
          executiveSummary: resultData.executiveSummary,
        },
        client: audit.website.client,
        website: audit.website,
        pagespeed: signals.pagespeed,
        gsc: signals.gsc,
        rankings: signals.rankings,
        technical: signals.technical,
        onPage: signals.onPage,
        schema: signals.schema,
        businessType: audit.businessType,
        city: audit.city,
        state: audit.state,
        targetKeyword: audit.targetKeyword,
        generatedAt: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
      },
      `${audit.id}.pdf`
    );
    await prisma.report.upsert({
      where: { auditId: audit.id },
      create: {
        auditId: audit.id,
        fileName: saved.fileName,
        filePath: saved.filePath,
        bytes: saved.bytes,
      },
      update: {
        fileName: saved.fileName,
        filePath: saved.filePath,
        bytes: saved.bytes,
      },
    });

    await setStage(audit.id, jobRecordId, 'notifying', {}, options.onProgress);
    const fresh = await prisma.audit.findUnique({
      where: { id: audit.id },
      include: {
        website: { include: { client: true } },
        result: true,
        report: true,
      },
    });
    await deliverAudit({ ...fresh, status: 'DELIVERING' });

    await setStage(audit.id, jobRecordId, 'completed', { completedAt: new Date() }, options.onProgress);
    if (jobRecordId) {
      await prisma.auditJob.update({
        where: { id: jobRecordId },
        data: { status: 'COMPLETED', stage: 'completed', progress: 100 },
      });
    }
    return prisma.audit.findUnique({ where: { id: audit.id } });
  } catch (error) {
    await saveSignals(audit.id, signals).catch(() => {});
    const finalAttempt = options.finalAttempt !== false;
    if (!isTransient(error) || finalAttempt) {
      await markAuditFailed(audit.id, error.message || 'Audit pipeline failed');
    } else if (jobRecordId) {
      await prisma.auditJob.update({
        where: { id: jobRecordId },
        data: { error: error.message, attempts: options.attempts || 0 },
      });
    }
    throw error;
  }
}
