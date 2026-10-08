const buckets = new Map();

export function rateLimit(key, limit = 30, windowMs = 60_000) {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }
  if (current.count >= limit) {
    return { ok: false, remaining: 0, retryAfter: Math.ceil((current.reset - now) / 1000) };
  }
  current.count += 1;
  return { ok: true, remaining: limit - current.count };
}
