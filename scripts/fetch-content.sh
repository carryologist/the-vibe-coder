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
git clone --depth 1 \
  "https://x-access-token:${GITHUB_TOKEN}@github.com/${CONTENT_REPO}.git" \
  "$TMPDIR"

# Overlay content into the build tree.
mkdir -p content public/images
cp -r "$TMPDIR/content/"* content/
[ -d "$TMPDIR/blog-drafts" ] && cp -r "$TMPDIR/blog-drafts" .
[ -d "$TMPDIR/public/images" ] && cp -r "$TMPDIR/public/images/"* public/images/

rm -rf "$TMPDIR"
echo "[fetch-content] Content fetched."
