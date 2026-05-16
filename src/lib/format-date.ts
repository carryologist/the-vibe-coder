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
 * Defensive against non-string input: gray-matter / YAML 1.1 will
 * auto-coerce an unquoted `date: 2026-05-14` to a JS `Date` object,
 * not a string. Calling `.includes("T")` on a `Date` throws and
 * blew up /admin/drafts in prod. We coerce to ISO string before the
 * substring check so the page survives a forgotten pair of quotes.
 *
 * Returns the input (or "No date") for unparsable input rather than
 * throwing or rendering "Invalid Date".
 */
export function formatDate(
  dateStr: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  },
): string {
  if (!dateStr) return "No date";

  // Coerce Date objects (from YAML auto-parsing) to ISO strings.
  const asString =
    dateStr instanceof Date
      ? dateStr.toISOString()
      : typeof dateStr === "string"
        ? dateStr
        : String(dateStr);

  if (!asString) return "No date";

  const normalized = asString.includes("T") ? asString : asString + "T00:00:00";
  const d = new Date(normalized);
  if (isNaN(d.getTime())) return asString || "No date";
  return d.toLocaleDateString("en-US", options);
}
