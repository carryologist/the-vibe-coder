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
    <article className="group rounded-xl border border-[#1F1F1F] p-6 transition-all duration-300 hover:border-[#A3E635]/30 hover:bg-[#111111] hover:shadow-[0_0_20px_rgba(163,230,53,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <Link href={`/posts/${slug}`} className="block min-w-0">
          <h2 className="text-xl font-semibold tracking-tight text-[#EDEDED] transition-colors group-hover:text-[#A3E635]">
            {title}
          </h2>
        </Link>
        {isAdmin && <AdminCardControls slug={slug} />}
      </div>

      <div className="mt-3 flex items-center gap-3 font-mono text-xs text-[#888888]">
        <time dateTime={date}>{format(parseISO(date), "yyyy.MM.dd")}</time>
        <span className="text-[#333333]">//</span>
        <span>{readingTime}</span>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-[#888888]">
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
