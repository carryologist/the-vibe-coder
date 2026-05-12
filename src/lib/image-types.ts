// Pure types + helpers safely shared between server and client code.
// Anything that touches the filesystem or fetches from GitHub lives in
// src/lib/images.ts instead.

export interface ImageFile {
  /** Filename only — `IMG_9136.png`. */
  name: string;
  /** Public URL path served by Next.js at runtime — `/images/<slug>/<name>`. */
  publicPath: string;
  /** Path used by the GitHub Contents API — `public/images/<slug>/<name>`. */
  repoPath: string;
  /** Size in bytes from the GitHub Contents API. */
  size: number;
  /** SHA from the GitHub Contents API. Stable per-content; useful for keys. */
  sha: string;
  /** True for previewable image extensions (png, jpg, jpeg, gif, webp, avif, svg). */
  isImage: boolean;
}

export interface ImageDirectory {
  /** Directory name under `public/images/`. */
  slug: string;
  /** Title of the post that owns this directory, or null when orphaned. */
  postTitle: string | null;
  /** Whether the matched post is published. Null when no match. */
  postPublished: boolean | null;
  /** How we matched the directory to a post: exact slug, prefix, content reference, or no match. */
  matchKind: "exact" | "prefix" | "content" | "none";
  /** True when no post matches this directory by any rule. */
  orphaned: boolean;
  fileCount: number;
  totalSize: number;
  files: ImageFile[];
}

/** Human-readable byte count: `1.4 MB`, `12.0 KB`, `512 B`. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const IMAGE_EXTS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".avif",
  ".svg",
]);

/** True when the filename has a previewable image extension. */
export function isImageFilename(name: string): boolean {
  const dot = name.lastIndexOf(".");
  if (dot < 0) return false;
  return IMAGE_EXTS.has(name.slice(dot).toLowerCase());
}
