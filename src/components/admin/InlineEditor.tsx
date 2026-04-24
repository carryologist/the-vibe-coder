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

interface CursorPosition {
  line: number;
  col: number;
}

export default function InlineEditor({ slug, onClose }: InlineEditorProps) {
  const [state, setState] = useState<EditorState>({ phase: "loading" });
  const [content, setContent] = useState("");
  const [uploading, setUploading] = useState(false);
  const [cursor, setCursor] = useState<CursorPosition>({ line: 1, col: 1 });
  const originalContent = useRef("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Sync gutter scroll position with textarea.
  function handleScroll() {
    if (textareaRef.current && gutterRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }

  // Compute cursor line and column from the DOM element directly
  // to avoid stale React state after onChange.
  function updateCursorPosition() {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const pos = textarea.selectionStart;
    const text = textarea.value;
    const textBefore = text.slice(0, pos);
    const line = textBefore.split("\n").length;
    const lastNewline = textBefore.lastIndexOf("\n");
    const col = pos - lastNewline;
    setCursor({ line, col });
  }

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

  async function handleImageUpload(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("slug", slug);
      formData.append("image", file);

      const res = await fetch("/api/images", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Upload failed (${res.status})`);
      }

      const data = await res.json();
      const markdown: string = data.markdown;

      // Insert markdown at the current cursor position.
      const textarea = textareaRef.current;
      const cursorPos = textarea?.selectionStart ?? content.length;
      const before = content.slice(0, cursorPos);
      const after = content.slice(cursorPos);
      setContent(before + markdown + after);
    } catch (err) {
      setState({
        phase: "error",
        message: err instanceof Error ? err.message : "Image upload failed",
      });
    } finally {
      setUploading(false);
      // Reset file input so the same file can be re-selected.
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
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
  const totalLines = content.split("\n").length;
  const lineNumbers = Array.from({ length: totalLines }, (_, i) => i + 1);

  // Width for gutter depends on digit count.
  const gutterChars = String(totalLines).length;
  const gutterWidth = `${gutterChars + 2}ch`;

  return (
    <div className="mt-4 rounded-xl border border-outline-variant/20 bg-surface-low p-4">
      {/* Editor area: gutter is absolutely positioned so its content
          height cannot inflate the flex container. The textarea drives
          the container height via min-h and resize-y. */}
      <div className="relative rounded-lg border border-outline-variant overflow-hidden bg-bg transition-colors focus-within:border-primary/50">
        {/* Line number gutter */}
        <div
          ref={gutterRef}
          className="absolute left-0 top-0 bottom-0 overflow-hidden border-r border-outline-variant/30 bg-surface-low"
          aria-hidden="true"
          style={{ width: gutterWidth }}
        >
          <div
            className="py-3 pr-2 pl-2 text-right font-mono text-xs text-on-surface-variant/30 select-none"
            style={{ lineHeight: "1.625" }}
          >
            {lineNumbers.map((n) => (
              <div
                key={n}
                className={
                  n === cursor.line
                    ? "text-primary font-medium"
                    : ""
                }
              >
                {n}
              </div>
            ))}
          </div>
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            requestAnimationFrame(updateCursorPosition);
          }}
          onScroll={handleScroll}
          onSelect={updateCursorPosition}
          onClick={updateCursorPosition}
          onKeyUp={updateCursorPosition}
          disabled={isSaving}
          spellCheck={false}
          className="w-full min-h-[50vh] resize-y border-0 bg-bg py-3 pr-4 font-mono text-xs text-on-surface outline-none overflow-y-scroll [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-on-surface-variant/20 hover:[&::-webkit-scrollbar-thumb]:bg-on-surface-variant/40"
          style={{
            lineHeight: "1.625",
            paddingLeft: `calc(${gutterWidth} + 1rem)`,
          }}
        />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImageUpload(file);
        }}
      />

      {/* Status bar: cursor position + action buttons */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="font-mono text-[11px] text-on-surface-variant/50">
            Ln {cursor.line}, Col {cursor.col}
            <span className="mx-1.5 text-outline-variant/30">|</span>
            {totalLines} lines
          </p>
          <p className="font-mono text-[11px] text-on-surface-variant">
            {hasChanges ? "Changelog summary will be auto-generated." : "No changes yet."}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || isSaving}
            className="rounded-lg border border-outline-variant px-4 py-2 font-mono text-xs text-on-surface-variant transition-colors hover:border-primary/30 hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? "Uploading..." : "Add Image"}
          </button>
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
