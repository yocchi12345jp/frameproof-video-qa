# X video presets

FrameProof includes two X-oriented presets.

## `x-video`

A strict technical profile for a standard non-Premium upload through x.com. It checks the official resolution bounds, aspect-ratio range, maximum 40 FPS, maximum 25 Mbps video bitrate, 140-second duration, and 512 MB file-size limit. Premium and Media Studio uploads use different limits.

## `x-ad`

A strict profile for X Video Ads. It checks the documented aspect families, MP4/MOV-compatible container, H.264 video, 4:2:0 pixel format, AAC audio when audio exists, maximum 60 FPS, 140-second duration, and 1 GB file-size limit. It also warns above X's recommended 30 MB target.

Use an explicit `--aspect` in addition to the preset when the project requires one export format, for example:

```bash
frameproof scan out/ad.mp4 --preset x-ad --aspect 9:16
```

The presets validate technical compatibility. They do not prove that branding, captions, accessibility, or creative content satisfy every campaign requirement.

Sources:

- https://help.x.com/en/using-x/x-videos
- https://business.x.com/en/help/campaign-setup/creative-ad-specifications
