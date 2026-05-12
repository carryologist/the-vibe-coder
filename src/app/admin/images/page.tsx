import type { Metadata } from "next";
import { ImageBrowser } from "@/components/admin/ImageBrowser";
import { getAllPostsAdmin } from "@/lib/posts";
import { listImageDirectories } from "@/lib/github-images";

export const metadata: Metadata = {
  title: "Images — Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ImagesPage() {
  // Fetch image directories and post slugs in parallel
  const [directories, posts] = await Promise.all([
    listImageDirectories(),
    Promise.resolve(getAllPostsAdmin()),
  ]);

  const postSlugs = new Set(posts.map((p) => p.slug));

  const directoryData = directories.map((dir) => ({
    slug: dir.slug,
    fileCount: dir.fileCount,
    totalSize: dir.totalSize,
    hasMatchingPost: postSlugs.has(dir.slug),
    matchingPostTitle: posts.find((p) => p.slug === dir.slug)?.title ?? null,
  }));

  const totalFiles = directories.reduce((sum, d) => sum + d.fileCount, 0);
  const totalSize = directories.reduce((sum, d) => sum + d.totalSize, 0);
  const orphanedCount = directoryData.filter((d) => !d.hasMatchingPost).length;

  function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  return (
    <div>
      <div className="mb-8 flex items-baseline justify-between">
        <h1 className="font-mono text-xs uppercase tracking-widest text-primary">
          // Images
        </h1>
        <span className="font-mono text-xs text-on-surface-variant">
          <span className="text-on-surface font-medium">{directories.length}</span> directories
          {" · "}
          <span className="text-on-surface font-medium">{totalFiles}</span> files
          {" · "}
          <span className="text-on-surface font-medium">{formatBytes(totalSize)}</span>
          {orphanedCount > 0 && (
            <>
              {" · "}
              <span className="text-accent-warm font-medium">{orphanedCount}</span> orphaned
            </>
          )}
        </span>
      </div>

      <ImageBrowser
        initialData={{
          directories: directoryData,
          totalDirectories: directories.length,
          orphanedCount,
        }}
      />
    </div>
  );
}
