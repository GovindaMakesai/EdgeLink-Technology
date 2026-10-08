import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

function configuredValue(name) {
  const value = String(process.env[name] || '').trim();
  return value || '';
}

export function reportsDirectory() {
  if (process.env.REPORTS_DIR) return path.resolve(process.env.REPORTS_DIR);
  return path.join(os.tmpdir(), 'reports');
}

export function resolveStorage() {
  const url = configuredValue('SUPABASE_URL').replace(/\/$/, '');
  const key = configuredValue('SUPABASE_SERVICE_ROLE_KEY');
  const bucket = configuredValue('SUPABASE_STORAGE_BUCKET') || 'audit-reports';
  if (url && key) return { kind: 'supabase', url, key, bucket };
  if (process.env.NODE_ENV === 'production') return { kind: 'missing', bucket };
  return { kind: 'local', bucket };
}

export function storageStatus() {
  const storage = resolveStorage();
  return {
    mode: storage.kind,
    configured: storage.kind === 'supabase' || storage.kind === 'local',
    bucket: storage.kind === 'supabase' ? storage.bucket : null,
  };
}

export function safeReportName(fileName) {
  const cleaned = path.basename(String(fileName || ''));
  if (!/^[\w.-]+\.pdf$/i.test(cleaned)) {
    throw new Error('Invalid report file name');
  }
  return cleaned;
}

export function safeReportPath(fileName) {
  const cleaned = safeReportName(fileName);
  const root = path.resolve(reportsDirectory());
  const full = path.resolve(root, cleaned);
  const relative = path.relative(root, full);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Report path escaped the storage directory');
  }
  return full;
}

function authHeaders(storage, extra = {}) {
  return {
    authorization: `Bearer ${storage.key}`,
    apikey: storage.key,
    ...extra,
  };
}

function storageError(action, status, transient) {
  const error = new Error(`Supabase Storage ${action} failed: HTTP ${status}`);
  error.transient = Boolean(transient);
  return error;
}

async function ensureBucket(storage) {
  const response = await fetch(`${storage.url}/storage/v1/bucket`, {
    method: 'POST',
    headers: authHeaders(storage, { 'content-type': 'application/json' }),
    body: JSON.stringify({ id: storage.bucket, name: storage.bucket, public: false }),
  });
  if (response.ok || response.status === 409) return;
  const text = await response.text();
  if (response.status === 400 && /exist/i.test(text)) return;
  throw storageError('bucket setup', response.status, response.status >= 500);
}

function objectUrl(storage, fileName) {
  return `${storage.url}/storage/v1/object/${encodeURIComponent(storage.bucket)}/${encodeURIComponent(fileName)}`;
}

async function writeLocal(fileName, bytes) {
  const dir = reportsDirectory();
  await fs.mkdir(dir, { recursive: true });
  const full = safeReportPath(fileName);
  await fs.writeFile(full, bytes);
  return { filePath: full, fileName: path.basename(full), bytes: bytes.length, backend: 'local' };
}

async function writeSupabase(storage, fileName, bytes) {
  await ensureBucket(storage);
  const response = await fetch(objectUrl(storage, fileName), {
    method: 'POST',
    headers: authHeaders(storage, {
      'content-type': 'application/pdf',
      'x-upsert': 'true',
    }),
    body: bytes,
  });
  if (!response.ok) {
    throw storageError('upload', response.status, response.status === 408 || response.status === 429 || response.status >= 500);
  }
  return {
    filePath: `supabase://${storage.bucket}/${fileName}`,
    fileName,
    bytes: bytes.length,
    backend: 'supabase',
  };
}

export async function writeReport(fileName, bytes) {
  const storage = resolveStorage();
  const cleaned = safeReportName(fileName);
  if (storage.kind === 'missing') {
    throw new Error('Supabase Storage is not configured. Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_STORAGE_BUCKET.');
  }
  if (storage.kind === 'local') return writeLocal(cleaned, bytes);
  return writeSupabase(storage, cleaned, bytes);
}

export async function readReport(fileName) {
  const storage = resolveStorage();
  const cleaned = safeReportName(fileName);
  if (storage.kind === 'missing') {
    throw new Error('Supabase Storage is not configured. Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_STORAGE_BUCKET.');
  }
  if (storage.kind === 'local') {
    const full = safeReportPath(cleaned);
    const bytes = await fs.readFile(full);
    return { filePath: full, bytes, backend: 'local' };
  }
  const response = await fetch(objectUrl(storage, cleaned), {
    method: 'GET',
    headers: authHeaders(storage),
  });
  if (response.status === 404) {
    const error = new Error('The report file is no longer in storage');
    error.code = 'ENOENT';
    throw error;
  }
  if (!response.ok) {
    throw storageError('download', response.status, response.status === 408 || response.status === 429 || response.status >= 500);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  return { filePath: `supabase://${storage.bucket}/${cleaned}`, bytes, backend: 'supabase' };
}
