import { Queue } from 'bullmq';
import { createRedisConnection } from './connection';

export const AUDIT_QUEUE_NAME = 'seo-audit-jobs';

const globalForQueue = globalThis;

export function getAuditQueue() {
  if (!globalForQueue.__edgelinkQueue) {
    globalForQueue.__edgelinkQueue = new Queue(AUDIT_QUEUE_NAME, {
      connection: createRedisConnection(),
    });
  }
  return globalForQueue.__edgelinkQueue;
}

export async function enqueueAudit(auditId) {
  const queue = getAuditQueue();
  const job = await queue.add(
    'audit',
    { auditId },
    {
      attempts: 3,
      backoff: { type: 'exponential', delay: 4000 },
      removeOnComplete: 200,
      removeOnFail: 200,
    }
  );
  return job;
}
