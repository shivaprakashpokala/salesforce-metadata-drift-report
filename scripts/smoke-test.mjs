import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

// Runs the shipped bundle in a folder with no node_modules, using the
// defaults from action.yml the way the Actions runner would.
const actionDefaults = {};
for (const match of fs.readFileSync('action.yml', 'utf8').matchAll(/^ {2}([a-z-]+):\n(?: {4}.*\n)*? {4}default: '([^']*)'/gm)) {
  actionDefaults['INPUT_' + match[1].toUpperCase()] = match[2];
}

const FAKE_SF = `#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const args = process.argv.slice(2);
const state = process.env.FAKE_SF_STATE;
const value = (flag) => args[args.indexOf(flag) + 1];
const side = (alias) => (alias.includes('baseline') ? 'baseline' : 'target');
fs.appendFileSync(path.join(state, 'calls.log'), args.join(' ') + '\\n');
const print = (result) => process.stdout.write(JSON.stringify({ status: 0, result }));
const orgs = JSON.parse(fs.readFileSync(path.join(state, 'orgs.json'), 'utf8'));
const command = args.slice(0, 2).join(' ');

if (args[0] === '--version') process.exit(0);
if (command === 'org login') process.exit(0);
if (command === 'org logout') { print({}); process.exit(0); }
if (command === 'org display') {
  const org = orgs[side(value('--target-org'))];
  print({ id: org.id, username: org.username, instanceUrl: org.instanceUrl, apiVersion: org.apiVersion });
  process.exit(0);
}
if (command === 'data query') {
  const org = orgs[side(value('--target-org'))];
  print({ done: true, totalSize: 1, records: [{ Id: org.id, Name: org.name, OrganizationType: org.edition,
    IsSandbox: org.isSandbox, TrialExpirationDate: null }] });
  process.exit(0);
}
if (command === 'project retrieve') {
  const org = orgs[side(value('--target-org'))];
  fs.copyFileSync(value('--manifest'), path.join(state, side(value('--target-org')) + '-package.xml'));
  fs.cpSync(path.join(org.fixture, 'force-app'), path.join(process.cwd(), 'force-app'), { recursive: true });
  print({ status: 'Succeeded', success: true, messages: org.message });
  process.exit(0);
}
process.stderr.write('unexpected sf call: ' + args.join(' '));
process.exit(2);
`;

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-drift-bundle-'));

function runAction(name, env) {
  const fullEnv = {
    ...process.env,
    ...actionDefaults,
    'INPUT_UPLOAD-ARTIFACT': 'false',
    'INPUT_JOB-SUMMARY': 'false',
    'INPUT_OUTPUT-DIR': name + '-report',
    ...env,
  };
  delete fullEnv.NODE_PATH;
  delete fullEnv.NODE_ENV;
  const result = spawnSync(process.execPath, ['dist/index.js'], { cwd: root, env: fullEnv, encoding: 'utf8' });
  const reportPath = path.join(root, name + '-report', 'metadata-drift-report.json');
  const report = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : undefined;
  return { result, report, output: result.stdout + result.stderr };
}

const DRIFT_SUMMARY = { added: 2, removed: 1, changed: 3, unchanged: 2, total: 8, hasDrift: true };

try {
  fs.cpSync('dist', path.join(root, 'dist'), { recursive: true });
  fs.cpSync('__tests__/fixtures', path.join(root, 'fixtures'), { recursive: true });
  fs.mkdirSync(path.join(root, 'empty'));
  fs.cpSync(path.join(root, 'fixtures/org-a'), path.join(root, 'fixtures/unknown-a'), { recursive: true });
  const unknownFile = path.join(root, 'fixtures/unknown-a/force-app/main/default/futureTypes/Example.future-meta.xml');
  fs.mkdirSync(path.dirname(unknownFile), { recursive: true });
  fs.writeFileSync(unknownFile, '<Future/>');

  const fixtureCases = [
    ['drift', 'fixtures/org-a', 'fixtures/org-b', 0, 'drift'],
    ['equal', 'fixtures/org-a', 'fixtures/org-a', 0, 'no-drift'],
    ['unknown-equal', 'fixtures/unknown-a', 'fixtures/unknown-a', 1, 'incomplete'],
    ['empty', 'empty', 'empty', 1, 'incomplete'],
  ];
  for (const [name, baseline, target, exitCode, outcome] of fixtureCases) {
    const { result, report, output } = runAction(name, {
      DRIFT_TEST_BASELINE_PATH: baseline,
      DRIFT_TEST_TARGET_PATH: target,
    });
    assert.equal(result.status, exitCode, output);
    assert.equal(report.outcome, outcome);
    if (outcome === 'no-drift') assert.equal(report.summary.hasDrift, false);
    if (name === 'drift') assert.deepEqual(report.summary, DRIFT_SUMMARY);
    if (name === 'unknown-equal') {
      assert.equal(report.summary.hasDrift, false);
      assert(report.warnings.some((warning) => warning.includes('Could not identify the metadata type')));
    }
    console.log('Fixture comparison: ' + name + ' passed');
  }

  const bin = path.join(root, 'bin');
  fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin, 'sf'), FAKE_SF, { mode: 0o755 });

  const orgCases = [
    {
      name: 'org-drift',
      exitCode: 0,
      outcome: 'drift',
      orgs: {
        baseline: { id: '00D000000000001AAA', username: 'ci@acme.com', instanceUrl: 'https://acme.my.salesforce.com',
          apiVersion: '65.0', name: 'Acme', edition: 'Enterprise Edition', isSandbox: false,
          fixture: path.join(root, 'fixtures/org-a') },
        target: { id: '00D000000000002AAA', username: 'ci@acme.com.uat', instanceUrl: 'https://acme--uat.sandbox.my.salesforce.com',
          apiVersion: '64.0', name: 'Acme', edition: 'Enterprise Edition', isSandbox: true,
          fixture: path.join(root, 'fixtures/org-b') },
      },
    },
    {
      name: 'org-same-org',
      exitCode: 1,
      outcome: 'incomplete',
      orgs: {
        baseline: { id: '00D000000000001AAA', username: 'ci@acme.com', instanceUrl: 'https://acme.my.salesforce.com',
          apiVersion: '64.0', name: 'Acme', edition: 'Enterprise Edition', isSandbox: false,
          fixture: path.join(root, 'fixtures/org-a') },
        target: { id: '00D000000000001AAA', username: 'admin@acme.com', instanceUrl: 'https://acme.my.salesforce.com',
          apiVersion: '64.0', name: 'Acme', edition: 'Enterprise Edition', isSandbox: false,
          fixture: path.join(root, 'fixtures/org-a'),
          message: { fileName: 'unpackaged/package.xml', problem: 'Entity of type \'CustomObject\' named \'Lead\' cannot be found' } },
      },
    },
  ];

  for (const { name, exitCode, outcome, orgs } of orgCases) {
    const state = path.join(root, name + '-state');
    fs.mkdirSync(state);
    fs.writeFileSync(path.join(state, 'orgs.json'), JSON.stringify(orgs));
    const baselineUrl = 'force://PlatformCLI::baselineRefreshToken1234@acme.my.salesforce.com';
    const targetUrl = 'force://PlatformCLI::targetRefreshToken5678@acme--uat.sandbox.my.salesforce.com';
    const { result, report, output } = runAction(name, {
      'INPUT_BASELINE-AUTH-URL': baselineUrl,
      'INPUT_TARGET-AUTH-URL': targetUrl,
      'INPUT_WORKING-DIR': name + '-work',
      FAKE_SF_STATE: state,
      PATH: bin + path.delimiter + process.env.PATH,
    });
    assert.equal(result.status, exitCode, output);
    const logged = output.split('\n').filter((line) => !line.startsWith('::add-mask::')).join('\n');
    assert(!logged.includes('RefreshToken'), 'auth URL secret leaked into the log');
    assert.equal(report.outcome, outcome);

    const calls = fs.readFileSync(path.join(state, 'calls.log'), 'utf8').trim().split('\n');
    assert.equal(calls.filter((call) => call.startsWith('org login')).length, 2);
    assert.equal(calls.filter((call) => call.startsWith('org logout')).length, 2);
    assert(!fs.existsSync(path.join(root, name + '-work')), 'working folder was not removed');

    const manifest = fs.readFileSync(path.join(state, 'baseline-package.xml'), 'utf8');
    assert(manifest.includes('<members>Account</members>'));
    assert(manifest.includes('<name>Flow</name>'));
    assert(manifest.includes('<version>64.0</version>'));
    assert(!report.warnings.some((warning) => /different kinds|production.*sandbox/i.test(warning)));

    if (name === 'org-drift') {
      assert.deepEqual(report.summary, DRIFT_SUMMARY);
      assert.equal(report.baseline.orgKind, 'production');
      assert.equal(report.target.orgKind, 'sandbox');
      assert.deepEqual(report.warnings, []);
    } else {
      assert(report.warnings.some((warning) => warning.includes('same org')), report.warnings.join('\n'));
      assert(report.warnings.includes("target org: Entity of type 'CustomObject' named 'Lead' cannot be found"),
        report.warnings.join('\n'));
    }
    console.log('Org comparison with a stub sf CLI: ' + name + ' passed');
  }
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
