import { safeEqual } from './secret';

export function cronTokenFromHeaders(headers) {
  const authorization = headers.get('authorization') || '';
  if (authorization.toLowerCase().startsWith('bearer ')) {
    return authorization.slice(7).trim();
  }
  return (headers.get('x-cron-secret') || '').trim();
}

export function isCronAuthorized(token) {
  const secret = process.env.CRON_SECRET || '';
  if (!secret || !token) return false;
  return safeEqual(token, secret);
}
