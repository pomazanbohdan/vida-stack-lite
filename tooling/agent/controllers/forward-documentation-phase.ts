import { spawnSync } from 'node:child_process';
import { closeSync, constants, existsSync, fsyncSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  errorMessage,
  isRecord,
  prettyJSON as json,
  sha256 as sha,
} from '../../../packages/agent/src/contracts/forward-controller-values.ts';

type JsonRecord = Record<string, unknown>;
type ForwardChange = {
  readonly path: string;
  readonly old_sha256: string;
  readonly new_sha256: string;
  readonly new_size: number;
};
type ForwardIntent = {
  readonly operation_id: string;
  readonly old_payload_manifest_sha256: string;
  readonly new_payload_manifest_sha256: string;
  readonly changed: readonly ForwardChange[];
};
type ForwardScope = {
  readonly work_id: string;
  readonly allowed_paths: readonly string[];
  readonly source_revision: string;
  readonly owner: string;
  readonly attribution: { readonly pointer: string };
};
type ForwardReceipt = {
  readonly schema: 'VidaForwardLifecycleClearBinding/v1';
  readonly operation_id: string;
  readonly old_sha256: string;
  readonly new_sha256: string;
  readonly policy_sha256: string;
  readonly parent_manifest_sha256: string;
  readonly successor_manifest_sha256: string;
  readonly baseline_path: string;
  readonly baseline_digest: string;
  readonly changelog_pre_sha256: string;
};
type ForwardReceiptBinding = Pick<
  ForwardReceipt,
  | 'schema'
  | 'operation_id'
  | 'old_sha256'
  | 'new_sha256'
  | 'policy_sha256'
  | 'parent_manifest_sha256'
  | 'successor_manifest_sha256'
>;
type ClearResult = JsonRecord & { readonly path: string; readonly sha256: string; readonly status: string };
type BaselineRecord = JsonRecord & {
  readonly work_id: string;
  readonly source_revision: string;
  readonly status: string;
  readonly digest: string;
  readonly policy_digest: string;
  readonly documents: readonly { readonly path: string; readonly sha256: string }[];
};
type TransitionOperation = JsonRecord & {
  readonly phase: string;
  readonly maintenance_released: boolean;
  readonly plan: { readonly work_id: string; readonly baseline_digest: string; readonly source_revision: string };
  readonly closeout: { readonly path: string; readonly sha256: string };
};

const policy = 'docs/agent-instructions/documentation-policy.v1.json';
const instruction = 'vida-agent/instructions/development-lifecycle.md';
const map = 'vida-agent/TESTING.md';

function required(condition: unknown, message: string): asserts condition {
  if (!condition) throw Error(`forward documentation: ${message}`);
}

function isForwardChange(value: unknown): value is ForwardChange {
  return (
    isRecord(value) &&
    typeof value.path === 'string' &&
    typeof value.old_sha256 === 'string' &&
    typeof value.new_sha256 === 'string' &&
    typeof value.new_size === 'number'
  );
}

function isForwardIntent(value: unknown): value is ForwardIntent {
  return (
    isRecord(value) &&
    typeof value.operation_id === 'string' &&
    typeof value.old_payload_manifest_sha256 === 'string' &&
    typeof value.new_payload_manifest_sha256 === 'string' &&
    Array.isArray(value.changed) &&
    value.changed.every(isForwardChange)
  );
}

function isForwardScope(value: unknown): value is ForwardScope {
  return (
    isRecord(value) &&
    typeof value.work_id === 'string' &&
    Array.isArray(value.allowed_paths) &&
    value.allowed_paths.every((entry: unknown) => typeof entry === 'string') &&
    typeof value.source_revision === 'string' &&
    typeof value.owner === 'string' &&
    isRecord(value.attribution) &&
    typeof value.attribution.pointer === 'string'
  );
}

function isForwardReceipt(value: unknown): value is ForwardReceipt {
  return (
    isRecord(value) &&
    value.schema === 'VidaForwardLifecycleClearBinding/v1' &&
    typeof value.operation_id === 'string' &&
    typeof value.old_sha256 === 'string' &&
    typeof value.new_sha256 === 'string' &&
    typeof value.policy_sha256 === 'string' &&
    typeof value.parent_manifest_sha256 === 'string' &&
    typeof value.successor_manifest_sha256 === 'string' &&
    typeof value.baseline_path === 'string' &&
    typeof value.baseline_digest === 'string' &&
    typeof value.changelog_pre_sha256 === 'string'
  );
}

function isClearResult(value: unknown): value is ClearResult {
  return (
    isRecord(value) &&
    typeof value.path === 'string' &&
    typeof value.sha256 === 'string' &&
    typeof value.status === 'string'
  );
}

function isBaselineRecord(value: unknown): value is BaselineRecord {
  return (
    isRecord(value) &&
    typeof value.work_id === 'string' &&
    typeof value.source_revision === 'string' &&
    typeof value.status === 'string' &&
    typeof value.digest === 'string' &&
    typeof value.policy_digest === 'string' &&
    Array.isArray(value.documents) &&
    value.documents.every(
      (entry: unknown) => isRecord(entry) && typeof entry.path === 'string' && typeof entry.sha256 === 'string',
    )
  );
}

function isTransitionOperation(value: unknown): value is TransitionOperation {
  return (
    isRecord(value) &&
    typeof value.phase === 'string' &&
    typeof value.maintenance_released === 'boolean' &&
    isRecord(value.plan) &&
    typeof value.plan.work_id === 'string' &&
    typeof value.plan.baseline_digest === 'string' &&
    typeof value.plan.source_revision === 'string' &&
    isRecord(value.closeout) &&
    typeof value.closeout.path === 'string' &&
    typeof value.closeout.sha256 === 'string'
  );
}

function receiptMatchesBinding(receipt: ForwardReceipt, binding: ForwardReceiptBinding): boolean {
  return (
    receipt.schema === binding.schema &&
    receipt.operation_id === binding.operation_id &&
    receipt.old_sha256 === binding.old_sha256 &&
    receipt.new_sha256 === binding.new_sha256 &&
    receipt.policy_sha256 === binding.policy_sha256 &&
    receipt.parent_manifest_sha256 === binding.parent_manifest_sha256 &&
    receipt.successor_manifest_sha256 === binding.successor_manifest_sha256
  );
}

/** The old selected public CLI records baseline; exact admitted successor admin acquires the fence before publication. */
export async function ensureForwardDocumentationPhase(
  root: string,
  phase: string,
  payloadRoot: string,
  successorManifest: string,
  operationId: string,
  documentationWorkId: string,
): Promise<Record<string, unknown>> {
  required(
    path.isAbsolute(root) &&
      path.resolve(root) === root &&
      path.isAbsolute(payloadRoot) &&
      path.resolve(payloadRoot) === payloadRoot &&
      /^[a-z0-9][a-z0-9._-]{0,79}$/.test(operationId) &&
      /^[a-z0-9][a-z0-9._-]{0,127}$/.test(documentationWorkId) &&
      documentationWorkId !== 'vida-runtime-forward-fix-20260928',
    'new work/root binding invalid',
  );
  const read = (relative: string): Buffer => readFileSync(path.join(root, relative));
  const intentValue: unknown = JSON.parse(
    read('.agent/cutover/' + operationId + '/forward-intent.v1.json').toString('utf8'),
  );
  required(isForwardIntent(intentValue), 'forward intent differs');
  const intent = intentValue;
  required(
    intent.operation_id === operationId && intent.new_payload_manifest_sha256 === successorManifest,
    'forward intent differs',
  );
  const lifecycle = intent.changed.find((entry) => entry.path === instruction);
  const policyChange = intent.changed.find((entry) => entry.path === policy);
  required(lifecycle && policyChange, 'policy transition requires declared instruction and policy changes');
  const scopeValue: unknown = JSON.parse(read(`.agent/work/${documentationWorkId}/scope.json`).toString('utf8'));
  required(isForwardScope(scopeValue), 'actual authorized three-path scope missing');
  const scope = scopeValue;
  required(
    scope.work_id === documentationWorkId &&
      [policy, instruction, map].every((file) => scope.allowed_paths.includes(file)) &&
      /^[a-f0-9]{64}$/.test(scope.source_revision),
    'actual authorized three-path scope missing',
  );
  required(typeof Bun !== 'undefined', 'pinned Bun required');
  const launch = (entry: string, args: readonly string[]): unknown => {
    const result = spawnSync(process.execPath, [entry, ...args], {
      cwd: path.join(root, 'vida-agent'),
      windowsHide: true,
      encoding: 'utf8',
      timeout: 120000,
    });
    required(
      !result.error && result.status === 0,
      `public operation blocked: ${result.stderr || result.error?.message}`,
    );
    return JSON.parse(result.stdout.trim()) as unknown;
  };
  const clear = (mode: string): ClearResult => {
    const result = launch(path.join(root, 'vida-agent/bin/documentation-clear.ts'), [
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
      scope.source_revision,
    ]);
    required(isClearResult(result), 'public CLEAR result invalid');
    return result;
  };
  const receiptPath = `.agent/cutover/${operationId}/documentation-forward.v1.json`;
  const expected: ForwardReceiptBinding = {
    schema: 'VidaForwardLifecycleClearBinding/v1',
    operation_id: operationId,
    old_sha256: lifecycle.old_sha256,
    new_sha256: lifecycle.new_sha256,
    policy_sha256: policyChange.new_sha256,
    parent_manifest_sha256: intent.old_payload_manifest_sha256,
    successor_manifest_sha256: successorManifest,
  };
  const receiptFile = path.join(root, receiptPath);
  let receipt: ForwardReceipt | null = null;
  if (existsSync(receiptFile)) {
    const receiptValue: unknown = JSON.parse(read(receiptPath).toString('utf8'));
    required(isForwardReceipt(receiptValue), 'receipt binding differs');
    receipt = receiptValue;
  }
  if (!receipt) {
    required(
      phase === 'baseline' &&
        sha(read(policy)) === policyChange.old_sha256 &&
        sha(read(instruction)) === lifecycle.old_sha256,
      'genuine pre-edit baseline required',
    );
    const baselineResult = clear('baseline');
    const recordValue: unknown = JSON.parse(read(baselineResult.path).toString('utf8'));
    required(isBaselineRecord(recordValue), 'public baseline differs from old source');
    const record = recordValue;
    required(
      record.work_id === documentationWorkId &&
        record.source_revision === scope.source_revision &&
        record.status === 'pass' &&
        record.documents.find((entry) => entry.path === instruction)?.sha256 === lifecycle.old_sha256 &&
        record.policy_digest === policyChange.old_sha256,
      'public baseline differs from old source',
    );
    const oldPolicyValue: unknown = JSON.parse(read(policy).toString('utf8'));
    required(isRecord(oldPolicyValue) && typeof oldPolicyValue.changelog_path === 'string', 'baseline policy invalid');
    const nextReceipt: ForwardReceipt = {
      ...expected,
      baseline_path: baselineResult.path,
      baseline_digest: record.digest,
      changelog_pre_sha256: sha(read(oldPolicyValue.changelog_path)),
    };
    const fd = openSync(receiptFile, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY, 0o600);
    try {
      writeFileSync(fd, json(nextReceipt));
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    receipt = nextReceipt;
  }
  required(receiptMatchesBinding(receipt, expected), 'receipt binding differs');
  const baselineValue: unknown = JSON.parse(read(receipt.baseline_path).toString('utf8'));
  required(isBaselineRecord(baselineValue), 'baseline work/source binding differs');
  const baseline = baselineValue;
  required(
    baseline.work_id === documentationWorkId &&
      baseline.source_revision === scope.source_revision &&
      baseline.digest === receipt.baseline_digest,
    'baseline work/source binding differs',
  );
  const repairId = operationId;
  const operationPath = `.agent/work/${documentationWorkId}/documentation-policy-transition.v1.json`;
  const common = [
    '--kind',
    'documentation-policy',
    '--project-root',
    root,
    '--repository',
    'creatio-sample-repository',
    '--project',
    'refactoring',
    '--work-id',
    documentationWorkId,
    '--repair-id',
    repairId,
    '--forward-operation',
    operationId,
    '--payload-root',
    payloadRoot,
  ];
  const reconcile = (mode: string, extras: readonly string[] = []): JsonRecord => {
    const result = launch(path.join(payloadRoot, 'vida-agent/bin/reconcile-artifacts.mjs'), [
      '--mode',
      mode,
      ...common,
      ...extras,
    ]);
    required(isRecord(result), 'public operation result invalid');
    return result;
  };
  if (phase === 'baseline') {
    if (!existsSync(path.join(root, operationPath)))
      reconcile('plan', [
        '--target-policy',
        policy,
        '--baseline',
        receipt.baseline_path,
        '--actor',
        scope.owner,
        '--instruction-ref',
        scope.attribution.pointer,
        '--timestamp',
        new Date().toISOString(),
      ]);
    const operationValue: unknown = JSON.parse(read(operationPath).toString('utf8'));
    required(isRecord(operationValue) && isRecord(operationValue.plan), 'frozen operation work/baseline differs');
    const operation = operationValue;
    const plan = operationValue.plan;
    required(
      plan.work_id === documentationWorkId &&
        plan.baseline_digest === receipt.baseline_digest &&
        plan.source_revision === scope.source_revision &&
        typeof operation.phase === 'string',
      'frozen operation work/baseline differs',
    );
    const held = reconcile(operation.phase === 'planned' ? 'apply' : 'resume');
    if (held.status === 'applied') {
      // Finalize resumes preparation after closure. It may reverify a completed
      // publication, but cannot use a released fence to publish any remaining file.
      required(
        intent.changed.every(
          (entry) => sha(read(entry.path)) === entry.new_sha256 && read(entry.path).length === entry.new_size,
        ),
        'released transition cannot publish an incomplete successor',
      );
      clear('verify');
    } else
      required(
        held.status === 'author_policy_required' && held.maintenance_held === true,
        'real HostState fence not held before publication',
      );
    return {
      status: 'baseline_ready',
      baseline_path: receipt.baseline_path,
      baseline_digest: receipt.baseline_digest,
      receipt_path: receiptPath,
    };
  }
  required(
    ['closeout', 'verify'].includes(phase) &&
      sha(read(policy)) === policyChange.new_sha256 &&
      sha(read(instruction)) === lifecycle.new_sha256,
    'installed documentation target differs',
  );
  if (phase === 'closeout') required(reconcile('resume').status === 'applied', 'transition not applied');
  const verified = clear('verify');
  const operationValue: unknown = JSON.parse(read(operationPath).toString('utf8'));
  required(isTransitionOperation(operationValue), 'actual transition/closeout receipt differs');
  const operation = operationValue;
  required(
    operation.phase === 'applied' &&
      operation.maintenance_released === true &&
      operation.plan.work_id === documentationWorkId &&
      operation.plan.baseline_digest === receipt.baseline_digest &&
      operation.closeout.path === verified.path &&
      operation.closeout.sha256 === verified.sha256,
    'actual transition/closeout receipt differs',
  );
  return {
    status: 'closeout_verified',
    baseline_path: receipt.baseline_path,
    baseline_digest: receipt.baseline_digest,
    receipt_path: receiptPath,
    closeout_path: verified.path,
    closeout_sha256: verified.sha256,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [
      root = '',
      phase = '',
      payloadRoot = '',
      successorManifest = '',
      operationId = '',
      documentationWorkId = '',
    ] = process.argv.slice(2);
    console.log(
      JSON.stringify(
        await ensureForwardDocumentationPhase(
          root,
          phase,
          payloadRoot,
          successorManifest,
          operationId,
          documentationWorkId,
        ),
      ),
    );
  } catch (error: unknown) {
    console.error(JSON.stringify({ status: 'blocked', message: errorMessage(error) }));
    process.exitCode = 1;
  }
}
