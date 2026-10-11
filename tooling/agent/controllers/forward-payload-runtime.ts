import { createHash } from 'node:crypto';
import { lstatSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { verifyStagedPayloadManifest } from './forward-update-plan.ts';
type PublicIngressApi = Pick<
  typeof import('../../../packages/agent/src/contracts/public-ingress.js'),
  'canonicalJsonDigest'
>;
type ScopeApi = Pick<
  typeof import('../../../packages/agent/src/contracts/implementation-scope.js'),
  'compileImplementationScopeValidator'
>;
type DocumentationApi = Pick<
  typeof import('../../../packages/agent/src/documentation/clear.js'),
  'executeDocumentationClearOperation' | 'produceDocumentationClearCheckpoint'
>;
type SafeAccessApi = Pick<
  typeof import('../../../packages/agent/src/config/safe-repository-access.js'),
  'requireSafeRepositoryAccess'
>;
type SnapshotApi = Pick<
  typeof import('../../../packages/agent/src/orchestration/scoped-source-snapshot.js'),
  'snapshotDeclaredSources'
>;

interface ForwardPayloadRuntime {
  readonly canonicalJsonDigest: PublicIngressApi['canonicalJsonDigest'];
  readonly compileImplementationScopeValidator: ScopeApi['compileImplementationScopeValidator'];
  readonly executeDocumentationClearOperation: DocumentationApi['executeDocumentationClearOperation'];
  readonly produceDocumentationClearCheckpoint: DocumentationApi['produceDocumentationClearCheckpoint'];
  readonly requireSafeRepositoryAccess: SafeAccessApi['requireSafeRepositoryAccess'];
  readonly snapshotDeclaredSources: SnapshotApi['snapshotDeclaredSources'];
}

const sha = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');
const entries = [
  'src/contracts/public-ingress.ts',
  'src/contracts/implementation-scope.ts',
  'src/documentation/clear.ts',
  'src/config/safe-repository-access.ts',
  'src/orchestration/scoped-source-snapshot.ts',
  'bin/documentation-clear.ts',
];

interface ParserPort {
  parse(source: string, options: { sourceType: 'module'; plugins: ['typescript'] }): unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function* childrenOf(node: Record<string, unknown>): Generator<unknown> {
  for (const child of Object.values(node)) {
    if (Array.isArray(child)) {
      const items: readonly unknown[] = child;
      yield* items;
    } else yield child;
  }
}

function isParserPort(value: unknown): value is ParserPort {
  return isRecord(value) && typeof value.parse === 'function';
}

function isPublicIngressApi(value: unknown): value is PublicIngressApi {
  return isRecord(value) && typeof value.canonicalJsonDigest === 'function';
}

function isScopeApi(value: unknown): value is ScopeApi {
  return isRecord(value) && typeof value.compileImplementationScopeValidator === 'function';
}

function isDocumentationApi(value: unknown): value is DocumentationApi {
  return (
    isRecord(value) &&
    typeof value.executeDocumentationClearOperation === 'function' &&
    typeof value.produceDocumentationClearCheckpoint === 'function'
  );
}

function isSafeAccessApi(value: unknown): value is SafeAccessApi {
  return isRecord(value) && typeof value.requireSafeRepositoryAccess === 'function';
}

function isSnapshotApi(value: unknown): value is SnapshotApi {
  return isRecord(value) && typeof value.snapshotDeclaredSources === 'function';
}

function containsImportMeta(node: unknown): boolean {
  if (!isRecord(node)) return false;
  if (
    node.type === 'MetaProperty' &&
    isRecord(node.meta) &&
    node.meta.name === 'import' &&
    isRecord(node.property) &&
    node.property.name === 'meta'
  )
    return true;
  for (const child of childrenOf(node)) if (containsImportMeta(child)) return true;
  return false;
}

/** One-argument URL validation is ordinary code; module resources must be literal and sealed. */
export function scanForwardResources(source: string, parser: ParserPort): string[] {
  const tree: unknown = parser.parse(source, { sourceType: 'module', plugins: ['typescript'] });
  const resources: string[] = [];
  const visit = (value: unknown): void => {
    if (!isRecord(value)) return;
    const node = value;
    if (
      node.type === 'NewExpression' &&
      isRecord(node.callee) &&
      node.callee.type === 'Identifier' &&
      node.callee.name === 'URL' &&
      Array.isArray(node.arguments)
    ) {
      const args: unknown[] = node.arguments;
      if (args.some(containsImportMeta)) {
        const base: unknown = args[1];
        if (
          args.length !== 2 ||
          !isRecord(args[0]) ||
          args[0].type !== 'StringLiteral' ||
          !isRecord(base) ||
          base.type !== 'MemberExpression' ||
          base.computed !== false ||
          !isRecord(base.property) ||
          base.property.name !== 'url' ||
          !isRecord(base.object) ||
          base.object.type !== 'MetaProperty' ||
          !isRecord(base.object.meta) ||
          base.object.meta.name !== 'import' ||
          !isRecord(base.object.property) ||
          base.object.property.name !== 'meta'
        )
          throw new Error('forward payload computed module resource is unsealed');
        const resource = args[0].value;
        if (typeof resource !== 'string') throw new Error('forward payload module resource is invalid');
        resources.push(resource);
      }
    }
    for (const child of childrenOf(node)) visit(child);
  };
  visit(tree);
  return resources;
}

/** Verify the complete selected stage and every local module loaded by CLEAR before import. */
export async function loadForwardPayloadRuntime(
  repositoryRoot: string,
  payloadRoot: string,
  expectedManifestSha: string,
): Promise<ForwardPayloadRuntime> {
  if (
    typeof repositoryRoot !== 'string' ||
    !path.isAbsolute(repositoryRoot) ||
    path.resolve(repositoryRoot) !== repositoryRoot
  )
    throw new Error('forward payload runtime repository root invalid');
  const { files } = verifyStagedPayloadManifest(payloadRoot, expectedManifestSha);
  if (typeof Bun === 'undefined') throw new Error('forward payload runtime requires pinned Bun');
  const transpiler = new Bun.Transpiler({ loader: 'ts' });
  const parserValue: unknown = createRequire(path.join(repositoryRoot, 'vida-agent/package.json'))('@babel/parser');
  if (!isParserPort(parserValue)) throw new Error('forward payload parser is invalid');
  const parser = parserValue;
  const checked = new Set<string>();
  const queue: string[] = [...entries, 'bun.lock'];
  while (queue.length > 0) {
    const relative = queue.shift();
    if (relative === undefined || checked.has(relative)) continue;
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
      if (selected === null) throw new Error(`forward payload runtime import is not sealed: ${key} -> ${importPath}`);
      queue.push(selected);
    }
  }
  const source = (relative: string): string =>
    pathToFileURL(path.join(repositoryRoot, 'vida-agent', 'src', relative)).href;
  const modules: readonly [unknown, unknown, unknown, unknown, unknown] = await Promise.all([
    import(source('contracts/public-ingress.ts')),
    import(source('contracts/implementation-scope.ts')),
    import(source('documentation/clear.ts')),
    import(source('config/safe-repository-access.ts')),
    import(source('orchestration/scoped-source-snapshot.ts')),
  ]);
  const [contracts, scopes, documentation, access, snapshots] = modules;
  if (!isPublicIngressApi(contracts)) throw new Error('forward payload public ingress API is invalid');
  if (!isScopeApi(scopes)) throw new Error('forward payload scope API is invalid');
  if (!isDocumentationApi(documentation)) throw new Error('forward payload documentation API is invalid');
  if (!isSafeAccessApi(access)) throw new Error('forward payload repository access API is invalid');
  if (!isSnapshotApi(snapshots)) throw new Error('forward payload source snapshot API is invalid');
  return {
    canonicalJsonDigest: contracts.canonicalJsonDigest,
    compileImplementationScopeValidator: scopes.compileImplementationScopeValidator,
    executeDocumentationClearOperation: documentation.executeDocumentationClearOperation,
    produceDocumentationClearCheckpoint: documentation.produceDocumentationClearCheckpoint,
    requireSafeRepositoryAccess: access.requireSafeRepositoryAccess,
    snapshotDeclaredSources: snapshots.snapshotDeclaredSources,
  };
}
