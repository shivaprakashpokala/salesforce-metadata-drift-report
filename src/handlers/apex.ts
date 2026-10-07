import type { MetadataHandler } from './types.js';
import type { FieldChange, NormalizedComponent } from '../types.js';

// Above this many cells the LCS table gets too large; report the region as replaced.
const MAX_LCS_CELLS = 4_000_000;

export const LINE_CHANGE_PATH = /^(?:.*: )?(baseline|target) line (\d+)$/;

/** Line diff in order: removed baseline lines and added target lines. */
export function diffLines(baselineText: string, targetText: string): FieldChange[] {
  const a = baselineText.replace(/\r\n/g, '\n').split('\n');
  const b = targetText.replace(/\r\n/g, '\n').split('\n');

  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }

  const removed = (i: number): FieldChange => ({ path: `baseline line ${i + 1}`, baselineValue: a[i] });
  const added = (j: number): FieldChange => ({ path: `target line ${j + 1}`, targetValue: b[j] });
  const n = endA - start;
  const m = endB - start;
  const changes: FieldChange[] = [];

  if (n * m > MAX_LCS_CELLS) {
    for (let i = start; i < endA; i++) changes.push(removed(i));
    for (let j = start; j < endB; j++) changes.push(added(j));
    return changes;
  }

  const width = m + 1;
  const lcs = new Uint32Array((n + 1) * width);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i * width + j] = a[start + i] === b[start + j]
        ? lcs[(i + 1) * width + j + 1] + 1
        : Math.max(lcs[(i + 1) * width + j], lcs[i * width + j + 1]);
    }
  }

  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && a[start + i] === b[start + j]) {
      i++;
      j++;
    } else if (i < n && (j === m || lcs[(i + 1) * width + j] >= lcs[i * width + j + 1])) {
      changes.push(removed(start + i++));
    } else {
      changes.push(added(start + j++));
    }
  }
  return changes;
}

function compareApexBody(baseline: NormalizedComponent, target: NormalizedComponent): FieldChange[] {
  if (baseline.contentHash === target.contentHash) return [];
  const changes = diffLines(baseline.content, target.content);
  if (!changes.length) {
    return [{ path: 'line endings or whitespace', baselineValue: 'differs', targetValue: 'differs' }];
  }
  return changes;
}

function summarizeLines(changes: FieldChange[]): string {
  const added = changes.filter((change) => change.path.includes('target line')).length;
  const removed = changes.filter((change) => change.path.includes('baseline line')).length;
  const other = changes.length - added - removed;
  const parts = [`${added} line(s) added`, `${removed} line(s) removed`];
  if (other) parts.push(`${other} other difference(s)`);
  return parts.join(', ');
}

export const apexClassHandler: MetadataHandler = {
  metadataType: 'ApexClass',
  compare: compareApexBody,
  summarize: summarizeLines,
};

export const apexTriggerHandler: MetadataHandler = {
  metadataType: 'ApexTrigger',
  compare: compareApexBody,
  summarize: summarizeLines,
};
