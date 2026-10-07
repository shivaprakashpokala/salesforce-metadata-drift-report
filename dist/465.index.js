export const id = 465;
export const ids = [465];
export const modules = {

/***/ 19378:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.BaseSourceAdapter = void 0;
/*
 * Copyright 2026, Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const node_path_1 = __webpack_require__(76760);
const messages_1 = __webpack_require__(65603);
const sfError_1 = __webpack_require__(78914);
const ts_types_1 = __webpack_require__(76865);
const path_1 = __webpack_require__(15638);
const forceIgnore_1 = __webpack_require__(51885);
const treeContainers_1 = __webpack_require__(45750);
const sourceComponent_1 = __webpack_require__(17536);
const registryAccess_1 = __webpack_require__(14454);
;
const messages = new messages_1.Messages('@salesforce/source-deploy-retrieve', 'sdr', new Map([["md_request_fail", "Metadata API request failed: %s"], ["error_retry_limit_exceeded", "Exceeded maximum of %s consecutive retryable errors. Last error: %s"], ["error_could_not_infer_type", "%s: Could not infer a metadata type"], ["error_unexpected_child_type", "Unexpected child metadata [%s] found for parent type [%s]"], ["noParent", "Could not find parent type for %s (%s)"], ["error_expected_source_files", "%s: Expected source files for type '%s'"], ["error_failed_convert", "Component conversion failed: %s"], ["error_invalid_test_level", "TestLevel cannot be '%s' unless API version is %s or later"], ["error_merge_metadata_target_unsupported", "Merge convert for metadata target format currently unsupported"], ["error_missing_adapter", "Missing adapter '%s' for metadata type '%s'"], ["error_missing_transformer", "Missing transformer '%s' for metadata type '%s'"], ["error_missing_type_definition", "Missing metadata type definition in registry for id '%s'."], ["error_missing_child_type_definition", "Type %s does not have a child type definition %s."], ["noChildTypes", "No child types found in registry for %s (reading %s at %s)"], ["error_no_metadata_xml_ignore", "Metadata xml file %s is forceignored but is required for %s."], ["noSourceIgnore", "%s metadata types require source files, but %s is forceignored."], ["noSourceIgnore.actions", "- Metadata types with content are composed of two files: a content file (ie MyApexClass.cls) and a -meta.xml file (i.e MyApexClass.cls-meta.xml). You must include both files in your .forceignore file. Or try appending \u201C\\*\u201D to your existing .forceignore entry.\n\nSee <https://developer.salesforce.com/docs/atlas.en-us.sfdx_dev.meta/sfdx_dev/sfdx_dev_exclude_source.htm> for examples"], ["error_path_not_found", "%s: File or folder not found"], ["noContentFound", "SourceComponent %s (metadata type = %s) is missing its content file."], ["noContentFound.actions", ["Ensure the content file exists in the expected location.", "If the content file is in your .forceignore file, ensure the meta-xml file is also ignored to completely exclude it."]], ["error_parsing_xml", "SourceComponent %s (metadata type = %s) does not have an associated metadata xml to parse"], ["error_expected_file_path", "%s: path is to a directory, expected a file"], ["error_expected_directory_path", "%s: path is to a file, expected a directory"], ["error_directory_not_found_or_not_directory", "%s: path is not a directory"], ["error_no_directory_stream", "%s doesn't support readable streams on directories."], ["error_no_source_to_deploy", "No source-backed components present in the package."], ["error_no_components_to_retrieve", "No components in the package to retrieve."], ["error_static_resource_attempting_zip_slip", "Entry '%s' in static resource '%s' resolves to a location outside the extraction directory ('%s')."], ["error_static_resource_symlink", "Entry '%s' in static resource '%s' would be written through a symbolic link ('%s'). Writing through symbolic links is not allowed because it can place files outside the extraction directory ('%s')."], ["error_retrieve_symlink", "File '%s' would be written through a symbolic link ('%s'). Writing through symbolic links is not allowed during retrieve because it can place files outside the project directory ('%s')."], ["error_static_resource_expected_archive_type", "A StaticResource directory must have a content type of application/zip or application/jar - found %s for %s."], ["error_static_resource_missing_resource_file", "A StaticResource must have an associated .resource file, missing %s.resource-meta.xml"], ["error_no_job_id", "The %s operation is missing a job ID. Initialize an operation with an ID, or start a new job."], ["missingApiVersion", "Could not determine an API version to use for the generated manifest. Tried looking for sourceApiVersion in sfdx-project.json, apiVersion from config vars, and the highest apiVersion from the APEX REST endpoint. Using API version 58.0 as a last resort."], ["invalid_xml_parsing", "error parsing %s due to:\\n message: %s\\n line: %s\\n code: %s"], ["zipBufferError", "Zip buffer was not created during conversion"], ["undefinedComponentSet", "Unable to construct a componentSet. Check the logs for more information."], ["replacementsFileNotRead", "The file \"%s\" specified in the \"replacements\" property of sfdx-project.json could not be read."], ["unsupportedBundleType", "Unsupported Bundle Type: %s"], ["filePathGeneratorNoTypeSupport", "Type not supported for filepath generation: %s"], ["missingFolderType", "The registry has %s as is inFolder but it does not have a folderType"], ["tooManyFiles", "Multiple files found for path: %s."], ["cantGetName", "Unable to calculate fullName from path: %s (%s)"], ["missingMetaFileSuffix", "The metadata registry is configured incorrectly for %s. Expected a metaFileSuffix."], ["uniqueIdElementNotInRegistry", "No uniqueIdElement found in registry for %s (reading %s at %s)."], ["uniqueIdElementNotInChild", "The uniqueIdElement %s was not found the child (reading %s at %s)."], ["suggest_type_header", "A metadata type lookup for \"%s\" found the following close matches:"], ["suggest_type_did_you_mean", "-- Did you mean \".%s%s\" instead for the \"%s\" metadata type?"], ["suggest_type_more_suggestions", "Additional suggestions:\nConfirm the file name, extension, and directory names are correct. Validate against the registry at:\n<https://github.com/forcedotcom/source-deploy-retrieve/blob/main/src/registry/metadataRegistry.json>\n\nIf the type is not listed in the registry, check that it has Metadata API support via the Metadata Coverage Report:\n<https://developer.salesforce.com/docs/metadata-coverage>\n\nIf the type is available via Metadata API but not in the registry\n\n- Open an issue <https://github.com/forcedotcom/cli/issues>\n- Add the type via PR. Instructions: <https://github.com/forcedotcom/source-deploy-retrieve/blob/main/contributing/metadata.md>"], ["error_directory_name_path_traversal", "The directoryName '%s' for metadata type '%s' contains path segments that resolve outside the project root. Verify your registryCustomizations in sfdx-project.json do not contain directory traversal sequences."], ["error_write_path_outside_root", "The write path '%s' resolves outside the root destination '%s'. This may indicate a path traversal attempt via registryCustomizations."], ["warning_jwt_api_version", "This org uses JWT-based access tokens, which require API version 68.0 or later for SOAP metadata operations. The current API version is %s, so metadata listing may return empty or incomplete results. To resolve, update sourceApiVersion in sfdx-project.json to 68.0 or higher."], ["type_name_suggestions", "Confirm the metadata type name is correct. Validate against the registry at:\n<https://github.com/forcedotcom/source-deploy-retrieve/blob/main/src/registry/metadataRegistry.json>\n\nIf the type is not listed in the registry, check that it has Metadata API support via the Metadata Coverage Report:\n<https://developer.salesforce.com/docs/metadata-coverage>\n\nIf the type is available via Metadata API but not in the registry\n\n- Open an issue <https://github.com/forcedotcom/cli/issues>\n- Add the type via PR. Instructions: <https://github.com/forcedotcom/source-deploy-retrieve/blob/main/contributing/metadata.md>"]]));
const NAME_AND_SUFFIX_REGEX = /(.+)\.(.+)/;
const FOLDER_META_XML_STRICT_REGEX = /(.+)-meta\.xml$/;
class BaseSourceAdapter {
    type;
    registry;
    forceIgnore;
    tree;
    /**
     * Whether or not an adapter should expect a component to be in its own, self-named
     * folder, including its root metadata xml file.
     */
    ownFolder = false;
    metadataWithContent = true;
    constructor(type, registry = new registryAccess_1.RegistryAccess(), forceIgnore = new forceIgnore_1.ForceIgnore(), tree = new treeContainers_1.NodeFSTreeContainer()) {
        this.type = type;
        this.registry = registry;
        this.forceIgnore = forceIgnore;
        this.tree = tree;
    }
    getComponent(path, isResolvingSource = true) {
        let rootMetadata = this.parseAsRootMetadataXml(path);
        if (!rootMetadata) {
            const rootMetadataPath = this.getRootMetadataXmlPath(path);
            if (rootMetadataPath) {
                rootMetadata = this.parseMetadataXml(rootMetadataPath);
            }
        }
        if (rootMetadata && this.forceIgnore.denies(rootMetadata.path)) {
            throw new sfError_1.SfError(messages.getMessage('error_no_metadata_xml_ignore', [rootMetadata.path, path]), 'UnexpectedForceIgnore');
        }
        let component;
        if (rootMetadata) {
            const name = calculateName(this.registry)(this.type)(rootMetadata);
            component = new sourceComponent_1.SourceComponent({
                name,
                type: this.type,
                xml: rootMetadata.path,
                parentType: this.type.folderType ? this.registry.getTypeByName(this.type.folderType) : undefined,
            }, this.tree, this.forceIgnore);
        }
        return this.populate(path, component, isResolvingSource);
    }
    /**
     * Control whether metadata and content metadata files are allowed for an adapter.
     */
    allowMetadataWithContent() {
        return this.metadataWithContent;
    }
    /**
     * If the path given to `getComponent` is the root metadata xml file for a component,
     * parse the name and return it. This is an optimization to not make a child adapter do
     * anymore work to find it.
     *
     * @param path File path of a metadata component
     */
    parseAsRootMetadataXml(path) {
        const metaXml = this.parseMetadataXml(path);
        if (metaXml) {
            let isRootMetadataXml = false;
            if (this.type.strictDirectoryName) {
                const parentPath = (0, node_path_1.dirname)(path);
                const typeDirName = (0, node_path_1.basename)(this.type.inFolder ? (0, node_path_1.dirname)(parentPath) : parentPath);
                const nameMatchesParent = (0, node_path_1.basename)(parentPath) === metaXml.fullName;
                const inTypeDir = typeDirName === this.type.directoryName;
                const rootSuffixes = [this.type.suffix, this.type.legacySuffix].filter(Boolean);
                const suffixMatchesRoot = rootSuffixes.includes(metaXml.suffix);
                // Decomposed children can share the parent fullName (for example,
                // MyPermissionSet.applicationVisibility-meta.xml). The suffix must
                // identify the parent before the directory name can confirm it.
                isRootMetadataXml = suffixMatchesRoot && (nameMatchesParent || inTypeDir);
            }
            else {
                isRootMetadataXml = true;
            }
            return isRootMetadataXml ? metaXml : undefined;
        }
        const folderMetadataXml = parseAsFolderMetadataXml(path);
        if (folderMetadataXml) {
            return folderMetadataXml;
        }
        if (!this.allowMetadataWithContent()) {
            return parseAsContentMetadataXml(this.type)(path);
        }
    }
    // allowed to preserve API
    // eslint-disable-next-line class-methods-use-this
    parseMetadataXml(path) {
        return (0, path_1.parseMetadataXml)(path);
    }
}
exports.BaseSourceAdapter = BaseSourceAdapter;
/**
 * If the path given to `getComponent` serves as the sole definition (metadata and content)
 * for a component, parse the name and return it. This allows matching files in metadata
 * format such as:
 *
 * .../tabs/MyTab.tab
 *
 * @param path File path of a metadata component
 */
const parseAsContentMetadataXml = (type) => (path) => {
    // InFolder metadata can be nested more than 1 level beneath its
    // associated directoryName.
    if (type.inFolder) {
        const fullName = (0, path_1.parseNestedFullName)(path, type.directoryName);
        if (fullName && type.suffix) {
            return { fullName, suffix: type.suffix, path };
        }
    }
    const parentPath = (0, node_path_1.dirname)(path);
    const parts = parentPath.split(node_path_1.sep);
    const typeFolderIndex = parts.lastIndexOf(type.directoryName);
    // nestedTypes (ex: territory2) have a folderType equal to their type but are themselves
    // in a folder per metadata item, with child folders for rules/territories
    const allowedIndex = type.folderType === type.id ? parts.length - 2 : parts.length - 1;
    if (typeFolderIndex !== allowedIndex) {
        return undefined;
    }
    const match = NAME_AND_SUFFIX_REGEX.exec((0, node_path_1.basename)(path));
    if (match && type.suffix === match[2]) {
        return { fullName: match[1], suffix: match[2], path };
    }
};
const parseAsFolderMetadataXml = (fsPath) => {
    const match = FOLDER_META_XML_STRICT_REGEX.exec((0, node_path_1.basename)(fsPath));
    const parts = fsPath.split(node_path_1.sep);
    if (match && !match[1].includes('.') && parts.length > 1) {
        return { fullName: match[1], suffix: undefined, path: fsPath };
    }
};
// Given a MetadataXml, build a fullName from the path and type.
const calculateName = (registry) => (type) => (rootMetadata) => {
    const { directoryName, inFolder, folderType, folderContentType } = type;
    // inFolder types (report, dashboard, emailTemplate, document) and their folder
    // container types (reportFolder, dashboardFolder, emailFolder, documentFolder)
    if (folderContentType ?? inFolder) {
        return (0, ts_types_1.ensureString)((0, path_1.parseNestedFullName)(rootMetadata.path, directoryName), `Unable to calculate fullName from component at path: ${rootMetadata.path} (${type.name})`);
    }
    // not using folders?  then name is fullname
    if (!folderType) {
        return rootMetadata.fullName;
    }
    const grandparentType = registry.getTypeByName(folderType);
    // type is nested inside another type (ex: Territory2Model).  So the names are modelName.ruleName or modelName.territoryName
    if (grandparentType.folderType && grandparentType.folderType !== type.id) {
        const splits = rootMetadata.path.split(node_path_1.sep);
        return `${splits[splits.indexOf(grandparentType.directoryName) + 1]}.${rootMetadata.fullName}`;
    }
    // this is the top level of nested types (ex: in a Territory2Model, the Territory2Model)
    if (grandparentType.folderType === type.id) {
        return rootMetadata.fullName;
    }
    throw messages.createError('cantGetName', [rootMetadata.path, type.name]);
};
//# sourceMappingURL=baseSourceAdapter.js.map

/***/ }),

/***/ 28489:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.BundleSourceAdapter = void 0;
const mixedContentSourceAdapter_1 = __webpack_require__(35545);
/**
 * Handles _bundle_ types. A bundle component has all its source files, including the
 * root metadata xml, contained in its own directory.
 *
 * __Example Types__:
 *
 * LightningComponentBundle, AuraDefinitionBundle, CustomObject
 *
 * __Example Structure__:
 * ```text
 * foos/
 * ├── myFoo/
 * |   ├── myFoo.js
 * |   ├── myFooStyle.css
 * |   ├── myFoo.html
 * |   ├── myFoo.js-meta.xml
 *```
 */
class BundleSourceAdapter extends mixedContentSourceAdapter_1.MixedContentSourceAdapter {
    ownFolder = true;
    /**
     * Excludes empty bundle directories.
     *
     * e.g.
     * lwc/
     * ├── myFoo/
     * |   ├── myFoo.js
     * |   ├── myFooStyle.css
     * |   ├── myFoo.html
     * |   ├── myFoo.js-meta.xml
     * ├── emptyLWC/
     *
     * so we shouldn't populate with the `emptyLWC` directory
     *
     * @param trigger Path that `getComponent` was called with
     * @param component Component to populate properties on
     * @protected
     */
    populate(trigger, component) {
        if (this.tree.isDirectory(trigger)) {
            if (!this.tree.readDirectory(trigger)?.length) {
                // if it's an empty directory, don't include it (e.g., lwc/emptyLWC)
                return;
            }
        }
        else if (!component) {
            const componentRoot = this.trimPathToContent(trigger);
            if (!this.tree.isDirectory(componentRoot)) {
                // the file sits directly inside the type directory (e.g., lwc/README.md)
                // rather than inside a component bundle folder — it is not a valid component
                return;
            }
        }
        return super.populate(trigger, component);
    }
}
exports.BundleSourceAdapter = BundleSourceAdapter;
//# sourceMappingURL=bundleSourceAdapter.js.map

/***/ }),

/***/ 50668:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DecomposedSourceAdapter = void 0;
/*
 * Copyright 2026, Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const messages_1 = __webpack_require__(65603);
const sfError_1 = __webpack_require__(78914);
const sourceComponent_1 = __webpack_require__(17536);
const path_1 = __webpack_require__(15638);
const mixedContentSourceAdapter_1 = __webpack_require__(35545);
;
const messages = new messages_1.Messages('@salesforce/source-deploy-retrieve', 'sdr', new Map([["md_request_fail", "Metadata API request failed: %s"], ["error_retry_limit_exceeded", "Exceeded maximum of %s consecutive retryable errors. Last error: %s"], ["error_could_not_infer_type", "%s: Could not infer a metadata type"], ["error_unexpected_child_type", "Unexpected child metadata [%s] found for parent type [%s]"], ["noParent", "Could not find parent type for %s (%s)"], ["error_expected_source_files", "%s: Expected source files for type '%s'"], ["error_failed_convert", "Component conversion failed: %s"], ["error_invalid_test_level", "TestLevel cannot be '%s' unless API version is %s or later"], ["error_merge_metadata_target_unsupported", "Merge convert for metadata target format currently unsupported"], ["error_missing_adapter", "Missing adapter '%s' for metadata type '%s'"], ["error_missing_transformer", "Missing transformer '%s' for metadata type '%s'"], ["error_missing_type_definition", "Missing metadata type definition in registry for id '%s'."], ["error_missing_child_type_definition", "Type %s does not have a child type definition %s."], ["noChildTypes", "No child types found in registry for %s (reading %s at %s)"], ["error_no_metadata_xml_ignore", "Metadata xml file %s is forceignored but is required for %s."], ["noSourceIgnore", "%s metadata types require source files, but %s is forceignored."], ["noSourceIgnore.actions", "- Metadata types with content are composed of two files: a content file (ie MyApexClass.cls) and a -meta.xml file (i.e MyApexClass.cls-meta.xml). You must include both files in your .forceignore file. Or try appending \u201C\\*\u201D to your existing .forceignore entry.\n\nSee <https://developer.salesforce.com/docs/atlas.en-us.sfdx_dev.meta/sfdx_dev/sfdx_dev_exclude_source.htm> for examples"], ["error_path_not_found", "%s: File or folder not found"], ["noContentFound", "SourceComponent %s (metadata type = %s) is missing its content file."], ["noContentFound.actions", ["Ensure the content file exists in the expected location.", "If the content file is in your .forceignore file, ensure the meta-xml file is also ignored to completely exclude it."]], ["error_parsing_xml", "SourceComponent %s (metadata type = %s) does not have an associated metadata xml to parse"], ["error_expected_file_path", "%s: path is to a directory, expected a file"], ["error_expected_directory_path", "%s: path is to a file, expected a directory"], ["error_directory_not_found_or_not_directory", "%s: path is not a directory"], ["error_no_directory_stream", "%s doesn't support readable streams on directories."], ["error_no_source_to_deploy", "No source-backed components present in the package."], ["error_no_components_to_retrieve", "No components in the package to retrieve."], ["error_static_resource_attempting_zip_slip", "Entry '%s' in static resource '%s' resolves to a location outside the extraction directory ('%s')."], ["error_static_resource_symlink", "Entry '%s' in static resource '%s' would be written through a symbolic link ('%s'). Writing through symbolic links is not allowed because it can place files outside the extraction directory ('%s')."], ["error_retrieve_symlink", "File '%s' would be written through a symbolic link ('%s'). Writing through symbolic links is not allowed during retrieve because it can place files outside the project directory ('%s')."], ["error_static_resource_expected_archive_type", "A StaticResource directory must have a content type of application/zip or application/jar - found %s for %s."], ["error_static_resource_missing_resource_file", "A StaticResource must have an associated .resource file, missing %s.resource-meta.xml"], ["error_no_job_id", "The %s operation is missing a job ID. Initialize an operation with an ID, or start a new job."], ["missingApiVersion", "Could not determine an API version to use for the generated manifest. Tried looking for sourceApiVersion in sfdx-project.json, apiVersion from config vars, and the highest apiVersion from the APEX REST endpoint. Using API version 58.0 as a last resort."], ["invalid_xml_parsing", "error parsing %s due to:\\n message: %s\\n line: %s\\n code: %s"], ["zipBufferError", "Zip buffer was not created during conversion"], ["undefinedComponentSet", "Unable to construct a componentSet. Check the logs for more information."], ["replacementsFileNotRead", "The file \"%s\" specified in the \"replacements\" property of sfdx-project.json could not be read."], ["unsupportedBundleType", "Unsupported Bundle Type: %s"], ["filePathGeneratorNoTypeSupport", "Type not supported for filepath generation: %s"], ["missingFolderType", "The registry has %s as is inFolder but it does not have a folderType"], ["tooManyFiles", "Multiple files found for path: %s."], ["cantGetName", "Unable to calculate fullName from path: %s (%s)"], ["missingMetaFileSuffix", "The metadata registry is configured incorrectly for %s. Expected a metaFileSuffix."], ["uniqueIdElementNotInRegistry", "No uniqueIdElement found in registry for %s (reading %s at %s)."], ["uniqueIdElementNotInChild", "The uniqueIdElement %s was not found the child (reading %s at %s)."], ["suggest_type_header", "A metadata type lookup for \"%s\" found the following close matches:"], ["suggest_type_did_you_mean", "-- Did you mean \".%s%s\" instead for the \"%s\" metadata type?"], ["suggest_type_more_suggestions", "Additional suggestions:\nConfirm the file name, extension, and directory names are correct. Validate against the registry at:\n<https://github.com/forcedotcom/source-deploy-retrieve/blob/main/src/registry/metadataRegistry.json>\n\nIf the type is not listed in the registry, check that it has Metadata API support via the Metadata Coverage Report:\n<https://developer.salesforce.com/docs/metadata-coverage>\n\nIf the type is available via Metadata API but not in the registry\n\n- Open an issue <https://github.com/forcedotcom/cli/issues>\n- Add the type via PR. Instructions: <https://github.com/forcedotcom/source-deploy-retrieve/blob/main/contributing/metadata.md>"], ["error_directory_name_path_traversal", "The directoryName '%s' for metadata type '%s' contains path segments that resolve outside the project root. Verify your registryCustomizations in sfdx-project.json do not contain directory traversal sequences."], ["error_write_path_outside_root", "The write path '%s' resolves outside the root destination '%s'. This may indicate a path traversal attempt via registryCustomizations."], ["warning_jwt_api_version", "This org uses JWT-based access tokens, which require API version 68.0 or later for SOAP metadata operations. The current API version is %s, so metadata listing may return empty or incomplete results. To resolve, update sourceApiVersion in sfdx-project.json to 68.0 or higher."], ["type_name_suggestions", "Confirm the metadata type name is correct. Validate against the registry at:\n<https://github.com/forcedotcom/source-deploy-retrieve/blob/main/src/registry/metadataRegistry.json>\n\nIf the type is not listed in the registry, check that it has Metadata API support via the Metadata Coverage Report:\n<https://developer.salesforce.com/docs/metadata-coverage>\n\nIf the type is available via Metadata API but not in the registry\n\n- Open an issue <https://github.com/forcedotcom/cli/issues>\n- Add the type via PR. Instructions: <https://github.com/forcedotcom/source-deploy-retrieve/blob/main/contributing/metadata.md>"]]));
/**
 * Handles decomposed types. A flavor of mixed content where a component can
 * have additional -meta.xml files that represent child components of the main
 * component.
 *
 * __Example Types__:
 *
 * CustomObject, CustomObjectTranslation
 *
 * __Example Structures__:
 *
 *```text
 * foos/
 * ├── MyFoo__c/
 * |   ├── MyFoo__c.foo-meta.xml
 * |   ├── bars/
 * |      ├── a.bar-meta.xml
 * |      ├── b.bar-meta.xml
 * |      ├── c.bar-meta.xml
 *
 * foos/
 * ├── MyFoo__c/
 * |   ├── a.bar-meta.xml
 * |   ├── MyFoo__c.foo-meta.xml
 * |   ├── b.bar-meta.xml
 * |   ├── c.bar-meta.xml
 *```
 */
class DecomposedSourceAdapter extends mixedContentSourceAdapter_1.MixedContentSourceAdapter {
    ownFolder = true;
    metadataWithContent = false;
    getComponent(path, isResolvingSource = true) {
        let rootMetadata = super.parseAsRootMetadataXml(path);
        if (!rootMetadata) {
            const rootMetadataPath = this.getRootMetadataXmlPath(path);
            if (rootMetadataPath) {
                rootMetadata = (0, path_1.parseMetadataXml)(rootMetadataPath);
            }
        }
        let component;
        if (rootMetadata) {
            const componentName = this.type.folderType
                ? `${(0, path_1.parentName)(rootMetadata.path)}/${rootMetadata.fullName}`
                : rootMetadata.fullName;
            component = new sourceComponent_1.SourceComponent({
                name: componentName,
                type: this.type,
                xml: rootMetadata.path,
            }, this.tree, this.forceIgnore);
        }
        return this.populate(path, component, isResolvingSource);
    }
    /**
     * If the trigger turns out to be part of an addressable child component, `populate` will build
     * the child component, set its parent property to the one created by the
     * `BaseSourceAdapter`, and return the child component instead.
     */
    populate(trigger, component, isResolvingSource) {
        const metaXml = (0, path_1.parseMetadataXml)(trigger);
        if (metaXml?.suffix) {
            const pathToContent = this.trimPathToContent(trigger);
            const childTypeId = this.type.children?.suffixes?.[metaXml.suffix];
            const triggerIsAChild = !!childTypeId;
            const strategy = this.type.strategies?.decomposition;
            if (triggerIsAChild &&
                this.type.children &&
                !this.type.children.types[childTypeId].unaddressableWithoutParent &&
                this.type.children.types[childTypeId].isAddressable !== false) {
                if (strategy === 'folderPerType' || strategy === 'topLevel' || isResolvingSource) {
                    const parent = component ??
                        new sourceComponent_1.SourceComponent({
                            name: strategy === 'folderPerType' ? (0, path_1.baseName)(pathToContent) : pathToContent,
                            type: this.type,
                        }, this.tree, this.forceIgnore);
                    parent.content = pathToContent;
                    return new sourceComponent_1.SourceComponent({
                        name: metaXml.fullName,
                        type: this.type.children.types[childTypeId],
                        xml: trigger,
                        parent,
                    }, this.tree, this.forceIgnore);
                }
            }
            else if (!component) {
                // This is most likely metadata found within a CustomObject folder that is not a
                // child type of CustomObject. E.g., Layout, SharingRules, ApexClass.
                throw new sfError_1.SfError(messages.getMessage('error_unexpected_child_type', [trigger, this.type.name]), 'TypeInferenceError');
            }
            if (component) {
                component.content = pathToContent;
            }
        }
        return component;
    }
}
exports.DecomposedSourceAdapter = DecomposedSourceAdapter;
//# sourceMappingURL=decomposedSourceAdapter.js.map

/***/ }),

/***/ 52818:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DefaultSourceAdapter = void 0;
const baseSourceAdapter_1 = __webpack_require__(19378);
/**
 * The default source adapter. Handles simple types with no additional content.
 *
 * __Example Types__:
 *
 * Layouts, PermissionSets, FlexiPages
 *
 * __Example Structure__:
 * ```text
 * foos/
 * ├── foo.ext-meta.xml
 * ├── bar.ext-meta.xml
 *```
 */
class DefaultSourceAdapter extends baseSourceAdapter_1.BaseSourceAdapter {
    metadataWithContent = false;
    /* istanbul ignore next */
    // retained to preserve API
    // eslint-disable-next-line class-methods-use-this
    getRootMetadataXmlPath(trigger) {
        // istanbul ignored for code coverage since this return won't ever be hit,
        // unless future changes permit otherwise. Remove the ignore and these comments
        // if this method is expected to be entered.
        return trigger;
    }
    // retained to preserve API
    // eslint-disable-next-line class-methods-use-this
    populate(trigger, component) {
        return component;
    }
}
exports.DefaultSourceAdapter = DefaultSourceAdapter;
//# sourceMappingURL=defaultSourceAdapter.js.map

/***/ }),

/***/ 64361:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DigitalExperienceSourceAdapter = void 0;
/*
 * Copyright 2026, Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const node_path_1 = __webpack_require__(76760);
const messages_1 = __webpack_require__(65603);
const ts_types_1 = __webpack_require__(76865);
const constants_1 = __webpack_require__(51280);
const sourceComponent_1 = __webpack_require__(17536);
const path_1 = __webpack_require__(15638);
const bundleSourceAdapter_1 = __webpack_require__(28489);
;
const messages = new messages_1.Messages('@salesforce/source-deploy-retrieve', 'sdr', new Map([["md_request_fail", "Metadata API request failed: %s"], ["error_retry_limit_exceeded", "Exceeded maximum of %s consecutive retryable errors. Last error: %s"], ["error_could_not_infer_type", "%s: Could not infer a metadata type"], ["error_unexpected_child_type", "Unexpected child metadata [%s] found for parent type [%s]"], ["noParent", "Could not find parent type for %s (%s)"], ["error_expected_source_files", "%s: Expected source files for type '%s'"], ["error_failed_convert", "Component conversion failed: %s"], ["error_invalid_test_level", "TestLevel cannot be '%s' unless API version is %s or later"], ["error_merge_metadata_target_unsupported", "Merge convert for metadata target format currently unsupported"], ["error_missing_adapter", "Missing adapter '%s' for metadata type '%s'"], ["error_missing_transformer", "Missing transformer '%s' for metadata type '%s'"], ["error_missing_type_definition", "Missing metadata type definition in registry for id '%s'."], ["error_missing_child_type_definition", "Type %s does not have a child type definition %s."], ["noChildTypes", "No child types found in registry for %s (reading %s at %s)"], ["error_no_metadata_xml_ignore", "Metadata xml file %s is forceignored but is required for %s."], ["noSourceIgnore", "%s metadata types require source files, but %s is forceignored."], ["noSourceIgnore.actions", "- Metadata types with content are composed of two files: a content file (ie MyApexClass.cls) and a -meta.xml file (i.e MyApexClass.cls-meta.xml). You must include both files in your .forceignore file. Or try appending \u201C\\*\u201D to your existing .forceignore entry.\n\nSee <https://developer.salesforce.com/docs/atlas.en-us.sfdx_dev.meta/sfdx_dev/sfdx_dev_exclude_source.htm> for examples"], ["error_path_not_found", "%s: File or folder not found"], ["noContentFound", "SourceComponent %s (metadata type = %s) is missing its content file."], ["noContentFound.actions", ["Ensure the content file exists in the expected location.", "If the content file is in your .forceignore file, ensure the meta-xml file is also ignored to completely exclude it."]], ["error_parsing_xml", "SourceComponent %s (metadata type = %s) does not have an associated metadata xml to parse"], ["error_expected_file_path", "%s: path is to a directory, expected a file"], ["error_expected_directory_path", "%s: path is to a file, expected a directory"], ["error_directory_not_found_or_not_directory", "%s: path is not a directory"], ["error_no_directory_stream", "%s doesn't support readable streams on directories."], ["error_no_source_to_deploy", "No source-backed components present in the package."], ["error_no_components_to_retrieve", "No components in the package to retrieve."], ["error_static_resource_attempting_zip_slip", "Entry '%s' in static resource '%s' resolves to a location outside the extraction directory ('%s')."], ["error_static_resource_symlink", "Entry '%s' in static resource '%s' would be written through a symbolic link ('%s'). Writing through symbolic links is not allowed because it can place files outside the extraction directory ('%s')."], ["error_retrieve_symlink", "File '%s' would be written through a symbolic link ('%s'). Writing through symbolic links is not allowed during retrieve because it can place files outside the project directory ('%s')."], ["error_static_resource_expected_archive_type", "A StaticResource directory must have a content type of application/zip or application/jar - found %s for %s."], ["error_static_resource_missing_resource_file", "A StaticResource must have an associated .resource file, missing %s.resource-meta.xml"], ["error_no_job_id", "The %s operation is missing a job ID. Initialize an operation with an ID, or start a new job."], ["missingApiVersion", "Could not determine an API version to use for the generated manifest. Tried looking for sourceApiVersion in sfdx-project.json, apiVersion from config vars, and the highest apiVersion from the APEX REST endpoint. Using API version 58.0 as a last resort."], ["invalid_xml_parsing", "error parsing %s due to:\\n message: %s\\n line: %s\\n code: %s"], ["zipBufferError", "Zip buffer was not created during conversion"], ["undefinedComponentSet", "Unable to construct a componentSet. Check the logs for more information."], ["replacementsFileNotRead", "The file \"%s\" specified in the \"replacements\" property of sfdx-project.json could not be read."], ["unsupportedBundleType", "Unsupported Bundle Type: %s"], ["filePathGeneratorNoTypeSupport", "Type not supported for filepath generation: %s"], ["missingFolderType", "The registry has %s as is inFolder but it does not have a folderType"], ["tooManyFiles", "Multiple files found for path: %s."], ["cantGetName", "Unable to calculate fullName from path: %s (%s)"], ["missingMetaFileSuffix", "The metadata registry is configured incorrectly for %s. Expected a metaFileSuffix."], ["uniqueIdElementNotInRegistry", "No uniqueIdElement found in registry for %s (reading %s at %s)."], ["uniqueIdElementNotInChild", "The uniqueIdElement %s was not found the child (reading %s at %s)."], ["suggest_type_header", "A metadata type lookup for \"%s\" found the following close matches:"], ["suggest_type_did_you_mean", "-- Did you mean \".%s%s\" instead for the \"%s\" metadata type?"], ["suggest_type_more_suggestions", "Additional suggestions:\nConfirm the file name, extension, and directory names are correct. Validate against the registry at:\n<https://github.com/forcedotcom/source-deploy-retrieve/blob/main/src/registry/metadataRegistry.json>\n\nIf the type is not listed in the registry, check that it has Metadata API support via the Metadata Coverage Report:\n<https://developer.salesforce.com/docs/metadata-coverage>\n\nIf the type is available via Metadata API but not in the registry\n\n- Open an issue <https://github.com/forcedotcom/cli/issues>\n- Add the type via PR. Instructions: <https://github.com/forcedotcom/source-deploy-retrieve/blob/main/contributing/metadata.md>"], ["error_directory_name_path_traversal", "The directoryName '%s' for metadata type '%s' contains path segments that resolve outside the project root. Verify your registryCustomizations in sfdx-project.json do not contain directory traversal sequences."], ["error_write_path_outside_root", "The write path '%s' resolves outside the root destination '%s'. This may indicate a path traversal attempt via registryCustomizations."], ["warning_jwt_api_version", "This org uses JWT-based access tokens, which require API version 68.0 or later for SOAP metadata operations. The current API version is %s, so metadata listing may return empty or incomplete results. To resolve, update sourceApiVersion in sfdx-project.json to 68.0 or higher."], ["type_name_suggestions", "Confirm the metadata type name is correct. Validate against the registry at:\n<https://github.com/forcedotcom/source-deploy-retrieve/blob/main/src/registry/metadataRegistry.json>\n\nIf the type is not listed in the registry, check that it has Metadata API support via the Metadata Coverage Report:\n<https://developer.salesforce.com/docs/metadata-coverage>\n\nIf the type is available via Metadata API but not in the registry\n\n- Open an issue <https://github.com/forcedotcom/cli/issues>\n- Add the type via PR. Instructions: <https://github.com/forcedotcom/source-deploy-retrieve/blob/main/contributing/metadata.md>"]]));
/**
 * Source Adapter for DigitalExperience metadata types. This metadata type is a bundled type of the format
 *
 * __Example Structure__:
 *
 *```text
 * site/
 * ├── foos/
 * |   ├── sfdc_cms__appPage/
 * |   |   ├── mainAppPage/
 * |   |   |  ├── _meta.json
 * |   |   |  ├── content.json
 * |   ├── sfdc_cms__view/
 * |   |   ├── view1/
 * |   |   |  ├── _meta.json
 * |   |   |  ├── content.json
 * |   |   |  ├── fr.json
 * |   |   |  ├── en.json
 * |   |   ├── view2/
 * |   |   |  ├── _meta.json
 * |   |   |  ├── content.json
 * |   |   |  ├── ar.json
 * |   |   ├── view3/
 * |   |   |  ├── _meta.json
 * |   |   |  ├── content.json
 * |   |   |  ├── mobile/
 * |   |   |  |   ├──mobile.json
 * |   |   |  ├── tablet/
 * |   |   |  |   ├──tablet.json
 * |   ├── foos.digitalExperience-meta.xml
 * content/
 * ├── bars/
 * |   ├── bars.digitalExperience-meta.xml
 * ```
 *
 * In the above structure the metadata xml file ending with "digitalExperience-meta.xml" belongs to DigitalExperienceBundle MD type.
 * The "_meta.json" files are child metadata files of DigitalExperienceBundle belonging to DigitalExperience MD type. The rest of the files in the
 * corresponding folder are the contents to the DigitalExperience metadata. So, incase of DigitalExperience the metadata file is a JSON file
 * and not an XML file
 */
class DigitalExperienceSourceAdapter extends bundleSourceAdapter_1.BundleSourceAdapter {
    getRootMetadataXmlPath(trigger) {
        if (this.isBundleType()) {
            return this.getBundleMetadataXmlPath(trigger);
        }
        // metafile name = metaFileSuffix for DigitalExperience.
        if (!this.type.metaFileSuffix) {
            throw messages.createError('missingMetaFileSuffix', [this.type.name]);
        }
        return (0, node_path_1.join)((0, node_path_1.dirname)(trigger), this.type.metaFileSuffix);
    }
    trimPathToContent(path) {
        if (this.isBundleType()) {
            return path;
        }
        const pathToContent = (0, node_path_1.dirname)(path);
        const parts = pathToContent.split(node_path_1.sep);
        /* Handle mobile or tablet variants.Eg- digitalExperiences/site/lwr11/sfdc_cms__view/home/mobile/mobile.json
          or inline media files where files can be in any subdiretory. Eg - digitalExperiences/site/lwr11/sfdc_cms__lwc/localComp/folder1/foler1_1/localCompHelper.html
          from the digitalExperience folder go till we find the ContentApiName folder
         */
        const digitalExperiencesIndex = parts.indexOf('digitalExperiences');
        if (digitalExperiencesIndex > -1) {
            const digitalExperiencesLength = digitalExperiencesIndex + 1;
            const contentFolderLength = digitalExperiencesLength + contentParts.length;
            if (parts.length > contentFolderLength) {
                parts.length = contentFolderLength;
                return parts.join(node_path_1.sep);
            }
        }
        return pathToContent;
    }
    populate(trigger, component) {
        if (this.isBundleType() && component) {
            // for top level types we don't need to resolve parent
            return component;
        }
        const source = super.populate(trigger, component);
        const parentType = this.registry.getParentType(this.type.id);
        // we expect source, parentType and content to be defined.
        if (!source || !parentType || !source.content) {
            throw messages.createError('error_failed_convert', [component?.fullName ?? this.type.name]);
        }
        const parent = new sourceComponent_1.SourceComponent({
            name: this.getBundleName(source.content),
            type: parentType,
            xml: this.getBundleMetadataXmlPath(source.content),
        }, this.tree, this.forceIgnore);
        return new sourceComponent_1.SourceComponent({
            name: calculateNameFromPath(source.content),
            type: this.type,
            content: source.content,
            xml: source.xml,
            parent,
            parentType,
        }, this.tree, this.forceIgnore);
    }
    parseMetadataXml(path) {
        const xml = super.parseMetadataXml(path);
        if (xml && this.isBundleType()) {
            return {
                fullName: this.getBundleName(path),
                suffix: xml.suffix,
                path: xml.path,
            };
        }
    }
    getBundleName(contentPath) {
        const bundlePath = this.getBundleMetadataXmlPath(contentPath);
        return `${(0, path_1.parentName)((0, node_path_1.dirname)(bundlePath))}/${(0, path_1.parentName)(bundlePath)}`;
    }
    getBundleMetadataXmlPath(path) {
        if (this.isBundleType() && path.endsWith(constants_1.META_XML_SUFFIX)) {
            // if this is the bundle type and it ends with -meta.xml, then this is the bundle metadata xml path
            return path;
        }
        const pathParts = path.split(node_path_1.sep);
        const typeFolderIndex = pathParts.lastIndexOf(this.type.directoryName);
        // 3 because we want 'digitalExperiences' directory, 'baseType' directory and 'bundleName' directory
        const basePath = pathParts.slice(0, typeFolderIndex + 3).join(node_path_1.sep);
        const bundleFileName = pathParts[typeFolderIndex + 2];
        const suffix = (0, ts_types_1.ensureString)(this.isBundleType() ? this.type.suffix : this.registry.getParentType(this.type.id)?.suffix);
        return `${basePath}${node_path_1.sep}${bundleFileName}.${suffix}${constants_1.META_XML_SUFFIX}`;
    }
    isBundleType() {
        return this.type.id === 'digitalexperiencebundle';
    }
}
exports.DigitalExperienceSourceAdapter = DigitalExperienceSourceAdapter;
/**
 * @param contentPath This hook is called only after trimPathToContent() is called. so this will always be a folder structure
 * @returns name of type/apiName format
 */
const calculateNameFromPath = (contentPath) => `${(0, path_1.parentName)(contentPath)}/${(0, path_1.baseName)(contentPath)}`;
const digitalExperienceStructure = (0, node_path_1.join)('BaseType', 'SpaceApiName', 'ContentType', 'ContentApiName');
const contentParts = digitalExperienceStructure.split(node_path_1.sep);
//# sourceMappingURL=digitalExperienceSourceAdapter.js.map

/***/ }),

/***/ 40849:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.MatchingContentSourceAdapter = void 0;
/*
 * Copyright 2026, Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const messages_1 = __webpack_require__(65603);
const sfError_1 = __webpack_require__(78914);
const constants_1 = __webpack_require__(51280);
const path_1 = __webpack_require__(15638);
const baseSourceAdapter_1 = __webpack_require__(19378);
;
const messages = new messages_1.Messages('@salesforce/source-deploy-retrieve', 'sdr', new Map([["md_request_fail", "Metadata API request failed: %s"], ["error_retry_limit_exceeded", "Exceeded maximum of %s consecutive retryable errors. Last error: %s"], ["error_could_not_infer_type", "%s: Could not infer a metadata type"], ["error_unexpected_child_type", "Unexpected child metadata [%s] found for parent type [%s]"], ["noParent", "Could not find parent type for %s (%s)"], ["error_expected_source_files", "%s: Expected source files for type '%s'"], ["error_failed_convert", "Component conversion failed: %s"], ["error_invalid_test_level", "TestLevel cannot be '%s' unless API version is %s or later"], ["error_merge_metadata_target_unsupported", "Merge convert for metadata target format currently unsupported"], ["error_missing_adapter", "Missing adapter '%s' for metadata type '%s'"], ["error_missing_transformer", "Missing transformer '%s' for metadata type '%s'"], ["error_missing_type_definition", "Missing metadata type definition in registry for id '%s'."], ["error_missing_child_type_definition", "Type %s does not have a child type definition %s."], ["noChildTypes", "No child types found in registry for %s (reading %s at %s)"], ["error_no_metadata_xml_ignore", "Metadata xml file %s is forceignored but is required for %s."], ["noSourceIgnore", "%s metadata types require source files, but %s is forceignored."], ["noSourceIgnore.actions", "- Metadata types with content are composed of two files: a content file (ie MyApexClass.cls) and a -meta.xml file (i.e MyApexClass.cls-meta.xml). You must include both files in your .forceignore file. Or try appending \u201C\\*\u201D to your existing .forceignore entry.\n\nSee <https://developer.salesforce.com/docs/atlas.en-us.sfdx_dev.meta/sfdx_dev/sfdx_dev_exclude_source.htm> for examples"], ["error_path_not_found", "%s: File or folder not found"], ["noContentFound", "SourceComponent %s (metadata type = %s) is missing its content file."], ["noContentFound.actions", ["Ensure the content file exists in the expected location.", "If the content file is in your .forceignore file, ensure the meta-xml file is also ignored to completely exclude it."]], ["error_parsing_xml", "SourceComponent %s (metadata type = %s) does not have an associated metadata xml to parse"], ["error_expected_file_path", "%s: path is to a directory, expected a file"], ["error_expected_directory_path", "%s: path is to a file, expected a directory"], ["error_directory_not_found_or_not_directory", "%s: path is not a directory"], ["error_no_directory_stream", "%s doesn't support readable streams on directories."], ["error_no_source_to_deploy", "No source-backed components present in the package."], ["error_no_components_to_retrieve", "No components in the package to retrieve."], ["error_static_resource_attempting_zip_slip", "Entry '%s' in static resource '%s' resolves to a location outside the extraction directory ('%s')."], ["error_static_resource_symlink", "Entry '%s' in static resource '%s' would be written through a symbolic link ('%s'). Writing through symbolic links is not allowed because it can place files outside the extraction directory ('%s')."], ["error_retrieve_symlink", "File '%s' would be written through a symbolic link ('%s'). Writing through symbolic links is not allowed during retrieve because it can place files outside the project directory ('%s')."], ["error_static_resource_expected_archive_type", "A StaticResource directory must have a content type of application/zip or application/jar - found %s for %s."], ["error_static_resource_missing_resource_file", "A StaticResource must have an associated .resource file, missing %s.resource-meta.xml"], ["error_no_job_id", "The %s operation is missing a job ID. Initialize an operation with an ID, or start a new job."], ["missingApiVersion", "Could not determine an API version to use for the generated manifest. Tried looking for sourceApiVersion in sfdx-project.json, apiVersion from config vars, and the highest apiVersion from the APEX REST endpoint. Using API version 58.0 as a last resort."], ["invalid_xml_parsing", "error parsing %s due to:\\n message: %s\\n line: %s\\n code: %s"], ["zipBufferError", "Zip buffer was not created during conversion"], ["undefinedComponentSet", "Unable to construct a componentSet. Check the logs for more information."], ["replacementsFileNotRead", "The file \"%s\" specified in the \"replacements\" property of sfdx-project.json could not be read."], ["unsupportedBundleType", "Unsupported Bundle Type: %s"], ["filePathGeneratorNoTypeSupport", "Type not supported for filepath generation: %s"], ["missingFolderType", "The registry has %s as is inFolder but it does not have a folderType"], ["tooManyFiles", "Multiple files found for path: %s."], ["cantGetName", "Unable to calculate fullName from path: %s (%s)"], ["missingMetaFileSuffix", "The metadata registry is configured incorrectly for %s. Expected a metaFileSuffix."], ["uniqueIdElementNotInRegistry", "No uniqueIdElement found in registry for %s (reading %s at %s)."], ["uniqueIdElementNotInChild", "The uniqueIdElement %s was not found the child (reading %s at %s)."], ["suggest_type_header", "A metadata type lookup for \"%s\" found the following close matches:"], ["suggest_type_did_you_mean", "-- Did you mean \".%s%s\" instead for the \"%s\" metadata type?"], ["suggest_type_more_suggestions", "Additional suggestions:\nConfirm the file name, extension, and directory names are correct. Validate against the registry at:\n<https://github.com/forcedotcom/source-deploy-retrieve/blob/main/src/registry/metadataRegistry.json>\n\nIf the type is not listed in the registry, check that it has Metadata API support via the Metadata Coverage Report:\n<https://developer.salesforce.com/docs/metadata-coverage>\n\nIf the type is available via Metadata API but not in the registry\n\n- Open an issue <https://github.com/forcedotcom/cli/issues>\n- Add the type via PR. Instructions: <https://github.com/forcedotcom/source-deploy-retrieve/blob/main/contributing/metadata.md>"], ["error_directory_name_path_traversal", "The directoryName '%s' for metadata type '%s' contains path segments that resolve outside the project root. Verify your registryCustomizations in sfdx-project.json do not contain directory traversal sequences."], ["error_write_path_outside_root", "The write path '%s' resolves outside the root destination '%s'. This may indicate a path traversal attempt via registryCustomizations."], ["warning_jwt_api_version", "This org uses JWT-based access tokens, which require API version 68.0 or later for SOAP metadata operations. The current API version is %s, so metadata listing may return empty or incomplete results. To resolve, update sourceApiVersion in sfdx-project.json to 68.0 or higher."], ["type_name_suggestions", "Confirm the metadata type name is correct. Validate against the registry at:\n<https://github.com/forcedotcom/source-deploy-retrieve/blob/main/src/registry/metadataRegistry.json>\n\nIf the type is not listed in the registry, check that it has Metadata API support via the Metadata Coverage Report:\n<https://developer.salesforce.com/docs/metadata-coverage>\n\nIf the type is available via Metadata API but not in the registry\n\n- Open an issue <https://github.com/forcedotcom/cli/issues>\n- Add the type via PR. Instructions: <https://github.com/forcedotcom/source-deploy-retrieve/blob/main/contributing/metadata.md>"]]));
/**
 * Handles types with a single content file with a matching file extension.
 *
 * __Example Types__:
 *
 * ApexClass, ApexTrigger, ApexComponent
 *
 * __Example Structure__:
 *
 * ```text
 * foos/
 * ├── foobar.ext
 * ├── foobar.ext-meta.xml
 *```
 */
class MatchingContentSourceAdapter extends baseSourceAdapter_1.BaseSourceAdapter {
    // disabled since used by subclasses
    // eslint-disable-next-line class-methods-use-this
    getRootMetadataXmlPath(trigger) {
        return `${trigger}${constants_1.META_XML_SUFFIX}`;
    }
    populate(trigger, component) {
        let sourcePath;
        if (component.xml === trigger) {
            const fsPath = removeMetaXmlSuffix(trigger);
            if (this.tree.exists(fsPath)) {
                sourcePath = fsPath;
            }
        }
        else if (this.registry.getTypeBySuffix((0, path_1.extName)(trigger)) === this.type) {
            sourcePath = trigger;
        }
        if (!sourcePath) {
            throw new sfError_1.SfError(messages.getMessage('error_expected_source_files', [trigger, this.type.name]), 'ExpectedSourceFilesError');
        }
        else if (this.forceIgnore.denies(sourcePath)) {
            throw messages.createError('noSourceIgnore', [this.type.name, sourcePath]);
        }
        component.content = sourcePath;
        return component;
    }
}
exports.MatchingContentSourceAdapter = MatchingContentSourceAdapter;
const removeMetaXmlSuffix = (fsPath) => fsPath.slice(0, fsPath.lastIndexOf(constants_1.META_XML_SUFFIX));
//# sourceMappingURL=matchingContentSourceAdapter.js.map

/***/ }),

/***/ 35545:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.MixedContentSourceAdapter = void 0;
/*
 * Copyright 2026, Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const node_path_1 = __webpack_require__(76760);
const messages_1 = __webpack_require__(65603);
const sfError_1 = __webpack_require__(78914);
const path_1 = __webpack_require__(15638);
const sourceComponent_1 = __webpack_require__(17536);
const baseSourceAdapter_1 = __webpack_require__(19378);
;
const messages = new messages_1.Messages('@salesforce/source-deploy-retrieve', 'sdr', new Map([["md_request_fail", "Metadata API request failed: %s"], ["error_retry_limit_exceeded", "Exceeded maximum of %s consecutive retryable errors. Last error: %s"], ["error_could_not_infer_type", "%s: Could not infer a metadata type"], ["error_unexpected_child_type", "Unexpected child metadata [%s] found for parent type [%s]"], ["noParent", "Could not find parent type for %s (%s)"], ["error_expected_source_files", "%s: Expected source files for type '%s'"], ["error_failed_convert", "Component conversion failed: %s"], ["error_invalid_test_level", "TestLevel cannot be '%s' unless API version is %s or later"], ["error_merge_metadata_target_unsupported", "Merge convert for metadata target format currently unsupported"], ["error_missing_adapter", "Missing adapter '%s' for metadata type '%s'"], ["error_missing_transformer", "Missing transformer '%s' for metadata type '%s'"], ["error_missing_type_definition", "Missing metadata type definition in registry for id '%s'."], ["error_missing_child_type_definition", "Type %s does not have a child type definition %s."], ["noChildTypes", "No child types found in registry for %s (reading %s at %s)"], ["error_no_metadata_xml_ignore", "Metadata xml file %s is forceignored but is required for %s."], ["noSourceIgnore", "%s metadata types require source files, but %s is forceignored."], ["noSourceIgnore.actions", "- Metadata types with content are composed of two files: a content file (ie MyApexClass.cls) and a -meta.xml file (i.e MyApexClass.cls-meta.xml). You must include both files in your .forceignore file. Or try appending \u201C\\*\u201D to your existing .forceignore entry.\n\nSee <https://developer.salesforce.com/docs/atlas.en-us.sfdx_dev.meta/sfdx_dev/sfdx_dev_exclude_source.htm> for examples"], ["error_path_not_found", "%s: File or folder not found"], ["noContentFound", "SourceComponent %s (metadata type = %s) is missing its content file."], ["noContentFound.actions", ["Ensure the content file exists in the expected location.", "If the content file is in your .forceignore file, ensure the meta-xml file is also ignored to completely exclude it."]], ["error_parsing_xml", "SourceComponent %s (metadata type = %s) does not have an associated metadata xml to parse"], ["error_expected_file_path", "%s: path is to a directory, expected a file"], ["error_expected_directory_path", "%s: path is to a file, expected a directory"], ["error_directory_not_found_or_not_directory", "%s: path is not a directory"], ["error_no_directory_stream", "%s doesn't support readable streams on directories."], ["error_no_source_to_deploy", "No source-backed components present in the package."], ["error_no_components_to_retrieve", "No components in the package to retrieve."], ["error_static_resource_attempting_zip_slip", "Entry '%s' in static resource '%s' resolves to a location outside the extraction directory ('%s')."], ["error_static_resource_symlink", "Entry '%s' in static resource '%s' would be written through a symbolic link ('%s'). Writing through symbolic links is not allowed because it can place files outside the extraction directory ('%s')."], ["error_retrieve_symlink", "File '%s' would be written through a symbolic link ('%s'). Writing through symbolic links is not allowed during retrieve because it can place files outside the project directory ('%s')."], ["error_static_resource_expected_archive_type", "A StaticResource directory must have a content type of application/zip or application/jar - found %s for %s."], ["error_static_resource_missing_resource_file", "A StaticResource must have an associated .resource file, missing %s.resource-meta.xml"], ["error_no_job_id", "The %s operation is missing a job ID. Initialize an operation with an ID, or start a new job."], ["missingApiVersion", "Could not determine an API version to use for the generated manifest. Tried looking for sourceApiVersion in sfdx-project.json, apiVersion from config vars, and the highest apiVersion from the APEX REST endpoint. Using API version 58.0 as a last resort."], ["invalid_xml_parsing", "error parsing %s due to:\\n message: %s\\n line: %s\\n code: %s"], ["zipBufferError", "Zip buffer was not created during conversion"], ["undefinedComponentSet", "Unable to construct a componentSet. Check the logs for more information."], ["replacementsFileNotRead", "The file \"%s\" specified in the \"replacements\" property of sfdx-project.json could not be read."], ["unsupportedBundleType", "Unsupported Bundle Type: %s"], ["filePathGeneratorNoTypeSupport", "Type not supported for filepath generation: %s"], ["missingFolderType", "The registry has %s as is inFolder but it does not have a folderType"], ["tooManyFiles", "Multiple files found for path: %s."], ["cantGetName", "Unable to calculate fullName from path: %s (%s)"], ["missingMetaFileSuffix", "The metadata registry is configured incorrectly for %s. Expected a metaFileSuffix."], ["uniqueIdElementNotInRegistry", "No uniqueIdElement found in registry for %s (reading %s at %s)."], ["uniqueIdElementNotInChild", "The uniqueIdElement %s was not found the child (reading %s at %s)."], ["suggest_type_header", "A metadata type lookup for \"%s\" found the following close matches:"], ["suggest_type_did_you_mean", "-- Did you mean \".%s%s\" instead for the \"%s\" metadata type?"], ["suggest_type_more_suggestions", "Additional suggestions:\nConfirm the file name, extension, and directory names are correct. Validate against the registry at:\n<https://github.com/forcedotcom/source-deploy-retrieve/blob/main/src/registry/metadataRegistry.json>\n\nIf the type is not listed in the registry, check that it has Metadata API support via the Metadata Coverage Report:\n<https://developer.salesforce.com/docs/metadata-coverage>\n\nIf the type is available via Metadata API but not in the registry\n\n- Open an issue <https://github.com/forcedotcom/cli/issues>\n- Add the type via PR. Instructions: <https://github.com/forcedotcom/source-deploy-retrieve/blob/main/contributing/metadata.md>"], ["error_directory_name_path_traversal", "The directoryName '%s' for metadata type '%s' contains path segments that resolve outside the project root. Verify your registryCustomizations in sfdx-project.json do not contain directory traversal sequences."], ["error_write_path_outside_root", "The write path '%s' resolves outside the root destination '%s'. This may indicate a path traversal attempt via registryCustomizations."], ["warning_jwt_api_version", "This org uses JWT-based access tokens, which require API version 68.0 or later for SOAP metadata operations. The current API version is %s, so metadata listing may return empty or incomplete results. To resolve, update sourceApiVersion in sfdx-project.json to 68.0 or higher."], ["type_name_suggestions", "Confirm the metadata type name is correct. Validate against the registry at:\n<https://github.com/forcedotcom/source-deploy-retrieve/blob/main/src/registry/metadataRegistry.json>\n\nIf the type is not listed in the registry, check that it has Metadata API support via the Metadata Coverage Report:\n<https://developer.salesforce.com/docs/metadata-coverage>\n\nIf the type is available via Metadata API but not in the registry\n\n- Open an issue <https://github.com/forcedotcom/cli/issues>\n- Add the type via PR. Instructions: <https://github.com/forcedotcom/source-deploy-retrieve/blob/main/contributing/metadata.md>"]]));
/**
 * Handles types with mixed content. Mixed content means there are one or more additional
 * file(s) associated with a component with any file extension. Even an entire folder
 * can be considered "the content".
 *
 * __Example Types__:
 *
 * StaticResources, Documents, Bundle Types
 *
 * __Example Structures__:
 *
 *```text
 * foos/
 * ├── myFoo/
 * |   ├── fooFolder/
 * |      ├── foofighters.x
 * |   ├── foo.y
 * |   ├── fooBar.z
 * ├── myFoo.ext-meta.xml
 * bars/
 * ├── myBar.xyz
 * ├── myBar.ext2-meta.xml
 *```
 */
class MixedContentSourceAdapter extends baseSourceAdapter_1.BaseSourceAdapter {
    /**
     *
     * Returns undefined if no matching file is found
     */
    getRootMetadataXmlPath(trigger) {
        if (this.ownFolder) {
            const componentRoot = this.trimPathToContent(trigger);
            if (!this.tree.isDirectory(componentRoot))
                return undefined;
            const rootSuffixes = [this.type.suffix, this.type.legacySuffix].filter((suffix) => typeof suffix === 'string');
            const rootFile = this.tree.readDirectory(componentRoot).find((entry) => {
                const metadata = (0, path_1.parseMetadataXml)((0, node_path_1.join)(componentRoot, entry));
                return metadata?.suffix !== undefined && rootSuffixes.includes(metadata.suffix);
            });
            if (rootFile) {
                return (0, node_path_1.join)(componentRoot, rootFile);
            }
            return this.tree.find('metadataXml', (0, node_path_1.basename)(componentRoot), componentRoot);
        }
        return this.findMetadataFromContent(trigger);
    }
    populate(trigger, component) {
        const trimmedPath = this.trimPathToContent(trigger);
        const contentPath = trimmedPath === component?.xml
            ? this.tree.find('content', (0, path_1.baseName)(trimmedPath), (0, node_path_1.dirname)(trimmedPath))
            : trimmedPath;
        // Content path might be undefined for staticResource where all files are ignored and only the xml is included.
        // Note that if contentPath is a directory that is not ignored, but all the files within it are
        // ignored (or it's an empty dir) contentPath will be truthy and the error will not be thrown.
        if (!contentPath || !this.tree.exists(contentPath)) {
            throw new sfError_1.SfError(messages.getMessage('error_expected_source_files', [trigger, this.type.name]), 'ExpectedSourceFilesError');
        }
        if (component) {
            component.content = contentPath;
        }
        else {
            component = new sourceComponent_1.SourceComponent({
                name: (0, path_1.baseName)(contentPath),
                type: this.type,
                content: contentPath,
                xml: this.type.metaFileSuffix && (0, node_path_1.join)(contentPath, this.type.metaFileSuffix),
            }, this.tree, this.forceIgnore);
        }
        return component;
    }
    /**
     * Trim a path up until the root of a component's content. If the content is a file,
     * the given path will be returned back. If the content is a folder, the path to that
     * folder will be returned. Intended to be used exclusively for MixedContent types.
     *
     * @param path Path to trim
     * @param type MetadataType to determine content for
     */
    trimPathToContent(path) {
        const pathParts = path.split(node_path_1.sep);
        const typeFolderIndex = pathParts.lastIndexOf(this.type.directoryName);
        const offset = this.type.inFolder ? 3 : 2;
        return pathParts.slice(0, typeFolderIndex + offset).join(node_path_1.sep);
    }
    /**
     * A utility for finding a component's root metadata xml from a path to a component's
     * content. "Content" can either be a single file or an entire directory. If the content
     * is a directory, the path can be files or other directories inside of it.
     *
     * Returns undefined if no matching file is found
     *
     * @param path Path to content or a child of the content
     */
    findMetadataFromContent(path) {
        const rootContentPath = this.trimPathToContent(path);
        const rootTypeDirectory = (0, node_path_1.dirname)(rootContentPath);
        const contentFullName = (0, path_1.baseName)(rootContentPath);
        return this.tree.find('metadataXml', contentFullName, rootTypeDirectory);
    }
}
exports.MixedContentSourceAdapter = MixedContentSourceAdapter;
//# sourceMappingURL=mixedContentSourceAdapter.js.map

/***/ }),

/***/ 41772:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.PartialDecomposedAdapter = void 0;
/*
 * Copyright 2026, Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const node_path_1 = __webpack_require__(76760);
const sourceComponent_1 = __webpack_require__(17536);
const utils_1 = __webpack_require__(51453);
const defaultSourceAdapter_1 = __webpack_require__(52818);
/**
 * Handles types with partially decomposed content. This means that there will be 2+ files,
 * one being the parent (-meta.xml) and more being the "children" - these children make up one XML tag of the parent
 *
 * __Example Types__:
 *
 * DecomposeExternalServiceRegistrationBeta Preset
 *
 * __Example Structures__:
 *
 *```text
 * externalServiceRegistration/
 * ├── myFoo.externalServiceRegistration-meta.xml
 * ├── myFoo.yaml
 * ├── myFoo.json
 *```
 */
class PartialDecomposedAdapter extends defaultSourceAdapter_1.DefaultSourceAdapter {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    populate(trigger, component) {
        const parentType = this.registry.getParentType(this.type.id);
        // no children of this type,
        // the parent has child types
        // and the trigger starts with one of the parent's child's suffixes
        // => we have a child path
        if (!this.type.children &&
            parentType?.children &&
            Object.keys(parentType.children.suffixes).find((suffix) => trigger.endsWith(`.${suffix}`))) {
            // we have a child, return the parent for the transformer to rebundle together
            return new sourceComponent_1.SourceComponent({
                name: getName(trigger),
                type: parentType,
                // change the xml to point to the parent, the transformer will reassemble all parts to form valid MD format files
                xml: trigger.replace((0, utils_1.extName)(trigger), 'externalServiceRegistration-meta.xml'),
            }, this.tree, this.forceIgnore);
        }
        else {
            // we were given a parent
            return new sourceComponent_1.SourceComponent({
                name: getName(trigger),
                type: this.type,
                xml: trigger,
            }, this.tree, this.forceIgnore);
        }
    }
}
exports.PartialDecomposedAdapter = PartialDecomposedAdapter;
function getName(contentPath) {
    return (0, node_path_1.basename)(contentPath).split('.').at(0);
}
//# sourceMappingURL=partialDecomposedAdapter.js.map

/***/ }),

/***/ 32431:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.SourceAdapterFactory = void 0;
/*
 * Copyright 2026, Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const messages_1 = __webpack_require__(65603);
const sfError_1 = __webpack_require__(78914);
const forceIgnore_1 = __webpack_require__(51885);
const bundleSourceAdapter_1 = __webpack_require__(28489);
const decomposedSourceAdapter_1 = __webpack_require__(50668);
const matchingContentSourceAdapter_1 = __webpack_require__(40849);
const mixedContentSourceAdapter_1 = __webpack_require__(35545);
const defaultSourceAdapter_1 = __webpack_require__(52818);
const digitalExperienceSourceAdapter_1 = __webpack_require__(64361);
const uiBundlesSourceAdapter_1 = __webpack_require__(15452);
const partialDecomposedAdapter_1 = __webpack_require__(41772);
;
const messages = new messages_1.Messages('@salesforce/source-deploy-retrieve', 'sdr', new Map([["md_request_fail", "Metadata API request failed: %s"], ["error_retry_limit_exceeded", "Exceeded maximum of %s consecutive retryable errors. Last error: %s"], ["error_could_not_infer_type", "%s: Could not infer a metadata type"], ["error_unexpected_child_type", "Unexpected child metadata [%s] found for parent type [%s]"], ["noParent", "Could not find parent type for %s (%s)"], ["error_expected_source_files", "%s: Expected source files for type '%s'"], ["error_failed_convert", "Component conversion failed: %s"], ["error_invalid_test_level", "TestLevel cannot be '%s' unless API version is %s or later"], ["error_merge_metadata_target_unsupported", "Merge convert for metadata target format currently unsupported"], ["error_missing_adapter", "Missing adapter '%s' for metadata type '%s'"], ["error_missing_transformer", "Missing transformer '%s' for metadata type '%s'"], ["error_missing_type_definition", "Missing metadata type definition in registry for id '%s'."], ["error_missing_child_type_definition", "Type %s does not have a child type definition %s."], ["noChildTypes", "No child types found in registry for %s (reading %s at %s)"], ["error_no_metadata_xml_ignore", "Metadata xml file %s is forceignored but is required for %s."], ["noSourceIgnore", "%s metadata types require source files, but %s is forceignored."], ["noSourceIgnore.actions", "- Metadata types with content are composed of two files: a content file (ie MyApexClass.cls) and a -meta.xml file (i.e MyApexClass.cls-meta.xml). You must include both files in your .forceignore file. Or try appending \u201C\\*\u201D to your existing .forceignore entry.\n\nSee <https://developer.salesforce.com/docs/atlas.en-us.sfdx_dev.meta/sfdx_dev/sfdx_dev_exclude_source.htm> for examples"], ["error_path_not_found", "%s: File or folder not found"], ["noContentFound", "SourceComponent %s (metadata type = %s) is missing its content file."], ["noContentFound.actions", ["Ensure the content file exists in the expected location.", "If the content file is in your .forceignore file, ensure the meta-xml file is also ignored to completely exclude it."]], ["error_parsing_xml", "SourceComponent %s (metadata type = %s) does not have an associated metadata xml to parse"], ["error_expected_file_path", "%s: path is to a directory, expected a file"], ["error_expected_directory_path", "%s: path is to a file, expected a directory"], ["error_directory_not_found_or_not_directory", "%s: path is not a directory"], ["error_no_directory_stream", "%s doesn't support readable streams on directories."], ["error_no_source_to_deploy", "No source-backed components present in the package."], ["error_no_components_to_retrieve", "No components in the package to retrieve."], ["error_static_resource_attempting_zip_slip", "Entry '%s' in static resource '%s' resolves to a location outside the extraction directory ('%s')."], ["error_static_resource_symlink", "Entry '%s' in static resource '%s' would be written through a symbolic link ('%s'). Writing through symbolic links is not allowed because it can place files outside the extraction directory ('%s')."], ["error_retrieve_symlink", "File '%s' would be written through a symbolic link ('%s'). Writing through symbolic links is not allowed during retrieve because it can place files outside the project directory ('%s')."], ["error_static_resource_expected_archive_type", "A StaticResource directory must have a content type of application/zip or application/jar - found %s for %s."], ["error_static_resource_missing_resource_file", "A StaticResource must have an associated .resource file, missing %s.resource-meta.xml"], ["error_no_job_id", "The %s operation is missing a job ID. Initialize an operation with an ID, or start a new job."], ["missingApiVersion", "Could not determine an API version to use for the generated manifest. Tried looking for sourceApiVersion in sfdx-project.json, apiVersion from config vars, and the highest apiVersion from the APEX REST endpoint. Using API version 58.0 as a last resort."], ["invalid_xml_parsing", "error parsing %s due to:\\n message: %s\\n line: %s\\n code: %s"], ["zipBufferError", "Zip buffer was not created during conversion"], ["undefinedComponentSet", "Unable to construct a componentSet. Check the logs for more information."], ["replacementsFileNotRead", "The file \"%s\" specified in the \"replacements\" property of sfdx-project.json could not be read."], ["unsupportedBundleType", "Unsupported Bundle Type: %s"], ["filePathGeneratorNoTypeSupport", "Type not supported for filepath generation: %s"], ["missingFolderType", "The registry has %s as is inFolder but it does not have a folderType"], ["tooManyFiles", "Multiple files found for path: %s."], ["cantGetName", "Unable to calculate fullName from path: %s (%s)"], ["missingMetaFileSuffix", "The metadata registry is configured incorrectly for %s. Expected a metaFileSuffix."], ["uniqueIdElementNotInRegistry", "No uniqueIdElement found in registry for %s (reading %s at %s)."], ["uniqueIdElementNotInChild", "The uniqueIdElement %s was not found the child (reading %s at %s)."], ["suggest_type_header", "A metadata type lookup for \"%s\" found the following close matches:"], ["suggest_type_did_you_mean", "-- Did you mean \".%s%s\" instead for the \"%s\" metadata type?"], ["suggest_type_more_suggestions", "Additional suggestions:\nConfirm the file name, extension, and directory names are correct. Validate against the registry at:\n<https://github.com/forcedotcom/source-deploy-retrieve/blob/main/src/registry/metadataRegistry.json>\n\nIf the type is not listed in the registry, check that it has Metadata API support via the Metadata Coverage Report:\n<https://developer.salesforce.com/docs/metadata-coverage>\n\nIf the type is available via Metadata API but not in the registry\n\n- Open an issue <https://github.com/forcedotcom/cli/issues>\n- Add the type via PR. Instructions: <https://github.com/forcedotcom/source-deploy-retrieve/blob/main/contributing/metadata.md>"], ["error_directory_name_path_traversal", "The directoryName '%s' for metadata type '%s' contains path segments that resolve outside the project root. Verify your registryCustomizations in sfdx-project.json do not contain directory traversal sequences."], ["error_write_path_outside_root", "The write path '%s' resolves outside the root destination '%s'. This may indicate a path traversal attempt via registryCustomizations."], ["warning_jwt_api_version", "This org uses JWT-based access tokens, which require API version 68.0 or later for SOAP metadata operations. The current API version is %s, so metadata listing may return empty or incomplete results. To resolve, update sourceApiVersion in sfdx-project.json to 68.0 or higher."], ["type_name_suggestions", "Confirm the metadata type name is correct. Validate against the registry at:\n<https://github.com/forcedotcom/source-deploy-retrieve/blob/main/src/registry/metadataRegistry.json>\n\nIf the type is not listed in the registry, check that it has Metadata API support via the Metadata Coverage Report:\n<https://developer.salesforce.com/docs/metadata-coverage>\n\nIf the type is available via Metadata API but not in the registry\n\n- Open an issue <https://github.com/forcedotcom/cli/issues>\n- Add the type via PR. Instructions: <https://github.com/forcedotcom/source-deploy-retrieve/blob/main/contributing/metadata.md>"]]));
class SourceAdapterFactory {
    registry;
    tree;
    constructor(registry, tree) {
        this.registry = registry;
        this.tree = tree;
    }
    getAdapter(type, forceIgnore = new forceIgnore_1.ForceIgnore()) {
        const adapterId = type.strategies?.adapter;
        switch (adapterId) {
            case 'bundle':
                return new bundleSourceAdapter_1.BundleSourceAdapter(type, this.registry, forceIgnore, this.tree);
            case 'decomposed':
                return new decomposedSourceAdapter_1.DecomposedSourceAdapter(type, this.registry, forceIgnore, this.tree);
            case 'matchingContentFile':
                return new matchingContentSourceAdapter_1.MatchingContentSourceAdapter(type, this.registry, forceIgnore, this.tree);
            case 'mixedContent':
                return new mixedContentSourceAdapter_1.MixedContentSourceAdapter(type, this.registry, forceIgnore, this.tree);
            case 'digitalExperience':
                return new digitalExperienceSourceAdapter_1.DigitalExperienceSourceAdapter(type, this.registry, forceIgnore, this.tree);
            case 'uiBundles':
                return new uiBundlesSourceAdapter_1.UiBundlesSourceAdapter(type, this.registry, forceIgnore, this.tree);
            case 'partiallyDecomposed':
                return new partialDecomposedAdapter_1.PartialDecomposedAdapter(type, this.registry, forceIgnore, this.tree);
            case 'default':
            case undefined:
                return new defaultSourceAdapter_1.DefaultSourceAdapter(type, this.registry, forceIgnore, this.tree);
            default:
                throw new sfError_1.SfError(messages.getMessage('error_missing_adapter', [adapterId, type.name]), 'RegistryError');
        }
    }
}
exports.SourceAdapterFactory = SourceAdapterFactory;
//# sourceMappingURL=sourceAdapterFactory.js.map

/***/ }),

/***/ 15452:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.UiBundlesSourceAdapter = void 0;
/*
 * Copyright 2026, Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const node_path_1 = __webpack_require__(76760);
const messages_1 = __webpack_require__(65603);
const sfError_1 = __webpack_require__(78914);
const sourceComponent_1 = __webpack_require__(17536);
const path_1 = __webpack_require__(15638);
const bundleSourceAdapter_1 = __webpack_require__(28489);
;
const messages = new messages_1.Messages('@salesforce/source-deploy-retrieve', 'sdr', new Map([["md_request_fail", "Metadata API request failed: %s"], ["error_retry_limit_exceeded", "Exceeded maximum of %s consecutive retryable errors. Last error: %s"], ["error_could_not_infer_type", "%s: Could not infer a metadata type"], ["error_unexpected_child_type", "Unexpected child metadata [%s] found for parent type [%s]"], ["noParent", "Could not find parent type for %s (%s)"], ["error_expected_source_files", "%s: Expected source files for type '%s'"], ["error_failed_convert", "Component conversion failed: %s"], ["error_invalid_test_level", "TestLevel cannot be '%s' unless API version is %s or later"], ["error_merge_metadata_target_unsupported", "Merge convert for metadata target format currently unsupported"], ["error_missing_adapter", "Missing adapter '%s' for metadata type '%s'"], ["error_missing_transformer", "Missing transformer '%s' for metadata type '%s'"], ["error_missing_type_definition", "Missing metadata type definition in registry for id '%s'."], ["error_missing_child_type_definition", "Type %s does not have a child type definition %s."], ["noChildTypes", "No child types found in registry for %s (reading %s at %s)"], ["error_no_metadata_xml_ignore", "Metadata xml file %s is forceignored but is required for %s."], ["noSourceIgnore", "%s metadata types require source files, but %s is forceignored."], ["noSourceIgnore.actions", "- Metadata types with content are composed of two files: a content file (ie MyApexClass.cls) and a -meta.xml file (i.e MyApexClass.cls-meta.xml). You must include both files in your .forceignore file. Or try appending \u201C\\*\u201D to your existing .forceignore entry.\n\nSee <https://developer.salesforce.com/docs/atlas.en-us.sfdx_dev.meta/sfdx_dev/sfdx_dev_exclude_source.htm> for examples"], ["error_path_not_found", "%s: File or folder not found"], ["noContentFound", "SourceComponent %s (metadata type = %s) is missing its content file."], ["noContentFound.actions", ["Ensure the content file exists in the expected location.", "If the content file is in your .forceignore file, ensure the meta-xml file is also ignored to completely exclude it."]], ["error_parsing_xml", "SourceComponent %s (metadata type = %s) does not have an associated metadata xml to parse"], ["error_expected_file_path", "%s: path is to a directory, expected a file"], ["error_expected_directory_path", "%s: path is to a file, expected a directory"], ["error_directory_not_found_or_not_directory", "%s: path is not a directory"], ["error_no_directory_stream", "%s doesn't support readable streams on directories."], ["error_no_source_to_deploy", "No source-backed components present in the package."], ["error_no_components_to_retrieve", "No components in the package to retrieve."], ["error_static_resource_attempting_zip_slip", "Entry '%s' in static resource '%s' resolves to a location outside the extraction directory ('%s')."], ["error_static_resource_symlink", "Entry '%s' in static resource '%s' would be written through a symbolic link ('%s'). Writing through symbolic links is not allowed because it can place files outside the extraction directory ('%s')."], ["error_retrieve_symlink", "File '%s' would be written through a symbolic link ('%s'). Writing through symbolic links is not allowed during retrieve because it can place files outside the project directory ('%s')."], ["error_static_resource_expected_archive_type", "A StaticResource directory must have a content type of application/zip or application/jar - found %s for %s."], ["error_static_resource_missing_resource_file", "A StaticResource must have an associated .resource file, missing %s.resource-meta.xml"], ["error_no_job_id", "The %s operation is missing a job ID. Initialize an operation with an ID, or start a new job."], ["missingApiVersion", "Could not determine an API version to use for the generated manifest. Tried looking for sourceApiVersion in sfdx-project.json, apiVersion from config vars, and the highest apiVersion from the APEX REST endpoint. Using API version 58.0 as a last resort."], ["invalid_xml_parsing", "error parsing %s due to:\\n message: %s\\n line: %s\\n code: %s"], ["zipBufferError", "Zip buffer was not created during conversion"], ["undefinedComponentSet", "Unable to construct a componentSet. Check the logs for more information."], ["replacementsFileNotRead", "The file \"%s\" specified in the \"replacements\" property of sfdx-project.json could not be read."], ["unsupportedBundleType", "Unsupported Bundle Type: %s"], ["filePathGeneratorNoTypeSupport", "Type not supported for filepath generation: %s"], ["missingFolderType", "The registry has %s as is inFolder but it does not have a folderType"], ["tooManyFiles", "Multiple files found for path: %s."], ["cantGetName", "Unable to calculate fullName from path: %s (%s)"], ["missingMetaFileSuffix", "The metadata registry is configured incorrectly for %s. Expected a metaFileSuffix."], ["uniqueIdElementNotInRegistry", "No uniqueIdElement found in registry for %s (reading %s at %s)."], ["uniqueIdElementNotInChild", "The uniqueIdElement %s was not found the child (reading %s at %s)."], ["suggest_type_header", "A metadata type lookup for \"%s\" found the following close matches:"], ["suggest_type_did_you_mean", "-- Did you mean \".%s%s\" instead for the \"%s\" metadata type?"], ["suggest_type_more_suggestions", "Additional suggestions:\nConfirm the file name, extension, and directory names are correct. Validate against the registry at:\n<https://github.com/forcedotcom/source-deploy-retrieve/blob/main/src/registry/metadataRegistry.json>\n\nIf the type is not listed in the registry, check that it has Metadata API support via the Metadata Coverage Report:\n<https://developer.salesforce.com/docs/metadata-coverage>\n\nIf the type is available via Metadata API but not in the registry\n\n- Open an issue <https://github.com/forcedotcom/cli/issues>\n- Add the type via PR. Instructions: <https://github.com/forcedotcom/source-deploy-retrieve/blob/main/contributing/metadata.md>"], ["error_directory_name_path_traversal", "The directoryName '%s' for metadata type '%s' contains path segments that resolve outside the project root. Verify your registryCustomizations in sfdx-project.json do not contain directory traversal sequences."], ["error_write_path_outside_root", "The write path '%s' resolves outside the root destination '%s'. This may indicate a path traversal attempt via registryCustomizations."], ["warning_jwt_api_version", "This org uses JWT-based access tokens, which require API version 68.0 or later for SOAP metadata operations. The current API version is %s, so metadata listing may return empty or incomplete results. To resolve, update sourceApiVersion in sfdx-project.json to 68.0 or higher."], ["type_name_suggestions", "Confirm the metadata type name is correct. Validate against the registry at:\n<https://github.com/forcedotcom/source-deploy-retrieve/blob/main/src/registry/metadataRegistry.json>\n\nIf the type is not listed in the registry, check that it has Metadata API support via the Metadata Coverage Report:\n<https://developer.salesforce.com/docs/metadata-coverage>\n\nIf the type is available via Metadata API but not in the registry\n\n- Open an issue <https://github.com/forcedotcom/cli/issues>\n- Add the type via PR. Instructions: <https://github.com/forcedotcom/source-deploy-retrieve/blob/main/contributing/metadata.md>"]]));
/**
 * Source adapter for UiBundle bundles.
 *
 * ui-bundle.json is optional; its contents are validated at deploy time by the UiBundle
 * metadata transformer, not during resolution.
 */
class UiBundlesSourceAdapter extends bundleSourceAdapter_1.BundleSourceAdapter {
    populate(trigger, component) {
        const source = super.populate(trigger, component);
        if (!source?.content) {
            return source;
        }
        const contentPath = source.content;
        const appName = (0, path_1.baseName)(contentPath);
        const expectedXmlPath = (0, node_path_1.join)(contentPath, `${appName}.uibundle-meta.xml`);
        if (!this.tree.exists(expectedXmlPath)) {
            throw new sfError_1.SfError(messages.getMessage('error_expected_source_files', [expectedXmlPath, this.type.name]), 'ExpectedSourceFilesError');
        }
        // Ensure the component always points at the canonical meta xml.
        return source.xml && source.xml === expectedXmlPath
            ? source
            : new sourceComponent_1.SourceComponent({
                name: appName,
                type: source.type,
                content: source.content,
                xml: expectedXmlPath,
                parent: source.parent,
                parentType: source.parentType,
            }, this.tree, this.forceIgnore);
    }
}
exports.UiBundlesSourceAdapter = UiBundlesSourceAdapter;
//# sourceMappingURL=uiBundlesSourceAdapter.js.map

/***/ }),

/***/ 13465:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.MetadataResolver = void 0;
/*
 * Copyright 2026, Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const node_path_1 = __webpack_require__(76760);
const lifecycle_1 = __webpack_require__(17838);
const messages_1 = __webpack_require__(65603);
const sfError_1 = __webpack_require__(78914);
const logger_1 = __webpack_require__(81346);
const path_1 = __webpack_require__(15638);
const registryAccess_1 = __webpack_require__(14454);
const constants_1 = __webpack_require__(51280);
const sourceAdapterFactory_1 = __webpack_require__(32431);
const forceIgnore_1 = __webpack_require__(51885);
const treeContainers_1 = __webpack_require__(45750);
;
const messages = new messages_1.Messages('@salesforce/source-deploy-retrieve', 'sdr', new Map([["md_request_fail", "Metadata API request failed: %s"], ["error_retry_limit_exceeded", "Exceeded maximum of %s consecutive retryable errors. Last error: %s"], ["error_could_not_infer_type", "%s: Could not infer a metadata type"], ["error_unexpected_child_type", "Unexpected child metadata [%s] found for parent type [%s]"], ["noParent", "Could not find parent type for %s (%s)"], ["error_expected_source_files", "%s: Expected source files for type '%s'"], ["error_failed_convert", "Component conversion failed: %s"], ["error_invalid_test_level", "TestLevel cannot be '%s' unless API version is %s or later"], ["error_merge_metadata_target_unsupported", "Merge convert for metadata target format currently unsupported"], ["error_missing_adapter", "Missing adapter '%s' for metadata type '%s'"], ["error_missing_transformer", "Missing transformer '%s' for metadata type '%s'"], ["error_missing_type_definition", "Missing metadata type definition in registry for id '%s'."], ["error_missing_child_type_definition", "Type %s does not have a child type definition %s."], ["noChildTypes", "No child types found in registry for %s (reading %s at %s)"], ["error_no_metadata_xml_ignore", "Metadata xml file %s is forceignored but is required for %s."], ["noSourceIgnore", "%s metadata types require source files, but %s is forceignored."], ["noSourceIgnore.actions", "- Metadata types with content are composed of two files: a content file (ie MyApexClass.cls) and a -meta.xml file (i.e MyApexClass.cls-meta.xml). You must include both files in your .forceignore file. Or try appending \u201C\\*\u201D to your existing .forceignore entry.\n\nSee <https://developer.salesforce.com/docs/atlas.en-us.sfdx_dev.meta/sfdx_dev/sfdx_dev_exclude_source.htm> for examples"], ["error_path_not_found", "%s: File or folder not found"], ["noContentFound", "SourceComponent %s (metadata type = %s) is missing its content file."], ["noContentFound.actions", ["Ensure the content file exists in the expected location.", "If the content file is in your .forceignore file, ensure the meta-xml file is also ignored to completely exclude it."]], ["error_parsing_xml", "SourceComponent %s (metadata type = %s) does not have an associated metadata xml to parse"], ["error_expected_file_path", "%s: path is to a directory, expected a file"], ["error_expected_directory_path", "%s: path is to a file, expected a directory"], ["error_directory_not_found_or_not_directory", "%s: path is not a directory"], ["error_no_directory_stream", "%s doesn't support readable streams on directories."], ["error_no_source_to_deploy", "No source-backed components present in the package."], ["error_no_components_to_retrieve", "No components in the package to retrieve."], ["error_static_resource_attempting_zip_slip", "Entry '%s' in static resource '%s' resolves to a location outside the extraction directory ('%s')."], ["error_static_resource_symlink", "Entry '%s' in static resource '%s' would be written through a symbolic link ('%s'). Writing through symbolic links is not allowed because it can place files outside the extraction directory ('%s')."], ["error_retrieve_symlink", "File '%s' would be written through a symbolic link ('%s'). Writing through symbolic links is not allowed during retrieve because it can place files outside the project directory ('%s')."], ["error_static_resource_expected_archive_type", "A StaticResource directory must have a content type of application/zip or application/jar - found %s for %s."], ["error_static_resource_missing_resource_file", "A StaticResource must have an associated .resource file, missing %s.resource-meta.xml"], ["error_no_job_id", "The %s operation is missing a job ID. Initialize an operation with an ID, or start a new job."], ["missingApiVersion", "Could not determine an API version to use for the generated manifest. Tried looking for sourceApiVersion in sfdx-project.json, apiVersion from config vars, and the highest apiVersion from the APEX REST endpoint. Using API version 58.0 as a last resort."], ["invalid_xml_parsing", "error parsing %s due to:\\n message: %s\\n line: %s\\n code: %s"], ["zipBufferError", "Zip buffer was not created during conversion"], ["undefinedComponentSet", "Unable to construct a componentSet. Check the logs for more information."], ["replacementsFileNotRead", "The file \"%s\" specified in the \"replacements\" property of sfdx-project.json could not be read."], ["unsupportedBundleType", "Unsupported Bundle Type: %s"], ["filePathGeneratorNoTypeSupport", "Type not supported for filepath generation: %s"], ["missingFolderType", "The registry has %s as is inFolder but it does not have a folderType"], ["tooManyFiles", "Multiple files found for path: %s."], ["cantGetName", "Unable to calculate fullName from path: %s (%s)"], ["missingMetaFileSuffix", "The metadata registry is configured incorrectly for %s. Expected a metaFileSuffix."], ["uniqueIdElementNotInRegistry", "No uniqueIdElement found in registry for %s (reading %s at %s)."], ["uniqueIdElementNotInChild", "The uniqueIdElement %s was not found the child (reading %s at %s)."], ["suggest_type_header", "A metadata type lookup for \"%s\" found the following close matches:"], ["suggest_type_did_you_mean", "-- Did you mean \".%s%s\" instead for the \"%s\" metadata type?"], ["suggest_type_more_suggestions", "Additional suggestions:\nConfirm the file name, extension, and directory names are correct. Validate against the registry at:\n<https://github.com/forcedotcom/source-deploy-retrieve/blob/main/src/registry/metadataRegistry.json>\n\nIf the type is not listed in the registry, check that it has Metadata API support via the Metadata Coverage Report:\n<https://developer.salesforce.com/docs/metadata-coverage>\n\nIf the type is available via Metadata API but not in the registry\n\n- Open an issue <https://github.com/forcedotcom/cli/issues>\n- Add the type via PR. Instructions: <https://github.com/forcedotcom/source-deploy-retrieve/blob/main/contributing/metadata.md>"], ["error_directory_name_path_traversal", "The directoryName '%s' for metadata type '%s' contains path segments that resolve outside the project root. Verify your registryCustomizations in sfdx-project.json do not contain directory traversal sequences."], ["error_write_path_outside_root", "The write path '%s' resolves outside the root destination '%s'. This may indicate a path traversal attempt via registryCustomizations."], ["warning_jwt_api_version", "This org uses JWT-based access tokens, which require API version 68.0 or later for SOAP metadata operations. The current API version is %s, so metadata listing may return empty or incomplete results. To resolve, update sourceApiVersion in sfdx-project.json to 68.0 or higher."], ["type_name_suggestions", "Confirm the metadata type name is correct. Validate against the registry at:\n<https://github.com/forcedotcom/source-deploy-retrieve/blob/main/src/registry/metadataRegistry.json>\n\nIf the type is not listed in the registry, check that it has Metadata API support via the Metadata Coverage Report:\n<https://developer.salesforce.com/docs/metadata-coverage>\n\nIf the type is available via Metadata API but not in the registry\n\n- Open an issue <https://github.com/forcedotcom/cli/issues>\n- Add the type via PR. Instructions: <https://github.com/forcedotcom/source-deploy-retrieve/blob/main/contributing/metadata.md>"]]));
const CLOSE_META_SUFFIX_REGEX = /.+\.([^.-]+)(?:-.*)?\.xml/;
const FOLDER_META_XML_REGEX = /(.+)-meta\.xml/;
/**
 * Resolver for metadata type and component objects.
 *
 * @internal
 */
class MetadataResolver {
    registry;
    tree;
    useFsForceIgnore;
    forceIgnoredPaths;
    forceIgnore;
    /**
     * @param registry Custom registry data
     * @param tree `TreeContainer` to traverse with
     * @param useFsForceIgnore false = use default forceignore entries, true = search and use forceignore in project
     */
    constructor(registry = new registryAccess_1.RegistryAccess(), tree = new treeContainers_1.NodeFSTreeContainer(), useFsForceIgnore = true) {
        this.registry = registry;
        this.tree = tree;
        this.useFsForceIgnore = useFsForceIgnore;
        this.forceIgnoredPaths = new Set();
    }
    /**
     * Get the metadata component(s) from a file path.
     *
     * @param fsPath File path to metadata or directory
     * @param inclusiveFilter Set to filter which components are resolved
     */
    getComponentsFromPath(fsPath, inclusiveFilter) {
        if (!this.tree.exists(fsPath)) {
            throw new sfError_1.SfError(messages.getMessage('error_path_not_found', [fsPath]), 'TypeInferenceError');
        }
        // use the default ignore if we aren't using a real one
        this.forceIgnore = this.useFsForceIgnore ? forceIgnore_1.ForceIgnore.findAndCreate(fsPath) : new forceIgnore_1.ForceIgnore();
        if (this.tree.isDirectory(fsPath) && !resolveDirectoryAsComponent(this.registry)(this.tree)(fsPath)) {
            return this.getComponentsFromPathRecursive(fsPath, inclusiveFilter);
        }
        const component = this.resolveComponent(fsPath, true);
        return component ? [component] : [];
    }
    // eslint-disable-next-line complexity
    getComponentsFromPathRecursive(dir, inclusiveFilter) {
        const dirQueue = [];
        const components = [];
        const ignore = new Set();
        // don't apply forceignore rules against dirs
        // `forceignore.denies` will pass a relative path to node-ignore, e.g.
        // `path/to/force-app` -> `force-app`, note that there's no trailing slash
        // so node-ignore will treat it as a file.
        if (!this.tree.isDirectory(dir) && this.forceIgnore?.denies(dir)) {
            return components;
        }
        const entries = this.tree.readDirectory(dir).map((0, path_1.fnJoin)(dir));
        const isDirByPath = new Map(entries.map((entry) => [entry, this.tree.isDirectory(entry)]));
        // this method isn't truly recursive, we need to sort directories before files so we look as far down as possible
        // before finding the parent and returning only it - by sorting, we make it as recursive as possible
        for (const fsPath of entries.sort(directoriesFirst(isDirByPath))) {
            if (ignore.has(fsPath)) {
                continue;
            }
            if (this.tree.isDirectory(fsPath)) {
                if (resolveDirectoryAsComponent(this.registry)(this.tree)(fsPath)) {
                    // Filter out empty directories to prevent deployment issues
                    if (this.tree.readDirectory(fsPath).length === 0) {
                        continue;
                    }
                    const component = this.resolveComponent(fsPath, true);
                    if (component && (!inclusiveFilter || inclusiveFilter.has(component))) {
                        components.push(component);
                        ignore.add(component.xml);
                    }
                    // normally the preview commands expect to traverse ignored directories in order to provide a list of ignored files.
                    // we do NOT want to do this where react components can have very large dirs.
                }
                else if (!(this.forceIgnore?.denies(fsPath) && fsPath.split(node_path_1.sep).includes('node_modules'))) {
                    dirQueue.push(fsPath);
                }
            }
            else if (isMetadata(this.registry)(this.tree)(fsPath)) {
                const component = this.resolveComponent(fsPath, false);
                if (component) {
                    if (!inclusiveFilter || inclusiveFilter.has(component)) {
                        components.push(component);
                        ignore.add(component.content);
                    }
                    else {
                        for (const child of component.getChildren()) {
                            if (inclusiveFilter.has(child)) {
                                components.push(child);
                            }
                        }
                    }
                    // don't traverse further if not in a root type directory. performance optimization
                    // for mixed content types and ensures we don't add duplicates of the component.
                    const typeDir = (0, node_path_1.basename)((0, node_path_1.dirname)(component.type.inFolder ? (0, node_path_1.dirname)(fsPath) : fsPath));
                    if (component.type.strictDirectoryName && typeDir !== component.type.directoryName) {
                        return components;
                    }
                }
            }
        }
        return components.concat(dirQueue.flatMap((d) => this.getComponentsFromPathRecursive(d, inclusiveFilter)));
    }
    resolveComponent(fsPath, isResolvingSource) {
        if (this.forceIgnore?.denies(fsPath)) {
            // don't resolve the component if the path is denied
            this.forceIgnoredPaths.add(fsPath);
            return;
        }
        const type = resolveType(this.registry)(this.tree)(fsPath);
        if (type) {
            const adapter = new sourceAdapterFactory_1.SourceAdapterFactory(this.registry, this.tree).getAdapter(type, this.forceIgnore);
            // short circuit the component resolution unless this is a resolve for a
            // source path or allowed content-only path, otherwise the adapter
            // knows how to handle it
            const shouldResolve = isResolvingSource ||
                parseAsRootMetadataXml(fsPath) ||
                !parseAsContentMetadataXml(this.registry)(fsPath) ||
                !adapter.allowMetadataWithContent();
            return shouldResolve ? adapter.getComponent(fsPath, isResolvingSource) : undefined;
        }
        if (isProbablyPackageManifest(this.tree)(fsPath))
            return undefined;
        void lifecycle_1.Lifecycle.getInstance().emitTelemetry({
            eventName: 'metadata_resolver_type_inference_error',
            library: 'SDR',
            function: 'resolveComponent',
            path: fsPath,
        });
        // The metadata type could not be inferred
        // Attempt to guess the type and throw an error with actions
        const actions = getSuggestionsForUnresolvedTypes(this.registry)(fsPath);
        throw new sfError_1.SfError(messages.getMessage('error_could_not_infer_type', [fsPath]), 'TypeInferenceError', actions);
    }
}
exports.MetadataResolver = MetadataResolver;
const isProbablyPackageManifest = (tree) => (fsPath) => {
    // Perform some additional checks to see if this is a package manifest
    if (fsPath.endsWith('.xml') && !fsPath.endsWith(constants_1.META_XML_SUFFIX)) {
        // If it is named the default package.xml, assume it is a package manifest
        if (fsPath.endsWith('package.xml'))
            return true;
        try {
            // If the file contains the string "<Package xmlns", it is a package manifest
            if (tree.readFileSync(fsPath).toString().includes('<Package xmlns'))
                return true;
        }
        catch (err) {
            const error = err;
            if (error.message === 'Method not implemented') {
                // Currently readFileSync is not implemented for zipTreeContainer
                // Ignoring since this would have been ignored in the past
                logger_1.Logger.childFromRoot('metadataResolver.isProbablyPackageManifest').warn(`Type could not be inferred for ${fsPath}. It is likely this is a package manifest. Skipping...`);
                return true;
            }
            return false;
        }
    }
    return false;
};
/**
 * Whether or not a directory that represents a single component should be resolved as one,
 * or if it should be walked for additional components.
 *
 * If a type can be determined from a directory path, and the end part of the path isn't
 * the directoryName of the type itself, infer the path is part of a mixedContent component
 *
 * @param registry the registry to resolve a type against
 */
const resolveDirectoryAsComponent = (registry) => (tree) => (dirPath) => {
    const type = resolveType(registry)(tree)(dirPath);
    if (type) {
        const { directoryName, inFolder } = type;
        const parts = dirPath.split(node_path_1.sep);
        const folderOffset = inFolder ? 2 : 1;
        const typeDirectoryIndex = parts.lastIndexOf(directoryName);
        if (typeDirectoryIndex === -1 ||
            parts.length - folderOffset <= typeDirectoryIndex ||
            // ex: /lwc/folder/lwc/cmp
            tree.readDirectory(dirPath).includes(type.directoryName) ||
            // types with children may want to resolve them individually
            type.children) {
            return false;
        }
    }
    else {
        return false;
    }
    return true;
};
const isMetadata = (registry) => (tree) => (fsPath) => !!(0, path_1.parseMetadataXml)(fsPath) ||
    parseAsContentMetadataXml(registry)(fsPath) ||
    !!parseAsFolderMetadataXml(registry)(fsPath) ||
    !!parseAsMetadata(registry)(tree)(fsPath);
/**
 * Attempt to find similar types for types that could not be inferred
 * To be used after executing the resolveType() method
 *
 * @returns an array of suggestions
 * @param registry a metdata registry to resolve types against
 */
const getSuggestionsForUnresolvedTypes = (registry) => (fsPath) => {
    const parsedMetaXml = (0, path_1.parseMetadataXml)(fsPath);
    const metaSuffix = parsedMetaXml?.suffix;
    // Finds close matches for meta suffixes
    // Examples: https://regex101.com/r/vbRjwy/1
    const closeMetaSuffix = CLOSE_META_SUFFIX_REGEX.exec((0, node_path_1.basename)(fsPath));
    let guesses;
    if (metaSuffix) {
        guesses = registry.guessTypeBySuffix(metaSuffix);
    }
    else if (!metaSuffix && closeMetaSuffix) {
        guesses = registry.guessTypeBySuffix(closeMetaSuffix[1]);
    }
    else {
        guesses = registry.guessTypeBySuffix((0, path_1.extName)(fsPath));
    }
    // If guesses were found, format an array of strings to be passed to SfError's actions
    return guesses && guesses.length > 0
        ? [
            messages.getMessage('suggest_type_header', [(0, node_path_1.basename)(fsPath)]),
            ...guesses.map((guess) => messages.getMessage('suggest_type_did_you_mean', [
                guess.suffixGuess,
                typeof metaSuffix === 'string' || closeMetaSuffix ? '-meta.xml' : '',
                guess.metadataTypeGuess.name,
            ])),
            '', // A blank line makes this much easier to read (it doesn't seem to be possible to start a markdown message entry with a newline)
            messages.getMessage('suggest_type_more_suggestions'),
        ]
        : [];
};
// Get the array of directoryNames for types that have folderContentType
const getFolderContentTypeDirNames = (registry) => registry.getFolderContentTypes().map((t) => t.directoryName);
/**
 * Identify metadata xml for a folder component:
 * .../email/TestFolder-meta.xml
 * .../reports/foo/bar-meta.xml
 *
 * Do not match this pattern:
 * .../tabs/TestFolder.tab-meta.xml
 */
const parseAsFolderMetadataXml = (registry) => (fsPath) => {
    let folderName;
    const match = FOLDER_META_XML_REGEX.exec((0, node_path_1.basename)(fsPath));
    if (match && !match[1].includes('.')) {
        const parts = fsPath.split(node_path_1.sep);
        if (parts.length > 1) {
            const folderContentTypesDirs = getFolderContentTypeDirNames(registry);
            // check if the path contains a folder content name as a directory
            const pathWithoutFile = parts.slice(0, -1);
            folderContentTypesDirs.some((dirName) => {
                if (pathWithoutFile.includes(dirName)) {
                    folderName = dirName;
                }
            });
        }
    }
    return folderName;
};
const resolveType = (registry) => (tree) => (fsPath) => {
    // attempt 1 - check if the file is part of a component that requires a strict type folder
    let resolvedType = resolveTypeFromStrictFolder(registry)(fsPath);
    // attempt 2 - check if it's a metadata xml file
    if (!resolvedType) {
        const parsedMetaXml = (0, path_1.parseMetadataXml)(fsPath);
        if (parsedMetaXml?.suffix) {
            resolvedType = registry.getTypeBySuffix(parsedMetaXml.suffix);
        }
    }
    // attempt 2.5 - test for a folder style xml file
    if (!resolvedType) {
        const metadataFolder = parseAsFolderMetadataXml(registry)(fsPath);
        if (metadataFolder) {
            // multiple matching directories may exist - folder components are not 'inFolder'
            resolvedType = registry.findType((type) => type.directoryName === metadataFolder && !type.inFolder);
        }
    }
    // attempt 3 - try treating the file extension name as a suffix
    if (!resolvedType) {
        resolvedType = registry.getTypeBySuffix((0, path_1.extName)(fsPath));
        // Metadata types with `strictDirectoryName` should have been caught in "attempt 1".
        // If the metadata returned from this lookup has a `strictDirectoryName`, something is wrong.
        // It is likely that the metadata file is misspelled or has the wrong suffix.
        // A common occurrence is that a misspelled metadata file will fall back to
        // `EmailServicesFunction` because that is the default for the `.xml` suffix
        if (resolvedType?.strictDirectoryName === true && !fsPath.split(node_path_1.sep).includes(resolvedType.directoryName)) {
            resolvedType = undefined;
        }
    }
    // attempt 4 - try treating the content as metadata
    if (!resolvedType) {
        const metadata = parseAsMetadata(registry)(tree)(fsPath);
        if (metadata) {
            resolvedType = registry.getTypeByName(metadata);
        }
    }
    return resolvedType;
};
/**
 * Any file with a registered suffix is potentially a content metadata file.
 *
 * @param registry a metadata registry to resolve types agsinst
 */
const parseAsContentMetadataXml = (registry) => (fsPath) => {
    const suffixType = registry.getTypeBySuffix((0, path_1.extName)(fsPath));
    if (!suffixType)
        return false;
    const matchesSuffixType = fsPath.split(node_path_1.sep).includes(suffixType.directoryName);
    if (matchesSuffixType)
        return matchesSuffixType;
    // at this point, the suffixType is not a match, so check for strict folder types
    return !!resolveTypeFromStrictFolder(registry)(fsPath);
};
/**
 * If this file should be considered as a metadata file then return the metadata type
 */
const parseAsMetadata = (registry) => (tree) => (fsPath) => {
    if (tree.isDirectory(fsPath)) {
        return;
    }
    return [
        'DigitalExperience',
        'ExperiencePropertyTypeBundle',
        'LightningTypeBundle',
        'ContentTypeBundle',
        'UiWidgetBundle',
    ]
        .map((type) => registry.getTypeByName(type))
        .find((type) => fsPath.split(node_path_1.sep).includes(type.directoryName))?.name;
};
const resolveTypeFromStrictFolder = (registry) => (fsPath) => {
    const pathParts = fsPath.split(node_path_1.sep);
    // first, filter out types that don't appear in the path
    // then iterate using for/of to allow for early break
    return registry
        .getStrictFolderTypes()
        .filter(pathIncludesDirName(pathParts)) // the type's directory is in the path
        .filter(folderTypeFilter(fsPath))
        .find((type) => 
    // any of the following options is considered a good match
    isMixedContentOrBundle(type) ||
        suffixMatches(type, fsPath) ||
        childSuffixMatches(type, fsPath) ||
        legacySuffixMatches(type, fsPath));
};
/** the type has children and the file suffix (in source format) matches a child type suffix of the type we think it is */
const childSuffixMatches = (type, fsPath) => Object.values(type.children?.types ?? {}).some((childType) => suffixMatches(childType, fsPath) || legacySuffixMatches(childType, fsPath));
/** the file suffix (in source or mdapi format) matches the type suffix we think it is */
const suffixMatches = (type, fsPath) => typeof type.suffix === 'string' &&
    (fsPath.endsWith(type.suffix) || fsPath.endsWith(appendMetaXmlSuffix(type.suffix)));
const legacySuffixMatches = (type, fsPath) => {
    if (typeof type.legacySuffix === 'string' &&
        (fsPath.endsWith(type.legacySuffix) || fsPath.endsWith(appendMetaXmlSuffix(type.legacySuffix)))) {
        void lifecycle_1.Lifecycle.getInstance().emitWarning(`The ${type.name} component at ${fsPath} uses the legacy suffix ${type.legacySuffix}. This suffix is deprecated and will be removed in a future release.`);
        return true;
    }
    return false;
};
const appendMetaXmlSuffix = (suffix) => `${suffix}${constants_1.META_XML_SUFFIX}`;
const isMixedContentOrBundle = (type) => typeof type.strategies?.adapter === 'string' &&
    ['mixedContent', 'bundle', 'uiBundles'].includes(type.strategies.adapter);
/** types with folders only have folder components living at the top level.
 * if the fsPath is a folder component, let a future strategy deal with it
 */
const folderTypeFilter = (fsPath) => (type) => !type.inFolder || (0, path_1.parentName)(fsPath) !== type.directoryName;
const pathIncludesDirName = (parts) => (type) => parts.includes(type.directoryName);
/**
 * Any metadata xml file (-meta.xml) is potentially a root metadata file.
 *
 * @param fsPath File path of a potential metadata xml file
 */
const parseAsRootMetadataXml = (fsPath) => Boolean((0, path_1.parseMetadataXml)(fsPath));
/** Sort comparator that places directories before files. */
const directoriesFirst = (isDirByPath) => (a, b) => isDirByPath.get(a) === isDirByPath.get(b) ? 0 : isDirByPath.get(a) ? -1 : 1;
//# sourceMappingURL=metadataResolver.js.map

/***/ }),

/***/ 51453:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.baseWithoutSuffixes = exports.parseNestedFullName = exports.trimUntil = exports.parentName = exports.parseMetadataXml = exports.baseName = exports.extName = exports.trimMetaXmlSuffix = exports.generateMetaXMLPath = exports.generateMetaXML = void 0;
/*
 * Copyright 2026, Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var metadata_1 = __webpack_require__(89008);
Object.defineProperty(exports, "generateMetaXML", ({ enumerable: true, get: function () { return metadata_1.generateMetaXML; } }));
Object.defineProperty(exports, "generateMetaXMLPath", ({ enumerable: true, get: function () { return metadata_1.generateMetaXMLPath; } }));
Object.defineProperty(exports, "trimMetaXmlSuffix", ({ enumerable: true, get: function () { return metadata_1.trimMetaXmlSuffix; } }));
var path_1 = __webpack_require__(15638);
Object.defineProperty(exports, "extName", ({ enumerable: true, get: function () { return path_1.extName; } }));
Object.defineProperty(exports, "baseName", ({ enumerable: true, get: function () { return path_1.baseName; } }));
Object.defineProperty(exports, "parseMetadataXml", ({ enumerable: true, get: function () { return path_1.parseMetadataXml; } }));
Object.defineProperty(exports, "parentName", ({ enumerable: true, get: function () { return path_1.parentName; } }));
Object.defineProperty(exports, "trimUntil", ({ enumerable: true, get: function () { return path_1.trimUntil; } }));
Object.defineProperty(exports, "parseNestedFullName", ({ enumerable: true, get: function () { return path_1.parseNestedFullName; } }));
Object.defineProperty(exports, "baseWithoutSuffixes", ({ enumerable: true, get: function () { return path_1.baseWithoutSuffixes; } }));
//# sourceMappingURL=index.js.map

/***/ })

};
