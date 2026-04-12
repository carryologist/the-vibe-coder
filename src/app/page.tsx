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
          <h1 className="font-mono text-4xl font-bold tracking-tight sm:text-5xl">
            <span className="text-[#EDEDED]">Vibes</span>{" "}
            <span className="text-[#A3E635]">Coder</span>
          </h1>
          <p className="mt-4 text-lg text-[#888888] max-w-2xl">
            Thoughts on software development, AI-assisted coding, and the craft of
            building things that work.
          </p>
        </section>
      </AnimateIn>

      {/* Posts */}
      <AnimateIn delay={0.1}>
        <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-[#A3E635] mb-8">
          // Latest Posts
        </h2>
      </AnimateIn>

      {posts.length === 0 ? (
        <p className="font-mono text-sm text-[#888888]">
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
