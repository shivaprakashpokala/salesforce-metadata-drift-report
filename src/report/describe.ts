import type { ChangeCategory, ComponentChange, DriftReport, FieldChange } from '../types.js';
import { LINE_CHANGE_PATH } from '../handlers/apex.js';

/** One setting inside a component, such as the object permissions for one object. */
export interface ChangeGroup {
  /** Readable location, for example "Object permissions › Extra_Test__c". Empty for top-level settings. */
  title: string;
  kind: 'added' | 'removed' | 'changed';
  rows: { label: string; baseline?: string; target?: string }[];
}

const LABELS: Record<string, string> = {
  applicationVisibilities: 'App visibility',
  classAccesses: 'Apex class access',
  customMetadataTypeAccesses: 'Custom metadata type access',
  customPermissions: 'Custom permissions',
  customSettingAccesses: 'Custom setting access',
  externalDataSourceAccesses: 'External data source access',
  fieldPermissions: 'Field permissions',
  flowAccesses: 'Flow access',
  layoutAssignments: 'Layout assignments',
  loginIpRanges: 'Login IP ranges',
  objectPermissions: 'Object permissions',
  pageAccesses: 'Visualforce page access',
  recordTypeVisibilities: 'Record type visibility',
  tabSettings: 'Tab settings',
  tabVisibilities: 'Tab visibility',
  userPermissions: 'User permissions',
};

/** "allowCreate" → "Allow create". API names with underscores are kept as they are. */
export function humanize(name: string): string {
  if (LABELS[name]) return LABELS[name];
  if (name.includes('_') || !/^[a-z][A-Za-z0-9]*$/.test(name)) return name;
  const words = name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

type Token = { name: string } | { key: string };

function tokenize(path: string): Token[] {
  const tokens: Token[] = [];
  for (const match of path.matchAll(/\[([^\]]*)\]|([^.[\]]+)/g)) {
    tokens.push(match[1] !== undefined ? { key: match[1] } : { name: match[2] });
  }
  return tokens;
}

const tokenLabel = (token: Token) => ('name' in token ? humanize(token.name) : /^\d+$/.test(token.key) ? `#${Number(token.key) + 1}` : token.key);

/** Group field-level changes by the setting they belong to, with readable labels. */
export function describeFieldChanges(metadataType: string, changes: FieldChange[]): ChangeGroup[] {
  const groups = new Map<string, ChangeGroup & { key?: string }>();
  for (const change of changes) {
    // Components with several files prefix each path with the file name.
    const fileMatch = /^(.+?): (.+)$/.exec(change.path);
    const file = fileMatch && !fileMatch[1].includes('[') ? fileMatch[1] : undefined;
    const tokens = tokenize(file ? fileMatch![2] : change.path);
    if (tokens.length > 1 && 'name' in tokens[0] && tokens[0].name === metadataType) tokens.shift();
    const leaf = tokens.pop();
    const parents = tokens.map(tokenLabel);
    const title = [file, ...parents].filter(Boolean).join(' › ');
    const lastKey = tokens.length && 'key' in tokens[tokens.length - 1] ? (tokens[tokens.length - 1] as { key: string }).key : undefined;
    const group = groups.get(title) ?? { title, kind: 'changed', rows: [], key: lastKey };
    group.rows.push({ label: leaf ? tokenLabel(leaf) : 'Value', baseline: change.baselineValue, target: change.targetValue });
    groups.set(title, group);
  }

  return [...groups.values()].map(({ key, ...group }) => {
    const kind = group.rows.every((row) => row.baseline === undefined)
      ? 'added'
      : group.rows.every((row) => row.target === undefined) ? 'removed' : 'changed';
    // An added or removed entry repeats its own name as a field; leave that out.
    const rows = kind === 'changed' ? group.rows : group.rows.filter((row) => (row.baseline ?? row.target) !== key);
    return { ...group, kind, rows };
  });
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;
const MAX_INLINE_VALUE = 40;

export function isLineChange(change: FieldChange): boolean {
  return LINE_CHANGE_PATH.test(change.path);
}

/** Short line such as "Object permissions: 1 added · Apex class access: 1 removed". */
export function summarizeComponent(component: ComponentChange): string {
  const changes = component.fieldChanges ?? [];
  const lines = changes.filter(isLineChange);
  const parts: string[] = [];
  if (lines.length) {
    const added = lines.filter((change) => change.path.includes('target line')).length;
    parts.push(`${plural(added, 'line')} added, ${lines.length - added} removed`);
  }
  const groups = describeFieldChanges(component.metadataType, changes.filter((change) => !isLineChange(change)));
  // One or two plain value changes read best spelled out: "Length 50 → 80".
  const rows = groups.flatMap((group) => group.rows.map((row) => ({ group, row })));
  const short = (text?: string) => text !== undefined && text.length <= MAX_INLINE_VALUE && !text.includes('\n');
  if (rows.length && rows.length <= 2 && groups.every((group) => group.kind === 'changed')
    && rows.every(({ row }) => short(row.baseline) && short(row.target))) {
    parts.push(...rows.map(({ group, row }) =>
      `${[group.title, row.label].filter(Boolean).join(' › ')}: ${row.baseline || 'empty'} → ${row.target || 'empty'}`));
    return parts.join(' · ');
  }
  const counts = new Map<string, Record<ChangeGroup['kind'], number>>();
  for (const group of groups) {
    const area = group.title.split(' › ')[0] || 'Settings';
    const entry = counts.get(area) ?? { added: 0, removed: 0, changed: 0 };
    entry[group.kind] += group.title ? 1 : Math.max(group.rows.length, 1);
    counts.set(area, entry);
  }
  for (const [area, count] of counts) {
    const detail = (['added', 'removed', 'changed'] as const).filter((kind) => count[kind]).map((kind) => `${count[kind]} ${kind}`);
    parts.push(`${area}: ${detail.join(', ')}`);
  }
  return parts.join(' · ') || component.summary || 'Content differs';
}

export interface Verdict {
  status: DriftReport['outcome'];
  title: string;
  detail: string;
}

export function verdict(report: DriftReport): Verdict {
  const { summary } = report;
  if (report.outcome === 'incomplete') {
    return {
      status: 'incomplete',
      title: 'Comparison incomplete',
      detail: 'Some metadata could not be retrieved or identified, so a clean result cannot be confirmed. ' +
        'Check the warnings. Differences that were found are listed below.',
    };
  }
  if (summary.hasDrift) {
    const different = summary.added + summary.removed + summary.changed;
    return {
      status: 'drift',
      title: 'Drift found',
      detail: `${different} of ${summary.total} components differ between ${report.baseline.label} and ${report.target.label}.`,
    };
  }
  return {
    status: 'no-drift',
    title: 'No drift',
    detail: `All ${summary.unchanged} compared components in ${report.target.label} match ${report.baseline.label}.`,
  };
}

export const CATEGORY_LABELS: Record<ChangeCategory, string> = {
  added: 'Only in target',
  removed: 'Missing from target',
  changed: 'Changed',
  unchanged: 'Unchanged',
};

/** Components that differ, grouped by metadata type in name order. */
export function differencesByType(report: DriftReport): [string, ComponentChange[]][] {
  const order: Record<ChangeCategory, number> = { removed: 0, added: 1, changed: 2, unchanged: 3 };
  const byType = new Map<string, ComponentChange[]>();
  for (const component of report.components) {
    if (component.category === 'unchanged') continue;
    byType.set(component.metadataType, [...(byType.get(component.metadataType) ?? []), component]);
  }
  return [...byType]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([type, items]) => [type, items.sort((a, b) => order[a.category] - order[b.category]
      || (a.fullName < b.fullName ? -1 : a.fullName > b.fullName ? 1 : 0))]);
}

/** Salesforce URL-encodes some names, such as "Force%2Ecom - Free User". Show them decoded. */
export function displayName(fullName: string): string {
  try {
    return /%[0-9A-Fa-f]{2}/.test(fullName) ? decodeURIComponent(fullName) : fullName;
  } catch {
    return fullName;
  }
}

/** "2026-10-30T02:48:12.637Z" → "2026-10-30 02:48 UTC". */
export function formatTimestamp(iso: string): string {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(iso);
  return match ? `${match[1]} ${match[2]} UTC` : iso;
}
