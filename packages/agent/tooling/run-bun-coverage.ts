import { recordContourReport } from './contour-progress-cli.ts';
import { Buffer } from 'node:buffer';
import {
  chmodSync,
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  readlinkSync,
  readdirSync,
  renameSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { randomUUID } from 'node:crypto';
import coverageApi from 'istanbul-lib-coverage';
import { functionInventory, type FunctionRow } from './function-inventory.ts';
import { baselineFunctionEvidenceForSource, validateCoverageLocations } from './coverage-math.ts';
import { spawn as spawnChild, spawnSync, type ChildProcess, type SpawnSyncReturns } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { assertCoverageSnapshotBytes, validateCapturedFocusedShardCounters } from './bun-coverage-report-validator.js';
import { executionBudget } from '../bin/bun.ts';
import { assertPublishedFixtureChildren, assertPublishedFixtureProcess } from './published-coverage-inputs.js';
import {
  historicalInventoryChildId,
  historicalReferenceJUnit,
  parseHistoricalReference,
} from './published-baseline-reference.js';
import {
  coverageAssignmentPlanSha256,
  coverageShardOutputPaths,
  decodeCoverageShardProcessEvidence,
  mergeCoverageShardCounters,
  validateCoverageShardLaunchBinding,
  type CoverageShardRunBinding,
  type CoverageShardTerminalEvidence,
} from './coverage-shard-evidence.js';
import {
  canonicalCoverageReviewScope,
  resolveCoverageShardEligibility,
  type CoverageReviewScope,
} from './coverage-shard-eligibility.ts';
import {
  buildCoverageReviewScope,
  captureCoverageConsumerBinding,
  coverageImageTestContext,
  coverageImageConsumerEnvironment,
  prepareCoverageImageTestContext,
  assertCoverageImageTestContext,
} from './coverage-consumer-binding.ts';
import {
  instrumentedArtifactPath,
  maxInstrumentedArtifactBytes,
  maxInstrumentedArtifactsBytes,
  type InstrumentedSourceDigest,
} from './coverage-instrumented-sources.ts';
import { acquireCoverageRunLock, releaseCoverageRunLock } from './coverage-run-lock.js';
import {
  buildCoverageRunOutcome,
  type CoveragePhaseProducerObservation,
  type CoverageRunOutcomeInput,
} from './coverage-run-outcome.ts';
import { captureSelectedSdkJavascriptOutputsFromCapturedBytes } from './sdk-artifact-capture.ts';
import {
  coverageEnvironmentSha256,
  coverageReviewEnvironmentSha256,
  coverageInputs,
  instrumentSource,
  readQualityInputs,
  isExternalModulePath,
  readBunPin,
  sdkFormationInputsFromQualityCapture,
  selectedTestsRequireSdkArtifacts,
  sha256,
} from './bun-coverage-evidence.ts';
import type { CoverageShardPlan } from './coverage-shard-plan.ts';
import type { CoverageShardInvocation } from './coverage-shard-evidence.ts';

import type { FileCoverageData } from 'istanbul-lib-instrument';
import type { CoverageInputs, InputDigest } from './bun-coverage-evidence.ts';
import type { FocusedDiagnosticSelection } from './bun-coverage-evidence.ts';
import { expectedJavascriptFiles } from './maintained-source-inventory.ts';

type DeepReadonly<T> = T extends readonly unknown[]
  ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
  : T extends object
    ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
    : T;
export type CoverageReviewMetadata = DeepReadonly<Omit<CoverageInputs, 'input_bytes'>>;
export type CurrentCoverageReviewCallback = (input: {
  metadata: CoverageReviewMetadata;
  scope: Readonly<CoverageReviewScope>;
  consumer_configuration?: DeepReadonly<Awaited<ReturnType<typeof captureCoverageConsumerBinding>>>;
}) => unknown;
export type RunBunCoverageOptions = {
  args?: string[];
  focusedDiagnostic?: FocusedDiagnosticSelection;
  reviewCurrentInputs?: CurrentCoverageReviewCallback;
  prepareSdkInputs?: (input: { root: string; tests?: readonly string[]; remainingMs: () => number }) => Promise<void>;
};

function freezeCopiedReviewValue(value: unknown): unknown {
  if (Array.isArray(value)) return Object.freeze(value.map(freezeCopiedReviewValue));
  if (typeof value === 'object' && value !== null) {
    const copy: Record<string, unknown> = {};
    for (const [key, member] of Object.entries(value)) copy[key] = freezeCopiedReviewValue(member);
    return Object.freeze(copy);
  }
  return value;
}

function freezeCopiedReviewMetadata(inputs: CoverageInputs): CoverageReviewMetadata {
  const { input_bytes: _privateCapture, ...metadata } = inputs;
  return freezeCopiedReviewValue(metadata) as CoverageReviewMetadata;
}

const mainRuntimeCoreShardSources = ['src/runtime-kernel.ts'] as const;
const mainRuntimeCoreShardTests: readonly InputDigest[] = [
  {
    path: 'tests/configured-workflow.test.ts',
    sha256: 'ab66245ad2594df09fad52f5f628ad4131d1d2291c33ab0bb4e7910d8d3e11e7',
  },
  {
    path: 'tests/interrupted-source-retirement.test.ts',
    sha256: '43f404d76bac9ab7cc7a77735fcf96bb634c11e643a90e449153f8a807493705',
  },
  {
    path: 'tests/runtime-kernel-boundary.test.ts',
    sha256: 'c940135c3ccc4fc789be2ece04a6e912048fb669f42f63192a50da498684452b',
  },
  {
    path: 'tests/runtime-kernel-composition.test.ts',
    sha256: '55fa3125239425c8d1be6494b95b68694fcf996fb46e4bcbd7c1864f42deb297',
  },
  {
    path: 'tests/smoke.test.ts',
    sha256: '7de674ab7ef3f01b3974253ba1002cc95996c1afe53fa8f612188328f67f6632',
  },
];
const mainRuntimeCoreShardReviewRef =
  '.agent/work/core-runtime-reactivation/WORK.md#main-runtime-core-focused-shard-resource-review';

function sameStrings(actual: readonly string[], expected: readonly string[]): boolean {
  if (actual.length !== expected.length) return false;
  const sortedActual = [...actual].sort();
  const sortedExpected = [...expected].sort();
  return sortedActual.every((value, index) => value === sortedExpected[index]);
}

/** Reuse current captured metadata for the explicitly reviewed, digest-pinned focused selections. */
export function focusedCoverageShardReview(
  selection: FocusedDiagnosticSelection,
): CurrentCoverageReviewCallback | undefined {
  const hostState = selection.contour === 'bun-host-state';
  const contour = hostState ? 'bun-host-state' : 'main-runtime-core';
  const sources = hostState
    ? ['src/host-state.ts', 'src/trusted-host.ts', 'src/contracts/work-state-schema.ts']
    : mainRuntimeCoreShardSources;
  const tests = hostState
    ? [
        {
          path: 'tests/bun/host-state.test.ts',
          sha256: '30cb3ae9363a0984a772d841834959b2e3eb98d8917e1c5d39aba27b445b8ebc',
        },
        {
          path: 'tests/stopped-source-capture.test.ts',
          sha256: '4690a1e78e82fb6a711feb513be6119ae1854d7d8a7015b93468e1c2780a207a',
        },
      ]
    : mainRuntimeCoreShardTests;
  const selectedTests = tests.map(({ path: file }) => file);
  if (
    selection.contour !== contour ||
    !sameStrings(selection.sources, sources) ||
    !sameStrings(selection.tests, selectedTests)
  )
    return undefined;

  return ({ metadata, scope, consumer_configuration }) => {
    const callerNamespace = consumer_configuration?.root_identity_sha256 ?? '';
    if (
      hostState &&
      (scope.platform !== 'linux' || scope.provider !== 'linux-proc-fd' || !/^[a-f0-9]{64}$/u.test(callerNamespace))
    )
      return null;
    const capturedSelection = metadata.test_selection;
    if (
      capturedSelection.mode !== 'focused-diagnostic' ||
      capturedSelection.contour !== contour ||
      !sameStrings(capturedSelection.sources, sources) ||
      !sameStrings(capturedSelection.tests, selectedTests) ||
      !sameStrings(
        metadata.sources.map(({ path: file }) => file),
        sources,
      ) ||
      !sameStrings(metadata.tests, selectedTests)
    )
      return null;

    const selected = new Set(selectedTests);
    const capturedTests = metadata.test_inputs
      .filter(({ path: file }) => selected.has(file))
      .map(({ path: file, sha256: digest }) => ({ path: file, sha256: digest }))
      .sort((left, right) => left.path.localeCompare(right.path));
    if (JSON.stringify(capturedTests) !== JSON.stringify(tests)) return null;

    const reviewScopeSha256 = canonicalCoverageReviewScope(scope);
    return {
      schema: 'VidaCoverageShardEligibility/v1',
      scope: { ...scope },
      review_scope_sha256: reviewScopeSha256,
      reviews: tests.map(({ path: test_file, sha256: test_sha256 }) => ({
        test_file,
        test_sha256,
        review_scope_sha256: reviewScopeSha256,
        shared_resources: hostState
          ? [
              `namespace:${test_file === 'tests/bun/host-state.test.ts' ? callerNamespace : sha256(scope.package_root_identity_sha256 + '\0.tmp')}`,
            ]
          : [],
        exclusive_run: false,
        reviewer_ref: hostState
          ? '.agent/work/core-runtime-reactivation/WORK.md#bun-host-state-focused-shard-resource-review'
          : mainRuntimeCoreShardReviewRef,
      })),
    };
  };
}

/** Deny stale emitted SDKs before allocating coverage outputs or launching tests. */
export function assertCurrentCoverageSdkFreshness(root: string, inputs: CoverageInputs): void {
  if (
    (inputs.test_selection.mode !== 'full-current-test-set' && inputs.test_selection.mode !== 'focused-diagnostic') ||
    !selectedTestsRequireSdkArtifacts(inputs.tests)
  )
    return;
  const selected = sdkFormationInputsFromQualityCapture(inputs);
  const artifacts = new Map<string, Buffer>();
  for (const file of ['dist/sdk-formation.json', ...expectedJavascriptFiles.map((member) => `dist/src/${member}`)]) {
    const bytes = inputs.input_bytes[file];
    if (!bytes) throw new Error(`Captured SDK formation artifact is missing: ${file}`);
    artifacts.set(file, bytes);
  }
  captureSelectedSdkJavascriptOutputsFromCapturedBytes(root, selected.selectedInputs, artifacts);
}
import { requireSafeRepositoryAccess, type SafeRepositoryAccess } from '../src/config/safe-repository-access.ts';

type SourceDigest = InputDigest;
type RunManifest = {
  schema: 'VidaBunCoverageRun/v2' | 'VidaBunCoverageRun/v3';
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
  execution_scope: Record<string, unknown> & {
    consumer_configuration?: Awaited<ReturnType<typeof captureCoverageConsumerBinding>>;
  };
  active_argv: string[];
  tests: string[];
  sources: SourceDigest[];
  source_maps: Record<string, FileCoverageData>;
  instrumented_sources: InstrumentedSourceDigest[];
  /** Present only when a complete current-selection shard review was admitted. */
  coverage_plan?: CoverageShardPlan;
  assignment_plan_sha256?: string;
  shard_invocations?: CoverageShardInvocation[];
  shard_temporary_root?: string;
};
type ChildOutcome = {
  shard_id: string;
  status: number | null;
  signal: NodeJS.Signals | null;
  error: string | null;
  unknown: boolean;
};

type SnapshotReceiptBinding = {
  module_inputs: string;
  execution_scope: string;
  active_argv: string;
  preload_input: string;
  loaded_inputs: Map<string, string>;
};

class CoverageReportRejectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CoverageReportRejectedError';
  }
}

function reportRejected(message: string): never {
  throw new CoverageReportRejectedError(message);
}

function rejectPureReportValidator(error: unknown): never {
  if (error instanceof Error && error.constructor === Error && !Object.hasOwn(error, 'code'))
    reportRejected(error.message);
  throw error;
}

export type PreparedCoverageProducer = {
  shard_id: string;
  args: readonly string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
  maximum_duration_ms?: number;
  /** Caller-owned writable log FD; caller holds and closes it. Default inherits. */
  log_fd?: number;
};

export type CoverageProducerOutcome = ChildOutcome & {
  /** Parent-owned deadline observation; a signal alone does not establish timeout. */
  timeout_observed?: boolean | null;
  producer_pid: number | null;
  launch_attempted: boolean;
  producerTerminalKnown: boolean;
  directProducerAccounted: boolean;
  resourceSafeToAdvance: false;
};

export type CoverageProducerGroup = {
  outcomes: readonly CoverageProducerOutcome[];
  reservationSafeToRelease: boolean;
  resourceSafeToAdvance: false;
};

function writeAtomic(file: string, value: unknown): void {
  const temporary = file + '.tmp-' + process.pid;
  writeFileSync(temporary, JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  renameSync(temporary, file);
}

/** Factual parent observations only; neither coverage receipts nor resource-quiescence proof. */
export function recordCoverageProducerGroup(file: string, runId: string, group: CoverageProducerGroup): void {
  writeAtomic(file, {
    schema: 'VidaBunCoverageSupervisorObservation/v1',
    run_id: runId,
    ...group,
  });
}

/** Attempt each diagnostic destination; one I/O failure must not suppress the other. */
function recordCoverageTerminalObservations(
  supervisorPath: string,
  runId: string,
  group: CoverageProducerGroup,
  recordOutcome: () => void,
): void {
  const errors: unknown[] = [];
  for (const record of [() => recordCoverageProducerGroup(supervisorPath, runId, group), recordOutcome]) {
    try {
      record();
    } catch (error) {
      errors.push(error);
    }
  }
  if (errors.length === 1) throw errors[0];
  if (errors.length) throw new AggregateError(errors, 'Coverage terminal observation writes failed.');
}

type ShardReportManifest = Pick<
  RunManifest,
  | 'run_id'
  | 'source_fingerprint'
  | 'test_fingerprint'
  | 'tool_fingerprint'
  | 'runtime_executable_sha256'
  | 'sources'
  | 'tests'
  | 'test_inputs'
  | 'tool_inputs'
  | 'module_inputs'
  | 'test_selection'
  | 'execution_scope'
  | 'active_argv'
  | 'source_maps'
  | 'snapshot_directory'
> & {
  schema: 'VidaBunCoverageRun/v3';
  coverage_plan: CoverageShardPlan;
  assignment_plan_sha256: string;
  shard_invocations: CoverageShardInvocation[];
  shard_temporary_root: string;
};

/** Assemble accounted native receipts. The existing validator alone admits and merges counters. */
export function collectCoverageShardReport(input: {
  root: string;
  manifestPath: string;
  manifest: ShardReportManifest;
  group: CoverageProducerGroup;
}) {
  const { root, manifestPath, manifest, group } = input;
  try {
    validateCoverageShardLaunchBinding(
      {
        ...manifest,
        selected_test_inputs: manifest.test_inputs.filter((row) => manifest.tests.includes(row.path)),
        snapshot_directory: path.resolve(root, manifest.snapshot_directory),
      },
      manifest.coverage_plan,
      root,
      manifest.shard_temporary_root,
    );
  } catch (error) {
    rejectPureReportValidator(error);
  }
  if (
    !group.reservationSafeToRelease ||
    group.outcomes.length !== manifest.shard_invocations.length ||
    new Set(group.outcomes.map((outcome) => outcome.shard_id)).size !== group.outcomes.length
  )
    reportRejected('Coverage shard producer group is incomplete or unaccounted.');
  const shards = group.outcomes.map((outcome) => successfulCoverageShardTerminal(manifest, outcome));
  const processes = manifest.shard_invocations.flatMap((invocation) => {
    const terminal = shards.find((row) => row.shard_id === invocation.shard_id);
    if (!terminal) throw new Error('Coverage shard terminal is missing.');
    return capturedCoverageShardReceipts(invocation, terminal);
  });
  return {
    schema: 'VidaBunCoverageReport/v2' as const,
    run_id: manifest.run_id,
    manifest_path: path.relative(root, manifestPath).replaceAll('\\', '/'),
    manifest_sha256: sha256(readFileSync(manifestPath)),
    runtime_executable_sha256: manifest.runtime_executable_sha256,
    sources: manifest.sources,
    tests: manifest.tests,
    test_selection: manifest.test_selection,
    test_inputs: manifest.test_inputs,
    tool_inputs: manifest.tool_inputs,
    module_inputs: manifest.module_inputs,
    execution_scope: manifest.execution_scope,
    active_argv: manifest.active_argv,
    source_maps: manifest.source_maps,
    source_fingerprint: manifest.source_fingerprint,
    test_fingerprint: manifest.test_fingerprint,
    tool_fingerprint: manifest.tool_fingerprint,
    shards,
    processes,
  };
}

export function focusedCoverageDiagnosticReport(input: {
  root: string;
  report: Record<string, unknown>;
  coverage: Record<string, FileCoverageData>;
  inputs: CoverageInputs;
  sourceMaps: Record<string, FileCoverageData>;
  functions: ReadonlyMap<string, FunctionRow[]>;
}) {
  const { root, report, coverage, inputs, sourceMaps, functions } = input;
  if (inputs.test_selection.mode !== 'focused-diagnostic')
    throw new Error('Focused coverage projection requires a focused selection.');
  return {
    ...report,
    schema: 'VidaBunFocusedCoverageDiagnostic/v1' as const,
    qualification_scope: 'focused-diagnostic',
    full_qualification: false,
    frozen_budget_qualification: 'pending',
    function_coverage_kind: 'function-entry-binary',
    metrics: inputs.sources.map((entry) => {
      const absolute = path.resolve(root, entry.path);
      const fileCoverage = coverage[absolute];
      const sourceMap = sourceMaps[absolute];
      if (!fileCoverage || !sourceMap) throw new Error('Focused diagnostic source counters are missing: ' + entry.path);
      validateCoverageLocations(
        entry.path,
        inputs.input_bytes[entry.path]!.toString('utf8'),
        fileCoverage,
        sourceMap.branchMap,
      );
      return {
        file: entry.path,
        coverage: coverageApi
          .createCoverageMap({ [absolute]: fileCoverage })
          .getCoverageSummary()
          .toJSON(),
        functions: baselineFunctionEvidenceForSource(entry.path, functions.get(entry.path) ?? [], fileCoverage),
      };
    }),
    coverage,
  };
}

function successfulCoverageShardTerminal(
  manifest: ShardReportManifest,
  outcome: CoverageProducerOutcome,
): CoverageShardTerminalEvidence {
  if (
    !outcome.launch_attempted ||
    !outcome.producerTerminalKnown ||
    !outcome.directProducerAccounted ||
    outcome.unknown ||
    outcome.status !== 0 ||
    outcome.signal !== null ||
    outcome.error !== null ||
    outcome.producer_pid === null ||
    !Number.isSafeInteger(outcome.producer_pid) ||
    outcome.producer_pid < 1 ||
    !manifest.shard_invocations.some((row) => row.shard_id === outcome.shard_id)
  )
    throw new Error('Coverage shard outcome is unsuccessful, unknown or unaccounted.');
  return {
    run_id: manifest.run_id,
    shard_id: outcome.shard_id,
    pid: outcome.producer_pid,
    status: outcome.status,
    signal: outcome.signal,
    error: outcome.error,
    unknown: outcome.unknown,
  };
}

function capturedCoverageShardReceipts(invocation: CoverageShardInvocation, terminal: CoverageShardTerminalEvidence) {
  const names = readdirSync(invocation.output_paths.receipt_directory)
    .filter((name) => name.endsWith('.json'))
    .sort();
  if (!names.length) reportRejected('Coverage shard has no process receipts.');
  return names.map((name) => {
    const bytes = readFileSync(path.join(invocation.output_paths.receipt_directory, name));
    let raw: unknown;
    try {
      raw = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    } catch {
      reportRejected('Coverage shard process receipt is not valid JSON: ' + name);
    }
    const receipt = decodeCoverageShardProcessEvidence(raw);
    if (
      !receipt ||
      receipt.run_id !== terminal.run_id ||
      receipt.shard_id !== terminal.shard_id ||
      receipt.pid !== terminal.pid
    )
      reportRejected('Coverage shard receipt does not match its accounted native terminal.');
    return {
      file: terminal.shard_id + '/' + name,
      pid: receipt.pid,
      shard_id: receipt.shard_id,
      sha256: sha256(bytes),
    };
  });
}

/** Prepare one complete initial wave. This does not create outputs, launch children or activate production. */
export function prepareCoverageShardLaunches(input: {
  root: string;
  temporary_root: string;
  run_id: string;
  scope: CoverageReviewScope;
  test_selection_mode?: 'full-current-test-set' | 'focused-diagnostic';
  selected_test_inputs: readonly InputDigest[];
  eligibility: unknown;
  environment: NodeJS.ProcessEnv;
  wrapped_invocation?: boolean;
}) {
  const selectionMode = input.test_selection_mode ?? 'full-current-test-set';
  if (selectionMode !== 'full-current-test-set' && selectionMode !== 'focused-diagnostic')
    throw new Error('Coverage shards require a current input selection.');
  const eligibility = resolveCoverageShardEligibility({
    mode: 'current',
    envelope: input.eligibility,
    scope: input.scope,
    selectedTests: input.selected_test_inputs,
  });
  if (eligibility.status !== 'eligible') return eligibility;
  if (!path.isAbsolute(input.root) || path.resolve(input.root) !== input.root)
    throw new Error('Coverage shard package root is not canonical and absolute.');
  if (!/^[0-9a-f-]{36}$/u.test(input.run_id)) throw new Error('Coverage shard run identity is invalid.');
  if ((input.environment.BUN_OPTIONS ?? '').trim())
    throw new Error('Ambient BUN_OPTIONS are unsupported for coverage.');
  if (
    coverageReviewEnvironmentSha256(
      { ...input.environment, TMPDIR: input.temporary_root },
      input.wrapped_invocation,
    ) !== input.scope.environment_sha256
  )
    return {
      status: 'serial-fallback' as const,
      reason: 'review-environment-stale-or-mismatched',
      reviewScopeSha256: eligibility.reviewScopeSha256,
    };
  const runDirectory = path.join(
    input.root,
    'coverage',
    'bun-unified',
    ...(selectionMode === 'focused-diagnostic' ? ['diagnostics'] : []),
    'runs',
    input.run_id,
  );
  const snapshotDirectory = path.join(runDirectory, 'snapshot');
  const manifestPath = path.join(runDirectory, 'manifest.json');
  const tests = input.selected_test_inputs.map(({ path: file }) => file).sort();
  const invocations: CoverageShardInvocation[] = [];
  const launches: PreparedCoverageProducer[] = [];
  for (const assignment of eligibility.plan.waves[0]!.assignments) {
    const outputs = coverageShardOutputPaths(
      input.root,
      input.run_id,
      assignment.shard_id,
      input.temporary_root,
      selectionMode,
    );
    const args = [
      'test',
      '--timeout',
      '5000',
      '--parallel=1',
      '--no-isolate',
      `--config=${path.join(snapshotDirectory, 'bunfig.toml')}`,
      '--preload',
      path.join(snapshotDirectory, 'tooling', 'bun-coverage-preload.ts'),
      '--reporter=junit',
      `--reporter-outfile=${outputs.junit_file}`,
      ...assignment.tests.map((file) => './' + file),
    ];
    const env: NodeJS.ProcessEnv = {
      ...input.environment,
      TMPDIR: outputs.temp_directory,
      VIDA_BUN_COVERAGE_ROOT: input.root,
      VIDA_BUN_COVERAGE_MANIFEST: manifestPath,
      VIDA_BUN_COVERAGE_REPORT_DIRECTORY: outputs.receipt_directory,
      VIDA_BUN_COVERAGE_SNAPSHOT_DIRECTORY: snapshotDirectory,
      VIDA_BUN_COVERAGE_RUN_ID: input.run_id,
      VIDA_BUN_COVERAGE_SOURCE_FINGERPRINT: input.scope.source_fingerprint,
      VIDA_BUN_COVERAGE_TEST_FINGERPRINT: input.scope.test_fingerprint,
      VIDA_BUN_COVERAGE_TOOL_FINGERPRINT: input.scope.tool_fingerprint,
      VIDA_BUN_COVERAGE_TEST_SELECTION_MODE: selectionMode,
      VIDA_BUN_COVERAGE_ACTIVE_ARGV: JSON.stringify(args),
      VIDA_BUN_COVERAGE_SHARD_ID: assignment.shard_id,
      VIDA_BUN_COVERAGE_ASSIGNED_TESTS: JSON.stringify(assignment.tests),
      VIDA_BUN_COVERAGE_SHARD_SELECTION_SHA256: assignment.selection_sha256,
      VIDA_BUN_COVERAGE_OUTPUT_COVERAGE_DIRECTORY: outputs.coverage_directory,
      VIDA_BUN_COVERAGE_JUNIT_FILE: outputs.junit_file,
      VIDA_BUN_COVERAGE_LOG_FILE: outputs.log_file,
      VIDA_BUN_COVERAGE_TEMP_DIRECTORY: outputs.temp_directory,
      BUN_TEST_WORKER_ID: '1',
      JEST_WORKER_ID: '1',
      AGENT_RUNTIME_NATIVE_COVERAGE_MAIN: '1',
    };
    delete env.BUN_OPTIONS;
    Object.freeze(args);
    Object.freeze(env);
    Object.freeze(outputs);
    invocations.push({
      shard_id: assignment.shard_id,
      argv: args,
      cwd: input.root,
      environment_sha256: coverageEnvironmentSha256(env),
      output_paths: outputs,
    });
    launches.push({ shard_id: assignment.shard_id, args, cwd: input.root, env });
  }
  const binding: CoverageShardRunBinding = {
    schema: 'VidaBunCoverageRun/v3',
    run_id: input.run_id,
    source_fingerprint: input.scope.source_fingerprint,
    test_fingerprint: input.scope.test_fingerprint,
    tool_fingerprint: input.scope.tool_fingerprint,
    runtime_executable_sha256: input.scope.runtime_executable_sha256,
    assignment_plan_sha256: coverageAssignmentPlanSha256(eligibility.plan, invocations),
    tests,
    selected_test_inputs: input.selected_test_inputs.map((row) => ({ ...row })),
    shard_invocations: invocations,
    snapshot_directory: snapshotDirectory,
  };
  validateCoverageShardLaunchBinding(binding, eligibility.plan, input.root, input.temporary_root);
  for (const invocation of invocations) Object.freeze(invocation);
  for (const launch of launches) Object.freeze(launch);
  Object.freeze(invocations);
  Object.freeze(launches);
  return { status: 'prepared' as const, plan: eligibility.plan, binding, invocations, launches };
}

const coverageShardEligibilityPath = 'coverage/bun-unified/shard-eligibility.v1.json';
const maxCoverageShardEligibilityBytes = 8 * 1024 * 1024;

/** Read the fixed current review artifact through the package's verified reader before planning outputs. */
export function prepareCurrentCoverageShardLaunches(input: {
  root: string;
  temporary_root: string;
  run_id: string;
  inputs: CoverageInputs;
  runtimeExecutableSha256: string;
  bunVersion: string;
  environment: NodeJS.ProcessEnv;
  wrappedInvocation?: boolean;
  consumerConfiguration?: Awaited<ReturnType<typeof captureCoverageConsumerBinding>>;
  reviewCurrentInputs?: CurrentCoverageReviewCallback;
}) {
  if ((input.environment.BUN_OPTIONS ?? '').trim())
    throw new Error('Ambient BUN_OPTIONS are unsupported for coverage.');
  if (!path.isAbsolute(input.temporary_root) || path.resolve(input.temporary_root) !== input.temporary_root)
    throw new Error('Coverage shard temporary root is not canonical and absolute.');
  const fallback = (reason: string, artifactSha256?: string, reviewScopeSha256?: string) => ({
    status: 'serial-fallback' as const,
    reason,
    ...(artifactSha256 === undefined ? {} : { artifact_sha256: artifactSha256 }),
    ...(reviewScopeSha256 === undefined ? {} : { review_scope_sha256: reviewScopeSha256 }),
  });
  const testSelectionMode = input.inputs.test_selection.mode;
  if (testSelectionMode === 'published-baseline-bun-native') return fallback('historical-mode');

  let packageAccess: SafeRepositoryAccess;
  try {
    packageAccess = requireSafeRepositoryAccess(input.root);
  } catch {
    return fallback('package-safe-access-unavailable');
  }
  let envelope: unknown;
  let artifactSha256: string | undefined;
  if (!input.reviewCurrentInputs) {
    if (typeof packageAccess.readVerifiedCaptureBytes !== 'function')
      return fallback('verified-review-reader-unavailable');
    let bytes: Buffer;
    try {
      bytes = packageAccess.readVerifiedCaptureBytes(
        coverageShardEligibilityPath,
        'current coverage shard eligibility review',
        maxCoverageShardEligibilityBytes,
      );
    } catch {
      return fallback('review-artifact-unavailable');
    }
    artifactSha256 = sha256(bytes);
    try {
      envelope = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    } catch {
      return fallback('review-artifact-malformed', artifactSha256);
    }
  }

  const environment = { ...input.environment };
  const temporaryRoot = input.temporary_root;
  environment.TMPDIR = temporaryRoot;
  if (input.consumerConfiguration)
    environment.AGENT_RUNTIME_TEST_REPOSITORY_ROOT = input.consumerConfiguration.repository_root;
  const scope = buildCoverageReviewScope({
    packageAccess,
    inputs: input.inputs,
    runtimeExecutableSha256: input.runtimeExecutableSha256,
    bunVersion: input.bunVersion,
    environment,
    ...(input.wrappedInvocation === undefined ? {} : { wrappedInvocation: input.wrappedInvocation }),
    ...(input.consumerConfiguration === undefined ? {} : { consumerConfiguration: input.consumerConfiguration }),
  });
  const reviewScopeSha256 = canonicalCoverageReviewScope(scope);
  const selected = new Set(input.inputs.tests);
  const selectedTestInputs = input.inputs.test_inputs.filter((row) => selected.has(row.path));
  if (
    selected.size !== input.inputs.tests.length ||
    selectedTestInputs.length !== input.inputs.tests.length ||
    new Set(selectedTestInputs.map((row) => row.path)).size !== input.inputs.tests.length
  )
    return fallback('captured-test-selection-incomplete', artifactSha256, reviewScopeSha256);
  if (input.reviewCurrentInputs) {
    const metadata = freezeCopiedReviewMetadata(input.inputs);
    const frozenScope = Object.freeze({ ...scope });
    try {
      envelope = input.reviewCurrentInputs({
        metadata,
        scope: frozenScope,
        ...(input.consumerConfiguration
          ? {
              consumer_configuration: freezeCopiedReviewValue(input.consumerConfiguration) as DeepReadonly<
                Awaited<ReturnType<typeof captureCoverageConsumerBinding>>
              >,
            }
          : {}),
      });
    } catch {
      return fallback('review-callback-failed', undefined, reviewScopeSha256);
    }
  }
  const prepared = prepareCoverageShardLaunches({
    root: input.root,
    temporary_root: temporaryRoot,
    run_id: input.run_id,
    scope,
    test_selection_mode: testSelectionMode,
    selected_test_inputs: selectedTestInputs,
    eligibility: envelope,
    environment,
    ...(input.wrappedInvocation === undefined ? {} : { wrapped_invocation: input.wrappedInvocation }),
  });
  if (prepared.status !== 'prepared')
    return fallback(prepared.reason, artifactSha256, prepared.reviewScopeSha256 ?? reviewScopeSha256);
  return {
    ...prepared,
    ...(artifactSha256 === undefined ? {} : { artifact_sha256: artifactSha256 }),
    review_scope_sha256: reviewScopeSha256,
  };
}

export async function superviseCoverageProducers(
  launches: readonly PreparedCoverageProducer[],
  budget: ReturnType<typeof executionBudget>,
): Promise<CoverageProducerGroup> {
  const prepared = snapshotCoverageProducerLaunches(launches);
  const outcomesByLaunch: Array<Promise<CoverageProducerOutcome> | CoverageProducerOutcome> = [];
  for (let index = 0; index < prepared.length; index++) {
    const launch = prepared[index]!;
    let allowance: number;
    let terminalWait: number;
    try {
      allowance = budget.remaining(launch.maximum_duration_ms);
      terminalWait = Math.max(0, budget.cleanupTimeout());
    } catch (error) {
      const spent = error instanceof Error && error.message === 'Execution budget exhausted before child launch.';
      for (let remaining = index; remaining < prepared.length; remaining++)
        outcomesByLaunch[remaining] = unattemptedCoverageProducer(prepared[remaining]!, error, spent);
      break;
    }
    outcomesByLaunch[index] = runCoverageProducer(launch, allowance, terminalWait);
  }
  const outcomes = await Promise.all(outcomesByLaunch.map((outcome) => Promise.resolve(outcome)));
  return {
    outcomes,
    reservationSafeToRelease: outcomes.every((outcome) =>
      outcome.launch_attempted
        ? outcome.directProducerAccounted
        : outcome.error === 'Execution budget exhausted before child launch.',
    ),
    resourceSafeToAdvance: false,
  };
}

function snapshotCoverageProducerLaunches(launches: readonly PreparedCoverageProducer[]): PreparedCoverageProducer[] {
  if (!Array.isArray(launches) || launches.length < 1 || launches.length > 2)
    throw new Error('Invalid coverage producer group size.');
  const ids = new Set<string>();
  const prepared: PreparedCoverageProducer[] = [];
  for (const value of launches as readonly unknown[]) {
    if (!isPreparedCoverageProducer(value)) throw new Error('Invalid coverage producer launch descriptor.');
    const launch = snapshotCoverageProducer(value);
    if (!isPreparedCoverageProducer(launch)) throw new Error('Invalid coverage producer launch descriptor.');
    if (ids.has(launch.shard_id)) throw new Error('Invalid coverage producer launch descriptor.');
    ids.add(launch.shard_id);
    prepared.push(launch);
  }
  return prepared;
}

function snapshotCoverageProducer(launch: PreparedCoverageProducer): PreparedCoverageProducer {
  const logFd = launch.log_fd;
  return {
    shard_id: launch.shard_id,
    args: [...launch.args],
    cwd: launch.cwd,
    env: { ...launch.env },
    ...(launch.maximum_duration_ms === undefined ? {} : { maximum_duration_ms: launch.maximum_duration_ms }),
    ...(logFd === undefined ? {} : { log_fd: logFd }),
  };
}

function isPreparedCoverageProducer(value: unknown): value is PreparedCoverageProducer {
  if (typeof value !== 'object' || value === null) return false;
  const launch = value as PreparedCoverageProducer;
  if (typeof launch.shard_id !== 'string' || !launch.shard_id) return false;
  if (!Array.isArray(launch.args) || launch.args.some((arg) => typeof arg !== 'string')) return false;
  if (typeof launch.cwd !== 'string' || !launch.cwd) return false;
  return isCoverageProducerOptions(launch);
}

function isCoverageProducerOptions(launch: PreparedCoverageProducer): boolean {
  if (!launch.env || typeof launch.env !== 'object') return false;
  if (launch.log_fd !== undefined && (!Number.isSafeInteger(launch.log_fd) || launch.log_fd < 0)) return false;
  return (
    launch.maximum_duration_ms === undefined ||
    (Number.isSafeInteger(launch.maximum_duration_ms) &&
      launch.maximum_duration_ms > 0 &&
      launch.maximum_duration_ms <= 300_000)
  );
}

function unattemptedCoverageProducer(
  launch: PreparedCoverageProducer,
  reason: unknown,
  knownBudgetExhaustion: boolean,
): CoverageProducerOutcome {
  return {
    shard_id: launch.shard_id,
    status: null,
    signal: null,
    error: knownBudgetExhaustion ? 'Execution budget exhausted before child launch.' : String(reason),
    unknown: true,
    producer_pid: null,
    launch_attempted: false,
    producerTerminalKnown: false,
    directProducerAccounted: false,
    resourceSafeToAdvance: false,
    timeout_observed: null,
  };
}

function runCoverageProducer(
  launch: PreparedCoverageProducer,
  allowance: number,
  terminalWait: number,
): Promise<CoverageProducerOutcome> {
  let child: ChildProcess;
  try {
    const output = launch.log_fd ?? 'inherit';
    child = spawnChild(process.execPath, [...launch.args], {
      cwd: launch.cwd,
      env: launch.env,
      stdio: ['ignore', output, output],
      killSignal: 'SIGKILL',
      windowsHide: true,
    });
  } catch (error) {
    return Promise.resolve(coverageProducerOutcome(launch, null, null, null, String(error)));
  }
  try {
    return observeCoverageProducerClose(launch, child, allowance, terminalWait);
  } catch (error) {
    try {
      child.kill('SIGKILL');
    } catch {}
    child.unref();
    return Promise.resolve(coverageProducerOutcome(launch, positivePid(child.pid), null, null, String(error)));
  }
}

function positivePid(value: number | undefined): number | null {
  return Number.isInteger(value) && value! > 0 ? value! : null;
}

function coverageProducerOutcome(
  launch: PreparedCoverageProducer,
  pid: number | null,
  status: number | null,
  signal: NodeJS.Signals | null,
  error: string | null,
): CoverageProducerOutcome {
  const producerTerminalKnown = pid !== null && coverageProducerTerminalKnown({ pid, status, signal });
  return {
    shard_id: launch.shard_id,
    status,
    signal,
    error,
    unknown: Boolean(error) || signal !== null || !Number.isInteger(status) || !producerTerminalKnown,
    producer_pid: pid,
    launch_attempted: true,
    producerTerminalKnown,
    directProducerAccounted: producerTerminalKnown,
    resourceSafeToAdvance: false,
  };
}

function observeCoverageProducerClose(
  launch: PreparedCoverageProducer,
  child: ChildProcess,
  allowance: number,
  terminalWait: number,
): Promise<CoverageProducerOutcome> {
  const pid = positivePid(child.pid);
  return new Promise((resolve) => {
    let settled = false;
    let spawnError: Error | undefined;
    let timeoutObserved = false;
    const finish = (code: number | null, signalValue: NodeJS.Signals | null | undefined, timedOut: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearTimeout(deadlineTimer);
      const signal = signalValue ?? null;
      if (timedOut) {
        try {
          child.kill('SIGKILL');
        } catch {}
        child.unref();
      }
      const error = spawnError ?? (timedOut ? 'Producer close was not observed within its bounded wait.' : null);
      resolve({
        ...coverageProducerOutcome(launch, pid, code, signal, error === null ? null : String(error)),
        timeout_observed: timeoutObserved,
        unknown: timeoutObserved || Boolean(error) || signal !== null || !Number.isInteger(code) || pid === null,
      });
    };
    const deadlineTimer = setTimeout(() => {
      timeoutObserved = true;
      try {
        child.kill('SIGKILL');
      } catch (error) {
        spawnError = error instanceof Error ? error : new Error(String(error));
      }
    }, allowance);
    const timer = setTimeout(() => finish(null, null, true), allowance + terminalWait);
    child.once('error', (error: Error) => {
      spawnError = error;
    });
    child.once('close', (code, signal) => finish(code, signal, false));
  });
}

/** A qualified synchronous return observes only this producer, not its test effects or descendants. */
export function coverageProducerTerminalKnown(
  result: Pick<SpawnSyncReturns<unknown>, 'pid' | 'status' | 'signal'>,
): boolean {
  return Number.isInteger(result.pid) && result.pid > 0 && (Number.isInteger(result.status) || Boolean(result.signal));
}
/** A definite spawn-time failure permits reservation disposal without proving child termination or effects. */
export function coverageProducerReservationSafeToRelease(
  result: Pick<SpawnSyncReturns<unknown>, 'pid' | 'status' | 'signal' | 'error'>,
): boolean {
  const error = result.error;
  const errorCode =
    error !== null && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
      ? error.code
      : null;
  return result.pid === 0 && result.status === null && result.signal === null && errorCode === 'ENOENT';
}

function ownErrorString(error: unknown, key: 'name' | 'code' | 'message'): string | null {
  if ((typeof error !== 'object' && typeof error !== 'function') || error === null) return null;
  try {
    const descriptor = Object.getOwnPropertyDescriptor(error, key);
    return descriptor && 'value' in descriptor && typeof descriptor.value === 'string'
      ? descriptor.value.slice(0, 512)
      : null;
  } catch {
    return null;
  }
}

export function coveragePhaseProducerObservation(
  phase: CoveragePhaseProducerObservation['phase'],
  result: SpawnSyncReturns<unknown>,
): CoveragePhaseProducerObservation {
  const producerTerminalKnown = coverageProducerTerminalKnown(result);
  const reservationSafeToRelease = producerTerminalKnown || coverageProducerReservationSafeToRelease(result);
  const error = result.error ?? null;
  const errorCode = ownErrorString(error, 'code');
  return {
    phase,
    launch_attempted: true,
    pid: Number.isInteger(result.pid) ? result.pid : null,
    status: result.status,
    signal: result.signal,
    error: error
      ? {
          name: ownErrorString(error, 'name'),
          code: errorCode,
          message: ownErrorString(error, 'message'),
        }
      : null,
    timeout_observed: errorCode === 'ETIMEDOUT',
    producerTerminalKnown,
    directProducerAccounted: producerTerminalKnown,
    reservationSafeToRelease,
    unknown: Boolean(error) || result.signal !== null || !Number.isInteger(result.status) || !producerTerminalKnown,
  };
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputRoot = path.join(root, 'coverage', 'bun-unified');
export async function runBunCoverage(options: RunBunCoverageOptions = {}): Promise<void> {
  // One command-entry allowance covers pin resolution, current typecheck,
  // capture, the direct producer, CRAP and final report work.
  const commandBudget = executionBudget(300_000, 30_000);
  const rawArgs = options.args ?? process.argv.slice(2);
  const wrappedInvocation = rawArgs.length === 1 && rawArgs[0] === '--wrapper-review-clocks';
  const args = wrappedInvocation ? [] : rawArgs;
  if (args.some((arg) => arg !== '--published-baseline=b549951'))
    throw new Error('Unsupported Bun coverage runner argument.');
  if (args.length > 1) throw new Error('Bun coverage runner accepts one baseline selection flag.');
  const selectionMode = args.length ? 'published-baseline-bun-native' : 'current';
  const focused = options.focusedDiagnostic;
  const focusedShardReview = focused ? focusedCoverageShardReview(focused) : undefined;
  if (focused && (args.length || options.reviewCurrentInputs))
    throw new Error('Focused coverage diagnostics cannot use historical selection or input review callbacks.');
  const runOutputRoot = focused ? path.join(outputRoot, 'diagnostics') : outputRoot;
  if ((options.reviewCurrentInputs || options.prepareSdkInputs) && selectionMode !== 'current')
    throw new Error('Current input review callbacks are unsupported for historical coverage.');
  const pinnedBun = await readBunPin(root);
  if (process.versions.bun !== pinnedBun) throw new Error(`Unified coverage requires Bun ${pinnedBun}.`);

  function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
  function record(value: unknown, description: string): Record<string, unknown> {
    if (!isRecord(value)) reportRejected(`Invalid Istanbul map: ${description}`);
    return value;
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
    delete environment.VIDA_QUALITY_IMAGE_MANIFEST;
    delete environment.VIDA_QUALITY_IMAGE_SHA256;
    const consumer = manifest.execution_scope?.consumer_configuration;
    if (process.env.VIDA_QUALITY_IMAGE_MANIFEST !== undefined && consumer) {
      environment.AGENT_RUNTIME_TEST_REPOSITORY_ROOT = consumer.repository_root;
      environment.AGENT_RUNTIME_TEST_CONTEXT_ROOT = consumer.repository_root;
    }
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
      : [
          'test',
          '--timeout',
          '5000',
          '--parallel=1',
          '--no-isolate',
          `--config=${path.join(snapshotRoot, 'bunfig.toml')}`,
          ...tests.map((file) => `./${file}`),
        ];
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
    } else if (manifest.execution_scope.consumer_configuration)
      env.AGENT_RUNTIME_TEST_REPOSITORY_ROOT = manifest.execution_scope.consumer_configuration.repository_root;
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

  function requireSnapshotReceipt(
    receipt: Record<string, unknown>,
    manifest: RunManifest,
    expected: SnapshotReceiptBinding,
    name: string,
  ) {
    const sourcePaths = Object.keys(record(receipt.coverage, `${name}.coverage`)).map((file) =>
      path.relative(root, path.resolve(file)).replaceAll('\\', '/'),
    );
    try {
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
    } catch (error) {
      rejectPureReportValidator(error);
    }
    requireSnapshotIdentity(receipt, expected, name);
    requireSnapshotLoadedInputs(receipt, manifest, expected.loaded_inputs, name);
  }

  function requireSnapshotIdentity(receipt: Record<string, unknown>, expected: SnapshotReceiptBinding, name: string) {
    if (
      JSON.stringify(receipt.module_inputs) !== expected.module_inputs ||
      JSON.stringify(receipt.execution_scope) !== expected.execution_scope ||
      JSON.stringify(receipt.active_argv) !== expected.active_argv
    )
      reportRejected('Coverage process snapshot metadata differs from its manifest: ' + name);
    if (JSON.stringify(receipt.preload_input) !== expected.preload_input)
      reportRejected('Coverage process preload identity differs from its manifest: ' + name);
  }

  function requireSnapshotLoadedInputs(
    receipt: Record<string, unknown>,
    manifest: RunManifest,
    expected: Map<string, string>,
    name: string,
  ) {
    requireExternalModuleInputs(receipt.external_module_inputs, name);
    const loaded = receipt.loaded_inputs;
    if (!Array.isArray(loaded)) reportRejected('Coverage process loaded-input receipt is missing: ' + name);
    const loadedItems: unknown[] = loaded;
    const seen = snapshotLoadedPaths(loadedItems, expected, name);
    for (const test of manifest.tests)
      if (!seen.has(test)) reportRejected('Selected test was not snapshot-loaded: ' + test);
    for (const required of [
      'tooling/bun-coverage-preload.ts',
      'tooling/bun-coverage-evidence.ts',
      'tooling/coverage-instrumented-sources.ts',
      'tooling/maintained-source-inventory.ts',
    ])
      if (!seen.has(required)) reportRejected('Snapshot bootstrap dependency was not attested: ' + required);
  }

  function requireExternalModuleInputs(values: unknown, name: string) {
    if (!Array.isArray(values)) reportRejected('Coverage process external-module receipt is missing: ' + name);
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
        reportRejected('Coverage process external-module classification is invalid: ' + name);
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
        reportRejected('Coverage process loaded an unbound local input: ' + name);
      seen.add(item.path);
    }
    return seen;
  }

  async function runBunTests(
    tests: string[],
    manifest: RunManifest,
    manifestPath: string,
    reportDirectory: string,
    invocation: { args: string[]; env: NodeJS.ProcessEnv; cwd: string },
  ): Promise<ChildOutcome & { producerTerminalKnown: boolean; reservationSafeToRelease: boolean }> {
    if (manifest.test_selection.published_execution) {
      const result = spawnSync(process.execPath, invocation.args, {
        cwd: invocation.cwd,
        env: invocation.env,
        // Preserve the published baseline's qualified synchronous execution.
        stdio: ['ignore', 'inherit', 'inherit'],
        timeout: commandBudget.remaining(),
        windowsHide: true,
      });
      return outcomeFromSynchronousProducer(result);
    }
    operationOutcome.test_reservation_safe_to_release = false;
    const group = await superviseCoverageProducers(
      [{ shard_id: 'bun-test', args: invocation.args, cwd: invocation.cwd, env: invocation.env }],
      commandBudget,
    );
    operationOutcome.producer_group = group;
    operationOutcome.test_reservation_safe_to_release = group.reservationSafeToRelease;
    terminalKnown =
      group.reservationSafeToRelease &&
      (operationOutcome.phase_producer_observations ?? []).every((observation) => observation.reservationSafeToRelease);
    operationOutcome.execution_complete = true;
    recordCoverageTerminalObservations(
      path.join(reportDirectory, 'observations', 'supervisor.json'),
      manifest.run_id,
      group,
      persistOperationOutcome,
    );
    const outcome = group.outcomes[0];
    if (!outcome) throw new Error('Coverage producer supervisor returned no outcome.');
    return {
      shard_id: outcome.shard_id,
      status: outcome.status,
      signal: outcome.signal,
      error: outcome.error,
      unknown: outcome.unknown,
      producerTerminalKnown: outcome.producerTerminalKnown,
      reservationSafeToRelease: group.reservationSafeToRelease,
    };
  }

  function outcomeFromSynchronousProducer(
    result: SpawnSyncReturns<unknown>,
  ): ChildOutcome & { producerTerminalKnown: boolean; reservationSafeToRelease: boolean } {
    const producerTerminalKnown = coverageProducerTerminalKnown(result);
    terminalKnown = producerTerminalKnown || coverageProducerReservationSafeToRelease(result);
    operationOutcome.producer_group = {
      outcomes: [
        {
          shard_id: 'bun-test',
          status: result.status,
          signal: result.signal,
          error: result.error ? String(result.error) : null,
          unknown: Boolean(result.error) || result.signal !== null || !Number.isInteger(result.status),
          producer_pid: positivePid(result.pid),
          launch_attempted: true,
          producerTerminalKnown,
          directProducerAccounted: producerTerminalKnown,
          resourceSafeToAdvance: false,
          timeout_observed: result.error && 'code' in result.error && result.error.code === 'ETIMEDOUT' ? true : null,
        },
      ],
      reservationSafeToRelease: producerTerminalKnown || coverageProducerReservationSafeToRelease(result),
      resourceSafeToAdvance: false,
    };
    operationOutcome.test_reservation_safe_to_release =
      producerTerminalKnown || coverageProducerReservationSafeToRelease(result);
    operationOutcome.execution_complete = true;
    persistOperationOutcome();
    if (result.error || result.signal || !Number.isInteger(result.status))
      return {
        shard_id: 'bun-test',
        status: result.status,
        signal: result.signal,
        error: String(result.error ?? 'unknown terminal outcome'),
        unknown: true,
        producerTerminalKnown: coverageProducerTerminalKnown(result),
        reservationSafeToRelease:
          coverageProducerTerminalKnown(result) || coverageProducerReservationSafeToRelease(result),
      };
    return {
      shard_id: 'bun-test',
      status: result.status,
      signal: null,
      error: null,
      unknown: false,
      producerTerminalKnown: coverageProducerTerminalKnown(result),
      reservationSafeToRelease: coverageProducerTerminalKnown(result),
    };
  }

  const lock = acquireCoverageRunLock(outputRoot);
  const runId = randomUUID();
  const operationOutcome: CoverageRunOutcomeInput = {
    run_id: runId,
    selection: { mode: selectionMode, fingerprint: null, ...(focused ? { contour: focused.contour } : {}) },
    input_fingerprints: { source: null, tests: null, tools: null },
    phase: 'preflight',
    expected_producer_count: 1,
    execution_complete: null,
    report_validated: null,
    quality_complete: false,
    quality_passed: null,
  };
  function persistOperationOutcome(): void {
    const directory = path.join(runOutputRoot, 'operation-outcomes');
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    writeAtomic(path.join(directory, runId + '.json'), buildCoverageRunOutcome(operationOutcome));
  }
  let terminalKnown = true;
  let executionFailed = false;
  let executionError: unknown;
  const openShardLogFds: number[] = [];
  try {
    // Historical baseline evidence retains its original declared tool closure;
    // only current production runs the current Source typecheck.
    if (selectionMode === 'current') {
      if ((process.env.BUN_OPTIONS ?? '').trim()) throw new Error('Ambient BUN_OPTIONS are unsupported for coverage.');
      if (!focused || selectedTestsRequireSdkArtifacts(focused.tests))
        await options.prepareSdkInputs?.({
          root,
          ...(focused ? { tests: focused.tests } : {}),
          remainingMs: () => commandBudget.remaining(),
        });
      commandBudget.remaining();
      const typecheckAllowance = commandBudget.remaining();
      const typecheck = spawnSync(process.execPath, ['run', 'typecheck:pinned'], {
        cwd: root,
        env: {
          ...process.env,
          VIDA_PINNED_COMMAND_BUDGET_MS: String(typecheckAllowance),
          VIDA_PINNED_COMMAND_DEADLINE_MS: String(Date.now() + typecheckAllowance),
        },
        stdio: 'inherit',
        timeout: typecheckAllowance,
        killSignal: 'SIGKILL',
        windowsHide: true,
      });
      if (typecheck.error || typecheck.signal || !Number.isInteger(typecheck.status)) {
        const observation = coveragePhaseProducerObservation('typecheck', typecheck);
        operationOutcome.phase_producer_observations = [observation];
        terminalKnown = observation.reservationSafeToRelease;
        persistOperationOutcome();
        throw new Error(
          observation.producerTerminalKnown
            ? 'Pinned coverage typecheck outcome is UNKNOWN; direct producer terminated; preserve run evidence.'
            : terminalKnown
              ? 'Pinned coverage typecheck outcome is UNKNOWN; producer did not start; preserve run evidence.'
              : 'Pinned coverage typecheck outcome is UNKNOWN; preserve the run lock.',
        );
      }
      const typecheckObservation = coveragePhaseProducerObservation('typecheck', typecheck);
      operationOutcome.phase_producer_observations = [typecheckObservation];
      terminalKnown = typecheckObservation.reservationSafeToRelease;
      persistOperationOutcome();
      if (typecheck.status !== 0) throw new Error('Pinned coverage typecheck failed.');
    }
    const lockedInputs = await coverageInputs(root, focused ?? selectionMode);
    operationOutcome.selection.fingerprint = lockedInputs.test_fingerprint;
    operationOutcome.input_fingerprints = {
      source: lockedInputs.source_fingerprint,
      tests: lockedInputs.test_fingerprint,
      tools: lockedInputs.tool_fingerprint,
    };
    operationOutcome.input_proofs = { source: true, tests: true, configuration: true, hashes: true };
    commandBudget.remaining();
    const capturedPin = lockedInputs.input_bytes['.bun-version'];
    if (!capturedPin || new TextDecoder('utf-8', { fatal: true }).decode(capturedPin).trim() !== pinnedBun)
      throw new Error('Captured Bun version differs from the selected runtime pin.');
    assertCurrentCoverageSdkFreshness(root, lockedInputs);
    const requiresConsumer =
      selectionMode === 'current' &&
      lockedInputs.test_inputs.some((entry) => entry.path === 'tests/configured-context.ts');
    const imageContext = requiresConsumer
      ? coverageImageTestContext(root, runId, focused !== undefined, lockedInputs, process.env)
      : null;
    await prepareCoverageImageTestContext(imageContext, lockedInputs);
    const consumerConfiguration = requiresConsumer
      ? await captureCoverageConsumerBinding(root, coverageImageConsumerEnvironment(imageContext, process.env))
      : undefined;
    commandBudget.remaining();
    const runtimeExecutableSha256 = sha256(readFileSync(process.execPath));
    const { input_bytes: inputBytes, ...evidence } = lockedInputs;
    const externalTemporaryRoot = path.resolve(process.env.TMPDIR ?? tmpdir());
    const shardReview = options.reviewCurrentInputs ?? focusedShardReview;
    const shardPreparation =
      selectionMode === 'current' && (!focused || focusedShardReview !== undefined)
        ? prepareCurrentCoverageShardLaunches({
            root,
            temporary_root: externalTemporaryRoot,
            run_id: runId,
            inputs: lockedInputs,
            runtimeExecutableSha256,
            bunVersion: pinnedBun,
            environment: process.env,
            wrappedInvocation,
            ...(shardReview ? { reviewCurrentInputs: shardReview } : {}),
            ...(consumerConfiguration ? { consumerConfiguration } : {}),
          })
        : undefined;
    const preparedShards = shardPreparation?.status === 'prepared' ? shardPreparation : undefined;
    operationOutcome.expected_producer_count = preparedShards?.launches.length ?? 1;
    operationOutcome.phase = 'prepared';
    persistOperationOutcome();
    const runDirectory = path.join(runOutputRoot, 'runs', runId);
    const snapshotDirectory = path.join(runDirectory, 'snapshot');
    const reportDirectory = path.join(runDirectory, 'processes');
    mkdirSync(snapshotDirectory, { recursive: true, mode: 0o700 });
    mkdirSync(reportDirectory, { recursive: true, mode: 0o700 });
    chmodSync(reportDirectory, 0o700);
    mkdirSync(path.join(reportDirectory, 'observations'), { mode: 0o700 });
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
    const sourceMapEntries: [string, FileCoverageData][] = [];
    const focusedFunctions = new Map<string, FunctionRow[]>();
    const instrumentedSources: InstrumentedSourceDigest[] = [];
    let instrumentedTotalBytes = 0;
    for (const entry of evidence.sources) {
      const absolute = path.resolve(root, entry.path);
      const bytes = inputBytes[entry.path];
      if (!bytes) throw new Error(`Immutable source snapshot is missing: ${entry.path}`);
      const source = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      const transformed = instrumentSource(
        absolute,
        source,
        focused ? (ast) => focusedFunctions.set(entry.path, functionInventory(source, entry.path, ast)) : undefined,
      );
      const artifactBytes = Buffer.from(transformed.code, 'utf8');
      if (
        artifactBytes.length > maxInstrumentedArtifactBytes ||
        instrumentedTotalBytes + artifactBytes.length > maxInstrumentedArtifactsBytes
      )
        throw new Error('Coverage instrumented artifacts exceed configured byte limits.');
      instrumentedTotalBytes += artifactBytes.length;
      const artifactPath = instrumentedArtifactPath(entry.path);
      const artifactTarget = path.join(snapshotDirectory, ...artifactPath.split('/'));
      mkdirSync(path.dirname(artifactTarget), { recursive: true, mode: 0o700 });
      writeFileSync(artifactTarget, artifactBytes, { flag: 'wx', mode: 0o400 });
      instrumentedSources.push({
        path: entry.path,
        source_sha256: entry.sha256,
        artifact_path: artifactPath,
        artifact_sha256: sha256(artifactBytes),
      });
      sourceMapEntries.push([absolute, transformed.fileCoverage]);
    }
    commandBudget.remaining();
    sealSnapshotTree(snapshotDirectory, fixtureDependencyLink, fixtureRoot);
    // Published tests intentionally write coverage-subject scratch here. These
    // Outputs carry no measurement authority; captured files are byte-checked.
    for (const directory of fixtureOutputs) chmodSync(directory, 0o700);
    const sourceMaps: Record<string, FileCoverageData> = Object.fromEntries(sourceMapEntries);
    const snapshotRelative = path.relative(root, snapshotDirectory).replaceAll('\\', '/');
    const manifest: RunManifest = {
      schema: preparedShards ? 'VidaBunCoverageRun/v3' : 'VidaBunCoverageRun/v2',
      run_id: runId,
      bun_version: pinnedBun,
      runtime_executable_sha256: runtimeExecutableSha256,
      snapshot_directory: snapshotRelative,
      ...evidence,
      test_selection: evidence.test_selection,
      source_maps: sourceMaps,
      instrumented_sources: instrumentedSources,
      ...(preparedShards
        ? {
            coverage_plan: preparedShards.plan,
            assignment_plan_sha256: preparedShards.binding.assignment_plan_sha256,
            shard_invocations: [...preparedShards.invocations],
            shard_temporary_root: externalTemporaryRoot,
          }
        : {}),
      execution_scope: {
        ...(wrappedInvocation ? { wrapper_review_clocks: true } : {}),
        ...(consumerConfiguration ? { consumer_configuration: consumerConfiguration } : {}),
        ...(preparedShards
          ? {
              shard_eligibility: {
                artifact_sha256: preparedShards.artifact_sha256,
                review_scope_sha256: preparedShards.review_scope_sha256,
              },
            }
          : {}),
        ...(shardPreparation?.status === 'serial-fallback'
          ? {
              shard_eligibility: {
                status: shardPreparation.status,
                reason: shardPreparation.reason,
                ...(shardPreparation.artifact_sha256 ? { artifact_sha256: shardPreparation.artifact_sha256 } : {}),
                ...(shardPreparation.review_scope_sha256
                  ? { review_scope_sha256: shardPreparation.review_scope_sha256 }
                  : {}),
              },
            }
          : {}),
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
    const invocation = preparedShards
      ? { args: [], env: {} as NodeJS.ProcessEnv, cwd: root }
      : bunTestInvocation(evidence.tests, manifest, manifestPath, reportDirectory);
    commandBudget.remaining();
    manifest.active_argv = invocation.args;
    writeAtomic(manifestPath, manifest);
    if (preparedShards) {
      for (const shardInvocation of preparedShards.invocations) {
        const outputs = shardInvocation.output_paths;
        mkdirSync(outputs.coverage_directory, { recursive: true, mode: 0o700 });
        mkdirSync(path.dirname(outputs.junit_file), { recursive: true, mode: 0o700 });
        mkdirSync(outputs.receipt_directory, { recursive: true, mode: 0o700 });
        mkdirSync(outputs.temp_directory, { recursive: true, mode: 0o700 });
        mkdirSync(path.dirname(outputs.log_file), { recursive: true, mode: 0o700 });
        openShardLogFds.push(openSync(outputs.log_file, 'wx', 0o600));
      }
    }
    chmodSync(runDirectory, 0o500);
    let shardGroup: CoverageProducerGroup | undefined;
    let outcome: ChildOutcome | undefined;
    operationOutcome.phase = 'execution';
    if (preparedShards) {
      const launches = preparedShards.launches.map((launch, index) => {
        const logFd = openShardLogFds[index];
        if (logFd === undefined) throw new Error('Coverage shard caller-owned log descriptor is missing.');
        return { ...launch, log_fd: logFd };
      });
      const errors: unknown[] = [];
      try {
        terminalKnown = false;
        operationOutcome.test_reservation_safe_to_release = false;
        shardGroup = await superviseCoverageProducers(launches, commandBudget);
        operationOutcome.test_reservation_safe_to_release = shardGroup.reservationSafeToRelease;
        terminalKnown =
          shardGroup.reservationSafeToRelease &&
          (operationOutcome.phase_producer_observations ?? []).every(
            (observation) => observation.reservationSafeToRelease,
          );
        operationOutcome.producer_group = shardGroup;
        operationOutcome.execution_complete = true;
        recordCoverageTerminalObservations(
          path.join(reportDirectory, 'observations', 'supervisor.json'),
          runId,
          shardGroup,
          persistOperationOutcome,
        );
      } catch (error) {
        errors.push(error);
      }
      while (openShardLogFds.length) {
        const fd = openShardLogFds.shift()!;
        try {
          closeSync(fd);
        } catch (error) {
          errors.push(error);
        }
      }
      if (errors.length === 1) throw errors[0];
      if (errors.length > 1) throw new AggregateError(errors, 'Coverage shard supervision and log closure failed.');
    } else {
      const result = await runBunTests(evidence.tests, manifest, manifestPath, reportDirectory, invocation);
      const { producerTerminalKnown, reservationSafeToRelease, ...serialOutcome } = result;
      outcome = serialOutcome;
      if (outcome.unknown) {
        terminalKnown =
          reservationSafeToRelease &&
          (operationOutcome.phase_producer_observations ?? []).every(
            (observation) => observation.reservationSafeToRelease,
          );
        throw new Error(
          producerTerminalKnown
            ? 'Bun Test outcome is UNKNOWN; direct coverage producer terminated; preserve run directory and test-effect custody.'
            : reservationSafeToRelease
              ? 'Bun Test outcome is UNKNOWN; producer did not start; preserve run directory and test-effect custody.'
              : 'Bun Test outcome is UNKNOWN; preserve lock and run directory.',
        );
      }
      if (outcome.status !== 0 && !(publishedFixture && outcome.status === 1))
        throw new Error('Bun Test coverage suite failed.');
    }
    operationOutcome.phase = 'report';
    commandBudget.remaining();
    const historicalJUnitBytes =
      publishedFixture && outcome?.status === 1
        ? readFileSync(path.join(reportDirectory, 'suite.junit.xml'))
        : undefined;
    if (historicalJUnitBytes) {
      try {
        historicalReferenceJUnit(historicalJUnitBytes, fixtureRoot!, evidence.tests);
      } catch (error) {
        rejectPureReportValidator(error);
      }
    }
    let historicalInventory: { process_file: string; pid: number; child_id: number } | undefined;
    if (publishedFixture) assertCoverageSnapshotBytes(snapshotDirectory, inputBytes);

    let finalReport: Record<string, unknown>;
    let focusedCounters: Record<string, FileCoverageData> | undefined;
    let publishedReference: ReturnType<typeof parseHistoricalReference> | undefined;
    if (preparedShards) {
      if (!shardGroup) throw new Error('Coverage shard group disappeared before report assembly.');
      finalReport = collectCoverageShardReport({
        root,
        manifestPath,
        manifest: manifest as ShardReportManifest,
        group: shardGroup,
      });
      if (focused) {
        try {
          focusedCounters = validateCapturedFocusedShardCounters(root, finalReport, lockedInputs, manifest.source_maps);
        } catch (error) {
          rejectPureReportValidator(error);
        }
      }
    } else {
      if (!outcome) throw new Error('Serial coverage producer has no terminal outcome.');
      const reportFiles = readdirSync(reportDirectory)
        .filter((file) => file.endsWith('.json'))
        .sort();
      if (!reportFiles.length) reportRejected('Bun coverage run produced no per-process reports.');
      const childCoverageMaps: Record<string, unknown>[] = [];
      const processReceipts: { file: string; pid: number; shard_id: 'bun-test'; sha256: string }[] = [];
      const expectedPaths = evidence.sources.map((entry) => path.resolve(root, entry.path)).sort();
      const expectedPathSet = new Set(expectedPaths);
      let expectedSourceIdentity: string | undefined;
      const preload = manifest.tool_inputs.find((entry) => entry.path === 'tooling/bun-coverage-preload.ts');
      const expectedReceipt: SnapshotReceiptBinding = {
        module_inputs: JSON.stringify(manifest.module_inputs),
        execution_scope: JSON.stringify(manifest.execution_scope),
        active_argv: JSON.stringify(manifest.active_argv),
        preload_input: JSON.stringify({ path: 'tooling/bun-coverage-preload.ts', sha256: preload?.sha256 }),
        loaded_inputs: new Map(
          [...manifest.sources, ...manifest.test_inputs, ...manifest.tool_inputs].map((entry) => [
            entry.path,
            entry.sha256,
          ]),
        ),
      };
      const manifestDigest = sha256(readFileSync(manifestPath));
      for (const name of reportFiles) {
        const reportPath = path.join(reportDirectory, name);
        const processBytes = readFileSync(reportPath);
        let reportValue: unknown;
        try {
          reportValue = JSON.parse(processBytes.toString('utf8'));
        } catch {
          reportRejected('Per-process coverage report is not valid JSON: ' + name);
        }
        const report = record(reportValue, `${name}.report`);
        if (
          report.schema !== 'VidaBunCoverageProcess/v1' ||
          report.run_id !== runId ||
          report.shard_id !== 'bun-test' ||
          report.source_fingerprint !== manifest.source_fingerprint ||
          report.test_fingerprint !== manifest.test_fingerprint ||
          report.tool_fingerprint !== manifest.tool_fingerprint ||
          report.runtime_executable_sha256 !== manifest.runtime_executable_sha256 ||
          JSON.stringify(report.sources) !== (expectedSourceIdentity ??= JSON.stringify(evidence.sources))
        )
          reportRejected('Foreign or stale per-process coverage report: ' + name);
        if (typeof report.pid !== 'number' || !Number.isSafeInteger(report.pid) || report.pid < 1)
          reportRejected('Invalid coverage report process identity.');
        requireSnapshotReceipt(report, manifest, expectedReceipt, name);
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
        if (paths.some((file) => !expectedPathSet.has(file)))
          reportRejected('Per-process report contains an unexpected source: ' + name);
        childCoverageMaps.push(coverage);
        processReceipts.push({
          file: name,
          pid: report.pid,
          shard_id: 'bun-test',
          sha256: sha256(processBytes),
        });
      }
      const mergedCoverage = mergeCoverageShardCounters(manifest.source_maps, childCoverageMaps);
      const mergedPaths = Object.keys(mergedCoverage)
        .map((file) => path.resolve(file))
        .sort();
      if (JSON.stringify(mergedPaths) !== JSON.stringify(expectedPaths))
        reportRejected('Merged coverage source set differs from maintained inventory.');
      try {
        publishedReference = historicalJUnitBytes
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
      } catch (error) {
        rejectPureReportValidator(error);
      }
      finalReport = {
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
        coverage: mergedCoverage,
      };
      if (focused) focusedCounters = mergedCoverage;
    }
    if (focused) {
      if (!focusedCounters) throw new Error('Focused coverage counters are missing.');
      finalReport = focusedCoverageDiagnosticReport({
        root,
        report: finalReport,
        coverage: focusedCounters,
        inputs: lockedInputs,
        sourceMaps: manifest.source_maps,
        functions: focusedFunctions,
      });
    }
    const finalPath = focused
      ? path.join(runOutputRoot, runId + '.focused-coverage.json')
      : path.join(outputRoot, 'coverage-final.json');
    commandBudget.remaining();
    if (focused) {
      assertCoverageSnapshotBytes(snapshotDirectory, inputBytes);
      const currentInputs = await readQualityInputs(root, Object.keys(inputBytes));
      for (const [file, bytes] of currentInputs)
        if (!bytes.equals(inputBytes[file]!)) throw new Error('Focused coverage input changed: ' + file);
      commandBudget.remaining();
    }
    await assertCoverageImageTestContext(imageContext, lockedInputs);
    writeAtomic(finalPath, finalReport);
    if (focused && process.env.VIDA_QUALITY_IMAGE_MANIFEST === undefined) {
      try {
        recordContourReport(root, finalReport, finalPath);
      } catch (error) {
        process.stderr.write('Contour projection output gap: ' + String(error) + '\n');
      }
    }
    if (focused)
      process.stdout.write(
        JSON.stringify({ schema: 'VidaBunFocusedCoverageDiagnosticLocation/v1', report: finalPath }) + '\n',
      );
    if (publishedReference) {
      process.stderr.write(
        'Historical measurement admitted; published suite remains FAIL, current quality remains unqualified.\n',
      );
      process.exitCode = 1;
    }
    for (const gateScript of selectionMode === 'current' && !focused ? ['tooling/crap-gate.ts'] : []) {
      operationOutcome.phase = 'quality';
      const capturedGate = path.join(snapshotDirectory, ...gateScript.split('/'));
      const gate = spawnSync(process.execPath, [capturedGate], {
        cwd: root,
        env: {
          ...process.env,
          VIDA_BUN_COVERAGE_ROOT: root,
          VIDA_BUN_COVERAGE_REPORT: finalPath,
          VIDA_COVERAGE_RECORD_VALIDATION: '1',
        },
        timeout: commandBudget.remaining(300_000),
        killSignal: 'SIGKILL',
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
        windowsHide: true,
      });
      const qualityObservation = coveragePhaseProducerObservation('quality', gate);
      operationOutcome.phase_producer_observations = [
        ...(operationOutcome.phase_producer_observations ?? []),
        qualityObservation,
      ];
      terminalKnown =
        qualityObservation.reservationSafeToRelease &&
        (operationOutcome.producer_group?.reservationSafeToRelease ?? true) &&
        operationOutcome.phase_producer_observations.every((observation) => observation.reservationSafeToRelease);
      if (!gate.error && !gate.signal && Number.isInteger(gate.status)) {
        operationOutcome.quality_complete = true;
        operationOutcome.quality_passed = gate.status === 0;
      }
      persistOperationOutcome();
      process.stdout.write(gate.stdout ?? '');
      process.stderr.write(gate.stderr ?? '');
      const validationObservationPath = path.join(reportDirectory, 'observations', 'report-validation.json');
      let validationBytes: Buffer | undefined;
      try {
        validationBytes = readFileSync(validationObservationPath);
      } catch (error) {
        if (!isRecord(error) || error.code !== 'ENOENT') throw error;
      }
      if (validationBytes) {
        let observation: unknown;
        try {
          observation = JSON.parse(validationBytes.toString('utf8'));
        } catch {
          reportRejected('Coverage report validation observation is not valid JSON.');
        }
        if (
          !isRecord(observation) ||
          Object.keys(observation).sort().join(',') !==
            'run_id,schema,source_fingerprint,test_fingerprint,tool_fingerprint,validated' ||
          observation.schema !== 'VidaBunCoverageReportValidationObservation/v1' ||
          observation.run_id !== runId ||
          observation.source_fingerprint !== evidence.source_fingerprint ||
          observation.test_fingerprint !== evidence.test_fingerprint ||
          observation.tool_fingerprint !== evidence.tool_fingerprint ||
          observation.validated !== true
        )
          reportRejected('Coverage report validation observation does not match this operation.');
        operationOutcome.report_validated = true;
      }
      if (gate.error || gate.signal || gate.status === null) {
        throw new Error(
          qualityObservation.producerTerminalKnown
            ? `${gateScript} outcome is UNKNOWN; direct gate producer terminated; preserve run evidence.`
            : qualityObservation.reservationSafeToRelease
              ? `${gateScript} outcome is UNKNOWN; gate producer did not start; preserve run evidence.`
              : `${gateScript} outcome is UNKNOWN; preserve the run lock for reconciliation.`,
        );
      }
      if (gate.status !== 0) throw new Error(`${gateScript} failed.`);
      if (operationOutcome.report_validated !== true)
        throw new Error('Coverage quality producer did not record report validation completion.');
    }
    operationOutcome.phase = 'complete';
    persistOperationOutcome();
  } catch (error) {
    if (error instanceof CoverageReportRejectedError) operationOutcome.report_rejected = true;
    executionFailed = true;
    const closeErrors: unknown[] = [];
    while (openShardLogFds.length) {
      const fd = openShardLogFds.shift()!;
      try {
        closeSync(fd);
      } catch (closeError) {
        closeErrors.push(closeError);
      }
    }
    executionError = closeErrors.length
      ? new AggregateError([error, ...closeErrors], 'Coverage execution and caller-owned shard log closure failed.')
      : error;
    operationOutcome.original_error = executionError;
    try {
      persistOperationOutcome();
    } catch (recordError) {
      executionError = new AggregateError(
        [executionError, recordError],
        'Coverage execution and operation recording failed.',
      );
    }
  }
  let cleanupFailed = false;
  let cleanupError: unknown;
  if (terminalKnown) {
    try {
      if (!releaseCoverageRunLock(lock)) throw new Error('Owned coverage lock disappeared before terminal cleanup.');
    } catch (error) {
      cleanupFailed = true;
      cleanupError = error;
      operationOutcome.original_error = executionFailed
        ? new AggregateError([executionError, error], 'Coverage execution and lock cleanup both failed.')
        : error;
      try {
        persistOperationOutcome();
      } catch (recordError) {
        cleanupError = new AggregateError(
          [error, recordError],
          'Coverage lock cleanup and operation recording failed.',
        );
      }
    }
  }
  if (focused && process.env.VIDA_QUALITY_IMAGE_MANIFEST === undefined) {
    try {
      recordContourReport(
        root,
        buildCoverageRunOutcome(operationOutcome),
        path.join(runOutputRoot, 'operation-outcomes', runId + '.json'),
      );
    } catch (error) {
      process.stderr.write('Contour operation projection output gap: ' + String(error) + '\n');
    }
  }
  if (executionFailed && cleanupFailed)
    throw new AggregateError([executionError, cleanupError], 'Coverage execution and lock cleanup both failed.');
  if (executionFailed) throw executionError;
  if (cleanupFailed) throw cleanupError;
}

function isCoverageAdapter(value: unknown): value is { runCoverage: () => unknown } {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    typeof Reflect.get(value, 'runCoverage') === 'function'
  );
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  if (process.argv.slice(2).includes('--published-baseline=b549951')) await runBunCoverage();
  else if (existsSync(path.resolve(root, '../../tooling/agent/run-coverage.ts'))) {
    const adapter = path.resolve(root, '../../tooling/agent/run-coverage.ts');
    const adapterModule = (await import(pathToFileURL(adapter).href)) as unknown;
    if (!isCoverageAdapter(adapterModule)) throw new Error('Current coverage adapter entrypoint is missing.');
    await adapterModule.runCoverage();
  } else await runBunCoverage();
}
