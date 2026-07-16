import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { z } from "zod";
import matter from "gray-matter";
import { Redis } from "@upstash/redis";
import { commitFile, readFile, deleteFile } from "@/lib/github";
import { listDirectory } from "@/lib/github-list";
import { isValidApiToken } from "@/lib/mcp-auth";
import { mcpLog } from "@/lib/mcp-log";
import { rateLimit } from "@/lib/rate-limit";
import { sanitizeSlug } from "@/lib/slug";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// ---------------------------------------------------------------------------
// CORS — same pattern as fitness-tracker
// ---------------------------------------------------------------------------
function allowedOrigin(req: Request): string | null {
  const origin = req.headers.get("origin");
  if (!origin) return null;
  const allow = new Set<string>();
  if (process.env.APP_BASE_URL)
    allow.add(process.env.APP_BASE_URL.replace(/\/$/, ""));
  if (process.env.VERCEL_URL)
    allow.add(`https://${process.env.VERCEL_URL}`);
  if (process.env.NODE_ENV !== "production") {
    allow.add("http://localhost:3000");
    allow.add("http://127.0.0.1:3000");
  }
  return allow.has(origin) ? origin : null;
}

function corsHeaders(req: Request): Record<string, string> {
  const origin = allowedOrigin(req);
  if (!origin) return {};
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET, POST, DELETE, OPTIONS",
    "access-control-allow-headers":
      "authorization, content-type, mcp-session-id",
    "access-control-max-age": "600",
    vary: "origin",
  };
}

// ---------------------------------------------------------------------------
// Rate limiting — Redis-backed, per-IP
//
// Previously an in-memory Map keyed by IP. That degrades badly on
// Vercel: each serverless instance gets its own Map, so a client
// landing on N different cold-started instances effectively gets N
// times the limit. Switched to the same Upstash-backed limiter used
// for login and analytics, which is shared across every instance.
// Fails open (see lib/rate-limit.ts) if Redis is unreachable or
// unconfigured, matching every other rate-limited route in the app.
// ---------------------------------------------------------------------------
const MCP_RATE_LIMIT = 120;
const MCP_RATE_WINDOW_SECONDS = 60;

async function checkRateLimit(req: Request): Promise<Response | null> {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = await rateLimit(
    `ratelimit:mcp:${ip}`,
    MCP_RATE_LIMIT,
    MCP_RATE_WINDOW_SECONDS,
  );
  if (!rl.ok) {
    return new Response(JSON.stringify({ error: "rate_limited" }), {
      status: 429,
      headers: {
        "retry-after": String(rl.retryAfter),
        "content-type": "application/json",
      },
    });
  }
  return null;
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function getRedis() {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

function todayInTz(tz: string): string {
  try {
    return new Date().toLocaleDateString("en-CA", { timeZone: tz });
  } catch {
    return new Date().toISOString().split("T")[0];
  }
}

// ---------------------------------------------------------------------------
// MCP Handler — 16 tools
// ---------------------------------------------------------------------------
const handler = createMcpHandler(
  (server) => {
    // =======================================================================
    // CATEGORY 1: Content Management
    // =======================================================================

    server.tool(
      "list_posts",
      "List all blog posts with frontmatter metadata. " +
        "Returns slug, title, date, tags, published status, type, and description. " +
        "Supports optional filters by status (published/draft/scheduled), tag, and date range.",
      {
        status: z
          .enum(["all", "published", "draft", "scheduled"])
          .default("all")
          .describe(
            "Filter by status: published, draft, scheduled, or all.",
          ),
        tag: z
          .string()
          .optional()
          .describe("Filter to posts containing this tag."),
        since: z
          .string()
          .optional()
          .describe(
            "Only return posts dated on or after this date (YYYY-MM-DD).",
          ),
        limit: z
          .number()
          .int()
          .min(1)
          .max(200)
          .default(50)
          .describe("Max posts to return (1-200, default 50)."),
      },
      async ({ status, tag, since, limit }) => {
        mcpLog("list_posts", "read", { status, tag, since, limit });

        const entries = await listDirectory("content/posts");
        if (!entries) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  error: "Could not list posts directory",
                }),
              },
            ],
            isError: true,
          };
        }

        const mdxFiles = entries.filter((e) => e.name.endsWith(".mdx"));
        const posts: Record<string, unknown>[] = [];

        for (const file of mdxFiles) {
          const raw = await readFile(file.path);
          if (!raw) continue;

          const { data } = matter(raw);
          const slug = file.name.replace(/\.mdx$/, "");

          // Apply filters
          const isPublished = data.published === true;
          const isScheduled = !isPublished && !!data.publishAt;
          const isDraft = !isPublished && !data.publishAt;

          if (status === "published" && !isPublished) continue;
          if (status === "draft" && !isDraft) continue;
          if (status === "scheduled" && !isScheduled) continue;
          if (tag && !(data.tags || []).includes(tag)) continue;
          if (since && data.date && data.date < since) continue;

          posts.push({
            slug,
            title: data.title,
            date: data.date,
            description: data.description,
            tags: data.tags || [],
            published: data.published,
            type: data.type || "how-to",
            publishAt: data.publishAt || null,
            syndicate: data.syndicate || false,
            devtoUrl: data.devtoUrl || null,
          });
        }

        // Sort by date descending
        posts.sort((a, b) =>
          String(b.date || "").localeCompare(String(a.date || "")),
        );

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                { count: posts.length, posts: posts.slice(0, limit) },
                null,
                2,
              ),
            },
          ],
        };
      },
    );

    server.tool(
      "get_post",
      "Get the full MDX content and frontmatter for a single post by slug.",
      {
        slug: z
          .string()
          .min(1)
          .describe("Post slug (filename without .mdx extension)."),
      },
      async ({ slug }) => {
        mcpLog("get_post", "read", { slug });
        const safeSlug = sanitizeSlug(slug);
        const raw = await readFile(`content/posts/${safeSlug}.mdx`);
        if (!raw) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({ error: "not_found", slug: safeSlug }),
              },
            ],
            isError: true,
          };
        }

        const { data, content } = matter(raw);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                { slug: safeSlug, frontmatter: data, content },
                null,
                2,
              ),
            },
          ],
        };
      },
    );

    server.tool(
      "create_post",
      "Create a new MDX blog post in the content repo. " +
        "Sets published: false by default. Commits via GitHub API.",
      {
        slug: z
          .string()
          .min(1)
          .describe(
            "URL slug for the post (e.g. 'my-new-post'). Will be sanitized.",
          ),
        title: z.string().min(1).describe("Post title."),
        date: z
          .string()
          .describe("Post date in YYYY-MM-DD format.")
          .default(new Date().toISOString().split("T")[0]),
        description: z.string().min(1).describe("Post description for SEO/meta."),
        tags: z
          .array(z.string())
          .min(1)
          .describe("Array of tag strings."),
        type: z
          .enum(["how-to", "opinion"])
          .default("how-to")
          .describe("Post type."),
        body: z.string().min(1).describe("MDX body content (without frontmatter)."),
        published: z
          .boolean()
          .default(false)
          .describe("Set to true to publish immediately."),
        publishAt: z
          .string()
          .optional()
          .describe(
            "ISO-8601 timestamp for scheduled publishing (e.g. 2026-06-01T05:00:00-07:00).",
          ),
        sources: z
          .array(z.string())
          .optional()
          .describe("Blog-drafts fodder filenames that fed this post."),
      },
      async ({
        slug,
        title,
        date,
        description,
        tags,
        type,
        body,
        published,
        publishAt,
        sources,
      }) => {
        mcpLog("create_post", "write", { slug, title, published });
        const safeSlug = sanitizeSlug(slug);
        const path = `content/posts/${safeSlug}.mdx`;

        // Check if post already exists
        const existing = await readFile(path);
        if (existing) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  error: "post_exists",
                  slug: safeSlug,
                  hint: "Use update_post to modify existing posts.",
                }),
              },
            ],
            isError: true,
          };
        }

        // Build frontmatter
        const frontmatter: Record<string, unknown> = {
          title,
          date,
          description,
          tags,
          published,
          type,
        };
        if (publishAt) frontmatter.publishAt = publishAt;
        if (sources && sources.length > 0) frontmatter.sources = sources;

        const mdx = matter.stringify(body, frontmatter);
        const sha = await commitFile(
          path,
          mdx,
          `[mcp] post: create "${safeSlug}"`,
        );

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                { success: true, slug: safeSlug, sha, path },
                null,
                2,
              ),
            },
          ],
        };
      },
    );

    server.tool(
      "update_post",
      "Update an existing post's frontmatter and/or body content. " +
        "Only provided fields are changed. Commits via GitHub API.",
      {
        slug: z.string().min(1).describe("Post slug to update."),
        title: z.string().optional().describe("New title."),
        date: z.string().optional().describe("New date (YYYY-MM-DD)."),
        description: z.string().optional().describe("New description."),
        tags: z.array(z.string()).optional().describe("New tags array."),
        type: z.enum(["how-to", "opinion"]).optional().describe("New type."),
        body: z
          .string()
          .optional()
          .describe("New MDX body (replaces entire body)."),
        published: z.boolean().optional().describe("Set published status."),
        publishAt: z
          .string()
          .nullable()
          .optional()
          .describe("Set or clear scheduled publish time."),
        syndicate: z.boolean().optional().describe("Set syndication flag."),
        changelog_summary: z
          .string()
          .optional()
          .describe(
            "If provided, adds a changelog entry with today's date and this summary.",
          ),
      },
      async ({
        slug,
        title,
        date,
        description,
        tags,
        type,
        body,
        published,
        publishAt,
        syndicate,
        changelog_summary,
      }) => {
        mcpLog("update_post", "write", { slug, fields: { title, date, published } });
        const safeSlug = sanitizeSlug(slug);
        const path = `content/posts/${safeSlug}.mdx`;

        const raw = await readFile(path);
        if (!raw) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({ error: "not_found", slug: safeSlug }),
              },
            ],
            isError: true,
          };
        }

        const parsed = matter(raw);

        // Update frontmatter fields (only those provided)
        if (title !== undefined) parsed.data.title = title;
        if (date !== undefined) parsed.data.date = date;
        if (description !== undefined) parsed.data.description = description;
        if (tags !== undefined) parsed.data.tags = tags;
        if (type !== undefined) parsed.data.type = type;
        if (syndicate !== undefined) parsed.data.syndicate = syndicate;

        // Handle publish state transitions
        if (published !== undefined) {
          const wasDraft = parsed.data.published === false;
          parsed.data.published = published;
          // Stamp today's date when publishing a draft
          if (wasDraft && published === true) {
            parsed.data.date = new Date().toISOString().split("T")[0];
          }
        }

        if (publishAt !== undefined) {
          if (publishAt === null) {
            delete parsed.data.publishAt;
          } else {
            parsed.data.publishAt = publishAt;
          }
        }

        // Update body if provided
        const content = body !== undefined ? body : parsed.content;

        // Add changelog entry if summary provided
        if (changelog_summary) {
          const changelog = Array.isArray(parsed.data.changelog)
            ? parsed.data.changelog
            : [];
          changelog.unshift({
            date: new Date().toISOString().split("T")[0],
            summary: changelog_summary,
          });
          parsed.data.changelog = changelog;
        }

        const mdx = matter.stringify(content, parsed.data);
        const sha = await commitFile(
          path,
          mdx,
          `[mcp] post: update "${safeSlug}"`,
        );

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                { success: true, slug: safeSlug, sha, path },
                null,
                2,
              ),
            },
          ],
        };
      },
    );

    server.tool(
      "publish_post",
      "Publish a draft post (flip published: false → true). " +
        "Optionally set a publishAt time for scheduled publishing instead. " +
        "Triggers a Vercel deploy after publishing.",
      {
        slug: z.string().min(1).describe("Post slug to publish."),
        publishAt: z
          .string()
          .optional()
          .describe(
            "If provided, schedule for this time (ISO-8601) instead of publishing immediately.",
          ),
      },
      async ({ slug, publishAt }) => {
        mcpLog("publish_post", "write", { slug, publishAt });
        const safeSlug = sanitizeSlug(slug);
        const path = `content/posts/${safeSlug}.mdx`;

        const raw = await readFile(path);
        if (!raw) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({ error: "not_found", slug: safeSlug }),
              },
            ],
            isError: true,
          };
        }

        const parsed = matter(raw);

        if (publishAt) {
          // Schedule instead of immediate publish
          parsed.data.publishAt = publishAt;
          const mdx = matter.stringify(parsed.content, parsed.data);
          const sha = await commitFile(
            path,
            mdx,
            `[mcp] post: schedule "${safeSlug}" for ${publishAt}`,
          );
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  {
                    success: true,
                    slug: safeSlug,
                    action: "scheduled",
                    publishAt,
                    sha,
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        // Immediate publish
        parsed.data.published = true;
        parsed.data.date = new Date().toISOString().split("T")[0];
        delete parsed.data.publishAt;

        const mdx = matter.stringify(parsed.content, parsed.data);
        const sha = await commitFile(
          path,
          mdx,
          `[mcp] post: publish "${safeSlug}"`,
        );

        // Trigger deploy
        const deployResult = await triggerDeploy();

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: true,
                  slug: safeSlug,
                  action: "published",
                  sha,
                  deploy: deployResult,
                },
                null,
                2,
              ),
            },
          ],
        };
      },
    );

    server.tool(
      "unpublish_post",
      "Unpublish a post (flip published: true → false). Triggers a Vercel deploy.",
      {
        slug: z.string().min(1).describe("Post slug to unpublish."),
      },
      async ({ slug }) => {
        mcpLog("unpublish_post", "write", { slug });
        const safeSlug = sanitizeSlug(slug);
        const path = `content/posts/${safeSlug}.mdx`;

        const raw = await readFile(path);
        if (!raw) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({ error: "not_found", slug: safeSlug }),
              },
            ],
            isError: true,
          };
        }

        const parsed = matter(raw);
        parsed.data.published = false;
        const mdx = matter.stringify(parsed.content, parsed.data);
        const sha = await commitFile(
          path,
          mdx,
          `[mcp] post: unpublish "${safeSlug}"`,
        );

        const deployResult = await triggerDeploy();

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: true,
                  slug: safeSlug,
                  action: "unpublished",
                  sha,
                  deploy: deployResult,
                },
                null,
                2,
              ),
            },
          ],
        };
      },
    );

    server.tool(
      "delete_post",
      "Delete a post from the content repo. This is permanent — the post " +
        "file is removed from GitHub. The Git history still retains it.",
      {
        slug: z.string().min(1).describe("Post slug to delete."),
      },
      async ({ slug }) => {
        mcpLog("delete_post", "write", { slug });
        const safeSlug = sanitizeSlug(slug);
        const path = `content/posts/${safeSlug}.mdx`;

        const sha = await deleteFile(
          path,
          `[mcp] post: delete "${safeSlug}"`,
        );

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                { success: true, slug: safeSlug, deleted: true, sha },
                null,
                2,
              ),
            },
          ],
        };
      },
    );

    // =======================================================================
    // CATEGORY 2: Blog Fodder & Editorial
    // =======================================================================

    server.tool(
      "list_fodder",
      "List all blog-drafts/ fodder files (active and archived) with their " +
        "consumption status — which posts reference each fodder file in their sources field.",
      {},
      async () => {
        mcpLog("list_fodder", "read");

        // Get active fodder
        const active = await listDirectory("blog-drafts");
        const archived = await listDirectory("blog-drafts/archived");

        // Get all posts to check sources references
        const postsDir = await listDirectory("content/posts");
        const sourceMap: Record<string, string[]> = {};

        if (postsDir) {
          for (const file of postsDir.filter((e) =>
            e.name.endsWith(".mdx"),
          )) {
            const raw = await readFile(file.path);
            if (!raw) continue;
            const { data } = matter(raw);
            if (Array.isArray(data.sources)) {
              for (const src of data.sources) {
                if (!sourceMap[src]) sourceMap[src] = [];
                sourceMap[src].push(file.name.replace(/\.mdx$/, ""));
              }
            }
          }
        }

        const activeFiles = (active || [])
          .filter(
            (e) =>
              e.type === "file" &&
              e.name.endsWith(".md") &&
              e.name !== "README.md",
          )
          .map((e) => ({
            name: e.name,
            size: e.size,
            consumed: !!sourceMap[e.name],
            referencedBy: sourceMap[e.name] || [],
          }));

        const archivedFiles = (archived || [])
          .filter((e) => e.type === "file" && e.name.endsWith(".md"))
          .map((e) => ({
            name: e.name,
            size: e.size,
            consumed: true,
            referencedBy: sourceMap[e.name] || [],
          }));

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  active: { count: activeFiles.length, files: activeFiles },
                  archived: {
                    count: archivedFiles.length,
                    files: archivedFiles,
                  },
                },
                null,
                2,
              ),
            },
          ],
        };
      },
    );

    server.tool(
      "get_fodder",
      "Read the full content of a blog fodder file from blog-drafts/.",
      {
        filename: z
          .string()
          .min(1)
          .describe(
            "Fodder filename (e.g. 'blog-fodder-topic-date.md'). Looked up in blog-drafts/ first, then blog-drafts/archived/.",
          ),
      },
      async ({ filename }) => {
        mcpLog("get_fodder", "read", { filename });

        // Sanitize — prevent path traversal
        const safeName = filename.replace(/[/\\]/g, "").replace(/\.\./g, "");

        let raw = await readFile(`blog-drafts/${safeName}`);
        if (!raw) {
          raw = await readFile(`blog-drafts/archived/${safeName}`);
        }

        if (!raw) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  error: "not_found",
                  filename: safeName,
                }),
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                { filename: safeName, content: raw },
                null,
                2,
              ),
            },
          ],
        };
      },
    );

    server.tool(
      "get_todo",
      "Read the current content/TODO.md editorial calendar and task list.",
      {},
      async () => {
        mcpLog("get_todo", "read");
        const raw = await readFile("content/TODO.md");
        if (!raw) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({ error: "TODO.md not found" }),
              },
            ],
            isError: true,
          };
        }
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ content: raw }, null, 2),
            },
          ],
        };
      },
    );

    server.tool(
      "update_todo",
      "Update the content/TODO.md file. Replaces the entire file content. " +
        "Read it first with get_todo, make changes, then write back.",
      {
        content: z
          .string()
          .min(1)
          .describe("Full replacement content for TODO.md."),
      },
      async ({ content }) => {
        mcpLog("update_todo", "write");
        const sha = await commitFile(
          "content/TODO.md",
          content,
          "[mcp] chore: update TODO.md",
        );
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ success: true, sha }, null, 2),
            },
          ],
        };
      },
    );

    // =======================================================================
    // CATEGORY 3: Analytics
    // =======================================================================

    server.tool(
      "analytics_summary",
      "Get a 30-day analytics summary: daily view counts, total views, and today's top 10 pages.",
      {
        tz: z
          .string()
          .default("America/Los_Angeles")
          .describe("IANA timezone for date calculation (default: America/Los_Angeles)."),
      },
      async ({ tz }) => {
        mcpLog("analytics_summary", "read", { tz });
        const redis = getRedis();
        if (!redis) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  error: "redis_not_configured",
                  hint: "Set KV_REST_API_URL and KV_REST_API_TOKEN.",
                }),
              },
            ],
            isError: true,
          };
        }

        const todayStr = todayInTz(tz);
        const days: { date: string; views: number }[] = [];
        const pipeline = redis.pipeline();
        const dates: string[] = [];

        const todayDate = new Date(todayStr + "T12:00:00Z");
        for (let i = 29; i >= 0; i--) {
          const d = new Date(todayDate);
          d.setUTCDate(d.getUTCDate() - i);
          const dateStr = d.toISOString().split("T")[0];
          dates.push(dateStr);
          pipeline.get(`views:${dateStr}:total`);
        }

        const results = await pipeline.exec();
        for (let i = 0; i < dates.length; i++) {
          days.push({
            date: dates[i],
            views: (results[i] as number) || 0,
          });
        }

        const allPaths = (await redis.smembers("views:paths")) as string[];
        let topPages: { path: string; views: number }[] = [];
        if (allPaths.length > 0) {
          const pathPipeline = redis.pipeline();
          for (const p of allPaths) {
            pathPipeline.get(`views:${todayStr}:${p}`);
          }
          const pathResults = await pathPipeline.exec();
          topPages = allPaths
            .map((p, i) => ({
              path: p,
              views: (pathResults[i] as number) || 0,
            }))
            .filter((p) => p.views > 0)
            .sort((a, b) => b.views - a.views)
            .slice(0, 10);
        }

        const totalViews = days.reduce((sum, d) => sum + d.views, 0);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                { totalViews, days, topPages },
                null,
                2,
              ),
            },
          ],
        };
      },
    );

    // =======================================================================
    // CATEGORY 4: Deployment & Syndication
    // =======================================================================

    server.tool(
      "trigger_deploy",
      "Trigger a Vercel deployment by hitting the deploy hook. " +
        "Use after making content changes that need to go live.",
      {},
      async () => {
        mcpLog("trigger_deploy", "action");
        const result = await triggerDeploy();
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
          ...(result.error ? { isError: true } : {}),
        };
      },
    );

    server.tool(
      "syndicate_post",
      "Cross-post a published post to Dev.to. Returns the Dev.to URL. " +
        "Updates the post frontmatter with the devtoUrl.",
      {
        slug: z
          .string()
          .min(1)
          .describe("Slug of the published post to syndicate."),
      },
      async ({ slug }) => {
        mcpLog("syndicate_post", "action", { slug });
        const safeSlug = sanitizeSlug(slug);

        const apiKey = process.env.DEVTO_API_KEY;
        if (!apiKey) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  error: "devto_not_configured",
                  hint: "Set DEVTO_API_KEY environment variable.",
                }),
              },
            ],
            isError: true,
          };
        }

        const raw = await readFile(`content/posts/${safeSlug}.mdx`);
        if (!raw) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({ error: "not_found", slug: safeSlug }),
              },
            ],
            isError: true,
          };
        }

        const { data: meta, content } = matter(raw);

        if (meta.devtoUrl) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  error: "already_syndicated",
                  slug: safeSlug,
                  devtoUrl: meta.devtoUrl,
                }),
              },
            ],
            isError: true,
          };
        }

        const devtoRes = await fetch("https://dev.to/api/articles", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "api-key": apiKey,
          },
          body: JSON.stringify({
            article: {
              title: meta.title,
              body_markdown: content,
              canonical_url: `https://vibescoder.dev/posts/${safeSlug}`,
              tags: (meta.tags || [])
                .slice(0, 4)
                .map((t: string) =>
                  t.replace(/[^a-z0-9]/gi, "").toLowerCase(),
                ),
              published: true,
              description: meta.description || "",
            },
          }),
        });

        if (!devtoRes.ok) {
          const err = await devtoRes.text();
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  error: "devto_api_error",
                  status: devtoRes.status,
                  detail: err,
                }),
              },
            ],
            isError: true,
          };
        }

        const devtoData = await devtoRes.json();
        const devtoUrl = devtoData.url;

        if (devtoUrl) {
          const updatedMeta = { ...meta, devtoUrl };
          const updatedRaw = matter.stringify(content, updatedMeta);
          await commitFile(
            `content/posts/${safeSlug}.mdx`,
            updatedRaw,
            `[mcp] syndicate: add Dev.to URL to "${meta.title}"`,
          );
        }

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: true,
                  slug: safeSlug,
                  devtoUrl,
                  devtoId: devtoData.id,
                },
                null,
                2,
              ),
            },
          ],
        };
      },
    );

    // =======================================================================
    // CATEGORY 5: Diagnostics
    // =======================================================================

    server.tool(
      "site_health",
      "Check the health of vibescoder.dev by fetching key endpoints and " +
        "reporting HTTP status codes and response times.",
      {},
      async () => {
        mcpLog("site_health", "read");
        const baseUrl = process.env.APP_BASE_URL || "https://vibescoder.dev";
        const endpoints = [
          "/",
          "/feed.xml",
          "/llms.txt",
          "/sitemap.xml",
          "/llms-full.txt",
        ];

        const results = await Promise.all(
          endpoints.map(async (path) => {
            const url = `${baseUrl}${path}`;
            const start = Date.now();
            try {
              const res = await fetch(url, {
                method: "GET",
                redirect: "follow",
                signal: AbortSignal.timeout(10_000),
              });
              return {
                path,
                status: res.status,
                ok: res.ok,
                ms: Date.now() - start,
              };
            } catch (err) {
              return {
                path,
                status: 0,
                ok: false,
                ms: Date.now() - start,
                error:
                  err instanceof Error ? err.message : "fetch_failed",
              };
            }
          }),
        );

        const allOk = results.every((r) => r.ok);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                { healthy: allOk, baseUrl, endpoints: results },
                null,
                2,
              ),
            },
          ],
        };
      },
    );

    server.tool(
      "get_settings",
      "Read settings.json from the content repo (contains AI writing style config).",
      {},
      async () => {
        mcpLog("get_settings", "read");
        const raw = await readFile("content/settings.json");
        if (!raw) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  stylePrompt:
                    "Transform this transcript into a well-structured blog post with MDX frontmatter.",
                }),
              },
            ],
          };
        }

        try {
          const settings = JSON.parse(raw);
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(settings, null, 2),
              },
            ],
          };
        } catch {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  error: "invalid_json",
                  raw,
                }),
              },
            ],
            isError: true,
          };
        }
      },
    );
  },
  {
    serverInfo: { name: "vibescoder", version: "1.0.0" },
  },
  {
    basePath: "/api/mcp",
    verboseLogs: false,
    maxDuration: 300,
    disableSse: true,
  },
);

// ---------------------------------------------------------------------------
// Auth wrapper
// ---------------------------------------------------------------------------
const authed = withMcpAuth(
  handler,
  async (_req, bearerToken) => {
    if (!isValidApiToken(bearerToken ?? null)) return undefined;
    return {
      token: "redacted",
      clientId: "vibescoder-mcp",
      scopes: [
        "content:read",
        "content:write",
        "analytics:read",
        "deploy:run",
        "syndicate:run",
      ],
    };
  },
  { required: true },
);

// ---------------------------------------------------------------------------
// Guards: rate limiting + CORS
// ---------------------------------------------------------------------------
async function withGuards(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }

  const limited = await checkRateLimit(req);
  if (limited) {
    const headers = new Headers(limited.headers);
    for (const [k, v] of Object.entries(corsHeaders(req))) headers.set(k, v);
    return new Response(limited.body, { status: 429, headers });
  }

  const res = await authed(req);
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(corsHeaders(req))) headers.set(k, v);
  return new Response(res.body, { status: res.status, headers });
}

export {
  withGuards as GET,
  withGuards as POST,
  withGuards as DELETE,
  withGuards as OPTIONS,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function triggerDeploy(): Promise<Record<string, unknown>> {
  const hook = process.env.VERCEL_DEPLOY_HOOK;
  if (!hook) {
    return {
      error: "deploy_hook_not_configured",
      hint: "Set VERCEL_DEPLOY_HOOK environment variable.",
    };
  }

  try {
    const res = await fetch(hook, { method: "POST" });
    if (!res.ok) {
      const body = await res.text();
      return { error: "deploy_hook_failed", status: res.status, body };
    }
    const data = await res.json();
    return { triggered: true, ...data };
  } catch (err) {
    return {
      error: "deploy_hook_error",
      message: err instanceof Error ? err.message : "unknown",
    };
  }
}
