import { notFound } from "next/navigation";
import Link from "next/link";
import { MDXRemote } from "next-mdx-remote/rsc";
import rehypePrettyCode from "rehype-pretty-code";
import remarkGfm from "remark-gfm";
import { remarkSmartQuotes } from "@/lib/remark-smart-quotes";
import { smartQuotes } from "@/lib/typography";
import rehypeSlug from "rehype-slug";
import { getPostBySlug, getAllPosts } from "@/lib/posts";
import { createMDXComponents } from "@/components/MDXComponents";
import { ReadingProgress } from "@/components/ReadingProgress";
import { AnimateIn } from "@/components/AnimateIn";
import { TagBadge } from "@/components/TagBadge";
import { AdminPostControlsIsland } from "@/components/admin/AdminPostControlsIsland";
import Changelog from "@/components/Changelog";
import { LoomEmbed } from "@/components/LoomEmbed";
import { GiscusComments } from "@/components/GiscusComments";
import { JsonLd } from "@/components/JsonLd";

interface PostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export const dynamicParams = true;

export async function generateMetadata({ params }: PostPageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: "Post Not Found" };
  return {
    title: post.title,
    description: post.description,
    authors: [{ name: "Rob Whiteley", url: "https://vibescoder.dev/about" }],
    openGraph: {
      title: post.title,
      description: post.description,
      url: `https://vibescoder.dev/posts/${slug}`,
      siteName: "vibescoder",
      type: "article",
      publishedTime: post.date,
      modifiedTime: post.changelog?.[0]?.date ?? post.date,
      authors: ["Rob Whiteley"],
      tags: post.tags,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      site: "@rwhiteley0",
      creator: "@rwhiteley0",
    },
    alternates: {
      canonical: `https://vibescoder.dev/posts/${slug}`,
    },
  };
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  // Admin controls are rendered by a client island that calls
  // /api/auth/check on mount. This keeps the post page statically
  // rendered for the ~100% of readers who are not the admin, dropping
  // TTFB from 200-600ms (dynamic) to <50ms (static edge hit).

  const formattedDate = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(post.date));

  return (
    <>
      <JsonLd
        type="blogposting"
        title={post.title}
        description={post.description}
        datePublished={post.date}
        dateModified={post.changelog?.[0]?.date}
        slug={slug}
        tags={post.tags}
        readingTime={post.readingTime}
      />
      <JsonLd
        type="breadcrumb"
        items={[
          { name: "Home", url: "https://vibescoder.dev" },
          { name: "Posts", url: "https://vibescoder.dev" },
          { name: post.title, url: `https://vibescoder.dev/posts/${slug}` },
        ]}
      />
      <ReadingProgress />
      <article>
        {/* Back link */}
        <AnimateIn>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-on-surface-variant/50 transition-colors hover:text-primary mb-10"
            style={{ fontFamily: "var(--font-label)" }}
          >
            <span aria-hidden="true">&larr;</span>
            cd ..
          </Link>
        </AnimateIn>

        {/* Admin controls — client island, gated by /api/auth/check */}
        <AnimateIn delay={0.025}>
          <AdminPostControlsIsland slug={slug} />
        </AnimateIn>

        {/* Header */}
        <AnimateIn delay={0.05}>
          <header className="mb-12">
            <h1
              className="text-3xl font-bold tracking-tight sm:text-4xl text-on-surface"
              style={{ fontFamily: "var(--font-headline)" }}
            >
              {smartQuotes(post.title)}
            </h1>

            <div
              className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs uppercase tracking-widest text-on-surface-variant/50"
              style={{ fontFamily: "var(--font-label)" }}
            >
              <time dateTime={post.date}>{formattedDate}</time>
              {post.readingTime && (
                <>
                  <span className="text-outline-variant">&middot;</span>
                  <span>{post.readingTime}</span>
                </>
              )}
            </div>

            {post.tags && post.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <TagBadge key={tag} tag={tag} />
                ))}
              </div>
            )}
          </header>
        </AnimateIn>

        {/* Loom Video (hero) */}
        {post.loomUrl && (
          <AnimateIn delay={0.06}>
            <LoomEmbed url={post.loomUrl} />
          </AnimateIn>
        )}

        {/* Changelog */}
        {post.changelog && post.changelog.length > 0 && (
          <AnimateIn delay={0.075}>
            <Changelog entries={post.changelog} />
          </AnimateIn>
        )}

        {/* Content */}
        <AnimateIn delay={0.1}>
          <div className="prose">
            <MDXRemote
              source={post.content}
              components={createMDXComponents(slug, post.title)}
              options={{
                mdxOptions: {
                  remarkPlugins: [remarkGfm, remarkSmartQuotes],
                  rehypePlugins: [
                    rehypeSlug,
                    [rehypePrettyCode, { theme: "github-dark" }],
                  ],
                },
              }}
            />
          </div>
        </AnimateIn>

        {/* Comments */}
        <AnimateIn delay={0.15}>
          <GiscusComments />
        </AnimateIn>
      </article>
    </>
  );
}
