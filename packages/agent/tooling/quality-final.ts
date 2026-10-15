import { randomUUID } from 'node:crypto';
import { constants as fsConstants } from 'node:fs';
import type { BigIntStats } from 'node:fs';
import { lstat, mkdir, mkdtemp, open } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mutationToolInputs, executeMutationCommand } from './mutation-evidence.js';
import { qualityInputProjections, qualityFingerprint, readBunPin, sha256 } from './bun-coverage-evidence.ts';
import { validateCurrentCoverageReportWithInputs } from './bun-coverage-report-validator.js';
import { assertCrapPlanPrerequisites } from './crap-gate.ts';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repositoryRoot = path.resolve(packageRoot, '../..');
const maximumOutputBytes = 128 * 1024 * 1024;
type Budget = { path: string; sha256: string };
type Inputs = Awaited<ReturnType<typeof qualityInputProjections>>;
type ChildResult = Awaited<ReturnType<typeof executeMutationCommand>>;
type QualityReports = {
  coverage: Record<string, unknown>;
  coverageMetrics: Record<string, { total: number; covered: number; pct: number }>;
  crap: Record<string, unknown>;
  crapSha256: string;
  inputs: Inputs;
};
const orchestrationDurationMs = 7 * 24 * 60 * 60 * 1000;
const finalProjectionInputs = {
  coverage: [],
  mutation: mutationToolInputs,
  guard: [...mutationToolInputs, 'tooling/quality-final.ts'],
} as const;
const childTerminationGraceMs = 5_000;
const childForceWaitMs = 5_000;

export function orchestrationDeadline(startedAt: number, durationMs: number): number {
  if (!Number.isFinite(startedAt) || !Number.isSafeInteger(durationMs) || durationMs < 1)
    throw new Error('Orchestration deadline inputs are invalid.');
  const deadlineAt = startedAt + durationMs;
  if (!Number.isFinite(deadlineAt)) throw new Error('Orchestration deadline is outside the finite clock range.');
  return deadlineAt;
}

export function remainingChildTimeoutMs(
  deadlineAt: number,
  cleanupReservationMs: number,
  now: number = performance.now(),
): number {
  if (
    !Number.isFinite(deadlineAt) ||
    !Number.isFinite(now) ||
    !Number.isSafeInteger(cleanupReservationMs) ||
    cleanupReservationMs < 0
  )
    throw new Error('Child deadline inputs are invalid.');
  return Math.max(0, Math.floor(deadlineAt - now - cleanupReservationMs));
}

function sameFile(left: BigIntStats, right: BigIntStats) {
  return (
    left.isFile() &&
    right.isFile() &&
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.size === right.size &&
    left.mtimeNs === right.mtimeNs &&
    left.ctimeNs === right.ctimeNs
  );
}

async function readBoundedRegularFile(file: string, label: string, byteLimit: number): Promise<Buffer> {
  const pathInfo = await lstat(file, { bigint: true });
  if (!pathInfo.isFile() || pathInfo.isSymbolicLink() || pathInfo.size > BigInt(byteLimit))
    throw new Error(`${label} is missing, linked or outside its size limit.`);
  const handle = await open(file, fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0));
  try {
    const before = await handle.stat({ bigint: true });
    if (!sameFile(pathInfo, before)) throw new Error(`${label} changed while opening.`);
    const bytes = await handle.readFile();
    const after = await handle.stat({ bigint: true });
    if (!sameFile(before, after) || bytes.length !== Number(before.size) || bytes.length > byteLimit)
      throw new Error(`${label} changed or exceeded its size limit while reading.`);
    return bytes;
  } finally {
    await handle.close();
  }
}

function parseRecord(bytes: Buffer, label: string): Record<string, unknown> {
  const value: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new Error(`${label} is not a JSON object.`);
  return value as Record<string, unknown>;
}

export async function readBudgetPlan(): Promise<Budget> {
  const file = path.resolve(
    process.env.VIDA_CRAP_BUDGET_PLAN ??
      path.join(repositoryRoot, '.agent/work/core-runtime-reactivation/crap-budgets.v1.json'),
  );
  const bytes = await readBoundedRegularFile(file, 'Frozen CRAP budget plan', 4 * 1024 * 1024);
  const value = parseRecord(bytes, 'Frozen CRAP budget plan');
  assertCrapPlanPrerequisites(value, repositoryRoot);
  return { path: file, sha256: sha256(bytes) };
}

function assertSameInputs(expected: Inputs, current: Inputs, boundary: string): void {
  for (const key of ['coverage', 'mutation', 'guard'] as const)
    if (qualityFingerprint(current[key]) !== qualityFingerprint(expected[key]))
      throw new Error(`Current quality inputs changed at ${boundary} (${key}).`);
}

function assertSameBudget(expected: Budget, current: Budget, boundary: string): void {
  if (current.path !== expected.path || current.sha256 !== expected.sha256)
    throw new Error(`Frozen CRAP budget bytes changed at ${boundary}.`);
}

async function writeEvidenceRecord(
  runDirectory: string,
  fileName: string,
  record: Record<string, unknown>,
): Promise<void> {
  const handle = await open(path.join(runDirectory, fileName), 'wx', 0o600);
  try {
    await handle.writeFile(`${JSON.stringify(record, null, 2)}\n`);
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function runCommand(
  runDirectory: string,
  name: string,
  command: string[],
  deadlineAt: number,
  outputLimit: number,
  cleanup: { terminationGraceMs?: number; forceWaitMs?: number } = {},
): Promise<ChildResult> {
  const terminationGraceMs = cleanup.terminationGraceMs ?? childTerminationGraceMs;
  const forceWaitMs = cleanup.forceWaitMs ?? childForceWaitMs;
  const cleanupReservationMs = terminationGraceMs + forceWaitMs;
  const startedAt = performance.now();
  const timeoutMs = remainingChildTimeoutMs(deadlineAt, cleanupReservationMs, startedAt);
  const launched = timeoutMs > 0;
  const result = launched
    ? await executeMutationCommand(command, packageRoot, timeoutMs, {
        stdoutFile: path.join(runDirectory, `${name}.stdout.log`),
        stderrFile: path.join(runDirectory, `${name}.stderr.log`),
        outputByteLimit: outputLimit,
        terminationGraceMs,
        forceWaitMs,
        ownedProcessGroup: true,
      })
    : {
        exitCode: null,
        signal: null,
        spawnError: 'orchestration-deadline-exhausted',
        timedOut: false,
        processCustody: null,
        output_capture: { complete: false as const },
      };
  const execution = {
    schema: 'FinalQualityChildExecution/v1',
    stage: name,
    started_at_monotonic_ms: startedAt,
    deadline_at_monotonic_ms: deadlineAt,
    child_timeout_ms: timeoutMs,
    cleanup_reservation_ms: cleanupReservationMs,
    launched,
    result,
  };
  lastChildExecution = execution;
  await writeEvidenceRecord(runDirectory, `${name}.execution.json`, execution);
  return result;
}

function requireCommandPass(result: ChildResult, name: string): void {
  const output = result.output_capture;
  if (
    result.exitCode !== 0 ||
    result.signal !== null ||
    result.spawnError !== null ||
    result.timedOut ||
    !output?.complete ||
    output.stdout.truncated ||
    output.stderr.truncated
  )
    throw new Error(`${name} did not complete with retained output and exit code 0: ${JSON.stringify(result)}`);
}

export function assertMutationSummary(summary: Record<string, unknown>, inputs: Inputs['mutation']): void {
  const identityValid = [
    summary.input_fingerprint === qualityFingerprint(inputs),
    summary.source_fingerprint === inputs.source_fingerprint,
    summary.test_fingerprint === inputs.test_fingerprint,
    summary.tool_fingerprint === inputs.tool_fingerprint,
  ].every(Boolean);
  if (!identityValid) throw new Error('Mutation gate summary does not bind current input identities.');
  const scoreValid = [
    summary.schema === 'CandidateMutationReport/v3',
    summary.status === 'pass',
    summary.required_effective_score === 1,
    summary.effective_score === 1,
    typeof summary.mutants === 'number' && summary.mutants > 0,
    summary.killed === summary.mutants,
    Array.isArray(summary.non_killed) && summary.non_killed.length === 0,
    Array.isArray(summary.unknown_mutants) && summary.unknown_mutants.length === 0,
  ].every(Boolean);
  if (!scoreValid)
    throw new Error('Mutation gate summary does not bind a current 100% confirmed assertion-caused Killed run.');
}

async function readMutationSummary(
  runDirectory: string,
  inputs: Inputs['mutation'],
  result: ChildResult,
): Promise<Record<string, unknown>> {
  const bytes = await readBoundedRegularFile(
    path.join(runDirectory, 'mutation.stdout.log'),
    'Mutation gate summary',
    maximumOutputBytes,
  );
  const captured = result.output_capture;
  if (
    !captured?.complete ||
    sha256(bytes) !== captured.stdout.sha256 ||
    bytes.length !== captured.stdout.bytes ||
    captured.stdout.truncated
  )
    throw new Error('Mutation summary bytes differ from the complete child output receipt.');
  const summary = parseRecord(bytes, 'Mutation gate summary');
  assertMutationSummary(summary, inputs);
  return summary;
}

function assertCoverageIdentity(
  coverage: Record<string, unknown>,
  inputs: Inputs['coverage'],
  expectedRunId: string | null,
): void {
  const matches = [
    coverage.source_fingerprint === inputs.source_fingerprint,
    coverage.test_fingerprint === inputs.test_fingerprint,
    coverage.tool_fingerprint === inputs.tool_fingerprint,
    expectedRunId === null || coverage.run_id === expectedRunId,
  ];
  if (!matches.every(Boolean)) throw new Error('Fresh coverage report does not match captured current inputs.');
}

function captureFourCoverageMetrics(
  totals: Record<string, unknown>,
): Record<string, { total: number; covered: number; pct: number }> {
  if (typeof totals !== 'object' || totals === null || Array.isArray(totals))
    throw new Error('Coverage validator returned no aggregate metric totals.');
  const metrics = totals;
  const names = ['functions', 'lines', 'statements', 'branches'];
  if (Object.keys(metrics).sort().join(',') !== names.slice().sort().join(','))
    throw new Error('Coverage totals do not contain exactly the four maintained metrics.');
  const captured: Record<string, { total: number; covered: number; pct: number }> = {};
  for (const name of names) captured[name] = exactCoverageMetric(metrics[name], name);
  return captured;
}

function positiveSafeMetricTotal(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function exactCoverageMetric(value: unknown, name: string): { total: number; covered: number; pct: number } {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new Error(`Coverage validator did not confirm exact 100% ${name} coverage.`);
  const metric = value as Record<string, unknown>;
  const total = metric.total;
  const covered = metric.covered;
  if (!positiveSafeMetricTotal(total))
    throw new Error(`Coverage validator did not confirm exact 100% ${name} coverage.`);
  if (typeof covered !== 'number' || covered !== total || metric.pct !== 100)
    throw new Error(`Coverage validator did not confirm exact 100% ${name} coverage.`);
  return { total, covered, pct: 100 };
}

function assertCrapIdentity(
  crap: Record<string, unknown>,
  coverage: Record<string, unknown>,
  budget: Budget,
  expectedRunId: string | null,
): void {
  const matches = [
    crap.schema === 'VidaCrapBudgetReport/v1',
    crap.status === 'pass',
    crap.coverage_run_id === coverage.run_id,
    crap.source_fingerprint === coverage.source_fingerprint,
    crap.budget_plan_sha256 === budget.sha256,
    expectedRunId === null || crap.coverage_run_id === expectedRunId,
  ];
  if (!matches.every(Boolean))
    throw new Error('CRAP evidence is stale or does not bind fresh coverage and frozen budget.');
}

async function readCoverageAndCrap(budget: Budget, expectedRunId: string | null = null): Promise<QualityReports> {
  const currentBudget = await readBudgetPlan();
  const crapBytes = await readBoundedRegularFile(
    path.join(packageRoot, 'coverage/bun-unified/crap-budget-report.json'),
    'CRAP gate report',
    32 * 1024 * 1024,
  );
  const coveragePath = path.join(packageRoot, 'coverage/bun-unified/coverage-final.json');
  const validated = await validateCurrentCoverageReportWithInputs(coveragePath, packageRoot, finalProjectionInputs);
  const inputs = validated.input_projections;
  if (
    inputs.coverage.source_fingerprint !== inputs.mutation.source_fingerprint ||
    inputs.coverage.test_fingerprint !== inputs.mutation.test_fingerprint ||
    inputs.mutation.source_fingerprint !== inputs.guard.source_fingerprint ||
    inputs.mutation.test_fingerprint !== inputs.guard.test_fingerprint
  )
    throw new Error('Coverage, mutation and aggregate input identities disagree.');
  assertSameBudget(budget, currentBudget, 'coverage report validation');
  const coverage = validated.report as Record<string, unknown>;
  const coverageMetrics = captureFourCoverageMetrics(validated.totals as unknown as Record<string, unknown>);
  assertCoverageIdentity(coverage, inputs.coverage, expectedRunId);
  const crap = parseRecord(crapBytes, 'CRAP gate report');
  assertCrapIdentity(crap, coverage, budget, expectedRunId);
  return { coverage, coverageMetrics, crap, crapSha256: sha256(crapBytes), inputs };
}

function assertInventoryComplete(inventory: Record<string, unknown>): void {
  if (inventory.schema !== 'CandidateMutationInventory/v1' || !Array.isArray(inventory.partitions))
    throw new Error('Mutation inventory schema or partition list is invalid.');
  const emptyArrays = [
    'pending_partition_sources',
    'unassigned_sources',
    'unknown_partition_sources',
    'invalid_overlaps',
    'missing_package_sources',
    'invalid_zero_mutant_sources',
  ];
  if (!emptyArrays.every((field) => Array.isArray(inventory[field]) && inventory[field].length === 0))
    throw new Error('Mutation inventory is incomplete or reports unresolved gate inputs.');
}

async function readMutationInventory(runDirectory: string, deadlineAt: number): Promise<Record<string, unknown>> {
  const result = await runCommand(
    runDirectory,
    'mutation-inventory',
    [process.execPath, 'tooling/mutation-gate.ts', '--inventory'],
    deadlineAt,
    maximumOutputBytes,
  );
  requireCommandPass(result, 'Read-only mutation inventory');
  const bytes = await readBoundedRegularFile(
    path.join(runDirectory, 'mutation-inventory.stdout.log'),
    'Mutation inventory',
    maximumOutputBytes,
  );
  const captured = result.output_capture;
  if (
    !captured?.complete ||
    sha256(bytes) !== captured.stdout.sha256 ||
    bytes.length !== captured.stdout.bytes ||
    captured.stdout.truncated
  )
    throw new Error('Mutation inventory bytes differ from the complete child output receipt.');
  const inventory = parseRecord(bytes, 'Mutation inventory');
  assertInventoryComplete(inventory);
  return inventory;
}

let evidenceDirectory: string | null = null;
let currentStage = 'prepare';
let lastChildExecution: Record<string, unknown> | null = null;

async function prepareRun(): Promise<{ budget: Budget; runDirectory: string }> {
  if (process.versions.bun !== (await readBunPin(packageRoot)))
    throw new Error('Final quality entrypoint requires the package-pinned Bun executable.');
  const budget = await readBudgetPlan();
  const evidenceRoot = path.join(repositoryRoot, '.tmp');
  await mkdir(evidenceRoot, { recursive: true, mode: 0o700 });
  const evidenceInfo = await lstat(evidenceRoot);
  if (!evidenceInfo.isDirectory() || evidenceInfo.isSymbolicLink())
    throw new Error('Final quality evidence root must be a regular .tmp directory.');
  const runDirectory = await mkdtemp(path.join(evidenceRoot, 'final-quality-v5-'));
  evidenceDirectory = runDirectory;
  return { budget, runDirectory };
}

async function runCoverageGate(runDirectory: string, budget: Budget, deadlineAt: number): Promise<QualityReports> {
  const result = await runCommand(
    runDirectory,
    'coverage',
    [process.execPath, 'run', 'test:coverage:pinned'],
    deadlineAt,
    maximumOutputBytes,
  );
  requireCommandPass(result, 'Fresh coverage and CRAP gates');
  const reports = await readCoverageAndCrap(budget);
  if (typeof reports.coverage.run_id !== 'string' || !reports.coverage.run_id)
    throw new Error('Fresh coverage report has no run identity.');
  requireTimeRemaining(deadlineAt, 'after fresh coverage and CRAP evidence');
  return reports;
}

async function runMutationGate(
  runDirectory: string,
  inputs: Inputs,
  budget: Budget,
  deadlineAt: number,
): Promise<Record<string, unknown>> {
  const result = await runCommand(
    runDirectory,
    'mutation',
    [process.execPath, 'run', 'test:mutation:pinned'],
    deadlineAt,
    maximumOutputBytes,
  );
  requireCommandPass(result, 'Manual mutation qualification');
  const summary = await readMutationSummary(runDirectory, inputs.mutation, result);
  return summary;
}

async function publishFinalReport(
  runDirectory: string,
  inputs: Inputs,
  budget: Budget,
  firstQualityReports: QualityReports,
  mutation: Record<string, unknown>,
  coverageRunId: string,
  deadlineAt: number,
  orchestrationDurationMs: number,
): Promise<void> {
  const finalQualityReports = await readCoverageAndCrap(budget, coverageRunId);
  assertSameInputs(inputs, finalQualityReports.inputs, 'final report validation');
  if (finalQualityReports.crapSha256 !== firstQualityReports.crapSha256)
    throw new Error('CRAP evidence changed during the final mutation gate.');
  requireTimeRemaining(deadlineAt, 'before final pass report');
  process.stdout.write(
    JSON.stringify(
      {
        schema: 'VidaFinalQualityReport/v1',
        status: 'pass',
        run_id: randomUUID(),
        evidence_directory: runDirectory,
        orchestration_deadline_ms: orchestrationDurationMs,
        budget_plan: budget,
        quality_input_identities: {
          source_fingerprint: inputs.coverage.source_fingerprint,
          test_fingerprint: inputs.coverage.test_fingerprint,
          coverage_tool_fingerprint: inputs.coverage.tool_fingerprint,
          mutation_tool_fingerprint: inputs.mutation.tool_fingerprint,
          aggregate_tool_fingerprint: qualityFingerprint(inputs.guard),
        },
        coverage: {
          run_id: coverageRunId,
          source_fingerprint: finalQualityReports.coverage.source_fingerprint,
          test_fingerprint: finalQualityReports.coverage.test_fingerprint,
          tool_fingerprint: finalQualityReports.coverage.tool_fingerprint,
          manifest_sha256: finalQualityReports.coverage.manifest_sha256,
          metrics: finalQualityReports.coverageMetrics,
        },
        crap: {
          coverage_run_id: finalQualityReports.crap.coverage_run_id,
          budget_plan_sha256: finalQualityReports.crap.budget_plan_sha256,
          report_sha256: finalQualityReports.crapSha256,
        },
        mutation: {
          run_id: mutation.run_id,
          evidence_directory: mutation.evidence_directory,
          input_fingerprint: mutation.input_fingerprint,
          source_fingerprint: mutation.source_fingerprint,
          test_fingerprint: mutation.test_fingerprint,
          tool_fingerprint: mutation.tool_fingerprint,
          required_effective_score: mutation.required_effective_score,
          effective_score: mutation.effective_score,
        },
      },
      null,
      2,
    ) + '\n',
  );
}

async function main(): Promise<void> {
  const startedAt = performance.now();
  const deadlineAt = orchestrationDeadline(startedAt, orchestrationDurationMs);
  const run = await prepareRun();
  currentStage = 'mutation-inventory';
  await readMutationInventory(run.runDirectory, deadlineAt);
  requireTimeRemaining(deadlineAt, 'after mutation inventory');
  currentStage = 'coverage';
  const coverage = await runCoverageGate(run.runDirectory, run.budget, deadlineAt);
  currentStage = 'mutation';
  const mutation = await runMutationGate(run.runDirectory, coverage.inputs, run.budget, deadlineAt);
  if (typeof coverage.coverage.run_id !== 'string' || !coverage.coverage.run_id)
    throw new Error('Fresh coverage report has no run identity.');
  const coverageRunId = coverage.coverage.run_id;
  currentStage = 'final-report';
  await publishFinalReport(
    run.runDirectory,
    coverage.inputs,
    run.budget,
    coverage,
    mutation,
    coverageRunId,
    deadlineAt,
    orchestrationDurationMs,
  );
}

function requireTimeRemaining(deadlineAt: number, boundary: string): void {
  if (remainingChildTimeoutMs(deadlineAt, 0, performance.now()) === 0)
    throw new Error(`Orchestration deadline expired at ${boundary}.`);
}

async function recordUnknown(error: unknown): Promise<void> {
  const reason = error instanceof Error ? error.message : String(error);
  if (evidenceDirectory) {
    try {
      await writeEvidenceRecord(evidenceDirectory, 'final-quality-unknown.json', {
        schema: 'VidaFinalQualityUnknown/v1',
        status: 'unknown',
        stage: currentStage,
        reason,
        last_child_execution: lastChildExecution,
      });
    } catch (recordError) {
      const detail = recordError instanceof Error ? recordError.message : String(recordError);
      process.stderr.write(`Could not persist final quality UNKNOWN receipt: ${detail}\n`);
    }
  }
  const evidence = evidenceDirectory ? `; retained evidence: ${evidenceDirectory}` : '';
  process.stderr.write(`Final quality qualification failed or is UNKNOWN: ${reason}${evidence}\n`);
  process.exitCode = 1;
}

if (import.meta.main) void main().catch(recordUnknown);
