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

/**
 * Create or update a file in the GitHub repository.
 * Returns the commit SHA.
 */
export async function commitFile(
  path: string,
  content: string,
  message: string
): Promise<string> {
  const { token, repo } = getConfig();
  const url = `${GITHUB_API}/repos/${repo}/contents/${path}`;

  // Check if file already exists (need SHA for updates).
  let sha: string | undefined;
  const existing = await fetch(url, { headers: headers(token) });
  if (existing.ok) {
    const data = await existing.json();
    sha = data.sha;
  }

  const body: Record<string, string> = {
    message,
    content: Buffer.from(content).toString("base64"),
    branch: "main",
  };
  if (sha) body.sha = sha;

  const res = await fetch(url, {
    method: "PUT",
    headers: headers(token),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub API error: ${res.status} ${err}`);
  }

  const data = await res.json();
  return data.commit.sha;
}

/**
 * Read a file from the GitHub repository. Returns the decoded content
 * or null if the file doesn't exist.
 */
export async function readFile(path: string): Promise<string | null> {
  const { token, repo } = getConfig();
  const url = `${GITHUB_API}/repos/${repo}/contents/${path}`;

  const res = await fetch(url, {
    headers: headers(token),
    cache: "no-store",
  });

  if (!res.ok) return null;

  const data = await res.json();
  return Buffer.from(data.content, "base64").toString("utf-8");
}

/**
 * Delete a file from the GitHub repository.
 * Returns the commit SHA.
 */
export async function deleteFile(
  path: string,
  message: string
): Promise<string> {
  const { token, repo } = getConfig();
  const url = `${GITHUB_API}/repos/${repo}/contents/${path}`;

  // Need the file's SHA to delete it.
  const existing = await fetch(url, { headers: headers(token) });
  if (!existing.ok) {
    throw new Error(`File not found: ${path}`);
  }
  const { sha } = await existing.json();

  const res = await fetch(url, {
    method: "DELETE",
    headers: headers(token),
    body: JSON.stringify({
      message,
      sha,
      branch: "main",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub API error: ${res.status} ${err}`);
  }

  const data = await res.json();
  return data.commit.sha;
}

/**
 * Create or update a file using pre-encoded base64 content.
 * Used for binary files (images) that are already base64-encoded.
 */
export async function commitFileRaw(
  path: string,
  base64Content: string,
  message: string
): Promise<string> {
  const { token, repo } = getConfig();
  const url = `${GITHUB_API}/repos/${repo}/contents/${path}`;

  // Check if file already exists.
  let sha: string | undefined;
  const existing = await fetch(url, { headers: headers(token) });
  if (existing.ok) {
    const data = await existing.json();
    sha = data.sha;
  }

  const body: Record<string, string> = {
    message,
    content: base64Content,
    branch: "main",
  };
  if (sha) body.sha = sha;

  const res = await fetch(url, {
    method: "PUT",
    headers: headers(token),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub API error: ${res.status} ${err}`);
  }

  const data = await res.json();
  return data.commit.sha;
}
