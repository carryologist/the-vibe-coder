import { Redis } from "@upstash/redis";

/**
 * Redis-backed fixed-window rate limiter.
 *
 * Two failure modes are distinguished:
 *
 *   - Non-critical limiters (analytics, share-image, MCP) degrade to
 *     "always allow" when Upstash is unconfigured or unreachable, so
 *     local dev and preview environments without Redis keep working.
 *   - Critical limiters (the admin login) fail CLOSED. Losing the only
 *     brute-force control on the sole admin credential is worse than
 *     rejecting logins during a Redis outage.
 *
 * The window is fixed (per-key TTL) rather than sliding; for a 5/15min
 * login limit this difference is negligible.
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
  /**
   * True when the limiter could not reach Redis and the result is a
   * fallback rather than a real count. Callers that need to fail closed
   * inspect this.
   */
  degraded: boolean;
}

export interface RateLimitOptions {
  /**
   * When true, a Redis outage or missing configuration produces
   * ok=false instead of ok=true. Use for credential endpoints.
   */
  failClosed?: boolean;
}

/**
 * Increment a counter for `key` and return whether it is at or below
 * `limit`. The counter expires after `windowSeconds`.
 *
 * The window is established with a single atomic `SET key 0 EX <window>
 * NX` before the increment. Doing this as a separate `EXPIRE` after the
 * first `INCR` (the previous implementation) left the key with no TTL
 * whenever the second call failed, which bricked that key forever: the
 * "first hit of the window" branch never ran again, so the TTL was
 * never set and the counter only ever grew.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
  options: RateLimitOptions = {}
): Promise<RateLimitResult> {
  const failClosed = options.failClosed ?? false;

  const degradedResult: RateLimitResult = failClosed
    ? { ok: false, retryAfter: windowSeconds, remaining: 0, degraded: true }
    : { ok: true, retryAfter: 0, remaining: limit, degraded: true };

  const redis = getRedis();
  if (!redis) {
    if (failClosed) {
      console.error(
        `rate-limit: Upstash is not configured and "${key}" is fail-closed; rejecting.`
      );
    }
    return degradedResult;
  }

  try {
    // Create the key with its TTL only if it does not already exist,
    // then increment. Both calls are individually atomic and the SET is
    // a no-op on every hit after the first, so the TTL can never be
    // extended by sustained load and can never be left unset.
    await redis.set(key, 0, { ex: windowSeconds, nx: true });
    const count = await redis.incr(key);

    if (count > limit) {
      const ttl = await redis.ttl(key);
      // ttl returns -1 (no expire set) or -2 (no key) as edge cases.
      // -1 should now be unreachable, but repair it rather than
      // trusting that, so a key can never block forever.
      if (ttl === -1) {
        await redis.expire(key, windowSeconds);
      }
      return {
        ok: false,
        retryAfter: ttl > 0 ? ttl : windowSeconds,
        remaining: 0,
        degraded: false,
      };
    }

    return {
      ok: true,
      retryAfter: 0,
      remaining: Math.max(0, limit - count),
      degraded: false,
    };
  } catch (error) {
    console.error("rate-limit redis error:", error);
    return degradedResult;
  }
}

/**
 * Extract the client IP from the headers the hosting platform sets
 * itself.
 *
 * `x-forwarded-for` is NOT used: its left-most entry is supplied by the
 * client and is trivially spoofable, so keying a limiter on it lets an
 * attacker mint a fresh bucket per request. Vercel documents that it
 * overwrites `x-forwarded-for` and exposes the same value as
 * `x-vercel-forwarded-for`, which a proxy in front of the deployment
 * cannot overwrite, so that is the header we trust first.
 *
 * Returns null when no platform header is present. Callers decide what
 * that means: a shared bucket is fine for best-effort limits, but a
 * credential endpoint should treat it as untrusted rather than letting
 * every anonymous request share one key.
 */
export function clientIp(request: Request): string | null {
  // Set by Vercel's edge network; not forwarded from the client.
  const vercel = firstEntry(request.headers.get("x-vercel-forwarded-for"));
  if (vercel) return vercel;

  // Set by Vercel's proxy (and by nginx-style reverse proxies) to a
  // single address rather than a client-appendable list.
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real;

  return null;
}

/**
 * Build a rate-limit key for `scope`, using the client IP when the
 * platform gave us a trustworthy one. Requests without a trusted IP all
 * share a single "unknown" bucket, so they cannot be used to escape the
 * limit by omitting headers.
 */
export function rateLimitKey(scope: string, request: Request): string {
  return `ratelimit:${scope}:${clientIp(request) ?? "unknown"}`;
}

function firstEntry(value: string | null): string | null {
  if (!value) return null;
  const first = value.split(",")[0]?.trim();
  return first ? first : null;
}
