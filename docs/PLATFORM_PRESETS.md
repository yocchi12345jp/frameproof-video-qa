# Platform presets

Presets add platform-level metadata checks to FrameProof's visual checks.

```bash
frameproof presets
frameproof scan out/video.mp4 --preset x-ad
```

## `x-video`

This profile targets a **standard non-Premium upload through x.com**.

| Rule | Value |
|---|---:|
| Minimum resolution | 32×32 |
| Maximum landscape resolution | 1920×1200 |
| Maximum portrait resolution | 1200×1900 |
| Aspect-ratio range | 1:2.39 through 2.39:1 |
| Maximum FPS | 40 |
| Maximum video bitrate | 25 Mbps |
| Maximum duration | 140 seconds |
| Maximum file size | 512 MB |

Source: [How to share and watch videos on X](https://help.x.com/en/using-x/x-videos).

Premium and Media Studio uploads have different limits and are intentionally not represented by this preset.

## `x-ad`

| Rule | Value |
|---|---:|
| Supported aspect families | 1:1, 1.91:1, 16:9, 9:16, 4:5, 2:3 |
| Container | MP4 or MOV family |
| Video codec | H.264 |
| Pixel format | 4:2:0 (`yuv420p`) |
| Audio codec, when present | AAC |
| Maximum FPS | 60 |
| Maximum duration | 140 seconds |
| Maximum file size | 1 GB |
| Recommended file size | 30 MB warning |

Source: [X Ads creative specifications](https://business.x.com/en/help/campaign-setup/creative-ad-specifications).

The official Ads page covers multiple placements. FrameProof intentionally uses the common compatibility envelope and does not claim to validate campaign eligibility, branding, captions, or every placement-specific creative rule.
