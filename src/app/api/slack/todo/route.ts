import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";

// ----------------------------------------------------------------
// Slack signature verification
// ----------------------------------------------------------------

// Read secrets per-request instead of at module load so that an env
// var rotation in Vercel becomes effective without a redeploy. The
// module is evaluated once per cold start; capturing process.env at
// the top would freeze the old value across warm invocations.

async function verifySlackSignature(req: NextRequest, body: string): Promise<boolean> {
  const signingSecret = process.env.SLACK_SIGNING_SECRET ?? "";
  const timestamp = req.headers.get("x-slack-request-timestamp");
  const signature = req.headers.get("x-slack-signature");
  if (!timestamp || !signature || !signingSecret) return false;

  // Reject requests older than 5 minutes to prevent replay attacks.
  // Number("abc") is NaN and Math.abs(NaN) > 300 is false, so a
  // non-numeric timestamp used to skip this check entirely.
  const ts = Number(timestamp);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(ts) || Math.abs(now - ts) > 300) return false;

  const basestring = `v0:${timestamp}:${body}`;
  const hmac = createHmac("sha256", signingSecret)
    .update(basestring)
    .digest("hex");
  const expected = `v0=${hmac}`;

  try {
    return timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected),
    );
  } catch {
    return false;
  }
}

// ----------------------------------------------------------------
// GitHub helpers
// ----------------------------------------------------------------

function githubToken(): string {
  return process.env.GITHUB_TOKEN ?? "";
}

const REPO_OWNER = "carryologist";
const REPO_NAME = "the-vibe-coder-content";
const FILE_PATH = "content/TODO.md";

interface GitHubFileResponse {
  content: string;
  sha: string;
}

async function fetchTodoFile(): Promise<{ content: string; sha: string }> {
  const res = await fetch(
    `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`,
    {
      headers: {
        Authorization: `Bearer ${githubToken()}`,
        Accept: "application/vnd.github+json",
      },
      cache: "no-store",
    },
  );
  if (!res.ok) throw new Error(`GitHub GET failed: ${res.status}`);

  const data: GitHubFileResponse = await res.json();
  const content = Buffer.from(data.content, "base64").toString("utf-8");
  return { content, sha: data.sha };
}

async function commitTodoFile(content: string, sha: string, message: string) {
  const res = await fetch(
    `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${githubToken()}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        content: Buffer.from(content).toString("base64"),
        sha,
      }),
    },
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub PUT failed: ${res.status} ${err}`);
  }
}

// ----------------------------------------------------------------
// TODO.md parsing and editing
// ----------------------------------------------------------------

type Section = "next" | "backlog";

/** Upper bound on a single TODO bullet added from Slack. */
const MAX_ITEM_LENGTH = 500;

function insertTodoItem(
  markdown: string,
  item: string,
  section: Section,
): string {
  // Find the target section header and insert the item at the end
  // of that section (before the next ## heading or EOF).
  const sectionHeader =
    section === "backlog" ? "## Ideas / Backlog" : "## Up Next";

  const headerIndex = markdown.indexOf(sectionHeader);
  if (headerIndex === -1) {
    // Section not found; append to end of file.
    return markdown.trimEnd() + `\n\n${sectionHeader}\n\n- [ ] ${item}\n`;
  }

  // Find the end of this section (next ## heading or EOF).
  const afterHeader = headerIndex + sectionHeader.length;
  const nextSectionMatch = markdown.slice(afterHeader).search(/\n## /);
  const insertPos =
    nextSectionMatch === -1
      ? markdown.length
      : afterHeader + nextSectionMatch;

  // Find the last non-empty line in the section to insert after it.
  const sectionContent = markdown.slice(afterHeader, insertPos);
  const lastItemMatch = sectionContent.match(/[\s\S]*\S/);
  const insertAt = lastItemMatch
    ? afterHeader + (lastItemMatch.index ?? 0) + lastItemMatch[0].length
    : afterHeader;

  const before = markdown.slice(0, insertAt);
  const after = markdown.slice(insertAt);
  return before + `\n- [ ] ${item}` + after;
}

function parseCommand(text: string): { item: string; section: Section } {
  const trimmed = sanitizeItem(text);

  // Support "backlog: item text" prefix.
  const backlogMatch = trimmed.match(/^backlog:\s*(.+)/i);
  if (backlogMatch) {
    return { item: sanitizeItem(backlogMatch[1]), section: "backlog" };
  }

  return { item: trimmed, section: "next" };
}

/**
 * Flatten Slack-supplied text into a single safe bullet.
 *
 * The text lands in content/TODO.md, which is parsed back by
 * src/lib/todo.ts and can be handed to an autonomous coding agent from
 * /admin/todo. Newlines would let a Slack user inject extra bullets or
 * a "## " heading and restructure the file; leading list/heading
 * markers would do the same on a single line.
 */
function sanitizeItem(text: string): string {
  return text
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[#>*\-\s]+/, "")
    .trim()
    .slice(0, MAX_ITEM_LENGTH);
}

// ----------------------------------------------------------------
// Route handler
// ----------------------------------------------------------------

export async function POST(req: NextRequest) {
  const body = await req.text();

  if (!(await verifySlackSignature(req, body))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Slack sends slash command payloads as form-encoded.
  const params = new URLSearchParams(body);
  const text = params.get("text") ?? "";

  if (!text.trim()) {
    return NextResponse.json({
      response_type: "ephemeral",
      text: "Usage: `/todo Fix the RSS feed` or `/todo backlog: Explore MCP integration`",
    });
  }

  if (!githubToken()) {
    return NextResponse.json({
      response_type: "ephemeral",
      text: "Server misconfiguration: missing GitHub token.",
    });
  }

  const { item, section } = parseCommand(text);
  if (!item) {
    return NextResponse.json({
      response_type: "ephemeral",
      text: "Nothing to add. Usage: `/todo Fix the RSS feed`",
    });
  }
  const sectionLabel = section === "backlog" ? "Ideas / Backlog" : "Up Next";

  try {
    const { content, sha } = await fetchTodoFile();
    const updated = insertTodoItem(content, item, section);
    await commitTodoFile(
      updated,
      sha,
      `todo: add "${item}" to ${sectionLabel}\n\nAdded via /todo Slack command.`,
    );

    return NextResponse.json({
      response_type: "in_channel",
      text: `Added to *${sectionLabel}*:\n> - [ ] ${item}`,
    });
  } catch (err) {
    // Log the detail rather than echoing GitHub's response body into a
    // Slack channel.
    console.error("Failed to update TODO.md:", err);
    return NextResponse.json({
      response_type: "ephemeral",
      text: "Failed to update TODO.md. Check the server logs for details.",
    });
  }
}
