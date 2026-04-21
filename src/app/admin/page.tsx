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

        <div className="rounded-xl border border-outline-variant/10 p-6 opacity-50">
          <div className="mb-2 text-2xl">⚙️</div>
          <h2 className="font-mono text-sm font-medium text-on-surface-variant">
            Settings
          </h2>
          <p className="mt-1 text-xs text-outline">
            Configure style prompt and preferences. (Coming soon)
          </p>
        </div>
      </div>
    </div>
  );
}
