/**
 * Format an ISO-style date string for display.
 *
 * Handles two flavors of input transparently:
 *   "2026-05-11"                  (date-only, treated as local midnight)
 *   "2026-05-11T05:00:00-07:00"   (full datetime)
 *
 * Naively appending "T00:00:00" to a full datetime breaks the parse —
 * that bug was hit and documented in "Friday Fixes: Mobile First and
 * the Skill That Saved Us". This helper detects the difference and
 * does the right thing for both shapes.
 *
 * Returns the input string (or "No date") for unparsable input rather
 * than throwing or rendering "Invalid Date".
 */
export function formatDate(
  dateStr: string,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  },
): string {
  if (!dateStr) return "No date";
  const normalized = dateStr.includes("T") ? dateStr : dateStr + "T00:00:00";
  const d = new Date(normalized);
  if (isNaN(d.getTime())) return dateStr || "No date";
  return d.toLocaleDateString("en-US", options);
}
