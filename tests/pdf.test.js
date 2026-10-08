import { describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import { generatePdfReport } from '../src/reports/pdf';
import { safeReportPath } from '../src/services/storage';

describe('PDF report', () => {
  it('writes a non-empty PDF into the reports directory', async () => {
    const saved = await generatePdfReport({
      result: {
        overallScore: 64,
        scoreBreakdown: { technical: 60, on_page: 58, content: 50, core_web_vitals: 63, schema: 28 },
        criticalIssues: ['Homepage did not return a document.'],
        importantIssues: ['Largest Contentful Paint is 4.2 s on mobile.'],
        quickWins: [{ finding: 'Title tag is absent.', fix: 'Write a 50 character title.', estimated_hours: 0.5, estimated_impact: 'High' }],
        recommendations: [{
          priority: 'HIGH',
          category: 'CWV',
          finding: 'Largest Contentful Paint is 4.2 s on mobile.',
          fix: 'Compress the hero and remove render-blocking files.',
          estimated_impact: 'High',
          effort: 'Days',
          falsifiability_check: 'LCP falls below 2.5 seconds.',
        }],
        executiveSummary: 'The clinic needs a crawlable homepage. Lab data shows a slow LCP. Search demand is already visible.',
      },
      client: { name: 'Example Dental Clinic' },
      website: { url: 'https://example-dental-clinic.com/' },
      pagespeed: {
        categories: { performance: { score: 0.61 } },
        audits: { 'largest-contentful-paint': { displayValue: '4.2 s' } },
      },
      gsc: { totalClicks: 167, totalImpressions: 4560, indexCoverageErrors: 3, rows: [] },
      rankings: { client_rank_position: 4, keyword_search_volume: 1900, tasks: [] },
      technical: { statusCode: null, https: false, timingMs: null },
      onPage: { title: { value: '' }, metaDescription: { value: '' }, h1: { count: 0 }, content: { wordCount: 0 }, images: { missingAlt: 0 } },
      schema: { types: [], observations: ['No JSON-LD was found.'] },
      businessType: 'Dental Clinic',
      city: 'Pune',
      state: 'Maharashtra',
      targetKeyword: 'dental clinic pune',
      generatedAt: '8 Oct 2026',
    }, 'vitest-report.pdf');

    const bytes = await fs.readFile(saved.filePath);
    expect(bytes.subarray(0, 4).toString()).toBe('%PDF');
    expect(bytes.length).toBeGreaterThan(1000);
    expect(saved.filePath).toBe(safeReportPath('vitest-report.pdf'));
    await fs.unlink(saved.filePath);
  });
});
