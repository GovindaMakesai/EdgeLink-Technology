import { NextResponse } from 'next/server';
import { cronTokenFromHeaders, isCronAuthorized } from '@/lib/cron-auth';
import { enqueueMonthlyAudits } from '@/services/audit-service';
import { jsonError } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    if (!process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'CRON_SECRET is not configured' }, { status: 503 });
    }
    if (!isCronAuthorized(cronTokenFromHeaders(request.headers))) {
      return NextResponse.json({ error: 'Invalid cron secret' }, { status: 401 });
    }
    const ids = await enqueueMonthlyAudits();
    return NextResponse.json({ ok: true, queued: ids.length, auditIds: ids });
  } catch (error) {
    return jsonError(error);
  }
}
