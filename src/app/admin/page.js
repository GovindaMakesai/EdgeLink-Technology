import Link from 'next/link';
import { AuditTable } from '@/components/audit/table';
import { QueryChart } from '@/components/visuals/charts';
import { BreakdownBars, ScoreRing } from '@/components/visuals/score';
import { PipelineRail } from '@/components/visuals/pipeline';
import { presentAudit } from '@/lib/present';
import { adminSnapshot } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function AdminHome() {
  let data;
  try {
    data = await adminSnapshot();
  } catch {
    return (
      <section className="panel">
        <h1>Database unreachable</h1>
        <p className="lede">Confirm DATABASE_URL and run npx prisma generate, then npx prisma db push.</p>
      </section>
    );
  }

  const latest = data.recent[0] ? presentAudit(data.recent[0]) : null;
  const cards = [
    ['Clients', data.clients],
    ['Websites', data.websites],
    ['Total audits', data.total],
    ['Completed', data.completed],
    ['Running', data.running],
    ['Failed', data.failed],
  ];

  return (
    <div>
      <header className="page-header">
        <div>
          <p className="eyebrow">Command</p>
          <h1>SEO intelligence</h1>
          <p className="lede">Queue an audit, watch each stage, and hand the client a report with a score they can defend.</p>
        </div>
        <Link className="btn btn-primary" href="/admin/audits/new">Start SEO audit</Link>
      </header>

      <section className="hero-grid">
        <article className="score-card">
          {latest?.result ? (
            <ScoreRing score={latest.result.overallScore} caption={latest.website?.domain || 'Latest audit'} />
          ) : (
            <div>
              <span className="label">Latest audit</span>
              <h2 style={{ marginTop: 8 }}>{latest ? latest.status.replaceAll('_', ' ') : 'Nothing queued'}</h2>
              <p className="lede">The demo URL is prefilled. Replace it with any public website.</p>
            </div>
          )}
          {latest?.result ? <div style={{ marginTop: 18 }}><BreakdownBars breakdown={latest.result.scoreBreakdown} /></div> : null}
        </article>
        <article className="panel">
          {latest ? (
            <PipelineRail status={latest.status} currentStep={latest.currentStep} startedAt={latest.startedAt} completedAt={latest.completedAt} />
          ) : (
            <div className="empty">
              <strong>Pipeline is idle</strong>
              <p>Start an audit to see crawl, lab data, schema, rankings, and the report stage.</p>
            </div>
          )}
          {latest?.result?.executiveSummary ? <p className="lede">{latest.result.executiveSummary}</p> : null}
        </article>
      </section>

      <section className="kpi-grid">
        {cards.map(([label, value]) => (
          <article className="kpi" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </section>

      <section className="split-2">
        <article className="panel">
          <h2>Recent audits</h2>
          <AuditTable audits={data.recent.map(presentAudit)} basePath="/admin/audits" />
        </article>
        <article className="panel">
          <h2>Query demand</h2>
          <QueryChart rows={latest?.signals?.gsc?.rows} />
          <h2 style={{ marginTop: 8 }}>Latest jobs</h2>
          <ul className="plain-list">
            {data.jobs.length ? data.jobs.map((job) => (
              <li key={job.id}>{job.audit.website.client.name} · {job.stage} · {job.progress}%</li>
            )) : <li>Jobs appear here once an audit is queued.</li>}
          </ul>
        </article>
      </section>
    </div>
  );
}
