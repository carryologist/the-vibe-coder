import { NextRequest, NextResponse, userAgent } from "next/server";
import { jwtVerify } from "jose";
import { isSessionRevoked } from "@/lib/session-revocation";

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;
  return new TextEncoder().encode(secret);
}

// Routes that authenticate themselves and therefore do not need the
// admin session cookie. Listed exactly rather than by prefix: a prefix
// match means any route added under /api/auth/ or /api/slack/ later is
// unauthenticated by default.
//
// Each enforces its own credential:
//   /api/auth/*           password, or self-checks the session
//   /api/analytics/track  public beacon, path allowlist + rate limit
//   /api/slack/todo       Slack HMAC signature over the raw body
const SELF_AUTHENTICATING = [
  "/admin/login",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/check",
  "/api/analytics/track",
  "/api/slack/todo",
];

// Prefix-matched exceptions, for routes with dynamic segments:
//   /api/share-image*  public share button, rate limited
//   /api/mcp/*         MCP_API_TOKEN bearer auth
const SELF_AUTHENTICATING_PREFIXES = ["/api/share-image", "/api/mcp/"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Markdown content negotiation.
  //
  // Browsers keep receiving the HTML post page. Agents and CLI-like bots
  // can request the same canonical URL and receive the raw markdown via
  // an internal rewrite, which is much cheaper than server-rendering the
  // full MDX page and still keeps the public HTML path static/cacheable.
  if (pathname.startsWith("/posts/") && !pathname.endsWith("/raw")) {
    const accept = request.headers.get("accept") ?? "";
    if (prefersMarkdown(accept, request)) {
      const url = request.nextUrl.clone();
      url.pathname = pathname.replace(/\/?$/, "") + "/raw";
      const res = NextResponse.rewrite(url);
      res.headers.set("Vary", "Accept");
      return res;
    }
  }

  // Allow the login page and the routes that authenticate themselves.
  if (
    SELF_AUTHENTICATING.includes(pathname) ||
    SELF_AUTHENTICATING_PREFIXES.some((p) => pathname.startsWith(p))
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

  const reject = () => {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/admin/login", request.url));
  };

  if (!token || !secret) {
    return reject();
  }

  try {
    const { payload } = await jwtVerify(token, secret);

    // Assert the claims the token was minted with rather than
    // accepting any well-signed JWT, and honour the revocation
    // denylist so logout (and incident response) can invalidate a
    // token that has not expired yet.
    const valid =
      payload.role === "admin" &&
      typeof payload.jti === "string" &&
      payload.jti.length > 0 &&
      !(await isSessionRevoked(payload.jti));

    if (!valid) return reject();
    return NextResponse.next();
  } catch {
    return reject();
  }
}

/**
 * Returns true when the client explicitly prefers markdown over HTML, or
 * when a known non-browser bot asks for a post URL with a broad Accept
 * header. Search/social bots still get HTML for indexing and cards.
 */
function prefersMarkdown(accept: string, request: NextRequest): boolean {
  const { ua, isBot } = userAgent(request);
  if (
    isBot &&
    /curl|wget|python|httpie|go-http-client|okhttp|axios|fetch|node|undici/i.test(ua)
  ) {
    return true;
  }

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
  // Keep proxy off the cacheable public shell. Static CSP headers are in
  // next.config.ts, so public pages do not need per-request proxy work.
  matcher: ["/admin/:path*", "/api/:path*", "/posts/:slug*"],
};
