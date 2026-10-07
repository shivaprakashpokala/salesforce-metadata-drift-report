import { describe, it, expect, vi } from 'vitest';
import { getHandler } from '../src/handlers/index.js';
import { apexClassHandler } from '../src/handlers/apex.js';
import { hashContent } from '../src/utils/hash.js';
import { renderMarkdownReport } from '../src/report/markdown.js';
import { diffMetadataTrees } from '../src/diff.js';
import { writeJobSummary } from '../src/report/summary.js';
import type { NormalizedComponent } from '../src/types.js';

const capture = vi.hoisted(() => ({body: ''}));
vi.mock('@actions/core', () => ({summary: {addRaw(body: string) { capture.body = body; return {write: async () => {}}; }}}));

const comp = (metadataType: string, content: string): NormalizedComponent => ({
  metadataType, fullName: 'Example', relativePath: 'Example.xml', absolutePath: '/tmp/Example.xml', content, contentHash: hashContent(content),
});
const profile = (readable: boolean, mondayEnd: number) => `<Profile><fieldPermissions><editable>true</editable><field>Account.Secret__c</field><readable>${readable}</readable></fieldPermissions><loginHours><mondayEnd>${mondayEnd}</mondayEnd><mondayStart>0</mondayStart></loginHours></Profile>`;

describe('complete and safe reports', () => {
  it('does not omit login-hour changes when field permissions also change', () => {
    const changes = getHandler('Profile').compare(comp('Profile', profile(true, 1440)), comp('Profile', profile(false, 600)));
    expect(changes.some(c => c.path.includes('loginHours'))).toBe(true);
  });

  it('retains the metadata identity for permission changes', () => {
    const changes = getHandler('Profile').compare(comp('Profile', profile(true, 1440)), comp('Profile', profile(false, 1440)));
    expect(JSON.stringify(changes)).toContain('Account.Secret__c');
  });

  it('preserves all Apex differences for the JSON artifact', () => {
    const changes = apexClassHandler.compare(comp('ApexClass', Array.from({length: 12}, (_, i) => `old${i}`).join('\n')), comp('ApexClass', Array.from({length: 12}, (_, i) => `new${i}`).join('\n')));
    expect(changes.some(c => c.path === 'target line 12' && c.targetValue === 'new11')).toBe(true);
  });

  it('shows Apex changes in a diff block so generics stay readable', () => {
    const baseline = comp('ApexClass', 'List<Account> accounts;');
    const target = comp('ApexClass', 'List<Contact> accounts;');
    const report = diffMetadataTrees({rootPath: '/tmp/b', components: new Map([['ApexClass:Example', baseline]])}, {rootPath: '/tmp/t', components: new Map([['ApexClass:Example', target]])});
    const md = renderMarkdownReport(report);
    expect(md).toContain('- List<Account> accounts;');
    expect(md).toContain('+ List<Contact> accounts;');
  });

  it('keeps a multibyte summary inside the GitHub 1MiB byte cap', async () => {
    await writeJobSummary('漢'.repeat(400_000), {GITHUB_STEP_SUMMARY: '/tmp/summary'});
    expect(Buffer.byteLength(capture.body, 'utf8')).toBeLessThanOrEqual(1_048_576);
  });
});
