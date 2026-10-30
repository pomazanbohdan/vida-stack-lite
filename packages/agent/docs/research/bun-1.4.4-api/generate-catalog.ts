import {
  API,
  SymbolFlags,
  TypeFlags,
  type Program,
  type Checker,
  type Symbol as TSSymbol,
  type NodeHandle,
} from 'typescript/unstable/sync';
import type { Node, TypeNode } from 'typescript/unstable/ast';
import { ChildProcess } from 'node:child_process';
import { formatSyntaxKind } from 'typescript/unstable/ast';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { jsonLayout } from './json-layout.ts';
type RichNode = Node & {
  name?: Node & { text?: string };
  questionToken?: Node;
  typeName?: Node;
  expression?: Node;
  exprName?: Node;
  qualifier?: Node;
  argument?: Node & { literal?: Node };
  objectType?: TypeNode;
  indexType?: TypeNode;
};
type Origin = { id: string | null; file: string; line: number | null; kind: string };
type Sig = { kind: string; at: Origin | null; signature: string | null; returns: string | null };
type Declaration = {
  id: string;
  file: string;
  line: number;
  kind: string;
  owner: string;
  name: string | null;
  signature: string;
  optional: boolean;
  computed: boolean;
  static: boolean;
  classification: string;
  type: string | null;
  anyReason: string | null;
  signatures: Sig[];
};
type Scope = { program: Program; checker: Checker; files: readonly string[]; bunSymbol: TSSymbol };
const agentRoot = path.resolve(import.meta.dirname, '../../..');
const repositoryRoot = path.resolve(agentRoot, '../..');
const output = path.join(import.meta.dirname, 'catalog.json');
const args = process.argv.slice(2);
if (args.length !== 1 || !['--write', '--check'].includes(args[0] ?? ''))
  throw Error('Pass exactly --write or --check');
const scratchParent = path.join(repositoryRoot, '.tmp', 'bun-full-api-terra-20261028');
mkdirSync(scratchParent, { recursive: true });
const scratch = mkdtempSync(path.join(scratchParent, 'catalog-check-'));
const config = path.join(scratch, 'tsconfig.json');
const typesRoot = realpathSync(path.join(agentRoot, 'node_modules/@types/bun'));
const bunRoot = realpathSync(path.resolve(typesRoot, '../../bun-types'));
function version(file: string): string {
  const x: unknown = JSON.parse(readFileSync(file, 'utf8'));
  if (typeof x !== 'object' || x === null || !('version' in x) || typeof x.version !== 'string')
    throw Error('Invalid package manifest ' + file);
  return x.version;
}
const typeVersion = version(path.join(typesRoot, 'package.json'));
const bunTypesVersion = version(path.join(bunRoot, 'package.json'));
const compilerVersion = version(path.join(agentRoot, 'node_modules/typescript/package.json'));
if (Bun.version !== '1.4.4' || typeVersion !== '1.4.4' || bunTypesVersion !== '1.4.4' || compilerVersion !== '7.0.2')
  throw Error('Pinned tool or declaration version differs');
writeFileSync(
  config,
  JSON.stringify(
    {
      compilerOptions: {
        target: 'esnext',
        module: 'preserve',
        moduleResolution: 'bundler',
        lib: ['esnext', 'dom'],
        skipLibCheck: true,
        types: ['bun'],
        typeRoots: [path.join(agentRoot, 'node_modules/@types')],
      },
      files: [path.join(typesRoot, 'index.d.ts')],
    },
    null,
    2,
  ) + '\n',
  { flag: 'wx' },
);
const sha = (b: Uint8Array) => createHash('sha256').update(b).digest('hex');
const normalizedRoot = bunRoot.replaceAll('\\', '/').toLowerCase();
const owned = (p: string) =>
  p
    .replaceAll('\\', '/')
    .toLowerCase()
    .startsWith(normalizedRoot + '/');
const locate = (p: string) => {
  const x = p.replaceAll('\\', '/');
  if (owned(p)) return 'bun-types/' + x.slice(normalizedRoot.length + 1);
  const m = x.lastIndexOf('/node_modules/');
  return m < 0 ? x : 'external/' + x.slice(m + 14);
};
const names = new Set([
  'ModuleDeclaration',
  'InterfaceDeclaration',
  'ClassDeclaration',
  'TypeAliasDeclaration',
  'FunctionDeclaration',
  'MethodDeclaration',
  'MethodSignature',
  'PropertyDeclaration',
  'PropertySignature',
  'GetAccessor',
  'SetAccessor',
  'Constructor',
  'ConstructSignature',
  'CallSignature',
  'FunctionType',
  'ConstructorType',
  'IndexSignature',
  'VariableDeclaration',
  'EnumDeclaration',
  'EnumMember',
  'ImportEqualsDeclaration',
  'TypeParameter',
  'TypeLiteral',
  'MappedType',
  'ExportSpecifier',
  'ExportAssignment',
]);
const scopes = new Set([
  'ModuleDeclaration',
  'InterfaceDeclaration',
  'ClassDeclaration',
  'TypeAliasDeclaration',
  'FunctionDeclaration',
  'MethodDeclaration',
  'MethodSignature',
  'PropertySignature',
  'PropertyDeclaration',
  'FunctionType',
  'ConstructorType',
]);
const refs = new Set(['TypeReference', 'ExpressionWithTypeArguments', 'TypeQuery', 'ImportType', 'IndexedAccessType']);
function clean(s: string) {
  return s.replace(/\/\*\*[\s\S]*?\*\//g, '').trim();
}
function prefix(s: string) {
  const m = /^(?:(?:\s+)|(?:\/\*[\s\S]*?\*\/)|(?:\/\/[^\n]*(?:\n|$)))*/.exec(s);
  return m?.[0].length ?? 0;
}
function collect(scope: Scope) {
  const { program, checker, files, bunSymbol } = scope;
  const sources: unknown[] = [],
    declarations: Declaration[] = [],
    edges: unknown[] = [],
    failures: unknown[] = [],
    symbols = new Map<number, TSSymbol>(),
    modules = new Map<string, TSSymbol>();
  const ownedFiles = files.filter(owned).sort();
  const declLoc = (h: NodeHandle): Origin => {
    const n = h.resolve() as RichNode | undefined,
      f = program.getSourceFile(h.path),
      start = n && f ? n.pos + prefix(f.text.slice(n.pos, n.end)) : null,
      file = locate(h.path);
    return {
      id: start === null ? null : (file.startsWith('bun-types/') ? file.slice(10) : file) + ':' + start,
      file,
      line: start !== null && f ? f.getLineAndCharacterOfPosition(start).line + 1 : null,
      kind: formatSyntaxKind(h.kind),
    };
  };
  for (const file of ownedFiles) {
    const sf = program.getSourceFile(file);
    if (!sf) throw Error('Missing declaration ' + file);
    const raw = readFileSync(file);
    const short = locate(file).slice('bun-types/'.length);
    sources.push({ file: short, bytes: raw.length, sha256: sha(raw) });
    const pending: { n: RichNode; row: Declaration }[] = [],
      refNodes: { n: RichNode; target: Node | undefined; owner: string; ownerId: string | null; kind: string }[] = [];
    const visit = (input: Node, parents: string[], parentId: string | null): void => {
      const n = input as RichNode;
      const kind = formatSyntaxKind(n.kind);
      let name = n.name?.text;
      if (name === undefined && n.name) name = sf.text.slice(n.name.pos, n.name.end).trim();
      if (name === undefined && kind === 'Constructor') name = 'constructor';
      if (name === undefined && kind === 'CallSignature') name = '[call]';
      if (name === undefined && kind === 'ConstructSignature') name = '[construct]';
      if (name === undefined && kind === 'IndexSignature') name = '[index]';
      if (kind === 'ModuleDeclaration' && name?.startsWith('bun:') && n.name) {
        const moduleSymbol = checker.getSymbolAtLocation(n.name);
        if (moduleSymbol) modules.set(name, moduleSymbol);
        else failures.push({ file: short, error: 'Module symbol unavailable: ' + name });
      }
      const next = scopes.has(kind) ? [...parents, name ?? '[' + kind + ']'] : parents;
      let ownerId = parentId;
      if (names.has(kind)) {
        const start = n.pos + prefix(sf.text.slice(n.pos, n.end));
        const rawText = clean(sf.text.slice(start, n.end));
        const isContainer = [
          'ModuleDeclaration',
          'InterfaceDeclaration',
          'ClassDeclaration',
          'EnumDeclaration',
        ].includes(kind);
        const text = isContainer ? (rawText.split('{', 1)[0] ?? '').trim() : rawText;
        const owner = parents.join('.');
        const location = sf.getLineAndCharacterOfPosition(start).line + 1;
        const row: Declaration = {
          id: short + ':' + start,
          file: short,
          line: location,
          kind,
          owner,
          name: name ?? null,
          signature: text,
          optional: !!n.questionToken,
          computed: n.name?.kind !== undefined && formatSyntaxKind(n.name.kind) === 'ComputedPropertyName',
          static: /\bstatic\b/.test(text.split(/[({;=]/, 1)[0] ?? ''),
          classification:
            kind === 'FunctionType'
              ? 'callback-or-function-type'
              : [
                    'TypeParameter',
                    'ConstructorType',
                    'TypeLiteral',
                    'MappedType',
                    'InterfaceDeclaration',
                    'TypeAliasDeclaration',
                    'MethodSignature',
                    'PropertySignature',
                    'ConstructSignature',
                    'CallSignature',
                    'IndexSignature',
                  ].includes(kind)
                ? 'type-declaration'
                : 'declared-runtime-or-namespace',
          type: null,
          anyReason: null,
          signatures: [],
        };
        declarations.push(row);
        pending.push({ n, row });
        ownerId = row.id;
      }
      if (refs.has(kind) || kind === 'ImportEqualsDeclaration') {
        const target =
          n.typeName ??
          n.expression ??
          n.exprName ??
          n.qualifier ??
          n.argument?.literal ??
          (kind === 'ImportEqualsDeclaration' ? n.name : undefined);
        refNodes.push({ n, target, owner: parents.join('.'), ownerId, kind });
      }
      n.forEachChild((child) => {
        visit(child, next, ownerId);
      });
    };
    visit(sf, [], null);
    for (let offset = 0; offset < pending.length; offset += 128) {
      const batch = pending.slice(offset, offset + 128),
        types = checker.getTypeAtLocation(batch.map((x) => x.n));
      for (let i = 0; i < batch.length; i++) {
        const entry = batch[i];
        if (!entry) throw Error('Missing declaration batch entry');
        const { n, row } = entry;
        let t = types[i];
        if (row.kind === 'TypeParameter' && n.name) {
          const parameter = checker.getSymbolAtLocation(n.name);
          if (parameter) t = checker.getDeclaredTypeOfSymbol(parameter);
        }
        if (!t) {
          row.type = 'UNRESOLVED';
          failures.push({ file: short, line: row.line, error: 'type unavailable' });
          continue;
        }
        row.type = checker.typeToString(t);
        if (row.type === 'any')
          row.anyReason = ['Constructor', 'ConstructSignature', 'CallSignature', 'IndexSignature'].includes(row.kind)
            ? 'checker type at declaration is any; signature is captured separately'
            : row.kind === 'ModuleDeclaration'
              ? 'namespace declaration location is not a value type'
              : row.kind === 'ImportEqualsDeclaration'
                ? 'namespace alias location reports any; binding is in resolved edge'
                : row.kind === 'ExportAssignment' && row.signature === 'export = contents;'
                  ? 'export target contents is explicitly declared any in the same module'
                  : /\bany\b/.test(row.signature)
                    ? 'declared any in declaration'
                    : 'checker reported any; reason unresolved';
        const nonNull = t.isUnionType && t.isUnionType() ? (checker.getNonNullableType(t) ?? t) : t;
        let sigs = [...checker.getSignaturesOfType(nonNull, 0), ...checker.getSignaturesOfType(nonNull, 1)];
        if (
          !sigs.length &&
          ['Constructor', 'ConstructSignature', 'CallSignature', 'IndexSignature'].includes(row.kind)
        ) {
          const s = checker.getSignatureFromDeclaration(n);
          if (s) sigs = [s];
        }
        row.signatures = sigs.map((s) => {
          const h = s.declaration,
            node = h?.resolve(),
            src = h && program.getSourceFile(h.path),
            ret = checker.getReturnTypeOfSignature(s);
          return {
            kind: s.isConstruct ? 'construct' : 'call',
            at: h ? declLoc(h) : null,
            signature: src && node ? clean(src.text.slice(node.pos, node.end)) : null,
            returns: ret ? checker.typeToString(ret) : null,
          };
        });
        const symbol = t.getAliasSymbol() ?? t.getSymbol();
        if (symbol && symbol.declarations.some((d) => owned(d.path))) symbols.set(symbol.id, symbol);
      }
    }
    for (let offset = 0; offset < refNodes.length; offset += 128) {
      const batch = refNodes.slice(offset, offset + 128);
      const nodes = batch.flatMap((x) => (x.target ? [x.target] : []));
      const results = checker.getSymbolAtLocation(nodes);
      let i = 0;
      for (const item of batch) {
        const s = item.target ? results[i++] : undefined;
        const resolved = s && s.flags & SymbolFlags.Alias ? checker.getAliasedSymbol(s) : s;
        const start = item.n.pos + prefix(sf.text.slice(item.n.pos, item.n.end));
        const components =
          item.kind === 'IndexedAccessType' && item.n.objectType && item.n.indexType
            ? [item.n.objectType, item.n.indexType].map((part) => {
                const t = checker.getTypeFromTypeNode(part),
                  symbol = t?.getAliasSymbol() ?? t?.getSymbol();
                return {
                  text: clean(sf.text.slice(part.pos, part.end)),
                  type: t ? checker.typeToString(t) : null,
                  symbol: symbol?.name ?? null,
                  origins: symbol?.declarations.map(declLoc) ?? [],
                };
              })
            : [];
        const indexed = item.kind === 'IndexedAccessType' ? checker.getTypeFromTypeNode(item.n as TypeNode) : undefined;
        edges.push({
          file: short,
          line: sf.getLineAndCharacterOfPosition(start).line + 1,
          owner: item.owner,
          from: item.ownerId,
          kind: item.kind,
          text: clean(sf.text.slice(start, item.n.end)),
          symbol: resolved?.name ?? null,
          origins: resolved?.declarations.map(declLoc) ?? [],
          components,
          indexedType: indexed ? checker.typeToString(indexed) : null,
          indexedError: indexed ? indexed.isErrorType() : null,
          indexedFlags: indexed?.flags ?? null,
          resolution: resolved
            ? 'resolved'
            : item.kind === 'IndexedAccessType' && indexed && !indexed.isErrorType()
              ? indexed.flags & TypeFlags.IndexedAccess
                ? 'symbolic-indexed-type'
                : 'checker-indexed-result'
              : item.target
                ? 'unresolved'
                : 'syntactic-reference',
        });
      }
    }
  }
  const graph = [];
  for (const symbol of symbols.values()) {
    try {
      const declared = checker.getDeclaredTypeOfSymbol(symbol);
      const properties = checker.getPropertiesOfType(declared).map((p) => ({
        name: p.name,
        optional: !!(p.flags & SymbolFlags.Optional),
        origins: p.declarations.map(declLoc),
      }));
      const bases = declared.isClassOrInterface()
        ? checker.getBaseTypes(declared).map((t) => checker.typeToString(t))
        : [];
      graph.push({
        symbol: symbol.name,
        origins: symbol.declarations.map(declLoc),
        type: checker.typeToString(declared),
        bases,
        properties,
      });
    } catch (e) {
      failures.push({ symbol: symbol.name, error: String(e) });
    }
  }
  const moduleExports = [...modules.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, symbol]) => ({
      name,
      exports: checker
        .getExportsOfModule(symbol)
        .map((entry) => ({ name: entry.name, flags: entry.flags, origins: entry.declarations.map(declLoc) })),
    }));
  const alias = checker.getAliasedSymbol(bunSymbol);
  const exports = checker
    .getExportsOfModule(alias)
    .map((s) => ({ name: s.name, flags: s.flags, origins: s.declarations.map(declLoc) }));
  return {
    schema: 'BunDeclarationCatalog/v1',
    provenance: {
      bunVersion: Bun.version,
      bunRevision: Bun.revision,
      typesBunVersion: typeVersion,
      bunTypesVersion,
      compilerVersion,
      lockSha256: sha(readFileSync(path.join(agentRoot, 'bun.lock'))),
      typesShimSha256: sha(readFileSync(path.join(typesRoot, 'index.d.ts'))),
      bunTypesManifestSha256: sha(readFileSync(path.join(bunRoot, 'package.json'))),
    },
    sources,
    declarations,
    edges,
    graph,
    exports,
    moduleExports,
    failures,
  };
}
const api = new API({ cwd: repositoryRoot });
const client: unknown = Reflect.get(api, 'client');
const channel: unknown = typeof client === 'object' && client !== null ? Reflect.get(client, 'channel') : undefined;
const child: unknown = typeof channel === 'object' && channel !== null ? Reflect.get(channel, 'child') : undefined;
if (!(child instanceof ChildProcess) || !child.pid) {
  api.close();
  throw Error('Compiler child observation unavailable');
}
let terminal: { code: number | null; signal: NodeJS.Signals | null } | null = null;
child.once('exit', (code, signal) => {
  terminal = { code, signal };
});
let snapshot;
try {
  snapshot = api.updateSnapshot({ openProjects: [config] });
  const project = snapshot.getProjects()[0];
  if (!project) throw Error('Missing project');
  const checker = project.checker,
    program = project.program,
    files = program.getSourceFileNames();
  const bunSymbol = checker.resolveName('Bun', SymbolFlags.Namespace | SymbolFlags.Value | SymbolFlags.Type);
  if (!bunSymbol) throw Error('Missing Bun alias');
  const diagnostics = {
    config: program.getConfigFileParsingDiagnostics().length,
    program: program.getProgramDiagnostics().length,
    global: program.getGlobalDiagnostics().length,
    semantic: program.getSemanticDiagnostics().length,
  };
  console.log(JSON.stringify({ event: 'ready', pid: child.pid, files: files.length, diagnostics }));
  if (Object.values(diagnostics).some((count) => count !== 0)) throw Error('Compiler diagnostics are not empty');
  const data = collect({ checker, program, files, bunSymbol });
  if (data.failures.length) throw Error('Declaration extraction has failures');
  const text = jsonLayout(data);

  if (args[0] === '--check') {
    if (readFileSync(output, 'utf8') !== text) throw Error('Catalog differs from generated bytes');
  } else writeFileSync(output, text);
  console.log(
    JSON.stringify({
      event: 'catalog',
      sources: data.sources.length,
      declarations: data.declarations.length,
      edges: data.edges.length,
      graph: data.graph.length,
      exports: data.exports.length,
      failures: data.failures.length,
      sha256: sha(Buffer.from(text)),
      scratch,
    }),
  );
} finally {
  snapshot?.dispose();
  api.close();
  if (terminal === null)
    await Promise.race([new Promise((r) => child.once('exit', r)), new Promise((r) => setTimeout(r, 5000))]);
  console.log(JSON.stringify({ event: 'closed', pid: child.pid, terminal }));
  if (terminal === null) process.exitCode = 1;
}
