import { AuditTable } from '@/components/audit/table';
import { presentAudit } from '@/lib/present';
import { loadClientAudits } from '@/lib/client-data';

export const dynamic = 'force-dynamic';

export default async function ClientAuditsPage() {
  const { audits } = await loadClientAudits();
  return (
    <div>
      <header className="page-header">
        <div>
          <p className="eyebrow">History</p>
          <h1>Your audits</h1>
        </div>
      </header>
      <section className="panel">
        <AuditTable audits={audits.map(presentAudit)} basePath="/dashboard/audits" />
      </section>
    </div>
  );
}
