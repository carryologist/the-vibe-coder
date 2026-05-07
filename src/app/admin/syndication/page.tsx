import type { Metadata } from "next";
import { getAllPostsAdmin } from "@/lib/posts";
import SyndicationDashboard from "@/components/admin/SyndicationDashboard";

export const metadata: Metadata = {
  title: "Syndication — Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function SyndicationPage() {
  const posts = getAllPostsAdmin().map(
    ({ slug, title, date, published, devtoUrl, tags }) => ({
      slug,
      title,
      date,
      published,
      devtoUrl,
      tags,
    })
  );

  return (
    <div>
      <h1 className="font-mono text-xs uppercase tracking-widest text-primary mb-8">
        // Syndication
      </h1>
      <SyndicationDashboard posts={posts} />
    </div>
  );
}
