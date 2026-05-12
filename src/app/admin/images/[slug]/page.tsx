import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getImageDirectory } from "@/lib/images";
import { ImageDirectoryView } from "@/components/admin/ImageDirectoryView";

export const metadata: Metadata = {
  title: "Image Directory — Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminImageDirectoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const directory = await getImageDirectory(slug);
  if (!directory) notFound();

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/images"
          className="font-mono text-xs text-on-surface-variant transition-colors hover:text-primary"
        >
          ← all images
        </Link>
      </div>

      <ImageDirectoryView directory={directory} />
    </div>
  );
}
