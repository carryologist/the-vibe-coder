import type { Metadata } from "next";
import { getAllImageDirectoriesSync } from "@/lib/imageUtils";
import { getAllPostsAdmin } from "@/lib/posts";
import { ImagesGrid } from "@/components/admin/ImagesGrid";
import { formatSize } from "@/lib/imageTypes";

export const metadata: Metadata = {
  title: "Images — Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function ImagesPage() {
  const posts = getAllPostsAdmin();
  const postSlugs = new Set(posts.map((p) => p.slug));
  const directories = getAllImageDirectoriesSync(postSlugs);

  const totalDirectories = directories.length;
  const orphanedCount = directories.filter((d) => d.isOrphaned).length;
  const totalFiles = directories.reduce((sum, d) => sum + d.fileCount, 0);
  const totalSize = directories.reduce((sum, d) => sum + d.totalSize, 0);

  return (
    <div>
      <div className="mb-8 flex items-baseline justify-between">
        <h1 className="font-mono text-xs uppercase tracking-widest text-primary">
          // Images
        </h1>
        <div className="flex gap-4 font-mono text-xs text-on-surface-variant">
          <span>
            <span className="text-on-surface font-medium">{totalDirectories}</span>{" "}
            directories
          </span>
          <span>
            <span className="text-on-surface font-medium">{totalFiles}</span>{" "}
            files
          </span>
          <span>
            <span className="text-on-surface font-medium">
              {formatSize(totalSize)}
            </span>{" "}
            total
          </span>
          {orphanedCount > 0 && (
            <span className="text-warning">
              <span className="font-medium">{orphanedCount}</span>{" "}
              orphaned
            </span>
          )}
        </div>
      </div>

      <ImagesGrid directories={directories} />
    </div>
  );
}
