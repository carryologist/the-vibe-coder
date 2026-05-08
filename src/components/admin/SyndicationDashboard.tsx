"use client";

import { useState, useRef } from "react";

interface PostInfo {
  slug: string;
  title: string;
  date: string;
  published: boolean;
  devtoUrl?: string;
  tags: string[];
}

interface ResultItem {
  slug: string;
  title: string;
  status: "published" | "skipped" | "error";
  devtoUrl?: string;
  error?: string;
}

interface SyndicationDashboardProps {
  posts: PostInfo[];
}

const DELAY_MS = 31_000; // 31 seconds between Dev.to API calls

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function SyndicationDashboard({
  posts,
}: SyndicationDashboardProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [syndicating, setSyndicating] = useState(false);
  const [results, setResults] = useState<ResultItem[]>([]);
  const [progress, setProgress] = useState<string | null>(null);
  const [rebuilding, setRebuilding] = useState(false);
  const [rebuildLog, setRebuildLog] = useState<string[]>([]);
  const abortRef = useRef(false);

  // Split posts into categories.
  const published = posts.filter((p) => p.published);
  const syndicated = published.filter((p) => p.devtoUrl);
  const unsyndicated = published.filter((p) => !p.devtoUrl);

  function toggleSelect(slug: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(unsyndicated.map((p) => p.slug)));
  }

  function selectNone() {
    setSelected(new Set());
  }

  // --- Bulk syndicate: client-side loop, one post at a time ---
  async function handleBulkSyndicate() {
    const slugs = Array.from(selected);
    if (slugs.length === 0) return;
    if (
      !confirm(
        `Publish ${slugs.length} post${slugs.length === 1 ? "" : "s"} to Dev.to? This will take ~${Math.ceil((slugs.length * 31) / 60)} min.`
      )
    )
      return;

    setSyndicating(true);
    setResults([]);
    abortRef.current = false;

    for (let i = 0; i < slugs.length; i++) {
      if (abortRef.current) break;

      const slug = slugs[i];
      setProgress(`Publishing ${i + 1} of ${slugs.length}: ${slug}…`);

      // Wait 31s between posts (skip before the first).
      if (i > 0) {
        setProgress(
          `Waiting 31s (rate limit)… then ${i + 1} of ${slugs.length}`
        );
        await sleep(DELAY_MS);
        if (abortRef.current) break;
        setProgress(`Publishing ${i + 1} of ${slugs.length}: ${slug}…`);
      }

      try {
        const res = await fetch("/api/syndicate/devto/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug }),
        });
        const data = await res.json();

        if (!res.ok) {
          setResults((prev) => [
            ...prev,
            {
              slug,
              title: data.title || slug,
              status: "error",
              error: data.error,
            },
          ]);
        } else {
          setResults((prev) => [
            ...prev,
            {
              slug,
              title: data.title || slug,
              status: data.status || "published",
              devtoUrl: data.devtoUrl,
              error: data.error,
            },
          ]);
        }
      } catch {
        setResults((prev) => [
          ...prev,
          { slug, title: slug, status: "error", error: "Network error" },
        ]);
      }
    }

    const done = abortRef.current ? "Stopped" : "Done";
    setProgress(done);
    setSyndicating(false);
    setSelected(new Set());
  }

  // --- Rebuild: delete all Dev.to articles and recreate with correct dates ---
  async function handleRebuild() {
    if (
      !confirm(
        "Delete ALL Dev.to articles and recreate them with correct dates? This will take ~12 minutes."
      )
    )
      return;

    setRebuilding(true);
    setRebuildLog([]);
    abortRef.current = false;

    try {
      // Step 1: Get all articles from Dev.to.
      setRebuildLog(["Fetching Dev.to articles…"]);
      const listRes = await fetch("/api/syndicate/devto/rebuild", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list" }),
      });
      const listData = await listRes.json();

      if (!listRes.ok) {
        setRebuildLog([`Error: ${listData.error}`]);
        setRebuilding(false);
        return;
      }

      const articles = listData.articles as Array<{
        articleId: number;
        title: string;
        slug: string;
      }>;

      if (articles.length === 0) {
        setRebuildLog(["No articles found on Dev.to."]);
        setRebuilding(false);
        return;
      }

      setRebuildLog((prev) => [...prev, `Found ${articles.length} articles. Deleting…`]);

      // Step 2: Delete each article.
      for (let i = 0; i < articles.length; i++) {
        if (abortRef.current) break;
        const a = articles[i];

        if (i > 0) {
          setRebuildLog((prev) => [...prev, "Waiting 31s (rate limit)…"]);
          await sleep(DELAY_MS);
          if (abortRef.current) break;
        }

        try {
          const res = await fetch("/api/syndicate/devto/rebuild", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "delete", articleId: a.articleId }),
          });
          const data = await res.json();
          if (!res.ok) {
            setRebuildLog((prev) => [...prev, `✗ Delete ${a.title} — ${data.error}`]);
          } else {
            setRebuildLog((prev) => [...prev, `✓ Deleted: ${a.title}`]);
          }
        } catch {
          setRebuildLog((prev) => [...prev, `✗ Delete ${a.title} — Network error`]);
        }
      }

      if (abortRef.current) {
        setRebuildLog((prev) => [...prev, "Stopped."]);
        setRebuilding(false);
        return;
      }

      // Step 3: Recreate each article with correct dates.
      // Collect unique slugs (skip empty).
      const slugs = [...new Set(articles.map((a) => a.slug).filter(Boolean))];
      setRebuildLog((prev) => [...prev, ``, `Recreating ${slugs.length} articles…`]);

      for (let i = 0; i < slugs.length; i++) {
        if (abortRef.current) break;
        const slug = slugs[i];

        setRebuildLog((prev) => [...prev, "Waiting 31s (rate limit)…"]);
        await sleep(DELAY_MS);
        if (abortRef.current) break;

        try {
          const res = await fetch("/api/syndicate/devto/rebuild", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "create", slug }),
          });
          const data = await res.json();
          if (!res.ok) {
            setRebuildLog((prev) => [...prev, `✗ Create ${slug} — ${data.error}`]);
          } else {
            setRebuildLog((prev) => [...prev, `✓ Created: ${slug} → ${data.devtoUrl}`]);
          }
        } catch {
          setRebuildLog((prev) => [...prev, `✗ Create ${slug} — Network error`]);
        }
      }

      setRebuildLog((prev) => [
        ...prev,
        abortRef.current ? "Stopped." : "Done! Refresh the page to update devtoUrl links.",
      ]);
    } catch {
      setRebuildLog((prev) => [...prev, "Request failed."]);
    } finally {
      setRebuilding(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-outline-variant/10 bg-surface-low p-4 text-center">
          <div className="text-2xl font-mono text-on-surface">
            {published.length}
          </div>
          <div className="text-xs text-on-surface-variant">Published</div>
        </div>
        <div className="rounded-xl border border-primary/20 bg-surface-low p-4 text-center">
          <div className="text-2xl font-mono text-primary">
            {syndicated.length}
          </div>
          <div className="text-xs text-on-surface-variant">On Dev.to</div>
        </div>
        <div className="rounded-xl border border-outline-variant/10 bg-surface-low p-4 text-center">
          <div className="text-2xl font-mono text-on-surface">
            {unsyndicated.length}
          </div>
          <div className="text-xs text-on-surface-variant">Not syndicated</div>
        </div>
      </div>

      {/* Unsyndicated posts — selectable */}
      {unsyndicated.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-mono text-sm text-on-surface">
              Ready to syndicate
            </h2>
            <div className="flex gap-2">
              <button
                onClick={selectAll}
                className="rounded border border-outline-variant px-3 py-1 font-mono text-xs text-on-surface-variant hover:border-primary/30 hover:text-primary"
              >
                Select All
              </button>
              <button
                onClick={selectNone}
                className="rounded border border-outline-variant px-3 py-1 font-mono text-xs text-on-surface-variant hover:border-primary/30 hover:text-primary"
              >
                Select None
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {unsyndicated.map((post) => (
              <label
                key={post.slug}
                className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                  selected.has(post.slug)
                    ? "border-primary/30 bg-primary/5"
                    : "border-outline-variant/10 bg-surface-low hover:border-outline-variant/30"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected.has(post.slug)}
                  onChange={() => toggleSelect(post.slug)}
                  className="accent-primary"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-sm text-on-surface truncate">
                    {post.title}
                  </div>
                  <div className="text-xs text-on-surface-variant">
                    {post.date} · {post.tags.slice(0, 4).join(", ")}
                  </div>
                </div>
              </label>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-4">
            <button
              onClick={handleBulkSyndicate}
              disabled={syndicating || selected.size === 0}
              className="rounded-lg border border-primary/30 bg-primary/10 px-6 py-2 font-mono text-sm text-primary transition-colors hover:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {syndicating
                ? "Syndicating…"
                : `Publish ${selected.size} to Dev.to`}
            </button>
            {syndicating && (
              <button
                onClick={() => {
                  abortRef.current = true;
                }}
                className="rounded border border-red-400/30 px-4 py-2 font-mono text-xs text-red-400 hover:bg-red-400/10"
              >
                Stop
              </button>
            )}
            {progress && (
              <span className="font-mono text-xs text-on-surface-variant">
                {progress}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Syndication results */}
      {results.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-mono text-sm text-on-surface">Results</h2>
          {results.map((r, i) => (
            <div
              key={r.slug || i}
              className={`rounded-lg border p-3 font-mono text-xs ${
                r.status === "published"
                  ? "border-green-400/30 text-green-400"
                  : r.status === "skipped"
                    ? "border-yellow-400/30 text-yellow-400"
                    : "border-red-400/30 text-red-400"
              }`}
            >
              <span className="uppercase">[{r.status}]</span> {r.title}
              {r.devtoUrl && (
                <>
                  {" — "}
                  <a
                    href={r.devtoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:no-underline"
                  >
                    {r.devtoUrl}
                  </a>
                </>
              )}
              {r.error && r.status === "error" && <> — {r.error}</>}
            </div>
          ))}
        </div>
      )}

      {/* Already syndicated */}
      {syndicated.length > 0 && (
        <div>
          <h2 className="font-mono text-sm text-on-surface mb-4">
            Already on Dev.to
          </h2>
          <div className="space-y-2">
            {syndicated.map((post) => (
              <div
                key={post.slug}
                className="flex items-center gap-3 rounded-lg border border-outline-variant/10 bg-surface-low p-3"
              >
                <span className="text-primary">✓</span>
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-sm text-on-surface truncate">
                    {post.title}
                  </div>
                  <a
                    href={post.devtoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-on-surface-variant underline hover:text-primary"
                  >
                    {post.devtoUrl}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {unsyndicated.length === 0 && (
        <div className="rounded-xl border border-primary/20 bg-surface-low p-8 text-center">
          <div className="text-2xl mb-2">✓</div>
          <div className="font-mono text-sm text-primary">
            All published posts are syndicated
          </div>
        </div>
      )}

      {/* Maintenance tools */}
      <div>
        <h2 className="font-mono text-sm text-on-surface mb-4">Maintenance</h2>
        <div className="flex items-center gap-4">
          <button
            onClick={handleRebuild}
            disabled={rebuilding}
            className="rounded border border-red-400/30 px-4 py-2 font-mono text-xs text-red-400 transition-colors hover:bg-red-400/10 disabled:opacity-50"
          >
            {rebuilding ? "Rebuilding…" : "Rebuild All on Dev.to"}
          </button>
          {rebuilding && (
            <button
              onClick={() => {
                abortRef.current = true;
              }}
              className="rounded border border-red-400/30 px-4 py-2 font-mono text-xs text-red-400 hover:bg-red-400/10"
            >
              Stop
            </button>
          )}
        </div>
        <p className="mt-2 text-xs text-outline">
          Deletes all Dev.to articles and recreates them with correct publish
          dates. Takes ~12 min for 12 articles. New URLs will be generated.
        </p>
        {rebuildLog.length > 0 && (
          <div className="mt-3 space-y-1">
            {rebuildLog.map((line, i) => (
              <div key={i} className="font-mono text-xs text-on-surface-variant">
                {line}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
