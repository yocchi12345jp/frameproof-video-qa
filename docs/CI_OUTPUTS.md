# CI outputs

FrameProof v0.8.1 can produce several outputs from one scan or comparison.

| Output | Purpose |
|---|---|
| JSON report | Full frame, source, caption, audio, and Fix Packet evidence |
| HTML report | Human review of the current render |
| Revision JSON | Machine-readable new/regressed/improved/resolved/accepted classification |
| Revision HTML | Side-by-side comparison summary and optional filmstrip |
| Markdown | Pull-request body or GitHub Step Summary |
| SARIF 2.1.0 | Source-linked GitHub code-scanning alerts |
| JUnit XML | Test-report ingestion in CI systems |

Accepted findings are omitted from SARIF and JUnit by default. Use `--include-accepted` only when the downstream system needs the complete record.

## GitHub Actions

```yaml
name: Video QA
on:
  pull_request:

permissions:
  contents: read
  security-events: write

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2

      - name: Render video
        run: npm ci && npm run render

      - name: FrameProof revision gate
        id: frameproof
        uses: yocchi12345jp/frameproof-video-qa@v0.8.1 # After release, pin the immutable commit SHA in production
        with:
          video: out/video.mp4
          manifest: .frameproof/manifest.json
          captions: out/captions.srt
          audio: true
          baseline-report: .frameproof/baseline.json
          acceptances: .frameproof/acceptances.json

      - name: Upload FrameProof artifacts
        if: always()
        uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.2
        with:
          name: frameproof
          path: artifacts/frameproof*
          if-no-files-found: error

      - name: Upload FrameProof SARIF
        if: always()
        uses: github/codeql-action/upload-sarif@7211b7c8077ea37d8641b6271f6a365a22a5fbfa # v4.36.0
        with:
          sarif_file: artifacts/frameproof.sarif
          category: frameproof-video
```

GitHub code scanning accepts a supported subset of SARIF 2.1.0. Public repositories can use code scanning; private organization repositories require the applicable GitHub Code Security entitlement and workflow permissions. FrameProof only generates the SARIF file—the workflow decides whether and where to upload it.

## Pull-request comments

The composite Action writes the Markdown comparison to `GITHUB_STEP_SUMMARY`. It does not post or update a pull-request comment because doing so requires repository write permissions and a comment ownership policy. Teams that want a persistent PR comment can pass `artifacts/frameproof-pr.md` to their existing comment action or bot.

## Gate behavior

Without a baseline, the exit status uses current error/warning counts. With a baseline, it uses new and regressed findings:

- exit `0`: no new or regressed error-level findings;
- exit `1`: at least one new/regressed error, or warning regression with `--fail-on-warning`;
- exit `2`: input, environment, schema, or configuration failure.
## Repair plans in CI

The composite Action can generate a guarded repair-session file after a failed gate by setting `repair-session`. It does not run Claude Code or Codex in the Action. This separation avoids granting source-write or model credentials to a read-only quality-gate step.

```yaml
      - name: FrameProof revision gate
        id: frameproof
        uses: yocchi12345jp/frameproof-video-qa@v0.8.1 # After release, pin the immutable commit SHA in production
        with:
          video: out/video.mp4
          baseline-report: .frameproof/baseline.json
          repair-session: artifacts/repair-session.json
          repair-agent: codex
          repair-project: .
          repair-full-render-command: npm run render -- --output {output}
          repair-output-video: out/repaired.mp4
```

Upload the repair session with the other artifacts. A maintainer may then inspect it and explicitly run `frameproof repair loop ... --approve-agent --approve-render` in an appropriate trusted environment.

