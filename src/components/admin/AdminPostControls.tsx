"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface AdminPostControlsProps {
  slug: string;
}

export function AdminPostControls({ slug }: AdminPostControlsProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this post? This cannot be undone.")) return;

    setDeleting(true);
    try {
      const res = await fetch("/api/posts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      if (!res.ok) throw new Error("Delete failed");
      router.push("/");
    } catch (err) {
      console.error("Delete error:", err);
      setDeleting(false);
    }
  }

  return (
    <div className="mb-6 flex items-center gap-3 rounded-lg border border-outline-variant bg-bg px-4 py-3">
      <span className="font-mono text-xs text-outline">// admin</span>
      <Link
        href={`/admin/record?edit=${slug}`}
        className="rounded border border-outline-variant px-3 py-1.5 font-mono text-xs text-on-surface-variant transition-colors hover:border-primary/30 hover:text-primary"
      >
        Edit Post
      </Link>
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="rounded border border-outline-variant px-3 py-1.5 font-mono text-xs text-on-surface-variant transition-colors hover:border-red-400/30 hover:text-red-400 disabled:opacity-50"
      >
        {deleting ? "Deleting…" : "Delete Post"}
      </button>
    </div>
  );
}
