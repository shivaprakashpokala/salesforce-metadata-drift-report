import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
import { normalizeMetadataTree } from '../src/normalize.js';
import { diffMetadataTrees } from '../src/diff.js';
import { writeJsonReport } from '../src/report/json.js';
import { renderHtmlReport } from '../src/report/html.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ORG_A = path.join(__dirname, 'fixtures', 'org-a');
const ORG_B = path.join(__dirname, 'fixtures', 'org-b');

describe('drift report org kind surfacing', () => {
  it('includes org kinds in JSON and HTML', async () => {
    const baselineTree = await normalizeMetadataTree(ORG_A);
    const targetTree = await normalizeMetadataTree(ORG_B);

    const report = diffMetadataTrees(baselineTree, targetTree, {
      baseline: { label: 'Fixture Org A', orgKind: 'production' },
      target: { label: 'Fixture Org B', orgKind: 'sandbox' },
      warnings: [],
    });

    expect(report.baseline.orgKind).toBe('production');
    expect(report.target.orgKind).toBe('sandbox');
    expect(report.baseline.label).toBe('Fixture Org A');

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-report-kind-'));
    const jsonPath = writeJsonReport(report, tmpDir);
    const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

    expect(json.baseline.orgKind).toBe('production');
    expect(json.target.orgKind).toBe('sandbox');
    expect(json.warnings).toEqual([]);
    expect(json.summary.hasDrift).toBe(true);

    const changed = json.components.find(
      (c: { metadataType: string; category: string }) =>
        c.metadataType === 'ApexClass' && c.category === 'changed',
    );
    expect(changed.baselinePath).toBeDefined();
    expect(changed.fieldChanges.length).toBeGreaterThan(0);

    const html = renderHtmlReport(report);
    expect(html).toContain('kind-badge');
    expect(html).toContain('Fixture Org A');
    expect(html).toContain('kind-sandbox');

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('renders warnings in HTML', async () => {
    const baselineTree = await normalizeMetadataTree(ORG_A);
    const targetTree = await normalizeMetadataTree(ORG_B);

    const warnings = [
      'Baseline and target are the same org (same Org ID).',
    ];

    const report = diffMetadataTrees(baselineTree, targetTree, {
      baseline: { label: 'Dev Hub Org', orgKind: 'developer' },
      target: { label: 'Scratch', orgKind: 'scratch' },
      warnings,
    });

    const html = renderHtmlReport(report);
    expect(html).toContain('<strong>Warnings</strong>');
    expect(html).toContain('same org');
    expect(html).toContain('kind-developer');
    expect(html).toContain('kind-scratch');

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-report-warn-'));
    const jsonPath = writeJsonReport(report, tmpDir);
    const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    expect(json.warnings).toHaveLength(1);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
