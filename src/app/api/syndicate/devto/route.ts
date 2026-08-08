import { NextRequest, NextResponse } from "next/server";
import matter from "gray-matter";
import { readFile, updateFile } from "@/lib/github";
import { sanitizeSlug } from "@/lib/slug";
import { requireAdmin } from "@/lib/require-admin";

export async function POST(request: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const { slug: rawSlug } = await request.json();
    if (!rawSlug) {
      return NextResponse.json({ error: "No slug provided" }, { status: 400 });
    }
    const slug = sanitizeSlug(rawSlug);
    if (!slug) {
      return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
    }

    const apiKey = process.env.DEVTO_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Dev.to API key not configured. Set DEVTO_API_KEY environment variable." },
        { status: 500 }
      );
    }

    // Read the post from GitHub.
    const raw = await readFile(`content/posts/${slug}.mdx`);
    if (!raw) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const { data: meta, content } = matter(raw);

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
        { error: `Dev.to API error: ${devtoRes.status} ${err}` },
        { status: 502 }
      );
    }

    const devtoData = await devtoRes.json();
    const devtoUrl = devtoData.url;

    // Update the post frontmatter with the Dev.to URL.
    //
    // Re-read and re-apply rather than committing the copy we parsed
    // before the Dev.to call: the article is already live at this
    // point, so failing (or clobbering a concurrent edit) is worse than
    // merging the one field we own into whatever the file says now.
    if (devtoUrl) {
      await updateFile(
        `content/posts/${slug}.mdx`,
        `syndicate: add Dev.to URL to "${meta.title}"`,
        (currentRaw) => {
          const parsed = matter(currentRaw);
          return matter.stringify(parsed.content, {
            ...parsed.data,
            devtoUrl,
          });
        }
      );
    }

    return NextResponse.json({
      success: true,
      devtoUrl,
      devtoId: devtoData.id,
    });
  } catch (error) {
    console.error("Dev.to syndication error:", error);
    return NextResponse.json(
      { error: "Syndication failed" },
      { status: 500 }
    );
  }
}
