"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface TagRow {
  tag: string;
  count: number;
}

interface Props {
  tags: TagRow[];
}

export function TagManager({ tags: initial }: Props) {
  const router = useRouter();
  const [tags, setTags] = useState(initial);
  const [editing, setEditing] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function startEdit(tag: string) {
    setEditing(tag);
    setDraftName(tag);
    setError(null);
  }

  function cancelEdit() {
    setEditing(null);
    setDraftName("");
  }

  async function confirmRename(oldTag: string) {
    const newTag = draftName.trim();
    if (!newTag || newTag === oldTag) {
      cancelEdit();
      return;
    }

    setBusy(oldTag);
    setError(null);
    try {
      const res = await fetch(`/api/admin/tags/${encodeURIComponent(oldTag)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newTag }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? `Rename failed: ${res.status}`);
      }
      setTags((prev) => {
        const merged = new Map<string, number>();
        for (const row of prev) {
          const key = row.tag === oldTag ? newTag : row.tag;
          merged.set(key, (merged.get(key) ?? 0) + row.count);
        }
        return Array.from(merged.entries())
          .map(([tag, count]) => ({ tag, count }))
          .sort((a, b) => a.tag.localeCompare(b.tag));
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setBusy(null);
      cancelEdit();
    }
  }

  async function handleDelete(tag: string) {
    if (
      !confirm(
        `Delete tag "${tag}"? This removes it from every post that uses it. This cannot be undone.`
      )
    ) {
      return;
    }

    setBusy(tag);
    setError(null);
    try {
      const res = await fetch(`/api/admin/tags/${encodeURIComponent(tag)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? `Delete failed: ${res.status}`);
      }
      setTags((prev) => prev.filter((row) => row.tag !== tag));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-2 font-mono text-xs text-red-400">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-outline-variant/10">
        <table className="w-full text-left font-mono text-xs">
          <thead className="bg-surface-low text-on-surface-variant">
            <tr>
              <th className="px-4 py-2 font-medium">Tag</th>
              <th className="px-4 py-2 font-medium">Posts</th>
              <th className="px-4 py-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/10">
            {tags.map((row) => (
              <tr key={row.tag} className="bg-surface-low/40">
                <td className="px-4 py-2 text-on-surface">
                  {editing === row.tag ? (
                    <input
                      autoFocus
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") confirmRename(row.tag);
                        if (e.key === "Escape") cancelEdit();
                      }}
                      className="w-full rounded border border-outline-variant/30 bg-surface px-2 py-1 font-mono text-xs text-on-surface focus:border-primary/50 focus:outline-none"
                    />
                  ) : (
                    row.tag
                  )}
                </td>
                <td className="px-4 py-2 text-on-surface-variant">
                  {row.count}
                </td>
                <td className="px-4 py-2">
                  <div className="flex justify-end gap-2">
                    {editing === row.tag ? (
                      <>
                        <button
                          onClick={() => confirmRename(row.tag)}
                          disabled={busy === row.tag}
                          className="rounded border border-outline-variant px-2 py-1 text-on-surface-variant transition-colors hover:border-primary/30 hover:text-primary disabled:opacity-50"
                        >
                          {busy === row.tag ? "…" : "Save"}
                        </button>
                        <button
                          onClick={cancelEdit}
                          disabled={busy === row.tag}
                          className="rounded border border-outline-variant px-2 py-1 text-on-surface-variant transition-colors hover:border-on-surface/30 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEdit(row.tag)}
                          disabled={busy !== null}
                          className="rounded border border-outline-variant px-2 py-1 text-on-surface-variant transition-colors hover:border-primary/30 hover:text-primary disabled:opacity-50"
                        >
                          Rename
                        </button>
                        <button
                          onClick={() => handleDelete(row.tag)}
                          disabled={busy !== null}
                          className="rounded border border-outline-variant px-2 py-1 text-on-surface-variant transition-colors hover:border-red-400/30 hover:text-red-400 disabled:opacity-50"
                        >
                          {busy === row.tag ? "…" : "Delete"}
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
