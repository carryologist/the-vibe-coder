import { NextRequest, NextResponse } from "next/server";
import { deleteFile } from "@/lib/github";

// DELETE /api/images/delete
// Body: { path: string } — full path like "public/images/day-five/IMG_9136.png"
export async function DELETE(request: NextRequest) {
  try {
    const body: unknown = await request.json();

    if (
      typeof body !== "object" ||
      body === null ||
      !("path" in body) ||
      typeof (body as Record<string, unknown>).path !== "string"
    ) {
      return NextResponse.json(
        { error: "path is required and must be a string" },
        { status: 400 }
      );
    }

    const filePath = (body as Record<string, string>).path;

    // Validate path: must start with public/images/ and must not contain ..
    if (!filePath.startsWith("public/images/") || filePath.includes("..")) {
      return NextResponse.json(
        { error: "Invalid path: must start with public/images/ and not contain .." },
        { status: 400 }
      );
    }

    const commitSha = await deleteFile(
      filePath,
      `image: delete "${filePath.split("/").pop()}"`
    );

    return NextResponse.json({ success: true, commitSha });
  } catch (error) {
    console.error("Image delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete image" },
      { status: 500 }
    );
  }
}
