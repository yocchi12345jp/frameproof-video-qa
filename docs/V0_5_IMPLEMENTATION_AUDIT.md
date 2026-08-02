# FrameProof v0.5.0 implementation audit

Date: 2026-08-02

## Scope

FrameProof v0.5 adds revision-aware quality gates on top of the source-aware checks introduced in v0.4. It compares a current report with a baseline, carries reviewed exceptions, produces CI-native outputs, and keeps existing unchanged defects visible without automatically blocking a new revision.

## Implemented

- source- and stable-identifier-aware pairing;
- normalized-time pairing when the same semantic finding appears more than once;
- `new`, `regressed`, `improved`, `unchanged`, `resolved`, and `accepted` states;
- violation metrics for caption speed/duration/overlap, motion, text size/lines, silence, loudness, and true peak;
- fingerprint and semantic acceptance matching with owner, reason, and optional expiration;
- revision JSON and standalone HTML reports;
- representative baseline/current JPEG filmstrips;
- GitHub-ready Markdown and Step Summary output;
- SARIF 2.1.0 and JUnit XML output;
- Studio baseline selection, changed-state filters, resolved panel, and acceptance persistence;
- GitHub composite Action inputs and outputs for the revision workflow;
- one canonical Claude Code and Codex Agent Skill workflow.

## Real fixture result

The v0.5 revision fixture produced:

| State | Count |
|---|---:|
| New | 2 |
| Regressed | 3 |
| Improved | 2 |
| Unchanged | 2 |
| Resolved | 1 |
| Accepted | 1 |
| Blocking errors | 3 |

The fixture verifies source-linked findings at `src/scenes/CtaScene.tsx:42`, a reviewed CTA/caption overlap, a resolved audio true-peak warning, and representative filmstrip images.

## Validation

- `npm run check`: passed;
- automated tests: 33 passed, 0 failed;
- Claude Code/Codex compatibility validator: passed;
- release metadata validator: passed;
- JSON report and SARIF parsing: passed;
- JUnit XML parsing: passed;
- FFmpeg filmstrip extraction: passed;
- CLI compare exit behavior: passed;
- Studio revision comparison and acceptance persistence: passed;
- npm runtime dependencies: 0.

## Defects found and corrected during audit

1. Studio history originally displayed a revision as failed whenever old unchanged errors remained. It now prioritizes `revisionPassed` and only labels the revision failed for new/regressed blocking findings.
2. The revision metric adapter did not fully recognize the real v0.4 payload keys `actual.fontSizePx`, `actual.lineCount`, `actual.averageChange`, and `maximumSilenceSeconds`. The adapter and regression tests now cover those payloads.
3. The documented GitHub Actions example contained an invalid stray top-level key. The YAML example was corrected.

## Browser-render note

The standalone comparison HTML was generated and its content/output links were verified. Headless Chromium did not terminate in this container because of its DBus/zygote environment, so a new v0.5 screenshot was not included. Existing v0.4 Studio screenshots remain in the README; the v0.5 HTML report itself is included as an inspectable artifact.

## Known limitations

- Pairing is source/stable-ID/normalized-time based; it is not optical-flow or edit-decision-list alignment.
- Representative filmstrips are evidence snapshots, not per-pixel visual-regression thresholds.
- FrameProof generates PR-ready Markdown and a Step Summary but does not post or own persistent pull-request comments.
- Git commit metadata and changed-source summaries are not yet attached to revision reports.
- SARIF is generated locally; repository workflows decide whether to upload it.
- Public GitHub CI, public npm installation, and external integrations remain unverified until publication.

## Release judgment

The v0.5.0 codebase is suitable for a public beta repository after the package is exercised through GitHub-hosted Windows, macOS, and Linux runners and installed from the public npm registry. It should be described as a source-aware revision gate, not as optical video alignment, a complete broadcast-QC suite, or an autonomous creative reviewer.
