import 'dotenv/config';
import { Worker } from 'bullmq';
import { AUDIT_QUEUE_NAME } from '../queues/audit-queue';
import { createRedisConnection } from '../queues/connection';
import { markAuditFailed, runAuditPipeline } from '../services/pipeline';
import { prisma } from '../lib/prisma';

const worker = new Worker(
  AUDIT_QUEUE_NAME,
  async (job) => {
    if (job.data?.probe) return { probe: true };
    const auditId = job.data?.auditId;
    if (!auditId) throw new Error('Job is missing auditId');

    const audit = await prisma.audit.findUnique({
      where: { id: auditId },
      include: { jobs: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    if (!audit) throw new Error(`Audit ${auditId} no longer exists`);

    const attempts = job.opts.attempts || 1;
    const finalAttempt = job.attemptsMade + 1 >= attempts;
    await runAuditPipeline(auditId, {
      bullJobId: String(job.id),
      jobRecordId: audit.jobs[0]?.id,
      attempts: job.attemptsMade + 1,
      finalAttempt,
    });
    await job.updateProgress(100);
    return { auditId, status: 'COMPLETED' };
  },
  {
    connection: createRedisConnection(),
    concurrency: 2,
  }
);

worker.on('failed', async (job, error) => {
  console.error(`[worker] job ${job?.id || 'unknown'} failed: ${error.message}`);
  if (!job?.data?.auditId || job.data.probe) return;
  const attempts = job.opts.attempts || 1;
  if (job.attemptsMade >= attempts) {
    await markAuditFailed(job.data.auditId, error.message || 'Audit failed');
  }
});

worker.on('ready', () => {
  console.log(`[worker] listening on ${AUDIT_QUEUE_NAME}`);
});

async function shutdown() {
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
