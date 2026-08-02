$ErrorActionPreference = "Stop"
$repo = "yocchi12345jp/frameproof-video-qa"

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  throw "GitHub CLI is required. Run: gh auth login"
}

$labels = @(
  @{ Name = "testing"; Color = "5319E7"; Description = "Tests, fixtures, and reproducibility" },
  @{ Name = "platform"; Color = "1D76DB"; Description = "Platform-specific rules and presets" },
  @{ Name = "remotion"; Color = "8A2BE2"; Description = "Remotion integration" },
  @{ Name = "captions"; Color = "FBCA04"; Description = "Subtitle and caption auditing" },
  @{ Name = "security"; Color = "B60205"; Description = "Security, approvals, and resource controls" },
  @{ Name = "agents"; Color = "0E8A16"; Description = "Claude Code, Codex, and Agent Skill integration" },
  @{ Name = "repair-loop"; Color = "D4C5F9"; Description = "Guarded repair sessions and verification" },
  @{ Name = "visual-regression"; Color = "C2E0C6"; Description = "Baseline comparison and visual differences" }
)

foreach ($label in $labels) {
  gh label create $label.Name --repo $repo --color $label.Color --description $label.Description --force
}

gh issue create --repo $repo --title "Smoke-test the published skill with Claude Code" --label "agents,testing,help wanted" --body "Install the published generated-video-auditor skill into Claude Code, run a guarded repair session in a tiny generated fixture repository, and document the exact client version, permission prompts, commands, and result. Do not include private media or credentials."
gh issue create --repo $repo --title "Smoke-test the published skill with Codex" --label "agents,testing,help wanted" --body "Install the published generated-video-auditor skill into Codex, run a guarded repair session in a tiny generated fixture repository, and document the exact client version, approval behavior, commands, and result. Do not include private media or credentials."
gh issue create --repo $repo --title "Add a deterministic Remotion range-preview adapter example" --label "remotion,repair-loop,help wanted" --body "Create a public Remotion fixture and a project-local render:range wrapper that consumes FrameProof fromFrame/toFrame/output tokens. The example must still perform a full render for final verification."
gh issue create --repo $repo --title "Add Git commit and changed-source metadata to revision reports" --label "visual-regression,enhancement" --body "Attach optional baseline/current Git commit IDs and a changed-source summary without making Git mandatory for ordinary file-only scans. Add tests for absent, shallow, and detached repositories."
gh issue create --repo $repo --title "Prototype opt-in per-frame visual mismatch thresholds" --label "visual-regression,testing" --body "Design a deterministic opt-in comparison for selected source-mapped regions. Avoid presenting a pixel threshold as creative-quality judgment. Include generated fixtures and false-positive analysis."
gh issue create --repo $repo --title "Validate platform presets and UI overlays with public fixtures" --label "platform,testing,help wanted" --body "Create dated, generated compliant and non-compliant fixtures for supported platform profiles and document device/app assumptions. Do not commit copyrighted production media."
gh issue create --repo $repo --title "Collect minimal repair-loop safety fixtures" --label "security,repair-loop,testing,help wanted" --body "Add public fixtures for dirty-tree denial, unexpected-file blocking, Agent timeout, renderer failure, max iterations, and human approval receipts. Each fixture should be tiny and deterministic."
