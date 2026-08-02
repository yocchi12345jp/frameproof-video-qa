#!/usr/bin/env bash
set -euo pipefail

command -v git >/dev/null || { echo "Git is required." >&2; exit 1; }
command -v gh >/dev/null || { echo "GitHub CLI is required. Install it and run: gh auth login" >&2; exit 1; }
[ -f package.json ] || { echo "Run this script from the frameproof-video-qa directory." >&2; exit 1; }

gh auth status
npm run check
npm run check:package

if [ ! -d .git ]; then
  git init -b main
  git add .
  git commit -m "feat: release FrameProof Video QA v0.8.1"
fi

if ! git remote get-url origin >/dev/null 2>&1; then
  gh repo create yocchi12345jp/frameproof-video-qa \
    --public \
    --source . \
    --remote origin \
    --push \
    --description "Source-aware verification, production preflight, render-health receipts, revision gates, and guarded repair loops for AI-generated and programmatic video."
else
  git push -u origin main
fi

gh repo edit yocchi12345jp/frameproof-video-qa \
  --enable-issues \
  --enable-discussions \
  --add-topic video \
  --add-topic ffmpeg \
  --add-topic visual-testing \
  --add-topic remotion \
  --add-topic ai-video \
  --add-topic agent-skills \
  --add-topic quality-assurance \
  --add-topic github-actions

git tag -f v0.8.1
git push origin refs/tags/v0.8.1 --force

git tag -f v0
git push origin refs/tags/v0 --force

if gh release view v0.8.1 >/dev/null 2>&1; then
  gh release edit v0.8.1 --draft
else
  gh release create v0.8.1 \
    --draft \
    --title "FrameProof Video QA v0.8.1" \
    --notes "Public beta candidate. The release remains a draft until the initial npm beta publish and npm Trusted Publisher configuration are complete."
fi

echo "GitHub source published. Draft release created: https://github.com/yocchi12345jp/frameproof-video-qa/releases"
echo "Next: authenticate to npm and run ./publish-first-npm.sh, configure npm Trusted Publisher, then publish the draft GitHub Release."
