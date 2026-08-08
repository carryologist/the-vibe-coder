import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;
  return new TextEncoder().encode(secret);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ---------------------------------------------------------------------
  // Markdown content negotiation
  //
  // If an agent requests a /posts/<slug> URL with Accept: text/markdown,
  // rewrite to /posts/<slug>/raw which returns the raw MDX with
  // Content-Type: text/markdown. Browsers send Accept: text/html and
  // continue to receive the HTML page unchanged.
  //
  // The /raw route also sets Vary: Accept so shared caches keep the two
  // representations separate.
  // ---------------------------------------------------------------------
  if (pathname.startsWith("/posts/") && !pathname.endsWith("/raw")) {
    const accept = request.headers.get("accept") ?? "";
    if (prefersMarkdown(accept)) {
      const url = request.nextUrl.clone();
      url.pathname = pathname.replace(/\/?$/, "") + "/raw";
      const res = NextResponse.rewrite(url);
      res.headers.set("Vary", "Accept");
      return res;
    }
  }

  // Allow login page and auth API routes through.
  if (
    pathname === "/admin/login" ||
    pathname.startsWith("/api/auth/") ||
    pathname === "/api/analytics/track" ||
    pathname.startsWith("/api/slack/") ||
    pathname.startsWith("/api/share-image") ||
    pathname.startsWith("/api/mcp/")
  ) {
    return NextResponse.next();
  }

  // Protect /admin/* and /api/* (non-auth) routes.
  const isProtected =
    pathname.startsWith("/admin") || pathname.startsWith("/api/");

  if (!isProtected) {
    return NextResponse.next();
  }

  const token = request.cookies.get("admin_session")?.value;
  const secret = getSecret();

  if (!token || !secret) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  try {
    await jwtVerify(token, secret);
    return NextResponse.next();
  } catch {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }
}

/**
 * Returns true when the client's Accept header explicitly prefers
 * text/markdown over text/html. We compare q-values rather than just
 * checking for substring presence so that browsers sending the default
 * "text/html,...;q=0.9,*\/*;q=0.8" pattern continue to get HTML.
 */
function prefersMarkdown(accept: string): boolean {
  if (!accept) return false;
  let markdownQ = 0;
  let htmlQ = 0;
  for (const part of accept.split(",")) {
    const [mediaType, ...params] = part.trim().split(";").map((s) => s.trim());
    if (!mediaType) continue;
    const qParam = params.find((p) => p.startsWith("q="));
    const q = qParam ? parseFloat(qParam.slice(2)) : 1;
    if (mediaType === "text/markdown") markdownQ = Math.max(markdownQ, q);
    else if (mediaType === "text/html") htmlQ = Math.max(htmlQ, q);
  }
  return markdownQ > 0 && markdownQ >= htmlQ;
}

export const config = {
  // Matchers must be static string literals — Next.js validates them at
  // build time. The /posts/:path* and (/, /about, /tags) entries cover
  // the markdown negotiation rewrites; the auth-guard logic above is
  // unchanged.
  matcher: [
    "/admin/:path*",
    "/api/:path*",
    "/posts/:path*",
    "/",
    "/about",
    "/tags",
  ],
};
