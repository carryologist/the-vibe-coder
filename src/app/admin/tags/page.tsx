"use client";

import { useEffect, useState, useCallback } from "react";
import type { TagInfo } from "@/lib/tags";

export default function TagsPage() {
  const [tags, setTags] = useState<TagInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const fetchTags = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/tags");
      if (!res.ok) throw new Error(`Failed to fetch tags (${res.status})`);
      const data: TagInfo[] = await res.json();
      setTags(data);
      setEditing({});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  async function handleRename(tag: string, newName: string) {
    if (newName.trim() === tag) return;
    setSaving(tag);
    try {
      const res = await fetch(`/api/admin/tags/${encodeURIComponent(tag)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Rename failed");
      await fetchTags();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rename failed");
    } finally {
      setSaving(null);
    }
  }

  async function handleDelete(tag: string) {
    if (!confirm(`Delete tag "${tag}" from all posts?`)) return;
    setSaving(tag);
    try {
      const res = await fetch(`/api/admin/tags/${encodeURIComponent(tag)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Delete failed");
      await fetchTags();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <div>
        <h1 className="font-mono text-xs uppercase tracking-widest text-primary mb-8">
          // Tags
        </h1>
        <p className="text-sm text-on-surface-variant">Loading tags…</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-mono text-xs uppercase tracking-widest text-primary mb-8">
        // Tags
      </h1>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {tags.length === 0 ? (
        <p className="text-sm text-on-surface-variant">No tags found.</p>
      ) : (
        <div className="space-y-1">
          {tags.map((t) => {
            const current = editing[t.name]?.trim() || t.name;
            return (
              <div
                key={t.name}
                className="flex items-center gap-3 rounded-lg border border-outline-variant/10 bg-surface-low px-4 py-3"
              >
                {/* Tag name */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-on-surface">
                      {t.name}
                    </span>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-xs text-primary">
                      {t.count}
                    </span>
                  </div>
                  {t.slugs.length <= 5 && (
                    <div className="mt-1 line-clamp-1 text-xs text-on-surface-variant">
                      {t.slugs.join(", ")}
                    </div>
                  )}
                </div>

                {/* Inline rename */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={current}
                    onChange={(e) =>
                      setEditing((prev) => ({
                        ...prev,
                        [t.name]: e.target.value,
                      }))
                    }
                    className="w-40 rounded border border-outline-variant bg-surface px-2 py-1 font-mono text-xs text-on-surface focus:border-primary focus:outline-none"
                    placeholder="New name…"
                    disabled={saving === t.name}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRename(t.name, current);
                    }}
                  />
                  <button
                    onClick={() => handleRename(t.name, current)}
                    disabled={saving !== null || current.trim() === t.name}
                    className="rounded border border-outline-variant/10 bg-surface px-3 py-1 font-mono text-xs text-on-surface-variant transition-colors hover:border-primary/30 hover:text-primary disabled:opacity-40"
                  >
                    {saving === t.name ? "…" : "Rename"}
                  </button>
                  <button
                    onClick={() => handleDelete(t.name)}
                    disabled={saving !== null}
                    className="rounded border border-red-500/20 bg-surface px-3 py-1 font-mono text-xs text-red-400/70 transition-colors hover:border-red-500/50 hover:text-red-400 disabled:opacity-40"
                  >
                    {saving === t.name ? "…" : "Delete"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
