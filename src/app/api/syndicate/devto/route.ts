import { NextRequest, NextResponse } from "next/server";
import matter from "gray-matter";
import { readFile, commitFile } from "@/lib/github";

export async function POST(request: NextRequest) {
  try {
    const { slug } = await request.json();
    if (!slug) {
      return NextResponse.json({ error: "No slug provided" }, { status: 400 });
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

    // Publish to Dev.to as draft.
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
          tags: (meta.tags || []).slice(0, 4), // Dev.to allows max 4 tags
          published: false, // Draft mode
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
