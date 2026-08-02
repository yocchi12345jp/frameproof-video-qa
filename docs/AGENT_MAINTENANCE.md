# Agent maintenance workflow

FrameProof supports both Claude Code and Codex without maintaining two divergent implementations. The canonical workflow lives in [`skills/generated-video-auditor`](../skills/generated-video-auditor). Agent-specific instruction files only explain how each tool discovers and applies that shared workflow.

## Shared maintenance uses

- classify and summarize new and regressed issues against an approved baseline;
- preserve accepted-finding reasons and flag expired or overly broad exceptions;
- draft regression tests from maintainer-approved reproductions;
- review pull requests for threshold changes, schema compatibility, and missing tests;
- generate release-note drafts from merged pull requests;
- maintain compatibility examples for Remotion and common CI environments;
- propose documentation fixes from repeated support questions.

## Human gates

Human approval remains mandatory for repair execution, renderer execution, repair acceptance, issue closure, merges, releases, security advisories, changes to default quality thresholds, and acceptance of intentional error-level findings.

## Portability rules

- Keep the canonical `SKILL.md` compatible with the open Agent Skills format.
- Do not put Claude-only frontmatter such as `context: fork`, hooks, or Claude-specific dynamic command injection in the canonical skill.
- Do not put Codex-only tool names or sandbox assumptions in the canonical skill.
- Put persistent repository guidance in both `AGENTS.md` and `CLAUDE.md`.
- Keep executable behavior in ordinary Node.js scripts so either agent can run the same commands.
- Treat JSON reports and exit codes as the cross-agent contract.

## Repair-session maintenance

- Keep the repair session schema versioned and machine-readable.
- Test denial paths as carefully as success paths.
- Never move Agent invocation into the ordinary scanner or Studio browser process.
- Keep Claude Code and Codex adapters thin; the prompt, source allowlist, Git evidence, verification, and human receipt remain shared.
- A preview range may accelerate diagnosis but cannot replace a complete output render and full-video verification.
