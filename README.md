# Salesforce Metadata Drift Report

[![CI](https://github.com/shivaprakashpokala/salesforce-metadata-drift-report/actions/workflows/ci.yml/badge.svg)](https://github.com/shivaprakashpokala/salesforce-metadata-drift-report/actions/workflows/ci.yml)

Find out exactly how a sandbox differs from production, on a schedule, without clicking through Setup.

Orgs drift apart when someone edits a field in Setup, deploys by hand, or fixes something directly in production. This action compares the metadata of two orgs and publishes a clear report on the workflow run page: what is missing, what was added, and what changed, down to the setting.

**Why teams use it**

- **Catch drift before a release.** Know whether your sandbox still matches production before you build or deploy on top of it.
- **See manual changes.** Edits made in Setup to compared metadata show up like any other change, with the before and after value.
- **Read it in one place.** The report appears in the Job Summary as plain tables, with Apex changes shown as a diff. No hosting or extra tools.
- **Automate the response.** Outputs such as `has-drift` let a workflow fail, notify, or open an issue when drift appears.

## What the report looks like

> # 🟠 Drift found
> 44 of 417 components differ between **acme** and **acme--uat**.
>
> | Result | Components |
> | :--- | :--- |
> | ➖ Missing from target | **1** |
> | ➕ Only in target | **2** |
> | ✏️ Changed | **41** |
> | ✅ Unchanged | 373 |
>
> | Component | Setting | Baseline | Target |
> | :--- | :--- | :--- | :--- |
> | `Account.Status__c` | Length | `50` | `80` |
> | `Sales_User` | Object permissions › Invoice\_\_c › Allow edit | `false` | `true` |

The full report also lists the orgs compared, every missing, added and changed component, and what was in scope. Markdown, HTML and JSON copies are saved as a workflow artifact.

## Quick start

**1. Store an auth URL for each org as a repository secret.**

```bash
sf org login web --alias prod
sf org auth show-sfdx-auth-url --target-org prod --json
```

Copy `result.sfdxAuthUrl` into a secret such as `SFDX_PROD_AUTH_URL`. For a sandbox, add `--instance-url https://test.salesforce.com` to the login. Use an integration user with **API Enabled**, **View Setup and Configuration** and **Modify Metadata Through Metadata API Functions** (the Metadata API needs it to retrieve, even though nothing is deployed).

**2. Add a workflow,** for example `.github/workflows/metadata-drift.yml`:

```yaml
name: Metadata drift

on:
  workflow_dispatch:
  schedule:
    - cron: '0 6 * * 1'   # Mondays 06:00 UTC

permissions:
  contents: read

jobs:
  drift-report:
    runs-on: ubuntu-latest
    steps:
      - run: npm install --global @salesforce/cli

      - uses: shivaprakashpokala/salesforce-metadata-drift-report@v1
        id: drift
        with:
          baseline-auth-url: ${{ secrets.SFDX_PROD_AUTH_URL }}   # source of truth
          target-auth-url: ${{ secrets.SFDX_QA_AUTH_URL }}       # org to check

      # Optional: fail the run when anything differs
      - if: steps.drift.outputs.has-drift == 'true'
        run: exit 1
```

Ready-made workflows: [production vs one sandbox](examples/org-vs-sandbox.yml) and [production vs several sandboxes](examples/sandbox-matrix.yml).

## What is compared

By default:

- **Metadata types:** CustomObject, Layout, Flow, Profile, PermissionSet, FlexiPage, ApexClass, ApexTrigger, CustomApplication, RemoteSiteSetting
- **Objects:** every custom object with its fields, validation rules and record types, plus Account, Contact, Lead, Opportunity and Case

Add other types with `metadata-types`, or pass your own `package.xml` for full control. Differences in XML formatting or element order are ignored, so only real changes are reported.

Not compared: data records, users and their assignments, managed-package components (unless listed in a `package.xml`), and any type outside the scope.

## Reading the result

| Outcome | Meaning | Step |
| :--- | :--- | :--- |
| `drift` | Something differs | Passes (add a step to fail if you want) |
| `no-drift` | Everything in scope matches | Passes |
| `incomplete` | Part of the scope could not be retrieved or recognized, so a clean result cannot be confirmed. The report lists the reason. | Fails |
| `error` | The comparison could not run, for example an expired auth URL. The Job Summary explains how to fix it. | Fails |

The action also checks the inputs make sense. It stops if both secrets point to the same org, and warns if production is the target instead of the baseline or if the two orgs belong to different companies.

## Inputs

Only the two auth URLs are required.

| Input | Default | Description |
| :--- | :--- | :--- |
| `baseline-auth-url` | required | Auth URL of the source of truth, usually production. |
| `target-auth-url` | required | Auth URL of the org to check, usually a sandbox. |
| `metadata-types` | see above | Comma-separated types to compare. |
| `standard-objects` | Account, Contact, Lead, Opportunity, Case | Standard objects to include with CustomObject. |
| `package-xml-path` | | Your own `package.xml`, used instead of the two inputs above. Check out the repository first. |
| `api-version` | latest both orgs support | For example `64.0`. |
| `baseline-label`, `target-label` | My Domain name, such as `acme--uat` | Names shown in the report. |
| `job-summary`, `upload-artifact` | `true` | Turn the Job Summary or the artifact off. |
| `artifact-name` | `salesforce-metadata-drift-report` | Set a unique name per job when comparing several orgs in one run. |
| `artifact-retention-days` | `14` | Days to keep the artifact. |
| `output-dir` | `drift-report` | Folder for the report files on the runner. |
| `working-dir` | `.sf-drift-work` | Temporary folder for retrieved metadata, removed after the run. |

## Outputs

| Output | Description |
| :--- | :--- |
| `comparison-status` | `drift`, `no-drift`, `incomplete` or `error` |
| `has-drift` | `true` when anything differs |
| `added-count`, `removed-count`, `changed-count`, `unchanged-count` | Component counts. Removed means in the baseline but missing from the target. |
| `report-md-path`, `report-html-path`, `report-json-path` | Paths to the report files |
| `artifact-id` | ID of the uploaded artifact |

## Good to know

- **Security.** Auth URLs are masked in logs and never written to the report. The Salesforce CLI runs with its own temporary home folder, so the action leaves no logins behind and does not touch logins already on a self-hosted runner.
- **Size limit.** Salesforce returns at most 10,000 files or 39 MB per retrieve. For a very large org, narrow `metadata-types` or list named members in a `package.xml`.
- **Profiles and permission sets** only include entries for objects, classes and other components in the same comparison, so keep them in scope together.
- **Runners.** Works on GitHub-hosted runners. Self-hosted runners need Node.js 24.

## License

[MIT](LICENSE)
