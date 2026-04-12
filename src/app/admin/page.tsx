import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default function AdminDashboardPage() {
  return (
    <div>
      <h1 className="font-mono text-xs uppercase tracking-widest text-[#A3E635] mb-8">
        // Dashboard
      </h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/admin/record"
          className="group rounded-xl border border-[#1F1F1F] p-6 transition-all duration-300 hover:border-[#A3E635]/30 hover:bg-[#111111] hover:shadow-[0_0_20px_rgba(163,230,53,0.06)]"
        >
          <div className="mb-2 text-2xl">🎙️</div>
          <h2 className="font-mono text-sm font-medium text-[#EDEDED] group-hover:text-[#A3E635]">
            Record
          </h2>
          <p className="mt-1 text-xs text-[#888888]">
            Dictate your thoughts and generate a blog post.
          </p>
        </Link>

        <div className="rounded-xl border border-[#1F1F1F] p-6 opacity-50">
          <div className="mb-2 text-2xl">⚙️</div>
          <h2 className="font-mono text-sm font-medium text-[#888888]">
            Settings
          </h2>
          <p className="mt-1 text-xs text-[#555555]">
            Configure style prompt and preferences. (Coming soon)
          </p>
        </div>
      </div>
    </div>
  );
}
