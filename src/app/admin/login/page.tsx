"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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
        router.push("/admin");
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
        className="w-full max-w-sm rounded-xl border border-[#1F1F1F] bg-[#111111] p-8"
      >
        <h1 className="font-mono text-xs uppercase tracking-widest text-[#A3E635] mb-6">
          // Admin Access
        </h1>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full rounded-lg border border-[#1F1F1F] bg-[#0A0A0A] px-4 py-3 font-mono text-sm text-[#EDEDED] placeholder-[#555555] outline-none transition-colors focus:border-[#A3E635]/50"
          autoFocus
        />

        {error && (
          <p className="mt-3 font-mono text-xs text-red-400">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-4 w-full rounded-lg bg-[#A3E635] px-4 py-3 font-mono text-sm font-medium text-[#0A0A0A] transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "..." : "Enter"}
        </button>
      </form>
    </div>
  );
}
