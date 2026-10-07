export const id = 885;
export const ids = [885];
export const modules = {

/***/ 7769:
/***/ ((module) => {



function deepClone (obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime())
  }

  if (obj instanceof Array) {
    const cloned = []
    for (let i = 0; i < obj.length; i++) {
      cloned[i] = deepClone(obj[i])
    }
    return cloned
  }

  if (typeof obj === 'object') {
    const cloned = Object.create(Object.getPrototypeOf(obj))
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cloned[key] = deepClone(obj[key])
      }
    }
    return cloned
  }

  return obj
}

function parsePath (path) {
  const parts = []
  let current = ''
  let inBrackets = false
  let inQuotes = false
  let quoteChar = ''

  for (let i = 0; i < path.length; i++) {
    const char = path[i]

    if (!inBrackets && char === '.') {
      if (current) {
        parts.push(current)
        current = ''
      }
    } else if (char === '[') {
      if (current) {
        parts.push(current)
        current = ''
      }
      inBrackets = true
    } else if (char === ']' && inBrackets) {
      // Always push the current value when closing brackets, even if it's an empty string
      parts.push(current)
      current = ''
      inBrackets = false
      inQuotes = false
    } else if ((char === '"' || char === "'") && inBrackets) {
      if (!inQuotes) {
        inQuotes = true
        quoteChar = char
      } else if (char === quoteChar) {
        inQuotes = false
        quoteChar = ''
      } else {
        current += char
      }
    } else {
      current += char
    }
  }

  if (current) {
    parts.push(current)
  }

  return parts
}

function setValue (obj, parts, value) {
  let current = obj

  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i]
    // Type safety: Check if current is an object before using 'in' operator
    if (typeof current !== 'object' || current === null || !(key in current)) {
      return false // Path doesn't exist, don't create it
    }
    if (typeof current[key] !== 'object' || current[key] === null) {
      return false // Path doesn't exist properly
    }
    current = current[key]
  }

  const lastKey = parts[parts.length - 1]
  if (lastKey === '*') {
    if (Array.isArray(current)) {
      for (let i = 0; i < current.length; i++) {
        current[i] = value
      }
    } else if (typeof current === 'object' && current !== null) {
      for (const key in current) {
        if (Object.prototype.hasOwnProperty.call(current, key)) {
          current[key] = value
        }
      }
    }
  } else {
    // Type safety: Check if current is an object before using 'in' operator
    if (typeof current === 'object' && current !== null && lastKey in current && Object.prototype.hasOwnProperty.call(current, lastKey)) {
      current[lastKey] = value
    }
  }
  return true
}

function removeKey (obj, parts) {
  let current = obj

  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i]
    // Type safety: Check if current is an object before using 'in' operator
    if (typeof current !== 'object' || current === null || !(key in current)) {
      return false // Path doesn't exist, don't create it
    }
    if (typeof current[key] !== 'object' || current[key] === null) {
      return false // Path doesn't exist properly
    }
    current = current[key]
  }

  const lastKey = parts[parts.length - 1]
  if (lastKey === '*') {
    if (Array.isArray(current)) {
      // For arrays, we can't really "remove" all items as that would change indices
      // Instead, we set them to undefined which will be omitted by JSON.stringify
      for (let i = 0; i < current.length; i++) {
        current[i] = undefined
      }
    } else if (typeof current === 'object' && current !== null) {
      for (const key in current) {
        if (Object.prototype.hasOwnProperty.call(current, key)) {
          delete current[key]
        }
      }
    }
  } else {
    // Type safety: Check if current is an object before using 'in' operator
    if (typeof current === 'object' && current !== null && lastKey in current && Object.prototype.hasOwnProperty.call(current, lastKey)) {
      delete current[lastKey]
    }
  }
  return true
}

// Sentinel object to distinguish between undefined value and non-existent path
const PATH_NOT_FOUND = Symbol('PATH_NOT_FOUND')

function getValueIfExists (obj, parts) {
  let current = obj

  for (const part of parts) {
    if (current === null || current === undefined) {
      return PATH_NOT_FOUND
    }
    // Type safety: Check if current is an object before property access
    if (typeof current !== 'object' || current === null) {
      return PATH_NOT_FOUND
    }
    // Check if the property exists before accessing it
    if (!(part in current)) {
      return PATH_NOT_FOUND
    }
    current = current[part]
  }

  return current
}

function getValue (obj, parts) {
  let current = obj

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined
    }
    // Type safety: Check if current is an object before property access
    if (typeof current !== 'object' || current === null) {
      return undefined
    }
    current = current[part]
  }

  return current
}

function redactPaths (obj, paths, censor, remove = false) {
  for (const path of paths) {
    const parts = parsePath(path)

    if (parts.includes('*')) {
      redactWildcardPath(obj, parts, censor, path, remove)
    } else {
      if (remove) {
        removeKey(obj, parts)
      } else {
        // Get value only if path exists - single traversal
        const value = getValueIfExists(obj, parts)
        if (value === PATH_NOT_FOUND) {
          continue
        }

        const actualCensor = typeof censor === 'function'
          ? censor(value, parts)
          : censor
        setValue(obj, parts, actualCensor)
      }
    }
  }
}

function redactWildcardPath (obj, parts, censor, originalPath, remove = false) {
  const wildcardIndex = parts.indexOf('*')

  if (wildcardIndex === parts.length - 1) {
    const parentParts = parts.slice(0, -1)
    let current = obj

    for (const part of parentParts) {
      if (current === null || current === undefined) return
      // Type safety: Check if current is an object before property access
      if (typeof current !== 'object' || current === null) return
      current = current[part]
    }

    if (Array.isArray(current)) {
      if (remove) {
        // For arrays, set all items to undefined which will be omitted by JSON.stringify
        for (let i = 0; i < current.length; i++) {
          current[i] = undefined
        }
      } else {
        for (let i = 0; i < current.length; i++) {
          const indexPath = [...parentParts, i.toString()]
          const actualCensor = typeof censor === 'function'
            ? censor(current[i], indexPath)
            : censor
          current[i] = actualCensor
        }
      }
    } else if (typeof current === 'object' && current !== null) {
      if (remove) {
        // Collect keys to delete to avoid issues with deleting during iteration
        const keysToDelete = []
        for (const key in current) {
          if (Object.prototype.hasOwnProperty.call(current, key)) {
            keysToDelete.push(key)
          }
        }
        for (const key of keysToDelete) {
          delete current[key]
        }
      } else {
        for (const key in current) {
          const keyPath = [...parentParts, key]
          const actualCensor = typeof censor === 'function'
            ? censor(current[key], keyPath)
            : censor
          current[key] = actualCensor
        }
      }
    }
  } else {
    redactIntermediateWildcard(obj, parts, censor, wildcardIndex, originalPath, remove)
  }
}

function redactIntermediateWildcard (obj, parts, censor, wildcardIndex, originalPath, remove = false) {
  const beforeWildcard = parts.slice(0, wildcardIndex)
  const afterWildcard = parts.slice(wildcardIndex + 1)
  const pathArray = [] // Cached array to avoid allocations

  function traverse (current, pathLength) {
    if (pathLength === beforeWildcard.length) {
      if (Array.isArray(current)) {
        for (let i = 0; i < current.length; i++) {
          pathArray[pathLength] = i.toString()
          traverse(current[i], pathLength + 1)
        }
      } else if (typeof current === 'object' && current !== null) {
        for (const key in current) {
          pathArray[pathLength] = key
          traverse(current[key], pathLength + 1)
        }
      }
    } else if (pathLength < beforeWildcard.length) {
      const nextKey = beforeWildcard[pathLength]
      // Type safety: Check if current is an object before using 'in' operator
      if (current && typeof current === 'object' && current !== null && nextKey in current) {
        pathArray[pathLength] = nextKey
        traverse(current[nextKey], pathLength + 1)
      }
    } else {
      // Check if afterWildcard contains more wildcards
      if (afterWildcard.includes('*')) {
        // Recursively handle remaining wildcards
        // Wrap censor to prepend current path context
        const wrappedCensor = typeof censor === 'function'
          ? (value, path) => {
              const fullPath = [...pathArray.slice(0, pathLength), ...path]
              return censor(value, fullPath)
            }
          : censor
        redactWildcardPath(current, afterWildcard, wrappedCensor, originalPath, remove)
      } else {
        // No more wildcards, apply the redaction directly
        if (remove) {
          removeKey(current, afterWildcard)
        } else {
          const actualCensor = typeof censor === 'function'
            ? censor(getValue(current, afterWildcard), [...pathArray.slice(0, pathLength), ...afterWildcard])
            : censor
          setValue(current, afterWildcard, actualCensor)
        }
      }
    }
  }

  if (beforeWildcard.length === 0) {
    traverse(obj, 0)
  } else {
    let current = obj
    for (let i = 0; i < beforeWildcard.length; i++) {
      const part = beforeWildcard[i]
      if (current === null || current === undefined) return
      // Type safety: Check if current is an object before property access
      if (typeof current !== 'object' || current === null) return
      current = current[part]
      pathArray[i] = part
    }
    if (current !== null && current !== undefined) {
      traverse(current, beforeWildcard.length)
    }
  }
}

function buildPathStructure (pathsToClone) {
  if (pathsToClone.length === 0) {
    return null // No paths to redact
  }

  // Parse all paths and organize by depth
  const pathStructure = new Map()
  for (const path of pathsToClone) {
    const parts = parsePath(path)
    let current = pathStructure
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      if (!current.has(part)) {
        current.set(part, new Map())
      }
      current = current.get(part)
    }
  }
  return pathStructure
}

function selectiveClone (obj, pathStructure) {
  if (!pathStructure) {
    return obj // No paths to redact, return original
  }

  function cloneSelectively (source, pathMap, depth = 0) {
    if (!pathMap || pathMap.size === 0) {
      return source // No more paths to clone, return reference
    }

    if (source === null || typeof source !== 'object') {
      return source
    }

    if (source instanceof Date) {
      return new Date(source.getTime())
    }

    if (Array.isArray(source)) {
      const cloned = []
      for (let i = 0; i < source.length; i++) {
        const indexStr = i.toString()
        if (pathMap.has(indexStr) || pathMap.has('*')) {
          cloned[i] = cloneSelectively(source[i], pathMap.get(indexStr) || pathMap.get('*'))
        } else {
          cloned[i] = source[i] // Share reference for non-redacted items
        }
      }
      return cloned
    }

    // Handle objects
    const cloned = Object.create(Object.getPrototypeOf(source))
    for (const key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        if (pathMap.has(key) || pathMap.has('*')) {
          cloned[key] = cloneSelectively(source[key], pathMap.get(key) || pathMap.get('*'))
        } else {
          cloned[key] = source[key] // Share reference for non-redacted properties
        }
      }
    }
    return cloned
  }

  return cloneSelectively(obj, pathStructure)
}

function validatePath (path) {
  if (typeof path !== 'string') {
    throw new Error('Paths must be (non-empty) strings')
  }

  if (path === '') {
    throw new Error('Invalid redaction path ()')
  }

  // Check for double dots
  if (path.includes('..')) {
    throw new Error(`Invalid redaction path (${path})`)
  }

  // Check for comma-separated paths (invalid syntax)
  if (path.includes(',')) {
    throw new Error(`Invalid redaction path (${path})`)
  }

  // Check for unmatched brackets
  let bracketCount = 0
  let inQuotes = false
  let quoteChar = ''

  for (let i = 0; i < path.length; i++) {
    const char = path[i]

    if ((char === '"' || char === "'") && bracketCount > 0) {
      if (!inQuotes) {
        inQuotes = true
        quoteChar = char
      } else if (char === quoteChar) {
        inQuotes = false
        quoteChar = ''
      }
    } else if (char === '[' && !inQuotes) {
      bracketCount++
    } else if (char === ']' && !inQuotes) {
      bracketCount--
      if (bracketCount < 0) {
        throw new Error(`Invalid redaction path (${path})`)
      }
    }
  }

  if (bracketCount !== 0) {
    throw new Error(`Invalid redaction path (${path})`)
  }
}

function validatePaths (paths) {
  if (!Array.isArray(paths)) {
    throw new TypeError('paths must be an array')
  }

  for (const path of paths) {
    validatePath(path)
  }
}

function slowRedact (options = {}) {
  const {
    paths = [],
    censor = '[REDACTED]',
    serialize = JSON.stringify,
    strict = true,
    remove = false
  } = options

  // Validate paths upfront to match fast-redact behavior
  validatePaths(paths)

  // Build path structure once during setup, not on every call
  const pathStructure = buildPathStructure(paths)

  return function redact (obj) {
    if (strict && (obj === null || typeof obj !== 'object')) {
      if (obj === null || obj === undefined) {
        return serialize ? serialize(obj) : obj
      }
      if (typeof obj !== 'object') {
        return serialize ? serialize(obj) : obj
      }
    }

    // Only clone paths that need redaction
    const cloned = selectiveClone(obj, pathStructure)
    const original = obj // Keep reference to original for restore

    let actualCensor = censor
    if (typeof censor === 'function') {
      actualCensor = censor
    }

    redactPaths(cloned, paths, actualCensor, remove)

    if (serialize === false) {
      cloned.restore = function () {
        return deepClone(original) // Full clone only when restore is called
      }
      return cloned
    }

    if (typeof serialize === 'function') {
      return serialize(cloned)
    }

    return JSON.stringify(cloned)
  }
}

module.exports = slowRedact


/***/ }),

/***/ 94524:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.resetFs = exports.setFs = exports.getVirtualFs = exports.fs = void 0;
const nodeFs = __importStar(__webpack_require__(73024));
// yes, we're going to import it even though it might not be used.
// the alternatives were all worse without top-level await (iife, runtime errors from something trying to use it before it's initialized)
const memfs = __importStar(__webpack_require__(35150));
const isWeb_1 = __webpack_require__(39982);
const getVirtualFs = (memfsVolume) => {
    if (process.env.FORCE_MEMFS === 'true' || (0, isWeb_1.isWeb)()) {
        const memfsInstance = memfs.createFsFromVolume(memfsVolume ?? new memfs.Volume());
        // Start with memfs instance and only override problematic methods
        const webFs = {
            ...memfsInstance,
            // Override only the methods that have incompatible signatures
            promises: {
                ...memfsInstance.promises,
                writeFile: async (file, data, options) => {
                    const finalOptions = typeof options === 'string' ? { encoding: options } : options;
                    await memfsInstance.promises.writeFile(file, data, finalOptions);
                },
                readFile: async (path, options) => {
                    // Handle both signatures: readFile(path, 'utf8') and readFile(path, { encoding: 'utf8' })
                    const encoding = typeof options === 'string' ? options : options?.encoding;
                    const result = await memfsInstance.promises.readFile(path, encoding ? { encoding } : undefined);
                    return encoding ? String(result) : result;
                },
            },
            readFileSync: (path, options) => {
                // Handle both signatures: readFileSync(path, 'utf8') and readFileSync(path, { encoding: 'utf8' })
                const encoding = typeof options === 'string' ? options : options?.encoding;
                const result = memfsInstance.readFileSync(path, encoding ? { encoding } : undefined);
                return encoding ? String(result) : result;
            },
            writeFileSync: (file, data, options) => {
                const finalOptions = typeof options === 'string' ? { encoding: options } : options;
                memfsInstance.writeFileSync(file, data, finalOptions);
            },
        };
        return webFs;
    }
    return nodeFs;
};
exports.getVirtualFs = getVirtualFs;
const setFs = (providedFs) => {
    exports.fs = providedFs;
};
exports.setFs = setFs;
const resetFs = () => {
    exports.fs = (0, exports.getVirtualFs)();
};
exports.resetFs = resetFs;
// Initialize fs at module load time
exports.fs = (0, exports.getVirtualFs)();
//# sourceMappingURL=fs.js.map

/***/ }),

/***/ 94500:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Global = exports.Mode = void 0;
const os = __importStar(__webpack_require__(48161));
const path = __importStar(__webpack_require__(76760));
const kit_1 = __webpack_require__(23472);
const fs_1 = __webpack_require__(94524);
const isWeb_1 = __webpack_require__(39982);
const sfError_1 = __webpack_require__(78914);
/**
 * Represents an environment mode.  Supports `production`, `development`, `demo`, and `test`
 * with the default mode being `production`.
 *
 * To set the mode, `export SFDX_ENV=<mode>` in your current environment.
 */
var Mode;
(function (Mode) {
    Mode["PRODUCTION"] = "production";
    Mode["DEVELOPMENT"] = "development";
    Mode["DEMO"] = "demo";
    Mode["TEST"] = "test";
})(Mode || (exports.Mode = Mode = {}));
/**
 * Global constants, methods, and configuration.
 */
class Global {
    /**
     * Enable interoperability between `.sfdx` and `.sf`.
     *
     * When @salesforce/core@v2 is deprecated and no longer used, this can be removed.
     */
    static SFDX_INTEROPERABILITY = kit_1.env.getBoolean('SF_SFDX_INTEROPERABILITY', true);
    /**
     * The global folder in which sfdx state is stored.
     */
    static SFDX_STATE_FOLDER = '.sfdx';
    /**
     * The global folder in which sf state is stored.
     */
    static SF_STATE_FOLDER = '.sf';
    /**
     * The preferred global folder in which state is stored.
     */
    static STATE_FOLDER = Global.SFDX_STATE_FOLDER;
    /**
     * Whether the code is running in a web browser.
     */
    static get isWeb() {
        return (0, isWeb_1.isWeb)();
    }
    /**
     * The full system path to the global sfdx state folder.
     *
     * **See** {@link Global.SFDX_STATE_FOLDER}
     */
    static get SFDX_DIR() {
        return path.join(os.homedir(), Global.SFDX_STATE_FOLDER);
    }
    /**
     * The full system path to the global sf state folder.
     *
     * **See**  {@link Global.SF_STATE_FOLDER}
     */
    static get SF_DIR() {
        return path.join(os.homedir(), Global.SF_STATE_FOLDER);
    }
    /**
     * The full system path to the preferred global state folder
     */
    static get DIR() {
        return path.join(os.homedir(), Global.SFDX_STATE_FOLDER);
    }
    /**
     * Gets the current mode environment variable as a {@link Mode} instance.
     *
     * ```
     * console.log(Global.getEnvironmentMode() === Mode.PRODUCTION);
     * ```
     */
    static getEnvironmentMode() {
        const envValue = kit_1.env.getString('SF_ENV') ?? kit_1.env.getString('SFDX_ENV', Mode.PRODUCTION);
        return envValue in Mode || envValue.toUpperCase() in Mode
            ? Mode[envValue.toUpperCase()]
            : Mode.PRODUCTION;
    }
    /**
     * Creates a directory within {@link Global.SFDX_DIR}, or {@link Global.SFDX_DIR} itself if the `dirPath` param
     * is not provided. This is resolved or rejected when the directory creation operation has completed.
     *
     * @param dirPath The directory path to be created within {@link Global.SFDX_DIR}.
     */
    static async createDir(dirPath) {
        const resolvedPath = dirPath ? path.join(Global.SFDX_DIR, dirPath) : Global.SFDX_DIR;
        try {
            if (process.platform === 'win32' || Global.isWeb) {
                await fs_1.fs.promises.mkdir(resolvedPath, { recursive: true });
            }
            else {
                await fs_1.fs.promises.mkdir(resolvedPath, { recursive: true, mode: 0o700 });
            }
        }
        catch (error) {
            throw new sfError_1.SfError(`Failed to create directory or set permissions for: ${resolvedPath}`);
        }
    }
}
exports.Global = Global;
//# sourceMappingURL=global.js.map

/***/ }),

/***/ 17838:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.cloneUniqueListeners = exports.Lifecycle = void 0;
const semver_1 = __webpack_require__(62088);
const pjson = __importStar(__webpack_require__(81673));
const logger_1 = __webpack_require__(81346);
/**
 * An asynchronous event listener and emitter that follows the singleton pattern. The singleton pattern allows lifecycle
 * events to be emitted from deep within a library and still be consumed by any other library or tool. It allows other
 * developers to react to certain situations or events in your library without them having to manually call the method themselves.
 *
 * An example might be transforming metadata before it is deployed to an environment. As long as an event was emitted from the
 * deploy library and you were listening on that event in the same process, you could transform the metadata before the deploy
 * regardless of where in the code that metadata was initiated.
 *
 * @example
 * ```
 * // Listen for an event in a plugin hook
 * Lifecycle.getInstance().on('deploy-metadata', transformMetadata)
 *
 * // Deep in the deploy code, fire the event for all libraries and plugins to hear.
 * Lifecycle.getInstance().emit('deploy-metadata', metadataToBeDeployed);
 *
 * // if you don't need to await anything
 * use `void Lifecycle.getInstance().emit('deploy-metadata', metadataToBeDeployed)` ;
 * ```
 */
class Lifecycle {
    listeners;
    uniqueListeners;
    static telemetryEventName = 'telemetry';
    static warningEventName = 'warning';
    logger;
    constructor(listeners = {}, uniqueListeners = new Map()) {
        this.listeners = listeners;
        this.uniqueListeners = uniqueListeners;
    }
    /**
     * return the package.json version of the sfdx-core library.
     */
    static staticVersion() {
        return pjson.version;
    }
    /**
     * Retrieve the singleton instance of this class so that all listeners and emitters can interact from any library or tool
     */
    static getInstance() {
        // Across a npm dependency tree, there may be a LOT of versions of `@salesforce/core`. We want to ensure that consumers are notified when
        // listening on a lifecycle event that is fired by a different version of `@salesforce/core`. Adding the instance on the global object will
        // ensure this.
        //
        // For example, a consumer calls `Lifecycle.getInstance().on('myEvent', ...)` on version `@salesforce/core@2.12.2`, and another consumer calls
        // `Lifecycle.getInstance().emit('myEvent', ...)` on version `@salesforce/core@2.13.0`, the on handler will never be called.
        //
        // Note: If ANYTHING is ever added to this class, it needs to check and update `global.salesforceCoreLifecycle` to the newer version.
        // One way this can be done by adding a `version = require(../package.json).version` to the Lifecycle class, then checking if
        // `global.salesforceCoreLifecycle` is greater or equal to that version.
        //
        // For example, let's say a new method is added in `@salesforce/core@3.0.0`. If `Lifecycle.getInstance()` is called fist by
        // `@salesforce/core@2.12.2` then by someone who depends on version `@salesforce/core@3.0.0` (who depends on the new method)
        // they will get a "method does not exist on object" error because the instance on the global object will be of `@salesforce/core@2.12.2`.
        //
        // Nothing should EVER be removed, even across major versions.
        if (!global.salesforceCoreLifecycle) {
            // it's not been loaded yet (basic singleton pattern)
            global.salesforceCoreLifecycle = new Lifecycle();
        }
        else if (
        // an older version was loaded that should be replaced
        (0, semver_1.compare)(global.salesforceCoreLifecycle.version(), Lifecycle.staticVersion()) === -1) {
            const oldInstance = global.salesforceCoreLifecycle;
            // use the newer version and transfer any listeners from the old version
            // object spread and the clone fn keep them from being references
            global.salesforceCoreLifecycle = new Lifecycle({ ...oldInstance.listeners }, (0, exports.cloneUniqueListeners)(oldInstance.uniqueListeners));
            // clean up any listeners on the old version
            Object.keys(oldInstance.listeners).map((eventName) => {
                oldInstance.removeAllListeners(eventName);
            });
        }
        return global.salesforceCoreLifecycle;
    }
    /**
     * return the package.json version of the sfdx-core library.
     */
    // eslint-disable-next-line class-methods-use-this
    version() {
        return pjson.version;
    }
    /**
     * Remove all listeners for a given event
     *
     * @param eventName The name of the event to remove listeners of
     */
    removeAllListeners(eventName) {
        this.listeners[eventName] = [];
        this.uniqueListeners.delete(eventName);
    }
    /**
     * Get an array of listeners (callback functions) for a given event
     *
     * @param eventName The name of the event to get listeners of
     */
    getListeners(eventName) {
        const listeners = this.listeners[eventName]?.concat(Array.from((this.uniqueListeners.get(eventName) ?? []).values()) ?? []);
        if (listeners) {
            return listeners;
        }
        else {
            this.listeners[eventName] = [];
            return [];
        }
    }
    /**
     * Create a listener for the `telemetry` event
     *
     * @param cb The callback function to run when the event is emitted
     */
    onTelemetry(cb) {
        this.on(Lifecycle.telemetryEventName, cb);
    }
    /**
     * Create a listener for the `warning` event
     *
     * @param cb The callback function to run when the event is emitted
     */
    onWarning(cb) {
        this.on(Lifecycle.warningEventName, cb);
    }
    /**
     * Create a new listener for a given event
     *
     * @param eventName The name of the event that is being listened for
     * @param cb The callback function to run when the event is emitted
     * @param uniqueListenerIdentifier A unique identifier for the listener. If a listener with the same identifier is already registered, a new one will not be added
     */
    on(eventName, cb, uniqueListenerIdentifier) {
        const listeners = this.getListeners(eventName);
        if (listeners.length !== 0) {
            if (!this.logger) {
                this.logger = logger_1.Logger.childFromRoot('Lifecycle');
            }
            this.logger.debug(`${listeners.length + 1} lifecycle events with the name ${eventName} have now been registered. When this event is emitted all ${listeners.length + 1} listeners will fire.`);
        }
        if (uniqueListenerIdentifier) {
            if (!this.uniqueListeners.has(eventName)) {
                // nobody is listening to the event yet
                this.uniqueListeners.set(eventName, new Map([[uniqueListenerIdentifier, cb]]));
            }
            else if (!this.uniqueListeners.get(eventName)?.has(uniqueListenerIdentifier)) {
                // the unique listener identifier is not already registered
                this.uniqueListeners.get(eventName)?.set(uniqueListenerIdentifier, cb);
            }
        }
        else {
            listeners.push(cb);
            this.listeners[eventName] = listeners;
        }
    }
    /**
     * Emit a `telemetry` event, causing all callback functions to be run in the order they were registered
     *
     * @param data The data to emit
     */
    async emitTelemetry(data) {
        return this.emit(Lifecycle.telemetryEventName, data);
    }
    /**
     * Emit a `warning` event, causing all callback functions to be run in the order they were registered
     *
     * @param data The warning (string) to emit
     */
    async emitWarning(warning) {
        // if there are no listeners, warnings should go to the node process so they're not lost
        // this also preserves behavior in UT where there's a spy on process.emitWarning
        if (this.getListeners(Lifecycle.warningEventName).length === 0) {
            process.emitWarning(warning);
        }
        return this.emit(Lifecycle.warningEventName, warning);
    }
    /**
     * Emit a given event, causing all callback functions to be run in the order they were registered
     *
     * @param eventName The name of the event to emit
     * @param data The argument to be passed to the callback function
     */
    async emit(eventName, data) {
        const listeners = this.getListeners(eventName);
        if (listeners.length === 0 && eventName !== Lifecycle.warningEventName) {
            if (!this.logger) {
                this.logger = logger_1.Logger.childFromRoot('Lifecycle');
            }
            this.logger.debug(`A lifecycle event with the name ${eventName} does not exist. An event must be registered before it can be emitted.`);
        }
        else {
            for (const cb of listeners) {
                // eslint-disable-next-line no-await-in-loop
                await cb(data);
            }
        }
    }
}
exports.Lifecycle = Lifecycle;
const cloneListeners = (listeners) => new Map(Array.from(listeners.entries()));
const cloneUniqueListeners = (uniqueListeners) => 
// in case we're crossing major sfdx-core versions where uniqueListeners might be undefined
new Map(Array.from(uniqueListeners?.entries() ?? []).map(([key, value]) => [key, cloneListeners(value)]));
exports.cloneUniqueListeners = cloneUniqueListeners;
//# sourceMappingURL=lifecycleEvents.js.map

/***/ }),

/***/ 20340:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.getOldLogFiles = exports.cleanup = void 0;
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
const fs_1 = __webpack_require__(94524);
const global_1 = __webpack_require__(94500);
const logger_1 = __webpack_require__(81346);
/**
 * the odds of running are 1 in CLEAN_ODDS
 * ex: CLEAN_ODDS=100 implies 1 in 100
 * ex: CLEAN_ODDS=1 implies 1 in 1 (run every time)
 * */
const CLEAN_ODDS = 100;
const MAX_FILE_AGE_DAYS = 7;
const MAX_FILE_AGE_MS = 1000 * 60 * 60 * 24 * MAX_FILE_AGE_DAYS;
const shouldClean = Math.random() * CLEAN_ODDS > CLEAN_ODDS - 1;
/**
 * New logger (Summer 2023) changes how file rotation works.  Each day, the logger writes to a new file
 * To get old files cleaned up, this can be called when a new root logger is instantiated
 * based on CLEAN_ODDS, it could exit OR delete some old log files
 *
 * to start this without waiting, use void cleanup()
 *
 * accepts params to override the default behavior (used to cleanup huge log file during perf tests)
 */
const cleanup = async (maxMs = MAX_FILE_AGE_MS, force = false) => {
    if (shouldClean || force) {
        try {
            const filesToConsider = await fs_1.fs.promises // get the files in that dir
                .readdir(global_1.Global.SF_DIR);
            const filesToDelete = (0, exports.getOldLogFiles)(filesToConsider, maxMs);
            await Promise.all(filesToDelete.map((f) => fs_1.fs.promises.unlink((0, node_path_1.join)(global_1.Global.SF_DIR, f))));
        }
        catch (e) {
            // we never, ever, ever throw since we're not awaiting this promise, so just log a warning
            (await logger_1.Logger.child('cleanup')).warn('Failed to cleanup old log files', e);
        }
    }
};
exports.cleanup = cleanup;
const getOldLogFiles = (files, maxMs = MAX_FILE_AGE_MS) => files
    .filter((f) => f.endsWith('.log'))
    // map of filename and the date sf-YYYY-MM-DD.log => YYYY-MM-DD
    .map((f) => ({ file: f, date: f.match(/sf-(\d{4}-\d{2}-\d{2}).*\.log/)?.[1] }))
    .filter(hasDate)
    .map((f) => ({ file: f.file, date: new Date(f.date) }))
    .filter((f) => f.date < new Date(Date.now() - maxMs))
    .map((f) => f.file);
exports.getOldLogFiles = getOldLogFiles;
const hasDate = (f) => typeof f === 'object' && f !== null && 'date' in f && typeof f.date === 'string';
//# sourceMappingURL=cleanup.js.map

/***/ }),

/***/ 93375:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.filterSecrets = exports.HIDDEN = void 0;
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
const ts_types_1 = __webpack_require__(76865);
const sfdc_1 = __webpack_require__(52974);
exports.HIDDEN = 'HIDDEN';
// Match all json attribute values case insensitive: ex. {" Access*^&(*()^* Token " : " 45143075913458901348905 \n\t" ...}
const buildTokens = (expElement) => new RegExp(`(['"][^'"]*${expElement}[^'"]*['"]\\s*:\\s*)['"][^'"]*['"]`, 'gi');
// Match all key value attribute case insensitive: ex. {" key\t"    : ' access_token  ' , " value " : "  dsafgasr431 " ....}
const buildKeyRegex = (expElement) => RegExp(`(['"]\\s*key\\s*['"]\\s*:)\\s*['"]\\s*${expElement}\\s*['"]\\s*.\\s*['"]\\s*value\\s*['"]\\s*:\\s*['"]\\s*[^'"]*['"]`, 'gi');
// This will redact values when the keys match certain patterns
const FILTERED_KEYS = [
    { name: 'sid' },
    { name: 'jwt' },
    { name: 'Authorization' },
    // Any json attribute that contains the words "refresh" and "token" will have the attribute/value hidden
    { name: 'refresh_token', regex: 'refresh[^\'"]*token' },
    { name: 'clientsecret' },
    { name: 'authcode' },
];
const FILTERED_KEYS_FOR_PROCESSING = FILTERED_KEYS.map((key) => ({
    ...key,
    regexTokens: buildTokens(key.regex ?? key.name),
    hiddenAttrMessage: `"<${key.name} - ${exports.HIDDEN}>"`,
    keyRegex: buildKeyRegex(key.regex ?? key.name),
}));
const compose = (...fns) => fns.reduce((prevFn, nextFn) => (value) => prevFn(nextFn(value)));
const replacementFunctions = FILTERED_KEYS_FOR_PROCESSING.flatMap((key) => [
    // two functions to run across each key
    (input) => input.replace(key.regexTokens, `$1${key.hiddenAttrMessage}`),
    (input) => input.replace(key.keyRegex, `$1${key.hiddenAttrMessage}`),
]).concat([
    // plus any "generalized" functions that are matching contents regardless of keys
    // use these for secrets with known patterns
    (input) => input
        .replace(new RegExp(sfdc_1.accessTokenRegex, 'g'), '<REDACTED ACCESS TOKEN>')
        .replace(new RegExp(sfdc_1.jwtTokenRegex, 'g'), '<REDACTED JWT TOKEN>')
        .replace(new RegExp(sfdc_1.sfdxAuthUrlRegex, 'g'), '<REDACTED AUTH URL TOKEN>'),
    // conditional replacement for clientId: leave the value if it's the PlatformCLI, otherwise redact it
    (input) => input.replace(/(['"]client.*Id['"])\s*:\s*(['"][^'"]*['"])/gi, (all, key, value) => value.includes('PlatformCLI') ? `${key}:${value}` : `${key}:"<REDACTED CLIENT ID>"`),
]);
const fullReplacementChain = compose(...replacementFunctions);
/**
 *
 * @param args you *probably are passing this an object, but it can handle any type
 * @returns
 */
const filterSecrets = (...args) => args.map((arg) => {
    if (!arg) {
        return arg;
    }
    if ((0, ts_types_1.isArray)(arg)) {
        return (0, exports.filterSecrets)(...arg);
    }
    // Normalize all objects into a string. This includes errors.
    if (arg instanceof Buffer) {
        return '<Buffer>';
    }
    if ((0, ts_types_1.isObject)(arg)) {
        return JSON.parse(fullReplacementChain(JSON.stringify(arg)));
    }
    if ((0, ts_types_1.isString)(arg)) {
        return fullReplacementChain(arg);
    }
    return '';
});
exports.filterSecrets = filterSecrets;
//# sourceMappingURL=filters.js.map

/***/ }),

/***/ 81346:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.computeLevel = exports.getWriteStream = exports.Logger = exports.LoggerLevel = void 0;
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
const os = __importStar(__webpack_require__(48161));
const path = __importStar(__webpack_require__(76760));
const pino_1 = __webpack_require__(65005);
const kit_1 = __webpack_require__(23472);
const ts_types_1 = __webpack_require__(76865);
const global_1 = __webpack_require__(94500);
const sfError_1 = __webpack_require__(78914);
const unwrapArray_1 = __webpack_require__(4200);
const memoryLogger_1 = __webpack_require__(6593);
const cleanup_1 = __webpack_require__(20340);
/**
 * Standard `Logger` levels.
 *
 * **See** {@link https://getpino.io/#/docs/api?id=logger-level |Logger Levels}
 */
var LoggerLevel;
(function (LoggerLevel) {
    LoggerLevel[LoggerLevel["TRACE"] = 10] = "TRACE";
    LoggerLevel[LoggerLevel["DEBUG"] = 20] = "DEBUG";
    LoggerLevel[LoggerLevel["INFO"] = 30] = "INFO";
    LoggerLevel[LoggerLevel["WARN"] = 40] = "WARN";
    LoggerLevel[LoggerLevel["ERROR"] = 50] = "ERROR";
    LoggerLevel[LoggerLevel["FATAL"] = 60] = "FATAL";
})(LoggerLevel || (exports.LoggerLevel = LoggerLevel = {}));
/**
 * A logging abstraction powered by {@link https://github.com/pinojs/pino | Pino} that provides both a default
 * logger configuration that will log to the default path, and a way to create custom loggers based on the same foundation.
 *
 * ```
 * // Gets the root sfdx logger
 * const logger = await Logger.root();
 *
 * // Creates a child logger of the root sfdx logger with custom fields applied
 * const childLogger = await Logger.child('myRootChild', {tag: 'value'});
 *
 * // Creates a custom logger unaffiliated with the root logger
 * const myCustomLogger = new Logger('myCustomLogger');
 *
 * // Creates a child of a custom logger unaffiliated with the root logger with custom fields applied
 * const myCustomChildLogger = myCustomLogger.child('myCustomChild', {tag: 'value'});
 *
 * // get a raw pino logger from the root instance of Logger
 * // you can use these to avoid constructing another Logger wrapper class and to get better type support
 * const logger = Logger.getRawRootLogger().child({name: 'foo', otherProp: 'bar'});
 * logger.info({some: 'stuff'}, 'a message');
 *
 *
 * // get a raw pino logger from the current instance
 * const childLogger = await Logger.child('myRootChild', {tag: 'value'});
 * const logger = childLogger.getRawLogger();
 * ```
 *
 * **See** https://developer.salesforce.com/docs/atlas.en-us.sfdx_setup.meta/sfdx_setup/sfdx_dev_cli_log_messages.htm
 */
class Logger {
    /**
     * The name of the root sfdx `Logger`.
     */
    static ROOT_NAME = 'sf';
    /**
     * The default `LoggerLevel` when constructing new `Logger` instances.
     */
    static DEFAULT_LEVEL = LoggerLevel.WARN;
    /**
     * A list of all lower case `LoggerLevel` names.
     *
     * **See** {@link LoggerLevel}
     */
    static LEVEL_NAMES = Object.values(LoggerLevel)
        .filter(ts_types_1.isString)
        .map((v) => v.toLowerCase());
    // The sfdx root logger singleton
    static rootLogger;
    pinoLogger;
    memoryLogger;
    /**
     * Constructs a new `Logger`.
     *
     * @param optionsOrName A set of `LoggerOptions` or name to use with the default options.
     *
     * **Throws** *{@link SfError}{ name: 'RedundantRootLoggerError' }* More than one attempt is made to construct the root
     * `Logger`.
     */
    constructor(optionsOrName) {
        const enabled = process.env.SFDX_DISABLE_LOG_FILE !== 'true' && process.env.SF_DISABLE_LOG_FILE !== 'true';
        const options = typeof optionsOrName === 'string'
            ? { name: optionsOrName, level: Logger.DEFAULT_LEVEL, fields: {} }
            : optionsOrName;
        if (Logger.rootLogger && options.name === Logger.ROOT_NAME) {
            throw new sfError_1.SfError('Can not create another root logger.', 'RedundantRootLoggerError');
        }
        // if there is a rootLogger, use its Pino instance
        if (Logger.rootLogger) {
            this.pinoLogger = Logger.rootLogger.pinoLogger.child({ ...options.fields, name: options.name });
            this.memoryLogger = Logger.rootLogger.memoryLogger; // if the root was constructed with memory logging, keep that
            this.pinoLogger.trace(`Created '${options.name}' child logger instance`);
        }
        else {
            const level = (0, exports.computeLevel)(options.level);
            const commonOptions = {
                name: options.name ?? Logger.ROOT_NAME,
                base: options.fields ?? {},
                level,
                enabled,
                ...(global_1.Global.isWeb ? { browser: { asObject: true } } : {}),
            };
            if (Boolean(options.useMemoryLogger) || global_1.Global.getEnvironmentMode() === global_1.Mode.TEST || !enabled) {
                this.memoryLogger = new memoryLogger_1.MemoryLogger();
                this.pinoLogger = (0, pino_1.pino)(commonOptions, this.memoryLogger);
            }
            else {
                this.pinoLogger = (0, pino_1.pino)({
                    ...commonOptions,
                    transport: {
                        pipeline: [
                            {
                                target: path.join('..', '..', 'lib', 'logger', 'transformStream'),
                            },
                            (0, exports.getWriteStream)(level),
                        ],
                    },
                });
                // when a new file logger root is instantiated, we check for old log files.
                // but we don't want to wait for it
                // and it's async and we can't wait from a ctor anyway
                void (0, cleanup_1.cleanup)();
            }
            Logger.rootLogger = this;
        }
    }
    /**
     *
     * Gets the root logger.  It's a singleton
     * See also getRawLogger if you don't need the root logger
     */
    static async root() {
        return Promise.resolve(this.getRoot());
    }
    /**
     * Gets the root logger.  It's a singleton
     */
    static getRoot() {
        if (this.rootLogger) {
            return this.rootLogger;
        }
        const rootLogger = (this.rootLogger = new Logger(Logger.ROOT_NAME));
        return rootLogger;
    }
    /**
     * Destroys the root `Logger`.
     *
     * @ignore
     */
    static destroyRoot() {
        if (this.rootLogger) {
            this.rootLogger = undefined;
        }
    }
    /**
     * Create a child of the root logger, inheriting this instance's configuration such as `level`, transports, etc.
     *
     * @param name The name of the child logger.
     * @param fields Additional fields included in all log lines.
     */
    static async child(name, fields) {
        return (await Logger.root()).child(name, fields);
    }
    /**
     * Create a child of the root logger, inheriting this instance's configuration such as `level`, transports, etc.
     *
     * @param name The name of the child logger.
     * @param fields Additional fields included in all log lines.
     */
    static childFromRoot(name, fields) {
        return Logger.getRoot().child(name, fields);
    }
    /**
     * Gets a numeric `LoggerLevel` value by string name.
     *
     * @param {string} levelName The level name to convert to a `LoggerLevel` enum value.
     *
     * **Throws** *{@link SfError}{ name: 'UnrecognizedLoggerLevelNameError' }* The level name was not case-insensitively recognized as a valid `LoggerLevel` value.
     * @see {@Link LoggerLevel}
     */
    static getLevelByName(levelName) {
        const upperLevel = levelName.toUpperCase();
        if (!(0, ts_types_1.isKeyOf)(LoggerLevel, upperLevel)) {
            throw new sfError_1.SfError(`Invalid log level "${upperLevel}".`, 'UnrecognizedLoggerLevelNameError');
        }
        return LoggerLevel[upperLevel];
    }
    /** get the bare (pino) logger instead of using the class hierarchy */
    static getRawRootLogger() {
        return Logger.getRoot().pinoLogger;
    }
    /** get the bare (pino) logger instead of using the class hierarchy */
    getRawLogger() {
        return this.pinoLogger;
    }
    /**
     * Gets the name of this logger.
     */
    getName() {
        return (this.pinoLogger?.bindings ? this.pinoLogger.bindings().name : '') ?? '';
    }
    /**
     * Gets the current level of this logger.
     */
    getLevel() {
        return this.pinoLogger.levelVal;
    }
    /**
     * Set the logging level of all streams for this logger.  If a specific `level` is not provided, this method will
     * attempt to read it from the environment variable `SFDX_LOG_LEVEL`, and if not found,
     * {@link Logger.DEFAULT_LOG_LEVEL} will be used instead. For convenience `this` object is returned.
     *
     * @param {LoggerLevelValue} [level] The logger level.
     *
     * **Throws** *{@link SfError}{ name: 'UnrecognizedLoggerLevelNameError' }* A value of `level` read from `SFDX_LOG_LEVEL`
     * was invalid.
     *
     * ```
     * // Sets the level from the environment or default value
     * logger.setLevel()
     *
     * // Set the level from the INFO enum
     * logger.setLevel(LoggerLevel.INFO)
     *
     * // Sets the level case-insensitively from a string value
     * logger.setLevel(Logger.getLevelByName('info'))
     * ```
     */
    setLevel(level) {
        this.pinoLogger.level =
            this.pinoLogger.levels.labels[level ?? getDefaultLevel()] ?? this.pinoLogger.levels.labels[Logger.DEFAULT_LEVEL];
        return this;
    }
    /**
     * Compares the requested log level with the current log level.  Returns true if
     * the requested log level is greater than or equal to the current log level.
     *
     * @param level The requested log level to compare against the currently set log level.
     */
    shouldLog(level) {
        return (typeof level === 'string' ? this.pinoLogger.levelVal : level) >= this.getLevel();
    }
    /**
     * Gets an array of log line objects. Each element is an object that corresponds to a log line.
     */
    getBufferedRecords() {
        if (!this.memoryLogger) {
            throw new Error('getBufferedRecords is only supported when useMemoryLogging is true');
        }
        return this.memoryLogger?.loggedData ?? [];
    }
    /**
     * Reads a text blob of all the log lines contained in memory or the log file.
     */
    readLogContentsAsText() {
        if (this.memoryLogger) {
            return this.memoryLogger?.loggedData.map((line) => JSON.stringify(line)).join(os.EOL);
        }
        else {
            this.pinoLogger.warn('readLogContentsAsText is not supported for file streams, only used when useMemoryLogging is true');
            const content = '';
            return content;
        }
    }
    /**
     * Create a child logger, typically to add a few log record fields. For convenience this object is returned.
     *
     * @param name The name of the child logger that is emitted w/ log line.  Will be prefixed with the parent logger name and `:`
     * @param fields Additional fields included in all log lines for the child logger.
     */
    child(name, fields = {}) {
        const fullName = `${this.getName()}:${name}`;
        const child = new Logger({ name: fullName, fields });
        this.pinoLogger.trace(`Setup child '${fullName}' logger instance`);
        return child;
    }
    /**
     * Add a field to all log lines for this logger. For convenience `this` object is returned.
     *
     * @param name The name of the field to add.
     * @param value The value of the field to be logged.
     */
    addField(name, value) {
        this.pinoLogger.setBindings({ ...this.pinoLogger.bindings(), [name]: value });
        return this;
    }
    /**
     * Logs at `trace` level with filtering applied. For convenience `this` object is returned.
     *
     * @param args Any number of arguments to be logged.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    trace(...args) {
        this.pinoLogger.trace((0, unwrapArray_1.unwrapArray)(args));
        return this;
    }
    /**
     * Logs at `debug` level with filtering applied. For convenience `this` object is returned.
     *
     * @param args Any number of arguments to be logged.
     */
    debug(...args) {
        this.pinoLogger.debug((0, unwrapArray_1.unwrapArray)(args));
        return this;
    }
    /**
     * Logs at `debug` level with filtering applied.
     *
     * @param cb A callback that returns on array objects to be logged.
     */
    // eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-unused-vars
    debugCallback(cb) { }
    /**
     * Logs at `info` level with filtering applied. For convenience `this` object is returned.
     *
     * @param args Any number of arguments to be logged.
     */
    info(...args) {
        this.pinoLogger.info((0, unwrapArray_1.unwrapArray)(args));
        return this;
    }
    /**
     * Logs at `warn` level with filtering applied. For convenience `this` object is returned.
     *
     * @param args Any number of arguments to be logged.
     */
    warn(...args) {
        this.pinoLogger.warn((0, unwrapArray_1.unwrapArray)(args));
        return this;
    }
    /**
     * Logs at `error` level with filtering applied. For convenience `this` object is returned.
     *
     * @param args Any number of arguments to be logged.
     */
    error(...args) {
        this.pinoLogger.error((0, unwrapArray_1.unwrapArray)(args));
        return this;
    }
    /**
     * Logs at `fatal` level with filtering applied. For convenience `this` object is returned.
     *
     * @param args Any number of arguments to be logged.
     */
    fatal(...args) {
        // always show fatal to stderr
        // IMPORTANT:
        // Do not use console.error() here, if fatal() is called from the uncaughtException handler, it
        // will be re-thrown and caught again by the uncaughtException handler, causing an infinite loop.
        console.log(...args); // eslint-disable-line no-console
        this.pinoLogger.fatal((0, unwrapArray_1.unwrapArray)(args));
        return this;
    }
}
exports.Logger = Logger;
/** return various streams that the logger could send data to, depending on the options and env  */
const getWriteStream = (level = 'warn') => {
    const env = new kit_1.Env();
    // used when debug mode, writes to stdout (colorized)
    if (process.env.DEBUG) {
        return {
            target: 'pino-pretty',
            options: {
                // NOTE: env.getBoolean() defaults to false if the env var is not set
                // so it's important to use `||` instead of `??`
                colorize: env.getBoolean('SF_LOG_COLORIZE') || true,
                destination: env.getBoolean('SF_LOG_STDERR') ? 2 : 1,
            },
        };
    }
    // default: we're writing to a rotating file
    const rotator = new Map([
        ['1m', new Date().toISOString().split(':').slice(0, 2).join('-')],
        ['1h', new Date().toISOString().split(':').slice(0, 1).join('-')],
        ['1d', new Date().toISOString().split('T')[0]],
    ]);
    const logRotationPeriod = env.getString('SF_LOG_ROTATION_PERIOD') ?? '1d';
    if (logRotationPeriod && !rotator.has(logRotationPeriod)) {
        process.stderr.write(`Warning: Unrecognized SF_LOG_ROTATION_PERIOD value "${logRotationPeriod}". Expected 1m, 1h, or 1d. Falling back to 1d.\n`);
    }
    return {
        // write to a rotating file
        target: 'pino/file',
        options: {
            destination: path.join(global_1.Global.SF_DIR, `sf-${rotator.get(logRotationPeriod) ?? rotator.get('1d')}.log`),
            mkdir: true,
            level,
        },
    };
};
exports.getWriteStream = getWriteStream;
const computeLevel = (optionsLevel) => {
    const env = new kit_1.Env();
    const envValue = isNaN(env.getNumber('SF_LOG_LEVEL') ?? NaN)
        ? env.getString('SF_LOG_LEVEL')
        : env.getNumber('SF_LOG_LEVEL');
    if (typeof envValue !== 'undefined') {
        return typeof envValue === 'string' ? envValue : numberToLevel(envValue);
    }
    return levelFromOption(optionsLevel);
};
exports.computeLevel = computeLevel;
const levelFromOption = (value) => {
    switch (typeof value) {
        case 'number':
            return numberToLevel(value);
        case 'string':
            return value;
        default:
            return pino_1.levels.labels[Logger.DEFAULT_LEVEL];
    }
};
// /** match a number to a pino level, or if a match isn't found, the next highest level */
const numberToLevel = (level) => pino_1.levels.labels[level] ?? Object.entries(pino_1.levels.labels).find(([value]) => Number(value) > level)?.[1] ?? 'warn';
const getDefaultLevel = () => {
    const logLevelFromEnvVar = new kit_1.Env().getString('SF_LOG_LEVEL');
    return logLevelFromEnvVar ? Logger.getLevelByName(logLevelFromEnvVar) : Logger.DEFAULT_LEVEL;
};
//# sourceMappingURL=logger.js.map

/***/ }),

/***/ 6593:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.MemoryLogger = void 0;
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
const node_stream_1 = __webpack_require__(57075);
const unwrapArray_1 = __webpack_require__(4200);
const filters_1 = __webpack_require__(93375);
/**
 * Used by test setup to keep UT from writing to disk.
 */
class MemoryLogger extends node_stream_1.Writable {
    loggedData = [];
    constructor() {
        super({ objectMode: true });
    }
    _write(chunk, encoding, callback) {
        const filteredChunk = (0, unwrapArray_1.unwrapArray)((0, filters_1.filterSecrets)([chunk]));
        this.loggedData.push(typeof filteredChunk === 'string'
            ? JSON.parse(filteredChunk)
            : filteredChunk);
        callback();
    }
}
exports.MemoryLogger = MemoryLogger;
//# sourceMappingURL=memoryLogger.js.map

/***/ }),

/***/ 78914:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


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
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.SfError = void 0;
const ts_types_1 = __webpack_require__(76865);
/**
 * A generalized sfdx error which also contains an action. The action is used in the
 * CLI to help guide users past the error.
 *
 * To throw an error in a synchronous function you must either pass the error message and actions
 * directly to the constructor, e.g.
 *
 * ```
 * // To load a message bundle (Note that __dirname should contain a messages folder)
 * Messages.importMessagesDirectory(__dirname);
 * const messages = Messages.load('myPackageName', 'myBundleName');
 *
 * // To throw a non-bundle based error:
 * throw new SfError(message.getMessage('myError'), 'MyErrorName');
 * ```
 */
class SfError extends Error {
    name;
    /**
     * Action messages. Hints to the users regarding what can be done to fix related issues.
     */
    actions;
    /**
     * SfdxCommand can return this process exit code.
     */
    exitCode;
    /**
     * The related context for this error.
     */
    context;
    // Additional data helpful for consumers of this error.  E.g., API call result
    data;
    /**
     * Some errors support `error.code` instead of `error.name`. This keeps backwards compatability.
     */
    #code;
    /**
     * Create an SfError.
     *
     * @param message The error message.
     * @param name The error name. Defaults to 'SfError'.
     * @param actions The action message(s).
     * @param exitCodeOrCause The exit code which will be used by SfdxCommand or he underlying error that caused this error to be raised.
     * @param cause The underlying error that caused this error to be raised.
     */
    constructor(message, name = 'SfError', actions, exitCodeOrCause, cause) {
        if (typeof cause !== 'undefined' && !(cause instanceof Error)) {
            throw new TypeError(`The cause, if provided, must be an instance of Error. Received: ${typeof cause}`);
        }
        super(message);
        this.name = name;
        this.cause = exitCodeOrCause instanceof Error ? exitCodeOrCause : cause;
        if (actions?.length) {
            this.actions = actions;
        }
        if (typeof exitCodeOrCause === 'number') {
            this.exitCode = exitCodeOrCause;
        }
        else {
            this.exitCode = 1;
        }
    }
    get code() {
        return this.#code ?? this.name;
    }
    set code(code) {
        this.#code = code;
    }
    /** like the constructor, but takes an typed object and let you also set context and data properties */
    static create(inputs) {
        const error = new SfError(inputs.message, inputs.name, inputs.actions, inputs.exitCode, inputs.cause);
        if (inputs.data) {
            error.data = inputs.data;
        }
        if (inputs.context) {
            error.context = inputs.context;
        }
        return error;
    }
    /**
     * Convert an Error to an SfError.
     *
     * @param err The error to convert.
     */
    static wrap(err) {
        if ((0, ts_types_1.isString)(err)) {
            return new SfError(err);
        }
        if (err instanceof SfError) {
            return err;
        }
        const sfError = fromBasicError(err) ??
            fromErrorLikeObject(err) ??
            // something was thrown that wasn't error, error-like object or string.  Convert it to an Error that preserves the information as the cause and wrap that.
            SfError.wrap(new Error(`SfError.wrap received type ${typeof err} but expects type Error or string`, { cause: err }));
        // If the original error has a code, use that instead of name.
        if ((0, ts_types_1.hasString)(err, 'code')) {
            sfError.code = err.code;
        }
        return sfError;
    }
    /**
     * Sets the context of the error. For convenience `this` object is returned.
     *
     * @param context The command name.
     */
    setContext(context) {
        this.context = context;
        return this;
    }
    /**
     * An additional payload for the error. For convenience `this` object is returned.
     *
     * @param data The payload data.
     */
    setData(data) {
        this.data = data;
        return this;
    }
    /**
     * Convert an {@link SfError} state to an object. Returns a plain object representing the state of this error.
     */
    toObject() {
        return {
            name: this.name,
            message: this.message ?? this.name,
            exitCode: this.exitCode,
            ...(this.actions?.length ? { actions: this.actions } : {}),
            ...(this.context ? { context: this.context } : {}),
            ...(this.data ? { data: this.data } : {}),
        };
    }
}
exports.SfError = SfError;
const fromBasicError = (err) => err instanceof Error ? SfError.create({ message: err.message, name: err.name, cause: err }) : undefined;
/* an object that is the result of spreading an Error or SfError  */
const fromErrorLikeObject = (err) => {
    if (!err || typeof err !== 'object') {
        return undefined;
    }
    if (!('message' in err)) {
        return undefined;
    }
    try {
        return SfError.create(err);
    }
    catch {
        return undefined;
    }
};
//# sourceMappingURL=sfError.js.map

/***/ }),

/***/ 39982:
/***/ ((__unused_webpack_module, exports) => {


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
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.isWeb = void 0;
const isWeb = () => {
    if (process.versions.bun)
        return false;
    return 'window' in globalThis || 'self' in globalThis;
};
exports.isWeb = isWeb;
//# sourceMappingURL=isWeb.js.map

/***/ }),

/***/ 52974:
/***/ ((__unused_webpack_module, exports) => {


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
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.matchesJwtAccessToken = exports.matchesOpaqueAccessToken = exports.sfdxAuthUrlRegex = exports.jwtTokenRegex = exports.accessTokenRegex = exports.validatePathDoesNotContainInvalidChars = exports.validateSalesforceId = exports.validateEmail = exports.validateApiVersion = void 0;
exports.trimTo15 = trimTo15;
exports.matchesAccessToken = matchesAccessToken;
function trimTo15(id) {
    if (!id) {
        return undefined;
    }
    if (id.length && id.length > 15) {
        return id.substring(0, 15);
    }
    return id;
}
/**
 * Tests whether an API version matches the format `i.0`.
 *
 * @param value The API version as a string.
 */
const validateApiVersion = (value) => value == null || /^[1-9]\d\.0$/.test(value);
exports.validateApiVersion = validateApiVersion;
/**
 * Tests whether an email matches the format `me@my.org`
 *
 * @param value The email as a string.
 */
const validateEmail = (value) => /^[^.][^@]*@[^.]+(\.[^.\s]+)+$/.test(value);
exports.validateEmail = validateEmail;
/**
 * Tests whether a Salesforce ID is in the correct format, a 15- or 18-character length string with only letters and numbers
 *
 * @param value The ID as a string.
 */
const validateSalesforceId = (value) => /[a-zA-Z0-9]{18}|[a-zA-Z0-9]{15}/.test(value) && (value.length === 15 || value.length === 18);
exports.validateSalesforceId = validateSalesforceId;
/**
 * Tests whether a path is in the correct format; the value doesn't include the characters "[", "]", "?", "<", ">", "?", "|"
 *
 * @param value The path as a string.
 */
const validatePathDoesNotContainInvalidChars = (value) => 
// eslint-disable-next-line no-useless-escape
!/[\["\?<>\|\]]+/.test(value);
exports.validatePathDoesNotContainInvalidChars = validatePathDoesNotContainInvalidChars;
exports.accessTokenRegex = /(00D\w{12,15})![.\w]*/;
// 'eyJ' strongly suggests that this is a base64 JSON, and so the general shape of the rest of it is enough to presume it's a JWT.
exports.jwtTokenRegex = /eyJ[A-Za-z0-9+=_-]+\.[A-Za-z0-9+=_-]+\.[A-Za-z0-9+=_-]+/;
exports.sfdxAuthUrlRegex = /force:\/\/([a-zA-Z0-9._-]+):([a-zA-Z0-9._-]*):([a-zA-Z0-9._-]+={0,2})@([a-zA-Z0-9._-]+)/;
/**
 * Tests whether a given string is an opaque access token, a JWT token, or neither.
 *
 * @param value
 */
function matchesAccessToken(value) {
    return (0, exports.matchesOpaqueAccessToken)(value) || (0, exports.matchesJwtAccessToken)(value);
}
/**
 * Tests whether a given string is an opaque access token.
 *
 * @param value
 */
const matchesOpaqueAccessToken = (value) => exports.accessTokenRegex.test(value);
exports.matchesOpaqueAccessToken = matchesOpaqueAccessToken;
/**
 * Tests whether a given string is a JWT-formatted access token.
 *
 * @param value
 */
const matchesJwtAccessToken = (value) => {
    const segments = value.split('.');
    if (segments.length !== 3) {
        return false;
    }
    if (!isValidJson(segments[0], true)) {
        return false;
    }
    return isValidJson(segments[1], false);
};
exports.matchesJwtAccessToken = matchesJwtAccessToken;
const isValidJson = (str, checkForTyp) => {
    try {
        const parsedJson = JSON.parse(Buffer.from(str, 'base64').toString('utf-8'));
        if (checkForTyp) {
            return 'typ' in parsedJson && parsedJson.typ === 'JWT';
        }
        else {
            return true;
        }
    }
    catch (e) {
        return false;
    }
};
//# sourceMappingURL=sfdc.js.map

/***/ }),

/***/ 4200:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.unwrapArray = void 0;
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
const unwrapArray = (args) => {
    if (Array.isArray(args) && args.length === 1) {
        return Array.isArray(args[0]) ? (0, exports.unwrapArray)(args[0]) : args[0];
    }
    return args;
};
exports.unwrapArray = unwrapArray;
//# sourceMappingURL=unwrapArray.js.map

/***/ }),

/***/ 87281:
/***/ ((__unused_webpack_module, exports) => {


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
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ensureArray = void 0;
/**
 * Normalize an object to be an array if it isn't one.
 *
 * @param entryOrArray - An object that could be an array of its type or just its type
 * @returns An array of the input element (which might be empty)
 */
const ensureArray = (entryOrArray) => {
    if (entryOrArray !== undefined && entryOrArray !== null) {
        return Array.isArray(entryOrArray) ? entryOrArray : [entryOrArray];
    }
    return [];
};
exports.ensureArray = ensureArray;
//# sourceMappingURL=collections.js.map

/***/ }),

/***/ 33441:
/***/ ((__unused_webpack_module, exports) => {


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
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AsyncOptionalCreatable = exports.AsyncCreatable = void 0;
/**
 * A base class for classes that must be constructed and initialized asynchronously.
 */
class AsyncCreatable {
    /**
     * Constructs a new `AsyncCreatable` instance. For internal and subclass use only.
     * New subclass instances must be created with the static {@link create} method.
     *
     * @param options An options object providing initialization params.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(options) {
        /* leave up to implementer */
    }
    /**
     * Asynchronously constructs and initializes a new instance of a concrete subclass with the provided `options`.
     *
     * @param options An options object providing initialization params to the async constructor.
     */
    static async create(options) {
        const instance = new this(options);
        await instance.init();
        return instance;
    }
}
exports.AsyncCreatable = AsyncCreatable;
/**
 * A base class for classes that must be constructed and initialized asynchronously without requiring an options object.
 */
class AsyncOptionalCreatable {
    /**
     * Constructs a new `AsyncCreatable` instance. For internal and subclass use only.
     * New subclass instances must be created with the static {@link create} method.
     *
     * @param options An options object providing initialization params.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(options) {
        /* leave up to implementer */
    }
    /**
     * Asynchronously constructs and initializes a new instance of a concrete subclass with the optional `options`.
     *
     * @param options An options object providing initialization params to the async constructor.
     */
    static async create(options) {
        const instance = new this(options);
        await instance.init();
        return instance;
    }
}
exports.AsyncOptionalCreatable = AsyncOptionalCreatable;
//# sourceMappingURL=creatable.js.map

/***/ }),

/***/ 76038:
/***/ ((__unused_webpack_module, exports) => {


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
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Duration = void 0;
exports.sleep = sleep;
/**
 * A simple utility class for converting durations between minutes, seconds, and milliseconds.
 */
class Duration {
    /**
     * The number of milliseconds in one second.
     */
    static MILLIS_IN_SECONDS = 1000;
    /**
     * The number of seconds in one minute.
     */
    static SECONDS_IN_MINUTE = 60;
    /**
     * The number of minutes in one hour.
     */
    static MINUTES_IN_HOUR = 60;
    /**
     * The number of hours in one day.
     */
    static HOURS_IN_DAY = 24;
    /**
     * The number of days in one week.
     */
    static DAYS_IN_WEEK = 7;
    quantity;
    unit;
    constructor(quantity, unit = Duration.Unit.MINUTES) {
        this.quantity = quantity;
        this.unit = unit;
    }
    /**
     * Returns the current number of minutes represented by this `Duration` instance, rounded to the nearest integer
     * value.
     */
    get minutes() {
        switch (this.unit) {
            case Duration.Unit.MILLISECONDS:
                return Math.round(this.quantity / Duration.MILLIS_IN_SECONDS / Duration.SECONDS_IN_MINUTE);
            case Duration.Unit.SECONDS:
                return Math.round(this.quantity / Duration.SECONDS_IN_MINUTE);
            case Duration.Unit.MINUTES:
                return this.quantity;
            case Duration.Unit.HOURS:
                return this.quantity * Duration.MINUTES_IN_HOUR;
            case Duration.Unit.DAYS:
                return this.quantity * Duration.MINUTES_IN_HOUR * Duration.HOURS_IN_DAY;
            case Duration.Unit.WEEKS:
                return this.quantity * Duration.MINUTES_IN_HOUR * Duration.HOURS_IN_DAY * Duration.DAYS_IN_WEEK;
        }
    }
    /**
     * Returns the current number of hours represented by this `Duration` instance.
     */
    get hours() {
        switch (this.unit) {
            case Duration.Unit.MILLISECONDS:
                return Math.round(this.quantity / Duration.MILLIS_IN_SECONDS / Duration.SECONDS_IN_MINUTE / Duration.MINUTES_IN_HOUR);
            case Duration.Unit.SECONDS:
                return Math.round(this.quantity / Duration.SECONDS_IN_MINUTE / Duration.MINUTES_IN_HOUR);
            case Duration.Unit.MINUTES:
                return Math.round(this.quantity / Duration.MINUTES_IN_HOUR);
            case Duration.Unit.HOURS:
                return this.quantity;
            case Duration.Unit.DAYS:
                return this.quantity * Duration.HOURS_IN_DAY;
            case Duration.Unit.WEEKS:
                return this.quantity * Duration.HOURS_IN_DAY * Duration.DAYS_IN_WEEK;
        }
    }
    /**
     * Returns the current number of milliseconds represented by this `Duration` instance.
     */
    get milliseconds() {
        switch (this.unit) {
            case Duration.Unit.MILLISECONDS:
                return this.quantity;
            case Duration.Unit.SECONDS:
                return this.quantity * Duration.MILLIS_IN_SECONDS;
            case Duration.Unit.MINUTES:
                return this.quantity * Duration.MILLIS_IN_SECONDS * Duration.SECONDS_IN_MINUTE;
            case Duration.Unit.HOURS:
                return this.quantity * Duration.MILLIS_IN_SECONDS * Duration.SECONDS_IN_MINUTE * Duration.MINUTES_IN_HOUR;
            case Duration.Unit.DAYS:
                return (this.quantity *
                    Duration.MILLIS_IN_SECONDS *
                    Duration.SECONDS_IN_MINUTE *
                    Duration.MINUTES_IN_HOUR *
                    Duration.HOURS_IN_DAY);
            case Duration.Unit.WEEKS:
                return (this.quantity *
                    Duration.MILLIS_IN_SECONDS *
                    Duration.SECONDS_IN_MINUTE *
                    Duration.MINUTES_IN_HOUR *
                    Duration.HOURS_IN_DAY *
                    Duration.DAYS_IN_WEEK);
        }
    }
    /**
     * Returns the current number of seconds represented by this `Duration` instance, rounded to the nearest integer
     * value.
     */
    get seconds() {
        switch (this.unit) {
            case Duration.Unit.MILLISECONDS:
                return Math.round(this.quantity / Duration.MILLIS_IN_SECONDS);
            case Duration.Unit.SECONDS:
                return this.quantity;
            case Duration.Unit.MINUTES:
                return this.quantity * Duration.SECONDS_IN_MINUTE;
            case Duration.Unit.HOURS:
                return this.quantity * Duration.SECONDS_IN_MINUTE * Duration.MINUTES_IN_HOUR;
            case Duration.Unit.DAYS:
                return this.quantity * Duration.SECONDS_IN_MINUTE * Duration.MINUTES_IN_HOUR * Duration.HOURS_IN_DAY;
            case Duration.Unit.WEEKS:
                return (this.quantity *
                    Duration.SECONDS_IN_MINUTE *
                    Duration.MINUTES_IN_HOUR *
                    Duration.HOURS_IN_DAY *
                    Duration.DAYS_IN_WEEK);
        }
    }
    /**
     * Returns the current number of days represented by this `Duration` instance.
     */
    get days() {
        switch (this.unit) {
            case Duration.Unit.MILLISECONDS:
                return Math.round(this.quantity /
                    Duration.MILLIS_IN_SECONDS /
                    Duration.SECONDS_IN_MINUTE /
                    Duration.MINUTES_IN_HOUR /
                    Duration.HOURS_IN_DAY);
            case Duration.Unit.SECONDS:
                return Math.round(this.quantity / Duration.SECONDS_IN_MINUTE / Duration.MINUTES_IN_HOUR / Duration.HOURS_IN_DAY);
            case Duration.Unit.MINUTES:
                return Math.round(this.quantity / Duration.MINUTES_IN_HOUR / Duration.HOURS_IN_DAY);
            case Duration.Unit.HOURS:
                return Math.round(this.quantity / Duration.HOURS_IN_DAY);
            case Duration.Unit.DAYS:
                return this.quantity;
            case Duration.Unit.WEEKS:
                return this.quantity * Duration.DAYS_IN_WEEK;
        }
    }
    /**
     * Returns the current number of weeks represented by this `Duration` instance.
     */
    get weeks() {
        switch (this.unit) {
            case Duration.Unit.MILLISECONDS:
                return Math.round(this.quantity /
                    Duration.MILLIS_IN_SECONDS /
                    Duration.SECONDS_IN_MINUTE /
                    Duration.MINUTES_IN_HOUR /
                    Duration.HOURS_IN_DAY /
                    Duration.DAYS_IN_WEEK);
            case Duration.Unit.SECONDS:
                return Math.round(this.quantity /
                    Duration.SECONDS_IN_MINUTE /
                    Duration.MINUTES_IN_HOUR /
                    Duration.HOURS_IN_DAY /
                    Duration.DAYS_IN_WEEK);
            case Duration.Unit.MINUTES:
                return Math.round(this.quantity / Duration.MINUTES_IN_HOUR / Duration.HOURS_IN_DAY / Duration.DAYS_IN_WEEK);
            case Duration.Unit.HOURS:
                return Math.round(this.quantity / Duration.HOURS_IN_DAY / Duration.DAYS_IN_WEEK);
            case Duration.Unit.DAYS:
                return Math.round(this.quantity / Duration.DAYS_IN_WEEK);
            case Duration.Unit.WEEKS:
                return this.quantity;
        }
    }
    /**
     * Returns a new `Duration` instance created from the specified number of milliseconds.
     *
     * @param quantity The number of milliseconds.
     */
    static milliseconds(quantity) {
        return new Duration(quantity, Duration.Unit.MILLISECONDS);
    }
    /**
     * Returns a new `Duration` instance created from the specified number of seconds.
     *
     * @param quantity The number of seconds.
     */
    static seconds(quantity) {
        return new Duration(quantity, Duration.Unit.SECONDS);
    }
    /**
     * Returns a new `Duration` instance created from the specified number of minutes.
     *
     * @param quantity The number of minutes.
     */
    static minutes(quantity) {
        return new Duration(quantity, Duration.Unit.MINUTES);
    }
    /**
     * Returns a new `Duration` instance created from the specified number of hours.
     *
     * @param quantity The number of hours.
     */
    static hours(quantity) {
        return new Duration(quantity, Duration.Unit.HOURS);
    }
    /**
     * Returns a new `Duration` instance created from the specified number of days.
     *
     * @param quantity The number of days.
     */
    static days(quantity) {
        return new Duration(quantity, Duration.Unit.DAYS);
    }
    /**
     * Returns a new `Duration` instance created from the specified number of weeks.
     *
     * @param quantity The number of weeks.
     */
    static weeks(quantity) {
        return new Duration(quantity, Duration.Unit.WEEKS);
    }
    /**
     * The string representation of this `Duration`. e.g. "645 seconds"
     */
    toString() {
        return pluralize(this.quantity, this.unit);
    }
}
exports.Duration = Duration;
(function (Duration) {
    /**
     * Units of duration.
     */
    let Unit;
    (function (Unit) {
        Unit[Unit["MINUTES"] = 0] = "MINUTES";
        Unit[Unit["MILLISECONDS"] = 1] = "MILLISECONDS";
        Unit[Unit["SECONDS"] = 2] = "SECONDS";
        Unit[Unit["HOURS"] = 3] = "HOURS";
        Unit[Unit["DAYS"] = 4] = "DAYS";
        Unit[Unit["WEEKS"] = 5] = "WEEKS";
    })(Unit = Duration.Unit || (Duration.Unit = {}));
})(Duration || (exports.Duration = Duration = {}));
// underlying function
function sleep(durationOrQuantity, unit = Duration.Unit.MILLISECONDS) {
    const duration = durationOrQuantity instanceof Duration ? durationOrQuantity : new Duration(durationOrQuantity, unit);
    let handle;
    let doResolve;
    const wake = () => {
        if (!handle)
            return;
        clearTimeout(handle);
        handle = undefined;
        doResolve();
    };
    const promise = new Promise((resolve) => {
        doResolve = resolve;
        handle = setTimeout(wake, duration.milliseconds);
    });
    return Object.assign(promise, { interrupt: wake });
}
const pluralize = (num, unit) => {
    const name = Duration.Unit[unit].toLowerCase();
    return `${num} ${num === 1 ? name.slice(0, name.length - 1) : name}`;
};
//# sourceMappingURL=duration.js.map

/***/ }),

/***/ 75067:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


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
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.env = exports.Env = void 0;
const ts_types_1 = __webpack_require__(76865);
const errors_1 = __webpack_require__(13729);
const nodash_1 = __webpack_require__(47422);
/**
 * An injectable abstraction on top of `process.env` with various convenience functions
 * for accessing environment variables of different anticipated shapes.
 */
class Env {
    store;
    constructor(store = process?.env || {}) {
        this.store = store;
        this.store = store;
    }
    // underlying method
    getString(key, def) {
        return this.store[key] ?? def;
    }
    // underlying method
    getStringIn(key, values, def) {
        const re = new RegExp(values.join('|'), 'i');
        if (def && !re.test(def.toString())) {
            const valueAsString = values.join(', ');
            throw new errors_1.InvalidDefaultEnvValueError(`${def} is not a member of ${valueAsString}`);
        }
        const value = this.getString(key);
        if (!value)
            return def;
        return re.test(value) ? value : def;
    }
    // underlying method
    getKeyOf(key, obj, defOrTransform, transform) {
        let value;
        let def;
        if (typeof defOrTransform === 'function') {
            transform = defOrTransform;
        }
        else {
            def = defOrTransform;
        }
        if (def === undefined) {
            value = this.getStringIn(key, Object.keys(obj));
        }
        else {
            if (transform)
                def = transform(def);
            value = this.getStringIn(key, Object.keys(obj), def);
        }
        if (!value)
            return;
        if (typeof transform === 'function')
            value = transform(value);
        if ((0, ts_types_1.isKeyOf)(obj, value))
            return value;
    }
    /**
     * Sets a `string` value for a given key, or removes the current value when no value is given.
     *
     * @param key The name of the envar.
     * @param value The value to set.
     */
    setString(key, value) {
        if (value == null) {
            this.unset(key);
            return;
        }
        this.store[key] = value;
    }
    // underlying method
    getList(key, def) {
        const value = this.getString(key);
        return value ? value.split(',') : def;
    }
    /**
     * Sets a `string` value from a list for a given key by joining values with a `,` into a raw `string` value,
     * or removes the current value when no value is given.
     *
     * @param key The name of the envar.
     * @param values The values to set.
     */
    setList(key, values) {
        if (values == null) {
            this.unset(key);
            return;
        }
        this.setString(key, values.join(','));
    }
    /**
     * Gets a `boolean` value for a given key. Returns the default value if no value was found.
     *
     * @param key The name of the envar.
     * @param def A default boolean, which itself defaults to `false` if not otherwise supplied.
     */
    getBoolean(key, def = false) {
        const value = this.getString(key, def.toString());
        return (0, nodash_1.toBoolean)(value);
    }
    /**
     * Sets a `boolean` value for a given key, or removes the current value when no value is given.
     *
     * @param key The name of the envar.
     * @param value The value to set.
     */
    setBoolean(key, value) {
        if (value == null) {
            this.unset(key);
            return;
        }
        this.setString(key, value.toString());
    }
    getNumber(key, def) {
        const value = this.getString(key);
        if (value) {
            const num = (0, nodash_1.toNumber)(value);
            return isNaN(num) && (0, ts_types_1.isNumber)(def) ? def : num;
        }
        return (0, ts_types_1.isNumber)(def) ? def : undefined;
    }
    /**
     * Sets a `number` value for a given key, or removes the current value when no value is given.
     *
     * @param key The name of the envar.
     * @param value The value to set.
     */
    setNumber(key, value) {
        if (value == null) {
            this.unset(key);
            return;
        }
        this.setString(key, (0, ts_types_1.isNumber)(value) ? String(value) : value);
    }
    /**
     * Unsets a value for a given key.
     *
     * @param key The name of the envar.
     */
    unset(key) {
        delete this.store[key];
    }
    /**
     * Gets an array of all definitely assigned key-value pairs from the underlying envar store.
     */
    entries() {
        return (0, ts_types_1.definiteEntriesOf)(this.store);
    }
}
exports.Env = Env;
/**
 * The default `Env` instance, which wraps `process.env`.
 */
exports.env = new Env();
//# sourceMappingURL=env.js.map

/***/ }),

/***/ 13729:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.InvalidDefaultEnvValueError = exports.JsonDataFormatError = exports.JsonStringifyError = exports.JsonParseError = exports.NamedError = void 0;
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
const node_util_1 = __webpack_require__(57975);
class NamedError extends Error {
    name;
    cause;
    constructor(name, messageOrCause, cause) {
        if (typeof messageOrCause === 'string') {
            super(messageOrCause);
            this.cause = cause;
        }
        else {
            super();
            this.cause = messageOrCause;
        }
        this.name = name;
    }
    get fullStack() {
        return (0, node_util_1.inspect)(this);
    }
}
exports.NamedError = NamedError;
class JsonParseError extends NamedError {
    path;
    line;
    errorPortion;
    constructor(cause, path, line, errorPortion) {
        super('JsonParseError', JsonParseError.format(cause, path, line, errorPortion), cause);
        this.path = path;
        this.line = line;
        this.errorPortion = errorPortion;
    }
    /**
     * Creates a `JsonParseError` from a `SyntaxError` thrown during JSON parsing.
     *
     * @param error The `SyntaxError` to convert to a `JsonParseError`.
     * @param data The data input that caused the error.
     * @param jsonPath The path from which the data was read, if known.
     */
    static create(error, data, jsonPath) {
        // Get the position of the error from the error message. This is the error index
        // within the file contents as 1 long string.
        const positionMatch = /position (\d+)/.exec(error.message);
        if (!positionMatch) {
            return new JsonParseError(error, jsonPath);
        }
        const errPosition = parseInt(positionMatch[1], 10);
        // Get a buffered error portion to display.
        const BUFFER = 20;
        const start = Math.max(0, errPosition - BUFFER);
        const end = Math.min(data.length, errPosition + BUFFER);
        const errorPortion = data.slice(start, end);
        // Only need to count new lines before the error position.
        const lineNumber = data.slice(0, errPosition).split('\n').length;
        return new JsonParseError(error, jsonPath, lineNumber, errorPortion);
    }
    static format(cause, path, line, errorPortion) {
        if (line == null)
            return cause.message || 'Unknown cause';
        return `Parse error in file ${path ?? 'unknown'} on line ${line}\n${errorPortion ?? cause.message}`;
    }
}
exports.JsonParseError = JsonParseError;
class JsonStringifyError extends NamedError {
    constructor(cause) {
        super('JsonStringifyError', cause);
    }
}
exports.JsonStringifyError = JsonStringifyError;
class JsonDataFormatError extends NamedError {
    constructor(message) {
        super('JsonDataFormatError', message);
    }
}
exports.JsonDataFormatError = JsonDataFormatError;
class InvalidDefaultEnvValueError extends NamedError {
    constructor(message) {
        super('InvalidDefaultEnvValueError', message);
    }
}
exports.InvalidDefaultEnvValueError = InvalidDefaultEnvValueError;
//# sourceMappingURL=errors.js.map

/***/ }),

/***/ 23472:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.logFn = void 0;
__exportStar(__webpack_require__(33441), exports);
__exportStar(__webpack_require__(76038), exports);
__exportStar(__webpack_require__(75067), exports);
__exportStar(__webpack_require__(13729), exports);
__exportStar(__webpack_require__(32440), exports);
__exportStar(__webpack_require__(47422), exports);
__exportStar(__webpack_require__(87281), exports);
__exportStar(__webpack_require__(31544), exports);
__exportStar(__webpack_require__(20378), exports);
var log_1 = __webpack_require__(82810);
Object.defineProperty(exports, "logFn", ({ enumerable: true, get: function () { return log_1.logFn; } }));
//# sourceMappingURL=index.js.map

/***/ }),

/***/ 32440:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


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
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.parseJson = parseJson;
exports.parseJsonMap = parseJsonMap;
exports.cloneJson = cloneJson;
exports.getJsonValuesByName = getJsonValuesByName;
exports.jsonIncludes = jsonIncludes;
const ts_types_1 = __webpack_require__(76865);
const errors_1 = __webpack_require__(13729);
/**
 * Parse JSON `string` data.
 *
 * @param data Data to parse.
 * @param jsonPath The file path from which the JSON was loaded.
 * @param throwOnEmpty If the data contents are empty.
 * @throws {@link JsonParseError} If the data contents are empty or the data is invalid.
 */
function parseJson(data, jsonPath, throwOnEmpty = true) {
    data = data.trim();
    if (!throwOnEmpty && data.length === 0)
        data = '{}';
    try {
        return JSON.parse(data);
    }
    catch (error) {
        throw errors_1.JsonParseError.create(error, data, jsonPath);
    }
}
/**
 * Parse JSON `string` data, expecting the result to be a `JsonMap`.
 *
 * ```
 * const json = parseJson(myJsonString);
 * // typeof json -> AnyJson
 * ```
 *
 * If you are the producer of the JSON being parsed or have a high degree of confidence in the source of the JSON
 * (e.g. static resources in your project or unwavering data services of high integrity) then you may provide a more
 * specific type as the type parameter, `T`. This practice is _not_ recommended unless you are fully confident in the
 * ability of the type provided to accurately reflect the parsed data, given that _no_ runtime checks will be performed
 * by this method to validate the JSON. In particular, despite the fact that the provided type must extend `JsonMap`,
 * it is possible to circumvent the compiler's ability to do strict null checking by failing to capture `undefined` or
 * `null` property states in the types you apply. It's a best practice to mark all properties of such types as
 * optional, especially when in doubt.
 *
 * ```
 * interface Location extends JsonMap { lat: number; lng: number; }
 * interface WayPoint extends JsonMap { name: string; loc: Location; }
 * const json = JSON.stringify({ name: 'Bill', loc: { lat: 10.0, lng: -10.0 } });
 * // Warning -- since the properties in the interfaces above are non-optional, the type assertion below is not
 * // perfectly type-sound -- make sure you trust your JSON data exactly conforms to the interface(s) you supply,
 * // or you are risking runtime errors!
 * const wayPoint = parseJsonMap<WayPoint>(json);
 * // typeof wayPoint -> WayPoint
 * ```
 *
 * @param data The string data to parse.
 * @param jsonPath The file path from which the JSON was loaded.
 * @param throwOnEmpty If the data contents are empty.
 * @throws {@link JsonParseError} If the data contents are empty or the data is invalid.
 * @throws {@link JsonDataFormatError} If the data contents are not a `JsonMap`.
 */
function parseJsonMap(data, jsonPath, throwOnEmpty) {
    const json = parseJson(data, jsonPath, throwOnEmpty);
    if (json === null || (0, ts_types_1.isJsonArray)(json) || typeof json !== 'object') {
        throw new errors_1.JsonDataFormatError('Expected parsed JSON data to be an object');
    }
    return json; // apply the requested type assertion
}
/**
 * Perform a deep clone of an object or array compatible with JSON stringification.
 * Object fields that are not compatible with stringification will be omitted. Array
 * entries that are not compatible with stringification will be censored as `null`.
 *
 * @param obj A JSON-compatible object or array to clone.
 * @throws {@link JsonStringifyError} If the object contains circular references or causes
 * other JSON stringification errors.
 */
function cloneJson(obj) {
    try {
        return JSON.parse(JSON.stringify(obj));
    }
    catch (err) {
        if (err instanceof SyntaxError || err instanceof TypeError) {
            throw new errors_1.JsonStringifyError(err);
        }
        throw err;
    }
}
/**
 * Finds all elements of type `T` with a given name in a `JsonMap`. Not suitable for use
 * with object graphs containing circular references. The specification of an appropriate
 * type `T` that will satisfy all matching element values is the responsibility of the caller.
 *
 * @param json The `JsonMap` tree to search for elements of the given name.
 * @param name The name of elements to search for.
 */
function getJsonValuesByName(json, name) {
    let matches = [];
    if (Object.prototype.hasOwnProperty.call(json, name)) {
        matches.push(json[name]); // Asserting T here assumes the caller knows what they are asking for
    }
    const maybeRecurse = (element) => {
        if ((0, ts_types_1.isJsonMap)(element)) {
            matches = matches.concat(getJsonValuesByName(element, name));
        }
    };
    Object.values(json).forEach((value) => ((0, ts_types_1.isJsonArray)(value) ? value.forEach(maybeRecurse) : maybeRecurse(value)));
    return matches;
}
/**
 * Tests whether an `AnyJson` value contains another `AnyJson` value.  This is a shallow
 * check only and does not recurse deeply into collections.
 *
 * @param json The container to search.
 * @param value The value search for.
 */
function jsonIncludes(json, value) {
    if (json == null || value === undefined || (0, ts_types_1.isNumber)(json) || (0, ts_types_1.isBoolean)(json))
        return false;
    if ((0, ts_types_1.isJsonMap)(json))
        return Object.values(json).includes(value);
    if ((0, ts_types_1.isJsonArray)(json))
        return json.includes(value);
    if ((0, ts_types_1.isString)(value))
        return json.includes(value);
    return false;
}
//# sourceMappingURL=json.js.map

/***/ }),

/***/ 82810:
/***/ ((__unused_webpack_module, exports) => {


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
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.logFn = void 0;
/**
 * A wrapper for console.log that returns the input value unmodified
 *
 * ``` ts
 * // peek inside a chain of map functions
 * [1,2,3,4,5].map(logFn).map(yourNextFunction)
 *
 * // wrap a returned function call to see what it returns
 * return logFn(otherFunction())
 * ```
 */
const logFn = (x) => {
    // eslint-disable-next-line no-console
    console.log(typeof x === 'object' && !(x instanceof Set) && !(x instanceof Map) ? JSON.stringify(x, null, 2) : x);
    return x;
};
exports.logFn = logFn;
//# sourceMappingURL=log.js.map

/***/ }),

/***/ 99547:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.defaults = defaults;
exports.findKey = findKey;
exports.includes = includes;
exports.keyBy = keyBy;
exports.mapKeys = mapKeys;
exports.minBy = minBy;
exports.maxBy = maxBy;
exports.merge = merge;
exports.omit = omit;
exports.once = once;
exports.set = set;
exports.sortBy = sortBy;
exports.toNumber = toNumber;
/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */
// @ts-ignore ignore the demand for typings for the locally built lodash
const _ = __importStar(__webpack_require__(73370));
// underlying function
function defaults(obj, ...otherArgs) {
    return _.defaults(obj, ...otherArgs);
}
/**
 * This method is like `find` except that it returns the key of the first element predicate returns truthy for
 * instead of the element itself.
 *
 * @param obj The object to search.
 * @param predicate The function invoked per iteration.
 */
function findKey(obj, predicate) {
    return _.findKey(obj, predicate);
}
/**
 * Checks if target is in collection using SameValueZero for equality comparisons. If fromIndex is negative,
 * it’s used as the offset from the end of collection.
 *
 * @param collection The collection to search.
 * @param target The value to search for.
 * @param fromIndex The index to search from.
 */
function includes(collection, target, fromIndex) {
    return _.includes(collection, target, fromIndex);
}
// underlying function
function keyBy(collection, iteratee) {
    return _.keyBy(collection, iteratee);
}
// underlying function
function mapKeys(obj, iteratee) {
    return _.mapKeys(obj, iteratee);
}
/**
 * This method is like `_.min` except that it accepts `iteratee` which is
 * invoked for each element in `array` to generate the criterion by which
 * the value is ranked. The iteratee is invoked with one argument: (value).
 *
 * @param array The array to iterate over.
 * @param iteratee The iteratee invoked per element.
 */
function minBy(collection, iteratee) {
    return _.minBy(collection, iteratee);
}
/**
 * This method is like `_.max` except that it accepts `iteratee` which is
 * invoked for each element in `array` to generate the criterion by which
 * the value is ranked. The iteratee is invoked with one argument: (value).
 *
 * @param array The array to iterate over.
 * @param iteratee The iteratee invoked per element.
 */
function maxBy(collection, iteratee) {
    return _.maxBy(collection, iteratee);
}
// underlying function
function merge(obj, ...otherArgs) {
    return _.merge(obj, ...otherArgs);
}
// underlying function
function omit(obj, ...paths) {
    return _.omit(obj, ...paths);
}
/**
 * Creates a function that is restricted to invoking `func` once. Repeat calls to the function return the value
 * of the first call. The `func` is invoked with the this binding and arguments of the created function.
 *
 * @param func The function to restrict.
 */
function once(func) {
    return _.once(func);
}
// underlying function
function set(obj, path, value) {
    return _.set(obj, path, value);
}
// underlying function
function sortBy(collection, ...iteratees) {
    return _.sortBy(collection, ...iteratees);
}
/**
 * Converts `value` to a number.
 *
 * @param value The value to process.
 *
 * ```
 * _.toNumber(3);
 * // => 3
 *
 * _.toNumber(Number.MIN_VALUE);
 * // => 5e-324
 *
 * _.toNumber(Infinity);
 * // => Infinity
 *
 * _.toNumber('3');
 * // => 3
 * ```
 */
function toNumber(value) {
    return _.toNumber(value);
}
//# sourceMappingURL=external.js.map

/***/ }),

/***/ 47422:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
__exportStar(__webpack_require__(99547), exports);
__exportStar(__webpack_require__(58433), exports);
//# sourceMappingURL=index.js.map

/***/ }),

/***/ 58433:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


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
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.isEmpty = isEmpty;
exports.lowerFirst = lowerFirst;
exports.camelCaseToTitleCase = camelCaseToTitleCase;
exports.snakeCase = snakeCase;
exports.upperFirst = upperFirst;
exports.toBoolean = toBoolean;
const ts_types_1 = __webpack_require__(76865);
/**
 * Checks if value is empty. A value is considered empty unless it’s an arguments object, array, string, or
 * jQuery-like collection with a length greater than 0 or an object with own enumerable properties.
 *
 * @param value The value to inspect.
 */
function isEmpty(value) {
    if (value == null)
        return true;
    if ((0, ts_types_1.isNumber)(value))
        return false;
    if ((0, ts_types_1.isBoolean)(value))
        return false;
    if ((0, ts_types_1.isArrayLike)(value) && value.length > 0)
        return false;
    if ((0, ts_types_1.hasNumber)(value, 'size') && value.size > 0)
        return false;
    if ((0, ts_types_1.isObject)(value) && Object.keys(value).length > 0)
        return false;
    return true;
}
// underlying function
function lowerFirst(value) {
    return value && value.charAt(0).toLowerCase() + value.slice(1);
}
/**
 * Formats a camel case style `string` into a title case.
 *
 * @param text Text to transform.
 */
function camelCaseToTitleCase(text) {
    return text
        .replace(/(^\w|\s\w)/g, (m) => m.toUpperCase())
        .replace(/([A-Z][a-z]+)/g, ' $1')
        .replace(/\s{2,}/g, ' ')
        .trim();
}
// underlying function
function snakeCase(str) {
    return str
        ?.replace(/([a-z])([A-Z])/g, '$1_$2')
        .toLowerCase()
        .replace(/\W/g, '_')
        .replace(/^_+|_+$/g, '');
}
// underlying function
function upperFirst(value) {
    return value && value.charAt(0).toUpperCase() + value.slice(1);
}
/**
 * Converts value to a boolean.
 *
 * @param value The value to convert
 * @returns boolean
 */
function toBoolean(value) {
    switch (typeof value) {
        case 'boolean':
            return value;
        case 'string':
            return value.toLowerCase() === 'true' || value === '1';
        default:
            return false;
    }
}
//# sourceMappingURL=internal.js.map

/***/ }),

/***/ 20378:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.isRejected = exports.isFulfilled = void 0;
exports.settleAll = settleAll;
/** narrow promise.allSettled results to the successes, with provided type */
const isFulfilled = (s) => s.status === 'fulfilled';
exports.isFulfilled = isFulfilled;
/** narrow promise.allSettled results to the faiures.  Result is untyped */
const isRejected = (s) => s.status === 'rejected';
exports.isRejected = isRejected;
/**
 * Wrapper for promise.allSettled that returns typed errors
 *
 * @param promises Array of promises to settle
 *
 * @example
 * ```
 * const promises = [Promise.resolve(1), Promise.resolve(2), Promise.resolve(3)];
 * const { fulfilled, rejected } = await settleAll<number, SfError>(promises);
 * ```
 */
async function settleAll(promises) {
    const allSettled = await Promise.allSettled(promises);
    return {
        fulfilled: allSettled.filter(exports.isFulfilled).map((s) => s.value),
        rejected: allSettled.filter(exports.isRejected).map((s) => s.reason),
    };
}
//# sourceMappingURL=settleAll.js.map

/***/ }),

/***/ 31544:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ThrottledPromiseAll = void 0;
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
const collections_1 = __webpack_require__(87281);
const duration_1 = __webpack_require__(76038);
const noCancel = () => false;
/**
 * A promise that throttles the number of promises running at a time.
 *
 * The constructor takes {@link PromiseOptions} to initialize the constraints of the promise.
 *
 * ```typescript
 * // Create a ThrottledPromiseAll that will take numbers and return numbers
 * const throttledPromise = new ThrottledPromiseAll<number, number>({ concurrency: 1, timeout: Duration.milliseconds(100) });
 *
 * // Define a producer function that will take a number and return a promise that resolves to a number
 * const numberProducer = (source: number, throttledPromiseAll: ThrottledPromiseAll<number, number | undefined>): Promise<number> => Promise.resolve(source + 1);
 * throttledPromiseAll.add([1, 2, 3, 4, 5], numberProducer);
 *
 * const numberResults = await throttledPromiseAll.all();
 * ```
 */
class ThrottledPromiseAll {
    queue;
    concurrency;
    wait;
    timeout;
    cancel;
    #results = [];
    /**
     * Construct a new ThrottledPromiseAll.
     *
     * @param options {@link PromiseOptions}
     */
    constructor(options = { concurrency: 1 }) {
        this.queue = [];
        this.concurrency = options.concurrency;
        this.wait = options.timeout ?? duration_1.Duration.milliseconds(0);
        this.cancel = options.cancel ?? noCancel;
    }
    /**
     * Returns the results of the promises that have been resolved.
     */
    get results() {
        return this.#results.sort((a, b) => (a?.index ?? 0) - (b?.index ?? 0)).map((r) => r?.result);
    }
    /**
     * Add source items to the queue of promises to be resolved.
     * Adding an item to the queue requires a producer function that will take the source item and return a promise.
     * Each item in the can have a different producer function, as long as the producer function conforms the
     * types of the ThrottledPromiseAll when constructed.
     *
     * @param source
     * @param producer the producer function that will take the source item and return a promise. The producer function signature
     * must conform to the types of the ThrottledPromiseAll when constructed.
     */
    add(source, producer) {
        (0, collections_1.ensureArray)(source).forEach((s) => this.queue.push({ source: s, producer }));
    }
    /**
     * Returns a promise that resolves the items present in the queue using the associated producer.
     *
     * This function will throw an error if the timeout is reached before all items in the queue are resolved (see {@link PromiseOptions.timeout}).
     *
     * @returns A promise that resolves to an array of results.
     */
    async all() {
        let timeoutPromise;
        if (this.wait.milliseconds > 0) {
            if (!this.timeout) {
                timeoutPromise = new Promise((resolve, reject) => {
                    this.timeout = setTimeout(() => {
                        try {
                            if (this.timeout) {
                                clearTimeout(this.timeout);
                            }
                            this.stop();
                            reject(new Error(`PromiseQueue timed out after ${this.wait.milliseconds} milliseconds`));
                        }
                        catch (e) {
                            reject(e);
                        }
                    }, this.wait.milliseconds);
                });
            }
        }
        try {
            if (timeoutPromise) {
                await Promise.race([this.dequeue(), timeoutPromise]);
            }
            else {
                await this.dequeue();
            }
            this.stop();
            return this.results;
        }
        catch (e) {
            this.stop();
            throw e;
        }
    }
    stop() {
        if (this.timeout) {
            clearTimeout(this.timeout);
        }
        this.queue.splice(0, this.queue.length);
    }
    async dequeue() {
        const concurrencyPool = new Map();
        let index = 0;
        while (this.queue.length > 0 || concurrencyPool.size > 0) {
            if (this.cancel()) {
                this.stop();
                throw new Error('PromiseQueue: Cancelled');
            }
            while (concurrencyPool.size < this.concurrency) {
                const item = this.queue.shift();
                if (!item) {
                    break;
                }
                const p = { ...item, index: index++ };
                concurrencyPool.set(p.index, p
                    .producer(item.source, this)
                    .then((result) => ({ index: p.index, result }))
                    .catch((e) => Promise.reject(e)));
            }
            // eslint-disable-next-line no-await-in-loop
            const r = await Promise.race(concurrencyPool.values());
            const rIndex = r?.index ?? -1;
            if (!concurrencyPool.has(rIndex)) {
                throw new Error(`PromiseQueue: Could not find index ${r?.index ?? '<undefined>'} in pool`);
            }
            concurrencyPool.delete(rIndex);
            this.#results.push(r);
        }
    }
}
exports.ThrottledPromiseAll = ThrottledPromiseAll;
//# sourceMappingURL=throttledPromiseAll.js.map

/***/ }),

/***/ 73370:
/***/ (function(module, exports, __webpack_require__) {

/* module decorator */ module = __webpack_require__.nmd(module);
/**
 * @license
 * Lodash (Custom Build) lodash.com/license | Underscore.js 1.8.3 underscorejs.org/LICENSE
 * Build: `lodash exports="node" include="defaults,findKey,keyBy,includes,mapKeys,minBy,maxBy,merge,omit,once,set,sortBy,toNumber" -o vendor/lodash.js`
 */
(function () {
  function t(t, e, n) {
    switch (n.length) {
      case 0:
        return t.call(e);
      case 1:
        return t.call(e, n[0]);
      case 2:
        return t.call(e, n[0], n[1]);
      case 3:
        return t.call(e, n[0], n[1], n[2]);
    }
    return t.apply(e, n);
  }
  function e(t, e, n, r) {
    for (var o = -1, u = null == t ? 0 : t.length; ++o < u; ) {
      var c = t[o];
      e(r, c, n(c), t);
    }
    return r;
  }
  function n(t, e) {
    for (var n = -1, r = null == t ? 0 : t.length; ++n < r && false !== e(t[n], n, t); );
  }
  function r(t, e) {
    for (var n = -1, r = null == t ? 0 : t.length, o = 0, u = []; ++n < r; ) {
      var c = t[n];
      e(c, n, t) && (u[o++] = c);
    }
    return u;
  }
  function o(t, e) {
    for (var n = -1, r = null == t ? 0 : t.length, o = Array(r); ++n < r; ) o[n] = e(t[n], n, t);
    return o;
  }
  function u(t, e) {
    for (var n = -1, r = e.length, o = t.length; ++n < r; ) t[o + n] = e[n];
    return t;
  }
  function c(t, e) {
    for (var n = -1, r = null == t ? 0 : t.length; ++n < r; ) if (e(t[n], n, t)) return true;
    return false;
  }
  function i(t, e, n) {
    var r;
    return (
      n(t, function (t, n, o) {
        if (e(t, n, o)) return (r = n), false;
      }),
      r
    );
  }
  function a(t) {
    return function (e) {
      return null == e ? ie : e[t];
    };
  }
  function f(t, e) {
    var n = t.length;
    for (t.sort(e); n--; ) t[n] = t[n].c;
    return t;
  }
  function l(t) {
    return function (e) {
      return t(e);
    };
  }
  function s(t, e) {
    return o(e, function (e) {
      return t[e];
    });
  }
  function b(t) {
    var e = -1,
      n = Array(t.size);
    return (
      t.forEach(function (t, r) {
        n[++e] = [r, t];
      }),
      n
    );
  }
  function h(t) {
    var e = Object;
    return function (n) {
      return t(e(n));
    };
  }
  function p(t) {
    var e = -1,
      n = Array(t.size);
    return (
      t.forEach(function (t) {
        n[++e] = t;
      }),
      n
    );
  }
  function y(t) {
    for (var e = t.length; e-- && pe.test(t.charAt(e)); );
    return e;
  }
  function j() {}
  function v(t) {
    var e = -1,
      n = null == t ? 0 : t.length;
    for (this.clear(); ++e < n; ) {
      var r = t[e];
      this.set(r[0], r[1]);
    }
  }
  function g(t) {
    var e = -1,
      n = null == t ? 0 : t.length;
    for (this.clear(); ++e < n; ) {
      var r = t[e];
      this.set(r[0], r[1]);
    }
  }
  function _(t) {
    var e = -1,
      n = null == t ? 0 : t.length;
    for (this.clear(); ++e < n; ) {
      var r = t[e];
      this.set(r[0], r[1]);
    }
  }
  function d(t) {
    var e = -1,
      n = null == t ? 0 : t.length;
    for (this.__data__ = new _(); ++e < n; ) this.add(t[e]);
  }
  function A(t) {
    this.size = (this.__data__ = new g(t)).size;
  }
  function w(t, e) {
    var n = Un(t),
      r = !n && Mn(t),
      o = !n && !r && $n(t),
      u = !n && !r && !o && Ln(t);
    if ((n = n || r || o || u)) {
      for (var r = t.length, c = String, i = -1, a = Array(r); ++i < r; ) a[i] = c(i);
      r = a;
    } else r = [];
    var f,
      c = r.length;
    for (f in t)
      (!e && !Ce.call(t, f)) ||
        (n &&
          ('length' == f ||
            (o && ('offset' == f || 'parent' == f)) ||
            (u && ('buffer' == f || 'byteLength' == f || 'byteOffset' == f)) ||
            wt(f, c))) ||
        r.push(f);
    return r;
  }
  function m(t, e, n) {
    ((n === ie || $t(t[e], n)) && (n !== ie || e in t)) || E(t, e, n);
  }
  function O(t, e, n) {
    var r = t[e];
    (Ce.call(t, e) && $t(r, n) && (n !== ie || e in t)) || E(t, e, n);
  }
  function S(t, e) {
    for (var n = t.length; n--; ) if ($t(t[n][0], e)) return n;
    return -1;
  }
  function k(t, e, n, r) {
    return (
      mn(t, function (t, o, u) {
        e(r, t, n(t), u);
      }),
      r
    );
  }
  function z(t, e) {
    return t && ct(e, Yt(e), t);
  }
  function x(t, e) {
    return t && ct(e, Zt(e), t);
  }
  function E(t, e, n) {
    '__proto__' == e && en ? en(t, e, { configurable: true, enumerable: true, value: n, writable: true }) : (t[e] = n);
  }
  function F(t, e, r, o, u, c) {
    var i,
      a = 1 & e,
      f = 2 & e,
      l = 4 & e;
    if ((r && (i = u ? r(t, o, u, c) : r(t)), i !== ie)) return i;
    if (!Ct(t)) return t;
    if ((o = Un(t))) {
      if (((i = gt(t)), !a)) return ut(t, i);
    } else {
      var s = xn(t),
        b = '[object Function]' == s || '[object GeneratorFunction]' == s;
      if ($n(t)) return nt(t, a);
      if ('[object Object]' == s || '[object Arguments]' == s || (b && !u)) {
        if (((i = f || b ? {} : _t(t)), !a)) return f ? at(t, x(i, t)) : it(t, z(i, t));
      } else {
        if (!me[s]) return u ? t : {};
        i = dt(t, s, a);
      }
    }
    if ((c || (c = new A()), (u = c.get(t)))) return u;
    c.set(t, i),
      Pn(t)
        ? t.forEach(function (n) {
            i.add(F(n, e, r, n, t, c));
          })
        : Dn(t) &&
          t.forEach(function (n, o) {
            i.set(o, F(n, e, r, o, t, c));
          });
    var f = l ? (f ? ht : bt) : f ? Zt : Yt,
      h = o ? ie : f(t);
    return (
      n(h || t, function (n, o) {
        h && ((o = n), (n = t[o])), O(i, o, F(n, e, r, o, t, c));
      }),
      i
    );
  }
  function I(t, e, n) {
    for (var r = -1, o = t.length; ++r < o; ) {
      var u = t[r],
        c = e(u);
      if (null != c && (i === ie ? c === c && !Wt(c) : n(c, i)))
        var i = c,
          a = u;
    }
    return a;
  }
  function B(t, e, n, r, o) {
    var c = -1,
      i = t.length;
    for (n || (n = At), o || (o = []); ++c < i; ) {
      var a = t[c];
      0 < e && n(a) ? (1 < e ? B(a, e - 1, n, r, o) : u(o, a)) : r || (o[o.length] = a);
    }
    return o;
  }
  function M(t, e) {
    return t && On(t, e, Yt);
  }
  function U(t, e) {
    e = et(e, t);
    for (var n = 0, r = e.length; null != t && n < r; ) t = t[Et(e[n++])];
    return n && n == r ? t : ie;
  }
  function $(t, e, n) {
    return (e = e(t)), Un(t) ? e : u(e, n(t));
  }
  function D(t) {
    if (null == t) t = t === ie ? '[object Undefined]' : '[object Null]';
    else if (tn && tn in Object(t)) {
      var e = Ce.call(t, tn),
        n = t[tn];
      try {
        t[tn] = ie;
        var r = true;
      } catch (t) {}
      var o = Ve.call(t);
      r && (e ? (t[tn] = n) : delete t[tn]), (t = o);
    } else t = Ve.call(t);
    return t;
  }
  function P(t, e) {
    return t > e;
  }
  function L(t) {
    return Tt(t) && '[object Arguments]' == D(t);
  }
  function N(t, e, n, r, o) {
    if (t === e) e = true;
    else if (null == t || null == e || (!Tt(t) && !Tt(e))) e = t !== t && e !== e;
    else
      t: {
        var u = Un(t),
          c = Un(e),
          i = u ? '[object Array]' : xn(t),
          a = c ? '[object Array]' : xn(e),
          i = '[object Arguments]' == i ? '[object Object]' : i,
          a = '[object Arguments]' == a ? '[object Object]' : a,
          f = '[object Object]' == i,
          c = '[object Object]' == a;
        if ((a = i == a) && $n(t)) {
          if (!$n(e)) {
            e = false;
            break t;
          }
          (u = true), (f = false);
        }
        if (a && !f) o || (o = new A()), (e = u || Ln(t) ? lt(t, e, n, r, N, o) : st(t, e, i, n, r, N, o));
        else {
          if (!(1 & n) && ((u = f && Ce.call(t, '__wrapped__')), (i = c && Ce.call(e, '__wrapped__')), u || i)) {
            (t = u ? t.value() : t), (e = i ? e.value() : e), o || (o = new A()), (e = N(t, e, n, r, o));
            break t;
          }
          if (a)
            e: if ((o || (o = new A()), (u = 1 & n), (i = bt(t)), (c = i.length), (a = bt(e).length), c == a || u)) {
              for (a = c; a--; ) {
                var l = i[a];
                if (!(u ? l in e : Ce.call(e, l))) {
                  e = false;
                  break e;
                }
              }
              if (((f = o.get(t)), (l = o.get(e)), f && l)) e = f == e && l == t;
              else {
                (f = true), o.set(t, e), o.set(e, t);
                for (var s = u; ++a < c; ) {
                  var l = i[a],
                    b = t[l],
                    h = e[l];
                  if (r) var p = u ? r(h, b, l, e, t, o) : r(b, h, l, t, e, o);
                  if (p === ie ? b !== h && !N(b, h, n, r, o) : !p) {
                    f = false;
                    break;
                  }
                  s || (s = 'constructor' == l);
                }
                f &&
                  !s &&
                  ((n = t.constructor),
                  (r = e.constructor),
                  n != r &&
                    'constructor' in t &&
                    'constructor' in e &&
                    !(typeof n == 'function' && n instanceof n && typeof r == 'function' && r instanceof r) &&
                    (f = false)),
                  o.delete(t),
                  o.delete(e),
                  (e = f);
              }
            } else e = false;
          else e = false;
        }
      }
    return e;
  }
  function C(t) {
    return Tt(t) && '[object Map]' == xn(t);
  }
  function T(t, e) {
    var n = e.length,
      r = n;
    if (null == t) return !r;
    for (t = Object(t); n--; ) {
      var o = e[n];
      if (o[2] ? o[1] !== t[o[0]] : !(o[0] in t)) return false;
    }
    for (; ++n < r; ) {
      var o = e[n],
        u = o[0],
        c = t[u],
        i = o[1];
      if (o[2]) {
        if (c === ie && !(u in t)) return false;
      } else if (((o = new A()), void 0 === ie ? !N(i, c, 3, void 0, o) : 1)) return false;
    }
    return true;
  }
  function V(t) {
    return Tt(t) && '[object Set]' == xn(t);
  }
  function R(t) {
    return Tt(t) && Nt(t.length) && !!we[D(t)];
  }
  function W(t) {
    return typeof t == 'function' ? t : null == t ? ne : typeof t == 'object' ? (Un(t) ? H(t[0], t[1]) : q(t)) : oe(t);
  }
  function G(t, e) {
    return t < e;
  }
  function K(t, e) {
    var n = -1,
      r = Dt(t) ? Array(t.length) : [];
    return (
      mn(t, function (t, o, u) {
        r[++n] = e(t, o, u);
      }),
      r
    );
  }
  function q(t) {
    var e = jt(t);
    return 1 == e.length && e[0][2]
      ? kt(e[0][0], e[0][1])
      : function (n) {
          return n === t || T(n, e);
        };
  }
  function H(t, e) {
    return Ot(t) && e === e && !Ct(e)
      ? kt(Et(t), e)
      : function (n) {
          var r = Qt(n, t);
          return r === ie && r === e ? Xt(n, t) : N(e, r, 3);
        };
  }
  function J(t, e, n, r, o) {
    t !== e &&
      On(
        e,
        function (u, c) {
          if ((o || (o = new A()), Ct(u))) {
            var i = o,
              a = xt(t, c),
              f = xt(e, c),
              l = i.get(f);
            if (l) m(t, c, l);
            else {
              var l = r ? r(a, f, c + '', t, e, i) : ie,
                s = l === ie;
              if (s) {
                var b = Un(f),
                  h = !b && $n(f),
                  p = !b && !h && Ln(f),
                  l = f;
                b || h || p
                  ? Un(a)
                    ? (l = a)
                    : Pt(a)
                    ? (l = ut(a))
                    : h
                    ? ((s = false), (l = nt(f, true)))
                    : p
                    ? ((s = false), (l = ot(f, true)))
                    : (l = [])
                  : Vt(f) || Mn(f)
                  ? ((l = a), Mn(a) ? (l = Ht(a)) : (Ct(a) && !Lt(a)) || (l = _t(f)))
                  : (s = false);
              }
              s && (i.set(f, l), J(l, f, n, r, i), i.delete(f)), m(t, c, l);
            }
          } else (i = r ? r(xt(t, c), u, c + '', t, e, o) : ie), i === ie && (i = u), m(t, c, i);
        },
        Zt
      );
  }
  function Q(t, e) {
    var n = [];
    e = e.length
      ? o(e, function (t) {
          return Un(t)
            ? function (e) {
                return U(e, 1 === t.length ? t[0] : t);
              }
            : t;
        })
      : [ne];
    var r = -1;
    return (
      (e = o(e, l(pt()))),
      f(
        K(t, function (t) {
          return {
            a: o(e, function (e) {
              return e(t);
            }),
            b: ++r,
            c: t,
          };
        }),
        function (t, e) {
          var r;
          t: {
            r = -1;
            for (var o = t.a, u = e.a, c = o.length, i = n.length; ++r < c; ) {
              var a;
              e: {
                a = o[r];
                var f = u[r];
                if (a !== f) {
                  var l = a !== ie,
                    s = null === a,
                    b = a === a,
                    h = Wt(a),
                    p = f !== ie,
                    y = null === f,
                    j = f === f,
                    v = Wt(f);
                  if ((!y && !v && !h && a > f) || (h && p && j && !y && !v) || (s && p && j) || (!l && j) || !b) {
                    a = 1;
                    break e;
                  }
                  if ((!s && !h && !v && a < f) || (v && l && b && !s && !h) || (y && l && b) || (!p && b) || !j) {
                    a = -1;
                    break e;
                  }
                }
                a = 0;
              }
              if (a) {
                r = r >= i ? a : a * ('desc' == n[r] ? -1 : 1);
                break t;
              }
            }
            r = t.b - e.b;
          }
          return r;
        }
      )
    );
  }
  function X(t) {
    return function (e) {
      return U(e, t);
    };
  }
  function Y(t) {
    return En(zt(t, void 0, ne), t + '');
  }
  function Z(t) {
    if (typeof t == 'string') return t;
    if (Un(t)) return o(t, Z) + '';
    if (Wt(t)) return An ? An.call(t) : '';
    var e = t + '';
    return '0' == e && 1 / t == -ae ? '-0' : e;
  }
  function tt(t, e) {
    e = et(e, t);
    var n;
    if (2 > e.length) n = t;
    else {
      n = e;
      var r = 0,
        o = -1,
        u = -1,
        c = n.length;
      for (
        0 > r && (r = -r > c ? 0 : c + r),
          o = o > c ? c : o,
          0 > o && (o += c),
          c = r > o ? 0 : (o - r) >>> 0,
          r >>>= 0,
          o = Array(c);
        ++u < c;

      )
        o[u] = n[u + r];
      n = U(t, o);
    }
    (t = n), null == t || delete t[Et(Bt(e))];
  }
  function et(t, e) {
    return Un(t) ? t : Ot(t, e) ? [t] : Fn(Jt(t));
  }
  function nt(t, e) {
    if (e) return t.slice();
    var n = t.length,
      n = He ? He(n) : new t.constructor(n);
    return t.copy(n), n;
  }
  function rt(t) {
    var e = new t.constructor(t.byteLength);
    return new qe(e).set(new qe(t)), e;
  }
  function ot(t, e) {
    return new t.constructor(e ? rt(t.buffer) : t.buffer, t.byteOffset, t.length);
  }
  function ut(t, e) {
    var n = -1,
      r = t.length;
    for (e || (e = Array(r)); ++n < r; ) e[n] = t[n];
    return e;
  }
  function ct(t, e, n) {
    var r = !n;
    n || (n = {});
    for (var o = -1, u = e.length; ++o < u; ) {
      var c = e[o],
        i = ie;
      i === ie && (i = t[c]), r ? E(n, c, i) : O(n, c, i);
    }
    return n;
  }
  function it(t, e) {
    return ct(t, kn(t), e);
  }
  function at(t, e) {
    return ct(t, zn(t), e);
  }
  function ft(t) {
    return Vt(t) ? ie : t;
  }
  function lt(t, e, n, r, o, u) {
    var i = 1 & n,
      a = t.length,
      f = e.length;
    if (a != f && !(i && f > a)) return false;
    var f = u.get(t),
      l = u.get(e);
    if (f && l) return f == e && l == t;
    var f = -1,
      l = true,
      s = 2 & n ? new d() : ie;
    for (u.set(t, e), u.set(e, t); ++f < a; ) {
      var b = t[f],
        h = e[f];
      if (r) var p = i ? r(h, b, f, e, t, u) : r(b, h, f, t, e, u);
      if (p !== ie) {
        if (p) continue;
        l = false;
        break;
      }
      if (s) {
        if (
          !c(e, function (t, e) {
            if (!s.has(e) && (b === t || o(b, t, n, r, u))) return s.push(e);
          })
        ) {
          l = false;
          break;
        }
      } else if (b !== h && !o(b, h, n, r, u)) {
        l = false;
        break;
      }
    }
    return u.delete(t), u.delete(e), l;
  }
  function st(t, e, n, r, o, u, c) {
    switch (n) {
      case '[object DataView]':
        if (t.byteLength != e.byteLength || t.byteOffset != e.byteOffset) break;
        (t = t.buffer), (e = e.buffer);
      case '[object ArrayBuffer]':
        if (t.byteLength != e.byteLength || !u(new qe(t), new qe(e))) break;
        return true;
      case '[object Boolean]':
      case '[object Date]':
      case '[object Number]':
        return $t(+t, +e);
      case '[object Error]':
        return t.name == e.name && t.message == e.message;
      case '[object RegExp]':
      case '[object String]':
        return t == e + '';
      case '[object Map]':
        var i = b;
      case '[object Set]':
        if ((i || (i = p), t.size != e.size && !(1 & r))) break;
        return (n = c.get(t)) ? n == e : ((r |= 2), c.set(t, e), (e = lt(i(t), i(e), r, o, u, c)), c.delete(t), e);
      case '[object Symbol]':
        if (dn) return dn.call(t) == dn.call(e);
    }
    return false;
  }
  function bt(t) {
    return $(t, Yt, kn);
  }
  function ht(t) {
    return $(t, Zt, zn);
  }
  function pt() {
    var t = j.iteratee || re,
      t = t === re ? W : t;
    return arguments.length ? t(arguments[0], arguments[1]) : t;
  }
  function yt(t, e) {
    var n = t.__data__,
      r = typeof e;
    return ('string' == r || 'number' == r || 'symbol' == r || 'boolean' == r ? '__proto__' !== e : null === e)
      ? n[typeof e == 'string' ? 'string' : 'hash']
      : n.map;
  }
  function jt(t) {
    for (var e = Yt(t), n = e.length; n--; ) {
      var r = e[n],
        o = t[r];
      e[n] = [r, o, o === o && !Ct(o)];
    }
    return e;
  }
  function vt(t, e) {
    var n = null == t ? ie : t[e];
    return (!Ct(n) || (Te && Te in n) ? 0 : (Lt(n) ? We : _e).test(Ft(n))) ? n : ie;
  }
  function gt(t) {
    var e = t.length,
      n = new t.constructor(e);
    return e && 'string' == typeof t[0] && Ce.call(t, 'index') && ((n.index = t.index), (n.input = t.input)), n;
  }
  function _t(t) {
    return typeof t.constructor != 'function' || St(t) ? {} : wn(Je(t));
  }
  function dt(t, e, n) {
    var r = t.constructor;
    switch (e) {
      case '[object ArrayBuffer]':
        return rt(t);
      case '[object Boolean]':
      case '[object Date]':
        return new r(+t);
      case '[object DataView]':
        return (e = n ? rt(t.buffer) : t.buffer), new t.constructor(e, t.byteOffset, t.byteLength);
      case '[object Float32Array]':
      case '[object Float64Array]':
      case '[object Int8Array]':
      case '[object Int16Array]':
      case '[object Int32Array]':
      case '[object Uint8Array]':
      case '[object Uint8ClampedArray]':
      case '[object Uint16Array]':
      case '[object Uint32Array]':
        return ot(t, n);
      case '[object Map]':
        return new r();
      case '[object Number]':
      case '[object String]':
        return new r(t);
      case '[object RegExp]':
        return (e = new t.constructor(t.source, je.exec(t))), (e.lastIndex = t.lastIndex), e;
      case '[object Set]':
        return new r();
      case '[object Symbol]':
        return dn ? Object(dn.call(t)) : {};
    }
  }
  function At(t) {
    return Un(t) || Mn(t) || !!(Ze && t && t[Ze]);
  }
  function wt(t, e) {
    var n = typeof t;
    return (
      (e = null == e ? 9007199254740991 : e),
      !!e && ('number' == n || ('symbol' != n && Ae.test(t))) && -1 < t && 0 == t % 1 && t < e
    );
  }
  function mt(t, e, n) {
    if (!Ct(n)) return false;
    var r = typeof e;
    return !!('number' == r ? Dt(n) && wt(e, n.length) : 'string' == r && e in n) && $t(n[e], t);
  }
  function Ot(t, e) {
    if (Un(t)) return false;
    var n = typeof t;
    return (
      !('number' != n && 'symbol' != n && 'boolean' != n && null != t && !Wt(t)) ||
      se.test(t) ||
      !le.test(t) ||
      (null != e && t in Object(e))
    );
  }
  function St(t) {
    var e = t && t.constructor;
    return t === ((typeof e == 'function' && e.prototype) || Pe);
  }
  function kt(t, e) {
    return function (n) {
      return null != n && n[t] === e && (e !== ie || t in Object(n));
    };
  }
  function zt(e, n, r) {
    return (
      (n = un(n === ie ? e.length - 1 : n, 0)),
      function () {
        for (var o = arguments, u = -1, c = un(o.length - n, 0), i = Array(c); ++u < c; ) i[u] = o[n + u];
        for (u = -1, c = Array(n + 1); ++u < n; ) c[u] = o[u];
        return (c[n] = r(i)), t(e, this, c);
      }
    );
  }
  function xt(t, e) {
    if (('constructor' !== e || 'function' != typeof t[e]) && '__proto__' != e) return t[e];
  }
  function Et(t) {
    if (typeof t == 'string' || Wt(t)) return t;
    var e = t + '';
    return '0' == e && 1 / t == -ae ? '-0' : e;
  }
  function Ft(t) {
    if (null != t) {
      try {
        return Ne.call(t);
      } catch (t) {}
      return t + '';
    }
    return '';
  }
  function It(t) {
    return (null == t ? 0 : t.length) ? B(t, 1) : [];
  }
  function Bt(t) {
    var e = null == t ? 0 : t.length;
    return e ? t[e - 1] : ie;
  }
  function Mt(t, e) {
    var n;
    if (typeof e != 'function') throw new TypeError('Expected a function');
    return (
      (t = Kt(t)),
      function () {
        return 0 < --t && (n = e.apply(this, arguments)), 1 >= t && (e = ie), n;
      }
    );
  }
  function Ut(t, e) {
    function n() {
      var r = arguments,
        o = e ? e.apply(this, r) : r[0],
        u = n.cache;
      return u.has(o) ? u.get(o) : ((r = t.apply(this, r)), (n.cache = u.set(o, r) || u), r);
    }
    if (typeof t != 'function' || (null != e && typeof e != 'function')) throw new TypeError('Expected a function');
    return (n.cache = new (Ut.Cache || _)()), n;
  }
  function $t(t, e) {
    return t === e || (t !== t && e !== e);
  }
  function Dt(t) {
    return null != t && Nt(t.length) && !Lt(t);
  }
  function Pt(t) {
    return Tt(t) && Dt(t);
  }
  function Lt(t) {
    return (
      !!Ct(t) &&
      ((t = D(t)),
      '[object Function]' == t ||
        '[object GeneratorFunction]' == t ||
        '[object AsyncFunction]' == t ||
        '[object Proxy]' == t)
    );
  }
  function Nt(t) {
    return typeof t == 'number' && -1 < t && 0 == t % 1 && 9007199254740991 >= t;
  }
  function Ct(t) {
    var e = typeof t;
    return null != t && ('object' == e || 'function' == e);
  }
  function Tt(t) {
    return null != t && typeof t == 'object';
  }
  function Vt(t) {
    return (
      !(!Tt(t) || '[object Object]' != D(t)) &&
      ((t = Je(t)),
      null === t ||
        ((t = Ce.call(t, 'constructor') && t.constructor),
        typeof t == 'function' && t instanceof t && Ne.call(t) == Re))
    );
  }
  function Rt(t) {
    return typeof t == 'string' || (!Un(t) && Tt(t) && '[object String]' == D(t));
  }
  function Wt(t) {
    return typeof t == 'symbol' || (Tt(t) && '[object Symbol]' == D(t));
  }
  function Gt(t) {
    return t
      ? ((t = qt(t)), t === ae || t === -ae ? 1.7976931348623157e308 * (0 > t ? -1 : 1) : t === t ? t : 0)
      : 0 === t
      ? t
      : 0;
  }
  function Kt(t) {
    t = Gt(t);
    var e = t % 1;
    return t === t ? (e ? t - e : t) : 0;
  }
  function qt(t) {
    if (typeof t == 'number') return t;
    if (Wt(t)) return fe;
    if (
      (Ct(t) && ((t = typeof t.valueOf == 'function' ? t.valueOf() : t), (t = Ct(t) ? t + '' : t)),
      typeof t != 'string')
    )
      return 0 === t ? t : +t;
    t = t ? t.slice(0, y(t) + 1).replace(he, '') : t;
    var e = ge.test(t);
    return e || de.test(t) ? Oe(t.slice(2), e ? 2 : 8) : ve.test(t) ? fe : +t;
  }
  function Ht(t) {
    return ct(t, Zt(t));
  }
  function Jt(t) {
    return null == t ? '' : Z(t);
  }
  function Qt(t, e, n) {
    return (t = null == t ? ie : U(t, e)), t === ie ? n : t;
  }
  function Xt(t, e) {
    var n;
    if ((n = null != t)) {
      n = t;
      var r;
      r = et(e, n);
      for (var o = -1, u = r.length, c = false; ++o < u; ) {
        var i = Et(r[o]);
        if (!(c = null != n && null != n && i in Object(n))) break;
        n = n[i];
      }
      c || ++o != u ? (n = c) : ((u = null == n ? 0 : n.length), (n = !!u && Nt(u) && wt(i, u) && (Un(n) || Mn(n))));
    }
    return n;
  }
  function Yt(t) {
    if (Dt(t)) t = w(t);
    else if (St(t)) {
      var e,
        n = [];
      for (e in Object(t)) Ce.call(t, e) && 'constructor' != e && n.push(e);
      t = n;
    } else t = on(t);
    return t;
  }
  function Zt(t) {
    if (Dt(t)) t = w(t, true);
    else if (Ct(t)) {
      var e,
        n = St(t),
        r = [];
      for (e in t) ('constructor' != e || (!n && Ce.call(t, e))) && r.push(e);
      t = r;
    } else {
      if (((e = []), null != t)) for (n in Object(t)) e.push(n);
      t = e;
    }
    return t;
  }
  function te(t) {
    return null == t ? [] : s(t, Yt(t));
  }
  function ee(t) {
    return function () {
      return t;
    };
  }
  function ne(t) {
    return t;
  }
  function re(t) {
    return W(typeof t == 'function' ? t : F(t, 1));
  }
  function oe(t) {
    return Ot(t) ? a(Et(t)) : X(t);
  }
  function ue() {
    return [];
  }
  function ce() {
    return false;
  }
  var ie,
    ae = 1 / 0,
    fe = NaN,
    le = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/,
    se = /^\w*$/,
    be = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g,
    he = /^\s+/,
    pe = /\s/,
    ye = /\\(\\)?/g,
    je = /\w*$/,
    ve = /^[-+]0x[0-9a-f]+$/i,
    ge = /^0b[01]+$/i,
    _e = /^\[object .+?Constructor\]$/,
    de = /^0o[0-7]+$/i,
    Ae = /^(?:0|[1-9]\d*)$/,
    we = {};
  (we['[object Float32Array]'] =
    we['[object Float64Array]'] =
    we['[object Int8Array]'] =
    we['[object Int16Array]'] =
    we['[object Int32Array]'] =
    we['[object Uint8Array]'] =
    we['[object Uint8ClampedArray]'] =
    we['[object Uint16Array]'] =
    we['[object Uint32Array]'] =
      true),
    (we['[object Arguments]'] =
      we['[object Array]'] =
      we['[object ArrayBuffer]'] =
      we['[object Boolean]'] =
      we['[object DataView]'] =
      we['[object Date]'] =
      we['[object Error]'] =
      we['[object Function]'] =
      we['[object Map]'] =
      we['[object Number]'] =
      we['[object Object]'] =
      we['[object RegExp]'] =
      we['[object Set]'] =
      we['[object String]'] =
      we['[object WeakMap]'] =
        false);
  var me = {};
  (me['[object Arguments]'] =
    me['[object Array]'] =
    me['[object ArrayBuffer]'] =
    me['[object DataView]'] =
    me['[object Boolean]'] =
    me['[object Date]'] =
    me['[object Float32Array]'] =
    me['[object Float64Array]'] =
    me['[object Int8Array]'] =
    me['[object Int16Array]'] =
    me['[object Int32Array]'] =
    me['[object Map]'] =
    me['[object Number]'] =
    me['[object Object]'] =
    me['[object RegExp]'] =
    me['[object Set]'] =
    me['[object String]'] =
    me['[object Symbol]'] =
    me['[object Uint8Array]'] =
    me['[object Uint8ClampedArray]'] =
    me['[object Uint16Array]'] =
    me['[object Uint32Array]'] =
      true),
    (me['[object Error]'] = me['[object Function]'] = me['[object WeakMap]'] = false);
  var Oe = parseInt,
    Se = typeof global == 'object' && global && global.Object === Object && global,
    ke = typeof self == 'object' && self && self.Object === Object && self,
    ze = Se || ke || Function('return this')(),
    xe =  true && exports && !exports.nodeType && exports,
    Ee = xe && "object" == 'object' && module && !module.nodeType && module,
    Fe = Ee && Ee.exports === xe,
    Ie = Fe && Se.process,
    Be = (function () {
      try {
        var t = Ee && Ee.f && Ee.f('util').types;
        return t ? t : Ie && Ie.binding && Ie.binding('util');
      } catch (t) {}
    })(),
    Me = Be && Be.isMap,
    Ue = Be && Be.isSet,
    $e = Be && Be.isTypedArray,
    De = Array.prototype,
    Pe = Object.prototype,
    Le = ze['__core-js_shared__'],
    Ne = Function.prototype.toString,
    Ce = Pe.hasOwnProperty,
    Te = (function () {
      var t = /[^.]+$/.exec((Le && Le.keys && Le.keys.IE_PROTO) || '');
      return t ? 'Symbol(src)_1.' + t : '';
    })(),
    Ve = Pe.toString,
    Re = Ne.call(Object),
    We = RegExp(
      '^' +
        Ne.call(Ce)
          .replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')
          .replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') +
        '$'
    ),
    Ge = Fe ? ze.Buffer : ie,
    Ke = ze.Symbol,
    qe = ze.Uint8Array,
    He = Ge ? Ge.g : ie,
    Je = h(Object.getPrototypeOf),
    Qe = Object.create,
    Xe = Pe.propertyIsEnumerable,
    Ye = De.splice,
    Ze = Ke ? Ke.isConcatSpreadable : ie,
    tn = Ke ? Ke.toStringTag : ie,
    en = (function () {
      try {
        var t = vt(Object, 'defineProperty');
        return t({}, '', {}), t;
      } catch (t) {}
    })(),
    nn = Object.getOwnPropertySymbols,
    rn = Ge ? Ge.isBuffer : ie,
    on = h(Object.keys),
    un = Math.max,
    cn = Date.now,
    an = vt(ze, 'DataView'),
    fn = vt(ze, 'Map'),
    ln = vt(ze, 'Promise'),
    sn = vt(ze, 'Set'),
    bn = vt(ze, 'WeakMap'),
    hn = vt(Object, 'create'),
    pn = Ft(an),
    yn = Ft(fn),
    jn = Ft(ln),
    vn = Ft(sn),
    gn = Ft(bn),
    _n = Ke ? Ke.prototype : ie,
    dn = _n ? _n.valueOf : ie,
    An = _n ? _n.toString : ie,
    wn = (function () {
      function t() {}
      return function (e) {
        return Ct(e) ? (Qe ? Qe(e) : ((t.prototype = e), (e = new t()), (t.prototype = ie), e)) : {};
      };
    })();
  (v.prototype.clear = function () {
    (this.__data__ = hn ? hn(null) : {}), (this.size = 0);
  }),
    (v.prototype.delete = function (t) {
      return (t = this.has(t) && delete this.__data__[t]), (this.size -= t ? 1 : 0), t;
    }),
    (v.prototype.get = function (t) {
      var e = this.__data__;
      return hn ? ((t = e[t]), '__lodash_hash_undefined__' === t ? ie : t) : Ce.call(e, t) ? e[t] : ie;
    }),
    (v.prototype.has = function (t) {
      var e = this.__data__;
      return hn ? e[t] !== ie : Ce.call(e, t);
    }),
    (v.prototype.set = function (t, e) {
      var n = this.__data__;
      return (this.size += this.has(t) ? 0 : 1), (n[t] = hn && e === ie ? '__lodash_hash_undefined__' : e), this;
    }),
    (g.prototype.clear = function () {
      (this.__data__ = []), (this.size = 0);
    }),
    (g.prototype.delete = function (t) {
      var e = this.__data__;
      return (t = S(e, t)), !(0 > t) && (t == e.length - 1 ? e.pop() : Ye.call(e, t, 1), --this.size, true);
    }),
    (g.prototype.get = function (t) {
      var e = this.__data__;
      return (t = S(e, t)), 0 > t ? ie : e[t][1];
    }),
    (g.prototype.has = function (t) {
      return -1 < S(this.__data__, t);
    }),
    (g.prototype.set = function (t, e) {
      var n = this.__data__,
        r = S(n, t);
      return 0 > r ? (++this.size, n.push([t, e])) : (n[r][1] = e), this;
    }),
    (_.prototype.clear = function () {
      (this.size = 0),
        (this.__data__ = {
          hash: new v(),
          map: new (fn || g)(),
          string: new v(),
        });
    }),
    (_.prototype.delete = function (t) {
      return (t = yt(this, t).delete(t)), (this.size -= t ? 1 : 0), t;
    }),
    (_.prototype.get = function (t) {
      return yt(this, t).get(t);
    }),
    (_.prototype.has = function (t) {
      return yt(this, t).has(t);
    }),
    (_.prototype.set = function (t, e) {
      var n = yt(this, t),
        r = n.size;
      return n.set(t, e), (this.size += n.size == r ? 0 : 1), this;
    }),
    (d.prototype.add = d.prototype.push =
      function (t) {
        return this.__data__.set(t, '__lodash_hash_undefined__'), this;
      }),
    (d.prototype.has = function (t) {
      return this.__data__.has(t);
    }),
    (A.prototype.clear = function () {
      (this.__data__ = new g()), (this.size = 0);
    }),
    (A.prototype.delete = function (t) {
      var e = this.__data__;
      return (t = e.delete(t)), (this.size = e.size), t;
    }),
    (A.prototype.get = function (t) {
      return this.__data__.get(t);
    }),
    (A.prototype.has = function (t) {
      return this.__data__.has(t);
    }),
    (A.prototype.set = function (t, e) {
      var n = this.__data__;
      if (n instanceof g) {
        var r = n.__data__;
        if (!fn || 199 > r.length) return r.push([t, e]), (this.size = ++n.size), this;
        n = this.__data__ = new _(r);
      }
      return n.set(t, e), (this.size = n.size), this;
    });
  var mn = (function (t, e) {
      return function (n, r) {
        if (null == n) return n;
        if (!Dt(n)) return t(n, r);
        for (var o = n.length, u = e ? o : -1, c = Object(n); (e ? u-- : ++u < o) && false !== r(c[u], u, c); );
        return n;
      };
    })(M),
    On = (function (t) {
      return function (e, n, r) {
        var o = -1,
          u = Object(e);
        r = r(e);
        for (var c = r.length; c--; ) {
          var i = r[t ? c : ++o];
          if (false === n(u[i], i, u)) break;
        }
        return e;
      };
    })(),
    Sn = en
      ? function (t, e) {
          return en(t, 'toString', { configurable: true, enumerable: false, value: ee(e), writable: true });
        }
      : ne,
    kn = nn
      ? function (t) {
          return null == t
            ? []
            : ((t = Object(t)),
              r(nn(t), function (e) {
                return Xe.call(t, e);
              }));
        }
      : ue,
    zn = nn
      ? function (t) {
          for (var e = []; t; ) u(e, kn(t)), (t = Je(t));
          return e;
        }
      : ue,
    xn = D;
  ((an && '[object DataView]' != xn(new an(new ArrayBuffer(1)))) ||
    (fn && '[object Map]' != xn(new fn())) ||
    (ln && '[object Promise]' != xn(ln.resolve())) ||
    (sn && '[object Set]' != xn(new sn())) ||
    (bn && '[object WeakMap]' != xn(new bn()))) &&
    (xn = function (t) {
      var e = D(t);
      if ((t = (t = '[object Object]' == e ? t.constructor : ie) ? Ft(t) : ''))
        switch (t) {
          case pn:
            return '[object DataView]';
          case yn:
            return '[object Map]';
          case jn:
            return '[object Promise]';
          case vn:
            return '[object Set]';
          case gn:
            return '[object WeakMap]';
        }
      return e;
    });
  var En = (function (t) {
      var e = 0,
        n = 0;
      return function () {
        var r = cn(),
          o = 16 - (r - n);
        if (((n = r), 0 < o)) {
          if (800 <= ++e) return arguments[0];
        } else e = 0;
        return t.apply(ie, arguments);
      };
    })(Sn),
    Fn = (function (t) {
      t = Ut(t, function (t) {
        return 500 === e.size && e.clear(), t;
      });
      var e = t.cache;
      return t;
    })(function (t) {
      var e = [];
      return (
        46 === t.charCodeAt(0) && e.push(''),
        t.replace(be, function (t, n, r, o) {
          e.push(r ? o.replace(ye, '$1') : n || t);
        }),
        e
      );
    }),
    In = (function (t, n) {
      return function (r, o) {
        var u = Un(r) ? e : k,
          c = n ? n() : {};
        return u(r, t, pt(o, 2), c);
      };
    })(function (t, e, n) {
      E(t, n, e);
    }),
    Bn = Y(function (t, e) {
      if (null == t) return [];
      var n = e.length;
      return 1 < n && mt(t, e[0], e[1]) ? (e = []) : 2 < n && mt(e[0], e[1], e[2]) && (e = [e[0]]), Q(t, B(e, 1));
    });
  Ut.Cache = _;
  var Mn = L(
      (function () {
        return arguments;
      })()
    )
      ? L
      : function (t) {
          return Tt(t) && Ce.call(t, 'callee') && !Xe.call(t, 'callee');
        },
    Un = Array.isArray,
    $n = rn || ce,
    Dn = Me ? l(Me) : C,
    Pn = Ue ? l(Ue) : V,
    Ln = $e ? l($e) : R,
    Nn = Y(function (t, e) {
      t = Object(t);
      var n = -1,
        r = e.length,
        o = 2 < r ? e[2] : ie;
      for (o && mt(e[0], e[1], o) && (r = 1); ++n < r; )
        for (var o = e[n], u = Zt(o), c = -1, i = u.length; ++c < i; ) {
          var a = u[c],
            f = t[a];
          (f === ie || ($t(f, Pe[a]) && !Ce.call(t, a))) && (t[a] = o[a]);
        }
      return t;
    }),
    Cn = (function (t) {
      return Y(function (e, n) {
        var r = -1,
          o = n.length,
          u = 1 < o ? n[o - 1] : ie,
          c = 2 < o ? n[2] : ie,
          u = 3 < t.length && typeof u == 'function' ? (o--, u) : ie;
        for (c && mt(n[0], n[1], c) && ((u = 3 > o ? ie : u), (o = 1)), e = Object(e); ++r < o; )
          (c = n[r]) && t(e, c, r, u);
        return e;
      });
    })(function (t, e, n) {
      J(t, e, n);
    }),
    Tn = (function (t) {
      return En(zt(t, ie, It), t + '');
    })(function (t, e) {
      var n = {};
      if (null == t) return n;
      var r = false;
      (e = o(e, function (e) {
        return (e = et(e, t)), r || (r = 1 < e.length), e;
      })),
        ct(t, ht(t), n),
        r && (n = F(n, 7, ft));
      for (var u = e.length; u--; ) tt(n, e[u]);
      return n;
    });
  (j.before = Mt),
    (j.constant = ee),
    (j.defaults = Nn),
    (j.flatten = It),
    (j.iteratee = re),
    (j.keyBy = In),
    (j.keys = Yt),
    (j.keysIn = Zt),
    (j.mapKeys = function (t, e) {
      var n = {};
      return (
        (e = pt(e, 3)),
        M(t, function (t, r, o) {
          E(n, e(t, r, o), t);
        }),
        n
      );
    }),
    (j.memoize = Ut),
    (j.merge = Cn),
    (j.omit = Tn),
    (j.once = function (t) {
      return Mt(2, t);
    }),
    (j.property = oe),
    (j.set = function (t, e, n) {
      if (null != t && Ct(t)) {
        e = et(e, t);
        for (var r = -1, o = e.length, u = o - 1, c = t; null != c && ++r < o; ) {
          var i = Et(e[r]),
            a = n;
          if ('__proto__' === i || 'constructor' === i || 'prototype' === i) break;
          if (r != u) {
            var f = c[i],
              a = ie;
            a === ie && (a = Ct(f) ? f : wt(e[r + 1]) ? [] : {});
          }
          O(c, i, a), (c = c[i]);
        }
      }
      return t;
    }),
    (j.sortBy = Bn),
    (j.toPlainObject = Ht),
    (j.values = te),
    (j.eq = $t),
    (j.findKey = function (t, e) {
      return i(t, pt(e, 3), M);
    }),
    (j.get = Qt),
    (j.hasIn = Xt),
    (j.identity = ne),
    (j.includes = function (t, e, n, r) {
      if (((t = Dt(t) ? t : te(t)), (n = n && !r ? Kt(n) : 0), (r = t.length), 0 > n && (n = un(r + n, 0)), Rt(t)))
        t = n <= r && -1 < t.indexOf(e, n);
      else {
        if ((r = !!r)) {
          if (e === e)
            t: {
              for (n -= 1, r = t.length; ++n < r; )
                if (t[n] === e) {
                  t = n;
                  break t;
                }
              t = -1;
            }
          else
            t: {
              for (e = t.length, n += -1; ++n < e; )
                if (((r = t[n]), r !== r)) {
                  t = n;
                  break t;
                }
              t = -1;
            }
          r = -1 < t;
        }
        t = r;
      }
      return t;
    }),
    (j.isArguments = Mn),
    (j.isArray = Un),
    (j.isArrayLike = Dt),
    (j.isArrayLikeObject = Pt),
    (j.isBuffer = $n),
    (j.isFunction = Lt),
    (j.isLength = Nt),
    (j.isMap = Dn),
    (j.isObject = Ct),
    (j.isObjectLike = Tt),
    (j.isPlainObject = Vt),
    (j.isSet = Pn),
    (j.isString = Rt),
    (j.isSymbol = Wt),
    (j.isTypedArray = Ln),
    (j.last = Bt),
    (j.maxBy = function (t, e) {
      return t && t.length ? I(t, pt(e, 2), P) : ie;
    }),
    (j.minBy = function (t, e) {
      return t && t.length ? I(t, pt(e, 2), G) : ie;
    }),
    (j.stubArray = ue),
    (j.stubFalse = ce),
    (j.toFinite = Gt),
    (j.toInteger = Kt),
    (j.toNumber = qt),
    (j.toString = Jt),
    (j.VERSION = '4.17.21'),
    Ee && (((Ee.exports = j)._ = j), (xe._ = j));
}).call(this);


/***/ }),

/***/ 51885:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ForceIgnore = void 0;
const node_path_1 = __webpack_require__(76760);
const os = __importStar(__webpack_require__(48161));
const index_1 = __importDefault(__webpack_require__(70298));
const graceful_fs_1 = __webpack_require__(35744);
const lifecycle_1 = __webpack_require__(17838);
const logger_1 = __webpack_require__(81346);
const fileSystemHandler_1 = __webpack_require__(74844);
class ForceIgnore {
    static FILE_NAME = '.forceignore';
    static findCache = new Map();
    static emptySingleton;
    parser;
    forceIgnoreDirectory;
    DEFAULT_IGNORE = [
        '**/*.dup',
        // I know it's ugly.  But I want to be able to retrieve metadata to a local dir, segregated by org.
        // and `.sf` is already ignored in projects, and we already have orgIds for STL
        // so this nastiness is "ignore all dot files except this one directory"
        // once you ignore a parent ex `**/.*` you can't unignore something inside that path, at least with the curent ignore library
        '**/.*',
        '!.sf',
        '**/.sf/**',
        '!**/.sf/orgs',
        '!**/.sf/orgs/**',
        '**/.sf/orgs/*/**',
        '!**/.sf/orgs/*/remoteMetadata',
        '!**/.sf/orgs/*/remoteMetadata/**',
        '**/package2-descriptor.json',
        '**/package2-manifest.json',
    ];
    constructor(forceIgnorePath = '') {
        try {
            const contents = (0, graceful_fs_1.readFileSync)(forceIgnorePath, 'utf-8');
            // check if file `.forceignore` exists
            if (contents !== undefined) {
                // check for windows style separators (\) and warn, that aren't comments
                if (contents.split(os.EOL).find((c) => c.includes('\\') && !c.startsWith('#'))) {
                    // void because you cannot await a method in a constructor
                    void lifecycle_1.Lifecycle.getInstance().emitWarning('Your .forceignore file incorrectly uses the backslash ("\\") as a folder separator; it should use the slash ("/") instead. The ignore rules will not work as expected until you fix this.');
                }
                if (contents.includes('**/unpackaged/**')) {
                    void lifecycle_1.Lifecycle.getInstance().emitWarning('Your .forceignore file contains the "**/unpackaged/**" rule. This will cause all files to be ignored during a retrieve.');
                }
                // add the default ignore paths, and then parse the .forceignore file
                this.parser = (0, index_1.default)().add(`${this.DEFAULT_IGNORE.join('\n')}\n${contents}`);
                this.forceIgnoreDirectory = (0, node_path_1.dirname)(forceIgnorePath);
            }
        }
        catch (e) {
            // TODO: log no force ignore
        }
    }
    /**
     * Performs an upward directory search for a `.forceignore` file and returns a
     * `ForceIgnore` object based on the result. If there is no `.forceignore` file,
     * the returned `ForceIgnore` object will accept everything.
     *
     * Parsed files are cached by absolute path and invalidated when `mtime` or `size` changes on disk.
     *
     * @param seed Path to begin the `.forceignore` search from
     */
    static findAndCreate(seed) {
        const projectConfigPath = (0, fileSystemHandler_1.searchUp)(seed, ForceIgnore.FILE_NAME);
        if (!projectConfigPath) {
            ForceIgnore.emptySingleton ??= new ForceIgnore('');
            return ForceIgnore.emptySingleton;
        }
        const absPath = (0, node_path_1.normalize)(projectConfigPath);
        let mtimeMs;
        let size;
        try {
            const st = (0, graceful_fs_1.statSync)(absPath);
            ({ mtimeMs, size } = st);
        }
        catch {
            return new ForceIgnore('');
        }
        const hit = ForceIgnore.findCache.get(absPath);
        if (hit && hit.mtimeMs === mtimeMs && hit.size === size) {
            return hit.instance;
        }
        const instance = new ForceIgnore((0, node_path_1.join)((0, node_path_1.dirname)(absPath), ForceIgnore.FILE_NAME));
        ForceIgnore.findCache.set(absPath, { mtimeMs, size, instance });
        return instance;
    }
    /** @internal clears module cache; for unit tests only */
    static clearCacheForTest() {
        ForceIgnore.findCache.clear();
        ForceIgnore.emptySingleton = undefined;
    }
    denies(fsPath) {
        if (!this.parser || !this.forceIgnoreDirectory)
            return false;
        try {
            const absoluteFsPath = (0, node_path_1.isAbsolute)(fsPath) ? fsPath : (0, node_path_1.resolve)(this.forceIgnoreDirectory, fsPath);
            const relativePath = (0, node_path_1.relative)(this.forceIgnoreDirectory, absoluteFsPath);
            // node-ignore requires callers to append `/` for directory-only patterns like `node_modules/`:
            // https://github.com/kaelzhang/node-ignore#2-filenames-and-dirnames
            // Known files on disk skip the trailing-slash test to avoid false positives
            // (e.g. a file named `build` matching `build/`).
            // Virtual/zip tree paths that don't exist on disk are assumed to be potential directories.
            const res = this.parser.ignores(relativePath) ||
                (couldBeDirectory(absoluteFsPath) && this.parser.ignores(`${relativePath}/`));
            if (res) {
                logger_1.Logger.childFromRoot('forceIgnore.denies').debug(`Ignoring '${fsPath}' because it matched .forceignore patterns.`);
            }
            return res;
        }
        catch (e) {
            return false;
        }
    }
    accepts(fsPath) {
        return !this.denies(fsPath);
    }
}
exports.ForceIgnore = ForceIgnore;
const couldBeDirectory = (fsPath) => {
    try {
        return !(0, graceful_fs_1.statSync)(fsPath).isFile();
    }
    catch {
        // virtual/zip trees whose paths don't exist on disk — assume it could be a directory
        return true;
    }
};
//# sourceMappingURL=forceIgnore.js.map

/***/ }),

/***/ 74844:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.findSymlinkOnPathSync = exports.findSymlinkOnPath = exports.ensureFileExists = void 0;
exports.searchUp = searchUp;
const path = __importStar(__webpack_require__(76760));
const graceful_fs_1 = __importDefault(__webpack_require__(35744));
const ensureFileExists = async (filePath) => {
    await graceful_fs_1.default.promises.mkdir(path.dirname(filePath), { recursive: true });
};
exports.ensureFileExists = ensureFileExists;
/**
 * Traverse up a file path and search for the given file name.  Always returns an absolute path.
 *
 * @param start File or folder path to start searching from
 * @param fileName File name to search for
 */
function searchUp(start, fileName) {
    const absoluteStart = path.isAbsolute(start) ? start : path.join(process.cwd(), start);
    const filePath = path.join(absoluteStart, fileName);
    if (graceful_fs_1.default.existsSync(filePath)) {
        return filePath;
    }
    const normalizedAbsoluteStart = path.normalize(absoluteStart);
    const parent = path.dirname(normalizedAbsoluteStart);
    // If we're at root, stop (don't try to go up with ..)
    if (parent === normalizedAbsoluteStart || normalizedAbsoluteStart === path.parse(normalizedAbsoluteStart).root) {
        return;
    }
    return searchUp(parent, fileName);
}
/**
 * Walk every path segment between the root (exclusive) and the destination
 * (inclusive) and return the first one that is a symbolic link, or undefined if none is.
 *
 * Both `createWriteStream` and recursive `mkdir` follow symlinks, so a link planted anywhere
 * along the destination path can redirect writes outside the root. The root is assumed trusted
 * and is not checked.
 */
const findSymlinkOnPath = async (root, destination) => {
    const rel = path.relative(root, destination);
    const segments = rel.split(path.sep).filter((s) => s.length > 0);
    const paths = segments.map((_, i) => path.join(root, ...segments.slice(0, i + 1)));
    const results = await Promise.all(paths.map(async (p) => {
        try {
            return (await graceful_fs_1.default.promises.lstat(p)).isSymbolicLink();
        }
        catch {
            return false;
        }
    }));
    return paths.find((_, i) => results[i]);
};
exports.findSymlinkOnPath = findSymlinkOnPath;
/** Synchronous variant of {@link findSymlinkOnPath} for use in sync call-chains. */
const findSymlinkOnPathSync = (root, destination) => {
    const rel = path.relative(root, destination);
    if (rel.startsWith('..'))
        return destination;
    const segments = rel.split(path.sep).filter((s) => s.length > 0);
    for (let i = 0; i < segments.length; i++) {
        const p = path.join(root, ...segments.slice(0, i + 1));
        try {
            if (graceful_fs_1.default.lstatSync(p).isSymbolicLink()) {
                return p;
            }
        }
        catch {
            // path segment doesn't exist, skip
        }
    }
    return undefined;
};
exports.findSymlinkOnPathSync = findSymlinkOnPathSync;
//# sourceMappingURL=fileSystemHandler.js.map

/***/ }),

/***/ 73366:
/***/ ((__unused_webpack_module, exports) => {


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
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.JsonCloneError = exports.UnexpectedValueTypeError = exports.AssertionFailedError = exports.NamedError = void 0;
/**
 * A minimal `NamedError` implementation not intended for widespread use -- just enough to support this library's needs.
 * For a complete `NamedError` solution, see [@salesforce/kit]{@link https://preview.npmjs.com/package/@salesforce/kit}.
 */
class NamedError extends Error {
    name;
    constructor(name, message) {
        super(message);
        this.name = name;
    }
}
exports.NamedError = NamedError;
/**
 * Indicates an unexpected type was encountered during a type-narrowing operation.
 */
class AssertionFailedError extends NamedError {
    constructor(message) {
        super('AssertionFailedError', message);
    }
}
exports.AssertionFailedError = AssertionFailedError;
/**
 * Indicates an unexpected type was encountered during a type-narrowing operation.
 */
class UnexpectedValueTypeError extends NamedError {
    constructor(message) {
        super('UnexpectedValueTypeError', message);
    }
}
exports.UnexpectedValueTypeError = UnexpectedValueTypeError;
/**
 * Indicates an error while performing a JSON clone operation.
 */
class JsonCloneError extends NamedError {
    constructor(cause) {
        super('JsonCloneError', cause.message);
    }
}
exports.JsonCloneError = JsonCloneError;
//# sourceMappingURL=errors.js.map

/***/ }),

/***/ 76865:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
__exportStar(__webpack_require__(64519), exports);
__exportStar(__webpack_require__(14535), exports);
//# sourceMappingURL=index.js.map

/***/ }),

/***/ 65811:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


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
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.asString = asString;
exports.asNumber = asNumber;
exports.asBoolean = asBoolean;
exports.asObject = asObject;
exports.asPlainObject = asPlainObject;
exports.asDictionary = asDictionary;
exports.asInstance = asInstance;
exports.asArray = asArray;
exports.asFunction = asFunction;
exports.asJsonMap = asJsonMap;
exports.asJsonArray = asJsonArray;
const is_1 = __webpack_require__(5707);
// underlying function
function asString(value, defaultValue) {
    return (0, is_1.isString)(value) ? value : defaultValue;
}
// underlying function
function asNumber(value, defaultValue) {
    return (0, is_1.isNumber)(value) ? value : defaultValue;
}
// underlying function
function asBoolean(value, defaultValue) {
    return (0, is_1.isBoolean)(value) ? value : defaultValue;
}
// underlying function
function asObject(value, defaultValue) {
    return (0, is_1.isObject)(value) ? value : defaultValue;
}
// underlying function
function asPlainObject(value, defaultValue) {
    return (0, is_1.isPlainObject)(value) ? value : defaultValue;
}
// underlying function
function asDictionary(value, defaultValue) {
    return (0, is_1.isDictionary)(value) ? value : defaultValue;
}
// underlying function
function asInstance(value, ctor, defaultValue) {
    return (0, is_1.isInstance)(value, ctor) ? value : defaultValue;
}
// underlying function
function asArray(value, defaultValue) {
    return (0, is_1.isArray)(value) ? value : defaultValue;
}
// underlying function
function asFunction(value, defaultValue) {
    return (0, is_1.isFunction)(value) ? value : defaultValue;
}
// underlying function
function asJsonMap(value, defaultValue) {
    return (0, is_1.isJsonMap)(value) ? value : defaultValue;
}
// underlying function
function asJsonArray(value, defaultValue) {
    return (0, is_1.isJsonArray)(value) ? value : defaultValue;
}
//# sourceMappingURL=as.js.map

/***/ }),

/***/ 71913:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


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
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.assert = assert;
exports.assertNonNull = assertNonNull;
exports.assertString = assertString;
exports.assertNumber = assertNumber;
exports.assertBoolean = assertBoolean;
exports.assertObject = assertObject;
exports.assertPlainObject = assertPlainObject;
exports.assertDictionary = assertDictionary;
exports.assertInstance = assertInstance;
exports.assertArray = assertArray;
exports.assertFunction = assertFunction;
exports.assertAnyJson = assertAnyJson;
exports.assertJsonMap = assertJsonMap;
exports.assertJsonArray = assertJsonArray;
const errors_1 = __webpack_require__(73366);
const as_1 = __webpack_require__(65811);
const to_1 = __webpack_require__(25814);
/**
 * Asserts that a given `condition` is true, or raises an error otherwise.
 *
 * @param condition The condition to test.
 * @param message The error message to use if the condition is false.
 * @throws {@link AssertionFailedError} If the assertion failed.
 */
function assert(condition, message) {
    if (!condition) {
        throw new errors_1.AssertionFailedError(message ?? 'Assertion condition was false');
    }
}
/**
 * Narrows a type `Nullable<T>` to a `T` or raises an error.
 *
 * Use of the type parameter `T` to further narrow the type signature of the value being tested is
 * strongly discouraged unless you are completely confident that the value is of the necessary shape to
 * conform with `T`. This function does nothing at either compile time or runtime to prove the value is of
 * shape `T`, so doing so amounts to nothing more than performing a type assertion, which is generally a
 * bad practice unless you have performed some other due diligence in proving that the value must be of
 * shape `T`. Use of the functions in the `has` co-library are useful for performing such full or partial
 * proofs.
 *
 * @param value The value to test.
 * @param message The error message to use if `value` is `undefined` or `null`.
 * @throws {@link AssertionFailedError} If the value was undefined.
 */
function assertNonNull(value, message) {
    assert(value != null, message ?? 'Value is not defined');
}
/**
 * Narrows an `unknown` value to a `string` if it is type-compatible, or raises an error otherwise.
 *
 * @param value The value to test.
 * @param message The error message to use if `value` is not type-compatible.
 * @throws {@link AssertionFailedError} If the value was undefined.
 */
function assertString(value, message) {
    assertNonNull((0, as_1.asString)(value), message ?? 'Value is not a string');
}
/**
 * Narrows an `unknown` value to a `number` if it is type-compatible, or raises an error otherwise.
 *
 * @param value The value to test.
 * @param message The error message to use if `value` is not type-compatible.
 * @throws {@link AssertionFailedError} If the value was undefined.
 */
function assertNumber(value, message) {
    assertNonNull((0, as_1.asNumber)(value), message ?? 'Value is not a number');
}
/**
 * Narrows an `unknown` value to a `boolean` if it is type-compatible, or raises an error otherwise.
 *
 * @param value The value to test.
 * @param message The error message to use if `value` is not type-compatible.
 * @throws {@link AssertionFailedError} If the value was undefined.
 */
function assertBoolean(value, message) {
    assertNonNull((0, as_1.asBoolean)(value), message ?? 'Value is not a boolean');
}
/**
 * Narrows an `unknown` value to an `object` if it is type-compatible, or raises an error otherwise.
 *
 * @param value The value to test.
 * @param message The error message to use if `value` is not type-compatible.
 * @throws {@link AssertionFailedError} If the value was undefined.
 */
function assertObject(value, message) {
    assertNonNull((0, as_1.asObject)(value), message ?? 'Value is not an object');
}
/**
 * Narrows an `unknown` value to an `object` if it is type-compatible and tests positively with {@link isPlainObject},
 * or raises an error otherwise.
 *
 * @param value The value to test.
 * @param message The error message to use if `value` is not type-compatible.
 * @throws {@link AssertionFailedError} If the value was undefined.
 */
function assertPlainObject(value, message) {
    assertNonNull((0, as_1.asPlainObject)(value), message ?? 'Value is not a plain object');
}
/**
 * Narrows an `unknown` value to a `Dictionary<T>` if it is type-compatible and tests positively
 * with {@link isDictionary}, or raises an error otherwise.
 *
 * @param value The value to test.
 * @param message The error message to use if `value` is not type-compatible.
 * @throws {@link AssertionFailedError} If the value was undefined.
 */
function assertDictionary(value, message) {
    assertNonNull((0, as_1.asDictionary)(value), message ?? 'Value is not a dictionary object');
}
/**
 * Narrows an `unknown` value to instance of constructor type `T` if it is type-compatible, or raises an error
 * otherwise.
 *
 * @param value The value to test.
 * @param message The error message to use if `value` is not type-compatible.
 * @throws {@link AssertionFailedError} If the value was undefined.
 */
function assertInstance(value, ctor, message) {
    assertNonNull((0, as_1.asInstance)(value, ctor), message ?? `Value is not an instance of ${ctor.name}`);
}
/**
 * Narrows an `unknown` value to an `Array` if it is type-compatible, or raises an error otherwise.
 *
 * @param value The value to test.
 * @param message The error message to use if `value` is not type-compatible.
 * @throws {@link AssertionFailedError} If the value was undefined.
 */
function assertArray(value, message) {
    assertNonNull((0, as_1.asArray)(value), message ?? 'Value is not an array');
}
/**
 * Narrows an `unknown` value to an `AnyFunction` if it is type-compatible, or raises an error otherwise.
 *
 * @param value The value to test.
 * @param message The error message to use if `value` is not type-compatible.
 * @throws {@link AssertionFailedError} If the value was undefined.
 */
function assertFunction(value, message) {
    assertNonNull((0, as_1.asFunction)(value), message ?? 'Value is not a function');
}
/**
 * Narrows an `unknown` value to an `AnyJson` if it is type-compatible, or returns `undefined` otherwise.
 *
 * See also caveats noted in {@link isAnyJson}.
 *
 * @param value The value to test.
 * @param message The error message to use if `value` is not type-compatible.
 * @throws {@link AssertionFailedError} If the value was not a JSON value type.
 */
function assertAnyJson(value, message) {
    assertNonNull((0, to_1.toAnyJson)(value), message ?? 'Value is not a JSON-compatible value type');
}
/**
 * Narrows an `AnyJson` value to a `JsonMap` if it is type-compatible, or raises an error otherwise.
 *
 * @param value The value to test.
 * @param message The error message to use if `value` is not type-compatible.
 * @throws {@link AssertionFailedError} If the value was undefined.
 */
function assertJsonMap(value, message) {
    assertNonNull((0, as_1.asJsonMap)(value), message ?? 'Value is not a JsonMap');
}
/**
 * Narrows an `AnyJson` value to a `JsonArray` if it is type-compatible, or raises an error otherwise.
 *
 * @param value The value to test.
 * @param message The error message to use if `value` is not type-compatible.
 * @throws {@link AssertionFailedError} If the value was undefined.
 */
function assertJsonArray(value, message) {
    assertNonNull((0, as_1.asJsonArray)(value), message ?? 'Value is not a JsonArray');
}
//# sourceMappingURL=assert.js.map

/***/ }),

/***/ 46010:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


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
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.coerceAnyJson = coerceAnyJson;
exports.coerceJsonMap = coerceJsonMap;
exports.coerceJsonArray = coerceJsonArray;
const as_1 = __webpack_require__(65811);
const is_1 = __webpack_require__(5707);
// underlying function
function coerceAnyJson(value, defaultValue) {
    return (0, is_1.isAnyJson)(value) ? value : defaultValue;
}
// underlying function
function coerceJsonMap(value, defaultValue) {
    return (0, as_1.asJsonMap)(coerceAnyJson(value)) ?? defaultValue;
}
// underlying method
function coerceJsonArray(value, defaultValue) {
    return (0, as_1.asJsonArray)(coerceAnyJson(value)) ?? defaultValue;
}
//# sourceMappingURL=coerce.js.map

/***/ }),

/***/ 27349:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


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
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ensure = ensure;
exports.ensureString = ensureString;
exports.ensureNumber = ensureNumber;
exports.ensureBoolean = ensureBoolean;
exports.ensureObject = ensureObject;
exports.ensurePlainObject = ensurePlainObject;
exports.ensureDictionary = ensureDictionary;
exports.ensureInstance = ensureInstance;
exports.ensureArray = ensureArray;
exports.ensureFunction = ensureFunction;
exports.ensureAnyJson = ensureAnyJson;
exports.ensureJsonMap = ensureJsonMap;
exports.ensureJsonArray = ensureJsonArray;
const errors_1 = __webpack_require__(73366);
const as_1 = __webpack_require__(65811);
const to_1 = __webpack_require__(25814);
/**
 * Narrows a type `Nullable<T>` to a `T` or raises an error.
 *
 * Use of the type parameter `T` to further narrow the type signature of the value being tested is
 * strongly discouraged unless you are completely confident that the value is of the necessary shape to
 * conform with `T`. This function does nothing at either compile time or runtime to prove the value is of
 * shape `T`, so doing so amounts to nothing more than performing a type assertion, which is generally a
 * bad practice unless you have performed some other due diligence in proving that the value must be of
 * shape `T`. Use of the functions in the `has` co-library are useful for performing such full or partial
 * proofs.
 *
 * @param value The value to test.
 * @param message The error message to use if `value` is `undefined` or `null`.
 * @throws {@link UnexpectedValueTypeError} If the value was undefined.
 */
function ensure(value, message) {
    if (value == null) {
        throw new errors_1.UnexpectedValueTypeError(message ?? 'Value is not defined');
    }
    return value;
}
/**
 * Narrows an `unknown` value to a `string` if it is type-compatible, or raises an error otherwise.
 *
 * @param value The value to test.
 * @param message The error message to use if `value` is not type-compatible.
 * @throws {@link UnexpectedValueTypeError} If the value was undefined.
 */
function ensureString(value, message) {
    return ensure((0, as_1.asString)(value), message ?? 'Value is not a string');
}
/**
 * Narrows an `unknown` value to a `number` if it is type-compatible, or raises an error otherwise.
 *
 * @param value The value to test.
 * @param message The error message to use if `value` is not type-compatible.
 * @throws {@link UnexpectedValueTypeError} If the value was undefined.
 */
function ensureNumber(value, message) {
    return ensure((0, as_1.asNumber)(value), message ?? 'Value is not a number');
}
/**
 * Narrows an `unknown` value to a `boolean` if it is type-compatible, or raises an error otherwise.
 *
 * @param value The value to test.
 * @param message The error message to use if `value` is not type-compatible.
 * @throws {@link UnexpectedValueTypeError} If the value was undefined.
 */
function ensureBoolean(value, message) {
    return ensure((0, as_1.asBoolean)(value), message ?? 'Value is not a boolean');
}
/**
 * Narrows an `unknown` value to an `object` if it is type-compatible, or raises an error otherwise.
 *
 * @param value The value to test.
 * @param message The error message to use if `value` is not type-compatible.
 * @throws {@link UnexpectedValueTypeError} If the value was undefined.
 */
function ensureObject(value, message) {
    return ensure((0, as_1.asObject)(value), message ?? 'Value is not an object');
}
/**
 * Narrows an `unknown` value to an `object` if it is type-compatible and tests positively with {@link isPlainObject},
 * or raises an error otherwise.
 *
 * @param value The value to test.
 * @param message The error message to use if `value` is not type-compatible.
 * @throws {@link UnexpectedValueTypeError} If the value was undefined.
 */
function ensurePlainObject(value, message) {
    return ensure((0, as_1.asPlainObject)(value), message ?? 'Value is not a plain object');
}
/**
 * Narrows an `unknown` value to a `Dictionary<T>` if it is type-compatible and tests positively
 * with {@link isDictionary}, or raises an error otherwise.
 *
 * @param value The value to test.
 * @param message The error message to use if `value` is not type-compatible.
 * @throws {@link UnexpectedValueTypeError} If the value was undefined.
 */
function ensureDictionary(value, message) {
    return ensure((0, as_1.asDictionary)(value), message ?? 'Value is not a dictionary object');
}
/**
 * Narrows an `unknown` value to instance of constructor type `T` if it is type-compatible, or raises an error
 * otherwise.
 *
 * @param value The value to test.
 * @param message The error message to use if `value` is not type-compatible.
 * @throws {@link UnexpectedValueTypeError} If the value was undefined.
 */
function ensureInstance(value, ctor, message) {
    return ensure((0, as_1.asInstance)(value, ctor), message ?? `Value is not an instance of ${ctor.name}`);
}
/**
 * Narrows an `unknown` value to an `Array` if it is type-compatible, or raises an error otherwise.
 *
 * @param value The value to test.
 * @param message The error message to use if `value` is not type-compatible.
 * @throws {@link UnexpectedValueTypeError} If the value was undefined.
 */
function ensureArray(value, message) {
    return ensure((0, as_1.asArray)(value), message ?? 'Value is not an array');
}
/**
 * Narrows an `unknown` value to an `AnyFunction` if it is type-compatible, or raises an error otherwise.
 *
 * @param value The value to test.
 * @param message The error message to use if `value` is not type-compatible.
 * @throws {@link UnexpectedValueTypeError} If the value was undefined.
 */
function ensureFunction(value, message) {
    return ensure((0, as_1.asFunction)(value), message ?? 'Value is not a function');
}
/**
 * Narrows an `unknown` value to an `AnyJson` if it is type-compatible, or returns `undefined` otherwise.
 *
 * See also caveats noted in {@link isAnyJson}.
 *
 * @param value The value to test.
 * @param message The error message to use if `value` is not type-compatible.
 * @throws {@link UnexpectedValueTypeError} If the value was not a JSON value type.
 */
function ensureAnyJson(value, message) {
    return ensure((0, to_1.toAnyJson)(value), message ?? 'Value is not a JSON-compatible value type');
}
/**
 * Narrows an `AnyJson` value to a `JsonMap` if it is type-compatible, or raises an error otherwise.
 *
 * @param value The value to test.
 * @param message The error message to use if `value` is not type-compatible.
 * @throws {@link UnexpectedValueTypeError} If the value was undefined.
 */
function ensureJsonMap(value, message) {
    return ensure((0, as_1.asJsonMap)(value), message ?? 'Value is not a JsonMap');
}
/**
 * Narrows an `AnyJson` value to a `JsonArray` if it is type-compatible, or raises an error otherwise.
 *
 * @param value The value to test.
 * @param message The error message to use if `value` is not type-compatible.
 * @throws {@link UnexpectedValueTypeError} If the value was undefined.
 */
function ensureJsonArray(value, message) {
    return ensure((0, as_1.asJsonArray)(value), message ?? 'Value is not a JsonArray');
}
//# sourceMappingURL=ensure.js.map

/***/ }),

/***/ 10583:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


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
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.get = get;
exports.getString = getString;
exports.getNumber = getNumber;
exports.getBoolean = getBoolean;
exports.getObject = getObject;
exports.getPlainObject = getPlainObject;
exports.getDictionary = getDictionary;
exports.getInstance = getInstance;
exports.getArray = getArray;
exports.getFunction = getFunction;
exports.getAnyJson = getAnyJson;
exports.getJsonMap = getJsonMap;
exports.getJsonArray = getJsonArray;
const as_1 = __webpack_require__(65811);
const coerce_1 = __webpack_require__(46010);
const has_1 = __webpack_require__(85643);
const internal_1 = __webpack_require__(65726);
/**
 * Given a deep-search query path, returns an object property or array value of an object or array.
 *
 * ```
 * const obj = { foo: { bar: ['baz'] } };
 * const value = get(obj, 'foo.bar[0]');
 * // type of value -> unknown; value === 'baz'
 *
 * const value = get(obj, 'foo.bar.nothing', 'default');
 * // type of value -> unknown; value === 'default'
 *
 * const value = get(obj, 'foo["bar"][0]');
 * // type of value -> unknown; value === 'baz'
 *
 * const arr = [obj];
 * const value = get(arr, '[0].foo.bar[0]');
 * // type of value -> unknown; value === 'baz'
 * ```
 *
 * @param from Any value to query.
 * @param path The query path.
 * @param defaultValue The default to return if the query result was not defined.
 */
function get(from, path, defaultValue) {
    return (0, internal_1.valueOrDefault)(path
        // keep values in quotes together
        .split(/['"]/)
        // values in quotes will always be odd indexes, split the non-quotes values as normal
        .reduce((r, p, index) => (index % 2 === 1 ? [...r, p] : [...r, ...p.split(/[.[\]]/)]), [])
        .filter((p) => !!p)
        .reduce((r, p) => ((0, has_1.has)(r, p) ? r[p] : undefined), from), defaultValue);
}
// underlying function
function getString(from, path, defaultValue) {
    return (0, internal_1.valueOrDefault)((0, as_1.asString)(get(from, path)), defaultValue);
}
// underlying function
function getNumber(from, path, defaultValue) {
    return (0, internal_1.valueOrDefault)((0, as_1.asNumber)(get(from, path)), defaultValue);
}
// underlying function
function getBoolean(from, path, defaultValue) {
    return (0, internal_1.valueOrDefault)((0, as_1.asBoolean)(get(from, path)), defaultValue);
}
// underlying function
function getObject(from, path, defaultValue) {
    return (0, internal_1.valueOrDefault)((0, as_1.asObject)(get(from, path)), defaultValue);
}
// underlying function
function getPlainObject(from, path, defaultValue) {
    return (0, internal_1.valueOrDefault)((0, as_1.asPlainObject)(get(from, path)), defaultValue);
}
// underlying function
function getDictionary(from, path, defaultValue) {
    return (0, internal_1.valueOrDefault)((0, as_1.asDictionary)(get(from, path)), defaultValue);
}
// underlying function
function getInstance(from, path, ctor, defaultValue) {
    return (0, internal_1.valueOrDefault)((0, as_1.asInstance)(get(from, path), ctor), defaultValue);
}
// underlying function
function getArray(from, path, defaultValue) {
    return (0, internal_1.valueOrDefault)((0, as_1.asArray)(get(from, path)), defaultValue);
}
// underlying function
function getFunction(from, path, defaultValue) {
    return (0, internal_1.valueOrDefault)((0, as_1.asFunction)(get(from, path)), defaultValue);
}
// underlying function
function getAnyJson(from, path, defaultValue) {
    return (0, internal_1.valueOrDefault)((0, coerce_1.coerceAnyJson)(get(from, path)), defaultValue);
}
// underlying function
function getJsonMap(from, path, defaultValue) {
    return (0, internal_1.valueOrDefault)((0, as_1.asJsonMap)(getAnyJson(from, path)), defaultValue);
}
// underlying function
function getJsonArray(from, path, defaultValue) {
    return (0, internal_1.valueOrDefault)((0, as_1.asJsonArray)(getAnyJson(from, path)), defaultValue);
}
//# sourceMappingURL=get.js.map

/***/ }),

/***/ 85643:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


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
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.has = has;
exports.hasString = hasString;
exports.hasNumber = hasNumber;
exports.hasBoolean = hasBoolean;
exports.hasObject = hasObject;
exports.hasPlainObject = hasPlainObject;
exports.hasDictionary = hasDictionary;
exports.hasInstance = hasInstance;
exports.hasArray = hasArray;
exports.hasFunction = hasFunction;
exports.hasAnyJson = hasAnyJson;
exports.hasJsonMap = hasJsonMap;
exports.hasJsonArray = hasJsonArray;
const is_1 = __webpack_require__(5707);
/**
 * Tests whether a value of type `T` contains one or more property `keys`. If so, the type of the tested value is
 * narrowed to reflect the existence of those keys for convenient access in the same scope. Returns false if the
 * property key does not exist on the target type, which must be an object. Returns true if the property key exists,
 * even if the associated value is `undefined` or `null`.
 *
 * ```
 * // type of obj -> unknown
 * if (has(obj, 'name')) {
 *   // type of obj -> { name: unknown }
 *   if (has(obj, 'data')) {
 *     // type of obj -> { name: unknown } & { data: unknown }
 *   } else if (has(obj, ['error', 'status'])) {
 *     // type of obj -> { name: unknown } & { error: unknown, status: unknown }
 *   }
 * }
 * ```
 *
 * @param value The value to test.
 * @param keys One or more `string` keys to check for existence.
 */
function has(value, keys) {
    return (0, is_1.isObject)(value) && ((0, is_1.isArray)(keys) ? keys.every((k) => k in value) : keys in value);
}
/**
 * Tests whether a value of type `T` contains a property `key` of type `string`. If so, the type of the tested value is
 * narrowed to reflect the existence of that key for convenient access in the same scope. Returns `false` if the
 * property key does not exist on the object or the value stored by that key is not of type `string`.
 *
 * ```
 * // type of obj -> unknown
 * if (hasString(obj, 'name')) {
 *   // type of obj -> { name: string }
 *   if (hasString(obj, 'message')) {
 *     // type of obj -> { name: string } & { message: string }
 *   }
 * }
 * ```
 *
 * @param value The value to test.
 * @param keys A `string` key to check for existence.
 */
function hasString(value, key) {
    return has(value, key) && (0, is_1.isString)(value[key]);
}
/**
 * Tests whether a value of type `T` contains a property `key` of type `number`. If so, the type of the tested value is
 * narrowed to reflect the existence of that key for convenient access in the same scope. Returns `false` if the
 * property key does not exist on the object or the value stored by that key is not of type `number`.
 *
 * ```
 * // type of obj -> unknown
 * if (hasNumber(obj, 'offset')) {
 *   // type of obj -> { offset: number }
 *   if (hasNumber(obj, 'page') && hasArray(obj, 'items')) {
 *     // type of obj -> { offset: number } & { page: number } & { items: unknown[] }
 *   }
 * }
 * ```
 *
 * @param value The value to test.
 * @param keys A `number` key to check for existence.
 */
function hasNumber(value, key) {
    return has(value, key) && (0, is_1.isNumber)(value[key]);
}
/**
 * Tests whether a value of type `T` contains a property `key` of type `boolean`. If so, the type of the tested value is
 * narrowed to reflect the existence of that key for convenient access in the same scope. Returns `false` if the
 * property key does not exist on the object or the value stored by that key is not of type `boolean`.
 *
 * ```
 * // type of obj -> unknown
 * if (hasBoolean(obj, 'enabled')) {
 *   // type of obj -> { enabled: boolean }
 *   if (hasBoolean(obj, 'hidden')) {
 *     // type of obj -> { enabled: boolean } & { hidden: boolean }
 *   }
 * }
 * ```
 *
 * @param value The value to test.
 * @param keys A `boolean` key to check for existence.
 */
function hasBoolean(value, key) {
    return has(value, key) && (0, is_1.isBoolean)(value[key]);
}
/**
 * Tests whether a value of type `T` contains a property `key` of type `object`. If so, the type of the tested value is
 * narrowed to reflect the existence of that key for convenient access in the same scope. Returns `false` if the
 * property key does not exist on the object or the value stored by that key is not of type `object`.
 *
 * ```
 * // type of obj -> unknown
 * if (hasNumber(obj, 'status')) {
 *   // type of obj -> { status: number }
 *   if (hasObject(obj, 'data')) {
 *     // type of obj -> { status: number } & { data: object }
 *   } else if (hasString('error')) {
 *     // type of obj -> { status: number } & { error: string }
 *   }
 * }
 * ```
 *
 * @param value The value to test.
 * @param keys An `object` key to check for existence.
 */
function hasObject(value, key) {
    return has(value, key) && (0, is_1.isObject)(value[key]);
}
/**
 * Tests whether a value of type `T` contains a property `key` whose type tests positively when tested with
 * {@link isPlainObject}. If so, the type of the tested value is narrowed to reflect the existence of that key for
 * convenient access in the same scope. Returns `false` if the property key does not exist on the object or the value
 * stored by that key is not of type `object`.
 *
 * ```
 * // type of obj -> unknown
 * if (hasNumber(obj, 'status')) {
 *   // type of obj -> { status: number }
 *   if (hasPlainObject(obj, 'data')) {
 *     // type of obj -> { status: number } & { data: object }
 *   } else if (hasString('error')) {
 *     // type of obj -> { status: number } & { error: string }
 *   }
 * }
 * ```
 *
 * @param value The value to test.
 * @param keys A "plain" `object` key to check for existence.
 */
function hasPlainObject(value, key) {
    return has(value, key) && (0, is_1.isPlainObject)(value[key]);
}
/**
 * Tests whether a value of type `T` contains a property `key` whose type tests positively when tested with
 * {@link isDictionary}. If so, the type of the tested value is narrowed to reflect the existence of that key for
 * convenient access in the same scope. Returns `false` if the property key does not exist on the object or the value
 * stored by that key is not of type `object`.
 *
 * ```
 * // type of obj -> unknown
 * if (hasNumber(obj, 'status')) {
 *   // type of obj -> { status: number }
 *   if (hasDictionary(obj, 'data')) {
 *     // type of obj -> { status: number } & { data: Dictionary }
 *   } else if (hasString('error')) {
 *     // type of obj -> { status: number } & { error: string }
 *   }
 * }
 * ```
 *
 * @param value The value to test.
 * @param keys A "dictionary" `object` key to check for existence.
 */
function hasDictionary(value, key) {
    return has(value, key) && (0, is_1.isDictionary)(value[key]);
}
/**
 * Tests whether a value of type `T` contains a property `key` whose type tests positively when tested with
 * {@link isInstance} when compared with the given constructor type `C`. If so, the type of the tested value is
 * narrowed to reflect the existence of that key for convenient access in the same scope. Returns `false` if the
 * property key does not exist on the object or the value stored by that key is not an instance of `C`.
 *
 * ```
 * class ServerResponse { ... }
 * // type of obj -> unknown
 * if (hasNumber(obj, 'status')) {
 *   // type of obj -> { status: number }
 *   if (hasInstance(obj, 'data', ServerResponse)) {
 *     // type of obj -> { status: number } & { data: ServerResponse }
 *   } else if (hasString('error')) {
 *     // type of obj -> { status: number } & { error: string }
 *   }
 * }
 * ```
 *
 * @param value The value to test.
 * @param keys An instance of type `C` key to check for existence.
 */
function hasInstance(value, key, ctor) {
    return has(value, key) && value[key] instanceof ctor;
}
/**
 * Tests whether a value of type `T` contains a property `key` of type {@link AnyArray}. If so, the type of the tested
 * value is narrowed to reflect the existence of that key for convenient access in the same scope. Returns `false` if
 * the property key does not exist on the object or the value stored by that key is not of type {@link AnyArray}.
 *
 * ```
 * // type of obj -> unknown
 * if (hasNumber(obj, 'offset')) {
 *   // type of obj -> { offset: number }
 *   if (hasNumber(obj, 'page') && hasArray(obj, 'items')) {
 *     // type of obj -> { offset: number } & { page: number } & { items: AnyArray }
 *   }
 * }
 * ```
 *
 * @param value The value to test.
 * @param keys An `AnyArray` key to check for existence.
 */
function hasArray(value, key) {
    return has(value, key) && (0, is_1.isArray)(value[key]);
}
/**
 * Tests whether a value of type `T` contains a property `key` of type {@link AnyFunction}. If so, the type of the
 * tested value is narrowed to reflect the existence of that key for convenient access in the same scope. Returns
 * `false` if the property key does not exist on the object or the value stored by that key is not of type
 * {@link AnyFunction}.
 *
 * ```
 * // type of obj -> unknown
 * if (hasFunction(obj, 'callback')) {
 *   // type of obj -> { callback: AnyFunction }
 *   obj.callback(response);
 * }
 * ```
 *
 * @param value The value to test.
 * @param keys An `AnyFunction` key to check for existence.
 */
function hasFunction(value, key) {
    return has(value, key) && (0, is_1.isFunction)(value[key]);
}
/**
 * Tests whether a value of type `T` contains a property `key` of type {@link AnyJson}, _using a shallow test for
 * `AnyJson` compatibility_ (see {@link isAnyJson} for more information). If so, the type of the
 * tested value is narrowed to reflect the existence of that key for convenient access in the same scope. Returns
 * `false` if the property key does not exist on the object or the value stored by that key is not of type
 * {@link AnyJson}.
 *
 * ```
 * // type of obj -> unknown
 * if (hasAnyJson(obj, 'body')) {
 *   // type of obj -> { body: AnyJson }
 * }
 * ```
 *
 * @param value The value to test.
 * @param keys An `AnyJson` key to check for existence.
 */
function hasAnyJson(value, key) {
    return has(value, key) && (0, is_1.isAnyJson)(value[key]);
}
/**
 * Tests whether a value of type `T extends AnyJson` contains a property `key` of type {@link JsonMap}. If so, the type
 * of the tested value is narrowed to reflect the existence of that key for convenient access in the same scope. Returns
 * `false` if the property key does not exist on the object or the value stored by that key is not of type
 * {@link JsonMap}.
 *
 * ```
 * // type of obj -> unknown
 * if (hasJsonMap(obj, 'body')) {
 *   // type of obj -> { body: JsonMap }
 * }
 * ```
 *
 * @param value The value to test.
 * @param keys A `JsonMap` key to check for existence.
 */
function hasJsonMap(value, key) {
    return hasAnyJson(value, key) && (0, is_1.isJsonMap)(value[key]);
}
/**
 * Tests whether a value of type `T extends AnyJson` contains a property `key` of type {@link JsonArray}. If so, the
 * type of the tested value is narrowed to reflect the existence of that key for convenient access in the same scope.
 * Returns `false` if the property key does not exist on the object or the value stored by that key is not of type
 * {@link JsonArray}.
 *
 * ```
 * // type of obj -> unknown
 * if (hasJsonArray(obj, 'body')) {
 *   // type of obj -> { body: JsonArray }
 * }
 * ```
 *
 * @param value The value to test.
 * @param keys A `JsonArray` key to check for existence.
 */
function hasJsonArray(value, key) {
    return hasAnyJson(value, key) && (0, is_1.isJsonArray)(value[key]);
}
//# sourceMappingURL=has.js.map

/***/ }),

/***/ 64519:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
__exportStar(__webpack_require__(65811), exports);
__exportStar(__webpack_require__(71913), exports);
__exportStar(__webpack_require__(46010), exports);
__exportStar(__webpack_require__(27349), exports);
__exportStar(__webpack_require__(10583), exports);
__exportStar(__webpack_require__(85643), exports);
__exportStar(__webpack_require__(5707), exports);
__exportStar(__webpack_require__(69784), exports);
__exportStar(__webpack_require__(25814), exports);
//# sourceMappingURL=index.js.map

/***/ }),

/***/ 65726:
/***/ ((__unused_webpack_module, exports) => {


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
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.valueOrDefault = valueOrDefault;
/**
 * Returns the given `value` if not either `undefined` or `null`, or the given `defaultValue` otherwise if defined.
 * Returns `null` if the value is `null` and `defaultValue` is `undefined`.
 *
 * @param value The value to test.
 * @param defaultValue The default to return if `value` was not defined.
 * @ignore
 */
function valueOrDefault(value, defaultValue) {
    return value != null || defaultValue === undefined ? value : defaultValue;
}
//# sourceMappingURL=internal.js.map

/***/ }),

/***/ 5707:
/***/ ((__unused_webpack_module, exports) => {


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
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.isString = isString;
exports.isNumber = isNumber;
exports.isBoolean = isBoolean;
exports.isObject = isObject;
exports.isFunction = isFunction;
exports.isPlainObject = isPlainObject;
exports.isDictionary = isDictionary;
exports.isInstance = isInstance;
exports.isClassAssignableTo = isClassAssignableTo;
exports.isArray = isArray;
exports.isArrayLike = isArrayLike;
exports.isAnyJson = isAnyJson;
exports.isJsonMap = isJsonMap;
exports.isJsonArray = isJsonArray;
exports.isKeyOf = isKeyOf;
/**
 * Tests whether an `unknown` value is a `string`.
 *
 * @param value The value to test.
 */
function isString(value) {
    return typeof value === 'string';
}
/**
 * Tests whether an `unknown` value is a `number`.
 *
 * @param value The value to test.
 */
function isNumber(value) {
    return typeof value === 'number';
}
/**
 * Tests whether an `unknown` value is a `boolean`.
 *
 * @param value The value to test.
 */
function isBoolean(value) {
    return typeof value === 'boolean';
}
/**
 * Tests whether an `unknown` value is an `Object` subtype (e.g., arrays, functions, objects, regexes,
 * new Number(0), new String(''), and new Boolean(true)). Tests that wish to distinguish objects that
 * were created from literals or that otherwise were not created via a non-`Object` constructor and do
 * not have a prototype chain should instead use {@link isPlainObject}.
 *
 * Use of the type parameter `T` to further narrow the type signature of the value being tested is
 * strongly discouraged unless you are completely confident that the value is of the necessary shape to
 * conform with `T`. This function does nothing at either compile time or runtime to prove the value is of
 * shape `T`, so doing so amounts to nothing more than performing a type assertion, which is generally a
 * bad practice unless you have performed some other due diligence in proving that the value must be of
 * shape `T`. Use of the functions in the `has` co-library are useful for performing such full or partial
 * proofs.
 *
 * @param value The value to test.
 */
function isObject(value) {
    return value != null && (typeof value === 'object' || typeof value === 'function');
}
/**
 * Tests whether an `unknown` value is a `function`.
 *
 * @param value The value to test.
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
function isFunction(value) {
    return typeof value === 'function';
}
/**
 * Tests whether or not an `unknown` value is a plain JavaScript object. That is, if it is an object created
 * by the Object constructor or one with a null `prototype`.
 *
 * Use of the type parameter `T` to further narrow the type signature of the value being tested is
 * strongly discouraged unless you are completely confident that the value is of the necessary shape to
 * conform with `T`. This function does nothing at either compile time or runtime to prove the value is of
 * shape `T`, so doing so amounts to nothing more than performing a type assertion, which is generally a
 * bad practice unless you have performed some other due diligence in proving that the value must be of
 * shape `T`. Use of the functions in the `has` co-library are useful for performing such full or partial
 * proofs.
 *
 * @param value The value to test.
 */
function isPlainObject(value) {
    const isObjectObject = (o) => isObject(o) && Object.prototype.toString.call(o) === '[object Object]';
    if (!isObjectObject(value))
        return false;
    const ctor = value.constructor;
    if (!isFunction(ctor))
        return false;
    if (!isObjectObject(ctor.prototype))
        return false;
    // eslint-disable-next-line no-prototype-builtins
    if (!ctor.prototype.hasOwnProperty('isPrototypeOf'))
        return false;
    return true;
}
/**
 * A shortcut for testing the suitability of a value to be used as a `Dictionary<T>` type.  Shorthand for
 * writing `isPlainObject<Dictionary<T>>(value)`.  While some non-plain-object types are compatible with
 * index signatures, they were less typically used as such, so this function focuses on the 80% case.
 *
 * Use of the type parameter `T` to further narrow the type signature of the value being tested is
 * strongly discouraged unless you are completely confident that the value is of the necessary shape to
 * conform with `T`. This function does nothing at either compile time or runtime to prove the value is of
 * shape `T`, so doing so amounts to nothing more than performing a type assertion, which is generally a
 * bad practice unless you have performed some other due diligence in proving that the value must be of
 * shape `T`. Use of the functions in the `has` co-library are useful for performing such full or partial
 * proofs.
 *
 * @param value The value to test.
 */
function isDictionary(value) {
    return isPlainObject(value);
}
/**
 * Tests whether an `unknown` value is a `function`.
 *
 * @param value The value to test.
 */
function isInstance(value, ctor) {
    return value instanceof ctor;
}
/**
 * Tests whether an `unknown` value is a class constructor that is either equal to or extends another class
 * constructor.
 *
 * @param value The value to test.
 * @param cls The class to test against.
 */
function isClassAssignableTo(value, cls) {
    // avoid circular dependency with has.ts
    const has = (v, k) => isObject(v) && k in v;
    return value === cls || (has(value, 'prototype') && value.prototype instanceof cls);
}
/**
 * Tests whether an `unknown` value is an `Array`.
 *
 * Use of the type parameter `T` to further narrow the type signature of the value being tested is
 * strongly discouraged unless you are completely confident that the value is of the necessary shape to
 * conform with `T`. This function does nothing at either compile time or runtime to prove the value is of
 * shape `T`, so doing so amounts to nothing more than performing a type assertion, which is generally a
 * bad practice unless you have performed some other due diligence in proving that the value must be of
 * shape `T`. Use of the functions in the `has` co-library are useful for performing such full or partial
 * proofs.
 *
 * @param value The value to test.
 */
function isArray(value) {
    return Array.isArray(value);
}
/**
 * Tests whether an `unknown` value conforms to {@link AnyArrayLike}.
 *
 * Use of the type parameter `T` to further narrow the type signature of the value being tested is
 * strongly discouraged unless you are completely confident that the value is of the necessary shape to
 * conform with `T`. This function does nothing at either compile time or runtime to prove the value is of
 * shape `T`, so doing so amounts to nothing more than performing a type assertion, which is generally a
 * bad practice unless you have performed some other due diligence in proving that the value must be of
 * shape `T`. Use of the functions in the `has` co-library are useful for performing such full or partial
 * proofs.
 *
 * @param value The value to test.
 */
function isArrayLike(value) {
    // avoid circular dependency with has.ts
    const hasLength = (v) => isObject(v) && 'length' in v;
    return !isFunction(value) && (isString(value) || hasLength(value));
}
/**
 * Tests whether `unknown` value is a valid JSON type. Note that objects and arrays are only checked using a shallow
 * test. To be sure that a given value is JSON-compatible at runtime, see {@link toAnyJson}.
 *
 * @param value The value to test.
 */
function isAnyJson(value) {
    return (value === null || isString(value) || isNumber(value) || isBoolean(value) || isPlainObject(value) || isArray(value));
}
/**
 * Tests whether an `AnyJson` value is an object.
 *
 * @param value The value to test.
 */
function isJsonMap(value) {
    return isPlainObject(value);
}
/**
 * Tests whether an `AnyJson` value is an array.
 *
 * @param value The value to test.
 */
function isJsonArray(value) {
    return isArray(value);
}
/**
 * Tests whether or not a `key` string is a key of the given object type `T`.
 *
 * @param obj The target object to check the key in.
 * @param key The string to test as a key of the target object.
 */
function isKeyOf(obj, key) {
    return Object.keys(obj).includes(key);
}
//# sourceMappingURL=is.js.map

/***/ }),

/***/ 69784:
/***/ ((__unused_webpack_module, exports) => {


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
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.keysOf = keysOf;
exports.entriesOf = entriesOf;
exports.valuesOf = valuesOf;
exports.definiteEntriesOf = definiteEntriesOf;
exports.definiteKeysOf = definiteKeysOf;
exports.definiteValuesOf = definiteValuesOf;
/**
 * Returns the keys of an object of type `T`. This is like `Object.keys` except the return type
 * captures the known keys of `T`.
 *
 * Note that it is the responsibility of the caller to use this wisely -- there are cases where
 * the runtime set of keys returned may be broader than the type checked set at compile time,
 * so there's potential for this to be abused in ways that are not inherently type safe. For
 * example, given base class `Animal`, subclass `Fish`, and `const animal: Animal = new Fish();`
 * then `keysOf(animal)` will not type-check the entire set of keys of the object `animal` since
 * it is actually an instance of type `Fish`, which has an extended property set.
 *
 * In general, it should be both convenient and type-safe to use this when enumerating the keys
 * of simple data objects with known properties.
 *
 * ```
 * interface Point { x: number; y: number; }
 * const point: Point = { x: 1, y: 2 };
 * const keys = keysOf(point);
 * // type of keys -> ('a' | 'b')[]
 * for (const key of keys) {
 *   console.log(key, point[key]);
 * }
 * // x 1
 * // y 2
 * ```
 *
 * @param obj The object of interest.
 */
function keysOf(obj) {
    return Object.keys(obj ?? {});
}
/**
 * Returns the entries of an object of type `T`. This is like `Object.entries` except the return type
 * captures the known keys and value types of `T`.
 *
 * Note that it is the responsibility of the caller to use this wisely -- there are cases where
 * the runtime set of entries returned may be broader than the type checked set at compile time,
 * so there's potential for this to be abused in ways that are not inherently type safe. For
 * example, given base class `Animal`, subclass `Fish`, and `const animal: Animal = new Fish();`
 * then `entriesOf(animal)` will not type-check the entire set of keys of the object `animal` since
 * it is actually an instance of type `Fish`, which has an extended property set.
 *
 * In general, it should be both convenient and type-safe to use this when enumerating the entries
 * of simple data objects with known properties.
 *
 * ```
 * interface Point { x: number; y: number; }
 * const point: Point = { x: 1, y: 2 };
 * // type of entries -> ['x' | 'y', number][]
 * const entries = entriesOf(point);
 * for (const entry of entries) {
 *   console.log(entry[0], entry[1]);
 * }
 * // x 1
 * // y 2
 * ```
 *
 * @param obj The object of interest.
 */
function entriesOf(obj) {
    return Object.entries(obj ?? {});
}
/**
 * Returns the values of an object of type `T`. This is like `Object.values` except the return type
 * captures the possible value types of `T`.
 *
 * Note that it is the responsibility of the caller to use this wisely -- there are cases where
 * the runtime set of values returned may be broader than the type checked set at compile time,
 * so there's potential for this to be abused in ways that are not inherently type safe. For
 * example, given base class `Animal`, subclass `Fish`, and `const animal: Animal = new Fish();`
 * then `valuesOf(animal)` will not type-check the entire set of values of the object `animal` since
 * it is actually an instance of type `Fish`, which has an extended property set.
 *
 * In general, it should be both convenient and type-safe to use this when enumerating the values
 * of simple data objects with known properties.
 *
 * ```
 * interface Point { x: number; y: number; }
 * const point: Point = { x: 1, y: 2 };
 * const values = valuesOf(point);
 * // type of values -> number[]
 * for (const value of values) {
 *   console.log(value);
 * }
 * // 1
 * // 2
 * ```
 *
 * @param obj The object of interest.
 */
function valuesOf(obj) {
    return Object.values(obj ?? {});
}
/**
 * Returns an array of all entry tuples of type `[K, NonNullable<T[K]>]` in an object `T` whose values are neither
 * `null` nor `undefined`. This can be convenient for enumerating the entries of unknown objects with optional
 * properties (including `Dictionary`s) without worrying about performing checks against possibly `undefined` or
 * `null` values.
 *
 * See also caveats outlined in {@link entriesOf}.
 *
 * @param obj The object of interest.
 */
function definiteEntriesOf(obj) {
    return entriesOf(obj).filter((entry) => entry[1] != null);
}
/**
 * Returns an array of all `string` keys in an object of type `T` whose values are neither `null` nor `undefined`.
 * This can be convenient for enumerating the keys of definitely assigned properties in an object or `Dictionary`.
 *
 * See also caveats outlined in {@link keysOf}.
 *
 * @param obj The object of interest.
 */
function definiteKeysOf(obj) {
    return definiteEntriesOf(obj).map((entry) => entry[0]);
}
/**
 * Returns an array of all values of type `T` in an object `T` for values that are neither `null` nor `undefined`.
 * This can be convenient for enumerating the values of unknown objects with optional properties (including
 * `Dictionary`s) without worrying about performing checks against possibly `undefined` or `null` values.
 *
 * @param obj The object of interest.
 */
function definiteValuesOf(obj) {
    return definiteEntriesOf(obj).map((entry) => entry[1]);
}
//# sourceMappingURL=object.js.map

/***/ }),

/***/ 25814:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


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
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.toAnyJson = toAnyJson;
exports.toJsonMap = toJsonMap;
exports.toJsonArray = toJsonArray;
const errors_1 = __webpack_require__(73366);
const as_1 = __webpack_require__(65811);
// underlying function
function toAnyJson(value, defaultValue) {
    try {
        return (value !== undefined ? JSON.parse(JSON.stringify(value)) : defaultValue);
    }
    catch (err) {
        throw new errors_1.JsonCloneError(err);
    }
}
// underlying function
function toJsonMap(value, defaultValue) {
    return (0, as_1.asJsonMap)(toAnyJson(value)) ?? defaultValue;
}
// underlying method
function toJsonArray(value, defaultValue) {
    return (0, as_1.asJsonArray)(toAnyJson(value)) ?? defaultValue;
}
//# sourceMappingURL=to.js.map

/***/ }),

/***/ 86471:
/***/ ((__unused_webpack_module, exports) => {


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
Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=alias.js.map

/***/ }),

/***/ 90279:
/***/ ((__unused_webpack_module, exports) => {


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
Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=collection.js.map

/***/ }),

/***/ 78179:
/***/ ((__unused_webpack_module, exports) => {


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
Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=conditional.js.map

/***/ }),

/***/ 2715:
/***/ ((__unused_webpack_module, exports) => {


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
Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=function.js.map

/***/ }),

/***/ 14535:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
__exportStar(__webpack_require__(86471), exports);
__exportStar(__webpack_require__(90279), exports);
__exportStar(__webpack_require__(78179), exports);
__exportStar(__webpack_require__(2715), exports);
__exportStar(__webpack_require__(30825), exports);
__exportStar(__webpack_require__(8492), exports);
__exportStar(__webpack_require__(94104), exports);
//# sourceMappingURL=index.js.map

/***/ }),

/***/ 30825:
/***/ ((__unused_webpack_module, exports) => {


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
Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=json.js.map

/***/ }),

/***/ 8492:
/***/ ((__unused_webpack_module, exports) => {


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
Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=mapped.js.map

/***/ }),

/***/ 94104:
/***/ ((__unused_webpack_module, exports) => {


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
Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=union.js.map

/***/ }),

/***/ 40479:
/***/ ((module) => {



/* global SharedArrayBuffer, Atomics */

if (typeof SharedArrayBuffer !== 'undefined' && typeof Atomics !== 'undefined') {
  const nil = new Int32Array(new SharedArrayBuffer(4))

  function sleep (ms) {
    // also filters out NaN, non-number types, including empty strings, but allows bigints
    const valid = ms > 0 && ms < Infinity 
    if (valid === false) {
      if (typeof ms !== 'number' && typeof ms !== 'bigint') {
        throw TypeError('sleep: ms must be a number')
      }
      throw RangeError('sleep: ms must be a number that is greater than 0 but less than Infinity')
    }

    Atomics.wait(nil, 0, 0, Number(ms))
  }
  module.exports = sleep
} else {

  function sleep (ms) {
    // also filters out NaN, non-number types, including empty strings, but allows bigints
    const valid = ms > 0 && ms < Infinity 
    if (valid === false) {
      if (typeof ms !== 'number' && typeof ms !== 'bigint') {
        throw TypeError('sleep: ms must be a number')
      }
      throw RangeError('sleep: ms must be a number that is greater than 0 but less than Infinity')
    }
    const target = Date.now() + Number(ms)
    while (target > Date.now()){}
  }

  module.exports = sleep

}


/***/ }),

/***/ 52107:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.toMatcher = exports.toRegex = exports.expandBraces = void 0;
const NODOT = '(?!\\.)';
const STAR = '[^/]*';
const GLOBSTAR_NODOT = '[^/]*(?:/(?!\\.)[^/]*)*';
const literal = (pattern, i, code) => {
    switch (code) {
        case 36 /* Code.Dollar */:
        case 42 /* Code.Star */:
        case 63 /* Code.Qmark */:
        case 91 /* Code.LBracket */:
        case 40 /* Code.LParen */:
        case 41 /* Code.RParen */:
        case 43 /* Code.Plus */:
        case 46 /* Code.Dot */:
        case 92 /* Code.Backslash */:
        case 93 /* Code.RBracket */:
        case 94 /* Code.Caret */:
        case 123 /* Code.LBrace */:
        case 124 /* Code.Pipe */:
        case 125 /* Code.RBrace */:
            return '\\' + pattern[i];
        default:
            return pattern[i];
    }
};
const posixClass = (name) => {
    switch (name) {
        case 'alnum':
            return '0-9A-Za-z';
        case 'alpha':
            return 'A-Za-z';
        case 'ascii':
            return '\\x00-\\x7f';
        case 'blank':
            return ' \\t';
        case 'cntrl':
            return '\\x00-\\x1f\\x7f';
        case 'digit':
            return '0-9';
        case 'graph':
            return '\\x21-\\x7e';
        case 'lower':
            return 'a-z';
        case 'print':
            return '\\x20-\\x7e';
        case 'punct':
            return '\\x21-\\x2f\\x3a-\\x40\\x5b-\\x60\\x7b-\\x7e';
        case 'space':
            return ' \\t\\r\\n\\v\\f';
        case 'upper':
            return 'A-Z';
        case 'word':
            return '0-9A-Za-z_';
        case 'xdigit':
            return '0-9A-Fa-f';
    }
    return;
};
const classEnd = (pattern, i) => {
    const length = pattern.length;
    let j = i + 1;
    const first = pattern.charCodeAt(j);
    if (first === 33 /* Code.Bang */ || first === 94 /* Code.Caret */)
        j++;
    if (pattern.charCodeAt(j) === 93 /* Code.RBracket */)
        j++;
    for (; j < length; j++) {
        const code = pattern.charCodeAt(j);
        if (code === 93 /* Code.RBracket */)
            return j + 1;
        if (code === 91 /* Code.LBracket */ && pattern.charCodeAt(j + 1) === 58 /* Code.Colon */) {
            const close = pattern.indexOf(':]', j + 2);
            if (close > 0)
                j = close + 1;
        }
    }
    return -1;
};
const member = (pattern, i) => {
    const code = pattern.charCodeAt(i);
    const special = code === 93 /* Code.RBracket */ ||
        code === 92 /* Code.Backslash */ ||
        code === 91 /* Code.LBracket */ ||
        code === 94 /* Code.Caret */ ||
        code === 45 /* Code.Minus */;
    return (special ? '\\' : '') + pattern[i];
};
const classSource = (pattern, i, end) => {
    const last = end - 1;
    let j = i + 1;
    let out = '';
    let members = 0;
    const first = pattern.charCodeAt(j);
    const negate = first === 33 /* Code.Bang */ || first === 94 /* Code.Caret */;
    if (negate)
        j++;
    while (j < last) {
        if (pattern.charCodeAt(j) === 91 /* Code.LBracket */ && pattern.charCodeAt(j + 1) === 58 /* Code.Colon */) {
            const close = pattern.indexOf(':]', j + 2);
            const cls = close > 0 ? posixClass(pattern.slice(j + 2, close)) : undefined;
            if (cls !== undefined) {
                out += cls;
                members += 2;
                j = close + 2;
                continue;
            }
        }
        if (pattern.charCodeAt(j + 1) === 45 /* Code.Minus */ && j + 2 < last) {
            if (pattern.charCodeAt(j + 2) >= pattern.charCodeAt(j)) {
                out += member(pattern, j) + '-' + member(pattern, j + 2);
                members += 2;
            }
            j += 3;
            continue;
        }
        out += member(pattern, j);
        members++;
        j++;
    }
    if (!negate && members === 1)
        return literal(pattern, last - 1, pattern.charCodeAt(last - 1));
    if (!members)
        return negate ? '[^/]' : '[]';
    return (negate ? '[^' : '[') + out + ']';
};
const groupEnd = (pattern, i) => {
    const length = pattern.length;
    let depth = 1;
    for (; i < length; i++) {
        const code = pattern.charCodeAt(i);
        if (code === 91 /* Code.LBracket */) {
            const end = classEnd(pattern, i);
            if (end > 0)
                i = end - 1;
        }
        else if (code === 40 /* Code.LParen */)
            depth++;
        else if (code === 41 /* Code.RParen */ && !--depth)
            return i + 1;
    }
    return -1;
};
const splitAlts = (body) => {
    const length = body.length;
    const alts = [];
    let depth = 0;
    let from = 0;
    for (let i = 0; i < length; i++) {
        const code = body.charCodeAt(i);
        if (code === 91 /* Code.LBracket */) {
            const end = classEnd(body, i);
            if (end > 0)
                i = end - 1;
        }
        else if (code === 40 /* Code.LParen */)
            depth++;
        else if (code === 41 /* Code.RParen */)
            depth--;
        else if (code === 124 /* Code.Pipe */ && !depth) {
            alts.push(body.slice(from, i));
            from = i + 1;
        }
    }
    alts.push(body.slice(from));
    return alts;
};
const isExtglobPrefix = (code) => code === 63 /* Code.Qmark */ || code === 42 /* Code.Star */ || code === 43 /* Code.Plus */ || code === 64 /* Code.At */ || code === 33 /* Code.Bang */;
const altsSource = (alts, extglob, nodot, tail, segStart) => {
    let out = '';
    for (let i = 0; i < alts.length; i++)
        out += (i ? '|' : '') + compile(alts[i], extglob, nodot, tail, segStart);
    return out;
};
const extglobSource = (type, alts, extglob, nodot, tail, segStart) => {
    const guard = nodot && segStart ? NODOT : '';
    const body = altsSource(alts, extglob, nodot, tail, segStart);
    switch (type) {
        case 63 /* Code.Qmark */:
            return '(?:' + body + ')?';
        case 64 /* Code.At */:
            return '(?:' + body + ')';
        case 33 /* Code.Bang */:
            if (alts.length === 1 && !alts[0])
                return guard + '[^/]+';
            return '(?!(?:' + body + ')' + tail + '$)' + guard + STAR;
    }
    const more = guard ? altsSource(alts, extglob, nodot, tail, false) : body;
    if (more === body)
        return '(?:' + body + ')' + (type === 42 /* Code.Star */ ? '*' : '+');
    const once = '(?:' + body + ')(?:' + more + ')*';
    return type === 42 /* Code.Star */ ? '(?:' + once + ')?' : once;
};
const compile = (pattern, extglob, nodot, tail, segStart) => {
    const length = pattern.length;
    let out = '';
    let i = 0;
    let start = segStart;
    while (i < length) {
        const code = pattern.charCodeAt(i);
        if (extglob && pattern.charCodeAt(i + 1) === 40 /* Code.LParen */ && isExtglobPrefix(code)) {
            const end = groupEnd(pattern, i + 2);
            if (end > 0) {
                const after = compile(pattern.slice(end), extglob, nodot, tail, false);
                const alts = splitAlts(pattern.slice(i + 2, end - 1));
                return out + extglobSource(code, alts, extglob, nodot, after + tail, start) + after;
            }
        }
        const atStart = start;
        const guard = nodot && atStart ? NODOT : '';
        start = false;
        switch (code) {
            case 42 /* Code.Star */: {
                let j = i + 1;
                while (pattern.charCodeAt(j) === 42 /* Code.Star */)
                    j++;
                if (j === i + 1) {
                    // a whole segment of `*` needs a character: a file name is never empty
                    const whole = atStart && (j === length || pattern.charCodeAt(j) === 47 /* Code.Slash */);
                    out += guard + (whole ? '[^/]+' : STAR);
                    i = j;
                    break;
                }
                // `**/**/` is `**/`, and `**/**` is `**`: a second globstar only multiplies the backtracking
                let slash = pattern.charCodeAt(j) === 47 /* Code.Slash */;
                while (slash) {
                    let k = j + 1;
                    if (pattern.charCodeAt(k) !== 42 /* Code.Star */ || pattern.charCodeAt(k + 1) !== 42 /* Code.Star */)
                        break;
                    k += 2;
                    while (pattern.charCodeAt(k) === 42 /* Code.Star */)
                        k++;
                    if (k === length) {
                        j = k;
                        slash = false;
                    }
                    else if (pattern.charCodeAt(k) === 47 /* Code.Slash */)
                        j = k;
                    else
                        break;
                }
                if (slash) {
                    out += nodot ? '(?:' + guard + GLOBSTAR_NODOT + '/)?' : '(?:.*/)?';
                    j++;
                    start = true;
                }
                else
                    out += nodot ? guard + GLOBSTAR_NODOT : '.*';
                i = j;
                break;
            }
            case 63 /* Code.Qmark */:
                out += guard + '[^/]';
                i++;
                break;
            case 91 /* Code.LBracket */: {
                const end = classEnd(pattern, i);
                if (end < 0) {
                    out += '\\[';
                    i++;
                    break;
                }
                const cls = classSource(pattern, i, end);
                out += (cls.charCodeAt(0) === 91 /* Code.LBracket */ ? guard : '') + cls;
                i = end;
                break;
            }
            case 47 /* Code.Slash */:
                out += '/';
                i++;
                start = true;
                break;
            default:
                out += literal(pattern, i, code);
                i++;
        }
    }
    return out;
};
const closingBrace = (pattern, open) => {
    const length = pattern.length;
    let depth = 0;
    for (let i = open; i < length; i++) {
        const code = pattern.charCodeAt(i);
        if (code === 123 /* Code.LBrace */)
            depth++;
        else if (code === 125 /* Code.RBrace */ && !--depth)
            return i;
    }
    return -1;
};
const commaSplit = (body) => {
    const length = body.length;
    const parts = [];
    let depth = 0;
    let from = 0;
    for (let i = 0; i < length; i++) {
        const code = body.charCodeAt(i);
        if (code === 123 /* Code.LBrace */)
            depth++;
        else if (code === 125 /* Code.RBrace */)
            depth--;
        else if (code === 44 /* Code.Comma */ && !depth) {
            parts.push(body.slice(from, i));
            from = i + 1;
        }
    }
    if (!parts.length)
        return;
    parts.push(body.slice(from));
    return parts;
};
const NUMERIC_RANGE = /^(-?\d+)\.\.(-?\d+)(?:\.\.(-?\d+))?$/;
const ALPHA_RANGE = /^([a-zA-Z])\.\.([a-zA-Z])(?:\.\.(-?\d+))?$/;
const PADDED = /^-?0\d/;
const rangeOf = (body, max) => {
    let match = NUMERIC_RANGE.exec(body);
    const alpha = !match;
    if (alpha)
        match = ALPHA_RANGE.exec(body);
    if (!match)
        return;
    const from = alpha ? match[1].charCodeAt(0) : +match[1];
    const to = alpha ? match[2].charCodeAt(0) : +match[2];
    const step = match[3] === undefined ? 1 : Math.abs(+match[3]) || 1;
    const width = !alpha && (PADDED.test(match[1]) || PADDED.test(match[2])) ? Math.max(match[1].length, match[2].length) : 0;
    const out = [];
    const dir = from <= to ? step : -step;
    for (let n = from; (dir > 0 ? n <= to : n >= to) && out.length < max; n += dir) {
        if (alpha) {
            out.push(String.fromCharCode(n));
            continue;
        }
        let s = String(n);
        const need = width - s.length;
        if (need > 0) {
            let zeros = '';
            for (let k = 0; k < need; k++)
                zeros += '0';
            s = n < 0 ? '-' + zeros + s.slice(1) : zeros + s;
        }
        out.push(s);
    }
    return out;
};
const expandInto = (pattern, out, max) => {
    for (let open = pattern.indexOf('{'); open >= 0; open = pattern.indexOf('{', open + 1)) {
        const close = closingBrace(pattern, open);
        if (close < 0)
            continue;
        const body = pattern.slice(open + 1, close);
        const alts = commaSplit(body) || rangeOf(body, max);
        if (!alts)
            continue;
        const prefix = pattern.slice(0, open);
        const suffixes = (0, exports.expandBraces)(pattern.slice(close + 1), max);
        for (let i = 0; i < alts.length; i++) {
            const heads = (0, exports.expandBraces)(alts[i], max);
            for (let j = 0; j < heads.length; j++) {
                const head = prefix + heads[j];
                for (let k = 0; k < suffixes.length; k++) {
                    if (out.length >= max)
                        return;
                    out.push(head + suffixes[k]);
                }
            }
        }
        return;
    }
    out.push(pattern);
};
/**
 * Expands `{a,b}` alternations and `{1..3}`, `{a..c}`, `{01..10..2}` ranges the
 * way bash does, nesting included. A group with neither a comma nor a range,
 * or without its closing brace, is kept as it is.
 *
 * @param max Number of expansions to stop at, as `brace-expansion` does.
 */
const expandBraces = (pattern, max = 100000) => {
    const out = [];
    expandInto(pattern, out, max);
    return out;
};
exports.expandBraces = expandBraces;
/**
 * Convert a glob pattern to a regular expression
 *
 * Supports:
 * - `/` to separate path segments
 * - `*` to match zero or more characters in a path segment
 * - `?` to match one character in a path segment
 * - `**` to match any number of path segments, including none
 * - `{}` to group conditions (e.g. `{html,txt}`), nested, and `{1..3}` ranges
 * - `[abc]`, `[a-z]`, `[!a-z]`, `[!abc]`, `[[:alpha:]]` character classes
 * - Extended globbing (when `extglob: true` option is set):
 *   - `?(pattern-list)` zero or one occurrence
 *   - `*(pattern-list)` zero or more occurrences
 *   - `+(pattern-list)` one or more occurrences
 *   - `@(pattern-list)` exactly one of the patterns
 *   - `!(pattern-list)` anything except the patterns
 */
const toRegex = (pattern, options) => {
    const extglob = !!options?.extglob;
    const nodot = options?.dot === false;
    let source;
    if (pattern.indexOf('{') < 0)
        source = compile(pattern, extglob, nodot, '', true);
    else {
        const set = (0, exports.expandBraces)(pattern);
        const length = set.length;
        if (length === 1)
            source = compile(set[0], extglob, nodot, '', true);
        else {
            const seen = new Set();
            source = '(?:';
            for (let i = 0; i < length; i++) {
                const one = set[i];
                if (seen.has(one))
                    continue;
                if (seen.size)
                    source += '|';
                seen.add(one);
                source += compile(one, extglob, nodot, '', true);
            }
            source += ')';
        }
    }
    return new RegExp('^' + source + '$', options?.nocase ? 'i' : '');
};
exports.toRegex = toRegex;
const isRegExp = /^\/(.{1,4096})\/([gimsuy]{0,6})$/;
const toMatcher = (pattern, options) => {
    const regexes = [];
    const patterns = Array.isArray(pattern) ? pattern : [pattern];
    for (const pat of patterns) {
        if (typeof pat === 'string') {
            const match = isRegExp.exec(pat);
            if (match) {
                const [, expr, flags] = match;
                regexes.push(new RegExp(expr, flags));
            }
            else {
                regexes.push((0, exports.toRegex)(pat, options));
            }
        }
        else {
            regexes.push(pat);
        }
    }
    return regexes.length
        ? new Function('p', 'return ' + regexes.map((r) => r + '.test(p)').join('||'))
        : () => false;
};
exports.toMatcher = toMatcher;


/***/ }),

/***/ 70298:
/***/ ((module) => {

// A simple implementation of make-array
function makeArray (subject) {
  return Array.isArray(subject)
    ? subject
    : [subject]
}

const EMPTY = ''
const SPACE = ' '
const ESCAPE = '\\'
const REGEX_TEST_BLANK_LINE = /^\s+$/
const REGEX_INVALID_TRAILING_BACKSLASH = /(?:[^\\]|^)\\$/
const REGEX_REPLACE_LEADING_EXCAPED_EXCLAMATION = /^\\!/
const REGEX_REPLACE_LEADING_EXCAPED_HASH = /^\\#/
const REGEX_SPLITALL_CRLF = /\r?\n/g
// /foo,
// ./foo,
// ../foo,
// .
// ..
const REGEX_TEST_INVALID_PATH = /^\.*\/|^\.+$/

const SLASH = '/'

// Do not use ternary expression here, since "istanbul ignore next" is buggy
let TMP_KEY_IGNORE = 'node-ignore'
/* istanbul ignore else */
if (typeof Symbol !== 'undefined') {
  TMP_KEY_IGNORE = Symbol.for('node-ignore')
}
const KEY_IGNORE = TMP_KEY_IGNORE

const define = (object, key, value) =>
  Object.defineProperty(object, key, {value})

const REGEX_REGEXP_RANGE = /([0-z])-([0-z])/g

const RETURN_FALSE = () => false

// Sanitize the range of a regular expression
// The cases are complicated, see test cases for details
const sanitizeRange = range => range.replace(
  REGEX_REGEXP_RANGE,
  (match, from, to) => from.charCodeAt(0) <= to.charCodeAt(0)
    ? match
    // Invalid range (out of order) which is ok for gitignore rules but
    //   fatal for JavaScript regular expression, so eliminate it.
    : EMPTY
)

// See fixtures #59
const cleanRangeBackSlash = slashes => {
  const {length} = slashes
  return slashes.slice(0, length - length % 2)
}

// > If the pattern ends with a slash,
// > it is removed for the purpose of the following description,
// > but it would only find a match with a directory.
// > In other words, foo/ will match a directory foo and paths underneath it,
// > but will not match a regular file or a symbolic link foo
// >  (this is consistent with the way how pathspec works in general in Git).
// '`foo/`' will not match regular file '`foo`' or symbolic link '`foo`'
// -> ignore-rules will not deal with it, because it costs extra `fs.stat` call
//      you could use option `mark: true` with `glob`

// '`foo/`' should not continue with the '`..`'
const REPLACERS = [

  [
    // remove BOM
    // TODO:
    // Other similar zero-width characters?
    /^\uFEFF/,
    () => EMPTY
  ],

  // > Trailing spaces are ignored unless they are quoted with backslash ("\")
  [
    // (a\ ) -> (a )
    // (a  ) -> (a)
    // (a ) -> (a)
    // (a \ ) -> (a  )
    /((?:\\\\)*?)(\\?\s+)$/,
    (_, m1, m2) => m1 + (
      m2.indexOf('\\') === 0
        ? SPACE
        : EMPTY
    )
  ],

  // replace (\ ) with ' '
  // (\ ) -> ' '
  // (\\ ) -> '\\ '
  // (\\\ ) -> '\\ '
  [
    /(\\+?)\s/g,
    (_, m1) => {
      const {length} = m1
      return m1.slice(0, length - length % 2) + SPACE
    }
  ],

  // Escape metacharacters
  // which is written down by users but means special for regular expressions.

  // > There are 12 characters with special meanings:
  // > - the backslash \,
  // > - the caret ^,
  // > - the dollar sign $,
  // > - the period or dot .,
  // > - the vertical bar or pipe symbol |,
  // > - the question mark ?,
  // > - the asterisk or star *,
  // > - the plus sign +,
  // > - the opening parenthesis (,
  // > - the closing parenthesis ),
  // > - and the opening square bracket [,
  // > - the opening curly brace {,
  // > These special characters are often called "metacharacters".
  [
    /[\\$.|*+(){^]/g,
    match => `\\${match}`
  ],

  [
    // > a question mark (?) matches a single character
    /(?!\\)\?/g,
    () => '[^/]'
  ],

  // leading slash
  [

    // > A leading slash matches the beginning of the pathname.
    // > For example, "/*.c" matches "cat-file.c" but not "mozilla-sha1/sha1.c".
    // A leading slash matches the beginning of the pathname
    /^\//,
    () => '^'
  ],

  // replace special metacharacter slash after the leading slash
  [
    /\//g,
    () => '\\/'
  ],

  [
    // > A leading "**" followed by a slash means match in all directories.
    // > For example, "**/foo" matches file or directory "foo" anywhere,
    // > the same as pattern "foo".
    // > "**/foo/bar" matches file or directory "bar" anywhere that is directly
    // >   under directory "foo".
    // Notice that the '*'s have been replaced as '\\*'
    /^\^*\\\*\\\*\\\//,

    // '**/foo' <-> 'foo'
    () => '^(?:.*\\/)?'
  ],

  // starting
  [
    // there will be no leading '/'
    //   (which has been replaced by section "leading slash")
    // If starts with '**', adding a '^' to the regular expression also works
    /^(?=[^^])/,
    function startingReplacer () {
      // If has a slash `/` at the beginning or middle
      return !/\/(?!$)/.test(this)
        // > Prior to 2.22.1
        // > If the pattern does not contain a slash /,
        // >   Git treats it as a shell glob pattern
        // Actually, if there is only a trailing slash,
        //   git also treats it as a shell glob pattern

        // After 2.22.1 (compatible but clearer)
        // > If there is a separator at the beginning or middle (or both)
        // > of the pattern, then the pattern is relative to the directory
        // > level of the particular .gitignore file itself.
        // > Otherwise the pattern may also match at any level below
        // > the .gitignore level.
        ? '(?:^|\\/)'

        // > Otherwise, Git treats the pattern as a shell glob suitable for
        // >   consumption by fnmatch(3)
        : '^'
    }
  ],

  // two globstars
  [
    // Use lookahead assertions so that we could match more than one `'/**'`
    /\\\/\\\*\\\*(?=\\\/|$)/g,

    // Zero, one or several directories
    // should not use '*', or it will be replaced by the next replacer

    // Check if it is not the last `'/**'`
    (_, index, str) => index + 6 < str.length

      // case: /**/
      // > A slash followed by two consecutive asterisks then a slash matches
      // >   zero or more directories.
      // > For example, "a/**/b" matches "a/b", "a/x/b", "a/x/y/b" and so on.
      // '/**/'
      ? '(?:\\/[^\\/]+)*'

      // case: /**
      // > A trailing `"/**"` matches everything inside.

      // #21: everything inside but it should not include the current folder
      : '\\/.+'
  ],

  // normal intermediate wildcards
  [
    // Never replace escaped '*'
    // ignore rule '\*' will match the path '*'

    // 'abc.*/' -> go
    // 'abc.*'  -> skip this rule,
    //    coz trailing single wildcard will be handed by [trailing wildcard]
    /(^|[^\\]+)(\\\*)+(?=.+)/g,

    // '*.js' matches '.js'
    // '*.js' doesn't match 'abc'
    (_, p1, p2) => {
      // 1.
      // > An asterisk "*" matches anything except a slash.
      // 2.
      // > Other consecutive asterisks are considered regular asterisks
      // > and will match according to the previous rules.
      const unescaped = p2.replace(/\\\*/g, '[^\\/]*')
      return p1 + unescaped
    }
  ],

  [
    // unescape, revert step 3 except for back slash
    // For example, if a user escape a '\\*',
    // after step 3, the result will be '\\\\\\*'
    /\\\\\\(?=[$.|*+(){^])/g,
    () => ESCAPE
  ],

  [
    // '\\\\' -> '\\'
    /\\\\/g,
    () => ESCAPE
  ],

  [
    // > The range notation, e.g. [a-zA-Z],
    // > can be used to match one of the characters in a range.

    // `\` is escaped by step 3
    /(\\)?\[([^\]/]*?)(\\*)($|\])/g,
    (match, leadEscape, range, endEscape, close) => leadEscape === ESCAPE
      // '\\[bar]' -> '\\\\[bar\\]'
      ? `\\[${range}${cleanRangeBackSlash(endEscape)}${close}`
      : close === ']'
        ? endEscape.length % 2 === 0
          // A normal case, and it is a range notation
          // '[bar]'
          // '[bar\\\\]'
          ? `[${sanitizeRange(range)}${endEscape}]`
          // Invalid range notaton
          // '[bar\\]' -> '[bar\\\\]'
          : '[]'
        : '[]'
  ],

  // ending
  [
    // 'js' will not match 'js.'
    // 'ab' will not match 'abc'
    /(?:[^*])$/,

    // WTF!
    // https://git-scm.com/docs/gitignore
    // changes in [2.22.1](https://git-scm.com/docs/gitignore/2.22.1)
    // which re-fixes #24, #38

    // > If there is a separator at the end of the pattern then the pattern
    // > will only match directories, otherwise the pattern can match both
    // > files and directories.

    // 'js*' will not match 'a.js'
    // 'js/' will not match 'a.js'
    // 'js' will match 'a.js' and 'a.js/'
    match => /\/$/.test(match)
      // foo/ will not match 'foo'
      ? `${match}$`
      // foo matches 'foo' and 'foo/'
      : `${match}(?=$|\\/$)`
  ],

  // trailing wildcard
  [
    /(\^|\\\/)?\\\*$/,
    (_, p1) => {
      const prefix = p1
        // '\^':
        // '/*' does not match EMPTY
        // '/*' does not match everything

        // '\\\/':
        // 'abc/*' does not match 'abc/'
        ? `${p1}[^/]+`

        // 'a*' matches 'a'
        // 'a*' matches 'aa'
        : '[^/]*'

      return `${prefix}(?=$|\\/$)`
    }
  ],
]

// A simple cache, because an ignore rule only has only one certain meaning
const regexCache = Object.create(null)

// @param {pattern}
const makeRegex = (pattern, ignoreCase) => {
  let source = regexCache[pattern]

  if (!source) {
    source = REPLACERS.reduce(
      (prev, [matcher, replacer]) =>
        prev.replace(matcher, replacer.bind(pattern)),
      pattern
    )
    regexCache[pattern] = source
  }

  return ignoreCase
    ? new RegExp(source, 'i')
    : new RegExp(source)
}

const isString = subject => typeof subject === 'string'

// > A blank line matches no files, so it can serve as a separator for readability.
const checkPattern = pattern => pattern
  && isString(pattern)
  && !REGEX_TEST_BLANK_LINE.test(pattern)
  && !REGEX_INVALID_TRAILING_BACKSLASH.test(pattern)

  // > A line starting with # serves as a comment.
  && pattern.indexOf('#') !== 0

const splitPattern = pattern => pattern.split(REGEX_SPLITALL_CRLF)

class IgnoreRule {
  constructor (
    origin,
    pattern,
    negative,
    regex
  ) {
    this.origin = origin
    this.pattern = pattern
    this.negative = negative
    this.regex = regex
  }
}

const createRule = (pattern, ignoreCase) => {
  const origin = pattern
  let negative = false

  // > An optional prefix "!" which negates the pattern;
  if (pattern.indexOf('!') === 0) {
    negative = true
    pattern = pattern.substr(1)
  }

  pattern = pattern
  // > Put a backslash ("\") in front of the first "!" for patterns that
  // >   begin with a literal "!", for example, `"\!important!.txt"`.
  .replace(REGEX_REPLACE_LEADING_EXCAPED_EXCLAMATION, '!')
  // > Put a backslash ("\") in front of the first hash for patterns that
  // >   begin with a hash.
  .replace(REGEX_REPLACE_LEADING_EXCAPED_HASH, '#')

  const regex = makeRegex(pattern, ignoreCase)

  return new IgnoreRule(
    origin,
    pattern,
    negative,
    regex
  )
}

const throwError = (message, Ctor) => {
  throw new Ctor(message)
}

const checkPath = (path, originalPath, doThrow) => {
  if (!isString(path)) {
    return doThrow(
      `path must be a string, but got \`${originalPath}\``,
      TypeError
    )
  }

  // We don't know if we should ignore EMPTY, so throw
  if (!path) {
    return doThrow(`path must not be empty`, TypeError)
  }

  // Check if it is a relative path
  if (checkPath.isNotRelative(path)) {
    const r = '`path.relative()`d'
    return doThrow(
      `path should be a ${r} string, but got "${originalPath}"`,
      RangeError
    )
  }

  return true
}

const isNotRelative = path => REGEX_TEST_INVALID_PATH.test(path)

checkPath.isNotRelative = isNotRelative
checkPath.convert = p => p

class Ignore {
  constructor ({
    ignorecase = true,
    ignoreCase = ignorecase,
    allowRelativePaths = false
  } = {}) {
    define(this, KEY_IGNORE, true)

    this._rules = []
    this._ignoreCase = ignoreCase
    this._allowRelativePaths = allowRelativePaths
    this._initCache()
  }

  _initCache () {
    this._ignoreCache = Object.create(null)
    this._testCache = Object.create(null)
  }

  _addPattern (pattern) {
    // #32
    if (pattern && pattern[KEY_IGNORE]) {
      this._rules = this._rules.concat(pattern._rules)
      this._added = true
      return
    }

    if (checkPattern(pattern)) {
      const rule = createRule(pattern, this._ignoreCase)
      this._added = true
      this._rules.push(rule)
    }
  }

  // @param {Array<string> | string | Ignore} pattern
  add (pattern) {
    this._added = false

    makeArray(
      isString(pattern)
        ? splitPattern(pattern)
        : pattern
    ).forEach(this._addPattern, this)

    // Some rules have just added to the ignore,
    // making the behavior changed.
    if (this._added) {
      this._initCache()
    }

    return this
  }

  // legacy
  addPattern (pattern) {
    return this.add(pattern)
  }

  //          |           ignored : unignored
  // negative |   0:0   |   0:1   |   1:0   |   1:1
  // -------- | ------- | ------- | ------- | --------
  //     0    |  TEST   |  TEST   |  SKIP   |    X
  //     1    |  TESTIF |  SKIP   |  TEST   |    X

  // - SKIP: always skip
  // - TEST: always test
  // - TESTIF: only test if checkUnignored
  // - X: that never happen

  // @param {boolean} whether should check if the path is unignored,
  //   setting `checkUnignored` to `false` could reduce additional
  //   path matching.

  // @returns {TestResult} true if a file is ignored
  _testOne (path, checkUnignored) {
    let ignored = false
    let unignored = false

    this._rules.forEach(rule => {
      const {negative} = rule
      if (
        unignored === negative && ignored !== unignored
        || negative && !ignored && !unignored && !checkUnignored
      ) {
        return
      }

      const matched = rule.regex.test(path)

      if (matched) {
        ignored = !negative
        unignored = negative
      }
    })

    return {
      ignored,
      unignored
    }
  }

  // @returns {TestResult}
  _test (originalPath, cache, checkUnignored, slices) {
    const path = originalPath
      // Supports nullable path
      && checkPath.convert(originalPath)

    checkPath(
      path,
      originalPath,
      this._allowRelativePaths
        ? RETURN_FALSE
        : throwError
    )

    return this._t(path, cache, checkUnignored, slices)
  }

  _t (path, cache, checkUnignored, slices) {
    if (path in cache) {
      return cache[path]
    }

    if (!slices) {
      // path/to/a.js
      // ['path', 'to', 'a.js']
      slices = path.split(SLASH)
    }

    slices.pop()

    // If the path has no parent directory, just test it
    if (!slices.length) {
      return cache[path] = this._testOne(path, checkUnignored)
    }

    const parent = this._t(
      slices.join(SLASH) + SLASH,
      cache,
      checkUnignored,
      slices
    )

    // If the path contains a parent directory, check the parent first
    return cache[path] = parent.ignored
      // > It is not possible to re-include a file if a parent directory of
      // >   that file is excluded.
      ? parent
      : this._testOne(path, checkUnignored)
  }

  ignores (path) {
    return this._test(path, this._ignoreCache, false).ignored
  }

  createFilter () {
    return path => !this.ignores(path)
  }

  filter (paths) {
    return makeArray(paths).filter(this.createFilter())
  }

  // @returns {TestResult}
  test (path) {
    return this._test(path, this._testCache, true)
  }
}

const factory = options => new Ignore(options)

const isPathValid = path =>
  checkPath(path && checkPath.convert(path), path, RETURN_FALSE)

factory.isPathValid = isPathValid

// Fixes typescript
factory.default = factory

module.exports = factory

// Windows
// --------------------------------------------------------------
/* istanbul ignore if */
if (
  // Detect `process` so that it can run in browsers.
  typeof process !== 'undefined'
  && (
    process.env && process.env.IGNORE_TEST_WIN32
    || process.platform === 'win32'
  )
) {
  /* eslint no-control-regex: "off" */
  const makePosix = str => /^\\\\\?\\/.test(str)
  || /["<>|\u0000-\u001F]+/u.test(str)
    ? str
    : str.replace(/\\/g, '/')

  checkPath.convert = makePosix

  // 'C:\\foo'     <- 'C:\\foo' has been converted to 'C:/'
  // 'd:\\foo'
  const REGIX_IS_WINDOWS_PATH_ABSOLUTE = /^[a-z]:\//i
  checkPath.isNotRelative = path =>
    REGIX_IS_WINDOWS_PATH_ABSOLUTE.test(path)
    || isNotRelative(path)
}


/***/ }),

/***/ 54655:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.constants = exports.SEP = void 0;
exports.SEP = '/';
exports.constants = {
    O_RDONLY: 0,
    O_WRONLY: 1,
    O_RDWR: 2,
    S_IFMT: 61440,
    S_IFREG: 32768,
    S_IFDIR: 16384,
    S_IFCHR: 8192,
    S_IFBLK: 24576,
    S_IFIFO: 4096,
    S_IFLNK: 40960,
    S_IFSOCK: 49152,
    O_CREAT: 64,
    O_EXCL: 128,
    O_NOCTTY: 256,
    O_TRUNC: 512,
    O_APPEND: 1024,
    O_DIRECTORY: 65536,
    O_NOATIME: 262144,
    O_NOFOLLOW: 131072,
    O_SYNC: 1052672,
    O_SYMLINK: 2097152,
    O_DIRECT: 16384,
    O_NONBLOCK: 2048,
    S_IRWXU: 448,
    S_IRUSR: 256,
    S_IWUSR: 128,
    S_IXUSR: 64,
    S_IRWXG: 56,
    S_IRGRP: 32,
    S_IWGRP: 16,
    S_IXGRP: 8,
    S_IRWXO: 7,
    S_IROTH: 4,
    S_IWOTH: 2,
    S_IXOTH: 1,
    F_OK: 0,
    R_OK: 4,
    W_OK: 2,
    X_OK: 1,
    UV_FS_SYMLINK_DIR: 1,
    UV_FS_SYMLINK_JUNCTION: 2,
    UV_FS_COPYFILE_EXCL: 1,
    UV_FS_COPYFILE_FICLONE: 2,
    UV_FS_COPYFILE_FICLONE_FORCE: 4,
    COPYFILE_EXCL: 1,
    COPYFILE_FICLONE: 2,
    COPYFILE_FICLONE_FORCE: 4,
};
//# sourceMappingURL=constants.js.map

/***/ }),

/***/ 96180:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.File = void 0;
const constants_1 = __webpack_require__(54655);
const { O_APPEND } = constants_1.constants;
/**
 * Represents an open file (file descriptor) that points to a `Link` (Hard-link) and a `Node`.
 *
 * @todo Rename to `OpenFile`.
 */
class File {
    /**
     * Open a Link-Node pair. `node` is provided separately as that might be a different node
     * rather the one `link` points to, because it might be a symlink.
     * @param link
     * @param node
     * @param flags
     * @param fd
     */
    constructor(link, node, flags, fd) {
        this.link = link;
        this.node = node;
        this.flags = flags;
        this.fd = fd;
        this.position = 0;
        if (this.flags & O_APPEND)
            this.position = this.getSize();
    }
    getString(encoding = 'utf8') {
        return this.node.getString();
    }
    setString(str) {
        this.node.setString(str);
    }
    getBuffer() {
        return this.node.getBuffer();
    }
    setBuffer(buf) {
        this.node.setBuffer(buf);
    }
    getSize() {
        return this.node.getSize();
    }
    truncate(len) {
        this.node.truncate(len);
    }
    seekTo(position) {
        this.position = position;
    }
    write(buf, offset = 0, length = buf.length, position) {
        if (typeof position !== 'number')
            position = this.position;
        const bytes = this.node.write(buf, offset, length, position);
        this.position = position + bytes;
        return bytes;
    }
    read(buf, offset = 0, length = buf.byteLength, position) {
        if (typeof position !== 'number')
            position = this.position;
        const bytes = this.node.read(buf, offset, length, position);
        this.position = position + bytes;
        return bytes;
    }
    chmod(perm) {
        this.node.chmod(perm);
    }
    chown(uid, gid) {
        this.node.chown(uid, gid);
    }
}
exports.File = File;
//# sourceMappingURL=File.js.map

/***/ }),

/***/ 71582:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Link = void 0;
const events_1 = __webpack_require__(24434);
const constants_1 = __webpack_require__(54655);
const { S_IFREG } = constants_1.constants;
/**
 * Represents a hard link that points to an i-node `node`.
 */
class Link extends events_1.EventEmitter {
    get steps() {
        return this._steps;
    }
    // Recursively sync children steps, e.g. in case of dir rename
    set steps(val) {
        this._steps = val;
        for (const [child, link] of this.children.entries()) {
            if (child === '.' || child === '..') {
                continue;
            }
            link === null || link === void 0 ? void 0 : link.syncSteps();
        }
    }
    constructor(vol, parent, name) {
        super();
        this.children = new Map();
        // Path to this node as Array: ['usr', 'bin', 'node'].
        this._steps = [];
        // "i-node" number of the node.
        this.ino = 0;
        // Number of children.
        this.length = 0;
        this.vol = vol;
        this.parent = parent;
        this.name = name;
        this.syncSteps();
    }
    setNode(node) {
        this.node = node;
        this.ino = node.ino;
    }
    getNode() {
        return this.node;
    }
    createChild(name, node = this.vol.createNode(S_IFREG | 0o666)) {
        const link = new Link(this.vol, this, name);
        link.setNode(node);
        if (node.isDirectory()) {
            link.children.set('.', link);
            link.getNode().nlink++;
        }
        this.setChild(name, link);
        return link;
    }
    setChild(name, link = new Link(this.vol, this, name)) {
        this.children.set(name, link);
        link.parent = this;
        this.length++;
        const node = link.getNode();
        if (node.isDirectory()) {
            link.children.set('..', this);
            this.getNode().nlink++;
        }
        this.getNode().mtime = new Date();
        this.emit('child:add', link, this);
        return link;
    }
    deleteChild(link) {
        const node = link.getNode();
        if (node.isDirectory()) {
            link.children.delete('..');
            this.getNode().nlink--;
        }
        this.children.delete(link.getName());
        this.length--;
        this.getNode().mtime = new Date();
        this.emit('child:delete', link, this);
    }
    getChild(name) {
        this.getNode().atime = new Date();
        return this.children.get(name);
    }
    getPath() {
        return this.steps.join("/" /* PATH.SEP */);
    }
    getParentPath() {
        return this.steps.slice(0, -1).join("/" /* PATH.SEP */);
    }
    getName() {
        return this.steps[this.steps.length - 1];
    }
    toJSON() {
        return {
            steps: this.steps,
            ino: this.ino,
            children: Array.from(this.children.keys()),
        };
    }
    syncSteps() {
        this.steps = this.parent ? this.parent.steps.concat([this.name]) : [this.name];
    }
}
exports.Link = Link;
//# sourceMappingURL=Link.js.map

/***/ }),

/***/ 54762:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Node = void 0;
const process_1 = __webpack_require__(98371);
const buffer_1 = __webpack_require__(29626);
const constants_1 = __webpack_require__(54655);
const events_1 = __webpack_require__(24434);
const { S_IFMT, S_IFDIR, S_IFREG, S_IFLNK, S_IFCHR } = constants_1.constants;
const getuid = () => { var _a, _b; return (_b = (_a = process_1.default.getuid) === null || _a === void 0 ? void 0 : _a.call(process_1.default)) !== null && _b !== void 0 ? _b : 0; };
const getgid = () => { var _a, _b; return (_b = (_a = process_1.default.getgid) === null || _a === void 0 ? void 0 : _a.call(process_1.default)) !== null && _b !== void 0 ? _b : 0; };
/**
 * Node in a file system (like i-node, v-node).
 */
class Node extends events_1.EventEmitter {
    constructor(ino, mode = 0o666) {
        super();
        // User ID and group ID.
        this._uid = getuid();
        this._gid = getgid();
        this._atime = new Date();
        this._mtime = new Date();
        this._ctime = new Date();
        this.rdev = 0;
        // Number of hard links pointing at this Node.
        this._nlink = 1;
        this.mode = mode;
        this.ino = ino;
    }
    set ctime(ctime) {
        this._ctime = ctime;
    }
    get ctime() {
        return this._ctime;
    }
    set uid(uid) {
        this._uid = uid;
        this.ctime = new Date();
    }
    get uid() {
        return this._uid;
    }
    set gid(gid) {
        this._gid = gid;
        this.ctime = new Date();
    }
    get gid() {
        return this._gid;
    }
    set atime(atime) {
        this._atime = atime;
        this.ctime = new Date();
    }
    get atime() {
        return this._atime;
    }
    set mtime(mtime) {
        this._mtime = mtime;
        this.ctime = new Date();
    }
    get mtime() {
        return this._mtime;
    }
    get perm() {
        return this.mode & ~S_IFMT;
    }
    set perm(perm) {
        this.mode = (this.mode & S_IFMT) | (perm & ~S_IFMT);
        this.ctime = new Date();
    }
    set nlink(nlink) {
        this._nlink = nlink;
        this.ctime = new Date();
    }
    get nlink() {
        return this._nlink;
    }
    getString(encoding = 'utf8') {
        this.atime = new Date();
        return this.getBuffer().toString(encoding);
    }
    setString(str) {
        // this.setBuffer(bufferFrom(str, 'utf8'));
        this.buf = (0, buffer_1.bufferFrom)(str, 'utf8');
        this.touch();
    }
    getBuffer() {
        this.atime = new Date();
        if (!this.buf)
            this.setBuffer((0, buffer_1.bufferAllocUnsafe)(0));
        return (0, buffer_1.bufferFrom)(this.buf); // Return a copy.
    }
    setBuffer(buf) {
        this.buf = (0, buffer_1.bufferFrom)(buf); // Creates a copy of data.
        this.touch();
    }
    getSize() {
        return this.buf ? this.buf.length : 0;
    }
    setModeProperty(property) {
        this.mode = property;
    }
    isFile() {
        return (this.mode & S_IFMT) === S_IFREG;
    }
    isDirectory() {
        return (this.mode & S_IFMT) === S_IFDIR;
    }
    isSymlink() {
        // return !!this.symlink;
        return (this.mode & S_IFMT) === S_IFLNK;
    }
    isCharacterDevice() {
        return (this.mode & S_IFMT) === S_IFCHR;
    }
    makeSymlink(symlink) {
        this.mode = S_IFLNK | 0o666;
        this.symlink = symlink;
    }
    write(buf, off = 0, len = buf.length, pos = 0) {
        if (!this.buf)
            this.buf = (0, buffer_1.bufferAllocUnsafe)(0);
        if (pos + len > this.buf.length) {
            const newBuf = (0, buffer_1.bufferAllocUnsafe)(pos + len);
            this.buf.copy(newBuf, 0, 0, this.buf.length);
            this.buf = newBuf;
        }
        buf.copy(this.buf, pos, off, off + len);
        this.touch();
        return len;
    }
    // Returns the number of bytes read.
    read(buf, off = 0, len = buf.byteLength, pos = 0) {
        this.atime = new Date();
        if (!this.buf)
            this.buf = (0, buffer_1.bufferAllocUnsafe)(0);
        if (pos >= this.buf.length)
            return 0;
        let actualLen = len;
        if (actualLen > buf.byteLength) {
            actualLen = buf.byteLength;
        }
        if (actualLen + pos > this.buf.length) {
            actualLen = this.buf.length - pos;
        }
        const buf2 = buf instanceof buffer_1.Buffer ? buf : buffer_1.Buffer.from(buf.buffer);
        this.buf.copy(buf2, off, pos, pos + actualLen);
        return actualLen;
    }
    truncate(len = 0) {
        if (!len)
            this.buf = (0, buffer_1.bufferAllocUnsafe)(0);
        else {
            if (!this.buf)
                this.buf = (0, buffer_1.bufferAllocUnsafe)(0);
            if (len <= this.buf.length) {
                this.buf = this.buf.slice(0, len);
            }
            else {
                const buf = (0, buffer_1.bufferAllocUnsafe)(len);
                this.buf.copy(buf);
                buf.fill(0, this.buf.length);
                this.buf = buf;
            }
        }
        this.touch();
    }
    chmod(perm) {
        this.mode = (this.mode & S_IFMT) | (perm & ~S_IFMT);
        this.touch();
    }
    chown(uid, gid) {
        this.uid = uid;
        this.gid = gid;
        this.touch();
    }
    touch() {
        this.mtime = new Date();
        this.emit('change', this);
    }
    canRead(uid = getuid(), gid = getgid()) {
        if (this.perm & 4 /* S.IROTH */) {
            return true;
        }
        if (gid === this.gid) {
            if (this.perm & 32 /* S.IRGRP */) {
                return true;
            }
        }
        if (uid === this.uid) {
            if (this.perm & 256 /* S.IRUSR */) {
                return true;
            }
        }
        return false;
    }
    canWrite(uid = getuid(), gid = getgid()) {
        if (this.perm & 2 /* S.IWOTH */) {
            return true;
        }
        if (gid === this.gid) {
            if (this.perm & 16 /* S.IWGRP */) {
                return true;
            }
        }
        if (uid === this.uid) {
            if (this.perm & 128 /* S.IWUSR */) {
                return true;
            }
        }
        return false;
    }
    canExecute(uid = getuid(), gid = getgid()) {
        if (this.perm & 1 /* S.IXOTH */) {
            return true;
        }
        if (gid === this.gid) {
            if (this.perm & 8 /* S.IXGRP */) {
                return true;
            }
        }
        if (uid === this.uid) {
            if (this.perm & 64 /* S.IXUSR */) {
                return true;
            }
        }
        return false;
    }
    del() {
        this.emit('delete', this);
    }
    toJSON() {
        return {
            ino: this.ino,
            uid: this.uid,
            gid: this.gid,
            atime: this.atime.getTime(),
            mtime: this.mtime.getTime(),
            ctime: this.ctime.getTime(),
            perm: this.perm,
            mode: this.mode,
            nlink: this.nlink,
            symlink: this.symlink,
            data: this.getString(),
        };
    }
}
exports.Node = Node;
//# sourceMappingURL=Node.js.map

/***/ }),

/***/ 28138:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Superblock = void 0;
const NodePath = __webpack_require__(16928);
const Node_1 = __webpack_require__(54762);
const Link_1 = __webpack_require__(71582);
const File_1 = __webpack_require__(96180);
const buffer_1 = __webpack_require__(29626);
const process_1 = __webpack_require__(98371);
const constants_1 = __webpack_require__(54655);
const constants_2 = __webpack_require__(93598);
const util_1 = __webpack_require__(74467);
const util_2 = __webpack_require__(82398);
const json_1 = __webpack_require__(89396);
const { sep, relative, join, dirname } = NodePath.posix ? NodePath.posix : NodePath;
const { O_RDONLY, O_WRONLY, O_RDWR, O_CREAT, O_EXCL, O_TRUNC, O_APPEND, O_DIRECTORY, O_SYMLINK, F_OK, COPYFILE_EXCL, COPYFILE_FICLONE_FORCE, } = constants_1.constants;
/**
 * Represents a filesystem superblock, which is the root of a virtual
 * filesystem in Linux.
 * @see https://lxr.linux.no/linux+v3.11.2/include/linux/fs.h#L1242
 */
class Superblock {
    static fromJSON(json, cwd) {
        const vol = new Superblock();
        vol.fromJSON(json, cwd);
        return vol;
    }
    static fromNestedJSON(json, cwd) {
        const vol = new Superblock();
        vol.fromNestedJSON(json, cwd);
        return vol;
    }
    constructor(props = {}) {
        // I-node number counter.
        this.ino = 0;
        // A mapping for i-node numbers to i-nodes (`Node`);
        this.inodes = {};
        // List of released i-node numbers, for reuse.
        this.releasedInos = [];
        // A mapping for file descriptors to `File`s.
        this.fds = {};
        // A list of reusable (opened and closed) file descriptors, that should be
        // used first before creating a new file descriptor.
        this.releasedFds = [];
        // Max number of open files.
        this.maxFiles = 10000;
        // Current number of open files.
        this.openFiles = 0;
        this.open = (filename, flagsNum, modeNum, resolveSymlinks = true) => {
            const file = this.openFile(filename, flagsNum, modeNum, resolveSymlinks);
            if (!file)
                throw (0, util_1.createError)("ENOENT" /* ERROR_CODE.ENOENT */, 'open', filename);
            return file.fd;
        };
        this.writeFile = (id, buf, flagsNum, modeNum) => {
            const isUserFd = typeof id === 'number';
            let fd;
            if (isUserFd)
                fd = id;
            else
                fd = this.open((0, util_1.pathToFilename)(id), flagsNum, modeNum);
            let offset = 0;
            let length = buf.length;
            let position = flagsNum & O_APPEND ? undefined : 0;
            try {
                while (length > 0) {
                    const written = this.write(fd, buf, offset, length, position);
                    offset += written;
                    length -= written;
                    if (position !== undefined)
                        position += written;
                }
            }
            finally {
                if (!isUserFd)
                    this.close(fd);
            }
        };
        this.read = (fd, buffer, offset, length, position) => {
            if (buffer.byteLength < length) {
                throw (0, util_1.createError)("ERR_OUT_OF_RANGE" /* ERROR_CODE.ERR_OUT_OF_RANGE */, 'read', undefined, undefined, RangeError);
            }
            const file = this.getFileByFdOrThrow(fd);
            if (file.node.isSymlink()) {
                throw (0, util_1.createError)("EPERM" /* ERROR_CODE.EPERM */, 'read', file.link.getPath());
            }
            return file.read(buffer, Number(offset), Number(length), position === -1 || typeof position !== 'number' ? undefined : position);
        };
        this.readv = (fd, buffers, position) => {
            const file = this.getFileByFdOrThrow(fd);
            let p = position !== null && position !== void 0 ? position : undefined;
            if (p === -1)
                p = undefined;
            let bytesRead = 0;
            for (const buffer of buffers) {
                const bytes = file.read(buffer, 0, buffer.byteLength, p);
                p = undefined;
                bytesRead += bytes;
                if (bytes < buffer.byteLength)
                    break;
            }
            return bytesRead;
        };
        this.link = (filename1, filename2) => {
            let link1;
            try {
                link1 = this.getLinkOrThrow(filename1, 'link');
            }
            catch (err) {
                if (err.code)
                    err = (0, util_1.createError)(err.code, 'link', filename1, filename2);
                throw err;
            }
            const dirname2 = NodePath.dirname(filename2);
            let dir2;
            try {
                dir2 = this.getLinkOrThrow(dirname2, 'link');
            }
            catch (err) {
                // Augment error with filename1
                if (err.code)
                    err = (0, util_1.createError)(err.code, 'link', filename1, filename2);
                throw err;
            }
            const name = NodePath.basename(filename2);
            if (dir2.getChild(name))
                throw (0, util_1.createError)("EEXIST" /* ERROR_CODE.EEXIST */, 'link', filename1, filename2);
            const node = link1.getNode();
            node.nlink++;
            dir2.createChild(name, node);
        };
        this.unlink = (filename) => {
            const link = this.getLinkOrThrow(filename, 'unlink');
            // TODO: Check if it is file, dir, other...
            if (link.length)
                throw Error('Dir not empty...');
            this.deleteLink(link);
            const node = link.getNode();
            node.nlink--;
            // When all hard links to i-node are deleted, remove the i-node, too.
            if (node.nlink <= 0) {
                this.deleteNode(node);
            }
        };
        this.symlink = (targetFilename, pathFilename) => {
            const pathSteps = (0, util_2.filenameToSteps)(pathFilename);
            // Check if directory exists, where we about to create a symlink.
            let dirLink;
            try {
                dirLink = this.getLinkParentAsDirOrThrow(pathSteps);
            }
            catch (err) {
                // Catch error to populate with the correct fields - getLinkParentAsDirOrThrow won't be aware of the second path
                if (err.code)
                    err = (0, util_1.createError)(err.code, 'symlink', targetFilename, pathFilename);
                throw err;
            }
            const name = pathSteps[pathSteps.length - 1];
            // Check if new file already exists.
            if (dirLink.getChild(name))
                throw (0, util_1.createError)("EEXIST" /* ERROR_CODE.EEXIST */, 'symlink', targetFilename, pathFilename);
            // Check permissions on the path where we are creating the symlink.
            // Note we're not checking permissions on the target path: It is not an error to create a symlink to a
            // non-existent or inaccessible target
            const node = dirLink.getNode();
            if (!node.canExecute() || !node.canWrite())
                throw (0, util_1.createError)("EACCES" /* ERROR_CODE.EACCES */, 'symlink', targetFilename, pathFilename);
            // Create symlink.
            const symlink = dirLink.createChild(name);
            symlink.getNode().makeSymlink(targetFilename);
            return symlink;
        };
        this.rename = (oldPathFilename, newPathFilename) => {
            let link;
            try {
                link = this.getResolvedLinkOrThrow(oldPathFilename);
            }
            catch (err) {
                // Augment err with newPathFilename
                if (err.code)
                    err = (0, util_1.createError)(err.code, 'rename', oldPathFilename, newPathFilename);
                throw err;
            }
            // TODO: Check if it is directory, if non-empty, we cannot move it, right?
            // Check directory exists for the new location.
            let newPathDirLink;
            try {
                newPathDirLink = this.getLinkParentAsDirOrThrow(newPathFilename);
            }
            catch (err) {
                // Augment error with oldPathFilename
                if (err.code)
                    err = (0, util_1.createError)(err.code, 'rename', oldPathFilename, newPathFilename);
                throw err;
            }
            // TODO: Also treat cases with directories and symbolic links.
            // TODO: See: http://man7.org/linux/man-pages/man2/rename.2.html
            // Remove hard link from old folder.
            const oldLinkParent = link.parent;
            if (!oldLinkParent)
                throw (0, util_1.createError)("EINVAL" /* ERROR_CODE.EINVAL */, 'rename', oldPathFilename, newPathFilename);
            // Check we have access and write permissions in both places
            const oldParentNode = oldLinkParent.getNode();
            const newPathDirNode = newPathDirLink.getNode();
            if (!oldParentNode.canExecute() ||
                !oldParentNode.canWrite() ||
                !newPathDirNode.canExecute() ||
                !newPathDirNode.canWrite()) {
                throw (0, util_1.createError)("EACCES" /* ERROR_CODE.EACCES */, 'rename', oldPathFilename, newPathFilename);
            }
            oldLinkParent.deleteChild(link);
            // Rename should overwrite the new path, if that exists.
            const name = NodePath.basename(newPathFilename);
            link.name = name;
            link.steps = [...newPathDirLink.steps, name];
            newPathDirLink.setChild(link.getName(), link);
        };
        this.mkdir = (filename, modeNum) => {
            const steps = (0, util_2.filenameToSteps)(filename);
            // This will throw if user tries to create root dir `fs.mkdirSync('/')`.
            if (!steps.length)
                throw (0, util_1.createError)("EEXIST" /* ERROR_CODE.EEXIST */, 'mkdir', filename);
            const dir = this.getLinkParentAsDirOrThrow(filename, 'mkdir');
            // Check path already exists.
            const name = steps[steps.length - 1];
            if (dir.getChild(name))
                throw (0, util_1.createError)("EEXIST" /* ERROR_CODE.EEXIST */, 'mkdir', filename);
            const node = dir.getNode();
            if (!node.canWrite() || !node.canExecute())
                throw (0, util_1.createError)("EACCES" /* ERROR_CODE.EACCES */, 'mkdir', filename);
            dir.createChild(name, this.createNode(constants_1.constants.S_IFDIR | modeNum));
        };
        /**
         * Creates directory tree recursively.
         */
        this.mkdirp = (filename, modeNum) => {
            let created = false;
            const steps = (0, util_2.filenameToSteps)(filename);
            let curr = null;
            let i = steps.length;
            // Find the longest subpath of filename that still exists:
            for (i = steps.length; i >= 0; i--) {
                curr = this.getResolvedLink(steps.slice(0, i));
                if (curr)
                    break;
            }
            if (!curr) {
                curr = this.root;
                i = 0;
            }
            // curr is now the last directory that still exists.
            // (If none of them existed, curr is the root.)
            // Check access the lazy way:
            curr = this.getResolvedLinkOrThrow(sep + steps.slice(0, i).join(sep), 'mkdir');
            // Start creating directories:
            for (i; i < steps.length; i++) {
                const node = curr.getNode();
                if (node.isDirectory()) {
                    // Check we have permissions
                    if (!node.canExecute() || !node.canWrite())
                        throw (0, util_1.createError)("EACCES" /* ERROR_CODE.EACCES */, 'mkdir', filename);
                }
                else {
                    throw (0, util_1.createError)("ENOTDIR" /* ERROR_CODE.ENOTDIR */, 'mkdir', filename);
                }
                created = true;
                curr = curr.createChild(steps[i], this.createNode(constants_1.constants.S_IFDIR | modeNum));
            }
            return created ? filename : undefined;
        };
        this.rmdir = (filename, recursive = false) => {
            const link = this.getLinkAsDirOrThrow(filename, 'rmdir');
            if (link.length && !recursive)
                throw (0, util_1.createError)("ENOTEMPTY" /* ERROR_CODE.ENOTEMPTY */, 'rmdir', filename);
            this.deleteLink(link);
        };
        this.rm = (filename, force = false, recursive = false) => {
            var _a;
            // "stat" is used to match Node's native error message.
            let link;
            try {
                link = this.getResolvedLinkOrThrow(filename, 'stat');
            }
            catch (err) {
                // Silently ignore missing paths if force option is true
                if (err.code === "ENOENT" /* ERROR_CODE.ENOENT */ && force)
                    return;
                else
                    throw err;
            }
            if (link.getNode().isDirectory() && !recursive)
                throw (0, util_1.createError)("ERR_FS_EISDIR" /* ERROR_CODE.ERR_FS_EISDIR */, 'rm', filename);
            if (!((_a = link.parent) === null || _a === void 0 ? void 0 : _a.getNode().canWrite()))
                throw (0, util_1.createError)("EACCES" /* ERROR_CODE.EACCES */, 'rm', filename);
            this.deleteLink(link);
        };
        this.close = (fd) => {
            (0, util_2.validateFd)(fd);
            const file = this.getFileByFdOrThrow(fd, 'close');
            this.closeFile(file);
        };
        const root = this.createLink();
        root.setNode(this.createNode(constants_1.constants.S_IFDIR | 0o777));
        const self = this; // tslint:disable-line no-this-assignment
        root.setChild('.', root);
        root.getNode().nlink++;
        root.setChild('..', root);
        root.getNode().nlink++;
        this.root = root;
    }
    createLink(parent, name, isDirectory = false, mode) {
        if (!parent) {
            return new Link_1.Link(this, void 0, '');
        }
        if (!name) {
            throw new Error('createLink: name cannot be empty');
        }
        // If no explicit permission is provided, use defaults based on type
        const finalPerm = mode !== null && mode !== void 0 ? mode : (isDirectory ? 0o777 : 0o666);
        // To prevent making a breaking change, `mode` can also just be a permission number
        // and the file type is set based on `isDirectory`
        const hasFileType = mode && mode & constants_1.constants.S_IFMT;
        const modeType = hasFileType ? mode & constants_1.constants.S_IFMT : isDirectory ? constants_1.constants.S_IFDIR : constants_1.constants.S_IFREG;
        const finalMode = (finalPerm & ~constants_1.constants.S_IFMT) | modeType;
        return parent.createChild(name, this.createNode(finalMode));
    }
    deleteLink(link) {
        const parent = link.parent;
        if (parent) {
            parent.deleteChild(link);
            return true;
        }
        return false;
    }
    newInoNumber() {
        const releasedFd = this.releasedInos.pop();
        if (releasedFd)
            return releasedFd;
        else {
            this.ino = (this.ino + 1) % 0xffffffff;
            return this.ino;
        }
    }
    newFdNumber() {
        const releasedFd = this.releasedFds.pop();
        return typeof releasedFd === 'number' ? releasedFd : Superblock.fd--;
    }
    createNode(mode) {
        const node = new Node_1.Node(this.newInoNumber(), mode);
        this.inodes[node.ino] = node;
        return node;
    }
    deleteNode(node) {
        node.del();
        delete this.inodes[node.ino];
        this.releasedInos.push(node.ino);
    }
    walk(stepsOrFilenameOrLink, resolveSymlinks = false, checkExistence = false, checkAccess = false, funcName) {
        var _a;
        let steps;
        let filename;
        if (stepsOrFilenameOrLink instanceof Link_1.Link) {
            steps = stepsOrFilenameOrLink.steps;
            filename = sep + steps.join(sep);
        }
        else if (typeof stepsOrFilenameOrLink === 'string') {
            steps = (0, util_2.filenameToSteps)(stepsOrFilenameOrLink);
            filename = stepsOrFilenameOrLink;
        }
        else {
            steps = stepsOrFilenameOrLink;
            filename = sep + steps.join(sep);
        }
        let curr = this.root;
        let i = 0;
        while (i < steps.length) {
            let node = curr.getNode();
            // Check access permissions if current link is a directory
            if (node.isDirectory()) {
                if (checkAccess && !node.canExecute()) {
                    throw (0, util_1.createError)("EACCES" /* ERROR_CODE.EACCES */, funcName, filename);
                }
            }
            else {
                if (i < steps.length - 1)
                    throw (0, util_1.createError)("ENOTDIR" /* ERROR_CODE.ENOTDIR */, funcName, filename);
            }
            curr = (_a = curr.getChild(steps[i])) !== null && _a !== void 0 ? _a : null;
            // Check existence of current link
            if (!curr)
                if (checkExistence)
                    throw (0, util_1.createError)("ENOENT" /* ERROR_CODE.ENOENT */, funcName, filename);
                else
                    return null;
            node = curr === null || curr === void 0 ? void 0 : curr.getNode();
            // Resolve symlink if we're resolving all symlinks OR if this is an intermediate path component
            // This allows lstat to traverse through symlinks in intermediate directories while not resolving the final component
            if (node.isSymlink() && (resolveSymlinks || i < steps.length - 1)) {
                const resolvedPath = NodePath.isAbsolute(node.symlink)
                    ? node.symlink
                    : join(NodePath.dirname(curr.getPath()), node.symlink); // Relative to symlink's parent
                steps = (0, util_2.filenameToSteps)(resolvedPath).concat(steps.slice(i + 1));
                curr = this.root;
                i = 0;
                continue;
            }
            // After resolving symlinks, check if it's not a directory and we still have more steps
            // This handles the case where we try to traverse through a file
            // Only do this check when we're doing filesystem operations (checkExistence = true)
            if (checkExistence && !node.isDirectory() && i < steps.length - 1) {
                // On Windows, use ENOENT for consistency with Node.js behavior
                // On other platforms, use ENOTDIR which is more semantically correct
                const errorCode = process_1.default.platform === 'win32' ? "ENOENT" /* ERROR_CODE.ENOENT */ : "ENOTDIR" /* ERROR_CODE.ENOTDIR */;
                throw (0, util_1.createError)(errorCode, funcName, filename);
            }
            i++;
        }
        return curr;
    }
    // Returns a `Link` (hard link) referenced by path "split" into steps.
    getLink(steps) {
        return this.walk(steps, false, false, false);
    }
    // Just link `getLink`, but throws a correct user error, if link to found.
    getLinkOrThrow(filename, funcName) {
        return this.walk(filename, false, true, true, funcName);
    }
    // Just like `getLink`, but also dereference/resolves symbolic links.
    getResolvedLink(filenameOrSteps) {
        return this.walk(filenameOrSteps, true, false, false);
    }
    /**
     * Just like `getLinkOrThrow`, but also dereference/resolves symbolic links.
     */
    getResolvedLinkOrThrow(filename, funcName) {
        return this.walk(filename, true, true, true, funcName);
    }
    resolveSymlinks(link) {
        return this.getResolvedLink(link.steps.slice(1));
    }
    /**
     * Just like `getLinkOrThrow`, but also verifies that the link is a directory.
     */
    getLinkAsDirOrThrow(filename, funcName) {
        const link = this.getLinkOrThrow(filename, funcName);
        if (!link.getNode().isDirectory())
            throw (0, util_1.createError)("ENOTDIR" /* ERROR_CODE.ENOTDIR */, funcName, filename);
        return link;
    }
    // Get the immediate parent directory of the link.
    getLinkParent(steps) {
        return this.getLink(steps.slice(0, -1));
    }
    getLinkParentAsDirOrThrow(filenameOrSteps, funcName) {
        const steps = (filenameOrSteps instanceof Array ? filenameOrSteps : (0, util_2.filenameToSteps)(filenameOrSteps)).slice(0, -1);
        const filename = sep + steps.join(sep);
        const link = this.getLinkOrThrow(filename, funcName);
        if (!link.getNode().isDirectory())
            throw (0, util_1.createError)("ENOTDIR" /* ERROR_CODE.ENOTDIR */, funcName, filename);
        return link;
    }
    getFileByFd(fd) {
        return this.fds[String(fd)];
    }
    getFileByFdOrThrow(fd, funcName) {
        if (!(0, util_2.isFd)(fd))
            throw TypeError(constants_2.ERRSTR.FD);
        const file = this.getFileByFd(fd);
        if (!file)
            throw (0, util_1.createError)("EBADF" /* ERROR_CODE.EBADF */, funcName);
        return file;
    }
    _toJSON(link = this.root, json = {}, path, asBuffer) {
        let isEmpty = true;
        let children = link.children;
        if (link.getNode().isFile()) {
            children = new Map([[link.getName(), link.parent.getChild(link.getName())]]);
            link = link.parent;
        }
        for (const name of children.keys()) {
            if (name === '.' || name === '..') {
                continue;
            }
            isEmpty = false;
            const child = link.getChild(name);
            if (!child) {
                throw new Error('_toJSON: unexpected undefined');
            }
            const node = child.getNode();
            if (node.isFile()) {
                let filename = child.getPath();
                if (path)
                    filename = relative(path, filename);
                json[filename] = asBuffer ? node.getBuffer() : node.getString();
            }
            else if (node.isDirectory()) {
                this._toJSON(child, json, path, asBuffer);
            }
        }
        let dirPath = link.getPath();
        if (path)
            dirPath = relative(path, dirPath);
        if (dirPath && isEmpty) {
            json[dirPath] = null;
        }
        return json;
    }
    toJSON(paths, json = {}, isRelative = false, asBuffer = false) {
        const links = [];
        if (paths) {
            if (!Array.isArray(paths))
                paths = [paths];
            for (const path of paths) {
                const filename = (0, util_1.pathToFilename)(path);
                const link = this.getResolvedLink(filename);
                if (!link)
                    continue;
                links.push(link);
            }
        }
        else {
            links.push(this.root);
        }
        if (!links.length)
            return json;
        for (const link of links)
            this._toJSON(link, json, isRelative ? link.getPath() : '', asBuffer);
        return json;
    }
    // TODO: `cwd` should probably not invoke `process.cwd()`.
    fromJSON(json, cwd = process_1.default.cwd()) {
        for (let filename in json) {
            const data = json[filename];
            filename = (0, util_2.resolve)(filename, cwd);
            if (typeof data === 'string' || data instanceof buffer_1.Buffer) {
                const dir = dirname(filename);
                this.mkdirp(dir, 511 /* MODE.DIR */);
                const buffer = (0, util_2.dataToBuffer)(data);
                this.writeFile(filename, buffer, constants_2.FLAGS.w, 438 /* MODE.DEFAULT */);
            }
            else {
                this.mkdirp(filename, 511 /* MODE.DIR */);
            }
        }
    }
    fromNestedJSON(json, cwd) {
        this.fromJSON((0, json_1.flattenJSON)(json), cwd);
    }
    reset() {
        this.ino = 0;
        this.inodes = {};
        this.releasedInos = [];
        this.fds = {};
        this.releasedFds = [];
        this.openFiles = 0;
        this.root = this.createLink();
        this.root.setNode(this.createNode(constants_1.constants.S_IFDIR | 0o777));
    }
    // Legacy interface
    mountSync(mountpoint, json) {
        this.fromJSON(json, mountpoint);
    }
    openLink(link, flagsNum, resolveSymlinks = true) {
        if (this.openFiles >= this.maxFiles) {
            // Too many open files.
            throw (0, util_1.createError)("EMFILE" /* ERROR_CODE.EMFILE */, 'open', link.getPath());
        }
        // Resolve symlinks.
        //
        // @TODO: This should be superfluous. This method is only ever called by openFile(), which does its own symlink resolution
        // prior to calling.
        let realLink = link;
        if (resolveSymlinks)
            realLink = this.getResolvedLinkOrThrow(link.getPath(), 'open');
        const node = realLink.getNode();
        // Check whether node is a directory
        if (node.isDirectory()) {
            if ((flagsNum & (O_RDONLY | O_RDWR | O_WRONLY)) !== O_RDONLY)
                throw (0, util_1.createError)("EISDIR" /* ERROR_CODE.EISDIR */, 'open', link.getPath());
        }
        else {
            if (flagsNum & O_DIRECTORY)
                throw (0, util_1.createError)("ENOTDIR" /* ERROR_CODE.ENOTDIR */, 'open', link.getPath());
        }
        // Check node permissions
        if (!(flagsNum & O_WRONLY)) {
            if (!node.canRead()) {
                throw (0, util_1.createError)("EACCES" /* ERROR_CODE.EACCES */, 'open', link.getPath());
            }
        }
        if (!(flagsNum & O_RDONLY)) {
            if (!node.canWrite()) {
                throw (0, util_1.createError)("EACCES" /* ERROR_CODE.EACCES */, 'open', link.getPath());
            }
        }
        const file = new File_1.File(link, node, flagsNum, this.newFdNumber());
        this.fds[file.fd] = file;
        this.openFiles++;
        if (flagsNum & O_TRUNC)
            file.truncate();
        return file;
    }
    openFile(filename, flagsNum, modeNum, resolveSymlinks = true) {
        const steps = (0, util_2.filenameToSteps)(filename);
        let link;
        try {
            link = resolveSymlinks ? this.getResolvedLinkOrThrow(filename, 'open') : this.getLinkOrThrow(filename, 'open');
            // Check if file already existed when trying to create it exclusively (O_CREAT and O_EXCL flags are set).
            // This is an error, see https://pubs.opengroup.org/onlinepubs/009695399/functions/open.html:
            // "If O_CREAT and O_EXCL are set, open() shall fail if the file exists."
            if (link && flagsNum & O_CREAT && flagsNum & O_EXCL)
                throw (0, util_1.createError)("EEXIST" /* ERROR_CODE.EEXIST */, 'open', filename);
        }
        catch (err) {
            // Try creating a new file, if it does not exist and O_CREAT flag is set.
            // Note that this will still throw if the ENOENT came from one of the
            // intermediate directories instead of the file itself.
            if (err.code === "ENOENT" /* ERROR_CODE.ENOENT */ && flagsNum & O_CREAT) {
                const dirname = NodePath.dirname(filename);
                const dirLink = this.getResolvedLinkOrThrow(dirname);
                const dirNode = dirLink.getNode();
                // Check that the place we create the new file is actually a directory and that we are allowed to do so:
                if (!dirNode.isDirectory())
                    throw (0, util_1.createError)("ENOTDIR" /* ERROR_CODE.ENOTDIR */, 'open', filename);
                if (!dirNode.canExecute() || !dirNode.canWrite())
                    throw (0, util_1.createError)("EACCES" /* ERROR_CODE.EACCES */, 'open', filename);
                // This is a difference to the original implementation, which would simply not create a file unless modeNum was specified.
                // However, current Node versions will default to 0o666.
                modeNum !== null && modeNum !== void 0 ? modeNum : (modeNum = 0o666);
                link = this.createLink(dirLink, steps[steps.length - 1], false, modeNum);
            }
            else
                throw err;
        }
        if (link)
            return this.openLink(link, flagsNum, resolveSymlinks);
        throw (0, util_1.createError)("ENOENT" /* ERROR_CODE.ENOENT */, 'open', filename);
    }
    closeFile(file) {
        if (!this.fds[file.fd])
            return;
        this.openFiles--;
        delete this.fds[file.fd];
        this.releasedFds.push(file.fd);
    }
    write(fd, buf, offset, length, position) {
        const file = this.getFileByFdOrThrow(fd, 'write');
        if (file.node.isSymlink()) {
            throw (0, util_1.createError)("EBADF" /* ERROR_CODE.EBADF */, 'write', file.link.getPath());
        }
        return file.write(buf, offset, length, position === -1 || typeof position !== 'number' ? undefined : position);
    }
}
exports.Superblock = Superblock;
/**
 * Global file descriptor counter. UNIX file descriptors start from 0 and go sequentially
 * up, so here, in order not to conflict with them, we choose some big number and descrease
 * the file descriptor of every new opened file.
 * @type {number}
 * @todo This should not be static, right?
 */
Superblock.fd = 0x7fffffff;
//# sourceMappingURL=Superblock.js.map

/***/ }),

/***/ 9980:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Superblock = exports.File = exports.Link = exports.Node = void 0;
const tslib_1 = __webpack_require__(61860);
tslib_1.__exportStar(__webpack_require__(33593), exports);
tslib_1.__exportStar(__webpack_require__(89396), exports);
var Node_1 = __webpack_require__(54762);
Object.defineProperty(exports, "Node", ({ enumerable: true, get: function () { return Node_1.Node; } }));
var Link_1 = __webpack_require__(71582);
Object.defineProperty(exports, "Link", ({ enumerable: true, get: function () { return Link_1.Link; } }));
var File_1 = __webpack_require__(96180);
Object.defineProperty(exports, "File", ({ enumerable: true, get: function () { return File_1.File; } }));
var Superblock_1 = __webpack_require__(28138);
Object.defineProperty(exports, "Superblock", ({ enumerable: true, get: function () { return Superblock_1.Superblock; } }));
//# sourceMappingURL=index.js.map

/***/ }),

/***/ 89396:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.flattenJSON = void 0;
const buffer_1 = __webpack_require__(29626);
const pathModule = __webpack_require__(16928);
const { join } = pathModule.posix ? pathModule.posix : pathModule;
const flattenJSON = (nestedJSON) => {
    const flatJSON = {};
    function flatten(pathPrefix, node) {
        for (const path in node) {
            const contentOrNode = node[path];
            // TODO: Can we avoid using `join` here? Just concatenate?
            const joinedPath = join(pathPrefix, path);
            if (typeof contentOrNode === 'string' || contentOrNode instanceof buffer_1.Buffer) {
                flatJSON[joinedPath] = contentOrNode;
            }
            else if (typeof contentOrNode === 'object' && contentOrNode !== null && Object.keys(contentOrNode).length > 0) {
                // empty directories need an explicit entry and therefore get handled in `else`, non-empty ones are implicitly considered
                flatten(joinedPath, contentOrNode);
            }
            else {
                // without this branch null, empty-object or non-object entries would not be handled in the same way
                // by both fromJSON() and fromNestedJSON()
                flatJSON[joinedPath] = null;
            }
        }
    }
    flatten('', nestedJSON);
    return flatJSON;
};
exports.flattenJSON = flattenJSON;
//# sourceMappingURL=json.js.map

/***/ }),

/***/ 33593:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=types.js.map

/***/ }),

/***/ 82398:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.filenameToSteps = exports.resolve = exports.unixify = exports.isWin = void 0;
exports.isFd = isFd;
exports.validateFd = validateFd;
exports.dataToBuffer = dataToBuffer;
const pathModule = __webpack_require__(16928);
const buffer_1 = __webpack_require__(29626);
const process_1 = __webpack_require__(98371);
const encoding_1 = __webpack_require__(55569);
const constants_1 = __webpack_require__(93598);
exports.isWin = process_1.default.platform === 'win32';
const resolveCrossPlatform = pathModule.resolve;
const { sep } = pathModule.posix ? pathModule.posix : pathModule;
const isSeparator = (str, i) => {
    let char = str[i];
    return i > 0 && (char === '/' || (exports.isWin && char === '\\'));
};
const removeTrailingSeparator = (str) => {
    let i = str.length - 1;
    if (i < 2)
        return str;
    while (isSeparator(str, i))
        i--;
    return str.substr(0, i + 1);
};
const normalizePath = (str, stripTrailing) => {
    if (typeof str !== 'string')
        throw new TypeError('expected a string');
    str = str.replace(/[\\\/]+/g, '/');
    if (stripTrailing !== false)
        str = removeTrailingSeparator(str);
    return str;
};
const unixify = (filepath, stripTrailing = true) => {
    if (exports.isWin) {
        filepath = normalizePath(filepath, stripTrailing);
        return filepath.replace(/^([a-zA-Z]+:|\.\/)/, '');
    }
    return filepath;
};
exports.unixify = unixify;
let resolve = (filename, base = process_1.default.cwd()) => resolveCrossPlatform(base, filename);
exports.resolve = resolve;
if (exports.isWin) {
    const _resolve = resolve;
    exports.resolve = resolve = (filename, base) => (0, exports.unixify)(_resolve(filename, base));
}
const filenameToSteps = (filename, base) => {
    const fullPath = resolve(filename, base);
    const fullPathSansSlash = fullPath.substring(1);
    if (!fullPathSansSlash)
        return [];
    return fullPathSansSlash.split(sep);
};
exports.filenameToSteps = filenameToSteps;
function isFd(path) {
    return path >>> 0 === path;
}
function validateFd(fd) {
    if (!isFd(fd))
        throw TypeError(constants_1.ERRSTR.FD);
}
function dataToBuffer(data, encoding = encoding_1.ENCODING_UTF8) {
    if (buffer_1.Buffer.isBuffer(data))
        return data;
    else if (data instanceof Uint8Array)
        return (0, buffer_1.bufferFrom)(data);
    else
        return (0, buffer_1.bufferFrom)(String(data), encoding);
}
//# sourceMappingURL=util.js.map

/***/ }),

/***/ 55569:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ENCODING_UTF8 = void 0;
exports.assertEncoding = assertEncoding;
exports.strToEncoding = strToEncoding;
const buffer_1 = __webpack_require__(29626);
const errors = __webpack_require__(12303);
exports.ENCODING_UTF8 = 'utf8';
function assertEncoding(encoding) {
    if (encoding && !buffer_1.Buffer.isEncoding(encoding))
        throw new errors.TypeError('ERR_INVALID_OPT_VALUE_ENCODING', encoding);
}
function strToEncoding(str, encoding) {
    if (!encoding || encoding === exports.ENCODING_UTF8)
        return str; // UTF-8
    if (encoding === 'buffer')
        return new buffer_1.Buffer(str); // `buffer` encoding
    return new buffer_1.Buffer(str).toString(encoding); // Custom encoding
}
//# sourceMappingURL=encoding.js.map

/***/ }),

/***/ 35150:
/***/ ((module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.memfs = exports.fs = exports.vol = exports.Volume = void 0;
exports.createFsFromVolume = createFsFromVolume;
const Stats_1 = __webpack_require__(93464);
const Dirent_1 = __webpack_require__(49811);
const volume_1 = __webpack_require__(66797);
Object.defineProperty(exports, "Volume", ({ enumerable: true, get: function () { return volume_1.Volume; } }));
const constants_1 = __webpack_require__(54655);
const fsSynchronousApiList_1 = __webpack_require__(77161);
const fsCallbackApiList_1 = __webpack_require__(48441);
const { F_OK, R_OK, W_OK, X_OK } = constants_1.constants;
// Default volume.
exports.vol = new volume_1.Volume();
function createFsFromVolume(vol) {
    const fs = { F_OK, R_OK, W_OK, X_OK, constants: constants_1.constants, Stats: Stats_1.default, Dirent: Dirent_1.default };
    // Bind FS methods.
    for (const method of fsSynchronousApiList_1.fsSynchronousApiList)
        if (typeof vol[method] === 'function')
            fs[method] = vol[method].bind(vol);
    for (const method of fsCallbackApiList_1.fsCallbackApiList)
        if (typeof vol[method] === 'function')
            fs[method] = vol[method].bind(vol);
    fs.StatWatcher = vol.StatWatcher;
    fs.FSWatcher = vol.FSWatcher;
    fs.WriteStream = vol.WriteStream;
    fs.ReadStream = vol.ReadStream;
    fs.promises = vol.promises;
    // Handle realpath and realpathSync with their .native properties
    if (typeof vol.realpath === 'function') {
        fs.realpath = vol.realpath.bind(vol);
        if (typeof vol.realpath.native === 'function') {
            fs.realpath.native = vol.realpath.native.bind(vol);
        }
    }
    if (typeof vol.realpathSync === 'function') {
        fs.realpathSync = vol.realpathSync.bind(vol);
        if (typeof vol.realpathSync.native === 'function') {
            fs.realpathSync.native = vol.realpathSync.native.bind(vol);
        }
    }
    fs._toUnixTimestamp = volume_1.toUnixTimestamp;
    fs.__vol = vol;
    return fs;
}
exports.fs = createFsFromVolume(exports.vol);
/**
 * Creates a new file system instance.
 *
 * @param json File system structure expressed as a JSON object.
 *        Use `null` for empty directories and empty string for empty files.
 * @param cwd Current working directory. The JSON structure will be created
 *        relative to this path.
 * @returns A `memfs` file system instance, which is a drop-in replacement for
 *          the `fs` module.
 */
const memfs = (json = {}, cwd = '/') => {
    const vol = volume_1.Volume.fromNestedJSON(json, cwd);
    const fs = createFsFromVolume(vol);
    return { fs, vol };
};
exports.memfs = memfs;
module.exports = Object.assign(Object.assign({}, module.exports), exports.fs);
module.exports.semantic = true;
//# sourceMappingURL=index.js.map

/***/ }),

/***/ 29626:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.bufferFrom = exports.bufferAllocUnsafe = exports.Buffer = void 0;
const buffer_1 = __webpack_require__(20181);
Object.defineProperty(exports, "Buffer", ({ enumerable: true, get: function () { return buffer_1.Buffer; } }));
function bufferV0P12Ponyfill(arg0, ...args) {
    return new buffer_1.Buffer(arg0, ...args);
}
const bufferAllocUnsafe = buffer_1.Buffer.allocUnsafe || bufferV0P12Ponyfill;
exports.bufferAllocUnsafe = bufferAllocUnsafe;
const bufferFrom = buffer_1.Buffer.from || bufferV0P12Ponyfill;
exports.bufferFrom = bufferFrom;
//# sourceMappingURL=buffer.js.map

/***/ }),

/***/ 12303:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// The whole point behind this internal module is to allow Node.js to no
// longer be forced to treat every error message change as a semver-major
// change. The NodeError classes here all expose a `code` property whose
// value statically and permanently identifies the error. While the error
// message may change, the code should not.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AssertionError = exports.RangeError = exports.TypeError = exports.Error = void 0;
exports.message = message;
exports.E = E;
const assert = __webpack_require__(42613);
const util = __webpack_require__(39023);
const kCode = typeof Symbol === 'undefined' ? '_kCode' : Symbol('code');
const messages = {}; // new Map();
function makeNodeError(Base) {
    return class NodeError extends Base {
        constructor(key, ...args) {
            super(message(key, args));
            this.code = key;
            this[kCode] = key;
            this.name = `${super.name} [${this[kCode]}]`;
        }
    };
}
const g = typeof globalThis !== 'undefined' ? globalThis : global;
class AssertionError extends g.Error {
    constructor(options) {
        if (typeof options !== 'object' || options === null) {
            throw new exports.TypeError('ERR_INVALID_ARG_TYPE', 'options', 'object');
        }
        if (options.message) {
            super(options.message);
        }
        else {
            super(`${util.inspect(options.actual).slice(0, 128)} ` +
                `${options.operator} ${util.inspect(options.expected).slice(0, 128)}`);
        }
        this.generatedMessage = !options.message;
        this.name = 'AssertionError [ERR_ASSERTION]';
        this.code = 'ERR_ASSERTION';
        this.actual = options.actual;
        this.expected = options.expected;
        this.operator = options.operator;
        exports.Error.captureStackTrace(this, options.stackStartFunction);
    }
}
exports.AssertionError = AssertionError;
function message(key, args) {
    assert.strictEqual(typeof key, 'string');
    // const msg = messages.get(key);
    const msg = messages[key];
    assert(msg, `An invalid error message key was used: ${key}.`);
    let fmt;
    if (typeof msg === 'function') {
        fmt = msg;
    }
    else {
        fmt = util.format;
        if (args === undefined || args.length === 0)
            return msg;
        args.unshift(msg);
    }
    return String(fmt.apply(null, args));
}
// Utility function for registering the error codes. Only used here. Exported
// *only* to allow for testing.
function E(sym, val) {
    messages[sym] = typeof val === 'function' ? val : String(val);
}
exports.Error = makeNodeError(g.Error);
exports.TypeError = makeNodeError(g.TypeError);
exports.RangeError = makeNodeError(g.RangeError);
// To declare an error message, use the E(sym, val) function above. The sym
// must be an upper case string. The val can be either a function or a string.
// The return value of the function must be a string.
// Examples:
// E('EXAMPLE_KEY1', 'This is the error value');
// E('EXAMPLE_KEY2', (a, b) => return `${a} ${b}`);
//
// Once an error code has been assigned, the code itself MUST NOT change and
// any given error code must never be reused to identify a different error.
//
// Any error code added here should also be added to the documentation
//
// Note: Please try to keep these in alphabetical order
E('ERR_ARG_NOT_ITERABLE', '%s must be iterable');
E('ERR_ASSERTION', '%s');
E('ERR_BUFFER_OUT_OF_BOUNDS', bufferOutOfBounds);
E('ERR_CHILD_CLOSED_BEFORE_REPLY', 'Child closed before reply received');
E('ERR_CONSOLE_WRITABLE_STREAM', 'Console expects a writable stream instance for %s');
E('ERR_CPU_USAGE', 'Unable to obtain cpu usage %s');
E('ERR_DNS_SET_SERVERS_FAILED', (err, servers) => `c-ares failed to set servers: "${err}" [${servers}]`);
E('ERR_FALSY_VALUE_REJECTION', 'Promise was rejected with falsy value');
E('ERR_ENCODING_NOT_SUPPORTED', enc => `The "${enc}" encoding is not supported`);
E('ERR_ENCODING_INVALID_ENCODED_DATA', enc => `The encoded data was not valid for encoding ${enc}`);
E('ERR_HTTP_HEADERS_SENT', 'Cannot render headers after they are sent to the client');
E('ERR_HTTP_INVALID_STATUS_CODE', 'Invalid status code: %s');
E('ERR_HTTP_TRAILER_INVALID', 'Trailers are invalid with this transfer encoding');
E('ERR_INDEX_OUT_OF_RANGE', 'Index out of range');
E('ERR_INVALID_ARG_TYPE', invalidArgType);
E('ERR_INVALID_ARRAY_LENGTH', (name, len, actual) => {
    assert.strictEqual(typeof actual, 'number');
    return `The array "${name}" (length ${actual}) must be of length ${len}.`;
});
E('ERR_INVALID_BUFFER_SIZE', 'Buffer size must be a multiple of %s');
E('ERR_INVALID_CALLBACK', 'Callback must be a function');
E('ERR_INVALID_CHAR', 'Invalid character in %s');
E('ERR_INVALID_CURSOR_POS', 'Cannot set cursor row without setting its column');
E('ERR_INVALID_FD', '"fd" must be a positive integer: %s');
E('ERR_INVALID_FILE_URL_HOST', 'File URL host must be "localhost" or empty on %s');
E('ERR_INVALID_FILE_URL_PATH', 'File URL path %s');
E('ERR_INVALID_HANDLE_TYPE', 'This handle type cannot be sent');
E('ERR_INVALID_IP_ADDRESS', 'Invalid IP address: %s');
E('ERR_INVALID_OPT_VALUE', (name, value) => {
    return `The value "${String(value)}" is invalid for option "${name}"`;
});
E('ERR_INVALID_OPT_VALUE_ENCODING', value => `The value "${String(value)}" is invalid for option "encoding"`);
E('ERR_INVALID_REPL_EVAL_CONFIG', 'Cannot specify both "breakEvalOnSigint" and "eval" for REPL');
E('ERR_INVALID_SYNC_FORK_INPUT', 'Asynchronous forks do not support Buffer, Uint8Array or string input: %s');
E('ERR_INVALID_THIS', 'Value of "this" must be of type %s');
E('ERR_INVALID_TUPLE', '%s must be an iterable %s tuple');
E('ERR_INVALID_URL', 'Invalid URL: %s');
E('ERR_INVALID_URL_SCHEME', expected => `The URL must be ${oneOf(expected, 'scheme')}`);
E('ERR_IPC_CHANNEL_CLOSED', 'Channel closed');
E('ERR_IPC_DISCONNECTED', 'IPC channel is already disconnected');
E('ERR_IPC_ONE_PIPE', 'Child process can have only one IPC pipe');
E('ERR_IPC_SYNC_FORK', 'IPC cannot be used with synchronous forks');
E('ERR_MISSING_ARGS', missingArgs);
E('ERR_MULTIPLE_CALLBACK', 'Callback called multiple times');
E('ERR_NAPI_CONS_FUNCTION', 'Constructor must be a function');
E('ERR_NAPI_CONS_PROTOTYPE_OBJECT', 'Constructor.prototype must be an object');
E('ERR_NO_CRYPTO', 'Node.js is not compiled with OpenSSL crypto support');
E('ERR_NO_LONGER_SUPPORTED', '%s is no longer supported');
E('ERR_PARSE_HISTORY_DATA', 'Could not parse history data in %s');
E('ERR_SOCKET_ALREADY_BOUND', 'Socket is already bound');
E('ERR_SOCKET_BAD_PORT', 'Port should be > 0 and < 65536');
E('ERR_SOCKET_BAD_TYPE', 'Bad socket type specified. Valid types are: udp4, udp6');
E('ERR_SOCKET_CANNOT_SEND', 'Unable to send data');
E('ERR_SOCKET_CLOSED', 'Socket is closed');
E('ERR_SOCKET_DGRAM_NOT_RUNNING', 'Not running');
E('ERR_STDERR_CLOSE', 'process.stderr cannot be closed');
E('ERR_STDOUT_CLOSE', 'process.stdout cannot be closed');
E('ERR_STREAM_WRAP', 'Stream has StringDecoder set or is in objectMode');
E('ERR_TLS_CERT_ALTNAME_INVALID', "Hostname/IP does not match certificate's altnames: %s");
E('ERR_TLS_DH_PARAM_SIZE', size => `DH parameter size ${size} is less than 2048`);
E('ERR_TLS_HANDSHAKE_TIMEOUT', 'TLS handshake timeout');
E('ERR_TLS_RENEGOTIATION_FAILED', 'Failed to renegotiate');
E('ERR_TLS_REQUIRED_SERVER_NAME', '"servername" is required parameter for Server.addContext');
E('ERR_TLS_SESSION_ATTACK', 'TSL session renegotiation attack detected');
E('ERR_TRANSFORM_ALREADY_TRANSFORMING', 'Calling transform done when still transforming');
E('ERR_TRANSFORM_WITH_LENGTH_0', 'Calling transform done when writableState.length != 0');
E('ERR_UNKNOWN_ENCODING', 'Unknown encoding: %s');
E('ERR_UNKNOWN_SIGNAL', 'Unknown signal: %s');
E('ERR_UNKNOWN_STDIN_TYPE', 'Unknown stdin file type');
E('ERR_UNKNOWN_STREAM_TYPE', 'Unknown stream file type');
E('ERR_V8BREAKITERATOR', 'Full ICU data not installed. ' + 'See https://github.com/nodejs/node/wiki/Intl');
// Dir-related errors
E('ERR_DIR_CLOSED', 'Directory handle was closed');
E('ERR_DIR_CONCURRENT_OPERATION', 'Cannot do synchronous work on directory handle with concurrent asynchronous operations');
function invalidArgType(name, expected, actual) {
    assert(name, 'name is required');
    // determiner: 'must be' or 'must not be'
    let determiner;
    if (expected.includes('not ')) {
        determiner = 'must not be';
        expected = expected.split('not ')[1];
    }
    else {
        determiner = 'must be';
    }
    let msg;
    if (Array.isArray(name)) {
        const names = name.map(val => `"${val}"`).join(', ');
        msg = `The ${names} arguments ${determiner} ${oneOf(expected, 'type')}`;
    }
    else if (name.includes(' argument')) {
        // for the case like 'first argument'
        msg = `The ${name} ${determiner} ${oneOf(expected, 'type')}`;
    }
    else {
        const type = name.includes('.') ? 'property' : 'argument';
        msg = `The "${name}" ${type} ${determiner} ${oneOf(expected, 'type')}`;
    }
    // if actual value received, output it
    if (arguments.length >= 3) {
        msg += `. Received type ${actual !== null ? typeof actual : 'null'}`;
    }
    return msg;
}
function missingArgs(...args) {
    assert(args.length > 0, 'At least one arg needs to be specified');
    let msg = 'The ';
    const len = args.length;
    args = args.map(a => `"${a}"`);
    switch (len) {
        case 1:
            msg += `${args[0]} argument`;
            break;
        case 2:
            msg += `${args[0]} and ${args[1]} arguments`;
            break;
        default:
            msg += args.slice(0, len - 1).join(', ');
            msg += `, and ${args[len - 1]} arguments`;
            break;
    }
    return `${msg} must be specified`;
}
function oneOf(expected, thing) {
    assert(expected, 'expected is required');
    assert(typeof thing === 'string', 'thing is required');
    if (Array.isArray(expected)) {
        const len = expected.length;
        assert(len > 0, 'At least one expected value needs to be specified');
        // tslint:disable-next-line
        expected = expected.map(i => String(i));
        if (len > 2) {
            return `one of ${thing} ${expected.slice(0, len - 1).join(', ')}, or ` + expected[len - 1];
        }
        else if (len === 2) {
            return `one of ${thing} ${expected[0]} or ${expected[1]}`;
        }
        else {
            return `of ${thing} ${expected[0]}`;
        }
    }
    else {
        return `of ${thing} ${String(expected)}`;
    }
}
function bufferOutOfBounds(name, isWriting) {
    if (isWriting) {
        return 'Attempt to write outside buffer bounds';
    }
    else {
        return `"${name}" is outside of buffer bounds`;
    }
}
//# sourceMappingURL=errors.js.map

/***/ }),

/***/ 86462:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.newNotAllowedError = exports.newTypeMismatchError = exports.newNotFoundError = exports.assertCanWrite = exports.assertName = exports.basename = exports.ctx = void 0;
/**
 * Creates a new {@link NodeFsaContext}.
 */
const ctx = (partial = {}) => {
    return Object.assign({ separator: '/', syncHandleAllowed: false, mode: 'read' }, partial);
};
exports.ctx = ctx;
const basename = (path, separator) => {
    if (path[path.length - 1] === separator)
        path = path.slice(0, -1);
    const lastSlashIndex = path.lastIndexOf(separator);
    return lastSlashIndex === -1 ? path : path.slice(lastSlashIndex + 1);
};
exports.basename = basename;
const nameRegex = /^(\.{1,2})$|^(.*([\/\\]).*)$/;
const assertName = (name, method, klass) => {
    const isInvalid = !name || nameRegex.test(name);
    if (isInvalid)
        throw new TypeError(`Failed to execute '${method}' on '${klass}': Name is not allowed.`);
};
exports.assertName = assertName;
const assertCanWrite = (mode) => {
    if (mode !== 'readwrite')
        throw new DOMException('The request is not allowed by the user agent or the platform in the current context.', 'NotAllowedError');
};
exports.assertCanWrite = assertCanWrite;
const newNotFoundError = () => new DOMException('A requested file or directory could not be found at the time an operation was processed.', 'NotFoundError');
exports.newNotFoundError = newNotFoundError;
const newTypeMismatchError = () => new DOMException('The path supplied exists, but was not an entry of requested type.', 'TypeMismatchError');
exports.newTypeMismatchError = newTypeMismatchError;
const newNotAllowedError = () => new DOMException('Permission not granted.', 'NotAllowedError');
exports.newNotAllowedError = newNotAllowedError;
//# sourceMappingURL=util.js.map

/***/ }),

/***/ 7900:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Dir = void 0;
const util_1 = __webpack_require__(74467);
const Dirent_1 = __webpack_require__(49811);
const errors = __webpack_require__(12303);
/**
 * A directory stream, like `fs.Dir`.
 */
class Dir {
    constructor(link, options) {
        this.link = link;
        this.options = options;
        this.iteratorInfo = [];
        this.closed = false;
        this.operationQueue = null;
        this.path = link.getPath();
        this.iteratorInfo.push(link.children[Symbol.iterator]());
    }
    closeBase() {
        // In a real filesystem implementation, this would close file descriptors
        // For memfs, we just need to mark as closed
    }
    readBase(iteratorInfo) {
        let done;
        let value;
        let name;
        let link;
        do {
            do {
                ({ done, value } = iteratorInfo[iteratorInfo.length - 1].next());
                if (!done) {
                    [name, link] = value;
                }
                else {
                    break;
                }
            } while (name === '.' || name === '..');
            if (done) {
                iteratorInfo.pop();
                if (iteratorInfo.length === 0) {
                    break;
                }
                else {
                    done = false;
                }
            }
            else {
                if (this.options.recursive && link.children.size) {
                    iteratorInfo.push(link.children[Symbol.iterator]());
                }
                return Dirent_1.default.build(link, this.options.encoding);
            }
        } while (!done);
        return null;
    }
    close(callback) {
        // Promise-based close
        if (callback === undefined) {
            if (this.closed) {
                return Promise.reject(new errors.Error('ERR_DIR_CLOSED'));
            }
            return new Promise((resolve, reject) => {
                this.close(err => {
                    if (err)
                        reject(err);
                    else
                        resolve();
                });
            });
        }
        // Callback-based close
        (0, util_1.validateCallback)(callback);
        if (this.closed) {
            process.nextTick(callback, new errors.Error('ERR_DIR_CLOSED'));
            return;
        }
        if (this.operationQueue !== null) {
            this.operationQueue.push(() => {
                this.close(callback);
            });
            return;
        }
        this.closed = true;
        try {
            this.closeBase();
            process.nextTick(callback);
        }
        catch (err) {
            process.nextTick(callback, err);
        }
    }
    closeSync() {
        if (this.closed) {
            throw new errors.Error('ERR_DIR_CLOSED');
        }
        if (this.operationQueue !== null) {
            throw new errors.Error('ERR_DIR_CONCURRENT_OPERATION');
        }
        this.closed = true;
        this.closeBase();
    }
    read(callback) {
        // Promise-based read
        if (callback === undefined) {
            return new Promise((resolve, reject) => {
                this.read((err, result) => {
                    if (err)
                        reject(err);
                    else
                        resolve(result !== null && result !== void 0 ? result : null);
                });
            });
        }
        // Callback-based read
        (0, util_1.validateCallback)(callback);
        if (this.closed) {
            process.nextTick(callback, new errors.Error('ERR_DIR_CLOSED'));
            return;
        }
        if (this.operationQueue !== null) {
            this.operationQueue.push(() => {
                this.read(callback);
            });
            return;
        }
        this.operationQueue = [];
        try {
            const result = this.readBase(this.iteratorInfo);
            process.nextTick(() => {
                const queue = this.operationQueue;
                this.operationQueue = null;
                for (const op of queue)
                    op();
                callback(null, result);
            });
        }
        catch (err) {
            process.nextTick(() => {
                const queue = this.operationQueue;
                this.operationQueue = null;
                for (const op of queue)
                    op();
                callback(err);
            });
        }
    }
    readSync() {
        if (this.closed) {
            throw new errors.Error('ERR_DIR_CLOSED');
        }
        if (this.operationQueue !== null) {
            throw new errors.Error('ERR_DIR_CONCURRENT_OPERATION');
        }
        return this.readBase(this.iteratorInfo);
    }
    [Symbol.asyncIterator]() {
        return {
            next: async () => {
                try {
                    const dirEnt = await this.read();
                    if (dirEnt !== null) {
                        return { done: false, value: dirEnt };
                    }
                    else {
                        return { done: true, value: undefined };
                    }
                }
                catch (err) {
                    throw err;
                }
            },
            [Symbol.asyncIterator]() {
                return this;
            },
        };
    }
}
exports.Dir = Dir;
//# sourceMappingURL=Dir.js.map

/***/ }),

/***/ 49811:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Dirent = void 0;
const constants_1 = __webpack_require__(54655);
const encoding_1 = __webpack_require__(55569);
const { S_IFMT, S_IFDIR, S_IFREG, S_IFBLK, S_IFCHR, S_IFLNK, S_IFIFO, S_IFSOCK } = constants_1.constants;
/**
 * A directory entry, like `fs.Dirent`.
 */
class Dirent {
    constructor() {
        this.name = '';
        this.path = '';
        this.parentPath = '';
        this.mode = 0;
    }
    static build(link, encoding) {
        const dirent = new Dirent();
        const { mode } = link.getNode();
        dirent.name = (0, encoding_1.strToEncoding)(link.getName(), encoding);
        dirent.mode = mode;
        dirent.path = link.getParentPath();
        dirent.parentPath = dirent.path;
        return dirent;
    }
    _checkModeProperty(property) {
        return (this.mode & S_IFMT) === property;
    }
    isDirectory() {
        return this._checkModeProperty(S_IFDIR);
    }
    isFile() {
        return this._checkModeProperty(S_IFREG);
    }
    isBlockDevice() {
        return this._checkModeProperty(S_IFBLK);
    }
    isCharacterDevice() {
        return this._checkModeProperty(S_IFCHR);
    }
    isSymbolicLink() {
        return this._checkModeProperty(S_IFLNK);
    }
    isFIFO() {
        return this._checkModeProperty(S_IFIFO);
    }
    isSocket() {
        return this._checkModeProperty(S_IFSOCK);
    }
}
exports.Dirent = Dirent;
exports["default"] = Dirent;
//# sourceMappingURL=Dirent.js.map

/***/ }),

/***/ 75039:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.FileHandle = void 0;
const util_1 = __webpack_require__(74467);
const events_1 = __webpack_require__(24434);
class FileHandle extends events_1.EventEmitter {
    constructor(fs, fd) {
        super();
        this.refs = 1;
        this.closePromise = null;
        this.position = 0;
        this.readableWebStreamLocked = false;
        this.fs = fs;
        this.fd = fd;
    }
    getAsyncId() {
        // Return a unique async ID for this file handle
        // In a real implementation, this would be provided by the underlying system
        return this.fd;
    }
    appendFile(data, options) {
        return (0, util_1.promisify)(this.fs, 'appendFile')(this.fd, data, options);
    }
    chmod(mode) {
        return (0, util_1.promisify)(this.fs, 'fchmod')(this.fd, mode);
    }
    chown(uid, gid) {
        return (0, util_1.promisify)(this.fs, 'fchown')(this.fd, uid, gid);
    }
    close() {
        if (this.fd === -1) {
            return Promise.resolve();
        }
        if (this.closePromise) {
            return this.closePromise;
        }
        this.refs--;
        if (this.refs === 0) {
            const currentFd = this.fd;
            this.fd = -1;
            this.closePromise = (0, util_1.promisify)(this.fs, 'close')(currentFd).finally(() => {
                this.closePromise = null;
            });
        }
        else {
            this.closePromise = new Promise((resolve, reject) => {
                this.closeResolve = resolve;
                this.closeReject = reject;
            }).finally(() => {
                this.closePromise = null;
                this.closeReject = undefined;
                this.closeResolve = undefined;
            });
        }
        this.emit('close');
        return this.closePromise;
    }
    datasync() {
        return (0, util_1.promisify)(this.fs, 'fdatasync')(this.fd);
    }
    createReadStream(options) {
        return this.fs.createReadStream('', Object.assign(Object.assign({}, options), { fd: this }));
    }
    createWriteStream(options) {
        return this.fs.createWriteStream('', Object.assign(Object.assign({}, options), { fd: this }));
    }
    readableWebStream(options = {}) {
        const { type = 'bytes', autoClose = false } = options;
        let position = 0;
        if (this.fd === -1) {
            throw new Error('The FileHandle is closed');
        }
        if (this.closePromise) {
            throw new Error('The FileHandle is closing');
        }
        if (this.readableWebStreamLocked) {
            throw new Error('An error will be thrown if this method is called more than once or is called after the FileHandle is closed or closing.');
        }
        this.readableWebStreamLocked = true;
        this.ref();
        const unlockAndCleanup = () => {
            this.readableWebStreamLocked = false;
            this.unref();
            if (autoClose) {
                this.close().catch(() => {
                    // Ignore close errors in cleanup
                });
            }
        };
        return new ReadableStream({
            type: type === 'bytes' ? 'bytes' : undefined,
            autoAllocateChunkSize: 16384,
            pull: async (controller) => {
                var _a;
                try {
                    const view = (_a = controller.byobRequest) === null || _a === void 0 ? void 0 : _a.view;
                    if (!view) {
                        // Fallback for when BYOB is not available
                        const buffer = new Uint8Array(16384);
                        const result = await this.read(buffer, 0, buffer.length, position);
                        if (result.bytesRead === 0) {
                            controller.close();
                            unlockAndCleanup();
                            return;
                        }
                        position += result.bytesRead;
                        controller.enqueue(buffer.slice(0, result.bytesRead));
                        return;
                    }
                    const result = await this.read(view, view.byteOffset, view.byteLength, position);
                    if (result.bytesRead === 0) {
                        controller.close();
                        unlockAndCleanup();
                        return;
                    }
                    position += result.bytesRead;
                    controller.byobRequest.respond(result.bytesRead);
                }
                catch (error) {
                    controller.error(error);
                    unlockAndCleanup();
                }
            },
            cancel: async () => {
                unlockAndCleanup();
            },
        });
    }
    async read(buffer, offset, length, position) {
        const readPosition = position !== null && position !== undefined ? position : this.position;
        const result = await (0, util_1.promisify)(this.fs, 'read', bytesRead => ({ bytesRead, buffer }))(this.fd, buffer, offset, length, readPosition);
        // Update internal position only if position was null/undefined
        if (position === null || position === undefined) {
            this.position += result.bytesRead;
        }
        return result;
    }
    readv(buffers, position) {
        return (0, util_1.promisify)(this.fs, 'readv', bytesRead => ({ bytesRead, buffers }))(this.fd, buffers, position);
    }
    readFile(options) {
        return (0, util_1.promisify)(this.fs, 'readFile')(this.fd, options);
    }
    stat(options) {
        return (0, util_1.promisify)(this.fs, 'fstat')(this.fd, options);
    }
    sync() {
        return (0, util_1.promisify)(this.fs, 'fsync')(this.fd);
    }
    truncate(len) {
        return (0, util_1.promisify)(this.fs, 'ftruncate')(this.fd, len);
    }
    utimes(atime, mtime) {
        return (0, util_1.promisify)(this.fs, 'futimes')(this.fd, atime, mtime);
    }
    async write(buffer, offset, length, position) {
        const useInternalPosition = typeof position !== 'number';
        const writePosition = useInternalPosition ? this.position : position;
        const result = await (0, util_1.promisify)(this.fs, 'write', bytesWritten => ({ bytesWritten, buffer }))(this.fd, buffer, offset, length, writePosition);
        // Update internal position only if position was null/undefined
        if (useInternalPosition) {
            this.position += result.bytesWritten;
        }
        return result;
    }
    writev(buffers, position) {
        return (0, util_1.promisify)(this.fs, 'writev', bytesWritten => ({ bytesWritten, buffers }))(this.fd, buffers, position);
    }
    writeFile(data, options) {
        return (0, util_1.promisify)(this.fs, 'writeFile')(this.fd, data, options);
    }
    // Implement Symbol.asyncDispose if available (ES2023+)
    async [Symbol.asyncDispose]() {
        await this.close();
    }
    ref() {
        this.refs++;
    }
    unref() {
        this.refs--;
        if (this.refs === 0) {
            this.fd = -1;
            if (this.closeResolve) {
                (0, util_1.promisify)(this.fs, 'close')(this.fd).then(this.closeResolve, this.closeReject);
            }
        }
    }
}
exports.FileHandle = FileHandle;
//# sourceMappingURL=FileHandle.js.map

/***/ }),

/***/ 47994:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.FsPromises = void 0;
const util_1 = __webpack_require__(74467);
const constants_1 = __webpack_require__(54655);
// AsyncIterator implementation for promises.watch
class FSWatchAsyncIterator {
    constructor(fs, path, options = {}) {
        this.fs = fs;
        this.path = path;
        this.options = options;
        this.eventQueue = [];
        this.resolveQueue = [];
        this.finished = false;
        this.maxQueue = options.maxQueue || 2048;
        this.overflow = options.overflow || 'ignore';
        this.startWatching();
        // Handle AbortSignal
        if (options.signal) {
            if (options.signal.aborted) {
                this.finish();
                return;
            }
            options.signal.addEventListener('abort', () => {
                this.finish();
            });
        }
    }
    startWatching() {
        try {
            this.watcher = this.fs.watch(this.path, this.options, (eventType, filename) => {
                this.enqueueEvent({ eventType, filename });
            });
        }
        catch (error) {
            // If we can't start watching, finish immediately
            this.finish();
            throw error;
        }
    }
    enqueueEvent(event) {
        if (this.finished)
            return;
        // Handle queue overflow
        if (this.eventQueue.length >= this.maxQueue) {
            if (this.overflow === 'throw') {
                const error = new Error(`Watch queue overflow: more than ${this.maxQueue} events queued`);
                this.finish(error);
                return;
            }
            else {
                // 'ignore' - drop the oldest event
                this.eventQueue.shift();
                console.warn(`Watch queue overflow: dropping event due to exceeding maxQueue of ${this.maxQueue}`);
            }
        }
        this.eventQueue.push(event);
        // If there's a waiting promise, resolve it
        if (this.resolveQueue.length > 0) {
            const { resolve } = this.resolveQueue.shift();
            const nextEvent = this.eventQueue.shift();
            resolve({ value: nextEvent, done: false });
        }
    }
    finish(error) {
        if (this.finished)
            return;
        this.finished = true;
        if (this.watcher) {
            this.watcher.close();
            this.watcher = null;
        }
        // Resolve or reject all pending promises
        while (this.resolveQueue.length > 0) {
            const { resolve, reject } = this.resolveQueue.shift();
            if (error) {
                reject(error);
            }
            else {
                resolve({ value: undefined, done: true });
            }
        }
    }
    async next() {
        if (this.finished) {
            return { value: undefined, done: true };
        }
        // If we have queued events, return one
        if (this.eventQueue.length > 0) {
            const event = this.eventQueue.shift();
            return { value: event, done: false };
        }
        // Otherwise, wait for the next event
        return new Promise((resolve, reject) => {
            this.resolveQueue.push({ resolve, reject });
        });
    }
    async return() {
        this.finish();
        return { value: undefined, done: true };
    }
    async throw(error) {
        this.finish(error);
        throw error;
    }
    [Symbol.asyncIterator]() {
        return this;
    }
}
class FsPromises {
    constructor(fs, FileHandle) {
        this.fs = fs;
        this.FileHandle = FileHandle;
        this.constants = constants_1.constants;
        this.cp = (0, util_1.promisify)(this.fs, 'cp');
        this.opendir = (0, util_1.promisify)(this.fs, 'opendir');
        this.statfs = (0, util_1.promisify)(this.fs, 'statfs');
        this.lutimes = (0, util_1.promisify)(this.fs, 'lutimes');
        this.glob = (0, util_1.promisify)(this.fs, 'glob');
        this.access = (0, util_1.promisify)(this.fs, 'access');
        this.chmod = (0, util_1.promisify)(this.fs, 'chmod');
        this.chown = (0, util_1.promisify)(this.fs, 'chown');
        this.copyFile = (0, util_1.promisify)(this.fs, 'copyFile');
        this.lchmod = (0, util_1.promisify)(this.fs, 'lchmod');
        this.lchown = (0, util_1.promisify)(this.fs, 'lchown');
        this.link = (0, util_1.promisify)(this.fs, 'link');
        this.lstat = (0, util_1.promisify)(this.fs, 'lstat');
        this.mkdir = (0, util_1.promisify)(this.fs, 'mkdir');
        this.mkdtemp = (0, util_1.promisify)(this.fs, 'mkdtemp');
        this.readdir = (0, util_1.promisify)(this.fs, 'readdir');
        this.readlink = (0, util_1.promisify)(this.fs, 'readlink');
        this.realpath = (0, util_1.promisify)(this.fs, 'realpath');
        this.rename = (0, util_1.promisify)(this.fs, 'rename');
        this.rmdir = (0, util_1.promisify)(this.fs, 'rmdir');
        this.rm = (0, util_1.promisify)(this.fs, 'rm');
        this.stat = (0, util_1.promisify)(this.fs, 'stat');
        this.symlink = (0, util_1.promisify)(this.fs, 'symlink');
        this.truncate = (0, util_1.promisify)(this.fs, 'truncate');
        this.unlink = (0, util_1.promisify)(this.fs, 'unlink');
        this.utimes = (0, util_1.promisify)(this.fs, 'utimes');
        this.readFile = (id, options) => {
            return (0, util_1.promisify)(this.fs, 'readFile')(id instanceof this.FileHandle ? id.fd : id, options);
        };
        this.appendFile = (path, data, options) => {
            return (0, util_1.promisify)(this.fs, 'appendFile')(path instanceof this.FileHandle ? path.fd : path, data, options);
        };
        this.open = (path, flags = 'r', mode) => {
            return (0, util_1.promisify)(this.fs, 'open', fd => new this.FileHandle(this.fs, fd))(path, flags, mode);
        };
        this.writeFile = (id, data, options) => {
            const dataPromise = (0, util_1.isReadableStream)(data) ? (0, util_1.streamToBuffer)(data) : Promise.resolve(data);
            return dataPromise.then(data => (0, util_1.promisify)(this.fs, 'writeFile')(id instanceof this.FileHandle ? id.fd : id, data, options));
        };
        this.watch = (filename, options) => {
            const watchOptions = typeof options === 'string' ? { encoding: options } : options || {};
            return new FSWatchAsyncIterator(this.fs, filename, watchOptions);
        };
    }
}
exports.FsPromises = FsPromises;
//# sourceMappingURL=FsPromises.js.map

/***/ }),

/***/ 89102:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.StatFs = void 0;
/**
 * Statistics about a file system, like `fs.StatFs`.
 */
class StatFs {
    static build(superblock, bigint = false) {
        const statfs = new StatFs();
        const getStatNumber = !bigint ? number => number : number => BigInt(number);
        // For in-memory filesystem, provide mock but reasonable values
        // Magic number for in-memory filesystem type (similar to ramfs)
        statfs.type = getStatNumber(0x858458f6);
        // Optimal transfer block size - commonly 4096 bytes
        statfs.bsize = getStatNumber(4096);
        // Calculate filesystem stats based on current state
        const totalInodes = Object.keys(superblock.inodes).length;
        // Mock large filesystem capacity (appears as a large filesystem to applications)
        const totalBlocks = 1000000;
        const usedBlocks = Math.min(totalInodes * 2, totalBlocks); // Rough estimation
        const freeBlocks = totalBlocks - usedBlocks;
        statfs.blocks = getStatNumber(totalBlocks); // Total data blocks
        statfs.bfree = getStatNumber(freeBlocks); // Free blocks in file system
        statfs.bavail = getStatNumber(freeBlocks); // Free blocks available to unprivileged users
        // File node statistics
        const maxFiles = 1000000; // Mock large number of available inodes
        statfs.files = getStatNumber(maxFiles); // Total file nodes in file system
        statfs.ffree = getStatNumber(maxFiles - totalInodes); // Free file nodes
        return statfs;
    }
}
exports.StatFs = StatFs;
exports["default"] = StatFs;
//# sourceMappingURL=StatFs.js.map

/***/ }),

/***/ 93464:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Stats = void 0;
const constants_1 = __webpack_require__(54655);
const { S_IFMT, S_IFDIR, S_IFREG, S_IFBLK, S_IFCHR, S_IFLNK, S_IFIFO, S_IFSOCK } = constants_1.constants;
/**
 * Statistics about a file/directory, like `fs.Stats`.
 */
class Stats {
    static build(node, bigint = false) {
        const stats = new Stats();
        const { uid, gid, atime, mtime, ctime } = node;
        const getStatNumber = !bigint ? number => number : number => BigInt(number);
        // Copy all values on Stats from Node, so that if Node values
        // change, values on Stats would still be the old ones,
        // just like in Node fs.
        stats.uid = getStatNumber(uid);
        stats.gid = getStatNumber(gid);
        stats.rdev = getStatNumber(node.rdev);
        stats.blksize = getStatNumber(4096);
        stats.ino = getStatNumber(node.ino);
        stats.size = getStatNumber(node.getSize());
        stats.blocks = getStatNumber(1);
        stats.atime = atime;
        stats.mtime = mtime;
        stats.ctime = ctime;
        stats.birthtime = ctime;
        stats.atimeMs = getStatNumber(atime.getTime());
        stats.mtimeMs = getStatNumber(mtime.getTime());
        const ctimeMs = getStatNumber(ctime.getTime());
        stats.ctimeMs = ctimeMs;
        stats.birthtimeMs = ctimeMs;
        if (bigint) {
            stats.atimeNs = BigInt(atime.getTime()) * BigInt(1000000);
            stats.mtimeNs = BigInt(mtime.getTime()) * BigInt(1000000);
            const ctimeNs = BigInt(ctime.getTime()) * BigInt(1000000);
            stats.ctimeNs = ctimeNs;
            stats.birthtimeNs = ctimeNs;
        }
        stats.dev = getStatNumber(0);
        stats.mode = getStatNumber(node.mode);
        stats.nlink = getStatNumber(node.nlink);
        return stats;
    }
    _checkModeProperty(property) {
        return (Number(this.mode) & S_IFMT) === property;
    }
    isDirectory() {
        return this._checkModeProperty(S_IFDIR);
    }
    isFile() {
        return this._checkModeProperty(S_IFREG);
    }
    isBlockDevice() {
        return this._checkModeProperty(S_IFBLK);
    }
    isCharacterDevice() {
        return this._checkModeProperty(S_IFCHR);
    }
    isSymbolicLink() {
        return this._checkModeProperty(S_IFLNK);
    }
    isFIFO() {
        return this._checkModeProperty(S_IFIFO);
    }
    isSocket() {
        return this._checkModeProperty(S_IFSOCK);
    }
}
exports.Stats = Stats;
exports["default"] = Stats;
//# sourceMappingURL=Stats.js.map

/***/ }),

/***/ 93598:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.FLAGS = exports.ERRSTR = void 0;
const constants_1 = __webpack_require__(54655);
exports.ERRSTR = {
    PATH_STR: 'path must be a string, Buffer, or Uint8Array',
    // FD:             'file descriptor must be a unsigned 32-bit integer',
    FD: 'fd must be a file descriptor',
    MODE_INT: 'mode must be an int',
    CB: 'callback must be a function',
    UID: 'uid must be an unsigned int',
    GID: 'gid must be an unsigned int',
    LEN: 'len must be an integer',
    ATIME: 'atime must be an integer',
    MTIME: 'mtime must be an integer',
    PREFIX: 'filename prefix is required',
    BUFFER: 'buffer must be an instance of Buffer or StaticBuffer',
    OFFSET: 'offset must be an integer',
    LENGTH: 'length must be an integer',
    POSITION: 'position must be an integer',
};
const { O_RDONLY, O_WRONLY, O_RDWR, O_CREAT, O_EXCL, O_TRUNC, O_APPEND, O_SYNC } = constants_1.constants;
// List of file `flags` as defined by Node.
var FLAGS;
(function (FLAGS) {
    // Open file for reading. An exception occurs if the file does not exist.
    FLAGS[FLAGS["r"] = O_RDONLY] = "r";
    // Open file for reading and writing. An exception occurs if the file does not exist.
    FLAGS[FLAGS["r+"] = O_RDWR] = "r+";
    // Open file for reading in synchronous mode. Instructs the operating system to bypass the local file system cache.
    FLAGS[FLAGS["rs"] = O_RDONLY | O_SYNC] = "rs";
    FLAGS[FLAGS["sr"] = FLAGS.rs] = "sr";
    // Open file for reading and writing, telling the OS to open it synchronously. See notes for 'rs' about using this with caution.
    FLAGS[FLAGS["rs+"] = O_RDWR | O_SYNC] = "rs+";
    FLAGS[FLAGS["sr+"] = FLAGS['rs+']] = "sr+";
    // Open file for writing. The file is created (if it does not exist) or truncated (if it exists).
    FLAGS[FLAGS["w"] = O_WRONLY | O_CREAT | O_TRUNC] = "w";
    // Like 'w' but fails if path exists.
    FLAGS[FLAGS["wx"] = O_WRONLY | O_CREAT | O_TRUNC | O_EXCL] = "wx";
    FLAGS[FLAGS["xw"] = FLAGS.wx] = "xw";
    // Open file for reading and writing. The file is created (if it does not exist) or truncated (if it exists).
    FLAGS[FLAGS["w+"] = O_RDWR | O_CREAT | O_TRUNC] = "w+";
    // Like 'w+' but fails if path exists.
    FLAGS[FLAGS["wx+"] = O_RDWR | O_CREAT | O_TRUNC | O_EXCL] = "wx+";
    FLAGS[FLAGS["xw+"] = FLAGS['wx+']] = "xw+";
    // Open file for appending. The file is created if it does not exist.
    FLAGS[FLAGS["a"] = O_WRONLY | O_APPEND | O_CREAT] = "a";
    // Like 'a' but fails if path exists.
    FLAGS[FLAGS["ax"] = O_WRONLY | O_APPEND | O_CREAT | O_EXCL] = "ax";
    FLAGS[FLAGS["xa"] = FLAGS.ax] = "xa";
    // Open file for reading and appending. The file is created if it does not exist.
    FLAGS[FLAGS["a+"] = O_RDWR | O_APPEND | O_CREAT] = "a+";
    // Like 'a+' but fails if path exists.
    FLAGS[FLAGS["ax+"] = O_RDWR | O_APPEND | O_CREAT | O_EXCL] = "ax+";
    FLAGS[FLAGS["xa+"] = FLAGS['ax+']] = "xa+";
})(FLAGS || (exports.FLAGS = FLAGS = {}));
//# sourceMappingURL=constants.js.map

/***/ }),

/***/ 98077:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.globSync = globSync;
const pathModule = __webpack_require__(16928);
const glob_to_regex_js_1 = __webpack_require__(52107);
const util_1 = __webpack_require__(74467);
const { join, relative, resolve } = pathModule.posix;
/**
 * Check if a path matches a glob pattern
 */
function matchesPattern(path, pattern) {
    const regex = (0, glob_to_regex_js_1.toRegex)(pattern);
    return regex.test(path);
}
/**
 * Check if a path should be excluded based on exclude patterns
 */
function isExcluded(path, exclude) {
    if (!exclude)
        return false;
    if (typeof exclude === 'function') {
        return exclude(path);
    }
    const patterns = Array.isArray(exclude) ? exclude : [exclude];
    return patterns.some(pattern => matchesPattern(path, pattern));
}
/**
 * Walk directory tree and collect matching paths
 */
function walkDirectory(fs, dir, patterns, options, currentDepth = 0) {
    var _a;
    const results = [];
    const maxDepth = (_a = options.maxdepth) !== null && _a !== void 0 ? _a : Infinity;
    const baseCwd = options.cwd ? (0, util_1.pathToFilename)(options.cwd) : process.cwd();
    if (currentDepth > maxDepth) {
        return results;
    }
    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = join(dir, entry.name.toString());
            const relativePath = relative(baseCwd, fullPath);
            // Skip if excluded
            if (isExcluded(relativePath, options.exclude)) {
                continue;
            }
            // Check if this path matches any pattern
            const matches = patterns.some(pattern => matchesPattern(relativePath, pattern));
            if (matches) {
                results.push(relativePath);
            }
            // Recurse into directories
            if (entry.isDirectory() && currentDepth < maxDepth) {
                const subResults = walkDirectory(fs, fullPath, patterns, options, currentDepth + 1);
                results.push(...subResults);
            }
        }
    }
    catch (err) {
        // Skip directories we can't read
    }
    return results;
}
/**
 * Main glob implementation
 */
function globSync(fs, pattern, options = {}) {
    const cwd = options.cwd ? (0, util_1.pathToFilename)(options.cwd) : process.cwd();
    const resolvedCwd = resolve(cwd);
    const globOptions = {
        cwd: resolvedCwd,
        exclude: options.exclude,
        maxdepth: options.maxdepth,
        withFileTypes: options.withFileTypes || false,
    };
    let results = [];
    // Handle absolute patterns
    if (pathModule.posix.isAbsolute(pattern)) {
        const dir = pathModule.posix.dirname(pattern);
        const basename = pathModule.posix.basename(pattern);
        const dirResults = walkDirectory(fs, dir, [basename], Object.assign(Object.assign({}, globOptions), { cwd: dir }));
        results.push(...dirResults.map(r => pathModule.posix.resolve(dir, r)));
    }
    else {
        // Handle relative patterns
        const dirResults = walkDirectory(fs, resolvedCwd, [pattern], globOptions);
        results.push(...dirResults);
    }
    // Remove duplicates and sort
    results = [...new Set(results)].sort();
    return results;
}
//# sourceMappingURL=glob.js.map

/***/ }),

/***/ 48441:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.fsCallbackApiList = void 0;
exports.fsCallbackApiList = [
    'access',
    'appendFile',
    'chmod',
    'chown',
    'close',
    'copyFile',
    'cp',
    'createReadStream',
    'createWriteStream',
    'exists',
    'fchmod',
    'fchown',
    'fdatasync',
    'fstat',
    'fsync',
    'ftruncate',
    'futimes',
    'lchmod',
    'lchown',
    'link',
    'lstat',
    'mkdir',
    'mkdtemp',
    'open',
    'openAsBlob',
    'opendir',
    'read',
    'readv',
    'readdir',
    'readFile',
    'readlink',
    'realpath',
    'rename',
    'rm',
    'rmdir',
    'stat',
    'statfs',
    'symlink',
    'truncate',
    'unlink',
    'unwatchFile',
    'utimes',
    'lutimes',
    'watch',
    'watchFile',
    'write',
    'writev',
    'writeFile',
];
//# sourceMappingURL=fsCallbackApiList.js.map

/***/ }),

/***/ 77161:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.fsSynchronousApiList = void 0;
exports.fsSynchronousApiList = [
    'accessSync',
    'appendFileSync',
    'chmodSync',
    'chownSync',
    'closeSync',
    'copyFileSync',
    'existsSync',
    'fchmodSync',
    'fchownSync',
    'fdatasyncSync',
    'fstatSync',
    'fsyncSync',
    'ftruncateSync',
    'futimesSync',
    'lchmodSync',
    'lchownSync',
    'linkSync',
    'lstatSync',
    'mkdirSync',
    'mkdtempSync',
    'openSync',
    'opendirSync',
    'readdirSync',
    'readFileSync',
    'readlinkSync',
    'readSync',
    'readvSync',
    'realpathSync',
    'renameSync',
    'rmdirSync',
    'rmSync',
    'statSync',
    'symlinkSync',
    'truncateSync',
    'unlinkSync',
    'utimesSync',
    'lutimesSync',
    'writeFileSync',
    'writeSync',
    'writevSync',
    // 'cpSync',
    // 'statfsSync',
];
//# sourceMappingURL=fsSynchronousApiList.js.map

/***/ }),

/***/ 42345:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.getWriteFileOptions = exports.writeFileDefaults = exports.getRealpathOptsAndCb = exports.getRealpathOptions = exports.getStatfsOptsAndCb = exports.getStatfsOptions = exports.getStatOptsAndCb = exports.getStatOptions = exports.getAppendFileOptsAndCb = exports.getAppendFileOpts = exports.getOpendirOptsAndCb = exports.getOpendirOptions = exports.getReaddirOptsAndCb = exports.getReaddirOptions = exports.getReadFileOptions = exports.getRmOptsAndCb = exports.getRmdirOptions = exports.getDefaultOptsAndCb = exports.getDefaultOpts = exports.optsDefaults = exports.getMkdirOptions = void 0;
exports.getOptions = getOptions;
exports.optsGenerator = optsGenerator;
exports.optsAndCbGenerator = optsAndCbGenerator;
const constants_1 = __webpack_require__(93598);
const encoding_1 = __webpack_require__(55569);
const util_1 = __webpack_require__(74467);
const mkdirDefaults = {
    mode: 511 /* MODE.DIR */,
    recursive: false,
};
const getMkdirOptions = (options) => {
    if (typeof options === 'number')
        return Object.assign({}, mkdirDefaults, { mode: options });
    return Object.assign({}, mkdirDefaults, options);
};
exports.getMkdirOptions = getMkdirOptions;
const ERRSTR_OPTS = tipeof => `Expected options to be either an object or a string, but got ${tipeof} instead`;
function getOptions(defaults, options) {
    let opts;
    if (!options)
        return defaults;
    else {
        const tipeof = typeof options;
        switch (tipeof) {
            case 'string':
                opts = Object.assign({}, defaults, { encoding: options });
                break;
            case 'object':
                opts = Object.assign({}, defaults, options);
                break;
            default:
                throw TypeError(ERRSTR_OPTS(tipeof));
        }
    }
    if (opts.encoding !== 'buffer')
        (0, encoding_1.assertEncoding)(opts.encoding);
    return opts;
}
function optsGenerator(defaults) {
    return options => getOptions(defaults, options);
}
function optsAndCbGenerator(getOpts) {
    return (options, callback) => typeof options === 'function' ? [getOpts(), options] : [getOpts(options), (0, util_1.validateCallback)(callback)];
}
exports.optsDefaults = {
    encoding: 'utf8',
};
exports.getDefaultOpts = optsGenerator(exports.optsDefaults);
exports.getDefaultOptsAndCb = optsAndCbGenerator(exports.getDefaultOpts);
const rmdirDefaults = {
    recursive: false,
};
const getRmdirOptions = (options) => {
    return Object.assign({}, rmdirDefaults, options);
};
exports.getRmdirOptions = getRmdirOptions;
const getRmOpts = optsGenerator(exports.optsDefaults);
exports.getRmOptsAndCb = optsAndCbGenerator(getRmOpts);
const readFileOptsDefaults = {
    flag: 'r',
};
exports.getReadFileOptions = optsGenerator(readFileOptsDefaults);
const readdirDefaults = {
    encoding: 'utf8',
    recursive: false,
    withFileTypes: false,
};
exports.getReaddirOptions = optsGenerator(readdirDefaults);
exports.getReaddirOptsAndCb = optsAndCbGenerator(exports.getReaddirOptions);
const opendirDefaults = {
    encoding: 'utf8',
    bufferSize: 32,
    recursive: false,
};
exports.getOpendirOptions = optsGenerator(opendirDefaults);
exports.getOpendirOptsAndCb = optsAndCbGenerator(exports.getOpendirOptions);
const appendFileDefaults = {
    encoding: 'utf8',
    mode: 438 /* MODE.DEFAULT */,
    flag: constants_1.FLAGS[constants_1.FLAGS.a],
};
exports.getAppendFileOpts = optsGenerator(appendFileDefaults);
exports.getAppendFileOptsAndCb = optsAndCbGenerator(exports.getAppendFileOpts);
const statDefaults = {
    bigint: false,
};
const getStatOptions = (options = {}) => Object.assign({}, statDefaults, options);
exports.getStatOptions = getStatOptions;
const getStatOptsAndCb = (options, callback) => typeof options === 'function' ? [(0, exports.getStatOptions)(), options] : [(0, exports.getStatOptions)(options), (0, util_1.validateCallback)(callback)];
exports.getStatOptsAndCb = getStatOptsAndCb;
const statfsDefaults = {
    bigint: false,
};
const getStatfsOptions = (options = {}) => Object.assign({}, statfsDefaults, options);
exports.getStatfsOptions = getStatfsOptions;
const getStatfsOptsAndCb = (options, callback) => typeof options === 'function'
    ? [(0, exports.getStatfsOptions)(), options]
    : [(0, exports.getStatfsOptions)(options), (0, util_1.validateCallback)(callback)];
exports.getStatfsOptsAndCb = getStatfsOptsAndCb;
const realpathDefaults = exports.optsDefaults;
exports.getRealpathOptions = optsGenerator(realpathDefaults);
exports.getRealpathOptsAndCb = optsAndCbGenerator(exports.getRealpathOptions);
exports.writeFileDefaults = {
    encoding: 'utf8',
    mode: 438 /* MODE.DEFAULT */,
    flag: constants_1.FLAGS[constants_1.FLAGS.w],
};
exports.getWriteFileOptions = optsGenerator(exports.writeFileDefaults);
//# sourceMappingURL=options.js.map

/***/ }),

/***/ 74467:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.getWriteSyncArgs = exports.getWriteArgs = exports.bufToUint8 = void 0;
exports.promisify = promisify;
exports.validateCallback = validateCallback;
exports.modeToNumber = modeToNumber;
exports.nullCheck = nullCheck;
exports.pathToFilename = pathToFilename;
exports.createError = createError;
exports.genRndStr6 = genRndStr6;
exports.flagsToNumber = flagsToNumber;
exports.streamToBuffer = streamToBuffer;
exports.bufferToEncoding = bufferToEncoding;
exports.isReadableStream = isReadableStream;
const constants_1 = __webpack_require__(93598);
const errors = __webpack_require__(12303);
const buffer_1 = __webpack_require__(29626);
const buffer_2 = __webpack_require__(29626);
const queueMicrotask_1 = __webpack_require__(34412);
const util_1 = __webpack_require__(82398);
function promisify(fs, fn, getResult = input => input) {
    return (...args) => new Promise((resolve, reject) => {
        fs[fn].bind(fs)(...args, (error, result) => {
            if (error)
                return reject(error);
            return resolve(getResult(result));
        });
    });
}
function validateCallback(callback) {
    if (typeof callback !== 'function')
        throw TypeError(constants_1.ERRSTR.CB);
    return callback;
}
function _modeToNumber(mode, def) {
    if (typeof mode === 'number')
        return mode;
    if (typeof mode === 'string')
        return parseInt(mode, 8);
    if (def)
        return modeToNumber(def);
    return undefined;
}
function modeToNumber(mode, def) {
    const result = _modeToNumber(mode, def);
    if (typeof result !== 'number' || isNaN(result))
        throw new TypeError(constants_1.ERRSTR.MODE_INT);
    return result;
}
function nullCheck(path, callback) {
    if (('' + path).indexOf('\u0000') !== -1) {
        const er = new Error('Path must be a string without null bytes');
        er.code = 'ENOENT';
        if (typeof callback !== 'function')
            throw er;
        (0, queueMicrotask_1.default)(() => {
            callback(er);
        });
        return false;
    }
    return true;
}
function getPathFromURLPosix(url) {
    if (url.hostname !== '') {
        throw new errors.TypeError('ERR_INVALID_FILE_URL_HOST', process.platform);
    }
    const pathname = url.pathname;
    for (let n = 0; n < pathname.length; n++) {
        if (pathname[n] === '%') {
            const third = pathname.codePointAt(n + 2) | 0x20;
            if (pathname[n + 1] === '2' && third === 102) {
                throw new errors.TypeError('ERR_INVALID_FILE_URL_PATH', 'must not include encoded / characters');
            }
        }
    }
    return decodeURIComponent(pathname);
}
function pathToFilename(path) {
    if (path instanceof Uint8Array) {
        path = (0, buffer_2.bufferFrom)(path);
    }
    if (typeof path !== 'string' && !buffer_1.Buffer.isBuffer(path)) {
        try {
            if (!(path instanceof (__webpack_require__(87016).URL)))
                throw new TypeError(constants_1.ERRSTR.PATH_STR);
        }
        catch (err) {
            throw new TypeError(constants_1.ERRSTR.PATH_STR);
        }
        path = getPathFromURLPosix(path);
    }
    const pathString = String(path);
    nullCheck(pathString);
    // return slash(pathString);
    return pathString;
}
const ENOENT = 'ENOENT';
const EBADF = 'EBADF';
const EINVAL = 'EINVAL';
const EPERM = 'EPERM';
const EPROTO = 'EPROTO';
const EEXIST = 'EEXIST';
const ENOTDIR = 'ENOTDIR';
const EMFILE = 'EMFILE';
const EACCES = 'EACCES';
const EISDIR = 'EISDIR';
const ENOTEMPTY = 'ENOTEMPTY';
const ENOSYS = 'ENOSYS';
const ERR_FS_EISDIR = 'ERR_FS_EISDIR';
const ERR_OUT_OF_RANGE = 'ERR_OUT_OF_RANGE';
function formatError(errorCode, func = '', path = '', path2 = '') {
    let pathFormatted = '';
    if (path)
        pathFormatted = ` '${path}'`;
    if (path2)
        pathFormatted += ` -> '${path2}'`;
    switch (errorCode) {
        case ENOENT:
            return `ENOENT: no such file or directory, ${func}${pathFormatted}`;
        case EBADF:
            return `EBADF: bad file descriptor, ${func}${pathFormatted}`;
        case EINVAL:
            return `EINVAL: invalid argument, ${func}${pathFormatted}`;
        case EPERM:
            return `EPERM: operation not permitted, ${func}${pathFormatted}`;
        case EPROTO:
            return `EPROTO: protocol error, ${func}${pathFormatted}`;
        case EEXIST:
            return `EEXIST: file already exists, ${func}${pathFormatted}`;
        case ENOTDIR:
            return `ENOTDIR: not a directory, ${func}${pathFormatted}`;
        case EISDIR:
            return `EISDIR: illegal operation on a directory, ${func}${pathFormatted}`;
        case EACCES:
            return `EACCES: permission denied, ${func}${pathFormatted}`;
        case ENOTEMPTY:
            return `ENOTEMPTY: directory not empty, ${func}${pathFormatted}`;
        case EMFILE:
            return `EMFILE: too many open files, ${func}${pathFormatted}`;
        case ENOSYS:
            return `ENOSYS: function not implemented, ${func}${pathFormatted}`;
        case ERR_FS_EISDIR:
            return `[ERR_FS_EISDIR]: Path is a directory: ${func} returned EISDIR (is a directory) ${path}`;
        case ERR_OUT_OF_RANGE:
            return `[ERR_OUT_OF_RANGE]: value out of range, ${func}${pathFormatted}`;
        default:
            return `${errorCode}: error occurred, ${func}${pathFormatted}`;
    }
}
function createError(errorCode, func = '', path = '', path2 = '', Constructor = Error) {
    const error = new Constructor(formatError(errorCode, func, path, path2));
    error.code = errorCode;
    if (path) {
        error.path = path;
    }
    return error;
}
function genRndStr6() {
    return Math.random().toString(36).slice(2, 8).padEnd(6, '0');
}
function flagsToNumber(flags) {
    if (typeof flags === 'number')
        return flags;
    if (typeof flags === 'string') {
        const flagsNum = constants_1.FLAGS[flags];
        if (typeof flagsNum !== 'undefined')
            return flagsNum;
    }
    // throw new TypeError(formatError(ERRSTR_FLAG(flags)));
    throw new errors.TypeError('ERR_INVALID_OPT_VALUE', 'flags', flags);
}
function streamToBuffer(stream) {
    const chunks = [];
    return new Promise((resolve, reject) => {
        stream.on('data', chunk => chunks.push(chunk));
        stream.on('end', () => resolve(buffer_1.Buffer.concat(chunks)));
        stream.on('error', reject);
    });
}
const bufToUint8 = (buf) => new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
exports.bufToUint8 = bufToUint8;
const getWriteArgs = (fd, a, b, c, d, e) => {
    (0, util_1.validateFd)(fd);
    let offset = 0;
    let length;
    let position = null;
    let encoding;
    let callback;
    const tipa = typeof a;
    const tipb = typeof b;
    const tipc = typeof c;
    const tipd = typeof d;
    if (tipa !== 'string') {
        if (tipb === 'function') {
            callback = b;
        }
        else if (tipc === 'function') {
            offset = b | 0;
            callback = c;
        }
        else if (tipd === 'function') {
            offset = b | 0;
            length = c;
            callback = d;
        }
        else {
            offset = b | 0;
            length = c;
            position = d;
            callback = e;
        }
    }
    else {
        if (tipb === 'function') {
            callback = b;
        }
        else if (tipc === 'function') {
            position = b;
            callback = c;
        }
        else if (tipd === 'function') {
            position = b;
            encoding = c;
            callback = d;
        }
    }
    const buf = (0, util_1.dataToBuffer)(a, encoding);
    if (tipa !== 'string') {
        if (typeof length === 'undefined')
            length = buf.length;
    }
    else {
        offset = 0;
        length = buf.length;
    }
    const cb = validateCallback(callback);
    return [fd, tipa === 'string', buf, offset, length, position, cb];
};
exports.getWriteArgs = getWriteArgs;
const getWriteSyncArgs = (fd, a, b, c, d) => {
    (0, util_1.validateFd)(fd);
    let encoding;
    let offset;
    let length;
    let position;
    const isBuffer = typeof a !== 'string';
    if (isBuffer) {
        offset = (b || 0) | 0;
        length = c;
        position = d;
    }
    else {
        position = b;
        encoding = c;
    }
    const buf = (0, util_1.dataToBuffer)(a, encoding);
    if (isBuffer) {
        if (typeof length === 'undefined') {
            length = buf.length;
        }
    }
    else {
        offset = 0;
        length = buf.length;
    }
    return [fd, buf, offset || 0, length, position];
};
exports.getWriteSyncArgs = getWriteSyncArgs;
function bufferToEncoding(buffer, encoding) {
    if (!encoding || encoding === 'buffer')
        return buffer;
    else
        return buffer.toString(encoding);
}
function isReadableStream(stream) {
    return (stream !== null &&
        typeof stream === 'object' &&
        typeof stream.pipe === 'function' &&
        typeof stream.on === 'function' &&
        stream.readable === true);
}
//# sourceMappingURL=util.js.map

/***/ }),

/***/ 66797:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.FSWatcher = exports.StatWatcher = exports.Volume = void 0;
exports.pathToSteps = pathToSteps;
exports.dataToStr = dataToStr;
exports.toUnixTimestamp = toUnixTimestamp;
const pathModule = __webpack_require__(16928);
const core_1 = __webpack_require__(9980);
const Stats_1 = __webpack_require__(93464);
const Dirent_1 = __webpack_require__(49811);
const StatFs_1 = __webpack_require__(89102);
const buffer_1 = __webpack_require__(29626);
const queueMicrotask_1 = __webpack_require__(34412);
const setTimeoutUnref_1 = __webpack_require__(12891);
const stream_1 = __webpack_require__(2203);
const constants_1 = __webpack_require__(54655);
const events_1 = __webpack_require__(24434);
const encoding_1 = __webpack_require__(55569);
const FileHandle_1 = __webpack_require__(75039);
const util = __webpack_require__(39023);
const FsPromises_1 = __webpack_require__(47994);
const print_1 = __webpack_require__(38874);
const constants_2 = __webpack_require__(93598);
const options_1 = __webpack_require__(42345);
const util_1 = __webpack_require__(74467);
const Dir_1 = __webpack_require__(7900);
const util_2 = __webpack_require__(82398);
const resolveCrossPlatform = pathModule.resolve;
const { O_RDONLY, O_WRONLY, O_RDWR, O_CREAT, O_EXCL, O_TRUNC, O_APPEND, O_DIRECTORY, O_SYMLINK, F_OK, R_OK, W_OK, X_OK, COPYFILE_EXCL, COPYFILE_FICLONE_FORCE, } = constants_1.constants;
const { sep, relative, join, dirname, normalize } = pathModule.posix ? pathModule.posix : pathModule;
// ---------------------------------------- Constants
const kMinPoolSpace = 128;
// ---------------------------------------- Utility functions
function pathToSteps(path) {
    return (0, util_2.filenameToSteps)((0, util_1.pathToFilename)(path));
}
function dataToStr(data, encoding = encoding_1.ENCODING_UTF8) {
    if (buffer_1.Buffer.isBuffer(data))
        return data.toString(encoding);
    else if (data instanceof Uint8Array)
        return (0, buffer_1.bufferFrom)(data).toString(encoding);
    else
        return String(data);
}
// converts Date or number to a fractional UNIX timestamp
function toUnixTimestamp(time) {
    // tslint:disable-next-line triple-equals
    if (typeof time === 'string' && +time == time) {
        return +time;
    }
    if (time instanceof Date) {
        return time.getTime() / 1000;
    }
    if (isFinite(time)) {
        if (time < 0) {
            return Date.now() / 1000;
        }
        return time;
    }
    throw new Error('Cannot parse time: ' + time);
}
function validateUid(uid) {
    if (typeof uid !== 'number')
        throw TypeError(constants_2.ERRSTR.UID);
}
function validateGid(gid) {
    if (typeof gid !== 'number')
        throw TypeError(constants_2.ERRSTR.GID);
}
const notImplemented = () => {
    throw new Error('Not implemented');
};
/**
 * `Volume` represents a file system.
 */
class Volume {
    get promises() {
        if (this.promisesApi === null)
            throw new Error('Promise is not supported in this environment.');
        return this.promisesApi;
    }
    constructor(_core = new core_1.Superblock()) {
        this._core = _core;
        this.promisesApi = new FsPromises_1.FsPromises(this, FileHandle_1.FileHandle);
        this.openSync = (path, flags, mode = 438 /* MODE.DEFAULT */) => {
            // Validate (1) mode; (2) path; (3) flags - in that order.
            const modeNum = (0, util_1.modeToNumber)(mode);
            const fileName = (0, util_1.pathToFilename)(path);
            const flagsNum = (0, util_1.flagsToNumber)(flags);
            return this._core.open(fileName, flagsNum, modeNum, !(flagsNum & O_SYMLINK));
        };
        this.open = (path, flags, a, b) => {
            let mode = a;
            let callback = b;
            if (typeof a === 'function') {
                mode = 438 /* MODE.DEFAULT */;
                callback = a;
            }
            mode = mode || 438 /* MODE.DEFAULT */;
            const modeNum = (0, util_1.modeToNumber)(mode);
            const fileName = (0, util_1.pathToFilename)(path);
            const flagsNum = (0, util_1.flagsToNumber)(flags);
            this.wrapAsync(this._core.open, [fileName, flagsNum, modeNum, !(flagsNum & O_SYMLINK)], callback);
        };
        this.closeSync = (fd) => {
            this._core.close(fd);
        };
        this.close = (fd, callback) => {
            (0, util_2.validateFd)(fd);
            const file = this._core.getFileByFdOrThrow(fd, 'close');
            this.wrapAsync(this._core.close, [file.fd], callback);
        };
        this.readSync = (fd, buffer, offset, length, position) => {
            (0, util_2.validateFd)(fd);
            return this._core.read(fd, buffer, offset, length, position);
        };
        this.read = (fd, buffer, offset, length, position, callback) => {
            (0, util_1.validateCallback)(callback);
            if (length === 0) {
                // This `if` branch is from Node.js
                return (0, queueMicrotask_1.default)(() => {
                    if (callback)
                        callback(null, 0, buffer);
                });
            }
            Promise.resolve().then(() => {
                try {
                    const bytes = this._core.read(fd, buffer, offset, length, position);
                    callback(null, bytes, buffer);
                }
                catch (err) {
                    callback(err);
                }
            });
        };
        this.readv = (fd, buffers, a, b) => {
            let position = a;
            let callback = b;
            if (typeof a === 'function')
                [position, callback] = [null, a];
            (0, util_1.validateCallback)(callback);
            Promise.resolve().then(() => {
                try {
                    const bytes = this._core.readv(fd, buffers, position);
                    callback(null, bytes, buffers);
                }
                catch (err) {
                    callback(err);
                }
            });
        };
        this.readvSync = (fd, buffers, position) => {
            (0, util_2.validateFd)(fd);
            return this._core.readv(fd, buffers, position !== null && position !== void 0 ? position : null);
        };
        this._readfile = (id, flagsNum, encoding) => {
            let result;
            const isUserFd = typeof id === 'number';
            const userOwnsFd = isUserFd && (0, util_2.isFd)(id);
            let fd;
            if (userOwnsFd)
                fd = id;
            else {
                const filename = (0, util_1.pathToFilename)(id);
                // Check if original path had trailing slash (indicates directory intent)
                const originalPath = String(id);
                const hasTrailingSlash = originalPath.length > 1 && originalPath.endsWith('/');
                const link = this._core.getResolvedLinkOrThrow(filename, 'open');
                const node = link.getNode();
                if (node.isDirectory())
                    throw (0, util_1.createError)("EISDIR" /* ERROR_CODE.EISDIR */, 'open', link.getPath());
                // If path had trailing slash but resolved to a file, throw ENOTDIR
                if (hasTrailingSlash && node.isFile()) {
                    throw (0, util_1.createError)("ENOTDIR" /* ERROR_CODE.ENOTDIR */, 'open', originalPath);
                }
                fd = this.openSync(id, flagsNum);
            }
            try {
                result = (0, util_1.bufferToEncoding)(this._core.getFileByFdOrThrow(fd).getBuffer(), encoding);
            }
            finally {
                if (!userOwnsFd) {
                    this.closeSync(fd);
                }
            }
            return result;
        };
        this.readFileSync = (file, options) => {
            const opts = (0, options_1.getReadFileOptions)(options);
            const flagsNum = (0, util_1.flagsToNumber)(opts.flag);
            return this._readfile(file, flagsNum, opts.encoding);
        };
        this.readFile = (id, a, b) => {
            const [opts, callback] = (0, options_1.optsAndCbGenerator)(options_1.getReadFileOptions)(a, b);
            const flagsNum = (0, util_1.flagsToNumber)(opts.flag);
            this.wrapAsync(this._readfile, [id, flagsNum, opts.encoding], callback);
        };
        this.writeSync = (fd, a, b, c, d) => {
            const [, buf, offset, length, position] = (0, util_1.getWriteSyncArgs)(fd, a, b, c, d);
            return this._write(fd, buf, offset, length, position);
        };
        this.write = (fd, a, b, c, d, e) => {
            const [, asStr, buf, offset, length, position, cb] = (0, util_1.getWriteArgs)(fd, a, b, c, d, e);
            Promise.resolve().then(() => {
                try {
                    const bytes = this._write(fd, buf, offset, length, position);
                    if (!asStr) {
                        cb(null, bytes, buf);
                    }
                    else {
                        cb(null, bytes, a);
                    }
                }
                catch (err) {
                    cb(err);
                }
            });
        };
        this.writev = (fd, buffers, a, b) => {
            let position = a;
            let callback = b;
            if (typeof a === 'function')
                [position, callback] = [null, a];
            (0, util_1.validateCallback)(callback);
            Promise.resolve().then(() => {
                try {
                    const bytes = this.writevBase(fd, buffers, position);
                    callback(null, bytes, buffers);
                }
                catch (err) {
                    callback(err);
                }
            });
        };
        this.writevSync = (fd, buffers, position) => {
            (0, util_2.validateFd)(fd);
            return this.writevBase(fd, buffers, position !== null && position !== void 0 ? position : null);
        };
        this.writeFileSync = (id, data, options) => {
            const opts = (0, options_1.getWriteFileOptions)(options);
            const flagsNum = (0, util_1.flagsToNumber)(opts.flag);
            const modeNum = (0, util_1.modeToNumber)(opts.mode);
            const buf = (0, util_2.dataToBuffer)(data, opts.encoding);
            this._core.writeFile(id, buf, flagsNum, modeNum);
        };
        this.writeFile = (id, data, a, b) => {
            let options = a;
            let callback = b;
            if (typeof a === 'function')
                [options, callback] = [options_1.writeFileDefaults, a];
            const cb = (0, util_1.validateCallback)(callback);
            const opts = (0, options_1.getWriteFileOptions)(options);
            const flagsNum = (0, util_1.flagsToNumber)(opts.flag);
            const modeNum = (0, util_1.modeToNumber)(opts.mode);
            const buf = (0, util_2.dataToBuffer)(data, opts.encoding);
            this.wrapAsync(this._core.writeFile, [id, buf, flagsNum, modeNum], cb);
        };
        this.copyFileSync = (src, dest, flags) => {
            const srcFilename = (0, util_1.pathToFilename)(src);
            const destFilename = (0, util_1.pathToFilename)(dest);
            return this._copyFile(srcFilename, destFilename, (flags || 0) | 0);
        };
        this.copyFile = (src, dest, a, b) => {
            const srcFilename = (0, util_1.pathToFilename)(src);
            const destFilename = (0, util_1.pathToFilename)(dest);
            let flags;
            let callback;
            if (typeof a === 'function')
                [flags, callback] = [0, a];
            else
                [flags, callback] = [a, b];
            (0, util_1.validateCallback)(callback);
            this.wrapAsync(this._copyFile, [srcFilename, destFilename, flags], callback);
        };
        this._cp = (src, dest, options) => {
            if (options.filter && !options.filter(src, dest))
                return;
            const srcStat = options.dereference ? this.statSync(src) : this.lstatSync(src);
            let destStat = null;
            try {
                destStat = this.lstatSync(dest);
            }
            catch (err) {
                if (err.code !== 'ENOENT') {
                    throw err;
                }
            }
            // Check if src and dest are the same (both exist and have same inode)
            if (destStat && srcStat.ino === destStat.ino && srcStat.dev === destStat.dev)
                throw (0, util_1.createError)("EINVAL" /* ERROR_CODE.EINVAL */, 'cp', src, dest);
            // Check type compatibility
            if (destStat) {
                if (srcStat.isDirectory() && !destStat.isDirectory())
                    throw (0, util_1.createError)("EISDIR" /* ERROR_CODE.EISDIR */, 'cp', src, dest);
                if (!srcStat.isDirectory() && destStat.isDirectory())
                    throw (0, util_1.createError)("ENOTDIR" /* ERROR_CODE.ENOTDIR */, 'cp', src, dest);
            }
            // Check if trying to copy directory to subdirectory of itself
            if (srcStat.isDirectory() && this.isSrcSubdir(src, dest))
                throw (0, util_1.createError)("EINVAL" /* ERROR_CODE.EINVAL */, 'cp', src, dest);
            ENDURE_PARENT_DIR_EXISTS: {
                const parent = dirname(dest);
                if (!this.existsSync(parent))
                    this.mkdirSync(parent, { recursive: true });
            }
            // Handle different file types
            if (srcStat.isDirectory()) {
                if (!options.recursive)
                    throw (0, util_1.createError)("EISDIR" /* ERROR_CODE.EISDIR */, 'cp', src);
                this.cpDirSync(srcStat, destStat, src, dest, options);
            }
            else if (srcStat.isFile() || srcStat.isCharacterDevice() || srcStat.isBlockDevice()) {
                this.cpFileSync(srcStat, destStat, src, dest, options);
            }
            else if (srcStat.isSymbolicLink() && !options.dereference) {
                // Only handle as symlink if not dereferencing
                this.cpSymlinkSync(destStat, src, dest, options);
            }
            else {
                throw (0, util_1.createError)("EINVAL" /* ERROR_CODE.EINVAL */, 'cp', src);
            }
        };
        this.linkSync = (existingPath, newPath) => {
            const existingPathFilename = (0, util_1.pathToFilename)(existingPath);
            const newPathFilename = (0, util_1.pathToFilename)(newPath);
            this._core.link(existingPathFilename, newPathFilename);
        };
        this.link = (existingPath, newPath, callback) => {
            const existingPathFilename = (0, util_1.pathToFilename)(existingPath);
            const newPathFilename = (0, util_1.pathToFilename)(newPath);
            this.wrapAsync(this._core.link, [existingPathFilename, newPathFilename], callback);
        };
        this.unlinkSync = (path) => {
            const filename = (0, util_1.pathToFilename)(path);
            this._core.unlink(filename);
        };
        this.unlink = (path, callback) => {
            const filename = (0, util_1.pathToFilename)(path);
            this.wrapAsync(this._core.unlink, [filename], callback);
        };
        /**
         * `type` argument works only on Windows.
         * @param target
         * @param path
         * @param type
         */
        this.symlinkSync = (target, path, type) => {
            const targetFilename = (0, util_1.pathToFilename)(target);
            const pathFilename = (0, util_1.pathToFilename)(path);
            this._core.symlink(targetFilename, pathFilename);
        };
        this.symlink = (target, path, a, b) => {
            const callback = (0, util_1.validateCallback)(typeof a === 'function' ? a : b);
            const targetFilename = (0, util_1.pathToFilename)(target);
            const pathFilename = (0, util_1.pathToFilename)(path);
            this.wrapAsync(this._core.symlink, [targetFilename, pathFilename], callback);
        };
        this._lstat = (filename, bigint = false, throwIfNoEntry = false) => {
            let link;
            try {
                link = this._core.getLinkOrThrow(filename, 'lstat');
            }
            catch (err) {
                if (err.code === "ENOENT" /* ERROR_CODE.ENOENT */ && !throwIfNoEntry)
                    return undefined;
                else
                    throw err;
            }
            return Stats_1.default.build(link.getNode(), bigint);
        };
        this.lstatSync = (path, options) => {
            const { throwIfNoEntry = true, bigint = false } = (0, options_1.getStatOptions)(options);
            return this._lstat((0, util_1.pathToFilename)(path), bigint, throwIfNoEntry);
        };
        this.renameSync = (oldPath, newPath) => {
            const oldPathFilename = (0, util_1.pathToFilename)(oldPath);
            const newPathFilename = (0, util_1.pathToFilename)(newPath);
            this._core.rename(oldPathFilename, newPathFilename);
        };
        this.rename = (oldPath, newPath, callback) => {
            const oldPathFilename = (0, util_1.pathToFilename)(oldPath);
            const newPathFilename = (0, util_1.pathToFilename)(newPath);
            this.wrapAsync(this._core.rename, [oldPathFilename, newPathFilename], callback);
        };
        this.existsSync = (path) => {
            try {
                return this._exists((0, util_1.pathToFilename)(path));
            }
            catch (err) {
                return false;
            }
        };
        this.exists = (path, callback) => {
            const filename = (0, util_1.pathToFilename)(path);
            if (typeof callback !== 'function')
                throw Error(constants_2.ERRSTR.CB);
            Promise.resolve().then(() => {
                try {
                    callback(this._exists(filename));
                }
                catch (err) {
                    callback(false);
                }
            });
        };
        this.accessSync = (path, mode = F_OK) => {
            const filename = (0, util_1.pathToFilename)(path);
            mode = mode | 0;
            this._access(filename, mode);
        };
        this.access = (path, a, b) => {
            let mode = F_OK;
            let callback;
            if (typeof a !== 'function')
                [mode, callback] = [a | 0, (0, util_1.validateCallback)(b)];
            else
                callback = a;
            const filename = (0, util_1.pathToFilename)(path);
            this.wrapAsync(this._access, [filename, mode], callback);
        };
        this.appendFileSync = (id, data, options) => {
            const opts = (0, options_1.getAppendFileOpts)(options);
            // Force append behavior when using a supplied file descriptor.
            if (!opts.flag || (0, util_2.isFd)(id))
                opts.flag = 'a';
            this.writeFileSync(id, data, opts);
        };
        this.appendFile = (id, data, a, b) => {
            const [opts, callback] = (0, options_1.getAppendFileOptsAndCb)(a, b);
            // Force append behavior when using a supplied file descriptor.
            if (!opts.flag || (0, util_2.isFd)(id))
                opts.flag = 'a';
            this.writeFile(id, data, opts, callback);
        };
        this._readdir = (filename, options) => {
            const steps = (0, util_2.filenameToSteps)(filename);
            const link = this._core.getResolvedLinkOrThrow(filename, 'scandir');
            const node = link.getNode();
            if (!node.isDirectory())
                throw (0, util_1.createError)("ENOTDIR" /* ERROR_CODE.ENOTDIR */, 'scandir', filename);
            // Check we have permissions
            if (!node.canRead())
                throw (0, util_1.createError)("EACCES" /* ERROR_CODE.EACCES */, 'scandir', filename);
            const list = []; // output list
            for (const name of link.children.keys()) {
                const child = link.getChild(name);
                if (!child || name === '.' || name === '..')
                    continue;
                list.push(Dirent_1.default.build(child, options.encoding));
                // recursion
                if (options.recursive && child.children.size) {
                    const recurseOptions = Object.assign(Object.assign({}, options), { recursive: true, withFileTypes: true });
                    const childList = this._readdir(child.getPath(), recurseOptions);
                    list.push(...childList);
                }
            }
            if (!util_2.isWin && options.encoding !== 'buffer')
                list.sort((a, b) => {
                    if (a.name < b.name)
                        return -1;
                    if (a.name > b.name)
                        return 1;
                    return 0;
                });
            if (options.withFileTypes)
                return list;
            let filename2 = filename;
            if (util_2.isWin)
                filename2 = filename2.replace(/\\/g, '/');
            return list.map(dirent => {
                if (options.recursive) {
                    let fullPath = pathModule.join(dirent.parentPath, dirent.name.toString());
                    if (util_2.isWin) {
                        fullPath = fullPath.replace(/\\/g, '/');
                    }
                    return fullPath.replace(filename2 + pathModule.posix.sep, '');
                }
                return dirent.name;
            });
        };
        this.readdirSync = (path, options) => {
            const opts = (0, options_1.getReaddirOptions)(options);
            const filename = (0, util_1.pathToFilename)(path);
            return this._readdir(filename, opts);
        };
        this.readdir = (path, a, b) => {
            const [options, callback] = (0, options_1.getReaddirOptsAndCb)(a, b);
            const filename = (0, util_1.pathToFilename)(path);
            this.wrapAsync(this._readdir, [filename, options], callback);
        };
        this._readlink = (filename, encoding) => {
            const link = this._core.getLinkOrThrow(filename, 'readlink');
            const node = link.getNode();
            if (!node.isSymlink())
                throw (0, util_1.createError)("EINVAL" /* ERROR_CODE.EINVAL */, 'readlink', filename);
            return (0, encoding_1.strToEncoding)(node.symlink, encoding);
        };
        this.readlinkSync = (path, options) => {
            const opts = (0, options_1.getDefaultOpts)(options);
            const filename = (0, util_1.pathToFilename)(path);
            return this._readlink(filename, opts.encoding);
        };
        this.readlink = (path, a, b) => {
            const [opts, callback] = (0, options_1.getDefaultOptsAndCb)(a, b);
            const filename = (0, util_1.pathToFilename)(path);
            this.wrapAsync(this._readlink, [filename, opts.encoding], callback);
        };
        this._fsync = (fd) => {
            this._core.getFileByFdOrThrow(fd, 'fsync');
        };
        this.fsyncSync = (fd) => {
            this._fsync(fd);
        };
        this.fsync = (fd, callback) => {
            this.wrapAsync(this._fsync, [fd], callback);
        };
        this._fdatasync = (fd) => {
            this._core.getFileByFdOrThrow(fd, 'fdatasync');
        };
        this.fdatasyncSync = (fd) => {
            this._fdatasync(fd);
        };
        this.fdatasync = (fd, callback) => {
            this.wrapAsync(this._fdatasync, [fd], callback);
        };
        this._ftruncate = (fd, len) => {
            const file = this._core.getFileByFdOrThrow(fd, 'ftruncate');
            file.truncate(len);
        };
        this.ftruncateSync = (fd, len) => {
            this._ftruncate(fd, len);
        };
        this.ftruncate = (fd, a, b) => {
            const len = typeof a === 'number' ? a : 0;
            const callback = (0, util_1.validateCallback)(typeof a === 'number' ? b : a);
            this.wrapAsync(this._ftruncate, [fd, len], callback);
        };
        this._truncate = (path, len) => {
            const fd = this.openSync(path, 'r+');
            try {
                this.ftruncateSync(fd, len);
            }
            finally {
                this.closeSync(fd);
            }
        };
        /**
         * `id` should be a file descriptor or a path. `id` as file descriptor will
         * not be supported soon.
         */
        this.truncateSync = (id, len) => {
            if ((0, util_2.isFd)(id))
                return this.ftruncateSync(id, len);
            this._truncate(id, len);
        };
        this.truncate = (id, a, b) => {
            const len = typeof a === 'number' ? a : 0;
            const callback = (0, util_1.validateCallback)(typeof a === 'number' ? b : a);
            if ((0, util_2.isFd)(id))
                return this.ftruncate(id, len, callback);
            this.wrapAsync(this._truncate, [id, len], callback);
        };
        this._futimes = (fd, atime, mtime) => {
            const file = this._core.getFileByFdOrThrow(fd, 'futimes');
            const node = file.node;
            node.atime = new Date(atime * 1000);
            node.mtime = new Date(mtime * 1000);
        };
        this.futimesSync = (fd, atime, mtime) => {
            this._futimes(fd, toUnixTimestamp(atime), toUnixTimestamp(mtime));
        };
        this.futimes = (fd, atime, mtime, callback) => {
            this.wrapAsync(this._futimes, [fd, toUnixTimestamp(atime), toUnixTimestamp(mtime)], callback);
        };
        this._utimes = (filename, atime, mtime, followSymlinks = true) => {
            const core = this._core;
            const link = followSymlinks
                ? core.getResolvedLinkOrThrow(filename, 'utimes')
                : core.getLinkOrThrow(filename, 'lutimes');
            const node = link.getNode();
            node.atime = new Date(atime * 1000);
            node.mtime = new Date(mtime * 1000);
        };
        this.utimesSync = (path, atime, mtime) => {
            this._utimes((0, util_1.pathToFilename)(path), toUnixTimestamp(atime), toUnixTimestamp(mtime), true);
        };
        this.utimes = (path, atime, mtime, callback) => {
            this.wrapAsync(this._utimes, [(0, util_1.pathToFilename)(path), toUnixTimestamp(atime), toUnixTimestamp(mtime), true], callback);
        };
        this.lutimesSync = (path, atime, mtime) => {
            this._utimes((0, util_1.pathToFilename)(path), toUnixTimestamp(atime), toUnixTimestamp(mtime), false);
        };
        this.lutimes = (path, atime, mtime, callback) => {
            this.wrapAsync(this._utimes, [(0, util_1.pathToFilename)(path), toUnixTimestamp(atime), toUnixTimestamp(mtime), false], callback);
        };
        this.mkdirSync = (path, options) => {
            const opts = (0, options_1.getMkdirOptions)(options);
            const modeNum = (0, util_1.modeToNumber)(opts.mode, 0o777);
            const filename = (0, util_1.pathToFilename)(path);
            if (opts.recursive)
                return this._core.mkdirp(filename, modeNum);
            this._core.mkdir(filename, modeNum);
        };
        this.mkdir = (path, a, b) => {
            const opts = (0, options_1.getMkdirOptions)(a);
            const callback = (0, util_1.validateCallback)(typeof a === 'function' ? a : b);
            const modeNum = (0, util_1.modeToNumber)(opts.mode, 0o777);
            const filename = (0, util_1.pathToFilename)(path);
            if (opts.recursive)
                this.wrapAsync(this._core.mkdirp, [filename, modeNum], callback);
            else
                this.wrapAsync(this._core.mkdir, [filename, modeNum], callback);
        };
        this._mkdtemp = (prefix, encoding, retry = 5) => {
            const filename = prefix + (0, util_1.genRndStr6)();
            try {
                this._core.mkdir(filename, 511 /* MODE.DIR */);
                return (0, encoding_1.strToEncoding)(filename, encoding);
            }
            catch (err) {
                if (err.code === "EEXIST" /* ERROR_CODE.EEXIST */) {
                    if (retry > 1)
                        return this._mkdtemp(prefix, encoding, retry - 1);
                    else
                        throw Error('Could not create temp dir.');
                }
                else
                    throw err;
            }
        };
        this.mkdtempSync = (prefix, options) => {
            const { encoding } = (0, options_1.getDefaultOpts)(options);
            if (!prefix || typeof prefix !== 'string')
                throw new TypeError('filename prefix is required');
            (0, util_1.nullCheck)(prefix);
            return this._mkdtemp(prefix, encoding);
        };
        this.mkdtemp = (prefix, a, b) => {
            const [{ encoding }, callback] = (0, options_1.getDefaultOptsAndCb)(a, b);
            if (!prefix || typeof prefix !== 'string')
                throw new TypeError('filename prefix is required');
            if (!(0, util_1.nullCheck)(prefix))
                return;
            this.wrapAsync(this._mkdtemp, [prefix, encoding], callback);
        };
        this.rmdirSync = (path, options) => {
            const opts = (0, options_1.getRmdirOptions)(options);
            this._core.rmdir((0, util_1.pathToFilename)(path), opts.recursive);
        };
        this.rmdir = (path, a, b) => {
            const opts = (0, options_1.getRmdirOptions)(a);
            const callback = (0, util_1.validateCallback)(typeof a === 'function' ? a : b);
            this.wrapAsync(this._core.rmdir, [(0, util_1.pathToFilename)(path), opts.recursive], callback);
        };
        this.rmSync = (path, options) => {
            this._core.rm((0, util_1.pathToFilename)(path), options === null || options === void 0 ? void 0 : options.force, options === null || options === void 0 ? void 0 : options.recursive);
        };
        this.rm = (path, a, b) => {
            const [opts, callback] = (0, options_1.getRmOptsAndCb)(a, b);
            this.wrapAsync(this._core.rm, [(0, util_1.pathToFilename)(path), opts === null || opts === void 0 ? void 0 : opts.force, opts === null || opts === void 0 ? void 0 : opts.recursive], callback);
        };
        this._fchmod = (fd, modeNum) => {
            const file = this._core.getFileByFdOrThrow(fd, 'fchmod');
            file.chmod(modeNum);
        };
        this.fchmodSync = (fd, mode) => {
            this._fchmod(fd, (0, util_1.modeToNumber)(mode));
        };
        this.fchmod = (fd, mode, callback) => {
            this.wrapAsync(this._fchmod, [fd, (0, util_1.modeToNumber)(mode)], callback);
        };
        this._chmod = (filename, modeNum, followSymlinks = true) => {
            const link = followSymlinks
                ? this._core.getResolvedLinkOrThrow(filename, 'chmod')
                : this._core.getLinkOrThrow(filename, 'chmod');
            const node = link.getNode();
            node.chmod(modeNum);
        };
        this.chmodSync = (path, mode) => {
            const modeNum = (0, util_1.modeToNumber)(mode);
            const filename = (0, util_1.pathToFilename)(path);
            this._chmod(filename, modeNum, true);
        };
        this.chmod = (path, mode, callback) => {
            const modeNum = (0, util_1.modeToNumber)(mode);
            const filename = (0, util_1.pathToFilename)(path);
            this.wrapAsync(this._chmod, [filename, modeNum], callback);
        };
        this._lchmod = (filename, modeNum) => {
            this._chmod(filename, modeNum, false);
        };
        this.lchmodSync = (path, mode) => {
            const modeNum = (0, util_1.modeToNumber)(mode);
            const filename = (0, util_1.pathToFilename)(path);
            this._lchmod(filename, modeNum);
        };
        this.lchmod = (path, mode, callback) => {
            const modeNum = (0, util_1.modeToNumber)(mode);
            const filename = (0, util_1.pathToFilename)(path);
            this.wrapAsync(this._lchmod, [filename, modeNum], callback);
        };
        this._fchown = (fd, uid, gid) => {
            this._core.getFileByFdOrThrow(fd, 'fchown').chown(uid, gid);
        };
        this.fchownSync = (fd, uid, gid) => {
            validateUid(uid);
            validateGid(gid);
            this._fchown(fd, uid, gid);
        };
        this.fchown = (fd, uid, gid, callback) => {
            validateUid(uid);
            validateGid(gid);
            this.wrapAsync(this._fchown, [fd, uid, gid], callback);
        };
        this._chown = (filename, uid, gid) => {
            const link = this._core.getResolvedLinkOrThrow(filename, 'chown');
            const node = link.getNode();
            node.chown(uid, gid);
        };
        this.chownSync = (path, uid, gid) => {
            validateUid(uid);
            validateGid(gid);
            this._chown((0, util_1.pathToFilename)(path), uid, gid);
        };
        this.chown = (path, uid, gid, callback) => {
            validateUid(uid);
            validateGid(gid);
            this.wrapAsync(this._chown, [(0, util_1.pathToFilename)(path), uid, gid], callback);
        };
        this._lchown = (filename, uid, gid) => {
            this._core.getLinkOrThrow(filename, 'lchown').getNode().chown(uid, gid);
        };
        this.lchownSync = (path, uid, gid) => {
            validateUid(uid);
            validateGid(gid);
            this._lchown((0, util_1.pathToFilename)(path), uid, gid);
        };
        this.lchown = (path, uid, gid, callback) => {
            validateUid(uid);
            validateGid(gid);
            this.wrapAsync(this._lchown, [(0, util_1.pathToFilename)(path), uid, gid], callback);
        };
        this.statWatchers = {};
        this.cpSync = (src, dest, options) => {
            var _a, _b, _c, _d, _e, _f, _g;
            const srcFilename = (0, util_1.pathToFilename)(src);
            const destFilename = (0, util_1.pathToFilename)(dest);
            const opts_ = {
                dereference: (_a = options === null || options === void 0 ? void 0 : options.dereference) !== null && _a !== void 0 ? _a : false,
                errorOnExist: (_b = options === null || options === void 0 ? void 0 : options.errorOnExist) !== null && _b !== void 0 ? _b : false,
                filter: options === null || options === void 0 ? void 0 : options.filter,
                force: (_c = options === null || options === void 0 ? void 0 : options.force) !== null && _c !== void 0 ? _c : true,
                mode: (_d = options === null || options === void 0 ? void 0 : options.mode) !== null && _d !== void 0 ? _d : 0,
                preserveTimestamps: (_e = options === null || options === void 0 ? void 0 : options.preserveTimestamps) !== null && _e !== void 0 ? _e : false,
                recursive: (_f = options === null || options === void 0 ? void 0 : options.recursive) !== null && _f !== void 0 ? _f : false,
                verbatimSymlinks: (_g = options === null || options === void 0 ? void 0 : options.verbatimSymlinks) !== null && _g !== void 0 ? _g : false,
            };
            return this._cp(srcFilename, destFilename, opts_);
        };
        this.cp = (src, dest, a, b) => {
            var _a, _b, _c, _d, _e, _f, _g;
            const srcFilename = (0, util_1.pathToFilename)(src);
            const destFilename = (0, util_1.pathToFilename)(dest);
            let options;
            let callback;
            if (typeof a === 'function')
                [options, callback] = [{}, a];
            else
                [options, callback] = [a || {}, b];
            (0, util_1.validateCallback)(callback);
            const opts_ = {
                dereference: (_a = options === null || options === void 0 ? void 0 : options.dereference) !== null && _a !== void 0 ? _a : false,
                errorOnExist: (_b = options === null || options === void 0 ? void 0 : options.errorOnExist) !== null && _b !== void 0 ? _b : false,
                filter: options === null || options === void 0 ? void 0 : options.filter,
                force: (_c = options === null || options === void 0 ? void 0 : options.force) !== null && _c !== void 0 ? _c : true,
                mode: (_d = options === null || options === void 0 ? void 0 : options.mode) !== null && _d !== void 0 ? _d : 0,
                preserveTimestamps: (_e = options === null || options === void 0 ? void 0 : options.preserveTimestamps) !== null && _e !== void 0 ? _e : false,
                recursive: (_f = options === null || options === void 0 ? void 0 : options.recursive) !== null && _f !== void 0 ? _f : false,
                verbatimSymlinks: (_g = options === null || options === void 0 ? void 0 : options.verbatimSymlinks) !== null && _g !== void 0 ? _g : false,
            };
            this.wrapAsync(this._cp, [srcFilename, destFilename, opts_], callback);
        };
        this.openAsBlob = async (path, options) => {
            const filename = (0, util_1.pathToFilename)(path);
            const link = this._core.getResolvedLinkOrThrow(filename, 'open');
            const node = link.getNode();
            if (node.isDirectory())
                throw (0, util_1.createError)("EISDIR" /* ERROR_CODE.EISDIR */, 'open', link.getPath());
            const buffer = node.getBuffer();
            const type = (options === null || options === void 0 ? void 0 : options.type) || '';
            return new Blob([buffer], { type });
        };
        this.glob = (pattern, ...args) => {
            const [options, callback] = args.length === 1 ? [{}, args[0]] : [args[0], args[1]];
            this.wrapAsync(this._globSync, [pattern, options || {}], callback);
        };
        this.globSync = (pattern, options = {}) => {
            return this._globSync(pattern, options);
        };
        this._globSync = (pattern, options = {}) => {
            const { globSync } = __webpack_require__(98077);
            return globSync(this, pattern, options);
        };
        this._opendir = (filename, options) => {
            const link = this._core.getResolvedLinkOrThrow(filename, 'scandir');
            const node = link.getNode();
            if (!node.isDirectory())
                throw (0, util_1.createError)("ENOTDIR" /* ERROR_CODE.ENOTDIR */, 'scandir', filename);
            return new Dir_1.Dir(link, options);
        };
        this.opendirSync = (path, options) => {
            const opts = (0, options_1.getOpendirOptions)(options);
            const filename = (0, util_1.pathToFilename)(path);
            return this._opendir(filename, opts);
        };
        this.opendir = (path, a, b) => {
            const [options, callback] = (0, options_1.getOpendirOptsAndCb)(a, b);
            const filename = (0, util_1.pathToFilename)(path);
            this.wrapAsync(this._opendir, [filename, options], callback);
        };
        const self = this; // tslint:disable-line no-this-assignment
        this.StatWatcher = class extends StatWatcher {
            constructor() {
                super(self);
            }
        };
        const _ReadStream = FsReadStream;
        this.ReadStream = class extends _ReadStream {
            constructor(...args) {
                super(self, ...args);
            }
        };
        const _WriteStream = FsWriteStream;
        this.WriteStream = class extends _WriteStream {
            constructor(...args) {
                super(self, ...args);
            }
        };
        this.FSWatcher = class extends FSWatcher {
            constructor() {
                super(self);
            }
        };
        const _realpath = (filename, encoding) => {
            const realLink = this._core.getResolvedLinkOrThrow(filename, 'realpath');
            return (0, encoding_1.strToEncoding)(realLink.getPath() || '/', encoding);
        };
        const realpathImpl = (path, a, b) => {
            const [opts, callback] = (0, options_1.getRealpathOptsAndCb)(a, b);
            const pathFilename = (0, util_1.pathToFilename)(path);
            self.wrapAsync(_realpath, [pathFilename, opts.encoding], callback);
        };
        const realpathSyncImpl = (path, options) => _realpath((0, util_1.pathToFilename)(path), (0, options_1.getRealpathOptions)(options).encoding);
        this.realpath = realpathImpl;
        this.realpath.native = realpathImpl;
        this.realpathSync = realpathSyncImpl;
        this.realpathSync.native = realpathSyncImpl;
    }
    wrapAsync(method, args, callback) {
        (0, util_1.validateCallback)(callback);
        Promise.resolve().then(() => {
            let result;
            try {
                result = method.apply(this, args);
            }
            catch (err) {
                callback(err);
                return;
            }
            callback(null, result);
        });
    }
    toTree(opts = { separator: sep }) {
        return (0, print_1.toTreeSync)(this, opts);
    }
    reset() {
        this._core.reset();
    }
    toJSON(paths, json = {}, isRelative = false, asBuffer = false) {
        return this._core.toJSON(paths, json, isRelative, asBuffer);
    }
    fromJSON(json, cwd) {
        return this._core.fromJSON(json, cwd);
    }
    fromNestedJSON(json, cwd) {
        return this._core.fromNestedJSON(json, cwd);
    }
    // Legacy interface
    mountSync(mountpoint, json) {
        this._core.fromJSON(json, mountpoint);
    }
    _write(fd, buf, offset, length, position) {
        const file = this._core.getFileByFdOrThrow(fd, 'write');
        if (file.node.isSymlink()) {
            throw (0, util_1.createError)("EBADF" /* ERROR_CODE.EBADF */, 'write', file.link.getPath());
        }
        return file.write(buf, offset, length, position === -1 || typeof position !== 'number' ? undefined : position);
    }
    writevBase(fd, buffers, position) {
        const file = this._core.getFileByFdOrThrow(fd);
        let p = position !== null && position !== void 0 ? position : undefined;
        if (p === -1) {
            p = undefined;
        }
        let bytesWritten = 0;
        for (const buffer of buffers) {
            const nodeBuf = buffer_1.Buffer.from(buffer.buffer, buffer.byteOffset, buffer.byteLength);
            const bytes = file.write(nodeBuf, 0, nodeBuf.byteLength, p);
            p = undefined;
            bytesWritten += bytes;
            if (bytes < nodeBuf.byteLength)
                break;
        }
        return bytesWritten;
    }
    _copyFile(src, dest, flags) {
        const buf = this.readFileSync(src);
        if (flags & COPYFILE_EXCL && this.existsSync(dest))
            throw (0, util_1.createError)("EEXIST" /* ERROR_CODE.EEXIST */, 'copyFile', src, dest);
        if (flags & COPYFILE_FICLONE_FORCE)
            throw (0, util_1.createError)("ENOSYS" /* ERROR_CODE.ENOSYS */, 'copyFile', src, dest);
        this._core.writeFile(dest, buf, constants_2.FLAGS.w, 438 /* MODE.DEFAULT */);
    }
    isSrcSubdir(src, dest) {
        try {
            const normalizedSrc = normalize(src.startsWith('/') ? src : '/' + src);
            const normalizedDest = normalize(dest.startsWith('/') ? dest : '/' + dest);
            if (normalizedSrc === normalizedDest)
                return true;
            // Check if dest is under src by using relative path
            // If dest is under src, the relative path from src to dest won't start with '..'
            const relativePath = relative(normalizedSrc, normalizedDest);
            // If relative path is empty or doesn't start with '..', dest is under src
            return relativePath === '' || (!relativePath.startsWith('..') && !pathModule.isAbsolute(relativePath));
        }
        catch (error) {
            // If path operations fail, assume it's safe (don't block the copy)
            return false;
        }
    }
    cpFileSync(srcStat, destStat, src, dest, options) {
        if (destStat) {
            if (options.errorOnExist)
                throw (0, util_1.createError)("EEXIST" /* ERROR_CODE.EEXIST */, 'cp', dest);
            if (!options.force)
                return;
            this.unlinkSync(dest);
        }
        // Copy the file
        this.copyFileSync(src, dest, options.mode);
        // Preserve timestamps if requested
        if (options.preserveTimestamps)
            this.utimesSync(dest, srcStat.atime, srcStat.mtime);
        // Set file mode
        this.chmodSync(dest, Number(srcStat.mode));
    }
    cpDirSync(srcStat, destStat, src, dest, options) {
        if (!destStat) {
            this.mkdirSync(dest);
        }
        // Read directory contents
        const entries = this.readdirSync(src);
        for (const entry of entries) {
            const srcItem = join(src, entry);
            const destItem = join(dest, entry);
            // Apply filter to each item
            if (options.filter && !options.filter(srcItem, destItem)) {
                continue;
            }
            this._cp(srcItem, destItem, options);
        }
        // Set directory mode
        this.chmodSync(dest, Number(srcStat.mode));
    }
    cpSymlinkSync(destStat, src, dest, options) {
        let linkTarget = String(this.readlinkSync(src));
        if (!options.verbatimSymlinks && !pathModule.isAbsolute(linkTarget))
            linkTarget = resolveCrossPlatform(dirname(src), linkTarget);
        if (destStat)
            this.unlinkSync(dest);
        this.symlinkSync(linkTarget, dest);
    }
    lstat(path, a, b) {
        const [{ throwIfNoEntry = true, bigint = false }, callback] = (0, options_1.getStatOptsAndCb)(a, b);
        this.wrapAsync(this._lstat, [(0, util_1.pathToFilename)(path), bigint, throwIfNoEntry], callback);
    }
    _stat(filename, bigint = false, throwIfNoEntry = true) {
        let link;
        try {
            link = this._core.getResolvedLinkOrThrow(filename, 'stat');
        }
        catch (err) {
            if (err.code === "ENOENT" /* ERROR_CODE.ENOENT */ && !throwIfNoEntry)
                return undefined;
            else
                throw err;
        }
        return Stats_1.default.build(link.getNode(), bigint);
    }
    statSync(path, options) {
        const { bigint = true, throwIfNoEntry = true } = (0, options_1.getStatOptions)(options);
        return this._stat((0, util_1.pathToFilename)(path), bigint, throwIfNoEntry);
    }
    stat(path, a, b) {
        const [{ bigint = false, throwIfNoEntry = true }, callback] = (0, options_1.getStatOptsAndCb)(a, b);
        this.wrapAsync(this._stat, [(0, util_1.pathToFilename)(path), bigint, throwIfNoEntry], callback);
    }
    fstatBase(fd, bigint = false) {
        const file = this._core.getFileByFd(fd);
        if (!file)
            throw (0, util_1.createError)("EBADF" /* ERROR_CODE.EBADF */, 'fstat');
        return Stats_1.default.build(file.node, bigint);
    }
    fstatSync(fd, options) {
        return this.fstatBase(fd, (0, options_1.getStatOptions)(options).bigint);
    }
    fstat(fd, a, b) {
        const [opts, callback] = (0, options_1.getStatOptsAndCb)(a, b);
        this.wrapAsync(this.fstatBase, [fd, opts.bigint], callback);
    }
    _exists(filename) {
        return !!this._stat(filename);
    }
    _access(filename, mode) {
        const link = this._core.getLinkOrThrow(filename, 'access');
        const node = link.getNode();
        // F_OK (0) just checks for existence, which we already confirmed above
        if (mode === F_OK) {
            return;
        }
        // Check read permission
        if (mode & R_OK && !node.canRead()) {
            throw (0, util_1.createError)("EACCES" /* ERROR_CODE.EACCES */, 'access', filename);
        }
        // Check write permission
        if (mode & W_OK && !node.canWrite()) {
            throw (0, util_1.createError)("EACCES" /* ERROR_CODE.EACCES */, 'access', filename);
        }
        // Check execute permission
        if (mode & X_OK && !node.canExecute()) {
            throw (0, util_1.createError)("EACCES" /* ERROR_CODE.EACCES */, 'access', filename);
        }
    }
    watchFile(path, a, b) {
        const filename = (0, util_1.pathToFilename)(path);
        let options = a;
        let listener = b;
        if (typeof options === 'function') {
            listener = a;
            options = null;
        }
        if (typeof listener !== 'function') {
            throw Error('"watchFile()" requires a listener function');
        }
        let interval = 5007;
        let persistent = true;
        if (options && typeof options === 'object') {
            if (typeof options.interval === 'number')
                interval = options.interval;
            if (typeof options.persistent === 'boolean')
                persistent = options.persistent;
        }
        let watcher = this.statWatchers[filename];
        if (!watcher) {
            watcher = new this.StatWatcher();
            watcher.start(filename, persistent, interval);
            this.statWatchers[filename] = watcher;
        }
        watcher.addListener('change', listener);
        return watcher;
    }
    unwatchFile(path, listener) {
        const filename = (0, util_1.pathToFilename)(path);
        const watcher = this.statWatchers[filename];
        if (!watcher)
            return;
        if (typeof listener === 'function') {
            watcher.removeListener('change', listener);
        }
        else {
            watcher.removeAllListeners('change');
        }
        if (watcher.listenerCount('change') === 0) {
            watcher.stop();
            delete this.statWatchers[filename];
        }
    }
    createReadStream(path, options) {
        return new this.ReadStream(path, options);
    }
    createWriteStream(path, options) {
        return new this.WriteStream(path, options);
    }
    // watch(path: PathLike): FSWatcher;
    // watch(path: PathLike, options?: IWatchOptions | string): FSWatcher;
    watch(path, options, listener) {
        const filename = (0, util_1.pathToFilename)(path);
        let givenOptions = options;
        if (typeof options === 'function') {
            listener = options;
            givenOptions = null;
        }
        // tslint:disable-next-line prefer-const
        let { persistent, recursive, encoding } = (0, options_1.getDefaultOpts)(givenOptions);
        if (persistent === undefined)
            persistent = true;
        if (recursive === undefined)
            recursive = false;
        const watcher = new this.FSWatcher();
        watcher.start(filename, persistent, recursive, encoding);
        if (listener) {
            watcher.addListener('change', listener);
        }
        return watcher;
    }
    _statfs(filename, bigint = false) {
        // Verify the path exists to match Node.js behavior
        this._core.getResolvedLinkOrThrow(filename, 'statfs');
        return StatFs_1.default.build(this._core, bigint);
    }
    statfsSync(path, options) {
        const { bigint = false } = (0, options_1.getStatfsOptions)(options);
        return this._statfs((0, util_1.pathToFilename)(path), bigint);
    }
    statfs(path, a, b) {
        const [{ bigint = false }, callback] = (0, options_1.getStatfsOptsAndCb)(a, b);
        this.wrapAsync(this._statfs, [(0, util_1.pathToFilename)(path), bigint], callback);
    }
}
exports.Volume = Volume;
Volume.fromJSON = (json, cwd) => new Volume(core_1.Superblock.fromJSON(json, cwd));
Volume.fromNestedJSON = (json, cwd) => new Volume(core_1.Superblock.fromNestedJSON(json, cwd));
function emitStop(self) {
    self.emit('stop');
}
class StatWatcher extends events_1.EventEmitter {
    constructor(vol) {
        super();
        this.onInterval = () => {
            try {
                const stats = this.vol.statSync(this.filename);
                if (this.hasChanged(stats)) {
                    this.emit('change', stats, this.prev);
                    this.prev = stats;
                }
            }
            finally {
                this.loop();
            }
        };
        this.vol = vol;
    }
    loop() {
        this.timeoutRef = this.setTimeout(this.onInterval, this.interval);
    }
    hasChanged(stats) {
        // if(!this.prev) return false;
        if (stats.mtimeMs > this.prev.mtimeMs)
            return true;
        if (stats.nlink !== this.prev.nlink)
            return true;
        return false;
    }
    start(path, persistent = true, interval = 5007) {
        this.filename = (0, util_1.pathToFilename)(path);
        this.setTimeout = persistent
            ? setTimeout.bind(typeof globalThis !== 'undefined' ? globalThis : global)
            : setTimeoutUnref_1.default;
        this.interval = interval;
        this.prev = this.vol.statSync(this.filename);
        this.loop();
    }
    stop() {
        clearTimeout(this.timeoutRef);
        (0, queueMicrotask_1.default)(() => {
            emitStop.call(this, this);
        });
    }
}
exports.StatWatcher = StatWatcher;
/* tslint:disable no-var-keyword prefer-const */
// ---------------------------------------- ReadStream
var pool;
function allocNewPool(poolSize) {
    pool = (0, buffer_1.bufferAllocUnsafe)(poolSize);
    pool.used = 0;
}
util.inherits(FsReadStream, stream_1.Readable);
exports.ReadStream = FsReadStream;
function FsReadStream(vol, path, options) {
    if (!(this instanceof FsReadStream))
        return new FsReadStream(vol, path, options);
    this._vol = vol;
    // a little bit bigger buffer and water marks by default
    options = Object.assign({}, (0, options_1.getOptions)(options, {}));
    if (options.highWaterMark === undefined)
        options.highWaterMark = 64 * 1024;
    stream_1.Readable.call(this, options);
    this.path = (0, util_1.pathToFilename)(path);
    this.fd = options.fd === undefined ? null : typeof options.fd !== 'number' ? options.fd.fd : options.fd;
    this.flags = options.flags === undefined ? 'r' : options.flags;
    this.mode = options.mode === undefined ? 0o666 : options.mode;
    this.start = options.start;
    this.end = options.end;
    this.autoClose = options.autoClose === undefined ? true : options.autoClose;
    this.pos = undefined;
    this.bytesRead = 0;
    if (this.start !== undefined) {
        if (typeof this.start !== 'number') {
            throw new TypeError('"start" option must be a Number');
        }
        if (this.end === undefined) {
            this.end = Infinity;
        }
        else if (typeof this.end !== 'number') {
            throw new TypeError('"end" option must be a Number');
        }
        if (this.start > this.end) {
            throw new Error('"start" option must be <= "end" option');
        }
        this.pos = this.start;
    }
    if (typeof this.fd !== 'number')
        this.open();
    this.on('end', function () {
        if (this.autoClose) {
            if (this.destroy)
                this.destroy();
        }
    });
}
FsReadStream.prototype.open = function () {
    var self = this; // tslint:disable-line no-this-assignment
    this._vol.open(this.path, this.flags, this.mode, (er, fd) => {
        if (er) {
            if (self.autoClose) {
                if (self.destroy)
                    self.destroy();
            }
            self.emit('error', er);
            return;
        }
        self.fd = fd;
        self.emit('open', fd);
        // start the flow of data.
        self.read();
    });
};
FsReadStream.prototype._read = function (n) {
    if (typeof this.fd !== 'number') {
        return this.once('open', function () {
            this._read(n);
        });
    }
    if (this.destroyed)
        return;
    if (!pool || pool.length - pool.used < kMinPoolSpace) {
        // discard the old pool.
        allocNewPool(this._readableState.highWaterMark);
    }
    // Grab another reference to the pool in the case that while we're
    // in the thread pool another read() finishes up the pool, and
    // allocates a new one.
    var thisPool = pool;
    var toRead = Math.min(pool.length - pool.used, n);
    var start = pool.used;
    if (this.pos !== undefined)
        toRead = Math.min(this.end - this.pos + 1, toRead);
    // already read everything we were supposed to read!
    // treat as EOF.
    if (toRead <= 0)
        return this.push(null);
    // the actual read.
    var self = this; // tslint:disable-line no-this-assignment
    this._vol.read(this.fd, pool, pool.used, toRead, this.pos, onread);
    // move the pool positions, and internal position for reading.
    if (this.pos !== undefined)
        this.pos += toRead;
    pool.used += toRead;
    function onread(er, bytesRead) {
        if (er) {
            if (self.autoClose && self.destroy) {
                self.destroy();
            }
            self.emit('error', er);
        }
        else {
            var b = null;
            if (bytesRead > 0) {
                self.bytesRead += bytesRead;
                b = thisPool.slice(start, start + bytesRead);
            }
            self.push(b);
        }
    }
};
FsReadStream.prototype._destroy = function (err, cb) {
    this.close(err2 => {
        cb(err || err2);
    });
};
FsReadStream.prototype.close = function (cb) {
    var _a;
    if (cb)
        this.once('close', cb);
    if (this.closed || typeof this.fd !== 'number') {
        if (typeof this.fd !== 'number') {
            this.once('open', closeOnOpen);
            return;
        }
        return (0, queueMicrotask_1.default)(() => this.emit('close'));
    }
    // Since Node 18, there is only a getter for '.closed'.
    // The first branch mimics other setters from Readable.
    // See https://github.com/nodejs/node/blob/v18.0.0/lib/internal/streams/readable.js#L1243
    if (typeof ((_a = this._readableState) === null || _a === void 0 ? void 0 : _a.closed) === 'boolean') {
        this._readableState.closed = true;
    }
    else {
        this.closed = true;
    }
    this._vol.close(this.fd, er => {
        if (er)
            this.emit('error', er);
        else
            this.emit('close');
    });
    this.fd = null;
};
// needed because as it will be called with arguments
// that does not match this.close() signature
function closeOnOpen(fd) {
    this.close();
}
util.inherits(FsWriteStream, stream_1.Writable);
exports.WriteStream = FsWriteStream;
function FsWriteStream(vol, path, options) {
    if (!(this instanceof FsWriteStream))
        return new FsWriteStream(vol, path, options);
    this._vol = vol;
    options = Object.assign({}, (0, options_1.getOptions)(options, {}));
    stream_1.Writable.call(this, options);
    this.path = (0, util_1.pathToFilename)(path);
    this.fd = options.fd === undefined ? null : typeof options.fd !== 'number' ? options.fd.fd : options.fd;
    this.flags = options.flags === undefined ? 'w' : options.flags;
    this.mode = options.mode === undefined ? 0o666 : options.mode;
    this.start = options.start;
    this.autoClose = options.autoClose === undefined ? true : !!options.autoClose;
    this.pos = undefined;
    this.bytesWritten = 0;
    this.pending = true;
    if (this.start !== undefined) {
        if (typeof this.start !== 'number') {
            throw new TypeError('"start" option must be a Number');
        }
        if (this.start < 0) {
            throw new Error('"start" must be >= zero');
        }
        this.pos = this.start;
    }
    if (options.encoding)
        this.setDefaultEncoding(options.encoding);
    if (typeof this.fd !== 'number')
        this.open();
    // dispose on finish.
    this.once('finish', function () {
        if (this.autoClose) {
            this.close();
        }
    });
}
FsWriteStream.prototype.open = function () {
    this._vol.open(this.path, this.flags, this.mode, function (er, fd) {
        if (er) {
            if (this.autoClose && this.destroy) {
                this.destroy();
            }
            this.emit('error', er);
            return;
        }
        this.fd = fd;
        this.pending = false;
        this.emit('open', fd);
    }.bind(this));
};
FsWriteStream.prototype._write = function (data, encoding, cb) {
    if (!(data instanceof buffer_1.Buffer || data instanceof Uint8Array))
        return this.emit('error', new Error('Invalid data'));
    if (typeof this.fd !== 'number') {
        return this.once('open', function () {
            this._write(data, encoding, cb);
        });
    }
    var self = this; // tslint:disable-line no-this-assignment
    this._vol.write(this.fd, data, 0, data.length, this.pos, (er, bytes) => {
        if (er) {
            if (self.autoClose && self.destroy) {
                self.destroy();
            }
            return cb(er);
        }
        self.bytesWritten += bytes;
        cb();
    });
    if (this.pos !== undefined)
        this.pos += data.length;
};
FsWriteStream.prototype._writev = function (data, cb) {
    if (typeof this.fd !== 'number') {
        return this.once('open', function () {
            this._writev(data, cb);
        });
    }
    const self = this; // tslint:disable-line no-this-assignment
    const len = data.length;
    const chunks = new Array(len);
    var size = 0;
    for (var i = 0; i < len; i++) {
        var chunk = data[i].chunk;
        chunks[i] = chunk;
        size += chunk.length;
    }
    const buf = buffer_1.Buffer.concat(chunks);
    this._vol.write(this.fd, buf, 0, buf.length, this.pos, (er, bytes) => {
        if (er) {
            if (self.destroy)
                self.destroy();
            return cb(er);
        }
        self.bytesWritten += bytes;
        cb();
    });
    if (this.pos !== undefined)
        this.pos += size;
};
FsWriteStream.prototype.close = function (cb) {
    var _a;
    if (cb)
        this.once('close', cb);
    if (this.closed || typeof this.fd !== 'number') {
        if (typeof this.fd !== 'number') {
            this.once('open', closeOnOpen);
            return;
        }
        return (0, queueMicrotask_1.default)(() => this.emit('close'));
    }
    // Since Node 18, there is only a getter for '.closed'.
    // The first branch mimics other setters from Writable.
    // See https://github.com/nodejs/node/blob/v18.0.0/lib/internal/streams/writable.js#L766
    if (typeof ((_a = this._writableState) === null || _a === void 0 ? void 0 : _a.closed) === 'boolean') {
        this._writableState.closed = true;
    }
    else {
        this.closed = true;
    }
    this._vol.close(this.fd, er => {
        if (er)
            this.emit('error', er);
        else
            this.emit('close');
    });
    this.fd = null;
};
FsWriteStream.prototype._destroy = FsReadStream.prototype._destroy;
// There is no shutdown() for files.
FsWriteStream.prototype.destroySoon = FsWriteStream.prototype.end;
// ---------------------------------------- FSWatcher
class FSWatcher extends events_1.EventEmitter {
    constructor(vol) {
        super();
        this._filename = '';
        this._filenameEncoded = '';
        // _persistent: boolean = true;
        this._recursive = false;
        this._encoding = encoding_1.ENCODING_UTF8;
        // inode -> removers
        this._listenerRemovers = new Map();
        this._onParentChild = (link) => {
            if (link.getName() === this._getName()) {
                this._emit('rename');
            }
        };
        this._emit = (type) => {
            this.emit('change', type, this._filenameEncoded);
        };
        this._persist = () => {
            this._timer = setTimeout(this._persist, 1e6);
        };
        this._vol = vol;
        // TODO: Emit "error" messages when watching.
        // this._handle.onchange = function(status, eventType, filename) {
        //     if (status < 0) {
        //         self._handle.close();
        //         const error = !filename ?
        //             errnoException(status, 'Error watching file for changes:') :
        //             errnoException(status, `Error watching file ${filename} for changes:`);
        //         error.filename = filename;
        //         self.emit('error', error);
        //     } else {
        //         self.emit('change', eventType, filename);
        //     }
        // };
    }
    _getName() {
        return this._steps[this._steps.length - 1];
    }
    start(path, persistent = true, recursive = false, encoding = encoding_1.ENCODING_UTF8) {
        this._filename = (0, util_1.pathToFilename)(path);
        this._steps = (0, util_2.filenameToSteps)(this._filename);
        this._filenameEncoded = (0, encoding_1.strToEncoding)(this._filename);
        // this._persistent = persistent;
        this._recursive = recursive;
        this._encoding = encoding;
        try {
            this._link = this._vol._core.getLinkOrThrow(this._filename, 'FSWatcher');
        }
        catch (err) {
            const error = new Error(`watch ${this._filename} ${err.code}`);
            error.code = err.code;
            error.errno = err.code;
            throw error;
        }
        const watchLinkNodeChanged = (link) => {
            var _a;
            const filepath = link.getPath();
            const node = link.getNode();
            const onNodeChange = () => {
                let filename = relative(this._filename, filepath);
                if (!filename) {
                    filename = this._getName();
                }
                return this.emit('change', 'change', filename);
            };
            node.on('change', onNodeChange);
            const removers = (_a = this._listenerRemovers.get(node.ino)) !== null && _a !== void 0 ? _a : [];
            removers.push(() => node.removeListener('change', onNodeChange));
            this._listenerRemovers.set(node.ino, removers);
        };
        const watchLinkChildrenChanged = (link) => {
            var _a;
            const node = link.getNode();
            // when a new link added
            const onLinkChildAdd = (l) => {
                this.emit('change', 'rename', relative(this._filename, l.getPath()));
                // 1. watch changes of the new link-node
                watchLinkNodeChanged(l);
                // 2. watch changes of the new link-node's children
                watchLinkChildrenChanged(l);
            };
            // when a new link deleted
            const onLinkChildDelete = (l) => {
                // remove the listeners of the children nodes
                const removeLinkNodeListeners = (curLink) => {
                    const ino = curLink.getNode().ino;
                    const removers = this._listenerRemovers.get(ino);
                    if (removers) {
                        removers.forEach(r => r());
                        this._listenerRemovers.delete(ino);
                    }
                    for (const [name, childLink] of curLink.children.entries()) {
                        if (childLink && name !== '.' && name !== '..') {
                            removeLinkNodeListeners(childLink);
                        }
                    }
                };
                removeLinkNodeListeners(l);
                this.emit('change', 'rename', relative(this._filename, l.getPath()));
            };
            // children nodes changed
            for (const [name, childLink] of link.children.entries()) {
                if (childLink && name !== '.' && name !== '..') {
                    watchLinkNodeChanged(childLink);
                }
            }
            // link children add/remove
            link.on('child:add', onLinkChildAdd);
            link.on('child:delete', onLinkChildDelete);
            const removers = (_a = this._listenerRemovers.get(node.ino)) !== null && _a !== void 0 ? _a : [];
            removers.push(() => {
                link.removeListener('child:add', onLinkChildAdd);
                link.removeListener('child:delete', onLinkChildDelete);
            });
            if (recursive) {
                for (const [name, childLink] of link.children.entries()) {
                    if (childLink && name !== '.' && name !== '..') {
                        watchLinkChildrenChanged(childLink);
                    }
                }
            }
        };
        watchLinkNodeChanged(this._link);
        watchLinkChildrenChanged(this._link);
        const parent = this._link.parent;
        if (parent) {
            // parent.on('child:add', this._onParentChild);
            parent.setMaxListeners(parent.getMaxListeners() + 1);
            parent.on('child:delete', this._onParentChild);
        }
        if (persistent)
            this._persist();
    }
    close() {
        clearTimeout(this._timer);
        this._listenerRemovers.forEach(removers => {
            removers.forEach(r => r());
        });
        this._listenerRemovers.clear();
        const parent = this._link.parent;
        if (parent) {
            // parent.removeListener('child:add', this._onParentChild);
            parent.removeListener('child:delete', this._onParentChild);
        }
    }
}
exports.FSWatcher = FSWatcher;
//# sourceMappingURL=volume.js.map

/***/ }),

/***/ 38874:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.toTreeSync = void 0;
const tree_dump_1 = __webpack_require__(10661);
const util_1 = __webpack_require__(86462);
const toTreeSync = (fs, opts = {}) => {
    var _a;
    const separator = opts.separator || '/';
    let dir = opts.dir || separator;
    if (dir[dir.length - 1] !== separator)
        dir += separator;
    const tab = opts.tab || '';
    const depth = (_a = opts.depth) !== null && _a !== void 0 ? _a : 10;
    let subtree = ' (...)';
    if (depth > 0) {
        const list = fs.readdirSync(dir, { withFileTypes: true });
        subtree = (0, tree_dump_1.printTree)(tab, list.map(entry => tab => {
            if (entry.isDirectory()) {
                return (0, exports.toTreeSync)(fs, { dir: dir + entry.name, depth: depth - 1, tab });
            }
            else if (entry.isSymbolicLink()) {
                return '' + entry.name + ' → ' + fs.readlinkSync(dir + entry.name);
            }
            else {
                return '' + entry.name;
            }
        }));
    }
    const base = (0, util_1.basename)(dir, separator) + separator;
    return base + subtree;
};
exports.toTreeSync = toTreeSync;
//# sourceMappingURL=index.js.map

/***/ }),

/***/ 98371:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Here we mock the global `process` variable in case we are not in Node's environment.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.createProcess = createProcess;
/**
 * Looks to return a `process` object, if one is available.
 *
 * The global `process` is returned if defined;
 * otherwise `require('process')` is attempted.
 *
 * If that fails, `undefined` is returned.
 *
 * @return {IProcess | undefined}
 */
const maybeReturnProcess = () => {
    if (typeof process !== 'undefined') {
        return process;
    }
    try {
        return __webpack_require__(932);
    }
    catch (_a) {
        return undefined;
    }
};
function createProcess() {
    const p = maybeReturnProcess() || {};
    if (!p.cwd)
        p.cwd = () => '/';
    if (!p.emitWarning)
        p.emitWarning = (message, type) => {
            // tslint:disable-next-line:no-console
            console.warn(`${type}${type ? ': ' : ''}${message}`);
        };
    if (!p.env)
        p.env = {};
    return p;
}
exports["default"] = createProcess();
//# sourceMappingURL=process.js.map

/***/ }),

/***/ 34412:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports["default"] = typeof queueMicrotask === 'function' ? queueMicrotask : (cb => Promise.resolve()
    .then(() => cb())
    .catch(() => { }));
//# sourceMappingURL=queueMicrotask.js.map

/***/ }),

/***/ 12891:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
/**
 * `setTimeoutUnref` is just like `setTimeout`,
 * only in Node's environment it will "unref" its macro task.
 */
function setTimeoutUnref(callback, time, args) {
    const ref = setTimeout.apply(typeof globalThis !== 'undefined' ? globalThis : global, arguments);
    if (ref && typeof ref === 'object' && typeof ref.unref === 'function')
        ref.unref();
    return ref;
}
exports["default"] = setTimeoutUnref;
//# sourceMappingURL=setTimeoutUnref.js.map

/***/ }),

/***/ 49761:
/***/ ((module) => {



const refs = {
  exit: [],
  beforeExit: []
}
const functions = {
  exit: onExit,
  beforeExit: onBeforeExit
}

let registry

function ensureRegistry () {
  if (registry === undefined) {
    registry = new FinalizationRegistry(clear)
  }
}

function install (event) {
  if (refs[event].length > 0) {
    return
  }

  process.on(event, functions[event])
}

function uninstall (event) {
  if (refs[event].length > 0) {
    return
  }
  process.removeListener(event, functions[event])
  if (refs.exit.length === 0 && refs.beforeExit.length === 0) {
    registry = undefined
  }
}

function onExit () {
  callRefs('exit')
}

function onBeforeExit () {
  callRefs('beforeExit')
}

function callRefs (event) {
  for (const ref of refs[event]) {
    const obj = ref.deref()
    const fn = ref.fn

    // This should always happen, however GC is
    // undeterministic so it might not happen.
    /* istanbul ignore else */
    if (obj !== undefined) {
      fn(obj, event)
    }
  }
  refs[event] = []
}

function clear (ref) {
  for (const event of ['exit', 'beforeExit']) {
    const index = refs[event].indexOf(ref)
    refs[event].splice(index, index + 1)
    uninstall(event)
  }
}

function _register (event, obj, fn) {
  if (obj === undefined) {
    throw new Error('the object can\'t be undefined')
  }
  install(event)
  const ref = new WeakRef(obj)
  ref.fn = fn

  ensureRegistry()
  registry.register(obj, ref)
  refs[event].push(ref)
}

function register (obj, fn) {
  _register('exit', obj, fn)
}

function registerBeforeExit (obj, fn) {
  _register('beforeExit', obj, fn)
}

function unregister (obj) {
  if (registry === undefined) {
    return
  }
  registry.unregister(obj)
  for (const event of ['exit', 'beforeExit']) {
    refs[event] = refs[event].filter((ref) => {
      const _obj = ref.deref()
      return _obj && _obj !== obj
    })
    uninstall(event)
  }
}

module.exports = {
  register,
  registerBeforeExit,
  unregister
}


/***/ }),

/***/ 6868:
/***/ ((module) => {


function tryStringify (o) {
  try { return JSON.stringify(o) } catch(e) { return '"[Circular]"' }
}

module.exports = format

function format(f, args, opts) {
  var ss = (opts && opts.stringify) || tryStringify
  var offset = 1
  if (typeof f === 'object' && f !== null) {
    var len = args.length + offset
    if (len === 1) return f
    var objects = new Array(len)
    objects[0] = ss(f)
    for (var index = 1; index < len; index++) {
      objects[index] = ss(args[index])
    }
    return objects.join(' ')
  }
  if (typeof f !== 'string') {
    return f
  }
  var argLen = args.length
  if (argLen === 0) return f
  var str = ''
  var a = 1 - offset
  var lastPos = -1
  var flen = (f && f.length) || 0
  for (var i = 0; i < flen;) {
    if (f.charCodeAt(i) === 37 && i + 1 < flen) {
      lastPos = lastPos > -1 ? lastPos : 0
      switch (f.charCodeAt(i + 1)) {
        case 100: // 'd'
        case 102: // 'f'
          if (a >= argLen)
            break
          if (args[a] == null)  break
          if (lastPos < i)
            str += f.slice(lastPos, i)
          str += Number(args[a])
          lastPos = i + 2
          i++
          break
        case 105: // 'i'
          if (a >= argLen)
            break
          if (args[a] == null)  break
          if (lastPos < i)
            str += f.slice(lastPos, i)
          str += Math.floor(Number(args[a]))
          lastPos = i + 2
          i++
          break
        case 79: // 'O'
        case 111: // 'o'
        case 106: // 'j'
          if (a >= argLen)
            break
          if (args[a] === undefined) break
          if (lastPos < i)
            str += f.slice(lastPos, i)
          var type = typeof args[a]
          if (type === 'string') {
            str += '\'' + args[a] + '\''
            lastPos = i + 2
            i++
            break
          }
          if (type === 'function') {
            str += args[a].name || '<anonymous>'
            lastPos = i + 2
            i++
            break
          }
          str += ss(args[a])
          lastPos = i + 2
          i++
          break
        case 115: // 's'
          if (a >= argLen)
            break
          if (lastPos < i)
            str += f.slice(lastPos, i)
          str += String(args[a])
          lastPos = i + 2
          i++
          break
        case 37: // '%'
          if (lastPos < i)
            str += f.slice(lastPos, i)
          str += '%'
          lastPos = i + 2
          i++
          a--
          break
      }
      ++a
    }
    ++i
  }
  if (lastPos === -1)
    return f
  else if (lastPos < flen) {
    str += f.slice(lastPos)
  }

  return str
}


/***/ }),

/***/ 37467:
/***/ ((module, exports) => {



const { hasOwnProperty } = Object.prototype

const stringify = configure()

// @ts-expect-error
stringify.configure = configure
// @ts-expect-error
stringify.stringify = stringify

// @ts-expect-error
stringify.default = stringify

// @ts-expect-error used for named export
exports.stringify = stringify
// @ts-expect-error used for named export
exports.configure = configure

module.exports = stringify

// eslint-disable-next-line no-control-regex
const strEscapeSequencesRegExp = /[\u0000-\u001f\u0022\u005c\ud800-\udfff]/

// Escape C0 control characters, double quotes, the backslash and every code
// unit with a numeric value in the inclusive range 0xD800 to 0xDFFF.
function strEscape (str) {
  // Some magic numbers that worked out fine while benchmarking with v8 8.0
  if (str.length < 5000 && !strEscapeSequencesRegExp.test(str)) {
    return `"${str}"`
  }
  return JSON.stringify(str)
}

function sort (array, comparator) {
  // Insertion sort is very efficient for small input sizes, but it has a bad
  // worst case complexity. Thus, use native array sort for bigger values.
  if (array.length > 2e2 || comparator) {
    return array.sort(comparator)
  }
  for (let i = 1; i < array.length; i++) {
    const currentValue = array[i]
    let position = i
    while (position !== 0 && array[position - 1] > currentValue) {
      array[position] = array[position - 1]
      position--
    }
    array[position] = currentValue
  }
  return array
}

const typedArrayPrototypeGetSymbolToStringTag =
  Object.getOwnPropertyDescriptor(
    Object.getPrototypeOf(
      Object.getPrototypeOf(
        new Int8Array()
      )
    ),
    Symbol.toStringTag
  ).get

function isTypedArrayWithEntries (value) {
  return typedArrayPrototypeGetSymbolToStringTag.call(value) !== undefined && value.length !== 0
}

function stringifyTypedArray (array, separator, maximumBreadth) {
  if (array.length < maximumBreadth) {
    maximumBreadth = array.length
  }
  const whitespace = separator === ',' ? '' : ' '
  let res = `"0":${whitespace}${array[0]}`
  for (let i = 1; i < maximumBreadth; i++) {
    res += `${separator}"${i}":${whitespace}${array[i]}`
  }
  return res
}

function getCircularValueOption (options) {
  if (hasOwnProperty.call(options, 'circularValue')) {
    const circularValue = options.circularValue
    if (typeof circularValue === 'string') {
      return `"${circularValue}"`
    }
    if (circularValue == null) {
      return circularValue
    }
    if (circularValue === Error || circularValue === TypeError) {
      return {
        toString () {
          throw new TypeError('Converting circular structure to JSON')
        }
      }
    }
    throw new TypeError('The "circularValue" argument must be of type string or the value null or undefined')
  }
  return '"[Circular]"'
}

function getDeterministicOption (options) {
  let value
  if (hasOwnProperty.call(options, 'deterministic')) {
    value = options.deterministic
    if (typeof value !== 'boolean' && typeof value !== 'function') {
      throw new TypeError('The "deterministic" argument must be of type boolean or comparator function')
    }
  }
  return value === undefined ? true : value
}

function getBooleanOption (options, key) {
  let value
  if (hasOwnProperty.call(options, key)) {
    value = options[key]
    if (typeof value !== 'boolean') {
      throw new TypeError(`The "${key}" argument must be of type boolean`)
    }
  }
  return value === undefined ? true : value
}

function getPositiveIntegerOption (options, key) {
  let value
  if (hasOwnProperty.call(options, key)) {
    value = options[key]
    if (typeof value !== 'number') {
      throw new TypeError(`The "${key}" argument must be of type number`)
    }
    if (!Number.isInteger(value)) {
      throw new TypeError(`The "${key}" argument must be an integer`)
    }
    if (value < 1) {
      throw new RangeError(`The "${key}" argument must be >= 1`)
    }
  }
  return value === undefined ? Infinity : value
}

function getItemCount (number) {
  if (number === 1) {
    return '1 item'
  }
  return `${number} items`
}

function getUniqueReplacerSet (replacerArray) {
  const replacerSet = new Set()
  for (const value of replacerArray) {
    if (typeof value === 'string' || typeof value === 'number') {
      replacerSet.add(String(value))
    }
  }
  return replacerSet
}

function getStrictOption (options) {
  if (hasOwnProperty.call(options, 'strict')) {
    const value = options.strict
    if (typeof value !== 'boolean') {
      throw new TypeError('The "strict" argument must be of type boolean')
    }
    if (value) {
      return (value) => {
        let message = `Object can not safely be stringified. Received type ${typeof value}`
        if (typeof value !== 'function') message += ` (${value.toString()})`
        throw new Error(message)
      }
    }
  }
}

function configure (options) {
  options = { ...options }
  const fail = getStrictOption(options)
  if (fail) {
    if (options.bigint === undefined) {
      options.bigint = false
    }
    if (!('circularValue' in options)) {
      options.circularValue = Error
    }
  }
  const circularValue = getCircularValueOption(options)
  const bigint = getBooleanOption(options, 'bigint')
  const deterministic = getDeterministicOption(options)
  const comparator = typeof deterministic === 'function' ? deterministic : undefined
  const maximumDepth = getPositiveIntegerOption(options, 'maximumDepth')
  const maximumBreadth = getPositiveIntegerOption(options, 'maximumBreadth')

  function stringifyFnReplacer (key, parent, stack, replacer, spacer, indentation) {
    let value = parent[key]

    if (typeof value === 'object' && value !== null && typeof value.toJSON === 'function') {
      value = value.toJSON(key)
    }
    value = replacer.call(parent, key, value)

    switch (typeof value) {
      case 'string':
        return strEscape(value)
      case 'object': {
        if (value === null) {
          return 'null'
        }
        if (stack.indexOf(value) !== -1) {
          return circularValue
        }

        let res = ''
        let join = ','
        const originalIndentation = indentation

        if (Array.isArray(value)) {
          if (value.length === 0) {
            return '[]'
          }
          if (maximumDepth < stack.length + 1) {
            return '"[Array]"'
          }
          stack.push(value)
          if (spacer !== '') {
            indentation += spacer
            res += `\n${indentation}`
            join = `,\n${indentation}`
          }
          const maximumValuesToStringify = Math.min(value.length, maximumBreadth)
          let i = 0
          for (; i < maximumValuesToStringify - 1; i++) {
            const tmp = stringifyFnReplacer(String(i), value, stack, replacer, spacer, indentation)
            res += tmp !== undefined ? tmp : 'null'
            res += join
          }
          const tmp = stringifyFnReplacer(String(i), value, stack, replacer, spacer, indentation)
          res += tmp !== undefined ? tmp : 'null'
          if (value.length - 1 > maximumBreadth) {
            const removedKeys = value.length - maximumBreadth - 1
            res += `${join}"... ${getItemCount(removedKeys)} not stringified"`
          }
          if (spacer !== '') {
            res += `\n${originalIndentation}`
          }
          stack.pop()
          return `[${res}]`
        }

        let keys = Object.keys(value)
        const keyLength = keys.length
        if (keyLength === 0) {
          return '{}'
        }
        if (maximumDepth < stack.length + 1) {
          return '"[Object]"'
        }
        let whitespace = ''
        let separator = ''
        if (spacer !== '') {
          indentation += spacer
          join = `,\n${indentation}`
          whitespace = ' '
        }
        const maximumPropertiesToStringify = Math.min(keyLength, maximumBreadth)
        if (deterministic && !isTypedArrayWithEntries(value)) {
          keys = sort(keys, comparator)
        }
        stack.push(value)
        for (let i = 0; i < maximumPropertiesToStringify; i++) {
          const key = keys[i]
          const tmp = stringifyFnReplacer(key, value, stack, replacer, spacer, indentation)
          if (tmp !== undefined) {
            res += `${separator}${strEscape(key)}:${whitespace}${tmp}`
            separator = join
          }
        }
        if (keyLength > maximumBreadth) {
          const removedKeys = keyLength - maximumBreadth
          res += `${separator}"...":${whitespace}"${getItemCount(removedKeys)} not stringified"`
          separator = join
        }
        if (spacer !== '' && separator.length > 1) {
          res = `\n${indentation}${res}\n${originalIndentation}`
        }
        stack.pop()
        return `{${res}}`
      }
      case 'number':
        return isFinite(value) ? String(value) : fail ? fail(value) : 'null'
      case 'boolean':
        return value === true ? 'true' : 'false'
      case 'undefined':
        return undefined
      case 'bigint':
        if (bigint) {
          return String(value)
        }
        // fallthrough
      default:
        return fail ? fail(value) : undefined
    }
  }

  function stringifyArrayReplacer (key, value, stack, replacer, spacer, indentation) {
    if (typeof value === 'object' && value !== null && typeof value.toJSON === 'function') {
      value = value.toJSON(key)
    }

    switch (typeof value) {
      case 'string':
        return strEscape(value)
      case 'object': {
        if (value === null) {
          return 'null'
        }
        if (stack.indexOf(value) !== -1) {
          return circularValue
        }

        const originalIndentation = indentation
        let res = ''
        let join = ','

        if (Array.isArray(value)) {
          if (value.length === 0) {
            return '[]'
          }
          if (maximumDepth < stack.length + 1) {
            return '"[Array]"'
          }
          stack.push(value)
          if (spacer !== '') {
            indentation += spacer
            res += `\n${indentation}`
            join = `,\n${indentation}`
          }
          const maximumValuesToStringify = Math.min(value.length, maximumBreadth)
          let i = 0
          for (; i < maximumValuesToStringify - 1; i++) {
            const tmp = stringifyArrayReplacer(String(i), value[i], stack, replacer, spacer, indentation)
            res += tmp !== undefined ? tmp : 'null'
            res += join
          }
          const tmp = stringifyArrayReplacer(String(i), value[i], stack, replacer, spacer, indentation)
          res += tmp !== undefined ? tmp : 'null'
          if (value.length - 1 > maximumBreadth) {
            const removedKeys = value.length - maximumBreadth - 1
            res += `${join}"... ${getItemCount(removedKeys)} not stringified"`
          }
          if (spacer !== '') {
            res += `\n${originalIndentation}`
          }
          stack.pop()
          return `[${res}]`
        }
        stack.push(value)
        let whitespace = ''
        if (spacer !== '') {
          indentation += spacer
          join = `,\n${indentation}`
          whitespace = ' '
        }
        let separator = ''
        for (const key of replacer) {
          const tmp = stringifyArrayReplacer(key, value[key], stack, replacer, spacer, indentation)
          if (tmp !== undefined) {
            res += `${separator}${strEscape(key)}:${whitespace}${tmp}`
            separator = join
          }
        }
        if (spacer !== '' && separator.length > 1) {
          res = `\n${indentation}${res}\n${originalIndentation}`
        }
        stack.pop()
        return `{${res}}`
      }
      case 'number':
        return isFinite(value) ? String(value) : fail ? fail(value) : 'null'
      case 'boolean':
        return value === true ? 'true' : 'false'
      case 'undefined':
        return undefined
      case 'bigint':
        if (bigint) {
          return String(value)
        }
        // fallthrough
      default:
        return fail ? fail(value) : undefined
    }
  }

  function stringifyIndent (key, value, stack, spacer, indentation) {
    switch (typeof value) {
      case 'string':
        return strEscape(value)
      case 'object': {
        if (value === null) {
          return 'null'
        }
        if (typeof value.toJSON === 'function') {
          value = value.toJSON(key)
          // Prevent calling `toJSON` again.
          if (typeof value !== 'object') {
            return stringifyIndent(key, value, stack, spacer, indentation)
          }
          if (value === null) {
            return 'null'
          }
        }
        if (stack.indexOf(value) !== -1) {
          return circularValue
        }
        const originalIndentation = indentation

        if (Array.isArray(value)) {
          if (value.length === 0) {
            return '[]'
          }
          if (maximumDepth < stack.length + 1) {
            return '"[Array]"'
          }
          stack.push(value)
          indentation += spacer
          let res = `\n${indentation}`
          const join = `,\n${indentation}`
          const maximumValuesToStringify = Math.min(value.length, maximumBreadth)
          let i = 0
          for (; i < maximumValuesToStringify - 1; i++) {
            const tmp = stringifyIndent(String(i), value[i], stack, spacer, indentation)
            res += tmp !== undefined ? tmp : 'null'
            res += join
          }
          const tmp = stringifyIndent(String(i), value[i], stack, spacer, indentation)
          res += tmp !== undefined ? tmp : 'null'
          if (value.length - 1 > maximumBreadth) {
            const removedKeys = value.length - maximumBreadth - 1
            res += `${join}"... ${getItemCount(removedKeys)} not stringified"`
          }
          res += `\n${originalIndentation}`
          stack.pop()
          return `[${res}]`
        }

        let keys = Object.keys(value)
        const keyLength = keys.length
        if (keyLength === 0) {
          return '{}'
        }
        if (maximumDepth < stack.length + 1) {
          return '"[Object]"'
        }
        indentation += spacer
        const join = `,\n${indentation}`
        let res = ''
        let separator = ''
        let maximumPropertiesToStringify = Math.min(keyLength, maximumBreadth)
        if (isTypedArrayWithEntries(value)) {
          res += stringifyTypedArray(value, join, maximumBreadth)
          keys = keys.slice(value.length)
          maximumPropertiesToStringify -= value.length
          separator = join
        }
        if (deterministic) {
          keys = sort(keys, comparator)
        }
        stack.push(value)
        for (let i = 0; i < maximumPropertiesToStringify; i++) {
          const key = keys[i]
          const tmp = stringifyIndent(key, value[key], stack, spacer, indentation)
          if (tmp !== undefined) {
            res += `${separator}${strEscape(key)}: ${tmp}`
            separator = join
          }
        }
        if (keyLength > maximumBreadth) {
          const removedKeys = keyLength - maximumBreadth
          res += `${separator}"...": "${getItemCount(removedKeys)} not stringified"`
          separator = join
        }
        if (separator !== '') {
          res = `\n${indentation}${res}\n${originalIndentation}`
        }
        stack.pop()
        return `{${res}}`
      }
      case 'number':
        return isFinite(value) ? String(value) : fail ? fail(value) : 'null'
      case 'boolean':
        return value === true ? 'true' : 'false'
      case 'undefined':
        return undefined
      case 'bigint':
        if (bigint) {
          return String(value)
        }
        // fallthrough
      default:
        return fail ? fail(value) : undefined
    }
  }

  function stringifySimple (key, value, stack) {
    switch (typeof value) {
      case 'string':
        return strEscape(value)
      case 'object': {
        if (value === null) {
          return 'null'
        }
        if (typeof value.toJSON === 'function') {
          value = value.toJSON(key)
          // Prevent calling `toJSON` again
          if (typeof value !== 'object') {
            return stringifySimple(key, value, stack)
          }
          if (value === null) {
            return 'null'
          }
        }
        if (stack.indexOf(value) !== -1) {
          return circularValue
        }

        let res = ''

        const hasLength = value.length !== undefined
        if (hasLength && Array.isArray(value)) {
          if (value.length === 0) {
            return '[]'
          }
          if (maximumDepth < stack.length + 1) {
            return '"[Array]"'
          }
          stack.push(value)
          const maximumValuesToStringify = Math.min(value.length, maximumBreadth)
          let i = 0
          for (; i < maximumValuesToStringify - 1; i++) {
            const tmp = stringifySimple(String(i), value[i], stack)
            res += tmp !== undefined ? tmp : 'null'
            res += ','
          }
          const tmp = stringifySimple(String(i), value[i], stack)
          res += tmp !== undefined ? tmp : 'null'
          if (value.length - 1 > maximumBreadth) {
            const removedKeys = value.length - maximumBreadth - 1
            res += `,"... ${getItemCount(removedKeys)} not stringified"`
          }
          stack.pop()
          return `[${res}]`
        }

        let keys = Object.keys(value)
        const keyLength = keys.length
        if (keyLength === 0) {
          return '{}'
        }
        if (maximumDepth < stack.length + 1) {
          return '"[Object]"'
        }
        let separator = ''
        let maximumPropertiesToStringify = Math.min(keyLength, maximumBreadth)
        if (hasLength && isTypedArrayWithEntries(value)) {
          res += stringifyTypedArray(value, ',', maximumBreadth)
          keys = keys.slice(value.length)
          maximumPropertiesToStringify -= value.length
          separator = ','
        }
        if (deterministic) {
          keys = sort(keys, comparator)
        }
        stack.push(value)
        for (let i = 0; i < maximumPropertiesToStringify; i++) {
          const key = keys[i]
          const tmp = stringifySimple(key, value[key], stack)
          if (tmp !== undefined) {
            res += `${separator}${strEscape(key)}:${tmp}`
            separator = ','
          }
        }
        if (keyLength > maximumBreadth) {
          const removedKeys = keyLength - maximumBreadth
          res += `${separator}"...":"${getItemCount(removedKeys)} not stringified"`
        }
        stack.pop()
        return `{${res}}`
      }
      case 'number':
        return isFinite(value) ? String(value) : fail ? fail(value) : 'null'
      case 'boolean':
        return value === true ? 'true' : 'false'
      case 'undefined':
        return undefined
      case 'bigint':
        if (bigint) {
          return String(value)
        }
        // fallthrough
      default:
        return fail ? fail(value) : undefined
    }
  }

  function stringify (value, replacer, space) {
    if (arguments.length > 1) {
      let spacer = ''
      if (typeof space === 'number') {
        spacer = ' '.repeat(Math.min(space, 10))
      } else if (typeof space === 'string') {
        spacer = space.slice(0, 10)
      }
      if (replacer != null) {
        if (typeof replacer === 'function') {
          return stringifyFnReplacer('', { '': value }, [], replacer, spacer, '')
        }
        if (Array.isArray(replacer)) {
          return stringifyArrayReplacer('', value, [], getUniqueReplacerSet(replacer), spacer, '')
        }
      }
      if (spacer.length !== 0) {
        return stringifyIndent('', value, [], spacer, '')
      }
    }
    return stringifySimple('', value, [])
  }

  return stringify
}


/***/ }),

/***/ 89379:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



const ANY = Symbol('SemVer ANY')
// hoisted class for cyclic dependency
class Comparator {
  static get ANY () {
    return ANY
  }

  constructor (comp, options) {
    options = parseOptions(options)

    if (comp instanceof Comparator) {
      if (comp.loose === !!options.loose) {
        return comp
      } else {
        comp = comp.value
      }
    }

    comp = comp.trim().split(/\s+/).join(' ')
    debug('comparator', comp, options)
    this.options = options
    this.loose = !!options.loose
    this.parse(comp)

    if (this.semver === ANY) {
      this.value = ''
    } else {
      this.value = this.operator + this.semver.version
    }

    debug('comp', this)
  }

  parse (comp) {
    const r = this.options.loose ? re[t.COMPARATORLOOSE] : re[t.COMPARATOR]
    const m = comp.match(r)

    if (!m) {
      throw new TypeError(`Invalid comparator: ${comp}`)
    }

    this.operator = m[1] !== undefined ? m[1] : ''
    if (this.operator === '=') {
      this.operator = ''
    }

    // if it literally is just '>' or '' then allow anything.
    if (!m[2]) {
      this.semver = ANY
    } else {
      this.semver = new SemVer(m[2], this.options.loose)
    }
  }

  toString () {
    return this.value
  }

  test (version) {
    debug('Comparator.test', version, this.options.loose)

    if (this.semver === ANY || version === ANY) {
      return true
    }

    if (typeof version === 'string') {
      try {
        version = new SemVer(version, this.options)
      } catch (er) {
        return false
      }
    }

    return cmp(version, this.operator, this.semver, this.options)
  }

  intersects (comp, options) {
    if (!(comp instanceof Comparator)) {
      throw new TypeError('a Comparator is required')
    }

    if (this.operator === '') {
      if (this.value === '') {
        return true
      }
      return new Range(comp.value, options).test(this.value)
    } else if (comp.operator === '') {
      if (comp.value === '') {
        return true
      }
      return new Range(this.value, options).test(comp.semver)
    }

    options = parseOptions(options)

    // Special cases where nothing can possibly be lower
    if (options.includePrerelease &&
      (this.value === '<0.0.0-0' || comp.value === '<0.0.0-0')) {
      return false
    }
    if (!options.includePrerelease &&
      (this.value.startsWith('<0.0.0') || comp.value.startsWith('<0.0.0'))) {
      return false
    }

    // Same direction increasing (> or >=)
    if (this.operator.startsWith('>') && comp.operator.startsWith('>')) {
      return true
    }
    // Same direction decreasing (< or <=)
    if (this.operator.startsWith('<') && comp.operator.startsWith('<')) {
      return true
    }
    // same SemVer and both sides are inclusive (<= or >=)
    if (
      (this.semver.version === comp.semver.version) &&
      this.operator.includes('=') && comp.operator.includes('=')) {
      return true
    }
    // opposite directions less than
    if (cmp(this.semver, '<', comp.semver, options) &&
      this.operator.startsWith('>') && comp.operator.startsWith('<')) {
      return true
    }
    // opposite directions greater than
    if (cmp(this.semver, '>', comp.semver, options) &&
      this.operator.startsWith('<') && comp.operator.startsWith('>')) {
      return true
    }
    return false
  }
}

module.exports = Comparator

const parseOptions = __webpack_require__(70356)
const { safeRe: re, t } = __webpack_require__(95471)
const cmp = __webpack_require__(28646)
const debug = __webpack_require__(1159)
const SemVer = __webpack_require__(7163)
const Range = __webpack_require__(96782)


/***/ }),

/***/ 96782:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



const SPACE_CHARACTERS = /\s+/g

// hoisted class for cyclic dependency
class Range {
  constructor (range, options) {
    options = parseOptions(options)

    if (range instanceof Range) {
      if (
        range.loose === !!options.loose &&
        range.includePrerelease === !!options.includePrerelease
      ) {
        return range
      } else {
        return new Range(range.raw, options)
      }
    }

    if (range instanceof Comparator) {
      // just put it in the set and return
      this.raw = range.value
      this.set = [[range]]
      this.formatted = undefined
      return this
    }

    this.options = options
    this.loose = !!options.loose
    this.includePrerelease = !!options.includePrerelease

    // First reduce all whitespace as much as possible so we do not have to rely
    // on potentially slow regexes like \s*. This is then stored and used for
    // future error messages as well.
    this.raw = range.trim().replace(SPACE_CHARACTERS, ' ')

    // First, split on ||
    this.set = this.raw
      .split('||')
      // map the range to a 2d array of comparators
      .map(r => this.parseRange(r.trim()))
      // throw out any comparator lists that are empty
      // this generally means that it was not a valid range, which is allowed
      // in loose mode, but will still throw if the WHOLE range is invalid.
      .filter(c => c.length)

    if (!this.set.length) {
      throw new TypeError(`Invalid SemVer Range: ${this.raw}`)
    }

    // if we have any that are not the null set, throw out null sets.
    if (this.set.length > 1) {
      // keep the first one, in case they're all null sets
      const first = this.set[0]
      this.set = this.set.filter(c => !isNullSet(c[0]))
      if (this.set.length === 0) {
        this.set = [first]
      } else if (this.set.length > 1) {
        // if we have any that are *, then the range is just *
        for (const c of this.set) {
          if (c.length === 1 && isAny(c[0])) {
            this.set = [c]
            break
          }
        }
      }
    }

    this.formatted = undefined
  }

  get range () {
    if (this.formatted === undefined) {
      this.formatted = ''
      for (let i = 0; i < this.set.length; i++) {
        if (i > 0) {
          this.formatted += '||'
        }
        const comps = this.set[i]
        for (let k = 0; k < comps.length; k++) {
          if (k > 0) {
            this.formatted += ' '
          }
          this.formatted += comps[k].toString().trim()
        }
      }
    }
    return this.formatted
  }

  format () {
    return this.range
  }

  toString () {
    return this.range
  }

  parseRange (range) {
    // strip build metadata so it can't bleed into the version
    range = range.replace(BUILDSTRIPRE, '')

    // memoize range parsing for performance.
    // this is a very hot path, and fully deterministic.
    const memoOpts =
      (this.options.includePrerelease && FLAG_INCLUDE_PRERELEASE) |
      (this.options.loose && FLAG_LOOSE)
    const memoKey = memoOpts + ':' + range
    const cached = cache.get(memoKey)
    if (cached) {
      return cached
    }

    const loose = this.options.loose
    // `1.2.3 - 1.2.4` => `>=1.2.3 <=1.2.4`
    const hr = loose ? re[t.HYPHENRANGELOOSE] : re[t.HYPHENRANGE]
    range = range.replace(hr, hyphenReplace(this.options.includePrerelease))
    debug('hyphen replace', range)

    // `> 1.2.3 < 1.2.5` => `>1.2.3 <1.2.5`
    range = range.replace(re[t.COMPARATORTRIM], comparatorTrimReplace)
    debug('comparator trim', range)

    // `~ 1.2.3` => `~1.2.3`
    range = range.replace(re[t.TILDETRIM], tildeTrimReplace)
    debug('tilde trim', range)

    // `^ 1.2.3` => `^1.2.3`
    range = range.replace(re[t.CARETTRIM], caretTrimReplace)
    debug('caret trim', range)

    // At this point, the range is completely trimmed and
    // ready to be split into comparators.

    let rangeList = range
      .split(' ')
      .map(comp => parseComparator(comp, this.options))
      .join(' ')
      .split(/\s+/)
      // >=0.0.0 is equivalent to *
      .map(comp => replaceGTE0(comp, this.options))

    if (loose) {
      // in loose mode, throw out any that are not valid comparators
      rangeList = rangeList.filter(comp => {
        debug('loose invalid filter', comp, this.options)
        return !!comp.match(re[t.COMPARATORLOOSE])
      })
    }
    debug('range list', rangeList)

    // if any comparators are the null set, then replace with JUST null set
    // if more than one comparator, remove any * comparators
    // also, don't include the same comparator more than once
    const rangeMap = new Map()
    const comparators = rangeList.map(comp => new Comparator(comp, this.options))
    for (const comp of comparators) {
      if (isNullSet(comp)) {
        return [comp]
      }
      rangeMap.set(comp.value, comp)
    }
    if (rangeMap.size > 1 && rangeMap.has('')) {
      rangeMap.delete('')
    }

    const result = [...rangeMap.values()]
    cache.set(memoKey, result)
    return result
  }

  intersects (range, options) {
    if (!(range instanceof Range)) {
      throw new TypeError('a Range is required')
    }

    return this.set.some((thisComparators) => {
      return (
        isSatisfiable(thisComparators, options) &&
        range.set.some((rangeComparators) => {
          return (
            isSatisfiable(rangeComparators, options) &&
            thisComparators.every((thisComparator) => {
              return rangeComparators.every((rangeComparator) => {
                return thisComparator.intersects(rangeComparator, options)
              })
            })
          )
        })
      )
    })
  }

  // if ANY of the sets match ALL of its comparators, then pass
  test (version) {
    if (!version) {
      return false
    }

    if (typeof version === 'string') {
      try {
        version = new SemVer(version, this.options)
      } catch (er) {
        return false
      }
    }

    for (let i = 0; i < this.set.length; i++) {
      if (testSet(this.set[i], version, this.options)) {
        return true
      }
    }
    return false
  }
}

module.exports = Range

const LRU = __webpack_require__(61383)
const cache = new LRU()

const parseOptions = __webpack_require__(70356)
const Comparator = __webpack_require__(89379)
const debug = __webpack_require__(1159)
const SemVer = __webpack_require__(7163)
const {
  safeRe: re,
  src,
  t,
  comparatorTrimReplace,
  tildeTrimReplace,
  caretTrimReplace,
} = __webpack_require__(95471)
const { FLAG_INCLUDE_PRERELEASE, FLAG_LOOSE } = __webpack_require__(45101)

// unbounded global build-metadata stripper used by parseRange
const BUILDSTRIPRE = new RegExp(src[t.BUILD], 'g')

const isNullSet = c => c.value === '<0.0.0-0'
const isAny = c => c.value === ''

// take a set of comparators and determine whether there
// exists a version which can satisfy it
const isSatisfiable = (comparators, options) => {
  let result = true
  const remainingComparators = comparators.slice()
  let testComparator = remainingComparators.pop()

  while (result && remainingComparators.length) {
    result = remainingComparators.every((otherComparator) => {
      return testComparator.intersects(otherComparator, options)
    })

    testComparator = remainingComparators.pop()
  }

  return result
}

// comprised of xranges, tildes, stars, and gtlt's at this point.
// already replaced the hyphen ranges
// turn into a set of JUST comparators.
const parseComparator = (comp, options) => {
  comp = comp.replace(re[t.BUILD], '')
  debug('comp', comp, options)
  comp = replaceCarets(comp, options)
  debug('caret', comp)
  comp = replaceTildes(comp, options)
  debug('tildes', comp)
  comp = replaceXRanges(comp, options)
  debug('xrange', comp)
  comp = replaceStars(comp, options)
  debug('stars', comp)
  return comp
}

const isX = id => !id || id.toLowerCase() === 'x' || id === '*'

const invalidXRangeOrder = (M, m, p) => (
  (isX(M) && !isX(m)) ||
  (isX(m) && p && !isX(p))
)

// ~, ~> --> * (any, kinda silly)
// ~2, ~2.x, ~2.x.x, ~>2, ~>2.x ~>2.x.x --> >=2.0.0 <3.0.0-0
// ~2.0, ~2.0.x, ~>2.0, ~>2.0.x --> >=2.0.0 <2.1.0-0
// ~1.2, ~1.2.x, ~>1.2, ~>1.2.x --> >=1.2.0 <1.3.0-0
// ~1.2.3, ~>1.2.3 --> >=1.2.3 <1.3.0-0
// ~1.2.0, ~>1.2.0 --> >=1.2.0 <1.3.0-0
// ~0.0.1 --> >=0.0.1 <0.1.0-0
const replaceTildes = (comp, options) => {
  return comp
    .trim()
    .split(/\s+/)
    .map((c) => replaceTilde(c, options))
    .join(' ')
}

const replaceTilde = (comp, options) => {
  const r = options.loose ? re[t.TILDELOOSE] : re[t.TILDE]
  // if we're including prereleases in the match, then the lower bound is
  // -0, the lowest possible prerelease value, just like x-ranges and carets.
  // this keeps `~1.2` equivalent to the `1.2.x` x-range it's documented as.
  const z = options.includePrerelease ? '-0' : ''
  return comp.replace(r, (_, M, m, p, pr) => {
    debug('tilde', comp, _, M, m, p, pr)
    let ret

    if (isX(M)) {
      ret = ''
    } else if (isX(m)) {
      ret = `>=${M}.0.0${z} <${+M + 1}.0.0-0`
    } else if (isX(p)) {
      // ~1.2 == >=1.2.0 <1.3.0-0
      ret = `>=${M}.${m}.0${z} <${M}.${+m + 1}.0-0`
    } else if (pr) {
      debug('replaceTilde pr', pr)
      ret = `>=${M}.${m}.${p}-${pr
      } <${M}.${+m + 1}.0-0`
    } else {
      // ~1.2.3 == >=1.2.3 <1.3.0-0
      ret = `>=${M}.${m}.${p
      } <${M}.${+m + 1}.0-0`
    }

    debug('tilde return', ret)
    return ret
  })
}

// ^ --> * (any, kinda silly)
// ^2, ^2.x, ^2.x.x --> >=2.0.0 <3.0.0-0
// ^2.0, ^2.0.x --> >=2.0.0 <3.0.0-0
// ^1.2, ^1.2.x --> >=1.2.0 <2.0.0-0
// ^1.2.3 --> >=1.2.3 <2.0.0-0
// ^1.2.0 --> >=1.2.0 <2.0.0-0
// ^0.0.1 --> >=0.0.1 <0.0.2-0
// ^0.1.0 --> >=0.1.0 <0.2.0-0
const replaceCarets = (comp, options) => {
  return comp
    .trim()
    .split(/\s+/)
    .map((c) => replaceCaret(c, options))
    .join(' ')
}

const replaceCaret = (comp, options) => {
  debug('caret', comp, options)
  const r = options.loose ? re[t.CARETLOOSE] : re[t.CARET]
  const z = options.includePrerelease ? '-0' : ''
  return comp.replace(r, (_, M, m, p, pr) => {
    debug('caret', comp, _, M, m, p, pr)
    let ret

    if (isX(M)) {
      ret = ''
    } else if (isX(m)) {
      ret = `>=${M}.0.0${z} <${+M + 1}.0.0-0`
    } else if (isX(p)) {
      if (M === '0') {
        ret = `>=${M}.${m}.0${z} <${M}.${+m + 1}.0-0`
      } else {
        ret = `>=${M}.${m}.0${z} <${+M + 1}.0.0-0`
      }
    } else if (pr) {
      debug('replaceCaret pr', pr)
      if (M === '0') {
        if (m === '0') {
          ret = `>=${M}.${m}.${p}-${pr
          } <${M}.${m}.${+p + 1}-0`
        } else {
          ret = `>=${M}.${m}.${p}-${pr
          } <${M}.${+m + 1}.0-0`
        }
      } else {
        ret = `>=${M}.${m}.${p}-${pr
        } <${+M + 1}.0.0-0`
      }
    } else {
      debug('no pr')
      if (M === '0') {
        if (m === '0') {
          ret = `>=${M}.${m}.${p
          } <${M}.${m}.${+p + 1}-0`
        } else {
          ret = `>=${M}.${m}.${p
          } <${M}.${+m + 1}.0-0`
        }
      } else {
        ret = `>=${M}.${m}.${p
        } <${+M + 1}.0.0-0`
      }
    }

    debug('caret return', ret)
    return ret
  })
}

const replaceXRanges = (comp, options) => {
  debug('replaceXRanges', comp, options)
  return comp
    .split(/\s+/)
    .map((c) => replaceXRange(c, options))
    .join(' ')
}

const replaceXRange = (comp, options) => {
  comp = comp.trim()
  const r = options.loose ? re[t.XRANGELOOSE] : re[t.XRANGE]
  return comp.replace(r, (ret, gtlt, M, m, p, pr) => {
    debug('xRange', comp, ret, gtlt, M, m, p, pr)
    if (invalidXRangeOrder(M, m, p)) {
      return comp
    }

    const xM = isX(M)
    const xm = xM || isX(m)
    const xp = xm || isX(p)
    const anyX = xp

    if (gtlt === '=' && anyX) {
      gtlt = ''
    }

    // if we're including prereleases in the match, then we need
    // to fix this to -0, the lowest possible prerelease value
    pr = options.includePrerelease ? '-0' : ''

    if (xM) {
      if (gtlt === '>' || gtlt === '<') {
        // nothing is allowed
        ret = '<0.0.0-0'
      } else {
        // nothing is forbidden
        ret = '*'
      }
    } else if (gtlt && anyX) {
      // we know patch is an x, because we have any x at all.
      // replace X with 0
      if (xm) {
        m = 0
      }
      p = 0

      if (gtlt === '>') {
        // >1 => >=2.0.0
        // >1.2 => >=1.3.0
        gtlt = '>='
        if (xm) {
          M = +M + 1
          m = 0
          p = 0
        } else {
          m = +m + 1
          p = 0
        }
      } else if (gtlt === '<=') {
        // <=0.7.x is actually <0.8.0, since any 0.7.x should
        // pass.  Similarly, <=7.x is actually <8.0.0, etc.
        gtlt = '<'
        if (xm) {
          M = +M + 1
        } else {
          m = +m + 1
        }
      }

      if (gtlt === '<') {
        pr = '-0'
      }

      ret = `${gtlt + M}.${m}.${p}${pr}`
    } else if (xm) {
      ret = `>=${M}.0.0${pr} <${+M + 1}.0.0-0`
    } else if (xp) {
      ret = `>=${M}.${m}.0${pr
      } <${M}.${+m + 1}.0-0`
    }

    debug('xRange return', ret)

    return ret
  })
}

// Because * is AND-ed with everything else in the comparator,
// and '' means "any version", just remove the *s entirely.
const replaceStars = (comp, options) => {
  debug('replaceStars', comp, options)
  // Looseness is ignored here.  star is always as loose as it gets!
  return comp
    .trim()
    .replace(re[t.STAR], '')
}

const replaceGTE0 = (comp, options) => {
  debug('replaceGTE0', comp, options)
  return comp
    .trim()
    .replace(re[options.includePrerelease ? t.GTE0PRE : t.GTE0], '')
}

// This function is passed to string.replace(re[t.HYPHENRANGE])
// M, m, patch, prerelease, build
// 1.2 - 3.4.5 => >=1.2.0 <=3.4.5
// 1.2.3 - 3.4 => >=1.2.0 <3.5.0-0 Any 3.4.x will do
// 1.2 - 3.4 => >=1.2.0 <3.5.0-0
// TODO build?
const hyphenReplace = incPr => ($0,
  from, fM, fm, fp, fpr, fb,
  to, tM, tm, tp, tpr) => {
  if (isX(fM)) {
    from = ''
  } else if (isX(fm)) {
    from = `>=${fM}.0.0${incPr ? '-0' : ''}`
  } else if (isX(fp)) {
    from = `>=${fM}.${fm}.0${incPr ? '-0' : ''}`
  } else if (fpr) {
    from = `>=${from}`
  } else {
    from = `>=${from}${incPr ? '-0' : ''}`
  }

  if (isX(tM)) {
    to = ''
  } else if (isX(tm)) {
    to = `<${+tM + 1}.0.0-0`
  } else if (isX(tp)) {
    to = `<${tM}.${+tm + 1}.0-0`
  } else if (tpr) {
    to = `<=${tM}.${tm}.${tp}-${tpr}`
  } else if (incPr) {
    to = `<${tM}.${tm}.${+tp + 1}-0`
  } else {
    to = `<=${to}`
  }

  return `${from} ${to}`.trim()
}

const testSet = (set, version, options) => {
  for (let i = 0; i < set.length; i++) {
    if (!set[i].test(version)) {
      return false
    }
  }

  if (version.prerelease.length && !options.includePrerelease) {
    // Find the set of versions that are allowed to have prereleases
    // For example, ^1.2.3-pr.1 desugars to >=1.2.3-pr.1 <2.0.0
    // That should allow `1.2.3-pr.2` to pass.
    // However, `1.2.4-alpha.notready` should NOT be allowed,
    // even though it's within the range set by the comparators.
    for (let i = 0; i < set.length; i++) {
      debug(set[i].semver)
      if (set[i].semver === Comparator.ANY) {
        continue
      }

      if (set[i].semver.prerelease.length > 0) {
        const allowed = set[i].semver
        if (allowed.major === version.major &&
            allowed.minor === version.minor &&
            allowed.patch === version.patch) {
          return true
        }
      }
    }

    // Version has a -pre, but it's not one of the ones we like.
    return false
  }

  return true
}


/***/ }),

/***/ 7163:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



const debug = __webpack_require__(1159)
const { MAX_LENGTH, MAX_SAFE_INTEGER } = __webpack_require__(45101)
const { safeRe: re, t } = __webpack_require__(95471)

const parseOptions = __webpack_require__(70356)
const { compareIdentifiers } = __webpack_require__(73348)

const isPrereleaseIdentifier = (prerelease, identifier) => {
  const identifiers = identifier.split('.')
  if (identifiers.length > prerelease.length) {
    return false
  }

  for (let i = 0; i < identifiers.length; i++) {
    if (compareIdentifiers(prerelease[i], identifiers[i]) !== 0) {
      return false
    }
  }

  return true
}

class SemVer {
  constructor (version, options) {
    options = parseOptions(options)

    if (version instanceof SemVer) {
      if (version.loose === !!options.loose &&
        version.includePrerelease === !!options.includePrerelease) {
        return version
      } else {
        version = version.version
      }
    } else if (typeof version !== 'string') {
      throw new TypeError(`Invalid version. Must be a string. Got type "${typeof version}".`)
    }

    if (version.length > MAX_LENGTH) {
      throw new TypeError(
        `version is longer than ${MAX_LENGTH} characters`
      )
    }

    debug('SemVer', version, options)
    this.options = options
    this.loose = !!options.loose
    // this isn't actually relevant for versions, but keep it so that we
    // don't run into trouble passing this.options around.
    this.includePrerelease = !!options.includePrerelease

    const m = version.trim().match(options.loose ? re[t.LOOSE] : re[t.FULL])

    if (!m) {
      throw new TypeError(`Invalid Version: ${version}`)
    }

    this.raw = version

    // these are actually numbers
    this.major = +m[1]
    this.minor = +m[2]
    this.patch = +m[3]

    if (this.major > MAX_SAFE_INTEGER || this.major < 0) {
      throw new TypeError('Invalid major version')
    }

    if (this.minor > MAX_SAFE_INTEGER || this.minor < 0) {
      throw new TypeError('Invalid minor version')
    }

    if (this.patch > MAX_SAFE_INTEGER || this.patch < 0) {
      throw new TypeError('Invalid patch version')
    }

    // numberify any prerelease numeric ids
    if (!m[4]) {
      this.prerelease = []
    } else {
      this.prerelease = m[4].split('.').map((id) => {
        if (/^[0-9]+$/.test(id)) {
          const num = +id
          if (num >= 0 && num < MAX_SAFE_INTEGER) {
            return num
          }
        }
        return id
      })
    }

    this.build = m[5] ? m[5].split('.') : []
    this.format()
  }

  format () {
    this.version = `${this.major}.${this.minor}.${this.patch}`
    if (this.prerelease.length) {
      this.version += `-${this.prerelease.join('.')}`
    }
    return this.version
  }

  toString () {
    return this.version
  }

  compare (other) {
    debug('SemVer.compare', this.version, this.options, other)
    if (!(other instanceof SemVer)) {
      if (typeof other === 'string' && other === this.version) {
        return 0
      }
      other = new SemVer(other, this.options)
    }

    if (other.version === this.version) {
      return 0
    }

    return this.compareMain(other) || this.comparePre(other)
  }

  compareMain (other) {
    if (!(other instanceof SemVer)) {
      other = new SemVer(other, this.options)
    }

    if (this.major < other.major) {
      return -1
    }
    if (this.major > other.major) {
      return 1
    }
    if (this.minor < other.minor) {
      return -1
    }
    if (this.minor > other.minor) {
      return 1
    }
    if (this.patch < other.patch) {
      return -1
    }
    if (this.patch > other.patch) {
      return 1
    }
    return 0
  }

  comparePre (other) {
    if (!(other instanceof SemVer)) {
      other = new SemVer(other, this.options)
    }

    // NOT having a prerelease is > having one
    if (this.prerelease.length && !other.prerelease.length) {
      return -1
    } else if (!this.prerelease.length && other.prerelease.length) {
      return 1
    } else if (!this.prerelease.length && !other.prerelease.length) {
      return 0
    }

    let i = 0
    do {
      const a = this.prerelease[i]
      const b = other.prerelease[i]
      debug('prerelease compare', i, a, b)
      if (a === undefined && b === undefined) {
        return 0
      } else if (b === undefined) {
        return 1
      } else if (a === undefined) {
        return -1
      } else if (a === b) {
        continue
      } else {
        return compareIdentifiers(a, b)
      }
    } while (++i)
  }

  compareBuild (other) {
    if (!(other instanceof SemVer)) {
      other = new SemVer(other, this.options)
    }

    let i = 0
    do {
      const a = this.build[i]
      const b = other.build[i]
      debug('build compare', i, a, b)
      if (a === undefined && b === undefined) {
        return 0
      } else if (b === undefined) {
        return 1
      } else if (a === undefined) {
        return -1
      } else if (a === b) {
        continue
      } else {
        return compareIdentifiers(a, b)
      }
    } while (++i)
  }

  // preminor will bump the version up to the next minor release, and immediately
  // down to pre-release. premajor and prepatch work the same way.
  inc (release, identifier, identifierBase) {
    if (release.startsWith('pre')) {
      if (!identifier && identifierBase === false) {
        throw new Error('invalid increment argument: identifier is empty')
      }
      // Avoid an invalid semver results
      if (identifier) {
        const match = `-${identifier}`.match(this.options.loose ? re[t.PRERELEASELOOSE] : re[t.PRERELEASE])
        if (!match || match[1] !== identifier) {
          throw new Error(`invalid identifier: ${identifier}`)
        }
      }
    }

    switch (release) {
      case 'premajor':
        this.prerelease.length = 0
        this.patch = 0
        this.minor = 0
        this.major++
        this.inc('pre', identifier, identifierBase)
        break
      case 'preminor':
        this.prerelease.length = 0
        this.patch = 0
        this.minor++
        this.inc('pre', identifier, identifierBase)
        break
      case 'prepatch':
        // If this is already a prerelease, it will bump to the next version
        // drop any prereleases that might already exist, since they are not
        // relevant at this point.
        this.prerelease.length = 0
        this.inc('patch', identifier, identifierBase)
        this.inc('pre', identifier, identifierBase)
        break
      // If the input is a non-prerelease version, this acts the same as
      // prepatch.
      case 'prerelease':
        if (this.prerelease.length === 0) {
          this.inc('patch', identifier, identifierBase)
        }
        this.inc('pre', identifier, identifierBase)
        break
      case 'release':
        if (this.prerelease.length === 0) {
          throw new Error(`version ${this.raw} is not a prerelease`)
        }
        this.prerelease.length = 0
        break

      case 'major':
        // If this is a pre-major version, bump up to the same major version.
        // Otherwise increment major.
        // 1.0.0-5 bumps to 1.0.0
        // 1.1.0 bumps to 2.0.0
        if (
          this.minor !== 0 ||
          this.patch !== 0 ||
          this.prerelease.length === 0
        ) {
          this.major++
        }
        this.minor = 0
        this.patch = 0
        this.prerelease = []
        break
      case 'minor':
        // If this is a pre-minor version, bump up to the same minor version.
        // Otherwise increment minor.
        // 1.2.0-5 bumps to 1.2.0
        // 1.2.1 bumps to 1.3.0
        if (this.patch !== 0 || this.prerelease.length === 0) {
          this.minor++
        }
        this.patch = 0
        this.prerelease = []
        break
      case 'patch':
        // If this is not a pre-release version, it will increment the patch.
        // If it is a pre-release it will bump up to the same patch version.
        // 1.2.0-5 patches to 1.2.0
        // 1.2.0 patches to 1.2.1
        if (this.prerelease.length === 0) {
          this.patch++
        }
        this.prerelease = []
        break
      // This probably shouldn't be used publicly.
      // 1.0.0 'pre' would become 1.0.0-0 which is the wrong direction.
      case 'pre': {
        const base = Number(identifierBase) ? 1 : 0

        if (this.prerelease.length === 0) {
          this.prerelease = [base]
        } else {
          let i = this.prerelease.length
          while (--i >= 0) {
            if (typeof this.prerelease[i] === 'number') {
              this.prerelease[i]++
              i = -2
            }
          }
          if (i === -1) {
            // didn't increment anything
            if (identifier === this.prerelease.join('.') && identifierBase === false) {
              throw new Error('invalid increment argument: identifier already exists')
            }
            this.prerelease.push(base)
          }
        }
        if (identifier) {
          // 1.2.0-beta.1 bumps to 1.2.0-beta.2,
          // 1.2.0-beta.fooblz or 1.2.0-beta bumps to 1.2.0-beta.0
          let prerelease = [identifier, base]
          if (identifierBase === false) {
            prerelease = [identifier]
          }
          if (isPrereleaseIdentifier(this.prerelease, identifier)) {
            const prereleaseBase = this.prerelease[identifier.split('.').length]
            if (isNaN(prereleaseBase)) {
              this.prerelease = prerelease
            }
          } else {
            this.prerelease = prerelease
          }
        }
        break
      }
      default:
        throw new Error(`invalid increment argument: ${release}`)
    }
    this.raw = this.format()
    if (this.build.length) {
      this.raw += `+${this.build.join('.')}`
    }
    return this
  }
}

module.exports = SemVer


/***/ }),

/***/ 1799:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



const parse = __webpack_require__(16353)
const clean = (version, options) => {
  const s = parse(version.trim().replace(/^[=v]+/, ''), options)
  return s ? s.version : null
}
module.exports = clean


/***/ }),

/***/ 28646:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



const eq = __webpack_require__(55082)
const neq = __webpack_require__(4974)
const gt = __webpack_require__(16599)
const gte = __webpack_require__(41236)
const lt = __webpack_require__(3872)
const lte = __webpack_require__(56717)

const cmp = (a, op, b, loose) => {
  switch (op) {
    case '===':
      if (typeof a === 'object') {
        a = a.version
      }
      if (typeof b === 'object') {
        b = b.version
      }
      return a === b

    case '!==':
      if (typeof a === 'object') {
        a = a.version
      }
      if (typeof b === 'object') {
        b = b.version
      }
      return a !== b

    case '':
    case '=':
    case '==':
      return eq(a, b, loose)

    case '!=':
      return neq(a, b, loose)

    case '>':
      return gt(a, b, loose)

    case '>=':
      return gte(a, b, loose)

    case '<':
      return lt(a, b, loose)

    case '<=':
      return lte(a, b, loose)

    default:
      throw new TypeError(`Invalid operator: ${op}`)
  }
}
module.exports = cmp


/***/ }),

/***/ 35385:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



const SemVer = __webpack_require__(7163)
const parse = __webpack_require__(16353)
const { safeRe: re, t } = __webpack_require__(95471)

const coerce = (version, options) => {
  if (version instanceof SemVer) {
    return version
  }

  if (typeof version === 'number') {
    version = String(version)
  }

  if (typeof version !== 'string') {
    return null
  }

  options = options || {}

  let match = null
  if (!options.rtl) {
    match = version.match(options.includePrerelease ? re[t.COERCEFULL] : re[t.COERCE])
  } else {
    // Find the right-most coercible string that does not share
    // a terminus with a more left-ward coercible string.
    // Eg, '1.2.3.4' wants to coerce '2.3.4', not '3.4' or '4'
    // With includePrerelease option set, '1.2.3.4-rc' wants to coerce '2.3.4-rc', not '2.3.4'
    //
    // Walk through the string checking with a /g regexp
    // Manually set the index so as to pick up overlapping matches.
    // Stop when we get a match that ends at the string end, since no
    // coercible string can be more right-ward without the same terminus.
    const coerceRtlRegex = options.includePrerelease ? re[t.COERCERTLFULL] : re[t.COERCERTL]
    let next
    while ((next = coerceRtlRegex.exec(version)) &&
        (!match || match.index + match[0].length !== version.length)
    ) {
      if (!match ||
            next.index + next[0].length !== match.index + match[0].length) {
        match = next
      }
      coerceRtlRegex.lastIndex = next.index + next[1].length + next[2].length
    }
    // leave it in a clean state
    coerceRtlRegex.lastIndex = -1
  }

  if (match === null) {
    return null
  }

  const major = match[2]
  const minor = match[3] || '0'
  const patch = match[4] || '0'
  const prerelease = options.includePrerelease && match[5] ? `-${match[5]}` : ''
  const build = options.includePrerelease && match[6] ? `+${match[6]}` : ''

  return parse(`${major}.${minor}.${patch}${prerelease}${build}`, options)
}
module.exports = coerce


/***/ }),

/***/ 37648:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



const SemVer = __webpack_require__(7163)
const compareBuild = (a, b, loose) => {
  const versionA = new SemVer(a, loose)
  const versionB = new SemVer(b, loose)
  return versionA.compare(versionB) || versionA.compareBuild(versionB)
}
module.exports = compareBuild


/***/ }),

/***/ 56874:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



const compare = __webpack_require__(78469)
const compareLoose = (a, b) => compare(a, b, true)
module.exports = compareLoose


/***/ }),

/***/ 78469:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



const SemVer = __webpack_require__(7163)
const compare = (a, b, loose) =>
  new SemVer(a, loose).compare(new SemVer(b, loose))

module.exports = compare


/***/ }),

/***/ 70711:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



const parse = __webpack_require__(16353)

const diff = (version1, version2) => {
  const v1 = parse(version1, null, true)
  const v2 = parse(version2, null, true)
  const comparison = v1.compare(v2)

  if (comparison === 0) {
    return null
  }

  const v1Higher = comparison > 0
  const highVersion = v1Higher ? v1 : v2
  const lowVersion = v1Higher ? v2 : v1
  const highHasPre = !!highVersion.prerelease.length
  const lowHasPre = !!lowVersion.prerelease.length

  if (lowHasPre && !highHasPre) {
    // Going from prerelease -> no prerelease requires some special casing

    // If the low version has only a major, then it will always be a major
    // Some examples:
    // 1.0.0-1 -> 1.0.0
    // 1.0.0-1 -> 1.1.1
    // 1.0.0-1 -> 2.0.0
    if (!lowVersion.patch && !lowVersion.minor) {
      return 'major'
    }

    // If the main part has no difference
    if (lowVersion.compareMain(highVersion) === 0) {
      if (lowVersion.minor && !lowVersion.patch) {
        return 'minor'
      }
      return 'patch'
    }
  }

  // add the `pre` prefix if we are going to a prerelease version
  const prefix = highHasPre ? 'pre' : ''

  if (v1.major !== v2.major) {
    return prefix + 'major'
  }

  if (v1.minor !== v2.minor) {
    return prefix + 'minor'
  }

  if (v1.patch !== v2.patch) {
    return prefix + 'patch'
  }

  // high and low are prereleases
  return 'prerelease'
}

module.exports = diff


/***/ }),

/***/ 55082:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



const compare = __webpack_require__(78469)
const eq = (a, b, loose) => compare(a, b, loose) === 0
module.exports = eq


/***/ }),

/***/ 16599:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



const compare = __webpack_require__(78469)
const gt = (a, b, loose) => compare(a, b, loose) > 0
module.exports = gt


/***/ }),

/***/ 41236:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



const compare = __webpack_require__(78469)
const gte = (a, b, loose) => compare(a, b, loose) >= 0
module.exports = gte


/***/ }),

/***/ 62338:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



const SemVer = __webpack_require__(7163)

const inc = (version, release, options, identifier, identifierBase) => {
  if (typeof (options) === 'string') {
    identifierBase = identifier
    identifier = options
    options = undefined
  }

  try {
    return new SemVer(
      version instanceof SemVer ? version.version : version,
      options
    ).inc(release, identifier, identifierBase).version
  } catch (er) {
    return null
  }
}
module.exports = inc


/***/ }),

/***/ 3872:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



const compare = __webpack_require__(78469)
const lt = (a, b, loose) => compare(a, b, loose) < 0
module.exports = lt


/***/ }),

/***/ 56717:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



const compare = __webpack_require__(78469)
const lte = (a, b, loose) => compare(a, b, loose) <= 0
module.exports = lte


/***/ }),

/***/ 68511:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



const SemVer = __webpack_require__(7163)
const major = (a, loose) => new SemVer(a, loose).major
module.exports = major


/***/ }),

/***/ 32603:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



const SemVer = __webpack_require__(7163)
const minor = (a, loose) => new SemVer(a, loose).minor
module.exports = minor


/***/ }),

/***/ 4974:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



const compare = __webpack_require__(78469)
const neq = (a, b, loose) => compare(a, b, loose) !== 0
module.exports = neq


/***/ }),

/***/ 16353:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



const SemVer = __webpack_require__(7163)
const parse = (version, options, throwErrors = false) => {
  if (version instanceof SemVer) {
    return version
  }
  try {
    return new SemVer(version, options)
  } catch (er) {
    if (!throwErrors) {
      return null
    }
    throw er
  }
}

module.exports = parse


/***/ }),

/***/ 48756:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



const SemVer = __webpack_require__(7163)
const patch = (a, loose) => new SemVer(a, loose).patch
module.exports = patch


/***/ }),

/***/ 15714:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



const parse = __webpack_require__(16353)
const prerelease = (version, options) => {
  const parsed = parse(version, options)
  return (parsed && parsed.prerelease.length) ? parsed.prerelease : null
}
module.exports = prerelease


/***/ }),

/***/ 32173:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



const compare = __webpack_require__(78469)
const rcompare = (a, b, loose) => compare(b, a, loose)
module.exports = rcompare


/***/ }),

/***/ 87192:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



const compareBuild = __webpack_require__(37648)
const rsort = (list, loose) => list.sort((a, b) => compareBuild(b, a, loose))
module.exports = rsort


/***/ }),

/***/ 68011:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



const Range = __webpack_require__(96782)
const satisfies = (version, range, options) => {
  try {
    range = new Range(range, options)
  } catch (er) {
    return false
  }
  return range.test(version)
}
module.exports = satisfies


/***/ }),

/***/ 29872:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



const compareBuild = __webpack_require__(37648)
const sort = (list, loose) => list.sort((a, b) => compareBuild(a, b, loose))
module.exports = sort


/***/ }),

/***/ 16114:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



const parse = __webpack_require__(16353)
const constants = __webpack_require__(45101)
const SemVer = __webpack_require__(7163)

const truncate = (version, truncation, options) => {
  if (!constants.RELEASE_TYPES.includes(truncation)) {
    return null
  }

  const clonedVersion = cloneInputVersion(version, options)
  return clonedVersion && doTruncation(clonedVersion, truncation)
}

const cloneInputVersion = (version, options) => {
  const versionStringToParse = (
    version instanceof SemVer ? version.version : version
  )

  return parse(versionStringToParse, options)
}

const doTruncation = (version, truncation) => {
  if (isPrerelease(truncation)) {
    return version.version
  }

  version.prerelease = []

  switch (truncation) {
    case 'major':
      version.minor = 0
      version.patch = 0
      break
    case 'minor':
      version.patch = 0
      break
  }

  return version.format()
}

const isPrerelease = (type) => {
  return type.startsWith('pre')
}

module.exports = truncate


/***/ }),

/***/ 58780:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



const parse = __webpack_require__(16353)
const valid = (version, options) => {
  const v = parse(version, options)
  return v ? v.version : null
}
module.exports = valid


/***/ }),

/***/ 62088:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



// just pre-load all the stuff that index.js lazily exports
const internalRe = __webpack_require__(95471)
const constants = __webpack_require__(45101)
const SemVer = __webpack_require__(7163)
const identifiers = __webpack_require__(73348)
const parse = __webpack_require__(16353)
const valid = __webpack_require__(58780)
const clean = __webpack_require__(1799)
const inc = __webpack_require__(62338)
const diff = __webpack_require__(70711)
const major = __webpack_require__(68511)
const minor = __webpack_require__(32603)
const patch = __webpack_require__(48756)
const prerelease = __webpack_require__(15714)
const compare = __webpack_require__(78469)
const rcompare = __webpack_require__(32173)
const compareLoose = __webpack_require__(56874)
const compareBuild = __webpack_require__(37648)
const sort = __webpack_require__(29872)
const rsort = __webpack_require__(87192)
const gt = __webpack_require__(16599)
const lt = __webpack_require__(3872)
const eq = __webpack_require__(55082)
const neq = __webpack_require__(4974)
const gte = __webpack_require__(41236)
const lte = __webpack_require__(56717)
const cmp = __webpack_require__(28646)
const coerce = __webpack_require__(35385)
const truncate = __webpack_require__(16114)
const Comparator = __webpack_require__(89379)
const Range = __webpack_require__(96782)
const satisfies = __webpack_require__(68011)
const toComparators = __webpack_require__(54750)
const maxSatisfying = __webpack_require__(73193)
const minSatisfying = __webpack_require__(68595)
const minVersion = __webpack_require__(51866)
const validRange = __webpack_require__(64737)
const outside = __webpack_require__(10280)
const gtr = __webpack_require__(12276)
const ltr = __webpack_require__(15213)
const intersects = __webpack_require__(23465)
const simplifyRange = __webpack_require__(82028)
const subset = __webpack_require__(61489)
module.exports = {
  parse,
  valid,
  clean,
  inc,
  diff,
  major,
  minor,
  patch,
  prerelease,
  compare,
  rcompare,
  compareLoose,
  compareBuild,
  sort,
  rsort,
  gt,
  lt,
  eq,
  neq,
  gte,
  lte,
  cmp,
  coerce,
  truncate,
  Comparator,
  Range,
  satisfies,
  toComparators,
  maxSatisfying,
  minSatisfying,
  minVersion,
  validRange,
  outside,
  gtr,
  ltr,
  intersects,
  simplifyRange,
  subset,
  SemVer,
  re: internalRe.re,
  src: internalRe.src,
  tokens: internalRe.t,
  SEMVER_SPEC_VERSION: constants.SEMVER_SPEC_VERSION,
  RELEASE_TYPES: constants.RELEASE_TYPES,
  compareIdentifiers: identifiers.compareIdentifiers,
  rcompareIdentifiers: identifiers.rcompareIdentifiers,
}


/***/ }),

/***/ 45101:
/***/ ((module) => {



// Note: this is the semver.org version of the spec that it implements
// Not necessarily the package version of this code.
const SEMVER_SPEC_VERSION = '2.0.0'

const MAX_LENGTH = 256
const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER ||
/* istanbul ignore next */ 9007199254740991

// Max safe segment length for coercion.
const MAX_SAFE_COMPONENT_LENGTH = 16

// Max safe length for a build identifier. The max length minus 6 characters for
// the shortest version with a build 0.0.0+BUILD.
const MAX_SAFE_BUILD_LENGTH = MAX_LENGTH - 6

const RELEASE_TYPES = [
  'major',
  'premajor',
  'minor',
  'preminor',
  'patch',
  'prepatch',
  'prerelease',
]

module.exports = {
  MAX_LENGTH,
  MAX_SAFE_COMPONENT_LENGTH,
  MAX_SAFE_BUILD_LENGTH,
  MAX_SAFE_INTEGER,
  RELEASE_TYPES,
  SEMVER_SPEC_VERSION,
  FLAG_INCLUDE_PRERELEASE: 0b001,
  FLAG_LOOSE: 0b010,
}


/***/ }),

/***/ 1159:
/***/ ((module) => {



const debug = (
  typeof process === 'object' &&
  process.env &&
  process.env.NODE_DEBUG &&
  /\bsemver\b/i.test(process.env.NODE_DEBUG)
) ? (...args) => console.error('SEMVER', ...args)
  : () => {}

module.exports = debug


/***/ }),

/***/ 73348:
/***/ ((module) => {



const numeric = /^[0-9]+$/
const compareIdentifiers = (a, b) => {
  if (typeof a === 'number' && typeof b === 'number') {
    return a === b ? 0 : a < b ? -1 : 1
  }

  const anum = numeric.test(a)
  const bnum = numeric.test(b)

  if (anum && bnum) {
    a = +a
    b = +b
  }

  return a === b ? 0
    : (anum && !bnum) ? -1
    : (bnum && !anum) ? 1
    : a < b ? -1
    : 1
}

const rcompareIdentifiers = (a, b) => compareIdentifiers(b, a)

module.exports = {
  compareIdentifiers,
  rcompareIdentifiers,
}


/***/ }),

/***/ 61383:
/***/ ((module) => {



class LRUCache {
  constructor () {
    this.max = 1000
    this.map = new Map()
  }

  get (key) {
    const value = this.map.get(key)
    if (value === undefined) {
      return undefined
    } else {
      // Remove the key from the map and add it to the end
      this.map.delete(key)
      this.map.set(key, value)
      return value
    }
  }

  delete (key) {
    return this.map.delete(key)
  }

  set (key, value) {
    const deleted = this.delete(key)

    if (!deleted && value !== undefined) {
      // If cache is full, delete the least recently used item
      if (this.map.size >= this.max) {
        const firstKey = this.map.keys().next().value
        this.delete(firstKey)
      }

      this.map.set(key, value)
    }

    return this
  }
}

module.exports = LRUCache


/***/ }),

/***/ 70356:
/***/ ((module) => {



// parse out just the options we care about
const looseOption = Object.freeze({ loose: true })
const emptyOpts = Object.freeze({ })
const parseOptions = options => {
  if (!options) {
    return emptyOpts
  }

  if (typeof options !== 'object') {
    return looseOption
  }

  return options
}
module.exports = parseOptions


/***/ }),

/***/ 95471:
/***/ ((module, exports, __webpack_require__) => {



const {
  MAX_SAFE_COMPONENT_LENGTH,
  MAX_SAFE_BUILD_LENGTH,
  MAX_LENGTH,
} = __webpack_require__(45101)
const debug = __webpack_require__(1159)
exports = module.exports = {}

// The actual regexps go on exports.re
const re = exports.re = []
const safeRe = exports.safeRe = []
const src = exports.src = []
const safeSrc = exports.safeSrc = []
const t = exports.t = {}
let R = 0

const LETTERDASHNUMBER = '[a-zA-Z0-9-]'

// Replace some greedy regex tokens to prevent regex dos issues. These regex are
// used internally via the safeRe object since all inputs in this library get
// normalized first to trim and collapse all extra whitespace. The original
// regexes are exported for userland consumption and lower level usage. A
// future breaking change could export the safer regex only with a note that
// all input should have extra whitespace removed.
const safeRegexReplacements = [
  ['\\s', 1],
  ['\\d', MAX_LENGTH],
  [LETTERDASHNUMBER, MAX_SAFE_BUILD_LENGTH],
]

const makeSafeRegex = (value) => {
  for (const [token, max] of safeRegexReplacements) {
    value = value
      .split(`${token}*`).join(`${token}{0,${max}}`)
      .split(`${token}+`).join(`${token}{1,${max}}`)
  }
  return value
}

const createToken = (name, value, isGlobal) => {
  const safe = makeSafeRegex(value)
  const index = R++
  debug(name, index, value)
  t[name] = index
  src[index] = value
  safeSrc[index] = safe
  re[index] = new RegExp(value, isGlobal ? 'g' : undefined)
  safeRe[index] = new RegExp(safe, isGlobal ? 'g' : undefined)
}

// The following Regular Expressions can be used for tokenizing,
// validating, and parsing SemVer version strings.

// ## Numeric Identifier
// A single `0`, or a non-zero digit followed by zero or more digits.

createToken('NUMERICIDENTIFIER', '0|[1-9]\\d*')
createToken('NUMERICIDENTIFIERLOOSE', '\\d+')

// ## Non-numeric Identifier
// Zero or more digits, followed by a letter or hyphen, and then zero or
// more letters, digits, or hyphens.

createToken('NONNUMERICIDENTIFIER', `\\d*[a-zA-Z-]${LETTERDASHNUMBER}*`)

// ## Main Version
// Three dot-separated numeric identifiers.

createToken('MAINVERSION', `(${src[t.NUMERICIDENTIFIER]})\\.` +
                   `(${src[t.NUMERICIDENTIFIER]})\\.` +
                   `(${src[t.NUMERICIDENTIFIER]})`)

createToken('MAINVERSIONLOOSE', `(${src[t.NUMERICIDENTIFIERLOOSE]})\\.` +
                        `(${src[t.NUMERICIDENTIFIERLOOSE]})\\.` +
                        `(${src[t.NUMERICIDENTIFIERLOOSE]})`)

// ## Pre-release Version Identifier
// A numeric identifier, or a non-numeric identifier.
// Non-numeric identifiers include numeric identifiers but can be longer.
// Therefore non-numeric identifiers must go first.

createToken('PRERELEASEIDENTIFIER', `(?:${src[t.NONNUMERICIDENTIFIER]
}|${src[t.NUMERICIDENTIFIER]})`)

createToken('PRERELEASEIDENTIFIERLOOSE', `(?:${src[t.NONNUMERICIDENTIFIER]
}|${src[t.NUMERICIDENTIFIERLOOSE]})`)

// ## Pre-release Version
// Hyphen, followed by one or more dot-separated pre-release version
// identifiers.

createToken('PRERELEASE', `(?:-(${src[t.PRERELEASEIDENTIFIER]
}(?:\\.${src[t.PRERELEASEIDENTIFIER]})*))`)

createToken('PRERELEASELOOSE', `(?:-?(${src[t.PRERELEASEIDENTIFIERLOOSE]
}(?:\\.${src[t.PRERELEASEIDENTIFIERLOOSE]})*))`)

// ## Build Metadata Identifier
// Any combination of digits, letters, or hyphens.

createToken('BUILDIDENTIFIER', `${LETTERDASHNUMBER}+`)

// ## Build Metadata
// Plus sign, followed by one or more period-separated build metadata
// identifiers.

createToken('BUILD', `(?:\\+(${src[t.BUILDIDENTIFIER]
}(?:\\.${src[t.BUILDIDENTIFIER]})*))`)

// ## Full Version String
// A main version, followed optionally by a pre-release version and
// build metadata.

// Note that the only major, minor, patch, and pre-release sections of
// the version string are capturing groups.  The build metadata is not a
// capturing group, because it should not ever be used in version
// comparison.

createToken('FULLPLAIN', `v?${src[t.MAINVERSION]
}${src[t.PRERELEASE]}?${
  src[t.BUILD]}?`)

createToken('FULL', `^${src[t.FULLPLAIN]}$`)

// like full, but allows v1.2.3 and =1.2.3, which people do sometimes.
// also, 1.0.0alpha1 (prerelease without the hyphen) which is pretty
// common in the npm registry.
createToken('LOOSEPLAIN', `[v=\\s]*${src[t.MAINVERSIONLOOSE]
}${src[t.PRERELEASELOOSE]}?${
  src[t.BUILD]}?`)

createToken('LOOSE', `^${src[t.LOOSEPLAIN]}$`)

createToken('GTLT', '((?:<|>)?=?)')

// Something like "2.*" or "1.2.x".
// Note that "x.x" is a valid xRange identifier, meaning "any version"
// Only the first item is strictly required.
createToken('XRANGEIDENTIFIERLOOSE', `${src[t.NUMERICIDENTIFIERLOOSE]}|x|X|\\*`)
createToken('XRANGEIDENTIFIER', `${src[t.NUMERICIDENTIFIER]}|x|X|\\*`)

createToken('XRANGEPLAIN', `[v=\\s]*(${src[t.XRANGEIDENTIFIER]})` +
                   `(?:\\.(${src[t.XRANGEIDENTIFIER]})` +
                   `(?:\\.(${src[t.XRANGEIDENTIFIER]})` +
                   `(?:${src[t.PRERELEASE]})?${
                     src[t.BUILD]}?` +
                   `)?)?`)

createToken('XRANGEPLAINLOOSE', `[v=\\s]*(${src[t.XRANGEIDENTIFIERLOOSE]})` +
                        `(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})` +
                        `(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})` +
                        `(?:${src[t.PRERELEASELOOSE]})?${
                          src[t.BUILD]}?` +
                        `)?)?`)

createToken('XRANGE', `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAIN]}$`)
createToken('XRANGELOOSE', `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAINLOOSE]}$`)

// Coercion.
// Extract anything that could conceivably be a part of a valid semver
createToken('COERCEPLAIN', `${'(^|[^\\d])' +
              '(\\d{1,'}${MAX_SAFE_COMPONENT_LENGTH}})` +
              `(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?` +
              `(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?`)
createToken('COERCE', `${src[t.COERCEPLAIN]}(?:$|[^\\d])`)
createToken('COERCEFULL', src[t.COERCEPLAIN] +
              `(?:${src[t.PRERELEASE]})?` +
              `(?:${src[t.BUILD]})?` +
              `(?:$|[^\\d])`)
createToken('COERCERTL', src[t.COERCE], true)
createToken('COERCERTLFULL', src[t.COERCEFULL], true)

// Tilde ranges.
// Meaning is "reasonably at or greater than"
createToken('LONETILDE', '(?:~>?)')

createToken('TILDETRIM', `(\\s*)${src[t.LONETILDE]}\\s+`, true)
exports.tildeTrimReplace = '$1~'

createToken('TILDE', `^${src[t.LONETILDE]}${src[t.XRANGEPLAIN]}$`)
createToken('TILDELOOSE', `^${src[t.LONETILDE]}${src[t.XRANGEPLAINLOOSE]}$`)

// Caret ranges.
// Meaning is "at least and backwards compatible with"
createToken('LONECARET', '(?:\\^)')

createToken('CARETTRIM', `(\\s*)${src[t.LONECARET]}\\s+`, true)
exports.caretTrimReplace = '$1^'

createToken('CARET', `^${src[t.LONECARET]}${src[t.XRANGEPLAIN]}$`)
createToken('CARETLOOSE', `^${src[t.LONECARET]}${src[t.XRANGEPLAINLOOSE]}$`)

// A simple gt/lt/eq thing, or just "" to indicate "any version"
createToken('COMPARATORLOOSE', `^${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]})$|^$`)
createToken('COMPARATOR', `^${src[t.GTLT]}\\s*(${src[t.FULLPLAIN]})$|^$`)

// An expression to strip any whitespace between the gtlt and the thing
// it modifies, so that `> 1.2.3` ==> `>1.2.3`
createToken('COMPARATORTRIM', `(\\s*)${src[t.GTLT]
}\\s*(${src[t.LOOSEPLAIN]}|${src[t.XRANGEPLAIN]})`, true)
exports.comparatorTrimReplace = '$1$2$3'

// Something like `1.2.3 - 1.2.4`
// Note that these all use the loose form, because they'll be
// checked against either the strict or loose comparator form
// later.
createToken('HYPHENRANGE', `^\\s*(${src[t.XRANGEPLAIN]})` +
                   `\\s+-\\s+` +
                   `(${src[t.XRANGEPLAIN]})` +
                   `\\s*$`)

createToken('HYPHENRANGELOOSE', `^\\s*(${src[t.XRANGEPLAINLOOSE]})` +
                        `\\s+-\\s+` +
                        `(${src[t.XRANGEPLAINLOOSE]})` +
                        `\\s*$`)

// Star ranges basically just allow anything at all.
createToken('STAR', '(<|>)?=?\\s*\\*')
// >=0.0.0 is like a star
createToken('GTE0', '^\\s*>=\\s*0\\.0\\.0\\s*$')
createToken('GTE0PRE', '^\\s*>=\\s*0\\.0\\.0-0\\s*$')


/***/ }),

/***/ 12276:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



// Determine if version is greater than all the versions possible in the range.
const outside = __webpack_require__(10280)
const gtr = (version, range, options) => outside(version, range, '>', options)
module.exports = gtr


/***/ }),

/***/ 23465:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



const Range = __webpack_require__(96782)
const intersects = (r1, r2, options) => {
  r1 = new Range(r1, options)
  r2 = new Range(r2, options)
  return r1.intersects(r2, options)
}
module.exports = intersects


/***/ }),

/***/ 15213:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



const outside = __webpack_require__(10280)
// Determine if version is less than all the versions possible in the range
const ltr = (version, range, options) => outside(version, range, '<', options)
module.exports = ltr


/***/ }),

/***/ 73193:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



const SemVer = __webpack_require__(7163)
const Range = __webpack_require__(96782)

const maxSatisfying = (versions, range, options) => {
  let max = null
  let maxSV = null
  let rangeObj = null
  try {
    rangeObj = new Range(range, options)
  } catch (er) {
    return null
  }
  versions.forEach((v) => {
    if (rangeObj.test(v)) {
      // satisfies(v, range, options)
      if (!max || maxSV.compare(v) === -1) {
        // compare(max, v, true)
        max = v
        maxSV = new SemVer(max, options)
      }
    }
  })
  return max
}
module.exports = maxSatisfying


/***/ }),

/***/ 68595:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



const SemVer = __webpack_require__(7163)
const Range = __webpack_require__(96782)
const minSatisfying = (versions, range, options) => {
  let min = null
  let minSV = null
  let rangeObj = null
  try {
    rangeObj = new Range(range, options)
  } catch (er) {
    return null
  }
  versions.forEach((v) => {
    if (rangeObj.test(v)) {
      // satisfies(v, range, options)
      if (!min || minSV.compare(v) === 1) {
        // compare(min, v, true)
        min = v
        minSV = new SemVer(min, options)
      }
    }
  })
  return min
}
module.exports = minSatisfying


/***/ }),

/***/ 51866:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



const SemVer = __webpack_require__(7163)
const Range = __webpack_require__(96782)
const gt = __webpack_require__(16599)

const minVersion = (range, loose) => {
  range = new Range(range, loose)

  let minver = new SemVer('0.0.0')
  if (range.test(minver)) {
    return minver
  }

  minver = new SemVer('0.0.0-0')
  if (range.test(minver)) {
    return minver
  }

  minver = null
  for (let i = 0; i < range.set.length; ++i) {
    const comparators = range.set[i]

    let setMin = null
    comparators.forEach((comparator) => {
      // Clone to avoid manipulating the comparator's semver object.
      const compver = new SemVer(comparator.semver.version)
      switch (comparator.operator) {
        case '>':
          if (compver.prerelease.length === 0) {
            compver.patch++
          } else {
            compver.prerelease.push(0)
          }
          compver.raw = compver.format()
          /* fallthrough */
        case '':
        case '>=':
          if (!setMin || gt(compver, setMin)) {
            setMin = compver
          }
          break
        case '<':
        case '<=':
          /* Ignore maximum versions */
          break
        /* istanbul ignore next */
        default:
          throw new Error(`Unexpected operation: ${comparator.operator}`)
      }
    })
    if (setMin && (!minver || gt(minver, setMin))) {
      minver = setMin
    }
  }

  if (minver && range.test(minver)) {
    return minver
  }

  return null
}
module.exports = minVersion


/***/ }),

/***/ 10280:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



const SemVer = __webpack_require__(7163)
const Comparator = __webpack_require__(89379)
const { ANY } = Comparator
const Range = __webpack_require__(96782)
const satisfies = __webpack_require__(68011)
const gt = __webpack_require__(16599)
const lt = __webpack_require__(3872)
const lte = __webpack_require__(56717)
const gte = __webpack_require__(41236)

const outside = (version, range, hilo, options) => {
  version = new SemVer(version, options)
  range = new Range(range, options)

  let gtfn, ltefn, ltfn, comp, ecomp
  switch (hilo) {
    case '>':
      gtfn = gt
      ltefn = lte
      ltfn = lt
      comp = '>'
      ecomp = '>='
      break
    case '<':
      gtfn = lt
      ltefn = gte
      ltfn = gt
      comp = '<'
      ecomp = '<='
      break
    default:
      throw new TypeError('Must provide a hilo val of "<" or ">"')
  }

  // If it satisfies the range it is not outside
  if (satisfies(version, range, options)) {
    return false
  }

  // From now on, variable terms are as if we're in "gtr" mode.
  // but note that everything is flipped for the "ltr" function.

  for (let i = 0; i < range.set.length; ++i) {
    const comparators = range.set[i]

    let high = null
    let low = null

    comparators.forEach((comparator) => {
      if (comparator.semver === ANY) {
        comparator = new Comparator('>=0.0.0')
      }
      high = high || comparator
      low = low || comparator
      if (gtfn(comparator.semver, high.semver, options)) {
        high = comparator
      } else if (ltfn(comparator.semver, low.semver, options)) {
        low = comparator
      }
    })

    // If the edge version comparator has a operator then our version
    // isn't outside it
    if (high.operator === comp || high.operator === ecomp) {
      return false
    }

    // If the lowest version comparator has an operator and our version
    // is less than it then it isn't higher than the range
    if ((!low.operator || low.operator === comp) &&
        ltefn(version, low.semver)) {
      return false
    } else if (low.operator === ecomp && ltfn(version, low.semver)) {
      return false
    }
  }
  return true
}

module.exports = outside


/***/ }),

/***/ 82028:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



// given a set of versions and a range, create a "simplified" range
// that includes the same versions that the original range does
// If the original range is shorter than the simplified one, return that.
const satisfies = __webpack_require__(68011)
const compare = __webpack_require__(78469)
module.exports = (versions, range, options) => {
  const set = []
  let first = null
  let prev = null
  const v = versions.sort((a, b) => compare(a, b, options))
  for (const version of v) {
    const included = satisfies(version, range, options)
    if (included) {
      prev = version
      if (!first) {
        first = version
      }
    } else {
      if (prev) {
        set.push([first, prev])
      }
      prev = null
      first = null
    }
  }
  if (first) {
    set.push([first, null])
  }

  const ranges = []
  for (const [min, max] of set) {
    if (min === max) {
      ranges.push(min)
    } else if (!max && min === v[0]) {
      ranges.push('*')
    } else if (!max) {
      ranges.push(`>=${min}`)
    } else if (min === v[0]) {
      ranges.push(`<=${max}`)
    } else {
      ranges.push(`${min} - ${max}`)
    }
  }
  const simplified = ranges.join(' || ')
  const original = typeof range.raw === 'string' ? range.raw : String(range)
  return simplified.length < original.length ? simplified : range
}


/***/ }),

/***/ 61489:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



const Range = __webpack_require__(96782)
const Comparator = __webpack_require__(89379)
const { ANY } = Comparator
const satisfies = __webpack_require__(68011)
const compare = __webpack_require__(78469)

// Complex range `r1 || r2 || ...` is a subset of `R1 || R2 || ...` iff:
// - Every simple range `r1, r2, ...` is a null set, OR
// - Every simple range `r1, r2, ...` which is not a null set is a subset of
//   some `R1, R2, ...`
//
// Simple range `c1 c2 ...` is a subset of simple range `C1 C2 ...` iff:
// - If c is only the ANY comparator
//   - If C is only the ANY comparator, return true
//   - Else if in prerelease mode, return false
//   - else replace c with `[>=0.0.0]`
// - If C is only the ANY comparator
//   - if in prerelease mode, return true
//   - else replace C with `[>=0.0.0]`
// - Let EQ be the set of = comparators in c
// - If EQ is more than one, return true (null set)
// - Let GT be the highest > or >= comparator in c
// - Let LT be the lowest < or <= comparator in c
// - If GT and LT, and GT.semver > LT.semver, return true (null set)
// - If any C is a = range, and GT or LT are set, return false
// - If EQ
//   - If GT, and EQ does not satisfy GT, return true (null set)
//   - If LT, and EQ does not satisfy LT, return true (null set)
//   - If EQ satisfies every C, return true
//   - Else return false
// - If GT
//   - If GT.semver is lower than any > or >= comp in C, return false
//   - If GT is >=, and GT.semver does not satisfy every C, return false
//   - If GT.semver has a prerelease, and not in prerelease mode
//     - If no C has a prerelease and the GT.semver tuple, return false
// - If LT
//   - If LT.semver is greater than any < or <= comp in C, return false
//   - If LT is <=, and LT.semver does not satisfy every C, return false
//   - If LT.semver has a prerelease, and not in prerelease mode
//     - If no C has a prerelease and the LT.semver tuple, return false
// - Else return true

const subset = (sub, dom, options = {}) => {
  if (sub === dom) {
    return true
  }

  sub = new Range(sub, options)
  dom = new Range(dom, options)
  let sawNonNull = false

  OUTER: for (const simpleSub of sub.set) {
    for (const simpleDom of dom.set) {
      const isSub = simpleSubset(simpleSub, simpleDom, options)
      sawNonNull = sawNonNull || isSub !== null
      if (isSub) {
        continue OUTER
      }
    }
    // the null set is a subset of everything, but null simple ranges in
    // a complex range should be ignored.  so if we saw a non-null range,
    // then we know this isn't a subset, but if EVERY simple range was null,
    // then it is a subset.
    if (sawNonNull) {
      return false
    }
  }
  return true
}

const minimumVersionWithPreRelease = [new Comparator('>=0.0.0-0')]
const minimumVersion = [new Comparator('>=0.0.0')]

const simpleSubset = (sub, dom, options) => {
  if (sub === dom) {
    return true
  }

  if (sub.length === 1 && sub[0].semver === ANY) {
    if (dom.length === 1 && dom[0].semver === ANY) {
      return true
    } else if (options.includePrerelease) {
      sub = minimumVersionWithPreRelease
    } else {
      sub = minimumVersion
    }
  }

  if (dom.length === 1 && dom[0].semver === ANY) {
    if (options.includePrerelease) {
      return true
    } else {
      dom = minimumVersion
    }
  }

  const eqSet = new Set()
  let gt, lt
  for (const c of sub) {
    if (c.operator === '>' || c.operator === '>=') {
      gt = higherGT(gt, c, options)
    } else if (c.operator === '<' || c.operator === '<=') {
      lt = lowerLT(lt, c, options)
    } else {
      eqSet.add(c.semver)
    }
  }

  if (eqSet.size > 1) {
    return null
  }

  let gtltComp
  if (gt && lt) {
    gtltComp = compare(gt.semver, lt.semver, options)
    if (gtltComp > 0) {
      return null
    } else if (gtltComp === 0 && (gt.operator !== '>=' || lt.operator !== '<=')) {
      return null
    }
  }

  // will iterate one or zero times
  for (const eq of eqSet) {
    if (gt && !satisfies(eq, String(gt), options)) {
      return null
    }

    if (lt && !satisfies(eq, String(lt), options)) {
      return null
    }

    for (const c of dom) {
      if (!satisfies(eq, String(c), options)) {
        return false
      }
    }

    return true
  }

  let higher, lower
  let hasDomLT, hasDomGT
  // if the subset has a prerelease, we need a comparator in the superset
  // with the same tuple and a prerelease, or it's not a subset
  let needDomLTPre = lt &&
    !options.includePrerelease &&
    lt.semver.prerelease.length ? lt.semver : false
  let needDomGTPre = gt &&
    !options.includePrerelease &&
    gt.semver.prerelease.length ? gt.semver : false
  // exception: <1.2.3-0 is the same as <1.2.3
  if (needDomLTPre && needDomLTPre.prerelease.length === 1 &&
      lt.operator === '<' && needDomLTPre.prerelease[0] === 0) {
    needDomLTPre = false
  }

  for (const c of dom) {
    hasDomGT = hasDomGT || c.operator === '>' || c.operator === '>='
    hasDomLT = hasDomLT || c.operator === '<' || c.operator === '<='
    if (gt) {
      if (needDomGTPre) {
        if (c.semver.prerelease && c.semver.prerelease.length &&
            c.semver.major === needDomGTPre.major &&
            c.semver.minor === needDomGTPre.minor &&
            c.semver.patch === needDomGTPre.patch) {
          needDomGTPre = false
        }
      }
      if (c.operator === '>' || c.operator === '>=') {
        higher = higherGT(gt, c, options)
        if (higher === c && higher !== gt) {
          return false
        }
      } else if (gt.operator === '>=' && !c.test(gt.semver)) {
        return false
      }
    }
    if (lt) {
      if (needDomLTPre) {
        if (c.semver.prerelease && c.semver.prerelease.length &&
            c.semver.major === needDomLTPre.major &&
            c.semver.minor === needDomLTPre.minor &&
            c.semver.patch === needDomLTPre.patch) {
          needDomLTPre = false
        }
      }
      if (c.operator === '<' || c.operator === '<=') {
        lower = lowerLT(lt, c, options)
        if (lower === c && lower !== lt) {
          return false
        }
      } else if (lt.operator === '<=' && !c.test(lt.semver)) {
        return false
      }
    }
    if (!c.operator && (lt || gt) && gtltComp !== 0) {
      return false
    }
  }

  // if there was a < or >, and nothing in the dom, then must be false
  // UNLESS it was limited by another range in the other direction.
  // Eg, >1.0.0 <1.0.1 is still a subset of <2.0.0
  if (gt && hasDomLT && !lt && gtltComp !== 0) {
    return false
  }

  if (lt && hasDomGT && !gt && gtltComp !== 0) {
    return false
  }

  // we needed a prerelease range in a specific tuple, but didn't get one
  // then this isn't a subset.  eg >=1.2.3-pre is not a subset of >=1.0.0,
  // because it includes prereleases in the 1.2.3 tuple
  if (needDomGTPre || needDomLTPre) {
    return false
  }

  return true
}

// >=1.2.3 is lower than >1.2.3
const higherGT = (a, b, options) => {
  if (!a) {
    return b
  }
  const comp = compare(a.semver, b.semver, options)
  return comp > 0 ? a
    : comp < 0 ? b
    : b.operator === '>' && a.operator === '>=' ? b
    : a
}

// <=1.2.3 is higher than <1.2.3
const lowerLT = (a, b, options) => {
  if (!a) {
    return b
  }
  const comp = compare(a.semver, b.semver, options)
  return comp < 0 ? a
    : comp > 0 ? b
    : b.operator === '<' && a.operator === '<=' ? b
    : a
}

module.exports = subset


/***/ }),

/***/ 54750:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



const Range = __webpack_require__(96782)

// Mostly just for testing and legacy API reasons
const toComparators = (range, options) =>
  new Range(range, options).set
    .map(comp => comp.map(c => c.value).join(' ').trim().split(' '))

module.exports = toComparators


/***/ }),

/***/ 64737:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



const Range = __webpack_require__(96782)
const validRange = (range, options) => {
  try {
    // Return '*' instead of '' so that truthiness works.
    // This will throw if it's invalid anyway
    return new Range(range, options).range || '*'
  } catch (er) {
    return null
  }
}
module.exports = validRange


/***/ }),

/***/ 21367:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



const { version } = __webpack_require__(65847)
const { EventEmitter } = __webpack_require__(24434)
const { Worker } = __webpack_require__(28167)
const { join } = __webpack_require__(16928)
const { pathToFileURL } = __webpack_require__(87016)
const { wait } = __webpack_require__(18862)
const {
  WRITE_INDEX,
  READ_INDEX,
  SEQ_INDEX
} = __webpack_require__(25835)
const buffer = __webpack_require__(20181)
const assert = __webpack_require__(42613)

const kImpl = Symbol('kImpl')

// V8 limit for string size
const MAX_STRING = buffer.constants.MAX_STRING_LENGTH

function updateState (stream, fn) {
  Atomics.add(stream[kImpl].state, SEQ_INDEX, 1)
  fn()
  Atomics.add(stream[kImpl].state, SEQ_INDEX, 1)
  Atomics.notify(stream[kImpl].state, SEQ_INDEX)
}

class FakeWeakRef {
  constructor (value) {
    this._value = value
  }

  deref () {
    return this._value
  }
}

class FakeFinalizationRegistry {
  register () {}

  unregister () {}
}

// Currently using FinalizationRegistry with code coverage breaks the world
// Ref: https://github.com/nodejs/node/issues/49344
const FinalizationRegistry = process.env.NODE_V8_COVERAGE ? FakeFinalizationRegistry : global.FinalizationRegistry || FakeFinalizationRegistry
const WeakRef = process.env.NODE_V8_COVERAGE ? FakeWeakRef : global.WeakRef || FakeWeakRef

const registry = new FinalizationRegistry((worker) => {
  if (worker.exited) {
    return
  }
  worker.terminate()
})

function createWorker (stream, opts) {
  const { filename, workerData } = opts

  const bundlerOverrides = '__bundlerPathsOverrides' in globalThis ? globalThis.__bundlerPathsOverrides : {}
  const toExecute = bundlerOverrides['thread-stream-worker'] || __webpack_require__.ab + "worker.js"

  const worker = new Worker(toExecute, {
    ...opts.workerOpts,
    trackUnmanagedFds: false,
    workerData: {
      filename: filename.indexOf('file://') === 0
        ? filename
        : pathToFileURL(filename).href,
      dataBuf: stream[kImpl].dataBuf,
      stateBuf: stream[kImpl].stateBuf,
      workerData: {
        $context: {
          threadStreamVersion: version
        },
        ...workerData
      }
    }
  })

  // We keep a strong reference for now,
  // we need to start writing first
  worker.stream = new FakeWeakRef(stream)

  worker.on('message', onWorkerMessage)
  worker.on('exit', onWorkerExit)
  registry.register(stream, worker)

  return worker
}

function drain (stream) {
  assert(!stream[kImpl].sync)
  if (stream[kImpl].needDrain) {
    stream[kImpl].needDrain = false
    stream.emit('drain')
  }
}

function nextFlush (stream) {
  const writeIndex = Atomics.load(stream[kImpl].state, WRITE_INDEX)
  let leftover = stream[kImpl].data.length - writeIndex

  if (leftover > 0) {
    if (stream[kImpl].buf.length === 0) {
      stream[kImpl].flushing = false

      if (stream[kImpl].ending) {
        end(stream)
      } else if (stream[kImpl].needDrain) {
        process.nextTick(drain, stream)
      }

      return
    }

    let toWrite = stream[kImpl].buf.slice(0, leftover)
    let toWriteBytes = Buffer.byteLength(toWrite)
    if (toWriteBytes <= leftover) {
      stream[kImpl].buf = stream[kImpl].buf.slice(leftover)
      // process._rawDebug('writing ' + toWrite.length)
      write(stream, toWrite, nextFlush.bind(null, stream))
    } else {
      // multi-byte utf-8
      stream.flush(() => {
        // err is already handled in flush()
        if (stream.destroyed) {
          return
        }

        updateState(stream, () => {
          Atomics.store(stream[kImpl].state, READ_INDEX, 0)
          Atomics.store(stream[kImpl].state, WRITE_INDEX, 0)
        })
        Atomics.notify(stream[kImpl].state, READ_INDEX)

        // Find a toWrite length that fits the buffer
        // it must exists as the buffer is at least 4 bytes length
        // and the max utf-8 length for a char is 4 bytes.
        while (toWriteBytes > stream[kImpl].data.length) {
          leftover = leftover / 2
          toWrite = stream[kImpl].buf.slice(0, leftover)
          toWriteBytes = Buffer.byteLength(toWrite)
        }
        stream[kImpl].buf = stream[kImpl].buf.slice(leftover)
        write(stream, toWrite, nextFlush.bind(null, stream))
      })
    }
  } else if (leftover === 0) {
    if (writeIndex === 0 && stream[kImpl].buf.length === 0) {
      // we had a flushSync in the meanwhile
      return
    }
    stream.flush(() => {
      updateState(stream, () => {
        Atomics.store(stream[kImpl].state, READ_INDEX, 0)
        Atomics.store(stream[kImpl].state, WRITE_INDEX, 0)
      })
      Atomics.notify(stream[kImpl].state, READ_INDEX)
      nextFlush(stream)
    })
  } else {
    // This should never happen
    destroy(stream, new Error('overwritten'))
  }
}

function onWorkerMessage (msg) {
  const stream = this.stream.deref()
  if (stream === undefined) {
    this.exited = true
    // Terminate the worker.
    this.terminate()
    return
  }

  // Node.js watch mode may send internal worker messages that do not
  // participate in thread-stream's worker protocol.
  if (msg?.code == null) {
    return
  }

  switch (msg.code) {
    case 'READY':
      // Replace the FakeWeakRef with a
      // proper one.
      this.stream = new WeakRef(stream)

      stream.flush(() => {
        stream[kImpl].ready = true
        stream.emit('ready')
      })
      break
    case 'ERROR':
      destroy(stream, msg.err)
      break
    case 'EVENT':
      if (Array.isArray(msg.args)) {
        stream.emit(msg.name, ...msg.args)
      } else {
        stream.emit(msg.name, msg.args)
      }
      break
    case 'WARNING':
      process.emitWarning(msg.err)
      break
    default:
      destroy(stream, new Error('this should not happen: ' + msg.code))
  }
}

function onWorkerExit (code) {
  const stream = this.stream.deref()
  if (stream === undefined) {
    // Nothing to do, the worker already exit
    return
  }
  registry.unregister(stream)
  stream.worker.exited = true
  stream.worker.off('exit', onWorkerExit)
  destroy(stream, code !== 0 ? new Error('the worker thread exited') : null)
}

class ThreadStream extends EventEmitter {
  constructor (opts = {}) {
    super()

    if (opts.bufferSize < 4) {
      throw new Error('bufferSize must at least fit a 4-byte utf-8 char')
    }

    this[kImpl] = {}
    this[kImpl].stateBuf = new SharedArrayBuffer(128)
    this[kImpl].state = new Int32Array(this[kImpl].stateBuf)
    this[kImpl].dataBuf = new SharedArrayBuffer(opts.bufferSize || 4 * 1024 * 1024)
    this[kImpl].data = Buffer.from(this[kImpl].dataBuf)
    this[kImpl].sync = opts.sync || false
    this[kImpl].ending = false
    this[kImpl].ended = false
    this[kImpl].needDrain = false
    this[kImpl].destroyed = false
    this[kImpl].flushing = false
    this[kImpl].ready = false
    this[kImpl].finished = false
    this[kImpl].errored = null
    this[kImpl].closed = false
    this[kImpl].buf = ''

    // TODO (fix): Make private?
    this.worker = createWorker(this, opts) // TODO (fix): make private
    this.on('message', (message, transferList) => {
      this.worker.postMessage(message, transferList)
    })
  }

  write (data) {
    if (this[kImpl].destroyed) {
      error(this, new Error('the worker has exited'))
      return false
    }

    if (this[kImpl].ending) {
      error(this, new Error('the worker is ending'))
      return false
    }

    if (this[kImpl].flushing && this[kImpl].buf.length + data.length >= MAX_STRING) {
      try {
        writeSync(this)
        this[kImpl].flushing = true
      } catch (err) {
        destroy(this, err)
        return false
      }
    }

    this[kImpl].buf += data

    if (this[kImpl].sync) {
      try {
        writeSync(this)
        return true
      } catch (err) {
        destroy(this, err)
        return false
      }
    }

    if (!this[kImpl].flushing) {
      this[kImpl].flushing = true
      setImmediate(nextFlush, this)
    }

    this[kImpl].needDrain = this[kImpl].data.length - this[kImpl].buf.length - Atomics.load(this[kImpl].state, WRITE_INDEX) <= 0
    return !this[kImpl].needDrain
  }

  end () {
    if (this[kImpl].destroyed) {
      return
    }

    this[kImpl].ending = true
    end(this)
  }

  flush (cb) {
    if (this[kImpl].destroyed) {
      if (typeof cb === 'function') {
        process.nextTick(cb, new Error('the worker has exited'))
      }
      return
    }

    // TODO write all .buf
    const writeIndex = Atomics.load(this[kImpl].state, WRITE_INDEX)
    // process._rawDebug(`(flush) readIndex (${Atomics.load(this.state, READ_INDEX)}) writeIndex (${Atomics.load(this.state, WRITE_INDEX)})`)
    wait(this[kImpl].state, READ_INDEX, writeIndex, Infinity, (err, res) => {
      if (err) {
        destroy(this, err)
        process.nextTick(cb, err)
        return
      }
      if (res === 'not-equal') {
        // TODO handle deadlock
        this.flush(cb)
        return
      }
      process.nextTick(cb)
    })
  }

  flushSync () {
    if (this[kImpl].destroyed) {
      return
    }

    writeSync(this)
    flushSync(this)
  }

  unref () {
    this.worker.unref()
  }

  ref () {
    this.worker.ref()
  }

  get ready () {
    return this[kImpl].ready
  }

  get destroyed () {
    return this[kImpl].destroyed
  }

  get closed () {
    return this[kImpl].closed
  }

  get writable () {
    return !this[kImpl].destroyed && !this[kImpl].ending
  }

  get writableEnded () {
    return this[kImpl].ending
  }

  get writableFinished () {
    return this[kImpl].finished
  }

  get writableNeedDrain () {
    return this[kImpl].needDrain
  }

  get writableObjectMode () {
    return false
  }

  get writableErrored () {
    return this[kImpl].errored
  }
}

function error (stream, err) {
  setImmediate(() => {
    stream.emit('error', err)
  })
}

function destroy (stream, err) {
  if (stream[kImpl].destroyed) {
    return
  }
  stream[kImpl].destroyed = true

  if (err) {
    stream[kImpl].errored = err
    error(stream, err)
  }

  if (!stream.worker.exited) {
    stream.worker.terminate()
      .catch(() => {})
      .then(() => {
        stream[kImpl].closed = true
        stream.emit('close')
      })
  } else {
    setImmediate(() => {
      stream[kImpl].closed = true
      stream.emit('close')
    })
  }
}

function write (stream, data, cb) {
  // data is smaller than the shared buffer length
  const current = Atomics.load(stream[kImpl].state, WRITE_INDEX)
  const length = Buffer.byteLength(data)
  stream[kImpl].data.write(data, current)
  updateState(stream, () => {
    Atomics.store(stream[kImpl].state, WRITE_INDEX, current + length)
  })
  cb()
  return true
}

function end (stream) {
  if (stream[kImpl].ended || !stream[kImpl].ending || stream[kImpl].flushing) {
    return
  }
  stream[kImpl].ended = true

  try {
    stream.flushSync()

    let readIndex = Atomics.load(stream[kImpl].state, READ_INDEX)

    // process._rawDebug('writing index')
    updateState(stream, () => {
      Atomics.store(stream[kImpl].state, WRITE_INDEX, -1)
    })
    // process._rawDebug(`(end) readIndex (${Atomics.load(stream.state, READ_INDEX)}) writeIndex (${Atomics.load(stream.state, WRITE_INDEX)})`)

    // Wait for the process to complete
    let spins = 0
    while (readIndex !== -1) {
      // process._rawDebug(`read = ${read}`)
      Atomics.wait(stream[kImpl].state, READ_INDEX, readIndex, 1000)
      readIndex = Atomics.load(stream[kImpl].state, READ_INDEX)

      if (readIndex === -2) {
        destroy(stream, new Error('end() failed'))
        return
      }

      if (++spins === 10) {
        destroy(stream, new Error('end() took too long (10s)'))
        return
      }
    }

    process.nextTick(() => {
      stream[kImpl].finished = true
      stream.emit('finish')
    })
  } catch (err) {
    destroy(stream, err)
  }
  // process._rawDebug('end finished...')
}

function writeSync (stream) {
  const cb = () => {
    if (stream[kImpl].ending) {
      end(stream)
    } else if (stream[kImpl].needDrain) {
      process.nextTick(drain, stream)
    }
  }
  stream[kImpl].flushing = false

  while (stream[kImpl].buf.length !== 0) {
    const writeIndex = Atomics.load(stream[kImpl].state, WRITE_INDEX)
    let leftover = stream[kImpl].data.length - writeIndex
    if (leftover === 0) {
      flushSync(stream)
      updateState(stream, () => {
        Atomics.store(stream[kImpl].state, READ_INDEX, 0)
        Atomics.store(stream[kImpl].state, WRITE_INDEX, 0)
      })
      Atomics.notify(stream[kImpl].state, READ_INDEX)
      continue
    } else if (leftover < 0) {
      // stream should never happen
      throw new Error('overwritten')
    }

    let toWrite = stream[kImpl].buf.slice(0, leftover)
    let toWriteBytes = Buffer.byteLength(toWrite)
    if (toWriteBytes <= leftover) {
      stream[kImpl].buf = stream[kImpl].buf.slice(leftover)
      // process._rawDebug('writing ' + toWrite.length)
      write(stream, toWrite, cb)
    } else {
      // multi-byte utf-8
      flushSync(stream)
      updateState(stream, () => {
        Atomics.store(stream[kImpl].state, READ_INDEX, 0)
        Atomics.store(stream[kImpl].state, WRITE_INDEX, 0)
      })
      Atomics.notify(stream[kImpl].state, READ_INDEX)

      // Find a toWrite length that fits the buffer
      // it must exists as the buffer is at least 4 bytes length
      // and the max utf-8 length for a char is 4 bytes.
      while (toWriteBytes > stream[kImpl].buf.length) {
        leftover = leftover / 2
        toWrite = stream[kImpl].buf.slice(0, leftover)
        toWriteBytes = Buffer.byteLength(toWrite)
      }
      stream[kImpl].buf = stream[kImpl].buf.slice(leftover)
      write(stream, toWrite, cb)
    }
  }
}

function flushSync (stream) {
  if (stream[kImpl].flushing) {
    throw new Error('unable to flush while flushing')
  }

  // process._rawDebug('flushSync started')

  const writeIndex = Atomics.load(stream[kImpl].state, WRITE_INDEX)

  let spins = 0

  // TODO handle deadlock
  while (true) {
    const readIndex = Atomics.load(stream[kImpl].state, READ_INDEX)

    if (readIndex === -2) {
      throw Error('_flushSync failed')
    }

    // process._rawDebug(`(flushSync) readIndex (${readIndex}) writeIndex (${writeIndex})`)
    if (readIndex !== writeIndex) {
      // TODO stream timeouts for some reason.
      Atomics.wait(stream[kImpl].state, READ_INDEX, readIndex, 1000)
    } else {
      break
    }

    if (++spins === 10) {
      throw new Error('_flushSync took too long (10s)')
    }
  }
  // process._rawDebug('flushSync finished')
}

module.exports = ThreadStream


/***/ }),

/***/ 25835:
/***/ ((module) => {



const SEQ_INDEX = 2
const WRITE_INDEX = 4
const READ_INDEX = 8

module.exports = {
  WRITE_INDEX,
  READ_INDEX,
  SEQ_INDEX
}


/***/ }),

/***/ 18862:
/***/ ((module) => {



const MAX_TIMEOUT = 1000

function wait (state, index, expected, timeout, done) {
  const max = Date.now() + timeout
  let current = Atomics.load(state, index)
  if (current === expected) {
    done(null, 'ok')
    return
  }
  let prior = current
  const check = (backoff) => {
    if (Date.now() > max) {
      done(null, 'timed-out')
    } else {
      setTimeout(() => {
        prior = current
        current = Atomics.load(state, index)
        if (current === prior) {
          check(backoff >= MAX_TIMEOUT ? MAX_TIMEOUT : backoff * 2)
        } else {
          if (current === expected) done(null, 'ok')
          else done(null, 'not-equal')
        }
      }, backoff)
    }
  }
  check(1)
}

// let waitDiffCount = 0
function waitDiff (state, index, expected, timeout, done) {
  // const id = waitDiffCount++
  // process._rawDebug(`>>> waitDiff ${id}`)
  const max = Date.now() + timeout
  let current = Atomics.load(state, index)
  if (current !== expected) {
    done(null, 'ok')
    return
  }
  const check = (backoff) => {
    // process._rawDebug(`${id} ${index} current ${current} expected ${expected}`)
    // process._rawDebug('' + backoff)
    if (Date.now() > max) {
      done(null, 'timed-out')
    } else {
      setTimeout(() => {
        current = Atomics.load(state, index)
        if (current !== expected) {
          done(null, 'ok')
        } else {
          check(backoff >= MAX_TIMEOUT ? MAX_TIMEOUT : backoff * 2)
        }
      }, backoff)
    }
  }
  check(1)
}

module.exports = { wait, waitDiff }


/***/ }),

/***/ 10661:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const tslib_1 = __webpack_require__(61860);
tslib_1.__exportStar(__webpack_require__(15962), exports);
tslib_1.__exportStar(__webpack_require__(83319), exports);
tslib_1.__exportStar(__webpack_require__(27084), exports);


/***/ }),

/***/ 83319:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.printBinary = void 0;
const printBinary = (tab = '', children) => {
    const left = children[0], right = children[1];
    let str = '';
    if (left)
        str += '\n' + tab + '← ' + left(tab + '  ');
    if (right)
        str += '\n' + tab + '→ ' + right(tab + '  ');
    return str;
};
exports.printBinary = printBinary;


/***/ }),

/***/ 27084:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.printJson = void 0;
const printJson = (tab = '', json, space = 2) => (JSON.stringify(json, null, space) || 'nil').split('\n').join('\n' + tab);
exports.printJson = printJson;


/***/ }),

/***/ 15962:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.printTree = void 0;
const printTree = (tab = '', children) => {
    let str = '';
    let last = children.length - 1;
    for (; last >= 0; last--)
        if (children[last])
            break;
    for (let i = 0; i <= last; i++) {
        const fn = children[i];
        if (!fn)
            continue;
        const isLast = i === last;
        const child = fn(tab + (isLast ? ' ' : '│') + '  ');
        const branch = child ? (isLast ? '└─' : '├─') : '│';
        str += '\n' + tab + branch + (child ? ' ' + child : '');
    }
    return str;
};
exports.printTree = printTree;


/***/ }),

/***/ 51245:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



const errSerializer = __webpack_require__(44746)
const errWithCauseSerializer = __webpack_require__(75037)
const reqSerializers = __webpack_require__(97377)
const resSerializers = __webpack_require__(96895)

module.exports = {
  err: errSerializer,
  errWithCause: errWithCauseSerializer,
  mapHttpRequest: reqSerializers.mapHttpRequest,
  mapHttpResponse: resSerializers.mapHttpResponse,
  req: reqSerializers.reqSerializer,
  res: resSerializers.resSerializer,

  wrapErrorSerializer: function wrapErrorSerializer (customSerializer) {
    if (customSerializer === errSerializer) return customSerializer
    return function wrapErrSerializer (err) {
      return customSerializer(errSerializer(err))
    }
  },

  wrapRequestSerializer: function wrapRequestSerializer (customSerializer) {
    if (customSerializer === reqSerializers.reqSerializer) return customSerializer
    return function wrappedReqSerializer (req) {
      return customSerializer(reqSerializers.reqSerializer(req))
    }
  },

  wrapResponseSerializer: function wrapResponseSerializer (customSerializer) {
    if (customSerializer === resSerializers.resSerializer) return customSerializer
    return function wrappedResSerializer (res) {
      return customSerializer(resSerializers.resSerializer(res))
    }
  }
}


/***/ }),

/***/ 41422:
/***/ ((module) => {



// **************************************************************
// * Code initially copied/adapted from "pony-cause" npm module *
// * Please upstream improvements there                         *
// **************************************************************

const isErrorLike = (err) => {
  return err && typeof err.message === 'string'
}

/**
 * @param {Error|{ cause?: unknown|(()=>err)}} err
 * @returns {Error|Object|undefined}
 */
const getErrorCause = (err) => {
  if (!err) return

  /** @type {unknown} */
  // @ts-ignore
  const cause = err.cause

  // VError / NError style causes
  if (typeof cause === 'function') {
    // @ts-ignore
    const causeResult = err.cause()

    return isErrorLike(causeResult)
      ? causeResult
      : undefined
  } else {
    return isErrorLike(cause)
      ? cause
      : undefined
  }
}

/**
 * Internal method that keeps a track of which error we have already added, to avoid circular recursion
 *
 * @private
 * @param {Error} err
 * @param {Set<Error>} seen
 * @returns {string}
 */
const _stackWithCauses = (err, seen) => {
  if (!isErrorLike(err)) return ''

  const stack = err.stack || ''

  // Ensure we don't go circular or crazily deep
  if (seen.has(err)) {
    return stack + '\ncauses have become circular...'
  }

  const cause = getErrorCause(err)

  if (cause) {
    seen.add(err)
    return (stack + '\ncaused by: ' + _stackWithCauses(cause, seen))
  } else {
    return stack
  }
}

/**
 * @param {Error} err
 * @returns {string}
 */
const stackWithCauses = (err) => _stackWithCauses(err, new Set())

/**
 * Internal method that keeps a track of which error we have already added, to avoid circular recursion
 *
 * @private
 * @param {Error} err
 * @param {Set<Error>} seen
 * @param {boolean} [skip]
 * @returns {string}
 */
const _messageWithCauses = (err, seen, skip) => {
  if (!isErrorLike(err)) return ''

  const message = skip ? '' : (err.message || '')

  // Ensure we don't go circular or crazily deep
  if (seen.has(err)) {
    return message + ': ...'
  }

  const cause = getErrorCause(err)

  if (cause) {
    seen.add(err)

    // @ts-ignore
    const skipIfVErrorStyleCause = typeof err.cause === 'function'

    return (message +
      (skipIfVErrorStyleCause ? '' : ': ') +
      _messageWithCauses(cause, seen, skipIfVErrorStyleCause))
  } else {
    return message
  }
}

/**
 * @param {Error} err
 * @returns {string}
 */
const messageWithCauses = (err) => _messageWithCauses(err, new Set())

module.exports = {
  isErrorLike,
  getErrorCause,
  stackWithCauses,
  messageWithCauses
}


/***/ }),

/***/ 61709:
/***/ ((module) => {



const seen = Symbol('circular-ref-tag')
const rawSymbol = Symbol('pino-raw-err-ref')

const pinoErrProto = Object.create({}, {
  type: {
    enumerable: true,
    writable: true,
    value: undefined
  },
  message: {
    enumerable: true,
    writable: true,
    value: undefined
  },
  stack: {
    enumerable: true,
    writable: true,
    value: undefined
  },
  aggregateErrors: {
    enumerable: true,
    writable: true,
    value: undefined
  },
  raw: {
    enumerable: false,
    get: function () {
      return this[rawSymbol]
    },
    set: function (val) {
      this[rawSymbol] = val
    }
  }
})
Object.defineProperty(pinoErrProto, rawSymbol, {
  writable: true,
  value: {}
})

module.exports = {
  pinoErrProto,
  pinoErrorSymbols: {
    seen,
    rawSymbol
  }
}


/***/ }),

/***/ 75037:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



module.exports = errWithCauseSerializer

const { isErrorLike } = __webpack_require__(41422)
const { pinoErrProto, pinoErrorSymbols } = __webpack_require__(61709)
const { seen } = pinoErrorSymbols

const { toString } = Object.prototype

function errWithCauseSerializer (err) {
  if (!isErrorLike(err)) {
    return err
  }

  err[seen] = undefined // tag to prevent re-looking at this
  const _err = Object.create(pinoErrProto)
  _err.type = toString.call(err.constructor) === '[object Function]'
    ? err.constructor.name
    : err.name
  _err.message = err.message
  _err.stack = err.stack

  if (Array.isArray(err.errors)) {
    _err.aggregateErrors = err.errors.map(err => errWithCauseSerializer(err))
  }

  if (isErrorLike(err.cause) && !Object.prototype.hasOwnProperty.call(err.cause, seen)) {
    _err.cause = errWithCauseSerializer(err.cause)
  }

  for (const key in err) {
    if (_err[key] === undefined) {
      const val = err[key]
      if (isErrorLike(val)) {
        if (!Object.prototype.hasOwnProperty.call(val, seen)) {
          _err[key] = errWithCauseSerializer(val)
        }
      } else {
        _err[key] = val
      }
    }
  }

  delete err[seen] // clean up tag in case err is serialized again later
  _err.raw = err
  return _err
}


/***/ }),

/***/ 44746:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



module.exports = errSerializer

const { messageWithCauses, stackWithCauses, isErrorLike } = __webpack_require__(41422)
const { pinoErrProto, pinoErrorSymbols } = __webpack_require__(61709)
const { seen } = pinoErrorSymbols

const { toString } = Object.prototype

function errSerializer (err) {
  if (!isErrorLike(err)) {
    return err
  }

  err[seen] = undefined // tag to prevent re-looking at this
  const _err = Object.create(pinoErrProto)
  _err.type = toString.call(err.constructor) === '[object Function]'
    ? err.constructor.name
    : err.name
  _err.message = messageWithCauses(err)
  _err.stack = stackWithCauses(err)

  if (Array.isArray(err.errors)) {
    _err.aggregateErrors = err.errors.map(err => errSerializer(err))
  }

  for (const key in err) {
    if (_err[key] === undefined) {
      const val = err[key]
      if (isErrorLike(val)) {
        // We append cause messages and stacks to _err, therefore skipping causes here
        if (key !== 'cause' && !Object.prototype.hasOwnProperty.call(val, seen)) {
          _err[key] = errSerializer(val)
        }
      } else {
        _err[key] = val
      }
    }
  }

  delete err[seen] // clean up tag in case err is serialized again later
  _err.raw = err
  return _err
}


/***/ }),

/***/ 97377:
/***/ ((module) => {



module.exports = {
  mapHttpRequest,
  reqSerializer
}

const rawSymbol = Symbol('pino-raw-req-ref')
const pinoReqProto = Object.create({}, {
  id: {
    enumerable: true,
    writable: true,
    value: ''
  },
  method: {
    enumerable: true,
    writable: true,
    value: ''
  },
  url: {
    enumerable: true,
    writable: true,
    value: ''
  },
  query: {
    enumerable: true,
    writable: true,
    value: ''
  },
  params: {
    enumerable: true,
    writable: true,
    value: ''
  },
  headers: {
    enumerable: true,
    writable: true,
    value: {}
  },
  remoteAddress: {
    enumerable: true,
    writable: true,
    value: ''
  },
  remotePort: {
    enumerable: true,
    writable: true,
    value: ''
  },
  raw: {
    enumerable: false,
    get: function () {
      return this[rawSymbol]
    },
    set: function (val) {
      this[rawSymbol] = val
    }
  }
})
Object.defineProperty(pinoReqProto, rawSymbol, {
  writable: true,
  value: {}
})

function reqSerializer (req) {
  // req.info is for hapi compat.
  const connection = req.info || req.socket
  const _req = Object.create(pinoReqProto)
  _req.id = (typeof req.id === 'function' ? req.id() : (req.id || (req.info ? req.info.id : undefined)))
  _req.method = req.method
  // req.originalUrl is for expressjs compat.
  if (req.originalUrl) {
    _req.url = req.originalUrl
  } else {
    const path = req.path
    // path for safe hapi compat.
    _req.url = typeof path === 'string' ? path : (req.url ? req.url.path || req.url : undefined)
  }

  if (req.query) {
    _req.query = req.query
  }

  if (req.params) {
    _req.params = req.params
  }

  _req.headers = req.headers
  _req.remoteAddress = connection && connection.remoteAddress
  _req.remotePort = connection && connection.remotePort
  // req.raw is  for hapi compat/equivalence
  _req.raw = req.raw || req
  return _req
}

function mapHttpRequest (req) {
  return {
    req: reqSerializer(req)
  }
}


/***/ }),

/***/ 96895:
/***/ ((module) => {



module.exports = {
  mapHttpResponse,
  resSerializer
}

const rawSymbol = Symbol('pino-raw-res-ref')
const pinoResProto = Object.create({}, {
  statusCode: {
    enumerable: true,
    writable: true,
    value: 0
  },
  headers: {
    enumerable: true,
    writable: true,
    value: ''
  },
  raw: {
    enumerable: false,
    get: function () {
      return this[rawSymbol]
    },
    set: function (val) {
      this[rawSymbol] = val
    }
  }
})
Object.defineProperty(pinoResProto, rawSymbol, {
  writable: true,
  value: {}
})

function resSerializer (res) {
  const _res = Object.create(pinoResProto)
  _res.statusCode = res.headersSent ? res.statusCode : null
  _res.headers = res.getHeaders ? res.getHeaders() : res._headers
  _res.raw = res
  return _res
}

function mapHttpResponse (res) {
  return {
    res: resSerializer(res)
  }
}


/***/ }),

/***/ 80450:
/***/ ((module) => {



function noOpPrepareStackTrace (_, stack) {
  return stack
}

module.exports = function getCallers () {
  const originalPrepare = Error.prepareStackTrace
  Error.prepareStackTrace = noOpPrepareStackTrace
  const stack = new Error().stack
  Error.prepareStackTrace = originalPrepare

  if (!Array.isArray(stack)) {
    return undefined
  }

  const entries = stack.slice(2)

  const fileNames = []

  for (const entry of entries) {
    if (!entry) {
      continue
    }

    fileNames.push(entry.getFileName())
  }

  return fileNames
}


/***/ }),

/***/ 63256:
/***/ ((module) => {

/**
 * Represents default log level values
 *
 * @enum {number}
 */
const DEFAULT_LEVELS = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60
}

/**
 * Represents sort order direction: `ascending` or `descending`
 *
 * @enum {string}
 */
const SORTING_ORDER = {
  ASC: 'ASC',
  DESC: 'DESC'
}

module.exports = {
  DEFAULT_LEVELS,
  SORTING_ORDER
}


/***/ }),

/***/ 63114:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {


/* eslint no-prototype-builtins: 0 */
const {
  lsCacheSym,
  levelValSym,
  useOnlyCustomLevelsSym,
  streamSym,
  formattersSym,
  hooksSym,
  levelCompSym
} = __webpack_require__(12520)
const { noop, genLog } = __webpack_require__(12694)
const { DEFAULT_LEVELS, SORTING_ORDER } = __webpack_require__(63256)

const levelMethods = {
  fatal: (hook) => {
    const logFatal = genLog(DEFAULT_LEVELS.fatal, hook)
    return function (...args) {
      const stream = this[streamSym]
      logFatal.call(this, ...args)
      if (typeof stream.flushSync === 'function') {
        try {
          stream.flushSync()
        } catch (e) {
          // https://github.com/pinojs/pino/pull/740#discussion_r346788313
        }
      }
    }
  },
  error: (hook) => genLog(DEFAULT_LEVELS.error, hook),
  warn: (hook) => genLog(DEFAULT_LEVELS.warn, hook),
  info: (hook) => genLog(DEFAULT_LEVELS.info, hook),
  debug: (hook) => genLog(DEFAULT_LEVELS.debug, hook),
  trace: (hook) => genLog(DEFAULT_LEVELS.trace, hook)
}

const nums = Object.keys(DEFAULT_LEVELS).reduce((o, k) => {
  o[DEFAULT_LEVELS[k]] = k
  return o
}, {})

const initialLsCache = Object.keys(nums).reduce((o, k) => {
  o[k] = '{"level":' + Number(k)
  return o
}, {})

function genLsCache (instance) {
  const formatter = instance[formattersSym].level
  const { labels } = instance.levels
  const cache = {}
  for (const label in labels) {
    const level = formatter(labels[label], Number(label))
    cache[label] = JSON.stringify(level).slice(0, -1)
  }
  instance[lsCacheSym] = cache
  return instance
}

function isStandardLevel (level, useOnlyCustomLevels) {
  if (useOnlyCustomLevels) {
    return false
  }

  switch (level) {
    case 'fatal':
    case 'error':
    case 'warn':
    case 'info':
    case 'debug':
    case 'trace':
      return true
    default:
      return false
  }
}

function setLevel (level) {
  const { labels, values } = this.levels
  if (typeof level === 'number') {
    if (labels[level] === undefined) throw Error('unknown level value' + level)
    level = labels[level]
  }
  if (values[level] === undefined) throw Error('unknown level ' + level)
  const preLevelVal = this[levelValSym]
  const levelVal = this[levelValSym] = values[level]
  const useOnlyCustomLevelsVal = this[useOnlyCustomLevelsSym]
  const levelComparison = this[levelCompSym]
  const hook = this[hooksSym].logMethod

  for (const key in values) {
    if (levelComparison(values[key], levelVal) === false) {
      this[key] = noop
      continue
    }
    this[key] = isStandardLevel(key, useOnlyCustomLevelsVal) ? levelMethods[key](hook) : genLog(values[key], hook)
  }

  this.emit(
    'level-change',
    level,
    levelVal,
    labels[preLevelVal],
    preLevelVal,
    this
  )
}

function getLevel (level) {
  const { levels, levelVal } = this
  // protection against potential loss of Pino scope from serializers (edge case with circular refs - https://github.com/pinojs/pino/issues/833)
  return (levels && levels.labels) ? levels.labels[levelVal] : ''
}

function isLevelEnabled (logLevel) {
  const { values } = this.levels
  const logLevelVal = values[logLevel]
  return logLevelVal !== undefined && this[levelCompSym](logLevelVal, this[levelValSym])
}

/**
 * Determine if the given `current` level is enabled by comparing it
 * against the current threshold (`expected`).
 *
 * @param {SORTING_ORDER} direction comparison direction "ASC" or "DESC"
 * @param {number} current current log level number representation
 * @param {number} expected threshold value to compare with
 * @returns {boolean}
 */
function compareLevel (direction, current, expected) {
  if (direction === SORTING_ORDER.DESC) {
    return current <= expected
  }

  return current >= expected
}

/**
 * Create a level comparison function based on `levelComparison`
 * it could a default function which compares levels either in "ascending" or "descending" order or custom comparison function
 *
 * @param {SORTING_ORDER | Function} levelComparison sort levels order direction or custom comparison function
 * @returns Function
 */
function genLevelComparison (levelComparison) {
  if (typeof levelComparison === 'string') {
    return compareLevel.bind(null, levelComparison)
  }

  return levelComparison
}

function mappings (customLevels = null, useOnlyCustomLevels = false) {
  const customNums = customLevels
    /* eslint-disable */
    ? Object.keys(customLevels).reduce((o, k) => {
        o[customLevels[k]] = k
        return o
      }, {})
    : null
    /* eslint-enable */

  const labels = Object.assign(
    Object.create(Object.prototype, { Infinity: { value: 'silent' } }),
    useOnlyCustomLevels ? null : nums,
    customNums
  )
  const values = Object.assign(
    Object.create(Object.prototype, { silent: { value: Infinity } }),
    useOnlyCustomLevels ? null : DEFAULT_LEVELS,
    customLevels
  )
  return { labels, values }
}

function assertDefaultLevelFound (defaultLevel, customLevels, useOnlyCustomLevels) {
  if (typeof defaultLevel === 'number') {
    const values = [].concat(
      Object.keys(customLevels || {}).map(key => customLevels[key]),
      useOnlyCustomLevels ? [] : Object.keys(nums).map(level => +level),
      Infinity
    )
    if (!values.includes(defaultLevel)) {
      throw Error(`default level:${defaultLevel} must be included in custom levels`)
    }
    return
  }

  const labels = Object.assign(
    Object.create(Object.prototype, { silent: { value: Infinity } }),
    useOnlyCustomLevels ? null : DEFAULT_LEVELS,
    customLevels
  )
  if (!(defaultLevel in labels)) {
    throw Error(`default level:${defaultLevel} must be included in custom levels`)
  }
}

function assertNoLevelCollisions (levels, customLevels) {
  const { labels, values } = levels
  for (const k in customLevels) {
    if (k in values) {
      throw Error('levels cannot be overridden')
    }
    if (customLevels[k] in labels) {
      throw Error('pre-existing level values cannot be used for new levels')
    }
  }
}

/**
 * Validates whether `levelComparison` is correct
 *
 * @throws Error
 * @param {SORTING_ORDER | Function} levelComparison - value to validate
 * @returns
 */
function assertLevelComparison (levelComparison) {
  if (typeof levelComparison === 'function') {
    return
  }

  if (typeof levelComparison === 'string' && Object.values(SORTING_ORDER).includes(levelComparison)) {
    return
  }

  throw new Error('Levels comparison should be one of "ASC", "DESC" or "function" type')
}

module.exports = {
  initialLsCache,
  genLsCache,
  levelMethods,
  getLevel,
  setLevel,
  isLevelEnabled,
  mappings,
  assertNoLevelCollisions,
  assertDefaultLevelFound,
  genLevelComparison,
  assertLevelComparison
}


/***/ }),

/***/ 14052:
/***/ ((module) => {



module.exports = { version: '9.14.0' }


/***/ }),

/***/ 50112:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



const metadata = Symbol.for('pino.metadata')
const { DEFAULT_LEVELS } = __webpack_require__(63256)

const DEFAULT_INFO_LEVEL = DEFAULT_LEVELS.info

function multistream (streamsArray, opts) {
  streamsArray = streamsArray || []
  opts = opts || { dedupe: false }

  const streamLevels = Object.create(DEFAULT_LEVELS)
  streamLevels.silent = Infinity
  if (opts.levels && typeof opts.levels === 'object') {
    Object.keys(opts.levels).forEach(i => {
      streamLevels[i] = opts.levels[i]
    })
  }

  const res = {
    write,
    add,
    remove,
    emit,
    flushSync,
    end,
    minLevel: 0,
    lastId: 0,
    streams: [],
    clone,
    [metadata]: true,
    streamLevels
  }

  if (Array.isArray(streamsArray)) {
    streamsArray.forEach(add, res)
  } else {
    add.call(res, streamsArray)
  }

  // clean this object up
  // or it will stay allocated forever
  // as it is closed on the following closures
  streamsArray = null

  return res

  // we can exit early because the streams are ordered by level
  function write (data) {
    let dest
    const level = this.lastLevel
    const { streams } = this
    // for handling situation when several streams has the same level
    let recordedLevel = 0
    let stream

    // if dedupe set to true we send logs to the stream with the highest level
    // therefore, we have to change sorting order
    for (let i = initLoopVar(streams.length, opts.dedupe); checkLoopVar(i, streams.length, opts.dedupe); i = adjustLoopVar(i, opts.dedupe)) {
      dest = streams[i]
      if (dest.level <= level) {
        if (recordedLevel !== 0 && recordedLevel !== dest.level) {
          break
        }
        stream = dest.stream
        if (stream[metadata]) {
          const { lastTime, lastMsg, lastObj, lastLogger } = this
          stream.lastLevel = level
          stream.lastTime = lastTime
          stream.lastMsg = lastMsg
          stream.lastObj = lastObj
          stream.lastLogger = lastLogger
        }
        stream.write(data)
        if (opts.dedupe) {
          recordedLevel = dest.level
        }
      } else if (!opts.dedupe) {
        break
      }
    }
  }

  function emit (...args) {
    for (const { stream } of this.streams) {
      if (typeof stream.emit === 'function') {
        stream.emit(...args)
      }
    }
  }

  function flushSync () {
    for (const { stream } of this.streams) {
      if (typeof stream.flushSync === 'function') {
        stream.flushSync()
      }
    }
  }

  function add (dest) {
    if (!dest) {
      return res
    }

    // Check that dest implements either StreamEntry or DestinationStream
    const isStream = typeof dest.write === 'function' || dest.stream
    const stream_ = dest.write ? dest : dest.stream
    // This is necessary to provide a meaningful error message, otherwise it throws somewhere inside write()
    if (!isStream) {
      throw Error('stream object needs to implement either StreamEntry or DestinationStream interface')
    }

    const { streams, streamLevels } = this

    let level
    if (typeof dest.levelVal === 'number') {
      level = dest.levelVal
    } else if (typeof dest.level === 'string') {
      level = streamLevels[dest.level]
    } else if (typeof dest.level === 'number') {
      level = dest.level
    } else {
      level = DEFAULT_INFO_LEVEL
    }

    const dest_ = {
      stream: stream_,
      level,
      levelVal: undefined,
      id: ++res.lastId
    }

    streams.unshift(dest_)
    streams.sort(compareByLevel)

    this.minLevel = streams[0].level

    return res
  }

  function remove (id) {
    const { streams } = this
    const index = streams.findIndex(s => s.id === id)

    if (index >= 0) {
      streams.splice(index, 1)
      streams.sort(compareByLevel)
      this.minLevel = streams.length > 0 ? streams[0].level : -1
    }

    return res
  }

  function end () {
    for (const { stream } of this.streams) {
      if (typeof stream.flushSync === 'function') {
        stream.flushSync()
      }
      stream.end()
    }
  }

  function clone (level) {
    const streams = new Array(this.streams.length)

    for (let i = 0; i < streams.length; i++) {
      streams[i] = {
        level,
        stream: this.streams[i].stream
      }
    }

    return {
      write,
      add,
      remove,
      minLevel: level,
      streams,
      clone,
      emit,
      flushSync,
      [metadata]: true
    }
  }
}

function compareByLevel (a, b) {
  return a.level - b.level
}

function initLoopVar (length, dedupe) {
  return dedupe ? length - 1 : 0
}

function adjustLoopVar (i, dedupe) {
  return dedupe ? i - 1 : i + 1
}

function checkLoopVar (i, length, dedupe) {
  return dedupe ? i >= 0 : i < length
}

module.exports = multistream


/***/ }),

/***/ 41239:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



/* eslint no-prototype-builtins: 0 */

const { EventEmitter } = __webpack_require__(78474)
const {
  lsCacheSym,
  levelValSym,
  setLevelSym,
  getLevelSym,
  chindingsSym,
  parsedChindingsSym,
  mixinSym,
  asJsonSym,
  writeSym,
  mixinMergeStrategySym,
  timeSym,
  timeSliceIndexSym,
  streamSym,
  serializersSym,
  formattersSym,
  errorKeySym,
  messageKeySym,
  useOnlyCustomLevelsSym,
  needsMetadataGsym,
  redactFmtSym,
  stringifySym,
  formatOptsSym,
  stringifiersSym,
  msgPrefixSym,
  hooksSym
} = __webpack_require__(12520)
const {
  getLevel,
  setLevel,
  isLevelEnabled,
  mappings,
  initialLsCache,
  genLsCache,
  assertNoLevelCollisions
} = __webpack_require__(63114)
const {
  asChindings,
  asJson,
  buildFormatters,
  stringify,
  noop
} = __webpack_require__(12694)
const {
  version
} = __webpack_require__(14052)
const redaction = __webpack_require__(59096)

// note: use of class is satirical
// https://github.com/pinojs/pino/pull/433#pullrequestreview-127703127
const constructor = class Pino {}
const prototype = {
  constructor,
  child,
  bindings,
  setBindings,
  flush,
  isLevelEnabled,
  version,
  get level () { return this[getLevelSym]() },
  set level (lvl) { this[setLevelSym](lvl) },
  get levelVal () { return this[levelValSym] },
  set levelVal (n) { throw Error('levelVal is read-only') },
  get msgPrefix () { return this[msgPrefixSym] },
  get [Symbol.toStringTag] () { return 'Pino' },
  [lsCacheSym]: initialLsCache,
  [writeSym]: write,
  [asJsonSym]: asJson,
  [getLevelSym]: getLevel,
  [setLevelSym]: setLevel
}

Object.setPrototypeOf(prototype, EventEmitter.prototype)

// exporting and consuming the prototype object using factory pattern fixes scoping issues with getters when serializing
module.exports = function () {
  return Object.create(prototype)
}

const resetChildingsFormatter = bindings => bindings
function child (bindings, options) {
  if (!bindings) {
    throw Error('missing bindings for child Pino')
  }
  const serializers = this[serializersSym]
  const formatters = this[formattersSym]
  const instance = Object.create(this)

  // If an `options` object was not supplied, we can improve
  // the performance of child creation by skipping
  // the checks for set options and simply return
  // a baseline instance.
  if (options == null) {
    if (instance[formattersSym].bindings !== resetChildingsFormatter) {
      instance[formattersSym] = buildFormatters(
        formatters.level,
        resetChildingsFormatter,
        formatters.log
      )
    }

    instance[chindingsSym] = asChindings(instance, bindings)

    // Always call setLevel to ensure child gets own method references
    // This prevents issues when parent methods are wrapped (e.g., by Sinon)
    instance[setLevelSym](this.level)

    if (this.onChild !== noop) {
      this.onChild(instance)
    }

    return instance
  }

  if (options.hasOwnProperty('serializers') === true) {
    instance[serializersSym] = Object.create(null)

    for (const k in serializers) {
      instance[serializersSym][k] = serializers[k]
    }
    const parentSymbols = Object.getOwnPropertySymbols(serializers)
    /* eslint no-var: off */
    for (var i = 0; i < parentSymbols.length; i++) {
      const ks = parentSymbols[i]
      instance[serializersSym][ks] = serializers[ks]
    }

    for (const bk in options.serializers) {
      instance[serializersSym][bk] = options.serializers[bk]
    }
    const bindingsSymbols = Object.getOwnPropertySymbols(options.serializers)
    for (var bi = 0; bi < bindingsSymbols.length; bi++) {
      const bks = bindingsSymbols[bi]
      instance[serializersSym][bks] = options.serializers[bks]
    }
  } else instance[serializersSym] = serializers
  if (options.hasOwnProperty('formatters')) {
    const { level, bindings: chindings, log } = options.formatters
    instance[formattersSym] = buildFormatters(
      level || formatters.level,
      chindings || resetChildingsFormatter,
      log || formatters.log
    )
  } else {
    instance[formattersSym] = buildFormatters(
      formatters.level,
      resetChildingsFormatter,
      formatters.log
    )
  }
  if (options.hasOwnProperty('customLevels') === true) {
    assertNoLevelCollisions(this.levels, options.customLevels)
    instance.levels = mappings(options.customLevels, instance[useOnlyCustomLevelsSym])
    genLsCache(instance)
  }

  // redact must place before asChindings and only replace if exist
  if ((typeof options.redact === 'object' && options.redact !== null) || Array.isArray(options.redact)) {
    instance.redact = options.redact // replace redact directly
    const stringifiers = redaction(instance.redact, stringify)
    const formatOpts = { stringify: stringifiers[redactFmtSym] }
    instance[stringifySym] = stringify
    instance[stringifiersSym] = stringifiers
    instance[formatOptsSym] = formatOpts
  }

  if (typeof options.msgPrefix === 'string') {
    instance[msgPrefixSym] = (this[msgPrefixSym] || '') + options.msgPrefix
  }

  instance[chindingsSym] = asChindings(instance, bindings)
  const childLevel = options.level || this.level
  instance[setLevelSym](childLevel)
  this.onChild(instance)
  return instance
}

function bindings () {
  const chindings = this[chindingsSym]
  const chindingsJson = `{${chindings.substr(1)}}` // at least contains ,"pid":7068,"hostname":"myMac"
  const bindingsFromJson = JSON.parse(chindingsJson)
  delete bindingsFromJson.pid
  delete bindingsFromJson.hostname
  return bindingsFromJson
}

function setBindings (newBindings) {
  const chindings = asChindings(this, newBindings)
  this[chindingsSym] = chindings
  delete this[parsedChindingsSym]
}

/**
 * Default strategy for creating `mergeObject` from arguments and the result from `mixin()`.
 * Fields from `mergeObject` have higher priority in this strategy.
 *
 * @param {Object} mergeObject The object a user has supplied to the logging function.
 * @param {Object} mixinObject The result of the `mixin` method.
 * @return {Object}
 */
function defaultMixinMergeStrategy (mergeObject, mixinObject) {
  return Object.assign(mixinObject, mergeObject)
}

function write (_obj, msg, num) {
  const t = this[timeSym]()
  const mixin = this[mixinSym]
  const errorKey = this[errorKeySym]
  const messageKey = this[messageKeySym]
  const mixinMergeStrategy = this[mixinMergeStrategySym] || defaultMixinMergeStrategy
  let obj
  const streamWriteHook = this[hooksSym].streamWrite

  if (_obj === undefined || _obj === null) {
    obj = {}
  } else if (_obj instanceof Error) {
    obj = { [errorKey]: _obj }
    if (msg === undefined) {
      msg = _obj.message
    }
  } else {
    obj = _obj
    if (msg === undefined && _obj[messageKey] === undefined && _obj[errorKey]) {
      msg = _obj[errorKey].message
    }
  }

  if (mixin) {
    obj = mixinMergeStrategy(obj, mixin(obj, num, this))
  }

  const s = this[asJsonSym](obj, msg, num, t)

  const stream = this[streamSym]
  if (stream[needsMetadataGsym] === true) {
    stream.lastLevel = num
    stream.lastObj = obj
    stream.lastMsg = msg
    stream.lastTime = t.slice(this[timeSliceIndexSym])
    stream.lastLogger = this // for child loggers
  }
  stream.write(streamWriteHook ? streamWriteHook(s) : s)
}

function flush (cb) {
  if (cb != null && typeof cb !== 'function') {
    throw Error('callback must be a function')
  }

  const stream = this[streamSym]

  if (typeof stream.flush === 'function') {
    stream.flush(cb || noop)
  } else if (cb) cb()
}


/***/ }),

/***/ 59096:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



const Redact = __webpack_require__(7769)
const { redactFmtSym, wildcardFirstSym } = __webpack_require__(12520)

// Custom rx regex equivalent to fast-redact's rx
const rx = /[^.[\]]+|\[([^[\]]*?)\]/g

const CENSOR = '[Redacted]'
const strict = false // TODO should this be configurable?

function redaction (opts, serialize) {
  const { paths, censor, remove } = handle(opts)

  const shape = paths.reduce((o, str) => {
    rx.lastIndex = 0
    const first = rx.exec(str)
    const next = rx.exec(str)

    // ns is the top-level path segment, brackets + quoting removed.
    let ns = first[1] !== undefined
      ? first[1].replace(/^(?:"|'|`)(.*)(?:"|'|`)$/, '$1')
      : first[0]

    if (ns === '*') {
      ns = wildcardFirstSym
    }

    // top level key:
    if (next === null) {
      o[ns] = null
      return o
    }

    // path with at least two segments:
    // if ns is already redacted at the top level, ignore lower level redactions
    if (o[ns] === null) {
      return o
    }

    const { index } = next
    const nextPath = `${str.substr(index, str.length - 1)}`

    o[ns] = o[ns] || []

    // shape is a mix of paths beginning with literal values and wildcard
    // paths [ "a.b.c", "*.b.z" ] should reduce to a shape of
    // { "a": [ "b.c", "b.z" ], *: [ "b.z" ] }
    // note: "b.z" is in both "a" and * arrays because "a" matches the wildcard.
    // (* entry has wildcardFirstSym as key)
    if (ns !== wildcardFirstSym && o[ns].length === 0) {
      // first time ns's get all '*' redactions so far
      o[ns].push(...(o[wildcardFirstSym] || []))
    }

    if (ns === wildcardFirstSym) {
      // new * path gets added to all previously registered literal ns's.
      Object.keys(o).forEach(function (k) {
        if (o[k]) {
          o[k].push(nextPath)
        }
      })
    }

    o[ns].push(nextPath)
    return o
  }, {})

  // the redactor assigned to the format symbol key
  // provides top level redaction for instances where
  // an object is interpolated into the msg string
  const result = {
    [redactFmtSym]: Redact({ paths, censor, serialize, strict, remove })
  }

  const topCensor = (...args) => {
    return typeof censor === 'function' ? serialize(censor(...args)) : serialize(censor)
  }

  return [...Object.keys(shape), ...Object.getOwnPropertySymbols(shape)].reduce((o, k) => {
    // top level key:
    if (shape[k] === null) {
      o[k] = (value) => topCensor(value, [k])
    } else {
      const wrappedCensor = typeof censor === 'function'
        ? (value, path) => {
            return censor(value, [k, ...path])
          }
        : censor
      o[k] = Redact({
        paths: shape[k],
        censor: wrappedCensor,
        serialize,
        strict,
        remove
      })
    }
    return o
  }, result)
}

function handle (opts) {
  if (Array.isArray(opts)) {
    opts = { paths: opts, censor: CENSOR }
    return opts
  }
  let { paths, censor = CENSOR, remove } = opts
  if (Array.isArray(paths) === false) { throw Error('pino – redact must contain an array of strings') }
  if (remove === true) censor = undefined

  return { paths, censor, remove }
}

module.exports = redaction


/***/ }),

/***/ 12520:
/***/ ((module) => {



const setLevelSym = Symbol('pino.setLevel')
const getLevelSym = Symbol('pino.getLevel')
const levelValSym = Symbol('pino.levelVal')
const levelCompSym = Symbol('pino.levelComp')
const useLevelLabelsSym = Symbol('pino.useLevelLabels')
const useOnlyCustomLevelsSym = Symbol('pino.useOnlyCustomLevels')
const mixinSym = Symbol('pino.mixin')

const lsCacheSym = Symbol('pino.lsCache')
const chindingsSym = Symbol('pino.chindings')

const asJsonSym = Symbol('pino.asJson')
const writeSym = Symbol('pino.write')
const redactFmtSym = Symbol('pino.redactFmt')

const timeSym = Symbol('pino.time')
const timeSliceIndexSym = Symbol('pino.timeSliceIndex')
const streamSym = Symbol('pino.stream')
const stringifySym = Symbol('pino.stringify')
const stringifySafeSym = Symbol('pino.stringifySafe')
const stringifiersSym = Symbol('pino.stringifiers')
const endSym = Symbol('pino.end')
const formatOptsSym = Symbol('pino.formatOpts')
const messageKeySym = Symbol('pino.messageKey')
const errorKeySym = Symbol('pino.errorKey')
const nestedKeySym = Symbol('pino.nestedKey')
const nestedKeyStrSym = Symbol('pino.nestedKeyStr')
const mixinMergeStrategySym = Symbol('pino.mixinMergeStrategy')
const msgPrefixSym = Symbol('pino.msgPrefix')

const wildcardFirstSym = Symbol('pino.wildcardFirst')

// public symbols, no need to use the same pino
// version for these
const serializersSym = Symbol.for('pino.serializers')
const formattersSym = Symbol.for('pino.formatters')
const hooksSym = Symbol.for('pino.hooks')
const needsMetadataGsym = Symbol.for('pino.metadata')

module.exports = {
  setLevelSym,
  getLevelSym,
  levelValSym,
  levelCompSym,
  useLevelLabelsSym,
  mixinSym,
  lsCacheSym,
  chindingsSym,
  asJsonSym,
  writeSym,
  serializersSym,
  redactFmtSym,
  timeSym,
  timeSliceIndexSym,
  streamSym,
  stringifySym,
  stringifySafeSym,
  stringifiersSym,
  endSym,
  formatOptsSym,
  messageKeySym,
  errorKeySym,
  nestedKeySym,
  wildcardFirstSym,
  needsMetadataGsym,
  useOnlyCustomLevelsSym,
  formattersSym,
  hooksSym,
  nestedKeyStrSym,
  mixinMergeStrategySym,
  msgPrefixSym
}


/***/ }),

/***/ 44416:
/***/ ((module) => {



const nullTime = () => ''

const epochTime = () => `,"time":${Date.now()}`

const unixTime = () => `,"time":${Math.round(Date.now() / 1000.0)}`

const isoTime = () => `,"time":"${new Date(Date.now()).toISOString()}"` // using Date.now() for testability

const NS_PER_MS = 1_000_000n
const NS_PER_SEC = 1_000_000_000n

const startWallTimeNs = BigInt(Date.now()) * NS_PER_MS
const startHrTime = process.hrtime.bigint()

const isoTimeNano = () => {
  const elapsedNs = process.hrtime.bigint() - startHrTime
  const currentTimeNs = startWallTimeNs + elapsedNs

  const secondsSinceEpoch = currentTimeNs / NS_PER_SEC
  const nanosWithinSecond = currentTimeNs % NS_PER_SEC

  const msSinceEpoch = Number(secondsSinceEpoch * 1000n + nanosWithinSecond / 1_000_000n)
  const date = new Date(msSinceEpoch)

  const year = date.getUTCFullYear()
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0')
  const day = date.getUTCDate().toString().padStart(2, '0')
  const hours = date.getUTCHours().toString().padStart(2, '0')
  const minutes = date.getUTCMinutes().toString().padStart(2, '0')
  const seconds = date.getUTCSeconds().toString().padStart(2, '0')

  return `,"time":"${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${nanosWithinSecond
    .toString()
    .padStart(9, '0')}Z"`
}

module.exports = { nullTime, epochTime, unixTime, isoTime, isoTimeNano }


/***/ }),

/***/ 12694:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



/* eslint no-prototype-builtins: 0 */

const diagChan = __webpack_require__(53053)
const format = __webpack_require__(6868)
const { mapHttpRequest, mapHttpResponse } = __webpack_require__(51245)
const SonicBoom = __webpack_require__(71037)
const onExit = __webpack_require__(49761)
const {
  lsCacheSym,
  chindingsSym,
  writeSym,
  serializersSym,
  formatOptsSym,
  endSym,
  stringifiersSym,
  stringifySym,
  stringifySafeSym,
  wildcardFirstSym,
  nestedKeySym,
  formattersSym,
  messageKeySym,
  errorKeySym,
  nestedKeyStrSym,
  msgPrefixSym
} = __webpack_require__(12520)
const { isMainThread } = __webpack_require__(28167)
const transport = __webpack_require__(74124)

let asJsonChan
// Node >= 18.19 supports diagnostics_channel.tracingChannel
if (typeof diagChan.tracingChannel === 'function') {
  asJsonChan = diagChan.tracingChannel('pino_asJson')
} else {
  // Older Node 18.x (e.g. 18.18), provided a no-op fallback
  asJsonChan = {
    hasSubscribers: false,
    traceSync (fn, store, thisArg, ...args) {
      return fn.call(thisArg, ...args)
    }
  }
}

function noop () {
}

function genLog (level, hook) {
  if (!hook) return LOG

  return function hookWrappedLog (...args) {
    hook.call(this, args, LOG, level)
  }

  function LOG (o, ...n) {
    if (typeof o === 'object') {
      let msg = o
      if (o !== null) {
        if (o.method && o.headers && o.socket) {
          o = mapHttpRequest(o)
        } else if (typeof o.setHeader === 'function') {
          o = mapHttpResponse(o)
        }
      }
      let formatParams
      if (msg === null && n.length === 0) {
        formatParams = [null]
      } else {
        msg = n.shift()
        formatParams = n
      }
      // We do not use a coercive check for `msg` as it is
      // measurably slower than the explicit checks.
      if (typeof this[msgPrefixSym] === 'string' && msg !== undefined && msg !== null) {
        msg = this[msgPrefixSym] + msg
      }
      this[writeSym](o, format(msg, formatParams, this[formatOptsSym]), level)
    } else {
      let msg = o === undefined ? n.shift() : o

      // We do not use a coercive check for `msg` as it is
      // measurably slower than the explicit checks.
      if (typeof this[msgPrefixSym] === 'string' && msg !== undefined && msg !== null) {
        msg = this[msgPrefixSym] + msg
      }
      this[writeSym](null, format(msg, n, this[formatOptsSym]), level)
    }
  }
}

// magically escape strings for json
// relying on their charCodeAt
// everything below 32 needs JSON.stringify()
// 34 and 92 happens all the time, so we
// have a fast case for them
function asString (str) {
  let result = ''
  let last = 0
  let found = false
  let point = 255
  const l = str.length
  if (l > 100) {
    return JSON.stringify(str)
  }
  for (var i = 0; i < l && point >= 32; i++) {
    point = str.charCodeAt(i)
    if (point === 34 || point === 92) {
      result += str.slice(last, i) + '\\'
      last = i
      found = true
    }
  }
  if (!found) {
    result = str
  } else {
    result += str.slice(last)
  }
  return point < 32 ? JSON.stringify(str) : '"' + result + '"'
}

/**
 * `asJson` wraps `_asJson` in order to facilitate generating diagnostics.
 *
 * @param {object} obj The merging object passed to the log method.
 * @param {string} msg The log message passed to the log method.
 * @param {number} num The log level number.
 * @param {number} time The log time in milliseconds.
 *
 * @returns {string}
 */
function asJson (obj, msg, num, time) {
  if (asJsonChan.hasSubscribers === false) {
    return _asJson.call(this, obj, msg, num, time)
  }

  const store = { instance: this, arguments }
  return asJsonChan.traceSync(_asJson, store, this, obj, msg, num, time)
}

/**
 * `_asJson` parses all collected data and generates the finalized newline
 * delimited JSON string.
 *
 * @param {object} obj The merging object passed to the log method.
 * @param {string} msg The log message passed to the log method.
 * @param {number} num The log level number.
 * @param {number} time The log time in milliseconds.
 *
 * @returns {string} The finalized log string terminated with a newline.
 * @private
 */
function _asJson (obj, msg, num, time) {
  const stringify = this[stringifySym]
  const stringifySafe = this[stringifySafeSym]
  const stringifiers = this[stringifiersSym]
  const end = this[endSym]
  const chindings = this[chindingsSym]
  const serializers = this[serializersSym]
  const formatters = this[formattersSym]
  const messageKey = this[messageKeySym]
  const errorKey = this[errorKeySym]
  let data = this[lsCacheSym][num] + time

  // we need the child bindings added to the output first so instance logged
  // objects can take precedence when JSON.parse-ing the resulting log line
  data = data + chindings

  let value
  if (formatters.log) {
    obj = formatters.log(obj)
  }
  const wildcardStringifier = stringifiers[wildcardFirstSym]
  let propStr = ''
  for (const key in obj) {
    value = obj[key]
    if (Object.prototype.hasOwnProperty.call(obj, key) && value !== undefined) {
      if (serializers[key]) {
        value = serializers[key](value)
      } else if (key === errorKey && serializers.err) {
        value = serializers.err(value)
      }

      const stringifier = stringifiers[key] || wildcardStringifier

      switch (typeof value) {
        case 'undefined':
        case 'function':
          continue
        case 'number':
          /* eslint no-fallthrough: "off" */
          if (Number.isFinite(value) === false) {
            value = null
          }
        // this case explicitly falls through to the next one
        case 'boolean':
          if (stringifier) value = stringifier(value)
          break
        case 'string':
          value = (stringifier || asString)(value)
          break
        default:
          value = (stringifier || stringify)(value, stringifySafe)
      }
      if (value === undefined) continue
      const strKey = asString(key)
      propStr += ',' + strKey + ':' + value
    }
  }

  let msgStr = ''
  if (msg !== undefined) {
    value = serializers[messageKey] ? serializers[messageKey](msg) : msg
    const stringifier = stringifiers[messageKey] || wildcardStringifier

    switch (typeof value) {
      case 'function':
        break
      case 'number':
        /* eslint no-fallthrough: "off" */
        if (Number.isFinite(value) === false) {
          value = null
        }
      // this case explicitly falls through to the next one
      case 'boolean':
        if (stringifier) value = stringifier(value)
        msgStr = ',"' + messageKey + '":' + value
        break
      case 'string':
        value = (stringifier || asString)(value)
        msgStr = ',"' + messageKey + '":' + value
        break
      default:
        value = (stringifier || stringify)(value, stringifySafe)
        msgStr = ',"' + messageKey + '":' + value
    }
  }

  if (this[nestedKeySym] && propStr) {
    // place all the obj properties under the specified key
    // the nested key is already formatted from the constructor
    return data + this[nestedKeyStrSym] + propStr.slice(1) + '}' + msgStr + end
  } else {
    return data + propStr + msgStr + end
  }
}

function asChindings (instance, bindings) {
  let value
  let data = instance[chindingsSym]
  const stringify = instance[stringifySym]
  const stringifySafe = instance[stringifySafeSym]
  const stringifiers = instance[stringifiersSym]
  const wildcardStringifier = stringifiers[wildcardFirstSym]
  const serializers = instance[serializersSym]
  const formatter = instance[formattersSym].bindings
  bindings = formatter(bindings)

  for (const key in bindings) {
    value = bindings[key]
    const valid = (key.length < 5 || (key !== 'level' &&
      key !== 'serializers' &&
      key !== 'formatters' &&
      key !== 'customLevels')) &&
      bindings.hasOwnProperty(key) &&
      value !== undefined
    if (valid === true) {
      value = serializers[key] ? serializers[key](value) : value
      value = (stringifiers[key] || wildcardStringifier || stringify)(value, stringifySafe)
      if (value === undefined) continue
      data += ',"' + key + '":' + value
    }
  }
  return data
}

function hasBeenTampered (stream) {
  return stream.write !== stream.constructor.prototype.write
}

function buildSafeSonicBoom (opts) {
  const stream = new SonicBoom(opts)
  stream.on('error', filterBrokenPipe)
  // If we are sync: false, we must flush on exit
  if (!opts.sync && isMainThread) {
    onExit.register(stream, autoEnd)

    stream.on('close', function () {
      onExit.unregister(stream)
    })
  }
  return stream

  function filterBrokenPipe (err) {
    // Impossible to replicate across all operating systems
    /* istanbul ignore next */
    if (err.code === 'EPIPE') {
      // If we get EPIPE, we should stop logging here
      // however we have no control to the consumer of
      // SonicBoom, so we just overwrite the write method
      stream.write = noop
      stream.end = noop
      stream.flushSync = noop
      stream.destroy = noop
      return
    }
    stream.removeListener('error', filterBrokenPipe)
    stream.emit('error', err)
  }
}

function autoEnd (stream, eventName) {
  // This check is needed only on some platforms
  /* istanbul ignore next */
  if (stream.destroyed) {
    return
  }

  if (eventName === 'beforeExit') {
    // We still have an event loop, let's use it
    stream.flush()
    stream.on('drain', function () {
      stream.end()
    })
  } else {
    // For some reason istanbul is not detecting this, but it's there
    /* istanbul ignore next */
    // We do not have an event loop, so flush synchronously
    stream.flushSync()
  }
}

function createArgsNormalizer (defaultOptions) {
  return function normalizeArgs (instance, caller, opts = {}, stream) {
    // support stream as a string
    if (typeof opts === 'string') {
      stream = buildSafeSonicBoom({ dest: opts })
      opts = {}
    } else if (typeof stream === 'string') {
      if (opts && opts.transport) {
        throw Error('only one of option.transport or stream can be specified')
      }
      stream = buildSafeSonicBoom({ dest: stream })
    } else if (opts instanceof SonicBoom || opts.writable || opts._writableState) {
      stream = opts
      opts = {}
    } else if (opts.transport) {
      if (opts.transport instanceof SonicBoom || opts.transport.writable || opts.transport._writableState) {
        throw Error('option.transport do not allow stream, please pass to option directly. e.g. pino(transport)')
      }
      if (opts.transport.targets && opts.transport.targets.length && opts.formatters && typeof opts.formatters.level === 'function') {
        throw Error('option.transport.targets do not allow custom level formatters')
      }

      let customLevels
      if (opts.customLevels) {
        customLevels = opts.useOnlyCustomLevels ? opts.customLevels : Object.assign({}, opts.levels, opts.customLevels)
      }
      stream = transport({ caller, ...opts.transport, levels: customLevels })
    }
    opts = Object.assign({}, defaultOptions, opts)
    opts.serializers = Object.assign({}, defaultOptions.serializers, opts.serializers)
    opts.formatters = Object.assign({}, defaultOptions.formatters, opts.formatters)

    if (opts.prettyPrint) {
      throw new Error('prettyPrint option is no longer supported, see the pino-pretty package (https://github.com/pinojs/pino-pretty)')
    }

    const { enabled, onChild } = opts
    if (enabled === false) opts.level = 'silent'
    if (!onChild) opts.onChild = noop
    if (!stream) {
      if (!hasBeenTampered(process.stdout)) {
        // If process.stdout.fd is undefined, it means that we are running
        // in a worker thread. Let's assume we are logging to file descriptor 1.
        stream = buildSafeSonicBoom({ fd: process.stdout.fd || 1 })
      } else {
        stream = process.stdout
      }
    }
    return { opts, stream }
  }
}

function stringify (obj, stringifySafeFn) {
  try {
    return JSON.stringify(obj)
  } catch (_) {
    try {
      const stringify = stringifySafeFn || this[stringifySafeSym]
      return stringify(obj)
    } catch (_) {
      return '"[unable to serialize, circular reference is too complex to analyze]"'
    }
  }
}

function buildFormatters (level, bindings, log) {
  return {
    level,
    bindings,
    log
  }
}

/**
 * Convert a string integer file descriptor to a proper native integer
 * file descriptor.
 *
 * @param {string} destination The file descriptor string to attempt to convert.
 *
 * @returns {Number}
 */
function normalizeDestFileDescriptor (destination) {
  const fd = Number(destination)
  if (typeof destination === 'string' && Number.isFinite(fd)) {
    return fd
  }
  // destination could be undefined if we are in a worker
  if (destination === undefined) {
    // This is stdout in UNIX systems
    return 1
  }
  return destination
}

module.exports = {
  noop,
  buildSafeSonicBoom,
  asChindings,
  asJson,
  genLog,
  createArgsNormalizer,
  stringify,
  buildFormatters,
  normalizeDestFileDescriptor
}


/***/ }),

/***/ 74124:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



const { createRequire } = __webpack_require__(73339)
const getCallers = __webpack_require__(80450)
const { join, isAbsolute, sep } = __webpack_require__(76760)
const sleep = __webpack_require__(40479)
const onExit = __webpack_require__(49761)
const ThreadStream = __webpack_require__(21367)

function setupOnExit (stream) {
  // This is leak free, it does not leave event handlers
  onExit.register(stream, autoEnd)
  onExit.registerBeforeExit(stream, flush)

  stream.on('close', function () {
    onExit.unregister(stream)
  })
}

function buildStream (filename, workerData, workerOpts, sync) {
  const stream = new ThreadStream({
    filename,
    workerData,
    workerOpts,
    sync
  })

  stream.on('ready', onReady)
  stream.on('close', function () {
    process.removeListener('exit', onExit)
  })

  process.on('exit', onExit)

  function onReady () {
    process.removeListener('exit', onExit)
    stream.unref()

    if (workerOpts.autoEnd !== false) {
      setupOnExit(stream)
    }
  }

  function onExit () {
    /* istanbul ignore next */
    if (stream.closed) {
      return
    }
    stream.flushSync()
    // Apparently there is a very sporadic race condition
    // that in certain OS would prevent the messages to be flushed
    // because the thread might not have been created still.
    // Unfortunately we need to sleep(100) in this case.
    sleep(100)
    stream.end()
  }

  return stream
}

function autoEnd (stream) {
  stream.ref()
  stream.flushSync()
  stream.end()
  stream.once('close', function () {
    stream.unref()
  })
}

function flush (stream) {
  stream.flushSync()
}

function transport (fullOptions) {
  const { pipeline, targets, levels, dedupe, worker = {}, caller = getCallers(), sync = false } = fullOptions

  const options = {
    ...fullOptions.options
  }

  // Backwards compatibility
  const callers = typeof caller === 'string' ? [caller] : caller

  // This will be eventually modified by bundlers
  const bundlerOverrides = '__bundlerPathsOverrides' in globalThis ? globalThis.__bundlerPathsOverrides : {}

  let target = fullOptions.target

  if (target && targets) {
    throw new Error('only one of target or targets can be specified')
  }

  if (targets) {
    target = bundlerOverrides['pino-worker'] || join(__dirname, 'worker.js')
    options.targets = targets.filter(dest => dest.target).map((dest) => {
      return {
        ...dest,
        target: fixTarget(dest.target)
      }
    })
    options.pipelines = targets.filter(dest => dest.pipeline).map((dest) => {
      return dest.pipeline.map((t) => {
        return {
          ...t,
          level: dest.level, // duplicate the pipeline `level` property defined in the upper level
          target: fixTarget(t.target)
        }
      })
    })
  } else if (pipeline) {
    target = bundlerOverrides['pino-worker'] || join(__dirname, 'worker.js')
    options.pipelines = [pipeline.map((dest) => {
      return {
        ...dest,
        target: fixTarget(dest.target)
      }
    })]
  }

  if (levels) {
    options.levels = levels
  }

  if (dedupe) {
    options.dedupe = dedupe
  }

  options.pinoWillSendConfig = true

  return buildStream(fixTarget(target), options, worker, sync)

  function fixTarget (origin) {
    origin = bundlerOverrides[origin] || origin

    if (isAbsolute(origin) || origin.indexOf('file://') === 0) {
      return origin
    }

    if (origin === 'pino/file') {
      return join(__dirname, '..', 'file.js')
    }

    let fixTarget

    for (const filePath of callers) {
      try {
        const context = filePath === 'node:repl'
          ? process.cwd() + sep
          : filePath

        fixTarget = createRequire(context).resolve(origin)
        break
      } catch (err) {
        // Silent catch
        continue
      }
    }

    if (!fixTarget) {
      throw new Error(`unable to determine transport target for "${origin}"`)
    }

    return fixTarget
  }
}

module.exports = transport


/***/ }),

/***/ 65005:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



const os = __webpack_require__(48161)
const stdSerializers = __webpack_require__(51245)
const caller = __webpack_require__(80450)
const redaction = __webpack_require__(59096)
const time = __webpack_require__(44416)
const proto = __webpack_require__(41239)
const symbols = __webpack_require__(12520)
const { configure } = __webpack_require__(37467)
const { assertDefaultLevelFound, mappings, genLsCache, genLevelComparison, assertLevelComparison } = __webpack_require__(63114)
const { DEFAULT_LEVELS, SORTING_ORDER } = __webpack_require__(63256)
const {
  createArgsNormalizer,
  asChindings,
  buildSafeSonicBoom,
  buildFormatters,
  stringify,
  normalizeDestFileDescriptor,
  noop
} = __webpack_require__(12694)
const { version } = __webpack_require__(14052)
const {
  chindingsSym,
  redactFmtSym,
  serializersSym,
  timeSym,
  timeSliceIndexSym,
  streamSym,
  stringifySym,
  stringifySafeSym,
  stringifiersSym,
  setLevelSym,
  endSym,
  formatOptsSym,
  messageKeySym,
  errorKeySym,
  nestedKeySym,
  mixinSym,
  levelCompSym,
  useOnlyCustomLevelsSym,
  formattersSym,
  hooksSym,
  nestedKeyStrSym,
  mixinMergeStrategySym,
  msgPrefixSym
} = symbols
const { epochTime, nullTime } = time
const { pid } = process
const hostname = os.hostname()
const defaultErrorSerializer = stdSerializers.err
const defaultOptions = {
  level: 'info',
  levelComparison: SORTING_ORDER.ASC,
  levels: DEFAULT_LEVELS,
  messageKey: 'msg',
  errorKey: 'err',
  nestedKey: null,
  enabled: true,
  base: { pid, hostname },
  serializers: Object.assign(Object.create(null), {
    err: defaultErrorSerializer
  }),
  formatters: Object.assign(Object.create(null), {
    bindings (bindings) {
      return bindings
    },
    level (label, number) {
      return { level: number }
    }
  }),
  hooks: {
    logMethod: undefined,
    streamWrite: undefined
  },
  timestamp: epochTime,
  name: undefined,
  redact: null,
  customLevels: null,
  useOnlyCustomLevels: false,
  depthLimit: 5,
  edgeLimit: 100
}

const normalize = createArgsNormalizer(defaultOptions)

const serializers = Object.assign(Object.create(null), stdSerializers)

function pino (...args) {
  const instance = {}
  const { opts, stream } = normalize(instance, caller(), ...args)

  if (opts.level && typeof opts.level === 'string' && DEFAULT_LEVELS[opts.level.toLowerCase()] !== undefined) opts.level = opts.level.toLowerCase()

  const {
    redact,
    crlf,
    serializers,
    timestamp,
    messageKey,
    errorKey,
    nestedKey,
    base,
    name,
    level,
    customLevels,
    levelComparison,
    mixin,
    mixinMergeStrategy,
    useOnlyCustomLevels,
    formatters,
    hooks,
    depthLimit,
    edgeLimit,
    onChild,
    msgPrefix
  } = opts

  const stringifySafe = configure({
    maximumDepth: depthLimit,
    maximumBreadth: edgeLimit
  })

  const allFormatters = buildFormatters(
    formatters.level,
    formatters.bindings,
    formatters.log
  )

  const stringifyFn = stringify.bind({
    [stringifySafeSym]: stringifySafe
  })
  const stringifiers = redact ? redaction(redact, stringifyFn) : {}
  const formatOpts = redact
    ? { stringify: stringifiers[redactFmtSym] }
    : { stringify: stringifyFn }
  const end = '}' + (crlf ? '\r\n' : '\n')
  const coreChindings = asChindings.bind(null, {
    [chindingsSym]: '',
    [serializersSym]: serializers,
    [stringifiersSym]: stringifiers,
    [stringifySym]: stringify,
    [stringifySafeSym]: stringifySafe,
    [formattersSym]: allFormatters
  })

  let chindings = ''
  if (base !== null) {
    if (name === undefined) {
      chindings = coreChindings(base)
    } else {
      chindings = coreChindings(Object.assign({}, base, { name }))
    }
  }

  const time = (timestamp instanceof Function)
    ? timestamp
    : (timestamp ? epochTime : nullTime)
  const timeSliceIndex = time().indexOf(':') + 1

  if (useOnlyCustomLevels && !customLevels) throw Error('customLevels is required if useOnlyCustomLevels is set true')
  if (mixin && typeof mixin !== 'function') throw Error(`Unknown mixin type "${typeof mixin}" - expected "function"`)
  if (msgPrefix && typeof msgPrefix !== 'string') throw Error(`Unknown msgPrefix type "${typeof msgPrefix}" - expected "string"`)

  assertDefaultLevelFound(level, customLevels, useOnlyCustomLevels)
  const levels = mappings(customLevels, useOnlyCustomLevels)

  if (typeof stream.emit === 'function') {
    stream.emit('message', { code: 'PINO_CONFIG', config: { levels, messageKey, errorKey } })
  }

  assertLevelComparison(levelComparison)
  const levelCompFunc = genLevelComparison(levelComparison)

  Object.assign(instance, {
    levels,
    [levelCompSym]: levelCompFunc,
    [useOnlyCustomLevelsSym]: useOnlyCustomLevels,
    [streamSym]: stream,
    [timeSym]: time,
    [timeSliceIndexSym]: timeSliceIndex,
    [stringifySym]: stringify,
    [stringifySafeSym]: stringifySafe,
    [stringifiersSym]: stringifiers,
    [endSym]: end,
    [formatOptsSym]: formatOpts,
    [messageKeySym]: messageKey,
    [errorKeySym]: errorKey,
    [nestedKeySym]: nestedKey,
    // protect against injection
    [nestedKeyStrSym]: nestedKey ? `,${JSON.stringify(nestedKey)}:{` : '',
    [serializersSym]: serializers,
    [mixinSym]: mixin,
    [mixinMergeStrategySym]: mixinMergeStrategy,
    [chindingsSym]: chindings,
    [formattersSym]: allFormatters,
    [hooksSym]: hooks,
    silent: noop,
    onChild,
    [msgPrefixSym]: msgPrefix
  })

  Object.setPrototypeOf(instance, proto())

  genLsCache(instance)

  instance[setLevelSym](level)

  return instance
}

module.exports = pino

module.exports.destination = (dest = process.stdout.fd) => {
  if (typeof dest === 'object') {
    dest.dest = normalizeDestFileDescriptor(dest.dest || process.stdout.fd)
    return buildSafeSonicBoom(dest)
  } else {
    return buildSafeSonicBoom({ dest: normalizeDestFileDescriptor(dest), minLength: 0 })
  }
}

module.exports.transport = __webpack_require__(74124)
module.exports.multistream = __webpack_require__(50112)

module.exports.levels = mappings()
module.exports.stdSerializers = serializers
module.exports.stdTimeFunctions = Object.assign({}, time)
module.exports.symbols = symbols
module.exports.version = version

// Enables default and name export with TypeScript and Babel
module.exports["default"] = pino
module.exports.pino = pino


/***/ }),

/***/ 71037:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



const fs = __webpack_require__(79896)
const EventEmitter = __webpack_require__(24434)
const inherits = (__webpack_require__(39023).inherits)
const path = __webpack_require__(16928)
const sleep = __webpack_require__(40479)
const assert = __webpack_require__(42613)

const BUSY_WRITE_TIMEOUT = 100
const kEmptyBuffer = Buffer.allocUnsafe(0)

// 16 KB. Don't write more than docker buffer size.
// https://github.com/moby/moby/blob/513ec73831269947d38a644c278ce3cac36783b2/daemon/logger/copier.go#L13
const MAX_WRITE = 16 * 1024

const kContentModeBuffer = 'buffer'
const kContentModeUtf8 = 'utf8'

const [major, minor] = (process.versions.node || '0.0').split('.').map(Number)
const kCopyBuffer = major >= 22 && minor >= 7

function openFile (file, sonic) {
  sonic._opening = true
  sonic._writing = true
  sonic._asyncDrainScheduled = false

  // NOTE: 'error' and 'ready' events emitted below only relevant when sonic.sync===false
  // for sync mode, there is no way to add a listener that will receive these

  function fileOpened (err, fd) {
    if (err) {
      sonic._reopening = false
      sonic._writing = false
      sonic._opening = false

      if (sonic.sync) {
        process.nextTick(() => {
          if (sonic.listenerCount('error') > 0) {
            sonic.emit('error', err)
          }
        })
      } else {
        sonic.emit('error', err)
      }
      return
    }

    const reopening = sonic._reopening

    sonic.fd = fd
    sonic.file = file
    sonic._reopening = false
    sonic._opening = false
    sonic._writing = false

    if (sonic.sync) {
      process.nextTick(() => sonic.emit('ready'))
    } else {
      sonic.emit('ready')
    }

    if (sonic.destroyed) {
      return
    }

    // start
    if ((!sonic._writing && sonic._len > sonic.minLength) || sonic._flushPending) {
      sonic._actualWrite()
    } else if (reopening) {
      process.nextTick(() => sonic.emit('drain'))
    }
  }

  const flags = sonic.append ? 'a' : 'w'
  const mode = sonic.mode

  if (sonic.sync) {
    try {
      if (sonic.mkdir) fs.mkdirSync(path.dirname(file), { recursive: true })
      const fd = fs.openSync(file, flags, mode)
      fileOpened(null, fd)
    } catch (err) {
      fileOpened(err)
      throw err
    }
  } else if (sonic.mkdir) {
    fs.mkdir(path.dirname(file), { recursive: true }, (err) => {
      if (err) return fileOpened(err)
      fs.open(file, flags, mode, fileOpened)
    })
  } else {
    fs.open(file, flags, mode, fileOpened)
  }
}

function SonicBoom (opts) {
  if (!(this instanceof SonicBoom)) {
    return new SonicBoom(opts)
  }

  let { fd, dest, minLength, maxLength, maxWrite, periodicFlush, sync, append = true, mkdir, retryEAGAIN, fsync, contentMode, mode } = opts || {}

  fd = fd || dest

  this._len = 0
  this.fd = -1
  this._bufs = []
  this._lens = []
  this._writing = false
  this._ending = false
  this._reopening = false
  this._asyncDrainScheduled = false
  this._flushPending = false
  this._hwm = Math.max(minLength || 0, 16387)
  this.file = null
  this.destroyed = false
  this.minLength = minLength || 0
  this.maxLength = maxLength || 0
  this.maxWrite = maxWrite || MAX_WRITE
  this._periodicFlush = periodicFlush || 0
  this._periodicFlushTimer = undefined
  this.sync = sync || false
  this.writable = true
  this._fsync = fsync || false
  this.append = append || false
  this.mode = mode
  this.retryEAGAIN = retryEAGAIN || (() => true)
  this.mkdir = mkdir || false

  let fsWriteSync
  let fsWrite
  if (contentMode === kContentModeBuffer) {
    this._writingBuf = kEmptyBuffer
    this.write = writeBuffer
    this.flush = flushBuffer
    this.flushSync = flushBufferSync
    this._actualWrite = actualWriteBuffer
    fsWriteSync = () => fs.writeSync(this.fd, this._writingBuf)
    fsWrite = () => fs.write(this.fd, this._writingBuf, this.release)
  } else if (contentMode === undefined || contentMode === kContentModeUtf8) {
    this._writingBuf = ''
    this.write = write
    this.flush = flush
    this.flushSync = flushSync
    this._actualWrite = actualWrite
    fsWriteSync = () => {
      if (Buffer.isBuffer(this._writingBuf)) {
        return fs.writeSync(this.fd, this._writingBuf)
      }
      return fs.writeSync(this.fd, this._writingBuf, 'utf8')
    }
    fsWrite = () => {
      if (Buffer.isBuffer(this._writingBuf)) {
        return fs.write(this.fd, this._writingBuf, this.release)
      }
      return fs.write(this.fd, this._writingBuf, 'utf8', this.release)
    }
  } else {
    throw new Error(`SonicBoom supports "${kContentModeUtf8}" and "${kContentModeBuffer}", but passed ${contentMode}`)
  }

  if (typeof fd === 'number') {
    this.fd = fd
    process.nextTick(() => this.emit('ready'))
  } else if (typeof fd === 'string') {
    openFile(fd, this)
  } else {
    throw new Error('SonicBoom supports only file descriptors and files')
  }
  if (this.minLength >= this.maxWrite) {
    throw new Error(`minLength should be smaller than maxWrite (${this.maxWrite})`)
  }

  this.release = (err, n) => {
    if (err) {
      if ((err.code === 'EAGAIN' || err.code === 'EBUSY') && this.retryEAGAIN(err, this._writingBuf.length, this._len - this._writingBuf.length)) {
        if (this.sync) {
          // This error code should not happen in sync mode, because it is
          // not using the underlining operating system asynchronous functions.
          // However it happens, and so we handle it.
          // Ref: https://github.com/pinojs/pino/issues/783
          try {
            sleep(BUSY_WRITE_TIMEOUT)
            this.release(undefined, 0)
          } catch (err) {
            this.release(err)
          }
        } else {
          // Let's give the destination some time to process the chunk.
          setTimeout(fsWrite, BUSY_WRITE_TIMEOUT)
        }
      } else {
        this._writing = false

        this.emit('error', err)
      }
      return
    }

    this.emit('write', n)
    const releasedBufObj = releaseWritingBuf(this._writingBuf, this._len, n)
    this._len = releasedBufObj.len
    this._writingBuf = releasedBufObj.writingBuf

    if (this._writingBuf.length) {
      if (!this.sync) {
        fsWrite()
        return
      }

      try {
        do {
          const n = fsWriteSync()
          const releasedBufObj = releaseWritingBuf(this._writingBuf, this._len, n)
          this._len = releasedBufObj.len
          this._writingBuf = releasedBufObj.writingBuf
        } while (this._writingBuf.length)
      } catch (err) {
        this.release(err)
        return
      }
    }

    if (this._fsync) {
      fs.fsyncSync(this.fd)
    }

    const len = this._len
    if (this._reopening) {
      this._writing = false
      this._reopening = false
      this.reopen()
    } else if (len > this.minLength) {
      this._actualWrite()
    } else if (this._ending) {
      if (len > 0) {
        this._actualWrite()
      } else {
        this._writing = false
        actualClose(this)
      }
    } else {
      this._writing = false
      if (this.sync) {
        if (!this._asyncDrainScheduled) {
          this._asyncDrainScheduled = true
          process.nextTick(emitDrain, this)
        }
      } else {
        this.emit('drain')
      }
    }
  }

  this.on('newListener', function (name) {
    if (name === 'drain') {
      this._asyncDrainScheduled = false
    }
  })

  if (this._periodicFlush !== 0) {
    this._periodicFlushTimer = setInterval(() => this.flush(null), this._periodicFlush)
    this._periodicFlushTimer.unref()
  }
}

/**
 * Release the writingBuf after fs.write n bytes data
 * @param {string | Buffer} writingBuf - currently writing buffer, usually be instance._writingBuf.
 * @param {number} len - currently buffer length, usually be instance._len.
 * @param {number} n - number of bytes fs already written
 * @returns {{writingBuf: string | Buffer, len: number}} released writingBuf and length
 */
function releaseWritingBuf (writingBuf, len, n) {
  if (typeof writingBuf === 'string') {
    writingBuf = Buffer.from(writingBuf)
  }

  len = Math.max(len - n, 0)
  writingBuf = writingBuf.subarray(n)
  return { writingBuf, len }
}

function emitDrain (sonic) {
  const hasListeners = sonic.listenerCount('drain') > 0
  if (!hasListeners) return
  sonic._asyncDrainScheduled = false
  sonic.emit('drain')
}

inherits(SonicBoom, EventEmitter)

function mergeBuf (bufs, len) {
  if (bufs.length === 0) {
    return kEmptyBuffer
  }

  if (bufs.length === 1) {
    return bufs[0]
  }

  return Buffer.concat(bufs, len)
}

function write (data) {
  if (this.destroyed) {
    throw new Error('SonicBoom destroyed')
  }

  data = '' + data
  const dataLen = Buffer.byteLength(data)
  const len = this._len + dataLen
  const bufs = this._bufs

  if (this.maxLength && len > this.maxLength) {
    this.emit('drop', data)
    return this._len < this._hwm
  }

  if (
    bufs.length === 0 ||
    Buffer.byteLength(bufs[bufs.length - 1]) + dataLen > this.maxWrite
  ) {
    bufs.push(data)
  } else {
    bufs[bufs.length - 1] += data
  }

  this._len = len

  if (!this._writing && this._len >= this.minLength) {
    this._actualWrite()
  }

  return this._len < this._hwm
}

function writeBuffer (data) {
  if (this.destroyed) {
    throw new Error('SonicBoom destroyed')
  }

  const len = this._len + data.length
  const bufs = this._bufs
  const lens = this._lens

  if (this.maxLength && len > this.maxLength) {
    this.emit('drop', data)
    return this._len < this._hwm
  }

  if (
    bufs.length === 0 ||
    lens[lens.length - 1] + data.length > this.maxWrite
  ) {
    bufs.push([data])
    lens.push(data.length)
  } else {
    bufs[bufs.length - 1].push(data)
    lens[lens.length - 1] += data.length
  }

  this._len = len

  if (!this._writing && this._len >= this.minLength) {
    this._actualWrite()
  }

  return this._len < this._hwm
}

function callFlushCallbackOnDrain (cb) {
  this._flushPending = true
  const onDrain = () => {
    // only if _fsync is false to avoid double fsync
    if (!this._fsync) {
      try {
        fs.fsync(this.fd, (err) => {
          this._flushPending = false
          cb(err)
        })
      } catch (err) {
        cb(err)
      }
    } else {
      this._flushPending = false
      cb()
    }
    this.off('error', onError)
  }
  const onError = (err) => {
    this._flushPending = false
    cb(err)
    this.off('drain', onDrain)
  }

  this.once('drain', onDrain)
  this.once('error', onError)
}

function flush (cb) {
  if (cb != null && typeof cb !== 'function') {
    throw new Error('flush cb must be a function')
  }

  if (this.destroyed) {
    const error = new Error('SonicBoom destroyed')
    if (cb) {
      cb(error)
      return
    }

    throw error
  }

  if (this.minLength <= 0) {
    cb?.()
    return
  }

  if (cb) {
    callFlushCallbackOnDrain.call(this, cb)
  }

  if (this._writing) {
    return
  }

  if (this._bufs.length === 0) {
    this._bufs.push('')
  }

  this._actualWrite()
}

function flushBuffer (cb) {
  if (cb != null && typeof cb !== 'function') {
    throw new Error('flush cb must be a function')
  }

  if (this.destroyed) {
    const error = new Error('SonicBoom destroyed')
    if (cb) {
      cb(error)
      return
    }

    throw error
  }

  if (this.minLength <= 0) {
    cb?.()
    return
  }

  if (cb) {
    callFlushCallbackOnDrain.call(this, cb)
  }

  if (this._writing) {
    return
  }

  if (this._bufs.length === 0) {
    this._bufs.push([])
    this._lens.push(0)
  }

  this._actualWrite()
}

SonicBoom.prototype.reopen = function (file) {
  if (this.destroyed) {
    throw new Error('SonicBoom destroyed')
  }

  if (this._opening) {
    this.once('ready', () => {
      this.reopen(file)
    })
    return
  }

  if (this._ending) {
    return
  }

  if (!this.file) {
    throw new Error('Unable to reopen a file descriptor, you must pass a file to SonicBoom')
  }

  if (file) {
    this.file = file
  }
  this._reopening = true

  if (this._writing) {
    return
  }

  const fd = this.fd
  this.once('ready', () => {
    if (fd !== this.fd) {
      fs.close(fd, (err) => {
        if (err) {
          return this.emit('error', err)
        }
      })
    }
  })

  openFile(this.file, this)
}

SonicBoom.prototype.end = function () {
  if (this.destroyed) {
    throw new Error('SonicBoom destroyed')
  }

  if (this._opening) {
    this.once('ready', () => {
      this.end()
    })
    return
  }

  if (this._ending) {
    return
  }

  this._ending = true

  if (this._writing) {
    return
  }

  if (this._len > 0 && this.fd >= 0) {
    this._actualWrite()
  } else {
    actualClose(this)
  }
}

function flushSync () {
  if (this.destroyed) {
    throw new Error('SonicBoom destroyed')
  }

  if (this.fd < 0) {
    throw new Error('sonic boom is not ready yet')
  }

  if (!this._writing && this._writingBuf.length > 0) {
    this._bufs.unshift(this._writingBuf)
    this._writingBuf = ''
  }

  let buf = ''
  while (this._bufs.length || buf.length) {
    if (buf.length <= 0) {
      buf = this._bufs[0]
    }
    try {
      const n = Buffer.isBuffer(buf)
        ? fs.writeSync(this.fd, buf)
        : fs.writeSync(this.fd, buf, 'utf8')
      const releasedBufObj = releaseWritingBuf(buf, this._len, n)
      buf = releasedBufObj.writingBuf
      this._len = releasedBufObj.len
      if (buf.length <= 0) {
        this._bufs.shift()
      }
    } catch (err) {
      const shouldRetry = err.code === 'EAGAIN' || err.code === 'EBUSY'
      if (shouldRetry && !this.retryEAGAIN(err, buf.length, this._len - buf.length)) {
        throw err
      }

      sleep(BUSY_WRITE_TIMEOUT)
    }
  }

  try {
    fs.fsyncSync(this.fd)
  } catch {
    // Skip the error. The fd might not support fsync.
  }
}

function flushBufferSync () {
  if (this.destroyed) {
    throw new Error('SonicBoom destroyed')
  }

  if (this.fd < 0) {
    throw new Error('sonic boom is not ready yet')
  }

  if (!this._writing && this._writingBuf.length > 0) {
    this._bufs.unshift([this._writingBuf])
    this._writingBuf = kEmptyBuffer
  }

  let buf = kEmptyBuffer
  while (this._bufs.length || buf.length) {
    if (buf.length <= 0) {
      buf = mergeBuf(this._bufs[0], this._lens[0])
    }
    try {
      const n = fs.writeSync(this.fd, buf)
      buf = buf.subarray(n)
      this._len = Math.max(this._len - n, 0)
      if (buf.length <= 0) {
        this._bufs.shift()
        this._lens.shift()
      }
    } catch (err) {
      const shouldRetry = err.code === 'EAGAIN' || err.code === 'EBUSY'
      if (shouldRetry && !this.retryEAGAIN(err, buf.length, this._len - buf.length)) {
        throw err
      }

      sleep(BUSY_WRITE_TIMEOUT)
    }
  }
}

SonicBoom.prototype.destroy = function () {
  if (this.destroyed) {
    return
  }
  actualClose(this)
}

function actualWrite () {
  const release = this.release
  this._writing = true
  this._writingBuf = this._writingBuf.length ? this._writingBuf : this._bufs.shift() || ''

  if (this.sync) {
    try {
      const written = Buffer.isBuffer(this._writingBuf)
        ? fs.writeSync(this.fd, this._writingBuf)
        : fs.writeSync(this.fd, this._writingBuf, 'utf8')
      release(null, written)
    } catch (err) {
      release(err)
    }
  } else {
    fs.write(this.fd, this._writingBuf, release)
  }
}

function actualWriteBuffer () {
  const release = this.release
  this._writing = true
  this._writingBuf = this._writingBuf.length ? this._writingBuf : mergeBuf(this._bufs.shift(), this._lens.shift())

  if (this.sync) {
    try {
      const written = fs.writeSync(this.fd, this._writingBuf)
      release(null, written)
    } catch (err) {
      release(err)
    }
  } else {
    // fs.write will need to copy string to buffer anyway so
    // we do it here to avoid the overhead of calculating the buffer size
    // in releaseWritingBuf.
    if (kCopyBuffer) {
      this._writingBuf = Buffer.from(this._writingBuf)
    }
    fs.write(this.fd, this._writingBuf, release)
  }
}

function actualClose (sonic) {
  if (sonic.fd === -1) {
    sonic.once('ready', actualClose.bind(null, sonic))
    return
  }

  if (sonic._periodicFlushTimer !== undefined) {
    clearInterval(sonic._periodicFlushTimer)
  }

  sonic.destroyed = true
  sonic._bufs = []
  sonic._lens = []

  assert(typeof sonic.fd === 'number', `sonic.fd must be a number, got ${typeof sonic.fd}`)
  try {
    fs.fsync(sonic.fd, closeWrapped)
  } catch {
  }

  function closeWrapped () {
    // We skip errors in fsync

    if (sonic.fd !== 1 && sonic.fd !== 2) {
      fs.close(sonic.fd, done)
    } else {
      done()
    }
  }

  function done (err) {
    if (err) {
      sonic.emit('error', err)
      return
    }

    if (sonic._ending && !sonic._writing) {
      sonic.emit('finish')
    }
    sonic.emit('close')
  }
}

/**
 * These export configurations enable JS and TS developers
 * to consumer SonicBoom in whatever way best suits their needs.
 * Some examples of supported import syntax includes:
 * - `const SonicBoom = require('SonicBoom')`
 * - `const { SonicBoom } = require('SonicBoom')`
 * - `import * as SonicBoom from 'SonicBoom'`
 * - `import { SonicBoom } from 'SonicBoom'`
 * - `import SonicBoom from 'SonicBoom'`
 */
SonicBoom.SonicBoom = SonicBoom
SonicBoom.default = SonicBoom
module.exports = SonicBoom


/***/ }),

/***/ 81673:
/***/ ((module) => {

module.exports = /*#__PURE__*/JSON.parse('{"name":"@salesforce/core","version":"9.3.0","description":"Core libraries to interact with SFDX projects, orgs, and APIs.","main":"lib/index","types":"lib/index.d.ts","license":"Apache-2.0","engines":{"node":">=22.0.0"},"exports":{".":"./lib/index.js","./config":"./lib/config/config.js","./configAggregator":"./lib/config/configAggregator.js","./envVars":"./lib/config/envVars.js","./fs":"./lib/fs/fs.js","./global":"./lib/global.js","./lifecycle":"./lib/lifecycleEvents.js","./logger":"./lib/logger/logger.js","./messages":"./lib/messages.js","./messageTransformer":"./lib/messageTransformer.js","./project":"./lib/sfProject.js","./sfError":"./lib/sfError.js","./stateAggregator":"./lib/stateAggregator/stateAggregator.js","./testSetup":"./lib/testSetup.js","./sfdx-project.schema.json":"./schemas/sfdx-project.schema.json","./project-scratch-def.schema.json":"./schemas/project-scratch-def.schema.json"},"scripts":{"build":"wireit","bundle-check":"wireit","clean":"sf-clean","clean-all":"sf-clean all","compile":"wireit","docs":"sf-docs","fix-license":"eslint src test --fix --rule \\"header/header: [2]\\"","format":"wireit","link-check":"wireit","lint":"wireit","lint-fix":"yarn sf-lint --fix","prepack":"sf-prepack","prepare":"sf-install","test":"wireit","test:nuts":"wireit","test:only":"wireit","test:perf":"ts-node test/perf/logger/main.test.ts","update:features":"ts-node scripts/schemas/update-features.ts","update:settings":"ts-node scripts/schemas/update-settings.ts"},"keywords":["force","salesforce","sfdx","salesforcedx"],"files":["docs","lib","messages","schemas","!lib/**/*.map","messageTransformer/messageTransformer.ts"],"dependencies":{"@jsforce/jsforce-node":"^3.10.24","@salesforce/kit":"^4.0.0","@salesforce/ts-types":"^3.2.0","ajv":"^8.18.0","change-case":"^4.1.2","fast-levenshtein":"^3.0.0","faye":"^1.4.1","form-data":"^4.0.5","js2xmlparser":"^4.0.1","jsonwebtoken":"9.0.3","jszip":"3.10.1","memfs":"4.38.1","pino":"^9.7.0","pino-abstract-transport":"^1.2.0","pino-pretty":"^11.3.0","proper-lockfile":"^4.1.2","semver":"^7.8.0","ts-retry-promise":"^0.8.1","zod":"^4.1.12"},"devDependencies":{"@salesforce/dev-scripts":"^14.0.0","@salesforce/ts-sinon":"^1.4.36","@types/benchmark":"^2.1.5","@types/chai":"^4.3.17","@types/fast-levenshtein":"^0.0.4","@types/jsonwebtoken":"9.0.10","@types/mocha":"^10.0.10","@types/node":"^26.4.0","@types/proper-lockfile":"^4.1.4","@types/semver":"^7.7.1","@types/sinon":"^10.0.20","benchmark":"^2.1.4","esbuild":"^0.28.0","eslint":"^10.4.0","eslint-config-salesforce-typescript":"^6.0.0","mocha":"^11.7.5","ts-node":"^10.9.2","ts-patch":"^3.3.0","typescript":"^6.0.3"},"resolutions":{"@jsforce/jsforce-node/node-fetch/whatwg-url":"^14.0.0"},"repository":{"type":"git","url":"https://github.com/forcedotcom/sfdx-core.git"},"publishConfig":{"access":"public"},"wireit":{"build":{"dependencies":["compile","lint"]},"compile":{"command":"tspc -p . --pretty --incremental","dependencies":["build:schema:project","build:schema:scratch"],"files":["src/**/*.ts","src/**/*.json","tsconfig.json","messages","messageTransformer"],"output":["lib/**","*.tsbuildinfo"],"clean":"if-file-deleted"},"format":{"command":"prettier --write \\"+(src|test|schemas)/**/*.+(ts|js|json)|command-snapshot.json\\"","files":["src/**/*.ts","test/**/*.ts","schemas/**/*.json","command-snapshot.json",".prettier*"],"output":[]},"lint":{"command":"eslint src test --color --cache --cache-location .eslintcache","files":["src/**/*.ts","test/**/*.ts","messages/**","**/eslint.config.*","**/.eslint*","**/tsconfig.json"],"output":[]},"test:compile":{"command":"tsc -p \\"./test\\" --pretty","files":["test/**/*.ts","**/tsconfig.json"],"output":[]},"test:only":{"command":"nyc mocha \\"test/unit/**/*.test.ts\\"","dependencies":["build:schema:project","build:schema:scratch"],"env":{"FORCE_COLOR":"2"},"files":["test/**/*.ts","src/**/*.ts","**/tsconfig.json",".mocha*","!*.nut.ts",".nycrc"],"output":[]},"test":{"dependencies":["test:only","test:compile","link-check","bundle-check"]},"test:nuts":{"command":"mocha \\"test/**/*.nut.ts\\" --timeout 500000","dependencies":["compile"],"files":["test/nut/**/*","src/**/*.ts","**/tsconfig.json",".mocha*"],"output":[]},"bundle-check":{"command":"node scripts/build.mjs","dependencies":["compile"],"files":["lib/**/*","scripts/build.mjs"],"output":["dist/**/*"]},"link-check":{"command":"node -e \\"process.exit(process.env.CI ? 0 : 1)\\" || linkinator \\"./*.md\\" --skip \\"examples/README.md|CHANGELOG.md|node_modules|test/|confluence.internal.salesforce.com|my.salesforce.com|%s|npmjs.com\\" --markdown --retry --directory-listing --verbosity error","files":["./*.md","./examples/**/*.md","./messages/**/*.md","./!(CHANGELOG).md"],"output":[]},"compile-typedoc":{"command":"tsc -p typedocExamples"},"build:schema:project":{"command":"ts-node scripts/schemas/build-schema-project.ts","files":["src/schema/sfdx-project/**/*.ts","scripts/schemas/build-schema-project.ts","scripts/schemas/consts.ts"],"output":["schemas/sfdx-project.schema.json"],"clean":"if-file-deleted"},"build:schema:scratch":{"command":"ts-node scripts/schemas/build-schema-scratch.ts","files":["src/schema/project-scratch-def/**/*.ts","scripts/schemas/build-schema-scratch.ts","scripts/schemas/consts.ts"],"output":["schemas/project-scratch-def.schema.json"],"clean":"if-file-deleted"}}}');

/***/ }),

/***/ 65847:
/***/ ((module) => {

module.exports = /*#__PURE__*/JSON.parse('{"name":"thread-stream","version":"3.2.0","description":"A streaming way to send data to a Node.js Worker Thread","main":"index.js","types":"index.d.ts","dependencies":{"real-require":"^0.2.0"},"devDependencies":{"@types/node":"^20.1.0","@types/tap":"^15.0.0","@yao-pkg/pkg":"^5.11.5","desm":"^1.3.0","fastbench":"^1.0.1","husky":"^9.0.6","pino-elasticsearch":"^8.0.0","sonic-boom":"^4.0.1","standard":"^17.0.0","tap":"^16.2.0","ts-node":"^10.8.0","typescript":"^5.3.2","why-is-node-running":"^2.2.2"},"scripts":{"build":"tsc --noEmit","test":"standard && npm run build && npm run transpile && tap \\"test/**/*.test.*js\\" && tap --ts test/*.test.*ts","test:ci":"standard && npm run transpile && npm run test:ci:js && npm run test:ci:ts","test:ci:js":"tap --no-check-coverage --timeout=120 --coverage-report=lcovonly \\"test/**/*.test.*js\\"","test:ci:ts":"tap --ts --no-check-coverage --coverage-report=lcovonly \\"test/**/*.test.*ts\\"","test:yarn":"npm run transpile && tap \\"test/**/*.test.js\\" --no-check-coverage","transpile":"sh ./test/ts/transpile.sh","prepare":"husky install"},"standard":{"ignore":["test/ts/**/*","test/syntax-error.mjs"]},"repository":{"type":"git","url":"git+https://github.com/mcollina/thread-stream.git"},"keywords":["worker","thread","threads","stream"],"author":"Matteo Collina <hello@matteocollina.com>","license":"MIT","bugs":{"url":"https://github.com/mcollina/thread-stream/issues"},"homepage":"https://github.com/mcollina/thread-stream#readme"}');

/***/ })

};
