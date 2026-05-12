"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/drafts", label: "Drafts" },
  { href: "/admin/images", label: "Images" },
  { href: "/admin/record", label: "Record" },
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
    <nav className="flex items-center gap-6 border-b border-outline-variant px-6 py-3">
      <span className="font-mono text-xs text-outline">// admin</span>
      <div className="flex gap-4">
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
        className="ml-auto font-mono text-xs text-outline transition-colors hover:text-red-400"
      >
        Logout
      </button>
    </nav>
  );
}
