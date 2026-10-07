import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as core from '@actions/core';
import { parseInputs, readFixturePaths, validateInputs } from '../src/inputs.js';
import type { ActionInputs } from '../src/types.js';

vi.mock('@actions/core', () => ({ getInput: vi.fn() }));

function inputs(overrides: Partial<ActionInputs> = {}): ActionInputs {
  return {
    metadataTypes: ['CustomObject'],
    standardObjects: [],
    outputDir: 'drift-report',
    workingDir: '.sf-drift-work',
    uploadArtifact: true,
    artifactName: 'salesforce-metadata-drift-report',
    jobSummary: true,
    ...overrides,
  };
}

function setInputs(values: Record<string, string>): void {
  vi.mocked(core.getInput).mockImplementation((name: string) => values[name] ?? '');
}

describe('parseInputs', () => {
  beforeEach(() => vi.clearAllMocks());

  it('splits lists, trims values and leaves api-version empty for auto-detection', () => {
    setInputs({
      'baseline-auth-url': ' force://a ',
      'target-auth-url': 'force://b',
      'metadata-types': 'CustomObject, ApexClass,,ApexClass',
      'standard-objects': 'Account , Contact',
    });
    const parsed = parseInputs();
    expect(parsed.baselineAuthUrl).toBe('force://a');
    expect(parsed.metadataTypes).toEqual(['CustomObject', 'ApexClass']);
    expect(parsed.standardObjects).toEqual(['Account', 'Contact']);
    expect(parsed.apiVersion).toBeUndefined();
    expect(parsed.uploadArtifact).toBe(true);
  });

  it('rejects malformed booleans and retention days', () => {
    setInputs({ 'upload-artifact': 'maybe' });
    expect(() => parseInputs()).toThrow(/upload-artifact must be true or false/);
    setInputs({ 'artifact-retention-days': '0' });
    expect(() => parseInputs()).toThrow(/artifact-retention-days/);
  });
});

describe('validateInputs', () => {
  it('names every missing auth URL and hints at the secret', () => {
    expect(() => validateInputs(inputs())).toThrow(/baseline-auth-url and target-auth-url.*secret/);
    expect(() => validateInputs(inputs({ baselineAuthUrl: 'force://a' }))).toThrow(/Missing required input: target-auth-url/);
  });

  it('rejects the same auth URL for both orgs', () => {
    expect(() => validateInputs(inputs({ baselineAuthUrl: 'force://a', targetAuthUrl: 'force://a' }))).toThrow(/identical/);
  });

  it('accepts two auth URLs', () => {
    expect(() => validateInputs(inputs({ baselineAuthUrl: 'force://a', targetAuthUrl: 'force://b' }))).not.toThrow();
  });

  it('skips auth checks for local fixture runs', () => {
    expect(() => validateInputs(inputs(), { baseline: 'a', target: 'b' })).not.toThrow();
  });
});

describe('readFixturePaths', () => {
  it('requires both test folders', () => {
    expect(readFixturePaths({ DRIFT_TEST_BASELINE_PATH: 'a' })).toBeUndefined();
    expect(readFixturePaths({ DRIFT_TEST_BASELINE_PATH: 'a', DRIFT_TEST_TARGET_PATH: 'b' })).toEqual({ baseline: 'a', target: 'b' });
  });
});
