# Salesforce Metadata Drift Report

[![CI](https://github.com/shivaprakashpokala/salesforce-metadata-drift-report/actions/workflows/ci.yml/badge.svg)](https://github.com/shivaprakashpokala/salesforce-metadata-drift-report/actions/workflows/ci.yml)

Give this action two SFDX auth URLs, `baseline-auth-url` and `target-auth-url`, and it reports how the target org differs from the baseline.

It retrieves the same metadata from both orgs, usually production and a sandbox, compares them, and lists what was added, what is missing and what changed. Drift alone never fails the job.

## What you need

- The Salesforce CLI (`sf`) on the runner. The workflow below installs it.
- Two repository secrets, each holding the auth URL of one org.

## Workflow

Save this as `.github/workflows/metadata-drift.yml`:

```yaml
name: Metadata drift

on:
  workflow_dispatch:
  schedule:
    - cron: '0 6 * * 1'

permissions:
  contents: read

jobs:
  drift-report:
    runs-on: ubuntu-latest
    steps:
      - name: Install Salesforce CLI
        run: npm install --global @salesforce/cli

      - name: Compare production with QA
        id: drift
        uses: shivaprakashpokala/salesforce-metadata-drift-report@v1
        with:
          baseline-auth-url: ${{ secrets.SFDX_PROD_AUTH_URL }}
          target-auth-url: ${{ secrets.SFDX_QA_AUTH_URL }}

      - name: Fail on drift
        if: steps.drift.outputs.has-drift == 'true'
        run: exit 1
```

Leave out the last step if drift should only be reported. To check several sandboxes, see [examples/sandbox-matrix.yml](examples/sandbox-matrix.yml).

This repository is private. To use the action from your other repositories, open this repository's **Settings > Actions > General** and, under **Access**, allow repositories owned by the same account.

## Get an auth URL

Log in to each org once on your machine and print its auth URL:

```bash
sf org login web --alias prod
sf org auth show-sfdx-auth-url --target-org prod --json
```

Copy `result.sfdxAuthUrl` into a repository secret such as `SFDX_PROD_AUTH_URL`, then repeat for the sandbox (use `--instance-url https://test.salesforce.com` when logging in). Never commit an auth URL.

Use a dedicated integration user in each org with **API Enabled**, **View Setup and Configuration** and **Modify Metadata Through Metadata API Functions**. The Metadata API needs the last one even for read-only retrieves.

## What you get

- **Artifact** `salesforce-metadata-drift-report` with the report as Markdown, HTML and JSON.
- **Job Summary** with the same report: the verdict, added, missing and changed components, and a line diff for Apex. It shows each org's username and Org ID.
- **Outputs**:

  | Output | Value |
  |---|---|
  | `comparison-status` | `drift`, `no-drift`, `incomplete` or `error` |
  | `has-drift` | `true` when anything was added, missing or changed |
  | `added-count`, `removed-count`, `changed-count`, `unchanged-count` | Component counts. Removed means missing from the target. |
  | `report-md-path`, `report-json-path`, `report-html-path` | Report files on the runner |
  | `artifact-id` | ID of the uploaded artifact |

The status is `incomplete` when Salesforce could not return some of the requested metadata, for example a standard object that does not exist in one org. The report is still published, but the step fails because a clean result cannot be confirmed. The warnings in the report say what was missing.

## Optional inputs

| Input | Default | Description |
|---|---|---|
| `metadata-types` | `CustomObject, Layout, Flow, Profile, PermissionSet, FlexiPage, ApexClass, ApexTrigger, CustomApplication, RemoteSiteSetting` | Types to compare. Fields, validation rules and record types come with `CustomObject`. |
| `standard-objects` | `Account, Contact, Lead, Opportunity, Case` | Standard objects to compare along with their custom fields. |
| `package-xml-path` | | Your own `package.xml`, used instead of the two inputs above. |
| `api-version` | latest version both orgs support | For example `64.0`. |
| `baseline-label`, `target-label` | org name | Names shown in the report. |
| `artifact-name` | `salesforce-metadata-drift-report` | Must be unique within a workflow run. |
| `artifact-retention-days` | `14` | Days to keep the artifact. |
| `upload-artifact`, `job-summary` | `true` | Turn the artifact or Job Summary off. |

Components installed from managed packages are not compared.

## License

[MIT](LICENSE)
