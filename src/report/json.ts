import fs from 'node:fs';
import path from 'node:path';
import type { DriftReport } from '../types.js';

export const REPORT_JSON_FILENAME = 'metadata-drift-report.json';

export function writeJsonReport(report: DriftReport, outputDir: string): string {
  fs.mkdirSync(outputDir, { recursive: true });
  const filePath = path.join(outputDir, REPORT_JSON_FILENAME);
  fs.writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf8');
  return filePath;
}
