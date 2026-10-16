import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, statfsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isRecord } from '../src/contracts/forward-controller-values.ts';
import {
  contourAttempts,
  contourAttemptMaximum,
  mergeContourProgress,
  selectContourCampaign,
} from './contour-progress.ts';
import { runContourProgress } from './contour-progress-cli.ts';
import { latestScopedCrapBudgetRef } from './crap-gate.ts';
import { executeMutationCommand, type MutationProcessResult } from './mutation-evidence.ts';
import { mutationLimits } from './mutation-limits.ts';
import { mutationPartitionSources, mutationPartitions, type MutationPartition } from './mutation-partitions.ts';

type Lane = 'coverage' | 'frozen-crap' | 'mutation';
export type CampaignOutcome = {
  state: 'completed' | 'failed' | 'timeout' | 'gap' | 'unknown';
  detail: string;
  report?: string;
};
type Step = { contour: string; lane: Lane; outcome: CampaignOutcome };
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repositoryRoot = path.resolve(packageRoot, '../..');
const statusDirectory = path.join(repositoryRoot, '.agent/work/core-runtime-reactivation');
const maximumOutputBytes = 128 * 1024 * 1024;

export function campaignOptions(args: readonly string[]): { mode: 'all' | 'unclosed'; plan: boolean } {
  const selection = args.filter((arg) => arg === '--all' || arg === '--unclosed');
  if (
    selection.length !== 1 ||
    args.some((arg) => !['--all', '--unclosed', '--plan'].includes(arg)) ||
    new Set(args).size !== args.length
  )
    throw new Error('Usage: bun run test:contours --all|--unclosed [--plan]');
  return { mode: selection[0] === '--all' ? 'all' : 'unclosed', plan: args.includes('--plan') };
}

/** Campaign producers and reviewed budgets must receive the same complete registry Source selection. */
export function campaignPartition(partition: MutationPartition): MutationPartition {
  return { ...partition, sources: mutationPartitionSources(partition) };
}

/** Known failures do not hide later lanes. Unaccounted process custody fences every successor. */
export async function executeContourCampaign(
  partitions: readonly MutationPartition[],
  execute: (partition: MutationPartition, lane: Lane) => Promise<CampaignOutcome>,
  record: (step: Step) => void,
): Promise<{ complete: boolean; steps: Step[] }> {
  const steps: Step[] = [];
  // Finish the inexpensive diagnostic pass before spending mutation budgets.
  for (const lanes of [['coverage', 'frozen-crap'], ['mutation']] as const) {
    for (const partition of partitions) {
      for (const lane of lanes) {
        const outcome = await execute(partition, lane);
        const step = { contour: partition.name, lane, outcome };
        record(step);
        steps.push(step);
        if (outcome.state === 'unknown') return { complete: false, steps };
      }
    }
  }
  return { complete: true, steps };
}

export function campaignProcessState(result: MutationProcessResult): CampaignOutcome['state'] {
  if (!result.processCustody?.terminationObserved || !result.processCustody.processGroupTerminationObserved)
    return 'unknown';
  if (result.timedOut) return 'timeout';
  if (
    result.signal ||
    result.spawnError ||
    !result.output_capture?.complete ||
    result.output_capture.stdout.truncated ||
    result.output_capture.stderr.truncated ||
    !Number.isInteger(result.exitCode)
  )
    return 'failed';
  return result.exitCode === 0 ? 'completed' : 'failed';
}

function jsonFile(file: string): unknown {
  const bytes = readFileSync(file);
  if (bytes.length > maximumOutputBytes) throw new Error('Campaign artifact exceeds byte bound: ' + file);
  return JSON.parse(bytes.toString('utf8')) as unknown;
}

function git(args: string[]): string {
  return execFileSync('git', args, {
    cwd: repositoryRoot,
    encoding: 'utf8',
    timeout: 5000,
    maxBuffer: 4 * 1024 * 1024,
  }).trim();
}

function assertCleanCommit(commit: string): void {
  if (git(['rev-parse', 'HEAD']) !== commit || git(['status', '--porcelain']))
    throw new Error('Campaign requires one unchanged clean Source commit; commit fixes after all producers terminate.');
}

function writeRecord(directory: string, file: string, record: unknown): void {
  writeFileSync(path.join(directory, file), JSON.stringify(record, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
}

function isolatedCommand(directory: string, args: string[], tools: { tini: string; bwrap: string }) {
  const temporary = mkdtempSync('/tmp/vida-contour-campaign-');
  const info = statfsSync(temporary, { bigint: true });
  if (info.type !== 0x01021994n || info.bavail * info.bsize < 2n * 1024n ** 3n)
    throw new Error('Campaign requires at least 2 GiB free on its private tmpfs.');
  const scratch = path.join(temporary, 'scratch');
  mkdirSync(scratch);
  return {
    temporary,
    command: [
      tools.tini,
      '-s',
      '--',
      tools.bwrap,
      '--die-with-parent',
      '--unshare-pid',
      '--ro-bind',
      '/',
      '/',
      '--proc',
      '/proc',
      '--dev',
      '/dev',
      '--bind',
      repositoryRoot,
      repositoryRoot,
      '--bind',
      directory,
      directory,
      '--bind',
      scratch,
      '/tmp',
      '--chdir',
      packageRoot,
      process.execPath,
      '--no-env-file',
      '--no-install',
      ...args,
    ],
  };
}

async function main(): Promise<void> {
  if (process.argv.length === 3 && process.argv[2] === '--help') {
    process.stdout.write(
      'Usage: bun run test:contours --all|--unclosed [--plan]\nRuns coverage, frozen CRAP and mutation for declared executable contours.\n--all: every active contour; --unclosed: no compatible same-commit local triple.\n--plan: print selection without launching tests. Linux requires bwrap and tini (or VIDA_QUALITY_TINI).\n',
    );
    return;
  }
  if (process.argv[2] === '--coverage-child') {
    const declared = mutationPartitions().find((row) => row.name === process.argv[3]);
    const partition = declared && campaignPartition(declared);
    if (process.argv.length !== 4 || !partition?.sources?.length || !partition.tests?.length)
      throw new Error('Coverage child requires one declared executable contour.');
    const { runBunCoverage } = await import('./run-bun-coverage.ts');
    await runBunCoverage({
      args: [],
      focusedDiagnostic: {
        mode: 'focused-diagnostic',
        contour: partition.name,
        sources: partition.sources,
        tests: partition.tests,
      },
    });
    return;
  }
  const options = campaignOptions(process.argv.slice(2));
  const commit = git(['rev-parse', 'HEAD']);
  assertCleanCommit(commit);
  const snapshotPath = path.join(statusDirectory, 'CONTOUR-STATUS.json');
  const snapshot = mergeContourProgress(jsonFile(snapshotPath), []);
  const selected = selectContourCampaign(snapshot, options.mode, commit);
  const lineage = jsonFile(path.join(statusDirectory, 'crap-budgets.reviewed-partial.v1.json'));
  const partitions = selected.map((row) => {
    const partition = campaignPartition(row);
    return {
      ...partition,
      budget_ref: latestScopedCrapBudgetRef(partition.name, partition.sources!, lineage),
    };
  });
  const plan = {
    schema: 'VidaContourCampaignPlan/v1',
    run_id: randomUUID(),
    source_commit: commit,
    ...options,
    selection_policy:
      'all executable contours, or those without a compatible same-commit local triple; no global freshness claim',
    partitions,
    coverage_deadline_ms: 330_000,
    mutation_deadline_ms: mutationLimits.partitionMs + 30_000,
  };
  if (options.plan) {
    process.stdout.write(JSON.stringify(plan, null, 2) + '\n');
    return;
  }
  const directory = path.join(packageRoot, 'coverage/contour-campaigns', plan.run_id);
  mkdirSync(directory, { recursive: true });
  writeRecord(directory, 'plan.json', plan);
  process.stdout.write(
    JSON.stringify({ campaign: directory, contours: partitions.length, source_commit: commit }) + '\n',
  );
  const tools = { tini: process.env.VIDA_QUALITY_TINI ?? Bun.which('tini'), bwrap: Bun.which('bwrap') };
  if (!tools.tini || !tools.bwrap) {
    writeRecord(directory, 'terminal.json', {
      status: 'setup-failed',
      detail:
        'Linux bwrap and tini are required; VIDA_QUALITY_TINI may name an installed tini binary. No producers launched.',
    });
    throw new Error('Campaign isolation prerequisites are missing.');
  }
  const isolationTools = { tini: tools.tini, bwrap: tools.bwrap };
  const boot = readFileSync('/proc/sys/kernel/random/boot_id', 'utf8').trim();
  const reports: string[] = [];
  const incoming: ReturnType<typeof contourAttempts> = [];
  const coverageReports = new Map<string, string>();
  let index = 0;
  try {
    const result = await executeContourCampaign(
      partitions,
      async (partition, lane) => {
        assertCleanCommit(commit);
        if (readFileSync('/proc/sys/kernel/random/boot_id', 'utf8').trim() !== boot)
          return { state: 'unknown', detail: 'Host boot changed; retained attempts are never replayed.' };
        const budget = partitions.find((row) => row.name === partition.name)!.budget_ref;
        const coverage = coverageReports.get(partition.name);
        if (lane === 'frozen-crap' && (!budget || !coverage))
          return {
            state: 'gap',
            detail: !budget ? 'No pinned reviewed scope budget.' : 'No complete coverage report from this campaign.',
          };
        const stage = `${String(++index).padStart(3, '0')}-${partition.name}-${lane}`;
        const stageDirectory = path.join(directory, stage);
        mkdirSync(stageDirectory);
        const args =
          lane === 'coverage'
            ? ['tooling/contour-campaign.ts', '--coverage-child', partition.name]
            : lane === 'mutation'
              ? ['tooling/mutation-gate.ts', '--pilot-partition', partition.name]
              : ['tooling/crap-gate.ts', '--contour', partition.name, '--budget-ref', budget!];
        const isolated = isolatedCommand(stageDirectory, args, isolationTools);
        const timeoutMs =
          lane === 'mutation' ? mutationLimits.partitionMs + 30_000 : lane === 'coverage' ? 330_000 : 60_000;
        writeRecord(stageDirectory, 'launch.json', {
          source_commit: commit,
          boot,
          partition,
          lane,
          timeout_ms: timeoutMs,
          ...isolated,
        });
        const started = performance.now();
        const child = await executeMutationCommand(isolated.command, packageRoot, timeoutMs, {
          ownedProcessGroup: true,
          outputByteLimit: maximumOutputBytes,
          stdoutFile: path.join(stageDirectory, 'stdout.log'),
          stderrFile: path.join(stageDirectory, 'stderr.log'),
          env: { ...process.env, TMPDIR: '/tmp', ...(coverage ? { VIDA_BUN_COVERAGE_REPORT: coverage } : {}) },
        });
        const bootAfter = readFileSync('/proc/sys/kernel/random/boot_id', 'utf8').trim();
        const state = bootAfter === boot ? campaignProcessState(child) : 'unknown';
        writeRecord(stageDirectory, 'execution.json', {
          result: child,
          elapsed_ms: performance.now() - started,
          boot,
          boot_after: bootAfter,
        });
        assertCleanCommit(commit);
        if (state === 'unknown' || state === 'timeout') return { state, detail: stageDirectory };
        let report: string | undefined;
        try {
          if (lane === 'mutation') {
            const summary = jsonFile(path.join(stageDirectory, 'stdout.log'));
            if (isRecord(summary) && typeof summary.evidence_directory === 'string') {
              report = path.join(summary.evidence_directory, 'terminal-summary.json');
              jsonFile(report);
            }
          } else {
            const lines = readFileSync(path.join(stageDirectory, 'stdout.log'), 'utf8').trim().split('\n');
            for (const line of lines) {
              if (!line.startsWith('{')) continue;
              const value: unknown = JSON.parse(line);
              if (
                isRecord(value) &&
                typeof value.report === 'string' &&
                (lane === 'coverage'
                  ? value.schema === 'VidaBunFocusedCoverageDiagnosticLocation/v1'
                  : value.status === 'scoped-proof-pass')
              )
                report = value.report;
            }
            if (report && lane === 'coverage') coverageReports.set(partition.name, report);
          }
        } catch (error) {
          return { state: 'gap', detail: `Terminal report unavailable: ${String(error)}; ${stageDirectory}` };
        }
        if (!report) return { state: 'gap', detail: stageDirectory };
        try {
          const attempts = contourAttempts(jsonFile(report), {
            commit,
            artifact: report,
            recorded_at: new Date().toISOString(),
          });
          reports.push(report);
          incoming.push(...attempts);
          const maximum = attempts.some(
            (row) => row.contour === partition.name && row.lane === lane && contourAttemptMaximum(row),
          );
          return { state: state === 'completed' && !maximum ? 'failed' : state, detail: stageDirectory, report };
        } catch (error) {
          return { state: 'gap', detail: `Report proof rejected: ${String(error)}; ${stageDirectory}`, report };
        }
      },
      (step) => {
        writeRecord(directory, `${step.contour}.${step.lane}.json`, step);
        process.stdout.write(JSON.stringify(step) + '\n');
      },
    );
    assertCleanCommit(commit);
    const remaining = selectContourCampaign(mergeContourProgress(snapshot, incoming), 'unclosed', commit)
      .filter((partition) => partitions.some((selected) => selected.name === partition.name))
      .map((partition) => partition.name);
    writeRecord(directory, 'terminal.json', {
      schema: 'VidaContourCampaignOutcome/v1',
      source_commit: commit,
      boot,
      status: result.complete ? 'execution-complete' : 'unknown-fenced',
      qualification: 'individual producer proofs only; execution-complete does not mean gates passed',
      selected_contours_without_complete_triple: remaining,
      ...result,
    });
    runContourProgress(
      [
        '--snapshot',
        snapshotPath,
        '--output',
        statusDirectory,
        '--commit',
        commit,
        ...reports.flatMap((report) => ['--report', report]),
      ],
      packageRoot,
    );
    // This is an execution command; a successful exit requires all lane owners to finish without a gap.
    if (!result.complete || remaining.length || result.steps.some((step) => step.outcome.state !== 'completed'))
      process.exitCode = 1;
  } catch (error) {
    writeRecord(directory, 'interrupted.json', {
      status: 'incomplete',
      error: String(error),
      source_commit: commit,
      boot,
    });
    throw error;
  }
}

if (import.meta.main) await main();
