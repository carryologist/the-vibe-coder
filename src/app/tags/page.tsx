import type { Metadata } from "next";
import Link from "next/link";
import { getAllPosts, getAllTags } from "@/lib/posts";

export const metadata: Metadata = {
  title: "Tags",
  description: "Browse posts by tag.",
};

export default async function TagsPage() {
  const posts = await getAllPosts();
  const tags = await getAllTags();

  // Count posts per tag.
  const tagCounts = new Map<string, number>();
  for (const post of posts) {
    for (const tag of post.tags ?? []) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl mb-10">
        Tags
      </h1>

      {tags.length === 0 ? (
        <p className="text-neutral-500 dark:text-neutral-400">
          No tags yet.
        </p>
      ) : (
        <div className="flex flex-wrap gap-3">
          {tags.map((tag) => (
            <Link
              key={tag}
              href={`/tags/${tag}`}
              className="inline-flex items-center gap-2 rounded-full bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 transition-colors"
            >
              {tag}
              <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-xs font-semibold text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400">
                {tagCounts.get(tag) ?? 0}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
