import { prisma } from '@/lib/prisma';
import { createRedisConnection } from '@/queues/connection';
import { Badge } from '@/components/ui/primitives';

export const dynamic = 'force-dynamic';

async function checkDatabase() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

async function checkRedis() {
  if (!process.env.REDIS_URL) return false;
  const redis = createRedisConnection();
  try {
    const pong = await redis.ping();
    return pong === 'PONG';
  } catch {
    return false;
  } finally {
    redis.disconnect();
  }
}

export default async function SettingsPage() {
  const [database, redis] = await Promise.all([checkDatabase(), checkRedis()]);
  const rows = [
    ['Mock mode', process.env.USE_MOCKS === 'true' ? 'On' : 'Off'],
    ['Claude key', process.env.ANTHROPIC_API_KEY ? 'Configured' : 'Missing — development fallback'],
    ['Model', process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6'],
    ['Database', database ? 'Connected' : 'Unreachable'],
    ['Redis', redis ? 'Connected' : 'Unreachable'],
    ['Cron secret', process.env.CRON_SECRET ? 'Configured' : 'Missing'],
    ['Report storage', 'Local temp directory'],
  ];
  return (
    <div>
      <header className="page-header">
        <div>
          <p className="eyebrow">Settings</p>
          <h1>Runtime</h1>
          <p className="lede">Status only. Secrets stay on the server.</p>
        </div>
      </header>
      <section className="panel">
        <ul className="plain-list">
          {rows.map(([label, value]) => (
            <li key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <span>{label}</span>
              <Badge tone={String(value).includes('Unreachable') || String(value).includes('Missing') ? 'watch' : 'good'}>{value}</Badge>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
