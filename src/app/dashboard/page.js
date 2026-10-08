import Link from 'next/link';
import { AuditTable } from '@/components/audit/table';
import { BreakdownBars, ScoreRing } from '@/components/visuals/score';
import { presentAudit } from '@/lib/present';
import { loadClientAudits } from '@/lib/client-data';

export const dynamic = 'force-dynamic';

export default async function ClientHome() {
  const { client, audits } = await loadClientAudits();
  const latest = audits[0] ? presentAudit(audits[0]) : null;
  const website = client?.websites?.[0];
  return (
    <div>
      <header className="page-header">
        <div>
          <p className="eyebrow">{client?.isDemo ? 'Demo portal' : 'Client portal'}</p>
          <h1>{client?.name || 'Your site'}</h1>
          <p className="lede">{website?.url || 'No website is linked yet.'}</p>
        </div>
        {latest?.report ? <a className="btn btn-primary" href={`/api/audits/${latest.id}/report`}>Download PDF</a> : null}
      </header>
      <section className="hero-grid">
        <article className="score-card">
          {latest?.result ? <ScoreRing score={latest.result.overallScore} caption="Latest audit" /> : (
            <div>
              <span className="label">Latest audit</span>
              <h2 style={{ marginTop: 8 }}>Waiting for the first run</h2>
              <p className="lede">Your team starts audits from the admin console.</p>
            </div>
          )}
        </article>
        <article className="panel">
          <h2>Score breakdown</h2>
          <div style={{ marginTop: 16 }}>
            {latest?.result ? <BreakdownBars breakdown={latest.result.scoreBreakdown} /> : <p className="lede">Scores appear after the audit completes.</p>}
          </div>
          {latest?.result?.executiveSummary ? <p className="lede">{latest.result.executiveSummary}</p> : null}
        </article>
      </section>
      <section className="split-3">
        {['Critical issues', 'Important issues', 'Quick wins'].map((title) => {
          const key = title === 'Critical issues' ? 'criticalIssues' : title === 'Important issues' ? 'importantIssues' : 'quickWins';
          const items = latest?.result?.[key] || [];
          return (
            <article className="panel" key={title}>
              <h2>{title}</h2>
              <ul className="issue-list" style={{ marginTop: 12 }}>
                {items.length ? items.map((item) => <li key={item.finding || item}>{item.finding || item}</li>) : <li>Nothing in this group yet.</li>}
              </ul>
            </article>
          );
        })}
      </section>
      <section className="panel">
        <div className="section-head">
          <h2>Previous audits</h2>
          <Link className="btn btn-ghost" href="/dashboard/audits">View all</Link>
        </div>
        <AuditTable audits={audits.map(presentAudit)} basePath="/dashboard/audits" />
      </section>
    </div>
  );
}
