import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auditInclude, presentAudit } from '@/lib/present';
import { jsonError, requireApiAdmin, requireApiSession } from '@/lib/http';
import { rateLimit } from '@/lib/rate-limit';
import { createAuditSchema, zodErrorMessage } from '@/validations/audit';
import { createAuditRecord } from '@/services/audit-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = requireApiSession();
    const where = session.role === 'client' ? { website: { clientId: session.clientId } } : {};
    const audits = await prisma.audit.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: auditInclude,
    });
    return NextResponse.json({ audits: audits.map(presentAudit) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request) {
  try {
    const session = requireApiAdmin();
    const limit = rateLimit(`audits:${session.email || 'admin'}`, 20, 60_000);
    if (!limit.ok) return NextResponse.json({ error: 'Too many audits were started. Wait a minute.' }, { status: 429 });

    const parsed = createAuditSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: zodErrorMessage(parsed.error) }, { status: 400 });
    }

    const audit = await createAuditRecord({
      ...parsed.data,
      clientId: parsed.data.clientId || undefined,
      clientName: parsed.data.clientName || undefined,
      email: parsed.data.email || undefined,
      phone: parsed.data.phone || undefined,
    });
    return NextResponse.json({ audit: presentAudit(audit) }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
