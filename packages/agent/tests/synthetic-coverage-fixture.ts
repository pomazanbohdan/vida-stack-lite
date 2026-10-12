/**
 * UNTRUSTED SYNTHETIC VALIDATOR FIXTURE.
 * This assembles cooperative receipt JSON for contract testing; it does not run
 * Bun tests or a coverage producer and proves no genuine provenance or coverage.
 * Test-only helper beside the owning native validator tests.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { coverageToolInputs, coverageInputs, instrumentSource, sha256 } from '../tooling/bun-coverage-evidence.ts';

type InstrumentedFile = ReturnType<typeof instrumentSource>['fileCoverage'];
type CoverageMap = Record<string, InstrumentedFile>;
type JsonRecord = Record<string, unknown>;

const sourcePaths = [
  'src/host-state.ts',
  'src/lifecycle/lifecycle-state.ts',
  'src/orchestration/persistent-session-handoff.ts',
  'src/orchestration/session-handoff.ts',
  'src/runtime-kernel.ts',
];
const bootstrapPaths = [
  'tooling/bun-coverage-preload.ts',
  'tooling/bun-coverage-evidence.ts',
  'tooling/coverage-instrumented-sources.ts',
  'tooling/source-instrumentation.ts',
  'tooling/maintained-source-inventory.ts',
];
const executionScope = { kind: 'synthetic-validator-fixture' };
const activeArgv = ['bun', 'test', 'tests/fixture.test.mjs'];

export type SyntheticFixture = {
  readonly root: string;
  readonly reportPath: string;
  readonly report: JsonRecord;
  readonly manifest: JsonRecord;
  readonly child: JsonRecord;
  readonly processPath: string;
  readonly snapshotDirectory: string;
  /** Persist a child change, match report counters, and update the receipt SHA. */
  rewriteChildAndReceiptHash(change: (child: JsonRecord) => void): Uint8Array;
  reportBytes(): Uint8Array;
  remove(): void;
};

function write(root: string, relative: string, bytes: string | Uint8Array): void {
  const target = path.join(root, relative);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, bytes);
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

export async function createSyntheticCoverageFixture(
  options: { legacyManifest?: boolean } = {},
): Promise<SyntheticFixture> {
  const root = mkdtempSync(path.join(os.tmpdir(), 'untrusted-coverage-validator-'));
  let succeeded = false;
  try {
    // The helper lives beside the owning tests; `../` is packages/agent.
    const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../');
    const pinBytes = readFileSync(path.join(packageRoot, '.bun-version'));
    write(root, '.bun-version', pinBytes);
    write(root, 'package.json', JSON.stringify({ files: ['src/**', 'bin/**'], scripts: {} }));
    for (const source of sourcePaths) write(root, source, 'export const fixture = true;\n');
    write(root, 'bin/cli-metadata.ts', 'export const fixture = true;\n');
    write(root, 'tests/fixture.test.mjs', "import { test } from 'bun:test'; test('inert fixture', () => {});\n");
    for (const file of coverageToolInputs) {
      if (file === '.bun-version' || file === 'package.json') continue;
      write(root, file, 'UNTRUSTED SYNTHETIC TOOL INPUT\n');
    }
    write(root, 'schemas/fixture.schema.json', '{}\n');
    write(root, 'templates/fixture.template.yaml', 'fixture: true\n');
    write(root, 'instructions/fixture.md', 'fixture\n');

    // Exactly one capture supplies all fingerprints, bytes, and child bindings.
    const inputs = await coverageInputs(root);
    const runId = randomUUID();
    const receiptNonce = randomUUID();
    const pid = process.pid;
    const runRelative = path.posix.join('coverage/bun-unified/runs', runId);
    const snapshotRelative = path.posix.join(runRelative, 'snapshot');
    const snapshotDirectory = path.join(root, ...snapshotRelative.split('/'));
    for (const [file, bytes] of Object.entries(inputs.input_bytes)) write(snapshotDirectory, file, bytes);

    const sourceMaps: CoverageMap = {};
    const instrumentedSources: Array<{
      path: string;
      source_sha256: string;
      artifact_path: string;
      artifact_sha256: string;
    }> = [];
    for (const source of inputs.sources) {
      const bytes = inputs.input_bytes[source.path];
      if (!bytes) throw new Error(`Fixture capture omitted source bytes: ${source.path}`);
      const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      const absolute = path.resolve(root, source.path);
      const instrumented = instrumentSource(absolute, text);
      sourceMaps[absolute] = instrumented.fileCoverage;
      if (!options.legacyManifest) {
        const artifactPath = `__coverage_instrumented__/${source.path}`;
        const artifactBytes = Buffer.from(instrumented.code);
        write(snapshotDirectory, artifactPath, artifactBytes);
        instrumentedSources.push({
          path: source.path,
          source_sha256: source.sha256,
          artifact_path: artifactPath,
          artifact_sha256: sha256(artifactBytes),
        });
      }
    }
    const coverage: CoverageMap = clone(sourceMaps);
    const runtimeHash = sha256(readFileSync(process.execPath));
    const manifestPath = path.posix.join(runRelative, 'manifest.json');
    const manifest: JsonRecord = {
      schema: options.legacyManifest ? 'VidaBunCoverageRun/v1' : 'VidaBunCoverageRun/v2',
      run_id: runId,
      bun_version: new TextDecoder().decode(pinBytes).trim(),
      runtime_executable_sha256: runtimeHash,
      snapshot_directory: snapshotRelative,
      sources: inputs.sources,
      source_fingerprint: inputs.source_fingerprint,
      tests: inputs.tests,
      test_selection: inputs.test_selection,
      test_inputs: inputs.test_inputs,
      test_fingerprint: inputs.test_fingerprint,
      tool_inputs: inputs.tool_inputs,
      tool_fingerprint: inputs.tool_fingerprint,
      module_inputs: inputs.module_inputs,
      execution_scope: executionScope,
      active_argv: activeArgv,
      source_maps: sourceMaps,
      ...(options.legacyManifest ? {} : { instrumented_sources: instrumentedSources }),
    };
    const manifestBytes = Buffer.from(JSON.stringify(manifest));
    write(root, manifestPath, manifestBytes);

    const preload = inputs.tool_inputs.find(({ path: file }) => file === 'tooling/bun-coverage-preload.ts');
    if (!preload) throw new Error('Fixture capture omitted the preload binding.');
    const boundByPath = new Map(
      [...inputs.sources, ...inputs.test_inputs, ...inputs.tool_inputs].map((entry) => [entry.path, entry.sha256]),
    );
    const loadedInputs = [...new Set([...inputs.tests, ...bootstrapPaths])].map((file) => {
      const digest = boundByPath.get(file);
      if (!digest) throw new Error(`Fixture capture omitted loaded input binding: ${file}`);
      return { path: file, sha256: digest };
    });
    const child: JsonRecord = {
      schema: 'VidaBunCoverageProcess/v1',
      run_id: runId,
      shard_id: 'bun-test',
      source_fingerprint: inputs.source_fingerprint,
      test_fingerprint: inputs.test_fingerprint,
      tool_fingerprint: inputs.tool_fingerprint,
      runtime_executable_sha256: runtimeHash,
      test_selection: inputs.test_selection,
      pid,
      sources: inputs.sources,
      module_inputs: inputs.module_inputs,
      execution_scope: executionScope,
      active_argv: activeArgv,
      preload_input: { path: preload.path, sha256: preload.sha256 },
      external_module_inputs: [],
      loaded_inputs: loadedInputs,
      coverage,
    };
    const receiptName = `${runId}.bun-test.1.${receiptNonce}.json`;
    const processPath = path.join(root, ...runRelative.split('/'), 'processes', receiptName);
    const reportPath = path.join(root, 'untrusted-report.json');
    const report: JsonRecord = {
      schema: 'VidaBunCoverageReport/v1',
      run_id: runId,
      manifest_path: manifestPath,
      manifest_sha256: sha256(manifestBytes),
      runtime_executable_sha256: runtimeHash,
      sources: inputs.sources,
      tests: inputs.tests,
      test_selection: inputs.test_selection,
      test_inputs: inputs.test_inputs,
      tool_inputs: inputs.tool_inputs,
      module_inputs: inputs.module_inputs,
      source_fingerprint: inputs.source_fingerprint,
      test_fingerprint: inputs.test_fingerprint,
      tool_fingerprint: inputs.tool_fingerprint,
      execution_scope: executionScope,
      active_argv: activeArgv,
      source_maps: sourceMaps,
      shards: [{ shard_id: 'bun-test', status: 0, signal: null, error: null, unknown: false }],
      processes: [],
      coverage,
    };

    const writeChildAndReceipt = (): Uint8Array => {
      const childBytes = Buffer.from(JSON.stringify(child));
      write(root, path.relative(root, processPath).replaceAll(path.sep, '/'), childBytes);
      report.processes = [{ file: receiptName, pid, shard_id: 'bun-test', sha256: sha256(childBytes) }];
      report.coverage = clone(child.coverage);
      return Buffer.from(JSON.stringify(report));
    };
    writeChildAndReceipt();
    succeeded = true;
    return {
      root,
      reportPath,
      report,
      manifest,
      child,
      processPath,
      snapshotDirectory,
      rewriteChildAndReceiptHash(change) {
        change(child);
        return writeChildAndReceipt();
      },
      reportBytes: () => Buffer.from(JSON.stringify(report)),
      remove: () => rmSync(root, { recursive: true, force: true }),
    };
  } finally {
    // Keep the root when factory setup fails so an unexpected failure is diagnosable.
    if (!succeeded) console.error(`Preserved failed synthetic coverage fixture setup at ${root}`);
  }
}
