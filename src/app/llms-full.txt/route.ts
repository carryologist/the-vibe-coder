import { getAllPosts } from "@/lib/posts";

export async function GET() {
  const posts = getAllPosts();
  const siteUrl = "https://vibescoder.dev";

  const header = `# vibescoder.dev — Full Content Index

> Building in public with AI agents. A technical blog by Rob Whiteley, CEO of Coder.
> This file contains all published blog posts in plain text for AI agent consumption.
> Homepage: ${siteUrl}
> RSS: ${siteUrl}/feed.xml

---

`;

  const postTexts = posts
    .map((post) => {
      const tags = post.tags.map((t) => `#${t}`).join(" ");
      return `## ${post.title}

- URL: ${siteUrl}/posts/${post.slug}
- Date: ${post.date}
- Tags: ${tags}
- Reading time: ${post.readingTime}

${post.description}

---

${post.content}

===

`;
    })
    .join("\n");

  const body = header + postTexts;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
