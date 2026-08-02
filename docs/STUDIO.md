# FrameProof Studio

FrameProof Studio is the local visual interface for file-only and source-aware video verification. It uses Node.js built-ins and browser APIs, keeps media on the workstation, and calls the same scanner used by the CLI and GitHub Action.

## Start

```bash
npx frameproof-video-qa studio
```

The default address is `http://127.0.0.1:4318`. Reports are written to `.frameproof/reports` in the current working directory.

```bash
frameproof studio --port 4400
frameproof studio --no-open
```

On Windows, the source distribution also includes `START_STUDIO.cmd`.

## Main workflow

1. Drop a video, use the file picker, or register an absolute local path.
2. Keep Recommended mode or choose Fast / Strict.
3. Optionally add a FrameProof Render Manifest and an SRT, WebVTT, or JSON caption file.
4. Enable final-export audio analysis when required.
5. Choose a platform preset and optional UI preview overlay.
6. Run the scan.
7. Select a finding to seek the local preview to the affected time.
8. Inspect the mapped component, source file, expected/actual values, and Fix Packet.
9. Copy a Claude Code or Codex repair prompt, rerender, and rescan.
10. Open or download JSON, HTML, and Fix Packet reports.

## Modes

### Recommended

- complete frame scan;
- 2.5-second frozen-run threshold;
- 5% outer safe margin;
- 8% edge-activity threshold;
- caption checks when a sidecar is supplied;
- manifest assertions when a manifest is supplied;
- warnings do not fail the run.

### Fast

- first 600 decoded frames;
- 3-second frozen-run threshold;
- edge-activity check disabled;
- intended for iteration, not final publishing approval.

### Strict

- complete frame scan;
- 1.5-second frozen-run threshold;
- 8% outer safe margin;
- 5% edge-activity threshold;
- warnings are treated as failures in the Studio result state.

## Source-aware inputs

### Render Manifest

The manifest maps frame ranges and semantic regions back to:

- composition and sequence identifiers;
- component and region identifiers;
- source file, line, and column;
- normalized bounding boxes;
- declared text/layout metadata;
- expected motion, visibility, audio, and safe-area behavior.

See [`REMOTION_INTEGRATION.md`](REMOTION_INTEGRATION.md) and [`frameproof-manifest.schema.json`](frameproof-manifest.schema.json).

### Captions

Studio accepts SRT, WebVTT, and supported JSON caption formats. Findings cover cue duration, reading speed, line count, line length, overlap, gaps, video-range overflow, and collisions with declared UI/CTA regions.

### Audio

Audio analysis runs against the final export and can detect a missing audio stream, long unexpected silence, integrated loudness outside policy, and unsafe true peak. Generic silence reporting is optional; manifest `ExpectAudio` assertions can define intervals where sound is required.

## Platform preview

Studio can overlay approximate TikTok, Instagram Reels, YouTube Shorts, and X interface obstruction zones. Each profile includes a checked date, source URL, and assumptions. These previews are not pixel-perfect guarantees for every device or app release.

## Repair workflow

Every source-aware finding can produce a deterministic Fix Packet containing:

- rule and severity;
- affected frames and timestamps;
- mapped source location;
- expected and actual values;
- suggested repair actions;
- reproduce and verify commands.

The same packet is used by the Claude Code and Codex buttons. FrameProof does not silently edit source code or approve its own repair.

## Privacy and security

- Binds to `127.0.0.1` by default.
- Does not enable CORS.
- Uses a restrictive Content Security Policy.
- Makes no network request from the scanner path.
- Browser-selected files are transferred only to the local Node.js process and stored in the operating-system temporary directory.
- Reports remain in the local `.frameproof/reports` directory.
- Source files are referenced in reports but are not served or opened through an unrestricted file endpoint.

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Cmd/Ctrl + N` | new scan |
| `Cmd/Ctrl + K` | command palette |
| `Cmd/Ctrl + Enter` | run current scan |
| `Esc` | close an open dialog |

## Architecture

- `src/studio-server.js`: localhost server, upload stream, local-path registration, media range responses, source-aware scans, and report persistence;
- `studio/index.html`: semantic application shell;
- `studio/styles.css`: adaptive tokens and responsive styling;
- `studio/app.js`: state, localization, source-aware inputs, platform overlays, result timeline, repair prompts, keyboard commands, and local preferences.

Studio calls the same `loadConfig()` and `scanInput()` functions as the CLI, so visual and command-line reports share one deterministic engine.

## Repair-plan generation

When a source-aware result has repairable errors, Studio can generate a guarded repair session for Claude Code or Codex. The user supplies or confirms the project root and optional renderer command templates. Studio writes the session, prompt, commands, and standalone repair HTML under the report directory.

Studio deliberately does not execute the Agent or renderer. The generated terminal command contains the explicit approval flags required by the repair CLI, keeping code-changing operations outside the browser process and visible to the user.
