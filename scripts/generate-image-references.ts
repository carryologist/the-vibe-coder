import fs from "fs";
import path from "path";

/**
 * Build-time scanner for hardcoded `/images/...` references in the app's
 * own static source (layout, static pages, opengraph generators, etc).
 *
 * Why this exists: `src/lib/images.ts` flags an image directory/file as
 * "orphaned" when no *post* references it. But some images (favicons, the
 * About page headshot, branding assets) are referenced directly from
 * static `.tsx` source, not from post MDX content. Those were previously
 * invisible to orphan detection — see `content/TODO.md` for the Apr 30
 * incident where exactly this class of file got deleted as an
 * "unreferenced" orphan.
 *
 * This script walks `src/app` and `src/components` for string literals
 * that look like `/images/<path>`, and writes them to a JSON manifest
 * that `src/lib/images.ts` reads at request time. A regex over raw file
 * text will over-match a little (e.g. a reference inside a comment) —
 * that's fine, the failure mode we care about is "never flag a
 * statically-referenced file as safe to delete," so false positives here
 * are harmless and false negatives are the only real risk.
 *
 * Run via: npx tsx scripts/generate-image-references.ts
 * Called automatically in the prebuild step.
 */

const SCAN_ROOTS = ["src/app", "src/components"];
const SCAN_EXTENSIONS = new Set([".tsx", ".ts"]);
// Matches /images/foo/bar.png, /images/foo-bar_baz.svg, etc. Stops at
// quote/backtick/paren/whitespace/template-interpolation boundaries so we
// don't swallow trailing JSX/TS syntax into the path.
const IMAGE_PATH_RE = /\/images\/[a-zA-Z0-9_\-./]+/g;

function walk(dir: string, out: string[]) {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return; // Directory doesn't exist (e.g. src/components in a stripped checkout).
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (SCAN_EXTENSIONS.has(path.extname(entry.name))) {
      out.push(full);
    }
  }
}

function extractReferences(files: string[]): Set<string> {
  const refs = new Set<string>();
  for (const file of files) {
    const text = fs.readFileSync(file, "utf-8");
    for (const match of text.matchAll(IMAGE_PATH_RE)) {
      // Trim any trailing punctuation the regex's permissive character
      // class might have picked up (e.g. a sentence-ending period in a
      // comment).
      const cleaned = match[0].replace(/[.,;:]+$/, "");
      refs.add(cleaned);
    }
  }
  return refs;
}

function generate() {
  const files: string[] = [];
  for (const root of SCAN_ROOTS) {
    walk(path.join(process.cwd(), root), files);
  }

  const refs = Array.from(extractReferences(files)).sort();
  const outputPath = path.join(
    process.cwd(),
    "public",
    "static-image-refs.json"
  );

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(refs, null, 2));

  console.log(
    `[generate-image-references] Scanned ${files.length} files, found ${refs.length} static /images/ references -> ${outputPath}`
  );
}

generate();
