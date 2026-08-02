# Remotion audit workflow

## Source mapping

FrameProof reports decoded frame numbers. Map a finding back to Remotion using:

- `frame / fps` for the timestamp;
- the composition `id`, width, height, FPS, and duration;
- the `<Sequence from>` and `<Sequence durationInFrames>` interval containing the finding;
- component names and source files recorded in the project storyboard or manifest.

When possible, keep a machine-readable manifest next to the render:

```json
{
  "compositionId": "ProductLaunch",
  "fps": 30,
  "sequences": [
    {"name": "CTA", "from": 870, "durationInFrames": 150, "source": "src/scenes/CtaScene.tsx"}
  ]
}
```

## Deterministic rerenders

- derive animation from `useCurrentFrame()` rather than wall-clock time;
- fix random seeds;
- pin fonts and remote assets;
- avoid network-dependent rendering where possible;
- rerun the exact render command after a fix;
- compare the same composition and props.

## Common repairs

- `BLANK_FRAME`: inspect sequence gaps, delayed assets, transparent roots, and transition boundaries;
- `FROZEN_RUN`: verify whether a static hold was intended; otherwise add or restore frame-driven state changes;
- `EDGE_ACTIVITY`: inspect captions, CTA buttons, logos, and decorative borders near the export crop;
- aspect findings: render a dedicated composition for each aspect instead of mechanically cropping one master.
## Repair preview command templates

FrameProof does not assume one Remotion partial-render command. Configure the command used by the project and expose the supported tokens:

- `{fromFrame}` and `{toFrame}`;
- `{fromSeconds}` and `{toSeconds}`;
- `{composition}`;
- `{output}`;
- `{projectRoot}`.

Example project wrapper:

```bash
frameproof repair create artifacts/current.json \
  --project . \
  --render-command 'npm run render:range -- --from {fromFrame} --to {toFrame} --output "{output}"' \
  --full-render-command 'npm run render -- --output "{output}"' \
  --output-video out/repaired.mp4 \
  --output .frameproof/repairs/session.json
```

A preview render is not final proof. Always verify the complete output video after the repair. Keep the wrapper deterministic and ensure it uses the same composition, props, fonts, assets, and seed as the production render.

