import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MDXRemote } from "next-mdx-remote/rsc";
import rehypePrettyCode from "rehype-pretty-code";
import remarkGfm from "remark-gfm";
import { verifySession } from "@/lib/auth";
import { getPostBySlug, getAllPosts } from "@/lib/posts";
import { MDXComponents } from "@/components/MDXComponents";
import { ReadingProgress } from "@/components/ReadingProgress";
import { AnimateIn } from "@/components/AnimateIn";
import { TagBadge } from "@/components/TagBadge";
import { AdminPostControls } from "@/components/admin/AdminPostControls";
import Changelog from "@/components/Changelog";
import { LoomEmbed } from "@/components/LoomEmbed";
import { GiscusComments } from "@/components/GiscusComments";

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
  return { title: post.title, description: post.description };
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  let isAdmin = false;
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_session")?.value;
    isAdmin = token ? await verifySession(token) : false;
  } catch {
    isAdmin = false;
  }

  const formattedDate = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(post.date));

  return (
    <>
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

        {/* Admin controls */}
        {isAdmin && (
          <AnimateIn delay={0.025}>
            <AdminPostControls slug={slug} />
          </AnimateIn>
        )}

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

        {/* Comments */}
        <AnimateIn delay={0.15}>
          <GiscusComments />
        </AnimateIn>
      </article>
    </>
  );
}
