import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { smartQuotes } from "@/lib/typography";

export const runtime = "nodejs";

interface ShareImageRequest {
  type: "table" | "code";
  content: string;
  language?: string;
  title: string;
  slug: string;
  caption?: string;
}

// Design tokens (dark theme, matching the blog)
const COLORS = {
  bg: "#0a0a0b",
  surface: "#1a1c1c",
  surfaceHigh: "#282a2a",
  primary: "#dcb8ff",
  text: "#e2e2e2",
  textMuted: "#a0a0a0",
  border: "rgba(76, 68, 82, 0.3)",
  codeBg: "#0d0f0f",
};

// Layout constants (px)
const PADDING_Y = 48;
const PADDING_X = 56;
const CAPTION_HEIGHT = 38; // fontSize 16 + margin
const FOOTER_HEIGHT = 50; // waveform + text
const TABLE_HEADER_HEIGHT = 46;
const TABLE_ROW_HEIGHT = 42;
const CODE_LINE_HEIGHT = 24; // 14px * 1.7
const CODE_PADDING = 32; // top + bottom inside code block
const CODE_LANG_HEIGHT = 32; // language label bar
const CODE_CHAR_WIDTH = 8.4; // ~px per char in monospace at 14px
const CODE_BLOCK_PAD_X = 40; // left + right padding inside code block
const MIN_HEIGHT = 280;
const MIN_WIDTH = 480; // enough for footer branding
const TABLE_WIDTH = 1200;
const MAX_WIDTH = 1200;
const MAX_HEIGHT = 4000; // generous ceiling for a very long snippet, still bounded
const MAX_CONTENT_LENGTH = 20_000; // far past any real code block or table in a post
const MAX_ROWS = 200;
const SHARE_IMAGE_RATE_LIMIT = 20;
const SHARE_IMAGE_RATE_WINDOW_SECONDS = 60;

// Waveform bar data: [height, opacity]
const BARS: [number, number][] = [
  [14, 0.4],
  [24, 0.65],
  [32, 0.85],
  [38, 1.0],
  [36, 0.9],
  [21, 0.6],
  [27, 0.75],
  [17, 0.45],
];

function parseMarkdownTable(md: string): { headers: string[]; rows: string[][] } {
  const lines = md.trim().split("\n").filter((l) => l.trim().length > 0);
  if (lines.length < 2) return { headers: [], rows: [] };

  const parseLine = (line: string) =>
    line
      .split("|")
      .map((c) => c.trim())
      .filter((c) => c.length > 0 && !/^[-:]+$/.test(c));

  const headers = parseLine(lines[0]);
  const rows = lines
    .slice(2)
    .filter((l) => !/^\|?\s*[-:]+/.test(l.replace(/\|/g, "").trim()))
    .map(parseLine);

  return { headers, rows };
}

function stripBold(text: string): string {
  return text.replace(/\*\*/g, "");
}

// Estimate how many lines a cell wraps to at a given column width.
// Rough heuristic: ~7.5px per character at fontSize 13.
function estimateCellLines(text: string, colWidthPx: number): number {
  const cleaned = stripBold(text);
  const charsPerLine = Math.max(1, Math.floor(colWidthPx / 7.5));
  return Math.max(1, Math.ceil(cleaned.length / charsPerLine));
}

function calcTableHeight(headers: string[], rows: string[][], numCols: number): number {
  // First column is fixed 220px, rest share remaining space
  const availableWidth = TABLE_WIDTH - PADDING_X * 2 - 40; // minus table padding
  const otherColWidth = numCols > 1 ? (availableWidth - 220) / (numCols - 1) : availableWidth;

  let totalHeight = TABLE_HEADER_HEIGHT;
  for (const row of rows) {
    let maxLines = 1;
    for (let ci = 0; ci < row.length; ci++) {
      const colW = ci === 0 ? 220 : otherColWidth;
      maxLines = Math.max(maxLines, estimateCellLines(row[ci], colW));
    }
    // Base row height + extra for wrapped lines
    totalHeight += 20 + maxLines * 18.2; // padding + line-height per line
  }
  return totalHeight;
}

function renderTable(headers: string[], rows: string[][]) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        borderRadius: "16px",
        border: `1px solid ${COLORS.border}`,
        overflow: "hidden",
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: "flex",
          backgroundColor: COLORS.surfaceHigh,
          padding: "14px 20px",
        }}
      >
        {headers.map((h, i) => (
          <div
            key={i}
            style={{
              flex: i === 0 ? "0 0 auto" : "1",
              ...(i === 0 && { width: "220px" }),
              fontSize: 14,
              fontWeight: 700,
              color: COLORS.text,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {stripBold(h)}
          </div>
        ))}
      </div>

      {/* ALL data rows — no truncation */}
      {rows.map((row, ri) => (
        <div
          key={ri}
          style={{
            display: "flex",
            padding: "10px 20px",
            borderTop: `1px solid ${COLORS.border}`,
            backgroundColor: ri % 2 === 0 ? COLORS.surface : COLORS.bg,
          }}
        >
          {row.map((cell, ci) => (
            <div
              key={ci}
              style={{
                flex: ci === 0 ? "0 0 auto" : "1",
                ...(ci === 0 && { width: "220px" }),
                fontSize: 13,
                color: ci === 0 ? COLORS.primary : COLORS.textMuted,
                lineHeight: "1.4",
                fontWeight: ci === 0 ? 600 : 400,
              }}
            >
              {stripBold(cell)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function renderCode(content: string, language?: string) {
  // Show all lines — no truncation
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        borderRadius: "16px",
        border: `1px solid ${COLORS.border}`,
        overflow: "hidden",
        backgroundColor: COLORS.codeBg,
      }}
    >
      {language ? (
        <div
          style={{
            display: "flex",
            padding: "8px 20px",
            borderBottom: `1px solid ${COLORS.border}`,
          }}
        >
          <span
            style={{
              fontSize: 12,
              color: COLORS.primary,
              fontFamily: "monospace",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {language}
          </span>
        </div>
      ) : null}

      <div style={{ display: "flex", padding: "16px 20px" }}>
        <pre
          style={{
            margin: 0,
            fontSize: 14,
            lineHeight: "1.7",
            color: COLORS.text,
            fontFamily: "monospace",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {content}
        </pre>
      </div>
    </div>
  );
}

function Waveform() {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: "4px" }}>
      {BARS.map(([h, opacity], i) => (
        <div
          key={i}
          style={{
            width: "6px",
            height: `${h * 0.6}px`,
            borderRadius: "3px",
            backgroundColor: `rgba(220, 184, 255, ${opacity})`,
          }}
        />
      ))}
    </div>
  );
}

function calcDimensions(
  type: "table" | "code",
  content: string,
  language: string | undefined,
  caption: string | undefined,
  tableData: { headers: string[]; rows: string[][] } | null,
): { width: number; height: number } {
  let contentHeight: number;
  let width: number;

  if (type === "table" && tableData) {
    contentHeight = calcTableHeight(
      tableData.headers,
      tableData.rows,
      tableData.headers.length,
    );
    width = TABLE_WIDTH;
  } else {
    // Code: width based on longest line
    const lines = content.split("\n");
    const maxLineLen = Math.max(...lines.map((l) => l.length));
    const codeContentWidth = maxLineLen * CODE_CHAR_WIDTH + CODE_BLOCK_PAD_X;
    // Add outer padding + border
    width = Math.ceil(codeContentWidth + PADDING_X * 2);
    width = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width));
    contentHeight =
      CODE_PADDING + lines.length * CODE_LINE_HEIGHT + (language ? CODE_LANG_HEIGHT : 0);
  }

  const height =
    PADDING_Y +
    (caption ? CAPTION_HEIGHT : 0) +
    contentHeight +
    20 + // gap between content and footer
    FOOTER_HEIGHT +
    PADDING_Y;

  return {
    width,
    height: Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, Math.ceil(height))),
  };
}

export async function POST(request: NextRequest) {
  try {
    // Public, unauthenticated route (called client-side from the
    // ShareableSnippet component) -- rate limit and bound the input
    // size before doing any rendering work. Previously this had
    // neither: an arbitrarily large `content` string, with no cap on
    // rendered height, was reachable by anyone with no throttling,
    // making it a real rendering-cost DoS vector.
    const ip = clientIp(request);
    const rl = await rateLimit(
      `ratelimit:share-image:${ip}`,
      SHARE_IMAGE_RATE_LIMIT,
      SHARE_IMAGE_RATE_WINDOW_SECONDS,
    );
    if (!rl.ok) {
      return Response.json(
        { error: "rate_limited" },
        { status: 429, headers: { "retry-after": String(rl.retryAfter) } },
      );
    }

    const body: ShareImageRequest = await request.json();
    const { type, content, language, title, slug, caption } = body;

    if (typeof content !== "string" || content.length === 0) {
      return Response.json({ error: "content is required" }, { status: 400 });
    }
    if (content.length > MAX_CONTENT_LENGTH) {
      return Response.json(
        { error: `content exceeds ${MAX_CONTENT_LENGTH} character limit` },
        { status: 413 },
      );
    }

    const isTable = type === "table";

    let tableData: { headers: string[]; rows: string[][] } | null = null;
    if (isTable) {
      tableData = parseMarkdownTable(content);
      if (!tableData.headers.length) {
        return Response.json({ error: "Could not parse table" }, { status: 400 });
      }
      if (tableData.rows.length > MAX_ROWS) {
        return Response.json(
          { error: `table exceeds ${MAX_ROWS} row limit` },
          { status: 413 },
        );
      }
    }

    const dims = calcDimensions(type, content, language, caption, tableData);

    // For code, scale down footer title max-width relative to image width
    const titleMaxWidth = Math.max(200, dims.width - 340);

    const image = new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            backgroundColor: COLORS.bg,
            padding: `${PADDING_Y}px ${PADDING_X}px`,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          {/* Caption / section label */}
          {caption ? (
            <div
              style={{
                display: "flex",
                marginBottom: "16px",
                fontSize: 16,
                fontWeight: 600,
                color: COLORS.primary,
                letterSpacing: "0.02em",
              }}
            >
              {caption}
            </div>
          ) : null}

          {/* Content area — no flex:1, just natural size */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            {isTable && tableData
              ? renderTable(tableData.headers, tableData.rows)
              : renderCode(content, language)}
          </div>

          {/* Footer — pinned to bottom via flex spacer */}
          <div style={{ display: "flex", flex: 1 }} />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: "20px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Waveform />
              <span style={{ fontSize: 18, fontWeight: 600, color: COLORS.text }}>
                vibes
              </span>
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: COLORS.primary,
                  marginLeft: "-6px",
                }}
              >
                coder
              </span>
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 13,
                color: COLORS.textMuted,
                maxWidth: `${titleMaxWidth}px`,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {smartQuotes(title)}
            </div>
          </div>
        </div>
      ),
      {
        width: dims.width,
        height: dims.height,
      },
    );

    return image;
  } catch (err) {
    console.error("[share-image] ERROR:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to generate image" },
      { status: 500 },
    );
  }
}
