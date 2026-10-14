import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { afterEach, test as baseTest } from 'bun:test';
import type JSZipConstructor from 'jszip';
import { pinnedEnvironment, readPin } from '../bin/bun.ts';
import {
  releaseDigest as sha,
  releaseJSON as json,
  releaseSourceBinding,
  releaseState,
  operationMutex,
  admissionMutex,
  assertReleaseRetargetSettled,
} from '../bin/local-release-artifacts.ts';
import {
  stageNativeRetargetCandidate,
  planReleaseRetarget,
  applyReleaseRetarget,
  inspectReleaseRetarget,
  runReleaseRetarget,
  readNativeRetargetCandidate,
} from '../bin/repair-release-retarget.ts';
import {
  reserveReleaseWorker,
  claimReleaseWorker,
  withReleaseAdmission,
  runCommand,
} from '../../../tooling/agent/release-local.ts';
import {
  testInputBinding,
  verifyLocalReleaseTests,
  verifyLocalReleaseAssurance,
} from '../../../tooling/agent/release-assurance.ts';
import {
  recordCIDeliveryRequest,
  encodeCIDeliveryResult,
  validateCIDeliveryObservation,
  verifyCIDeliveryEvidence,
  nativeDeliveryChecks,
  downloadGitHubCIDelivery,
  validateCIArtifactAttempt,
  validateCIDownloadLocation,
  ciTransportLimit,
  validateCIZIPReaderVersions,
  observeGitHubCIDelivery,
} from '../../../tooling/agent/release-ci-evidence.ts';
import {
  validateNativeCIInvocation,
  validateNativeCIReceipts,
  validateNativeCIDenial,
  validateNativeCIUnadmittedRun,
  validateNativeCICommandDenialInventory,
  nativeCIDenialDiagnostics,
  createNativeCICommandRunner,
  nativeCIUnadmittedWorkflowDenial,
} from '../../../tooling/agent/native-ci-delivery.ts';
import { cliCommandNames } from '../bin/cli-command-contracts.ts';
import { standaloneBuildInputInventory } from '../tooling/maintained-source-inventory.ts';

const roots = new Set<string>(),
  operation = 'local-original',
  version = '0.1.2';
const folder = '.agent/work/agent-local-release/' + operation;
const pending = '.agent/work/agent-local-release/pending.json';
const successful = '.agent/work/agent-local-release/successful.json';
const archive = '.tmp/releases/' + operation + '/vida-agent-0.1.2.tgz';
let activeCases = 0,
  outcomeUnknown = false;
type RetargetFixture = {
  root: string;
  original: Record<string, unknown>;
  oldBytes: Buffer;
  bytes: Buffer;
  input: { root: string; operation: string };
  stage: () => Promise<unknown>;
};
type RetargetPlanFixture = {
  custody: Array<{ copy: string; path: string; sha256: string }>;
  release_after: Record<string, unknown>;
  digest: string;
};
type NativeCandidateFixture = ReturnType<typeof readNativeRetargetCandidate>;
type NativeCIReceiptInput = Parameters<typeof validateNativeCIReceipts>[0];
type NativeCICandidate = NativeCIReceiptInput['candidate'];
type CIDeliveryObservationInput = Parameters<typeof validateCIDeliveryObservation>[0];
type CIDeliveryRequest = CIDeliveryObservationInput['request'];
type CIDeliveryCandidate = CIDeliveryObservationInput['candidate'];
type CIDeliveryObservation = CIDeliveryObservationInput['observation'];
type CIObservationInput = { request: CIDeliveryRequest; candidate: CIDeliveryCandidate };
type DenialExpectation = Parameters<typeof validateNativeCIDenial>[1];
type PackFile = { path: string; size: number };
type CommandReceipt = {
  command: string;
  args: string[];
  code: number | null;
  signal: string | null;
  elapsed_ms: number;
  stdout: string;
  stderr: string;
};
type RunCommandOptions = {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  log?: string;
  windowsVerbatimArguments?: boolean;
};
const runCommandWithReleaseOptions: (command: string, args: string[], options?: RunCommandOptions) => Promise<string> =
  runCommand;
type CIPhaseMutation = (record: Record<string, unknown>) => void;
type DependencyCacheEvidence = {
  id: number;
  key: string;
  ref: string;
  version: string;
  size_in_bytes: number;
  restore: 'miss';
  matched_key: null;
  save: 'confirmed';
  save_action: 'success';
};
type FetchInput = Parameters<typeof fetch>[0];
type FetchOptions = Parameters<typeof fetch>[1];
type FetchObservation = { url: string; options: FetchOptions | undefined };
function fetchURL(input: FetchInput): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}
function mockedFetch(
  original: typeof fetch,
  implementation: (input: FetchInput, options?: FetchOptions) => Promise<Response>,
): typeof fetch {
  return Object.assign(implementation, { preconnect: original.preconnect });
}
function hasAuthorization(options: FetchOptions | undefined, expected: string): boolean {
  return options?.headers !== undefined && new Headers(options.headers).get('Authorization') === expected;
}
function dependencyCacheFixture(): DependencyCacheEvidence {
  return {
    id: 1,
    key: 'vida-bun-install-v1-lock-bun-1.4.2-' + 'a'.repeat(64),
    ref: 'refs/heads/main',
    version: 'inert fixture cache version',
    size_in_bytes: 1,
    restore: 'miss',
    matched_key: null,
    save: 'confirmed',
    save_action: 'success',
  };
}
function pinnedZIPReaderFixture() {
  return {
    declared: { dependencies: { '@openclaw/fs-safe': '0.25.0' } },
    lock: '{"jszip": ["jszip@3.10.2", "", {}]}',
    fsSafe: { name: '@openclaw/fs-safe', version: '0.25.0' },
    zip: { name: 'jszip', version: '3.10.2' },
  };
}
type GitHubArtifactMutation = (artifact: {
  created_at: string;
  name: string;
  workflow_run: { head_sha: string };
  expired: boolean;
}) => void;
type ZIPPinMutation = (value: {
  declared: { dependencies: Record<string, string> };
  lock: string;
  fsSafe: { name: string; version: string };
  zip: { name: string; version: string };
}) => void;
function test(name: string, execute: () => Promise<void> | void): void {
  return baseTest(name, async () => {
    assert.equal(outcomeUnknown, false, 'Prior fixture outcome is UNKNOWN; no reuse');
    activeCases++;
    try {
      await execute();
    } finally {
      activeCases--;
    }
  });
}
afterEach(() => {
  if (activeCases > 0) {
    outcomeUnknown = true;
    console.error('UNKNOWN asynchronous fixture outcome; retain owned roots:', [...roots]);
  }
  if (outcomeUnknown) return;
  for (const root of roots) {
    assert.equal(path.dirname(root), path.resolve(tmpdir()));
    assert.ok(path.basename(root).startsWith('vida-retarget-state-'));
    rmSync(root, { recursive: true, force: true });
  }
  roots.clear();
});
const read = (root: string, file: string) => readFileSync(path.join(root, file));
function isFixtureRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function typedFixtureIO<T>(text: string, validate: (value: unknown) => value is T): T {
  const value: unknown = JSON.parse(text);
  if (!validate(value)) throw new Error('Fixture JSON does not satisfy its expected shape.');
  return value;
}
function fixtureRecord(value: unknown): value is Record<string, unknown> {
  return isFixtureRecord(value);
}
const obj = (root: string, file: string): Record<string, unknown> =>
  typedFixtureIO(read(root, file).toString('utf8'), fixtureRecord);
function isRetargetPlanFixture(value: unknown): value is RetargetPlanFixture {
  if (!isFixtureRecord(value) || !Array.isArray(value.custody) || !isFixtureRecord(value.release_after)) return false;
  return (
    value.custody.every(
      (entry) =>
        isFixtureRecord(entry) &&
        typeof entry.copy === 'string' &&
        typeof entry.path === 'string' &&
        typeof entry.sha256 === 'string',
    ) && typeof value.digest === 'string'
  );
}
const retargetPlan = (root: string): RetargetPlanFixture =>
  typedFixtureIO(read(root, folder + '/retarget/plan.json').toString('utf8'), isRetargetPlanFixture);
function readCandidate(input: { root: string; operation: string; published?: boolean }): NativeCandidateFixture {
  return readNativeRetargetCandidate(input);
}
function readCandidateWithoutSourceDist(input: {
  root: string;
  operation: string;
  published?: boolean;
}): NativeCandidateFixture {
  const sourceDist = path.join(input.root, 'packages/agent/dist'),
    heldDist = path.join(input.root, '.tmp/held-source-dist');
  renameSync(sourceDist, heldDist);
  try {
    assert.equal(existsSync(sourceDist), false);
    return readCandidate(input);
  } finally {
    renameSync(heldDist, sourceDist);
  }
}

function requestForCI(args: Parameters<typeof recordCIDeliveryRequest>[0]): CIDeliveryRequest {
  const request = recordCIDeliveryRequest(args);
  if (request.schema !== 'VidaCIDeliveryRequest/v1') throw new Error('CI request schema differs.');
  return { ...request, schema: 'VidaCIDeliveryRequest/v1' };
}

function nativeCandidateForRequest(request: CIDeliveryRequest, archive: Buffer): NativeCICandidate {
  const asset = Buffer.from('inert native asset fixture; never execute');
  return {
    operation_id: request.operation_id,
    version: request.version,
    source_binding: request.source_binding,
    archive_sha256: sha(archive),
    manifest_sha256: sha('inert native manifest'),
    pack_metadata: [
      {
        name: 'vida-agent',
        version: request.version,
        filename: 'vida-agent-' + request.version + '.tgz',
        files: [{ path: 'dist/standalone/manifest.json', size: 1 }],
      },
    ],
    manifest: {
      schema: 'VidaStandaloneBuild/v1',
      version: request.version,
      pin: '1.4.2',
      target: request.target,
      inputs: [{ path: 'src/index.ts', bytes: 1, sha256: sha('inert source') }],
      asset: { file: 'vida-agent-' + request.target, sha256: sha(asset), bytes: asset.length },
      payloadId: sha('inert payload'),
    },
  };
}

function malformedObservation(value: unknown): CIDeliveryObservation {
  return value as CIDeliveryObservation;
}

function ciCandidateForRequest(request: CIDeliveryRequest, archive: Buffer): CIDeliveryCandidate {
  const assetBytes = Buffer.from('inert fixture native asset; never execute');
  return {
    operation_id: request.operation_id,
    version: request.version,
    source_binding: request.source_binding,
    archive_sha256: sha(archive),
    manifest_sha256: sha('inert fixture manifest'),
    pack_metadata: [
      {
        name: 'vida-agent',
        version: request.version,
        filename: 'vida-agent-' + request.version + '.tgz',
        files: [{ path: 'dist/standalone/manifest.json', size: 1 }],
      },
    ],
    manifest: {
      schema: 'VidaStandaloneBuild/v1',
      version: request.version,
      pin: '1.4.2',
      target: request.target,
      inputs: [{ path: 'src/index.ts', bytes: 1, sha256: sha('inert fixture source') }],
      payloadId: sha('inert fixture payload'),
      asset: {
        file: 'vida-agent-' + request.target + (request.target.startsWith('bun-windows-') ? '.exe' : ''),
        bytes: assetBytes.length,
        sha256: sha(assetBytes),
      },
    },
  };
}

function write(root: string, file: string, value: string | Buffer | NodeJS.ArrayBufferView | object) {
  mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  writeFileSync(path.join(root, file), typeof value === 'object' && !Buffer.isBuffer(value) ? json(value) : value);
}
function metadata(bytes: Buffer, files: PackFile[]) {
  return [
    {
      name: 'vida-agent',
      version,
      filename: 'vida-agent-0.1.2.tgz',
      integrity: 'sha512-' + createHash('sha512').update(bytes).digest('base64'),
      files,
    },
  ];
}
function isCommandReceipt(value: unknown): value is CommandReceipt {
  if (typeof value !== 'object' || value === null) return false;
  const receipt = value as Partial<CommandReceipt>;
  return (
    typeof receipt.command === 'string' &&
    Array.isArray(receipt.args) &&
    Number.isFinite(receipt.elapsed_ms) &&
    typeof receipt.stdout === 'string' &&
    typeof receipt.stderr === 'string' &&
    ((Number.isInteger(receipt.code) && receipt.signal === null) ||
      (receipt.code === null && typeof receipt.signal === 'string' && receipt.signal.length > 0))
  );
}
test('ordinary command failures retain bounded stdout and stderr diagnostics with full terminal receipts', async () => {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-retarget-state-command-'));
  roots.add(root);
  const successArgs = [
    '--no-env-file',
    '--no-install',
    '-e',
    'process.stdout.write("  result  \\n");process.stderr.write("ordinary warning")',
  ];
  const commands: Array<{ mode: string; args: string[] }> = [
    ...['stdout', 'stderr', 'both'].map((mode) => {
      const script = `const mode=${JSON.stringify(mode)};if(mode!=='stderr')process.stdout.write('x'.repeat(2050)+'stdout diagnostic');if(mode!=='stdout')process.stderr.write('y'.repeat(2050)+'stderr diagnostic');process.exit(2)`;
      return { mode, args: ['--no-env-file', '--no-install', '-e', script] };
    }),
    { mode: 'success', args: successArgs },
  ];
  const started = process.hrtime.bigint();
  let deadlineTimer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<{ kind: 'deadline' }>((resolve) => {
    deadlineTimer = setTimeout(() => resolve({ kind: 'deadline' }), 4000);
  });
  const observations = Promise.allSettled(
    commands.map(async ({ mode, args }) => {
      let value,
        message = null;
      try {
        value = await runCommandWithReleaseOptions(process.execPath, args, {
          cwd: root,
          env: pinnedEnvironment(process.execPath),
          log: path.resolve(root, mode + '.json'),
        });
      } catch (error) {
        assert.ok(error instanceof Error);
        message = error.message;
      }
      writeFileSync(
        path.resolve(root, mode + '-observed.json'),
        json(mode === 'success' ? { value, message } : { message, args }),
      );
    }),
  );
  let joined: { kind: 'settled'; results: PromiseSettledResult<void>[] } | { kind: 'deadline' };
  try {
    joined = await Promise.race([observations.then((results) => ({ kind: 'settled' as const, results })), deadline]);
  } finally {
    if (deadlineTimer) clearTimeout(deadlineTimer);
  }
  const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;
  if (joined.kind !== 'settled' || elapsedMs > 4000) {
    outcomeUnknown = true;
    assert.fail(
      'UNKNOWN ordinary command observations exceeded the 4000ms deadline; retain root and partial streams: ' + root,
    );
  }
  const receipts: Record<string, CommandReceipt> = {};
  for (const { mode } of commands) {
    const log = path.resolve(root, mode + '.json');
    if (!existsSync(log)) {
      outcomeUnknown = true;
      assert.fail('UNKNOWN ordinary command close receipt missing; retain root and child state: ' + root);
    }
    let receipt;
    try {
      receipt = typedFixtureIO(readFileSync(log, 'utf8'), isCommandReceipt);
    } catch {
      outcomeUnknown = true;
      assert.fail('UNKNOWN ordinary command close receipt incomplete; retain root and child state: ' + root);
    }
    if (!isCommandReceipt(receipt)) {
      outcomeUnknown = true;
      assert.fail('UNKNOWN ordinary command close receipt partial; retain root and child state: ' + root);
    }
    receipts[mode] = receipt;
  }
  if (joined.results.some((result) => result.status !== 'fulfilled')) {
    assert.fail('Ordinary command observation record could not be saved after terminal receipts: ' + root);
  }
  for (const mode of ['stdout', 'stderr', 'both']) {
    const script = `const mode=${JSON.stringify(mode)};if(mode!=='stderr')process.stdout.write('x'.repeat(2050)+'stdout diagnostic');if(mode!=='stdout')process.stderr.write('y'.repeat(2050)+'stderr diagnostic');process.exit(2)`;
    const args = ['--no-env-file', '--no-install', '-e', script];
    const observed = typedFixtureIO(readFileSync(path.join(root, mode + '-observed.json'), 'utf8'), fixtureRecord);
    assert.equal(typeof observed.message, 'string', 'Nonzero command must reject');
    assert.deepEqual(observed.args, args);
    const message = String(observed.message);
    const body = message.slice(message.indexOf('\n') + 1);
    assert.ok(body.includes('\nstdout:\n'), 'Output must be in the diagnostic body, not literal command arguments');
    assert.ok(body.includes('stderr:\n'));
    assert.ok(body.length <= 4096 + 32, 'Each diagnostic stream tail stays bounded');
    const receipt = receipts[mode];
    assert.ok(receipt);
    assert.equal(receipt.code, 2);
    assert.equal(receipt.signal, null);
    assert.equal(receipt.command, process.execPath);
    assert.deepEqual(receipt.args, args);
    const stdout = mode === 'stderr' ? '' : 'x'.repeat(2050) + 'stdout diagnostic';
    const stderr = mode === 'stdout' ? '' : 'y'.repeat(2050) + 'stderr diagnostic';
    assert.equal(receipt.stdout, stdout, 'Full saved stdout is not truncated');
    assert.equal(receipt.stderr, stderr, 'Full saved stderr is not truncated');
    assert.equal(body, 'stderr:\n' + stderr.slice(-2048) + '\nstdout:\n' + stdout.slice(-2048));
  }
  assert.equal(
    typedFixtureIO(readFileSync(path.join(root, 'success-observed.json'), 'utf8'), fixtureRecord).value,
    'result',
  );
  const success = receipts.success;
  assert.ok(success);
  assert.equal(success.command, process.execPath);
  assert.deepEqual(success.args, successArgs);
  assert.equal(success.code, 0);
  assert.equal(success.signal, null);
  assert.equal(success.stdout, '  result  \n');
  assert.equal(success.stderr, 'ordinary warning');
});
// Tiny inert archive members are state-machine fixtures; no build, package command or installation is executed.
async function fixture({ success = false }: { success?: boolean } = {}): Promise<RetargetFixture> {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-retarget-state-'));
  roots.add(root);
  const manifest = {
    name: 'vida-agent',
    version,
    files: [
      'bin/**',
      'lib.js',
      'dist/src/**',
      'dist/standalone/**',
      'dist/schemas/**',
      'instructions/**',
      'schemas/**',
      'src/**',
      'templates/**',
      'tooling/**',
      'TESTING.md',
      '.bun-version',
      'bun.lock',
      'bunfig.toml',
    ],
    bin: { 'vida-agent': './bin/vida-agent.ts' },
    type: 'module',
    main: './dist/src/index.js',
    types: './dist/src/index.d.ts',
    exports: {
      '.': {
        types: './dist/src/index.d.ts',
        import: './dist/src/index.js',
        default: './dist/src/index.js',
      },
      './trusted-host': {
        types: './dist/src/trusted-host.d.ts',
        'agent-runtime-host': './dist/src/trusted-host.js',
      },
    },
    engines: { bun: '1.4.2' },
    packageManager: 'bun@1.4.2',
  };
  write(root, 'packages/agent/package.json', manifest);
  write(root, 'packages/agent/lib.js', 'export const inert = 1;\n');
  const sourceFiles: Record<string, string> = {
    'bin/vida-agent.ts': '#!/usr/bin/env node\n// inert development fixture entrypoint\n',
    'tooling/maintained-source-inventory.ts': '// inert inventory fixture\n',
    'tooling/build-standalone.ts': '// inert build fixture; never executed\n',
    'tooling/pack-sdk.ts': '// inert pack fixture; never executed\n',
    'tooling/owned-staging.ts': '// inert staging fixture; never executed\n',
    'src/index.ts': 'export const inert = true;\n',
    'dist/src/index.js': 'export const inert = true;\n',
    'dist/src/index.d.ts': 'export declare const inert: boolean;\n',
    'dist/src/runtime.js': 'export const inertRuntime = true;\n',
    'dist/src/trusted-host.js': 'export const inertHost = true;\n',
    'dist/src/trusted-host.d.ts': 'export declare const inertHost: boolean;\n',
    'dist/src/documentation/transition-proof.js': 'export const inertProof = true;\n',
    'schemas/fixture.v1.schema.json': '{"$schema":"https://json-schema.org/draft/2020-12/schema","type":"object"}\n',
    'dist/schemas/fixture.v1.schema.json':
      '{"$schema":"https://json-schema.org/draft/2020-12/schema","type":"object"}\n',
    'instructions/README.md': '# Inert instruction fixture\n',
    'templates/agent-runtime.config.template.v1.yaml': 'schema: inert-fixture\n',
    'TESTING.md': '# Inert development fixture\n',
    '.bun-version': '1.4.2\n',
    'bun.lock': '{"lockfileVersion":1,"workspaces":{}}\n',
    'bunfig.toml': '[install]\n',
  };
  for (const [file, contents] of Object.entries(sourceFiles)) write(root, 'packages/agent/' + file, contents);
  for (const file of [
    'package.json',
    'agent-runtime.config.v1.yaml',
    'AGENT.sidecar.md',
    'tooling/agent/release-local.ts',
    'tooling/agent/release-assurance.ts',
    'tooling/agent/release-ci-evidence.ts',
    'tooling/agent/native-ci-delivery.ts',
    'tooling/agent/controllers/forward-review-proof.ts',
    '.github/workflows/agent-native-delivery.yml',
  ])
    write(root, file, '{}\n');
  const oldBytes = Buffer.from('retained inert SDK provenance');
  const original = {
    schema: 'VidaLocalReleaseState/v1',
    operation_id: operation,
    version,
    status: 'awaiting_assurance',
    pid: 12345,
    elapsed_ms: 7,
    source_binding: sha('old Source'),
    pack_metadata: metadata(oldBytes, [{ path: 'lib.js', size: 1 }]),
    tarball_sha256: sha(oldBytes),
  };
  write(root, folder + '/release.json', original);
  write(root, pending, { schema: original.schema, operation_id: operation, version, status: 'awaiting_assurance' });
  if (success)
    write(root, successful, {
      schema: original.schema,
      operation_id: 'local-prior',
      version: '0.1.1',
      status: 'successful',
    });
  write(root, archive, oldBytes);
  write(root, '.tmp/old-log.json', { command: 'inert', exit_code: 1 });
  write(root, '.tmp/old-input.json', { observed: 'UNKNOWN' });
  write(root, folder + '/tests.json', { tests: [{ path: '.tmp/old-log.json', inputs: ['.tmp/old-input.json'] }] });
  write(root, folder + '/source-seal.json', { entries: [{ path: 'packages/agent/lib.js', sha256: sha('old') }] });
  const asset = Buffer.from('inert bytes; never execute'),
    file = 'vida-agent-bun-linux-x64';
  const inputs = standaloneBuildInputInventory(path.join(root, 'packages/agent')).map((file) => {
    const bytes = read(root, 'packages/agent/' + file);
    return { path: file, bytes: bytes.length, sha256: sha(bytes) };
  });
  const native = {
    schema: 'VidaStandaloneBuild/v1',
    version,
    pin: '1.4.2',
    target: 'bun-linux-x64',
    payloadId: sha('inert embedded payload'),
    inputs,
    asset: { file, bytes: asset.length, sha256: sha(asset) },
  };
  const contents = {
    'package/package.json': json(manifest),
    'package/lib.js': read(root, 'packages/agent/lib.js'),
    'package/dist/src/index.d.ts': read(root, 'packages/agent/dist/src/index.d.ts'),
    'package/dist/src/trusted-host.d.ts': read(root, 'packages/agent/dist/src/trusted-host.d.ts'),
    ...Object.fromEntries(inputs.map(({ path: file }) => ['package/' + file, read(root, 'packages/agent/' + file)])),
    'package/dist/standalone/manifest.json': json(native),
    ['package/dist/standalone/' + file]: asset,
  };
  const bytes = Buffer.from(await new Bun.Archive(contents, { compress: 'gzip' }).bytes());
  const files = Object.entries(contents).map(([file, value]) => ({
    path: file.slice(8),
    size: Buffer.byteLength(value),
  }));
  write(root, '.tmp/candidate/vida-agent-0.1.2.tgz', bytes);
  write(root, '.tmp/candidate.json', {
    schema: 'VidaNativeRetargetCandidate/v1',
    operation_id: operation,
    version,
    archive: '.tmp/candidate/vida-agent-0.1.2.tgz',
    pack_metadata: metadata(bytes, files),
    source_binding: releaseSourceBinding(root).source_binding,
  });
  return {
    root,
    original,
    oldBytes,
    bytes,
    input: { root, operation },
    stage: () => stageNativeRetargetCandidate({ root, operation, candidateFile: '.tmp/candidate.json' }),
  };
}
const plan = (value: RetargetFixture) => planReleaseRetarget({ ...value.input, actor: 'isolated human controller' });

const ciContext = { schema: 'ProjectContext/v1', repository_id: 'vida-agent', project_ids: ['agent'] };
test('Windows delivery source manifest names existing maintained regular files without extension fallback', () => {
  const sourceRoot = path.resolve(import.meta.dirname, '../../..');
  const workflow = readFileSync(path.join(sourceRoot, '.github/workflows/agent-native-delivery.yml'), 'utf8');
  const declaration = /\$files\s*=\s*@\(([\s\S]*?)\)/u.exec(workflow);
  assert.ok(declaration, 'workflow must declare its isolated-source copy list');
  const body = declaration[1];
  if (body === undefined) throw new Error('Workflow copy list body is missing.');
  const files = [...body.matchAll(/'([^']+)'/gu)].map((match) => {
    const file = match[1];
    if (file === undefined) throw new Error('Workflow copy path is missing.');
    return file;
  });
  assert.ok(files.length > 0, 'workflow copy list must contain literal paths');
  assert.equal(body.replace(/'[^']+'/gu, '').replace(/[\s,]/gu, ''), '', 'copy list must contain only path literals');
  assert.deepEqual(
    files.filter((file) =>
      /(?:^|\/)release-assurance\.(?:mjs|ts)$|(?:^|\/)forward-review-proof\.(?:mjs|ts)$/u.test(file),
    ),
    ['tooling/agent/release-assurance.ts', 'tooling/agent/controllers/forward-review-proof.ts'],
  );
  for (const file of files) {
    assert.ok(!path.isAbsolute(file) && !file.split(/[\\/]/u).includes('..'), `copy path must stay in Source: ${file}`);
    assert.ok(lstatSync(path.join(sourceRoot, file)).isFile(), `copy input must be a maintained regular file: ${file}`);
  }
  for (const stalePath of [
    'tooling/agent/release-assurance.mjs',
    'tooling/agent/controllers/forward-review-proof.mjs',
  ]) {
    assert.ok(!files.includes(stalePath), `workflow must not use extension fallback for ${stalePath}`);
    assert.equal(existsSync(path.join(sourceRoot, stalePath)), false, `stale path must remain absent: ${stalePath}`);
  }
});

test('CI dormant invocation binds exact repository job published commit and native target', async () => {
  const value = await fixture();
  const request = requestForCI({ ...value.input, context: ciContext, target: 'bun-windows-x64' });
  const commit = sha('inert published commit').slice(0, 40),
    executingPin = readPin();
  const env = {
    CI: 'true',
    GITHUB_ACTIONS: 'true',
    VIDA_NATIVE_CI_ENABLED: 'true',
    GITHUB_REPOSITORY: 'pomazanbohdan/vida-stack-lite',
    GITHUB_REPOSITORY_ID: '1340911900',
    GITHUB_JOB: 'native-windows-x64',
    GITHUB_RUN_ID: '17',
    GITHUB_RUN_ATTEMPT: '2',
    CI_SOURCE_COMMIT: commit,
    GITHUB_SHA: commit,
    GITHUB_WORKFLOW_REF: 'pomazanbohdan/vida-stack-lite/.github/workflows/agent-native-delivery.yml@refs/heads/main',
    CI_REQUEST: JSON.stringify(request),
    VIDA_CI_CACHE_ID: '1',
    VIDA_CI_CACHE_KEY: 'vida-bun-install-v1-lock-bun-' + executingPin + '-' + 'a'.repeat(64),
    VIDA_CI_CACHE_REF: 'refs/heads/main',
    VIDA_CI_CACHE_VERSION: 'inert fixture cache version',
    VIDA_CI_CACHE_BYTES: '1',
    VIDA_CI_CACHE_RESTORE: 'miss',
    VIDA_CI_CACHE_MATCHED_KEY: '',
    VIDA_CI_CACHE_SAVE: 'confirmed',
    VIDA_CI_CACHE_SAVE_ACTION: 'success',
  };
  const input = { env, platform: 'win32', arch: 'x64', bun: executingPin };
  assert.deepEqual(validateNativeCIInvocation(input).request, request);
  for (const [key, bad] of [
    ['VIDA_NATIVE_CI_ENABLED', 'false'],
    ['GITHUB_SHA', sha('other commit').slice(0, 40)],
    ['GITHUB_REPOSITORY_ID', '18'],
    ['GITHUB_JOB', 'other'],
    ['GITHUB_RUN_ATTEMPT', '0'],
  ] as const)
    assert.throws(
      () => validateNativeCIInvocation({ ...input, env: { ...env, [key]: bad } }),
      /GAP-VIDA-CI-DELIVERY-001/,
    );
  assert.throws(() => validateNativeCIInvocation({ ...input, platform: 'linux' }), /pinned producer/);
  assert.throws(
    () => validateNativeCIInvocation({ ...input, bun: executingPin === '1.4.2' ? '1.4.3' : '1.4.2' }),
    /pinned producer/,
  );
});

test('CI emission requires all seven exact ordered terminal receipts and known denials', async () => {
  const value = await fixture(),
    request = requestForCI({ ...value.input, context: ciContext, target: 'bun-windows-x64' });
  const identity = { request, run_id: '17', run_attempt: 2, source_commit: sha('fixture commit').slice(0, 40) },
    candidate = nativeCandidateForRequest(request, Buffer.from('inert archive')),
    dependency_cache = dependencyCacheFixture();
  const receipts = nativeDeliveryChecks.map((phase) => ({
    schema: 'VidaCIPhaseResult/v2' as const,
    request_id: request.request_id,
    run_id: '17',
    run_attempt: 2,
    source_binding: request.source_binding,
    archive_sha256: candidate.archive_sha256,
    phase,
    status: 'passed' as const,
    dependency_cache,
  }));
  const receiptIdentity = { ...identity, dependency_cache };
  validateNativeCIReceipts({ identity: receiptIdentity, candidate, receipts });
  assert.throws(
    () => validateNativeCIReceipts({ identity: receiptIdentity, candidate, receipts: receipts.slice(1) }),
    /complete ordered/,
  );
  for (const change of [
    (record) => {
      record.status = 'unknown';
    },
    (record) => {
      record.run_attempt = 1;
    },
    (record) => {
      record.archive_sha256 = sha('other');
    },
    (record) => {
      record.phase = 'other';
    },
    (record) => {
      record.skip = true;
    },
  ] satisfies CIPhaseMutation[]) {
    const changed = structuredClone(receipts);
    const changedReceipt = changed[2];
    if (!changedReceipt) throw new Error('Expected a third CI phase receipt.');
    change(changedReceipt);
    assert.throws(
      () => validateNativeCIReceipts({ identity: receiptIdentity, candidate, receipts: changed }),
      /CI phase observation/,
    );
  }
  const expectedLine: DenialExpectation = { kind: 'line', message: { exact: 'invalid argument' } };
  validateNativeCIDenial({ code: 1, signal: null, stderr: 'invalid argument\n' }, expectedLine);
  const publicCommandNames = cliCommandNames.filter((name) => !['help', 'instructions', 'version'].includes(name));
  const commandDenials = validateNativeCICommandDenialInventory(publicCommandNames, {
    'vida-agent': './bin/vida-agent.ts',
    'vida-agent-run': './bin/run.mjs',
    'vida-agent-documentation-clear': './bin/documentation-clear.ts',
  });
  assert.strictEqual(commandDenials.get(path.basename('./bin/run.mjs', '.mjs')), commandDenials.get('run'));
  assert.throws(
    () => validateNativeCICommandDenialInventory(new Set([...publicCommandNames, 'future-command']), {}),
    /public command denial expectation inventory differs/,
  );
  assert.throws(
    () => validateNativeCICommandDenialInventory(publicCommandNames, { 'vida-agent-future': './bin/future.mjs' }),
    /maintained alias lacks an explicit command denial expectation/,
  );
  const blocked = {
    schema: 'VidaAgentRunResult/v1',
    status: 'blocked',
    code: 'GAP-VIDA-RUN-WORKFLOW-001',
    message:
      'The requested workflow is not configured for this selection. Next action: inspect the exact work and check its issued contract before retrying.',
  };
  const denial = { code: 1, signal: null, stderr: JSON.stringify(blocked) };
  validateNativeCIUnadmittedRun(denial);

  const stdoutText = 'child stdout start:' + 'o'.repeat(3000) + ':stdout end',
    stderrText = 'child stderr start:' + 'e'.repeat(3000) + ':unexpected message',
    originalCommandError = new Error('original-command-error-with-already-expanded-diagnostic-tails');
  const outcomes = [
    {
      code: 1,
      signal: null,
      stdout: '',
      stderr: JSON.stringify(blocked),
      error: new Error('original unadmitted workflow denial'),
    },
    { code: 0, signal: null, stdout: 'unexpected success output', stderr: 'unexpected success stderr' },
    { code: 1, signal: null, stdout: stdoutText, stderr: stderrText, error: originalCommandError },
  ];
  const runDenied = createNativeCICommandRunner(
    {
      root: value.root,
      request,
      run_id: '17',
      run_attempt: 2,
      source_commit: identity.source_commit,
      dependency_cache,
      source: value.root,
      checkout: value.root,
      packageRoot: value.root,
      manifest: { version, engines: { bun: '1.4.2', node: '22' } },
    },
    'ci-denial-contract-runner',
    async (
      command: string,
      args: string[],
      options: {
        cwd?: string | undefined;
        log?: string | undefined;
        env?: NodeJS.ProcessEnv | undefined;
        windowsVerbatimArguments?: boolean | undefined;
      } = {},
    ) => {
      const outcome = outcomes.shift();
      if (!outcome) throw new Error('Unexpected synthetic command.');
      if (options.cwd !== value.root || typeof options.log !== 'string')
        throw new Error('Synthetic native CI command options are incomplete.');
      const receipt = {
        command,
        args,
        code: outcome.code,
        signal: outcome.signal,
        elapsed_ms: 0,
        stdout: outcome.stdout,
        stderr: outcome.stderr,
      };
      writeFileSync(options.log, json(receipt), { flag: 'wx' });
      if (outcome.error) throw outcome.error;
      return receipt.stdout.trim();
    },
  );
  const deny = runDenied.denied;
  if (!deny) throw new Error('Native CI denial runner did not expose its denial adapter.');
  const exactWorkflowDenial = await deny(
    'inert-unadmitted-child',
    ['--workflow', 'ci-unadmitted'],
    {},
    nativeCIUnadmittedWorkflowDenial,
  );
  assert.equal(exactWorkflowDenial.code, 1);

  let unexpectedSuccessError: Error | undefined;
  try {
    await deny('inert-success-child', ['--success'], {}, expectedLine);
  } catch (error) {
    if (!(error instanceof Error)) throw new Error('Unexpected-success denial did not reject with an Error.');
    unexpectedSuccessError = error;
  }
  if (!unexpectedSuccessError) throw new Error('Unexpected success must still be a denial failure.');
  assert.match(unexpectedSuccessError.message, /different integer exit; known FAIL/);
  assert.match(unexpectedSuccessError.message, /exit code: 0\nsignal: null/);
  assert.match(unexpectedSuccessError.message, /command: "inert-success-child"\nargs: \["--success"\]/);
  assert.match(
    unexpectedSuccessError.message,
    /stdout tail:\nunexpected success output\nstderr tail:\nunexpected success stderr/,
  );
  const successReceipt = typedFixtureIO(
    readFileSync(path.join(value.root, 'logs/ci-denial-contract-runner/1.json'), 'utf8'),
    isCommandReceipt,
  );
  assert.equal(successReceipt.command, 'inert-success-child');
  assert.deepEqual(successReceipt.args, ['--success']);
  assert.equal(successReceipt.code, 0, 'unexpected success must preserve its actual close receipt');

  let mismatchError: Error | undefined;
  try {
    await deny('inert-mismatch-child', ['--mismatch'], {}, expectedLine);
  } catch (error) {
    if (!(error instanceof Error)) throw new Error('Mismatch denial did not reject with an Error.');
    mismatchError = error;
  }
  if (!mismatchError) throw new Error('Unexpected message must fail its denial contract.');
  assert.equal(mismatchError.cause, originalCommandError, 'original command error remains the cause');
  assert.equal(
    mismatchError.message.includes(originalCommandError.message),
    false,
    'already-expanded cause tails are not printed twice',
  );
  assert.match(
    mismatchError.message,
    /command: "inert-mismatch-child"\nargs: \["--mismatch"\]\nexit code: 1\nsignal: null/,
  );
  const tailMatch = mismatchError.message.match(/stdout tail:\n([\s\S]*?)\nstderr tail:\n([\s\S]*)$/);
  const mismatchStdoutTail = tailMatch?.[1],
    mismatchStderrTail = tailMatch?.[2];
  assert.ok(mismatchStdoutTail);
  assert.ok(mismatchStderrTail);
  assert.equal(mismatchStdoutTail.length, 2048);
  assert.equal(mismatchStderrTail.length, 2048);
  assert.equal((mismatchError.message.match(/^stdout tail:/gm) ?? []).length, 1);
  assert.equal((mismatchError.message.match(/^stderr tail:/gm) ?? []).length, 1);
  const mismatchReceipt = typedFixtureIO(
    readFileSync(path.join(value.root, 'logs/ci-denial-contract-runner/2.json'), 'utf8'),
    isCommandReceipt,
  );
  assert.equal(mismatchReceipt.stdout, stdoutText, 'full stdout remains in the saved receipt');
  assert.equal(mismatchReceipt.stderr, stderrText, 'full stderr remains in the saved receipt');
  assert.equal(mismatchReceipt.signal, null);

  for (const change of [
    { code: 'GAP-VIDA-RUN-BUN-001' },
    { code: 'GAP-VIDA-RUN-EXECUTION-001' },
    { message: 'different workflow error' },
    { schema: 'Different/v1' },
    { status: 'passed' },
    { extra: true },
  ])
    assert.throws(() =>
      validateNativeCIUnadmittedRun({ ...denial, stderr: JSON.stringify({ ...blocked, ...change }) }),
    );
  assert.throws(() => validateNativeCIUnadmittedRun({ ...denial, stderr: 'other failure\n' + denial.stderr }));
  for (const record of [
    { code: null, signal: 'SIGTERM', stderr: 'invalid argument' },
    { code: null, signal: null, stderr: 'invalid argument' },
  ])
    assert.throws(() => validateNativeCIDenial(record, expectedLine), /FAIL\/UNKNOWN retained/);
  assert.throws(
    () => validateNativeCIDenial({ code: 0, signal: null, stderr: 'invalid argument' }, expectedLine),
    /different integer exit; known FAIL/,
  );
  assert.throws(
    () => validateNativeCIDenial({ code: 2, signal: null, stderr: 'invalid argument' }, expectedLine),
    /different integer exit; known FAIL/,
  );
  assert.throws(
    () => validateNativeCIDenial({ code: 1, signal: null, stderr: 'different message' }, expectedLine),
    /message or structured contract did not match/,
  );
  assert.throws(
    () =>
      validateNativeCIDenial(
        { code: 1, signal: null, stderr: "  3 | throw new Error('invalid argument')\n    |" },
        expectedLine,
      ),
    /message or structured contract did not match/,
  );
  const structuredExpected: DenialExpectation = {
    kind: 'json',
    keys: ['status', 'code', 'message'],
    fields: { status: 'blocked', code: 'GAP-TEST-001' },
    message: { exact: 'known denial' },
  };
  validateNativeCIDenial(
    {
      code: 1,
      signal: null,
      stderr: JSON.stringify({ status: 'blocked', code: 'GAP-TEST-001', message: 'known denial' }),
    },
    structuredExpected,
  );
  assert.throws(
    () =>
      validateNativeCIDenial(
        {
          code: 1,
          signal: null,
          stderr: JSON.stringify({ status: 'blocked', code: 'GAP-OTHER-001', message: 'known denial' }),
        },
        structuredExpected,
      ),
    /message or structured contract did not match/,
  );
  assert.throws(
    () =>
      validateNativeCIDenial(
        { code: 1, signal: null, stderr: 'invalid argument; Cannot find package native-runtime' },
        expectedLine,
      ),
    /prerequisite failure/,
  );
  const diagnostics = nativeCIDenialDiagnostics({
    command: 'inert-diagnostic-child',
    args: ['--diagnostic'],
    code: 1,
    signal: null,
    stdout: 'start' + 'o'.repeat(3000) + 'stdout-end',
    stderr: 'start' + 'e'.repeat(3000) + 'stderr-end',
  });
  assert.match(diagnostics, /^command: "inert-diagnostic-child"\nargs: \["--diagnostic"\]\nexit code: 1\nsignal: null/);
  const tails = diagnostics.match(/stdout tail:\n([\s\S]*?)\nstderr tail:\n([\s\S]*)$/);
  if (!tails || typeof tails[1] !== 'string' || typeof tails[2] !== 'string')
    throw new Error('Native CI diagnostic tails are missing.');
  const stdoutTail = tails[1];
  const stderrTail = tails[2];
  assert.equal(stdoutTail.length, 2048);
  assert.equal(stderrTail.length, 2048);
  assert.ok(stdoutTail.endsWith('stdout-end'));
  assert.ok(stderrTail.endsWith('stderr-end'));
});

function githubTransportFixture(request: ReturnType<typeof recordCIDeliveryRequest>, bytes: Buffer) {
  const commit = sha('inert selected published commit').slice(0, 40),
    started = '2026-10-04T09:00:00Z',
    completed = '2026-10-04T09:01:00Z';
  const profile = {
    issuer: 'github-actions',
    repository_id: request.repository_id,
    project_ids: request.project_ids,
    target: request.target,
    required_checks: [...nativeDeliveryChecks],
    github: {
      repository: 'pomazanbohdan/vida-stack-lite',
      repository_id: 1340911900,
      source_commit: commit,
      workflow_id: 7,
      workflow_path: '.github/workflows/agent-native-delivery.yml',
      job: 'native-windows-x64',
      artifact_hosts: ['artifacts.example.com'],
      workflow_sha256: sha('inert workflow definition'),
      steps: nativeDeliveryChecks.map((id) => ({ id, name: id })),
    },
  };
  const run = {
    id: 17,
    run_attempt: 2,
    head_sha: commit,
    workflow_id: 7,
    path: profile.github.workflow_path,
    event: 'workflow_dispatch',
    status: 'completed',
    conclusion: 'success',
    repository: { id: 1340911900, full_name: profile.github.repository },
    head_repository: { id: 1340911900 },
  };
  const job = {
    name: 'native-windows-x64',
    run_id: 17,
    run_attempt: 2,
    status: 'completed',
    conclusion: 'success',
    started_at: started,
    completed_at: completed,
    steps: nativeDeliveryChecks.map((name) => ({ name, status: 'completed', conclusion: 'success' })),
  };
  const artifact = {
    id: 19,
    name: request.request_id + '-2',
    expired: false,
    created_at: '2026-10-04T09:00:30Z',
    digest: 'sha256:' + sha(bytes),
    workflow_run: { id: 17, repository_id: 1340911900, head_repository_id: 1340911900, head_sha: commit },
  };
  return { profile, run, job, artifact };
}

test('CI artifact provenance binds attempt job time and rejects redirect origin escapes', async () => {
  const value = await fixture(),
    request = requestForCI({ ...value.input, context: ciContext, target: 'bun-windows-x64' });
  const data = githubTransportFixture(request, Buffer.from('inert transport'));
  const input = {
    artifact: data.artifact,
    request,
    run_id: '17',
    run_attempt: 2,
    repository_id: 1340911900,
    source_commit: data.profile.github.source_commit,
    job: data.job,
  };
  validateCIArtifactAttempt(input);
  for (const change of [
    (artifact) => {
      artifact.created_at = '2026-10-04T08:59:59Z';
    },
    (artifact) => {
      artifact.created_at = 'invalid';
    },
    (artifact) => {
      artifact.name = request.request_id + '-1';
    },
    (artifact) => {
      artifact.workflow_run.head_sha = sha('other').slice(0, 40);
    },
    (artifact) => {
      artifact.expired = true;
    },
  ] satisfies GitHubArtifactMutation[]) {
    const artifact = structuredClone(data.artifact);
    change(artifact);
    assert.throws(() => validateCIArtifactAttempt({ ...input, artifact }), /run attempt interval/);
  }
  assert.equal(
    validateCIDownloadLocation('https://artifacts.example.com/body?signed=opaque', ['artifacts.example.com']),
    'https://artifacts.example.com/body?signed=opaque',
  );
  for (const url of [
    'http://artifacts.example.com/body',
    'https://user:secret@artifacts.example.com/body',
    'https://artifacts.example.com:444/body',
    'https://artifacts.example.com.evil.test/body',
    'https://artifacts.example.com/body#secret',
  ])
    assert.throws(() => validateCIDownloadLocation(url, ['artifacts.example.com']), /origin differs/);
  assert.throws(
    () => validateCIDownloadLocation('https://artifacts.example.com/body', ['*.example.com']),
    /exact artifact hosts/,
  );
});

test('CI archive capability rejects installed or transitive lock drift before reading bytes', () => {
  const input = pinnedZIPReaderFixture();
  validateCIZIPReaderVersions(input);
  for (const change of [
    (value) => {
      value.zip.version = '3.10.3';
    },
    (value) => {
      value.fsSafe.version = '0.23.0';
    },
    (value) => {
      value.zip.name = 'foreign';
    },
    (value) => {
      value.lock = '{}';
    },
  ] satisfies ZIPPinMutation[]) {
    const value = structuredClone(input);
    change(value);
    assert.throws(() => validateCIZIPReaderVersions(value), /qualified Source dependency pins/);
  }
});

test('CI public observer rejects duplicate physical ZIP names before accepting result bytes', async () => {
  const repositoryRoot = path.resolve(import.meta.dir, '../../..');
  const readerRoot = path.resolve(process.env.VIDA_CI_READER_ROOT ?? repositoryRoot);
  for (const file of ['package.json', 'bun.lock'])
    assert.deepEqual(
      read(readerRoot, 'packages/agent/' + file),
      read(repositoryRoot, 'packages/agent/' + file),
      'GAP-VIDA-CI-DELIVERY-001: reader fixture must retain current Source metadata and exact lock',
    );
  const archiveModule = createRequire(path.join(readerRoot, 'packages/agent/package.json')).resolve(
    '@openclaw/fs-safe/archive',
  );
  const JSZip = createRequire(archiveModule)('jszip') as typeof JSZipConstructor;
  const value = await fixture();
  const request = requestForCI({ ...value.input, context: ciContext, target: 'bun-windows-x64' });
  const workflow = Buffer.from('inert workflow definition');
  const nested = Buffer.from('inert candidate archive; no executable');
  const candidate = ciCandidateForRequest(request, nested);
  const parent = path.join(readerRoot, '.tmp');
  mkdirSync(parent, { recursive: true });
  const directory = mkdtempSync(path.join(parent, 'vida-ci-zip-'));
  const originalFetch = globalThis.fetch;
  try {
    for (const duplicate of [false, true]) {
      const zip = new JSZip().file('result.json', '{"inert":true}').file(candidate.pack_metadata[0]!.filename, nested);
      if (duplicate) zip.file('shadow.json', '{"inert":"duplicate"}');
      const bytes: Buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'STORE' });
      if (duplicate) {
        const from = Buffer.from('shadow.json'),
          to = Buffer.from('result.json');
        assert.equal(from.length, to.length);
        let changed = 0;
        for (let at = bytes.indexOf(from); at >= 0; at = bytes.indexOf(from, at + from.length)) {
          to.copy(bytes, at);
          changed++;
        }
        assert.equal(changed, 2, 'Rename both physical ZIP headers');
      }
      const transport = path.join(directory, duplicate ? 'duplicate.zip' : 'valid.zip');
      writeFileSync(transport, bytes, { flag: 'wx' });
      const data = githubTransportFixture(request, bytes);
      data.profile.github.workflow_sha256 = sha(workflow);
      data.profile.github.steps = nativeDeliveryChecks.map((id) => ({ id, name: id }));
      data.job.steps = nativeDeliveryChecks.map((name) => ({ name, status: 'completed', conclusion: 'success' }));
      const replies = {
        '/actions/runs/17/attempts/2': data.run,
        ['/contents/' + data.profile.github.workflow_path + '?ref=' + data.profile.github.source_commit]: {
          encoding: 'base64',
          content: workflow.toString('base64'),
        },
        '/actions/runs/17/attempts/2/jobs?per_page=100': {
          total_count: 3,
          jobs: [null, { name: 'unrelated', steps: null }, data.job],
        },
        '/actions/artifacts/19': data.artifact,
      };
      let calls = 0;
      globalThis.fetch = mockedFetch(originalFetch, async (input) => {
        calls++;
        const url = fetchURL(input);
        const suffix = String(url).replace('https://api.github.com/repos/' + data.profile.github.repository, '');
        assert.ok(Object.hasOwn(replies, suffix), 'No unmocked provider request');
        return new Response(JSON.stringify(replies[suffix]));
      });
      const observe = () =>
        observeGitHubCIDelivery({
          root: readerRoot,
          request,
          candidate,
          profile: data.profile,
          run_id: 17,
          run_attempt: 2,
          artifact_id: 19,
          transport_path: path.relative(readerRoot, transport).split(path.sep).join('/'),
        });
      if (duplicate)
        await Promise.resolve(
          assert.rejects(observe(), /GAP-VIDA-CI-DELIVERY-001: qualified ZIP reader unavailable or artifact invalid/),
        );
      else {
        const observation = await observe();
        assert.equal(observation.conclusion, 'success');
        assert.deepEqual(observation.result_bytes, Buffer.from('{"inert":true}'));
      }
      assert.equal(calls, 4);
      assert.deepEqual(readFileSync(transport), bytes);
    }
  } finally {
    globalThis.fetch = originalFetch;
    if (!outcomeUnknown) {
      assert.equal(path.dirname(directory), parent);
      assert.ok(path.basename(directory).startsWith('vida-ci-zip-'));
      rmSync(directory, { recursive: true, force: true });
    }
  }
});

for (const kind of ['complete', 'unrelated-malformed', 'partial', 'oversized', 'wrong-digest', 'wrong-commit'])
  test('CI explicit mocked transport ' + kind + ' keeps bounded custody and never forwards credentials', async () => {
    const value = await fixture(),
      request = requestForCI({ ...value.input, context: ciContext, target: 'bun-windows-x64' }),
      bytes = Buffer.from('inert ZIP transport bytes; no delivery artifact');
    const pendingBefore = read(value.root, pending);
    const data = githubTransportFixture(request, bytes),
      calls: FetchObservation[] = [],
      priorFetch = globalThis.fetch;
    if (kind === 'wrong-digest') data.artifact.digest = 'sha256:' + sha('other');
    if (kind === 'wrong-commit') data.run.head_sha = sha('other commit').slice(0, 40);
    globalThis.fetch = mockedFetch(priorFetch, async (input, options) => {
      const url = fetchURL(input);
      if (!options) throw new Error('Mocked CI request options are missing.');
      calls.push({ url, options });
      if (url.includes('/attempts/2/jobs?')) {
        const jobs = kind === 'unrelated-malformed' ? [null, { name: 'unrelated', steps: null }, data.job] : [data.job];
        return Response.json({ total_count: jobs.length, jobs });
      }
      if (url.endsWith('/runs/17/attempts/2')) return Response.json(data.run);
      if (url.endsWith('/artifacts/19')) return Response.json(data.artifact);
      if (url.endsWith('/artifacts/19/zip'))
        return new Response(null, {
          status: 302,
          headers: { location: 'https://artifacts.example.com/body?signed=opaque' },
        });
      assert.equal(url, 'https://artifacts.example.com/body?signed=opaque');
      assert.equal(options.headers, undefined);
      assert.equal(options.redirect, 'error');
      if (kind === 'partial')
        return new Response(
          new ReadableStream({
            start(controller) {
              controller.error(Error('inert interrupted response'));
            },
          }),
        );
      return new Response(bytes, {
        headers: kind === 'oversized' ? { 'content-length': String(ciTransportLimit + 1) } : {},
      });
    });
    const options = {
      root: value.root,
      request,
      profile: data.profile,
      run_id: '17',
      run_attempt: 2,
      artifact_id: '19',
      token: 'explicit-inert-fixture-token',
    };
    const relative = '.tmp/ci-delivery/' + request.request_id + '/17-2-19.zip';
    try {
      if (kind === 'complete' || kind === 'unrelated-malformed') {
        assert.equal((await downloadGitHubCIDelivery(options)).transport_path, relative);
        assert.deepEqual(read(value.root, relative), bytes);
        const count = calls.length;
        await Promise.resolve(assert.rejects(downloadGitHubCIDelivery(options), /retained download exists/));
        assert.equal(calls.length, count);
      } else {
        await Promise.resolve(assert.rejects(downloadGitHubCIDelivery(options)));
        assert.equal(existsSync(path.join(value.root, relative)), kind !== 'wrong-commit');
        if (kind !== 'wrong-commit') {
          const count = calls.length;
          await Promise.resolve(assert.rejects(downloadGitHubCIDelivery(options), /retained download exists/));
          assert.equal(calls.length, count);
        }
      }
      assert.ok(
        calls
          .filter((call) => call.url.startsWith('https://api.github.com/'))
          .every((call) => hasAuthorization(call.options, 'Bearer explicit-inert-fixture-token')),
      );
      if (kind === 'wrong-commit') assert.equal(calls.length, 1);
      assert.deepEqual(read(value.root, pending), pendingBefore);
    } finally {
      globalThis.fetch = priorFetch;
    }
  });
function ciRecord(value: RetargetFixture, checks = nativeDeliveryChecks) {
  const request = requestForCI({ ...value.input, context: ciContext, target: 'bun-linux-x64' });
  const retargetCandidate = readCandidate(value.input);
  const candidate: CIDeliveryCandidate = {
    operation_id: retargetCandidate.operation_id,
    version: retargetCandidate.version,
    source_binding: retargetCandidate.source_binding,
    archive_sha256: retargetCandidate.archive_sha256,
    manifest_sha256: retargetCandidate.manifest_sha256,
    pack_metadata: [
      {
        name: 'vida-agent',
        version: retargetCandidate.version,
        filename: 'vida-agent-' + retargetCandidate.version + '.tgz',
        files: [{ path: 'dist/standalone/manifest.json', size: 1 }],
      },
    ],
    manifest: {
      schema: 'VidaStandaloneBuild/v1',
      version: retargetCandidate.manifest.version,
      pin: retargetCandidate.manifest.pin,
      target: request.target,
      inputs: retargetCandidate.manifest.inputs.map((input) => ({
        path: input.path,
        bytes: input.bytes,
        sha256: input.sha256,
      })),
      asset: {
        file: retargetCandidate.manifest.asset.file,
        bytes: retargetCandidate.manifest.asset.bytes,
        sha256: retargetCandidate.manifest.asset.sha256,
      },
      payloadId: retargetCandidate.manifest.payloadId,
    },
  };
  const profile = {
    issuer: 'isolated-ci-fixture',
    repository_id: ciContext.repository_id,
    project_ids: ciContext.project_ids,
    target: request.target,
    required_checks: [...checks],
  };
  const dependency_cache = dependencyCacheFixture();
  const observed: Omit<CIDeliveryObservation, 'result_bytes'> = {
    schema: 'VidaCIDeliveryObservation/v1',
    issuer: profile.issuer,
    run_id: 'fixture-run',
    run_attempt: 1,
    artifact_id: 'fixture-artifact',
    conclusion: 'success',
    checks: profile.required_checks.map((id) => ({ id, status: 'passed' as const })),
  };
  const { schema: _schema, artifact_id: _artifact, ...producer } = observed;
  const observation = {
    ...observed,
    result_bytes: encodeCIDeliveryResult({ request, candidate, profile, observation: producer, dependency_cache }),
  };
  return { request, candidate, profile, observation };
}

test('CI request retry preserves custody and Source changes keep the original operation', async () => {
  const value = await fixture(),
    args = { ...value.input, context: ciContext, target: 'bun-linux-x64' };
  const before = read(value.root, pending),
    request = recordCIDeliveryRequest(args);
  assert.deepEqual(recordCIDeliveryRequest(args), request);
  const relative = folder + '/ci/' + request.request_id + '/request.json',
    saved = read(value.root, relative);
  write(value.root, 'tooling/agent/release-ci-evidence.ts', 'changed in-scope repository consumer');
  const amended = recordCIDeliveryRequest(args);
  assert.notEqual(amended.request_id, request.request_id);
  assert.equal(amended.operation_id, request.operation_id);
  assert.deepEqual(read(value.root, relative), saved);
  assert.deepEqual(read(value.root, pending), before);
});

test('CI request partial first write is UNKNOWN and never overwritten', async () => {
  const value = await fixture(),
    args = { ...value.input, context: ciContext, target: 'bun-linux-x64' };
  const request = recordCIDeliveryRequest(args),
    relative = folder + '/ci/' + request.request_id + '/request.json';
  write(value.root, relative, '{partial');
  assert.throws(() => recordCIDeliveryRequest(args), /partial or changed/);
  assert.equal(read(value.root, relative).toString(), '{partial');
  assert.throws(() => requestForCI({ ...args, context: { ...ciContext, project_ids: ['agent', 'agent'] } }), /project/);
});

test('candidate view reads sealed archive bytes without Source dist and requires exact publication', async () => {
  const value = await fixture();
  await value.stage();
  const candidate = readCandidateWithoutSourceDist(value.input);
  assert.equal(existsSync(path.join(value.root, 'packages/agent/dist')), true);
  assert.equal(sha(readFileSync(candidate.asset.path)), candidate.manifest.asset.sha256);
  assert.throws(() => readCandidate({ ...value.input, published: true }), /published candidate/);
  await plan(value);
  await applyReleaseRetarget(value.input);
  assert.equal(readCandidateWithoutSourceDist({ ...value.input, published: true }).archive_sha256, sha(value.bytes));
});

test('staging rejects current Source build inputs omitted from the frozen candidate and retains UNKNOWN reservation', async () => {
  const value = await fixture(),
    candidateBefore = obj(value.root, '.tmp/candidate.json');
  write(value.root, 'packages/agent/src/omitted-current.ts', 'export const omittedCurrent = true;\n');
  const currentSourceBinding = releaseSourceBinding(value.root).source_binding;
  write(value.root, '.tmp/candidate.json', {
    ...candidateBefore,
    source_binding: currentSourceBinding,
  });
  value.original.source_binding = currentSourceBinding;
  write(value.root, folder + '/release.json', value.original);
  assert.deepEqual(obj(value.root, '.tmp/candidate.json').pack_metadata, candidateBefore.pack_metadata);

  await assert.rejects(value.stage(), /complete build input inventory/);
  const reserved = path.join(value.root, folder + '/retarget/candidate');
  assert.equal(existsSync(reserved), true);
  assert.equal(existsSync(path.join(reserved, 'seal.json')), false);
  assert.equal(sha(readFileSync(path.join(reserved, 'archive.tgz'))), sha(value.bytes));
  assert.deepEqual(obj(value.root, folder + '/release.json'), value.original);
});

test('CI portable observation joins current synthetic state but never manufactures Runtime proof', async () => {
  const value = await fixture();
  await value.stage();
  await plan(value);
  await applyReleaseRetarget(value.input);
  const proof = ciRecord(value);
  let calls = 0;
  const result = await verifyCIDeliveryEvidence({
    ...value.input,
    version,
    ci: {
      request_id: proof.request.request_id,
      profile: proof.profile,
      observe: async ({ request, candidate }: CIObservationInput) => {
        calls++;
        assert.deepEqual(request, proof.request);
        assert.equal(candidate.archive_sha256, sha(value.bytes));
        return proof.observation;
      },
    },
  });
  assert.equal(calls, 1);
  assert.equal(result.operation_id, operation);
  assert.equal(result.source_binding, proof.request.source_binding);
  const inputs = ['packages/agent/lib.js'];
  const tests = ['retained-behavior', 'static', 'release-local'].map((lane) => {
    const file = '.tmp/ci-local-' + lane + '.json';
    write(value.root, file, {
      exit_code: 0,
      command: 'synthetic agent-state observation',
      started_at: 'a',
      completed_at: 'b',
    });
    return {
      lane,
      path: file,
      inputs,
      input_binding: testInputBinding(value.root, inputs),
      sha256: sha(read(value.root, file)),
    };
  });
  write(value.root, folder + '/tests.json', { operation_id: operation, version, tests });
  assert.equal(
    (
      await verifyLocalReleaseTests({
        ...value.input,
        version,
        ci: { request_id: proof.request.request_id, profile: proof.profile, observe: async () => proof.observation },
      })
    ).source_binding,
    proof.request.source_binding,
  );
  for (const unavailable of [undefined, null]) {
    await Promise.resolve(
      assert.rejects(
        verifyCIDeliveryEvidence({ ...value.input, version, ci: unavailable }),
        /actual trusted controller/,
      ),
    );
  }
  for (const malformed of [null, undefined, { schema: 'VidaCIDeliveryObservation/v1' }, [], true]) {
    await Promise.resolve(
      assert.rejects(
        verifyCIDeliveryEvidence({
          ...value.input,
          version,
          ci: {
            request_id: proof.request.request_id,
            profile: proof.profile,
            observe: async () => malformedObservation(malformed),
          },
        }),
        /contract fields/,
      ),
    );
  }
});

test('CI wrong issuer checks payload Source target and run bindings deny without effects', async () => {
  const value = await fixture();
  await value.stage();
  const proof = ciRecord(value),
    validate = (changes: Partial<ReturnType<typeof ciRecord>>) =>
      validateCIDeliveryObservation({ ...proof, ...changes });
  assert.throws(() => validate({ observation: { ...proof.observation, issuer: 'foreign' } }), /observation/);
  assert.throws(() => validate({ observation: { ...proof.observation, conclusion: 'UNKNOWN' } }), /observation/);
  assert.throws(
    () => validate({ observation: { ...proof.observation, checks: [{ id: 'native-build', status: 'passed' }] } }),
    /checks/,
  );
  assert.throws(() => validate({ profile: { ...proof.profile, required_checks: ['native-build'] } }), /checks/);
  for (const field of ['run_id', 'source_binding', 'archive_sha256', 'manifest_sha256', 'payload_id', 'target']) {
    const result = typedFixtureIO(proof.observation.result_bytes.toString('utf8'), fixtureRecord);
    result[field] = 'foreign';
    assert.throws(
      () => validate({ observation: { ...proof.observation, result_bytes: Buffer.from(json(result)) } }),
      /differs/,
    );
  }
  const checks = proof.observation.checks.map((item) => ({ ...item, status: 'skipped' }));
  assert.throws(() => validate({ observation: { ...proof.observation, checks } }), /skipped/);
  assert.deepEqual(read(value.root, archive), value.oldBytes);
});

test('CI observation failure and candidate drift preserve the existing operation and evidence', async () => {
  const value = await fixture();
  await value.stage();
  await plan(value);
  await applyReleaseRetarget(value.input);
  const proof = ciRecord(value),
    before = read(value.root, folder + '/release.json');
  await Promise.resolve(
    assert.rejects(
      verifyCIDeliveryEvidence({
        ...value.input,
        version,
        ci: {
          request_id: proof.request.request_id,
          profile: proof.profile,
          observe: async () => {
            throw Error('UNKNOWN provider effect');
          },
        },
      }),
      /UNKNOWN/,
    ),
  );
  write(value.root, 'packages/agent/lib.js', 'changed Source');
  await Promise.resolve(
    assert.rejects(
      verifyCIDeliveryEvidence({
        ...value.input,
        version,
        ci: { request_id: proof.request.request_id, profile: proof.profile, observe: async () => proof.observation },
      }),
      /Source differs/,
    ),
  );
  assert.deepEqual(read(value.root, folder + '/release.json'), before);
});

test('CI asynchronous observation rechecks bytes and isolates candidate mutation', async () => {
  const value = await fixture();
  await value.stage();
  await plan(value);
  await applyReleaseRetarget(value.input);
  const proof = ciRecord(value);
  const ci = {
    request_id: proof.request.request_id,
    profile: proof.profile,
    observe: async ({ request, candidate }: CIObservationInput) => {
      request.version = '0.1.999';
      candidate.archive_sha256 = 'forged';
      return proof.observation;
    },
  };
  assert.equal(
    (await verifyCIDeliveryEvidence({ ...value.input, version, ci })).source_binding,
    proof.request.source_binding,
  );
  ci.observe = async () => {
    write(value.root, 'packages/agent/lib.js', 'changed while awaiting CI');
    return proof.observation;
  };
  await Promise.resolve(assert.rejects(verifyCIDeliveryEvidence({ ...value.input, version, ci }), /input changed/));
});

for (const changed of ['log', 'proof', 'input'])
  test('CI await rejects changed local ' + changed + ' evidence', async () => {
    const value = await fixture();
    await value.stage();
    await plan(value);
    await applyReleaseRetarget(value.input);
    const proof = ciRecord(value),
      input = '.tmp/operational-input.json';
    write(value.root, input, { state: 'known' });
    const tests = ['retained-behavior', 'static', 'release-local'].map((lane) => {
      const file = '.tmp/await-' + lane + '.json';
      write(value.root, file, { exit_code: 0, command: 'synthetic state', started_at: 'a', completed_at: 'b' });
      return {
        lane,
        path: file,
        inputs: [input],
        input_binding: testInputBinding(value.root, [input]),
        sha256: sha(read(value.root, file)),
      };
    });
    write(value.root, folder + '/tests.json', { operation_id: operation, version, tests });
    const before = read(value.root, folder + '/release.json');
    await Promise.resolve(
      assert.rejects(
        verifyLocalReleaseTests({
          ...value.input,
          version,
          ci: {
            request_id: proof.request.request_id,
            profile: proof.profile,
            observe: async () => {
              if (changed === 'log') {
                const firstTest = tests[0];
                if (!firstTest) throw new Error('Expected a first test receipt.');
                write(value.root, firstTest.path, { exit_code: 1 });
              }
              if (changed === 'proof') write(value.root, folder + '/tests.json', '{}');
              if (changed === 'input') write(value.root, input, { state: 'changed' });
              return proof.observation;
            },
          },
        }),
        /Local test (evidence|input) changed/,
      ),
    );
    assert.deepEqual(read(value.root, folder + '/release.json'), before);
  });

test('same operation preserves pointers, fields, old receipts and lost-ack identity', async () => {
  for (const success of [false, true]) {
    const value = await fixture({ success }),
      { root } = value;
    const pointer = read(root, pending),
      prior = success ? read(root, successful) : null;
    assert.equal((await inspectReleaseRetarget(value.input)).status, 'requires_staged_candidate');
    await value.stage();
    await value.stage();
    await plan(value);
    assert.throws(() => assertReleaseRetargetSettled(root, operation), /active/);
    assert.equal((await applyReleaseRetarget(value.input)).qualified, false);
    assert.equal((await applyReleaseRetarget(value.input)).status, 'complete');
    assert.deepEqual(read(root, pending), pointer);
    if (success) assert.deepEqual(read(root, successful), prior);
    else assert.equal(existsSync(path.join(root, successful)), false);
    const after = obj(root, folder + '/release.json');
    for (const [key, val] of Object.entries(value.original))
      if (!['pack_metadata', 'source_binding', 'tarball_sha256'].includes(key)) assert.deepEqual(after[key], val);
    assert.deepEqual(read(root, archive), value.bytes);
    const frozen = retargetPlan(root);
    for (const entry of frozen.custody) assert.equal(sha(read(root, entry.copy)), entry.sha256);
    assert.ok(frozen.custody.some((entry) => entry.path === '.tmp/old-input.json'));
    assertReleaseRetargetSettled(root, operation);
    const terminalJournal = read(root, folder + '/release.json');
    let launches = 0;
    // This uninitialized legacy fixture has no durable .vida custody row; the direct adapter must deny.
    await assert.rejects(
      reserveReleaseWorker(root, operation, () => {
        launches++;
        return 778899;
      }),
      /Legacy release worker launch lacks durable service custody; preserve the operation\./,
    );
    await assert.rejects(
      claimReleaseWorker(root, operation, 778899),
      /Legacy release worker claim lacks durable service custody; preserve the operation\./,
    );
    assert.equal(launches, 0);
    assert.deepEqual(read(root, folder + '/release.json'), terminalJournal);
    assertReleaseRetargetSettled(root, operation);
    assert.equal((await applyReleaseRetarget(value.input)).status, 'complete');
  }
});

for (const boundary of ['archive_effect', 'archive', 'release_effect', 'release'])
  test('resume recognizes only retained known phase after ' + boundary, async () => {
    const value = await fixture();
    await value.stage();
    await plan(value);
    await Promise.resolve(
      assert.rejects(
        applyReleaseRetarget(value.input, {
          onPhase: (phase) => {
            if (phase === boundary) throw Error('fault');
          },
        }),
        /fault/,
      ),
    );
    assert.throws(() => assertReleaseRetargetSettled(value.root, operation), /active/);
    assert.equal((await applyReleaseRetarget(value.input)).status, 'complete');
    assert.deepEqual(read(value.root, archive), value.bytes);
  });

test('busy worker and admission deny before custody or effects', async () => {
  const value = await fixture();
  await value.stage();
  const worker = operationMutex(value.root, operation);
  if (!worker) throw new Error('Retarget operation lock was not acquired.');
  try {
    await Promise.resolve(assert.rejects(plan(value), /busy/));
    const module = new URL('../bin/local-release-artifacts.ts', import.meta.url).href;
    const child = spawnSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        'const {operationMutex}=await import(process.env.VIDA_RETARGET_MODULE_URL); const db=operationMutex(process.env.VIDA_RETARGET_ROOT,process.env.VIDA_RETARGET_OPERATION); console.log(db ? "open" : "busy"); db?.close();',
      ],
      {
        encoding: 'utf8',
        windowsHide: true,
        env: {
          ...process.env,
          VIDA_RETARGET_MODULE_URL: module,
          VIDA_RETARGET_ROOT: value.root,
          VIDA_RETARGET_OPERATION: operation,
        },
      },
    );
    assert.equal(child.error, undefined);
    assert.equal(child.status, 0, child.stderr);
    assert.equal(child.stdout.trim(), 'busy');
  } finally {
    worker.close();
  }
  assert.equal(existsSync(path.join(value.root, folder + '/retarget/custody')), false);
  await plan(value);
  const admission = admissionMutex(value.root);
  try {
    await Promise.resolve(assert.rejects(applyReleaseRetarget(value.input), /locked|busy/i));
  } finally {
    admission.close();
  }
  assert.deepEqual(read(value.root, archive), value.oldBytes);
});

test('active, failed, UNKNOWN and installation-started original states deny', async () => {
  for (const status of ['running', 'failed', 'successful', 'UNKNOWN']) {
    const value = await fixture();
    write(value.root, folder + '/release.json', { ...value.original, status });
    await Promise.resolve(assert.rejects(value.stage(), /eligible|invalid/));
  }
  const value = await fixture();
  write(value.root, folder + '/release.json', { ...value.original, install_started: true });
  await Promise.resolve(assert.rejects(value.stage(), /eligible/));
});

test('existing partial candidate staging is preserved without overwrite', async () => {
  const partial = await fixture();
  mkdirSync(path.join(partial.root, folder + '/retarget/candidate'), { recursive: true });
  await Promise.resolve(assert.rejects(partial.stage(), /EEXIST/));
});
for (const target of ['candidate', 'custody', 'Source', 'pointer', 'archive', 'missing'])
  test(target + ' drift remains UNKNOWN without overwrite', async () => {
    const value = await fixture();
    await value.stage();
    await plan(value);
    const frozen = retargetPlan(value.root);
    if (target === 'candidate') write(value.root, folder + '/retarget/candidate/archive.tgz', 'tamper');
    if (target === 'custody') {
      const firstCustody = frozen.custody[0];
      if (!firstCustody) throw new Error('Expected a first frozen custody entry.');
      write(value.root, firstCustody.copy, 'tamper');
    }
    if (target === 'Source') write(value.root, 'packages/agent/lib.js', 'changed Source');
    if (target === 'pointer') write(value.root, successful, { foreign: true });
    if (target === 'archive') write(value.root, archive, 'foreign archive');
    if (target === 'missing') rmSync(path.join(value.root, folder + '/retarget/custody/publication.tgz'));
    await Promise.resolve(assert.rejects(applyReleaseRetarget(value.input), /changed|differs|missing|UNKNOWN/));
    assert.deepEqual(obj(value.root, folder + '/release.json'), value.original);
  });

test('admission rollback, source-input binding and CLI attribution stay narrow', async () => {
  const value = await fixture();
  await Promise.resolve(
    assert.rejects(
      withReleaseAdmission(value.root, () => {
        throw Error('rollback');
      }),
      /rollback/,
    ),
  );
  await withReleaseAdmission(value.root, () => 1);
  assert.throws(() => releaseState(path.join(value.root, folder + '/release.json') + '/escape'));
  await Promise.resolve(
    assert.rejects(
      runReleaseRetarget(
        [
          '--kind',
          'release-retarget',
          '--mode',
          'apply',
          '--project-root',
          value.root,
          '--operation',
          operation,
          '--actor',
          'unfrozen',
        ],
        {},
      ),
      /retarget arguments differ from declaration/,
    ),
  );
  await value.stage();
  await plan(value);
  const before = testInputBinding(value.root, ['packages/agent/lib.js']);
  write(value.root, 'packages/agent/lib.js', 'changed');
  assert.notEqual(testInputBinding(value.root, ['packages/agent/lib.js']), before);
  await Promise.resolve(
    assert.rejects(
      runReleaseRetarget(
        ['--kind', 'release-retarget', '--mode', 'apply', '--project-root', value.root, '--operation', operation],
        {},
      ),
      /frozen/,
    ),
  );
  await Promise.resolve(
    assert.rejects(
      runReleaseRetarget(
        ['--kind', 'release-retarget', '--mode', 'inspect', '--project-root', value.root, '--operation', '../escape'],
        {},
      ),
      /invalid/,
    ),
  );
});

test('successful local logs never replace trusted CI/CD delivery evidence', async () => {
  const value = await fixture();
  const inputs = ['packages/agent/lib.js'];
  const tests = ['retained-behavior', 'static', 'release-local'].map((lane) => {
    const file = '.tmp/log-' + lane + '.json';
    write(value.root, file, { exit_code: 0, command: 'inert observation', started_at: 'a', completed_at: 'b' });
    return {
      lane,
      path: file,
      inputs,
      input_binding: testInputBinding(value.root, inputs),
      sha256: sha(read(value.root, file)),
    };
  });
  write(value.root, folder + '/tests.json', { operation_id: operation, version, tests });
  await Promise.resolve(
    assert.rejects(verifyLocalReleaseTests({ ...value.input, version, ci: undefined }), /GAP-VIDA-CI-DELIVERY-001/),
  );
});

test('public fixed kind is read-only and missing initial ACK resumes only unchanged preimages', async () => {
  const value = await fixture();
  const { runReconcileArtifacts } = await import('../bin/reconcile-artifacts.ts');
  const result = await runReconcileArtifacts([
    '--kind',
    'release-retarget',
    '--mode',
    'inspect',
    '--project-root',
    value.root,
    '--operation',
    operation,
  ]);
  if (typeof result !== 'object' || result === null || !('status' in result))
    throw new Error('Fixed reconcile inspect result has no status.');
  assert.equal(result.status, 'requires_staged_candidate');
  assert.equal(existsSync(path.join(value.root, folder + '/retarget')), false);
  await value.stage();
  await plan(value);
  rmSync(path.join(value.root, folder + '/retarget/state.json'));
  assert.throws(() => assertReleaseRetargetSettled(value.root, operation), /missing phase/);
  assert.equal((await applyReleaseRetarget(value.input)).status, 'complete');
});

test('mixed release effect before archive ACK and self-consistent forged field changes deny', async () => {
  for (const type of ['mixed', 'field']) {
    const value = await fixture();
    await value.stage();
    await plan(value);
    const frozen = retargetPlan(value.root);
    if (type === 'mixed') {
      write(value.root, archive, value.bytes);
      write(value.root, folder + '/release.json', frozen.release_after);
    } else {
      frozen.release_after.elapsed_ms = 99;
      const { digest, ...body } = frozen;
      void digest;
      write(value.root, folder + '/retarget/plan.json', { ...body, digest: sha(json(body)) });
    }
    const files = [archive, folder + '/release.json', folder + '/retarget/state.json'];
    const before = files.map((file) => read(value.root, file));
    await Promise.resolve(assert.rejects(applyReleaseRetarget(value.input), /UNKNOWN|continuity|differs/));
    for (const [index, file] of files.entries()) assert.deepEqual(read(value.root, file), before[index]);
  }
});

for (const boundary of ['planning', 'custody_reserved', 'custody_ready'])
  test(
    'planning reservation excludes workers and incomplete custody is never reconstructed (' + boundary + ')',
    async () => {
      const value = await fixture();
      await value.stage();
      let launches = 0;
      await assert.rejects(
        planReleaseRetarget(
          { ...value.input, actor: 'isolated human controller' },
          {
            onPhase: async (phase) => {
              if (phase !== boundary) return;
              // The legacy adapter remains fail-closed; the local assurance check still verifies the retarget gate.
              await Promise.resolve(
                assert.rejects(
                  reserveReleaseWorker(value.root, operation, () => {
                    launches++;
                    return 11;
                  }),
                  /Legacy release worker launch lacks durable service custody; preserve the operation\./,
                ),
              );
              await Promise.resolve(
                assert.rejects(verifyLocalReleaseTests({ ...value.input, version, ci: undefined }), /active/),
              );
              throw Error('planning fault');
            },
          },
        ),
        /planning fault/,
      );
      assert.equal(launches, 0);
      assert.deepEqual(read(value.root, archive), value.oldBytes);
      if (boundary === 'planning') {
        assert.equal(existsSync(path.join(value.root, folder + '/retarget/custody')), false);
        await plan(value);
        assert.equal((await applyReleaseRetarget(value.input)).status, 'complete');
      } else if (boundary === 'custody_reserved') {
        await Promise.resolve(assert.rejects(plan(value), /partial custody/));
        await Promise.resolve(assert.rejects(applyReleaseRetarget(value.input), /missing/));
        assert.equal(existsSync(path.join(value.root, folder + '/retarget/custody/seal.json')), false);
      } else assert.equal((await applyReleaseRetarget(value.input)).status, 'complete');
    },
  );

test('clean planning lost initial ACK resumes once with unchanged frozen inputs only', async () => {
  for (const drift of [false, true]) {
    const value = await fixture();
    await value.stage();
    await Promise.resolve(
      assert.rejects(
        planReleaseRetarget(
          { ...value.input, actor: 'isolated human controller' },
          {
            onPhase: (phase) => {
              if (phase === 'planning') throw Error('fault before custody');
            },
          },
        ),
        /fault/,
      ),
    );
    rmSync(path.join(value.root, folder + '/retarget/state.json'));
    if (drift) {
      write(value.root, '.tmp/old-log.json', { foreign: true });
      await Promise.resolve(assert.rejects(applyReleaseRetarget(value.input), /preimage/));
      assert.equal(existsSync(path.join(value.root, folder + '/retarget/custody')), false);
    } else {
      await Promise.resolve(
        assert.rejects(
          applyReleaseRetarget(value.input, {
            onPhase: (phase) => {
              if (phase === 'planning_recovered') throw Error('recovered phase ACK lost');
            },
          }),
          /ACK lost/,
        ),
      );
      assert.equal(existsSync(path.join(value.root, folder + '/retarget/custody')), false);
      assert.equal((await applyReleaseRetarget(value.input)).status, 'complete');
    }
  }
});

test('formation profile validates build identity without installation tests and preserves extended requirements', async () => {
  const value = await fixture();
  await value.stage();
  await plan(value);
  await applyReleaseRetarget(value.input);
  const proof = ciRecord(value, ['native-build']);
  assert.equal(validateCIDeliveryObservation(proof).source_binding, proof.request.source_binding);
  assert.equal(
    (
      await verifyLocalReleaseAssurance({
        ...value.input,
        version,
        ci: { request_id: proof.request.request_id, profile: proof.profile, observe: async () => proof.observation },
      })
    ).source_binding,
    proof.request.source_binding,
  );
  await Promise.resolve(
    assert.rejects(
      verifyLocalReleaseAssurance({
        ...value.input,
        version,
        ci: {
          request_id: proof.request.request_id,
          profile: proof.profile,
          observe: async () => malformedObservation(true),
        },
      }),
      /contract fields/,
    ),
  );
  for (const checks of [[], ['public-routes'], ['native-build', 'native-install'], ['native-build', 'unsupported']]) {
    assert.throws(
      () => validateCIDeliveryObservation({ ...proof, profile: { ...proof.profile, required_checks: checks } }),
      /profile/,
    );
  }
  const extended = ciRecord(value);
  assert.throws(() => validateCIDeliveryObservation({ ...proof, profile: extended.profile }), /checks/);
  const result = typedFixtureIO(proof.observation.result_bytes.toString('utf8'), fixtureRecord);
  if (!isFixtureRecord(result.asset)) throw new Error('CI result fixture asset must be an object.');
  const asset = result.asset;
  asset.sha256 = '0'.repeat(64);
  result.asset = asset;
  assert.throws(
    () =>
      validateCIDeliveryObservation({
        ...proof,
        observation: { ...proof.observation, result_bytes: Buffer.from(json(result)) },
      }),
    /differs/,
  );
});

test('CI selected job shape and cardinality fail before artifact reads in both consumers', async () => {
  const value = await fixture();
  const request = requestForCI({ ...value.input, context: ciContext, target: 'bun-windows-x64' });
  const data = githubTransportFixture(request, Buffer.from('inert job-selection transport'));
  const workflow = Buffer.from('inert workflow definition');
  const candidate = ciCandidateForRequest(request, Buffer.from('inert candidate archive; no executable'));
  const pages: { name: string; jobs: unknown[]; total: number; observerOnly?: boolean }[] = [
    { name: 'missing', jobs: [{ name: 'unrelated' }], total: 1 },
    { name: 'duplicate', jobs: [data.job, data.job], total: 2 },
    { name: 'selected shape', jobs: [{ ...data.job, steps: null }], total: 1 },
    {
      name: 'selected step shape',
      jobs: [{ ...data.job, steps: [{ name: 'invalid', status: 'completed' }] }],
      total: 1,
    },
    { name: 'foreign attempt', jobs: [{ ...data.job, run_attempt: 3 }], total: 1 },
    { name: 'failed selected job', jobs: [{ ...data.job, conclusion: 'failure' }], total: 1 },
    { name: 'incomplete page', jobs: [data.job], total: 2 },
    ...['failure', 'skipped'].map((conclusion) => ({
      name: 'required step ' + conclusion,
      jobs: [
        { ...data.job, steps: data.job.steps.map((step, index) => (index === 0 ? { ...step, conclusion } : step)) },
      ],
      total: 1,
      observerOnly: true,
    })),
  ];
  const before = read(value.root, pending);
  const priorFetch = globalThis.fetch;
  try {
    for (const page of pages) {
      const calls: string[] = [];
      globalThis.fetch = mockedFetch(priorFetch, async (input) => {
        const url = fetchURL(input);
        calls.push(url);
        if (url.includes('/attempts/2/jobs?')) return Response.json({ total_count: page.total, jobs: page.jobs });
        if (url.endsWith('/runs/17/attempts/2')) return Response.json(data.run);
        if (url.includes('/contents/'))
          return Response.json({ encoding: 'base64', content: workflow.toString('base64') });
        throw new Error('Fixture rejects unexpected later provider request: ' + url);
      });
      const failure = /(?:provider job|native job|download job|bounded.*job|native step failed)/;
      if (!page.observerOnly) {
        await assert.rejects(
          downloadGitHubCIDelivery({
            root: value.root,
            request,
            profile: data.profile,
            run_id: '17',
            run_attempt: 2,
            artifact_id: '19',
          }),
          failure,
          page.name + ' download',
        );
      }
      await assert.rejects(
        observeGitHubCIDelivery({
          root: value.root,
          request,
          candidate,
          profile: data.profile,
          run_id: 17,
          run_attempt: 2,
          artifact_id: 19,
          transport_path: '.tmp/inert-unread.zip',
        }),
        failure,
        page.name + ' observer',
      );
      assert.equal(
        calls.some((url) => url.includes('/artifacts/')),
        false,
        page.name + ' stops before artifact',
      );
      assert.deepEqual(read(value.root, pending), before, page.name + ' retains release');
    }
  } finally {
    globalThis.fetch = priorFetch;
  }
});

test('CI provider byte reader rejects oversized and non-byte streams before later requests', async () => {
  const value = await fixture();
  const request = requestForCI({ ...value.input, context: ciContext, target: 'bun-windows-x64' });
  const data = githubTransportFixture(request, Buffer.from('inert transport'));
  const candidate = ciCandidateForRequest(request, Buffer.from('inert archive'));
  const before = read(value.root, pending);
  const priorFetch = globalThis.fetch;
  try {
    for (const kind of ['oversized', 'non-byte']) {
      let calls = 0;
      globalThis.fetch = mockedFetch(priorFetch, async () => {
        calls++;
        if (kind === 'oversized') return new Response(Buffer.alloc(8 * 1024 * 1024 + 1, 32));
        return new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(JSON.stringify(data.run));
              controller.close();
            },
          }),
        );
      });
      const failure =
        kind === 'oversized' ? /provider response oversized/ : /provider response contains a non-byte chunk/;
      await assert.rejects(
        downloadGitHubCIDelivery({
          root: value.root,
          request,
          profile: data.profile,
          run_id: '17',
          run_attempt: 2,
          artifact_id: '19',
        }),
        failure,
      );
      await assert.rejects(
        observeGitHubCIDelivery({
          root: value.root,
          request,
          candidate,
          profile: data.profile,
          run_id: 17,
          run_attempt: 2,
          artifact_id: 19,
          transport_path: '.tmp/inert-unread.zip',
        }),
        failure,
      );
      assert.equal(calls, 2, kind + ' rejects each first provider response');
      assert.deepEqual(read(value.root, pending), before);
    }
  } finally {
    globalThis.fetch = priorFetch;
  }
});
