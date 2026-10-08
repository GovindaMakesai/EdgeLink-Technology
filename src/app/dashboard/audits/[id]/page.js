import { notFound } from 'next/navigation';
import { AuditWorkspace } from '@/components/audit/workspace';
import { auditInclude, presentAudit } from '@/lib/present';
import { prisma } from '@/lib/prisma';
import { resolveClientId } from '@/lib/client-data';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function ClientAuditPage({ params }) {
  const session = getSession();
  const audit = await prisma.audit.findUnique({ where: { id: params.id }, include: auditInclude });
  if (!audit) notFound();
  if (session?.role !== 'admin') {
    const clientId = await resolveClientId();
    if (audit.website.clientId !== clientId) notFound();
  }
  const history = await prisma.audit.findMany({
    where: { websiteId: audit.websiteId },
    orderBy: { createdAt: 'desc' },
    take: 8,
    include: { result: true },
  });
  return (
    <AuditWorkspace
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
