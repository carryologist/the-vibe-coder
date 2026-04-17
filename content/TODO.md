# Vibes Coder — To-Do List

A running scratchpad for site enhancements, fixes, and ideas. Pick up wherever you left off.

---

## Up Next

- [ ] **Loom video embed on posts** — Add an optional `loomUrl` field to post frontmatter. When present, render an embedded Loom player (responsive iframe) above or below the post content. Consider placement options: below the header as a "watch instead of read" alternative, or inline within the MDX body via a custom `<Loom url="..." />` component. Both approaches have merit — frontmatter is simpler for one-per-post, MDX component allows multiple embeds positioned anywhere.

## Ideas / Backlog

- [ ] Settings page (currently disabled on admin dashboard) — configure style prompt, default tags, site metadata
- [ ] Vercel MCP server integration — requires Coder admin panel action (Agents > Settings > MCP Servers), may be blocked by Vercel's MCP client allowlist
- [ ] Improve mobile workflow friction — explore direct Stitch → GitHub integration or iOS Shortcuts automation to skip the Files app intermediary
- [ ] Image management in admin — preview/delete images associated with posts
- [ ] Draft mode — `published: false` posts visible in admin but not on the public site (partially works already, needs admin UI)
- [ ] Search across posts (public-facing)
- [ ] RSS feed generation

## Done

- [x] Stitch design import (Theme B — Neon Brutalist)
- [x] Light/dark theme toggle with FOUC prevention
- [x] Day 2 blog post (Stitch workflow, brand guidelines, mobile pipeline)
- [x] Admin pages reskinned to match design system
- [x] Admin login fix (soft nav → hard nav)
- [x] Footer admin link + login page visitor message
- [x] Blog post consolidation (third post merged into Day 2)
- [x] Edit flow fix (record page now updates instead of creating)
- [x] Admin dashboard overhaul (Record New Post + Edit Existing Post picker)
- [x] Inline text editing on blog posts
- [x] Public changelog with auto-generated summaries
- [x] Changelog visibility fix for light mode
