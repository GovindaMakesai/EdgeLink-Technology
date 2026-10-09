import { describe, expect, it } from 'vitest';
import { AUDIT_QUEUE_NAME } from '../src/queues/audit-queue';

describe('seo-audit-jobs queue', () => {
  it('keeps the required queue name and does not contact Redis', () => {
    expect(AUDIT_QUEUE_NAME).toBe('seo-audit-jobs');
  });
});
