import { NextResponse } from "next/server";
import { getAllPostsAdmin } from "@/lib/posts";

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

export interface ImageFile {
  name: string;
  size: number;
  sha: string;
  path: string;
  downloadUrl: string;
}

export interface ImageDirectory {
  slug: string;
  files: ImageFile[];
  fileCount: number;
  totalSize: number;
  hasMatchingPost: boolean;
  isOrphaned: boolean;
}

// GET /api/images/list
export async function GET() {
  try {
    const { token, repo } = getConfig();

    // Get all post slugs for orphan detection
    let postSlugs: Set<string> = new Set();
    try {
      const posts = getAllPostsAdmin();
      postSlugs = new Set(posts.map((p) => p.slug));
    } catch {
      // content/posts/ may not exist at build time — fall back to empty set
      postSlugs = new Set();
    }

    // List top-level entries under public/images
    const topUrl = `${GITHUB_API}/repos/${repo}/contents/public/images`;
    const topRes = await fetch(topUrl, {
      headers: githubHeaders(token),
      cache: "no-store",
    });

    if (!topRes.ok) {
      if (topRes.status === 404) {
        return NextResponse.json({ directories: [] });
      }
      const err = await topRes.text();
      return NextResponse.json(
        { error: `GitHub API error: ${topRes.status} ${err}` },
        { status: 502 }
      );
    }

    const topEntries: GitHubEntry[] = await topRes.json();
    const dirEntries = topEntries.filter((e) => e.type === "dir");

    // Fetch files for each directory in parallel
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

    return NextResponse.json({ directories });
  } catch (error) {
    console.error("Image list error:", error);
    return NextResponse.json(
      { error: "Failed to list images" },
      { status: 500 }
    );
  }
}
