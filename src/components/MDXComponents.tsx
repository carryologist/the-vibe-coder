import type { ComponentPropsWithoutRef } from "react";
import Image from "next/image";
import Link from "next/link";

/* ------------------------------------------------------------------ */
/*  Neon Brutalist prose — vibes_protocol design system               */
/*  BG: #121414  Surface: #1a1c1c  Primary: #dcb8ff                  */
/*  Text: #e2e2e2  Variant: #cec2d4  Outline: #4c4452                */
/* ------------------------------------------------------------------ */

function H1(props: ComponentPropsWithoutRef<"h1">) {
  return (
    <h1
      className="mb-4 mt-10 text-3xl font-bold tracking-tight text-[#e2e2e2] first:mt-0"
      style={{ fontFamily: "var(--font-headline)" }}
      {...props}
    />
  );
}

function H2(props: ComponentPropsWithoutRef<"h2">) {
  return (
    <h2
      className="mb-3 mt-10 text-2xl font-semibold tracking-tight text-[#e2e2e2]"
      style={{ fontFamily: "var(--font-headline)" }}
      {...props}
    />
  );
}

function H3(props: ComponentPropsWithoutRef<"h3">) {
  return (
    <h3
      className="mb-2 mt-8 text-xl font-semibold text-[#e2e2e2]"
      style={{ fontFamily: "var(--font-headline)" }}
      {...props}
    />
  );
}

function H4(props: ComponentPropsWithoutRef<"h4">) {
  return (
    <h4
      className="mb-2 mt-6 text-lg font-medium text-[#e2e2e2]"
      style={{ fontFamily: "var(--font-headline)" }}
      {...props}
    />
  );
}

function Paragraph(props: ComponentPropsWithoutRef<"p">) {
  return (
    <p
      className="my-5 text-base leading-[1.8] text-[#cec2d4]"
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
        className="text-[#dcb8ff] underline decoration-[#dcb8ff]/30 underline-offset-2 transition-colors hover:decoration-[#dcb8ff] hover:text-[#dcb8ff]/70"
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
      className="text-[#dcb8ff] underline decoration-[#dcb8ff]/30 underline-offset-2 transition-colors hover:decoration-[#dcb8ff] hover:text-[#dcb8ff]/70"
      {...rest}
    >
      {children}
    </Link>
  );
}

function Blockquote(props: ComponentPropsWithoutRef<"blockquote">) {
  return (
    <blockquote
      className="my-6 border-l-2 border-[#dcb8ff] pl-5 italic text-[#cec2d4]"
      {...props}
    />
  );
}

function UnorderedList(props: ComponentPropsWithoutRef<"ul">) {
  return (
    <ul
      className="my-5 list-disc space-y-2 pl-6 text-[#cec2d4] marker:text-[#dcb8ff]"
      {...props}
    />
  );
}

function OrderedList(props: ComponentPropsWithoutRef<"ol">) {
  return (
    <ol
      className="my-5 list-decimal space-y-2 pl-6 text-[#cec2d4] marker:text-[#dcb8ff]"
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
      className="rounded bg-[#282a2a] border border-[#4c4452]/20 px-1.5 py-0.5 text-[0.875em] text-[#dcb8ff]"
      style={{ fontFamily: "var(--font-mono)" }}
      {...props}
    />
  );
}

function Pre(props: ComponentPropsWithoutRef<"pre">) {
  return (
    <pre
      className="my-6 overflow-x-auto rounded-xl border border-[#4c4452]/20 bg-[#0d0f0f] p-4 text-sm leading-relaxed text-[#e2e2e2]"
      {...props}
    />
  );
}

function HorizontalRule() {
  return <hr className="my-10 border-[#4c4452]" />;
}

function MDXImage(props: ComponentPropsWithoutRef<"img">) {
  const { src, alt = "", width, height, ...rest } = props;

  if (!src) return null;

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
