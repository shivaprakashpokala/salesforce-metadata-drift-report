import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { applyScope, createComparisonScope, standardObjectsWarning } from '../src/scope.js';
import { normalizeMetadataTree } from '../src/normalize.js';
import { diffMetadataTrees } from '../src/diff.js';
import type { ActionInputs } from '../src/types.js';

const temp: string[] = [];
afterEach(() => {
  for (const dir of temp.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

function folder(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-scope-'));
  temp.push(dir);
  for (const [file, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    fs.writeFileSync(path.join(dir, file), content);
  }
  return dir;
}

const inputs = (overrides: Partial<ActionInputs> = {}): ActionInputs => ({
  metadataTypes: ['CustomObject', 'Profile'],
  standardObjects: [],
  outputDir: 'out',
  workingDir: 'work',
  uploadArtifact: false,
  artifactName: 'report',
  jobSummary: false,
  ...overrides,
});

const xml = (type: string, body: string) => `<${type} xmlns="http://soap.sforce.com/2006/04/metadata">${body}</${type}>`;
const field = (name: string) => xml('CustomField', `<fullName>${name}</fullName><type>Text</type>`);

describe('comparison scope', () => {
  it('keeps custom objects, listed standard objects and their fields only', async () => {
    const dir = folder({
      'objects/Account/fields/A__c.field-meta.xml': field('A__c'),
      'objects/Contact/fields/B__c.field-meta.xml': field('B__c'),
      'objects/Example__c/fields/C__c.field-meta.xml': field('C__c'),
      'objects/Article__kav/fields/D__c.field-meta.xml': field('D__c'),
      'flows/NotRequested.flow-meta.xml': xml('Flow', '<status>Active</status>'),
    });
    const scope = createComparisonScope(inputs({ standardObjects: ['Account'] }), '64.0');
    const tree = applyScope(await normalizeMetadataTree(dir), scope);
    expect([...tree.components.keys()].sort()).toEqual([
      'CustomField:Account.A__c',
      'CustomField:Article__kav.D__c',
      'CustomField:Example__c.C__c',
    ]);
    expect(standardObjectsWarning(scope)).toBeUndefined();
  });

  it('warns when standard objects were left out', () => {
    expect(standardObjectsWarning(createComparisonScope(inputs(), '64.0'))).toContain('Standard objects');
    expect(standardObjectsWarning(createComparisonScope(inputs({ metadataTypes: ['ApexClass'] }), '64.0'))).toBeUndefined();
  });

  it('ignores standard-objects when CustomObject is not compared', () => {
    const scope = createComparisonScope(inputs({ metadataTypes: ['ApexClass'], standardObjects: ['Account'] }), '64.0');
    expect(scope.members).toEqual({ ApexClass: ['*'] });
  });

  it('uses package.xml members and version', async () => {
    const dir = folder({
      'package.xml': '<Package><types><members>Account.A__c</members><name>CustomField</name></types><version>65.0</version></Package>',
      'objects/Account/fields/A__c.field-meta.xml': field('A__c'),
      'objects/Account/fields/B__c.field-meta.xml': field('B__c'),
    });
    const scope = createComparisonScope(inputs({ packageXmlPath: path.join(dir, 'package.xml') }), '64.0');
    expect(scope.kind).toBe('manifest');
    expect(scope.apiVersion).toBe('65.0');
    expect(scope.manifestHash).toMatch(/^[a-f0-9]{64}$/);
    expect([...applyScope(await normalizeMetadataTree(dir), scope).components.keys()]).toEqual(['CustomField:Account.A__c']);
  });

  it('drops profile entries for objects outside the scope on both sides', async () => {
    const entry = (name: string) => `<fieldPermissions><field>${name}</field><readable>true</readable></fieldPermissions>`;
    const a = folder({ 'profiles/Test.profile-meta.xml': xml('Profile', entry('Account.A__c') + entry('Contact.B__c')) });
    const b = folder({ 'profiles/Test.profile-meta.xml': xml('Profile', entry('Account.A__c')) });
    const scope = createComparisonScope(inputs({ standardObjects: ['Account'] }), '64.0');
    const report = diffMetadataTrees(
      applyScope(await normalizeMetadataTree(a), scope),
      applyScope(await normalizeMetadataTree(b), scope),
      { scope },
    );
    expect(report.outcome).toBe('no-drift');
  });

  it('reports unidentified files as incomplete', async () => {
    const tree = await normalizeMetadataTree(folder({ 'future/New.future-meta.xml': '<Future><enabled>true</enabled></Future>' }));
    const report = diffMetadataTrees(tree, tree);
    expect(report.outcome).toBe('incomplete');
    expect(report.warnings.join(' ')).toContain('Could not identify the metadata type');
  });

  it('never reports an empty comparison as clean', () => {
    const tree = { rootPath: '/empty', components: new Map() };
    expect(diffMetadataTrees(tree, tree).outcome).toBe('incomplete');
  });
});
