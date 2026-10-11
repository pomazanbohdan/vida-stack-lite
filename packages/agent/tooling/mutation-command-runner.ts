import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import type { BigIntStats } from 'node:fs';
import { lstat, mkdir, open, readFile } from 'node:fs/promises';
import type { FileHandle } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalJson, sha256 } from './bun-coverage-evidence.ts';
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
  schema: 'MutationInputDescriptor/v1';
  partition: string;
  tests: string[];
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
  runId: string;
};
type MutationProcessResult = import('./mutation-evidence.ts').MutationProcessResult;
type RunnerLogs = { stdout: string; stderr: string; bodyEvents: string; adapterDirectory: string };
type RunnerIdentity = Awaited<ReturnType<typeof collectExecutionIdentity>>;

function digest(value: string): string {
  return createHash('sha256').update(value).digest('hex');
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
    'schema',
    'test_fingerprint',
    'test_inputs',
    'tests',
    'tool_fingerprint',
    'tool_inputs',
  ].sort();
  const keys = Object.keys(value).sort();
  return keys.length === expected.length && keys.every((key, index) => key === expected[index]);
}

function descriptorHasValidSelection(value: Record<string, unknown>): boolean {
  const tests = value.tests;
  return (
    value.schema === 'MutationInputDescriptor/v1' &&
    typeof value.partition === 'string' &&
    Array.isArray(tests) &&
    tests.length > 0 &&
    tests.every((test) => typeof test === 'string')
  );
}

function descriptorHasValidDigests(value: Record<string, unknown>): boolean {
  return (
    inputDigests(value.test_inputs) &&
    inputDigests(value.tool_inputs) &&
    typeof value.input_fingerprint === 'string' &&
    /^[0-9a-f]{64}$/u.test(value.input_fingerprint) &&
    typeof value.test_fingerprint === 'string' &&
    /^[0-9a-f]{64}$/u.test(value.test_fingerprint) &&
    typeof value.tool_fingerprint === 'string' &&
    /^[0-9a-f]{64}$/u.test(value.tool_fingerprint)
  );
}

function mutationInputDescriptor(value: unknown): value is MutationInputDescriptor {
  return (
    record(value) &&
    descriptorHasExactKeys(value) &&
    descriptorHasValidSelection(value) &&
    descriptorHasValidDigests(value)
  );
}

function descriptorMatchesParent(descriptor: MutationInputDescriptor, partition: string, tests: string[]): boolean {
  return (
    descriptor.partition === partition &&
    JSON.stringify(descriptor.tests) === JSON.stringify(tests) &&
    descriptor.test_fingerprint === required(process.env.AGENT_RUNTIME_TEST_FINGERPRINT, 'test fingerprint') &&
    descriptor.tool_fingerprint === required(process.env.AGENT_RUNTIME_TOOL_FINGERPRINT, 'tool fingerprint') &&
    descriptor.input_fingerprint === required(process.env.AGENT_RUNTIME_INPUT_FINGERPRINT, 'input fingerprint')
  );
}

async function verifyDescriptorFiles(root: string, entries: MutationInputDigest[]): Promise<void> {
  for (const entry of entries) {
    const absolute = path.join(root, entry.path);
    const info = await lstat(absolute);
    if (!info.isFile() || info.isSymbolicLink()) throw new Error('Mutation input is not a regular file.');
    const contents = await readFile(absolute);
    if (contents.length !== info.size || sha256(contents) !== entry.sha256)
      throw new Error('Mutation input differs from its parent snapshot.');
  }
}

function descriptorFingerprintsMatch(descriptor: MutationInputDescriptor, tests: string[]): boolean {
  const testJson = canonicalJson({ selection: tests, files: descriptor.test_inputs });
  const toolJson = canonicalJson(descriptor.tool_inputs);
  if (testJson === undefined || toolJson === undefined)
    throw new Error('Mutation input fingerprints are not serializable.');
  return sha256(testJson) === descriptor.test_fingerprint && sha256(toolJson) === descriptor.tool_fingerprint;
}

async function verifyInputDescriptor(
  root: string,
  reportDirectory: string,
  partition: string,
  tests: string[],
): Promise<MutationInputDescriptor> {
  const value = await readInputDescriptor(reportDirectory, partition);
  if (!mutationInputDescriptor(value) || !descriptorMatchesParent(value, partition, tests))
    throw new Error('Mutation input descriptor does not match its parent partition.');
  await verifyDescriptorFiles(root, value.test_inputs);
  await verifyDescriptorFiles(root, value.tool_inputs);
  if (!descriptorFingerprintsMatch(value, tests)) throw new Error('Mutation input descriptor fingerprint is invalid.');
  return value;
}

function mutationTestEnvironment(logs: RunnerLogs): Record<string, string> {
  const environment: Record<string, string> = {};
  for (const [name, value] of Object.entries(process.env)) if (typeof value === 'string') environment[name] = value;
  for (const name of [
    'AGENT_RUNTIME_MUTATION_DIRECTORY',
    'AGENT_RUNTIME_MUTATION_REPORT',
    'AGENT_RUNTIME_MUTATION_RUN_ID',
    'AGENT_RUNTIME_MUTATION_SOURCE',
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
    return await executeMutationCommand(command, process.cwd(), 45_000, {
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
  const runId = required(process.env.AGENT_RUNTIME_MUTATION_RUN_ID, 'run ID');
  if (!/^[a-z0-9-]+$/u.test(partition) || !/^[0-9a-f-]{36}$/u.test(runId))
    throw new Error('Mutation runner received an invalid partition or run ID.');
  return { root, partition, reportDirectory, tests, runId };
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
  let descriptor: MutationInputDescriptor | null = null;
  try {
    descriptor = await verifyInputDescriptor(config.root, config.reportDirectory, config.partition, config.tests);
  } catch {
    descriptor = null;
  }
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
  await persistReceipt(paths.receipt, paths.junit, logs, receipt);
  setRunnerExitCode(processResult);
  const custody = processResult.processCustody;
  if (custody?.terminationObserved === false && !custody.unrefCalled) process.exit(1);
}

try {
  await run();
} catch (error) {
  process.stderr.write(`Mutation runner could not persist evidence: ${errorCode(error)}\n`);
  process.exitCode = 1;
}
