import { NextRequest, NextResponse } from "next/server";
import { commitFile } from "@/lib/github";
import {
  getAllPostSources,
  removeTagFromContent,
  renameTagInContent,
} from "@/lib/tags";

type Params = { params: Promise<{ tag: string }> };

/** Rename a tag across every post that uses it. Body: { newTag: string }. */
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { tag } = await params;
    const from = decodeURIComponent(tag).trim();

    const body = (await request.json().catch(() => ({}))) as {
      newTag?: unknown;
    };
    const to = typeof body.newTag === "string" ? body.newTag.trim() : "";

    if (!from || !to) {
      return NextResponse.json(
        { error: "both the existing tag and a non-empty newTag are required" },
        { status: 400 },
      );
    }

    if (from === to) {
      return NextResponse.json({ success: true, from, to, updated: [] });
    }

    const sources = await getAllPostSources();
    const updated: string[] = [];

    for (const source of sources) {
      const next = renameTagInContent(source.raw, from, to);
      if (next && next !== source.raw) {
        await commitFile(
          source.path,
          next,
          `tags: rename "${from}" → "${to}" in ${source.slug}`,
        );
        updated.push(source.slug);
      }
    }

    return NextResponse.json({ success: true, from, to, updated });
  } catch (error) {
    console.error("Tag rename error:", error);
    return NextResponse.json(
      { error: "Failed to rename tag" },
      { status: 500 },
    );
  }
}

/** Remove a tag from every post that uses it. */
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { tag } = await params;
    const name = decodeURIComponent(tag).trim();

    if (!name) {
      return NextResponse.json(
        { error: "a non-empty tag is required" },
        { status: 400 },
      );
    }

    const sources = await getAllPostSources();
    const updated: string[] = [];

    for (const source of sources) {
      const next = removeTagFromContent(source.raw, name);
      if (next && next !== source.raw) {
        await commitFile(
          source.path,
          next,
          `tags: remove "${name}" from ${source.slug}`,
        );
        updated.push(source.slug);
      }
    }

    return NextResponse.json({ success: true, tag: name, updated });
  } catch (error) {
    console.error("Tag delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete tag" },
      { status: 500 },
    );
  }
}
