import { describe, expect, it } from 'vitest';
import { createAuditSchema } from '../src/validations/audit';
import { assertPublicHttpUrl, isPrivateIp } from '../src/validations/url';
import { extractJson, normalizeAiPayload, validateAuditResult } from '../src/validations/ai-result';
import { buildFallbackAnalysis } from '../src/ai/fallback';
import { SYSTEM_PROMPT } from '../src/ai/prompt';
import pagespeed from '../src/mocks/pagespeed.mock.js';
import gsc from '../src/mocks/gsc.mock.js';
import rankings from '../src/mocks/dataforseo.mock.js';
import { isCronAuthorized } from '../src/lib/cron-auth';

describe('audit input and URL safety', () => {
  it('accepts the demo audit payload', () => {
    const parsed = createAuditSchema.parse({
      url: 'https://example-dental-clinic.com',
      clientId: 'demo-client-edgelink',
      businessType: 'Dental Clinic',
      city: 'Pune',
      state: 'Maharashtra',
      targetKeyword: 'dental clinic pune',
    });
    expect(parsed.city).toBe('Pune');
  });

  it('rejects incomplete audit input', () => {
    const parsed = createAuditSchema.safeParse({ url: 'https://example.com', businessType: 'A' });
    expect(parsed.success).toBe(false);
  });

  it('blocks private and non-http targets', () => {
    expect(isPrivateIp('127.0.0.1')).toBe(true);
    expect(isPrivateIp('10.1.1.1')).toBe(true);
    expect(isPrivateIp('192.168.1.8')).toBe(true);
    expect(isPrivateIp('169.254.169.254')).toBe(true);
    expect(isPrivateIp('8.8.8.8')).toBe(false);
    expect(() => assertPublicHttpUrl('http://127.0.0.1/admin')).toThrow(/not allowed|Private/);
    expect(() => assertPublicHttpUrl('http://localhost/secret')).toThrow(/not allowed/);
    expect(() => assertPublicHttpUrl('file:///etc/passwd')).toThrow(/http/);
    expect(assertPublicHttpUrl('https://example-dental-clinic.com').hostname).toBe('example-dental-clinic.com');
  });
});

describe('AI result validation', () => {
  it('uses the assessment system prompt', () => {
    expect(SYSTEM_PROMPT.startsWith('You are a senior SEO analyst with 15+ years experience')).toBe(true);
    expect(SYSTEM_PROMPT).toContain('falsifiability_check');
  });

  it('strips markdown fences and rejects bad enums', () => {
    const raw = '```json\n{"audit_version":"v1.0","overall_score":101}\n```';
    expect(extractJson(raw).overall_score).toBe(101);
    const invalid = validateAuditResult({
      overall_score: 140,
      score_breakdown: { technical: 10, on_page: 10, content: 10, core_web_vitals: 10, schema: 10 },
      critical_issues: ['Too high'],
      important_issues: ['Issue'],
      quick_wins: [],
      recommendations: [{
        priority: 'URGENT',
        category: 'Technical',
        finding: 'Broken',
        fix: 'Fix it',
        estimated_impact: 'High',
        effort: 'Hours',
        falsifiability_check: 'Check again',
      }],
      executive_summary: 'This is one sentence.',
    });
    expect(invalid.ok).toBe(false);
  });

  it('rejects summaries longer than three sentences and oversized issue lists before normalization caps them', () => {
    const normalized = normalizeAiPayload({
      overall_score: 70,
      score_breakdown: { technical: 70, on_page: 70, content: 70, core_web_vitals: 70, schema: 70 },
      critical_issues: ['1', '2', '3', '4', '5', '6'].map((item) => `Critical issue number ${item}`),
      important_issues: [],
      quick_wins: [{ finding: 'Add a title', fix: 'Write the title', effort: 'Weeks', estimated_hours: 40, estimated_impact: 'High' }],
      recommendations: [{
        priority: 'LOW',
        category: 'Content',
        finding: 'Copy is thin',
        fix: 'Add service proof',
        estimated_impact: 'Medium',
        effort: 'Days',
        falsifiability_check: 'Word count rises',
      }],
      executive_summary: 'One. Two. Three. Four.',
    });
    expect(normalized.critical_issues).toHaveLength(5);
    expect(normalized.quick_wins[0].effort).toBe('Hours');
    expect(normalized.quick_wins[0].estimated_hours).toBeLessThanOrEqual(2);
    const validated = validateAuditResult({ ...normalized, executive_summary: 'One. Two. Three. Four.' });
    expect(validated.ok).toBe(false);
  });

  it('builds a deterministic fallback that passes the schema', () => {
    const result = buildFallbackAnalysis({
      url: 'https://example-dental-clinic.com/',
      businessType: 'Dental Clinic',
      city: 'Pune',
      state: 'Maharashtra',
      keyword: 'dental clinic pune',
      crawl: { ok: false, error: 'Could not resolve example-dental-clinic.com', wordCount: 0, https: false, robots: { exists: false }, imagesWithoutAlt: 2 },
      onPage: analyzeEmptyOnPage(),
      technical: { findings: [{ severity: 'critical', message: 'unreachable' }] },
      schema: { present: false, types: [], malformed: [], relevantTypes: [], findings: [] },
      robots: { findings: [{ severity: 'important', message: 'robots missing' }] },
      pagespeed,
      gsc,
      rankings,
    });
    expect(result.audit_version).toBe('v1.0');
    expect(result.overall_score).toBeGreaterThanOrEqual(0);
    expect(result.overall_score).toBeLessThanOrEqual(100);
    expect(result.critical_issues.length).toBeLessThanOrEqual(5);
    expect(result.important_issues.length).toBeLessThanOrEqual(8);
    expect(result.quick_wins.length).toBeLessThanOrEqual(5);
    expect(result.quick_wins.every((item) => item.effort === 'Hours' && item.estimated_hours <= 2)).toBe(true);
    expect(result.recommendations[0].falsifiability_check.length).toBeGreaterThan(3);
    expect(result.executive_summary.split(/[.!?]+/).filter((part) => part.trim()).length).toBeLessThanOrEqual(3);
  });
});

function analyzeEmptyOnPage() {
  return {
    title: { exists: false },
    metaDescription: { exists: false },
    images: { missingAlt: 2 },
    findings: [],
  };
}

describe('cron authentication', () => {
  it('rejects a missing or wrong secret', () => {
    process.env.CRON_SECRET = 'test-secret';
    expect(isCronAuthorized('')).toBe(false);
    expect(isCronAuthorized('nope')).toBe(false);
    expect(isCronAuthorized('test-secret')).toBe(true);
  });
});
