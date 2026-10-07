import { describe, it, expect } from 'vitest';
import { getHandler } from '../src/handlers/index.js';
import { diffLines } from '../src/handlers/apex.js';
import type { NormalizedComponent } from '../src/types.js';
import { hashMetadataContent } from '../src/utils/hash.js';

function makeComponent(
  metadataType: string,
  fullName: string,
  content: string,
): NormalizedComponent {
  return {
    metadataType,
    fullName,
    relativePath: `${fullName}.xml`,
    absolutePath: `/tmp/${fullName}.xml`,
    content,
    contentHash: hashMetadataContent(content, `${fullName}.xml`),
  };
}

describe('metadata handlers', () => {
  it('falls back to generic handler for unknown types', () => {
    const handler = getHandler('UnknownType');
    const source = makeComponent('UnknownType', 'Foo', '<root><a>1</a></root>');
    const target = makeComponent('UnknownType', 'Foo', '<root><a>2</a></root>');
    const changes = handler.compare(source, target);
    expect(changes.length).toBeGreaterThan(0);
  });

  it('compares profile permissions by name and ignores reorder', () => {
    const baseline = `<?xml version="1.0" encoding="UTF-8"?>
<Profile xmlns="http://soap.sforce.com/2006/04/metadata">
    <fieldPermissions>
        <editable>true</editable>
        <field>Account.Industry__c</field>
        <readable>true</readable>
    </fieldPermissions>
    <fieldPermissions>
        <editable>false</editable>
        <field>Account.Name</field>
        <readable>true</readable>
    </fieldPermissions>
</Profile>`;
    const reordered = `<?xml version="1.0" encoding="UTF-8"?>
<Profile xmlns="http://soap.sforce.com/2006/04/metadata">
  <fieldPermissions><field>Account.Name</field><editable>false</editable><readable>true</readable></fieldPermissions>
  <fieldPermissions><field>Account.Industry__c</field><editable>true</editable><readable>true</readable></fieldPermissions>
</Profile>`;
    const flipped = baseline.replace(
      '<field>Account.Industry__c</field>\n        <readable>true</readable>',
      '<field>Account.Industry__c</field>\n        <readable>false</readable>',
    );

    const handler = getHandler('Profile');
    expect(
      handler.compare(
        makeComponent('Profile', 'Admin', baseline),
        makeComponent('Profile', 'Admin', reordered),
      ),
    ).toEqual([]);

    const changes = handler.compare(
      makeComponent('Profile', 'Admin', baseline),
      makeComponent('Profile', 'Admin', flipped),
    );
    expect(changes).toEqual([
      expect.objectContaining({
        path: 'Profile.fieldPermissions[Account.Industry__c].readable',
        baselineValue: 'true',
        targetValue: 'false',
      }),
    ]);
  });

  it('detects Apex line differences', () => {
    const handler = getHandler('ApexClass');
    const source = makeComponent('ApexClass', 'Test', 'line1\nline2\n');
    const target = makeComponent('ApexClass', 'Test', 'line1\nline2-changed\n');
    expect(handler.compare(source, target)).toEqual([
      { path: 'baseline line 2', baselineValue: 'line2' },
      { path: 'target line 2', targetValue: 'line2-changed' },
    ]);
  });

  it('reports an inserted Apex line once instead of shifting every following line', () => {
    const before = ['a', 'b', 'c', 'd', 'e'].join('\n');
    const after = ['a', 'new', 'b', 'c', 'd', 'e'].join('\n');
    expect(diffLines(before, after)).toEqual([{ path: 'target line 2', targetValue: 'new' }]);
  });

  it('summarizes Apex changes as added and removed lines', () => {
    const handler = getHandler('ApexClass');
    const changes = diffLines('a\nb', 'a\nc\nd');
    expect(handler.summarize?.(changes)).toBe('2 line(s) added, 1 line(s) removed');
  });
});
