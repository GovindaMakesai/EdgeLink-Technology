import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jsonError, requireApiAdmin } from '@/lib/http';
import { deliverAudit } from '@/services/pipeline';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(_request, { params }) {
  try {
    requireApiAdmin();
    const audit = await prisma.audit.findUnique({
      where: { id: params.id },
      include: { website: { include: { client: true } }, result: true, report: true },
    });
    if (!audit) return NextResponse.json({ error: 'Audit not found' }, { status: 404 });
    const delivery = await deliverAudit(audit);
    return NextResponse.json({
      ok: true,
      whatsapp: { status: delivery.whatsapp.status, sid: delivery.whatsapp.sid, reason: delivery.whatsapp.reason || null },
      email: { status: delivery.email.status, provider: delivery.email.provider, delivered: delivery.email.delivered },
    });
  } catch (error) {
    return jsonError(error);
  }
}
