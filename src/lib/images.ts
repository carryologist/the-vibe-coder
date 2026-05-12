// Server-only helpers for browsing image directories in the content repo.
//
// We talk to GitHub's Contents API directly rather than reading the local
// `public/images/` tree, because in production the local tree is a build-time
// snapshot (the prebuild script clones the content repo). Reading from
// GitHub gives us the *current* state and survives the serverless filesystem.
//
// Path validation lives here too so the API route and the page render share
// the same notion of "is this a safe image path?"

import {
  ImageDirectory,
  ImageFile,
  isImageFilename,
} from "./image-types";
import { getAllPostsAdmin } from "./posts";

const GITHUB_API = "https://api.github.com";
const FETCH_TIMEOUT_MS = 15_000;

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
// slug verbatim. Three-tier match, in order:
//   1. exact:    directory slug === post slug
//   2. prefix:   directory slug + "-" is a prefix of a post slug
//                (e.g. `day-four` matches `day-four-rss-analytics-...`)
//   3. content:  the string `/images/<slug>/` appears in some post body
//                (catches the case where the dir was renamed/repurposed)
// A directory that matches none of the above is "orphaned" — surfaced
// at the top of the list so an admin can delete or rename it.
// ----------------------------------------------------------------------

interface PostInfo {
  slug: string;
  title: string;
  published: boolean;
  content: string;
}

function matchPost(
  dirSlug: string,
  posts: PostInfo[]
): { post: PostInfo; kind: "exact" | "prefix" | "content" } | null {
  const exact = posts.find((p) => p.slug === dirSlug);
  if (exact) return { post: exact, kind: "exact" };

  const prefixMatch = posts.find((p) => p.slug.startsWith(dirSlug + "-"));
  if (prefixMatch) return { post: prefixMatch, kind: "prefix" };

  const needle = `/images/${dirSlug}/`;
  const contentMatch = posts.find((p) => p.content.includes(needle));
  if (contentMatch) return { post: contentMatch, kind: "content" };

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
 * Hydrate the post-slug index used for orphan detection. Wrapped so a
 * missing content directory (e.g. fresh local dev without content cloned)
 * is tolerated rather than crashing the admin page.
 */
function safePostIndex(): PostInfo[] {
  try {
    return getAllPostsAdmin().map((p) => ({
      slug: p.slug,
      title: p.title,
      published: p.published,
      content: p.content,
    }));
  } catch {
    return [];
  }
}

/** List every image directory under public/images/ with orphan flagging. */
export async function listImageDirectories(): Promise<ImageDirectory[]> {
  const [topLevel, posts] = await Promise.all([
    listGitHubDirectory("public/images"),
    Promise.resolve(safePostIndex()),
  ]);

  const dirs = topLevel.filter((e) => e.type === "dir");

  const results = await Promise.all(
    dirs.map(async (dir): Promise<ImageDirectory> => {
      const entries = await listGitHubDirectory(dir.path);
      const files = entriesToImageFiles(dir.name, entries);
      const match = matchPost(dir.name, posts);
      return {
        slug: dir.name,
        postTitle: match?.post.title ?? null,
        postPublished: match?.post.published ?? null,
        matchKind: match?.kind ?? "none",
        orphaned: match === null,
        fileCount: files.length,
        totalSize: files.reduce((acc, f) => acc + f.size, 0),
        files,
      };
    })
  );

  return results.sort((a, b) => {
    // Orphans float to the top so they're easy to find.
    if (a.orphaned !== b.orphaned) return a.orphaned ? -1 : 1;
    return a.slug.localeCompare(b.slug);
  });
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
  const files = entriesToImageFiles(slug, entries);
  const match = matchPost(slug, posts);

  return {
    slug,
    postTitle: match?.post.title ?? null,
    postPublished: match?.post.published ?? null,
    matchKind: match?.kind ?? "none",
    orphaned: match === null,
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
//   - requires exactly two segments after the prefix (slug + filename)
//   - requires both segments to be non-empty
//   - slug must be safe for the GitHub URL path (no slashes, dots)
// ----------------------------------------------------------------------

export function isValidImageRepoPath(repoPath: string): boolean {
  if (!repoPath || typeof repoPath !== "string") return false;
  if (repoPath.includes("..")) return false;
  if (!repoPath.startsWith("public/images/")) return false;
  const rest = repoPath.slice("public/images/".length);
  const parts = rest.split("/");
  if (parts.length !== 2) return false;
  const [slug, file] = parts;
  if (!isValidSlug(slug)) return false;
  if (!file || file.includes("\\") || file.startsWith(".")) return false;
  return true;
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
