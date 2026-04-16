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
    <article className="group rounded-xl border border-[#4c4452]/10 bg-[#1a1c1c] p-6 transition-all duration-500 hover:border-[#dcb8ff]/20 hover:bg-[#282a2a] hover:shadow-[0_0_30px_rgba(188,124,255,0.08)]">
      <div className="flex items-start justify-between gap-4">
        <Link href={`/posts/${slug}`} className="block min-w-0">
          <h2
            className="text-xl font-semibold tracking-tight text-[#e2e2e2] transition-colors group-hover:text-[#dcb8ff]"
            style={{ fontFamily: "var(--font-headline)" }}
          >
            {title}
          </h2>
        </Link>
        {isAdmin && <AdminCardControls slug={slug} />}
      </div>

      <div
        className="mt-3 flex items-center gap-3 text-xs uppercase tracking-widest text-[#cec2d4]/50"
        style={{ fontFamily: "var(--font-label)" }}
      >
        <time dateTime={date}>{format(parseISO(date), "yyyy.MM.dd")}</time>
        <span className="text-[#4c4452]">&middot;</span>
        <span>{readingTime}</span>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-[#cec2d4]">
        {description}
      </p>

      {tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <TagBadge key={tag} tag={tag} />
          ))}
        </div>
      )}
    </article>
  );
}
