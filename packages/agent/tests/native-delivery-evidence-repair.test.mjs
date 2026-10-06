import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, test } from 'bun:test';
import {
  admissionMutex,
  createRepairSourcePass,
  operationMutex,
  releaseJSON as json,
  releaseSourceBinding,
} from '../bin/local-release-artifacts.mjs';
import { runReconcileArtifacts } from '../bin/reconcile-artifacts.mjs';
import { verifyForwardReviewSet } from '../bin/forward-review-proof.mjs';
import {
  applyNativeDeliveryEvidenceRepair,
  inspectNativeDeliveryEvidenceRepair,
  planNativeDeliveryEvidenceRepair,
} from '../bin/repair-native-delivery-evidence.mjs';
import {
  recordLocalAssurance,
  recordLocalTestEvidence,
  writeLocalSourceSeal,
} from '../../../tooling/agent/release-assurance.mjs';

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const roots = [];
const op = 'native-repair-fixture';
const base = '.agent/work/agent-local-release/' + op;
const packageRoot = path.resolve(import.meta.dirname, '..');
const write = (root, relative, value) => {
  const file = path.join(root, relative);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, Buffer.isBuffer(value) ? value : value);
};
const save = (root, relative, value) => write(root, relative, json(value));
function treeSnapshot(directory) {
  const files = [],
    directories = [];
  const visit = (current, relative = '') => {
    directories.push(relative);
    for (const entry of readdirSync(current, { withFileTypes: true }).sort((left, right) =>
      left.name.localeCompare(right.name),
    )) {
      const child = relative ? relative + '/' + entry.name : entry.name;
      if (entry.isDirectory()) visit(path.join(current, entry.name), child);
      else if (!/^worker\.sqlite(?:-wal|-shm|-journal)?$/.test(entry.name))
        files.push([child, readFileSync(path.join(current, entry.name)).toString('base64')]);
    }
  };
  visit(directory);
  return { files, directories };
}
function fixture({ tests = true, assurance = true, receiptRoot = '.agent/release-assurance' } = {}) {
  const root = mkdtempSync(path.join(tmpdir(), 'native-delivery-repair-'));
  roots.push(root);
  const sourceFiles = {
    'package.json': JSON.stringify({ name: 'fixture-root', version: '1.0.0' }) + '\n',
    'AGENT.sidecar.md': '# Fixture source\n',
    'agent-runtime.config.v1.yaml': 'version: 1\n',
    'tooling/agent/release-local.mjs': 'export const fixture = true;\n',
    'tooling/agent/release-assurance.mjs': 'export const fixture = true;\n',
    'tooling/agent/release-ci-evidence.mjs': 'export const fixture = true;\n',
    'tooling/agent/native-ci-delivery.mjs': 'export const fixture = true;\n',
    'tooling/agent/controllers/forward-review-proof.mjs': 'export const fixture = true;\n',
    'packages/agent/package.json': JSON.stringify({ name: 'vida-agent', version: '0.1.2', private: true }) + '\n',
  };
  for (const [file, contents] of Object.entries(sourceFiles)) write(root, file, contents);
  const archive = Buffer.from('synthetic original release archive');
  const metadata = [
    {
      name: 'vida-agent',
      version: '0.1.2',
      filename: 'vida-agent-0.1.2.tgz',
      integrity: 'sha512-' + createHash('sha512').update(archive).digest('base64'),
      files: [{ path: 'package/package.json' }],
    },
  ];
  write(root, '.tmp/releases/' + op + '/vida-agent-0.1.2.tgz', archive);
  const oldEntries = [{ path: 'AGENT.sidecar.md', sha256: sha('prior-source') }];
  const oldBinding = sha(JSON.stringify(oldEntries));
  const release = {
    schema: 'VidaLocalReleaseState/v1',
    operation_id: op,
    version: '0.1.2',
    status: 'awaiting_assurance',
    pid: 42,
    elapsed_ms: 1,
    source_binding: oldBinding,
    pack_metadata: metadata,
    tarball_sha256: sha(archive),
  };
  save(root, '.agent/work/agent-local-release/pending.json', release);
  save(root, base + '/release.json', release);
  const fingerprint = sha(JSON.stringify([oldBinding, sha(archive)]));
  save(root, base + '/source-seal.json', {
    operation_id: op,
    version: '0.1.2',
    source_binding: oldBinding,
    entries: oldEntries,
    tarball_sha256: sha(archive),
    sealed_fingerprint: fingerprint,
  });
  const laneLogs = [];
  for (const lane of ['retained-behavior', 'static', 'release-local']) {
    const logPath = base + '/logs/' + lane + '.json';
    const bytes = json({
      exit_code: 0,
      command: 'bun test fixture',
      started_at: '2026-10-06T00:00:00Z',
      completed_at: '2026-10-06T00:00:01Z',
    });
    write(root, logPath, bytes);
    laneLogs.push({
      lane,
      path: logPath,
      inputs: ['AGENT.sidecar.md'],
      input_binding: 'a'.repeat(64),
      sha256: sha(bytes),
    });
  }
  if (tests)
    save(root, base + '/tests.json', {
      schema: 'VidaLocalReleaseTests/v1',
      operation_id: op,
      version: '0.1.2',
      tests: laneLogs,
    });
  const reviews = [];
  const kinds = ['assurance', 'correctness', 'security'];
  for (const kind of kinds) {
    const receiptPath = `${receiptRoot}/${op}/reviews/${kind}.json`;
    const reversePath = `${receiptRoot}/${op}/reverse/${kind}.json`;
    const review = {
      schema: 'VidaForwardReviewReceipt/v1',
      operation_id: op,
      kind,
      actor: 'reviewer-' + kind,
      history_id: 'history-' + kind,
      native_tool_ref: 'tool-' + kind,
      sealed_fingerprint: fingerprint,
      fresh_blind: true,
      verdict: 'pass',
      scope_reviewed: 'complete',
    };
    const reviewBytes = json(review);
    const reverse = {
      schema: 'VidaForwardReverseValidation/v1',
      operation_id: op,
      kind,
      actor: review.actor,
      history_id: review.history_id,
      sealed_fingerprint: fingerprint,
      review_sha256: sha(reviewBytes),
      result: 'pass',
    };
    const reverseBytes = json(reverse);
    write(root, receiptPath, reviewBytes);
    write(root, reversePath, reverseBytes);
    reviews.push({
      kind,
      path: receiptPath,
      sha256: sha(reviewBytes),
      reverse_path: reversePath,
      reverse_sha256: sha(reverseBytes),
      status: 'passed',
    });
  }
  const scopePath = '.agent/work/native-repair-fixture/scope.json';
  const clearPath = '.agent/work/native-repair-fixture/documentation-clear-native-repair-fixture-closeout-0001.json';
  save(root, scopePath, {
    schema: 'ImplementationScope/v1',
    work_id: 'native-repair-fixture',
    attribution: { pointer: 'synthetic fixture' },
    allowed_paths: ['packages/agent/docs/system-specification.md'],
    clear_path: clearPath,
  });
  save(root, clearPath, {
    schema: 'DocumentationClearCheckpoint/v1',
    work_id: 'native-repair-fixture',
    status: 'pass',
    documents: [
      { path: 'packages/agent/docs/system-specification.md', sha256: sha('synthetic approved documentation') },
    ],
  });
  if (assurance)
    save(root, base + '/assurance.json', {
      schema: 'VidaLocalReleaseAssurance/v1',
      operation_id: op,
      sealed_fingerprint: fingerprint,
      scope_path: scopePath,
      clear_work_id: 'native-repair-fixture',
      repository_id: 'vida-agent',
      project_id: 'agent',
      reviews,
    });
  const protectedFiles = [scopePath, clearPath, ...reviews.flatMap(({ path, reverse_path }) => [path, reverse_path])];
  return {
    root,
    fingerprint,
    releaseBytes: readFileSync(path.join(root, base + '/release.json')),
    pendingBytes: readFileSync(path.join(root, '.agent/work/agent-local-release/pending.json')),
    archiveBytes: archive,
    laneLogs,
    reviews,
    protectedFiles,
    protectedBytes: new Map(protectedFiles.map((file) => [file, readFileSync(path.join(root, file))])),
    protectedDirectories: [
      '.agent/work/native-repair-fixture',
      receiptRoot + '/' + op + '/reviews',
      receiptRoot + '/' + op + '/reverse',
    ].map((directory) => [directory, readdirSync(path.join(root, directory)).sort()]),
  };
}
afterEach(() => {
  for (const root of roots.splice(0)) if (existsSync(root)) rmSync(root, { recursive: true, force: true });
});
const input = (root) => ({ root, operation: op });
const plan = (root) => planNativeDeliveryEvidenceRepair({ ...input(root), actor: 'synthetic repair operator' });
function addOperationInputReference(f, reference) {
  const testsPath = base + '/tests.json';
  const tests = JSON.parse(readFileSync(path.join(f.root, testsPath), 'utf8'));
  tests.tests[0].inputs.push(reference);
  save(f.root, testsPath, tests);
}
function addStandaloneManifest(f, manifest) {
  const sourceInput = 'packages/agent/tooling/native-input.mjs';
  write(f.root, sourceInput, 'export const input = true;\n');
  save(f.root, base + '/native-manifest.json', manifest);
  return sourceInput;
}
function resumeInFreshProcess(root) {
  return spawnSync(
    process.execPath,
    [
      path.join(packageRoot, 'bin/reconcile-artifacts.mjs'),
      '--kind',
      'native-delivery-evidence',
      '--mode',
      'resume',
      '--project-root',
      root,
      '--operation',
      op,
    ],
    { cwd: packageRoot, encoding: 'utf8', windowsHide: true, timeout: 4_000 },
  );
}

test('package review proof keeps cutover default and explicitly allows release-assurance only', () => {
  const cutover = fixture({ assurance: false, receiptRoot: '.agent/cutover' });
  assert.doesNotThrow(() => verifyForwardReviewSet(cutover.root, op, cutover.fingerprint, cutover.reviews));
  assert.throws(
    () => verifyForwardReviewSet(cutover.root, op, cutover.fingerprint, cutover.reviews, '.agent/release-assurance'),
    /path invalid/,
  );

  const assurance = fixture({ assurance: false });
  assert.throws(
    () => verifyForwardReviewSet(assurance.root, op, assurance.fingerprint, assurance.reviews),
    /path invalid/,
  );
  assert.doesNotThrow(() =>
    verifyForwardReviewSet(assurance.root, op, assurance.fingerprint, assurance.reviews, '.agent/release-assurance'),
  );
  assert.throws(
    () => verifyForwardReviewSet(assurance.root, op, assurance.fingerprint, assurance.reviews, '.agent/other'),
    /receipt root invalid/,
  );
});

test('VidaStandaloneBuild input records preserve their package-relative source paths', async () => {
  const f = fixture();
  const sourceBytes = Buffer.from('export const input = true;\n');
  const sourceInput = addStandaloneManifest(f, {
    schema: 'VidaStandaloneBuild/v1',
    version: '0.1.2',
    pin: '1.4.2',
    target: 'bun-windows-x64',
    inputs: [{ path: 'tooling/native-input.mjs', bytes: sourceBytes.length, sha256: sha(sourceBytes) }],
    asset: { file: 'vida-agent-bun-windows-x64.exe', bytes: 1, sha256: 'a'.repeat(64) },
  });
  assert.equal((await inspectNativeDeliveryEvidenceRepair(input(f.root))).status, 'stale_qualification_repairable');
  assert.equal((await plan(f.root)).status, 'planned');
  const frozen = JSON.parse(readFileSync(path.join(f.root, base + '/native-delivery-evidence/plan.json'), 'utf8'));
  assert.equal(frozen.closure.files.filter((entry) => entry.path === sourceInput).length, 1);
  assert.equal(frozen.closure.files.find((entry) => entry.path === sourceInput).exists, true);
});

test('VidaStandaloneBuild inputs reject malformed records and unsafe paths before reserving repair state', async () => {
  const malformed = [
    { path: 'tooling/native-input.mjs', bytes: 24 },
    { path: 'tooling/native-input.mjs', bytes: 24, sha256: 'a'.repeat(64), extra: true },
    { path: 'tooling/native-input.mjs', bytes: -1, sha256: 'a'.repeat(64) },
    { path: 'tooling/native-input.mjs', bytes: 1.5, sha256: 'a'.repeat(64) },
    { path: 'tooling/native-input.mjs', bytes: Number.MAX_SAFE_INTEGER + 1, sha256: 'a'.repeat(64) },
    { path: 'tooling/native-input.mjs', bytes: 24, sha256: 'A'.repeat(64) },
    { path: '../outside.mjs', bytes: 24, sha256: 'a'.repeat(64) },
  ];
  for (const record of malformed) {
    const f = fixture();
    addStandaloneManifest(f, {
      schema: 'VidaStandaloneBuild/v1',
      version: '0.1.2',
      pin: '1.4.2',
      target: 'bun-windows-x64',
      inputs: [record],
      asset: { file: 'vida-agent-bun-windows-x64.exe', bytes: 1, sha256: 'a'.repeat(64) },
    });
    const inspected = await inspectNativeDeliveryEvidenceRepair(input(f.root));
    assert.equal(inspected.status, 'blocked');
    assert.match(inspected.blockers[0], /standalone input|repair fields differ|relative path/i);
    assert.equal(existsSync(path.join(f.root, base + '/native-delivery-evidence')), false);
    await assert.rejects(() => plan(f.root), /standalone input|repair fields differ|relative path/i);
    assert.equal(existsSync(path.join(f.root, base + '/native-delivery-evidence')), false);
  }
  const missingInputs = fixture();
  addStandaloneManifest(missingInputs, {
    schema: 'VidaStandaloneBuild/v1',
    version: '0.1.2',
    pin: '1.4.2',
    target: 'bun-windows-x64',
    asset: { file: 'vida-agent-bun-windows-x64.exe', bytes: 1, sha256: 'a'.repeat(64) },
  });
  const missingInputsResult = await inspectNativeDeliveryEvidenceRepair(input(missingInputs.root));
  assert.equal(missingInputsResult.status, 'blocked');
  assert.match(missingInputsResult.blockers[0], /standalone inputs invalid/i);
  assert.equal(existsSync(path.join(missingInputs.root, base + '/native-delivery-evidence')), false);
});

test('malformed, out-of-root and linked declared dependency references block without reserving repair state', async () => {
  for (const reference of ['bad\\path.json', '../outside.json']) {
    const f = fixture();
    addOperationInputReference(f, reference);
    const inspected = await inspectNativeDeliveryEvidenceRepair(input(f.root));
    assert.equal(inspected.status, 'blocked');
    assert.match(inspected.blockers[0], /dependency reference invalid|invalid relative path/i);
    assert.equal(existsSync(path.join(f.root, base + '/native-delivery-evidence')), false);
    await assert.rejects(() => plan(f.root), /dependency reference invalid|invalid relative path/i);
    assert.equal(existsSync(path.join(f.root, base + '/native-delivery-evidence')), false);
  }

  const nonStandalone = fixture();
  addOperationInputReference(nonStandalone, {
    path: 'AGENT.sidecar.md',
    bytes: 0,
    sha256: 'a'.repeat(64),
  });
  const nonStandaloneResult = await inspectNativeDeliveryEvidenceRepair(input(nonStandalone.root));
  assert.equal(nonStandaloneResult.status, 'blocked');
  assert.match(nonStandaloneResult.blockers[0], /dependency reference invalid/i);
  assert.equal(existsSync(path.join(nonStandalone.root, base + '/native-delivery-evidence')), false);

  const linked = fixture();
  const outside = mkdtempSync(path.join(tmpdir(), 'native-repair-linked-'));
  roots.push(outside);
  const linkPath = path.join(linked.root, '.agent', 'linked-dependencies');
  symlinkSync(outside, linkPath, process.platform === 'win32' ? 'junction' : 'dir');
  addOperationInputReference(linked, '.agent/linked-dependencies/proof.json');
  const inspected = await inspectNativeDeliveryEvidenceRepair(input(linked.root));
  assert.equal(inspected.status, 'blocked');
  assert.match(inspected.blockers[0], /linked|invalid/i);
  assert.equal(existsSync(path.join(linked.root, base + '/native-delivery-evidence')), false);
  await assert.rejects(() => plan(linked.root), /linked|invalid/i);
  assert.equal(existsSync(path.join(linked.root, base + '/native-delivery-evidence')), false);
});

test('valid missing relative dependency remains an observed absence', async () => {
  const f = fixture();
  const missing = 'missing/relative-proof.json';
  addOperationInputReference(f, missing);
  assert.equal((await inspectNativeDeliveryEvidenceRepair(input(f.root))).status, 'stale_qualification_repairable');
  assert.equal((await plan(f.root)).status, 'planned');
  const frozen = JSON.parse(readFileSync(path.join(f.root, base + '/native-delivery-evidence/plan.json'), 'utf8'));
  assert.deepEqual(
    frozen.closure.files.find((entry) => entry.path === missing),
    {
      path: missing,
      kind: 'file',
      exists: false,
      identity: null,
      sha256: null,
    },
  );
});

test('repair Source enumeration preserves default binding and observations while reusing one pass', () => {
  const f = fixture(),
    expected = releaseSourceBinding(f.root, true),
    pass = createRepairSourcePass();
  assert.deepEqual(releaseSourceBinding(f.root, true, pass), expected);
  assert.deepEqual(releaseSourceBinding(f.root, true, pass), expected);
});

test('a declared Source-tree overflow blocks inspection and planning before repair reservation', async () => {
  const f = fixture(),
    overflow = path.join(f.root, 'packages/agent/source-enumerator-overflow');
  mkdirSync(overflow, { recursive: true });
  for (let index = 0; index < 8192; index++) writeFileSync(path.join(overflow, String(index).padStart(5, '0')), '');

  const inspected = await inspectNativeDeliveryEvidenceRepair(input(f.root));
  assert.equal(inspected.status, 'blocked');
  assert.match(inspected.blockers[0], /Source enumeration.*bounded inventory/i);
  assert.equal(existsSync(path.join(f.root, base + '/native-delivery-evidence')), false);
  await assert.rejects(() => plan(f.root), /Source enumeration.*bounded inventory/i);
  assert.equal(existsSync(path.join(f.root, base + '/native-delivery-evidence')), false);
});

test('an external operation dependency is captured and drift denies apply', async () => {
  const f = fixture();
  const external = '.agent/work/native-repair-fixture/external-dependency.json';
  const original = json({ schema: 'SyntheticOperationDependency/v1', status: 'frozen' });
  write(f.root, external, original);
  addOperationInputReference(f, external);
  await plan(f.root);
  const frozen = JSON.parse(readFileSync(path.join(f.root, base + '/native-delivery-evidence/plan.json'), 'utf8'));
  const observed = frozen.closure.files.find((entry) => entry.path === external);
  assert.equal(observed.exists, true);
  assert.equal(observed.sha256, sha(original));
  assert.ok(
    frozen.closure.directories
      .find((entry) => entry.path === '.agent/work/native-repair-fixture')
      .members.includes('external-dependency.json'),
  );

  write(f.root, external, json({ schema: 'SyntheticOperationDependency/v1', status: 'changed' }));
  await assert.rejects(() => applyNativeDeliveryEvidenceRepair(input(f.root)), /protected dependency changed/);
  assert.equal(existsSync(path.join(f.root, base + '/tests.json')), true);
});

test('operation-tree inventory stops at the shared node limit before reserving repair state', async () => {
  const f = fixture();
  const oversized = path.join(f.root, base, 'oversized-tree');
  mkdirSync(oversized, { recursive: true });
  for (let index = 0; index < 8192; index++) writeFileSync(path.join(oversized, String(index).padStart(5, '0')), '');

  const inspected = await inspectNativeDeliveryEvidenceRepair(input(f.root));
  assert.equal(inspected.status, 'blocked');
  assert.match(inspected.blockers[0], /bounded inventory/);
  assert.equal(existsSync(path.join(f.root, base + '/native-delivery-evidence')), false);
  await assert.rejects(() => plan(f.root), /bounded inventory/);
  assert.equal(existsSync(path.join(f.root, base + '/native-delivery-evidence')), false);
});

test('operation JSON dependencies stop at the shared node limit for unique references', async () => {
  const f = fixture();
  save(f.root, base + '/queue-overflow.json', {
    schema: 'SyntheticOperationDependency/v1',
    inputs: Array.from(
      { length: 8192 },
      (_, index) => `.agent/work/native-repair-fixture/dependency-${String(index).padStart(5, '0')}.json`,
    ),
  });

  const inspected = await inspectNativeDeliveryEvidenceRepair(input(f.root));
  assert.equal(inspected.status, 'blocked');
  assert.match(inspected.blockers[0], /bounded inventory/);
  assert.equal(existsSync(path.join(f.root, base + '/native-delivery-evidence')), false);
  await assert.rejects(() => plan(f.root), /bounded inventory/);
  assert.equal(existsSync(path.join(f.root, base + '/native-delivery-evidence')), false);
});

test('repeated operation references and cyclic JSON dependencies do not exhaust the unique-node bound', async () => {
  const f = fixture(),
    first = base + '/cycle-first.json',
    second = base + '/cycle-second.json';
  save(f.root, first, { schema: 'SyntheticOperationDependency/v1', inputs: [first, first, second] });
  save(f.root, second, { schema: 'SyntheticOperationDependency/v1', inputs: [first, second, first] });

  assert.equal((await inspectNativeDeliveryEvidenceRepair(input(f.root))).status, 'stale_qualification_repairable');
  assert.equal((await plan(f.root)).status, 'planned');
  const frozen = JSON.parse(readFileSync(path.join(f.root, base + '/native-delivery-evidence/plan.json'), 'utf8'));
  for (const relative of [first, second])
    assert.equal(frozen.closure.files.filter((entry) => entry.path === relative).length, 1);
});

test('completed-reset current test input overflow blocks without changing namespace, custody or release state', async () => {
  const f = fixture();
  await plan(f.root);
  await applyNativeDeliveryEvidenceRepair(input(f.root));

  const overflow = path.join(f.root, '.tmp/current-test-inputs/overflow');
  mkdirSync(overflow, { recursive: true });
  for (let index = 0; index < 8192; index++) writeFileSync(path.join(overflow, String(index).padStart(5, '0')), '');
  const currentInputs = ['.tmp/current-test-inputs/overflow'];
  const tests = {
    schema: 'VidaLocalReleaseTests/v1',
    operation_id: op,
    version: '0.1.2',
    tests: f.laneLogs.map((entry) => ({ ...entry, inputs: currentInputs, input_binding: 'c'.repeat(64) })),
  };
  save(f.root, base + '/tests.json', tests);
  const operationDirectory = path.join(f.root, base),
    repairDirectory = path.join(operationDirectory, 'native-delivery-evidence'),
    operationBefore = treeSnapshot(operationDirectory),
    repairBefore = treeSnapshot(repairDirectory),
    pendingBefore = readFileSync(path.join(f.root, '.agent/work/agent-local-release/pending.json')),
    archiveBefore = readFileSync(path.join(f.root, '.tmp/releases/' + op + '/vida-agent-0.1.2.tgz'));

  const inspected = await inspectNativeDeliveryEvidenceRepair(input(f.root));
  assert.equal(inspected.status, 'blocked');
  assert.match(inspected.blockers[0], /Source enumeration.*bounded inventory/i);
  await assert.rejects(
    () => applyNativeDeliveryEvidenceRepair(input(f.root)),
    /Source enumeration.*bounded inventory/i,
  );
  assert.deepEqual(treeSnapshot(operationDirectory), operationBefore);
  assert.deepEqual(treeSnapshot(repairDirectory), repairBefore);
  assert.deepEqual(readFileSync(path.join(f.root, '.agent/work/agent-local-release/pending.json')), pendingBefore);
  assert.deepEqual(readFileSync(path.join(f.root, '.tmp/releases/' + op + '/vida-agent-0.1.2.tgz')), archiveBefore);
});

test('fixed repair removes only three stale qualification joins and preserves sealed custody and protected bytes', async () => {
  const f = fixture();
  assert.equal((await inspectNativeDeliveryEvidenceRepair(input(f.root))).status, 'stale_qualification_repairable');
  assert.equal((await plan(f.root)).status, 'planned');
  const result = await applyNativeDeliveryEvidenceRepair(input(f.root));
  assert.equal(result.status, 'awaiting_new_qualification');
  for (const name of ['tests.json', 'source-seal.json', 'assurance.json'])
    assert.equal(existsSync(path.join(f.root, base + '/' + name)), false);
  assert.deepEqual(readFileSync(path.join(f.root, base + '/release.json')), f.releaseBytes);
  assert.deepEqual(readFileSync(path.join(f.root, '.agent/work/agent-local-release/pending.json')), f.pendingBytes);
  assert.deepEqual(readFileSync(path.join(f.root, '.tmp/releases/' + op + '/vida-agent-0.1.2.tgz')), f.archiveBytes);
  for (const [file, bytes] of f.protectedBytes) assert.deepEqual(readFileSync(path.join(f.root, file)), bytes);
  for (const [directory, members] of f.protectedDirectories)
    assert.deepEqual(readdirSync(path.join(f.root, directory)).sort(), members);
  assert.equal((await applyNativeDeliveryEvidenceRepair(input(f.root))).status, 'awaiting_new_qualification');
  assert.equal((await inspectNativeDeliveryEvidenceRepair(input(f.root))).status, 'awaiting_new_qualification');
});

test('resume accepts only an exact absent postimage after interruption at each removal', async () => {
  for (const stoppedAt of ['tests_effect', 'source_seal_effect', 'assurance_effect']) {
    const f = fixture();
    await plan(f.root);
    await assert.rejects(
      () =>
        applyNativeDeliveryEvidenceRepair(input(f.root), {
          onPhase(phase) {
            if (phase === stoppedAt) throw new Error('lost acknowledgement');
          },
        }),
      /lost acknowledgement/,
    );
    assert.equal((await applyNativeDeliveryEvidenceRepair(input(f.root))).status, 'awaiting_new_qualification');
    for (const name of ['tests.json', 'source-seal.json', 'assurance.json'])
      assert.equal(existsSync(path.join(f.root, base + '/' + name)), false);
  }
});

for (const stoppedAt of [
  'tests_pending',
  'tests_removed',
  'source_seal_pending',
  'source_seal_removed',
  'assurance_pending',
  'assurance_removed',
]) {
  test(`fresh process resumes persisted ${stoppedAt} phase`, async () => {
    const f = fixture();
    await plan(f.root);
    await assert.rejects(
      () =>
        applyNativeDeliveryEvidenceRepair(input(f.root), {
          onPhase(phase) {
            if (phase === stoppedAt) throw new Error('simulated interrupted process');
          },
        }),
      /simulated interrupted process/,
    );
    const frozenState = JSON.parse(
      readFileSync(path.join(f.root, base + '/native-delivery-evidence/state.json'), 'utf8'),
    );
    assert.equal(frozenState.phase, stoppedAt);

    const result = resumeInFreshProcess(f.root);
    assert.equal(result.error, undefined);
    assert.equal(result.signal, null);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).status, 'awaiting_new_qualification');
    for (const name of ['tests.json', 'source-seal.json', 'assurance.json'])
      assert.equal(existsSync(path.join(f.root, base + '/' + name)), false);
  });
}

test('missing assurance stays absent and foreign current seals are reported as GAPs without reservation', async () => {
  const f = fixture({ assurance: false });
  assert.equal((await inspectNativeDeliveryEvidenceRepair(input(f.root))).status, 'stale_qualification_repairable');
  await plan(f.root);
  const result = await applyNativeDeliveryEvidenceRepair(input(f.root));
  assert.equal(result.status, 'awaiting_new_qualification');
  assert.equal(existsSync(path.join(f.root, base + '/assurance.json')), false);
  const reserved = fixture();
  const bytes = readFileSync(path.join(reserved.root, base + '/source-seal.json'));
  const seal = JSON.parse(bytes);
  seal.source_binding = sha(
    JSON.stringify((await import('../bin/local-release-artifacts.mjs')).releaseSourceBinding(reserved.root).entries),
  );
  seal.sealed_fingerprint = sha(JSON.stringify([seal.source_binding, seal.tarball_sha256]));
  save(reserved.root, base + '/source-seal.json', seal);
  assert.equal((await inspectNativeDeliveryEvidenceRepair(input(reserved.root))).status, 'blocked');
  assert.equal(
    existsSync(path.join(reserved.root, '.agent/work/agent-local-release', op, 'native-delivery-evidence')),
    false,
  );
});

for (const lockName of ['admission', 'operation']) {
  for (const contender of ['repair', 'test-evidence', 'source-seal', 'assurance']) {
    test(`${contender} rejects an occupied ${lockName} lock without changing owned bytes`, async () => {
      const f = fixture();
      await plan(f.root);
      const repairRoot = base + '/native-delivery-evidence';
      const paths = [
        '.agent/work/agent-local-release/pending.json',
        base + '/release.json',
        ...['tests.json', 'source-seal.json', 'assurance.json'].map((name) => base + '/' + name),
        repairRoot + '/plan.json',
        repairRoot + '/state.json',
        repairRoot + '/custody/seal.json',
        ...[0, 1, 2].map((index) => repairRoot + '/custody/before-' + index + '.bin'),
      ].filter((relative) => existsSync(path.join(f.root, relative)));
      const before = new Map(paths.map((relative) => [relative, readFileSync(path.join(f.root, relative))]));
      const phaseBefore = JSON.parse(readFileSync(path.join(f.root, repairRoot + '/state.json'), 'utf8')).phase;
      const held = lockName === 'admission' ? admissionMutex(f.root) : operationMutex(f.root, op);
      try {
        assert.ok(held);
        if (contender === 'repair')
          await assert.rejects(() => applyNativeDeliveryEvidenceRepair(input(f.root)), /busy|locked/i);
        if (contender === 'test-evidence')
          assert.throws(() => recordLocalTestEvidence({ ...input(f.root), tests: [] }), /busy|locked/i);
        if (contender === 'source-seal') assert.throws(() => writeLocalSourceSeal(input(f.root)), /busy|locked/i);
        if (contender === 'assurance')
          assert.throws(
            () =>
              recordLocalAssurance({
                ...input(f.root),
                scope_path: 'x',
                clear_work_id: 'x',
                repository_id: 'vida-agent',
                project_id: 'agent',
                reviews: [],
              }),
            /busy|locked/i,
          );
      } finally {
        held?.close();
      }
      for (const [relative, bytes] of before) assert.deepEqual(readFileSync(path.join(f.root, relative)), bytes);
      assert.equal(JSON.parse(readFileSync(path.join(f.root, repairRoot + '/state.json'), 'utf8')).phase, phaseBefore);
      assert.equal((await inspectNativeDeliveryEvidenceRepair(input(f.root))).status, 'custody');
    });
  }
}

test('proof writers deny active and incomplete UNKNOWN resets before writing', async () => {
  for (const incomplete of [false, true]) {
    const f = fixture();
    await plan(f.root);
    if (incomplete) rmSync(path.join(f.root, base + '/native-delivery-evidence/custody/seal.json'));
    const expectDenied = (action) => assert.throws(action, /active|UNKNOWN|custody|missing/i);
    expectDenied(() => recordLocalTestEvidence({ ...input(f.root), tests: [] }));
    expectDenied(() => writeLocalSourceSeal(input(f.root)));
    expectDenied(() =>
      recordLocalAssurance({
        ...input(f.root),
        scope_path: 'x',
        clear_work_id: 'x',
        repository_id: 'vida-agent',
        project_id: 'agent',
        reviews: [],
      }),
    );
    assert.equal(existsSync(path.join(f.root, base + '/tests.json')), true);
    assert.equal(existsSync(path.join(f.root, base + '/source-seal.json')), true);
    assert.equal(existsSync(path.join(f.root, base + '/assurance.json')), true);
  }
});

test('completed reset allows the actual current proof writers under the same locks', async () => {
  const f = fixture({ tests: false, assurance: false });
  await plan(f.root);
  await applyNativeDeliveryEvidenceRepair(input(f.root));
  assert.ok(readFileSync(path.join(f.root, 'AGENT.sidecar.md'), 'utf8'));
  recordLocalTestEvidence({
    ...input(f.root),
    tests: f.laneLogs.map(({ lane, path: logPath, inputs }) => ({ lane, path: logPath, inputs })),
  });
  const sealed = writeLocalSourceSeal(input(f.root));
  assert.equal(sealed.status, 'sealed_awaiting_assurance');
  const currentFingerprint = JSON.parse(
    readFileSync(path.join(f.root, base + '/source-seal.json'), 'utf8'),
  ).sealed_fingerprint;
  const reviews = f.reviews.map(({ kind, path: reviewPath, reverse_path }) => {
    const review = JSON.parse(readFileSync(path.join(f.root, reviewPath), 'utf8'));
    review.sealed_fingerprint = currentFingerprint;
    const reviewBytes = json(review);
    write(f.root, reviewPath, reviewBytes);
    const reverse = JSON.parse(readFileSync(path.join(f.root, reverse_path), 'utf8'));
    reverse.sealed_fingerprint = currentFingerprint;
    reverse.review_sha256 = sha(reviewBytes);
    write(f.root, reverse_path, json(reverse));
    return { kind, path: reviewPath, reverse_path };
  });
  assert.equal(
    recordLocalAssurance({
      ...input(f.root),
      scope_path: '.agent/work/native-repair-fixture/scope.json',
      clear_work_id: 'native-repair-fixture',
      repository_id: 'vida-agent',
      project_id: 'agent',
      reviews,
    }).status,
    'joined',
  );
  assert.equal((await inspectNativeDeliveryEvidenceRepair(input(f.root))).status, 'awaiting_new_qualification');
});

test('source or dependency drift, installing state, malformed seals and partial custody remain blocked', async () => {
  const drift = fixture();
  await plan(drift.root);
  write(drift.root, 'AGENT.sidecar.md', '# changed after frozen plan\n');
  await assert.rejects(() => applyNativeDeliveryEvidenceRepair(input(drift.root)), /changed/);
  assert.equal(existsSync(path.join(drift.root, base + '/tests.json')), true);

  const linkedSource = fixture(),
    outside = mkdtempSync(path.join(tmpdir(), 'native-repair-source-link-'));
  roots.push(outside);
  symlinkSync(
    outside,
    path.join(linkedSource.root, 'packages/agent/linked-source'),
    process.platform === 'win32' ? 'junction' : 'dir',
  );
  const linkedResult = await inspectNativeDeliveryEvidenceRepair(input(linkedSource.root));
  assert.equal(linkedResult.status, 'blocked');
  assert.match(linkedResult.blockers[0], /linked source/i);
  assert.equal(existsSync(path.join(linkedSource.root, base + '/native-delivery-evidence')), false);

  const installing = fixture();
  const release = JSON.parse(readFileSync(path.join(installing.root, base + '/release.json'), 'utf8'));
  release.install_started = '2026-10-06T01:00:00Z';
  save(installing.root, base + '/release.json', release);
  save(installing.root, '.agent/work/agent-local-release/pending.json', release);
  assert.equal((await inspectNativeDeliveryEvidenceRepair(input(installing.root))).status, 'blocked');

  const partial = fixture();
  await plan(partial.root);
  rmSync(path.join(partial.root, base + '/native-delivery-evidence/custody/seal.json'));
  await assert.rejects(() => applyNativeDeliveryEvidenceRepair(input(partial.root)), /custody|missing|path/);
  assert.equal(existsSync(path.join(partial.root, base + '/tests.json')), true);

  const unsafe = fixture();
  await plan(unsafe.root);
  rmSync(path.join(unsafe.root, base + '/assurance.json'));
  mkdirSync(path.join(unsafe.root, base + '/assurance.json'));
  await assert.rejects(() => applyNativeDeliveryEvidenceRepair(input(unsafe.root)), /unsafe|regular|directory/);
  assert.equal(existsSync(path.join(unsafe.root, base + '/assurance.json')), true);
});

test('evidence added after custody is never deleted or absorbed by a frozen repair', async () => {
  const f = fixture();
  await plan(f.root);
  const lateEvidence = base + '/late-result.json';
  write(f.root, lateEvidence, json({ schema: 'SyntheticLateResult/v1', status: 'observed' }));
  await assert.rejects(() => applyNativeDeliveryEvidenceRepair(input(f.root)), /dependency.*changed|membership/i);
  assert.equal(existsSync(path.join(f.root, lateEvidence)), true);
  for (const name of ['tests.json', 'source-seal.json', 'assurance.json'])
    assert.equal(existsSync(path.join(f.root, base + '/' + name)), true);
});

test('strict fixed-kind routing rejects extra fields and unknown kinds before acquiring locks', async () => {
  const f = fixture();
  const route = [
    '--kind',
    'native-delivery-evidence',
    '--mode',
    'inspect',
    '--project-root',
    f.root,
    '--operation',
    op,
  ];
  await assert.rejects(() => runReconcileArtifacts([...route, '--unexpected', 'value']), /arguments invalid/);
  const held = operationMutex(f.root, op);
  assert.ok(held);
  held.close();
  await assert.rejects(() =>
    runReconcileArtifacts([
      '--kind',
      'native-delivery-evidence-unknown',
      '--mode',
      'inspect',
      '--project-root',
      f.root,
      '--operation',
      op,
    ]),
  );
  const after = operationMutex(f.root, op);
  assert.ok(after);
  after.close();
});

test('a source seal that is still current is not eligible for stale reset', async () => {
  const f = fixture();
  const current = releaseSourceBinding(f.root);
  const release = JSON.parse(readFileSync(path.join(f.root, base + '/release.json'), 'utf8'));
  release.source_binding = current.source_binding;
  save(f.root, base + '/release.json', release);
  save(f.root, '.agent/work/agent-local-release/pending.json', release);
  const originalSeal = JSON.parse(readFileSync(path.join(f.root, base + '/source-seal.json'), 'utf8'));
  save(f.root, base + '/source-seal.json', {
    ...originalSeal,
    source_binding: current.source_binding,
    entries: current.entries,
    sealed_fingerprint: sha(JSON.stringify([current.source_binding, originalSeal.tarball_sha256])),
  });
  assert.equal((await inspectNativeDeliveryEvidenceRepair(input(f.root))).status, 'blocked');
  assert.equal(existsSync(path.join(f.root, '.agent/work/agent-local-release', op, 'native-delivery-evidence')), false);
});
