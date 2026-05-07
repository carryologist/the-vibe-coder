"use client";

import { useState } from "react";

interface PostInfo {
  slug: string;
  title: string;
  date: string;
  published: boolean;
  devtoUrl?: string;
  tags: string[];
}

interface BulkResult {
  slug: string;
  title: string;
  status: "published" | "skipped" | "error";
  devtoUrl?: string;
  error?: string;
}

interface SyndicationDashboardProps {
  posts: PostInfo[];
}

export default function SyndicationDashboard({
  posts,
}: SyndicationDashboardProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [syndicating, setSyndicating] = useState(false);
  const [results, setResults] = useState<BulkResult[] | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

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

  async function handleBulkSyndicate() {
    if (selected.size === 0) return;
    if (
      !confirm(
        `Publish ${selected.size} post${selected.size === 1 ? "" : "s"} to Dev.to? This will go live immediately.`
      )
    )
      return;

    setSyndicating(true);
    setResults(null);
    setProgress(`Syndicating ${selected.size} posts (≈${selected.size * 3}s)…`);

    try {
      const res = await fetch("/api/syndicate/devto/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slugs: Array.from(selected) }),
      });
      const data = await res.json();

      if (!res.ok) {
        setProgress(null);
        setResults([
          {
            slug: "",
            title: "Bulk syndication failed",
            status: "error",
            error: data.error,
          },
        ]);
        return;
      }

      setResults(data.results);
      setProgress(
        `Done: ${data.summary.published} published, ${data.summary.skipped} skipped, ${data.summary.errors} errors`
      );
      setSelected(new Set());
    } catch {
      setProgress(null);
      setResults([
        {
          slug: "",
          title: "Request failed",
          status: "error",
          error: "Network error",
        },
      ]);
    } finally {
      setSyndicating(false);
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
            {progress && (
              <span className="font-mono text-xs text-on-surface-variant">
                {progress}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Results */}
      {results && (
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
    </div>
  );
}
