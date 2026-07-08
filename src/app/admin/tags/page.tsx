import type { Metadata } from "next";
import { getAllTagsWithCounts } from "@/lib/tags";
import type { TagCount } from "@/lib/tags";
import { TagManager } from "@/components/admin/TagManager";

export const metadata: Metadata = {
  title: "Tags — Admin",
  robots: { index: false, follow: false },
};

// Force dynamic so each visit hits the GitHub API for the current state
// of the content repo, not a stale build-time snapshot.
export const dynamic = "force-dynamic";

export default async function AdminTagsPage() {
  let tags: TagCount[] = [];
  let error: string | null = null;
  try {
    tags = await getAllTagsWithCounts();
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load tags";
  }

  const totalPosts = tags.reduce((acc, t) => acc + t.count, 0);

  return (
    <div>
      <div className="mb-8 flex items-baseline justify-between">
        <h1 className="font-mono text-xs uppercase tracking-widest text-primary">
          // Tags
        </h1>
        <span className="font-mono text-xs text-on-surface-variant">
          <span className="text-on-surface font-medium">{tags.length}</span>{" "}
          {tags.length === 1 ? "tag" : "tags"} · {totalPosts} taggings
        </span>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 font-mono text-xs text-red-400">
          {error}
        </div>
      ) : (
        <TagManager tags={tags} />
      )}
    </div>
  );
}
