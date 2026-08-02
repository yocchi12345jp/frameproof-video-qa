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

## v0.4 — Source-aware generated video

- [ ] Remotion render manifest schema
- [ ] Frame interval to `<Sequence>` and source-file mapping
- [ ] Expected-motion annotations
- [ ] Caption data adapter for SRT, VTT, and Remotion captions
- [ ] Caption duration, line-count, reading-speed, and overlap rules
- [ ] JUnit and SARIF output

## v0.5 — Visual regression

- [ ] Baseline video or checkpoint comparison
- [ ] Per-frame mismatch thresholds
- [ ] Diff image and filmstrip artifacts
- [ ] Baseline approval workflow
- [ ] Changed-frame summary for pull requests

## v0.6 — Repair loop

- [ ] Agent-oriented suggested-action schema
- [ ] Stable source-location fields
- [ ] Claude Code and Codex repair workflow reference implementations
- [ ] Rerender and verify orchestration

## Community milestones

- [ ] First external issue
- [ ] First external pull request
- [ ] First third-party GitHub Action installation
- [ ] First Claude Code installation and first Codex installation reported by external users
- [ ] First npm release
- [ ] Public false-positive fixture set
