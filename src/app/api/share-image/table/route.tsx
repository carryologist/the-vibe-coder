import { NextRequest } from "next/server";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { getPostBySlug } from "@/lib/posts";
import { extractMarkdownTables, buildTableImageResponse, TableImageError } from "@/lib/table-image";

export const runtime = "nodejs";

// Fetched by RSS/newsletter importers (Substack) and by email clients
// rendering the newsletter, not by a human clicking a button — a
// higher, IP-based limit than the manual share endpoint, mainly to
// bound abuse rather than normal traffic.
const RATE_LIMIT = 120;
const RATE_WINDOW_SECONDS = 60;

/**
 * GET /api/share-image/table?slug=<post-slug>&index=<n>
 *
 * Renders table `n` (0-based, in document order) of the given post as
 * a branded PNG, using the same rendering code as the manual "Share
 * as image" button. This exists so the Substack syndication feed
 * (/syndicate.xml) can reference a stable, fetchable image URL in
 * place of a raw <table> element -- Substack's importer strips HTML
 * tables entirely, so without this the tables in synced posts
 * disappear silently.
 */
export async function GET(request: NextRequest) {
  const ip = clientIp(request);
  const rl = await rateLimit(`ratelimit:share-image-table:${ip}`, RATE_LIMIT, RATE_WINDOW_SECONDS);
  if (!rl.ok) {
    return Response.json(
      { error: "rate_limited" },
      { status: 429, headers: { "retry-after": String(rl.retryAfter) } },
    );
  }

  const { searchParams } = request.nextUrl;
  const slug = searchParams.get("slug");
  const indexParam = searchParams.get("index");

  if (!slug || indexParam === null) {
    return Response.json({ error: "slug and index are required" }, { status: 400 });
  }

  const index = Number.parseInt(indexParam, 10);
  if (!Number.isInteger(index) || index < 0) {
    return Response.json({ error: "index must be a non-negative integer" }, { status: 400 });
  }

  const post = getPostBySlug(slug);
  if (!post) {
    return Response.json({ error: "post not found" }, { status: 404 });
  }

  const tables = extractMarkdownTables(post.content);
  const table = tables[index];
  if (!table) {
    return Response.json({ error: "table index out of range" }, { status: 404 });
  }

  try {
    const image = buildTableImageResponse({
      content: table.content,
      title: post.title,
      caption: table.caption,
    });
    // Content is static per deploy (a published post's tables don't
    // change without a new commit/build) -- safe to cache aggressively
    // at the CDN edge. Substack fetches this once at import time, and
    // email clients may fetch it again per open.
    image.headers.set("Cache-Control", "public, max-age=3600, s-maxage=86400, immutable");
    return image;
  } catch (err) {
    if (err instanceof TableImageError) {
      return Response.json({ error: err.message }, { status: 400 });
    }
    console.error("[share-image/table] ERROR:", err);
    return Response.json({ error: "Failed to generate image" }, { status: 500 });
  }
}
