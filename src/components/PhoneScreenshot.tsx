"use client";

interface PhoneScreenshotProps {
  src: string;
  alt: string;
  caption?: string;
}

export function PhoneScreenshot({ src, alt, caption }: PhoneScreenshotProps) {
  return (
    <figure className="my-8 flex flex-col items-center">
      <div className="w-[280px] max-w-full overflow-hidden rounded-2xl border border-outline-variant/15 shadow-lg shadow-primary/5">
        <img
          src={src}
          alt={alt}
          className="w-full h-auto block"
          loading="lazy"
        />
      </div>
      {caption && (
        <figcaption
          className="mt-3 text-center text-xs text-on-surface-variant/60"
          style={{ fontFamily: "var(--font-label)" }}
        >
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

interface PhoneScreenshotsProps {
  children: React.ReactNode;
  caption?: string;
}

export function PhoneScreenshots({ children, caption }: PhoneScreenshotsProps) {
  return (
    <figure className="my-8 flex flex-col items-center">
      <div className="flex flex-wrap justify-center gap-4">
        {children}
      </div>
      {caption && (
        <figcaption
          className="mt-3 text-center text-xs text-on-surface-variant/60"
          style={{ fontFamily: "var(--font-label)" }}
        >
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

/** Slim variant for use inside <PhoneScreenshots> — no outer margin. */
export function PhoneScreenshotItem({ src, alt }: PhoneScreenshotProps) {
  return (
    <div className="w-[240px] max-w-[45%] overflow-hidden rounded-2xl border border-outline-variant/15 shadow-lg shadow-primary/5">
      <img
        src={src}
        alt={alt}
        className="w-full h-auto block"
        loading="lazy"
      />
    </div>
  );
}
