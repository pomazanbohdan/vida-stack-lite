import { createHash } from 'node:crypto';
import { lstatSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { verifyStagedPayloadManifest } from './forward-update-plan.mjs';

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const entries = [
  'src/contracts/public-ingress.ts',
  'src/documentation/clear.ts',
  'src/config/safe-repository-access.ts',
  'src/orchestration/scoped-source-snapshot.ts',
  'bin/documentation-clear.mjs',
];

/** One-argument URL validation is ordinary code; module resources must be literal and sealed. */
export function scanForwardResources(source, parser) {
  const tree = parser.parse(source, { sourceType: 'module', plugins: ['typescript'] });
  const resources = [];
  const containsImportMeta = (node) => {
    if (!node || typeof node !== 'object') return false;
    if (node.type === 'MetaProperty' && node.meta.name === 'import' && node.property.name === 'meta') return true;
    return Object.values(node).some((child) =>
      Array.isArray(child)
        ? child.some(containsImportMeta)
        : child && typeof child === 'object' && containsImportMeta(child),
    );
  };
  const visit = (node) => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'NewExpression' && node.callee.type === 'Identifier' && node.callee.name === 'URL') {
      const args = node.arguments;
      if (args.some(containsImportMeta)) {
        const base = args[1];
        if (
          args.length !== 2 ||
          args[0].type !== 'StringLiteral' ||
          !base ||
          base.type !== 'MemberExpression' ||
          base.computed ||
          base.property.name !== 'url' ||
          base.object.type !== 'MetaProperty' ||
          base.object.meta.name !== 'import' ||
          base.object.property.name !== 'meta'
        )
          throw new Error('forward payload computed module resource is unsealed');
        resources.push(args[0].value);
      }
    }
    for (const child of Object.values(node)) {
      if (Array.isArray(child)) child.forEach(visit);
      else if (child && typeof child === 'object' && typeof child.type === 'string') visit(child);
    }
  };
  visit(tree);
  return resources;
}

/** Verify the complete selected stage and every local module loaded by CLEAR before import. */
export async function loadForwardPayloadRuntime(repositoryRoot, payloadRoot, expectedManifestSha) {
  if (
    typeof repositoryRoot !== 'string' ||
    !path.isAbsolute(repositoryRoot) ||
    path.resolve(repositoryRoot) !== repositoryRoot
  )
    throw new Error('forward payload runtime repository root invalid');
  const { files } = verifyStagedPayloadManifest(payloadRoot, expectedManifestSha);
  if (typeof Bun === 'undefined') throw new Error('forward payload runtime requires pinned Bun');
  const transpiler = new Bun.Transpiler({ loader: 'ts' });
  const parser = createRequire(path.join(repositoryRoot, 'vida-agent/package.json'))('@babel/parser');
  const checked = new Set();
  const queue = [...entries, 'bun.lock'];
  while (queue.length) {
    const relative = queue.shift();
    if (checked.has(relative)) continue;
    checked.add(relative);
    const key = `vida-agent/${relative}`;
    const expected = files.get(key);
    if (!expected) throw new Error(`forward payload runtime dependency is not sealed: ${key}`);
    let current = repositoryRoot;
    const segments = key.split('/');
    for (const [index, segment] of segments.entries()) {
      current = path.join(current, segment);
      const info = lstatSync(current);
      if (
        info.isSymbolicLink() ||
        (index === segments.length - 1 ? !info.isFile() || info.nlink !== 1 : !info.isDirectory())
      )
        throw new Error(`forward payload runtime dependency is unsafe: ${key}`);
    }
    const bytes = readFileSync(current);
    if (bytes.length !== expected.size || sha(bytes) !== expected.sha256)
      throw new Error(`forward payload runtime dependency differs: ${key}`);
    if (!/\.(?:ts|js|mjs)$/u.test(relative)) continue;
    // The scanner's TS parser rejects CLI hashbangs; execution and integrity use raw bytes.
    const source = bytes.toString('utf8').replace(/^#![^\r\n]*/u, (line) => ' '.repeat(line.length));
    const imports = transpiler.scanImports(source);
    const dynamicCount = (source.match(/\bimport\s*\(/gu) ?? []).length;
    if (dynamicCount !== imports.filter((item) => item.kind === 'dynamic-import').length)
      throw new Error(`forward payload runtime computed import is unsealed: ${key}`);
    const resources = scanForwardResources(source, parser);
    for (const importPath of [...imports.map((item) => item.path), ...resources]) {
      if (!importPath.startsWith('.')) continue;
      const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(relative), importPath));
      if (resolved.startsWith('../') || path.posix.isAbsolute(resolved))
        throw new Error(`forward payload runtime import escapes bundle: ${key}`);
      const selected = files.has(`vida-agent/${resolved}`)
        ? resolved
        : resolved.endsWith('.js') && files.has(`vida-agent/${resolved.slice(0, -3)}.ts`)
          ? `${resolved.slice(0, -3)}.ts`
          : null;
      if (!selected) throw new Error(`forward payload runtime import is not sealed: ${key} -> ${importPath}`);
      queue.push(selected);
    }
  }
  const source = (relative) => pathToFileURL(path.join(repositoryRoot, 'vida-agent', 'src', relative)).href;
  const [contracts, documentation, access, snapshots] = await Promise.all([
    import(source('contracts/public-ingress.ts')),
    import(source('documentation/clear.ts')),
    import(source('config/safe-repository-access.ts')),
    import(source('orchestration/scoped-source-snapshot.ts')),
  ]);
  return {
    canonicalJsonDigest: contracts.canonicalJsonDigest,
    executeDocumentationClearOperation: documentation.executeDocumentationClearOperation,
    produceDocumentationClearCheckpoint: documentation.produceDocumentationClearCheckpoint,
    requireSafeRepositoryAccess: access.requireSafeRepositoryAccess,
    snapshotDeclaredSources: snapshots.snapshotDeclaredSources,
  };
}
