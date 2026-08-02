# Architecture

FrameProof separates media decoding, deterministic measurements, declared creative intent, source mapping, policy checks, repair context, reporting, and distribution adapters.

## Verification pipeline

1. FFprobe reads video, audio, container, duration, size, stream, and encoding metadata.
2. FFmpeg decodes the visual stream to deterministic 64×64 grayscale raw frames.
3. Node.js calculates luminance, variance, edge-margin activity, and a compact frame fingerprint.
4. Core frame and platform checks emit renderer-neutral findings.
5. Optional caption adapters normalize SRT, WebVTT, and JSON timing data and audit reading/layout rules.
6. Optional audio checks inspect the final export for stream presence, silence, integrated loudness, and true peak.
7. An optional Render Manifest maps frames and semantic regions to compositions, sequences, components, source files, and assertions.
8. Manifest assertion checks compare measured or declared behavior with expected motion, text, visibility, audio, and safe-area intent.
9. Findings are enriched with source context and converted to deterministic Fix Packets.
10. Optional repair sessions select source-mapped findings, constrain editable files, and define renderer preview/full-render commands.
11. Explicitly approved Agent execution records Git state and blocks unexpected file changes.
12. A full rendered video is rescanned and compared with the pre-repair report; success stops at human approval.
13. Console, JSON, HTML, Studio, GitHub Action, Claude Code, and Codex consume the same evidence contracts.

## Core modules

| Module | Responsibility |
|---|---|
| `src/ffmpeg.js` | FFmpeg/FFprobe process execution and media probing |
| `src/scan.js` | orchestration and report assembly |
| `src/manifest.js` | manifest schema, validation, normalization, and frame-to-source mapping |
| `src/assertions.js` | renderer-neutral builder and no-op JSX-compatible assertion API |
| `src/assertion-checks.js` | semantic intent verification |
| `src/captions.js` | caption parsing and deterministic timing/layout checks |
| `src/audio.js` | final-export silence and loudness analysis |
| `src/platform-overlays.js` | dated, sourced platform preview profiles |
| `src/fix-packet.js` | agent-readable finding-level repair contract |
| `src/repair.js` | guarded repair session, Agent adapters, Git containment, render orchestration, re-audit, and approval receipts |
| `src/report/` | console, JSON, revision, repair, SARIF, JUnit, Markdown, and standalone HTML presentation |
| `src/studio-server.js` | local visual application adapter |

## Why FFmpeg

FFmpeg supports the output of most video renderers and avoids coupling FrameProof to a single framework. It also allows the npm package to ship with zero npm runtime dependencies.

## Source-awareness boundary

The core scanner remains useful for any FFmpeg-compatible output. Source awareness is opt-in through a versioned Render Manifest. A renderer adapter may generate this manifest without changing the scanner.

The initial Remotion integration is explicit rather than magical: projects create regions and assertions through the builder or no-op components. Automatic JSX/source-map instrumentation is a later adapter concern.

## Determinism

No random sampling, model call, external API, telemetry, or hidden cloud service participates in the core scan. Frames are decoded in timeline order and analyzed with fixed calculations.

The JSON `generatedAt` timestamp is intentionally non-deterministic metadata. Findings, thresholds, source mapping, Fix Packets, frame metrics, and exit status are deterministic for the same decoder version, input, manifest, captions, and configuration.

## Privacy boundary

The scanner starts local FFmpeg and FFprobe processes. It does not send frame bytes, reports, filenames, source locations, or metrics over the network.

Claude Code, Codex, or another compatible agent may consume a Fix Packet, but agent execution remains outside the scanner's local privacy boundary and requires the user's configured agent permissions.

## Platform boundary

Technical platform presets are policy objects. UI overlays are dated preview approximations with source URLs and assumptions. Neither is presented as a permanent representation of an external platform.

## Human approval boundary

FrameProof can identify, locate, and describe a likely defect. It does not silently modify code, declare subjective creative quality, or publish a render. Repair and release remain explicit human-controlled gates.

## Guarded execution boundary

Scanning, comparison, report viewing, and Studio planning never invoke a coding Agent. Only the explicit repair CLI may execute an Agent or renderer command, and each category requires its own approval flag. The session records the project Git head, changed files, textual diff hash, attempts, render outputs, verification evidence, and human approval receipt.

Selective previews are delegated to a user-supplied renderer command template because renderers and projects expose different range-render interfaces. The full output remains the only final verification target.
