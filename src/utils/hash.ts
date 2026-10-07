import { createHash } from 'node:crypto';
import { canonicalizeXml, parseXml } from './xml.js';

export function hashContent(content: string | Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}

export function isMetadataXml(relativePath: string): boolean {
  return /\.(xml|object|profile|permissionset|layout|app|remoteSite|flow|workflow)$/i.test(relativePath);
}

/**
 * Hash used to decide whether a component changed.
 * XML is canonicalized (trim, stable key order, identity-sorted lists) so
 * formatting and permission order are not drift. Apex stays raw text with
 * newline normalization.
 */
export function hashMetadataContent(content: string, relativePath = ''): string {
  const normalized = content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  if (isMetadataXml(relativePath) && normalized.trimStart().startsWith('<')) {
    const parsed = parseXml(normalized);
    if (parsed && Object.keys(parsed).length > 0) {
      return hashContent(JSON.stringify(canonicalizeXml(parsed)));
    }
  }
  return hashContent(normalized);
}
