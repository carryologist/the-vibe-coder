# Day 3 Blog Post Prompt

You are writing a "Day 3" blog post for vibescoder.dev. The previous posts cover Day 1 (building the site) and Day 2 (reskinning with Google Stitch + light/dark theme). This post covers everything that happened after the theme work.

## What Happened on Day 3

### 1. Admin Login Fix
- The `/admin` login page accepted the correct password but "nothing happened" — no error, no navigation.
- **Root cause:** `router.push("/admin")` does a soft RSC navigation in Next.js App Router. After setting the session cookie via `fetch`, the soft navigation either reused a stale client-side cache or had the middleware redirect silently swallowed, landing the user back on `/admin/login` with no feedback.
- **Fix:** Replaced `router.push` with `window.location.href` for both login and logout redirects. Hard navigation ensures the browser sends the freshly-set cookie through middleware cleanly. Standard practice for auth state transitions in Next.js.

### 2. Footer Admin Link + Login Page UX
- Added a subtle "Admin" link in the site footer (dimmed, lights up on hover) so the admin can reach `/admin` from any page.
- Updated the login page with a friendly message for non-admins: "This area is for the site owner." with a "Back to the blog →" link. No security changes needed — middleware already blocks everything without a valid JWT cookie.

### 3. Blog Post Consolidation
- User published a third blog post via the voice recording feature about the Google Stitch workflow (brand guidelines trick, mobile pipeline).
- Merged that content into the Day 2 post as two new subsections rather than keeping it as a separate entry:
  - "Prompting Stitch (and the Brand Guidelines Trick)" — feeding Koto's brand URL instead of describing colors manually
  - "The Mobile Workflow" — the full Stitch → iPhone Files → GitHub → Coder Agents pipeline and its friction points
- Deleted the standalone third post.

### 4. Edit Flow Bug Fix
- The Edit button on posts linked to `/admin/record?edit=slug`, but the record page completely ignored the `edit` query parameter — always started fresh and always `POST`ed a new file.
- **Fix across 5 files:**
  - Record page reads `?edit=slug` via `useSearchParams` (wrapped in Suspense for Next.js compatibility)
  - When editing, fetches existing post content on mount
  - Passes existing content to the Claude generation API so it merges new transcript into the existing post rather than writing from scratch
  - Publishes with `PUT` (update) instead of `POST` (create) in edit mode
  - PostPreview locks the slug field and shows "Update on GitHub" when editing

### 5. Admin Dashboard Overhaul
- Renamed "Record" card to "Record New Post"
- Added "Edit Existing Post" card with a searchable dropdown picker:
  - Filters posts client-side by title (case-insensitive substring)
  - Scrollable dropdown (`max-h-64`) — designed to handle hundreds of posts
  - Click-outside-to-close via pointerdown listener
  - Selecting a post navigates to `/admin/record?edit=slug`

### 6. Inline Text Editing on Blog Posts
- `AdminPostControls` (the admin bar on each post page) expanded from 2 to 3 actions:
  - **Type Edits** — toggles an inline MDX editor (textarea) directly on the post page for quick fixes (typos, links, dates)
  - **Record Edits** — links to voice recording flow (existing)
  - **Delete Post** — existing, moved to right side
- InlineEditor loads raw MDX, lets you edit, and saves via `PUT /api/posts`
- No manual changelog summary required — just hit Save

### 7. Public Changelog on Blog Posts
- New `changelog` field in post frontmatter: array of `{date, summary}` entries
- Collapsible `<Changelog>` component rendered between post header and content:
  - Collapsed by default: "▸ 1 update" or "▸ N updates"
  - Expands on click to show date + summary list
  - Subtle mono styling, doesn't compete with content
- Only author-written summaries exposed — no system info, file paths, or commit SHAs
- Changelog entries are added automatically:
  - **Inline edits:** Auto-generated via line-level diff ("Minor text edits", "Edited N lines", "Revised post content (N lines changed)")
  - **Voice recording edits:** Default summary "Updated via voice recording"
  - **Manual summary:** Still supported via the `summary` field in PUT requests

### 8. Changelog Visibility Fix
- Initial changelog text was too faint in light mode (`text-outline-variant/60`)
- Bumped to `text-on-surface-variant` for proper readability in both themes

## Themes for the Post
- Debugging in production (the login "nothing happens" issue — soft nav pitfalls in Next.js App Router)
- Building admin tooling for a one-person blog (the UX of editing your own content)
- Transparency as a feature (public changelog — bringing readers along)
- The voice-to-edit pipeline and making it actually update instead of create
- Incremental improvement: each session builds on the last, fixing friction points discovered by actually using the site

## Technical Details Worth Mentioning
- Next.js 16 App Router soft navigation gotchas with auth cookies
- `useSearchParams` requires Suspense boundary in App Router
- `gray-matter` for parsing/re-serializing MDX frontmatter with changelog entries
- Line-level diff for auto-generating changelog summaries (no AI needed for simple edits)
- `window.location.href` vs `router.push` for auth transitions
