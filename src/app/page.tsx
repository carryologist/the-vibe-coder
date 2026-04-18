import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import { getAllPosts } from "@/lib/posts";
import { PostCard } from "@/components/PostCard";
import { AnimateIn } from "@/components/AnimateIn";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;
  const isAdmin = token ? await verifySession(token) : false;

  const posts = await getAllPosts();

  return (
    <div>
      {/* Hero */}
      <AnimateIn>
        <section className="mb-16">
          <h1
            className="text-4xl font-bold tracking-tighter sm:text-5xl"
            style={{ fontFamily: "var(--font-headline)" }}
          >
            <span className="text-on-surface">Vibes</span>{" "}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Coder</span>
          </h1>
          <p className="mt-4 text-lg text-on-surface-variant max-w-2xl">
            Vibe coder. Dangerous coder. CEO of Coder. Thoughts are my own. Err&hellip; mine and my agent&apos;s.
          </p>
        </section>
      </AnimateIn>

      {/* Posts */}
      <AnimateIn delay={0.1}>
        <h2
          className="text-xs font-semibold uppercase tracking-widest text-primary mb-8"
          style={{ fontFamily: "var(--font-label)" }}
        >
          // Latest Posts
        </h2>
      </AnimateIn>

      {posts.length === 0 ? (
        <p
          className="text-sm text-on-surface-variant"
          style={{ fontFamily: "var(--font-label)" }}
        >
          No posts yet. Check back soon.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {posts.map((post, i) => (
            <AnimateIn key={post.slug} delay={0.15 + i * 0.05}>
              <PostCard post={post} isAdmin={isAdmin} />
            </AnimateIn>
          ))}
        </div>
      )}
    </div>
  );
}
