import { NextResponse } from 'next/server';
import { cookieOptions, SESSION_COOKIE, signSession } from '@/lib/auth';
import { ensureDemoClient } from '@/services/audit-service';
import { rateLimit } from '@/lib/rate-limit';
import { safeEqual } from '@/lib/secret';
import { jsonError } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const limit = rateLimit(`login:${request.headers.get('x-forwarded-for') || 'local'}`, 20, 60_000);
    if (!limit.ok) {
      return NextResponse.json({ error: 'Too many sign-in attempts' }, { status: 429 });
    }

    const body = await request.json().catch(() => ({}));
    const demoAllowed = process.env.ALLOW_DEMO_LOGIN !== 'false';

    if (body.demo === 'admin') {
      if (!demoAllowed) return NextResponse.json({ error: 'Demo sign-in is disabled' }, { status: 403 });
      const token = signSession({ role: 'admin', email: process.env.ADMIN_EMAIL || 'admin@edgelink.local' });
      const response = NextResponse.json({ ok: true, role: 'admin' });
      response.cookies.set(SESSION_COOKIE, token, cookieOptions());
      return response;
    }

    if (body.demo === 'client') {
      if (!demoAllowed) return NextResponse.json({ error: 'Demo sign-in is disabled' }, { status: 403 });
      const client = await ensureDemoClient();
      const token = signSession({ role: 'client', clientId: client.id, name: client.name });
      const response = NextResponse.json({ ok: true, role: 'client' });
      response.cookies.set(SESSION_COOKIE, token, cookieOptions());
      return response;
    }

    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const expectedEmail = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const expectedPassword = String(process.env.ADMIN_PASSWORD || '');
    if (!expectedEmail || !expectedPassword) {
      return NextResponse.json({ error: 'Admin credentials are not configured' }, { status: 500 });
    }
    if (!safeEqual(email, expectedEmail) || !safeEqual(password, expectedPassword)) {
      return NextResponse.json({ error: 'Email or password is incorrect' }, { status: 401 });
    }

    const token = signSession({ role: 'admin', email: expectedEmail });
    const response = NextResponse.json({ ok: true, role: 'admin' });
    response.cookies.set(SESSION_COOKIE, token, cookieOptions());
    return response;
  } catch (error) {
    return jsonError(error);
  }
}
