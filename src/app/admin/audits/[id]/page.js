import { notFound } from 'next/navigation';
import { AuditWorkspace } from '@/components/audit/workspace';
import { auditInclude, presentAudit } from '@/lib/present';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function AuditDetailPage({ params }) {
  const audit = await prisma.audit.findUnique({ where: { id: params.id }, include: auditInclude });
  if (!audit) notFound();
  const history = await prisma.audit.findMany({
    where: { websiteId: audit.websiteId },
    orderBy: { createdAt: 'desc' },
    take: 8,
    include: { result: true },
  });
  return (
    <AuditWorkspace
      allowDelivery
      audit={presentAudit(audit)}
      history={history.map((item) => ({
        id: item.id,
        status: item.status,
        createdAt: item.createdAt.toISOString(),
        overallScore: item.result?.overallScore ?? null,
      }))}
    />
  );
}
