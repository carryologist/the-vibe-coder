import { NextResponse } from "next/server";
import { getAllTagsAdmin } from "@/lib/tags";

export async function GET() {
  try {
    const tags = getAllTagsAdmin();
    return NextResponse.json({ tags });
  } catch (error) {
    console.error("Tags list error:", error);
    return NextResponse.json(
      { error: "Failed to read tags" },
      { status: 500 }
    );
  }
}
