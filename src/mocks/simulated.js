function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'website';
  }
}

function topicOf(keyword, url) {
  const host = hostOf(url);
  return String(keyword || host.split('.')[0] || 'website').trim();
}

function buildPageSpeedMock(url) {
  const host = hostOf(url);
  const reference = host.endsWith('wikipedia.org');
  return {
    source: 'mock',
    simulated: true,
    note: `Simulated PageSpeed lab data for ${url}. This is not a live PageSpeed Insights response.`,
    url,
    strategy: 'mobile',
    categories: {
      performance: { score: reference ? 0.78 : 0.64 },
      seo: { score: reference ? 0.92 : 0.84 },
      accessibility: { score: reference ? 0.88 : 0.76 },
    },
    audits: {
      'largest-contentful-paint': {
        score: reference ? 0.72 : 0.48,
        displayValue: reference ? '2.8 s' : '3.9 s',
        description: `Simulated mobile LCP for ${host}.`,
      },
      'cumulative-layout-shift': {
        score: reference ? 0.96 : 0.9,
        displayValue: reference ? '0.04' : '0.08',
        description: `Simulated layout shift for ${host}.`,
      },
      'interaction-to-next-paint': {
        score: reference ? 0.78 : 0.62,
        displayValue: reference ? '190 ms' : '260 ms',
        description: `Simulated interaction delay for ${host}.`,
      },
      'render-blocking-resources': {
        score: reference ? 0.7 : 0.5,
        description: reference ? 'Stylesheets in the article head delay first paint.' : '2 render-blocking stylesheets in the document head.',
      },
      'unused-javascript': {
        score: reference ? 0.66 : 0.42,
        displayValue: reference ? '180 KiB' : '360 KiB',
        description: `Simulated unused JavaScript on ${host}.`,
      },
    },
  };
}

function buildSearchConsoleMock({ siteUrl, keyword } = {}) {
  const topic = topicOf(keyword, siteUrl);
  const host = hostOf(siteUrl);
  const rows = [
    { query: topic, clicks: 1280, impressions: 18400, ctr: 0.07, position: 1.4 },
    { query: `${topic} homepage`, clicks: 240, impressions: 3100, ctr: 0.077, position: 2.1 },
    { query: host, clicks: 860, impressions: 9200, ctr: 0.093, position: 1.1 },
    { query: `${topic} article`, clicks: 150, impressions: 4100, ctr: 0.037, position: 6.8 },
    { query: `what is ${topic}`, clicks: 96, impressions: 2700, ctr: 0.036, position: 8.2 },
  ];
  return {
    source: 'mock',
    simulated: true,
    siteUrl: siteUrl || '',
    disclaimer: 'Simulated Search Console data for demonstration. These figures are not from this website\'s Google Search Console account. Real Search Console data requires the site owner to authorize access.',
    rows,
    totalClicks: rows.reduce((sum, row) => sum + row.clicks, 0),
    totalImpressions: rows.reduce((sum, row) => sum + row.impressions, 0),
    indexCoverageErrors: null,
  };
}

function buildRankingsMock({ url, keyword } = {}) {
  const host = hostOf(url);
  const topic = topicOf(keyword, url);
  const related = host.endsWith('wikipedia.org') ? 'britannica.com' : `guides.${host.split('.').slice(-2).join('.')}`;
  const secondary = host.endsWith('wikipedia.org') ? 'wiktionary.org' : `resources.${host.split('.').slice(-2).join('.')}`;
  return {
    source: 'mock',
    simulated: true,
    url: url || '',
    note: `Simulated ranking sample for ${topic} on ${host}. This is not a live DataForSEO response.`,
    tasks: [
      {
        result: [
          {
            keyword: topic,
            items: [
              { type: 'organic', rank_group: 1, rank_absolute: 1, domain: host },
              { type: 'organic', rank_group: 2, rank_absolute: 3, domain: related },
              { type: 'organic', rank_group: 3, rank_absolute: 5, domain: secondary },
            ],
          },
        ],
      },
    ],
    client_rank_position: 1,
    keyword_search_volume: host.endsWith('wikipedia.org') ? 1200000 : 2400,
  };
}

module.exports = {
  buildPageSpeedMock,
  buildSearchConsoleMock,
  buildRankingsMock,
};
