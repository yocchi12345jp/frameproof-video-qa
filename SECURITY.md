# Security Policy

## Supported versions

The latest released minor version receives security fixes. Pre-release archives are not supported after a newer release candidate is published.

## Reporting a vulnerability

Do not disclose vulnerabilities, private media, credentials, or exploit files in a public issue. Contact the repository owner through the email address listed on the public GitHub profile and include:

- affected version or commit;
- minimal reproduction steps;
- impact and affected trust boundary;
- suggested remediation, when available.

## Security-sensitive surfaces

- FFmpeg/FFprobe processing of untrusted media;
- Studio loopback APIs and local file registration;
- approved render commands;
- Claude Code, Codex, and custom Agent execution;
- GitHub Actions and npm publication.

FrameProof requires explicit approval before render or Agent execution, blocks unmapped repair scopes by default, checks Agent file changes, and never automatically commits, pushes, merges, publishes, or gives final human approval. See `docs/THREAT_MODEL.md` for current controls and residual risks.

## Data handling

The core scanner and Studio are local-first. They do not upload video frames, captions, reports, or source code and do not include telemetry. Optional external Agent CLIs may have their own data-handling policies; review those policies before execution.
