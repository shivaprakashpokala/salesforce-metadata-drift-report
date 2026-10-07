import * as core from '@actions/core';
import fs from 'node:fs';
import path from 'node:path';
import { normalizeMetadataTree } from './normalize.js';
import { diffMetadataTrees } from './diff.js';
import { writeJsonReport } from './report/json.js';
import { writeHtmlReport } from './report/html.js';
import { renderMarkdownReport, writeMarkdownReport } from './report/markdown.js';
import { writeJobSummary } from './report/summary.js';
import { publishReportArtifact } from './artifact.js';
import { parseInputs, readFixturePaths, validateInputs } from './inputs.js';
import { buildOrgWarnings, type OrgSideInfo } from './org-kind.js';
import { authUrlSecretParts, redactAuthUrls } from './redact.js';
import { retrieveOrgs, FALLBACK_API_VERSION } from './retrieve.js';
import { applyScope, createComparisonScope, standardObjectsWarning } from './scope.js';
import type { ActionInputs, RetrievalRecord } from './types.js';

interface ComparisonSides {
  baselinePath: string;
  targetPath: string;
  baseline: OrgSideInfo;
  target: OrgSideInfo;
  apiVersion: string;
  retrievals: RetrievalRecord[];
  fromOrgs: boolean;
}

function workflowRunUrl(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const { GITHUB_SERVER_URL, GITHUB_REPOSITORY, GITHUB_RUN_ID } = env;
  return GITHUB_SERVER_URL && GITHUB_REPOSITORY && GITHUB_RUN_ID
    ? `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`
    : undefined;
}

async function resolveSides(inputs: ActionInputs, cleanup: string[]): Promise<ComparisonSides> {
  const fixtures = readFixturePaths();
  if (fixtures) {
    return {
      baselinePath: path.resolve(fixtures.baseline),
      targetPath: path.resolve(fixtures.target),
      baseline: { label: inputs.baselineLabel ?? fixtures.baseline, orgKind: 'unknown' },
      target: { label: inputs.targetLabel ?? fixtures.target, orgKind: 'unknown' },
      apiVersion: inputs.apiVersion ?? FALLBACK_API_VERSION,
      retrievals: [],
      fromOrgs: false,
    };
  }

  core.info('Logging in to both orgs and retrieving metadata. Auth URLs are never logged.');
  const result = await retrieveOrgs({
    baselineAuthUrl: inputs.baselineAuthUrl!,
    targetAuthUrl: inputs.targetAuthUrl!,
    baselineLabel: inputs.baselineLabel,
    targetLabel: inputs.targetLabel,
    metadataTypes: inputs.metadataTypes,
    standardObjects: inputs.standardObjects,
    apiVersion: inputs.apiVersion,
    packageXmlPath: inputs.packageXmlPath,
    workingDir: inputs.workingDir,
  });
  cleanup.push(...result.workDirs);
  return {
    baselinePath: result.baseline.path,
    targetPath: result.target.path,
    baseline: result.baseline.info,
    target: result.target.info,
    apiVersion: result.apiVersion,
    retrievals: [result.baseline, result.target].map(({ side, retrievedAt, warnings }) => ({ side, retrievedAt, warnings })),
    fromOrgs: true,
  };
}

export async function run(): Promise<void> {
  const authSecrets = ['baseline-auth-url', 'target-auth-url']
    .map((name) => core.getInput(name).trim())
    .filter(Boolean);
  for (const secret of authSecrets.flatMap(authUrlSecretParts)) core.setSecret(secret);
  const cleanup: string[] = [];

  try {
    const inputs = parseInputs();
    validateInputs(inputs, readFixturePaths());
    const sides = await resolveSides(inputs, cleanup);
    const scope = createComparisonScope(inputs, sides.apiVersion);

    core.info(`Baseline: ${sides.baseline.label} (${sides.baseline.orgKind})`);
    const baselineTree = applyScope(await normalizeMetadataTree(sides.baselinePath), scope);
    core.info(`Target: ${sides.target.label} (${sides.target.orgKind})`);
    const targetTree = applyScope(await normalizeMetadataTree(sides.targetPath), scope);
    core.info(`Compared ${baselineTree.components.size} baseline and ${targetTree.components.size} target components.`);

    const retrievalWarnings = sides.retrievals.flatMap((item) => item.warnings.map((warning) => `${item.side} org: ${warning}`));
    const warnings = [
      ...(sides.fromOrgs ? buildOrgWarnings(sides.baseline, sides.target) : []),
      ...[standardObjectsWarning(scope)].filter((warning): warning is string => Boolean(warning)),
      ...retrievalWarnings,
    ];
    for (const warning of warnings) core.warning(warning);

    const report = diffMetadataTrees(baselineTree, targetTree, {
      baseline: sides.baseline,
      target: sides.target,
      warnings,
      scope,
      incomplete: retrievalWarnings.length > 0,
    });
    report.retrievals = sides.retrievals;
    report.runUrl = workflowRunUrl();

    const outputDir = path.resolve(inputs.outputDir);
    const mdPath = writeMarkdownReport(report, outputDir);
    const jsonPath = writeJsonReport(report, outputDir);
    const htmlPath = writeHtmlReport(report, outputDir);

    const { summary } = report;
    if (report.outcome === 'incomplete') core.info('Comparison incomplete. See the warnings in the report.');
    else if (summary.hasDrift) {
      core.info(
        `Drift detected: ${summary.added} added in target, ${summary.removed} missing from target, ` +
          `${summary.changed} changed, ${summary.unchanged} unchanged.`,
      );
    } else core.info(`No drift detected. ${summary.unchanged} components match the baseline.`);
    core.info(`Markdown report: ${mdPath}`);

    core.setOutput('comparison-status', report.outcome);
    core.setOutput('has-drift', String(summary.hasDrift));
    core.setOutput('added-count', String(summary.added));
    core.setOutput('removed-count', String(summary.removed));
    core.setOutput('changed-count', String(summary.changed));
    core.setOutput('unchanged-count', String(summary.unchanged));
    core.setOutput('report-md-path', mdPath);
    core.setOutput('report-json-path', jsonPath);
    core.setOutput('report-html-path', htmlPath);
    core.setOutput('artifact-id', '');

    if (inputs.jobSummary) {
      const result = await writeJobSummary(renderMarkdownReport(report));
      if (result.truncated) core.info('Job Summary truncated; the artifact has the full report.');
    }

    if (inputs.uploadArtifact) {
      const result = await publishReportArtifact({
        name: inputs.artifactName,
        files: [mdPath, jsonPath, htmlPath],
        rootDirectory: outputDir,
        retentionDays: inputs.artifactRetentionDays,
      });
      if (result.uploaded) {
        core.info(`Published artifact "${inputs.artifactName}".`);
        if (result.id !== undefined) core.setOutput('artifact-id', String(result.id));
      } else {
        core.warning(`Artifact upload skipped: ${result.reason}.`);
      }
    }

    if (report.outcome === 'incomplete') {
      core.setFailed(
        'Comparison incomplete. The report was published, but some metadata could not be retrieved or identified, ' +
          'so a clean result cannot be confirmed. Check the warnings: usually a type or standard object that does ' +
          'not exist in one org, or that the integration user cannot read.',
      );
    }
  } catch (error) {
    core.setOutput('comparison-status', 'error');
    const message = error instanceof Error ? error.message : String(error);
    core.setFailed(redactAuthUrls(message, authSecrets));
  } finally {
    for (const directory of cleanup) fs.rmSync(directory, { recursive: true, force: true });
    for (const parent of new Set(cleanup.map((directory) => path.dirname(directory)))) {
      try {
        fs.rmdirSync(parent);
      } catch {
        // Leave a working directory that holds anything else.
      }
    }
  }
}

if (process.env.NODE_ENV !== 'test') {
  run();
}
