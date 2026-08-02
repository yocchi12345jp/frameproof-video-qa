# Contributing

Thank you for helping improve FrameProof.

## Development setup

```bash
git clone https://github.com/yocchi12345jp/frameproof-video-qa.git
cd frameproof-video-qa
npm install
npm run check
```

Node.js 20 or newer is required.

## Good first contributions

- provide a minimal frame sequence that reproduces a false positive or missed defect;
- improve a threshold explanation;
- add tests for image formats and unusual dimensions;
- add a renderer integration example;
- improve Windows, macOS, or Linux compatibility.

## Pull requests

1. Open an issue first for behavior changes or new checks.
2. Keep each pull request focused.
3. Add or update tests.
4. Run `npm run check`.
5. Explain user-visible behavior and threshold implications.

## Design requirements

- scans must remain local-first and deterministic;
- new checks must be explainable and independently disableable in a future config version;
- avoid network access in the scan path;
- avoid hidden AI scoring in hard quality gates;
- preserve stable JSON fields within a schema version.

## Commit style

Conventional commits are preferred, for example:

- `feat: add baseline frame comparison`
- `fix: avoid edge false positives on gradients`
- `docs: add Remotion vertical-video example`
