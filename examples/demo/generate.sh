#!/usr/bin/env bash
set -euo pipefail

ffmpeg -v error \
  -f lavfi -i color=c=black:s=320x180:d=1:r=10 \
  -f lavfi -i testsrc2=s=320x180:d=1:r=10 \
  -filter_complex '[0:v][1:v]concat=n=2:v=1:a=0[out]' \
  -map '[out]' -c:v libx264 -pix_fmt yuv420p -y failing.mp4

ffmpeg -v error -f lavfi -i testsrc2=s=320x180:d=1:r=30 \
  -c:v libx264 -pix_fmt yuv420p -y passing.mp4
