/* Scope and review convergence policy. This module is deliberately host and
 * product independent: it validates declared boundaries, not source contents. */
'use strict';

const crypto = require('crypto');

const TRIAGE_DISPOSITIONS = Object.freeze([
  'blocking_current_ac', 'critical_regression', 'new_requirement',
  'follow_up', 'advisory', 'invalid_or_unproven'
]);
const BLOCKING_DISPOSITIONS = new Set(['blocking_current_ac', 'critical_regression']);
const SCOPE_POLICY = 'scope-triage/v1';

function gate(message, code = 'GATE_BLOCKED') {
  /** @type {Error & { code?: string }} */
  const error = new Error(message);
  error.code = code;
  throw error;
}

function required(value, name) {
  if (typeof value !== 'string' || !value.trim()) gate(`${name} missing`);
  return value;
}

function list(value, name, requiredList = false) {
  if (!Array.isArray(value) || (requiredList && value.length === 0) || value.some(item => typeof item !== 'string' || !item.trim())) gate(`${name} invalid`);
  if (new Set(value).size !== value.length) gate(`${name} duplicate`);
  return value;
}

function safePath(value, name) {
  required(value, name);
  if (value.startsWith('/') || value.includes('\\') || value.includes(':') || value.split('/').some(part => !part || part === '.' || part === '..')) gate(`${name} unsafe`);
  return value;
}

function safePaths(value, name, requiredList = false) {
  list(value, name, requiredList).forEach(item => safePath(item, name));
  return value;
}

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

function digest(value) { return crypto.createHash('sha256').update(stable(value)).digest('hex'); }

function policyActive(checkpoint) { return checkpoint?.assurance_policy?.scope_triage === true; }

function scopeClassificationValid(scope) {
  if (scope.implementation_paths !== undefined) safePaths(scope.implementation_paths, 'implementation scope implementation paths', true);
  if (scope.documentation_paths !== undefined) safePaths(scope.documentation_paths, 'implementation scope documentation paths');
  const declaredImplementation = new Set(scope.implementation_paths || scope.allowed_paths);
  const declaredDocumentation = new Set(scope.documentation_paths || []);
  if ([...declaredImplementation].some(item => !scope.allowed_paths.includes(item)) || [...declaredDocumentation].some(item => !scope.allowed_paths.includes(item))) gate('implementation scope path classification exceeds allowed paths');
  if ([...declaredImplementation].some(item => declaredDocumentation.has(item))) gate('implementation scope path classification overlaps');
}

function scopeContractValid(scope, checkpoint) {
  if (!scope || scope.schema !== 'ImplementationScope/v1') gate('implementation scope contract invalid');
  required(scope.scope_id, 'implementation scope id');
  if (scope.work_id !== checkpoint.work_id || scope.source_revision !== checkpoint.source_revision) gate('implementation scope binding invalid');
  list(scope.ac_ids, 'implementation scope AC ids', true);
  if (scope.ac_ids.some(id => !checkpoint.acceptance_manifest.ac_ids.includes(id))) gate('implementation scope AC binding invalid');
  safePaths(scope.allowed_paths, 'implementation scope paths', true);
  scopeClassificationValid(scope);
  list(scope.changed_symbols, 'implementation scope symbols');
  list(scope.non_goals, 'implementation scope non-goals');
  list(scope.acceptance_trace, 'implementation scope acceptance trace', true);
  list(scope.behavior_trace, 'implementation scope behavior trace', true);
  list(scope.test_trace, 'implementation scope test trace', true);
  list(scope.diagnostic_trace, 'implementation scope diagnostic trace', true);
  if (!scope.attribution || typeof scope.attribution !== 'object') gate('implementation scope attribution invalid');
  required(scope.attribution.thread_id, 'implementation scope attribution thread');
  required(scope.attribution.pointer, 'implementation scope attribution pointer');
  required(scope.owner, 'implementation scope owner');
  required(scope.created_at, 'implementation scope timestamp');
  if (!Number.isFinite(Date.parse(scope.created_at))) gate('implementation scope timestamp invalid');
  return scope;
}

function scopeAudit(checkpoint, root) {
  const scope = checkpoint.scope_contract;
  if (!policyActive(checkpoint)) return { status: 'not_required', scope_digest: null };
  scopeContractValid(scope, checkpoint);
  const allowed = new Set(checkpoint.allowed_paths);
  if (scope.allowed_paths.some(item => !allowed.has(item))) gate('implementation scope exceeds allowed paths');
  const fingerprint = new Set([...(checkpoint.implementation_paths || checkpoint.fingerprint_paths || []), ...(checkpoint.documentation_paths || [])]);
  if (scope.allowed_paths.some(item => !fingerprint.has(item))) gate('implementation scope is not fingerprinted');
  const scopeDigest = digest(scope);
  if (checkpoint.scope_contract_digest !== scopeDigest) gate('implementation scope digest invalid');
  return { status: 'pass', scope_digest: scopeDigest, root: typeof root === 'string' ? root : null };
}

function receiptFindings(checkpoint, receiptId) {
  const receipt = checkpoint.reviews.find(item => item?.receipt_id === receiptId);
  const typed = Array.isArray(receipt?.finding_objects)
    ? receipt.finding_objects.map(item => item?.finding_id).filter(Boolean)
    : [];
  if (typed.length) return new Set(typed);
  const declared = Array.isArray(receipt?.findings)
    ? receipt.findings.filter(item => typeof item === 'string' && item.trim())
    : [];
  return new Set(declared);
}

function triageFindingBinding(item, checkpoint) {
  const available = receiptFindings(checkpoint, item.receipt_id);
  if (item.finding_ids.some(id => !available.has(id))) gate('review triage finding binding invalid');
}

function triageItemPolicy(item) {
  const blocking = BLOCKING_DISPOSITIONS.has(item.disposition);
  if (blocking && item.finding_ids.length === 0) gate('blocking triage finding ids required');
  if (item.disposition === 'new_requirement' && item.finding_ids.length === 0) gate('new requirement finding ids required');
  return blocking;
}

function triageItemValid(item, checkpoint, receiptIds) {
  if (!item || typeof item !== 'object') gate('review triage item invalid');
  required(item.triage_id, 'review triage item id');
  if (!TRIAGE_DISPOSITIONS.includes(item.disposition)) gate('review triage disposition invalid');
  if (!receiptIds.has(item.receipt_id)) gate('review triage receipt binding invalid');
  list(item.finding_ids, 'review triage finding ids');
  list(item.ac_refs, 'review triage AC refs');
  triageFindingBinding(item, checkpoint);
  triageItemPolicy(item);
  if (item.ac_refs.some(id => !checkpoint.acceptance_manifest.ac_ids.includes(id))) gate('review triage AC binding invalid');
  list(item.evidence_pointers, 'review triage evidence pointers', true);
  return item;
}

function triageBindingValid(triage, checkpoint) {
  required(triage.triage_id, 'review triage id');
  if (triage.work_id !== checkpoint.work_id || triage.source_revision !== checkpoint.source_revision) gate('review triage binding invalid');
  const packet = checkpoint.review_packet;
  if (!packet || triage.packet_id !== packet.packet_id || triage.generation !== checkpoint.review_generation) gate('review triage packet binding invalid');
}
function triageReceiptsValid(triage, checkpoint) {
  if (!Array.isArray(triage.receipt_ids) || triage.receipt_ids.length !== 3 || new Set(triage.receipt_ids).size !== 3) gate('review triage requires three receipts');
  const receiptIds = new Set(checkpoint.reviews.map(review => review.receipt_id));
  if (triage.receipt_ids.some(id => !receiptIds.has(id))) gate('review triage receipt missing');
}
function triageItemsValid(triage, checkpoint) {
  if (!Array.isArray(triage.items) || !triage.items.length) gate('review triage items missing');
  const receiptIds = new Set(triage.receipt_ids);
  const itemIds = new Set();
  const findingIds = new Set();
  triage.items.forEach(item => triageItemValid(item, checkpoint, receiptIds));
  triage.items.forEach(item => {
    if (itemIds.has(item.triage_id)) gate('review triage item duplicate');
    itemIds.add(item.triage_id);
    item.finding_ids.forEach(id => {
      if (findingIds.has(id)) gate('review triage finding duplicate');
      findingIds.add(id);
    });
  });
}
function triageSummaryValid(triage) {
  required(triage.owner, 'review triage owner');
  required(triage.created_at, 'review triage timestamp');
  if (!Number.isFinite(Date.parse(triage.created_at))) gate('review triage timestamp invalid');
  const blocking = triage.items.some(item => BLOCKING_DISPOSITIONS.has(item.disposition));
  if (triage.has_blocking_current !== blocking) gate('review triage blocking summary invalid');
  if (!['accepted', 'requires_correction', 'requires_scope_decision'].includes(triage.status)) gate('review triage status invalid');
  const scopeDecision = triage.items.some(item => item.disposition === 'new_requirement');
  const expected = scopeDecision ? 'requires_scope_decision' : blocking ? 'requires_correction' : 'accepted';
  if (triage.status !== expected) gate('review triage status/disposition mismatch');
}
function triageValid(triage, checkpoint) {
  if (!triage || triage.schema !== 'ReviewSetTriage/v1') gate('review set triage invalid');
  triageBindingValid(triage, checkpoint);triageReceiptsValid(triage, checkpoint);triageItemsValid(triage, checkpoint);triageSummaryValid(triage);return triage;
}

function correctionBudget(checkpoint) {
  const limit = Number.isInteger(checkpoint.assurance_policy?.max_corrections_per_epoch)
    ? checkpoint.assurance_policy.max_corrections_per_epoch : 2;
  return { used: Number.isInteger(checkpoint.epoch_correction_count) ? checkpoint.epoch_correction_count : 0, limit };
}

function convergencePolicyHealth(checkpoint, budget) {
  if (!policyActive(checkpoint)) return null;
  if (!checkpoint.scope_contract) return 'scope_contract_required';
  if (!['EXECUTE', 'VERIFY'].includes(checkpoint.lifecycle_state) || budget.used < budget.limit) return null;
  return (checkpoint.scope_recovery_history?.length || 0) >= 1 ? 'scope_follow_up_required' : 'scope_recovery_required';
}
function convergenceHealth(checkpoint) {
  const budget = correctionBudget(checkpoint);
  if (['DELIVERY', 'COMPLETE'].includes(checkpoint.lifecycle_state)) return 'immutable';
  if (checkpoint.correction_count >= 2 && !policyActive(checkpoint)) return 'scope_audit_required';
  return convergencePolicyHealth(checkpoint, budget) || 'normal';
}

function nextReviewAction(checkpoint, reviewCount) {
  if (reviewCount < 3) return `Collect ${3 - reviewCount} remaining fresh review receipt(s).`;
  if (policyActive(checkpoint)) return 'Record ReviewSetTriage/v1 before correction or reverse validation.';
  return 'Begin bounded correction or run reverse validation.';
}

function budgetCorrectionAction(checkpoint, budget) {
  if (policyActive(checkpoint) && (checkpoint.scope_recovery_history?.length || 0) >= 1 && budget.used >= budget.limit) return 'Record ScopeFollowUpAuthorization/v1 for a bounded same-AC/file follow-up; do not repeat scope recovery in this workstream.';
  if (budget.used >= budget.limit) return 'Enter typed scope recovery; do not start another automatic correction.';
  return 'Begin one bounded correction mapped to current acceptance findings, then test and reseal.';
}
function nextCorrectionAction(checkpoint, triage) {
  if (triage?.status === 'requires_scope_decision') return 'Create a bounded follow-up task or record an attributable scope decision before correction.';
  if (triage && triage.has_blocking_current === false) return 'Run reverse validation; review findings do not block delivery.';
  return budgetCorrectionAction(checkpoint, correctionBudget(checkpoint));
}

module.exports = {
  TRIAGE_DISPOSITIONS,
  SCOPE_POLICY,
  digest,
  policyActive,
  scopeContractValid,
  scopeAudit,
  triageValid,
  correctionBudget,
  convergenceHealth,
  nextReviewAction,
  nextCorrectionAction
};
