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

  it('returns simulated PageSpeed data for the submitted URL', () => {
    expect(pagespeed.simulated).toBe(true);
    expect(pagespeed.source).toBe('mock');
    expect(pagespeed.url).toBe('https://www.wikipedia.org/');
    expect(pagespeed.categories.performance.score).toBe(0.78);
    expect(pagespeed.audits['largest-contentful-paint'].displayValue).toBe('2.8 s');
    expect(pagespeed.note).toContain('Simulated PageSpeed');
  });

  it('returns simulated Search Console data tied to the submitted site', () => {
    expect(gsc.simulated).toBe(true);
    expect(gsc.rows).toHaveLength(5);
    expect(gsc.siteUrl).toBe('https://www.wikipedia.org/');
    expect(gsc.rows[0].query).toBe('wikipedia');
    expect(gsc.disclaimer).toContain('not from this website');
    expect(gsc.indexCoverageErrors).toBeNull();
  });

  it('returns simulated ranking data for the submitted domain', () => {
    expect(rankings.simulated).toBe(true);
    expect(rankings.client_rank_position).toBe(1);
    expect(rankings.tasks[0].result[0].keyword).toBe('wikipedia');
    expect(rankings.tasks[0].result[0].items[0].domain).toBe('wikipedia.org');
    expect(rankings.note).toContain('Simulated ranking sample');
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
