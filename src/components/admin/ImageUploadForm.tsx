"use client";

import { useRef, useState } from "react";
import { sanitizeSlug } from "@/lib/slug";
import type { ImageFile } from "@/lib/image-types";

interface Props {
  /** Slugs of directories that already exist under public/images/. */
  existingSlugs: string[];
  onUploaded: (slug: string, file: ImageFile) => void;
}

const NEW_DIR_VALUE = "__new__";

/**
 * Upload widget for the admin Images panel. Wraps the existing
 * POST /api/images endpoint (already used by the post editor's inline
 * image insertion) so uploads can also happen directly from the Images
 * browser instead of only mid-post-edit.
 */
export function ImageUploadForm({ existingSlugs, onUploaded }: Props) {
  const [target, setTarget] = useState(existingSlugs[0] ?? NEW_DIR_VALUE);
  const [newSlug, setNewSlug] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isNewDir = target === NEW_DIR_VALUE || existingSlugs.length === 0;
  const resolvedSlug = isNewDir ? sanitizeSlug(newSlug) : target;

  async function uploadFiles(files: FileList | File[]) {
    setError(null);

    if (!resolvedSlug) {
      setError("Choose or enter a target directory first.");
      return;
    }

    const images = Array.from(files).filter((f) =>
      f.type.startsWith("image/")
    );
    if (images.length === 0) {
      setError("No image files selected.");
      return;
    }

    setUploading(true);
    try {
      // Sequential, not Promise.all — each upload reads the directory's
      // current SHA before committing, so racing uploads to a brand-new
      // directory could stomp on each other.
      for (const file of images) {
        const formData = new FormData();
        formData.append("slug", resolvedSlug);
        formData.append("image", file);

        const res = await fetch("/api/images", {
          method: "POST",
          body: formData,
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(
            body?.error ?? `Upload failed for ${file.name} (${res.status})`
          );
        }
        const data = await res.json();
        const publicPath: string = data.path;
        const name = publicPath.split("/").pop() ?? file.name;

        onUploaded(resolvedSlug, {
          name,
          publicPath,
          repoPath: `public/images/${resolvedSlug}/${name}`,
          size: file.size,
          // The upload endpoint doesn't return a blob SHA; harmless
          // placeholder since it's only used as a React list key /
          // delete-target, and the next full page load refreshes it
          // from GitHub for real.
          sha: `pending-${name}-${Date.now()}`,
          isImage: true,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="rounded-xl border border-outline-variant/10 bg-surface-low p-5">
      <h2 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-primary">
        Upload
      </h2>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label className="font-mono text-[11px] text-on-surface-variant">
          Target directory
        </label>
        {existingSlugs.length > 0 && (
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="rounded-lg border border-outline-variant bg-bg px-2 py-1 font-mono text-xs text-on-surface outline-none focus:border-primary/50"
          >
            {existingSlugs.map((slug) => (
              <option key={slug} value={slug}>
                {slug}
              </option>
            ))}
            <option value={NEW_DIR_VALUE}>+ New directory…</option>
          </select>
        )}
        {isNewDir && (
          <>
            <input
              value={newSlug}
              onChange={(e) => setNewSlug(e.target.value)}
              placeholder="new-post-slug"
              className="rounded-lg border border-outline-variant bg-bg px-2 py-1 font-mono text-xs text-on-surface placeholder-outline outline-none focus:border-primary/50"
            />
            {newSlug && (
              <span className="font-mono text-[11px] text-outline">
                → public/images/{resolvedSlug || "…"}/
              </span>
            )}
          </>
        )}
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border-2 border-dashed px-6 py-6 transition-colors ${
          dragOver
            ? "border-primary/50 bg-primary/5"
            : "border-outline-variant hover:border-on-surface-variant/30"
        } ${uploading ? "pointer-events-none opacity-60" : ""}`}
      >
        <p className="font-mono text-xs text-on-surface-variant">
          {uploading ? "Uploading…" : "Drop images here or click to browse"}
        </p>
        <p className="font-mono text-[11px] text-outline">
          Commits directly to <code>main</code> on the content repo.
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => e.target.files && uploadFiles(e.target.files)}
          className="hidden"
        />
      </div>

      {error && <p className="mt-2 font-mono text-xs text-red-400">{error}</p>}
    </div>
  );
}
