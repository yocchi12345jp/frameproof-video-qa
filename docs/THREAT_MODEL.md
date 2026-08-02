# Threat model

## Protected assets

- private video frames, captions, filenames, and local paths;
- source-tree and local filesystem integrity;
- Agent credentials, CI credentials, release tokens, and environment secrets;
- report, revision, render-receipt, and approval-receipt integrity;
- npm and GitHub release provenance.

## Trust boundaries

1. Media, caption files, manifests, configs, and saved reports are untrusted input.
2. FFmpeg, FFprobe, Git, Claude Code, Codex, and custom executables are trusted local programs invoked across a process boundary.
3. Studio is a loopback-only local web application, but browser requests remain untrusted.
4. Generated HTML, JSON, SARIF, JUnit, Markdown, and media previews may be opened or uploaded elsewhere.
5. GitHub Actions and npm are software-supply-chain and release boundaries.

## Current controls

### Commands and rendered outputs

- guarded commands are parsed into an executable plus argument array; shell operators, command substitution, and newlines are rejected;
- child processes use `shell: false`;
- output files are snapshotted before and after rendering; an unchanged or pre-existing output is rejected as `stale-output`;
- render and Agent execution require separate explicit approval flags;
- render duration, log-stall, and analysis timeout controls are available.

### Agent containment

- mapped source files become the default edit allowlist;
- strict repair fails before Agent startup when no source file is mapped; an unmapped run requires an explicit CLI override and should be treated as high risk;
- changed files are compared with the allowlist after Agent execution; unexpected changes block the session;
- Claude Code is launched with a restricted tool list that excludes shell, web, and sub-agent tools;
- Codex is launched ephemerally with workspace-write sandboxing, network-disabled defaults, and plugins disabled;
- only a minimal environment allowlist is forwarded, reducing accidental credential exposure;
- FrameProof never automatically commits, pushes, merges, publishes, or grants final approval.

These controls reduce risk but do not make an arbitrary custom Agent executable safe. A malicious or compromised local executable may ignore prompts and controls available outside FrameProof. Run repair sessions only in an isolated repository with reviewable credentials and operating-system permissions.

### Studio

- Studio binds to loopback by default;
- each start creates an unpredictable session token stored in an HttpOnly, SameSite=Strict cookie and exposed to programmatic tests through an explicit header;
- API calls reject non-loopback Host headers, missing session tokens, and cross-origin mutating requests;
- JSON bodies and uploads have size limits;
- response security headers include a restrictive Content Security Policy.

### Media and reports

- media-derived values are never evaluated as code;
- HTML report values are escaped;
- full-frame analysis has a default maximum decoded-frame budget and a timeout;
- FFmpeg/FFprobe must be installed from a trusted distribution;
- the npm package has zero runtime dependencies.

### CI and releases

- generated verification workflows use read-only repository permissions unless an optional SARIF upload step is explicitly added;
- third-party Actions in maintained workflows and examples are pinned to full commit SHAs;
- npm publication uses OIDC Trusted Publishing and provenance;
- the release workflow rejects a Git tag that does not exactly match `package.json.version`.

## Residual risks and limitations

- specially crafted media may exploit vulnerabilities in the locally installed FFmpeg build;
- CPU, memory, GPU, file-handle, and disk use cannot be perfectly bounded across all codecs and external renderers;
- analysis cancellation currently terminates visual-frame decoding, while auxiliary probes or audio filters may finish independently;
- Studio is not designed for LAN or internet exposure; do not bind it to a non-loopback interface;
- `--allow-unmapped`, custom Agent executables, expanded allowlists, or custom render commands weaken the default boundary and require human review;
- output freshness proves that bytes changed after the render began, not that the creative content is semantically correct;
- GitHub-hosted CI and real Claude Code/Codex execution must still be verified after public release.

## Security reporting

Follow `SECURITY.md`. Do not disclose private videos, credentials, or exploit media in a public issue.
