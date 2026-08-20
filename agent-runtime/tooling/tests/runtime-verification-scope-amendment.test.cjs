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

function policy() {
  return { schema: 'AssurancePolicy/v1', scope_triage: true, release: 'scope-triage/v1', max_corrections_per_epoch: 2, activated_by: 'root', activated_at: now };
}

function declaredScope(state, overrides = {}) {
  return {
    schema: 'ImplementationScope/v1', scope_id: 'scope-verification-prior', work_id: state.work_id,
    source_revision: state.source_revision, ac_ids: [...state.acceptance_manifest.ac_ids],
    allowed_paths: [...state.allowed_paths], implementation_paths: [...state.allowed_paths], documentation_paths: [],
    changed_symbols: ['recordReviewReceipt'], non_goals: ['product source'], acceptance_trace: ['WORK.md#acceptance'],
    behavior_trace: ['SCOPE:verification-only amendment'], test_trace: ['tests/runtime-verification-scope-amendment.test.cjs'], diagnostic_trace: ['WORK.md#scope'],
    attribution: { thread_id: `thread-${state.work_id}`, pointer: 'WORK.md#scope' }, owner: 'executor', created_at: now, ...overrides
  };
}

function baseState(overrides = {}) {
  const value = checkpoint({ work_id: 'verification-amendment', lifecycle_state: 'EXECUTE', sealed_at: null, sealed_revision: null, implementation_fingerprint: null, assurance_policy: policy(), platform_knowledge_context: null, platform_knowledge_cycle_id: null, documentation_skill_validation: null, ...overrides });
  value.scope_contract = declaredScope(value);
  value.scope_contract_digest = convergence.digest(value.scope_contract);
  return value;
}

function contextFor(state, scopeId, cycleId = 'cycle-verification-next') {
  const source = fixtures()['platform-knowledge-context.v1.schema.json'];
  const value = { ...source, work_id: state.work_id, source_revision: state.source_revision, scope_id: scopeId, context_id: `knowledge-${scopeId}`, cycle_id: cycleId, br_sr_ac: { br: ['BR-QUALITY-1'], sr: ['SR-QUALITY-1'], ac: [...state.acceptance_manifest.ac_ids] }, created_at: now };
  return platformKnowledge.withDigest(value);
}

function amendmentFor(state, nextScope, context, overrides = {}) {
  const added = nextScope.allowed_paths.filter(file => !state.scope_contract.allowed_paths.includes(file));
  return {
    schema: 'VerificationScopeAmendment/v1', amendment_id: 'verification-amendment-1', work_id: state.work_id, source_revision: state.source_revision,
    prior_scope_id: state.scope_contract.scope_id, scope_id: nextScope.scope_id, ac_ids: [...state.scope_contract.ac_ids], added_files: added,
    scope_contract_digest: convergence.digest(nextScope), platform_knowledge_context_id: context.context_id, platform_knowledge_digest: context.digest,
    evidence: { status: 'failed', command: 'node script/Test-Samplesample-projectCaseFieldVisibility.js', path: added[0], expected: 'The focused check passes.', actual: 'The stale assertion fails for the approved topic surface.', pointer: 'current-thread#focused-check' },
    reason: 'Authorize the bounded verification-only correction for a stale focused assertion.', actor: 'runtime:test', pointer: 'current-thread#verification-scope-amendment', from_revision: state.revision, to_revision: state.revision + 1, timestamp: now, ...overrides
  };
}

describe('verification scope amendment', () => {
  test('records one additive test-only scope amendment with a fresh knowledge context', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-verification-amendment-'));
    const state = baseState();
    const nextScope = declaredScope(state, { scope_id: 'scope-verification-next', allowed_paths: [...state.scope_contract.allowed_paths, 'script/Test-Samplesample-projectCaseFieldVisibility.js'], implementation_paths: [...state.scope_contract.implementation_paths, 'script/Test-Samplesample-projectCaseFieldVisibility.js'] });
    const context = contextFor(state, nextScope.scope_id);
    const file = save(root, state);
    const next = runtime.recordVerificationScopeAmendment(file, { expectedRevision: state.revision, sourceRevision: state.source_revision, amendment: amendmentFor(state, nextScope, context), scope_contract: nextScope, platform_knowledge_context: context });
    expect(next.revision).toBe(state.revision + 1);
    expect(next.scope_contract.scope_id).toBe(nextScope.scope_id);
    expect(next.allowed_paths).toContain('script/Test-Samplesample-projectCaseFieldVisibility.js');
    expect(next.platform_knowledge_context.context_id).toBe(context.context_id);
    expect(next.verification_scope_amendment_history).toHaveLength(1);
    expect(next.next_action).toMatch(/Rebind\/expand the coordination scope/);
  });

  test.each([
    ['wrong lifecycle', { lifecycle_state: 'PLAN' }, /requires execute/],
    ['active packet', { review_packet: { packet_id: 'active' } }, /retired assurance/],
    ['AC expansion', {}, /AC set must remain unchanged/],
    ['product path', {}, /added test path/],
    ['stale source', {}, /compare-and-swap mismatch/],
    ['replay', {}, /already recorded/]
  ])('rejects %s without changing the checkpoint', (_name, overrides, expected) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-verification-amendment-negative-'));
    const state = baseState(overrides);
    const nextScope = declaredScope(state, { scope_id: 'scope-verification-next', allowed_paths: [...state.scope_contract.allowed_paths, 'script/Test-Samplesample-projectCaseFieldVisibility.js'], implementation_paths: [...state.scope_contract.implementation_paths, 'script/Test-Samplesample-projectCaseFieldVisibility.js'] });
    const context = contextFor(state, nextScope.scope_id, `cycle-${_name}`);
    const amendment = amendmentFor(state, nextScope, context, _name === 'AC expansion' ? { ac_ids: ['AC-QUALITY-1', 'AC-OTHER'] } : _name === 'product path' ? { added_files: ['src/project/Sample_BX/Page.js'], evidence: { status: 'failed', command: 'node check', path: 'src/project/Sample_BX/Page.js', expected: 'pass', actual: 'fail', pointer: 'current-thread#failure' } } : {});
    if (_name === 'replay') state.verification_scope_amendment_history = [amendment];
    const file = save(root, state);
    const before = fs.readFileSync(file, 'utf8');
    const expectedRevision = _name === 'stale source' ? state.revision : state.revision;
    const sourceRevision = _name === 'stale source' ? 'git:stale' : state.source_revision;
    expect(() => runtime.recordVerificationScopeAmendment(file, { expectedRevision, sourceRevision, amendment, scope_contract: nextScope, platform_knowledge_context: context })).toThrow(expected);
    expect(fs.readFileSync(file, 'utf8')).toBe(before);
  });

  test('rejects a reused knowledge context and an expanded scope contract', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-verification-amendment-guards-'));
    const state = baseState();
    const nextScope = declaredScope(state, { scope_id: 'scope-verification-next', allowed_paths: [...state.scope_contract.allowed_paths, 'script/Test-Samplesample-projectCaseFieldVisibility.js'], implementation_paths: [...state.scope_contract.implementation_paths, 'script/Test-Samplesample-projectCaseFieldVisibility.js'] });
    const stale = contextFor(state, state.scope_contract.scope_id, 'cycle-old');
    state.platform_knowledge_context = stale;
    state.platform_knowledge_cycle_id = stale.cycle_id;
    const file = save(root, state);
    const before = fs.readFileSync(file, 'utf8');
    expect(() => runtime.recordVerificationScopeAmendment(file, { expectedRevision: state.revision, sourceRevision: state.source_revision, amendment: amendmentFor(state, nextScope, stale), scope_contract: nextScope, platform_knowledge_context: stale })).toThrow(/scope binding invalid|stale/);
    expect(fs.readFileSync(file, 'utf8')).toBe(before);
  });
});

