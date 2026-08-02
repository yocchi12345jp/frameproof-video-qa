# Remotion source-aware integration

FrameProof v0.4 can audit a final MP4 together with a Render Manifest. The manifest connects frame intervals to Remotion compositions, sequences, components, source files, declared screen regions, and expected behavior.

## 1. Build a manifest

The runtime has no React dependency. Use the builder from any Node/TypeScript build script:

```ts
import {createManifestBuilder, saveManifest} from 'frameproof-video-qa';

const manifest = createManifestBuilder({
  compositionId: 'ProductLaunch',
  fps: 30,
  durationInFrames: 900,
  width: 1080,
  height: 1920,
  projectRoot: process.cwd()
})
  .region({
    id: 'cta-primary',
    type: 'component',
    role: 'cta',
    from: 720,
    to: 899,
    source: {
      composition: 'ProductLaunch',
      sequence: 'CTA',
      component: 'CtaButton',
      file: 'src/scenes/CtaScene.tsx',
      line: 42
    },
    box: {x: 0.1, y: 0.78, width: 0.8, height: 0.14},
    style: {fontSizePx: 44, lineCount: 2}
  })
  .expectMotion({
    id: 'cta-entry',
    from: 720,
    to: 750,
    regionId: 'cta-primary',
    expected: {minimumChange: 0.08}
  })
  .expectText({
    id: 'cta-copy',
    from: 720,
    to: 899,
    regionId: 'cta-primary',
    expected: {minimumPx: 42, maximumLines: 2}
  })
  .expectSafeArea({
    id: 'cta-safe',
    from: 720,
    to: 899,
    regionId: 'cta-primary',
    expected: {platform: 'youtube-shorts', marginRatio: 0.05}
  })
  .build();

await saveManifest('.frameproof/manifest.json', manifest);
```

The JSON schema is [`frameproof-manifest.schema.json`](frameproof-manifest.schema.json).

## 2. Optional JSX no-op assertions

The exported `FrameProof.Region` and `FrameProof.Expect*` functions return `null`, so they do not alter visible output. They register data only while a manifest collection is active.

```tsx
import {FrameProof} from 'frameproof-video-qa/assertions';

export const CtaScene = () => (
  <>
    <FrameProof.Region
      id="cta-primary"
      role="cta"
      from={720}
      to={899}
      source={{file: 'src/scenes/CtaScene.tsx', line: 42}}
      box={{x: 0.1, y: 0.78, width: 0.8, height: 0.14}}
      style={{fontSizePx: 44, lineCount: 2}}
    />
    <FrameProof.ExpectMotion id="cta-entry" from={720} to={750} regionId="cta-primary" expected={{minimumChange: 0.08}} />
    {/* visible video content */}
  </>
);
```

A build script should call `beginManifestCollection()` before rendering metadata and `endManifestCollection()` after the relevant component tree has executed. The builder API is preferred for deterministic CI until automatic Remotion instrumentation is added.

## 3. Audit final export

```bash
frameproof manifest validate .frameproof/manifest.json

frameproof scan out/video.mp4 \
  --manifest .frameproof/manifest.json \
  --captions out/captions.srt \
  --audio --check-silence \
  --json artifacts/frameproof.json \
  --html artifacts/frameproof.html \
  --fix-packets artifacts/fix-packets.json
```

Each mapped finding includes a source object and a Fix Packet that Claude Code or Codex can consume.

## Assertion behavior in v0.4

- `motion`: compares deterministic frame fingerprints inside the declared interval.
- `text`: validates declared `fontSizePx` and `lineCount` metadata. DOM measurement is planned; v0.4 does not use OCR.
- `visible`: checks whether the declared interval contains sufficient non-flat visual information.
- `audio`: checks the final audio stream and silence intervals against the declared interval.
- `safe-area`: checks a normalized region box against margins and platform-preview occlusion zones.

## Limitations

The manifest is explicit rather than inferred. FrameProof does not yet parse JSX or source maps automatically, and it does not estimate text size from pixels. This keeps the v0.4 path deterministic, local, and explainable while establishing the source-to-frame contract for future instrumentation.
