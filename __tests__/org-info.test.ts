import { describe, expect, it, vi } from 'vitest';
import type { CliCaptureResult, CliExecutor } from '../src/cli.js';
import { fetchOrgDisplay } from '../src/org-info.js';
import { classifyOrgKind } from '../src/org-kind.js';

const id = '00D000000000001';
const display = { id, username: 'user@example.com', instanceUrl: 'https://example.my.salesforce.com',
  accessToken: 'secret-access-token', sfdxAuthUrl: 'force://secret-auth-url', connectedStatus: 'Connected' };
const organization = { Id: id + 'AAA', Name: 'Example org', OrganizationType: 'Developer Edition', IsSandbox: false, TrialExpirationDate: null };
const json = (value: unknown): CliCaptureResult => ({ exitCode: 0, stdout: JSON.stringify(value), stderr: '' });
const queried = (record: Record<string, unknown> = organization) => json({ status: 0, result: { done: true, totalSize: 1, records: [record] } });
const unavailable = { exitCode: 1, stdout: 'secret-access-token', stderr: 'secret-auth-url' };

function executor(displayResult: CliCaptureResult | Error = json({ status: 0, result: display }), queryResult: CliCaptureResult | Error = queried()) {
  const captureOutput = vi.fn<NonNullable<CliExecutor['captureOutput']>>(async (_command, args) => {
    const result = args[0] === 'org' ? displayResult : queryResult;
    if (result instanceof Error) throw result;
    return result;
  });
  return { exec: vi.fn(async () => 0), captureOutput };
}

describe('fetchOrgDisplay', () => {
  it('enriches real CLI display output that has no org-kind fields', async () => {
    const cli = executor();
    const result = await fetchOrgDisplay(cli, 'temporary-alias', '/work/project');
    expect(result).toEqual({ id: id + 'AAA', username: display.username, instanceUrl: display.instanceUrl,
      isSandbox: false, trialExpirationDate: null, orgEdition: 'Developer Edition', organizationName: 'Example org' });
    expect(cli.captureOutput).toHaveBeenNthCalledWith(1, 'sf', ['org', 'display', '--target-org', 'temporary-alias', '--json'], { cwd: '/work/project', silent: true });
    expect(cli.captureOutput).toHaveBeenNthCalledWith(2, 'sf', ['data', 'query', '--query',
      'SELECT Id, Name, OrganizationType, IsSandbox, TrialExpirationDate FROM Organization LIMIT 1',
      '--target-org', 'temporary-alias', '--json'], { cwd: '/work/project', silent: true });
    expect(JSON.stringify(result)).not.toMatch(/secret|accessToken|sfdxAuthUrl|connectedStatus/);
  });

  it.each([
    ['developer', false, 'Developer Edition', null],
    ['production', false, 'Enterprise Edition', null],
    ['sandbox', true, 'Enterprise Edition', null],
    ['scratch', true, 'Developer Edition', '2026-10-31T00:00:00.000+0000'],
  ])('provides authoritative %s classification', async (kind, IsSandbox, OrganizationType, TrialExpirationDate) => {
    const result = await fetchOrgDisplay(executor(json({ status: 0, result: { ...display, devHubId: 'stale-hub', isScratchOrg: true,
      isSandbox: false, orgEdition: 'Stale edition', organizationName: 'Stale name' } }),
    queried({ ...organization, IsSandbox, OrganizationType, TrialExpirationDate })), 'org', '/work');
    expect(result).not.toHaveProperty('devHubId');
    expect(result).not.toHaveProperty('isScratchOrg');
    expect(result?.organizationName).toBe('Example org');
    expect(classifyOrgKind(result!)).toBe(kind);
  });

  it('retains only allowlisted display fields when the Organization query is denied', async () => {
    const result = await fetchOrgDisplay(executor(json({ result: { ...display, devHubId: 'hub', isScratchOrg: true,
      isSandbox: false, edition: 'Developer Edition', orgName: 'Cached name' } }), unavailable), 'org', '/work');
    expect(result).toEqual({ id, username: display.username, instanceUrl: display.instanceUrl, devHubId: 'hub',
      isScratchOrg: true, isSandbox: false, orgEdition: 'Developer Edition', organizationName: 'Cached name' });
  });

  it.each([unavailable, new Error('secret-access-token'), json(null), json([]), json({ result: [] }),
    json({ status: 1, result: display }), { exitCode: 0, stdout: 'invalid secret-access-token', stderr: '' }])(
    'recovers org identity when display is unavailable or malformed (%#)', async (response) => {
      const result = await fetchOrgDisplay(executor(response), 'org', '/work');
      expect(result).toEqual({ id: id + 'AAA', isSandbox: false, trialExpirationDate: null,
        orgEdition: 'Developer Edition', organizationName: 'Example org' });
    });

  it.each([unavailable, new Error('secret-access-token'), json(null), json([]), json({ status: 1 }),
    json({ result: { done: true, totalSize: 1, records: [organization] } }),
    json({ status: 0, result: { done: false, totalSize: 1, records: [organization] } }),
    json({ status: 0, result: { done: true, totalSize: 2, records: [organization] } }),
    json({ status: 0, result: { done: true, totalSize: 1, records: [organization, organization] } }),
    json({ status: 0, result: { done: true, totalSize: 1, records: [null] } }),
    { exitCode: 0, stdout: 'invalid secret-access-token', stderr: '' }])(
    'preserves display when query fails or has an invalid envelope (%#)', async (response) => {
      const result = await fetchOrgDisplay(executor(undefined, response), 'org', '/work');
      expect(result).toEqual({ id, username: display.username, instanceUrl: display.instanceUrl });
    });

  it.each([
    { Id: 'invalid' }, { Id: 123 }, { IsSandbox: 'false' }, { IsSandbox: undefined },
    { OrganizationType: '' }, { OrganizationType: ' ' }, { OrganizationType: 123 },
    { TrialExpirationDate: undefined }, { TrialExpirationDate: '' }, { TrialExpirationDate: ' ' },
    { TrialExpirationDate: 'invalid-date' }, { TrialExpirationDate: 123 },
  ])('rejects malformed required Organization fields (%#)', async (invalid) => {
    const result = await fetchOrgDisplay(executor(undefined, queried({ ...organization, ...invalid })), 'org', '/work');
    expect(result).toEqual({ id, username: display.username, instanceUrl: display.instanceUrl });
  });

  it.each([[id, id + 'AAA'], [id + 'AAA', id], [id + 'AAA', id + 'AAB']])(
    'matches Organization IDs by their case-sensitive first 15 characters', async (displayId, queryId) => {
      const result = await fetchOrgDisplay(executor(json({ result: { id: displayId } }), queried({ ...organization, Id: queryId })), 'org', '/work');
      expect(result?.id).toBe(queryId);
      expect(result?.orgEdition).toBe('Developer Edition');
    });

  it.each(['00D000000000002AAA', '00d000000000001AAA'])(
    'ignores Organization enrichment for a different org ID %s', async (queryId) => {
      const result = await fetchOrgDisplay(executor(undefined, queried({ ...organization, Id: queryId })), 'org', '/work');
      expect(result).toEqual({ id, username: display.username, instanceUrl: display.instanceUrl });
    });

  it('treats both command exceptions as nonfatal and never logs raw diagnostics', async () => {
    const log = vi.spyOn(console, 'log');
    const error = vi.spyOn(console, 'error');
    try {
      expect(await fetchOrgDisplay(executor(new Error('secret-access-token'), new Error('secret-auth-url')), 'org', '/work')).toBeNull();
      expect(log).not.toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
    } finally {
      log.mockRestore();
      error.mockRestore();
    }
  });

  it('returns null when the executor cannot capture output', async () => {
    const cli = { exec: vi.fn(async () => 0) };
    expect(await fetchOrgDisplay(cli, 'org', '/work')).toBeNull();
    expect(cli.exec).not.toHaveBeenCalled();
  });
});
