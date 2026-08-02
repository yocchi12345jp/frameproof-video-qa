# Publication checklist

## Repository settings

- [ ] Repository is public.
- [ ] Description says: `Source-aware verification, production preflight, render-health receipts, revision gates, and guarded repair loops for AI-generated and programmatic video.`
- [ ] Topics include `ai-video`, `video`, `ffmpeg`, `visual-testing`, `remotion`, `agent-skills`, `quality-assurance`, and `github-actions`.
- [ ] Issues and Discussions are enabled.
- [ ] Default branch is `main`.
- [ ] Branch protection requires passing CI before merge.
- [ ] Secret scanning and Dependabot alerts are enabled.
- [ ] The `npm` environment exists and requires a human reviewer.

## Release readiness

- [ ] `npm run check` passes locally.
- [ ] `npm run check:package` passes from a clean temporary installation.
- [ ] GitHub Actions pass on Windows, macOS, and Linux.
- [ ] Local-action smoke test passes on Ubuntu.
- [ ] `frameproof doctor` succeeds on a clean machine.
- [ ] `frameproof init --dry-run` and real initialization are reviewed.
- [ ] `frameproof preflight` checks dependencies, declared inputs, disk, permissions, and Git state.
- [ ] `frameproof render run` creates a valid JSON/HTML receipt with output SHA-256.
- [ ] `frameproof verify` writes the complete stable artifact bundle.
- [ ] Baseline set/status and SHA-256 receipt are reviewed.
- [ ] `npx skills add . --list` discovers `generated-video-auditor`.
- [ ] The skill installs with both `--agent claude-code` and `--agent codex`.
- [ ] `npm run check:agents` succeeds.
- [ ] A real Remotion output has been scanned with a Render Manifest and Fix Packets.
- [ ] Repair session is exercised with installed Claude Code and installed Codex in separate clean test repositories.
- [ ] Agent and renderer approval gates, unexpected-file blocking, full-video verification, and human receipt are manually reviewed.
- [ ] Caption, audio, and source-aware false positives are documented.
- [ ] `v0.8.1` Git tag and GitHub Release are published.
- [ ] npm Trusted Publisher exactly matches repository and `publish.yml`.
- [ ] npm package is published through OIDC with provenance.
- [ ] `v0` major Action tag points to the verified release commit.

## Community readiness

- [ ] At least three contribution-ready issues are open.
- [ ] Response expectations are stated in the README or Discussions.
- [ ] Minimal compliant and failing fixtures can be reproduced with FFmpeg commands.
- [ ] External users have a place to share false-positive frame sequences.
- [ ] Changelog and roadmap are current.
