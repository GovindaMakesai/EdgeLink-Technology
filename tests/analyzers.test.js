import { describe, expect, it } from 'vitest';
import { analyzeHtml } from '../src/crawlers/parse-html';
import { parseRobots, parseSitemap } from '../src/crawlers/crawler';
import { analyzeOnPage, analyzeSchema, analyzeTechnical, analyzeRobotsAndSitemap } from '../src/services/analyzers';

const html = `<!doctype html>
<html>
<head>
  <title>Example Dental Clinic in Pune for Implants and Care</title>
  <meta name="description" content="Example Dental Clinic in Pune offers implants, extractions, and family dentistry with same-week appointments." />
  <link rel="canonical" href="https://example-dental-clinic.com/" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta property="og:title" content="Example Dental Clinic" />
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"Dentist","name":"Example Dental Clinic","telephone":"+910000000000","address":"Pune"}</script>
  <script type="application/ld+json">{not json</script>
</head>
<body>
  <h1>Dental clinic in Pune</h1>
  <h2>Implants</h2>
  <h2>Implants</h2>
  <p>${'word '.repeat(80)}</p>
  <img src="/hero.jpg" />
  <img src="/team.jpg" alt="Clinic team" />
  <a href="/services">Services</a>
  <a href="/about">About</a>
  <a href="/contact">Contact</a>
  <a href="https://maps.google.com/pune">Map</a>
</body>
</html>`;

describe('crawler parsing and analyzers', () => {
  const crawl = {
    ...analyzeHtml(html, 'https://example-dental-clinic.com/'),
    ok: true,
    https: true,
    timingMs: 120,
    redirects: 0,
    headers: {},
    robots: parseRobots('User-agent: *\nDisallow: /admin\nSitemap: https://example-dental-clinic.com/sitemap.xml\n', 200),
    sitemap: parseSitemap('<urlset><url><loc>https://example-dental-clinic.com/</loc></url><url><loc>https://example-dental-clinic.com/about</loc></url></urlset>', 200),
  };

  it('extracts title, description, headings, canonical, and alt gaps', () => {
    expect(crawl.title).toContain('Example Dental Clinic');
    expect(crawl.titleLength).toBeGreaterThan(30);
    expect(crawl.metaDescription).toContain('Pune');
    expect(crawl.canonical).toBe('https://example-dental-clinic.com/');
    expect(crawl.h1).toEqual(['Dental clinic in Pune']);
    expect(crawl.h2).toHaveLength(2);
    expect(crawl.imageCount).toBe(2);
    expect(crawl.imagesWithoutAlt).toBe(1);
    expect(crawl.internalLinkCount).toBe(3);
    expect(crawl.externalLinkCount).toBe(1);
    expect(crawl.jsonLdErrors).toHaveLength(1);
    expect(crawl.viewport).toContain('width=device-width');
  });

  it('scores on-page structure', () => {
    const onPage = analyzeOnPage(crawl);
    expect(onPage.title.exists).toBe(true);
    expect(onPage.title.inRange).toBe(true);
    expect(onPage.metaDescription.exists).toBe(true);
    expect(onPage.h1.count).toBe(1);
    expect(onPage.images.missingAlt).toBe(1);
    expect(onPage.findings.some((item) => item.code === 'alt-missing')).toBe(true);
    expect(onPage.findings.some((item) => item.code === 'h2-duplicate')).toBe(true);
  });

  it('detects schema types and malformed JSON-LD', () => {
    const schema = analyzeSchema(crawl);
    expect(schema.present).toBe(true);
    expect(schema.types).toContain('Dentist');
    expect(schema.malformed).toHaveLength(1);
    expect(schema.relevantTypes).toContain('Dentist');
  });

  it('reads robots sitemap references and sitemap URL counts', () => {
    const robots = analyzeRobotsAndSitemap(crawl);
    expect(robots.robots.exists).toBe(true);
    expect(robots.robots.sitemaps[0]).toContain('sitemap.xml');
    expect(robots.sitemap.urlCount).toBe(2);
    expect(robots.sitemap.parseable).toBe(true);
  });

  it('keeps a failed crawl as structured data', () => {
    const failed = analyzeTechnical({ ok: false, error: 'Could not resolve host', https: false, headers: {} });
    expect(failed.findings.some((item) => item.code === 'unreachable')).toBe(true);
    expect(failed.https).toBe(false);
  });
});
