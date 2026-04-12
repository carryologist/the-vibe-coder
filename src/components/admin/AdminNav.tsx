"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/record", label: "Record" },
];

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  return (
    <nav className="flex items-center gap-6 border-b border-[#1F1F1F] px-6 py-3">
      <span className="font-mono text-xs text-[#555555]">// admin</span>
      <div className="flex gap-4">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`font-mono text-xs transition-colors ${
              pathname === link.href
                ? "text-[#A3E635]"
                : "text-[#888888] hover:text-[#EDEDED]"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </div>
      <button
        onClick={handleLogout}
        className="ml-auto font-mono text-xs text-[#555555] transition-colors hover:text-red-400"
      >
        Logout
      </button>
    </nav>
  );
}
