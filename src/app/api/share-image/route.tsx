import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

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
  // Skip separator line (line[1])
  const rows = lines
    .slice(2)
    .filter((l) => !/^\|?\s*[-:]+/.test(l.replace(/\|/g, "").trim()))
    .map(parseLine);

  return { headers, rows };
}

function stripBold(text: string): string {
  return text.replace(/\*\*/g, "");
}

function renderTable(headers: string[], rows: string[][]) {
  // Limit rows to fit the image
  const maxRows = Math.min(rows.length, 8);
  const displayRows = rows.slice(0, maxRows);

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
          gap: "0",
        }}
      >
        {headers.map((h, i) => (
          <div
            key={i}
            style={{
              flex: i === 0 ? "0 0 auto" : "1",
              width: i === 0 ? "200px" : undefined,
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

      {/* Data rows */}
      {displayRows.map((row, ri) => (
        <div
          key={ri}
          style={{
            display: "flex",
            padding: "12px 20px",
            borderTop: `1px solid ${COLORS.border}`,
            backgroundColor: ri % 2 === 0 ? COLORS.surface : COLORS.bg,
          }}
        >
          {row.map((cell, ci) => (
            <div
              key={ci}
              style={{
                flex: ci === 0 ? "0 0 auto" : "1",
                width: ci === 0 ? "200px" : undefined,
                fontSize: 14,
                color: ci === 0 ? COLORS.primary : COLORS.textMuted,
                lineHeight: "1.5",
                fontWeight: ci === 0 ? 600 : 400,
              }}
            >
              {stripBold(cell)}
            </div>
          ))}
        </div>
      ))}

      {rows.length > maxRows && (
        <div
          style={{
            display: "flex",
            padding: "10px 20px",
            borderTop: `1px solid ${COLORS.border}`,
            backgroundColor: COLORS.surface,
            justifyContent: "center",
          }}
        >
          <span style={{ fontSize: 13, color: COLORS.textMuted }}>
            +{rows.length - maxRows} more rows — see full table at vibescoder.dev
          </span>
        </div>
      )}
    </div>
  );
}

function renderCode(content: string, language?: string) {
  const lines = content.split("\n");
  const maxLines = Math.min(lines.length, 18);
  const displayLines = lines.slice(0, maxLines);

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
      {/* Language label */}
      {language && (
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
      )}

      {/* Code content */}
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
          {displayLines.join("\n")}
          {lines.length > maxLines ? `\n  … +${lines.length - maxLines} more lines` : ""}
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

export async function POST(request: NextRequest) {
  try {
    const body: ShareImageRequest = await request.json();
    const { type, content, language, title, slug, caption } = body;

    const isTable = type === "table";

    let tableData: { headers: string[]; rows: string[][] } | null = null;
    if (isTable) {
      tableData = parseMarkdownTable(content);
      if (!tableData.headers.length) {
        return Response.json({ error: "Could not parse table" }, { status: 400 });
      }
    }

    const image = new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            backgroundColor: COLORS.bg,
            padding: "48px 56px",
            fontFamily: "system-ui, sans-serif",
            position: "relative",
          }}
        >
          {/* Caption / section label */}
          {caption && (
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
          )}

          {/* Content area */}
          <div style={{ display: "flex", flex: 1, flexDirection: "column", justifyContent: "center" }}>
            {isTable && tableData
              ? renderTable(tableData.headers, tableData.rows)
              : renderCode(content, language)}
          </div>

          {/* Bottom branding bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: "24px",
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
                fontSize: 14,
                color: COLORS.textMuted,
              }}
            >
              {title}
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      },
    );

    return image;
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to generate image" },
      { status: 500 },
    );
  }
}
