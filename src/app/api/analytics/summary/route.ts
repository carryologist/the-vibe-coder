import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

function getRedis() {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export async function GET() {
  try {
    const redis = getRedis();
    if (!redis) {
      return NextResponse.json({
        configured: false,
        message:
          "Redis not configured. Add KV_REST_API_URL and KV_REST_API_TOKEN environment variables.",
      });
    }

    // Get last 30 days of data.
    const days: { date: string; views: number }[] = [];
    const now = new Date();
    const pipeline = redis.pipeline();
    const dates: string[] = [];

    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      dates.push(dateStr);
      pipeline.get(`views:${dateStr}:total`);
    }

    const results = await pipeline.exec();

    for (let i = 0; i < dates.length; i++) {
      days.push({
        date: dates[i],
        views: (results[i] as number) || 0,
      });
    }

    // Get top pages (all known paths with today's counts).
    const allPaths = (await redis.smembers("views:paths")) as string[];
    const today = now.toISOString().split("T")[0];

    let topPages: { path: string; views: number }[] = [];
    if (allPaths.length > 0) {
      const pathPipeline = redis.pipeline();
      for (const p of allPaths) {
        pathPipeline.get(`views:${today}:${p}`);
      }
      const pathResults = await pathPipeline.exec();
      topPages = allPaths
        .map((p, i) => ({ path: p, views: (pathResults[i] as number) || 0 }))
        .filter((p) => p.views > 0)
        .sort((a, b) => b.views - a.views)
        .slice(0, 10);
    }

    const totalViews = days.reduce((sum, d) => sum + d.views, 0);

    return NextResponse.json({
      configured: true,
      totalViews,
      days,
      topPages,
    });
  } catch (error) {
    console.error("Analytics summary error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 },
    );
  }
}
