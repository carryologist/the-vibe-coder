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
 * Build a Contents API URL with each path segment percent-encoded.
 *
 * The path used to be interpolated raw, so a filename containing `?`,
 * `#`, or an encoded separator could alter or truncate the request URL.
 */
function contentsUrl(repo: string, path: string): string {
  const encoded = path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `${GITHUB_API}/repos/${repo}/contents/${encoded}`;
}

/**
 * Raised when a write is rejected because the file changed (or appeared)
 * since the caller read it. Callers surface this as a 409 rather than
 * silently overwriting someone else's edit.
 */
export class GitHubConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GitHubConflictError";
  }
}

export interface CommitOptions {
  /**
   * Optimistic concurrency precondition:
   *   - a SHA string: the write only lands if the file still has it
   *   - null:         the write only lands if the file does not exist
   *   - undefined:    no precondition, last write wins (legacy upsert)
   *
   * Without this, every write re-read the current SHA immediately
   * before the PUT, so a concurrent edit was always silently clobbered.
   */
  expectedSha?: string | null;
}

async function putContents(
  path: string,
  base64Content: string,
  message: string,
  options: CommitOptions
): Promise<string> {
  const { token, repo } = getConfig();
  const url = contentsUrl(repo, path);

  const body: Record<string, string> = {
    message,
    content: base64Content,
    branch: "main",
  };

  if (options.expectedSha === undefined) {
    // No precondition: read the current SHA so an existing file is
    // updated rather than rejected.
    const existing = await fetch(url, {
      headers: headers(token),
      cache: "no-store",
    });
    if (existing.ok) {
      const data = await existing.json();
      if (data.sha) body.sha = data.sha;
    }
  } else if (options.expectedSha !== null) {
    // GitHub rejects a stale SHA with 409.
    body.sha = options.expectedSha;
  }
  // expectedSha === null: send no SHA at all. GitHub rejects the write
  // with 422 if the file already exists, which is exactly the
  // "create only" precondition we want.

  const res = await fetch(url, {
    method: "PUT",
    headers: headers(token),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    if (res.status === 409 || (res.status === 422 && options.expectedSha === null)) {
      throw new GitHubConflictError(
        `${path} changed since it was read (GitHub returned ${res.status})`
      );
    }
    throw new Error(`GitHub API error: ${res.status} ${err}`);
  }

  const data = await res.json();
  return data.commit.sha;
}

/**
 * Create or update a file in the GitHub repository.
 * Returns the commit SHA.
 */
export async function commitFile(
  path: string,
  content: string,
  message: string,
  options: CommitOptions = {}
): Promise<string> {
  return putContents(
    path,
    Buffer.from(content).toString("base64"),
    message,
    options
  );
}

/**
 * Create or update a file using pre-encoded base64 content.
 * Used for binary files (images) that are already base64-encoded.
 */
export async function commitFileRaw(
  path: string,
  base64Content: string,
  message: string,
  options: CommitOptions = {}
): Promise<string> {
  return putContents(path, base64Content, message, options);
}

/**
 * Read a file from the GitHub repository. Returns the decoded content
 * or null if the file doesn't exist.
 */
export async function readFile(path: string): Promise<string | null> {
  return (await readFileWithSha(path))?.content ?? null;
}

/**
 * Read a file along with its blob SHA, so the caller can pass the SHA
 * back to commitFile as a precondition and detect a concurrent edit.
 */
export async function readFileWithSha(
  path: string
): Promise<{ content: string; sha: string } | null> {
  const { token, repo } = getConfig();
  const url = contentsUrl(repo, path);

  const res = await fetch(url, {
    headers: headers(token),
    cache: "no-store",
  });

  if (!res.ok) return null;

  const data = await res.json();
  if (typeof data?.content !== "string" || typeof data?.sha !== "string") {
    return null;
  }
  return {
    content: Buffer.from(data.content, "base64").toString("utf-8"),
    sha: data.sha,
  };
}

/**
 * Read-modify-write a file with an optimistic-concurrency retry.
 *
 * `transform` receives the current content and returns the new content,
 * or null to skip the write. If another writer commits in between, the
 * transform is re-applied to the fresh content rather than overwriting
 * their change.
 */
export async function updateFile(
  path: string,
  message: string,
  transform: (current: string) => string | null,
  attempts = 3
): Promise<string | null> {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const current = await readFileWithSha(path);
    if (!current) return null;

    const next = transform(current.content);
    if (next === null) return null;

    try {
      return await commitFile(path, next, message, {
        expectedSha: current.sha,
      });
    } catch (error) {
      if (error instanceof GitHubConflictError && attempt < attempts - 1) {
        continue;
      }
      throw error;
    }
  }
  throw new GitHubConflictError(`${path} kept changing while writing`);
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
  const url = contentsUrl(repo, path);

  // Need the file's SHA to delete it.
  const existing = await fetch(url, {
    headers: headers(token),
    cache: "no-store",
  });
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
    if (res.status === 409) {
      throw new GitHubConflictError(
        `${path} changed before it could be deleted`
      );
    }
    throw new Error(`GitHub API error: ${res.status} ${err}`);
  }

  const data = await res.json();
  return data.commit.sha;
}
