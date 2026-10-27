import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, statSync, statfsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isRecord } from '../src/contracts/forward-controller-values.ts';
import {
  contourAttemptMaximum,
  contourCoverageSatisfied,
  mergeContourProgress,
  selectContourCampaign,
} from './contour-progress.ts';
import { readContourArtifact, runContourProgressWithNative } from './contour-progress-cli.ts';
import { fsSafeApplicabilityReview, latestScopedCrapBudgetRef } from './crap-gate.ts';
import { executeMutationCommand, mutationToolInputs, type MutationProcessResult } from './mutation-evidence.ts';
import { mutationLimits } from './mutation-limits.ts';
import { mutationPartitionSources, mutationPartitions, type MutationPartition } from './mutation-partitions.ts';
import { qualityImageMountArguments } from './quality-image-mounts.ts';
import type { QualityRuntimeRoot } from './quality-runtime-root.ts';
import { retainQualityGitSnapshot } from './quality-git-snapshot.ts';
import {
  prepareQualityExecutionImage,
  qualitySourceStatusAdmitted,
  verifyQualityExecutionImage,
  type QualityExecutionImage,
} from './quality-execution-image.ts';

type Lane = 'coverage' | 'frozen-crap' | 'mutation';
export function campaignReportArguments(reports: readonly { file: string; lane: Lane }[]): string[] {
  return reports.flatMap(({ file, lane }) => [lane === 'coverage' ? '--coverage-run' : '--report', file]);
}
export type CampaignOutcome = {
  state: 'completed' | 'failed' | 'timeout' | 'gap' | 'resource' | 'unknown';
  detail: string;
  report?: string;
};
type Step = { contour: string; lane: Lane; outcome: CampaignOutcome };
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repositoryRoot = path.resolve(packageRoot, '../..');
const statusDirectory = path.join(repositoryRoot, '.agent/work/core-runtime-reactivation');
const maximumOutputBytes = 128 * 1024 * 1024;
const minimumScratchFreeBytes = 2n * 1024n ** 3n;

export function campaignStorageAdmitted(availableBytes: bigint): boolean {
  return availableBytes >= minimumScratchFreeBytes;
}

export class CampaignResourceError extends Error {
  constructor(
    readonly observedPath: string,
    readonly availableBytes: string | null,
  ) {
    super(
      availableBytes === null
        ? `Campaign could not observe free storage at ${observedPath}.`
        : `Campaign requires at least 2 GiB free at ${observedPath}; observed ${availableBytes} bytes.`,
    );
    this.name = 'CampaignResourceError';
  }
}

export function requireCampaignStorage(directory: string): void {
  let availableBytes: bigint;
  try {
    const info = statfsSync(directory, { bigint: true });
    availableBytes = info.bavail * info.bsize;
  } catch {
    throw new CampaignResourceError(directory, null);
  }
  if (!campaignStorageAdmitted(availableBytes)) throw new CampaignResourceError(directory, String(availableBytes));
}

function isCampaignResourceFailure(error: unknown): boolean {
  return (
    error instanceof CampaignResourceError || (isRecord(error) && (error.code === 'ENOSPC' || error.code === 'EDQUOT'))
  );
}

export function campaignScratchDirectory(runId: string, stage: string): string {
  return path.join(path.dirname(repositoryRoot), '.vida-quality-inputs', 'campaign-scratch', runId, stage);
}

export function throwAfterCampaignReceiptFailure(
  primaryError: unknown,
  receiptError: unknown,
  context: { source_commit: string; boot?: string },
  writeDiagnostic: (line: string) => void = (line) => {
    process.stderr.write(line);
  },
): never {
  const resourceFailure = isCampaignResourceFailure(primaryError) || isCampaignResourceFailure(receiptError);
  const diagnostic = {
    schema: 'VidaContourCampaignOutcome/v1',
    status: resourceFailure ? 'resource-incomplete' : 'incomplete',
    ...context,
    error: String(primaryError),
    receipt_error: String(receiptError),
  };
  try {
    writeDiagnostic(JSON.stringify(diagnostic) + '\n');
  } catch (diagnosticError) {
    throw new AggregateError(
      [primaryError, receiptError, diagnosticError],
      'Campaign failure and receipt failure could not be fully reported.',
    );
  }
  throw new AggregateError(
    [primaryError, receiptError],
    'Campaign failure receipt could not be retained; see inherited stderr diagnostic.',
  );
}

function recordCampaignFailure(directory: string, commit: string, boot: string, error: unknown): never {
  try {
    writeRecord(directory, 'interrupted.json', {
      status: isCampaignResourceFailure(error) ? 'resource-incomplete' : 'incomplete',
      error: String(error),
      source_commit: commit,
      boot,
    });
  } catch (receiptError) {
    return throwAfterCampaignReceiptFailure(error, receiptError, { source_commit: commit, boot });
  }
  throw error;
}

export function campaignOptions(args: readonly string[]): {
  mode: 'all' | 'unclosed';
  plan: boolean;
  coverageOnly: boolean;
} {
  const selection = args.filter((arg) => arg === '--all' || arg === '--unclosed');
  if (
    selection.length !== 1 ||
    args.some((arg) => !['--all', '--unclosed', '--plan', '--coverage-only'].includes(arg)) ||
    new Set(args).size !== args.length
  )
    throw new Error('Usage: bun run test:contours --all|--unclosed [--coverage-only] [--plan]');
  return {
    mode: selection[0] === '--all' ? 'all' : 'unclosed',
    plan: args.includes('--plan'),
    coverageOnly: args.includes('--coverage-only'),
  };
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
  coverageOnly = false,
): Promise<{ complete: boolean; steps: Step[] }> {
  const steps: Step[] = [];
  const completeCoverage = new Set<string>();
  // Finish the inexpensive diagnostic pass before spending mutation budgets.
  const phases = coverageOnly ? ([['coverage']] as const) : ([['coverage', 'frozen-crap'], ['mutation']] as const);
  for (const lanes of phases) {
    for (const partition of partitions) {
      for (const lane of lanes) {
        const outcome: CampaignOutcome =
          lane === 'frozen-crap' && !completeCoverage.has(partition.name)
            ? {
                state: 'gap',
                detail: 'Same-campaign coverage did not complete at exact maximum; no CRAP producer launched.',
              }
            : await execute(partition, lane);
        if (lane === 'coverage' && outcome.state === 'completed') completeCoverage.add(partition.name);
        const step = { contour: partition.name, lane, outcome };
        record(step);
        steps.push(step);
        if (outcome.state === 'unknown' || outcome.state === 'resource') return { complete: false, steps };
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

/** Only coverage may preserve a failed producer's separately paired operation outcome. */
export function campaignReportPublicationAdmitted(
  result: MutationProcessResult,
  lane: Lane | 'crap-applicability',
): boolean {
  return (
    result.processCustody?.terminationObserved === true &&
    result.processCustody.processGroupTerminationObserved === true &&
    result.output_capture?.complete === true &&
    !result.output_capture.stdout.truncated &&
    !result.output_capture.stderr.truncated &&
    (lane === 'coverage' || campaignProcessState(result) === 'completed')
  );
}

function jsonFile(file: string): unknown {
  const bytes = readContourArtifact(file, maximumOutputBytes);
  return JSON.parse(bytes.toString('utf8')) as unknown;
}

function git(args: string[]): string {
  return execFileSync('git', ['--no-optional-locks', ...args], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    timeout: 5000,
    maxBuffer: 4 * 1024 * 1024,
  }).trim();
}

function assertCleanCommit(commit: string): void {
  if (git(['rev-parse', 'HEAD']) !== commit || !qualitySourceStatusAdmitted(git(['status', '--porcelain'])))
    throw new Error('Campaign requires one unchanged clean Source commit; commit fixes after all producers terminate.');
}

function writeRecord(directory: string, file: string, record: unknown): void {
  writeFileSync(path.join(directory, file), JSON.stringify(record, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
}

async function campaignImage(
  partition: MutationPartition,
  prepareSdkInputs: (input: {
    root: string;
    tests: readonly string[];
    selectedInputs: ReadonlyMap<string, Buffer>;
  }) => Promise<void>,
): Promise<QualityExecutionImage> {
  return prepareQualityExecutionImage({
    sourcePackageRoot: packageRoot,
    storeRoot: path.join(path.dirname(repositoryRoot), '.vida-quality-inputs'),
    selection: {
      mode: 'focused-diagnostic',
      contour: partition.name,
      sources: partition.sources ?? [],
      tests: partition.tests ?? [],
    },
    additionalToolInputs: [
      ...mutationToolInputs,
      'tooling/contour-campaign.ts',
      'tooling/contour-stage.ts',
      'tooling/quality-execution-image.ts',
    ],
    prepareSdkInputs,
  });
}

function campaignNativeReport(stdout: string): string {
  const locations: string[] = [];
  for (const line of stdout.split('\n')) {
    if (!line.startsWith('{')) continue;
    const value: unknown = JSON.parse(line);
    if (!isRecord(value) || value.schema !== 'CandidateNativeMutationReportLocation/v1') continue;
    if (
      typeof value.directory !== 'string' ||
      !path.isAbsolute(value.directory) ||
      value.report !== 'native-partition-report.json'
    )
      throw new Error('Invalid native mutation report location.');
    locations.push(path.join(value.directory, value.report));
  }
  if (locations.length !== 1) throw new Error('Expected exactly one native mutation report location.');
  return locations[0]!;
}

export function isolatedCommand(
  directory: string,
  args: string[],
  tools: { tini: string; bwrap: string },
  retainedScratchRoot?: string,
  image?: QualityExecutionImage,
  runtimeRoot?: QualityRuntimeRoot,
) {
  if (runtimeRoot) {
    if (!image || runtimeRoot.dependency_root !== image.dependency_root)
      throw new Error('Independent runtime root requires its exact image dependency boundary.');
    const overlaps = (left: string, right: string) =>
      left === right || left.startsWith(`${right}${path.sep}`) || right.startsWith(`${left}${path.sep}`);
    for (const writable of [
      directory,
      path.join(image.packageRoot, 'coverage'),
      path.join(image.packageRoot, '.tmp'),
    ]) {
      if (overlaps(runtimeRoot.root, writable) || overlaps(runtimeRoot.manifest_file, writable))
        throw new Error('Runtime inputs overlap writable output.');
    }
    for (const file of runtimeRoot.files) {
      if (
        [image.repository, image.source_repository, image.manifest_file, directory].some((root) =>
          overlaps(file.target, root),
        )
      )
        throw new Error('Runtime file target overlaps image or output mounts.');
    }
  }
  requireCampaignStorage(directory);
  let scratchParent = directory;
  if (retainedScratchRoot !== undefined) {
    if (!path.isAbsolute(retainedScratchRoot)) throw new Error('Retained scratch root must be an absolute directory.');
    let canonicalRoot: string;
    try {
      canonicalRoot = realpathSync(retainedScratchRoot);
      if (!statSync(canonicalRoot).isDirectory()) throw new Error('Retained scratch root is not a directory.');
    } catch {
      throw new Error('Retained scratch root must be an existing directory.');
    }
    const canonicalPackageRoot = realpathSync(packageRoot);
    const relativeToPackage = path.relative(canonicalPackageRoot, canonicalRoot);
    const insidePackage =
      relativeToPackage === '' ||
      (!path.isAbsolute(relativeToPackage) &&
        relativeToPackage !== '..' &&
        !relativeToPackage.startsWith('..' + path.sep));
    if (insidePackage) throw new Error('Retained scratch root must resolve outside packages/agent.');
    const protectedRoots = [
      repositoryRoot,
      ...(image ? [image.source_repository, image.repository, image.dependency_root] : []),
      ...(runtimeRoot ? [runtimeRoot.root] : []),
    ];
    const scratchParentIdentity = statSync(canonicalRoot);
    for (const input of protectedRoots) {
      const canonicalInput = realpathSync(input);
      const relative = path.relative(canonicalInput, canonicalRoot);
      const identity = statSync(canonicalInput);
      if (
        relative === '' ||
        (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith('..' + path.sep)) ||
        (identity.dev === scratchParentIdentity.dev && identity.ino === scratchParentIdentity.ino)
      )
        throw new Error('Retained scratch root overlaps an input directory.');
    }
    scratchParent = canonicalRoot;
  }
  const temporary = mkdtempSync(path.join(scratchParent, 'scratch-'));
  const info = statfsSync(temporary, { bigint: true });
  if (!campaignStorageAdmitted(info.bavail * info.bsize))
    throw new CampaignResourceError(temporary, String(info.bavail * info.bsize));
  const scratch = path.join(temporary, 'scratch');
  mkdirSync(scratch);
  mkdirSync(path.join(scratch, 'bun-install-cache'));
  if (runtimeRoot) {
    if (
      runtimeRoot.root === scratch ||
      runtimeRoot.root.startsWith(`${scratch}${path.sep}`) ||
      scratch.startsWith(`${runtimeRoot.root}${path.sep}`)
    )
      throw new Error('Runtime inputs overlap scratch.');
    for (const name of ['home', 'cache', 'config']) mkdirSync(path.join(scratch, name));
  }
  return {
    temporary,
    ...(runtimeRoot
      ? {
          native_status_file: `${directory}.namespace-status.jsonl`,
          runtime_root: {
            root: runtimeRoot.root,
            manifest_file: runtimeRoot.manifest_file,
            manifest_sha256: runtimeRoot.manifest_sha256,
            dependency_root: runtimeRoot.dependency_root,
          },
        }
      : {}),
    environment: {
      TMPDIR: '/tmp',
      BUN_TMPDIR: '/tmp',
      BUN_INSTALL_CACHE_DIR: '/tmp/bun-install-cache',
      ...(runtimeRoot ? { HOME: '/tmp/home', XDG_CACHE_HOME: '/tmp/cache', XDG_CONFIG_HOME: '/tmp/config' } : {}),
      ...(image
        ? { VIDA_QUALITY_IMAGE_MANIFEST: image.manifest_file, VIDA_QUALITY_IMAGE_SHA256: image.manifest_sha256 }
        : {}),
    },
    scratch_storage: {
      filesystem_type: String(info.type),
      available_bytes: String(info.bavail * info.bsize),
      minimum_free_bytes: String(2n * 1024n ** 3n),
    },
    command: [
      tools.tini,
      '-s',
      '--',
      tools.bwrap,
      '--die-with-parent',
      '--unshare-pid',
      '--as-pid-1',
      ...(runtimeRoot
        ? [
            '--json-status-fd',
            '3',
            '--unshare-user',
            '--unshare-net',
            '--unshare-ipc',
            '--unshare-uts',
            '--new-session',
            '--cap-drop',
            'ALL',
            '--tmpfs',
            '/',
            ...runtimeRoot.files.flatMap((file) => ['--ro-bind', file.source, file.target]),
          ]
        : ['--ro-bind', '/', '/']),
      '--proc',
      '/proc',
      '--dev',
      '/dev',
      '--bind',
      scratch,
      '/tmp',
      ...(image
        ? qualityImageMountArguments(image, directory)
        : ['--bind', repositoryRoot, repositoryRoot, '--bind', directory, directory]),
      ...(runtimeRoot && image ? ['--ro-bind', image.manifest_file, image.manifest_file, '--remount-ro', '/'] : []),
      '--chdir',
      image?.packageRoot ?? packageRoot,
      tools.tini,
      '--',
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
      'Usage: bun run test:contours --all|--unclosed [--coverage-only] [--plan]\nRuns coverage, frozen CRAP and mutation for declared executable contours.\n--all: every active contour; --unclosed: no compatible same-commit local triple.\n--coverage-only: run only the coverage phase; --plan: print selection without launching tests. Linux requires bwrap and tini (or VIDA_QUALITY_TINI).\n',
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
  const phase = options.coverageOnly ? 'coverage-only' : 'all';
  const selected = selectContourCampaign(snapshot, options.mode, commit, phase);
  const lineage = options.coverageOnly
    ? undefined
    : jsonFile(path.join(statusDirectory, 'crap-budgets.reviewed-partial.v1.json'));
  const partitions = selected.map((row) => {
    const partition = campaignPartition(row);
    return {
      ...partition,
      budget_ref: options.coverageOnly
        ? undefined
        : latestScopedCrapBudgetRef(partition.name, partition.sources!, lineage),
    };
  });
  let sdkInputsReady: Promise<void> | undefined;
  const prepareCampaignSdkInputs = (input: {
    root: string;
    tests: readonly string[];
    selectedInputs: ReadonlyMap<string, Buffer>;
  }): Promise<void> => {
    sdkInputsReady ??= (async () => {
      const { ensureSdkCoverageInputsForTests } = await import('../../../tooling/agent/sdk-coverage-readiness.ts');
      await ensureSdkCoverageInputsForTests({
        root: input.root,
        tests: [...new Set(partitions.flatMap((partition) => partition.tests ?? []))],
        selectedInputs: input.selectedInputs,
      });
    })();
    return sdkInputsReady;
  };
  const plan = {
    schema: 'VidaContourCampaignPlan/v1',
    run_id: randomUUID(),
    source_commit: commit,
    ...options,
    selection_policy: options.coverageOnly
      ? options.mode === 'all'
        ? 'all executable contours for coverage-only; no global freshness claim'
        : 'executable contours without accepted, bound exact same-commit numeric coverage; data-only N/A stays separate; no global freshness claim'
      : 'all executable contours, or those without a compatible same-commit local triple; no global freshness claim',
    partitions,
    coverage_deadline_ms: 330_000,
    ...(options.coverageOnly ? {} : { mutation_deadline_ms: mutationLimits.partitionMs + 30_000 }),
  };
  if (options.plan) {
    process.stdout.write(JSON.stringify(plan, null, 2) + '\n');
    return;
  }
  try {
    requireCampaignStorage(repositoryRoot);
  } catch (error) {
    process.stdout.write(
      JSON.stringify({
        schema: 'VidaContourCampaignOutcome/v1',
        status: 'resource-incomplete',
        source_commit: commit,
        detail: String(error),
        producers_launched: false,
      }) + '\n',
    );
    process.exitCode = 1;
    return;
  }
  const directory = path.join(packageRoot, 'coverage/contour-campaigns', plan.run_id);
  try {
    mkdirSync(directory, { recursive: true });
    writeRecord(directory, 'plan.json', plan);
  } catch (error) {
    const status = isCampaignResourceFailure(error) ? 'resource-incomplete' : 'incomplete';
    try {
      process.stderr.write(
        JSON.stringify({
          schema: 'VidaContourCampaignOutcome/v1',
          status,
          source_commit: commit,
          detail: String(error),
          producers_launched: false,
        }) + '\n',
      );
    } catch (diagnosticError) {
      throw new AggregateError([error, diagnosticError], 'Campaign setup and inherited stderr reporting failed.');
    }
    process.exitCode = 1;
    return;
  }
  process.stdout.write(
    JSON.stringify({ campaign: directory, contours: partitions.length, source_commit: commit }) + '\n',
  );
  const tools = { tini: process.env.VIDA_QUALITY_TINI ?? Bun.which('tini'), bwrap: Bun.which('bwrap') };
  if (!tools.tini || !tools.bwrap) {
    const setupError = new Error('Campaign isolation prerequisites are missing.');
    try {
      writeRecord(directory, 'terminal.json', {
        status: 'setup-failed',
        detail:
          'Linux bwrap and tini are required; VIDA_QUALITY_TINI may name an installed tini binary. No producers launched.',
      });
    } catch (receiptError) {
      return throwAfterCampaignReceiptFailure(setupError, receiptError, { source_commit: commit });
    }
    throw setupError;
  }
  const isolationTools = { tini: tools.tini, bwrap: tools.bwrap };
  const boot = readFileSync('/proc/sys/kernel/random/boot_id', 'utf8').trim();
  const coverageReports = new Map<string, string>();
  const images = new Map<string, QualityExecutionImage>();
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
        const privateScratchDirectory = campaignScratchDirectory(plan.run_id, stage);
        try {
          requireCampaignStorage(repositoryRoot);
          mkdirSync(privateScratchDirectory, { recursive: true });
          mkdirSync(stageDirectory);
        } catch (error) {
          return isCampaignResourceFailure(error)
            ? { state: 'resource', detail: String(error) }
            : { state: 'failed', detail: `Stage setup failed before producer launch: ${String(error)}` };
        }
        const applicabilityNA =
          lane === 'frozen-crap' &&
          partition.name === fsSafeApplicabilityReview.contour &&
          budget === fsSafeApplicabilityReview.commit;
        let image = images.get(partition.name);
        try {
          if (!image) {
            image = await campaignImage(partition, prepareCampaignSdkInputs);
            if (image.source_repository !== repositoryRoot || image.source_commit !== commit)
              throw new Error('Execution image does not bind the campaign Source commit.');
            images.set(partition.name, image);
          }
        } catch (error) {
          return {
            state: 'failed',
            detail: `Execution image formation failed before producer launch: ${String(error)}`,
          };
        }
        const args =
          lane === 'coverage'
            ? ['tooling/contour-campaign.ts', '--coverage-child', partition.name]
            : lane === 'mutation'
              ? [
                  'tooling/mutation-batch-pilot.ts',
                  '--contour',
                  partition.name,
                  '--batch-size',
                  '128',
                  '--max-batches',
                  '128',
                  '--admit-complete',
                ]
              : [
                  'tooling/crap-gate.ts',
                  '--contour',
                  partition.name,
                  '--budget-ref',
                  budget!,
                  ...(applicabilityNA ? ['--applicability-na'] : []),
                ];
        let isolated: ReturnType<typeof isolatedCommand>;
        try {
          isolated = isolatedCommand(
            privateScratchDirectory,
            args,
            isolationTools,
            process.env.VIDA_QUALITY_RETAINED_SCRATCH_ROOT,
            image,
          );
        } catch (error) {
          return isCampaignResourceFailure(error)
            ? { state: 'resource', detail: String(error) }
            : { state: 'failed', detail: `Scratch setup failed before producer launch: ${String(error)}` };
        }
        const timeoutMs =
          lane === 'mutation' ? mutationLimits.partitionMs + 30_000 : lane === 'coverage' ? 330_000 : 60_000;
        const frozenEnvironment =
          lane === 'frozen-crap' ? retainQualityGitSnapshot(repositoryRoot, privateScratchDirectory, budget!) : {};
        const laneEnvironment = {
          ...isolated.environment,
          ...frozenEnvironment,
          ...(lane === 'frozen-crap' && coverage ? { VIDA_BUN_COVERAGE_REPORT: coverage } : {}),
        };
        writeRecord(stageDirectory, 'launch.json', {
          source_commit: commit,
          boot,
          partition,
          lane,
          timeout_ms: timeoutMs,
          execution_image: image,
          ...isolated,
          environment: laneEnvironment,
        });
        const started = performance.now();
        const child = await executeMutationCommand(isolated.command, image.packageRoot, timeoutMs, {
          ownedProcessGroup: true,
          outputByteLimit: maximumOutputBytes,
          stdoutFile: path.join(stageDirectory, 'stdout.log'),
          stderrFile: path.join(stageDirectory, 'stderr.log'),
          env: {
            ...process.env,
            ...laneEnvironment,
          },
        });
        const bootAfter = readFileSync('/proc/sys/kernel/random/boot_id', 'utf8').trim();
        const state = bootAfter === boot ? campaignProcessState(child) : 'unknown';
        let imageFailure: { error: unknown } | undefined;
        try {
          await verifyQualityExecutionImage(image);
        } catch (error) {
          imageFailure = { error };
        }
        writeRecord(stageDirectory, 'execution.json', {
          result: child,
          elapsed_ms: performance.now() - started,
          boot,
          boot_after: bootAfter,
          execution_image: image,
          image_inputs_unchanged: imageFailure === undefined,
          ...(imageFailure === undefined ? {} : { image_error: String(imageFailure.error) }),
        });
        assertCleanCommit(commit);
        if (imageFailure !== undefined)
          return {
            state: 'unknown',
            detail: `Execution image verification failed: ${String(imageFailure.error)}; ${stageDirectory}`,
          };
        if (state === 'unknown' || state === 'timeout') return { state, detail: stageDirectory };
        if (!campaignReportPublicationAdmitted(child, applicabilityNA ? 'crap-applicability' : lane))
          return { state: state === 'completed' ? 'gap' : state, detail: stageDirectory };
        let report: string | undefined;
        try {
          if (lane === 'mutation') {
            report = campaignNativeReport(
              readContourArtifact(path.join(stageDirectory, 'stdout.log'), maximumOutputBytes).toString('utf8'),
            );
          } else {
            const lines = readContourArtifact(path.join(stageDirectory, 'stdout.log'), maximumOutputBytes)
              .toString('utf8')
              .trim()
              .split('\n');
            for (const line of lines) {
              if (!line.startsWith('{')) continue;
              const value: unknown = JSON.parse(line);
              if (
                isRecord(value) &&
                typeof value.report === 'string' &&
                (lane === 'coverage'
                  ? value.schema === 'VidaBunFocusedCoverageDiagnosticLocation/v1'
                  : applicabilityNA
                    ? value.schema === 'VidaScopedCrapApplicabilityNA/v1' && value.status === 'reviewed-not-applicable'
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
          const reportArgs = [
            '--output',
            statusDirectory,
            '--snapshot',
            snapshotPath,
            '--commit',
            commit,
            ...(lane === 'mutation'
              ? ['--native-report', report]
              : lane === 'coverage'
                ? ['--coverage-run', report]
                : ['--coverage-run', coverage!, '--report', report]),
          ];
          await runContourProgressWithNative(reportArgs, image.packageRoot);
          const projected = mergeContourProgress(jsonFile(snapshotPath), []);
          const attempts = projected.attempts.filter(
            (row) => row.contour === partition.name && row.artifact === report && row.commit === commit,
          );
          const stageSatisfied = attempts.some(
            (row) =>
              row.contour === partition.name &&
              (applicabilityNA
                ? row.lane === 'crap-applicability' && row.accepted
                : row.lane === (lane === 'mutation' ? 'native-mutation' : lane) &&
                  (lane === 'coverage' ? contourCoverageSatisfied(row) : contourAttemptMaximum(row))),
          );
          if (state === 'completed' && !stageSatisfied) return { state: 'failed', detail: stageDirectory, report };
          return { state, detail: stageDirectory, report };
        } catch (error) {
          return { state: 'gap', detail: `Report proof rejected: ${String(error)}; ${stageDirectory}`, report };
        }
      },
      (step) => {
        writeRecord(directory, `${step.contour}.${step.lane}.json`, step);
        process.stdout.write(JSON.stringify(step) + '\n');
      },
      options.coverageOnly,
    );
    assertCleanCommit(commit);
    const currentProgress = mergeContourProgress(jsonFile(snapshotPath), []);
    const remaining = selectContourCampaign(currentProgress, 'unclosed', commit, phase)
      .filter((partition) => partitions.some((selected) => selected.name === partition.name))
      .map((partition) => partition.name);
    writeRecord(directory, 'terminal.json', {
      schema: 'VidaContourCampaignOutcome/v1',
      source_commit: commit,
      boot,
      status: result.steps.some((step) => step.outcome.state === 'resource')
        ? 'resource-incomplete'
        : result.complete
          ? 'execution-complete'
          : 'unknown-fenced',
      qualification: 'individual producer proofs only; execution-complete does not mean gates passed',
      ...(options.coverageOnly
        ? { selected_contours_without_complete_coverage: remaining }
        : { selected_contours_without_complete_triple: remaining }),
      ...result,
    });
    // This is an execution command; a successful exit requires all lane owners to finish without a gap.
    if (!result.complete || remaining.length || result.steps.some((step) => step.outcome.state !== 'completed'))
      process.exitCode = 1;
  } catch (error) {
    return recordCampaignFailure(directory, commit, boot, error);
  }
}

if (import.meta.main) await main();
