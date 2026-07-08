import type { Metadata } from "next";
import { getAllTagsAdmin } from "@/lib/tags";
import { TagManager } from "@/components/admin/TagManager";

export const metadata: Metadata = {
  title: "Tags — Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function AdminTagsPage() {
  const tags = getAllTagsAdmin();
  const totalPosts = tags.reduce((acc, t) => acc + t.count, 0);

  return (
    <div>
      <div className="mb-8 flex items-baseline justify-between">
        <h1 className="font-mono text-xs uppercase tracking-widest text-primary">
          // Tags
        </h1>
        <span className="font-mono text-xs text-on-surface-variant">
          <span className="font-medium text-on-surface">{tags.length}</span>{" "}
          tags · {totalPosts} uses
        </span>
      </div>

      <TagManager tags={tags} />
    </div>
  );
}
