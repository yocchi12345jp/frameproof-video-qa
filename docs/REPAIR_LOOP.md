# Guarded repair loop

FrameProof v0.6 turns source-aware findings into a bounded, auditable repair session. It can coordinate Claude Code, Codex, or a custom local command, but it does not grant itself permission to edit, render, commit, or approve.

## State model

Typical successful states:

```text
planned
  -> agent_completed
  -> preview_ready (optional)
  -> rendered
  -> awaiting_human_approval
  -> approved
```

Blocking or failure states include `blocked_dirty_tree`, `blocked_unexpected_changes`, `agent_failed`, `render_failed`, `verification_failed`, and `max_iterations_reached`.

## 1. Create a session

```bash
frameproof repair create artifacts/current.json \
  --project . \
  --agent codex \
  --render-command 'npm run render:range -- --from {fromFrame} --to {toFrame} --output "{output}"' \
  --full-render-command 'npm run render -- --output "{output}"' \
  --output-video out/repaired.mp4 \
  --max-iterations 2 \
  --output .frameproof/repairs/session.json \
  --session-html .frameproof/repairs/session.html
```

The session selects new/regressed error findings by default. `--include-warnings` and `--include-unchanged` broaden scope and should be used intentionally. Frame ranges are padded and merged for preview efficiency. Source mappings become the initial allowed-file set.

## 2. Review before execution

Inspect:

- selected findings and Fix Packets;
- allowed source files;
- Agent prompt;
- maximum iterations;
- partial and full render command templates;
- output paths.

Supported template tokens are `{fromFrame}`, `{toFrame}`, `{fromSeconds}`, `{toSeconds}`, `{composition}`, `{output}`, and `{projectRoot}`. Templates run through the operating-system shell and therefore require the same scrutiny as any local script.

## 3. Run an Agent

```bash
frameproof repair run .frameproof/repairs/session.json \
  --agent codex --approve-agent

frameproof repair run .frameproof/repairs/session.json \
  --agent claude --approve-agent
```

Built-in adapters use non-interactive modes. A custom executable and JSON argument array may be supplied with `--agent-command` and `--agent-args`. The project must be a Git repository and clean unless `--allow-dirty` is explicitly supplied.

After execution, FrameProof captures Git status and diff. A source-mapped session blocks when files outside the allowlist changed. The reviewer may add a narrowly justified `--allow-file`, but should not broadly disable containment.

## 4. Render previews and the full output

```bash
frameproof repair preview .frameproof/repairs/session.json --approve-render
frameproof repair render .frameproof/repairs/session.json --approve-render
```

Preview renders are optional and depend on a project-supplied range-render command. The full render is mandatory for final verification.

## 5. Verify

```bash
frameproof repair verify .frameproof/repairs/session.json \
  --video out/repaired.mp4
```

FrameProof rescans the complete rendered output and compares it with the pre-repair report. Verification passes only when selected targets are resolved or improved and no new/regressed error-level finding appears.

## 6. Bounded loop

```bash
frameproof repair loop .frameproof/repairs/session.json \
  --approve-agent --approve-render --max-iterations 2
```

Each failed verification is summarized back into the next Agent prompt. The loop stops when verification passes, a safety check blocks, rendering fails, or the iteration limit is reached. A successful loop stops at `awaiting_human_approval`.

## 7. Human approval

```bash
frameproof repair approve .frameproof/repairs/session.json \
  --owner "reviewer" \
  --reason "Reviewed source diff and full repaired render" \
  --receipt artifacts/repair-approval.json
```

The receipt records the reviewer, reason, verification paths and summary, Git head, changed files, diff SHA-256, and receipt SHA-256. Approval does not commit or publish the changes.

## Security boundary

- Scan, compare, and Studio planning paths do not invoke remote Agents.
- Agent and renderer execution have separate explicit approvals.
- No automatic commit, push, merge, release, publish, or credential change.
- Generated media and `.frameproof` artifacts are excluded from changed-source containment.
- Shell command templates must be reviewed before approval.
- Final proof is the full rendered video, not an Agent summary or partial preview.
