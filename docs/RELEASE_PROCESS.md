# Release process

## Automated validation

1. Ensure the milestone contains only completed issues.
2. Run `npm run check`.
3. Run `npm run check:package` and verify installation from the produced tarball in a clean temporary project.
4. Confirm GitHub Actions pass on Windows, macOS, and Linux.
5. Confirm the local composite Action smoke test passes.
6. Update `CHANGELOG.md`, `ROADMAP.md`, package version, and release notes.

## Human-controlled publication

1. Review the complete Git diff and generated package file list.
2. Create a signed or verified Git tag.
3. Create the GitHub Release.
4. Allow the protected `npm` GitHub environment to run `.github/workflows/publish.yml`.
5. Verify npm Trusted Publishing accepted the OIDC identity and generated provenance.
6. Verify `npx frameproof-video-qa --version`, `doctor`, `init --dry-run`, and package imports from a clean machine.
7. Move the `v0` GitHub Action tag only after the release is verified.

The release workflow intentionally uses no long-lived npm publish token. See [npm trusted publishing](NPM_TRUSTED_PUBLISHING.md).
