// Read-only admin surface for content/TODO.md's "Up Next" checklist.
//
// Deliberately not a full Markdown renderer (no new remark/rehype
// dependency) — this is a lightweight mirror for scanning the backlog
// without leaving the site, not a replacement for editing the file
// directly in the content repo. See content/TODO.md's own Site Features
// backlog entry for the "simplest version" scope this implements.

import { readFile } from "./github";

export interface TodoItem {
  checked: boolean;
  /** Raw text after the `- [ ] `/`- [x] ` marker, light markdown intact. */
  text: string;
}

const TODO_PATH = "content/TODO.md";

/**
 * Parse just the "## Up Next" section of content/TODO.md into checklist
 * items. Returns [] when the file is missing (fresh local dev without
 * content cloned) or the section can't be found, rather than throwing.
 */
export async function getUpNextItems(): Promise<TodoItem[]> {
  const raw = await readFile(TODO_PATH);
  if (!raw) return [];

  const lines = raw.split("\n");
  const startIdx = lines.findIndex((l) => l.trim() === "## Up Next");
  if (startIdx === -1) return [];

  const items: TodoItem[] = [];
  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^##\s/.test(line)) break; // Reached the next top-level section.
    const match = line.match(/^-\s\[([ xX])\]\s*(.*)$/);
    if (match) {
      items.push({ checked: match[1].toLowerCase() === "x", text: match[2] });
    }
  }
  return items;
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
