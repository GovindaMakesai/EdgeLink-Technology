import { describe, expect, it, vi } from 'vitest';

vi.mock('@anthropic-ai/sdk', () => {
  const create = vi.fn();
  const Anthropic = vi.fn(function AnthropicClient() {
    return { messages: { create } };
  });
  return { default: Anthropic };
});

import Anthropic from '@anthropic-ai/sdk';
import { analyzeSeoData, realClaudeEnabled } from '../src/services/claude/claude.service';

describe('Claude mode', () => {
  it('calls Claude when USE_REAL_CLAUDE is true even if other providers stay mocked', () => {
    expect(realClaudeEnabled({ USE_MOCKS: 'true', USE_REAL_CLAUDE: 'true' })).toBe(true);
    expect(realClaudeEnabled({ USE_MOCKS: 'true', USE_REAL_CLAUDE: 'false' })).toBe(false);
    expect(realClaudeEnabled({ USE_MOCKS: 'false', USE_REAL_CLAUDE: 'false' })).toBe(false);
    expect(realClaudeEnabled({ USE_MOCKS: 'false', USE_REAL_CLAUDE: 'true' })).toBe(true);
  });

  it('does not call the Claude API or return a mock score when USE_REAL_CLAUDE is false', async () => {
    process.env.USE_MOCKS = 'true';
    process.env.USE_REAL_CLAUDE = 'false';
    process.env.ANTHROPIC_API_KEY = 'test-key-not-sent';
    Anthropic.mockClear();

    const input = {
      url: 'https://www.wikipedia.org/',
      businessType: 'Encyclopedia',
      city: 'Mumbai',
      state: 'Maharashtra',
      keyword: 'wikipedia',
      pagespeed: { status: 'NOT_ANALYZABLE', analyzed: false },
    };
    await expect(analyzeSeoData(input)).rejects.toThrow('Real Claude analysis is not enabled');
    await expect(analyzeSeoData(input)).rejects.toThrow('No audit result was generated');
    expect(Anthropic).not.toHaveBeenCalled();
  });

  it('calls the Claude client when real mode is explicit, even if lab data stays mocked', async () => {
    process.env.USE_MOCKS = 'true';
    process.env.USE_REAL_CLAUDE = 'true';
    process.env.ANTHROPIC_API_KEY = 'test-key-not-sent';
    const create = vi.fn(async () => ({
      content: [{
        type: 'text',
        text: JSON.stringify({
          audit_version: 'v1.0',
          overall_score: 82,
          score_breakdown: { technical: 80, on_page: 80, content: 80, core_web_vitals: 80, schema: 80 },
          critical_issues: ['Canonical URL is missing from the homepage.'],
          important_issues: ['The meta description is missing.'],
          quick_wins: [{
            finding: 'Add a title that includes the primary keyword.',
            fix: 'Write a 50 to 60 character title.',
            effort: 'Hours',
            estimated_hours: 0.5,
            estimated_impact: 'High',
          }],
          recommendations: [{
            priority: 'HIGH',
            category: 'OnPage',
            finding: 'The title tag is missing the primary keyword.',
            fix: 'Write one unique title of 50 to 60 characters.',
            estimated_impact: 'High',
            effort: 'Hours',
            falsifiability_check: 'The next crawl records a title.',
          }],
          executive_summary: 'The site has a clear local offer and two measurable on-page gaps. The title and description should be updated first. The score can be checked again after the next crawl.',
        }),
      }],
    }));
    Anthropic.mockImplementation(function AnthropicClient() {
      return { messages: { create } };
    });

    const result = await analyzeSeoData({
      url: 'https://www.wikipedia.org/',
      businessType: 'Encyclopedia',
      city: 'Global',
      state: 'Worldwide',
      keyword: 'wikipedia',
      pagespeed: { simulated: true, url: 'https://www.wikipedia.org/' },
      gsc: { simulated: true, siteUrl: 'https://www.wikipedia.org/', rows: [] },
      rankings: { simulated: true, url: 'https://www.wikipedia.org/' },
    });

    expect(result.source).toBe('claude');
    expect(Anthropic).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledTimes(1);
    const prompt = create.mock.calls[0][0].messages[0].content;
    expect(prompt).toContain('Submitted URL: https://www.wikipedia.org/');
    expect(prompt).toContain('SIMULATED SEARCH CONSOLE SAMPLE');
    expect(prompt).toContain('SIMULATED PAGESPEED LAB DATA');
    expect(JSON.stringify(create.mock.calls)).not.toContain('test-key-not-sent');
  });
});
