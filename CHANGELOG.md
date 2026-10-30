# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Fixed

- Notices from the Salesforce CLI itself, such as deprecation warnings, are shown in the report but no longer make the comparison incomplete. Only problems the Metadata API reports for the retrieve do.
- Profile and permission set `layoutAssignments` and `loginIpRanges` are matched by their content, so one added or reordered entry is reported as that entry instead of shifting every entry after it.
- The action runs the Salesforce CLI with a home folder of its own and removes it afterwards. Logging out no longer removes a login the runner already had for the same user, which affected self-hosted runners and local runs.
- A retrieve that exceeds the Metadata API limit of 10,000 files or 39 MB fails with an explanation and how to narrow the scope.

### Documentation

- README: describe the per-retrieve Metadata API limit.
- CONTRIBUTING: test against two free scratch orgs with `npm run test:live`.

## [1.0.2] - 2026-10-09

### Documentation

- README: describe drift across environments, not only production versus one sandbox.
- README: document optional inputs, including `output-dir` and `working-dir`.
- README: link both example workflows, `examples/org-vs-sandbox.yml` and `examples/sandbox-matrix.yml`.

## [1.0.1] - 2026-10-08

### Documentation

- README: describe what gets compared and how drift is found.
- CONTRIBUTING: add a before publishing checklist.
- Changelog: correct logout timing in the 1.0.0 entry.

## [1.0.0] - 2026-10-07

### Added

- Compare a baseline org (the source of truth) with a target org, usually a sandbox,
  using `baseline-auth-url` and `target-auth-url`. Metadata is retrieved with the `sf` CLI
  and the action logs out of both orgs as soon as retrieval finishes, before comparing.
  The retrieved metadata is deleted at the end of the run.
- Drift report in Markdown, JSON and HTML. The report starts with the verdict, lists
  added and missing components as tables, shows Apex changes as a line diff and links
  to the workflow run.
- The report files are uploaded as a workflow artifact and the Markdown report is
  written to the Job Summary.
- Outputs: `comparison-status`, `has-drift`, `added-count`, `removed-count`,
  `changed-count`, `unchanged-count`, `report-md-path`, `report-json-path`,
  `report-html-path` and `artifact-id`.
- Supported types include `CustomObject` with its fields, `Layout`, `Flow`, `Profile`,
  `PermissionSet`, `FlexiPage`, `ApexClass`, `ApexTrigger`, `CustomApplication`,
  `RemoteSiteSetting`, `CustomLabel`, `CustomPermission`, `GlobalValueSet`,
  `CustomMetadata`, `NamedCredential`, `PermissionSetGroup` and `QuickAction`.
  Other types are compared as whole files.
- `api-version` defaults to the latest version both orgs support.
- Org kind detection (scratch, sandbox, developer, production) shown on every report.
- Example workflows in `examples/`.

### Security

- Auth URLs are masked in logs and never written to reports. They are passed to the
  CLI through a temporary file with mode `0600` that is deleted afterwards.
- Identical `baseline-auth-url` and `target-auth-url` values are rejected.
