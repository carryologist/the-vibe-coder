import type { Metadata } from "next";
import { getAllTagsAdmin } from "@/lib/tags";
import { TagManager } from "@/components/admin/TagManager";

export const metadata: Metadata = {
  title: "Tags — Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function AdminTagsPage() {
  const tags = getAllTagsAdmin().map(({ tag, count }) => ({ tag, count }));

  return (
    <div>
      <div className="mb-8 flex items-baseline justify-between">
        <h1 className="font-mono text-xs uppercase tracking-widest text-primary">
          // Tags
        </h1>
        <span className="font-mono text-xs text-on-surface-variant">
          <span className="text-on-surface font-medium">{tags.length}</span>{" "}
          tags
        </span>
      </div>

      {tags.length === 0 ? (
        <p className="font-mono text-xs text-on-surface-variant">
          No tags found across published or draft posts.
        </p>
      ) : (
        <TagManager tags={tags} />
      )}
    </div>
  );
}
