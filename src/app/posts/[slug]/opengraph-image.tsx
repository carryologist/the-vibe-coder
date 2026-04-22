import { ImageResponse } from "next/og";
import { getPostBySlug, getAllPosts } from "@/lib/posts";

export const runtime = "nodejs";
export const contentType = "image/png";
export const size = { width: 1200, height: 630 };

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

/**
 * Extract the first markdown/MDX image src from post content.
 * Matches ![alt](/images/...) patterns.
 */
function extractFirstImage(content: string): string | null {
  const match = content.match(/!\[[^\]]*\]\(([^)]+)\)/);
  return match ? match[1] : null;
}

export default async function OgImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#0a0a0b",
            color: "#e8e8e8",
            fontSize: 48,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          Post not found
        </div>
      ),
      size,
    );
  }

  const firstImage = extractFirstImage(post.content);
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(post.date));

  // Waveform bar data: [yOffset, height, opacity]
  const bars: [number, number, number][] = [
    [48, 14, 0.4],
    [38, 24, 0.65],
    [30, 32, 0.85],
    [24, 38, 1.0],
    [26, 36, 0.9],
    [41, 21, 0.6],
    [35, 27, 0.75],
    [45, 17, 0.45],
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#0a0a0b",
          padding: "60px 80px",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background image with overlay if post has an image */}
        {firstImage && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://vibescoder.dev${firstImage}`}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                opacity: 0.15,
              }}
            />
          </div>
        )}

        {/* Waveform mark */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: "6px",
            marginBottom: "40px",
          }}
        >
          {bars.map(([y, h, opacity], i) => (
            <div
              key={i}
              style={{
                width: "8px",
                height: `${h * 0.8}px`,
                borderRadius: "4px",
                backgroundColor: `rgba(220, 184, 255, ${opacity})`,
              }}
            />
          ))}
        </div>

        {/* Title */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontSize: 52,
              fontWeight: 700,
              color: "#e8e8e8",
              lineHeight: 1.2,
              letterSpacing: "-1px",
              maxWidth: "1000px",
            }}
          >
            {post.title}
          </div>

          {/* Date and reading time */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              marginTop: "24px",
              fontSize: 22,
              color: "#a0a0a0",
              letterSpacing: "0.5px",
            }}
          >
            <span>{formattedDate}</span>
            <span style={{ color: "#555" }}>·</span>
            <span>{post.readingTime}</span>
          </div>
        </div>

        {/* Bottom branding */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: 24,
            fontWeight: 600,
          }}
        >
          <span style={{ color: "#e8e8e8" }}>vibes</span>
          <span style={{ color: "#dcb8ff" }}>coder</span>
          <span style={{ color: "#555", marginLeft: "8px", fontWeight: 400 }}>
            vibescoder.dev
          </span>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
