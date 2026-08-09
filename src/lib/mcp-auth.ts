/**
 * MCP bearer-token authentication.
 *
 * Compares the presented token against MCP_API_TOKEN in constant time,
 * and enforces a 16-character minimum on the configured secret.
 */

import { createHash, timingSafeEqual } from "crypto";

export function isValidApiToken(token: string | null): boolean {
  if (!token) return false;
  const expected = process.env.MCP_API_TOKEN;
  if (!expected || expected.length < 16) return false;

  // Hash both sides first. The previous implementation returned early
  // on a length mismatch, so the comparison was constant-time only for
  // equal-length inputs and leaked the token's length. SHA-256 always
  // produces 32 bytes, so timingSafeEqual cannot throw. This mirrors
  // validatePassword in lib/auth.ts.
  const a = createHash("sha256").update(token).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}
