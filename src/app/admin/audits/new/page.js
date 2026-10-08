import { AuditForm } from '@/components/audit/form';
import { ensureDemoClient } from '@/services/audit-service';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function NewAuditPage() {
  await ensureDemoClient();
  const clients = await prisma.client.findMany({ orderBy: { name: 'asc' } });
  return (
    <div>
      <header className="page-header">
        <div>
          <p className="eyebrow">New audit</p>
          <h1>Start SEO audit</h1>
          <p className="lede">The dental clinic defaults match the assessment demo. Change them for any other site.</p>
        </div>
      </header>
      <AuditForm clients={clients.map((client) => ({ id: client.id, name: client.name, isDemo: client.isDemo }))} />
    </div>
  );
}
