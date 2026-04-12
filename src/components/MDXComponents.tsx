import type { ComponentPropsWithoutRef } from "react";
import Image from "next/image";
import Link from "next/link";

/* ------------------------------------------------------------------ */
/*  Dark-first prose styles — "Medium meets VS Code"                  */
/*  BG: #0A0A0A  Surface: #111111  Border: #1F1F1F                   */
/*  Text: #EDEDED  Secondary: #888888  Accent: #A3E635               */
/* ------------------------------------------------------------------ */

function H1(props: ComponentPropsWithoutRef<"h1">) {
  return (
    <h1
      className="mb-4 mt-10 text-3xl font-bold tracking-tight text-[#EDEDED] first:mt-0"
      {...props}
    />
  );
}

function H2(props: ComponentPropsWithoutRef<"h2">) {
  return (
    <h2
      className="mb-3 mt-10 text-2xl font-semibold tracking-tight text-[#EDEDED]"
      {...props}
    />
  );
}

function H3(props: ComponentPropsWithoutRef<"h3">) {
  return (
    <h3
      className="mb-2 mt-8 text-xl font-semibold text-[#EDEDED]"
      {...props}
    />
  );
}

function H4(props: ComponentPropsWithoutRef<"h4">) {
  return (
    <h4
      className="mb-2 mt-6 text-lg font-medium text-[#EDEDED]"
      {...props}
    />
  );
}

function Paragraph(props: ComponentPropsWithoutRef<"p">) {
  return (
    <p
      className="my-5 text-base leading-[1.8] text-[#CCCCCC]"
      {...props}
    />
  );
}

function Anchor(props: ComponentPropsWithoutRef<"a">) {
  const { href = "#", children, ...rest } = props;
  const isExternal = href.startsWith("http");

  if (isExternal) {
    return (
      <a
        href={href}
        className="text-[#A3E635] underline decoration-[#A3E635]/30 underline-offset-2 transition-colors hover:decoration-[#A3E635] hover:text-[#A3E635]/70"
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
      className="text-[#A3E635] underline decoration-[#A3E635]/30 underline-offset-2 transition-colors hover:decoration-[#A3E635] hover:text-[#A3E635]/70"
      {...rest}
    >
      {children}
    </Link>
  );
}

function Blockquote(props: ComponentPropsWithoutRef<"blockquote">) {
  return (
    <blockquote
      className="my-6 border-l-2 border-[#A3E635] pl-5 italic text-[#888888]"
      {...props}
    />
  );
}

function UnorderedList(props: ComponentPropsWithoutRef<"ul">) {
  return (
    <ul
      className="my-5 list-disc space-y-2 pl-6 text-[#CCCCCC] marker:text-[#A3E635]"
      {...props}
    />
  );
}

function OrderedList(props: ComponentPropsWithoutRef<"ol">) {
  return (
    <ol
      className="my-5 list-decimal space-y-2 pl-6 text-[#CCCCCC] marker:text-[#A3E635]"
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
      className="rounded bg-[#1A1A1A] border border-[#1F1F1F] px-1.5 py-0.5 font-mono text-[0.875em] text-[#A3E635]/90"
      {...props}
    />
  );
}

function Pre(props: ComponentPropsWithoutRef<"pre">) {
  return (
    <pre
      className="my-6 overflow-x-auto rounded-xl border border-[#1F1F1F] bg-[#0D0D0D] p-4 text-sm leading-relaxed text-[#EDEDED]"
      {...props}
    />
  );
}

function HorizontalRule() {
  return <hr className="my-10 border-[#1F1F1F]" />;
}

function MDXImage(props: ComponentPropsWithoutRef<"img">) {
  const { src, alt = "", width, height, ...rest } = props;

  if (!src) return null;

  // Use Next.js Image when explicit dimensions are provided via
  // markdown attributes; fall back to a plain <img> otherwise.
  if (typeof src === "string" && width && height) {
    return (
      <Image
        src={src}
        alt={alt}
        width={Number(width)}
        height={Number(height)}
        className="my-6 rounded-lg"
      />
    );
  }

  /* eslint-disable @next/next/no-img-element */
  return (
    <img
      src={src}
      alt={alt}
      className="my-6 w-full rounded-lg"
      loading="lazy"
      {...rest}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Exported component map — pass to MDXRemote / next-mdx-remote      */
/* ------------------------------------------------------------------ */

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
  pre: Pre,
  hr: HorizontalRule,
  img: MDXImage,
};
