import IORedis from 'ioredis';

export const WORKER_HEARTBEAT_KEY = 'edgelink:worker:heartbeat';

export function redisTarget() {
  const url = process.env.REDIS_URL;
  if (!url) return 'not_configured';
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.hostname}${parsed.port ? `:${parsed.port}` : ''}`;
  } catch {
    return 'configured';
  }
}

export function createRedisConnection() {
  const url = process.env.REDIS_URL;
  if (!url) {
    const error = new Error('REDIS_URL is not configured');
    error.code = 'REDIS_NOT_CONFIGURED';
    throw error;
  }

  const options = {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };

  if (process.env.REDIS_TOKEN && !url.includes('@')) {
    options.password = process.env.REDIS_TOKEN;
  }

  return new IORedis(url, options);
}
