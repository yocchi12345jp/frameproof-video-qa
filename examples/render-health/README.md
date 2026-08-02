# Render-health example

From this directory, run the local source checkout:

```bash
node ../../src/cli.js preflight --project . --minimum-free-gb 0.1
node ../../src/cli.js render run \
  --project . \
  --approve-render \
  --output-video out/render-health-demo.mp4 \
  --minimum-free-gb 0.1 \
  --receipt .frameproof/artifacts/render-receipt.json \
  --receipt-html .frameproof/artifacts/render-receipt.html
```

Delete `assets/background.txt` to see preflight block the render.
