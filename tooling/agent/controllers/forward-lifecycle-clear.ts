import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadForwardPayloadRuntime } from './forward-payload-runtime.ts';
import { appendRuntimeDocumentationChange } from './append-runtime-documentation-change.ts';
import type { DocumentationClearCheckpoint } from '../../../packages/agent/src/documentation/clear.js';
import {
  errorMessage,
  isRecord,
  sha256 as sha,
} from '../../../packages/agent/src/contracts/forward-controller-values.ts';
const instruction = 'vida-agent/instructions/development-lifecycle.md';
const policy = 'docs/agent-instructions/documentation-policy.v1.json';

interface ForwardLifecycleInput {
  root: string;
  phase: string;
  operationId: string;
  oldHash: string;
  newHash: string;
  policyHash: string;
  parentManifest: string;
  successorManifest: string;
  payloadRoot: string;
  documentationWorkId: string | null;
}
type JsonRecord = Record<string, unknown>;
type ForwardLifecycleBaselineResult = {
  readonly status: 'baseline_ready';
  readonly receipt_path: string;
  readonly baseline_path: string;
  readonly baseline_digest: string;
};
type ForwardLifecycleCloseoutResult = {
  readonly status: 'closeout_verified';
  readonly receipt_path: string;
  readonly baseline_path: string;
  readonly closeout_path: string;
  readonly closeout_sha256: unknown;
  readonly current_closeout_path: string;
  readonly current_closeout_sha256: unknown;
  readonly current_inventory_digest: string;
  readonly repair_plan_digest: null;
  readonly event_id: string;
  readonly event_timestamp: unknown;
  readonly event_suffix_sha256: string;
};
type ForwardLifecycleResult = ForwardLifecycleBaselineResult | ForwardLifecycleCloseoutResult;
type DocumentationChangeResult = {
  readonly status: 'already_applied' | 'applied';
  readonly event_id: string;
  readonly event_timestamp: unknown;
  readonly event_suffix_sha256: string;
};
type ForwardScope = {
  readonly work_id: string;
  readonly source_revision: string;
  readonly allowed_paths: readonly string[];
  readonly owner: string;
  readonly attribution: { readonly pointer: string };
};

function isCheckpoint(value: unknown): value is DocumentationClearCheckpoint {
  return (
    isRecord(value) &&
    value.schema === 'DocumentationClearCheckpoint/v1' &&
    typeof value.clear_id === 'string' &&
    typeof value.work_id === 'string' &&
    typeof value.source_revision === 'string' &&
    typeof value.repository_id === 'string' &&
    typeof value.project_id === 'string' &&
    typeof value.project_context_digest === 'string' &&
    typeof value.config_digest === 'string' &&
    typeof value.scope_digest === 'string' &&
    typeof value.policy_id === 'string' &&
    typeof value.policy_path === 'string' &&
    typeof value.policy_digest === 'string' &&
    typeof value.inventory_digest === 'string' &&
    Array.isArray(value.documents) &&
    value.documents.every(
      (entry: unknown) =>
        isRecord(entry) &&
        typeof entry.path === 'string' &&
        typeof entry.sha256 === 'string' &&
        typeof entry.size === 'number',
    ) &&
    (value.baseline_path === null || typeof value.baseline_path === 'string') &&
    (value.baseline_digest === null || typeof value.baseline_digest === 'string') &&
    (value.phase === 'baseline' || value.phase === 'closeout') &&
    (value.status === 'pass' || value.status === 'blocked' || value.status === 'not_required') &&
    typeof value.required === 'boolean' &&
    Array.isArray(value.gaps) &&
    value.gaps.every((entry: unknown) => typeof entry === 'string') &&
    typeof value.created_at === 'string' &&
    typeof value.digest === 'string'
  );
}

function isForwardScope(value: unknown): value is ForwardScope {
  return (
    isRecord(value) &&
    typeof value.work_id === 'string' &&
    typeof value.source_revision === 'string' &&
    Array.isArray(value.allowed_paths) &&
    value.allowed_paths.every((entry: unknown) => typeof entry === 'string') &&
    typeof value.owner === 'string' &&
    isRecord(value.attribution) &&
    typeof value.attribution.pointer === 'string'
  );
}

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
}: ForwardLifecycleInput): Promise<ForwardLifecycleResult> {
  if (
    documentationWorkId === null ||
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
  const {
    canonicalJsonDigest,
    compileImplementationScopeValidator,
    requireSafeRepositoryAccess,
    snapshotDeclaredSources,
  } = await loadForwardPayloadRuntime(root, payloadRoot, successorManifest);
  const access = requireSafeRepositoryAccess(root),
    workPath = `.agent/work/${documentationWorkId}`;
  const scopeBytes = access.readBytes(`${workPath}/scope.json`, 'new documentation work scope');
  const scopeValue: unknown = JSON.parse(scopeBytes.toString('utf8'));
  const scope = isForwardScope(scopeValue) ? scopeValue : null;
  const scopeSchema: unknown = JSON.parse(
    access.readText('vida-agent/schemas/implementation-scope.v1.schema.json', 'documentation scope schema'),
  );
  if (!isRecord(scopeSchema)) throw Error('documentation scope schema invalid');
  const validate = compileImplementationScopeValidator(scopeSchema);
  if (!scope || !validate(scope) || scope.work_id !== documentationWorkId || !scope.allowed_paths.includes(instruction))
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
  const publicClear = (mode: string): { status: string; path: string; sha256: unknown } => {
    if (typeof Bun === 'undefined') throw Error('public CLEAR requires pinned Bun');
    const result = spawnSync(
      process.execPath,
      [
        path.join(root, 'vida-agent/bin/documentation-clear.ts'),
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
    const outputValue: unknown = JSON.parse(result.stdout.trim());
    if (
      !isRecord(outputValue) ||
      typeof outputValue.status !== 'string' ||
      !['pass', 'not_required', 'verified'].includes(outputValue.status) ||
      typeof outputValue.path !== 'string'
    )
      throw Error('public CLEAR result invalid');
    return { status: outputValue.status, path: outputValue.path, sha256: outputValue.sha256 };
  };
  const readCheckpoint = (file: string): DocumentationClearCheckpoint => {
    const valueJson: unknown = JSON.parse(access.readText(file, 'forward documentation checkpoint'));
    if (!isCheckpoint(valueJson)) throw Error('forward documentation checkpoint differs');
    const value = valueJson;
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
  let receipt: JsonRecord | null = null;
  if (existsSync(path.join(root, receiptPath))) {
    const receiptValue: unknown = JSON.parse(access.readText(receiptPath, 'forward documentation receipt'));
    receipt = isRecord(receiptValue) ? receiptValue : null;
    if (!receipt) throw Error('forward documentation binding changed');
  }
  if (!receipt) {
    if (phase !== 'baseline' || sha(access.readBytes(instruction, 'pre-install instruction')) !== oldHash)
      throw Error('genuine pre-install baseline required');
    if (snapshotDeclaredSources(access, scope.allowed_paths).digest !== sourceRevision)
      throw Error('accepted documentation source revision stale');
    const created = publicClear('baseline');
    const baseline = readCheckpoint(created.path);
    if (baseline.documents.find((entry) => entry.path === instruction)?.sha256 !== oldHash)
      throw Error('baseline lacks old instruction');
    const boundPolicyValue: unknown = JSON.parse(
      access.readText(baseline.policy_path, 'baseline documentation policy'),
    );
    if (!isRecord(boundPolicyValue) || typeof boundPolicyValue.changelog_path !== 'string')
      throw Error('forward documentation baseline policy invalid');
    receipt = {
      ...expected,
      baseline_path: created.path,
      baseline_digest: baseline.digest,
      changelog_pre_sha256: sha(access.readBytes(boundPolicyValue.changelog_path, 'baseline changelog')),
    };
    const creator = await access.prepareExclusiveCreation();
    await creator.writeExclusive(receiptPath, JSON.stringify(receipt, null, 2) + '\n', 'forward documentation receipt');
  }
  if (!receipt || Object.entries(expected).some(([key, value]) => receipt?.[key] !== value))
    throw Error('forward documentation binding changed');
  if (
    typeof receipt.baseline_path !== 'string' ||
    typeof receipt.baseline_digest !== 'string' ||
    typeof receipt.changelog_pre_sha256 !== 'string'
  )
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
  const event: DocumentationChangeResult = await appendRuntimeDocumentationChange({
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
    root: root ?? '',
    phase: phase ?? '',
    operationId: operationId ?? '',
    oldHash: oldHash ?? '',
    newHash: newHash ?? '',
    policyHash: policyHash ?? '',
    parentManifest: parentManifest ?? '',
    successorManifest: successorManifest ?? '',
    payloadRoot: payloadRoot ?? '',
    documentationWorkId: documentationWorkId ?? '',
  })
    .then((result) => process.stdout.write(JSON.stringify(result) + '\n'))
    .catch((error: unknown) => {
      process.stderr.write(JSON.stringify({ status: 'blocked', message: errorMessage(error) }) + '\n');
      process.exitCode = 1;
    });
}
