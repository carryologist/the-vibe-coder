"use client";

import Link from "next/link";
import { useState } from "react";
import InlineEditor from "@/components/admin/InlineEditor";

interface AdminPostControlsProps {
  slug: string;
}

export function AdminPostControls({ slug }: AdminPostControlsProps) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [syndicating, setSyndicating] = useState(false);
  const [syndicateResult, setSyndicateResult] = useState<{
    url?: string;
    error?: string;
  } | null>(null);

  async function handleDelete() {
    if (!confirm("Delete this post? This cannot be undone.")) return;
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
          onClick={handleDelete}
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
                  Drafted on DEV.to:{" "}
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
    </div>
  );
}
