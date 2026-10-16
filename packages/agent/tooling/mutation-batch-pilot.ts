import { randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, readFile, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { checkManifest, readPin } from '../bin/bun.ts';
import {
  qualityInputs,
  qualityFingerprint,
  readQualityInputs,
  repositoryRootForPackage,
  sha256,
} from './bun-coverage-evidence.ts';
import { requireCampaignStorage } from './contour-campaign.ts';
import { generateMutationImage } from './mutation-generation.ts';
import { confirmRunnerReceipt, selectMutationPartitions } from './mutation-gate.ts';
import { mutationPartitionSourceBinding } from './mutation-command-runner.ts';
import {
  collectExecutionIdentity,
  executionIdentityDigest,
  executeMutationCommand,
  mutationToolInputs,
  testFilesWithLifecycleHooks,
  type MutationJUnitCase,
} from './mutation-evidence.ts';
import { mutationLimits } from './mutation-limits.ts';
import { planMutationBatches, writeMutationMapArtifact, type MutationMapBinding } from './mutation-map.ts';
import { mutationPartitions, mutationPartitionSources, type MutationPartition } from './mutation-partitions.ts';
import { completeOwnedCleanup } from './owned-cleanup-completion.ts';

export function selectMutationBatchPilot(args: readonly string[], partitions: MutationPartition[]) {
  const { values } = parseArgs({
    args: [...args],
    options: {
      contour: { type: 'string' },
      'batch-size': { type: 'string', default: '16' },
      'max-batches': { type: 'string', default: '1' },
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
  return {
    partition: selected.partitions[0],
    batchSize: finite(values['batch-size']),
    maxBatches: finite(values['max-batches']),
  };
}

/** Bounded diagnostic only; ordinary gate selection and global admission stay unchanged. */
async function runMutationBatchPilot(root: string, args: readonly string[]): Promise<void> {
  const { partition, batchSize, maxBatches } = selectMutationBatchPilot(args, mutationPartitions());
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
    record('generated-image.json', image);
    record('batch-plan.json', plan);
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
    record(`${partition.name}.inputs.json`, {
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
    });
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
    const command = [
      bwrap,
      '--die-with-parent',
      '--ro-bind',
      '/',
      '/',
      '--bind',
      directory,
      directory,
      '--ro-bind',
      sandbox,
      sandbox,
      '--bind',
      sandboxTmp,
      sandboxTmp,
      '--bind',
      '/tmp',
      '/tmp',
      '--chdir',
      sandbox,
      process.execPath,
      '--no-env-file',
      '--no-install',
      'tooling/mutation-command-runner.ts',
    ];
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
      record(`launcher-${key}.json`, result);
      if (
        result.timedOut ||
        result.signal ||
        result.spawnError ||
        !result.output_capture?.complete ||
        result.processCustody?.processGroupTerminationObserved !== true
      )
        return { status: 'unknown' as const, reason: 'Native mutation producer or capture did not close cleanly.' };
      return confirmRunnerReceipt(
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
      );
    };
    const baseline = await invoke(null, mutationLimits.dryRunEnvelopeMs);
    record('baseline.json', baseline);
    if (baseline.status !== 'passed') throw new Error('Native mutation baseline is not a complete passing receipt.');
    const results: {
      identity: string;
      local_id: string;
      status: 'killed' | 'survived' | 'unknown';
      reason?: string;
    }[] = [];
    for (const [index, batch] of plan.batches.slice(0, maxBatches).entries()) {
      const started = performance.now();
      const current: typeof results = [];
      for (const [offset, id] of batch.local_ids.entries()) {
        const remaining = mutationLimits.partitionMs - (performance.now() - started);
        if (remaining <= 0) break;
        const observed = await invoke(id, remaining, baseline.cases);
        const row = {
          identity: batch.identities[offset]!,
          local_id: id,
          status: observed.status === 'passed' ? ('survived' as const) : observed.status,
          ...(observed.status === 'unknown' ? { reason: observed.reason } : {}),
        };
        current.push(row);
        results.push(row);
        console.log(
          JSON.stringify({
            schema: 'MutationBatchPilotProgress/v1',
            batch: index,
            completed: current.length,
            planned: batch.identities.length,
            status: row.status,
          }),
        );
        if (row.status === 'unknown') break;
      }
      for (const file of image.files)
        if (sha256(await readFile(path.join(sandbox, file.path))) !== file.sha256)
          throw new Error('Native instrumented image drifted.');
      record(`batch-${index}.json`, {
        schema: 'MutationBatchPilotResult/v1',
        binding,
        universe_sha256: plan.universe_sha256,
        index,
        elapsed_ms: performance.now() - started,
        complete: current.length === batch.identities.length,
        results: current,
      });
      if (current.length !== batch.identities.length || current.some((row) => row.status === 'unknown')) break;
    }
    const current = await readQualityInputs(root, Object.keys(inputs.input_bytes));
    for (const [file, bytes] of current)
      if (!bytes.equals(inputs.input_bytes[file]!)) throw new Error('Native mutation parent inputs drifted.');
    if (executionIdentityDigest(await parentIdentity()) !== executionIdentityDigest(identity))
      throw new Error('Native mutation executable identity drifted.');
    const totals = {
      generated: image.universe.mutants.length,
      attempted: results.length,
      killed: results.filter((row) => row.status === 'killed').length,
      survived: results.filter((row) => row.status === 'survived').length,
      unknown: results.filter((row) => row.status === 'unknown').length,
      unattempted: image.universe.mutants.length - results.length,
    };
    const summary = {
      schema: 'MutationBatchPilotSummary/v1',
      scope: 'diagnostic-only',
      full_contour_qualification: false,
      binding,
      universe_sha256: plan.universe_sha256,
      baseline_cases: baseline.cases.length,
      totals,
    };
    record('terminal-summary.json', summary);
    console.log(JSON.stringify(summary));
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
      'Diagnostic native mutation batches: --contour <exact declared name> [--batch-size 1..128 (default16)] [--max-batches 1..128 (default1)]. Complete generated universe and full declared test argv; partial/unknown results never qualify a contour.',
    );
  else
    await runMutationBatchPilot(
      path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'),
      process.argv.slice(2),
    );
}
