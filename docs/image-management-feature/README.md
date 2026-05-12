# Image management feature

Admin tools for browsing, previewing, and deleting images under
`public/images/` in the content repo.

## Routes

| Route | Purpose |
|---|---|
| `/admin/images` | Index — every directory with file count, total size, orphan flag, post link |
| `/admin/images/<slug>` | Detail — thumbnail grid for a single directory with per-file delete |
| `DELETE /api/images` | Delete one (`{path}`) or many (`{paths}`) image files. Returns 207 on partial failure. |

## Files

- `src/lib/image-types.ts` — types + `formatBytes` + `isImageFilename`. Client-safe.
- `src/lib/images.ts` — server-only. Lists directories via the GitHub Contents API, runs
  three-tier orphan matching, exports `isValidImageRepoPath`.
- `src/app/admin/images/page.tsx` — index page (server component, force-dynamic).
- `src/app/admin/images/[slug]/page.tsx` — detail page (server component, force-dynamic).
- `src/components/admin/ImageManager.tsx` — index client island with delete-all-orphan flow.
- `src/components/admin/ImageDirectoryView.tsx` — detail client island with per-file delete.
- `src/app/api/images/route.ts` — adds `DELETE` to the existing upload route. POST upload unchanged.

## Design notes

- **Data source is the GitHub Contents API**, not the local filesystem. The local tree is a
  build-time snapshot in production; the API always shows current state.
- **Orphan matching is three-tier**: exact → prefix (`day-four` matches
  `day-four-rss-...`) → content reference (post body includes `/images/<slug>/`).
- **Path validation is strict**: exactly two segments under `public/images/`, no `..`,
  slug must match `[a-z0-9][a-z0-9-]*`. Same `isValidImageRepoPath` helper runs at the
  API and (defensively) before the GitHub call.
- **Multi-status DELETE**: a batch request returns HTTP 207 with per-path `results` when
  some entries fail. No half-deletes from a single bad path.

## Screenshots

- `screenshot.png` — `/admin/images` index, orphan section pinned to the top
- `directory-detail.png` — `/admin/images/<slug>` detail with thumbnail grid
- `dashboard.png` — `/admin` showing the new Images card

## Heritage

This is the merged best-of from Round 5 of Vibes Coder's model bakeoff:

- **Path validator** — adapted from Opus 4.7's `isValidImageRepoPath`
- **Three-tier orphan match** — adapted from Opus 4.6's slug-prefix iteration
- **Type-narrowing API handler** — adapted from Sonnet 4.6's `typeof body === "object"` pattern
- **Multi-status DELETE response** — adapted from Opus 4.7's per-path results array
- **GitHub-API data source** — adapted from Opus 4.6 / Sonnet 4.6 (Qwen 3.5 and Opus 4.7
  both read the local filesystem, which would stale-out on Vercel)
- **Two-route split** + **nested-route nav highlight** — adapted from Opus 4.7
- **Visual polish** — adapted from Sonnet 4.6's confirmation modal pattern
