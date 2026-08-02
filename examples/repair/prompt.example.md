# FrameProof repair task

You are repairing a programmatic video project. Work only inside the project directory. Read AGENTS.md and CLAUDE.md when present.

## Goal
Resolve the selected FrameProof findings with the smallest maintainable source change. Preserve unrelated behavior and visual design. Do not commit, push, publish, install global packages, or change credentials.

## Safety constraints
- Primary target files: `src/scene.js`
- Do not edit generated reports, rendered media, lockfiles, secrets, or CI configuration unless the finding directly requires it.
- Run the project's existing focused checks after editing.
- Do not render the full video unless the project instructions require it; FrameProof will perform verification separately.
- Stop and explain instead of guessing when source mapping is insufficient.

## Selected findings
### 1. BLANK_FRAME (error)
60 blank or near-blank frame(s) detected.
- Source: src/scene.js:1
- Frames: 0-59
- Suggested actions: Inspect the first reported frame for missing assets or opacity transitions; Add an explicit background or shorten the empty transition

### 2. EXPECTED_VISIBLE_MISSING (error)
Expected visible content main-visible was present in 0.0% of frames.
- Source: src/scene.js:1
- Frames: 0-59
- Expected: {"minimumStdDev":4}
- Actual: {"visibleRatio":0}
- Suggested actions: Check opacity, z-index, asset loading, and Sequence timing; Rerender only the affected frame range

## Verification context
- Input: out/failing.mp4
- Composition: RepairDemo
- FPS: 30
- Repair preview ranges: 0-59

At the end, summarize changed files, the reason for each change, tests run, and any remaining risk.
