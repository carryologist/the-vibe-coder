import { NextRequest, NextResponse } from "next/server";
import matter from "gray-matter";
import { readFile, commitFile } from "@/lib/github";
import { sanitizeSlug } from "@/lib/slug";
import { requireAdmin } from "@/lib/require-admin";

/**
 * Syndicate a single post to Dev.to. Called in a client-side loop
 * with 31s delays. Same logic as the single-post route but returns
 * status/title for the bulk UI.
 *
 * POST { slug: string }
 */
export async function POST(request: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const { slug: rawSlug } = await request.json();
    if (!rawSlug) {
      return NextResponse.json({ error: "No slug provided" }, { status: 400 });
    }
    const slug = sanitizeSlug(rawSlug);

    const apiKey = process.env.DEVTO_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "DEVTO_API_KEY not configured." },
        { status: 500 }
      );
    }

    const raw = await readFile(`content/posts/${slug}.mdx`);
    if (!raw) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const { data: meta, content } = matter(raw);

    if (meta.devtoUrl) {
      return NextResponse.json({
        status: "skipped",
        title: meta.title,
        devtoUrl: meta.devtoUrl,
      });
    }

    if (!meta.published) {
      return NextResponse.json({
        status: "skipped",
        title: meta.title,
        error: "Post is not published",
      });
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
          // Dev.to tags: max 4, alphanumeric only, no hyphens.
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
      return NextResponse.json(
        { error: `Dev.to ${devtoRes.status}: ${err}` },
        { status: 502 }
      );
    }

    const devtoData = await devtoRes.json();
    const devtoUrl = devtoData.url;

    // Update the post frontmatter with the Dev.to URL.
    if (devtoUrl) {
      const updatedMeta = { ...meta, devtoUrl };
      const updatedRaw = matter.stringify(content, updatedMeta);
      await commitFile(
        `content/posts/${slug}.mdx`,
        updatedRaw,
        `syndicate: add Dev.to URL to "${meta.title}"`
      );
    }

    return NextResponse.json({
      status: "published",
      title: meta.title,
      devtoUrl,
      devtoId: devtoData.id,
    });
  } catch (error) {
    console.error("Bulk syndication error:", error);
    return NextResponse.json(
      { error: "Syndication failed" },
      { status: 500 }
    );
  }
}
