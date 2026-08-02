# FrameProof v0.6.0 implementation audit

Date: 2026-08-02

## Scope

This audit covers the guarded repair-session state machine, Claude Code/Codex/custom adapters, Git containment, renderer command templates, bounded re-audit loop, Studio repair-plan generation, GitHub Action plan output, repair HTML, and package distribution.

## Safety properties implemented

- Agent execution requires an explicit `--approve-agent` flag.
- Renderer command execution requires a separate `--approve-render` flag.
- A Git repository and clean working tree are required before the first edit attempt unless `--allow-dirty` is explicitly supplied.
- Source-mapped sessions block changed files outside the selected source allowlist.
- Git evidence includes head commit, changed files, per-file SHA-256 values, and a combined diff/evidence SHA-256.
- Agent and renderer logs stored in a session are bounded to prevent unbounded report growth.
- Range previews are optional and renderer-defined; a complete rendered video is mandatory for final verification.
- The bounded loop stops after verification succeeds, a safety check blocks, a command fails, or the iteration limit is reached.
- Passing verification stops at `awaiting_human_approval`.
- Human approval records a named reviewer, reason, verification evidence, Git evidence, and receipt SHA-256.
- No repair command commits, pushes, publishes, merges, releases, or changes credentials.

## Automated results

`npm run check` completed successfully.

- Tests: 41 passed, 0 failed.
- Claude Code/Codex compatibility validator: passed.
- Release metadata validator: passed.
- `action.yml` and CI workflow YAML parsing: passed.
- Repair unit/integration coverage: range merging, session creation, missing approvals, custom Agent edits, allowed-file containment, preview/full render approvals, failing/passing verification, bounded loop, human receipt, Studio repair planning.
- Source-aware scan, captions, audio, revision comparison, filmstrips, SARIF, JUnit, and Studio regression tests: passed.

## CLI integration result

A clean temporary Git repository was used with:

1. a deliberately failing rendered video and source-aware manifest;
2. an unapproved Agent invocation, which was rejected;
3. an approved custom local Agent that edited one allowed source file;
4. an approved full-render command producing a passing video;
5. automatic full-video re-audit;
6. named human approval.

Final state: `approved`. The receipt contained the changed source file, its SHA-256, combined evidence SHA-256, and verification paths.

## Distribution result

- npm runtime dependencies: 0.
- Package archive entries: 108.
- Package size: approximately 1.6 MB in the audited build.
- No `node_modules` content was included.
- The generated tarball was installed into an empty temporary npm project.
- Installed CLI version and `doctor`: passed.
- Installed repair module and repair HTML exports: passed.
- Packaged `AGENTS.md`, `CLAUDE.md`, Agent Skill, GitHub Action, and repair documentation: present.

## Client-specific status

The audit container did not contain the `codex` or `claude` executables. Built-in adapter arguments follow their non-interactive CLI forms, but real-client smoke tests remain a public-release gate. The state machine and process behavior were exercised with a custom local Agent command.

## Deliberate limitations

- Renderer range support is not inferred automatically. Projects provide and approve a shell command template.
- Command-template path tokens must be quoted by the template author when required by the shell.
- Source containment is less specific when findings lack Render Manifest source mappings.
- Verification proves configured deterministic checks; it does not replace human creative review.
- The repair loop does not commit or publish a successful change.

## Release disposition

The v0.6.0 source and npm tarball are suitable for a public beta after GitHub-hosted Windows/macOS/Linux checks and separate installed-client smoke tests with Claude Code and Codex. Public GitHub and npm publication have not yet been performed.
