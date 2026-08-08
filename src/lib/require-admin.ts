import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

/**
 * Handler-level admin check.
 *
 * `src/middleware.ts` already gates every /api/* route that is not on
 * its allowlist, but that made middleware a single point of failure:
 * one mistake in `config.matcher`, one framework middleware-bypass
 * advisory, or one invocation path that skips middleware would expose
 * repo writes, deletes, publishing, and workspace creation to anyone.
 *
 * Every privileged handler calls this as well, so authorization does
 * not depend on a single mechanism.
 *
 * Returns a 401 Response to return immediately, or null when the
 * caller holds a valid admin session.
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  if (await getSession()) return null;
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
