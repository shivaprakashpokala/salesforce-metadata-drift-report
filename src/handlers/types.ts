import type { FieldChange, NormalizedComponent } from '../types.js';

export interface MetadataHandler {
  metadataType: string;
  compare(baseline: NormalizedComponent, target: NormalizedComponent): FieldChange[];
  summarize?(changes: FieldChange[]): string;
}
