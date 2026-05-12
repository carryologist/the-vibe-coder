import { NextRequest, NextResponse } from "next/server";
import { deleteFile as deleteFromGithub } from "@/lib/github";
import { getAllImageDirectoriesSync } from "@/lib/imageUtils";
import { getAllPostsAdmin } from "@/lib/posts";

export async function DELETE(request: NextRequest) {
  try {
    const { path, postSlug, isOrphaned } = await request.json();

    if (!path) {
      return NextResponse.json(
        { error: "path is required" },
        { status: 400 }
      );
    }

    // Validate the path is within public/images/
    if (!path.startsWith("public/images/")) {
      return NextResponse.json(
        { error: "Invalid path: must be within public/images/" },
        { status: 400 }
      );
    }

    // If deleting a directory (isOrphaned), first get all files in that directory
    const posts = getAllPostsAdmin();
    const postSlugs = new Set(posts.map((p) => p.slug));
    const imageDirs = getAllImageDirectoriesSync(postSlugs);
    
    // For orphaned directories, we need to delete all files first
    if (isOrphaned === true) {
      const dirName = path.replace("public/images/", "");
      const dirInfo = imageDirs.find((d) => d.name === dirName);
      
      if (dirInfo) {
        // Delete all files in the directory
        for (const file of dirInfo.files) {
          try {
            await deleteFromGithub(`public/images/${dirName}/${file.name}`, `orphaned: delete "${file.name}"`);
          } catch (err) {
            console.error(`Failed to delete ${file.name}:`, err);
            // Continue with other files
          }
        }
      }
      
      return NextResponse.json({ success: true, deleted: path });
    }

    // Single file deletion
    await deleteFromGithub(path, `delete: remove "${path.replace("public/images/", "")}"`);

    return NextResponse.json({ success: true, deleted: path });
  } catch (error) {
    console.error("Image delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete image" },
      { status: 500 }
    );
  }
}
