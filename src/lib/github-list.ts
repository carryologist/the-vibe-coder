/**
 * GitHub directory listing helper.
 * The existing github.ts only has file-level CRUD; this adds
 * directory listing via the GitHub Contents API.
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

export interface GitHubEntry {
  name: string;
  path: string;
  type: "file" | "dir";
  size: number;
}

/**
 * List files in a directory in the GitHub repository.
 * Returns an array of file/dir entries, or null if the path doesn't exist.
 */
export async function listDirectory(
  path: string,
): Promise<GitHubEntry[] | null> {
  const { token, repo } = getConfig();
  const url = `${GITHUB_API}/repos/${repo}/contents/${path}`;

  const res = await fetch(url, {
    headers: headers(token),
    cache: "no-store",
  });

  if (!res.ok) return null;

  const data = await res.json();
  if (!Array.isArray(data)) return null;

  return data.map(
    (entry: { name: string; path: string; type: string; size: number }) => ({
      name: entry.name,
      path: entry.path,
      type: entry.type as "file" | "dir",
      size: entry.size,
    }),
  );
}
