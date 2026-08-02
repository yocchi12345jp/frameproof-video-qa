# FrameProof v0.4 Product Spec — Source-aware Verification

Status: Proposed after competitive and creator-pain research  
Date: 2026-08-02

## Product promise

A failed frame should tell a human or coding agent not only **what is wrong**, but also **where in the source it came from, what was expected, and how to verify the fix**.

## Primary users

1. Remotion developers and AI coding agents
2. Teams generating repeatable social video variants
3. Video automation operators reviewing final exports
4. Agencies handling repeated client revisions

## Core workflows

### Workflow A — Audit a finished export

Input: MP4/MOV/WebM  
Output: technical, visual, caption, audio, and platform findings.

### Workflow B — Audit a Remotion project

Input: project directory + composition + rendered file  
Output: findings mapped to Composition, Sequence, component, source file, and frame interval.

### Workflow C — Compare a revision

Input: baseline + revision + optional Git commit refs  
Output: new, regressed, fixed, and accepted findings.

### Workflow D — Agent repair

Input: finding or finding set  
Output: structured Fix Packet consumed by Claude Code or Codex, followed by rerender and verification.

## Deliverables

### 1. Manifest schema

```json
{
  "compositionId": "ProductLaunch",
  "fps": 30,
  "durationInFrames": 900,
  "regions": [
    {
      "id": "cta-primary",
      "type": "component",
      "source": "src/scenes/CtaScene.tsx:42",
      "from": 720,
      "to": 899,
      "role": "cta"
    }
  ]
}
```

### 2. Assertion primitives

```tsx
<FrameProof.ExpectMotion id="cta-entry" from={720} to={750} minimumChange={0.08} />
<FrameProof.ExpectText id="cta-copy" minPx={42} maxLines={2} safeArea="youtube-shorts" />
<FrameProof.ExpectAudio id="narration" from={0} to={870} maxUnexpectedSilenceMs={650} />
```

Assertions must emit data at render/build time; they must not change visible video output.

### 3. Caption adapters

- SRT
- WebVTT
- Remotion caption arrays
- JSON transcript with word timing

Rules:

- minimum/maximum display duration
- characters per second
- max lines
- line length by language
- gap/overlap
- outside composition duration
- missing beginning/end captions
- collision with declared UI regions

### 4. Audio integrity

- audio stream and channel map
- integrated loudness and true peak
- unexpected silence
- expected dialogue activity
- baseline/revision audio alignment
- optional transcript-to-audio alignment later

### 5. Platform overlays

- TikTok in-feed
- TikTok TopView open/in-feed stages
- Instagram Reels
- YouTube Shorts
- X video

Each overlay must declare source URL, checked date, applicable placement, device assumptions, caption-length variant, and LTR/RTL mode.

### 6. Fix Packet

```json
{
  "ruleId": "text.too-small",
  "severity": "error",
  "frames": {"from": 240, "to": 420},
  "source": {
    "composition": "ProductLaunch",
    "sequence": "ProblemStatement",
    "component": "ProblemCopy",
    "file": "src/scenes/ProblemScene.tsx",
    "line": 88
  },
  "expected": {"minimumPx": 44},
  "actual": {"estimatedPx": 27},
  "suggestedActions": [
    "Increase the base font size",
    "Reduce line length",
    "Use the mobile-safe layout variant"
  ],
  "reproduce": "npm run render:proof -- --frames=240-420",
  "verify": "frameproof scan out/proof.mp4 --manifest .frameproof/manifest.json"
}
```

## Studio changes

- New Scan choices: file only / source-aware / compare revision
- Platform Preview panel
- Source panel beside finding detail
- “Open source”, “Copy Fix Packet”, “Repair with Claude”, “Repair with Codex” actions
- Revision filters: New / Regressed / Fixed / Accepted
- Expected-vs-actual visualization

## Acceptance criteria

- Source mapping works for nested `<Sequence>` use cases
- Manifest has JSON Schema and version field
- Captions can be checked without OCR or network access
- Audio checks detect a removed dialogue interval in a fixture
- Revision alignment handles a shifted edit with inserted intro
- Both Claude Code and Codex can consume the same Fix Packet
- All core behavior has deterministic fixtures and CI tests

## Non-goals

- Full broadcast compliance suite
- Cloud media storage
- Generic NLE replacement
- Automatic copyright/legal clearance
- Fully autonomous subjective creative approval
