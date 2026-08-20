'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const runtime = require('../../lib/runtime.cjs');
const convergence = require('../../lib/scope-convergence.cjs');
const platformKnowledge = require('../../lib/platform-knowledge.cjs');
const { checkpoint, fixtures, now } = require('./fixtures.cjs');

function save(root, value) {
  const file = path.join(root, '.agent', 'work', value.work_id, 'resume.json');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value)}\n`);
  return file;
}

function scope(state, overrides = {}) {
  return {
    schema: 'ImplementationScope/v1', scope_id: `scope-${state.work_id}`, work_id: state.work_id,
    source_revision: state.source_revision, ac_ids: [...state.acceptance_manifest.ac_ids],
    allowed_paths: [...state.allowed_paths], changed_symbols: ['recordReviewReceipt'], non_goals: ['product source'],
    acceptance_trace: ['WORK.md#acceptance'], behavior_trace: ['SCOPE:bounded runtime receipt'], test_trace: ['tests/runtime-scope-convergence.test.cjs#scope'], diagnostic_trace: ['WORK.md#scope'], attribution: { thread_id: `thread-${state.work_id}`, pointer: 'WORK.md#scope' }, owner: 'executor', created_at: now, ...overrides
  };
}

function policy() {
  return { schema: 'AssurancePolicy/v1', scope_triage: true, release: 'scope-triage/v1', max_corrections_per_epoch: 2, activated_by: 'root', activated_at: now };
}

function triageFor(state, blocking = false) {
  return { schema: 'ReviewSetTriage/v1', triage_id: `triage-${state.work_id}`, work_id: state.work_id, source_revision: state.source_revision, packet_id: state.review_packet.packet_id, generation: state.review_generation, receipt_ids: ['r1', 'r2', 'r3'], items: [{ triage_id: `item-${state.work_id}`, receipt_id: 'r1', finding_ids: blocking ? ['finding-1'] : [], disposition: blocking ? 'blocking_current_ac' : 'advisory', ac_refs: ['AC-QUALITY-1'], evidence_pointers: ['WORK.md#review'] }], has_blocking_current: blocking, status: blocking ? 'requires_correction' : 'accepted', owner: 'root', created_at: now };
}

describe('scope convergence and active-checkpoint upgrade', () => {
  test('validates the declared implementation boundary and rejects expansion', () => {
    const state = checkpoint();
    const declared = scope(state);
    expect(convergence.scopeContractValid(declared, state)).toBe(declared);
    const scoped = { ...state, assurance_policy: policy(), scope_contract: declared, scope_contract_digest: convergence.digest(declared) };
    expect(convergence.scopeAudit(scoped, '.')).toMatchObject({ status: 'pass' });
    expect(() => convergence.scopeAudit({ ...scoped, scope_contract: { ...declared, allowed_paths: ['other/file.js'] } }, '.')).toThrow(/exceeds allowed paths/);
    expect(() => convergence.scopeAudit({ ...scoped, scope_contract_digest: '0'.repeat(64) }, '.')).toThrow(/scope digest invalid/);
    expect(() => convergence.scopeContractValid({ ...declared, ac_ids: ['AC-OTHER'] }, state)).toThrow(/AC binding/);
    expect(() => runtime.assertCheckpoint({ ...state, assurance_policy: policy(), scope_contract: undefined })).toThrow(/scope contract required/);
    expect(() => runtime.assertCheckpoint({ ...scoped, scope_contract_digest: '0'.repeat(64) })).toThrow(/scope digest invalid/);
    const invalidBudget = { ...scoped, assurance_policy: { ...policy(), max_corrections_per_epoch: 4 } };
    expect(() => runtime.assertCheckpoint(invalidBudget)).toThrow(/correction budget invalid/);
    expect(() => runtime.assertCheckpoint({ ...scoped, assurance_policy: { ...policy(), max_corrections_per_epoch: 0 } })).toThrow(/correction budget invalid/);
    expect(() => runtime.assertCheckpoint({ ...scoped, assurance_policy: { ...policy(), max_corrections_per_epoch: '2' } })).toThrow(/correction budget invalid/);
  });

  test('requires explicit triage before strict correction and classifies nonblocking findings', () => {
    const state = checkpoint({ assurance_policy: policy(), scope_contract: scope(checkpoint()), review_packet: { packet_id: 'packet-1', packet_version: 1, wave: 1 }, review_generation: 1 });
    const triage = { schema: 'ReviewSetTriage/v1', triage_id: 'triage-1', work_id: state.work_id, source_revision: state.source_revision, packet_id: 'packet-1', generation: 1, receipt_ids: ['r1', 'r2', 'r3'], items: [{ triage_id: 'item-1', receipt_id: 'r1', finding_ids: [], disposition: 'advisory', ac_refs: ['AC-QUALITY-1'], evidence_pointers: ['WORK.md#review'] }], has_blocking_current: false, status: 'accepted', owner: 'root', created_at: now };
    const complete = { ...state, reviews: triage.receipt_ids.map(receipt_id => ({ receipt_id })) };
    expect(convergence.triageValid(triage, complete)).toBe(triage);
    expect(convergence.nextReviewAction(state, 1)).toMatch(/2 remaining/);
    expect(convergence.nextReviewAction(state, 3)).toMatch(/ReviewSetTriage/);
    expect(convergence.nextCorrectionAction(state, triage)).toMatch(/reverse validation/);
    expect(convergence.nextReviewAction({ ...state, assurance_policy: undefined }, 3)).toMatch(/Begin bounded correction/);
    expect(convergence.nextCorrectionAction(state, { has_blocking_current: true })).toMatch(/Begin one bounded correction/);
    expect(convergence.nextCorrectionAction({ ...state, epoch_correction_count: 2 }, { has_blocking_current: true })).toMatch(/scope recovery/);
    expect(convergence.nextCorrectionAction({ ...state, assurance_policy: policy(), scope_contract: scope(state), scope_recovery_history: [{}], epoch_correction_count: 2 }, { has_blocking_current: true })).toMatch(/ScopeFollowUpAuthorization/);
    expect(convergence.nextCorrectionAction(state, { status: 'requires_scope_decision' })).toMatch(/follow-up task or record/);
  });

  test('reports each convergence health boundary without changing the checkpoint', () => {
    const state = checkpoint();
    expect(convergence.convergenceHealth({ ...state, lifecycle_state: 'COMPLETE' })).toBe('immutable');
    expect(convergence.convergenceHealth({ ...state, correction_count: 2 })).toBe('scope_audit_required');
    expect(convergence.convergenceHealth({ ...state, assurance_policy: policy() })).toBe('scope_contract_required');
    expect(convergence.convergenceHealth({ ...state, assurance_policy: policy(), scope_contract: scope(state), lifecycle_state: 'EXECUTE', epoch_correction_count: 2 })).toBe('scope_recovery_required');
    expect(convergence.convergenceHealth({ ...state, assurance_policy: policy(), scope_contract: scope(state), lifecycle_state: 'PLAN', epoch_correction_count: 0 })).toBe('normal');
    expect(convergence.correctionBudget({ assurance_policy: { max_corrections_per_epoch: 1 }, epoch_correction_count: 1 })).toEqual({ used: 1, limit: 1 });
    expect(convergence.correctionBudget({})).toEqual({ used: 0, limit: 2 });
  });

  test('fails closed for malformed scope and triage boundaries', () => {
    const state = checkpoint({ review_packet: { packet_id: 'packet-1', packet_version: 1, wave: 1 }, review_generation: 1, reviews: [{ receipt_id: 'r1' }, { receipt_id: 'r2' }, { receipt_id: 'r3' }] });
    const declared = scope(state);
    expect(() => convergence.scopeContractValid({ ...declared, schema: 'Wrong/v1' }, state)).toThrow(/scope contract invalid/);
    expect(() => convergence.scopeContractValid({ ...declared, work_id: 'other' }, state)).toThrow(/scope binding invalid/);
    expect(() => convergence.scopeContractValid({ ...declared, owner: '' }, state)).toThrow(/owner missing/);
    expect(() => convergence.scopeContractValid({ ...declared, ac_ids: [] }, state)).toThrow(/AC ids invalid/);
    expect(() => convergence.scopeContractValid({ ...declared, ac_ids: ['AC-QUALITY-1', 'AC-QUALITY-1'] }, state)).toThrow(/AC ids duplicate/);
    expect(() => convergence.scopeContractValid({ ...declared, allowed_paths: ['../escape'] }, state)).toThrow(/paths unsafe/);
    expect(() => convergence.scopeContractValid({ ...declared, attribution: null }, state)).toThrow(/attribution invalid/);
    expect(() => convergence.scopeContractValid({ ...declared, created_at: 'not-a-date' }, state)).toThrow(/timestamp invalid/);
    expect(() => convergence.scopeAudit({ ...state, assurance_policy: policy(), scope_contract: declared, fingerprint_paths: [] }, '.')).toThrow(/not fingerprinted/);

    const triage = { schema: 'ReviewSetTriage/v1', triage_id: 'triage-1', work_id: state.work_id, source_revision: state.source_revision, packet_id: 'packet-1', generation: 1, receipt_ids: ['r1', 'r2', 'r3'], items: [{ triage_id: 'item-1', receipt_id: 'r1', finding_ids: [], disposition: 'advisory', ac_refs: ['AC-QUALITY-1'], evidence_pointers: ['WORK.md#review'] }], has_blocking_current: false, status: 'accepted', owner: 'root', created_at: now };
    expect(() => convergence.triageValid({ ...triage, schema: 'Wrong/v1' }, state)).toThrow(/triage invalid/);
    expect(() => convergence.triageValid({ ...triage, work_id: 'other' }, state)).toThrow(/triage binding invalid/);
    expect(() => convergence.triageValid({ ...triage, packet_id: 'other' }, state)).toThrow(/packet binding invalid/);
    expect(() => convergence.triageValid({ ...triage, receipt_ids: ['r1'] }, state)).toThrow(/three receipts/);
    expect(() => convergence.triageValid({ ...triage, receipt_ids: ['r1', 'r2', 'missing'] }, state)).toThrow(/receipt missing/);
    expect(() => convergence.triageValid({ ...triage, items: [] }, state)).toThrow(/items missing/);
    expect(() => convergence.triageValid({ ...triage, created_at: 'not-a-date' }, state)).toThrow(/timestamp invalid/);
    expect(() => convergence.triageValid({ ...triage, has_blocking_current: true }, state)).toThrow(/summary invalid/);
    expect(() => convergence.triageValid({ ...triage, status: 'unknown' }, state)).toThrow(/status invalid/);
    expect(() => convergence.triageValid({ ...triage, items: [null] }, state)).toThrow(/item invalid/);
    expect(() => convergence.triageValid({ ...triage, items: [{ ...triage.items[0], disposition: 'unknown' }] }, state)).toThrow(/disposition invalid/);
    expect(() => convergence.triageValid({ ...triage, items: [{ ...triage.items[0], receipt_id: 'missing' }] }, state)).toThrow(/receipt binding invalid/);
    expect(() => convergence.triageValid({ ...triage, items: [{ ...triage.items[0], ac_refs: ['AC-OTHER'] }] }, state)).toThrow(/AC binding invalid/);
    expect(() => convergence.triageValid({ ...triage, items: [{ ...triage.items[0], disposition: 'new_requirement', finding_ids: ['missing'] }], status: 'requires_scope_decision' }, state)).toThrow(/finding binding invalid/);
    expect(() => convergence.triageValid({ ...triage, items: [{ ...triage.items[0], disposition: 'blocking_current_ac' }], has_blocking_current: true, status: 'requires_correction' }, state)).toThrow(/blocking triage finding ids required/);
    expect(() => convergence.triageValid({ ...triage, items: [{ ...triage.items[0], disposition: 'new_requirement' }], status: 'requires_scope_decision' }, state)).toThrow(/new requirement finding ids required/);
    expect(() => convergence.triageValid({ ...triage, items: [{ ...triage.items[0] }, { ...triage.items[0] }] }, state)).toThrow(/triage item duplicate/);
    const withFinding = { ...state, reviews: [{ receipt_id: 'r1', finding_objects: [{ finding_id: 'finding-1' }] }, { receipt_id: 'r2' }, { receipt_id: 'r3' }] };
    const duplicateFinding = { ...triage, items: [{ ...triage.items[0], finding_ids: ['finding-1'], disposition: 'follow_up' }, { ...triage.items[0], triage_id: 'item-2', finding_ids: ['finding-1'], disposition: 'follow_up' }] };
    expect(() => convergence.triageValid(duplicateFinding, withFinding)).toThrow(/triage finding duplicate/);
    expect(() => convergence.triageValid({ ...triage, items: [{ ...triage.items[0], disposition: 'blocking_current_ac', finding_ids: ['finding-1'] }], has_blocking_current: true, status: 'accepted' }, withFinding)).toThrow(/status\/disposition mismatch/);

    const declaredFinding = { ...state, reviews: [{ receipt_id: 'r1', findings: ['finding-1'] }, { receipt_id: 'r2', findings: [] }, { receipt_id: 'r3', findings: [] }] };
    const declaredTriage = { ...triage, items: [{ ...triage.items[0], finding_ids: ['finding-1'], disposition: 'follow_up' }] };
    expect(convergence.triageValid(declaredTriage, declaredFinding)).toBe(declaredTriage);
    expect(() => convergence.triageValid({ ...declaredTriage, items: [{ ...declaredTriage.items[0], finding_ids: ['missing'] }] }, declaredFinding)).toThrow(/finding binding invalid/);
  });

  test('records triage for accepted receipts that carry required string finding ids', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-string-findings-'));
    const base = checkpoint();
    const packet = { schema: 'BlindReviewPacket/v2', packet_id: 'packet-string-findings', packet_version: 1, wave: 1, generation: 1, status: 'frozen', work_id: base.work_id, source_revision: base.source_revision, sealed_revision: base.sealed_revision, implementation_fingerprint: base.implementation_fingerprint, acceptance_manifest_id: base.acceptance_manifest.id, acceptance_manifest_version: base.acceptance_manifest.version, required_profile: { model: 'configured', reasoning: 'high' }, review_scope: { paths: ['agent-runtime/lib/runtime.cjs'], absence_assertions: {} }, profile_attestation_set: 'dispatch.json' };
    const state = checkpoint({ assurance_policy: policy(), review_packet: packet, review_generation: 1, reviews: [{ receipt_id: 'r1', findings: ['finding-1'] }, { receipt_id: 'r2', findings: [] }, { receipt_id: 'r3', findings: [] }] });
    state.scope_contract = scope(state);
    state.scope_contract_digest = convergence.digest(state.scope_contract);
    const file = save(root, state);
    const triage = triageFor(state, true);
    const next = runtime.recordReviewSetTriage(file, triage, state.revision, state.source_revision);
    expect(next.review_triage).toMatchObject({ triage_id: triage.triage_id, status: 'requires_correction' });
  });

  test('records scope policy through a public typed operation', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-scope-'));
    const state = checkpoint({ work_id: 'scope-bind', lifecycle_state: 'PLAN', sealed_at: undefined, sealed_revision: undefined, implementation_fingerprint: undefined });
    const file = save(root, state);
    const declared = scope(state);
    const next = runtime.recordImplementationScope(file, { expectedRevision: state.revision, sourceRevision: state.source_revision, scope: declared, reason: 'Freeze the minimal implementation boundary.', pointer: 'WORK.md#scope', actor: 'root', timestamp: now });
    expect(next).toMatchObject({ assurance_policy: { scope_triage: true }, scope_contract_digest: convergence.digest(declared), assurance_epoch: 1, epoch_correction_count: 0 });
    expect(() => runtime.recordImplementationScope(file, { expectedRevision: next.revision, sourceRevision: next.source_revision, scope: declared, reason: 'duplicate', pointer: 'WORK.md#scope', actor: 'root', timestamp: now })).toThrow(/already bound/);
  });

  test('records strict triage and routes correction readiness through the shared policy', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-triage-'));
    const base = checkpoint();
    const packet = { schema: 'BlindReviewPacket/v2', packet_id: 'packet-1', packet_version: 1, wave: 1, generation: 1, status: 'frozen', work_id: base.work_id, source_revision: base.source_revision, sealed_revision: base.sealed_revision, implementation_fingerprint: base.implementation_fingerprint, acceptance_manifest_id: base.acceptance_manifest.id, acceptance_manifest_version: base.acceptance_manifest.version, required_profile: { model: 'configured', reasoning: 'high' }, review_scope: { paths: ['agent-runtime/lib/runtime.cjs'], absence_assertions: {} }, profile_attestation_set: 'dispatch.json' };
    const bindPacket = c => ({ ...packet, work_id: c.work_id, source_revision: c.source_revision, sealed_revision: c.sealed_revision, implementation_fingerprint: c.implementation_fingerprint });
    const state = checkpoint({ assurance_policy: policy(), scope_contract: null, review_packet: packet, review_generation: 1, reviews: [{ receipt_id: 'r1', verdict: 'clean' }, { receipt_id: 'r2', verdict: 'clean' }, { receipt_id: 'r3', verdict: 'clean' }] });
    state.scope_contract = scope(state);
    state.scope_contract_digest = convergence.digest(state.scope_contract);
    const file = save(root, state);
    const triage = triageFor(state);
    const accepted = runtime.recordReviewSetTriage(file, triage, state.revision, state.source_revision);
    expect(accepted.review_triage).toMatchObject({ triage_id: triage.triage_id, status: 'accepted' });
    expect(() => runtime.recordReviewSetTriage(file, { ...triage, status: 'requires_correction' }, accepted.revision, accepted.source_revision)).toThrow(/review triage already recorded/);
    expect(() => runtime.recordReviewSetTriage(file, { ...triage, status: 'accepted', has_blocking_current: true, items: [{ ...triage.items[0], disposition: 'blocking_current_ac', finding_ids: ['finding-1'] }] }, accepted.revision, accepted.source_revision)).toThrow(/review triage already recorded/);

    const noPolicy = { ...state, work_id: 'strict-no-policy', assurance_policy: undefined, scope_contract: undefined, scope_contract_digest: undefined };
    noPolicy.review_packet = bindPacket(noPolicy);
    const noPolicyFile = save(root, noPolicy);
    expect(() => runtime.recordReviewSetTriage(noPolicyFile, triageFor(noPolicy), noPolicy.revision, noPolicy.source_revision)).toThrow(/requires scope-triage policy/);
    const short = { ...state, work_id: 'strict-short', reviews: [{ receipt_id: 'r1', verdict: 'clean' }, { receipt_id: 'r2', verdict: 'clean' }] };
    short.review_packet = bindPacket(short);
    short.scope_contract = scope(short, { scope_id: 'strict-short' });
    short.scope_contract_digest = convergence.digest(short.scope_contract);
    const shortFile = save(root, short);
    expect(() => runtime.recordReviewSetTriage(shortFile, triageFor(short), short.revision, short.source_revision)).toThrow(/three verify receipts/);

    const missingTriage = { ...accepted, revision: accepted.revision + 1, review_triage: null };
    const missingFile = save(root, missingTriage);
    expect(() => runtime.beginCorrection(missingFile, { expectedRevision: missingTriage.revision, sourceRevision: missingTriage.source_revision, correction: { reason: 'bounded', pointer: 'WORK.md#correction' } })).toThrow(/review set triage required/);
    const nonblocking = { ...accepted, work_id: 'strict-nonblocking', revision: 9 };
    nonblocking.review_packet = bindPacket(nonblocking);
    nonblocking.scope_contract = scope(nonblocking, { scope_id: 'strict-nonblocking' });
    nonblocking.scope_contract_digest = convergence.digest(nonblocking.scope_contract);
    nonblocking.review_triage = triageFor(nonblocking);
    const nonblockingFile = save(root, nonblocking);
    expect(() => runtime.beginCorrection(nonblockingFile, { expectedRevision: 9, sourceRevision: accepted.source_revision, correction: { reason: 'bounded', pointer: 'WORK.md#correction' } })).toThrow(/does not require correction/);
    const exhausted = { ...accepted, work_id: 'strict-exhausted', revision: 9, epoch_correction_count: 2, reviews: accepted.reviews.map((review, index) => index === 0 ? { ...review, finding_objects: [{ finding_id: 'finding-1', summary: 'Current acceptance mismatch.', escalation: 'persistent' }] } : review), review_triage: triageFor({ ...accepted, work_id: 'strict-exhausted' }, true) };
    exhausted.review_packet = bindPacket(exhausted);
    exhausted.scope_contract = scope(exhausted, { scope_id: 'strict-exhausted' });
    exhausted.scope_contract_digest = convergence.digest(exhausted.scope_contract);
    const exhaustedFile = save(root, exhausted);
    expect(() => runtime.beginCorrection(exhaustedFile, { expectedRevision: 9, sourceRevision: exhausted.source_revision, correction: { reason: 'bounded', pointer: 'WORK.md#correction' } })).toThrow(/scope recovery required/);
    const successful = { ...accepted, work_id: 'strict-success', revision: 9, reviews: accepted.reviews.map((review, index) => index === 0 ? { ...review, finding_objects: [{ finding_id: 'finding-1', summary: 'Current acceptance mismatch.', escalation: 'persistent' }] } : review) };
    successful.review_packet = bindPacket(successful);
    successful.scope_contract = scope(successful, { scope_id: 'strict-success' });
    successful.scope_contract_digest = convergence.digest(successful.scope_contract);
    successful.review_triage = triageFor(successful, true);
    const successfulFile = save(root, successful);
    const blockingRecord = { ...successful, work_id: 'strict-blocking-record', revision: 9, review_triage: null, scope_contract: scope({ ...successful, work_id: 'strict-blocking-record' }, { scope_id: 'strict-blocking-record' }) };
    blockingRecord.scope_contract_digest = convergence.digest(blockingRecord.scope_contract);
    const blockingFile = save(root, blockingRecord);
    const blockingRecorded = runtime.recordReviewSetTriage(blockingFile, triageFor(blockingRecord, true), 9, blockingRecord.source_revision);
    expect(blockingRecorded.review_triage.status).toBe('requires_correction');
    const corrected = runtime.beginCorrection(successfulFile, { expectedRevision: 9, sourceRevision: successful.source_revision, correction: { reason: 'bounded', pointer: 'WORK.md#correction' } });
    expect(corrected).toMatchObject({ lifecycle_state: 'EXECUTE', epoch_correction_count: 1, review_triage: null });
    const scopeDecision = { ...successful, work_id: 'strict-scope-decision', revision: 9, review_triage: null, reviews: successful.reviews };
    scopeDecision.review_packet = bindPacket(scopeDecision);
    scopeDecision.scope_contract = scope(scopeDecision, { scope_id: 'strict-scope-decision' });
    scopeDecision.scope_contract_digest = convergence.digest(scopeDecision.scope_contract);
    const scopeDecisionTriage = triageFor(scopeDecision, false);
    scopeDecision.review_triage = { ...scopeDecisionTriage, triage_id: 'triage-scope-decision', status: 'requires_scope_decision', items: [{ ...scopeDecisionTriage.items[0], disposition: 'new_requirement', finding_ids: ['finding-1'] }] };
    const scopeDecisionFile = save(root, scopeDecision);
    expect(() => runtime.beginCorrection(scopeDecisionFile, { expectedRevision: 9, sourceRevision: scopeDecision.source_revision, correction: { reason: 'bounded', pointer: 'WORK.md#correction' } })).toThrow(/scope decision required/);
  });

  test('rejects malformed typed scope and recovery inputs before mutation', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-scope-inputs-'));
    const base = checkpoint({ work_id: 'scope-inputs', lifecycle_state: 'PLAN', sealed_at: undefined, sealed_revision: undefined, implementation_fingerprint: undefined });
    const baseFile = save(root, base);
    expect(() => runtime.recordImplementationScope(baseFile, { expectedRevision: base.revision, sourceRevision: base.source_revision, scope: null, reason: 'reason', pointer: 'WORK.md#scope', actor: 'root', timestamp: now })).toThrow(/scope input invalid/);

    const wrongStage = checkpoint({ work_id: 'scope-wrong-stage', lifecycle_state: 'VERIFY' });
    const wrongStageFile = save(root, wrongStage);
    expect(() => runtime.recordImplementationScope(wrongStageFile, { expectedRevision: wrongStage.revision, sourceRevision: wrongStage.source_revision, scope: scope(wrongStage), reason: 'reason', pointer: 'WORK.md#scope', actor: 'root', timestamp: now })).toThrow(/requires plan or execute/);

    const recovery = checkpoint({ work_id: 'scope-recovery-inputs', lifecycle_state: 'VERIFY' });
    const recoveryFile = save(root, recovery);
    const recoveryScope = scope(recovery, { scope_id: 'scope-recovery-inputs-new' });
    const plan = { schema: 'CheckpointConvergencePlan/v1', plan_id: 'plan-inputs', reason: 'Narrow scope.', pointer: 'WORK.md#convergence', actor: 'root', timestamp: now, disposition: 'narrow_current_scope', scope_contract: recoveryScope };
    expect(() => runtime.enterScopeRecovery(recoveryFile, { ...plan, schema: 'Wrong/v1' }, recovery.revision, recovery.source_revision)).toThrow(/convergence plan invalid/);
    expect(() => runtime.enterScopeRecovery(recoveryFile, { ...plan, disposition: 'invalid' }, recovery.revision, recovery.source_revision)).toThrow(/disposition invalid/);

    const wrongRecoveryState = checkpoint({ work_id: 'scope-recovery-wrong-state', lifecycle_state: 'PLAN' });
    const wrongRecoveryFile = save(root, wrongRecoveryState);
    const wrongRecoveryScope = scope(wrongRecoveryState, { scope_id: 'scope-recovery-wrong-state-new' });
    expect(() => runtime.enterScopeRecovery(wrongRecoveryFile, { ...plan, scope_contract: wrongRecoveryScope }, wrongRecoveryState.revision, wrongRecoveryState.source_revision)).toThrow(/requires verify or execute/);
  });

  test('converges an over-scoped active checkpoint through a typed recovery plan', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-recovery-'));
    const state = checkpoint({ work_id: 'scope-recovery', assurance_policy: policy(), assurance_epoch: 2, epoch_correction_count: 2, epoch_review_failure_count: 2 });
    state.scope_contract = scope(state, { scope_id: 'scope-recovery' });
    state.scope_contract_digest = convergence.digest(state.scope_contract);
    const file = save(root, state);
    const recoveryScope = scope(state, { scope_id: 'scope-recovery-narrowed', changed_symbols: ['recordReviewReceipt'] });
    state.review_packet = { packet_id: 'packet-recovery', generation: 2 };
    state.reviews = [{ receipt_id: 'r1' }, { receipt_id: 'r2' }, { receipt_id: 'r3' }];
    state.review_triage = triageFor(state);
    state.verification = [{ id: 'reverse-recovery' }, { receipt_id: 'reverse-receipt' }];
    state.evidence = [{ id: 'evidence-recovery' }];
    state.recovery_evidence = [{ id: 'recovery-evidence' }];
    fs.writeFileSync(file, `${JSON.stringify(state)}\n`);
    const recovered = runtime.enterScopeRecovery(file, { schema: 'CheckpointConvergencePlan/v1', plan_id: 'plan-recovery-1', reason: 'Stop the repeated correction loop and narrow the task.', pointer: 'WORK.md#convergence', actor: 'root', timestamp: now, disposition: 'narrow_current_scope', scope_contract: recoveryScope }, state.revision, state.source_revision);
    expect(recovered).toMatchObject({ lifecycle_state: 'EXECUTE', assurance_epoch: 3, epoch_correction_count: 0, epoch_review_failure_count: 0, next_action: expect.stringMatching(/narrowed scope/) });
    expect(recovered.scope_recovery.plan_id).toBe('plan-recovery-1');
    expect(recovered.scope_recovery_history).toHaveLength(1);
    expect(recovered.scope_recovery_history[0].invalidated_assurance).toMatchObject({ review_receipt_ids: ['r1', 'r2', 'r3'], triage_id: state.review_triage.triage_id });
    const repeated = { ...recovered, revision: recovered.revision + 1, epoch_correction_count: 2, scope_recovery_history: recovered.scope_recovery_history };
    const repeatedFile = save(root, repeated);
    const repeatedPlan = { ...recoveryScope, scope_id: 'scope-recovery-follow-up' };
    expect(() => runtime.enterScopeRecovery(repeatedFile, { schema: 'CheckpointConvergencePlan/v1', plan_id: 'plan-recovery-2', reason: 'Stop repeating recovery.', pointer: 'WORK.md#convergence', actor: 'root', timestamp: now, disposition: 'narrow_current_scope', scope_contract: repeatedPlan }, repeated.revision, repeated.source_revision)).toThrow(/scope recovery requires an exhausted or audited convergence state|follow-up/);
  });

  test('opens an explicitly authorized same-scope follow-up after recovery budget exhaustion', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-follow-up-'));
    const state = checkpoint({ work_id: 'scope-follow-up', lifecycle_state: 'VERIFY', assurance_policy: policy(), assurance_epoch: 1, epoch_correction_count: 2, scope_recovery_history: [{ plan_id: 'prior-recovery' }], review_packet: null, reviews: [], review_triage: null, verification: [] });
    const prior = scope(state, { scope_id: 'scope-follow-up-prior' });
    state.scope_contract = prior;
    state.scope_contract_digest = convergence.digest(prior);
    const file = save(root, state);
    const followUp = {
      schema: 'ScopeFollowUpAuthorization/v1', follow_up_id: 'follow-up-same-scope-1', work_id: state.work_id,
      source_revision: state.source_revision, prior_scope_id: prior.scope_id, scope_id: 'scope-follow-up-next',
      ac_ids: [...prior.ac_ids], affected_files: [...prior.allowed_paths], disposition: 'bounded_same_scope',
      reason: 'Authorize the bounded callback-ordering follow-up within the same AC and files.', pointer: 'current-thread#callback-ordering',
      actor: 'current-thread', from_revision: state.revision, to_revision: state.revision + 1, timestamp: now,
      scope_contract: { ...prior, scope_id: 'scope-follow-up-next', changed_symbols: ['postListRefreshCallback'] }
    };
    const next = runtime.recordScopeFollowUpAuthorization(file, followUp, state.revision, state.source_revision);
    expect(next).toMatchObject({ lifecycle_state: 'EXECUTE', assurance_epoch: 2, epoch_correction_count: 0, next_action: 'Record fresh PlatformKnowledgeContext/v1 before implementation.' });
    expect(next.scope_contract.scope_id).toBe('scope-follow-up-next');
    expect(next.scope_follow_up_history).toHaveLength(1);
    expect(next.scope_follow_up_history[0]).toMatchObject({ schema: 'ScopeFollowUpAuthorization/v1', follow_up_id: followUp.follow_up_id, prior_scope_id: prior.scope_id, scope_id: followUp.scope_contract.scope_id, disposition: 'bounded_same_scope' });
    expect(next.review_packet).toBeNull();
    expect(next.reviews).toEqual([]);
    expect(next.sealed_revision).toBeNull();
  });

  test('opens the same follow-up directly from EXECUTE after beginCorrection retires assurance', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-follow-up-execute-'));
    const base = checkpoint({ work_id: 'scope-follow-up-execute', lifecycle_state: 'VERIFY', assurance_policy: policy(), assurance_epoch: 1, epoch_correction_count: 1, scope_recovery_history: [{ plan_id: 'prior-recovery' }] });
    const packet = { schema: 'BlindReviewPacket/v2', packet_id: 'packet-follow-up-execute', packet_version: 1, wave: 1, generation: 1, status: 'frozen', work_id: base.work_id, source_revision: base.source_revision, sealed_revision: base.sealed_revision, implementation_fingerprint: base.implementation_fingerprint, acceptance_manifest_id: base.acceptance_manifest.id, acceptance_manifest_version: base.acceptance_manifest.version, required_profile: { model: 'configured', reasoning: 'high' }, review_scope: { paths: ['agent-runtime/lib/runtime.cjs'], absence_assertions: {} }, profile_attestation_set: 'dispatch.json' };
    const state = { ...base, review_packet: packet, review_generation: 1, reviews: [{ receipt_id: 'r1', findings: ['finding-1'], verdict: 'changes_required' }, { receipt_id: 'r2', findings: [], verdict: 'clean' }, { receipt_id: 'r3', findings: [], verdict: 'clean' }] };
    state.scope_contract = scope(state, { scope_id: 'scope-follow-up-execute-prior' });
    state.scope_contract_digest = convergence.digest(state.scope_contract);
    const file = save(root, state);
    const triage = triageFor(state, true);
    const triaged = runtime.recordReviewSetTriage(file, triage, state.revision, state.source_revision);
    const corrected = runtime.beginCorrection(file, { expectedRevision: triaged.revision, sourceRevision: triaged.source_revision, correction: { reason: 'Apply the bounded correction before the same-scope follow-up.', pointer: 'current-thread#bounded-correction' } });
    expect(corrected).toMatchObject({ lifecycle_state: 'EXECUTE', epoch_correction_count: 2, review_packet: null, reviews: [], review_triage: null, verification: [], sealed_revision: null, sealed_at: null });
    expect(corrected.correction_history.at(-1)).toMatchObject({ sequence: corrected.correction_count });

    const prior = corrected.scope_contract;
    const followUp = {
      schema: 'ScopeFollowUpAuthorization/v1', follow_up_id: 'follow-up-after-correction', work_id: corrected.work_id,
      source_revision: corrected.source_revision, prior_scope_id: prior.scope_id, scope_id: 'scope-follow-up-execute-next',
      ac_ids: [...prior.ac_ids], affected_files: [...prior.allowed_paths], disposition: 'bounded_same_scope',
      reason: 'Authorize the bounded same-AC/file continuation after the correction.', pointer: 'current-thread#scope-follow-up',
      actor: 'current-thread', from_revision: corrected.revision, to_revision: corrected.revision + 1, timestamp: now,
      scope_contract: { ...prior, scope_id: 'scope-follow-up-execute-next', changed_symbols: ['postListRefreshCallback'] }
    };
    const next = runtime.recordScopeFollowUpAuthorization(file, followUp, corrected.revision, corrected.source_revision);
    expect(next).toMatchObject({ lifecycle_state: 'EXECUTE', assurance_epoch: 2, epoch_correction_count: 0, next_action: 'Record fresh PlatformKnowledgeContext/v1 before implementation.' });
    expect(next.scope_follow_up_history.at(-1)).toMatchObject({ follow_up_id: followUp.follow_up_id, prior_scope_id: prior.scope_id, scope_id: followUp.scope_contract.scope_id });
    expect(next.scope_contract.scope_id).toBe(followUp.scope_contract.scope_id);
  });

  test('rejects an ordinary exhausted EXECUTE state without a typed retired-correction boundary', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-follow-up-execute-guard-'));
    const state = checkpoint({ work_id: 'scope-follow-up-execute-guard', lifecycle_state: 'EXECUTE', assurance_policy: policy(), assurance_epoch: 1, epoch_correction_count: 2, scope_recovery_history: [{ plan_id: 'prior-recovery' }], sealed_revision: undefined, sealed_at: undefined, implementation_fingerprint: undefined });
    state.scope_contract = scope(state, { scope_id: 'scope-follow-up-execute-guard-prior' });
    state.scope_contract_digest = convergence.digest(state.scope_contract);
    const file = save(root, state);
    const prior = state.scope_contract;
    const followUp = { schema: 'ScopeFollowUpAuthorization/v1', follow_up_id: 'follow-up-untyped-execute', work_id: state.work_id, source_revision: state.source_revision, prior_scope_id: prior.scope_id, scope_id: 'scope-follow-up-execute-guard-next', ac_ids: [...prior.ac_ids], affected_files: [...prior.allowed_paths], disposition: 'bounded_same_scope', reason: 'Attempt without a typed correction boundary.', pointer: 'current-thread#untyped-execute', actor: 'current-thread', from_revision: state.revision, to_revision: state.revision + 1, timestamp: now, scope_contract: { ...prior, scope_id: 'scope-follow-up-execute-guard-next' } };
    const before = fs.readFileSync(file, 'utf8');
    expect(() => runtime.recordScopeFollowUpAuthorization(file, followUp, state.revision, state.source_revision)).toThrow(expect.objectContaining({ code: 'GAP-SCOPE-FOLLOW-UP-001', message: expect.stringMatching(/retired execute/) }));
    expect(fs.readFileSync(file, 'utf8')).toBe(before);
  });

  test('does not accept EXECUTE follow-up while an assurance boundary is still active', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-follow-up-execute-active-'));
    const state = checkpoint({ work_id: 'scope-follow-up-execute-active', lifecycle_state: 'EXECUTE', assurance_policy: policy(), assurance_epoch: 1, epoch_correction_count: 2, correction_count: 1, scope_recovery_history: [{ plan_id: 'prior-recovery' }], sealed_revision: undefined, sealed_at: undefined, implementation_fingerprint: undefined, correction_history: [{ correction_id: 'correction-1', sequence: 1 }] });
    state.scope_contract = scope(state, { scope_id: 'scope-follow-up-execute-active-prior' });
    state.scope_contract_digest = convergence.digest(state.scope_contract);
    state.review_packet = { packet_id: 'active-packet' };
    const file = save(root, state);
    const prior = state.scope_contract;
    const followUp = { schema: 'ScopeFollowUpAuthorization/v1', follow_up_id: 'follow-up-active-execute', work_id: state.work_id, source_revision: state.source_revision, prior_scope_id: prior.scope_id, scope_id: 'scope-follow-up-execute-active-next', ac_ids: [...prior.ac_ids], affected_files: [...prior.allowed_paths], disposition: 'bounded_same_scope', reason: 'Attempt while assurance remains active.', pointer: 'current-thread#active-execute', actor: 'current-thread', from_revision: state.revision, to_revision: state.revision + 1, timestamp: now, scope_contract: { ...prior, scope_id: 'scope-follow-up-execute-active-next' } };
    expect(() => runtime.recordScopeFollowUpAuthorization(file, followUp, state.revision, state.source_revision)).toThrow(expect.objectContaining({ code: 'GAP-SCOPE-FOLLOW-UP-001', message: expect.stringMatching(/assurance set/) }));
  });

  test('authorizes an accepted cross-scope feedback expansion atomically and reaches beginCorrection', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-cross-scope-feedback-'));
    const state = checkpoint({ work_id: 'cross-scope-feedback', lifecycle_state: 'EXECUTE', delivery_cycle_id: 'delivery-cross-scope', assurance_policy: policy(), assurance_epoch: 1, epoch_correction_count: 0 });
    const prior = scope(state, { scope_id: 'scope-cross-scope-prior' });
    state.scope_contract = prior;
    state.scope_contract_digest = convergence.digest(prior);
    const receipt = { timestamp: '2026-08-19T08:00:00.000Z' };
    state.user_testing_feedback_receipt = receipt;
    const affectedFiles = ['agent-runtime/lib/runtime.cjs', 'agent-runtime/TESTING.md'];
    const analysis = { schema: 'DeliveryFeedbackAnalysis/v1', analysis_id: 'analysis-cross-scope', work_id: state.work_id, source_revision: state.source_revision, delivery_cycle_id: state.delivery_cycle_id, source_receipt_id: `testing:${receipt.timestamp}`, origin: 'testing', status: 'accepted', decision: 'rework', summary: 'The accepted testing feedback requires one bounded same-AC expansion.', affected_ac_ids: [...state.acceptance_manifest.ac_ids], affected_files: affectedFiles, evidence_pointers: ['current-thread#cross-scope-feedback'], proposed_correction: 'Apply the bounded cross-scope correction.', analyzed_by: 'runtime:test', analyzed_at: now, scope: 'cross_scope' };
    state.feedback_analysis = analysis;
    const nextScope = scope(state, { scope_id: 'scope-cross-scope-next', allowed_paths: [...new Set([...prior.allowed_paths, ...affectedFiles])], implementation_paths: [...new Set([...prior.allowed_paths, ...affectedFiles])], changed_symbols: ['crossScopeFollowUp'] });
    const contextBase = fixtures()['platform-knowledge-context.v1.schema.json'];
    const context = platformKnowledge.withDigest({ ...contextBase, context_id: 'knowledge-cross-scope-next', cycle_id: 'cycle-cross-scope-next', work_id: state.work_id, source_revision: state.source_revision, scope_id: nextScope.scope_id });
    const authorization = { schema: 'CrossScopeCorrectionAuthorization/v1', authorization_id: 'cross-scope-auth-1', work_id: state.work_id, source_revision: state.source_revision, delivery_cycle_id: state.delivery_cycle_id, origin: 'testing', source_receipt_id: analysis.source_receipt_id, feedback_analysis_id: analysis.analysis_id, decision: analysis.decision, scope: 'cross_scope', affected_ac_ids: [...analysis.affected_ac_ids], affected_files: affectedFiles, prior_scope_id: prior.scope_id, scope_id: nextScope.scope_id, scope_contract_digest: convergence.digest(nextScope), platform_knowledge_context_id: context.context_id, platform_knowledge_digest: context.digest, disposition: 'scope_expansion_correction', reason: 'Authorize the accepted same-AC cross-scope feedback.', actor: 'current-thread', pointer: 'current-thread#cross-scope-authz', from_revision: state.revision, to_revision: state.revision + 1, created_at: now };
    const file = save(root, state);
    const expanded = runtime.recordCrossScopeCorrectionAuthorization(file, { expectedRevision: state.revision, sourceRevision: state.source_revision, authorization, scope_contract: nextScope, platform_knowledge_context: context });
    expect(expanded).toMatchObject({ lifecycle_state: 'EXECUTE', scope_contract: { scope_id: nextScope.scope_id }, correction_authorization: { schema: 'CrossScopeCorrectionAuthorization/v1', disposition: 'scope_expansion_correction' }, platform_knowledge_context: { context_id: context.context_id }, next_action: 'Begin the authorized cross-scope correction.' });
    expect(expanded.allowed_paths).toEqual(expect.arrayContaining(affectedFiles));
    expect(expanded.fingerprint_paths).toEqual(expect.arrayContaining(affectedFiles));
    expect(expanded.review_packet).toBeNull();
    expect(expanded.reviews).toEqual([]);
    expect(expanded.cross_scope_correction_history).toHaveLength(1);
    const corrected = runtime.beginCrossScopeCorrection(file, { expectedRevision: expanded.revision, sourceRevision: expanded.source_revision, correction: { reason: 'Apply the accepted bounded cross-scope correction.', pointer: 'current-thread#cross-scope-correction' } });
    expect(corrected).toMatchObject({ lifecycle_state: 'EXECUTE', correction_count: 1, correction_authorization: null, feedback_analysis: null, user_testing_feedback_receipt: null });
    expect(corrected.correction_authorization_history[0]).toMatchObject({ authorization_id: authorization.authorization_id, schema: 'CrossScopeCorrectionAuthorization/v1' });
  });

  test('rejects cross-scope expansion outside accepted feedback and leaves CAS state unchanged', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-cross-scope-guard-'));
    const state = checkpoint({ work_id: 'cross-scope-guard', lifecycle_state: 'EXECUTE', delivery_cycle_id: 'delivery-cross-scope', assurance_policy: policy() });
    const prior = scope(state, { scope_id: 'scope-cross-scope-guard-prior' }); state.scope_contract = prior; state.scope_contract_digest = convergence.digest(prior);
    const receipt = { timestamp: '2026-08-19T08:00:00.000Z' }; state.delivery_feedback_receipt = receipt;
    state.feedback_analysis = { schema: 'DeliveryFeedbackAnalysis/v1', analysis_id: 'analysis-cross-scope-guard', work_id: state.work_id, source_revision: state.source_revision, delivery_cycle_id: state.delivery_cycle_id, source_receipt_id: `delivery:${receipt.timestamp}`, origin: 'delivery', status: 'accepted', decision: 'defect', summary: 'Cross-scope feedback.', affected_ac_ids: [...state.acceptance_manifest.ac_ids], affected_files: ['agent-runtime/lib/runtime.cjs'], evidence_pointers: ['current-thread#cross-scope-guard'], proposed_correction: 'Bounded correction.', analyzed_by: 'runtime:test', analyzed_at: now, scope: 'cross_scope' };
    const expanded = scope(state, { scope_id: 'scope-cross-scope-guard-next', allowed_paths: [...prior.allowed_paths, 'agent-runtime/TESTING.md'], implementation_paths: [...prior.allowed_paths, 'agent-runtime/TESTING.md'] });
    const context = platformKnowledge.withDigest({ ...fixtures()['platform-knowledge-context.v1.schema.json'], context_id: 'knowledge-cross-scope-guard', cycle_id: 'cycle-cross-scope-guard', work_id: state.work_id, source_revision: state.source_revision, scope_id: expanded.scope_id });
    const authorization = { schema: 'CrossScopeCorrectionAuthorization/v1', authorization_id: 'cross-scope-auth-guard', work_id: state.work_id, source_revision: state.source_revision, delivery_cycle_id: state.delivery_cycle_id, origin: 'delivery', source_receipt_id: state.feedback_analysis.source_receipt_id, feedback_analysis_id: state.feedback_analysis.analysis_id, decision: 'defect', scope: 'cross_scope', affected_ac_ids: [...state.acceptance_manifest.ac_ids], affected_files: ['agent-runtime/TESTING.md'], prior_scope_id: prior.scope_id, scope_id: expanded.scope_id, scope_contract_digest: convergence.digest(expanded), platform_knowledge_context_id: context.context_id, platform_knowledge_digest: context.digest, disposition: 'scope_expansion_correction', reason: 'Invalid expansion.', actor: 'current-thread', pointer: 'current-thread#cross-scope-guard', from_revision: state.revision, to_revision: state.revision + 1, created_at: now };
    const file = save(root, state); const before = fs.readFileSync(file, 'utf8');
    expect(() => runtime.recordCrossScopeCorrectionAuthorization(file, { expectedRevision: state.revision, sourceRevision: state.source_revision, authorization, scope_contract: expanded, platform_knowledge_context: context })).toThrow(expect.objectContaining({ code: 'GAP-CROSS-SCOPE-CORRECTION-001' }));
    expect(fs.readFileSync(file, 'utf8')).toBe(before);
  });

  test('routes consumed-feedback reconciliation to the typed follow-up authorization', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-follow-up-reconcile-'));
    const state = checkpoint({ work_id: 'scope-follow-up-reconcile', lifecycle_state: 'VERIFY', delivery_cycle_id: 'cycle-follow-up', assurance_policy: policy(), assurance_epoch: 1, epoch_correction_count: 2, scope_recovery_history: [{ plan_id: 'prior-recovery' }], review_packet: null, reviews: [], review_triage: null, verification: [] });
    const prior = scope(state, { scope_id: 'scope-follow-up-reconcile-prior' });
    state.scope_contract = prior;
    state.scope_contract_digest = convergence.digest(prior);
    const receipt = { timestamp: '2026-08-19T08:00:00.000Z' };
    state.delivery_feedback_receipt = receipt;
    state.correction_history = [{ correction_id: 'correction-previous', origin: 'delivery', analysis_id: 'analysis-previous', source_revision: state.source_revision, delivery_cycle_id: state.delivery_cycle_id }];
    state.feedback_analysis_history = [{ schema: 'DeliveryFeedbackAnalysis/v1', analysis_id: 'analysis-previous', work_id: state.work_id, source_revision: state.source_revision, delivery_cycle_id: state.delivery_cycle_id, origin: 'delivery', source_receipt_id: `delivery:${receipt.timestamp}`, status: 'accepted' }];
    const file = save(root, state);
    const reconciled = runtime.reconcileConsumedFeedback(file, { expectedRevision: state.revision, sourceRevision: state.source_revision, reason: 'Retire the consumed feedback pointer before the bounded follow-up.', pointer: 'current-thread#feedback-reconcile', actor: 'current-thread', timestamp: now });
    expect(reconciled.next_action).toMatch(/Record ScopeFollowUpAuthorization\/v1/);
    expect(reconciled.delivery_feedback_receipt).toBeNull();
  });

  test('rejects a follow-up while active feedback analysis or authorization remains', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-follow-up-active-feedback-'));
    const state = checkpoint({ work_id: 'scope-follow-up-active-feedback', lifecycle_state: 'VERIFY', delivery_cycle_id: 'cycle-follow-up', assurance_policy: policy(), assurance_epoch: 1, epoch_correction_count: 2, scope_recovery_history: [{ plan_id: 'prior-recovery' }], review_packet: null, reviews: [], review_triage: null, verification: [] });
    const prior = scope(state, { scope_id: 'scope-follow-up-active-feedback-prior' });
    state.scope_contract = prior;
    state.scope_contract_digest = convergence.digest(prior);
    state.feedback_analysis = { ...fixtures()['delivery-feedback-analysis.v1.schema.json'], work_id: state.work_id, source_revision: state.source_revision, delivery_cycle_id: state.delivery_cycle_id };
    const file = save(root, state);
    const followUp = { schema: 'ScopeFollowUpAuthorization/v1', follow_up_id: 'follow-up-active-feedback', work_id: state.work_id, source_revision: state.source_revision, prior_scope_id: prior.scope_id, scope_id: 'scope-follow-up-active-feedback-next', ac_ids: [...prior.ac_ids], affected_files: [...prior.allowed_paths], disposition: 'bounded_same_scope', reason: 'Attempt while feedback remains active.', pointer: 'current-thread#active-feedback', actor: 'current-thread', from_revision: state.revision, to_revision: state.revision + 1, timestamp: now, scope_contract: { ...prior, scope_id: 'scope-follow-up-active-feedback-next' } };
    expect(() => runtime.recordScopeFollowUpAuthorization(file, followUp, state.revision, state.source_revision)).toThrow(expect.objectContaining({ code: 'GAP-FEEDBACK-RECONCILIATION-001' }));
  });

  test('rejects a scope follow-up that expands AC or file boundaries', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-follow-up-guard-'));
    const state = checkpoint({ work_id: 'scope-follow-up-guard', lifecycle_state: 'VERIFY', assurance_policy: policy(), assurance_epoch: 1, epoch_correction_count: 2, scope_recovery_history: [{ plan_id: 'prior-recovery' }], review_packet: null, reviews: [], review_triage: null, verification: [] });
    const prior = scope(state, { scope_id: 'scope-follow-up-guard-prior' }); state.scope_contract = prior; state.scope_contract_digest = convergence.digest(prior);
    const file = save(root, state);
    const invalid = { schema: 'ScopeFollowUpAuthorization/v1', follow_up_id: 'follow-up-expanded', work_id: state.work_id, source_revision: state.source_revision, prior_scope_id: prior.scope_id, scope_id: 'scope-follow-up-expanded', ac_ids: ['AC-QUALITY-1', 'AC-OTHER'], affected_files: ['agent-runtime/lib/runtime.cjs', 'outside.js'], disposition: 'bounded_same_scope', reason: 'Expand', pointer: 'current-thread#expanded', actor: 'current-thread', from_revision: state.revision, to_revision: state.revision + 1, timestamp: now, scope_contract: { ...prior, scope_id: 'scope-follow-up-expanded', ac_ids: ['AC-QUALITY-1', 'AC-OTHER'], allowed_paths: [...prior.allowed_paths, 'outside.js'] } };
    expect(() => runtime.recordScopeFollowUpAuthorization(file, invalid, state.revision, state.source_revision)).toThrow(expect.objectContaining({ code: 'GAP-SCOPE-FOLLOW-UP-001' }));
  });

  test('keeps an existing knowledge-history entry idempotent during public scope recovery', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-recovery-knowledge-history-'));
    const state = checkpoint({ work_id: 'scope-recovery-knowledge-history', lifecycle_state: 'EXECUTE', assurance_policy: policy(), assurance_epoch: 1, epoch_correction_count: 2 });
    state.scope_contract = scope(state, { scope_id: 'scope-recovery-knowledge-history' });
    state.scope_contract_digest = convergence.digest(state.scope_contract);
    const baseContext = fixtures()['platform-knowledge-context.v1.schema.json'];
    const context = platformKnowledge.withDigest({ ...baseContext, work_id: state.work_id, source_revision: state.source_revision, scope_id: state.scope_contract.scope_id });
    state.platform_knowledge_required = true;
    state.platform_knowledge_cycle_id = context.cycle_id;
    state.platform_knowledge_context = context;
    state.platform_knowledge_context_history = [{ context_id: context.context_id, cycle_id: context.cycle_id }];
    state.review_packet = { packet_id: 'packet-recovery-knowledge-history', generation: 1 };
    state.reviews = [{ receipt_id: 'r1' }, { receipt_id: 'r2' }, { receipt_id: 'r3' }];
    state.verification = [{ id: 'reverse-recovery' }];
    state.evidence = [{ id: 'evidence-recovery' }];
    state.recovery_evidence = [{ id: 'recovery-evidence' }];
    const file = save(root, state);
    const nextScope = scope(state, { scope_id: 'scope-recovery-knowledge-history-narrowed' });
    const recovered = runtime.enterScopeRecovery(file, { schema: 'CheckpointConvergencePlan/v1', plan_id: 'plan-recovery-knowledge-history', reason: 'Narrow the scope without duplicating knowledge history.', pointer: 'WORK.md#convergence', actor: 'root', timestamp: now, disposition: 'narrow_current_scope', scope_contract: nextScope }, state.revision, state.source_revision);
    expect(recovered.platform_knowledge_context).toBeNull();
    expect(recovered.platform_knowledge_context_history).toEqual([{ context_id: context.context_id, cycle_id: context.cycle_id }]);
  });

  test('upgrader reports legacy evidence and over-scope health without mutating it', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-upgrade-health-'));
    const legacy = { work_id: 'legacy-status', status: 'In Development', lifecycle_state: 'EXECUTE', next_action: 'continue' };
    const legacyFile = save(root, legacy);
    const over = checkpoint({ work_id: 'over-scope', correction_count: 4 });
    const overFile = save(root, over);
    const before = fs.readFileSync(legacyFile, 'utf8');
    const report = runtime.upgradeActiveCheckpoints(root, { actor: 'runtime:checkpoint-upgrader', pointer: 'WORK.md#upgrade', reason: 'Audit active checkpoints.', timestamp: now });
    expect(report.items.find(item => item.work_id === 'legacy-status')).toMatchObject({ status: 'legacy_unbound', health: 'authority_required' });
    expect(report.items.find(item => item.work_id === 'over-scope')).toMatchObject({ status: 'scope_audit_required', health: 'scope_audit_required' });
    expect(fs.readFileSync(legacyFile, 'utf8')).toBe(before);
    expect(fs.readFileSync(overFile, 'utf8')).toContain('"correction_count":4');
  });

  test('classifies an unbound legacy checkpoint and routes unknown protocol through one typed error', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-upgrade-dialect-'));
    save(root, { work_id: 'unbound-legacy' });
    const legacyReport = runtime.upgradeActiveCheckpoints(root, { actor: 'runtime:checkpoint-upgrader', pointer: 'WORK.md#upgrade', reason: 'Audit legacy evidence.', timestamp: now });
    expect(legacyReport.items.find(item => item.work_id === 'unbound-legacy')).toMatchObject({ status: 'legacy_unbound', health: 'authority_required' });
    const unknown = checkpoint({ work_id: 'unknown-protocol', schema: 'WorkCheckpoint/v2', protocol_version: 'agent-development-runtime/v9' });
    const unknownFile = save(root, unknown);
    expect(() => runtime.upgradeCheckpoint(unknownFile, { expectedRevision: unknown.revision, sourceRevision: unknown.source_revision, actor: 'runtime:checkpoint-upgrader', pointer: 'WORK.md#upgrade', reason: 'Reject unknown protocol.', timestamp: now }, root)).toThrow(/unsupported checkpoint protocol/);
  });
});
