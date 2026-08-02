# Roadmap

## v0.1 — Core deterministic audit

- [x] Direct MP4, MOV, WebM, and FFmpeg image-sequence input
- [x] Aspect-ratio validation
- [x] Blank-frame detection
- [x] Frozen-run detection
- [x] Edge-activity heuristic
- [x] JSON and HTML reports
- [x] CI-friendly exit codes
- [x] Unit and FFmpeg integration tests

## v0.2 — Distribution and platform profiles

- [x] First-party GitHub composite Action
- [x] Open Agent Skill for generated-video auditing
- [x] Shared Claude Code and Codex compatibility layer
- [x] `x-video` compatibility preset
- [x] `x-ad` technical preset
- [x] Container, codec, pixel-format, audio-codec, FPS, duration, and size checks
- [x] Explicit competitive positioning
- [ ] External fixture validation for X presets
- [ ] First npm release with provenance

## v0.3 — Local Studio and intuitive configuration

- [x] Local browser-based Studio with no npm runtime dependencies
- [x] Recommended, Fast, Strict, and custom modes
- [x] Drag-and-drop, file picker, and direct path input
- [x] Visual rule controls with progressive disclosure
- [x] Report history, issue timeline, and finding detail
- [x] Light, dark, system, Japanese, and English settings
- [x] Command palette and keyboard shortcuts
- [ ] External usability sessions and documented findings

## v0.4 — Source-aware verification

- [x] Versioned Remotion render manifest schema
- [x] Frame interval to Composition, `<Sequence>`, component, and source-file mapping
- [x] Expected-motion, text-size, visibility, audio, and safe-area assertions
- [x] SRT, VTT, and Remotion caption-data adapters
- [x] Caption duration, CPS, line-count, gap, overlap, range, and collision rules
- [x] Audio presence, loudness, true-peak, and unexpected-silence checks
- [ ] Per-channel dialogue presence and clipping detection
- [x] Agent Fix Packet shared by Claude Code and Codex
- [x] TikTok, Reels, Shorts, and X UI-overlay preview profiles with dated sources

## v0.5 — Revision and visual regression

- [x] Source/identifier-aware baseline pairing with normalized-time alignment
- [x] New, regressed, improved, unchanged, resolved, and accepted classification
- [x] Accepted finding inheritance with fingerprints, semantic matching, owners, reasons, and expiration
- [ ] Per-frame visual mismatch thresholds
- [x] Representative baseline/current filmstrip artifacts
- [ ] Git commit metadata and changed-source summary
- [x] GitHub-ready Markdown and Step Summary output
- [ ] Persistent pull-request comment posting and update ownership
- [x] JUnit XML and GitHub-compatible SARIF 2.1.0 output

## v0.6 — Guarded repair loop

- [x] Shared Claude Code and Codex Fix Packet schema
- [x] Stable source-location and suggested-action schema
- [x] Executable Claude Code and Codex repair adapters
- [x] Renderer-defined selective preview orchestration
- [x] Complete-video rerender and automatic re-audit
- [x] Bounded iteration and explicit human approval gate
- [x] Git change containment and hashed approval receipts
- [ ] Real installed Claude Code and Codex sessions in public clean repositories

## v0.7 — Adoption and repeatable project workflow

- [x] Human and JSON environment diagnostics
- [x] Remotion/generic project detection
- [x] Non-destructive project initialization and dry-run
- [x] One-command verification artifact bundle
- [x] Reviewed-baseline promotion and SHA-256 receipt
- [x] Optional generated GitHub workflow and package scripts
- [x] Clean-package installation smoke test
- [x] npm OIDC Trusted Publishing workflow and documentation
- [ ] GitHub-hosted Windows, macOS, and Linux validation
- [ ] First external onboarding session

## v0.8 — Production preflight and render health

- [ ] Render Health Advisor for logs, stalls, decoding, I/O, cache, and concurrency
- [ ] Font, asset, dependency, and duration preflight
- [ ] Render receipt with input/output hashes and review status
- [ ] Git commit metadata and changed-source summary
- [ ] Optional C2PA provenance integration
- [ ] Optional local OCR/vision plugin
- [ ] Human creative-review checklist for hook, pacing, tone, and narrative coherence

## Deliberate non-goals

- Full broadcast, MXF, IMF, and Dolby Vision compliance suite
- Generic video editing MCP replacement
- Mandatory cloud OCR or media upload
- Automated legal/copyright clearance
- A single AI score for subjective creative quality

## Community milestones

- [ ] First external issue
- [ ] First external pull request
- [ ] First third-party GitHub Action installation
- [ ] First Claude Code installation and first Codex installation reported by external users
- [ ] First npm release
- [ ] Public false-positive fixture set
- [ ] First external source-aware Remotion integration
- [ ] First external revision-comparison workflow
