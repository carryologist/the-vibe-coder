import fs from "fs";
import { NextRequest, NextResponse } from "next/server";
import { renameTag, removeTag } from "@/lib/tags";
import { getSession } from "@/lib/auth";
import { commitFile } from "@/lib/github";

export const dynamic = "force-dynamic";

/**
 * PUT /api/admin/tags/{tag}
 *
 * Rename a tag across all posts that use it.
 * Body: { "name": "new-tag-name" }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tag: string }> }
) {
  const authenticated = await getSession();
  if (!authenticated) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { tag } = await params;
  const oldTag = decodeURIComponent(tag);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json(
      { error: "body must be an object" },
      { status: 400 }
    );
  }

  const record = body as Record<string, unknown>;
  const newName = typeof record.name === "string" ? record.name : null;

  if (!newName) {
    return NextResponse.json(
      { error: "name (string) is required" },
      { status: 400 }
    );
  }

  const affected = renameTag(oldTag, newName);

  // Push updated MDX files back to GitHub.
  const POSTS_DIR = "content/posts";
  for (const slug of affected) {
    const filePath = `${POSTS_DIR}/${slug}.mdx`;
    const content = fs.readFileSync(filePath, "utf-8");
    await commitFile(filePath, content, `tag: rename "${oldTag}" → "${newName}" in ${slug}`);
  }

  return NextResponse.json({ success: true, renamed: affected.length, affected });
}

/**
 * DELETE /api/admin/tags/{tag}
 *
 * Remove a tag from all posts that use it.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ tag: string }> }
) {
  const authenticated = await getSession();
  if (!authenticated) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { tag } = await params;
  const tagName = decodeURIComponent(tag);

  const affected = removeTag(tagName);

  // Push updated MDX files back to GitHub.
  const POSTS_DIR = "content/posts";
  for (const slug of affected) {
    const filePath = `${POSTS_DIR}/${slug}.mdx`;
    const content = fs.readFileSync(filePath, "utf-8");
    await commitFile(filePath, content, `tag: remove "${tagName}" from ${slug}`);
  }

  return NextResponse.json({ success: true, removed: affected.length, affected });
}
