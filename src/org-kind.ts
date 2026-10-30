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

/** An error message when both inputs log in to the same org, which can never show drift. */
export function sameOrgError(baseline: OrgSideInfo, target: OrgSideInfo): string | undefined {
  if (!baseline.orgId || !target.orgId || baseline.orgId.slice(0, 15) !== target.orgId.slice(0, 15)) return undefined;
  return `baseline-auth-url and target-auth-url log in to the same org (Org ID ${baseline.orgId}, ` +
    `users ${baseline.username ?? 'unknown'} and ${target.username ?? 'unknown'}). Comparing an org with itself ` +
    'can never show drift. Point each input at a different org, for example production and a sandbox.';
}

/** "acme--uat.sandbox.my.salesforce.com" → "uat". */
export function sandboxName(host?: string): string | undefined {
  return /^[^.]+--([^.]+)\.sandbox\.my\.salesforce\.com$/.exec(host ?? '')?.[1];
}

/**
 * Sandboxes copy the production company name, so two sandboxes of one org
 * would both be called "Acme". Add the sandbox name (or org type) to tell them apart.
 */
export function distinguishLabels(
  baseline: OrgSideInfo,
  target: OrgSideInfo,
  userLabels: { baseline?: string; target?: string } = {},
): void {
  if (baseline.label !== target.label) return;
  const sides = [[baseline, userLabels.baseline], [target, userLabels.target]] as const;
  for (const [side, userLabel] of sides) {
    if (userLabel) continue;
    const detail = sandboxName(side.instanceHost) ?? (side.orgKind !== 'unknown' ? side.orgKind : side.username);
    if (detail) side.label = `${side.label} (${detail})`;
  }
  if (baseline.label === target.label) {
    if (!userLabels.baseline) baseline.label = `${baseline.label} (baseline)`;
    if (!userLabels.target) target.label = `${target.label} (target)`;
  }
}

export function buildOrgWarnings(baseline: OrgSideInfo, target: OrgSideInfo): string[] {
  const warnings: string[] = [];

  const nonProduction: OrgKind[] = ['sandbox', 'scratch', 'developer'];
  if (target.orgKind === 'production' && nonProduction.includes(baseline.orgKind)) {
    warnings.push(
      `The baseline is a ${baseline.orgKind} org and the target is production. The baseline is treated as the ` +
        'source of truth, so "Only in target" and "Missing from target" read the other way round from what you may ' +
        'expect. If production should be the reference, swap baseline-auth-url and target-auth-url.',
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
