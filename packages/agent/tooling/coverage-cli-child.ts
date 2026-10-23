import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { closeSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { SpawnSyncReturns } from 'node:child_process';
import { openRootFileSync, readFileDescriptorBoundedSync } from '@openclaw/fs-safe/advanced';
import { sha256 } from './bun-coverage-evidence.ts';
import { completeOwnedCleanup } from './owned-cleanup-completion.ts';
import { cliCommandContracts } from '../bin/cli-command-contracts.ts';

type Digest = { path: string; sha256: string };
export type CliCoverageManifest = {
  schema: string;
  run_id: string;
  sources: readonly Digest[];
  tests: readonly string[];
  test_selection: { mode: string; contour?: string; sources?: readonly string[]; tests: readonly string[] };
  source_fingerprint: string;
  test_fingerprint: string;
  tool_fingerprint: string;
  runtime_executable_sha256: string;
  module_inputs: readonly Digest[];
  tool_inputs: readonly Digest[];
};
export type CliCoverageContext = {
  root: string;
  snapshot: string;
  directory: string;
  manifest: CliCoverageManifest;
  manifest_sha256: string;
};
type Reference = { path: string; sha256: string };
type Output = Reference & { bytes: number };
type CliChildObservation = {
  id: string;
  parent_pid: number;
  pid: number;
  exit_code: number | null;
  signal: string | null;
  error_observed: boolean;
  complete: boolean;
  launch: Reference;
  receipt: Reference;
  terminal: Reference;
  stdout: Output;
  stderr: Output;
};
export type CliChildLaunch = {
  schema: 'VidaBunCoverageCliLaunch/v1';
  id: string;
  run_id: string;
  parent_pid: number;
  executable: string;
  runtime_executable_sha256: string;
  entry: Digest;
  preload: Digest;
  original_argv: string[];
  effective_argv: string[];
  original_encoding: 'utf8';
  capture_encoding: 'buffer';
  cwd: string;
  environment_sha256: string;
  manifest_sha256: string;
};

const source = 'bin/development-controller.ts';
const test = 'tests/development-controller.test.ts';
const publicSources = ['bin/repair-work-state.ts', 'bin/scope.ts', 'bin/vida-agent.ts'];
const publicTests = [
  'tests/scope-help-parity.test.ts',
  'tests/scoped-source-snapshot.test.ts',
  'tests/run-entrypoint.test.ts',
  'tests/automatic-work-absorption.test.ts',
  'tests/admitted-runtime-canonical-intake.test.ts',
];
const preload = 'tooling/bun-coverage-preload.ts';
const launchEnvironment = 'VIDA_BUN_COVERAGE_CLI_LAUNCH';
const maxProofBytes = 4 * 1024 * 1024;
const idPattern = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/u;
const filePattern =
  /^cli\/[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}\/(?:launch\.json|receipt\.json|terminal\.json|stdout\.log|stderr\.log)$/u;

export function cliCoverageEnvironmentSha256(environment: NodeJS.ProcessEnv): string {
  return sha256(
    JSON.stringify(
      Object.entries(environment)
        .filter((entry) => typeof entry[1] === 'string')
        .sort(([left], [right]) => left.localeCompare(right)),
    ),
  );
}

export function focusedControllerCliCoverage(manifest: CliCoverageManifest): boolean {
  return (
    manifest.schema === 'VidaBunCoverageRun/v2' &&
    manifest.test_selection.mode === 'focused-diagnostic' &&
    manifest.test_selection.contour === 'bun-development-controller' &&
    manifest.test_selection.sources?.length === 1 &&
    manifest.test_selection.sources[0] === source &&
    manifest.test_selection.tests.length === 1 &&
    manifest.test_selection.tests[0] === test &&
    manifest.sources.length === 1 &&
    manifest.sources[0]?.path === source &&
    manifest.tests.length === 1 &&
    manifest.tests[0] === test
  );
}

function samePaths(actual: readonly string[] | undefined, expected: readonly string[]): boolean {
  return (
    actual !== undefined &&
    actual.length === expected.length &&
    JSON.stringify([...actual].sort()) === JSON.stringify([...expected].sort())
  );
}

function cliSubject(manifest: CliCoverageManifest) {
  if (focusedControllerCliCoverage(manifest)) return { source, argument: 'inspect', exit_code: 1 };
  if (
    manifest.schema === 'VidaBunCoverageRun/v2' &&
    manifest.test_selection.mode === 'focused-diagnostic' &&
    manifest.test_selection.contour === 'bun-cli-public-entrypoints' &&
    samePaths(
      manifest.sources.map((row) => row.path),
      publicSources,
    ) &&
    samePaths(manifest.test_selection.sources, publicSources) &&
    samePaths(manifest.tests, publicTests) &&
    samePaths(manifest.test_selection.tests, publicTests)
  )
    return { source: 'bin/vida-agent.ts', argument: '--help', exit_code: 0 };
  return undefined;
}

type CliSubject = { source: string; argument?: string; exit_code: number };

function cliSubjects(manifest: CliCoverageManifest): CliSubject[] {
  const subject = cliSubject(manifest);
  if (!subject) return [];
  return subject.source === source
    ? [subject]
    : [subject, { source: 'bin/scope.ts', exit_code: 1 }, { source: 'bin/repair-work-state.ts', exit_code: 1 }];
}

function launchSubject(context: CliCoverageContext, entry: unknown): CliSubject {
  const selected = cliSubjects(context.manifest).find((subject) => subject.source === proofRecord(entry).path);
  assert.ok(selected, 'Foreign focused CLI subject.');
  return selected;
}

export function focusedCliCoverage(manifest: CliCoverageManifest): boolean {
  return cliSubject(manifest) !== undefined;
}

function proofRecord(value: unknown): Record<string, unknown> {
  assert.ok(
    typeof value === 'object' && value !== null && !Array.isArray(value),
    'CLI coverage proof must be an object.',
  );
  return value as Record<string, unknown>;
}

function nativeArgv(
  context: CliCoverageContext,
  subject: CliSubject | undefined = cliSubject(context.manifest),
): string[] {
  assert.ok(subject, 'CLI coverage requires an exact supported selection.');
  return [
    '--no-env-file',
    '--no-install',
    '--config=' + path.join(context.root, 'bunfig.toml'),
    path.join(context.root, subject.source),
    ...(subject.argument === undefined ? [] : [subject.argument]),
  ];
}

function proofPath(
  id: string,
  file: 'launch.json' | 'receipt.json' | 'terminal.json' | 'stdout.log' | 'stderr.log',
): string {
  assert.match(id, idPattern, 'CLI launch ID is invalid.');
  return `cli/${id}/${file}`;
}

function proofBytes(directory: string, relative: string): Buffer {
  assert.match(relative, filePattern, 'CLI proof path is not canonical.');
  const opened = openRootFileSync({
    rootPath: directory,
    absolutePath: path.join(directory, relative),
    boundaryLabel: 'CLI coverage proof',
    maxBytes: maxProofBytes,
    rejectHardlinks: true,
    rejectSymlinks: true,
    allowedType: 'file',
  });
  assert.ok(opened.ok, 'CLI proof is not a bounded regular owned file.');
  let failure: { error: unknown } | undefined;
  try {
    return readFileDescriptorBoundedSync(opened.fd, maxProofBytes);
  } catch (error) {
    failure = { error };
    throw error;
  } finally {
    completeOwnedCleanup(
      [
        () => {
          closeSync(opened.fd);
        },
      ],
      failure,
    );
  }
}

function writeProof(context: CliCoverageContext, relative: string, bytes: Buffer): Reference {
  assert.ok(bytes.length <= maxProofBytes, 'CLI proof exceeds its byte limit.');
  assert.match(relative, filePattern);
  writeFileSync(path.join(context.directory, relative), bytes, { flag: 'wx', mode: 0o600 });
  return { path: relative, sha256: sha256(bytes) };
}

function jsonBytes(value: unknown): Buffer {
  return Buffer.from(JSON.stringify(value) + '\n');
}

function checkedLaunch(context: CliCoverageContext, value: unknown): CliChildLaunch {
  assert.ok(focusedCliCoverage(context.manifest), 'CLI counters require an exact supported focused selection.');
  const row = proofRecord(value);
  assert.equal(row.schema, 'VidaBunCoverageCliLaunch/v1');
  assert.equal(typeof row.id, 'string');
  assert.match(String(row.id), idPattern);
  assert.ok(Number.isSafeInteger(row.parent_pid) && Number(row.parent_pid) > 0);
  assert.equal(row.run_id, context.manifest.run_id);
  assert.equal(row.executable, process.execPath);
  assert.equal(row.runtime_executable_sha256, context.manifest.runtime_executable_sha256);
  assert.equal(row.manifest_sha256, context.manifest_sha256);
  const subject = launchSubject(context, row.entry);
  assert.deepEqual(
    row.entry,
    context.manifest.sources.find((entry) => entry.path === subject.source),
  );
  const expectedPreload = context.manifest.tool_inputs.find((item) => item.path === preload);
  assert.ok(expectedPreload, 'CLI preload is absent from captured tools.');
  assert.deepEqual(row.preload, expectedPreload);
  const args = nativeArgv(context, subject);
  assert.deepEqual(row.original_argv, args);
  assert.deepEqual(row.effective_argv, ['--preload', path.join(context.snapshot, preload), ...args]);
  assert.equal(row.original_encoding, 'utf8');
  assert.equal(row.capture_encoding, 'buffer');
  assert.equal(row.cwd, context.root);
  assert.equal(typeof row.environment_sha256, 'string');
  assert.match(String(row.environment_sha256), /^[a-f0-9]{64}$/u);
  return row as CliChildLaunch;
}

export function readCliCoverageLaunch(context: CliCoverageContext): CliChildLaunch | undefined {
  const file = process.env[launchEnvironment];
  if (file === undefined) return undefined;
  const relative = path.relative(context.directory, file).replaceAll(path.sep, '/');
  const launch = checkedLaunch(context, JSON.parse(proofBytes(context.directory, relative).toString('utf8')));
  assert.equal(relative, proofPath(launch.id, 'launch.json'));
  assert.equal(launch.parent_pid, process.ppid);
  const subject = launchSubject(context, launch.entry);
  assert.deepEqual(process.argv, [
    launch.executable,
    path.join(context.root, launch.entry.path),
    ...(subject.argument === undefined ? [] : [subject.argument]),
  ]);
  assert.deepEqual(process.execArgv, launch.effective_argv.slice(0, subject.argument === undefined ? -1 : -2));
  assert.equal(process.cwd(), launch.cwd);
  assert.equal((process.env.BUN_OPTIONS ?? '').trim(), '');
  assert.equal(cliCoverageEnvironmentSha256(process.env), launch.environment_sha256);
  return launch;
}

export function writeCliCoverageReceipt(
  context: CliCoverageContext,
  launch: CliChildLaunch,
  captured: { loaded_inputs: Digest[]; external_module_inputs: unknown[]; coverage: Record<string, unknown> },
  exitCode: number,
): void {
  assert.deepEqual(
    Object.keys(captured.coverage),
    [path.join(context.root, launch.entry.path)],
    'CLI entry was not instrumented.',
  );
  writeProof(
    context,
    proofPath(launch.id, 'receipt.json'),
    jsonBytes({
      schema: 'VidaBunCoverageCliChild/v1',
      id: launch.id,
      run_id: context.manifest.run_id,
      pid: process.pid,
      parent_pid: process.ppid,
      exit_code: exitCode,
      argv: process.argv,
      exec_argv: process.execArgv,
      runtime_executable_sha256: context.manifest.runtime_executable_sha256,
      source_fingerprint: context.manifest.source_fingerprint,
      test_fingerprint: context.manifest.test_fingerprint,
      tool_fingerprint: context.manifest.tool_fingerprint,
      module_inputs: context.manifest.module_inputs,
      manifest_sha256: context.manifest_sha256,
      environment_sha256: launch.environment_sha256,
      ...captured,
    }),
  );
}

export function createCliCoverageObserver(
  context: CliCoverageContext,
  actual: Pick<typeof import('node:child_process'), 'spawnSync'>,
) {
  const subjects = cliSubjects(context.manifest);
  assert.ok(subjects.length > 0);
  const original = actual.spawnSync;
  const observations: CliChildObservation[] = [];
  const launches = new Set<string>();
  function spawnSync(...call: unknown[]): SpawnSyncReturns<string | Buffer> {
    const [command, args, settings] = call;
    const subject = subjects.find(
      (candidate) =>
        command === process.execPath &&
        Array.isArray(args) &&
        (candidate.source === source
          ? args.includes(path.join(context.root, source))
          : JSON.stringify(args) === JSON.stringify(nativeArgv(context, candidate))),
    );
    if (!subject) return Reflect.apply(original, actual, call) as SpawnSyncReturns<string | Buffer>;
    assert.ok(!launches.has(subject.source), 'Duplicate focused CLI launch.');
    launches.add(subject.source);
    assert.deepEqual(args, nativeArgv(context, subject));
    const options = proofRecord(settings);
    assert.deepEqual(
      options,
      { encoding: 'utf8', windowsHide: true, timeout: 4000 },
      'CLI observation requires the unchanged bounded native invocation.',
    );
    const id = randomUUID();
    mkdirSync(path.join(context.directory, 'cli', id), { recursive: true, mode: 0o700 });
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      [launchEnvironment]: path.join(context.directory, proofPath(id, 'launch.json')),
    };
    assert.equal((env.BUN_OPTIONS ?? '').trim(), '');
    const tool = context.manifest.tool_inputs.find((item) => item.path === preload);
    assert.ok(tool);
    const launch: CliChildLaunch = {
      schema: 'VidaBunCoverageCliLaunch/v1',
      id,
      run_id: context.manifest.run_id,
      parent_pid: process.pid,
      executable: process.execPath,
      runtime_executable_sha256: context.manifest.runtime_executable_sha256,
      entry: context.manifest.sources.find((entry) => entry.path === subject.source)!,
      preload: tool,
      original_argv: nativeArgv(context, subject),
      effective_argv: ['--preload', path.join(context.snapshot, preload), ...nativeArgv(context, subject)],
      original_encoding: 'utf8',
      capture_encoding: 'buffer',
      cwd: process.cwd(),
      environment_sha256: cliCoverageEnvironmentSha256(env),
      manifest_sha256: context.manifest_sha256,
    };
    checkedLaunch(context, launch);
    const launchReference = writeProof(context, proofPath(id, 'launch.json'), jsonBytes(launch));
    let result: SpawnSyncReturns<string | Buffer>;
    try {
      result = Reflect.apply(original, actual, [
        command,
        launch.effective_argv,
        { ...options, encoding: launch.capture_encoding, env },
      ]) as SpawnSyncReturns<string | Buffer>;
    } catch (error) {
      writeProof(
        context,
        proofPath(id, 'terminal.json'),
        jsonBytes({
          schema: 'VidaBunCoverageCliTerminal/v1',
          id,
          parent_pid: process.pid,
          pid: null,
          exit_code: null,
          signal: null,
          error_observed: true,
          complete: false,
          error: String(error),
          capture_available: false,
        }),
      );
      throw error;
    }
    const captureAvailable = Buffer.isBuffer(result.stdout) && Buffer.isBuffer(result.stderr);
    const stdout = Buffer.from(result.stdout ?? '');
    const stderr = Buffer.from(result.stderr ?? '');
    const output = (file: 'stdout.log' | 'stderr.log', bytes: Buffer): Output => ({
      ...writeProof(context, proofPath(id, file), bytes),
      bytes: bytes.length,
    });
    const stdoutReference = output('stdout.log', stdout);
    const stderrReference = output('stderr.log', stderr);
    const terminal = {
      schema: 'VidaBunCoverageCliTerminal/v1',
      id,
      parent_pid: process.pid,
      pid: result.pid,
      exit_code: result.status,
      signal: result.signal,
      error_observed: result.error !== undefined,
      complete:
        captureAvailable && result.error === undefined && result.signal === null && result.status === subject.exit_code,
      capture_available: captureAvailable,
      error: result.error?.message ?? null,
      stdout: stdoutReference,
      stderr: stderrReference,
    };
    const terminalReference = writeProof(context, proofPath(id, 'terminal.json'), jsonBytes(terminal));
    const receiptPath = proofPath(id, 'receipt.json');
    observations.push({
      id,
      parent_pid: process.pid,
      pid: result.pid,
      exit_code: result.status,
      signal: result.signal,
      error_observed: result.error !== undefined,
      complete: terminal.complete,
      launch: launchReference,
      receipt: { path: receiptPath, sha256: sha256(proofBytes(context.directory, receiptPath)) },
      terminal: terminalReference,
      stdout: stdoutReference,
      stderr: stderrReference,
    });
    return {
      ...result,
      stdout: Buffer.isBuffer(result.stdout) ? result.stdout.toString('utf8') : result.stdout,
      stderr: Buffer.isBuffer(result.stderr) ? result.stderr.toString('utf8') : result.stderr,
      output: result.output.map((value) => (Buffer.isBuffer(value) ? value.toString('utf8') : value)),
    };
  }
  return {
    spawnSync,
    finish: () => {
      assert.equal(launches.size, subjects.length, 'Focused CLI launches were not all observed.');
      assert.equal(observations.length, subjects.length, 'Focused CLI observation is incomplete.');
      return observations;
    },
  };
}

function referencedBytes(context: CliCoverageContext, value: unknown, relative: string): Buffer {
  const reference = proofRecord(value);
  assert.equal(reference.path, relative);
  const bytes = proofBytes(context.directory, relative);
  assert.equal(reference.sha256, sha256(bytes), 'CLI proof bytes differ from the parent observation.');
  return bytes;
}

export function cliCoverageChildMaps(
  context: CliCoverageContext,
  raw: unknown,
  parentPid: number,
  parentSuiteExitCode: number,
  validateLoaded: (rows: unknown[]) => Set<string>,
): Record<string, unknown>[] {
  const subjects = cliSubjects(context.manifest);
  if (subjects.length === 0) {
    assert.equal(raw, undefined, 'Unselected coverage cannot carry CLI child counters.');
    return [];
  }
  assert.equal(parentSuiteExitCode, 0, 'CLI counters require a passing parent suite.');
  assert.ok(Array.isArray(raw) && raw.length === subjects.length, 'Focused CLI proof must be unique and complete.');
  const admittedSources = new Set<string>();
  const admittedIds = new Set<string>();
  return raw.map((value: unknown) => {
    const observation = proofRecord(value);
    assert.equal(typeof observation.id, 'string');
    const id = String(observation.id);
    assert.ok(!admittedIds.has(id), 'Duplicate focused CLI proof.');
    admittedIds.add(id);
    const launch = checkedLaunch(
      context,
      JSON.parse(referencedBytes(context, observation.launch, proofPath(id, 'launch.json')).toString('utf8')),
    );
    const subject = launchSubject(context, launch.entry);
    assert.ok(!admittedSources.has(subject.source), 'Duplicate focused CLI subject.');
    admittedSources.add(subject.source);
    assert.equal(observation.parent_pid, parentPid);
    assert.ok(Number.isSafeInteger(observation.pid) && Number(observation.pid) > 0 && observation.pid !== parentPid);
    assert.equal(observation.exit_code, subject.exit_code);
    assert.equal(observation.signal, null);
    assert.equal(observation.error_observed, false);
    assert.equal(observation.complete, true);
    const terminal = proofRecord(
      JSON.parse(referencedBytes(context, observation.terminal, proofPath(id, 'terminal.json')).toString('utf8')),
    );
    assert.equal(terminal.schema, 'VidaBunCoverageCliTerminal/v1');
    for (const key of [
      'id',
      'parent_pid',
      'pid',
      'exit_code',
      'signal',
      'error_observed',
      'complete',
      'stdout',
      'stderr',
    ])
      assert.deepEqual(terminal[key], observation[key], 'CLI terminal and parent receipt differ.');
    assert.equal(terminal.error, null);
    assert.equal(terminal.capture_available, true);
    assert.equal(launch.id, id);
    assert.equal(launch.parent_pid, parentPid);
    const receipt = proofRecord(
      JSON.parse(referencedBytes(context, observation.receipt, proofPath(id, 'receipt.json')).toString('utf8')),
    );
    assert.equal(receipt.schema, 'VidaBunCoverageCliChild/v1');
    assert.equal(receipt.id, id);
    assert.equal(receipt.run_id, context.manifest.run_id);
    assert.equal(receipt.pid, observation.pid);
    assert.equal(receipt.parent_pid, parentPid);
    assert.equal(receipt.exit_code, observation.exit_code);
    assert.equal(receipt.manifest_sha256, context.manifest_sha256);
    assert.equal(receipt.runtime_executable_sha256, context.manifest.runtime_executable_sha256);
    assert.equal(receipt.source_fingerprint, context.manifest.source_fingerprint);
    assert.equal(receipt.test_fingerprint, context.manifest.test_fingerprint);
    assert.equal(receipt.tool_fingerprint, context.manifest.tool_fingerprint);
    assert.deepEqual(receipt.module_inputs, context.manifest.module_inputs);
    assert.equal(receipt.environment_sha256, launch.environment_sha256);
    assert.deepEqual(receipt.argv, [
      launch.executable,
      path.join(context.root, subject.source),
      ...(subject.argument === undefined ? [] : [subject.argument]),
    ]);
    assert.deepEqual(receipt.exec_argv, launch.effective_argv.slice(0, subject.argument === undefined ? -1 : -2));
    const stdout = referencedBytes(context, observation.stdout, proofPath(id, 'stdout.log'));
    const stderr = referencedBytes(context, observation.stderr, proofPath(id, 'stderr.log'));
    assert.equal(proofRecord(observation.stdout).bytes, stdout.length);
    assert.equal(proofRecord(observation.stderr).bytes, stderr.length);
    if (subject.source === source) {
      assert.equal(stdout.length, 0);
      assert.deepEqual(JSON.parse(stderr.toString('utf8')), {
        status: 'blocked',
        code: 'GAP-DEVELOPMENT-CONTROLLER-001',
        message: 'Required controller option is missing.',
      });
    } else if (subject.source === 'bin/vida-agent.ts') {
      assert.equal(stderr.length, 0);
      const help = proofRecord(JSON.parse(stdout.toString('utf8')));
      assert.equal(help.schema, 'VidaAgentCommandResult/v1');
      assert.equal(help.status, 'help');
      assert.ok(
        Array.isArray(help.commands) &&
          help.commands.length > 0 &&
          help.commands.every((command) => typeof command === 'string'),
      );
    } else {
      assert.equal(stdout.length, 0);
      assert.deepEqual(
        JSON.parse(stderr.toString('utf8')),
        subject.source === 'bin/scope.ts'
          ? {
              schema: 'VidaAgentCommandResult/v1',
              status: 'blocked',
              code: 'GAP-VIDA-SCOPE-001',
              message: cliCommandContracts.scope.syntax,
            }
          : { status: 'blocked', message: 'vida work-state repair: kind, mode or absolute project root missing' },
      );
    }
    assert.deepEqual(receipt.external_module_inputs, []);
    assert.ok(Array.isArray(receipt.loaded_inputs));
    const loaded = validateLoaded(receipt.loaded_inputs);
    assert.ok(loaded.has(subject.source) && loaded.has(preload) && loaded.has('tooling/coverage-cli-child.ts'));
    const coverage = proofRecord(receipt.coverage);
    assert.deepEqual(
      Object.keys(coverage),
      [path.join(context.root, subject.source)],
      'Foreign or unloaded CLI Source counter.',
    );
    return coverage;
  });
}
