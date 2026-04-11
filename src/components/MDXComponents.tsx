import type { ComponentPropsWithoutRef } from "react";
import Image from "next/image";
import Link from "next/link";

/* ------------------------------------------------------------------ */
/*  Shared prose-like styles for MDX content                          */
/* ------------------------------------------------------------------ */

function H1(props: ComponentPropsWithoutRef<"h1">) {
  return (
    <h1
      className="mb-4 mt-10 font-sans text-3xl font-bold tracking-tight text-foreground first:mt-0"
      {...props}
    />
  );
}

function H2(props: ComponentPropsWithoutRef<"h2">) {
  return (
    <h2
      className="mb-3 mt-10 font-sans text-2xl font-semibold tracking-tight text-foreground"
      {...props}
    />
  );
}

function H3(props: ComponentPropsWithoutRef<"h3">) {
  return (
    <h3
      className="mb-2 mt-8 font-sans text-xl font-semibold text-foreground"
      {...props}
    />
  );
}

function H4(props: ComponentPropsWithoutRef<"h4">) {
  return (
    <h4
      className="mb-2 mt-6 font-sans text-lg font-medium text-foreground"
      {...props}
    />
  );
}

function Paragraph(props: ComponentPropsWithoutRef<"p">) {
  return (
    <p
      className="my-5 text-base leading-7 text-neutral-700 dark:text-neutral-300"
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
        className="text-neutral-900 underline decoration-neutral-300 underline-offset-2 transition-colors hover:decoration-neutral-500 dark:text-neutral-100 dark:decoration-neutral-600 dark:hover:decoration-neutral-400"
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
      className="text-neutral-900 underline decoration-neutral-300 underline-offset-2 transition-colors hover:decoration-neutral-500 dark:text-neutral-100 dark:decoration-neutral-600 dark:hover:decoration-neutral-400"
      {...rest}
    >
      {children}
    </Link>
  );
}

function Blockquote(props: ComponentPropsWithoutRef<"blockquote">) {
  return (
    <blockquote
      className="my-6 border-l-2 border-neutral-300 pl-5 italic text-neutral-500 dark:border-neutral-600 dark:text-neutral-400"
      {...props}
    />
  );
}

function UnorderedList(props: ComponentPropsWithoutRef<"ul">) {
  return (
    <ul
      className="my-5 list-disc space-y-2 pl-6 text-neutral-700 marker:text-neutral-300 dark:text-neutral-300 dark:marker:text-neutral-600"
      {...props}
    />
  );
}

function OrderedList(props: ComponentPropsWithoutRef<"ol">) {
  return (
    <ol
      className="my-5 list-decimal space-y-2 pl-6 text-neutral-700 marker:text-neutral-400 dark:text-neutral-300 dark:marker:text-neutral-500"
      {...props}
    />
  );
}

function ListItem(props: ComponentPropsWithoutRef<"li">) {
  return <li className="leading-7" {...props} />;
}

function InlineCode(props: ComponentPropsWithoutRef<"code">) {
  return (
    <code
      className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[0.875em] text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200"
      {...props}
    />
  );
}

function Pre(props: ComponentPropsWithoutRef<"pre">) {
  return (
    <pre
      className="my-6 overflow-x-auto rounded-lg bg-neutral-950 p-4 text-sm leading-relaxed text-neutral-200 dark:bg-neutral-900"
      {...props}
    />
  );
}

function HorizontalRule() {
  return <hr className="my-10 border-neutral-200 dark:border-neutral-800" />;
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
