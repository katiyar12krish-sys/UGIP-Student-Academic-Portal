// Small in-memory sliding-window limiter (single server process). Swap for Redis if you ever run multiple instances.
type Bucket = number[];
const buckets = new Map<string, Bucket>();

// Hit.
export function hit(key: string, max: number, windowMs: number): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const b = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  if (b.length >= max) {
    buckets.set(key, b);
    return { allowed: false, retryAfterSec: Math.ceil((windowMs - (now - b[0])) / 1000) };
  }
  b.push(now);
  buckets.set(key, b);
  return { allowed: true, retryAfterSec: 0 };
}

// Reset.
export function reset(key: string) { buckets.delete(key); }

const sweeper = setInterval(() => {
  const now = Date.now();
  for (const [k, b] of buckets) if (!b.length || now - b[b.length - 1] > 3600_000) buckets.delete(k);
}, 600_000);
(sweeper as any).unref?.(); // don't keep the process alive just for this timer
