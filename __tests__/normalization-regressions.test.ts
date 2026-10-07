import { describe, it, expect, afterAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { normalizeMetadataTree } from '../src/normalize.js';
import { diffMetadataTrees } from '../src/diff.js';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-review-cases-'));
const xml = (tag: string, body: string) => `<${tag} xmlns="http://soap.sforce.com/2006/04/metadata">${body}</${tag}>`;
function dir(name: string, files: Record<string, string>) {
  const root = path.join(tmp, name);
  fs.mkdirSync(root, { recursive: true });
  for (const [rel, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), content);
  }
  return root;
}
async function compare(name: string, a: Record<string, string>, b: Record<string, string>) {
  return diffMetadataTrees(await normalizeMetadataTree(dir(name+'-a',a)), await normalizeMetadataTree(dir(name+'-b',b)));
}
afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));

describe('metadata comparison regressions', () => {
  it('rejects malformed metadata instead of reporting a clean comparison', async () => {
    await expect(normalizeMetadataTree(dir('malformed', {
      'profiles/Test.profile-meta.xml': '<Profile><label>Test</Profile>',
    }))).rejects.toThrow('Invalid metadata XML');
  });
  it('compares embedded MDAPI fields with decomposed source fields', async () => {
    const field = '<fullName>Test__c</fullName><type>Text</type><length>30</length>';
    const report = await compare('embedded', {
      'objects/Example__c.object': xml('CustomObject', '<label>Example</label><fields>' + field + '</fields>'),
    }, {
      'objects/Example__c/Example__c.object-meta.xml': xml('CustomObject', '<label>Example</label>'),
      'objects/Example__c/fields/Test__c.field-meta.xml': xml('CustomField', field),
    });
    expect(report.summary.hasDrift).toBe(false);
    expect(report.summary.unchanged, JSON.stringify(report.components)).toBe(2);
  });
  it('hashes static resource payloads byte for byte', async () => {
    const metadata = xml('StaticResource', '<contentType>application/octet-stream</contentType><cacheControl>Public</cacheControl>');
    const report = await compare('resource', {
      'staticresources/Test.resource': 'one\r\ntwo', 'staticresources/Test.resource-meta.xml': metadata,
    }, {
      'staticresources/Test.resource': 'one\ntwo', 'staticresources/Test.resource-meta.xml': metadata,
    });
    expect(report.summary.changed).toBe(1);
  });
  it('detects removal of an HTML file inside a Lightning bundle', async () => {
    const common = { 'lwc/sample/sample.js': 'export default class Sample {}',
      'lwc/sample/sample.js-meta.xml': xml('LightningComponentBundle', '<apiVersion>62.0</apiVersion>') };
    const report = await compare('bundle-file', { ...common, 'lwc/sample/sample.html': '<template>Hello</template>' }, common);
    expect(report.summary.changed).toBe(1);
    expect(report.summary.removed).toBe(0);
  });
  it('detects reordered layout fields where order changes the UI', async () => {
    const item = (field: string) => `<layoutItems><behavior>Edit</behavior><field>${field}</field></layoutItems>`;
    const layout = (a: string, b: string) => xml('Layout', `<layoutSections><label>Information</label><style>TwoColumnsTopToBottom</style><layoutColumns>${item(a)}${item(b)}</layoutColumns></layoutSections>`);
    const report = await compare('layout-order', {'layouts/Account-Test.layout-meta.xml': layout('Name','Phone')}, {'layouts/Account-Test.layout-meta.xml': layout('Phone','Name')});
    expect(report.summary.hasDrift).toBe(true);
  });
  it('detects an ApexTrigger status-only change', async () => {
    const a = { 'triggers/Test.trigger': 'trigger Test on Account (before insert) {}', 'triggers/Test.trigger-meta.xml': xml('ApexTrigger', '<apiVersion>62.0</apiVersion><status>Active</status>') };
    const b = { ...a, 'triggers/Test.trigger-meta.xml': xml('ApexTrigger', '<apiVersion>62.0</apiVersion><status>Inactive</status>') };
    const report = await compare('trigger', a, b);
    expect(report.summary.hasDrift).toBe(true);
  });
  it('detects a JavaScript-only Lightning bundle change', async () => {
    const a = { 'lwc/sample/sample.js-meta.xml': xml('LightningComponentBundle', '<apiVersion>62.0</apiVersion><isExposed>true</isExposed>'), 'lwc/sample/sample.js': 'export default class Sample { value = 1; }' };
    const b = { ...a, 'lwc/sample/sample.js': 'export default class Sample { value = 2; }' };
    const report = await compare('lwc', a, b);
    expect(report.summary.hasDrift).toBe(true);
  });
  it('keeps same-named object validation rules distinct', async () => {
    const files = {'objects/Account/validationRules/RequiredName.validationRule-meta.xml': xml('ValidationRule','<active>true</active>'), 'objects/Contact/validationRules/RequiredName.validationRule-meta.xml': xml('ValidationRule','<active>true</active>')};
    const tree = await normalizeMetadataTree(dir('rules', files));
    expect(tree.components.size).toBe(2);
  });
  it('does not re-index a child field as Unknown', async () => {
    const tree = await normalizeMetadataTree(dir('fields', {'objects/Account/Account.object-meta.xml': xml('CustomObject','<label>Account</label>'), 'objects/Account/fields/Test__c.field-meta.xml': xml('CustomField','<fullName>Test__c</fullName><type>Text</type><length>30</length>')}));
    expect([...tree.components.keys()].some(k => k.startsWith('Unknown:'))).toBe(false);
  });
  it('compares equivalent classic and source objects under the same identity', async () => {
    const obj = xml('CustomObject','<label>Example</label><pluralLabel>Examples</pluralLabel>');
    const report = await compare('classic', {'objects/Example__c/Example__c.object-meta.xml': obj}, {'objects/Example__c.object': obj});
    expect(report.summary.hasDrift).toBe(false);
  });
  it('ignores XML indentation-only changes', async () => {
    const report = await compare('whitespace', {'permissionsets/Test.permissionset-meta.xml': xml('PermissionSet','<label>Test</label>')}, {'permissionsets/Test.permissionset-meta.xml': xml('PermissionSet','\n  <label>Test</label>\n')});
    expect(report.summary.hasDrift).toBe(false);
  });
  it('does not equate reordered permission entries with changed permissions', async () => {
    const first = '<fieldPermissions><field>Account.A__c</field><readable>true</readable></fieldPermissions>';
    const second = '<fieldPermissions><field>Account.B__c</field><readable>false</readable></fieldPermissions>';
    const report = await compare('order', {'profiles/Test.profile-meta.xml': xml('Profile',first+second)}, {'profiles/Test.profile-meta.xml': xml('Profile',second+first)});
    expect(report.summary.hasDrift).toBe(false);
  });
});
