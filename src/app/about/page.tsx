import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description: "About Vibes Coder blog.",
};

export default function AboutPage() {
  return (
    <div className="prose dark:prose-invert">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        About Vibes Coder
      </h1>

      <p className="mt-6 text-neutral-700 dark:text-neutral-300 leading-relaxed">
        This blog is a place for thoughts on software development, system
        design, and the evolving craft of building software in the age of AI. It
        covers the tools, patterns, and ideas that shape how we write code
        today.
      </p>

      <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed">
        The writing here explores what it means to work alongside AI — using
        large language models not as a crutch, but as a collaborator. From
        architecture decisions to debugging sessions, the goal is to share
        honest, practical perspectives on modern development.
      </p>

      <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed">
        All content on this blog is AI-assisted. Posts are written with the help
        of Claude and Gemini, then reviewed and edited for accuracy and clarity.
        The ideas are human; the drafting is a partnership.
      </p>

      <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed">
        If you find something useful here, that&apos;s the whole point.
      </p>
    </div>
  );
}
