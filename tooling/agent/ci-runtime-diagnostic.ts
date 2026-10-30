import { lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { releaseDigest, releasePath, releaseSourceBinding } from '../../packages/agent/bin/local-release-artifacts.ts';
import { executionBudget, pinnedEnvironment, readPin } from '../../packages/agent/bin/bun.ts';
import {
  executeMutationCommand,
  junitOutcome,
  type MutationJUnitCase,
  type MutationProcessResult,
} from '../../packages/agent/tooling/mutation-evidence.ts';
import { ensureSdkCoverageInputsForTests } from './sdk-coverage-readiness.ts';
import { validateCIDeliveryRequest } from './release-ci-evidence.ts';

const testFile = 'tests/run-entrypoint.test.ts';
const caseName = 'binds admission to the released journal and released maintenance proof';
const requireDiagnostic: (value: unknown, message: string) => asserts value = (value, message) => {
  if (!value) throw new Error('CI runtime diagnostic: ' + message);
};

function exclusive(root: string, relative: string, value: unknown): void {
  writeFileSync(releasePath(root, relative, true), JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
}

function profileInventory(root: string): { path: string; bytes: number; sha256: string }[] {
  const files: { path: string; bytes: number; sha256: string }[] = [];
  let total = 0;
  const children = readdirSync(root).sort();
  requireDiagnostic(children.length > 0 && children.length <= 64, 'profile child inventory is empty or oversized');
  for (const child of children) {
    requireDiagnostic(/^child-\d{2}$/u.test(child), 'unexpected profile child');
    const directory = releasePath(root, child);
    requireDiagnostic(lstatSync(directory).isDirectory(), 'profile child is not a directory');
    const names = readdirSync(directory);
    requireDiagnostic(names.length === 1, 'profile child must contain one profile');
    const name = names[0]!;
    requireDiagnostic(name.endsWith('.cpuprofile'), 'CPU profile is missing');
    const relative = child + '/' + name;
    const file = releasePath(root, relative);
    const stat = lstatSync(file);
    requireDiagnostic(
      stat.isFile() && stat.nlink === 1 && stat.size > 0 && stat.size <= 64 * 1024 * 1024,
      'unsafe or oversized CPU profile',
    );
    total += stat.size;
    requireDiagnostic(total <= 128 * 1024 * 1024, 'aggregate CPU profile bound exceeded');
    const bytes = readFileSync(file);
    requireDiagnostic(bytes.length === stat.size, 'CPU profile changed during read');
    files.push({ path: relative, bytes: bytes.length, sha256: releaseDigest(bytes) });
  }
  return files;
}

async function runDiagnostic(): Promise<void> {
  requireDiagnostic(process.platform === 'linux' && process.arch === 'x64', 'native Linux x64 required');
  const env = process.env;
  requireDiagnostic(
    env.GITHUB_ACTIONS === 'true' &&
      env.GITHUB_JOB === 'diagnose-public-cli-runtime' &&
      env.CI_DIAGNOSE_RUNTIME === 'true' &&
      env.CI_PUBLICATION === 'false' &&
      env.VIDA_NATIVE_CI_ENABLED === 'true',
    'explicit diagnostic-only CI context required',
  );
  requireDiagnostic(
    env.GITHUB_REPOSITORY === 'pomazanbohdan/vida-stack-lite' && env.GITHUB_REPOSITORY_ID === '1340911900',
    'repository differs',
  );
  requireDiagnostic(
    !env.BUN_OPTIONS &&
      !Object.keys(env).some((key) => key.startsWith('AGENT_RUNTIME_') || key.startsWith('BUN_CPU_PROFILE')),
    'ambient runtime or profiler configuration denied',
  );
  requireDiagnostic(
    typeof env.CI_SOURCE_COMMIT === 'string' &&
      /^[a-f0-9]{40}$/u.test(env.CI_SOURCE_COMMIT) &&
      env.CI_SOURCE_COMMIT === env.GITHUB_SHA,
    'selected Source commit differs',
  );
  requireDiagnostic(
    typeof env.GITHUB_RUN_ID === 'string' &&
      /^[1-9]\d*$/u.test(env.GITHUB_RUN_ID) &&
      typeof env.GITHUB_RUN_ATTEMPT === 'string' &&
      /^[1-9]\d*$/u.test(env.GITHUB_RUN_ATTEMPT),
    'run identity unavailable',
  );
  requireDiagnostic(
    typeof env.CI_REQUEST === 'string' && env.CI_REQUEST === env.CI_REQUEST_LINUX,
    'Linux request differs',
  );
  const request: unknown = JSON.parse(env.CI_REQUEST);
  validateCIDeliveryRequest(request);
  requireDiagnostic(request.target === 'bun-linux-x64', 'Linux request required');
  requireDiagnostic(
    typeof env.GITHUB_WORKSPACE === 'string' && typeof env.VIDA_CI_SOURCE_ROOT === 'string',
    'Source paths unavailable',
  );
  const checkout = realpathSync(env.GITHUB_WORKSPACE);
  const source = realpathSync(env.VIDA_CI_SOURCE_ROOT);
  const moduleRoot = realpathSync(fileURLToPath(new URL('../../', import.meta.url)));
  requireDiagnostic(source === moduleRoot && source !== checkout, 'diagnostic must execute the isolated Source mirror');
  const packageRoot = path.join(source, 'packages/agent');
  requireDiagnostic(process.versions.bun === readPin(packageRoot), 'package-selected Bun required');
  const assertSource = (): void => {
    requireDiagnostic(
      releaseSourceBinding(checkout).source_binding === request.source_binding &&
        releaseSourceBinding(source).source_binding === request.source_binding,
      'Source binding changed',
    );
  };
  assertSource();
  for (const relative of ['.tmp', '.tmp/release-runtime-diagnostic']) {
    const directory = releasePath(packageRoot, relative, true);
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    requireDiagnostic(
      lstatSync(releasePath(packageRoot, relative)).isDirectory(),
      'diagnostic parent is not a directory',
    );
  }
  const root = releasePath(
    packageRoot,
    '.tmp/release-runtime-diagnostic/' + env.GITHUB_RUN_ID + '-' + env.GITHUB_RUN_ATTEMPT,
    true,
  );
  mkdirSync(root, { mode: 0o700 });
  const binding = {
    run_id: env.GITHUB_RUN_ID,
    run_attempt: env.GITHUB_RUN_ATTEMPT,
    source_commit: env.CI_SOURCE_COMMIT,
    request_id: request.request_id,
    operation_id: request.operation_id,
    version: request.version,
    target: request.target,
    source_binding: request.source_binding,
  };
  exclusive(root, 'intent.json', { schema: 'VidaCIRuntimeDiagnosticIntent/v1', ...binding, status: 'issued' });
  const budget = executionBudget(300_000, 30_000);
  const startedAt = new Date().toISOString();
  let execution: MutationProcessResult | undefined;
  try {
    const profiles = path.join(root, 'profiles');
    mkdirSync(profiles, { mode: 0o700 });
    await ensureSdkCoverageInputsForTests({
      root: packageRoot,
      tests: [testFile],
      remainingMs: () => budget.remaining(),
    });
    assertSource();
    const junit = path.join(root, 'target.junit.xml');
    execution = await executeMutationCommand(
      [
        process.execPath,
        '--no-env-file',
        '--no-install',
        'test',
        testFile,
        '--test-name-pattern',
        caseName,
        '--reporter=junit',
        '--reporter-outfile=' + junit,
      ],
      packageRoot,
      budget.remaining(),
      {
        ownedProcessGroup: true,
        stdoutFile: path.join(root, 'stdout.log'),
        stderrFile: path.join(root, 'stderr.log'),
        outputByteLimit: 8 * 1024 * 1024,
        env: pinnedEnvironment(
          process.execPath,
          {
            ...env,
            AGENT_RUNTIME_MUTATION_PART: 'bun',
            VIDA_PUBLIC_CLI_CPU_PROFILE_DIR: profiles,
            VIDA_INITIAL_SOURCE_RUN_TIMING_FILE: path.join(root, 'phase-timing.ndjson'),
          },
          packageRoot,
        ),
      },
    );
    exclusive(root, 'execution.json', execution);
    requireDiagnostic(
      execution.exitCode === 0 &&
        execution.signal === null &&
        execution.spawnError === null &&
        !execution.timedOut &&
        execution.processCustody?.terminationObserved === true &&
        execution.processCustody.processGroupTerminationObserved === true &&
        execution.output_capture?.complete === true &&
        !execution.output_capture.stdout.truncated &&
        !execution.output_capture.stderr.truncated,
      'test failed or terminal custody/capture is incomplete',
    );
    assertSource();
    const junitFile = releasePath(root, 'target.junit.xml');
    const junitStat = lstatSync(junitFile);
    requireDiagnostic(
      junitStat.isFile() && junitStat.size > 0 && junitStat.size <= 1024 * 1024,
      'JUnit is missing or oversized',
    );
    const bytes = readFileSync(junitFile);
    const cases: MutationJUnitCase[] = [];
    const outcome = junitOutcome(bytes.toString('utf8'), [testFile], [], [], (entry) => cases.push(entry));
    requireDiagnostic(
      outcome.tests === 1 &&
        outcome.failures === 0 &&
        outcome.errors === 0 &&
        outcome.skipped === 0 &&
        cases.length === 1 &&
        cases[0]?.outcome === 'passed' &&
        cases[0].name === caseName,
      'exact single passing diagnostic case required',
    );
    const inventory = profileInventory(profiles);
    assertSource();
    exclusive(root, 'result.json', {
      schema: 'VidaCIRuntimeDiagnosticResult/v1',
      ...binding,
      status: 'observed',
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      execution,
      profiles: inventory,
      junit: { sha256: releaseDigest(bytes), bytes: bytes.length, ...outcome },
      diagnostic_only: true,
      profiling_overhead: 'unmeasured',
      direct_cli_children_only: true,
      quality_qualified: false,
      native_delivery_proof: false,
      runtime_accepted: false,
    });
  } catch (error) {
    exclusive(root, 'result.json', {
      schema: 'VidaCIRuntimeDiagnosticResult/v1',
      ...binding,
      status: 'failed-or-unknown',
      started_at: startedAt,
      observed_at: new Date().toISOString(),
      execution,
      error: error instanceof Error ? error.message : String(error),
      retained: true,
      automatic_retry: false,
      diagnostic_only: true,
      quality_qualified: false,
      native_delivery_proof: false,
      runtime_accepted: false,
    });
    throw error;
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    requireDiagnostic(process.argv.length === 2, 'arguments are unsupported');
    await runDiagnostic();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
