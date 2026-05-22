/**
 * Lightweight MCP audit logging via console.log.
 * Captured by Vercel function logs. Write operations also leave a
 * Git-level trail via [mcp] commit message prefixes.
 */

export function mcpLog(
  tool: string,
  action: 'read' | 'write' | 'action',
  details: Record<string, unknown> = {},
) {
  console.log(
    JSON.stringify({
      mcp: true,
      tool,
      action,
      ts: new Date().toISOString(),
      ...details,
    }),
  )
}
