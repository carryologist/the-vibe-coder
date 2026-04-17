# Vibes Coder — To-Do List

A running scratchpad for site enhancements, fixes, and ideas. Pick up wherever you left off.

---

## Up Next

- [ ] **Loom as recording source** — Add option to paste a Loom URL on the admin record page as an alternative to voice recording. Fetch transcript from Loom, feed to Claude alongside the Loom URL so it generates a blog post with the video embedded as hero. Requires Loom Developer API access for transcript retrieval.
- [ ] **Medium env setup** — Create Medium account, generate integration token, get user ID, add env vars to Vercel. Then test syndication flow end-to-end.
- [ ] **Upstash Redis setup** — Create Redis database in Vercel Storage, add KV_REST_API_URL and KV_REST_API_TOKEN env vars. Then verify analytics chart populates.
- [ ] **Vercel Web Analytics enable** — Toggle on in Vercel project dashboard → Analytics.

## Ideas / Backlog

- [ ] Settings page (currently disabled on admin dashboard) — configure style prompt, default tags, site metadata
- [ ] Vercel MCP server integration — requires Coder admin panel action (Agents > Settings > MCP Servers), may be blocked by Vercel's MCP client allowlist
- [ ] Improve mobile workflow friction — explore direct Stitch → GitHub integration or iOS Shortcuts automation to skip the Files app intermediary
- [ ] Image management in admin — preview/delete images associated with posts
- [ ] Draft mode — `published: false` posts visible in admin but not on the public site (partially works already, needs admin UI)
- [ ] Search across posts (public-facing)
- [ ] Substack import via RSS — one-time bulk import of existing posts at substack.com/signup/import

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
- [x] RSS feed at /feed.xml with autodiscovery
- [x] Vercel Web Analytics integration
- [x] Custom view counter with Upstash Redis
- [x] Admin analytics chart (30-day bar chart + top pages)
- [x] Medium syndication API (draft mode + admin button)
- [x] Loom video hero embed component
- [x] Day 3 blog post
- [x] Day 4 blog post
