# npm trusted publishing

FrameProof uses a two-stage first-release process because npm Trusted Publisher settings are configured against a package and a specific public GitHub workflow.

## First public beta

1. Publish the GitHub repository and create the `v0.8.1` **draft** release with `PUBLISH_TO_GITHUB.ps1` or `publish-to-github.sh`.
2. Authenticate interactively to the official npm registry. Do not paste npm tokens into chat, source files, or GitHub secrets unless an npm fallback token is intentionally required.
3. Run `PUBLISH_FIRST_NPM.ps1` or `publish-first-npm.sh`. This publishes `frameproof-video-qa@0.8.1` using the `beta` dist-tag.
4. On npmjs.com, configure the Trusted Publisher for repository `yocchi12345jp/frameproof-video-qa` and workflow `.github/workflows/publish.yml`.
5. Optionally configure the GitHub `npm` environment and required reviewers.
6. Publish the draft GitHub Release. The workflow is idempotent: it skips v0.8.1 if the manual first publish already created that version.

## Future releases

Future published GitHub Releases use npm OIDC Trusted Publishing with no long-lived npm token. The workflow requires:

- npm CLI 11.5.1 or newer;
- Node.js 22.14.0 or newer;
- a GitHub-hosted runner;
- `permissions.id-token: write`;
- an npm Trusted Publisher entry matching the exact repository and workflow filename;
- a public repository and public package for automatic provenance.

The release workflow uses Node.js 24, disables dependency caching, verifies the release tag against `package.json`, runs all validation and package smoke tests, and publishes under the `beta` dist-tag while the project is pre-1.0.
