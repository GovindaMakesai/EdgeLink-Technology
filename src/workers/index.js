import 'dotenv/config';
import { Worker } from 'bullmq';
import { AUDIT_QUEUE_NAME } from '../queues/audit-queue';
import { WORKER_HEARTBEAT_KEY, createRedisConnection, redisTarget } from '../queues/connection';
import { markAuditFailed, runAuditPipeline } from '../services/pipeline';
import { prisma } from '../lib/prisma';
import { resolveStorage } from '../services/storage';
import { CLAUDE_MODEL } from '../ai/claude';

const storage = resolveStorage();
if (storage.kind === 'missing') {
  console.error('[worker] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required when NODE_ENV=production');
  process.exit(1);
}

const connection = createRedisConnection();
const heartbeat = createRedisConnection();
heartbeat.on('error', (error) => {
  console.error(`[worker] heartbeat error: ${error.message}`);
});

async function beat() {
  await heartbeat.set(WORKER_HEARTBEAT_KEY, new Date().toISOString(), 'EX', 30);
}

const worker = new Worker(
  AUDIT_QUEUE_NAME,
  async (job) => {
    if (job.data?.probe) return { probe: true };
    const auditId = job.data?.auditId;
    if (!auditId) throw new Error('Job is missing auditId');
    console.log(`[worker] job ${job.id} started for audit ${auditId}`);

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
      onProgress: (value) => job.updateProgress(value),
    });
    await job.updateProgress(100);
    console.log(`[worker] job ${job.id} completed for audit ${auditId}`);
    return { auditId, status: 'COMPLETED' };
  },
  {
    connection,
    concurrency: 1,
  }
);

worker.on('failed', async (job, error) => {
  console.error(`[worker] job ${job?.id || 'unknown'} failed: ${error.message}`);
  if (!job?.data?.auditId || job.data.probe) return;
  const attempts = job.opts.attempts || 1;
  if (job.attemptsMade >= attempts) {
    try {
      await markAuditFailed(job.data.auditId, error.message || 'Audit failed');
    } catch (persistError) {
      console.error(`[worker] could not persist failure for ${job.data.auditId}: ${persistError.message}`);
    }
  }
});

worker.on('error', (error) => {
  console.error(`[worker] connection error: ${error.message}`);
});

worker.on('ready', () => {
  const model = process.env.ANTHROPIC_MODEL || CLAUDE_MODEL;
  console.log(`[worker] listening on ${AUDIT_QUEUE_NAME}`);
  console.log(`[worker] redis ${redisTarget()}`);
  console.log(`[worker] storage ${storage.kind}${storage.kind === 'supabase' ? ` bucket ${storage.bucket}` : ''}`);
  console.log(`[worker] claude ${process.env.ANTHROPIC_API_KEY ? model : 'deterministic-fallback'}`);
});

const timer = setInterval(() => {
  beat().catch((error) => {
    console.error(`[worker] heartbeat failed: ${error.message}`);
  });
}, 10_000);
beat().catch((error) => {
  console.error(`[worker] heartbeat failed: ${error.message}`);
});

async function shutdown() {
  clearInterval(timer);
  await worker.close();
  await heartbeat.quit().catch(() => {});
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
