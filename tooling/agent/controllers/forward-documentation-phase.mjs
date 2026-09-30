import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, openSync, closeSync, fsyncSync, constants } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const json = (value) => Buffer.from(JSON.stringify(value, null, 2) + '\n');
const policy = 'docs/agent-instructions/documentation-policy.v1.json';
const instruction = 'vida-agent/instructions/development-lifecycle.md';
const map = 'vida-agent/TESTING.md';
const required = (condition, message) => {
  if (!condition) throw Error(`forward documentation: ${message}`);
};

/** The old selected public CLI records baseline; exact admitted successor admin acquires the fence before publication. */
export async function ensureForwardDocumentationPhase(
  root,
  phase,
  payloadRoot,
  successorManifest,
  operationId,
  documentationWorkId,
) {
  required(
    path.isAbsolute(root) &&
      path.resolve(root) === root &&
      path.isAbsolute(payloadRoot) &&
      path.resolve(payloadRoot) === payloadRoot &&
      /^[a-z0-9][a-z0-9._-]{0,79}$/.test(operationId ?? '') &&
      /^[a-z0-9][a-z0-9._-]{0,127}$/.test(documentationWorkId ?? '') &&
      documentationWorkId !== 'vida-runtime-forward-fix-20260928',
    'new work/root binding invalid',
  );
  const read = (relative) => readFileSync(path.join(root, relative));
  const intent = JSON.parse(read(`.agent/cutover/${operationId}/forward-intent.v1.json`));
  required(
    intent.operation_id === operationId && intent.new_payload_manifest_sha256 === successorManifest,
    'forward intent differs',
  );
  const lifecycle = intent.changed.find((entry) => entry.path === instruction),
    policyChange = intent.changed.find((entry) => entry.path === policy);
  required(lifecycle && policyChange, 'policy transition requires declared instruction and policy changes');
  const scope = JSON.parse(read(`.agent/work/${documentationWorkId}/scope.json`));
  required(
    scope.work_id === documentationWorkId &&
      [policy, instruction, map].every((file) => scope.allowed_paths.includes(file)) &&
      /^[a-f0-9]{64}$/.test(scope.source_revision),
    'actual authorized three-path scope missing',
  );
  required(typeof Bun !== 'undefined', 'pinned Bun required');
  const launch = (entry, args) => {
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
    return JSON.parse(result.stdout.trim());
  };
  const clear = (mode) =>
    launch(path.join(root, 'vida-agent/bin/documentation-clear.mjs'), [
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
  const receiptPath = `.agent/cutover/${operationId}/documentation-forward.v1.json`;
  const expected = {
    schema: 'VidaForwardLifecycleClearBinding/v1',
    operation_id: operationId,
    old_sha256: lifecycle.old_sha256,
    new_sha256: lifecycle.new_sha256,
    policy_sha256: policyChange.new_sha256,
    parent_manifest_sha256: intent.old_payload_manifest_sha256,
    successor_manifest_sha256: successorManifest,
  };
  let receipt = existsSync(path.join(root, receiptPath)) ? JSON.parse(read(receiptPath)) : null;
  if (!receipt) {
    required(
      phase === 'baseline' &&
        sha(read(policy)) === policyChange.old_sha256 &&
        sha(read(instruction)) === lifecycle.old_sha256,
      'genuine pre-edit baseline required',
    );
    const baseline = clear('baseline');
    const record = JSON.parse(read(baseline.path));
    required(
      record.work_id === documentationWorkId &&
        record.source_revision === scope.source_revision &&
        record.status === 'pass' &&
        record.documents.find((entry) => entry.path === instruction)?.sha256 === lifecycle.old_sha256 &&
        record.policy_digest === policyChange.old_sha256,
      'public baseline differs from old source',
    );
    const oldPolicy = JSON.parse(read(policy));
    receipt = {
      ...expected,
      baseline_path: baseline.path,
      baseline_digest: record.digest,
      changelog_pre_sha256: sha(read(oldPolicy.changelog_path)),
    };
    const fd = openSync(path.join(root, receiptPath), constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY, 0o600);
    try {
      writeFileSync(fd, json(receipt));
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
  }
  required(
    Object.entries(expected).every(([key, value]) => receipt[key] === value),
    'receipt binding differs',
  );
  const baseline = JSON.parse(read(receipt.baseline_path));
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
  const reconcile = (mode, extras = []) =>
    launch(path.join(payloadRoot, 'vida-agent/bin/reconcile-artifacts.mjs'), ['--mode', mode, ...common, ...extras]);
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
    const operation = JSON.parse(read(operationPath));
    required(
      operation.plan.work_id === documentationWorkId &&
        operation.plan.baseline_digest === receipt.baseline_digest &&
        operation.plan.source_revision === scope.source_revision,
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
  const operation = JSON.parse(read(operationPath));
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
    console.log(JSON.stringify(await ensureForwardDocumentationPhase(...process.argv.slice(2))));
  } catch (error) {
    console.error(JSON.stringify({ status: 'blocked', message: error.message }));
    process.exitCode = 1;
  }
}
