import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

// Lightweight authentication probe used by client islands on
// statically-rendered pages. Returns 200 if a valid admin_session
// cookie is present, 401 otherwise. Never sets cookies, never reveals
// anything beyond the boolean.
//
// This endpoint exists so that pages like /posts/[slug] can stay
// static (no cookies() call in the server component) and still show
// admin controls when the author is logged in. The island fetches
// this on mount; the rest of the page is cacheable.
export async function GET() {
  const ok = await getSession();
  if (!ok) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  return NextResponse.json(
    { ok: true },
    {
      headers: {
        // Never cache the auth result. A Vercel edge cache hit could
        // otherwise leak admin state across users.
        "Cache-Control": "no-store",
      },
    },
  );
}
