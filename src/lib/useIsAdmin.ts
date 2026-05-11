"use client";

import { useEffect, useState } from "react";

/**
 * Client-side admin-session probe. Calls /api/auth/check on mount and
 * returns a boolean indicating whether the current request has a valid
 * admin_session cookie.
 *
 * The first render always returns `false`. The hook then updates once
 * the server has confirmed the session. That two-step is intentional:
 * it lets the parent page stay statically rendered without leaking
 * admin state into the static HTML.
 */
export function useIsAdmin(): boolean {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/check", { credentials: "same-origin" })
      .then((res) => {
        if (!cancelled && res.ok) setIsAdmin(true);
      })
      .catch(() => {
        // Network failure -> stay unauthenticated.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return isAdmin;
}
