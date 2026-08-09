import { NextRequest, NextResponse } from "next/server";
import matter from "gray-matter";
import {
  commitFile,
  commitFileRaw,
  deleteFile,
  readFileWithSha,
  GitHubConflictError,
} from "@/lib/github";
import { sanitizeSlug } from "@/lib/slug";
import { requireAdmin } from "@/lib/require-admin";
import { validateImageUpload, base64ByteLength } from "@/lib/image-upload";

/**
 * Frontmatter dates come back from gray-matter either as a string (when
 * quoted in YAML) or as a Date (when not). Normalise to YYYY-MM-DD.
 */
function frontmatterDateString(value: unknown): string | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? null
      : value.toISOString().split("T")[0];
  }
  if (typeof value === "string") return value;
  return null;
}

/**
 * Fix frontmatter dates with the wrong year. If the date's year is
 * more than one year behind the current server year, replace it with
 * the current year. Catches the common AI-authored "2025" mistake.
 *
 * An unquoted YAML date parses to a Date, which has no .replace, so the
 * previous implementation threw a TypeError here and the caller saw an
 * opaque 500 for any post with a stale unquoted date.
 */
function fixDateYear(content: string): string {
  const parsed = matter(content);
  const dateString = frontmatterDateString(parsed.data.date);
  if (!dateString) return content;

  const postDate = new Date(dateString);
  if (Number.isNaN(postDate.getTime())) return content;

  const now = new Date();
  if (now.getFullYear() - postDate.getFullYear() >= 1) {
    const corrected = dateString.replace(/^\d{4}/, String(now.getFullYear()));
    parsed.data.date = corrected;
    return matter.stringify(parsed.content, parsed.data);
  }
  return content;
}

/**
 * When a draft is published (published: false → true transition),
 * update the frontmatter date to today so the post appears with
 * the date it actually went live — not the date it was drafted.
 */
function stampPublishDate(oldContent: string | null, newContent: string): string {
  const oldParsed = oldContent ? matter(oldContent) : null;
  const newParsed = matter(newContent);

  const wasDraft = oldParsed ? oldParsed.data.published === false : false;
  const isNowPublished = newParsed.data.published === true;

  if (wasDraft && isNowPublished) {
    const today = new Date().toISOString().split("T")[0];
    newParsed.data.date = today;
    return matter.stringify(newParsed.content, newParsed.data);
  }
  return newContent;
}

// Create a new post, optionally with images.
export async function POST(request: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

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
    if (!safeSlug) {
      // sanitizeSlug strips every disallowed character, so inputs like
      // "..." or "!!!" collapse to "" and would produce the dotfile
      // path content/posts/.mdx.
      return NextResponse.json(
        { error: "slug must contain at least one letter or digit" },
        { status: 400 }
      );
    }

    // Reject a colliding slug before writing anything. The image commits
    // below are unconditional upserts, so running them first would clobber
    // the existing post's images even though the post commit is then
    // rejected as a create-only conflict.
    const path = `content/posts/${safeSlug}.mdx`;
    const existing = await readFileWithSha(path);
    if (existing) {
      return NextResponse.json(
        { error: "A post with that slug already exists." },
        { status: 409 }
      );
    }

    // Commit images first.
    for (const image of images) {
      // Strip path separators and dangerous characters to prevent
      // path traversal attacks (e.g., "../../src/middleware.ts").
      const safeName = image.name
        .replace(/[\/\\]/g, "")
        .replace(/\.\./g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "_");

      const check = validateImageUpload({
        filename: safeName,
        byteLength: base64ByteLength(image.base64),
      });
      if (!check.ok) {
        return NextResponse.json(
          { error: `${image.name}: ${check.error}` },
          { status: 400 }
        );
      }

      const imagePath = `public/images/${safeSlug}/${safeName}`;
      await commitFileRaw(
        imagePath,
        image.base64,
        `post: add image "${image.name}" for "${safeSlug}"`
      );
    }

    // Commit the post MDX file. expectedSha: null makes this a create,
    // not an upsert: without it, publishing a draft whose slug collapses
    // to an existing one ("My Post!", "my/post" and "my--post" all
    // sanitise to "my-post") silently overwrote the live post. The
    // pre-check above catches the common case; this closes the race.
    const fixedContent = fixDateYear(content);
    const sha = await commitFile(path, fixedContent, `post: add "${safeSlug}"`, {
      expectedSha: null,
    });

    return NextResponse.json({ success: true, sha, path });
  } catch (error) {
    if (error instanceof GitHubConflictError) {
      return NextResponse.json(
        { error: "A post with that slug already exists." },
        { status: 409 }
      );
    }
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
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const { slug, content, summary, autoSummary, sha: expectedSha } =
      (await request.json()) as {
        slug: string;
        content: string;
        summary?: string;
        autoSummary?: boolean;
        /**
         * Blob SHA the client read before editing. Sent by the admin
         * UI so a concurrent edit is rejected rather than silently
         * overwritten. Omitted by older clients, which keeps the
         * previous last-write-wins behaviour for them.
         */
        sha?: string;
      };

    if (!slug || !content) {
      return NextResponse.json(
        { error: "slug and content are required" },
        { status: 400 }
      );
    }

    const safeSlug = sanitizeSlug(slug);
    if (!safeSlug) {
      return NextResponse.json(
        { error: "slug must contain at least one letter or digit" },
        { status: 400 }
      );
    }
    const path = `content/posts/${safeSlug}.mdx`;

    // Resolve the changelog summary: use explicit summary, auto-generate
    // from a diff, or skip the changelog entirely.
    let effectiveSummary = summary;

    let finalContent = content;

    // Auto-correct stale year in frontmatter dates.
    finalContent = fixDateYear(finalContent);

    // Read the existing file so we can detect draft → published transitions
    // and (optionally) auto-generate changelog summaries.
    const current = await readFileWithSha(path);
    const existing = current?.content ?? null;

    // Reject a stale edit outright rather than reading the current file
    // again at write time, which always wins and silently discards
    // whatever the other writer committed.
    if (expectedSha && current && expectedSha !== current.sha) {
      return NextResponse.json(
        {
          error:
            "This post changed since you opened it. Reload to pick up the latest version.",
        },
        { status: 409 }
      );
    }

    // Stamp today's date when publishing a draft.
    finalContent = stampPublishDate(existing, finalContent);

    if (!effectiveSummary && autoSummary) {
      effectiveSummary = existing
        ? generateDiffSummary(existing, finalContent)
        : "Initial content";
    }

    // When we have a summary, add a changelog entry to the frontmatter
    // before committing.
    if (effectiveSummary) {
      const parsed = matter(finalContent);
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

    const sha = await commitFile(
      path,
      finalContent,
      `post: update "${safeSlug}"`,
      { expectedSha: expectedSha ?? current?.sha }
    );

    return NextResponse.json({ success: true, sha, path });
  } catch (error) {
    if (error instanceof GitHubConflictError) {
      return NextResponse.json(
        {
          error:
            "This post changed since you opened it. Reload to pick up the latest version.",
        },
        { status: 409 }
      );
    }
    console.error("Update error:", error);
    return NextResponse.json(
      { error: "Failed to update post" },
      { status: 500 }
    );
  }
}

// Delete a post.
export async function DELETE(request: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const { slug } = await request.json();

    if (!slug) {
      return NextResponse.json(
        { error: "slug is required" },
        { status: 400 }
      );
    }

    const safeSlug = sanitizeSlug(slug);
    if (!safeSlug) {
      return NextResponse.json(
        { error: "slug must contain at least one letter or digit" },
        { status: 400 }
      );
    }
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
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

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
    if (!safeSlug) {
      return NextResponse.json(
        { error: "slug must contain at least one letter or digit" },
        { status: 400 }
      );
    }
    const path = `content/posts/${safeSlug}.mdx`;
    const current = await readFileWithSha(path);

    if (!current) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // The SHA goes back to the client so it can send it with the
    // subsequent PUT as a concurrency precondition.
    return NextResponse.json({
      slug: safeSlug,
      content: current.content,
      sha: current.sha,
    });
  } catch (error) {
    console.error("Read error:", error);
    return NextResponse.json(
      { error: "Failed to read post" },
      { status: 500 }
    );
  }
}
