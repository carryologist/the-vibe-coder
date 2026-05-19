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

        return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${siteUrl}/posts/${post.slug}</link>
      <description>${escapeXml(post.description)}</description>
      <content:encoded><![CDATA[${cdataEscape(html)}]]></content:encoded>
      <author>rob@vibescoder.dev (Rob Whiteley)</author>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      <guid isPermaLink="true">${siteUrl}/posts/${post.slug}</guid>
${categories}
    </item>`;
      }),
    )
  ).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/feed-style.xsl"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>Vibes Coder</title>
    <link>${siteUrl}</link>
    <description>Building in public with AI agents. A technical blog by Rob Whiteley, CEO of Coder.</description>
    <language>en</language>
    <managingEditor>rob@vibescoder.dev (Rob Whiteley)</managingEditor>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${siteUrl}/feed.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=900, s-maxage=900",
    },
  });
}
