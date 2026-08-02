# Guarded rendering and render-health receipts

FrameProof can supervise an existing render command without replacing the renderer.

```bash
frameproof render run \
  --project . \
  --command "npm run render" \
  --approve-render \
  --output-video out/video.mp4 \
  --stall-seconds 90 \
  --timeout-seconds 1800 \
  --receipt .frameproof/artifacts/latest/render-receipt.json \
  --receipt-html .frameproof/artifacts/latest/render-receipt.html \
  --verify-after-render
```

The explicit `--approve-render` flag is mandatory. FrameProof runs production preflight first and blocks execution when required assets, fonts, configuration, permissions, disk space, or major Remotion versions are invalid.

## Advisor categories

The deterministic log advisor recognizes common signatures for:

- disk exhaustion;
- process memory exhaustion;
- file-handle exhaustion;
- missing fonts and assets;
- FFmpeg/codec failures;
- `delayRender` and other async timeouts;
- browser/GPU crashes;
- filesystem permissions;
- dependency-version conflicts;
- long periods without render output;
- missing or undecodable final output.

It does not claim to determine every root cause. It preserves the evidence and recommends the next inspection step.

## Receipt evidence

A receipt records:

- command, project directory, start/end time and duration;
- exit code, signal, timeout and maximum log-silence interval;
- timestamped log events and a bounded log tail;
- production-preflight checks and input hashes;
- output path, byte size, SHA-256 and FFprobe metadata;
- Git snapshots before and after rendering;
- optional full FrameProof postflight verification.

The guarded renderer never commits, pushes, publishes, or marks creative approval.
