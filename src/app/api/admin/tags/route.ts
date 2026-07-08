import { NextResponse } from "next/server";
import { getAllTagsAdmin } from "@/lib/tags";

// Tag counts must reflect the content tree on every request, not a
// build-time snapshot.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tags = getAllTagsAdmin();
    return NextResponse.json({ tags });
  } catch (error) {
    console.error("Tag list error:", error);
    return NextResponse.json(
      { error: "Failed to list tags" },
      { status: 500 }
    );
  }
}
