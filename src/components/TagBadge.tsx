import Link from "next/link";

interface TagBadgeProps {
  tag: string;
  linked?: boolean;
}

export function TagBadge({ tag, linked = true }: TagBadgeProps) {
  const classes =
    "inline-block rounded-lg bg-[#282a2a] px-2.5 py-0.5 text-[11px] uppercase tracking-wider text-[#cec2d4] transition-colors hover:text-[#dcb8ff]";

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
