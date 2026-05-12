import { NextRequest, NextResponse } from "next/server";
import { commitFileRaw, deleteFile } from "@/lib/github";
import { isValidImageRepoPath } from "@/lib/images";

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

/**
 * Delete one or more images from the content repo. Accepts either:
 *   { path: "public/images/<slug>/<file>" }                 — single
 *   { paths: ["public/images/<slug>/<f1>", ...] }           — batch
 *
 * Batched deletes are useful when wiping an entire orphaned directory.
 * Each path is validated and committed independently; the response
 * reports per-path success so the caller can show partial failures.
 */
export async function DELETE(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const payload = body as { path?: string; paths?: string[] };
  const paths: string[] = Array.isArray(payload.paths)
    ? payload.paths
    : typeof payload.path === "string"
      ? [payload.path]
      : [];

  if (paths.length === 0) {
    return NextResponse.json(
      { error: "path or paths is required" },
      { status: 400 }
    );
  }

  // Validate all paths first. Reject the whole request on any bad
  // path — we don't want to half-delete a directory because of a typo.
  for (const p of paths) {
    if (!isValidImageRepoPath(p)) {
      return NextResponse.json(
        { error: `invalid image path: ${p}` },
        { status: 400 }
      );
    }
  }

  const results: { path: string; ok: boolean; error?: string }[] = [];
  for (const p of paths) {
    try {
      await deleteFile(p, `image: delete ${p.replace(/^public\//, "")}`);
      results.push({ path: p, ok: true });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "unknown delete error";
      console.error(`Image delete failed for ${p}:`, error);
      results.push({ path: p, ok: false, error: message });
    }
  }

  const allOk = results.every((r) => r.ok);
  return NextResponse.json(
    { success: allOk, results },
    { status: allOk ? 200 : 207 }
  );
}
