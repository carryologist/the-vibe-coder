import { NextRequest, NextResponse } from "next/server";
import { validatePassword, createSession, sessionCookieOptions } from "@/lib/auth";
import { rateLimit, rateLimitKey } from "@/lib/rate-limit";
import { isSameOrigin } from "@/lib/origin";

// Constants here rather than env vars: a one-person admin endpoint
// does not need operational tuning, and bumping them in source forces
// the change through code review.
const LOGIN_LIMIT = 5;
const LOGIN_WINDOW_SECONDS = 15 * 60;

export async function POST(request: NextRequest) {
  try {
    // 1) Defense in depth against cross-site form submission. The
    //    session cookie is SameSite=strict so a third-party site
    //    cannot read or send it, but blocking the request at the
    //    server is cheaper and louder. We accept requests with no
    //    Origin header (some non-browser clients omit it) and only
    //    reject the case where Origin is present and clearly foreign.
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: "Bad origin" }, { status: 403 });
    }

    // 2) Per-IP rate limit. Incremented on every attempt (success or
    //    failure) to keep the implementation simple. A legit user
    //    rarely needs more than 1-2 attempts; 5 per 15 minutes is
    //    plenty of headroom for typos without giving a brute-forcer
    //    anywhere near enough volume to be useful.
    //
    //    This limiter is fail-CLOSED. If Upstash is unconfigured or
    //    unreachable, the request is rejected rather than allowed:
    //    otherwise a Redis outage silently removes the only
    //    brute-force control on the single admin credential. The
    //    bucket is keyed off platform-supplied IP headers only, since
    //    a client-settable header lets an attacker mint a fresh bucket
    //    per request.
    const rl = await rateLimit(
      rateLimitKey("login", request),
      LOGIN_LIMIT,
      LOGIN_WINDOW_SECONDS,
      { failClosed: true }
    );
    if (!rl.ok) {
      if (rl.degraded) {
        return NextResponse.json(
          {
            error:
              "Login is temporarily unavailable. Try again in a few minutes.",
          },
          { status: 503, headers: { "Retry-After": "60" } }
        );
      }
      const minutes = Math.ceil(rl.retryAfter / 60);
      return NextResponse.json(
        {
          error: `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
          retryAfter: rl.retryAfter,
        },
        {
          status: 429,
          headers: { "Retry-After": String(rl.retryAfter) },
        }
      );
    }

    const { password } = await request.json();

    if (!password || !validatePassword(password)) {
      return NextResponse.json(
        { error: "Invalid password" },
        { status: 401 }
      );
    }

    const token = await createSession();
    const response = NextResponse.json({ success: true });
    response.cookies.set(sessionCookieOptions(token));
    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
