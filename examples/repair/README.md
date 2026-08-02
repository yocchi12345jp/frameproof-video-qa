# Guarded repair example

This directory demonstrates the v0.6 repair-session contract. Generate a live session from the source-aware failing report:

```bash
frameproof repair create ../source-aware/output/report.json \
  --project ../../ \
  --agent codex \
  --full-render-command 'npm run render -- --output {output}' \
  --output-video out/repaired.mp4 \
  --output session.json \
  --session-html repair.html
```

Do not run the generated Agent or renderer commands without reviewing the session and command templates. The checked-in files are examples only and are regenerated during the release audit.
