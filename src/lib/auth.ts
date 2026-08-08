import { createHash, randomUUID, timingSafeEqual } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { isSessionRevoked, revokeSession } from "@/lib/session-revocation";

const COOKIE_NAME = "admin_session";

// Sessions are short-lived. A stolen token is only useful until it
// expires, and the denylist below covers the window in between.
const SESSION_TTL_SECONDS = 60 * 60 * 24; // 24 hours
const COOKIE_MAX_AGE = SESSION_TTL_SECONDS;

export interface SessionClaims {
  jti: string;
  exp: number;
}

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return new TextEncoder().encode(secret);
}

/**
 * Mint a session token.
 *
 * Every token carries a unique `jti` so it can be revoked individually.
 * Without one, logout is purely client-side (clearing the cookie) and a
 * leaked token stays valid for its full lifetime with no remediation
 * short of rotating SESSION_SECRET.
 */
export async function createSession(): Promise<string> {
  const token = await new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecret());
  return token;
}

/**
 * Verify a session token's signature, its `role` claim, and that it has
 * not been revoked.
 *
 * Returns the claims on success and null on any failure, so callers
 * cannot accidentally treat a rejected token as valid.
 */
export async function verifySessionClaims(
  token: string
): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());

    // The role claim is signed at mint time; assert it rather than
    // accepting any well-signed token.
    if (payload.role !== "admin") return null;
    if (typeof payload.jti !== "string" || !payload.jti) return null;
    if (typeof payload.exp !== "number") return null;

    if (await isSessionRevoked(payload.jti)) return null;

    return { jti: payload.jti, exp: payload.exp };
  } catch {
    return null;
  }
}

export async function verifySession(token: string): Promise<boolean> {
  return (await verifySessionClaims(token)) !== null;
}

export async function getSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return verifySession(token);
}

/**
 * Add the current session's `jti` to the denylist so the token stops
 * working immediately, even if a copy of the cookie was captured.
 */
export async function revokeCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return;

  // Verify without the revocation lookup: an already-revoked token
  // needs no second write, and a token that fails signature checks is
  // not worth storing.
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.jti === "string" && typeof payload.exp === "number") {
      await revokeSession(payload.jti, payload.exp);
    }
  } catch {
    // Malformed or expired token: nothing to revoke.
  }
}

export function sessionCookieOptions(token: string) {
  return {
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  };
}

export function clearSessionCookie() {
  return {
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    maxAge: 0,
    path: "/",
  };
}

export function validatePassword(password: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) throw new Error("ADMIN_PASSWORD is not set");

  // Hash both inputs before comparing so the comparison runs in
  // constant time regardless of input length. Returning early on a
  // length mismatch (the previous implementation) would leak the
  // password length via timing, since the early-return path is faster
  // than the timingSafeEqual path.
  //
  // SHA-256 always produces 32 bytes, so timingSafeEqual cannot throw
  // and the comparison is over fixed-size inputs.
  const a = createHash("sha256").update(password).digest();
  const b = createHash("sha256").update(adminPassword).digest();
  return timingSafeEqual(a, b);
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
