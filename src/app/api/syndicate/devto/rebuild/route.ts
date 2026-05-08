import { NextRequest, NextResponse } from "next/server";
import matter from "gray-matter";
import { readFile, commitFile } from "@/lib/github";

/**
 * Rebuild Dev.to articles — delete and recreate with correct published_at.
 *
 * Three actions, all single-item so the client drives the loop:
 *
 * - POST { action: "list" }
 *   Returns all Dev.to articles for this account.
 *
 * - POST { action: "delete", articleId: number }
 *   Unpublishes a single Dev.to article (Dev.to doesn't support true delete
 *   via API, but setting published=false + clearing body effectively removes it).
 *
 * - POST { action: "create", slug: string }
 *   Creates a new Dev.to article from the content repo with correct published_at.
 *   Returns the new devtoUrl and devtoId.
 */
export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.DEVTO_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Dev.to API key not configured." },
        { status: 500 }
      );
    }

    const body = await request.json();

    // --- LIST: return all articles ---
    if (body.action === "list") {
      const res = await fetch("https://dev.to/api/articles/me/all?per_page=100", {
        headers: { "api-key": apiKey },
      });
      if (!res.ok) {
        const err = await res.text();
        return NextResponse.json(
          { error: `Dev.to ${res.status}: ${err}` },
          { status: 502 }
        );
      }
      const articles = await res.json();

      const items = articles.map((a: { id: number; title: string; canonical_url: string | null; published_at: string | null }) => {
        const slug = a.canonical_url?.split("/").pop() || "";
        return {
          articleId: a.id,
          title: a.title,
          slug,
          publishedAt: a.published_at,
        };
      });

      return NextResponse.json({ articles: items });
    }

    // --- DELETE: unpublish a single article ---
    if (body.action === "delete") {
      const { articleId } = body;
      if (!articleId) {
        return NextResponse.json({ error: "articleId is required" }, { status: 400 });
      }

      // Dev.to API doesn't have a DELETE endpoint for articles.
      // Best we can do: unpublish and blank the body.
      const res = await fetch(`https://dev.to/api/articles/${articleId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "api-key": apiKey,
        },
        body: JSON.stringify({
          article: {
            published: false,
            title: `[deleted] ${articleId}`,
            body_markdown: "This article has been removed.",
          },
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        return NextResponse.json(
          { error: `Dev.to ${res.status}: ${err}` },
          { status: 502 }
        );
      }

      return NextResponse.json({ success: true });
    }

    // --- CREATE: publish a new article with correct date ---
    if (body.action === "create") {
      const { slug } = body;
      if (!slug) {
        return NextResponse.json({ error: "slug is required" }, { status: 400 });
      }

      const raw = await readFile(`content/posts/${slug}.mdx`);
      if (!raw) {
        return NextResponse.json({ error: "Post not found" }, { status: 404 });
      }

      const { data: meta, content } = matter(raw);

      const res = await fetch("https://dev.to/api/articles", {
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

      if (!res.ok) {
        const err = await res.text();
        return NextResponse.json(
          { error: `Dev.to ${res.status}: ${err}` },
          { status: 502 }
        );
      }

      const data = await res.json();
      const devtoUrl = data.url;

      // Write new devtoUrl back into frontmatter.
      if (devtoUrl) {
        const updatedMeta = { ...meta, devtoUrl };
        const updatedRaw = matter.stringify(content, updatedMeta);
        await commitFile(
          `content/posts/${slug}.mdx`,
          updatedRaw,
          `syndicate: update Dev.to URL for "${meta.title}"`
        );
      }

      return NextResponse.json({
        success: true,
        devtoUrl,
        devtoId: data.id,
      });
    }

    return NextResponse.json({ error: "Invalid action. Use list, delete, or create." }, { status: 400 });
  } catch (error) {
    console.error("Rebuild error:", error);
    return NextResponse.json({ error: "Rebuild failed" }, { status: 500 });
  }
}
