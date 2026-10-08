import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parse } from '@babel/parser';
import { maintainedSourceInventory } from './maintained-source-inventory.mjs';
import { isPlainRecord } from '../src/contracts/public-ingress.ts';

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

/** @typedef {{type: string, [key: string]: unknown}} AstNode */
/** @param {unknown} value @returns {value is AstNode} */
function astNode(value) {
  return value !== null && typeof value === 'object' && 'type' in value && typeof value.type === 'string';
}
/** @typedef {{line: number, column: number}} AstPosition */
/** @param {unknown} value @returns {{start: AstPosition, end: AstPosition}} */
function astLocation(value) {
  if (value === null || typeof value !== 'object' || !('start' in value) || !('end' in value))
    throw Error('AST location is absent');
  /** @param {unknown} point @returns {AstPosition} */
  const position = point => {
    if (point === null || typeof point !== 'object' || !('line' in point) || !('column' in point) ||
        typeof point.line !== 'number' || typeof point.column !== 'number' || !Number.isSafeInteger(point.line) ||
        !Number.isSafeInteger(point.column) || point.line < 1 || point.column < 0) throw Error('AST position is invalid');
    return {line: point.line, column: point.column};
  };
  return {start: position(value.start), end: position(value.end)};
}
/** @param {AstNode} node @returns {AstNode[]} */
function childNodes(node) {
  return Object.entries(node)
    .filter(([key, value]) => !['loc', 'start', 'end', 'extra'].includes(key) && value && typeof value === 'object')
    .flatMap(([, value]) => {
      /** @type {readonly unknown[]} */
      const values = Array.isArray(value) ? value : [value];
      return values.filter(astNode);
    });
}

/** @param {AstNode & {body: AstNode}} node @returns {number} */
function complexityOf(node) {
  let complexity = 1;
  /** @param {AstNode} current */
  function visit(current) {
    if (!current || typeof current !== 'object') return;
    if (current !== node && functionTypes.has(current.type)) return;
    if (decisionTypes.has(current.type)) complexity += 1;
    if (current.type === 'SwitchCase' && current.test) complexity += 1;
    if (current.type === 'LogicalExpression' && typeof current.operator === 'string' && ['&&', '||', '??'].includes(current.operator)) complexity += 1;
    if (current.type === 'AssignmentExpression' && typeof current.operator === 'string' && ['&&=', '||=', '??='].includes(current.operator)) complexity += 1;
    childNodes(current).forEach(visit);
  }
  visit(node.body);
  return complexity;
}

/** @typedef {{file: string, line: number, column: number, end_line: number, end_column: number, body_line: number, body_column: number, body_end_line: number, body_end_column: number, start_offset: number, end_offset: number, body_start_offset: number, body_end_offset: number, name: string, complexity: number}} FunctionInventoryRow */
/** @param {string} source @param {string} file @returns {FunctionInventoryRow[]} */
function functionInventory(source, file) {
  const ast = parse(source, { sourceType: 'module', plugins: ['typescript'] });
  /** @type {FunctionInventoryRow[]} */
  const rows = [];
  /** @param {unknown} value @returns {number} */
  const offset = value => {
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 || value > source.length)
      throw Error('AST offset is invalid');
    return value;
  };
  /** @param {AstNode} node */
  function visit(node) {
    const isFunction = functionTypes.has(node.type);
    if (isFunction && astNode(node.body)) {
      const location = astLocation(node.loc), bodyLocation = astLocation(node.body.loc);
      rows.push({
        file,
        line: location.start.line,
        column: location.start.column,
        end_line: location.end.line,
        end_column: location.end.column,
        body_line: bodyLocation.start.line,
        body_column: bodyLocation.start.column,
        body_end_line: bodyLocation.end.line,
        body_end_column: bodyLocation.end.column,
        start_offset: offset(node.start),
        end_offset: offset(node.end),
        body_start_offset: offset(node.body.start),
        body_end_offset: offset(node.body.end),
        name: astNode(node.id) && typeof node.id.name === 'string' ? node.id.name
          : astNode(node.key) && typeof node.key.name === 'string' ? node.key.name : '<anonymous>',
        complexity: complexityOf({...node, body: node.body}),
      });
    }
    childNodes(node).forEach(visit);
  }
  if (!astNode(ast)) throw Error('Parser returned no AST node');
  visit(ast);
  return rows;
}

/** @param {string} reason @param {unknown} [details] @returns {Promise<never>} */
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

/** @param {unknown} report @returns {Promise<void>} */
async function writeReport(report) {
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
}

/** @typedef {{start?: AstPosition, end?: AstPosition}} CoverageLocation */
/** @typedef {{name?: string, loc?: CoverageLocation, decl?: CoverageLocation}} CoverageFunction */
/** @typedef {{fnMap?: Record<string, CoverageFunction>, f?: Record<string, number>, statementMap?: Record<string, CoverageLocation>, s?: Record<string, number>}} FileCoverage */
/** @param {unknown} value @returns {Record<string, FileCoverage>} */
function coverageMap(value) {
  if (!isPlainRecord(value)) throw Error('Coverage map must be an object');
  /** @type {Record<string, FileCoverage>} */
  const result = {};
  /** @param {unknown} value @param {string} field @returns {CoverageLocation} */
  const location = (value, field) => {
    if (!isPlainRecord(value) || value.start === undefined) throw Error(`Coverage location requires a start: ${field}`);
    /** @type {CoverageLocation} */
    const result = {};
    for (const key of ['start', 'end']) if (value[key] !== undefined) {
      const point = value[key];
      if (!isPlainRecord(point) || typeof point.line !== 'number' || typeof point.column !== 'number'
        || !Number.isSafeInteger(point.line) || point.line < 1
        || !Number.isSafeInteger(point.column) || point.column < 0)
        throw Error(`Coverage position is invalid: ${field}.${key}`);
      const position = {line: point.line, column: point.column};
      if (key === 'start') result.start = position; else result.end = position;
    }
    return result;
  };
  for (const [file, entry] of Object.entries(value)) {
    if (!isPlainRecord(entry)) throw Error('File coverage must be an object');
    /** @type {FileCoverage} */
    const decoded = {};
    for (const key of ['f', 's']) if (entry[key] !== undefined) {
      const counters = entry[key];
      if (!isPlainRecord(counters)) throw Error('Coverage counters must be an object');
      /** @type {Record<string, number>} */
      const numbers = {};
      for (const [id, count] of Object.entries(counters)) {
        if (typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0)
          throw Error(`Coverage counter is invalid: ${file}.${key}.${id}`);
        numbers[id] = count;
      }
      if (key === 'f') decoded.f = numbers; else decoded.s = numbers;
    }
    if (entry.fnMap !== undefined) {
      if (!isPlainRecord(entry.fnMap)) throw Error('Coverage function map must be an object');
      decoded.fnMap = {};
      for (const [id, fn] of Object.entries(entry.fnMap)) {
        if (!isPlainRecord(fn) || (fn.name !== undefined && typeof fn.name !== 'string')) throw Error('Coverage function is invalid');
        decoded.fnMap[id] = {...(typeof fn.name === 'string' ? {name: fn.name} : {}),
          ...(fn.loc === undefined ? {} : {loc: location(fn.loc, `${file}.fnMap.${id}.loc`)}),
          ...(fn.decl === undefined ? {} : {decl: location(fn.decl, `${file}.fnMap.${id}.decl`)})};
      }
    }
    if (entry.statementMap !== undefined) {
      if (!isPlainRecord(entry.statementMap)) throw Error('Coverage statement map must be an object');
      decoded.statementMap = {};
      for (const [id, statement] of Object.entries(entry.statementMap))
        decoded.statementMap[id] = location(statement, `${file}.statementMap.${id}`);
    }
    result[file] = decoded;
  }
  return result;
}
/** @type {Record<string, FileCoverage>} */
let coverage = {};
try {
  coverage = coverageMap(JSON.parse(await readFile(coveragePath, 'utf8')));
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
/** @param {string} glob @returns {RegExp} */
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
/** @param {string} [directory] @returns {Promise<string[]>} */
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
    if (error !== null && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return [];
    throw error;
  }
}
/** @param {unknown} value @returns {string[]} */
function stringList(value) {
  if (!Array.isArray(value)) throw Error('Test selection must be an array');
  /** @type {readonly unknown[]} */
  const items = value;
  if (!items.every((item) => typeof item === 'string')) throw Error('Test selection contains a non-string value');
  return [...items];
}
async function selection() {
  /** @type {{include: string[], exclude: string[], files: string[]}} */
  let v8 = { include: [], exclude: [], files: [] };
  try {
    await stat(path.join(root, 'vitest.config.mjs'));
    /** @type {unknown} */
    const module = await import(pathToFileURL(path.join(root, 'vitest.config.mjs')).href);
    if (!isPlainRecord(module)) throw Error('Coverage selection module is invalid');
    const config = module.default;
    /** @type {unknown} */
    const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
    if (!isPlainRecord(config) || !isPlainRecord(config.test) || !isPlainRecord(packageJson) || !isPlainRecord(packageJson.scripts))
      throw Error('Coverage selection configuration is invalid');
    const script = packageJson.scripts['test:coverage:pinned'];
    if (typeof script !== 'string') throw new Error('missing test:coverage:pinned selection');
    const include = stringList(config.test.include);
    const configExclude = stringList(config.test.exclude);
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
    if (error === null || typeof error !== 'object' || !('code' in error) || error.code !== 'ENOENT') throw error;
  }
  /** @type {string[]} */
  let bunNative = [];
  const runner = path.join(root, 'tooling', 'run-bun-native-coverage.mjs');
  try {
    await stat(runner);
    const result = spawnSync(process.execPath, [runner, '--list-tests'], { cwd: root, encoding: 'utf8' });
    if (result.status !== 0) throw new Error('cannot resolve Bun native test selection: ' + result.stderr);
    bunNative = stringList(JSON.parse(result.stdout));
    if (
      !Array.isArray(bunNative) ||
      !bunNative.length ||
      bunNative.some((file) => typeof file !== 'string' || !file.startsWith('tests/'))
    )
      throw new Error('invalid Bun native test selection');
  } catch (error) {
    if (error === null || typeof error !== 'object' || !('code' in error) || error.code !== 'ENOENT') throw error;
  }
  return { v8, bun_native: bunNative };
}
try {
  /** @param {Parameters<ReturnType<typeof createHash>['update']>[0]} bytes */
  const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
  /** @type {unknown} */
  const before = JSON.parse(await readFile(startPath, 'utf8'));
  if (!isPlainRecord(before) || typeof before.run_id !== 'string') throw Error('Coverage start binding is invalid');
  const selected = await selection();
  const inputFiles = [...new Set([...evidenceInputs, ...selected.v8.files, ...selected.bun_native])].sort();
  /** @type {unknown} */
  const native = JSON.parse(await readFile(bunNativeCoveragePath, 'utf8'));
  if (!isPlainRecord(native)) throw Error('Native coverage binding is invalid');
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
  /** @type {unknown} */
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
/** @type {Map<string, FileCoverage>} */
const nativeCoverageByFile = new Map();
if (nativeSources.length) {
  try {
    /** @type {unknown} */
    const report = JSON.parse(await readFile(bunNativeCoveragePath, 'utf8'));
    if (!isPlainRecord(report)) throw Error('Bun native coverage report must be an object');
    /** @param {Parameters<ReturnType<typeof createHash>['update']>[0]} bytes */
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
    for (const [file, value] of Object.entries(coverageMap(report.coverage))) {
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
/** @type {(FunctionInventoryRow & {covered: boolean, executions: number, coverage: number, coverage_source: string, crap: number, coverage_mapping?: string})[]} */
const rows = [];
/** @type {unknown[]} */
const mismatches = [];
/** @param {string} source @returns {number[]} */
function lineOffsets(source) {
  const offsets = [0];
  for (let index = 0; index < source.length; index += 1) {
    if (source.charCodeAt(index) === 10) offsets.push(index + 1);
  }
  return offsets;
}
/** @param {readonly number[]} offsets @param {{line?: unknown, column?: unknown} | null | undefined} position @param {number} sourceLength @returns {number | null} */
function coverageOffset(offsets, position, sourceLength) {
  const line = position?.line, column = position?.column;
  if (typeof line !== 'number' || !Number.isSafeInteger(line) || line < 1 || line > offsets.length
    || typeof column !== 'number' || !Number.isSafeInteger(column) || column < 0) return null;
  const lineEnd = line < offsets.length ? offsets[line] - 1 : sourceLength;
  const offset = offsets[line - 1] + column;
  return offset <= lineEnd ? offset : null;
}
/** @param {FunctionInventoryRow} item @param {{loc?: {start?: AstPosition}, decl?: {start?: AstPosition}}} entry @param {readonly number[]} offsets @param {number} sourceLength @returns {number | null} */
function mappingScore(item, entry, offsets, sourceLength) {
  const body = coverageOffset(offsets, entry.loc?.start, sourceLength);
  if (body === null || body < item.start_offset || body > item.end_offset) return null;
  const declaration = coverageOffset(offsets, entry.decl?.start, sourceLength);
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
/** @param {string} file @param {string} source @param {readonly FunctionInventoryRow[]} inventory @param {FileCoverage | undefined} fileCoverage */
function mapCoverageFunctions(file, source, inventory, fileCoverage) {
  const offsets = lineOffsets(source);
  const claimed = new Set();
  const mapped = [];
  const unmappedCoverage = [];
  for (const [id, entry] of Object.entries(fileCoverage?.fnMap ?? {})) {
    const candidates = inventory
      .flatMap((item, index) => {
        const score = mappingScore(item, entry, offsets, source.length);
        return score === null || claimed.has(index) ? [] : [{item, index, score}];
      })
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
/** @param {readonly FunctionInventoryRow[]} inventory @param {number | null} offset @returns {FunctionInventoryRow | undefined} */
function statementOwner(inventory, offset) {
  if (offset === null) return undefined;
  let owner;
  for (const item of inventory) {
    if (offset >= item.body_start_offset && offset < item.body_end_offset) owner = item;
  }
  return owner;
}
/** @param {readonly FunctionInventoryRow[]} inventory @param {FileCoverage | undefined} fileCoverage @param {readonly number[]} offsets @param {number} sourceLength */
function statementCoverage(inventory, fileCoverage, offsets, sourceLength) {
  const counts = new Map(inventory.map((item) => [item, { total: 0, covered: 0 }]));
  for (const [id, statement] of Object.entries(fileCoverage?.statementMap ?? {})) {
    const offset = coverageOffset(offsets, statement.start, sourceLength);
    const owner = statementOwner(inventory, offset);
    if (!owner) continue;
    const count = counts.get(owner);
    if (!count) throw Error('Statement coverage owner is outside the function inventory');
    count.total += 1;
    if (Number(fileCoverage?.s?.[id] ?? 0) > 0) count.covered += 1;
  }
  return counts;
}
for (const file of sources) {
  const source = await readFile(path.join(root, file), 'utf8');
  const inventory = functionInventory(source, file);
  const fileCoverage = nativeCoverageByFile.get(file) ?? coverageByFile.get(file);
  const offsets = lineOffsets(source);
  const locations = [
    ...Object.entries(fileCoverage?.statementMap ?? {}).map(([id, loc]) => ({field: `statementMap.${id}`, loc})),
    ...Object.entries(fileCoverage?.fnMap ?? {}).flatMap(([id, fn]) => [
      ...(fn.loc ? [{field: `fnMap.${id}.loc`, loc: fn.loc}] : []),
      ...(fn.decl ? [{field: `fnMap.${id}.decl`, loc: fn.decl}] : []),
    ]),
  ];
  for (const {field, loc} of locations) {
    if (coverageOffset(offsets, loc.start, source.length) === null ||
      (loc.end !== undefined && coverageOffset(offsets, loc.end, source.length) === null))
      await fail('invalid coverage source location', {file, field});
  }
  const coverageFunctions = mapCoverageFunctions(file, source, inventory, fileCoverage);
  const statements = statementCoverage(inventory, fileCoverage, offsets, source.length);
  coverageFunctions.mapped.forEach(({ item, covered, executions }) => {
    const count = statements.get(item);
    if (!count) throw Error('Mapped function is outside the statement inventory');
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
