import { NextRequest, NextResponse } from "next/server";
import { deleteFile } from "@/lib/github";
import { listImageDirectories, listDirectory } from "@/lib/github-images";
import { getAllPostsAdmin } from "@/lib/posts";

/**
 * GET /api/images/manage
 * Lists all image directories with metadata and orphan status.
 *
 * Query params:
 *   ?slug=<dir-slug>  — returns files in a specific directory
 *   (no params)       — returns all directories with summary info
 */
export async function GET(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get("slug");

    if (slug) {
      // Return files for a specific directory
      const safePath = `public/images/${slug.replace(/[^a-z0-9-]/gi, "")}`;
      const files = await listDirectory(safePath);
      const imageFiles = files.filter((f) => f.type === "file");

      return NextResponse.json({
        slug,
        files: imageFiles.map((f) => ({
          name: f.name,
          path: f.path,
          size: f.size,
          url: `/images/${slug}/${f.name}`,
          download_url: f.download_url,
        })),
      });
    }

    // Return all directories with summary info
    const [directories, posts] = await Promise.all([
      listImageDirectories(),
      Promise.resolve(getAllPostsAdmin()),
    ]);

    const postSlugs = new Set(posts.map((p) => p.slug));

    /**
     * Match image directories to posts. Image dir slugs are often a prefix
     * of the full post slug (e.g. "day-four" -> "day-four-rss-analytics-...").
     * We check for exact match first, then prefix match, then content reference.
     */
    function findMatchingPost(dirSlug: string) {
      // Exact match
      const exact = posts.find((p) => p.slug === dirSlug);
      if (exact) return exact;
      // Prefix match: dir slug is a prefix of a post slug
      const prefixMatch = posts.find((p) => p.slug.startsWith(dirSlug + "-"));
      if (prefixMatch) return prefixMatch;
      // Content reference: post body references /images/<dirSlug>/
      const contentMatch = posts.find((p) =>
        p.content.includes(`/images/${dirSlug}/`)
      );
      if (contentMatch) return contentMatch;
      return null;
    }

    const result = directories.map((dir) => {
      const match = findMatchingPost(dir.slug);
      return {
        slug: dir.slug,
        fileCount: dir.fileCount,
        totalSize: dir.totalSize,
        hasMatchingPost: match !== null,
        matchingPostTitle: match?.title ?? null,
      };
    });

    return NextResponse.json({
      directories: result,
      totalDirectories: result.length,
      orphanedCount: result.filter((d) => !d.hasMatchingPost).length,
    });
  } catch (error) {
    console.error("Image list error:", error);
    return NextResponse.json(
      { error: "Failed to list images" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/images/manage
 * Deletes an image file or entire directory from the content repo.
 *
 * Body:
 *   { path: string }           — delete a single file
 *   { slug: string, all: true } — delete all files in a directory
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.slug && body.all === true) {
      // Delete entire directory — must delete each file individually
      // (GitHub Contents API doesn't support directory deletion)
      const safePath = `public/images/${(body.slug as string).replace(/[^a-z0-9-]/gi, "")}`;
      const files = await listDirectory(safePath);
      const imageFiles = files.filter((f) => f.type === "file");

      if (imageFiles.length === 0) {
        return NextResponse.json(
          { error: "No files found in directory" },
          { status: 404 }
        );
      }

      const results = [];
      for (const file of imageFiles) {
        const sha = await deleteFile(
          file.path,
          `image: delete "${file.name}" from "${body.slug}"`
        );
        results.push({ file: file.name, sha });
      }

      return NextResponse.json({
        success: true,
        deleted: results.length,
        files: results,
      });
    }

    if (body.path) {
      // Delete a single file
      const filePath = body.path as string;

      // Validate the path is under public/images/
      if (!filePath.startsWith("public/images/")) {
        return NextResponse.json(
          { error: "Invalid path — must be under public/images/" },
          { status: 400 }
        );
      }

      const sha = await deleteFile(
        filePath,
        `image: delete "${filePath.split("/").pop()}"`
      );

      return NextResponse.json({ success: true, sha });
    }

    return NextResponse.json(
      { error: "Provide either { path } or { slug, all: true }" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Image delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete image" },
      { status: 500 }
    );
  }
}
