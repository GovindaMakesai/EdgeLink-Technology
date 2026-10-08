import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireApiAdmin, jsonError } from '@/lib/http';
import { createClientSchema, zodErrorMessage } from '@/validations/audit';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    requireApiAdmin();
    const clients = await prisma.client.findMany({
      orderBy: { createdAt: 'desc' },
      include: { websites: true, _count: { select: { websites: true } } },
    });
    return NextResponse.json({
      clients: clients.map((client) => ({
        id: client.id,
        name: client.name,
        email: client.email,
        phone: client.phone,
        isDemo: client.isDemo,
        websites: client.websites,
        createdAt: client.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request) {
  try {
    requireApiAdmin();
    const parsed = createClientSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: zodErrorMessage(parsed.error) }, { status: 400 });
    }
    const client = await prisma.client.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email || null,
        phone: parsed.data.phone || null,
      },
    });
    return NextResponse.json({ client }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
