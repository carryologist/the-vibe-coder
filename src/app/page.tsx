import { getAllPosts } from "@/lib/posts";
import { PostCard } from "@/components/PostCard";

export default async function HomePage() {
  const posts = await getAllPosts();

  return (
    <div>
      {/* Hero */}
      <section className="mb-16">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Vibes Coder
        </h1>
        <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl">
          Thoughts on software development, AI-assisted coding, and the craft of
          building things that work.
        </p>
      </section>

      {/* Posts */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-widest text-neutral-500 dark:text-neutral-400 mb-8">
          Latest Posts
        </h2>
        {posts.length === 0 ? (
          <p className="text-neutral-500 dark:text-neutral-400">
            No posts yet. Check back soon.
          </p>
        ) : (
          <div className="flex flex-col gap-10">
            {posts.map((post) => (
              <PostCard key={post.slug} post={post} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
