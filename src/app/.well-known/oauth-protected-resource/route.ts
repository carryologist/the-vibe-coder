import { NextResponse } from "next/server";

/**
 * OAuth 2.0 Protected Resource Metadata (RFC 9728).
 *
 * Why this exists: the MCP server at /api/mcp/{mcp,sse} is wrapped in
 * withMcpAuth (mcp-handler), and its 401 responses advertise
 *
 *   WWW-Authenticate: Bearer ... resource_metadata=
 *     "https://vibescoder.dev/.well-known/oauth-protected-resource"
 *
 * Until this route shipped, that URL 404'd — a dangling discovery
 * pointer. Any MCP client following the RFC 9728 flow hit a dead end.
 *
 * What it says: the MCP server authenticates with a static bearer
 * token (MCP_API_TOKEN), not an OAuth authorization server, so
 * `authorization_servers` is deliberately omitted (it is OPTIONAL per
 * RFC 9728 §2). Clients learn the resource identifier and that the
 * token travels in the Authorization header; obtaining a token is
 * out-of-band (it's an admin/authoring server, not a public API).
 */
export const dynamic = "force-static";

const metadata = {
  resource: "https://vibescoder.dev/api/mcp/mcp",
  resource_name: "vibescoder.dev MCP server",
  bearer_methods_supported: ["header"],
  resource_documentation: "https://vibescoder.dev/about",
  // Scopes the token is granted (mirrors withMcpAuth in
  // src/app/api/mcp/[transport]/route.ts).
  scopes_supported: [
    "content:read",
    "content:write",
    "analytics:read",
    "deploy:run",
    "syndicate:run",
  ],
};

export async function GET() {
  return NextResponse.json(metadata, {
    headers: {
      // Discovery metadata is public and stable; let everything cache it.
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Max-Age": "600",
    },
  });
}
