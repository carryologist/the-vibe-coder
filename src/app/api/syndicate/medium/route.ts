import { NextRequest, NextResponse } from "next/server";
import matter from "gray-matter";
import { readFile, commitFile } from "@/lib/github";

export async function POST(request: NextRequest) {
  try {
    const { slug } = await request.json();
    if (!slug) {
      return NextResponse.json({ error: "No slug provided" }, { status: 400 });
    }

    const token = process.env.MEDIUM_TOKEN;
    const userId = process.env.MEDIUM_USER_ID;
    if (!token || !userId) {
      return NextResponse.json(
        { error: "Medium credentials not configured. Set MEDIUM_TOKEN and MEDIUM_USER_ID environment variables." },
        { status: 500 }
      );
    }

    // Read the post from GitHub
    const raw = await readFile(`content/posts/${slug}.mdx`);
    if (!raw) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const { data: meta, content } = matter(raw);

    // Publish to Medium as draft
    const mediumRes = await fetch(`https://api.medium.com/v1/users/${userId}/posts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: meta.title,
        contentFormat: "markdown",
        content: `# ${meta.title}\n\n${content}`,
        canonicalUrl: `https://vibescoder.dev/posts/${slug}`,
        tags: (meta.tags || []).slice(0, 5), // Medium allows max 5 tags
        publishStatus: "draft",
      }),
    });

    if (!mediumRes.ok) {
      const err = await mediumRes.text();
      return NextResponse.json(
        { error: `Medium API error: ${mediumRes.status} ${err}` },
        { status: 502 }
      );
    }

    const mediumData = await mediumRes.json();
    const mediumUrl = mediumData.data?.url;

    // Update the post frontmatter with the Medium URL
    if (mediumUrl) {
      const updatedMeta = { ...meta, mediumUrl };
      const updatedRaw = matter.stringify(content, updatedMeta);
      await commitFile(
        `content/posts/${slug}.mdx`,
        updatedRaw,
        `syndicate: add Medium URL to "${meta.title}"`
      );
    }

    return NextResponse.json({
      success: true,
      mediumUrl,
      mediumId: mediumData.data?.id,
    });
  } catch (error) {
    console.error("Medium syndication error:", error);
    return NextResponse.json(
      { error: "Syndication failed" },
      { status: 500 }
    );
  }
}
