import Link from "next/link";
import { format, parseISO } from "date-fns";
import { TagBadge } from "@/components/TagBadge";
import { AdminCardControls } from "@/components/admin/AdminCardControls";
import type { Post } from "@/lib/types";

interface PostCardProps {
  post: Post;
  isAdmin?: boolean;
}

export function PostCard({ post, isAdmin }: PostCardProps) {
  const { slug, title, date, description, tags, readingTime } = post;

  return (
    <article className="group glow-card relative rounded-xl border border-outline-variant/10 bg-surface-low p-6 transition-all duration-500 hover:border-primary/20 hover:bg-surface-high">
      {/* Full-card link — sits behind everything. */}
      <Link
        href={`/posts/${slug}`}
        className="absolute inset-0 z-0"
        aria-label={title}
      />

      <div className="relative z-10 flex items-start justify-between gap-4">
        <h2
          className="text-xl font-semibold tracking-tight text-on-surface transition-colors group-hover:text-primary"
          style={{ fontFamily: "var(--font-headline)" }}
        >
          {title}
        </h2>
        {isAdmin && <AdminCardControls slug={slug} />}
      </div>

      <div
        className="relative z-10 mt-3 flex items-center gap-3 text-xs uppercase tracking-widest text-on-surface-variant/50"
        style={{ fontFamily: "var(--font-label)" }}
      >
        <time dateTime={date}>{format(parseISO(date), "yyyy.MM.dd")}</time>
        <span className="text-outline-variant">&middot;</span>
        <span>{readingTime}</span>
      </div>

      <p className="relative z-10 mt-3 text-sm leading-relaxed text-on-surface-variant">
        {description}
      </p>

      {tags.length > 0 && (
        <div className="relative z-10 mt-4 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <TagBadge key={tag} tag={tag} />
          ))}
        </div>
      )}
    </article>
  );
}
