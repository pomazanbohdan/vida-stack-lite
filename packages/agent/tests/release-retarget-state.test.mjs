import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { afterEach, test as baseTest } from 'bun:test';
import { pinnedEnvironment } from '../bin/bun.mjs';
import {
  releaseDigest as sha,
  releaseJSON as json,
  releaseSourceBinding,
  releaseState,
  operationMutex,
  admissionMutex,
  assertReleaseRetargetSettled,
} from '../bin/local-release-artifacts.mjs';
import {
  stageNativeRetargetCandidate,
  planReleaseRetarget,
  applyReleaseRetarget,
  inspectReleaseRetarget,
  runReleaseRetarget,
  readNativeRetargetCandidate,
} from '../bin/repair-release-retarget.mjs';
import {
  reserveReleaseWorker,
  claimReleaseWorker,
  withReleaseAdmission,
  runCommand,
} from '../../../tooling/agent/release-local.mjs';
import { testInputBinding, verifyLocalReleaseTests } from '../../../tooling/agent/release-assurance.mjs';
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
} from '../../../tooling/agent/release-ci-evidence.mjs';
import {
  validateNativeCIInvocation,
  validateNativeCIReceipts,
  validateNativeCIDenial,
  validateNativeCIUnadmittedRun,
} from '../../../tooling/agent/native-ci-delivery.mjs';

const roots = new Set(),
  operation = 'local-original',
  version = '0.1.2';
const folder = '.agent/work/agent-local-release/' + operation;
const pending = '.agent/work/agent-local-release/pending.json';
const successful = '.agent/work/agent-local-release/successful.json';
const archive = '.tmp/releases/' + operation + '/vida-agent-0.1.2.tgz';
let activeCases = 0,
  outcomeUnknown = false;
function test(name, execute) {
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
const read = (root, file) => readFileSync(path.join(root, file));
const obj = (root, file) => JSON.parse(read(root, file));
function write(root, file, value) {
  mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  writeFileSync(path.join(root, file), typeof value === 'object' && !Buffer.isBuffer(value) ? json(value) : value);
}
function metadata(bytes, files) {
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
test('ordinary command failures retain bounded stdout and stderr diagnostics with full terminal receipts', async () => {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-retarget-state-command-'));
  roots.add(root);
  const successArgs = [
    '--no-env-file',
    '--no-install',
    '-e',
    'process.stdout.write("  result  \\n");process.stderr.write("ordinary warning")',
  ];
  const commands = [
    ...['stdout', 'stderr', 'both'].map((mode) => {
      const script = `const mode=${JSON.stringify(mode)};if(mode!=='stderr')process.stdout.write('x'.repeat(2050)+'stdout diagnostic');if(mode!=='stdout')process.stderr.write('y'.repeat(2050)+'stderr diagnostic');process.exit(2)`;
      return { mode, args: ['--no-env-file', '--no-install', '-e', script] };
    }),
    { mode: 'success', args: successArgs },
  ];
  const started = process.hrtime.bigint();
  let deadlineTimer;
  const deadline = new Promise((resolve) => {
    deadlineTimer = setTimeout(() => resolve({ kind: 'deadline' }), 4000);
  });
  const observations = Promise.allSettled(
    commands.map(async ({ mode, args }) => {
      let value, message = null;
      try {
        value = await runCommand(process.execPath, args, {
          cwd: root,
          env: pinnedEnvironment(process.execPath),
          log: path.resolve(root, mode + '.json'),
        });
      } catch (error) {
        message = error.message;
      }
      writeFileSync(
        path.resolve(root, mode + '-observed.json'),
        json(mode === 'success' ? { value, message } : { message, args }),
      );
    }),
  );
  let joined;
  try {
    joined = await Promise.race([observations.then((results) => ({ kind: 'settled', results })), deadline]);
  } finally {
    clearTimeout(deadlineTimer);
  }
  const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;
  if (joined.kind !== 'settled' || elapsedMs > 4000) {
    outcomeUnknown = true;
    assert.fail('UNKNOWN ordinary command observations exceeded the 4000ms deadline; retain root and partial streams: ' + root);
  }
  const receipts = {};
  for (const { mode } of commands) {
    const log = path.resolve(root, mode + '.json');
    if (!existsSync(log)) {
      outcomeUnknown = true;
      assert.fail('UNKNOWN ordinary command close receipt missing; retain root and child state: ' + root);
    }
    let receipt;
    try {
      receipt = JSON.parse(readFileSync(log, 'utf8'));
    } catch {
      outcomeUnknown = true;
      assert.fail('UNKNOWN ordinary command close receipt incomplete; retain root and child state: ' + root);
    }
    if (
      !receipt ||
      typeof receipt !== 'object' ||
      typeof receipt.command !== 'string' ||
      !Array.isArray(receipt.args) ||
      !Number.isFinite(receipt.elapsed_ms) ||
      typeof receipt.stdout !== 'string' ||
      typeof receipt.stderr !== 'string' ||
      (!(Number.isInteger(receipt.code) && receipt.signal === null) &&
        !(receipt.code === null && typeof receipt.signal === 'string' && receipt.signal.length > 0))
    ) {
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
    const observed = JSON.parse(readFileSync(path.join(root, mode + '-observed.json'), 'utf8'));
    assert.equal(typeof observed.message, 'string', 'Nonzero command must reject');
    assert.deepEqual(observed.args, args);
    const body = observed.message.slice(observed.message.indexOf('\n') + 1);
    assert.ok(body.includes('\nstdout:\n'), 'Output must be in the diagnostic body, not literal command arguments');
    assert.ok(body.includes('stderr:\n'));
    assert.ok(body.length <= 4096 + 32, 'Each diagnostic stream tail stays bounded');
    const receipt = receipts[mode];
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
  assert.equal(JSON.parse(readFileSync(path.join(root, 'success-observed.json'), 'utf8')).value, 'result');
  const success = receipts.success;
  assert.equal(success.command, process.execPath);
  assert.deepEqual(success.args, successArgs);
  assert.equal(success.code, 0);
  assert.equal(success.signal, null);
  assert.equal(success.stdout, '  result  \n');
  assert.equal(success.stderr, 'ordinary warning');
});
// Tiny inert archive members are state-machine fixtures; no build, package command or installation is executed.
async function fixture({ success = false } = {}) {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-retarget-state-'));
  roots.add(root);
  const manifest = {
    name: 'vida-agent',
    version,
    bin: { 'vida-agent': './bin/vida-agent.mjs' },
    engines: { bun: '1.4.2' },
    packageManager: 'bun@1.4.2',
  };
  write(root, 'packages/agent/package.json', manifest);
  write(root, 'packages/agent/lib.js', 'export const inert = 1;\n');
  for (const file of [
    'package.json',
    'agent-runtime.config.v1.yaml',
    'AGENT.sidecar.md',
    'tooling/agent/release-local.mjs',
    'tooling/agent/release-assurance.mjs',
    'tooling/agent/release-ci-evidence.mjs',
    'tooling/agent/native-ci-delivery.mjs',
    'tooling/agent/controllers/forward-review-proof.mjs',
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
  const native = {
    schema: 'VidaStandaloneBuild/v1',
    version,
    pin: '1.4.2',
    target: 'bun-linux-x64',
    payloadId: sha('inert embedded payload'),
    inputs: [
      {
        path: 'lib.js',
        bytes: read(root, 'packages/agent/lib.js').length,
        sha256: sha(read(root, 'packages/agent/lib.js')),
      },
    ],
    asset: { file, bytes: asset.length, sha256: sha(asset) },
  };
  const contents = {
    'package/package.json': json(manifest),
    'package/lib.js': read(root, 'packages/agent/lib.js'),
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
const plan = (value) => planReleaseRetarget({ ...value.input, actor: 'isolated human controller' });

const ciContext = { schema: 'ProjectContext/v1', repository_id: 'vida-agent', project_ids: ['agent'] };
test('CI dormant invocation binds exact repository job published commit and native target', async () => {
  const value = await fixture();
  const request = recordCIDeliveryRequest({ ...value.input, context: ciContext, target: 'bun-windows-x64' });
  const commit = sha('inert published commit').slice(0, 40);
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
  };
  const input = { env, platform: 'win32', arch: 'x64', bun: '1.4.2' };
  assert.deepEqual(validateNativeCIInvocation(input).request, request);
  for (const [key, bad] of [
    ['VIDA_NATIVE_CI_ENABLED', 'false'],
    ['GITHUB_SHA', sha('other commit').slice(0, 40)],
    ['GITHUB_REPOSITORY_ID', '18'],
    ['GITHUB_JOB', 'other'],
    ['GITHUB_RUN_ATTEMPT', '0'],
  ])
    assert.throws(
      () => validateNativeCIInvocation({ ...input, env: { ...env, [key]: bad } }),
      /GAP-VIDA-CI-DELIVERY-001/,
    );
  assert.throws(() => validateNativeCIInvocation({ ...input, platform: 'linux' }), /pinned producer/);
  assert.throws(() => validateNativeCIInvocation({ ...input, bun: '1.4.1' }), /pinned producer/);
});

test('CI emission requires all seven exact ordered terminal receipts and known denials', async () => {
  const value = await fixture(),
    request = recordCIDeliveryRequest({ ...value.input, context: ciContext, target: 'bun-windows-x64' });
  const identity = { request, run_id: '17', run_attempt: 2 },
    candidate = { archive_sha256: sha('inert archive') };
  const receipts = nativeDeliveryChecks.map((phase) => ({
    schema: 'VidaCIPhaseResult/v1',
    request_id: request.request_id,
    run_id: '17',
    run_attempt: 2,
    source_binding: request.source_binding,
    archive_sha256: candidate.archive_sha256,
    phase,
    status: 'passed',
  }));
  validateNativeCIReceipts({ identity, candidate, receipts });
  assert.throws(
    () => validateNativeCIReceipts({ identity, candidate, receipts: receipts.slice(1) }),
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
  ]) {
    const changed = structuredClone(receipts);
    change(changed[2]);
    assert.throws(() => validateNativeCIReceipts({ identity, candidate, receipts: changed }), /CI phase observation/);
  }
  validateNativeCIDenial({ code: 1, signal: null, stderr: 'invalid argument' }, /invalid argument/);
  const blocked = {
    schema: 'VidaAgentRunResult/v1',
    status: 'blocked',
    code: 'GAP-VIDA-RUN-WORKFLOW-001',
    message:
      'The requested workflow is not configured for this selection. Next action: inspect the exact work and check its issued contract before retrying.',
  };
  const denial = { code: 1, signal: null, stderr: JSON.stringify(blocked) };
  validateNativeCIUnadmittedRun(denial);
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
    { code: 1, signal: null, stderr: 'Cannot find native module' },
    { code: 0, signal: null, stderr: 'invalid argument' },
  ])
    assert.throws(() => validateNativeCIDenial(record, /invalid argument/), /FAIL\/UNKNOWN retained/);
  assert.throws(
    () =>
      validateNativeCIDenial(
        { code: 1, signal: null, stderr: 'invalid argument; Cannot find package native-runtime' },
        /invalid argument/,
      ),
    /prerequisite failure/,
  );
});

function githubTransportFixture(request, bytes) {
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
    request = recordCIDeliveryRequest({ ...value.input, context: ciContext, target: 'bun-windows-x64' });
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
  ]) {
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
  const input = {
    declared: { dependencies: { '@openclaw/fs-safe': '0.5.6' } },
    lock: '{"jszip": ["jszip@3.10.1", "", {}]}',
    fsSafe: { name: '@openclaw/fs-safe', version: '0.5.6' },
    zip: { name: 'jszip', version: '3.10.1' },
  };
  validateCIZIPReaderVersions(input);
  for (const change of [
    (value) => {
      value.zip.version = '3.10.2';
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
  ]) {
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
  const JSZip = createRequire(archiveModule)('jszip');
  const value = await fixture();
  const request = recordCIDeliveryRequest({ ...value.input, context: ciContext, target: 'bun-windows-x64' });
  const workflow = Buffer.from('inert workflow definition');
  const nested = Buffer.from('inert candidate archive; no executable');
  const candidate = { archive_sha256: sha(nested), pack_metadata: [{ filename: 'candidate.tgz' }] };
  const parent = path.join(readerRoot, '.tmp');
  mkdirSync(parent, { recursive: true });
  const directory = mkdtempSync(path.join(parent, 'vida-ci-zip-'));
  const originalFetch = globalThis.fetch;
  try {
    for (const duplicate of [false, true]) {
      const zip = new JSZip().file('result.json', '{"inert":true}').file('candidate.tgz', nested);
      if (duplicate) zip.file('shadow.json', '{"inert":"duplicate"}');
      const bytes = Buffer.from(await zip.generateAsync({ type: 'nodebuffer', compression: 'STORE' }));
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
        '/actions/runs/17/attempts/2/jobs?per_page=100': { total_count: 1, jobs: [data.job] },
        '/actions/artifacts/19': data.artifact,
      };
      let calls = 0;
      globalThis.fetch = async (url) => {
        calls++;
        const suffix = String(url).replace('https://api.github.com/repos/' + data.profile.github.repository, '');
        assert.ok(Object.hasOwn(replies, suffix), 'No unmocked provider request');
        return new Response(JSON.stringify(replies[suffix]));
      };
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
        await assert.rejects(
          observe(),
          /GAP-VIDA-CI-DELIVERY-001: qualified ZIP reader unavailable or artifact invalid/,
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

for (const kind of ['complete', 'partial', 'oversized', 'wrong-digest', 'wrong-commit'])
  test('CI explicit mocked transport ' + kind + ' keeps bounded custody and never forwards credentials', async () => {
    const value = await fixture(),
      request = recordCIDeliveryRequest({ ...value.input, context: ciContext, target: 'bun-windows-x64' }),
      bytes = Buffer.from('inert ZIP transport bytes; no delivery artifact');
    const pendingBefore = read(value.root, pending);
    const data = githubTransportFixture(request, bytes),
      calls = [],
      priorFetch = globalThis.fetch;
    if (kind === 'wrong-digest') data.artifact.digest = 'sha256:' + sha('other');
    if (kind === 'wrong-commit') data.run.head_sha = sha('other commit').slice(0, 40);
    globalThis.fetch = async (url, options) => {
      calls.push({ url, options });
      if (url.includes('/attempts/2/jobs?')) return Response.json({ total_count: 1, jobs: [data.job] });
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
    };
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
      if (kind === 'complete') {
        assert.equal((await downloadGitHubCIDelivery(options)).transport_path, relative);
        assert.deepEqual(read(value.root, relative), bytes);
        const count = calls.length;
        await assert.rejects(downloadGitHubCIDelivery(options), /retained download exists/);
        assert.equal(calls.length, count);
      } else {
        await assert.rejects(downloadGitHubCIDelivery(options));
        assert.equal(existsSync(path.join(value.root, relative)), kind !== 'wrong-commit');
        if (kind !== 'wrong-commit') {
          const count = calls.length;
          await assert.rejects(downloadGitHubCIDelivery(options), /retained download exists/);
          assert.equal(calls.length, count);
        }
      }
      assert.ok(
        calls
          .filter((call) => call.url.startsWith('https://api.github.com/'))
          .every((call) => call.options.headers.Authorization === 'Bearer explicit-inert-fixture-token'),
      );
      if (kind === 'wrong-commit') assert.equal(calls.length, 1);
      assert.deepEqual(read(value.root, pending), pendingBefore);
    } finally {
      globalThis.fetch = priorFetch;
    }
  });
function ciRecord(value) {
  const request = recordCIDeliveryRequest({ ...value.input, context: ciContext, target: 'bun-linux-x64' });
  const candidate = readNativeRetargetCandidate(value.input);
  const profile = {
    issuer: 'isolated-ci-fixture',
    repository_id: ciContext.repository_id,
    project_ids: ciContext.project_ids,
    target: request.target,
    required_checks: [...nativeDeliveryChecks],
  };
  const observed = {
    schema: 'VidaCIDeliveryObservation/v1',
    issuer: profile.issuer,
    run_id: 'fixture-run',
    run_attempt: 1,
    artifact_id: 'fixture-artifact',
    conclusion: 'success',
    checks: profile.required_checks.map((id) => ({ id, status: 'passed' })),
  };
  const { schema: _schema, artifact_id: _artifact, ...producer } = observed;
  const observation = {
    ...observed,
    result_bytes: encodeCIDeliveryResult({ request, candidate, profile, observation: producer }),
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
  write(value.root, 'tooling/agent/release-ci-evidence.mjs', 'changed in-scope repository consumer');
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
  assert.throws(
    () => recordCIDeliveryRequest({ ...args, context: { ...ciContext, project_ids: ['agent', 'agent'] } }),
    /project/,
  );
});

test('candidate view reads sealed archive bytes without Source dist and requires exact publication', async () => {
  const value = await fixture();
  await value.stage();
  const candidate = readNativeRetargetCandidate(value.input);
  assert.equal(existsSync(path.join(value.root, 'packages/agent/dist')), false);
  assert.equal(sha(readFileSync(candidate.asset.path)), candidate.manifest.asset.sha256);
  assert.throws(() => readNativeRetargetCandidate({ ...value.input, published: true }), /published candidate/);
  await plan(value);
  await applyReleaseRetarget(value.input);
  assert.equal(readNativeRetargetCandidate({ ...value.input, published: true }).archive_sha256, sha(value.bytes));
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
      observe: async ({ request, candidate }) => {
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
  await assert.rejects(verifyCIDeliveryEvidence({ ...value.input, version }), /actual trusted controller/);
  await assert.rejects(
    verifyCIDeliveryEvidence({
      ...value.input,
      version,
      ci: { request_id: proof.request.request_id, profile: proof.profile, observe: async () => true },
    }),
    /contract fields/,
  );
});

test('CI wrong issuer checks payload Source target and run bindings deny without effects', async () => {
  const value = await fixture();
  await value.stage();
  const proof = ciRecord(value),
    validate = (changes) => validateCIDeliveryObservation({ ...proof, ...changes });
  assert.throws(() => validate({ observation: { ...proof.observation, issuer: 'foreign' } }), /observation/);
  assert.throws(() => validate({ observation: { ...proof.observation, conclusion: 'UNKNOWN' } }), /observation/);
  assert.throws(
    () => validate({ observation: { ...proof.observation, checks: [{ id: 'native-build', status: 'passed' }] } }),
    /checks/,
  );
  assert.throws(() => validate({ profile: { ...proof.profile, required_checks: ['native-build'] } }), /full native/);
  for (const field of ['run_id', 'source_binding', 'archive_sha256', 'manifest_sha256', 'payload_id', 'target']) {
    const result = JSON.parse(proof.observation.result_bytes);
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
  await assert.rejects(
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
  );
  write(value.root, 'packages/agent/lib.js', 'changed Source');
  await assert.rejects(
    verifyCIDeliveryEvidence({
      ...value.input,
      version,
      ci: { request_id: proof.request.request_id, profile: proof.profile, observe: async () => proof.observation },
    }),
    /Source differs/,
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
    observe: async ({ request, candidate }) => {
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
  await assert.rejects(verifyCIDeliveryEvidence({ ...value.input, version, ci }), /input changed/);
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
    await assert.rejects(
      verifyLocalReleaseTests({
        ...value.input,
        version,
        ci: {
          request_id: proof.request.request_id,
          profile: proof.profile,
          observe: async () => {
            if (changed === 'log') write(value.root, tests[0].path, { exit_code: 1 });
            if (changed === 'proof') write(value.root, folder + '/tests.json', '{}');
            if (changed === 'input') write(value.root, input, { state: 'changed' });
            return proof.observation;
          },
        },
      }),
      /Local test (evidence|input) changed/,
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
    const frozen = obj(root, folder + '/retarget/plan.json');
    for (const entry of frozen.custody) assert.equal(sha(read(root, entry.copy)), entry.sha256);
    assert.ok(frozen.custody.some((entry) => entry.path === '.tmp/old-input.json'));
    assertReleaseRetargetSettled(root, operation);
    await reserveReleaseWorker(root, operation, () => 778899);
    const worker = await claimReleaseWorker(root, operation, 778899);
    worker.close();
    assertReleaseRetargetSettled(root, operation);
    await assert.rejects(applyReleaseRetarget(value.input), /eligible/);
  }
});

for (const boundary of ['archive_effect', 'archive', 'release_effect', 'release'])
  test('resume recognizes only retained known phase after ' + boundary, async () => {
    const value = await fixture();
    await value.stage();
    await plan(value);
    await assert.rejects(
      applyReleaseRetarget(value.input, {
        onPhase: (phase) => {
          if (phase === boundary) throw Error('fault');
        },
      }),
      /fault/,
    );
    assert.throws(() => assertReleaseRetargetSettled(value.root, operation), /active/);
    assert.equal((await applyReleaseRetarget(value.input)).status, 'complete');
    assert.deepEqual(read(value.root, archive), value.bytes);
  });

test('busy worker and admission deny before custody or effects', async () => {
  const value = await fixture();
  await value.stage();
  const worker = operationMutex(value.root, operation);
  try {
    await assert.rejects(plan(value), /busy/);
    const module = new URL('../bin/local-release-artifacts.mjs', import.meta.url).href;
    const child = spawnSync(
      'node',
      [
        '--input-type=module',
        '-e',
        'const {operationMutex}=await import(process.argv[1]); const db=operationMutex(process.argv[2],process.argv[3]); console.log(db ? "open" : "busy"); db?.close();',
        module,
        value.root,
        operation,
      ],
      { encoding: 'utf8', windowsHide: true },
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
    await assert.rejects(applyReleaseRetarget(value.input), /locked|busy/i);
  } finally {
    admission.close();
  }
  assert.deepEqual(read(value.root, archive), value.oldBytes);
});

test('active, failed, UNKNOWN and installation-started original states deny', async () => {
  for (const status of ['running', 'failed', 'successful', 'UNKNOWN']) {
    const value = await fixture();
    write(value.root, folder + '/release.json', { ...value.original, status });
    await assert.rejects(value.stage(), /eligible|invalid/);
  }
  const value = await fixture();
  write(value.root, folder + '/release.json', { ...value.original, install_started: true });
  await assert.rejects(value.stage(), /eligible/);
});

test('existing partial candidate staging is preserved without overwrite', async () => {
  const partial = await fixture();
  mkdirSync(path.join(partial.root, folder + '/retarget/candidate'), { recursive: true });
  await assert.rejects(partial.stage(), /EEXIST/);
});
for (const target of ['candidate', 'custody', 'Source', 'pointer', 'archive', 'missing'])
  test(target + ' drift remains UNKNOWN without overwrite', async () => {
    const value = await fixture();
    await value.stage();
    await plan(value);
    const frozen = obj(value.root, folder + '/retarget/plan.json');
    if (target === 'candidate') write(value.root, folder + '/retarget/candidate/archive.tgz', 'tamper');
    if (target === 'custody') write(value.root, frozen.custody[0].copy, 'tamper');
    if (target === 'Source') write(value.root, 'packages/agent/lib.js', 'changed Source');
    if (target === 'pointer') write(value.root, successful, { foreign: true });
    if (target === 'archive') write(value.root, archive, 'foreign archive');
    if (target === 'missing') rmSync(path.join(value.root, folder + '/retarget/custody/publication.tgz'));
    await assert.rejects(applyReleaseRetarget(value.input), /changed|differs|missing|UNKNOWN/);
    assert.deepEqual(obj(value.root, folder + '/release.json'), value.original);
  });

test('admission rollback, source-input binding and CLI attribution stay narrow', async () => {
  const value = await fixture();
  await assert.rejects(
    withReleaseAdmission(value.root, () => {
      throw Error('rollback');
    }),
    /rollback/,
  );
  await withReleaseAdmission(value.root, () => 1);
  const before = testInputBinding(value.root, ['packages/agent/lib.js']);
  write(value.root, 'packages/agent/lib.js', 'changed');
  assert.notEqual(testInputBinding(value.root, ['packages/agent/lib.js']), before);
  assert.throws(() => releaseState(path.join(value.root, folder + '/release.json') + '/escape'));
  await assert.rejects(
    runReleaseRetarget([
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
    ]),
    /frozen/,
  );
  await assert.rejects(
    runReleaseRetarget([
      '--kind',
      'release-retarget',
      '--mode',
      'inspect',
      '--project-root',
      value.root,
      '--operation',
      '../escape',
    ]),
    /invalid/,
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
  await assert.rejects(verifyLocalReleaseTests({ ...value.input, version }), /GAP-VIDA-CI-DELIVERY-001/);
});

test('public fixed kind is read-only and missing initial ACK resumes only unchanged preimages', async () => {
  const value = await fixture();
  const { runReconcileArtifacts } = await import('../bin/reconcile-artifacts.mjs');
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
    const frozen = obj(value.root, folder + '/retarget/plan.json');
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
    await assert.rejects(applyReleaseRetarget(value.input), /UNKNOWN|continuity|differs/);
    for (const [index, file] of files.entries()) assert.deepEqual(read(value.root, file), before[index]);
  }
});

for (const boundary of ['planning', 'custody_reserved', 'custody_ready'])
  test('planning reservation excludes workers and incomplete custody is never reconstructed (' + boundary + ')', async () => {
    const value = await fixture();
    await value.stage();
    let launches = 0;
    await assert.rejects(
      planReleaseRetarget(
        { ...value.input, actor: 'isolated human controller' },
        {
          onPhase: async (phase) => {
            if (phase !== boundary) return;
            await assert.rejects(
              reserveReleaseWorker(value.root, operation, () => {
                launches++;
                return 11;
              }),
              /active/,
            );
            await assert.rejects(verifyLocalReleaseTests({ ...value.input, version }), /active/);
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
      await assert.rejects(plan(value), /partial custody/);
      await assert.rejects(applyReleaseRetarget(value.input), /missing/);
      assert.equal(existsSync(path.join(value.root, folder + '/retarget/custody/seal.json')), false);
    } else assert.equal((await applyReleaseRetarget(value.input)).status, 'complete');
  });

test('clean planning lost initial ACK resumes once with unchanged frozen inputs only', async () => {
  for (const drift of [false, true]) {
    const value = await fixture();
    await value.stage();
    await assert.rejects(
      planReleaseRetarget(
        { ...value.input, actor: 'isolated human controller' },
        {
          onPhase: (phase) => {
            if (phase === 'planning') throw Error('fault before custody');
          },
        },
      ),
      /fault/,
    );
    rmSync(path.join(value.root, folder + '/retarget/state.json'));
    if (drift) {
      write(value.root, '.tmp/old-log.json', { foreign: true });
      await assert.rejects(applyReleaseRetarget(value.input), /preimage/);
      assert.equal(existsSync(path.join(value.root, folder + '/retarget/custody')), false);
    } else {
      await assert.rejects(
        applyReleaseRetarget(value.input, {
          onPhase: (phase) => {
            if (phase === 'planning_recovered') throw Error('recovered phase ACK lost');
          },
        }),
        /ACK lost/,
      );
      assert.equal(existsSync(path.join(value.root, folder + '/retarget/custody')), false);
      assert.equal((await applyReleaseRetarget(value.input)).status, 'complete');
    }
  }
});
