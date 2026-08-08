/**
 * Shared slug sanitization for any path segment that flows into a
 * GitHub Contents API path (content/posts/<slug>.mdx, public/images/<slug>/...).
 *
 * This used to be copy-pasted into posts/route.ts, images/route.ts, and
 * the MCP route independently. The Dev.to syndication routes were added
 * later and never got a copy, so they interpolated a raw, unsanitized
 * slug straight into a repo path -- everywhere else in the codebase
 * that touches the same file space validates first. One shared
 * implementation means there's only one place to fix this class of bug.
 */
export function sanitizeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * True when `slug` is already safe to interpolate into a repo path or a
 * filesystem path: lowercase letters, digits and hyphens, starting with
 * an alphanumeric.
 *
 * Use this to validate a slug that arrives from a route param, where
 * silently rewriting it (as sanitizeSlug does) would resolve a
 * mistyped or hostile value to some other real post instead of a 404.
 */
export function isSafeSlug(slug: string): boolean {
  return typeof slug === "string" && /^[a-z0-9][a-z0-9-]*$/.test(slug);
}
