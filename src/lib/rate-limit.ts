/**
 * Simple in-memory token bucket per client key. No external dependency.
 */

type Bucket = { tokens: number; lastRefillMs: number };

const buckets = new Map<string, Bucket>();

// Soft cap on the Map size so it can't grow without bound under attack.
// At capacity we evict the oldest-touched bucket — a real LRU would track
// an order list, but for a single-user demo a simple eviction is fine.
const MAX_BUCKETS = 10_000;

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSec: number };

/**
 * Take 1 token from `key`'s bucket. If no token, return `retryAfterSec`.
 *
 * @param key            unique identifier (e.g. `ip:1.2.3.4` or `shortlist:1.2.3.4`)
 * @param capacity       max tokens the bucket can hold
 * @param refillPerSec   tokens added per second when below capacity
 */
export function rateLimit(
  key: string,
  capacity: number,
  refillPerSec: number,
): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);
  const bucket: Bucket = existing ?? {
    tokens: capacity,
    lastRefillMs: now,
  };

  const elapsedSec = (now - bucket.lastRefillMs) / 1000;
  bucket.tokens = Math.min(capacity, bucket.tokens + elapsedSec * refillPerSec);
  bucket.lastRefillMs = now;

  if (bucket.tokens < 1) {
    const retryAfterSec = Math.ceil((1 - bucket.tokens) / refillPerSec);
    upsert(key, bucket);
    return { allowed: false, retryAfterSec };
  }

  bucket.tokens -= 1;
  upsert(key, bucket);
  return { allowed: true };
}

function upsert(key: string, bucket: Bucket) {
  if (!buckets.has(key) && buckets.size >= MAX_BUCKETS) {
    // Evict the first inserted (insertion-ordered Map) — cheap, not LRU.
    const firstKey = buckets.keys().next().value;
    if (firstKey !== undefined) buckets.delete(firstKey);
  }
  buckets.set(key, bucket);
}

/**
 * Best-effort client IP for a Next.js route. Trusts the standard proxy
 * headers; falls back to a constant when none are present (e.g. localhost),
 * which means the dev/single-user case shares one bucket — desired behaviour
 * for a single-tenant prototype.
 */
export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const xri = req.headers.get("x-real-ip");
  if (xri) return xri.trim();
  return "local";
}

// Test-only: clear the in-memory state. Not exported from a barrel; tests
// import directly.
export function _resetBucketsForTesting() {
  buckets.clear();
}
