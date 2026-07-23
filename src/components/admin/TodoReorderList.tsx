"use client";

import { useMemo, useRef, useState } from "react";
import LaunchAgentButton from "@/components/admin/LaunchAgentButton";

interface DisplayItem {
  checked: boolean;
  text: string;
  html: string;
}

interface Props {
  initialItems: DisplayItem[];
}

/**
 * Reorder-only editor for the Up Next checklist. Deliberately has no way
 * to edit item text or checked state — only position. Dragging/moving
 * items only updates local state; nothing is written back to
 * content/TODO.md until Save is clicked, so rearranging several items
 * doesn't fire a Vercel deploy per move.
 */
export function TodoReorderList({ initialItems }: Props) {
  const [items, setItems] = useState(initialItems);
  const [baseline, setBaseline] = useState(initialItems);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const dragImageRef = useRef<HTMLDivElement | null>(null);

  const dirty = useMemo(
    () => items.some((item, i) => item.text !== baseline[i]?.text),
    [items, baseline]
  );

  function move(from: number, to: number) {
    if (to < 0 || to >= items.length || from === to) return;
    setItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setSaved(false);
  }

  function handleDrop(targetIndex: number) {
    if (dragIndex === null) return;
    move(dragIndex, targetIndex);
    setDragIndex(null);
    setDragOverIndex(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/todo", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: items.map((i) => i.text) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Save failed: ${res.status}`);
      }
      setBaseline(items);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  function discard() {
    setItems(baseline);
    setError(null);
  }

  return (
    <div>
      {/* Off-screen node used as a plain drag preview instead of the
          browser's default (which would try to render the whole,
          often-huge, styled row). */}
      <div
        ref={dragImageRef}
        aria-hidden
        className="pointer-events-none absolute -left-[9999px] rounded-lg border border-primary/50 bg-surface-low px-3 py-2 font-mono text-xs text-on-surface"
      >
        Moving…
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-2 font-mono text-xs text-red-400">
          {error}
        </div>
      )}

      <ul className="space-y-2">
        {items.map((item, i) => (
          <li
            key={item.text}
            draggable
            onDragStart={(e) => {
              setDragIndex(i);
              if (dragImageRef.current) {
                e.dataTransfer.setDragImage(dragImageRef.current, 0, 0);
              }
              e.dataTransfer.effectAllowed = "move";
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverIndex(i);
            }}
            onDragLeave={() => setDragOverIndex((cur) => (cur === i ? null : cur))}
            onDrop={(e) => {
              e.preventDefault();
              handleDrop(i);
            }}
            onDragEnd={() => {
              setDragIndex(null);
              setDragOverIndex(null);
            }}
            className={`flex items-start gap-3 rounded-lg border px-4 py-3 font-mono text-sm leading-relaxed transition-colors ${
              item.checked
                ? "border-outline-variant/10 bg-surface-low text-on-surface-variant line-through"
                : "border-outline-variant/20 bg-surface-low text-on-surface"
            } ${dragOverIndex === i ? "border-primary/60 bg-primary/5" : ""} ${
              dragIndex === i ? "opacity-40" : ""
            }`}
          >
            <span
              aria-hidden
              className="mt-0.5 cursor-grab select-none font-mono text-xs text-outline"
              title="Drag to reorder"
            >
              ⠿
            </span>
            <span
              aria-hidden
              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] ${
                item.checked
                  ? "border-outline-variant/40 bg-outline-variant/20"
                  : "border-primary/50 text-primary"
              }`}
            >
              {item.checked ? "✓" : ""}
            </span>
            <span
              className="flex-1"
              dangerouslySetInnerHTML={{ __html: item.html }}
            />
            {!item.checked && <LaunchAgentButton text={item.text} />}
            <div className="ml-2 flex shrink-0 flex-col gap-0.5">
              <button
                onClick={() => move(i, i - 1)}
                disabled={i === 0}
                aria-label="Move up"
                className="rounded border border-outline-variant/20 px-1.5 py-0.5 font-mono text-[10px] text-on-surface-variant transition-colors hover:border-primary/30 hover:text-primary disabled:opacity-30"
              >
                ↑
              </button>
              <button
                onClick={() => move(i, i + 1)}
                disabled={i === items.length - 1}
                aria-label="Move down"
                className="rounded border border-outline-variant/20 px-1.5 py-0.5 font-mono text-[10px] text-on-surface-variant transition-colors hover:border-primary/30 hover:text-primary disabled:opacity-30"
              >
                ↓
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={save}
          disabled={!dirty || saving}
          className="rounded-lg border border-primary/60 bg-primary/10 px-4 py-2 font-mono text-xs font-medium text-primary transition-all hover:bg-primary/20 disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save Order"}
        </button>
        {dirty && !saving && (
          <button
            onClick={discard}
            className="font-mono text-xs text-on-surface-variant transition-colors hover:text-on-surface"
          >
            Discard changes
          </button>
        )}
        {saved && (
          <span className="font-mono text-xs text-green-400">Saved.</span>
        )}
        {dirty && !saved && (
          <span className="font-mono text-xs text-outline">
            Unsaved changes
          </span>
        )}
      </div>
    </div>
  );
}
