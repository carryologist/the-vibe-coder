import { NextRequest, NextResponse } from "next/server";
import { commitFileRaw } from "@/lib/github";

function sanitizeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[\/\\]/g, "")
    .replace(/\.\./g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const slug = formData.get("slug") as string;
    const file = formData.get("image") as File;

    if (!slug || !file) {
      return NextResponse.json(
        { error: "slug and image are required" },
        { status: 400 }
      );
    }

    const safeSlug = sanitizeSlug(slug);
    const safeName = sanitizeFilename(file.name);
    const imagePath = `public/images/${safeSlug}/${safeName}`;

    // Convert file to base64.
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    await commitFileRaw(
      imagePath,
      base64,
      `image: add "${safeName}" to "${safeSlug}"`
    );

    // Return the public URL path (without "public" prefix).
    const publicPath = `/images/${safeSlug}/${safeName}`;

    return NextResponse.json({
      success: true,
      path: publicPath,
      markdown: `![${safeName}](${publicPath})`,
    });
  } catch (error) {
    console.error("Image upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 }
    );
  }
}
