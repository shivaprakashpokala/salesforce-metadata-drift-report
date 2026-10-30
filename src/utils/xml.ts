import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  trimValues: true,
  parseTagValue: false,
});

// Profile and permission set lists are unordered sets keyed by these elements,
// so reordering is not drift. Every other list (layout items, for example)
// keeps its order because the order is meaningful. A list keyed by several
// elements needs the first one; the rest are optional parts of the key.
const PERMISSION_IDENTITIES: Record<string, string[]> = {
  fieldPermissions: ['field'],
  objectPermissions: ['object'],
  classAccesses: ['apexClass'],
  pageAccesses: ['apexPage'],
  applicationVisibilities: ['application'],
  tabVisibilities: ['tab'],
  tabSettings: ['tab'],
  recordTypeVisibilities: ['recordType'],
  userPermissions: ['name'],
  customPermissions: ['name'],
  flowAccesses: ['flow'],
  customMetadataTypeAccesses: ['name'],
  customSettingAccesses: ['name'],
  externalDataSourceAccesses: ['externalDataSource'],
  layoutAssignments: ['layout', 'recordType'],
  loginIpRanges: ['startAddress', 'endAddress'],
};

function identityFields(xmlPath: string): string[] | undefined {
  const [root, collection, ...rest] = xmlPath.split('.');
  return (root === 'Profile' || root === 'PermissionSet') && rest.length === 0
    ? PERMISSION_IDENTITIES[collection] : undefined;
}

export function parseXml(content: string): Record<string, unknown> | null {
  try {
    const parsed = parser.parse(content);
    return typeof parsed === 'object' && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function identityValue(item: unknown, xmlPath: string): string | null {
  const keys = identityFields(xmlPath);
  if (!keys || !isPlainObject(item)) return null;
  const values = keys.map((key) => (typeof item[key] === 'string' ? (item[key] as string).trim() : ''));
  if (!values[0]) return null;
  return values.filter(Boolean).join('|');
}

function keyedArray(items: unknown[], xmlPath: string): { keyed: boolean; ordered: unknown[] } {
  const ids = items.map((item) => identityValue(item, xmlPath));
  const keyed = ids.every((id): id is string => Boolean(id)) && new Set(ids).size === ids.length;
  if (!keyed) return { keyed: false, ordered: items };
  const ordered = [...items].sort((a, b) => {
    const left = identityValue(a, xmlPath)!;
    const right = identityValue(b, xmlPath)!;
    return left < right ? -1 : left > right ? 1 : 0;
  });
  return { keyed: true, ordered };
}

/**
 * Stable JSON-ready form of parsed XML: trimmed strings, sorted keys, and
 * identity-keyed arrays sorted by their identity. Whitespace and element
 * order in those lists do not change the result.
 */
export function canonicalizeXml(value: unknown, xmlPath = ''): unknown {
  if (Array.isArray(value)) {
    const { keyed, ordered } = keyedArray(value, xmlPath);
    const items = (keyed ? ordered : value).map((item) => canonicalizeXml(item, xmlPath));
    return items;
  }

  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      if (key === '?xml') continue;
      out[key] = canonicalizeXml(value[key], xmlPath ? `${xmlPath}.${key}` : key);
    }
    return out;
  }

  if (typeof value === 'string') return value.trim();
  return value;
}

/** Flatten nested XML into dot-path keys. Repeating entries are keyed by identity, not index. */
export function flattenXmlObject(
  obj: unknown,
  prefix = '',
  result: Record<string, string> = {},
  xmlPath = prefix,
): Record<string, string> {
  if (obj === null || obj === undefined) {
    if (prefix) result[prefix] = '';
    return result;
  }

  if (typeof obj !== 'object') {
    if (prefix) result[prefix] = String(obj).trim();
    return result;
  }

  if (Array.isArray(obj)) {
    const { keyed, ordered } = keyedArray(obj, xmlPath);
    ordered.forEach((item, index) => {
      const id = keyed ? identityValue(item, xmlPath) : null;
      const segment = id ? `${prefix}[${id}]` : `${prefix}[${index}]`;
      flattenXmlObject(item, segment, result, xmlPath);
    });
    return result;
  }

  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (key === '?xml') continue;
    const path = prefix ? `${prefix}.${key}` : key;
    const childPath = xmlPath ? `${xmlPath}.${key}` : key;
    if (Array.isArray(value)) {
      flattenXmlObject(value, path, result, childPath);
    } else if (isPlainObject(value) && identityValue(value, childPath)) {
      flattenXmlObject(value, `${path}[${identityValue(value, childPath)}]`, result, childPath);
    } else if (isPlainObject(value)) {
      flattenXmlObject(value, path, result, childPath);
    } else {
      result[path] = value === undefined || value === null ? '' : String(value).trim();
    }
  }

  return result;
}

export function diffFlattenedMaps(
  baseline: Record<string, string>,
  target: Record<string, string>,
): { path: string; baselineValue?: string; targetValue?: string }[] {
  const changes: { path: string; baselineValue?: string; targetValue?: string }[] = [];
  const allKeys = new Set([...Object.keys(baseline), ...Object.keys(target)]);

  for (const key of [...allKeys].sort()) {
    const b = baseline[key];
    const t = target[key];
    if (b !== t) {
      changes.push({
        path: key,
        baselineValue: b,
        targetValue: t,
      });
    }
  }

  return changes;
}
