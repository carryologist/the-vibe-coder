import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { smartQuotes } from "@/lib/typography";
import {
  COLORS,
  Waveform,
  buildTableImageResponse,
  TableImageError,
} from "@/lib/table-image";

export const runtime = "nodejs";

interface ShareImageRequest {
  type: "table" | "code";
  content: string;
  language?: string;
  title: string;
  slug: string;
  caption?: string;
}

// Layout constants (px)
const PADDING_Y = 48;
const PADDING_X = 56;
const CAPTION_HEIGHT = 38; // fontSize 16 + margin
const FOOTER_HEIGHT = 50; // waveform + text
const CODE_LINE_HEIGHT = 24; // 14px * 1.7
const CODE_PADDING = 32; // top + bottom inside code block
const CODE_LANG_HEIGHT = 32; // language label bar
const CODE_CHAR_WIDTH = 8.4; // ~px per char in monospace at 14px
const CODE_BLOCK_PAD_X = 40; // left + right padding inside code block
const MIN_HEIGHT = 280;
const MIN_WIDTH = 480; // enough for footer branding
const MAX_WIDTH = 1200;
const MAX_HEIGHT = 4000; // generous ceiling for a very long snippet, still bounded
const MAX_CONTENT_LENGTH = 20_000; // far past any real code block or table in a post
const SHARE_IMAGE_RATE_LIMIT = 20;
const SHARE_IMAGE_RATE_WINDOW_SECONDS = 60;

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

function calcCodeDimensions(
  content: string,
  language: string | undefined,
  caption: string | undefined,
): { width: number; height: number } {
  const lines = content.split("\n");
  const maxLineLen = Math.max(...lines.map((l) => l.length));
  const codeContentWidth = maxLineLen * CODE_CHAR_WIDTH + CODE_BLOCK_PAD_X;
  let width = Math.ceil(codeContentWidth + PADDING_X * 2);
  width = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width));
  const contentHeight =
    CODE_PADDING + lines.length * CODE_LINE_HEIGHT + (language ? CODE_LANG_HEIGHT : 0);

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
    const { type, content, language, title, caption } = body;

    if (typeof content !== "string" || content.length === 0) {
      return Response.json({ error: "content is required" }, { status: 400 });
    }
    if (content.length > MAX_CONTENT_LENGTH) {
      return Response.json(
        { error: `content exceeds ${MAX_CONTENT_LENGTH} character limit` },
        { status: 413 },
      );
    }

    if (type === "table") {
      // Shared with the Substack syndication path
      // (/api/share-image/table) so a table looks identical whether a
      // reader shares it manually or it gets synced automatically.
      try {
        return buildTableImageResponse({
          content,
          title: smartQuotes(title),
          caption,
        });
      } catch (err) {
        if (err instanceof TableImageError) {
          const status = err.message.includes("row limit") ? 413 : 400;
          return Response.json({ error: err.message }, { status });
        }
        throw err;
      }
    }

    const dims = calcCodeDimensions(content, language, caption);
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
            {renderCode(content, language)}
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
