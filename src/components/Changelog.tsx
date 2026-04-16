"use client";

import { useState } from "react";
import type { ChangelogEntry } from "@/lib/types";

interface ChangelogProps {
  entries?: ChangelogEntry[];
}

export default function Changelog({ entries }: ChangelogProps) {
  const [open, setOpen] = useState(false);

  if (!entries || entries.length === 0) return null;

  const label = entries.length === 1 ? "1 update" : `${entries.length} updates`;

  return (
    <div className="mb-8">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 font-mono text-[11px] text-outline-variant/60 transition-colors hover:text-on-surface-variant cursor-pointer select-none"
      >
        {open ? "▾" : "▸"} {label}
      </button>

      {open && (
        <ul className="mt-2 space-y-1 border-l border-outline-variant/20 pl-3">
          {entries.map((entry, i) => (
            <li
              key={`${entry.date}-${i}`}
              className="font-mono text-[11px] text-outline-variant/60"
            >
              {entry.date} &mdash; {entry.summary}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
