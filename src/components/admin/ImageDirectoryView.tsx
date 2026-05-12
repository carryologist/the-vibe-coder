"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ImageDirectory, ImageFile } from "@/lib/image-types";
import { formatBytes } from "@/lib/image-types";

interface Props {
  directory: ImageDirectory;
}

export function ImageDirectoryView({ directory: initial }: Props) {
  const router = useRouter();
  const [directory, setDirectory] = useState(initial);
  const [pending, setPending] = useState<ImageFile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmDelete() {
    if (!pending) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch("/api/images", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: pending.repoPath }),
      });
      if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
      const data = await res.json();
      if (!data.success) throw new Error("Delete failed");

      // Optimistically remove from local state.
      const remaining = directory.files.filter(
        (f) => f.repoPath !== pending.repoPath
      );
      setDirectory({
        ...directory,
        files: remaining,
        fileCount: remaining.length,
        totalSize: remaining.reduce((acc, f) => acc + f.size, 0),
      });

      // If the directory is now empty and was orphaned, send the admin
      // back to the list so they don't stare at an empty page.
      if (remaining.length === 0 && directory.orphaned) {
        router.push("/admin/images");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setDeleting(false);
      setPending(null);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="font-mono text-xs uppercase tracking-widest text-primary">
            // {directory.slug}
          </h1>
          {directory.postTitle && (
            <p className="mt-1 text-sm text-on-surface-variant">
              {directory.postTitle}
              {directory.postPublished === false && (
                <span className="ml-2 rounded bg-secondary/15 px-1.5 py-0.5 font-mono text-[10px] text-secondary">
                  draft
                </span>
              )}
            </p>
          )}
          {directory.orphaned && (
            <p className="mt-1 font-mono text-xs text-red-400">
              orphaned — no post references this directory
            </p>
          )}
        </div>
        <span className="font-mono text-xs text-on-surface-variant">
          {directory.fileCount} {directory.fileCount === 1 ? "file" : "files"}{" "}
          · {formatBytes(directory.totalSize)}
        </span>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-2 font-mono text-xs text-red-400">
          {error}
        </div>
      )}

      {directory.files.length === 0 ? (
        <p className="font-mono text-xs text-on-surface-variant">
          Directory is empty.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {directory.files.map((file) => (
            <FileCard
              key={file.sha}
              file={file}
              onDelete={() => setPending(file)}
            />
          ))}
        </div>
      )}

      {pending && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 px-4"
        >
          <div className="w-full max-w-md rounded-xl border border-red-500/30 bg-surface-low p-6">
            <h3 className="mb-3 font-mono text-xs uppercase tracking-widest text-red-400">
              // Confirm Delete
            </h3>
            <p className="mb-1 font-mono text-sm text-on-surface">
              Delete <span className="text-red-400">{pending.name}</span>?
            </p>
            <p className="mb-5 text-xs text-on-surface-variant break-all">
              {pending.repoPath}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setPending(null)}
                disabled={deleting}
                className="rounded-lg border border-outline-variant/20 px-3 py-1.5 font-mono text-[11px] text-on-surface-variant transition-colors hover:border-on-surface/30 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="rounded-lg border border-red-500 bg-red-500/10 px-3 py-1.5 font-mono text-[11px] font-medium text-red-400 transition-all hover:bg-red-500/20 disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FileCard({
  file,
  onDelete,
}: {
  file: ImageFile;
  onDelete: () => void;
}) {
  return (
    <div className="group rounded-xl border border-outline-variant/10 bg-surface-low p-2 transition-all hover:border-primary/20">
      <div className="relative mb-2 aspect-square overflow-hidden rounded bg-surface-high">
        {file.isImage ? (
          // eslint-disable-next-line @next/next/no-img-element -- public/images thumbnails, not configured for next/image at arbitrary slugs
          <img
            src={file.publicPath}
            alt={file.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl">
            📄
          </div>
        )}
      </div>
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0 flex-1">
          <p
            className="truncate font-mono text-[10px] text-on-surface"
            title={file.name}
          >
            {file.name}
          </p>
          <p className="font-mono text-[10px] text-on-surface-variant">
            {formatBytes(file.size)}
          </p>
        </div>
        <button
          onClick={onDelete}
          className="rounded border border-red-500/30 px-1.5 py-0.5 font-mono text-[10px] text-red-400 opacity-0 transition-opacity hover:bg-red-500/10 group-hover:opacity-100"
          aria-label={`Delete ${file.name}`}
        >
          ×
        </button>
      </div>
    </div>
  );
}
