import Link from "next/link";

interface TagBadgeProps {
  tag: string;
  linked?: boolean;
}

export function TagBadge({ tag, linked = true }: TagBadgeProps) {
  const classes =
    "inline-block rounded-lg bg-surface-high px-2.5 py-0.5 text-[11px] uppercase tracking-wider text-on-surface-variant transition-colors hover:text-primary";

  if (linked) {
    return (
      <Link
        href={`/tags/${tag}`}
        className={classes}
        style={{ fontFamily: "var(--font-label)" }}
      >
        {tag}
      </Link>
    );
  }

  return (
    <span className={classes} style={{ fontFamily: "var(--font-label)" }}>
      {tag}
    </span>
  );
}
