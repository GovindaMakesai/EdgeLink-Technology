import Link from 'next/link';
import { Badge, statusTone } from '@/components/ui/primitives';
import { formatDate } from '@/lib/utils';

export function AuditTable({ audits, basePath }) {
  if (!audits.length) {
    return (
      <div className="empty">
        <strong>No audits yet</strong>
        <p>Start one from the admin console. The list fills in after the worker finishes.</p>
      </div>
    );
  }
  return (
    <div className="table-wrap">
      <table className="data">
        <thead>
          <tr>
            <th>Website</th>
            <th>Client</th>
            <th>Score</th>
            <th>Status</th>
            <th>Date</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {audits.map((audit) => (
            <tr key={audit.id}>
              <td>
                <div>{audit.website?.domain}</div>
                <div className="domain">{audit.targetKeyword}</div>
              </td>
              <td>{audit.website?.client?.name}</td>
              <td>{audit.result?.overallScore ?? '—'}</td>
              <td><Badge tone={statusTone(audit.status)}>{audit.status.replaceAll('_', ' ')}</Badge></td>
              <td>{formatDate(audit.createdAt)}</td>
              <td className="row-actions">
                <Link className="btn btn-secondary" href={`${basePath}/${audit.id}`}>Open</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
