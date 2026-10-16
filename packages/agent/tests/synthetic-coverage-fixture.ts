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
import { planCoverageShards } from '../tooling/coverage-shard-plan.ts';
import { coverageAssignmentPlanSha256, coverageOutputPathsSha256 } from '../tooling/coverage-shard-evidence.ts';

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
export const syntheticFixtureTestPath = 'tests/fixture.test.ts';
const activeArgv = ['bun', 'test', syntheticFixtureTestPath];

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
  options: { legacyManifest?: boolean; versionedShards?: boolean; focused?: boolean } = {},
): Promise<SyntheticFixture> {
  const root = mkdtempSync(path.join(os.tmpdir(), 'untrusted-coverage-validator-'));
  let succeeded = false;
  try {
    // The helper lives beside the owning tests; `../` is packages/agent.
    const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../');
    const pinBytes = readFileSync(path.join(packageRoot, '.bun-version'));
    write(root, '.bun-version', pinBytes);
    write(root, 'package.json', JSON.stringify({ files: ['src/**', 'bin/**'], scripts: {} }));
    const fixtureSource = options.focused
      ? 'export function fixture(): boolean { return true; }\n'
      : 'export const fixture = true;\n';
    for (const source of sourcePaths) write(root, source, fixtureSource);
    write(root, 'bin/cli-metadata.ts', fixtureSource);
    write(root, syntheticFixtureTestPath, "import { test } from 'bun:test'; test('inert fixture', () => {});\n");
    if (options.versionedShards)
      write(
        root,
        'tests/fixture-extra.spec.ts',
        "import { test } from 'bun:test'; test('second inert fixture', () => {});\n",
      );
    for (const file of coverageToolInputs) {
      if (file === '.bun-version' || file === 'package.json') continue;
      write(
        root,
        file,
        file.endsWith('.ts')
          ? '// UNTRUSTED SYNTHETIC TOOL INPUT\nexport const fixtureToolInput = true;\n'
          : 'UNTRUSTED SYNTHETIC TOOL INPUT\n',
      );
    }
    write(root, 'schemas/fixture.schema.json', '{}\n');
    write(root, 'templates/fixture.template.yaml', 'fixture: true\n');
    write(root, 'instructions/fixture.md', 'fixture\n');

    // Exactly one capture supplies all fingerprints, bytes, and child bindings.
    const inputs = await coverageInputs(
      root,
      options.focused
        ? {
            mode: 'focused-diagnostic',
            contour: 'synthetic-validator-contour',
            sources: [...sourcePaths, 'bin/cli-metadata.ts'].sort(),
            tests: [syntheticFixtureTestPath],
          }
        : 'current',
    );
    const runId = randomUUID();
    const pid = process.pid;
    const runRelative = path.posix.join('coverage/bun-unified', options.focused ? 'diagnostics/runs' : 'runs', runId);
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
    const coverage = options.versionedShards ? undefined : clone(sourceMaps);
    const runtimeHash = sha256(readFileSync(process.execPath));
    const manifestPath = path.posix.join(runRelative, 'manifest.json');
    const testsInputRows = inputs.test_inputs.filter(({ path: file }) => inputs.tests.includes(file));
    const coveragePlan = options.versionedShards
      ? planCoverageShards(testsInputRows, [], 2, '9'.repeat(64))
      : undefined;
    const shardInvocations = coveragePlan?.waves.flatMap((wave) =>
      wave.assignments.map((assignment) => ({
        shard_id: assignment.shard_id,
        argv: [
          'test',
          '--parallel=1',
          '--no-isolate',
          '--timeout',
          '5000',
          ...assignment.tests.map((file) => `./${file}`),
        ],
        cwd: root,
        environment_sha256: '8'.repeat(64),
        output_paths: {
          coverage_directory: path.join(root, ...runRelative.split('/'), 'shards', assignment.shard_id, 'coverage'),
          junit_file: path.join(root, ...runRelative.split('/'), 'shards', assignment.shard_id, 'suite.junit.xml'),
          log_file: path.join(root, ...runRelative.split('/'), 'shards', assignment.shard_id, 'child.log'),
          receipt_directory: path.join(root, ...runRelative.split('/'), 'processes', assignment.shard_id),
          temp_directory: path.join(root, ...runRelative.split('/'), 'shards', assignment.shard_id, 'tmp'),
        },
      })),
    );
    const manifest: JsonRecord = {
      schema: options.legacyManifest
        ? 'VidaBunCoverageRun/v1'
        : options.versionedShards
          ? 'VidaBunCoverageRun/v3'
          : 'VidaBunCoverageRun/v2',
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
      active_argv: options.versionedShards ? [] : activeArgv,
      source_maps: sourceMaps,
      ...(options.legacyManifest ? {} : { instrumented_sources: instrumentedSources }),
      ...(coveragePlan
        ? {
            coverage_plan: coveragePlan,
            assignment_plan_sha256: coverageAssignmentPlanSha256(coveragePlan, shardInvocations ?? []),
            shard_invocations: shardInvocations,
          }
        : {}),
    };
    const manifestBytes = Buffer.from(JSON.stringify(manifest));
    write(root, manifestPath, manifestBytes);

    const preload = inputs.tool_inputs.find(({ path: file }) => file === 'tooling/bun-coverage-preload.ts');
    if (!preload) throw new Error('Fixture capture omitted the preload binding.');
    const boundByPath = new Map(
      [...inputs.sources, ...inputs.test_inputs, ...inputs.tool_inputs].map((entry) => [entry.path, entry.sha256]),
    );
    const loadedInputs = [
      ...new Set([...inputs.tests, ...bootstrapPaths, ...inputs.sources.map(({ path }) => path)]),
    ].map((file) => {
      const digest = boundByPath.get(file);
      if (!digest) throw new Error(`Fixture capture omitted loaded input binding: ${file}`);
      return { path: file, sha256: digest };
    });
    const children: JsonRecord[] = coveragePlan
      ? coveragePlan.waves.flatMap((wave, index) =>
          wave.assignments.map((assignment) => {
            const invocation = shardInvocations!.find(({ shard_id }) => shard_id === assignment.shard_id)!;
            const assignedLoadedInputs = [
              ...new Set([
                ...assignment.tests,
                ...bootstrapPaths,
                'tooling/coverage-shard-evidence.ts',
                'tooling/coverage-counters.ts',
                inputs.sources[index === 0 ? 0 : sourcePaths.length - 1]!.path,
              ]),
            ].map((file) => {
              const digest = boundByPath.get(file);
              if (!digest) throw new Error(`Fixture capture omitted versioned bootstrap input: ${file}`);
              return { path: file, sha256: digest };
            });
            const sparseCoverage: CoverageMap = {
              [Object.keys(sourceMaps)[index === 0 ? 0 : sourcePaths.length - 1]!]: clone(
                Object.values(sourceMaps)[index === 0 ? 0 : sourcePaths.length - 1]!,
              ),
            };
            return {
              schema: 'VidaBunCoverageProcess/v2',
              run_id: runId,
              shard_id: assignment.shard_id,
              source_fingerprint: inputs.source_fingerprint,
              test_fingerprint: inputs.test_fingerprint,
              tool_fingerprint: inputs.tool_fingerprint,
              runtime_executable_sha256: runtimeHash,
              test_selection: inputs.test_selection,
              pid: pid + index,
              sources: inputs.sources,
              module_inputs: inputs.module_inputs,
              execution_scope: executionScope,
              active_argv: invocation.argv,
              preload_input: { path: 'tooling/bun-coverage-preload.ts', sha256: preload.sha256 },
              external_module_inputs: [],
              loaded_inputs: assignedLoadedInputs,
              assignment_plan_sha256: manifest.assignment_plan_sha256,
              assigned_tests: [...assignment.tests],
              shard_selection_sha256: assignment.selection_sha256,
              cwd: invocation.cwd,
              environment_sha256: invocation.environment_sha256,
              output_paths_sha256: coverageOutputPathsSha256(invocation.output_paths),
              coverage: sparseCoverage,
            };
          }),
        )
      : [
          {
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
          },
        ];
    const child = children[0]!;
    const processPaths = children.map((child) => {
      const childPid = child.pid;
      const shardId = child.shard_id;
      if (typeof childPid !== 'number' || !Number.isSafeInteger(childPid) || typeof shardId !== 'string')
        throw new Error('Synthetic coverage process identity is malformed.');
      const nonce = randomUUID();
      const receiptName = `${runId}.${shardId}.${childPid}.${nonce}.json`;
      const relativeReceiptName = options.versionedShards ? `${shardId}/${receiptName}` : receiptName;
      return {
        child,
        receiptName: relativeReceiptName,
        processPath: path.join(root, ...runRelative.split('/'), 'processes', relativeReceiptName),
      };
    });
    const processPath = processPaths[0]!.processPath;
    const reportPath = path.join(root, 'untrusted-report.json');
    const report: JsonRecord = {
      schema: options.focused
        ? 'VidaBunFocusedCoverageDiagnostic/v1'
        : options.versionedShards
          ? 'VidaBunCoverageReport/v2'
          : 'VidaBunCoverageReport/v1',
      ...(options.focused
        ? {
            qualification_scope: 'focused-diagnostic',
            full_qualification: false,
            frozen_budget_qualification: 'pending',
            function_coverage_kind: 'function-entry-binary',
            metrics: [],
          }
        : {}),
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
      active_argv: options.versionedShards ? [] : activeArgv,
      source_maps: sourceMaps,
      shards: coveragePlan
        ? processPaths.map(({ child }) => ({
            run_id: runId,
            shard_id: child.shard_id,
            pid: child.pid,
            status: 0,
            signal: null,
            error: null,
            unknown: false,
          }))
        : [{ shard_id: 'bun-test', status: 0, signal: null, error: null, unknown: false }],
      processes: [],
      ...(!options.versionedShards ? { coverage } : {}),
    };

    const writeChildAndReceipt = (): Uint8Array => {
      const receipts = processPaths.map(({ child, receiptName, processPath: target }) => {
        const childBytes = Buffer.from(JSON.stringify(child));
        write(root, path.relative(root, target).replaceAll(path.sep, '/'), childBytes);
        return { file: receiptName, pid: child.pid, shard_id: child.shard_id, sha256: sha256(childBytes) };
      });
      report.processes = receipts;
      if (!coveragePlan) report.coverage = clone(children[0]!.coverage);
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
