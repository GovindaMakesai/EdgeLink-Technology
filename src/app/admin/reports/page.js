import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { formatDate, formatNumber } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const reports = await prisma.report.findMany({
    orderBy: { createdAt: 'desc' },
    include: { audit: { include: { website: { include: { client: true } }, result: true } } },
  });
  return (
    <div>
      <header className="page-header">
        <div>
          <p className="eyebrow">Reports</p>
          <h1>PDF archive</h1>
          <p className="lede">Development files stay in the OS temp reports directory and are not committed.</p>
        </div>
      </header>
      <section className="panel">
        {reports.length ? (
          <table className="data">
            <thead><tr><th>Client</th><th>Score</th><th>Size</th><th>Created</th><th /></tr></thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id}>
                  <td>{report.audit.website.client.name}<div className="domain">{report.audit.website.domain}</div></td>
                  <td>{report.audit.result?.overallScore ?? '—'}</td>
                  <td>{formatNumber(report.bytes)} B</td>
                  <td>{formatDate(report.createdAt)}</td>
                  <td className="row-actions">
                    <a className="btn btn-secondary" href={`/api/audits/${report.auditId}/report`}>Download</a>
                    <Link className="btn btn-ghost" href={`/admin/audits/${report.auditId}`}>Open</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div className="empty"><strong>No reports yet</strong><p>A PDF is written when an audit reaches the report stage.</p></div>}
      </section>
    </div>
  );
}
