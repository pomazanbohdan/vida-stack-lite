/* Typed checkpoint/protocol upgrade planning for active runtime work. */
'use strict';

const fs = require('fs');
const path = require('path');
const scopeConvergence = require('./scope-convergence.cjs');

const CURRENT_SCHEMA = 'WorkCheckpoint/v2';
const PROTOCOLS = Object.freeze(['agent-development-runtime/v2', 'agent-development-runtime/v3', 'agent-development-runtime/v4']);
const LEGACY_PROTOCOLS = Object.freeze({
  'agent-development-runtime/v2.2.0': 'agent-development-runtime/v2',
  'agent-development-runtime/2.2.0': 'agent-development-runtime/v2',
  'agent-development-runtime/v2.2': 'agent-development-runtime/v2',
  'agent-development-runtime/2.2': 'agent-development-runtime/v2'
});
const ACTIVE_STATES = Object.freeze(['INTAKE', 'TRACE', 'PLAN', 'EXECUTE', 'VERIFY', 'DELIVERY']);

function gate(message, code = 'GATE_BLOCKED') {
  /** @type {Error & {code?: string}} */
  const error = new Error(message);
  error.code = code;
  throw error;
}

function required(value, name) {
  if (typeof value !== 'string' || !value.trim()) gate(`${name} missing`);
  return value;
}

function timestamp(value, name) {
  required(value, name);
  if (!Number.isFinite(Date.parse(value))) gate(`${name} invalid`);
  return value;
}

function pointer(value) {
  required(value, 'checkpoint upgrade pointer');
  if (value.length > 512 || /[\r\n]|(?:password|secret|token|apikey|authorization|bearer)/i.test(value)) gate('checkpoint upgrade pointer unsafe');
}

function actor(value) {
  required(value, 'checkpoint upgrade actor');
  if (value.length > 256 || /[\r\n]|(?:password|secret|token|apikey|authorization|bearer)/i.test(value)) gate('checkpoint upgrade actor unsafe');
}

function canonicalProtocol(value) {
  if (PROTOCOLS.includes(value)) return { value, legacy: false };
  if (LEGACY_PROTOCOLS[value]) return { value: LEGACY_PROTOCOLS[value], legacy: true };
  gate(`unsupported checkpoint protocol: ${value}`);
}

function rank(protocol) { return PROTOCOLS.indexOf(protocol); }

function unsealedPlan(c) {
  return ['TRACE', 'PLAN'].includes(c.lifecycle_state) && !c.sealed_at && !c.sealed_revision && !c.implementation_fingerprint;
}

function hasV3Binding(c) { return Boolean(c.coordination) && Array.isArray(c.review_dispatch_reservation_ledger); }
function hasV4Binding(c) {
  return hasV3Binding(c) && Boolean(c.project_context) && Boolean(c.backlog_projection) && Boolean(c.implementation_policy) && Array.isArray(c.user_testing_receipts);
}

const ARCHITECT_DIAGNOSTIC_NEXT_ACTION = 'Reserve one fresh history-isolated blind architect from BR/SR/AC and observable evidence, record ArchitectureDiagnosis/v1, then begin the architect-separated correction.';

function typedArchitectEscalation(c) {
  const packet = c.review_packet;
  if (!packet || !Array.isArray(c.reviews)) return false;
  const crossScope = c.reviews.some(review => Array.isArray(review?.finding_objects) && review.finding_objects.some(finding => finding?.escalation === 'cross_scope'));
  const persistent = Number(packet.wave) >= 2 && c.reviews.some(review => Array.isArray(review?.finding_objects) && review.finding_objects.some(finding => finding?.escalation === 'persistent'));
  return crossScope || persistent;
}

function reconcileArchitectNextAction(c, candidate, normalizations) {
  if (c.lifecycle_state !== 'VERIFY' || !typedArchitectEscalation(c) || c.architect_decision || c.architect_diagnostic_dispatch || c.architecture_diagnosis) return;
  if (candidate.next_action === ARCHITECT_DIAGNOSTIC_NEXT_ACTION) return;
  candidate.next_action = ARCHITECT_DIAGNOSTIC_NEXT_ACTION;
  normalizations.push('reconciled typed architect diagnostic next action');
}

function autoTarget(c, canonical, legacy) {
  if (!legacy) return canonical;
  if (hasV4Binding(c)) return 'agent-development-runtime/v4';
  if (hasV3Binding(c) || c.coordination) return 'agent-development-runtime/v3';
  return 'agent-development-runtime/v2';
}

function requestedTarget(c, canonical, legacy, requested) {
  const target = requested && requested !== 'auto' ? requested : autoTarget(c, canonical, legacy);
  if (!PROTOCOLS.includes(target)) gate(`unsupported target protocol: ${target}`);
  if (!legacy && rank(target) < rank(canonical)) gate('protocol downgrade is not allowed');
  return target;
}

function optionalLedger(c, candidate, target, normalizations) {
  if (!['agent-development-runtime/v3', 'agent-development-runtime/v4'].includes(target) || Array.isArray(candidate.review_dispatch_reservation_ledger)) return;
  if (Object.hasOwn(candidate, 'review_dispatch_reservation_ledger') && candidate.review_dispatch_reservation_ledger !== undefined) gate('review dispatch reservation ledger invalid');
  if (!unsealedPlan(c)) gate('protocol migration requires an unsealed plan for ledger initialization', 'GAP-CHECKPOINT-UPGRADE-001');
  candidate.review_dispatch_reservation_ledger = [];
  normalizations.push('initialized empty review_dispatch_reservation_ledger');
}

function optionalTestingLedger(c, candidate, target, normalizations) {
  if (target !== 'agent-development-runtime/v4' || Array.isArray(candidate.user_testing_receipts)) return;
  if (Object.hasOwn(candidate, 'user_testing_receipts') && candidate.user_testing_receipts !== undefined) gate('user testing receipt ledger invalid');
  if (!unsealedPlan(c)) gate('protocol migration requires an unsealed plan for user-testing ledger initialization', 'GAP-CHECKPOINT-UPGRADE-001');
  candidate.user_testing_receipts = [];
  normalizations.push('initialized empty user_testing_receipts');
}

function canonicalRelative(value) {
  return typeof value === 'string' ? value.replaceAll('\\', '/').replace(/^\.\//, '') : value;
}

function isMutableCheckpointPath(workId, value) {
  return canonicalRelative(value) === `.agent/work/${workId}/resume.json`;
}

function normalizeFingerprintScope(c, candidate, normalizations) {
  if (!Array.isArray(candidate.fingerprint_paths)) return;
  const mutable = candidate.fingerprint_paths.filter(value => isMutableCheckpointPath(c.work_id, value));
  if (!mutable.length) return;
  if (!unsealedPlan(c)) gate('mutable checkpoint path cannot be normalized after plan', 'GAP-CHECKPOINT-UPGRADE-001');
  const filtered = candidate.fingerprint_paths.filter(value => !isMutableCheckpointPath(c.work_id, value));
  const fallback = filtered.length ? filtered : (Array.isArray(candidate.allowed_paths) ? candidate.allowed_paths.filter(value => !isMutableCheckpointPath(c.work_id, value)) : []);
  if (!fallback.length) gate('fingerprint scope contains only mutable checkpoint state', 'GAP-CHECKPOINT-UPGRADE-001');
  candidate.fingerprint_paths = fallback;
  normalizations.push('removed mutable checkpoint path from fingerprint scope');
}

function normalizeKnowledge(c, candidate, input, normalizations) {
  if (input.requirePlatformKnowledge !== true || candidate.platform_knowledge_required === true) return;
  if (!unsealedPlan(c)) return;
  candidate.platform_knowledge_required = true;
  candidate.next_action = 'Record the immutable PlatformKnowledgeContext/v1 before execution.';
  normalizations.push('enabled platform knowledge context requirement');
}
function normalizeChangeImpact(c, candidate, input, normalizations) {
  if (input.requireChangeImpact !== true || candidate.change_impact_required === true || !unsealedPlan(c)) return;
  candidate.change_impact_required = true;
  candidate.next_action = 'Record the pre-change ChangeImpactAssessment/v1 before execution.';
  normalizations.push('enabled change impact assessment requirement');
}
function normalizeCandidate(c, target, input = {}) {
  const candidate = { ...c, protocol_version: target };
  const normalizations = [];
  normalizeFingerprintScope(c, candidate, normalizations);
  optionalLedger(c, candidate, target, normalizations);
  optionalTestingLedger(c, candidate, target, normalizations);
  normalizeKnowledge(c, candidate, input, normalizations);
  normalizeChangeImpact(c, candidate, input, normalizations);
  reconcileArchitectNextAction(c, candidate, normalizations);
  if (target === 'agent-development-runtime/v4' && !hasV4Binding(candidate)) gate('protocol v4 binding incomplete', 'GAP-CHECKPOINT-UPGRADE-001');
  if (target === 'agent-development-runtime/v3' && !candidate.coordination) gate('protocol v3 coordination binding missing', 'GAP-CHECKPOINT-UPGRADE-001');
  return { candidate, normalizations };
}

function historyEntry(c, target, input, normalizations) {
  return {
    schema: 'CheckpointProtocolMigration/v1', migration_id: `${c.work_id}-protocol-${c.revision + 1}`,
    work_id: c.work_id, from_protocol: c.protocol_version, to_protocol: target,
    from_checkpoint_schema: c.schema, to_checkpoint_schema: CURRENT_SCHEMA,
    from_revision: c.revision, to_revision: c.revision + 1, source_revision: c.source_revision,
    normalizations, reason: input.reason, pointer: input.pointer, actor: input.actor,
    timestamp: input.timestamp, status: 'applied'
  };
}

function validateInput(input) {
  if (!input || !Number.isInteger(input.expectedRevision) || input.expectedRevision < 1) gate('checkpoint upgrade expected revision required');
  required(input.sourceRevision, 'checkpoint upgrade source revision');
  validateAttribution(input);
}

function validateAttribution(input) {
  required(input.reason, 'checkpoint upgrade reason');
  pointer(input.pointer);
  actor(input.actor);
  timestamp(input.timestamp, 'checkpoint upgrade timestamp');
}

function checkpointDialect(c) {
  if (!c || typeof c !== 'object') return 'unreadable';
  if (c.schema === CURRENT_SCHEMA) return PROTOCOLS.includes(c.protocol_version) || LEGACY_PROTOCOLS[c.protocol_version] ? 'typed' : 'unknown-protocol';
  if (c.schema) return 'unsupported';
  if (typeof c.work_id === 'string' && typeof c.lifecycle_state === 'string' && typeof c.status === 'string') return 'legacy-status';
  return 'legacy-unbound';
}

function convergenceStatus(c) {
  const health=scopeConvergence.convergenceHealth(c);
  return health==='scope_audit_required'?'scope_audit_required':health==='scope_recovery_required'?'scope_recovery_required':health==='scope_follow_up_required'?'scope_follow_up_required':health==='scope_contract_required'?'scope_contract_required':null;
}

function counterHealth(c) {
  if (!['EXECUTE', 'VERIFY'].includes(c?.lifecycle_state)) return null;
  if (Number.isInteger(c?.review_generation) && c.review_generation > 0 && !Number.isInteger(c.correction_count)) return 'scope_audit_required';
  return null;
}

function authorityHealth(c) {
  const manifest=c?.acceptance_manifest;
  if (!manifest || !Array.isArray(manifest.ac_ids) || !Array.isArray(manifest.contracts) || manifest.contracts.length!==manifest.ac_ids.length) return 'authority_required';
  return null;
}
function feedbackCorrectionHealth(c) {
  const analysis = c?.feedback_analysis;
  if (c?.lifecycle_state !== 'EXECUTE' || !analysis || analysis.status !== 'accepted' || !['defect', 'rework'].includes(analysis.decision) || c.correction_authorization || c.next_action === feedbackNextOperation('feedback_correction_authorization_required')) return null;
  return 'feedback_correction_authorization_required';
}

function feedbackReceiptKey(origin, receipt) { return receipt?.timestamp ? `${origin}:${receipt.timestamp}` : null; }
function consumedFeedbackAvailable(c) {
  if (!c || !['TRACE', 'PLAN', 'EXECUTE', 'VERIFY'].includes(c.lifecycle_state) || c.feedback_analysis || c.correction_authorization) return false;
  return ['delivery', 'testing'].some(origin => {
    const receipt = origin === 'delivery' ? c.delivery_feedback_receipt : c.user_testing_feedback_receipt;
    const key = feedbackReceiptKey(origin, receipt);
    if (!key) return false;
    if (Array.isArray(c.feedback_consumption_history) && c.feedback_consumption_history.some(entry => entry?.origin === origin && entry.source_receipt_id === key)) return true;
    const analysis = (Array.isArray(c.feedback_analysis_history) ? c.feedback_analysis_history : []).find(entry => entry?.origin === origin && entry.status === 'accepted' && entry.source_receipt_id === key);
    return Boolean(analysis && Array.isArray(c.correction_history) && c.correction_history.some(entry => entry?.origin === origin && entry.analysis_id === analysis.analysis_id));
  });
}

function knowledgeRecoveryAvailable(c) {
  if (c?.lifecycle_state !== 'VERIFY' || !c.sealed_at || !Number.isInteger(c.sealed_revision) || c.platform_knowledge_required !== true || c.platform_knowledge_context) return false;
  const scopeId = c.scope_contract?.scope_id || c.scope_id;
  return Array.isArray(c.platform_knowledge_context_history) && c.platform_knowledge_context_history.some(entry => (
    entry && typeof entry.context_id === 'string' && entry.context_id &&
    typeof entry.cycle_id === 'string' && entry.cycle_id &&
    entry.source_revision === c.source_revision &&
    entry.scope_id === scopeId &&
    typeof entry.digest === 'string' && /^[a-f0-9]{64}$/.test(entry.digest)
  ));
}
function changeImpactHealth(c) {
  if (c?.change_impact_required !== true) return null;
  const assessment = c.change_impact_assessment;
  if (['TRACE', 'PLAN'].includes(c.lifecycle_state) && assessment?.phase !== 'pre') return 'change_impact_preflight_required';
  if (['EXECUTE', 'VERIFY'].includes(c.lifecycle_state) && assessment?.phase !== 'post') return 'change_impact_post_required';
  return null;
}

function legacyCheckpointPlan(c) { return { status: 'legacy_unbound', checkpoint: c, from_protocol: c?.protocol_version || null, to_protocol: null, normalizations: [], health: 'authority_required', next_operation: 'Bind the legacy evidence to an attributable WorkCheckpoint/v2 plan before protocol migration.' }; }
function convergenceNextOperation(health) {
  if (health === 'scope_contract_required') return 'Record an ImplementationScope/v1 with behavior, test, diagnostic and attribution traces.';
  if (health === 'scope_audit_required') return 'Record or reconcile the ImplementationScope/v1 and run a bounded scope recovery plan.';
  if (health === 'scope_follow_up_required') return 'Use recordScopeFollowUpAuthorization/v1 for a bounded same-AC/file follow-up; do not repeat scope recovery in this workstream.';
  return 'Use the typed scope recovery operation before another correction.';
}
function feedbackNextOperation(health) {
  return health === 'feedback_correction_authorization_required'
    ? 'Record a fresh PlatformKnowledgeContext/v1 and then CorrectionAuthorization/v1 before beginCorrection.'
    : health === 'feedback_receipt_reconciliation_required'
      ? 'Use reconcileConsumedFeedback/v1 with the current revision/source and an attributable reason; do not reuse the consumed receipt.'
    : null;
}
function changeImpactNextOperation(health) {
  if (health === 'change_impact_preflight_required') return 'Use recordChangeImpactAssessment/v1 before beginExecution.';
  return 'Use recordChangeImpactPost/v1 with the current implementation fingerprint before execute:post/seal.';
}
function convergencePlan(c, protocol) {
  const health = convergenceStatus(c) || counterHealth(c);
  if (!health) return null;
  return { status: health, checkpoint: c, from_protocol: c.protocol_version, to_protocol: protocol.value, normalizations: [], health, next_operation: convergenceNextOperation(health) };
}
function normalizedCheckpointPlan(c, input, assertCheckpoint, protocol) {
  const target = requestedTarget(c, protocol.value, protocol.legacy, input.targetProtocol || 'auto');
  const normalized = normalizeCandidate(c, target, input);
  const needsUpgrade = protocol.legacy || target !== c.protocol_version || normalized.normalizations.length > 0;
  if (!needsUpgrade) { assertCheckpoint(c); return { status: 'already_current', checkpoint: c, from_protocol: c.protocol_version, to_protocol: target, normalizations: [], health: scopeConvergence.convergenceHealth(c) }; }
  const entry = historyEntry(c, target, input, normalized.normalizations);
  const checkpoint = { ...normalized.candidate, revision: c.revision + 1, protocol_migration_history: [...(Array.isArray(c.protocol_migration_history) ? c.protocol_migration_history : []), entry] };
  assertCheckpoint(checkpoint);
  return { status: 'upgrade', checkpoint, from_protocol: c.protocol_version, to_protocol: target, normalizations: normalized.normalizations, health: scopeConvergence.convergenceHealth(checkpoint) };
}
function activeCheckpointPlan(c, input, assertCheckpoint, protocol) {
  const authority=authorityHealth(c);
  if (authority) return { status: 'blocked', checkpoint: c, from_protocol: c.protocol_version, to_protocol: protocol.value, normalizations: [], health: authority, next_operation: 'Use the typed acceptance-manifest repair operation with attributable contract definitions.' };
  const feedbackHealth = feedbackCorrectionHealth(c);
  if (feedbackHealth) return { status: 'correction_authorization_required', checkpoint: c, from_protocol: c.protocol_version, to_protocol: protocol.value, normalizations: [], health: feedbackHealth, next_operation: feedbackNextOperation(feedbackHealth) };
  if (consumedFeedbackAvailable(c)) return { status: 'feedback_receipt_reconciliation_required', checkpoint: c, from_protocol: c.protocol_version, to_protocol: protocol.value, normalizations: [], health: 'feedback_receipt_reconciliation_required', next_operation: feedbackNextOperation('feedback_receipt_reconciliation_required') };
  const impactHealth = changeImpactHealth(c);
  if (impactHealth) return { status: impactHealth, checkpoint: c, from_protocol: c.protocol_version, to_protocol: protocol.value, normalizations: [], health: impactHealth, next_operation: changeImpactNextOperation(impactHealth) };
  if (knowledgeRecoveryAvailable(c)) return { status: 'knowledge_context_recovery_available', checkpoint: c, from_protocol: c.protocol_version, to_protocol: protocol.value, normalizations: [], health: 'knowledge_context_recovery_available', next_operation: 'Use restorePlatformKnowledgeContext/v1 with the exact context ID and digest from platform_knowledge_context_history.' };
  if (c.platform_knowledge_required === true && !c.platform_knowledge_context && ACTIVE_STATES.includes(c.lifecycle_state)) return { status: 'knowledge_context_required', checkpoint: c, from_protocol: c.protocol_version, to_protocol: protocol.value, normalizations: [], health: 'knowledge_context_required', next_operation: 'Use recordPlatformKnowledgeContext/v1 before execute:pre.' };
  return convergencePlan(c, protocol) || normalizedCheckpointPlan(c, input, assertCheckpoint, protocol);
}
function typedCheckpointPlan(c, input, assertCheckpoint) {
  const protocol = canonicalProtocol(c.protocol_version);
  if (!ACTIVE_STATES.includes(c.lifecycle_state)) return { status: 'immutable', checkpoint: c, from_protocol: c.protocol_version, to_protocol: protocol.value, normalizations: [], health: scopeConvergence.convergenceHealth(c) };
  return activeCheckpointPlan(c, input, assertCheckpoint, protocol);
}
function planCheckpoint(c, input, assertCheckpoint) {
  const dialect=checkpointDialect(c);
  if (dialect==='unreadable') gate('checkpoint unreadable', 'GAP-CHECKPOINT-UPGRADE-001');
  if (dialect==='legacy-status' || dialect==='legacy-unbound') return legacyCheckpointPlan(c);
  if (dialect==='unsupported') gate(c?.schema ? 'checkpoint schema upgrade unsupported' : 'unsupported checkpoint dialect', 'GAP-CHECKPOINT-UPGRADE-001');
  return typedCheckpointPlan(c, input, assertCheckpoint);
}

function readCheckpoint(file, ops) { return JSON.parse(String(ops.read(file))); }

function upgradeCheckpointFile(file, input, root, ops) {
  validateInput(input);
  return ops.withLock(file, () => {
    const current = readCheckpoint(file, ops);
    if (current.revision !== input.expectedRevision || current.source_revision !== input.sourceRevision) gate('checkpoint upgrade compare-and-swap mismatch');
    const planned = planCheckpoint(current, input, candidate => ops.assertCheckpoint(candidate, root));
    if (planned.status !== 'upgrade') return current;
    ops.atomicReplace(file, planned.checkpoint);
    return planned.checkpoint;
  });
}

function filesFor(root) {
  const workRoot = path.join(root, '.agent', 'work');
  if (!fs.existsSync(workRoot)) return [];
  return fs.readdirSync(workRoot, { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => path.join(workRoot, entry.name, 'resume.json')).filter(file => fs.existsSync(file)).sort();
}

function fallback(value, alternative) { return value || alternative; }
function plannedNextAction(planned, current) {
  // Only the feedback-correction repair is a safe, explicit next-action
  // normalization. Other blocked/health plans must preserve the checkpoint's
  // existing action rather than replacing a typed GAP with an upgrader hint.
  return ['correction_authorization_required', 'feedback_receipt_reconciliation_required'].includes(planned.status)
    ? planned.next_operation
    : fallback(current.next_action, null);
}
function relativeItemPath(file, root) { return path.relative(root, file).replaceAll(path.sep, '/'); }
function blockedItem(file, root, current, error) {
  return {
    work_id: fallback(current.work_id, path.basename(path.dirname(file))), path: relativeItemPath(file, root),
    lifecycle_state: fallback(current.lifecycle_state, null), revision: fallback(current.revision, null), status: 'blocked',
    code: fallback(error.code, 'GAP-CHECKPOINT-UPGRADE-001'), reason: error.message,
    next_action: fallback(current.next_action, 'Resolve the typed checkpoint GAP before migration.')
  };
}

function itemFrom(file, root, options, ops) {
  let current = {};
  try {
    current = readCheckpoint(file, ops);
    if (options.workId && current.work_id !== options.workId) return null;
    const planned = planCheckpoint(current, options, candidate => ops.assertCheckpoint(candidate, root));
    return { work_id: current.work_id, path: relativeItemPath(file, root), lifecycle_state: current.lifecycle_state, revision: current.revision, status: planned.status, from_protocol: planned.from_protocol, to_protocol: planned.to_protocol, normalizations: planned.normalizations, health: planned.health || null, next_operation: planned.next_operation || null, next_action: plannedNextAction(planned, current) };
  } catch (error) {
    return blockedItem(file, root, current, error);
  }
}

function applyCheckpointLocked(file, root, input, ops) {
  let current;
  try {
    current = readCheckpoint(file, ops);
    if (input.workId && current.work_id !== input.workId) return null;
    const planned = planCheckpoint(current, {
      ...input,
      expectedRevision: current.revision,
      sourceRevision: current.source_revision
    }, candidate => ops.assertCheckpoint(candidate, root));
    const item = {
      work_id: current.work_id, path: relativeItemPath(file, root), lifecycle_state: current.lifecycle_state,
      revision: current.revision, status: planned.status, from_protocol: planned.from_protocol,
      to_protocol: planned.to_protocol, normalizations: planned.normalizations,
      next_action: plannedNextAction(planned, current), health: planned.health || null, next_operation: planned.next_operation || null
    };
    if (planned.status === 'correction_authorization_required') {
      const normalizations = ['reconciled feedback correction next action'];
      const entry = historyEntry(current, planned.to_protocol, input, normalizations);
      const candidate = { ...current, revision: current.revision + 1, next_action: planned.next_operation, protocol_migration_history: [...(Array.isArray(current.protocol_migration_history) ? current.protocol_migration_history : []), entry] };
      ops.assertCheckpoint(candidate, root);
      ops.atomicReplace(file, candidate);
      return { ...item, status: 'applied', revision: candidate.revision, normalizations, next_action: candidate.next_action };
    }
    if (planned.status !== 'upgrade') return item;
    ops.atomicReplace(file, planned.checkpoint);
    return { ...item, status: 'applied', revision: planned.checkpoint.revision, next_action: fallback(planned.checkpoint.next_action, item.next_action) };
  } catch (error) {
    return blockedItem(file, root, current || {}, error);
  }
}

function applyCheckpointFile(file, root, input, ops) { return ops.withLock(file, () => applyCheckpointLocked(file, root, input, ops)); }

function upgradeActiveCheckpoints(root, options, ops) {
  const input = { ...options, targetProtocol: options.targetProtocol || 'auto' };
  validateAttribution(input);
  const files = filesFor(root);
  const mode = options.mode || (options.apply === true ? 'apply_approved' : 'audit');
  if (!['audit', 'dry_run', 'apply_safe', 'apply_approved'].includes(mode)) gate('checkpoint upgrade mode invalid');
  if (mode === 'apply_approved') {
    const applied = files.map(file => applyCheckpointFile(file, root, input, ops)).filter(Boolean);
    return { schema: 'CheckpointUpgradeReport/v1', mode, root, items: applied, counts: countItems(applied) };
  }
  const items = files.map(file => itemFrom(file, root, input, ops)).filter(Boolean);
  return { schema: 'CheckpointUpgradeReport/v1', mode, root, items, counts: countItems(items) };
}

function countItems(items) {
  return items.reduce((counts, item) => { counts[item.status] = (counts[item.status] || 0) + 1; return counts; }, {});
}

module.exports = { CURRENT_SCHEMA, PROTOCOLS, LEGACY_PROTOCOLS, planCheckpoint, upgradeCheckpointFile, upgradeActiveCheckpoints, filesFor, normalizeFingerprintScope };
