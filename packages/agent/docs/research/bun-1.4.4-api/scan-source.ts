import { parse } from '@babel/parser';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, lstatSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { jsonLayout } from './json-layout.ts';

type RecordValue = Record<string, unknown>;
type Observation = { file: string; line: number; kind: string; value: string };
type CatalogRow = {
  id: string;
  owner: string;
  name: string | null;
  kind: string;
  classification: string;
  file: string;
  line: number;
  type: string | null;
};
const agentRoot = path.resolve(import.meta.dirname, '../../..');
const outputs = import.meta.dirname;
const args = process.argv.slice(2);
if (args.length !== 1 || !['--write', '--check'].includes(args[0] ?? '')) throw Error('Pass --write or --check');
function object(value: unknown): value is RecordValue {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function chain(value: unknown): string | undefined {
  if (!object(value)) return undefined;
  if (value.type === 'Identifier' && typeof value.name === 'string') return value.name;
  if ((value.type === 'MemberExpression' || value.type === 'OptionalMemberExpression') && object(value.property)) {
    const base = chain(value.object);
    const property =
      value.property.type === 'Identifier' && !value.computed
        ? value.property.name
        : value.property.type === 'StringLiteral'
          ? value.property.value
          : undefined;
    return base && typeof property === 'string' ? base + '.' + property : undefined;
  }
  return undefined;
}
function sourceFiles(dir: string): string[] {
  return readdirSync(dir)
    .sort()
    .flatMap((name) => {
      const file = path.join(dir, name),
        info = lstatSync(file);
      if (info.isSymbolicLink()) throw Error('Source inventory includes a link: ' + file);
      return info.isDirectory() ? sourceFiles(file) : info.isFile() && file.endsWith('.ts') ? [file] : [];
    });
}
const sources = [...sourceFiles(path.join(agentRoot, 'bin')), ...sourceFiles(path.join(agentRoot, 'src'))].sort();
const observations: Observation[] = [];
const inventory: { file: string; sha256: string; bytes: number }[] = [];
for (const file of sources) {
  const bytes = readFileSync(file),
    relative = path.relative(agentRoot, file).replaceAll('\\', '/');
  inventory.push({ file: relative, sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length });
  const ast = parse(bytes.toString('utf8'), { sourceType: 'module', plugins: ['typescript'] });
  const imports = new Map<string, string>();
  for (const entry of ast.program.body) {
    if (entry.type !== 'ImportDeclaration') continue;
    const module = entry.source.value;
    if (module.startsWith('bun:') || module === 'bun' || module.startsWith('node:')) {
      observations.push({ file: relative, line: entry.loc?.start.line ?? 0, kind: 'import', value: module });
      for (const specifier of entry.specifiers)
        if (specifier.type === 'ImportSpecifier') {
          const imported =
            specifier.imported.type === 'Identifier' ? specifier.imported.name : specifier.imported.value;
          imports.set(specifier.local.name, module + ':' + imported);
        }
    }
  }
  function visit(node: unknown): void {
    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }
    if (!object(node)) return;
    if (
      node.type === 'ImportExpression' &&
      object(node.source) &&
      node.source.type === 'StringLiteral' &&
      typeof node.source.value === 'string'
    ) {
      const loc =
        object(node.loc) && object(node.loc.start) && typeof node.loc.start.line === 'number' ? node.loc.start.line : 0;
      if (node.source.value === 'bun' || node.source.value.startsWith('bun:') || node.source.value.startsWith('node:'))
        observations.push({ file: relative, line: loc, kind: 'dynamic-import', value: node.source.value });
    }
    if (node.type === 'CallExpression' || node.type === 'OptionalCallExpression' || node.type === 'NewExpression') {
      const callee = chain(node.callee);
      const loc =
        object(node.loc) && object(node.loc.start) && typeof node.loc.start.line === 'number' ? node.loc.start.line : 0;
      if (callee?.startsWith('Bun.'))
        observations.push({
          file: relative,
          line: loc,
          kind: node.type === 'NewExpression' ? 'bun-constructor' : 'bun-call',
          value: callee,
        });
      if (
        (callee === 'require' || (object(node.callee) && node.callee.type === 'Import')) &&
        Array.isArray(node.arguments)
      ) {
        const first: unknown = node.arguments[0];
        if (
          object(first) &&
          first.type === 'StringLiteral' &&
          typeof first.value === 'string' &&
          (first.value === 'bun' || first.value.startsWith('bun:') || first.value.startsWith('node:'))
        )
          observations.push({
            file: relative,
            line: loc,
            kind: callee === 'require' ? 'require' : 'dynamic-import',
            value: first.value,
          });
      }
      if (callee && imports.has(callee))
        observations.push({ file: relative, line: loc, kind: 'imported-call', value: imports.get(callee) ?? '' });
      if (callee === 'HTMLRewriter')
        observations.push({ file: relative, line: loc, kind: 'global-constructor-or-call', value: callee });
    }
    for (const [key, value] of Object.entries(node))
      if (!['loc', 'start', 'end', 'extra', 'comments', 'tokens'].includes(key)) visit(value);
  }
  visit(ast.program);
}
const raw: unknown = JSON.parse(readFileSync(path.join(outputs, 'catalog.json'), 'utf8'));
if (!object(raw) || !Array.isArray(raw.declarations)) throw Error('Invalid catalog');
const rows: CatalogRow[] = [];
for (const item of raw.declarations) {
  if (
    !object(item) ||
    typeof item.id !== 'string' ||
    typeof item.owner !== 'string' ||
    !(typeof item.name === 'string' || item.name === null) ||
    typeof item.kind !== 'string' ||
    typeof item.classification !== 'string' ||
    typeof item.file !== 'string' ||
    typeof item.line !== 'number' ||
    !(typeof item.type === 'string' || item.type === null)
  )
    throw Error('Invalid declaration row');
  rows.push({
    id: item.id,
    owner: item.owner,
    name: item.name,
    kind: item.kind,
    classification: item.classification,
    file: item.file,
    line: item.line,
    type: item.type,
  });
}
const native = new Set(
  observations.flatMap((x) =>
    x.kind === 'bun-call' || x.kind === 'bun-constructor'
      ? [x.value]
      : x.kind === 'imported-call' && /^bun:[^:]+$/.test(x.value)
        ? ['Bun.' + x.value.slice(4)]
        : x.kind === 'imported-call' && /^bun:(?:bundle|ffi|jsc|sqlite|test):[^:]+$/.test(x.value)
          ? [x.value.replace(/:([^:]+)$/, (_, name: string) => '.' + name)]
          : [],
  ),
);
const candidates = new Set([
  'CryptoHasher',
  'fileURLToPath',
  'pathToFileURL',
  'deepEquals',
  'spawn',
  'spawnSync',
  'file',
  'write',
  'YAML',
]);
const disposition = rows.map((row) => {
  const pieces = row.owner.split('.');
  const moduleName =
    pieces[0] === 'bun' || /^bun:(?:bundle|ffi|jsc|sqlite|test)$/.test(pieces[0] ?? '') ? pieces[0] : undefined;
  const root = moduleName ? (pieces[1] ?? row.name) : undefined;
  const key = root && moduleName ? (moduleName === 'bun' ? 'Bun.' : moduleName + '.') + root : undefined;
  const status =
    row.kind === 'FunctionType'
      ? 'callback-or-function-type'
      : row.classification === 'type-declaration'
        ? 'type-declaration'
        : key && native.has(key)
          ? 'family-observed-bun-syntax'
          : root && candidates.has(root)
            ? 'candidate-family-review'
            : 'not-established';
  return { id: row.id, status };
});
function outputText(name: string, text: string): void {
  const file = path.join(outputs, name);
  if (args[0] === '--check') {
    if (readFileSync(file, 'utf8') !== text) throw Error('Output differs: ' + name);
  } else writeFileSync(file, text);
}
function output(name: string, value: Record<string, unknown>): void {
  outputText(name, jsonLayout(value));
}
const catalogSha256 = createHash('sha256')
  .update(readFileSync(path.join(outputs, 'catalog.json')))
  .digest('hex');
const inventorySha256 = createHash('sha256').update(JSON.stringify(inventory)).digest('hex');
const cell = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('|', '&#124;')
    .replaceAll('\n', ' ');
const memberRows = rows.map(
  (row) =>
    `| ${cell((row.owner ? row.owner + '.' : '') + (row.name ?? '[' + row.kind + ']'))} | ${cell(row.kind)} | ${cell(row.file)}:${row.line} | ${cell(row.type ?? 'unresolved')} |`,
);
outputText(
  'members.md',
  '# Bun 1.4.4 declaration members\n\nEach row is a declaration; overload signatures and reference edges are in `catalog.json`. Types may be generic or symbolic.\n\n| Owner and member | Kind | Declaration | Checker type |\n| --- | --- | --- | --- |\n' +
    memberRows.join('\n') +
    '\n',
);
output('source-observations.json', {
  schema: 'BunSourceSyntaxObservation/v1',
  binding: 'f4db048ab9c9e67c13ba22e62f144aafb3d3d6fa',
  inventorySha256,
  inventory,
  observations,
});
output('disposition.json', {
  schema: 'BunDeclarationDisposition/v1',
  catalogSha256,
  inventorySha256,
  declarationCount: rows.length,
  note: 'Syntax evidence is not binding resolution or absence proof.',
  rows: disposition,
});
console.log(
  JSON.stringify({ sources: inventory.length, observations: observations.length, dispositions: disposition.length }),
);

if (args[0] === '--check') await import('./audit-catalog.ts');
