# Project onboarding

FrameProof v0.7 adds a project profile so a new repository can use one repeatable command instead of rebuilding a long scan command on every machine.

## 1. Diagnose the machine

```bash
npx frameproof-video-qa doctor
```

The required checks are Node.js 20+, FFmpeg, FFprobe, and Git. Claude Code and Codex are optional for scanning and are reported separately because they are only required for executable repair sessions.

For automation:

```bash
npx frameproof-video-qa doctor --json-output > frameproof-doctor.json
```

## 2. Initialize a project

Run this from the project root:

```bash
npx frameproof-video-qa init
```

FrameProof detects a Remotion project when `remotion` or an `@remotion/*` package is present. Initialization creates:

- `.frameproof/project.json`: stable project defaults;
- `.frameproof/acceptances.json`: reviewed exceptions;
- `.frameproof/manifest.example.json`: a source-aware manifest template, not enabled until renamed and configured;
- `.frameproof/.gitignore`: transient artifacts and repair sessions;
- `frameproof.config.json`: recommended rule defaults.

Optional flags:

```bash
npx frameproof-video-qa init \
  --preset youtube-shorts \
  --video out/video.mp4 \
  --github \
  --write-package
```

`--github` creates a starter workflow. `--write-package` adds FrameProof scripts and a development dependency to the local `package.json`. Existing generated files are skipped unless `--force` is provided. Use `--dry-run` to inspect the plan without writing.

## 3. Verify the current render

```bash
npx frameproof-video-qa verify
```

The configured video is scanned and a stable artifact bundle is written to `.frameproof/artifacts/latest`:

- `report.json` and `report.html`;
- `fix-packets.json`;
- `frameproof.sarif`;
- `frameproof.junit.xml`;
- `verification.json`;
- revision JSON, HTML, and Markdown when a baseline exists.

Override the configured render without editing the profile:

```bash
npx frameproof-video-qa verify out/alternate.mp4
```

Use `--no-baseline` for an isolated current-state scan.

## 4. Promote a reviewed baseline

After a human has reviewed the report and final video:

```bash
npx frameproof-video-qa baseline set .frameproof/artifacts/latest/report.json
```

FrameProof copies the report to the configured baseline path and writes `baseline-receipt.json` containing the source path, report summary, and SHA-256. Replacing an existing baseline requires `--force`.

Inspect the current baseline:

```bash
npx frameproof-video-qa baseline status
```

Never promote a report merely to make a failing revision gate pass. The baseline represents a reviewed state, including any explicitly accepted findings.

## Recommended repository policy

Commit these files:

- `.frameproof/project.json`;
- `.frameproof/acceptances.json`;
- `frameproof.config.json`;
- a real `.frameproof/manifest.json` when source-aware assertions are used;
- `.github/workflows/frameproof.yml` when CI is enabled.

Do not commit transient `.frameproof/artifacts`, `.frameproof/repairs`, or uploaded media.
