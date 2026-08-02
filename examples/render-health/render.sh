#!/usr/bin/env bash
set -euo pipefail
mkdir -p out
printf 'Preparing frames...\n'
ffmpeg -y -v warning -f lavfi -i "color=c=0x0969da:s=640x360:d=2:r=30" -vf "drawbox=x=60:y=120:w=520:h=120:color=white@0.9:t=fill" -c:v libx264 -pix_fmt yuv420p out/render-health-demo.mp4
printf 'Render complete.\n'
