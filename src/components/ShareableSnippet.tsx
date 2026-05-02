"use client";

import { useRef, useCallback, type ReactNode } from "react";
import { ShareButton } from "@/components/ShareButton";

interface ShareableSnippetProps {
  type: "table" | "code";
  language?: string;
  title: string;
  slug: string;
  children: ReactNode;
}

export function ShareableSnippet({
  type,
  language,
  title,
  slug,
  children,
}: ShareableSnippetProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const getContent = useCallback((): string => {
    const el = containerRef.current;
    if (!el) return "";

    if (type === "code") {
      const codeEl = el.querySelector("pre code") || el.querySelector("pre");
      return codeEl?.textContent || "";
    }

    // Extract table as markdown from the rendered DOM
    const table = el.querySelector("table");
    if (!table) return "";

    const rows: string[][] = [];
    table.querySelectorAll("tr").forEach((tr) => {
      const cells: string[] = [];
      tr.querySelectorAll("th, td").forEach((cell) => {
        cells.push(cell.textContent?.trim() || "");
      });
      if (cells.length > 0) rows.push(cells);
    });

    if (rows.length === 0) return "";

    const lines: string[] = [];
    lines.push("| " + rows[0].join(" | ") + " |");
    lines.push("| " + rows[0].map(() => "---").join(" | ") + " |");
    for (let i = 1; i < rows.length; i++) {
      lines.push("| " + rows[i].join(" | ") + " |");
    }
    return lines.join("\n");
  }, [type]);

  return (
    <div ref={containerRef} className="group/share relative">
      {children}
      <div className="absolute right-2 top-2 opacity-60 md:opacity-0 transition-opacity md:group-hover/share:opacity-100">
        <ShareButton
          type={type}
          getContent={getContent}
          language={language}
          title={title}
          slug={slug}
        />
      </div>
    </div>
  );
}
