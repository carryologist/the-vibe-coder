import { NextRequest, NextResponse } from "next/server";
import { commitFile } from "@/lib/github";

export async function POST(request: NextRequest) {
  try {
    const { slug, content } = await request.json();

    if (!slug || !content) {
      return NextResponse.json(
        { error: "slug and content are required" },
        { status: 400 }
      );
    }

    // Sanitize slug.
    const safeSlug = slug
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    const path = `content/posts/${safeSlug}.mdx`;
    const commitMessage = `post: add "${safeSlug}"`;

    const sha = await commitFile(path, content, commitMessage);

    return NextResponse.json({ success: true, sha, path });
  } catch (error) {
    console.error("Publish error:", error);
    return NextResponse.json(
      { error: "Failed to publish post" },
      { status: 500 }
    );
  }
}
