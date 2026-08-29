import TagManager from "./TagManager";
import { getAllTagsWithCount } from "@/lib/tags";

export const metadata = {
  title: "Tag Manager",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminTagsPage() {
  const tags = await getAllTagsWithCount();

  return <TagManager initialTags={tags} />;
}
