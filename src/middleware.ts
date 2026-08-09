import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { isSessionRevoked } from "@/lib/session-revocation";
import { buildCsp, NONCE_HEADER } from "@/lib/csp";

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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ---------------------------------------------------------------------
  // Content Security Policy
  //
  // The policy carries a fresh nonce per request, which is why it is
  // built here rather than as a static header in next.config.ts. The
  // nonce is passed to the app through a request header; the two inline
  // <script> blocks (the theme bootstrap and JSON-LD) read it and echo
  // it back, so 'unsafe-inline' is no longer needed on script-src.
  //
  // Every response returned below goes through withCsp().
  // ---------------------------------------------------------------------
  const nonce = generateNonce();
  const csp = buildCsp(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(NONCE_HEADER, nonce);
  // Next derives the nonce it stamps onto its own inline bootstrap and
  // flight-data scripts from the Content-Security-Policy *request* header.
  // Setting it here is the documented contract; relying on Next reading the
  // response header instead would break hydration if that behaviour changes.
  requestHeaders.set("Content-Security-Policy", csp);

  const withCsp = (response: NextResponse) => {
    response.headers.set("Content-Security-Policy", csp);
    return response;
  };
  const proceed = () =>
    withCsp(NextResponse.next({ request: { headers: requestHeaders } }));

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
      const res = withCsp(
        NextResponse.rewrite(url, { request: { headers: requestHeaders } })
      );
      res.headers.set("Vary", "Accept");
      return res;
    }
  }

  // Allow the login page and the routes that authenticate themselves.
  if (
    SELF_AUTHENTICATING.includes(pathname) ||
    SELF_AUTHENTICATING_PREFIXES.some((p) => pathname.startsWith(p))
  ) {
    return proceed();
  }

  // Protect /admin/* and /api/* (non-auth) routes.
  const isProtected =
    pathname.startsWith("/admin") || pathname.startsWith("/api/");

  if (!isProtected) {
    return proceed();
  }

  const token = request.cookies.get("admin_session")?.value;
  const secret = getSecret();

  const reject = () => {
    if (pathname.startsWith("/api/")) {
      return withCsp(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }
    return withCsp(NextResponse.redirect(new URL("/admin/login", request.url)));
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
    return proceed();
  } catch {
    return reject();
  }
}

/**
 * 128 bits of randomness, base64-encoded. Uses Web Crypto because
 * middleware runs on the Edge runtime.
 */
function generateNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
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
  // Matchers must be static string literals: Next.js validates them at
  // build time.
  //
  // The policy header has to be attached to every HTML response, so
  // this matches everything except Next's own static output and files
  // served straight from public/. The auth-guard logic above is still
  // scoped by pathname.
  matcher: [
    "/((?!_next/static|_next/image|images/|favicon.ico|robots.txt|humans.txt|llms.txt|sitemap.xml|feed.xml|syndicate.xml).*)",
  ],
};
