import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { rateLimit, rateLimitKey } from "@/lib/rate-limit";

function getRedis() {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

// Tracked paths must match one of these patterns. Anything else is
// silently dropped (the response still returns 200 to keep the tracker
// non-disruptive, but no Redis writes happen).
//
// Why allowlist: every unique `cleanPath` value previously created a
// new Redis key (`views:total:${cleanPath}`), so an attacker could mint
// arbitrary keys to fill the KV store. With the allowlist, an attacker
// is limited to known site paths, which is bounded by the post count.
const ALLOWED_PATHS: RegExp[] = [
  /^\/$/, // homepage
  /^\/about\/?$/,
  /^\/tags\/?$/,
  /^\/tags\/[a-z0-9-]{1,64}\/?$/,
  /^\/posts\/[a-z0-9-]{1,128}\/?$/,
];

function isAllowedPath(p: string): boolean {
  return ALLOWED_PATHS.some((re) => re.test(p));
}

// Generous limit: 60 page views per minute per IP. A real reader skims
// nowhere near that fast. A botted abuser writing one key per request
// hits the limit before doing meaningful damage.
const ANALYTICS_LIMIT = 60;
const ANALYTICS_WINDOW_SECONDS = 60;

export async function POST(request: NextRequest) {
  try {
    // Rate limit first so a probe that fails the path allowlist still
    // counts against the attacker's quota.
    const rl = await rateLimit(
      rateLimitKey("analytics", request),
      ANALYTICS_LIMIT,
      ANALYTICS_WINDOW_SECONDS
    );
    if (!rl.ok) {
      // Silently succeed — don't reveal that we rate-limited the
      // probe. Same shape as every other rejection in this handler.
      return NextResponse.json({ ok: true });
    }

    const redis = getRedis();
    if (!redis) {
      return NextResponse.json({ ok: true });
    }

    const { path } = await request.json();
    if (!path || typeof path !== "string") {
      return NextResponse.json({ ok: true });
    }

    if (!isAllowedPath(path)) {
      return NextResponse.json({ ok: true });
    }

    // Normalize: strip trailing slash so /posts/foo and /posts/foo/
    // resolve to the same counter.
    const cleanPath =
      path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;

    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    // Increment daily total and per-path counters.
    // Use a pipeline for efficiency.
    const pipeline = redis.pipeline();
    pipeline.incr(`views:${today}:total`);
    pipeline.incr(`views:${today}:${cleanPath}`);
    pipeline.incr(`views:total:${cleanPath}`);

    // Also maintain a set of all dates that have data.
    pipeline.sadd("views:dates", today);
    // And a set of all paths seen.
    pipeline.sadd("views:paths", cleanPath);

    await pipeline.exec();

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Analytics track error:", error);
    // Don't fail the request — analytics is best-effort.
    return NextResponse.json({ ok: true });
  }
}
