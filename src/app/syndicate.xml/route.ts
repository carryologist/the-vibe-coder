import { getAllPosts } from "@/lib/posts";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Curated RSS feed for syndication to newsletter platforms (Substack
 * primarily, plus anything else that imports via RSS).
 *
 * Only posts with `syndicate: true` in their frontmatter are included.
 * This is a deliberately small, opinion-and-narrative-heavy subset of
 * the full archive — the kind of content newsletter audiences read,
 * not the build logs / config writeups / homelab posts that live on
 * the blog.
 *
 * The feed deliberately omits <content:encoded>. Substack's importer
 * fetches each post's <link> URL and parses the article body from the
 * HTML page, which gives a better result than what we can fit in RSS
 * (syntax-highlighted code blocks via rehype-pretty-code, proper
 * images, etc.). The full feed at /feed.xml does include
 * <content:encoded> for normal RSS readers.
 */
export async function GET() {
  const allPosts = getAllPosts();
  const posts = allPosts.filter((p) => p.syndicate === true);

  const siteUrl = "https://vibescoder.dev";
  const authorName = "Rob Whiteley";

  const items = posts
    .map((post) => {
      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${siteUrl}/posts/${post.slug}</link>
      <guid isPermaLink="false">${siteUrl}/posts/${post.slug}</guid>
      <description>${escapeXml(post.description)}</description>
      <dc:creator>${escapeXml(authorName)}</dc:creator>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>Vibes Coder</title>
    <link>${siteUrl}</link>
    <description>Building in public with AI agents. A technical blog by Rob Whiteley, CEO of Coder.</description>
    <language>en</language>
    <generator>vibescoder.dev syndication feed</generator>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <ttl>60</ttl>
    <atom:link href="${siteUrl}/syndicate.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=900, s-maxage=900",
    },
  });
}
