// Server-only helpers for the admin tag manager.
//
// Reads use gray-matter over the local `content/posts/` tree (published
// AND draft posts — unlike lib/posts.getAllTags, which is public-facing
// and only sees published posts). Writes go through the GitHub Contents
// API like every other admin mutation, because the local tree is a
// read-only build-time snapshot in production.

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { commitFile, readFile } from "./github";
import { listDirectory } from "./github-list";

const POSTS_DIR = path.join(process.cwd(), "content/posts");

export interface TagInfo {
  tag: string;
  count: number;
  publishedCount: number;
  draftCount: number;
}

function tagsFrom(data: Record<string, unknown>): string[] {
  const tags = data.tags;
  if (!Array.isArray(tags)) return [];
  return tags.filter((t): t is string => typeof t === "string");
}

/**
 * Read every tag used by any post — published or draft — with per-tag
 * post counts. Reads the local content tree with gray-matter.
 */
export function getAllTagsAdmin(): TagInfo[] {
  if (!fs.existsSync(POSTS_DIR)) {
    return [];
  }

  const byTag = new Map<string, TagInfo>();

  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".mdx"));
  for (const filename of files) {
    const raw = fs.readFileSync(path.join(POSTS_DIR, filename), "utf-8");
    const { data } = matter(raw);
    const published = data.published !== false;

    for (const tag of tagsFrom(data)) {
      const info = byTag.get(tag) ?? {
        tag,
        count: 0,
        publishedCount: 0,
        draftCount: 0,
      };
      info.count += 1;
      if (published) info.publishedCount += 1;
      else info.draftCount += 1;
      byTag.set(tag, info);
    }
  }

  return Array.from(byTag.values()).sort((a, b) =>
    a.tag.localeCompare(b.tag),
  );
}

/**
 * List every post file in the content repo (current state, via the
 * GitHub Contents API — not the build-time snapshot).
 */
async function listPostPaths(): Promise<string[]> {
  const entries = await listDirectory("content/posts");
  if (!entries) {
    throw new Error("Could not list content/posts in the content repo");
  }
  return entries
    .filter((e) => e.type === "file" && e.name.endsWith(".mdx"))
    .map((e) => e.path);
}

export interface TagMutationResult {
  /** Slugs of the posts that were modified and committed. */
  updated: string[];
}

/**
 * Rename `oldTag` to `newTag` in every post that uses it. If a post
 * already carries `newTag`, the rename dedupes instead of duplicating.
 * Each affected post is committed individually to the content repo.
 */
export async function renameTag(
  oldTag: string,
  newTag: string,
): Promise<TagMutationResult> {
  return mutateTag(oldTag, (tags) => {
    const next: string[] = [];
    for (const t of tags) {
      const mapped = t === oldTag ? newTag : t;
      if (!next.includes(mapped)) next.push(mapped);
    }
    return next;
  }, `tags: rename "${oldTag}" to "${newTag}"`);
}

/**
 * Remove `tag` from every post that uses it. Each affected post is
 * committed individually to the content repo.
 */
export async function deleteTag(tag: string): Promise<TagMutationResult> {
  return mutateTag(
    tag,
    (tags) => tags.filter((t) => t !== tag),
    `tags: remove "${tag}"`,
  );
}

async function mutateTag(
  tag: string,
  transform: (tags: string[]) => string[],
  message: string,
): Promise<TagMutationResult> {
  const paths = await listPostPaths();
  const updated: string[] = [];

  for (const repoPath of paths) {
    const raw = await readFile(repoPath);
    if (raw === null) continue;

    const parsed = matter(raw);
    const tags = tagsFrom(parsed.data);
    if (!tags.includes(tag)) continue;

    parsed.data.tags = transform(tags);
    const next = matter.stringify(parsed.content, parsed.data);

    const slug = path.basename(repoPath, ".mdx");
    await commitFile(repoPath, next, `${message} in "${slug}"`);
    updated.push(slug);
  }

  return { updated };
}
