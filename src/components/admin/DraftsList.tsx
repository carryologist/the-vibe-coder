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
  const [schedulingSlug, setSchedulingSlug] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [localSchedules, setLocalSchedules] = useState<Record<string, string | null>>({});

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

  async function handleSchedule(slug: string) {
    if (!scheduleDate) return;
    setSavingSchedule(true);
    setError("");

    try {
      // scheduleDate is now a datetime-local value (YYYY-MM-DDTHH:MM)
      const publishAt = `${scheduleDate}:00-04:00`;

      const getRes = await fetch(`/api/posts?slug=${slug}`);
      if (!getRes.ok) throw new Error("Failed to load post");
      const data = await getRes.json();

      let updated = data.content as string;
      // Add or update publishAt in frontmatter
      if (/^publishAt:/m.test(updated)) {
        updated = updated.replace(
          /^publishAt:.*$/m,
          `publishAt: '${publishAt}'`,
        );
      } else {
        // Insert after the published: line
        updated = updated.replace(
          /^(published:.*$)/m,
          `$1\npublishAt: '${publishAt}'`,
        );
      }

      const putRes = await fetch("/api/posts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          content: updated,
          summary: `Scheduled for ${scheduleDate}`,
        }),
      });
      if (!putRes.ok) throw new Error("Failed to save schedule");

      setLocalSchedules((prev) => ({ ...prev, [slug]: publishAt }));
      setSchedulingSlug(null);
      setScheduleDate("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to schedule",
      );
    } finally {
      setSavingSchedule(false);
    }
  }

  async function handleClearSchedule(slug: string) {
    setSavingSchedule(true);
    setError("");

    try {
      const getRes = await fetch(`/api/posts?slug=${slug}`);
      if (!getRes.ok) throw new Error("Failed to load post");
      const data = await getRes.json();

      const updated = (data.content as string).replace(
        /^publishAt:.*\n?/m,
        "",
      );

      const putRes = await fetch("/api/posts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          content: updated,
          summary: "Cleared scheduled publish date",
        }),
      });
      if (!putRes.ok) throw new Error("Failed to clear schedule");

      setLocalSchedules((prev) => ({ ...prev, [slug]: null }));
      setSchedulingSlug(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to clear schedule",
      );
    } finally {
      setSavingSchedule(false);
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
          const slug = draft.slug;
          const isPublishing = publishingSlug === slug;
          const effectivePublishAt =
            slug in localSchedules
              ? localSchedules[slug]
              : draft.publishAt;
          const isScheduled = !!effectivePublishAt;

          return (
            <div
              key={draft.slug}
              className="group rounded-xl border border-outline-variant/10 bg-surface-low p-5 transition-all duration-300 hover:border-primary/20 hover:bg-surface-high"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
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

                    {isScheduled && effectivePublishAt && (
                      <span className="font-mono text-[11px] text-secondary">
                        publishes {formatDate(effectivePublishAt)}{" "}
                        <span className="text-outline">
                          ({relativeTime(effectivePublishAt)})
                        </span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {schedulingSlug === slug ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="datetime-local"
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        min={new Date().toISOString().slice(0, 16)}
                        className="rounded-lg border border-outline-variant bg-bg px-2 py-1 font-mono text-[11px] text-on-surface outline-none focus:border-primary/50"
                      />
                      <button
                        onClick={() => handleSchedule(slug)}
                        disabled={!scheduleDate || savingSchedule}
                        className="rounded-lg border border-secondary bg-secondary/10 px-2 py-1.5 font-mono text-[11px] font-medium text-secondary transition-all hover:bg-secondary/20 disabled:opacity-50"
                      >
                        {savingSchedule ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={() => {
                          setSchedulingSlug(null);
                          setScheduleDate("");
                        }}
                        className="rounded-lg border border-outline-variant/20 px-2 py-1.5 font-mono text-[11px] text-on-surface-variant transition-colors hover:text-primary"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      {isScheduled ? (
                        <button
                          onClick={() => handleClearSchedule(slug)}
                          disabled={savingSchedule}
                          className="rounded-lg border border-outline-variant/20 px-3 py-1.5 font-mono text-[11px] text-on-surface-variant transition-colors hover:border-red-500/30 hover:text-red-400 disabled:opacity-50"
                        >
                          Unschedule
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setSchedulingSlug(slug);
                            // Default to tomorrow at 9 AM
                            const tomorrow = new Date();
                            tomorrow.setDate(tomorrow.getDate() + 1);
                            const d = tomorrow.toISOString().split("T")[0];
                            setScheduleDate(`${d}T09:00`);
                          }}
                          className="rounded-lg border border-outline-variant/20 px-3 py-1.5 font-mono text-[11px] text-on-surface-variant transition-colors hover:border-secondary/30 hover:text-secondary"
                        >
                          Schedule
                        </button>
                      )}
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
                        {isPublishing ? "Publishing..." : "Publish"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
