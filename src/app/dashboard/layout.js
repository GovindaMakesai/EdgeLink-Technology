import { Shell } from '@/components/layout/shell';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { realClaudeEnabled } from '@/services/claude/claude.service';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }) {
  const session = await requireUser();
  let label = session.name || 'Client';
  if (session.role === 'admin') label = 'Admin preview';
  if (session.role === 'client') {
    const client = await prisma.client.findUnique({ where: { id: session.clientId } });
    label = client?.name || label;
  }
  return (
    <Shell role="client" userLabel={label} mockMode={process.env.USE_MOCKS === 'true'} claudeLive={realClaudeEnabled()}>
      {children}
    </Shell>
  );
}
