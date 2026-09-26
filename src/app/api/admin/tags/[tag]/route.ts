import { NextRequest, NextResponse } from "next/server";
import { renameTag, deleteTag } from "@/lib/tags";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tag: string }> }
) {
  try {
    const { tag } = await params;
    const body = await request.json();
    const { newTag } = body;

    if (!newTag) {
      return NextResponse.json(
        { error: "newTag is required" },
        { status: 400 }
      );
    }

    const result = await renameTag(tag, newTag);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      changedPosts: result.changedPosts,
    });
  } catch (error) {
    console.error("Error renaming tag:", error);
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

    const result = await deleteTag(tag);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      changedPosts: result.changedPosts,
    });
  } catch (error) {
    console.error("Error deleting tag:", error);
    return NextResponse.json(
      { error: "Failed to delete tag" },
      { status: 500 }
    );
  }
}
