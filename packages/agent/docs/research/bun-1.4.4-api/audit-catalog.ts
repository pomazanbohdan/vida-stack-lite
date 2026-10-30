import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
type R = Record<string, unknown>;
const folder = import.meta.dirname;
function obj(v: unknown): R {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) throw Error('Expected record');
  return v as R;
}
function list(v: unknown): unknown[] {
  if (!Array.isArray(v)) throw Error('Expected array');
  return v;
}
function str(v: unknown): string {
  if (typeof v !== 'string') throw Error('Expected string');
  return v;
}
const catalogBytes = readFileSync(path.join(folder, 'catalog.json'));
const catalog = obj(JSON.parse(catalogBytes.toString('utf8')));
const disposition = obj(JSON.parse(readFileSync(path.join(folder, 'disposition.json'), 'utf8')));
const observations = obj(JSON.parse(readFileSync(path.join(folder, 'source-observations.json'), 'utf8')));
const hash = (value: Uint8Array | string) => createHash('sha256').update(value).digest('hex');
if (disposition.catalogSha256 !== hash(catalogBytes)) throw Error('Disposition catalog binding differs');
const inventoryHash = hash(JSON.stringify(list(observations.inventory)));
if (observations.inventorySha256 !== inventoryHash || disposition.inventorySha256 !== inventoryHash)
  throw Error('Source inventory binding differs');
const declarations = list(catalog.declarations).map(obj);
const ids = new Set(declarations.map((row) => str(row.id)));
if (ids.size !== declarations.length || disposition.declarationCount !== declarations.length)
  throw Error('Declaration IDs or count differ');
const dispositions = list(disposition.rows).map(obj);
if (
  dispositions.length !== ids.size ||
  new Set(dispositions.map((row) => str(row.id))).size !== ids.size ||
  dispositions.some((row) => !ids.has(str(row.id)))
)
  throw Error('Disposition IDs differ');
let localOrigins = 0;
function origins(value: unknown): void {
  for (const entry of list(value)) {
    const origin = obj(entry);
    if (str(origin.file).startsWith('bun-types/')) {
      localOrigins++;
      if (!ids.has(str(origin.id))) throw Error('Missing local origin: ' + origin.id);
    }
  }
}
for (const edge of list(catalog.edges).map(obj)) {
  if (edge.from !== null && !ids.has(str(edge.from))) throw Error('Missing edge source');
  origins(edge.origins);
  for (const component of list(edge.components).map(obj)) origins(component.origins);
}
for (const graph of list(catalog.graph).map(obj)) {
  origins(graph.origins);
  for (const property of list(graph.properties).map(obj)) origins(property.origins);
}
for (const row of declarations)
  for (const signature of list(row.signatures).map(obj)) if (signature.at !== null) origins([signature.at]);
for (const entry of list(catalog.exports).map(obj)) origins(entry.origins);
const modules = list(catalog.moduleExports).map(obj);
for (const module of modules) for (const entry of list(module.exports).map(obj)) origins(entry.origins);
const expectedModules = ['bun:bundle', 'bun:ffi', 'bun:jsc', 'bun:sqlite', 'bun:test'];
if (JSON.stringify(modules.map((module) => module.name)) !== JSON.stringify(expectedModules))
  throw Error('Module census differs');
const bundle = modules.find((module) => module.name === 'bun:bundle');
if (
  !bundle ||
  !list(bundle.exports)
    .map(obj)
    .some((entry) => entry.name === 'feature')
)
  throw Error('bun:bundle feature missing');
const constructorTypes = declarations.filter((row) => row.kind === 'ConstructorType');
if (constructorTypes.some((row) => row.classification !== 'type-declaration'))
  throw Error('Constructor type classification differs');
const moduleUse = list(observations.observations)
  .map(obj)
  .some((row) => row.kind === 'imported-call' && row.value === 'bun:sqlite:Database');
const dispositionById = new Map(dispositions.map((row) => [str(row.id), row.status]));
if (
  moduleUse &&
  !declarations.some(
    (row) =>
      row.owner === 'bun:sqlite' &&
      row.name === 'Database' &&
      dispositionById.get(str(row.id)) === 'family-observed-bun-syntax',
  )
)
  throw Error('Named bun:sqlite import join missing');
const core = [
  '$',
  'allocUnsafe',
  'build',
  'color',
  'concatArrayBuffers',
  'connect',
  'deepEquals',
  'deepMatch',
  'deflateSync',
  'escapeHTML',
  'file',
  'fileURLToPath',
  'gc',
  'generateHeapSnapshot',
  'gunzipSync',
  'gzipSync',
  'indexOfLine',
  'inflateSync',
  'inspect',
  'listen',
  'mmap',
  'nanoseconds',
  'openInEditor',
  'pathToFileURL',
  'peek',
  'randomUUIDv5',
  'randomUUIDv7',
  'readableStreamToArray',
  'readableStreamToArrayBuffer',
  'readableStreamToFormData',
  'resolve',
  'resolveSync',
  'serve',
  'sha',
  'sleep',
  'sleepSync',
  'sliceAnsi',
  'spawn',
  'spawnSync',
  'stringWidth',
  'stripANSI',
  'udpSocket',
  'which',
  'wrapAnsi',
  'write',
  'zstdCompress',
  'zstdCompressSync',
  'zstdDecompress',
  'zstdDecompressSync',
];
const names = new Set(list(catalog.exports).map((entry) => str(obj(entry).name)));
if (core.length !== 49 || core.some((name) => !names.has(name))) throw Error('Prior core 49 missing');
if (list(catalog.failures).length) throw Error('Generator failures remain');
const unresolvedAny = declarations.filter((row) => row.anyReason === 'checker reported any; reason unresolved');
if (unresolvedAny.length) throw Error('Unclassified checker any remains');
const edgeCounts: Record<string, number> = {};
for (const edge of list(catalog.edges).map(obj)) {
  const status = str(edge.resolution);
  edgeCounts[status] = (edgeCounts[status] ?? 0) + 1;
}
console.log(
  JSON.stringify({
    declarations: ids.size,
    localOrigins,
    edges: edgeCounts,
    core: core.length,
    sourceFiles: list(observations.inventory).length,
    dispositionRows: dispositions.length,
  }),
);
