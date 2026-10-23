import { randomUUID, createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  closeSync,
  fstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  realpathSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { parsePublishedFixtureIdentity } from './published-coverage-inputs.js';
import {
  capturedModuleAbsolutePath,
  capturedModuleInputs,
  capturedModuleRequestPath,
  canonicalCapturedModulePath,
  coverageEnvironmentSha256,
  repositoryRootForPackage,
} from './bun-coverage-evidence.ts';
import {
  maxInstrumentedArtifactsBytes,
  parseInstrumentedSourceDigests,
  readInstrumentedArtifact,
  type InstrumentedSourceDigest,
} from './coverage-instrumented-sources.ts';
import {
  createCliCoverageObserver,
  preparedCliInputRoles,
  focusedCliCoverage,
  readCliCoverageLaunch,
  writeCliCoverageReceipt,
  type CliCoverageContext,
} from './coverage-cli-child.ts';

type FileCoverageData = import('istanbul-lib-instrument').FileCoverageData;
type SourceDigest = { path: string; sha256: string };
type RunManifest = {
  schema: string;
  run_id: string;
  snapshot_directory: string;
  source_fingerprint: string;
  test_fingerprint: string;
  test_selection: import('./bun-coverage-evidence.ts').CoverageInputs['test_selection'];
  tests: string[];
  tool_fingerprint: string;
  runtime_executable_sha256: string;
  module_inputs: SourceDigest[];
  active_argv: string[];
  test_inputs: SourceDigest[];
  tool_inputs: SourceDigest[];
  execution_scope: Record<string, unknown>;
  sources: SourceDigest[];
  source_maps: Record<string, FileCoverageData>;
  instrumented_sources: InstrumentedSourceDigest[];
  coverage_plan?: import('./coverage-shard-plan.ts').CoverageShardPlan;
  assignment_plan_sha256?: string;
  shard_invocations?: Array<{
    shard_id: string;
    argv: string[];
    cwd: string;
    environment_sha256: string;
    output_paths: {
      coverage_directory: string;
      junit_file: string;
      log_file: string;
      receipt_directory: string;
      temp_directory: string;
    };
  }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const root = path.resolve(process.env.VIDA_BUN_COVERAGE_ROOT ?? process.cwd());
const repositoryRoot = repositoryRootForPackage(root);
const preloadPath = fileURLToPath(import.meta.url);
const digest = (bytes: string | Uint8Array) => createHash('sha256').update(bytes).digest('hex');
function environmentDigest(environment: NodeJS.ProcessEnv): string {
  return coverageEnvironmentSha256(environment);
}
const manifestPath = process.env.VIDA_BUN_COVERAGE_MANIFEST;
const reportDirectory = process.env.VIDA_BUN_COVERAGE_REPORT_DIRECTORY;
const snapshotDirectory = process.env.VIDA_BUN_COVERAGE_SNAPSHOT_DIRECTORY;
if (!manifestPath || !reportDirectory || !snapshotDirectory)
  throw new Error('Bun coverage preload requires a run manifest, snapshot and report directory.');
const manifestBytes = readFileSync(manifestPath);
const manifestValue: unknown = JSON.parse(manifestBytes.toString('utf8'));
if (!isRecord(manifestValue)) throw new Error('Bun coverage manifest must be an object.');
const manifest = manifestValue as RunManifest;
const preverifiedBootstrap = new Map<string, SourceDigest>();
let shardAssignedTests: readonly string[] = manifest.tests;
let coverageOutputPathsSha256ForReceipt:
  | ((paths: import('./coverage-shard-evidence.ts').CoverageShardInvocation['output_paths']) => string)
  | undefined;
if (
  typeof manifest.snapshot_directory !== 'string' ||
  path.resolve(snapshotDirectory) !== path.resolve(root, ...manifest.snapshot_directory.split('/'))
)
  throw new Error('Bun coverage snapshot path differs from the run manifest.');
if (
  (manifest.schema !== 'VidaBunCoverageRun/v2' && manifest.schema !== 'VidaBunCoverageRun/v3') ||
  manifest.run_id !== process.env.VIDA_BUN_COVERAGE_RUN_ID ||
  manifest.source_fingerprint !== process.env.VIDA_BUN_COVERAGE_SOURCE_FINGERPRINT ||
  manifest.test_fingerprint !== process.env.VIDA_BUN_COVERAGE_TEST_FINGERPRINT ||
  !isRecord(manifest.test_selection) ||
  manifest.test_selection.mode !== process.env.VIDA_BUN_COVERAGE_TEST_SELECTION_MODE ||
  JSON.stringify(manifest.test_selection.tests) !== JSON.stringify(manifest.tests) ||
  manifest.tool_fingerprint !== process.env.VIDA_BUN_COVERAGE_TOOL_FINGERPRINT ||
  !/^[0-9a-f]{64}$/u.test(manifest.runtime_executable_sha256) ||
  manifest.runtime_executable_sha256 !== digest(readFileSync(process.execPath)) ||
  (manifest.schema === 'VidaBunCoverageRun/v2' &&
    JSON.stringify(manifest.active_argv) !== process.env.VIDA_BUN_COVERAGE_ACTIVE_ARGV)
)
  throw new Error('Bun coverage preload received stale or mismatched run identity.');
if (manifest.schema === 'VidaBunCoverageRun/v3') {
  if ((process.env.BUN_OPTIONS ?? '').trim().length > 0)
    throw new Error('Ambient BUN_OPTIONS are unsupported for versioned coverage.');
  if (
    (manifest.test_selection.mode !== 'full-current-test-set' &&
      manifest.test_selection.mode !== 'focused-diagnostic') ||
    !manifest.coverage_plan ||
    !manifest.shard_invocations ||
    !Array.isArray(manifest.coverage_plan.waves)
  )
    throw new Error('Versioned coverage preload requires a current test assignment plan.');
  const shardId = process.env.VIDA_BUN_COVERAGE_SHARD_ID;
  const invocation = manifest.shard_invocations.find((entry) => entry.shard_id === shardId);
  const assignedRaw = process.env.VIDA_BUN_COVERAGE_ASSIGNED_TESTS;
  const assignedValue: unknown = assignedRaw ? JSON.parse(assignedRaw) : null;
  if (typeof shardId !== 'string' || shardId.length === 0)
    throw new Error('Versioned coverage preload has no shard identity.');
  if (process.env.BUN_TEST_WORKER_ID !== '1' || process.env.JEST_WORKER_ID !== '1')
    throw new Error('Versioned serial coverage preload requires worker identity 1.');
  if (!invocation) throw new Error('Versioned coverage preload has no sealed shard invocation.');
  if (JSON.stringify(invocation.argv) !== process.env.VIDA_BUN_COVERAGE_ACTIVE_ARGV)
    throw new Error('Versioned coverage preload argv differs from the sealed shard invocation.');
  if (invocation.cwd !== process.cwd())
    throw new Error('Versioned coverage preload cwd differs from the sealed shard invocation.');
  if (invocation.environment_sha256 !== environmentDigest(process.env))
    throw new Error('Versioned coverage preload environment differs from the sealed shard invocation.');
  if (
    invocation.output_paths.receipt_directory !== reportDirectory ||
    invocation.output_paths.coverage_directory !== process.env.VIDA_BUN_COVERAGE_OUTPUT_COVERAGE_DIRECTORY ||
    invocation.output_paths.junit_file !== process.env.VIDA_BUN_COVERAGE_JUNIT_FILE ||
    invocation.output_paths.log_file !== process.env.VIDA_BUN_COVERAGE_LOG_FILE ||
    invocation.output_paths.temp_directory !== process.env.VIDA_BUN_COVERAGE_TEMP_DIRECTORY
  )
    throw new Error('Versioned coverage preload outputs differ from the sealed shard invocation.');
  if (!Array.isArray(assignedValue)) throw new Error('Versioned coverage preload assigned tests are malformed.');
  const assignedTests: string[] = [];
  for (const entry of assignedValue) {
    if (typeof entry !== 'string') throw new Error('Versioned coverage preload assigned tests are malformed.');
    assignedTests.push(entry);
  }
  shardAssignedTests = Object.freeze(assignedTests);
  if (!Array.isArray(manifest.tool_inputs)) throw new Error('Versioned coverage tooling custody is missing.');
  for (const file of ['tooling/coverage-shard-evidence.ts', 'tooling/coverage-counters.ts']) {
    const expected = manifest.tool_inputs.find((entry) => entry.path === file)?.sha256;
    if (!expected) throw new Error('Versioned coverage bootstrap input is absent: ' + file);
    const bytes = readFileSync(path.join(path.resolve(snapshotDirectory), ...file.split('/')));
    if (digest(bytes) !== expected) throw new Error('Versioned coverage bootstrap bytes differ: ' + file);
    preverifiedBootstrap.set(file, { path: file, sha256: expected });
  }
  const shardEvidence = await import('./coverage-shard-evidence.ts');
  coverageOutputPathsSha256ForReceipt = shardEvidence.coverageOutputPathsSha256;
  const validateCoverageShardPreloadAssignment = shardEvidence.validateCoverageShardPreloadAssignment;
  validateCoverageShardPreloadAssignment({
    run: {
      schema: 'VidaBunCoverageRun/v3',
      run_id: manifest.run_id,
      source_fingerprint: manifest.source_fingerprint,
      test_fingerprint: manifest.test_fingerprint,
      tool_fingerprint: manifest.tool_fingerprint,
      runtime_executable_sha256: manifest.runtime_executable_sha256,
      assignment_plan_sha256: manifest.assignment_plan_sha256 ?? '',
      tests: manifest.tests,
      selected_test_inputs: manifest.test_inputs.filter((entry) => manifest.tests.includes(entry.path)),
      shard_invocations: manifest.shard_invocations,
      snapshot_directory: path.resolve(root, ...manifest.snapshot_directory.split('/')),
    },
    plan: manifest.coverage_plan,
    shard_id: shardId,
    assigned_tests: shardAssignedTests,
    shard_selection_sha256: process.env.VIDA_BUN_COVERAGE_SHARD_SELECTION_SHA256 ?? '',
  });
}
if (!Array.isArray(manifest.sources) || manifest.sources.length === 0 || !Array.isArray(manifest.module_inputs))
  throw new Error('Bun coverage source manifest is empty.');
const declaredModuleRoots = ['src', 'bin', 'tests', 'tooling'];
const expected = new Map(
  manifest.sources.map((entry) => {
    if (!isRecord(entry) || typeof entry.path !== 'string' || typeof entry.sha256 !== 'string')
      throw new Error('Bun coverage source identity is invalid.');
    return [path.resolve(root, entry.path), entry.sha256];
  }),
);
if (expected.size !== manifest.sources.length) throw new Error('Bun coverage source manifest contains duplicates.');
const capturedInputPaths = new Set(
  [...manifest.sources, ...manifest.test_inputs, ...manifest.tool_inputs].map((entry) => entry.path),
);
const instrumentedSources = parseInstrumentedSourceDigests(
  manifest.instrumented_sources,
  manifest.sources,
  capturedInputPaths,
);
const instrumentedBySource = new Map(instrumentedSources.map((entry) => [entry.path, entry] as const));
const instrumentedContents = new Map<string, string>();
let loadedArtifactBytes = 0;
function instrumentedCode(sourcePath: string) {
  const entry = instrumentedBySource.get(sourcePath);
  if (!entry) throw new Error('Coverage source has no paired instrumented artifact: ' + sourcePath);
  const cached = instrumentedContents.get(sourcePath);
  if (cached !== undefined) return cached;
  const artifact = readInstrumentedArtifact(snapshotRoot, entry);
  if (digest(artifact) !== entry.artifact_sha256)
    throw new Error('Coverage instrumented artifact digest differs: ' + sourcePath);
  loadedArtifactBytes += artifact.length;
  if (loadedArtifactBytes > maxInstrumentedArtifactsBytes)
    throw new Error('Coverage instrumented artifacts exceed total byte limit.');
  const code = new TextDecoder('utf-8', { fatal: true }).decode(artifact);
  instrumentedContents.set(sourcePath, code);
  return code;
}
const snapshotRoot = path.resolve(snapshotDirectory);
const fixture =
  manifest.test_selection.mode === 'published-baseline-bun-native'
    ? parsePublishedFixtureIdentity(manifest.test_selection.published_fixture)
    : undefined;
if (!fixture && manifest.test_selection.published_fixture !== undefined)
  throw new Error('Current coverage cannot adopt a published fixture root.');
const fixtureRoot = fixture ? path.join(snapshotRoot, fixture.directory) : undefined;
const fixtureModules = new Map(fixture?.inputs.map((entry) => [entry.path, entry.sha256]) ?? []);
const loadedFixtureInputs = new Map<string, string>();
function snapshotBytes(relative: string, expected: string) {
  const absolute = path.join(snapshotRoot, ...relative.split('/'));
  const bytes = readFileSync(absolute);
  if (digest(bytes) !== expected) throw new Error('Private snapshot bytes differ from manifest: ' + relative);
  return bytes;
}

const toolDigests = new Map(manifest.tool_inputs.map((entry) => [entry.path, entry.sha256]));
const preloadDigest = toolDigests.get('tooling/bun-coverage-preload.ts');
if (!preloadDigest || path.resolve(preloadPath) !== path.join(snapshotRoot, 'tooling', 'bun-coverage-preload.ts'))
  throw new Error('Coverage preload was not loaded from its private snapshot path.');
snapshotBytes('tooling/bun-coverage-preload.ts', preloadDigest);
preverifiedBootstrap.set('tooling/bun-coverage-preload.ts', {
  path: 'tooling/bun-coverage-preload.ts',
  sha256: preloadDigest,
});
const bootstrapInputs = [
  'tooling/bun-coverage-preload.ts',
  'tooling/bun-coverage-evidence.ts',
  'tooling/coverage-instrumented-sources.ts',
  'tooling/source-instrumentation.ts',
  'tooling/captured-json-module.ts',
  'tooling/captured-module-contents.ts',
  'tooling/maintained-source-inventory.ts',
  'tooling/published-coverage-inputs.ts',
  'tooling/fixture-child-observation.ts',
  'tooling/coverage-cli-child.ts',
  'tooling/owned-process-group.ts',
  'bin/cli-command-contracts.ts',
  'bin/run-cli-options.ts',
  ...(manifest.schema === 'VidaBunCoverageRun/v3'
    ? ['tooling/coverage-shard-evidence.ts', 'tooling/coverage-counters.ts']
    : []),
].map((file) => {
  const expectedHash = toolDigests.get(file);
  if (!expectedHash) throw new Error('Coverage bootstrap dependency is absent from tooling custody: ' + file);
  if (!preverifiedBootstrap.has(file)) snapshotBytes(file, expectedHash);
  return { path: file, sha256: expectedHash };
});

function createPreparedReadCapture() {
  const maxBytes = 4 * 1024 * 1024;
  const maxOperations = 4096;
  const targets = new Map<string, string>();
  type Stream = {
    id: string;
    fd: number;
    path: string;
    role: string;
    identity: Record<string, string>;
    length: number;
    next: number;
    reads: number;
    eof: boolean;
    complete: boolean;
    payload_ids: string[];
  };
  const streams = new Map<number, Stream>();
  const completed: Array<Record<string, unknown>> = [];
  const operations: Array<Record<string, unknown>> = [];
  const unreadOpens: Array<Record<string, unknown>> = [];
  const payloads = new Map<string, { id: string; path: string; sha256: string; bytes: string; raw: Buffer }>();
  const issues: string[] = [];
  let payloadBytes = 0;
  let nextStream = 0;
  const originalOpen = openSync;
  const originalRead = readSync;
  const originalClose = closeSync;
  const originalReadFile = readFileSync;
  const originalFstat = fstatSync;
  const identity = (fd: number) => {
    const stat = originalFstat(fd, { bigint: true });
    if (!stat.isFile() || stat.nlink !== 1n) throw new Error('Prepared input is not a regular single-link file.');
    return {
      dev: String(stat.dev),
      ino: String(stat.ino),
      size: String(stat.size),
      mode: String(stat.mode),
      nlink: String(stat.nlink),
      mtime: String(stat.mtimeNs),
      ctime: String(stat.ctimeNs),
    };
  };
  const arg = (name: string) => {
    const index = process.argv.indexOf(name);
    return index < 0 ? undefined : process.argv[index + 1];
  };
  const rootPath = arg('--project-root');
  const intakePath = arg('--intake');
  if (!rootPath || !path.isAbsolute(rootPath) || !intakePath || !path.isAbsolute(intakePath))
    throw new Error('Prepared observer requires its validated absolute root and intake.');
  const add = (file: string, role: string) => {
    const relative = path.relative(rootPath, file);
    if (
      !relative ||
      relative === '..' ||
      relative.startsWith('..' + path.sep) ||
      path.isAbsolute(relative) ||
      realpathSync(file) !== file
    )
      throw new Error('Prepared input path is not canonical within its project root.');
    const previous = targets.get(file);
    if (previous !== undefined && previous !== role) throw new Error('Prepared input roles alias the same file.');
    targets.set(file, role);
  };
  add(path.join(rootPath, 'agent-runtime.config.v1.yaml'), 'runtime-config');
  add(path.join(rootPath, '.agent', 'runtime-initialization.v1.json'), 'runtime-initialization');
  add(intakePath, 'intake');
  const derived = new Set<string>();
  const derive = (role: string, bytes: Buffer, hash: string) => {
    const key = role + ':' + hash;
    if (derived.has(key) || (role !== 'intake' && role !== 'scope')) return;
    const value: unknown = JSON.parse(bytes.toString('utf8'));
    if (!isRecord(value)) throw new Error('Prepared path input is not an object.');
    if (role === 'intake') {
      for (const [field, nextRole] of [
        ['scope_path', 'scope'],
        ['acceptance_path', 'acceptance'],
      ] as const) {
        const relative = value[field];
        if (typeof relative !== 'string' || path.isAbsolute(relative))
          throw new Error('Prepared intake path is invalid.');
        add(path.resolve(rootPath, relative), nextRole);
      }
    } else {
      const paths = value.implementation_paths;
      if (!Array.isArray(paths) || paths.length !== 1 || typeof paths[0] !== 'string' || path.isAbsolute(paths[0]))
        throw new Error('Prepared scope does not select one relative source.');
      add(path.resolve(rootPath, paths[0]), 'selected-source');
    }
    derived.add(key);
  };
  const wrappedOpen = function (this: unknown, ...call: unknown[]): number {
    const fd = Reflect.apply(originalOpen, this, call) as number;
    try {
      const file = typeof call[0] === 'string' ? realpathSync(call[0]) : '';
      const role = targets.get(file);
      if (role) {
        if (nextStream >= maxOperations || streams.has(fd))
          throw new Error('Prepared open bound or descriptor identity failed.');
        streams.set(fd, {
          id: 's' + nextStream++,
          fd,
          path: file,
          role,
          identity: identity(fd),
          length: 0,
          next: 0,
          reads: 0,
          eof: false,
          complete: true,
          payload_ids: [],
        });
      }
    } catch {
      issues.push('Prepared input open observation failed.');
    }
    return fd;
  };
  const wrappedRead = function (this: unknown, ...call: unknown[]): number {
    const stream = streams.get(Number(call[0]));
    let count: number;
    try {
      count = Reflect.apply(originalRead, this, call) as number;
    } catch (error) {
      if (stream) issues.push('Prepared native read failed.');
      throw error;
    }
    if (!stream) return count;
    stream.reads++;
    try {
      if (operations.length >= maxOperations || stream.eof)
        throw new Error('Prepared read bound or EOF ordering failed.');
      const buffer = call[1];
      const offset = call[2];
      const requested = call[3];
      const position = call[4] == null ? stream.next : call[4];
      if (
        !Buffer.isBuffer(buffer) ||
        !Number.isSafeInteger(offset) ||
        Number(offset) < 0 ||
        !Number.isSafeInteger(requested) ||
        Number(requested) < 0 ||
        !Number.isSafeInteger(count) ||
        count < 0 ||
        count > Number(requested) ||
        Number(offset) + Number(requested) > buffer.length ||
        position !== stream.next
      )
        throw new Error('Prepared native read shape is unsupported.');
      const bytes = Buffer.from(buffer.subarray(Number(offset), Number(offset) + count));
      let payloadId: string | null = null;
      if (count > 0) {
        let payload = [...payloads.values()].find((value) => value.path === stream.path && value.raw.equals(bytes));
        if (!payload) {
          if (payloadBytes + count > maxBytes) throw new Error('Prepared unique-byte bound exceeded.');
          payload = {
            id: 'p' + payloads.size,
            path: stream.path,
            sha256: digest(bytes),
            bytes: bytes.toString('base64'),
            raw: bytes,
          };
          payloads.set(payload.id, payload);
          payloadBytes += count;
        }
        payloadId = payload.id;
        stream.payload_ids.push(payloadId);
        stream.length += count;
        stream.next += count;
      } else {
        stream.eof = true;
        if (
          !stream.complete ||
          String(stream.length) !== stream.identity.size ||
          JSON.stringify(identity(stream.fd)) !== JSON.stringify(stream.identity)
        )
          throw new Error('Prepared input changed or was not completely read.');
        const chunks = stream.payload_ids.map((id) => payloads.get(id)!.raw);
        const bytes = chunks.length === 1 ? chunks[0]! : Buffer.concat(chunks);
        const hash = chunks.length === 1 ? payloads.get(stream.payload_ids[0]!)!.sha256 : digest(bytes);
        completed.push({
          id: stream.id,
          fd: stream.fd,
          role: stream.role,
          path: stream.path,
          identity: stream.identity,
          bytes: bytes.length,
          sha256: hash,
          payload_ids: [...stream.payload_ids],
          complete: true,
        });
        derive(stream.role, bytes, hash);
      }
      operations.push({
        sequence: operations.length + 1,
        stream_id: stream.id,
        fd: stream.fd,
        path: stream.path,
        role: stream.role,
        file_position: position,
        requested_position: call[4] ?? null,
        buffer_offset: offset,
        requested_count: requested,
        bytes_read: count,
        eof: count === 0,
        payload_id: payloadId,
      });
    } catch {
      stream.complete = false;
      issues.push('Prepared read observation failed.');
    }
    return count;
  };
  const wrappedClose = function (this: unknown, ...call: unknown[]): unknown {
    const stream = streams.get(Number(call[0]));
    if (stream && stream.reads > 0 && (!stream.eof || !stream.complete))
      issues.push('Prepared consumed input closed without a complete stream.');
    const result: unknown = Reflect.apply(originalClose, this, call);
    if (stream?.reads === 0)
      unreadOpens.push({ id: stream.id, fd: stream.fd, role: stream.role, path: stream.path, closed: true });
    streams.delete(Number(call[0]));
    return result;
  };
  const wrappedReadFile = function (this: unknown, ...call: unknown[]): unknown {
    try {
      const file = typeof call[0] === 'string' ? path.resolve(call[0]) : '';
      if (targets.has(file) || (typeof call[0] === 'number' && streams.has(call[0])))
        issues.push('Prepared readFileSync consumption is unsupported.');
    } catch {
      issues.push('Prepared readFileSync path observation failed.');
    }
    const result: unknown = Reflect.apply(originalReadFile, this, call);
    return result;
  };
  return {
    apis: { openSync: wrappedOpen, readSync: wrappedRead, closeSync: wrappedClose, readFileSync: wrappedReadFile },
    finish: () => {
      const roles = preparedCliInputRoles;
      for (const role of roles)
        if (!completed.some((row) => row.role === role)) issues.push('Prepared input was not consumed: ' + role);
      for (const stream of streams.values()) {
        if (stream.reads > 0) issues.push('Prepared consumed descriptor remained open.');
        else unreadOpens.push({ id: stream.id, fd: stream.fd, role: stream.role, path: stream.path, closed: false });
      }
      return {
        complete: issues.length === 0,
        issues,
        streams: completed,
        operations,
        opens_without_observed_reads: unreadOpens,
        payloads: [...payloads.values()].map(({ raw: _raw, ...payload }) => payload),
        limits: {
          max_bytes: maxBytes,
          max_operations: maxOperations,
          operations: operations.length,
          unique_bytes: payloadBytes,
        },
      };
    },
  };
}

const cliContext: CliCoverageContext = {
  root,
  snapshot: snapshotRoot,
  directory: reportDirectory,
  manifest,
  manifest_sha256: digest(manifestBytes),
};
const cliLaunch = readCliCoverageLaunch(cliContext);
const preparedReadCapture =
  cliLaunch?.subject_role === 'run-admission-prepared' ? createPreparedReadCapture() : undefined;
const rejectedCliLaunch = process.env.VIDA_BUN_COVERAGE_CLI_LAUNCH !== undefined && !cliLaunch;
const cliObserver =
  !cliLaunch && !rejectedCliLaunch && focusedCliCoverage(manifest)
    ? createCliCoverageObserver(cliContext, await import('node:child_process'))
    : undefined;
// Fixture children are subjects; observe direct APIs without granting counters
// or replacing any published command/input/environment.
const fixtureObserver = fixture
  ? (await import('./fixture-child-observation.js')).createFixtureChildObserver(await import('node:child_process'), {
      runId: manifest.run_id,
      parentPid: process.pid,
      fixtureFingerprint: digest(JSON.stringify(fixture)),
      maxOutputBytes: 32 * 1024 * 1024,
    })
  : undefined;
if (fixtureObserver || cliObserver || preparedReadCapture) {
  const { mock } = await import('bun:test');
  if (fixtureObserver || cliObserver) {
    const actual = await import('node:child_process');
    const observed = { ...fixtureObserver?.apis, ...(cliObserver ? { spawnSync: cliObserver.spawnSync } : {}) };
    await mock.module('node:child_process', () => ({
      ...actual,
      ...observed,
      default: { ...actual.default, ...observed },
    }));
  }
  if (preparedReadCapture) {
    const actual = await import('node:fs');
    const observed = preparedReadCapture.apis;
    await mock.module('node:fs', () => ({ ...actual, ...observed, default: { ...actual.default, ...observed } }));
  }
}
// Import the JSON adapter only after its captured bootstrap bytes have been verified.
const { capturedJsonModule } = await import('./captured-json-module.js');
const { capturedModuleContents } = await import('./captured-module-contents.js');
const moduleInputs = new Map(
  manifest.module_inputs.map((entry) => {
    if (!isRecord(entry) || typeof entry.path !== 'string' || typeof entry.sha256 !== 'string')
      throw new Error('Captured module input identity is invalid.');
    return [capturedModuleAbsolutePath(root, entry.path), { path: entry.path, sha256: entry.sha256 }];
  }),
);
if (moduleInputs.size !== manifest.module_inputs.length)
  throw new Error('Captured module inputs contain duplicate paths.');
const capturedPaths = new Set([
  ...moduleInputs.keys(),
  ...(fixtureRoot ? [...fixtureModules.keys()].map((file) => path.resolve(fixtureRoot, file)) : []),
]);
const expectedInputDigests = new Map(
  [...manifest.sources, ...manifest.test_inputs, ...manifest.tool_inputs].map((entry) => [entry.path, entry.sha256]),
);
const selectedTestPaths = new Set(manifest.tests);
const shardAssignedTestSet = new Set(shardAssignedTests);
const expectedModules = capturedModuleInputs({
  sources: manifest.sources,
  test_inputs: manifest.test_inputs,
  tool_inputs: manifest.tool_inputs,
});
if (JSON.stringify(expectedModules) !== JSON.stringify(manifest.module_inputs))
  throw new Error('Captured module input closure differs from manifest inputs.');
for (const entry of manifest.test_selection.tests) {
  const expectedHash = expectedInputDigests.get(entry);
  if (!expectedHash || moduleInputs.get(path.resolve(root, entry))?.sha256 !== expectedHash)
    throw new Error('Selected test is absent from the captured module closure: ' + entry);
}
const globalRecord = globalThis as unknown as Record<string, unknown>;
const coverage = (globalRecord['__vidaAgentCoverage__'] ??= {}) as Record<string, FileCoverageData>;
const sourceMaps = manifest.source_maps;
if (
  !sourceMaps ||
  typeof sourceMaps !== 'object' ||
  Array.isArray(sourceMaps) ||
  JSON.stringify(Object.keys(sourceMaps).sort()) !== JSON.stringify([...expected.keys()].sort())
)
  throw new Error('Coverage manifest source-map cardinality differs.');
for (const [file, fileCoverage] of Object.entries(sourceMaps)) coverage[file] = fileCoverage;
const loadedFiles = new Set<string>();
const externalModules = new Map<string, string>();
const loadedInputs = new Map(bootstrapInputs.map((entry) => [entry.path, entry.sha256]));

function moduleLoader(file: string): Bun.Loader {
  const extension = path.extname(file);
  const loaders = new Map<string, Bun.Loader>([
    ['.ts', 'ts'],
    ['.tsx', 'tsx'],
    ['.jsx', 'jsx'],
    ['.json', 'json'],
    ['.txt', 'text'],
    ['.js', 'js'],
    ['.mjs', 'js'],
    ['.cjs', 'js'],
    ['.mts', 'ts'],
    ['.cts', 'ts'],
    ['.yaml', 'yaml'],
    ['.yml', 'yaml'],
    ['.toml', 'toml'],
    ['.xml', 'xml'],
    ['.wasm', 'wasm'],
    ['.node', 'napi'],
    ['.svg', 'file'],
    ['.png', 'file'],
    ['.jpg', 'file'],
    ['.jpeg', 'file'],
    ['.webp', 'file'],
    ['.md', 'text'],
    ['.csv', 'text'],
  ]);
  const loader = loaders.get(extension);
  if (!loader) throw new Error('Unsupported captured local module type: ' + file);
  return loader;
}

function loadFixtureModule(file: string, relative: string) {
  const hash = fixtureModules.get(relative);
  if (!fixture || !hash) throw new Error('Uncaptured published fixture module: ' + file);
  const bytes = snapshotBytes(fixture.directory + '/' + relative, hash);
  loadedFixtureInputs.set(relative, hash);
  // Counter keys remain the canonical published source identities, independent of physical roots.
  const sourceFile = path.resolve(root, relative);
  const sourceHash = expected.get(sourceFile);
  if (sourceHash) {
    if (sourceHash !== hash) throw new Error('Published fixture source differs from measured bytes: ' + relative);
    const code = instrumentedCode(relative);
    loadedFiles.add(sourceFile);
    loadedInputs.set(relative, hash);
    return { contents: code, loader: moduleLoader(file), resolveDir: path.dirname(file) };
  }
  // Legacy logical input names are retained only where their byte binding is identical.
  if (expectedInputDigests.get(relative) === hash) loadedInputs.set(relative, hash);
  if (path.extname(file) === '.json') return capturedJsonModule(bytes);
  const loader = moduleLoader(file);
  return { contents: capturedModuleContents(bytes, loader), loader, resolveDir: path.dirname(file) };
}

function loadSnapshotModule(file: string) {
  const selectedTest = canonicalCapturedModulePath(root, file);
  if (manifest.schema === 'VidaBunCoverageRun/v3' && selectedTest && selectedTestPaths.has(selectedTest)) {
    if (!shardAssignedTestSet.has(selectedTest))
      throw new Error('Coverage shard requested a sibling test outside its assignment: ' + selectedTest);
  }
  if (fixtureRoot && file.startsWith(fixtureRoot + path.sep))
    return loadFixtureModule(file, path.relative(fixtureRoot, file).replaceAll('\\', '/'));
  const relative = path.relative(root, file).replaceAll('\\', '/');
  const sourceHash = expected.get(file);
  if (sourceHash) {
    snapshotBytes(relative, sourceHash);
    const code = instrumentedCode(relative);
    loadedFiles.add(file);
    loadedInputs.set(relative, sourceHash);
    return { contents: code, loader: moduleLoader(file), resolveDir: path.dirname(file) };
  }
  const captured = moduleInputs.get(file);
  if (captured) {
    const bytes = snapshotBytes(captured.path, captured.sha256);
    loadedInputs.set(captured.path, captured.sha256);
    if (path.extname(file) === '.json') return capturedJsonModule(bytes);
    const loader = moduleLoader(file);
    return { contents: capturedModuleContents(bytes, loader), loader, resolveDir: path.dirname(file) };
  }
  const repositoryLogicalPath = canonicalCapturedModulePath(root, file);
  const relativeToRepository = repositoryRoot ? path.relative(repositoryRoot, file) : '..';
  const isRepositoryPath =
    repositoryRoot !== null &&
    relativeToRepository !== '..' &&
    !relativeToRepository.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relativeToRepository);
  const isOutsidePackage = relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative);
  if (isOutsidePackage && isRepositoryPath && !repositoryLogicalPath?.startsWith('_repository/tooling/agent/'))
    throw new Error('Uncaptured repository module requested by test execution: ' + file);
  if (repositoryLogicalPath?.startsWith('_repository/tooling/agent/'))
    throw new Error('Uncaptured repository tooling module requested by test execution: ' + repositoryLogicalPath);
  const admitted = declaredModuleRoots.some((directory) => relative.startsWith(directory + '/'));
  if (admitted) throw new Error('Uncaptured declared module input requested by test execution: ' + file);
  const bytes = readFileSync(file);
  const hash = digest(bytes);
  const previous = externalModules.get(relative);
  if (previous && previous !== hash)
    throw new Error('Generated local module changed during test execution: ' + relative);
  externalModules.set(relative, hash);
  if (path.extname(file) === '.json') return capturedJsonModule(bytes);
  const loader = moduleLoader(file);
  return { contents: capturedModuleContents(bytes, loader), loader, resolveDir: path.dirname(file) };
}

const separatorPattern = String.raw`[/\\]`;
const escapedRoot = root.replace(/[|\\{}()[\]^$+?.*]/gu, '\\$&');
const packageModuleFilter = new RegExp(
  `^${escapedRoot}${separatorPattern}(?!.*${separatorPattern}node_modules${separatorPattern}).+`,
  'u',
);
const repositoryModuleFilter = repositoryRoot
  ? new RegExp(
      `^${repositoryRoot.replace(/[|\\{}()[\]^$+?.*]/gu, '\\$&')}${separatorPattern}(?!.*${separatorPattern}node_modules${separatorPattern}).+`,
      'u',
    )
  : packageModuleFilter;
Bun.plugin({
  name: 'vida-agent-unified-istanbul-snapshot',
  setup(build) {
    build.onLoad({ filter: repositoryModuleFilter }, (args) => {
      const file = capturedModuleRequestPath(args.path, capturedPaths);
      if (args.path.includes('?') && !capturedPaths.has(file))
        throw new Error('Uncaptured query-bearing module input requested by test execution: ' + args.path);
      return loadSnapshotModule(path.resolve(file));
    });
  },
});

function loadedInputReceipt(): SourceDigest[] {
  return [...loadedInputs]
    .map(([file, sha256]) => ({ path: file, sha256 }))
    .sort((left, right) => left.path.localeCompare(right.path));
}
function requireSelectedTestsLoaded() {
  for (const test of shardAssignedTests)
    if (!loadedInputs.has(test)) throw new Error('Selected test was not loaded from the private snapshot: ' + test);
}

let finalized = false;
if (cliLaunch) {
  process.once('exit', (code) => {
    writeCliCoverageReceipt(
      cliContext,
      cliLaunch,
      {
        loaded_inputs: loadedInputReceipt(),
        ...(preparedReadCapture ? { consumed_inputs: preparedReadCapture.finish() } : {}),
        external_module_inputs: [...externalModules].map(([file, sha256]) => ({ path: file, sha256 })),
        coverage: Object.fromEntries([...loadedFiles].sort().map((file) => [file, coverage[file]])),
      },
      code,
    );
  });
} else if (!rejectedCliLaunch) {
  // Bun test skips process exit listeners; a preload hook runs after all files.
  const { afterAll } = await import('bun:test');
  afterAll(() => {
    if (finalized) return;
    finalized = true;
    try {
      mkdirSync(reportDirectory, { recursive: true });
      const shardId = process.env.VIDA_BUN_COVERAGE_SHARD_ID;
      if (!shardId) throw new Error('Coverage child has no shard identity.');
      const fileName = `${manifest.run_id}.${shardId}.${process.pid}.${randomUUID()}.json`;
      const target = path.join(reportDirectory, fileName);
      const temporary = target + '.tmp';
      requireSelectedTestsLoaded();
      const invocation =
        manifest.schema === 'VidaBunCoverageRun/v3'
          ? manifest.shard_invocations?.find((entry) => entry.shard_id === shardId)
          : undefined;
      const assignedTests = manifest.schema === 'VidaBunCoverageRun/v3' ? shardAssignedTests : undefined;
      const report = {
        schema: manifest.schema === 'VidaBunCoverageRun/v3' ? 'VidaBunCoverageProcess/v2' : 'VidaBunCoverageProcess/v1',
        run_id: manifest.run_id,
        shard_id: shardId,
        pid: process.pid,
        source_fingerprint: manifest.source_fingerprint,
        test_fingerprint: manifest.test_fingerprint,
        test_selection: manifest.test_selection,
        tool_fingerprint: manifest.tool_fingerprint,
        module_inputs: manifest.module_inputs,
        ...(cliObserver ? { cli_children: cliObserver.finish() } : {}),
        loaded_inputs: loadedInputReceipt(),
        ...(fixture
          ? {
              published_fixture: fixture,
              fixture_children: fixtureObserver?.finish(),
              loaded_fixture_inputs: [...loadedFixtureInputs]
                .map(([file, sha256]) => ({ root_id: 'published_fixture', path: file, sha256 }))
                .sort((left, right) => left.path.localeCompare(right.path)),
            }
          : {}),
        external_module_inputs: [...externalModules]
          .map(([file, sha256]) => ({ path: file, sha256, classification: 'live-generated-local-module' }))
          .sort((left, right) => left.path.localeCompare(right.path)),
        preload_input: { path: 'tooling/bun-coverage-preload.ts', sha256: preloadDigest },
        active_argv: invocation?.argv ?? manifest.active_argv,
        execution_scope: manifest.execution_scope,
        runtime_executable_sha256: manifest.runtime_executable_sha256,
        ...(manifest.schema === 'VidaBunCoverageRun/v3'
          ? {
              assignment_plan_sha256: manifest.assignment_plan_sha256,
              assigned_tests: assignedTests,
              shard_selection_sha256: process.env.VIDA_BUN_COVERAGE_SHARD_SELECTION_SHA256,
              cwd: process.cwd(),
              environment_sha256: invocation?.environment_sha256,
              output_paths_sha256:
                invocation && coverageOutputPathsSha256ForReceipt
                  ? coverageOutputPathsSha256ForReceipt(invocation.output_paths)
                  : undefined,
            }
          : {}),
        sources: manifest.sources,
        coverage: Object.fromEntries([...loadedFiles].sort().map((file) => [file, coverage[file]])),
      };
      writeFileSync(temporary, JSON.stringify(report) + '\n', { flag: 'wx', mode: 0o600 });
      renameSync(temporary, target);
    } catch (error) {
      process.stderr.write('Bun coverage child report failed: ' + String(error) + '\n');
      throw error;
    }
  });
}
