import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile, spawnSync } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

// Runs the committed bundle against two throwaway scratch orgs with known
// differences, checks the reports, and deletes the orgs again.
//
//   node scripts/live-validation/scratch-orgs.mjs --dev-hub <alias> [--keep]
//
// Needs the sf CLI logged in to a Dev Hub (a free Developer Edition org with
// Dev Hub enabled works). Each run uses 2 of the Dev Hub's daily scratch orgs.

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const flag = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const devHub = flag('--dev-hub') ?? process.env.SF_DRIFT_DEV_HUB;
const keep = args.includes('--keep');
if (!devHub) {
  console.error('Usage: node scripts/live-validation/scratch-orgs.mjs --dev-hub <alias> [--keep]');
  process.exit(2);
}

const run = promisify(execFile);
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-drift-live-'));
const runId = Date.now().toString(36);
const secrets = [];

function redact(text) {
  let result = String(text);
  for (const secret of secrets) result = result.replaceAll(secret, '[REDACTED_AUTH_URL]');
  return result.replace(/force:\/\/[^\s'"]+/g, '[REDACTED_AUTH_URL]');
}

/** Run an sf command with --json and return its result, or throw its message. */
async function sf(sfArgs, options = {}) {
  let stdout;
  try {
    ({ stdout } = await run('sf', [...sfArgs, '--json'], { maxBuffer: 256 * 1024 * 1024, ...options }));
  } catch (error) {
    stdout = error.stdout;
    if (!stdout) throw new Error(redact(`sf ${sfArgs.slice(0, 3).join(' ')} failed: ${error.stderr || error.message}`));
  }
  const payload = JSON.parse(stdout);
  if (payload.status !== 0) {
    throw new Error(redact(`sf ${sfArgs.slice(0, 3).join(' ')} failed: ${payload.message ?? stdout.slice(0, 1000)}`));
  }
  return payload.result;
}

const xml = (tag, body) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<${tag} xmlns="http://soap.sforce.com/2006/04/metadata">${body}</${tag}>\n`;
const apexMeta = xml('ApexClass', '<apiVersion>62.0</apiVersion><status>Active</status>');
const object = (label) => xml('CustomObject',
  `<deploymentStatus>Deployed</deploymentStatus><label>${label}</label>` +
    `<nameField><label>${label} Name</label><type>Text</type></nameField>` +
    `<pluralLabel>${label}s</pluralLabel><sharingModel>ReadWrite</sharingModel>`);
const layout = xml('Layout',
  '<layoutSections><editHeading>true</editHeading><label>Information</label><layoutColumns><layoutItems>' +
    '<behavior>Required</behavior><field>Name</field></layoutItems></layoutColumns><style>OneColumn</style></layoutSections>');
const statusField = (length) =>
  xml('CustomField', `<fullName>Status__c</fullName><label>Status</label><length>${length}</length><type>Text</type>`);
const permissionSet = (allowEdit) => xml('PermissionSet',
  '<label>Drift User</label><objectPermissions><allowCreate>false</allowCreate><allowDelete>false</allowDelete>' +
    `<allowEdit>${allowEdit}</allowEdit><allowRead>true</allowRead><modifyAllRecords>false</modifyAllRecords>` +
    '<object>Drift_Test__c</object><viewAllRecords>false</viewAllRecords></objectPermissions>');

const shared = {
  'objects/Drift_Test__c/Drift_Test__c.object-meta.xml': object('Drift Test'),
  'layouts/Drift_Test__c-Drift Test Layout.layout-meta.xml': layout,
  'classes/DriftService.cls-meta.xml': apexMeta,
};

// Expected drift, target against baseline:
//   added    CustomObject Extra_Test__c (with its layout, assigned in the Admin profile)
//   removed  ApexClass BaselineOnly
//   changed  ApexClass DriftService, CustomField Drift_Test__c.Status__c, PermissionSet Drift_User,
//            Profile Admin (one inserted layout assignment)
const orgs = {
  baseline: {
    ...shared,
    'objects/Drift_Test__c/fields/Status__c.field-meta.xml': statusField(50),
    'permissionsets/Drift_User.permissionset-meta.xml': permissionSet(false),
    'classes/DriftService.cls': 'public with sharing class DriftService {\n    public static String status() {\n        return \'open\';\n    }\n}\n',
    'classes/BaselineOnly.cls': 'public with sharing class BaselineOnly {}\n',
    'classes/BaselineOnly.cls-meta.xml': apexMeta,
  },
  target: {
    ...shared,
    'objects/Drift_Test__c/fields/Status__c.field-meta.xml': statusField(80),
    'permissionsets/Drift_User.permissionset-meta.xml': permissionSet(true),
    'classes/DriftService.cls': 'public with sharing class DriftService {\n    public static String status() {\n        return \'closed\';\n    }\n}\n',
    'objects/Extra_Test__c/Extra_Test__c.object-meta.xml': object('Extra Test'),
    'layouts/Extra_Test__c-Extra Test Layout.layout-meta.xml': layout,
    'profiles/Admin.profile-meta.xml': xml('Profile',
      '<custom>false</custom><layoutAssignments><layout>Extra_Test__c-Extra Test Layout</layout></layoutAssignments>'),
  },
};

function writeProject(side) {
  const project = path.join(root, `${side}-project`);
  const source = path.join(project, 'force-app', 'main', 'default');
  for (const [file, content] of Object.entries(orgs[side])) {
    fs.mkdirSync(path.dirname(path.join(source, file)), { recursive: true });
    fs.writeFileSync(path.join(source, file), content);
  }
  fs.writeFileSync(path.join(project, 'sfdx-project.json'), JSON.stringify({
    packageDirectories: [{ path: 'force-app', default: true }],
    name: `sf-drift-live-${side}`,
  }));
  fs.mkdirSync(path.join(project, 'config'));
  fs.writeFileSync(path.join(project, 'config', 'project-scratch-def.json'), JSON.stringify({
    orgName: `Drift ${side}`,
    edition: 'Developer',
  }));
  return project;
}

const actionDefaults = {};
for (const match of fs.readFileSync(path.join(repo, 'action.yml'), 'utf8')
  .matchAll(/^ {2}([a-z-]+):\n(?: {4}.*\n)*? {4}default: '([^']*)'/gm)) {
  actionDefaults['INPUT_' + match[1].toUpperCase()] = match[2];
}

function runAction(name, inputs) {
  const outputDir = path.join(root, `${name}-report`);
  const env = {
    ...process.env,
    ...actionDefaults,
    SF_DISABLE_TELEMETRY: 'true',
    'INPUT_UPLOAD-ARTIFACT': 'false',
    'INPUT_JOB-SUMMARY': 'false',
    'INPUT_OUTPUT-DIR': outputDir,
    'INPUT_WORKING-DIR': path.join(root, `${name}-work`),
    ...inputs,
  };
  for (const name of ['NODE_ENV', 'NODE_PATH', 'GITHUB_OUTPUT', 'GITHUB_STEP_SUMMARY', 'DRIFT_TEST_BASELINE_PATH', 'DRIFT_TEST_TARGET_PATH']) {
    delete env[name];
  }
  const result = spawnSync(process.execPath, [path.join(repo, 'dist/index.js')], { cwd: repo, env, encoding: 'utf8' });
  const output = result.stdout + result.stderr;
  // ::add-mask:: lines are how the action asks GitHub to hide its secrets.
  const logged = output.split('\n').filter((line) => !line.startsWith('::add-mask::')).join('\n');
  for (const secret of secrets) assert(!logged.includes(secret), `${name}: an auth URL was printed`);
  const reportPath = path.join(outputDir, 'metadata-drift-report.json');
  const report = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : undefined;
  return { status: result.status, report, output, reportPath };
}

const scratch = { baseline: undefined, target: undefined };

async function cleanup() {
  for (const [side, org] of Object.entries(scratch)) {
    if (!org) continue;
    if (keep) {
      console.log(`Kept ${side} scratch org ${org.alias} (${org.username}). Delete it with: sf org delete scratch -o ${org.alias} -p`);
      continue;
    }
    try {
      await sf(['org', 'delete', 'scratch', '--target-org', org.alias, '--no-prompt']);
      console.log(`Deleted ${side} scratch org.`);
    } catch (error) {
      console.error(`Could not delete the ${side} scratch org ${org.alias}: ${error.message}`);
    }
  }
  fs.rmSync(root, { recursive: true, force: true });
}

process.on('SIGINT', () => {
  console.error('\nInterrupted; deleting scratch orgs.');
  cleanup().finally(() => process.exit(130));
});

const checks = [];
function check(name, fn) {
  try {
    fn();
    checks.push([name, true]);
    console.log(`  ok    ${name}`);
  } catch (error) {
    checks.push([name, false]);
    console.log(`  FAIL  ${name}\n        ${redact(error.message).split('\n').join('\n        ')}`);
  }
}

try {
  await sf(['org', 'display', '--target-org', devHub]).catch((error) => {
    throw new Error(`Dev Hub "${devHub}" is not usable. Log in with: sf org login web --set-default-dev-hub --alias ${devHub}\n${error.message}`);
  });
  // ScratchOrgInfo only exists in an org with Dev Hub enabled.
  await sf(['data', 'query', '--query', 'SELECT Id FROM ScratchOrgInfo LIMIT 1', '--target-org', devHub]).catch(() => {
    throw new Error(`"${devHub}" does not have Dev Hub enabled. In that org, open Setup, search for "Dev Hub", ` +
      'turn on "Enable Dev Hub", and run this script again.');
  });

  console.log('Creating two scratch orgs (a few minutes)...');
  await Promise.all(['baseline', 'target'].map(async (side) => {
    const project = writeProject(side);
    const alias = `sf-drift-live-${side}-${runId}`;
    const created = await sf([
      'org', 'create', 'scratch', '--definition-file', 'config/project-scratch-def.json', '--target-dev-hub', devHub,
      '--alias', alias, '--duration-days', '1', '--wait', '30',
    ], { cwd: project }).catch((error) => {
      // The CLI records whether an org is a Dev Hub when you log in.
      if (!/not a Dev Hub/i.test(error.message)) throw error;
      throw new Error(`Dev Hub is enabled in "${devHub}", but the CLI login predates it. Log in again and rerun:\n` +
        `  sf org login web --set-default-dev-hub --alias ${devHub}`);
    });
    scratch[side] = { alias, username: created.username, project };
    console.log(`  ${side}: ${created.username}`);
  }));

  console.log('Deploying test metadata...');
  await Promise.all(Object.entries(scratch).map(([side, org]) =>
    sf(['project', 'deploy', 'start', '--source-dir', 'force-app', '--target-org', org.alias, '--wait', '30'], { cwd: org.project })
      .then(() => console.log(`  ${side}: deployed`))));

  const auth = {};
  for (const [side, org] of Object.entries(scratch)) {
    auth[side] = (await sf(['org', 'auth', 'show-sfdx-auth-url', '--target-org', org.alias])).sfdxAuthUrl;
    assert(auth[side]?.startsWith('force://'), `No auth URL for the ${side} scratch org`);
    secrets.push(auth[side]);
  }
  const authInputs = { 'INPUT_BASELINE-AUTH-URL': auth.baseline, 'INPUT_TARGET-AUTH-URL': auth.target };

  console.log('\n1. Default inputs: expect drift');
  const defaults = runAction('defaults', authInputs);
  const find = (type, name) => defaults.report?.components.find((c) => c.metadataType === type && c.fullName === name);
  check('step succeeds with outcome drift', () => {
    assert.equal(defaults.status, 0, defaults.output.slice(-3000));
    assert.equal(defaults.report.outcome, 'drift');
  });
  check('no retrieve problems', () => {
    const problems = defaults.report.warnings.filter((w) => /^(baseline|target) org:/.test(w));
    assert.deepEqual(problems, []);
  });
  check('added: CustomObject Extra_Test__c', () => assert.equal(find('CustomObject', 'Extra_Test__c')?.category, 'added'));
  check('removed: ApexClass BaselineOnly', () => assert.equal(find('ApexClass', 'BaselineOnly')?.category, 'removed'));
  check('changed: ApexClass DriftService, with a line diff', () => {
    const change = find('ApexClass', 'DriftService');
    assert.equal(change?.category, 'changed');
    assert(change.fieldChanges.some((f) => f.path.includes('line') && f.targetValue?.includes('closed')));
  });
  check('changed: CustomField Drift_Test__c.Status__c length', () => {
    const change = find('CustomField', 'Drift_Test__c.Status__c');
    assert.equal(change?.category, 'changed');
    assert.deepEqual(change.fieldChanges.map((f) => [f.path, f.baselineValue, f.targetValue]),
      [['CustomField.length', '50', '80']]);
  });
  check('changed: PermissionSet Drift_User allowEdit', () => {
    const change = find('PermissionSet', 'Drift_User');
    assert.equal(change?.category, 'changed');
    assert(change.fieldChanges.some((f) => f.path.endsWith('.allowEdit') && f.targetValue === 'true'));
  });
  check('Profile Admin: the inserted layout assignment is one keyed change', () => {
    const change = find('Profile', 'Admin');
    assert.equal(change?.category, 'changed');
    const layoutPaths = change.fieldChanges.map((f) => f.path).filter((p) => p.includes('layoutAssignments'));
    assert(layoutPaths.length > 0, 'no layoutAssignments change found');
    assert.deepEqual(layoutPaths.filter((p) => !p.startsWith('Profile.layoutAssignments[Extra_Test__c-Extra Test Layout')), [],
      'other layout assignments were reported as changed');
  });
  // The action logs in to the same users this script created the orgs with.
  const stillLoggedIn = [];
  for (const org of Object.values(scratch)) {
    stillLoggedIn.push(await sf(['org', 'display', '--target-org', org.alias]).then(() => true, () => false));
  }
  check('logins that existed before the action are still there', () => assert.deepEqual(stillLoggedIn, [true, true]));
  const cliNotices = defaults.report?.warnings.filter((w) => w.startsWith('Salesforce CLI')) ?? [];
  console.log(cliNotices.length
    ? `  info  Salesforce CLI notices, reported without failing the run:\n        ${cliNotices.join('\n        ')}`
    : '  info  the Salesforce CLI printed no notices, so the CLI-notice path was not exercised');

  console.log('\n2. A standard object that does not exist: expect incomplete');
  const missing = runAction('missing-object', { ...authInputs, 'INPUT_STANDARD-OBJECTS': 'Account,Not_A_Real_Object' });
  check('step fails with outcome incomplete', () => {
    assert.equal(missing.status, 1, missing.output.slice(-3000));
    assert.equal(missing.report?.outcome, 'incomplete');
  });
  check('the retrieve problem names the object', () => {
    assert(missing.report.warnings.some((w) => /^(baseline|target) org:.*Not_A_Real_Object/.test(w)), missing.report.warnings.join('\n'));
  });

  console.log('\n3. package.xml from scripts/live-validation: expect drift');
  const manifest = runAction('manifest', { ...authInputs, 'INPUT_PACKAGE-XML-PATH': 'scripts/live-validation/package.xml' });
  check('step succeeds with outcome drift', () => {
    assert.equal(manifest.status, 0, manifest.output.slice(-3000));
    assert.equal(manifest.report.outcome, 'drift');
    assert.equal(manifest.report.scope.kind, 'manifest');
  });

  const keptReports = path.join(repo, 'live-validation-reports');
  fs.rmSync(keptReports, { recursive: true, force: true });
  for (const name of ['defaults', 'missing-object', 'manifest']) {
    const dir = path.join(root, `${name}-report`);
    if (fs.existsSync(dir)) fs.cpSync(dir, path.join(keptReports, name), { recursive: true });
  }
  console.log(`\nReports copied to ${path.relative(process.cwd(), keptReports) || keptReports}/`);
} catch (error) {
  checks.push(['setup', false]);
  console.error(`\n${redact(error.stack ?? error.message)}`);
} finally {
  await cleanup();
}

const failed = checks.filter(([, ok]) => !ok).length;
console.log(failed ? `\n${failed} check(s) failed.` : `\nAll ${checks.length} checks passed.`);
process.exit(failed ? 1 : 0);
