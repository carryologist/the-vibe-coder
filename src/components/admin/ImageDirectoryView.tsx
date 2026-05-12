"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ImageDirectory } from "@/lib/images-shared";
import { formatBytes } from "@/lib/images-shared";

interface Props {
  directory: ImageDirectory;
}

type DeletePending =
  | { kind: "none" }
  | { kind: "file"; repoPath: string }
  | { kind: "directory" };

export function ImageDirectoryView({ directory }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState<DeletePending>({ kind: "none" });
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function deletePaths(paths: string[]): Promise<boolean> {
    setError(null);
    const res = await fetch("/api/images", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paths }),
    });
    if (!res.ok && res.status !== 207) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? `Request failed: ${res.status}`);
      return false;
    }
    const data = (await res.json()) as {
      success: boolean;
      results: { path: string; ok: boolean; error?: string }[];
    };
    if (!data.success) {
      const failed = data.results.filter((r) => !r.ok);
      setError(
        `Failed to delete ${failed.length} of ${data.results.length} file(s): ${failed[0]?.error ?? "unknown"}`,
      );
      return false;
    }
    return true;
  }

  async function confirmDeleteFile(repoPath: string) {
    setBusy(repoPath);
    const ok = await deletePaths([repoPath]);
    setBusy(null);
    setPending({ kind: "none" });
    if (ok) {
      router.refresh();
    }
  }

  async function confirmDeleteDirectory() {
    if (directory.files.length === 0) {
      setPending({ kind: "none" });
      return;
    }
    setBusy("__dir__");
    const ok = await deletePaths(directory.files.map((f) => f.repoPath));
    setBusy(null);
    setPending({ kind: "none" });
    if (ok) {
      // Directory will be empty after all files are deleted; bounce to
      // the listing where it will no longer appear.
      router.push("/admin/images");
      router.refresh();
    }
  }

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 p-3 font-mono text-xs text-red-300">
          {error}
        </div>
      )}

      {directory.orphaned && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/5 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-mono text-xs uppercase tracking-widest text-red-400">
                // Orphaned directory
              </h2>
              <p className="mt-2 text-xs text-on-surface-variant">
                No published or draft post matches the slug{" "}
                <code className="font-mono text-on-surface">{directory.slug}</code>.
                Safe to delete if you don&apos;t plan to reuse it.
              </p>
            </div>
            {pending.kind === "directory" ? (
              <div className="flex flex-shrink-0 gap-2">
                <button
                  onClick={confirmDeleteDirectory}
                  disabled={busy !== null}
                  className="rounded-md border border-red-500 bg-red-500 px-3 py-1.5 font-mono text-xs font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50"
                >
                  {busy === "__dir__"
                    ? "Deleting…"
                    : `Confirm delete ${directory.fileCount} file(s)`}
                </button>
                <button
                  onClick={() => setPending({ kind: "none" })}
                  disabled={busy !== null}
                  className="rounded-md border border-outline-variant px-3 py-1.5 font-mono text-xs text-on-surface-variant transition-colors hover:bg-surface-high disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setPending({ kind: "directory" })}
                disabled={busy !== null || directory.fileCount === 0}
                className="flex-shrink-0 rounded-md border border-red-500/40 px-3 py-1.5 font-mono text-xs text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
              >
                Delete entire directory
              </button>
            )}
          </div>
        </div>
      )}

      {directory.files.length === 0 ? (
        <p className="font-mono text-sm text-on-surface-variant">
          Directory is empty.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {directory.files.map((file) => {
            const isPending =
              pending.kind === "file" && pending.repoPath === file.repoPath;
            const isBusy = busy === file.repoPath;
            return (
              <div
                key={file.repoPath}
                className="glow-card flex flex-col overflow-hidden rounded-xl border border-outline-variant/10 bg-surface-low"
              >
                <div className="aspect-video w-full overflow-hidden bg-surface">
                  {file.isImage ? (
                    // eslint-disable-next-line @next/next/no-img-element -- arbitrary content slugs; not configured for next/image
                    <img
                      src={file.publicPath}
                      alt={file.name}
                      className="h-full w-full object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center font-mono text-xs text-outline">
                      {file.name.split(".").pop()?.toUpperCase() ?? "FILE"}
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-3">
                  <p
                    className="truncate font-mono text-xs text-on-surface"
                    title={file.name}
                  >
                    {file.name}
                  </p>
                  <p className="mt-1 font-mono text-[10px] text-outline">
                    {formatBytes(file.size)}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <a
                      href={file.publicPath}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-[11px] text-on-surface-variant transition-colors hover:text-primary"
                    >
                      Open
                    </a>
                    <span className="text-outline">·</span>
                    {isPending ? (
                      <>
                        <button
                          onClick={() => confirmDeleteFile(file.repoPath)}
                          disabled={busy !== null}
                          className="font-mono text-[11px] font-medium text-red-400 transition-colors hover:text-red-300 disabled:opacity-50"
                        >
                          {isBusy ? "Deleting…" : "Confirm?"}
                        </button>
                        <button
                          onClick={() => setPending({ kind: "none" })}
                          disabled={busy !== null}
                          className="font-mono text-[11px] text-outline transition-colors hover:text-on-surface disabled:opacity-50"
                        >
                          cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() =>
                          setPending({ kind: "file", repoPath: file.repoPath })
                        }
                        disabled={busy !== null}
                        className="font-mono text-[11px] text-on-surface-variant transition-colors hover:text-red-400 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
