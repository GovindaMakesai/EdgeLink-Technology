import net from 'node:net';
import { lookup } from 'node:dns/promises';

const BLOCKED_HOSTS = new Set([
  'localhost',
  'localhost.localdomain',
  '0.0.0.0',
  '::1',
  'metadata.google.internal',
  'metadata.google',
]);

export function isPrivateIp(address) {
  const ip = String(address || '').toLowerCase().replace(/^\[|\]$/g, '');
  if (!net.isIP(ip)) return false;
  if (ip === '::1' || ip === '0.0.0.0') return true;
  if (ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe80')) return true;
  if (ip.startsWith('::ffff:')) return isPrivateIp(ip.slice(7));

  const parts = ip.split('.').map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return false;
  const [a, b] = parts;
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

export function assertPublicHttpUrl(raw) {
  let url;
  try {
    url = new URL(String(raw || '').trim());
  } catch {
    const error = new Error('Enter a valid http or https URL');
    error.status = 400;
    throw error;
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    const error = new Error('Only http and https URLs can be audited');
    error.status = 400;
    throw error;
  }

  if (url.username || url.password) {
    const error = new Error('URLs with embedded credentials are not allowed');
    error.status = 400;
    throw error;
  }

  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (
    !host ||
    BLOCKED_HOSTS.has(host) ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.endsWith('.localhost')
  ) {
    const error = new Error('That host is not allowed');
    error.status = 400;
    throw error;
  }

  if (net.isIP(host) && isPrivateIp(host)) {
    const error = new Error('Private network addresses are not allowed');
    error.status = 400;
    throw error;
  }

  return url;
}

export async function assertSafeCrawlTarget(raw) {
  const url = assertPublicHttpUrl(raw);
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(host)) return url;

  let records;
  try {
    records = await lookup(host, { all: true });
  } catch (error) {
    const failure = new Error(`Could not resolve ${host}`);
    failure.status = 422;
    failure.cause = error;
    throw failure;
  }

  for (const record of records) {
    if (isPrivateIp(record.address)) {
      const error = new Error('URL resolves to a private network address');
      error.status = 400;
      throw error;
    }
  }

  return url;
}
