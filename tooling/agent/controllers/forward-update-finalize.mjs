import { createHash, randomUUID } from 'node:crypto';
import {
  closeSync,
  constants,
  fsyncSync,
  linkSync,
  lstatSync,
  openSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import {
  completeCurrentLifecycleOnlyForward,
  prepareForwardBundle,
  verifyCurrentForwardDocumentation,
} from './forward-update-prepare.mjs';
import { withForwardInvocationLock } from './forward-invocation-lock.mjs';
import { assertProjectOwnedIntegrationRetirement } from './forward-update-plan.mjs';

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const json = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const fail = (message) => {
  throw new Error(`vida forward finalize: ${message}`);
};
function stat(location) {
  try {
    return lstatSync(location);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}
function bytes(location) {
  const info = stat(location);
  if (!info?.isFile() || info.isSymbolicLink()) fail(`unsafe or missing file: ${location}`);
  return readFileSync(location);
}
function at(root, relative) {
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
    const info = stat(parent);
    if (!info?.isDirectory() || info.isSymbolicLink()) fail('unsafe parent directory');
  }
  return path.join(parent, relative.split('/').at(-1));
}
function record(file, schema) {
  const raw = bytes(file);
  let value;
  try {
    value = JSON.parse(raw.toString('utf8'));
  } catch {
    fail(`invalid record: ${file}`);
  }
  if (value?.schema !== schema || !raw.equals(json(value))) fail(`invalid record encoding: ${file}`);
  return { value, raw };
}
function publish(file, content) {
  if (stat(file)) {
    if (!bytes(file).equals(content)) fail(`record collision: ${file}`);
    return;
  }
  const pending = `${file}.pending-${randomUUID()}`;
  const fd = openSync(pending, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY, 0o600);
  try {
    writeFileSync(fd, content);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  try {
    linkSync(pending, file);
  } catch (error) {
    if (error.code === 'EEXIST') fail(`record collision: ${file}`);
    throw error;
  } finally {
    unlinkSync(pending);
  }
  if (!bytes(file).equals(content)) fail(`publication failed: ${file}`);
}
function finalizeEvents(file, operationId) {
  const order = ['successor_prepared', 'successor_selected', 'successor_released'];
  const existing = stat(file) ? bytes(file).toString('utf8') : '';
  if (existing && !existing.endsWith('\n')) fail('incomplete finalize journal');
  const events = existing
    ? existing
        .trimEnd()
        .split('\n')
        .map((line) => {
          try {
            return JSON.parse(line);
          } catch {
            fail('invalid finalize journal');
          }
        })
    : [];
  if (
    events.some(
      (event, index) =>
        event.schema !== 'VidaForwardUpdateEvent/v1' ||
        event.operation_id !== operationId ||
        event.phase !== order[index],
    ) ||
    events.length > order.length
  )
    fail('finalize journal drift');
  return events;
}
function journal(file, operationId, phase) {
  const order = ['successor_prepared', 'successor_selected', 'successor_released'];
  const events = finalizeEvents(file, operationId);
  const position = order.indexOf(phase);
  if (position < events.length) return;
  if (position !== events.length) fail('finalize journal phase gap');
  const fd = openSync(file, constants.O_CREAT | constants.O_APPEND | constants.O_WRONLY, 0o600);
  try {
    writeFileSync(fd, `${JSON.stringify({ schema: 'VidaForwardUpdateEvent/v1', operation_id: operationId, phase })}\n`);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}
function manifest(root, expectedSha) {
  const raw = bytes(path.join(root, 'vida-agent-payload.manifest.v1.json'));
  if (sha(raw) !== expectedSha) fail('staged manifest changed');
  let value;
  try {
    value = JSON.parse(raw.toString('utf8'));
  } catch {
    fail('invalid staged manifest');
  }
  if (
    value?.schema !== 'VidaAgentPreparedPayload/v1' ||
    !Array.isArray(value.files) ||
    !Array.isArray(value.unresolved_integration_paths) ||
    value.unresolved_integration_paths.length
  )
    fail('invalid staged manifest shape');
  for (const entry of value.files) {
    if (
      typeof entry.path !== 'string' ||
      !/^[a-f0-9]{64}$/.test(entry.sha256) ||
      !Number.isSafeInteger(entry.size) ||
      entry.size < 0
    )
      fail('invalid staged entry');
    const staged = bytes(at(root, entry.path));
    if (sha(staged) !== entry.sha256 || staged.length !== entry.size) fail(`staged payload drift: ${entry.path}`);
  }
  return { raw, value };
}

/** Proposal-only completion half; no operator-facing CLI until reader and fault tests pass. */
export function finalizeForwardBundle(options) {
  if (!/^node(?:\.exe)?$/iu.test(path.basename(process.execPath)))
    fail('Node.js launcher required before forward effects');
  const { root, operationId, approvedRepair = null } = options;
  if (operationId === 'vida-synthesis-qualified-forward-20260929-01') {
    const bindingPath = '.agent/work/vida-runtime-forward-fix-20260928/APPROVED-SYNTHESIS-REPAIR-BINDING.json';
    const raw = bytes(at(path.resolve(root), bindingPath));
    if (sha(raw) !== 'cc25e37130923adb16408a561caf8847c08bee3a423f4820c8375277361e8934')
      fail('reviewed approved repair binding changed');
    let binding;
    try {
      binding = JSON.parse(raw.toString('utf8'));
    } catch {
      fail('reviewed approved repair binding invalid');
    }
    if (!approvedRepair || JSON.stringify(binding) !== JSON.stringify(approvedRepair))
      fail('approved repair caller differs from reviewed binding');
  }
  return withForwardInvocationLock(
    root,
    operationId,
    (invocationToken) => finalizeForwardBundleCore({ ...options, invocationToken }),
    {
      classifyCompletedCleanup: (error, result) => {
        verifyReleasedTerminalState({ root, operationId, operator: options.operator, result });
        return {
          ...result,
          cleanup_warning: {
            code: 'GAP-VIDA-FORWARD-LOCK-CLEANUP-001',
            message: error.message,
          },
        };
      },
    },
  );
}

function verifyReleasedTerminalState({ root, operationId, operator, result }) {
  const project = path.resolve(root);
  const generationRoot = at(project, `.agent/cutover/${operationId}`);
  const intent = record(path.join(generationRoot, 'forward-intent.v1.json'), 'VidaForwardUpdateMaintenance/v1');
  if (
    intent.value.operation_id !== operationId ||
    intent.value.operator !== operator ||
    result?.status !== 'released' ||
    result.operation_id !== operationId ||
    result.payload_manifest_sha256 !== intent.value.new_payload_manifest_sha256
  )
    fail('released forward cleanup proof differs');
  const selector = record(at(project, '.agent/active-runtime-selector.v1.json'), 'ActiveRuntimeSelector/v1');
  if (
    selector.value.generation !== operationId ||
    sha(selector.raw) !== result.selector_sha256 ||
    selector.value.plan_sha256 !== sha(intent.raw) ||
    selector.value.payload_manifest_sha256 !== result.payload_manifest_sha256
  )
    fail('released forward selector proof differs');
  const retained = bytes(path.join(generationRoot, 'maintenance-lock.released.v1.json'));
  if (
    !retained.equals(intent.raw) ||
    stat(at(project, `.agent/cutover/${intent.value.parent_generation}/maintenance-lock.v1.json`))
  )
    fail('released forward maintenance proof differs');
  const release = record(path.join(generationRoot, 'maintenance-release.v1.json'), 'VidaForwardUpdateRelease/v1');
  if (
    release.value.operation_id !== operationId ||
    release.value.operator !== operator ||
    release.value.lock_sha256 !== sha(intent.raw) ||
    release.value.status !== 'released_by_explicit_operator_action' ||
    finalizeEvents(path.join(generationRoot, 'forward-finalize-journal.v1.jsonl'), operationId).length !== 3
  )
    fail('released forward terminal proof differs');
}

function finalizeForwardBundleCore(options) {
  const {
    root,
    oldPayloadRoot,
    payloadRoot,
    operationId,
    operator,
    onPhase,
    approvedRepair = null,
    documentationWorkId = null,
    invocationToken,
  } = options;
  const project = path.resolve(root);
  const generationRoot = at(project, `.agent/cutover/${operationId}`);
  const intent = record(path.join(generationRoot, 'forward-intent.v1.json'), 'VidaForwardUpdateMaintenance/v1');
  const plan = intent.value;
  if (plan.operation_id !== operationId || plan.operator !== operator) fail('forward tuple identity differs');
  const parentSelector = record(
    path.join(project, '.agent/active-runtime-selector.v1.json'),
    'ActiveRuntimeSelector/v1',
  );
  const alreadySelected = parentSelector.value.generation === operationId;
  if (!alreadySelected) {
    if (
      parentSelector.value.generation !== plan.parent_generation ||
      sha(parentSelector.raw) !== plan.parent_selector_sha256
    )
      fail('parent selector changed');
    prepareForwardBundle({ ...options, resume: true, invocationToken });
  }
  const parent = alreadySelected
    ? record(path.join(generationRoot, 'parent-selector.v1.json'), 'ActiveRuntimeSelector/v1')
    : parentSelector;
  if (sha(parent.raw) !== plan.parent_selector_sha256) fail('parent selector proof changed');
  const oldManifest = manifest(path.resolve(oldPayloadRoot), plan.old_payload_manifest_sha256);
  const newManifest = manifest(path.resolve(payloadRoot), plan.new_payload_manifest_sha256);
  const currentByPath = new Map(newManifest.value.files.map((entry) => [entry.path, entry]));
  assertProjectOwnedIntegrationRetirement(
    project,
    new Map(oldManifest.value.files.map((entry) => [entry.path, entry])),
    currentByPath,
  );
  for (const entry of currentByPath.values()) {
    if (!entry.path.startsWith('vida-agent/')) continue;
    const installed = bytes(at(project, entry.path));
    if (sha(installed) !== entry.sha256 || installed.length !== entry.size)
      fail(`installed successor bundle drift: ${entry.path}`);
  }
  completeCurrentLifecycleOnlyForward({
    root: project,
    oldPayloadRoot,
    payloadRoot,
    lock: plan,
    approvedRepair,
    documentationWorkId,
  });
  verifyCurrentForwardDocumentation({
    root: project,
    oldPayloadRoot,
    payloadRoot,
    lock: plan,
    approvedRepair,
    documentationWorkId,
  });
  const authorization = record(
    path.join(generationRoot, 'forward-authorization.v1.json'),
    'VidaForwardUpdateAuthorization/v1',
  );
  if (
    authorization.value.plan_sha256 !== sha(intent.raw) ||
    authorization.value.outcome !== 'approved' ||
    authorization.value.operation_id !== operationId ||
    authorization.value.operator !== operator
  )
    fail('forward authorization changed');
  const selectorIntent = {
    schema: 'ActiveRuntimeSelector/v1',
    generation: operationId,
    runtime: 'vida-agent',
    bundle_root: 'vida-agent',
    config_path: 'agent-runtime.config.v1.yaml',
    archive_manifest_sha256: parent.value.archive_manifest_sha256,
    plan_sha256: sha(intent.raw),
    payload_manifest_sha256: plan.new_payload_manifest_sha256,
    state_policy: 'forward_only_preserve_work',
  };
  const decision = {
    schema: 'VidaForwardUpdateDecision/v1',
    operation_id: operationId,
    operator,
    plan_sha256: selectorIntent.plan_sha256,
    authorization_sha256: sha(authorization.raw),
    selector_intent_sha256: sha(json(selectorIntent)),
    outcome: 'approved',
  };
  const selector = { ...selectorIntent, activation_decision_sha256: sha(json(decision)) };
  const commit = {
    schema: 'VidaForwardUpdateSelectorCommit/v1',
    operation_id: operationId,
    plan_sha256: selector.plan_sha256,
    decision_sha256: selector.activation_decision_sha256,
    selector_sha256: sha(json(selector)),
  };
  const newLock = path.join(generationRoot, 'maintenance-lock.v1.json');
  const retainedLock = path.join(generationRoot, 'maintenance-lock.released.v1.json');
  const overlay = at(project, `.agent/cutover/${plan.parent_generation}/maintenance-lock.v1.json`);
  const overlayHeld = Boolean(stat(overlay));
  if (overlayHeld && !bytes(overlay).equals(intent.raw)) fail('parent maintenance overlay drift');
  if (!overlayHeld && !stat(retainedLock)) fail('released maintenance proof missing');
  if (stat(retainedLock) && !bytes(retainedLock).equals(intent.raw)) fail('retained maintenance proof drift');
  if (overlayHeld && !stat(retainedLock)) publish(newLock, intent.raw);
  const ensureProof = (file, content) => {
    if (!overlayHeld && !stat(file)) fail(`released forward proof missing: ${file}`);
    publish(file, content);
  };
  for (const [file, content] of [
    ['parent-selector.v1.json', parent.raw],
    ['parent-payload.manifest.v1.json', oldManifest.raw],
    ['successor-payload.manifest.v1.json', newManifest.raw],
    ['forward-decision.v1.json', json(decision)],
    ['forward-selector-commit.v1.json', json(commit)],
    [
      'cutoff-witness.json',
      json({
        schema: 'VidaNewWorkCutoffWitness/v1',
        generation: operationId,
        selector_sha256: commit.selector_sha256,
        first_admitted_work_attempt: plan.first_admitted_work_attempt,
      }),
    ],
  ])
    ensureProof(path.join(generationRoot, file), content);
  const finalizeJournal = path.join(generationRoot, 'forward-finalize-journal.v1.jsonl');
  if (overlayHeld) {
    journal(finalizeJournal, operationId, 'successor_prepared');
    onPhase?.('successor_prepared');
  }
  const selectorPath = at(project, '.agent/active-runtime-selector.v1.json');
  const selectorNow = bytes(selectorPath);
  if (!overlayHeld && !selectorNow.equals(json(selector))) fail('released selector proof changed');
  if (sha(selectorNow) === plan.parent_selector_sha256) {
    const pending = `${selectorPath}.pending-${randomUUID()}`;
    const fd = openSync(pending, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY, 0o600);
    try {
      writeFileSync(fd, json(selector));
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    if (sha(bytes(selectorPath)) !== plan.parent_selector_sha256) fail('selector CAS lost');
    renameSync(pending, selectorPath);
  } else if (!selectorNow.equals(json(selector))) fail('selector has third-party bytes');
  if (overlayHeld) {
    journal(finalizeJournal, operationId, 'successor_selected');
    onPhase?.('successor_selected');
  }
  verifyCurrentForwardDocumentation({
    root: project,
    oldPayloadRoot,
    payloadRoot,
    lock: plan,
    approvedRepair,
    documentationWorkId,
  });
  const release = {
    schema: 'VidaForwardUpdateRelease/v1',
    operation_id: operationId,
    operator,
    lock_sha256: sha(intent.raw),
    status: 'released_by_explicit_operator_action',
  };
  ensureProof(path.join(generationRoot, 'maintenance-release.v1.json'), json(release));
  if (overlayHeld) {
    if (!stat(retainedLock)) renameSync(newLock, retainedLock);
    else if (stat(newLock)) fail('duplicate maintenance locks');
    const terminalBefore = finalizeEvents(finalizeJournal, operationId).length === 3;
    journal(finalizeJournal, operationId, 'successor_released');
    if (!terminalBefore) onPhase?.('successor_released');
    if (!bytes(overlay).equals(intent.raw)) fail('parent maintenance overlay drift');
    unlinkSync(overlay); // Last forward-state mutation; SQLite cleanup is separately classified by terminal proof.
  } else if (
    finalizeEvents(finalizeJournal, operationId).length !== 3 ||
    !bytes(retainedLock).equals(intent.raw) ||
    !bytes(selectorPath).equals(json(selector))
  )
    fail('released forward terminal proof changed');
  return {
    schema: 'VidaForwardUpdateResult/v1',
    status: 'released',
    operation_id: operationId,
    selector_sha256: commit.selector_sha256,
    payload_manifest_sha256: plan.new_payload_manifest_sha256,
  };
}
