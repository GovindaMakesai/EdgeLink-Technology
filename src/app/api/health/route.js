import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { WORKER_HEARTBEAT_KEY, createRedisConnection } from '@/queues/connection';
import { storageStatus } from '@/services/storage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function checkDatabase() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, status: 'ok' };
  } catch {
    return { ok: false, status: 'error' };
  }
}

async function checkRedis() {
  if (!process.env.REDIS_URL) return { ok: false, status: 'not_configured', worker: 'unknown' };
  const redis = createRedisConnection();
  try {
    const pong = await Promise.race([
      redis.ping(),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('timeout')), 4000);
      }),
    ]);
    const beat = await redis.get(WORKER_HEARTBEAT_KEY);
    return {
      ok: pong === 'PONG',
      status: pong === 'PONG' ? 'ok' : 'error',
      worker: beat ? 'listening' : 'not_seen',
    };
  } catch {
    return { ok: false, status: 'error', worker: 'unknown' };
  } finally {
    redis.disconnect();
  }
}

export async function GET() {
  const [database, redis] = await Promise.all([checkDatabase(), checkRedis()]);
  const storage = storageStatus();
  const ok = database.ok && redis.ok && storage.configured;
  return NextResponse.json(
    {
      ok,
      database: database.status,
      redis: redis.status,
      storage: storage.mode,
      worker: redis.worker,
    },
    { status: ok ? 200 : 503 }
  );
}
