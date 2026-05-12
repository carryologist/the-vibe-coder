import Link from "next/link";
import type { Metadata } from "next";
import { listImageDirectories, formatBytes } from "@/lib/images";

export const metadata: Metadata = {
  title: "Images — Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function AdminImagesPage() {
  const dirs = listImageDirectories();
  const orphanCount = dirs.filter((d) => d.orphaned).length;
  const totalFiles = dirs.reduce((sum, d) => sum + d.fileCount, 0);
  const totalSize = dirs.reduce((sum, d) => sum + d.totalSize, 0);

  return (
    <div>
      <div className="mb-8 flex items-baseline justify-between">
        <h1 className="font-mono text-xs uppercase tracking-widest text-primary">
          // Images
        </h1>
        <span className="font-mono text-xs text-on-surface-variant">
          <span className="text-on-surface font-medium">{dirs.length}</span>{" "}
          dirs ·{" "}
          <span className="text-on-surface font-medium">{totalFiles}</span>{" "}
          files ·{" "}
          <span className="text-on-surface font-medium">
            {formatBytes(totalSize)}
          </span>
          {orphanCount > 0 && (
            <>
              {" · "}
              <span className="text-red-400 font-medium">{orphanCount}</span>{" "}
              orphaned
            </>
          )}
        </span>
      </div>

      {dirs.length === 0 ? (
        <p className="font-mono text-sm text-on-surface-variant">
          No image directories found under public/images/.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {dirs.map((dir) => {
            const thumb = dir.files.find((f) => f.isImage);
            return (
              <Link
                key={dir.slug}
                href={`/admin/images/${encodeURIComponent(dir.slug)}`}
                className={`group glow-card flex gap-4 rounded-xl border p-4 transition-all duration-300 ${
                  dir.orphaned
                    ? "border-red-500/30 bg-surface-low hover:border-red-400/50"
                    : "border-outline-variant/10 bg-surface-low hover:border-primary/20 hover:bg-surface-high"
                }`}
              >
                <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-md border border-outline-variant/20 bg-surface">
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element -- public/images thumbnails; Next/Image config not guaranteed for arbitrary slugs
                    <img
                      src={thumb.publicPath}
                      alt={thumb.name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center font-mono text-[10px] text-outline">
                      no img
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate font-mono text-sm font-medium text-on-surface group-hover:text-primary">
                      {dir.slug}
                    </h2>
                    {dir.orphaned && (
                      <span className="flex-shrink-0 rounded border border-red-500/40 bg-red-500/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-red-400">
                        orphaned
                      </span>
                    )}
                    {!dir.orphaned && dir.postPublished === false && (
                      <span className="flex-shrink-0 rounded border border-secondary/40 bg-secondary/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-secondary">
                        draft
                      </span>
                    )}
                  </div>
                  {dir.postTitle && (
                    <p
                      className="mt-1 truncate text-xs text-on-surface-variant"
                      title={dir.postTitle}
                    >
                      {dir.postTitle}
                    </p>
                  )}
                  {dir.orphaned && (
                    <p className="mt-1 text-xs text-red-400/80">
                      No matching post
                    </p>
                  )}
                  <p className="mt-2 font-mono text-[11px] text-outline">
                    {dir.fileCount} file{dir.fileCount === 1 ? "" : "s"} ·{" "}
                    {formatBytes(dir.totalSize)}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
