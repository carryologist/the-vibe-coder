// Server-only helpers for managing tags across the content repo.
//
// Listing reads the local `content/posts/` tree with gray-matter (same
// approach as `getAllPostsAdmin` in `lib/posts.ts`) since that's already
// fetched at build time. Rename/delete mutate posts through the GitHub
// Contents API (`lib/github.ts`) — the same path every other admin write
// uses — because the production filesystem is a read-only build-time
// snapshot.

import matter from "gray-matter";
import { getAllPostsAdmin } from "./posts";
import { readFile, commitFile } from "./github";

export interface TagInfo {
  tag: string;
  count: number;
  slugs: string[];
}

/** List every tag in use across published and draft posts, with counts. */
export function getAllTagsAdmin(): TagInfo[] {
  const posts = getAllPostsAdmin();
  const byTag = new Map<string, TagInfo>();

  for (const post of posts) {
    for (const tag of post.tags ?? []) {
      const existing = byTag.get(tag);
      if (existing) {
        existing.count += 1;
        existing.slugs.push(post.slug);
      } else {
        byTag.set(tag, { tag, count: 1, slugs: [post.slug] });
      }
    }
  }

  return Array.from(byTag.values()).sort((a, b) => a.tag.localeCompare(b.tag));
}

export interface TagMutationResult {
  updated: string[];
  skipped: string[];
}

/**
 * Rename a tag across every post that uses it. Reads each post fresh from
 * GitHub before writing so we never clobber a concurrent edit with a stale
 * build-time snapshot.
 */
export async function renameTagAcrossPosts(
  oldTag: string,
  newTag: string
): Promise<TagMutationResult> {
  const trimmedNew = newTag.trim();
  if (!trimmedNew) {
    throw new Error("New tag name cannot be empty");
  }

  const info = getAllTagsAdmin().find((t) => t.tag === oldTag);
  const updated: string[] = [];
  const skipped: string[] = [];

  if (!info) return { updated, skipped };

  for (const slug of info.slugs) {
    const path = `content/posts/${slug}.mdx`;
    const raw = await readFile(path);
    if (!raw) {
      skipped.push(slug);
      continue;
    }

    const parsed = matter(raw);
    const tags: string[] = Array.isArray(parsed.data.tags)
      ? parsed.data.tags
      : [];

    if (!tags.includes(oldTag)) {
      skipped.push(slug);
      continue;
    }

    const nextTags = Array.from(
      new Set(tags.map((t) => (t === oldTag ? trimmedNew : t)))
    );
    parsed.data.tags = nextTags;

    const newContent = matter.stringify(parsed.content, parsed.data);
    await commitFile(
      path,
      newContent,
      `tags: rename "${oldTag}" to "${trimmedNew}" in "${slug}"`
    );
    updated.push(slug);
  }

  return { updated, skipped };
}

/** Remove a tag from every post that uses it. */
export async function deleteTagAcrossPosts(
  tag: string
): Promise<TagMutationResult> {
  const info = getAllTagsAdmin().find((t) => t.tag === tag);
  const updated: string[] = [];
  const skipped: string[] = [];

  if (!info) return { updated, skipped };

  for (const slug of info.slugs) {
    const path = `content/posts/${slug}.mdx`;
    const raw = await readFile(path);
    if (!raw) {
      skipped.push(slug);
      continue;
    }

    const parsed = matter(raw);
    const tags: string[] = Array.isArray(parsed.data.tags)
      ? parsed.data.tags
      : [];

    if (!tags.includes(tag)) {
      skipped.push(slug);
      continue;
    }

    parsed.data.tags = tags.filter((t) => t !== tag);

    const newContent = matter.stringify(parsed.content, parsed.data);
    await commitFile(
      path,
      newContent,
      `tags: remove "${tag}" from "${slug}"`
    );
    updated.push(slug);
  }

  return { updated, skipped };
}
