import fs from 'node:fs';
import path from 'node:path';
import type { ComponentChange, DriftReport, FieldChange, OrgSideInfo } from '../types.js';
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
import { LINE_CHANGE_PATH } from '../handlers/apex.js';

export const REPORT_HTML_FILENAME = 'metadata-drift-report.html';

const MAX_ROWS = 50;
const MAX_DIFF_LINES = 300;
const MAX_VALUE_LENGTH = 2000;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function value(text: string | undefined): string {
  if (text === undefined) return '<span class="none">—</span>';
  if (text === '') return '<span class="none">empty</span>';
  const shortened = text.length > MAX_VALUE_LENGTH ? `${text.slice(0, MAX_VALUE_LENGTH)}… (full value in the JSON report)` : text;
  return `<code>${escapeHtml(shortened)}</code>`;
}

function renderGroup(group: ChangeGroup): string {
  const title = group.title ? `<div class="group-title">${escapeHtml(group.title)}${
    group.kind !== 'changed' ? ` <span class="tag ${group.kind === 'added' ? 'added' : 'removed'}">${group.kind === 'added' ? 'only in target' : 'missing from target'}</span>` : ''
  }</div>` : '';
  if (group.kind !== 'changed') {
    const settings = group.rows
      .map((row) => `<span class="setting">${escapeHtml(row.label)} ${value(row.target ?? row.baseline)}</span>`)
      .join('');
    return `<div class="group">${title}${settings ? `<div class="settings">${settings}</div>` : ''}</div>`;
  }
  const rows = group.rows.map((row) => `
        <tr><th scope="row">${escapeHtml(row.label)}</th><td class="before">${value(row.baseline)}</td><td class="after">${value(row.target)}</td></tr>`).join('');
  return `<div class="group">${title}<table class="values"><thead><tr><th></th><th>Baseline</th><th>Target</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function renderLineDiff(changes: FieldChange[]): string {
  const lines = changes.slice(0, MAX_DIFF_LINES).map((change) => {
    const match = LINE_CHANGE_PATH.exec(change.path);
    const removed = match?.[1] === 'baseline';
    const text = removed ? change.baselineValue : change.targetValue;
    return `<span class="${removed ? 'del' : 'ins'}"><span class="ln">${match?.[2] ?? ''}</span>${removed ? '−' : '+'} ${escapeHtml(text ?? '')}</span>`;
  });
  const more = changes.length > MAX_DIFF_LINES ? `<p class="note">${changes.length - MAX_DIFF_LINES} more changed lines are in the JSON report.</p>` : '';
  return `<pre class="diff">${lines.join('')}</pre>${more}`;
}

function renderComponent(component: ComponentChange): string {
  const name = `<span class="name">${escapeHtml(displayName(component.fullName))}</span>`;
  if (component.category !== 'changed') {
    return `<li class="item">${name}<span class="tag ${component.category}">${CATEGORY_LABELS[component.category]}</span></li>`;
  }
  const changes = component.fieldChanges ?? [];
  const lineChanges = changes.filter(isLineChange);
  const groups = describeFieldChanges(component.metadataType, changes.filter((change) => !isLineChange(change)));
  const shown = groups.slice(0, MAX_ROWS);
  const more = groups.length > MAX_ROWS ? `<p class="note">${groups.length - MAX_ROWS} more differences are in the JSON report.</p>` : '';
  return `
      <li class="item">
        <details>
          <summary>${name}<span class="hint">${escapeHtml(summarizeComponent(component))}</span></summary>
          <div class="body">
            ${lineChanges.length ? renderLineDiff(lineChanges) : ''}
            ${shown.map(renderGroup).join('')}
            ${more}
          </div>
        </details>
      </li>`;
}

function renderType([type, items]: [string, ComponentChange[]]): string {
  const counts = (['removed', 'added', 'changed'] as const)
    .map((category) => [category, items.filter((item) => item.category === category).length] as const)
    .filter(([, count]) => count)
    .map(([category, count]) => `${count} ${CATEGORY_LABELS[category].toLowerCase()}`)
    .join(' · ');
  return `
    <section class="type">
      <h3>${escapeHtml(type)} <span class="type-count">${counts}</span></h3>
      <ul class="items">${items.map(renderComponent).join('')}</ul>
    </section>`;
}

function orgCell(org: OrgSideInfo): string {
  const details = [
    org.username && `<div>${escapeHtml(org.username)}</div>`,
    org.orgId && `<div class="sub">Org ID ${escapeHtml(org.orgId)}</div>`,
    org.instanceHost && `<div class="sub">${escapeHtml(org.instanceHost)}</div>`,
  ].filter(Boolean).join('');
  return `<td><div class="org-name">${escapeHtml(org.label)} <span class="kind kind-${escapeHtml(org.orgKind)}">${escapeHtml(org.orgKind)}</span></div>${details}</td>`;
}

export function renderHtmlReport(report: DriftReport): string {
  const { summary, scope } = report;
  const result = verdict(report);
  const types = differencesByType(report);
  const stat = (label: string, count: number, kind: string) =>
    `<div class="stat ${count ? kind : 'zero'}"><div class="stat-value">${count}</div><div class="stat-label">${label}</div></div>`;
  const runLink = report.runUrl ? ` · <a href="${escapeHtml(report.runUrl)}">Workflow run</a>` : '';
  const scopeList = scope ? [
    `<li>API version ${escapeHtml(scope.apiVersion)}, ${scope.kind === 'manifest' ? 'from package-xml-path' : 'from metadata-types'}</li>`,
    ...Object.entries(scope.members).map(([type, members]) => `<li><strong>${escapeHtml(type)}</strong>: ${escapeHtml(members.join(', '))}</li>`),
    ...scope.notes.map((note) => `<li>${escapeHtml(note)}</li>`),
    ...(report.retrievals ?? []).map((item) => `<li>${escapeHtml(item.side)} retrieved ${escapeHtml(formatTimestamp(item.retrievedAt))}</li>`),
  ].join('') : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Salesforce Metadata Drift Report</title>
  <style>
    :root {
      color-scheme: light dark;
      --bg: #ffffff; --surface: #f6f8fa; --border: #d8dee4; --text: #1f2328; --muted: #656d76;
      --green: #1a7f37; --green-bg: #dafbe1; --red: #cf222e; --red-bg: #ffebe9;
      --amber: #9a6700; --amber-bg: #fff8c5; --blue: #0969da;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #0d1117; --surface: #161b22; --border: #30363d; --text: #e6edf3; --muted: #8d96a0;
        --green: #3fb950; --green-bg: #12261e; --red: #f85149; --red-bg: #2d1416;
        --amber: #d29922; --amber-bg: #2b2111; --blue: #4493f8;
      }
    }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--bg); color: var(--text); font: 15px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif; }
    main { max-width: 980px; margin: 0 auto; padding: 32px 16px 64px; }
    a { color: var(--blue); }
    code, pre { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 13px; }
    .eyebrow { color: var(--muted); font-size: 13px; text-transform: uppercase; letter-spacing: .04em; margin: 0 0 6px; }
    .verdict { border-left: 4px solid var(--status); padding: 4px 0 4px 16px; margin-bottom: 24px; }
    .verdict.drift { --status: var(--amber); } .verdict.no-drift { --status: var(--green); } .verdict.incomplete { --status: var(--red); }
    .verdict h1 { margin: 0; font-size: 28px; line-height: 1.25; }
    .verdict p { margin: 4px 0 0; }
    .route { color: var(--muted); font-size: 14px; margin-top: 6px !important; }
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
    .stat { border: 1px solid var(--border); border-radius: 8px; padding: 12px 16px; }
    .stat-value { font-size: 26px; font-weight: 600; line-height: 1.2; font-variant-numeric: tabular-nums; }
    .stat-label { color: var(--muted); font-size: 13px; }
    .stat.added .stat-value { color: var(--green); } .stat.removed .stat-value { color: var(--red); }
    .stat.changed .stat-value { color: var(--amber); } .stat.zero .stat-value { color: var(--muted); }
    .warnings { background: var(--amber-bg); border: 1px solid var(--amber); border-radius: 8px; padding: 12px 16px; margin-bottom: 24px; }
    .warnings ul { margin: 6px 0 0; padding-left: 20px; }
    h2 { font-size: 18px; margin: 32px 0 12px; }
    .type { border: 1px solid var(--border); border-radius: 8px; margin-bottom: 12px; overflow: hidden; }
    .type h3 { margin: 0; padding: 10px 16px; font-size: 15px; background: var(--surface); border-bottom: 1px solid var(--border); }
    .type-count { color: var(--muted); font-weight: 400; font-size: 13px; margin-left: 6px; }
    .items { list-style: none; margin: 0; padding: 0; }
    .item { border-top: 1px solid var(--border); }
    .item:first-child { border-top: 0; }
    .item > .name, .item > .tag { display: inline-block; }
    li.item:not(:has(details)) { padding: 9px 16px; }
    summary { cursor: pointer; padding: 9px 16px; list-style-position: inside; }
    summary:hover { background: var(--surface); }
    .name { font-weight: 600; word-break: break-word; }
    .tag { font-size: 12px; font-weight: 500; border-radius: 999px; padding: 1px 8px; margin-left: 8px; white-space: nowrap; }
    .tag.added { color: var(--green); background: var(--green-bg); }
    .tag.removed { color: var(--red); background: var(--red-bg); }
    .tag.changed { color: var(--amber); background: var(--amber-bg); }
    .hint { display: block; color: var(--muted); font-size: 13px; margin: 2px 0 0 18px; }
    .body { padding: 4px 16px 16px; }
    .group { margin-top: 12px; }
    .group-title { font-weight: 600; font-size: 14px; margin-bottom: 6px; }
    .settings { display: flex; flex-wrap: wrap; gap: 6px 16px; color: var(--muted); font-size: 13px; }
    .settings code { color: var(--text); }
    table.values { border-collapse: collapse; width: 100%; font-size: 13px; }
    table.values th, table.values td { text-align: left; vertical-align: top; padding: 5px 10px; border-bottom: 1px solid var(--border); }
    table.values thead th { color: var(--muted); font-weight: 500; }
    table.values tbody th { font-weight: 500; width: 30%; }
    td.before code { color: var(--red); } td.after code { color: var(--green); }
    td code { white-space: pre-wrap; word-break: break-word; }
    .none { color: var(--muted); }
    pre.diff { margin: 12px 0 0; padding: 8px 0; background: var(--surface); border: 1px solid var(--border); border-radius: 6px; overflow-x: auto; line-height: 1.45; }
    pre.diff > span { display: block; padding: 0 12px; white-space: pre; }
    pre.diff .del { background: var(--red-bg); } pre.diff .ins { background: var(--green-bg); }
    pre.diff .ln { display: inline-block; min-width: 3.5em; color: var(--muted); user-select: none; }
    .note { color: var(--muted); font-size: 13px; }
    .empty { color: var(--muted); border: 1px dashed var(--border); border-radius: 8px; padding: 16px; }
    table.orgs { border-collapse: collapse; width: 100%; font-size: 14px; }
    table.orgs th, table.orgs td { text-align: left; vertical-align: top; padding: 8px 12px; border: 1px solid var(--border); width: 50%; }
    table.orgs th { background: var(--surface); font-weight: 500; color: var(--muted); }
    .org-name { font-weight: 600; } .sub { color: var(--muted); font-size: 13px; }
    .kind { font-size: 11px; font-weight: 500; text-transform: uppercase; letter-spacing: .03em; color: var(--muted); border: 1px solid var(--border); border-radius: 999px; padding: 0 6px; margin-left: 4px; }
    details.scope { margin-top: 16px; color: var(--muted); font-size: 14px; }
    details.scope summary { padding: 4px 0; }
    details.scope ul { margin: 6px 0 0; padding-left: 20px; }
    @media (max-width: 640px) { .stats { grid-template-columns: repeat(2, 1fr); } .verdict h1 { font-size: 24px; } }
  </style>
</head>
<body>
<main>
  <p class="eyebrow">Salesforce metadata drift report</p>
  <div class="verdict ${result.status}">
    <h1>${escapeHtml(result.title)}</h1>
    <p>${escapeHtml(result.detail)}</p>
    <p class="route">Baseline <strong>${escapeHtml(report.baseline.label)}</strong> → target <strong>${escapeHtml(report.target.label)}</strong> · ${escapeHtml(formatTimestamp(report.generatedAt))}${runLink}</p>
  </div>

  ${report.warnings.length ? `<div class="warnings" role="note"><strong>Warnings</strong><ul>${report.warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join('')}</ul></div>` : ''}

  <h2>Orgs</h2>
  <table class="orgs">
    <thead><tr><th>Baseline (source of truth)</th><th>Target</th></tr></thead>
    <tbody><tr>${orgCell(report.baseline)}${orgCell(report.target)}</tr></tbody>
  </table>

  <h2>Summary</h2>
  <div class="stats">
    ${stat('Only in target', summary.added, 'added')}
    ${stat('Missing from target', summary.removed, 'removed')}
    ${stat('Changed', summary.changed, 'changed')}
    ${stat('Unchanged', summary.unchanged, 'unchanged')}
  </div>

  <h2>Differences</h2>
  ${types.length ? types.map(renderType).join('') : '<p class="empty">Nothing differs. The full list of compared components is in the JSON report.</p>'}

  ${scope ? `<details class="scope"><summary>What was compared</summary><ul>${scopeList}</ul></details>` : ''}
  <p class="note">${summary.unchanged} unchanged components are not listed. The JSON report has every component.</p>
</main>
</body>
</html>`;
}

export function writeHtmlReport(report: DriftReport, outputDir: string): string {
  fs.mkdirSync(outputDir, { recursive: true });
  const filePath = path.join(outputDir, REPORT_HTML_FILENAME);
  fs.writeFileSync(filePath, renderHtmlReport(report), 'utf8');
  return filePath;
}
