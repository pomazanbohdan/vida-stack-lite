import { spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { bunCoverageSources as bunRequiredSources, maintainedSourceInventory } from './maintained-source-inventory.mjs';

const root = process.env.COVERAGE_GATE_ROOT
  ? path.resolve(process.env.COVERAGE_GATE_ROOT)
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const summaryPath = path.join(root, 'coverage', 'coverage-summary.json');
const v8Path = path.join(root, 'coverage', 'coverage-final.json');
const fingerprintPath = path.join(root, 'coverage', 'source-fingerprint.v1.json');
const startPath = path.join(root, 'node_modules', '.cache', 'vida-agent', 'coverage-source-start.v1.json');
const bunLcovPath = path.join(root, 'coverage', 'bun', 'lcov.info');
const bunNativeCoveragePath = path.join(root, 'coverage', 'bun-native', 'coverage-final.json');
const metricNames = ['lines', 'statements', 'functions', 'branches'];
function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

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
async function sourceEntries() {
  const inventory = maintainedSourceInventory(root);
  const maintained = [
    ...new Set([
      ...inventory.v8CoverageSources,
      ...inventory.bunCoverageSources.filter((file) => inventory.typescriptSources.includes(file)),
    ]),
  ].sort();
  return Promise.all(
    maintained.map(async (file) => ({ path: file, sha256: sha256(await readFile(path.join(root, file))) })),
  );
}

async function inputEntries(selected) {
  selected ??= await selection();
  const files = [...new Set([...evidenceInputs, ...selected.v8.files, ...selected.bun_native])].sort();
  return Promise.all(
    files.map(async (file) => {
      try {
        return { path: file, sha256: sha256(await readFile(path.join(root, file))) };
      } catch {
        return { path: file, sha256: null };
      }
    }),
  );
}

async function sourceFingerprint(requireNative = false) {
  const selected = await selection();
  const before = JSON.parse(await readFile(startPath, 'utf8'));
  const fingerprint = {
    schema: 'CoverageSourceFingerprint/v1',
    run_id: before.run_id,
    coverage_sha256: sha256(await readFile(v8Path)),
    summary_sha256: sha256(await readFile(summaryPath)),
    sources: await sourceEntries(),
    selection: selected,
    inputs: await inputEntries(selected),
  };
  if (requireNative) fingerprint.bun_native_coverage_sha256 = sha256(await readFile(bunNativeCoveragePath));
  return fingerprint;
}

if (process.argv[2] === '--begin-v8') {
  const selected = await selection();
  await mkdir(path.dirname(startPath), { recursive: true });
  await writeFile(
    startPath,
    JSON.stringify({
      run_id: randomUUID(),
      sources: await sourceEntries(),
      selection: selected,
      inputs: await inputEntries(selected),
    }) + '\n',
  );
  process.exit(0);
}

if (process.argv[2] === '--stamp-v8') {
  const before = JSON.parse(await readFile(startPath, 'utf8'));
  const selected = await selection();
  if (JSON.stringify(before.sources) !== JSON.stringify(await sourceEntries()))
    throw new Error('coverage/source fingerprint mismatch: source changed during V8 collection');
  if (
    JSON.stringify(before.selection) !== JSON.stringify(selected) ||
    JSON.stringify(before.inputs) !== JSON.stringify(await inputEntries(selected))
  )
    throw new Error('coverage/source fingerprint mismatch: coverage input changed during collection');
  const coverageTime = (await stat(v8Path)).mtimeMs;
  if (coverageTime < (await stat(startPath)).mtimeMs)
    throw new Error('coverage/source fingerprint mismatch: V8 artifact predates collection');
  const inventory = maintainedSourceInventory(root);
  const maintained = [
    ...new Set([
      ...inventory.v8CoverageSources,
      ...inventory.bunCoverageSources.filter((file) => inventory.typescriptSources.includes(file)),
    ]),
  ].sort();
  for (const file of maintained) {
    if ((await stat(path.join(root, file))).mtimeMs > coverageTime)
      throw new Error('coverage/source fingerprint mismatch: source changed after V8 collection: ' + file);
  }
  await writeFile(fingerprintPath, JSON.stringify(await sourceFingerprint(), null, 2) + '\n');
  process.exit(0);
}

if (process.argv[2] === '--stamp-native') {
  const before = JSON.parse(await readFile(startPath, 'utf8'));
  const selected = await selection();
  if (
    JSON.stringify(before.sources) !== JSON.stringify(await sourceEntries()) ||
    JSON.stringify(before.selection) !== JSON.stringify(selected) ||
    JSON.stringify(before.inputs) !== JSON.stringify(await inputEntries(selected))
  )
    throw new Error('coverage/source fingerprint mismatch: coverage input changed during collection');
  const native = JSON.parse(await readFile(bunNativeCoveragePath, 'utf8'));
  if (typeof before.run_id !== 'string' || native.run_id !== before.run_id)
    throw new Error('coverage/source fingerprint mismatch: stale Bun native coverage report');
  if ((await stat(bunNativeCoveragePath)).mtimeMs < (await stat(startPath)).mtimeMs)
    throw new Error('coverage/source fingerprint mismatch: Bun native artifact predates collection');
  await writeFile(fingerprintPath, JSON.stringify(await sourceFingerprint(true), null, 2) + '\n');
  process.exit(0);
}

function fail(reason, details = {}) {
  process.stdout.write(
    JSON.stringify(
      {
        schema: 'CandidateCoverageReport/v1',
        required: {
          vitest: { lines: 1, statements: 1, functions: 1, branches: 1, per_file: true },
          bun: { lines: 1, functions: 1, per_file: true, sources: bunRequiredSources },
        },
        status: 'gap',
        gap: 'GAP-RTNEW-COVERAGE-COMPLETE-001',
        reason,
        details,
      },
      null,
      2,
    ) + '\n',
  );
  process.exit(1);
}

let summary;
try {
  summary = JSON.parse(await readFile(summaryPath, 'utf8'));
} catch (error) {
  fail('missing or invalid ' + path.relative(root, summaryPath), { error: String(error) });
}

let bunLcov;
try {
  bunLcov = await readFile(bunLcovPath, 'utf8');
} catch (error) {
  fail('missing or invalid ' + path.relative(root, bunLcovPath), { error: String(error) });
}

const inventory = maintainedSourceInventory(root);
const maintained = inventory.v8CoverageSources;
if (inventory.missingBunCoverageSources.length)
  fail('required Bun coverage sources are absent from packaged production source', {
    missing: inventory.missingBunCoverageSources,
  });
const nativeSources = bunRequiredSources.filter((file) => inventory.typescriptSources.includes(file));

function normalizedCoveragePath(file) {
  return path.relative(root, path.resolve(file)).replaceAll('\\', '/');
}

async function nativeSourceEntries() {
  return Promise.all(
    nativeSources.map(async (file) => ({ path: file, sha256: sha256(await readFile(path.join(root, file))) })),
  );
}

let bunNativeCoverage = null;
const bunNativeRecords = new Map();
if (nativeSources.length) {
  try {
    bunNativeCoverage = JSON.parse(await readFile(bunNativeCoveragePath, 'utf8'));
  } catch (error) {
    fail('missing or invalid ' + path.relative(root, bunNativeCoveragePath), { error: String(error) });
  }
  const nativeExpectedSources = await nativeSourceEntries();
  if (
    bunNativeCoverage.schema !== 'BunNativeCoverageReport/v1' ||
    bunNativeCoverage.run_id !== JSON.parse(await readFile(startPath, 'utf8')).run_id ||
    JSON.stringify(bunNativeCoverage.sources) !== JSON.stringify(nativeExpectedSources) ||
    !bunNativeCoverage.coverage ||
    typeof bunNativeCoverage.coverage !== 'object' ||
    Array.isArray(bunNativeCoverage.coverage)
  )
    fail('Bun native coverage/source fingerprint mismatch');
  for (const [file, value] of Object.entries(bunNativeCoverage.coverage))
    bunNativeRecords.set(normalizedCoveragePath(file), value);
}

try {
  const recorded = JSON.parse(await readFile(fingerprintPath, 'utf8'));
  if (JSON.stringify(recorded) !== JSON.stringify(await sourceFingerprint(true)))
    fail('coverage/source fingerprint mismatch');
} catch (error) {
  fail('coverage/source fingerprint missing or invalid', { error: String(error) });
}

function integerField(record, name) {
  const matches = [...record.matchAll(new RegExp('^' + name + ':(\\d+)$', 'gm'))];
  if (matches.length !== 1) return null;
  const value = Number(matches[0][1]);
  return Number.isSafeInteger(value) ? value : null;
}

function bunCoverageRecords(lcov) {
  const records = new Map();
  for (const rawRecord of lcov.replaceAll('\r', '').split(/^end_of_record\s*$/m)) {
    const sourceMatch = rawRecord.match(/^SF:(.+)$/m);
    if (!sourceMatch) continue;
    const rawSource = sourceMatch[1].trim();
    const source = path
      .relative(root, path.isAbsolute(rawSource) ? rawSource : path.resolve(root, rawSource))
      .replaceAll('\\', '/');
    if (records.has(source)) fail('Bun LCOV contains duplicate source records', { source });
    const da = [...rawRecord.matchAll(/^DA:(\d+),(\d+)(?:,.*)?$/gm)].map((match) => ({
      line: Number(match[1]),
      hits: Number(match[2]),
    }));
    const lineIdentities = new Set(da.map((entry) => entry.line));
    const value = {
      functions: { total: integerField(rawRecord, 'FNF'), covered: integerField(rawRecord, 'FNH') },
      lines: { total: integerField(rawRecord, 'LF'), covered: integerField(rawRecord, 'LH') },
      observed_lines: da.length,
      observed_covered_lines: da.filter((entry) => entry.hits > 0).length,
      duplicate_lines: da.length - lineIdentities.size,
    };
    records.set(source, value);
  }
  return records;
}

const bunRecords = bunCoverageRecords(bunLcov);

const reportFiles = Object.entries(summary)
  .filter(([name]) => name !== 'total')
  .map(([name, metrics]) => [path.relative(root, path.resolve(name)).replaceAll('\\', '/'), metrics]);
const reportMap = new Map(reportFiles);
const missing = maintained.filter((name) => !reportMap.has(name));
const unexpected = reportFiles
  .map(([name]) => name)
  .filter((name) => (name.startsWith('src/') || name.startsWith('bin/')) && !maintained.includes(name));
if (missing.length || unexpected.length)
  fail('coverage source inventory mismatch', { maintained, missing, unexpected });

const failures = [];
function exactNativeCounters(file, native) {
  const failures = [];
  for (const [mapName, counterName] of [
    ['statementMap', 's'],
    ['fnMap', 'f'],
    ['branchMap', 'b'],
  ]) {
    const map = native[mapName];
    const counters = native[counterName];
    if (
      !map ||
      typeof map !== 'object' ||
      Array.isArray(map) ||
      !counters ||
      typeof counters !== 'object' ||
      Array.isArray(counters)
    ) {
      failures.push({ file, metric: counterName, reason: 'map or counter is invalid' });
      continue;
    }
    const mapIds = Object.keys(map).sort();
    const counterIds = Object.keys(counters).sort();
    if (!mapIds.length) {
      failures.push({ file, metric: counterName, reason: 'map is empty' });
      continue;
    }
    if (JSON.stringify(mapIds) !== JSON.stringify(counterIds)) {
      failures.push({
        file,
        metric: counterName,
        reason: 'counter keys do not match map keys',
        map_ids: mapIds,
        counter_ids: counterIds,
      });
      continue;
    }
    for (const id of mapIds) {
      const counter = counters[id];
      if (mapName === 'branchMap') {
        const locations = map[id]?.locations;
        if (!Array.isArray(locations) || !Array.isArray(counter) || counter.length !== locations.length) {
          failures.push({
            file,
            metric: counterName,
            id,
            reason: 'branch counter cardinality does not match locations',
          });
          continue;
        }
        if (counter.some((count) => !Number.isSafeInteger(count) || count < 1))
          failures.push({ file, metric: counterName, id, reason: 'branch counter is not positive', value: counter });
      } else if (!Number.isSafeInteger(counter) || counter < 1) {
        failures.push({ file, metric: counterName, id, reason: 'counter is not positive', value: counter });
      }
    }
  }
  return failures;
}
for (const file of maintained) {
  const metrics = reportMap.get(file);
  for (const metric of metricNames) {
    const value = metrics?.[metric];
    if (!value || value.covered !== value.total || value.pct !== 100)
      failures.push({ file, metric, value: value ?? null });
  }
}
for (const file of bunRequiredSources) {
  const value = bunRecords.get(file);
  if (!value) {
    failures.push({ lane: 'bun', file, metric: 'source', value: null });
    continue;
  }
  if (
    value.duplicate_lines !== 0 ||
    value.lines.total === null ||
    value.lines.covered === null ||
    value.lines.total !== value.observed_lines ||
    value.lines.covered !== value.observed_covered_lines
  ) {
    failures.push({ lane: 'bun', file, metric: 'lcov-integrity', value });
  }
  for (const metric of ['lines', 'functions']) {
    const metricValue = value[metric];
    if (metricValue.total === null || metricValue.total < 1 || metricValue.covered !== metricValue.total)
      failures.push({ lane: 'bun', file, metric, value: metricValue });
  }
  const native = bunNativeRecords.get(file);
  if (!native) {
    failures.push({ lane: 'bun-native', file, metric: 'source', value: null });
    continue;
  }
  failures.push(...exactNativeCounters(file, native).map((failure) => ({ lane: 'bun-native', ...failure })));
}
const nativeUnexpected = [...bunNativeRecords.keys()].filter((file) => !nativeSources.includes(file));
if (nativeUnexpected.length) failures.push({ lane: 'bun-native', metric: 'unexpected', value: nativeUnexpected });
for (const metric of metricNames) {
  const value = summary.total?.[metric];
  if (!value || value.total < 1 || value.covered !== value.total || value.pct !== 100)
    failures.push({ file: 'total', metric, value: value ?? null });
}
if (failures.length)
  fail('coverage is below exact 100% for maintained source', {
    failures,
    lanes: { vitest: summary.total, bun: Object.fromEntries(bunRecords), bun_native: bunNativeCoverage },
  });

process.stdout.write(
  JSON.stringify(
    {
      schema: 'CandidateCoverageReport/v1',
      required: {
        vitest: { lines: 1, statements: 1, functions: 1, branches: 1, per_file: true },
        bun: { lines: 1, functions: 1, per_file: true, sources: bunRequiredSources },
        bun_native: { statements: 1, functions: 1, branches: 1, per_file: true, sources: bunRequiredSources },
      },
      status: 'pass',
      gap: null,
      maintained_sources: maintained,
      metrics: { vitest: summary.total, bun: Object.fromEntries(bunRecords), bun_native: bunNativeCoverage },
    },
    null,
    2,
  ) + '\n',
);
