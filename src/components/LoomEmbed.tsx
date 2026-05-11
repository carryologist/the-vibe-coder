"use client";

interface LoomEmbedProps {
  url: string;
}

// Permitted hosts for the iframe source. Frontmatter is author-only
// today, but if any future content source ever lands here we don't
// want a typo (or worse) to load a hostile iframe.
const ALLOWED_HOSTS = new Set(["www.loom.com", "loom.com"]);

function safeEmbedUrl(input: string): string | null {
  try {
    const u = new URL(input);
    if (u.protocol !== "https:") return null;
    if (!ALLOWED_HOSTS.has(u.hostname)) return null;
    // Convert share URL to embed URL while preserving the parsed
    // origin/pathname (no string interpolation of raw input).
    u.pathname = u.pathname.replace("/share/", "/embed/");
    return u.toString();
  } catch {
    return null;
  }
}

export function LoomEmbed({ url }: LoomEmbedProps) {
  const embedUrl = safeEmbedUrl(url);
  if (!embedUrl) return null;

  return (
    <div className="mb-12">
      <span
        className="mb-3 block text-xs uppercase tracking-widest text-on-surface-variant/50"
        style={{ fontFamily: "var(--font-label)" }}
      >
        Watch
      </span>
      <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-outline-variant/10">
        <iframe
          src={embedUrl}
          title="Loom video"
          allow="fullscreen"
          className="absolute inset-0 h-full w-full"
          style={{ border: "none" }}
        />
      </div>
    </div>
  );
}
