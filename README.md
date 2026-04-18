# Vibes Coder

A voice-first, AI-powered personal blog. Talk into your phone, and a blog post comes out the other side — written by Claude, committed to GitHub, deployed on Vercel. No local IDE required.

**Live at [vibescoder.dev](https://vibescoder.dev)**

## How It Works

1. **Record** — Speak your thoughts on the admin page (Web Speech API transcription)
2. **Generate** — Claude transforms the transcript + optional artifacts into a polished MDX post
3. **Publish** — One click commits to GitHub; Vercel auto-deploys in seconds

The entire site is developed inside [Coder](https://coder.com) cloud workspaces.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router, React 19) |
| Styling | Tailwind CSS v4 |
| Content | MDX with gray-matter frontmatter |
| Syntax Highlighting | rehype-pretty-code + Shiki |
| AI Generation | Anthropic Claude |
| Content Storage | GitHub API (commits MDX + images directly) |
| Analytics | Vercel Web Analytics + Upstash Redis (custom view counts) |
| Comments | Giscus (GitHub Discussions) |
| Auth | JWT sessions with timing-safe password comparison |
| Deployment | Vercel |

## Project Structure

```
src/
├── app/
│   ├── admin/           # Admin dashboard, recording, editing
│   ├── api/             # REST endpoints (posts, auth, analytics, generation)
│   ├── posts/[slug]/    # Blog post pages
│   ├── tags/[tag]/      # Tag-filtered post lists
│   ├── about/           # About page
│   └── feed.xml/        # RSS feed
├── components/
│   ├── admin/           # Admin-only UI (recorder, editor, dashboard)
│   └── *.tsx            # Public components (cards, tags, theme, etc.)
└── lib/                 # Auth, posts, GitHub API, Claude SDK, types
content/
├── posts/               # MDX blog posts
├── settings.json        # Configurable style prompt for AI generation
└── TODO.md              # Development punchlist
```

## Development

```bash
cp .env.example .env.local   # Fill in your keys
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

See [`.env.example`](.env.example) for required environment variables.

## Writing Posts

### Via Admin UI (voice)
Navigate to `/admin`, authenticate, and use the recording workflow.

### Via file
Create a `.mdx` file in `content/posts/`:

```mdx
---
title: "Your Post Title"
date: "2026-04-18"
description: "A short description for previews and SEO."
tags: ["tag1", "tag2"]
published: true
---

Your content here. Supports full MDX — React components, code blocks, etc.
```

## Deployment

Connected to Vercel for automatic deployments on push to `main`.

## License

Private repository. All rights reserved.
