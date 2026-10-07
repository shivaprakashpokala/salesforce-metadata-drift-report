import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  isArtifactServiceAvailable,
  publishReportArtifact,
  type ArtifactUploader,
} from '../src/artifact.js';
import { writeJobSummary } from '../src/report/summary.js';

const ACTIONS_ENV = {
  ACTIONS_RUNTIME_TOKEN: 'fake-runtime-token',
  ACTIONS_RESULTS_URL: 'https://results.example.invalid/',
};

interface RecordedUpload {
  name: string;
  files: string[];
  rootDirectory: string;
  retentionDays?: number;
}

function recordingUploader(): { uploader: ArtifactUploader; uploads: RecordedUpload[] } {
  const uploads: RecordedUpload[] = [];
  return {
    uploads,
    uploader: {
      async upload(name, files, rootDirectory, options = {}) {
        uploads.push({ name, files, rootDirectory, retentionDays: options.retentionDays });
        return { id: 4242, size: 1234 };
      },
    },
  };
}

describe('isArtifactServiceAvailable', () => {
  it('requires both runtime token and results URL', () => {
    expect(isArtifactServiceAvailable({})).toBe(false);
    expect(isArtifactServiceAvailable({ ACTIONS_RUNTIME_TOKEN: 'x' })).toBe(false);
    expect(isArtifactServiceAvailable(ACTIONS_ENV)).toBe(true);
  });
});

describe('publishReportArtifact', () => {
  it('skips with a reason when not running on GitHub Actions', async () => {
    const { uploader, uploads } = recordingUploader();
    const result = await publishReportArtifact(
      { name: 'r', files: ['/tmp/a.md'], rootDirectory: '/tmp' },
      { uploader, env: {} },
    );

    expect(result.uploaded).toBe(false);
    if (!result.uploaded) {
      expect(result.reason).toMatch(/not running on GitHub Actions/);
    }
    expect(uploads).toHaveLength(0);
  });

  it('uploads the report files with the given name and retention', async () => {
    const { uploader, uploads } = recordingUploader();
    const result = await publishReportArtifact(
      {
        name: 'drift-report-qa',
        files: ['/out/metadata-drift-report.md', '/out/metadata-drift-report.json'],
        rootDirectory: '/out',
        retentionDays: 14,
      },
      { uploader, env: ACTIONS_ENV },
    );

    expect(result).toEqual({ uploaded: true, id: 4242, size: 1234 });
    expect(uploads).toEqual([
      {
        name: 'drift-report-qa',
        files: ['/out/metadata-drift-report.md', '/out/metadata-drift-report.json'],
        rootDirectory: '/out',
        retentionDays: 14,
      },
    ]);
  });

  it('propagates uploader failures so the step can fail', async () => {
    const uploader: ArtifactUploader = {
      async upload() {
        throw new Error('artifact service unavailable');
      },
    };

    await expect(
      publishReportArtifact(
        { name: 'r', files: ['/tmp/a.md'], rootDirectory: '/tmp' },
        { uploader, env: ACTIONS_ENV },
      ),
    ).rejects.toThrow(/artifact service unavailable/);
  });
});

describe('writeJobSummary', () => {
  // @actions/core memoizes the GITHUB_STEP_SUMMARY path on first use, so every
  // test in this block shares one summary file and clears it before writing.
  let tmpDir: string;
  let summaryFile: string;
  let previousEnv: string | undefined;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-summary-'));
    summaryFile = path.join(tmpDir, 'summary.md');
    previousEnv = process.env.GITHUB_STEP_SUMMARY;
    process.env.GITHUB_STEP_SUMMARY = summaryFile;
  });

  afterAll(() => {
    if (previousEnv === undefined) delete process.env.GITHUB_STEP_SUMMARY;
    else process.env.GITHUB_STEP_SUMMARY = previousEnv;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('no-ops when GITHUB_STEP_SUMMARY is not set', async () => {
    const result = await writeJobSummary('# hi', {});
    expect(result).toEqual({ written: false, truncated: false });
  });

  it('appends the markdown to the summary file', async () => {
    fs.writeFileSync(summaryFile, '', 'utf8');
    const result = await writeJobSummary('# Salesforce Metadata Drift Report\n\nbody\n', process.env);
    expect(result).toEqual({ written: true, truncated: false });
    expect(fs.readFileSync(summaryFile, 'utf8')).toContain('# Salesforce Metadata Drift Report');
  });

  it('truncates oversized reports and points at the artifact', async () => {
    fs.writeFileSync(summaryFile, '', 'utf8');
    const huge = 'x'.repeat(1_000_000);
    const result = await writeJobSummary(huge, process.env);
    expect(result).toEqual({ written: true, truncated: true });
    const written = fs.readFileSync(summaryFile, 'utf8');
    expect(written.length).toBeLessThan(huge.length);
    expect(written).toContain('Summary truncated');
  });
});
