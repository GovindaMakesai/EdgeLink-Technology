import { analyzeHtml } from './parse-html';
import { assertSafeCrawlTarget } from '../validations/url';

const MAX_BYTES = 1_500_000;
const TIMEOUT_MS = 12_000;

async function readLimited(response) {
  if (!response.body) return '';
  const reader = response.body.getReader();
  const chunks = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    chunks.push(value);
    if (received > MAX_BYTES) {
      await reader.cancel().catch(() => {});
      break;
    }
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function fetchChecked(rawUrl, timeoutMs = TIMEOUT_MS) {
  let current = (await assertSafeCrawlTarget(rawUrl)).href;
  const started = Date.now();
  const redirectChain = [];
  for (let hop = 0; hop < 5; hop += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(current, {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'user-agent': 'EdgeLinkSEOBot/1.0',
          accept: 'text/html,application/xhtml+xml,text/plain,application/xml;q=0.9,*/*;q=0.8',
        },
      });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        if (!location) {
          return { response, finalUrl: current, timingMs: Date.now() - started, hops: redirectChain.length, redirectChain };
        }
        const next = new URL(location, current);
        await assertSafeCrawlTarget(next.href);
        redirectChain.push({ status: response.status, from: current, to: next.href });
        current = next.href;
        continue;
      }
      return { response, finalUrl: current, timingMs: Date.now() - started, hops: redirectChain.length, redirectChain };
    } finally {
      clearTimeout(timer);
    }
  }
  const error = new Error('Too many redirects');
  error.status = 422;
  throw error;
}

function headerSnapshot(headers) {
  const pick = ['content-type', 'x-robots-tag', 'strict-transport-security', 'content-security-policy', 'x-content-type-options', 'server'];
  const snapshot = {};
  for (const key of pick) {
    const value = headers.get(key);
    if (value) snapshot[key] = value.slice(0, 300);
  }
  return snapshot;
}

export function parseRobots(text, statusCode) {
  const body = String(text || '');
  const lines = body.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith('#'));
  const sitemaps = [];
  const disallows = [];
  let userAgent = '';
  for (const line of lines) {
    const [rawKey, ...rest] = line.split(':');
    const key = (rawKey || '').trim().toLowerCase();
    const value = rest.join(':').trim();
    if (key === 'user-agent') userAgent = value;
    if (key === 'disallow' && value) disallows.push(value);
    if (key === 'sitemap' && value) sitemaps.push(value);
  }
  return {
    exists: statusCode >= 200 && statusCode < 300,
    statusCode: statusCode || null,
    parseable: true,
    userAgent: userAgent || null,
    disallowCount: disallows.length,
    disallows: disallows.slice(0, 20),
    sitemaps,
    issues: [],
  };
}

export function parseSitemap(xml, statusCode) {
  const body = String(xml || '');
  const locs = [...body.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)].map((match) => match[1].trim());
  const looksXml = /<urlset|<sitemapindex/i.test(body);
  return {
    exists: statusCode >= 200 && statusCode < 300 && body.length > 0,
    statusCode: statusCode || null,
    parseable: looksXml || locs.length > 0,
    urlCount: locs.length,
    sample: locs.slice(0, 8),
    issues: [],
  };
}

async function fetchResource(url) {
  try {
    const { response, finalUrl, timingMs } = await fetchChecked(url, 8000);
    const text = await readLimited(response);
    return {
      ok: response.ok,
      statusCode: response.status,
      finalUrl,
      timingMs,
      text: text.slice(0, 400_000),
      headers: headerSnapshot(response.headers),
    };
  } catch (error) {
    return {
      ok: false,
      statusCode: null,
      error: error.message || 'Request failed',
    };
  }
}

export async function crawlUrl(rawUrl) {
  const requested = String(rawUrl || '');
  try {
    const { response, finalUrl, timingMs, hops, redirectChain } = await fetchChecked(requested);
    const html = await readLimited(response);
    const parsed = analyzeHtml(html, finalUrl, response.status);
    const origin = new URL(finalUrl).origin;
    const robotsResponse = await fetchResource(new URL('/robots.txt', origin).href);
    const robots = robotsResponse.ok || robotsResponse.statusCode
      ? parseRobots(robotsResponse.text || '', robotsResponse.statusCode || 0)
      : {
          exists: false,
          statusCode: null,
          parseable: false,
          sitemaps: [],
          disallows: [],
          disallowCount: 0,
          issues: [robotsResponse.error || 'robots.txt could not be fetched'],
        };
    if (!robots.exists) robots.issues = [...(robots.issues || []), 'robots.txt was not available'];

    const sitemapCandidates = robots.sitemaps?.length ? robots.sitemaps : [new URL('/sitemap.xml', origin).href];
    const sitemapTarget = sitemapCandidates[0];
    let sitemap;
    try {
      const sitemapUrl = new URL(sitemapTarget, origin).href;
      const sitemapResponse = await fetchResource(sitemapUrl);
      sitemap = parseSitemap(sitemapResponse.text || '', sitemapResponse.statusCode || 0);
      sitemap.url = sitemapUrl;
      if (sitemapResponse.error) sitemap.issues = [sitemapResponse.error];
      if (!sitemap.exists) sitemap.issues = [...(sitemap.issues || []), 'sitemap.xml was not available'];
    } catch (error) {
      sitemap = {
        exists: false,
        statusCode: null,
        parseable: false,
        urlCount: 0,
        sample: [],
        url: sitemapTarget,
        issues: [error.message],
      };
    }

    return {
      ok: response.status > 0 && response.status < 500,
      requestedUrl: requested,
      finalUrl,
      statusCode: response.status,
      timingMs,
      redirects: hops,
      redirectChain: redirectChain || [],
      https: new URL(finalUrl).protocol === 'https:',
      headers: headerSnapshot(response.headers),
      ...parsed,
      robots,
      sitemap,
      error: response.ok ? null : `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      ok: false,
      requestedUrl: requested,
      finalUrl: requested,
      url: requested,
      statusCode: null,
      timingMs: null,
      redirects: 0,
      https: false,
      title: '',
      titleLength: 0,
      metaDescription: '',
      metaDescriptionLength: 0,
      canonical: '',
      robotsMeta: '',
      viewport: '',
      h1: [],
      h2: [],
      h3: [],
      imageCount: 0,
      imagesWithoutAlt: 0,
      internalLinks: [],
      externalLinks: [],
      internalLinkCount: 0,
      externalLinkCount: 0,
      wordCount: 0,
      textSample: '',
      openGraph: {},
      jsonLd: [],
      jsonLdErrors: [],
      headers: {},
      robots: { exists: false, statusCode: null, parseable: false, sitemaps: [], disallows: [], issues: ['Skipped because the page crawl failed'] },
      sitemap: { exists: false, statusCode: null, parseable: false, urlCount: 0, sample: [], issues: ['Skipped because the page crawl failed'] },
      error: error.message || 'Crawl failed',
    };
  }
}
