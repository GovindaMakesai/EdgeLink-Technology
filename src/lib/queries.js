import { prisma } from './prisma';
import { auditInclude } from './present';

export async function adminSnapshot() {
  const [clients, websites, grouped, recent, jobs] = await Promise.all([
    prisma.client.count(),
    prisma.website.count(),
    prisma.audit.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.audit.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: auditInclude,
    }),
    prisma.auditJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: { audit: { include: { website: { include: { client: true } } } } },
    }),
  ]);
  const count = (status) => grouped.find((item) => item.status === status)?._count._all || 0;
  const total = grouped.reduce((sum, item) => sum + item._count._all, 0);
  const running = count('QUEUED') + count('CRAWLING') + count('ANALYZING') + count('GENERATING_REPORT') + count('DELIVERING');
  return {
    clients,
    websites,
    total,
    completed: count('COMPLETED'),
    running,
    failed: count('FAILED'),
    recent,
    jobs,
  };
}
