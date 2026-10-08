import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jsonError, requireApiAdmin } from '@/lib/http';
import { enqueueAudit } from '@/queues/audit-queue';

export const dynamic = 'force-dynamic';

export async function POST(_request, { params }) {
  try {
    requireApiAdmin();
    const audit = await prisma.audit.findUnique({ where: { id: params.id } });
    if (!audit) return NextResponse.json({ error: 'Audit not found' }, { status: 404 });
    if (audit.status === 'CRAWLING' || audit.status === 'ANALYZING' || audit.status === 'GENERATING_REPORT' || audit.status === 'DELIVERING') {
      return NextResponse.json({ error: 'This audit is already running' }, { status: 409 });
    }

    await prisma.audit.update({
      where: { id: audit.id },
      data: { status: 'QUEUED', progress: 2, currentStep: 'queued', errorMessage: null, completedAt: null },
    });
    const jobRecord = await prisma.auditJob.create({
      data: { auditId: audit.id, status: 'QUEUED', progress: 2, stage: 'queued' },
    });
    const bullJob = await enqueueAudit(audit.id);
    await prisma.audit.update({ where: { id: audit.id }, data: { bullJobId: String(bullJob.id) } });
    await prisma.auditJob.update({ where: { id: jobRecord.id }, data: { bullJobId: String(bullJob.id) } });
    return NextResponse.json({ ok: true, id: audit.id, status: 'QUEUED' });
  } catch (error) {
    return jsonError(error, 503);
  }
}
