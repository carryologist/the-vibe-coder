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

import { sanitizeSlug } from "@/lib/slug";

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
const BY_THE_NUMBERS_RE = /^##\s+By the Numbers\s*$/im;
const VALID_TYPES = new Set(["how-to", "opinion"]);
const BOOLEAN_VALUES = new Set(["true", "false"]);

interface FrontmatterField {
  /** Inline value on the `key:` line, trimmed but still quoted if authored that way. */
  inline: string;
  /** Indented continuation lines for block scalars and block lists. */
  continuations: string[];
}

interface ParsedFrontmatter {
  ok: boolean;
  malformed: boolean;
  body: string;
  /** Lowercased top-level field name → parsed field info. */
  fields: Map<string, FrontmatterField>;
}

/**
 * Extract the frontmatter block and top-level fields from a raw MDX document.
 * Nested YAML keys deliberately do not become top-level fields, so changelog
 * entries like `published: false` cannot satisfy the post's own `published`.
 */
function parseFrontmatter(source: string): ParsedFrontmatter {
  if (!source.startsWith("---")) {
    return { ok: false, malformed: false, body: source, fields: new Map() };
  }

  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---[ \t]*(\r?\n|$)/);
  if (!match) {
    return { ok: false, malformed: true, body: source, fields: new Map() };
  }

  const fields = new Map<string, FrontmatterField>();
  const lines = match[1].split(/\r?\n/);
  let currentKey: string | null = null;

  for (const rawLine of lines) {
    if (!rawLine.trim()) continue;

    if (/^\s/.test(rawLine)) {
      if (currentKey) {
        fields.get(currentKey)?.continuations.push(rawLine);
      }
      continue;
    }

    const pair = rawLine.match(/^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$/);
    if (!pair) {
      currentKey = null;
      continue;
    }

    currentKey = pair[1].toLowerCase();
    fields.set(currentKey, {
      inline: pair[2].trim(),
      continuations: [],
    });
  }

  return {
    ok: true,
    malformed: false,
    body: source.slice(match[0].length),
    fields,
  };
}

function stripQuotes(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length >= 2) {
    const first = trimmed[0];
    const last = trimmed[trimmed.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return trimmed.slice(1, -1).trim();
    }
  }
  return trimmed;
}

function scalarValue(
  fields: Map<string, FrontmatterField>,
  key: string,
): { present: boolean; value: string } {
  const field = fields.get(key);
  if (!field) return { present: false, value: "" };

  const inline = stripQuotes(field.inline);
  if (inline && inline !== "|" && inline !== ">" && inline !== "|-" && inline !== ">-") {
    return { present: true, value: inline };
  }

  const continuationText = field.continuations
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ")
    .trim();

  return {
    present: continuationText.length > 0,
    value: continuationText,
  };
}

function fieldHasValue(fields: Map<string, FrontmatterField>, key: string): boolean {
  if (key === "tags") return tagValues(fields).length > 0;
  return scalarValue(fields, key).present;
}

function tagValues(fields: Map<string, FrontmatterField>): string[] {
  const field = fields.get("tags");
  if (!field) return [];

  const inline = field.inline.trim();
  const values: string[] = [];

  if (inline && inline !== "[]") {
    if (inline.startsWith("[") && inline.endsWith("]")) {
      values.push(
        ...inline
          .slice(1, -1)
          .split(",")
          .map(stripQuotes)
          .filter(Boolean),
      );
    } else {
      values.push(
        ...inline
          .split(",")
          .map(stripQuotes)
          .filter(Boolean),
      );
    }
  }

  for (const line of field.continuations) {
    const item = line.match(/^\s*-\s*(.+)$/);
    if (item) {
      const value = stripQuotes(item[1]);
      if (value) values.push(value);
    }
  }

  return values;
}

/** Validate a date value against YYYY-MM-DD and reject impossible dates. */
function isDateString(value: string): boolean {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const parsed = new Date(`${value}T00:00:00Z`);

  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() + 1 === month &&
    parsed.getUTCDate() === day
  );
}

function pushIssue(issues: DraftIssue[], issue: DraftIssue) {
  issues.push(issue);
}

/**
 * Analyze a raw MDX draft and its current slug.
 *
 * `slug` is the slug the admin would save/publish under. A missing or empty
 * param is tolerated; the slug/title mismatch becomes a warning only when a
 * title is present.
 */
export function analyzeDraft(mdx: string, slug: string): DraftReadiness {
  const issues: DraftIssue[] = [];
  const fm = parseFrontmatter(mdx);

  if (!fm.ok) {
    pushIssue(issues, {
      id: "malformed-frontmatter",
      message: fm.malformed
        ? "Frontmatter block starts with `---` but is not properly closed"
        : "Frontmatter block is missing or not properly delimited (---)",
      severity: "error",
    });
  } else {
    const title = scalarValue(fm.fields, "title");

    for (const key of [
      "title",
      "description",
      "date",
      "tags",
      "published",
      "type",
      "syndicate",
    ]) {
      if (!fieldHasValue(fm.fields, key)) {
        pushIssue(issues, {
          id: `missing-${key}`,
          message: `Missing or empty \`${key}\` field`,
          severity: "error",
        });
      }
    }

    const date = scalarValue(fm.fields, "date");
    if (date.present && !isDateString(date.value)) {
      pushIssue(issues, {
        id: "invalid-date",
        message: `Invalid \`date\` value: ${date.value} (expected YYYY-MM-DD)`,
        severity: "error",
      });
    }

    const type = scalarValue(fm.fields, "type");
    if (type.present && !VALID_TYPES.has(type.value)) {
      pushIssue(issues, {
        id: "invalid-type",
        message: `Invalid \`type\` value: ${type.value} (expected how-to or opinion)`,
        severity: "error",
      });
    }

    for (const key of ["published", "syndicate"] as const) {
      const value = scalarValue(fm.fields, key);
      if (value.present && !BOOLEAN_VALUES.has(value.value)) {
        pushIssue(issues, {
          id: `invalid-${key}`,
          message: `Invalid \`${key}\` value: ${value.value} (expected true or false)`,
          severity: "error",
        });
      }
    }

    if (title.present && slug) {
      const expectedSlug = sanitizeSlug(title.value);
      const currentSlug = slug.replace(/^\d{4}-\d{2}-\d{2}-/, "");
      if (expectedSlug && currentSlug !== expectedSlug) {
        pushIssue(issues, {
          id: "slug-title-mismatch",
          message: `Slug \`${slug}\` may not match the title's natural slug (\`${expectedSlug}\`)`,
          severity: "warning",
        });
      }
    }
  }

  const body = fm.body.trim();
  if (!body) {
    pushIssue(issues, {
      id: "empty-body",
      message: "Body is empty — nothing to publish",
      severity: "error",
    });
  }

  if (!BY_THE_NUMBERS_RE.test(body)) {
    pushIssue(issues, {
      id: "missing-by-the-numbers",
      message: "Missing `## By the Numbers` section",
      severity: "warning",
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
