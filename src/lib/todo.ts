// Read-only + reorder-only admin surface for content/TODO.md's "Up Next"
// checklist.
//
// Deliberately not a full Markdown renderer (no new remark/rehype
// dependency) — this is a lightweight mirror for scanning the backlog
// without leaving the site, not a replacement for editing the file
// directly in the content repo. See content/TODO.md's own Site Features
// backlog entry for the "simplest version" scope this implements.
//
// Reordering intentionally never touches item text or checked state —
// only the line order within the "## Up Next" section changes. Saving is
// an explicit, single action (one commit for however many positions
// moved), not an autosave-per-drag, so dragging several items around
// doesn't fire a Vercel deploy per move.

import { readFile } from "./github";

export interface TodoItem {
  checked: boolean;
  /** Raw text after the `- [ ] `/`- [x] ` marker, light markdown intact. */
  text: string;
}

const TODO_PATH = "content/TODO.md";
const SECTION_HEADING = "## Up Next";

/**
 * Thrown when the file on disk no longer matches what the client had
 * loaded (someone edited Up Next elsewhere between load and save) — the
 * API route maps this to an HTTP 409 so the client can ask for a refresh
 * instead of silently reordering the wrong items.
 */
export class TodoConflictError extends Error {}

interface UpNextSection {
  lines: string[];
  /** Line indices (into `lines`) of each `- [ ]`/`- [x]` bullet, in
   * on-disk order. */
  bulletLineIndices: number[];
  items: TodoItem[];
}

function parseUpNextSection(raw: string): UpNextSection | null {
  const lines = raw.split("\n");
  const startIdx = lines.findIndex((l) => l.trim() === SECTION_HEADING);
  if (startIdx === -1) return null;

  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (/^##\s/.test(lines[i])) {
      endIdx = i;
      break;
    }
  }

  const bulletLineIndices: number[] = [];
  const items: TodoItem[] = [];
  for (let i = startIdx + 1; i < endIdx; i++) {
    const match = lines[i].match(/^-\s\[([ xX])\]\s*(.*)$/);
    if (match) {
      bulletLineIndices.push(i);
      items.push({ checked: match[1].toLowerCase() === "x", text: match[2] });
    }
  }

  return { lines, bulletLineIndices, items };
}

/**
 * Parse just the "## Up Next" section of content/TODO.md into checklist
 * items. Returns [] when the file is missing (fresh local dev without
 * content cloned) or the section can't be found, rather than throwing.
 */
export async function getUpNextItems(): Promise<TodoItem[]> {
  const raw = await readFile(TODO_PATH);
  if (!raw) return [];
  return parseUpNextSection(raw)?.items ?? [];
}

/**
 * Rewrite the raw file content so the "## Up Next" bullets appear in
 * `newOrder` (an array of each item's exact current text, in the desired
 * new order). Everything else in the file — every other section, blank
 * lines, the heading itself — is left byte-for-byte untouched; only the
 * bullet lines within the section are permuted in place.
 *
 * Throws TodoConflictError if the section can't be found, the item
 * count doesn't match, or any text in `newOrder` doesn't correspond to
 * a current item — all signs the file changed elsewhere since the
 * client loaded it.
 */
export function reorderUpNext(raw: string, newOrder: string[]): string {
  const section = parseUpNextSection(raw);
  if (!section) {
    throw new TodoConflictError("'## Up Next' section not found");
  }
  const { lines, bulletLineIndices, items } = section;

  if (newOrder.length !== items.length) {
    throw new TodoConflictError(
      `Expected ${items.length} items, got ${newOrder.length} — the file may have changed. Refresh and try again.`
    );
  }

  // Multiset of current items keyed by text, so we can validate the
  // incoming order is a true permutation of what's on disk right now
  // rather than trusting client-supplied text blindly.
  const byText = new Map<string, TodoItem[]>();
  for (const item of items) {
    const bucket = byText.get(item.text) ?? [];
    bucket.push(item);
    byText.set(item.text, bucket);
  }

  const reordered: TodoItem[] = [];
  for (const text of newOrder) {
    const bucket = byText.get(text);
    if (!bucket || bucket.length === 0) {
      throw new TodoConflictError(
        "An item no longer matches the file on disk. Refresh and try again."
      );
    }
    reordered.push(bucket.shift()!);
  }

  const newLines = [...lines];
  bulletLineIndices.forEach((lineIdx, i) => {
    const item = reordered[i];
    newLines[lineIdx] = `- [${item.checked ? "x" : " "}] ${item.text}`;
  });

  return newLines.join("\n");
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Very small, intentionally non-exhaustive inline Markdown -> HTML pass:
 * links, inline code, bold. Good enough for TODO.md's bullet style
 * (prose with the occasional `code`, **emphasis**, and `[link](url)`)
 * without pulling in a full Markdown pipeline for a read-only mirror.
 * Escapes HTML first so the raw file content can't inject markup.
 */
export function renderInlineMarkdown(text: string): string {
  let html = escapeHtml(text);
  html = html.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary underline underline-offset-2 hover:text-primary/80">$1</a>'
  );
  html = html.replace(
    /`([^`]+)`/g,
    '<code class="rounded bg-surface-high px-1 py-0.5 font-mono text-[0.85em]">$1</code>'
  );
  html = html.replace(
    /\*\*([^*]+)\*\*/g,
    '<strong class="text-on-surface font-medium">$1</strong>'
  );
  return html;
}
