$ErrorActionPreference = "Stop"
if (-not (Test-Path "package.json")) {
  throw "Run this script from the package root."
}
npm whoami --registry=https://registry.npmjs.org | Out-Null
npm run check
npm run check:package
npm publish --access public --tag beta --registry=https://registry.npmjs.org
Write-Host "Initial npm beta published. Configure npm Trusted Publisher for yocchi12345jp/frameproof-video-qa and .github/workflows/publish.yml before publishing the draft GitHub Release."
