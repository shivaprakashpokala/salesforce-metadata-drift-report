import { describe, it, expect } from 'vitest';
import {
  classifyOrgKind,
  orgSideFromDisplay,
  buildOrgWarnings,
  type SfOrgDisplayFields,
} from '../src/org-kind.js';

describe('classifyOrgKind', () => {
  it.each<[SfOrgDisplayFields, string]>([
    [{ isSandbox: true, trialExpirationDate: '2026-10-01T00:00:00.000+0000', orgEdition: 'Enterprise Edition' }, 'scratch'],
    [{ isSandbox: true, trialExpirationDate: null, orgEdition: 'Enterprise Edition' }, 'sandbox'],
    [{ isSandbox: false, trialExpirationDate: null, orgEdition: 'Developer Edition' }, 'developer'],
    [{ isSandbox: false, trialExpirationDate: null, orgEdition: 'Enterprise Edition' }, 'production'],
    [{ isSandbox: false, trialExpirationDate: null, orgEdition: 'Unlimited Edition' }, 'production'],
    [{ isSandbox: false, trialExpirationDate: '2026-10-01T00:00:00.000+0000', orgEdition: 'Enterprise Edition' }, 'unknown'],
    [{ isSandbox: false, trialExpirationDate: null, orgEdition: 'Future Edition' }, 'unknown'],
  ])('classifies verified Organization fields %j as %s', (fields, kind) => {
    expect(classifyOrgKind(fields)).toBe(kind);
  });

  it('prefers verified fields over cached hints and hostnames', () => {
    expect(classifyOrgKind({
      isSandbox: false, trialExpirationDate: null, orgEdition: 'Enterprise Edition',
      isScratchOrg: true, devHubId: '00D000000000001',
      instanceUrl: 'https://old.sandbox.my.salesforce.com',
    })).toBe('production');
  });

  it.each<[SfOrgDisplayFields, string]>([
    [{ isScratchOrg: true }, 'scratch'],
    [{ devHubId: '00D000000000001' }, 'scratch'],
    [{ isScratchOrg: false, isSandbox: true }, 'sandbox'],
    [{ instanceUrl: 'https://myorg--sandbox.sandbox.my.salesforce.com', orgEdition: 'Enterprise Edition' }, 'sandbox'],
    [{ instanceUrl: 'https://myorg.scratch.my.salesforce.com' }, 'scratch'],
    [{ instanceUrl: 'https://myorg.develop.my.salesforce.com' }, 'developer'],
    [{ instanceUrl: 'https://myorg--dev.my.salesforce.com' }, 'unknown'],
    [{ instanceUrl: 'https://myorg.sandbox.my.salesforce.com.example.com' }, 'unknown'],
    [{ instanceUrl: 'https://myorg.sandbox.example.com' }, 'unknown'],
    [{ instanceUrl: 'not-a-url.sandbox.my.salesforce.com' }, 'unknown'],
    [{ orgEdition: 'Enterprise Edition' }, 'unknown'],
    [{ orgEdition: 'Developer Edition' }, 'unknown'],
    [{ isSandbox: true }, 'unknown'],
  ])('uses only positive fallback evidence %j as %s', (fields, kind) => {
    expect(classifyOrgKind(fields)).toBe(kind);
  });

  it('returns unknown when signals are insufficient', () => {
    expect(classifyOrgKind({})).toBe('unknown');
  });
});

describe('orgSideFromDisplay', () => {
  it('maps sf org display fields to OrgSideInfo', () => {
    const side = orgSideFromDisplay(
      {
        id: '00Dxx0000000001',
        username: 'admin@example.com',
        instanceUrl: 'https://na1.salesforce.com',
        isScratchOrg: false,
        isSandbox: false,
        trialExpirationDate: null,
        orgEdition: 'Enterprise Edition',
        organizationName: 'Acme Prod',
      },
      'fallback',
    );

    expect(side.orgKind).toBe('production');
    expect(side.label).toBe('Acme Prod');
    expect(side.username).toBe('admin@example.com');
    expect(side.orgId).toBe('00Dxx0000000001');
    expect(side.instanceHost).toBe('na1.salesforce.com');
  });

  it('uses user label when provided', () => {
    const side = orgSideFromDisplay(
      { orgEdition: 'Developer Edition', isSandbox: false, trialExpirationDate: null },
      'fallback',
      'My Dev Org',
    );
    expect(side.label).toBe('My Dev Org');
    expect(side.orgKind).toBe('developer');
  });

  it('returns unknown kind when display is unavailable', () => {
    const side = orgSideFromDisplay(null, 'baseline org (retrieved)');
    expect(side.orgKind).toBe('unknown');
    expect(side.label).toBe('baseline org (retrieved)');
  });
});

describe('buildOrgWarnings', () => {
  it('does not warn about production against a sandbox', () => {
    expect(buildOrgWarnings(
      { label: 'Production', orgKind: 'production', orgId: '00D000000000001AAA' },
      { label: 'QA', orgKind: 'sandbox', orgId: '00D000000000002AAA' },
    )).toEqual([]);
  });

  it('warns when both sides are the same org', () => {
    const warnings = buildOrgWarnings(
      { label: 'A', orgKind: 'sandbox', orgId: '00D000000000001AAA' },
      { label: 'B', orgKind: 'sandbox', orgId: '00D000000000001' },
    );
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('same org');
  });

  it('names the side whose org type is unknown', () => {
    const warnings = buildOrgWarnings({ label: 'A', orgKind: 'production' }, { label: 'B', orgKind: 'unknown' });
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('of the target org');
  });
});
