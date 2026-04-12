import type { Metadata } from "next";
import { AnimateIn } from "@/components/AnimateIn";

export const metadata: Metadata = {
  title: "About",
  description: "About Vibes Coder — a blog on software development and AI-assisted coding.",
};

export default function AboutPage() {
  return (
    <AnimateIn>
      <div className="prose">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl text-[#EDEDED]">
          About
        </h1>

        <p className="mt-6 text-[#CCCCCC] leading-relaxed">
          This is a place for unfiltered thoughts on software development, system
          design, and the evolving craft of building software in the age of AI. No
          corporate polish — just honest perspectives on the tools, patterns, and
          ideas that shape how we write code today.
        </p>

        <p className="text-[#CCCCCC] leading-relaxed">
          The writing here explores what it means to work alongside AI — using
          large language models not as a crutch, but as a thinking partner. From
          architecture decisions to debugging sessions, from shipping fast to
          building things that last.
        </p>

        <p className="text-[#CCCCCC] leading-relaxed">
          All content on this blog is AI-assisted. Posts are drafted with Claude
          and Gemini, then reviewed and shaped for clarity. The ideas are human;
          the drafting is a collaboration.
        </p>

        <h2 className="text-xl font-semibold tracking-tight text-[#EDEDED] mt-10">
          The Setup
        </h2>

        <p className="text-[#CCCCCC] leading-relaxed">
          This site is built with Next.js and Tailwind CSS, deployed on Vercel,
          and developed entirely inside{" "}
          <a
            href="https://coder.com"
            className="text-[#A3E635] underline decoration-[#A3E635]/30 underline-offset-2 transition-colors hover:decoration-[#A3E635]"
            target="_blank"
            rel="noopener noreferrer"
          >
            Coder
          </a>
          {" "} — cloud development environments that run in your infrastructure.
          Every post, every style change, every deployment happens from a Coder
          workspace. Dogfooding at its finest.
        </p>

        <p className="text-[#CCCCCC] leading-relaxed">
          If you find something useful here, that&apos;s the whole point.
        </p>
      </div>
    </AnimateIn>
  );
}
