import type { CliExecutor } from './cli.js';
import type { SfOrgDisplayFields } from './org-kind.js';

const ORGANIZATION_QUERY = 'SELECT Id, Name, OrganizationType, IsSandbox, TrialExpirationDate FROM Organization LIMIT 1';

const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

async function captureJson(cli: CliExecutor, args: string[], cwd: string): Promise<Record<string, unknown> | null> {
  try {
    const result = await cli.captureOutput('sf', args, { cwd, silent: true });
    if (result.exitCode !== 0) return null;
    const parsed: unknown = JSON.parse(result.stdout);
    return isObject(parsed) ? parsed : null;
  } catch {
    // Never surface this output: org display includes an access token.
    return null;
  }
}

function displayFields(envelope: Record<string, unknown> | null): SfOrgDisplayFields | null {
  if (!envelope || (envelope.status !== undefined && envelope.status !== 0)) return null;
  const data = envelope.result === undefined ? envelope : envelope.result;
  if (!isObject(data)) return null;

  const fields: SfOrgDisplayFields = {};
  for (const key of ['id', 'username', 'instanceUrl', 'devHubId', 'orgEdition', 'organizationName'] as const) {
    if (isNonEmptyString(data[key])) fields[key] = data[key];
  }
  for (const key of ['isScratchOrg', 'isSandbox'] as const) {
    if (typeof data[key] === 'boolean') fields[key] = data[key];
  }
  if (typeof data.apiVersion === 'string' && /^\d+\.0$/.test(data.apiVersion)) fields.apiVersion = data.apiVersion;
  if (!fields.orgEdition && isNonEmptyString(data.edition)) fields.orgEdition = data.edition;
  if (!fields.organizationName && isNonEmptyString(data.orgName)) fields.organizationName = data.orgName;
  return Object.keys(fields).length ? fields : null;
}

interface OrganizationRecord {
  Id: string;
  Name?: string;
  OrganizationType: string;
  IsSandbox: boolean;
  TrialExpirationDate: string | null;
}

function organizationRecord(envelope: Record<string, unknown> | null): OrganizationRecord | null {
  if (!envelope || envelope.status !== 0 || !isObject(envelope.result)) return null;
  const { done, totalSize, records } = envelope.result;
  if (done !== true || totalSize !== 1 || !Array.isArray(records) || records.length !== 1) return null;

  const record: unknown = records[0];
  if (!isObject(record)) return null;
  const validId = typeof record.Id === 'string' && /^[A-Za-z0-9]{15}(?:[A-Za-z0-9]{3})?$/.test(record.Id);
  const validExpiration = record.TrialExpirationDate === null
    || (typeof record.TrialExpirationDate === 'string' && Number.isFinite(Date.parse(record.TrialExpirationDate)));
  if (!validId || typeof record.IsSandbox !== 'boolean' || !isNonEmptyString(record.OrganizationType) || !validExpiration) {
    return null;
  }
  return record as unknown as OrganizationRecord;
}

export async function fetchOrgDisplay(cli: CliExecutor, alias: string, cwd: string): Promise<SfOrgDisplayFields | null> {
  const display = displayFields(await captureJson(cli, ['org', 'display', '--target-org', alias, '--json'], cwd));
  const record = organizationRecord(
    await captureJson(cli, ['data', 'query', '--query', ORGANIZATION_QUERY, '--target-org', alias, '--json'], cwd),
  );
  if (!record) return display;
  if (display?.id && display.id.slice(0, 15) !== record.Id.slice(0, 15)) return display;

  const enriched: SfOrgDisplayFields = {
    ...display,
    id: record.Id,
    isSandbox: record.IsSandbox,
    orgEdition: record.OrganizationType,
    trialExpirationDate: record.TrialExpirationDate,
  };
  // Cached scratch/hub hints can belong to an old alias; the query is authoritative.
  delete enriched.devHubId;
  delete enriched.isScratchOrg;
  delete enriched.organizationName;
  if (isNonEmptyString(record.Name)) enriched.organizationName = record.Name;
  return enriched;
}
