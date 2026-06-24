"use client";

import { useEffect } from "react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin page error:", error);
  }, [error]);

  return (
    <div className="py-16 text-center">
      <h1
        className="text-2xl font-bold text-on-surface"
        style={{ fontFamily: "var(--font-headline)" }}
      >
        Admin Error
      </h1>
      <p className="mt-2 text-sm text-on-surface-variant">
        Something went wrong loading this page.
      </p>
      {error.message && (
        <pre className="mt-4 mx-auto max-w-xl overflow-x-auto rounded-lg bg-surface-low p-4 text-left font-mono text-xs text-red-400">
          {error.message}
        </pre>
      )}
      <button
        onClick={() => reset()}
        className="mt-6 rounded-lg border border-primary bg-primary/10 px-4 py-2 font-mono text-xs font-medium text-primary transition-all hover:bg-primary/20"
      >
        Try again
      </button>
    </div>
  );
}
