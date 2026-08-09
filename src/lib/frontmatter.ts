/**
 * Frontmatter rewriting for the admin editors.
 *
 * Deliberately string-based rather than gray-matter: both call sites are
 * client components, and gray-matter pulls `fs` and `js-yaml` into the
 * browser bundle. This also preserves the rest of the document byte for
 * byte, which matters when the file is round-tripped through the editor.
 */

/**
 * Replace, add, or remove a single frontmatter key in a raw MDX document.
 * Passing `null` removes the key. Returns the rewritten document.
 *
 * The previous implementation regex-patched `date: '...'` and only matched
 * single-quoted values, so posts whose frontmatter carries an unquoted YAML
 * date (common in this content set, see normalizeDate in src/lib/posts.ts)
 * silently kept their old date on publish. This matches the key however its
 * value is quoted, edits only inside the frontmatter block, and throws when
 * there is no frontmatter so the failure surfaces instead of no-opping.
 */
export function setFrontmatterField(
  source: string,
  key: string,
  value: string | null,
): string {
  // Anchored at the start of the document, so the match always begins at
  // index 0 and the body is everything after it.
  const fm = source.match(/^---\r?\n([\s\S]*?)\r?\n---[ \t]*(\r?\n|$)/);
  if (!fm) {
    throw new Error("Post has no frontmatter block");
  }

  const lines = fm[1].split(/\r?\n/);
  const keyLine = new RegExp(`^${key}:`);
  const hasKey = lines.some((line) => keyLine.test(line));

  let nextLines: string[];
  if (value === null) {
    if (!hasKey) return source;
    nextLines = lines.filter((line) => !keyLine.test(line));
  } else if (hasKey) {
    nextLines = lines.map((line) =>
      keyLine.test(line) ? `${key}: ${value}` : line,
    );
  } else {
    nextLines = [...lines, `${key}: ${value}`];
  }

  const body = source.slice(fm[0].length);
  return `---\n${nextLines.join("\n")}\n---\n${body}`;
}
