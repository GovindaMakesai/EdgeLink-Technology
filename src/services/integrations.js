function unavailable(reason) {
  return { status: 'NOT_ANALYZABLE', analyzed: false, simulated: false, reason };
}

export function mocksEnabled() {
  return false;
}

export async function getPageSpeed(url) {
  const key = process.env.PAGESPEED_API_KEY;
  if (!key) {
    return unavailable('PageSpeed Insights is not configured, so no lab data was collected for this URL.');
  }

  const endpoint = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
  endpoint.searchParams.set('url', url);
  endpoint.searchParams.set('strategy', 'mobile');
  endpoint.searchParams.set('key', key);
  ['performance', 'seo', 'accessibility'].forEach((category) => endpoint.searchParams.append('category', category));

  const response = await fetch(endpoint, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) {
    throw new Error(`PageSpeed request failed with HTTP ${response.status}`);
  }
  const payload = await response.json();
  const lighthouse = payload.lighthouseResult || {};
  const audits = lighthouse.audits || {};
  const pick = (id) => audits[id] ? { score: audits[id].score, displayValue: audits[id].displayValue, description: audits[id].description } : undefined;
  return {
    status: 'COMPLETED',
    analyzed: true,
    simulated: false,
    source: 'pagespeed',
    url,
    strategy: 'mobile',
    categories: {
      performance: { score: lighthouse.categories?.performance?.score ?? null },
      seo: { score: lighthouse.categories?.seo?.score ?? null },
      accessibility: { score: lighthouse.categories?.accessibility?.score ?? null },
    },
    audits: {
      'largest-contentful-paint': pick('largest-contentful-paint'),
      'cumulative-layout-shift': pick('cumulative-layout-shift'),
      'interaction-to-next-paint': pick('interaction-to-next-paint'),
      'render-blocking-resources': pick('render-blocking-resources'),
      'unused-javascript': pick('unused-javascript'),
    },
  };
}

export async function getSearchConsole({ siteUrl }) {
  const token = process.env.GSC_ACCESS_TOKEN;
  const site = process.env.GSC_SITE_URL || siteUrl;
  if (!token || !site) {
    return unavailable('Google Search Console is not authorized for this site, so no query data was collected.');
  }

  const endpoint = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      startDate: new Date(Date.now() - 28 * 86400000).toISOString().slice(0, 10),
      endDate: new Date().toISOString().slice(0, 10),
      dimensions: ['query'],
      rowLimit: 5,
    }),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`Search Console request failed with HTTP ${response.status}`);
  const payload = await response.json();
  const rows = (payload.rows || []).map((row) => ({
    query: row.keys?.[0] || '',
    clicks: row.clicks || 0,
    impressions: row.impressions || 0,
    ctr: row.ctr || 0,
    position: row.position || 0,
  }));
  return {
    status: 'COMPLETED',
    analyzed: true,
    simulated: false,
    source: 'search-console',
    siteUrl: site,
    rows,
    totalClicks: rows.reduce((sum, row) => sum + row.clicks, 0),
    totalImpressions: rows.reduce((sum, row) => sum + row.impressions, 0),
    indexCoverageErrors: null,
  };
}

export async function getRankings({ keyword, url }) {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;
  if (!login || !password) {
    return unavailable('A ranking provider is not configured, so no live keyword positions were collected.');
  }

  const response = await fetch('https://api.dataforseo.com/v3/serp/google/organic/live/advanced', {
    method: 'POST',
    headers: {
      authorization: `Basic ${Buffer.from(`${login}:${password}`).toString('base64')}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify([{ keyword, location_name: 'India', language_code: 'en', depth: 10 }]),
    signal: AbortSignal.timeout(25000),
  });
  if (!response.ok) throw new Error(`DataForSEO request failed with HTTP ${response.status}`);
  const payload = await response.json();
  return {
    status: 'COMPLETED',
    analyzed: true,
    simulated: false,
    source: 'dataforseo',
    url,
    tasks: payload.tasks || [],
    client_rank_position: null,
    keyword_search_volume: null,
  };
}

export function whatsAppBody({ url, city, state, score }) {
  return `EdgeLink SEO report is ready for ${url}. Submitted location: ${city}, ${state}. Score: ${score}/100.`;
}

export async function sendWhatsApp({ url, city, state, score, to }) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (!sid || !token || !from || !to) {
    return {
      status: 'not_sent',
      sid: null,
      reason: 'Twilio is not configured. No WhatsApp message was sent.',
    };
  }

  const body = new URLSearchParams({
    To: to.startsWith('whatsapp:') ? to : `whatsapp:${to}`,
    From: from.startsWith('whatsapp:') ? from : `whatsapp:${from}`,
    Body: whatsAppBody({ url, city, state, score }),
  });
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || `Twilio request failed with HTTP ${response.status}`);
  }
  return { status: payload.status || 'queued', sid: payload.sid };
}

export async function sendReportEmail() {
  if (!process.env.SMTP_HOST) {
    return {
      status: 'not_sent',
      provider: 'none',
      delivered: false,
      error: 'Email delivery is not configured. No message was sent.',
    };
  }

  return {
    status: 'not_sent',
    provider: 'smtp-unwired',
    delivered: false,
    error: 'SMTP host is set, but outbound email transport is intentionally not enabled in this build.',
  };
}
