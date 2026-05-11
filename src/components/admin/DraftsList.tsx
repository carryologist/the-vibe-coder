"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/format-date";

interface Draft {
  slug: string;
  title: string;
  date: string;
  description: string;
  tags: string[];
  publishAt?: string;
}

interface DraftsListProps {
  drafts: Draft[];
}

function relativeTime(dateStr: string): string {
  const target = new Date(dateStr);
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "today";
  if (diffDays === 1) return "tomorrow";
  if (diffDays === -1) return "yesterday";
  if (diffDays > 0) return `in ${diffDays}d`;
  return `${Math.abs(diffDays)}d ago`;
}

export function DraftsList({ drafts }: DraftsListProps) {
  const [publishingSlug, setPublishingSlug] = useState<string | null>(null);
  const [publishedSlugs, setPublishedSlugs] = useState<Set<string>>(
    new Set(),
  );
  const [error, setError] = useState("");

  async function handlePublish(slug: string) {
    setPublishingSlug(slug);
    setError("");

    try {
      // Fetch the raw MDX content
      const getRes = await fetch(`/api/posts?slug=${slug}`);
      if (!getRes.ok) throw new Error("Failed to load post");
      const data = await getRes.json();

      const today = new Date().toISOString().split("T")[0];
      let published = data.content.replace(
        /^published:\s*false\s*$/m,
        "published: true",
      );
      // Update the post date to the publish date
      published = published.replace(
        /^date:\s*'[^']*'/m,
        `date: '${today}'`,
      );
      // Remove publishAt if present (no longer needed)
      published = published.replace(/^publishAt:.*\n?/m, "");

      const putRes = await fetch("/api/posts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          content: published,
          summary: "Published draft",
        }),
      });
      if (!putRes.ok) throw new Error("Failed to publish");

      setPublishedSlugs((prev) => new Set([...prev, slug]));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to publish",
      );
    } finally {
      setPublishingSlug(null);
    }
  }

  const activeDrafts = drafts.filter((d) => !publishedSlugs.has(d.slug));
  const justPublished = drafts.filter((d) => publishedSlugs.has(d.slug));

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-2">
          <p className="font-mono text-xs text-red-400">{error}</p>
        </div>
      )}

      {activeDrafts.length === 0 && justPublished.length === 0 && (
        <div className="rounded-xl border border-outline-variant/10 bg-surface-low p-8 text-center">
          <p className="font-mono text-sm text-on-surface-variant">
            No drafts. All posts are published.
          </p>
          <Link
            href="/admin/record"
            className="mt-3 inline-block font-mono text-xs text-primary transition-colors hover:text-primary-container"
          >
            Record a new post →
          </Link>
        </div>
      )}

      {/* Just-published feedback */}
      {justPublished.length > 0 && (
        <div className="mb-6 space-y-2">
          {justPublished.map((draft) => (
            <div
              key={draft.slug}
              className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3"
            >
              <span className="font-mono text-xs text-primary">✓</span>
              <span className="font-mono text-sm text-on-surface">
                {draft.title}
              </span>
              <span className="font-mono text-[10px] text-primary">
                published — deploying
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Draft cards */}
      <div className="space-y-3">
        {activeDrafts.map((draft) => {
          const isPublishing = publishingSlug === draft.slug;
          const isScheduled = !!draft.publishAt;

          return (
            <div
              key={draft.slug}
              className="group rounded-xl border border-outline-variant/10 bg-surface-low p-5 transition-all duration-300 hover:border-primary/20 hover:bg-surface-high"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  {/* Title */}
                  <Link
                    href={`/admin/preview/${draft.slug}`}
                    className="block truncate font-mono text-sm font-medium text-on-surface transition-colors hover:text-primary mb-1"
                  >
                    {draft.title}
                  </Link>

                  {/* Description */}
                  <p className="mb-2 text-xs leading-relaxed text-on-surface-variant line-clamp-2">
                    {draft.description}
                  </p>

                  {/* Meta row */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-primary/15 px-1.5 py-0.5 font-mono text-[10px] text-primary">
                      draft
                    </span>
                    {isScheduled && (
                      <span className="rounded bg-secondary/15 px-1.5 py-0.5 font-mono text-[10px] text-secondary">
                        scheduled
                      </span>
                    )}
                    <span className="font-mono text-[11px] text-outline">
                      {formatDate(draft.date)}
                    </span>

                    {isScheduled && draft.publishAt && (
                      <span className="font-mono text-[11px] text-secondary">
                        publishes {formatDate(draft.publishAt)}{" "}
                        <span className="text-outline">
                          ({relativeTime(draft.publishAt)})
                        </span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    href={`/admin/edit/${draft.slug}`}
                    className="rounded-lg border border-outline-variant/20 px-3 py-1.5 font-mono text-[11px] text-on-surface-variant transition-colors hover:border-primary/30 hover:text-primary"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handlePublish(draft.slug)}
                    disabled={isPublishing || publishingSlug !== null}
                    className="rounded-lg border border-primary bg-primary/10 px-3 py-1.5 font-mono text-[11px] font-medium text-primary transition-all hover:bg-primary/20 disabled:opacity-50"
                  >
                    {isPublishing ? "Publishing…" : "Publish"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
