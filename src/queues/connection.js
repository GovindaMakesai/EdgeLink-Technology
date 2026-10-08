import IORedis from 'ioredis';

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
