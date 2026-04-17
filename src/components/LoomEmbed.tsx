"use client";

interface LoomEmbedProps {
  url: string;
}

export function LoomEmbed({ url }: LoomEmbedProps) {
  // Convert share URL to embed URL.
  const embedUrl = url.replace("/share/", "/embed/");

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
