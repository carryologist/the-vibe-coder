import { NextRequest, NextResponse } from "next/server";
import { getPostBySlug } from "@/lib/posts";

/**
 * Markdown content negotiation endpoint.
 *
 * Two ways to reach this route:
 *
 *  1. Direct GET to /posts/<slug>/raw — always returns text/markdown.
 *     Useful for tooling that wants a deterministic URL.
 *
 *  2. Internal rewrite from /posts/<slug> when the client sends
 *     Accept: text/markdown (handled in src/middleware.ts).
 *     Browsers and ordinary crawlers send Accept: text/html and
 *     continue to receive the HTML page unchanged.
 *
 * The body is the raw MDX (frontmatter stripped) reconstructed with a
 * minimal YAML-ish header so agents can recover title/date/description
 * without parsing MDX components. Custom JSX components in the body
 * (PhoneScreenshot, etc.) are left as-is — they're inert for an LLM
 * reader and a markdown parser will simply ignore unknown tags.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    return new NextResponse("Not found", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const header = [
    `# ${post.title}`,
    "",
    `> ${post.description ?? ""}`,
    "",
    `- Author: Rob Whiteley`,
    `- Published: ${post.date}`,
    `- Canonical: https://vibescoder.dev/posts/${post.slug}`,
    post.tags?.length ? `- Tags: ${post.tags.join(", ")}` : "",
    "",
    "---",
    "",
  ]
    .filter((line) => line !== "")
    .join("\n");

  const body = `${header}\n\n${post.content.trim()}\n`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=3600",
      // Tell shared caches that the representation depends on Accept
      // so the rewrite from /posts/<slug> doesn't poison the HTML cache.
      Vary: "Accept",
      "X-Robots-Tag": "index, follow",
    },
  });
}
