# FrameProof repository instructions for Codex

## Mission

Maintain FrameProof as a local-first, deterministic source-aware verification, revision-gate, and repair layer for AI-generated and programmatic video. The scanner must remain renderer-agnostic and must not upload user video or invoke remote models in the scan path.

## Shared workflow

- The canonical generated-video audit workflow is `skills/generated-video-auditor/SKILL.md`.
- Use that workflow when a task involves auditing, repairing, approving, or regression-testing a rendered video.
- Cross-agent maintenance policy is in `docs/AGENT_MAINTENANCE.md`.
- Cross-agent compatibility requirements are in `docs/AGENT_COMPATIBILITY.md`.
- Project onboarding and repeatable verification are documented in `docs/ONBOARDING.md`.

## Required checks

After changing JavaScript, configuration, Agent Skill content, GitHub Action metadata, or package files, run:

```bash
npm run check
```

For agent-integration-only changes, also inspect:

```bash
npm run check:agents
```

Before a package or release handoff, also run:

```bash
npm run check:package
```

## Engineering rules

- Fix root causes; do not weaken thresholds merely to make tests pass.
- Keep scans deterministic for identical input and configuration.
- Preserve zero npm runtime dependencies unless a maintainer explicitly approves a change.
- Keep findings, Render Manifests, and Fix Packets machine-readable and backward-compatible where practical.
- Add or update tests for behavior changes.
- Do not publish, merge, release, close security reports, or change default quality thresholds without human approval.
