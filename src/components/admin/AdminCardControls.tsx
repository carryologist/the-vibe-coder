"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { setFrontmatterField } from "@/lib/frontmatter";

interface AdminCardControlsProps {
  slug: string;
}

export function AdminCardControls({ slug }: AdminCardControlsProps) {
  const router = useRouter();
  const [unpublishing, setUnpublishing] = useState(false);

  async function handleUnpublish(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (
      !confirm(
        "Unpublish this post? It will disappear from the public site until republished. The file itself is not deleted.",
      )
    )
      return;

    setUnpublishing(true);
    try {
      const getRes = await fetch(`/api/posts?slug=${slug}`);
      if (!getRes.ok) throw new Error("Failed to load post");
      const data = await getRes.json();

      const updated = setFrontmatterField(
        data.content as string,
        "published",
        "false",
      );

      const putRes = await fetch("/api/posts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          content: updated,
          summary: "Unpublished post",
        }),
      });
      if (!putRes.ok) throw new Error("Unpublish failed");
      router.refresh();
    } catch (err) {
      console.error("Unpublish error:", err);
      setUnpublishing(false);
    }
  }

  return (
    <div
      className="flex items-center gap-2"
      onClick={(e) => e.stopPropagation()}
    >
      <Link
        href={`/admin/record?edit=${slug}`}
        className="rounded border border-outline-variant px-2 py-1 font-mono text-xs text-on-surface-variant transition-colors hover:border-primary/30 hover:text-primary"
      >
        Edit
      </Link>
      <button
        onClick={handleUnpublish}
        disabled={unpublishing}
        className="rounded border border-outline-variant px-2 py-1 font-mono text-xs text-on-surface-variant transition-colors hover:border-amber-400/30 hover:text-amber-400 disabled:opacity-50"
      >
        {unpublishing ? "…" : "Unpublish"}
      </button>
    </div>
  );
}
