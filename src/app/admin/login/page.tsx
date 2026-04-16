"use client";

import { useState } from "react";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        // Hard navigation ensures the browser sends the freshly-set
        // session cookie and avoids stale RSC cache from soft nav.
        window.location.href = "/admin";
        return;
      } else {
        setError("Invalid password");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl border border-outline-variant/20 bg-surface-low p-8"
      >
        <h1 className="font-mono text-xs uppercase tracking-widest text-primary mb-3">
          // Admin Access
        </h1>
        <p className="text-xs text-on-surface-variant/60 mb-6">
          This area is for the site owner.{" "}
          <a href="/" className="text-primary/70 underline underline-offset-2 hover:text-primary">
            Back to the blog &rarr;
          </a>
        </p>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full rounded-lg border border-outline-variant bg-bg px-4 py-3 font-mono text-sm text-on-surface placeholder-outline outline-none transition-colors focus:border-primary/50"
          autoFocus
        />

        {error && (
          <p className="mt-3 font-mono text-xs text-red-400">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-4 w-full rounded-lg bg-primary px-4 py-3 font-mono text-sm font-medium text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "..." : "Enter"}
        </button>
      </form>
    </div>
  );
}
