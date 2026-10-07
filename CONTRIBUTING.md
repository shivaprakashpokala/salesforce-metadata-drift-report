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
