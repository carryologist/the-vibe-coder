import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getImageDirectory, formatBytes } from "@/lib/images";
import { ImageDirectoryView } from "@/components/admin/ImageDirectoryView";

export const metadata: Metadata = {
  title: "Image Directory — Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function AdminImageDirectoryPage({ params }: PageProps) {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  const directory = getImageDirectory(slug);
  if (!directory) notFound();

  return (
    <div>
      <div className="mb-2">
        <Link
          href="/admin/images"
          className="font-mono text-xs text-outline transition-colors hover:text-primary"
        >
          ← All images
        </Link>
      </div>
      <div className="mb-6 flex items-baseline justify-between">
        <h1 className="font-mono text-xs uppercase tracking-widest text-primary">
          // {directory.slug}
        </h1>
        <span className="font-mono text-xs text-on-surface-variant">
          <span className="text-on-surface font-medium">
            {directory.fileCount}
          </span>{" "}
          file{directory.fileCount === 1 ? "" : "s"} ·{" "}
          <span className="text-on-surface font-medium">
            {formatBytes(directory.totalSize)}
          </span>
        </span>
      </div>

      {directory.postTitle && !directory.orphaned && (
        <p className="mb-6 font-mono text-xs text-on-surface-variant">
          Post:{" "}
          <Link
            href={`/posts/${directory.slug}`}
            className="text-on-surface transition-colors hover:text-primary"
          >
            {directory.postTitle}
          </Link>
          {directory.postPublished === false && (
            <span className="ml-2 rounded border border-secondary/40 bg-secondary/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-secondary">
              draft
            </span>
          )}
        </p>
      )}

      <ImageDirectoryView directory={directory} />
    </div>
  );
}
