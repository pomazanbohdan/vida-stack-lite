'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const runtime = require('../../lib/runtime.cjs');
const knowledge = require('../../lib/platform-knowledge.cjs');
const assuranceContext = require('../../lib/runtime-assurance-context.cjs');
const checkpointUpgrader = require('../../lib/checkpoint-upgrader.cjs');
const { checkpoint, now } = require('./fixtures.cjs');

function repo() { const root = fs.mkdtempSync(path.join(os.tmpdir(), 'platform-knowledge-')); fs.mkdirSync(path.join(root, '.git')); fs.mkdirSync(path.join(root, '.agent', 'work', 'quality-tooling'), { recursive: true }); return root; }
function save(root, value) { const file = path.join(root, '.agent', 'work', 'quality-tooling', 'resume.json'); fs.writeFileSync(file, JSON.stringify(value)); return file; }
function context(overrides = {}) {
  const base = { schema: 'PlatformKnowledgeContext/v1', context_id: 'knowledge-cycle-1', work_id: 'quality-tooling', cycle_id: 'cycle-1', source_revision: 'f10-quality-tooling', scope_id: 'scope-quality', change_kind: 'feature', br_sr_ac: { br: ['BR-QUALITY'], sr: ['SR-QUALITY'], ac: ['AC-QUALITY-1'] }, official_sources: [{ url: 'https://docs.example.test/platform/', title: 'Target Platform Academy', platform_version: '8.x', last_verified: now, source_hash: 'a'.repeat(64), applicability: 'supported UI behavior', pointer: 'docs/project/academy' }], local_sources: [], skills: [{ skill_id: 'target-platform-freedom-ui-frontend-diagnostics', path: '.codex/skills/target-platform-freedom-ui-frontend-diagnostics/SKILL.md', skill_sha256: 'b'.repeat(64), role: 'executor', phase: 'execute', status: 'applied', evidence_pointer: 'WORK.md#skills' }], cache: { capability_epoch: 'host-1', hit: false, snapshot_digest: 'c'.repeat(64) }, warnings: [], conflicts: [], created_at: now, next_action: 'Apply documented platform patterns.' };
  return knowledge.withDigest({ ...base, ...overrides });
}
function validation(c, overrides = {}) { return { schema: 'DocumentationSkillValidation/v1', validation_id: 'validation-1', work_id: c.work_id, cycle_id: c.cycle_id, context_id: c.context_id, source_revision: c.source_revision, status: 'pass', official_matches: [{ source_url: c.official_sources[0].url, result: 'match', evidence_pointer: 'WORK.md#docs' }], skill_matches: c.skills.map(x => ({ skill_id: x.skill_id, skill_sha256: x.skill_sha256, result: 'match', evidence_pointer: x.evidence_pointer })), findings: [], evidence_pointers: ['WORK.md#validator'], validated_by: 'documentation-skill-validator', validated_at: now, next_action: 'Continue to exact-three review.', ...overrides }; }

describe('PlatformKnowledgeContext/v1', () => {
  test('records one immutable context and requires it before mutation when opted in', () => {
    const root = repo();
    const base = checkpoint({ lifecycle_state: 'PLAN', sealed_at: undefined, sealed_revision: undefined, implementation_fingerprint: undefined, platform_knowledge_required: true });
    const file = save(root, base);
    expect(() => runtime.beginExecution(file, { expectedRevision: base.revision, sourceRevision: base.source_revision, approval: { source_revision: base.source_revision, pointer: 'WORK.md#approval' } })).toThrow(/platform knowledge context required/);
    let next = runtime.recordPlatformKnowledgeContext(file, { expectedRevision: base.revision, sourceRevision: base.source_revision, context: context() });
    expect(next.platform_knowledge_context.digest).toHaveLength(64);
    expect(() => runtime.recordPlatformKnowledgeContext(file, { expectedRevision: next.revision, sourceRevision: next.source_revision, context: context() })).toThrow(/already recorded/);
    next = runtime.beginExecution(file, { expectedRevision: next.revision, sourceRevision: next.source_revision, approval: { source_revision: next.source_revision, pointer: 'WORK.md#approval' } });
    expect(next.lifecycle_state).toBe('EXECUTE');
  });

  test('rejects tampered context and mismatched cycle', () => {
    const c = context();
    expect(() => knowledge.validateContext({ ...c, digest: '0'.repeat(64) })).toThrow(/digest invalid/);
    const root = repo();
    const base = checkpoint({ lifecycle_state: 'PLAN', sealed_at: undefined, sealed_revision: undefined, implementation_fingerprint: undefined, platform_knowledge_required: true });
    const file = save(root, base);
    expect(() => runtime.recordPlatformKnowledgeContext(file, { expectedRevision: base.revision, sourceRevision: base.source_revision, context: context({ work_id: 'other-work' }) })).toThrow(/work binding/);
  });

  test('records the separate documentation/skill validator and does not create a fourth review', () => {
    const root = repo();
    const base = checkpoint({ lifecycle_state: 'EXECUTE', sealed_at: undefined, sealed_revision: undefined, implementation_fingerprint: undefined, platform_knowledge_required: true });
    const file = save(root, base);
    let next = runtime.recordPlatformKnowledgeContext(file, { expectedRevision: base.revision, sourceRevision: base.source_revision, context: context() });
    next = runtime.recordDocumentationSkillValidation(file, { expectedRevision: next.revision, sourceRevision: next.source_revision, validation: validation(next.platform_knowledge_context) });
    expect(next.documentation_skill_validation.status).toBe('pass');
    expect(next.reviews).toHaveLength(0);
  });

  test('seal preserves the current cycle knowledge context for verify and review', () => {
    const root = repo();
    fs.mkdirSync(path.join(root, 'agent-runtime', 'lib'), { recursive: true });
    fs.copyFileSync(path.resolve(__dirname, '../../lib/runtime.cjs'), path.join(root, 'agent-runtime', 'lib', 'runtime.cjs'));
    execFileSync('git', ['init', '-q'], { cwd: root });
    execFileSync('git', ['-c', 'user.email=test@example.invalid', '-c', 'user.name=test', 'add', '.'], { cwd: root });
    execFileSync('git', ['-c', 'user.email=test@example.invalid', '-c', 'user.name=test', 'commit', '-qm', 'fixture'], { cwd: root });
    const current = context();
    const base = checkpoint({
      lifecycle_state: 'EXECUTE', sealed_at: undefined, sealed_revision: undefined, implementation_fingerprint: undefined,
      platform_knowledge_required: true, platform_knowledge_context: current, platform_knowledge_cycle_id: current.cycle_id,
      documentation_skill_validation: validation(current)
    });
    const file = save(root, base);
    const sealed = runtime.sealMutation(file, base.revision, base.source_revision, root);
    expect(sealed.lifecycle_state).toBe('VERIFY');
    expect(sealed.platform_knowledge_context).toMatchObject({ context_id: current.context_id, cycle_id: current.cycle_id, digest: current.digest });
    expect(sealed.documentation_skill_validation).toMatchObject({ context_id: current.context_id, status: 'pass' });
    expect(sealed.platform_knowledge_context_history).toEqual([]);
  });

  test('restores a context lost by an older seal only from exact compact history', () => {
    const root = repo();
    const current = context();
    const base = checkpoint({
      source_revision: current.source_revision,
      lifecycle_state: 'VERIFY',
      sealed_revision: 10,
      sealed_at: now,
      implementation_fingerprint: 'd'.repeat(64),
      platform_knowledge_required: true,
      platform_knowledge_context: null,
      platform_knowledge_cycle_id: current.cycle_id,
      platform_knowledge_invalidated_by_revision: 8,
      scope_id: current.scope_id,
      platform_knowledge_context_history: [{ context_id: current.context_id, cycle_id: current.cycle_id, source_revision: current.source_revision, scope_id: current.scope_id, digest: current.digest, validator_status: null, invalidated_by_revision: 8 }]
    });
    const file = save(root, base);
    const input = { expectedRevision: base.revision, sourceRevision: base.source_revision, context: { ...current, digest: undefined }, history_context_id: current.context_id, history_digest: current.digest, recovery_id: 'knowledge-recovery-quality-1', reason: 'Restore the current cycle context cleared by an older seal.', pointer: 'WORK.md#knowledge-recovery', actor: 'runtime:test', timestamp: now };
    const restored = runtime.restorePlatformKnowledgeContext(file, input);
    expect(restored.revision).toBe(base.revision + 1);
    expect(restored.lifecycle_state).toBe('VERIFY');
    expect(restored.implementation_fingerprint).toBe(base.implementation_fingerprint);
    expect(restored.platform_knowledge_context).toMatchObject({ context_id: current.context_id, cycle_id: current.cycle_id, digest: current.digest });
    expect(restored.platform_knowledge_recovery_history).toHaveLength(1);
    expect(restored.next_action).toMatch(/documentation\/skill validation/);
    const wrongFile = save(root, base);
    const wrong = { ...input, context: context({ scope_id: 'other-scope' }), history_digest: current.digest, recovery_id: 'knowledge-recovery-quality-2' };
    let error;
    try { runtime.restorePlatformKnowledgeContext(wrongFile, wrong); } catch (caught) { error = caught; }
    expect(error?.code).toBe('GAP-PLATFORM-KNOWLEDGE-RECOVERY-001');
  });

  test('correction invalidates the context for the next cycle', () => {
    const c = context();
    const invalidated = { ...checkpoint(), platform_knowledge_required: true, platform_knowledge_context: c, platform_knowledge_cycle_id: c.cycle_id, documentation_skill_validation: validation(c) };
    const next = runtime.platformKnowledge;
    expect(next.contextMatchesCheckpoint(c, invalidated)).toBe(true);
    const reset = runtime.platformKnowledge.compact(c, validation(c));
    expect(reset.documentation_skill_validation).toBe('pass');
  });

  test('routes invalid lifecycle, scope, and documentation states through typed gates', () => {
    const root = repo();
    const plan = checkpoint({ lifecycle_state: 'PLAN', sealed_at: undefined, sealed_revision: undefined, implementation_fingerprint: undefined, platform_knowledge_required: true });
    expect(() => runtime.validateGate(plan, 'execute:pre', { expectedRevision: plan.revision, sourceRevision: plan.source_revision, root })).toThrow(/platform knowledge context required/);
    const planWithContext = { ...plan, platform_knowledge_context: context(), platform_knowledge_cycle_id: 'cycle-1' };
    expect(runtime.validateGate(planWithContext, 'execute:pre', { expectedRevision: plan.revision, sourceRevision: plan.source_revision, root })).toBe(true);
    const verify = checkpoint({ lifecycle_state: 'VERIFY', platform_knowledge_required: true, platform_knowledge_context: context(), platform_knowledge_cycle_id: 'cycle-1' });
    const verifyFile = save(root, verify);
    expect(() => runtime.recordPlatformKnowledgeContext(verifyFile, { expectedRevision: verify.revision, sourceRevision: verify.source_revision, context: context({ cycle_id: 'cycle-2' }) })).toThrow(/trace\/plan\/execute/);
    const planFile = save(root, plan);
    expect(() => runtime.recordDocumentationSkillValidation(planFile, { expectedRevision: plan.revision, sourceRevision: plan.source_revision, validation: validation(context()) })).toThrow(/execute\/verify/);
    const execute = checkpoint({ lifecycle_state: 'EXECUTE', sealed_at: undefined, sealed_revision: undefined, implementation_fingerprint: undefined, platform_knowledge_required: true });
    const executeFile = save(root, execute);
    expect(() => runtime.recordDocumentationSkillValidation(executeFile, { expectedRevision: execute.revision, sourceRevision: execute.source_revision, validation: validation(context()) })).toThrow(/context required/);
    let next = runtime.recordPlatformKnowledgeContext(executeFile, { expectedRevision: execute.revision, sourceRevision: execute.source_revision, context: context() });
    next = runtime.recordDocumentationSkillValidation(executeFile, { expectedRevision: next.revision, sourceRevision: next.source_revision, validation: validation(next.platform_knowledge_context, { status: 'changes_required', next_action: 'Apply correction.' }) });
    expect(next.documentation_skill_validation.status).toBe('changes_required');
    const scopedContract = { schema: 'ImplementationScope/v1', scope_id: 'other', work_id: 'quality-tooling', source_revision: 'f10-quality-tooling', ac_ids: ['AC-QUALITY-1'], allowed_paths: ['agent-runtime/lib/runtime.cjs'], changed_symbols: ['recordPlatformKnowledgeContext'], non_goals: ['product source'], acceptance_trace: ['WORK.md#knowledge'], behavior_trace: ['SCOPE:knowledge'], test_trace: ['tests/platform-knowledge.test.cjs#scope'], diagnostic_trace: ['WORK.md#scope'], attribution: { thread_id: 'thread-tools', pointer: 'WORK.md#scope' }, owner: 'executor', created_at: now };
    const scoped = checkpoint({ lifecycle_state: 'PLAN', sealed_at: undefined, sealed_revision: undefined, implementation_fingerprint: undefined, platform_knowledge_required: true, scope_contract: scopedContract, scope_contract_digest: runtime.scopeConvergence.digest(scopedContract), assurance_policy: { schema: 'AssurancePolicy/v1', scope_triage: true, max_corrections_per_epoch: 2 } });
    const scopedFile = save(root, scoped);
    expect(() => runtime.recordPlatformKnowledgeContext(scopedFile, { expectedRevision: scoped.revision, sourceRevision: scoped.source_revision, context: context() })).toThrow(/scope binding/);
    fs.mkdirSync(path.join(root, 'agent-runtime', 'lib'), { recursive: true });
    fs.copyFileSync(path.resolve(__dirname, '../../lib/runtime.cjs'), path.join(root, 'agent-runtime', 'lib', 'runtime.cjs'));
    execFileSync('git', ['init', '-q'], { cwd: root });
    execFileSync('git', ['-c', 'user.email=test@example.invalid', '-c', 'user.name=tests', 'add', '.'], { cwd: root });
    execFileSync('git', ['-c', 'user.email=test@example.invalid', '-c', 'user.name=tests', 'commit', '-qm', 'fixture'], { cwd: root });
    const verifyBase = checkpoint({ lifecycle_state: 'VERIFY', platform_knowledge_required: true, platform_knowledge_context: context(), platform_knowledge_cycle_id: 'cycle-1' });
    verifyBase.implementation_fingerprint = runtime.implementationFingerprint(verifyBase, root);
    const verifyWithKnowledge = { ...verifyBase, documentation_skill_validation: validation(context()) };
    expect(() => runtime.validateGate(verifyBase, 'verify:pre', { expectedRevision: verifyBase.revision, sourceRevision: verifyBase.source_revision, root })).toThrow(/documentation skill validation required/);
    expect(() => runtime.validateGate(verifyWithKnowledge, 'verify:pre', { expectedRevision: verifyWithKnowledge.revision, sourceRevision: verifyWithKnowledge.source_revision, root })).toThrow();
    const verifyWithWarning = { ...verifyWithKnowledge, documentation_skill_validation: validation(context(), { status: 'changes_required', next_action: 'correct' }) };
    expect(() => runtime.validateGate(verifyWithWarning, 'verify:pre', { expectedRevision: verifyWithWarning.revision, sourceRevision: verifyWithWarning.source_revision, root })).toThrow(/requires correction/);
  });

  test('upgrader reports a typed knowledge-context action for active unsealed work', () => {
    const root = repo();
    save(root, checkpoint({ lifecycle_state: 'PLAN', sealed_at: undefined, sealed_revision: undefined, implementation_fingerprint: undefined, platform_knowledge_required: true }));
    const report = runtime.upgradeActiveCheckpoints(root, { mode: 'audit', actor: 'runtime:test', reason: 'audit knowledge context', pointer: 'WORK.md#knowledge', timestamp: now });
    const item = report.items.find(x => x.path.endsWith('resume.json'));
    expect(item.status).toBe('knowledge_context_required');
    expect(item.next_operation).toMatch(/recordPlatformKnowledgeContext/);
    const candidate = checkpoint({ lifecycle_state: 'PLAN', sealed_at: undefined, sealed_revision: undefined, implementation_fingerprint: undefined, platform_knowledge_required: undefined });
    const planned = checkpointUpgrader.planCheckpoint(candidate, { targetProtocol: 'agent-development-runtime/v2', requirePlatformKnowledge: true, reason: 'knowledge', pointer: 'WORK.md#knowledge', actor: 'runtime:test', timestamp: now }, () => {});
    expect(planned.normalizations).toContain('enabled platform knowledge context requirement');
    const sealed = checkpoint({ lifecycle_state: 'PLAN', sealed_at: now, sealed_revision: 9, implementation_fingerprint: 'a'.repeat(64), platform_knowledge_required: undefined });
    expect(checkpointUpgrader.planCheckpoint(sealed, { targetProtocol: 'agent-development-runtime/v2', requirePlatformKnowledge: true, reason: 'knowledge', pointer: 'WORK.md#knowledge', actor: 'runtime:test', timestamp: now }, () => {}).status).toBe('already_current');
  });

  test('assurance context validates the documentation gate status and rejects malformed values', () => {
    const input = { work_id: 'work', revision: 1, source_revision: 'source', lifecycle_state: 'PLAN', next_action: 'next', documentation_skill_validation_status: 'warning' };
    const value = assuranceContext.build(input);
    expect(value.documentation_skill_validation_status).toBe('warning');
    expect(() => assuranceContext.build(null)).toThrow(/input required/);
    expect(() => assuranceContext.build({ ...input, documentation_skill_validation_status: 'bad' })).toThrow(/validation status invalid/);
    const invalid = { ...value, documentation_skill_validation_status: 'bad' };
    const identityFields = ['work_id', 'revision', 'source_revision', 'lifecycle_state', 'sealed_revision', 'implementation_fingerprint', 'packet_id', 'packet_version', 'wave', 'generation', 'review_mode', 'requested_reviewers', 'capability_epoch', 'lease_expires_at', 'platform_knowledge_context_id', 'platform_knowledge_digest', 'documentation_skill_validation_status'].reduce((out, key) => ({ ...out, [key]: invalid[key] }), {});
    invalid.context_id = assuranceContext.digest(identityFields);
    expect(() => assuranceContext.validate(invalid)).toThrow(/validation status invalid/);
  });
});

