import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto bg-surface-lowest">
      <div className="mx-auto flex max-w-3xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
        <p
          className="text-xs uppercase tracking-widest text-outline-variant"
          style={{ fontFamily: "var(--font-label)" }}
        >
          &copy; 2025 Vibes Coder
        </p>
        <nav className="flex gap-6">
          <Link
            href="#"
            className="text-xs uppercase tracking-widest text-outline-variant transition-colors hover:text-accent-warm"
            style={{ fontFamily: "var(--font-label)" }}
            target="_blank"
            rel="noopener noreferrer"
          >
            Twitter / X
          </Link>
          <Link
            href="#"
            className="text-xs uppercase tracking-widest text-outline-variant transition-colors hover:text-accent-warm"
            style={{ fontFamily: "var(--font-label)" }}
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </Link>
        </nav>
      </div>
    </footer>
  );
}
