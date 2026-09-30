import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { verifyForwardReviewSet } from './forward-review-proof.mjs';

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const encoded = (value) => Buffer.from(JSON.stringify(value, null, 2) + '\n');
const requireAdmission = (condition, message) => {
  if (!condition) throw Error(`forward candidate admission: ${message}`);
};
const relative = (value) =>
  typeof value === 'string' &&
  value.length > 0 &&
  !value.includes('\\') &&
  !value.startsWith('/') &&
  value.split('/').every((part) => part && !['.', '..'].includes(part) && !part.includes(':'));
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
function record(root, file) {
  const bytes = read(root, file),
    value = JSON.parse(bytes);
  requireAdmission(bytes.equals(encoded(value)), 'durable record encoding differs');
  return { bytes, value };
}
function resources(tree) {
  const found = [];
  const meta = (node) =>
    node &&
    typeof node === 'object' &&
    ((node.type === 'MetaProperty' && node.meta.name === 'import' && node.property.name === 'meta') ||
      Object.values(node).some((child) => (Array.isArray(child) ? child.some(meta) : meta(child))));
  const visit = (node) => {
    if (!node || typeof node !== 'object') return;
    if (
      node.type === 'NewExpression' &&
      node.callee.type === 'Identifier' &&
      node.callee.name === 'URL' &&
      node.arguments.some(meta)
    ) {
      const [file, base] = node.arguments;
      requireAdmission(
        node.arguments.length === 2 &&
          file.type === 'StringLiteral' &&
          base.type === 'MemberExpression' &&
          !base.computed &&
          base.property.name === 'url' &&
          base.object.type === 'MetaProperty' &&
          base.object.meta.name === 'import' &&
          base.object.property.name === 'meta',
        'computed module resource is unsealed',
      );
      found.push(file.value);
    }
    for (const child of Object.values(node))
      if (Array.isArray(child)) child.forEach(visit);
      else if (child && typeof child === 'object') visit(child);
  };
  visit(tree);
  return found;
}
function runtimeImports(tree, file) {
  const imports = [];
  const constructors = new Set(),
    loaders = new Set(['require']),
    declarations = [],
    functions = new Map();
  const discover = (node) => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'ImportDeclaration' && node.source.value === 'node:module')
      for (const item of node.specifiers)
        if (item.type === 'ImportSpecifier' && item.imported.name === 'createRequire')
          constructors.add(item.local.name);
    if (node.type === 'VariableDeclarator') declarations.push(node);
    if (node.type === 'FunctionDeclaration') functions.set(node.id.name, node);
    for (const child of Object.values(node))
      if (Array.isArray(child)) child.forEach(discover);
      else if (child && typeof child === 'object') discover(child);
  };
  discover(tree);
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
  const loader = (node) =>
    (node?.type === 'Identifier' && loaders.has(node.name)) ||
    (node?.type === 'CallExpression' && node.callee.type === 'Identifier' && constructors.has(node.callee.name)) ||
    (node?.type === 'MemberExpression' &&
      !node.computed &&
      node.property.name === 'resolve' &&
      node.object.type === 'Identifier' &&
      loaders.has(node.object.name));
  const literal = (node, value) => node?.type === 'StringLiteral' && node.value === value;
  const named = (node, value) => node?.type === 'Identifier' && node.name === value;
  const member = (node, object, property) =>
    node?.type === 'MemberExpression' && !node.computed && named(node.object, object) && named(node.property, property);
  const attestedFsSafeLoad = (node, enclosing) => {
    if (
      file !== 'vida-agent/src/config/safe-repository-access.ts' ||
      !['loadLinuxNativeBinding', 'loadWindowsNativeBinding'].includes(enclosing) ||
      !named(node.callee, 'moduleRequire') ||
      node.arguments.length !== 1
    )
      return false;
    const argument = node.arguments[0],
      root = declarations.find((entry) => named(entry.id, 'fsSafePackageRoot'))?.init;
    const attested = declarations.find((entry) => named(entry.id, 'fsSafePackageAttested'))?.init;
    const resolution = functions.get('resolveFsSafePackageRoot');
    const local = (name) =>
      resolution?.body.body
        .flatMap((entry) => (entry.type === 'VariableDeclaration' ? entry.declarations : []))
        .find((entry) => named(entry.id, name))?.init;
    const entry = local('entry'),
      directory = local('root');
    return (
      argument.type === 'CallExpression' &&
      member(argument.callee, 'path', 'join') &&
      argument.arguments.length === 3 &&
      named(argument.arguments[0], 'fsSafePackageRoot') &&
      literal(argument.arguments[1], 'dist') &&
      literal(argument.arguments[2], 'native.js') &&
      root?.type === 'CallExpression' &&
      named(root.callee, 'resolveFsSafePackageRoot') &&
      root.arguments.length === 0 &&
      entry?.type === 'CallExpression' &&
      named(entry.callee, 'realpathSync') &&
      entry.arguments.length === 1 &&
      entry.arguments[0]?.type === 'CallExpression' &&
      member(entry.arguments[0].callee, 'moduleRequire', 'resolve') &&
      literal(entry.arguments[0].arguments[0], '@openclaw/fs-safe') &&
      directory?.type === 'CallExpression' &&
      member(directory.callee, 'path', 'resolve') &&
      directory.arguments.length === 2 &&
      literal(directory.arguments[1], '..') &&
      directory.arguments[0]?.type === 'CallExpression' &&
      member(directory.arguments[0].callee, 'path', 'dirname') &&
      named(directory.arguments[0].arguments[0], 'entry') &&
      resolution.body.body.some((entry) => entry.type === 'ReturnStatement' && named(entry.argument, 'root')) &&
      attested?.type === 'BinaryExpression' &&
      attested.operator === '===' &&
      attested.left.type === 'CallExpression' &&
      named(attested.left.callee, 'fsSafePackageTreeHash') &&
      named(attested.left.arguments[0], 'fsSafePackageRoot')
    );
  };
  const visit = (node, enclosing = null) => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'FunctionDeclaration') enclosing = node.id.name;
    if (
      ['ImportDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration'].includes(node.type) &&
      node.source &&
      node.importKind !== 'type' &&
      node.exportKind !== 'type' &&
      !(
        node.specifiers?.length &&
        node.specifiers.every((specifier) => specifier.importKind === 'type' || specifier.exportKind === 'type')
      )
    )
      imports.push(node.source.value);
    const source =
      node.type === 'ImportExpression'
        ? node.source
        : node.type === 'CallExpression' && node.callee.type === 'Import'
          ? node.arguments[0]
          : null;
    if (source) {
      requireAdmission(source.type === 'StringLiteral', `computed runtime import is unsealed: ${file}`);
      imports.push(source.value);
    }
    if (node.type === 'CallExpression' && loader(node.callee)) {
      if (node.arguments.length === 1 && node.arguments[0].type === 'StringLiteral')
        imports.push(node.arguments[0].value);
      else {
        requireAdmission(attestedFsSafeLoad(node, enclosing), `computed require is unsealed: ${file}`);
        imports.push('@openclaw/fs-safe');
      }
    }
    if (
      node.type === 'TSImportEqualsDeclaration' &&
      node.moduleReference.type === 'TSExternalModuleReference' &&
      !node.isTypeOnly &&
      node.importKind !== 'type'
    ) {
      requireAdmission(
        node.moduleReference.expression.type === 'StringLiteral',
        `computed import-equals is unsealed: ${file}`,
      );
      imports.push(node.moduleReference.expression.value);
    }
    for (const child of Object.values(node))
      if (Array.isArray(child)) child.forEach((entry) => visit(entry, enclosing));
      else if (child && typeof child === 'object') visit(child, enclosing);
  };
  visit(tree);
  return imports;
}
export function scanAdmittedRuntimeImports(source, parser, file = 'source') {
  const tree = parser.parse(source, { sourceType: 'module', plugins: ['typescript'] });
  return [...runtimeImports(tree, file), ...resources(tree)];
}

/** Administrative admission only; normal runtime selection is never changed by this reader. */
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
  requireAdmission(/^[a-z0-9][a-z0-9._-]{0,79}$/.test(selected.value.generation), 'selected generation invalid');
  const directory = `.agent/cutover/${operationId}`;
  const intent = record(root, `${directory}/forward-intent.v1.json`);
  const overlay = record(root, `.agent/cutover/${selected.value.generation}/maintenance-lock.v1.json`);
  const lock = intent.value;
  requireAdmission(
    lock.schema === 'VidaForwardUpdateMaintenance/v1' &&
      overlay.bytes.equals(intent.bytes) &&
      lock.operation_id === operationId &&
      lock.parent_generation === selected.value.generation &&
      lock.parent_selector_sha256 === sha(selected.bytes) &&
      lock.old_payload_manifest_sha256 === selected.value.payload_manifest_sha256,
    'forward parent/overlay tuple differs',
  );
  const cutoff = read(root, `.agent/cutover/${lock.parent_generation}/cutoff-witness.json`);
  requireAdmission(sha(cutoff) === lock.parent_cutoff_sha256, 'parent cutoff differs');
  const authorization = record(root, `${directory}/forward-authorization.v1.json`);
  const approved = authorization.value;
  requireAdmission(
    Object.keys(approved).sort().join(',') ===
      ['schema', 'operation_id', 'operator', 'outcome', 'pointer', 'plan_sha256', 'evidence'].sort().join(',') &&
      approved.schema === 'VidaForwardUpdateAuthorization/v1' &&
      approved.operation_id === operationId &&
      approved.operator === lock.operator &&
      approved.outcome === 'approved' &&
      approved.pointer?.trim() &&
      approved.plan_sha256 === sha(intent.bytes),
    'forward authorization differs',
  );
  verifyForwardReviewSet(root, operationId, approved.plan_sha256, approved.evidence);
  const manifestBytes = read(payloadRoot, 'vida-agent-payload.manifest.v1.json'),
    manifest = JSON.parse(manifestBytes);
  requireAdmission(
    sha(manifestBytes) === lock.new_payload_manifest_sha256 &&
      manifest.schema === 'VidaAgentPreparedPayload/v1' &&
      Array.isArray(manifest.files) &&
      Array.isArray(manifest.unresolved_integration_paths) &&
      !manifest.unresolved_integration_paths.length,
    'successor manifest differs',
  );
  const files = new Map();
  for (const entry of manifest.files) {
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
  const observed = [];
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
  const sourcePackage = JSON.parse(read(payloadRoot, 'vida-agent/package.json')),
    rootPackage = JSON.parse(read(root, 'vida-agent/package.json'));
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
  const parser = createRequire(path.join(root, 'vida-agent/package.json'))('@babel/parser');
  const queue = [
    entrypoint,
    'vida-agent/package.json',
    'vida-agent/bun.lock',
    ...(purpose === 'documentation-policy' ? ['vida-agent/bin/reconcile-artifacts.mjs'] : []),
  ];
  const checked = new Set();
  while (queue.length) {
    const file = queue.shift();
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
            Object.hasOwn(sourcePackage.dependencies ?? {}, packageName) ||
            Object.hasOwn(sourcePackage.devDependencies ?? {}, packageName),
          'external dependency is not declared and locked',
        );
        continue;
      }
      let dependency = path.posix.normalize(path.posix.join(path.posix.dirname(file), imported));
      if (!files.has(dependency) && dependency.endsWith('.js') && files.has(dependency.slice(0, -3) + '.ts'))
        dependency = dependency.slice(0, -3) + '.ts';
      requireAdmission(
        dependency.startsWith('vida-agent/') && files.has(dependency),
        'local dependency escapes sealed bundle',
      );
      queue.push(dependency);
    }
  }
  if (purpose === 'completed-readonly-capture')
    return {
      operation_id: operationId,
      purpose,
      parent_selector_sha256: sha(selected.bytes),
      successor_manifest_sha256: lock.new_payload_manifest_sha256,
      intent_sha256: sha(intent.bytes),
      authorization_sha256: sha(authorization.bytes),
      entrypoint_sha256: files.get(entrypoint).sha256,
    };
  requireAdmission(files.has(targetPath), 'target policy is not manifest-bound');
  return {
    operation_id: operationId,
    payload_root: payloadRoot,
    parent_selector_sha256: sha(selected.bytes),
    parent_manifest_sha256: lock.old_payload_manifest_sha256,
    successor_manifest_sha256: lock.new_payload_manifest_sha256,
    intent_sha256: sha(intent.bytes),
    authorization_sha256: sha(authorization.bytes),
    target_path: targetPath,
    target_sha256: files.get(targetPath).sha256,
  };
}

export function hasForwardOverlay(root) {
  const selected = JSON.parse(read(root, '.agent/active-runtime-selector.v1.json'));
  requireAdmission(/^[a-z0-9][a-z0-9._-]{0,79}$/.test(selected.generation), 'selected generation invalid');
  try {
    read(root, `.agent/cutover/${selected.generation}/maintenance-lock.v1.json`);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}
