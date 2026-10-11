import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parse } from '@babel/parser';
import { fileURLToPath, pathToFileURL } from 'node:url';

const adapterSource = fileURLToPath(new URL('./mutation-test-adapter.ts', import.meta.url));
const adapterTemplate = readFileSync(adapterSource, 'utf8');
const bodyReceiptFile = process.env.AGENT_MUTATION_BODY_RECEIPTS;
const adapterDirectorySetting = process.env.AGENT_MUTATION_ADAPTER_DIRECTORY;
delete process.env.AGENT_MUTATION_BODY_RECEIPTS;
delete process.env.AGENT_MUTATION_ADAPTER_DIRECTORY;

function requiredAdapterDirectory(): string {
  const value = adapterDirectorySetting;
  if (!value) throw new Error('Mutation adapter directory is not configured.');
  return value;
}

const adapterDirectory = requiredAdapterDirectory();
if (!bodyReceiptFile) throw new Error('Mutation body receipt channel is not configured.');
mkdirSync(adapterDirectory, { recursive: true, mode: 0o700 });
const contextPath = path.join(adapterDirectory, 'mutation-assertion-context.ts');
writeBoundAdapterModule(
  contextPath,
  readFileSync(fileURLToPath(new URL('./mutation-assertion-context.ts', import.meta.url)), 'utf8'),
);
const contextUrl = pathToFileURL(contextPath).href;
const escapedTestRoot = path
  .resolve(process.cwd(), 'tests')
  .replaceAll('\\', '/')
  .split('/')
  .map((segment) => segment.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'))
  .join('[\\\\/]');
const testPath = new RegExp(`^${escapedTestRoot}[\\\\/].*$`, process.platform === 'win32' ? 'iu' : 'u');

function writeBoundAdapterModule(modulePath: string, contents: string): void {
  try {
    writeFileSync(modulePath, contents, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
  } catch (error) {
    if (!error || typeof error !== 'object' || !('code' in error) || error.code !== 'EEXIST') throw error;
    if (readFileSync(modulePath, 'utf8') !== contents)
      throw new Error('Mutation adapter wrapper changed during module load.');
  }
}

function adapterFor(testFile: string): string {
  const adapterPath = path.join(adapterDirectory, `${createHash('sha256').update(testFile).digest('hex')}.ts`);
  const contents = adapterTemplate
    .replace("'./mutation-assertion-context.ts'", JSON.stringify(contextUrl))
    .replace(
      "const file = new URL(import.meta.url).searchParams.get('file');",
      `const file = ${JSON.stringify(testFile)};`,
    )
    .replace(
      'const receiptFile = process.env.AGENT_MUTATION_BODY_RECEIPTS;',
      `const receiptFile = ${JSON.stringify(bodyReceiptFile)};`,
    );
  writeBoundAdapterModule(adapterPath, contents);
  return pathToFileURL(adapterPath).href;
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function rewriteTestImports(source: string, testFile: string, adapterUrl: string): string {
  const tree: unknown = parse(source, { sourceType: 'unambiguous', plugins: ['typescript', 'jsx'] });
  if (!record(tree) || !record(tree.program) || !Array.isArray(tree.program.body))
    throw new Error(`Mutation preflight could not parse ${testFile}.`);
  const replacements: { start: number; end: number }[] = [];
  for (const entry of tree.program.body) {
    if (!record(entry)) continue;
    const isImport = entry.type === 'ImportDeclaration';
    const isExport = entry.type === 'ExportNamedDeclaration' || entry.type === 'ExportAllDeclaration';
    if (!isImport && !isExport) continue;
    const sourceNode = entry.source;
    if (!record(sourceNode) || typeof sourceNode.value !== 'string') continue;
    const specifier = sourceNode.value;
    if (specifier === 'vitest' || specifier === 'node:assert')
      throw new Error(`Mutation body adapter has no causal wrapper for ${specifier} in ${testFile}.`);
    if (specifier !== 'bun:test' && specifier !== 'node:assert/strict') continue;
    if (isExport) throw new Error(`Mutation body adapter cannot bind re-exported assertions in ${testFile}.`);
    const imports = entry.specifiers;
    if (!Array.isArray(imports)) throw new Error(`Mutation preflight found an invalid import in ${testFile}.`);
    for (const imported of imports) {
      if (!record(imported)) throw new Error(`Mutation preflight found an invalid import in ${testFile}.`);
      if (specifier === 'bun:test' && imported.type === 'ImportDefaultSpecifier')
        throw new Error(`Mutation body adapter cannot wrap a default bun:test import in ${testFile}.`);
      if (specifier === 'node:assert/strict' && imported.type !== 'ImportDefaultSpecifier')
        throw new Error(`Mutation body adapter requires a default node:assert/strict import in ${testFile}.`);
    }
    if (typeof sourceNode.start !== 'number' || typeof sourceNode.end !== 'number')
      throw new Error(`Mutation preflight found an unbound import in ${testFile}.`);
    replacements.push({ start: sourceNode.start, end: sourceNode.end });
  }
  if (/\b(?:import\s*\(|require\s*\()\s*(['"])(?:bun:test|vitest|node:assert(?:\/strict)?)\1/u.test(source))
    throw new Error(`Mutation body adapter cannot wrap dynamic test imports in ${testFile}.`);
  if (/\b[A-Za-z_$][\w$]*\.(?:extend|soft)\s*\(/u.test(source))
    throw new Error(`Mutation body adapter does not support custom or soft matchers in ${testFile}.`);
  let rewritten = source;
  for (const replacement of replacements.sort((left, right) => right.start - left.start))
    rewritten = `${rewritten.slice(0, replacement.start)}${JSON.stringify(adapterUrl)}${rewritten.slice(replacement.end)}`;
  return rewritten;
}

Bun.plugin({
  name: 'agent-mutation-body-attribution',
  setup(build) {
    build.onLoad({ filter: testPath }, ({ path: sourcePath }) => {
      const testFile = path.resolve(sourcePath);
      const testKey = path.relative(process.cwd(), testFile).replaceAll('\\', '/');
      if (!testKey.startsWith('tests/')) throw new Error('Mutation loader escaped its owned test root.');
      return Bun.file(testFile)
        .text()
        .then((source) => {
          const rewritten = rewriteTestImports(source, testKey, adapterFor(testKey));
          const extension = path.extname(testFile);
          const loader = extension === '.ts' || extension === '.mts' ? 'ts' : extension === '.tsx' ? 'tsx' : 'js';
          return { contents: rewritten, loader };
        });
    });
  },
});
