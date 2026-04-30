"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import Fuse from "fuse.js";
import type { FuseResult } from "fuse.js";

interface SearchIndexEntry {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  content: string;
}

const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-on-surface-variant">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-on-surface-variant">
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

const KbdIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-on-surface-variant">
    <rect width="18" height="18" x="3" y="3" rx="2" />
    <path d="m9 9 3 3-3 3" />
  </svg>
);

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
}

export function SearchModal({ isOpen, onClose, onOpen }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FuseResult<SearchIndexEntry>[]>([]);
  const [index, setIndex] = useState<SearchIndexEntry[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Load index
  useEffect(() => {
    fetch("/search-index.json")
      .then((res) => res.json())
      .then((data) => setIndex(data))
      .catch((err) => console.error("Failed to load search index:", err));
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          onOpen();
        }
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, onOpen]);

  // Focus input on open
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Handle search
  useEffect(() => {
    if (!query || !index) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    const fuse = new Fuse(index, {
      keys: ["title", "description", "tags", "content"],
      threshold: 0.3,
    });

    const fuseResults = fuse.search(query);
    setResults(fuseResults);
    setIsSearching(false);
  }, [query, index]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  if (typeof window === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 sm:pt-[20vh]">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            onKeyDown={handleKeyDown}
            className="relative w-full max-w-2xl overflow-hidden rounded-xl border-2 border-primary bg-surface shadow-2xl"
            style={{ fontFamily: "var(--font-headline)" }}
          >
            {/* Search Input Area */}
            <div className="flex items-center gap-3 border-b-2 border-primary/20 bg-surface-low px-4 py-3">
              <SearchIcon />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search posts..."
                className="w-full bg-transparent text-lg font-medium text-on-surface outline-none placeholder:text-on-surface-variant/50"
              />
              <div className="hidden sm:flex items-center gap-1 rounded border border-on-surface-variant/20 px-1.5 py-0.5 text-[10px] font-mono text-on-surface-variant/50">
                <KbdIcon />
                K
              </div>
              <button onClick={onClose} className="text-on-surface-variant hover:text-primary transition-colors">
                <CloseIcon />
              </button>
            </div>

            {/* Results Area */}
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {query && (
                <div className="px-3 py-2 text-xs font-semibold uppercase tracking-widest text-on-surface-variant/40">
                  {results.length} results found
                </div>
              )}

              {query && results.length === 0 && !isSearching && (
                <div className="px-6 py-12 text-center text-on-surface-variant">
                  No results found for "{query}"
                </div>
              )}

              {results.map(({ item }) => (
                <Link
                  key={item.slug}
                  href={`/posts/${item.slug}`}
                  onClick={onClose}
                  className="group block rounded-lg p-3 transition-colors hover:bg-primary/10"
                >
                  <div className="flex flex-col gap-1">
                    <h3 className="text-base font-bold text-on-surface group-hover:text-primary transition-colors">
                      {item.title}
                    </h3>
                    <p className="line-clamp-2 text-sm text-on-surface-variant/70">
                      {item.description}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {item.tags.map((tag: string) => (
                        <span
                          key={tag}
                          className="text-[10px] font-medium uppercase tracking-wider text-primary/70"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </Link>
              ))}

              {!query && index && (
                <div className="px-6 py-12 text-center text-on-surface-variant">
                  <p className="text-sm">Start typing to search...</p>
                </div>
              )}

              {!index && !query && (
                <div className="px-6 py-12 text-center text-on-surface-variant">
                  <p className="text-sm">Loading index...</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  , document.body);
}
