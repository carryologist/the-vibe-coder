import { NextResponse } from "next/server";
import { getAllTagsWithCounts } from "@/lib/tags";

// Hit the GitHub API for the current state of the content repo on every
// request rather than serving a stale build-time snapshot.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tags = await getAllTagsWithCounts();
    return NextResponse.json({ tags });
  } catch (error) {
    console.error("Tags list error:", error);
    return NextResponse.json(
      { error: "Failed to list tags" },
      { status: 500 },
    );
  }
}
