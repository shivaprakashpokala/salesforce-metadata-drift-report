import fs from 'node:fs';
import path from 'node:path';
import type { ComponentChange, DriftReport, FieldChange, OrgKind } from '../types.js';

export const REPORT_HTML_FILENAME = 'metadata-drift-report.html';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderFieldChanges(changes: FieldChange[]): string {
  if (!changes.length) return '';
  const rows = changes
    .slice(0, 50)
    .map(
      (c) => `
        <tr>
          <td><code>${escapeHtml(c.path)}</code></td>
          <td class="baseline">${escapeHtml(preview(c.baselineValue ?? '—'))}</td>
          <td class="target">${escapeHtml(preview(c.targetValue ?? '—'))}</td>
        </tr>`,
    )
    .join('');

  const more =
    changes.length > 50
      ? `<p class="muted">${changes.length - 50} more differences are in the JSON report.</p>`
      : '';

  return `
    <details>
      <summary>${changes.length} field-level change(s)</summary>
      <table class="field-changes">
        <thead><tr><th>Path</th><th>Baseline</th><th>Target</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      ${more}
    </details>`;
}

function preview(value: string): string {
  return value.length > 2000 ? `${value.slice(0, 2000)}... (full value in the JSON report)` : value;
}

function renderComponent(c: ComponentChange): string {
  const badgeClass = c.category;
  const fieldSection =
    c.category === 'changed' && c.fieldChanges?.length
      ? renderFieldChanges(c.fieldChanges)
      : '';

  return `
    <article class="component ${badgeClass}">
      <header>
        <span class="badge ${badgeClass}">${c.category}</span>
        <strong>${escapeHtml(c.metadataType)}</strong>
        <span class="name">${escapeHtml(c.fullName)}</span>
      </header>
      ${c.summary ? `<p class="summary">${escapeHtml(c.summary)}</p>` : ''}
      <div class="paths">
        ${c.baselinePath ? `<span>Baseline: <code>${escapeHtml(c.baselinePath)}</code></span>` : ''}
        ${c.targetPath ? `<span>Target: <code>${escapeHtml(c.targetPath)}</code></span>` : ''}
      </div>
      ${fieldSection}
    </article>`;
}

function renderOrgSide(title: string, label: string, orgKind: OrgKind, details: {
  username?: string;
  orgId?: string;
  instanceHost?: string;
}): string {
  const meta: string[] = [];
  if (details.username) meta.push(`User: <code>${escapeHtml(details.username)}</code>`);
  if (details.orgId) meta.push(`Org ID: <code>${escapeHtml(details.orgId)}</code>`);
  if (details.instanceHost) meta.push(`Host: <code>${escapeHtml(details.instanceHost)}</code>`);

  return `
    <div class="org-side">
      <div class="org-side-title">${escapeHtml(title)}</div>
      <div class="org-side-header">
        <span class="kind-badge kind-${escapeHtml(orgKind)}">${escapeHtml(orgKind)}</span>
        <strong>${escapeHtml(label)}</strong>
      </div>
      ${meta.length ? `<div class="org-side-meta">${meta.join(' · ')}</div>` : ''}
    </div>`;
}

function renderWarnings(warnings: string[]): string {
  if (!warnings.length) return '';
  const items = warnings.map((w) => `<li>${escapeHtml(w)}</li>`).join('');
  return `
    <div class="callout" role="note">
      <strong>Warnings</strong>
      <ul>${items}</ul>
    </div>`;
}

function groupByCategory(report: DriftReport): Record<string, ComponentChange[]> {
  const groups: Record<string, ComponentChange[]> = {
    added: [],
    removed: [],
    changed: [],
    unchanged: [],
  };
  for (const c of report.components) {
    groups[c.category].push(c);
  }
  return groups;
}

export function renderHtmlReport(report: DriftReport): string {
  const groups = groupByCategory(report);
  const { summary, baseline, target, warnings, generatedAt } = report;
  const verdict = report.outcome === 'incomplete'
    ? 'Comparison incomplete. Some metadata could not be retrieved or identified, so a clean result cannot be confirmed.'
    : summary.hasDrift
      ? `Drift detected: ${summary.added} added in target, ${summary.removed} missing from target, ${summary.changed} changed.`
      : `No drift detected. All ${summary.unchanged} compared components match the baseline.`;

  const section = (title: string, items: ComponentChange[], id: string) => {
    if (!items.length) return '';
    return `
      <section id="${id}">
        <h2>${title} <span class="count">(${items.length})</span></h2>
        ${items.map(renderComponent).join('\n')}
      </section>`;
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Salesforce Metadata Drift Report</title>
  <style>
    :root {
      --bg: #0f172a;
      --surface: #1e293b;
      --border: #334155;
      --text: #e2e8f0;
      --muted: #94a3b8;
      --added: #22c55e;
      --removed: #ef4444;
      --changed: #f59e0b;
      --unchanged: #64748b;
    }
    * { box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: var(--bg);
      color: var(--text);
      margin: 0;
      padding: 2rem;
      line-height: 1.5;
    }
    h1 { margin-top: 0; }
    .meta { color: var(--muted); margin-bottom: 2rem; }
    .summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1rem;
      text-align: center;
    }
    .card .value { font-size: 2rem; font-weight: 700; }
    .card.added .value { color: var(--added); }
    .card.removed .value { color: var(--removed); }
    .card.changed .value { color: var(--changed); }
    .card.unchanged .value { color: var(--unchanged); }
    section { margin-bottom: 2.5rem; }
    section h2 { border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; }
    .count { color: var(--muted); font-weight: normal; }
    .component {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 0.75rem;
    }
    .component header { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
    .badge {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      padding: 0.15rem 0.5rem;
      border-radius: 4px;
    }
    .badge.added { background: color-mix(in srgb, var(--added) 25%, transparent); color: var(--added); }
    .badge.removed { background: color-mix(in srgb, var(--removed) 25%, transparent); color: var(--removed); }
    .badge.changed { background: color-mix(in srgb, var(--changed) 25%, transparent); color: var(--changed); }
    .badge.unchanged { background: color-mix(in srgb, var(--unchanged) 25%, transparent); color: var(--unchanged); }
    .name { color: var(--muted); }
    .paths { font-size: 0.85rem; color: var(--muted); display: flex; flex-direction: column; gap: 0.25rem; }
    code { background: var(--bg); padding: 0.1rem 0.35rem; border-radius: 3px; font-size: 0.85em; }
    details { margin-top: 0.75rem; }
    table.field-changes {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
      margin-top: 0.5rem;
    }
    table.field-changes th, table.field-changes td {
      border: 1px solid var(--border);
      padding: 0.4rem 0.6rem;
      text-align: left;
      vertical-align: top;
    }
    table.field-changes .baseline { color: #fca5a5; }
    table.field-changes .target { color: #86efac; }
    .muted { color: var(--muted); font-size: 0.85rem; }
    nav.toc { margin-bottom: 2rem; }
    nav.toc a { color: #60a5fa; margin-right: 1rem; }
    .org-header {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .org-side {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1rem;
    }
    .org-side-title { color: var(--muted); font-size: 0.85rem; margin-bottom: 0.35rem; }
    .org-side-header { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; }
    .org-side-meta { color: var(--muted); font-size: 0.85rem; margin-top: 0.5rem; }
    .kind-badge {
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      padding: 0.15rem 0.45rem;
      border-radius: 999px;
      border: 1px solid var(--border);
    }
    .kind-scratch { color: #c084fc; border-color: #7e22ce; }
    .kind-sandbox { color: #67e8f9; border-color: #0e7490; }
    .kind-developer { color: #93c5fd; border-color: #1d4ed8; }
    .kind-production { color: #86efac; border-color: #15803d; }
    .kind-unknown { color: #fcd34d; border-color: #b45309; }
    .callout {
      background: color-mix(in srgb, #f59e0b 12%, var(--surface));
      border: 1px solid #b45309;
      border-radius: 8px;
      padding: 1rem 1.25rem;
      margin-bottom: 2rem;
    }
    .callout ul { margin: 0.5rem 0 0; padding-left: 1.25rem; }
  </style>
</head>
<body>
  <h1>Salesforce Metadata Drift Report</h1>
  <p class="meta">Generated: ${escapeHtml(generatedAt)}${report.runUrl ? ` from <a href="${escapeHtml(report.runUrl)}">this workflow run</a>` : ''}<br /><strong>${escapeHtml(verdict)}</strong></p>

  <div class="org-header">
    ${renderOrgSide('Baseline (source of truth)', baseline.label, baseline.orgKind, baseline)}
    ${renderOrgSide('Target', target.label, target.orgKind, target)}
  </div>

  ${renderWarnings(warnings)}
  ${report.scope ? `<section><h2>Comparison scope</h2><p>API version ${escapeHtml(report.scope.apiVersion)}, ${report.scope.kind === 'manifest' ? 'from package-xml-path' : 'from metadata-types'}.</p><ul>${
    Object.entries(report.scope.members).map(([type, members]) => `<li>${escapeHtml(type)}: ${escapeHtml(members.join(', '))}</li>`).join('')
  }${report.scope.notes.map((note) => `<li>${escapeHtml(note)}</li>`).join('')}${
    (report.retrievals ?? []).map((item) => `<li>${escapeHtml(item.side)} retrieved: ${escapeHtml(item.retrievedAt)}</li>`).join('')
  }</ul></section>` : ''}

  <div class="summary-cards">
    <div class="card added"><div class="value">${summary.added}</div><div>Added in target</div></div>
    <div class="card removed"><div class="value">${summary.removed}</div><div>Missing from target</div></div>
    <div class="card changed"><div class="value">${summary.changed}</div><div>Changed</div></div>
    <div class="card unchanged"><div class="value">${summary.unchanged}</div><div>Unchanged</div></div>
  </div>

  <nav class="toc">
    <a href="#added">Added (${summary.added})</a>
    <a href="#removed">Missing (${summary.removed})</a>
    <a href="#changed">Changed (${summary.changed})</a>
  </nav>
  <p class="muted">Unchanged components (${summary.unchanged}) are counted above. The full list is in the JSON report.</p>

  ${section('Added in target (not in baseline)', groups.added, 'added')}
  ${section('Missing from target (only in baseline)', groups.removed, 'removed')}
  ${section('Changed', groups.changed, 'changed')}
</body>
</html>`;
}

export function writeHtmlReport(report: DriftReport, outputDir: string): string {
  fs.mkdirSync(outputDir, { recursive: true });
  const filePath = path.join(outputDir, REPORT_HTML_FILENAME);
  fs.writeFileSync(filePath, renderHtmlReport(report), 'utf8');
  return filePath;
}
