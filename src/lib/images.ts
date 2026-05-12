import fs from "node:fs";
import path from "node:path";
import { getAllPostsAdmin } from "./posts";
import type { ImageDirectory, ImageFile } from "./images-shared";

export type { ImageDirectory, ImageFile } from "./images-shared";
export { formatBytes } from "./images-shared";

const IMAGES_DIR = path.join(process.cwd(), "public", "images");

// Extensions we consider previewable images. Anything else still gets
// listed (so admins can clean it up) but rendered as a filename row.
const IMAGE_EXTS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".avif",
  ".svg",
]);

function safeSlug(slug: string): string {
  // Defense in depth — directory names should already be sanitized by
  // the upload route, but anything containing slashes or .. is rejected
  // outright so we cannot escape public/images.
  if (!slug || slug.includes("/") || slug.includes("\\") || slug.includes("..")) {
    return "";
  }
  return slug;
}

function readDirectory(slug: string): ImageFile[] {
  const dir = path.join(IMAGES_DIR, slug);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    return [];
  }

  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const full = path.join(dir, entry.name);
      const stat = fs.statSync(full);
      const ext = path.extname(entry.name).toLowerCase();
      return {
        name: entry.name,
        publicPath: `/images/${slug}/${entry.name}`,
        repoPath: `public/images/${slug}/${entry.name}`,
        size: stat.size,
        isImage: IMAGE_EXTS.has(ext),
      } satisfies ImageFile;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function buildSlugMap(): Map<string, { title: string; published: boolean }> {
  const map = new Map<string, { title: string; published: boolean }>();
  for (const post of getAllPostsAdmin()) {
    map.set(post.slug, { title: post.title, published: post.published });
  }
  return map;
}

/** List every image directory under public/images/. */
export function listImageDirectories(): ImageDirectory[] {
  if (!fs.existsSync(IMAGES_DIR)) return [];
  const postsBySlug = buildSlugMap();

  return fs
    .readdirSync(IMAGES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const slug = entry.name;
      const files = readDirectory(slug);
      const totalSize = files.reduce((sum, f) => sum + f.size, 0);
      const post = postsBySlug.get(slug) ?? null;
      return {
        slug,
        postTitle: post?.title ?? null,
        postPublished: post?.published ?? null,
        orphaned: post === null,
        fileCount: files.length,
        totalSize,
        files,
      } satisfies ImageDirectory;
    })
    .sort((a, b) => {
      // Orphans first so they're easy to find, then alphabetical.
      if (a.orphaned !== b.orphaned) return a.orphaned ? -1 : 1;
      return a.slug.localeCompare(b.slug);
    });
}

/** Get a single directory by slug, or null if it doesn't exist. */
export function getImageDirectory(slug: string): ImageDirectory | null {
  const safe = safeSlug(slug);
  if (!safe) return null;
  const dir = path.join(IMAGES_DIR, safe);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return null;

  const postsBySlug = buildSlugMap();
  const post = postsBySlug.get(safe) ?? null;
  const files = readDirectory(safe);
  return {
    slug: safe,
    postTitle: post?.title ?? null,
    postPublished: post?.published ?? null,
    orphaned: post === null,
    fileCount: files.length,
    totalSize: files.reduce((sum, f) => sum + f.size, 0),
    files,
  };
}

/** Validate a repo path looks like public/images/<slug>/<file>. */
export function isValidImageRepoPath(repoPath: string): boolean {
  if (!repoPath) return false;
  if (repoPath.includes("..")) return false;
  if (!repoPath.startsWith("public/images/")) return false;
  const rest = repoPath.slice("public/images/".length);
  // Must have a slug segment AND a filename segment.
  const parts = rest.split("/");
  if (parts.length !== 2) return false;
  if (!parts[0] || !parts[1]) return false;
  return true;
}
