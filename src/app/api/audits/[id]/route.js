import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auditInclude, presentAudit } from '@/lib/present';
import { assertAuditAccess, jsonError, requireApiSession } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function GET(_request, { params }) {
  try {
    const session = requireApiSession();
    const audit = await prisma.audit.findUnique({
      where: { id: params.id },
      include: auditInclude,
    });
    if (!audit) return NextResponse.json({ error: 'Audit not found' }, { status: 404 });
    assertAuditAccess(session, audit);
    const history = await prisma.audit.findMany({
      where: { websiteId: audit.websiteId },
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: { result: true },
    });
    return NextResponse.json({
      audit: presentAudit(audit),
      history: history.map((item) => ({
        id: item.id,
        status: item.status,
        createdAt: item.createdAt.toISOString(),
        overallScore: item.result?.overallScore ?? null,
      })),
    });
  } catch (error) {
    return jsonError(error);
  }
}
