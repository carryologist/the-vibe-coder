"use client";

import { useState, useCallback } from "react";

interface ImageDirectory {
  slug: string;
  fileCount: number;
  totalSize: number;
  hasMatchingPost: boolean;
  matchingPostTitle: string | null;
}

interface ImageFile {
  name: string;
  path: string;
  size: number;
  url: string;
  download_url: string | null;
}

interface DirectoriesResponse {
  directories: ImageDirectory[];
  totalDirectories: number;
  orphanedCount: number;
}

interface FilesResponse {
  slug: string;
  files: ImageFile[];
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function ImageBrowser({
  initialData,
}: {
  initialData: DirectoriesResponse;
}) {
  const [data, setData] = useState<DirectoriesResponse>(initialData);
  const [selectedDir, setSelectedDir] = useState<string | null>(null);
  const [files, setFiles] = useState<ImageFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmDeleteDir, setConfirmDeleteDir] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = useCallback(async (slug: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/images/manage?slug=${encodeURIComponent(slug)}`);
      if (!res.ok) throw new Error("Failed to fetch files");
      const data: FilesResponse = await res.json();
      setFiles(data.files);
      setSelectedDir(slug);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load files");
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshDirectories = useCallback(async () => {
    try {
      const res = await fetch("/api/images/manage");
      if (!res.ok) throw new Error("Failed to refresh");
      const newData: DirectoriesResponse = await res.json();
      setData(newData);
    } catch {
      // Silently fail — stale data is still usable
    }
  }, []);

  const handleDeleteFile = useCallback(async (filePath: string) => {
    setDeleting(filePath);
    setError(null);
    try {
      const res = await fetch("/api/images/manage", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: filePath }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }
      // Remove from local state
      setFiles((prev) => prev.filter((f) => f.path !== filePath));
      setConfirmDelete(null);
      // Refresh directory list for updated counts
      await refreshDirectories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete file");
    } finally {
      setDeleting(null);
    }
  }, [refreshDirectories]);

  const handleDeleteDirectory = useCallback(async (slug: string) => {
    setDeleting(slug);
    setError(null);
    try {
      const res = await fetch("/api/images/manage", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, all: true }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete directory");
      }
      setConfirmDeleteDir(null);
      if (selectedDir === slug) {
        setSelectedDir(null);
        setFiles([]);
      }
      // Refresh
      await refreshDirectories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete directory");
    } finally {
      setDeleting(null);
    }
  }, [selectedDir, refreshDirectories]);

  const isImageFile = (name: string): boolean => {
    return /\.(png|jpg|jpeg|gif|webp|svg|avif|ico)$/i.test(name);
  };

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-lg border border-red-400/30 bg-red-400/10 p-3 font-mono text-xs text-red-400">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-400/60 hover:text-red-400"
          >
            ✕
          </button>
        </div>
      )}

      {/* Directory list / file viewer */}
      {selectedDir ? (
        <div>
          {/* Breadcrumb */}
          <div className="mb-6 flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedDir(null);
                setFiles([]);
              }}
              className="font-mono text-xs text-primary hover:text-primary-container transition-colors"
            >
              ← All directories
            </button>
            <span className="font-mono text-xs text-outline">/</span>
            <span className="font-mono text-xs text-on-surface">{selectedDir}</span>
            {(() => {
              const dir = data.directories.find((d) => d.slug === selectedDir);
              return dir && !dir.hasMatchingPost ? (
                <span className="ml-2 rounded bg-accent-warm/20 px-2 py-0.5 font-mono text-[10px] text-accent-warm">
                  ORPHANED
                </span>
              ) : null;
            })()}
          </div>

          {loading ? (
            <div className="py-12 text-center font-mono text-xs text-outline">
              Loading images...
            </div>
          ) : files.length === 0 ? (
            <div className="py-12 text-center font-mono text-xs text-outline">
              No files found.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {files.map((file) => (
                <div
                  key={file.path}
                  className="glow-card rounded-xl border border-outline-variant/10 bg-surface-low p-4 transition-all duration-300 hover:border-primary/20 hover:bg-surface-high"
                >
                  {/* Image preview or filename */}
                  {isImageFile(file.name) && file.download_url ? (
                    <div className="mb-3 overflow-hidden rounded-lg border border-outline-variant/10 bg-surface-lowest">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={file.download_url}
                        alt={file.name}
                        className="h-32 w-full object-contain"
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className="mb-3 flex h-32 items-center justify-center rounded-lg border border-outline-variant/10 bg-surface-lowest">
                      <span className="font-mono text-xs text-outline">📄 {file.name}</span>
                    </div>
                  )}

                  <div className="space-y-1">
                    <p className="truncate font-mono text-xs text-on-surface" title={file.name}>
                      {file.name}
                    </p>
                    <p className="font-mono text-[10px] text-outline">
                      {formatBytes(file.size)}
                    </p>
                  </div>

                  {/* Delete button / confirmation */}
                  <div className="mt-3">
                    {confirmDelete === file.path ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDeleteFile(file.path)}
                          disabled={deleting === file.path}
                          className="flex-1 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-1.5 font-mono text-[10px] text-red-400 transition-colors hover:bg-red-400/20 disabled:opacity-50"
                        >
                          {deleting === file.path ? "Deleting..." : "Confirm"}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          disabled={deleting === file.path}
                          className="rounded-lg border border-outline-variant/20 px-3 py-1.5 font-mono text-[10px] text-outline transition-colors hover:text-on-surface"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(file.path)}
                        className="w-full rounded-lg border border-outline-variant/10 px-3 py-1.5 font-mono text-[10px] text-outline transition-colors hover:border-red-400/30 hover:text-red-400"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Directory listing */
        <div className="space-y-3">
          {data.directories.map((dir) => (
            <div
              key={dir.slug}
              className="glow-card flex items-center gap-4 rounded-xl border border-outline-variant/10 bg-surface-low p-4 transition-all duration-300 hover:border-primary/20 hover:bg-surface-high"
            >
              <button
                onClick={() => fetchFiles(dir.slug)}
                className="flex flex-1 items-center gap-4 text-left"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-highest">
                  <span className="text-lg">🖼️</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-mono text-sm text-on-surface">
                      {dir.slug}
                    </p>
                    {!dir.hasMatchingPost && (
                      <span className="shrink-0 rounded bg-accent-warm/20 px-2 py-0.5 font-mono text-[10px] text-accent-warm">
                        ORPHANED
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[10px] text-outline">
                      {dir.fileCount} {dir.fileCount === 1 ? "file" : "files"}
                    </span>
                    <span className="font-mono text-[10px] text-outline">
                      {formatBytes(dir.totalSize)}
                    </span>
                    {dir.matchingPostTitle && (
                      <span className="truncate font-mono text-[10px] text-on-surface-variant">
                        → {dir.matchingPostTitle}
                      </span>
                    )}
                  </div>
                </div>
                <span className="shrink-0 font-mono text-xs text-outline">→</span>
              </button>

              {/* Delete directory button — only for orphaned dirs */}
              {!dir.hasMatchingPost && (
                <div className="shrink-0">
                  {confirmDeleteDir === dir.slug ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDeleteDirectory(dir.slug)}
                        disabled={deleting === dir.slug}
                        className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-1.5 font-mono text-[10px] text-red-400 transition-colors hover:bg-red-400/20 disabled:opacity-50"
                      >
                        {deleting === dir.slug ? "Deleting..." : "Delete all"}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteDir(null)}
                        disabled={deleting === dir.slug}
                        className="rounded-lg border border-outline-variant/20 px-3 py-1.5 font-mono text-[10px] text-outline transition-colors hover:text-on-surface"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteDir(dir.slug)}
                      className="rounded-lg border border-outline-variant/10 px-3 py-1.5 font-mono text-[10px] text-outline transition-colors hover:border-red-400/30 hover:text-red-400"
                      title="Delete entire orphaned directory"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
