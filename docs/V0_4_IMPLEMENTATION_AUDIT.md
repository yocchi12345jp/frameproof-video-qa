# FrameProof v0.4.0 implementation audit

Date: 2026-08-02  
Scope: source-aware verification MVP

## Implemented surface

- Render Manifest schema `1.0`
- JSON report schema `2.0`
- frame interval to composition, sequence, component, region, file, line, and column mapping
- builder and no-op JSX-compatible Assertions SDK
- expected motion, declared text, visibility, audio, and safe-area assertions
- SRT, WebVTT, and supported JSON caption adapters
- caption duration, CPS, line, overlap, gap, range, and declared-region collision checks
- final-export audio presence, silence, integrated loudness, and true-peak checks
- dated platform preview overlays with sources and assumptions
- deterministic Fix Packets for Claude Code, Codex, and human review
- Studio source controls, preview overlays, source panel, and repair-prompt actions
- GitHub Action source-aware inputs and outputs

## Automated verification

- `npm run check`: passed
- Node.js syntax checks: passed
- release metadata validation: passed
- Claude Code and Codex compatibility validation: passed
- unit and integration tests: 25 passed, 0 failed
- real FFmpeg source-aware fixture scan: passed
- source mapping to `src/scenes/CtaScene.tsx:42`: confirmed
- caption/UI collision finding: confirmed
- expected-motion failure: confirmed
- final-export silence interval: confirmed
- Fix Packet generation: 10 packets from 10 findings in the demo fixture

## Browser and interaction audit

Viewport checks:

- desktop: 1440×1000
- mobile: 390×844

Results:

- browser console errors: 0
- page/script errors: 0
- desktop horizontal overflow: 0
- mobile horizontal overflow: 0
- source panel visible: confirmed
- Fix Packet, Claude Code, and Codex actions visible: confirmed
- Japanese source-aware workflow: confirmed
- English source-aware labels: no visible Japanese text remained

The managed Chromium environment blocked direct navigation to localhost. Server/API behavior was tested independently against the real localhost service. Visual and interaction checks used the shipping HTML, CSS, and JavaScript with only localStorage and API responses replaced by deterministic in-page fixtures.

## Demonstration fixture

Input:

- 320×180 H.264/AAC video
- 10 fps, 2 seconds
- explicit CTA source region
- intentionally undersized 22 px text against a 32 px expectation
- three declared lines against a two-line maximum
- overlapping and fast captions
- an intentional final-export silence interval

Observed:

- errors: 6
- warnings: 4
- source-aware findings: mapped
- Fix Packets: 10

## Known limitations

- Manifest generation is explicit; automatic JSX/source-map instrumentation is not implemented.
- Text checks use declared style metadata; they do not yet inspect browser-computed typography or OCR.
- Audio analysis does not yet provide per-channel dialogue presence or a dedicated clipping detector.
- Platform overlays are dated approximations and may differ by device, locale, caption length, or app release.
- Revision comparison, accepted-finding inheritance, selective rerendering, and automatic repair execution are not included.
- Claude Code and Codex prompts are generated, but FrameProof does not silently apply or approve source changes.

## Release decision

The v0.4.0 MVP is suitable for public beta publication after CI runs on GitHub-hosted Windows, macOS, and Linux and the package is tested through the public npm registry. It should not be presented as a complete broadcast-QC suite or autonomous creative reviewer.
