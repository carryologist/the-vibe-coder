import Link from "next/link";

interface TagBadgeProps {
  tag: string;
  linked?: boolean;
}

export function TagBadge({ tag, linked = true }: TagBadgeProps) {
  const classes =
    "inline-block rounded-md border border-[#1F1F1F] bg-[#0A0A0A] px-2 py-0.5 font-mono text-[11px] text-[#888888] transition-all hover:border-[#A3E635]/40 hover:text-[#A3E635]";

  if (linked) {
    return (
      <Link href={`/tags/${tag}`} className={classes}>
        {tag}
      </Link>
    );
  }

  return <span className={classes}>{tag}</span>;
}
