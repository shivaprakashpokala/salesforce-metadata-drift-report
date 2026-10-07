import fs from 'node:fs';
import path from 'node:path';
import type { ComponentChange, DriftReport, FieldChange, OrgSideInfo } from '../types.js';
import { LINE_CHANGE_PATH } from '../handlers/apex.js';

export const REPORT_MD_FILENAME = 'metadata-drift-report.md';

const MAX_TABLE_ROWS = 20;
const MAX_DIFF_LINES = 200;
const MAX_VALUE_LENGTH = 2000;

function escapeMd(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/[\\`*_[\]]/g, '\\$&')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, ' ');
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function code(text: string): string {
  const longestRun = Math.max(0, ...(text.match(/`+/g) ?? []).map((run) => run.length));
  const delimiter = '`'.repeat(longestRun + 1);
  const padding = /^[` ]|[` ]$/.test(text) ? ' ' : '';
  return `${delimiter}${padding}${text.replace(/\r?\n/g, ' ').replace(/\|/g, '\\|')}${padding}${delimiter}`;
}

function preview(value: string | undefined): string {
  if (value === undefined) return '(none)';
  const shortened = value.length > MAX_VALUE_LENGTH ? `${value.slice(0, MAX_VALUE_LENGTH)}... (full value in the JSON report)` : value;
  return escapeMd(shortened);
}

function verdict(report: DriftReport): string {
  const { summary } = report;
  if (report.outcome === 'incomplete') {
    return '**Comparison incomplete.** Some metadata could not be retrieved or identified (see Warnings), ' +
      'so a clean result cannot be confirmed. Differences that were found are listed below.';
  }
  if (summary.hasDrift) {
    return `**Drift detected:** ${summary.added} added in target, ${summary.removed} missing from target, ` +
      `${summary.changed} changed, ${summary.unchanged} unchanged.`;
  }
  return `**No drift detected.** All ${summary.unchanged} compared components match the baseline.`;
}

function orgTable(baseline: OrgSideInfo, target: OrgSideInfo): string[] {
  const row = (name: string, value: (side: OrgSideInfo) => string | undefined) =>
    `| ${name} | ${value(baseline) ?? ''} | ${value(target) ?? ''} |`;
  return [
    '| | Baseline (source of truth) | Target |',
    '| --- | --- | --- |',
    row('Label', (side) => escapeMd(side.label)),
    row('Org type', (side) => side.orgKind),
    row('Username', (side) => side.username && code(side.username)),
    row('Org ID', (side) => side.orgId && code(side.orgId)),
    row('Instance', (side) => side.instanceHost && code(side.instanceHost)),
  ];
}

function typeBreakdown(components: ComponentChange[]): string[] {
  const counts = new Map<string, Record<ComponentChange['category'], number>>();
  for (const component of components) {
    const entry = counts.get(component.metadataType) ?? { added: 0, removed: 0, changed: 0, unchanged: 0 };
    entry[component.category]++;
    counts.set(component.metadataType, entry);
  }
  const rows = [...counts]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([type, c]) => `| ${escapeMd(type)} | ${c.added} | ${c.removed} | ${c.changed} | ${c.unchanged} |`);
  return [
    '| Metadata type | Added in target | Missing from target | Changed | Unchanged |',
    '| --- | ---: | ---: | ---: | ---: |',
    ...rows,
  ];
}

function componentList(title: string, items: ComponentChange[]): string[] {
  if (!items.length) return [];
  return [
    `## ${title} (${items.length})`,
    '',
    '| Metadata type | Name |',
    '| --- | --- |',
    ...items.map((item) => `| ${escapeMd(item.metadataType)} | ${code(item.fullName)} |`),
    '',
  ];
}

function fence(lines: string[]): string {
  const longestRun = Math.max(2, ...lines.flatMap((line) => line.match(/`+/g) ?? []).map((run) => run.length));
  return '`'.repeat(longestRun + 1);
}

function lineDiff(changes: FieldChange[]): string[] {
  const lines = changes.slice(0, MAX_DIFF_LINES).map((change) => {
    const match = LINE_CHANGE_PATH.exec(change.path);
    return match?.[1] === 'baseline' ? `- ${change.baselineValue ?? ''}` : `+ ${change.targetValue ?? ''}`;
  });
  const marker = fence(lines);
  const more = changes.length > MAX_DIFF_LINES
    ? [`_${changes.length - MAX_DIFF_LINES} more changed line(s) are in the JSON report._`, '']
    : [];
  return [`${marker}diff`, ...lines, marker, '', ...more];
}

function fieldTable(changes: FieldChange[]): string[] {
  const rows = changes.slice(0, MAX_TABLE_ROWS)
    .map((change) => `| ${code(change.path)} | ${preview(change.baselineValue)} | ${preview(change.targetValue)} |`);
  const more = changes.length > MAX_TABLE_ROWS
    ? [`_${changes.length - MAX_TABLE_ROWS} more difference(s) are in the JSON report._`, '']
    : [];
  return ['| Path | Baseline | Target |', '| --- | --- | --- |', ...rows, '', ...more];
}

function changedComponent(component: ComponentChange): string[] {
  const changes = component.fieldChanges ?? [];
  const lineChanges = changes.filter((change) => LINE_CHANGE_PATH.test(change.path));
  const otherChanges = changes.filter((change) => !LINE_CHANGE_PATH.test(change.path));
  const summary = component.summary ? `: ${escapeHtml(component.summary)}` : '';
  return [
    '<details>',
    `<summary><strong>${escapeHtml(component.metadataType)}</strong> ${escapeHtml(component.fullName)}${summary}</summary>`,
    '',
    ...(lineChanges.length ? lineDiff(lineChanges) : []),
    ...(otherChanges.length ? fieldTable(otherChanges) : []),
    '</details>',
    '',
  ];
}

function runLink(report: DriftReport): string {
  return report.runUrl ? ` from [this workflow run](${report.runUrl})` : '';
}

export function renderMarkdownReport(report: DriftReport): string {
  const byCategory = (category: ComponentChange['category']) =>
    report.components.filter((component) => component.category === category);
  const changed = byCategory('changed');
  const { summary, scope } = report;

  const lines = [
    '# Salesforce Metadata Drift Report',
    '',
    verdict(report),
    '',
    `Baseline: **${escapeMd(report.baseline.label)}**. Target: **${escapeMd(report.target.label)}**. ` +
      `Generated ${report.generatedAt}${runLink(report)}.`,
    '',
  ];

  if (report.warnings.length) {
    lines.push('## Warnings', '', ...report.warnings.map((warning) => `- ${escapeMd(warning)}`), '');
  }

  lines.push(
    '## Summary',
    '',
    '| Added in target | Missing from target | Changed | Unchanged | Total |',
    '| ---: | ---: | ---: | ---: | ---: |',
    `| ${summary.added} | ${summary.removed} | ${summary.changed} | ${summary.unchanged} | ${summary.total} |`,
    '',
  );
  if (report.components.length) lines.push(...typeBreakdown(report.components), '');

  lines.push(
    ...componentList('Added in target (not in baseline)', byCategory('added')),
    ...componentList('Missing from target (only in baseline)', byCategory('removed')),
  );
  if (changed.length) {
    lines.push(`## Changed (${changed.length})`, '', ...changed.flatMap(changedComponent));
  }

  lines.push('## Orgs', '', ...orgTable(report.baseline, report.target), '');

  if (scope) {
    lines.push(
      '## Comparison scope',
      '',
      `API version ${escapeMd(scope.apiVersion)}, ${scope.kind === 'manifest' ? 'from package-xml-path' : 'from metadata-types'}.`,
      '',
      ...Object.entries(scope.members).map(([type, members]) => `- ${code(type)}: ${members.map(code).join(', ')}`),
      ...scope.notes.map((note) => `- ${escapeMd(note)}`),
      ...(report.retrievals ?? []).map((item) => `- ${item.side} retrieved at ${item.retrievedAt}`),
      '',
    );
  }

  lines.push('Unchanged components are counted above and listed in the JSON report.');
  return `${lines.join('\n').trimEnd()}\n`;
}

export function writeMarkdownReport(report: DriftReport, outputDir: string): string {
  fs.mkdirSync(outputDir, { recursive: true });
  const filePath = path.join(outputDir, REPORT_MD_FILENAME);
  fs.writeFileSync(filePath, renderMarkdownReport(report), 'utf8');
  return filePath;
}
