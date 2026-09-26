import { NextResponse } from "next/server";
import { getAllTagsWithPosts } from "@/lib/tags";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/tags
 *
 * Returns a JSON list of all tags (from both published and draft posts)
 * with per-tag post counts and the list of post slugs.
 */
export async function GET() {
  const authenticated = await getSession();
  if (!authenticated) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const tags = getAllTagsWithPosts();
  return NextResponse.json(tags);
}
