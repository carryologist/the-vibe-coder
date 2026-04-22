import type { Metadata } from "next";
import Image from "next/image";
import { AnimateIn } from "@/components/AnimateIn";

export const metadata: Metadata = {
  title: "About",
  description: "About Vibes Coder — a blog on software development and AI-assisted coding.",
};

export default function AboutPage() {
  return (
    <AnimateIn>
      <div className="prose">
        <h1
          className="text-3xl font-bold tracking-tight sm:text-4xl text-on-surface"
          style={{ fontFamily: "var(--font-headline)" }}
        >
          About
        </h1>

        <div className="mt-8 flex flex-col sm:flex-row gap-8 items-start">
          <Image
            src="/images/IMG_9133.jpeg"
            alt="Rob Whiteley"
            width={180}
            height={180}
            className="rounded-xl border border-outline-variant/20 flex-shrink-0"
          />
          <div>
            <p className="text-on-surface-variant leading-relaxed mt-0">
              I&apos;m Rob Whiteley, CEO of{" "}
              <a
                href="https://coder.com"
                className="text-primary underline decoration-primary/30 underline-offset-2 transition-colors hover:decoration-primary"
                target="_blank"
                rel="noopener noreferrer"
              >
                Coder
              </a>
              .
            </p>
            <p className="text-on-surface-variant leading-relaxed">
              By day I run a company that builds cloud development environments.
              By night — and occasionally from a cabana — I build things with the
              same tools our customers use.
            </p>
          </div>
        </div>

        <p className="text-on-surface-variant leading-relaxed">
          This site is a live experiment in AI-assisted development. Every page,
          every feature, every deploy has been built through conversation — me
          talking, AI writing code, Coder running it. No local IDE. No manual
          git. Just voice memos, Claude, and a cloud workspace I can reach from
          my phone.
        </p>

        <p className="text-on-surface-variant leading-relaxed">
          The blog documents the build itself: what shipped each session, what
          broke, what surprised me, and what I learned about working with AI as
          a genuine development partner rather than a fancy autocomplete. If
          you&apos;re curious what &quot;vibe coding&quot; actually looks like
          when you push it past a weekend toy project, this is the journal.
        </p>

        <h2
          className="text-xl font-semibold tracking-tight text-on-surface mt-10"
          style={{ fontFamily: "var(--font-headline)" }}
        >
          The Setup
        </h2>

        <p className="text-on-surface-variant leading-relaxed">
          This site is built with Next.js and Tailwind CSS, deployed on Vercel,
          and developed entirely inside{" "}
          <a
            href="https://coder.com"
            className="text-primary underline decoration-primary/30 underline-offset-2 transition-colors hover:decoration-primary"
            target="_blank"
            rel="noopener noreferrer"
          >
            Coder
          </a>
          {" "} — cloud development environments that run in your infrastructure.
          Every post, every style change, every deployment happens from a Coder
          workspace. Dogfooding at its finest.
        </p>

        <p className="text-on-surface-variant leading-relaxed">
          If you find something useful here, that&apos;s the whole point.
        </p>
      </div>
    </AnimateIn>
  );
}
