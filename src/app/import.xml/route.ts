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
 * Minimal RSS feed for one-time bulk imports into platforms (notably
 * Substack) that reject feeds larger than ~256-512 KB or that have
 * heavyweight <content:encoded> blocks.
 *
 * This feed omits <content:encoded> entirely. Importers that respect
 * RSS 2.0 will fetch each post's <link> URL and parse the article body
 * from the page itself — which is what we want, because the canonical
 * HTML on vibescoder.dev is richer (syntax-highlighted code blocks,
 * etc.) than anything we can shove into XML.
 *
 * Use this URL when importing into Substack:
 *   https://vibescoder.dev/import.xml
 *
 * The main feed at /feed.xml remains the full feed for RSS readers.
 */
export async function GET() {
  const posts = getAllPosts();
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
    <generator>vibescoder.dev import feed</generator>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <ttl>60</ttl>
    <atom:link href="${siteUrl}/import.xml" rel="self" type="application/rss+xml" />
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
