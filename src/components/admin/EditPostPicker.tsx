"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface EditPostPickerProps {
  posts: { slug: string; title: string; date: string }[];
}

export default function EditPostPicker({ posts }: EditPostPickerProps) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = posts.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase()),
  );

  const handleSelect = useCallback((slug: string) => {
    window.location.href = `/admin/record?edit=${slug}`;
  }, []);

  // Close dropdown on outside click.
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const showDropdown = open || search.length > 0;

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder="Search posts to edit…"
        className="w-full rounded-lg border border-outline-variant bg-bg px-3 py-2 font-mono text-sm text-on-surface outline-none transition-colors focus:border-primary/50 placeholder-outline"
      />

      {showDropdown && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border border-outline-variant/20 bg-surface-low shadow-lg">
          <div className="max-h-64 overflow-y-auto">
            {filtered.length === 0 && search.length > 0 ? (
              <p className="px-3 py-2 text-sm text-on-surface-variant">
                No posts match &ldquo;{search}&rdquo;
              </p>
            ) : (
              filtered.map((post) => (
                <button
                  key={post.slug}
                  type="button"
                  onPointerDown={() => handleSelect(post.slug)}
                  className="block w-full cursor-pointer px-3 py-2 text-left transition-colors hover:bg-surface-high"
                >
                  <span className="block text-sm text-on-surface">
                    {post.title}
                  </span>
                  <span className="block text-[11px] text-on-surface-variant">
                    {formatDate(post.date)}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
