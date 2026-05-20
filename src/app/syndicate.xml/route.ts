import { getAllPosts } from "@/lib/posts";
import { mdxToFeedHtml } from "@/lib/rss-html";

/**
 * Escape a string for safe inclusion inside a CDATA section. CDATA can
 * hold anything except the literal sequence `]]>`, which we split.
 */
function cdata(s: string): string {
  return `<![CDATA[${s.replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
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
 * Format intentionally mirrors overreacted.io/rss.xml structurally
 * (CDATA-wrapped fields, bare guid, minimal channel metadata) but
 * also includes <content:encoded> with each post's full HTML body.
 * Substack's importer copies the body text from this field directly
 * into the imported post — without it, the import contains only the
 * description (a 1-3 sentence summary).
 *
 * The xmlns:content namespace is declared on <rss> so <content:encoded>
 * parses correctly.
 */
export async function GET() {
  const allPosts = getAllPosts();
  const posts = allPosts.filter((p) => p.syndicate === true);

  const siteUrl = "https://vibescoder.dev";

  const items = (
    await Promise.all(
      posts.map(async (post) => {
        const url = `${siteUrl}/posts/${post.slug}`;
        const html = await mdxToFeedHtml(post.content, siteUrl);
        return `        <item>
            <title>${cdata(post.title)}</title>
            <link>${url}</link>
            <guid>${url}</guid>
            <pubDate>${new Date(post.date).toUTCString()}</pubDate>
            <description>${cdata(post.description)}</description>
            <content:encoded>${cdata(html)}</content:encoded>
        </item>`;
      }),
    )
  ).join("\n");

  const xml = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
    <channel>
        <title>Vibes Coder</title>
        <link>${siteUrl}/</link>
        <description>Building in public with AI agents. A technical blog by Rob Whiteley, CEO of Coder.</description>
        <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
        <docs>https://validator.w3.org/feed/docs/rss2.html</docs>
        <generator>vibescoder.dev</generator>
        <atom:link href="${siteUrl}/syndicate.xml" rel="self" type="application/rss+xml"/>
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
