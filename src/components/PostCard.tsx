import Link from "next/link";
import { format, parseISO } from "date-fns";
import { TagBadge } from "@/components/TagBadge";
import type { Post } from "@/lib/types";

interface PostCardProps {
  post: Post;
}

export function PostCard({ post }: PostCardProps) {
  const { slug, title, date, description, tags, readingTime } = post;

  return (
    <article className="group">
      <Link href={`/posts/${slug}`} className="block">
        <h2 className="font-sans text-xl font-semibold tracking-tight text-foreground transition-colors group-hover:text-neutral-600 dark:group-hover:text-neutral-300">
          {title}
        </h2>
      </Link>

      <div className="mt-2 flex items-center gap-2 text-sm text-neutral-400 dark:text-neutral-500">
        <time dateTime={date}>{format(parseISO(date), "MMMM d, yyyy")}</time>
        <span aria-hidden="true">&middot;</span>
        <span>{readingTime}</span>
      </div>

      <p className="mt-3 text-[0.95rem] leading-relaxed text-neutral-600 dark:text-neutral-400">
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
