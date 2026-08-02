# Governance

## Project ownership

FrameProof is currently maintained under a benevolent-maintainer model.

- **Primary maintainer:** `yocchi12345jp`
- **Repository:** `yocchi12345jp/frameproof-video-qa`

The primary maintainer is responsible for issue triage, pull-request review, release management, security coordination, compatibility policy, and changes to default quality thresholds.

## Decision process

Routine fixes may be merged after tests and review. The following changes require explicit primary-maintainer approval:

- default threshold changes;
- JSON schema compatibility changes;
- new network behavior or telemetry;
- security-sensitive process execution;
- release signing and npm publication;
- changes that couple the core to one renderer.

Public design discussion should occur in GitHub Issues or Discussions before substantial implementation.

## Becoming a maintainer

Contributors may be invited into a maintainer role after sustained, high-quality participation across code review, issue support, documentation, tests, and release work. Maintainer access is based on demonstrated responsibility rather than commit count alone.

## Project principles

- deterministic and explainable quality decisions;
- local-first handling of private media;
- renderer-agnostic core;
- small supply-chain surface;
- documented human authority over releases and security decisions.
