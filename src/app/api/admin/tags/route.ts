import { NextResponse } from "next/server";
import { getAllTagsWithCount } from "@/lib/tags";

export async function GET() {
  try {
    const tags = await getAllTagsWithCount();
    return NextResponse.json({ tags });
  } catch (error) {
    console.error("Tags API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tags" },
      { status: 500 }
    );
  }
}
