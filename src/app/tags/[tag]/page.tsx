import type { Metadata } from "next";
import Link from "next/link";
import { getAllPosts, getAllTags } from "@/lib/posts";
import { PostCard } from "@/components/PostCard";

interface TagPageProps {
  params: Promise<{ tag: string }>;
}

export async function generateStaticParams() {
  const tags = await getAllTags();
  return tags.map((tag) => ({ tag }));
}

export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
  const { tag } = await params;
  return {
    title: `Posts tagged: ${tag}`,
    description: `All posts tagged with "${tag}".`,
  };
}

export default async function TagPage({ params }: TagPageProps) {
  const { tag } = await params;
  const allPosts = await getAllPosts();
  const posts = allPosts.filter((post) => post.tags?.includes(tag));

  return (
    <div>
      {/* Back link */}
      <Link
        href="/tags"
        className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors mb-8"
      >
        <span aria-hidden="true">&larr;</span>
        All tags
      </Link>

      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl mb-10">
        Posts tagged:{" "}
        <span className="text-neutral-500 dark:text-neutral-400">{tag}</span>
      </h1>

      {posts.length === 0 ? (
        <p className="text-neutral-500 dark:text-neutral-400">
          No posts found with this tag.
        </p>
      ) : (
        <div className="flex flex-col gap-10">
          {posts.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
