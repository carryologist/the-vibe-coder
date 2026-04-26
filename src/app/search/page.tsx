import type { Metadata } from "next";
import { AnimateIn } from "@/components/AnimateIn";
import { PostCard } from "@/components/PostCard";
import { SearchInput } from "./SearchInput";
import { getAllPosts } from "@/lib/posts";
import type { Post } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Search",
  description: "Search across all posts.",
};

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

function searchPosts(query: string): Omit<Post, "content">[] {
  const posts = getAllPosts();
  const q = query.toLowerCase();

  return posts
    .filter((post) => {
      const titleMatch = post.title.toLowerCase().includes(q);
      const descriptionMatch = post.description.toLowerCase().includes(q);
      const tagMatch = post.tags.some((tag) => tag.toLowerCase().includes(q));
      const contentMatch = post.content.toLowerCase().includes(q);
      return titleMatch || descriptionMatch || tagMatch || contentMatch;
    })
    .map(({ content, ...rest }) => rest);
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const results = query ? searchPosts(query) : [];

  return (
    <div>
      <AnimateIn>
        <h1
          className="text-xs font-semibold uppercase tracking-widest text-primary mb-8"
          style={{ fontFamily: "var(--font-label)" }}
        >
          // Search
        </h1>
      </AnimateIn>

      <AnimateIn delay={0.05}>
        <SearchInput initialQuery={query} />
      </AnimateIn>

      <div className="mt-10">
        {!query ? (
          <AnimateIn delay={0.1}>
            <p
              className="text-sm text-on-surface-variant"
              style={{ fontFamily: "var(--font-label)" }}
            >
              Start typing to search across all posts.
            </p>
          </AnimateIn>
        ) : results.length === 0 ? (
          <AnimateIn delay={0.1}>
            <p
              className="text-sm text-on-surface-variant"
              style={{ fontFamily: "var(--font-label)" }}
            >
              No posts found for &ldquo;{query}&rdquo;. Try different keywords.
            </p>
          </AnimateIn>
        ) : (
          <>
            <AnimateIn delay={0.1}>
              <p
                className="text-xs font-semibold uppercase tracking-widest text-primary mb-8"
                style={{ fontFamily: "var(--font-label)" }}
              >
                {results.length} {results.length === 1 ? "result" : "results"}{" "}
                for &lsquo;{query}&rsquo;
              </p>
            </AnimateIn>

            <div className="flex flex-col gap-6">
              {results.map((post, i) => (
                <AnimateIn key={post.slug} delay={0.15 + i * 0.05}>
                  <PostCard post={post as Post} />
                </AnimateIn>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
