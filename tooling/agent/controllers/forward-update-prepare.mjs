import { createHash, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  closeSync,
  constants,
  fsyncSync,
  linkSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertGeneratedRootAgents,
  inspectForwardUpdate,
  assertProjectOwnedIntegrationRetirement,
} from './forward-update-plan.mjs';
import { verifyForwardReviewSet } from './forward-review-proof.mjs';
import { assertForwardInvocationLock, withForwardInvocationLock } from './forward-invocation-lock.mjs';

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const json = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const fail = (message) => {
  throw new Error(`vida forward prepare: ${message}`);
};
const documentationPolicyPath = 'docs/agent-instructions/documentation-policy.v1.json';
const lifecycleInstructionPath = 'vida-agent/instructions/development-lifecycle.md';
const documentationPhaseScript = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'forward-documentation-phase.mjs',
);
const lifecycleOnlyScript = path.join(path.dirname(fileURLToPath(import.meta.url)), 'forward-lifecycle-clear.mjs');
function administrativeEnvironment(project, payloadRoot, operationId) {
  const pin = readFileSync(path.join(payloadRoot, 'vida-agent/.bun-version'), 'utf8').trim();
  if (!/^\d+\.\d+\.\d+$/.test(pin) || !/^[a-z0-9][a-z0-9._-]{0,79}$/.test(operationId))
    fail('administrative cache binding invalid');
  return {
    ...process.env,
    BUN_RUNTIME_TRANSPILER_CACHE_PATH: path.join(project, '.tmp', 'vida-bun-cache', 'vida-agent', pin, operationId),
  };
}
function requireDocumentationPhase(project, payloadRoot, phase, successorManifest, operationId, documentationWorkId) {
  const result = spawnSync(
    process.execPath,
    [
      path.join(path.resolve(payloadRoot), 'vida-agent/bin/bun.mjs'),
      documentationPhaseScript,
      project,
      phase,
      path.resolve(payloadRoot),
      successorManifest,
      operationId,
      documentationWorkId ?? '',
    ],
    {
      cwd: path.join(path.resolve(payloadRoot), 'vida-agent'),
      windowsHide: true,
      timeout: 120_000,
      encoding: 'utf8',
      env: administrativeEnvironment(project, payloadRoot, operationId),
    },
  );
  if (result.error || result.status !== 0)
    fail(`runtime documentation ${phase} blocked: ${result.stderr || result.error?.message}`);
  let output;
  try {
    output = JSON.parse(result.stdout.trim());
  } catch {
    fail(`runtime documentation ${phase} output invalid`);
  }
  if (output.status !== (phase === 'baseline' ? 'baseline_ready' : 'closeout_verified'))
    fail(`runtime documentation ${phase} status invalid`);
  return output;
}
function requireLifecycleOnlyPhase(
  project,
  payloadRoot,
  phase,
  lock,
  change,
  policyHash,
  approvedRepair = null,
  documentationWorkId = null,
) {
  const result = spawnSync(
    process.execPath,
    [
      path.join(path.resolve(payloadRoot), 'vida-agent/bin/bun.mjs'),
      lifecycleOnlyScript,
      project,
      phase,
      lock.operation_id,
      change.old_sha256,
      change.new_sha256,
      policyHash,
      lock.old_payload_manifest_sha256,
      lock.new_payload_manifest_sha256,
      path.resolve(payloadRoot),
      documentationWorkId ?? '',
    ],
    {
      cwd: path.join(path.resolve(payloadRoot), 'vida-agent'),
      windowsHide: true,
      timeout: 120_000,
      encoding: 'utf8',
      env: administrativeEnvironment(project, payloadRoot, lock.operation_id),
    },
  );
  if (result.error || result.status !== 0)
    fail(`lifecycle-only CLEAR ${phase} blocked: ${result.stderr || result.error?.message}`);
  let output;
  try {
    output = JSON.parse(result.stdout.trim());
  } catch {
    fail(`lifecycle-only CLEAR ${phase} output invalid`);
  }
  if (output.status !== (phase === 'baseline' ? 'baseline_ready' : 'closeout_verified'))
    fail(`lifecycle-only CLEAR ${phase} status invalid`);
  return output;
}
function file(location) {
  const stat = lstatSync(location);
  if (!stat.isFile() || stat.isSymbolicLink()) fail(`unsafe file: ${location}`);
  return readFileSync(location);
}
function directory(location) {
  const stat = lstatSync(location);
  if (!stat.isDirectory() || stat.isSymbolicLink()) fail(`unsafe directory: ${location}`);
}
function exists(location) {
  try {
    lstatSync(location);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}
function safeAt(root, relative) {
  if (
    typeof relative !== 'string' ||
    !relative ||
    relative.includes('\\') ||
    relative.startsWith('/') ||
    relative.split('/').some((part) => !part || part === '.' || part === '..' || part.includes(':'))
  )
    fail('unsafe relative path');
  let parent = root;
  for (const part of relative.split('/').slice(0, -1)) {
    parent = path.join(parent, part);
    directory(parent);
  }
  return path.join(parent, relative.split('/').at(-1));
}
function ensureAddedParent(root, relative) {
  if (!relative.startsWith('vida-agent/')) fail('only bundle additions are supported');
  let current = root;
  for (const part of relative.split('/').slice(0, -1)) {
    current = path.join(current, part);
    if (!exists(current)) mkdirSync(current);
    directory(current);
  }
  return path.join(current, relative.split('/').at(-1));
}
function exact(filePath, value) {
  if (!file(filePath).equals(json(value))) fail(`durable record drift: ${filePath}`);
}
function authorize(project, workRoot, lock) {
  const raw = file(path.join(workRoot, 'forward-authorization.v1.json'));
  let value;
  try {
    value = JSON.parse(raw.toString('utf8'));
  } catch {
    fail('invalid forward authorization');
  }
  const keys = ['schema', 'operation_id', 'operator', 'outcome', 'pointer', 'plan_sha256', 'evidence'];
  if (
    !value ||
    Object.keys(value).sort().join(',') !== keys.sort().join(',') ||
    !raw.equals(json(value)) ||
    value.schema !== 'VidaForwardUpdateAuthorization/v1' ||
    value.operation_id !== lock.operation_id ||
    value.operator !== lock.operator ||
    value.outcome !== 'approved' ||
    typeof value.pointer !== 'string' ||
    !value.pointer.trim() ||
    value.plan_sha256 !== sha(json(lock)) ||
    !Array.isArray(value.evidence) ||
    value.evidence.length !== 3 ||
    value.evidence
      .map((item) => item.kind)
      .sort()
      .join(',') !== 'assurance,correctness,security'
  )
    fail('forward authorization does not bind exact plan and review set');
  try {
    verifyForwardReviewSet(project, lock.operation_id, value.plan_sha256, value.evidence);
  } catch (error) {
    fail(`forward review evidence invalid: ${error.message}`);
  }
  return value;
}
function appendJournal(filePath, value) {
  const fd = openSync(filePath, constants.O_CREAT | constants.O_APPEND | constants.O_WRONLY, 0o600);
  try {
    writeFileSync(fd, `${JSON.stringify(value)}\n`);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}
function journalEvents(filePath, operationId, lockSha) {
  let raw;
  try {
    raw = file(filePath).toString('utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
  if (raw && !raw.endsWith('\n')) fail('incomplete journal');
  const events = raw
    ? raw
        .trimEnd()
        .split('\n')
        .map((line) => JSON.parse(line))
    : [];
  if (
    events.some(
      (event) =>
        event.schema !== 'VidaForwardUpdateEvent/v1' ||
        event.operation_id !== operationId ||
        event.lock_sha256 !== lockSha ||
        ![
          'acquired',
          'file_replaced',
          'repair_prerequisite_validated',
          'documentation_closeout_verified',
          'documentation_current_closeout_verified',
          'bundle_prepared',
        ].includes(event.phase) ||
        (event.phase === 'file_replaced' && typeof event.path !== 'string'),
    )
  )
    fail('journal drift');
  return events;
}

/** Finalize may only publish a lifecycle-only successor with the exact durable CLEAR proof. */
export function verifyLifecycleOnlyForward({
  root,
  oldPayloadRoot,
  payloadRoot,
  lock,
  approvedRepair = null,
  documentationWorkId = null,
}) {
  const lifecycle = lock.changed.find((entry) => entry.path === lifecycleInstructionPath);
  const policyChange = lock.changed.find((entry) => entry.path === documentationPolicyPath);
  if (!lifecycle || policyChange) return null;
  const prior = JSON.parse(file(path.join(path.resolve(oldPayloadRoot), 'vida-agent-payload.manifest.v1.json')));
  const next = JSON.parse(file(path.join(path.resolve(payloadRoot), 'vida-agent-payload.manifest.v1.json')));
  const policyHash = prior.files.find((entry) => entry.path === documentationPolicyPath)?.sha256;
  if (!policyHash || next.files.find((entry) => entry.path === documentationPolicyPath)?.sha256 !== policyHash)
    fail('lifecycle-only CLEAR policy manifest changed');
  const proof = requireLifecycleOnlyPhase(
    path.resolve(root),
    payloadRoot,
    'current_verify',
    lock,
    lifecycle,
    policyHash,
    approvedRepair,
    documentationWorkId,
  );
  const lockSha = sha(json(lock));
  const events = journalEvents(
    path.join(path.resolve(root), `.agent/cutover/${lock.operation_id}/forward-journal.v1.jsonl`),
    lock.operation_id,
    lockSha,
  );
  const recorded = events.filter((event) => event.phase === 'documentation_closeout_verified');
  const current = events.filter((event) => event.phase === 'documentation_current_closeout_verified');
  if (
    recorded.length !== 1 ||
    recorded[0].closeout_sha256 !== proof.closeout_sha256 ||
    recorded[0].receipt_path !== proof.receipt_path ||
    recorded[0].event_id !== proof.event_id ||
    recorded[0].event_timestamp !== proof.event_timestamp ||
    recorded[0].event_suffix_sha256 !== proof.event_suffix_sha256 ||
    current.length !== 1 ||
    current[0].closeout_path !== proof.current_closeout_path ||
    current[0].closeout_sha256 !== proof.current_closeout_sha256 ||
    current[0].inventory_digest !== proof.current_inventory_digest ||
    current[0].repair_plan_digest !== proof.repair_plan_digest ||
    !events.some((event) => event.phase === 'bundle_prepared')
  )
    fail('lifecycle-only CLEAR journal proof missing or changed');
  return proof;
}

/** Recheck the selected branch's current CLEAR checkpoint without creating one. */
export function verifyCurrentForwardDocumentation(options) {
  const { root, oldPayloadRoot, payloadRoot, lock, approvedRepair = null, documentationWorkId = null } = options;
  if (lock.changed.some((entry) => entry.path === documentationPolicyPath)) {
    const proof = requireDocumentationPhase(
      path.resolve(root),
      payloadRoot,
      'verify',
      lock.new_payload_manifest_sha256,
      lock.operation_id,
      documentationWorkId,
    );
    const events = journalEvents(
      path.join(path.resolve(root), `.agent/cutover/${lock.operation_id}/forward-journal.v1.jsonl`),
      lock.operation_id,
      sha(json(lock)),
    );
    if (!events.some((event) => event.phase === 'bundle_prepared'))
      fail('runtime documentation bundle preparation proof missing');
    return proof;
  }
  return verifyLifecycleOnlyForward({ root, oldPayloadRoot, payloadRoot, lock, approvedRepair, documentationWorkId });
}

/** Retained journal labels reverify the same new authorized CLEAR cycle before selection. */
export function completeCurrentLifecycleOnlyForward({
  root,
  oldPayloadRoot,
  payloadRoot,
  lock,
  approvedRepair = null,
  documentationWorkId = null,
}) {
  const lifecycle = lock.changed.find((entry) => entry.path === lifecycleInstructionPath);
  const policyChange = lock.changed.find((entry) => entry.path === documentationPolicyPath);
  if (!lifecycle || policyChange) return null;
  const prior = JSON.parse(file(path.join(path.resolve(oldPayloadRoot), 'vida-agent-payload.manifest.v1.json')));
  const next = JSON.parse(file(path.join(path.resolve(payloadRoot), 'vida-agent-payload.manifest.v1.json')));
  const policyHash = prior.files.find((entry) => entry.path === documentationPolicyPath)?.sha256;
  if (!policyHash || next.files.find((entry) => entry.path === documentationPolicyPath)?.sha256 !== policyHash)
    fail('lifecycle-only CLEAR policy manifest changed');
  const lockSha = sha(json(lock));
  const journalPath = path.join(path.resolve(root), `.agent/cutover/${lock.operation_id}/forward-journal.v1.jsonl`);
  const events = journalEvents(journalPath, lock.operation_id, lockSha);
  if (
    events.filter((event) => event.phase === 'documentation_closeout_verified').length !== 1 ||
    events.filter((event) => event.phase === 'bundle_prepared').length !== 1
  )
    fail('lifecycle-only CLEAR same-cycle journal proof missing');
  const historical = requireLifecycleOnlyPhase(
    path.resolve(root),
    payloadRoot,
    'historical',
    lock,
    lifecycle,
    policyHash,
    approvedRepair,
    documentationWorkId,
  );
  const recordedHistorical = events.find((event) => event.phase === 'documentation_closeout_verified');
  if (
    recordedHistorical.closeout_sha256 !== historical.closeout_sha256 ||
    recordedHistorical.receipt_path !== historical.receipt_path ||
    recordedHistorical.event_id !== historical.event_id ||
    recordedHistorical.event_timestamp !== historical.event_timestamp ||
    recordedHistorical.event_suffix_sha256 !== historical.event_suffix_sha256
  )
    fail('lifecycle-only CLEAR same-cycle event proof changed');
  const proof = requireLifecycleOnlyPhase(
    path.resolve(root),
    payloadRoot,
    'current',
    lock,
    lifecycle,
    policyHash,
    approvedRepair,
    documentationWorkId,
  );
  const recorded = events.filter((event) => event.phase === 'documentation_current_closeout_verified');
  if (
    recorded.length > 1 ||
    (recorded.length === 1 &&
      (recorded[0].closeout_path !== proof.current_closeout_path ||
        recorded[0].closeout_sha256 !== proof.current_closeout_sha256 ||
        recorded[0].inventory_digest !== proof.current_inventory_digest ||
        recorded[0].repair_plan_digest !== proof.repair_plan_digest))
  )
    fail('lifecycle-only CLEAR current journal proof changed');
  if (!recorded.length)
    appendJournal(journalPath, {
      schema: 'VidaForwardUpdateEvent/v1',
      operation_id: lock.operation_id,
      lock_sha256: lockSha,
      phase: 'documentation_current_closeout_verified',
      closeout_path: proof.current_closeout_path,
      closeout_sha256: proof.current_closeout_sha256,
      inventory_digest: proof.current_inventory_digest,
      repair_plan_digest: proof.repair_plan_digest,
    });
  return proof;
}

/**
 * Proposal-only first transaction half. The lock deliberately remains held.
 * A matching selector reader, commit and release phase must be built before use.
 */
export function prepareForwardBundle(options) {
  if (!/^node(?:\.exe)?$/iu.test(path.basename(process.execPath)))
    fail('Node.js launcher required before forward effects');
  const { root, operationId, invocationToken = null } = options;
  if (invocationToken) {
    assertForwardInvocationLock(root, operationId, invocationToken);
    return prepareForwardBundleCore(options);
  }
  return withForwardInvocationLock(root, operationId, (token) =>
    prepareForwardBundleCore({ ...options, invocationToken: token }),
  );
}

function prepareForwardBundleCore({
  root,
  oldPayloadRoot,
  payloadRoot,
  operationId,
  operator,
  preserveConfiguredResearchChangelog = false,
  resume = false,
  onPhase,
  approvedRepair = null,
  documentationWorkId = null,
  completedReadonlyCapture = null,
}) {
  if (!/^[a-z0-9][a-z0-9._-]{0,79}$/.test(operationId) || !/^[a-z0-9][a-z0-9._-]{0,79}$/.test(operator))
    fail('invalid operation identity');
  const project = path.resolve(root);
  const selector = file(safeAt(project, '.agent/active-runtime-selector.v1.json'));
  let current;
  try {
    current = JSON.parse(selector.toString('utf8'));
  } catch {
    fail('invalid selector');
  }
  const generation = current.generation;
  if (!/^[a-z0-9][a-z0-9._-]{0,79}$/.test(generation)) fail('invalid generation');
  const overlayPath = safeAt(project, `.agent/cutover/${generation}/maintenance-lock.v1.json`);
  const workRoot = safeAt(project, `.agent/cutover/${operationId}`);
  directory(workRoot);
  const intentPath = path.join(workRoot, 'forward-intent.v1.json');
  const journalPath = path.join(workRoot, 'forward-journal.v1.jsonl');
  let lock;
  if (resume) {
    lock = JSON.parse(file(intentPath).toString('utf8'));
    if (
      lock.schema !== 'VidaForwardUpdateMaintenance/v1' ||
      lock.operation_id !== operationId ||
      lock.operator !== operator ||
      lock.parent_generation !== generation ||
      lock.parent_selector_sha256 !== sha(selector)
    )
      fail('resume intent identity differs');
    exact(intentPath, lock);
    authorize(project, workRoot, lock);
    if (!exists(overlayPath)) {
      const inspection = inspectForwardUpdate({
        root,
        oldPayloadRoot,
        payloadRoot,
        preserveConfiguredResearchChangelog,
      });
      if (
        !inspection.apply_ready ||
        inspection.selector_sha256 !== lock.parent_selector_sha256 ||
        inspection.cutoff_witness_sha256 !== lock.parent_cutoff_sha256 ||
        inspection.old_payload_manifest_sha256 !== lock.old_payload_manifest_sha256 ||
        inspection.new_payload_manifest_sha256 !== lock.new_payload_manifest_sha256 ||
        JSON.stringify(inspection.changed) !== JSON.stringify(lock.changed) ||
        JSON.stringify(inspection.preserved_mutable_outputs) !== JSON.stringify(lock.preserved_mutable_outputs)
      )
        fail('unlocked intent differs from current exact source tuple');
      const fd = openSync(overlayPath, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY, 0o600);
      try {
        writeFileSync(fd, json(lock));
        fsyncSync(fd);
      } finally {
        closeSync(fd);
      }
    }
  } else {
    const inspection = inspectForwardUpdate({ root, oldPayloadRoot, payloadRoot, preserveConfiguredResearchChangelog });
    if (!inspection.apply_ready) fail('installed drift requires explicit classification before update');
    if (operationId === inspection.generation) fail('new operation ID required');
    lock = {
      schema: 'VidaForwardUpdateMaintenance/v1',
      operation_id: operationId,
      operator,
      parent_generation: inspection.generation,
      parent_selector_sha256: inspection.selector_sha256,
      parent_cutoff_sha256: inspection.cutoff_witness_sha256,
      first_admitted_work_attempt: inspection.first_admitted_work_attempt,
      old_payload_manifest_sha256: inspection.old_payload_manifest_sha256,
      new_payload_manifest_sha256: inspection.new_payload_manifest_sha256,
      changed: inspection.changed,
      preserved_mutable_outputs: inspection.preserved_mutable_outputs,
    };
    authorize(project, workRoot, lock);
    const intentFd = openSync(intentPath, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY, 0o600);
    try {
      writeFileSync(intentFd, json(lock));
      fsyncSync(intentFd);
    } finally {
      closeSync(intentFd);
    }
    onPhase?.('intent_written');
    const fd = openSync(overlayPath, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY, 0o600);
    try {
      writeFileSync(fd, json(lock));
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
  }
  const lockSha = sha(json(lock));
  const events = journalEvents(journalPath, operationId, lockSha);
  if (!events.some((event) => event.phase === 'acquired')) {
    appendJournal(journalPath, {
      schema: 'VidaForwardUpdateEvent/v1',
      operation_id: operationId,
      lock_sha256: lockSha,
      phase: 'acquired',
    });
    onPhase?.('acquired');
  }
  exact(overlayPath, lock);
  if (sha(file(safeAt(project, '.agent/active-runtime-selector.v1.json'))) !== lock.parent_selector_sha256)
    fail('selector changed under maintenance');
  if (sha(file(safeAt(project, `.agent/cutover/${generation}/cutoff-witness.json`))) !== lock.parent_cutoff_sha256)
    fail('first-work witness changed under maintenance');
  if (
    sha(file(path.join(path.resolve(oldPayloadRoot), 'vida-agent-payload.manifest.v1.json'))) !==
      lock.old_payload_manifest_sha256 ||
    sha(file(path.join(path.resolve(payloadRoot), 'vida-agent-payload.manifest.v1.json'))) !==
      lock.new_payload_manifest_sha256
  )
    fail('staged manifest changed');
  if (completedReadonlyCapture !== null) {
    // The existing parent overlay denies normal execution throughout capture and
    // partial-success recovery. No HostState fence or bundle publication exists yet.
    const result = spawnSync(
      process.execPath,
      [
        path.join(path.resolve(payloadRoot), 'vida-agent/bin/bun.mjs'),
        path.join(path.resolve(payloadRoot), 'vida-agent/bin/capture-completed-readonly.mjs'),
        '--project-root',
        project,
        '--payload-root',
        path.resolve(payloadRoot),
        '--forward-operation',
        operationId,
        '--capture-request',
        completedReadonlyCapture,
      ],
      {
        cwd: project,
        encoding: 'utf8',
        windowsHide: true,
        timeout: 120_000,
        env: administrativeEnvironment(project, payloadRoot, operationId),
      },
    );
    if (result.error || result.status !== 0)
      fail(`completed readonly owner closure blocked: ${result.stderr || result.error?.message}`);
    let captured;
    try {
      captured = JSON.parse(result.stdout.trim());
    } catch {
      fail('completed readonly capture output invalid');
    }
    if (
      captured.status !== 'captured_normalization_pending' ||
      captured.owner_released !== true ||
      captured.canonical_acceptance !== false ||
      captured.native_calls !== 0
    )
      fail('completed readonly closure result invalid');
    exact(overlayPath, lock);
    authorize(project, workRoot, lock);
    onPhase?.('completed_readonly_owner_closed');
  }
  const oldOwnership = JSON.parse(file(path.join(path.resolve(oldPayloadRoot), 'vida-agent-payload.manifest.v1.json')));
  const nextOwnership = JSON.parse(file(path.join(path.resolve(payloadRoot), 'vida-agent-payload.manifest.v1.json')));
  assertProjectOwnedIntegrationRetirement(
    project,
    new Map(oldOwnership.files.map((entry) => [entry.path, entry])),
    new Map(nextOwnership.files.map((entry) => [entry.path, entry])),
  );
  const prerequisite = new Set([
    'vida-agent/schemas/research-synthesis.v1.schema.json',
    'vida-agent/src/contracts/envelopes.ts',
    'vida-agent/src/host-state.ts',
    'vida-agent/src/orchestration/persistent-session-handoff.ts',
    'vida-agent/bin/repair-research-records.mjs',
    'vida-agent/bin/reconcile-artifacts.mjs',
    'vida-agent/package.json',
    'vida-agent/tests/reconcile-artifacts.test.mjs',
  ]);
  const requiresRepair = lock.changed.some(
    (entry) => entry.path === 'vida-agent/schemas/implementation-scope.v1.schema.json',
  );
  if (requiresRepair && !lock.changed.some((entry) => entry.path === 'vida-agent/bin/reconcile-artifacts.mjs'))
    fail('current-v1 schema change lacks bundle-owned repair command');
  const policyChange = lock.changed.find((entry) => entry.path === documentationPolicyPath);
  const lifecycleChange = lock.changed.find((entry) => entry.path === lifecycleInstructionPath);
  const lifecycleOnly = lifecycleChange && !policyChange;
  let lifecyclePolicyHash = null;
  if (lifecycleOnly) {
    const prior = JSON.parse(file(path.join(path.resolve(oldPayloadRoot), 'vida-agent-payload.manifest.v1.json')));
    const next = JSON.parse(file(path.join(path.resolve(payloadRoot), 'vida-agent-payload.manifest.v1.json')));
    const oldPolicy = prior.files.find((entry) => entry.path === documentationPolicyPath);
    const newPolicy = next.files.find((entry) => entry.path === documentationPolicyPath);
    if (
      !oldPolicy ||
      oldPolicy.sha256 !== newPolicy?.sha256 ||
      sha(file(safeAt(project, documentationPolicyPath))) !== oldPolicy.sha256 ||
      !/^[a-f0-9]{64}$/.test(lifecycleChange.old_sha256 ?? '') ||
      !/^[a-f0-9]{64}$/.test(lifecycleChange.new_sha256 ?? '')
    )
      fail('lifecycle-only CLEAR parent policy or instruction binding changed');
    lifecyclePolicyHash = oldPolicy.sha256;
  }
  if (policyChange) {
    if (!lifecycleChange) fail('policy transition requires declared lifecycle replacement');
    requireDocumentationPhase(
      project,
      payloadRoot,
      'baseline',
      lock.new_payload_manifest_sha256,
      operationId,
      documentationWorkId,
    );
    onPhase?.('documentation_baseline_ready');
  }
  // The public admitted successor now holds the real HostState fence before any prefix.
  const governed = new Set([documentationPolicyPath, lifecycleInstructionPath, 'vida-agent/TESTING.md']);
  const ordered = [
    ...lock.changed.filter((entry) => !governed.has(entry.path) && prerequisite.has(entry.path)),
    ...lock.changed.filter((entry) => !governed.has(entry.path) && !prerequisite.has(entry.path)),
    ...lock.changed.filter((entry) => governed.has(entry.path) && entry.path !== documentationPolicyPath),
    ...lock.changed.filter((entry) => entry.path === documentationPolicyPath),
  ];
  let repairValidated = !requiresRepair || events.some((event) => event.phase === 'repair_prerequisite_validated');
  const validateRepair = () => {
    if (repairValidated) return;
    const run = spawnSync(
      process.execPath,
      [path.join(project, 'vida-agent/bin/bun.mjs'), 'test', 'tests/reconcile-artifacts.test.mjs'],
      { cwd: path.join(project, 'vida-agent'), windowsHide: true, timeout: 120_000, encoding: 'utf8' },
    );
    if (run.error || run.status !== 0 || !run.output?.join('').includes('2 pass'))
      fail('installed bundle-owned repair command failed its pinned functional check');
    appendJournal(journalPath, {
      schema: 'VidaForwardUpdateEvent/v1',
      operation_id: operationId,
      lock_sha256: lockSha,
      phase: 'repair_prerequisite_validated',
    });
    onPhase?.('repair_prerequisite_validated');
    repairValidated = true;
  };
  for (const change of ordered) {
    if (lifecycleOnly && change.path === lifecycleInstructionPath) {
      requireLifecycleOnlyPhase(
        project,
        payloadRoot,
        'baseline',
        lock,
        lifecycleChange,
        lifecyclePolicyHash,
        null,
        documentationWorkId,
      );
      onPhase?.('documentation_baseline_ready');
    }
    if (
      !change.path.startsWith('vida-agent/') &&
      change.path !== documentationPolicyPath &&
      change.path !== 'AGENTS.md'
    )
      fail('non-bundle replacement denied');
    if (change.path === 'AGENTS.md') assertGeneratedRootAgents(payloadRoot);
    const installedPath =
      change.old_sha256 === null ? ensureAddedParent(project, change.path) : safeAt(project, change.path);
    const replacement = file(safeAt(path.resolve(payloadRoot), change.path));
    if (sha(replacement) !== change.new_sha256 || replacement.length !== change.new_size)
      fail(`successor bytes changed: ${change.path}`);
    const currentBytes = exists(installedPath) ? file(installedPath) : null;
    if (change.old_sha256 === null && currentBytes === null) {
      const pending = `${installedPath}.pending-${randomUUID()}`;
      const fd = openSync(pending, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY, 0o600);
      try {
        writeFileSync(fd, replacement);
        fsyncSync(fd);
      } finally {
        closeSync(fd);
      }
      try {
        linkSync(pending, installedPath);
      } finally {
        unlinkSync(pending);
      }
    } else if (currentBytes && sha(currentBytes) === change.old_sha256 && currentBytes.length === change.old_size) {
      const pending = `${installedPath}.pending-${randomUUID()}`;
      const fd = openSync(pending, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY, 0o600);
      try {
        writeFileSync(fd, replacement);
        fsyncSync(fd);
      } finally {
        closeSync(fd);
      }
      if (sha(file(installedPath)) !== change.old_sha256) fail(`installed CAS lost: ${change.path}`);
      renameSync(pending, installedPath);
    } else if (!currentBytes || sha(currentBytes) !== change.new_sha256 || currentBytes.length !== change.new_size)
      fail(`third-party installed bytes: ${change.path}`);
    if (sha(file(installedPath)) !== change.new_sha256) fail(`publication failed: ${change.path}`);
    if (!events.some((event) => event.phase === 'file_replaced' && event.path === change.path)) {
      appendJournal(journalPath, {
        schema: 'VidaForwardUpdateEvent/v1',
        operation_id: operationId,
        lock_sha256: lockSha,
        phase: 'file_replaced',
        path: change.path,
      });
      onPhase?.('file_replaced', change.path);
    }
  }
  // The repair command's functional check must run against the complete installed
  // successor, not the first prerequisite prefix of a partially replaced bundle.
  if (requiresRepair) {
    const next = JSON.parse(file(path.join(path.resolve(payloadRoot), 'vida-agent-payload.manifest.v1.json')));
    for (const entry of next.files.filter((item) => item.path.startsWith('vida-agent/'))) {
      const installed = file(safeAt(project, entry.path));
      if (sha(installed) !== entry.sha256 || installed.length !== entry.size)
        fail(`incomplete installed repair successor: ${entry.path}`);
    }
  }
  validateRepair();
  if (policyChange) {
    const proof = requireDocumentationPhase(
      project,
      payloadRoot,
      'closeout',
      lock.new_payload_manifest_sha256,
      operationId,
      documentationWorkId,
    );
    const recorded = events.find((event) => event.phase === 'documentation_closeout_verified');
    if (
      recorded &&
      (recorded.closeout_sha256 !== proof.closeout_sha256 || recorded.receipt_path !== proof.receipt_path)
    )
      fail('policy transition journal proof changed');
    if (!recorded)
      appendJournal(journalPath, {
        schema: 'VidaForwardUpdateEvent/v1',
        operation_id: operationId,
        lock_sha256: lockSha,
        phase: 'documentation_closeout_verified',
        closeout_sha256: proof.closeout_sha256,
        receipt_path: proof.receipt_path,
      });
    onPhase?.('documentation_closeout_verified');
  } else if (lifecycleOnly) {
    const closeout = requireLifecycleOnlyPhase(
      project,
      payloadRoot,
      events.some((entry) => entry.phase === 'documentation_closeout_verified') ? 'historical' : 'closeout',
      lock,
      lifecycleChange,
      lifecyclePolicyHash,
      null,
      documentationWorkId,
    );
    const event = events.find((entry) => entry.phase === 'documentation_closeout_verified');
    if (event) {
      if (
        event.closeout_sha256 !== closeout.closeout_sha256 ||
        event.receipt_path !== closeout.receipt_path ||
        event.event_id !== closeout.event_id ||
        event.event_timestamp !== closeout.event_timestamp ||
        event.event_suffix_sha256 !== closeout.event_suffix_sha256
      )
        fail('lifecycle-only CLEAR journal proof changed');
    } else {
      appendJournal(journalPath, {
        schema: 'VidaForwardUpdateEvent/v1',
        operation_id: operationId,
        lock_sha256: lockSha,
        phase: 'documentation_closeout_verified',
        closeout_sha256: closeout.closeout_sha256,
        receipt_path: closeout.receipt_path,
        event_id: closeout.event_id,
        ...(closeout.event_timestamp
          ? { event_timestamp: closeout.event_timestamp, event_suffix_sha256: closeout.event_suffix_sha256 }
          : {}),
      });
    }
    onPhase?.('documentation_closeout_verified');
  }
  if (!events.some((event) => event.phase === 'bundle_prepared')) {
    appendJournal(journalPath, {
      schema: 'VidaForwardUpdateEvent/v1',
      operation_id: operationId,
      lock_sha256: lockSha,
      phase: 'bundle_prepared',
    });
    onPhase?.('bundle_prepared');
  }
  return {
    schema: 'VidaForwardUpdatePrepareResult/v1',
    operation_id: operationId,
    status: 'maintenance_held_awaiting_selector',
    lock_sha256: lockSha,
  };
}
