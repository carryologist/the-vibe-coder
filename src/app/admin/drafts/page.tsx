import type { Metadata } from "next";
import { getAllPostsAdmin } from "@/lib/posts";
import { DraftsList } from "@/components/admin/DraftsList";

export const metadata: Metadata = {
  title: "Drafts — Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function DraftsPage() {
  const allPosts = getAllPostsAdmin();
  const drafts = allPosts
    .filter((p) => !p.published)
    .map(({ slug, title, date, description, tags, publishAt }) => ({
      slug,
      title,
      date,
      description,
      tags,
      publishAt,
    }));

  const scheduled = drafts.filter((d) => d.publishAt);
  const unscheduled = drafts.filter((d) => !d.publishAt);

  return (
    <div>
      <div className="mb-8 flex items-baseline justify-between">
        <h1 className="font-mono text-xs uppercase tracking-widest text-primary">
          // Drafts
        </h1>
        <span className="font-mono text-xs text-on-surface-variant">
          <span className="text-on-surface font-medium">{drafts.length}</span>{" "}
          unpublished
          {scheduled.length > 0 && (
            <>
              {" · "}
              <span className="text-secondary font-medium">
                {scheduled.length}
              </span>{" "}
              scheduled
            </>
          )}
        </span>
      </div>

      {scheduled.length > 0 && unscheduled.length > 0 && (
        <div className="mb-4">
          <h2 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-secondary">
            Scheduled
          </h2>
        </div>
      )}

      <DraftsList
        drafts={[
          ...scheduled.sort(
            (a, b) =>
              new Date(a.publishAt!).getTime() -
              new Date(b.publishAt!).getTime(),
          ),
          ...unscheduled,
        ]}
      />
    </div>
  );
}
