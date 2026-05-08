import { NextRequest, NextResponse } from "next/server";
import matter from "gray-matter";
import { readFile, commitFile } from "@/lib/github";

/**
 * Bulk syndication — single-item operations called in a client-side loop.
 *
 * Two actions:
 * - POST { action: "create", slug } — Read post, publish to Dev.to, return URL.
 * - POST { action: "save", slug, devtoUrl } — Write devtoUrl into frontmatter.
 *
 * Split into two calls so each stays under Vercel Hobby's 10s timeout.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // --- CREATE: read post + publish to Dev.to ---
    if (body.action === "create") {
      const { slug } = body;
      if (!slug) {
        return NextResponse.json({ error: "No slug provided" }, { status: 400 });
      }

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
            published_at: meta.date ? `${meta.date}T12:00:00Z` : undefined,
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
      return NextResponse.json({
        status: "published",
        title: meta.title,
        devtoUrl: devtoData.url,
        devtoId: devtoData.id,
      });
    }

    // --- SAVE: write devtoUrl back into frontmatter ---
    if (body.action === "save") {
      const { slug, devtoUrl } = body;
      if (!slug || !devtoUrl) {
        return NextResponse.json(
          { error: "slug and devtoUrl are required" },
          { status: 400 }
        );
      }

      const raw = await readFile(`content/posts/${slug}.mdx`);
      if (!raw) {
        return NextResponse.json({ error: "Post not found" }, { status: 404 });
      }

      const { data: meta, content } = matter(raw);
      const updatedMeta = { ...meta, devtoUrl };
      const updatedRaw = matter.stringify(content, updatedMeta);
      await commitFile(
        `content/posts/${slug}.mdx`,
        updatedRaw,
        `syndicate: add Dev.to URL to "${meta.title}"`
      );

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: "Invalid action. Use 'create' or 'save'." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Bulk syndication error:", error);
    return NextResponse.json(
      { error: "Syndication failed" },
      { status: 500 }
    );
  }
}
