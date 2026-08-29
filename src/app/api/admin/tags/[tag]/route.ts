import { NextRequest, NextResponse } from "next/server";
import { renameTag, removeTag } from "@/lib/tags";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tag: string }> }
) {
  try {
    const { tag } = await params;
    const oldTag = decodeURIComponent(tag);

    const body = await request.json();
    const newTag = body.tag;

    if (!newTag || typeof newTag !== "string") {
      return NextResponse.json(
        { error: "tag is required" },
        { status: 400 }
      );
    }

    const updated = await renameTag(oldTag, newTag);
    return NextResponse.json({ success: true, updated });
  } catch (error) {
    console.error("Rename tag error:", error);
    return NextResponse.json(
      { error: "Failed to rename tag" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tag: string }> }
) {
  try {
    const { tag } = await params;
    const tagName = decodeURIComponent(tag);

    const updated = await removeTag(tagName);
    return NextResponse.json({ success: true, updated });
  } catch (error) {
    console.error("Remove tag error:", error);
    return NextResponse.json(
      { error: "Failed to remove tag" },
      { status: 500 }
    );
  }
}
