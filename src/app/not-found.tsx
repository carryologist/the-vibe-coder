import Link from "next/link";
import { getAllPosts } from "@/lib/posts";

export default function NotFound() {
  const recentPosts = getAllPosts().slice(0, 5);

  return (
    <div className="py-16">
      <h1
        className="text-3xl font-bold tracking-tight text-on-surface sm:text-4xl"
        style={{ fontFamily: "var(--font-headline)" }}
      >
        404 — Page Not Found
      </h1>
      <p className="mt-4 text-on-surface-variant">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>

      <div className="mt-8 flex gap-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-primary transition-colors hover:text-primary/70"
          style={{ fontFamily: "var(--font-label)" }}
        >
          <span aria-hidden="true">&larr;</span>
          Home
        </Link>
        <Link
          href="/tags"
          className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-primary transition-colors hover:text-primary/70"
          style={{ fontFamily: "var(--font-label)" }}
        >
          Browse Tags
        </Link>
      </div>

      {recentPosts.length > 0 && (
        <div className="mt-12">
          <h2
            className="text-xs font-semibold uppercase tracking-widest text-primary mb-6"
            style={{ fontFamily: "var(--font-label)" }}
          >
            // Recent Posts
          </h2>
          <ul className="space-y-3">
            {recentPosts.map((post) => (
              <li key={post.slug}>
                <Link
                  href={`/posts/${post.slug}`}
                  className="text-on-surface-variant transition-colors hover:text-primary"
                >
                  {post.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
