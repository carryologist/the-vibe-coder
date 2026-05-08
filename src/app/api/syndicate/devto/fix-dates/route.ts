import { NextRequest, NextResponse } from "next/server";
import matter from "gray-matter";
import { readFile } from "@/lib/github";

/**
 * Fix published_at date for a single Dev.to article.
 *
 * Two modes:
 * - POST { action: "list" } — returns all Dev.to articles with their current dates
 *   and the correct dates from the content repo, so the client knows what needs fixing.
 * - POST { action: "fix", articleId, publishedAt } — updates a single article's date.
 */
export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.DEVTO_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Dev.to API key not configured. Set DEVTO_API_KEY environment variable." },
        { status: 500 }
      );
    }

    const body = await request.json();

    // --- LIST MODE: return all articles with current vs correct dates ---
    if (body.action === "list") {
      const listRes = await fetch("https://dev.to/api/articles/me/all?per_page=100", {
        headers: { "api-key": apiKey },
      });

      if (!listRes.ok) {
        const err = await listRes.text();
        return NextResponse.json(
          { error: `Failed to fetch Dev.to articles: ${listRes.status} ${err}` },
          { status: 502 }
        );
      }

      const articles: Array<{
        id: number;
        title: string;
        canonical_url: string | null;
        published_at: string | null;
      }> = await listRes.json();

      const items = [];
      for (const article of articles) {
        if (!article.canonical_url) continue;

        const urlParts = article.canonical_url.split("/");
        const slug = urlParts[urlParts.length - 1];
        if (!slug) continue;

        const raw = await readFile(`content/posts/${slug}.mdx`);
        if (!raw) continue;

        const { data: meta } = matter(raw);
        if (!meta.date) continue;

        const dateStr =
          meta.date instanceof Date
            ? meta.date.toISOString().slice(0, 10)
            : String(meta.date).slice(0, 10);

        const correctPublishedAt = `${dateStr}T12:00:00Z`;
        const currentDate = article.published_at?.slice(0, 10) || "";
        const needsFix = currentDate !== dateStr;

        items.push({
          articleId: article.id,
          title: article.title,
          slug,
          currentPublishedAt: article.published_at,
          correctPublishedAt,
          needsFix,
        });
      }

      return NextResponse.json({ articles: items });
    }

    // --- FIX MODE: update a single article's published_at ---
    if (body.action === "fix") {
      const { articleId, publishedAt } = body;
      if (!articleId || !publishedAt) {
        return NextResponse.json(
          { error: "articleId and publishedAt are required" },
          { status: 400 }
        );
      }

      const updateRes = await fetch(`https://dev.to/api/articles/${articleId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "api-key": apiKey,
        },
        body: JSON.stringify({
          article: { published_at: publishedAt },
        }),
      });

      if (!updateRes.ok) {
        const err = await updateRes.text();
        return NextResponse.json(
          { error: `Dev.to ${updateRes.status}: ${err}` },
          { status: 502 }
        );
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: "Invalid action. Use 'list' or 'fix'." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Fix dates error:", error);
    return NextResponse.json(
      { error: "Fix dates failed" },
      { status: 500 }
    );
  }
}
