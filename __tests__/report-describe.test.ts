import { describe, it, expect } from 'vitest';
import { describeFieldChanges, displayName, humanize, summarizeComponent } from '../src/report/describe.js';

describe('readable change descriptions', () => {
  it('turns API element names into words but keeps API names', () => {
    expect(humanize('allowCreate')).toBe('Allow create');
    expect(humanize('objectPermissions')).toBe('Object permissions');
    expect(humanize('Account.Industry__c')).toBe('Account.Industry__c');
  });

  it('groups profile entries and labels added and removed ones', () => {
    const groups = describeFieldChanges('Profile', [
      { path: 'Profile.objectPermissions[Extra__c].allowRead', targetValue: 'true' },
      { path: 'Profile.objectPermissions[Extra__c].object', targetValue: 'Extra__c' },
      { path: 'Profile.classAccesses[Old].apexClass', baselineValue: 'Old' },
      { path: 'Profile.classAccesses[Old].enabled', baselineValue: 'true' },
      { path: 'Profile.userPermissions[ApiEnabled].enabled', baselineValue: 'true', targetValue: 'false' },
    ]);
    expect(groups).toEqual([
      { title: 'Object permissions › Extra__c', kind: 'added', rows: [{ label: 'Allow read', baseline: undefined, target: 'true' }] },
      { title: 'Apex class access › Old', kind: 'removed', rows: [{ label: 'Enabled', baseline: 'true', target: undefined }] },
      { title: 'User permissions › ApiEnabled', kind: 'changed', rows: [{ label: 'Enabled', baseline: 'true', target: 'false' }] },
    ]);
  });

  it('spells out a small change and counts larger ones', () => {
    const base = { metadataType: 'CustomField', fullName: 'Account.X__c', category: 'changed' as const };
    expect(summarizeComponent({ ...base, fieldChanges: [{ path: 'CustomField.length', baselineValue: '50', targetValue: '80' }] }))
      .toBe('Length: 50 → 80');
    expect(summarizeComponent({ ...base, metadataType: 'Profile', fieldChanges: [
      { path: 'Profile.objectPermissions[A__c].allowRead', targetValue: 'true' },
      { path: 'Profile.objectPermissions[B__c].allowRead', targetValue: 'true' },
      { path: 'Profile.layoutAssignments[A__c-Layout].layout', baselineValue: 'A__c-Layout' },
    ] })).toBe('Object permissions: 2 added · Layout assignments: 1 removed');
    expect(summarizeComponent({ ...base, metadataType: 'ApexClass', fieldChanges: [
      { path: 'baseline line 3', baselineValue: 'a' }, { path: 'target line 3', targetValue: 'b' },
    ] })).toBe('1 line added, 1 removed');
  });

  it('decodes URL-encoded names for display', () => {
    expect(displayName('Force%2Ecom - Free User')).toBe('Force.com - Free User');
    expect(displayName('100% Sales')).toBe('100% Sales');
  });
});
