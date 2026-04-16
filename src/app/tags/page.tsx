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

  const tagCounts: Record<string, number> = {};
  for (const tag of tags) {
    tagCounts[tag] = posts.filter((p) => p.tags.includes(tag)).length;
  }

  return (
    <AnimateIn>
      <div>
        <h1
          className="text-xs font-semibold uppercase tracking-widest text-[#dcb8ff] mb-8"
          style={{ fontFamily: "var(--font-label)" }}
        >
          // Tags
        </h1>

        <div className="flex flex-wrap gap-3">
          {tags.map((tag) => (
            <div key={tag} className="flex items-center gap-1.5">
              <TagBadge tag={tag} />
              <span
                className="text-[11px] text-[#978d9e]"
                style={{ fontFamily: "var(--font-label)" }}
              >
                ({tagCounts[tag]})
              </span>
            </div>
          ))}
        </div>
      </div>
    </AnimateIn>
  );
}
