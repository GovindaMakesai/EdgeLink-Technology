import { Shell } from '@/components/layout/shell';
import { requireAdmin } from '@/lib/auth';
import { realClaudeEnabled } from '@/services/claude/claude.service';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }) {
  const session = await requireAdmin();
  return (
    <Shell role="admin" userLabel={session.email || 'Admin'} mockMode={process.env.USE_MOCKS === 'true'} claudeLive={realClaudeEnabled()}>
      {children}
    </Shell>
  );
}
