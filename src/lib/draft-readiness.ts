/**
 * Draft Readiness Checklist — pure validation of a raw MDX draft.
 *
 * This is intentionally a standalone, dependency-free helper so it can be
 * unit-tested or inspected in isolation. It does not import gray-matter (which
 * pulls `fs`/`js-yaml` into the browser bundle) and instead parses enough of
 * the frontmatter block by hand, mirroring the string-based approach used by
 * `src/lib/frontmatter.ts`. Frontmatter here is YAML-ish, and the drafts being
 * reviewed are almost always machine-generated, so a light parser is enough to
 * surface the common problems the checklist is meant to catch.
 *
 * Output is a list of { id, message, severity } findings plus a count of
 * "error"-level problems so the UI can decide how serious to look.
 */

export type IssueSeverity = "error" | "warning";

export interface DraftIssue {
  /** Stable machine-readable key, e.g. "missing-title". */
  id: string;
  /** Human-readable message for the checklist row. */
  message: string;
  severity: IssueSeverity;
}

export interface DraftReadiness {
  issues: DraftIssue[];
  /** Number of severity "error" findings. */
  errorCount: number;
  /** Number of severity "warning" findings. */
  warningCount: number;
  /** True when there are no findings at all. */
  ok: boolean;
}

/** The section heading every post is expected to carry. */
const BY_THE_NUMBERS = "## By the Numbers";

interface FrontmatterField {
  /** Inline value on the `key:` line (trimmed, may be empty). */
  inline: string;
  /** True when the key has at least one indented continuation line. */
  multiline: boolean;
}

interface ParsedFrontmatter {
  ok: boolean;
  /** Lowercased field name → parsed field info. */
  fields: Map<string, FrontmatterField>;
}

/**
 * Extract the frontmatter block and fields from a raw MDX document.
 * Returns { ok: false } when the block is missing or malformed.
 */
function parseFrontmatter(source: string): ParsedFrontmatter {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---[ \t]*(\r?\n|$)/);
  if (!match) {
    return { ok: false, fields: new Map() };
  }

  const fields = new Map<string, FrontmatterField>();
  const lines = match[1].split(/\r?\n/);

  // Track the most recent top-level key so we can attribute indented
  // continuation lines (list items, block scalars) to it.
  let currentKey: string | null = null;
  for (const rawLine of lines) {
    if (/^\s/.test(rawLine)) {
      // Indented continuation of the current key.
      if (currentKey) {
        const field = fields.get(currentKey);
        if (field) field.multiline = true;
      }
      continue;
    }
    const line = rawLine.trim();
    if (!line || line.startsWith("-")) continue;
    const colon = line.indexOf(":");
    if (colon <= 0) continue;
    currentKey = line.slice(0, colon).trim().toLowerCase();
    fields.set(currentKey, {
      inline: line.slice(colon + 1).trim(),
      multiline: false,
    });
  }

  return { ok: true, fields };
}

/** True when the key is present and carries a real value (inline or list). */
function hasValue(fields: Map<string, FrontmatterField>, key: string): boolean {
  const field = fields.get(key);
  if (!field) return false;
  if (field.multiline) return true;
  const cleaned = field.inline.replace(/^['"](.*)['"]$/, "$1").trim();
  return Boolean(cleaned);
}

/**
 * Resolve a scalar value for a key as a plain string, or null when absent or
 * empty. For block/list forms this returns the inline indicator (e.g. `>-`),
 * which callers treat as "present but needs a closer look". Used sparingly for
 * the fields that must be single scalars (title, date).
 */
function getScalar(
  fields: Map<string, FrontmatterField>,
  key: string,
): { present: boolean; value: string } {
  const field = fields.get(key);
  if (!field) return { present: false, value: "" };
  const value = field.inline.replace(/^['"](.*)['"]$/, "$1").trim();
  return { present: Boolean(value), value };
}

/** Normalize a title into the slug form it would naturally produce. */
function titleToSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Validate a date value against YYYY-MM-DD. */
function isDateString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(value).getTime());
}

/**
 * Analyze a raw MDX draft and its (current) slug.
 *
 * `slug` is the slug the admin would save/publish under. A missing or empty
 * param is tolerated; the slug/title mismatch becomes a warning only when a
 * title is present.
 */
export function analyzeDraft(mdx: string, slug: string): DraftReadiness {
  const issues: DraftIssue[] = [];
  const fm = parseFrontmatter(mdx);

  const body = mdx.replace(/^---\r?\n[\s\S]*?\r?\n---[ \t]*(\r?\n|$)/, "");

  // ── Frontmatter block ──
  if (!fm.ok) {
    issues.push({
      id: "malformed-frontmatter",
      message: "Frontmatter block is missing or not properly delimited (---)",
      severity: "error",
    });
  } else {
    const title = getScalar(fm.fields, "title");

    if (!hasValue(fm.fields, "published")) {
      issues.push({
        id: "missing-published",
        message: "Missing `published` field (set to true or false)",
        severity: "error",
      });
    }
    if (!hasValue(fm.fields, "type")) {
      issues.push({
        id: "missing-type",
        message: "Missing `type` field (e.g. how-to or opinion)",
        severity: "error",
      });
    }
    if (!hasValue(fm.fields, "syndicate")) {
      issues.push({
        id: "missing-syndicate",
        message: "Missing `syndicate` field (true or false)",
        severity: "error",
      });
    }

    if (!title.present) {
      issues.push({
        id: "missing-title",
        message: "Missing or empty `title`",
        severity: "error",
      });
    }

    if (!hasValue(fm.fields, "description")) {
      issues.push({
        id: "missing-description",
        message: "Missing or empty `description`",
        severity: "error",
      });
    }

    const date = getScalar(fm.fields, "date");
    if (!date.present) {
      issues.push({
        id: "missing-date",
        message: "Missing or empty `date`",
        severity: "error",
      });
    } else if (!isDateString(date.value)) {
      issues.push({
        id: "invalid-date",
        message: `Invalid \`date\` value: ${date.value} (expected YYYY-MM-DD)`,
        severity: "error",
      });
    }

    if (!hasValue(fm.fields, "tags")) {
      issues.push({
        id: "missing-tags",
        message: "Missing or empty `tags`",
        severity: "error",
      });
    }

    // Slug/title mismatch — a warning, not a hard error, since the admin may
    // deliberately use a different slug than the title suggests.
    if (title.present && slug && titleToSlug(title.value) !== slug) {
      issues.push({
        id: "slug-title-mismatch",
        message: `Slug \`${slug}\` may not match the title's natural slug (\`${titleToSlug(title.value)}\`)`,
        severity: "warning",
      });
    }
  }

  // ── Body ──
  if (!body.trim()) {
    issues.push({
      id: "empty-body",
      message: "Body is empty — nothing to publish",
      severity: "error",
    });
  }

  // ── "By the Numbers" section ──
  if (!new RegExp(`^\\s*${BY_THE_NUMBERS}\\s*$`, "m").test(body)) {
    issues.push({
      id: "missing-by-the-numbers",
      message: `Missing \`${BY_THE_NUMBERS}\` section`,
      severity: "error",
    });
  }

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;

  return {
    issues,
    errorCount,
    warningCount,
    ok: issues.length === 0,
  };
}
