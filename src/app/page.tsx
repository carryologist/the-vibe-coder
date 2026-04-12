import { getAllPosts } from "@/lib/posts";
import { PostCard } from "@/components/PostCard";
import { AnimateIn } from "@/components/AnimateIn";

export default async function HomePage() {
  const posts = await getAllPosts();

  return (
    <div>
      {/* Hero */}
      <AnimateIn>
        <section className="mb-16">
          <h1 className="font-mono text-4xl font-bold tracking-tight sm:text-5xl">
            <span className="text-[#EDEDED]">vibescoder</span>
            <span className="text-[#A3E635]">.dev</span>
          </h1>
          <p className="mt-4 text-lg text-[#888888] max-w-2xl">
            Thoughts on software development, AI-assisted coding, and the craft of
            building things that work.
          </p>
        </section>
      </AnimateIn>

      {/* Posts */}
      <AnimateIn delay={0.1}>
        <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-[#A3E635] mb-8">
          // Latest Posts
        </h2>
      </AnimateIn>

      {posts.length === 0 ? (
        <p className="font-mono text-sm text-[#888888]">
          No posts yet. Check back soon.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {posts.map((post, i) => (
            <AnimateIn key={post.slug} delay={0.15 + i * 0.05}>
              <PostCard post={post} />
            </AnimateIn>
          ))}
        </div>
      )}
    </div>
  );
}
