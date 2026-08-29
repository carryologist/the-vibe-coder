import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { PostMeta } from "./types";

const POSTS_DIR = path.join(process.cwd(), "content/posts");

/**
 * Get all tags from published and draft posts with counts
 */
export function getAllTagsWithCounts(): Array<{ tag: string; count: number }> {
  if (!fs.existsSync(POSTS_DIR)) {
    return [];
  }

  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".mdx"));
  const tagCounts = new Map<string, number>();

  for (const file of files) {
    const filePath = path.join(POSTS_DIR, file);
    const raw = fs.readFileSync(filePath, "utf-8");
    const { data } = matter(raw);
    const meta = data as PostMeta;

    // Count tags regardless of published status
    if (Array.isArray(meta.tags)) {
      for (const tag of meta.tags) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
    }
  }

  return Array.from(tagCounts.entries()).map(([tag, count]) => ({
    tag,
    count,
  }));
}

/**
 * Rename a tag across all posts
 */
export async function renameTag(
  oldTag: string,
  newTag: string
): Promise<{ success: boolean; changedPosts: number; error?: string }> {
  if (!fs.existsSync(POSTS_DIR)) {
    return {
      success: false,
      changedPosts: 0,
      error: "Posts directory not found",
    };
  }

  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".mdx"));
  let changedPosts = 0;

  try {
    for (const file of files) {
      const filePath = path.join(POSTS_DIR, file);
      const raw = fs.readFileSync(filePath, "utf-8");
      const { data, content } = matter(raw);
      const meta = data as PostMeta;

      // Skip if no tags or tag not found
      if (!Array.isArray(meta.tags) || !meta.tags.includes(oldTag)) {
        continue;
      }

      // Update the tag
      const updatedTags = meta.tags.map((tag) =>
        tag === oldTag ? newTag : tag
      );

      // Rewrite the file
      const updatedMatter = matter.stringify(content, {
        ...meta,
        tags: updatedTags,
      });

      fs.writeFileSync(filePath, updatedMatter, "utf-8");
      changedPosts++;
    }

    return { success: true, changedPosts };
  } catch (error) {
    console.error("Error renaming tag:", error);
    return {
      success: false,
      changedPosts: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Remove a tag from all posts
 */
export async function deleteTag(tag: string): Promise<{
  success: boolean;
  changedPosts: number;
  error?: string;
}> {
  if (!fs.existsSync(POSTS_DIR)) {
    return {
      success: false,
      changedPosts: 0,
      error: "Posts directory not found",
    };
  }

  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".mdx"));
  let changedPosts = 0;

  try {
    for (const file of files) {
      const filePath = path.join(POSTS_DIR, file);
      const raw = fs.readFileSync(filePath, "utf-8");
      const { data, content } = matter(raw);
      const meta = data as PostMeta;

      // Skip if no tags or tag not found
      if (!Array.isArray(meta.tags) || !meta.tags.includes(tag)) {
        continue;
      }

      // Remove the tag
      const updatedTags = meta.tags.filter((t) => t !== tag);

      // Rewrite the file
      const updatedMatter = matter.stringify(content, {
        ...meta,
        tags: updatedTags,
      });

      fs.writeFileSync(filePath, updatedMatter, "utf-8");
      changedPosts++;
    }

    return { success: true, changedPosts };
  } catch (error) {
    console.error("Error deleting tag:", error);
    return {
      success: false,
      changedPosts: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
