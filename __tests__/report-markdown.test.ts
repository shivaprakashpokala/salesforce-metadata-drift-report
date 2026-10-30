import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
import { normalizeMetadataTree } from '../src/normalize.js';
import { diffMetadataTrees } from '../src/diff.js';
import { renderErrorSummary, renderMarkdownReport, writeMarkdownReport } from '../src/report/markdown.js';

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
  it('leads with the verdict and the counts', async () => {
    const md = renderMarkdownReport(await fixtureReport());
    expect(md).toContain('# 🟠 Drift found\n\n6 of 8 components differ between Production and QA sandbox.');
    expect(md).toContain('Baseline **Production** → target **QA sandbox**');
    expect(md).toContain('[Workflow run](https://github.com/example/repo/actions/runs/1)');
    expect(md).toContain('| ➕ Only in target | **2** |');
    expect(md).toContain('| ➖ Missing from target | **1** |');
    expect(md).toContain('| ✏️ Changed | **3** |');
    expect(md).toContain('| ✅ Unchanged | 2 |');
    expect(md).toContain('| **Total compared** | **8** |');
  });

  it('lists each kind of difference in its own table section', async () => {
    const md = renderMarkdownReport(await fixtureReport());
    const sections = ['## Orgs', '## Summary', '## ➖ Missing from target (1)', '## ➕ Only in target (2)', '## ✏️ Changed (3)'];
    const positions = sections.map((heading) => md.indexOf(heading));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    expect(md).toContain('| PermissionSet | `Sales_User` |');
    expect(md).toContain('| ApexClass | `AccountService` | 5 lines added, 0 removed |');
    expect(md).toContain('| Profile | `Admin` | Field permissions › Account.Industry\\_\\_c › Readable: true → false |');
  });

  it('puts setting changes in one table and Apex diffs in collapsible blocks', async () => {
    const md = renderMarkdownReport(await fixtureReport());
    expect(md).toContain('### Setting changes\n\n| Component | Setting | Baseline | Target |');
    expect(md).toContain('| `Admin` | Field permissions › Account.Industry\\_\\_c › Readable | `true` | `false` |');
    expect(md).toContain('<summary><code>AccountService</code> · 5 lines added, 0 removed</summary>');
    expect(md).toMatch(/```diff\n(?:[-+] .*\n)+```/);
    expect(md).toContain('+     public static List<Account> findByIndustry(String industry) {');
  });

  it('renders a no-drift verdict without a differences section', async () => {
    const tree = await normalizeMetadataTree(ORG_A);
    const md = renderMarkdownReport(diffMetadataTrees(tree, tree));
    expect(md).toContain('# 🟢 No drift');
    expect(md).not.toContain('## ✏️ Changed');
    expect(md).toContain('## Summary');
  });

  it('shows warnings above the differences', async () => {
    const report = await fixtureReport();
    report.warnings = ['Baseline and target are the same org (same Org ID).'];
    const md = renderMarkdownReport(report);
    expect(md).toContain('> [!WARNING]\n> - Baseline and target are the same org (same Org ID).');
    expect(md.indexOf('[!WARNING]')).toBeLessThan(md.indexOf('## Summary'));
  });

  it('left-aligns every table', async () => {
    const md = renderMarkdownReport(await fixtureReport());
    const separators = md.split('\n').filter((line) => /^\| *:?-+/.test(line));
    expect(separators.length).toBeGreaterThan(3);
    for (const line of separators) expect(line).toMatch(/^\|( :--- \|)+$/);
  });

  it('explains a run that stopped before comparing', () => {
    const md = renderErrorSummary('baseline-auth-url and target-auth-url are identical.', 'https://github.com/example/repo/actions/runs/1');
    expect(md).toContain('# 🔴 Comparison could not run');
    expect(md).toContain('> [!CAUTION]\n> baseline-auth-url and target-auth-url are identical.');
  });

  it('writes metadata-drift-report.md', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-report-md-'));
    const file = writeMarkdownReport(await fixtureReport(), dir);
    expect(fs.readFileSync(file, 'utf8')).toContain('SALESFORCE METADATA DRIFT REPORT');
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
