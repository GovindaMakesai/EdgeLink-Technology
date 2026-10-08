import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { assertAuditAccess, jsonError, requireApiSession } from '@/lib/http';
import { stepMeta } from '@/lib/steps';

export const dynamic = 'force-dynamic';

export async function GET(_request, { params }) {
  try {
    const session = requireApiSession();
    const audit = await prisma.audit.findUnique({
      where: { id: params.id },
      include: { website: true, result: { select: { overallScore: true, aiSource: true } }, report: { select: { id: true, fileName: true } } },
    });
    if (!audit) return NextResponse.json({ error: 'Audit not found' }, { status: 404 });
    assertAuditAccess(session, audit);
    const meta = stepMeta(audit.currentStep === 'failed' ? 'queued' : audit.currentStep);
    return NextResponse.json({
      id: audit.id,
      status: audit.status,
      progress: audit.progress,
      currentStep: audit.currentStep,
      stepLabel: audit.status === 'FAILED' ? 'Failed' : meta.label,
      errorMessage: audit.errorMessage,
      startedAt: audit.startedAt?.toISOString() || null,
      completedAt: audit.completedAt?.toISOString() || null,
      overallScore: audit.result?.overallScore ?? null,
      aiSource: audit.result?.aiSource ?? null,
      reportReady: Boolean(audit.report),
    });
  } catch (error) {
    return jsonError(error);
  }
}
