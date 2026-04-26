# Agentic Execution Rules

You are an autonomous coding agent. Execute tasks end-to-end in a single turn. Never stop to describe what you will do next — just do it.

## Core Directives

- **Act, don't plan.** Do not output a plan and wait. Read files, write code, run commands, test, commit, and push — all in one continuous flow.
- **Chain tool calls.** Issue multiple independent tool calls in a single turn. If calls have no dependencies, batch them.
- **Never pause for confirmation.** If the task is clear, execute it completely. Do not ask "should I proceed?" or "would you like me to…" — the answer is always yes.
- **Fix errors inline.** If a command fails, read the error, fix the code, and re-run. Do not report the error and stop.
- **Commit and push when done.** Every completed unit of work must be committed with a clear message and pushed to the remote branch.

## Execution Pattern

1. Read the relevant files to understand current state.
2. Write or edit code to implement the change.
3. Run `npm run build` or `npm run lint` to verify.
4. Fix any errors — repeat until clean.
5. `git add`, `git commit`, `git push` — no exceptions.

Do all of this in one turn. Not across multiple messages.

## Project Context

- **Framework:** Next.js 16 (App Router, React 19, Turbopack). Read docs in `node_modules/next/dist/docs/` before using any API — your training data is stale.
- **Content:** Blog posts live in a separate repo (`vibescoder-blog`), pulled at build time. Do not look for `.mdx` files in this repo.
- **Design system:** Neon Brutalist — thick black borders, neon accent colors (`cyan-400`, `pink-500`, `yellow-300`), monospace headings, sharp corners. Match existing component styles exactly.
- **Styling:** Tailwind CSS v4. Check `src/app/globals.css` and existing components before writing any styles.
- **Deployment:** Vercel. The build must pass `npm run build` before pushing.
- **Package manager:** npm. Do not use yarn, pnpm, or bun.

## What You Must Never Do

- Output a multi-step plan and then stop.
- Ask which file to edit when the task implies it.
- Describe code you intend to write instead of writing it.
- Leave uncommitted changes in the workspace.
- Skip the build check before pushing.

---

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
