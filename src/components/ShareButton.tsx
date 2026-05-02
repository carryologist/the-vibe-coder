"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface ShareButtonProps {
  type: "table" | "code";
  content: string;
  language?: string;
  title: string;
  slug: string;
  caption?: string;
}

const SOCIAL_LINKS = [
  {
    label: "LinkedIn",
    icon: "in",
    url: (postUrl: string, title: string) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(postUrl)}`,
  },
  {
    label: "X",
    icon: "𝕏",
    url: (postUrl: string, title: string) =>
      `https://x.com/intent/tweet?url=${encodeURIComponent(postUrl)}&text=${encodeURIComponent(title)}`,
  },
  {
    label: "Reddit",
    icon: "r/",
    url: (postUrl: string, title: string) =>
      `https://reddit.com/submit?url=${encodeURIComponent(postUrl)}&title=${encodeURIComponent(title)}`,
  },
];

export function ShareButton({
  type,
  content,
  language,
  title,
  slug,
  caption,
}: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const popoverRef = useRef<HTMLDivElement>(null);

  const postUrl = `https://vibescoder.dev/posts/${slug}`;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const generateImage = useCallback(async (): Promise<Blob | null> => {
    setGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/share-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, content, language, title, slug, caption }),
      });
      if (!res.ok) throw new Error("Failed to generate image");
      return await res.blob();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
      return null;
    } finally {
      setGenerating(false);
    }
  }, [type, content, language, title, slug, caption]);

  async function handleDownload() {
    const blob = await generateImage();
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}-snippet.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setOpen(false);
  }

  async function handleCopy() {
    const blob = await generateImage();
    if (!blob) return;

    try {
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setOpen(false);
      }, 1500);
    } catch {
      // Fallback: download if clipboard isn't available
      handleDownload();
    }
  }

  return (
    <div ref={popoverRef} className="relative" style={{ zIndex: 10 }}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-lg border border-outline-variant/20 bg-surface-low/80 px-2 py-1 font-mono text-[11px] text-on-surface-variant backdrop-blur-sm transition-all hover:border-primary/30 hover:text-primary"
        title="Share as image"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
        Share
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-outline-variant/20 bg-surface-low p-2 shadow-xl">
          {error && (
            <div className="mb-2 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-1.5">
              <p className="font-mono text-[10px] text-red-400">{error}</p>
            </div>
          )}

          {/* Image actions */}
          <div className="mb-1 px-2 py-1">
            <span className="font-mono text-[10px] uppercase tracking-widest text-outline">
              // image
            </span>
          </div>
          <button
            onClick={handleDownload}
            disabled={generating}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left font-mono text-xs text-on-surface-variant transition-colors hover:bg-surface-high hover:text-on-surface disabled:opacity-50"
          >
            <span className="text-primary">↓</span>
            {generating ? "Generating…" : "Download PNG"}
          </button>
          <button
            onClick={handleCopy}
            disabled={generating}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left font-mono text-xs text-on-surface-variant transition-colors hover:bg-surface-high hover:text-on-surface disabled:opacity-50"
          >
            <span className="text-primary">{copied ? "✓" : "⎘"}</span>
            {copied ? "Copied!" : generating ? "Generating…" : "Copy to clipboard"}
          </button>

          {/* Social share links */}
          <div className="mt-1 border-t border-outline-variant/10 pt-1">
            <div className="px-2 py-1">
              <span className="font-mono text-[10px] uppercase tracking-widest text-outline">
                // share post
              </span>
            </div>
            {SOCIAL_LINKS.map((social) => (
              <a
                key={social.label}
                href={social.url(postUrl, title)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left font-mono text-xs text-on-surface-variant transition-colors hover:bg-surface-high hover:text-on-surface"
              >
                <span className="w-4 text-center text-primary">
                  {social.icon}
                </span>
                {social.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
