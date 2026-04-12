import { getAllPosts, getAllTags } from "@/lib/posts";
import { TagBadge } from "@/components/TagBadge";
import { AnimateIn } from "@/components/AnimateIn";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tags",
  description: "Browse posts by tag.",
};

export default async function TagsPage() {
  const posts = await getAllPosts();
  const tags = await getAllTags();

  // Count posts per tag.
  const tagCounts: Record<string, number> = {};
  for (const tag of tags) {
    tagCounts[tag] = posts.filter((p) => p.tags.includes(tag)).length;
  }

  return (
    <AnimateIn>
      <div>
        <h1 className="font-mono text-xs font-semibold uppercase tracking-widest text-[#A3E635] mb-8">
          // Tags
        </h1>

        <div className="flex flex-wrap gap-3">
          {tags.map((tag) => (
            <div key={tag} className="flex items-center gap-1.5">
              <TagBadge tag={tag} />
              <span className="font-mono text-[11px] text-[#555555]">
                ({tagCounts[tag]})
              </span>
            </div>
          ))}
        </div>
      </div>
    </AnimateIn>
  );
}
