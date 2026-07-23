import { NextRequest, NextResponse } from "next/server";

// Coder Agents Chats API (experimental) — see
// https://coder.com/docs/ai-coder/agents/tasks-to-chats-migration
//
// Fires a POST to spin up a new Coder Agents chat/workspace pre-prompted
// to tackle a single backlog item from content/TODO.md. Requires a
// personal Coder-Session-Token (see CODER_API_TOKEN in .env.example) —
// this is a real, billable workspace, not a dry run.
const CODER_BASE_URL = "https://coder.vibescoder.dev";
const CODER_ORG_ID = "28332ca8-32f1-4962-858c-d4526eb0a8b8";

function buildPrompt(itemText: string): string {
  return (
    `Tackle this backlog item from content/TODO.md: \`${itemText}\`. ` +
    "Clone the relevant repos and work on it end-to-end: implement, test, " +
    "commit to a feature branch, open a PR."
  );
}

// Auth is enforced by src/middleware.ts, which gates all /api/* routes
// behind the admin session cookie — no separate check needed here.
export async function POST(request: NextRequest) {
  const token = process.env.CODER_API_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "CODER_API_TOKEN is not configured on the server." },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const itemText =
    body && typeof body === "object" && "text" in body
      ? (body as { text?: unknown }).text
      : undefined;
  if (typeof itemText !== "string" || itemText.trim().length === 0) {
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
    return NextResponse.json(
      {
        error: `Failed to reach Coder Agents API: ${
          err instanceof Error ? err.message : String(err)
        }`,
      },
      { status: 502 }
    );
  }

  const rawText = await coderResponse.text();
  let data: unknown = null;
  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    // Non-JSON response — fall through with rawText for debugging.
  }

  if (!coderResponse.ok) {
    return NextResponse.json(
      {
        error: `Coder Agents API returned ${coderResponse.status}`,
        detail: data ?? rawText,
      },
      { status: 502 }
    );
  }

  // Response shape isn't fully pinned down in Coder's public docs at time
  // of writing (POST is documented by example, not schema) — the GET/PATCH
  // examples confirm chats have at least an `id`, `status`, and
  // `workspace_id`. Extract defensively and let the client fall back to
  // "launched, no direct link" if `id` is missing.
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
}
