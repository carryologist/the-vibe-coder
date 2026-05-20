import { getAllPosts } from "@/lib/posts";

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
 * Format intentionally mirrors overreacted.io/rss.xml, which is the
 * smallest known-working feed against Substack's importer:
 * - <title> and <description> wrapped in CDATA (no entity encoding)
 * - <guid> as a bare URL (no isPermaLink attribute)
 * - No <dc:creator> or other extension elements
 *
 * The feed deliberately omits <content:encoded>. Substack's importer
 * fetches each post's <link> URL and parses the article body from the
 * HTML page directly.
 */
export async function GET() {
  const allPosts = getAllPosts();
  const posts = allPosts.filter((p) => p.syndicate === true);

  const siteUrl = "https://vibescoder.dev";

  const items = posts
    .map((post) => {
      const url = `${siteUrl}/posts/${post.slug}`;
      return `        <item>
            <title>${cdata(post.title)}</title>
            <link>${url}</link>
            <guid>${url}</guid>
            <pubDate>${new Date(post.date).toUTCString()}</pubDate>
            <description>${cdata(post.description)}</description>
        </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
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
