import { notFound } from "next/navigation";
import Link from "next/link";
import { MDXRemote } from "next-mdx-remote/rsc";
import rehypePrettyCode from "rehype-pretty-code";
import remarkGfm from "remark-gfm";
import { getPostBySlugAdmin } from "@/lib/posts";
import { MDXComponents } from "@/components/MDXComponents";
import { ReadingProgress } from "@/components/ReadingProgress";
import { AnimateIn } from "@/components/AnimateIn";
import { TagBadge } from "@/components/TagBadge";
import Changelog from "@/components/Changelog";
import { LoomEmbed } from "@/components/LoomEmbed";
import type { Metadata } from "next";

interface PreviewPageProps {
  params: Promise<{ slug: string }>;
}

export const metadata: Metadata = {
  title: "Preview — Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function PreviewPage({ params }: PreviewPageProps) {
  const { slug } = await params;
  const post = getPostBySlugAdmin(slug);
  if (!post) notFound();

  const formattedDate = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(post.date));

  return (
    <>
      <ReadingProgress />

      {/* Draft banner */}
      {!post.published && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
          <span className="rounded bg-primary/15 px-1.5 py-0.5 font-mono text-[10px] text-primary">
            draft preview
          </span>
          <span className="font-mono text-xs text-on-surface-variant">
            This post is not published.
          </span>
          <Link
            href={`/admin/record?edit=${slug}`}
            className="ml-auto font-mono text-xs text-primary transition-colors hover:text-primary-container"
          >
            Edit →
          </Link>
        </div>
      )}

      <article>
        {/* Back link */}
        <AnimateIn>
          <Link
            href="/admin/drafts"
            className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-on-surface-variant/50 transition-colors hover:text-primary mb-10"
            style={{ fontFamily: "var(--font-label)" }}
          >
            <span aria-hidden="true">&larr;</span>
            cd ../drafts
          </Link>
        </AnimateIn>

        {/* Header */}
        <AnimateIn delay={0.05}>
          <header className="mb-12">
            <h1
              className="text-3xl font-bold tracking-tight sm:text-4xl text-on-surface"
              style={{ fontFamily: "var(--font-headline)" }}
            >
              {post.title}
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
              components={MDXComponents}
              options={{
                mdxOptions: {
                  remarkPlugins: [remarkGfm],
                  rehypePlugins: [
                    [rehypePrettyCode, { theme: "github-dark" }],
                  ],
                },
              }}
            />
          </div>
        </AnimateIn>
      </article>
    </>
  );
}
