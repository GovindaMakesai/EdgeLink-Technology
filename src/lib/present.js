const auditInclude = {
  website: { include: { client: true } },
  signals: true,
  result: true,
  report: true,
  jobs: { orderBy: { createdAt: 'desc' } },
  deliveries: { orderBy: { createdAt: 'desc' } },
};

export function presentAudit(audit) {
  if (!audit) return null;
  const iso = (value) => (value ? new Date(value).toISOString() : null);
  return {
    id: audit.id,
    status: audit.status,
    progress: audit.progress,
    currentStep: audit.currentStep,
    businessType: audit.businessType,
    city: audit.city,
    state: audit.state,
    targetKeyword: audit.targetKeyword,
    errorMessage: audit.errorMessage,
    queuedAt: iso(audit.queuedAt),
    startedAt: iso(audit.startedAt),
    completedAt: iso(audit.completedAt),
    createdAt: iso(audit.createdAt),
    website: audit.website
      ? {
          id: audit.website.id,
          url: audit.website.url,
          domain: audit.website.domain,
          client: audit.website.client
            ? {
                id: audit.website.client.id,
                name: audit.website.client.name,
                email: audit.website.client.email,
                phone: audit.website.client.phone,
                isDemo: audit.website.client.isDemo,
              }
            : null,
        }
      : null,
    result: audit.result
      ? {
          overallScore: audit.result.overallScore,
          scoreBreakdown: audit.result.scoreBreakdown,
          criticalIssues: audit.result.criticalIssues,
          importantIssues: audit.result.importantIssues,
          quickWins: audit.result.quickWins,
          recommendations: audit.result.recommendations,
          executiveSummary: audit.result.executiveSummary,
          aiSource: audit.result.aiSource,
          auditVersion: audit.result.auditVersion,
        }
      : null,
    signals: audit.signals
      ? {
          crawl: audit.signals.crawl,
          onPage: audit.signals.onPage,
          technical: audit.signals.technical,
          schemaData: audit.signals.schemaData,
          robots: audit.signals.robots,
          pagespeed: audit.signals.pagespeed,
          gsc: audit.signals.gsc,
          rankings: audit.signals.rankings,
          stageErrors: audit.signals.stageErrors,
        }
      : null,
    report: audit.report
      ? {
          id: audit.report.id,
          fileName: audit.report.fileName,
          bytes: audit.report.bytes,
          createdAt: iso(audit.report.createdAt),
        }
      : null,
    deliveries: (audit.deliveries || []).map((item) => ({
      id: item.id,
      channel: item.channel,
      status: item.status,
      provider: item.provider,
      externalId: item.externalId,
      error: item.error,
      createdAt: iso(item.createdAt),
    })),
    jobs: (audit.jobs || []).map((item) => ({
      id: item.id,
      bullJobId: item.bullJobId,
      status: item.status,
      progress: item.progress,
      stage: item.stage,
      error: item.error,
      attempts: item.attempts,
      createdAt: iso(item.createdAt),
    })),
  };
}

export { auditInclude };
