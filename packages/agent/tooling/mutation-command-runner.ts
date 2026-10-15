import { createHash } from 'node:crypto';
import { mutationLimits } from './mutation-limits.ts';
import { constants } from 'node:fs';
import type { BigIntStats } from 'node:fs';
import { lstat, mkdir, open, readFile } from 'node:fs/promises';
import type { FileHandle } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  canonicalJson,
  capturedModuleAbsolutePath,
  sha256,
  testSelectionFingerprint,
} from './bun-coverage-evidence.ts';
import {
  buildMutationTestCommand,
  collectExecutionIdentity,
  executionIdentityDigest,
  executeMutationCommand,
  recordedMutationCommand,
} from './mutation-evidence.ts';

const junitLimit = 4 * 1024 * 1024;
const activeMutant = process.env.__STRYKER_ACTIVE_MUTANT__;

type MutationInputDigest = { path: string; sha256: string };
type MutationInputDescriptor = {
  schema: 'MutationInputDescriptor/v3';
  partition: string;
  partition_sources: string[];
  partition_source_inputs: MutationInputDigest[];
  partition_source_fingerprint: string;
  source_fingerprint: string;
  tests: string[];
  test_selection: { mode: 'full-current-test-set'; tests: string[] };
  test_inputs: MutationInputDigest[];
  tool_inputs: MutationInputDigest[];
  input_fingerprint: string;
  test_fingerprint: string;
  tool_fingerprint: string;
};
type MutationRunnerConfig = {
  root: string;
  partition: string;
  reportDirectory: string;
  tests: string[];
  sources: string[];
  partitionSourceFingerprint: string;
  sourceFingerprint: string;
  runId: string;
};
type MutationProcessResult = import('./mutation-evidence.ts').MutationProcessResult;
type RunnerLogs = { stdout: string; stderr: string; bodyEvents: string; adapterDirectory: string };
type RunnerIdentity = Awaited<ReturnType<typeof collectExecutionIdentity>>;

function digest(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function mutationPartitionSourceBinding(
  partition: string,
  sources: readonly string[],
  sourceInputs: readonly MutationInputDigest[],
): { sources: string[]; sourceInputs: MutationInputDigest[]; fingerprint: string } | null {
  if (!/^[a-z0-9-]+$/u.test(partition) || !sources.length || !sources.every((source) => typeof source === 'string'))
    return null;
  const orderedSources = [...sources].sort();
  const inputByPath = new Map<string, MutationInputDigest>();
  for (const rawEntry of sourceInputs as readonly unknown[]) {
    if (!inputDigest(rawEntry)) return null;
    const entry = rawEntry;
    if ((!entry.path.startsWith('src/') && !entry.path.startsWith('bin/')) || inputByPath.has(entry.path)) return null;
    inputByPath.set(entry.path, entry);
  }
  if (
    new Set(orderedSources).size !== orderedSources.length ||
    orderedSources.some(
      (source) => !safeInputPath(source) || (!source.startsWith('src/') && !source.startsWith('bin/')),
    ) ||
    orderedSources.some((source) => !inputByPath.has(source))
  )
    return null;
  const scopedInputs = orderedSources.map((source) => inputByPath.get(source) as MutationInputDigest);
  const canonical = canonicalJson({ partition, sources: orderedSources, source_inputs: scopedInputs });
  if (canonical === undefined) return null;
  return { sources: orderedSources, sourceInputs: scopedInputs, fingerprint: sha256(canonical) };
}

export function mutationPartitionSourceBindingMatches(
  value: unknown,
  expected: { partition: string; sources: string[]; sourceInputs: MutationInputDigest[]; fingerprint: string },
): boolean {
  if (!record(value) || value.schema !== 'MutationInputDescriptor/v3') return false;
  if (
    !Array.isArray(value.partition_sources) ||
    !value.partition_sources.every((source) => typeof source === 'string') ||
    !Array.isArray(value.partition_source_inputs) ||
    !value.partition_source_inputs.every(inputDigest)
  )
    return false;
  const actualBinding = mutationPartitionSourceBinding(
    expected.partition,
    value.partition_sources,
    value.partition_source_inputs,
  );
  return (
    value.partition === expected.partition &&
    canonicalJson(value.partition_sources) === canonicalJson(expected.sources) &&
    canonicalJson(value.partition_source_inputs) === canonicalJson(expected.sourceInputs) &&
    value.partition_source_fingerprint === expected.fingerprint &&
    actualBinding?.fingerprint === expected.fingerprint
  );
}

function required(value: string | undefined, name: string): string {
  if (!value) throw new Error(`Mutation runner is missing ${name}.`);
  return value;
}

function selectedTests(value: string): string[] {
  const tests = [];
  for (const entry of value.split(',')) {
    const file = entry.trim();
    if (file) tests.push(file);
  }
  if (!tests.length) throw new Error('Mutation runner received an invalid test selection.');
  for (const file of tests)
    if (!/^tests(?:\/[\w.-]+(?:\/[\w.-]+)*)?$/u.test(file))
      throw new Error('Mutation runner received an invalid test selection.');
  return tests;
}

function evidencePaths(reportDirectory: string, partition: string, mutantId: string | undefined) {
  const key = mutantId === undefined ? 'dry-run' : digest(mutantId);
  const basename = `${partition}-${key}`;
  return {
    junit: path.join(reportDirectory, `${basename}.xml`),
    receipt: path.join(reportDirectory, `${basename}.receipt.json`),
    stdout: path.join(reportDirectory, `${basename}.stdout.log`),
    stderr: path.join(reportDirectory, `${basename}.stderr.log`),
    bodyEvents: path.join(reportDirectory, `${basename}.body.jsonl`),
    adapterDirectory: path.join(reportDirectory, `${basename}.adapters`),
  };
}

async function readBoundedRunnerFile(file: string, allowEmpty: boolean): Promise<Buffer | null> {
  const original = await lstat(file, { bigint: true });
  if (!runnerFileWithinBound(original, allowEmpty)) return null;
  const noFollow = constants.O_NOFOLLOW ?? 0;
  const handle = await open(file, constants.O_RDONLY | constants.O_NONBLOCK | noFollow);
  try {
    const opened = await handle.stat({ bigint: true });
    if (!sameRunnerFile(opened, original)) return null;
    const bytes = await readRunnerBytes(handle, Number(original.size));
    return bytes && sameRunnerFile(await handle.stat({ bigint: true }), original) ? bytes : null;
  } finally {
    await handle.close();
  }
}

function runnerFileWithinBound(info: BigIntStats, allowEmpty: boolean): boolean {
  return info.isFile() && info.nlink === 1n && (allowEmpty || info.size > 0n) && info.size <= BigInt(junitLimit);
}

async function readRunnerBytes(handle: FileHandle, size: number): Promise<Buffer | null> {
  const bytes = Buffer.alloc(size);
  let position = 0;
  while (position < bytes.length) {
    const { bytesRead } = await handle.read(bytes, position, bytes.length - position, position);
    if (bytesRead === 0) return null;
    position += bytesRead;
  }
  return bytes;
}

function sameRunnerFile(current: BigIntStats, original: BigIntStats): boolean {
  return (
    current.isFile() &&
    current.nlink === 1n &&
    current.dev === original.dev &&
    current.ino === original.ino &&
    current.size === original.size &&
    current.mtimeNs === original.mtimeNs &&
    current.ctimeNs === original.ctimeNs
  );
}

async function junitDigest(file: string, allowEmpty = false): Promise<{ sha256: string; bytes: number } | null> {
  try {
    const bytes = await readBoundedRunnerFile(file, allowEmpty);
    if (!bytes) return null;
    return { sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length };
  } catch {
    return null;
  }
}

async function durableCreate(target: string, contents: string): Promise<void> {
  const handle = await open(target, 'wx', 0o600);
  try {
    await handle.writeFile(contents);
    await handle.sync();
  } finally {
    await handle.close();
  }
  const directory = await open(path.dirname(target), 'r');
  try {
    await directory.sync();
  } finally {
    await directory.close();
  }
}

function errorCode(error: unknown): string {
  return error !== null && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
    ? error.code
    : 'runner-error';
}

async function readInputDescriptor(reportDirectory: string, partition: string): Promise<unknown> {
  const file = path.join(reportDirectory, `${partition}.inputs.json`);
  const info = await lstat(file);
  if (!info.isFile() || info.isSymbolicLink() || info.size < 1 || info.size > junitLimit)
    throw new Error('Mutation input descriptor is missing or outside its size bound.');
  const bytes = await readFile(file);
  if (bytes.length !== info.size) throw new Error('Mutation input descriptor changed while reading.');
  const parsed: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  return parsed;
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function safeInputPath(value: string): boolean {
  return (
    value.length > 0 &&
    !path.posix.isAbsolute(value) &&
    !value.includes('\\') &&
    value.split('/').every((part) => part.length > 0 && part !== '.' && part !== '..')
  );
}

function inputDigestHasExactKeys(value: Record<string, unknown>): boolean {
  const keys = Object.keys(value).sort();
  return keys.length === 2 && keys[0] === 'path' && keys[1] === 'sha256';
}

function inputDigest(value: unknown): value is MutationInputDigest {
  return (
    record(value) &&
    inputDigestHasExactKeys(value) &&
    typeof value.path === 'string' &&
    safeInputPath(value.path) &&
    typeof value.sha256 === 'string' &&
    /^[0-9a-f]{64}$/u.test(value.sha256)
  );
}

function inputDigests(value: unknown): value is MutationInputDigest[] {
  if (!Array.isArray(value) || value.length === 0) return false;
  let previous = '';
  for (const entry of value) {
    if (!inputDigest(entry) || (previous && previous >= entry.path)) return false;
    previous = entry.path;
  }
  return true;
}

function descriptorHasExactKeys(value: Record<string, unknown>): boolean {
  const expected = [
    'input_fingerprint',
    'partition',
    'partition_source_fingerprint',
    'partition_source_inputs',
    'partition_sources',
    'schema',
    'source_fingerprint',
    'test_fingerprint',
    'test_inputs',
    'test_selection',
    'tests',
    'tool_fingerprint',
    'tool_inputs',
  ].sort();
  const keys = Object.keys(value).sort();
  return keys.length === expected.length && keys.every((key, index) => key === expected[index]);
}

function descriptorHasValidSelection(value: Record<string, unknown> & { test_inputs: MutationInputDigest[] }): boolean {
  const tests = value.tests;
  const selection = value.test_selection;
  if (
    !record(selection) ||
    Object.keys(selection).sort().join(',') !== 'mode,tests' ||
    selection.mode !== 'full-current-test-set' ||
    !Array.isArray(selection.tests) ||
    !selection.tests.length
  )
    return false;
  const boundPaths = new Set(value.test_inputs.map((entry) => entry.path));
  let previous = '';
  for (const test of selection.tests) {
    if (
      typeof test !== 'string' ||
      !safeInputPath(test) ||
      !/^tests\/[a-zA-Z0-9_./-]+$/u.test(test) ||
      test <= previous ||
      !boundPaths.has(test)
    )
      return false;
    previous = test;
  }
  const selected = new Set(selection.tests);
  return (
    value.schema === 'MutationInputDescriptor/v3' &&
    typeof value.partition === 'string' &&
    Array.isArray(tests) &&
    tests.length > 0 &&
    new Set(tests).size === tests.length &&
    tests.every((test) => selected.has(test))
  );
}

function descriptorHasValidDigests(
  value: Record<string, unknown>,
): value is Record<string, unknown> & { test_inputs: MutationInputDigest[] } {
  return (
    inputDigests(value.test_inputs) &&
    inputDigests(value.tool_inputs) &&
    inputDigests(value.partition_source_inputs) &&
    typeof value.input_fingerprint === 'string' &&
    /^[0-9a-f]{64}$/u.test(value.input_fingerprint) &&
    typeof value.test_fingerprint === 'string' &&
    /^[0-9a-f]{64}$/u.test(value.test_fingerprint) &&
    typeof value.tool_fingerprint === 'string' &&
    /^[0-9a-f]{64}$/u.test(value.tool_fingerprint) &&
    typeof value.source_fingerprint === 'string' &&
    /^[0-9a-f]{64}$/u.test(value.source_fingerprint) &&
    typeof value.partition_source_fingerprint === 'string' &&
    /^[0-9a-f]{64}$/u.test(value.partition_source_fingerprint) &&
    Array.isArray(value.partition_sources) &&
    value.partition_sources.length > 0 &&
    value.partition_sources.every((source) => typeof source === 'string' && safeInputPath(source))
  );
}

function mutationInputDescriptor(value: unknown): value is MutationInputDescriptor {
  return (
    record(value) &&
    descriptorHasExactKeys(value) &&
    descriptorHasValidDigests(value) &&
    descriptorHasValidSelection(value)
  );
}

function descriptorMatchesParent(
  descriptor: MutationInputDescriptor,
  partition: string,
  tests: string[],
  sources: string[],
  partitionSourceFingerprint: string,
  sourceFingerprint: string,
): boolean {
  return (
    descriptor.partition === partition &&
    JSON.stringify(descriptor.tests) === JSON.stringify(tests) &&
    JSON.stringify(descriptor.partition_sources) === JSON.stringify(sources) &&
    descriptor.partition_source_fingerprint === partitionSourceFingerprint &&
    descriptor.source_fingerprint === sourceFingerprint &&
    descriptor.test_fingerprint === required(process.env.AGENT_RUNTIME_TEST_FINGERPRINT, 'test fingerprint') &&
    descriptor.tool_fingerprint === required(process.env.AGENT_RUNTIME_TOOL_FINGERPRINT, 'tool fingerprint') &&
    descriptor.input_fingerprint === required(process.env.AGENT_RUNTIME_INPUT_FINGERPRINT, 'input fingerprint')
  );
}

async function verifyDescriptorFiles(root: string, entries: MutationInputDigest[]): Promise<void> {
  for (const entry of entries) {
    const packageRoot = entry.path.startsWith('_repository/')
      ? path.join(required(process.env.AGENT_RUNTIME_TEST_REPOSITORY_ROOT, 'test repository root'), 'packages/agent')
      : root;
    const absolute = capturedModuleAbsolutePath(packageRoot, entry.path);
    const info = await lstat(absolute);
    if (!info.isFile() || info.isSymbolicLink()) throw new Error('Mutation input is not a regular file.');
    const contents = await readFile(absolute);
    if (contents.length !== info.size || sha256(contents) !== entry.sha256)
      throw new Error('Mutation input differs from its parent snapshot.');
  }
}

function descriptorFingerprintsMatch(descriptor: MutationInputDescriptor): boolean {
  const toolJson = canonicalJson(descriptor.tool_inputs);
  if (toolJson === undefined) throw new Error('Mutation input fingerprints are not serializable.');
  return (
    testSelectionFingerprint(descriptor.test_selection, descriptor.test_inputs) === descriptor.test_fingerprint &&
    sha256(toolJson) === descriptor.tool_fingerprint
  );
}

type InputRejection =
  | 'descriptor-read'
  | 'descriptor-shape'
  | 'parent-binding'
  | 'source-binding'
  | 'test-inputs'
  | 'tool-inputs'
  | 'fingerprint';

export async function verifyInputDescriptor(
  root: string,
  reportDirectory: string,
  partition: string,
  tests: string[],
  sources: string[],
  partitionSourceFingerprint: string,
  sourceFingerprint: string,
): Promise<{ descriptor: MutationInputDescriptor | null; rejection: InputRejection | null }> {
  let stage: InputRejection = 'descriptor-read';
  try {
    const value = await readInputDescriptor(reportDirectory, partition);
    stage = 'descriptor-shape';
    if (!mutationInputDescriptor(value)) throw new Error('Mutation input descriptor shape is invalid.');
    stage = 'parent-binding';
    if (!descriptorMatchesParent(value, partition, tests, sources, partitionSourceFingerprint, sourceFingerprint))
      throw new Error('Mutation input descriptor does not match its parent partition.');
    stage = 'source-binding';
    const expectedBinding = mutationPartitionSourceBinding(partition, sources, value.partition_source_inputs);
    if (
      !expectedBinding ||
      !mutationPartitionSourceBindingMatches(value, {
        partition,
        sources: expectedBinding.sources,
        sourceInputs: expectedBinding.sourceInputs,
        fingerprint: partitionSourceFingerprint,
      })
    )
      throw new Error('Mutation input descriptor source binding is invalid.');
    // Stryker rewrites the active source in its sandbox. This binding attests the
    // original parent capture, so compare its metadata with the parent digest and
    // verify test/tool files here without rereading the mutated subject.
    stage = 'test-inputs';
    await verifyDescriptorFiles(root, value.test_inputs);
    stage = 'tool-inputs';
    await verifyDescriptorFiles(root, value.tool_inputs);
    stage = 'fingerprint';
    if (!descriptorFingerprintsMatch(value)) throw new Error('Mutation input descriptor fingerprint is invalid.');
    return { descriptor: value, rejection: null };
  } catch {
    return { descriptor: null, rejection: stage };
  }
}

function mutationTestEnvironment(logs: RunnerLogs): Record<string, string> {
  const environment: Record<string, string> = {};
  for (const [name, value] of Object.entries(process.env)) if (typeof value === 'string') environment[name] = value;
  for (const name of [
    'AGENT_RUNTIME_MUTATION_DIRECTORY',
    'AGENT_RUNTIME_MUTATION_REPORT',
    'AGENT_RUNTIME_MUTATION_RUN_ID',
    'AGENT_RUNTIME_MUTATION_SOURCE',
    'AGENT_RUNTIME_MUTATION_SOURCES',
    'AGENT_RUNTIME_MUTATION_PARTITION_SOURCE_FINGERPRINT',
    'AGENT_RUNTIME_MUTATION_TESTS',
    'AGENT_RUNTIME_MUTATION_SANDBOX_ROOT',
  ])
    delete environment[name];
  environment.AGENT_MUTATION_BODY_RECEIPTS = logs.bodyEvents;
  environment.AGENT_MUTATION_ADAPTER_DIRECTORY = logs.adapterDirectory;
  return environment;
}

async function executeChild(command: string[], inputsMatch: boolean, logs: RunnerLogs): Promise<MutationProcessResult> {
  if (!inputsMatch)
    return { exitCode: null, signal: null, spawnError: 'input-drift', timedOut: false, processCustody: null };
  try {
    return await executeMutationCommand(command, process.cwd(), mutationLimits.commandMs, {
      stdoutFile: logs.stdout,
      stderrFile: logs.stderr,
      env: mutationTestEnvironment(logs),
    });
  } catch (error) {
    return { exitCode: null, signal: null, spawnError: errorCode(error), timedOut: false, processCustody: null };
  }
}

async function persistReceipt(
  receiptPath: string,
  junitPath: string,
  logs: Pick<RunnerLogs, 'stdout' | 'stderr' | 'bodyEvents'>,
  receiptData: Record<string, unknown>,
): Promise<void> {
  const junit = await junitDigest(junitPath);
  const bodyEvents = await junitDigest(logs.bodyEvents, true);
  const receipt = {
    ...receiptData,
    command_deadline_ms: mutationLimits.commandMs,
    junit_file: path.basename(junitPath),
    junit_sha256: junit?.sha256 ?? null,
    junit_bytes: junit?.bytes ?? null,
    body_events_file: path.basename(logs.bodyEvents),
    body_events_sha256: bodyEvents?.sha256 ?? null,
    body_events_bytes: bodyEvents?.bytes ?? null,
    stdout_file: path.basename(logs.stdout),
    stderr_file: path.basename(logs.stderr),
    stdout_capture: capturedStream(receiptData, 'stdout'),
    stderr_capture: capturedStream(receiptData, 'stderr'),
  };
  await durableCreate(receiptPath, `${JSON.stringify(receipt)}\n`);
}

function capturedStream(receipt: Record<string, unknown>, stream: 'stdout' | 'stderr'): Record<string, unknown> | null {
  const output = receipt.output_capture;
  if (!record(output) || !record(output[stream])) return null;
  return output[stream];
}

function setRunnerExitCode(processResult: Pick<MutationProcessResult, 'exitCode' | 'spawnError'>): void {
  process.exitCode = processResult.spawnError ? 1 : (processResult.exitCode ?? 1);
}

function runnerConfig(): MutationRunnerConfig {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const partition = required(process.env.AGENT_RUNTIME_MUTATION_PARTITION, 'partition');
  const reportDirectory = path.resolve(required(process.env.AGENT_RUNTIME_MUTATION_DIRECTORY, 'report directory'));
  const tests = selectedTests(required(process.env.AGENT_RUNTIME_MUTATION_TESTS, 'tests'));
  const rawSources = required(process.env.AGENT_RUNTIME_MUTATION_SOURCES, 'sources');
  const sources: unknown = JSON.parse(rawSources);
  if (!Array.isArray(sources) || !sources.length || sources.some((source) => typeof source !== 'string'))
    throw new Error('Mutation runner received an invalid source selection.');
  const orderedSources = [...(sources as string[])].sort();
  if (
    new Set(orderedSources).size !== orderedSources.length ||
    orderedSources.some((source) => !safeInputPath(source)) ||
    JSON.stringify(orderedSources) !== rawSources
  )
    throw new Error('Mutation runner received an invalid source selection.');
  const partitionSourceFingerprint = required(
    process.env.AGENT_RUNTIME_MUTATION_PARTITION_SOURCE_FINGERPRINT,
    'partition source fingerprint',
  );
  const sourceFingerprint = required(process.env.AGENT_RUNTIME_SOURCE_FINGERPRINT, 'source fingerprint');
  const runId = required(process.env.AGENT_RUNTIME_MUTATION_RUN_ID, 'run ID');
  if (
    !/^[a-z0-9-]+$/u.test(partition) ||
    !/^[0-9a-f-]{36}$/u.test(runId) ||
    !/^[0-9a-f]{64}$/u.test(partitionSourceFingerprint) ||
    !/^[0-9a-f]{64}$/u.test(sourceFingerprint)
  )
    throw new Error('Mutation runner received an invalid partition or run ID.');
  return {
    root,
    partition,
    reportDirectory,
    tests,
    sources: orderedSources,
    partitionSourceFingerprint,
    sourceFingerprint,
    runId,
  };
}

async function runnerIdentity(
  root: string,
  tests: string[],
  command: string[],
  descriptor: MutationInputDescriptor | null,
): Promise<RunnerIdentity> {
  return collectExecutionIdentity({
    executable: process.execPath,
    cwd: process.cwd(),
    packageRoot: root,
    sandboxRoot: required(process.env.AGENT_RUNTIME_MUTATION_SANDBOX_ROOT, 'Stryker sandbox root'),
    command,
    tests,
    sourceFingerprint: required(process.env.AGENT_RUNTIME_SOURCE_FINGERPRINT, 'source fingerprint'),
    testFingerprint: descriptor?.test_fingerprint ?? '',
    toolFingerprint: descriptor?.tool_fingerprint ?? '',
    bunVersion: process.versions.bun ?? '',
    platform: process.platform,
    arch: process.arch,
  });
}

function runnerReceipt(
  config: MutationRunnerConfig,
  tests: string[],
  command: string[],
  descriptor: MutationInputDescriptor | null,
  identity: RunnerIdentity,
  afterIdentity: RunnerIdentity,
  processResult: MutationProcessResult,
  started: number,
): Record<string, unknown> {
  return {
    schema: 'MutationRunnerReceipt/v3',
    run_id: config.runId,
    partition: config.partition,
    active_mutant_id: activeMutant ?? null,
    test_files: tests,
    input_fingerprint: required(process.env.AGENT_RUNTIME_INPUT_FINGERPRINT, 'input fingerprint'),
    source_fingerprint: required(process.env.AGENT_RUNTIME_SOURCE_FINGERPRINT, 'source fingerprint'),
    partition_sources: config.sources,
    partition_source_fingerprint: config.partitionSourceFingerprint,
    test_fingerprint: descriptor?.test_fingerprint ?? '',
    tool_fingerprint: descriptor?.tool_fingerprint ?? '',
    command: recordedMutationCommand(command),
    execution_identity: identity,
    execution_identity_digest: executionIdentityDigest(identity),
    execution_identity_after_digest: executionIdentityDigest(afterIdentity),
    started_monotonic_ms: started,
    elapsed_ms: Math.max(0, Math.round(performance.now() - started)),
    exit_code: processResult.exitCode,
    signal: processResult.signal,
    spawn_error: processResult.spawnError,
    timed_out: processResult.timedOut,
    process_custody: processResult.processCustody ?? null,
    output_capture: processResult.output_capture ?? null,
  };
}

async function run(): Promise<void> {
  const config = runnerConfig();
  const paths = evidencePaths(config.reportDirectory, config.partition, activeMutant);
  const command = buildMutationTestCommand(process.execPath, config.tests, paths.junit);
  const { descriptor, rejection } = await verifyInputDescriptor(
    config.root,
    config.reportDirectory,
    config.partition,
    config.tests,
    config.sources,
    config.partitionSourceFingerprint,
    config.sourceFingerprint,
  );
  const logs: RunnerLogs = {
    stdout: paths.stdout,
    stderr: paths.stderr,
    bodyEvents: paths.bodyEvents,
    adapterDirectory: paths.adapterDirectory,
  };
  await durableCreate(paths.bodyEvents, '');
  await mkdir(paths.adapterDirectory, { mode: 0o700 });
  const identity = await runnerIdentity(config.root, config.tests, command, descriptor);
  const started = performance.now();
  let processResult = await executeChild(command, descriptor !== null, logs);
  let afterIdentity: RunnerIdentity;
  try {
    afterIdentity = await runnerIdentity(config.root, config.tests, command, descriptor);
    if (identity.bun_executable_sha256 !== afterIdentity.bun_executable_sha256)
      processResult = { ...processResult, spawnError: 'bun-executable-changed' };
  } catch {
    processResult = { ...processResult, spawnError: 'bun-executable-after-check-failed' };
    afterIdentity = identity;
  }
  const receipt = runnerReceipt(
    config,
    config.tests,
    command,
    descriptor,
    identity,
    afterIdentity,
    processResult,
    started,
  );
  await persistReceipt(paths.receipt, paths.junit, logs, { ...receipt, input_rejection: rejection });
  setRunnerExitCode(processResult);
  const custody = processResult.processCustody;
  if (custody?.terminationObserved === false && !custody.unrefCalled) process.exit(1);
}

if (import.meta.main) {
  try {
    await run();
  } catch (error) {
    process.stderr.write(`Mutation runner could not persist evidence: ${errorCode(error)}\n`);
    process.exitCode = 1;
  }
}
