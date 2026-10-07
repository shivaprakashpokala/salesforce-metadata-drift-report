import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

// Remove obsolete chunks before generating the complete distributable.
rmSync(new URL('../dist/', import.meta.url), { recursive: true, force: true });
const temp = mkdtempSync(path.join(os.tmpdir(), 'sf-drift-build-'));
try {
  const statsPath = path.join(temp, 'stats.json');
  execFileSync(process.execPath, ['node_modules/@vercel/ncc/dist/ncc/cli.js',
    'build', 'src/index.ts', '-o', 'dist', '--license', 'licenses.txt', '--stats-out', statsPath], { stdio: 'inherit' });
  // basic-ftp and http-cache-semantics have open advisories and are only used by
  // source-deploy-retrieve's network code, which the action never imports.
  function inspect(value) {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (['name', 'identifier', 'nameForCondition'].includes(key) && typeof child === 'string'
        && /node_modules[\\/](?:basic-ftp|http-cache-semantics)[\\/]/.test(child)) {
        throw new Error(`Excluded vulnerable dependency entered the action bundle: ${child}`);
      }
      inspect(child);
    }
  }
  inspect(JSON.parse(readFileSync(statsPath, 'utf8')));
  console.log('Bundle dependency check passed: basic-ftp and http-cache-semantics are excluded.');
} finally {
  rmSync(temp, { recursive: true, force: true });
}
