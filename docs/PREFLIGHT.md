# Production preflight

`frameproof preflight` checks the project before an expensive render begins. It is deliberately read-only.

```bash
frameproof preflight --project .
frameproof preflight --project . --json .frameproof/artifacts/preflight.json
```

Checks include:

- FrameProof project/profile validity;
- `package.json` and lockfile state;
- alignment of `remotion` and `@remotion/*` package versions;
- FrameProof config and Render Manifest validity;
- required assets and fonts declared in `manifest.metadata.assets` and `manifest.metadata.fonts`;
- render command availability;
- writable output location;
- free disk space;
- Git repository and working-tree state.

## Declaring render inputs

```json
{
  "metadata": {
    "assets": [
      "public/logo.png",
      {"path": "public/optional-background.mp4", "optional": true}
    ],
    "fonts": [
      {"path": "public/fonts/BrandSans.woff2", "label": "Brand Sans"}
    ]
  }
}
```

Missing required inputs block the guarded renderer. Optional inputs produce warnings.

## Exit status

- `0`: no error-level preflight checks;
- `1`: one or more blocking checks;
- `2`: invalid CLI usage or an unexpected FrameProof error.
