import { NextRequest, NextResponse } from "next/server";
import { renameTagAcrossPosts, deleteTagAcrossPosts } from "@/lib/tags";

// Update a tag: currently only supports rename via { newTag } in the body.
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tag: string }> }
) {
  try {
    const { tag } = await params;
    const oldTag = decodeURIComponent(tag);
    const { newTag } = (await request.json()) as { newTag?: string };

    if (!newTag || !newTag.trim()) {
      return NextResponse.json(
        { error: "newTag is required" },
        { status: 400 }
      );
    }

    const result = await renameTagAcrossPosts(oldTag, newTag.trim());
    return NextResponse.json({ success: true, ...result });
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
    const { tag } = await params;
    const targetTag = decodeURIComponent(tag);

    const result = await deleteTagAcrossPosts(targetTag);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Tag delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete tag" },
      { status: 500 }
    );
  }
}
