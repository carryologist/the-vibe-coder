"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SearchModal } from "@/components/SearchModal";

const navLinks = [
  { href: "/", label: "Blog" },
  { href: "/about", label: "About" },
];

/**
 * Inline waveform mark. Uses the theme's primary color with varying
 * opacities so it adapts to dark and light modes automatically.
 */
function WaveformMark() {
  // Bar heights create the same audio waveform contour as the favicon.
  const bars = [
    { height: 14, opacity: 0.4 },
    { height: 24, opacity: 0.65 },
    { height: 32, opacity: 0.85 },
    { height: 38, opacity: 1 },
    { height: 36, opacity: 0.9 },
    { height: 21, opacity: 0.6 },
    { height: 27, opacity: 0.75 },
    { height: 17, opacity: 0.45 },
  ];
  const barWidth = 4;
  const gap = 3;
  const maxHeight = 38;
  const svgWidth = bars.length * (barWidth + gap) - gap;

  return (
    <svg
      viewBox={`0 0 ${svgWidth} ${maxHeight}`}
      className="h-7 w-auto sm:h-8"
      aria-hidden="true"
    >
      {bars.map((bar, i) => (
        <rect
          key={i}
          x={i * (barWidth + gap)}
          y={maxHeight - bar.height}
          width={barWidth}
          height={bar.height}
          rx={barWidth / 2}
          className="fill-primary"
          opacity={bar.opacity}
        />
      ))}
    </svg>
  );
}

/** Detect Mac vs other for keyboard shortcut hint. */
function useIsMac() {
  const [isMac, setIsMac] = useState(false);
  useEffect(() => {
    setIsMac(
      typeof navigator !== "undefined" &&
        /Mac|iPhone|iPad/.test(navigator.userAgent),
    );
  }, []);
  return isMac;
}

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const isMac = useIsMac();

  // Global Cmd+K / Ctrl+K handler
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-bg/80 backdrop-blur-xl shadow-header">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
        <Link
          href="/"
          className="flex items-center gap-3 transition-opacity hover:opacity-80"
        >
          <WaveformMark />
          <span
            className="text-xl font-semibold tracking-tight sm:text-2xl"
            style={{ fontFamily: "var(--font-headline)" }}
          >
            <span className="text-on-surface">vibes</span>
            <span className="text-primary">coder</span>
          </span>
        </Link>

        <div className="flex items-center gap-4">
          {/* Desktop nav */}
          <nav className="hidden gap-8 sm:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs uppercase tracking-widest text-on-surface-variant/60 transition-colors hover:text-primary"
                style={{ fontFamily: "var(--font-label)" }}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Search trigger (Desktop) */}
          <button
            onClick={() => setSearchOpen(true)}
            className="hidden items-center gap-2 rounded-md border border-on-surface-variant/20 px-2 py-1 text-on-surface-variant transition-colors hover:border-primary hover:text-primary sm:flex"
            aria-label="Search posts"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
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
            <span
              className="text-xs font-medium"
              style={{ fontFamily: "var(--font-label)" }}
            >
              Search
            </span>
            <kbd className="rounded border border-on-surface-variant/20 px-1 py-0.5 text-[10px] font-mono text-on-surface-variant/50">
              {isMac ? "⌘K" : "Ctrl+K"}
            </kbd>
          </button>

          <ThemeToggle />

          {/* Search trigger (Mobile) */}
          <button
            onClick={() => setSearchOpen(true)}
            className="inline-flex items-center justify-center rounded-md p-2 text-on-surface-variant transition-colors hover:text-primary sm:hidden"
            aria-label="Search posts"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
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
          </button>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="inline-flex items-center justify-center rounded-md p-2 text-on-surface-variant transition-colors hover:text-primary sm:hidden"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              {menuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <nav className="bg-surface-low px-6 pb-4 sm:hidden">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="block py-2.5 text-xs uppercase tracking-widest text-on-surface-variant/60 transition-colors hover:text-primary"
              style={{ fontFamily: "var(--font-label)" }}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}

      <SearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
      />
    </header>
  );
}
