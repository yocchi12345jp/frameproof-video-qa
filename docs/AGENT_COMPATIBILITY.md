# Claude Code and Codex compatibility

FrameProof uses one canonical Agent Skill and two thin project-instruction layers. This prevents behavior drift while respecting how each coding agent discovers persistent instructions.

## Compatibility matrix

| Capability | Claude Code | Codex | FrameProof implementation |
|---|---|---|---|
| Reusable workflow | `SKILL.md` | `SKILL.md` | `skills/generated-video-auditor/` |
| Project instructions | `CLAUDE.md` | `AGENTS.md` | Both are committed at repository root |
| Structured evidence | JSON and exit codes | JSON and exit codes | Identical CLI output |
| Executable helper | Node.js script | Node.js script | `skills/generated-video-auditor/scripts/audit-video.mjs` |
| Guarded repair loop | `claude -p` adapter or custom command | `codex exec` adapter or custom command | Same session, explicit approvals, Git containment, full-render verification, human receipt |

## Install the skill for both agents

```bash
npx skills add yocchi12345jp/frameproof-video-qa \
  --skill generated-video-auditor \
  --agent claude-code \
  --agent codex
```

The open `skills` CLI installs the same canonical skill into each agent's supported skill location. Use `--copy` when symlinks are undesirable on Windows.

```bash
npx skills add yocchi12345jp/frameproof-video-qa \
  --skill generated-video-auditor \
  --agent claude-code \
  --agent codex \
  --copy \
  --yes
```

## Direct invocation

Claude Code can invoke the installed skill as `/generated-video-auditor`. Codex can select the installed skill from its skills interface or be instructed to use `generated-video-auditor`. Both agents should follow the same render, scan, inspect, repair, rerender, and rescan sequence.

## Deliberately avoided features

The canonical skill does not use agent-specific extensions such as:

- Claude-only `context: fork`, hooks, dynamic shell injection, or `${CLAUDE_SKILL_DIR}` variables;
- Codex-only sandbox paths, model names, or approval flags;
- commands that assume one interactive UI.

Agent-specific capabilities may be documented in separate adapters later, but the canonical workflow and testable acceptance criteria must remain portable.

## Validation

Run:

```bash
npm run check:agents
npm run check
```

The compatibility validator checks the canonical frontmatter, agent instruction files, README installation command, prohibited agent-specific constructs, and packaged files. Runtime validation with the actual Claude Code and Codex clients is still recommended before each public release.
## Executable adapters and approval boundary

FrameProof can create and run a versioned repair session. Built-in adapters use non-interactive Claude Code and Codex commands, and a custom command can be supplied for testing or another local Agent. The adapters are not part of the ordinary scan path.

- Agent execution requires `--approve-agent`.
- Renderer command execution requires `--approve-render`.
- A clean Git working tree is required unless the reviewer explicitly passes `--allow-dirty`.
- Changed files are compared with the source files selected from Fix Packets. Unexpected changes block the session.
- Successful re-audit stops at `awaiting_human_approval`; FrameProof never commits or approves its own repair.

Client-specific availability still depends on the user's installed Claude Code or Codex CLI. The shared tests use a custom local Agent command to validate the state machine without requiring either proprietary client in CI.

