#!/usr/bin/env bash
set -euo pipefail

CONTENT_REPO="${GITHUB_CONTENT_REPO:-carryologist/the-vibe-coder-content}"

# Skip if content is already present (local dev with manual clone).
if [ -d "content/posts" ] && [ "$(ls -A content/posts 2>/dev/null)" ]; then
  echo "[fetch-content] content/posts/ already present, skipping."
  exit 0
fi

if [ -z "${GITHUB_TOKEN:-}" ]; then
  echo "[fetch-content] GITHUB_TOKEN not set. Cannot fetch private content."
  echo "[fetch-content] For local dev, clone the content repo manually:"
  echo "  git clone git@github.com:${CONTENT_REPO}.git /tmp/vibe-content"
  echo "  cp -r /tmp/vibe-content/content ./content"
  echo "  cp -r /tmp/vibe-content/public/images ./public/images"
  exit 1
fi

echo "[fetch-content] Cloning ${CONTENT_REPO}..."
TMPDIR=$(mktemp -d)
# Always clean up: the clone tree is credential-adjacent and "set -e"
# used to leave it behind on any failure after this point.
trap 'rm -rf "$TMPDIR"' EXIT

# Authenticate with an HTTP header supplied through git's environment-based
# config (GIT_CONFIG_*) rather than embedding the token in the remote URL.
# A URL-embedded token is visible in /proc/<pid>/cmdline, is written into
# $TMPDIR/.git/config, and is echoed back by git's own error output on a
# failed clone, which lands it in build logs.
GIT_AUTH_HEADER="AUTHORIZATION: basic $(printf 'x-access-token:%s' "$GITHUB_TOKEN" | base64 | tr -d '\n')"
GIT_CONFIG_COUNT=1 \
GIT_CONFIG_KEY_0="http.https://github.com/.extraheader" \
GIT_CONFIG_VALUE_0="$GIT_AUTH_HEADER" \
  git clone --depth 1 \
    "https://github.com/${CONTENT_REPO}.git" \
    "$TMPDIR"

# Overlay content into the build tree.
mkdir -p content public/images
cp -r "$TMPDIR/content/"* content/
[ -d "$TMPDIR/blog-drafts" ] && cp -r "$TMPDIR/blog-drafts" .
[ -d "$TMPDIR/public/images" ] && cp -r "$TMPDIR/public/images/"* public/images/

echo "[fetch-content] Content fetched."
