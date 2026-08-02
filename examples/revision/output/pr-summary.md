## FrameProof revision report

❌ **Revision gate failed**

| New | Regressed | Improved | Resolved | Accepted | Unchanged | Blocking |
|---:|---:|---:|---:|---:|---:|---:|
| 2 | 3 | 2 | 1 | 1 | 2 | 3 |

### Changes

| Status | Severity | Rule | Finding | Source | Time |
|---|---|---|---|---|---|
| regressed | warning | `CAPTION_TOO_FAST` | Caption 1 requires 27.5 characters per second. | — | 0.00s |
| new | error | `CAPTION_OVERLAP` | Captions 1 and 2 overlap by 50 ms. | — | 0.00s |
| improved | warning | `CAPTION_LINE_TOO_LONG` | Caption 2 has a 23-character line. | src/scenes/CtaScene.tsx:42 | 0.30s |
| accepted | error | `CAPTION_REGION_COLLISION` | Caption 2 overlaps declared region cta-primary. | src/scenes/CtaScene.tsx:42 | 0.30s |
| regressed | warning | `UNEXPECTED_SILENCE` | Audio is silent for 0.81 seconds from 1.00s. | src/scenes/CtaScene.tsx:42 | 1.00s |
| regressed | error | `EXPECTED_MOTION_MISSING` | Expected motion cta-motion averaged 0.0000, below 0.02. | src/scenes/CtaScene.tsx:42 | 1.00s |
| improved | error | `TEXT_TOO_SMALL` | Declared text cta-copy is 22px, below 32px. | src/scenes/CtaScene.tsx:42 | 1.00s |
| new | error | `SAFE_AREA_VIOLATION` | Region cta-primary violates the declared safe area. | src/scenes/CtaScene.tsx:42 | 1.00s |
| resolved | warning | `AUDIO_TRUE_PEAK_TOO_HIGH` | Audio true peak was -0.2 dBTP, above -1 dBTP. | src/scenes/IntroScene.tsx:18 | 0.40s |
