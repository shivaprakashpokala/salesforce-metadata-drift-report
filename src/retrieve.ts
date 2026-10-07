import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { CliExecutor } from './cli.js';
import { createDefaultCliExecutor } from './cli.js';
import { fetchOrgDisplay } from './org-info.js';
import { orgSideFromDisplay, type OrgSideInfo, type SfOrgDisplayFields } from './org-kind.js';
import { formatCommandError, redactAuthUrls } from './redact.js';

export type RetrieveSide = 'baseline' | 'target';

/** Used only when neither org reports its API version. */
export const FALLBACK_API_VERSION = '64.0';
const RETRIEVE_WAIT_MINUTES = '33';

/**
 * Types this action can request with `<members>*</members>`. CustomField is
 * left out because fields come back with CustomObject.
 */
export const WILDCARD_METADATA_TYPES = new Set([
  'ApexClass',
  'ApexComponent',
  'ApexPage',
  'ApexTrigger',
  'AuraDefinitionBundle',
  'CustomApplication',
  'CustomLabel',
  'CustomMetadata',
  'CustomObject',
  'CustomPermission',
  'CustomTab',
  'FlexiPage',
  'Flow',
  'GlobalValueSet',
  'Layout',
  'LightningComponentBundle',
  'NamedCredential',
  'PermissionSet',
  'PermissionSetGroup',
  'Profile',
  'QuickAction',
  'RemoteSiteSetting',
  'StaticResource',
  'Workflow',
]);

const TYPE_HINTS: Record<string, string> = {
  CustomField: 'Custom fields are retrieved with CustomObject; remove CustomField from metadata-types.',
  CustomLabels: 'Use CustomLabel (singular) to retrieve all custom labels.',
};

export interface RetrieveDeps {
  cli?: CliExecutor;
}

export interface RetrieveRequest {
  baselineAuthUrl: string;
  targetAuthUrl: string;
  baselineLabel?: string;
  targetLabel?: string;
  metadataTypes: string[];
  standardObjects: string[];
  /** Empty means the lower of the two orgs' latest API versions. */
  apiVersion?: string;
  packageXmlPath?: string;
  workingDir: string;
}

export interface RetrievedSide {
  side: RetrieveSide;
  path: string;
  info: OrgSideInfo;
  retrievedAt: string;
  warnings: string[];
}

export interface RetrieveResult {
  baseline: RetrievedSide;
  target: RetrievedSide;
  apiVersion: string;
  /** Scratch directories the caller removes once the comparison is written. */
  workDirs: string[];
}

export function validateApiVersion(apiVersion: string): void {
  if (!/^\d+\.\d+$/.test(apiVersion)) {
    throw new Error(`api-version must look like 64.0, got "${apiVersion}".`);
  }
}

/** Standard objects only make sense alongside CustomObject. */
export function effectiveStandardObjects(metadataTypes: string[], standardObjects: string[]): string[] {
  return metadataTypes.includes('CustomObject') ? [...new Set(standardObjects)] : [];
}

export function validateMetadataTypes(metadataTypes: string[], standardObjects: string[] = []): void {
  if (!metadataTypes.length) {
    throw new Error('metadata-types is empty. List at least one type, for example CustomObject,Profile,ApexClass.');
  }
  const unsupported = metadataTypes.filter((type) => !WILDCARD_METADATA_TYPES.has(type));
  if (unsupported.length) {
    const hints = unsupported.map((type) => TYPE_HINTS[type]).filter(Boolean);
    throw new Error(
      `Unsupported metadata-types: ${unsupported.join(', ')}. ` +
        (hints.length ? `${hints.join(' ')} ` : '') +
        `Supported types: ${[...WILDCARD_METADATA_TYPES].join(', ')}. ` +
        'For anything else, provide your own package.xml with package-xml-path.',
    );
  }
  const invalid = standardObjects.filter((name) => !/^[A-Za-z][A-Za-z0-9_]*$/.test(name));
  if (invalid.length) {
    throw new Error(`standard-objects must be object API names such as Account; got: ${invalid.join(', ')}.`);
  }
}

export function buildPackageXml(metadataTypes: string[], apiVersion: string, standardObjects: string[] = []): string {
  validateApiVersion(apiVersion);
  const types = [...new Set(metadataTypes.map((type) => type.trim()).filter(Boolean))];
  const objects = effectiveStandardObjects(types, standardObjects);
  validateMetadataTypes(types, objects);

  const blocks = types.map((type) => {
    const members = ['*', ...(type === 'CustomObject' ? objects : [])];
    return [
      '    <types>',
      ...members.map((member) => `        <members>${member}</members>`),
      `        <name>${type}</name>`,
      '    </types>',
    ].join('\n');
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<Package xmlns="http://soap.sforce.com/2006/04/metadata">',
    ...blocks,
    `    <version>${apiVersion}</version>`,
    '</Package>',
    '',
  ].join('\n');
}

export function lowestApiVersion(versions: (string | undefined)[]): string | undefined {
  const known = versions.filter((version): version is string => Boolean(version));
  if (!known.length) return undefined;
  return known.reduce((lowest, version) => (Number(version) < Number(lowest) ? version : lowest));
}

const SF_CLI_MISSING_MESSAGE =
  'The Salesforce CLI (sf) is not installed on the runner. Add a step before this action, for example: ' +
  'npm install --global @salesforce/cli';

async function assertSfCliAvailable(cli: CliExecutor): Promise<void> {
  let exitCode: number;
  try {
    exitCode = await cli.exec('sf', ['--version'], { silent: true });
  } catch {
    throw new Error(SF_CLI_MISSING_MESSAGE);
  }
  if (exitCode !== 0) throw new Error(SF_CLI_MISSING_MESSAGE);
}

async function runSf(
  cli: CliExecutor,
  args: string[],
  cwd: string,
  secrets: string[],
  label: string,
  { stdoutInErrors = false } = {},
) {
  const result = await cli.captureOutput('sf', args, { cwd, silent: true });
  if (result.exitCode !== 0) {
    const detail = result.stderr || (stdoutInErrors ? result.stdout : '');
    throw new Error(formatCommandError(label, result.exitCode, secrets, detail));
  }
  return result;
}

async function login(cli: CliExecutor, alias: string, authUrl: string, cwd: string, secrets: string[], side: RetrieveSide) {
  const authFile = path.join(cwd, `.auth-${alias}.txt`);
  fs.writeFileSync(authFile, authUrl, { encoding: 'utf8', mode: 0o600 });
  fs.chmodSync(authFile, 0o600);
  try {
    await runSf(
      cli,
      ['org', 'login', 'sfdx-url', '--sfdx-url-file', authFile, '--alias', alias],
      cwd,
      secrets,
      `sf org login (${side}-auth-url)`,
    );
  } finally {
    fs.rmSync(authFile, { force: true });
  }
}

async function logout(cli: CliExecutor, alias: string, cwd: string): Promise<void> {
  try {
    await cli.captureOutput('sf', ['org', 'logout', '--target-org', alias, '--no-prompt', '--json'], { cwd, silent: true });
  } catch {
    // Best effort: the login may never have completed.
  }
}

function writeSfdxProject(workDir: string, apiVersion: string): void {
  const project = {
    packageDirectories: [{ path: 'force-app', default: true }],
    name: 'sf-metadata-drift',
    namespace: '',
    sourceApiVersion: apiVersion,
  };
  fs.writeFileSync(path.join(workDir, 'sfdx-project.json'), JSON.stringify(project, null, 2), 'utf8');
  fs.mkdirSync(path.join(workDir, 'force-app', 'main', 'default'), { recursive: true });
}

interface RetrieveMessage {
  fileName?: string;
  problem?: string;
  problemType?: string;
}

export function formatRetrieveWarning(warning: unknown): string {
  if (typeof warning === 'string') return warning;
  if (warning && typeof warning === 'object') {
    const { problem, fileName } = warning as RetrieveMessage;
    if (problem) {
      return fileName && fileName !== 'unpackaged/package.xml' ? `${problem} (${fileName})` : problem;
    }
  }
  return JSON.stringify(warning);
}

async function retrieveMetadata(
  cli: CliExecutor,
  alias: string,
  workDir: string,
  manifest: string,
  secrets: string[],
): Promise<string[]> {
  const result = await runSf(
    cli,
    ['project', 'retrieve', 'start', '--manifest', manifest, '--target-org', alias, '--wait', RETRIEVE_WAIT_MINUTES, '--json'],
    workDir,
    secrets,
    'sf project retrieve start',
    { stdoutInErrors: true },
  );

  let payload: { status?: number; warnings?: unknown; result?: { status?: string; success?: boolean; messages?: unknown } };
  try {
    payload = JSON.parse(result.stdout);
  } catch {
    throw new Error('Salesforce retrieve returned output that is not JSON, so the comparison cannot be trusted.');
  }
  if (payload.status !== 0 || (payload.result?.status !== 'Succeeded' && payload.result?.success !== true)) {
    throw new Error('Salesforce retrieve did not report success, so the comparison cannot be trusted.');
  }

  // The Metadata API returns a bare object instead of an array when there is one message.
  const asList = (value: unknown): unknown[] => (value == null ? [] : Array.isArray(value) ? value : [value]);
  return [...asList(payload.warnings), ...asList(payload.result?.messages)]
    .map((warning) => redactAuthUrls(formatRetrieveWarning(warning), secrets));
}

interface Session {
  side: RetrieveSide;
  alias: string;
  workDir: string;
  display: SfOrgDisplayFields | null;
  loggedIn: boolean;
}

/**
 * Log in to both orgs, settle on one API version, retrieve the same manifest
 * from each, and always log out again so no credentials stay in the CLI store.
 */
export async function retrieveOrgs(request: RetrieveRequest, deps: RetrieveDeps = {}): Promise<RetrieveResult> {
  const cli = deps.cli ?? createDefaultCliExecutor();
  const secrets = [request.baselineAuthUrl, request.targetAuthUrl];
  const manifestPath = request.packageXmlPath ? path.resolve(request.packageXmlPath) : undefined;

  if (manifestPath) {
    if (!fs.existsSync(manifestPath) || !fs.statSync(manifestPath).isFile()) {
      throw new Error(`package-xml-path does not exist: ${manifestPath}`);
    }
  } else {
    validateMetadataTypes(request.metadataTypes, effectiveStandardObjects(request.metadataTypes, request.standardObjects));
  }
  if (request.apiVersion) validateApiVersion(request.apiVersion);

  await assertSfCliAvailable(cli);

  const root = path.resolve(request.workingDir);
  fs.mkdirSync(root, { recursive: true });
  const sessions: Session[] = (['baseline', 'target'] as const).map((side) => ({
    side,
    alias: `sf-drift-${side}-${randomUUID()}`,
    workDir: fs.mkdtempSync(path.join(root, `${side}-`)),
    display: null,
    loggedIn: false,
  }));
  const authUrls = { baseline: request.baselineAuthUrl, target: request.targetAuthUrl };
  const labels = { baseline: request.baselineLabel, target: request.targetLabel };

  try {
    for (const session of sessions) {
      session.loggedIn = true;
      await login(cli, session.alias, authUrls[session.side], session.workDir, secrets, session.side);
      session.display = await fetchOrgDisplay(cli, session.alias, session.workDir);
    }

    const apiVersion = request.apiVersion
      || lowestApiVersion(sessions.map((session) => session.display?.apiVersion))
      || FALLBACK_API_VERSION;

    const retrieved: RetrievedSide[] = [];
    for (const session of sessions) {
      writeSfdxProject(session.workDir, apiVersion);
      let manifest = manifestPath;
      if (!manifest) {
        manifest = path.join(session.workDir, 'package.xml');
        fs.writeFileSync(manifest, buildPackageXml(request.metadataTypes, apiVersion, request.standardObjects), 'utf8');
      }
      const warnings = await retrieveMetadata(cli, session.alias, session.workDir, manifest, secrets);
      retrieved.push({
        side: session.side,
        path: path.join(session.workDir, 'force-app', 'main', 'default'),
        info: orgSideFromDisplay(session.display, `${session.side} org`, labels[session.side]),
        retrievedAt: new Date().toISOString(),
        warnings,
      });
    }

    return {
      baseline: retrieved[0],
      target: retrieved[1],
      apiVersion,
      workDirs: sessions.map((session) => session.workDir),
    };
  } catch (error) {
    for (const session of sessions) fs.rmSync(session.workDir, { recursive: true, force: true });
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(redactAuthUrls(message, secrets));
  } finally {
    for (const session of sessions) {
      if (session.loggedIn) await logout(cli, session.alias, root);
    }
  }
}
