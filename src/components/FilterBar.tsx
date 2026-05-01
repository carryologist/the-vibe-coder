"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

/* ── Types ─────────────────────────────────────────────────────────── */

export type ActiveFilter = "*" | "how-to" | "opinion" | "popular";

interface FilterBarProps {
  allTags: string[];
  activeFilter: ActiveFilter;
  activeTag: string;
  sortDir: "newest" | "oldest";
  onFilterChange: (filter: ActiveFilter) => void;
  onTagChange: (tag: string) => void;
  onSortChange: (dir: "newest" | "oldest") => void;
}

/* ── Pill sub-component ────────────────────────────────────────────── */

function Pill({
  label,
  active,
  dimmed,
  onClick,
}: {
  label: string;
  active?: boolean;
  dimmed?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        inline-block cursor-pointer rounded-lg px-2.5 py-1 text-[11px]
        uppercase tracking-wider transition-colors duration-150
        ${
          active
            ? "bg-primary/15 text-primary"
            : dimmed
              ? "bg-surface-high text-on-surface-variant/40 hover:text-on-surface-variant"
              : "bg-surface-high text-on-surface-variant hover:text-on-surface"
        }
      `}
      style={{ fontFamily: "var(--font-label)" }}
    >
      {label}
    </button>
  );
}

/* ── FilterBar ─────────────────────────────────────────────────────── */

export function FilterBar({
  allTags,
  activeFilter,
  activeTag,
  sortDir,
  onFilterChange,
  onTagChange,
  onSortChange,
}: FilterBarProps) {
  const [tagsExpanded, setTagsExpanded] = useState(false);

  const filters: { key: ActiveFilter; label: string }[] = [
    { key: "*", label: "*" },
    { key: "how-to", label: "how-to" },
    { key: "opinion", label: "opinion" },
    { key: "popular", label: "popular" },
  ];

  return (
    <div className="mb-8 flex flex-col gap-3">
      {/* Main row */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        {/* Left: content-type pills + tag expander */}
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="mr-1 text-xs font-semibold uppercase tracking-widest text-on-surface-variant/50"
            style={{ fontFamily: "var(--font-label)" }}
          >
            {"// grep"}
          </span>

          {filters.map(({ key, label }) => (
            <Pill
              key={key}
              label={label}
              active={activeFilter === key}
              onClick={() => onFilterChange(activeFilter === key ? "*" : key)}
            />
          ))}

          {allTags.length > 0 && (
            <Pill
              label={tagsExpanded ? "−tags" : "+tags"}
              dimmed={!tagsExpanded && activeTag === "*"}
              active={tagsExpanded || activeTag !== "*"}
              onClick={() => {
                if (tagsExpanded && activeTag !== "*") {
                  onTagChange("*");
                }
                setTagsExpanded((e) => !e);
              }}
            />
          )}
        </div>

        {/* Right: sort toggle (hidden when popular is active) */}
        {activeFilter !== "popular" && (
          <div className="flex items-center gap-2 sm:ml-auto">
            <span
              className="mr-1 text-xs font-semibold uppercase tracking-widest text-on-surface-variant/50"
              style={{ fontFamily: "var(--font-label)" }}
            >
              {"// sort"}
            </span>
            <Pill
              label={sortDir === "newest" ? "newest ↓" : "oldest ↑"}
              active
              onClick={() =>
                onSortChange(sortDir === "newest" ? "oldest" : "newest")
              }
            />
          </div>
        )}
      </div>

      {/* Expanded tag row */}
      <AnimatePresence>
        {tagsExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-2 pt-1">
              {allTags.map((tag) => (
                <Pill
                  key={tag}
                  label={tag.replace(/-/g, " ")}
                  active={activeTag === tag}
                  onClick={() => onTagChange(activeTag === tag ? "*" : tag)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
