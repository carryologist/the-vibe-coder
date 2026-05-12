import type { Metadata } from "next";
import { ImageBrowser } from "@/components/admin/ImageBrowser";
import { getAllPostsAdmin } from "@/lib/posts";

export const metadata: Metadata = {
  title: "Images — Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function ImagesPage() {
  // Get post data from local filesystem (fast, synchronous)
  const posts = getAllPostsAdmin().map(({ slug, title }) => ({ slug, title }));

  return (
    <div>
      <div className="mb-8 flex items-baseline justify-between">
        <h1 className="font-mono text-xs uppercase tracking-widest text-primary">
          // Images
        </h1>
        <span className="font-mono text-xs text-on-surface-variant">
          Loading image data from GitHub...
        </span>
      </div>

      <ImageBrowser posts={posts} />
    </div>
  );
}
