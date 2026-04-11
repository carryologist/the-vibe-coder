# Vibes Coder

A personal blog about software development, AI-assisted coding, and the craft of building software.

Built with [Next.js](https://nextjs.org), [Tailwind CSS](https://tailwindcss.com), and [MDX](https://mdxjs.com). Deployed on [Vercel](https://vercel.com).

## Writing New Posts

Create a new `.mdx` file in `content/posts/`:

```mdx
---
title: "Your Post Title"
date: "2025-04-11"
description: "A short description for previews and SEO."
tags: ["tag1", "tag2"]
published: true
---

Your content here. Supports full MDX — React components, code blocks, etc.
```

Set `published: false` to save drafts without publishing.

## Development

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deployment

Connected to Vercel for automatic deployments on push to `main`.

## Content Workflow

All content is written with AI assistance (Claude, Gemini). The workflow:

1. Write/generate a `.mdx` file
2. Place it in `content/posts/`
3. Commit and push to `main`
4. Vercel auto-deploys

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS v4
- **Content**: MDX with gray-matter frontmatter
- **Syntax Highlighting**: rehype-pretty-code + Shiki
- **Deployment**: Vercel
