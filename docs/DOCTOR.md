# Environment diagnostics

`frameproof doctor` provides a single local readiness report for scanning and optional Agent repair.

```bash
frameproof doctor
```

Required checks:

- Node.js 20 or newer;
- FFmpeg;
- FFprobe;
- Git.

Optional checks:

- npm;
- Codex CLI;
- Claude Code CLI;
- initialized `.frameproof/project.json`;
- project-level `frameproof.config.json`.

The command exits with code `1` only when a required dependency is unavailable. Missing Claude Code or Codex does not prevent scans, Studio, revision comparison, or report generation.

Machine-readable output:

```bash
frameproof doctor --json-output
```

The JSON contains operating system, architecture, Node version, detected project type, package manager, individual checks, and separate `agents.codex` / `agents.claude` booleans.
