import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { assertAuditAccess, jsonError, requireApiSession } from '@/lib/http';
import { readReport } from '@/services/storage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_request, { params }) {
  try {
    const session = requireApiSession();
    const audit = await prisma.audit.findUnique({
      where: { id: params.id },
      include: { website: true, report: true },
    });
    if (!audit) return NextResponse.json({ error: 'Audit not found' }, { status: 404 });
    assertAuditAccess(session, audit);
    if (!audit.report) {
      return NextResponse.json({ error: 'The PDF report has not been generated yet' }, { status: 404 });
    }
    const file = await readReport(audit.report.fileName);
    return new NextResponse(new Uint8Array(file.bytes), {
      status: 200,
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': `attachment; filename="${audit.report.fileName}"`,
        'cache-control': 'private, no-store',
      },
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return NextResponse.json({ error: 'The report file is no longer available' }, { status: 404 });
    }
    if (String(error.message || '').includes('Supabase Storage is not configured')) {
      return NextResponse.json({ error: 'Report storage is not configured' }, { status: 503 });
    }
    return jsonError(error, 404);
  }
}
