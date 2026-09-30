import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadForwardPayloadRuntime } from './forward-payload-runtime.mjs';
import { appendRuntimeDocumentationChange } from './append-runtime-documentation-change.mjs';
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const instruction = 'vida-agent/instructions/development-lifecycle.md';
const policy = 'docs/agent-instructions/documentation-policy.v1.json';

/** One genuine new-scope public CLEAR cycle. Historical/current aliases only verify that cycle. */
export async function ensureForwardLifecycleClear({
  root,
  phase,
  operationId,
  oldHash,
  newHash,
  policyHash,
  parentManifest,
  successorManifest,
  payloadRoot,
  documentationWorkId,
}) {
  if (
    !path.isAbsolute(root) ||
    path.resolve(root) !== root ||
    !/^[a-z0-9][a-z0-9._-]{0,127}$/u.test(documentationWorkId ?? '') ||
    documentationWorkId === 'vida-runtime-forward-fix-20260928' ||
    !/^[a-z0-9][a-z0-9._-]{0,127}$/u.test(operationId ?? '') ||
    ![oldHash, newHash, policyHash, parentManifest, successorManifest].every((value) =>
      /^[a-f0-9]{64}$/u.test(value ?? ''),
    ) ||
    oldHash === newHash
  )
    throw Error('new-work lifecycle CLEAR binding invalid');
  if (!['baseline', 'closeout', 'historical', 'current', 'current_verify', 'verify'].includes(phase))
    throw Error('lifecycle CLEAR phase invalid');
  const { canonicalJsonDigest, requireSafeRepositoryAccess, snapshotDeclaredSources } = await loadForwardPayloadRuntime(
    root,
    payloadRoot,
    successorManifest,
  );
  const access = requireSafeRepositoryAccess(root),
    workPath = `.agent/work/${documentationWorkId}`;
  const scopeBytes = access.readBytes(`${workPath}/scope.json`, 'new documentation work scope');
  const scope = JSON.parse(scopeBytes);
  const require = createRequire(path.join(root, 'vida-agent/package.json'));
  const Ajv = require('ajv/dist/2020').default;
  const validate = new Ajv({ strict: true, allErrors: true }).compile(
    JSON.parse(access.readText('vida-agent/schemas/implementation-scope.v1.schema.json', 'documentation scope schema')),
  );
  if (!validate(scope) || scope.work_id !== documentationWorkId || !scope.allowed_paths.includes(instruction))
    throw Error('new documentation scope contract invalid');
  const sourceRevision = scope.source_revision;
  if (!/^[a-f0-9]{64}$/u.test(sourceRevision))
    throw Error('documentation source revision must be runtime-produced snapshot');
  if (
    sha(access.readBytes(policy, 'documentation active policy')) !== policyHash ||
    sha(readFileSync(path.join(payloadRoot, instruction))) !== newHash
  )
    throw Error('documentation policy or staged instruction changed');
  const receiptPath = `.agent/cutover/${operationId}/documentation-forward.v1.json`;
  const expected = {
    schema: 'VidaForwardLifecycleClearBinding/v1',
    operation_id: operationId,
    old_sha256: oldHash,
    new_sha256: newHash,
    policy_sha256: policyHash,
    parent_manifest_sha256: parentManifest,
    successor_manifest_sha256: successorManifest,
  };
  const publicClear = (mode) => {
    if (typeof Bun === 'undefined') throw Error('public CLEAR requires pinned Bun');
    const result = spawnSync(
      process.execPath,
      [
        path.join(root, 'vida-agent/bin/documentation-clear.mjs'),
        '--mode',
        mode,
        '--project-root',
        root,
        '--repository',
        'creatio-sample-repository',
        '--project',
        'refactoring',
        '--work-id',
        documentationWorkId,
        '--source-revision',
        sourceRevision,
      ],
      { cwd: path.join(root, 'vida-agent'), encoding: 'utf8', windowsHide: true, timeout: 120000 },
    );
    if (result.error || result.status !== 0)
      throw Error(`public documentation CLEAR ${mode} blocked: ${result.stderr || result.error?.message}`);
    const output = JSON.parse(result.stdout.trim());
    if (!['pass', 'not_required', 'verified'].includes(output.status)) throw Error('public CLEAR result invalid');
    return output;
  };
  const readCheckpoint = (file) => {
    const value = JSON.parse(access.readText(file, 'forward documentation checkpoint'));
    const { digest, ...body } = value;
    if (
      digest !== canonicalJsonDigest(body) ||
      value.work_id !== documentationWorkId ||
      value.source_revision !== sourceRevision ||
      value.status !== 'pass'
    )
      throw Error('forward documentation checkpoint differs');
    return value;
  };
  let receipt = existsSync(path.join(root, receiptPath))
    ? JSON.parse(access.readText(receiptPath, 'forward documentation receipt'))
    : null;
  if (!receipt) {
    if (phase !== 'baseline' || sha(access.readBytes(instruction, 'pre-install instruction')) !== oldHash)
      throw Error('genuine pre-install baseline required');
    if (snapshotDeclaredSources(access, scope.allowed_paths).digest !== sourceRevision)
      throw Error('accepted documentation source revision stale');
    const created = publicClear('baseline');
    const baseline = readCheckpoint(created.path);
    if (baseline.documents.find((entry) => entry.path === instruction)?.sha256 !== oldHash)
      throw Error('baseline lacks old instruction');
    const boundPolicy = JSON.parse(access.readText(baseline.policy_path, 'baseline documentation policy'));
    receipt = {
      ...expected,
      baseline_path: created.path,
      baseline_digest: baseline.digest,
      changelog_pre_sha256: sha(access.readBytes(boundPolicy.changelog_path, 'baseline changelog')),
    };
    const creator = await access.prepareExclusiveCreation();
    await creator.writeExclusive(receiptPath, JSON.stringify(receipt, null, 2) + '\n', 'forward documentation receipt');
  }
  if (Object.entries(expected).some(([key, value]) => receipt[key] !== value))
    throw Error('forward documentation binding changed');
  const baseline = readCheckpoint(receipt.baseline_path);
  if (baseline.digest !== receipt.baseline_digest) throw Error('forward documentation baseline changed');
  if (phase === 'baseline')
    return {
      status: 'baseline_ready',
      receipt_path: receiptPath,
      baseline_path: receipt.baseline_path,
      baseline_digest: baseline.digest,
    };
  if (sha(access.readBytes(instruction, 'installed instruction')) !== newHash)
    throw Error('forward instruction not installed');
  const event = await appendRuntimeDocumentationChange({
    root,
    workId: documentationWorkId,
    sourceRevision,
    baseline,
    scope,
    documentPath: instruction,
    payloadRoot,
    successorManifest,
    expectedChangelogSha256: receipt.changelog_pre_sha256,
    allowCreate: phase === 'closeout',
  });
  const closeoutPath = receipt.baseline_path.replace('documentation-baseline-', 'documentation-closeout-');
  if (!existsSync(path.join(root, closeoutPath))) {
    if (phase !== 'closeout') throw Error('public documentation closeout missing');
    const closed = publicClear('closeout');
    if (closed.path !== closeoutPath) throw Error('public CLEAR cycle differs');
  }
  const verified = publicClear('verify');
  if (verified.path !== closeoutPath) throw Error('public CLEAR verify cycle differs');
  const closeout = readCheckpoint(verified.path);
  return {
    ...event,
    status: 'closeout_verified',
    receipt_path: receiptPath,
    baseline_path: receipt.baseline_path,
    closeout_path: verified.path,
    closeout_sha256: verified.sha256,
    current_closeout_path: verified.path,
    current_closeout_sha256: verified.sha256,
    current_inventory_digest: closeout.inventory_digest,
    repair_plan_digest: null,
  };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [
    root,
    phase,
    operationId,
    oldHash,
    newHash,
    policyHash,
    parentManifest,
    successorManifest,
    payloadRoot,
    documentationWorkId,
  ] = process.argv.slice(2);
  ensureForwardLifecycleClear({
    root,
    phase,
    operationId,
    oldHash,
    newHash,
    policyHash,
    parentManifest,
    successorManifest,
    payloadRoot,
    documentationWorkId,
  })
    .then((result) => process.stdout.write(JSON.stringify(result) + '\n'))
    .catch((error) => {
      process.stderr.write(JSON.stringify({ status: 'blocked', message: error.message }) + '\n');
      process.exitCode = 1;
    });
}
