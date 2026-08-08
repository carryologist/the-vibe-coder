import { NextRequest, NextResponse } from "next/server";
import { commitFileRaw, deleteFile } from "@/lib/github";
import { isValidImageRepoPath } from "@/lib/images";
import { sanitizeSlug } from "@/lib/slug";
import { requireAdmin } from "@/lib/require-admin";
import { validateImageUpload } from "@/lib/image-upload";

function sanitizeFilename(name: string): string {
  return name
    .replace(/[\/\\]/g, "")
    .replace(/\.\./g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function POST(request: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

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
    if (!safeSlug) {
      return NextResponse.json(
        { error: "slug must contain at least one letter or digit" },
        { status: 400 }
      );
    }
    const safeName = sanitizeFilename(file.name);

    // Anything committed under public/ is served from this origin, so
    // an .html or .svg upload would be stored XSS. There was also no
    // size cap, so an arbitrarily large blob went into the content repo
    // permanently.
    const check = validateImageUpload({
      filename: safeName,
      byteLength: file.size,
      mimeType: file.type,
    });
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: 400 });
    }

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
 *
 *   { "path": "public/images/<slug>/<file>" }                — single
 *   { "paths": ["public/images/<slug>/<f1>", "<...>"] }       — batch
 *
 * Batched deletes are useful when wiping an entire orphaned directory.
 * Every path is validated by `isValidImageRepoPath` before any side
 * effect. A batched request rejects up front on any bad path (we don't
 * want to half-delete a directory because of a typo in one entry).
 *
 * Each delete is committed independently. When some entries fail the
 * response is `207 Multi-Status` with a per-path `results` array, so the
 * client can render partial-success state instead of an all-or-nothing
 * error.
 */
export async function DELETE(request: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json(
      { error: "body must be an object" },
      { status: 400 }
    );
  }

  const record = body as Record<string, unknown>;
  let paths: string[];

  if (Array.isArray(record.paths)) {
    if (!record.paths.every((p): p is string => typeof p === "string")) {
      return NextResponse.json(
        { error: "paths must be an array of strings" },
        { status: 400 }
      );
    }
    paths = record.paths;
  } else if (typeof record.path === "string") {
    paths = [record.path];
  } else {
    return NextResponse.json(
      { error: "request must include `path: string` or `paths: string[]`" },
      { status: 400 }
    );
  }

  if (paths.length === 0) {
    return NextResponse.json(
      { error: "at least one path is required" },
      { status: 400 }
    );
  }

  // Validate the whole batch before doing anything destructive.
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
    } catch (err) {
      // The underlying error can embed a verbatim GitHub API response body.
      // Keep it in the server log and return a generic message instead.
      console.error(`Image delete failed for ${p}:`, err);
      results.push({ path: p, ok: false, error: "delete failed" });
    }
  }

  const allOk = results.every((r) => r.ok);
  return NextResponse.json(
    { success: allOk, results },
    { status: allOk ? 200 : 207 }
  );
}
