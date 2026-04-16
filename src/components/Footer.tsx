import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto bg-[#0d0f0f]">
      <div className="mx-auto flex max-w-3xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
        <p
          className="text-xs uppercase tracking-widest text-[#4c4452]"
          style={{ fontFamily: "var(--font-label)" }}
        >
          &copy; 2025 Vibes Coder
        </p>
        <nav className="flex gap-6">
          <Link
            href="#"
            className="text-xs uppercase tracking-widest text-[#4c4452] transition-colors hover:text-[#FF8067]"
            style={{ fontFamily: "var(--font-label)" }}
            target="_blank"
            rel="noopener noreferrer"
          >
            Twitter / X
          </Link>
          <Link
            href="#"
            className="text-xs uppercase tracking-widest text-[#4c4452] transition-colors hover:text-[#FF8067]"
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
