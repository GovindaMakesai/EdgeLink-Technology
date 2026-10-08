import { afterEach, describe, expect, it } from 'vitest';
import { readReport, resolveStorage, writeReport } from '../src/services/storage';

const KEYS = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_STORAGE_BUCKET', 'NODE_ENV'];
const saved = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]));
const originalFetch = global.fetch;

afterEach(() => {
  for (const key of KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
  global.fetch = originalFetch;
});

describe('report storage', () => {
  it('uses local disk when Supabase is unset outside production', () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.NODE_ENV = 'test';
    expect(resolveStorage().kind).toBe('local');
  });

  it('refuses local disk in production when Supabase is unset', () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.NODE_ENV = 'production';
    expect(resolveStorage().kind).toBe('missing');
  });

  it('uploads and downloads the same PDF through Supabase Storage', async () => {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test';
    process.env.SUPABASE_STORAGE_BUCKET = 'reports';
    process.env.NODE_ENV = 'production';
    const pdf = Buffer.from('%PDF-1.4 test');
    const calls = [];

    global.fetch = async (url, options = {}) => {
      calls.push({ url: String(url), method: options.method, upsert: options.headers?.['x-upsert'] });
      if (String(url).endsWith('/storage/v1/bucket')) {
        return new Response('{}', { status: 200 });
      }
      if (options.method === 'POST') {
        return new Response('{}', { status: 200 });
      }
      return new Response(pdf, { status: 200 });
    };

    const saved = await writeReport('unit-report.pdf', pdf);
    const loaded = await readReport('unit-report.pdf');

    expect(saved.filePath).toBe('supabase://reports/unit-report.pdf');
    expect(saved.backend).toBe('supabase');
    expect(loaded.bytes.subarray(0, 5).toString()).toBe('%PDF-');
    expect(calls.some((call) => call.method === 'POST' && call.upsert === 'true')).toBe(true);
    expect(calls.some((call) => String(call.url).includes('/storage/v1/object/'))).toBe(true);
    expect(JSON.stringify(calls)).not.toContain('service-role-test');
  });
});
