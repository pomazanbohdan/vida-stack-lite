import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { verifyForwardReviewSet } from './forward-review-proof.mjs';
import { createFsSafeNativeImportBoundary } from './fs-safe-native-import-boundary.ts';
import { moduleHasValueBinding } from './runtime-import-bindings.ts';
import { moduleDirectoryAnchorCalls } from './module-directory-anchors.ts';

/** @param {string | Uint8Array} bytes */
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
/** @param {unknown} value */
const encoded = (value) => Buffer.from(JSON.stringify(value, null, 2) + '\n');
/** @type {(condition: unknown, message: string) => asserts condition} */
const requireAdmission = (condition, message) => {
  if (!condition) throw Error(`forward candidate admission: ${message}`);
};
/** @param {unknown} value @returns {value is string} */
const relative = (value) =>
  typeof value === 'string' &&
  value.length > 0 &&
  !value.includes('\\') &&
  !value.startsWith('/') &&
  value.split('/').every((part) => part && !['.', '..'].includes(part) && !part.includes(':'));
/** @param {string} root @param {string} file @returns {Buffer} */
function read(root, file) {
  requireAdmission(relative(file), 'relative path invalid');
  let current = root;
  for (const [index, part] of file.split('/').entries()) {
    current = path.join(current, part);
    const info = lstatSync(current);
    requireAdmission(
      !info.isSymbolicLink() &&
        (index === file.split('/').length - 1 ? info.isFile() && info.nlink === 1 : info.isDirectory()),
      'unsafe sealed path',
    );
  }
  return readFileSync(current);
}
/** @param {string} root @param {string} file @returns {{bytes: Buffer, value: Record<string, unknown>}} */
function record(root, file) {
  const bytes = read(root, file),
    /** @type {unknown} */ value = JSON.parse(bytes.toString('utf8'));
  requireAdmission(isCanonicalRecord(value, bytes), 'durable record shape or encoding differs');
  return { bytes, value };
}
/** @param {unknown} value @param {Buffer} bytes @returns {value is Record<string, unknown>} */
function isCanonicalRecord(value, bytes) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) && bytes.equals(encoded(value));
}
/** @typedef {import('@babel/types').Node} BabelNode */
/** @typedef {import('@babel/types').VariableDeclarator} BabelVariableDeclarator */
/** @param {unknown} value @returns {value is BabelNode} */
function isBabelNode(value) {
  return value !== null && typeof value === 'object' && 'type' in value && typeof value.type === 'string';
}
/** @param {BabelNode} node @param {(child: BabelNode) => void} visit */
function visitBabelChildren(node, visit) {
  for (const child of Object.values(node)) {
    if (Array.isArray(child))
      child.forEach((entry) => {
        if (isBabelNode(entry)) visit(entry);
      });
    else if (isBabelNode(child)) visit(child);
  }
}
/** @param {import('@babel/types').Node} tree @param {string} file */
function resources(tree, file) {
  const directoryAnchors = moduleDirectoryAnchorCalls(tree, file);
  /** @type {string[]} */
  const found = [];
  /** @param {unknown} node @returns {boolean} */
  const meta = (node) =>
    isBabelNode(node) &&
    ((node.type === 'MetaProperty' && node.meta.name === 'import' && node.property.name === 'meta') ||
      Object.values(node).some((child) => (Array.isArray(child) ? child.some(meta) : meta(child))));
  /** @param {BabelNode} node */
  const visit = (node) => {
    if (
      node.type === 'NewExpression' &&
      node.callee.type === 'Identifier' &&
      node.callee.name === 'URL' &&
      node.arguments.some(meta)
    ) {
      const file = node.arguments[0];
      const base = node.arguments[1];
      if (
        node.arguments.length !== 2 ||
        !file ||
        file.type !== 'StringLiteral' ||
        !base ||
        base.type !== 'MemberExpression' ||
        base.computed ||
        base.property.type !== 'Identifier' ||
        base.property.name !== 'url' ||
        base.object.type !== 'MetaProperty' ||
        base.object.meta.name !== 'import' ||
        base.object.property.name !== 'meta'
      )
        throw new Error('forward candidate admission: computed module resource is unsealed');
      if (!directoryAnchors.has(node)) found.push(file.value);
    }
    visitBabelChildren(node, visit);
  };
  visit(tree);
  return found;
}
/** @param {BabelNode} tree @param {string} file */
function runtimeImports(tree, file) {
  /** @type {string[]} */
  const imports = [];
  const constructors = new Set(),
    loaders = new Set(),
    /** @type {BabelVariableDeclarator[]} */
    declarations = [];
  if (!moduleHasValueBinding(tree, 'require')) loaders.add('require');
  const boundary =
    file === 'vida-agent/src/config/safe-repository-access.ts' ? createFsSafeNativeImportBoundary(tree, file) : null;
  /** @param {BabelNode} node */
  const discover = (node) => {
    boundary?.observe(node);
    if (node.type === 'ImportDeclaration' && node.source.value === 'node:module')
      for (const item of node.specifiers)
        if (
          item.type === 'ImportSpecifier' &&
          item.imported.type === 'Identifier' &&
          item.imported.name === 'createRequire'
        )
          constructors.add(item.local.name);
    if (node.type === 'VariableDeclarator') declarations.push(node);
    visitBabelChildren(node, discover);
  };
  discover(tree);
  const attestedLoads = boundary?.finish();
  for (let pass = 0; pass <= declarations.length; pass++)
    for (const node of declarations)
      if (
        node.id.type === 'Identifier' &&
        ((node.init?.type === 'Identifier' && loaders.has(node.init.name)) ||
          (node.init?.type === 'CallExpression' &&
            node.init.callee.type === 'Identifier' &&
            constructors.has(node.init.callee.name)))
      )
        loaders.add(node.id.name);
  /** @param {BabelNode | null | undefined} node @returns {boolean} */
  const loader = (node) =>
    (node?.type === 'Identifier' && loaders.has(node.name)) ||
    (node?.type === 'CallExpression' && node.callee.type === 'Identifier' && constructors.has(node.callee.name)) ||
    ((node?.type === 'MemberExpression' || node?.type === 'OptionalMemberExpression') &&
      loader(node.object) &&
      ((!node.computed && named(node.property, 'resolve')) ||
        (node.computed && node.property.type === 'StringLiteral' && node.property.value === 'resolve')));
  /** @param {BabelNode | null | undefined} node @param {string} value */
  const named = (node, value) => node?.type === 'Identifier' && node.name === value;
  /** @param {BabelNode} node */
  const visit = (node) => {
    if (node.type === 'ImportDeclaration' && node.importKind !== 'type') {
      const runtimeSpecifier =
        node.specifiers.length === 0 ||
        node.specifiers.some((specifier) => specifier.type !== 'ImportSpecifier' || specifier.importKind !== 'type');
      if (runtimeSpecifier) imports.push(node.source.value);
    }
    if (node.type === 'ExportNamedDeclaration' && node.source && node.exportKind !== 'type') {
      const runtimeSpecifier =
        node.specifiers.length === 0 ||
        node.specifiers.some((specifier) => specifier.type !== 'ExportSpecifier' || specifier.exportKind !== 'type');
      if (runtimeSpecifier) imports.push(node.source.value);
    }
    if (node.type === 'ExportAllDeclaration' && node.exportKind !== 'type') imports.push(node.source.value);
    const source =
      node.type === 'ImportExpression'
        ? node.source
        : node.type === 'CallExpression' && node.callee.type === 'Import'
          ? node.arguments[0]
          : null;
    if (source) {
      if (source.type !== 'StringLiteral')
        throw new Error(`forward candidate admission: computed runtime import is unsealed: ${file}`);
      imports.push(source.value);
    }
    if (
      (node.type === 'CallExpression' || node.type === 'OptionalCallExpression') &&
      (node.callee.type === 'MemberExpression' || node.callee.type === 'OptionalMemberExpression') &&
      node.callee.computed &&
      loader(node.callee.object)
    )
      requireAdmission(
        node.callee.property.type === 'StringLiteral' && node.callee.property.value === 'resolve',
        `computed require member is unsealed: ${file}`,
      );
    if ((node.type === 'CallExpression' || node.type === 'OptionalCallExpression') && loader(node.callee)) {
      const argument = node.arguments[0];
      if (node.arguments.length === 1 && argument?.type === 'StringLiteral') imports.push(argument.value);
      else {
        requireAdmission(
          node.type === 'CallExpression' && attestedLoads?.has(node),
          `computed require is unsealed: ${file}`,
        );
        imports.push('@openclaw/fs-safe');
      }
    }
    if (
      node.type === 'TSImportEqualsDeclaration' &&
      node.moduleReference.type === 'TSExternalModuleReference' &&
      node.importKind !== 'type'
    ) {
      requireAdmission(
        node.moduleReference.expression.type === 'StringLiteral',
        `computed import-equals is unsealed: ${file}`,
      );
      imports.push(node.moduleReference.expression.value);
    }
    visitBabelChildren(node, visit);
  };
  visit(tree);
  return imports;
}
/**
 * @param {string} source
 * @param {typeof import('@babel/parser')} parser
 * @param {string} [file]
 * @returns {string[]}
 */
export function scanAdmittedRuntimeImports(source, parser, file = 'source') {
  const tree = parser.parse(source, { sourceType: 'module', plugins: ['typescript'] });
  return [...runtimeImports(tree, file), ...resources(tree, file)];
}

/** @typedef {'documentation-policy' | 'completed-readonly-capture'} AdmissionPurpose */
/** @typedef {{path: string, sha256: string, size: number}} SealedPayloadFile */
/** @typedef {{operation_id: string, purpose?: AdmissionPurpose, payload_root?: string, parent_selector_sha256: string, parent_manifest_sha256?: string, successor_manifest_sha256: string, intent_sha256: string, authorization_sha256: string, target_path?: string, target_sha256?: string, entrypoint_sha256?: string}} ForwardAdmissionResult */
/** @param {unknown} value @returns {value is Record<string, unknown>} */
function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
/** @param {Record<string, unknown>} value @param {string} key @param {string} label @returns {string} */
function requireString(value, key, label) {
  const result = value[key];
  requireAdmission(typeof result === 'string' && result.length > 0, label);
  return result;
}
/** @param {unknown} value @returns {value is SealedPayloadFile} */
function isSealedPayloadFile(value) {
  return (
    isRecord(value) &&
    typeof value.path === 'string' &&
    typeof value.sha256 === 'string' &&
    /^[a-f0-9]{64}$/.test(value.sha256) &&
    typeof value.size === 'number' &&
    Number.isSafeInteger(value.size) &&
    value.size >= 0
  );
}
/** @param {Map<string, SealedPayloadFile>} files @param {string} file */
function requiredPayloadFile(files, file) {
  const entry = files.get(file);
  if (!entry) throw new Error(`forward candidate admission: missing manifest entry ${file}`);
  return entry;
}
/** @param {string} parentSelector @param {string} parentManifest @param {string} cutoff @param {string} successorManifest @returns {boolean} */
function hasValidForwardDigestTuple(parentSelector, parentManifest, cutoff, successorManifest) {
  return [parentSelector, parentManifest, cutoff, successorManifest].every((value) => /^[a-f0-9]{64}$/.test(value));
}
/** @param {unknown} value @returns {boolean} */
function hasNonEmptyPointer(value) {
  return typeof value === 'string' && value.trim().length > 0;
}
/** @param {Record<string, unknown>} manifest @param {string} packageName @returns {boolean} */
function isDeclaredExternalPackage(manifest, packageName) {
  return (
    (isRecord(manifest.dependencies) && Object.hasOwn(manifest.dependencies, packageName)) ||
    (isRecord(manifest.devDependencies) && Object.hasOwn(manifest.devDependencies, packageName))
  );
}
/** @param {string | undefined} value @returns {string} */
function requireTargetPath(value) {
  requireAdmission(typeof value === 'string', 'target policy path is missing');
  return value;
}
/** @param {string[]} queue @returns {string} */
function requireQueuedModule(queue) {
  const file = queue.shift();
  requireAdmission(typeof file === 'string', 'module queue entry is missing');
  return file;
}
/** @param {unknown} error @returns {boolean} */
function isMissingAdmissionFile(error) {
  return error !== null && typeof error === 'object' && 'code' in error && error.code === 'ENOENT';
}
/** Administrative admission only; normal runtime selection is never changed by this reader. */
/** @param {{root: string, payloadRoot: string, operationId: string, moduleUrl: string, targetPath?: string, purpose?: AdmissionPurpose}} input @returns {ForwardAdmissionResult} */
export function verifyForwardCandidateAdmission({
  root,
  payloadRoot,
  operationId,
  moduleUrl,
  targetPath,
  purpose = 'documentation-policy',
}) {
  requireAdmission(
    ['documentation-policy', 'completed-readonly-capture'].includes(purpose),
    'administrative purpose invalid',
  );
  requireAdmission(
    path.isAbsolute(root) &&
      path.resolve(root) === root &&
      path.isAbsolute(payloadRoot) &&
      path.resolve(payloadRoot) === payloadRoot &&
      /^[a-z0-9][a-z0-9._-]{0,79}$/.test(operationId),
    'root or operation identity invalid',
  );
  const payloadInfo = lstatSync(payloadRoot);
  requireAdmission(
    payloadInfo.isDirectory() &&
      !payloadInfo.isSymbolicLink() &&
      path.resolve(realpathSync(payloadRoot)) === payloadRoot,
    'sealed payload root is redirected or unsafe',
  );
  const selected = record(root, '.agent/active-runtime-selector.v1.json');
  const selectedGeneration = requireString(selected.value, 'generation', 'selected generation invalid');
  const selectedManifestSha = requireString(
    selected.value,
    'payload_manifest_sha256',
    'selected manifest digest invalid',
  );
  requireAdmission(/^[a-z0-9][a-z0-9._-]{0,79}$/.test(selectedGeneration), 'selected generation invalid');
  requireAdmission(/^[a-f0-9]{64}$/.test(selectedManifestSha), 'selected manifest digest invalid');
  const directory = `.agent/cutover/${operationId}`;
  const intent = record(root, `${directory}/forward-intent.v1.json`);
  const overlay = record(root, `.agent/cutover/${selectedGeneration}/maintenance-lock.v1.json`);
  const lock = intent.value;
  const lockOperationId = requireString(lock, 'operation_id', 'forward intent operation identity invalid');
  const parentGeneration = requireString(lock, 'parent_generation', 'forward parent generation invalid');
  const parentSelectorSha = requireString(lock, 'parent_selector_sha256', 'forward parent selector digest invalid');
  const oldPayloadManifestSha = requireString(
    lock,
    'old_payload_manifest_sha256',
    'forward parent manifest digest invalid',
  );
  const cutoffSha = requireString(lock, 'parent_cutoff_sha256', 'forward cutoff digest invalid');
  const successorManifestSha = requireString(
    lock,
    'new_payload_manifest_sha256',
    'forward successor manifest digest invalid',
  );
  const operator = requireString(lock, 'operator', 'forward operator identity invalid');
  requireAdmission(
    lock.schema === 'VidaForwardUpdateMaintenance/v1' &&
      overlay.bytes.equals(intent.bytes) &&
      lockOperationId === operationId &&
      parentGeneration === selectedGeneration &&
      parentSelectorSha === sha(selected.bytes) &&
      oldPayloadManifestSha === selectedManifestSha,
    'forward parent/overlay tuple differs',
  );
  requireAdmission(
    hasValidForwardDigestTuple(parentSelectorSha, oldPayloadManifestSha, cutoffSha, successorManifestSha),
    'forward digest tuple differs',
  );
  const cutoff = read(root, `.agent/cutover/${parentGeneration}/cutoff-witness.json`);
  requireAdmission(sha(cutoff) === cutoffSha, 'parent cutoff differs');
  const authorization = record(root, `${directory}/forward-authorization.v1.json`);
  const approved = authorization.value;
  const authorizationPlanSha = requireString(approved, 'plan_sha256', 'forward authorization plan digest invalid');
  requireAdmission(
    Object.keys(approved).sort().join(',') ===
      ['schema', 'operation_id', 'operator', 'outcome', 'pointer', 'plan_sha256', 'evidence'].sort().join(',') &&
      approved.schema === 'VidaForwardUpdateAuthorization/v1' &&
      approved.operation_id === operationId &&
      approved.operator === operator &&
      approved.outcome === 'approved' &&
      hasNonEmptyPointer(approved.pointer) &&
      authorizationPlanSha === sha(intent.bytes),
    'forward authorization differs',
  );
  verifyForwardReviewSet(root, operationId, authorizationPlanSha, approved.evidence);
  const manifestBytes = read(payloadRoot, 'vida-agent-payload.manifest.v1.json'),
    /** @type {unknown} */ parsedManifest = JSON.parse(manifestBytes.toString('utf8'));
  requireAdmission(isRecord(parsedManifest), 'successor manifest shape invalid');
  const manifest = parsedManifest;
  requireAdmission(
    sha(manifestBytes) === lock.new_payload_manifest_sha256 &&
      manifest.schema === 'VidaAgentPreparedPayload/v1' &&
      Array.isArray(manifest.files) &&
      Array.isArray(manifest.unresolved_integration_paths) &&
      !manifest.unresolved_integration_paths.length,
    'successor manifest differs',
  );
  /** @type {Map<string, SealedPayloadFile>} */
  const files = new Map();
  for (const entry of manifest.files) {
    requireAdmission(isSealedPayloadFile(entry), 'manifest entry shape invalid');
    requireAdmission(
      relative(entry.path) &&
        !files.has(entry.path) &&
        /^[a-f0-9]{64}$/.test(entry.sha256) &&
        Number.isSafeInteger(entry.size) &&
        entry.size >= 0,
      'manifest entry invalid',
    );
    const bytes = read(payloadRoot, entry.path);
    requireAdmission(bytes.length === entry.size && sha(bytes) === entry.sha256, 'sealed payload bytes differ');
    files.set(entry.path, entry);
  }
  /** @type {string[]} */
  const observed = [];
  /** @param {string} prefix */
  const walk = (prefix) => {
    for (const name of readdirSync(path.join(payloadRoot, prefix))) {
      const file = prefix ? `${prefix}/${name}` : name,
        info = lstatSync(path.join(payloadRoot, file));
      requireAdmission(!info.isSymbolicLink(), 'payload symlink invalid');
      if (info.isDirectory()) walk(file);
      else {
        requireAdmission(info.isFile(), 'payload node invalid');
        observed.push(file);
      }
    }
  };
  walk('');
  requireAdmission(
    observed.sort().join('\n') === [...files.keys(), 'vida-agent-payload.manifest.v1.json'].sort().join('\n'),
    'unmanifested payload bytes',
  );
  const /** @type {unknown} */ sourcePackageValue = JSON.parse(
      read(payloadRoot, 'vida-agent/package.json').toString('utf8'),
    ),
    /** @type {unknown} */ rootPackageValue = JSON.parse(read(root, 'vida-agent/package.json').toString('utf8'));
  requireAdmission(isRecord(sourcePackageValue) && isRecord(rootPackageValue), 'package metadata shape invalid');
  const sourcePackage = sourcePackageValue;
  const rootPackage = rootPackageValue;
  for (const field of ['dependencies', 'devDependencies', 'engines', 'packageManager'])
    requireAdmission(
      isDeepStrictEqual(sourcePackage[field], rootPackage[field]),
      'installed dependency inputs differ from admitted source',
    );
  requireAdmission(
    read(root, 'vida-agent/bun.lock').equals(read(payloadRoot, 'vida-agent/bun.lock')) &&
      read(root, 'vida-agent/.bun-version').equals(read(payloadRoot, 'vida-agent/.bun-version')),
    'installed dependency lock/pin differs',
  );
  const entrypoint =
    purpose === 'completed-readonly-capture'
      ? 'vida-agent/bin/capture-completed-readonly.mjs'
      : 'vida-agent/bin/documentation-policy-transition.mjs';
  const origin = fileURLToPath(moduleUrl),
    stageEntry = path.join(payloadRoot, entrypoint);
  requireAdmission(
    origin === stageEntry || (purpose === 'documentation-policy' && origin === path.join(root, entrypoint)),
    'public operation origin is outside admitted source',
  );
  /** @type {unknown} */
  const parserValue = createRequire(path.join(root, 'vida-agent/package.json'))('@babel/parser');
  requireAdmission(isBabelParser(parserValue), 'admitted source parser is unavailable');
  const parser = parserValue;
  const queue = [
    entrypoint,
    'vida-agent/package.json',
    'vida-agent/bun.lock',
    ...(purpose === 'documentation-policy' ? ['vida-agent/bin/reconcile-artifacts.mjs'] : []),
  ];
  const checked = new Set();
  while (queue.length) {
    const file = requireQueuedModule(queue);
    if (checked.has(file)) continue;
    checked.add(file);
    requireAdmission(files.has(file), 'module dependency is not sealed');
    const bytes = read(payloadRoot, file);
    if (origin !== stageEntry)
      requireAdmission(read(root, file).equals(bytes), 'installed administrative dependency differs');
    if (!/\.(ts|js|mjs)$/.test(file)) continue;
    const source = bytes.toString('utf8').replace(/^#![^\r\n]*/, (line) => ' '.repeat(line.length));
    for (const imported of scanAdmittedRuntimeImports(source, parser, file)) {
      if (!imported.startsWith('.')) {
        const packageName = imported.startsWith('@')
          ? imported.split('/').slice(0, 2).join('/')
          : imported.split('/')[0];
        requireAdmission(
          imported.startsWith('node:') ||
            imported.startsWith('bun:') ||
            (typeof packageName === 'string' && isDeclaredExternalPackage(sourcePackage, packageName)),
          'external dependency is not declared and locked',
        );
        continue;
      }
      let dependency = path.posix.normalize(path.posix.join(path.posix.dirname(file), imported));
      if (!files.has(dependency) && dependency.endsWith('.js') && files.has(dependency.slice(0, -3) + '.ts'))
        dependency = dependency.slice(0, -3) + '.ts';
      requireAdmission(
        dependency.startsWith('vida-agent/') && files.has(dependency),
        `local dependency escapes sealed bundle: ${file} -> ${imported}`,
      );
      queue.push(dependency);
    }
  }
  if (purpose === 'completed-readonly-capture')
    return {
      operation_id: operationId,
      purpose,
      parent_selector_sha256: sha(selected.bytes),
      successor_manifest_sha256: successorManifestSha,
      intent_sha256: sha(intent.bytes),
      authorization_sha256: sha(authorization.bytes),
      entrypoint_sha256: requiredPayloadFile(files, entrypoint).sha256,
    };
  targetPath = requireTargetPath(targetPath);
  const targetEntry = requiredPayloadFile(files, targetPath);
  return {
    operation_id: operationId,
    payload_root: payloadRoot,
    parent_selector_sha256: sha(selected.bytes),
    parent_manifest_sha256: oldPayloadManifestSha,
    successor_manifest_sha256: successorManifestSha,
    intent_sha256: sha(intent.bytes),
    authorization_sha256: sha(authorization.bytes),
    target_path: targetPath,
    target_sha256: targetEntry.sha256,
  };
}

/** @param {unknown} value @returns {value is typeof import('@babel/parser')} */
function isBabelParser(value) {
  return value !== null && typeof value === 'object' && 'parse' in value && typeof value.parse === 'function';
}

/** @param {string} root */
export function hasForwardOverlay(root) {
  const selected = record(root, '.agent/active-runtime-selector.v1.json');
  const generation = requireString(selected.value, 'generation', 'selected generation invalid');
  requireAdmission(/^[a-z0-9][a-z0-9._-]{0,79}$/.test(generation), 'selected generation invalid');
  try {
    read(root, `.agent/cutover/${generation}/maintenance-lock.v1.json`);
    return true;
  } catch (error) {
    if (isMissingAdmissionFile(error)) return false;
    throw error;
  }
}
