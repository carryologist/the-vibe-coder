import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";

// ----------------------------------------------------------------
// Slack signature verification
// ----------------------------------------------------------------

const SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET ?? "";

async function verifySlackSignature(req: NextRequest, body: string): Promise<boolean> {
  const timestamp = req.headers.get("x-slack-request-timestamp");
  const signature = req.headers.get("x-slack-signature");
  if (!timestamp || !signature || !SIGNING_SECRET) return false;

  // Reject requests older than 5 minutes to prevent replay attacks.
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(timestamp)) > 300) return false;

  const basestring = `v0:${timestamp}:${body}`;
  const hmac = createHmac("sha256", SIGNING_SECRET)
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

const GITHUB_TOKEN = process.env.GITHUB_TOKEN ?? "";
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
        Authorization: `Bearer ${GITHUB_TOKEN}`,
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
        Authorization: `Bearer ${GITHUB_TOKEN}`,
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
  const trimmed = text.trim();

  // Support "backlog: item text" prefix.
  const backlogMatch = trimmed.match(/^backlog:\s*(.+)/i);
  if (backlogMatch) {
    return { item: backlogMatch[1].trim(), section: "backlog" };
  }

  return { item: trimmed, section: "next" };
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

  if (!GITHUB_TOKEN) {
    return NextResponse.json({
      response_type: "ephemeral",
      text: "Server misconfiguration: missing GitHub token.",
    });
  }

  const { item, section } = parseCommand(text);
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
    console.error("Failed to update TODO.md:", err);
    return NextResponse.json({
      response_type: "ephemeral",
      text: `Failed to update TODO.md: ${err instanceof Error ? err.message : "unknown error"}`,
    });
  }
}
