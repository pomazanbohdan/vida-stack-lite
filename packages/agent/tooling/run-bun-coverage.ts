import {
  chmodSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  readdirSync,
  renameSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { randomUUID } from 'node:crypto';
import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import coverageApi from 'istanbul-lib-coverage';
import { assertCoverageSnapshotBytes } from './bun-coverage-report-validator.js';
import { assertPublishedFixtureChildren, assertPublishedFixtureProcess } from './published-coverage-inputs.js';
import {
  historicalInventoryChildId,
  historicalReferenceJUnit,
  parseHistoricalReference,
} from './published-baseline-reference.js';
import { validateIstanbulFileCoverage as validateFileCoverage } from './coverage-counters.js';
import { acquireCoverageRunLock, releaseCoverageRunLock } from './coverage-run-lock.js';
import {
  coverageInputs,
  instrumentSource,
  isExternalModulePath,
  qualityFingerprint,
  readBunPin,
  sha256,
} from './bun-coverage-evidence.ts';

import type { FileCoverageData } from 'istanbul-lib-instrument';
import type { CoverageInputs, InputDigest } from './bun-coverage-evidence.ts';

type SourceDigest = InputDigest;
type RunManifest = {
  schema: 'VidaBunCoverageRun/v1';
  run_id: string;
  bun_version: string;
  snapshot_directory: string;
  source_fingerprint: string;
  test_fingerprint: string;
  test_selection: CoverageInputs['test_selection'];
  tool_fingerprint: string;
  runtime_executable_sha256: string;
  module_inputs: SourceDigest[];
  test_inputs: SourceDigest[];
  tool_inputs: SourceDigest[];
  execution_scope: Record<string, unknown>;
  active_argv: string[];
  tests: string[];
  sources: SourceDigest[];
  source_maps: Record<string, FileCoverageData>;
};
type ChildOutcome = {
  shard_id: 'bun-test';
  status: number | null;
  signal: NodeJS.Signals | null;
  error: string | null;
  unknown: boolean;
};

/** A qualified synchronous return observes only this producer, not its test effects or descendants. */
export function coverageProducerTerminalKnown(
  result: Pick<SpawnSyncReturns<unknown>, 'pid' | 'status' | 'signal'>,
): boolean {
  return Number.isInteger(result.pid) && result.pid > 0 && (Number.isInteger(result.status) || Boolean(result.signal));
}
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { createCoverageMap } = coverageApi;
const outputRoot = path.join(root, 'coverage', 'bun-unified');
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== '--published-baseline=b549951'))
    throw new Error('Unsupported Bun coverage runner argument.');
  if (args.length > 1) throw new Error('Bun coverage runner accepts one baseline selection flag.');
  const selectionMode = args.length ? 'published-baseline-bun-native' : 'current';
  const pinnedBun = await readBunPin(root);
  if (process.versions.bun !== pinnedBun) throw new Error(`Unified coverage requires Bun ${pinnedBun}.`);
  const preflightInputs = await coverageInputs(root, selectionMode);

  function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
  function record(value: unknown, description: string): Record<string, unknown> {
    if (!isRecord(value)) throw new Error(`Invalid Istanbul map: ${description}`);
    return value;
  }
  function writeAtomic(file: string, value: unknown) {
    const temporary = file + '.tmp-' + process.pid;
    writeFileSync(temporary, JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    renameSync(temporary, file);
  }
  function childEnvironment(
    manifest: RunManifest,
    manifestPath: string,
    reportDirectory: string,
    runId: string,
  ): NodeJS.ProcessEnv {
    const prior = process.env.BUN_OPTIONS ?? '';
    if (prior.trim()) throw new Error('Ambient BUN_OPTIONS are unsupported for coverage.');
    const environment = { ...process.env };
    delete environment.BUN_OPTIONS;
    return {
      ...environment,
      VIDA_BUN_COVERAGE_ROOT: root,
      VIDA_BUN_COVERAGE_MANIFEST: manifestPath,
      VIDA_BUN_COVERAGE_REPORT_DIRECTORY: reportDirectory,
      VIDA_BUN_COVERAGE_RUN_ID: runId,
      VIDA_BUN_COVERAGE_SHARD_ID: 'bun-test',
      VIDA_BUN_COVERAGE_SOURCE_FINGERPRINT: manifest.source_fingerprint,
      VIDA_BUN_COVERAGE_TEST_FINGERPRINT: manifest.test_fingerprint,
      VIDA_BUN_COVERAGE_TEST_SELECTION_MODE: manifest.test_selection.mode,
      VIDA_BUN_COVERAGE_TOOL_FINGERPRINT: manifest.tool_fingerprint,
      VIDA_BUN_COVERAGE_SNAPSHOT_DIRECTORY: path.join(root, ...manifest.snapshot_directory.split('/')),
      AGENT_RUNTIME_NATIVE_COVERAGE_MAIN: '1',
    };
  }
  function bunTestInvocation(tests: string[], manifest: RunManifest, manifestPath: string, reportDirectory: string) {
    const execution = manifest.test_selection.published_execution;
    const snapshotRoot = path.join(root, ...manifest.snapshot_directory.split('/'));
    const fixture = manifest.test_selection.published_fixture;
    if (execution && !fixture) throw new Error('Published baseline fixture root is missing.');
    const executionRoot = execution && fixture ? path.join(snapshotRoot, fixture.directory) : root;
    const args = execution
      ? execution.argv.map((arg) => snapshotArgument(arg, executionRoot))
      : ['test', '--parallel=1', '--no-isolate', `--config=${path.join(snapshotRoot, 'bunfig.toml')}`, ...tests];
    const configIndex = args.findIndex((arg) => arg.startsWith('--config='));
    if (configIndex < 0) throw new Error('Bun coverage invocation has no captured config.');
    args.splice(configIndex, 0, '--preload', path.join(snapshotRoot, 'tooling', 'bun-coverage-preload.ts'));
    if (execution)
      args.splice(
        configIndex,
        0,
        '--reporter=junit',
        '--reporter-outfile=' + path.join(reportDirectory, 'suite.junit.xml'),
      );
    const env = childEnvironment(manifest, manifestPath, reportDirectory, manifest.run_id);
    if (execution) {
      Object.assign(env, execution.env);
      // Moving exact tests into the captured tree retains their original configured root.
      env.AGENT_RUNTIME_TEST_REPOSITORY_ROOT = path.resolve(root, '../..');
    }
    env.VIDA_BUN_COVERAGE_ACTIVE_ARGV = JSON.stringify(args);
    return { args, env, cwd: executionRoot };
  }

  function snapshotArgument(argument: string, snapshotRoot: string) {
    for (const option of ['--env-file=', '--config='])
      if (argument.startsWith(option)) return option + path.join(snapshotRoot, argument.slice(option.length));
    return argument;
  }

  function sealSnapshotTree(directory: string, fixtureDependencyLink?: string, fixtureRoot?: string) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) {
        if (target !== fixtureDependencyLink || readlinkSync(target) !== path.join(root, 'node_modules'))
          throw new Error('Unexpected link in coverage snapshot: ' + target);
      } else if (entry.isDirectory()) sealSnapshotTree(target, fixtureDependencyLink, fixtureRoot);
      else chmodSync(target, 0o400);
    }
    // Published package reads retain their real sibling CAS sidecars. Files are
    // readonly and byte-checked; same-UID directory modes are not a sandbox.
    chmodSync(
      directory,
      fixtureRoot && (directory === fixtureRoot || directory.startsWith(fixtureRoot + path.sep)) ? 0o700 : 0o500,
    );
  }

  function requireSnapshotReceipt(receipt: Record<string, unknown>, manifest: RunManifest, name: string) {
    const sourcePaths = Object.keys(record(receipt.coverage, `${name}.coverage`)).map((file) =>
      path.relative(root, path.resolve(file)).replaceAll('\\', '/'),
    );
    assertPublishedFixtureProcess(manifest.test_selection.published_fixture, receipt, [
      ...manifest.tests,
      ...sourcePaths,
    ]);
    assertPublishedFixtureChildren(
      manifest.test_selection.published_fixture,
      receipt,
      manifest.test_selection.published_fixture
        ? path.join(root, manifest.snapshot_directory, manifest.test_selection.published_fixture.directory)
        : undefined,
    );
    requireSnapshotIdentity(receipt, manifest, name);
    requireSnapshotLoadedInputs(receipt, manifest, name);
  }

  function requireSnapshotIdentity(receipt: Record<string, unknown>, manifest: RunManifest, name: string) {
    if (
      JSON.stringify(receipt.module_inputs) !== JSON.stringify(manifest.module_inputs) ||
      JSON.stringify(receipt.execution_scope) !== JSON.stringify(manifest.execution_scope) ||
      JSON.stringify(receipt.active_argv) !== JSON.stringify(manifest.active_argv)
    )
      throw new Error('Coverage process snapshot metadata differs from its manifest: ' + name);
    const preload = manifest.tool_inputs.find((entry) => entry.path === 'tooling/bun-coverage-preload.ts');
    if (
      JSON.stringify(receipt.preload_input) !==
      JSON.stringify({ path: 'tooling/bun-coverage-preload.ts', sha256: preload?.sha256 })
    )
      throw new Error('Coverage process preload identity differs from its manifest: ' + name);
  }

  function requireSnapshotLoadedInputs(receipt: Record<string, unknown>, manifest: RunManifest, name: string) {
    requireExternalModuleInputs(receipt.external_module_inputs, name);
    const expected = new Map(
      [...manifest.sources, ...manifest.test_inputs, ...manifest.tool_inputs].map((entry) => [
        entry.path,
        entry.sha256,
      ]),
    );
    const loaded = receipt.loaded_inputs;
    if (!Array.isArray(loaded)) throw new Error('Coverage process loaded-input receipt is missing: ' + name);
    const loadedItems: unknown[] = loaded;
    const seen = snapshotLoadedPaths(loadedItems, expected, name);
    for (const test of manifest.tests)
      if (!seen.has(test)) throw new Error('Selected test was not snapshot-loaded: ' + test);
    for (const required of [
      'tooling/bun-coverage-preload.ts',
      'tooling/bun-coverage-evidence.ts',
      'tooling/maintained-source-inventory.ts',
    ])
      if (!seen.has(required)) throw new Error('Snapshot bootstrap dependency was not attested: ' + required);
  }

  function requireExternalModuleInputs(values: unknown, name: string) {
    if (!Array.isArray(values)) throw new Error('Coverage process external-module receipt is missing: ' + name);
    const seen = new Set<string>();
    const items: unknown[] = values;
    for (const value of items) {
      const item = record(value, `${name}.external-module`);
      if (
        typeof item.path !== 'string' ||
        typeof item.sha256 !== 'string' ||
        !/^[0-9a-f]{64}$/u.test(item.sha256) ||
        item.classification !== 'live-generated-local-module' ||
        seen.has(item.path) ||
        !isExternalModulePath(item.path)
      )
        throw new Error('Coverage process external-module classification is invalid: ' + name);
      seen.add(item.path);
    }
  }

  function snapshotLoadedPaths(loaded: unknown[], expected: Map<string, string>, name: string): Set<string> {
    const seen = new Set<string>();
    for (const value of loaded) {
      const item = record(value, `${name}.loaded-input`);
      if (
        typeof item.path !== 'string' ||
        typeof item.sha256 !== 'string' ||
        seen.has(item.path) ||
        expected.get(item.path) !== item.sha256
      )
        throw new Error('Coverage process loaded an unbound local input: ' + name);
      seen.add(item.path);
    }
    return seen;
  }

  function runBunTests(
    tests: string[],
    manifest: RunManifest,
    manifestPath: string,
    reportDirectory: string,
    invocation: { args: string[]; env: NodeJS.ProcessEnv; cwd: string },
  ): ChildOutcome & { producerTerminalKnown: boolean } {
    const result = spawnSync(process.execPath, invocation.args, {
      cwd: invocation.cwd,
      env: invocation.env,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      timeout: 30 * 60 * 1000,
      windowsHide: true,
    });
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    if (result.error || result.signal || !Number.isInteger(result.status))
      return {
        shard_id: 'bun-test',
        status: result.status,
        signal: result.signal,
        error: String(result.error ?? 'unknown terminal outcome'),
        unknown: true,
        producerTerminalKnown: coverageProducerTerminalKnown(result),
      };
    return {
      shard_id: 'bun-test',
      status: result.status,
      signal: null,
      error: null,
      unknown: false,
      producerTerminalKnown: coverageProducerTerminalKnown(result),
    };
  }

  const lock = acquireCoverageRunLock(outputRoot);
  let terminalKnown = true;
  let executionFailed = false;
  let executionError: unknown;
  try {
    const lockedInputs = await coverageInputs(root, selectionMode);
    if (qualityFingerprint(preflightInputs) !== qualityFingerprint(lockedInputs))
      throw new Error('Coverage inputs changed between preflight and locked capture.');
    const runId = randomUUID();
    const { input_bytes: inputBytes, ...evidence } = lockedInputs;
    const runDirectory = path.join(outputRoot, 'runs', runId);
    const snapshotDirectory = path.join(runDirectory, 'snapshot');
    const reportDirectory = path.join(runDirectory, 'processes');
    mkdirSync(snapshotDirectory, { recursive: true, mode: 0o700 });
    mkdirSync(reportDirectory, { recursive: true, mode: 0o700 });
    chmodSync(reportDirectory, 0o700);
    for (const [file, bytes] of Object.entries(inputBytes)) {
      const target = path.join(snapshotDirectory, ...file.split('/'));
      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(target, bytes, { flag: 'wx', mode: 0o400 });
    }
    const publishedFixture = evidence.test_selection.published_fixture;
    const fixtureRoot = publishedFixture ? path.join(snapshotDirectory, publishedFixture.directory) : undefined;
    const fixtureDependencyLink = fixtureRoot ? path.join(fixtureRoot, 'node_modules') : undefined;
    const fixtureOutputs = fixtureRoot
      ? [path.join(fixtureRoot, 'coverage'), path.join(fixtureRoot, 'coverage', 'bun-native')]
      : [];
    if (fixtureDependencyLink) symlinkSync(path.join(root, 'node_modules'), fixtureDependencyLink, 'dir');
    for (const directory of fixtureOutputs) mkdirSync(directory, { recursive: true, mode: 0o700 });
    sealSnapshotTree(snapshotDirectory, fixtureDependencyLink, fixtureRoot);
    // Published tests intentionally write coverage-subject scratch here. These
    // Outputs carry no measurement authority; captured files are byte-checked.
    for (const directory of fixtureOutputs) chmodSync(directory, 0o700);
    const sourceMapEntries: [string, FileCoverageData][] = evidence.sources.map((entry): [string, FileCoverageData] => {
      const absolute = path.resolve(root, entry.path);
      const bytes = inputBytes[entry.path];
      if (!bytes) throw new Error(`Immutable source snapshot is missing: ${entry.path}`);
      const source = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      return [absolute, instrumentSource(absolute, source).fileCoverage];
    });
    const sourceMaps: Record<string, FileCoverageData> = Object.fromEntries(sourceMapEntries);
    const snapshotRelative = path.relative(root, snapshotDirectory).replaceAll('\\', '/');
    const manifest: RunManifest = {
      schema: 'VidaBunCoverageRun/v1',
      run_id: runId,
      bun_version: pinnedBun,
      runtime_executable_sha256: sha256(readFileSync(process.execPath)),
      snapshot_directory: snapshotRelative,
      ...evidence,
      test_selection: evidence.test_selection,
      source_maps: sourceMaps,
      execution_scope: {
        ...(publishedFixture
          ? {
              fixture_child_scope: 'direct-child-process-api',
              fixture_dependency_root: path.join(root, 'node_modules'),
              fixture_subject_output_root: 'published-fixture/coverage',
            }
          : {}),
        captured_local_modules:
          'Bun child loads maintained Source, selected test inputs, test helpers, and declared local JavaScript/TypeScript/JSON tooling modules from the captured per-run snapshot; actual intercepted paths and SHA-256 digests are recorded in each process receipt.',
        generated_local_modules:
          'Local modules outside declared src, bin, tests, and tooling roots may load live generated fixture bytes; each returned path and digest is classified separately in the process receipt and is outside snapshot custody.',
        launcher:
          'The already-running coverage launcher executes from the checkout and is fingerprinted as a declared tool input; it is not restarted from the child snapshot. Bun loads the captured preload through an explicit CLI option, not inherited BUN_OPTIONS, so coverage instrumentation does not propagate into spawned child processes. The final CRAP subprocess executes the captured tool closure with the original package root, has a finite five-minute deadline, and retains the run lock for unknown termination.',
        published_configuration:
          'Published baseline tests, subjects, env-file and Bun config resolve from their disjoint captured fixture root. Regular files are read-only and byte-checked; fixture directories permit CAS sidecars without claiming filesystem confinement. Original configured repository ancestry is retained through the published test helper environment option. The fixture input modes, Git blobs and SHA-256 digests are bound in test selection; current captured tools alone measure and admit results.',
        snapshot_limits: { max_file_bytes: 4194304, max_total_bytes: 134217728, max_paths: 20000, max_depth: 64 },
        installed_dependencies:
          'Locked installed npm dependencies resolve from package node_modules; their bytes are trusted declared inputs, not copied or attested per process.',
        runtime_and_environment:
          'Bun runtime, stdlib modules, schema/runtime files outside declared inputs, non-module filesystem reads, and inherited environment are outside snapshot custody; ambient BUN_OPTIONS is rejected.',
      },
      active_argv: [],
    };
    const manifestPath = path.join(runDirectory, 'manifest.json');
    const invocation = bunTestInvocation(evidence.tests, manifest, manifestPath, reportDirectory);
    manifest.active_argv = invocation.args;
    writeAtomic(manifestPath, manifest);
    chmodSync(runDirectory, 0o500);
    const { producerTerminalKnown, ...outcome } = runBunTests(
      evidence.tests,
      manifest,
      manifestPath,
      reportDirectory,
      invocation,
    );
    if (outcome.unknown) {
      terminalKnown = producerTerminalKnown;
      throw new Error(
        producerTerminalKnown
          ? 'Bun Test outcome is UNKNOWN; direct coverage producer terminated; preserve run directory and test-effect custody.'
          : 'Bun Test outcome is UNKNOWN; preserve lock and run directory.',
      );
    }
    if (outcome.status !== 0 && !(publishedFixture && outcome.status === 1))
      throw new Error('Bun Test coverage suite failed.');
    const historicalJUnitBytes =
      publishedFixture && outcome.status === 1
        ? readFileSync(path.join(reportDirectory, 'suite.junit.xml'))
        : undefined;
    if (historicalJUnitBytes) historicalReferenceJUnit(historicalJUnitBytes, fixtureRoot!, evidence.tests);
    let historicalInventory: { process_file: string; pid: number; child_id: number } | undefined;
    if (publishedFixture) assertCoverageSnapshotBytes(snapshotDirectory, inputBytes);

    const reportFiles = readdirSync(reportDirectory)
      .filter((file) => file.endsWith('.json'))
      .sort();
    if (!reportFiles.length) throw new Error('Bun coverage run produced no per-process reports.');
    const merged = createCoverageMap(structuredClone(manifest.source_maps));
    const processReceipts: { file: string; pid: number; shard_id: 'bun-test'; sha256: string }[] = [];
    const expectedPaths = evidence.sources.map((entry) => path.resolve(root, entry.path)).sort();
    const manifestDigest = sha256(readFileSync(manifestPath));
    for (const name of reportFiles) {
      const reportPath = path.join(reportDirectory, name);
      const processBytes = readFileSync(reportPath);
      const reportValue: unknown = JSON.parse(processBytes.toString('utf8'));
      const report = record(reportValue, `${name}.report`);
      if (
        report.schema !== 'VidaBunCoverageProcess/v1' ||
        report.run_id !== runId ||
        report.shard_id !== 'bun-test' ||
        report.source_fingerprint !== manifest.source_fingerprint ||
        report.test_fingerprint !== manifest.test_fingerprint ||
        report.tool_fingerprint !== manifest.tool_fingerprint ||
        report.runtime_executable_sha256 !== manifest.runtime_executable_sha256 ||
        JSON.stringify(report.sources) !== JSON.stringify(evidence.sources)
      )
        throw new Error('Foreign or stale per-process coverage report: ' + name);
      if (typeof report.pid !== 'number' || !Number.isSafeInteger(report.pid) || report.pid < 1)
        throw new Error('Invalid coverage report process identity.');
      requireSnapshotReceipt(report, manifest, name);
      if (historicalJUnitBytes && publishedFixture && fixtureRoot) {
        if (historicalInventory) throw new Error('Historical inventory has duplicate process observations.');
        historicalInventory = {
          process_file: name,
          pid: report.pid,
          child_id: historicalInventoryChildId(report, publishedFixture, fixtureRoot),
        };
      }
      const coverage = record(report.coverage, `${name}.coverage`);
      const paths = Object.keys(coverage)
        .map((file) => path.resolve(file))
        .sort();
      if (paths.some((file) => !expectedPaths.includes(file)))
        throw new Error('Per-process report contains an unexpected source: ' + name);
      for (const file of paths)
        validateFileCoverage(
          file,
          record(coverage[file], `${name}.${file}`),
          record(manifest.source_maps[file], `manifest.${file}`),
        );
      merged.merge(coverage);
      processReceipts.push({
        file: name,
        pid: report.pid,
        shard_id: 'bun-test',
        sha256: sha256(processBytes),
      });
    }
    const mergedPaths = merged
      .files()
      .map((file) => path.resolve(file))
      .sort();
    if (JSON.stringify(mergedPaths) !== JSON.stringify(expectedPaths))
      throw new Error('Merged coverage source set differs from maintained inventory.');
    const publishedReference = historicalJUnitBytes
      ? parseHistoricalReference(
          {
            schema: 'PublishedBaselineReference/v1',
            kind: 'measurement_admitted',
            suite_passed: false,
            quality_passed: false,
            failure_id: 'b549951/mutation-inventory-gap-37',
            junit: {
              path: path.relative(root, path.join(reportDirectory, 'suite.junit.xml')).replaceAll('\\', '/'),
              sha256: sha256(historicalJUnitBytes),
              bytes: historicalJUnitBytes.length,
            },
            inventory: historicalInventory,
          },
          runId,
        )
      : undefined;
    const finalReport = {
      ...(publishedReference ? { published_reference: publishedReference } : {}),
      schema: 'VidaBunCoverageReport/v1',
      run_id: runId,
      manifest_path: path.relative(root, manifestPath).replaceAll('\\', '/'),
      manifest_sha256: manifestDigest,
      sources: manifest.sources,
      tests: evidence.tests,
      test_selection: evidence.test_selection,
      module_inputs: manifest.module_inputs,
      execution_scope: manifest.execution_scope,
      active_argv: manifest.active_argv,
      test_inputs: evidence.test_inputs,
      tool_inputs: evidence.tool_inputs,
      source_maps: manifest.source_maps,
      source_fingerprint: manifest.source_fingerprint,
      test_fingerprint: manifest.test_fingerprint,
      tool_fingerprint: manifest.tool_fingerprint,
      runtime_executable_sha256: manifest.runtime_executable_sha256,
      shards: [outcome],
      processes: processReceipts,
      coverage: merged.toJSON(),
    };
    const finalPath = path.join(outputRoot, 'coverage-final.json');
    writeAtomic(finalPath, finalReport);
    if (publishedReference) {
      process.stderr.write(
        'Historical measurement admitted; published suite remains FAIL, current quality remains unqualified.\n',
      );
      process.exitCode = 1;
    }
    for (const gateScript of selectionMode === 'current' ? ['tooling/crap-gate.ts'] : []) {
      const capturedGate = path.join(snapshotDirectory, ...gateScript.split('/'));
      const gate = spawnSync(process.execPath, [capturedGate], {
        cwd: root,
        env: { ...process.env, VIDA_BUN_COVERAGE_ROOT: root, VIDA_BUN_COVERAGE_REPORT: finalPath },
        timeout: 5 * 60 * 1000,
        killSignal: 'SIGKILL',
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
        windowsHide: true,
      });
      process.stdout.write(gate.stdout ?? '');
      process.stderr.write(gate.stderr ?? '');
      if (gate.error || gate.signal || gate.status === null) {
        terminalKnown = coverageProducerTerminalKnown(gate);
        throw new Error(
          terminalKnown
            ? `${gateScript} outcome is UNKNOWN; direct gate producer terminated; preserve run evidence.`
            : `${gateScript} outcome is UNKNOWN; preserve the run lock for reconciliation.`,
        );
      }
      if (gate.status !== 0) throw new Error(`${gateScript} failed.`);
    }
  } catch (error) {
    executionFailed = true;
    executionError = error;
  }
  let cleanupFailed = false;
  let cleanupError: unknown;
  if (terminalKnown) {
    try {
      if (!releaseCoverageRunLock(lock)) throw new Error('Owned coverage lock disappeared before terminal cleanup.');
    } catch (error) {
      cleanupFailed = true;
      cleanupError = error;
    }
  }
  if (executionFailed && cleanupFailed)
    throw new AggregateError([executionError, cleanupError], 'Coverage execution and lock cleanup both failed.');
  if (executionFailed) throw executionError;
  if (cleanupFailed) throw cleanupError;
}
