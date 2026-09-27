"use client";

import { useEffect, useState } from "react";

function hasAdminSessionCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split(";")
    .some((cookie) => cookie.trim().startsWith("admin_session="));
}

/**
 * Client-side admin-session probe. Most visitors do not have the
 * admin_session cookie, so avoid calling /api/auth/check for them. That
 * endpoint exists only to validate a candidate admin session before
 * showing editing controls, not as a page-view beacon.
 *
 * The first render always returns `false`. If a cookie is present, the
 * hook asks the server to verify it and updates only on a 200 response.
 */
export function useIsAdmin(): boolean {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!hasAdminSessionCookie()) return;

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
