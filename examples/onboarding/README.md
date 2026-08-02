# Onboarding example

From an existing Remotion or generic video project:

```bash
npx frameproof-video-qa doctor
npx frameproof-video-qa init --video out/video.mp4 --github
npm run render
npx frameproof-video-qa verify
```

After reviewing the full video and generated reports:

```bash
npx frameproof-video-qa baseline set .frameproof/artifacts/latest/report.json
npx frameproof-video-qa verify
```

The second verification uses the reviewed baseline and blocks only new or regressed error-level findings.
