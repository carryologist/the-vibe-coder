"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";

interface EditPostPageProps {
  params: Promise<{ slug: string }>;
}

export default function EditPostPage({ params }: EditPostPageProps) {
  const { slug } = use(params);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/posts?slug=${slug}`);
        if (!res.ok) throw new Error("Failed to load post");
        const data = await res.json();
        setContent(data.content);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load post");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  async function handleSave() {
    setSaving(true);
    setError("");
    setSaved(false);

    try {
      const res = await fetch("/api/posts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, content }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center pt-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#888888] border-t-[#A3E635]" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/posts/${slug}`}
            className="font-mono text-xs text-[#888888] transition-colors hover:text-[#A3E635]"
          >
            ← back to post
          </Link>
          <h1 className="font-mono text-xs uppercase tracking-widest text-[#A3E635]">
            // editing: {slug}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {saved && (
            <span className="font-mono text-[11px] text-[#A3E635]">
              ✓ Saved — deploying...
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-[#A3E635] px-4 py-2 font-mono text-xs font-medium text-[#0A0A0A] transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save & Deploy"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-2">
          <p className="font-mono text-xs text-red-400">{error}</p>
        </div>
      )}

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="min-h-[70vh] w-full resize-y rounded-xl border border-[#1F1F1F] bg-[#0A0A0A] px-4 py-3 font-mono text-xs leading-relaxed text-[#EDEDED] outline-none transition-colors focus:border-[#A3E635]/50"
      />
    </div>
  );
}
