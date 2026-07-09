import matter from "gray-matter";
import { readFile, commitFile } from "./github";

const POSTS_PATH = "content/posts/";

export interface TagInfo {
  tag: string;
  count: number;
}

/**
 * Return a deduplicated list of all tags used across published and draft posts,
 * with per-tag post counts.
 */
export async function getAllTagsWithCount(): Promise<TagInfo[]> {
  const tagMap = new Map<string, number>();

  // List all posts by reading the directory listing from GitHub.
  // We fetch the raw posts directory content.
  const repo = process.env.GITHUB_REPO || "";
  const token = process.env.GITHUB_TOKEN || "";

  if (!token || !repo) {
    return [];
  }

  const url = `https://api.github.com/repos/${repo}/contents/${POSTS_PATH}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    cache: "no-store",
  });

  if (!res.ok) return [];

  const items = (await res.json()) as Array<{ name: string; type: string }>;
  const mdxFiles = items.filter((f) => f.type === "file" && f.name.endsWith(".mdx"));

  for (const file of mdxFiles) {
    const filePath = `${POSTS_PATH}${file.name}`;
    const content = await readFile(filePath);
    if (!content) continue;

    const { data } = matter(content);
    const tags = (data.tags as string[]) ?? [];
    for (const tag of tags) {
      tagMap.set(tag, (tagMap.get(tag) ?? 0) + 1);
    }
  }

  return Array.from(tagMap.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/**
 * Rename a tag across all posts that use it.
 * Returns the number of posts updated.
 */
export async function renameTag(oldTag: string, newTag: string): Promise<number> {
  const repo = process.env.GITHUB_REPO || "";
  const token = process.env.GITHUB_TOKEN || "";

  if (!token || !repo) return 0;

  const url = `https://api.github.com/repos/${repo}/contents/${POSTS_PATH}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    cache: "no-store",
  });

  if (!res.ok) return 0;

  const items = (await res.json()) as Array<{ name: string; type: string; sha: string; path: string }>;
  const mdxFiles = items.filter((f) => f.type === "file" && f.name.endsWith(".mdx"));

  let updated = 0;

  for (const file of mdxFiles) {
    const filePath = `content/posts/${file.name}`;
    const content = await readFile(filePath);
    if (!content) continue;

    const parsed = matter(content);
    const tags = (parsed.data.tags as string[]) ?? [];
    const index = tags.indexOf(oldTag);
    if (index === -1) continue;

    tags[index] = newTag;
    parsed.data.tags = tags;

    const newContent = matter.stringify(parsed.content, parsed.data);
    await commitFile(
      filePath,
      newContent,
      `post: rename tag "${oldTag}" → "${newTag}" in ${file.name}`
    );
    updated++;
  }

  return updated;
}

/**
 * Remove a tag from all posts that use it.
 * Returns the number of posts updated.
 */
export async function removeTag(tag: string): Promise<number> {
  const repo = process.env.GITHUB_REPO || "";
  const token = process.env.GITHUB_TOKEN || "";

  if (!token || !repo) return 0;

  const url = `https://api.github.com/repos/${repo}/contents/${POSTS_PATH}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    cache: "no-store",
  });

  if (!res.ok) return 0;

  const items = (await res.json()) as Array<{ name: string; type: string; sha: string; path: string }>;
  const mdxFiles = items.filter((f) => f.type === "file" && f.name.endsWith(".mdx"));

  let updated = 0;

  for (const file of mdxFiles) {
    const filePath = `content/posts/${file.name}`;
    const content = await readFile(filePath);
    if (!content) continue;

    const parsed = matter(content);
    const tags = (parsed.data.tags as string[]) ?? [];
    const filteredTags = tags.filter((t) => t !== tag);
    if (filteredTags.length === tags.length) continue;

    parsed.data.tags = filteredTags;
    const newContent = matter.stringify(parsed.content, parsed.data);
    await commitFile(
      filePath,
      newContent,
      `post: remove tag "${tag}" from ${file.name}`
    );
    updated++;
  }

  return updated;
}
