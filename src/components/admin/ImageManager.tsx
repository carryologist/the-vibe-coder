"use client";

import { useState } from "react";

interface ImageFile {
  name: string;
  size: number;
  sha: string;
  path: string;
  downloadUrl: string;
}

interface ImageDirectory {
  slug: string;
  files: ImageFile[];
  fileCount: number;
  totalSize: number;
  hasMatchingPost: boolean;
  isOrphaned: boolean;
}

interface Props {
  initialDirectories: ImageDirectory[];
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

type DeleteTarget =
  | { kind: "file"; path: string; name: string }
  | { kind: "directory"; slug: string; paths: string[] };

export default function ImageManager({ initialDirectories }: Props) {
  const [directories, setDirectories] =
    useState<ImageDirectory[]>(initialDirectories);
  const [pending, setPending] = useState<DeleteTarget | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalDirs = directories.length;
  const totalImages = directories.reduce((acc, d) => acc + d.fileCount, 0);
  const totalSize = directories.reduce((acc, d) => acc + d.totalSize, 0);

  async function deleteSingleFile(path: string): Promise<boolean> {
    const res = await fetch("/api/images/delete", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    });
    return res.ok;
  }

  async function handleConfirm() {
    if (!pending) return;
    setDeleting(true);
    setError(null);

    try {
      if (pending.kind === "file") {
        const ok = await deleteSingleFile(pending.path);
        if (!ok) throw new Error("Delete failed");
        setDirectories((prev) =>
          prev
            .map((dir) => {
              const files = dir.files.filter((f) => f.path !== pending.path);
              return {
                ...dir,
                files,
                fileCount: files.length,
                totalSize: files.reduce((acc, f) => acc + f.size, 0),
              };
            })
            .filter((dir) => dir.fileCount > 0)
        );
      } else {
        // Delete all files in the directory sequentially
        for (const path of pending.paths) {
          const ok = await deleteSingleFile(path);
          if (!ok) throw new Error(`Failed to delete ${path}`);
        }
        setDirectories((prev) =>
          prev.filter((dir) => dir.slug !== pending.slug)
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setDeleting(false);
      setPending(null);
    }
  }

  function handleCancel() {
    setPending(null);
    setError(null);
  }

  if (directories.length === 0) {
    return (
      <p className="font-mono text-xs text-on-surface-variant">
        No image directories found.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {/* Summary */}
      <div className="flex gap-6 font-mono text-xs text-on-surface-variant">
        <span>
          <span className="text-on-surface">{totalDirs}</span> directories
        </span>
        <span>
          <span className="text-on-surface">{totalImages}</span> images
        </span>
        <span>
          <span className="text-on-surface">{formatBytes(totalSize)}</span>{" "}
          total
        </span>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 font-mono text-xs text-red-400">
          Error: {error}
        </div>
      )}

      {/* Directory cards */}
      <div className="space-y-6">
        {directories.map((dir) => (
          <div
            key={dir.slug}
            className="rounded-xl border border-outline-variant/10 bg-surface-low p-6 transition-all duration-300 hover:border-primary/20 hover:bg-surface-high"
          >
            {/* Directory header */}
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <span className="font-mono text-sm text-on-surface">
                {dir.slug}
              </span>
              {dir.isOrphaned && (
                <span className="rounded bg-amber-500/15 px-1.5 py-0.5 font-mono text-[10px] text-amber-400">
                  orphaned
                </span>
              )}
              <span className="font-mono text-xs text-on-surface-variant">
                {dir.fileCount} {dir.fileCount === 1 ? "file" : "files"} ·{" "}
                {formatBytes(dir.totalSize)}
              </span>

              {/* Directory delete button (orphaned only) */}
              {dir.isOrphaned && (
                <div className="ml-auto">
                  {pending?.kind === "directory" &&
                  pending.slug === dir.slug ? (
                    <span className="flex items-center gap-2 font-mono text-[11px] text-on-surface-variant">
                      Delete all {dir.fileCount} files?
                      <button
                        disabled={deleting}
                        onClick={handleConfirm}
                        className="rounded-lg border border-red-500 bg-red-500/10 px-2 py-1 font-mono text-[11px] text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                      >
                        {deleting ? "Deleting…" : "Confirm"}
                      </button>
                      <button
                        disabled={deleting}
                        onClick={handleCancel}
                        className="rounded-lg border border-outline-variant/20 px-2 py-1 font-mono text-[11px] text-on-surface-variant disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() =>
                        setPending({
                          kind: "directory",
                          slug: dir.slug,
                          paths: dir.files.map((f) => f.path),
                        })
                      }
                      className="rounded-lg border border-red-500/30 px-2 py-1 font-mono text-[11px] text-red-400 hover:bg-red-500/10"
                    >
                      Delete directory
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Thumbnail grid */}
            {dir.files.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {dir.files.map((file) => (
                  <div key={file.sha} className="flex flex-col gap-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={file.downloadUrl}
                      alt={file.name}
                      className="h-16 w-16 rounded border border-outline-variant/10 object-cover"
                    />
                    <span
                      className="max-w-[64px] truncate font-mono text-[9px] text-on-surface-variant"
                      title={file.name}
                    >
                      {file.name}
                    </span>
                    <span className="font-mono text-[9px] text-outline">
                      {formatBytes(file.size)}
                    </span>

                    {/* Per-file delete */}
                    {pending?.kind === "file" &&
                    pending.path === file.path ? (
                      <div className="flex flex-col gap-1">
                        <span className="font-mono text-[9px] text-on-surface-variant">
                          Delete?
                        </span>
                        <button
                          disabled={deleting}
                          onClick={handleConfirm}
                          className="rounded-lg border border-red-500 bg-red-500/10 px-2 py-1 font-mono text-[11px] text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                        >
                          {deleting ? "…" : "Confirm"}
                        </button>
                        <button
                          disabled={deleting}
                          onClick={handleCancel}
                          className="rounded-lg border border-outline-variant/20 px-2 py-1 font-mono text-[11px] text-on-surface-variant disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() =>
                          setPending({
                            kind: "file",
                            path: file.path,
                            name: file.name,
                          })
                        }
                        className="rounded-lg border border-red-500/30 px-2 py-1 font-mono text-[11px] text-red-400 hover:bg-red-500/10"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
