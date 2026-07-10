"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function TagsPage() {
  const [tags, setTags] = useState<Array<{ tag: string; count: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [newTagName, setNewTagName] = useState("");

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    const res = await fetch("/api/admin/tags");
    const data = await res.json();
    setTags(data);
    setLoading(false);
  };

  const handleRename = async (tag: string) => {
    if (!newTagName.trim() || newTagName === tag) return;

    const res = await fetch(`/api/admin/tags/${tag}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newTag: newTagName.trim() }),
    });

    if (res.ok) {
      setRenaming(null);
      setNewTagName("");
      fetchTags();
    }
  };

  const handleDelete = async (tag: string) => {
    if (!confirm(`Delete tag "${tag}" from all posts?`)) return;

    const res = await fetch(`/api/admin/tags/${tag}`, {
      method: "DELETE",
    });

    if (res.ok) {
      fetchTags();
    }
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-mono text-xs uppercase tracking-widest text-primary">
          // Tags
        </h1>
        <Link
          href="/admin"
          className="text-sm text-on-surface-variant hover:text-primary"
        >
          ← Back to Admin
        </Link>
      </div>

      {loading ? (
        <p className="text-on-surface-variant">Loading tags...</p>
      ) : tags.length === 0 ? (
        <p className="text-on-surface-variant">No tags found</p>
      ) : (
        <div className="space-y-2">
          {tags.map(({ tag, count }) => (
            <div
              key={tag}
              className="glow-card rounded-xl border border-outline-variant/10 bg-surface-low p-4 transition-all duration-300"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm text-on-surface">{tag}</span>
                  <span className="text-xs text-on-surface-variant">
                    ({count} post{count !== 1 ? "s" : ""})
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {renaming === tag ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newTagName}
                        onChange={(e) => setNewTagName(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            handleRename(tag);
                          }
                        }}
                        onBlur={() => {
                          setRenaming(null);
                          setNewTagName("");
                        }}
                        className="rounded bg-surface-high px-2 py-1 text-sm text-on-surface outline-none border border-primary/30"
                        autoFocus
                      />
                      <button
                        onClick={() => handleRename(tag)}
                        className="rounded px-3 py-1 text-sm bg-primary text-primary-foreground"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setRenaming(tag);
                          setNewTagName(tag);
                        }}
                        className="rounded px-3 py-1 text-sm text-primary hover:bg-primary/10"
                      >
                        Rename
                      </button>
                      <button
                        onClick={() => handleDelete(tag)}
                        className="rounded px-3 py-1 text-sm text-red-500 hover:bg-red-500/10"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
