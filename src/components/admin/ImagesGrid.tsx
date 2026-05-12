"use client";

import { useState } from "react";
import { ImageDirectory, ImageFile, formatSize } from "@/lib/imageTypes";

interface ImageGridProps {
  directories: ImageDirectory[];
}

export function ImagesGrid({ directories }: ImageGridProps) {
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDeleteFile = async (
    dirName: string,
    fileName: string | undefined,
    isOrphaned: boolean
  ) => {
    const filePath = fileName ? `public/images/${dirName}/${fileName}` : `public/images/${dirName}`;
    setDeleting(filePath);
    setError(null);

    try {
      const res = await fetch("/api/images/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: filePath, postSlug: dirName, isOrphaned }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete image");
      }

      // Reload page to show updated state
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete image");
    } finally {
      setDeleting(null);
      setConfirmDelete(null);
    }
  };

  const handleDeleteDirectory = async (dirName: string) => {
    setDeleting(`dir:${dirName}`);
    setError(null);

    try {
      const res = await fetch("/api/images/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: `public/images/${dirName}`, isOrphaned: true }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete directory");
      }

      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete directory");
    } finally {
      setDeleting(null);
      setConfirmDelete(null);
    }
  };

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const handleDeleteClick = (
    dirName: string,
    fileName?: string,
    isOrphaned?: boolean
  ) => {
    if (fileName) {
      setConfirmDelete(`${dirName}:${fileName}`);
    } else if (isOrphaned && dirName) {
      setConfirmDelete(`dir:${dirName}`);
    }
  };

  return (
    <div className="space-y-6">
      {directories.map((dir) => (
        <div
          key={dir.name}
          className={`glow-card rounded-xl border p-6 transition-all duration-300 ${
            dir.isOrphaned
              ? "border-warning/20 bg-warning/5"
              : "border-outline-variant/10 bg-surface-low hover:border-primary/20 hover:bg-surface-high"
          }`}
        >
          <div className="mb-4 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <h3 className="font-mono text-sm font-medium text-on-surface">
                {dir.name}
              </h3>
              {dir.isOrphaned && (
                <span className="rounded-md bg-warning px-2 py-0.5 text-[10px] font-medium text-warning-foreground">
                  ORPHANED
                </span>
              )}
            </div>
            <div className="text-xs text-on-surface-variant">
              {dir.fileCount} files • {formatSize(dir.totalSize)}
            </div>
          </div>

          {/* File Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {dir.files.map((file) => (
              <div
                key={file.name}
                className="group relative overflow-hidden rounded-lg border border-outline-variant/10 bg-surface hover:border-outline-variant/30"
              >
                {/* Thumbnail */}
                <div className="aspect-square overflow-hidden bg-surface-high">
                  {file.isImage ? (
                    <img
                      src={`/images/${dir.name}/${file.name}`}
                      alt={file.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-4xl">
                      📄
                    </div>
                  )}
                </div>

                {/* Info overlay */}
                <div className="border-t border-outline-variant/10 bg-surface px-2 py-2">
                  <div className="truncate text-[10px] font-mono text-on-surface">
                    {file.name}
                  </div>
                  <div className="text-[10px] text-on-surface-variant">
                    {formatSize(file.size)}
                  </div>
                </div>

                {/* Delete button */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    handleDeleteClick(dir.name, file.name, dir.isOrphaned);
                  }}
                  disabled={deleting !== null}
                  className="absolute left-2 top-2 rounded bg-destructive/80 px-2 py-1 text-[10px] font-medium text-destructive-foreground opacity-0 transition-opacity duration-200 group-hover:opacity-100 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>

          {/* Delete Directory Button (only for orphaned) */}
          {dir.isOrphaned && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => handleDeleteClick(dir.name, undefined, true)}
                disabled={deleting !== null}
                className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-50"
              >
                {deleting?.startsWith(`dir:${dir.name}`) ? (
                  <>
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-destructive border-t-transparent" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <span>🗑️</span>
                    Delete Entire Directory
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      ))}

      {directories.length === 0 && (
        <div className="rounded-xl border border-outline-variant/10 bg-surface-low p-12 text-center">
          <div className="mb-2 text-4xl">📷</div>
          <h3 className="font-mono text-sm font-medium text-on-surface">
            No Images Found
          </h3>
          <p className="mt-1 text-xs text-on-surface-variant">
            There are no image directories in public/images/
          </p>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl border border-outline-variant/10 bg-surface p-6 shadow-xl">
            <div className="mb-4 text-center">
              <div className="mb-2 text-3xl">⚠️</div>
              <h3 className="font-mono text-sm font-medium text-on-surface">
                Confirm Deletion
              </h3>
              <p className="mt-1 text-xs text-on-surface-variant">
                This action cannot be undone.
              </p>
            </div>

            <div className="mb-6 rounded-lg bg-surface-low p-3 text-center">
              <code className="text-xs text-on-surface">
                {confirmDelete.replace("dir:", "")}
              </code>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deleting !== null}
                className="flex-1 rounded-lg border border-outline-variant/10 bg-surface px-4 py-2 text-xs font-medium text-on-surface transition-colors hover:bg-surface-high disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const [dir, ...fileParts] = confirmDelete.split(":");
                  const fileName = fileParts.join(":");
                  handleDeleteFile(
                    dir,
                    fileName || undefined,
                    confirmDelete.startsWith("dir:")
                  );
                }}
                disabled={deleting !== null}
                className="flex-1 rounded-lg bg-destructive px-4 py-2 text-xs font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-4 right-4 z-50 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
    </div>
  );
}
