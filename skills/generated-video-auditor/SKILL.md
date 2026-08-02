---
name: generated-video-auditor
description: Audits AI-generated or programmatic video with FrameProof in Claude Code, Codex, or another Agent Skills-compatible coding agent; interprets deterministic findings, fixes the responsible source code, rerenders, and verifies the result. Use after rendering Remotion, HyperFrames, browser-capture, or other code-generated video and before publishing or merging.
---

# Generated Video Auditor

This canonical workflow is intentionally portable across Claude Code and Codex. Use ordinary shell and Node.js commands, stable JSON findings, and repository-relative paths; do not depend on agent-specific tool names or frontmatter extensions.

Use FrameProof as a quality gate for rendered video. Treat the JSON report as evidence, not as a substitute for reviewing the affected frames and source code.

## When to use

Use this skill when:

- a Remotion, HyperFrames, HTML, or agent-generated video has been rendered;
- a pull request changes video code, captions, layouts, timing, or platform exports;
- a video must be checked for blank frames, unintended visual freezes, caption timing, audio integrity, safe areas, aspect ratio, or platform compatibility;
- a Remotion Render Manifest exists and findings should map back to compositions, sequences, components, and source lines;
- the user asks to validate, audit, repair, or approve a rendered video.

Do not use it before a render exists. Do not claim that heuristic edge activity semantically proves text overflow.

## Workflow

1. Confirm the environment:

   ```bash
   frameproof doctor
   ```

   When `.frameproof/project.json` does not exist, initialize the repository before building a custom command:

   ```bash
   frameproof init --video out/video.mp4
   ```

2. Select the narrowest applicable profile:

   - `x-ad` for X Video Ads technical compatibility;
   - `x-video` for a standard non-Premium x.com upload;
   - no preset when only project-specific visual checks are required.

3. Run production preflight before an expensive render:

   ```bash
   frameproof preflight --project .
   ```

   Fix error-level dependency, required asset/font, configuration, output-permission, or disk-capacity findings before rendering. Do not silence them by lowering the threshold without project evidence.

4. When a repeatable project render command exists, prefer the guarded renderer so the output hash and failure evidence are preserved:

   ```bash
   frameproof render run --project . --command "npm run render" --approve-render --output-video out/video.mp4 --verify-after-render
   ```

   Inspect the command before granting `--approve-render`. A stall warning is evidence, not proof of failure; use the timeout and log tail to diagnose the responsible stage.

5. Render the target composition before scanning. For Remotion:

   ```bash
   npx remotion render src/index.ts Main out/video.mp4
   ```

6. Prefer source-aware inputs when they exist:

   - Render Manifest: `.frameproof/manifest.json`;
   - captions: SRT, WebVTT, or Caption JSON;
   - final-export audio checks when narration or music is expected.

7. When the project profile is configured, prefer the reproducible one-command workflow:

   ```bash
   frameproof verify
   ```

   Otherwise run FrameProof explicitly and always produce JSON, HTML, and Fix Packet reports:

   ```bash
   node skills/generated-video-auditor/scripts/audit-video.mjs scan out/video.mp4 \
     --aspect 16:9 \
     --manifest .frameproof/manifest.json \
     --captions out/captions.srt \
     --audio --check-silence \
     --json artifacts/frameproof.json \
     --html artifacts/frameproof.html \
     --fix-packets artifacts/fix-packets.json
   ```

8. Read `artifacts/frameproof.json` and `artifacts/fix-packets.json`. Group findings by code and frame interval. Convert frame numbers to source timing using the report FPS.

9. Inspect the responsible source code and representative frames. Fix the root cause rather than increasing thresholds merely to make CI pass.

10. Rerender the same composition with the same input data and seed.

11. Run the identical FrameProof command again. A repair is complete only when the intended findings are gone and no new error-level findings appear.

12. Report:

   - command used;
   - composition and output path;
   - fixed finding codes and frame ranges;
   - remaining warnings and why they are accepted;
   - final exit code and report paths.

## Rules

- Keep rendering deterministic. Fix seeds, input data, fonts, asset versions, and time-dependent values.
- Never suppress `BLANK_FRAME`, aspect, codec, duration, or file-size errors without evidence that the rule is inappropriate.
- A `FROZEN_RUN` may be intentional only when the creative specification explicitly permits a held final state.
- Edge-activity warnings require frame inspection. They are likely crop-risk indicators, not OCR results.
- Treat the Render Manifest as source evidence. Do not invent a source location when the report has none.
- For a Fix Packet, apply the smallest source change, run its reproduce command when useful, then run its verify command.
- Caption checks are sidecar-data checks, not OCR. Audio checks must inspect the final export, not only the editor preview.
- When a platform preset and an exact `--aspect` are both supplied, satisfy both.
- Preserve the original report before changing code when auditing a regression.

## References

Read only the reference needed for the current task:

- `references/remotion.md` and `docs/REMOTION_INTEGRATION.md` for Render Manifests, source mapping, and deterministic rerenders;
- `references/x-video.md` for the X presets;
- `references/quality-rules.md` for finding interpretation.

## Revision workflow

When a baseline report exists, prefer a revision gate over judging the current report in isolation:

```bash
node skills/generated-video-auditor/scripts/audit-video.mjs scan out/video.mp4 \
  --manifest .frameproof/manifest.json \
  --baseline .frameproof/baseline.json \
  --acceptances .frameproof/acceptances.json \
  --json artifacts/current.json \
  --revision-json artifacts/revision.json \
  --revision-html artifacts/revision.html \
  --markdown artifacts/frameproof-pr.md \
  --sarif artifacts/frameproof.sarif \
  --junit artifacts/frameproof.xml
```

Prioritize `new` and `regressed` findings. Inspect `resolved` items to confirm that the underlying content still exists and was genuinely repaired rather than accidentally removed. Do not spend repair time on `unchanged` findings unless the user explicitly asks to clean the existing baseline.

An `accepted` finding is a human-reviewed exception, not proof that the underlying condition is good. Do not create or broaden an acceptance merely to make the gate pass. When the user approves an intentional exception, record a concrete reason, owner, and expiration date when appropriate.

After approval, promote the reviewed current report only with an explicit human decision:

```bash
frameproof baseline set .frameproof/artifacts/latest/report.json
```

Never overwrite the baseline before the current revision passes and receives human approval. Baseline replacement requires `--force` and must not be used merely to silence a regression.
## Guarded executable repair loop

Use the repair-session workflow only after the user has approved Agent and renderer execution. Studio may generate a plan, but it intentionally does not run an Agent from the browser.

1. Create a session from the failing current report:

   ```bash
   frameproof repair create artifacts/current.json \
     --project . \
     --agent codex \
     --render-command 'npm run render:range -- --from {fromFrame} --to {toFrame} --output "{output}"' \
     --full-render-command 'npm run render -- --output "{output}"' \
     --output-video out/repaired.mp4 \
     --output .frameproof/repairs/session.json
   ```

2. Inspect `session.json`, `prompt.md`, selected targets, allowed source files, and render command templates. Do not execute an unfamiliar shell command.

3. Run either one approved Agent attempt or the bounded loop:

   ```bash
   frameproof repair run .frameproof/repairs/session.json --agent codex --approve-agent

   frameproof repair loop .frameproof/repairs/session.json \
     --approve-agent --approve-render --max-iterations 2
   ```

   For Claude Code, pass `--agent claude`. FrameProof uses the same prompt and evidence contract for both.

4. If FrameProof reports `blocked_unexpected_changes`, stop. Review and revert or explicitly allow the additional files; do not broaden the allowlist merely to continue.

5. A range preview is optional and renderer-defined. The loop must still produce a complete output video and run a full FrameProof verification.

6. When the state becomes `awaiting_human_approval`, inspect the Git diff, the repaired full video, and verification reports. Complete the workflow only with a named human approval:

   ```bash
   frameproof repair approve .frameproof/repairs/session.json \
     --owner "reviewer" --reason "Diff and full verification reviewed"
   ```

Never commit, push, merge, publish, or approve automatically. Do not treat the Agent's summary as proof; use the Git diff and FrameProof verification artifacts.

