"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

interface SearchResult {
  slug: string;
  title: string;
  date: string;
  description: string;
  tags: string[];
  readingTime: string;
  snippet: string | null;
}

/**
 * Cmd+K search dialog. Opens as a full-screen overlay with an input
 * and live results. Matches the Neon Brutalist design system.
 */
export function SearchDialog() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const router = useRouter();

  // Cmd/Ctrl+K to open, Escape to close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "/" && !open) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        e.preventDefault();
        setOpen(true);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      setQuery("");
      setResults([]);
      setActiveIndex(0);
    }
  }, [open]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const fetchResults = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    // Cancel previous request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(q.trim())}`,
        { signal: controller.signal },
      );
      if (res.ok) {
        const data = await res.json();
        setResults(data);
        setActiveIndex(0);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fetchResults(val), 200);
  };

  const navigate = useCallback(
    (slug: string) => {
      setOpen(false);
      router.push(`/posts/${slug}`);
    },
    [router],
  );

  const navigateToSearch = useCallback(() => {
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  }, [router, query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex === results.length && query.trim()) {
        // "View all results" option
        navigateToSearch();
      } else if (results[activeIndex]) {
        navigate(results[activeIndex].slug);
      } else if (query.trim()) {
        navigateToSearch();
      }
    }
  };

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center rounded-md p-1.5 text-on-surface-variant transition-colors hover:text-primary"
        aria-label="Search (⌘K)"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
          />
        </svg>
      </button>

      {/* Dialog overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[100] flex items-start justify-center bg-bg/80 backdrop-blur-sm pt-[15vh] px-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setOpen(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-xl overflow-hidden rounded-xl border border-outline-variant/20 bg-surface-low shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-label="Search posts"
            >
              {/* Input */}
              <div className="flex items-center border-b border-outline-variant/10 px-4">
                <svg
                  className="h-4 w-4 shrink-0 text-on-surface-variant/50"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                  />
                </svg>
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Search posts…"
                  className="flex-1 bg-transparent py-4 pl-3 pr-2 text-sm text-on-surface placeholder:text-on-surface-variant/40 outline-none"
                  style={{ fontFamily: "var(--font-label)" }}
                  aria-autocomplete="list"
                  aria-controls="search-results"
                />
                <kbd
                  className="hidden sm:inline-flex items-center gap-0.5 rounded-md border border-outline-variant/20 bg-surface-high px-1.5 py-0.5 text-[10px] text-on-surface-variant/50"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  ESC
                </kbd>
              </div>

              {/* Results */}
              <div
                id="search-results"
                role="listbox"
                className="max-h-[50vh] overflow-y-auto"
              >
                {loading && query.trim() && (
                  <div className="px-4 py-6 text-center">
                    <span
                      className="text-xs uppercase tracking-widest text-on-surface-variant/50"
                      style={{ fontFamily: "var(--font-label)" }}
                    >
                      Searching…
                    </span>
                  </div>
                )}

                {!loading && query.trim() && results.length === 0 && (
                  <div className="px-4 py-6 text-center">
                    <p
                      className="text-sm text-on-surface-variant/60"
                      style={{ fontFamily: "var(--font-label)" }}
                    >
                      No results for &ldquo;{query}&rdquo;
                    </p>
                    <p
                      className="mt-1 text-xs text-on-surface-variant/40"
                      style={{ fontFamily: "var(--font-label)" }}
                    >
                      Try different keywords or browse by{" "}
                      <button
                        type="button"
                        className="text-primary underline decoration-primary/30 underline-offset-2 transition-colors hover:decoration-primary"
                        onClick={() => {
                          setOpen(false);
                          router.push("/tags");
                        }}
                      >
                        tags
                      </button>
                    </p>
                  </div>
                )}

                {!loading && !query.trim() && (
                  <div className="px-4 py-6 text-center">
                    <p
                      className="text-xs text-on-surface-variant/40"
                      style={{ fontFamily: "var(--font-label)" }}
                    >
                      Search by title, content, or tag
                    </p>
                  </div>
                )}

                {!loading && results.length > 0 && (
                  <ul className="py-2">
                    {results.slice(0, 8).map((result, i) => (
                      <li key={result.slug}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={i === activeIndex}
                          onClick={() => navigate(result.slug)}
                          onMouseEnter={() => setActiveIndex(i)}
                          className={`flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors ${
                            i === activeIndex
                              ? "bg-surface-high"
                              : "hover:bg-surface-high/50"
                          }`}
                        >
                          <span
                            className="text-sm font-medium text-on-surface"
                            style={{ fontFamily: "var(--font-headline)" }}
                          >
                            {result.title}
                          </span>
                          <span className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-on-surface-variant/50">
                            <span style={{ fontFamily: "var(--font-label)" }}>
                              {result.date.replace(/-/g, ".")}
                            </span>
                            <span className="text-outline-variant">
                              &middot;
                            </span>
                            <span style={{ fontFamily: "var(--font-label)" }}>
                              {result.readingTime}
                            </span>
                          </span>
                          {result.snippet && (
                            <span className="line-clamp-1 text-xs text-on-surface-variant/40">
                              {result.snippet}
                            </span>
                          )}
                        </button>
                      </li>
                    ))}

                    {/* View all results link */}
                    {query.trim() && (
                      <li>
                        <button
                          type="button"
                          role="option"
                          aria-selected={activeIndex === results.length}
                          onClick={navigateToSearch}
                          onMouseEnter={() =>
                            setActiveIndex(results.length)
                          }
                          className={`flex w-full items-center gap-2 px-4 py-3 text-left transition-colors ${
                            activeIndex === results.length
                              ? "bg-surface-high"
                              : "hover:bg-surface-high/50"
                          }`}
                        >
                          <svg
                            className="h-3.5 w-3.5 text-primary"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                            />
                          </svg>
                          <span
                            className="text-xs uppercase tracking-widest text-primary"
                            style={{ fontFamily: "var(--font-label)" }}
                          >
                            View all results
                          </span>
                        </button>
                      </li>
                    )}
                  </ul>
                )}
              </div>

              {/* Footer hints */}
              <div className="flex items-center gap-4 border-t border-outline-variant/10 px-4 py-2.5">
                <span className="flex items-center gap-1.5 text-[10px] text-on-surface-variant/30">
                  <kbd
                    className="rounded border border-outline-variant/15 bg-surface-high px-1 py-0.5"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    ↑↓
                  </kbd>
                  navigate
                </span>
                <span className="flex items-center gap-1.5 text-[10px] text-on-surface-variant/30">
                  <kbd
                    className="rounded border border-outline-variant/15 bg-surface-high px-1 py-0.5"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    ↵
                  </kbd>
                  select
                </span>
                <span className="flex items-center gap-1.5 text-[10px] text-on-surface-variant/30">
                  <kbd
                    className="rounded border border-outline-variant/15 bg-surface-high px-1 py-0.5"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    esc
                  </kbd>
                  close
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
