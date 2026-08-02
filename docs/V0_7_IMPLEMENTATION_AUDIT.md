# FrameProof v0.7 implementation audit

## Scope

v0.7 reduces first-use friction and makes the complete local workflow reproducible across developer machines and CI.

Implemented:

- `frameproof doctor` with human and JSON output;
- optional Claude Code and Codex discovery without making either Agent a scan dependency;
- Remotion/generic project detection;
- non-destructive `frameproof init` and `--dry-run`;
- stable `.frameproof/project.json` profile;
- optional GitHub Actions and `package.json` generation;
- one-command `frameproof verify` artifact bundle;
- reviewed-baseline promotion and SHA-256 receipt;
- public library exports for diagnostics, onboarding, and verification workflows.

## Safety decisions

- Initialization does not overwrite generated files unless `--force` is explicit.
- The example manifest is not automatically enabled because placeholder duration or FPS values could create false findings.
- Baseline replacement requires `--force`.
- Baseline promotion does not imply creative approval; it only records the human-selected report and its hash.
- Missing Claude Code or Codex is informational, not a required-environment failure.

## Automated verification

- project-type detection;
- dry-run behavior;
- file creation and skip semantics;
- end-to-end verify artifact generation;
- baseline creation, receipt hashing, status, and second-run comparison;
- environment readiness and optional Agent status;
- all pre-v0.7 frame, source, revision, repair, Studio, and packaging tests.

## Remaining external validation

- real installation from the public npm registry;
- GitHub-hosted Linux, Windows, and macOS CI;
- real Codex CLI and Claude Code CLI repair sessions;
- third-party onboarding and usability feedback;
- public repository, issues, pull requests, Stars, and package adoption.
