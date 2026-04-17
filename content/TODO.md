# Vibes Coder — To-Do List

A running scratchpad for site enhancements, fixes, and ideas. Pick up wherever you left off.

---

## Up Next

- [ ] **Blog comments** — Add a commenting system to blog posts (evaluate options: Giscus/GitHub Discussions, Disqus, custom with Upstash, etc.)
- [ ] **coder.com blog authorship filtering** — Open a PR on coder/coder to add author filtering to coder.com/blog so "Company Blog" footer link can point directly to Rob's posts
- [ ] **Update About section + add photo** — Refresh the About page content and add a personal photo
- [ ] **Explore Whisper integration** — Evaluate OpenAI Whisper for transcription in the recording pipeline as an alternative or upgrade to current approach
- [ ] **Loom as recording source** — Add option to paste a Loom URL on the admin record page as an alternative to voice recording. Fetch transcript from Loom, feed to Claude alongside the Loom URL so it generates a blog post with the video embedded as hero. Requires Loom Developer API access for transcript retrieval.

## Ideas / Backlog

- [ ] Settings page (currently disabled on admin dashboard) — configure style prompt, default tags, site metadata
- [ ] Vercel MCP server integration — requires Coder admin panel action (Agents > Settings > MCP Servers), may be blocked by Vercel's MCP client allowlist
- [ ] Improve mobile workflow friction — explore direct Stitch → GitHub integration or iOS Shortcuts automation to skip the Files app intermediary
- [ ] Image management in admin — preview/delete images associated with posts
- [ ] Draft mode — `published: false` posts visible in admin but not on the public site (partially works already, needs admin UI)
- [ ] Search across posts (public-facing)
- [ ] Substack import via RSS — one-time bulk import of existing posts at substack.com/signup/import

## Done

### Day 4
- [x] RSS feed at /feed.xml with autodiscovery
- [x] Vercel Web Analytics integration
- [x] Custom view counter with Upstash Redis
- [x] Admin analytics chart (30-day bar chart + top pages)
- [x] Dev.to syndication (pivoted from Medium — API locked since Jan 2025)
- [x] Loom video hero embed component
- [x] PhoneScreenshot MDX components (single + paired)
- [x] Image upload in inline editor (commits to GitHub)
- [x] Admin bar mobile wrapping fix
- [x] Save confirmation banner in inline editor
- [x] Clickable post cards on homepage
- [x] Homepage subhero text update
- [x] Footer contrast fix + copyright year correction
- [x] Date auto-correction for AI year bias (2025 → 2026)
- [x] Footer update — LinkedIn, GitHub, Company Blog links (replaced Twitter)
- [x] Day 4 blog post

### Day 3
- [x] Admin dashboard overhaul (Record New Post + Edit Existing Post picker)
- [x] Inline text editing on blog posts
- [x] Public changelog with auto-generated summaries
- [x] Changelog visibility fix for light mode
- [x] Edit flow fix (record page now updates instead of creating)
- [x] Day 3 blog post

### Day 2
- [x] Stitch design import (Theme B — Neon Brutalist)
- [x] Light/dark theme toggle with FOUC prevention
- [x] Admin pages reskinned to match design system
- [x] Admin login fix (soft nav → hard nav)
- [x] Footer admin link + login page visitor message
- [x] Blog post consolidation (third post merged into Day 2)
- [x] Day 2 blog post
