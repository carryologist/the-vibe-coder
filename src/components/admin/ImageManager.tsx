"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ImageDirectory, LooseImageFile } from "@/lib/image-types";
import { formatBytes } from "@/lib/image-types";

interface Props {
  directories: ImageDirectory[];
  looseFiles?: LooseImageFile[];
}

export function ImageManager({ directories: initial, looseFiles: initialLoose = [] }: Props) {
  const [directories, setDirectories] = useState(initial);
  const [looseFiles, setLooseFiles] = useState(initialLoose);
  const [pending, setPending] = useState<{
    slug: string;
    paths: string[];
  } | null>(null);
  const [pendingLoose, setPendingLoose] = useState<LooseImageFile | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const orphans = useMemo(
    () => directories.filter((d) => d.orphaned),
    [directories]
  );
  const matched = useMemo(
    () => directories.filter((d) => !d.orphaned),
    [directories]
  );

  async function confirmDelete() {
    if (!pending) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch("/api/images", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paths: pending.paths }),
      });
      if (!res.ok && res.status !== 207) {
        throw new Error(`Delete failed: ${res.status}`);
      }
      const data = await res.json();
      if (!data.success) {
        const failed = (data.results ?? []).filter(
          (r: { ok: boolean }) => !r.ok
        );
        throw new Error(
          `Partial failure (${failed.length}/${pending.paths.length} files)`
        );
      }
      setDirectories((prev) => prev.filter((d) => d.slug !== pending.slug));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setDeleting(false);
      setPending(null);
    }
  }

  async function confirmDeleteLoose() {
    if (!pendingLoose) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch("/api/images", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: pendingLoose.repoPath }),
      });
      if (!res.ok && res.status !== 207) {
        throw new Error(`Delete failed: ${res.status}`);
      }
      const data = await res.json();
      if (!data.success) {
        throw new Error("Delete failed");
      }
      setLooseFiles((prev) =>
        prev.filter((f) => f.repoPath !== pendingLoose.repoPath)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setDeleting(false);
      setPendingLoose(null);
    }
  }

  if (directories.length === 0 && looseFiles.length === 0) {
    return (
      <p className="font-mono text-xs text-on-surface-variant">
        No image directories found under <code>public/images/</code>.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-2 font-mono text-xs text-red-400">
          {error}
        </div>
      )}

      {looseFiles.length > 0 && (
        <section>
          <h2 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-secondary">
            Loose Files ({looseFiles.length})
          </h2>
          <p className="mb-3 font-mono text-[11px] text-on-surface-variant">
            Files directly under <code>public/images/</code> with no per-post
            directory of their own — usually shared branding/favicon assets.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {looseFiles.map((file) => (
              <LooseFileCard
                key={file.repoPath}
                file={file}
                onDelete={() => setPendingLoose(file)}
              />
            ))}
          </div>
        </section>
      )}

      {orphans.length > 0 && (
        <section>
          <h2 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-red-400">
            Orphaned ({orphans.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {orphans.map((dir) => (
              <DirectoryCard
                key={dir.slug}
                dir={dir}
                onDeleteDirectory={(d) =>
                  setPending({
                    slug: d.slug,
                    paths: d.files.map((f) => f.repoPath),
                  })
                }
              />
            ))}
          </div>
        </section>
      )}

      {matched.length > 0 && (
        <section>
          <h2 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-secondary">
            By Post ({matched.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {matched.map((dir) => (
              <DirectoryCard key={dir.slug} dir={dir} />
            ))}
          </div>
        </section>
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
              Delete{" "}
              <span className="text-red-400">{pending.paths.length}</span>{" "}
              file{pending.paths.length === 1 ? "" : "s"} in{" "}
              <span className="text-on-surface">{pending.slug}</span>?
            </p>
            <p className="mb-5 text-xs text-on-surface-variant">
              Commits directly to <code>main</code> on the content repo. There
              is no undo.
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

      {pendingLoose && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 px-4"
        >
          <div className="w-full max-w-md rounded-xl border border-red-500/30 bg-surface-low p-6">
            <h3 className="mb-3 font-mono text-xs uppercase tracking-widest text-red-400">
              {"// Confirm Delete"}
            </h3>
            <p className="mb-1 font-mono text-sm text-on-surface">
              Delete <span className="text-red-400">{pendingLoose.name}</span>?
            </p>
            {pendingLoose.orphaned ? (
              <p className="mb-5 text-xs text-on-surface-variant">
                Nothing references this file. Commits directly to{" "}
                <code>main</code> on the content repo. There is no undo.
              </p>
            ) : (
              <p className="mb-5 text-xs text-amber-400">
                Warning: this file is referenced
                {pendingLoose.matchKind === "static"
                  ? " by static app source (e.g. a favicon or branding asset)"
                  : " in a post body"}
                . Deleting it may break something. Commits directly to{" "}
                <code>main</code> on the content repo. There is no undo.
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setPendingLoose(null)}
                disabled={deleting}
                className="rounded-lg border border-outline-variant/20 px-3 py-1.5 font-mono text-[11px] text-on-surface-variant transition-colors hover:border-on-surface/30 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteLoose}
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

function LooseFileCard({
  file,
  onDelete,
}: {
  file: LooseImageFile;
  onDelete: () => void;
}) {
  return (
    <div className="group glow-card rounded-xl border border-outline-variant/10 bg-surface-low p-5 transition-all duration-300 hover:border-primary/20 hover:bg-surface-high">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p
            className="truncate font-mono text-sm font-medium text-on-surface"
            title={file.name}
          >
            {file.name}
          </p>
          <p className="mt-0.5 truncate text-xs text-on-surface-variant">
            {file.publicPath}
          </p>
        </div>
        <LooseFileBadge file={file} />
      </div>

      <div className="mt-3 flex items-center justify-between font-mono text-[11px] text-on-surface-variant">
        <span>{formatBytes(file.size)}</span>
        <button
          onClick={onDelete}
          className="rounded-lg border border-red-500/30 px-2 py-0.5 text-[11px] text-red-400 transition-colors hover:bg-red-500/10"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function LooseFileBadge({ file }: { file: LooseImageFile }) {
  if (file.orphaned) {
    return (
      <span className="rounded bg-red-500/15 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-red-400">
        orphaned
      </span>
    );
  }
  if (file.matchKind === "static") {
    return (
      <span
        title="Referenced by hardcoded static app source (e.g. layout.tsx, about/page.tsx)"
        className="rounded bg-secondary/15 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-secondary"
      >
        static
      </span>
    );
  }
  if (file.matchKind === "content") {
    return (
      <span
        title="Matched by reference in a post body"
        className="rounded bg-secondary/15 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-secondary"
      >
        in body
      </span>
    );
  }
  return null;
}

function DirectoryCard({
  dir,
  onDeleteDirectory,
}: {
  dir: ImageDirectory;
  onDeleteDirectory?: (d: ImageDirectory) => void;
}) {
  return (
    <div className="group glow-card rounded-xl border border-outline-variant/10 bg-surface-low p-5 transition-all duration-300 hover:border-primary/20 hover:bg-surface-high">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Link
            href={`/admin/images/${dir.slug}`}
            className="block truncate font-mono text-sm font-medium text-on-surface transition-colors hover:text-primary"
            title={dir.slug}
          >
            {dir.slug}
          </Link>
          {dir.postTitle && (
            <p
              className="mt-0.5 truncate text-xs text-on-surface-variant"
              title={dir.postTitle}
            >
              {dir.postTitle}
            </p>
          )}
        </div>
        <MatchBadge dir={dir} />
      </div>

      <div className="mt-3 flex items-center justify-between font-mono text-[11px] text-on-surface-variant">
        <span>
          {dir.fileCount} {dir.fileCount === 1 ? "file" : "files"} ·{" "}
          {formatBytes(dir.totalSize)}
        </span>
        {dir.orphaned && onDeleteDirectory && dir.fileCount > 0 && (
          <button
            onClick={() => onDeleteDirectory(dir)}
            className="rounded-lg border border-red-500/30 px-2 py-0.5 text-[11px] text-red-400 transition-colors hover:bg-red-500/10"
          >
            Delete all
          </button>
        )}
      </div>
    </div>
  );
}

function MatchBadge({ dir }: { dir: ImageDirectory }) {
  if (dir.orphaned) {
    return (
      <span className="rounded bg-red-500/15 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-red-400">
        orphaned
      </span>
    );
  }
  if (dir.matchKind === "prefix") {
    return (
      <span
        title="Matched by slug prefix"
        className="rounded bg-secondary/15 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-secondary"
      >
        prefix
      </span>
    );
  }
  if (dir.matchKind === "content") {
    return (
      <span
        title="Matched by reference in a post body"
        className="rounded bg-secondary/15 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-secondary"
      >
        in body
      </span>
    );
  }
  if (dir.matchKind === "static") {
    return (
      <span
        title="Referenced by hardcoded static app source (e.g. layout.tsx, about/page.tsx)"
        className="rounded bg-secondary/15 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-secondary"
      >
        static
      </span>
    );
  }
  return null;
}
