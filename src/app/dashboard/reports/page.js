import { loadClientAudits } from '@/lib/client-data';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function ClientReportsPage() {
  const { audits } = await loadClientAudits();
  const reports = audits.filter((audit) => audit.report);
  return (
    <div>
      <header className="page-header">
        <div>
          <p className="eyebrow">Reports</p>
          <h1>Downloads</h1>
        </div>
      </header>
      <section className="panel">
        {reports.length ? (
          <table className="data">
            <thead><tr><th>Website</th><th>Score</th><th>Date</th><th /></tr></thead>
            <tbody>
              {reports.map((audit) => (
                <tr key={audit.id}>
                  <td>{audit.website.domain}</td>
                  <td>{audit.result?.overallScore ?? '—'}</td>
                  <td>{formatDate(audit.report.createdAt)}</td>
                  <td><a className="btn btn-secondary" href={`/api/audits/${audit.id}/report`}>Download PDF</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div className="empty"><strong>No reports yet</strong><p>Completed audits place a PDF here.</p></div>}
      </section>
    </div>
  );
}
