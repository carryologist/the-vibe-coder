import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

function getRedis() {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export async function POST(request: NextRequest) {
  try {
    const redis = getRedis();
    if (!redis) {
      // Silently succeed — analytics is optional, don't break the site.
      return NextResponse.json({ ok: true });
    }

    const { path } = await request.json();
    if (!path || typeof path !== "string") {
      return NextResponse.json({ ok: true });
    }

    // Sanitize path — only allow reasonable paths.
    const cleanPath = path.replace(/[^a-zA-Z0-9/\-_.]/g, "").slice(0, 200);

    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    // Increment daily total and per-path counters.
    // Use a pipeline for efficiency.
    const pipeline = redis.pipeline();
    pipeline.incr(`views:${today}:total`);
    pipeline.incr(`views:${today}:${cleanPath}`);

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
