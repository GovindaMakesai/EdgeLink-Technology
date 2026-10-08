import { Badge, statusTone } from '@/components/ui/primitives';
import { prisma } from '@/lib/prisma';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function JobsPage() {
  const jobs = await prisma.auditJob.findMany({
    orderBy: { createdAt: 'desc' },
    take: 40,
    include: { audit: { include: { website: { include: { client: true } } } } },
  });
  return (
    <div>
      <header className="page-header">
        <div>
          <p className="eyebrow">Queue</p>
          <h1>seo-audit-jobs</h1>
          <p className="lede">BullMQ writes progress back to these job rows while the worker runs.</p>
        </div>
      </header>
      <section className="panel">
        {jobs.length ? (
          <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Client</th><th>Stage</th><th>Progress</th><th>Attempts</th><th>When</th><th /></tr></thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td>{job.audit.website.client.name}<div className="domain">{job.bullJobId || job.id}</div></td>
                  <td><Badge tone={statusTone(job.status)}>{job.stage}</Badge></td>
                  <td>{job.progress}%</td>
                  <td>{job.attempts}</td>
                  <td>{formatDate(job.createdAt)}</td>
                  <td><Link className="btn btn-ghost" href={`/admin/audits/${job.auditId}`}>Audit</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        ) : (
          <div className="empty"><strong>Queue is empty</strong><p>Start an audit to enqueue the first job.</p></div>
        )}
      </section>
    </div>
  );
}
