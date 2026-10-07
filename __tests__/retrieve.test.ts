import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildPackageXml,
  formatRetrieveWarning,
  lowestApiVersion,
  retrieveOrgs,
  type RetrieveRequest,
} from '../src/retrieve.js';
import type { CliCaptureResult, CliExecutor } from '../src/cli.js';

const BASELINE_AUTH = 'force://PlatformCLI::baselineRefreshToken@prod.my.salesforce.com';
const TARGET_AUTH = 'force://PlatformCLI::targetRefreshToken@qa.sandbox.my.salesforce.com';

interface Call {
  args: string[];
  cwd?: string;
}

interface FakeOptions {
  sfMissing?: boolean;
  apiVersions?: { baseline?: string; target?: string };
  retrieve?: (side: 'baseline' | 'target', call: Call) => unknown;
  loginFails?: 'baseline' | 'target';
  onLogin?: (authFile: string) => void;
}

const ok = (payload: unknown): CliCaptureResult => ({ exitCode: 0, stdout: JSON.stringify(payload), stderr: '' });
const success = { status: 0, result: { status: 'Succeeded', success: true } };

function sideOf(args: string[]): 'baseline' | 'target' {
  const flag = args.includes('--target-org') ? '--target-org' : '--alias';
  return args[args.indexOf(flag) + 1].includes('baseline') ? 'baseline' : 'target';
}

function fakeCli(options: FakeOptions = {}): { cli: CliExecutor; calls: Call[] } {
  const calls: Call[] = [];
  const cli: CliExecutor = {
    async exec(_command, args) {
      calls.push({ args });
      if (options.sfMissing) throw new Error('spawn sf ENOENT');
      return 0;
    },
    async captureOutput(_command, args, execOptions = {}) {
      const call = { args, cwd: execOptions.cwd };
      calls.push(call);
      if (args[0] === 'org' && args[1] === 'login') {
        const side = sideOf(args);
        options.onLogin?.(args[args.indexOf('--sfdx-url-file') + 1]);
        if (options.loginFails === side) {
          return { exitCode: 1, stdout: '', stderr: `Invalid auth URL ${side === 'baseline' ? BASELINE_AUTH : TARGET_AUTH}` };
        }
        return { exitCode: 0, stdout: '', stderr: '' };
      }
      if (args[0] === 'org' && args[1] === 'display') {
        const side = sideOf(args);
        return ok({
          status: 0,
          result: {
            id: side === 'baseline' ? '00D000000000001AAA' : '00D000000000002AAA',
            username: `integration@${side}.example`,
            instanceUrl: 'https://example.my.salesforce.com',
            apiVersion: options.apiVersions?.[side],
          },
        });
      }
      if (args[0] === 'data') return { exitCode: 1, stdout: '', stderr: '' };
      if (args[0] === 'project') return ok(options.retrieve?.(sideOf(args), call) ?? success);
      return ok({ status: 0 });
    },
  };
  return { cli, calls };
}

let tmp: string;
const request = (overrides: Partial<RetrieveRequest> = {}): RetrieveRequest => ({
  baselineAuthUrl: BASELINE_AUTH,
  targetAuthUrl: TARGET_AUTH,
  metadataTypes: ['CustomObject', 'ApexClass'],
  standardObjects: ['Account'],
  workingDir: path.join(tmp, 'work'),
  ...overrides,
});

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-drift-retrieve-'));
});
afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe('buildPackageXml', () => {
  it('requests wildcards plus explicit standard objects', () => {
    const xml = buildPackageXml(['CustomObject', 'Profile'], '63.0', ['Account', 'Contact']);
    expect(xml).toContain('<members>*</members>\n        <members>Account</members>\n        <members>Contact</members>');
    expect(xml).toContain('<name>Profile</name>');
    expect(xml).toContain('<version>63.0</version>');
  });

  it('accepts Layout, Flow and the other common wildcard types', () => {
    const types = ['Layout', 'Flow', 'CustomLabel', 'CustomPermission', 'GlobalValueSet', 'CustomMetadata',
      'NamedCredential', 'PermissionSetGroup', 'QuickAction'];
    const xml = buildPackageXml(types, '64.0');
    for (const type of types) expect(xml).toContain(`<name>${type}</name>`);
  });

  it('ignores standard objects unless CustomObject is requested', () => {
    expect(buildPackageXml(['ApexClass'], '64.0', ['Account'])).not.toContain('Account');
  });

  it('explains unsupported types', () => {
    expect(() => buildPackageXml(['CustomField'], '64.0')).toThrow(/retrieved with CustomObject/);
    expect(() => buildPackageXml(['CustomLabels'], '64.0')).toThrow(/CustomLabel \(singular\)/);
    expect(() => buildPackageXml(['FutureType'], '64.0')).toThrow(/Unsupported metadata-types: FutureType.*package-xml-path/);
  });

  it('rejects malformed versions and object names', () => {
    expect(() => buildPackageXml(['ApexClass'], 'latest')).toThrow(/api-version/);
    expect(() => buildPackageXml(['CustomObject'], '64.0', ['Bad Name'])).toThrow(/standard-objects/);
  });
});

describe('helpers', () => {
  it('picks the lowest known API version', () => {
    expect(lowestApiVersion(['66.0', '64.0'])).toBe('64.0');
    expect(lowestApiVersion([undefined, '65.0'])).toBe('65.0');
    expect(lowestApiVersion([undefined, undefined])).toBeUndefined();
  });

  it('formats Metadata API messages as plain text', () => {
    expect(formatRetrieveWarning({ fileName: 'unpackaged/package.xml', problem: "Entity of type 'CustomObject' named 'Quote' cannot be found" }))
      .toBe("Entity of type 'CustomObject' named 'Quote' cannot be found");
    expect(formatRetrieveWarning({ fileName: 'objects/X__c.object', problem: 'Bad' })).toBe('Bad (objects/X__c.object)');
    expect(formatRetrieveWarning('plain')).toBe('plain');
  });
});

describe('retrieveOrgs', () => {
  it('retrieves both orgs and logs out of both', async () => {
    const { cli, calls } = fakeCli({ apiVersions: { baseline: '66.0', target: '65.0' } });
    const result = await retrieveOrgs(request({ baselineLabel: 'Production' }), { cli });

    expect(result.apiVersion).toBe('65.0');
    expect(result.baseline.path).toMatch(/baseline-[^/]+\/force-app\/main\/default$/);
    expect(result.target.path).toMatch(/target-[^/]+\/force-app\/main\/default$/);
    expect(result.baseline.info.label).toBe('Production');
    expect(result.target.info.orgId).toBe('00D000000000002AAA');

    const manifest = fs.readFileSync(path.join(path.dirname(path.dirname(path.dirname(result.target.path))), 'package.xml'), 'utf8');
    expect(manifest).toContain('<version>65.0</version>');
    expect(manifest).toContain('<members>Account</members>');

    const logouts = calls.filter((call) => call.args[0] === 'org' && call.args[1] === 'logout');
    expect(logouts.map((call) => sideOf(call.args)).sort()).toEqual(['baseline', 'target']);
    expect(logouts.every((call) => call.args.includes('--no-prompt'))).toBe(true);
  });

  it('uses an explicit api-version and falls back when orgs do not report one', async () => {
    expect((await retrieveOrgs(request({ apiVersion: '62.0' }), { cli: fakeCli({ apiVersions: { baseline: '66.0' } }).cli })).apiVersion)
      .toBe('62.0');
    expect((await retrieveOrgs(request(), { cli: fakeCli().cli })).apiVersion).toBe('64.0');
  });

  it('logs out and removes scratch folders when a step fails', async () => {
    const { cli, calls } = fakeCli({ loginFails: 'target' });
    await expect(retrieveOrgs(request(), { cli })).rejects.toThrow(/sf org login \(target-auth-url\)/);
    const logouts = calls.filter((call) => call.args[1] === 'logout');
    expect(logouts).toHaveLength(2);
    expect(fs.readdirSync(path.join(tmp, 'work'))).toEqual([]);
  });

  it('never surfaces either auth URL in errors', async () => {
    const { cli } = fakeCli({ loginFails: 'baseline' });
    const error = await retrieveOrgs(request(), { cli }).catch((caught: Error) => caught);
    expect(error.message).not.toContain('baselineRefreshToken');
    expect(error.message).toContain('[REDACTED_AUTH_URL]');
  });

  it('writes the auth URL to a private file and deletes it after login', async () => {
    const files: string[] = [];
    const { cli } = fakeCli({
      onLogin: (file) => {
        files.push(file);
        expect(fs.readFileSync(file, 'utf8')).toMatch(/^force:\/\//);
        expect(fs.statSync(file).mode & 0o777).toBe(0o600);
      },
    });
    await retrieveOrgs(request(), { cli });
    expect(files).toHaveLength(2);
    for (const file of files) expect(fs.existsSync(file)).toBe(false);
  });

  it('fails with install instructions when the Salesforce CLI is missing', async () => {
    const { cli } = fakeCli({ sfMissing: true });
    await expect(retrieveOrgs(request(), { cli })).rejects.toThrow(/npm install --global @salesforce\/cli/);
  });

  it('validates metadata-types before logging in', async () => {
    const { cli, calls } = fakeCli();
    await expect(retrieveOrgs(request({ metadataTypes: ['CustomField'] }), { cli })).rejects.toThrow(/CustomObject/);
    expect(calls).toHaveLength(0);
  });

  it('uses package-xml-path for both orgs, resolved from the current directory', async () => {
    const manifest = path.join(tmp, 'package.xml');
    fs.writeFileSync(manifest, '<Package><version>62.0</version></Package>');
    const manifests: string[] = [];
    const { cli } = fakeCli({
      retrieve: (_side, call) => {
        manifests.push(call.args[call.args.indexOf('--manifest') + 1]);
        return success;
      },
    });
    await retrieveOrgs(request({ packageXmlPath: path.relative(process.cwd(), manifest) }), { cli });
    expect(manifests).toEqual([manifest, manifest]);
    await expect(retrieveOrgs(request({ packageXmlPath: path.join(tmp, 'missing.xml') }), { cli })).rejects.toThrow(/does not exist/);
  });

  it('rejects unfinished retrieves', async () => {
    const { cli } = fakeCli({ retrieve: () => ({ status: 0, result: { status: 'InProgress' } }) });
    await expect(retrieveOrgs(request(), { cli })).rejects.toThrow(/did not report success/);
  });

  it('keeps retrieve warnings, single or listed, as redacted text', async () => {
    const { cli } = fakeCli({
      retrieve: (side) => side === 'baseline'
        ? { ...success, result: { ...success.result, messages: { fileName: 'unpackaged/package.xml', problem: `Missing; ${BASELINE_AUTH}` } } }
        : { ...success, warnings: 'A CLI warning', result: { ...success.result, messages: [{ problem: 'First' }, { problem: 'Second' }] } },
    });
    const result = await retrieveOrgs(request(), { cli });
    expect(result.baseline.warnings).toEqual(['Missing; [REDACTED_AUTH_URL]']);
    expect(result.target.warnings).toEqual(['A CLI warning', 'First', 'Second']);
  });

  it('uses a fresh folder per run so old files cannot leak into a new comparison', async () => {
    const { cli } = fakeCli({
      retrieve: (_side, call) => {
        const file = path.join(call.cwd!, 'force-app/main/default/classes/Old.cls');
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, 'public class Old {}');
        return success;
      },
    });
    const first = await retrieveOrgs(request(), { cli });
    const second = await retrieveOrgs(request(), { cli: fakeCli().cli });
    expect(second.baseline.path).not.toBe(first.baseline.path);
    expect(fs.existsSync(path.join(second.baseline.path, 'classes/Old.cls'))).toBe(false);
  });
});
