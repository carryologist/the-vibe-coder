import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-[#1F1F1F]">
      <div className="mx-auto flex max-w-3xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
        <p className="font-mono text-xs text-[#555555]">
          &copy; 2025 Vibes Coder
        </p>
        <nav className="flex gap-6">
          <Link
            href="#"
            className="font-mono text-xs text-[#555555] transition-colors hover:text-[#A3E635]"
            target="_blank"
            rel="noopener noreferrer"
          >
            Twitter / X
          </Link>
          <Link
            href="#"
            className="font-mono text-xs text-[#555555] transition-colors hover:text-[#A3E635]"
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
