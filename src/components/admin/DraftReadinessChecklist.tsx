"use client";

import { useMemo } from "react";
import { analyzeDraft, type DraftIssue } from "@/lib/draft-readiness";

/**
 * Lightweight Draft Readiness checklist that analyzes the live MDX in the
 * admin preview/edit flows. It re-runs on every keystroke via useMemo and
 * surfaces common draft problems before a draft is saved or published.
 *
 * It is advisory only — it never blocks save/publish — but makes serious
 * (severity "error") issues visually obvious.
 */
export function DraftReadinessChecklist({
  mdx,
  slug,
}: {
  mdx: string;
  slug: string;
}) {
  const report = useMemo(() => analyzeDraft(mdx, slug), [mdx, slug]);

  if (report.ok) {
    return (
      <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
        <p className="font-mono text-[11px] text-primary">
          ✓ Draft readiness: no issues
        </p>
      </div>
    );
  }

  const errors = report.issues.filter((i) => i.severity === "error");
  const warnings = report.issues.filter((i) => i.severity === "warning");

  return (
    <div className="rounded-lg border border-tertiary/30 bg-tertiary/5 px-3 py-2.5">
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <span className="font-mono text-[11px] uppercase tracking-widest text-tertiary">
          Draft readiness
        </span>
        <span className="rounded bg-tertiary/15 px-1.5 py-0.5 font-mono text-[10px] font-medium text-tertiary">
          {report.errorCount} issue{report.errorCount === 1 ? "" : "s"}
          {report.warningCount > 0 &&
            ` · ${report.warningCount} warning${report.warningCount === 1 ? "" : "s"}`}
        </span>
        <span className="ml-auto font-mono text-[10px] text-on-surface-variant/60">
          review before save/publish
        </span>
      </div>

      <ul className="flex flex-col gap-1">
        {errors.map((issue) => (
          <ReadinessRow key={issue.id} issue={issue} />
        ))}
        {warnings.map((issue) => (
          <ReadinessRow key={issue.id} issue={issue} muted />
        ))}
      </ul>
    </div>
  );
}

function ReadinessRow({
  issue,
  muted = false,
}: {
  issue: DraftIssue;
  muted?: boolean;
}) {
  return (
    <li className="flex items-start gap-2 font-mono text-[11px] leading-snug">
      <span
        className={muted ? "mt-px text-secondary" : "mt-px text-tertiary"}
        aria-hidden="true"
      >
        {muted ? "●" : "◉"}
      </span>
      <span className={muted ? "text-on-surface-variant/80" : "text-on-surface"}>
        {issue.message}
      </span>
    </li>
  );
}
