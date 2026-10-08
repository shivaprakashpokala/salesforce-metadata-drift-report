# Contributing

Use Node.js 24.

```bash
npm ci
npm run lint
npm test
npm run build
npm run test:bundle
```

`npm run build` regenerates `dist/`, which is what GitHub runs. Commit it with your change; CI fails when it does not match `src/`.

Tests must not call a real org or the artifact service. Use a fake `CliExecutor` (see `__tests__/retrieve.test.ts`) or `ArtifactUploader` (see `__tests__/artifact.test.ts`). Do not commit auth URLs or real org metadata.

## Releasing

1. Update the version in `package.json` and `package-lock.json`, and add a `CHANGELOG.md` entry.
2. Push to `main`, then push a tag such as `v1.2.3`.

The release workflow checks the build, runs the live org check when the `SF_BASELINE_AUTH_URL` and `SF_TARGET_AUTH_URL` secrets are set, creates the GitHub Release and moves the major tag (`v1`).

## Before publishing

Use this checklist before making the repository public and listing the action on GitHub Marketplace:

- Confirm the latest `main` CI run is green and the `v1` tag points at a release you are willing to support.
- Add a repository description and topics on GitHub; confirm the `LICENSE` file is correct.
- Under **Settings → Actions → General → Access**, allow this action for other private repositories if you need that (`access_level: user` or your org policy).
- Do not commit secrets; auth URLs belong only in consumer workflow secrets.
- Optional: add `SF_BASELINE_AUTH_URL` and `SF_TARGET_AUTH_URL` to the `salesforce-validation` environment for the live-org validation workflow. Consumers do not need these secrets.
- For Marketplace: publish from a GitHub Release, accept the GitHub Marketplace developer agreement, and enable 2FA on the publishing account.
- After the repository is public: update workflow pins if needed, and delete the obsolete `salesforce-org-metadata-diff` repository if it still exists.
