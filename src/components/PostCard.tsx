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
  const { slug, title, date, description, tags, readingTime, commentCount } = post;

  return (
    <article className="group glow-card relative rounded-xl border border-outline-variant/10 bg-surface-low p-6 transition-all duration-500 hover:border-primary/20 hover:bg-surface-high">
      {/* Full-card link — sits behind everything. */}
      <Link
        href={`/posts/${slug}`}
        className="absolute inset-0 z-0"
        aria-label={title}
      />

      <div className="relative z-10 flex items-start justify-between gap-4 pointer-events-none">
        <h2
          className="text-xl font-semibold tracking-tight text-on-surface transition-colors group-hover:text-primary"
          style={{ fontFamily: "var(--font-headline)" }}
        >
          {title}
        </h2>
        {isAdmin && <span className="pointer-events-auto"><AdminCardControls slug={slug} /></span>}
      </div>

      <div
        className="relative z-10 mt-3 flex items-center gap-3 text-xs uppercase tracking-widest text-on-surface-variant/50 pointer-events-none"
        style={{ fontFamily: "var(--font-label)" }}
      >
        <time dateTime={date}>{format(parseISO(date), "yyyy.MM.dd")}</time>
        <span className="text-outline-variant">&middot;</span>
        <span>{readingTime}</span>
        {commentCount != null && commentCount > 0 && (
          <>
            <span className="text-outline-variant">&middot;</span>
            <span className="inline-flex items-center gap-1">
              <svg
                viewBox="0 0 16 16"
                fill="currentColor"
                className="h-3 w-3"
                aria-hidden="true"
              >
                <path d="M2.5 3A1.5 1.5 0 0 0 1 4.5v5A1.5 1.5 0 0 0 2.5 11h1v2.5L7 11h4.5A1.5 1.5 0 0 0 13 9.5v-5A1.5 1.5 0 0 0 11.5 3h-9Z" />
              </svg>
              {commentCount}
            </span>
          </>
        )}
      </div>

      <p className="relative z-10 mt-3 text-sm leading-relaxed text-on-surface-variant pointer-events-none">
        {description}
      </p>

      {tags.length > 0 && (
        <div className="relative z-10 mt-4 flex flex-wrap gap-2 pointer-events-auto">
          {tags.map((tag) => (
            <TagBadge key={tag} tag={tag} />
          ))}
        </div>
      )}
    </article>
  );
}
