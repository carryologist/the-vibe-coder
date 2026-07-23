import type { Metadata } from "next";
import { listImageDirectories } from "@/lib/images";
import type { ImageDirectory, LooseImageFile } from "@/lib/image-types";
import { ImageManager } from "@/components/admin/ImageManager";

export const metadata: Metadata = {
  title: "Images — Admin",
  robots: { index: false, follow: false },
};

// Force dynamic so each visit hits the GitHub API for the current state
// of the content repo, not a stale build-time snapshot.
export const dynamic = "force-dynamic";

export default async function AdminImagesPage() {
  let directories: ImageDirectory[] = [];
  let looseFiles: LooseImageFile[] = [];
  let error: string | null = null;
  try {
    const result = await listImageDirectories();
    directories = result.directories;
    looseFiles = result.looseFiles;
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load image data";
  }

  const totalDirs = directories.length;
  const totalFiles =
    directories.reduce((acc, d) => acc + d.fileCount, 0) + looseFiles.length;
  const totalSize =
    directories.reduce((acc, d) => acc + d.totalSize, 0) +
    looseFiles.reduce((acc, f) => acc + f.size, 0);
  const orphanCount =
    directories.filter((d) => d.orphaned).length +
    looseFiles.filter((f) => f.orphaned).length;

  return (
    <div>
      <div className="mb-8 flex items-baseline justify-between">
        <h1 className="font-mono text-xs uppercase tracking-widest text-primary">
          // Images
        </h1>
        <span className="font-mono text-xs text-on-surface-variant">
          <span className="text-on-surface font-medium">{totalDirs}</span>{" "}
          dirs · {totalFiles} files · {formatBytes(totalSize)}
          {orphanCount > 0 && (
            <>
              {" · "}
              <span className="text-red-400 font-medium">{orphanCount}</span>{" "}
              orphaned
            </>
          )}
        </span>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 font-mono text-xs text-red-400">
          {error}
        </div>
      ) : (
        <ImageManager directories={directories} looseFiles={looseFiles} />
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
