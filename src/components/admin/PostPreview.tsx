"use client";

import { useState } from "react";

interface PostPreviewProps {
  mdx: string;
  onMdxChange: (value: string) => void;
  onPublish: (slug: string) => void;
  publishing: boolean;
}

export function PostPreview({
  mdx,
  onMdxChange,
  onPublish,
  publishing,
}: PostPreviewProps) {
  const [slug, setSlug] = useState(() => {
    const titleMatch = mdx.match(/title:\s*"([^"]+)"/);
    if (titleMatch) {
      return titleMatch[1]
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    }
    return `post-${Date.now()}`;
  });

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-mono text-xs uppercase tracking-widest text-[#A3E635]">
        // Generated Post
      </h2>

      <textarea
        value={mdx}
        onChange={(e) => onMdxChange(e.target.value)}
        rows={24}
        className="w-full resize-y rounded-xl border border-[#1F1F1F] bg-[#0A0A0A] px-4 py-3 font-mono text-xs leading-relaxed text-[#EDEDED] outline-none transition-colors focus:border-[#A3E635]/50"
      />

      <div className="flex items-end gap-4">
        <div className="flex flex-col gap-1">
          <label className="font-mono text-[11px] text-[#888888]">Slug</label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="rounded-lg border border-[#1F1F1F] bg-[#0A0A0A] px-3 py-2 font-mono text-sm text-[#EDEDED] outline-none transition-colors focus:border-[#A3E635]/50"
          />
        </div>

        <button
          onClick={() => onPublish(slug)}
          disabled={publishing || !mdx.trim() || !slug.trim()}
          className="rounded-lg bg-[#A3E635] px-6 py-2.5 font-mono text-sm font-medium text-[#0A0A0A] transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {publishing ? "Publishing..." : "Publish to GitHub"}
        </button>
      </div>
    </div>
  );
}
