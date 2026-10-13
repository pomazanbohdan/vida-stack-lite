import { expect, test } from 'bun:test';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { captureCoverageConsumerBinding } from '../tooling/coverage-consumer-binding.ts';
import { expectRejection } from './helpers/expect-rejection.ts';
import { instrumentSource, sha256 } from '../tooling/bun-coverage-evidence.ts';
import { validateCoverageReport } from '../tooling/bun-coverage-report-validator.ts';
import { prepareCoverageRunnerInputs, restoreOwnedCoverageDirectoryWrites } from './helpers/coverage-fixture.ts';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function write(root: string, file: string, bytes: string | Uint8Array): void {
  const absolute = path.join(root, file);
  mkdirSync(path.dirname(absolute), { recursive: true });
  writeFileSync(absolute, bytes);
}
function record(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected fixture record');
  return value as Record<string, unknown>;
}

// Real producer over inert owned Source, not candidate quality or historical evidence.
// Its final CRAP stage must fail because this fixture has no published Git baseline.
test('real producer and consumer preserve pristine initialization maps while merging executed counters', async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'coverage-map-custody-'));
  const consumerConfiguration = await captureCoverageConsumerBinding(packageRoot, process.env);
  let passed = false;
  try {
    prepareCoverageRunnerInputs(root, packageRoot, ['src/**']);
    write(root, 'src/sum.ts', 'export function sum(a: number, b: number): number { return a + b; }\n');
    write(
      root,
      'tests/sum.test.ts',
      "import {test,expect} from 'bun:test'; import {sum} from '../src/sum.ts'; import {assertConfiguredContext} from './configured-context.ts'; test('owned sum assertion',()=>{assertConfiguredContext(); expect(sum(2,3)).toBe(5);});\n",
    );
    write(
      root,
      'tests/configured-context.ts',
      `import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
function record(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected manifest record');
  return value as Record<string, unknown>;
}
export function assertConfiguredContext(): void {
  const repositoryRoot = process.env.AGENT_RUNTIME_TEST_REPOSITORY_ROOT;
  const manifestPath = process.env.VIDA_BUN_COVERAGE_MANIFEST;
  if (!repositoryRoot || !manifestPath) throw new Error('Captured consumer root was not propagated to the test child.');
  const manifest = record(JSON.parse(readFileSync(manifestPath, 'utf8')));
  const scope = record(manifest.execution_scope);
  const consumer = record(scope.consumer_configuration);
  assert.equal(repositoryRoot, consumer.repository_root, 'child env root must match captured consumer configuration');
  assert.notEqual(repositoryRoot, process.env.VIDA_BUN_COVERAGE_ROOT, 'consumer root must differ from package root');
  assert.notEqual(repositoryRoot, process.env.VIDA_BUN_COVERAGE_SNAPSHOT_DIRECTORY, 'consumer root must differ from snapshot');
}
`,
    );
    write(root, 'bunfig.toml', '[test]\nroot = "./tests"\n');
    write(root, 'schemas/inert.json', '{}\n');
    write(root, 'templates/inert.yaml', 'inert: true\n');
    write(root, 'instructions/inert.md', 'inert\n');
    symlinkSync(path.join(packageRoot, 'node_modules'), path.join(root, 'node_modules'), 'dir');
    const observationPath = path.join(root, 'coverage-launch-observations.json');
    const capturePath = path.join(root, 'coverage-capture-observation.json');
    const preloadPath = path.join(root, 'tooling/coverage-launch-observer-preload.ts');
    write(
      root,
      'tooling/coverage-launch-observer-preload.ts',
      `import * as childProcess from 'node:child_process';
import * as evidence from './bun-coverage-evidence.ts';
import { mock } from 'bun:test';
import { writeFileSync } from 'node:fs';
const observations: Array<Record<string, unknown>> = [];
const run = childProcess.spawnSync;
const runAsync = childProcess.spawn;
import * as consumerBinding from './coverage-consumer-binding.ts';
const capturedConsumerConfiguration = ${JSON.stringify(consumerConfiguration)};
mock.module('./coverage-consumer-binding.ts', () => ({
  ...consumerBinding,
  async captureCoverageConsumerBinding() { return capturedConsumerConfiguration; },
}));
mock.module('node:child_process', () => ({
  ...childProcess,
  spawnSync(command: string, args: string[], options: Record<string, unknown>) {
    const started_ms = performance.now();
    const phase = args[0] === 'run' && args[1] === 'typecheck:pinned' ? 'typecheck' :
      args[0] === 'test' ? 'test' : 'crap';
    const result = run(command, args, options);
    observations.push({ phase, started_ms, finished_ms: performance.now(), timeout_ms: options.timeout,
      pid: result.pid, status: result.status, signal: result.signal });
    writeFileSync(${JSON.stringify(observationPath)}, JSON.stringify(observations));
    return result;
  },
  spawn(command: string, args: string[], options: Record<string, unknown>) {
    const started_ms = performance.now();
    const child = runAsync(command, args, options as Parameters<typeof childProcess.spawn>[2]);
    let spawnError: unknown;
    child.once('error', (error) => { spawnError = error; });
    child.once('close', (status, signal) => {
      const childEnvironment = options.env as NodeJS.ProcessEnv | undefined;
      observations.push({ phase: 'test', started_ms, finished_ms: performance.now(), timeout_ms: options.timeout,
        pid: child.pid, status, signal, error: spawnError === undefined ? null : String(spawnError),
        consumer_repository_root: childEnvironment?.AGENT_RUNTIME_TEST_REPOSITORY_ROOT ?? null,
        stdio: options.stdio, kill_signal: options.killSignal, buffered_output: Object.hasOwn(options, 'maxBuffer'),
        test_timeout: args[args.indexOf('--timeout') + 1] });
      writeFileSync(${JSON.stringify(observationPath)}, JSON.stringify(observations));
    });
    return child;
  },
}));
let captureCalls = 0;
const captureInputs = evidence.coverageInputs;
mock.module('./bun-coverage-evidence.ts', () => ({
  ...evidence,
  async coverageInputs(...args: Parameters<typeof evidence.coverageInputs>) {
    captureCalls += 1;
    const captured = await captureInputs(...args);
    writeFileSync(${JSON.stringify(capturePath)}, JSON.stringify({ calls: captureCalls }));
    return captured;
  },
}));
`,
    );
    const producerEnvironment: NodeJS.ProcessEnv = {
      ...process.env,
      BUN_OPTIONS: '',
      VIDA_PINNED_COMMAND_BUDGET_MS: '36000',
      VIDA_PINNED_COMMAND_DEADLINE_MS: String(Date.now() + 36000),
    };
    delete producerEnvironment.AGENT_RUNTIME_TEST_REPOSITORY_ROOT;
    const child = spawnSync(
      process.execPath,
      ['--preload', preloadPath, path.join(root, 'tooling/run-bun-coverage.ts')],
      {
        cwd: root,
        encoding: 'utf8',
        timeout: 15000,
        maxBuffer: 4 * 1024 * 1024,
        env: producerEnvironment,
      },
    );
    write(root, 'child.stdout.log', child.stdout ?? '');
    write(root, 'child.stderr.log', child.stderr ?? '');
    expect(child.error).toBeUndefined();
    expect(child.signal).toBeNull();
    expect(child.status).toBe(1);
    expect(child.stderr).toMatch(/cannot identify the Source repository root/u);
    expect(child.stderr).toMatch(/Ran 1 test across 1 file/u);
    expect(readFileSync(path.join(root, 'typecheck.marker'), 'utf8')).toBe('ran');
    const capture: unknown = JSON.parse(readFileSync(capturePath, 'utf8'));
    expect(capture).toEqual({ calls: 1 });
    const launches: unknown = JSON.parse(readFileSync(observationPath, 'utf8'));
    if (!Array.isArray(launches)) throw new Error('Coverage child observations are missing.');
    expect(launches.map((value) => record(value).phase)).toEqual(['typecheck', 'test', 'crap']);
    const timeoutFor = (index: number): number => {
      const row: unknown = launches[index];
      if (typeof row !== 'object' || row === null || !('timeout_ms' in row) || typeof row.timeout_ms !== 'number')
        throw new Error('Observed child timeout is missing.');
      return row.timeout_ms;
    };
    const typecheckTimeout = timeoutFor(0);
    const testTimeout = timeoutFor(1);
    const crapTimeout = timeoutFor(2);
    expect(typecheckTimeout).toBeGreaterThan(0);
    expect(typecheckTimeout).toBeLessThanOrEqual(6000);
    expect(typecheckTimeout).toBeGreaterThan(testTimeout);
    expect(testTimeout).toBeGreaterThan(crapTimeout);
    expect(crapTimeout).toBeGreaterThan(0);
    expect(crapTimeout).toBeLessThan(300000);
    const producer = record(launches[1]);
    expect(producer.pid).toBeGreaterThan(0);
    expect(producer.status).toBe(0);
    expect(producer.signal).toBeNull();
    expect(producer.error).toBeNull();
    expect(producer.stdio).toEqual(['ignore', 'inherit', 'inherit']);
    expect(producer.kill_signal).toBe('SIGKILL');
    expect(producer.buffered_output).toBe(false);
    expect(producer.test_timeout).toBe('5000');
    expect(producer.consumer_repository_root).toBe(consumerConfiguration.repository_root);
    let priorFinish = -Infinity;
    for (const value of launches) {
      const row = record(value);
      expect(row.started_ms).toBeGreaterThanOrEqual(priorFinish);
      expect(row.finished_ms).toBeGreaterThan(row.started_ms as number);
      if (typeof row.finished_ms !== 'number') throw new Error('Observed child finish time is missing.');
      priorFinish = row.finished_ms;
    }
    const reportPath = path.join(root, 'coverage/bun-unified/coverage-final.json');
    const report = record(JSON.parse(readFileSync(reportPath, 'utf8')));
    const manifest = record(JSON.parse(readFileSync(path.join(root, String(report.manifest_path)), 'utf8')));
    expect(manifest.schema).toBe('VidaBunCoverageRun/v2');
    expect(report.source_maps).toEqual(manifest.source_maps);
    const rows = manifest.instrumented_sources;
    expect(Array.isArray(rows)).toBe(true);
    if (!Array.isArray(rows)) throw new Error('Producer instrumented source rows are missing.');
    expect(rows.map((entry) => record(entry).path)).toEqual(
      (manifest.sources as Array<{ path: string }>).map(({ path: sourcePath }) => sourcePath),
    );
    const snapshotRoot = path.join(root, String(manifest.snapshot_directory));
    for (const entry of manifest.sources as Array<{ path: string; sha256: string }>) {
      const row = rows.map((value) => record(value)).find((value) => value.path === entry.path);
      if (!row || typeof row.artifact_path !== 'string' || typeof row.artifact_sha256 !== 'string')
        throw new Error('Producer instrumented source artifact binding is missing.');
      expect(row.source_sha256).toBe(entry.sha256);
      expect(row.artifact_path).toBe(`__coverage_instrumented__/${entry.path}`);
      const artifactBytes = readFileSync(path.join(snapshotRoot, row.artifact_path));
      expect(sha256(artifactBytes)).toBe(row.artifact_sha256);
      const sourceBytes = readFileSync(path.join(root, entry.path));
      const canonicalCode = Buffer.from(
        instrumentSource(path.join(root, entry.path), new TextDecoder('utf-8', { fatal: true }).decode(sourceBytes))
          .code,
      );
      expect(artifactBytes.equals(canonicalCode)).toBe(true);
    }
    const source = path.join(root, 'src/sum.ts');
    const initialization = record(record(report.source_maps)[source]);
    const executed = record(record(report.coverage)[source]);
    expect(Object.values(record(initialization.f))).toEqual([0]);
    expect(Object.values(record(executed.f))).toEqual([1]);
    const priorConsumerRoot = process.env.AGENT_RUNTIME_TEST_REPOSITORY_ROOT;
    process.env.AGENT_RUNTIME_TEST_REPOSITORY_ROOT = consumerConfiguration.repository_root;
    let result: Awaited<ReturnType<typeof validateCoverageReport>>;
    try {
      result = await validateCoverageReport(reportPath, root, { requireFullCoverage: false });
      // Altered receipt controls are synthetic negatives, not additional producer evidence.
      const manifestPath = path.join(root, String(report.manifest_path));
      const manifestBytes = readFileSync(manifestPath);
      const receipts = report.processes;
      if (!Array.isArray(receipts) || receipts.length !== 1) throw new Error('Expected one native receipt.');
      const receipt = record(receipts[0]);
      const receiptPath = path.join(path.dirname(manifestPath), 'processes', String(receipt.file));
      const receiptBytes = readFileSync(receiptPath);
      const originalChild = record(JSON.parse(receiptBytes.toString('utf8')));
      chmodSync(manifestPath, 0o600);
      for (const missing of [true, false]) {
        const alteredManifest = structuredClone(manifest);
        const scope = record(alteredManifest.execution_scope);
        if (missing) delete scope.consumer_configuration;
        else record(scope.consumer_configuration).source_digest = '0'.repeat(64);
        const alteredManifestBytes = Buffer.from(JSON.stringify(alteredManifest));
        writeFileSync(manifestPath, alteredManifestBytes);
        const alteredChildBytes = Buffer.from(JSON.stringify({ ...originalChild, execution_scope: scope }));
        writeFileSync(receiptPath, alteredChildBytes);
        const alteredReport = {
          ...report,
          execution_scope: scope,
          manifest_sha256: sha256(alteredManifestBytes),
          processes: [{ ...receipt, sha256: sha256(alteredChildBytes) }],
        };
        await expectRejection(
          validateCoverageReport(reportPath, root, {
            requireFullCoverage: false,
            reportBytes: Buffer.from(JSON.stringify(alteredReport)),
          }),
          missing ? /binding is malformed/ : /changed since collection: source_digest/,
        );
      }
      writeFileSync(manifestPath, manifestBytes);
      chmodSync(manifestPath, 0o400);
      writeFileSync(receiptPath, receiptBytes);
    } finally {
      if (priorConsumerRoot === undefined) delete process.env.AGENT_RUNTIME_TEST_REPOSITORY_ROOT;
      else process.env.AGENT_RUNTIME_TEST_REPOSITORY_ROOT = priorConsumerRoot;
    }
    expect(result.processes).toBe(1);
    const canonical = result.canonical_source_maps[source];
    if (!canonical) throw new Error('Canonical Source map missing');
    expect(Object.values(canonical.f)).toEqual([0]);
    expect(canonical).not.toBe(result.report.source_maps[source]);
    expect(canonical).not.toBe(result.coverage[source]);
    expect(Object.values(result.coverage[source]?.f ?? {})).toEqual([1]);
    expect(result.report.shards[0]?.status).toBe(0);
    passed = true;
  } finally {
    if (passed) {
      restoreOwnedCoverageDirectoryWrites(root);
      rmSync(root, { recursive: true, force: true });
    } else console.error('Preserved failed real map fixture: ' + root);
  }
}, 20000);
