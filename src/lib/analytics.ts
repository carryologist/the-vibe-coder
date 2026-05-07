import { Redis } from "@upstash/redis";

function getRedis() {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

/**
 * Fetch all-time view counts for a list of post slugs.
 * Uses the `views:total:/posts/{slug}` running-total keys.
 * Returns a slug → count map.
 */
export async function getPostViewCounts(
  slugs: string[],
): Promise<Record<string, number>> {
  const redis = getRedis();
  if (!redis || slugs.length === 0) return {};

  const keys = slugs.map((s) => `views:total:/posts/${s}`);
  const pipeline = redis.pipeline();
  for (const key of keys) {
    pipeline.get(key);
  }
  const results = await pipeline.exec();

  const counts: Record<string, number> = {};
  for (let i = 0; i < slugs.length; i++) {
    counts[slugs[i]] = (results[i] as number) || 0;
  }
  return counts;
}
