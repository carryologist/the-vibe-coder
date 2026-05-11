"use client";

import { AdminCardControls } from "./AdminCardControls";
import { useIsAdmin } from "@/lib/useIsAdmin";

interface AdminCardControlsIslandProps {
  slug: string;
}

/**
 * Client-side wrapper that renders AdminCardControls only when the
 * current user has a valid admin session.
 *
 * Used in PostCard so the homepage can stay statically rendered
 * without the page-level cookies() check that previously gated the
 * admin badge.
 */
export function AdminCardControlsIsland({ slug }: AdminCardControlsIslandProps) {
  const isAdmin = useIsAdmin();
  if (!isAdmin) return null;
  return <AdminCardControls slug={slug} />;
}
