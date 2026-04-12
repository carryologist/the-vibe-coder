"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface AdminCardControlsProps {
  slug: string;
}

export function AdminCardControls({ slug }: AdminCardControlsProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this post? This cannot be undone.")) return;

    setDeleting(true);
    try {
      const res = await fetch("/api/posts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      if (!res.ok) throw new Error("Delete failed");
      router.refresh();
    } catch (err) {
      console.error("Delete error:", err);
      setDeleting(false);
    }
  }

  return (
    <div
      className="flex items-center gap-2"
      onClick={(e) => e.stopPropagation()}
    >
      <Link
        href={`/admin/record?edit=${slug}`}
        className="rounded border border-[#1F1F1F] px-2 py-1 font-mono text-xs text-[#888888] transition-colors hover:border-[#A3E635]/30 hover:text-[#A3E635]"
      >
        Edit
      </Link>
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="rounded border border-[#1F1F1F] px-2 py-1 font-mono text-xs text-[#888888] transition-colors hover:border-red-400/30 hover:text-red-400 disabled:opacity-50"
      >
        {deleting ? "…" : "Delete"}
      </button>
    </div>
  );
}
