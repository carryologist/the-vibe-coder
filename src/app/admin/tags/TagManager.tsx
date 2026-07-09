"use client";

import React, { useState } from "react";

export default function TagManager({
  initialTags,
}: {
  initialTags: { tag: string; count: number }[];
}) {
  const [tags, setTags] = useState(initialTags);

  const handleDelete = async (tag: string, count: number) => {
    if (!confirm(`Remove tag "${tag}" from all ${count} post(s)?`)) return;
    const res = await fetch(`/api/admin/tags/${encodeURIComponent(tag)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setTags((prev) => prev.filter((t) => t.tag !== tag));
    }
  };

  const handleRename = async (oldTag: string, newTag: string) => {
    const res = await fetch(`/api/admin/tags/${encodeURIComponent(oldTag)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tag: newTag }),
    });
    if (res.ok) {
      const data = await res.json();
      setTags((prev) =>
        prev.map((t) =>
          t.tag === oldTag ? { ...t, tag: newTag } : t
        )
      );
    }
  };

  return (
    <div>
      <h1 className="font-mono text-xs uppercase tracking-widest text-primary mb-8">
        // Tag Manager
      </h1>

      <p className="text-sm text-on-surface-variant mb-6">
        Manage tags across all posts (published and drafts).
      </p>

      {tags.length === 0 ? (
        <p className="text-sm text-on-surface-variant">No tags found.</p>
      ) : (
        <div className="space-y-3">
          {tags.map((tagInfo) => (
            <TagRow
              key={tagInfo.tag}
              tagInfo={tagInfo}
              onDelete={() => handleDelete(tagInfo.tag, tagInfo.count)}
              onRename={handleRename}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TagRow({
  tagInfo,
  onDelete,
  onRename,
}: {
  tagInfo: { tag: string; count: number };
  onDelete: () => void;
  onRename: (oldTag: string, newTag: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [renameValue, setRenameValue] = useState(tagInfo.tag);
  const [saving, setSaving] = useState(false);

  const handleRenameSave = async () => {
    if (!renameValue.trim() || renameValue.trim() === tagInfo.tag) {
      setEditing(false);
      return;
    }
    setSaving(true);
    await onRename(tagInfo.tag, renameValue.trim());
    setEditing(false);
    setSaving(false);
  };

  if (!editing) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-outline-variant/20 bg-surface-low p-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center rounded-md bg-surface-high px-2 py-1 text-xs font-medium text-on-surface">
            {tagInfo.tag}
          </span>
          <span className="text-xs text-on-surface-variant">
            {tagInfo.count} post{tagInfo.count !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setRenameValue(tagInfo.tag);
              setEditing(true);
            }}
            className="text-xs text-primary hover:text-primary/80"
          >
            Rename
          </button>
          <button
            onClick={onDelete}
            className="text-xs text-error hover:text-error/80"
            title="Delete tag"
          >
            Delete
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-surface-low p-4">
      <div className="flex items-center gap-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleRenameSave();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            className="w-40 rounded border border-outline-variant bg-surface-high px-2 py-1 text-xs text-on-surface"
            autoFocus
          />
          <button
            type="submit"
            disabled={saving}
            className="text-xs text-primary hover:text-primary/80 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-xs text-on-surface-variant hover:text-on-surface"
          >
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
}
