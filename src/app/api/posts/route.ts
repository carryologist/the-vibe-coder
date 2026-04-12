import { NextRequest, NextResponse } from "next/server";
import { commitFile, commitFileRaw, deleteFile, readFile } from "@/lib/github";

function sanitizeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// Create a new post, optionally with images.
export async function POST(request: NextRequest) {
  try {
    const { slug, content, images = [] } = (await request.json()) as {
      slug: string;
      content: string;
      images?: { name: string; base64: string }[];
    };

    if (!slug || !content) {
      return NextResponse.json(
        { error: "slug and content are required" },
        { status: 400 }
      );
    }

    const safeSlug = sanitizeSlug(slug);

    // Commit images first.
    for (const image of images) {
      // Strip path separators and dangerous characters to prevent
      // path traversal attacks (e.g., "../../src/middleware.ts").
      const safeName = image.name
        .replace(/[\/\\]/g, "")
        .replace(/\.\./g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "_");
      const imagePath = `public/images/${safeSlug}/${safeName}`;
      await commitFileRaw(
        imagePath,
        image.base64,
        `post: add image "${image.name}" for "${safeSlug}"`
      );
    }

    // Commit the post MDX file.
    const path = `content/posts/${safeSlug}.mdx`;
    const sha = await commitFile(path, content, `post: add "${safeSlug}"`);

    return NextResponse.json({ success: true, sha, path });
  } catch (error) {
    console.error("Publish error:", error);
    return NextResponse.json(
      { error: "Failed to publish post" },
      { status: 500 }
    );
  }
}

// Update an existing post.
export async function PUT(request: NextRequest) {
  try {
    const { slug, content } = await request.json();

    if (!slug || !content) {
      return NextResponse.json(
        { error: "slug and content are required" },
        { status: 400 }
      );
    }

    const safeSlug = sanitizeSlug(slug);
    const path = `content/posts/${safeSlug}.mdx`;
    const sha = await commitFile(path, content, `post: update "${safeSlug}"`);

    return NextResponse.json({ success: true, sha, path });
  } catch (error) {
    console.error("Update error:", error);
    return NextResponse.json(
      { error: "Failed to update post" },
      { status: 500 }
    );
  }
}

// Delete a post.
export async function DELETE(request: NextRequest) {
  try {
    const { slug } = await request.json();

    if (!slug) {
      return NextResponse.json(
        { error: "slug is required" },
        { status: 400 }
      );
    }

    const safeSlug = sanitizeSlug(slug);
    const path = `content/posts/${safeSlug}.mdx`;
    const sha = await deleteFile(path, `post: delete "${safeSlug}"`);

    return NextResponse.json({ success: true, sha });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete post" },
      { status: 500 }
    );
  }
}

// Get a post's raw MDX content (for the editor).
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");

    if (!slug) {
      return NextResponse.json(
        { error: "slug query parameter is required" },
        { status: 400 }
      );
    }

    const safeSlug = sanitizeSlug(slug);
    const path = `content/posts/${safeSlug}.mdx`;
    const content = await readFile(path);

    if (!content) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json({ slug: safeSlug, content });
  } catch (error) {
    console.error("Read error:", error);
    return NextResponse.json(
      { error: "Failed to read post" },
      { status: 500 }
    );
  }
}
