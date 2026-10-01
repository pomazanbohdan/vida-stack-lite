import { createConsumerFixture } from './helpers/consumer-fixture.mjs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { afterAll, test } from 'bun:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { loadProjectContext } from '../src/config/project-context.ts';
import { loadRuntimeConfig } from '../src/config/runtime-config.ts';
import { createConfiguredProjectAuthorizer } from '../src/authorization/cedar-boundary.ts';
import { invokeTimed } from '../src/runtime-timing.ts';
import { checkManifest, readPin } from '../bin/bun.mjs';
import { initializeProject } from '../bin/init.mjs';
import { maintainedSourceInventory } from '../tooling/maintained-source-inventory.mjs';

const candidateRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
function runFixtureCoverageGate(directory, mode) {
  const result = spawnSync(process.execPath, [path.join(candidateRoot, 'tooling', 'coverage-gate.mjs'), mode], {
    cwd: candidateRoot,
    encoding: 'utf8',
    env: { ...process.env, COVERAGE_GATE_ROOT: directory },
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
}
function stampFixtureCoverage(directory, { nativeReport = true } = {}) {
  const packagePath = path.join(directory, 'package.json');
  if (!existsSync(packagePath)) writeFileSync(packagePath, JSON.stringify({ files: ['src/**'], bin: {} }));
  const coverageDirectory = path.join(directory, 'coverage');
  const summaryPath = path.join(coverageDirectory, 'coverage-summary.json');
  if (!existsSync(summaryPath)) writeFileSync(summaryPath, '{}');
  runFixtureCoverageGate(directory, '--begin-v8');
  const coveragePath = path.join(coverageDirectory, 'coverage-final.json');
  writeFileSync(coveragePath, readFileSync(coveragePath));
  runFixtureCoverageGate(directory, '--stamp-v8');
  if (nativeReport) {
    const start = JSON.parse(
      readFileSync(
        path.join(directory, 'node_modules', '.cache', 'vida-agent', 'coverage-source-start.v1.json'),
        'utf8',
      ),
    );
    const nativeDirectory = path.join(coverageDirectory, 'bun-native');
    mkdirSync(nativeDirectory, { recursive: true });
    writeFileSync(
      path.join(nativeDirectory, 'coverage-final.json'),
      JSON.stringify({ schema: 'BunNativeCoverageReport/v1', run_id: start.run_id, sources: [], coverage: {} }),
    );
    runFixtureCoverageGate(directory, '--stamp-native');
  }
}
const repositoryRoot = process.env.AGENT_RUNTIME_TEST_REPOSITORY_ROOT ?? createConsumerFixture(candidateRoot);
afterAll(() => {
  if (!process.env.AGENT_RUNTIME_TEST_REPOSITORY_ROOT) rmSync(repositoryRoot, { recursive: true, force: true });
});
const runtimeConfig = loadRuntimeConfig(repositoryRoot);
const projectContext = Object.freeze(
  loadProjectContext(
    repositoryRoot,
    runtimeConfig,
    runtimeConfig.repository.repository_id,
    runtimeConfig.projects[0].project_id,
  ),
);
const projectBinding = projectContext.project_bindings[0];
if (!projectBinding) throw new Error('Expected the configured fixture project binding');
const registryHash = projectContext.registry_hash;
const contextTenant = projectContext.repository_id;
const contextProject = projectBinding.project_id;
const authorizeProject = createConfiguredProjectAuthorizer(repositoryRoot, runtimeConfig);

test('Bun coverage harness exercises the candidate decision/timing boundaries', async () => {
  const identity = {
    schema: 'TrustedProjectIdentity/v1',
    source: 'authenticated-context',
    principal: 'bun-test',
    role: 'developer-orchestrator',
    tenant: contextTenant,
    project: contextProject,
    registry_hash: registryHash,
  };
  const allowed = authorizeProject(
    {
      principal: 'bun-test',
      role: 'developer-orchestrator',
      tenant: contextTenant,
      project: contextProject,
      resourceTenant: contextTenant,
      resourceProject: contextProject,
      action: 'write',
      operationHash: 'd'.repeat(64),
      registryHash,
    },
    identity,
    projectContext,
  );
  const denied = authorizeProject(
    {
      principal: 'bun-test',
      role: 'viewer',
      tenant: contextTenant,
      project: contextProject,
      resourceTenant: contextTenant,
      resourceProject: contextProject,
      action: 'write',
      operationHash: 'd'.repeat(64),
      registryHash,
    },
    { ...identity, role: 'viewer' },
    projectContext,
  );
  assert.equal(allowed.decision, 'allow');
  assert.equal(denied.decision, 'deny');
  const events = [];
  assert.equal(
    await invokeTimed('readConfig', () => 'bun-coverage', {
      clock: {
        monotonicNs: (() => {
          const values = [0n, 1_000_000n];
          return () => values.shift();
        })(),
      },
      sink: { record: (event) => events.push(event) },
    }),
    'bun-coverage',
  );
  assert.equal(events.length, 1);
  assert.equal(events[0].optimization_required, false);
});

test('V8 coverage excludes only the nested portable package harness without changing maintained sources', () => {
  const manifest = JSON.parse(readFileSync(path.join(candidateRoot, 'package.json'), 'utf8'));
  const inventory = maintainedSourceInventory(candidateRoot);
  assert.match(manifest.scripts['test:coverage:pinned'], /--exclude tests\/package-boundary\.test\.mjs/);
  assert.match(manifest.scripts['test:coverage:pinned'], /--env-file=tooling\/v8-coverage\.env/);
  assert.match(manifest.scripts['test:coverage:pinned'], /--coverage/);
  assert.match(manifest.scripts['test:coverage:pinned'], /bun tooling\/run-bun-native-coverage\.mjs/);
  assert.doesNotMatch(manifest.scripts['test:coverage:pinned'], /bun --preload .* test tests\/bun\//);
  assert.match(manifest.scripts['test:pack:pinned'], /tests\/package-boundary\.test\.mjs/);
  assert.ok(inventory.binSources.includes('bin/init-core.mjs'));
  assert.ok(!inventory.publicBinSources.includes('bin/init-core.mjs'));
  assert.deepEqual(
    inventory.v8CoverageSources,
    [
      ...new Set([
        ...inventory.typescriptSources.filter((source) => !inventory.bunCoverageSources.includes(source)),
        ...inventory.binSources,
      ]),
    ].sort(),
  );
});

test('V8 coverage marker bypasses only live frozen-install cases while keeping an in-process public initializer check', async () => {
  assert.equal(
    readFileSync(path.join(candidateRoot, 'tooling/v8-coverage.env'), 'utf8'),
    'AGENT_RUNTIME_V8_COVERAGE=1\n',
  );
  for (const [file, marker] of [
    ['tests/initialization.test.mjs', 'const v8CoverageTest = v8CoverageMode ? test.skip : test;'],
    [
      'tests/install.test.mjs',
      "const v8CoverageTest = process.env.AGENT_RUNTIME_V8_COVERAGE === '1' ? test.skip : test;",
    ],
    ['tests/run-entrypoint.test.mjs', 'const liveInstallTest = v8CoverageMode ? test.skip : test;'],
  ])
    assert.ok(readFileSync(path.join(candidateRoot, file), 'utf8').includes(marker));
  await assert.rejects(
    () => initializeProject({ projectRoot: 'relative', repository: 'candidate', projectMappings: ['candidate'] }),
    /canonical absolute project root/,
  );
});

const nativeCoverageProbe = process.env.AGENT_RUNTIME_NATIVE_COVERAGE_MAIN === '1' ? test.skip : test;
nativeCoverageProbe(
  'Bun native coverage finalizes a durable report after the exact four-file command',
  () => {
    const outputRoot = mkdtempSync(path.join(tmpdir(), 'agent-runtime-new-native-coverage-output-'));
    try {
      const command = ['tooling/run-bun-native-coverage.mjs'];
      const result = spawnSync('bun', command, {
        cwd: candidateRoot,
        encoding: 'utf8',
        env: { ...process.env, BUN_NATIVE_COVERAGE_OUTPUT_ROOT: outputRoot },
        timeout: 180_000,
        windowsHide: true,
      });
      assert.equal(result.status, 0, result.stderr || result.stdout);
      const report = JSON.parse(
        readFileSync(path.join(outputRoot, 'coverage', 'bun-native', 'coverage-final.json'), 'utf8'),
      );
      assert.equal(report.schema, 'BunNativeCoverageReport/v1');
      assert.deepEqual(
        report.sources.map((source) => source.path),
        maintainedSourceInventory(candidateRoot).bunCoverageSources,
      );
      assert.deepEqual(
        Object.keys(report.coverage).sort(),
        report.sources.map((source) => path.join(candidateRoot, source.path)).sort(),
      );
    } finally {
      rmSync(outputRoot, { recursive: true, force: true });
    }
  },
  240_000,
);

test('Bun native coverage lock rejects a concurrent run before touching trusted artifacts', () => {
  const outputRoot = mkdtempSync(path.join(tmpdir(), 'agent-runtime-new-native-coverage-lock-'));
  const nativeDirectory = path.join(outputRoot, 'coverage', 'bun-native');
  mkdirSync(nativeDirectory, { recursive: true });
  const canonical = path.join(nativeDirectory, 'coverage-final.json');
  const staging = path.join(nativeDirectory, '.coverage-final-foreign.staging.json');
  writeFileSync(canonical, 'trusted-before\n');
  writeFileSync(staging, 'foreign-staging\n');
  writeFileSync(path.join(nativeDirectory, 'coverage-run.lock'), '{"run_id":"foreign"}\n');
  try {
    const result = spawnSync('bun', ['tooling/run-bun-native-coverage.mjs'], {
      cwd: candidateRoot,
      encoding: 'utf8',
      env: { ...process.env, BUN_NATIVE_COVERAGE_OUTPUT_ROOT: outputRoot },
      windowsHide: true,
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /already locked/);
    assert.equal(readFileSync(canonical, 'utf8'), 'trusted-before\n');
    assert.equal(readFileSync(staging, 'utf8'), 'foreign-staging\n');
  } finally {
    rmSync(outputRoot, { recursive: true, force: true });
  }
});

test('Bun mutation runner uses the pinned PATH without resolving npm for every Stryker worker', () => {
  const probe = spawnSync(
    process.execPath,
    [
      '-e',
      'import config from "./stryker.config.mjs"; console.log(JSON.stringify({ runner: config.testRunner, command: config.commandRunner.command, mutate: config.mutate }))',
    ],
    {
      cwd: candidateRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        AGENT_RUNTIME_MUTATION_PART: 'bun',
        AGENT_RUNTIME_MUTATION_SOURCE: 'src/lifecycle/runtime-facade.ts',
        AGENT_RUNTIME_MUTATION_TESTS: 'tests/smoke.test.mjs',
      },
    },
  );
  assert.equal(probe.status, 0, probe.stderr);
  const config = JSON.parse(probe.stdout);
  assert.equal(config.runner, 'command');
  assert.deepEqual(config.mutate, ['src/lifecycle/runtime-facade.ts']);
  assert.equal(config.command, 'bun test tests/smoke.test.mjs --timeout 15000');
  assert.doesNotMatch(config.command, /bin[\\/]bun\.mjs|npm exec/u);
});

test('Bun bootstrap rejects noncanonical pin segments and one-sided manifest drift', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'vida-bun-pin-mutation-'));
  const pinFile = path.join(directory, '.bun-version');
  const manifestFile = path.join(directory, 'package.json');
  const pin = readPin(candidateRoot);
  try {
    for (const invalid of ['00.1.2', '1.00.2', '1.2.00', '1a.2.3', '1.2a.3', '1.2.3a']) {
      writeFileSync(pinFile, invalid);
      assert.throws(() => readPin(directory), /exact stable Bun version/);
    }
    writeFileSync(pinFile, pin);
    for (const manifest of [
      { packageManager: 'bun@0.0.0', engines: { bun: pin } },
      { packageManager: `bun@${pin}`, engines: { bun: '0.0.0' } },
      { packageManager: `bun@${pin}` },
    ]) {
      writeFileSync(manifestFile, JSON.stringify(manifest));
      assert.throws(() => checkManifest(directory, pin), /manifest mirrors differ/);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('mutation inventory assigns every maintained source, including production CLIs, to a partition', () => {
  if (!process.versions.bun) return;
  const result = spawnSync(process.execPath, ['tooling/mutation-gate.mjs', '--inventory'], {
    cwd: candidateRoot,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  const inventory = JSON.parse(result.stdout);
  assert.equal(inventory.schema, 'CandidateMutationInventory/v1');
  assert.deepEqual(inventory.unassigned_sources, []);
  assert.deepEqual(inventory.unknown_partition_sources, []);
  assert.deepEqual(inventory.invalid_overlaps, []);
  assert.deepEqual(inventory.invalid_zero_mutant_sources, []);
  assert.deepEqual(inventory.missing_package_sources, []);
  assert.deepEqual(inventory.zero_mutant_sources.sort(), ['src/config/index.ts', 'src/index.ts']);
  assert.deepEqual(
    inventory.partitions.find((partition) => partition.name === 'main-exports'),
    {
      name: 'main-exports',
      environment: 'static',
      sources: ['src/index.ts', 'src/config/index.ts'],
    },
  );
  const assigned = new Set(inventory.partitions.flatMap((partition) => partition.sources));
  const sourceInventory = maintainedSourceInventory(candidateRoot);
  const maintained = sourceInventory.mutationSources;
  assert.deepEqual(inventory.expected_sources, maintained);
  assert.deepEqual(sourceInventory.missingBunCoverageSources, []);
  assert.deepEqual(
    sourceInventory.v8CoverageSources,
    [
      ...new Set([
        ...sourceInventory.typescriptSources.filter((source) => !sourceInventory.bunCoverageSources.includes(source)),
        ...sourceInventory.binSources,
      ]),
    ].sort(),
  );
  assert.ok(sourceInventory.typescriptSources.includes('src/orchestration/session-handoff.ts'));
  assert.ok(sourceInventory.typescriptSources.includes('src/orchestration/persistent-session-handoff.ts'));
  // Historical reconciliation sources are archived outside this npm package.
  assert.deepEqual(sourceInventory.repositoryOnlySources, []);
  assert.deepEqual([...inventory.expected_sources].sort(), maintained);
  assert.deepEqual(
    maintained.filter((source) => !assigned.has(source)),
    [],
  );
  for (const cli of ['bun.mjs', 'init.mjs', 'install.mjs', 'run.mjs', 'repair-work-state.mjs']) {
    assert.ok(inventory.expected_sources.includes(`bin/${cli}`));
    assert.ok(inventory.partitions.some((partition) => partition.sources.includes(`bin/${cli}`)));
    assert.ok(sourceInventory.v8CoverageSources.includes(`bin/${cli}`));
  }
  assert.ok(!sourceInventory.repositoryOnlySources.includes('bin/reconcile-artifacts.mjs'));
  assert.ok(sourceInventory.publicBinSources.includes('bin/reconcile-artifacts.mjs'));
  assert.ok(sourceInventory.v8CoverageSources.includes('bin/reconcile-artifacts.mjs'));
});

test('coverage gate fails closed without a complete summary artifact', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'agent-runtime-new-coverage-'));
  const toolingDirectory = path.join(directory, 'tooling');
  const coverageDir = path.join(directory, 'coverage');
  const gatePath = path.join(toolingDirectory, 'coverage-gate.mjs');
  const inventoryPath = path.join(toolingDirectory, 'maintained-source-inventory.mjs');
  mkdirSync(toolingDirectory, { recursive: true });
  mkdirSync(coverageDir, { recursive: true });
  writeFileSync(gatePath, readFileSync(path.join(candidateRoot, 'tooling', 'coverage-gate.mjs')));
  writeFileSync(inventoryPath, readFileSync(path.join(candidateRoot, 'tooling', 'maintained-source-inventory.mjs')));
  try {
    const result = spawnSync(process.execPath, [gatePath], {
      cwd: directory,
      encoding: 'utf8',
    });
    assert.equal(result.status, 1);
    const report = JSON.parse(result.stdout);
    assert.equal(report.status, 'gap');
    assert.equal(report.gap, 'GAP-RTNEW-COVERAGE-COMPLETE-001');
    assert.match(report.reason, /missing or invalid coverage[\\/]coverage-summary\.json/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('coverage gate fails closed when the Bun coverage lane is absent', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'agent-runtime-new-bun-lane-'));
  const sourceDirectory = path.join(directory, 'src');
  const coverageDirectory = path.join(directory, 'coverage');
  const sourcePath = path.join(sourceDirectory, 'fixture.ts');
  mkdirSync(sourceDirectory, { recursive: true });
  mkdirSync(coverageDirectory, { recursive: true });
  writeFileSync(sourcePath, 'export const value = 1;\n');
  writeFileSync(path.join(directory, 'package.json'), JSON.stringify({ files: ['src/**'], bin: {} }));
  const completeMetric = { total: 1, covered: 1, skipped: 0, pct: 100 };
  writeFileSync(
    path.join(coverageDirectory, 'coverage-summary.json'),
    JSON.stringify({
      total: {
        lines: completeMetric,
        statements: completeMetric,
        functions: completeMetric,
        branches: completeMetric,
      },
      [sourcePath]: {
        lines: completeMetric,
        statements: completeMetric,
        functions: completeMetric,
        branches: completeMetric,
      },
    }),
  );
  try {
    const result = spawnSync(process.execPath, [path.join(candidateRoot, 'tooling', 'coverage-gate.mjs')], {
      cwd: candidateRoot,
      encoding: 'utf8',
      env: { ...process.env, COVERAGE_GATE_ROOT: directory },
    });
    assert.equal(result.status, 1);
    const report = JSON.parse(result.stdout);
    assert.match(report.reason, /missing or invalid coverage[\\/]bun[\\/]lcov\.info/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('Bun native instrumentation gate rejects a one-sided branch and accepts complete counters', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'agent-runtime-new-bun-native-coverage-'));
  const coverageDirectory = path.join(directory, 'coverage');
  const nativeDirectory = path.join(coverageDirectory, 'bun-native');
  const nativeSources = [
    'src/host-state.ts',
    'src/lifecycle/lifecycle-state.ts',
    'src/orchestration/persistent-session-handoff.ts',
    'src/orchestration/session-handoff.ts',
    'src/runtime-kernel.ts',
  ];
  const completeMetric = { total: 1, covered: 1, skipped: 0, pct: 100 };
  const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
  const lcov = nativeSources
    .map((source) => `SF:${source}\nFNF:1\nFNH:1\nLF:1\nLH:1\nDA:1,1\nend_of_record\n`)
    .join('');
  mkdirSync(nativeDirectory, { recursive: true });
  for (const source of nativeSources) {
    const sourcePath = path.join(directory, source);
    mkdirSync(path.dirname(sourcePath), { recursive: true });
    writeFileSync(sourcePath, 'export const covered = (value: boolean) => (value ? 1 : 2);\n');
  }
  writeFileSync(path.join(directory, 'package.json'), JSON.stringify({ files: ['src/**'], bin: {} }));
  writeFileSync(path.join(coverageDirectory, 'coverage-final.json'), '{}');
  writeFileSync(
    path.join(coverageDirectory, 'coverage-summary.json'),
    JSON.stringify({
      total: { lines: completeMetric, statements: completeMetric, functions: completeMetric, branches: completeMetric },
    }),
  );
  stampFixtureCoverage(directory, { nativeReport: false });
  assert.deepEqual(
    JSON.parse(readFileSync(path.join(coverageDirectory, 'source-fingerprint.v1.json'), 'utf8')).sources.map(
      (entry) => entry.path,
    ),
    nativeSources,
  );
  mkdirSync(path.join(coverageDirectory, 'bun'), { recursive: true });
  writeFileSync(path.join(coverageDirectory, 'bun', 'lcov.info'), lcov);
  const runId = JSON.parse(
    readFileSync(path.join(directory, 'node_modules', '.cache', 'vida-agent', 'coverage-source-start.v1.json'), 'utf8'),
  ).run_id;
  const writeNative = (branchCounts, omitFunctionCounter = false) => {
    writeFileSync(
      path.join(nativeDirectory, 'coverage-final.json'),
      JSON.stringify({
        schema: 'BunNativeCoverageReport/v1',
        run_id: runId,
        sources: nativeSources.map((source) => ({
          path: source,
          sha256: digest(readFileSync(path.join(directory, source))),
        })),
        coverage: Object.fromEntries(
          nativeSources.map((source) => [
            path.join(directory, source),
            {
              statementMap: { 0: {} },
              s: { 0: 1 },
              fnMap: { 0: {} },
              f: omitFunctionCounter ? {} : { 0: 1 },
              branchMap: { 0: { locations: [{}, {}] } },
              b: { 0: branchCounts },
            },
          ]),
        ),
      }),
    );
    runFixtureCoverageGate(directory, '--stamp-native');
  };
  try {
    writeNative([1, 0]);
    const failed = spawnSync(process.execPath, [path.join(candidateRoot, 'tooling', 'coverage-gate.mjs')], {
      cwd: candidateRoot,
      encoding: 'utf8',
      env: { ...process.env, COVERAGE_GATE_ROOT: directory },
    });
    assert.equal(failed.status, 1);
    assert.match(failed.stdout, /bun-native/);
    writeNative([1]);
    const truncated = spawnSync(process.execPath, [path.join(candidateRoot, 'tooling', 'coverage-gate.mjs')], {
      cwd: candidateRoot,
      encoding: 'utf8',
      env: { ...process.env, COVERAGE_GATE_ROOT: directory },
    });
    assert.equal(truncated.status, 1);
    assert.match(truncated.stdout, /branch counter cardinality/);
    writeNative([1, 1], true);
    const malformed = spawnSync(process.execPath, [path.join(candidateRoot, 'tooling', 'coverage-gate.mjs')], {
      cwd: candidateRoot,
      encoding: 'utf8',
      env: { ...process.env, COVERAGE_GATE_ROOT: directory },
    });
    assert.equal(malformed.status, 1);
    assert.match(malformed.stdout, /counter keys do not match map keys/);
    writeNative([1, 1]);
    const passed = spawnSync(process.execPath, [path.join(candidateRoot, 'tooling', 'coverage-gate.mjs')], {
      cwd: candidateRoot,
      encoding: 'utf8',
      env: { ...process.env, COVERAGE_GATE_ROOT: directory },
    });
    assert.equal(passed.status, 0, passed.stdout + passed.stderr);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('CRAP gate maps covered functions by source range and treats absent coverage entries as uncovered', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'agent-runtime-new-crap-'));
  const sourceDirectory = path.join(directory, 'src');
  const coverageDirectory = path.join(directory, 'coverage');
  const sourcePath = path.join(sourceDirectory, 'fixture.ts');
  mkdirSync(sourceDirectory, { recursive: true });
  mkdirSync(coverageDirectory, { recursive: true });
  const measuredHeader = 'function measured(value: boolean) {';
  writeFileSync(
    sourcePath,
    'const mapped = (value: boolean) => value;\nconst missing = () => false;\n' +
      measuredHeader +
      '\n  if (value && value !== null) return 1;\n  if (value === false) return 2;\n  return 3;\n}\n',
  );
  const fileCoverage = {
    fnMap: {
      0: {
        name: '(anonymous_0)',
        decl: { start: { line: 1, column: 0 }, end: { line: 1, column: 14 } },
        loc: { start: { line: 1, column: 16 }, end: { line: 1, column: 40 } },
        line: 1,
      },
      1: {
        name: 'measured',
        decl: { start: { line: 3, column: 0 }, end: { line: 3, column: 17 } },
        loc: { start: { line: 3, column: measuredHeader.indexOf('{') }, end: { line: 7, column: 1 } },
        line: 3,
      },
    },
    f: { 0: 1, 1: 1 },
    statementMap: {
      0: { start: { line: 4, column: 2 }, end: { line: 4, column: 42 } },
      1: { start: { line: 5, column: 2 }, end: { line: 5, column: 37 } },
    },
    s: { 0: 1, 1: 0 },
  };
  const coveragePath = path.join(coverageDirectory, 'coverage-final.json');
  writeFileSync(coveragePath, JSON.stringify({ [sourcePath]: fileCoverage }));
  stampFixtureCoverage(directory);
  try {
    const result = spawnSync(process.execPath, [path.join(candidateRoot, 'tooling', 'crap-gate.mjs')], {
      cwd: candidateRoot,
      encoding: 'utf8',
      env: { ...process.env, CRAP_GATE_ROOT: directory },
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /do not satisfy CRAP <5/);
    const report = JSON.parse(readFileSync(path.join(coverageDirectory, 'crap-report.json'), 'utf8'));
    assert.equal(report.reason, 'one or more maintained functions do not satisfy CRAP <5 and complexity <=10');
    assert.equal(report.details.functions.length, 3);
    assert.equal(report.details.functions.filter((entry) => entry.covered).length, 2);
    const absent = report.details.functions.find((entry) => entry.coverage_mapping === 'missing');
    assert.equal(absent?.line, 2);
    assert.equal(absent?.crap, 2);
    const measured = report.details.functions.find((entry) => entry.name === 'measured');
    assert.equal(measured?.coverage, 0.5);
    assert.equal(measured?.coverage_source, 'v8-statements');
    assert.equal(measured?.crap, 6);
    fileCoverage.s[1] = 1;
    writeFileSync(coveragePath, JSON.stringify({ [sourcePath]: fileCoverage }));
    stampFixtureCoverage(directory);
    const fullyCovered = spawnSync(process.execPath, [path.join(candidateRoot, 'tooling', 'crap-gate.mjs')], {
      cwd: candidateRoot,
      encoding: 'utf8',
      env: { ...process.env, CRAP_GATE_ROOT: directory },
    });
    assert.equal(fullyCovered.status, 1);
    const updated = JSON.parse(readFileSync(path.join(coverageDirectory, 'crap-report.json'), 'utf8'));
    const complete = updated.details.functions.find((entry) => entry.name === 'measured');
    assert.equal(complete?.coverage, 1);
    assert.equal(complete?.crap, 4);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('CRAP gate rejects coverage collected for different source bytes before mapping functions', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'agent-runtime-new-crap-stale-'));
  const sourceDirectory = path.join(directory, 'src');
  const coverageDirectory = path.join(directory, 'coverage');
  mkdirSync(sourceDirectory, { recursive: true });
  mkdirSync(coverageDirectory, { recursive: true });
  const sourcePath = path.join(sourceDirectory, 'fixture.ts');
  writeFileSync(sourcePath, 'export const value = () => 1;\n');
  writeFileSync(path.join(coverageDirectory, 'coverage-final.json'), JSON.stringify({ [sourcePath]: {} }));
  stampFixtureCoverage(directory);
  writeFileSync(sourcePath, 'export const value = () => 2;\n');
  try {
    const result = spawnSync(process.execPath, [path.join(candidateRoot, 'tooling', 'crap-gate.mjs')], {
      cwd: candidateRoot,
      encoding: 'utf8',
      env: { ...process.env, CRAP_GATE_ROOT: directory },
    });
    assert.equal(result.status, 1);
    const report = JSON.parse(readFileSync(path.join(coverageDirectory, 'crap-report.json'), 'utf8'));
    assert.equal(report.reason, 'coverage/source fingerprint mismatch');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('coverage snapshot refuses source changes during V8 collection', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'agent-runtime-new-v8-snapshot-'));
  const sourceDirectory = path.join(directory, 'src');
  const coverageDirectory = path.join(directory, 'coverage');
  mkdirSync(sourceDirectory, { recursive: true });
  mkdirSync(coverageDirectory, { recursive: true });
  const sourcePath = path.join(sourceDirectory, 'fixture.ts');
  writeFileSync(sourcePath, 'export const value = 1;\n');
  writeFileSync(path.join(directory, 'package.json'), JSON.stringify({ files: ['src/**'], bin: {} }));
  const run = (mode) =>
    spawnSync(process.execPath, [path.join(candidateRoot, 'tooling', 'coverage-gate.mjs'), mode], {
      cwd: candidateRoot,
      encoding: 'utf8',
      env: { ...process.env, COVERAGE_GATE_ROOT: directory },
    });
  try {
    assert.equal(run('--begin-v8').status, 0);
    writeFileSync(sourcePath, 'export const value = 2;\n');
    writeFileSync(path.join(coverageDirectory, 'coverage-final.json'), '{}');
    writeFileSync(path.join(coverageDirectory, 'coverage-summary.json'), '{}');
    assert.match(run('--stamp-v8').stderr, /source changed during V8 collection/);
    assert.equal(existsSync(path.join(coverageDirectory, 'source-fingerprint.v1.json')), false);
    assert.equal(run('--begin-v8').status, 0);
    writeFileSync(path.join(directory, 'package.json'), JSON.stringify({ files: ['src/**', 'tests/**'], bin: {} }));
    assert.match(run('--stamp-v8').stderr, /coverage input changed during collection/);
    writeFileSync(path.join(directory, 'package.json'), JSON.stringify({ files: ['src/**'], bin: {} }));
    assert.equal(run('--begin-v8').status, 0);
    writeFileSync(path.join(coverageDirectory, 'coverage-final.json'), '{ }');
    assert.equal(run('--stamp-v8').status, 0);
    assert.equal(
      JSON.parse(readFileSync(path.join(coverageDirectory, 'source-fingerprint.v1.json'), 'utf8')).schema,
      'CoverageSourceFingerprint/v1',
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('CRAP gate assigns nested statements to their own function and handles entry-only coverage', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'agent-runtime-new-crap-nested-'));
  const sourceDirectory = path.join(directory, 'src');
  const coverageDirectory = path.join(directory, 'coverage');
  const sourcePath = path.join(sourceDirectory, 'fixture.ts');
  mkdirSync(sourceDirectory, { recursive: true });
  mkdirSync(coverageDirectory, { recursive: true });
  const lines = [
    'function outer(value: boolean) {',
    '  const inner = () => (value ? 1 : 2);',
    '  if (value) return inner();',
    '  return 0;',
    '}',
    'const empty = () => {};',
    'const idle = () => 0;',
  ];
  writeFileSync(sourcePath, lines.join('\n') + '\n');
  const location = (line, column) => ({ line, column });
  const entry = (line, column, endLine = line) => ({
    decl: { start: location(line, 0) },
    loc: { start: location(line, column), end: location(endLine, lines[endLine - 1].length) },
  });
  const fileCoverage = {
    fnMap: {
      0: entry(1, lines[0].indexOf('{'), 5),
      1: entry(2, lines[1].indexOf('value ?')),
      2: entry(6, lines[5].indexOf('{')),
      3: entry(7, lines[6].lastIndexOf('0')),
    },
    f: { 0: 1, 1: 1, 2: 1, 3: 0 },
    statementMap: {
      0: { start: location(2, 2) },
      1: { start: location(2, lines[1].indexOf('value ?')) },
      2: { start: location(3, 2) },
      3: { start: location(4, 2) },
      4: { start: location(7, lines[6].lastIndexOf('0')) },
      5: { start: location(5, 1) },
      6: { start: location(99, 0) },
    },
    s: { 0: 1, 1: 0, 2: 1, 3: 0, 4: 0, 5: 0, 6: 1 },
  };
  writeFileSync(path.join(coverageDirectory, 'coverage-final.json'), JSON.stringify({ [sourcePath]: fileCoverage }));
  stampFixtureCoverage(directory);
  try {
    const result = spawnSync(process.execPath, [path.join(candidateRoot, 'tooling', 'crap-gate.mjs')], {
      cwd: candidateRoot,
      encoding: 'utf8',
      env: { ...process.env, CRAP_GATE_ROOT: directory },
    });
    assert.equal(result.status, 1);
    const report = JSON.parse(readFileSync(path.join(coverageDirectory, 'crap-report.json'), 'utf8'));
    assert.equal(report.details.functions.length, 4);
    const outer = report.details.functions.find((row) => row.line === 1);
    const inner = report.details.functions.find((row) => row.line === 2);
    const empty = report.details.functions.find((row) => row.line === 6);
    const idle = report.details.functions.find((row) => row.line === 7);
    assert.equal(outer?.coverage, 2 / 3);
    assert.equal(outer?.coverage_source, 'v8-statements');
    assert.equal(inner?.coverage, 0);
    assert.equal(inner?.crap, 6);
    assert.equal(empty?.coverage, 1);
    assert.equal(empty?.coverage_source, 'v8-function-entry-fallback');
    assert.equal(idle?.covered, false);
    assert.equal(idle?.coverage, 0);
    assert.equal(idle?.coverage_source, 'v8-statements');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('CRAP gate treats missing file and statement counters as uncovered', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'agent-runtime-new-crap-missing-'));
  const sourceDirectory = path.join(directory, 'src');
  const coverageDirectory = path.join(directory, 'coverage');
  const knownPath = path.join(sourceDirectory, 'known.ts');
  mkdirSync(sourceDirectory, { recursive: true });
  mkdirSync(coverageDirectory, { recursive: true });
  writeFileSync(knownPath, 'function known() { return 1; }\n');
  writeFileSync(path.join(sourceDirectory, 'missing.ts'), 'function missing() { return 2; }\n');
  writeFileSync(
    path.join(coverageDirectory, 'coverage-final.json'),
    JSON.stringify({
      [knownPath]: {
        fnMap: {
          0: {
            name: 'known',
            decl: { start: { line: 1, column: 0 } },
            loc: { start: { line: 1, column: 17 }, end: { line: 1, column: 30 } },
          },
        },
        f: { 0: 1 },
        statementMap: { 0: { start: { line: 1, column: 19 } } },
      },
    }),
  );
  stampFixtureCoverage(directory);
  try {
    const result = spawnSync(process.execPath, [path.join(candidateRoot, 'tooling', 'crap-gate.mjs')], {
      cwd: candidateRoot,
      encoding: 'utf8',
      env: { ...process.env, CRAP_GATE_ROOT: directory },
    });
    assert.equal(result.status, 1);
    const report = JSON.parse(readFileSync(path.join(coverageDirectory, 'crap-report.json'), 'utf8'));
    const known = report.details.functions.find((row) => row.name === 'known');
    const missing = report.details.functions.find((row) => row.name === 'missing');
    assert.equal(known?.covered, true);
    assert.equal(known?.coverage, 0);
    assert.equal(known?.coverage_source, 'v8-statements');
    assert.equal(missing?.coverage_mapping, 'missing');
    assert.equal(missing?.coverage, 0);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
