import { NextRequest, NextResponse } from "next/server";
import matter from "gray-matter";
import { commitFile, commitFileRaw, deleteFile, readFile } from "@/lib/github";

function sanitizeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Fix frontmatter dates with the wrong year. If the date's year is
 * more than one year behind the current server year, replace it with
 * the current year. Catches the common AI-authored "2025" mistake.
 */
function fixDateYear(content: string): string {
  const parsed = matter(content);
  if (!parsed.data.date) return content;

  const postDate = new Date(parsed.data.date);
  const now = new Date();
  if (now.getFullYear() - postDate.getFullYear() >= 1) {
    const corrected = parsed.data.date.replace(
      /^\d{4}/,
      String(now.getFullYear())
    );
    parsed.data.date = corrected;
    return matter.stringify(parsed.content, parsed.data);
  }
  return content;
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
    const fixedContent = fixDateYear(content);
    const sha = await commitFile(path, fixedContent, `post: add "${safeSlug}"`);

    return NextResponse.json({ success: true, sha, path });
  } catch (error) {
    console.error("Publish error:", error);
    return NextResponse.json(
      { error: "Failed to publish post" },
      { status: 500 }
    );
  }
}

// Generate a short changelog summary by diffing old and new content.
function generateDiffSummary(oldContent: string, newContent: string): string {
  const oldLines = oldContent.split("\n");
  const newLines = newContent.split("\n");
  const maxLen = Math.max(oldLines.length, newLines.length);

  let changed = 0;
  for (let i = 0; i < maxLen; i++) {
    if (oldLines[i] !== newLines[i]) changed++;
  }

  if (changed === 0) return "No changes";
  if (changed <= 3) return "Minor text edits";
  if (changed <= 10) return `Edited ${changed} lines`;
  return `Revised post content (${changed} lines changed)`;
}

// Update an existing post.
export async function PUT(request: NextRequest) {
  try {
    const { slug, content, summary, autoSummary } = await request.json() as {
      slug: string;
      content: string;
      summary?: string;
      autoSummary?: boolean;
    };

    if (!slug || !content) {
      return NextResponse.json(
        { error: "slug and content are required" },
        { status: 400 }
      );
    }

    const safeSlug = sanitizeSlug(slug);
    const path = `content/posts/${safeSlug}.mdx`;

    // Resolve the changelog summary: use explicit summary, auto-generate
    // from a diff, or skip the changelog entirely.
    let effectiveSummary = summary;
    if (!effectiveSummary && autoSummary) {
      const existing = await readFile(path);
      effectiveSummary = existing
        ? generateDiffSummary(existing, content)
        : "Initial content";
    }

    let finalContent = content;

    // Auto-correct stale year in frontmatter dates.
    finalContent = fixDateYear(finalContent);

    // When we have a summary, add a changelog entry to the frontmatter
    // before committing.
    if (effectiveSummary) {
      const parsed = matter(content);
      const changelog = Array.isArray(parsed.data.changelog)
        ? parsed.data.changelog
        : [];
      changelog.unshift({
        date: new Date().toISOString().split("T")[0],
        summary: effectiveSummary,
      });
      parsed.data.changelog = changelog;
      finalContent = matter.stringify(parsed.content, parsed.data);
    }

    const sha = await commitFile(path, finalContent, `post: update "${safeSlug}"`);

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
