import { describe, it, expect } from 'vitest';
import { getHandler } from '../src/handlers/index.js';
import { hashMetadataContent } from '../src/utils/hash.js';
import { describeFieldChanges } from '../src/report/describe.js';
import type { NormalizedComponent } from '../src/types.js';

const comp = (metadataType: string, content: string): NormalizedComponent => ({
  metadataType,
  fullName: 'Example',
  relativePath: 'Example.field-meta.xml',
  absolutePath: '/tmp/Example.field-meta.xml',
  content,
  contentHash: hashMetadataContent(content, 'Example.field-meta.xml'),
});
const picklist = (values: string[], length = '') => comp('CustomField',
  `<CustomField><fullName>Stage__c</fullName>${length}<valueSet><valueSetDefinition>${values
    .map((value) => `<value><fullName>${value}</fullName><default>false</default><label>${value}</label></value>`)
    .join('')}</valueSetDefinition></valueSet></CustomField>`);
const compare = (baseline: NormalizedComponent, target: NormalizedComponent) =>
  getHandler(baseline.metadataType).compare(baseline, target);
const VALUES = 'CustomField.valueSet.valueSetDefinition.value';

describe('list entries matched by name', () => {
  it('reports a value inserted at the top as that one value', () => {
    const changes = compare(picklist(['B', 'C', 'D']), picklist(['A', 'B', 'C', 'D']));
    expect(changes.map((change) => change.path)).toEqual([`${VALUES}[A].default`, `${VALUES}[A].fullName`, `${VALUES}[A].label`]);
    expect(changes.every((change) => change.baselineValue === undefined)).toBe(true);
    expect(describeFieldChanges('CustomField', changes)).toMatchObject([
      { title: 'Value set › Value set definition › Value › A', kind: 'added' },
    ]);
  });

  it('matches a single entry against the same entry in a longer list', () => {
    const changes = compare(picklist(['A']), picklist(['A', 'B']));
    expect(changes.every((change) => change.path.startsWith(`${VALUES}[B].`))).toBe(true);
    expect(changes).toHaveLength(3);
  });

  it('reports a reorder once, as the order', () => {
    const changes = compare(picklist(['A', 'B', 'C']), picklist(['C', 'A', 'B']));
    expect(changes).toEqual([{ path: `${VALUES}.@order`, baselineValue: 'A, B, C', targetValue: 'C, A, B' }]);
    expect(describeFieldChanges('CustomField', changes)[0].rows[0].label).toBe('Order');
  });

  it('does not call an insert or a removal a reorder', () => {
    const changes = compare(picklist(['A', 'B', 'C']), picklist(['B', 'X', 'C']));
    expect(changes.some((change) => change.path.endsWith('.@order'))).toBe(false);
    expect(new Set(changes.map((change) => /\[(.+?)\]/.exec(change.path)?.[1]))).toEqual(new Set(['A', 'X']));
  });

  it('falls back to position when names repeat', () => {
    const changes = compare(picklist(['A', 'A']), picklist(['A', 'A', 'B']));
    expect(changes.every((change) => change.path.startsWith(`${VALUES}[2].`))).toBe(true);
  });

  it('keeps the settings of the component itself at the top level', () => {
    const changes = compare(picklist(['A'], '<length>50</length>'), picklist(['A'], '<length>80</length>'));
    expect(changes).toEqual([{ path: 'CustomField.length', baselineValue: '50', targetValue: '80' }]);
  });

  it('still treats permission lists as unordered', () => {
    const profile = (fields: string[]) => comp('Profile', `<Profile>${fields
      .map((field) => `<fieldPermissions><editable>true</editable><field>${field}</field></fieldPermissions>`).join('')}</Profile>`);
    expect(compare(profile(['Account.A__c', 'Account.B__c']), profile(['Account.B__c', 'Account.A__c']))).toEqual([]);
  });
});
