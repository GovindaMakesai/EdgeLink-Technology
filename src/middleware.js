import { NextResponse } from 'next/server';

const COOKIE = 'edgelink_session';

function bytesToBase64Url(bytes) {
  let binary = '';
  const view = new Uint8Array(bytes);
  for (const byte of view) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value) {
  const pad = value.length % 4 === 0 ? '' : '='.repeat(4 - (value.length % 4));
  const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/') + pad);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function readSession(token) {
  const secret = process.env.AUTH_SECRET;
  if (!secret || !token || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signed = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  const expected = bytesToBase64Url(signed);
  if (expected.length !== sig.length) return null;
  let mismatch = 0;
  for (let index = 0; index < expected.length; index += 1) {
    mismatch |= expected.charCodeAt(index) ^ sig.charCodeAt(index);
  }
  if (mismatch !== 0) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(body)));
    if (!payload?.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith('/api/auth/login') ||
    pathname.startsWith('/api/health') ||
    pathname.startsWith('/api/cron/')
  ) {
    return NextResponse.next();
  }

  const session = await readSession(request.cookies.get(COOKIE)?.value);
  if (!session) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const login = request.nextUrl.clone();
    login.pathname = '/login';
    login.searchParams.set('next', pathname);
    return NextResponse.redirect(login);
  }

  if (pathname.startsWith('/admin') && session.role !== 'admin') {
    const destination = request.nextUrl.clone();
    destination.pathname = '/dashboard';
    destination.search = '';
    return NextResponse.redirect(destination);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*', '/api/:path*'],
};
