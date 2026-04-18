"use client";

import { useEffect, useState } from "react";
import Giscus from "@giscus/react";

export function GiscusComments() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    // Read the current theme from the document attribute.
    const current = document.documentElement.getAttribute("data-theme");
    if (current === "light" || current === "dark") setTheme(current);

    // Watch for theme changes so comments stay in sync.
    const observer = new MutationObserver(() => {
      const next = document.documentElement.getAttribute("data-theme");
      if (next === "light" || next === "dark") setTheme(next);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => observer.disconnect();
  }, []);

  return (
    <section className="mt-16 border-t border-outline-variant/20 pt-10">
      <h2
        className="mb-6 text-xs uppercase tracking-widest text-on-surface-variant/50"
        style={{ fontFamily: "var(--font-label)" }}
      >
        Comments
      </h2>
      <Giscus
        repo="carryologist/the-vibe-coder"
        repoId="R_kgDOSANU3Q"
        category="General"
        categoryId=""
        mapping="pathname"
        strict="0"
        reactionsEnabled="1"
        emitMetadata="0"
        inputPosition="top"
        theme={theme === "dark" ? "dark_dimmed" : "light"}
        lang="en"
        loading="lazy"
      />
    </section>
  );
}
