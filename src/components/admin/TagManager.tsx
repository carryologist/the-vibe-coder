"use client";

import { useState } from "react";
import type { TagInfo } from "@/lib/tags";

interface Props {
  tags: TagInfo[];
}

export function TagManager({ tags: initial }: Props) {
  const [tags, setTags] = useState(initial);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(
    null
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function startRename(tag: string) {
    setError(null);
    setConfirmingDelete(null);
    setRenaming(tag);
    setRenameValue(tag);
  }

  function cancel() {
    setRenaming(null);
    setConfirmingDelete(null);
    setRenameValue("");
  }

  async function submitRename(tag: string) {
    const newTag = renameValue.trim();
    if (!newTag || newTag === tag) {
      cancel();
      return;
    }
    setBusy(tag);
    setError(null);
    try {
      const res = await fetch(`/api/admin/tags/${encodeURIComponent(tag)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newTag }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? `Rename failed: ${res.status}`);
      }
      setTags((prev) => {
        const renamed = prev.find((t) => t.tag === tag);
        if (!renamed) return prev;
        const existing = prev.find((t) => t.tag === newTag);
        const merged: TagInfo = existing
          ? {
              tag: newTag,
              count: existing.count + renamed.count,
              publishedCount:
                existing.publishedCount + renamed.publishedCount,
              draftCount: existing.draftCount + renamed.draftCount,
            }
          : { ...renamed, tag: newTag };
        return prev
          .filter((t) => t.tag !== tag && t.tag !== newTag)
          .concat(merged)
          .sort((a, b) => a.tag.localeCompare(b.tag));
      });
      cancel();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setBusy(null);
    }
  }

  async function submitDelete(tag: string) {
    setBusy(tag);
    setError(null);
    try {
      const res = await fetch(`/api/admin/tags/${encodeURIComponent(tag)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? `Delete failed: ${res.status}`);
      }
      setTags((prev) => prev.filter((t) => t.tag !== tag));
      cancel();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setBusy(null);
    }
  }

  if (tags.length === 0) {
    return (
      <p className="font-mono text-xs text-on-surface-variant">
        No tags found in <code>content/posts/</code>.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-2 font-mono text-xs text-red-400">
          {error}
        </div>
      )}

      <ul className="divide-y divide-outline-variant/10 rounded-xl border border-outline-variant/10 bg-surface-low">
        {tags.map((info) => (
          <li
            key={info.tag}
            className="flex flex-wrap items-center gap-3 px-4 py-3"
          >
            {renaming === info.tag ? (
              <form
                className="flex flex-1 items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  submitRename(info.tag);
                }}
              >
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Escape" && cancel()}
                  className="flex-1 rounded-lg border border-outline-variant/30 bg-surface-high px-3 py-1.5 font-mono text-xs text-on-surface outline-none focus:border-primary/50"
                  disabled={busy === info.tag}
                />
                <button
                  type="submit"
                  disabled={busy === info.tag || !renameValue.trim()}
                  className="rounded-lg border border-primary/30 px-3 py-1.5 font-mono text-xs text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
                >
                  {busy === info.tag ? "Renaming…" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={cancel}
                  disabled={busy === info.tag}
                  className="rounded-lg px-3 py-1.5 font-mono text-xs text-on-surface-variant transition-colors hover:text-on-surface disabled:opacity-50"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <>
                <span className="font-mono text-sm text-on-surface">
                  {info.tag}
                </span>
                <span className="font-mono text-xs text-on-surface-variant">
                  {info.count} {info.count === 1 ? "post" : "posts"}
                  {info.draftCount > 0 && (
                    <> ({info.publishedCount} published, {info.draftCount}{" "}
                    draft{info.draftCount === 1 ? "" : "s"})</>
                  )}
                </span>
                <span className="ml-auto flex items-center gap-2">
                  {confirmingDelete === info.tag ? (
                    <>
                      <span className="font-mono text-xs text-red-400">
                        Remove from {info.count}{" "}
                        {info.count === 1 ? "post" : "posts"}?
                      </span>
                      <button
                        onClick={() => submitDelete(info.tag)}
                        disabled={busy === info.tag}
                        className="rounded-lg border border-red-500/30 px-3 py-1.5 font-mono text-xs text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
                      >
                        {busy === info.tag ? "Deleting…" : "Confirm"}
                      </button>
                      <button
                        onClick={cancel}
                        disabled={busy === info.tag}
                        className="rounded-lg px-3 py-1.5 font-mono text-xs text-on-surface-variant transition-colors hover:text-on-surface disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => startRename(info.tag)}
                        className="rounded-lg border border-outline-variant/30 px-3 py-1.5 font-mono text-xs text-on-surface-variant transition-colors hover:border-primary/30 hover:text-primary"
                      >
                        Rename
                      </button>
                      <button
                        onClick={() => {
                          setError(null);
                          setRenaming(null);
                          setConfirmingDelete(info.tag);
                        }}
                        className="rounded-lg border border-outline-variant/30 px-3 py-1.5 font-mono text-xs text-on-surface-variant transition-colors hover:border-red-500/30 hover:text-red-400"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </span>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
