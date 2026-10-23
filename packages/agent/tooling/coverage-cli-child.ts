import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { closeSync, fstatSync, lstatSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import type { SpawnSyncReturns } from 'node:child_process';
import { openRootFileSync, readFileDescriptorBoundedSync } from '@openclaw/fs-safe/advanced';
import { sha256 } from './bun-coverage-evidence.ts';
import { completeOwnedCleanup } from './owned-cleanup-completion.ts';
import { observeOwnedProcessGroup } from './owned-process-group.ts';
import { cliCommandContracts } from '../bin/cli-command-contracts.ts';
import { runOptionDetails } from '../bin/run-cli-options.ts';
import { validateIssueSqlConsumption } from './coverage-cli-sql-join.ts';

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
  subject_role: string;
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
  process_group_state?: 'gone' | 'present' | 'unknown';
};
export type CliChildLaunch = {
  schema: 'VidaBunCoverageCliLaunch/v1';
  subject_role: string;
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
  native_options: Record<string, unknown>;
  budget_ms: string | null;
  deadline_ms: string | null;
  prepared?: CliPreparedBinding;
};
type CliPreparedBinding = {
  id: string;
  argv: string[];
  inputs: Record<string, unknown>[];
  issue_targets?: CliPreparedIssueTarget[];
  launch: Reference;
  receipt: Reference;
  terminal: Reference;
  stdout: Output;
  prepared_output?: Record<string, unknown>;
};
type CliPreparedIssueTarget =
  | {
      role: 'intake';
      path: string;
      origin: {
        path: string;
        realpath: string;
        identity: Record<string, unknown>;
        bytes: number;
        sha256: string;
      };
    }
  | { role: 'runtime-config' | 'runtime-initialization' | 'selected-source'; path: string };

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
const toolchainSources = ['bin/bun.ts'];
const toolchainTests = ['tests/bun-toolchain.test.ts', 'tests/bun-cache-routing.test.ts'];
const preload = 'tooling/bun-coverage-preload.ts';
const launchEnvironment = 'VIDA_BUN_COVERAGE_CLI_LAUNCH';
const maxProofBytes = 4 * 1024 * 1024;
const preparedChildTimeoutMs = 60_000;
export const preparedCliInputRoles = [
  'runtime-config',
  'runtime-initialization',
  'intake',
  'scope',
  'acceptance',
  'selected-source',
] as const;
export const issueCliInputRoles = ['runtime-config', 'runtime-initialization', 'intake', 'selected-source'] as const;
const runOperationRoles = new Set(['run-admission-prepared', 'run-issue-wave']);
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

const cliProfiles = [
  {
    contour: 'bun-cli-toolchain',
    sources: toolchainSources,
    tests: toolchainTests,
    subject: { role: 'bun-version', source: 'bin/bun.ts', argument: '--version', exit_code: 0 },
  },
  {
    contour: 'bun-cli-public-entrypoints',
    sources: publicSources,
    tests: publicTests,
    subject: { role: 'agent-help', source: 'bin/vida-agent.ts', argument: '--help', exit_code: 0 },
  },
  {
    contour: 'bun-cli-run',
    sources: ['bin/run.ts'],
    tests: ['tests/run-entrypoint.test.ts', 'tests/bun-cache-routing.test.ts'],
    subject: { role: 'run-help', source: 'bin/run.ts', argument: '--help', exit_code: 0 },
  },
] as const;

function cliSubject(manifest: CliCoverageManifest): CliSubject | undefined {
  if (focusedControllerCliCoverage(manifest))
    return { role: 'controller-inspect', source, argument: 'inspect', exit_code: 1 };
  if (manifest.schema !== 'VidaBunCoverageRun/v2' || manifest.test_selection.mode !== 'focused-diagnostic')
    return undefined;
  for (const profile of cliProfiles)
    if (
      manifest.test_selection.contour === profile.contour &&
      samePaths(
        manifest.sources.map((row) => row.path),
        profile.sources,
      ) &&
      samePaths(manifest.test_selection.sources, profile.sources) &&
      samePaths(manifest.tests, profile.tests) &&
      samePaths(manifest.test_selection.tests, profile.tests)
    )
      return profile.subject;
  return undefined;
}

type CliSubject = { role: string; source: string; argument?: string; exit_code: number; expired_clock?: true };

function cliSubjects(manifest: CliCoverageManifest): CliSubject[] {
  const subject = cliSubject(manifest);
  if (!subject) return [];
  if (subject.source === 'bin/bun.ts')
    return [
      subject,
      {
        role: 'bun-expired-clock',
        source: subject.source,
        argument: 'tooling/run-bun-coverage.ts',
        exit_code: 1,
        expired_clock: true,
      },
    ];
  return subject.source === 'bin/vida-agent.ts'
    ? [
        subject,
        { role: 'scope-missing-options', source: 'bin/scope.ts', exit_code: 1 },
        { role: 'repair-missing-options', source: 'bin/repair-work-state.ts', exit_code: 1 },
      ]
    : subject.role === 'run-help'
      ? [
          subject,
          { role: 'run-admission-prepared', source: 'bin/run.ts', exit_code: 0 },
          { role: 'run-issue-wave', source: 'bin/run.ts', exit_code: 0 },
        ]
      : [subject];
}

function subjectKey(subject: CliSubject): string {
  return subject.role;
}

function launchSubject(
  context: CliCoverageContext,
  entry: unknown,
  argv: unknown,
  role: unknown,
  prepared?: unknown,
): CliSubject {
  const selected = cliSubjects(context.manifest).find(
    (subject) =>
      subject.role === role &&
      subject.source === proofRecord(entry).path &&
      (subject.role === 'run-issue-wave'
        ? validIssueArgv(context, argv, prepared)
        : subject.role === 'run-admission-prepared'
          ? validPreparedArgv(context, argv)
          : isDeepStrictEqual(argv, nativeArgv(context, subject))),
  );
  assert.ok(selected, 'Foreign focused CLI subject.');
  return selected;
}

export function focusedCliCoverage(manifest: CliCoverageManifest): boolean {
  return cliSubject(manifest) !== undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function proofRecord(value: unknown): Record<string, unknown> {
  assert.ok(
    typeof value === 'object' && value !== null && !Array.isArray(value),
    'CLI coverage proof must be an object.',
  );
  return value as Record<string, unknown>;
}

function validPreparedArgv(context: CliCoverageContext, value: unknown): value is string[] {
  if (!Array.isArray(value) || value.length !== 25 || value.some((entry) => typeof entry !== 'string')) return false;
  const args = value as string[];
  if (args[0] !== path.join(context.root, 'bin/run.ts')) return false;
  const options = new Map<string, string>();
  for (let index = 1; index < args.length; index += 2) {
    const flag = args[index];
    const argument = args[index + 1];
    if (!flag?.startsWith('--') || argument === undefined || options.has(flag)) return false;
    options.set(flag, argument);
  }
  const root = options.get('--project-root');
  const intake = options.get('--intake');
  return Boolean(
    root &&
    path.isAbsolute(root) &&
    intake &&
    path.isAbsolute(intake) &&
    path.dirname(intake) === path.join(root, '.agent', 'work', options.get('--work-id') ?? '') &&
    options.get('--repository') &&
    options.get('--project') &&
    options.get('--work-path') &&
    /^mutation-run-[a-f0-9-]{36}$/u.test(options.get('--work-id') ?? '') &&
    options.get('--attempt') === '1' &&
    /^[a-f0-9]{64}$/u.test(options.get('--scope-digest') ?? '') &&
    options.get('--team') === 'default-development' &&
    options.get('--kind') === 'research' &&
    options.get('--intent') === 'information_research' &&
    options.get('--workflow') === 'information_research_light' &&
    options.size === 12,
  );
}

function validIssueArgv(context: CliCoverageContext, value: unknown, prepared: unknown): value is string[] {
  if (!Array.isArray(value)) return false;
  const values = value as unknown[];
  if (values.length !== 29 || !values.every((entry: unknown) => typeof entry === 'string')) return false;
  if (!isRecord(prepared) || !validPreparedArgv(context, prepared.argv)) return false;
  const argv = values as string[];
  return (
    isDeepStrictEqual(argv.slice(0, 23), prepared.argv.slice(0, 23)) &&
    argv[23] === '--expected-revision' &&
    /^(?:0|[1-9]\d*)$/u.test(argv[24]!) &&
    Number.isSafeInteger(Number(argv[24])) &&
    argv[25] === '--expected-digest' &&
    /^[a-f0-9]{64}$/u.test(argv[26]!) &&
    argv[27] === '--issue-wave' &&
    argv[28] === 'true'
  );
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
  assert.equal(typeof row.subject_role, 'string');
  assert.equal(typeof row.id, 'string');
  assert.match(String(row.id), idPattern);
  assert.ok(Number.isSafeInteger(row.parent_pid) && Number(row.parent_pid) > 0);
  assert.equal(row.run_id, context.manifest.run_id);
  assert.equal(row.executable, process.execPath);
  assert.equal(row.runtime_executable_sha256, context.manifest.runtime_executable_sha256);
  assert.equal(row.manifest_sha256, context.manifest_sha256);
  const subject = launchSubject(context, row.entry, row.original_argv, row.subject_role, row.prepared);
  assert.deepEqual(
    row.entry,
    context.manifest.sources.find((entry) => entry.path === subject.source),
  );
  const expectedPreload = context.manifest.tool_inputs.find((item) => item.path === preload);
  assert.ok(expectedPreload, 'CLI preload is absent from captured tools.');
  assert.deepEqual(row.preload, expectedPreload);
  const args = runOperationRoles.has(subject.role) ? (row.original_argv as string[]) : nativeArgv(context, subject);
  let checkedPrepared: CliPreparedBinding | undefined;
  if (subject.role === 'run-admission-prepared') assert.ok(validPreparedArgv(context, args));
  else if (subject.role === 'run-issue-wave') {
    assert.ok(validIssueArgv(context, args, row.prepared));
    checkedPrepared = checkedPreparedBinding(context, row.prepared, String(row.id));
  } else assert.deepEqual(row.original_argv, args);
  assert.deepEqual(row.effective_argv, ['--preload', path.join(context.snapshot, preload), ...args]);
  assert.equal(row.original_encoding, 'utf8');
  assert.equal(row.capture_encoding, 'buffer');
  assert.equal(row.cwd, context.root);
  assert.equal(typeof row.environment_sha256, 'string');
  assert.match(String(row.environment_sha256), /^[a-f0-9]{64}$/u);
  assert.ok(isRecord(row.native_options));
  if (runOperationRoles.has(subject.role)) {
    assert.ok(typeof row.native_options.detached === 'boolean');
    assert.deepEqual(row.native_options, {
      cwd: context.root,
      encoding: 'utf8',
      windowsHide: true,
      timeout: row.native_options.timeout,
      killSignal: 'SIGKILL',
      detached: row.native_options.detached,
    });
    assert.ok(
      Number.isSafeInteger(row.native_options.timeout) &&
        Number(row.native_options.timeout) > 0 &&
        Number(row.native_options.timeout) <= preparedChildTimeoutMs,
      'Prepared CLI timeout exceeds its bounded native contract.',
    );
    assert.equal(row.budget_ms, String(row.native_options.timeout));
    assert.match(String(row.deadline_ms), /^[1-9]\d*$/u);
    assert.ok(Number.isSafeInteger(Number(row.deadline_ms)));
  } else {
    assert.equal(row.budget_ms, null);
    assert.equal(row.deadline_ms, null);
  }
  const checkedRow = row as CliChildLaunch;
  return checkedPrepared ? { ...checkedRow, prepared: checkedPrepared } : checkedRow;
}

function checkedPreparedBinding(context: CliCoverageContext, value: unknown, issueId: string): CliPreparedBinding {
  const binding = proofRecord(value);
  assert.equal(typeof binding.id, 'string');
  const id = String(binding.id);
  assert.match(id, idPattern);
  assert.notEqual(id, issueId, 'An issue cannot use itself as preparation.');
  assert.ok(validPreparedArgv(context, binding.argv));
  const rawLaunch = proofRecord(
    JSON.parse(referencedBytes(context, binding.launch, proofPath(id, 'launch.json')).toString('utf8')),
  );
  assert.equal(rawLaunch.subject_role, 'run-admission-prepared');
  const launch = checkedLaunch(context, rawLaunch);
  assert.equal(launch.id, id);
  assert.deepEqual(binding.argv, launch.original_argv);
  const terminal = proofRecord(
    JSON.parse(referencedBytes(context, binding.terminal, proofPath(id, 'terminal.json')).toString('utf8')),
  );
  assert.equal(terminal.id, id);
  assert.equal(terminal.subject_role, 'run-admission-prepared');
  assert.equal(terminal.parent_pid, launch.parent_pid);
  assert.equal(terminal.exit_code, 0);
  assert.equal(terminal.signal, null);
  assert.equal(terminal.error, null);
  assert.equal(terminal.error_observed, false);
  assert.equal(terminal.complete, true);
  assert.equal(terminal.capture_available, true);
  assert.equal(terminal.process_group_state, 'gone');
  assert.deepEqual(binding.stdout, terminal.stdout, 'Prepared CLI output reference differs from its terminal receipt.');
  const stdoutBytes = referencedBytes(context, binding.stdout, proofPath(id, 'stdout.log'));
  assert.equal(proofRecord(binding.stdout).bytes, stdoutBytes.length);
  const preparedOutput = proofRecord(JSON.parse(stdoutBytes.toString('utf8')));
  assert.equal(preparedOutput.schema, 'VidaAgentRunResult/v1');
  assert.equal(preparedOutput.status, 'prepared');
  assert.ok(Array.isArray(preparedOutput.next_actions) && preparedOutput.next_actions.length > 0);
  const readyActionIds: string[] = [];
  for (const value of preparedOutput.next_actions) {
    const action = proofRecord(value);
    const request = proofRecord(action.request);
    assert.equal(typeof request.action_id, 'string');
    readyActionIds.push(String(request.action_id));
  }
  assert.equal(new Set(readyActionIds).size, readyActionIds.length, 'Prepared CLI ready-wave action IDs repeat.');
  assert.deepEqual(terminal.parent_inputs_before, terminal.parent_inputs_after);
  assert.deepEqual(binding.inputs, terminal.parent_inputs_after);
  assert.ok(Array.isArray(binding.inputs) && binding.inputs.length === preparedCliInputRoles.length);
  const inputs = binding.inputs.map(proofRecord);
  assert.deepEqual(
    inputs.map((row) => String(row.role)).sort((left, right) => left.localeCompare(right)),
    [...preparedCliInputRoles].sort((left, right) => left.localeCompare(right)),
  );
  assert.equal(new Set(inputs.map((row) => row.path)).size, inputs.length);
  const receipt = proofRecord(
    JSON.parse(referencedBytes(context, binding.receipt, proofPath(id, 'receipt.json')).toString('utf8')),
  );
  assert.equal(receipt.id, id);
  assert.equal(receipt.subject_role, 'run-admission-prepared');
  assert.equal(receipt.run_id, context.manifest.run_id);
  assert.equal(receipt.manifest_sha256, context.manifest_sha256);
  assert.equal(receipt.parent_pid, launch.parent_pid);
  assert.equal(receipt.exit_code, 0);
  assert.equal(proofRecord(receipt.consumed_inputs).complete, true);
  const issueTargets = preparedIssueTargets(binding.argv as string[], inputs);
  assert.ok(Array.isArray(binding.issue_targets));
  assert.deepEqual(binding.issue_targets, issueTargets, 'Prepared issue targets differ from the checked work binding.');
  return {
    ...(binding as CliPreparedBinding),
    issue_targets: issueTargets,
    prepared_output: preparedOutput,
  };
}

export function readCliCoverageLaunch(context: CliCoverageContext): CliChildLaunch | undefined {
  const file = process.env[launchEnvironment];
  if (file === undefined) return undefined;
  const relative = path.relative(context.directory, file).replaceAll(path.sep, '/');
  const raw = proofRecord(JSON.parse(proofBytes(context.directory, relative).toString('utf8')));
  if (
    runOperationRoles.has(String(raw.subject_role)) &&
    (process.platform === 'win32' || !isRecord(raw.native_options) || raw.native_options.detached !== true)
  )
    return undefined;
  const launch = checkedLaunch(context, raw);
  assert.equal(relative, proofPath(launch.id, 'launch.json'));
  assert.equal(launch.parent_pid, process.ppid);
  const subject = launchSubject(context, launch.entry, launch.original_argv, launch.subject_role, launch.prepared);
  assert.deepEqual(process.argv, [
    launch.executable,
    path.join(context.root, launch.entry.path),
    ...(runOperationRoles.has(subject.role)
      ? launch.original_argv.slice(1)
      : subject.argument === undefined
        ? []
        : [subject.argument]),
  ]);
  assert.deepEqual(
    process.execArgv,
    launch.effective_argv.slice(0, runOperationRoles.has(subject.role) ? 2 : subject.argument === undefined ? -1 : -2),
  );
  assert.equal(process.cwd(), launch.cwd);
  assert.equal((process.env.BUN_OPTIONS ?? '').trim(), '');
  assert.equal(cliCoverageEnvironmentSha256(process.env), launch.environment_sha256);
  if (runOperationRoles.has(subject.role)) {
    assert.equal(process.env.VIDA_PINNED_COMMAND_BUDGET_MS, launch.budget_ms);
    assert.equal(process.env.VIDA_PINNED_COMMAND_DEADLINE_MS, launch.deadline_ms);
    assert.ok(Number(launch.deadline_ms) > Date.now());
  }
  if (subject.expired_clock) {
    assert.equal(process.env.VIDA_PINNED_COMMAND_BUDGET_MS, '4000');
    assert.equal(process.env.VIDA_PINNED_COMMAND_DEADLINE_MS, '1');
  }
  return launch;
}

export function writeCliCoverageReceipt(
  context: CliCoverageContext,
  launch: CliChildLaunch,
  captured: {
    loaded_inputs: Digest[];
    external_module_inputs: unknown[];
    coverage: Record<string, unknown>;
    consumed_inputs?: unknown;
    consumed_sql?: unknown;
    consumption_limits?: unknown;
  },
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
      subject_role: launch.subject_role,
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
      ...(runOperationRoles.has(launch.subject_role)
        ? {
            pinned_budget_ms: process.env.VIDA_PINNED_COMMAND_BUDGET_MS,
            pinned_deadline_ms: process.env.VIDA_PINNED_COMMAND_DEADLINE_MS,
          }
        : {}),
      ...captured,
    }),
  );
}

function preparedInputSnapshot(
  argv: readonly string[],
  root: string,
  targets?: readonly Record<string, unknown>[],
): Record<string, unknown>[] {
  assert.equal(realpathSync(root), root);
  const captured = new Map<string, { bytes: Buffer; row: Record<string, unknown> }>();
  const identity = (stat: import('node:fs').BigIntStats) => ({
    dev: String(stat.dev),
    ino: String(stat.ino),
    size: String(stat.size),
    mode: String(stat.mode),
    nlink: String(stat.nlink),
    mtime: String(stat.mtimeNs),
    ctime: String(stat.ctimeNs),
  });
  let totalBytes = 0;
  const capture = (role: string, file: string) => {
    const relative = path.relative(root, file);
    assert.ok(relative && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative));
    assert.ok(!captured.has(role));
    assert.ok(![...captured.values()].some(({ row }) => row.path === file));
    const opened = openRootFileSync({
      rootPath: root,
      absolutePath: file,
      boundaryLabel: 'Prepared CLI input',
      maxBytes: maxProofBytes,
      rejectHardlinks: true,
      rejectSymlinks: true,
      allowedType: 'file',
    });
    assert.ok(opened.ok, 'Prepared input is not a bounded regular owned file.');
    let failure: { error: unknown } | undefined;
    try {
      const before = identity(fstatSync(opened.fd, { bigint: true }));
      const bytes = readFileDescriptorBoundedSync(opened.fd, maxProofBytes);
      assert.deepEqual(identity(fstatSync(opened.fd, { bigint: true })), before);
      assert.deepEqual(identity(lstatSync(file, { bigint: true })), before);
      assert.equal(realpathSync(file), file);
      assert.ok(bytes.length > 0 && String(bytes.length) === before.size);
      totalBytes += bytes.length;
      assert.ok(totalBytes <= maxProofBytes, 'Prepared input byte bound exceeded.');
      const row = { role, path: file, realpath: file, identity: before, bytes: bytes.length, sha256: sha256(bytes) };
      captured.set(role, { bytes, row });
      return bytes;
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
  };
  const resolved = (value: unknown) => {
    assert.equal(typeof value, 'string');
    const relative = String(value);
    assert.ok(!path.isAbsolute(relative));
    return path.resolve(root, relative);
  };
  if (targets) {
    assert.equal(targets.length, issueCliInputRoles.length);
    assert.deepEqual(
      targets.map((row) => String(row.role)).sort((left, right) => left.localeCompare(right)),
      [...issueCliInputRoles].sort((left, right) => left.localeCompare(right)),
    );
    for (const target of targets) {
      assert.equal(typeof target.path, 'string');
      capture(String(target.role), String(target.path));
    }
    return [...captured.values()].map(({ row }) => row);
  }
  const intakePath = valueAfterArg(argv, '--intake');
  assert.ok(intakePath && path.isAbsolute(intakePath));
  const intake = proofRecord(JSON.parse(capture('intake', intakePath).toString('utf8')));
  const scope = proofRecord(JSON.parse(capture('scope', resolved(intake.scope_path)).toString('utf8')));
  assert.ok(Array.isArray(scope.implementation_paths) && scope.implementation_paths.length === 1);
  capture('acceptance', resolved(intake.acceptance_path));
  capture('selected-source', resolved(scope.implementation_paths[0]));
  capture('runtime-config', path.join(root, 'agent-runtime.config.v1.yaml'));
  capture('runtime-initialization', path.join(root, '.agent', 'runtime-initialization.v1.json'));
  return [...captured.values()].map(({ row }) => row);
}

function valueAfterArg(argv: readonly string[], name: string): string | undefined {
  const index = argv.indexOf(name);
  return index < 0 ? undefined : argv[index + 1];
}

function preparedIssueTargets(
  argv: readonly string[],
  inputs: readonly Record<string, unknown>[],
): CliPreparedIssueTarget[] {
  const root = valueAfterArg(argv, '--project-root');
  const workId = valueAfterArg(argv, '--work-id');
  assert.ok(root && path.isAbsolute(root) && path.resolve(root) === root);
  assert.ok(workId && /^mutation-run-[a-f0-9-]{36}$/u.test(workId));
  const intake = inputs.find((row) => row.role === 'intake');
  assert.ok(intake && typeof intake.path === 'string' && typeof intake.realpath === 'string');
  assert.ok(isRecord(intake.identity));
  assert.ok(Number.isSafeInteger(intake.bytes) && Number(intake.bytes) > 0);
  assert.ok(typeof intake.sha256 === 'string' && /^[a-f0-9]{64}$/u.test(intake.sha256));
  const canonicalIntakePath = path.join(root, '.agent', 'work', workId, 'local-session-intake.v1.json');
  return issueCliInputRoles.map((role) => {
    if (role === 'intake')
      return {
        role,
        path: canonicalIntakePath,
        origin: {
          path: intake.path as string,
          realpath: intake.realpath as string,
          identity: intake.identity as Record<string, unknown>,
          bytes: intake.bytes as number,
          sha256: intake.sha256 as string,
        },
      };
    const input = inputs.find((row) => row.role === role);
    assert.ok(input && typeof input.path === 'string');
    return { role, path: input.path };
  });
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
  let preparedArmed: 'run-admission-prepared' | 'run-issue-wave' | false = false;
  let preparedActive = false;
  let preparedProcessGroupState: 'gone' | 'present' | 'unknown' | undefined;
  let preparedNativeResult: SpawnSyncReturns<string | Buffer> | undefined;
  let preparedBinding: CliPreparedBinding | undefined;
  function spawnSync(...call: unknown[]): SpawnSyncReturns<string | Buffer> {
    const [command, args, settings] = call;
    const prepared = preparedArmed;
    if (prepared) {
      assert.ok(!preparedActive, 'Nested prepared CLI launch.');
      preparedArmed = false;
      preparedActive = true;
    }
    let preparedInputFailure: Error | undefined;
    try {
      const subject = subjects.find(
        (candidate) =>
          command === process.execPath &&
          Array.isArray(args) &&
          (runOperationRoles.has(candidate.role)
            ? prepared === candidate.role &&
              (candidate.role === 'run-admission-prepared'
                ? validPreparedArgv(context, args)
                : validIssueArgv(context, args, preparedBinding))
            : candidate.source === source
              ? args.includes(path.join(context.root, source))
              : JSON.stringify(args) === JSON.stringify(nativeArgv(context, candidate))),
      );
      if (!subject) {
        if (prepared) {
          preparedActive = false;
          throw new Error('Armed prepared CLI launch has a foreign command or argv.');
        }
        return Reflect.apply(original, actual, call) as SpawnSyncReturns<string | Buffer>;
      }
      const key = subjectKey(subject);
      assert.ok(!launches.has(key), 'Duplicate focused CLI launch.');
      launches.add(key);
      if (!runOperationRoles.has(subject.role)) assert.deepEqual(args, nativeArgv(context, subject));
      const options = proofRecord(settings);
      const { env: requestedEnvironment, ...nativeOptions } = options;
      assert.deepEqual(
        nativeOptions,
        runOperationRoles.has(subject.role)
          ? {
              cwd: path.resolve(context.root),
              encoding: 'utf8',
              windowsHide: true,
              timeout: options.timeout,
              killSignal: 'SIGKILL',
              detached: process.platform !== 'win32',
            }
          : { encoding: 'utf8', windowsHide: true, timeout: 4000 },
        'CLI observation requires the unchanged bounded native invocation.',
      );
      if (runOperationRoles.has(subject.role)) {
        assert.ok(
          Number.isSafeInteger(options.timeout) &&
            Number(options.timeout) > 0 &&
            Number(options.timeout) <= preparedChildTimeoutMs,
        );
      }
      const expectedEnvironment = subject.expired_clock
        ? { ...process.env, VIDA_PINNED_COMMAND_BUDGET_MS: '4000', VIDA_PINNED_COMMAND_DEADLINE_MS: '1' }
        : undefined;
      if (runOperationRoles.has(subject.role)) {
        assert.ok(isRecord(requestedEnvironment));
        assert.equal(requestedEnvironment.VIDA_PINNED_COMMAND_BUDGET_MS, String(options.timeout));
        assert.match(String(requestedEnvironment.VIDA_PINNED_COMMAND_DEADLINE_MS), /^[1-9]\d*$/u);
        assert.ok(Number(requestedEnvironment.VIDA_PINNED_COMMAND_DEADLINE_MS) > Date.now());
      } else {
        assert.ok(
          isDeepStrictEqual(requestedEnvironment, expectedEnvironment),
          'CLI observation requires the exact scenario environment.',
        );
      }
      let preparedBefore: Record<string, unknown>[] | undefined;
      let preparedAfter: Record<string, unknown>[] | undefined;
      const issueTargets =
        subject.role === 'run-issue-wave'
          ? preparedBinding && preparedIssueTargets(preparedBinding.argv, preparedBinding.inputs)
          : undefined;
      if (runOperationRoles.has(subject.role)) {
        try {
          preparedBefore = preparedInputSnapshot(
            args as string[],
            String(valueAfterArg(args as string[], '--project-root')),
            issueTargets,
          );
          if (subject.role === 'run-issue-wave') {
            assert.ok(preparedBinding && issueTargets);
            assert.deepEqual(
              preparedBefore.map(({ role, path }) => ({ role, path })),
              issueTargets.map(({ role, path }) => ({ role, path })),
              'Issue target snapshot differs from its prepared work binding.',
            );
          }
        } catch (error) {
          throw new Error('Prepared CLI input snapshot failed before dispatch.', { cause: error });
        }
      }
      const id = randomUUID();
      mkdirSync(path.join(context.directory, 'cli', id), { recursive: true, mode: 0o700 });
      const effectiveEnvironment: NodeJS.ProcessEnv = runOperationRoles.has(subject.role)
        ? (requestedEnvironment as NodeJS.ProcessEnv)
        : (expectedEnvironment ?? process.env);
      const env: NodeJS.ProcessEnv = {
        ...effectiveEnvironment,
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
        original_argv: runOperationRoles.has(subject.role) ? [...(args as string[])] : nativeArgv(context, subject),
        effective_argv: [
          '--preload',
          path.join(context.snapshot, preload),
          ...(runOperationRoles.has(subject.role) ? [...(args as string[])] : nativeArgv(context, subject)),
        ],
        original_encoding: 'utf8',
        capture_encoding: 'buffer',
        cwd: typeof options.cwd === 'string' ? options.cwd : process.cwd(),
        subject_role: subject.role,
        environment_sha256: cliCoverageEnvironmentSha256(env),
        manifest_sha256: context.manifest_sha256,
        native_options: nativeOptions,
        budget_ms: runOperationRoles.has(subject.role) ? String(env.VIDA_PINNED_COMMAND_BUDGET_MS) : null,
        deadline_ms: runOperationRoles.has(subject.role) ? String(env.VIDA_PINNED_COMMAND_DEADLINE_MS) : null,
        ...(subject.role === 'run-issue-wave' && preparedBinding && issueTargets
          ? { prepared: { ...preparedBinding, issue_targets: issueTargets } }
          : {}),
      };
      if (subject.role !== 'run-admission-prepared') checkedLaunch(context, launch);
      const launchReference = writeProof(context, proofPath(id, 'launch.json'), jsonBytes(launch));
      let result: SpawnSyncReturns<string | Buffer>;
      try {
        result = Reflect.apply(original, actual, [
          command,
          launch.effective_argv,
          { ...options, encoding: launch.capture_encoding, env },
        ]) as SpawnSyncReturns<string | Buffer>;
        if (runOperationRoles.has(subject.role)) preparedNativeResult = result;
      } catch (error) {
        try {
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
        } catch (evidenceError) {
          throw new AggregateError([error, evidenceError], 'Native CLI launch and terminal evidence failed.', {
            cause: error,
          });
        }
        throw error;
      }
      if (runOperationRoles.has(subject.role)) {
        try {
          preparedAfter = preparedInputSnapshot(
            args as string[],
            String(valueAfterArg(args as string[], '--project-root')),
            issueTargets,
          );
          assert.deepEqual(preparedAfter, preparedBefore, 'Prepared fixture inputs changed during the native call.');
        } catch (error) {
          preparedInputFailure = new Error('Prepared CLI input snapshot failed after native call.', { cause: error });
        }
      }
      const processGroupState =
        runOperationRoles.has(subject.role) &&
        nativeOptions.detached === true &&
        Number.isSafeInteger(result.pid) &&
        Number(result.pid) > 1
          ? observeOwnedProcessGroup(Number(result.pid))
          : runOperationRoles.has(subject.role)
            ? 'unknown'
            : undefined;
      if (runOperationRoles.has(subject.role)) preparedProcessGroupState = processGroupState;
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
        subject_role: subject.role,
        parent_pid: process.pid,
        pid: result.pid,
        exit_code: result.status,
        signal: result.signal,
        error_observed: result.error !== undefined,
        process_group_state: processGroupState,
        ...(preparedBefore ? { parent_inputs_before: preparedBefore } : {}),
        ...(preparedAfter ? { parent_inputs_after: preparedAfter } : {}),
        ...(preparedInputFailure ? { prepared_input_error: preparedInputFailure.message } : {}),
        complete:
          captureAvailable &&
          result.error === undefined &&
          result.signal === null &&
          result.status === subject.exit_code,
        capture_available: captureAvailable,
        error: result.error?.message ?? null,
        stdout: stdoutReference,
        stderr: stderrReference,
      };
      const terminalReference = writeProof(context, proofPath(id, 'terminal.json'), jsonBytes(terminal));
      if (preparedInputFailure) throw preparedInputFailure;
      const receiptPath = proofPath(id, 'receipt.json');
      observations.push({
        id,
        subject_role: subject.role,
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
        ...(processGroupState === undefined ? {} : { process_group_state: processGroupState }),
      });
      if (subject.role === 'run-admission-prepared') {
        assert.ok(terminal.complete && processGroupState === 'gone' && preparedBefore);
        preparedBinding = {
          id,
          argv: [...(args as string[])],
          inputs: preparedBefore,
          launch: launchReference,
          terminal: terminalReference,
          receipt: observations.at(-1)!.receipt,
          stdout: observations.at(-1)!.stdout,
        };
      }
      return {
        ...result,
        stdout: Buffer.isBuffer(result.stdout) ? result.stdout.toString('utf8') : result.stdout,
        stderr: Buffer.isBuffer(result.stderr) ? result.stderr.toString('utf8') : result.stderr,
        output: result.output.map((value) => (Buffer.isBuffer(value) ? value.toString('utf8') : value)),
      };
    } catch (error) {
      if (preparedInputFailure && error !== preparedInputFailure)
        throw new AggregateError([preparedInputFailure, error], 'Prepared CLI diagnostics and evidence failed.', {
          cause: preparedInputFailure,
        });
      throw error;
    } finally {
      if (prepared) preparedActive = false;
    }
  }
  const armPrepared = () => {
    assert.ok(subjects.some((subject) => subject.role === 'run-admission-prepared'));
    assert.ok(!preparedArmed && !preparedActive, 'Prepared CLI observation is already armed or active.');
    preparedNativeResult = undefined;
    preparedProcessGroupState = undefined;
    assert.ok(!launches.has('run-admission-prepared'), 'Duplicate focused CLI launch.');
    preparedArmed = 'run-admission-prepared';
  };
  const armIssue = () => {
    assert.ok(subjects.some((subject) => subject.role === 'run-issue-wave'));
    assert.ok(preparedBinding, 'Issue CLI coverage requires the observed preparation.');
    assert.ok(!preparedArmed && !preparedActive, 'Run CLI observation is already armed or active.');
    assert.ok(!launches.has('run-issue-wave'), 'Duplicate focused CLI issue launch.');
    preparedNativeResult = undefined;
    preparedProcessGroupState = undefined;
    preparedArmed = 'run-issue-wave';
  };
  Object.assign(
    spawnSync,
    subjects.some((subject) => subject.role === 'run-admission-prepared')
      ? {
          armPrepared,
          armIssue,
          preparedProcessGroupState: () => preparedProcessGroupState,
          preparedNativeResult: () => preparedNativeResult,
        }
      : {},
  );
  return {
    spawnSync,
    armPrepared,
    armIssue,
    preparedProcessGroupState: () => preparedProcessGroupState,
    preparedNativeResult: () => preparedNativeResult,
    finish: () => {
      assert.equal(preparedArmed, false, 'Prepared CLI observation remained armed.');
      assert.equal(preparedActive, false, 'Prepared CLI observation did not settle.');
      assert.equal(launches.size, subjects.length, 'Focused CLI launches were not all observed.');
      assert.equal(observations.length, subjects.length, 'Focused CLI observation is incomplete.');
      return subjects.map((subject) => {
        const observation = observations.find((row) => row.subject_role === subject.role);
        assert.ok(observation, 'Focused CLI subject observation is missing: ' + subject.role);
        return observation;
      });
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
  const admittedSubjects = new Set<string>();
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
    const subject = launchSubject(context, launch.entry, launch.original_argv, launch.subject_role, launch.prepared);
    const key = subjectKey(subject);
    assert.ok(!admittedSubjects.has(key), 'Duplicate focused CLI subject.');
    admittedSubjects.add(key);
    assert.equal(observation.subject_role, subject.role);
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
      'subject_role',
      'parent_pid',
      'pid',
      'exit_code',
      'signal',
      'error_observed',
      'complete',
      'stdout',
      'stderr',
      'process_group_state',
    ])
      assert.deepEqual(terminal[key], observation[key], 'CLI terminal and parent receipt differ.');
    assert.equal(terminal.error, null);
    assert.equal(terminal.capture_available, true);
    const receipt = proofRecord(
      JSON.parse(referencedBytes(context, observation.receipt, proofPath(id, 'receipt.json')).toString('utf8')),
    );
    if (runOperationRoles.has(subject.role)) {
      assert.equal(
        receipt.pinned_budget_ms,
        launch.budget_ms,
        'Prepared CLI budget differs from native child observation.',
      );
      assert.equal(
        receipt.pinned_deadline_ms,
        launch.deadline_ms,
        'Prepared CLI deadline differs from native child observation.',
      );
      assert.equal(terminal.prepared_input_error, undefined);
      assert.deepEqual(terminal.parent_inputs_after, terminal.parent_inputs_before);
      const parentInputs = terminal.parent_inputs_before;
      assert.ok(Array.isArray(parentInputs) && parentInputs.length === (subject.role === 'run-issue-wave' ? 4 : 6));
      const inputEvidence = proofRecord(receipt.consumed_inputs);
      assert.equal(
        inputEvidence.complete,
        true,
        'Prepared CLI input capture is incomplete: ' + JSON.stringify(inputEvidence.issues),
      );
      assert.deepEqual(inputEvidence.issues, []);
      assert.ok(Array.isArray(inputEvidence.streams) && Array.isArray(inputEvidence.payloads));
      assert.ok(inputEvidence.streams.length > 0 && inputEvidence.streams.length <= 4096);
      assert.ok(inputEvidence.payloads.length > 0);
      const limits = proofRecord(inputEvidence.limits);
      assert.ok(
        Number.isSafeInteger(limits.operations) &&
          Number(limits.operations) > 0 &&
          Number(limits.operations) <= 4096 &&
          limits.max_operations === 4096,
      );
      assert.ok(
        Number.isSafeInteger(limits.unique_bytes) &&
          Number(limits.unique_bytes) <= 4 * 1024 * 1024 &&
          limits.max_bytes === 4 * 1024 * 1024,
      );
      const payloads = new Map<string, { path: string; bytes: Buffer; sha256: string }>();
      const payloadKeys = new Set<string>();
      let uniqueBytes = 0;
      for (const value of inputEvidence.payloads) {
        const payload = proofRecord(value);
        assert.equal(typeof payload.id, 'string');
        assert.equal(typeof payload.path, 'string');
        assert.equal(typeof payload.sha256, 'string');
        assert.equal(typeof payload.bytes, 'string');
        assert.match(String(payload.id), /^p(?:0|[1-9]\d*)$/u);
        const bytes = Buffer.from(String(payload.bytes), 'base64');
        assert.equal(bytes.toString('base64'), payload.bytes);
        assert.equal(sha256(bytes), payload.sha256);
        assert.ok(!payloads.has(String(payload.id)));
        const key = String(payload.path) + '\0' + String(payload.sha256);
        assert.ok(!payloadKeys.has(key));
        payloadKeys.add(key);
        uniqueBytes += bytes.length;
        assert.ok(uniqueBytes <= maxProofBytes);
        payloads.set(String(payload.id), { path: String(payload.path), bytes, sha256: String(payload.sha256) });
      }
      assert.equal(uniqueBytes, limits.unique_bytes);
      const requiredRoles: readonly string[] =
        subject.role === 'run-issue-wave' ? issueCliInputRoles : preparedCliInputRoles;
      const rows = parentInputs.map((value) => proofRecord(value));
      const byRole = new Map(rows.map((row) => [String(row.role), row]));
      assert.deepEqual([...byRole.keys()].sort(), [...requiredRoles].sort());
      if (subject.role === 'run-issue-wave') {
        const issueTargets = launch.prepared!.issue_targets;
        assert.ok(Array.isArray(issueTargets));
        assert.deepEqual(
          rows.map(({ role, path }) => ({ role, path })),
          issueTargets.map(({ role, path }) => ({ role, path })),
          'Issue snapshots do not match their exact prepared targets.',
        );
      }
      const streams = new Map<string, { row: Record<string, unknown>; bytes: Buffer }>();
      for (const streamValue of inputEvidence.streams) {
        const stream = proofRecord(streamValue);
        const id = String(stream.id);
        assert.match(id, /^s(?:0|[1-9]\d*)$/u);
        assert.ok(Number.isSafeInteger(stream.fd) && Number(stream.fd) >= 0);
        const role = String(stream.role);
        const readMethod = stream.read_method;
        assert.ok(
          readMethod === 'readSync' || readMethod === 'readFileSync' || readMethod === 'readFileDescriptorBoundedSync',
        );
        const parent = byRole.get(role);
        assert.ok(parent && requiredRoles.includes(role));
        assert.ok(!streams.has(id));
        assert.equal(stream.complete, true);
        assert.equal(stream.path, parent.path);
        assert.equal(stream.identity && isDeepStrictEqual(stream.identity, parent.identity), true);
        assert.equal(stream.bytes, parent.bytes);
        assert.equal(typeof stream.payload_ids === 'object' && Array.isArray(stream.payload_ids), true);
        const chunks = (stream.payload_ids as unknown[]).map((payloadId) => {
          const payload = payloads.get(String(payloadId));
          assert.ok(payload && payload.path === stream.path);
          return payload.bytes;
        });
        const bytes = chunks.length === 1 ? chunks[0]! : Buffer.concat(chunks);
        assert.equal(bytes.length, stream.bytes);
        const hash =
          chunks.length === 1 ? payloads.get(String((stream.payload_ids as unknown[])[0]))!.sha256 : sha256(bytes);
        assert.equal(hash, stream.sha256);
        assert.equal(stream.sha256, parent.sha256);
        streams.set(id, { row: stream, bytes });
      }
      assert.ok(Array.isArray(inputEvidence.operations));
      assert.equal(inputEvidence.operations.length, limits.operations);
      const usedPayloads = new Set<string>();
      const readState = new Map<string, { next: number; payloadIds: string[]; eof: boolean }>();
      for (let index = 0; index < inputEvidence.operations.length; index++) {
        const operation = proofRecord(inputEvidence.operations[index]);
        assert.equal(operation.sequence, index + 1);
        const streamId = String(operation.stream_id);
        const stream = streams.get(streamId);
        assert.ok(stream);
        assert.equal(operation.fd, stream.row.fd);
        assert.equal(operation.path, stream.row.path);
        assert.equal(operation.role, stream.row.role);
        assert.equal(operation.read_method, stream.row.read_method);
        let state = readState.get(streamId);
        if (!state) {
          state = { next: 0, payloadIds: [], eof: false };
          readState.set(streamId, state);
        }
        assert.equal(state.eof, false);
        assert.equal(operation.file_position, state.next, 'Prepared CLI read position is discontinuous.');
        assert.ok(
          operation.requested_position === null || operation.requested_position === state.next,
          'Prepared CLI requested read position is inconsistent.',
        );
        assert.equal(Number.isSafeInteger(operation.buffer_offset) && Number(operation.buffer_offset) >= 0, true);
        assert.equal(Number.isSafeInteger(operation.bytes_read) && Number(operation.bytes_read) >= 0, true);
        assert.ok(Number.isSafeInteger(operation.requested_count) && Number(operation.requested_count) >= 0);
        if (stream.row.read_method === 'readFileSync' || stream.row.read_method === 'readFileDescriptorBoundedSync') {
          assert.equal(state.next, 0, 'Prepared readFileSync input was partially consumed before the full read.');
          assert.equal(operation.requested_position, null);
          assert.equal(operation.buffer_offset, 0);
          if (stream.row.read_method === 'readFileSync') assert.equal(operation.requested_count, stream.row.bytes);
          else
            assert.ok(
              Number.isSafeInteger(operation.requested_count) &&
                Number(operation.requested_count) >= Number(stream.row.bytes),
              'Prepared bounded descriptor read limit is below its complete result.',
            );
          assert.equal(
            operation.bytes_read,
            stream.row.bytes,
            'Prepared CLI read byte count differs from its payload.',
          );
          if (stream.row.read_method === 'readFileSync') assert.equal(operation.eof, true);
          else {
            assert.equal(operation.eof, false);
            assert.equal(operation.complete_result, true);
          }
          const payloadId = String(operation.payload_id);
          const payload = payloads.get(payloadId);
          assert.ok(
            payload && payload.path === operation.path,
            'Prepared CLI read payload differs from its input path.',
          );
          assert.equal(payload.bytes.length, stream.row.bytes);
          state.next = Number(stream.row.bytes);
          state.payloadIds.push(payloadId);
          usedPayloads.add(payloadId);
          state.eof = true;
          continue;
        }
        assert.ok(Number(operation.requested_count) >= Number(operation.bytes_read));
        if (operation.bytes_read === 0) {
          assert.equal(operation.eof, true);
          assert.equal(operation.payload_id, null);
          assert.equal(state.next, stream.row.bytes);
          state.eof = true;
        } else {
          assert.equal(operation.eof, false);
          const payloadId = String(operation.payload_id);
          const payload = payloads.get(payloadId);
          assert.ok(
            payload && payload.path === operation.path,
            'Prepared CLI read payload differs from its input path.',
          );
          assert.equal(
            payload.bytes.length,
            operation.bytes_read,
            'Prepared CLI read byte count differs from its payload.',
          );
          state.next += Number(operation.bytes_read);
          state.payloadIds.push(payloadId);
          usedPayloads.add(payloadId);
        }
      }
      for (const [id, stream] of streams) {
        const state = readState.get(id);
        assert.ok(state?.eof);
        assert.deepEqual(state.payloadIds, stream.row.payload_ids);
        assert.equal(state.next, stream.row.bytes);
      }
      assert.deepEqual([...usedPayloads].sort(), [...payloads.keys()].sort());
      for (const role of requiredRoles)
        assert.ok(
          [...streams.values()].some(({ row }) => row.role === role),
          'Prepared CLI consumed input role is missing.',
        );
      const consumed = new Map([...streams.values()].map(({ row, bytes }) => [String(row.role), bytes]));
      const root = valueAfterArg(launch.original_argv, '--project-root');
      assert.ok(root && path.isAbsolute(root) && path.resolve(root) === root);
      const rolePath = (role: string) => {
        const row = byRole.get(role);
        assert.ok(row && typeof row.path === 'string');
        assert.equal(row.realpath, row.path);
        const relative = path.relative(root, row.path);
        assert.ok(relative && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative));
        assert.equal(path.resolve(root, relative), row.path);
        const identity = proofRecord(row.identity);
        assert.equal(identity.nlink, '1');
        assert.equal(identity.size, String(row.bytes));
        assert.ok(Number.isSafeInteger(row.bytes) && Number(row.bytes) > 0);
        return row.path;
      };
      const selectedPath = (value: unknown) => {
        assert.equal(typeof value, 'string');
        assert.ok(!path.isAbsolute(String(value)));
        return path.resolve(root, String(value));
      };
      assert.equal(
        rolePath('runtime-config'),
        path.join(root, 'agent-runtime.config.v1.yaml'),
        'Prepared CLI runtime-config path differs from its fixed role.',
      );
      assert.equal(rolePath('runtime-initialization'), path.join(root, '.agent', 'runtime-initialization.v1.json'));
      assert.equal(
        rolePath('intake'),
        subject.role === 'run-issue-wave'
          ? launch.prepared!.issue_targets?.find((row) => row.role === 'intake')?.path
          : valueAfterArg(launch.original_argv, '--intake'),
      );
      if (subject.role === 'run-issue-wave') {
        assert.ok(
          raw.some(
            (candidate: unknown) =>
              isRecord(candidate) &&
              candidate.id === launch.prepared!.id &&
              candidate.subject_role === 'run-admission-prepared' &&
              isDeepStrictEqual(candidate.launch, launch.prepared!.launch) &&
              isDeepStrictEqual(candidate.receipt, launch.prepared!.receipt) &&
              isDeepStrictEqual(candidate.terminal, launch.prepared!.terminal),
          ),
          'Issue ancestry is not the independently admitted prepared observation.',
        );
      }
      const intake = proofRecord(JSON.parse(consumed.get('intake')!.toString('utf8')));
      if (subject.role === 'run-admission-prepared') {
        const scope = proofRecord(JSON.parse(consumed.get('scope')!.toString('utf8')));
        assert.equal(rolePath('scope'), selectedPath(intake.scope_path));
        assert.equal(rolePath('acceptance'), selectedPath(intake.acceptance_path));
        assert.ok(Array.isArray(scope.implementation_paths) && scope.implementation_paths.length === 1);
        assert.equal(rolePath('selected-source'), selectedPath(scope.implementation_paths[0]));
      } else {
        for (const [role, field] of [
          ['scope', 'scope_path'],
          ['acceptance', 'acceptance_path'],
        ] as const) {
          const ancestor = launch.prepared!.inputs.find((row) => row.role === role);
          assert.equal(ancestor?.path, selectedPath(intake[field]));
        }
        assert.equal(
          rolePath('selected-source'),
          launch.prepared!.inputs.find((row) => row.role === 'selected-source')?.path,
        );
      }
      assert.equal(observation.process_group_state, 'gone', 'Prepared CLI owned process group is not gone.');
      assert.equal(terminal.process_group_state, 'gone');
      assert.equal(launch.native_options.detached, true);
    }
    assert.equal(launch.id, id);
    assert.equal(launch.parent_pid, parentPid);
    assert.equal(receipt.schema, 'VidaBunCoverageCliChild/v1');
    assert.equal(receipt.subject_role, subject.role);
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
      ...(runOperationRoles.has(subject.role)
        ? launch.original_argv.slice(1)
        : subject.argument === undefined
          ? []
          : [subject.argument]),
    ]);
    assert.deepEqual(
      receipt.exec_argv,
      launch.effective_argv.slice(
        0,
        runOperationRoles.has(subject.role) ? 2 : subject.argument === undefined ? -1 : -2,
      ),
    );
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
    } else if (subject.source === 'bin/run.ts' && subject.role === 'run-help') {
      assert.equal(stderr.length, 0);
      const help = proofRecord(JSON.parse(stdout.toString('utf8')));
      assert.equal(help.schema, 'VidaAgentCommandResult/v1');
      assert.equal(help.status, 'help');
      assert.equal(help.command, 'run');
      assert.equal(help.syntax, cliCommandContracts.run.syntax);
      assert.deepEqual(help.options, runOptionDetails());
    } else if (subject.role === 'run-admission-prepared') {
      assert.equal(stderr.length, 0);
      const prepared = proofRecord(JSON.parse(stdout.toString('utf8')));
      assert.equal(prepared.schema, 'VidaAgentRunResult/v1');
      assert.equal(prepared.status, 'prepared');
    } else if (subject.role === 'run-issue-wave') {
      assert.equal(stderr.length, 0);
      const issued = proofRecord(JSON.parse(stdout.toString('utf8')));
      assert.equal(issued.schema, 'VidaAgentRunResult/v1');
      assert.equal(issued.status, 'wave_issued');
      const limits = proofRecord(receipt.consumption_limits);
      assert.equal(limits.max_bytes, maxProofBytes);
      assert.equal(limits.max_operations, 4096);
      assert.deepEqual(limits.issues, []);
      const sql = proofRecord(receipt.consumed_sql);
      const inputs = proofRecord(receipt.consumed_inputs);
      assert.ok(Array.isArray(sql.operations) && Array.isArray(sql.host_opens) && Array.isArray(inputs.operations));
      const statCount = sql.host_opens.reduce((sum: number, value: unknown) => {
        const host = proofRecord(value);
        assert.ok(Array.isArray(host.stat_observations));
        return sum + host.stat_observations.length;
      }, 0);
      assert.equal(limits.operations, inputs.operations.length + sql.operations.length + statCount);
      assert.ok(
        Number.isSafeInteger(limits.operations) && Number(limits.operations) > 0 && Number(limits.operations) <= 4096,
      );
      assert.ok(
        Number.isSafeInteger(limits.bytes) && Number(limits.bytes) > 0 && Number(limits.bytes) <= maxProofBytes,
      );
      assert.ok(
        jsonBytes({ consumed_inputs: inputs, consumed_sql: sql, consumption_limits: limits }).length <= maxProofBytes,
        'Combined issue consumption exceeds the unchanged proof bound.',
      );
      const parentInputs = terminal.parent_inputs_before;
      assert.ok(Array.isArray(parentInputs));
      const intakeInput = parentInputs.map((value: unknown) => proofRecord(value)).find((row) => row.role === 'intake');
      assert.ok(intakeInput);
      validateIssueSqlConsumption(sql, {
        argv: launch.original_argv,
        output: issued,
        preparedOutput: launch.prepared!.prepared_output!,
        root: valueAfterArg(launch.original_argv, '--project-root')!,
        preparedInputs: launch.prepared!.inputs.map((value) => proofRecord(value)),
        intakeInput,
      });
    } else if (subject.source === 'bin/bun.ts') {
      if (subject.expired_clock) {
        assert.equal(stdout.length, 0);
        assert.deepEqual(stderr, Buffer.from('Execution budget exhausted before child launch.\n'));
      } else {
        assert.equal(stderr.length, 0);
        const pinInput = context.manifest.tool_inputs.find((entry) => entry.path === '.bun-version');
        assert.ok(pinInput, 'Captured Bun pin is missing.');
        const pinBytes = readFileSync(path.join(context.snapshot, '.bun-version'));
        assert.equal(sha256(pinBytes), pinInput.sha256, 'Captured Bun pin bytes differ.');
        const pin = pinBytes.toString('utf8').trim();
        assert.match(pin, /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u);
        assert.deepEqual(stdout, Buffer.from(pin + '\n'));
      }
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
    const expectedExternalInputs =
      subject.role === 'run-issue-wave'
        ? [
            {
              path: path
                .relative(context.root, path.join(context.snapshot, 'tooling/coverage-cli-sqlite.ts'))
                .replaceAll(path.sep, '/'),
              sha256: context.manifest.tool_inputs.find((entry) => entry.path === 'tooling/coverage-cli-sqlite.ts')
                ?.sha256,
            },
          ]
        : [];
    assert.deepEqual(receipt.external_module_inputs, expectedExternalInputs);
    assert.ok(Array.isArray(receipt.loaded_inputs));
    const loaded = validateLoaded(receipt.loaded_inputs);
    assert.ok(loaded.has(subject.source) && loaded.has(preload) && loaded.has('tooling/coverage-cli-child.ts'));
    if (subject.role === 'run-help') {
      for (const file of ['bin/cli-metadata.ts', 'bin/run-cli-options.ts', 'bin/cli-command-contracts.ts'])
        assert.ok(loaded.has(file), 'Run help metadata module was not loaded: ' + file);
      assert.ok(!loaded.has('bin/workspace-database-cli.ts'), 'Run help loaded operation-only runtime modules.');
    }
    if (runOperationRoles.has(subject.role))
      for (const file of ['bin/workspace-database-cli.ts', 'src/orchestration/local-work-admission.ts'])
        assert.ok(loaded.has(file), 'Prepared run operation module was not loaded: ' + file);
    if (subject.role === 'run-issue-wave')
      for (const file of ['src/host-state.ts', 'src/config/workspace-database-raw.ts'])
        assert.ok(loaded.has(file), 'Issue SQL observation module was not captured: ' + file);
    const coverage = proofRecord(receipt.coverage);
    assert.deepEqual(
      Object.keys(coverage),
      [path.join(context.root, subject.source)],
      'Foreign or unloaded CLI Source counter.',
    );
    return coverage;
  });
}
