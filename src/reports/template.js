import { escapeHtml } from '../lib/utils';

function list(items, render) {
  const values = Array.isArray(items) ? items : [];
  if (!values.length) return '<p class="muted">None recorded.</p>';
  return `<ul>${values.map((item) => `<li>${render(item)}</li>`).join('')}</ul>`;
}

function scoreRow(label, value) {
  return `<tr><td>${escapeHtml(label)}</td><td class="num">${escapeHtml(value)}</td></tr>`;
}

export function renderReportHtml(report) {
  const result = report.result || {};
  const breakdown = result.scoreBreakdown || {};
  const client = report.client || {};
  const website = report.website || {};
  const pagespeed = report.pagespeed || {};
  const audits = pagespeed.audits || {};
  const gsc = report.gsc || {};
  const rankings = report.rankings || {};
  const technical = report.technical || {};
  const onPage = report.onPage || {};
  const schema = report.schema || {};

  const recommendations = Array.isArray(result.recommendations) ? result.recommendations : [];
  const quickWins = Array.isArray(result.quickWins) ? result.quickWins : [];

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>EdgeLink SEO report</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: "Segoe UI", Helvetica, Arial, sans-serif; color: #172033; background: #fff; }
    header { background: #10182b; color: white; padding: 36px 42px 28px; }
    .brand { letter-spacing: 0.18em; text-transform: uppercase; font-size: 11px; color: #b7b0ff; }
    h1 { margin: 8px 0 0; font-size: 28px; font-weight: 650; }
    .sub { color: #c9d0df; margin-top: 8px; font-size: 13px; }
    main { padding: 28px 42px 48px; }
    h2 { font-size: 16px; margin: 28px 0 10px; }
    .grid { display: flex; gap: 16px; }
    .score { width: 180px; border: 1px solid #e6e8f0; border-radius: 16px; padding: 16px; }
    .score b { display: block; font-size: 42px; line-height: 1; }
    .muted { color: #667085; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { text-align: left; padding: 8px 6px; border-bottom: 1px solid #eceef5; vertical-align: top; }
    th { color: #667085; font-weight: 600; }
    .num { font-variant-numeric: tabular-nums; }
    .card { border: 1px solid #e6e8f0; border-radius: 12px; padding: 12px 14px; margin-bottom: 8px; }
    .tag { display: inline-block; font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: #5146c7; }
    p { font-size: 13px; line-height: 1.5; }
  </style>
</head>
<body>
  <header>
    <div class="brand">EdgeLink SEO Intelligence</div>
    <h1>${escapeHtml(client.name || 'Client')} SEO audit</h1>
    <div class="sub">${escapeHtml(website.url || '')} · ${escapeHtml(report.generatedAt || '')}</div>
  </header>
  <main>
    <div class="grid">
      <div class="score">
        <span class="muted">Overall score</span>
        <b>${escapeHtml(result.overallScore ?? '—')}</b>
        <span class="muted">out of 100</span>
      </div>
      <div style="flex:1">
        <h2 style="margin-top:0">Executive summary</h2>
        <p>${escapeHtml(result.executiveSummary || '')}</p>
        <p class="muted">${escapeHtml(report.businessType || '')} · ${escapeHtml(report.city || '')}, ${escapeHtml(report.state || '')} · Keyword: ${escapeHtml(report.targetKeyword || '')}</p>
      </div>
    </div>

    <h2>Score breakdown</h2>
    <table>
      ${scoreRow('Technical', breakdown.technical)}
      ${scoreRow('On-page', breakdown.on_page)}
      ${scoreRow('Content', breakdown.content)}
      ${scoreRow('Core Web Vitals', breakdown.core_web_vitals)}
      ${scoreRow('Schema', breakdown.schema)}
    </table>

    <h2>Critical issues</h2>
    ${list(result.criticalIssues, (item) => escapeHtml(typeof item === 'string' ? item : item.finding || ''))}

    <h2>Important issues</h2>
    ${list(result.importantIssues, (item) => escapeHtml(typeof item === 'string' ? item : item.finding || ''))}

    <h2>Quick wins</h2>
    ${list(quickWins, (item) => `${escapeHtml(item.finding || item)} — ${escapeHtml(item.fix || '')}`)}

    <h2>Recommendations</h2>
    ${recommendations.map((item) => `<div class="card"><span class="tag">${escapeHtml(item.priority)} · ${escapeHtml(item.category)} · ${escapeHtml(item.estimated_impact)} impact · ${escapeHtml(item.effort)}</span><p><strong>${escapeHtml(item.finding)}</strong></p><p>${escapeHtml(item.fix)}</p><p class="muted">Verify: ${escapeHtml(item.falsifiability_check)}</p></div>`).join('')}

    <h2>Technical and on-page</h2>
    <table>
      ${scoreRow('HTTP status', technical.statusCode)}
      ${scoreRow('HTTPS', technical.https ? 'Yes' : 'No')}
      ${scoreRow('Response ms', technical.timingMs)}
      ${scoreRow('Title', onPage.title?.value || 'Missing')}
      ${scoreRow('Meta description', onPage.metaDescription?.value || 'Missing')}
      ${scoreRow('H1 count', onPage.h1?.count ?? 0)}
      ${scoreRow('Word count', onPage.content?.wordCount ?? 0)}
      ${scoreRow('Images missing alt', onPage.images?.missingAlt ?? 0)}
    </table>

    <h2>Core Web Vitals</h2>
    <table>
      ${scoreRow('Performance', pagespeed.categories?.performance?.score ?? '—')}
      ${scoreRow('LCP', audits['largest-contentful-paint']?.displayValue || '—')}
      ${scoreRow('CLS', audits['cumulative-layout-shift']?.displayValue || '—')}
      ${scoreRow('INP', audits['interaction-to-next-paint']?.displayValue || '—')}
      ${scoreRow('Render blocking', audits['render-blocking-resources']?.description || '—')}
      ${scoreRow('Unused JavaScript', audits['unused-javascript']?.displayValue || '—')}
    </table>

    <h2>Schema</h2>
    <p>Types: ${escapeHtml((schema.types || []).join(', ') || 'None detected')}</p>
    ${list(schema.observations || schema.findings?.map((item) => item.message) || [], (item) => escapeHtml(item))}

    <h2>Google Search Console</h2>
    <p class="muted">Clicks ${escapeHtml(gsc.totalClicks ?? '—')} · Impressions ${escapeHtml(gsc.totalImpressions ?? '—')} · Coverage errors ${escapeHtml(gsc.indexCoverageErrors ?? '—')}</p>
    <table>
      <tr><th>Query</th><th>Clicks</th><th>Impressions</th><th>CTR</th><th>Position</th></tr>
      ${(gsc.rows || []).map((row) => `<tr><td>${escapeHtml(row.query)}</td><td>${escapeHtml(row.clicks)}</td><td>${escapeHtml(row.impressions)}</td><td>${escapeHtml(row.ctr)}</td><td>${escapeHtml(row.position)}</td></tr>`).join('')}
    </table>

    <h2>Rankings</h2>
    <p>Client position ${escapeHtml(rankings.client_rank_position ?? '—')} · Search volume ${escapeHtml(rankings.keyword_search_volume ?? '—')}</p>
    <table>
      <tr><th>Rank</th><th>Domain</th></tr>
      ${((rankings.tasks?.[0]?.result?.[0]?.items) || []).map((item) => `<tr><td>${escapeHtml(item.rank_absolute)}</td><td>${escapeHtml(item.domain)}</td></tr>`).join('')}
    </table>
  </main>
</body>
</html>`;
}
