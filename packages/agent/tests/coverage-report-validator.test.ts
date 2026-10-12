import { expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertCoverageSnapshotBytes,
  validateCoverageReport,
  validateHistoricalBaselineCoverageReport,
} from '../tooling/bun-coverage-report-validator.ts';
import { capturedModuleInputs } from '../tooling/bun-coverage-evidence.ts';
import { createSyntheticCoverageFixture } from './synthetic-coverage-fixture.ts';
import { expectRejection } from './helpers/expect-rejection.ts';

const packageRoot = fileURLToPath(new URL('../', import.meta.url));

function testRecord(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} is invalid.`);
  return value as Record<string, unknown>;
}

function testSha256(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex');
}

const syntheticHistoricalTests = [
  'tests/bun/host-state.test.mjs',
  'tests/bun/lifecycle-state.test.mjs',
  'tests/bun/persistent-session-handoff.test.mjs',
  'tests/bun-coverage.test.mjs',
];
const syntheticFixtureSubjects = [
  'tooling/coverage-gate.mjs',
  'tooling/crap-gate.mjs',
  'tooling/mutation-gate.mjs',
  'tooling/run-bun-native-coverage.mjs',
];

function syntheticHistoricalJunit(): Buffer {
  const suites = syntheticHistoricalTests
    .map((file, fileIndex) => {
      const cases = Array.from({ length: 72 }, (_, index) => {
        const fileFailure = file === 'tests/bun-coverage.test.mjs' && index === 0;
        const fileSkip = file === 'tests/bun-coverage.test.mjs' && index === 1;
        const name = fileFailure
          ? 'mutation inventory assigns every maintained source, including production CLIs, to a partition'
          : fileSkip
            ? 'Bun native coverage finalizes a durable report after the exact four-file command'
            : `synthetic-${fileIndex}-${index}`;
        const outcome = fileFailure
          ? '<failure type="AssertionError" message="Expected values to be strictly equal:&#10;&#10;1 !== 0&#10;"/>'
          : fileSkip
            ? '<skipped></skipped>'
            : '';
        return `<testcase name="${name}" assertions="1" file="${file}">${outcome}</testcase>`;
      }).join('');
      const failures = file === 'tests/bun-coverage.test.mjs' ? 1 : 0;
      const skipped = failures;
      return `<testsuite name="${file}" file="${file}" tests="72" assertions="72" failures="${failures}" skipped="${skipped}" errors="0">${cases}</testsuite>`;
    })
    .join('');
  return Buffer.from(
    `<?xml version="1.0"?><testsuites name="bun test" tests="288" assertions="288" failures="1" skipped="1" errors="0">${suites}</testsuites>`,
  );
}

function syntheticPublishedFixture(inputBytes: Map<string, Buffer>) {
  const entries = [...inputBytes]
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([file, bytes]) => ({
      path: file,
      mode: '100644',
      blob_oid: createHash('sha1').update(`blob ${bytes.byteLength}\0`).update(bytes).digest('hex'),
      sha256: testSha256(bytes),
    }));
  return {
    schema: 'PublishedCoverageFixture/v1',
    commit: 'b5499511e64b2165a8c97ae3d2b455b25b1ac5b6',
    directory: 'published-fixture',
    inputs: entries,
  };
}

function syntheticFixtureChildren(
  runId: string,
  parentPid: number,
  fixtureRoot: string,
  fixtureInputs: Array<{ path: string; sha256: string }>,
  runtimeBytes: Buffer,
) {
  const emptySha = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
  const inventoryOutputSha = '96eb4bf4b21263b198d39225d59d46e6ce1b750dfdb797f73b50ac6d1c92b476';
  const executableSha = testSha256(runtimeBytes);
  const children = syntheticFixtureSubjects.map((file, index) => {
    const inventory = file === 'tooling/mutation-gate.mjs';
    const digest = fixtureInputs.find((entry) => entry.path === file)?.sha256;
    if (!digest) throw new Error(`Synthetic published fixture input is missing: ${file}`);
    return {
      id: index + 1,
      command: 'bun',
      argv: inventory ? [file, '--inventory'] : [file],
      cwd: fixtureRoot,
      environment_sha256: 'a'.repeat(64),
      executable_path: path.resolve(process.execPath),
      executable_sha256: executableSha,
      entrypoint: { kind: 'file', value_sha256: digest, path: path.join(fixtureRoot, file) },
      pid: parentPid + index + 1,
      exit_code: inventory ? 1 : 0,
      signal: null,
      termination_request: null,
      terminal_observed: true,
      error_observed: false,
      inputs_stable: true,
      stdout: {
        representation: 'returned-text-utf8',
        bytes: inventory ? 10544 : 0,
        sha256: inventory ? inventoryOutputSha : emptySha,
        truncated: false,
        available: true,
      },
      stderr: { representation: 'returned-text-utf8', bytes: 0, sha256: emptySha, truncated: false, available: true },
    };
  });
  return {
    schema: 'PublishedFixtureChildren/v1',
    scope: 'direct-child-process-api',
    run_id: runId,
    parent_pid: parentPid,
    fixture_fingerprint: testSha256(
      JSON.stringify({
        schema: 'PublishedCoverageFixture/v1',
        commit: 'b5499511e64b2165a8c97ae3d2b455b25b1ac5b6',
        directory: 'published-fixture',
        inputs: fixtureInputs,
      }),
    ),
    launch_count: children.length,
    unsupported_calls: 0,
    complete: true,
    children,
  };
}

async function historicalBootstrapFixture(
  options: { includeLegacyProvider?: boolean; includeCurrentProvider?: boolean } = {},
) {
  const fixture = await createSyntheticCoverageFixture();
  try {
    const report = testRecord(fixture.report, 'Synthetic report');
    const manifest = testRecord(fixture.manifest, 'Synthetic manifest');
    const child = testRecord(fixture.child, 'Synthetic process');
    const sources = report.sources as Array<{ path: string; sha256: string }>;
    const fixtureBytes = new Map<string, Buffer>();
    for (const source of sources)
      fixtureBytes.set(source.path, readFileSync(path.join(fixture.snapshotDirectory, ...source.path.split('/'))));
    const testInputBytes = new Map(
      syntheticHistoricalTests.map((file) => [file, Buffer.from(`synthetic selected test subject: ${file}\n`)]),
    );
    for (const [file, bytes] of testInputBytes) {
      const target = path.join(fixture.snapshotDirectory, ...file.split('/'));
      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(target, bytes);
    }
    for (const [file, bytes] of testInputBytes) fixtureBytes.set(file, bytes);
    for (const file of syntheticFixtureSubjects)
      fixtureBytes.set(file, Buffer.from(`synthetic published fixture subject: ${file}\n`));
    const publishedFixture = syntheticPublishedFixture(fixtureBytes);
    const fixtureRoot = path.join(fixture.snapshotDirectory, publishedFixture.directory);
    for (const [file, bytes] of fixtureBytes) {
      const target = path.join(fixtureRoot, ...file.split('/'));
      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(target, bytes);
    }

    const testInputs = [...testInputBytes]
      .map(([file, bytes]) => ({ path: file, sha256: testSha256(bytes) }))
      .sort((left, right) => left.path.localeCompare(right.path));
    const originalTools = report.tool_inputs as Array<{ path: string; sha256: string }>;
    const evidenceTs = 'tooling/bun-coverage-evidence.ts';
    const evidenceMjs = 'tooling/bun-coverage-evidence.mjs';
    const tools = originalTools.filter((entry) => entry.path !== evidenceTs);
    const legacyBytes = Buffer.from('synthetic frozen legacy coverage evidence module');
    if (options.includeCurrentProvider) {
      const currentProvider = originalTools.find((entry) => entry.path === evidenceTs);
      if (!currentProvider) throw new Error('Synthetic current evidence provider is missing.');
      tools.push(currentProvider);
    }
    const legacyDigest = testSha256(legacyBytes);
    if (options.includeLegacyProvider) tools.push({ path: evidenceMjs, sha256: legacyDigest });
    tools.sort((left, right) => left.path.localeCompare(right.path));
    const modules = capturedModuleInputs({ sources, test_inputs: testInputs, tool_inputs: tools });
    const runtimeBytes = readFileSync(process.execPath);
    const selection = {
      ...testRecord(report.test_selection, 'Test selection'),
      mode: 'published-baseline-bun-native',
      tests: syntheticHistoricalTests,
      published_fixture: publishedFixture,
    };
    const testFingerprint = testSha256(JSON.stringify({ selection, files: testInputs }));
    const toolFingerprint = testSha256(JSON.stringify(tools));
    const activeArgv = ['bun', 'test', '--reporter=junit'];
    const runRelative = `coverage/bun-unified/runs/${String(report.run_id)}`;
    const junitRelative = `${runRelative}/processes/suite.junit.xml`;
    const junitAbsolute = path.join(fixture.root, ...junitRelative.split('/'));
    activeArgv.push('--reporter-outfile=' + junitAbsolute, ...syntheticHistoricalTests);

    for (const owner of [report, manifest]) {
      owner.test_selection = selection;
      owner.test_fingerprint = testFingerprint;
      owner.tool_inputs = tools;
      owner.tool_fingerprint = toolFingerprint;
      owner.tests = syntheticHistoricalTests;
      owner.test_inputs = testInputs;
      owner.module_inputs = modules;
      owner.active_argv = activeArgv;
    }
    child.test_selection = selection;
    child.test_fingerprint = testFingerprint;
    child.tool_fingerprint = toolFingerprint;
    report.module_inputs = modules;
    child.active_argv = activeArgv;
    child.module_inputs = modules;
    child.published_fixture = publishedFixture;
    child.loaded_fixture_inputs = [...syntheticHistoricalTests, ...sources.map((entry) => entry.path)].map((file) => ({
      path: file,
      root_id: 'published_fixture',
      sha256: publishedFixture.inputs.find((entry) => entry.path === file)?.sha256,
    }));
    child.fixture_children = syntheticFixtureChildren(
      String(report.run_id),
      Number(child.pid),
      fixtureRoot,
      publishedFixture.inputs,
      runtimeBytes,
    );
    // The historical receipt attests the original module filename, not a loose alias.
    if (Array.isArray(child.loaded_inputs)) {
      const loadedInputs = child.loaded_inputs.filter((entry) => {
        const file = testRecord(entry, 'Loaded input').path;
        return file !== evidenceTs && !String(file).startsWith('tests/');
      });
      for (const [file, bytes] of testInputBytes) loadedInputs.push({ path: file, sha256: testSha256(bytes) });
      if (options.includeLegacyProvider) loadedInputs.push({ path: evidenceMjs, sha256: legacyDigest });
      child.loaded_inputs = loadedInputs;
    }
    if (options.includeLegacyProvider) {
      const snapshotPath = path.join(fixture.snapshotDirectory, ...evidenceMjs.split('/'));
      mkdirSync(path.dirname(snapshotPath), { recursive: true });
      writeFileSync(snapshotPath, legacyBytes);
    }
    const junitBytes = syntheticHistoricalJunit();
    mkdirSync(path.dirname(junitAbsolute), { recursive: true });
    writeFileSync(junitAbsolute, junitBytes);
    const receipt = (report.processes as Array<{ file: string; pid: number }>)[0];
    if (!receipt) throw new Error('Synthetic process receipt is missing.');
    report.published_reference = {
      schema: 'PublishedBaselineReference/v1',
      kind: 'measurement_admitted',
      suite_passed: false,
      quality_passed: false,
      failure_id: 'b549951/mutation-inventory-gap-37',
      junit: { path: junitRelative, sha256: testSha256(junitBytes), bytes: junitBytes.length },
      inventory: { process_file: receipt.file, pid: receipt.pid, child_id: 3 },
    };
    const shards = report.shards as Array<Record<string, unknown>>;
    if (!shards[0]) throw new Error('Synthetic shard receipt is missing.');
    shards[0].status = 1;
    const manifestRelative = report.manifest_path;
    if (typeof manifestRelative !== 'string') throw new Error('Synthetic manifest path is invalid.');
    const manifestFile = path.join(fixture.root, ...manifestRelative.split('/'));
    const manifestBytes = Buffer.from(JSON.stringify(manifest));
    writeFileSync(manifestFile, manifestBytes);
    report.manifest_sha256 = testSha256(manifestBytes);
    const runtimePath = path.join(fixture.root, 'retained-runtime-fixture');
    writeFileSync(runtimePath, runtimeBytes);
    const reportBytes = fixture.rewriteChildAndReceiptHash(() => {});
    return { fixture, runtimePath, reportBytes };
  } catch (error) {
    fixture.remove();
    throw error;
  }
}

function historicalRuntimeFixture() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'historical-runtime-public-entrypoint-'));
  const runId = '01234567-89ab-4def-89ab-0123456789ab';
  const runtimePath = path.join(root, 'retained-bun');
  const runtimeBytes = Buffer.from('synthetic retained Bun runtime bytes');
  const runtimeSha256 = createHash('sha256').update(runtimeBytes).digest('hex');
  const runRelative = `coverage/bun-unified/runs/${runId}`;
  const snapshotRelative = `${runRelative}/snapshot`;
  const manifestRelative = `${runRelative}/manifest.json`;
  const reportPath = path.join(root, 'coverage-final.json');
  const oldToolPath = 'tooling/bun-coverage-evidence.ts';
  const oldToolBytes = Buffer.from('captured historical producer tooling; intentionally absent at package root');
  const oldToolInputs = [{ path: oldToolPath, sha256: createHash('sha256').update(oldToolBytes).digest('hex') }];
  const selection = { mode: 'published-baseline-bun-native', tests: [] };
  const sourceFingerprint = createHash('sha256').update('[]').digest('hex');
  const testFingerprint = createHash('sha256')
    .update(JSON.stringify({ selection, files: [] }))
    .digest('hex');
  const toolFingerprint = createHash('sha256').update(JSON.stringify(oldToolInputs)).digest('hex');
  const moduleInputs = [...oldToolInputs];
  const executionScope = { kind: 'synthetic historical input closure' };
  const activeArgv = ['bun', 'test'];
  const manifestBytes = Buffer.from(
    JSON.stringify({
      schema: 'VidaBunCoverageRun/v1',
      run_id: runId,
      bun_version: '1.4.2',
      runtime_executable_sha256: runtimeSha256,
      snapshot_directory: snapshotRelative,
      sources: [],
      source_fingerprint: sourceFingerprint,
      tests: [],
      test_selection: selection,
      test_inputs: [],
      test_fingerprint: testFingerprint,
      tool_inputs: oldToolInputs,
      tool_fingerprint: toolFingerprint,
      module_inputs: moduleInputs,
      execution_scope: executionScope,
      active_argv: activeArgv,
      source_maps: {},
    }),
  );
  const reference = {
    schema: 'PublishedBaselineReference/v1',
    kind: 'measurement_admitted',
    suite_passed: false,
    quality_passed: false,
    failure_id: 'b549951/mutation-inventory-gap-37',
    junit: { path: `${runRelative}/processes/suite.junit.xml`, sha256: 'a'.repeat(64), bytes: 1 },
    inventory: {
      process_file: `${runId}.bun-test.123.01234567-89ab-4def-89ab-0123456789ab.json`,
      pid: 123,
      child_id: 1,
    },
  };
  const reportBytes = Buffer.from(
    JSON.stringify({
      schema: 'VidaBunCoverageReport/v1',
      run_id: runId,
      manifest_path: manifestRelative,
      manifest_sha256: createHash('sha256').update(manifestBytes).digest('hex'),
      runtime_executable_sha256: runtimeSha256,
      test_selection: selection,
      published_reference: reference,
      sources: [],
      source_fingerprint: sourceFingerprint,
      tests: [],
      test_inputs: [],
      test_fingerprint: testFingerprint,
      tool_inputs: oldToolInputs,
      tool_fingerprint: toolFingerprint,
      module_inputs: moduleInputs,
      execution_scope: executionScope,
      active_argv: activeArgv,
      source_maps: {},
      shards: [],
      processes: [],
      coverage: {},
    }),
  );
  mkdirSync(path.dirname(path.join(root, ...manifestRelative.split('/'))), { recursive: true });
  writeFileSync(path.join(root, ...manifestRelative.split('/')), manifestBytes);
  const snapshotToolPath = path.join(root, ...snapshotRelative.split('/'), ...oldToolPath.split('/'));
  mkdirSync(path.dirname(snapshotToolPath), { recursive: true });
  writeFileSync(snapshotToolPath, oldToolBytes);
  writeFileSync(reportPath, reportBytes);
  writeFileSync(runtimePath, runtimeBytes);
  writeFileSync(path.join(root, '.bun-version'), '1.4.2\n');
  return { root, reportPath, runtimePath, runtimeBytes, runtimeSha256 };
}

test('snapshot byte guard covers both roots and rejects replacement despite readonly captured files', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'snapshot-byte-custody-'));
  const expected = {
    'src/fixture.ts': Buffer.from('current source'),
    'tooling/fixture.ts': Buffer.from('measurement tool'),
    'published-fixture/tests/unselected.test.mjs': Buffer.from('published unselected test'),
    'published-fixture/TESTING.md': Buffer.from('published resource'),
  };
  try {
    for (const [file, bytes] of Object.entries(expected)) {
      const target = path.join(root, file);
      mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
      writeFileSync(target, bytes, { mode: 0o400 });
    }
    const sidecar = path.join(root, 'published-fixture', '.TESTING.md.cas.lock');
    writeFileSync(sidecar, 'owned lock');
    expect(() => assertCoverageSnapshotBytes(root, expected)).not.toThrow();
    for (const [file, bytes] of Object.entries(expected)) {
      const target = path.join(root, file),
        replacement = target + '.replacement';
      writeFileSync(replacement, 'changed', { mode: 0o400 });
      renameSync(replacement, target);
      expect(() => assertCoverageSnapshotBytes(root, expected)).toThrow(/differs from its snapshot/);
      writeFileSync(replacement, bytes, { mode: 0o400 });
      renameSync(replacement, target);
    }
    rmSync(path.join(root, 'published-fixture', 'TESTING.md'));
    expect(() => assertCoverageSnapshotBytes(root, expected)).toThrow();
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// Untrusted denial-only data: no successful producer receipt or passing coverage is claimed.
test('decoded manifest shape and its SHA do not establish runtime or coverage provenance', async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'coverage-report-denial-'));
  const runId = '00000000-0000-0000-0000-000000000000';
  const manifestRelative = `coverage/bun-unified/runs/${runId}/manifest.json`;
  const manifestPath = path.join(root, manifestRelative);
  const reportPath = path.join(root, 'untrusted-report.json');
  const pin = readFileSync(path.join(packageRoot, '.bun-version'));
  const manifestBytes = Buffer.from(
    JSON.stringify({
      schema: 'VidaBunCoverageRun/v1',
      run_id: runId,
      bun_version: pin.toString('utf8').trim(),
      snapshot_directory: `coverage/bun-unified/runs/${runId}/snapshot`,
      sources: [],
      source_maps: [],
      runtime_executable_sha256: '0'.repeat(64),
    }),
  );
  const reportBytes = Buffer.from(
    JSON.stringify({
      schema: 'VidaBunCoverageReport/v1',
      run_id: runId,
      manifest_path: manifestRelative,
      manifest_sha256: createHash('sha256').update(manifestBytes).digest('hex'),
      runtime_executable_sha256: '0'.repeat(64),
      sources: [null],
      tests: [],
      test_inputs: [],
      tool_inputs: [],
      shards: [],
      processes: [],
      coverage: {},
    }),
  );
  try {
    mkdirSync(path.dirname(manifestPath), { recursive: true });
    writeFileSync(manifestPath, manifestBytes);
    writeFileSync(reportPath, reportBytes);
    writeFileSync(path.join(root, '.bun-version'), pin);
    let caught: unknown;
    try {
      await validateCoverageReport(reportPath, root);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(Error);
    if (!(caught instanceof Error)) throw new Error('Expected provenance denial.');
    expect(caught.message).toBe('Coverage report was not collected by the package-pinned Bun runtime.');
    expect(readFileSync(reportPath)).toEqual(reportBytes);
    expect(readFileSync(manifestPath)).toEqual(manifestBytes);
    expect(readFileSync(path.join(root, '.bun-version'))).toEqual(pin);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('public historical consumer retains shared manifest integrity denial', async () => {
  const fixture = await createSyntheticCoverageFixture();
  const artifactPath = path.join(fixture.root, 'retained-runtime-fixture');
  try {
    writeFileSync(artifactPath, Buffer.from('synthetic runtime bytes'));
    fixture.report.manifest_sha256 = '0'.repeat(64);
    const reportBytes = fixture.reportBytes();
    await expectRejection(
      validateHistoricalBaselineCoverageReport(fixture.reportPath, fixture.root, artifactPath, {
        reportBytes,
        requireFullCoverage: false,
      }),
      /Coverage manifest fingerprint mismatch/u,
    );
  } finally {
    fixture.remove();
  }
});

test('public historical consumer rejects explicit current-selection options', async () => {
  await expectRejection(
    validateHistoricalBaselineCoverageReport(
      '/unused/coverage-final.json',
      '/unused/package-root',
      '/unused/retained-bun',
      { testSelectionMode: 'current' },
    ),
    /cannot use the current test selection/u,
  );
});

test('public historical consumer binds the declared snapshot closure without archived producer tooling', async () => {
  const fixture = historicalRuntimeFixture();
  try {
    await expectRejection(
      validateHistoricalBaselineCoverageReport(fixture.reportPath, fixture.root, fixture.runtimePath),
      /Current coverage cannot adopt historical reference admission/u,
    );
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test('synthetic historical selection accepts its single declared and observed legacy evidence provider', async () => {
  const fixture = await historicalBootstrapFixture({ includeLegacyProvider: true });
  try {
    const result = await validateHistoricalBaselineCoverageReport(
      fixture.fixture.reportPath,
      fixture.fixture.root,
      fixture.runtimePath,
      { reportBytes: fixture.reportBytes, requireFullCoverage: false },
    );
    expect(result.processes).toBe(1);
    expect(result.report.published_reference).toMatchObject({
      kind: 'measurement_admitted',
      suite_passed: false,
      quality_passed: false,
    });
  } finally {
    fixture.fixture.remove();
  }
});

test('synthetic historical selection rejects an omitted legacy evidence bootstrap role', async () => {
  const fixture = await historicalBootstrapFixture();
  try {
    await expectRejection(
      validateHistoricalBaselineCoverageReport(fixture.fixture.reportPath, fixture.fixture.root, fixture.runtimePath, {
        reportBytes: fixture.reportBytes,
        requireFullCoverage: false,
      }),
      /Coverage bootstrap role is missing or ambiguous: coverage evidence/u,
    );
  } finally {
    fixture.fixture.remove();
  }
});

test('synthetic historical selection rejects duplicate current and legacy evidence providers', async () => {
  const fixture = await historicalBootstrapFixture({ includeLegacyProvider: true, includeCurrentProvider: true });
  try {
    await expectRejection(
      validateHistoricalBaselineCoverageReport(fixture.fixture.reportPath, fixture.fixture.root, fixture.runtimePath, {
        reportBytes: fixture.reportBytes,
        requireFullCoverage: false,
      }),
      /Coverage bootstrap role is missing or ambiguous: coverage evidence/u,
    );
  } finally {
    fixture.fixture.remove();
  }
});

test('synthetic historical selection rejects an unbound foreign same-basename bootstrap path', async () => {
  const fixture = await historicalBootstrapFixture({ includeLegacyProvider: true });
  try {
    const reportBytes = fixture.fixture.rewriteChildAndReceiptHash((child) => {
      const childRecord = testRecord(child, 'Synthetic process');
      if (!Array.isArray(childRecord.loaded_inputs)) throw new Error('Synthetic loaded inputs are missing.');
      childRecord.loaded_inputs.push({
        path: 'foreign/bun-coverage-evidence.mjs',
        sha256: 'f'.repeat(64),
      });
    });
    await expectRejection(
      validateHistoricalBaselineCoverageReport(fixture.fixture.reportPath, fixture.fixture.root, fixture.runtimePath, {
        reportBytes,
        requireFullCoverage: false,
      }),
      /Coverage process loaded an unbound local input/u,
    );
  } finally {
    fixture.fixture.remove();
  }
});

test('public historical consumer rejects retained runtime hash drift', async () => {
  const fixture = historicalRuntimeFixture();
  try {
    writeFileSync(fixture.runtimePath, Buffer.concat([fixture.runtimeBytes, Buffer.from('changed')]));
    await expectRejection(
      validateHistoricalBaselineCoverageReport(fixture.reportPath, fixture.root, fixture.runtimePath),
      /not bound to its retained package-pinned Bun runtime/u,
    );
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test('public historical consumer rejects a symlinked retained runtime', async () => {
  const fixture = historicalRuntimeFixture();
  const symlinkPath = path.join(fixture.root, 'runtime-link');
  try {
    symlinkSync(fixture.runtimePath, symlinkPath);
    await expectRejection(
      validateHistoricalBaselineCoverageReport(fixture.reportPath, fixture.root, symlinkPath),
      /regular file, not a symlink/u,
    );
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test('public historical consumer rejects historical package pin drift', async () => {
  const fixture = historicalRuntimeFixture();
  try {
    writeFileSync(path.join(fixture.root, '.bun-version'), '1.4.3\n');
    await expectRejection(
      validateHistoricalBaselineCoverageReport(fixture.reportPath, fixture.root, fixture.runtimePath),
      /not bound to its retained package-pinned Bun runtime/u,
    );
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});
