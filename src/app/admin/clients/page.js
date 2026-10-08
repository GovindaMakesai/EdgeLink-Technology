import { ClientCreate } from '@/components/clients/create';
import { Badge } from '@/components/ui/primitives';
import { prisma } from '@/lib/prisma';
import { ensureDemoClient } from '@/services/audit-service';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function ClientsPage() {
  await ensureDemoClient();
  const clients = await prisma.client.findMany({
    orderBy: { createdAt: 'desc' },
    include: { websites: true, _count: { select: { websites: true } } },
  });
  return (
    <div>
      <header className="page-header">
        <div>
          <p className="eyebrow">Clients</p>
          <h1>Accounts</h1>
          <p className="lede">Example Dental Clinic is demo data, not a real customer.</p>
        </div>
        <ClientCreate />
      </header>
      <section className="panel">
        <table className="data">
          <thead><tr><th>Client</th><th>Contact</th><th>Websites</th><th>Added</th></tr></thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id}>
                <td>{client.name} {client.isDemo ? <Badge tone="violet">Demo</Badge> : null}</td>
                <td>{client.email || '—'}<div className="domain">{client.phone || ''}</div></td>
                <td>{client.websites.map((site) => site.domain).join(', ') || '—'}</td>
                <td>{formatDate(client.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
