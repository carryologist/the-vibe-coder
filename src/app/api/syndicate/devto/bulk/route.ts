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

/**
 * Bulk syndicate posts to Dev.to. Accepts an array of slugs and processes
 * them sequentially with a delay between each to respect Dev.to rate limits
 * (roughly 30 req/min on their API).
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

    for (const slug of slugs) {
      // Rate-limit: wait 3 seconds between posts to stay well under Dev.to limits.
      if (results.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
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

        // Publish to Dev.to.
        const devtoRes = await fetch("https://dev.to/api/articles", {
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

        if (!devtoRes.ok) {
          const err = await devtoRes.text();
          results.push({
            slug,
            title: meta.title || slug,
            status: "error",
            error: `Dev.to ${devtoRes.status}: ${err}`,
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
