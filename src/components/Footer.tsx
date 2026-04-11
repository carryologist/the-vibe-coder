import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-neutral-200 dark:border-neutral-800">
      <div className="mx-auto flex max-w-3xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
        <p className="text-sm text-neutral-400 dark:text-neutral-500">
          &copy; 2025 The Vibe Coder
        </p>

        <nav className="flex gap-6">
          <Link
            href="#"
            className="text-sm text-neutral-400 transition-colors hover:text-foreground dark:text-neutral-500 dark:hover:text-foreground"
            target="_blank"
            rel="noopener noreferrer"
          >
            Twitter / X
          </Link>
          <Link
            href="#"
            className="text-sm text-neutral-400 transition-colors hover:text-foreground dark:text-neutral-500 dark:hover:text-foreground"
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
