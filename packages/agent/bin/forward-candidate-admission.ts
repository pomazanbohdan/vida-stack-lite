import { lstatSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { forwardReviewFileDigest as sha, verifyForwardReviewSet } from './forward-review-proof.ts';
import { createFsSafeNativeImportBoundary } from './fs-safe-native-import-boundary.ts';
import { moduleDeclarationFacts } from './runtime-import-bindings.ts';
import type { ModuleDeclarationFacts } from './runtime-import-bindings.ts';
import { moduleDirectoryAnchorCalls } from './module-directory-anchors.ts';
import { isImportMetaProperty, isNamedIdentifier, moduleUrlResourceShape } from './module-url-resource-shape.ts';
import type { Node as BabelNode, VariableDeclarator as BabelVariableDeclarator } from '@babel/types';
type JsonRecord = Record<string, unknown>;
type BabelParserModule = typeof import('@babel/parser');
type AdmissionPurpose = 'documentation-policy' | 'completed-readonly-capture';
type SealedPayloadFile = { path: string; sha256: string; size: number };
type ForwardAdmissionResult = {
  operation_id: string;
  purpose?: AdmissionPurpose;
  payload_root?: string;
  parent_selector_sha256: string;
  parent_manifest_sha256?: string;
  successor_manifest_sha256: string;
  intent_sha256: string;
  authorization_sha256: string;
  target_path?: string;
  target_sha256?: string;
  entrypoint_sha256?: string;
};
type AdmissionInput = {
  root: string;
  payloadRoot: string;
  operationId: string;
  moduleUrl: string;
  targetPath?: string;
  purpose?: AdmissionPurpose;
};

const encoded = (value: unknown) => Buffer.from(JSON.stringify(value, null, 2) + '\n');
const requireAdmission: (condition: unknown, message: string) => asserts condition = (condition, message) => {
  if (!condition) throw Error(`forward candidate admission: ${message}`);
};
const relative = (value: unknown): value is string =>
  typeof value === 'string' &&
  value.length > 0 &&
  !value.includes('\\') &&
  !value.startsWith('/') &&
  value.split('/').every((part) => part && !['.', '..'].includes(part) && !part.includes(':'));
function read(root: string, file: string): Buffer {
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
function record(root: string, file: string): { bytes: Buffer; value: JsonRecord } {
  const bytes = read(root, file);
  const value: unknown = JSON.parse(bytes.toString('utf8'));
  requireAdmission(isCanonicalRecord(value, bytes), 'durable record shape or encoding differs');
  return { bytes, value };
}
function isCanonicalRecord(value: unknown, bytes: Buffer): value is JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value) && bytes.equals(encoded(value));
}
function isBabelNode(value: unknown): value is BabelNode {
  return value !== null && typeof value === 'object' && 'type' in value && typeof value.type === 'string';
}
function visitBabelChildren(node: BabelNode, visit: (child: BabelNode) => void): void {
  for (const child of Object.values(node)) {
    if (Array.isArray(child))
      child.forEach((entry) => {
        if (isBabelNode(entry)) visit(entry);
      });
    else if (isBabelNode(child)) visit(child);
  }
}
function resources(tree: BabelNode, file: string, facts: ModuleDeclarationFacts): string[] {
  const directoryAnchors = moduleDirectoryAnchorCalls(tree, file, facts);
  const found: string[] = [];
  const meta = (node: unknown): boolean =>
    isBabelNode(node) &&
    (isImportMetaProperty(node) ||
      Object.values(node).some((child) => (Array.isArray(child) ? child.some(meta) : meta(child))));
  const visit = (node: BabelNode): void => {
    if (node.type === 'NewExpression' && isNamedIdentifier(node.callee, 'URL') && node.arguments.some(meta)) {
      const resource = moduleUrlResourceShape(node);
      if (!resource) throw new Error('forward candidate admission: computed module resource is unsealed');
      if (!directoryAnchors.has(resource.node)) found.push(resource.specifier);
    }
    visitBabelChildren(node, visit);
  };
  visit(tree);
  return found;
}
function closeRuntimeLoaderAliases(
  declarations: readonly BabelVariableDeclarator[],
  constructors: ReadonlySet<string>,
  loaders: Set<string>,
): void {
  const aliasesBySource = new Map<string, string[]>();
  declarations.forEach((node) => {
    if (node.id.type !== 'Identifier' || !node.init) return;
    const initializer = node.init;
    if (initializer.type === 'Identifier') {
      const aliases = aliasesBySource.get(initializer.name) ?? [];
      aliases.push(node.id.name);
      aliasesBySource.set(initializer.name, aliases);
    } else if (
      initializer.type === 'CallExpression' &&
      initializer.callee.type === 'Identifier' &&
      constructors.has(initializer.callee.name)
    )
      loaders.add(node.id.name);
  });
  // Set iteration visits appended unique names, so cycles and duplicate edges converge.
  for (const name of loaders) for (const alias of aliasesBySource.get(name) ?? []) loaders.add(alias);
}

function runtimeImports(tree: BabelNode, file: string, facts: ModuleDeclarationFacts): string[] {
  const imports: string[] = [];
  const constructors = new Set<string>(),
    loaders = new Set<string>(),
    declarations: BabelVariableDeclarator[] = [];
  if (!facts.valueBindings.has('require')) loaders.add('require');
  const boundary =
    file === 'vida-agent/src/config/safe-repository-access.ts' ? createFsSafeNativeImportBoundary(tree, file) : null;
  const discover = (node: BabelNode): void => {
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
  closeRuntimeLoaderAliases(declarations, constructors, loaders);
  const loader = (node: BabelNode | null | undefined): boolean =>
    (node?.type === 'Identifier' && loaders.has(node.name)) ||
    (node?.type === 'CallExpression' && node.callee.type === 'Identifier' && constructors.has(node.callee.name)) ||
    ((node?.type === 'MemberExpression' || node?.type === 'OptionalMemberExpression') &&
      loader(node.object) &&
      ((!node.computed && named(node.property, 'resolve')) ||
        (node.computed && node.property.type === 'StringLiteral' && node.property.value === 'resolve')));
  const named = (node: BabelNode | null | undefined, value: string): boolean =>
    node?.type === 'Identifier' && node.name === value;
  const visit = (node: BabelNode): void => {
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
export function scanAdmittedRuntimeImports(source: string, parser: BabelParserModule, file = 'source'): string[] {
  const tree = parser.parse(source, { sourceType: 'module', plugins: ['typescript'] });
  const facts = moduleDeclarationFacts(tree);
  return [...runtimeImports(tree, file, facts), ...resources(tree, file, facts)];
}
function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}
function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function requireString(value: JsonRecord, key: string, label: string): string {
  const result = value[key];
  requireAdmission(typeof result === 'string' && result.length > 0, label);
  return result;
}
function isSealedPayloadFile(value: unknown): value is SealedPayloadFile {
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
function requiredPayloadFile(files: Map<string, SealedPayloadFile>, file: string): SealedPayloadFile {
  const entry = files.get(file);
  if (!entry) throw new Error(`forward candidate admission: missing manifest entry ${file}`);
  return entry;
}
function hasValidForwardDigestTuple(
  parentSelector: string,
  parentManifest: string,
  cutoff: string,
  successorManifest: string,
): boolean {
  return [parentSelector, parentManifest, cutoff, successorManifest].every((value) => /^[a-f0-9]{64}$/.test(value));
}
function hasNonEmptyPointer(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}
function isDeclaredExternalPackage(manifest: JsonRecord, packageName: string): boolean {
  return (
    (isRecord(manifest.dependencies) && Object.hasOwn(manifest.dependencies, packageName)) ||
    (isRecord(manifest.devDependencies) && Object.hasOwn(manifest.devDependencies, packageName))
  );
}
function requireTargetPath(value: string | undefined): string {
  requireAdmission(typeof value === 'string', 'target policy path is missing');
  return value;
}
function requireQueuedModule(queue: string[]): string {
  const file = queue.shift();
  requireAdmission(typeof file === 'string', 'module queue entry is missing');
  return file;
}
function isMissingAdmissionFile(error: unknown): boolean {
  return error !== null && typeof error === 'object' && 'code' in error && error.code === 'ENOENT';
}
export function verifyForwardCandidateAdmission({
  root,
  payloadRoot,
  operationId,
  moduleUrl,
  targetPath,
  purpose = 'documentation-policy',
}: AdmissionInput): ForwardAdmissionResult {
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
  const manifestBytes = read(payloadRoot, 'vida-agent-payload.manifest.v1.json');
  const parsedManifest: unknown = JSON.parse(manifestBytes.toString('utf8'));
  requireAdmission(isRecord(parsedManifest), 'successor manifest shape invalid');
  const manifest = parsedManifest;
  requireAdmission(
    sha(manifestBytes) === lock.new_payload_manifest_sha256 &&
      manifest.schema === 'VidaAgentPreparedPayload/v1' &&
      isUnknownArray(manifest.files) &&
      isUnknownArray(manifest.unresolved_integration_paths) &&
      manifest.unresolved_integration_paths.length === 0,
    'successor manifest differs',
  );
  const manifestFiles = manifest.files;
  requireAdmission(isUnknownArray(manifestFiles), 'successor manifest files are invalid');
  const files = new Map<string, SealedPayloadFile>();
  for (const candidate of manifestFiles) {
    requireAdmission(isSealedPayloadFile(candidate), 'manifest entry shape invalid');
    requireAdmission(relative(candidate.path) && !files.has(candidate.path), 'manifest entry invalid');
    const bytes = read(payloadRoot, candidate.path);
    requireAdmission(bytes.length === candidate.size && sha(bytes) === candidate.sha256, 'sealed payload bytes differ');
    files.set(candidate.path, candidate);
  }
  const observed: string[] = [];
  const walk = (prefix: string): void => {
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
  const sourcePackageValue: unknown = JSON.parse(read(payloadRoot, 'vida-agent/package.json').toString('utf8'));
  const rootPackageValue: unknown = JSON.parse(read(root, 'vida-agent/package.json').toString('utf8'));
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
      ? 'vida-agent/bin/capture-completed-readonly.ts'
      : 'vida-agent/bin/documentation-policy-transition.ts';
  const origin = fileURLToPath(moduleUrl);
  const stageEntry = path.join(payloadRoot, entrypoint);
  requireAdmission(
    origin === stageEntry || (purpose === 'documentation-policy' && origin === path.join(root, entrypoint)),
    'public operation origin is outside admitted source',
  );
  const parserValue: unknown = createRequire(path.join(root, 'vida-agent/package.json'))('@babel/parser');
  requireAdmission(isBabelParser(parserValue), 'admitted source parser is unavailable');
  const parser = parserValue;
  const queue = [
    entrypoint,
    'vida-agent/package.json',
    'vida-agent/bun.lock',
    ...(purpose === 'documentation-policy' ? ['vida-agent/bin/reconcile-artifacts.ts'] : []),
  ];
  const checked = new Set<string>();
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
function isBabelParser(value: unknown): value is BabelParserModule {
  return value !== null && typeof value === 'object' && 'parse' in value && typeof value.parse === 'function';
}
export function hasForwardOverlay(root: string): boolean {
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
