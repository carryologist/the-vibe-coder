"use client";

import Link from "next/link";
import { useState } from "react";
import InlineEditor from "@/components/admin/InlineEditor";
import { setFrontmatterField } from "@/lib/frontmatter";

interface AdminPostControlsProps {
  slug: string;
}

export function AdminPostControls({ slug }: AdminPostControlsProps) {
  const [editing, setEditing] = useState(false);
  const [unpublishing, setUnpublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [syndicating, setSyndicating] = useState(false);
  const [syndicateResult, setSyndicateResult] = useState<{
    url?: string;
    error?: string;
  } | null>(null);

  async function handleUnpublish() {
    if (
      !confirm(
        "Unpublish this post? It will disappear from the public site until republished. The file itself is not deleted.",
      )
    )
      return;
    setUnpublishing(true);
    try {
      const getRes = await fetch(`/api/posts?slug=${slug}`);
      if (!getRes.ok) throw new Error("Failed to load post");
      const data = await getRes.json();

      const updated = setFrontmatterField(
        data.content as string,
        "published",
        "false",
      );

      const putRes = await fetch("/api/posts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          content: updated,
          summary: "Unpublished post",
        }),
      });
      if (!putRes.ok) throw new Error("Unpublish failed");
      // The post 404s for everyone (including admin) once unpublished,
      // same as the post-delete redirect below.
      window.location.href = "/";
    } catch (err) {
      console.error("Unpublish error:", err);
      setUnpublishing(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch("/api/posts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      if (!res.ok) throw new Error("Delete failed");
      window.location.href = "/";
    } catch (err) {
      console.error("Delete error:", err);
      setDeleting(false);
      setShowDeleteModal(false);
    }
  }

  async function handleSyndicateDevto() {
    setSyndicating(true);
    setSyndicateResult(null);
    try {
      const res = await fetch("/api/syndicate/devto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSyndicateResult({ error: data.error || "Syndication failed" });
      } else {
        setSyndicateResult({ url: data.devtoUrl });
      }
    } catch (err) {
      console.error("Syndicate error:", err);
      setSyndicateResult({ error: "Syndication failed" });
    } finally {
      setSyndicating(false);
    }
  }

  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-outline-variant bg-bg px-4 py-3">
        <span className="font-mono text-xs text-outline">// admin</span>
        <button
          onClick={() => setEditing(!editing)}
          className={`rounded border px-3 py-1.5 font-mono text-xs transition-colors ${
            editing
              ? "border-primary/30 text-primary"
              : "border-outline-variant text-on-surface-variant hover:border-primary/30 hover:text-primary"
          }`}
        >
          {editing ? "Close Editor" : "Type Edits"}
        </button>
        <Link
          href={`/admin/record?edit=${slug}`}
          className="rounded border border-outline-variant px-3 py-1.5 font-mono text-xs text-on-surface-variant transition-colors hover:border-primary/30 hover:text-primary"
        >
          Record Edits
        </Link>
        <button
          onClick={handleSyndicateDevto}
          disabled={syndicating}
          className="rounded border border-outline-variant px-3 py-1.5 font-mono text-xs text-on-surface-variant transition-colors hover:border-primary/30 hover:text-primary disabled:opacity-50"
        >
          {syndicating ? "Syndicating…" : "DEV.to"}
        </button>
        <button
          onClick={handleUnpublish}
          disabled={unpublishing}
          className="rounded border border-outline-variant px-3 py-1.5 font-mono text-xs text-on-surface-variant transition-colors hover:border-amber-400/30 hover:text-amber-400 disabled:opacity-50"
        >
          {unpublishing ? "Unpublishing…" : "Unpublish"}
        </button>
        <button
          onClick={() => setShowDeleteModal(true)}
          disabled={deleting}
          className="rounded border border-outline-variant px-3 py-1.5 font-mono text-xs text-on-surface-variant transition-colors hover:border-red-400/30 hover:text-red-400 disabled:opacity-50"
        >
          {deleting ? "Deleting…" : "Delete Post"}
        </button>
      </div>

      {syndicateResult && (
        <div
          className={`mt-2 rounded-lg border px-4 py-2 font-mono text-xs ${
            syndicateResult.error
              ? "border-red-400/30 text-red-400"
              : "border-primary/30 text-primary"
          }`}
        >
          {syndicateResult.error
            ? syndicateResult.error
            : (
                <span>
                  Published on DEV.to:{" "}
                  <a
                    href={syndicateResult.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:no-underline"
                  >
                    {syndicateResult.url}
                  </a>
                </span>
              )}
        </div>
      )}

      {editing && (
        <InlineEditor slug={slug} onClose={() => setEditing(false)} />
      )}

      {showDeleteModal && (
        <DeleteConfirmModal
          slug={slug}
          deleting={deleting}
          onCancel={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}

function DeleteConfirmModal({
  slug,
  deleting,
  onCancel,
  onConfirm,
}: {
  slug: string;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [typedSlug, setTypedSlug] = useState("");
  const confirmed = typedSlug === slug;

  return (
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
          Delete <span className="text-red-400">{slug}</span>?
        </p>
        <p className="mb-4 text-xs text-on-surface-variant">
          This is permanent and can only be recovered from git history — it
          is not the same as Unpublish. The post file is removed from the
          content repo and the live site immediately.
        </p>
        <label className="mb-1 block font-mono text-[11px] text-on-surface-variant">
          Type <span className="text-on-surface">{slug}</span> to confirm
        </label>
        <input
          type="text"
          value={typedSlug}
          onChange={(e) => setTypedSlug(e.target.value)}
          disabled={deleting}
          autoFocus
          spellCheck={false}
          className="mb-5 w-full rounded-lg border border-outline-variant/40 bg-bg px-3 py-1.5 font-mono text-xs text-on-surface focus:border-red-400/50 focus:outline-none disabled:opacity-50"
          placeholder={slug}
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="rounded-lg border border-outline-variant/20 px-3 py-1.5 font-mono text-[11px] text-on-surface-variant transition-colors hover:border-on-surface/30 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting || !confirmed}
            className="rounded-lg border border-red-500 bg-red-500/10 px-3 py-1.5 font-mono text-[11px] font-medium text-red-400 transition-all hover:bg-red-500/20 disabled:opacity-50"
          >
            {deleting ? "Deleting…" : "Delete Permanently"}
          </button>
        </div>
      </div>
    </div>
  );
}
