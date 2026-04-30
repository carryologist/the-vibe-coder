"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import Fuse from "fuse.js";
import type { FuseResult } from "fuse.js";
import { TagBadge } from "@/components/TagBadge";

/* ── Types ─────────────────────────────────────────────────────────── */

interface SearchIndexEntry {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  content: string;
  date: string;
}

/* ── Icons ─────────────────────────────────────────────────────────── */

function SearchIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

/* ── Fuse config ───────────────────────────────────────────────────── */

const FUSE_OPTIONS: Fuse.IFuseOptions<SearchIndexEntry> = {
  keys: [
    { name: "title", weight: 3 },
    { name: "tags", weight: 2 },
    { name: "description", weight: 1.5 },
    { name: "content", weight: 1 },
  ],
  threshold: 0.35,
  ignoreLocation: true,
  minMatchCharLength: 2,
};

/* ── Component ─────────────────────────────────────────────────────── */

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState<SearchIndexEntry[] | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // SSR guard — match ThemeToggle pattern
  useEffect(() => {
    setMounted(true);
  }, []);

  // Memoize Fuse instance — only rebuild when index data changes
  const fuse = useMemo(
    () => (index ? new Fuse(index, FUSE_OPTIONS) : null),
    [index],
  );

  // Derive results from query + fuse (no state needed)
  const results: FuseResult<SearchIndexEntry>[] = useMemo(() => {
    if (!fuse || !query || query.length < 2) return [];
    return fuse.search(query, { limit: 12 });
  }, [fuse, query]);

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(0);
  }, [results]);

  // Fetch index lazily — only when modal opens for the first time
  useEffect(() => {
    if (isOpen && !index) {
      fetch("/search-index.json")
        .then((res) => res.json())
        .then((data: SearchIndexEntry[]) => setIndex(data))
        .catch((err) => console.error("Failed to load search index:", err));
    }
  }, [isOpen, index]);

  // Clear query on close
  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setActiveIndex(0);
    }
  }, [isOpen]);

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
      return () => {
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.width = "";
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      // Small delay lets the animation start before focusing
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Keyboard navigation
  function handleInputKeyDown(e: React.KeyboardEvent) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, results.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (results[activeIndex]) {
          onClose();
          window.location.href = `/posts/${results[activeIndex].item.slug}`;
        }
        break;
      case "Escape":
        e.preventDefault();
        onClose();
        break;
    }
  }

  // Scroll active result into view
  useEffect(() => {
    if (!listRef.current) return;
    const active = listRef.current.querySelector('[data-active="true"]');
    active?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[15vh] sm:pt-[20vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Search posts"
            initial={{ scale: 0.95, y: -20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: -20 }}
            transition={{ duration: 0.15 }}
            className="relative w-full max-w-2xl overflow-hidden rounded-xl border-2 border-primary bg-surface shadow-2xl"
          >
            {/* Search input */}
            <div className="flex items-center gap-3 border-b-2 border-primary/20 bg-surface-low px-4 py-3">
              <SearchIcon />
              <input
                ref={inputRef}
                type="text"
                role="combobox"
                aria-expanded={results.length > 0}
                aria-controls="search-results"
                aria-activedescendant={
                  results.length > 0
                    ? `search-result-${activeIndex}`
                    : undefined
                }
                aria-autocomplete="list"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="Search posts…"
                className="w-full bg-transparent text-lg font-medium text-on-surface outline-none placeholder:text-on-surface-variant/50"
              />
              <kbd className="hidden rounded border border-on-surface-variant/20 px-1.5 py-0.5 text-[10px] font-mono text-on-surface-variant/50 sm:inline-block">
                esc
              </kbd>
              <button
                onClick={onClose}
                className="text-on-surface-variant transition-colors hover:text-primary"
                aria-label="Close search"
              >
                <CloseIcon />
              </button>
            </div>

            {/* Results */}
            <div
              id="search-results"
              ref={listRef}
              role="listbox"
              aria-label="Search results"
              className="max-h-[60vh] overflow-y-auto p-2"
            >
              {/* Result count — announced to screen readers */}
              {query.length >= 2 && (
                <div
                  className="px-3 py-2 text-xs uppercase tracking-widest text-on-surface-variant/40"
                  style={{ fontFamily: "var(--font-label)" }}
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {results.length} result{results.length !== 1 ? "s" : ""} found
                </div>
              )}

              {/* No results */}
              {query.length >= 2 && results.length === 0 && (
                <div className="px-6 py-12 text-center text-on-surface-variant">
                  <p className="text-sm">
                    No results for &ldquo;{query}&rdquo;
                  </p>
                </div>
              )}

              {/* Result items */}
              {results.map(({ item }, i) => (
                <Link
                  key={item.slug}
                  id={`search-result-${i}`}
                  role="option"
                  aria-selected={i === activeIndex}
                  data-active={i === activeIndex}
                  href={`/posts/${item.slug}`}
                  onClick={onClose}
                  className={`group block rounded-lg p-3 transition-colors ${
                    i === activeIndex
                      ? "bg-primary/10"
                      : "hover:bg-primary/10"
                  }`}
                >
                  <h3
                    className="text-base font-semibold text-on-surface transition-colors group-hover:text-primary"
                    style={{ fontFamily: "var(--font-headline)" }}
                  >
                    {item.title}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-on-surface-variant/70">
                    {item.description}
                  </p>
                  {item.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {item.tags.map((tag) => (
                        <TagBadge key={tag} tag={tag} linked={false} />
                      ))}
                    </div>
                  )}
                </Link>
              ))}

              {/* Empty state */}
              {!query && (
                <div className="px-6 py-12 text-center text-on-surface-variant">
                  <p className="text-sm">Start typing to search…</p>
                  <p className="mt-2 text-xs text-on-surface-variant/40">
                    Search by title, tags, description, or content
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
