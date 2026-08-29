import { NextRequest, NextResponse } from "next/server";
import { getAllTagsWithCounts } from "@/lib/tags";

export async function GET(request: NextRequest) {
  try {
    const tags = getAllTagsWithCounts();

    return NextResponse.json(tags);
  } catch (error) {
    console.error("Error fetching tags:", error);
    return NextResponse.json(
      { error: "Failed to fetch tags" },
      { status: 500 }
    );
  }
}
