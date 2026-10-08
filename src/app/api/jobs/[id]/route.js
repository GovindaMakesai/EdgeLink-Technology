import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jsonError, requireApiAdmin } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function GET(_request, { params }) {
  try {
    requireApiAdmin();
    const job = await prisma.auditJob.findFirst({
      where: { OR: [{ id: params.id }, { bullJobId: params.id }, { auditId: params.id }] },
      orderBy: { createdAt: 'desc' },
      include: { audit: { include: { website: { include: { client: true } } } } },
    });
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    return NextResponse.json({
      job: {
        id: job.id,
        auditId: job.auditId,
        bullJobId: job.bullJobId,
        status: job.status,
        progress: job.progress,
        stage: job.stage,
        error: job.error,
        attempts: job.attempts,
        website: job.audit.website.url,
        client: job.audit.website.client.name,
        createdAt: job.createdAt.toISOString(),
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
