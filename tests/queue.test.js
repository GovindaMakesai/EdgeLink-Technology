import 'dotenv/config';
import { afterAll, describe, expect, it } from 'vitest';
import { Queue } from 'bullmq';
import { AUDIT_QUEUE_NAME } from '../src/queues/audit-queue';
import { createRedisConnection } from '../src/queues/connection';

describe('seo-audit-jobs queue', () => {
  const connection = createRedisConnection();
  const queue = new Queue(AUDIT_QUEUE_NAME, { connection });

  afterAll(async () => {
    await queue.close();
    connection.disconnect();
  });

  it('uses the required queue name and can enqueue a probe job', async () => {
    expect(AUDIT_QUEUE_NAME).toBe('seo-audit-jobs');
    const job = await queue.add('audit', { auditId: 'probe-only', probe: true }, { removeOnComplete: true });
    const stored = await queue.getJob(job.id);
    expect(stored?.data.probe).toBe(true);
    expect(stored?.queueName).toBe('seo-audit-jobs');
    await stored.remove();
  });
});
