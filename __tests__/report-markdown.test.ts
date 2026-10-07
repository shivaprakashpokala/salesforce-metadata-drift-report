import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
import { normalizeMetadataTree } from '../src/normalize.js';
import { diffMetadataTrees } from '../src/diff.js';
import { renderMarkdownReport, writeMarkdownReport } from '../src/report/markdown.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ORG_A = path.join(__dirname, 'fixtures', 'org-a');
const ORG_B = path.join(__dirname, 'fixtures', 'org-b');

async function fixtureReport() {
  const report = diffMetadataTrees(await normalizeMetadataTree(ORG_A), await normalizeMetadataTree(ORG_B), {
    baseline: { label: 'Production', orgKind: 'production', orgId: '00D000000000001AAA' },
    target: { label: 'QA sandbox', orgKind: 'sandbox', orgId: '00D000000000002AAA' },
  });
  report.runUrl = 'https://github.com/example/repo/actions/runs/1';
  return report;
}

describe('renderMarkdownReport', () => {
  it('leads with the verdict and a per-type breakdown', async () => {
    const md = renderMarkdownReport(await fixtureReport());
    expect(md).toContain('**Drift detected:** 2 added in target, 1 missing from target, 3 changed, 2 unchanged.');
    expect(md).toContain('Baseline: **Production**. Target: **QA sandbox**.');
    expect(md).toContain('[this workflow run](https://github.com/example/repo/actions/runs/1)');
    expect(md).toContain('| Metadata type | Added in target | Missing from target | Changed | Unchanged |');
    expect(md).toContain('| ApexClass | 0 | 0 | 1 | 0 |');
    expect(md.indexOf('## Summary')).toBeLessThan(md.indexOf('## Orgs'));
  });

  it('lists added and missing components as tables', async () => {
    const md = renderMarkdownReport(await fixtureReport());
    expect(md).toContain('## Added in target (not in baseline) (2)');
    expect(md).toContain('| PermissionSet | `Sales_User` |');
    expect(md).toContain('## Missing from target (only in baseline) (1)');
    expect(md).toContain('| CustomApplication | `Sales_Console` |');
  });

  it('puts each changed component in a collapsible block with an Apex diff', async () => {
    const md = renderMarkdownReport(await fixtureReport());
    expect(md).toContain('<summary><strong>ApexClass</strong> AccountService: ');
    expect(md).toMatch(/```diff\n(?:[-+] .*\n)+```/);
    expect(md).toContain('+     public static List<Account> findByIndustry(String industry) {');
    expect(md).toContain('| `Profile.fieldPermissions[Account.Industry__c].readable` | true | false |');
  });

  it('renders a no-drift verdict without change sections', async () => {
    const tree = await normalizeMetadataTree(ORG_A);
    const md = renderMarkdownReport(diffMetadataTrees(tree, tree));
    expect(md).toContain('**No drift detected.**');
    expect(md).not.toContain('## Added in target');
    expect(md).not.toContain('## Changed');
  });

  it('shows warnings near the top', async () => {
    const report = await fixtureReport();
    report.warnings = ['Baseline and target are the same org (same Org ID).'];
    const md = renderMarkdownReport(report);
    expect(md.indexOf('## Warnings')).toBeLessThan(md.indexOf('## Summary'));
  });

  it('writes metadata-drift-report.md', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-report-md-'));
    const file = writeMarkdownReport(await fixtureReport(), dir);
    expect(fs.readFileSync(file, 'utf8')).toContain('# Salesforce Metadata Drift Report');
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
