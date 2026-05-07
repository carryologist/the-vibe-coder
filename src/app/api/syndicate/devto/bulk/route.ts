import { NextRequest, NextResponse } from "next/server";
import matter from "gray-matter";
import { readFile, commitFile } from "@/lib/github";

interface BulkResult {
  slug: string;
  title: string;
  status: "published" | "skipped" | "error";
  devtoUrl?: string;
  error?: string;
}

const DELAY_BETWEEN_POSTS_MS = 31_000; // Dev.to enforces ~30s between creates
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 35_000; // Wait 35s on 429 before retrying

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Bulk syndicate posts to Dev.to. Accepts an array of slugs and processes
 * them sequentially with a 31-second delay between each to respect Dev.to
 * rate limits. Retries 429s up to 2 times with a 35-second backoff.
 */
export async function POST(request: NextRequest) {
  try {
    const { slugs } = await request.json();
    if (!Array.isArray(slugs) || slugs.length === 0) {
      return NextResponse.json(
        { error: "No slugs provided. Send { slugs: string[] }" },
        { status: 400 }
      );
    }

    const apiKey = process.env.DEVTO_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Dev.to API key not configured. Set DEVTO_API_KEY environment variable." },
        { status: 500 }
      );
    }

    const results: BulkResult[] = [];

    for (let i = 0; i < slugs.length; i++) {
      const slug = slugs[i];

      // Rate-limit: wait 31 seconds between posts (skip delay before the first).
      if (i > 0) {
        await sleep(DELAY_BETWEEN_POSTS_MS);
      }

      try {
        // Read the post from GitHub.
        const raw = await readFile(`content/posts/${slug}.mdx`);
        if (!raw) {
          results.push({ slug, title: slug, status: "error", error: "Post not found" });
          continue;
        }

        const { data: meta, content } = matter(raw);

        // Skip if already syndicated.
        if (meta.devtoUrl) {
          results.push({
            slug,
            title: meta.title || slug,
            status: "skipped",
            devtoUrl: meta.devtoUrl,
          });
          continue;
        }

        // Skip if not published on vibescoder.dev.
        if (!meta.published) {
          results.push({
            slug,
            title: meta.title || slug,
            status: "skipped",
            error: "Post is not published",
          });
          continue;
        }

        // Publish to Dev.to with retry on 429.
        let devtoRes: Response | null = null;
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
          if (attempt > 0) {
            await sleep(RETRY_DELAY_MS);
          }

          devtoRes = await fetch("https://dev.to/api/articles", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "api-key": apiKey,
            },
            body: JSON.stringify({
              article: {
                title: meta.title,
                body_markdown: content,
                canonical_url: `https://vibescoder.dev/posts/${slug}`,
                tags: (meta.tags || [])
                  .slice(0, 4)
                  .map((t: string) => t.replace(/[^a-z0-9]/gi, "").toLowerCase()),
                published: true,
                description: meta.description || "",
              },
            }),
          });

          if (devtoRes.status !== 429) break;
        }

        if (!devtoRes || !devtoRes.ok) {
          const err = devtoRes ? await devtoRes.text() : "No response";
          const status = devtoRes?.status || 0;
          results.push({
            slug,
            title: meta.title || slug,
            status: "error",
            error: `Dev.to ${status}: ${err}`,
          });
          continue;
        }

        const devtoData = await devtoRes.json();
        const devtoUrl = devtoData.url;

        // Write devtoUrl back into frontmatter.
        if (devtoUrl) {
          const updatedMeta = { ...meta, devtoUrl };
          const updatedRaw = matter.stringify(content, updatedMeta);
          await commitFile(
            `content/posts/${slug}.mdx`,
            updatedRaw,
            `syndicate: add Dev.to URL to "${meta.title}"`
          );
        }

        results.push({
          slug,
          title: meta.title || slug,
          status: "published",
          devtoUrl,
        });
      } catch (err) {
        results.push({
          slug,
          title: slug,
          status: "error",
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    const published = results.filter((r) => r.status === "published").length;
    const skipped = results.filter((r) => r.status === "skipped").length;
    const errors = results.filter((r) => r.status === "error").length;

    return NextResponse.json({
      success: true,
      summary: { total: results.length, published, skipped, errors },
      results,
    });
  } catch (error) {
    console.error("Bulk syndication error:", error);
    return NextResponse.json(
      { error: "Bulk syndication failed" },
      { status: 500 }
    );
  }
}
