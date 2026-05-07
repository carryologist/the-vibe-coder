"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { PostCard } from "@/components/PostCard";
import { FilterBar, type ActiveFilter } from "@/components/FilterBar";
import type { Post } from "@/lib/types";

/* ── Types ─────────────────────────────────────────────────────────── */

interface PostListWithFiltersProps {
  posts: Post[];
  allTags: string[];
  isAdmin: boolean;
}

/* ── Component ─────────────────────────────────────────────────────── */

export function PostListWithFilters({
  posts,
  allTags,
  isAdmin,
}: PostListWithFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  /* Read initial state from URL */
  const initialFilter = (searchParams.get("filter") ?? "*") as ActiveFilter;
  const initialTag = searchParams.get("tag") ?? "*";
  const initialSort =
    searchParams.get("sort") === "oldest" ? "oldest" : "newest";

  const [activeFilter, setActiveFilter] =
    useState<ActiveFilter>(initialFilter);
  const [activeTag, setActiveTag] = useState<string>(initialTag);
  const [sortDir, setSortDir] = useState<"newest" | "oldest">(initialSort);

  /* Sync state → URL (shallow, no server re-fetch) */
  const syncUrl = useCallback(
    (filter: ActiveFilter, tag: string, sort: "newest" | "oldest") => {
      const params = new URLSearchParams();
      if (filter !== "*") params.set("filter", filter);
      if (tag !== "*") params.set("tag", tag);
      if (sort !== "newest") params.set("sort", sort);
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : "/", { scroll: false });
    },
    [router],
  );

  const handleFilterChange = useCallback(
    (filter: ActiveFilter) => {
      setActiveFilter(filter);
      syncUrl(filter, activeTag, sortDir);
    },
    [activeTag, sortDir, syncUrl],
  );

  const handleTagChange = useCallback(
    (tag: string) => {
      setActiveTag(tag);
      syncUrl(activeFilter, tag, sortDir);
    },
    [activeFilter, sortDir, syncUrl],
  );

  const handleSortChange = useCallback(
    (dir: "newest" | "oldest") => {
      setSortDir(dir);
      syncUrl(activeFilter, activeTag, dir);
    },
    [activeFilter, activeTag, syncUrl],
  );

  /* Filter + sort */
  const filtered = useMemo(() => {
    let subset = posts;

    // Content-type filter
    if (activeFilter === "how-to" || activeFilter === "opinion") {
      subset = subset.filter((p) => p.type === activeFilter);
    }

    // Tag filter (from expanded tag row)
    if (activeTag !== "*") {
      subset = subset.filter((p) => p.tags.includes(activeTag));
    }

    // Sort
    if (activeFilter === "popular") {
      const COMMENT_WEIGHT = 20;
      const scored = subset.map((p) => ({
        post: p,
        score: (p.viewCount ?? 0) + (p.commentCount ?? 0) * COMMENT_WEIGHT,
      }));
      scored.sort((a, b) => b.score - a.score);
      return scored.slice(0, 5).map((s) => s.post);
    }
    return sortDir === "newest" ? subset : [...subset].reverse();
  }, [posts, activeFilter, activeTag, sortDir]);

  /* Reset handler */
  const handleReset = useCallback(() => {
    setActiveFilter("*");
    setActiveTag("*");
    setSortDir("newest");
    syncUrl("*", "*", "newest");
  }, [syncUrl]);

  return (
    <>
      <FilterBar
        allTags={allTags}
        activeFilter={activeFilter}
        activeTag={activeTag}
        sortDir={sortDir}
        onFilterChange={handleFilterChange}
        onTagChange={handleTagChange}
        onSortChange={handleSortChange}
      />

      {filtered.length === 0 ? (
        <p
          className="text-sm text-on-surface-variant"
          style={{ fontFamily: "var(--font-label)" }}
        >
          No posts match.{" "}
          <button
            onClick={handleReset}
            className="text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary cursor-pointer"
          >
            Try [*] to reset.
          </button>
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          <AnimatePresence mode="popLayout" initial={false}>
            {filtered.map((post, i) => (
              <motion.div
                key={post.slug}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  transition: {
                    duration: 0.35,
                    delay: i * 0.03,
                    ease: [0.21, 0.47, 0.32, 0.98],
                  },
                }}
                exit={{
                  opacity: 0,
                  y: -10,
                  transition: { duration: 0.2 },
                }}
              >
                <PostCard post={post} isAdmin={isAdmin} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </>
  );
}
