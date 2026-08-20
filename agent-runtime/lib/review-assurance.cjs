/* Host-independent review assurance planning and batching primitives. */
'use strict';

const ponytailPolicy = require('./ponytail-policy.cjs');
const assuranceContext = require('./runtime-assurance-context.cjs');
const changeImpact = require('./change-impact.cjs');

const lenses = Object.freeze(['correctness_regression', 'edge_security_data', 'requirements_evidence']);
const compositeSections = Object.freeze(['correctness', 'requirements', 'edge_security']);
const reviewModes = Object.freeze(['exact-three', 'single-composite']);
const derivedRoots = Object.freeze([
  '.planning/agent-flow/test-output',
  'agent-runtime/.stryker-tmp',
  'agent-runtime/.vitest',
  'agent-runtime/coverage'
]);
const sensitiveKey = /^(?:password|passphrase|secret|token|api[_-]?key|authorization|bearer|cookie|set-cookie|access[_-]?token|refresh[_-]?token)$/i;
const promptLimits = Object.freeze({ observations: 12, observationChars: 400, contracts: 40, contractChars: 600, paths: 100, nextActionChars: 500, findingChars: 500 });
const preflightBrand = Symbol('review-preflight-validated');
const preflightCacheHitBrand = Symbol('review-preflight-cache-hit');

function gate(message, code = 'GATE_BLOCKED') {
  /** @type {Error & { code?: string }} */
  const error = new Error(message);
  error.code = code;
  throw error;
}

function requiredString(value, name) {
  if (typeof value !== 'string' || !value.trim()) gate(`${name} missing`);
  return value;
}

function safeRelative(value, name) {
  requiredString(value, name);
  if (value.startsWith('/') || value.includes('\\') || value.includes(':') || value.split('/').some(part => !part || part === '.' || part === '..')) gate(`${name} unsafe`);
  return value;
}

function unique(values) { return new Set(values).size === values.length; }

function deepFreeze(value, seen = new Set()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return value;
  seen.add(value);
  Reflect.ownKeys(value).forEach(key => deepFreeze(value[key], seen));
  return Object.freeze(value);
}

function cloneValue(value) {
  if (Array.isArray(value)) return value.map(cloneValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneValue(item)]));
}

function boundedText(value, maxChars) {
  const text = String(value);
  return text.length <= maxChars ? text : `${text.slice(0, maxChars)}…`;
}

function boundedStrings(values, maxItems, maxChars) {
  return values.slice(0, maxItems).map(value => boundedText(value, maxChars));
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (!value || typeof value !== 'object') return JSON.stringify(value);
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
}

function arrayOfStrings(values, name, required = false) {
  if (!Array.isArray(values) || (required && !values.length) || !values.every(value => typeof value === 'string' && value.trim())) gate(`${name} invalid`);
  if (!unique(values)) gate(`${name} duplicate`);
  return values;
}

function hashList(values, name) {
  if (!Array.isArray(values)) gate(`${name} invalid`);
  const result = values.map(value => {
    if (!value || typeof value !== 'object') gate(`${name} entry invalid`);
    safeRelative(value.path, `${name} path`);
    if (!/^[a-f0-9]{64}$/.test(value.sha256)) gate(`${name} hash invalid`);
    return { path: value.path, sha256: value.sha256 };
  });
  if (!unique(result.map(value => value.path))) gate(`${name} duplicate`);
  return result;
}

function timestamp(value, name, now, allowFuture = false) {
  requiredString(value, name);
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || (!allowFuture && parsed > now + 300000)) gate(`${name} invalid`);
  return parsed;
}

function packetNumberFields(packet) {
  for (const key of ['packet_version', 'wave', 'generation', 'sealed_revision']) {
    if (!Number.isInteger(packet[key]) || packet[key] < 1) gate(`packet ${key} invalid`);
  }
}
function packetIdentity(packet) {
  requiredString(packet.packet_id, 'packet id');
  requiredString(packet.source_revision, 'packet source revision');
  if (!/^[a-f0-9]{64}$/.test(packet.implementation_fingerprint)) gate('packet fingerprint invalid');
}
function nonEmptyArray(value) { return Array.isArray(value) && value.length > 0; }
function packetContextValid(packet) {
  const acceptance = packet.observable_acceptance || packet.acceptance_manifest || packet.acceptance;
  if (!nonEmptyArray(acceptance)) gate('packet acceptance context missing');
  if (!nonEmptyArray(packet.review_scope?.paths)) gate('packet review scope missing');
  if (!nonEmptyArray(packet.acceptance_trace)) gate('packet acceptance trace missing');
  if (!nonEmptyArray(packet.non_goals)) gate('packet non-goals missing');
}
function packetCore(packet, requireContext = true) {
  if (!packet || typeof packet !== 'object') gate('review packet missing');
  packetIdentity(packet); packetNumberFields(packet);
  if (requireContext) packetContextValid(packet);
  return packet;
}

function profileCore(profile) {
  if (!profile || typeof profile !== 'object') gate('review profile missing');
  requiredString(profile.model, 'review model');
  requiredString(profile.reasoning, 'review reasoning');
  if (profile.available !== true || profile.attestable !== true) gate('review profile unavailable');
  return profile;
}

function leaseCore(lease, now) {
  if (!lease || typeof lease !== 'object' || lease.status !== 'active') gate('review lease invalid');
  if (timestamp(lease.expires_at, 'review lease expiry', now, true) <= now) gate('review lease expired');
  return lease;
}

function compositeEligible(input) {
  const blocked = [
    input.risk === 'high',
    input.security_risk === true,
    input.data_loss_risk === true,
    input.runtime_gap === true,
    input.public_contract === true,
    input.migration === true,
    input.destructive === true,
    Array.isArray(input.dirty_overlap) && input.dirty_overlap.length > 0,
    input.policy_authorized !== true
  ];
  return !blocked.some(Boolean);
}

function reviewMode(input) {
  const mode = input.review_mode || 'exact-three';
  if (!reviewModes.includes(mode)) gate('review mode invalid');
  if (mode === 'single-composite' && !compositeEligible(input)) gate('single-composite review policy not eligible');
  return mode;
}

function requiredReviewerCount(mode) { return mode === 'single-composite' ? 1 : 3; }

function capabilityEpoch(input) { return input.capability_epoch === undefined ? 'host-default' : requiredString(input.capability_epoch, 'capability epoch'); }

function snapshotFrom(input, packet, profile, mode, now) {
  const sourceHashes = hashList(input.source_hashes, 'source hashes');
  const documentHashes = hashList(input.document_hashes, 'document hashes');
  const lease = leaseCore(input.lease, now);
  const snapshot = {
    source_revision: packet.source_revision,
    sealed_revision: packet.sealed_revision,
    implementation_fingerprint: packet.implementation_fingerprint,
    packet_id: packet.packet_id,
    packet_version: packet.packet_version,
    wave: packet.wave,
    generation: packet.generation,
    source_hashes: sourceHashes,
    document_hashes: documentHashes,
    profile: { model: profile.model, reasoning: profile.reasoning },
    capability_epoch: capabilityEpoch(input),
    lease_expires_at: lease.expires_at
  };
  return { snapshot, sourceHashes, documentHashes, lease };
}

function impactMetadata(input, packet) {
  if (input.change_impact_assessment === undefined || input.change_impact_assessment === null) return {};
  const assessment = changeImpact.validate(input.change_impact_assessment, { work_id: input.work_id, source_revision: packet.source_revision });
  if (assessment.phase !== 'post' || ['blocked', 'full_profile_required'].includes(assessment.status) || assessment.unknown_edges.length || assessment.unverified_edges.length || assessment.unexpected_paths.length) gate('review preflight change impact profile incomplete');
  return { change_impact_assessment_id: assessment.assessment_id, change_impact_digest: assessment.digest, change_impact_status: assessment.status, change_impact_test_profile: assessment.predicted_test_profile };
}

function compactImpactMetadata(receipt) {
  if (!receipt?.change_impact_assessment_id) return {};
  return {
    change_impact_assessment_id: receipt.change_impact_assessment_id,
    change_impact_digest: receipt.change_impact_digest,
    change_impact_status: receipt.change_impact_status,
    change_impact_test_profile: receipt.change_impact_test_profile
  };
}

function preflightEligibility(input, packet, mode, dirtyOverlap) {
  if (dirtyOverlap.length) gate('dirty overlap blocks review preflight');
  if (input.active_dispatch !== null && input.active_dispatch !== undefined) gate('active review dispatch exists');
  if (input.previous_packet_id !== null && input.previous_packet_id !== undefined && input.previous_packet_id === packet.packet_id) gate('previous packet is still active');
  if (!Number.isInteger(input.reviewer_slots) || input.reviewer_slots < requiredReviewerCount(mode)) gate('reviewer slots unavailable');
}

function preflightMetadata(input, packet, now, options = {}) {
  const operationId = input.operation_id || `preflight-${packet.packet_id}-${packet.generation}`;
  requiredString(operationId, 'preflight operation id');
  const createdAt = options.created_at || new Date(now).toISOString();
  timestamp(createdAt, 'preflight timestamp', now);
  return { operationId, createdAt };
}

function preflightReceipt(input, packet, profile, mode, dirtyOverlap, snapshot, sourceHashes, documentHashes, lease, operationId, createdAt, cacheHit = false) {
  const nextAction = mode === 'exact-three' ? 'Dispatch exactly three independent blind reviewers.' : 'Dispatch one authorized composite reviewer.';
  const context = assuranceContext.build({
    work_id: input.work_id,
    source_revision: packet.source_revision,
    lifecycle_state: 'VERIFY',
    sealed_revision: packet.sealed_revision,
    implementation_fingerprint: packet.implementation_fingerprint,
    packet_id: packet.packet_id,
    packet_version: packet.packet_version,
    wave: packet.wave,
    generation: packet.generation,
    review_mode: mode,
    requested_reviewers: requiredReviewerCount(mode),
    capability_epoch: capabilityEpoch(input),
    lease_expires_at: lease.expires_at,
    next_action: nextAction
  });
  const impact = impactMetadata(input, packet);
  const receipt = {
    schema: 'ReviewPreflight/v1', status: 'pass', operation_id: operationId,
    work_id: requiredString(input.work_id, 'preflight work id'), source_revision: packet.source_revision,
    sealed_revision: packet.sealed_revision, implementation_fingerprint: packet.implementation_fingerprint,
    packet_id: packet.packet_id, packet_version: packet.packet_version, wave: packet.wave, generation: packet.generation,
    review_mode: mode, requested_reviewers: requiredReviewerCount(mode),
    dirty_overlap: dirtyOverlap, source_hashes: sourceHashes, document_hashes: documentHashes,
    profile: { model: profile.model, reasoning: profile.reasoning, attestable: profile.attestable },
    lease: { status: lease.status, expires_at: lease.expires_at }, capability_epoch: capabilityEpoch(input),
    active_dispatch: false, previous_packet_id: input.previous_packet_id ?? null,
    ...impact, snapshot: { ...snapshot, ...impact, context_id: context.context_id }, context_id: context.context_id, created_at: createdAt,
    next_action: nextAction
  };
  Object.defineProperty(receipt, preflightBrand, { value: true, enumerable: false });
  Object.defineProperty(receipt, preflightCacheHitBrand, { value: cacheHit === true, enumerable: false });
  return deepFreeze(receipt);
}

function cachedPreflightReceipt(receipt) {
  const copy = cloneValue(receipt);
  Object.defineProperty(copy, preflightBrand, { value: true, enumerable: false });
  Object.defineProperty(copy, preflightCacheHitBrand, { value: true, enumerable: false });
  return deepFreeze(copy);
}

function preflightCacheKey(input, packet, profile, mode) {
  return stableJson({
    packet_id: packet.packet_id,
    generation: packet.generation,
    sealed_revision: packet.sealed_revision,
    implementation_fingerprint: packet.implementation_fingerprint,
    source_revision: packet.source_revision,
    source_hashes: input.source_hashes || null,
    document_hashes: input.document_hashes || null,
    change_impact: input.change_impact_assessment ? changeImpact.digest(input.change_impact_assessment) : null,
    profile: { model: profile.model, reasoning: profile.reasoning, attestable: profile.attestable },
    lease: input.lease || null,
    capability_epoch: capabilityEpoch(input),
    review_mode: mode,
    dirty_overlap: input.dirty_overlap || []
  });
}

function cachedPreflight(cache, cacheKey, epoch, input, now) {
  if (!cache || typeof cache.get !== 'function') return null;
  const cached = cache.get(cacheKey, epoch);
  if (!cached) return null;
  validatePreflightShape(cached, input, { now });
  validateSnapshot(cached);
  const hit = cachedPreflightReceipt(cached);
  validatePreflight(hit, input, { now });
  return hit;
}

function preflight(input, options = {}) {
  if (!input || typeof input !== 'object') gate('review preflight input required');
  const now = Number.isFinite(options.now) ? options.now : Date.now();
  const packet = packetCore(input.packet);
  const profile = profileCore(input.profile);
  const mode = reviewMode(input);
  const cache = options.preflightCache;
  const cacheKey = cache ? preflightCacheKey(input, packet, profile, mode) : null;
  const epoch = capabilityEpoch(input);
  const hit = cachedPreflight(cache, cacheKey, epoch, input, now);
  if (hit) return hit;
  const { snapshot, sourceHashes, documentHashes, lease } = snapshotFrom(input, packet, profile, mode, now);
  const dirtyOverlap = arrayOfStrings(input.dirty_overlap || [], 'dirty overlap');
  preflightEligibility(input, packet, mode, dirtyOverlap);
  const { operationId, createdAt } = preflightMetadata(input, packet, now, options);
  const receipt = preflightReceipt(input, packet, profile, mode, dirtyOverlap, snapshot, sourceHashes, documentHashes, lease, operationId, createdAt, false);
  if (cache && typeof cache.set === 'function') cache.set(cacheKey, receipt, epoch);
  return receipt;
}

function validatePreflightChangeImpact(receipt) {
  if (receipt.change_impact_assessment_id === undefined) return;
  requiredString(receipt.change_impact_assessment_id, 'preflight change impact assessment id');
  if (!/^[a-f0-9]{64}$/.test(receipt.change_impact_digest || '')) gate('preflight change impact digest invalid');
  if (!['pass', 'warning'].includes(receipt.change_impact_status)) gate('preflight change impact status invalid');
  if (!['focused', 'expanded', 'full'].includes(receipt.change_impact_test_profile)) gate('preflight change impact profile invalid');
}
function validatePreflightShape(receipt, expected, options) {
  if (!receipt || receipt.schema !== 'ReviewPreflight/v1' || receipt.status !== 'pass') gate('review preflight receipt invalid');
  requiredString(receipt.operation_id, 'preflight operation id');
  requiredString(receipt.work_id, 'preflight work id');
  packetCore({ packet_id: receipt.packet_id, packet_version: receipt.packet_version, wave: receipt.wave, generation: receipt.generation, sealed_revision: receipt.sealed_revision, source_revision: receipt.source_revision, implementation_fingerprint: receipt.implementation_fingerprint }, false);
  reviewMode({ review_mode: receipt.review_mode, risk: expected?.risk, dirty_overlap: receipt.dirty_overlap, policy_authorized: true });
  if (receipt.active_dispatch !== false || receipt.dirty_overlap.length !== 0) gate('review preflight snapshot invalid');
  hashList(receipt.source_hashes, 'preflight source hashes');
  hashList(receipt.document_hashes, 'preflight document hashes');
  profileCore({ ...receipt.profile, available: true, attestable: receipt.profile.attestable });
  validatePreflightChangeImpact(receipt);
  const now = Number.isFinite(options.now) ? options.now : Date.now();
  leaseCore(receipt.lease, now);
  timestamp(receipt.created_at, 'preflight timestamp', now);
  return now;
}

function equalJson(left, right) { return JSON.stringify(left) === JSON.stringify(right); }

function validateSnapshotFields(snapshot, receipt) {
  for (const key of ['source_revision', 'sealed_revision', 'implementation_fingerprint', 'packet_id', 'packet_version', 'wave', 'generation', 'context_id']) {
    if (snapshot[key] !== receipt[key]) gate(key === 'implementation_fingerprint' ? 'preflight implementation_fingerprint binding invalid' : 'review preflight snapshot binding invalid');
  }
  for (const key of ['change_impact_assessment_id', 'change_impact_digest', 'change_impact_status', 'change_impact_test_profile']) if (snapshot[key] !== receipt[key]) gate('review preflight change impact binding invalid');
}

function validateSnapshotMetadata(snapshot, receipt) {
  if (!snapshot.profile || snapshot.profile.model !== receipt.profile.model || snapshot.profile.reasoning !== receipt.profile.reasoning || snapshot.capability_epoch !== receipt.capability_epoch || snapshot.lease_expires_at !== receipt.lease.expires_at) gate('review preflight snapshot binding invalid');
}

function validateSnapshot(receipt) {
  const snapshot = receipt.snapshot;
  if (!snapshot || typeof snapshot !== 'object') gate('review preflight snapshot invalid');
  validateSnapshotFields(snapshot, receipt);
  if (!equalJson(snapshot.source_hashes, receipt.source_hashes) || !equalJson(snapshot.document_hashes, receipt.document_hashes)) gate('review preflight snapshot hashes invalid');
  validateSnapshotMetadata(snapshot, receipt);
}

function validateExpectedCoreBindings(receipt, expected) {
  for (const key of ['work_id', 'source_revision', 'sealed_revision', 'implementation_fingerprint', 'packet_id', 'packet_version', 'wave', 'generation']) {
    const expectedValue = expected[key] ?? expected.packet?.[key];
    if (expectedValue !== undefined && expectedValue !== receipt[key]) gate(`preflight ${key} binding invalid`);
  }
}

function validateExpectedReviewBindings(receipt, expected) {
  if (expected.review_mode !== undefined && expected.review_mode !== receipt.review_mode) gate('preflight review mode binding invalid');
  if (expected.requested_reviewers !== undefined && expected.requested_reviewers !== receipt.requested_reviewers) gate('preflight reviewer count binding invalid');
}

function validateExpectedHashBindings(receipt, expected) {
  if (expected.source_hashes !== undefined && !equalJson(expected.source_hashes, receipt.source_hashes)) gate('preflight source hashes binding invalid');
  if (expected.document_hashes !== undefined && !equalJson(expected.document_hashes, receipt.document_hashes)) gate('preflight document hashes binding invalid');
}

function validateExpectedCapabilityBinding(receipt, expected) {
  if (expected.capability_epoch !== undefined && expected.capability_epoch !== receipt.capability_epoch) gate('preflight capability epoch stale');
}

function validatePreflightBindings(receipt, expected) {
  if (!expected) return;
  validateExpectedCoreBindings(receipt, expected);
  validateExpectedReviewBindings(receipt, expected);
  validateExpectedHashBindings(receipt, expected);
  validateExpectedCapabilityBinding(receipt, expected);
}

function validatePreflight(receipt, expected, options = {}) {
  if (!receipt?.[preflightBrand]) {
    validatePreflightShape(receipt, expected, options);
    validateSnapshot(receipt);
  }
  validatePreflightBindings(receipt, expected);
  if (receipt.context_id) {
    const context = assuranceContext.build({
      work_id: receipt.work_id,
      source_revision: receipt.source_revision,
      lifecycle_state: 'VERIFY',
      sealed_revision: receipt.sealed_revision,
      implementation_fingerprint: receipt.implementation_fingerprint,
      packet_id: receipt.packet_id,
      packet_version: receipt.packet_version,
      wave: receipt.wave,
      generation: receipt.generation,
      review_mode: receipt.review_mode,
      requested_reviewers: receipt.requested_reviewers,
      capability_epoch: receipt.capability_epoch,
      lease_expires_at: receipt.lease.expires_at,
      next_action: receipt.next_action
    });
    if (context.context_id !== receipt.context_id) gate('review preflight assurance context binding invalid');
  }
  return receipt;
}

function compactPromptValue(value) {
  if (!value || typeof value !== 'object') return boundedText(value, promptLimits.contractChars);
  const allowed = ['id', 'br', 'sr', 'ac', 'pointer', 'title', 'definition', 'scope', 'path', 'evidence'];
  const compact = {};
  for (const key of allowed) {
    if (value[key] === undefined) continue;
    compact[key] = Array.isArray(value[key]) ? boundedStrings(value[key].filter(item => typeof item === 'string'), 8, promptLimits.observationChars) : boundedText(value[key], promptLimits.contractChars);
  }
  return compact;
}

function compactPromptList(value, maxItems, maxChars) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, maxItems).map(item => typeof item === 'string' ? boundedText(item, maxChars) : compactPromptValue(item));
}

function promptAcceptance(packet) { return packet.observable_acceptance || packet.acceptance_manifest || packet.acceptance || []; }
function promptTrace(packet) { return packet.acceptance_trace || packet.review_scope?.acceptance_trace || []; }
function promptNonGoals(packet) { return packet.non_goals || packet.review_scope?.non_goals || []; }
function promptSymbols(packet) { return packet.review_scope?.symbols || packet.review_scope?.changed_symbols || []; }
function compactPromptBase(packet, preflightReceipt, externalObservations = []) {
  arrayOfStrings(externalObservations, 'external observations');
  return {
    preflight_id: preflightReceipt.operation_id, assurance_context_id: preflightReceipt.context_id || null, packet_id: packet.packet_id, fingerprint: preflightReceipt.implementation_fingerprint,
    source_revision: preflightReceipt.source_revision, sealed_revision: preflightReceipt.sealed_revision,
    acceptance_manifest: compactPromptList(promptAcceptance(packet), promptLimits.contracts, promptLimits.contractChars),
    acceptance_trace: compactPromptList(promptTrace(packet), promptLimits.contracts, promptLimits.contractChars),
    scope: compactPromptList(packet.review_scope?.paths || [], promptLimits.paths, promptLimits.observationChars),
    changed_symbols: compactPromptList(promptSymbols(packet), promptLimits.paths, promptLimits.observationChars),
    non_goals: compactPromptList(promptNonGoals(packet), promptLimits.contracts, promptLimits.contractChars),
    external_observations: boundedStrings(externalObservations, promptLimits.observations, promptLimits.observationChars),
    change_impact: preflightReceipt.change_impact_assessment_id ? { assessment_id: preflightReceipt.change_impact_assessment_id, digest: preflightReceipt.change_impact_digest, status: preflightReceipt.change_impact_status, predicted_test_profile: preflightReceipt.change_impact_test_profile } : null,
    forbidden_context: ['implementation-notes', 'prior-review-history', 'historical-QD3', 'broad-repository-scan']
  };
}

function promptPayloadFromBase(base, lens) {
  requiredString(lens, 'review lens');
  if (!lenses.includes(lens) && lens !== 'single-composite') gate('review lens invalid');
  return { ...base, lens, sections: lens === 'single-composite' ? compositeSections : undefined };
}

function promptPayload(packet, preflightReceipt, lens, externalObservations = []) {
  return promptPayloadFromBase(compactPromptBase(packet, preflightReceipt, externalObservations), lens);
}

function buildReviewerPromptFactory(packet, preflightReceipt, externalObservations = []) {
  const base = compactPromptBase(packet, preflightReceipt, externalObservations);
  return lens => `Review only the frozen external contract. Return a typed receipt.\n${JSON.stringify(promptPayloadFromBase(base, lens))}`;
}

function buildReviewerPrompt(packet, preflightReceipt, lens, externalObservations = []) {
  return `Review only the frozen external contract. Return a typed receipt.\n${JSON.stringify(promptPayload(packet, preflightReceipt, lens, externalObservations))}`;
}

function expectedLenses(mode) { return mode === 'single-composite' ? ['single-composite'] : lenses; }

function batchEntryValid(entry, seen, expectedLens) {
  if (!entry || typeof entry !== 'object') gate('review batch entry invalid');
  for (const key of ['handle_id', 'task_id', 'dispatch_id', 'reviewer_id']) requiredString(entry[key], `review batch ${key}`);
  if (!expectedLens.includes(entry.lens)) gate('review batch lens invalid');
  for (const key of ['handle_id', 'task_id', 'dispatch_id', 'reviewer_id', 'lens']) {
    if (seen[key].has(entry[key])) gate(`review batch duplicate ${key}`);
    seen[key].add(entry[key]);
  }
}

function batchId(input, receipt) { return input.batch_id || `review-batch-${receipt.packet_id}-${receipt.generation}`; }

function reserveBatch(input, host, receipt, expected) {
  const reservation = host.reserve({ preflight: receipt, lenses: expected, packet: input.packet });
  const entries = Array.isArray(reservation) ? reservation : reservation?.entries;
  if (!Array.isArray(entries) || entries.length !== expected.length) gate('review batch reservation incomplete');
  const seen = { handle_id: new Set(), task_id: new Set(), dispatch_id: new Set(), reviewer_id: new Set(), lens: new Set() };
  entries.forEach((entry, index) => batchEntryValid(entry, seen, expected[index]));
  return { reservation, entries };
}

function startReviewEntries(input, host, receipt, expected, id, entries) {
  const started = [];
  const buildPrompt = buildReviewerPromptFactory(input.packet, receipt, input.external_observations || []);
  try {
    entries.forEach((entry, index) => {
      const prompt = buildPrompt(expected[index]);
      const handle = host.spawn({ batch_id: id, entry, prompt, snapshot: receipt.snapshot });
      if (handle === undefined || handle === null) gate('review handle missing');
      const hostHandle = String(handle);
      requiredString(hostHandle, 'review handle');
      started.push({ ...entry, host_handle: hostHandle });
    });
  } catch (error) {
    if (typeof host.cancel !== 'function') gate('review dispatch failed without cancellable host', 'GAP-AGENT-HANDLE-RELEASE-001');
    host.cancel({ batch_id: id, entries: started });
    gate(`review batch dispatch failed: ${error.message}`);
  }
  return started;
}

function reviewPolicy(input) {
  if (input.policy_decision === undefined) return undefined;
  const expectedPhase = input.policy_phase || (input.policy_decision.role === 'blind-architect' ? 'architect' : 'review');
  const decision = ponytailPolicy.validateDecision(input.policy_decision, { phase: expectedPhase, mutation: false });
  if (decision.mode !== 'off' || !['correctness-reviewer', 'security-data-migration-reviewer', 'verifier', 'blind-architect'].includes(decision.role)) gate('review dispatch Ponytail policy must be off');
  return decision;
}

function dispatchReviewBatch(input, host, options = {}) {
  if (!host || typeof host.reserve !== 'function' || typeof host.spawn !== 'function') gate('review batch host adapter unavailable', 'GAP-REVIEW-HOST-ADAPTER-001');
  const policy = reviewPolicy(input);
  const receipt = validatePreflight(preflight(input, options), input, options);
  const expected = expectedLenses(receipt.review_mode);
  const { reservation, entries } = reserveBatch(input, host, receipt, expected);
  const id = batchId(input, receipt);
  const started = startReviewEntries(input, host, receipt, expected, id, entries);
  const createdAt = options.created_at || receipt.created_at;
  const batch = {
    schema: 'ReviewBatch/v1', status: 'running', batch_id: id, operation_id: receipt.operation_id, work_id: receipt.work_id,
    packet_id: receipt.packet_id, fingerprint: receipt.implementation_fingerprint, review_mode: receipt.review_mode,
    ...compactImpactMetadata(receipt),
    requested: expected.length, started: started.length, completed: 0, cancelled: 0, entries: started,
    preflight_id: receipt.operation_id, assurance_context_id: receipt.context_id || null, created_at: createdAt, next_action: 'Wait for the review batch summary.'
  };
  return { preflight: receipt, reservation, batch, summary: executionSummary({ status: 'running', duration_ms: 0, preflight: 'pass', cache: { preflight_hit: receipt[preflightCacheHitBrand] === true }, reviewers: { requested: expected.length, started: started.length, completed: 0, cancelled: 0 }, policy, next_action: batch.next_action }) };
}

function count(value, name) { if (!Number.isInteger(value) || value < 0) gate(`${name} invalid`);return value; }

function validateWaitRequest(batch, host, timeoutMs) {
  if (!batch || batch.schema !== 'ReviewBatch/v1' || !['running', 'complete', 'blocked'].includes(batch.status)) gate('review batch invalid');
  if (!host || typeof host.wait !== 'function') gate('review batch wait host adapter unavailable', 'GAP-REVIEW-HOST-ADAPTER-001');
  if (!Number.isInteger(timeoutMs) || timeoutMs < 0 || timeoutMs > 300000) gate('review batch timeout invalid');
}

function waitCounts(result, batch) {
  const completed = count(result.completed ?? 0, 'completed count');
  const running = count(result.running ?? 0, 'running count');
  const blocked = count(result.blocked ?? 0, 'blocked count');
  const cancelled = count(result.cancelled ?? 0, 'cancelled count');
  if (completed + running + blocked + cancelled > batch.requested) gate('review batch counts exceed request');
  return { completed, running, blocked, cancelled, next_poll_ms: count(result.next_poll_ms ?? 10000, 'next poll') };
}

function waitReviewBatch(batch, host, timeoutMs = 10000) {
  validateWaitRequest(batch, host, timeoutMs);
  const result = host.wait(batch.batch_id, timeoutMs) || {};
  return { batch_id: batch.batch_id, ...waitCounts(result, batch) };
}

function summaryReviewers(input) {
  const reviewers = input.reviewers || {};
  return { requested: count(reviewers.requested ?? 0, 'requested reviewers'), started: count(reviewers.started ?? 0, 'started reviewers'), completed: count(reviewers.completed ?? 0, 'completed reviewers'), cancelled: count(reviewers.cancelled ?? 0, 'cancelled reviewers') };
}

function summaryCache(input) {
  const cache = input.cache || {};
  return { profile_hit: cache.profile_hit === true, preflight_hit: cache.preflight_hit === true };
}

function summaryPolicy(input) {
  if (input.policy !== undefined) return ponytailPolicy.compact(input.policy);
  if (input.policy_decision !== undefined) return ponytailPolicy.compact(input.policy_decision);
  return undefined;
}

function telemetryObject(input, key, error) {
  const value = input[key];
  if (value === undefined) return {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) gate(`${error} invalid`);
  return Object.fromEntries(Object.entries(value).map(([name, countValue]) => [requiredString(name, `${error} key`), count(countValue, error)]));
}
function summaryTelemetryCounts(input) { const value = telemetryObject(input, 'operation_counts', 'operation count'); return Object.keys(value).length ? { operation_counts: value } : {}; }
function summaryTelemetryIdentity(input) {
  const result = {};
  for (const key of ['agent_profile', 'model', 'reasoning']) if (input[key] !== undefined) result[key] = requiredString(input[key], key);
  if (input.evidence_pointers !== undefined) result.evidence_pointers = boundedStrings(arrayOfStrings(input.evidence_pointers, 'evidence pointers'), 100, 500);
  return result;
}
function summaryTelemetry(input) {
  /** @type {Record<string, any>} */
  const result = { ...summaryTelemetryCounts(input), ...summaryTelemetryIdentity(input) };
  for (const key of ['bytes_read', 'bytes_emitted']) if (input[key] !== undefined) result[key] = count(input[key], key);
  if (input.token_telemetry !== undefined) result.token_telemetry = telemetryObject(input, 'token_telemetry', 'token telemetry value');
  return result;
}

function executionSummary(input = {}) {
  const nextAction = input.next_action === undefined ? 'No next action recorded.' : input.next_action;
  const summary = {
    status: input.status || 'unknown', passed: count(input.passed ?? 0, 'passed count'), failed: count(input.failed ?? 0, 'failed count'),
    duration_ms: count(input.duration_ms ?? 0, 'duration'), preflight: input.preflight || 'not_run',
    reviewers: summaryReviewers(input), cache: summaryCache(input),
    artifacts: boundedStrings(arrayOfStrings(input.artifacts || [], 'summary artifacts'), 100, 500), next_action: boundedText(requiredString(nextAction, 'next action'), promptLimits.nextActionChars)
  };
  const policy = summaryPolicy(input);
  if (policy) summary.policy = policy;
  Object.assign(summary, summaryTelemetry(input));
  return summary;
}

function redactStructured(value) {
  if (Array.isArray(value)) return value.map(redactStructured);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sensitiveKey.test(key) ? '[REDACTED]' : redactStructured(item)]));
}

function redactLine(line) {
  const trimmed = line.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try { return JSON.stringify(redactStructured(JSON.parse(trimmed))); } catch { /* fall through to text redaction */ }
  }
  return line.replace(/((?:["']?)(?:password|passphrase|secret|token|api[_-]?key|authorization|bearer|cookie|set-cookie|access[_-]?token|refresh[_-]?token)(?:["']?\s*[:=]\s*))(["']?)([^"',;}\s]+)\2/gi, '$1$2[REDACTED]$2');
}

function redact(value) { return String(value).split(/\r?\n/).map(redactLine).join('\n'); }
function limitedLines(value, maxLines, maxCharsPerLine = 2000) { return redact(value).split(/\r?\n/).slice(0, maxLines).map(line => boundedText(line, maxCharsPerLine)).join('\n'); }
function compactFindings(values) {
  if (!Array.isArray(values)) return [];
  return values.slice(0, 100).map(value => {
    if (!value || typeof value !== 'object') return { message: boundedText(value, promptLimits.findingChars) };
    const result = {};
    for (const key of ['id', 'status', 'code', 'severity', 'path', 'line', 'duration_ms', 'error']) if (value[key] !== undefined) result[key] = typeof value[key] === 'string' ? boundedText(value[key], promptLimits.findingChars) : value[key];
    return result;
  });
}
function evidencePayload(payload, summary, options) {
  return { summary, findings: compactFindings(payload.findings), artifacts: boundedStrings(arrayOfStrings(payload.artifacts || [], 'output artifacts'), 100, 500), evidence: limitedLines(payload.evidence || '', options.maxEvidenceLines || 50) };
}

function outputPayload(payload, mode = 'summary', options = {}) {
  if (!['summary', 'evidence', 'full'].includes(mode)) gate('output mode invalid');
  const summary = payload.summary || executionSummary(payload);
  if (mode === 'summary') return { summary };
  const evidence = evidencePayload(payload, summary, options);
  if (mode === 'evidence') return evidence;
  return { ...evidence, logs: limitedLines(payload.logs || '', options.maxEvidenceLines || 200) };
}

function formatOutput(payload, mode = 'summary', options = {}) {
  const value = JSON.stringify(outputPayload(payload, mode, options));
  const maxTokens = options.maxOutputTokens === undefined ? 0 : count(options.maxOutputTokens, 'max output tokens');
  if (maxTokens && value.length > maxTokens * 4) return `${value.slice(0, maxTokens * 4)}…`;
  return value;
}

function objectCapabilityKey(key, epoch) {
  return {
    model: key.model || null,
    reasoning: key.reasoning || null,
    profile_attestation: key.profile_attestation || null,
    reviewer_slots: key.reviewer_slots ?? null,
    capability_epoch: key.capability_epoch || key.host_capability_epoch || epoch,
    lease: key.lease || null,
    quota: key.quota || null
  };
}

function capabilityCacheKey(key, epoch = 'host-default') {
  if (typeof key === 'string') return stableJson({ legacy_key: requiredString(key, 'capability cache key'), epoch });
  if (!key || typeof key !== 'object') gate('capability cache key invalid');
  return stableJson(objectCapabilityKey(key, epoch));
}

function cacheOptions(options) {
  const maxEntries = options.maxEntries ?? 64;
  const ttlMs = options.ttlMs ?? 15 * 60 * 1000;
  if (!Number.isInteger(maxEntries) || maxEntries < 1 || maxEntries > 4096) gate('capability cache max entries invalid');
  if (!Number.isInteger(ttlMs) || ttlMs < 0 || ttlMs > 7 * 24 * 60 * 60 * 1000) gate('capability cache ttl invalid');
  return { maxEntries, ttlMs, now: options.now || Date.now };
}

function cacheExpired(entry, now) { return entry.expires_at !== null && now >= entry.expires_at; }

/** @param {{maxEntries?: number, ttlMs?: number, now?: () => number}} [options] */
function createCapabilityCache(options = {}) {
  const { maxEntries, ttlMs, now } = cacheOptions(options);
  const values = new Map();
  function purgeExpired() {
    const current = now();
    for (const [stored, entry] of values) if (cacheExpired(entry, current)) values.delete(stored);
  }
  return {
    key(key, epoch) { return capabilityCacheKey(key, epoch); },
    get(key, epoch) {
      purgeExpired();
      const composite = capabilityCacheKey(key, epoch), entry = values.get(composite);
      if (!entry) return null;
      values.delete(composite); values.set(composite, entry);
      return entry.value;
    },
    set(key, value, epoch = 'host-default') {
      if(!value || typeof value !== 'object') gate('capability cache value invalid');
      purgeExpired();
      const composite = capabilityCacheKey(key, epoch), frozen = deepFreeze(cloneValue(value));
      values.delete(composite);
      values.set(composite, { value: frozen, expires_at: ttlMs === 0 ? null : now() + ttlMs });
      while (values.size > maxEntries) values.delete(values.keys().next().value);
      return frozen;
    },
    invalidate(key, epoch) {
      if (key === undefined) { values.clear(); return; }
      if (epoch !== undefined || typeof key !== 'string') { values.delete(capabilityCacheKey(key, epoch)); return; }
      for (const stored of values.keys()) if (stored.includes(`"legacy_key":${JSON.stringify(key)}`)) values.delete(stored);
    },
    size() { purgeExpired(); return values.size; }
  };
}

function createPreflightCache(options = {}) { return createCapabilityCache(options); }

function classifyChangedPaths(paths) {
  arrayOfStrings(paths, 'changed paths');
  if (!paths.length) return { kind: 'unknown', fullProfile: true, checks: ['full-runtime-profile'] };
  const runtime = paths.some(path => path.startsWith('agent-runtime/'));
  if (runtime) return { kind: 'runtime-contract', fullProfile: true, checks: ['runtime-contracts', 'full-runtime-profile'] };
  const docs = paths.every(path => path.startsWith('docs/') || path.endsWith('.md'));
  const launcher = paths.every(path => path.startsWith('script/') || path.startsWith('agent-runtime/bin/'));
  const tests = paths.every(path => path.startsWith('tests/') || path.startsWith('agent-runtime/tooling/tests/'));
  if (docs) return { kind: 'docs-only', fullProfile: false, checks: ['documentation-links', 'wiki-drift'] };
  if (launcher) return { kind: 'launcher-only', fullProfile: false, checks: ['launcher-contract', 'runtime-smoke'] };
  if (tests) return { kind: 'test-only', fullProfile: false, checks: ['changed-tests', 'runtime-contracts'] };
  return { kind: 'mixed', fullProfile: true, checks: ['full-runtime-profile'] };
}

function retentionPlan(entries, now = Date.now(), maxAgeMs = 7 * 24 * 60 * 60 * 1000) {
  if (!Array.isArray(entries)) gate('retention entries invalid');
  if (!Number.isFinite(now) || !Number.isFinite(maxAgeMs) || maxAgeMs < 0) gate('retention window invalid');
  return entries.filter(entry => {
    if (!entry || typeof entry.path !== 'string' || !derivedRoots.some(root => entry.path === root || entry.path.startsWith(`${root}/`))) return false;
    const modified = Date.parse(entry.modified_at);
    return Number.isFinite(modified) && now - modified >= maxAgeMs;
  }).map(entry => ({ path: entry.path, action: 'archive_or_delete_derived_only' }));
}

module.exports = {
  lenses, compositeSections, reviewModes, derivedRoots, preflight, preflightCacheKey, validatePreflight, buildReviewerPrompt, buildReviewerPromptFactory, deepFreeze, capabilityCacheKey,
  dispatchReviewBatch, waitReviewBatch, executionSummary, outputPayload, formatOutput, redact, limitedLines, createCapabilityCache, createPreflightCache, reviewPolicy,
  classifyChangedPaths, retentionPlan, requiredReviewerCount
};
