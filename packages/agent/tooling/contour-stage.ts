import { isDeepStrictEqual, parseArgs } from 'node:util';
import { createHash } from 'node:crypto';
import { qualityRuntimeEnvironment, readQualityRuntimeRoot } from './quality-runtime-root.ts';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isRecord } from '../src/contracts/forward-controller-values.ts';
import {
  campaignPartition,
  CampaignResourceError,
  campaignProcessState,
  campaignReportPublicationAdmitted as contourStagePublicationAdmitted,
  isolatedCommand,
  requireCampaignStorage,
  reportCampaignReceiptFailure,
} from './contour-campaign.ts';
import {
  checkContourProgressSnapshot,
  readContourArtifact,
  runContourProgressWithNative,
  writeContourOutput,
} from './contour-progress-cli.ts';
import { trustedQualityRoots } from './quality-image-mounts.ts';
import { executeMutationCommand } from './mutation-evidence.ts';
import { mutationPartitions } from './mutation-partitions.ts';
import { mutationToolInputs } from './mutation-evidence.ts';
import { retainQualityGitSnapshot } from './quality-git-snapshot.ts';
import {
  assertTrustedQualityExecutionImage,
  prepareQualityExecutionImage,
  readQualityExecutionImageDescriptor,
  readQualityExecutionImageInputs,
  verifyQualityExecutionImage,
  type QualityExecutionImage,
} from './quality-execution-image.ts';

type Lane = 'coverage' | 'frozen-crap' | 'crap-applicability' | 'mutation';

type ImageOptions = {
  'image-manifest'?: string | undefined;
  'image-sha256'?: string | undefined;
  'image-store'?: string | undefined;
};

function checkedStageImageOptions(values: ImageOptions): void {
  const reuse = values['image-manifest'] !== undefined;
  if (reuse !== (values['image-sha256'] !== undefined) || (reuse && values['image-store'] !== undefined))
    throw new Error('Image reuse requires both manifest and digest; image-store is formation-only.');
}

export function trustedStageImageStore(values: ImageOptions, repository: string): string {
  if (values['image-manifest'] !== undefined || values['image-sha256'] !== undefined)
    throw new Error('Trusted coverage requires a fresh image and cannot reuse a manifest.');
  const store = values['image-store'] ?? path.join(path.dirname(repository), '.vida-quality-inputs');
  if (
    !path.isAbsolute(store) ||
    path.resolve(store) !== store ||
    realpathSync(path.dirname(store)) !== path.dirname(store)
  )
    throw new Error('Trusted image store must have a canonical existing parent.');
  if (store === repository || store.startsWith(`${repository}${path.sep}`))
    throw new Error('Trusted image store must be outside Source.');
  mkdirSync(store, { recursive: true });
  if (realpathSync(store) !== store || !lstatSync(store).isDirectory())
    throw new Error('Trusted image store must be a real directory without aliases.');
  return mkdtempSync(path.join(store, 'trusted-'));
}

async function stageExecutionImage(
  packageRoot: string,
  repository: string,
  partition: ReturnType<typeof campaignPartition>,
  values: ImageOptions,
  trusted: boolean,
): Promise<{ image: QualityExecutionImage; capture: StageSelectionCapture }> {
  const manifest = values['image-manifest'];
  const digest = values['image-sha256'];
  checkedStageImageOptions(values);
  if (trusted && (manifest !== undefined || digest !== undefined))
    throw new Error('Trusted coverage requires a fresh image and cannot reuse a manifest.');
  requireCampaignStorage(
    values['image-store'] === undefined ? path.dirname(repository) : path.dirname(values['image-store']),
  );
  const image =
    manifest !== undefined && digest !== undefined
      ? await readQualityExecutionImageDescriptor(manifest, digest)
      : await (async () => {
          return prepareQualityExecutionImage({
            sourcePackageRoot: packageRoot,
            storeRoot: trusted
              ? trustedStageImageStore(values, repository)
              : (values['image-store'] ?? path.join(path.dirname(repository), '.vida-quality-inputs')),
            selection: {
              mode: 'focused-diagnostic',
              contour: partition.name,
              sources: partition.sources ?? [],
              tests: partition.tests ?? [],
            },
            ...(trusted ? { dependencyMode: 'linked' as const } : {}),
            additionalToolInputs: [
              ...mutationToolInputs,
              'tooling/contour-stage.ts',
              'tooling/quality-execution-image.ts',
            ],
            prepareSdkInputs: async ({ root, tests, selectedInputs }) => {
              const { ensureSdkCoverageInputsForTests } =
                await import('../../../tooling/agent/sdk-coverage-readiness.ts');
              await ensureSdkCoverageInputsForTests({ root, tests, selectedInputs });
            },
          });
        })();
  if (image.source_repository !== repository)
    throw new Error('Execution image belongs to a different Source repository.');
  const capture = await assertStageImageSelection(image, partition);
  return { image, capture };
}

type StageSelectionCapture = Pick<
  Awaited<ReturnType<typeof readQualityExecutionImageInputs>>,
  'test_selection' | 'source_fingerprint' | 'test_fingerprint' | 'tool_fingerprint' | 'sources'
>;

/** Validate the existing cache fixture's direct native refusal and copied Source. */
export function assertCacheRoutingReceipt(
  fixtureRoot: string,
  sourceSha256: string,
  executable: string,
): { pid: number } {
  if (
    !path.isAbsolute(fixtureRoot) ||
    path.resolve(fixtureRoot) !== fixtureRoot ||
    realpathSync(fixtureRoot) !== fixtureRoot ||
    !/^[0-9a-f]{64}$/u.test(sourceSha256)
  )
    throw new Error('Cache routing fixture identity is invalid.');
  const entries = readdirSync(fixtureRoot);
  if (entries.length > 10_000) throw new Error('Cache routing fixture exceeds its entry bound.');
  const invocations = entries.filter((entry) => /^invocations-[a-zA-Z0-9_-]+$/u.test(entry));
  if (invocations.length !== 1) throw new Error('Cache routing invocation root is missing or ambiguous.');
  const directory = path.join(fixtureRoot, invocations[0]!, 'invalid-direct-run');
  if (realpathSync(directory) !== directory) throw new Error('Cache routing invocation has an alias.');
  const readOwned = (file: string, limit = 1024 * 1024) => {
    const info = lstatSync(file);
    if (!info.isFile() || info.isSymbolicLink() || info.nlink !== 1 || realpathSync(file) !== file)
      throw new Error('Cache routing receipt or Source is not an exclusive regular file.');
    return readContourArtifact(file, limit);
  };
  const read = (name: string) => readOwned(path.join(directory, name));
  const launch: unknown = JSON.parse(read('launch.json').toString('utf8'));
  const terminal: unknown = JSON.parse(read('terminal.json').toString('utf8'));
  if (
    !isRecord(launch) ||
    Object.keys(launch).sort().join(',') !== 'args,cache_unset,cwd,executable,schema,timeout_ms' ||
    launch.schema !== 'PrivateBunCacheFixtureLaunch/v1' ||
    launch.executable !== executable ||
    typeof launch.cwd !== 'string' ||
    path.dirname(launch.cwd) !== fixtureRoot ||
    !/^real-copy-[a-zA-Z0-9_-]+$/u.test(path.basename(launch.cwd)) ||
    realpathSync(launch.cwd) !== launch.cwd ||
    launch.timeout_ms !== 30_000 ||
    launch.cache_unset !== true ||
    !isDeepStrictEqual(launch.args, [path.join(launch.cwd, 'vida-agent/bin/run.ts'), '--invalid-fixture-argument'])
  )
    throw new Error('Cache routing launch differs from the maintained direct invocation.');
  const source = path.join(launch.cwd, 'vida-agent/bin/run.ts');
  if (new Bun.CryptoHasher('sha256').update(readOwned(source, 4 * 1024 * 1024)).digest('hex') !== sourceSha256)
    throw new Error('Cache routing copied Source differs from the execution image.');
  if (
    !isRecord(terminal) ||
    Object.keys(terminal).sort().join(',') !== 'capture_complete,error,pid,schema,signal,status,unknown' ||
    terminal.schema !== 'PrivateBunCacheFixtureTerminal/v1' ||
    !Number.isSafeInteger(terminal.pid) ||
    Number(terminal.pid) < 1 ||
    terminal.status !== 1 ||
    terminal.signal !== null ||
    terminal.error !== null ||
    terminal.capture_complete !== true ||
    terminal.unknown !== false
  )
    throw new Error('Cache routing native terminal is missing or UNKNOWN.');
  const stdout = read('stdout.log');
  const stderr = read('stderr.log');
  if (stdout.length !== 0 || stderr.at(-1) !== 10) throw new Error('Cache routing output capture is incomplete.');
  const failure: unknown = JSON.parse(stderr.toString('utf8'));
  if (
    !isRecord(failure) ||
    failure.schema !== 'VidaAgentRunResult/v1' ||
    failure.status !== 'blocked' ||
    failure.code !== 'GAP-VIDA-RUN-CLI-001' ||
    typeof failure.message !== 'string'
  )
    throw new Error('Cache routing output differs from the expected refusal.');
  return { pid: Number(terminal.pid) };
}

export function priorCoverageRuns(packageRoot: string): Set<string> {
  const diagnostics = path.join(packageRoot, 'coverage/bun-unified/diagnostics');
  const runs = new Set<string>();
  for (const [directory, suffix] of [
    [diagnostics, '.focused-coverage.json'],
    [path.join(diagnostics, 'operation-outcomes'), '.json'],
  ] as const) {
    let entries: string[];
    try {
      if (realpathSync(directory) !== directory) throw new Error('Coverage diagnostic directory has an alias.');
      entries = readdirSync(directory);
    } catch (error) {
      if (isRecord(error) && error.code === 'ENOENT') continue;
      throw error;
    }
    if (entries.length > 10_000) throw new Error('Coverage diagnostic directory exceeds its entry bound.');
    for (const entry of entries) {
      if (entry.endsWith(suffix)) runs.add(entry.slice(0, -suffix.length));
    }
  }
  return runs;
}

/** Bind a reported focused run to this image and reject pre-existing run IDs. */
export function assertStageCoverageReport(
  file: string,
  packageRoot: string,
  capture: StageSelectionCapture,
  priorRuns: ReadonlySet<string>,
): void {
  const match = /^([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.focused-coverage\.json$/u.exec(
    path.basename(file),
  );
  if (!match || priorRuns.has(match[1]!)) throw new Error('Coverage report run identity is stale or invalid.');
  const runId = match[1]!;
  const diagnostics = path.join(packageRoot, 'coverage/bun-unified/diagnostics');
  const expectedReport = path.join(diagnostics, `${runId}.focused-coverage.json`);
  const expectedManifest = path.join(diagnostics, 'runs', runId, 'manifest.json');
  if (file !== expectedReport || realpathSync(file) !== expectedReport)
    throw new Error('Coverage report is outside its execution image.');
  const report: unknown = JSON.parse(readContourArtifact(file).toString('utf8'));
  if (
    !isRecord(report) ||
    report.schema !== 'VidaBunFocusedCoverageDiagnostic/v1' ||
    report.run_id !== runId ||
    report.manifest_path !== path.relative(packageRoot, expectedManifest).replaceAll('\\', '/') ||
    realpathSync(expectedManifest) !== expectedManifest ||
    typeof report.manifest_sha256 !== 'string' ||
    !/^[0-9a-f]{64}$/u.test(report.manifest_sha256)
  )
    throw new Error('Coverage report is outside its execution image.');
  const manifestBytes = readContourArtifact(expectedManifest);
  if (new Bun.CryptoHasher('sha256').update(manifestBytes).digest('hex') !== report.manifest_sha256)
    throw new Error('Coverage manifest bytes differ from the report.');
  const manifest: unknown = JSON.parse(manifestBytes.toString('utf8'));
  if (
    !isRecord(manifest) ||
    !['VidaBunCoverageRun/v2', 'VidaBunCoverageRun/v3'].includes(String(manifest.schema)) ||
    manifest.run_id !== runId ||
    !isDeepStrictEqual(report.test_selection, capture.test_selection) ||
    !isDeepStrictEqual(manifest.test_selection, capture.test_selection) ||
    !(['source_fingerprint', 'test_fingerprint', 'tool_fingerprint'] as const).every(
      (key) => report[key] === capture[key] && manifest[key] === capture[key],
    )
  )
    throw new Error('Coverage report or manifest differs from the captured selection.');
}

async function assertStageImageSelection(
  image: QualityExecutionImage,
  partition: ReturnType<typeof campaignPartition>,
): Promise<StageSelectionCapture> {
  const captured = await readQualityExecutionImageInputs(image);
  const selection = captured.test_selection;
  if (selection.mode !== 'focused-diagnostic') throw new Error('Stage image is not focused.');
  const same = (left: readonly string[], right: readonly string[]) =>
    JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
  if (
    selection.contour !== partition.name ||
    !same(selection.sources, partition.sources ?? []) ||
    !same(selection.tests, partition.tests ?? [])
  )
    throw new Error('Stage selection differs from its execution image.');
  return {
    test_selection: selection,
    source_fingerprint: captured.source_fingerprint,
    test_fingerprint: captured.test_fingerprint,
    tool_fingerprint: captured.tool_fingerprint,
    sources: captured.sources,
  };
}

/** This matches selection only; it proves no review, environment, isolation or coverage qualification. */
export function classifyTrustedCoverageSelectionCandidate(
  value: unknown,
): { kind: 'candidate'; qualified: false; binding: Record<string, string> } | { kind: 'refused'; qualified: false } {
  const refused = { kind: 'refused', qualified: false } as const;
  if (
    !isRecord(value) ||
    Object.keys(value).sort().join(',') !==
      'command,image_manifest_sha256,lane,selection,source_fingerprint,test_fingerprint,tool_fingerprint' ||
    value.lane !== 'coverage' ||
    !isRecord(value.selection)
  )
    return refused;
  const selection = value.selection;
  const declared = mutationPartitions().find((entry) => entry.name === 'bun-cli-run');
  if (!declared?.sources || !declared.tests) return refused;
  const same = (actual: unknown, expected: readonly string[]) =>
    Array.isArray(actual) &&
    actual.every((entry: unknown) => typeof entry === 'string') &&
    JSON.stringify([...actual].sort()) === JSON.stringify([...expected].sort());
  if (
    selection.mode !== 'focused-diagnostic' ||
    selection.contour !== declared.name ||
    Object.keys(selection).sort().join(',') !== 'contour,mode,sources,tests' ||
    !same(selection.sources, declared.sources) ||
    !same(selection.tests, declared.tests) ||
    !Array.isArray(value.command) ||
    value.command.length !== 3 ||
    value.command[0] !== 'tooling/contour-campaign.ts' ||
    value.command[1] !== '--coverage-child' ||
    value.command[2] !== declared.name
  )
    return refused;
  const keys = ['image_manifest_sha256', 'source_fingerprint', 'test_fingerprint', 'tool_fingerprint'] as const;
  const binding: Record<string, string> = {};
  for (const key of keys) {
    const digest = value[key];
    if (typeof digest !== 'string' || !/^[a-f0-9]{64}$/u.test(digest)) return refused;
    binding[key] = digest;
  }
  return { kind: 'candidate', qualified: false, binding };
}

export function trustedCoverageCommandMode(
  candidate: ReturnType<typeof classifyTrustedCoverageSelectionCandidate>,
  hasRuntimeRoot: boolean,
): 'trusted-coverage' | 'isolated' {
  return candidate.kind === 'candidate' && !hasRuntimeRoot ? 'trusted-coverage' : 'isolated';
}

export function assertTrustedFreshDirectories(directories: readonly string[]): void {
  for (const directory of directories)
    if (readdirSync(directory).length !== 0) throw new Error('Trusted writable directories must be fresh and empty.');
}

function trustedOwnedIdentities(
  image: QualityExecutionImage,
  stage: string,
  output: string,
  scratch: string,
): Record<string, string> {
  const stageRoots = trustedQualityRoots(image, stage);
  trustedQualityRoots(image, output);
  const relative = path.relative(stage, output);
  if (
    relative === '' ||
    (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`)) ||
    stage.startsWith(`${output}${path.sep}`)
  )
    throw new Error('Trusted stage and output roots overlap.');
  const roots = [
    stageRoots.stage,
    stageRoots.coverage,
    stageRoots.temporary,
    output,
    scratch,
    ...['home', 'cache', 'config', 'bun-install-cache'].map((name) => path.join(scratch, name)),
  ];
  const executable = realpathSync(process.execPath);
  const executableStat = lstatSync(executable);
  if (!executableStat.isFile()) throw new Error('Trusted Bun executable is not a regular file.');
  return {
    [executable]: `${executableStat.dev}:${executableStat.ino}`,
    ...Object.fromEntries(
      roots.map((root) => {
        const info = lstatSync(root);
        if (!info.isDirectory() || info.isSymbolicLink() || realpathSync(root) !== root)
          throw new Error('Trusted owned directory has an alias or changed type.');
        return [root, `${info.dev}:${info.ino}`];
      }),
    ),
  };
}

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
        /^VidaScopedCrapBudgetReport\/v[1234]$/u.test(String(value.schema)) &&
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

function canonicalStageOutputDirectory(output: string): string {
  if (!path.isAbsolute(output)) throw new Error('Canonical output must be absolute.');
  const canonical = realpathSync(output);
  if (!statSync(canonical).isDirectory()) throw new Error('Canonical output must be an existing directory.');
  return canonical;
}

export function contourStageOutput(repository: string, output: string): string {
  const canonical = canonicalStageOutputDirectory(output);
  const relative = path.relative(realpathSync(repository), canonical);
  if (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith('..' + path.sep))
    throw new Error('Canonical output must be outside the immutable measured checkout.');
  return canonical;
}

export { contourStagePublicationAdmitted };

export function contourStagePublicationFailure(
  result: Parameters<typeof campaignProcessState>[0],
  stderrFile: string,
  publicationError: unknown,
): unknown {
  const process = campaignProcessState(result);
  if (process === 'completed') return publicationError;
  return new Error(
    `Campaign process ${process} (exit_code=${JSON.stringify(result.exitCode)}, signal=${JSON.stringify(result.signal)}, timed_out=${JSON.stringify(result.timedOut)}, spawn_error=${JSON.stringify(result.spawnError)}); see ${stderrFile}. Publication error: ${String(publicationError)}`,
    { cause: publicationError },
  );
}

type StageRequest = { commit: string; boot: string; contour: string; lane: Lane; output: string; timeout_ms: number };

export async function retainContourStageResourceRefusal(
  error: unknown,
  directory: string,
  request: StageRequest,
  packageRoot: string,
  explicitSnapshot?: string,
): Promise<never> {
  if (!(error instanceof CampaignResourceError)) throw error;
  const file = path.join(directory, 'prelaunch-resource-refusal.json');
  const refusal = {
    schema: 'VidaContourStagePrelaunchResourceRefusal/v1',
    run_id: path.basename(directory),
    directory,
    source_commit: request.commit,
    boot: request.boot,
    contour: request.contour,
    lane: request.lane,
    phase: 'prelaunch',
    launched: false,
    status: 'resource-refused',
    error: String(error),
    resource_path: error.observedPath,
    available_bytes: error.availableBytes,
    minimum_free_bytes: String(2n * 1024n ** 3n),
  };
  try {
    writeFileSync(file, JSON.stringify(refusal, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    await writeContourOutput('stdout', JSON.stringify(refusal) + '\n');
  } catch (receiptError) {
    return reportCampaignReceiptFailure(error, receiptError, { source_commit: request.commit, boot: request.boot });
  }
  const snapshot = explicitSnapshot ?? path.join(request.output, 'CONTOUR-STATUS.json');
  try {
    await runContourProgressWithNative(
      [
        '--output',
        request.output,
        '--commit',
        request.commit,
        ...(explicitSnapshot || existsSync(snapshot) ? ['--snapshot', snapshot] : []),
        '--stage-outcome',
        file,
      ],
      packageRoot,
    );
  } catch (projectionError) {
    throw new AggregateError([error, projectionError], 'Resource refusal and outcome projection failure', {
      cause: error,
    });
  }
  throw error;
}

async function main(): Promise<void> {
  if (process.argv.length === 3 && process.argv[2] === '--help') {
    await writeContourOutput(
      'stdout',
      'Usage: bun tooling/contour-stage.ts --contour <name> --lane coverage|frozen-crap|crap-applicability|mutation --output <absolute canonical directory> [--image-store <absolute directory> | --image-manifest <absolute JSON> --image-sha256 <digest>] [--runtime-root-manifest <JSON> --runtime-root-sha256 <digest>] [--snapshot <JSON>] [--coverage-run <JSON> --budget-ref <commit>] [--isolated-workers [--workers 2|4]] [--diagnostic-mutant-ids <id[,id...]> | --diagnostic-batch-size <1..128>]\nForms a gitless execution image from clean Source, or reuses the exact manifest/digest across lanes without recapturing Source. Source may advance after formation. Input bytes stay read-only; coverage and .tmp are separate writable output namespaces. Retains terminal custody and publishes the exact report. Frozen lanes require coverage-run and budget-ref. Isolated workers default2, opt-in and mutation-only; diagnostics never publish a complete mutation score. Full launch data stays in launch.json.\n',
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
      'image-manifest': { type: 'string' },
      'image-sha256': { type: 'string' },
      'image-store': { type: 'string' },
      'runtime-root-manifest': { type: 'string' },
      'runtime-root-sha256': { type: 'string' },
    },
  });
  const { lane } = values;
  if (Boolean(values['runtime-root-manifest']) !== Boolean(values['runtime-root-sha256']))
    throw new Error('Runtime root requires an explicit manifest and digest together.');
  const runtimeRoot =
    values['runtime-root-manifest'] && values['runtime-root-sha256']
      ? await readQualityRuntimeRoot(values['runtime-root-manifest'], values['runtime-root-sha256'])
      : undefined;
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
  const canonicalOutput = canonicalStageOutputDirectory(values.output);
  const snapshots = new Set([path.join(canonicalOutput, 'CONTOUR-STATUS.json')]);
  if (values.snapshot) {
    const snapshot = path.resolve(values.snapshot);
    if (!existsSync(snapshot)) throw new Error('Missing explicit contour snapshot: ' + snapshot);
    snapshots.add(snapshot);
  }
  for (const snapshot of snapshots) if (existsSync(snapshot)) checkContourProgressSnapshot(snapshot);
  const trustedRequested = selectedLane === 'coverage' && partition.name === 'bun-cli-run' && runtimeRoot === undefined;
  const { image, capture } = await stageExecutionImage(packageRoot, repository, partition, values, trustedRequested);
  const output = contourStageOutput(image.repository, canonicalOutput);
  const commit = image.source_commit;
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
  const timeout = lane === 'mutation' ? 930_000 : lane === 'coverage' ? 330_000 : 60_000;
  const request = {
    commit,
    boot,
    contour: partition.name,
    lane: selectedLane,
    output,
    timeout_ms: timeout,
    execution_image: image,
  };
  const trustedCoverageCandidate = classifyTrustedCoverageSelectionCandidate({
    lane: selectedLane,
    selection: capture.test_selection,
    command: args,
    image_manifest_sha256: image.manifest_sha256,
    source_fingerprint: capture.source_fingerprint,
    test_fingerprint: capture.test_fingerprint,
    tool_fingerprint: capture.tool_fingerprint,
  });
  record('request', { ...request, args, trusted_coverage_selection_candidate: trustedCoverageCandidate });
  const commandMode = trustedCoverageCommandMode(trustedCoverageCandidate, runtimeRoot !== undefined);
  if (trustedRequested !== (commandMode === 'trusted-coverage'))
    throw new Error('Trusted coverage selection was not admitted.');
  if (trustedRequested) {
    if (values.output !== canonicalOutput) throw new Error('Trusted output must be a canonical path without aliases.');
    const roots = trustedQualityRoots(image, output);
    assertTrustedFreshDirectories([output, roots.coverage, roots.temporary]);
  }
  const frozenEnvironment = frozen ? retainQualityGitSnapshot(repository, directory, values['budget-ref']!) : {};
  let isolated: ReturnType<typeof isolatedCommand>;
  try {
    isolated = isolatedCommand(
      directory,
      args,
      {
        tini: process.env.VIDA_QUALITY_TINI ?? '/home/agent/.local/bin/tini',
        bwrap: 'bwrap',
      },
      process.env.VIDA_QUALITY_RETAINED_SCRATCH_ROOT,
      image,
      runtimeRoot,
      commandMode,
    );
  } catch (error) {
    return retainContourStageResourceRefusal(error, directory, request, packageRoot, values.snapshot);
  }
  const laneEnvironment = {
    ...isolated.environment,
    ...frozenEnvironment,
    ...(frozen ? { VIDA_BUN_COVERAGE_REPORT: path.resolve(values['coverage-run']!) } : {}),
  };
  const executionEnvironment =
    runtimeRoot || trustedRequested
      ? qualityRuntimeEnvironment(process.env, laneEnvironment)
      : { ...process.env, ...laneEnvironment };
  const ownedIdentities = trustedRequested
    ? trustedOwnedIdentities(image, directory, output, path.join(isolated.temporary, 'scratch'))
    : undefined;
  const priorRuns = selectedLane === 'coverage' ? priorCoverageRuns(image.packageRoot) : undefined;
  if (priorRuns) record('coverage-prior-runs', { run_ids: [...priorRuns].sort() });
  const launch = {
    ...request,
    ...isolated,
    trusted_coverage_selection_candidate: trustedCoverageCandidate,
    environment: laneEnvironment,
    ...(ownedIdentities ? { trusted_owned_identities: ownedIdentities } : {}),
    ...(runtimeRoot || trustedRequested
      ? { environment_policy: 'runtime-allowlist-v1', environment_keys: Object.keys(executionEnvironment).sort() }
      : {}),
  };
  record('launch', launch);
  await writeContourOutput(
    'stdout',
    JSON.stringify({
      schema: 'VidaContourStageLocation/v1',
      directory,
      commit,
      contour: partition.name,
      lane,
      timeout_ms: timeout,
    }) + '\n',
  );
  if (trustedRequested) await assertTrustedQualityExecutionImage(image, repository);
  const started = performance.now();
  const result = await executeMutationCommand(isolated.command, image.packageRoot, timeout, {
    ...(isolated.native_status_file === undefined ? {} : { nativeStatusFile: isolated.native_status_file }),
    ownedProcessGroup: true,
    outputByteLimit: 128 * 1024 * 1024,
    stdoutFile: path.join(directory, 'stdout.log'),
    stderrFile: path.join(directory, 'stderr.log'),
    env: executionEnvironment,
  });
  let imageFailure: { error: unknown } | undefined;
  try {
    if (trustedRequested) {
      await assertTrustedQualityExecutionImage(image, repository);
      if (
        !isDeepStrictEqual(
          ownedIdentities,
          trustedOwnedIdentities(image, directory, output, path.join(isolated.temporary, 'scratch')),
        )
      )
        throw new Error('Trusted owned directory identity changed.');
    } else await verifyQualityExecutionImage(image);
  } catch (error) {
    imageFailure = { error };
  }
  let runtimeFailure: { error: unknown } | undefined;
  if (runtimeRoot) {
    try {
      await readQualityRuntimeRoot(runtimeRoot.manifest_file, runtimeRoot.manifest_sha256);
    } catch (error) {
      runtimeFailure = { error };
    }
  }
  let namespaceFailure: { error: unknown } | undefined;
  let namespaceStatus:
    | { child_pid: number; pid_namespace: number; exit_code: number; file: string; bytes: number; sha256: string }
    | undefined;
  if (runtimeRoot) {
    try {
      const file = isolated.native_status_file;
      if (!file || result.native_status_file !== file || result.native_status_error !== null)
        throw new Error('Native namespace status channel is missing or failed.');
      const bytes = readContourArtifact(file, 4096);
      const lines = bytes.toString('utf8').trim().split('\n');
      if (lines.length !== 2) throw new Error('Native namespace termination receipt is incomplete.');
      const header: unknown = JSON.parse(lines[0]!);
      const footer: unknown = JSON.parse(lines[1]!);
      if (
        !isRecord(header) ||
        !isRecord(footer) ||
        typeof header['child-pid'] !== 'number' ||
        !Number.isInteger(header['child-pid']) ||
        header['child-pid'] <= 0 ||
        typeof header['pid-namespace'] !== 'number' ||
        !Number.isInteger(header['pid-namespace']) ||
        header['pid-namespace'] <= 0 ||
        typeof footer['exit-code'] !== 'number' ||
        !Number.isInteger(footer['exit-code']) ||
        footer['exit-code'] !== result.exitCode
      )
        throw new Error('Native namespace terminal identity differs from the observed producer.');
      namespaceStatus = {
        child_pid: header['child-pid'],
        pid_namespace: header['pid-namespace'],
        exit_code: footer['exit-code'],
        file,
        bytes: bytes.byteLength,
        sha256: createHash('sha256').update(bytes).digest('hex'),
      };
    } catch (error) {
      namespaceFailure = { error };
    }
  }
  const terminal = {
    ...launch,
    result,
    elapsed_ms: performance.now() - started,
    boot_after: readFileSync('/proc/sys/kernel/random/boot_id', 'utf8').trim(),
    image_inputs_unchanged: imageFailure === undefined,
    ...(imageFailure === undefined ? {} : { image_error: String(imageFailure.error) }),
    ...(runtimeRoot ? { runtime_inputs_unchanged: runtimeFailure === undefined } : {}),
    ...(runtimeFailure === undefined ? {} : { runtime_error: String(runtimeFailure.error) }),
    ...(runtimeRoot
      ? { namespace_termination_observed: namespaceFailure === undefined, native_namespace_status: namespaceStatus }
      : {}),
    ...(namespaceFailure === undefined ? {} : { namespace_error: String(namespaceFailure.error) }),
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
      schema: 'VidaContourStageOutcome/v2',
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
      source_commit: commit,
      execution_image: image,
      image_inputs_unchanged: terminal.image_inputs_unchanged,
      ...(runtimeRoot
        ? {
            runtime_root: isolated.runtime_root,
            runtime_inputs_unchanged: terminal.runtime_inputs_unchanged,
            namespace_termination_observed: terminal.namespace_termination_observed,
            native_namespace_status: terminal.native_namespace_status,
          }
        : {}),
      ...counters,
      ...detail,
    };
  };
  try {
    if (
      terminal.boot_after !== boot ||
      !terminal.image_inputs_unchanged ||
      runtimeFailure !== undefined ||
      namespaceFailure !== undefined ||
      !contourStagePublicationAdmitted(result, selectedLane)
    )
      throw new Error(
        `Stage publication denied: boot_unchanged=${terminal.boot_after === boot}, image_inputs_unchanged=${terminal.image_inputs_unchanged}, runtime_inputs_unchanged=${runtimeFailure === undefined}, process=${campaignProcessState(result)}, exit=${result.exitCode}, capture_complete=${result.output_capture?.complete === true}, group_closed=${result.processCustody?.processGroupTerminationObserved === true}.`,
      );
    const reportArgs = contourStageReportArguments(
      selectedLane,
      capturedOutput(),
      frozen ? path.resolve(values['coverage-run']!) : undefined,
    );
    let cacheRouting: Record<string, unknown> | undefined;
    if (selectedLane === 'coverage') {
      if (!priorRuns || reportArgs[0] !== '--coverage-run' || !reportArgs[1])
        throw new Error('Stage coverage run binding is missing.');
      assertStageCoverageReport(reportArgs[1], image.packageRoot, capture, priorRuns);
      const fixtureRoot = isolated.environment.VIDA_CACHE_ROUTING_FIXTURE_ROOT;
      if (fixtureRoot !== undefined) {
        const expectedRoot = path.join(isolated.temporary, 'scratch', 'cache-routing-fixture');
        const sources = capture.sources.filter((entry) => entry.path === 'bin/run.ts');
        if (fixtureRoot !== expectedRoot || sources.length !== 1 || !sources[0])
          throw new Error('Cache routing fixture does not match the current stage selection.');
        const observed = assertCacheRoutingReceipt(fixtureRoot, sources[0].sha256, process.execPath);
        cacheRouting = {
          run_id: path.basename(reportArgs[1], '.focused-coverage.json'),
          source_fingerprint: capture.source_fingerprint,
          source_sha256: sources[0].sha256,
          image_manifest_sha256: image.manifest_sha256,
          fixture_root: fixtureRoot,
          pid: observed.pid,
        };
      }
    }
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
      image.packageRoot,
      {
        onPublished: () => {
          published = true;
        },
      },
    );
    record('publication', {
      schema: 'VidaContourStagePublication/v1',
      source_commit: commit,
      reports: reportArgs,
      snapshot: path.join(output, 'CONTOUR-STATUS.json'),
      ...(cacheRouting ? { cache_routing: cacheRouting } : {}),
    });
    await writeContourOutput(
      'stdout',
      JSON.stringify(diagnostic({ publication: 'published', reports: reportArgs })) + '\n',
    );
  } catch (error) {
    let primaryError = error;
    let projectionFailure: { error: unknown } | undefined;
    try {
      primaryError = contourStagePublicationFailure(result, path.join(directory, 'stderr.log'), error);
      const detail = diagnostic({
        publication: published ? 'published-receipt-failed' : 'unknown-or-partial',
        error: String(primaryError),
      });
      record('publication-error', {
        schema: 'VidaContourStagePublicationError/v1',
        run_id: path.basename(directory),
        error: String(primaryError),
        status: published ? 'published-receipt-failed' : 'unknown-or-partial',
        source_commit: commit,
        diagnostic: detail,
      });
      await writeContourOutput('stdout', JSON.stringify(detail) + '\n');
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
      return reportCampaignReceiptFailure(primaryError, receiptError, { source_commit: commit, boot });
    }
    if (projectionFailure)
      throw new AggregateError(
        [primaryError, projectionFailure.error],
        'Stage failure and outcome projection failure',
        {
          cause: primaryError,
        },
      );
    throw primaryError;
  }
  if (campaignProcessState(result) !== 'completed') process.exitCode = 1;
}

if (import.meta.main) await main();
