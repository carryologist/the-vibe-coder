import { cookies } from "next/headers";
import { Suspense } from "react";
import { verifySession } from "@/lib/auth";
import { getAllPosts, getAllTags } from "@/lib/posts";
import { getCommentCounts } from "@/lib/discussions";
import { AnimateIn } from "@/components/AnimateIn";
import { PostListWithFilters } from "@/components/PostListWithFilters";

export const revalidate = 60;

export default async function HomePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;
  const isAdmin = token ? await verifySession(token) : false;

  const [posts, commentCounts] = await Promise.all([
    getAllPosts(),
    getCommentCounts(),
  ]);

  const postsWithComments = posts.map((post) => ({
    ...post,
    commentCount: commentCounts[post.slug] ?? 0,
  }));

  const allTags = getAllTags();

  return (
    <div>
      {/* Hero */}
      <AnimateIn>
        <section className="mb-16">
          <h1
            className="text-4xl font-bold tracking-tighter sm:text-5xl"
            style={{ fontFamily: "var(--font-headline)" }}
          >
            <span className="text-on-surface">Vibes</span>{" "}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Coder</span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-on-surface-variant max-w-2xl">
            Vibe coder. Dangerous coder. CEO of Coder. Thoughts are mine and my agent&apos;s.
          </p>
        </section>
      </AnimateIn>

      {/* Posts */}
      <AnimateIn delay={0.1}>
        <h2
          className="text-xs font-semibold uppercase tracking-widest text-primary mb-8"
          style={{ fontFamily: "var(--font-label)" }}
        >
          // Latest Posts
        </h2>
      </AnimateIn>

      {posts.length === 0 ? (
        <p
          className="text-sm text-on-surface-variant"
          style={{ fontFamily: "var(--font-label)" }}
        >
          No posts yet. Check back soon.
        </p>
      ) : (
        <Suspense>
          <PostListWithFilters
            posts={postsWithComments}
            allTags={allTags}
            isAdmin={isAdmin}
          />
        </Suspense>
      )}
    </div>
  );
}
