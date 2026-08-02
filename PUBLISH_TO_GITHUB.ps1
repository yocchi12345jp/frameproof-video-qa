$ErrorActionPreference = "Stop"

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  throw "Git is required. Install Git for Windows first."
}
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  throw "GitHub CLI is required. Install it from https://cli.github.com/ and run: gh auth login"
}
if (-not (Test-Path "package.json")) {
  throw "Run this script from the frameproof-video-qa directory."
}

gh auth status
npm run check
npm run check:package

if (-not (Test-Path ".git")) {
  git init -b main
  git add .
  git commit -m "feat: release FrameProof Video QA v0.8.1"
}

$origin = $null
try { $origin = git remote get-url origin 2>$null } catch { $origin = $null }
if (-not $origin) {
  gh repo create yocchi12345jp/frameproof-video-qa `
    --public `
    --source . `
    --remote origin `
    --push `
    --description "Source-aware verification, production preflight, render-health receipts, revision gates, and guarded repair loops for AI-generated and programmatic video."
} else {
  git push -u origin main
}

gh repo edit yocchi12345jp/frameproof-video-qa `
  --enable-issues `
  --enable-discussions `
  --add-topic video `
  --add-topic ffmpeg `
  --add-topic visual-testing `
  --add-topic remotion `
  --add-topic ai-video `
  --add-topic agent-skills `
  --add-topic quality-assurance `
  --add-topic github-actions

git tag -f v0.8.1
git push origin refs/tags/v0.8.1 --force

git tag -f v0
git push origin refs/tags/v0 --force

$releaseExists = $true
try { gh release view v0.8.1 | Out-Null } catch { $releaseExists = $false }
if ($releaseExists) {
  gh release edit v0.8.1 --draft
} else {
  gh release create v0.8.1 `
    --draft `
    --title "FrameProof Video QA v0.8.1" `
    --notes "Public beta candidate. The release remains a draft until the initial npm beta publish and npm Trusted Publisher configuration are complete."
}

Write-Host "GitHub source published. Draft release created."
Write-Host "Next: authenticate to npm, run .\PUBLISH_FIRST_NPM.ps1, configure npm Trusted Publisher, then publish the draft GitHub Release."
