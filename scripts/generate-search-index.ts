import fs from "fs";
import path from "path";
import { getAllPosts } from "../src/lib/posts";

/**
 * Build-time search index generator.
 *
 * Run via: npx tsx scripts/generate-search-index.ts
 * Called automatically in the prebuild step.
 *
 * Produces public/search-index.json consumed by the client-side
 * SearchModal component (Fuse.js).
 */

/** Strip MDX/markdown syntax so Fuse matches against plain text. */
function stripMarkdown(md: string): string {
  return (
    md
      // Remove code fences and their content
      .replace(/```[\s\S]*?```/g, "")
      // Remove inline code
      .replace(/`[^`]+`/g, "")
      // Remove images/links but keep alt text / label
      .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
      // Remove HTML tags
      .replace(/<[^>]+>/g, "")
      // Remove MDX component tags
      .replace(/<\/?[A-Z]\w*[^>]*>/g, "")
      // Remove heading markers
      .replace(/^#{1,6}\s+/gm, "")
      // Remove bold/italic markers
      .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1")
      // Remove horizontal rules
      .replace(/^[-*_]{3,}\s*$/gm, "")
      // Collapse whitespace
      .replace(/\n{2,}/g, "\n")
      .trim()
  );
}

function generateIndex() {
  const posts = getAllPosts();

  const index = posts.map((post) => ({
    slug: post.slug,
    title: post.title,
    date: post.date,
    description: post.description,
    tags: post.tags,
    // Strip markdown for clean matching. Full content is indexed — at 14 posts
    // the total index is ~130 KB (smaller than a hero image), fetched once and
    // cached by the browser. No truncation needed at this scale.
    content: stripMarkdown(post.content),
  }));

  const outputPath = path.join(process.cwd(), "public", "search-index.json");

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(index));

  console.log(
    `[search-index] Generated ${outputPath} — ${index.length} posts, ${(Buffer.byteLength(JSON.stringify(index)) / 1024).toFixed(1)} KB`,
  );
}

generateIndex();
