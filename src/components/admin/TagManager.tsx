"use client";

import { useState } from "react";
import type { TagCount } from "@/lib/tags";

interface Props {
  tags: TagCount[];
}

export function TagManager({ tags: initial }: Props) {
  const [tags, setTags] = useState(initial);
  const [editing, setEditing] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [pendingDelete, setPendingDelete] = useState<TagCount | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function startRename(tag: TagCount) {
    setError(null);
    setNotice(null);
    setEditing(tag.tag);
    setDraftName(tag.tag);
  }

  function cancelRename() {
    setEditing(null);
    setDraftName("");
  }

  async function saveRename(tag: TagCount) {
    const to = draftName.trim();
    if (!to || to === tag.tag) {
      cancelRename();
      return;
    }

    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(
        `/api/admin/tags/${encodeURIComponent(tag.tag)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newTag: to }),
        },
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? `Rename failed: ${res.status}`);
      }

      setTags((prev) => mergeRename(prev, tag.tag, to));
      setNotice(
        `Renamed "${tag.tag}" → "${to}" in ${data.updated.length} post` +
          (data.updated.length === 1 ? "" : "s"),
      );
      cancelRename();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const tag = pendingDelete;

    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(
        `/api/admin/tags/${encodeURIComponent(tag.tag)}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? `Delete failed: ${res.status}`);
      }

      setTags((prev) => prev.filter((t) => t.tag !== tag.tag));
      setNotice(
        `Removed "${tag.tag}" from ${data.updated.length} post` +
          (data.updated.length === 1 ? "" : "s"),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setBusy(false);
      setPendingDelete(null);
    }
  }

  if (tags.length === 0) {
    return (
      <p className="font-mono text-xs text-on-surface-variant">
        No tags found across published or draft posts.
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
      {notice && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 font-mono text-xs text-primary">
          {notice}
        </div>
      )}

      <ul className="divide-y divide-outline-variant/10 overflow-hidden rounded-xl border border-outline-variant/10 bg-surface-low">
        {tags.map((tag) => (
          <li
            key={tag.tag}
            className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-high"
          >
            {editing === tag.tag ? (
              <input
                autoFocus
                value={draftName}
                disabled={busy}
                onChange={(e) => setDraftName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveRename(tag);
                  if (e.key === "Escape") cancelRename();
                }}
                className="min-w-0 flex-1 rounded-lg border border-primary/40 bg-bg px-2 py-1 font-mono text-sm text-on-surface outline-none focus:border-primary"
              />
            ) : (
              <span className="min-w-0 flex-1 truncate font-mono text-sm text-on-surface">
                {tag.tag}
              </span>
            )}

            <span className="shrink-0 font-mono text-[11px] text-on-surface-variant">
              {tag.count} {tag.count === 1 ? "post" : "posts"}
            </span>

            <div className="flex shrink-0 gap-2">
              {editing === tag.tag ? (
                <>
                  <button
                    onClick={() => saveRename(tag)}
                    disabled={busy}
                    className="rounded-lg border border-primary/40 bg-primary/10 px-2 py-0.5 font-mono text-[11px] text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
                  >
                    {busy ? "Saving…" : "Save"}
                  </button>
                  <button
                    onClick={cancelRename}
                    disabled={busy}
                    className="rounded-lg border border-outline-variant/20 px-2 py-0.5 font-mono text-[11px] text-on-surface-variant transition-colors hover:border-on-surface/30 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => startRename(tag)}
                    disabled={busy}
                    className="rounded-lg border border-outline-variant/20 px-2 py-0.5 font-mono text-[11px] text-on-surface-variant transition-colors hover:border-primary/30 hover:text-primary disabled:opacity-50"
                  >
                    Rename
                  </button>
                  <button
                    onClick={() => {
                      setError(null);
                      setNotice(null);
                      setPendingDelete(tag);
                    }}
                    disabled={busy}
                    className="rounded-lg border border-red-500/30 px-2 py-0.5 font-mono text-[11px] text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>

      {pendingDelete && (
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
              Remove{" "}
              <span className="text-red-400">{pendingDelete.tag}</span> from{" "}
              <span className="text-on-surface">{pendingDelete.count}</span>{" "}
              post{pendingDelete.count === 1 ? "" : "s"}?
            </p>
            <p className="mb-5 text-xs text-on-surface-variant">
              Commits directly to <code>main</code> on the content repo, one
              commit per affected post. There is no undo.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setPendingDelete(null)}
                disabled={busy}
                className="rounded-lg border border-outline-variant/20 px-3 py-1.5 font-mono text-[11px] text-on-surface-variant transition-colors hover:border-on-surface/30 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={busy}
                className="rounded-lg border border-red-500 bg-red-500/10 px-3 py-1.5 font-mono text-[11px] font-medium text-red-400 transition-all hover:bg-red-500/20 disabled:opacity-50"
              >
                {busy ? "Removing…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Apply a rename to the local tag list, merging counts when the target
 * tag already exists (mirrors the dedup behavior on the server). */
function mergeRename(tags: TagCount[], from: string, to: string): TagCount[] {
  const fromEntry = tags.find((t) => t.tag === from);
  if (!fromEntry) return tags;

  const existing = tags.find((t) => t.tag === to);
  let next: TagCount[];
  if (existing) {
    next = tags
      .filter((t) => t.tag !== from)
      .map((t) =>
        t.tag === to ? { ...t, count: t.count + fromEntry.count } : t,
      );
  } else {
    next = tags.map((t) =>
      t.tag === from ? { ...t, tag: to } : t,
    );
  }

  return next.sort((a, b) => a.tag.localeCompare(b.tag));
}
