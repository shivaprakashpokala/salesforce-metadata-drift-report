# Salesforce Metadata Drift Report

[![CI](https://github.com/shivaprakashpokala/salesforce-metadata-drift-report/actions/workflows/ci.yml/badge.svg)](https://github.com/shivaprakashpokala/salesforce-metadata-drift-report/actions/workflows/ci.yml)

Give this action two SFDX auth URLs, `baseline-auth-url` and `target-auth-url`, and it reports how the target org differs from the baseline.

It retrieves the same metadata from both orgs, usually production and a sandbox, compares them, and lists what was added, what is missing and what changed. Drift alone never fails the job.

## What you need

- The Salesforce CLI (`sf`) on the runner. The workflow below installs it.
- Two repository secrets, each holding the auth URL of one org.

## What gets compared

The action compares **Salesforce metadata components** — the units the Metadata API and source-format projects use — not arbitrary folders, org **data**, or Setup screens. Examples: custom objects (and their fields, validation rules, and record types), profiles, permission sets, Apex classes and triggers, flows, layouts, Lightning pages, apps, and remote site settings.

**Default scope** (when you do not set `package-xml-path`):

- **`metadata-types`:** `CustomObject`, `Layout`, `Flow`, `Profile`, `PermissionSet`, `FlexiPage`, `ApexClass`, `ApexTrigger`, `CustomApplication`, `RemoteSiteSetting`
- **`CustomObject`:** all custom objects in each org (`*`); standard objects are **not** included unless you list them below
- **`standard-objects`:** `Account`, `Contact`, `Lead`, `Opportunity`, `Case` (only used when `CustomObject` is in `metadata-types`)

**Change the scope:**

| Input | Effect |
|---|---|
| `metadata-types` | Comma-separated types to retrieve and compare. Other supported types include `ApexPage`, `CustomTab`, `LightningComponentBundle`, `NamedCredential`, `StaticResource`, and more; unsupported types require a manifest. |
| `standard-objects` | Standard object API names to include with `CustomObject` |
| `package-xml-path` | Path to your `package.xml`. When set, it **replaces** `metadata-types` and `standard-objects` |

**Excluded or out of scope:**

- **Managed packages:** wildcard retrieve (the default inputs) does **not** pull metadata installed from managed packages, so those components are not compared. List them explicitly in `package.xml` if you need them.
- **Not in the manifest or defaults:** users, Chatter, reports, and any metadata type you did not retrieve are not compared.
- **Profiles and permission sets:** object, field, Apex class, page, tab, app, and record-type entries are compared only when that target is also in scope. After org retrieve, the action applies the same filter so both sides match.
- **Unrecognized files:** if the retrieve contains files that are not Salesforce metadata (or paths ignored by `.forceignore` are left over), the report warns and the outcome is **`incomplete`**. Retrieve warnings (for example a listed standard object missing in one org) also mark the run incomplete even though the report is published.

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

## License

[MIT](LICENSE)
