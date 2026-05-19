import { getAllPosts } from "@/lib/posts";
import { mdxToFeedHtml } from "@/lib/rss-html";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Split any literal "]]>" across two CDATA sections so MDX content
// containing that sequence cannot terminate the surrounding CDATA block.
// See https://www.w3.org/TR/xml/#NT-CData
function cdataEscape(s: string): string {
  return s.replace(/]]>/g, "]]]]><![CDATA[>");
}

export async function GET() {
  const posts = getAllPosts();
  const siteUrl = "https://vibescoder.dev";
  const authorName = "Rob Whiteley";

  const items = (
    await Promise.all(
      posts.map(async (post) => {
        const categories = post.tags
          .map((tag) => `      <category>${escapeXml(tag)}</category>`)
          .join("\n");

        // Render MDX -> HTML for `<content:encoded>` so importers
        // (Substack, Medium, Feedly, etc.) get real HTML, not raw
        // Markdown.
        const html = await mdxToFeedHtml(post.content, siteUrl);

        // Use <dc:creator> instead of RSS 2.0 <author>. RSS 2.0
        // <author> requires `email (Name)` format, and many importers
        // (Substack included, in practice) reject feeds with author
        // emails for privacy reasons. Ghost, WordPress, Beehiiv, and
        // every other major blog platform Substack supports importing
        // from uses <dc:creator>.
        return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${siteUrl}/posts/${post.slug}</link>
      <description>${escapeXml(post.description)}</description>
      <content:encoded><![CDATA[${cdataEscape(html)}]]></content:encoded>
      <dc:creator>${escapeXml(authorName)}</dc:creator>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      <guid isPermaLink="false">${siteUrl}/posts/${post.slug}</guid>
${categories}
    </item>`;
      }),
    )
  ).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/feed-style.xsl"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>Vibes Coder</title>
    <link>${siteUrl}</link>
    <description>Building in public with AI agents. A technical blog by Rob Whiteley, CEO of Coder.</description>
    <language>en</language>
    <generator>vibescoder.dev custom Next.js feed generator</generator>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <ttl>60</ttl>
    <image>
      <url>${siteUrl}/opengraph-image.png</url>
      <title>Vibes Coder</title>
      <link>${siteUrl}</link>
    </image>
    <atom:link href="${siteUrl}/feed.xml" rel="self" type="application/rss+xml" />
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
