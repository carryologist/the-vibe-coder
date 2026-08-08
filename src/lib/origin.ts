/**
 * Shared same-origin check for state-changing requests.
 *
 * Browsers always send `Origin` on cross-site POSTs, so a mismatch is a
 * reliable cross-site signal. A missing `Origin` is accepted because
 * non-browser clients (curl, the Slack integration, MCP agents) omit
 * it, and those requests are authenticated by other means.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return true;

  try {
    return new URL(origin).host === host;
  } catch {
    // Unparsable Origin: treat as foreign rather than as absent.
    return false;
  }
}
