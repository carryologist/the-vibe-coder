import type { ComponentPropsWithoutRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { PhoneScreenshot, PhoneScreenshots, PhoneScreenshotItem } from "@/components/PhoneScreenshot";
import CollapsibleCode from "@/components/CollapsibleCode";
import { ShareableSnippet } from "@/components/ShareableSnippet";

/* ------------------------------------------------------------------ */
/*  Neon Brutalist prose — theme-aware via CSS custom properties       */
/* ------------------------------------------------------------------ */

function H1(props: ComponentPropsWithoutRef<"h1">) {
  return (
    <h1
      className="mb-4 mt-10 text-3xl font-bold tracking-tight text-on-surface first:mt-0"
      style={{ fontFamily: "var(--font-headline)" }}
      {...props}
    />
  );
}

function H2(props: ComponentPropsWithoutRef<"h2">) {
  return (
    <h2
      className="mb-3 mt-10 text-2xl font-semibold tracking-tight text-on-surface"
      style={{ fontFamily: "var(--font-headline)" }}
      {...props}
    />
  );
}

function H3(props: ComponentPropsWithoutRef<"h3">) {
  return (
    <h3
      className="mb-2 mt-8 text-xl font-semibold text-on-surface"
      style={{ fontFamily: "var(--font-headline)" }}
      {...props}
    />
  );
}

function H4(props: ComponentPropsWithoutRef<"h4">) {
  return (
    <h4
      className="mb-2 mt-6 text-lg font-medium text-on-surface"
      style={{ fontFamily: "var(--font-headline)" }}
      {...props}
    />
  );
}

function Paragraph(props: ComponentPropsWithoutRef<"p">) {
  return (
    <p
      className="my-5 text-base leading-[1.8] text-on-surface-variant"
      {...props}
    />
  );
}

/**
 * Link schemes we are willing to render as a real anchor. Post bodies are
 * generated from transcripts and committed by the admin UI, so an href can
 * carry any scheme; `javascript:` and `data:text/html,` would execute in
 * every reader's browser. Anything not on this list renders as plain text.
 */
function isSafeHref(href: string): boolean {
  // Site-relative, root-relative and in-page targets never carry a scheme.
  if (href.startsWith("/") || href.startsWith("#") || href.startsWith("?")) {
    return true;
  }
  try {
    const { protocol } = new URL(href, "https://vibescoder.dev");
    return protocol === "http:" || protocol === "https:" || protocol === "mailto:";
  } catch {
    return false;
  }
}

function Anchor(props: ComponentPropsWithoutRef<"a">) {
  const { href = "#", children, ...rest } = props;

  if (!isSafeHref(href)) {
    return <span {...rest}>{children}</span>;
  }

  const isExternal = href.startsWith("http");

  if (isExternal) {
    return (
      <a
        href={href}
        className="text-primary underline decoration-primary/30 underline-offset-2 transition-colors hover:decoration-primary hover:text-primary/70"
        target="_blank"
        rel="noopener noreferrer"
        {...rest}
      >
        {children}
      </a>
    );
  }

  return (
    <Link
      href={href}
      className="text-primary underline decoration-primary/30 underline-offset-2 transition-colors hover:decoration-primary hover:text-primary/70"
      {...rest}
    >
      {children}
    </Link>
  );
}

function Blockquote(props: ComponentPropsWithoutRef<"blockquote">) {
  return (
    <blockquote
      className="my-6 border-l-2 border-primary pl-5 italic text-on-surface-variant"
      {...props}
    />
  );
}

function UnorderedList(props: ComponentPropsWithoutRef<"ul">) {
  return (
    <ul
      className="my-5 list-disc space-y-2 pl-6 text-on-surface-variant marker:text-primary"
      {...props}
    />
  );
}

function OrderedList(props: ComponentPropsWithoutRef<"ol">) {
  return (
    <ol
      className="my-5 list-decimal space-y-2 pl-6 text-on-surface-variant marker:text-primary"
      {...props}
    />
  );
}

function ListItem(props: ComponentPropsWithoutRef<"li">) {
  return <li className="leading-[1.8]" {...props} />;
}

function InlineCode(props: ComponentPropsWithoutRef<"code">) {
  return (
    <code
      className="rounded bg-surface-high border border-outline-variant/20 px-1.5 py-0.5 text-[0.875em] text-primary"
      style={{ fontFamily: "var(--font-mono)" }}
      {...props}
    />
  );
}

function BasePre(props: ComponentPropsWithoutRef<"pre">) {
  // Code blocks stay dark in both themes for readability.
  // Reset child <code> to remove InlineCode styles that cause clipping.
  return (
    <pre
      className="my-6 overflow-x-auto rounded-xl border border-[#4c4452]/20 bg-[#0d0f0f] p-4 text-sm leading-relaxed text-[#e2e2e2] [&>code]:bg-transparent [&>code]:border-0 [&>code]:p-0 [&>code]:rounded-none [&>code]:text-[1em] [&>code]:text-inherit"
      {...props}
    />
  );
}

function BaseTable(props: ComponentPropsWithoutRef<"table">) {
  return (
    <div className="my-6 overflow-x-auto rounded-xl border border-outline-variant/20">
      <table
        className="w-full border-collapse text-sm text-on-surface-variant"
        {...props}
      />
    </div>
  );
}

function TableHead(props: ComponentPropsWithoutRef<"thead">) {
  return (
    <thead
      className="border-b border-outline-variant/30 bg-surface-high text-left text-xs uppercase tracking-wider text-on-surface"
      style={{ fontFamily: "var(--font-label)" }}
      {...props}
    />
  );
}

function TableBody(props: ComponentPropsWithoutRef<"tbody">) {
  return <tbody className="divide-y divide-outline-variant/10" {...props} />;
}

function TableRow(props: ComponentPropsWithoutRef<"tr">) {
  return (
    <tr
      className="transition-colors hover:bg-surface-high/50"
      {...props}
    />
  );
}

function TableHeader(props: ComponentPropsWithoutRef<"th">) {
  return (
    <th
      className="px-2 py-3 font-semibold text-on-surface sm:px-4"
      {...props}
    />
  );
}

function TableCell(props: ComponentPropsWithoutRef<"td">) {
  return (
    <td
      className="px-2 py-3 leading-[1.6] sm:px-4"
      {...props}
    />
  );
}

function HorizontalRule() {
  return <hr className="my-10 border-outline-variant" />;
}

function MDXImage(props: ComponentPropsWithoutRef<"img">) {
  const { src, alt = "", width, height, ...rest } = props;
  if (!src) return null;

  const effectiveAlt =
    alt || (typeof src === "string" ? src.split("/").pop()?.replace(/[-_]/g, " ").replace(/\.\w+$/, "") ?? "" : "");

  const imageElement =
    typeof src === "string" && width && height ? (
      <Image
        src={src}
        alt={effectiveAlt}
        width={Number(width)}
        height={Number(height)}
        className="rounded-lg"
      />
    ) : (
      /* eslint-disable @next/next/no-img-element */
      <img
        src={src}
        alt={effectiveAlt}
        className="w-full rounded-lg"
        loading="lazy"
        {...rest}
      />
    );

  if (effectiveAlt && effectiveAlt !== alt) {
    return <figure className="my-6">{imageElement}</figure>;
  }

  return (
    <figure className="my-6">
      {imageElement}
      {alt && (
        <figcaption className="mt-2 text-center text-xs text-on-surface-variant/60 italic">
          {alt}
        </figcaption>
      )}
    </figure>
  );
}

/* ------------------------------------------------------------------ */
/*  Component map factories                                            */
/* ------------------------------------------------------------------ */

/** Base components without share buttons (for admin preview, etc.) */
export const MDXComponents = {
  h1: H1,
  h2: H2,
  h3: H3,
  h4: H4,
  p: Paragraph,
  a: Anchor,
  blockquote: Blockquote,
  ul: UnorderedList,
  ol: OrderedList,
  li: ListItem,
  code: InlineCode,
  pre: BasePre,
  hr: HorizontalRule,
  img: MDXImage,
  table: BaseTable,
  thead: TableHead,
  tbody: TableBody,
  tr: TableRow,
  th: TableHeader,
  td: TableCell,
  PhoneScreenshot,
  PhoneScreenshots,
  PhoneScreenshotItem,
  CollapsibleCode,
};

/** Components with share buttons on code blocks and tables. */
export function createMDXComponents(slug: string, title: string) {
  function Pre(props: ComponentPropsWithoutRef<"pre">) {
    // Try to extract language from the child code element's className
    const children = props.children as React.ReactElement<{ className?: string }> | undefined;
    const className = children?.props?.className || "";
    const langMatch = className.match(/language-(\w+)/);
    const language = langMatch ? langMatch[1] : undefined;

    return (
      <ShareableSnippet type="code" language={language} title={title} slug={slug}>
        <BasePre {...props} />
      </ShareableSnippet>
    );
  }

  function Table(props: ComponentPropsWithoutRef<"table">) {
    return (
      <ShareableSnippet type="table" title={title} slug={slug}>
        <BaseTable {...props} />
      </ShareableSnippet>
    );
  }

  return {
    ...MDXComponents,
    pre: Pre,
    table: Table,
  };
}
