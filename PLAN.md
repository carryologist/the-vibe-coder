# Admin Dashboard + Voice-to-Blog Feature

## Architecture Overview

### Authentication
- Simple password-based admin auth (no OAuth complexity for a personal site)
- Admin password stored as `ADMIN_PASSWORD` environment variable in Vercel
- Server-side session via a signed HTTP-only cookie
- Middleware protects `/admin/*` routes — redirects to `/admin/login` if unauthenticated
- No admin UI is visible to public visitors

### API Routes (Next.js Route Handlers)
| Route | Purpose |
|-------|---------|
| `POST /api/auth/login` | Validate password, set session cookie |
| `POST /api/auth/logout` | Clear session cookie |
| `GET /api/auth/status` | Check if authenticated |
| `POST /api/transcribe` | Accepts audio blob, sends to Claude for transcription |
| `POST /api/generate-post` | Takes transcript + style prompt, generates MDX blog post via Claude |
| `POST /api/posts` | Saves generated post as MDX file + commits to GitHub via API |
| `GET /api/settings` | Returns current style prompt |
| `PUT /api/settings` | Updates style prompt |

### Audio Recording + Transcription
- **Browser-side**: `MediaRecorder` API captures mic audio
- **Chunked upload**: For long recordings (10+ min), audio is recorded in chunks and sent incrementally to avoid timeout/memory issues
- **Transcription**: Claude Sonnet supports audio input natively — send audio directly to Claude's API with a transcription prompt
- **Format**: Record as `audio/webm` (best browser support), chunk into ~2-minute segments for processing

### Blog Generation Pipeline
1. User hits record in admin dashboard
2. Audio captured via MediaRecorder, chunked into segments
3. Each chunk sent to `/api/transcribe` → Claude Sonnet transcribes
4. Full transcript assembled on the client
5. User reviews/edits transcript
6. User clicks "Generate Post" → `/api/generate-post` sends transcript + configurable style prompt to Claude Sonnet
7. Claude returns structured MDX with frontmatter
8. User previews the generated post, can edit
9. User clicks "Publish" → `/api/posts` writes the file and commits to the repo via GitHub API (triggers Vercel deploy)

### Settings Storage
- Style prompt stored as a JSON file in the repo: `content/settings.json`
- Read/written via GitHub API (same as posts)
- Default style prompt provided as fallback

### File Structure (new files)
```
src/
  app/
    admin/
      login/page.tsx        — Login form
      page.tsx              — Admin dashboard home
      record/page.tsx       — Voice recording + transcription UI
      layout.tsx            — Admin layout with nav
  api/
    auth/
      login/route.ts
      logout/route.ts
      status/route.ts
    transcribe/route.ts
    generate-post/route.ts
    posts/route.ts
    settings/route.ts
  components/
    admin/
      AudioRecorder.tsx     — Mic capture + chunked recording
      TranscriptEditor.tsx  — Editable transcript display
      PostPreview.tsx       — Preview generated MDX
      AdminNav.tsx          — Admin sidebar/nav
  lib/
    auth.ts                 — Cookie signing/verification
    claude.ts               — Anthropic SDK wrapper
    github.ts               — GitHub API helpers (create/update files)
content/
  settings.json             — Style prompt config
```

### Environment Variables (Vercel)
| Variable | Purpose |
|----------|---------|
| `ADMIN_PASSWORD` | Password for admin login |
| `ANTHROPIC_API_KEY` | Claude API access |
| `GITHUB_TOKEN` | GitHub API for committing posts (fine-grained PAT with repo contents write) |
| `GITHUB_REPO` | `carryologist/the-vibe-coder` |
| `SESSION_SECRET` | Secret for signing session cookies |

### Key Design Decisions
- **No database** — everything is file-based (MDX in git). This keeps the site simple and fully rebuildable from the repo.
- **No visible admin link** — navigate directly to `/admin` to access. Nothing in the public UI hints at it.
- **Claude for transcription** — Sonnet handles audio natively, no need for a separate Whisper/Deepgram service. For 10+ min recordings, we chunk into segments.
- **GitHub API for publishing** — rather than requiring git on the server, we use the GitHub Contents API to commit files. This triggers Vercel auto-deploy.
- **Style prompt is configurable** — stored in `content/settings.json`, editable from the admin dashboard. You'll supply the actual prompt later.

### Implementation Order
1. Auth system (env var, cookie, middleware, login page)
2. Admin layout + dashboard shell
3. Claude SDK integration (`lib/claude.ts`)
4. Audio recording component
5. Transcription API route
6. Blog generation API route
7. GitHub publishing API route
8. Settings management
9. Full recording → publish flow wired together
