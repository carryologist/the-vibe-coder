# Vibes Coder — To-Do List

A running scratchpad for site enhancements, fixes, and ideas. Pick up wherever you left off.

---

## Up Next

All caught up! Check the backlog for future ideas.

## Ideas / Backlog

- [ ] Settings page (currently disabled on admin dashboard) — configure style prompt, default tags, site metadata
- [ ] Vercel MCP server integration — requires Coder admin panel action (Agents > Settings > MCP Servers), may be blocked by Vercel's MCP client allowlist
- [ ] Improve mobile workflow friction — explore direct Stitch → GitHub integration or iOS Shortcuts automation to skip the Files app intermediary
- [ ] Image management in admin — preview/delete images associated with posts
- [ ] Draft mode — `published: false` posts visible in admin but not on the public site (partially works already, needs admin UI)
- [ ] Search across posts (public-facing)
- [ ] Substack import via RSS — one-time bulk import of existing posts at substack.com/signup/import

## Done

### April 19, 2026
- [x] CollapsibleCode MDX component — Added `<CollapsibleCode>` for expandable code snippets in blog posts. Shows a clickable label with chevron that unfurls to reveal full content. Registered in MDXComponents map. Matches existing cyberpunk design system.
- [x] Local LLM setup script — Built and ran `setup-local-llm.sh` on AI workstation (RTX 5090 / Ubuntu 24.04). Installed Ollama v0.21.0, pulled 5 models (qwen3.5:35b-a3b, deepseek-r1:14b, codestral:22b, nomic-embed-text). OpenAI-compatible API verified at localhost:11434.
- [x] Blog fodder captured — Session notes for local LLM blog post pushed to `blog-drafts/local-llm-setup-notes.md`.

### Day 5
- [x] Blog comments — Added Giscus (GitHub Discussions) component with theme-aware light/dark support, wired into all blog post pages. Discussions enabled on repo. Pending: install Giscus GitHub App + get category ID from giscus.app.
- [x] coder.com blog authorship filtering — Researched coder/coder.com codebase. Author data exists in DatoCMS but no filtering is implemented. Filed [issue #719](https://github.com/coder/coder.com/issues/719) with implementation plan mirroring existing category filter pattern.
- [x] Updated About page — Rewrote intro with photo, bio (CEO of Coder), and reframed the site description around the live AI-assisted development experiment. Kept "The Setup" section as-is.
- [x] Whisper/Wispr research — Investigated OpenAI Whisper (open-source speech recognition model, $0.006/min API) and discovered it's unrelated to Wispr Flow (wisprflow.ai), the AI dictation app popular with execs. TIL: completely different products despite similar names. Wispr Flow is a system-level voice keyboard that already works with any text field — no site integration needed. Dismissed from punchlist.
- [x] Loom as recording source — completed in prior session

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
