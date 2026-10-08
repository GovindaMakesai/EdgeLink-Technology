import { AuditForm } from '@/components/audit/form';
import { ensureDemoClient } from '@/services/audit-service';
import { prisma } from '@/lib/prisma';
import { demoFormDefaults } from '@/lib/demo-target';

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
          <p className="lede">The URL is prefilled from the demo target. Replace it with any other public website before you start.</p>
        </div>
      </header>
      <AuditForm
        clients={clients.map((client) => ({ id: client.id, name: client.name, isDemo: client.isDemo }))}
        defaults={demoFormDefaults()}
      />
    </div>
  );
}
