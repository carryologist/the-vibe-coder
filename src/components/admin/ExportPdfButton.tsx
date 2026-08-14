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
 */
export function ExportPdfButton() {
  return (
    <button
      onClick={() => window.print()}
      className="print:hidden rounded border border-outline-variant px-2 py-1 font-mono text-[11px] text-on-surface-variant transition-colors hover:border-primary/30 hover:text-primary"
    >
      Export to PDF
    </button>
  );
}
