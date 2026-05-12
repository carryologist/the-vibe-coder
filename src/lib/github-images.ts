/**
 * GitHub API helpers for browsing image directories in the content repo.
 * Uses the GitHub Trees and Contents APIs to list directories and files.
 */

const GITHUB_API = "https://api.github.com";

function getConfig() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  if (!token || !repo) {
    throw new Error("GITHUB_TOKEN and GITHUB_REPO must be set");
  }
  return { token, repo };
}

function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

export interface GitHubFileEntry {
  name: string;
  path: string;
  size: number;
  sha: string;
  type: "file" | "dir";
  download_url: string | null;
}

/**
 * List contents of a directory in the content repo.
 * Returns array of file/directory entries.
 */
export async function listDirectory(dirPath: string): Promise<GitHubFileEntry[]> {
  const { token, repo } = getConfig();
  const url = `${GITHUB_API}/repos/${repo}/contents/${dirPath}?ref=main`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(url, {
      headers: headers(token),
      cache: "no-store",
      signal: controller.signal,
    });

    if (!res.ok) {
      if (res.status === 404) return [];
      const err = await res.text();
      throw new Error(`GitHub API error: ${res.status} ${err}`);
    }

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map((item: Record<string, unknown>) => ({
      name: item.name as string,
      path: item.path as string,
      size: (item.size as number) || 0,
      sha: item.sha as string,
      type: item.type as "file" | "dir",
      download_url: (item.download_url as string) || null,
    }));
  } finally {
    clearTimeout(timeout);
  }
}

export interface ImageDirectory {
  slug: string;
  files: GitHubFileEntry[];
  totalSize: number;
  fileCount: number;
}

/**
 * List all image directories under public/images/ in the content repo.
 * Returns directory info with file counts and sizes.
 */
export async function listImageDirectories(): Promise<ImageDirectory[]> {
  const topLevel = await listDirectory("public/images");
  const dirs = topLevel.filter((entry) => entry.type === "dir");

  // Fetch contents of each directory in parallel
  const results = await Promise.all(
    dirs.map(async (dir) => {
      const files = await listDirectory(dir.path);
      const imageFiles = files.filter((f) => f.type === "file");
      const totalSize = imageFiles.reduce((sum, f) => sum + f.size, 0);

      return {
        slug: dir.name,
        files: imageFiles,
        totalSize,
        fileCount: imageFiles.length,
      };
    })
  );

  return results.sort((a, b) => a.slug.localeCompare(b.slug));
}
