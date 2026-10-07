import * as core from '@actions/core';
import type { ActionInputs } from './types.js';

export const DEFAULT_OUTPUT_DIR = 'drift-report';
export const DEFAULT_WORKING_DIR = '.sf-drift-work';
export const DEFAULT_ARTIFACT_NAME = 'salesforce-metadata-drift-report';

/**
 * Test-only hooks: compare two local metadata folders instead of retrieving
 * from orgs. Used by the bundle smoke test and the CI fixture job.
 */
export const FIXTURE_BASELINE_ENV = 'DRIFT_TEST_BASELINE_PATH';
export const FIXTURE_TARGET_ENV = 'DRIFT_TEST_TARGET_PATH';

export interface FixturePaths {
  baseline: string;
  target: string;
}

export function readFixturePaths(env: NodeJS.ProcessEnv = process.env): FixturePaths | undefined {
  const baseline = env[FIXTURE_BASELINE_ENV]?.trim();
  const target = env[FIXTURE_TARGET_ENV]?.trim();
  return baseline && target ? { baseline, target } : undefined;
}

function parseList(raw: string): string[] {
  return raw.split(',').map((value) => value.trim()).filter(Boolean);
}

function parseBoolean(name: string, defaultValue: boolean): boolean {
  const raw = core.getInput(name).trim().toLowerCase();
  if (raw === '') return defaultValue;
  if (['true', 'yes', '1'].includes(raw)) return true;
  if (['false', 'no', '0'].includes(raw)) return false;
  throw new Error(`${name} must be true or false, got "${raw}".`);
}

function parsePositiveInt(name: string): number | undefined {
  const raw = core.getInput(name).trim();
  if (raw === '') return undefined;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive whole number of days, got "${raw}".`);
  }
  return parsed;
}

export function parseInputs(): ActionInputs {
  return {
    baselineAuthUrl: core.getInput('baseline-auth-url').trim() || undefined,
    targetAuthUrl: core.getInput('target-auth-url').trim() || undefined,
    baselineLabel: core.getInput('baseline-label') || undefined,
    targetLabel: core.getInput('target-label') || undefined,
    metadataTypes: [...new Set(parseList(core.getInput('metadata-types')))],
    standardObjects: [...new Set(parseList(core.getInput('standard-objects')))],
    apiVersion: core.getInput('api-version').trim() || undefined,
    packageXmlPath: core.getInput('package-xml-path') || undefined,
    outputDir: core.getInput('output-dir') || DEFAULT_OUTPUT_DIR,
    workingDir: core.getInput('working-dir') || DEFAULT_WORKING_DIR,
    uploadArtifact: parseBoolean('upload-artifact', true),
    artifactName: core.getInput('artifact-name') || DEFAULT_ARTIFACT_NAME,
    artifactRetentionDays: parsePositiveInt('artifact-retention-days'),
    jobSummary: parseBoolean('job-summary', true),
  };
}

export function validateInputs(inputs: ActionInputs, fixtures?: FixturePaths): void {
  if (fixtures) return;
  const missing = [
    inputs.baselineAuthUrl ? '' : 'baseline-auth-url',
    inputs.targetAuthUrl ? '' : 'target-auth-url',
  ].filter(Boolean);
  if (missing.length) {
    throw new Error(
      `Missing required input: ${missing.join(' and ')}. Pass each SFDX auth URL from a repository secret, ` +
        'for example baseline-auth-url: ${{ secrets.SFDX_PROD_AUTH_URL }}. An empty value usually means the secret ' +
        'name is misspelled or the secret is not available to this workflow.',
    );
  }
  if (inputs.baselineAuthUrl === inputs.targetAuthUrl) {
    throw new Error('baseline-auth-url and target-auth-url are identical. Use a different secret for each org.');
  }
}
