import { NextRequest, NextResponse } from "next/server";
import matter from "gray-matter";
import { readFile } from "@/lib/github";

interface FixDateResult {
  title: string;
  devtoId: number;
  slug: string;
  status: "updated" | "skipped" | "error";
  oldPublishedAt?: string;
  newPublishedAt?: string;
  error?: string;
}

const DELAY_BETWEEN_UPDATES_MS = 31_000; // Dev.to enforces ~30s between writes
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 35_000; // Wait 35s on 429 before retrying

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Vercel function timeout — needs enough time for 12+ articles at 31s each.
export const maxDuration = 600; // 10 minutes

/**
 * One-time endpoint to fix published_at dates on Dev.to articles.
 *
 * For each article on Dev.to, finds the matching post in the content repo
 * via the canonical_url slug, reads the frontmatter `date` field, and
 * updates the Dev.to article's `published_at` to noon UTC on that date.
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

    // 1. Fetch all articles from Dev.to for the authenticated user.
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

    const results: FixDateResult[] = [];

    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];

      // Rate-limit: wait 31 seconds between updates (skip delay before the first).
      if (i > 0) {
        await sleep(DELAY_BETWEEN_UPDATES_MS);
      }

      try {
        // 2. Extract slug from canonical_url.
        if (!article.canonical_url) {
          results.push({
            title: article.title,
            devtoId: article.id,
            slug: "",
            status: "skipped",
            error: "No canonical_url set",
          });
          continue;
        }

        // canonical_url looks like: https://vibescoder.dev/posts/{slug}
        const urlParts = article.canonical_url.split("/");
        const slug = urlParts[urlParts.length - 1];
        if (!slug) {
          results.push({
            title: article.title,
            devtoId: article.id,
            slug: "",
            status: "skipped",
            error: `Could not extract slug from canonical_url: ${article.canonical_url}`,
          });
          continue;
        }

        // 3. Read the post from GitHub and parse frontmatter.
        const raw = await readFile(`content/posts/${slug}.mdx`);
        if (!raw) {
          results.push({
            title: article.title,
            devtoId: article.id,
            slug,
            status: "error",
            error: "Post not found in content repo",
          });
          continue;
        }

        const { data: meta } = matter(raw);
        if (!meta.date) {
          results.push({
            title: article.title,
            devtoId: article.id,
            slug,
            status: "skipped",
            error: "No date field in frontmatter",
          });
          continue;
        }

        // 4. Build the new published_at timestamp (noon UTC).
        const dateStr =
          meta.date instanceof Date
            ? meta.date.toISOString().slice(0, 10)
            : String(meta.date).slice(0, 10);

        const newPublishedAt = `${dateStr}T12:00:00Z`;

        // Skip if the date already matches (compare date portion only;
        // Dev.to returns full ISO timestamps like 2026-04-22T12:00:00Z).
        if (article.published_at && article.published_at.slice(0, 10) === dateStr) {
          results.push({
            title: article.title,
            devtoId: article.id,
            slug,
            status: "skipped",
            oldPublishedAt: article.published_at,
            newPublishedAt,
            error: "Already correct",
          });
          continue;
        }

        // 5. Update the Dev.to article with retry on 429.
        let updateRes: Response | null = null;
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
          if (attempt > 0) {
            await sleep(RETRY_DELAY_MS);
          }

          updateRes = await fetch(`https://dev.to/api/articles/${article.id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "api-key": apiKey,
            },
            body: JSON.stringify({
              article: { published_at: newPublishedAt },
            }),
          });

          if (updateRes.status !== 429) break;
        }

        if (!updateRes || !updateRes.ok) {
          const err = updateRes ? await updateRes.text() : "No response";
          const status = updateRes?.status || 0;
          results.push({
            title: article.title,
            devtoId: article.id,
            slug,
            status: "error",
            oldPublishedAt: article.published_at ?? undefined,
            error: `Dev.to ${status}: ${err}`,
          });
          continue;
        }

        results.push({
          title: article.title,
          devtoId: article.id,
          slug,
          status: "updated",
          oldPublishedAt: article.published_at ?? undefined,
          newPublishedAt,
        });
      } catch (err) {
        results.push({
          title: article.title,
          devtoId: article.id,
          slug: "",
          status: "error",
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    const updated = results.filter((r) => r.status === "updated").length;
    const skipped = results.filter((r) => r.status === "skipped").length;
    const errors = results.filter((r) => r.status === "error").length;

    return NextResponse.json({
      success: true,
      summary: { total: results.length, updated, skipped, errors },
      results,
    });
  } catch (error) {
    console.error("Fix dates error:", error);
    return NextResponse.json(
      { error: "Fix dates failed" },
      { status: 500 }
    );
  }
}
