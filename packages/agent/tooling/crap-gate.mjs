import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parse } from '@babel/parser';
import { maintainedSourceInventory } from './maintained-source-inventory.mjs';

const root = process.env.CRAP_GATE_ROOT
  ? path.resolve(process.env.CRAP_GATE_ROOT)
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const coveragePath = path.join(root, 'coverage', 'coverage-final.json');
const fingerprintPath = path.join(root, 'coverage', 'source-fingerprint.v1.json');
const startPath = path.join(root, 'node_modules', '.cache', 'vida-agent', 'coverage-source-start.v1.json');
const bunNativeCoveragePath = path.join(root, 'coverage', 'bun-native', 'coverage-final.json');
const reportPath = path.join(root, 'coverage', 'crap-report.json');
const functionTypes = new Set([
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
  'ObjectMethod',
  'ClassMethod',
  'ClassPrivateMethod',
]);
const decisionTypes = new Set([
  'IfStatement',
  'ConditionalExpression',
  'ForStatement',
  'ForInStatement',
  'ForOfStatement',
  'WhileStatement',
  'DoWhileStatement',
  'CatchClause',
]);

function childNodes(node) {
  return Object.entries(node)
    .filter(([key, value]) => !['loc', 'start', 'end', 'extra'].includes(key) && value && typeof value === 'object')
    .flatMap(([, value]) => (Array.isArray(value) ? value : [value]));
}

function complexityOf(node) {
  let complexity = 1;
  function visit(current) {
    if (!current || typeof current !== 'object') return;
    if (current !== node && functionTypes.has(current.type)) return;
    if (decisionTypes.has(current.type)) complexity += 1;
    if (current.type === 'SwitchCase' && current.test) complexity += 1;
    if (current.type === 'LogicalExpression' && ['&&', '||', '??'].includes(current.operator)) complexity += 1;
    if (current.type === 'AssignmentExpression' && ['&&=', '||=', '??='].includes(current.operator)) complexity += 1;
    childNodes(current).forEach(visit);
  }
  visit(node.body);
  return complexity;
}

function functionInventory(source, file) {
  const ast = parse(source, { sourceType: 'module', plugins: ['typescript'] });
  const rows = [];
  function visit(node) {
    if (!node || typeof node !== 'object') return;
    const isFunction = functionTypes.has(node.type);
    if (isFunction && node.body) {
      rows.push({
        file,
        line: node.loc.start.line,
        column: node.loc.start.column,
        end_line: node.loc.end.line,
        end_column: node.loc.end.column,
        body_line: node.body.loc.start.line,
        body_column: node.body.loc.start.column,
        body_end_line: node.body.loc.end.line,
        body_end_column: node.body.loc.end.column,
        start_offset: node.start,
        end_offset: node.end,
        body_start_offset: node.body.start,
        body_end_offset: node.body.end,
        name: node.id?.name ?? node.key?.name ?? '<anonymous>',
        complexity: complexityOf(node),
      });
    }
    childNodes(node).forEach(visit);
  }
  visit(ast);
  return rows;
}

function fail(reason, details = {}) {
  const report = {
    schema: 'CandidateCrapReport/v1',
    formula: 'complexity^2 * (1-coverage)^3 + complexity',
    required_crap: '<5',
    maximum_complexity: 10,
    status: 'fail',
    reason,
    details,
  };
  return writeReport(report).then(() => {
    process.stderr.write('CRAP gate: ' + reason + '\n');
    process.exit(1);
  });
}

async function writeReport(report) {
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
}

let coverage;
try {
  coverage = JSON.parse(await readFile(coveragePath, 'utf8'));
} catch (error) {
  await fail('missing or invalid coverage/coverage-final.json', { error: String(error) });
}

const inventory = maintainedSourceInventory(root);
const nativeSources = inventory.bunCoverageSources.filter((file) => inventory.typescriptSources.includes(file));
const sources = [...new Set([...inventory.v8CoverageSources, ...nativeSources])].sort();
const evidenceInputs = [
  'package.json',
  'bun.lock',
  '.bun-version',
  'vitest.config.mjs',
  'tooling/coverage-gate.mjs',
  'tooling/maintained-source-inventory.mjs',
  'tooling/v8-coverage.env',
  'tooling/bun-native-coverage.env',
  'tooling/bun-coverage.toml',
  'tooling/bun-native-coverage-preload.mjs',
  'tooling/run-bun-native-coverage.mjs',
];
function globRegex(glob) {
  if (typeof glob !== 'string' || glob.startsWith('/') || glob.includes('..') || glob.includes('\\'))
    throw new Error('unsupported coverage test selector: ' + glob);
  let pattern = '^';
  for (let index = 0; index < glob.length; index++) {
    const char = glob[index];
    if (char === '*' && glob[index + 1] === '*') {
      pattern += glob[index + 2] === '/' ? '(?:.*/)?' : '.*';
      index += glob[index + 2] === '/' ? 2 : 1;
    } else if (char === '*') pattern += '[^/]*';
    else if (char === '?') pattern += '[^/]';
    else pattern += char.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
  }
  return new RegExp(pattern + '$');
}
async function testFiles(directory = 'tests') {
  try {
    const entries = await readdir(path.join(root, directory), { withFileTypes: true });
    const files = await Promise.all(
      entries.map(async (entry) => {
        const name = `${directory}/${entry.name}`;
        return entry.isDirectory() ? testFiles(name) : entry.isFile() ? [name] : [];
      }),
    );
    return files.flat();
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
}
async function selection() {
  let v8 = { include: [], exclude: [], files: [] };
  try {
    await stat(path.join(root, 'vitest.config.mjs'));
    const config = (await import(pathToFileURL(path.join(root, 'vitest.config.mjs')).href)).default;
    const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
    const script = packageJson.scripts?.['test:coverage:pinned'];
    if (typeof script !== 'string') throw new Error('missing test:coverage:pinned selection');
    const include = config.test?.include;
    const configExclude = config.test?.exclude;
    if (!Array.isArray(include) || !Array.isArray(configExclude)) throw new Error('invalid Vitest coverage selection');
    const commandExclude = [...script.matchAll(/--exclude(?:=|\s+)([^\s]+)/g)].map((match) => match[1]);
    const exclude = [...configExclude, ...commandExclude];
    const includes = include.map(globRegex);
    const excludes = exclude.map(globRegex);
    const files = (await testFiles()).filter(
      (file) => includes.some((pattern) => pattern.test(file)) && !excludes.some((pattern) => pattern.test(file)),
    );
    if (!files.length) throw new Error('Vitest coverage selection contains no tests');
    v8 = { include, exclude, files: files.sort() };
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  let bunNative = [];
  const runner = path.join(root, 'tooling', 'run-bun-native-coverage.mjs');
  try {
    await stat(runner);
    const result = spawnSync(process.execPath, [runner, '--list-tests'], { cwd: root, encoding: 'utf8' });
    if (result.status !== 0) throw new Error('cannot resolve Bun native test selection: ' + result.stderr);
    bunNative = JSON.parse(result.stdout);
    if (
      !Array.isArray(bunNative) ||
      !bunNative.length ||
      bunNative.some((file) => typeof file !== 'string' || !file.startsWith('tests/'))
    )
      throw new Error('invalid Bun native test selection');
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  return { v8, bun_native: bunNative };
}
try {
  const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
  const before = JSON.parse(await readFile(startPath, 'utf8'));
  const selected = await selection();
  const inputFiles = [...new Set([...evidenceInputs, ...selected.v8.files, ...selected.bun_native])].sort();
  const native = JSON.parse(await readFile(bunNativeCoveragePath, 'utf8'));
  const expected = {
    schema: 'CoverageSourceFingerprint/v1',
    run_id: before.run_id,
    coverage_sha256: digest(await readFile(coveragePath)),
    summary_sha256: digest(await readFile(path.join(root, 'coverage', 'coverage-summary.json'))),
    sources: await Promise.all(
      sources.map(async (file) => ({ path: file, sha256: digest(await readFile(path.join(root, file))) })),
    ),
    selection: selected,
    inputs: await Promise.all(
      inputFiles.map(async (file) => {
        try {
          return { path: file, sha256: digest(await readFile(path.join(root, file))) };
        } catch {
          return { path: file, sha256: null };
        }
      }),
    ),
    bun_native_coverage_sha256: digest(await readFile(bunNativeCoveragePath)),
  };
  const recorded = JSON.parse(await readFile(fingerprintPath, 'utf8'));
  if (
    typeof before.run_id !== 'string' ||
    native.run_id !== before.run_id ||
    JSON.stringify(recorded) !== JSON.stringify(expected)
  )
    await fail('coverage/source fingerprint mismatch');
} catch (error) {
  await fail('coverage/source fingerprint missing or invalid', { error: String(error) });
}
const nativeCoverageByFile = new Map();
if (nativeSources.length) {
  try {
    const report = JSON.parse(await readFile(bunNativeCoveragePath, 'utf8'));
    const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
    const expectedSources = await Promise.all(
      nativeSources.map(async (file) => ({ path: file, sha256: digest(await readFile(path.join(root, file))) })),
    );
    if (
      report.schema !== 'BunNativeCoverageReport/v1' ||
      JSON.stringify(report.sources) !== JSON.stringify(expectedSources) ||
      !report.coverage ||
      typeof report.coverage !== 'object' ||
      Array.isArray(report.coverage)
    )
      await fail('Bun native coverage/source fingerprint mismatch');
    for (const [file, value] of Object.entries(report.coverage)) {
      const normalized = path.relative(root, path.resolve(file)).replaceAll('\\', '/');
      if (!nativeSources.includes(normalized))
        await fail('Bun native coverage contains unexpected source', { normalized });
      nativeCoverageByFile.set(normalized, value);
    }
  } catch (error) {
    await fail('missing or invalid coverage/bun-native/coverage-final.json', { error: String(error) });
  }
}
const coverageByFile = new Map(
  Object.entries(coverage).map(([file, value]) => [
    path.relative(root, path.resolve(file)).replaceAll('\\', '/'),
    value,
  ]),
);
const rows = [];
const mismatches = [];
function lineOffsets(source) {
  const offsets = [0];
  for (let index = 0; index < source.length; index += 1) {
    if (source.charCodeAt(index) === 10) offsets.push(index + 1);
  }
  return offsets;
}
function coverageOffset(offsets, position) {
  const line = Number(position?.line);
  if (!Number.isSafeInteger(line) || line < 1 || line > offsets.length) return null;
  const column = Number.isSafeInteger(position?.column) ? position.column : 0;
  return offsets[line - 1] + column;
}
function mappingScore(item, entry, offsets) {
  const body = coverageOffset(offsets, entry.loc?.start);
  if (body === null || body < item.start_offset || body > item.end_offset) return null;
  const declaration = coverageOffset(offsets, entry.decl?.start);
  const bodyContained = Number(body >= item.body_start_offset && body <= item.body_end_offset);
  const exactBody = Number(item.body_start_offset === body);
  const declarationContained = Number(
    declaration !== null && declaration >= item.start_offset && declaration <= item.end_offset,
  );
  const sameBodyLine = Number(item.body_line === Number(entry.loc?.start?.line));
  const bodyDistance = body - item.body_start_offset;
  const span = item.body_end_offset - item.body_start_offset;
  return (
    exactBody * 1_000_000_000_000 +
    bodyContained * 500_000_000_000 +
    declarationContained * 100_000_000_000 +
    sameBodyLine * 10_000_000_000 -
    span * 1_000 -
    bodyDistance
  );
}
function mapCoverageFunctions(file, source, inventory, fileCoverage) {
  const offsets = lineOffsets(source);
  const claimed = new Set();
  const mapped = [];
  const unmappedCoverage = [];
  for (const [id, entry] of Object.entries(fileCoverage?.fnMap ?? {})) {
    const candidates = inventory
      .map((item, index) => ({ item, index, score: mappingScore(item, entry, offsets) }))
      .filter((candidate) => candidate.score !== null && !claimed.has(candidate.index))
      .sort((left, right) => right.score - left.score || left.index - right.index);
    if (!candidates.length || (candidates.length > 1 && candidates[0].score === candidates[1].score)) {
      unmappedCoverage.push({
        id,
        name: entry.name,
        decl: entry.decl,
        loc: entry.loc,
        candidate_count: candidates.length,
      });
      continue;
    }
    const selected = candidates[0];
    claimed.add(selected.index);
    mapped.push({
      id,
      item: selected.item,
      covered: Number(fileCoverage?.f?.[id] ?? 0) > 0,
      executions: Number(fileCoverage?.f?.[id] ?? 0),
    });
  }
  const unmappedInventory = inventory
    .map((item, index) => ({ item, index }))
    .filter(({ index }) => !claimed.has(index))
    .map(({ item, index }) => ({ item, index }));
  if (unmappedCoverage.length)
    mismatches.push({
      file,
      inventory_functions: inventory.length,
      coverage_functions: Object.keys(fileCoverage?.fnMap ?? {}).length,
      unmapped_coverage: unmappedCoverage,
    });
  return { mapped, unmappedInventory };
}
function statementOwner(inventory, offset) {
  let owner;
  for (const item of inventory) {
    if (offset >= item.body_start_offset && offset < item.body_end_offset) owner = item;
  }
  return owner;
}
function statementCoverage(inventory, fileCoverage, offsets) {
  const counts = new Map(inventory.map((item) => [item, { total: 0, covered: 0 }]));
  for (const [id, statement] of Object.entries(fileCoverage?.statementMap ?? {})) {
    const offset = coverageOffset(offsets, statement.start);
    const owner = statementOwner(inventory, offset);
    if (!owner) continue;
    const count = counts.get(owner);
    count.total += 1;
    if (Number(fileCoverage.s?.[id] ?? 0) > 0) count.covered += 1;
  }
  return counts;
}
for (const file of sources) {
  const source = await readFile(path.join(root, file), 'utf8');
  const inventory = functionInventory(source, file);
  const fileCoverage = nativeCoverageByFile.get(file) ?? coverageByFile.get(file);
  const coverageFunctions = mapCoverageFunctions(file, source, inventory, fileCoverage);
  const statements = statementCoverage(inventory, fileCoverage, lineOffsets(source));
  coverageFunctions.mapped.forEach(({ item, covered, executions }) => {
    const count = statements.get(item);
    const coverageRatio = count.total ? count.covered / count.total : Number(covered);
    const crap = item.complexity ** 2 * (1 - coverageRatio) ** 3 + item.complexity;
    rows.push({
      ...item,
      covered,
      executions,
      coverage: coverageRatio,
      coverage_source: count.total ? 'v8-statements' : 'v8-function-entry-fallback',
      crap,
    });
  });
  coverageFunctions.unmappedInventory.forEach(({ item }) => {
    rows.push({
      ...item,
      covered: false,
      executions: 0,
      coverage: 0,
      coverage_source: 'missing',
      crap: item.complexity ** 2 + item.complexity,
      coverage_mapping: 'missing',
    });
  });
}
if (mismatches.length)
  await fail('one or more V8 functions cannot be mapped to the source AST', { sources, mismatches });
const failed = rows.filter((row) => !row.covered || row.complexity > 10 || row.crap >= 5);
if (!rows.length || failed.length)
  await fail('one or more maintained functions do not satisfy CRAP <5 and complexity <=10', {
    failed,
    functions: rows,
  });
await writeReport({
  schema: 'CandidateCrapReport/v1',
  formula: 'complexity^2 * (1-coverage)^3 + complexity',
  required_crap: '<5',
  maximum_complexity: 10,
  status: 'pass',
  maintained_sources: sources,
  functions: rows,
});
process.stdout.write(
  'CRAP gate: pass (' + rows.length + ' maintained functions; coverage=100%; CRAP <5; complexity <=10)\n',
);
