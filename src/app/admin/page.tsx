import Link from "next/link";
import type { Metadata } from "next";
import { getAllPostsAdmin } from "@/lib/posts";
import EditPostPicker from "@/components/admin/EditPostPicker";
import { AnalyticsChart } from "@/components/admin/AnalyticsChart";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function AdminDashboardPage() {
  const posts = getAllPostsAdmin().map(({ slug, title, date, published }) => ({
    slug,
    title,
    date,
    published,
  }));

  return (
    <div>
      <h1 className="font-mono text-xs uppercase tracking-widest text-primary mb-8">
        // Dashboard
      </h1>

      <div className="mb-8">
        <AnalyticsChart />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/admin/record"
          className="group glow-card rounded-xl border border-outline-variant/10 bg-surface-low p-6 transition-all duration-300 hover:border-primary/20 hover:bg-surface-high"
        >
          <div className="mb-2 text-2xl">🎙️</div>
          <h2 className="font-mono text-sm font-medium text-on-surface group-hover:text-primary">
            Record New Post
          </h2>
          <p className="mt-1 text-xs text-on-surface-variant">
            Dictate your thoughts and generate a new blog post.
          </p>
        </Link>

        <div className="glow-card rounded-xl border border-outline-variant/10 bg-surface-low p-6 transition-all duration-300 hover:border-primary/20 hover:bg-surface-high">
          <div className="mb-2 text-2xl">✏️</div>
          <h2 className="mb-3 font-mono text-sm font-medium text-on-surface">
            Edit Existing Post
          </h2>
          <EditPostPicker posts={posts} />
        </div>

        <Link
          href="/admin/syndication"
          className="group glow-card rounded-xl border border-outline-variant/10 bg-surface-low p-6 transition-all duration-300 hover:border-primary/20 hover:bg-surface-high"
        >
          <div className="mb-2 text-2xl">📡</div>
          <h2 className="font-mono text-sm font-medium text-on-surface group-hover:text-primary">
            Syndication
          </h2>
          <p className="mt-1 text-xs text-on-surface-variant">
            Publish posts to Dev.to. Bulk or one-at-a-time.
          </p>
        </Link>

        <Link
          href="/admin/images"
          className="group glow-card rounded-xl border border-outline-variant/10 bg-surface-low p-6 transition-all duration-300 hover:border-primary/20 hover:bg-surface-high"
        >
          <div className="mb-2 text-2xl">🖼️</div>
          <h2 className="font-mono text-sm font-medium text-on-surface group-hover:text-primary">
            Images
          </h2>
          <p className="mt-1 text-xs text-on-surface-variant">
            Browse, preview, and delete post images. Orphan detection included.
          </p>
        </Link>

        <Link
          href="/admin/tags"
          className="group glow-card rounded-xl border border-outline-variant/10 bg-surface-low p-6 transition-all duration-300 hover:border-primary/20 hover:bg-surface-high"
        >
          <div className="mb-2 text-2xl">🏷️</div>
          <h2 className="font-mono text-sm font-medium text-on-surface group-hover:text-primary">
            Tags
          </h2>
          <p className="mt-1 text-xs text-on-surface-variant">
            Rename, deduplicate, and remove tags across all posts.
          </p>
        </Link>
      </div>
    </div>
  );
}
