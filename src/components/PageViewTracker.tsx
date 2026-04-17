"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    // Don't track admin pages.
    if (pathname.startsWith("/admin")) return;

    // Fire and forget — don't block rendering.
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname }),
    }).catch(() => {
      // Silently ignore errors — analytics is best-effort.
    });
  }, [pathname]);

  return null;
}
