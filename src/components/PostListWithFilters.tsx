"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { PostCard } from "@/components/PostCard";
import { FilterBar } from "@/components/FilterBar";
import type { Post } from "@/lib/types";

/* ── Types ─────────────────────────────────────────────────────────── */

interface PostListWithFiltersProps {
  posts: Post[];
  topTags: string[];
  allTags: string[];
  isAdmin: boolean;
}

/* ── Component ─────────────────────────────────────────────────────── */

export function PostListWithFilters({
  posts,
  topTags,
  allTags,
  isAdmin,
}: PostListWithFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  /* Read initial state from URL */
  const initialTag = searchParams.get("tag") ?? "*";
  const initialSort =
    searchParams.get("sort") === "oldest" ? "oldest" : "newest";

  const [activeTag, setActiveTag] = useState<string>(initialTag);
  const [sortDir, setSortDir] = useState<"newest" | "oldest">(initialSort);

  /* Sync state → URL (shallow, no server re-fetch) */
  const syncUrl = useCallback(
    (tag: string, sort: "newest" | "oldest") => {
      const params = new URLSearchParams();
      if (tag !== "*") params.set("tag", tag);
      if (sort !== "newest") params.set("sort", sort);
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : "/", { scroll: false });
    },
    [router],
  );

  const handleTagChange = useCallback(
    (tag: string) => {
      setActiveTag(tag);
      syncUrl(tag, sortDir);
    },
    [sortDir, syncUrl],
  );

  const handleSortChange = useCallback(
    (dir: "newest" | "oldest") => {
      setSortDir(dir);
      syncUrl(activeTag, dir);
    },
    [activeTag, syncUrl],
  );

  /* Filter + sort */
  const filtered = useMemo(() => {
    const subset =
      activeTag === "*"
        ? posts
        : posts.filter((p) => p.tags.includes(activeTag));

    return sortDir === "newest" ? subset : [...subset].reverse();
  }, [posts, activeTag, sortDir]);

  return (
    <>
      <FilterBar
        topTags={topTags}
        allTags={allTags}
        activeTag={activeTag}
        sortDir={sortDir}
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
            onClick={() => handleTagChange("*")}
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
