## 0.8.1 - Release candidate security hardening

- Reject stale pre-existing render outputs and record before/after output evidence.
- Fail closed when Agent repair targets cannot be mapped to an explicit file scope.
- Replace string shell execution with guarded executable/argument specifications.
- Protect Studio APIs with a per-start session token plus loopback Host and Origin checks.
- Restrict Claude Code and Codex adapters to minimal tool, sandbox, plugin, and environment scopes.
- Add frame-count and timeout budgets for long-running visual analysis.
- Pin third-party GitHub Actions to full commit SHAs and verify release tags against package versions.
- Refresh the threat model and add adversarial regression tests.

# Changelog

All notable changes will be documented in this file.

## [Unreleased]

## [0.7.0] - 2026-08-02

### Added

- `frameproof doctor` with human-readable and machine-readable environment diagnostics.
- Optional Claude Code and Codex CLI discovery without making either Agent a scan dependency.
- Non-destructive `frameproof init` with Remotion detection, dry-run support, recommended config, acceptance file, disabled Manifest example, and optional GitHub/package scripts.
- `frameproof verify` for one-command report, Fix Packet, SARIF, JUnit, revision, and verification bundles.
- `frameproof baseline set|status` with explicit replacement protection and SHA-256 baseline receipts.
- Public onboarding, diagnosis, and verification APIs.
- Clean-package installation smoke test and npm OIDC Trusted Publishing workflow.

### Changed

- Package version updated to 0.7.0.
- Recommended onboarding is now `doctor → init → verify → baseline`.
- Release documentation uses npm Trusted Publishing with automatic provenance instead of a long-lived publish token.

### Safety

- Initialization skips existing generated files unless `--force` is explicit.
- Placeholder Manifest data is generated as an example and is not enabled automatically.
- Existing baselines are not replaced without `--force`.

## [0.6.0] - 2026-08-02

### Added

- Guarded repair sessions shared by Claude Code and Codex.
- Separate explicit approvals for Agent execution and renderer execution.
- Git working-tree checks, allowed-file containment, and unexpected-change blocking.
- Renderer-defined range previews, complete-video rerendering, and automatic FrameProof re-audit.
- Bounded repair loops that stop at human approval.
- Human approval receipts containing reviewer, reason, verification summary, Git evidence, changed-file SHA-256 values, and receipt hash.
- Studio and GitHub Action repair-plan generation without browser or CI Agent execution.

### Safety

- Repair workflows never commit, push, merge, publish, or approve automatically.
- A partial preview cannot satisfy final verification; the complete output must be rerendered and scanned.

## [0.5.0] - 2026-08-02

### Added

- Baseline/current report comparison with source-aware identity and normalized-time pairing.
- New, regressed, improved, unchanged, resolved, and accepted finding states.
- Reviewed acceptance files with fingerprint and semantic matching, reason, owner, and optional expiration.
- Revision JSON/HTML, GitHub-ready Markdown, SARIF 2.1.0, and JUnit XML outputs.
- Changed-frame filmstrip extraction from readable baseline and current videos.
- Studio baseline selection, revision metrics, changed-finding filters, resolved findings, and one-click acceptance persistence.
- GitHub Action inputs and outputs for baseline reports, acceptances, revision artifacts, SARIF, and JUnit.

### Changed

- JSON report schema upgraded to 2.1 and package version to 0.5.0.
- With a baseline, exit code 1 now represents new or regressed errors instead of all existing errors.
- Standard HTML reports display revision state and gate summary.

### Known limitations

- Pairing uses source identity, stable IDs, and normalized time; it does not perform optical-flow or edit-list alignment.
- Filmstrips require both report inputs to reference readable local videos, or an explicit baseline-video override.
- FrameProof generates PR Markdown but does not post persistent comments requiring repository write permission.
- Per-pixel baseline visual-difference thresholds remain a roadmap item.

## [0.4.0] - 2026-08-02

### Added

- Versioned FrameProof Render Manifest schema mapping frame intervals to compositions, sequences, regions, components, source files, and lines.
- Renderer-neutral Assertions SDK for expected motion, text, visibility, audio, and safe-area behavior.
- SRT, WebVTT, and JSON caption adapters with duration, reading-speed, line, overlap, range, and UI-collision checks.
- Final-export audio integrity checks for stream presence, unexpected silence, integrated loudness, and true peak.
- Dated platform preview overlays for TikTok, Instagram Reels, YouTube Shorts, and X.
- Agent-readable Fix Packets with source context, expected/actual values, suggested repairs, and reproduce/verify commands.
- Source-aware Studio controls, source panels, platform overlays, and repair-prompt copying for Claude Code and Codex.
- Remotion integration guide, manifest JSON schema, source-aware fixtures, and GitHub Action inputs.

### Changed

- JSON report schema upgraded to 2.0.
- Frame findings can now be enriched with source regions and semantic assertions.
- Studio and CLI report the same caption, audio, assertion, and source-mapping results.
- Package version updated to 0.4.0.

### Known limitations

- Manifest generation is explicit; automatic JSX/source-map instrumentation is not included yet.
- Text checks use declared layout metadata rather than OCR or browser-computed typography.
- Platform UI overlays are documented approximations and may vary by device or app version.
- Revision comparison and selective rerender orchestration remain roadmap items.

## [0.3.0] - 2026-08-02

### Added

- `frameproof studio`, a local Apple/Primer-inspired visual interface with no npm runtime dependencies.
- Drag-and-drop, file picker, and local-path input for videos.
- Recommended, Fast, Strict, and custom scan configurations.
- Per-rule enable and disable controls.
- Local report history, video preview, issue timeline, finding filters, command palette, theme and language settings.
- UI research rationale, visual screenshots, Studio operations documentation, and usability audit.
- Studio integration tests.

### Changed

- Individual rule groups can now be disabled through configuration and CLI flags.
- The result view now has a distinct page title and clearer navigation state.
- Package version updated to 0.3.0.

## [0.2.1] - 2026-08-02

### Added

- Root `AGENTS.md` for Codex and `CLAUDE.md` for Claude Code.
- Cross-agent compatibility and maintenance documentation.
- Automated compatibility validator and tests.

### Changed

- Installation documentation targets `claude-code` and `codex` from one canonical Agent Skill.
- Agent-facing wording and JSON contract explicitly cover both agents.

## [0.2.0] - 2026-08-02

### Added

- GitHub composite Action with JSON and HTML report outputs.
- `generated-video-auditor` Agent Skill compatible with the open `SKILL.md` ecosystem.
- `x-video` and `x-ad` platform presets.
- Container, codec, pixel-format, audio-codec, maximum-FPS, duration, and file-size checks.
- Expanded FFprobe metadata in JSON and HTML reports.
- Platform preset and competitive-positioning documentation.

### Changed

- Repositioned FrameProof as a CI quality gate for AI-generated and programmatic video.

## [0.1.0] - 2026-08-02

### Added

- Initial deterministic video and image-sequence scanner.
- Aspect ratio, blank-frame, frozen-run, and edge-activity checks.
- JSON and standalone HTML reports.
- Cross-platform CI, tests, documentation, and contribution templates.
