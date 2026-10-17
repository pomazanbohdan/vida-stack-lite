import { randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, readFile, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { checkManifest, executionBudget, readPin } from '../bin/bun.ts';
import {
  qualityInputs,
  qualityFingerprint,
  readQualityInputs,
  repositoryRootForPackage,
  sha256,
} from './bun-coverage-evidence.ts';
import { CampaignResourceError, requireCampaignStorage } from './contour-campaign.ts';
import { generateMutationImage } from './mutation-generation.ts';
import { confirmRunnerReceipt, selectMutationPartitions } from './mutation-gate.ts';
import { mutationPartitionSourceBinding } from './mutation-command-runner.ts';
import {
  collectExecutionIdentity,
  executionIdentityDigest,
  executeMutationCommand,
  mutationToolInputs,
  testFilesWithLifecycleHooks,
  validCapturedOutput,
  type MutationJUnitCase,
} from './mutation-evidence.ts';
import { mutationLimits } from './mutation-limits.ts';
import {
  planMutationBatches,
  validateNativeMutationPartitionProof,
  writeMutationMapArtifact,
  type MutationMapBinding,
  type NativeMutationBatchResult,
  type NativeMutationReceiptReference,
  type NativeMutationValidationContext,
  type NativeMutationPartitionProofV2,
} from './mutation-map.ts';
import { mutationPartitions, mutationPartitionSources, type MutationPartition } from './mutation-partitions.ts';
import { completeOwnedCleanup } from './owned-cleanup-completion.ts';

type NativeBatchRow = {
  identity: string;
  local_id: string;
  status: 'killed' | 'survived' | 'unknown';
  reason?: string;
};

/** Preserve observed rows when a later launch is denied, interrupted or budget-spent. */
export async function collectNativeMutationBatch(
  batch: { identities: readonly string[]; local_ids: readonly string[] },
  remaining: () => number,
  invoke: (id: string, remaining: number) => Promise<{ status: 'passed' | 'killed' | 'unknown'; reason?: string }>,
  progress: (row: NativeBatchRow, completed: number) => void,
) {
  if (batch.identities.length !== batch.local_ids.length) throw new Error('Native batch identity pairing differs.');
  const results: NativeBatchRow[] = [];
  let budgetExhausted = false;
  let resourceBlocked: { observed_path: string; available_bytes: string | null } | undefined;
  let failure: { error: unknown } | undefined;
  try {
    for (const [offset, id] of batch.local_ids.entries()) {
      let allowance: number;
      try {
        allowance = remaining();
      } catch {
        budgetExhausted = true;
        break;
      }
      let observed: Awaited<ReturnType<typeof invoke>>;
      try {
        observed = await invoke(id, allowance);
      } catch (error) {
        if (error instanceof CampaignResourceError) {
          resourceBlocked = { observed_path: error.observedPath, available_bytes: error.availableBytes };
          break;
        }
        throw error;
      }
      const row: NativeBatchRow = {
        identity: batch.identities[offset]!,
        local_id: id,
        status: observed.status === 'passed' ? 'survived' : observed.status,
        ...(observed.status === 'unknown' ? { reason: observed.reason } : {}),
      };
      results.push(row);
      progress(row, results.length);
      if (row.status === 'unknown') break;
    }
  } catch (error) {
    failure = { error };
  }
  return { results, budgetExhausted, resourceBlocked, failure };
}

export function selectMutationBatchPilot(args: readonly string[], partitions: MutationPartition[]) {
  const { values } = parseArgs({
    args: [...args],
    options: {
      contour: { type: 'string' },
      'batch-size': { type: 'string', default: '16' },
      'max-batches': { type: 'string', default: '1' },
      'admit-complete': { type: 'boolean', default: false },
      'diagnostic-mutant-id': { type: 'string' },
      'diagnostic-mutant-ids': { type: 'string' },
    },
    strict: true,
    allowPositionals: false,
  });
  const finite = (raw: string | undefined) => {
    const number = Number(raw);
    if (!Number.isSafeInteger(number) || number < 1 || number > 128 || String(number) !== raw)
      throw new Error('Mutation batch bounds must be integers from1 through128.');
    return number;
  };
  const selected = selectMutationPartitions(['--pilot-partition', values.contour ?? ''], partitions);
  if (selected.scope !== 'partition-pilot') throw new Error('Mutation batch pilot requires one exact contour.');
  if (selected.partitions[0].environment !== 'main' && selected.partitions[0].environment !== 'bun')
    throw new Error('Native mutation batch pilot currently supports main and Bun contours only.');
  const batchSize = finite(values['batch-size']);
  const maxBatches = finite(values['max-batches']);
  const admitComplete = values['admit-complete'] === true;
  const diagnosticMutantId = values['diagnostic-mutant-id'];
  const diagnosticMutantIds = values['diagnostic-mutant-ids']?.split(',');
  if (
    diagnosticMutantId !== undefined &&
    (!diagnosticMutantId || diagnosticMutantId.length > 200 || batchSize !== 1 || maxBatches !== 1 || admitComplete)
  )
    throw new Error('Targeted diagnostics require one mutant, one batch and no complete admission.');
  if (
    diagnosticMutantIds !== undefined &&
    (diagnosticMutantId !== undefined ||
      diagnosticMutantIds.length < 1 ||
      diagnosticMutantIds.length > 32 ||
      diagnosticMutantIds.some((id) => !id || id.length > 200) ||
      new Set(diagnosticMutantIds).size !== diagnosticMutantIds.length ||
      batchSize !== 1 ||
      maxBatches !== 1 ||
      admitComplete)
  )
    throw new Error(
      'Targeted diagnostic sets require 1 through 32 unique IDs, singleton batches and no complete admission.',
    );
  return {
    partition: selected.partitions[0],
    batchSize,
    maxBatches,
    admitComplete,
    diagnosticMutantId,
    diagnosticMutantIds,
  };
}

/** Resolve a bounded diagnostic set against the complete original singleton plan. */
export function selectNativeMutationBatchIndices(
  plan: Pick<ReturnType<typeof planMutationBatches>, 'limit' | 'batches'>,
  diagnosticMutantIds: readonly string[],
): number[] {
  if (plan.limit !== 1) throw new Error('Targeted diagnostics require singleton batches.');
  if (diagnosticMutantIds.length < 1 || diagnosticMutantIds.length > 32)
    throw new Error('Targeted diagnostic sets require 1 through 32 IDs.');
  const wanted = new Set(diagnosticMutantIds);
  if (wanted.size !== diagnosticMutantIds.length || diagnosticMutantIds.some((id) => !id || id.length > 200))
    throw new Error('Targeted diagnostic set IDs must be unique nonempty tokens up to 200 characters.');
  const indices: number[] = [];
  for (const [index, batch] of plan.batches.entries()) {
    if (batch.identities.length !== 1 || batch.local_ids.length !== 1)
      throw new Error('Targeted diagnostics require singleton batches.');
    if (wanted.delete(batch.local_ids[0]!)) indices.push(index);
  }
  if (wanted.size > 0) throw new Error('Diagnostic mutant is absent from the complete generated plan.');
  return indices;
}

export function selectNativeMutationBatchWindow(
  plan: Pick<ReturnType<typeof planMutationBatches>, 'limit' | 'batches'>,
  maxBatches: number,
  diagnosticMutantId?: string,
) {
  if (diagnosticMutantId === undefined) return { start: 0, end: Math.min(maxBatches, plan.batches.length) };
  if (plan.limit !== 1 || maxBatches !== 1) throw new Error('Targeted diagnostics require singleton batches.');
  const index = plan.batches.findIndex((batch) => batch.local_ids[0] === diagnosticMutantId);
  if (index < 0) throw new Error('Diagnostic mutant is absent from the complete generated plan.');
  return { start: index, end: index + 1 };
}

export function nativeMutationBatchCommand(
  bwrap: string,
  directory: string,
  sandbox: string,
  sandboxTmp: string,
  executable: string,
): string[] {
  return [
    bwrap,
    '--die-with-parent',
    '--ro-bind',
    '/',
    '/',
    '--proc',
    '/proc',
    '--dev',
    '/dev',
    '--bind',
    '/tmp',
    '/tmp',
    '--bind',
    directory,
    directory,
    '--ro-bind',
    sandbox,
    sandbox,
    '--bind',
    sandboxTmp,
    sandboxTmp,
    '--chdir',
    sandbox,
    executable,
    '--no-env-file',
    '--no-install',
    'tooling/mutation-command-runner.ts',
  ];
}

/** Complete partition admission is explicit; ordinary gate selection and global admission stay unchanged. */
async function runMutationBatchPilot(root: string, args: readonly string[]): Promise<void> {
  const pilotStarted = performance.now();
  const partitionBudget = executionBudget(mutationLimits.partitionMs, 0);
  const { partition, batchSize, maxBatches, admitComplete, diagnosticMutantId, diagnosticMutantIds } =
    selectMutationBatchPilot(args, mutationPartitions());
  const pin = readPin(root);
  checkManifest(root, pin);
  if (process.versions.bun !== pin) throw new Error('Mutation batch pilot requires the pinned Bun.');
  const repository = repositoryRootForPackage(root);
  const bwrap = Bun.which('bwrap');
  if (!repository || !bwrap) throw new Error('Mutation batch pilot requires repository layout and bwrap.');
  requireCampaignStorage(root);
  const runId = randomUUID();
  await mkdir(path.join(root, '.tmp'), { recursive: true });
  const directory = await mkdtemp(path.join(root, '.tmp', `mutation-batch-${runId}-`));
  console.log(
    JSON.stringify({ schema: 'MutationBatchPilotLocation/v1', directory, run_id: runId, contour: partition.name }),
  );
  const record = (file: string, value: unknown) => writeMutationMapArtifact(directory, file, value);
  try {
    const inputs = await qualityInputs(root, mutationToolInputs);
    const fingerprint = qualityFingerprint(inputs);
    const source = mutationPartitionSourceBinding(partition.name, mutationPartitionSources(partition), inputs.sources);
    if (!source || !partition.tests) throw new Error('Mutation batch Source/test binding is incomplete.');
    const tests = partition.tests;
    const binding: MutationMapBinding = {
      run_id: runId,
      partition: partition.name,
      input_fingerprint: fingerprint,
      source_fingerprint: inputs.source_fingerprint,
      test_fingerprint: inputs.test_fingerprint,
      tool_fingerprint: inputs.tool_fingerprint,
      partition_sources: source.sourceInputs,
    };
    const image = await generateMutationImage(root, binding, inputs.input_bytes);
    if (image.universe.mutants.some((row) => row.generated_status !== 'Pending'))
      throw new Error('Generated dispositions require review before a native batch pilot.');
    const plan = planMutationBatches(root, binding, image.universe, batchSize);
    const diagnosticBatchIndices =
      diagnosticMutantIds === undefined ? undefined : selectNativeMutationBatchIndices(plan, diagnosticMutantIds);
    const window =
      diagnosticMutantIds === undefined
        ? selectNativeMutationBatchWindow(plan, maxBatches, diagnosticMutantId)
        : undefined;
    const artifacts = {
      generated_image: record('generated-image.json', image),
      batch_plan: record('batch-plan.json', plan),
      input_descriptor: record(`${partition.name}.inputs.json`, {
        schema: 'MutationInputDescriptor/v3',
        partition: partition.name,
        partition_sources: source.sources,
        partition_source_inputs: source.sourceInputs,
        partition_source_fingerprint: source.fingerprint,
        source_fingerprint: inputs.source_fingerprint,
        tests,
        test_selection: inputs.test_selection,
        test_inputs: inputs.test_inputs,
        tool_inputs: inputs.tool_inputs,
        input_fingerprint: fingerprint,
        test_fingerprint: inputs.test_fingerprint,
        tool_fingerprint: inputs.tool_fingerprint,
      }),
    };
    if (admitComplete && maxBatches < plan.batches.length)
      throw new Error('Complete native admission requires every planned batch before any test launch.');
    const sandboxRoot = path.join(directory, 'stryker-tmp');
    const sandbox = path.join(sandboxRoot, 'sandbox-native');
    await mkdir(sandbox, { recursive: true });
    // Repository context remains under the existing captured/verified parent owner.
    for (const [file, bytes] of Object.entries(inputs.input_bytes)) {
      if (file.startsWith('_repository/')) continue;
      const target = path.resolve(sandbox, file);
      if (!target.startsWith(sandbox + path.sep)) throw new Error('Mutation snapshot path escaped its owner.');
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, bytes, { flag: 'wx', mode: 0o600 });
    }
    for (const file of image.files) await writeFile(path.join(sandbox, file.path), file.content);
    const sandboxTmp = path.join(sandbox, '.tmp');
    await mkdir(sandboxTmp, { recursive: true });
    await symlink(path.join(root, 'node_modules'), path.join(sandbox, 'node_modules'), 'dir');
    const environment: NodeJS.ProcessEnv = {
      ...process.env,
      AGENT_RUNTIME_TEST_REPOSITORY_ROOT: repository,
      AGENT_RUNTIME_MUTATION_DIRECTORY: directory,
      AGENT_RUNTIME_MUTATION_SANDBOX_ROOT: sandboxRoot,
      AGENT_RUNTIME_MUTATION_PARTITION: partition.name,
      AGENT_RUNTIME_MUTATION_RUN_ID: runId,
      AGENT_RUNTIME_MUTATION_TESTS: tests.join(','),
      AGENT_RUNTIME_MUTATION_SOURCES: JSON.stringify(source.sources),
      AGENT_RUNTIME_MUTATION_PARTITION_SOURCE_FINGERPRINT: source.fingerprint,
      AGENT_RUNTIME_SOURCE_FINGERPRINT: inputs.source_fingerprint,
      AGENT_RUNTIME_INPUT_FINGERPRINT: fingerprint,
      AGENT_RUNTIME_TEST_FINGERPRINT: inputs.test_fingerprint,
      AGENT_RUNTIME_TOOL_FINGERPRINT: inputs.tool_fingerprint,
    };
    delete environment.__STRYKER_ACTIVE_MUTANT__;
    delete environment.AGENT_MUTATION_PARENT_PER_TEST_CAPTURE;
    delete environment.AGENT_MUTATION_PER_TEST_CAPTURE;
    const parentIdentity = () =>
      collectExecutionIdentity({
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
    const identity = await parentIdentity();
    const context = { identity, hookFiles: testFilesWithLifecycleHooks(tests, inputs.input_bytes) };
    const command = nativeMutationBatchCommand(bwrap, directory, sandbox, sandboxTmp, process.execPath);
    const receipts = new Map<string, NativeMutationReceiptReference>();
    const invoke = async (id: string | null, remaining: number, census?: readonly MutationJUnitCase[]) => {
      requireCampaignStorage(directory);
      const key = id === null ? 'dry-run' : sha256(id);
      const result = await executeMutationCommand(
        command,
        sandbox,
        Math.min(mutationLimits.commandMs + 10_000, remaining),
        {
          ownedProcessGroup: true,
          env: id === null ? environment : { ...environment, __STRYKER_ACTIVE_MUTANT__: id },
          stdoutFile: path.join(directory, `launcher-${key}.stdout.log`),
          stderrFile: path.join(directory, `launcher-${key}.stderr.log`),
        },
      );
      const launcherArtifact = record(`launcher-${key}.json`, result);
      if (
        result.timedOut ||
        result.signal ||
        result.spawnError ||
        !result.output_capture?.complete ||
        !validCapturedOutput(result.output_capture.stdout) ||
        !validCapturedOutput(result.output_capture.stderr) ||
        result.processCustody?.processGroupTerminationObserved !== true
      )
        return { status: 'unknown' as const, reason: 'Native mutation producer or capture did not close cleanly.' };
      const outcome = await confirmRunnerReceipt(
        directory,
        runId,
        partition.name,
        id,
        tests,
        inputs,
        fingerprint,
        source.sources,
        source.fingerprint,
        context,
        census,
        undefined,
        true,
      );
      if (outcome.status === 'unknown') return outcome;
      if (result.exitCode !== (outcome.status === 'passed' ? 0 : 1))
        return {
          status: 'unknown' as const,
          reason: 'Native launcher exit differs from the confirmed runner outcome.',
        };
      if (!outcome.native_receipt)
        return { status: 'unknown' as const, reason: 'Native mutation receipt reference is missing.' };
      const nativeReceipt = { ...outcome.native_receipt, launcher: { artifact: launcherArtifact, result } };
      if (id !== null) receipts.set(id, nativeReceipt);
      return { ...outcome, native_receipt: nativeReceipt };
    };
    const baseline = await invoke(null, partitionBudget.remaining(mutationLimits.dryRunEnvelopeMs));
    const baselineArtifact = record('baseline.json', baseline);
    if (baseline.status !== 'passed' || !baseline.native_receipt)
      throw new Error('Native mutation baseline is not a complete passing receipt.');
    const batches: Array<Parameters<typeof validateNativeMutationPartitionProof>[4]['batches'][number]> = [];
    const results: NativeBatchRow[] = [];
    const totals = {
      generated: image.universe.mutants.length,
      attempted: 0,
      killed: 0,
      survived: 0,
      unknown: 0,
      unattempted: image.universe.mutants.length,
    };
    let resourceBlocked: { observed_path: string; available_bytes: string | null } | undefined;
    const batchCount = diagnosticBatchIndices?.length ?? window!.end - window!.start;
    for (let position = 0; position < batchCount; position++) {
      const index = diagnosticBatchIndices?.[position] ?? window!.start + position;
      const batch = plan.batches[index]!;
      const started = position === 0 ? pilotStarted : performance.now();
      const observed = await collectNativeMutationBatch(
        batch,
        () => partitionBudget.remaining(),
        (id, remaining) => invoke(id, remaining, baseline.cases),
        (row, completed) => {
          totals.attempted++;
          totals[row.status]++;
          totals.unattempted--;
          console.log(
            JSON.stringify({
              schema: 'MutationBatchPilotProgress/v1',
              scope: 'live-unadmitted-progress',
              batch: index,
              completed,
              planned: batch.identities.length,
              local_id: row.local_id,
              identity: row.identity,
              status: row.status,
              totals: { ...totals },
            }),
          );
        },
      );
      const current = observed.results;
      results.push(...current);
      resourceBlocked = observed.resourceBlocked;
      let failure = observed.failure;
      try {
        if (failure) throw failure.error;
        for (const file of image.files)
          if (sha256(await readFile(path.join(sandbox, file.path))) !== file.sha256)
            throw new Error('Native instrumented image drifted.');
      } catch (error) {
        failure = { error };
        throw error;
      } finally {
        completeOwnedCleanup(
          [
            () => {
              const value: NativeMutationBatchResult = {
                schema: 'MutationBatchPilotResult/v2',
                binding,
                universe_sha256: plan.universe_sha256,
                index,
                elapsed_ms: performance.now() - started,
                complete: current.length === batch.identities.length && failure === undefined,
                interrupted: failure !== undefined,
                budget_exhausted: observed.budgetExhausted,
                resource_blocked: resourceBlocked ?? null,
                results: current,
              };
              batches.push({ artifact: record(`batch-${index}.json`, value), value });
              return undefined;
            },
          ],
          failure,
        );
      }
      if (current.length !== batch.identities.length || current.some((row) => row.status === 'unknown')) break;
    }
    const current = await readQualityInputs(root, Object.keys(inputs.input_bytes));
    for (const [file, bytes] of current)
      if (!bytes.equals(inputs.input_bytes[file]!)) throw new Error('Native mutation parent inputs drifted.');
    const observedIdentity = await parentIdentity();
    if (executionIdentityDigest(observedIdentity) !== executionIdentityDigest(identity))
      throw new Error('Native mutation executable identity drifted.');
    if (results.length !== totals.attempted) throw new Error('Native mutation progress observation count differs.');
    const summary = {
      schema: 'MutationBatchPilotSummary/v2',
      scope: 'diagnostic-only',
      full_contour_qualification: false,
      binding,
      universe_sha256: plan.universe_sha256,
      baseline_cases: baseline.cases.length,
      resource_blocked: resourceBlocked ?? null,
      totals,
      ...(diagnosticMutantId !== undefined
        ? { diagnostic_selection: { local_id: diagnosticMutantId, batch_index: window!.start } }
        : diagnosticMutantIds !== undefined
          ? {
              diagnostic_selection: {
                selections: diagnosticBatchIndices!.map((index) => ({
                  local_id: plan.batches[index]!.local_ids[0]!,
                  batch_index: index,
                })),
              },
            }
          : {}),
    };
    record('terminal-summary.json', summary);
    console.log(JSON.stringify(summary));
    if (admitComplete && !totals.unknown && !totals.survived && !totals.unattempted) {
      const proof = validateNativeMutationPartitionProof(root, binding, image.universe, plan, {
        tests,
        artifacts,
        baseline: { ...baseline, artifact: baselineArtifact, native_receipt: baseline.native_receipt },
        batches,
        receipts,
      });
      const validationContext: NativeMutationValidationContext = {
        schema: 'NativeMutationValidationContext/v1',
        binding,
        invocation_executable: process.execPath,
        parent_identity_before: identity,
        parent_identity_after: observedIdentity,
        hook_files: context.hookFiles,
        source_inputs: inputs.sources,
      };
      const contextualProof: NativeMutationPartitionProofV2 = {
        ...proof,
        schema: 'NativeMutationPartitionProof/v2',
        validation_context: record('validation-context.json', validationContext),
      };
      const proofArtifact = record('native-partition-proof.json', contextualProof);
      const report = {
        schema: 'CandidateNativeMutationReport/v1',
        producer_kind: 'native-instrumenter-batches/v1',
        qualification_scope: 'partition',
        full_qualification: false,
        status: 'pilot-pass',
        binding,
        tests,
        required_effective_score: 1,
        effective_score: 1,
        mutants: proof.mutants.length,
        killed: proof.mutants.length,
        non_killed: [],
        unknown_mutants: [],
        native_partition_proof: proofArtifact,
      };
      record('native-partition-report.json', report);
      console.log(
        JSON.stringify({
          schema: 'CandidateNativeMutationReportLocation/v1',
          directory,
          report: 'native-partition-report.json',
        }),
      );
    }
    if (totals.unknown || totals.survived || totals.unattempted) process.exitCode = 1;
  } catch (error) {
    completeOwnedCleanup(
      [
        () => {
          record('terminal-error.json', {
            schema: 'MutationBatchPilotError/v1',
            scope: 'diagnostic-only',
            run_id: runId,
            full_contour_qualification: false,
            error: String(error),
          });
          return undefined;
        },
      ],
      { error },
    );
    throw error;
  }
}

if (import.meta.main) {
  if (process.argv.length === 3 && process.argv[2] === '--help')
    console.log(
      'Native mutation batches: --contour <exact declared name> [--batch-size 1..128 (default16)] [--max-batches 1..128 (default1)] [--admit-complete] [--diagnostic-mutant-id <generated local ID> | --diagnostic-mutant-ids <comma-separated generated local IDs>]. Targeted diagnostics require batch-size1/max-batches1, retain the complete plan and full test baseline, and cannot use complete admission. ID sets allow1..32 unique IDs and share one budget across selected mutants. Explicit admission requires every planned batch before tests launch, then exact baseline, activation and receipt joins. Partial/unknown results stay diagnostic; no global qualification.',
    );
  else
    await runMutationBatchPilot(
      path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'),
      process.argv.slice(2),
    );
}
