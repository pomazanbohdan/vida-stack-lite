import path from 'node:path';
import { verifyForwardReviewSet } from './forward-review-proof.mjs';
import {
  parseDocumentationPolicyTransitionEnvelope,
  parseForwardClearCheckpoint,
  parseForwardDocumentationEvent,
  parseForwardPolicyIdentity,
  verifySelectedForwardPolicyProof,
  verifyCommittedParentPolicyProof,
} from '../dist/src/documentation/transition-proof.js';
import { createHash, randomUUID } from 'node:crypto';
import {
  constants,
  closeSync,
  fstatSync,
  fsyncSync,
  lstatSync,
  openSync,
  readFileSync,
  readSync,
  readdirSync,
  realpathSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const bundleRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const isBunRuntime = typeof Bun !== 'undefined';
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const controllerJson = (value) => `${JSON.stringify(value, null, 2)}\n`;

function regularFile(file) {
  let stat;
  try {
    stat = lstatSync(file);
  } catch {
    fail('GAP-VIDA-RUN-SELECTOR-001', 'Cutover authority is missing.');
  }
  if (!stat.isFile() || stat.isSymbolicLink())
    fail('GAP-VIDA-RUN-SELECTOR-001', 'Cutover authority is not a regular file.');
  return readFileSync(file);
}

function checkedDirectory(directory) {
  let stat;
  try {
    stat = lstatSync(directory);
  } catch {
    fail('GAP-VIDA-RUN-SELECTOR-001', 'Cutover authority directory is missing.');
  }
  if (!stat.isDirectory() || stat.isSymbolicLink())
    fail('GAP-VIDA-RUN-SELECTOR-001', 'Cutover authority directory is unsafe.');
}

function pathExists(file) {
  try {
    lstatSync(file);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

function readControllerRecord(file, schema) {
  const bytes = regularFile(file);
  let value;
  try {
    value = JSON.parse(bytes.toString('utf8'));
  } catch {
    fail('GAP-VIDA-RUN-SELECTOR-001', 'Cutover authority is invalid.');
  }
  if (value?.schema !== schema || !bytes.equals(Buffer.from(controllerJson(value))))
    fail('GAP-VIDA-RUN-SELECTOR-001', 'Cutover authority has an invalid shape or encoding.');
  return value;
}

function exactKeys(value, keys) {
  return (
    value && !Array.isArray(value) && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort())
  );
}

function readBoundManifest(file, expectedSha) {
  const raw = regularFile(file);
  if (digest(raw) !== expectedSha) fail('GAP-VIDA-RUN-SELECTOR-001', 'Repair payload manifest drift.');
  let manifest;
  try {
    manifest = JSON.parse(raw.toString('utf8'));
  } catch {
    fail('GAP-VIDA-RUN-SELECTOR-001', 'Repair payload manifest is invalid.');
  }
  if (
    manifest?.schema !== 'VidaAgentPreparedPayload/v1' ||
    !Array.isArray(manifest.files) ||
    !Array.isArray(manifest.unresolved_integration_paths) ||
    manifest.unresolved_integration_paths.length
  )
    fail('GAP-VIDA-RUN-SELECTOR-001', 'Repair payload manifest is invalid.');
  const files = new Map();
  for (const entry of manifest.files) {
    const direct = exactKeys(entry, ['path', 'sha256', 'size']);
    const sameByteSource = exactKeys(entry, ['path', 'sha256', 'size', 'source_sha256']);
    const mappedSource = exactKeys(entry, ['path', 'sha256', 'size', 'source_path', 'source_sha256']);
    if (!direct && !sameByteSource && !mappedSource)
      fail('GAP-VIDA-RUN-SELECTOR-001', 'Repair payload entry is invalid.');
    if (
      typeof entry.path !== 'string' ||
      !entry.path ||
      entry.path.includes('\\') ||
      entry.path.startsWith('/') ||
      entry.path.split('/').some((part) => !part || part === '.' || part === '..' || part.includes(':')) ||
      files.has(entry.path) ||
      !/^[a-f0-9]{64}$/.test(entry.sha256) ||
      !Number.isSafeInteger(entry.size) ||
      entry.size < 0 ||
      ((sameByteSource || mappedSource) && !/^[a-f0-9]{64}$/.test(entry.source_sha256)) ||
      (sameByteSource && entry.source_sha256 !== entry.sha256) ||
      (mappedSource &&
        (typeof entry.source_path !== 'string' ||
          !entry.source_path ||
          entry.source_path.includes('\\') ||
          entry.source_path.startsWith('/') ||
          entry.source_path.split('/').some((part) => !part || part === '.' || part === '..' || part.includes(':'))))
    )
      fail('GAP-VIDA-RUN-SELECTOR-001', 'Repair payload entry is invalid.');
    files.set(entry.path, entry);
  }
  return { manifest, files };
}
function installedBundleInventory(projectRoot, expected) {
  const root = path.join(projectRoot, 'vida-agent');
  checkedDirectory(root);
  const observed = new Set();
  function walk(directory, prefix) {
    for (const name of readdirSync(directory)) {
      if (!prefix && name === 'node_modules') continue;
      const relative = prefix ? `${prefix}/${name}` : name;
      const absolute = path.join(directory, name);
      const info = lstatSync(absolute);
      if (info.isSymbolicLink()) fail('GAP-VIDA-RUN-SELECTOR-001', 'Installed bundle symlink is unsafe.');
      if (info.isDirectory()) walk(absolute, relative);
      else if (info.isFile()) observed.add(`vida-agent/${relative}`);
      else fail('GAP-VIDA-RUN-SELECTOR-001', 'Installed bundle node is unsafe.');
    }
  }
  walk(root, '');
  if (observed.size !== expected.size || [...observed].some((item) => !expected.has(item)))
    fail('GAP-VIDA-RUN-SELECTOR-001', 'Installed bundle inventory differs from forward manifest.');
}

export function repairAuthority(projectRoot, selector, selectorSha, generationRoot, skipInstalledBundle = false) {
  const hash = /^[a-f0-9]{64}$/;
  const plan = readControllerRecord(
    path.join(generationRoot, 'repair-plan.v1.json'),
    'VidaActiveLauncherRepairPlan/v1',
  );
  const authorization = readControllerRecord(
    path.join(generationRoot, 'repair-authorization.v1.json'),
    'VidaActiveLauncherRepairAuthorization/v1',
  );
  const decision = readControllerRecord(
    path.join(generationRoot, 'repair-decision.v1.json'),
    'VidaActiveLauncherRepairDecision/v1',
  );
  const commit = readControllerRecord(
    path.join(generationRoot, 'repair-selector-commit.v1.json'),
    'VidaActiveLauncherRepairSelectorCommit/v1',
  );
  if (
    !exactKeys(plan, [
      'schema',
      'repair_id',
      'operator',
      'parent_cutover_id',
      'parent_selector_sha256',
      'parent_payload_manifest_sha256',
      'parent_launcher_sha256',
      'successor_payload_manifest_sha256',
      'successor_launcher_sha256',
      'archive_manifest_sha256',
      'authorization_sha256',
    ]) ||
    !exactKeys(authorization, [
      'schema',
      'repair_id',
      'operator',
      'outcome',
      'pointer',
      'old_generation',
      'old_selector_sha256',
      'old_payload_manifest_sha256',
      'old_launcher_sha256',
      'new_payload_manifest_sha256',
      'new_launcher_sha256',
      'evidence',
    ]) ||
    !exactKeys(decision, [
      'schema',
      'repair_id',
      'operator',
      'plan_sha256',
      'authorization_sha256',
      'selector_intent_sha256',
      'outcome',
    ]) ||
    !exactKeys(commit, ['schema', 'repair_id', 'plan_sha256', 'decision_sha256', 'selector_sha256']) ||
    plan.repair_id !== selector.generation ||
    !/^[a-z0-9][a-z0-9._-]{0,79}$/.test(plan.parent_cutover_id) ||
    !/^[a-z0-9][a-z0-9._-]{0,79}$/.test(plan.operator) ||
    decision.repair_id !== selector.generation ||
    commit.repair_id !== selector.generation ||
    authorization.repair_id !== selector.generation ||
    plan.operator !== authorization.operator ||
    plan.operator !== decision.operator ||
    !hash.test(plan.parent_selector_sha256) ||
    !hash.test(plan.parent_payload_manifest_sha256) ||
    !hash.test(plan.parent_launcher_sha256) ||
    !hash.test(plan.successor_launcher_sha256) ||
    !hash.test(plan.authorization_sha256) ||
    selector.plan_sha256 !== digest(Buffer.from(controllerJson(plan))) ||
    plan.archive_manifest_sha256 !== selector.archive_manifest_sha256 ||
    plan.successor_payload_manifest_sha256 !== selector.payload_manifest_sha256 ||
    plan.authorization_sha256 !== digest(Buffer.from(controllerJson(authorization))) ||
    authorization.outcome !== 'approved' ||
    decision.outcome !== 'approved' ||
    !authorization.pointer?.trim() ||
    authorization.old_generation !== plan.parent_cutover_id ||
    authorization.old_selector_sha256 !== plan.parent_selector_sha256 ||
    authorization.old_payload_manifest_sha256 !== plan.parent_payload_manifest_sha256 ||
    authorization.old_launcher_sha256 !== plan.parent_launcher_sha256 ||
    authorization.new_payload_manifest_sha256 !== plan.successor_payload_manifest_sha256 ||
    authorization.new_launcher_sha256 !== plan.successor_launcher_sha256 ||
    decision.plan_sha256 !== selector.plan_sha256 ||
    decision.authorization_sha256 !== plan.authorization_sha256 ||
    decision.selector_intent_sha256 !==
      digest(Buffer.from(controllerJson((({ activation_decision_sha256: ignored, ...intent }) => intent)(selector)))) ||
    selector.activation_decision_sha256 !== digest(Buffer.from(controllerJson(decision))) ||
    commit.plan_sha256 !== selector.plan_sha256 ||
    commit.decision_sha256 !== selector.activation_decision_sha256 ||
    commit.selector_sha256 !== selectorSha
  )
    fail('GAP-VIDA-RUN-SELECTOR-001', 'Repair authority is invalid.');
  if (
    !Array.isArray(authorization.evidence) ||
    authorization.evidence.length !== 3 ||
    authorization.evidence
      .map((entry) => entry.kind)
      .sort()
      .join(',') !== 'assurance,correctness,security'
  )
    fail('GAP-VIDA-RUN-SELECTOR-001', 'Repair review bindings are invalid.');
  const evidencePaths = new Set();
  for (const entry of authorization.evidence) {
    if (
      !exactKeys(entry, ['kind', 'path', 'sha256', 'status']) ||
      entry.status !== 'passed' ||
      !hash.test(entry.sha256) ||
      typeof entry.path !== 'string' ||
      !entry.path.startsWith(`.agent/cutover/${selector.generation}/`) ||
      entry.path.includes('\\') ||
      entry.path.split('/').some((part) => !part || part === '.' || part === '..' || part.includes(':')) ||
      evidencePaths.has(entry.path) ||
      digest(regularFile(path.join(projectRoot, ...entry.path.split('/')))) !== entry.sha256
    )
      fail('GAP-VIDA-RUN-SELECTOR-001', 'Repair review bindings are invalid.');
    evidencePaths.add(entry.path);
  }
  const parent = readControllerRecord(path.join(generationRoot, 'parent-selector.v1.json'), 'ActiveRuntimeSelector/v1');
  const parentRoot = path.join(projectRoot, '.agent', 'cutover', plan.parent_cutover_id);
  checkedDirectory(parentRoot);
  const parentCommit = readControllerRecord(
    path.join(parentRoot, 'selector-commit.json'),
    'VidaPreparedSelectorCommit/v1',
  );
  const parentDecision = readControllerRecord(
    path.join(parentRoot, 'activation-decision.v1.json'),
    'VidaCutoverActivationDecision/v1',
  );
  const parentJournal = readControllerRecord(
    path.join(parentRoot, 'prepared-install.json'),
    'VidaPreparedInstallJournal/v1',
  );
  const parentReady = readControllerRecord(path.join(parentRoot, 'install-ready.json'), 'VidaPreparedInstallReady/v1');
  const parentLock = readControllerRecord(
    path.join(parentRoot, 'maintenance-lock.released.v1.json'),
    'VidaCutoverMaintenanceLock/v1',
  );
  const parentRelease = readControllerRecord(
    path.join(parentRoot, 'maintenance-release.v1.json'),
    'VidaCutoverMaintenanceRelease/v1',
  );
  const parentCutoff = readControllerRecord(
    path.join(parentRoot, 'cutoff-witness.json'),
    'VidaNewWorkCutoffWitness/v1',
  );
  const parentSha = digest(Buffer.from(controllerJson(parent)));
  const { activation_decision_sha256: _parentDecisionHash, ...parentIntent } = parent;
  const parentEvidenceKinds = ['parity', 'security', 'assurance', 'rollback', 'dev', 'staged_runtime'];
  if (
    !exactKeys(parent, [
      'schema',
      'generation',
      'runtime',
      'bundle_root',
      'config_path',
      'archive_manifest_sha256',
      'plan_sha256',
      'payload_manifest_sha256',
      'state_policy',
      'activation_decision_sha256',
    ]) ||
    !exactKeys(parentCommit, [
      'schema',
      'cutover_id',
      'plan_sha256',
      'activation_decision_sha256',
      'selector_sha256',
    ]) ||
    !exactKeys(parentDecision, [
      'schema',
      'actor',
      'cutover_id',
      'evidence',
      'outcome',
      'payload_manifest_sha256',
      'plan_sha256',
      'pointer',
      'selector_intent_sha256',
    ]) ||
    !exactKeys(parentJournal, [
      'schema',
      'cutover_id',
      'plan_sha256',
      'archive_manifest_sha256',
      'payload_manifest_sha256',
      'archive_scope',
      'state_policy',
      'status',
    ]) ||
    !exactKeys(parentReady, ['schema', 'cutover_id', 'plan_sha256', 'archive_scope', 'state_policy', 'status']) ||
    !exactKeys(parentLock, [
      'schema',
      'cutover_id',
      'operator',
      'attestation',
      'archive_manifest_sha256',
      'plan_sha256',
      'payload_manifest_sha256',
      'expected_file_count',
      'archive_manifest',
      'plan',
      'state_policy',
      'activation_decision_path',
      'activation_decision_sha256',
    ]) ||
    !exactKeys(parentRelease, ['schema', 'cutover_id', 'operator', 'lock_sha256', 'status']) ||
    !exactKeys(parentCutoff, ['schema', 'generation', 'selector_sha256', 'first_admitted_work_attempt']) ||
    !exactKeys(parentDecision.evidence, parentEvidenceKinds) ||
    parentSha !== plan.parent_selector_sha256 ||
    parent.generation !== plan.parent_cutover_id ||
    parent.runtime !== 'vida-agent' ||
    parent.bundle_root !== 'vida-agent' ||
    parent.config_path !== 'agent-runtime.config.v1.yaml' ||
    parent.archive_manifest_sha256 !== selector.archive_manifest_sha256 ||
    parent.payload_manifest_sha256 !== plan.parent_payload_manifest_sha256 ||
    parentCommit.cutover_id !== parent.generation ||
    parentCommit.plan_sha256 !== parent.plan_sha256 ||
    parentCommit.selector_sha256 !== parentSha ||
    parentCommit.activation_decision_sha256 !== parent.activation_decision_sha256 ||
    digest(Buffer.from(controllerJson(parentDecision))) !== parent.activation_decision_sha256 ||
    parentDecision.outcome !== 'approved' ||
    parentDecision.cutover_id !== parent.generation ||
    parentDecision.plan_sha256 !== parent.plan_sha256 ||
    parentDecision.payload_manifest_sha256 !== parent.payload_manifest_sha256 ||
    parentDecision.selector_intent_sha256 !== digest(Buffer.from(controllerJson(parentIntent))) ||
    parentJournal.cutover_id !== parent.generation ||
    parentJournal.plan_sha256 !== parent.plan_sha256 ||
    parentJournal.payload_manifest_sha256 !== parent.payload_manifest_sha256 ||
    parentJournal.archive_manifest_sha256 !== parent.archive_manifest_sha256 ||
    parentJournal.state_policy !== parent.state_policy ||
    parentJournal.status !== 'installing' ||
    parentReady.cutover_id !== parent.generation ||
    parentReady.plan_sha256 !== parent.plan_sha256 ||
    parentReady.state_policy !== parent.state_policy ||
    parentReady.status !== 'ready_for_selector' ||
    parentLock.cutover_id !== parent.generation ||
    parentLock.plan_sha256 !== parent.plan_sha256 ||
    parentLock.archive_manifest_sha256 !== parent.archive_manifest_sha256 ||
    parentLock.payload_manifest_sha256 !== parent.payload_manifest_sha256 ||
    parentLock.attestation !== 'old_runtime_quiesced' ||
    parentLock.state_policy !== parent.state_policy ||
    parentLock.archive_manifest?.manifest_sha256 !== parent.archive_manifest_sha256 ||
    parentLock.plan?.schema !== 'VidaPreparedInstallPlan/v1' ||
    parentLock.plan?.plan_sha256 !== parent.plan_sha256 ||
    parentLock.plan?.payload_manifest_sha256 !== parent.payload_manifest_sha256 ||
    parentLock.plan?.archive_manifest_sha256 !== parent.archive_manifest_sha256 ||
    parentLock.activation_decision_path !== `.agent/cutover/${parent.generation}/activation-decision.v1.json` ||
    parentLock.activation_decision_sha256 !== parent.activation_decision_sha256 ||
    parentRelease.cutover_id !== parent.generation ||
    parentRelease.operator !== parentLock.operator ||
    parentRelease.lock_sha256 !== digest(Buffer.from(controllerJson(parentLock))) ||
    parentRelease.status !== 'released_by_explicit_operator_action' ||
    parentCutoff.generation !== parent.generation ||
    parentCutoff.selector_sha256 !== parentSha ||
    parentCutoff.first_admitted_work_attempt !== null ||
    pathExists(path.join(parentRoot, 'maintenance-lock.v1.json')) ||
    pathExists(path.join(parentRoot, 'cutoff-witness.lock'))
  )
    fail('GAP-VIDA-RUN-SELECTOR-001', 'Repair parent authority is invalid.');
  for (const kind of parentEvidenceKinds) {
    const item = parentDecision.evidence[kind];
    if (
      !exactKeys(item, ['actor', 'path', 'pointer', 'sha256', 'status']) ||
      item.status !== 'passed' ||
      !hash.test(item.sha256) ||
      !item.actor ||
      !item.pointer ||
      typeof item.path !== 'string' ||
      !item.path.startsWith(`.agent/cutover/${parent.generation}/`) ||
      item.path.includes('\\') ||
      item.path.split('/').some((part) => !part || part === '.' || part === '..' || part.includes(':')) ||
      digest(regularFile(path.join(projectRoot, ...item.path.split('/')))) !== item.sha256
    )
      fail('GAP-VIDA-RUN-SELECTOR-001', 'Repair parent evidence is invalid.');
  }
  const parentManifest = readBoundManifest(
    path.join(generationRoot, 'parent-payload.manifest.v1.json'),
    plan.parent_payload_manifest_sha256,
  );
  const successorManifest = readBoundManifest(
    path.join(generationRoot, 'successor-payload.manifest.v1.json'),
    plan.successor_payload_manifest_sha256,
  );
  if (
    parentManifest.files.size !== successorManifest.files.size ||
    [...successorManifest.files].some(
      ([relative, entry]) =>
        !parentManifest.files.has(relative) ||
        (relative !== 'vida-agent/bin/run.mjs' && parentManifest.files.get(relative).sha256 !== entry.sha256),
    ) ||
    parentManifest.files.get('vida-agent/bin/run.mjs')?.sha256 !== plan.parent_launcher_sha256 ||
    successorManifest.files.get('vida-agent/bin/run.mjs')?.sha256 !== plan.successor_launcher_sha256 ||
    JSON.stringify({ ...parentManifest.manifest, files: [] }) !==
      JSON.stringify({ ...successorManifest.manifest, files: [] })
  )
    fail('GAP-VIDA-RUN-SELECTOR-001', 'Repair payload delta is invalid.');
  for (const [relative, entry] of successorManifest.files) {
    if (skipInstalledBundle) continue;
    // Root integration outputs can change through governed work after the repair;
    // the installed bundle remains immutable admission authority.
    if (!relative.startsWith('vida-agent/')) continue;
    const parts = relative.split('/');
    let at = projectRoot;
    for (const part of parts.slice(0, -1)) {
      at = path.join(at, part);
      checkedDirectory(at);
    }
    const actual = regularFile(path.join(at, parts.at(-1)));
    if (actual.length !== entry.size || digest(actual) !== entry.sha256)
      fail('GAP-VIDA-RUN-SELECTOR-001', 'Installed repair payload drift.');
  }
  const lockPath = path.join(generationRoot, 'maintenance-lock.v1.json');
  if (pathExists(lockPath)) fail('GAP-VIDA-RUN-SELECTOR-001', 'Launcher repair maintenance is still active.');
  const lock = readControllerRecord(
    path.join(generationRoot, 'maintenance-lock.released.v1.json'),
    'VidaActiveLauncherRepairMaintenance/v1',
  );
  const release = readControllerRecord(
    path.join(generationRoot, 'maintenance-release.v1.json'),
    'VidaActiveLauncherRepairRelease/v1',
  );
  const cutoff = readControllerRecord(path.join(generationRoot, 'cutoff-witness.json'), 'VidaNewWorkCutoffWitness/v1');
  if (
    !exactKeys(lock, ['schema', 'repair_id', 'operator', 'plan_sha256', 'decision_sha256', 'selector_sha256']) ||
    !exactKeys(release, ['schema', 'repair_id', 'operator', 'lock_sha256', 'status']) ||
    !exactKeys(cutoff, ['schema', 'generation', 'selector_sha256', 'first_admitted_work_attempt']) ||
    cutoff.generation !== selector.generation ||
    cutoff.selector_sha256 !== selectorSha ||
    !(
      cutoff.first_admitted_work_attempt === null ||
      (typeof cutoff.first_admitted_work_attempt === 'string' && cutoff.first_admitted_work_attempt.length > 0)
    ) ||
    pathExists(path.join(generationRoot, 'cutoff-witness.lock')) ||
    lock.repair_id !== selector.generation ||
    lock.operator !== plan.operator ||
    lock.plan_sha256 !== selector.plan_sha256 ||
    lock.decision_sha256 !== selector.activation_decision_sha256 ||
    lock.selector_sha256 !== selectorSha ||
    release.repair_id !== selector.generation ||
    release.operator !== lock.operator ||
    release.status !== 'released_by_explicit_operator_action' ||
    release.lock_sha256 !== digest(Buffer.from(controllerJson(lock)))
  )
    fail('GAP-VIDA-RUN-SELECTOR-001', 'Repair release proof is invalid.');
}

function readForwardDocumentationEvidence(projectRoot, relative) {
  if (
    typeof relative !== 'string' ||
    relative.includes('\\') ||
    path.isAbsolute(relative) ||
    relative.split('/').some((part) => !part || part === '.' || part === '..' || part.includes(':'))
  )
    fail('GAP-VIDA-RUN-SELECTOR-001', 'Forward documentation evidence path invalid.');
  let at = projectRoot;
  for (const part of relative.split('/').slice(0, -1)) {
    at = path.join(at, part);
    checkedDirectory(at);
  }
  const bytes = regularFile(path.join(at, relative.split('/').at(-1)));
  if (bytes.length > 16 * 1024 * 1024)
    fail('GAP-VIDA-RUN-SELECTOR-001', 'Forward documentation evidence exceeds bound.');
  return bytes;
}

function forwardPolicyAuthority(
  projectRoot,
  generationRoot,
  plan,
  authorization,
  relative,
  historical,
  oldManifest,
  newManifest,
) {
  const read = (file) => readForwardDocumentationEvidence(projectRoot, file);
  const generationRelative = path.relative(projectRoot, generationRoot).split(path.sep).join('/');
  try {
    if (!historical) {
      const receiptPath = generationRelative + '/documentation-forward.v1.json';
      const receipt = readControllerRecord(path.join(projectRoot, receiptPath), 'VidaForwardLifecycleClearBinding/v1');
      const baselineBytes = read(receipt.baseline_path),
        baseline = parseForwardClearCheckpoint(baselineBytes);
      if (
        !/^[a-z0-9][a-z0-9._-]{0,127}$/.test(baseline.work_id) ||
        !receipt.baseline_path.startsWith('.agent/work/' + baseline.work_id + '/documentation-baseline-')
      )
        throw Error('leaf baseline work path differs');
      const operationBytes = read('.agent/work/' + baseline.work_id + '/documentation-policy-transition.v1.json');
      const operation = parseDocumentationPolicyTransitionEnvelope(operationBytes);
      if (!operation.closeout?.path?.startsWith('.agent/work/' + baseline.work_id + '/documentation-closeout-'))
        throw Error('leaf closeout work path differs');
      const closeoutBytes = read(operation.closeout.path);
      const journal = read(generationRelative + '/forward-journal.v1.jsonl')
        .toString('utf8')
        .trim()
        .split('\n')
        .map(JSON.parse);
      const proof = journal.filter((event) => event.phase === 'documentation_closeout_verified');
      if (
        proof.length !== 1 ||
        proof[0].schema !== 'VidaForwardUpdateEvent/v1' ||
        proof[0].operation_id !== plan.operation_id ||
        proof[0].lock_sha256 !== digest(Buffer.from(controllerJson(plan))) ||
        proof[0].receipt_path !== receiptPath ||
        proof[0].closeout_sha256 !== digest(closeoutBytes) ||
        receipt.operation_id !== plan.operation_id ||
        receipt.baseline_digest !== baseline.digest ||
        receipt.policy_sha256 !== operation.plan.source_admission?.target_sha256 ||
        receipt.parent_manifest_sha256 !== plan.old_payload_manifest_sha256 ||
        receipt.successor_manifest_sha256 !== plan.new_payload_manifest_sha256
      )
        throw Error('leaf forward journal/receipt differs');
      const identity = verifySelectedForwardPolicyProof({
        operationBytes,
        baselineBytes,
        closeoutBytes,
        changelogBytes: read(operation.plan.changelog_path),
        scopeBytes: read('.agent/work/' + baseline.work_id + '/scope.json'),
        priorFiles: [...oldManifest.files].map(([path, entry]) => ({ path, ...entry })),
        successorFiles: [...newManifest.files].map(([path, entry]) => ({ path, ...entry })),
        operationId: plan.operation_id,
        parentSelectorDigest: plan.parent_selector_sha256,
        parentManifestDigest: plan.old_payload_manifest_sha256,
        successorManifestDigest: plan.new_payload_manifest_sha256,
        intentDigest: digest(Buffer.from(controllerJson(plan))),
        authorizationDigest: digest(Buffer.from(controllerJson(authorization))),
        changes: plan.changed,
      });
      if (identity !== relative) throw Error('leaf canonical identity differs');
      return;
    }
    // Only recursive committed-parent traversal reaches this observational path.
    // Current identity locates retained events; old rights/configuration are not reinterpreted.
    const identity = parseForwardPolicyIdentity(read(relative), relative);
    const lines = read(identity.changelog_path).toString('utf8').trim().split('\n');
    const parsed = lines.map((line) => ({
      bytes: Buffer.from(line + '\n'),
      event: parseForwardDocumentationEvent(Buffer.from(line)),
    }));
    const change = plan.changed.find((entry) => entry.path === relative);
    const policies = parsed.filter(
      ({ event }) =>
        event.operation === 'finalize' &&
        event.path_before === relative &&
        event.path_after === relative &&
        event.before_sha256 === change.old_sha256 &&
        event.after_sha256 === change.new_sha256,
    );
    if (policies.length !== 1) throw Error('committed policy event missing or ambiguous');
    const policy = policies[0],
      work = policy.event.work_id;
    if (!/^[a-z0-9][a-z0-9._-]{0,127}$/.test(work)) throw Error('committed event work invalid');
    const workRoot = '.agent/work/' + work;
    checkedDirectory(path.join(projectRoot, '.agent'));
    checkedDirectory(path.join(projectRoot, '.agent/work'));
    checkedDirectory(path.join(projectRoot, workRoot));
    const names = readdirSync(path.join(projectRoot, workRoot)).filter((file) =>
      /^documentation-(baseline|closeout)-[0-9]{4}\.v1\.json$/.test(file),
    );
    if (names.length > 256) throw Error('committed checkpoint inventory exceeds bound');
    const checkpoints = names.flatMap((name) => {
      try {
        const bytes = read(workRoot + '/' + name);
        return [{ path: workRoot + '/' + name, bytes, record: parseForwardClearCheckpoint(bytes) }];
      } catch {
        return [];
      }
    });
    const documents = parsed.filter(
      ({ event }) =>
        event.work_id === work &&
        event.source_revision === policy.event.source_revision &&
        event.path_after !== relative &&
        plan.changed.some(
          (entry) =>
            entry.path === event.path_after &&
            entry.old_sha256 === event.before_sha256 &&
            entry.new_sha256 === event.after_sha256,
        ),
    );
    let matches = 0;
    for (const baseline of checkpoints.filter((entry) => entry.record.phase === 'baseline'))
      for (const closeout of checkpoints.filter(
        (entry) => entry.record.phase === 'closeout' && entry.record.baseline_digest === baseline.record.digest,
      ))
        for (const document of documents) {
          try {
            if (
              verifyCommittedParentPolicyProof({
                baselineBytes: baseline.bytes,
                closeoutBytes: closeout.bytes,
                baselinePath: baseline.path,
                policyEventBytes: policy.bytes,
                documentEventBytes: document.bytes,
                changes: plan.changed,
              }) === relative
            )
              matches += 1;
          } catch {
            /* An unrelated checkpoint is not a substitute for the exact committed byte pair. */
          }
        }
    if (matches !== 1) throw Error('committed policy event/CLEAR closure missing or ambiguous');
  } catch (error) {
    fail('GAP-VIDA-RUN-SELECTOR-001', 'Forward policy proof invalid: ' + error.message);
  }
}

export function forwardUpdateAuthority(
  projectRoot,
  selector,
  selectorSha,
  generationRoot,
  skipInstalledBundle = false,
  seen = new Set(),
) {
  if (seen.has(selector.generation) || seen.size >= 8)
    fail('GAP-VIDA-RUN-SELECTOR-001', 'Forward parent chain cycles or exceeds bound.');
  seen.add(selector.generation);
  const hash = /^[a-f0-9]{64}$/;
  const plan = readControllerRecord(
    path.join(generationRoot, 'forward-intent.v1.json'),
    'VidaForwardUpdateMaintenance/v1',
  );
  const authorization = readControllerRecord(
    path.join(generationRoot, 'forward-authorization.v1.json'),
    'VidaForwardUpdateAuthorization/v1',
  );
  const decision = readControllerRecord(
    path.join(generationRoot, 'forward-decision.v1.json'),
    'VidaForwardUpdateDecision/v1',
  );
  const commit = readControllerRecord(
    path.join(generationRoot, 'forward-selector-commit.v1.json'),
    'VidaForwardUpdateSelectorCommit/v1',
  );
  const parent = readControllerRecord(path.join(generationRoot, 'parent-selector.v1.json'), 'ActiveRuntimeSelector/v1');
  const lock = readControllerRecord(
    path.join(generationRoot, 'maintenance-lock.released.v1.json'),
    'VidaForwardUpdateMaintenance/v1',
  );
  const release = readControllerRecord(
    path.join(generationRoot, 'maintenance-release.v1.json'),
    'VidaForwardUpdateRelease/v1',
  );
  const cutoff = readControllerRecord(path.join(generationRoot, 'cutoff-witness.json'), 'VidaNewWorkCutoffWitness/v1');
  if (
    !exactKeys(plan, [
      'schema',
      'operation_id',
      'operator',
      'parent_generation',
      'parent_selector_sha256',
      'parent_cutoff_sha256',
      'first_admitted_work_attempt',
      'old_payload_manifest_sha256',
      'new_payload_manifest_sha256',
      'changed',
      'preserved_mutable_outputs',
    ]) ||
    !exactKeys(authorization, [
      'schema',
      'operation_id',
      'operator',
      'outcome',
      'pointer',
      'plan_sha256',
      'evidence',
    ]) ||
    !exactKeys(decision, [
      'schema',
      'operation_id',
      'operator',
      'plan_sha256',
      'authorization_sha256',
      'selector_intent_sha256',
      'outcome',
    ]) ||
    !exactKeys(commit, ['schema', 'operation_id', 'plan_sha256', 'decision_sha256', 'selector_sha256']) ||
    !exactKeys(release, ['schema', 'operation_id', 'operator', 'lock_sha256', 'status']) ||
    !exactKeys(cutoff, ['schema', 'generation', 'selector_sha256', 'first_admitted_work_attempt']) ||
    !/^[a-z0-9][a-z0-9._-]{0,79}$/.test(plan.operation_id) ||
    !/^[a-z0-9][a-z0-9._-]{0,79}$/.test(plan.operator) ||
    plan.operation_id !== selector.generation ||
    plan.operation_id === plan.parent_generation ||
    authorization.operation_id !== plan.operation_id ||
    authorization.operator !== plan.operator ||
    authorization.outcome !== 'approved' ||
    !authorization.pointer?.trim() ||
    authorization.plan_sha256 !== selector.plan_sha256 ||
    decision.operation_id !== plan.operation_id ||
    decision.operator !== plan.operator ||
    decision.plan_sha256 !== selector.plan_sha256 ||
    decision.outcome !== 'approved' ||
    decision.authorization_sha256 !== digest(Buffer.from(controllerJson(authorization))) ||
    commit.operation_id !== plan.operation_id ||
    commit.plan_sha256 !== selector.plan_sha256 ||
    commit.decision_sha256 !== selector.activation_decision_sha256 ||
    commit.selector_sha256 !== selectorSha ||
    release.operation_id !== plan.operation_id ||
    release.operator !== plan.operator ||
    release.lock_sha256 !== digest(Buffer.from(controllerJson(lock))) ||
    release.status !== 'released_by_explicit_operator_action' ||
    digest(Buffer.from(controllerJson(plan))) !== selector.plan_sha256 ||
    digest(Buffer.from(controllerJson(decision))) !== selector.activation_decision_sha256 ||
    decision.selector_intent_sha256 !==
      digest(Buffer.from(controllerJson((({ activation_decision_sha256: ignored, ...intent }) => intent)(selector)))) ||
    !hash.test(plan.parent_selector_sha256) ||
    !hash.test(plan.parent_cutoff_sha256) ||
    !hash.test(plan.old_payload_manifest_sha256) ||
    !hash.test(plan.new_payload_manifest_sha256) ||
    selector.payload_manifest_sha256 !== plan.new_payload_manifest_sha256 ||
    selector.archive_manifest_sha256 !== parent.archive_manifest_sha256 ||
    selector.state_policy !== 'forward_only_preserve_work' ||
    lock.operation_id !== plan.operation_id ||
    !Buffer.from(controllerJson(lock)).equals(Buffer.from(controllerJson(plan))) ||
    pathExists(path.join(generationRoot, 'maintenance-lock.v1.json')) ||
    cutoff.generation !== selector.generation ||
    cutoff.selector_sha256 !== selectorSha ||
    cutoff.first_admitted_work_attempt !== plan.first_admitted_work_attempt
  )
    fail('GAP-VIDA-RUN-SELECTOR-001', 'Forward update proof is invalid.');
  if (
    !Array.isArray(authorization.evidence) ||
    authorization.evidence.length !== 3 ||
    authorization.evidence
      .map((item) => item.kind)
      .sort()
      .join(',') !== 'assurance,correctness,security'
  )
    fail('GAP-VIDA-RUN-SELECTOR-001', 'Forward review bindings are invalid.');
  try {
    verifyForwardReviewSet(projectRoot, selector.generation, authorization.plan_sha256, authorization.evidence);
  } catch {
    fail('GAP-VIDA-RUN-SELECTOR-001', 'Forward review evidence is invalid.');
  }
  const parentRoot = path.join(projectRoot, '.agent', 'cutover', plan.parent_generation);
  checkedDirectory(parentRoot);
  const parentCutoff = readControllerRecord(
    path.join(parentRoot, 'cutoff-witness.json'),
    'VidaNewWorkCutoffWitness/v1',
  );
  if (
    parent.generation !== plan.parent_generation ||
    digest(Buffer.from(controllerJson(parent))) !== plan.parent_selector_sha256 ||
    parent.payload_manifest_sha256 !== plan.old_payload_manifest_sha256 ||
    digest(regularFile(path.join(parentRoot, 'cutoff-witness.json'))) !== plan.parent_cutoff_sha256 ||
    parentCutoff.first_admitted_work_attempt !== plan.first_admitted_work_attempt
  )
    fail('GAP-VIDA-RUN-SELECTOR-001', 'Forward parent selector or cutoff drift.');
  const parentForward = pathExists(path.join(parentRoot, 'forward-intent.v1.json'));
  const parentRepair = pathExists(path.join(parentRoot, 'repair-plan.v1.json'));
  if (parentForward === parentRepair) fail('GAP-VIDA-RUN-SELECTOR-001', 'Forward parent authority type is ambiguous.');
  if (parentForward) forwardUpdateAuthority(projectRoot, parent, plan.parent_selector_sha256, parentRoot, true, seen);
  else repairAuthority(projectRoot, parent, plan.parent_selector_sha256, parentRoot, true);
  const oldManifest = readBoundManifest(
    path.join(generationRoot, 'parent-payload.manifest.v1.json'),
    plan.old_payload_manifest_sha256,
  );
  const newManifest = readBoundManifest(
    path.join(generationRoot, 'successor-payload.manifest.v1.json'),
    plan.new_payload_manifest_sha256,
  );
  if (
    !Array.isArray(plan.changed) ||
    !Array.isArray(plan.preserved_mutable_outputs) ||
    plan.preserved_mutable_outputs.length > 1
  )
    fail('GAP-VIDA-RUN-SELECTOR-001', 'Forward manifest deletion or preservation proof invalid.');
  const retired = [...oldManifest.files.keys()].filter((item) => !newManifest.files.has(item)).sort();
  if (
    retired.length &&
    JSON.stringify(retired) !== JSON.stringify(['AGENT.sidecar.md', 'agent-runtime.config.v1.yaml'])
  )
    fail('GAP-VIDA-RUN-SELECTOR-001', 'Only the complete project-owned integration pair may retire.');
  if (plan.preserved_mutable_outputs.length) {
    const preserved = plan.preserved_mutable_outputs[0];
    const configEntry = oldManifest.files.get('agent-runtime.config.v1.yaml');
    const nextConfig = newManifest.files.get('agent-runtime.config.v1.yaml');
    if (
      !exactKeys(preserved, [
        'path',
        'config_path',
        'config_pointer',
        'config_sha256',
        'staged_sha256',
        'installed_sha256_at_inspection',
      ]) ||
      (configEntry && nextConfig && configEntry.sha256 !== nextConfig.sha256) ||
      preserved.config_path !== 'agent-runtime.config.v1.yaml' ||
      preserved.config_pointer !== 'research_decision.paths.changelog' ||
      !hash.test(preserved.config_sha256) ||
      (configEntry && preserved.config_sha256 !== configEntry.sha256) ||
      !oldManifest.files.has(preserved.path) ||
      preserved.staged_sha256 !== oldManifest.files.get(preserved.path).sha256 ||
      newManifest.files.get(preserved.path)?.sha256 !== preserved.staged_sha256 ||
      !hash.test(preserved.installed_sha256_at_inspection)
    )
      fail('GAP-VIDA-RUN-SELECTOR-001', 'Configured mutable-output preservation proof invalid.');
  }
  const changed = [];
  for (const [relative, after] of [...newManifest.files].sort(([left], [right]) =>
    left < right ? -1 : left > right ? 1 : 0,
  )) {
    const before = oldManifest.files.get(relative);
    const changedEntry = !before || before.sha256 !== after.sha256 || before.size !== after.size;
    if (changedEntry) {
      if (!relative.startsWith('vida-agent/') && relative !== 'AGENTS.md')
        forwardPolicyAuthority(
          projectRoot,
          generationRoot,
          plan,
          authorization,
          relative,
          skipInstalledBundle && seen.size > 1,
          oldManifest,
          newManifest,
        );
      changed.push({
        path: relative,
        old_sha256: before?.sha256 ?? null,
        new_sha256: after.sha256,
        old_size: before?.size ?? null,
        new_size: after.size,
      });
    }
    // Older repair-base manifests retain source preimage hashes; only the selected
    // installed successor asserts that a non-generated mapping is same-byte.
    if (
      !skipInstalledBundle &&
      relative !== 'AGENTS.md' &&
      after.source_path !== undefined &&
      (after.source_path !== relative || after.source_sha256 !== after.sha256)
    )
      fail('GAP-VIDA-RUN-SELECTOR-001', 'Selected source provenance differs.');
    if (relative === 'AGENTS.md' && changedEntry) {
      const template = newManifest.files.get('vida-agent/templates/AGENTS.template.md');
      if (
        !template ||
        after.source_path !== 'vida-agent/templates/AGENTS.template.md' ||
        after.source_sha256 !== template.sha256
      )
        fail('GAP-VIDA-RUN-SELECTOR-001', 'Generated root AGENTS provenance differs.');
      if (!skipInstalledBundle) {
        const templateBytes = regularFile(path.join(projectRoot, 'vida-agent/templates/AGENTS.template.md'));
        const expected = Buffer.from(templateBytes.toString('utf8').replaceAll('{{BUNDLE}}', 'vida-agent'));
        if (
          templateBytes.length !== template.size ||
          digest(templateBytes) !== template.sha256 ||
          !templateBytes.includes(Buffer.from('{{BUNDLE}}')) ||
          expected.length !== after.size ||
          digest(expected) !== after.sha256 ||
          !regularFile(path.join(projectRoot, relative)).equals(expected)
        )
          fail('GAP-VIDA-RUN-SELECTOR-001', 'Installed generated root AGENTS drift.');
      }
    }
    if (!skipInstalledBundle && (relative.startsWith('vida-agent/') || (changedEntry && relative !== 'AGENTS.md'))) {
      const parts = relative.split('/');
      let at = projectRoot;
      for (const part of parts.slice(0, -1)) {
        at = path.join(at, part);
        checkedDirectory(at);
      }
      const actual = regularFile(path.join(at, parts.at(-1)));
      if (actual.length !== after.size || digest(actual) !== after.sha256)
        fail('GAP-VIDA-RUN-SELECTOR-001', 'Installed forward bundle drift.');
    }
  }
  if (JSON.stringify(changed) !== JSON.stringify(plan.changed) || !changed.length)
    fail('GAP-VIDA-RUN-SELECTOR-001', 'Forward changed-path proof differs.');
  if (!skipInstalledBundle)
    installedBundleInventory(
      projectRoot,
      new Set([...newManifest.files.keys()].filter((item) => item.startsWith('vida-agent/'))),
    );
  return skipInstalledBundle ? null : (plan.preserved_mutable_outputs[0] ?? null);
}

function activeSelector(projectRoot) {
  const agentRoot = path.join(projectRoot, '.agent');
  const selectorPath = path.join(agentRoot, 'active-runtime-selector.v1.json');
  if (!pathExists(selectorPath)) {
    const cutoverRoot = path.join(agentRoot, 'cutover');
    if (pathExists(cutoverRoot)) {
      checkedDirectory(agentRoot);
      checkedDirectory(cutoverRoot);
      if (readdirSync(cutoverRoot).length > 0)
        fail('GAP-VIDA-RUN-SELECTOR-001', 'Cutover records exist without an active selector.');
    }
    return null;
  }
  checkedDirectory(agentRoot);
  const selector = readControllerRecord(selectorPath, 'ActiveRuntimeSelector/v1');
  const hash = /^[a-f0-9]{64}$/;
  const expectedKeys = [
    'schema',
    'generation',
    'runtime',
    'bundle_root',
    'config_path',
    'archive_manifest_sha256',
    'plan_sha256',
    ...(selector.payload_manifest_sha256 === undefined
      ? []
      : ['payload_manifest_sha256', 'state_policy', 'activation_decision_sha256']),
  ];
  if (
    JSON.stringify(Object.keys(selector).sort()) !== JSON.stringify(expectedKeys.sort()) ||
    !/^[a-z0-9][a-z0-9._-]{0,79}$/.test(selector.generation) ||
    selector.runtime !== 'vida-agent' ||
    selector.bundle_root !== 'vida-agent' ||
    selector.config_path !== 'agent-runtime.config.v1.yaml' ||
    !hash.test(selector.archive_manifest_sha256) ||
    !hash.test(selector.plan_sha256) ||
    realpathSync(bundleRoot) !== realpathSync(path.join(projectRoot, 'vida-agent'))
  )
    fail('GAP-VIDA-RUN-SELECTOR-001', 'Active selector does not bind this installed bundle.');
  const selectorSha = digest(Buffer.from(controllerJson(selector)));
  const cutoverRoot = path.join(agentRoot, 'cutover');
  const generationRoot = path.join(cutoverRoot, selector.generation);
  checkedDirectory(cutoverRoot);
  checkedDirectory(generationRoot);
  const forward = pathExists(path.join(generationRoot, 'forward-intent.v1.json'));
  const repaired = pathExists(path.join(generationRoot, 'repair-plan.v1.json'));
  let currentMutableOutput = null;
  if (forward) {
    if (
      !hash.test(selector.payload_manifest_sha256) ||
      !hash.test(selector.activation_decision_sha256) ||
      selector.state_policy !== 'forward_only_preserve_work'
    )
      fail('GAP-VIDA-RUN-SELECTOR-001', 'Forward selector is incomplete.');
    currentMutableOutput = forwardUpdateAuthority(projectRoot, selector, selectorSha, generationRoot);
  } else if (repaired) {
    if (
      !hash.test(selector.payload_manifest_sha256) ||
      selector.state_policy !== 'clean_start_no_ticket_transfer' ||
      !hash.test(selector.activation_decision_sha256)
    )
      fail('GAP-VIDA-RUN-SELECTOR-001', 'Repair selector is incomplete.');
    repairAuthority(projectRoot, selector, selectorSha, generationRoot);
  } else if (selector.payload_manifest_sha256 !== undefined) {
    if (
      !hash.test(selector.payload_manifest_sha256) ||
      selector.state_policy !== 'clean_start_no_ticket_transfer' ||
      !hash.test(selector.activation_decision_sha256)
    )
      fail('GAP-VIDA-RUN-SELECTOR-001', 'Prepared selector is incomplete.');
    const journal = readControllerRecord(
      path.join(generationRoot, 'prepared-install.json'),
      'VidaPreparedInstallJournal/v1',
    );
    const ready = readControllerRecord(path.join(generationRoot, 'install-ready.json'), 'VidaPreparedInstallReady/v1');
    if (
      journal.cutover_id !== selector.generation ||
      journal.plan_sha256 !== selector.plan_sha256 ||
      journal.archive_manifest_sha256 !== selector.archive_manifest_sha256 ||
      journal.payload_manifest_sha256 !== selector.payload_manifest_sha256 ||
      journal.state_policy !== selector.state_policy ||
      journal.status !== 'installing' ||
      ready.cutover_id !== selector.generation ||
      ready.plan_sha256 !== selector.plan_sha256 ||
      ready.state_policy !== selector.state_policy ||
      ready.status !== 'ready_for_selector'
    )
      fail('GAP-VIDA-RUN-SELECTOR-001', 'Prepared cutover journal is incomplete.');
    const decision = readControllerRecord(
      path.join(generationRoot, 'activation-decision.v1.json'),
      'VidaCutoverActivationDecision/v1',
    );
    const commit = readControllerRecord(
      path.join(generationRoot, 'selector-commit.json'),
      'VidaPreparedSelectorCommit/v1',
    );
    const { activation_decision_sha256: _decisionHash, ...selectorIntent } = selector;
    if (
      JSON.stringify(Object.keys(decision).sort()) !==
        JSON.stringify(
          [
            'actor',
            'cutover_id',
            'evidence',
            'outcome',
            'payload_manifest_sha256',
            'plan_sha256',
            'pointer',
            'schema',
            'selector_intent_sha256',
          ].sort(),
        ) ||
      !exactKeys(decision.evidence, ['parity', 'security', 'assurance', 'rollback', 'dev', 'staged_runtime']) ||
      JSON.stringify(Object.keys(commit).sort()) !==
        JSON.stringify(
          ['activation_decision_sha256', 'cutover_id', 'plan_sha256', 'schema', 'selector_sha256'].sort(),
        ) ||
      digest(Buffer.from(controllerJson(decision))) !== selector.activation_decision_sha256 ||
      decision.outcome !== 'approved' ||
      decision.cutover_id !== selector.generation ||
      decision.plan_sha256 !== selector.plan_sha256 ||
      decision.payload_manifest_sha256 !== selector.payload_manifest_sha256 ||
      decision.selector_intent_sha256 !== digest(Buffer.from(controllerJson(selectorIntent))) ||
      commit.cutover_id !== selector.generation ||
      commit.plan_sha256 !== selector.plan_sha256 ||
      commit.activation_decision_sha256 !== selector.activation_decision_sha256 ||
      commit.selector_sha256 !== selectorSha
    )
      fail('GAP-VIDA-RUN-SELECTOR-001', 'Prepared cutover decision or selector commit is invalid.');
    for (const kind of ['parity', 'security', 'assurance', 'rollback', 'dev', 'staged_runtime']) {
      const item = decision.evidence[kind];
      if (
        !exactKeys(item, ['actor', 'path', 'pointer', 'sha256', 'status']) ||
        item.status !== 'passed' ||
        !hash.test(item.sha256) ||
        !item.actor ||
        !item.pointer ||
        typeof item.path !== 'string' ||
        !item.path.startsWith(`.agent/cutover/${selector.generation}/`) ||
        item.path.includes('\\') ||
        item.path.split('/').some((part) => !part || part === '.' || part === '..' || part.includes(':')) ||
        digest(regularFile(path.join(projectRoot, ...item.path.split('/')))) !== item.sha256
      )
        fail('GAP-VIDA-RUN-SELECTOR-001', 'Prepared cutover decision or selector commit is invalid.');
    }
  } else {
    const journal = readControllerRecord(path.join(generationRoot, 'journal.json'), 'VidaCutoverStageJournal/v1');
    if (
      journal.cutover_id !== selector.generation ||
      journal.plan_sha256 !== selector.plan_sha256 ||
      journal.archive_manifest_sha256 !== selector.archive_manifest_sha256 ||
      journal.selector_sha256 !== selectorSha ||
      journal.status !== 'staged'
    )
      fail('GAP-VIDA-RUN-SELECTOR-001', 'Cutover journal is incomplete.');
  }
  return {
    generationRoot,
    generation: selector.generation,
    selectorSha,
    planSha256: selector.plan_sha256,
    archiveManifestSha256: selector.archive_manifest_sha256,
    payloadManifestSha256: selector.payload_manifest_sha256,
    activationDecisionSha256: selector.activation_decision_sha256,
    repaired,
    forward,
    currentMutableOutput,
  };
}

// A selector is not sufficient authority while its cutover controller still holds maintenance.
// The controller releases this marker only through an explicit operator completion action.
export function assertNoActiveCutoverMaintenance(selector) {
  if (!selector) return;
  if (selector.repaired || selector.forward) return;
  if (pathExists(path.join(selector.generationRoot, 'maintenance-lock.v1.json')))
    fail('GAP-VIDA-RUN-SELECTOR-001', 'Cutover maintenance is still active.');
  const retained = readControllerRecord(
    path.join(selector.generationRoot, 'maintenance-lock.released.v1.json'),
    'VidaCutoverMaintenanceLock/v1',
  );
  const receipt = readControllerRecord(
    path.join(selector.generationRoot, 'maintenance-release.v1.json'),
    'VidaCutoverMaintenanceRelease/v1',
  );
  if (
    (selector.payloadManifestSha256 !== undefined &&
      !exactKeys(retained, [
        'schema',
        'cutover_id',
        'operator',
        'attestation',
        'archive_manifest_sha256',
        'plan_sha256',
        'payload_manifest_sha256',
        'expected_file_count',
        'archive_manifest',
        'plan',
        'state_policy',
        'activation_decision_path',
        'activation_decision_sha256',
      ])) ||
    !exactKeys(receipt, ['schema', 'cutover_id', 'operator', 'lock_sha256', 'status']) ||
    (selector.payloadManifestSha256 !== undefined &&
      (retained.attestation !== 'old_runtime_quiesced' ||
        retained.activation_decision_path !== `.agent/cutover/${selector.generation}/activation-decision.v1.json` ||
        retained.plan?.schema !== 'VidaPreparedInstallPlan/v1' ||
        retained.plan?.plan_sha256 !== selector.planSha256 ||
        retained.archive_manifest?.manifest_sha256 !== selector.archiveManifestSha256)) ||
    retained.cutover_id !== selector.generation ||
    retained.plan_sha256 !== selector.planSha256 ||
    retained.archive_manifest_sha256 !== selector.archiveManifestSha256 ||
    retained.payload_manifest_sha256 !== selector.payloadManifestSha256 ||
    receipt.cutover_id !== selector.generation ||
    receipt.status !== 'released_by_explicit_operator_action' ||
    (selector.activationDecisionSha256 && retained.activation_decision_sha256 !== selector.activationDecisionSha256) ||
    receipt.operator !== retained.operator ||
    receipt.lock_sha256 !== digest(Buffer.from(controllerJson(retained)))
  )
    fail('GAP-VIDA-RUN-SELECTOR-001', 'Cutover maintenance release proof is invalid.');
}

function writeDurable(file, value) {
  const bytes = Buffer.from(controllerJson(value));
  const target = `${file}.pending-${randomUUID()}`;
  const fd = openSync(target, 'wx', 0o600);
  try {
    writeFileSync(fd, bytes);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  renameSync(target, file);
  if (!regularFile(file).equals(bytes)) fail('GAP-VIDA-RUN-CUTOFF-001', 'Cutoff witness publication failed.');
}

function advanceCutoff(selector, values) {
  if (!selector) return;
  const file = path.join(selector.generationRoot, 'cutoff-witness.json');
  const lock = path.join(selector.generationRoot, 'cutoff-witness.lock');
  let lockFd;
  try {
    lockFd = openSync(lock, 'wx', 0o600);
  } catch {
    fail('GAP-VIDA-RUN-CUTOFF-001', 'Cutoff witness is held or unsafe.');
  }
  try {
    advanceLockedCutoff(file, selector, values);
  } finally {
    closeSync(lockFd);
    unlinkSync(lock);
  }
}

function advanceLockedCutoff(file, selector, values) {
  const initial = {
    schema: 'VidaNewWorkCutoffWitness/v1',
    generation: selector.generation,
    selector_sha256: selector.selectorSha,
    first_admitted_work_attempt: null,
  };
  if (!pathExists(file)) fail('GAP-VIDA-RUN-CUTOFF-001', 'Cutoff witness is missing.');
  const witness = readControllerRecord(file, 'VidaNewWorkCutoffWitness/v1');
  if (witness.generation !== selector.generation || witness.selector_sha256 !== selector.selectorSha)
    fail('GAP-VIDA-RUN-CUTOFF-001', 'Cutoff witness is bound to another selector.');
  if (witness.first_admitted_work_attempt !== null) {
    if (typeof witness.first_admitted_work_attempt !== 'string' || witness.first_admitted_work_attempt.length === 0)
      fail('GAP-VIDA-RUN-CUTOFF-001', 'Cutoff witness identity is invalid.');
    return;
  }
  writeDurable(file, {
    ...initial,
    first_admitted_work_attempt: `${values.repository}/${values.work_id}/${values.attempt}/${values.scope_digest}`,
  });
}

function fail(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  throw error;
}

function parseArgs(args) {
  const allowed = new Set([
    '--project-root',
    '--repository',
    '--project',
    '--work-path',
    '--team',
    '--kind',
    '--intent',
    '--workflow',
    '--work-id',
    '--attempt',
    '--scope-digest',
    '--scope-path',
    '--intake',
    '--continuation',
    '--inspect',
    '--issue-wave',
    '--recover-expired-lease',
    '--renew-lease',
    '--rebind-current-bundle',
    '--native-session-handle',
    '--lease-generation',
    '--report',
    '--reconcile',
    '--export-staged-witness',
    '--payload-manifest-sha256',
    '--expected-revision',
    '--expected-digest',
  ]);
  const values = { projects: [], scope_paths: [] };
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (
      !allowed.has(key) ||
      !value ||
      (!['--project', '--scope-path'].includes(key) && Object.hasOwn(values, key.slice(2).replaceAll('-', '_')))
    )
      fail(
        'GAP-VIDA-RUN-CLI-001',
        'Usage: run.mjs --project-root ABSOLUTE_PATH --repository ID --project ID --work-path RELATIVE_PATH --work-id ID --attempt NUMBER --scope-digest SHA256 --team ID --kind KIND --intent INTENT --workflow WORKFLOW_ID [--recover-expired-lease true --native-session-handle HANDLE --lease-generation NUMBER --expected-revision NUMBER --expected-digest SHA256]',
      );
    if (key === '--project') values.projects.push(value);
    else if (key === '--scope-path') values.scope_paths.push(value);
    else
      values[key.slice(2).replaceAll('-', '_')] =
        key === '--project-root' && path.isAbsolute(value) ? path.resolve(value) : value;
  }
  const required = [
    'project_root',
    'repository',
    'work_path',
    'work_id',
    'attempt',
    'team',
    'kind',
    'intent',
    'workflow',
  ];
  const deriveScope =
    values.scope_paths.length > 0 &&
    !values.recover_expired_lease &&
    !values.renew_lease &&
    !values.issue_wave &&
    !values.report &&
    !values.reconcile &&
    !values.inspect &&
    !values.continuation &&
    !values.export_staged_witness;
  if (required.some((key) => !values[key]) || values.projects.length < 1 || (!values.scope_digest && !deriveScope))
    fail('GAP-VIDA-RUN-CLI-001', 'All launcher arguments are required.');
  const changing = Boolean(
    values.issue_wave || values.report || values.reconcile || values.recover_expired_lease || values.renew_lease,
  );
  const exporting = Boolean(values.export_staged_witness || values.payload_manifest_sha256);
  if (
    [values.issue_wave, values.report, values.reconcile, values.recover_expired_lease, values.renew_lease].filter(
      Boolean,
    ).length > 1 ||
    (values.issue_wave && values.issue_wave !== 'true') ||
    (values.recover_expired_lease &&
      (values.recover_expired_lease !== 'true' ||
        values.rebind_current_bundle !== 'true' ||
        !values.native_session_handle ||
        !/^[1-9][0-9]*$/.test(values.lease_generation ?? '') ||
        !Number.isSafeInteger(Number(values.lease_generation)) ||
        values.native_session_handle.length > 256 ||
        /\p{Cc}/u.test(values.native_session_handle))) ||
    (!values.recover_expired_lease &&
      !values.renew_lease &&
      (values.native_session_handle || values.lease_generation)) ||
    (!values.recover_expired_lease && values.rebind_current_bundle) ||
    (values.renew_lease &&
      (values.renew_lease !== 'true' ||
        !values.native_session_handle ||
        !/^[1-9][0-9]*$/.test(values.lease_generation ?? '') ||
        !Number.isSafeInteger(Number(values.lease_generation)) ||
        values.native_session_handle.length > 256 ||
        /\p{Cc}/u.test(values.native_session_handle))) ||
    changing !== Boolean(values.expected_revision && values.expected_digest) ||
    (!changing && (values.expected_revision || values.expected_digest)) ||
    (changing &&
      (!/^[1-9][0-9]*$/.test(values.expected_revision ?? '') ||
        !Number.isSafeInteger(Number(values.expected_revision)) ||
        !/^[a-f0-9]{64}$/.test(values.expected_digest ?? ''))) ||
    [values.report, values.reconcile]
      .filter(Boolean)
      .some((entry) => !path.isAbsolute(entry) || path.resolve(entry) !== entry) ||
    (exporting &&
      (changing ||
        values.intake ||
        values.scope_paths.length > 0 ||
        !/^[a-z0-9][a-z0-9._-]{0,79}$/.test(values.export_staged_witness ?? '') ||
        !/^[a-f0-9]{64}$/.test(values.payload_manifest_sha256 ?? ''))) ||
    (values.intake && (changing || !path.isAbsolute(values.intake) || path.resolve(values.intake) !== values.intake)) ||
    (values.continuation &&
      (changing ||
        !values.intake ||
        !path.isAbsolute(values.continuation) ||
        path.resolve(values.continuation) !== values.continuation)) ||
    (values.inspect &&
      (values.inspect !== 'true' ||
        changing ||
        values.intake ||
        values.continuation ||
        exporting ||
        values.scope_paths.length > 0))
  )
    fail(
      'GAP-VIDA-RUN-CLI-001',
      'Mutation modes require one mode and an exact expected state version; renewal also requires the current owner and lease generation.',
    );
  if (!path.isAbsolute(values.project_root) || path.resolve(values.project_root) !== values.project_root)
    fail('GAP-VIDA-RUN-CLI-002', 'The project root must be one canonical absolute path.');
  let identity;
  try {
    identity = lstatSync(values.project_root);
    if (
      !identity.isDirectory() ||
      identity.isSymbolicLink() ||
      realpathSync(values.project_root) !== values.project_root
    )
      fail('GAP-VIDA-RUN-CLI-004', 'The project root must be an existing canonical directory.');
  } catch (error) {
    if (error?.code?.startsWith?.('GAP-VIDA-RUN-')) throw error;
    fail('GAP-VIDA-RUN-CLI-004', 'The project root must be an existing canonical directory.');
  }
  if (![values.repository, ...values.projects].every((value) => /^[a-z0-9][a-z0-9-]{0,127}$/.test(value)))
    fail('GAP-VIDA-RUN-CLI-003', 'Repository and project must be valid lowercase identifiers.');
  if (
    !/^[a-z0-9][a-z0-9-]{0,127}$/.test(values.work_id) ||
    !/^[1-9][0-9]*$/.test(values.attempt) ||
    !Number.isSafeInteger(Number(values.attempt)) ||
    (values.scope_digest ? !/^[a-f0-9]{64}$/.test(values.scope_digest) : !deriveScope)
  )
    fail('GAP-VIDA-RUN-CLI-003', 'Work attempt and scope must be valid explicit identifiers.');
  values.projects = [...new Set(values.projects)].sort();
  if (values.scope_paths.length > 512 || new Set(values.scope_paths).size !== values.scope_paths.length)
    fail('GAP-VIDA-RUN-CLI-003', 'Scope paths must be unique and bounded.');
  return Object.freeze(values);
}

const publicMessages = Object.freeze({
  'GAP-VIDA-RUN-CLI-001': 'Launcher arguments are incomplete or contain an unsupported option.',
  'GAP-VIDA-RUN-CLI-002': 'The project root is not a canonical absolute path.',
  'GAP-VIDA-RUN-CLI-003': 'Repository and project must be valid lowercase identifiers.',
  'GAP-VIDA-RUN-CLI-004': 'The project root is unavailable or is not a canonical directory.',
  'GAP-VIDA-RUN-BUN-001': 'The pinned Bun runtime requirement was not satisfied.',
  'GAP-VIDA-RUN-CONTEXT-001': 'The requested project context could not be bound.',
  'GAP-VIDA-RUN-WORKFLOW-001': 'The requested workflow is not configured for this selection.',
  'GAP-VIDA-RUN-SELECTOR-001': 'The active runtime selector or cutover journal is invalid.',
  'GAP-VIDA-RUN-CUTOFF-001': 'The new-work cutoff witness could not be recorded.',
  'GAP-VIDA-RUN-REPORT-001': 'The session report is missing, unsafe, oversized, or invalid JSON.',
});
const publicCodes = new Set(Object.keys(publicMessages));

function publicFailure(error) {
  const code = publicCodes.has(error?.code) ? error.code : 'GAP-VIDA-RUN-EXECUTION-001';
  return {
    schema: 'VidaAgentRunResult/v1',
    status: 'blocked',
    code,
    message: publicMessages[code] ?? 'The requested run was blocked by runtime validation.',
  };
}

function readBoundedReport(file) {
  let fd;
  try {
    const stat = lstatSync(file);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.size < 1 || stat.size > 32768)
      fail('GAP-VIDA-RUN-REPORT-001', 'Report file is unsafe or too large.');
    fd = openSync(file, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    const opened = fstatSync(fd);
    if (
      !opened.isFile() ||
      opened.nlink !== 1 ||
      opened.dev !== stat.dev ||
      opened.ino !== stat.ino ||
      opened.size < 1 ||
      opened.size > 32768
    )
      fail('GAP-VIDA-RUN-REPORT-001', 'Report file changed or is unsafe.');
    const bytes = Buffer.alloc(32769);
    let length = 0;
    while (length < bytes.length) {
      const count = readSync(fd, bytes, length, bytes.length - length, null);
      if (count === 0) break;
      length += count;
    }
    if (length < 1 || length > 32768) fail('GAP-VIDA-RUN-REPORT-001', 'Report size changed.');
    return JSON.parse(bytes.subarray(0, length).toString('utf8'));
  } catch {
    fail('GAP-VIDA-RUN-REPORT-001', 'Report file is unavailable or invalid.');
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

export async function run(args = process.argv.slice(2)) {
  if (!isBunRuntime) {
    const { runPinnedBun } = await import('./bun.mjs');
    return runPinnedBun([fileURLToPath(import.meta.url), ...args], {
      root: bundleRoot,
      cwd: bundleRoot,
    });
  }
  const { checkManifest, readPin } = await import('./bun.mjs');
  let values = parseArgs(args);
  // The pre-activation cutover directory is expected to exist when exporting
  // evidence. Normal work entry still requires an active selector there.
  const selector = values.export_staged_witness ? null : activeSelector(values.project_root);
  assertNoActiveCutoverMaintenance(selector);
  const { canonicalJsonDigest } = await import('../src/contracts/public-ingress.ts');
  const { deriveWorkspaceId } = await import('../src/workspace-identity.ts');
  const { loadRuntimeConfig, runtimeConfigDigest, runtimePackageAccess, selectWorkflow } =
    await import('../src/config/runtime-config.ts');
  const { resolveProjectForRepositoryPath } = await import('../src/config/project-context.ts');
  const pin = readPin(bundleRoot);
  checkManifest(bundleRoot, pin);
  if (Bun.version !== pin) fail('GAP-VIDA-RUN-BUN-001', `Pinned Bun ${pin} is required; running ${Bun.version}.`);
  const config = loadRuntimeConfig(values.project_root);
  if (!values.scope_digest) {
    const { inspectScope } = await import('./scope.mjs');
    const snapshot = await inspectScope([
      '--project-root',
      values.project_root,
      '--repository',
      values.repository,
      ...values.projects.flatMap((project) => ['--project', project]),
      ...values.scope_paths.flatMap((relative) => ['--path', relative]),
    ]);
    values = Object.freeze({ ...values, scope_digest: snapshot.digest });
  }
  if (selector?.currentMutableOutput && selector.currentMutableOutput.path !== config.research_decision.paths.changelog)
    fail('GAP-VIDA-RUN-SELECTOR-001', 'Selected mutable-output path differs from validated current configuration.');
  const configDigest = runtimeConfigDigest(config);
  if (selector && config.runtime.bundle !== 'vida-agent')
    fail('GAP-VIDA-RUN-SELECTOR-001', 'Selected bundle differs from configured runtime.');
  const initializationPath = path.join(values.project_root, '.agent', 'runtime-initialization.v1.json');
  let initialization;
  try {
    initialization = JSON.parse(await Bun.file(initializationPath).text());
  } catch {
    fail('GAP-VIDA-RUN-CONTEXT-001', 'Runtime initialization authority is unavailable.');
  }
  if (!['pending', 'bound'].includes(initialization.workspace_binding_status))
    fail('GAP-VIDA-RUN-CONTEXT-001', 'Runtime initialization status is invalid.');
  if (
    initialization.repository_id !== config.repository.repository_id ||
    initialization.repository_id !== values.repository
  )
    fail('GAP-VIDA-RUN-CONTEXT-001', 'Runtime initialization repository identity is stale.');
  const configuredProjectIds = [...config.projects.map((entry) => entry.project_id)].sort();
  if (
    !Array.isArray(initialization.project_ids) ||
    JSON.stringify([...initialization.project_ids].sort()) !== JSON.stringify(configuredProjectIds)
  )
    fail('GAP-VIDA-RUN-CONTEXT-001', 'Runtime initialization project configuration is stale.');
  if (initialization.integrations_digest !== canonicalJsonDigest(config.integrations))
    fail('GAP-VIDA-RUN-CONTEXT-001', 'Runtime initialization integrations are stale.');
  if (initialization.config_digest !== configDigest)
    fail('GAP-VIDA-RUN-CONTEXT-001', 'Runtime initialization configuration is stale.');
  if (initialization.workspace_id !== deriveWorkspaceId(config.repository.repository_id, values.project_root))
    fail('GAP-VIDA-RUN-CONTEXT-001', 'Runtime initialization workspace identity is stale.');
  const schemaSha = createHash('sha256')
    .update(runtimePackageAccess().readBytes('schemas/runtime-initialization.v1.schema.json', 'initialization schema'))
    .digest('hex');
  if (initialization.schema_sha256 !== schemaSha)
    fail('GAP-VIDA-RUN-CONTEXT-001', 'Runtime initialization schema is stale.');
  if (values.projects.some((id) => !config.projects.some((project) => project.project_id === id)))
    fail('GAP-VIDA-RUN-CONTEXT-001', 'The project context is not bound to the requested identity.');
  let pathProject;
  try {
    pathProject = resolveProjectForRepositoryPath(config.projects, values.work_path);
  } catch {
    fail('GAP-VIDA-RUN-CONTEXT-001', 'The work path is not bound to the selected project context.');
  }
  if (!values.projects.includes(pathProject.project_id))
    fail('GAP-VIDA-RUN-CONTEXT-001', 'The work path is outside the selected project context.');
  const selections = values.projects.map((projectId) =>
    selectWorkflow(config, {
      team: values.team,
      kind: values.kind,
      intent: values.intent,
      project: projectId,
      risk_flags: [],
      labels: [],
    }),
  );
  if (selections.some((selection) => selection.workflow_id !== values.workflow))
    fail('GAP-VIDA-RUN-WORKFLOW-001', 'The requested workflow is not the configured workflow for this selection.');
  if (values.export_staged_witness) {
    const { createStagedRuntimeWitness } = await import('../src/orchestration/staged-runtime-witness.ts');
    const { requireSafeRepositoryAccess } = await import('../src/config/safe-repository-access.ts');
    const witness = await createStagedRuntimeWitness({
      repositoryRoot: values.project_root,
      payloadManifestSha256: values.payload_manifest_sha256,
      workId: values.work_id,
      attempt: Number(values.attempt),
      selection: {
        team: values.team,
        kind: values.kind,
        intent: values.intent,
        project: pathProject.project_id,
        risk_flags: [],
        labels: [],
      },
    });
    const access = requireSafeRepositoryAccess(values.project_root);
    const directory = `.agent/cutover/${values.export_staged_witness}`;
    access.ensureDirectory('.agent', 'staged witness owner');
    access.ensureDirectory('.agent/cutover', 'staged witness directory');
    access.ensureDirectory(directory, 'staged witness generation');
    const observations = witness.ledger_state.completed.flatMap((wave) => wave.items.map((item) => item.observation));
    const refs = observations.map((observation, index) => {
      const relative = `${directory}/observation-${index}.json`;
      const bytes = Buffer.from(controllerJson(observation));
      access.writeExclusive(relative, bytes.toString('utf8'), 'staged native observation');
      return { path: relative, sha256: digest(bytes) };
    });
    const witnessPath = `${directory}/witness.json`;
    const witnessBytes = Buffer.from(controllerJson(witness));
    access.writeExclusive(witnessPath, witnessBytes.toString('utf8'), 'staged runtime witness');
    const evidence = {
      schema: 'VidaStagedRuntimeEvidence/v1',
      status: 'passed',
      payload_manifest_sha256: values.payload_manifest_sha256,
      workflow_id: witness.workflow_id,
      run_id: witness.run_id,
      witness: { path: witnessPath, sha256: digest(witnessBytes) },
      observations: refs,
    };
    const evidencePath = `${directory}/staged_runtime.json`;
    access.writeExclusive(evidencePath, controllerJson(evidence), 'staged runtime evidence');
    return {
      schema: 'VidaAgentRunResult/v1',
      status: 'staged_witness_exported',
      path: evidencePath,
      sha256: digest(Buffer.from(controllerJson(evidence))),
      workflow_id: witness.workflow_id,
      run_id: witness.run_id,
    };
  }
  if (values.recover_expired_lease) {
    const { readLocalSourceWriteAuthorization } = await import('../src/orchestration/local-source-authorization.ts');
    const { loadProjectSetContext } = await import('../src/config/project-context.ts');
    const { openConfiguredMastraSessionLedger } = await import('../src/orchestration/persistent-session-handoff.ts');
    const { assertAdmittedRuntimeCodeCurrent } = await import('../src/orchestration/admitted-session-execution.ts');
    const { snapshotDeclaredSources, snapshotRuntimePackageSources } =
      await import('../src/orchestration/scoped-source-snapshot.ts');
    const { requireSafeRepositoryAccess } = await import('../src/config/safe-repository-access.ts');
    const { inspectLocalSession } = await import('../src/orchestration/inspect-local-session.ts');
    const project = loadProjectSetContext(values.project_root, config, values.repository, values.projects);
    const identity = {
      repository_id: project.repository_id,
      project_ids: project.project_ids,
      integrations_digest: project.integrations_digest,
      work_id: values.work_id,
    };
    const ledger = openConfiguredMastraSessionLedger(values.project_root);
    try {
      const journal = ledger.resume(values.work_id, Number(values.attempt));
      const host = ledger.hostState.readHostStateSnapshot(identity);
      if (
        !journal ||
        !host.work ||
        !host.workVersion ||
        !host.ledgerVersion ||
        host.work.binding.team_id !== values.team ||
        host.work.binding.workflow_id !== values.workflow
      )
        fail('GAP-VIDA-RUN-CONTEXT-001', 'Expired lease recovery admitted work or selection differs.');

      const access = requireSafeRepositoryAccess(values.project_root);
      ledger.hostState.recoverExpiredLocalLease({
        identity,
        attempt: Number(values.attempt),
        nativeSessionHandle: values.native_session_handle,
        generation: Number(values.lease_generation),
        expectedWork: host.workVersion,
        expectedLedger: host.ledgerVersion,
        expectedJournal: { revision: Number(values.expected_revision), digest: values.expected_digest },
        expectedMaintenanceGeneration: host.maintenanceGeneration,
        verifyCurrent: (work, state) => {
          const currentConfig = loadRuntimeConfig(values.project_root);
          const approval = work.lifecycle.references.find(
            (reference) =>
              reference.kind === 'execution_approval' &&
              reference.disposition === 'current' &&
              reference.decision === 'approved',
          );
          if (!approval || approval.artifact_schema !== 'LocalSourceWriteAuthorization/v1')
            fail('GAP-VIDA-RUN-CONTEXT-001', 'Expired recovery requires the existing attributable source authority.');
          const existingAuthority = readLocalSourceWriteAuthorization(values.project_root, approval.path);
          const authority = existingAuthority.authorization;
          if (
            existingAuthority.sha256 !== approval.sha256 ||
            authority.schema !== 'LocalSourceWriteAuthorization/v1' ||
            authority.action !== 'source.write' ||
            approval.scope_id !== work.binding.scope_id ||
            approval.source_revision !== work.binding.work_source_revision ||
            authority.user_instruction_ref !== approval.record_id ||
            approval.principal !== 'local-session:' + canonicalJsonDigest(values.native_session_handle) ||
            authority.native_session_handle !== values.native_session_handle ||
            authority.work_id !== values.work_id ||
            authority.attempt !== Number(values.attempt) ||
            authority.scope_digest !== work.binding.work_source_revision ||
            authority.config_digest !== work.binding.config_digest ||
            authority.workflow_id !== work.binding.workflow_id ||
            canonicalJsonDigest([...authority.implementation_paths].sort()) !==
              canonicalJsonDigest([...work.binding.implementation_paths].sort()) ||
            authority.stage_ids.some(
              (id) =>
                !currentConfig.workflows[work.binding.workflow_id].stages.some(
                  (stage) => stage.id === id && stage.kind === 'develop',
                ),
            )
          )
            fail('GAP-VIDA-RUN-CONTEXT-001', 'Expired recovery existing source authority changed.');
          if (values.rebind_current_bundle !== 'true')
            fail('GAP-VIDA-RUN-CONTEXT-001', 'Expired recovery requires explicit current bundle rebind.');
          for (const wave of state.completed)
            for (const item of wave.items) {
              const stage = currentConfig.workflows[work.binding.workflow_id]?.stages.find(
                (entry) => entry.id === item.request.stage_id,
              );
              const assignment = stage?.assignments[item.request.assignment_index];
              const profile = assignment && currentConfig.agents.profiles[assignment.profile];
              if (
                !assignment ||
                !profile ||
                profile.mutation_scope === 'repository_source' ||
                item.request.role !== assignment.role ||
                item.request.config_digest !== work.binding.config_digest ||
                item.request.scope_digest !== state.source_scope.digest ||
                !item.observation ||
                item.observation.status !== 'reported_complete' ||
                item.observation.output_digest !== canonicalJsonDigest(item.observation.summary)
              )
                fail(
                  'GAP-VIDA-RUN-CONTEXT-001',
                  'Expired recovery predecessor evidence is not accepted readonly current-source evidence.',
                );
              if (item.research_normalization) {
                const plan = item.research_normalization;
                const artifact = work.artifacts.find(
                  (entry) =>
                    entry.path === plan.record_path &&
                    entry.sha256 === plan.record_sha256 &&
                    entry.stage_id === item.request.stage_id,
                );
                if (
                  !artifact ||
                  digest(access.readBytes(artifact.path, 'expired recovery accepted research')) !== artifact.sha256 ||
                  plan.observation_digest !== canonicalJsonDigest(item.observation)
                )
                  fail(
                    'GAP-VIDA-RUN-CONTEXT-001',
                    'Expired recovery requires an already admitted unchanged canonical research artifact.',
                  );
              } else if (stage.kind === 'research' || stage.kind === 'synthesize') {
                fail('GAP-VIDA-RUN-CONTEXT-001', 'Expired recovery cannot import unnormalized research.');
              }
            }
          if (
            work.lifecycle.references.some(
              (reference) =>
                reference.kind === 'execution_approval' &&
                reference.disposition === 'current' &&
                reference.artifact_schema !== 'LocalSourceWriteAuthorization/v1',
            )
          )
            fail('GAP-VIDA-RUN-CONTEXT-001', 'Expired recovery cannot retain bundle-bound execution approval.');
          for (const item of state.items) {
            const stage = currentConfig.workflows[work.binding.workflow_id]?.stages.find(
              (entry) => entry.id === item.request.stage_id,
            );
            const assignment = stage?.assignments[item.request.assignment_index];
            const profile = assignment && currentConfig.agents.profiles[assignment.profile];
            if (
              !assignment ||
              !profile ||
              item.request.role !== assignment.role ||
              item.request.config_digest !== work.binding.config_digest ||
              (profile.mutation_scope === 'repository_source' && item.issue_id !== null)
            )
              fail(
                'GAP-VIDA-RUN-CONTEXT-001',
                'Expired lease recovery current request or issued writer binding is unsafe.',
              );
          }
          if (
            runtimeConfigDigest(currentConfig) !== work.binding.config_digest ||
            work.binding.repository_id !== values.repository ||
            JSON.stringify(work.binding.project_ids) !== JSON.stringify(values.projects) ||
            state.source_scope?.digest !== values.scope_digest
          )
            fail('GAP-VIDA-RUN-CONTEXT-001', 'Expired lease recovery configuration, projects or scope differs.');
          const source = snapshotDeclaredSources(
            access,
            state.source_scope.entries.map((entry) => entry.path),
          );
          if (source.digest !== state.source_scope.digest)
            fail('GAP-VIDA-RUN-CONTEXT-001', 'Expired lease recovery declared source changed.');
          const intakeRef = work.artifacts.find((entry) => entry.artifact_id === 'local-session-intake');
          if (!intakeRef) fail('GAP-VIDA-RUN-CONTEXT-001', 'Expired lease recovery intake is unavailable.');
          const intakeBytes = access.readBytes(intakeRef.path, 'expired lease recovery intake');
          if (digest(intakeBytes) !== intakeRef.sha256)
            fail('GAP-VIDA-RUN-CONTEXT-001', 'Expired lease recovery intake changed.');
          const intake = JSON.parse(intakeBytes.toString('utf8'));
          const runtime = snapshotRuntimePackageSources(
            runtimePackageAccess(),
            currentConfig.runtime.bundle,
            intake.runtime_code_paths,
          );
          const schema = digest(
            runtimePackageAccess().readBytes(
              'schemas/agent-runtime-config.v1.schema.json',
              'expired lease recovery schema',
            ),
          );
          if (
            schema !== work.binding.schema_digest ||
            intake.native_session_handle !== values.native_session_handle ||
            canonicalJsonDigest(intake.work_item) !== work.binding.work_item_digest
          )
            fail('GAP-VIDA-RUN-CONTEXT-001', 'Expired lease recovery schema, intake or owner changed.');
          return { runtimeCodeDigest: runtime.digest, authorityPointer: approval.record_id };
        },
      });
      return inspectLocalSession({
        repositoryRoot: values.project_root,
        config,
        projectIds: project.project_ids,
        integrationsDigest: project.integrations_digest,
        workId: values.work_id,
        attempt: Number(values.attempt),
      });
    } finally {
      ledger.close();
    }
  }
  if (values.renew_lease) {
    const { loadProjectSetContext } = await import('../src/config/project-context.ts');
    const { openConfiguredMastraSessionLedger } = await import('../src/orchestration/persistent-session-handoff.ts');
    const { assertAdmittedRuntimeCodeCurrent } = await import('../src/orchestration/admitted-session-execution.ts');
    const { snapshotDeclaredSources, snapshotRuntimePackageSources } =
      await import('../src/orchestration/scoped-source-snapshot.ts');
    const { requireSafeRepositoryAccess } = await import('../src/config/safe-repository-access.ts');
    const { inspectLocalSession } = await import('../src/orchestration/inspect-local-session.ts');
    const project = loadProjectSetContext(values.project_root, config, values.repository, values.projects);
    const identity = {
      repository_id: project.repository_id,
      project_ids: project.project_ids,
      integrations_digest: project.integrations_digest,
      work_id: values.work_id,
    };
    const ledger = openConfiguredMastraSessionLedger(values.project_root);
    try {
      const journal = ledger.resume(values.work_id, Number(values.attempt));
      const host = ledger.hostState.readHostStateSnapshot(identity);
      if (
        !journal ||
        !host.work ||
        !host.workVersion ||
        !host.ledgerVersion ||
        host.work.binding.team_id !== values.team ||
        host.work.binding.workflow_id !== values.workflow
      )
        fail('GAP-VIDA-RUN-CONTEXT-001', 'Lease renewal admitted work or selection differs.');
      assertAdmittedRuntimeCodeCurrent(values.project_root, ledger.hostState, identity);
      const access = requireSafeRepositoryAccess(values.project_root);
      ledger.hostState.renewActiveLocalLease({
        identity,
        attempt: Number(values.attempt),
        nativeSessionHandle: values.native_session_handle,
        generation: Number(values.lease_generation),
        expectedWork: host.workVersion,
        expectedLedger: host.ledgerVersion,
        expectedJournal: { revision: Number(values.expected_revision), digest: values.expected_digest },
        expectedMaintenanceGeneration: host.maintenanceGeneration,
        verifyCurrent: (work, state) => {
          const currentConfig = loadRuntimeConfig(values.project_root);
          for (const item of state.items) {
            const stage = currentConfig.workflows[work.binding.workflow_id]?.stages.find(
              (entry) => entry.id === item.request.stage_id,
            );
            const assignment = stage?.assignments[item.request.assignment_index];
            const profile = assignment && currentConfig.agents.profiles[assignment.profile];
            if (
              !assignment ||
              !profile ||
              item.request.role !== assignment.role ||
              item.request.config_digest !== work.binding.config_digest ||
              (profile.mutation_scope === 'repository_source' && item.issue_id !== null)
            )
              fail('GAP-VIDA-RUN-CONTEXT-001', 'Lease renewal current request or issued writer binding is unsafe.');
          }
          if (
            runtimeConfigDigest(currentConfig) !== work.binding.config_digest ||
            work.binding.repository_id !== values.repository ||
            JSON.stringify(work.binding.project_ids) !== JSON.stringify(values.projects) ||
            state.source_scope?.digest !== values.scope_digest
          )
            fail('GAP-VIDA-RUN-CONTEXT-001', 'Lease renewal configuration, projects or scope differs.');
          const source = snapshotDeclaredSources(
            access,
            state.source_scope.entries.map((entry) => entry.path),
          );
          if (source.digest !== state.source_scope.digest)
            fail('GAP-VIDA-RUN-CONTEXT-001', 'Lease renewal declared source changed.');
          const intakeRef = work.artifacts.find((entry) => entry.artifact_id === 'local-session-intake');
          if (!intakeRef) fail('GAP-VIDA-RUN-CONTEXT-001', 'Lease renewal intake is unavailable.');
          const intakeBytes = access.readBytes(intakeRef.path, 'lease renewal intake');
          if (digest(intakeBytes) !== intakeRef.sha256)
            fail('GAP-VIDA-RUN-CONTEXT-001', 'Lease renewal intake changed.');
          const intake = JSON.parse(intakeBytes.toString('utf8'));
          const runtime = snapshotRuntimePackageSources(
            runtimePackageAccess(),
            currentConfig.runtime.bundle,
            intake.runtime_code_paths,
          );
          const schema = digest(
            runtimePackageAccess().readBytes('schemas/agent-runtime-config.v1.schema.json', 'lease renewal schema'),
          );
          if (
            runtime.digest !== work.binding.runtime_code_digest ||
            schema !== work.binding.schema_digest ||
            intake.native_session_handle !== values.native_session_handle ||
            canonicalJsonDigest(intake.work_item) !== work.binding.work_item_digest
          )
            fail('GAP-VIDA-RUN-CONTEXT-001', 'Lease renewal bundle, intake or owner changed.');
        },
      });
      return inspectLocalSession({
        repositoryRoot: values.project_root,
        config,
        projectIds: project.project_ids,
        integrationsDigest: project.integrations_digest,
        workId: values.work_id,
        attempt: Number(values.attempt),
      });
    } finally {
      ledger.close();
    }
  }
  if (values.inspect) {
    const { loadProjectSetContext } = await import('../src/config/project-context.ts');
    const { inspectLocalSession } = await import('../src/orchestration/inspect-local-session.ts');
    const project = loadProjectSetContext(values.project_root, config, config.repository.repository_id, [
      pathProject.project_id,
    ]);
    return inspectLocalSession({
      repositoryRoot: values.project_root,
      config,
      projectIds: project.project_ids,
      integrationsDigest: project.integrations_digest,
      workId: values.work_id,
      attempt: Number(values.attempt),
    });
  }
  if (!values.issue_wave && !values.report && !values.reconcile) advanceCutoff(selector, values);
  {
    const { MastraSessionBridge, configuredContextForStage, parseSessionBridgeObservation, sessionBridgeRunId } =
      await import('../src/orchestration/mastra-session-bridge.ts');
    const { openConfiguredMastraSessionLedger } = await import('../src/orchestration/persistent-session-handoff.ts');
    const { sessionActionsForWave } = await import('../src/orchestration/session-handoff.ts');
    const { requireSafeRepositoryAccess } = await import('../src/config/safe-repository-access.ts');
    const { snapshotDeclaredSources } = await import('../src/orchestration/scoped-source-snapshot.ts');
    const context = {
      work_id: values.work_id,
      attempt: Number(values.attempt),
      scope_digest: values.scope_digest,
    };
    const selection = {
      team: values.team,
      kind: values.kind,
      intent: values.intent,
      project: pathProject.project_id,
      risk_flags: [],
      labels: [],
    };
    const bridge = await MastraSessionBridge.open({
      repositoryRoot: values.project_root,
      config,
      selection,
      context,
      workflowId: values.workflow,
      workspaceId: initialization.workspace_id,
    });
    const ledger = openConfiguredMastraSessionLedger(values.project_root);
    const requireConfiguredContext = (request, allowedChangedPaths = []) => {
      const current = configuredContextForStage(
        values.project_root,
        config,
        values.workflow,
        request.stage_id,
        context,
      );
      if ((current?.digest ?? undefined) === request.configured_context_digest) return current;
      const previous = request.configured_context_files;
      if (!current || !previous || allowedChangedPaths.length === 0)
        fail('GAP-VIDA-RUN-CONTEXT-001', 'Configured context changed before native action use.');
      const priorFiles = new Map(previous.map((entry) => [entry.path, entry.sha256]));
      const currentFiles = new Map(
        current.entries.filter((entry) => entry.sha256 !== null).map((entry) => [entry.location, entry.sha256]),
      );
      const changed = [...new Set([...priorFiles.keys(), ...currentFiles.keys()])].filter(
        (entry) => priorFiles.get(entry) !== currentFiles.get(entry),
      );
      if (changed.length === 0 || changed.some((entry) => !allowedChangedPaths.includes(entry)))
        fail('GAP-VIDA-RUN-CONTEXT-001', 'Configured context changed outside the admitted native output.');
      return current;
    };
    const admittedEvidence = async (currentJournal) => {
      const { openAdmittedSessionExecution } = await import('../src/orchestration/admitted-session-execution.ts');
      const { buildAdmittedDevelopmentPacket } = await import('../src/orchestration/admitted-development-packet.ts');
      const { buildAdmittedImplementationResult } =
        await import('../src/orchestration/admitted-implementation-result.ts');
      const execution = await openAdmittedSessionExecution(
        values.project_root,
        ledger.hostState,
        pathProject.project_id,
        context.work_id,
      );
      const host = ledger.hostState.readHostStateSnapshot(execution.identity);
      const work = host.work;
      if (!work) fail('GAP-VIDA-RUN-EXECUTION-001', 'Admitted work is missing for evidence.');
      const access = requireSafeRepositoryAccess(values.project_root);
      const developer = currentJournal.state.completed
        .flatMap((entry) => entry.items)
        .find((item) =>
          config.workflows[values.workflow].stages.some(
            (stage) => stage.id === item.request.stage_id && stage.kind === 'develop',
          ),
        );
      const configuredContext = developer
        ? requireConfiguredContext(developer.request, developer.observation?.changed_paths ?? [])
        : null;
      const packet = buildAdmittedDevelopmentPacket({
        repositoryRoot: values.project_root,
        config,
        host,
        ledger: currentJournal,
        workItem: execution.workItem,
        selection,
        scopeBytes: access.readBytes(work.contracts.scope.path, 'current admitted scope'),
        acceptanceBytes: access.readBytes(work.contracts.acceptance.path, 'current admitted acceptance'),
        configuredContext,
      });
      const implementationResult = buildAdmittedImplementationResult({
        repositoryRoot: values.project_root,
        config,
        packet,
        host,
        ledger: currentJournal,
      });
      return {
        packet,
        implementationResult,
        authority: execution.composition.deliveryEvidenceAuthority,
      };
    };
    const completedValidationReceipts = async (currentJournal, evidence) => {
      const { issueObservedValidationReceipt } = await import('../src/orchestration/observed-validation.ts');
      const { sessionActionsForWave } = await import('../src/orchestration/session-handoff.ts');
      const { compileDevelopmentWorkflow } = await import('../src/orchestration/workflow-plan.ts');
      const compiled = compileDevelopmentWorkflow(config, values.team, values.workflow, selection.risk_flags);
      const expected = compiled.waves.flatMap((wave, index) =>
        wave.some((stage) => stage.kind === 'validate')
          ? sessionActionsForWave(config, selection, context, values.workflow, index, []).filter(
              (action) => action.stage_kind === 'validate',
            )
          : [],
      );
      const receipts = expected.map((action) =>
        issueObservedValidationReceipt({
          repositoryRoot: values.project_root,
          config,
          packet: evidence.packet,
          implementationResult: evidence.implementationResult,
          journal: currentJournal,
          actionId: action.action_id,
          authority: evidence.authority,
        }),
      );
      if (
        new Set(receipts.map((receipt) => receipt.validator_role)).size !== expected.length ||
        receipts.some((receipt) => receipt.verdict !== 'pass')
      )
        fail('GAP-VIDA-RUN-EXECUTION-001', 'Configured validator receipts are incomplete or failed.');
      return receipts;
    };
    const preparedDelivery = async (currentJournal, evidenceJournal = currentJournal) => {
      const evidence = await admittedEvidence(evidenceJournal);
      const receipts = await completedValidationReceipts(evidenceJournal, evidence);
      const { issueObservedTestReceipt } = await import('../src/orchestration/observed-testing.ts');
      const { instruction: testerInstruction, receipt: testReceipt } = issueObservedTestReceipt({
        repositoryRoot: values.project_root,
        config,
        packet: evidence.packet,
        implementationResult: evidence.implementationResult,
        journal: evidenceJournal,
        authority: evidence.authority,
      });
      const { prepareObservedDeliveryInstruction } = await import('../src/orchestration/observed-delivery.ts');
      return prepareObservedDeliveryInstruction({
        repositoryRoot: values.project_root,
        config,
        packet: evidence.packet,
        implementationResult: evidence.implementationResult,
        journal: currentJournal,
        validationReceipts: receipts,
        testerInstruction,
        testReceipt,
        authority: evidence.authority,
      });
    };
    const normalizeObservedResearch = async (currentJournal) => {
      const researchItems = currentJournal.state.items.filter(
        (item) =>
          item.observation &&
          config.workflows[values.workflow].stages.some(
            (stage) =>
              stage.id === item.request.stage_id &&
              (stage.produces.includes('ResearchResult/v1') || stage.produces.includes('ResearchSynthesis/v1')),
          ),
      );
      if (researchItems.length === 0) return currentJournal;
      const { loadProjectSetContext } = await import('../src/config/project-context.ts');
      const capturedProject = loadProjectSetContext(values.project_root, config, config.repository.repository_id, [
        pathProject.project_id,
      ]);
      const capturedOwner = ledger.hostState.readHostStateSnapshot({
        repository_id: capturedProject.repository_id,
        project_ids: capturedProject.project_ids,
        integrations_digest: capturedProject.integrations_digest,
        work_id: context.work_id,
      });
      if (
        capturedOwner.ledger?.operations.some(
          (operation) =>
            operation.work_id === context.work_id &&
            operation.kind === 'release' &&
            operation.operation_id.startsWith('completed-readonly-release-'),
        )
      )
        fail(
          'GAP-VIDA-RUN-EXECUTION-001',
          'Captured native completion remains normalization pending; ordinary execution cannot accept it.',
        );
      const { openAdmittedSessionExecution } = await import('../src/orchestration/admitted-session-execution.ts');
      const { buildObservedResearchResult } = await import('../src/orchestration/observed-research-result.ts');
      const { admittedResearchResultsForSynthesis, buildObservedSynthesisResult } =
        await import('../src/orchestration/observed-synthesis-result.ts');
      const { currentObservedResearchBinding } = await import('../src/orchestration/observed-research-binding.ts');
      const { commitObservedResearchArtifact } = await import('../src/orchestration/observed-research-artifact.ts');
      const { prepareObservedResearchRecord, recordObservedResearchResultAsync, validateResearchResult } =
        await import('../src/research-decision.ts');
      const execution = await openAdmittedSessionExecution(
        values.project_root,
        ledger.hostState,
        pathProject.project_id,
        context.work_id,
      );
      const access = requireSafeRepositoryAccess(values.project_root);
      for (const original of researchItems) {
        const item = currentJournal.state.items.find((entry) => entry.request.action_id === original.request.action_id);
        if (!item?.observation || !item.issue_id || !item.research_activation)
          fail('GAP-VIDA-RUN-EXECUTION-001', 'Observed research action lacks issued activation.');
        const host = ledger.hostState.readHostStateSnapshot(execution.identity);
        if (!host.work) fail('GAP-VIDA-RUN-EXECUTION-001', 'Observed research work is missing.');
        const admittedPlan = item.research_normalization;
        const artifactSchema = config.workflows[values.workflow].stages
          .find((stage) => stage.id === item.request.stage_id)
          ?.produces.includes('ResearchSynthesis/v1')
          ? 'ResearchSynthesis/v1'
          : 'ResearchResult/v1';
        const acceptedScope = JSON.parse(
          access.readBytes(host.work.contracts.scope.path, 'research accepted scope').toString('utf8'),
        );
        const researchMode = acceptedScope.research_mode ?? null;
        if (
          researchMode === 'answer_only' ||
          (researchMode === 'save_document' && artifactSchema === 'ResearchResult/v1')
        )
          continue;
        const admittedArtifact =
          admittedPlan &&
          host.work.artifacts.find(
            (artifact) =>
              artifact.schema === artifactSchema &&
              artifact.path === admittedPlan.record_path &&
              artifact.sha256 === admittedPlan.record_sha256 &&
              artifact.stage_id === item.request.stage_id,
          );
        if (admittedArtifact) {
          const bytes = access.readBytes(admittedArtifact.path, 'admitted research replay');
          if (
            createHash('sha256').update(bytes).digest('hex') !== admittedArtifact.sha256 ||
            (artifactSchema === 'ResearchResult/v1'
              ? validateResearchResult(JSON.parse(bytes.toString('utf8'))).digest
              : (await import('../src/research-decision.ts')).validateResearchSynthesis(
                  JSON.parse(bytes.toString('utf8')),
                ).digest) !== admittedPlan.result_digest
          )
            fail('GAP-VIDA-RUN-EXECUTION-001', 'Admitted research record changed after normalization.');
          continue;
        }
        const base = {
          config,
          observation: item.observation,
          request: item.request,
          issueId: item.issue_id,
          activationUse: item.research_activation.use,
          work: host.work,
          scopeBytes: access.readBytes(host.work.contracts.scope.path, 'research accepted scope'),
          acceptanceBytes: access.readBytes(host.work.contracts.acceptance.path, 'research accepted acceptance'),
          workItem: execution.workItem,
        };
        const result =
          artifactSchema === 'ResearchSynthesis/v1'
            ? buildObservedSynthesisResult({
                ...base,
                researchResults: admittedResearchResultsForSynthesis({
                  repositoryRoot: values.project_root,
                  config,
                  journal: currentJournal,
                  work: host.work,
                  workflowId: values.workflow,
                  workItem: execution.workItem,
                }),
              })
            : buildObservedResearchResult(base);
        if (
          researchMode === 'save_document' &&
          (result.topic !== acceptedScope.research_output_topic ||
            acceptedScope.documentation_paths?.[1] !== config.research_decision.paths.changelog)
        )
          fail('GAP-VIDA-RUN-EXECUTION-001', 'Saved research output differs from admitted document scope.');
        const predecessorResults =
          researchMode === 'save_document'
            ? admittedResearchResultsForSynthesis({
                repositoryRoot: values.project_root,
                config,
                journal: currentJournal,
                work: host.work,
                workflowId: values.workflow,
                workItem: execution.workItem,
              })
            : undefined;
        const current = () =>
          currentObservedResearchBinding({
            repositoryRoot: values.project_root,
            ledger,
            identity: execution.identity,
            workId: context.work_id,
            attempt: context.attempt,
            actionId: item.request.action_id,
          });
        const binding = current();
        let plan = item.research_normalization;
        if (!plan) {
          plan = await prepareObservedResearchRecord({
            root: values.project_root,
            result,
            observation: item.observation,
            binding,
            host_state: ledger.hostState,
            readCurrent: current,
            predecessor_results: predecessorResults,
          });
          if (researchMode === 'save_document' && plan.record_path !== acceptedScope.documentation_paths[0])
            fail('GAP-VIDA-RUN-EXECUTION-001', 'Canonical synthesis path differs from claimed output.');
          currentJournal = ledger.reserveResearchNormalization(
            context.work_id,
            context.attempt,
            currentJournal.version,
            item.request.action_id,
            plan,
          );
          plan = currentJournal.state.items.find(
            (entry) => entry.request.action_id === item.request.action_id,
          )?.research_normalization;
        }
        if (!plan) fail('GAP-VIDA-RUN-EXECUTION-001', 'Research normalization reservation is missing.');
        await recordObservedResearchResultAsync({
          root: values.project_root,
          result,
          observation: item.observation,
          binding,
          host_state: ledger.hostState,
          readCurrent: current,
          plan,
          predecessor_results: predecessorResults,
        });
        await commitObservedResearchArtifact({
          repositoryRoot: values.project_root,
          ledger,
          identity: execution.identity,
          workId: context.work_id,
          attempt: context.attempt,
          actionId: item.request.action_id,
          result,
          predecessorResults,
        });
      }
      return currentJournal;
    };
    const unresolvedHostEffect = async (currentJournal) => {
      if (currentJournal.resume_status !== 'ready') return null;
      const writers = currentJournal.state.items.filter(
        (item) =>
          item.issue_id === null &&
          config.workflows[values.workflow].stages.some(
            (stage) =>
              stage.id === item.request.stage_id &&
              stage.assignments[item.request.assignment_index]?.profile &&
              config.agents.profiles[stage.assignments[item.request.assignment_index].profile]?.mutation_scope ===
                'repository_source',
          ),
      );
      if (writers.length === 0) return null;
      const { openAdmittedSessionExecution } = await import('../src/orchestration/admitted-session-execution.ts');
      const execution = await openAdmittedSessionExecution(
        values.project_root,
        ledger.hostState,
        pathProject.project_id,
        context.work_id,
      );
      const host = ledger.hostState.readHostStateSnapshot(execution.identity);
      for (const item of writers) {
        const previous = host.work?.execution.assignment_attempts.findLast(
          (attempt) =>
            attempt.stage_id === item.request.stage_id && attempt.assignment_index === item.request.assignment_index,
        );
        if (
          previous &&
          (previous.status !== 'no_effect' ||
            canonicalJsonDigest(previous.reconciliation?.retry_lease) !== canonicalJsonDigest(host.work?.lease))
        )
          return {
            action_id: item.request.action_id,
            stage_id: item.request.stage_id,
            attempt_id: previous.attempt_id,
            attempt_status: previous.status,
            reason:
              previous.status === 'no_effect'
                ? 'no-effect was recorded but the exact retry lease has not been installed'
                : 'host attempt exists without a session issue; inspect native dispatch and reconcile before retry',
          };
      }
      return null;
    };
    try {
      if ((values.issue_wave || values.report) && !values.intake) {
        const paused = ledger.resume(context.work_id, context.attempt);
        const replacement = paused?.state.items.find((item) =>
          ledger.preparedReadOnlyReplacement(context.work_id, context.attempt, item.request.action_id),
        );
        const replacementPlan =
          replacement &&
          ledger.preparedReadOnlyReplacement(context.work_id, context.attempt, replacement.request.action_id);
        const replacementReport = values.report
          ? parseSessionBridgeObservation(readBoundedReport(values.report))
          : null;
        const activeReplacement =
          replacementReport &&
          paused?.state.items.find(
            (item) =>
              ledger.replacementDispatch(context.work_id, context.attempt, item.request.action_id)
                ?.dispatch_action_id === replacementReport.action_id,
          );
        const issuedReplacement =
          values.issue_wave &&
          paused?.state.items.find(
            (item) =>
              ledger.replacementDispatch(context.work_id, context.attempt, item.request.action_id) &&
              item.observation === null,
          );
        if (paused && (replacement || activeReplacement || issuedReplacement)) {
          if (
            paused.version.revision !== Number(values.expected_revision) ||
            paused.version.digest !== values.expected_digest
          )
            fail('GAP-VIDA-RUN-CONTEXT-001', 'Replacement research journal version is stale.');
          const { loadProjectSetContext } = await import('../src/config/project-context.ts');
          const project = loadProjectSetContext(
            values.project_root,
            config,
            config.repository.repository_id,
            values.projects,
          );
          const identity = {
            repository_id: project.repository_id,
            project_ids: project.project_ids,
            integrations_digest: project.integrations_digest,
            work_id: context.work_id,
          };
          const ownerSnapshot = ledger.hostState.readHostStateSnapshot(identity);
          const owner = ownerSnapshot.work;
          const currentRequest = (replacement ?? activeReplacement ?? issuedReplacement).request;
          const stored = paused.state.source_scope;
          const fresh =
            stored &&
            snapshotDeclaredSources(
              requireSafeRepositoryAccess(values.project_root),
              stored.entries.map((entry) => entry.path),
            );
          if (
            !owner ||
            (activeReplacement
              ? !owner.lease || owner.execution.status !== 'active'
              : !(
                  (owner.lease === null && owner.execution.status === 'suspended') ||
                  (issuedReplacement && owner.lease && owner.execution.status === 'active')
                )) ||
            owner.binding.workflow_id !== values.workflow ||
            owner.binding.team_id !== values.team ||
            owner.binding.work_source_revision !== stored?.digest ||
            stored?.digest !== fresh?.digest ||
            currentRequest.scope_digest !== values.scope_digest ||
            currentRequest.config_digest !== configDigest
          )
            fail('GAP-VIDA-RUN-CONTEXT-001', 'Paused replacement research binding changed.');
          const { assertAdmittedRuntimeCodeCurrent } =
            await import('../src/orchestration/admitted-session-execution.ts');
          try {
            assertAdmittedRuntimeCodeCurrent(values.project_root, ledger.hostState, identity);
          } catch {
            fail(
              'GAP-VIDA-RUN-CONTEXT-001',
              'Admitted runtime code changed; an exact forward-bound rebind is required before issue.',
            );
          }
          requireConfiguredContext(currentRequest);
          if (activeReplacement && replacementReport) {
            const { researchObservationOutputContract } =
              await import('../src/orchestration/observed-research-result.ts');
            let output;
            try {
              output = JSON.parse(replacementReport.summary);
            } catch {
              fail('GAP-VIDA-RUN-REPORT-001', 'Replacement research summary must be structured JSON.');
            }
            const required = researchObservationOutputContract.required_fields;
            if (
              !output ||
              typeof output !== 'object' ||
              Array.isArray(output) ||
              output.schema !== researchObservationOutputContract.summary_json_schema ||
              Object.keys(output).length !== required.length ||
              required.some((key) => !Object.hasOwn(output, key)) ||
              !Array.isArray(output.source_refs) ||
              output.source_refs.some((entry) => !entry || typeof entry.source_id !== 'string') ||
              canonicalJsonDigest(output.source_refs.map((entry) => entry.source_id).sort()) !==
                canonicalJsonDigest([...replacementReport.evidence_refs].sort()) ||
              !Array.isArray(output.ac_ids) ||
              canonicalJsonDigest([...output.ac_ids].sort()) !== canonicalJsonDigest([...owner.binding.ac_ids].sort())
            )
              fail('GAP-VIDA-RUN-REPORT-001', 'Replacement research output differs from required scope.');
            const { openAdmittedSessionExecution } = await import('../src/orchestration/admitted-session-execution.ts');
            const { buildObservedResearchResult } = await import('../src/orchestration/observed-research-result.ts');
            const execution = await openAdmittedSessionExecution(
              values.project_root,
              ledger.hostState,
              pathProject.project_id,
              context.work_id,
            );
            const currentItem = paused.state.items.find(
              (item) => item.request.action_id === activeReplacement.request.action_id,
            );
            if (!currentItem?.research_activation)
              fail('GAP-VIDA-RUN-REPORT-001', 'Replacement research activation is missing.');
            const access = requireSafeRepositoryAccess(values.project_root);
            buildObservedResearchResult({
              config,
              observation: { ...replacementReport, action_id: currentItem.request.action_id },
              request: currentItem.request,
              issueId: currentItem.issue_id,
              activationUse: currentItem.research_activation.use,
              work: owner,
              scopeBytes: access.readBytes(owner.contracts.scope.path, 'research accepted scope'),
              acceptanceBytes: access.readBytes(owner.contracts.acceptance.path, 'research accepted acceptance'),
              workItem: execution.workItem,
            });
            const observed = ledger.reportReadOnlyReplacement(
              context.work_id,
              context.attempt,
              paused.version,
              replacementReport,
              stored,
            );
            const normalized = await normalizeObservedResearch(observed);
            return {
              schema: 'VidaAgentRunResult/v1',
              status: 'replacement_observed',
              workflow: values.workflow,
              mastra_run_id: normalized.state.run_id,
              mastra_step_id: normalized.state.step_id,
              resume_status: normalized.resume_status,
              state_version: normalized.version,
              prior_issue_outcome: 'unknown',
              issued_actions: [],
              next_actions: [],
            };
          }
          const activated = replacement
            ? ledger.activateReadOnlyReplacement(
                context.work_id,
                context.attempt,
                paused.version,
                replacement.request.action_id,
              )
            : {
                snapshot: paused,
                dispatch: ledger.replacementDispatch(
                  context.work_id,
                  context.attempt,
                  issuedReplacement.request.action_id,
                ),
              };
          const { resumePausedLocalWork } = await import('../src/orchestration/resume-paused-local-work.ts');
          const nativeHandle =
            replacementPlan?.native_session_handle ??
            ledger.replacementNativeHandle(context.work_id, context.attempt, issuedReplacement.request.action_id);
          if (!nativeHandle || !ownerSnapshot.workVersion || !ownerSnapshot.ledgerVersion || !stored || !owner)
            fail('GAP-VIDA-RUN-CONTEXT-001', 'Paused replacement lease context is incomplete.');
          if (owner.lease === null) {
            const resumed = resumePausedLocalWork({
              store: ledger.hostState,
              ledger,
              identity,
              attempt: context.attempt,
              expectedWork: ownerSnapshot.workVersion,
              expectedLedger: ownerSnapshot.ledgerVersion,
              expectedJournal: activated.snapshot.version,
              nativeSessionHandle: nativeHandle,
              configDigest,
              sourceDigest: stored.digest,
            });
            if (resumed.status !== 'resumed')
              fail('GAP-VIDA-RUN-CONTEXT-001', 'Paused replacement lease needs current-state inspection.');
          } else if (owner.lease.thread_id !== nativeHandle) {
            fail('GAP-VIDA-RUN-CONTEXT-001', 'Replacement lease belongs to another native owner.');
          }
          const { openAdmittedSessionExecution } = await import('../src/orchestration/admitted-session-execution.ts');
          const { issueObservedResearchActivation } =
            await import('../src/orchestration/observed-research-activation.ts');
          const execution = await openAdmittedSessionExecution(
            values.project_root,
            ledger.hostState,
            pathProject.project_id,
            context.work_id,
          );
          const research = await issueObservedResearchActivation({
            repositoryRoot: values.project_root,
            config,
            ledger,
            identity: execution.identity,
            journal: activated.snapshot,
            actionId: currentRequest.action_id,
          });
          const { researchObservationOutputContract } =
            await import('../src/orchestration/observed-research-result.ts');
          return {
            schema: 'VidaAgentRunResult/v1',
            status: issuedReplacement ? 'wave_retrieved' : 'wave_issued',
            workflow: values.workflow,
            mastra_run_id: research.journal.state.run_id,
            mastra_step_id: research.journal.state.step_id,
            resume_status: research.journal.resume_status,
            state_version: research.journal.version,
            prior_issue_outcome: 'unknown',
            issued_actions: [
              {
                request: { ...currentRequest, action_id: activated.dispatch.dispatch_action_id },
                issue_id: activated.dispatch.issue_id,
                logical_action_id: currentRequest.action_id,
                instruction_activation: research.journal.state.items.find(
                  (item) => item.request.action_id === currentRequest.action_id,
                )?.research_activation?.use,
                instruction_bindings: research.bindings,
                research_output_contract: researchObservationOutputContract,
              },
            ],
            next_actions: [],
          };
        }
      }
      let admittedSource = null;
      if (values.intake) {
        const { z } = await import('zod');
        const intakeSchema = z
          .object({
            schema: z.literal('VidaLocalSessionIntake/v1'),
            native_session_handle: z.string().min(1).max(256),
            work_item: z
              .object({
                schema: z.literal('WorkItem/v1'),
                id: z.string().min(1),
                provider: z.string().min(1),
                provider_type: z.string().min(1),
                canonical_kind: z.string().min(1),
                intent: z.string().min(1),
                project_id: z.string().min(1),
                title: z.string().min(1),
                description: z.string(),
                labels: z.array(z.string()),
                risk_flags: z.array(z.string()),
              })
              .strict(),
            scope_path: z.string().min(1),
            acceptance_path: z.string().min(1),
            source_authorization_path: z.string().min(1).optional(),
            runtime_code_paths: z.array(z.string().min(1)).min(1).max(512),
            route: z.enum(['R1', 'R2', 'R3', 'R4']),
            risk: z.enum(['low', 'medium', 'high']),
            change_kind: z.enum(['feature', 'fix', 'refactor', 'migration', 'documentation', 'incident']),
          })
          .strict();
        let intake;
        try {
          intake = intakeSchema.parse(readBoundedReport(values.intake));
        } catch {
          fail('GAP-VIDA-RUN-CONTEXT-001', 'The local session intake is invalid.');
        }
        if (values.continuation) {
          const stateVersion = z
            .object({
              revision: z.number().int().positive(),
              digest: z.string().regex(/^[a-f0-9]{64}$/),
            })
            .strict();
          const continuationSchema = z
            .object({
              schema: z.literal('VidaLocalContinuation/v1'),
              predecessor_work_id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,127}$/),
              predecessor_attempt: z.number().int().positive(),
              predecessor_journal: stateVersion,
              expected_work: stateVersion,
              expected_ledger: stateVersion,
              native_session_handle: z.string().min(1).max(256),
              user_request_pointer: z.string().min(1).max(2048),
              request_intent: z.enum(['linked_correction', 'next_work']),
            })
            .strict();
          let continuation;
          try {
            continuation = continuationSchema.parse(readBoundedReport(values.continuation));
          } catch {
            fail('GAP-VIDA-RUN-CONTEXT-001', 'The continuation request is invalid.');
          }
          if (
            continuation.predecessor_work_id === context.work_id ||
            continuation.native_session_handle !== intake.native_session_handle
          )
            fail('GAP-VIDA-RUN-CONTEXT-001', 'Continuation identity differs from the new task.');
          const predecessor = ledger.resume(continuation.predecessor_work_id, continuation.predecessor_attempt);
          if (
            !predecessor ||
            canonicalJsonDigest(predecessor.version) !== canonicalJsonDigest(continuation.predecessor_journal)
          )
            fail('GAP-VIDA-RUN-CONTEXT-001', 'Predecessor journal changed or is missing.');
          const { loadProjectSetContext } = await import('../src/config/project-context.ts');
          const project = loadProjectSetContext(values.project_root, config, config.repository.repository_id, [
            pathProject.project_id,
          ]);
          const identity = {
            repository_id: project.repository_id,
            project_ids: project.project_ids,
            integrations_digest: project.integrations_digest,
            work_id: continuation.predecessor_work_id,
          };
          const priorHost = ledger.hostState.readHostStateSnapshot(identity);
          if (
            !priorHost.work ||
            priorHost.work.binding.config_digest !== configDigest ||
            priorHost.work.binding.project_ids.length !== 1 ||
            priorHost.work.binding.project_ids[0] !== pathProject.project_id
          )
            fail('GAP-VIDA-RUN-CONTEXT-001', 'Predecessor project or runtime configuration changed.');
          const { suspendLocalWork } = await import('../src/orchestration/suspend-local-work.ts');
          suspendLocalWork({
            config,
            store: ledger.hostState,
            identity,
            journal: predecessor,
            expectedWork: continuation.expected_work,
            expectedLedger: continuation.expected_ledger,
            nativeSessionHandle: continuation.native_session_handle,
            userRequestPointer: continuation.user_request_pointer,
            requestIntent: continuation.request_intent,
            documentationContext: {
              repository_root: values.project_root,
              repository_id: identity.repository_id,
              project_id: pathProject.project_id,
              work_id: continuation.predecessor_work_id,
            },
          });
        }
        const { admitLocalSessionWork } = await import('../src/orchestration/local-work-admission.ts');
        admittedSource = admitLocalSessionWork({
          repositoryRoot: values.project_root,
          config,
          store: ledger.hostState,
          selection,
          context,
          nativeSessionHandle: intake.native_session_handle,
          workItem: intake.work_item,
          scopePath: intake.scope_path,
          acceptancePath: intake.acceptance_path,
          sourceAuthorizationPath: intake.source_authorization_path,
          intakePath: path.relative(values.project_root, values.intake).split(path.sep).join('/'),
          runtimeCodePaths: intake.runtime_code_paths,
          route: intake.route,
          risk: intake.risk,
          changeKind: intake.change_kind,
        }).source;
      }
      const storedScope = ledger.resume(context.work_id, context.attempt)?.state.source_scope;
      const scopePaths =
        values.scope_paths.length > 0
          ? values.scope_paths
          : (admittedSource?.entries.map((entry) => entry.path) ??
            storedScope?.entries.map((entry) => entry.path) ??
            []);
      const sourceSnapshot =
        scopePaths.length > 0
          ? snapshotDeclaredSources(requireSafeRepositoryAccess(values.project_root), scopePaths)
          : null;
      if (admittedSource && sourceSnapshot?.digest !== admittedSource.digest)
        fail('GAP-VIDA-RUN-CONTEXT-001', 'Accepted source scope changed before workflow start.');
      let workflowSnapshot = await bridge.snapshot();
      const created = !workflowSnapshot;
      if (!workflowSnapshot) {
        if (values.issue_wave || values.report || values.reconcile)
          fail('GAP-VIDA-RUN-CONTEXT-001', 'The Mastra run has not been prepared.');
        workflowSnapshot = await bridge.start();
      }
      const pendingSourceEffect = ledger
        .resume(context.work_id, context.attempt)
        ?.state.items.some((item) => item.host_reservation && item.issue_id && item.observation === null);
      let journal = ledger.sync(
        context.work_id,
        context.attempt,
        workflowSnapshot.run_id,
        workflowSnapshot.step_id,
        workflowSnapshot.requests,
        pendingSourceEffect && storedScope?.digest !== sourceSnapshot?.digest ? storedScope : sourceSnapshot,
      );
      let reconciliationRequired = await unresolvedHostEffect(journal);
      let status = created ? 'prepared' : 'resumed';
      let issuedActions = [];
      let issuedEvidence = null;
      let validationReceipts = [];
      let testerInstruction = null;
      let testReceipt = null;
      let deliveryInstruction = null;
      if (values.issue_wave || values.report || values.reconcile) {
        if (
          journal.version.revision !== Number(values.expected_revision) ||
          journal.version.digest !== values.expected_digest
        )
          fail('GAP-VIDA-RUN-CONTEXT-001', 'The Mastra session ledger version is stale.');
        if (values.reconcile) {
          if (!reconciliationRequired || !sourceSnapshot)
            fail('GAP-VIDA-RUN-EXECUTION-001', 'No unissued native host attempt is eligible for reconciliation.');
          const { openAdmittedSessionExecution } = await import('../src/orchestration/admitted-session-execution.ts');
          const { reconcileUnissuedLocalSessionAction } =
            await import('../src/orchestration/local-session-reconciliation.ts');
          const execution = await openAdmittedSessionExecution(
            values.project_root,
            ledger.hostState,
            pathProject.project_id,
            context.work_id,
          );
          const relativeProof = path.relative(values.project_root, values.reconcile).split(path.sep).join('/');
          await reconcileUnissuedLocalSessionAction({
            root: values.project_root,
            proofPath: relativeProof,
            store: ledger.hostState,
            identity: execution.identity,
            journal,
            configDigest,
          });
          reconciliationRequired = await unresolvedHostEffect(journal);
          status = 'reconciled';
        } else if (values.issue_wave) {
          if (reconciliationRequired)
            fail('GAP-VIDA-RUN-EXECUTION-001', 'Native host attempt requires explicit reconciliation before issue.');
          const { loadProjectSetContext } = await import('../src/config/project-context.ts');
          const { assertAdmittedRuntimeCodeCurrent } =
            await import('../src/orchestration/admitted-session-execution.ts');
          const project = loadProjectSetContext(
            values.project_root,
            config,
            config.repository.repository_id,
            values.projects,
          );
          try {
            assertAdmittedRuntimeCodeCurrent(values.project_root, ledger.hostState, {
              repository_id: project.repository_id,
              project_ids: project.project_ids,
              integrations_digest: project.integrations_digest,
              work_id: context.work_id,
            });
          } catch {
            fail(
              'GAP-VIDA-RUN-CONTEXT-001',
              'Admitted runtime code changed; an exact forward-bound rebind is required before issue.',
            );
          }
          for (const request of workflowSnapshot.requests) requireConfiguredContext(request);
          const issueKinds = new Set(
            workflowSnapshot.requests.map(
              (request) =>
                config.workflows[values.workflow].stages.find((stage) => stage.id === request.stage_id)?.kind,
            ),
          );
          const issuedStages = workflowSnapshot.requests.map((request) =>
            config.workflows[values.workflow].stages.find((stage) => stage.id === request.stage_id),
          );
          if (issueKinds.has('validate') || issueKinds.has('test') || issueKinds.has('deliver')) {
            issuedEvidence = await admittedEvidence(journal);
            if (
              issueKinds.has('deliver') ||
              issuedStages.some((stage) => stage?.kind === 'test' && stage.consumes.includes('ValidationReceipt/v1'))
            )
              validationReceipts = await completedValidationReceipts(journal, issuedEvidence);
            if (issueKinds.has('test')) {
              const { buildObservedTesterInstruction } = await import('../src/orchestration/observed-testing.ts');
              testerInstruction = buildObservedTesterInstruction(
                issuedEvidence.packet,
                issuedEvidence.implementationResult,
              );
            }
            if (issueKinds.has('deliver')) {
              const { issueObservedTestReceipt } = await import('../src/orchestration/observed-testing.ts');
              ({ instruction: testerInstruction, receipt: testReceipt } = issueObservedTestReceipt({
                repositoryRoot: values.project_root,
                config,
                packet: issuedEvidence.packet,
                implementationResult: issuedEvidence.implementationResult,
                journal,
                authority: issuedEvidence.authority,
              }));
              if (testReceipt.status !== 'pass')
                fail('GAP-VIDA-RUN-EXECUTION-001', 'Configured tester receipt is not passing.');
            }
          }
          const waveIndex = workflowSnapshot.requests[0]?.wave_index;
          const waveActions =
            waveIndex === undefined
              ? []
              : sessionActionsForWave(config, selection, context, values.workflow, waveIndex, []);
          const writers = waveActions.filter((action) => action.mutation_scope === 'repository_source');
          let reservations = {};
          const researchBindings = new Map();
          if (writers.length > 0) {
            if (writers.length !== 1 || !sourceSnapshot)
              fail('GAP-VIDA-RUN-EXECUTION-001', 'Source-writing wave needs one admitted exact-path scope.');
            const writerAction = writers[0];
            const writerRequest = journal.state.items.find(
              (item) => item.request.action_id === writerAction.action_id,
            )?.request;
            if (!writerRequest) fail('GAP-VIDA-RUN-EXECUTION-001', 'Mastra source action is missing.');
            const { loadProjectSetContext } = await import('../src/config/project-context.ts');
            const projectContext = loadProjectSetContext(values.project_root, config, config.repository.repository_id, [
              pathProject.project_id,
            ]);
            const writerIdentity = {
              repository_id: projectContext.repository_id,
              project_ids: projectContext.project_ids,
              integrations_digest: projectContext.integrations_digest,
              work_id: context.work_id,
            };
            const beforeWriter = ledger.hostState.readHostStateSnapshot(writerIdentity);
            const { acquireLocalSourceWriterLease } = await import('../src/orchestration/local-work-admission.ts');
            acquireLocalSourceWriterLease({
              repositoryRoot: values.project_root,
              config,
              store: ledger.hostState,
              identity: writerIdentity,
              nativeSessionHandle: beforeWriter.work?.lease?.thread_id,
              stageId: writerRequest.stage_id,
              assignmentIndex: writerRequest.assignment_index,
              expectedWork: beforeWriter.workVersion,
              expectedLedger: beforeWriter.ledgerVersion,
              expectedSessionJournal: { attempt: context.attempt, version: journal.version },
            });
            const { openAdmittedSessionExecution } = await import('../src/orchestration/admitted-session-execution.ts');
            const { prepareWorkflowExecution, reserveWorkflowAssignmentForSession } =
              await import('../src/runtime-kernel.ts');
            const execution = await openAdmittedSessionExecution(
              values.project_root,
              ledger.hostState,
              pathProject.project_id,
              context.work_id,
            );
            const capability = execution.composition.workflowExecutionCapability;
            const prepared = await prepareWorkflowExecution(capability, {
              repositoryRoot: values.project_root,
              configDigest,
              teamId: values.team,
              workItemId: context.work_id,
            });
            const action = writers[0];
            const request = journal.state.items.find((item) => item.request.action_id === action.action_id)?.request;
            if (!request) fail('GAP-VIDA-RUN-EXECUTION-001', 'Mastra source action is missing.');
            const reserved = await reserveWorkflowAssignmentForSession(capability, {
              repositoryRoot: values.project_root,
              configDigest,
              teamId: values.team,
              workflowId: values.workflow,
              stageId: request.stage_id,
              assignmentIndex: request.assignment_index,
              workItemId: context.work_id,
              workItemDigest: prepared.workItemDigest,
              workContextDigest: prepared.workContextDigest,
              input: { bindings_manifest_ref: request.bindings_manifest_ref },
            });
            reservations = { [action.action_id]: reserved };
          }
          journal = ledger.issueWave(context.work_id, context.attempt, journal.version, reservations);
          if (
            issuedStages.some(
              (stage) =>
                stage?.produces.includes('ResearchResult/v1') || stage?.produces.includes('ResearchSynthesis/v1'),
            )
          ) {
            const { openAdmittedSessionExecution } = await import('../src/orchestration/admitted-session-execution.ts');
            const { issueObservedResearchActivation } =
              await import('../src/orchestration/observed-research-activation.ts');
            const execution = await openAdmittedSessionExecution(
              values.project_root,
              ledger.hostState,
              pathProject.project_id,
              context.work_id,
            );
            for (const item of journal.state.items.filter((entry) =>
              config.workflows[values.workflow].stages.some(
                (stage) =>
                  stage.id === entry.request.stage_id &&
                  (stage.produces.includes('ResearchResult/v1') || stage.produces.includes('ResearchSynthesis/v1')),
              ),
            )) {
              const activated = await issueObservedResearchActivation({
                repositoryRoot: values.project_root,
                config,
                ledger,
                identity: execution.identity,
                journal,
                actionId: item.request.action_id,
              });
              journal = activated.journal;
              researchBindings.set(item.request.action_id, activated.bindings);
            }
          }
          status = 'wave_issued';
          issuedActions = journal.state.items.map((item) => ({
            request: item.request,
            issue_id: item.issue_id,
            host_attempt_id: item.host_reservation?.receipt.attempt.attempt_id,
            ...(item.research_activation
              ? {
                  instruction_activation: item.research_activation.use,
                  instruction_bindings: researchBindings.get(item.request.action_id),
                  ...(config.workflows[values.workflow].stages.find((stage) => stage.id === item.request.stage_id)
                    ?.kind === 'research'
                    ? {
                        research_instruction_activation: item.research_activation.use,
                        research_instruction_bindings: researchBindings.get(item.request.action_id),
                      }
                    : {}),
                }
              : {}),
          }));
        } else {
          const observation = parseSessionBridgeObservation(readBoundedReport(values.report));
          const issued = journal.state.items.find((item) => item.request.action_id === observation.action_id);
          if (
            issued &&
            config.workflows[values.workflow].stages.find((stage) => stage.id === issued.request.stage_id)?.kind ===
              'validate'
          ) {
            const { parseObservedValidatorVerdict } = await import('../src/orchestration/observed-validation.ts');
            parseObservedValidatorVerdict(observation);
          }
          if (
            issued &&
            config.workflows[values.workflow].stages.find((stage) => stage.id === issued.request.stage_id)?.kind ===
              'test'
          ) {
            const { parseObservedTesterVerdict } = await import('../src/orchestration/observed-testing.ts');
            parseObservedTesterVerdict(observation);
          }
          if (
            issued &&
            config.workflows[values.workflow].stages.find((stage) => stage.id === issued.request.stage_id)?.kind ===
              'research'
          ) {
            if (!issued.issue_id || !issued.research_activation)
              fail('GAP-VIDA-RUN-EXECUTION-001', 'Research action lacks a committed instruction activation.');
            const { openAdmittedSessionExecution } = await import('../src/orchestration/admitted-session-execution.ts');
            const { buildObservedResearchResult } = await import('../src/orchestration/observed-research-result.ts');
            const execution = await openAdmittedSessionExecution(
              values.project_root,
              ledger.hostState,
              pathProject.project_id,
              context.work_id,
            );
            const host = ledger.hostState.readHostStateSnapshot(execution.identity);
            if (!host.work) fail('GAP-VIDA-RUN-EXECUTION-001', 'Research work is missing.');
            const access = requireSafeRepositoryAccess(values.project_root);
            buildObservedResearchResult({
              config,
              observation,
              request: issued.request,
              issueId: issued.issue_id,
              activationUse: issued.research_activation.use,
              work: host.work,
              scopeBytes: access.readBytes(host.work.contracts.scope.path, 'research accepted scope'),
              acceptanceBytes: access.readBytes(host.work.contracts.acceptance.path, 'research accepted acceptance'),
              workItem: execution.workItem,
            });
          }
          if (
            issued &&
            config.workflows[values.workflow].stages
              .find((stage) => stage.id === issued.request.stage_id)
              ?.produces.includes('ResearchSynthesis/v1')
          ) {
            if (!issued.issue_id || !issued.research_activation)
              fail('GAP-VIDA-RUN-EXECUTION-001', 'Synthesis action lacks a committed instruction activation.');
            const { openAdmittedSessionExecution } = await import('../src/orchestration/admitted-session-execution.ts');
            const { admittedResearchResultsForSynthesis, buildObservedSynthesisResult } =
              await import('../src/orchestration/observed-synthesis-result.ts');
            const execution = await openAdmittedSessionExecution(
              values.project_root,
              ledger.hostState,
              pathProject.project_id,
              context.work_id,
            );
            const host = ledger.hostState.readHostStateSnapshot(execution.identity);
            if (!host.work) fail('GAP-VIDA-RUN-EXECUTION-001', 'Synthesis work is missing.');
            const access = requireSafeRepositoryAccess(values.project_root);
            buildObservedSynthesisResult({
              config,
              observation,
              request: issued.request,
              issueId: issued.issue_id,
              activationUse: issued.research_activation.use,
              work: host.work,
              scopeBytes: access.readBytes(host.work.contracts.scope.path, 'synthesis accepted scope'),
              acceptanceBytes: access.readBytes(host.work.contracts.acceptance.path, 'synthesis accepted acceptance'),
              workItem: execution.workItem,
              researchResults: admittedResearchResultsForSynthesis({
                repositoryRoot: values.project_root,
                config,
                journal,
                work: host.work,
                workflowId: values.workflow,
                workItem: execution.workItem,
              }),
            });
          }
          if (
            issued &&
            config.workflows[values.workflow].stages.find((stage) => stage.id === issued.request.stage_id)?.kind ===
              'deliver'
          ) {
            const { parseObservedDeliveryProposal } = await import('../src/orchestration/observed-delivery.ts');
            parseObservedDeliveryProposal(observation);
            // Check the whole existing delivery contract before committing an
            // unreplaceable observation; the actual instruction is rebuilt only
            // from the persisted journal after report CAS succeeds.
            await preparedDelivery(
              {
                ...journal,
                state: {
                  ...journal.state,
                  items: journal.state.items.map((item) =>
                    item.request.action_id === observation.action_id ? { ...item, observation } : item,
                  ),
                },
              },
              journal,
            );
          }
          if (issued?.host_reservation) {
            if (observation.host_attempt_id !== issued.host_reservation.receipt.attempt.attempt_id)
              fail('GAP-VIDA-RUN-EXECUTION-001', 'Observed native host attempt differs.');
            const { compareScopedSourceSnapshots } = await import('../src/orchestration/scoped-source-snapshot.ts');
            if (
              !storedScope ||
              !sourceSnapshot ||
              !Array.isArray(observation.changed_paths) ||
              canonicalJsonDigest(
                compareScopedSourceSnapshots(storedScope, sourceSnapshot).map((entry) => entry.path),
              ) !== canonicalJsonDigest([...observation.changed_paths].sort())
            )
              fail('GAP-VIDA-RUN-EXECUTION-001', 'Observed native source changes differ from scoped files.');
            requireConfiguredContext(issued.request, observation.changed_paths);
            const { openAdmittedSessionExecution } = await import('../src/orchestration/admitted-session-execution.ts');
            const { completeWorkflowAssignmentForSession } = await import('../src/runtime-kernel.ts');
            const execution = await openAdmittedSessionExecution(
              values.project_root,
              ledger.hostState,
              pathProject.project_id,
              context.work_id,
            );
            const live = ledger.hostState.readHostStateSnapshot(execution.identity);
            const prior = live.work?.execution.assignment_attempts.find(
              (item) => item.attempt_id === observation.host_attempt_id,
            );
            if (prior?.status === 'started')
              await completeWorkflowAssignmentForSession(
                execution.composition.workflowExecutionCapability,
                issued.host_reservation,
                observation,
              );
            else if (prior?.status !== 'completed' || prior.result_digest !== canonicalJsonDigest(observation))
              fail('GAP-VIDA-RUN-EXECUTION-001', 'Native host attempt needs explicit reconciliation.');
          }
          if (!issued?.host_reservation && issued) requireConfiguredContext(issued.request);
          journal = ledger.report(context.work_id, context.attempt, journal.version, observation, sourceSnapshot);
          status = 'reported';
        }
      }
      journal = await normalizeObservedResearch(journal);
      if (journal.resume_status === 'ready_to_resume') {
        if (
          journal.state.items.some((item) =>
            config.workflows[values.workflow].stages.some(
              (stage) => stage.id === item.request.stage_id && stage.kind === 'deliver',
            ),
          )
        )
          deliveryInstruction = await preparedDelivery(journal);
        const stepId = journal.state.step_id;
        if (!stepId) fail('GAP-VIDA-RUN-EXECUTION-001', 'The Mastra resume step is missing.');
        workflowSnapshot = await bridge.resume(
          stepId,
          journal.state.items.map((item) => item.observation),
        );
        journal = ledger.sync(
          context.work_id,
          context.attempt,
          workflowSnapshot.run_id,
          workflowSnapshot.step_id,
          workflowSnapshot.requests,
          sourceSnapshot,
        );
        status = journal.resume_status === 'complete' ? 'all_reports_collected' : 'resumed';
      }
      if (
        journal.resume_status === 'complete' &&
        !deliveryInstruction &&
        journal.state.completed.some((entry) =>
          entry.items.some((item) =>
            config.workflows[values.workflow].stages.some(
              (stage) => stage.id === item.request.stage_id && stage.kind === 'deliver',
            ),
          ),
        )
      )
        deliveryInstruction = await preparedDelivery(journal);
      let researchSynthesis = null;
      const terminalStage = config.workflows[values.workflow].stages.at(-1);
      if (
        journal.resume_status === 'complete' &&
        terminalStage?.kind === 'synthesize' &&
        terminalStage.produces.includes('ResearchSynthesis/v1')
      ) {
        const items = journal.state.completed
          .flatMap((entry) => entry.items)
          .filter((item) => item.request.stage_id === terminalStage.id && item.request.workflow_id === values.workflow);
        if (items.length !== 1 || !items[0].research_normalization || !items[0].observation || !items[0].issue_id)
          fail('GAP-VIDA-RUN-EXECUTION-001', 'Terminal synthesis has no unique canonical observation.');
        const item = items[0];
        const { openAdmittedSessionExecution } = await import('../src/orchestration/admitted-session-execution.ts');
        const execution = await openAdmittedSessionExecution(
          values.project_root,
          ledger.hostState,
          pathProject.project_id,
          context.work_id,
        );
        const host = ledger.hostState.readHostStateSnapshot(execution.identity);
        const plan = item.research_normalization;
        const artifact = host.work?.artifacts.find(
          (entry) =>
            entry.schema === 'ResearchSynthesis/v1' &&
            entry.stage_id === terminalStage.id &&
            entry.path === plan.record_path &&
            entry.sha256 === plan.record_sha256,
        );
        if (
          !artifact ||
          plan.binding.action_id !== item.request.action_id ||
          plan.binding.issue_id !== item.issue_id ||
          plan.observation_digest !== canonicalJsonDigest(item.observation)
        )
          fail('GAP-VIDA-RUN-EXECUTION-001', 'Terminal synthesis is not bound to its admitted artifact.');
        const bytes = requireSafeRepositoryAccess(values.project_root).readBytes(
          artifact.path,
          'terminal synthesis artifact',
        );
        const { validateResearchSynthesis } = await import('../src/research-decision.ts');
        if (bytes.length > 64 * 1024 || createHash('sha256').update(bytes).digest('hex') !== artifact.sha256)
          fail('GAP-VIDA-RUN-EXECUTION-001', 'Terminal synthesis bytes changed.');
        researchSynthesis = validateResearchSynthesis(JSON.parse(bytes.toString('utf8')));
        if (researchSynthesis.bundle_id !== artifact.artifact_id || researchSynthesis.digest !== plan.result_digest)
          fail('GAP-VIDA-RUN-EXECUTION-001', 'Terminal synthesis identity changed.');
      }
      reconciliationRequired = await unresolvedHostEffect(journal);
      const actionWave = workflowSnapshot.requests[0]?.wave_index;
      const actions =
        actionWave === undefined
          ? []
          : sessionActionsForWave(config, selection, context, values.workflow, actionWave, []);
      const actionById = new Map(actions.map((action) => [action.action_id, action]));
      const { researchObservationOutputContract } = await import('../src/orchestration/observed-research-result.ts');
      const { synthesisObservationOutputContract, admittedResearchResultsForSynthesis, synthesisSourceCatalog } =
        await import('../src/orchestration/observed-synthesis-result.ts');
      const synthesisStageIds = new Set(
        config.workflows[values.workflow].stages
          .filter((stage) => stage.produces.includes('ResearchSynthesis/v1'))
          .map((stage) => stage.id),
      );
      const synthesisCatalog = journal.state.items.some(
        (item) =>
          synthesisStageIds.has(item.request.stage_id) &&
          (journal.resume_status === 'ready' || issuedActions.length > 0),
      )
        ? await (async () => {
            const { loadProjectSetContext } = await import('../src/config/project-context.ts');
            const project = loadProjectSetContext(values.project_root, config, config.repository.repository_id, [
              pathProject.project_id,
            ]);
            const host = ledger.hostState.readHostStateSnapshot({
              repository_id: project.repository_id,
              project_ids: project.project_ids,
              integrations_digest: project.integrations_digest,
              work_id: context.work_id,
            });
            return synthesisSourceCatalog(
              admittedResearchResultsForSynthesis({
                repositoryRoot: values.project_root,
                config,
                journal,
                work: host.work,
                workflowId: values.workflow,
              }),
            );
          })()
        : null;
      const contextByAction = new Map(
        (journal.resume_status === 'ready' || issuedActions.length > 0 ? journal.state.items : []).map((item) => [
          item.request.action_id,
          requireConfiguredContext(item.request),
        ]),
      );
      return {
        schema: 'VidaAgentRunResult/v1',
        status,
        workflow: values.workflow,
        mastra_run_id: workflowSnapshot.run_id,
        mastra_step_id: workflowSnapshot.step_id,
        execution_status: workflowSnapshot.status,
        resume_status: reconciliationRequired ? 'reconciliation_required' : journal.resume_status,
        reconciliation_required: reconciliationRequired,
        source_snapshot_digest: sourceSnapshot?.digest ?? null,
        state_version: journal.version,
        next_actions:
          journal.resume_status === 'ready' && !reconciliationRequired
            ? journal.state.items.map((item) => ({
                request: item.request,
                action: actionById.get(item.request.action_id),
                configured_context: contextByAction.get(item.request.action_id),
                ...(actionById.get(item.request.action_id)?.stage_kind === 'research'
                  ? { research_output_contract: researchObservationOutputContract }
                  : {}),
                ...(config.workflows[values.workflow].stages
                  .find((stage) => stage.id === item.request.stage_id)
                  ?.produces.includes('ResearchSynthesis/v1')
                  ? {
                      synthesis_output_contract: synthesisObservationOutputContract,
                      synthesis_source_catalog: synthesisCatalog,
                    }
                  : {}),
              }))
            : [],
        issued_actions: issuedActions.map((item) => ({
          ...item,
          action: actionById.get(item.request.action_id),
          configured_context: contextByAction.get(item.request.action_id),
          ...(actionById.get(item.request.action_id)?.stage_kind === 'research'
            ? { research_output_contract: researchObservationOutputContract }
            : {}),
          ...(config.workflows[values.workflow].stages
            .find((stage) => stage.id === item.request.stage_id)
            ?.produces.includes('ResearchSynthesis/v1')
            ? {
                synthesis_output_contract: synthesisObservationOutputContract,
                synthesis_source_catalog: synthesisCatalog,
              }
            : {}),
          ...(issuedEvidence
            ? {
                development_packet: issuedEvidence.packet,
                implementation_result: issuedEvidence.implementationResult,
              }
            : {}),
          ...(testerInstruction ? { tester_instruction: testerInstruction } : {}),
        })),
        validation_receipt_statuses: validationReceipts.map((receipt) => ({
          receipt_id: receipt.receipt_id,
          validator_role: receipt.validator_role,
          verdict: receipt.verdict,
          implementation_fingerprint: receipt.implementation_fingerprint,
        })),
        test_receipt_status: testReceipt
          ? {
              receipt_id: testReceipt.receipt_id,
              status: testReceipt.status,
              implementation_fingerprint: testReceipt.implementation_fingerprint,
            }
          : null,
        delivery_instruction: deliveryInstruction,
        research_synthesis: researchSynthesis,
        action_statuses: journal.state.items.map((item) => ({
          action_id: item.request.action_id,
          status:
            item.issue_id === null ? 'unissued' : item.observation === null ? 'issued_outcome_uncertain' : 'reported',
        })),
        completed_observations: journal.state.completed.flatMap((entry) => entry.items.map((item) => item.observation)),
        initialization_status: initialization.workspace_binding_status,
        ...(selector
          ? {
              runtime_selector_observed: true,
              selector_generation: selector.generation,
              selector_sha256: selector.selectorSha,
            }
          : {}),
      };
    } finally {
      ledger.close();
      await bridge.close();
    }
  }
}

export async function main({
  isMain = Boolean(process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url),
  args = process.argv.slice(2),
  io = console,
  exit = process,
  execute = run,
} = {}) {
  if (!isMain) return;
  // Set the supported cache namespace before TypeScript modules are imported.
  // A library import/call never enters this actual-entrypoint-only route.
  if (isBunRuntime && process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
    const { pinnedEnvironment, runPinnedBun } = await import('./bun.mjs');
    const environment = pinnedEnvironment(process.execPath, process.env, bundleRoot);
    if (environment.BUN_RUNTIME_TRANSPILER_CACHE_PATH !== process.env.BUN_RUNTIME_TRANSPILER_CACHE_PATH) {
      exit.exitCode = runPinnedBun([fileURLToPath(import.meta.url), ...args], {
        root: bundleRoot,
        cwd: process.cwd(),
        executable: process.execPath,
        env: environment,
      });
      return;
    }
  }
  try {
    const result = await execute(args);
    if (Number.isInteger(result)) exit.exitCode = result;
    else io.log(JSON.stringify(result));
  } catch (error) {
    io.error(JSON.stringify(publicFailure(error)));
    exit.exitCode = 1;
  }
}

await main();
