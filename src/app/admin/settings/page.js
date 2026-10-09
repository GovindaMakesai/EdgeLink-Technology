import { prisma } from '@/lib/prisma';
import { createRedisConnection } from '@/queues/connection';
import { realClaudeEnabled } from '@/services/claude/claude.service';
import { resolveStorage } from '@/services/storage';
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
    ['PageSpeed, Search Console, rankings', 'Collected only when that provider is configured. Otherwise the field is not analyzed.'],
    ['AI analysis', realClaudeEnabled() ? 'Claude API' : 'Not enabled'],
    ['Database', database ? 'Connected' : 'Unreachable'],
    ['Redis', redis ? 'Connected' : 'Unreachable'],
    ['Cron secret', process.env.CRON_SECRET ? 'Configured' : 'Missing'],
    ['Report storage', resolveStorage().kind === 'supabase' ? 'Supabase Storage' : resolveStorage().kind === 'local' ? 'Local disk' : 'Missing'],
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
            <li key={label} className="stat-row">
              <span>{label}</span>
              <Badge tone={String(value).includes('Unreachable') || String(value).includes('Missing') ? 'watch' : 'good'}>{value}</Badge>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
