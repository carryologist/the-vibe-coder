import type { Metadata } from "next";
import { getUpNextItems, renderInlineMarkdown } from "@/lib/todo";
import { TodoReorderList } from "@/components/admin/TodoReorderList";

export const metadata: Metadata = {
  title: "TODO — Admin",
  robots: { index: false, follow: false },
};

// Force dynamic so each visit reflects the current state of TODO.md in
// the content repo, not a stale build-time snapshot.
export const dynamic = "force-dynamic";

const TODO_GITHUB_URL =
  "https://github.com/carryologist/the-vibe-coder-content/blob/main/content/TODO.md";

export default async function AdminTodoPage() {
  const items = await getUpNextItems();
  // Precompute the inline-Markdown HTML server-side so the client
  // component never needs to import the server-only todo.ts module
  // (readFile pulls in GITHUB_TOKEN handling) — it just reorders plain
  // {checked, text, html} objects.
  const initialItems = items.map((item) => ({
    ...item,
    html: renderInlineMarkdown(item.text),
  }));

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <h1 className="font-mono text-xs uppercase tracking-widest text-primary">
          {"// TODO"}
        </h1>
        <a
          href={TODO_GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-xs text-on-surface-variant transition-colors hover:text-primary"
        >
          full file on GitHub ↗
        </a>
      </div>
      <p className="mb-6 font-mono text-[11px] text-on-surface-variant">
        Up Next — {initialItems.length} open. Drag, or use the arrows, to
        reorder — text isn&apos;t editable here. Nothing is saved until you
        click Save.
      </p>

      {initialItems.length === 0 ? (
        <p className="font-mono text-xs text-on-surface-variant">
          No Up Next items found. Either the backlog is empty, or{" "}
          <code>content/TODO.md</code> isn&apos;t available in this
          environment — see the full file on GitHub above.
        </p>
      ) : (
        <TodoReorderList initialItems={initialItems} />
      )}
    </div>
  );
}
