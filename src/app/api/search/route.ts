import { NextRequest, NextResponse } from "next/server";
import { getAllPosts } from "@/lib/posts";

/** Strip markdown/MDX syntax for plain-text searching and snippets. */
function stripMarkdown(text: string): string {
  return text
    .replace(/^import\s.+$/gm, "")           // import statements
    .replace(/<[^>]+\/?\s*>/g, "")             // JSX/HTML tags
    .replace(/!\[.*?\]\(.*?\)/g, "")           // images
    .replace(/\[([^\]]+)\]\(.*?\)/g, "$1")     // links → text
    .replace(/#{1,6}\s+/g, "")                 // headings
    .replace(/(\*{1,3}|_{1,3})(.*?)\1/g, "$2") // bold/italic
    .replace(/`{1,3}[^`]*`{1,3}/g, "")        // inline/fenced code
    .replace(/>\s?/gm, "")                     // blockquotes
    .replace(/\n{2,}/g, " ")                   // collapse newlines
    .replace(/\s+/g, " ")                      // collapse whitespace
    .trim();
}

/** Extract a ~160-char snippet around the first occurrence of query. */
function extractSnippet(content: string, query: string): string | null {
  const plain = stripMarkdown(content);
  const idx = plain.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return null;
  const start = Math.max(0, idx - 60);
  const end = Math.min(plain.length, idx + query.length + 100);
  let snippet = plain.slice(start, end).trim();
  if (start > 0) snippet = "…" + snippet;
  if (end < plain.length) snippet = snippet + "…";
  return snippet;
}

interface ScoredResult {
  slug: string;
  title: string;
  date: string;
  description: string;
  tags: string[];
  readingTime: string;
  snippet: string | null;
  score: number;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim().toLowerCase();

  if (!query) {
    return NextResponse.json([]);
  }

  const posts = getAllPosts();
  const scored: ScoredResult[] = [];

  for (const post of posts) {
    let score = 0;

    // Title match (highest weight)
    if (post.title.toLowerCase().includes(query)) {
      score += 100;
      if (post.title.toLowerCase() === query) score += 50;
    }

    // Tag match
    const tagMatch = post.tags.some((t) => t.toLowerCase().includes(query));
    if (tagMatch) {
      score += 50;
      if (post.tags.some((t) => t.toLowerCase() === query)) score += 20;
    }

    // Description match
    if (post.description.toLowerCase().includes(query)) {
      score += 25;
    }

    // Content match (+ bonus for multiple occurrences)
    const contentLower = post.content.toLowerCase();
    if (contentLower.includes(query)) {
      score += 10;
      const occurrences = contentLower.split(query).length - 1;
      score += Math.min(occurrences, 10);
    }

    if (score > 0) {
      scored.push({
        slug: post.slug,
        title: post.title,
        date: post.date,
        description: post.description,
        tags: post.tags,
        readingTime: post.readingTime,
        snippet: extractSnippet(post.content, query),
        score,
      });
    }
  }

  scored.sort((a, b) => b.score - a.score);

  // Strip internal score from response
  const results = scored.slice(0, 20).map(({ score, ...rest }) => rest);

  return NextResponse.json(results);
}
