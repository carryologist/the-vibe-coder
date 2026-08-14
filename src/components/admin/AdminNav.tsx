"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/drafts", label: "Drafts" },
  { href: "/admin/images", label: "Images" },
  { href: "/admin/record", label: "Record" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/todo", label: "TODO" },
];

export function AdminNav() {
  const pathname = usePathname();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  // A link is active if the path matches exactly OR if it's a nested
  // route under the link's href (e.g. /admin/images/foo highlights Images).
  // The /admin Dashboard link only matches exactly so it doesn't grab
  // every nested admin route.
  function isActive(href: string): boolean {
    if (href === "/admin") return pathname === "/admin";
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <nav className="print:hidden flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-outline-variant px-4 py-3 sm:px-6">
      <span className="font-mono text-xs text-outline">// admin</span>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`font-mono text-xs transition-colors ${
              isActive(link.href)
                ? "text-primary"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </div>
      <button
        onClick={handleLogout}
        className="font-mono text-xs text-outline transition-colors hover:text-red-400 sm:ml-auto"
      >
        Logout
      </button>
    </nav>
  );
}
