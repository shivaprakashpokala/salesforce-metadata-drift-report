import fs from 'node:fs';
import path from 'node:path';
import { glob } from 'glob';
import { XMLBuilder, XMLValidator } from 'fast-xml-parser';
import type { SourceComponent } from '@salesforce/source-deploy-retrieve';
import type { ComponentFile, MetadataTree, NormalizedComponent } from './types.js';
import { hashContent, hashMetadataContent } from './utils/hash.js';
import { normalizeRelativePath } from './utils/paths.js';
import { parseXml } from './utils/xml.js';

const builder = new XMLBuilder({ ignoreAttributes: false, attributeNamePrefix: '@_' });
const XML_NAMESPACE = 'http://soap.sforce.com/2006/04/metadata';

function metadataRoot(base: string): string {
  const sourceRoot = path.join(base, 'force-app', 'main', 'default');
  return fs.existsSync(sourceRoot) ? sourceRoot : base;
}

function fileData(file: string, root: string, replacement?: string, exactBytes = false): ComponentFile {
  const bytes = fs.readFileSync(file);
  const binary = replacement === undefined
    && (exactBytes || bytes.includes(0) || !Buffer.from(bytes.toString('utf8')).equals(bytes));
  const content = replacement ?? (binary ? '' : bytes.toString('utf8'));
  return {
    relativePath: normalizeRelativePath(path.relative(root, file)),
    content,
    binary,
    contentHash: binary ? hashContent(bytes) : hashMetadataContent(content, replacement ? 'metadata.xml' : file),
  };
}

export async function normalizeMetadataTree(rootPath: string): Promise<MetadataTree> {
  const resolvedRoot = path.resolve(rootPath);
  if (!fs.existsSync(resolvedRoot) || !fs.statSync(resolvedRoot).isDirectory()) {
    throw new Error(`Metadata folder does not exist: ${resolvedRoot}`);
  }
  process.env.SF_DISABLE_LOG_FILE = 'true';
  // Deep imports keep the bundle limited to local resolution, without the
  // registry's network clients. The package version is pinned for this reason.
  const [{ MetadataResolver }, { ForceIgnore }, { SourceComponent: SalesforceComponent }] = await Promise.all([
    import('@salesforce/source-deploy-retrieve/lib/src/resolve/metadataResolver.js'),
    import('@salesforce/source-deploy-retrieve/lib/src/resolve/forceIgnore.js'),
    import('@salesforce/source-deploy-retrieve/lib/src/resolve/sourceComponent.js'),
  ]);
  const root = metadataRoot(resolvedRoot);
  const resolver = new MetadataResolver();
  const components = new Map<string, NormalizedComponent>();
  const handled = new Set<string>();
  const warnings: string[] = [];

  function embeddedObjectChildren(source: SourceComponent): SourceComponent[] {
    // The registry does not split fields out of a Metadata API format .object file.
    const body = parseXml(fs.readFileSync(source.xml!, 'utf8'))?.CustomObject as Record<string, unknown> | undefined;
    const children: SourceComponent[] = [];
    for (const type of Object.values(source.type.children?.types ?? {})) {
      const element = type.xmlElementName ?? type.directoryName;
      const value = body?.[element];
      if (!value) continue;
      for (const entry of (Array.isArray(value) ? value : [value]) as Record<string, string>[]) {
        if (!entry.fullName) throw new Error(`Missing child fullName in ${source.xml}`);
        children.push(new SalesforceComponent({
          name: entry.fullName,
          xml: source.xml,
          parent: source,
          type: { ...type, xmlElementName: element, uniqueIdElement: 'fullName' },
        }));
      }
    }
    return children;
  }

  function metadataXml(source: SourceComponent, children: SourceComponent[]): string {
    let xml = fs.readFileSync(source.xml!, 'utf8');
    if (XMLValidator.validate(xml) !== true) throw new Error(`Invalid metadata XML: ${source.xml}`);

    if (source.parent?.xml === source.xml) {
      // A child embedded in its parent's file gets the same shape as a decomposed child file.
      return builder.build({ [source.type.name]: { ...source.parseXmlSync(), '@_xmlns': XML_NAMESPACE } });
    }
    if (children.some((child) => child.xml === source.xml)) {
      const parsed = parseXml(xml);
      const body = parsed?.[source.type.name] as Record<string, unknown> | undefined;
      if (body) {
        for (const type of Object.values(source.type.children?.types ?? {})) {
          delete body[type.xmlElementName ?? type.directoryName];
        }
        xml = builder.build(parsed);
      }
    }
    return xml;
  }

  function add(source: SourceComponent): void {
    const children = source.getChildren();
    if (source.type.name === 'CustomObject' && !source.content && source.xml) {
      children.push(...embeddedObjectChildren(source));
    }
    for (const child of children) add(child);

    const childPaths = new Set(children.map((child) => child.xml).filter((file) => file !== source.xml));
    const files = new Map<string, ComponentFile>();
    if (source.xml && fs.existsSync(source.xml)) {
      files.set('metadata', fileData(source.xml, root, metadataXml(source, children)));
      handled.add(source.xml);
    }

    const contentIsDirectory = Boolean(source.content && fs.statSync(source.content).isDirectory());
    for (const file of source.walkContent()) {
      if (file === source.xml || childPaths.has(file)) continue;
      const name = contentIsDirectory ? normalizeRelativePath(path.relative(source.content!, file)) : 'source';
      files.set(name, fileData(file, root, undefined, source.type.name === 'StaticResource'));
      handled.add(file);
    }
    if (!files.size) return;

    const primary = files.get('source') ?? files.get('metadata') ?? files.values().next().value!;
    const sortedHashes = [...files]
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([name, file]) => [name, file.contentHash]);
    const key = `${source.type.name}:${source.fullName}`;
    const component: NormalizedComponent = {
      metadataType: source.type.name,
      fullName: source.fullName,
      relativePath: primary.relativePath,
      absolutePath: path.join(root, primary.relativePath),
      content: primary.content,
      contentHash: files.size === 1 ? primary.contentHash : hashContent(JSON.stringify(sortedHashes)),
      files,
      parentType: source.parent?.type.name,
      parentName: source.parent?.fullName,
    };
    const existing = components.get(key);
    if (existing && existing.absolutePath !== component.absolutePath) {
      throw new Error(`Duplicate metadata identity ${key}: ${existing.relativePath} and ${component.relativePath}`);
    }
    components.set(key, component);
  }

  const ignore = ForceIgnore.findAndCreate(root);
  const allFiles = (await glob('**/*', { cwd: root, nodir: true, absolute: true, posix: true })).sort();
  for (const file of allFiles) {
    if (handled.has(file) || ignore.denies(file)) continue;
    if (['package.xml', 'sfdx-project.json'].includes(path.basename(file))) continue;

    let sources: SourceComponent[] = [];
    try {
      sources = resolver.getComponentsFromPath(file);
    } catch {
      sources = [];
    }
    if (sources.length) {
      for (const source of sources) add(source);
    } else if (!resolver.forceIgnoredPaths.has(file)) {
      const data = fileData(file, root);
      components.set(`Unknown:${data.relativePath}`, {
        metadataType: 'Unknown',
        fullName: data.relativePath,
        absolutePath: file,
        relativePath: data.relativePath,
        content: data.content,
        contentHash: data.contentHash,
        files: new Map([['source', data]]),
      });
      warnings.push(`Could not identify the metadata type of ${data.relativePath}`);
    }
  }
  return { rootPath: root, components, warnings };
}
