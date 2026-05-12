import type { Metadata } from "next";
import { getAllPostsAdmin } from "@/lib/posts";
import ImageManager from "@/components/admin/ImageManager";

export const metadata: Metadata = {
  title: "Images — Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const GITHUB_API = "https://api.github.com";

function getConfig() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  if (!token || !repo) {
    throw new Error("GITHUB_TOKEN and GITHUB_REPO must be set");
  }
  return { token, repo };
}

function githubHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

interface GitHubEntry {
  name: string;
  path: string;
  sha: string;
  size: number;
  type: "file" | "dir" | "symlink" | "submodule";
  download_url: string | null;
}

interface ImageFile {
  name: string;
  size: number;
  sha: string;
  path: string;
  downloadUrl: string;
}

interface ImageDirectory {
  slug: string;
  files: ImageFile[];
  fileCount: number;
  totalSize: number;
  hasMatchingPost: boolean;
  isOrphaned: boolean;
}

async function fetchImageDirectories(): Promise<ImageDirectory[]> {
  const { token, repo } = getConfig();

  // Get all post slugs for orphan detection
  let postSlugs: Set<string> = new Set();
  try {
    const posts = getAllPostsAdmin();
    postSlugs = new Set(posts.map((p) => p.slug));
  } catch {
    // content/posts/ may not exist — fall back gracefully
    postSlugs = new Set();
  }

  const topUrl = `${GITHUB_API}/repos/${repo}/contents/public/images`;
  const topRes = await fetch(topUrl, {
    headers: githubHeaders(token),
    cache: "no-store",
  });

  if (!topRes.ok) {
    if (topRes.status === 404) return [];
    throw new Error(`GitHub API error: ${topRes.status}`);
  }

  const topEntries: GitHubEntry[] = await topRes.json();
  const dirEntries = topEntries.filter((e) => e.type === "dir");

  const directories: ImageDirectory[] = await Promise.all(
    dirEntries.map(async (dir) => {
      const dirUrl = `${GITHUB_API}/repos/${repo}/contents/public/images/${dir.name}`;
      const dirRes = await fetch(dirUrl, {
        headers: githubHeaders(token),
        cache: "no-store",
      });

      let files: ImageFile[] = [];
      if (dirRes.ok) {
        const entries: GitHubEntry[] = await dirRes.json();
        files = entries
          .filter((e) => e.type === "file" && e.download_url)
          .map((e) => ({
            name: e.name,
            size: e.size,
            sha: e.sha,
            path: e.path,
            downloadUrl: e.download_url as string,
          }));
      }

      const hasMatchingPost = postSlugs.has(dir.name);
      return {
        slug: dir.name,
        files,
        fileCount: files.length,
        totalSize: files.reduce((acc, f) => acc + f.size, 0),
        hasMatchingPost,
        isOrphaned: !hasMatchingPost,
      };
    })
  );

  return directories;
}

export default async function ImagesPage() {
  let directories: ImageDirectory[] = [];
  let fetchError: string | null = null;

  try {
    directories = await fetchImageDirectories();
  } catch (err) {
    fetchError =
      err instanceof Error ? err.message : "Failed to load image data";
  }

  return (
    <div>
      <h1 className="font-mono text-xs uppercase tracking-widest text-primary mb-8">
        // Images
      </h1>

      {fetchError ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 font-mono text-xs text-red-400">
          {fetchError}
        </div>
      ) : (
        <ImageManager initialDirectories={directories} />
      )}
    </div>
  );
}
