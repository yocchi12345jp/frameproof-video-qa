#!/usr/bin/env bash
set -euo pipefail

[ -f package.json ] || { echo "Run this script from the package root." >&2; exit 1; }
npm whoami --registry=https://registry.npmjs.org >/dev/null
npm run check
npm run check:package
npm publish --access public --tag beta --registry=https://registry.npmjs.org

echo "Initial npm beta published. Configure npm Trusted Publisher for yocchi12345jp/frameproof-video-qa and .github/workflows/publish.yml before publishing the draft GitHub Release."
