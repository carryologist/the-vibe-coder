import { getAllPosts, getAllTags } from "@/lib/posts";
import { PostCard } from "@/components/PostCard";
import { AnimateIn } from "@/components/AnimateIn";
import Link from "next/link";

interface TagPageProps {
  params: Promise<{ tag: string }>;
}

export async function generateStaticParams() {
  const tags = await getAllTags();
  return tags.map((tag) => ({ tag }));
}

export async function generateMetadata({ params }: TagPageProps) {
  const { tag } = await params;
  return {
    title: `#${tag}`,
    description: `Posts tagged with "${tag}".`,
  };
}

export default async function TagPage({ params }: TagPageProps) {
  const { tag } = await params;
  const posts = (await getAllPosts()).filter((p) => p.tags.includes(tag));

  return (
    <div>
      <AnimateIn>
        <Link
          href="/tags"
          className="inline-flex items-center gap-1.5 font-mono text-xs text-[#888888] transition-colors hover:text-[#A3E635] mb-8"
        >
          <span aria-hidden="true">&larr;</span>
          all tags
        </Link>

        <h1 className="font-mono text-xs font-semibold uppercase tracking-widest text-[#A3E635] mb-8">
          // Posts tagged: {tag}
        </h1>
      </AnimateIn>

      <div className="flex flex-col gap-6">
        {posts.map((post, i) => (
          <AnimateIn key={post.slug} delay={0.1 + i * 0.05}>
            <PostCard post={post} />
          </AnimateIn>
        ))}

        {posts.length === 0 && (
          <p className="font-mono text-sm text-[#888888]">
            No posts found with this tag.
          </p>
        )}
      </div>
    </div>
  );
}
