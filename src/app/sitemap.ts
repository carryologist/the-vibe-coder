import { MetadataRoute } from "next";
import { getAllPosts, getAllTags } from "@/lib/posts";

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPosts();
  const tags = getAllTags();

  const postEntries: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `https://vibescoder.dev/posts/${post.slug}`,
    lastModified: post.changelog?.[0]?.date
      ? new Date(post.changelog[0].date)
      : new Date(post.date),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const tagEntries: MetadataRoute.Sitemap = tags.map((tag) => ({
    url: `https://vibescoder.dev/tags/${tag}`,
    changeFrequency: "weekly",
    priority: 0.4,
  }));

  return [
    {
      url: "https://vibescoder.dev",
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: "https://vibescoder.dev/about",
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: "https://vibescoder.dev/tags",
      changeFrequency: "weekly",
      priority: 0.6,
    },
    ...postEntries,
    ...tagEntries,
  ];
}
