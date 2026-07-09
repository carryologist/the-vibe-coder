import fs from "fs";
import path from "path";
import matter from "gray-matter";

const POSTS_DIR = path.join(process.cwd(), "content/posts");

/**
 * Tag entry returned by the list API and consumed by the admin UI.
 */
export interface TagInfo {
  name: string;
  count: number;
  /** Slugs of posts that carry this tag. */
  slugs: string[];
}

/**
 * Read every .mdx file (published and draft), extract the `tags` frontmatter
 * field, and return a map of tag → { count, slugs }.
 */
export function getAllTagsWithPosts(): TagInfo[] {
  if (!fs.existsSync(POSTS_DIR)) return [];

  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".mdx"));

  const tagMap = new Map<string, TagInfo>();

  for (const filename of files) {
    const slug = filename.replace(/\.mdx$/, "");
    const filePath = path.join(POSTS_DIR, filename);
    const raw = fs.readFileSync(filePath, "utf-8");
    const { data } = matter(raw);
    const tags = (data.tags ?? []) as string[];

    for (const tag of tags) {
      const existing = tagMap.get(tag);
      if (existing) {
        existing.count += 1;
        existing.slugs.push(slug);
      } else {
        tagMap.set(tag, { name: tag, count: 1, slugs: [slug] });
      }
    }
  }

  return Array.from(tagMap.values()).sort((a, b) => b.count - a.count);
}

/**
 * Rename `oldTag` to `newTag` across all posts that reference it.
 * Returns the list of affected slugs.
 */
export function renameTag(oldTag: string, newTag: string): string[] {
  if (!fs.existsSync(POSTS_DIR)) return [];

  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".mdx"));
  const affected: string[] = [];

  for (const filename of files) {
    const slug = filename.replace(/\.mdx$/, "");
    const filePath = path.join(POSTS_DIR, filename);
    const raw = fs.readFileSync(filePath, "utf-8");
    const { data, content } = matter(raw);

    const tags = (data.tags ?? []) as string[];
    if (!tags.includes(oldTag)) continue;

    const updatedTags = tags.map((t) => (t === oldTag ? newTag : t));
    const newData = { ...data, tags: updatedTags };
    const rewritten = matter.stringify(content, newData);
    fs.writeFileSync(filePath, rewritten, "utf-8");
    affected.push(slug);
  }

  return affected;
}

/**
 * Remove `tag` from every post that references it.
 * Returns the list of affected slugs.
 */
export function removeTag(tag: string): string[] {
  if (!fs.existsSync(POSTS_DIR)) return [];

  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".mdx"));
  const affected: string[] = [];

  for (const filename of files) {
    const slug = filename.replace(/\.mdx$/, "");
    const filePath = path.join(POSTS_DIR, filename);
    const raw = fs.readFileSync(filePath, "utf-8");
    const { data, content } = matter(raw);

    const tags = (data.tags ?? []) as string[];
    const filtered = tags.filter((t) => t !== tag);
    if (filtered.length === tags.length) continue;

    const newData = { ...data, tags: filtered };
    const rewritten = matter.stringify(content, newData);
    fs.writeFileSync(filePath, rewritten, "utf-8");
    affected.push(slug);
  }

  return affected;
}
