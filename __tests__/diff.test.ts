import { describe, it, expect, beforeAll } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeMetadataTree } from '../src/normalize.js';
import { diffMetadataTrees } from '../src/diff.js';
import { writeJsonReport } from '../src/report/json.js';
import { writeHtmlReport } from '../src/report/html.js';
import fs from 'node:fs';
import os from 'node:os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(__dirname, 'fixtures');
const ORG_A = path.join(FIXTURES, 'org-a');
const ORG_B = path.join(FIXTURES, 'org-b');

describe('normalizeMetadataTree', () => {
  it('indexes SFDX source-format metadata from org-a', async () => {
    const tree = await normalizeMetadataTree(ORG_A);
    expect(tree.components.size).toBeGreaterThanOrEqual(5);

    const account = tree.components.get('CustomObject:Account');
    expect(account).toBeDefined();
    expect(tree.components.has('CustomField:Account.Industry__c')).toBe(true);

    const apex = tree.components.get('ApexClass:AccountService');
    expect(apex).toBeDefined();
    expect(apex?.content).toContain('updateIndustry');
  });

  it('indexes additional components from org-b', async () => {
    const tree = await normalizeMetadataTree(ORG_B);
    expect(tree.components.has('CustomField:Account.Revenue__c')).toBe(true);

    const permSet = tree.components.get('PermissionSet:Sales_User');
    expect(permSet).toBeDefined();
  });
});

describe('diffMetadataTrees', () => {
  let report: ReturnType<typeof diffMetadataTrees>;

  beforeAll(async () => {
    const sourceTree = await normalizeMetadataTree(ORG_A);
    const targetTree = await normalizeMetadataTree(ORG_B);
    report = diffMetadataTrees(sourceTree, targetTree, {
      baseline: { label: 'org-a', orgKind: 'unknown' },
      target: { label: 'org-b', orgKind: 'unknown' },
    });
  });

  it('detects drift between fixture orgs', () => {
    expect(report.summary.hasDrift).toBe(true);
    expect(report.summary.added).toBe(2);
    expect(report.summary.removed).toBe(1);
    expect(report.summary.changed).toBe(3);
    expect(report.summary.unchanged).toBe(2);
  });

  it('flags PermissionSet Sales_User as added in target', () => {
    const added = report.components.find(
      (c) => c.metadataType === 'PermissionSet' && c.fullName === 'Sales_User',
    );
    expect(added?.category).toBe('added');
  });

  it('flags CustomApplication Sales_Console as removed from target', () => {
    const removed = report.components.find(
      (c) => c.metadataType === 'CustomApplication' && c.fullName === 'Sales_Console',
    );
    expect(removed?.category).toBe('removed');
  });

  it('flags ApexClass AccountService as changed with line-level hints', () => {
    const changed = report.components.find(
      (c) => c.metadataType === 'ApexClass' && c.fullName === 'AccountService',
    );
    expect(changed?.category).toBe('changed');
    expect(changed?.fieldChanges?.length).toBeGreaterThan(0);
  });

  it('flags Profile Admin field permission flip', () => {
    const profile = report.components.find(
      (c) => c.metadataType === 'Profile' && c.fullName === 'Admin',
    );
    expect(profile?.category).toBe('changed');
    const readableChange = profile?.fieldChanges?.find((f) =>
      f.path.includes('fieldPermissions[Account.Industry__c].readable'),
    );
    expect(readableChange?.baselineValue).toBe('true');
    expect(readableChange?.targetValue).toBe('false');
  });

  it('counts a one-sided field as added and leaves the object unchanged', () => {
    const account = report.components.find(
      (c) => c.metadataType === 'CustomObject' && c.fullName === 'Account',
    );
    expect(account?.category).toBe('unchanged');

    const field = report.components.find(
      (c) => c.metadataType === 'CustomField' && c.fullName === 'Account.Revenue__c',
    );
    expect(field?.category).toBe('added');
  });

  it('flags RemoteSiteSetting URL change', () => {
    const rss = report.components.find(
      (c) => c.metadataType === 'RemoteSiteSetting' && c.fullName === 'Example_API',
    );
    expect(rss?.category).toBe('changed');
  });

  it('writes JSON and HTML reports', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-diff-test-'));
    const jsonPath = writeJsonReport(report, tmpDir);
    const htmlPath = writeHtmlReport(report, tmpDir);

    expect(fs.existsSync(jsonPath)).toBe(true);
    expect(fs.existsSync(htmlPath)).toBe(true);

    const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    expect(json.summary.hasDrift).toBe(true);
    expect(json.baseline.orgKind).toBe('unknown');
    expect(jsonPath.endsWith('metadata-drift-report.json')).toBe(true);
    expect(
      json.components.some(
        (c: { fullName: string; category: string }) =>
          c.fullName === 'Account' && c.category === 'unchanged',
      ),
    ).toBe(true);

    const html = fs.readFileSync(htmlPath, 'utf8');
    expect(htmlPath.endsWith('metadata-drift-report.html')).toBe(true);
    expect(html).toContain('Salesforce Metadata Drift Report');
    expect(html).toContain('Baseline (source of truth)');
    expect(html).toContain('AccountService');
    expect(html).not.toContain('id="unchanged"');

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});

describe('diffFlattenedMaps', () => {
  it('is exercised via profile handler', async () => {
    const sourceTree = await normalizeMetadataTree(ORG_A);
    const targetTree = await normalizeMetadataTree(ORG_B);
    const report = diffMetadataTrees(sourceTree, targetTree);
    expect(report.components.length).toBeGreaterThan(0);
  });
});
