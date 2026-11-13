import { describe, it, expect, afterAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-drift-run-'));
const previousEnv = { ...process.env };
afterAll(() => {
  process.env = previousEnv;
  process.exitCode = 0;
  fs.rmSync(tmp, { recursive: true, force: true });
});

/** Values written with core.setOutput, last one first. */
function outputs(file: string, name: string): string[] {
  const values = [...fs.readFileSync(file, 'utf8').matchAll(new RegExp(`^${name}<<(\\S+)\\r?\\n([\\s\\S]*?)\\r?\\n\\1$`, 'gm'))];
  return values.map((match) => match[2]).reverse();
}

describe('run', () => {
  it('keeps the comparison result when the artifact upload fails', async () => {
    const outputFile = path.join(tmp, 'output.txt');
    const summaryFile = path.join(tmp, 'summary.md');
    fs.writeFileSync(outputFile, '');
    fs.writeFileSync(summaryFile, '');
    Object.assign(process.env, {
      DRIFT_TEST_BASELINE_PATH: '__tests__/fixtures/org-a',
      DRIFT_TEST_TARGET_PATH: '__tests__/fixtures/org-b',
      'INPUT_METADATA-TYPES': 'CustomObject,Profile,PermissionSet,ApexClass,CustomApplication,RemoteSiteSetting',
      'INPUT_STANDARD-OBJECTS': 'Account',
      'INPUT_OUTPUT-DIR': path.join(tmp, 'report'),
      'INPUT_UPLOAD-ARTIFACT': 'true',
      'INPUT_ARTIFACT-NAME': 'drift',
      'INPUT_JOB-SUMMARY': 'true',
      GITHUB_OUTPUT: outputFile,
      GITHUB_STEP_SUMMARY: summaryFile,
      // A runtime token the artifact client rejects before it makes any request.
      ACTIONS_RUNTIME_TOKEN: 'not-a-token',
      ACTIONS_RESULTS_URL: 'http://127.0.0.1:9/',
    });

    const { run } = await import('../src/index.js');
    await run();

    expect(process.exitCode).toBe(1);
    expect(outputs(outputFile, 'comparison-status')).toEqual(['drift']);
    expect(outputs(outputFile, 'artifact-id')).toEqual(['']);
    const summary = fs.readFileSync(summaryFile, 'utf8');
    expect(summary).toContain('Drift found');
    expect(summary).not.toContain('No report was produced');
    expect(fs.existsSync(path.join(tmp, 'report', 'metadata-drift-report.json'))).toBe(true);
  });
});
