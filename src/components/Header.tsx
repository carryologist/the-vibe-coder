"use client";

import { useState } from "react";
import Link from "next/link";

const navLinks = [
  { href: "/", label: "Blog" },
  { href: "/about", label: "About" },
];

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-[#121414]/80 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
        <Link
          href="/"
          className="text-xl font-bold tracking-tighter transition-opacity hover:opacity-80"
          style={{ fontFamily: "var(--font-headline)" }}
        >
          <span className="text-[#e2e2e2]">Vibes</span>{" "}
          <span className="text-[#BC7CFF]">Coder</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden gap-8 sm:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-xs uppercase tracking-widest text-[#cec2d4]/60 transition-colors hover:text-[#dcb8ff]"
              style={{ fontFamily: "var(--font-label)" }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="inline-flex items-center justify-center rounded-md p-2 text-[#cec2d4] transition-colors hover:text-[#dcb8ff] sm:hidden"
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <nav className="bg-[#1a1c1c] px-6 pb-4 sm:hidden">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="block py-2.5 text-xs uppercase tracking-widest text-[#cec2d4]/60 transition-colors hover:text-[#dcb8ff]"
              style={{ fontFamily: "var(--font-label)" }}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
