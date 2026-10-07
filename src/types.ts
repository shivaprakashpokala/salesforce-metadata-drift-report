import type { OrgKind, OrgSideInfo } from './org-kind.js';

export type { OrgKind, OrgSideInfo };

/** added: only in the target. removed: only in the baseline (reported as "missing from target"). */
export type ChangeCategory = 'added' | 'removed' | 'changed' | 'unchanged';

export type ComparisonStatus = 'drift' | 'no-drift' | 'incomplete' | 'error';

export interface FieldChange {
  path: string;
  baselineValue?: string;
  targetValue?: string;
}

export interface ComponentChange {
  metadataType: string;
  fullName: string;
  category: ChangeCategory;
  baselinePath?: string;
  targetPath?: string;
  baselineHash?: string;
  targetHash?: string;
  fieldChanges?: FieldChange[];
  summary?: string;
}

export interface RetrievalRecord {
  side: string;
  retrievedAt: string;
  warnings: string[];
}

export interface DriftReport {
  schemaVersion: number;
  outcome: 'drift' | 'no-drift' | 'incomplete';
  scope?: ComparisonScope;
  retrievals?: RetrievalRecord[];
  runUrl?: string;
  generatedAt: string;
  baseline: OrgSideInfo;
  target: OrgSideInfo;
  warnings: string[];
  summary: {
    added: number;
    removed: number;
    changed: number;
    unchanged: number;
    total: number;
    hasDrift: boolean;
  };
  components: ComponentChange[];
}

export interface ComponentFile {
  relativePath: string;
  content: string;
  contentHash: string;
  binary?: boolean;
}

export interface NormalizedComponent {
  metadataType: string;
  fullName: string;
  relativePath: string;
  absolutePath: string;
  content: string;
  contentHash: string;
  files?: Map<string, ComponentFile>;
  parentType?: string;
  parentName?: string;
}

export interface MetadataTree {
  rootPath: string;
  components: Map<string, NormalizedComponent>;
  warnings?: string[];
}

export interface DiffOptions {
  baseline?: OrgSideInfo;
  target?: OrgSideInfo;
  warnings?: string[];
  incomplete?: boolean;
  scope?: ComparisonScope;
}

export interface ComparisonScope {
  kind: 'metadata-types' | 'manifest';
  apiVersion: string;
  members: Record<string, string[]>;
  manifestHash?: string;
  notes: string[];
}

export interface ActionInputs {
  baselineAuthUrl?: string;
  targetAuthUrl?: string;
  baselineLabel?: string;
  targetLabel?: string;
  metadataTypes: string[];
  standardObjects: string[];
  apiVersion?: string;
  packageXmlPath?: string;
  outputDir: string;
  workingDir: string;
  uploadArtifact: boolean;
  artifactName: string;
  artifactRetentionDays?: number;
  jobSummary: boolean;
}
