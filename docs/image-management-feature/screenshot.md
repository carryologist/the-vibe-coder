# Image Management Page — Visual Description

## URL
`/admin/images`

## Layout

The page uses the standard admin shell (dark background, monospace nav at top with links: Dashboard · Drafts · Record · Images · Logout).

---

### Header

```
// IMAGES
```

Small, uppercase, monospace label in the site's primary colour (cyan/teal), with wide letter-spacing. Sits flush-left, 32px below the nav bar.

---

### Summary Row

Immediately below the header, a single line of muted monospace text:

```
3 directories   14 images   8.42 MB total
```

The counts are slightly brighter (on-surface colour) while the labels remain muted (on-surface-variant).

---

### Directory Cards

Each directory is rendered as a card with:

- **Border**: thin, barely-visible (`border-outline-variant/10`)
- **Background**: slightly elevated surface (`bg-surface-low`)
- **Padding**: `p-6` (24px all sides)
- **Radius**: `rounded-xl`
- **Hover state**: border shifts to primary-colour tint, background lifts

#### Card Header Row (per directory)

```
day-five                        [orphaned]    6 files · 3.12 MB    [Delete directory]
```

- **Slug** (`day-five`) — font-mono, small, on-surface colour
- **Orphaned badge** (shown only when no MDX post matches the slug):
  - amber background at 15% opacity: `bg-amber-500/15`
  - amber text: `text-amber-400`
  - tiny rounded pill shape: `rounded px-1.5 py-0.5 text-[10px]`
- **File count + size** — muted monospace, even smaller
- **"Delete directory"** button — far right, only on orphaned dirs:
  - border: `border-red-500/30`
  - text: `text-red-400 text-[11px]`
  - hover: faint red background

#### Thumbnail Grid

Below the header row, images are laid out in a horizontal wrapping flex row with 12px gaps.

Each image tile is 64×64px:

```
┌──────────┐
│          │
│  [img]   │   ← w-16 h-16 object-cover rounded, thin border
│          │
└──────────┘
IMG_9136…        ← truncated filename, 9px mono, muted
14.2 KB          ← file size, 9px mono, very muted
[Delete]         ← red-bordered button, 11px mono
```

---

### Inline Delete Confirmation Flow

**Step 1 — click "Delete":**
The delete button is replaced inline with:

```
Delete?
[Confirm]   [Cancel]
```

- "Confirm" has a solid red border + faint red background, hover deepens the red
- "Cancel" has a muted grey border, no background
- While deleting, both buttons show `opacity-50` and are disabled

**Step 2 — on success:**
The image tile disappears from the grid instantly (client-side state update, no page reload).

**Directory-level confirmation:**
When "Delete directory" is clicked, the right side of the card header row changes to:

```
Delete all 6 files?   [Confirm]   [Cancel]
```

---

### Error State

If the GitHub API fails to load data, the page shows:

```
┌─────────────────────────────────────────────────────┐
│  Error: GitHub API error: 404                       │  ← red border, red text, faint red bg
└─────────────────────────────────────────────────────┘
```

---

### Empty State

If there are no image directories at all:

```
No image directories found.
```

Muted monospace text.

---

## Admin Dashboard Card (on `/admin`)

The dashboard grid now has 5 cards in a 3-column layout (last row has 2 cards):

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  🎙️             │  │  ✏️              │  │  📡             │
│  Record New     │  │  Edit Existing  │  │  Syndication    │
│  Post           │  │  Post           │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘

┌─────────────────┐  ┌─────────────────┐
│  🖼️             │  │  ⚙️             │  ← 50% opacity, no hover
│  Images         │  │  Settings       │
│                 │  │  (Coming soon)  │
└─────────────────┘  └─────────────────┘
```

The Images card is a full clickable `<Link>` with glow-card hover effect (same as Record/Syndication). The Settings card remains greyed-out (opacity-50, no hover).

---

## AdminNav

The nav bar at the top now reads:

```
// admin    Dashboard    Drafts    Record    Images                      Logout
```

The active page's link is highlighted in primary (cyan/teal). All others are muted with hover transitions.
