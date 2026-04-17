"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface InlineEditorProps {
  slug: string;
  onClose: () => void;
}

type EditorState =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "editing" }
  | { phase: "saving" }
  | { phase: "saved" };

export default function InlineEditor({ slug, onClose }: InlineEditorProps) {
  const [state, setState] = useState<EditorState>({ phase: "loading" });
  const [content, setContent] = useState("");
  const originalContent = useRef("");

  const fetchContent = useCallback(async () => {
    setState({ phase: "loading" });
    try {
      const res = await fetch(`/api/posts?slug=${encodeURIComponent(slug)}`);
      if (!res.ok) {
        throw new Error(`Failed to load post (${res.status})`);
      }
      const data = await res.json();
      originalContent.current = data.content ?? "";
      setContent(originalContent.current);
      setState({ phase: "editing" });
    } catch (err) {
      setState({
        phase: "error",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }, [slug]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const hasChanges = content !== originalContent.current;

  async function handleSave() {
    if (!hasChanges) return;
    setState({ phase: "saving" });
    try {
      const res = await fetch("/api/posts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, content, autoSummary: true }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.error ?? `Save failed (${res.status})`,
        );
      }
      setState({ phase: "saved" });
      setTimeout(() => window.location.reload(), 3500);
    } catch (err) {
      setState({
        phase: "error",
        message: err instanceof Error ? err.message : "Save failed",
      });
    }
  }

  // Loading state.
  if (state.phase === "loading") {
    return (
      <div className="mt-4 flex items-center justify-center rounded-xl border border-outline-variant/20 bg-surface-low p-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-on-surface-variant border-t-primary" />
      </div>
    );
  }

  // Error state with retry.
  if (state.phase === "error") {
    return (
      <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/5 p-4">
        <p className="font-mono text-xs text-red-400">{state.message}</p>
        <div className="mt-3 flex gap-2">
          <button
            onClick={fetchContent}
            className="rounded-lg bg-primary px-4 py-2 font-mono text-xs font-medium text-bg transition-opacity hover:opacity-90"
          >
            Retry
          </button>
          <button
            onClick={onClose}
            className="rounded-lg border border-outline-variant px-4 py-2 font-mono text-xs text-on-surface-variant transition-colors hover:border-primary/30 hover:text-primary"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Post-save confirmation.
  if (state.phase === "saved") {
    return (
      <div className="mt-4 rounded-xl border border-primary/30 bg-primary/10 p-5 text-center">
        <p className="font-mono text-base font-medium text-primary">
          ✓ Saved
        </p>
        <p className="mt-1 font-mono text-xs text-on-surface-variant">
          Committed to GitHub — Vercel will redeploy in a few seconds.
        </p>
      </div>
    );
  }

  // Editing / saving states.
  const isSaving = state.phase === "saving";

  return (
    <div className="mt-4 rounded-xl border border-outline-variant/20 bg-surface-low p-4">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        disabled={isSaving}
        className="w-full min-h-[50vh] resize-y rounded-lg border border-outline-variant bg-bg px-4 py-3 font-mono text-xs leading-relaxed text-on-surface outline-none transition-colors focus:border-primary/50"
      />

      <div className="mt-3 flex items-center justify-between">
        <p className="font-mono text-[11px] text-on-surface-variant">
          {hasChanges ? "Changelog summary will be auto-generated." : "No changes yet."}
        </p>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="rounded-lg border border-outline-variant px-4 py-2 font-mono text-xs text-on-surface-variant transition-colors hover:border-primary/30 hover:text-primary"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="rounded-lg bg-primary px-4 py-2 font-mono text-xs font-medium text-bg transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
