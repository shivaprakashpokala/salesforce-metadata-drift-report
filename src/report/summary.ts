import * as core from '@actions/core';

/** GitHub caps a step summary at 1 MiB; leave headroom for the truncation note. */
const MAX_SUMMARY_BYTES = 900_000;

export interface JobSummaryResult {
  written: boolean;
  truncated: boolean;
}

/**
 * Publish the Markdown report as the step's Job Summary. No-ops outside GitHub
 * Actions (no GITHUB_STEP_SUMMARY) so local runs stay quiet.
 */
export async function writeJobSummary(
  markdown: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<JobSummaryResult> {
  if (!env.GITHUB_STEP_SUMMARY) {
    return { written: false, truncated: false };
  }

  const bytes = Buffer.from(markdown, 'utf8');
  const truncated = bytes.length > MAX_SUMMARY_BYTES;
  let end = MAX_SUMMARY_BYTES;
  // Do not split a UTF-8 code point at the byte boundary.
  while (end > 0 && (bytes[end] & 0xc0) === 0x80) end--;
  const body = truncated
    ? `${bytes.subarray(0, end).toString('utf8')}\n\n_Summary truncated — download the report artifact for the full report._\n`
    : markdown;

  await core.summary.addRaw(body).write();
  return { written: true, truncated };
}
