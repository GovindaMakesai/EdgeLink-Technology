import 'dotenv/config';
import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const { USE_MOCKS } = require('../src/mocks/index.js');
const pagespeed = require('../src/mocks/pagespeed.mock.js');
const gsc = require('../src/mocks/gsc.mock.js');
const rankings = require('../src/mocks/dataforseo.mock.js');
const { sendWhatsApp } = require('../src/mocks/twilio.mock.js');

describe('mock switch and payloads', () => {
  it('enables mocks only when USE_MOCKS is the string true', () => {
    expect(USE_MOCKS).toBe(true);
    expect(process.env.USE_MOCKS).toBe('true');
  });

  it('returns the required PageSpeed sample', () => {
    expect(pagespeed.categories.performance.score).toBe(0.61);
    expect(pagespeed.categories.seo.score).toBe(0.89);
    expect(pagespeed.audits['largest-contentful-paint'].displayValue).toBe('4.2 s');
    expect(pagespeed.audits['cumulative-layout-shift'].displayValue).toBe('0.08');
    expect(pagespeed.audits['interaction-to-next-paint'].displayValue).toBe('280 ms');
    expect(pagespeed.audits['unused-javascript'].displayValue).toBe('420 KiB');
  });

  it('returns the required Search Console sample', () => {
    expect(gsc.rows).toHaveLength(5);
    expect(gsc.totalClicks).toBe(167);
    expect(gsc.totalImpressions).toBe(4560);
    expect(gsc.indexCoverageErrors).toBe(3);
    expect(gsc.rows[0].query).toBe('dental clinic in pune');
  });

  it('returns the required DataForSEO sample', () => {
    expect(rankings.client_rank_position).toBe(4);
    expect(rankings.keyword_search_volume).toBe(1900);
    expect(rankings.tasks[0].result[0].items[0].domain).toBe('exampledental-clinic.com');
    expect(rankings.tasks[0].result[0].items[1].rank_absolute).toBe(8);
  });

  it('logs the WhatsApp mock and returns a mock sid', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const result = await sendWhatsApp('client_123', 'C:/tmp/reports/audit.pdf', 72);
    const lines = spy.mock.calls.map((call) => call.join(' '));
    expect(lines.some((line) => line.includes('[MOCK WHATSAPP] → Client:'))).toBe(true);
    expect(lines.some((line) => line.includes('[MOCK WHATSAPP] → Score:'))).toBe(true);
    expect(lines.some((line) => line.includes('[MOCK WHATSAPP] → Report:'))).toBe(true);
    expect(result.status).toBe('mock_sent');
    expect(result.sid.startsWith('MOCK_SID_')).toBe(true);
    spy.mockRestore();
  });
});
