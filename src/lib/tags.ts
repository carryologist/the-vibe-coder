// Server-only helpers for reading and rewriting post tags.
//
// Like lib/images.ts, this talks to the GitHub Contents API directly
// rather than reading the local content/posts tree. In production the
// local tree is a build-time snapshot (the prebuild script clones the
// content repo), so reading from GitHub gives the *current* state and
// lets tag edits reflect without waiting for a redeploy.
//
// Frontmatter parsing and serialization go through gray-matter, matching
// how the rest of the engine (lib/posts.ts, the posts API) handles MDX.

import matter from "gray-matter";
import { listDirectory } from "./github-list";
import { readFile } from "./github";

const POSTS_DIR = "content/posts";

export interface TagCount {
  tag: string;
  count: number;
}

export interface PostSource {
  slug: string;
  path: string;
  raw: string;
}

/** Pull the `tags` array out of parsed frontmatter, tolerating a missing
 * or malformed field by returning an empty list. */
function extractTags(data: Record<string, unknown>): string[] {
  const tags = data.tags;
  if (!Array.isArray(tags)) return [];
  return tags.filter((t): t is string => typeof t === "string");
}

/**
 * Fetch the raw MDX source of every post — published and drafts alike —
 * from the content repo on GitHub. Drafts are included because tag
 * hygiene should span the whole corpus, not just what's live.
 */
export async function getAllPostSources(): Promise<PostSource[]> {
  const entries = await listDirectory(POSTS_DIR);
  if (!entries) return [];

  const files = entries.filter(
    (e) => e.type === "file" && e.name.endsWith(".mdx"),
  );

  const sources = await Promise.all(
    files.map(async (f): Promise<PostSource | null> => {
      const raw = await readFile(f.path);
      if (raw === null) return null;
      return { slug: f.name.replace(/\.mdx$/, ""), path: f.path, raw };
    }),
  );

  return sources.filter((s): s is PostSource => s !== null);
}

/**
 * Every tag used across published and draft posts, with the number of
 * posts using each. Sorted alphabetically for stable rendering.
 */
export async function getAllTagsWithCounts(): Promise<TagCount[]> {
  const sources = await getAllPostSources();
  const counts = new Map<string, number>();

  for (const { raw } of sources) {
    const { data } = matter(raw);
    for (const tag of extractTags(data)) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => a.tag.localeCompare(b.tag));
}

/**
 * Rename a tag within a single post's raw MDX. Returns the updated
 * content, or null when the post doesn't use `from` (so callers can skip
 * committing an unchanged file). If `to` already exists on the post, the
 * old tag is dropped rather than producing a duplicate.
 */
export function renameTagInContent(
  raw: string,
  from: string,
  to: string,
): string | null {
  const parsed = matter(raw);
  const tags = extractTags(parsed.data);
  if (!tags.includes(from)) return null;

  const next: string[] = [];
  for (const t of tags) {
    const mapped = t === from ? to : t;
    if (!next.includes(mapped)) next.push(mapped);
  }

  parsed.data.tags = next;
  return matter.stringify(parsed.content, parsed.data);
}

/**
 * Remove a tag from a single post's raw MDX. Returns the updated content,
 * or null when the post doesn't use the tag.
 */
export function removeTagFromContent(raw: string, tag: string): string | null {
  const parsed = matter(raw);
  const tags = extractTags(parsed.data);
  if (!tags.includes(tag)) return null;

  parsed.data.tags = tags.filter((t) => t !== tag);
  return matter.stringify(parsed.content, parsed.data);
}
