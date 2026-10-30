import fs from 'node:fs';
import path from 'node:path';
import type { ComponentChange, DriftReport, FieldChange, OrgSideInfo } from '../types.js';
import { LINE_CHANGE_PATH } from '../handlers/apex.js';
import {
  CATEGORY_LABELS,
  describeFieldChanges,
  differencesByType,
  displayName,
  formatTimestamp,
  isLineChange,
  summarizeComponent,
  verdict,
  type ChangeGroup,
} from './describe.js';

export const REPORT_MD_FILENAME = 'metadata-drift-report.md';

const MAX_LIST_ROWS = 200;
const MAX_DETAIL_ROWS = 150;
const MAX_DIFF_LINES = 200;
const MAX_VALUE_LENGTH = 300;

const STATUS_ICONS = { 'no-drift': '🟢', drift: '🟠', incomplete: '🔴' } as const;
const CATEGORY_ICONS = { added: '➕', removed: '➖', changed: '✏️', unchanged: '✅' } as const;

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

function value(text: string | undefined): string {
  if (text === undefined) return '—';
  if (text === '') return '_empty_';
  return code(text.length > MAX_VALUE_LENGTH ? `${text.slice(0, MAX_VALUE_LENGTH)}… (full value in the JSON report)` : text);
}

function fence(lines: string[]): string {
  const longestRun = Math.max(2, ...lines.flatMap((line) => line.match(/`+/g) ?? []).map((run) => run.length));
  return '`'.repeat(longestRun + 1);
}

/** A table, cut off after `limit` rows with a pointer to the JSON report. */
function table(header: string[], rows: string[][], limit = MAX_LIST_ROWS): string[] {
  const more = rows.length > limit ? [`_${rows.length - limit} more rows are in the JSON report._`, ''] : [];
  return [
    `| ${header.join(' | ')} |`,
    `| ${header.map(() => ':---').join(' | ')} |`,
    ...rows.slice(0, limit).map((cells) => `| ${cells.join(' | ')} |`),
    '',
    ...more,
  ];
}

function sorted(report: DriftReport): ComponentChange[] {
  return differencesByType(report).flatMap(([, items]) => items);
}

function listSection(report: DriftReport, category: 'added' | 'removed'): string[] {
  const items = sorted(report).filter((item) => item.category === category);
  if (!items.length) return [];
  return [
    `## ${CATEGORY_ICONS[category]} ${CATEGORY_LABELS[category]} (${items.length})`,
    '',
    ...table(['Type', 'Component'], items.map((item) => [escapeMd(item.metadataType), code(displayName(item.fullName))])),
  ];
}

function settingRows(group: ChangeGroup): string[][] {
  if (group.kind === 'changed') {
    return group.rows.map((row) =>
      [escapeMd([group.title, row.label].filter(Boolean).join(' › ')), value(row.baseline), value(row.target)]);
  }
  const settings = group.rows.map((row) => `${escapeMd(row.label)} ${value(row.baseline ?? row.target)}`).join(', ');
  const cell = `${CATEGORY_ICONS[group.kind]} ${settings || (group.kind === 'added' ? 'added' : 'removed')}`;
  return [[escapeMd(group.title), group.kind === 'removed' ? cell : '—', group.kind === 'added' ? cell : '—']];
}

function changedSection(report: DriftReport): string[] {
  const items = sorted(report).filter((item) => item.category === 'changed');
  if (!items.length) return [];

  const detailRows = items.flatMap((item) => {
    const changes = (item.fieldChanges ?? []).filter((change) => !isLineChange(change));
    const rows = describeFieldChanges(item.metadataType, changes).flatMap(settingRows);
    // Name the component once, on its first row, so each block reads as a unit.
    return rows.map((cells, index) => [index ? '' : code(displayName(item.fullName)), ...cells]);
  });

  const codeChanges = items.filter((item) => (item.fieldChanges ?? []).some(isLineChange));

  return [
    `## ${CATEGORY_ICONS.changed} ${CATEGORY_LABELS.changed} (${items.length})`,
    '',
    ...table(['Type', 'Component', 'What changed'], items.map((item) =>
      [escapeMd(item.metadataType), code(displayName(item.fullName)), escapeMd(summarizeComponent(item))])),
    ...(detailRows.length
      ? ['### Setting changes', '', ...table(['Component', 'Setting', 'Baseline', 'Target'], detailRows, MAX_DETAIL_ROWS)]
      : []),
    ...(codeChanges.length ? ['### Code changes', '', ...codeChanges.flatMap(codeDiff)] : []),
  ];
}

function codeDiff(component: ComponentChange): string[] {
  const changes = (component.fieldChanges ?? []).filter(isLineChange);
  const lines = changes.slice(0, MAX_DIFF_LINES).map((change) => {
    const match = LINE_CHANGE_PATH.exec(change.path);
    return match?.[1] === 'baseline' ? `- ${change.baselineValue ?? ''}` : `+ ${change.targetValue ?? ''}`;
  });
  const marker = fence(lines);
  const more = changes.length > MAX_DIFF_LINES
    ? [`_${changes.length - MAX_DIFF_LINES} more changed lines are in the JSON report._`, '']
    : [];
  return [
    '<details>',
    `<summary><code>${escapeHtml(displayName(component.fullName))}</code> · ${escapeHtml(summarizeComponent(component))}</summary>`,
    '',
    `${marker}diff`,
    ...lines,
    marker,
    '',
    ...more,
    '</details>',
    '',
  ];
}

function orgSection(baseline: OrgSideInfo, target: OrgSideInfo): string[] {
  const row = (name: string, read: (side: OrgSideInfo) => string | undefined) =>
    [name, read(baseline) ?? '—', read(target) ?? '—'];
  return [
    '## Orgs',
    '',
    ...table(['Org', 'Baseline (source of truth)', 'Target'], [
      row('Name', (side) => `**${escapeMd(side.label)}**`),
      row('Org type', (side) => side.orgKind),
      row('Username', (side) => side.username && code(side.username)),
      row('Org ID', (side) => side.orgId && code(side.orgId)),
      row('Instance', (side) => side.instanceHost && code(side.instanceHost)),
    ]),
  ];
}

function scopeSection(report: DriftReport): string[] {
  const { scope } = report;
  if (!scope) return [];
  const rows = [
    ['API version', escapeMd(scope.apiVersion)],
    ['Source', scope.kind === 'manifest' ? 'package-xml-path' : 'metadata-types'],
    ...Object.entries(scope.members).map(([type, members]) => [code(type), members.map(code).join(', ')]),
    ...scope.notes.map((note) => ['Note', escapeMd(note)]),
    ...(report.retrievals ?? []).map((item) => [`Retrieved (${item.side})`, formatTimestamp(item.retrievedAt)]),
  ];
  return [
    '<details>',
    '<summary><b>What was compared</b></summary>',
    '',
    ...table(['Setting', 'Value'], rows, Number.POSITIVE_INFINITY),
    '</details>',
    '',
  ];
}

export function renderMarkdownReport(report: DriftReport): string {
  const { summary } = report;
  const result = verdict(report);
  const runLink = report.runUrl ? ` · [Workflow run](${report.runUrl})` : '';
  const bold = (count: number) => (count ? `**${count}**` : '0');

  const lines = [
    '<sub>SALESFORCE METADATA DRIFT REPORT</sub>',
    '',
    `# ${STATUS_ICONS[result.status]} ${result.title}`,
    '',
    escapeMd(result.detail),
    '',
    `Baseline **${escapeMd(report.baseline.label)}** → target **${escapeMd(report.target.label)}** · ` +
      `${formatTimestamp(report.generatedAt)}${runLink}`,
    '',
  ];

  if (report.warnings.length) {
    lines.push('> [!WARNING]', ...report.warnings.map((warning) => `> - ${escapeMd(warning)}`), '');
  }

  lines.push(
    ...orgSection(report.baseline, report.target),
    '## Summary',
    '',
    ...table(['Result', 'Components'], [
      [`${CATEGORY_ICONS.removed} ${CATEGORY_LABELS.removed}`, bold(summary.removed)],
      [`${CATEGORY_ICONS.added} ${CATEGORY_LABELS.added}`, bold(summary.added)],
      [`${CATEGORY_ICONS.changed} ${CATEGORY_LABELS.changed}`, bold(summary.changed)],
      [`${CATEGORY_ICONS.unchanged} ${CATEGORY_LABELS.unchanged}`, String(summary.unchanged)],
      ['**Total compared**', `**${summary.total}**`],
    ]),
    ...listSection(report, 'removed'),
    ...listSection(report, 'added'),
    ...changedSection(report),
    ...scopeSection(report),
    `<sub>${summary.unchanged} unchanged components are not listed. The JSON report in the workflow artifact has every component.</sub>`,
  );
  return `${lines.join('\n').trimEnd()}\n`;
}

/** Job Summary for a run that stopped before it could compare, such as a bad input or a failed login. */
export function renderErrorSummary(message: string, runUrl?: string): string {
  return [
    '<sub>SALESFORCE METADATA DRIFT REPORT</sub>',
    '',
    `# ${STATUS_ICONS.incomplete} Comparison could not run`,
    '',
    'No report was produced. Fix the problem below and run the workflow again.',
    '',
    '> [!CAUTION]',
    `> ${escapeMd(message)}`,
    '',
    ...(runUrl ? [`[Workflow run](${runUrl})`, ''] : []),
  ].join('\n');
}

export function writeMarkdownReport(report: DriftReport, outputDir: string): string {
  fs.mkdirSync(outputDir, { recursive: true });
  const filePath = path.join(outputDir, REPORT_MD_FILENAME);
  fs.writeFileSync(filePath, renderMarkdownReport(report), 'utf8');
  return filePath;
}
