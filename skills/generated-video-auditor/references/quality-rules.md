# Finding interpretation

| Finding | Meaning | Default response |
|---|---|---|
| `BLANK_FRAME` | Extreme luminance and low variance indicate a blank or near-blank frame. | Inspect transition boundaries and missing assets; normally block release. |
| `FROZEN_RUN` | Adjacent frame fingerprints remain below the configured change threshold. | Confirm whether the hold is intentional; otherwise restore motion. |
| `EDGE_ACTIVITY` | Dense high-frequency content appears in the configured outer margin. | Inspect captions, UI, borders, and crop safety. |
| `ASPECT_RATIO_MISMATCH` | Export does not match the exact project aspect. | Render the correct composition or dimensions. |
| `PLATFORM_ASPECT_UNSUPPORTED` | Export does not match any discrete aspect in the platform profile. | Select a supported export format. |
| `PLATFORM_ASPECT_OUT_OF_RANGE` | Export is outside a permitted continuous aspect range. | Render within the platform range. |
| `PLATFORM_RESOLUTION_TOO_SMALL` | Width or height is below the platform minimum. | Increase export dimensions. |
| `PLATFORM_RESOLUTION_TOO_LARGE` | Export exceeds orientation-specific dimensions. | Reduce dimensions or use another platform profile. |
| `PLATFORM_CONTAINER_UNSUPPORTED` | Container does not match the selected platform profile. | Re-encode to MP4 or MOV as applicable. |
| `PLATFORM_VIDEO_CODEC_UNSUPPORTED` | Video codec is unsupported. | Re-encode using H.264 for X presets. |
| `PLATFORM_PIXEL_FORMAT_UNSUPPORTED` | Pixel format is unsupported. | Re-encode to `yuv420p` for X presets. |
| `PLATFORM_AUDIO_CODEC_UNSUPPORTED` | Existing audio uses an unsupported codec. | Re-encode audio to AAC LC. |
| `PLATFORM_BIT_RATE_TOO_HIGH` | Video bitrate exceeds the platform limit. | Reduce bitrate without changing FPS by default. |
| `PLATFORM_FRAME_RATE_TOO_HIGH` | FPS exceeds the platform limit. | Render or transcode at an accepted FPS. |
| `PLATFORM_DURATION_TOO_LONG` | Duration exceeds the profile limit. | Shorten or split the video. |
| `PLATFORM_FILE_TOO_LARGE` | File exceeds the hard size limit. | Lower bitrate, resolution, or duration. |
| `PLATFORM_FILE_ABOVE_RECOMMENDATION` | File is accepted but above a recommended target. | Optimize when practical. |
