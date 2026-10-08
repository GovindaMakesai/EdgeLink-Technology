import { getSession } from '@/lib/auth';
import { ensureDemoClient } from '@/services/audit-service';
import { prisma } from '@/lib/prisma';
import { auditInclude } from '@/lib/present';

export async function resolveClientId() {
  const session = getSession();
  if (session?.role === 'client' && session.clientId) return session.clientId;
  const demo = await ensureDemoClient();
  return demo.id;
}

export async function loadClientAudits() {
  const clientId = await resolveClientId();
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { websites: true },
  });
  const audits = await prisma.audit.findMany({
    where: { website: { clientId } },
    orderBy: { createdAt: 'desc' },
    include: auditInclude,
  });
  return { client, audits };
}
