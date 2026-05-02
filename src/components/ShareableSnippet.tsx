"use client";

import { useRef, type ReactNode } from "react";
import { ShareButton } from "@/components/ShareButton";

interface ShareableSnippetProps {
  type: "table" | "code";
  language?: string;
  title: string;
  slug: string;
  children: ReactNode;
}

interface ReactNodeWithProps {
  type: string | ((...args: unknown[]) => unknown);
  props: { children?: ReactNode; className?: string; [key: string]: unknown };
}

function hasProps(node: unknown): node is ReactNodeWithProps {
  return (
    node != null &&
    typeof node === "object" &&
    "props" in node &&
    "type" in node
  );
}

function extractText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (hasProps(node)) {
    return extractText(node.props.children);
  }
  return "";
}

function extractTableMarkdown(node: ReactNode): string {
  const rows: string[][] = [];

  function walkRows(el: ReactNode) {
    if (el == null) return;
    if (Array.isArray(el)) {
      el.forEach(walkRows);
      return;
    }
    if (hasProps(el)) {
      const type = el.type;
      const typeName =
        typeof type === "string"
          ? type
          : typeof type === "function" && "name" in type
            ? (type.name as string)
            : "";

      if (typeName === "tr" || typeName === "TableRow") {
        const cells: string[] = [];
        const cellChildren = Array.isArray(el.props.children)
          ? el.props.children
          : [el.props.children];
        (cellChildren as ReactNode[]).forEach((cell: ReactNode) => {
          if (hasProps(cell)) {
            cells.push(extractText(cell.props.children));
          }
        });
        if (cells.length > 0) rows.push(cells);
      } else {
        walkRows(el.props.children);
      }
    }
  }

  walkRows(node);

  if (rows.length === 0) return "";

  const lines: string[] = [];
  lines.push("| " + rows[0].join(" | ") + " |");
  lines.push("| " + rows[0].map(() => "---").join(" | ") + " |");
  for (let i = 1; i < rows.length; i++) {
    lines.push("| " + rows[i].join(" | ") + " |");
  }

  return lines.join("\n");
}

export function ShareableSnippet({
  type,
  language,
  title,
  slug,
  children,
}: ShareableSnippetProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  let shareContent = "";
  if (type === "code") {
    shareContent = extractText(children);
  } else {
    shareContent = extractTableMarkdown(children);
  }

  return (
    <div ref={containerRef} className="group/share relative">
      {children}
      <div className="absolute right-2 top-2 opacity-60 md:opacity-0 transition-opacity md:group-hover/share:opacity-100">
        <ShareButton
          type={type}
          content={shareContent}
          language={language}
          title={title}
          slug={slug}
        />
      </div>
    </div>
  );
}
