import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";

// Coder Agents Chats API (experimental) — see
// https://coder.com/docs/ai-coder/agents/tasks-to-chats-migration
//
// Fires a POST to spin up a new Coder Agents chat/workspace pre-prompted
// to tackle a single backlog item from content/TODO.md. Requires a
// personal Coder-Session-Token (see CODER_API_TOKEN in .env.example) —
// this is a real, billable workspace, not a dry run.
const CODER_BASE_URL = "https://coder.vibescoder.dev";
const CODER_ORG_ID = "28332ca8-32f1-4962-858c-d4526eb0a8b8";

// Spinning up a real Coder Agents workspace via the Chats API routinely
// takes longer than Vercel's default function timeout (10s Hobby / 15s
// Pro). Without this, Vercel kills the function mid-request and returns
// its own HTML error page, which breaks the client's res.json() call
// with a confusing "Unexpected token '<'" error instead of our JSON
// error shape. Matches the pattern used by other slow external-API
// routes in this app (see generate-post, mcp).
export const maxDuration = 60;

function buildPrompt(itemText: string): string {
  return (
    `Tackle this backlog item from content/TODO.md: \`${itemText}\`. ` +
    "Clone the relevant repos and work on it end-to-end: implement, test, " +
    "commit to a feature branch, open a PR."
  );
}

// Authorization is enforced twice: src/middleware.ts gates all /api/*
// routes behind the admin session cookie, and requireAdmin() below
// repeats the check in the handler so a middleware bypass alone cannot
// create a real, billable workspace.
//
// The entire body below is wrapped in one outer try/catch as a last
// resort. Two prior fixes (maxDuration, and guarding the response-body
// read) each closed off a way for this handler to crash instead of
// returning JSON, but the button still showed a bare, unlabeled 502 —
// meaning something is still escaping uncaught. Every branch below now
// also console.error()s before returning, so the real cause shows up in
// `vercel logs` / the dashboard's Runtime Logs on the next attempt.
export async function POST(request: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const token = process.env.CODER_API_TOKEN;
    if (!token) {
      console.error("[launch-agent] CODER_API_TOKEN is not configured");
      return NextResponse.json(
        { error: "CODER_API_TOKEN is not configured on the server." },
        { status: 500 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch (err) {
      console.error("[launch-agent] failed to parse request body", err);
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const itemText =
      body && typeof body === "object" && "text" in body
        ? (body as { text?: unknown }).text
        : undefined;
    if (typeof itemText !== "string" || itemText.trim().length === 0) {
      console.error("[launch-agent] missing/empty `text` in request body");
      return NextResponse.json(
        { error: "Request body must include a non-empty `text` string." },
        { status: 400 }
      );
    }

    let coderResponse: Response;
    try {
      coderResponse = await fetch(`${CODER_BASE_URL}/api/experimental/chats`, {
        method: "POST",
        headers: {
          "Coder-Session-Token": token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organization_id: CODER_ORG_ID,
          content: [{ type: "text", text: buildPrompt(itemText) }],
        }),
      });
    } catch (err) {
      console.error("[launch-agent] fetch to Coder Agents API threw", err);
      return NextResponse.json(
        {
          error: `Failed to reach Coder Agents API: ${
            err instanceof Error ? err.message : String(err)
          }`,
        },
        { status: 502 }
      );
    }

    let rawText: string;
    try {
      rawText = await coderResponse.text();
    } catch (err) {
      console.error(
        "[launch-agent] reading Coder Agents API response body threw",
        err
      );
      return NextResponse.json(
        {
          error: `Failed to read Coder Agents API response: ${
            err instanceof Error ? err.message : String(err)
          }`,
        },
        { status: 502 }
      );
    }

    let data: unknown = null;
    try {
      data = rawText ? JSON.parse(rawText) : null;
    } catch {
      // Non-JSON response — fall through with rawText for debugging.
    }

    if (!coderResponse.ok) {
      console.error(
        `[launch-agent] Coder Agents API returned ${coderResponse.status}`,
        data ?? rawText
      );
      return NextResponse.json(
        {
          error: `Coder Agents API returned ${coderResponse.status}`,
          detail: data ?? rawText,
        },
        { status: 502 }
      );
    }

    // Response shape isn't fully pinned down in Coder's public docs at
    // time of writing (POST is documented by example, not schema) — the
    // GET/PATCH examples confirm chats have at least an `id`, `status`,
    // and `workspace_id`. Extract defensively and let the client fall
    // back to "launched, no direct link" if `id` is missing.
    const chatId =
      data && typeof data === "object" && "id" in data
        ? String((data as { id: unknown }).id)
        : null;

    return NextResponse.json({
      ok: true,
      chatId,
      chatUrl: chatId ? `${CODER_BASE_URL}/chat/${chatId}` : null,
      raw: data,
    });
  } catch (err) {
    // Absolute last resort — if anything above still throws (a bug we
    // haven't anticipated), log it and return JSON rather than let the
    // platform serve its own opaque error page.
    console.error("[launch-agent] unhandled error in route handler", err);
    return NextResponse.json(
      {
        error: `Unhandled error: ${
          err instanceof Error ? err.message : String(err)
        }`,
      },
      { status: 500 }
    );
  }
}
