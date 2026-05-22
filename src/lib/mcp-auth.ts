/**
 * MCP bearer-token authentication.
 *
 * Same pattern as the fitness-tracker MCP server: timing-safe comparison
 * against MCP_API_TOKEN, minimum 16-char enforcement.
 */

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return mismatch === 0
}

export function isValidApiToken(token: string | null): boolean {
  if (!token) return false
  const expected = process.env.MCP_API_TOKEN
  if (!expected || expected.length < 16) return false
  return timingSafeEqual(token, expected)
}
