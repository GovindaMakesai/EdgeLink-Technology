import Link from 'next/link';
import { AuditTable } from '@/components/audit/table';
import { auditInclude, presentAudit } from '@/lib/present';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function AuditsPage() {
  const audits = await prisma.audit.findMany({
    orderBy: { createdAt: 'desc' },
    include: auditInclude,
    take: 40,
  });
  return (
    <div>
      <header className="page-header">
        <div>
          <p className="eyebrow">Audits</p>
          <h1>All runs</h1>
          <p className="lede">Every queued, running, and finished audit for the workspace.</p>
        </div>
        <Link className="btn btn-primary" href="/admin/audits/new">Start SEO audit</Link>
      </header>
      <section className="panel">
        <AuditTable audits={audits.map(presentAudit)} basePath="/admin/audits" />
      </section>
    </div>
  );
}
