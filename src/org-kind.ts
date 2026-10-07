export type OrgKind = 'scratch' | 'sandbox' | 'developer' | 'production' | 'unknown';

export interface OrgSideInfo {
  label: string;
  orgKind: OrgKind;
  username?: string;
  orgId?: string;
  instanceHost?: string;
}

export interface SfOrgDisplayFields {
  id?: string;
  username?: string;
  instanceUrl?: string;
  apiVersion?: string;
  isScratchOrg?: boolean;
  devHubId?: string;
  isSandbox?: boolean;
  trialExpirationDate?: string | null;
  orgEdition?: string;
  organizationName?: string;
}

const COMMERCIAL_EDITIONS = ['enterprise', 'unlimited', 'professional', 'performance', 'group', 'contact manager'];

export function classifyOrgKind(fields: SfOrgDisplayFields): OrgKind {
  // Values from the Organization record win over cached CLI hints. A sandbox
  // with a trial expiration date is a scratch org.
  if (typeof fields.isSandbox === 'boolean' && fields.trialExpirationDate !== undefined) {
    if (fields.isSandbox) {
      return fields.trialExpirationDate ? 'scratch' : 'sandbox';
    }
    const edition = (fields.orgEdition ?? '').toLowerCase();
    if (edition === 'developer edition' || edition === 'developer') {
      return 'developer';
    }
    const commercial = COMMERCIAL_EDITIONS.some((name) => edition === name || edition === `${name} edition`);
    if (fields.trialExpirationDate === null && commercial) {
      return 'production';
    }
    return 'unknown';
  }

  if (fields.isScratchOrg === true || fields.devHubId) {
    return 'scratch';
  }
  if (fields.isSandbox === true && fields.isScratchOrg === false) {
    return 'sandbox';
  }

  const host = fields.instanceUrl ? safeHost(fields.instanceUrl) : '';
  if (host.endsWith('.sandbox.my.salesforce.com')) return 'sandbox';
  if (host.endsWith('.scratch.my.salesforce.com')) return 'scratch';
  if (host.endsWith('.develop.my.salesforce.com')) return 'developer';
  return 'unknown';
}

function safeHost(instanceUrl: string): string {
  try {
    return new URL(instanceUrl).hostname.toLowerCase();
  } catch {
    return '';
  }
}

export function orgSideFromDisplay(
  display: SfOrgDisplayFields | null,
  fallbackLabel: string,
  userLabel?: string,
): OrgSideInfo {
  if (!display) {
    return { label: userLabel ?? fallbackLabel, orgKind: 'unknown' };
  }
  return {
    label: userLabel ?? display.organizationName ?? display.username ?? fallbackLabel,
    orgKind: classifyOrgKind(display),
    username: display.username,
    orgId: display.id,
    instanceHost: display.instanceUrl ? safeHost(display.instanceUrl) : undefined,
  };
}

export function buildOrgWarnings(baseline: OrgSideInfo, target: OrgSideInfo): string[] {
  const warnings: string[] = [];

  if (baseline.orgId && target.orgId && baseline.orgId.slice(0, 15) === target.orgId.slice(0, 15)) {
    warnings.push(
      'Baseline and target are the same org (same Org ID). Check that baseline-auth-url and ' +
        'target-auth-url point to different orgs.',
    );
  }

  const unknown = [
    baseline.orgKind === 'unknown' ? 'baseline' : '',
    target.orgKind === 'unknown' ? 'target' : '',
  ].filter(Boolean);
  if (unknown.length) {
    warnings.push(
      `Could not determine the org type of the ${unknown.join(' and ')} org. ` +
        'This does not affect the comparison; the integration user may lack read access to the Organization object.',
    );
  }

  return warnings;
}
