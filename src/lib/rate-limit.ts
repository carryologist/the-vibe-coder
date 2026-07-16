import { Redis } from "@upstash/redis";

/**
 * Redis-backed fixed-window rate limiter.
 *
 * Pattern matches the rest of the codebase (see src/lib/analytics.ts):
 * if Upstash env vars are not configured, the limiter falls back to an
 * in-memory Map-based counter rather than silently allowing unlimited
 * requests. The in-memory fallback is per-process and will reset on
 * cold starts, but it still enforces a hard cap within each instance.
 *
 * The window is fixed (per-key TTL) rather than sliding; for a 5/15min
 * login limit this difference is negligible and the implementation
 * survives in two Redis operations per request.
 */

function getRedis(): Redis | null {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export interface RateLimitResult {
  /** True if the request is within the limit. */
  ok: boolean;
  /** Seconds until the window resets. Only meaningful when ok is false. */
  retryAfter: number;
  /** Remaining attempts in the current window. */
  remaining: number;
}

// ----------------------------------------------------------------
// In-memory fallback when Redis is not configured
// ----------------------------------------------------------------

interface MemoryEntry {
  count: number;
  expiresAt: number;
}

const memoryStore = new Map<string, MemoryEntry>();
let memoryFallbackWarned = false;

function rateLimitMemory(
  key: string,
  limit: number,
  windowSeconds: number,
): RateLimitResult {
  if (!memoryFallbackWarned) {
    console.warn(
      "rate-limit: Redis is not configured. Using in-memory fallback. " +
        "Set KV_REST_API_URL and KV_REST_API_TOKEN for production use.",
    );
    memoryFallbackWarned = true;
  }

  const now = Date.now();
  const entry = memoryStore.get(key);

  if (!entry || entry.expiresAt <= now) {
    memoryStore.set(key, { count: 1, expiresAt: now + windowSeconds * 1000 });
    return { ok: true, retryAfter: 0, remaining: limit - 1 };
  }

  entry.count += 1;

  if (entry.count > limit) {
    const retryAfter = Math.ceil((entry.expiresAt - now) / 1000);
    return { ok: false, retryAfter: retryAfter > 0 ? retryAfter : windowSeconds, remaining: 0 };
  }

  return { ok: true, retryAfter: 0, remaining: Math.max(0, limit - entry.count) };
}

/**
 * Increment a counter for `key` and return whether it is at or below
 * `limit`. The counter expires after `windowSeconds`.
 *
 * Falls back to an in-memory counter if Redis is unreachable or
 * unconfigured. Logs the underlying error so an outage is visible in
 * Vercel logs.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const redis = getRedis();
  if (!redis) {
    return rateLimitMemory(key, limit, windowSeconds);
  }

  try {
    const count = await redis.incr(key);
    // Only set the TTL on the first hit of the window. Calling expire
    // on every hit would extend the window indefinitely under sustained
    // load.
    if (count === 1) {
      await redis.expire(key, windowSeconds);
    }

    if (count > limit) {
      const ttl = await redis.ttl(key);
      return {
        ok: false,
        // ttl returns -1 (no expire set) or -2 (no key) as edge cases;
        // fall back to the full window in those cases.
        retryAfter: ttl > 0 ? ttl : windowSeconds,
        remaining: 0,
      };
    }

    return { ok: true, retryAfter: 0, remaining: Math.max(0, limit - count) };
  } catch (error) {
    console.error("rate-limit redis error:", error);
    // Redis is down; fall back to in-memory so we still enforce a cap.
    return rateLimitMemory(key, limit, windowSeconds);
  }
}

/**
 * Extract a best-effort client IP from the request headers. Vercel sets
 * x-forwarded-for; we take the first hop as the originating client.
 * Falls back to a constant so a missing header still produces a
 * deterministic (if shared) rate-limit bucket rather than letting the
 * limiter be bypassed entirely.
 */
export function clientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = request.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}
