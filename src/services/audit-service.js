import { prisma } from '../lib/prisma';
import { assertPublicHttpUrl } from '../validations/url';
import { domainFromUrl } from '../lib/utils';
import { enqueueAudit } from '../queues/audit-queue';

const DEMO = {
  name: 'Example Dental Clinic',
  email: 'demo-clinic@edgelink.local',
  phone: '+910000000000',
  url: 'https://example-dental-clinic.com/',
  businessType: 'Dental Clinic',
  city: 'Pune',
  state: 'Maharashtra',
  targetKeyword: 'dental clinic pune',
};

export async function ensureDemoClient() {
  const existing = await prisma.client.findFirst({
    where: { isDemo: true },
    include: { websites: true },
  });
  if (existing) {
    const website = existing.websites.find((item) => item.url === DEMO.url) || existing.websites[0];
    if (!website) {
      await prisma.website.create({
        data: {
          clientId: existing.id,
          url: DEMO.url,
          domain: domainFromUrl(DEMO.url),
          businessType: DEMO.businessType,
          city: DEMO.city,
          state: DEMO.state,
          targetKeyword: DEMO.targetKeyword,
        },
      });
    }
    return prisma.client.findUnique({ where: { id: existing.id }, include: { websites: true } });
  }

  return prisma.client.create({
    data: {
      name: DEMO.name,
      email: DEMO.email,
      phone: DEMO.phone,
      isDemo: true,
      websites: {
        create: {
          url: DEMO.url,
          domain: domainFromUrl(DEMO.url),
          businessType: DEMO.businessType,
          city: DEMO.city,
          state: DEMO.state,
          targetKeyword: DEMO.targetKeyword,
        },
      },
    },
    include: { websites: true },
  });
}

export async function createAuditRecord(input) {
  const url = assertPublicHttpUrl(input.url);
  const normalizedUrl = url.toString();
  let client = null;

  if (input.clientId) {
    client = await prisma.client.findUnique({ where: { id: input.clientId } });
    if (!client) {
      const error = new Error('Client was not found');
      error.status = 404;
      throw error;
    }
  } else if (input.clientName) {
    client = await prisma.client.findFirst({
      where: { name: { equals: input.clientName, mode: 'insensitive' } },
    });
    if (!client) {
      client = await prisma.client.create({
        data: {
          name: input.clientName,
          email: input.email || null,
          phone: input.phone || null,
        },
      });
    }
  } else {
    const error = new Error('Choose a client or enter a client name');
    error.status = 400;
    throw error;
  }

  const domain = domainFromUrl(normalizedUrl);
  const website = await prisma.website.upsert({
    where: { clientId_url: { clientId: client.id, url: normalizedUrl } },
    create: {
      clientId: client.id,
      url: normalizedUrl,
      domain,
      businessType: input.businessType,
      city: input.city,
      state: input.state,
      targetKeyword: input.targetKeyword,
    },
    update: {
      businessType: input.businessType,
      city: input.city,
      state: input.state,
      targetKeyword: input.targetKeyword,
    },
  });

  const audit = await prisma.audit.create({
    data: {
      websiteId: website.id,
      status: 'QUEUED',
      progress: 2,
      currentStep: 'queued',
      businessType: input.businessType,
      city: input.city,
      state: input.state,
      targetKeyword: input.targetKeyword,
    },
  });

  const jobRecord = await prisma.auditJob.create({
    data: {
      auditId: audit.id,
      status: 'QUEUED',
      progress: 2,
      stage: 'queued',
    },
  });

  try {
    const bullJob = await enqueueAudit(audit.id);
    await prisma.audit.update({
      where: { id: audit.id },
      data: { bullJobId: String(bullJob.id) },
    });
    await prisma.auditJob.update({
      where: { id: jobRecord.id },
      data: { bullJobId: String(bullJob.id) },
    });
  } catch (error) {
    await prisma.audit.update({
      where: { id: audit.id },
      data: {
        status: 'FAILED',
        currentStep: 'failed',
        errorMessage: error.message || 'Could not enqueue the audit',
      },
    });
    await prisma.auditJob.update({
      where: { id: jobRecord.id },
      data: { status: 'FAILED', error: error.message, stage: 'failed' },
    });
    const failure = new Error(error.code === 'REDIS_NOT_CONFIGURED' ? 'Redis is not configured' : 'The audit could not be queued. Check Redis and the worker.');
    failure.status = 503;
    throw failure;
  }

  return prisma.audit.findUnique({
    where: { id: audit.id },
    include: {
      website: { include: { client: true } },
      jobs: true,
    },
  });
}

export async function enqueueMonthlyAudits() {
  await ensureDemoClient();
  const websites = await prisma.website.findMany({ include: { client: true } });
  const created = [];
  for (const website of websites) {
    if (!website.businessType || !website.city || !website.state || !website.targetKeyword) continue;
    const audit = await createAuditRecord({
      url: website.url,
      clientId: website.clientId,
      businessType: website.businessType,
      city: website.city,
      state: website.state,
      targetKeyword: website.targetKeyword,
    });
    created.push(audit.id);
  }
  return created;
}
