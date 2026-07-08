import { NextRequest, NextResponse } from "next/server";
import { renameTag, deleteTag } from "@/lib/tags";

// Tags are free-form strings in frontmatter, but reject obviously
// broken values (empty after trim) so a stray whitespace tag can't be
// written across every post.
function normalizeTag(raw: string): string | null {
  const tag = raw.trim();
  return tag.length > 0 ? tag : null;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tag: string }> }
) {
  try {
    const { tag: rawTag } = await params;
    const oldTag = normalizeTag(decodeURIComponent(rawTag));
    if (!oldTag) {
      return NextResponse.json({ error: "Invalid tag" }, { status: 400 });
    }

    const body = (await request.json().catch(() => null)) as {
      newTag?: string;
    } | null;
    const newTag = body?.newTag ? normalizeTag(body.newTag) : null;
    if (!newTag) {
      return NextResponse.json(
        { error: "newTag is required" },
        { status: 400 }
      );
    }

    if (newTag === oldTag) {
      return NextResponse.json({ updated: [] });
    }

    const { updated } = await renameTag(oldTag, newTag);
    if (updated.length === 0) {
      return NextResponse.json(
        { error: `No posts use tag "${oldTag}"` },
        { status: 404 }
      );
    }

    return NextResponse.json({ updated });
  } catch (error) {
    console.error("Tag rename error:", error);
    return NextResponse.json(
      { error: "Failed to rename tag" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ tag: string }> }
) {
  try {
    const { tag: rawTag } = await params;
    const tag = normalizeTag(decodeURIComponent(rawTag));
    if (!tag) {
      return NextResponse.json({ error: "Invalid tag" }, { status: 400 });
    }

    const { updated } = await deleteTag(tag);
    if (updated.length === 0) {
      return NextResponse.json(
        { error: `No posts use tag "${tag}"` },
        { status: 404 }
      );
    }

    return NextResponse.json({ updated });
  } catch (error) {
    console.error("Tag delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete tag" },
      { status: 500 }
    );
  }
}
