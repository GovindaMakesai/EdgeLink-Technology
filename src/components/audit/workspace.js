'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PipelineRail } from '@/components/visuals/pipeline';
import { BreakdownBars, ScoreRing } from '@/components/visuals/score';
import { QueryChart, RankBars } from '@/components/visuals/charts';
import { Badge, Button, priorityTone, statusTone } from '@/components/ui/primitives';
import { formatDate, formatNumber, formatPercent } from '@/lib/utils';

function issueText(item) {
  if (typeof item === 'string') return item;
  return item?.finding || item?.fix || '';
}

export function AuditWorkspace({ audit, history = [], allowDelivery = false }) {
  const router = useRouter();
  const [live, setLive] = useState({
    status: audit.status,
    progress: audit.progress,
    currentStep: audit.currentStep,
    errorMessage: audit.errorMessage,
    startedAt: audit.startedAt,
    completedAt: audit.completedAt,
    stepLabel: audit.currentStep,
  });
  const [busy, setBusy] = useState('');
  const running = !['COMPLETED', 'FAILED'].includes(live.status);
  const result = audit.result;
  const previous = history.find((item) => item.id !== audit.id && item.overallScore !== null);
  const delta = result && previous?.overallScore !== null && previous?.overallScore !== undefined
    ? `${result.overallScore - previous.overallScore >= 0 ? 'Up' : 'Down'} ${Math.abs(result.overallScore - previous.overallScore)} from the previous scored audit`
    : null;

  useEffect(() => {
    if (!running) return undefined;
    const timer = setInterval(async () => {
      const response = await fetch(`/api/audits/${audit.id}/status`, { cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json();
      setLive(data);
      if (data.status === 'COMPLETED' || data.status === 'FAILED') {
        router.refresh();
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [running, audit.id, router]);

  async function deliver() {
    setBusy('deliver');
    const response = await fetch(`/api/audits/${audit.id}/deliver`, { method: 'POST' });
    const data = await response.json();
    setBusy('');
    if (!response.ok) {
      toast.error(data.error || 'Delivery failed');
      return;
    }
    if (data.whatsapp?.status === 'not_sent' || data.whatsapp?.status === 'failed') {
      toast.error(data.whatsapp.reason || 'WhatsApp was not sent');
    } else {
      toast.success(`WhatsApp ${data.whatsapp?.status || 'accepted'}`);
    }
    router.refresh();
  }

  async function retry() {
    setBusy('retry');
    const response = await fetch(`/api/audits/${audit.id}/run`, { method: 'POST' });
    const data = await response.json();
    setBusy('');
    if (!response.ok) {
      toast.error(data.error || 'Could not requeue');
      return;
    }
    toast.success('Audit queued again');
    setLive({ ...live, status: 'QUEUED', progress: 2, currentStep: 'queued', errorMessage: null });
    router.refresh();
  }

  const pagespeed = audit.signals?.pagespeed || {};
  const audits = pagespeed.audits || {};
  const cwv = [
    ['LCP', audits['largest-contentful-paint']?.displayValue, audits['largest-contentful-paint']?.score],
    ['CLS', audits['cumulative-layout-shift']?.displayValue, audits['cumulative-layout-shift']?.score],
    ['INP', audits['interaction-to-next-paint']?.displayValue, audits['interaction-to-next-paint']?.score],
  ];

  return (
    <div>
      <header className="page-header">
        <div>
          <p className="eyebrow">{audit.website?.client?.isDemo ? 'Demo client' : 'Audit'}</p>
          <h1>{audit.website?.client?.name}</h1>
          <p className="lede">{audit.website?.url}</p>
        </div>
        <div className="row-actions">
          <Badge tone={statusTone(live.status)}>{live.status.replaceAll('_', ' ')}</Badge>
          {audit.report ? (
            <a className="btn btn-secondary" href={`/api/audits/${audit.id}/report`}>Download PDF</a>
          ) : null}
          {allowDelivery && audit.status === 'COMPLETED' ? (
            <Button onClick={deliver} disabled={busy === 'deliver'}>{busy === 'deliver' ? 'Sending' : 'Send WhatsApp'}</Button>
          ) : null}
          {allowDelivery && live.status === 'FAILED' ? (
            <Button onClick={retry} disabled={busy === 'retry'}>Retry audit</Button>
          ) : null}
        </div>
      </header>

      <section className="hero-grid">
        <article className="score-card">
          {result ? (
            <ScoreRing score={result.overallScore} delta={delta} />
          ) : (
            <div>
              <span className="label">SEO health</span>
              <h2 style={{ marginTop: 8 }}>{live.stepLabel || 'Queued'}</h2>
              <p className="lede">The score appears when analysis is saved.</p>
            </div>
          )}
          <div style={{ marginTop: 18 }}>
            <div className="progress-track" aria-hidden="true">
              <div className="progress-fill" style={{ width: `${live.progress || 0}%` }} />
            </div>
            <p className="lede">Pipeline progress {live.progress || 0}%. This is not the SEO score.</p>
            <p className="lede">{audit.businessType} · Submitted location {audit.city}, {audit.state}</p>
          </div>
          <div style={{ marginTop: 12 }}>
            <Badge tone={(result?.aiSource || live.aiSource) === 'claude' ? 'good' : 'violet'}>
              AI Analysis: {(result?.aiSource || live.aiSource) === 'claude' ? 'Claude API' : 'Not completed'}
            </Badge>
          </div>
        </article>
        <article className="panel">
          <PipelineRail
            status={live.status}
            currentStep={live.currentStep}
            startedAt={live.startedAt || audit.startedAt}
            completedAt={live.completedAt || audit.completedAt}
          />
          {live.status === 'ANALYZING' && live.currentStep === 'ai-analysis' ? (
            <div className="ai-live" style={{ marginTop: 8 }}>
              <span className="ai-orb" />
              <div>
                <strong>Analyzing SEO signals</strong>
                <div className="label">Structured recommendations are being prepared</div>
              </div>
            </div>
          ) : null}
        </article>
      </section>

      {live.errorMessage ? <div className="error-banner" style={{ marginBottom: 16 }}>{live.errorMessage}</div> : null}

      {result ? (
        <>
          <section className="split-3">
            <article className="panel">
              <h2>Score breakdown</h2>
              {result.scoreBreakdown?.core_web_vitals_status && result.scoreBreakdown.core_web_vitals_status !== 'COMPLETED' ? (
                <p className="form-note">Core Web Vitals are {result.scoreBreakdown.core_web_vitals_status.replaceAll('_', ' ').toLowerCase()} and are left out of this score.</p>
              ) : null}
              <div style={{ marginTop: 16 }}><BreakdownBars breakdown={result.scoreBreakdown} /></div>
            </article>
            <article className="panel">
              <h2>Core Web Vitals</h2>
              {pagespeed.analyzed ? null : <p className="form-note">{pagespeed.reason || 'Core Web Vitals were not measured. No lab score is shown.'}</p>}
              {pagespeed.analyzed ? <div className="cwv-grid" style={{ marginTop: 14 }}>
                {cwv.map(([label, display, score]) => (
                  <div className="cwv" key={label}>
                    <div>
                      <span className="label">{label}</span>
                      <b>{display || '—'}</b>
                    </div>
                    <Badge tone={(score ?? 0) >= 0.9 ? 'good' : (score ?? 0) >= 0.5 ? 'watch' : 'bad'}>
                      {(score ?? 0) >= 0.9 ? 'Good' : (score ?? 0) >= 0.5 ? 'Needs work' : 'Poor'}
                    </Badge>
                  </div>
                ))}
              </div> : null}
            </article>
            <article className="panel">
              <h2>Executive summary</h2>
              <p className="lede" style={{ color: '#d7deee' }}>{result.executiveSummary}</p>
            </article>
          </section>

          <section className="split-3">
            <article className="panel">
              <h2>Critical issues</h2>
              <ul className="issue-list" style={{ marginTop: 12 }}>
                {(result.criticalIssues || []).map((item) => <li key={issueText(item)}>{issueText(item)}</li>)}
              </ul>
            </article>
            <article className="panel">
              <h2>Important issues</h2>
              <ul className="issue-list" style={{ marginTop: 12 }}>
                {(result.importantIssues || []).map((item) => <li key={issueText(item)}>{issueText(item)}</li>)}
              </ul>
            </article>
            <article className="panel">
              <h2>Quick wins</h2>
              <ul className="issue-list" style={{ marginTop: 12 }}>
                {(result.quickWins || []).map((item) => (
                  <li key={item.finding}>
                    <strong>{item.finding}</strong>
                    <div>{item.fix}</div>
                    <div className="label">{item.estimated_hours}h · {item.estimated_impact} impact</div>
                  </li>
                ))}
              </ul>
            </article>
          </section>

          <section className="panel" style={{ marginBottom: 16 }}>
            <h2>Recommendations</h2>
            <div className="rec-list" style={{ marginTop: 14 }}>
              {(result.recommendations || []).map((item) => (
                <details key={`${item.priority}-${item.finding}`} className={`rec-card ${item.priority}`} open={item.priority === 'CRITICAL'}>
                  <summary>
                    <span>{item.finding}</span>
                    <Badge tone={priorityTone(item.priority)}>{item.priority}</Badge>
                  </summary>
                  <div className="rec-body">
                    <p>{item.fix}</p>
                    <div className="meta-row">
                      <Badge tone="neutral">{item.category}</Badge>
                      <Badge tone="info">{item.estimated_impact} impact</Badge>
                      <Badge tone="neutral">{item.effort}</Badge>
                    </div>
                    <p className="lede">Verify: {item.falsifiability_check}</p>
                  </div>
                </details>
              ))}
            </div>
          </section>

          <section className="split-2">
            <article className="panel">
              <h2>Queries</h2>
              {audit.signals?.gsc?.analyzed ? (
              <>
              <p className="form-note">Retrieved from Google Search Console.</p>
              <p className="lede">
                Clicks {formatNumber(audit.signals?.gsc?.totalClicks)} · impressions {formatNumber(audit.signals?.gsc?.totalImpressions)}
              </p>
              <QueryChart rows={audit.signals?.gsc?.rows} />
              <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr><th>Query</th><th>Clicks</th><th>Impr.</th><th>CTR</th><th>Pos.</th></tr>
                </thead>
                <tbody>
                  {(audit.signals?.gsc?.rows || []).map((row) => (
                    <tr key={row.query}>
                      <td>{row.query}</td>
                      <td>{row.clicks}</td>
                      <td>{formatNumber(row.impressions)}</td>
                      <td>{formatPercent(row.ctr)}</td>
                      <td>{row.position}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
              </>
              ) : <p className="form-note">{audit.signals?.gsc?.reason || 'Search Console was not analyzed. No query numbers are shown.'}</p>}
            </article>
            <article className="panel">
              <h2>Rankings</h2>
              {audit.signals?.rankings?.analyzed ? (
                <>
                  <p className="lede">
                    Position {audit.signals.rankings.client_rank_position ?? '—'} · volume {formatNumber(audit.signals.rankings.keyword_search_volume)}
                  </p>
                  <RankBars items={audit.signals.rankings.tasks?.[0]?.result?.[0]?.items} />
                </>
              ) : <p className="form-note">{audit.signals?.rankings?.reason || 'Rankings were not analyzed. No positions are shown.'}</p>}
              <h2 style={{ marginTop: 22 }}>Schema and crawl</h2>
              <p className="form-note">Read from the live page. These checks are deterministic, not a Claude judgment.</p>
              <p className="lede">Requested {audit.website?.url} · Final {audit.signals?.technical?.finalUrl || '—'} · Canonical {audit.signals?.technical?.canonical || 'Missing'}</p>
              <p className="lede">Redirect hops {audit.signals?.technical?.redirects ?? 0}. Security headers are observations from the response, not ranking-penalty evidence.</p>
              {(audit.signals?.schemaData?.malformed || []).map((error, index) => (
                <p className="lede" key={index}>{typeof error === 'string' ? error : `JSON-LD block ${error.index}: ${error.message}`}</p>
              ))}
              <p className="lede">Types: {(audit.signals?.schemaData?.types || []).join(', ') || 'None detected'}</p>
              <p className="lede">Title: {audit.signals?.onPage?.title?.value || 'Missing'} · HTTP {audit.signals?.technical?.statusCode ?? '—'}</p>
              <p className="lede">Robots: {audit.signals?.robots?.robots?.exists ? 'Found' : 'Missing'} · Sitemap URLs: {audit.signals?.robots?.sitemap?.urlCount ?? 0}</p>
            </article>
          </section>
        </>
      ) : null}

      <section className="panel" style={{ marginTop: 16 }}>
        <h2>Delivery and history</h2>
        <div className="table-wrap">
        <table className="data">
          <thead><tr><th>When</th><th>Channel</th><th>Status</th><th>Reference</th></tr></thead>
          <tbody>
            {(audit.deliveries || []).length ? audit.deliveries.map((item) => (
              <tr key={item.id}>
                <td>{formatDate(item.createdAt)}</td>
                <td>{item.channel}</td>
                <td><Badge tone={item.status === 'failed' ? 'bad' : item.status === 'logged' ? 'watch' : 'good'}>{item.status}</Badge></td>
                <td className="domain">{item.externalId || item.provider}</td>
              </tr>
            )) : <tr><td colSpan={4}>Delivery is recorded after the report step.</td></tr>}
          </tbody>
        </table>
        </div>
        <div className="table-wrap">
        <table className="data">
          <thead><tr><th>Previous audits</th><th>Status</th><th>Score</th></tr></thead>
          <tbody>
            {history.map((item) => (
              <tr key={item.id}>
                <td>{formatDate(item.createdAt)}</td>
                <td>{item.status}</td>
                <td>{item.overallScore ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </section>
    </div>
  );
}
