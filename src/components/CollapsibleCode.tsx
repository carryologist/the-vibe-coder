"use client";

import { useState, type ReactNode } from "react";

interface CollapsibleCodeProps {
  /** The clickable label shown in the collapsed state. */
  title: string;
  children: ReactNode;
  /** Start expanded instead of collapsed. Default: false. */
  defaultOpen?: boolean;
}

/**
 * Expandable code snippet block for MDX blog posts.
 * Shows a clickable label with a chevron; expands to reveal
 * the full content (typically a fenced code block) on click.
 *
 * Usage in MDX:
 *   <CollapsibleCode title="Full setup script (331 lines)">
 *   ```bash
 *   #!/usr/bin/env bash
 *   echo "hello"
 *   ```
 *   </CollapsibleCode>
 */
export default function CollapsibleCode({
  title,
  children,
  defaultOpen = false,
}: CollapsibleCodeProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="my-6 rounded-xl border border-outline-variant/30 bg-surface-high/50">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left font-mono text-sm text-on-surface-variant transition-colors hover:text-primary cursor-pointer select-none"
      >
        <span
          className="inline-block transition-transform duration-200 text-primary"
          style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
        >
          ▸
        </span>
        {title}
      </button>

      {open && (
        <div className="border-t border-outline-variant/20 [&>pre]:my-0 [&>pre]:rounded-t-none [&>pre]:border-0">
          {children}
        </div>
      )}
    </div>
  );
}
