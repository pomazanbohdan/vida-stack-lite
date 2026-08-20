'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const runtime = require('../../lib/runtime.cjs');
const changeImpact = require('../../lib/change-impact.cjs');
const checkpointUpgrader = require('../../lib/checkpoint-upgrader.cjs');
const { checkpoint } = require('./fixtures.cjs');

function repo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-change-impact-'));
  execFileSync('git', ['init', '-q'], { cwd: root });
  execFileSync('git', ['config', 'user.email', 'impact@example.test'], { cwd: root });
  execFileSync('git', ['config', 'user.name', 'impact'], { cwd: root });
  fs.mkdirSync(path.join(root, 'src'), { recursive: true });
  fs.writeFileSync(path.join(root, 'src', 'scope.txt'), 'initial\n');
  execFileSync('git', ['add', '.'], { cwd: root });
  execFileSync('git', ['commit', '-qm', 'initial'], { cwd: root });
  return root;
}

function save(root, value) {
  const dir = path.join(root, '.agent', 'work', value.work_id);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'resume.json');
  fs.writeFileSync(file, JSON.stringify(value));
  return file;
}

function state() {
  return checkpoint({
    work_id: 'impact-flow', revision: 1, lifecycle_state: 'PLAN',
    allowed_paths: ['src/scope.txt'], fingerprint_paths: ['src/scope.txt'],
    sealed_at: undefined, sealed_revision: undefined, implementation_fingerprint: undefined,
    change_impact_required: true, scope_id: 'scope-impact'
  });
}

function assessment(c, phase, overrides = {}) {
  const value = {
    schema: 'ChangeImpactAssessment/v1', assessment_id: `impact-${phase}-${c.revision}`, work_id: c.work_id,
    cycle_id: 'cycle-impact', source_revision: c.source_revision, scope_id: c.scope_id,
    phase, snapshot_id: null, implementation_fingerprint: phase === 'post' ? '0'.repeat(64) : null,
    predicted_paths: ['src/scope.txt'], direct_impacts: ['scope behavior'], transitive_impacts: [],
    contract_impacts: [], behavioral_impacts: [], security_impacts: [], verified_paths: phase === 'post' ? ['src/scope.txt'] : [],
    unverified_edges: [], unknown_edges: [], unexpected_paths: [], risk_flags: [], predicted_test_profile: 'focused',
    status: 'pass', evidence_pointers: ['WORK.md#impact'], assessed_by: 'runtime:test', created_at: new Date().toISOString(), ...overrides
  };
  return { ...value, digest: changeImpact.digest(value) };
}

describe('change impact assessment lifecycle', () => {
  test('requires one pre assessment and one current post assessment before seal and binds review packet', () => {
    const root = repo();
    const initial = state();
    const file = save(root, initial);
    expect(() => runtime.beginExecution(file, { expectedRevision: 1, sourceRevision: initial.source_revision, approval: { source_revision: initial.source_revision, pointer: 'WORK.md#approval' } })).toThrow(/pre-change impact assessment/);

    let c = runtime.recordChangeImpact(file, { expectedRevision: 1, sourceRevision: initial.source_revision, assessment: assessment(initial, 'pre') });
    c = runtime.beginExecution(file, { expectedRevision: c.revision, sourceRevision: c.source_revision, approval: { source_revision: c.source_revision, pointer: 'WORK.md#approval' } });
    fs.writeFileSync(path.join(root, 'src', 'scope.txt'), 'changed implementation\n');
    const fingerprint = runtime.implementationFingerprint(c, root);
    const post = assessment(c, 'post', { implementation_fingerprint: fingerprint, assessment_id: 'impact-post-current' });
    c = runtime.recordChangeImpact(file, { expectedRevision: c.revision, sourceRevision: c.source_revision, assessment: post }, root);
    expect(() => runtime.validateGate(c, 'execute:post', { expectedRevision: c.revision, sourceRevision: c.source_revision, root })).not.toThrow();
    c = runtime.sealMutation(file, c.revision, c.source_revision, root);
    expect(c.scope_snapshot.change_impact_assessment_id).toBe('impact-post-current');

    const packet = {
      schema: 'BlindReviewPacket/v2', status: 'frozen', packet_id: 'impact-packet', packet_version: 1, wave: 1,
      generation: 1, work_id: c.work_id, source_revision: c.source_revision, sealed_revision: c.sealed_revision,
      implementation_fingerprint: c.implementation_fingerprint, acceptance_manifest_id: c.acceptance_manifest.id,
      acceptance_manifest_version: c.acceptance_manifest.version, required_profile: { model: 'configured', reasoning: 'high' },
      review_scope: { paths: c.fingerprint_paths, absence_assertions: {} }
    };
    c = runtime.freezeReviewPacket(file, packet, c.revision, c.source_revision);
    expect(c.review_packet.change_impact_digest).toBe(c.change_impact_assessment.digest);
  });

  test('fails closed for a narrow predicted profile when unknown impact edges exist', () => {
    const root = repo();
    const initial = state();
    const file = save(root, initial);
    const bad = assessment(initial, 'pre', { unknown_edges: ['src/scope.txt -> unknown'], predicted_test_profile: 'focused', status: 'warning' });
    expect(() => runtime.recordChangeImpactAssessment(file, { expectedRevision: 1, sourceRevision: initial.source_revision, assessment: bad })).toThrow(/test profile is too narrow/);
    expect(JSON.parse(fs.readFileSync(file, 'utf8')).revision).toBe(1);
  });

  test('rejects a post assessment bound to a stale scope snapshot', () => {
    const root = repo();
    const initial = state();
    const file = save(root, initial);
    let c = runtime.recordChangeImpactAssessment(file, { expectedRevision: 1, sourceRevision: initial.source_revision, assessment: assessment(initial, 'pre') });
    c = runtime.beginExecution(file, { expectedRevision: c.revision, sourceRevision: c.source_revision, approval: { source_revision: c.source_revision, pointer: 'WORK.md#approval' } });
    fs.writeFileSync(path.join(root, 'src', 'scope.txt'), 'changed implementation\n');
    const fingerprint = runtime.implementationFingerprint(c, root);
    const stale = assessment(c, 'post', {
      assessment_id: 'impact-post-stale-snapshot',
      implementation_fingerprint: fingerprint,
      snapshot_id: '1'.repeat(64)
    });
    c = runtime.recordChangeImpactPost(file, { expectedRevision: c.revision, sourceRevision: c.source_revision, assessment: stale }, root);
    expect(() => runtime.sealMutation(file, c.revision, c.source_revision, root)).toThrow(/snapshot/);
    expect(JSON.parse(fs.readFileSync(file, 'utf8')).revision).toBe(c.revision);
  });

  test('invalidates active assessment into typed history at a new correction boundary', () => {
    const root = repo();
    const initial = state();
    const file = save(root, initial);
    let c = runtime.recordChangeImpactAssessment(file, { expectedRevision: 1, sourceRevision: initial.source_revision, assessment: assessment(initial, 'pre') });
    c = runtime.beginExecution(file, { expectedRevision: c.revision, sourceRevision: c.source_revision, approval: { source_revision: c.source_revision, pointer: 'WORK.md#approval' } });
    fs.writeFileSync(path.join(root, 'src', 'scope.txt'), 'changed implementation\n');
    const post = assessment(c, 'post', { assessment_id: 'impact-post-history', implementation_fingerprint: runtime.implementationFingerprint(c, root) });
    c = runtime.recordChangeImpactPost(file, { expectedRevision: c.revision, sourceRevision: c.source_revision, assessment: post }, root);
    c = runtime.beginCorrection(file, { expectedRevision: c.revision, sourceRevision: c.source_revision, correction: { reason: 'bounded correction', pointer: 'WORK.md#correction' } });
    expect(c.change_impact_assessment).toBeNull();
    expect(c.change_impact_history).toHaveLength(1);
    expect(c.change_impact_history[0].digest).toBe(post.digest);
    expect(() => runtime.validateGate(c, 'execute:post', { expectedRevision: c.revision, sourceRevision: c.source_revision, root })).toThrow(/post-change impact assessment/);
  });

  test('universal upgrader exposes the impact next operation without fabricating an assessment', () => {
    const current = state();
    const input = { expectedRevision: current.revision, sourceRevision: current.source_revision, reason: 'Require impact evidence.', pointer: 'WORK.md#impact', actor: 'runtime:test', timestamp: new Date().toISOString() };
    const plan = checkpointUpgrader.planCheckpoint(current, input, () => {});
    expect(plan.status).toBe('change_impact_preflight_required');
    expect(plan.next_operation).toMatch(/recordChangeImpactAssessment/);

    const normalized = checkpointUpgrader.planCheckpoint({ ...current, change_impact_required: false }, { ...input, requireChangeImpact: true }, () => {});
    expect(normalized.status).toBe('upgrade');
    expect(normalized.checkpoint.change_impact_required).toBe(true);
    expect(normalized.normalizations).toContain('enabled change impact assessment requirement');

    const executePlan = checkpointUpgrader.planCheckpoint({ ...current, lifecycle_state: 'EXECUTE', change_impact_assessment: null }, input, () => {});
    expect(executePlan.status).toBe('change_impact_post_required');
    expect(executePlan.next_operation).toMatch(/recordChangeImpactPost/);
    const deliveryPlan = checkpointUpgrader.planCheckpoint({ ...current, lifecycle_state: 'DELIVERY', change_impact_assessment: null }, input, () => {});
    expect(deliveryPlan.status).not.toBe('change_impact_post_required');

    const consumedAt = new Date().toISOString();
    const consumed = checkpointUpgrader.planCheckpoint({ ...current, delivery_feedback_receipt: { timestamp: consumedAt }, feedback_consumption_history: [{ origin: 'delivery', source_receipt_id: `delivery:${consumedAt}` }] }, input, () => {});
    expect(consumed.status).toBe('feedback_receipt_reconciliation_required');
    const historical = checkpointUpgrader.planCheckpoint({ ...current, delivery_feedback_receipt: { timestamp: consumedAt }, feedback_analysis_history: [{ origin: 'delivery', status: 'accepted', source_receipt_id: `delivery:${consumedAt}`, analysis_id: 'analysis-historical' }], correction_history: [{ origin: 'delivery', analysis_id: 'analysis-historical' }] }, input, () => {});
    expect(historical.status).toBe('feedback_receipt_reconciliation_required');
  });

  test('covers impact profile selection, cache validation and compact evidence boundaries', () => {
    const root = repo();
    const initial = state();
    const pre = assessment(initial, 'pre');
    expect(changeImpact.compact(pre)).toMatchObject({ schema: 'ChangeImpactAssessment/v1', phase: 'pre', predicted_test_profile: 'focused', direct_count: 1 });

    const expanded = assessment(initial, 'pre', {
      assessment_id: 'impact-expanded', transitive_impacts: ['shared helper'], predicted_test_profile: 'expanded'
    });
    expect(changeImpact.expectedProfile(expanded)).toBe('expanded');
    expect(changeImpact.pre(expanded, { work_id: initial.work_id, source_revision: initial.source_revision })).toBe(expanded);

    const highRisk = assessment(initial, 'pre', {
      assessment_id: 'impact-high-risk', risk_flags: ['public_contract'], predicted_test_profile: 'full'
    });
    expect(changeImpact.expectedProfile(highRisk)).toBe('full');
    expect(changeImpact.pre(highRisk, { work_id: initial.work_id, source_revision: initial.source_revision })).toBe(highRisk);

    const validCache = { cache_key: 'impact-cache', capability_epoch: 'host-1', hit: true };
    const cached = assessment(initial, 'pre', { assessment_id: 'impact-cached', cache: validCache });
    expect(changeImpact.validate(cached).cache).toEqual(validCache);
    const invalidCacheValues = [0, 'cache', {}, { cache_key: '', capability_epoch: 'host-1', hit: true }, { cache_key: 'impact-cache', capability_epoch: '', hit: true }, { cache_key: 'impact-cache', capability_epoch: 'host-1', hit: 'yes' }];
    invalidCacheValues.forEach((cache, index) => {
      const value = assessment(initial, 'pre', { assessment_id: `impact-invalid-cache-${index}`, cache });
      expect(() => changeImpact.validate(value)).toThrow(/cache/);
    });

    const post = assessment(initial, 'post', { assessment_id: 'impact-post-compact', implementation_fingerprint: '2'.repeat(64), verified_paths: ['src/scope.txt'] });
    expect(changeImpact.compact(post)).toMatchObject({ phase: 'post', digest: post.digest });
    expect(changeImpact.matchesSnapshot(post, { implementation_fingerprint: post.implementation_fingerprint, snapshot_id: null })).toBe(true);
    expect(changeImpact.matchesSnapshot({ ...post, digest: changeImpact.digest({ ...post, snapshot_id: '3'.repeat(64) }), snapshot_id: '3'.repeat(64) }, { implementation_fingerprint: post.implementation_fingerprint, snapshot_id: '3'.repeat(64) })).toBe(true);
    expect(() => changeImpact.matchesSnapshot(post, null)).toThrow(/snapshot binding/);
    expect(() => changeImpact.matchesSnapshot(post, { implementation_fingerprint: '4'.repeat(64), snapshot_id: null })).toThrow(/fingerprint/);
    const wrongSnapshot = { ...post, snapshot_id: '5'.repeat(64), digest: changeImpact.digest({ ...post, snapshot_id: '5'.repeat(64) }) };
    expect(() => changeImpact.matchesSnapshot(wrongSnapshot, { implementation_fingerprint: post.implementation_fingerprint, snapshot_id: '6'.repeat(64) })).toThrow(/identity/);

    const future = assessment(initial, 'pre', { assessment_id: 'impact-future', created_at: new Date(Date.now() + 301000).toISOString() });
    expect(() => changeImpact.validate(future)).toThrow(/timestamp/);
    expect(root).toBeTruthy();
  });

  test('rejects unsafe, malformed and blocked impact evidence without mutating the checkpoint', () => {
    const initial = state();
    const invalid = [
      { schema: 'Other/v1' },
      { assessment_id: '' },
      { work_id: 'other-work' },
      { source_revision: 'other-source' },
      { scope_id: 'other-scope' },
      { phase: 'unknown' },
      { snapshot_id: 'bad' },
      { implementation_fingerprint: 'bad' },
      { predicted_paths: [] },
      { direct_impacts: ['same', 'same'] },
      { risk_flags: ['not-a-risk'] },
      { predicted_test_profile: 'not-a-profile' },
      { status: 'unknown' },
      { status: 'pass', unknown_edges: ['unknown'] },
      { phase: 'pre', implementation_fingerprint: '1'.repeat(64) },
      { phase: 'post', implementation_fingerprint: null },
      { phase: 'post', verified_paths: [] },
      { evidence_pointers: ['Bearer secret'] },
      { evidence_pointers: ['line\nbreak'] },
      { digest: 'bad' }
    ];
    invalid.forEach((override, index) => {
      const value = assessment(initial, 'pre', override);
      expect(() => changeImpact.validate(value, { work_id: initial.work_id, source_revision: initial.source_revision, scope_id: initial.scope_id }), `invalid impact ${index}`).toThrow();
    });
    const blocked = assessment(initial, 'pre', { assessment_id: 'impact-blocked', status: 'blocked' });
    expect(() => changeImpact.pre(blocked)).toThrow(/blocked/);
    const hiddenFull = assessment(initial, 'pre', { assessment_id: 'impact-hidden-full', unknown_edges: ['unknown'], predicted_test_profile: 'full', status: 'pass' });
    expect(() => changeImpact.validate(hiddenFull)).toThrow(/full profile|unverified edges/);
    const warningUnknown = assessment(initial, 'pre', { assessment_id: 'impact-warning-unknown', unknown_edges: ['unknown'], predicted_test_profile: 'full', status: 'warning' });
    expect(changeImpact.pre(warningUnknown)).toBe(warningUnknown);
    const hiddenUnverified = assessment(initial, 'pre', { assessment_id: 'impact-hidden-unverified', unverified_edges: ['unverified'], predicted_test_profile: 'full', status: 'pass' });
    expect(() => changeImpact.validate(hiddenUnverified)).toThrow(/unverified edges/);
    const postMissingPaths = assessment(initial, 'post', { assessment_id: 'impact-post-no-verified', implementation_fingerprint: '1'.repeat(64), verified_paths: [] });
    expect(() => changeImpact.validate(postMissingPaths)).toThrow(/verified paths/);
    const postIncomplete = assessment(initial, 'post', { assessment_id: 'impact-post-incomplete', implementation_fingerprint: '1'.repeat(64), verified_paths: ['src/scope.txt'], unverified_edges: ['src/scope.txt -> unknown'], predicted_test_profile: 'full', status: 'warning' });
    expect(() => changeImpact.post(postIncomplete)).toThrow(/full impact profile/);
    const wrongPhase = assessment(initial, 'post', { assessment_id: 'impact-wrong-phase', implementation_fingerprint: '1'.repeat(64), verified_paths: ['src/scope.txt'] });
    expect(() => changeImpact.pre(wrongPhase)).toThrow(/pre impact/);
    expect(() => changeImpact.post(assessment(initial, 'pre'))).toThrow(/post impact/);
  });

  test('retains compact assurance history when legacy review lists are absent', () => {
    const root = repo();
    const initial = state();
    const scope = {
      schema: 'ImplementationScope/v1', scope_id: 'scope-impact-recovery', work_id: initial.work_id,
      source_revision: initial.source_revision, ac_ids: [...initial.acceptance_manifest.ac_ids],
      allowed_paths: [...initial.allowed_paths], changed_symbols: ['impact'], non_goals: ['product scope'],
      acceptance_trace: ['WORK.md#acceptance'], behavior_trace: ['WORK.md#behavior'], test_trace: ['WORK.md#tests'],
      diagnostic_trace: ['WORK.md#diagnostic'], attribution: { thread_id: 'thread-impact', pointer: 'WORK.md#scope' },
      owner: 'runtime:test', created_at: new Date().toISOString()
    };
    const recoverable = {
      ...initial, lifecycle_state: 'EXECUTE', assurance_policy: { schema: 'AssurancePolicy/v1', scope_triage: true, release: 'scope-triage/v1', max_corrections_per_epoch: 2, activated_by: 'runtime:test', activated_at: new Date().toISOString() },
      assurance_epoch: 1, epoch_correction_count: 2, scope_contract: scope, scope_contract_digest: runtime.scopeConvergence.digest(scope)
    };
    delete recoverable.reviews;
    delete recoverable.verification;
    delete recoverable.evidence;
    delete recoverable.recovery_evidence;
    const file = save(root, recoverable);
    const plan = { schema: 'CheckpointConvergencePlan/v1', plan_id: 'impact-recovery-plan', reason: 'Narrow impact scope.', pointer: 'WORK.md#recovery', actor: 'runtime:test', timestamp: new Date().toISOString(), disposition: 'narrow_current_scope', scope_contract: { ...scope, scope_id: 'scope-impact-recovery-next' } };
    const next = runtime.enterScopeRecovery(file, plan, recoverable.revision, recoverable.source_revision);
    expect(next.scope_recovery_history[0].invalidated_assurance).toMatchObject({ review_receipt_ids: [], verification_ids: [], evidence_ids: [], recovery_evidence_ids: [] });
  });
});
