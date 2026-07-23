"use client";

import { useState } from "react";

interface LaunchAgentButtonProps {
  text: string;
}

type Status = "idle" | "loading" | "success" | "error";

/**
 * Fires a Coder Agents chat pre-prompted to tackle this specific backlog
 * item, via POST /api/todo/launch-agent (which in turn calls Coder's
 * experimental Chats API). This is a real, billable agent workspace —
 * clicking launches it immediately, no confirmation dialog, since this
 * page already sits behind the admin session gate.
 */
export default function LaunchAgentButton({ text }: LaunchAgentButtonProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [chatUrl, setChatUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch("/api/todo/launch-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || `Request failed (${res.status})`);
      }
      setChatUrl(data.chatUrl ?? null);
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to launch agent");
      setStatus("error");
    }
  }

  if (status === "success") {
    return chatUrl ? (
      <a
        href={chatUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 whitespace-nowrap rounded border border-primary/40 px-2 py-1 font-mono text-[11px] text-primary underline underline-offset-2 hover:text-primary/80"
      >
        view chat ↗
      </a>
    ) : (
      <span className="shrink-0 whitespace-nowrap font-mono text-[11px] text-on-surface-variant">
        launched ✓
      </span>
    );
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={status === "loading"}
        className="whitespace-nowrap rounded border border-primary/40 px-2 py-1 font-mono text-[11px] text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {status === "loading" ? "launching…" : "🚀 launch agent"}
      </button>
      {status === "error" && error && (
        <span className="max-w-[16rem] text-right font-mono text-[10px] text-red-500">
          {error}
        </span>
      )}
    </div>
  );
}
