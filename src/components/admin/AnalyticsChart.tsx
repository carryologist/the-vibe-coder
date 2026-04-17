"use client";

import { useEffect, useState } from "react";

interface DayData {
  date: string;
  views: number;
}

interface PageData {
  path: string;
  views: number;
}

interface AnalyticsSummary {
  configured: boolean;
  message?: string;
  totalViews?: number;
  days?: DayData[];
  topPages?: PageData[];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function AnalyticsChart() {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics/summary")
      .then((r) => r.json())
      .then(setData)
      .catch(() =>
        setData({ configured: false, message: "Failed to load analytics." }),
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-outline-variant/10 bg-surface-low p-6">
        <h2 className="font-mono text-xs uppercase tracking-widest text-primary mb-4">
          // Analytics
        </h2>
        <div className="flex h-40 items-center justify-center">
          <span className="font-mono text-xs text-on-surface-variant animate-pulse">
            Loading analytics...
          </span>
        </div>
      </div>
    );
  }

  if (!data || !data.configured) {
    return (
      <div className="rounded-xl border border-outline-variant/10 bg-surface-low p-6">
        <h2 className="font-mono text-xs uppercase tracking-widest text-primary mb-4">
          // Analytics
        </h2>
        <div className="rounded-lg border border-outline-variant/10 bg-surface p-4">
          <p className="font-mono text-xs text-on-surface-variant">
            {data?.message || "Analytics not configured."}
          </p>
          <p className="mt-2 font-mono text-xs text-outline">
            Add <code className="text-primary">KV_REST_API_URL</code> and{" "}
            <code className="text-primary">KV_REST_API_TOKEN</code> environment
            variables to enable page view tracking.
          </p>
        </div>
      </div>
    );
  }

  const days = data.days || [];
  const topPages = data.topPages || [];
  const maxViews = Math.max(...days.map((d) => d.views), 1);

  return (
    <div className="rounded-xl border border-outline-variant/10 bg-surface-low p-6">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="font-mono text-xs uppercase tracking-widest text-primary">
          // Analytics
        </h2>
        <span className="font-mono text-xs text-on-surface-variant">
          <span className="text-on-surface font-medium">
            {data.totalViews?.toLocaleString() || 0}
          </span>{" "}
          views (30d)
        </span>
      </div>

      {/* Bar chart */}
      <div className="rounded-lg border border-outline-variant/10 bg-surface p-4">
        <div className="flex items-end gap-[2px]" style={{ height: "160px" }}>
          {days.map((day, i) => {
            const heightPct = maxViews > 0 ? (day.views / maxViews) * 100 : 0;
            return (
              <div
                key={day.date}
                className="group relative flex flex-1 flex-col items-center justify-end h-full"
              >
                <div
                  className="w-full rounded-t-sm bg-primary/70 transition-colors hover:bg-primary min-h-[2px]"
                  style={{ height: `${Math.max(heightPct, 1)}%` }}
                  title={`${formatDate(day.date)}: ${day.views} views`}
                />
                {/* Show label every 5th bar */}
                {i % 5 === 0 && (
                  <span className="absolute -bottom-5 font-mono text-[9px] text-on-surface-variant whitespace-nowrap">
                    {formatDate(day.date)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        {/* Spacer for x-axis labels */}
        <div className="h-5" />
      </div>

      {/* Top pages */}
      {topPages.length > 0 && (
        <div className="mt-4">
          <h3 className="font-mono text-xs uppercase tracking-widest text-on-surface-variant mb-2">
            Top Pages Today
          </h3>
          <div className="space-y-1">
            {topPages.map((page) => (
              <div
                key={page.path}
                className="flex items-center justify-between rounded px-2 py-1 hover:bg-surface-high transition-colors"
              >
                <span className="font-mono text-xs text-on-surface truncate mr-4">
                  {page.path}
                </span>
                <span className="font-mono text-xs text-on-surface-variant shrink-0">
                  {page.views}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
