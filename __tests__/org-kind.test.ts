import { describe, it, expect } from 'vitest';
import {
  classifyOrgKind,
  orgSideFromDisplay,
  buildOrgWarnings,
  distinguishLabels,
  instanceName,
  sameOrgError,
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
    // na1.salesforce.com has no My Domain, so the company name is used.
    expect(side.label).toBe('Acme Prod');
    expect(side.organizationName).toBe('Acme Prod');
    expect(side.username).toBe('admin@example.com');
    expect(side.orgId).toBe('00Dxx0000000001');
    expect(side.instanceHost).toBe('na1.salesforce.com');
  });

  it('names the org after its My Domain instance', () => {
    const side = orgSideFromDisplay(
      { instanceUrl: 'https://acme--uat.sandbox.my.salesforce.com', organizationName: 'Acme', isSandbox: true, trialExpirationDate: null },
      'fallback',
    );
    expect(side.label).toBe('acme--uat');
    expect(side.organizationName).toBe('Acme');
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

describe('instanceName', () => {
  it.each([
    ['acme.my.salesforce.com', 'acme'],
    ['acme--uat.sandbox.my.salesforce.com', 'acme--uat'],
    ['saas-customer-1226-dev-ed.scratch.my.salesforce.com', 'saas-customer-1226-dev-ed'],
    ['agency.my.salesforce.mil', 'agency'],
    ['na1.salesforce.com', undefined],
    [undefined, undefined],
  ])('%s → %s', (host, name) => {
    expect(instanceName(host)).toBe(name);
  });
});

describe('sameOrgError', () => {
  it('stops when both sides are the same org, matching 15 and 18 character IDs', () => {
    const message = sameOrgError(
      { label: 'A', orgKind: 'sandbox', orgId: '00D000000000001AAA', username: 'ci@acme.com.uat' },
      { label: 'B', orgKind: 'sandbox', orgId: '00D000000000001', username: 'admin@acme.com.uat' },
    );
    expect(message).toContain('log in to the same org (Org ID 00D000000000001AAA, users ci@acme.com.uat and admin@acme.com.uat)');
  });

  it('allows different orgs', () => {
    expect(sameOrgError(
      { label: 'A', orgKind: 'sandbox', orgId: '00D000000000001AAA' },
      { label: 'B', orgKind: 'sandbox', orgId: '00D000000000002AAA' },
    )).toBeUndefined();
  });
});

describe('distinguishLabels', () => {
  it('adds the sandbox name when two sandboxes share the company name', () => {
    const baseline = { label: 'Acme', orgKind: 'sandbox' as const, instanceHost: 'acme--uat.sandbox.my.salesforce.com' };
    const target = { label: 'Acme', orgKind: 'sandbox' as const, instanceHost: 'acme--qa.sandbox.my.salesforce.com' };
    distinguishLabels(baseline, target);
    expect([baseline.label, target.label]).toEqual(['Acme (uat)', 'Acme (qa)']);
  });

  it('uses the org type for production against a sandbox and keeps labels the user set', () => {
    const baseline = { label: 'Acme', orgKind: 'production' as const, instanceHost: 'acme.my.salesforce.com' };
    const target = { label: 'Acme', orgKind: 'sandbox' as const, instanceHost: 'acme--uat.sandbox.my.salesforce.com' };
    distinguishLabels(baseline, target, { baseline: 'Acme' });
    expect([baseline.label, target.label]).toEqual(['Acme', 'Acme (uat)']);
  });

  it('falls back to baseline and target when nothing else tells them apart', () => {
    const baseline = { label: 'Acme', orgKind: 'unknown' as const };
    const target = { label: 'Acme', orgKind: 'unknown' as const };
    distinguishLabels(baseline, target);
    expect([baseline.label, target.label]).toEqual(['Acme (baseline)', 'Acme (target)']);
  });

  it('leaves different labels alone', () => {
    const baseline = { label: 'Production', orgKind: 'production' as const };
    const target = { label: 'QA', orgKind: 'sandbox' as const };
    distinguishLabels(baseline, target);
    expect([baseline.label, target.label]).toEqual(['Production', 'QA']);
  });
});

describe('buildOrgWarnings', () => {
  it('does not warn about production against a sandbox', () => {
    expect(buildOrgWarnings(
      { label: 'Production', orgKind: 'production', orgId: '00D000000000001AAA' },
      { label: 'QA', orgKind: 'sandbox', orgId: '00D000000000002AAA' },
    )).toEqual([]);
  });

  it('does not warn about two sandboxes of the same production org', () => {
    expect(buildOrgWarnings(
      { label: 'Acme', orgKind: 'sandbox', orgId: '00D000000000001AAA' },
      { label: 'Acme', orgKind: 'sandbox', orgId: '00D000000000002AAA' },
    )).toEqual([]);
  });

  it('warns when a sandbox is the baseline for production', () => {
    const warnings = buildOrgWarnings({ label: 'QA', orgKind: 'sandbox' }, { label: 'Production', orgKind: 'production' });
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('swap baseline-auth-url and target-auth-url');
  });

  describe('orgs from different production orgs', () => {
    const org = (orgKind: 'production' | 'sandbox' | 'scratch' | 'developer', instanceHost: string) =>
      ({ label: instanceHost, orgKind, instanceHost });

    it('does not warn for production and its own sandbox, or two sandboxes of it', () => {
      expect(buildOrgWarnings(org('production', 'acme.my.salesforce.com'), org('sandbox', 'acme--uat.sandbox.my.salesforce.com'))).toEqual([]);
      expect(buildOrgWarnings(org('sandbox', 'ACME--qa.sandbox.my.salesforce.com'), org('sandbox', 'acme--uat.sandbox.my.salesforce.com'))).toEqual([]);
    });

    it('warns when the orgs belong to different production orgs', () => {
      const warnings = buildOrgWarnings(org('production', 'acme.my.salesforce.com'), org('sandbox', 'globex--uat.sandbox.my.salesforce.com'));
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('Baseline acme and target globex--uat belong to different production orgs (acme and globex)');
    });

    it('does not warn for scratch or Developer Edition orgs', () => {
      expect(buildOrgWarnings(org('scratch', 'one-dev-ed.scratch.my.salesforce.com'), org('scratch', 'two-dev-ed.scratch.my.salesforce.com'))).toEqual([]);
      expect(buildOrgWarnings(org('production', 'acme.my.salesforce.com'), org('developer', 'mine-dev-ed.develop.my.salesforce.com'))).toEqual([]);
    });

    it('does not warn when an org has no My Domain', () => {
      expect(buildOrgWarnings(org('production', 'na1.salesforce.com'), org('sandbox', 'globex--uat.sandbox.my.salesforce.com'))).toEqual([]);
    });
  });

  it('names the side whose org type is unknown', () => {
    const warnings = buildOrgWarnings({ label: 'A', orgKind: 'production' }, { label: 'B', orgKind: 'unknown' });
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('of the target org');
  });
});
