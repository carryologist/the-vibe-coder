/**
 * MCP bearer-token authentication.
 *
 * Both inputs are hashed with SHA-256 before comparison so that
 * timingSafeEqual always runs over fixed-size (32-byte) buffers.
 * This avoids leaking token length via an early-return on
 * mismatched lengths.
 */

import { createHash, timingSafeEqual } from "crypto";

export function isValidApiToken(token: string | null): boolean {
  if (!token) return false;
  const expected = process.env.MCP_API_TOKEN;
  if (!expected || expected.length < 16) return false;

  const a = createHash("sha256").update(token).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}
