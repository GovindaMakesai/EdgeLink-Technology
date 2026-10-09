import { describe, expect, it } from 'vitest';
import { analyzeHtml } from '../src/crawlers/parse-html';
import { analyzeSchema, analyzeTechnical } from '../src/services/analyzers';
import { buildUserPrompt } from '../src/ai/prompt';
import { whatsAppBody } from '../src/services/integrations';
import { renderReportHtml } from '../src/reports/template';

describe('evidence and notifications', () => {
  it('records the JSON parser message and position without inventing one', () => {
    const html = '<html><head><script type="application/ld+json">{"@type":"Organization",}</script></head><body></body></html>';
    const parsed = analyzeHtml(html, 'https://www.edgelinktechnology.com/', 200);
    expect(parsed.jsonLdErrors).toHaveLength(1);
    expect(parsed.jsonLdErrors[0].message).toMatch(/JSON/i);
    expect(parsed.jsonLdErrors[0].position).toEqual(expect.any(Number));
    const schema = analyzeSchema({ jsonLd: parsed.jsonLd, jsonLdErrors: parsed.jsonLdErrors });
    expect(schema.findings[0].message).toContain(parsed.jsonLdErrors[0].message);
  });

  it('keeps canonical, final URL, and redirect hops as separate facts', () => {
    const technical = analyzeTechnical({
      ok: true,
      statusCode: 200,
      https: true,
      requestedUrl: 'https://www.edgelinktechnology.com/',
      finalUrl: 'https://edgelinktechnology.com/',
      canonical: 'https://edgelinktechnology.com/',
      redirects: 1,
      redirectChain: [{ status: 301, from: 'https://www.edgelinktechnology.com/', to: 'https://edgelinktechnology.com/' }],
      headers: {},
    });
    expect(technical.finalUrl).toBe('https://edgelinktechnology.com/');
    expect(technical.canonical).toBe('https://edgelinktechnology.com/');
    expect(technical.redirects).toBe(1);
    expect(technical.redirectChain[0].status).toBe(301);
    expect(technical.findings.map((item) => item.message).join(' ')).not.toMatch(/ranking penalty/i);
  });

  it('tells Claude not to replace the submitted city or invent unmeasured speed', () => {
    const prompt = buildUserPrompt({
      url: 'https://www.edgelinktechnology.com/',
      businessType: 'Digital marketing agency',
      city: 'Mumbai',
      state: 'Maharashtra',
      cwv: { status: 'NOT_ANALYZABLE', analyzed: false, reason: 'PageSpeed Insights is not configured.' },
    });
    expect(prompt).toContain('Registered location entered for this audit: Mumbai, Maharashtra');
    expect(prompt).toContain('Do not replace this pair');
    expect(prompt).toContain('NOT_ANALYZABLE');
  });

  it('builds a WhatsApp body from the submitted audit and does not claim a send', () => {
    const body = whatsAppBody({
      url: 'https://www.edgelinktechnology.com/',
      city: 'Mumbai',
      state: 'Maharashtra',
      score: 54,
    });
    expect(body).toContain('https://www.edgelinktechnology.com/');
    expect(body).toContain('Mumbai, Maharashtra');
    expect(body).toContain('54/100');
    expect(body).not.toContain('Pune');
  });

  it('prints the same overall score and an unanalyzed vitals notice in the PDF HTML', () => {
    const html = renderReportHtml({
      result: {
        overallScore: 54,
        scoreBreakdown: { technical: 62, on_page: 58, content: 65, core_web_vitals: 50, schema: 30, core_web_vitals_status: 'NOT_ANALYZABLE' },
        executiveSummary: 'Measured page evidence only.',
        criticalIssues: [],
        importantIssues: [],
        quickWins: [],
        recommendations: [],
      },
      website: { url: 'https://www.edgelinktechnology.com/' },
      city: 'Mumbai',
      state: 'Maharashtra',
      pagespeed: { analyzed: false, reason: 'PageSpeed Insights is not configured.' },
      gsc: { analyzed: false, reason: 'Search Console was not authorized.' },
      rankings: { analyzed: false, reason: 'No ranking provider.' },
    });
    expect(html).toContain('>54<');
    expect(html).toContain('NOT_ANALYZABLE');
    expect(html).toContain('Mumbai');
    expect(html).toContain('PageSpeed Insights is not configured.');
  });
});
