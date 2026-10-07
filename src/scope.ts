import fs from 'node:fs';
import { XMLBuilder, XMLValidator } from 'fast-xml-parser';
import type { ActionInputs, ComparisonScope, MetadataTree, NormalizedComponent } from './types.js';
import { parseXml } from './utils/xml.js';
import { hashContent, hashMetadataContent } from './utils/hash.js';
import { effectiveStandardObjects } from './retrieve.js';

const asArray = <T>(value: T | T[] | undefined): T[] => (value === undefined ? [] : Array.isArray(value) ? value : [value]);
const builder = new XMLBuilder({ ignoreAttributes: false, attributeNamePrefix: '@_' });

// Suffixes of objects returned by CustomObject:*. Standard objects need explicit members.
const CUSTOM_OBJECT_SUFFIX = /__(c|mdt|x|b|e|kav)$/;

export function createComparisonScope(inputs: ActionInputs, apiVersion: string): ComparisonScope {
  const scope: ComparisonScope = { kind: 'metadata-types', apiVersion, members: {}, notes: [] };

  if (inputs.packageXmlPath) {
    const content = fs.readFileSync(inputs.packageXmlPath, 'utf8');
    if (XMLValidator.validate(content) !== true) throw new Error('package-xml-path is not valid XML.');
    const pkg = parseXml(content)?.Package as
      | { types?: { name: string; members: string | string[] }[]; version?: string }
      | undefined;
    if (!pkg) throw new Error('package-xml-path must have a <Package> root element.');

    scope.kind = 'manifest';
    scope.manifestHash = hashContent(content);
    scope.apiVersion = String(pkg.version ?? apiVersion);
    for (const entry of asArray(pkg.types)) {
      if (!entry.name || !entry.members) throw new Error('Each <types> entry in package.xml needs a <name> and <members>.');
      scope.members[entry.name] = [...new Set([...(scope.members[entry.name] ?? []), ...asArray(entry.members)])];
    }
    if (!Object.keys(scope.members).length) throw new Error('package-xml-path does not list any metadata types.');
  } else {
    for (const type of inputs.metadataTypes) scope.members[type] = ['*'];
    const standardObjects = effectiveStandardObjects(inputs.metadataTypes, inputs.standardObjects);
    if (standardObjects.length) {
      scope.members.CustomObject = ['*', ...standardObjects];
    }
    if (!Object.keys(scope.members).length) {
      throw new Error('metadata-types is empty. List at least one type, for example CustomObject,Profile,ApexClass.');
    }
  }

  scope.notes.push('Only the listed metadata and their child components are compared.');
  if (scope.members.Profile || scope.members.PermissionSet) {
    scope.notes.push(
      'Profile and permission set entries are compared only for objects, fields, classes, pages, tabs, ' +
        'apps and record types that are also in scope.',
    );
  }
  if (scope.kind === 'metadata-types') {
    scope.notes.push('Wildcard retrieval does not include components from managed packages.');
  }
  return scope;
}

export function standardObjectsWarning(scope: ComparisonScope): string | undefined {
  const objects = scope.members.CustomObject;
  if (!objects?.includes('*') || objects.some((member) => member !== '*')) return undefined;
  return 'Standard objects (Account, Contact, and so on) and their custom fields were not compared. ' +
    'List the ones you need in standard-objects.';
}

function memberMatches(type: string, name: string, members: string[] = []): boolean {
  return members.some((member) => {
    if (member === name) return true;
    if (member === '*') return type !== 'CustomObject' || CUSTOM_OBJECT_SUFFIX.test(name);
    if (member.endsWith('/*') || member.endsWith('.*')) return name.startsWith(member.slice(0, -1));
    return false;
  });
}

export function inScope(
  component: Pick<NormalizedComponent, 'metadataType' | 'fullName' | 'parentType' | 'parentName'>,
  scope: ComparisonScope,
): boolean {
  if (memberMatches(component.metadataType, component.fullName, scope.members[component.metadataType])) return true;
  return Boolean(
    component.parentType && component.parentName
      && memberMatches(component.parentType, component.parentName, scope.members[component.parentType]),
  );
}

// [identity element, referenced type, whether the reference is Object.Child]
const PERMISSION_REFERENCES: Record<string, [string, string, boolean?]> = {
  fieldPermissions: ['field', 'CustomField', true],
  objectPermissions: ['object', 'CustomObject'],
  classAccesses: ['apexClass', 'ApexClass'],
  pageAccesses: ['apexPage', 'ApexPage'],
  applicationVisibilities: ['application', 'CustomApplication'],
  tabVisibilities: ['tab', 'CustomTab'],
  tabSettings: ['tab', 'CustomTab'],
  recordTypeVisibilities: ['recordType', 'RecordType', true],
};

/**
 * Salesforce returns profile and permission set entries only for components in
 * the same retrieve, so entries outside the scope are dropped on both sides.
 */
function projectPermissions(component: NormalizedComponent, scope: ComparisonScope): NormalizedComponent {
  if (!['Profile', 'PermissionSet'].includes(component.metadataType)) return component;
  const parsed = parseXml(component.content);
  const body = parsed?.[component.metadataType] as Record<string, unknown> | undefined;
  if (!body) return component;

  for (const [collection, [id, type, objectChild]] of Object.entries(PERMISSION_REFERENCES)) {
    if (!body[collection]) continue;
    const entries = asArray(body[collection] as Record<string, string> | Record<string, string>[]);
    const selected = entries.filter((entry) => inScope({
      metadataType: type,
      fullName: entry[id] ?? '',
      parentType: objectChild ? 'CustomObject' : undefined,
      parentName: objectChild ? entry[id]?.split('.')[0] : undefined,
    }, scope));
    if (!selected.length) delete body[collection];
    else body[collection] = selected.length === 1 ? selected[0] : selected;
  }

  const content = builder.build(parsed);
  const contentHash = hashMetadataContent(content, 'metadata.xml');
  const files = component.files ? new Map(component.files) : undefined;
  if (files?.has('metadata')) files.set('metadata', { ...files.get('metadata')!, content, contentHash });
  return { ...component, content, contentHash, files };
}

export function applyScope(tree: MetadataTree, scope: ComparisonScope): MetadataTree {
  const components = [...tree.components]
    .filter(([, component]) => inScope(component, scope))
    .map(([key, component]) => [key, projectPermissions(component, scope)] as const);
  return { ...tree, components: new Map(components) };
}
