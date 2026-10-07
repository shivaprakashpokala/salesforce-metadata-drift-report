import type { MetadataHandler } from './types.js';
import type { FieldChange, NormalizedComponent } from '../types.js';
import { diffFlattenedMaps, flattenXmlObject, parseXml } from '../utils/xml.js';
import { isMetadataXml } from '../utils/hash.js';

function compareTextOrXml(baseline: NormalizedComponent, target: NormalizedComponent): FieldChange[] {
  if (baseline.contentHash === target.contentHash) return [];

  const baselineXml = isMetadataXml(baseline.relativePath) ? parseXml(baseline.content) : null;
  const targetXml = isMetadataXml(target.relativePath) ? parseXml(target.content) : null;
  if (baselineXml && targetXml) {
    return diffFlattenedMaps(flattenXmlObject(baselineXml), flattenXmlObject(targetXml));
  }

  if (baseline.content !== target.content) {
    return [{ path: 'content', baselineValue: baseline.content, targetValue: target.content }];
  }
  return [];
}

function summarizePaths(changes: FieldChange[]): string {
  if (!changes.length) return '';
  const shown = changes.slice(0, 3).map((change) => change.path).join(', ');
  return `${changes.length} difference(s): ${shown}${changes.length > 3 ? ', ...' : ''}`;
}

const PERMISSION_AREAS = [
  'objectPermissions',
  'fieldPermissions',
  'classAccesses',
  'pageAccesses',
  'tabVisibilities',
  'tabSettings',
  'applicationVisibilities',
  'userPermissions',
  'recordTypeVisibilities',
  'layoutAssignments',
  'flowAccesses',
  'customPermissions',
];

function summarizePermissions(changes: FieldChange[]): string {
  const byArea = new Map<string, number>();
  for (const change of changes) {
    const area = PERMISSION_AREAS.find((name) => change.path.includes(`.${name}`)) ?? 'other';
    byArea.set(area, (byArea.get(area) ?? 0) + 1);
  }
  return [...byArea].map(([area, count]) => `${area}: ${count}`).join(', ');
}

export function createGenericHandler(metadataType: string): MetadataHandler {
  return { metadataType, compare: compareTextOrXml, summarize: summarizePaths };
}

export function createPermissionHandler(metadataType: string): MetadataHandler {
  return { metadataType, compare: compareTextOrXml, summarize: summarizePermissions };
}
