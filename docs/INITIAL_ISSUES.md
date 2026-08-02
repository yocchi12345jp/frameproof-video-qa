# Initial public issues

Open these after the first release. They create a real contribution surface without pretending external adoption already exists.

## 1. Validate X presets with public fixtures

**Labels:** `testing`, `platform`, `help wanted`

Create tiny generated fixtures for compliant and non-compliant H.264, pixel format, FPS, duration, and aspect combinations. Document FFmpeg commands and expected findings. Do not commit copyrighted production videos.

## 2. Add SARIF output

**Labels:** `enhancement`, `good first issue`

Map findings to SARIF so GitHub code scanning can display video QA findings. Preserve frame numbers, timestamps, thresholds, severity, and preset name.

## 3. Add scan timeout and resource budgets

**Labels:** `security`, `enhancement`

Add maximum decoded duration, execution timeout, and analysis byte limits to reduce denial-of-service risk from extremely large or malicious media.

## 4. Remotion render manifest schema

**Labels:** `integration`, `remotion`, `help wanted`

Define a renderer-neutral JSON schema that maps frame intervals to composition, sequence, component label, and source file. Build a Remotion adapter without coupling the core scanner to React.

## 5. Subtitle data audit

**Labels:** `captions`, `enhancement`, `help wanted`

Accept SRT, VTT, or normalized JSON and report short display duration, excessive line count, and configurable reading speed. Keep text analysis independent from OCR.

## 6. Collect minimal false-positive fixtures

**Labels:** `documentation`, `help wanted`

Create a documented fixture format for sharing tiny generated videos that reproduce edge-activity or frozen-run false positives without exposing private production media.
