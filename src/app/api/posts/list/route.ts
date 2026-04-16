import { NextResponse } from "next/server";
import { getAllPosts } from "@/lib/posts";

export async function GET() {
  const posts = getAllPosts();
  const list = posts.map(({ slug, title, date }) => ({ slug, title, date }));
  return NextResponse.json(list);
}
