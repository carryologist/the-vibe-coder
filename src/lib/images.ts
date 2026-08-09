// Server-only helpers for browsing image directories in the content repo.
//
// We talk to GitHub's Contents API directly rather than reading the local
// `public/images/` tree, because in production the local tree is a build-time
// snapshot (the prebuild script clones the content repo). Reading from
// GitHub gives us the *current* state and survives the serverless filesystem.
//
// Path validation lives here too so the API route and the page render share
// the same notion of "is this a safe image path?"

import fs from "fs";
import path from "path";
import {
  ImageDirectory,
  ImageFile,
  LooseImageFile,
  isImageFilename,
} from "./image-types";
import { getAllPostsAdmin } from "./posts";

const GITHUB_API = "https://api.github.com";
const FETCH_TIMEOUT_MS = 15_000;

/** Maximum concurrent GitHub Contents API listings. */
const DIRECTORY_FETCH_CONCURRENCY = 5;

function getConfig() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  if (!token || !repo) {
    throw new Error("GITHUB_TOKEN and GITHUB_REPO must be set");
  }
  return { token, repo };
}

function ghHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

interface GitHubEntry {
  name: string;
  path: string;
  size: number;
  sha: string;
  type: "file" | "dir" | "symlink" | "submodule";
  download_url: string | null;
}

/**
 * Fetch a GitHub Contents API directory listing with an abort timeout.
 * Returns [] on 404 so callers can treat "no images yet" as a normal state.
 */
async function listGitHubDirectory(repoPath: string): Promise<GitHubEntry[]> {
  const { token, repo } = getConfig();
  const url = `${GITHUB_API}/repos/${repo}/contents/${repoPath}?ref=main`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      headers: ghHeaders(token),
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) {
      if (res.status === 404) return [];
      throw new Error(`GitHub API error: ${res.status} ${await res.text()}`);
    }
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data as GitHubEntry[];
  } finally {
    clearTimeout(timer);
  }
}

// ----------------------------------------------------------------------
// Orphan matching.
//
// Image directories often have shortened slugs that don't equal the post
// slug verbatim. Four-tier match, in order:
//   1. exact:    directory slug === post slug
//   2. prefix:   directory slug + "-" is a prefix of a post slug
//                (e.g. `day-four` matches `day-four-rss-analytics-...`)
//   3. content:  the string `/images/<slug>/` appears in some post body
//                (catches the case where the dir was renamed/repurposed)
//   4. static:   a hardcoded `/images/<slug>/...` reference exists in the
//                app's own static .tsx source (see generate-image-references.ts) —
//                catches branding assets, favicons, and other images used
//                by pages rather than posts
// A directory that matches none of the above is "orphaned" — surfaced
// at the top of the list so an admin can delete or rename it.
//
// Loose top-level files (directly under public/images/, no slug
// subdirectory of their own) go through the same content/static checks,
// matched by exact public path rather than by directory prefix — see
// `matchLooseFile` below. They used to be filtered out entirely before
// any of this ran (see `content/TODO.md`, Apr 30 incident).
// ----------------------------------------------------------------------

interface PostInfo {
  slug: string;
  title: string;
  published: boolean;
  content: string;
}

/**
 * Read the build-time manifest of `/images/...` paths referenced directly
 * from static app source (see scripts/generate-image-references.ts).
 *
 * Returns null when the manifest cannot be read (e.g. local `next dev`
 * without having run `npm run prebuild`, or a deploy that stripped it).
 * That is deliberately distinct from an empty manifest: "we do not know
 * what is referenced" must not be treated as "nothing is referenced",
 * which would flag every branding asset as an orphan and offer it for
 * one-click deletion.
 */
function loadStaticImageReferences(): Set<string> | null {
  try {
    const manifestPath = path.join(
      process.cwd(),
      "public",
      "static-image-refs.json"
    );
    const raw = fs.readFileSync(manifestPath, "utf-8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return new Set(parsed.filter((p): p is string => typeof p === "string"));
  } catch {
    return null;
  }
}

function matchPost(
  dirSlug: string,
  posts: PostInfo[],
  staticRefs: Set<string>
): { post: PostInfo; kind: "exact" | "prefix" | "content" } | { post: null; kind: "static" } | null {
  const exact = posts.find((p) => p.slug === dirSlug);
  if (exact) return { post: exact, kind: "exact" };

  const prefixMatch = posts.find((p) => p.slug.startsWith(dirSlug + "-"));
  if (prefixMatch) return { post: prefixMatch, kind: "prefix" };

  const needle = `/images/${dirSlug}/`;
  const contentMatch = posts.find((p) => p.content.includes(needle));
  if (contentMatch) return { post: contentMatch, kind: "content" };

  const staticMatch = Array.from(staticRefs).some((ref) =>
    ref.startsWith(needle)
  );
  if (staticMatch) return { post: null, kind: "static" };

  return null;
}

/** Match a single loose top-level file by exact public path. */
function matchLooseFile(
  publicPath: string,
  posts: PostInfo[],
  staticRefs: Set<string>
): { kind: "content" | "static" } | null {
  if (staticRefs.has(publicPath)) return { kind: "static" };
  if (posts.some((p) => p.content.includes(publicPath))) {
    return { kind: "content" };
  }
  return null;
}

function entriesToImageFiles(
  slug: string,
  entries: GitHubEntry[]
): ImageFile[] {
  return entries
    .filter((e) => e.type === "file")
    .map((e) => ({
      name: e.name,
      publicPath: `/images/${slug}/${e.name}`,
      repoPath: e.path, // e.path is already `public/images/<slug>/<name>`
      size: e.size ?? 0,
      sha: e.sha,
      isImage: isImageFilename(e.name),
    }));
}

/**
 * Hydrate the post-slug index used for orphan detection.
 *
 * Returns null when the content directory cannot be read, for the same
 * reason as loadStaticImageReferences: an empty index would mark every
 * post image as unreferenced.
 */
function safePostIndex(): PostInfo[] | null {
  try {
    return getAllPostsAdmin().map((p) => ({
      slug: p.slug,
      title: p.title,
      published: p.published,
      content: p.content,
    }));
  } catch {
    return null;
  }
}

/**
 * Run `task` over `items` with at most `limit` in flight.
 *
 * The directory listing used to be a bare Promise.all over every image
 * directory, which fans out one GitHub Contents API request per
 * directory with no cap and fails the whole page if any one of them is
 * rate-limited.
 */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await task(items[index]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker)
  );
  return results;
}

/**
 * List every image directory under public/images/ with orphan flagging,
 * plus any loose top-level files that don't live in a slug subdirectory.
 */
export async function listImageDirectories(): Promise<{
  directories: ImageDirectory[];
  looseFiles: LooseImageFile[];
  orphanDetectionAvailable: boolean;
}> {
  const [topLevel, posts] = await Promise.all([
    listGitHubDirectory("public/images"),
    Promise.resolve(safePostIndex()),
  ]);
  const staticRefs = loadStaticImageReferences();

  // Orphan detection needs both reference sources. If either is
  // unavailable, nothing is reported as orphaned: a false orphan is one
  // click away from an irreversible delete on main (see the Apr 30
  // incident referenced above).
  const orphanDetectionAvailable = posts !== null && staticRefs !== null;
  const knownPosts = posts ?? [];
  const knownStaticRefs = staticRefs ?? new Set<string>();

  const dirs = topLevel.filter((e) => e.type === "dir");
  const looseEntries = topLevel.filter((e) => e.type === "file");

  const directories = await mapWithConcurrency(
    dirs,
    DIRECTORY_FETCH_CONCURRENCY,
    async (dir): Promise<ImageDirectory> => {
      const entries = await listGitHubDirectory(dir.path);
      const files = entriesToImageFiles(dir.name, entries);
      const match = matchPost(dir.name, knownPosts, knownStaticRefs);
      return {
        slug: dir.name,
        postTitle: match?.post?.title ?? null,
        postPublished: match?.post?.published ?? null,
        matchKind: match?.kind ?? "none",
        orphaned: orphanDetectionAvailable && match === null,
        orphanDetectionAvailable,
        fileCount: files.length,
        totalSize: files.reduce((acc, f) => acc + f.size, 0),
        files,
      };
    }
  );

  // Loose files live directly under public/images/ (repoPath has exactly
  // one segment after the prefix), so entriesToImageFiles's slug-based
  // publicPath construction doesn't apply here — build it from the root.
  const looseFiles: LooseImageFile[] = looseEntries.map((e) => {
    const publicPath = `/images/${e.name}`;
    const match = matchLooseFile(publicPath, knownPosts, knownStaticRefs);
    return {
      name: e.name,
      publicPath,
      repoPath: e.path,
      size: e.size ?? 0,
      sha: e.sha,
      isImage: isImageFilename(e.name),
      matchKind: match?.kind ?? "none",
      orphaned: orphanDetectionAvailable && match === null,
      orphanDetectionAvailable,
    };
  });

  directories.sort((a, b) => {
    // Orphans float to the top so they're easy to find.
    if (a.orphaned !== b.orphaned) return a.orphaned ? -1 : 1;
    return a.slug.localeCompare(b.slug);
  });
  looseFiles.sort((a, b) => {
    if (a.orphaned !== b.orphaned) return a.orphaned ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return { directories, looseFiles, orphanDetectionAvailable };
}

/** Get a single directory by slug, or null when it doesn't exist. */
export async function getImageDirectory(
  slug: string
): Promise<ImageDirectory | null> {
  if (!isValidSlug(slug)) return null;

  const entries = await listGitHubDirectory(`public/images/${slug}`);
  if (entries.length === 0) {
    // Distinguish "empty dir" from "no such dir" by checking the parent.
    const parent = await listGitHubDirectory("public/images");
    const exists = parent.some((e) => e.type === "dir" && e.name === slug);
    if (!exists) return null;
  }

  const posts = safePostIndex();
  const staticRefs = loadStaticImageReferences();
  const orphanDetectionAvailable = posts !== null && staticRefs !== null;
  const files = entriesToImageFiles(slug, entries);
  const match = matchPost(slug, posts ?? [], staticRefs ?? new Set<string>());

  return {
    slug,
    postTitle: match?.post?.title ?? null,
    postPublished: match?.post?.published ?? null,
    matchKind: match?.kind ?? "none",
    orphaned: orphanDetectionAvailable && match === null,
    orphanDetectionAvailable,
    fileCount: files.length,
    totalSize: files.reduce((acc, f) => acc + f.size, 0),
    files,
  };
}

// ----------------------------------------------------------------------
// Path validation.
//
// Every delete payload routes through here before the GitHub API call.
// Stricter than `startsWith("public/images/")`:
//   - rejects empty strings
//   - rejects ".." anywhere (path-traversal block)
//   - requires one or two segments after the prefix (slug + filename)
//   - requires both segments to be non-empty
//   - slug and filename must both match a strict character allowlist
//
// The filename check used to reject only backslashes and leading dots,
// which let a percent-encoded separator (`%2f`) collapse a two-segment
// path back into a deeper one, defeating the segment-count rule, and
// let `?` or `#` alter or truncate the Contents API request URL. Both
// are closed by the allowlist below; src/lib/github.ts additionally
// encodes each path segment before building the URL.
// ----------------------------------------------------------------------

export function isValidImageRepoPath(repoPath: string): boolean {
  if (!repoPath || typeof repoPath !== "string") return false;
  if (repoPath.includes("..")) return false;
  if (!repoPath.startsWith("public/images/")) return false;
  const rest = repoPath.slice("public/images/".length);
  const parts = rest.split("/");

  // Loose top-level file: `public/images/<file>` — one segment, no slug
  // subdirectory. Valid as a delete target since the admin UI now surfaces
  // these (see `listImageDirectories`'s `looseFiles`).
  if (parts.length === 1) {
    const [file] = parts;
    return isValidFilename(file);
  }

  // Normal case: `public/images/<slug>/<file>`.
  if (parts.length !== 2) return false;
  const [slug, file] = parts;
  if (!isValidSlug(slug)) return false;
  return isValidFilename(file);
}

function isValidFilename(file: string): boolean {
  if (!file) return false;
  return /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(file);
}

function isValidSlug(slug: string): boolean {
  if (!slug) return false;
  if (slug.includes("..") || slug.includes("/") || slug.includes("\\")) {
    return false;
  }
  // GitHub Contents API accepts URL-encoded names but we keep our slugs
  // conservative: lowercase letters, digits, hyphens.
  return /^[a-z0-9][a-z0-9-]*$/.test(slug);
}
