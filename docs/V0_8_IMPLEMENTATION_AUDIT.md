# FrameProof v0.8 implementation audit

## Scope

v0.8 adds a read-only production preflight and an explicitly approved render supervisor. The goal is to catch reproducibility and environment failures before rendering, then preserve enough evidence to diagnose a stalled or failed render without converting FrameProof into a renderer.

## Implemented

- package/lockfile and Remotion-version alignment checks;
- config and Render Manifest validation;
- manifest-declared asset and font checks;
- output permission and free-space checks;
- render-command and Git-state checks;
- deterministic render-log advisor;
- stall and timeout observation;
- output SHA-256 and FFprobe metadata;
- optional full-video FrameProof verification;
- JSON and standalone HTML render receipts;
- zero npm runtime dependencies.

## Safety decisions

- render execution requires `--approve-render`;
- preflight errors block the command;
- a stall warning does not kill a process by itself;
- the configured timeout terminates the process;
- final creative approval remains human-only;
- log diagnosis is signature-based and reports uncertainty.

## Verification

The automated suite covers passing preflight, required missing inputs, major Remotion mismatch, known failure signatures, approval enforcement, successful output hashing/probing, stall observation, and missing-output failure. The full legacy suite is retained.
