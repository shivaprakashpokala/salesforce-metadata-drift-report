import type {
  ChangeCategory,
  ComponentChange,
  DriftReport,
  DiffOptions,
  MetadataTree,
  NormalizedComponent,
  FieldChange,
} from './types.js';
import { getHandler } from './handlers/index.js';
import { createGenericHandler } from './handlers/generic.js';

function compareFiles(baseline: NormalizedComponent, target: NormalizedComponent): FieldChange[] {
  if (!baseline.files || !target.files) return getHandler(baseline.metadataType).compare(baseline, target);
  const changes: FieldChange[] = [];
  const keys = [...new Set([...baseline.files.keys(), ...target.files.keys()])].sort();
  for (const key of keys) {
    const b = baseline.files.get(key);
    const t = target.files.get(key);
    const prefix = keys.length > 1 ? `${t?.relativePath ?? b!.relativePath}: ` : '';
    if (!b || !t || b.binary || t.binary) {
      if (b?.contentHash !== t?.contentHash) {
        changes.push({
          path: `${prefix}content`,
          baselineValue: b ? (b.binary ? `sha256:${b.contentHash}` : b.content) : undefined,
          targetValue: t ? (t.binary ? `sha256:${t.contentHash}` : t.content) : undefined,
        });
      }
      continue;
    }
    const isApexMetaFile = key === 'metadata' && ['ApexClass', 'ApexTrigger'].includes(baseline.metadataType);
    const handler = isApexMetaFile ? createGenericHandler(baseline.metadataType) : getHandler(baseline.metadataType);
    const fileChanges = handler.compare({ ...baseline, ...b, files: undefined }, { ...target, ...t, files: undefined });
    changes.push(...fileChanges.map((change) => ({ ...change, path: prefix + change.path })));
  }
  return changes;
}

function compareComponents(
  baseline: NormalizedComponent | undefined,
  target: NormalizedComponent | undefined,
  metadataType: string,
  fullName: string,
): ComponentChange {
  if (!baseline && target) {
    return {
      metadataType,
      fullName,
      category: 'added',
      targetPath: target.relativePath,
      targetHash: target.contentHash,
    };
  }

  if (baseline && !target) {
    return {
      metadataType,
      fullName,
      category: 'removed',
      baselinePath: baseline.relativePath,
      baselineHash: baseline.contentHash,
    };
  }

  if (!baseline || !target) {
    throw new Error(`Unexpected compare state for ${metadataType}:${fullName}`);
  }

  const handler = getHandler(metadataType);
  const fieldChanges = compareFiles(baseline, target);
  const unchanged = baseline.contentHash === target.contentHash && fieldChanges.length === 0;

  if (unchanged) {
    return {
      metadataType,
      fullName,
      category: 'unchanged',
      baselinePath: baseline.relativePath,
      targetPath: target.relativePath,
      baselineHash: baseline.contentHash,
      targetHash: target.contentHash,
    };
  }

  const summary = handler.summarize?.(fieldChanges) ?? `${fieldChanges.length} difference(s)`;

  return {
    metadataType,
    fullName,
    category: 'changed',
    baselinePath: baseline.relativePath,
    targetPath: target.relativePath,
    baselineHash: baseline.contentHash,
    targetHash: target.contentHash,
    fieldChanges,
    summary,
  };
}

export function diffMetadataTrees(
  baselineTree: MetadataTree,
  targetTree: MetadataTree,
  options: DiffOptions = {},
): DriftReport {
  const baseline = options.baseline ?? { label: baselineTree.rootPath, orgKind: 'unknown' };
  const target = options.target ?? { label: targetTree.rootPath, orgKind: 'unknown' };

  const allKeys = new Set([
    ...baselineTree.components.keys(),
    ...targetTree.components.keys(),
  ]);

  const components: ComponentChange[] = [];
  const counts: Record<ChangeCategory, number> = {
    added: 0,
    removed: 0,
    changed: 0,
    unchanged: 0,
  };

  for (const key of [...allKeys].sort()) {
    const baselineComponent = baselineTree.components.get(key);
    const targetComponent = targetTree.components.get(key);
    const metadataType =
      baselineComponent?.metadataType ?? targetComponent?.metadataType ?? 'Unknown';
    const fullName =
      baselineComponent?.fullName ?? targetComponent?.fullName ?? key.split(':')[1] ?? key;

    const change = compareComponents(baselineComponent, targetComponent, metadataType, fullName);
    components.push(change);
    counts[change.category]++;
  }

  const hasDrift = counts.added + counts.removed + counts.changed > 0;
  const coverageWarnings = [...(baselineTree.warnings ?? []), ...(targetTree.warnings ?? [])];
  if (!components.length) {
    coverageWarnings.push('No components were compared. Check metadata-types, standard-objects, or package-xml-path.');
  }
  const incomplete = options.incomplete || coverageWarnings.length > 0;

  return {
    schemaVersion: 2,
    outcome: incomplete ? 'incomplete' : hasDrift ? 'drift' : 'no-drift',
    scope: options.scope,
    generatedAt: new Date().toISOString(),
    baseline,
    target,
    warnings: [...new Set([...(options.warnings ?? []), ...coverageWarnings])],
    summary: {
      added: counts.added,
      removed: counts.removed,
      changed: counts.changed,
      unchanged: counts.unchanged,
      total: components.length,
      hasDrift,
    },
    components,
  };
}
