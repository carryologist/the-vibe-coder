const REPO_OWNER = "carryologist";
const REPO_NAME = "the-vibe-coder";
const CATEGORY_NAME = "Announcements";

interface GitHubDiscussion {
  title: string;
  comments: number;
  category: {
    name: string;
  };
}

/**
 * Fetches comment counts from GitHub Discussions for the blog.
 * Giscus maps pathnames (e.g. `/posts/my-slug`) to discussion titles,
 * so we parse the slug from each title and return a slug-to-count map.
 */
export async function getCommentCounts(): Promise<Record<string, number>> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/discussions`,
      {
        headers: { Accept: "application/vnd.github+json" },
        next: { revalidate: 300 },
      },
    );

    if (!res.ok) {
      console.error(`GitHub Discussions API returned ${res.status}`);
      return {};
    }

    const discussions: GitHubDiscussion[] = await res.json();

    const counts: Record<string, number> = {};
    for (const d of discussions) {
      if (d.category.name !== CATEGORY_NAME) continue;
      if (!d.title.startsWith("/posts/")) continue;

      const slug = d.title.replace(/^\/posts\//, "");
      if (slug) {
        counts[slug] = d.comments;
      }
    }

    return counts;
  } catch (err) {
    console.error("Failed to fetch discussion comment counts:", err);
    return {};
  }
}
