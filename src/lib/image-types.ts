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
  /**
   * How we matched the directory to a post, or to a static reference:
   *   - exact/prefix/content: matched a post (see images.ts for the tiers)
   *   - static: referenced by hardcoded `/images/...` string literals in
   *     the app's own `.tsx` source (favicons, About page headshot, etc)
   *     rather than by any post
   *   - none: no match by any rule
   */
  matchKind: "exact" | "prefix" | "content" | "static" | "none";
  /** True when no post or static reference matches this directory by any rule. */
  orphaned: boolean;
  fileCount: number;
  totalSize: number;
  files: ImageFile[];
}

/**
 * A file that lives directly under `public/images/` with no per-post slug
 * subdirectory of its own (e.g. a stray upload, or a shared branding asset
 * living at the top level rather than inside `branding/`). These were
 * previously invisible to orphan detection entirely — `listImageDirectories`
 * only ever looked at subdirectories. Surfaced separately from
 * `ImageDirectory` because "orphaned" here is a per-file property, not a
 * per-directory one.
 */
export interface LooseImageFile extends ImageFile {
  /** How this specific file was matched — see `ImageDirectory.matchKind`. */
  matchKind: "content" | "static" | "none";
  /** True when nothing references this file by any rule. */
  orphaned: boolean;
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
