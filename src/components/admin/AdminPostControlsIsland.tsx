"use client";

import { AdminPostControls } from "./AdminPostControls";
import { useIsAdmin } from "@/lib/useIsAdmin";

interface AdminPostControlsIslandProps {
  slug: string;
}

/**
 * Client-side wrapper that renders AdminPostControls only when the
 * current user has a valid admin session.
 *
 * Lets /posts/[slug] stay statically rendered: the server component
 * no longer needs to call cookies(), which had been forcing every
 * post into dynamic rendering (~200-600ms TTFB instead of <50ms).
 *
 * Renders nothing during the auth check and nothing for unauthenticated
 * users, so the layout for the ~100% of readers who aren't admin is
 * unchanged.
 */
export function AdminPostControlsIsland({ slug }: AdminPostControlsIslandProps) {
  const isAdmin = useIsAdmin();
  if (!isAdmin) return null;
  return <AdminPostControls slug={slug} />;
}
