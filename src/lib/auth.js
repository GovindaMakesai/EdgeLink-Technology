import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const SESSION_COOKIE = 'edgelink_session';

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value) {
    throw new Error('AUTH_SECRET is not configured');
  }
  return value;
}

export function signSession(payload, ttlMs = 7 * 24 * 60 * 60 * 1000) {
  const body = Buffer.from(
    JSON.stringify({ ...payload, exp: Date.now() + ttlMs })
  ).toString('base64url');
  const sig = createHmac('sha256', secret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function readSession(token) {
  if (!token || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  let expected;
  try {
    expected = createHmac('sha256', secret()).update(body).digest('base64url');
  } catch {
    return null;
  }
  const left = Buffer.from(sig);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload?.exp || payload.exp < Date.now()) return null;
    if (payload.role !== 'admin' && payload.role !== 'client') return null;
    return payload;
  } catch {
    return null;
  }
}

export function getSession() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return readSession(token);
}

export async function requireAdmin() {
  const session = getSession();
  if (!session || session.role !== 'admin') redirect('/login');
  return session;
}

export async function requireUser() {
  const session = getSession();
  if (!session) redirect('/login');
  return session;
}

export function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  };
}
