import { ImageResponse } from "next/og";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import { visit } from "unist-util-visit";
import type { Root, Heading, Table, Text } from "mdast";

/**
 * Shared table-to-image rendering, used by both the manual "Share as
 * image" button (`/api/share-image`) and the automated Substack
 * syndication feed (`/syndicate.xml` via `/api/share-image/table`).
 * Keeping this in one place means a table shared by a reader and a
 * table synced to Substack always look identical.
 */

// Design tokens (dark theme, matching the blog)
export const COLORS = {
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
const TABLE_WIDTH = 1200;
const MIN_HEIGHT = 280;
const MAX_HEIGHT = 4000; // generous ceiling for a very long table, still bounded
const MAX_ROWS = 200;

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

export interface ParsedTable {
  headers: string[];
  rows: string[][];
}

export function parseMarkdownTable(md: string): ParsedTable {
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

export function calcTableHeight(
  headers: string[],
  rows: string[][],
  numCols: number,
): number {
  // First column is fixed 220px, rest share remaining space
  const availableWidth = TABLE_WIDTH - PADDING_X * 2 - 40; // minus table padding
  const otherColWidth =
    numCols > 1 ? (availableWidth - 220) / (numCols - 1) : availableWidth;

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

export function renderTable(headers: string[], rows: string[][]) {
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

export function Waveform() {
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

export interface TableImageOptions {
  /** Raw GFM markdown for a single pipe table. */
  content: string;
  /** Post title, shown small in the footer. */
  title: string;
  /** Optional label above the table (e.g. the nearest section heading). */
  caption?: string;
}

export class TableImageError extends Error {}

/**
 * Render a single markdown table into a branded PNG, matching the
 * visual style of the manual "Share as image" feature. Throws
 * TableImageError for bad input (empty table, too many rows) so
 * callers can turn that into the appropriate HTTP response.
 */
export function buildTableImageResponse({
  content,
  title,
  caption,
}: TableImageOptions): ImageResponse {
  const tableData = parseMarkdownTable(content);
  if (!tableData.headers.length) {
    throw new TableImageError("Could not parse table");
  }
  if (tableData.rows.length > MAX_ROWS) {
    throw new TableImageError(`table exceeds ${MAX_ROWS} row limit`);
  }

  const contentHeight = calcTableHeight(
    tableData.headers,
    tableData.rows,
    tableData.headers.length,
  );
  const width = TABLE_WIDTH;
  const height = Math.min(
    MAX_HEIGHT,
    Math.max(
      MIN_HEIGHT,
      Math.ceil(
        PADDING_Y +
          (caption ? CAPTION_HEIGHT : 0) +
          contentHeight +
          20 +
          FOOTER_HEIGHT +
          PADDING_Y,
      ),
    ),
  );

  const titleMaxWidth = Math.max(200, width - 340);

  return new ImageResponse(
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

        <div style={{ display: "flex", flexDirection: "column" }}>
          {renderTable(tableData.headers, tableData.rows)}
        </div>

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
            {title}
          </div>
        </div>
      </div>
    ),
    { width, height },
  );
}

export interface ExtractedTable {
  /** Raw GFM markdown for this table, exactly as written in the post. */
  content: string;
  /** Nearest preceding H2 heading text, if any. */
  caption?: string;
}

function headingText(node: Heading): string {
  let out = "";
  visit(node, "text", (n: Text) => {
    out += n.value;
  });
  return out;
}

/**
 * Walk a post's markdown body and pull out every GFM table in document
 * order, along with the nearest preceding H2 as a caption. Used by
 * the syndication pipeline to look up "table N" of a given post by
 * index without re-deriving the full HTML render.
 */
export function extractMarkdownTables(markdown: string): ExtractedTable[] {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(markdown) as Root;
  const tables: ExtractedTable[] = [];
  let lastHeading: string | undefined;

  visit(tree, (node) => {
    if (node.type === "heading" && (node as Heading).depth === 2) {
      lastHeading = headingText(node as Heading);
    }
    if (node.type === "table") {
      const t = node as Table;
      const start = t.position?.start.offset;
      const end = t.position?.end.offset;
      if (start == null || end == null) return;
      tables.push({ content: markdown.slice(start, end), caption: lastHeading });
    }
  });

  return tables;
}
