import { Suspense } from "react";
import { getAllPosts, getAllTags } from "@/lib/posts";
import { getCommentCounts } from "@/lib/discussions";
import { getPostViewCounts } from "@/lib/analytics";
import { AnimateIn } from "@/components/AnimateIn";
import { PostListWithFilters } from "@/components/PostListWithFilters";

// The root layout reads headers() for the CSP nonce, which opts every HTML
// route into dynamic rendering. A revalidate window here would be inert, so
// it is deliberately omitted rather than left as a misleading no-op.

export default async function HomePage() {
  // Admin state is resolved on the client by the AdminCardControlsIsland
  // inside each PostCard. Keeping cookies() out of this server component
  // lets the homepage stay statically rendered for the ISR window.

  const [posts, commentCounts] = await Promise.all([
    getAllPosts(),
    getCommentCounts(),
  ]);

  const viewCounts = await getPostViewCounts(posts.map((p) => p.slug));

  const postsWithComments = posts.map((post) => ({
    ...post,
    commentCount: commentCounts[post.slug] ?? 0,
    viewCount: viewCounts[post.slug] ?? 0,
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
          />
        </Suspense>
      )}
    </div>
  );
}
