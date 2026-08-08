import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import { remarkSmartQuotes } from "./remark-smart-quotes";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeStringify from "rehype-stringify";
import { visit } from "unist-util-visit";
import type { Root, Table, Parent } from "mdast";

export interface MdxToFeedHtmlOptions {
  /**
   * Replace every GFM table with an <img> pointing at
   * /api/share-image/table instead of emitting real <table> HTML.
   * Substack's importer silently strips <table> elements on import,
   * so the curated syndication feed (/syndicate.xml) opts into this;
   * the main /feed.xml keeps real tables for readers that support
   * them.
   */
  tablesAsImages?: boolean;
  /** Required when tablesAsImages is set -- used to build the image URL. */
  slug?: string;
}

/**
 * Remark plugin: when `enabled`, replaces each `table` node with a
 * paragraph wrapping a single image node, in document order, pointing
 * at a stable per-table image URL. Table N (0-based, per post) always
 * maps to the same URL, so re-fetching a feed is idempotent. No-ops
 * when disabled, so it's always safe to include in the pipeline.
 */
function remarkTablesToImages(siteUrl: string, options: MdxToFeedHtmlOptions) {
  return (tree: Root) => {
    if (!options.tablesAsImages || !options.slug) return;
    const slug = options.slug;
    let index = 0;
    visit(tree, "table", (node: Table, i, parent) => {
      if (i == null || !parent) return;
      const url = `${siteUrl}/api/share-image/table?slug=${encodeURIComponent(slug)}&index=${index}`;
      const replacement = {
        type: "paragraph",
        children: [
          {
            type: "image",
            url,
            alt: `Table ${index + 1}`,
          },
        ],
      };
      (parent as Parent).children[i] = replacement as never;
      index++;
    });
  };
}

/**
 * Render an MDX post body into syndication-ready HTML for RSS
 * `<content:encoded>` blocks. The output is HTML — not MDX — so it is
 * consumable by importers (Substack, Medium, Feedly) that parse
 * `content:encoded` as HTML.
 *
 * - JSX components (e.g. `<Changelog>`, `<MCP>`) are stripped before
 *   parsing because remark cannot handle JSX. We replace block-level
 *   custom components with an empty line and inline ones with their
 *   inner text where possible.
 * - Relative links and images are rewritten to absolute URLs anchored
 *   at `siteUrl` so external readers can resolve them.
 */
export async function mdxToFeedHtml(
  mdx: string,
  siteUrl: string,
  options: MdxToFeedHtmlOptions = {},
): Promise<string> {
  const stripped = stripJsx(mdx);

  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkSmartQuotes)
    .use(() => remarkTablesToImages(siteUrl, options))
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(stripped);

  return absolutizeUrls(String(file), siteUrl);
}

/**
 * Strip custom MDX/JSX components from a Markdown body so the
 * remark/rehype pipeline can parse what remains as standard CommonMark
 * + GFM. We keep import/export statements out (rare here) and remove
 * any tag that starts with an uppercase letter (the MDX convention for
 * components).
 */
function stripJsx(mdx: string): string {
  let out = mdx;

  // Remove `import ...` and `export ...` statements that sometimes
  // appear at the top of MDX files.
  out = out.replace(/^\s*(import|export)\s.+$/gm, "");

  // Remove self-closing component tags: <Foo ... />
  out = out.replace(/<[A-Z][A-Za-z0-9]*\b[^>]*\/>/g, "");

  // Remove paired component tags and their inner content: <Foo>...</Foo>
  // Run repeatedly to handle nested components.
  let prev: string;
  do {
    prev = out;
    out = out.replace(
      /<([A-Z][A-Za-z0-9]*)\b[^>]*>[\s\S]*?<\/\1>/g,
      "",
    );
  } while (out !== prev);

  // Remove any orphaned opening or closing component tags that
  // survived (e.g. unbalanced JSX) — better to drop than to confuse
  // the parser.
  out = out.replace(/<\/?[A-Z][A-Za-z0-9]*\b[^>]*>/g, "");

  return out;
}

/**
 * Rewrite relative URLs to absolute ones so syndication readers can
 * fetch images and follow links. Handles `href` and `src` attributes
 * on the HTML emitted by rehype-stringify.
 */
function absolutizeUrls(html: string, siteUrl: string): string {
  const base = siteUrl.replace(/\/$/, "");
  return html.replace(
    /(href|src)="(\/[^"]*)"/g,
    (_match, attr, path) => `${attr}="${base}${path}"`,
  );
}
