# Competitive positioning

FrameProof deliberately avoids competing on breadth with broadcast, archival, or perceptual-quality suites.

## Adjacent categories

### Broadcast and media-file QC

Projects such as [rendiff-probe](https://github.com/rendiffdev/ffprobe-api) and [QCTools](https://github.com/bavc/qctools) cover broad technical analysis, mastering, archival, or media-forensics requirements. FrameProof does not attempt to replace their format breadth, HDR, MXF, IMF, transport-stream, or preservation workflows.

### Reference-based perceptual quality

[Netflix VMAF](https://github.com/Netflix/vmaf) and [ffmpeg-quality-metrics](https://github.com/slhck/ffmpeg-quality-metrics) compare an encoded or processed video with a reference. FrameProof instead supports pre-publish checks on one completed output, where the defect is often a layout, timing, transition, or platform-export problem rather than compression loss.

### Web visual regression

Browser snapshot systems compare pages against approved baselines. FrameProof borrows the CI and explainability principles, but audits time-based media and export metadata. Baseline video comparison is planned, not yet implemented.

## Chosen wedge

FrameProof focuses on the missing QA layer between an AI or code renderer and publication:

1. render a composition;
2. inspect deterministic output findings;
3. map affected frames back to the project;
4. repair the source;
5. rerender and verify;
6. block merge or release when required.

The first public differentiation is distribution and workflow, not an inflated detector count:

- an npm CLI with zero runtime dependencies;
- a first-party GitHub composite Action;
- one portable Agent Skill explicitly validated for Claude Code and Codex;
- platform-oriented presets beginning with X;
- machine-readable findings designed for repair loops.

## Claims intentionally deferred

The current release does not claim:

- semantic OCR-based caption overflow detection;
- DOM-to-video source mapping;
- Remotion component attribution;
- expected-motion annotations;
- automated source-code repair;
- broadcast-mastering compliance.

Those capabilities require public fixtures, stable schemas, and false-positive evaluation before they should be presented as supported features.
