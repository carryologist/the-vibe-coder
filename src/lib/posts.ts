import fs from "fs";
import path from "path";
import matter from "gray-matter";
import readingTime from "reading-time";
import { cache } from "react";
import { Post, PostMeta } from "./types";
import { isSafeSlug } from "./slug";

const POSTS_DIR = path.join(process.cwd(), "content/posts");

/**
 * Coerce a frontmatter date to a YYYY-MM-DD string.
 * gray-matter auto-casts unquoted YAML dates to Date objects;
 * this normalizes them so downstream code always sees a string.
 */
function normalizeDate(raw: unknown): string {
  if (raw instanceof Date) return raw.toISOString().split("T")[0];
  return String(raw);
}

// React.cache dedupes calls within a single server render pass so that
// the homepage and the sitemap (or any other parallel callers) only
// hit the filesystem once per request. The wrapped functions are
// otherwise unchanged.
export const getAllPosts = cache(_getAllPosts);
export const getPostBySlug = cache(_getPostBySlug);
export const getAllTags = cache(_getAllTags);

function _getAllPosts(): Post[] {
  if (!fs.existsSync(POSTS_DIR)) {
    return [];
  }

  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".mdx"));

  const posts = files
    .map((filename): Post | null => {
      const slug = filename.replace(/\.mdx$/, "");
      const filePath = path.join(POSTS_DIR, filename);
      const raw = fs.readFileSync(filePath, "utf-8");
      const { data, content } = matter(raw);
      const meta = data as PostMeta;

      if (!meta.published) {
        return null;
      }

      // Don't surface posts with a future date on public pages
      if (new Date(meta.date) > new Date()) {
        return null;
      }

      const dateStr = normalizeDate(data.date);
      return {
        slug,
        content,
        readingTime: readingTime(content).text,
        ...meta,
        date: dateStr,
        type: meta.type ?? 'how-to',
      };
    })
    .filter((post): post is Post => post !== null);

  return posts.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

export function getAllPostsAdmin(): (Post & { published: boolean; publishAt?: string })[] {
  if (!fs.existsSync(POSTS_DIR)) {
    return [];
  }

  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".mdx"));

  const posts = files
    .map((filename) => {
      const slug = filename.replace(/\.mdx$/, "");
      const filePath = path.join(POSTS_DIR, filename);
      const raw = fs.readFileSync(filePath, "utf-8");
      const { data, content } = matter(raw);
      const meta = data as PostMeta;

      const dateStr = normalizeDate(data.date);
      return {
        slug,
        content,
        readingTime: readingTime(content).text,
        ...meta,
        date: dateStr,
        type: meta.type ?? 'how-to',
        published: meta.published !== false,
        publishAt: meta.publishAt,
      };
    });

  return posts.sort((a, b) => {
    const aTime = new Date(a.publishAt ?? a.date).getTime();
    const bTime = new Date(b.publishAt ?? b.date).getTime();
    return bTime - aTime;
  });
}

function _getPostBySlug(slug: string): Post | null {
  // Route params reach here unvalidated; reject anything that isn't a
  // plain slug so no caller can steer the join outside content/posts.
  if (!isSafeSlug(slug)) {
    return null;
  }

  const filePath = path.join(POSTS_DIR, `${slug}.mdx`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);
  const meta = data as PostMeta;

  if (!meta.published) {
    return null;
  }

  // Don't surface posts with a future date on public pages
  if (new Date(meta.date) > new Date()) {
    return null;
  }

  const dateStr = normalizeDate(data.date);
  return {
    slug,
    content,
    readingTime: readingTime(content).text,
    ...meta,
    date: dateStr,
    type: meta.type ?? 'how-to',
  };
}

/** Like getPostBySlug but includes unpublished drafts. Admin-only. */
export function getPostBySlugAdmin(slug: string): (Post & { published: boolean }) | null {
  if (!isSafeSlug(slug)) {
    return null;
  }

  const filePath = path.join(POSTS_DIR, `${slug}.mdx`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);
  const meta = data as PostMeta;

  const dateStr = normalizeDate(data.date);
  return {
    slug,
    content,
    readingTime: readingTime(content).text,
    ...meta,
    date: dateStr,
    type: meta.type ?? 'how-to',
    published: meta.published !== false,
  };
}

function _getAllTags(): string[] {
  const posts = getAllPosts();
  const tagSet = new Set<string>();

  for (const post of posts) {
    for (const tag of post.tags) {
      tagSet.add(tag);
    }
  }

  return Array.from(tagSet).sort();
}
