const REPO_OWNER = "carryologist";
const REPO_NAME = "the-vibe-coder";
const CATEGORY_NAME = "Announcements";
const PER_PAGE = 100;
// Bounded so a runaway pagination loop can't hang a render. 10 pages of
// 100 is far beyond the current discussion count.
const MAX_PAGES = 10;

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
 *
 * Paginates because the API defaults to 30 per page, which silently
 * reported `0` comments for every post past the newest 30. Sends
 * GITHUB_TOKEN when available so the request uses the authenticated rate
 * limit rather than the 60/hour/IP anonymous one shared across instances.
 */
export async function getCommentCounts(): Promise<Record<string, number>> {
  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
    };
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    const counts: Record<string, number> = {};

    for (let page = 1; page <= MAX_PAGES; page++) {
      const res = await fetch(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/discussions?per_page=${PER_PAGE}&page=${page}`,
        {
          headers,
          next: { revalidate: 300 },
        },
      );

      if (!res.ok) {
        console.error(`GitHub Discussions API returned ${res.status}`);
        return counts;
      }

      const discussions: GitHubDiscussion[] = await res.json();

      for (const d of discussions) {
        if (d.category.name !== CATEGORY_NAME) continue;
        if (!d.title.startsWith("/posts/") && !d.title.startsWith("posts/")) continue;

        const slug = d.title.replace(/^\/?posts\//, "");
        if (slug) {
          counts[slug] = d.comments;
        }
      }

      // A short page means there is nothing after it.
      if (discussions.length < PER_PAGE) break;
    }

    return counts;
  } catch (err) {
    console.error("Failed to fetch discussion comment counts:", err);
    return {};
  }
}
