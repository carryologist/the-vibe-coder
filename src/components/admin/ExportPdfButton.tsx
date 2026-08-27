"use client";

/**
 * Triggers the browser's native print dialog, which on every modern
 * browser offers "Save as PDF" as a destination. This avoids pulling in
 * a server-side PDF renderer (puppeteer, etc.) just to let an admin hand
 * a draft to reviewers who don't have a login.
 *
 * The print-only styles that make the output look like a clean document
 * (hiding the header/footer/admin chrome, forcing light colors) live in
 * globals.css under `@media print`.
 *
 * Two settling races can make the exported PDF capture a half-finished
 * frame -- most visibly a headline whose wrapped first line looks clipped
 * along the top, because the glyphs got painted with a font (or a
 * translateY offset) different from the one the line box was sized for:
 *
 *  1. Fonts load with `display: "swap"` (see layout.tsx), so the page can
 *     paint in the fallback font first and swap to the real webfont a
 *     moment later. If print fires mid-swap, the line box can still be
 *     sized for the fallback font's metrics while the taller webfont
 *     glyphs get painted into it.
 *  2. The header title/meta/tags fade+slide in via the `.animate-in`
 *     class (globals.css). The `@media print` override forces that to
 *     its settled state, but some browsers commit that override on a
 *     different timeline than the print snapshot itself, occasionally
 *     capturing a mid-transform frame.
 *
 * Forcing both to their finished state and waiting a couple of paint
 * ticks before calling window.print() avoids depending on either race
 * resolving in our favor.
 */
export function ExportPdfButton() {
  const handleExport = async () => {
    document.body.classList.add("exporting-pdf");

    if (typeof document !== "undefined" && "fonts" in document) {
      try {
        await Promise.race([
          document.fonts.ready,
          new Promise((resolve) => setTimeout(resolve, 1500)),
        ]);
      } catch {
        // If font loading rejects for any reason, print anyway rather
        // than blocking the export entirely.
      }
    }

    // Let the "exporting-pdf" class and any settled fonts actually commit
    // to layout/paint before the print engine snapshots the page.
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await new Promise((resolve) => requestAnimationFrame(resolve));

    window.print();
    document.body.classList.remove("exporting-pdf");
  };

  return (
    <button
      onClick={handleExport}
      className="print:hidden rounded border border-outline-variant px-2 py-1 font-mono text-[11px] text-on-surface-variant transition-colors hover:border-primary/30 hover:text-primary"
    >
      Export to PDF
    </button>
  );
}
