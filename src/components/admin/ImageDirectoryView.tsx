"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { ImageDirectory, ImageFile } from "@/lib/image-types";
import { formatBytes } from "@/lib/image-types";

interface Props {
  directory: ImageDirectory;
}

type PendingDelete =
  | { kind: "single"; file: ImageFile }
  | { kind: "batch"; files: ImageFile[] };

export function ImageDirectoryView({ directory: initial }: Props) {
  const router = useRouter();
  const [directory, setDirectory] = useState(initial);
  const [pending, setPending] = useState<PendingDelete | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const selectedFiles = useMemo(
    () => directory.files.filter((f) => selected.has(f.sha)),
    [directory.files, selected]
  );

  function toggleSelect(sha: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(sha)) next.delete(sha);
      else next.add(sha);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(directory.files.map((f) => f.sha)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function exitSelectMode() {
    setSelectMode(false);
    clearSelection();
  }

  async function confirmDelete() {
    if (!pending) return;
    setDeleting(true);
    setError(null);

    const files =
      pending.kind === "single" ? [pending.file] : pending.files;

    try {
      const body =
        pending.kind === "single"
          ? { path: pending.file.repoPath }
          : { paths: pending.files.map((f) => f.repoPath) };

      const res = await fetch("/api/images", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      // 207 Multi-Status is a partial-success on a batch delete; treat it
      // as ok-with-warnings, not a hard fail.
      if (!res.ok && res.status !== 207) {
        throw new Error(`Delete failed: ${res.status}`);
      }
      const data = await res.json();
      if (!data.success && pending.kind === "single") {
        throw new Error("Delete failed");
      }

      // Drop the successfully-deleted files from state. For batch deletes
      // we trust the per-path results array; for single, the one file.
      const deletedPaths = new Set<string>();
      if (pending.kind === "single") {
        if (data.success) deletedPaths.add(pending.file.repoPath);
      } else {
        for (const r of (data.results ?? []) as {
          path: string;
          ok: boolean;
        }[]) {
          if (r.ok) deletedPaths.add(r.path);
        }
      }

      const remaining = directory.files.filter(
        (f) => !deletedPaths.has(f.repoPath)
      );
      setDirectory({
        ...directory,
        files: remaining,
        fileCount: remaining.length,
        totalSize: remaining.reduce((acc, f) => acc + f.size, 0),
      });

      // Drop deleted SHAs out of the selection.
      setSelected((prev) => {
        const next = new Set(prev);
        for (const f of files) if (deletedPaths.has(f.repoPath)) next.delete(f.sha);
        return next;
      });

      // Report partial failure inline rather than swallowing it.
      const failed = files.length - deletedPaths.size;
      if (failed > 0) {
        setError(
          `${failed} of ${files.length} ${
            files.length === 1 ? "file" : "files"
          } failed to delete`
        );
      }

      // Bounce back to the list if the directory is now empty and was
      // orphaned — staring at an empty page is bad UX.
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

  const totalSelected = selectedFiles.length;
  const totalSelectedSize = selectedFiles.reduce((acc, f) => acc + f.size, 0);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1
            className="font-mono text-xs uppercase tracking-widest text-primary"
            title={directory.slug}
          >
            // {directory.slug}
          </h1>
          {directory.postTitle && (
            <p
              className="mt-1 text-sm text-on-surface-variant"
              title={directory.postTitle}
            >
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

      {/* Selection toolbar */}
      {directory.files.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-outline-variant/10 bg-surface-low px-3 py-2">
          <div className="flex items-center gap-3 font-mono text-[11px] text-on-surface-variant">
            <button
              onClick={() =>
                selectMode ? exitSelectMode() : setSelectMode(true)
              }
              className={`rounded-lg border px-2 py-1 transition-colors ${
                selectMode
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-outline-variant/20 hover:border-primary/30 hover:text-primary"
              }`}
            >
              {selectMode ? "Done" : "Select"}
            </button>
            {selectMode && (
              <>
                <button
                  onClick={selectAll}
                  className="text-on-surface-variant transition-colors hover:text-on-surface"
                >
                  Select all
                </button>
                {totalSelected > 0 && (
                  <button
                    onClick={clearSelection}
                    className="text-on-surface-variant transition-colors hover:text-on-surface"
                  >
                    Clear
                  </button>
                )}
                <span className="text-outline">
                  {totalSelected} selected · {formatBytes(totalSelectedSize)}
                </span>
              </>
            )}
          </div>
          {selectMode && totalSelected > 0 && (
            <button
              onClick={() =>
                setPending({ kind: "batch", files: selectedFiles })
              }
              className="rounded-lg border border-red-500 bg-red-500/10 px-3 py-1 font-mono text-[11px] font-medium text-red-400 transition-all hover:bg-red-500/20"
            >
              Delete {totalSelected}
            </button>
          )}
        </div>
      )}

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
              selectMode={selectMode}
              selected={selected.has(file.sha)}
              onToggleSelect={() => toggleSelect(file.sha)}
              onDelete={() => setPending({ kind: "single", file })}
            />
          ))}
        </div>
      )}

      {pending && (
        <ConfirmDialog
          pending={pending}
          deleting={deleting}
          onCancel={() => setPending(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}

function ConfirmDialog({
  pending,
  deleting,
  onCancel,
  onConfirm,
}: {
  pending: PendingDelete;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const isBatch = pending.kind === "batch";
  const count = isBatch ? pending.files.length : 1;
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 px-4"
    >
      <div className="w-full max-w-md rounded-xl border border-red-500/30 bg-surface-low p-6">
        <h3 className="mb-3 font-mono text-xs uppercase tracking-widest text-red-400">
          // Confirm Delete
        </h3>
        {isBatch ? (
          <p className="mb-1 font-mono text-sm text-on-surface">
            Delete <span className="text-red-400">{count}</span> selected{" "}
            {count === 1 ? "file" : "files"}?
          </p>
        ) : (
          <p className="mb-1 font-mono text-sm text-on-surface">
            Delete{" "}
            <span className="text-red-400">{pending.file.name}</span>?
          </p>
        )}
        <p className="mb-5 text-xs text-on-surface-variant break-all">
          {isBatch
            ? "Commits each delete sequentially to main on the content repo. There is no undo."
            : pending.file.repoPath}
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="rounded-lg border border-outline-variant/20 px-3 py-1.5 font-mono text-[11px] text-on-surface-variant transition-colors hover:border-on-surface/30 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="rounded-lg border border-red-500 bg-red-500/10 px-3 py-1.5 font-mono text-[11px] font-medium text-red-400 transition-all hover:bg-red-500/20 disabled:opacity-50"
          >
            {deleting ? "Deleting…" : `Delete ${isBatch ? count : ""}`.trim()}
          </button>
        </div>
      </div>
    </div>
  );
}

function FileCard({
  file,
  selectMode,
  selected,
  onToggleSelect,
  onDelete,
}: {
  file: ImageFile;
  selectMode: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      onClick={selectMode ? onToggleSelect : undefined}
      className={`group rounded-xl border bg-surface-low p-2 transition-all ${
        selected
          ? "border-primary/60 ring-1 ring-primary/40"
          : "border-outline-variant/10 hover:border-primary/20"
      } ${selectMode ? "cursor-pointer" : ""}`}
    >
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
        {selectMode && (
          <div
            aria-hidden
            className={`absolute top-1.5 left-1.5 flex h-5 w-5 items-center justify-center rounded border font-mono text-[11px] ${
              selected
                ? "border-primary bg-primary text-bg"
                : "border-outline-variant/60 bg-bg/80 text-transparent"
            }`}
          >
            ✓
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
        {!selectMode && (
          <button
            onClick={onDelete}
            // Always visible on touch viewports (no :hover). Hover-only on lg+.
            className="rounded border border-red-500/30 px-1.5 py-0.5 font-mono text-[10px] text-red-400 transition-opacity hover:bg-red-500/10 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100"
            aria-label={`Delete ${file.name}`}
            title={`Delete ${file.name}`}
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
