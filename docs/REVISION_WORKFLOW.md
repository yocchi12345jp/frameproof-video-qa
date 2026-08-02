# Revision workflow

FrameProof v0.5 compares a current JSON report with a previous report and classifies findings as `new`, `regressed`, `improved`, `unchanged`, `resolved`, or `accepted`.

The comparison is source-aware when a Render Manifest is present. Findings are paired by rule, source composition/sequence/component/file, stable identifiers such as caption or assertion ID, and nearest normalized time. This handles ordinary timing edits, but it is not optical-flow alignment or arbitrary edit-decision-list reconstruction.

## Scan and compare in one command

```bash
frameproof scan out/current.mp4 \
  --manifest .frameproof/manifest.json \
  --captions out/captions.srt \
  --baseline artifacts/baseline.json \
  --acceptances .frameproof/acceptances.json \
  --json artifacts/current.json \
  --html artifacts/current.html \
  --revision-json artifacts/revision.json \
  --revision-html artifacts/revision.html \
  --markdown artifacts/frameproof-pr.md \
  --sarif artifacts/frameproof.sarif \
  --junit artifacts/frameproof.xml
```

With a baseline, exit code `1` is reserved for new or regressed error-level findings. Existing unchanged findings do not block the revision gate. `--fail-on-warning` also blocks new or regressed warnings.

## Compare existing reports

```bash
frameproof compare artifacts/current.json \
  --baseline artifacts/baseline.json \
  --acceptances .frameproof/acceptances.json \
  --filmstrip-dir artifacts/filmstrip \
  --html artifacts/revision.html \
  --json artifacts/revision.json
```

When both report inputs still point to readable video files, the filmstrip contains representative baseline and current JPEG frames for changed findings. Use `--baseline-video` when the old report was moved but its video is available elsewhere.

## Status definitions

- `new`: no matching baseline finding exists;
- `regressed`: severity increased or a known violation metric became materially worse;
- `improved`: severity decreased or a known violation metric improved, but the finding still exists;
- `unchanged`: the same finding remains within comparison tolerance;
- `resolved`: a baseline finding no longer exists;
- `accepted`: a current finding matches a reviewed acceptance entry.

FrameProof uses rule-specific metrics for caption speed/duration/length, overlap, frozen duration, text size, silence, loudness, and related rules. For rules without a specific metric, severity and stable identity still work, but quantitative regression detection may be unavailable.

## Accepted findings

Create an acceptance from a report finding index:

```bash
frameproof acceptance create artifacts/current.json \
  --finding 2 \
  --reason "Intentional two-second end-card hold" \
  --owner "video-team" \
  --output .frameproof/acceptances.json
```

Acceptance entries contain an exact fingerprint plus semantic match fields. The semantic match allows the acceptance to survive small timing shifts while avoiding broad suppression based on rule code alone.

Example:

```json
{
  "schemaVersion": "1.0",
  "acceptances": [
    {
      "fingerprint": "e3014e60e65b8c3f86f2",
      "reason": "Intentional end-card hold",
      "owner": "video-team",
      "expiresAt": "2026-12-31T23:59:59Z",
      "match": {
        "code": "FROZEN_RUN",
        "sourceFile": "src/scenes/CtaScene.tsx",
        "component": "CtaScene"
      }
    }
  ]
}
```

Accept error-level findings only after a human reviews the affected frames and creative specification. Prefer an expiration date for temporary exceptions.

## Baseline lifecycle

1. Keep the last approved report as the baseline artifact.
2. Render the proposed revision with deterministic data, fonts, assets, and seeds.
3. Run FrameProof with the baseline and acceptance file.
4. Review new and regressed findings first.
5. Fix the source or explicitly accept an intentional exception.
6. After approval, promote the current report to the next baseline.

Do not automatically promote failed reports or reports that were never visually reviewed.
