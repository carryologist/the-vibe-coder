# Image Management Feature

Replaces the `Settings (Coming soon)` placeholder card on the admin dashboard
with a working **Images** card linking to `/admin/images`.

## Pages

| Route | Purpose |
|-------|---------|
| `/admin/images` | Lists every directory under `public/images/` grouped by post slug. Shows thumbnail, file count, total size, post title, and badges for orphaned / draft directories. Orphans float to the top. |
| `/admin/images/[slug]` | Per-directory view with image previews, file size, an "Open" link, and per-file delete. Orphaned directories show an extra "Delete entire directory" action. |

## API

`DELETE /api/images` accepts either:

- `{ "path": "public/images/<slug>/<file>" }` (single)
- `{ "paths": ["public/images/<slug>/<f1>", ...] }` (batch)

Both validate the shape (`public/images/<slug>/<file>` — no `..`, no nesting)
and commit deletions to the content repo `main` branch through the existing
`src/lib/github.ts#deleteFile` helper. Partial failures return `207` so the
UI can surface them.

## Screenshots

- `screenshot.png` — the main `/admin/images` listing.
- `directory-detail.png` — a `/admin/images/<slug>` detail view.
- `dashboard.png` — the dashboard with the new card in place.
