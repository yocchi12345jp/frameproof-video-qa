# FrameProof repository instructions for Claude Code

@docs/AGENT_MAINTENANCE.md
@docs/AGENT_COMPATIBILITY.md
@docs/ONBOARDING.md

## Mission

Maintain FrameProof as a local-first, deterministic source-aware verification, revision-gate, and repair layer for AI-generated and programmatic video. Do not upload user video or call remote models in the scan path.

## Generated-video audits

When a task involves auditing, repairing, approving, or regression-testing a rendered video, use the canonical workflow in `skills/generated-video-auditor/SKILL.md`. If the skill is installed in Claude Code, invoke `/generated-video-auditor`.

## Required checks

After changing JavaScript, configuration, Agent Skill content, GitHub Action metadata, or package files, run:

```bash
npm run check
```

For agent-integration-only changes, also run:

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
