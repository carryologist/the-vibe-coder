import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto bg-surface-lowest">
      <div className="mx-auto flex max-w-3xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
        <p
          className="text-xs uppercase tracking-widest text-on-surface-variant"
          style={{ fontFamily: "var(--font-label)" }}
        >
          © 2026 Vibes Coder
        </p>
        <nav className="flex gap-6">
          <Link
            href="https://www.linkedin.com/in/rwhiteley"
            className="text-xs uppercase tracking-widest text-on-surface-variant transition-colors hover:text-accent-warm"
            style={{ fontFamily: "var(--font-label)" }}
            target="_blank"
            rel="noopener noreferrer"
          >
            LinkedIn
          </Link>
          <Link
            href="https://github.com/carryologist"
            className="text-xs uppercase tracking-widest text-on-surface-variant transition-colors hover:text-accent-warm"
            style={{ fontFamily: "var(--font-label)" }}
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </Link>
          <Link
            href="https://coder.com/blog"
            className="text-xs uppercase tracking-widest text-on-surface-variant transition-colors hover:text-accent-warm"
            style={{ fontFamily: "var(--font-label)" }}
            target="_blank"
            rel="noopener noreferrer"
          >
            Company Blog
          </Link>
          <Link
            href="/feed.xml"
            className="text-xs uppercase tracking-widest text-on-surface-variant transition-colors hover:text-accent-warm"
            style={{ fontFamily: "var(--font-label)" }}
          >
            RSS
          </Link>
          <Link
            href="/admin"
            className="text-xs uppercase tracking-widest text-outline-variant/40 transition-colors hover:text-primary"
            style={{ fontFamily: "var(--font-label)" }}
          >
            Admin
          </Link>
        </nav>
      </div>
    </footer>
  );
}
