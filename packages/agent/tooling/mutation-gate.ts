import { recordContourReport } from './contour-progress-cli.ts';
import {
  mutationPartitionSources as partitionSources,
  mutationPartitions,
  type MutationPartition,
} from './mutation-partitions.ts';
import { randomUUID } from 'node:crypto';
import { mutationLimits } from './mutation-limits.ts';
import { installedStrykerCli } from './mutation-generation.ts';
import { lstat, mkdir, mkdtemp, open, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  readBoundedMutationArtifact as readBoundedEvidence,
  mutationEvidenceByteLimit as junitByteLimit,
  mutationArtifactByteLimit as reportByteLimit,
} from './mutation-artifact-reader.ts';
import { parse } from '@babel/parser';
import type { schema } from '@stryker-mutator/api/core';
import {
  globalMutationMap,
  assertGlobalMutationMap,
  confirmPartitionMutationMap,
  writeMutationMapArtifact,
  type NativeMutationReceiptReference,
} from './mutation-map.ts';
import { checkManifest, pinnedEnvironment, readPin } from '../bin/bun.ts';
import { maintainedSourceInventory } from './maintained-source-inventory.ts';
import {
  mutationPartitionSourceBinding,
  mutationTestContextBinding,
  assertMutationTestContext,
} from './mutation-command-runner.ts';
import { qualityInputs, qualityFingerprint, repositoryRootForPackage, sha256 } from './bun-coverage-evidence.ts';
import { readMutationPerTestCapture } from './mutation-per-test-evidence.ts';
import {
  buildMutationTestCommand,
  collectExecutionIdentity,
  executionIdentityForInvocation,
  executionIdentityDigest,
  confirmedRunnerOutcome,
  executeMutationCommand,
  junitOutcome,
  type MutationJUnitCase,
  nativeMutationActivationHitCount,
  mutationReceiptMatches,
  mutationToolInputs,
  parseMutationBodyEvents,
  testFilesWithLifecycleHooks,
} from './mutation-evidence.ts';
import type {
  CapturedOutput,
  MutationEvidenceReceipt,
  MutationProcessResult,
  ProcessCustody,
} from './mutation-evidence.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const strykerPartitionDeadlineMs = mutationLimits.partitionMs;
const maximumStrykerDeadlineMs = 4 * 60 * 60 * 1000;

type QualityInputs = Awaited<ReturnType<typeof qualityInputs>>;
type ReceiptValidationContext = {
  identity: Awaited<ReturnType<typeof collectExecutionIdentity>>;
  hookFiles: string[];
};
export type { MutationPartition } from './mutation-partitions.ts';
type MutationSelection =
  | { scope: 'full'; inventory: boolean; partitions: MutationPartition[]; mapOnly?: true }
  | { scope: 'partition-pilot'; inventory: false; partitions: [MutationPartition]; perTestCapture?: 'diagnostic-v2' };

export function selectMutationPartitions(args: readonly string[], partitions: MutationPartition[]): MutationSelection {
  if (args.length === 1 && args[0] === '--map-inventory')
    return { scope: 'full', inventory: false, mapOnly: true, partitions };
  if (args.length === 0 || (args.length === 1 && args[0] === '--inventory'))
    return { scope: 'full', inventory: args.length === 1, partitions };
  const capture = args.length === 2 && args[0] === '--pilot-per-test-capture';
  if (args.length !== 2 || (args[0] !== '--pilot-partition' && !capture))
    throw new Error(
      'Expected no arguments, --inventory, --map-inventory, --pilot-partition <exact-name>, or --pilot-per-test-capture <exact-name>.',
    );
  const matches = partitions.filter((partition) => partition.name === args[1]);
  const partition = matches[0];
  if (
    matches.length !== 1 ||
    !partition ||
    partition.environment === 'static' ||
    partition.environment === 'pending' ||
    !partition.report ||
    !partition.tests?.length ||
    !partitionSources(partition).length
  )
    throw new Error('Mutation pilot requires exactly one declared runnable partition.');
  return {
    scope: 'partition-pilot',
    inventory: false,
    partitions: [partition],
    ...(capture ? { perTestCapture: 'diagnostic-v2' as const } : {}),
  };
}

export function mutationJUnitCaseCensusMatches(
  baseline: readonly MutationJUnitCase[],
  mutant: readonly MutationJUnitCase[],
): boolean {
  const canonical = (cases: readonly MutationJUnitCase[]) =>
    cases.map((row) => JSON.stringify([row.test_file, row.name, row.outcome])).sort();
  return JSON.stringify(canonical(baseline)) === JSON.stringify(canonical(mutant));
}

type MutationRecord = Pick<schema.MutantResult, 'id' | 'status'>;
type MutationFileReport = Pick<schema.FileResult, 'source' | 'mutants'>;
type MutationReport = { files: Record<string, MutationFileReport> };
export type MutationRunnerResult = {
  exitCode: number | null;
  observed_exit_code: number | null;
  signalCode: string | null;
  output_complete: boolean;
  timed_out: boolean;
  deadline_ms: number;
  spawn_error: string | null;
  process_custody: ProcessCustody | null;
  process_receipt: string;
  stdout_capture: Record<string, unknown>;
  stderr_capture: Record<string, unknown>;
};
type ReceiptOutcome =
  | { status: 'passed'; cases: MutationJUnitCase[]; native_receipt?: Omit<NativeMutationReceiptReference, 'launcher'> }
  | { status: 'killed'; native_receipt?: Omit<NativeMutationReceiptReference, 'launcher'> }
  | { status: 'unknown'; reason: string };
type PartitionIssue = { partition: string; error: string };
type SourceIssue = { partition: string; source: string };
type UnknownMutant = { partition: string; mutant_id: string | null; reason: string };

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function mutationRecord(value: unknown): value is MutationRecord {
  if (!record(value) || typeof value.id !== 'string') return false;
  switch (value.status) {
    case 'Killed':
    case 'Survived':
    case 'NoCoverage':
    case 'CompileError':
    case 'RuntimeError':
    case 'Timeout':
    case 'Ignored':
    case 'Pending':
      return true;
    default:
      return false;
  }
}

function mutationFileReport(value: unknown): value is MutationFileReport {
  return (
    record(value) &&
    typeof value.source === 'string' &&
    Array.isArray(value.mutants) &&
    value.mutants.every(mutationRecord)
  );
}

function mutationReport(value: unknown): value is MutationReport {
  if (!record(value) || !record(value.files)) return false;
  for (const file of Object.values(value.files)) if (!mutationFileReport(file)) return false;
  return true;
}

function junitName(partition: string, mutantId: string | null): string {
  const key = mutantId === null ? 'dry-run' : sha256(mutantId);
  return `${partition}-${key}.xml`;
}

function receiptName(partition: string, mutantId: string | null): string {
  const key = mutantId === null ? 'dry-run' : sha256(mutantId);
  return `${partition}-${key}.receipt.json`;
}

async function verifyCapturedOutput(
  reportDirectory: string,
  stdoutFile: string,
  stderrFile: string,
  receipt: Pick<MutationEvidenceReceipt, 'stdout_capture' | 'stderr_capture'>,
): Promise<void> {
  const [stdout, stderr] = await Promise.all([
    readBoundedEvidence(reportDirectory, stdoutFile, junitByteLimit, true),
    readBoundedEvidence(reportDirectory, stderrFile, junitByteLimit, true),
  ]);
  if (
    sha256(stdout) !== receipt.stdout_capture.sha256 ||
    stdout.length !== receipt.stdout_capture.bytes ||
    sha256(stderr) !== receipt.stderr_capture.sha256 ||
    stderr.length !== receipt.stderr_capture.bytes
  )
    throw new Error('Captured runner output differs from its retained stream hashes.');
}

async function writeStrykerProcessReceipt(
  reportDirectory: string,
  partition: string,
  receipt: Record<string, unknown>,
): Promise<void> {
  const handle = await open(path.join(reportDirectory, `stryker-${partition}.process.json`), 'wx', 0o600);
  try {
    await handle.writeFile(JSON.stringify(receipt));
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function reconcileStrykerOutput(
  captures: MutationProcessResult['output_capture'],
  reportDirectory: string,
  stdoutFile: string,
  stderrFile: string,
): Promise<{ outputComplete: boolean; stdoutCapture: CapturedOutput | null; stderrCapture: CapturedOutput | null }> {
  const stdoutCapture = captures?.complete === true ? captures.stdout : null;
  const stderrCapture = captures?.complete === true ? captures.stderr : null;
  let outputComplete =
    stdoutCapture !== null && stderrCapture !== null && !stdoutCapture.truncated && !stderrCapture.truncated;
  if (outputComplete && stdoutCapture && stderrCapture) {
    try {
      await verifyCapturedOutput(reportDirectory, path.basename(stdoutFile), path.basename(stderrFile), {
        stdout_capture: stdoutCapture,
        stderr_capture: stderrCapture,
      });
    } catch {
      outputComplete = false;
    }
  }
  return { outputComplete, stdoutCapture, stderrCapture };
}

function strykerRunnerResult(
  processResult: MutationProcessResult,
  deadlineMs: number,
  partition: string,
  stdoutFile: string,
  stderrFile: string,
  output: Awaited<ReturnType<typeof reconcileStrykerOutput>>,
): MutationRunnerResult {
  const signalCode = processResult.signal === null ? null : String(processResult.signal);
  const observedExitCode = processResult.exitCode;
  return {
    exitCode:
      output.outputComplete && !processResult.timedOut && signalCode === null && processResult.spawnError === null
        ? observedExitCode
        : null,
    observed_exit_code: observedExitCode,
    signalCode,
    output_complete: output.outputComplete,
    timed_out: processResult.timedOut,
    deadline_ms: deadlineMs,
    spawn_error: processResult.spawnError,
    process_custody: processResult.processCustody,
    process_receipt: `stryker-${partition}.process.json`,
    stdout_capture: { file: path.basename(stdoutFile), ...(output.stdoutCapture ?? { complete: false }) },
    stderr_capture: { file: path.basename(stderrFile), ...(output.stderrCapture ?? { complete: false }) },
  };
}

function strykerRunUnknown(result: MutationRunnerResult): boolean {
  const ownedProcessGroupTerminated =
    result.process_custody?.scope === 'owned-process-group' &&
    result.process_custody.processGroupTerminationObserved === true;
  return (
    result.exitCode === null ||
    result.signalCode !== null ||
    !result.output_complete ||
    result.timed_out ||
    result.spawn_error !== null ||
    !ownedProcessGroupTerminated
  );
}

export type PartitionRun = MutationPartition & { result: MutationRunnerResult; report: string };

export async function runStrykerPartitions(
  partitions: MutationPartition[],
  runPartition: (partition: MutationPartition, recordRun: (run: PartitionRun) => void) => Promise<boolean>,
): Promise<PartitionRun[]> {
  const runs: PartitionRun[] = [];
  for (const partition of partitions) {
    const previousRunCount = runs.length;
    if (!(await runPartition(partition, (run) => runs.push(run)))) break;
    const latestRun = runs[runs.length - 1];
    if (runs.length > previousRunCount && latestRun && strykerRunUnknown(latestRun.result)) break;
  }
  return runs;
}

async function runCapturedStryker(
  command: string[],
  cwd: string,
  environment: NodeJS.ProcessEnv,
  reportDirectory: string,
  partition: string,
  stdoutFile: string,
  stderrFile: string,
  deadlineMs: number,
  inputFingerprint: string,
  partitionSources: string[],
  partitionSourceFingerprint: string,
): Promise<MutationRunnerResult> {
  if (!Number.isSafeInteger(deadlineMs) || deadlineMs < 1 || deadlineMs > maximumStrykerDeadlineMs)
    throw new Error('Trusted Stryker partition deadline is outside the supported finite bound.');
  const startedAt = Date.now();
  const deadlineAt = startedAt + deadlineMs;
  const processResult = await executeMutationCommand(command, cwd, deadlineMs, {
    env: environment,
    stdoutFile,
    stderrFile,
    outputByteLimit: junitByteLimit,
    terminationGraceMs: 5_000,
    forceWaitMs: 5_000,
    ownedProcessGroup: true,
  });
  const output = await reconcileStrykerOutput(processResult.output_capture, reportDirectory, stdoutFile, stderrFile);
  const result = strykerRunnerResult(processResult, deadlineMs, partition, stdoutFile, stderrFile, output);
  await writeStrykerProcessReceipt(reportDirectory, partition, {
    schema: 'StrykerProcessReceipt/v1',
    partition,
    command_sha256: sha256(JSON.stringify(command)),
    input_fingerprint: inputFingerprint,
    input_descriptor_file: `${partition}.inputs.json`,
    partition_sources: partitionSources,
    partition_source_fingerprint: partitionSourceFingerprint,
    started_at: new Date(startedAt).toISOString(),
    deadline_unix_ms: deadlineAt,
    completed_at: new Date().toISOString(),
    ...result,
  });
  return result;
}

export async function confirmRunnerReceipt(
  reportDirectory: string,
  runId: string,
  partition: string,
  mutantId: string | null,
  tests: string[],
  inputs: QualityInputs,
  fingerprint: string,
  partitionSources: string[],
  partitionSourceFingerprint: string,
  context: ReceiptValidationContext,
  expectedCases?: readonly MutationJUnitCase[],
  perTestCapture?: 'diagnostic-v2',
  requireNativeActivation = false,
): Promise<ReceiptOutcome> {
  try {
    const junitFile = junitName(partition, mutantId);
    const command = buildMutationTestCommand(process.execPath, tests, path.join(reportDirectory, junitFile));
    const testContext = mutationTestContextBinding(path.join(reportDirectory, junitFile), inputs.tool_inputs);
    const sandboxRoot = path.join(reportDirectory, 'stryker-tmp');
    const expectedIdentity = executionIdentityForInvocation(context.identity, command, tests);
    const receiptFile = receiptName(partition, mutantId);
    const receiptBytes = await readBoundedEvidence(reportDirectory, receiptFile);
    const receipt: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(receiptBytes));
    const stdoutFile = junitFile.replace(/\.xml$/u, '.stdout.log');
    const stderrFile = junitFile.replace(/\.xml$/u, '.stderr.log');
    const bodyEventsFile = junitFile.replace(/\.xml$/u, '.body.jsonl');
    let captureReceipt:
      | { mode: 'diagnostic-v2'; file: 'per-test-coverage.json'; bytes: number; sha256: string }
      | undefined;
    if (perTestCapture === 'diagnostic-v2') {
      const adapterDirectory = path.join(reportDirectory, `${junitFile.replace(/\.xml$/u, '')}.adapters`);
      const directoryBefore = await lstat(adapterDirectory);
      if (!directoryBefore.isDirectory() || directoryBefore.isSymbolicLink())
        throw new Error('Per-test coverage adapter directory is missing or linked.');
      const captureBytes = await readBoundedEvidence(adapterDirectory, 'per-test-coverage.json');
      const capture: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(captureBytes));
      readMutationPerTestCapture(capture);
      const directoryAfter = await lstat(adapterDirectory);
      if (
        !directoryAfter.isDirectory() ||
        directoryAfter.isSymbolicLink() ||
        directoryAfter.dev !== directoryBefore.dev ||
        directoryAfter.ino !== directoryBefore.ino
      )
        throw new Error('Per-test coverage adapter directory changed while reading.');
      captureReceipt = {
        mode: 'diagnostic-v2',
        file: 'per-test-coverage.json',
        bytes: captureBytes.length,
        sha256: sha256(captureBytes),
      };
    }
    if (
      !mutationReceiptMatches(receipt, {
        runId,
        partition,
        mutantId,
        tests,
        inputs,
        fingerprint,
        junitFile,
        command,
        sandboxRoot,
        stdoutFile,
        stderrFile,
        bodyEventsFile,
        executionIdentity: expectedIdentity,
        testContext,
        ...(captureReceipt === undefined ? {} : { perTestCapture: captureReceipt }),
      })
    )
      throw new Error('Runner receipt does not bind the active mutant to the current parent snapshot.');
    if (
      !record(receipt) ||
      receipt.partition_source_fingerprint !== partitionSourceFingerprint ||
      JSON.stringify(receipt.partition_sources) !== JSON.stringify(partitionSources)
    )
      throw new Error('Runner receipt does not bind the current owned partition sources.');
    await assertMutationTestContext(testContext, inputs.input_bytes);
    const junitBytes = await readBoundedEvidence(reportDirectory, receipt.junit_file);
    if (sha256(junitBytes) !== receipt.junit_sha256 || receipt.junit_bytes !== junitBytes.length)
      throw new Error('JUnit output does not match the runner receipt.');
    await verifyCapturedOutput(reportDirectory, stdoutFile, stderrFile, receipt);
    const bodyBytes = await readBoundedEvidence(reportDirectory, bodyEventsFile, junitByteLimit, true);
    if (sha256(bodyBytes) !== receipt.body_events_sha256 || bodyBytes.length !== receipt.body_events_bytes)
      throw new Error('Mutation body events differ from the runner receipt.');
    const bodyEvents = parseMutationBodyEvents(bodyBytes, tests);
    const activationHitCount = nativeMutationActivationHitCount(bodyEvents, mutantId, requireNativeActivation);
    const hookGaps = context.hookFiles;
    const cases: MutationJUnitCase[] = [];
    const outcome = junitOutcome(
      new TextDecoder('utf-8', { fatal: true }).decode(junitBytes),
      tests,
      hookGaps,
      bodyEvents,
      (row) => cases.push(row),
      mutantId !== null,
    );
    const result = confirmedRunnerOutcome(
      receipt.exit_code,
      outcome.outcome,
      requireNativeActivation && mutantId !== null ? (activationHitCount ?? 0) : undefined,
    );
    let nativeReceipt: Omit<NativeMutationReceiptReference, 'launcher'> | undefined;
    if (requireNativeActivation && result !== 'unknown') {
      const source = mutationPartitionSourceBinding(partition, partitionSources, inputs.sources);
      if (!source) throw new Error('Native receipt partition Source binding is incomplete.');
      nativeReceipt = {
        artifact: { file: receiptFile, bytes: receiptBytes.length, sha256: sha256(receiptBytes) },
        binding: {
          run_id: runId,
          partition,
          input_fingerprint: fingerprint,
          source_fingerprint: inputs.source_fingerprint,
          test_fingerprint: inputs.test_fingerprint,
          tool_fingerprint: inputs.tool_fingerprint,
          partition_sources: source.sourceInputs,
        },
        tests: [...tests],
        active_mutant_id: mutantId,
        activation_hit_count: mutantId === null ? 0 : (activationHitCount ?? 0),
      };
    }
    if (result === 'passed') {
      if (expectedCases && !mutationJUnitCaseCensusMatches(expectedCases, cases))
        throw new Error('Survived mutant JUnit case outcomes differ from the validated baseline census.');
      return { status: result, cases, ...(nativeReceipt ? { native_receipt: nativeReceipt } : {}) };
    }
    if (result === 'killed') return { status: result, ...(nativeReceipt ? { native_receipt: nativeReceipt } : {}) };
    throw new Error('Runner exit status and JUnit outcome disagree or include infrastructure errors.');
  } catch (error) {
    return { status: 'unknown', reason: String(error) };
  }
}

async function runMutationGate(): Promise<void> {
  const pin = readPin(root);
  checkManifest(root, pin);
  if (process.versions.bun !== pin) throw new Error('Mutation gate requires the pinned Bun executable.');
  const testRepositoryRoot = repositoryRootForPackage(root);
  const strykerCli = await installedStrykerCli(root);
  const partitions = mutationPartitions();
  const selection = selectMutationPartitions(process.argv.slice(2), partitions);
  const selectedPartitions = selection.partitions;
  const sourceInventory = maintainedSourceInventory(root);
  const expectedSources = sourceInventory.mutationSources;
  const missingPackageSources = sourceInventory.missingPackageSources;
  const partitionSourceSet = new Set(partitions.flatMap((partition) => partitionSources(partition)));
  const unassignedSources = expectedSources.filter((source) => !partitionSourceSet.has(source));
  const unknownPartitionSources = [...partitionSourceSet].filter((source) => !expectedSources.includes(source));
  const zeroMutantSources = new Set(['src/index.ts', 'src/config/index.ts']);
  const sourceAssignments = new Map<string, string[]>();
  for (const partition of partitions)
    for (const source of partitionSources(partition))
      sourceAssignments.set(source, [...(sourceAssignments.get(source) ?? []), partition.name]);
  const invalidOverlaps = [...sourceAssignments].filter(
    ([source, owners]) =>
      owners.length > 1 &&
      !(
        source === 'src/config/safe-repository-access.ts' &&
        owners.length === 2 &&
        owners.includes('linux') &&
        owners.includes('windows')
      ),
  );
  const invalidZeroMutantSources = [];
  for (const source of zeroMutantSources) {
    const ast = parse(await readFile(path.join(root, source), 'utf8'), {
      sourceType: 'module',
      plugins: ['typescript'],
    });
    if (!ast.program.body.every((node) => node.type === 'ExportNamedDeclaration' && node.source && !node.declaration))
      invalidZeroMutantSources.push(source);
  }
  function inventoryPartition(partition: MutationPartition) {
    return {
      name: partition.name,
      environment: partition.environment,
      sources: partitionSources(partition),
      tests: partition.tests ?? [],
      intended_tests: partition.intendedTests ?? [],
      status: partition.environment === 'pending' ? 'pending' : 'assigned',
    };
  }
  if (selection.inventory) {
    console.log(
      JSON.stringify({
        schema: 'CandidateMutationInventory/v1',
        test_repository_root: testRepositoryRoot,
        expected_sources: expectedSources,
        unassigned_sources: unassignedSources,
        unknown_partition_sources: unknownPartitionSources,
        invalid_overlaps: invalidOverlaps,
        missing_package_sources: missingPackageSources,
        invalid_zero_mutant_sources: invalidZeroMutantSources,
        zero_mutant_sources: [...zeroMutantSources],
        repository_only_sources: sourceInventory.repositoryOnlySources,
        partitions: partitions.map(inventoryPartition),
        pending_partition_sources: partitions
          .filter((partition) => partition.environment === 'pending')
          .flatMap(partitionSources),
      }),
    );
    process.exit(
      testRepositoryRoot === null ||
        unassignedSources.length ||
        unknownPartitionSources.length ||
        invalidOverlaps.length ||
        missingPackageSources.length ||
        invalidZeroMutantSources.length
        ? 1
        : 0,
    );
  }
  if (testRepositoryRoot === null) throw new Error('Mutation gate requires the repository package layout.');
  if (
    unassignedSources.length ||
    unknownPartitionSources.length ||
    invalidOverlaps.length ||
    missingPackageSources.length ||
    invalidZeroMutantSources.length
  )
    throw new Error(
      `Mutation partition inventory is invalid: ${JSON.stringify({ unassignedSources, unknownPartitionSources, invalidOverlaps, missingPackageSources, invalidZeroMutantSources })}`,
    );
  const pendingPartitions = selectedPartitions.filter((partition) => partition.environment === 'pending');
  if (pendingPartitions.length && !('mapOnly' in selection && selection.mapOnly))
    throw new Error(
      `Mutation qualification is pending focused behavior tests: ${JSON.stringify(pendingPartitions.map(({ name, sources, intendedTests }) => ({ name, sources, intendedTests })))}`,
    );
  const runId = randomUUID();
  const evidenceRoot = path.join(root, '.tmp');
  try {
    await mkdir(evidenceRoot, { mode: 0o700 });
  } catch (error) {
    if (!record(error) || error.code !== 'EEXIST') throw error;
  }
  const evidenceRootInfo = await lstat(evidenceRoot);
  if (!evidenceRootInfo.isDirectory() || evidenceRootInfo.isSymbolicLink())
    throw new Error('Mutation evidence directory must be a regular directory.');
  const reportDirectory = await mkdtemp(path.join(evidenceRoot, `mutation-evidence-${runId}-`));
  const mutationTools = mutationToolInputs;
  const inputs = await qualityInputs(root, mutationTools);
  const perTestCapture = selection.scope === 'partition-pilot' ? selection.perTestCapture : undefined;
  const sourceBindings = new Map(
    selectedPartitions.map(
      (partition) =>
        [
          partition.name,
          mutationPartitionSourceBinding(partition.name, partitionSources(partition), inputs.sources),
        ] as const,
    ),
  );
  const fingerprint = qualityFingerprint(inputs, perTestCapture);
  const mapBinding = {
    run_id: runId,
    input_fingerprint: fingerprint,
    source_fingerprint: inputs.source_fingerprint,
    test_fingerprint: inputs.test_fingerprint,
    tool_fingerprint: inputs.tool_fingerprint,
  };
  const expectedSourceSet = new Set(expectedSources);
  const mapSources = inputs.sources.filter((source) => expectedSourceSet.has(source.path));
  if (mapSources.length !== expectedSourceSet.size)
    throw new Error('Global mutation map Source capture is incomplete.');
  const initialMap = globalMutationMap(
    mapBinding,
    mapSources,
    partitions,
    selectedPartitions.map(({ name }) => name),
    zeroMutantSources,
  );
  if ('mapOnly' in selection && selection.mapOnly) {
    const artifact = writeMutationMapArtifact(reportDirectory, 'global-mutant-map.json', initialMap);
    process.stdout.write(
      JSON.stringify({
        schema: 'MutationMapInventory/v1',
        ...mapBinding,
        evidence_directory: reportDirectory,
        artifact,
        sources: mapSources.length,
        partitions: partitions.length,
        generated_universes: 0,
        globally_qualified: false,
      }) + '\n',
    );
    return;
  }
  writeMutationMapArtifact(reportDirectory, 'global-mutant-map.initial.json', initialMap);
  async function assertCurrentInputs(boundary: string): Promise<void> {
    if (qualityFingerprint(await qualityInputs(root, mutationTools), perTestCapture) !== fingerprint)
      throw new Error(`Mutation inputs changed at ${boundary}; qualification is UNKNOWN.`);
  }

  {
    const provenanceErrors: PartitionIssue[] = [];
    const runs = await runStrykerPartitions(
      selectedPartitions.filter((partition) => partition.environment !== 'static'),
      async (partition, recordRun) => {
        const reportName = partition.report;
        const testFiles = partition.tests;
        if (!reportName || !testFiles) throw new Error(`Mutation partition is incomplete: ${partition.name}`);
        const sourceBinding = sourceBindings.get(partition.name);
        if (!sourceBinding) {
          provenanceErrors.push({
            partition: partition.name,
            error: 'Mutation partition source binding is incomplete.',
          });
          return false;
        }
        try {
          await assertCurrentInputs(`${partition.name}:before`);
          const descriptor = {
            schema: 'MutationInputDescriptor/v3',
            partition: partition.name,
            partition_sources: sourceBinding.sources,
            partition_source_inputs: sourceBinding.sourceInputs,
            partition_source_fingerprint: sourceBinding.fingerprint,
            source_fingerprint: inputs.source_fingerprint,
            tests: testFiles,
            test_selection: inputs.test_selection,
            test_inputs: inputs.test_inputs,
            tool_inputs: inputs.tool_inputs,
            input_fingerprint: fingerprint,
            test_fingerprint: inputs.test_fingerprint,
            tool_fingerprint: inputs.tool_fingerprint,
            ...(perTestCapture === undefined ? {} : { per_test_capture: perTestCapture }),
          };
          const descriptorHandle = await open(path.join(reportDirectory, `${partition.name}.inputs.json`), 'wx', 0o600);
          try {
            await descriptorHandle.writeFile(JSON.stringify(descriptor));
            await descriptorHandle.sync();
          } finally {
            await descriptorHandle.close();
          }
        } catch (error) {
          provenanceErrors.push({ partition: partition.name, error: String(error) });
          return false;
        }
        const environment: NodeJS.ProcessEnv = {
          ...process.env,
          AGENT_RUNTIME_TEST_REPOSITORY_ROOT: testRepositoryRoot,
          AGENT_RUNTIME_MUTATION_DIRECTORY: reportDirectory,
          AGENT_RUNTIME_MUTATION_SANDBOX_ROOT: path.join(reportDirectory, 'stryker-tmp'),
          AGENT_RUNTIME_MUTATION_REPORT: reportName,
          AGENT_RUNTIME_MUTATION_PARTITION: partition.name,
          AGENT_RUNTIME_MUTATION_SOURCES: JSON.stringify(sourceBinding.sources),
          AGENT_RUNTIME_MUTATION_PARTITION_SOURCE_FINGERPRINT: sourceBinding.fingerprint,
          AGENT_RUNTIME_MUTATION_RUN_ID: runId,
          AGENT_RUNTIME_INPUT_FINGERPRINT: fingerprint,
          AGENT_RUNTIME_SOURCE_FINGERPRINT: inputs.source_fingerprint,
          AGENT_RUNTIME_TEST_FINGERPRINT: inputs.test_fingerprint,
          AGENT_RUNTIME_TOOL_FINGERPRINT: inputs.tool_fingerprint,
          AGENT_RUNTIME_MUTATION_TESTS: testFiles.join(','),
        };
        delete environment.AGENT_MUTATION_PARENT_PER_TEST_CAPTURE;
        delete environment.AGENT_MUTATION_PER_TEST_CAPTURE;
        if (perTestCapture !== undefined) environment.AGENT_MUTATION_PARENT_PER_TEST_CAPTURE = perTestCapture;
        delete environment.__STRYKER_ACTIVE_MUTANT__;
        if (partition.environment === 'main' || partition.environment === 'bun') {
          if (partition.environment === 'main') delete environment.AGENT_RUNTIME_MUTATION_PART;
          else environment.AGENT_RUNTIME_MUTATION_PART = partition.environment;
          environment.AGENT_RUNTIME_MUTATION_SOURCE = partitionSources(partition).join(',');
          environment.AGENT_RUNTIME_MUTATION_TESTS = testFiles.join(',');
          environment.AGENT_RUNTIME_SKIP_PACKAGE_TEST = '1';
        } else {
          environment.AGENT_RUNTIME_MUTATION_PART = partition.environment;
          delete environment.AGENT_RUNTIME_MUTATION_SOURCE;
        }
        const result = await runCapturedStryker(
          [process.execPath, strykerCli, 'run', 'stryker.config.ts'],
          root,
          pinnedEnvironment(process.execPath, environment),
          reportDirectory,
          partition.name,
          path.join(reportDirectory, `stryker-${partition.name}.stdout.log`),
          path.join(reportDirectory, `stryker-${partition.name}.stderr.log`),
          strykerPartitionDeadlineMs,
          fingerprint,
          sourceBinding.sources,
          sourceBinding.fingerprint,
        );
        recordRun({ ...partition, report: reportName, result });
        try {
          await assertCurrentInputs(`${partition.name}:after`);
        } catch (error) {
          provenanceErrors.push({ partition: partition.name, error: String(error) });
          return false;
        }
        return true;
      },
    );

    const reports: Array<
      MutationPartition & { result: MutationRunnerResult; report: string; reportData: MutationReport }
    > = [];
    const reportErrors: PartitionIssue[] = [];
    for (const run of runs) {
      try {
        const reportBytes = await readBoundedEvidence(reportDirectory, run.report, reportByteLimit);
        const reportData: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(reportBytes));
        if (!mutationReport(reportData)) throw new Error('Stryker report shape is invalid.');
        reports.push({ ...run, reportData });
      } catch (error) {
        reportErrors.push({ partition: run.name, error: String(error) });
      }
    }

    const validationStarted = performance.now();
    const validationTiming = {
      elapsed_ms: 0,
      identity_ms: 0,
      lifecycle_ms: 0,
      identity_observations: 0,
      lifecycle_analyses: 0,
    };
    const contexts = new Map<string, ReceiptValidationContext>();
    const readParentIdentity = async (tests: string[]) => {
      const start = performance.now();
      validationTiming.identity_observations++;
      const sandboxRoot = path.join(reportDirectory, 'stryker-tmp');
      try {
        return await collectExecutionIdentity({
          executable: process.execPath,
          cwd: sandboxRoot,
          packageRoot: sandboxRoot,
          sandboxRoot,
          command: [],
          tests,
          sourceFingerprint: inputs.source_fingerprint,
          testFingerprint: inputs.test_fingerprint,
          toolFingerprint: inputs.tool_fingerprint,
          bunVersion: process.versions.bun ?? '',
          platform: process.platform,
          arch: process.arch,
        });
      } finally {
        validationTiming.identity_ms += performance.now() - start;
      }
    };
    for (const report of reports) {
      try {
        const identity = await readParentIdentity(report.tests ?? []);
        const start = performance.now();
        const hookFiles = testFilesWithLifecycleHooks(report.tests ?? [], inputs.input_bytes);
        validationTiming.lifecycle_ms += performance.now() - start;
        validationTiming.lifecycle_analyses++;
        contexts.set(report.name, { identity, hookFiles });
      } catch (error) {
        provenanceErrors.push({ partition: report.name, error: `Receipt validation context: ${String(error)}` });
      }
    }
    const baselineChecks = new Map<string, ReceiptOutcome>();
    const baselineErrors: Array<{ partition: string } & ReceiptOutcome> = [];
    for (const { name, tests, result, sources, requiredReportedSource } of reports) {
      const context = contexts.get(name);
      const sourceBinding = mutationPartitionSourceBinding(
        name,
        sources ?? (requiredReportedSource ? [requiredReportedSource] : []),
        inputs.sources,
      );
      const outcome: ReceiptOutcome =
        result.exitCode === 0 && !result.timed_out && !result.signalCode && result.output_complete
          ? sourceBinding && context
            ? await confirmRunnerReceipt(
                reportDirectory,
                runId,
                name,
                null,
                tests ?? [],
                inputs,
                fingerprint,
                sourceBinding.sources,
                sourceBinding.fingerprint,
                context,
                undefined,
                perTestCapture,
              )
            : { status: 'unknown', reason: 'Partition source or byte-bound validation context is incomplete.' }
          : { status: 'unknown', reason: 'Stryker partition did not exit cleanly inside its trusted deadline.' };
      baselineChecks.set(name, outcome);
      if (outcome.status !== 'passed') baselineErrors.push({ partition: name, ...outcome });
    }

    const normalizeFile = (file: string): string => file.replaceAll('\\', '/');
    const normalizedSourcePath = (file: string): string =>
      path.relative(root, path.isAbsolute(file) ? file : path.resolve(root, file)).replaceAll('\\', '/');
    // Every partition must kill its own mutants. Merging the same mutation from
    // Linux and Windows could otherwise hide a survivor in one platform lane.
    const mutants: Array<
      MutationRecord & {
        partition: string;
        file: string;
        stryker_status: string;
        confirmed_status: string;
        confirmation_reason: string;
      }
    > = [];
    const partitionStatuses: Record<string, Record<string, number>> = {};
    const emptyPartitions: string[] = [];
    const missingPartitionSources: SourceIssue[] = [];
    const extraPartitionSources: SourceIssue[] = [];
    const sourceMismatches: SourceIssue[] = [];
    const unknownMutants: UnknownMutant[] = [];
    for (const { name, reportData, result, requireMutants = true, requiredReportedSource, sources, tests } of reports) {
      const statuses: Record<string, number> = {};
      const expectedPartitionSources = sources ?? (requiredReportedSource ? [requiredReportedSource] : []);
      const reportedPartitionSources = new Map<string, MutationFileReport>(
        Object.entries(reportData.files ?? {}).map(([file, value]) => [normalizedSourcePath(file), value]),
      );
      for (const source of expectedPartitionSources)
        if (!zeroMutantSources.has(source) && !reportedPartitionSources.get(source)?.mutants?.length)
          missingPartitionSources.push({ partition: name, source });
      for (const source of reportedPartitionSources.keys())
        if (!expectedPartitionSources.includes(source)) extraPartitionSources.push({ partition: name, source });
      for (const [source, value] of reportedPartitionSources) {
        const expected = inputs.sources.find((entry) => entry.path === source);
        if (!expected || typeof value.source !== 'string' || sha256(value.source) !== expected.sha256)
          sourceMismatches.push({ partition: name, source });
      }
      for (const [fileName, value] of Object.entries(reportData.files ?? {})) {
        const file = normalizeFile(fileName);
        for (const mutant of value.mutants ?? []) {
          statuses[mutant.status] = (statuses[mutant.status] ?? 0) + 1;
          let confirmation = 'unknown';
          let confirmationReason = 'Stryker status has no matching confirmed runner receipt.';
          if (mutant.status === 'NoCoverage') {
            confirmation = 'NoCoverage';
            confirmationReason = 'Stryker did not execute tests for this mutant.';
          } else if (typeof mutant.id === 'string' && ['Killed', 'Survived'].includes(mutant.status)) {
            const sourceBinding = sourceBindings.get(name);
            const context = contexts.get(name);
            const baseline = baselineChecks.get(name);
            const observed =
              result.exitCode === 0 &&
              !result.timed_out &&
              !result.signalCode &&
              result.output_complete &&
              baseline?.status === 'passed'
                ? sourceBinding && context
                  ? await confirmRunnerReceipt(
                      reportDirectory,
                      runId,
                      name,
                      mutant.id,
                      tests ?? [],
                      inputs,
                      fingerprint,
                      sourceBinding.sources,
                      sourceBinding.fingerprint,
                      context,
                      mutant.status === 'Survived' ? baseline.cases : undefined,
                    )
                  : { status: 'unknown', reason: 'Partition source binding is incomplete.' }
                : (baseline ?? { status: 'unknown', reason: 'Partition baseline is missing.' });
            if (baseline?.status !== 'passed') {
              confirmationReason = 'Partition baseline did not pass; mutant failure is not attributable.';
            } else if (mutant.status === 'Survived' && observed.status === 'passed') {
              confirmation = 'Survived';
              confirmationReason = 'Zero runner exit matched a nonempty passing JUnit report.';
            } else if (mutant.status === 'Killed' && observed.status === 'killed') {
              confirmation = 'Killed';
              confirmationReason =
                'Pinned Bun exit 1 matched a JUnit failure bound to the exact assertion thrown in the generated test body.';
            } else {
              confirmationReason =
                observed.status === 'unknown'
                  ? observed.reason
                  : `Stryker ${mutant.status} disagrees with the runner's ${observed.status} evidence.`;
            }
          }
          if (confirmation === 'unknown')
            unknownMutants.push({ partition: name, mutant_id: mutant.id ?? null, reason: confirmationReason });
          mutants.push({
            partition: name,
            file,
            ...mutant,
            stryker_status: mutant.status,
            confirmed_status: confirmation,
            confirmation_reason: confirmationReason,
          });
        }
      }
      if (requireMutants && Object.values(statuses).reduce((count, value) => count + value, 0) === 0)
        emptyPartitions.push(name);
      partitionStatuses[name] = statuses;
    }
    const statuses = mutants.reduce<Record<string, number>>((values, mutant) => {
      values[mutant.status] = (values[mutant.status] ?? 0) + 1;
      return values;
    }, {});
    for (const [name, context] of contexts) {
      try {
        const current = await readParentIdentity(context.identity.test_files);
        if (executionIdentityDigest(current) !== executionIdentityDigest(context.identity))
          throw new Error('Pinned Bun identity changed across parent receipt validation.');
      } catch (error) {
        const reason = String(error);
        provenanceErrors.push({ partition: name, error: reason });
        const unknown = { status: 'unknown', reason } as const;
        baselineChecks.set(name, unknown);
        baselineErrors.push({ partition: name, ...unknown });
        for (const mutant of mutants)
          if (mutant.partition === name && ['Killed', 'Survived'].includes(mutant.confirmed_status)) {
            mutant.confirmed_status = 'unknown';
            mutant.confirmation_reason = reason;
            unknownMutants.push({ partition: name, mutant_id: mutant.id, reason });
          }
      }
    }
    validationTiming.elapsed_ms = performance.now() - validationStarted;
    const mapObservations = new Map<
      string,
      {
        status: string;
        source_counts?: Record<string, number>;
        map?: { file: string; sha256: string; bytes: number; mutants: number };
      }
    >();
    for (const run of runs) {
      const binding = sourceBindings.get(run.name);
      if (!binding) continue;
      const report = reports.find((entry) => entry.name === run.name);
      const reported = report
        ? Object.entries(report.reportData.files).flatMap(([file, data]) =>
            data.mutants.map((mutant) => ({ file: normalizedSourcePath(file), mutant })),
          )
        : undefined;
      try {
        const observed = await confirmPartitionMutationMap(
          root,
          { ...mapBinding, partition: run.name, partition_sources: binding.sourceInputs },
          (file, allowEmpty = false) => readBoundedEvidence(reportDirectory, file, reportByteLimit, allowEmpty),
          reported,
        );
        const local = mutants.filter((mutant) => mutant.partition === run.name);
        mapObservations.set(run.name, {
          ...observed,
          status:
            observed.terminal &&
            !strykerRunUnknown(run.result) &&
            baselineChecks.get(run.name)?.status === 'passed' &&
            local.length > 0 &&
            local.every((mutant) => mutant.confirmed_status === 'Killed')
              ? 'assertion-confirmed-killed'
              : 'unqualified-engine-observation',
        });
      } catch (error) {
        provenanceErrors.push({ partition: run.name, error: `Mutation map: ${String(error)}` });
        mapObservations.set(run.name, { status: 'unknown-map-evidence' });
      }
    }
    const nonKilled = mutants.filter((mutant) => mutant.confirmed_status !== 'Killed');
    const reportedSources = [...new Set(reports.flatMap(({ reportData }) => Object.keys(reportData.files ?? {})))]
      .map(normalizedSourcePath)
      .sort((left, right) => left.localeCompare(right));
    const assessedSources =
      selection.scope === 'full' ? expectedSources : [...new Set(selectedPartitions.flatMap(partitionSources))];
    const missingSources = assessedSources.filter(
      (file) => !zeroMutantSources.has(file) && !reportedSources.includes(file),
    );
    const extraSources = reportedSources.filter((file) => !assessedSources.includes(file));
    const runnerExitCodes = runs.map(({ name, result }) => ({
      partition: name,
      exit_code: result.observed_exit_code,
      deadline_ms: result.deadline_ms,
      timed_out: result.timed_out,
    }));
    const runnerUnknown = runs.some(({ result }) => strykerRunUnknown(result));
    const killed = mutants.filter((mutant) => mutant.confirmed_status === 'Killed').length;
    const effectiveScore = mutants.length === 0 ? 0 : killed / mutants.length;
    const pass =
      !runnerUnknown &&
      provenanceErrors.length === 0 &&
      sourceMismatches.length === 0 &&
      baselineErrors.length === 0 &&
      unknownMutants.length === 0 &&
      runs.length === selectedPartitions.filter((partition) => partition.environment !== 'static').length &&
      runs.every(({ result }) => result.exitCode === 0) &&
      reportErrors.length === 0 &&
      emptyPartitions.length === 0 &&
      missingPartitionSources.length === 0 &&
      extraPartitionSources.length === 0 &&
      mutants.length > 0 &&
      effectiveScore === 1 &&
      nonKilled.length === 0 &&
      missingSources.length === 0 &&
      extraSources.length === 0;
    const finalMap = {
      ...globalMutationMap(
        mapBinding,
        mapSources,
        partitions,
        selectedPartitions.map(({ name }) => name),
        zeroMutantSources,
        mapObservations,
      ),
      globally_qualified: selection.scope === 'full' && pass,
    };
    if (finalMap.globally_qualified)
      assertGlobalMutationMap(finalMap, mapBinding, mapSources, partitions.map(inventoryPartition));
    const mutantMap = writeMutationMapArtifact(reportDirectory, 'global-mutant-map.json', finalMap);
    const summary = {
      schema: selection.scope === 'full' ? 'CandidateMutationReport/v4' : 'CandidateMutationPilotReport/v2',
      qualification_scope: selection.scope,
      full_qualification: selection.scope === 'full' && pass,
      selected_partitions: selectedPartitions.map(({ name }) => name),
      omitted_partitions: partitions
        .filter((partition) => !selectedPartitions.includes(partition))
        .map(inventoryPartition),
      assessed_sources: assessedSources,
      input_fingerprint: fingerprint,
      run_id: runId,
      evidence_directory: reportDirectory,
      mutant_map: { schema: finalMap.schema, ...mutantMap, globally_qualified: finalMap.globally_qualified },
      source_fingerprint: inputs.source_fingerprint,
      test_fingerprint: inputs.test_fingerprint,
      tool_fingerprint: inputs.tool_fingerprint,
      source_inputs: inputs.sources,
      test_inputs: inputs.test_inputs,
      tool_inputs: inputs.tool_inputs,
      partition_source_bindings: selectedPartitions.map((partition) => {
        const binding = sourceBindings.get(partition.name);
        return binding
          ? {
              partition: partition.name,
              tests: partition.tests ?? [],
              sources: binding.sources,
              source_inputs: binding.sourceInputs,
              source_fingerprint: binding.fingerprint,
            }
          : {
              partition: partition.name,
              tests: partition.tests ?? [],
              sources: partitionSources(partition),
              source_inputs: [],
              source_fingerprint: null,
            };
      }),
      provenance_errors: provenanceErrors,
      source_mismatches: sourceMismatches,
      baseline_errors: baselineErrors,
      unknown_mutants: unknownMutants,
      required_effective_score: 1,
      effective_score: effectiveScore,
      required_survived: 0,
      required_non_killed: 0,
      status:
        provenanceErrors.length ||
        sourceMismatches.length ||
        baselineErrors.length ||
        reportErrors.length ||
        unknownMutants.length ||
        runnerUnknown
          ? 'unknown'
          : pass
            ? selection.scope === 'full'
              ? 'pass'
              : 'pilot-pass'
            : 'fail',
      runner_exit_codes: runnerExitCodes,
      receipt_validation_timing: validationTiming,
      runner_outputs: runs.map(({ name, result }) => ({
        partition: name,
        stdout: result.stdout_capture,
        stderr: result.stderr_capture,
      })),
      runner_processes: runs.map(({ name, result }) => ({
        partition: name,
        deadline_ms: result.deadline_ms,
        timed_out: result.timed_out,
        spawn_error: result.spawn_error,
        observed_exit_code: result.observed_exit_code,
        signal: result.signalCode,
        process_custody: result.process_custody,
        process_receipt: result.process_receipt,
        output_complete: result.output_complete,
      })),
      report_errors: reportErrors,
      empty_partitions: emptyPartitions,
      missing_partition_sources: missingPartitionSources,
      extra_partition_sources: extraPartitionSources,
      maintained_sources: expectedSources,
      missing_package_sources: missingPackageSources,
      reported_sources: reportedSources,
      missing_sources: missingSources,
      extra_sources: extraSources,
      mutants: mutants.length,
      killed,
      statuses,
      partition_statuses: partitionStatuses,
      non_killed: nonKilled,
    };
    process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
    try {
      const artifact = writeMutationMapArtifact(reportDirectory, 'terminal-summary.json', summary);
      recordContourReport(root, summary, path.join(reportDirectory, artifact.file));
    } catch (error) {
      process.stderr.write('Contour projection output gap: ' + String(error) + '\n');
    }
    if (!pass) process.exitCode = 1;
  }
}

if (import.meta.main) await runMutationGate();
