import { parseArgs } from 'node:util';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isRecord } from '../src/contracts/forward-controller-values.ts';
import {
  campaignPartition,
  campaignProcessState,
  campaignReportPublicationAdmitted as contourStagePublicationAdmitted,
  isolatedCommand,
  throwAfterCampaignReceiptFailure,
} from './contour-campaign.ts';
import { readContourArtifact, runContourProgressWithNative } from './contour-progress-cli.ts';
import { executeMutationCommand } from './mutation-evidence.ts';
import { mutationPartitions } from './mutation-partitions.ts';

type Lane = 'coverage' | 'frozen-crap' | 'crap-applicability' | 'mutation';

/** Owner-reported diagnostic counters never enter report routing or native proof admission. */
export function contourStageDiagnostic(stdout: string): Record<string, unknown> {
  let mutation: Record<string, unknown> | undefined;
  for (const line of stdout.split('\n')) {
    if (!line.startsWith('{')) continue;
    const value: unknown = JSON.parse(line);
    if (!isRecord(value) || value.schema !== 'MutationBatchPilotSummary/v2') continue;
    if (mutation) throw new Error('Ambiguous mutation diagnostic summaries.');
    if (
      !isRecord(value.binding) ||
      typeof value.binding.run_id !== 'string' ||
      value.binding.run_id.length === 0 ||
      value.binding.run_id.length > 128 ||
      !isRecord(value.totals)
    )
      throw new Error('Mutation diagnostic omits its run or counters.');
    const totals: Record<string, number> = {};
    for (const key of ['generated', 'attempted', 'killed', 'survived', 'unknown', 'unattempted']) {
      const count = value.totals[key];
      if (typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0)
        throw new Error('Invalid mutation diagnostic counter.');
      totals[key] = count;
    }
    if (
      totals.attempted !== totals.killed! + totals.survived! + totals.unknown! ||
      totals.generated !== totals.attempted! + totals.unattempted!
    )
      throw new Error('Mutation diagnostic counters do not reconcile.');
    mutation = { qualification: 'diagnostic-only', run_id: value.binding.run_id, totals };
  }
  return mutation ? { mutation } : {};
}

/** Exact structured producer locations only; partial native summaries are never reports. */
export function contourStageReportArguments(lane: Lane, stdout: string, coverageRun?: string): string[] {
  const reports: string[] = [];
  for (const line of stdout.split('\n')) {
    if (!line.startsWith('{')) continue;
    const value: unknown = JSON.parse(line);
    if (!isRecord(value)) continue;
    if (
      (lane === 'coverage' && value.schema === 'VidaBunFocusedCoverageDiagnosticLocation/v1') ||
      (lane === 'frozen-crap' &&
        /^VidaScopedCrapBudgetReport\/v[123]$/u.test(String(value.schema)) &&
        value.status === 'scoped-proof-pass') ||
      (lane === 'crap-applicability' &&
        value.schema === 'VidaScopedCrapApplicabilityNA/v1' &&
        value.status === 'reviewed-not-applicable')
    ) {
      if (typeof value.report !== 'string' || !path.isAbsolute(value.report))
        throw new Error('Stage report location must be absolute.');
      reports.push(value.report);
    } else if (lane === 'mutation' && value.schema === 'CandidateNativeMutationReportLocation/v1') {
      if (
        typeof value.directory !== 'string' ||
        !path.isAbsolute(value.directory) ||
        value.report !== 'native-partition-report.json'
      )
        throw new Error('Invalid native stage report location.');
      reports.push(path.join(value.directory, value.report));
    }
  }
  if (reports.length !== 1) throw new Error('Stage must produce exactly one attributable report location.');
  if (lane === 'frozen-crap' || lane === 'crap-applicability') {
    if (!coverageRun || !path.isAbsolute(coverageRun))
      throw new Error('Frozen stage must publish its input coverage run.');
    return ['--coverage-run', coverageRun, '--report', reports[0]!];
  }
  return [lane === 'coverage' ? '--coverage-run' : lane === 'mutation' ? '--native-report' : '--report', reports[0]!];
}

export function contourStageOutput(repository: string, output: string): string {
  if (!path.isAbsolute(output)) throw new Error('Canonical output must be absolute.');
  const canonical = realpathSync(output);
  if (!statSync(canonical).isDirectory()) throw new Error('Canonical output must be an existing directory.');
  const relative = path.relative(realpathSync(repository), canonical);
  if (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith('..' + path.sep))
    throw new Error('Canonical output must be outside the immutable measured checkout.');
  return canonical;
}

export { contourStagePublicationAdmitted };

async function main(): Promise<void> {
  if (process.argv.length === 3 && process.argv[2] === '--help') {
    process.stdout.write(
      'Usage: bun tooling/contour-stage.ts --contour <name> --lane coverage|frozen-crap|crap-applicability|mutation --output <absolute canonical directory> [--snapshot <JSON>] [--coverage-run <JSON> --budget-ref <commit>] [--isolated-workers [--workers 2|4]] [--diagnostic-mutant-ids <id[,id...]> | --diagnostic-batch-size <1..128>]\nRuns one declared contour stage, retains terminal custody and automatically publishes its exact report. Frozen CRAP and the separate data-only applicability lane require coverage-run and budget-ref. Worker count is an explicit opt-in (default2), mutation-only with isolated-workers, and subject to the native owner allowlist. Diagnostic ID selection is serial mutation-only; a diagnostic batch forwards one bounded batch to the native owner and permits qualified isolation. Both diagnostic selectors omit complete admission and never publish a score. Full launch data stays in launch.json; stdout prints compact location and terminal outcome records.\n',
    );
    return;
  }
  const { values } = parseArgs({
    args: process.argv.slice(2),
    strict: true,
    options: {
      contour: { type: 'string' },
      lane: { type: 'string' },
      output: { type: 'string' },
      snapshot: { type: 'string' },
      'coverage-run': { type: 'string' },
      'budget-ref': { type: 'string' },
      'isolated-workers': { type: 'boolean', default: false },
      workers: { type: 'string' },
      'diagnostic-mutant-ids': { type: 'string' },
      'diagnostic-batch-size': { type: 'string' },
    },
  });
  const { lane } = values;
  if (
    !values.output ||
    !path.isAbsolute(values.output) ||
    !['coverage', 'frozen-crap', 'crap-applicability', 'mutation'].includes(lane ?? '')
  )
    throw new Error('Stage requires an explicit lane and absolute canonical output directory.');
  if (values.snapshot && !existsSync(values.snapshot)) throw new Error('Missing explicit contour snapshot.');
  const declared = mutationPartitions().find((row) => row.name === values.contour);
  if (!declared || declared.environment === 'static' || declared.environment === 'retired')
    throw new Error('Stage requires an active declared executable contour.');
  const partition = campaignPartition(declared);
  if (!partition.sources?.length || !partition.tests?.length) throw new Error('Stage selection is empty.');
  const frozen = lane === 'frozen-crap' || lane === 'crap-applicability';
  const diagnosticIds = values['diagnostic-mutant-ids'];
  const diagnosticBatchSize = values['diagnostic-batch-size'];
  const diagnosticRequested = diagnosticIds !== undefined || diagnosticBatchSize !== undefined;
  if (
    (frozen && (!values['coverage-run'] || !values['budget-ref'])) ||
    (!frozen && (values['coverage-run'] || values['budget-ref'])) ||
    (values['isolated-workers'] && lane !== 'mutation') ||
    (values.workers !== undefined && (!values['isolated-workers'] || !['2', '4'].includes(values.workers))) ||
    (diagnosticIds !== undefined && (lane !== 'mutation' || values['isolated-workers'])) ||
    (diagnosticBatchSize !== undefined && (lane !== 'mutation' || diagnosticIds !== undefined))
  )
    throw new Error('Stage arguments differ from the selected lane contract.');
  const selectedLane: Lane =
    lane === 'coverage' ? 'coverage' : lane === 'crap-applicability' ? lane : frozen ? 'frozen-crap' : 'mutation';
  const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const repository = realpathSync(path.resolve(packageRoot, '../..'));
  const output = contourStageOutput(repository, values.output);
  const git = (...args: string[]) =>
    execFileSync('git', ['--no-optional-locks', ...args], { cwd: repository, encoding: 'utf8', timeout: 5000 }).trim();
  const commit = git('rev-parse', 'HEAD');
  if (git('status', '--porcelain')) throw new Error('Publish checked fixes before measurement.');
  const boot = readFileSync('/proc/sys/kernel/random/boot_id', 'utf8').trim();
  const directory = mkdtempSync(path.join(path.dirname(repository), 'contour-stage-'));
  const record = (name: string, value: unknown) =>
    writeFileSync(path.join(directory, name + '.json'), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
  const args = frozen
    ? [
        'tooling/crap-gate.ts',
        '--contour',
        partition.name,
        '--budget-ref',
        values['budget-ref']!,
        ...(lane === 'crap-applicability' ? ['--applicability-na'] : []),
      ]
    : lane === 'coverage'
      ? ['tooling/contour-campaign.ts', '--coverage-child', partition.name]
      : [
          'tooling/mutation-batch-pilot.ts',
          '--contour',
          partition.name,
          '--batch-size',
          diagnosticIds !== undefined ? '1' : (diagnosticBatchSize ?? '128'),
          '--max-batches',
          diagnosticRequested ? '1' : '128',
          ...(diagnosticIds !== undefined
            ? ['--diagnostic-mutant-ids', diagnosticIds]
            : diagnosticRequested
              ? []
              : ['--admit-complete']),
          ...(values['isolated-workers'] ? ['--isolated-workers'] : []),
          ...(values.workers !== undefined ? ['--workers', values.workers] : []),
        ];
  const isolated = isolatedCommand(
    directory,
    args,
    {
      tini: process.env.VIDA_QUALITY_TINI ?? '/home/agent/.local/bin/tini',
      bwrap: 'bwrap',
    },
    process.env.VIDA_QUALITY_RETAINED_SCRATCH_ROOT,
  );
  const timeout = lane === 'mutation' ? 930_000 : lane === 'coverage' ? 330_000 : 60_000;
  const launch = { commit, boot, contour: partition.name, lane, output, timeout_ms: timeout, ...isolated };
  record('launch', launch);
  process.stdout.write(
    JSON.stringify({
      schema: 'VidaContourStageLocation/v1',
      directory,
      commit,
      contour: partition.name,
      lane,
      timeout_ms: timeout,
    }) + '\n',
  );
  const started = performance.now();
  const result = await executeMutationCommand(isolated.command, packageRoot, timeout, {
    ownedProcessGroup: true,
    outputByteLimit: 128 * 1024 * 1024,
    stdoutFile: path.join(directory, 'stdout.log'),
    stderrFile: path.join(directory, 'stderr.log'),
    env: {
      ...process.env,
      ...isolated.environment,
      ...(frozen ? { VIDA_BUN_COVERAGE_REPORT: path.resolve(values['coverage-run']!) } : {}),
    },
  });
  const terminal = {
    ...launch,
    result,
    elapsed_ms: performance.now() - started,
    boot_after: readFileSync('/proc/sys/kernel/random/boot_id', 'utf8').trim(),
    commit_after: git('rev-parse', 'HEAD'),
    tracked_status_after: git('status', '--porcelain'),
  };
  record('execution', terminal);
  let published = false;
  let captured: { ok: true; stdout: string } | { ok: false; error: unknown } | undefined;
  const capturedOutput = () => {
    if (!captured) {
      try {
        captured = {
          ok: true,
          stdout: readContourArtifact(path.join(directory, 'stdout.log'), 128 * 1024 * 1024).toString('utf8'),
        };
      } catch (error) {
        captured = { ok: false, error };
      }
    }
    if (!captured.ok) throw captured.error;
    return captured.stdout;
  };
  const diagnostic = (detail: Record<string, unknown>) => {
    let counters: Record<string, unknown>;
    try {
      counters = contourStageDiagnostic(capturedOutput());
    } catch (error) {
      counters = { diagnostic_error: String(error) };
    }
    return {
      schema: 'VidaContourStageOutcome/v1',
      directory,
      contour: partition.name,
      lane,
      process: campaignProcessState(result),
      elapsed_ms: terminal.elapsed_ms,
      exit_code: result.exitCode,
      signal: result.signal,
      timed_out: result.timedOut,
      spawn_error: result.spawnError,
      capture_complete: result.output_capture?.complete === true,
      group_closed: result.processCustody?.processGroupTerminationObserved === true,
      boot_unchanged: terminal.boot_after === boot,
      commit_unchanged: terminal.commit_after === commit,
      clean_inputs: !terminal.tracked_status_after,
      ...counters,
      ...detail,
    };
  };
  try {
    if (
      terminal.boot_after !== boot ||
      terminal.commit_after !== commit ||
      terminal.tracked_status_after ||
      !contourStagePublicationAdmitted(result, selectedLane)
    )
      throw new Error(
        `Stage publication denied: boot_unchanged=${terminal.boot_after === boot}, commit_unchanged=${terminal.commit_after === commit}, clean_inputs=${!terminal.tracked_status_after}, process=${campaignProcessState(result)}, exit=${result.exitCode}, capture_complete=${result.output_capture?.complete === true}, group_closed=${result.processCustody?.processGroupTerminationObserved === true}.`,
      );
    const reportArgs = contourStageReportArguments(
      selectedLane,
      capturedOutput(),
      frozen ? path.resolve(values['coverage-run']!) : undefined,
    );
    const snapshot = values.snapshot ?? path.join(output, 'CONTOUR-STATUS.json');
    await runContourProgressWithNative(
      [
        '--output',
        output,
        '--commit',
        commit,
        ...(values.snapshot || existsSync(snapshot) ? ['--snapshot', snapshot] : []),
        ...reportArgs,
      ],
      packageRoot,
    );
    published = true;
    record('publication', {
      schema: 'VidaContourStagePublication/v1',
      source_commit: commit,
      reports: reportArgs,
      snapshot: path.join(output, 'CONTOUR-STATUS.json'),
    });
    process.stdout.write(JSON.stringify(diagnostic({ publication: 'published', reports: reportArgs })) + '\n');
  } catch (error) {
    let projectionFailure: { error: unknown } | undefined;
    try {
      const detail = diagnostic({
        publication: published ? 'published-receipt-failed' : 'unknown-or-partial',
        error: String(error),
      });
      record('publication-error', {
        schema: 'VidaContourStagePublicationError/v1',
        run_id: path.basename(directory),
        error: String(error),
        status: published ? 'published-receipt-failed' : 'unknown-or-partial',
        source_commit: commit,
        diagnostic: detail,
      });
      process.stdout.write(JSON.stringify(detail) + '\n');
      const snapshot = values.snapshot ?? path.join(output, 'CONTOUR-STATUS.json');
      try {
        await runContourProgressWithNative(
          [
            '--output',
            output,
            '--commit',
            commit,
            ...(values.snapshot || existsSync(snapshot) ? ['--snapshot', snapshot] : []),
            '--stage-outcome',
            path.join(directory, 'publication-error.json'),
          ],
          packageRoot,
        );
      } catch (projectionError) {
        projectionFailure = { error: projectionError };
      }
    } catch (receiptError) {
      return throwAfterCampaignReceiptFailure(error, receiptError, { source_commit: commit, boot });
    }
    if (projectionFailure)
      throw new AggregateError([error, projectionFailure.error], 'Stage failure and outcome projection failure', {
        cause: error,
      });
    throw error;
  }
  if (campaignProcessState(result) !== 'completed') process.exitCode = 1;
}

if (import.meta.main) await main();
