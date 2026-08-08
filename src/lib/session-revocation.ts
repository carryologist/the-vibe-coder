import { Redis } from "@upstash/redis";

/**
 * Session revocation denylist.
 *
 * Session tokens are stateless JWTs, so signature verification alone
 * cannot express "this specific token is no longer valid". Logout and
 * any future incident response need that, so every token carries a
 * `jti` and this module records the ones that have been revoked.
 *
 * Entries expire with the token itself: once a token is past its `exp`
 * it fails verification anyway, so the denylist never grows unbounded.
 *
 * Runs on both the Node and Edge runtimes (middleware calls it), which
 * is why it uses the Upstash REST client rather than a TCP driver.
 */

const KEY_PREFIX = "session:revoked:";

function getRedis(): Redis | null {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

/**
 * Returns true when the token must be rejected.
 *
 * If Upstash is not configured at all (local dev, a preview without
 * Redis) revocation is unavailable and this returns false, matching how
 * analytics and the non-credential rate limits degrade.
 *
 * If Upstash IS configured but the lookup fails, this returns true:
 * without the denylist we cannot tell a live session from a revoked
 * one, and the login path already fails closed during a Redis outage,
 * so rejecting is the consistent posture.
 */
export async function isSessionRevoked(jti: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;

  try {
    const found = await redis.get(`${KEY_PREFIX}${jti}`);
    return found !== null;
  } catch (error) {
    console.error("session-revocation lookup failed:", error);
    return true;
  }
}

/**
 * Deny a token for the remainder of its lifetime.
 *
 * `expiresAt` is the JWT `exp` claim in seconds since the epoch; the
 * denylist entry is given exactly that much TTL.
 */
export async function revokeSession(
  jti: string,
  expiresAt: number
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  const ttl = Math.ceil(expiresAt - Date.now() / 1000);
  if (ttl <= 0) return; // Already expired; verification rejects it anyway.

  try {
    await redis.set(`${KEY_PREFIX}${jti}`, "1", { ex: ttl });
  } catch (error) {
    // Surface the failure so a logout that did not really revoke is
    // visible in the runtime logs.
    console.error("session-revocation write failed:", error);
    throw error;
  }
}
