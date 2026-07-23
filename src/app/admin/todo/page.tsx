import type { Metadata } from "next";
import { getUpNextItems, renderInlineMarkdown } from "@/lib/todo";
import LaunchAgentButton from "@/components/admin/LaunchAgentButton";

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
  const openCount = items.filter((item) => !item.checked).length;

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
        Up Next — {openCount} open. Read-only mirror of{" "}
        <code>content/TODO.md</code>; edit via the content repo, not here.
      </p>

      {items.length === 0 ? (
        <p className="font-mono text-xs text-on-surface-variant">
          No Up Next items found. Either the backlog is empty, or{" "}
          <code>content/TODO.md</code> isn&apos;t available in this
          environment — see the full file on GitHub above.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li
              key={i}
              className={`flex items-start gap-3 rounded-lg border px-4 py-3 font-mono text-sm leading-relaxed ${
                item.checked
                  ? "border-outline-variant/10 bg-surface-low text-on-surface-variant line-through"
                  : "border-outline-variant/20 bg-surface-low text-on-surface"
              }`}
            >
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
                dangerouslySetInnerHTML={{
                  __html: renderInlineMarkdown(item.text),
                }}
              />
              {!item.checked && <LaunchAgentButton text={item.text} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
