'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const runtime = require('../../lib/runtime.cjs');
const checkpointUpgrader = require('../../lib/checkpoint-upgrader.cjs');
const ponytailPolicy = require('../../lib/ponytail-policy.cjs');
const { checkpoint, fixtures, now, projectRegistry } = require('./fixtures.cjs');

function repo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-upgrader-'));
  fs.mkdirSync(path.join(root, 'docs', 'tenants'), { recursive: true });
  fs.writeFileSync(path.join(root, 'docs', 'tenants', 'project-registry.v1.json'), JSON.stringify(projectRegistry));
  return root;
}

function save(root, c) {
  const dir = path.join(root, '.agent', 'work', c.work_id);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'resume.json');
  fs.writeFileSync(file, `${JSON.stringify(c)}\n`);
  return file;
}

function input(c, overrides = {}) {
  return { expectedRevision: c.revision, sourceRevision: c.source_revision, reason: 'Align the active checkpoint with the current runtime protocol.', pointer: 'WORK.md#protocol-upgrade', actor: 'runtime:checkpoint-upgrader', timestamp: now, ...overrides };
}

function legacy(overrides = {}) {
  return checkpoint({ work_id: 'legacy-work', protocol_version: 'agent-development-runtime/v2.2.0', ...overrides });
}

describe('universal active checkpoint protocol upgrader', () => {
  test('maps a known legacy alias to v2, records history, and is idempotent', () => {
    const root = repo();
    const c = legacy({ lifecycle_state: 'DELIVERY', protocol_migration_history: [] });
    const file = save(root, c);
    const upgraded = runtime.upgradeCheckpoint(file, input(c), root);
    expect(upgraded).toMatchObject({ protocol_version: 'agent-development-runtime/v2', revision: c.revision + 1 });
    expect(upgraded.protocol_migration_history[0]).toMatchObject({ schema: 'CheckpointProtocolMigration/v1', from_protocol: 'agent-development-runtime/v2.2.0', to_protocol: 'agent-development-runtime/v2', from_revision: c.revision, to_revision: c.revision + 1 });
    const migration = upgraded.protocol_migration_history[0];
    const invalidMigrations = [
      { schema: 'Wrong/v1' }, { migration_id: '' }, { work_id: '' }, { from_protocol: '' },
      { to_protocol: 'agent-development-runtime/v9' }, { from_checkpoint_schema: 'Wrong/v1' },
      { to_checkpoint_schema: 'Wrong/v1' }, { from_revision: 0 }, { to_revision: migration.from_revision },
      { source_revision: '' }, { normalizations: null }, { reason: '' }, { pointer: '' },
      { actor: '' }, { timestamp: 'not-a-time' }, { status: 'pending' }
    ];
    for (const change of invalidMigrations) expect(() => runtime.assertCheckpoint({ ...upgraded, protocol_migration_history: [{ ...migration, ...change }] })).toThrow(/protocol migration/);
    // Exercise the legal lower boundary independently of the upgrader's
    // normal (larger) revision. This keeps boundary validators observable to
    // mutation testing rather than relying on a single historical example.
    const boundaryMigration = {
      ...migration, from_revision: 1, to_revision: 2
    };
    expect(() => runtime.assertCheckpoint({ ...upgraded, protocol_migration_history: [boundaryMigration] })).not.toThrow();
    for (const change of [{ from_revision: 0, to_revision: 1 }, { to_revision: 1 }]) {
      expect(() => runtime.assertCheckpoint({ ...upgraded, protocol_migration_history: [{ ...boundaryMigration, ...change }] })).toThrow(/protocol migration/);
    }
    expect(() => runtime.assertCheckpoint({ ...upgraded, protocol_migration_history: [boundaryMigration, { ...boundaryMigration, actor: '' }] })).toThrow(/actor missing/);
    const repeated = runtime.upgradeCheckpoint(file, input(upgraded), root);
    expect(repeated.revision).toBe(upgraded.revision);
    expect(repeated.protocol_migration_history).toHaveLength(1);
  });

  test('reconciles a stale architect next action on an otherwise-current typed escalation', () => {
    const root = repo();
    const f = fixtures();
    const c = checkpoint({
      work_id: 'quality-tooling', protocol_version: 'agent-development-runtime/v3', lifecycle_state: 'VERIFY',
      coordination: { schema: 'CoordinationBinding/v1', work_id: 'quality-tooling', thread_id: 'thread-current', ticket_id: 'ticket-current', generation: 1, exclusive_resources: ['file:a'], active_resources: ['file:a'], blocked_resources: [] },
      review_dispatch_reservation_ledger: [], review_generation: 2,
      review_packet: { ...f['blind-review-packet.v2.schema.json'], packet_id: 'packet-current', packet_version: 2, wave: 2, generation: 2 },
      reviews: [{ finding_objects: [{ finding_id: 'finding-persistent', escalation: 'persistent' }] }],
      next_action: 'Record one fresh ArchitectDecision/v1 for the typed persistent or cross-scope finding, then begin the architect-separated correction.'
    });
    const file = save(root, c);
    const options = { timestamp: now, actor: 'runtime:checkpoint-upgrader', pointer: 'WORK.md#protocol-upgrade', reason: 'Align the active checkpoint with the current runtime protocol.' };
    const dry = runtime.upgradeActiveCheckpoints(root, options);
    const item = dry.items.find(entry => entry.work_id === c.work_id);
    expect(item).toMatchObject({ status: 'upgrade', revision: c.revision, next_action: c.next_action });
    expect(item.normalizations).toContain('reconciled typed architect diagnostic next action');
    const applied = runtime.upgradeActiveCheckpoints(root, { ...options, apply: true });
    expect(applied.items.find(entry => entry.work_id === c.work_id)).toMatchObject({ status: 'applied', revision: c.revision + 1 });
    const upgraded = JSON.parse(fs.readFileSync(file, 'utf8'));
    expect(upgraded.next_action).toMatch(/Reserve one fresh history-isolated blind architect/);
    const repeated = runtime.upgradeActiveCheckpoints(root, options);
    expect(repeated.items.find(entry => entry.work_id === c.work_id).status).toBe('already_current');
  });

  test('selects v3 from an existing coordination binding and v4 only from complete project bindings', () => {
    const root = repo();
    const v3 = legacy({ work_id: 'legacy-v3', lifecycle_state: 'PLAN', sealed_at: undefined, sealed_revision: undefined, implementation_fingerprint: undefined, coordination: { schema: 'CoordinationBinding/v1', work_id: 'legacy-v3', thread_id: 'thread-v3', ticket_id: 'ticket-v3', generation: 1, exclusive_resources: ['file:a'], active_resources: [], blocked_resources: [] }, review_dispatch_reservation_ledger: [] });
    const v3File = save(root, v3);
    const upgradedV3 = runtime.upgradeCheckpoint(v3File, input(v3), root);
    expect(upgradedV3.protocol_version).toBe('agent-development-runtime/v3');

    const f = fixtures();
    const v4 = legacy({ work_id: 'quality-tooling', lifecycle_state: 'PLAN', sealed_at: undefined, sealed_revision: undefined, implementation_fingerprint: undefined, coordination: { schema: 'CoordinationBinding/v1', work_id: 'quality-tooling', thread_id: 'thread-v4', ticket_id: 'ticket-v4', generation: 1, exclusive_resources: ['file:a'], active_resources: [], blocked_resources: [] }, review_dispatch_reservation_ledger: [], project_context: f['project-context.v1.schema.json'], backlog_projection: f['backlog-projection.v1.schema.json'], implementation_policy: checkpoint().implementation_policy, user_testing_receipts: [] });
    const v4File = save(root, v4);
    const upgradedV4 = runtime.upgradeCheckpoint(v4File, input(v4), root);
    expect(upgradedV4.protocol_version).toBe('agent-development-runtime/v4');
  });

  test('initializes missing v3 and v4 ledgers only for unsealed plans', () => {
    const root = repo();
    const v3 = legacy({
      work_id: 'legacy-v3-ledger', lifecycle_state: 'PLAN', sealed_at: undefined,
      sealed_revision: undefined, implementation_fingerprint: undefined,
      coordination: { schema: 'CoordinationBinding/v1', work_id: 'legacy-v3-ledger', thread_id: 'thread-v3', ticket_id: 'ticket-v3', generation: 1, exclusive_resources: ['file:a'], active_resources: [], blocked_resources: [] }
    });
    delete v3.review_dispatch_reservation_ledger;
    const v3File = save(root, v3);
    const upgradedV3 = runtime.upgradeCheckpoint(v3File, input(v3), root);
    expect(upgradedV3.protocol_version).toBe('agent-development-runtime/v3');
    expect(upgradedV3.review_dispatch_reservation_ledger).toEqual([]);
    expect(upgradedV3.protocol_migration_history[0].normalizations).toContain('initialized empty review_dispatch_reservation_ledger');

    const f = fixtures();
    const v4Policy = { ...checkpoint().implementation_policy, work_id: 'legacy-v4-ledger', source_revision: 'f10-quality-tooling' };
    v4Policy.decision_digest = ponytailPolicy.decisionDigest(v4Policy);
    const v4 = legacy({
      work_id: 'legacy-v4-ledger', lifecycle_state: 'PLAN', sealed_at: undefined,
      sealed_revision: undefined, implementation_fingerprint: undefined,
      coordination: { schema: 'CoordinationBinding/v1', work_id: 'legacy-v4-ledger', thread_id: 'thread-v4', ticket_id: 'ticket-v4', generation: 1, exclusive_resources: ['file:a'], active_resources: [], blocked_resources: [] },
      project_context: f['project-context.v1.schema.json'], backlog_projection: f['backlog-projection.v1.schema.json'], implementation_policy: v4Policy
    });
    delete v4.review_dispatch_reservation_ledger;
    delete v4.user_testing_receipts;
    const v4File = save(root, v4);
    const upgradedV4 = runtime.upgradeCheckpoint(v4File, input(v4, { targetProtocol: 'agent-development-runtime/v4' }), root);
    expect(upgradedV4.protocol_version).toBe('agent-development-runtime/v4');
    expect(upgradedV4.review_dispatch_reservation_ledger).toEqual([]);
    expect(upgradedV4.user_testing_receipts).toEqual([]);
    expect(upgradedV4.protocol_migration_history[0].normalizations).toEqual([
      'initialized empty review_dispatch_reservation_ledger', 'initialized empty user_testing_receipts'
    ]);
  });

  test('rejects explicitly malformed optional ledgers instead of normalizing them', () => {
    const root = repo();
    const v3 = legacy({
      work_id: 'malformed-v3-ledger', lifecycle_state: 'PLAN', sealed_at: undefined,
      sealed_revision: undefined, implementation_fingerprint: undefined,
      coordination: { schema: 'CoordinationBinding/v1', work_id: 'malformed-v3-ledger', thread_id: 'thread-v3', ticket_id: 'ticket-v3', generation: 1, exclusive_resources: ['file:a'], active_resources: [], blocked_resources: [] },
      review_dispatch_reservation_ledger: null
    });
    const v3File = save(root, v3);
    expect(() => runtime.upgradeCheckpoint(v3File, input(v3), root)).toThrow(/reservation ledger invalid/);

    const f = fixtures();
    const v4 = legacy({
      work_id: 'malformed-v4-ledger', lifecycle_state: 'PLAN', sealed_at: undefined,
      sealed_revision: undefined, implementation_fingerprint: undefined,
      coordination: { schema: 'CoordinationBinding/v1', work_id: 'malformed-v4-ledger', thread_id: 'thread-v4', ticket_id: 'ticket-v4', generation: 1, exclusive_resources: ['file:a'], active_resources: [], blocked_resources: [] },
      review_dispatch_reservation_ledger: [], user_testing_receipts: null,
      project_context: f['project-context.v1.schema.json'], backlog_projection: f['backlog-projection.v1.schema.json'], implementation_policy: checkpoint().implementation_policy
    });
    const v4File = save(root, v4);
    expect(() => runtime.upgradeCheckpoint(v4File, input(v4, { targetProtocol: 'agent-development-runtime/v4' }), root)).toThrow(/user testing receipt ledger invalid/);
  });

  test('initializes only safe unsealed ledgers and blocks ambiguous active upgrades without changing bytes', () => {
    const root = repo();
    const missingLedger = checkpoint({ work_id: 'missing-ledger', protocol_version: 'agent-development-runtime/v3', lifecycle_state: 'EXECUTE', coordination: { schema: 'CoordinationBinding/v1', work_id: 'missing-ledger', thread_id: 'thread', ticket_id: 'ticket', generation: 1, exclusive_resources: ['file:a'], active_resources: ['file:a'], blocked_resources: [] } });
    delete missingLedger.review_dispatch_reservation_ledger;
    const file = save(root, missingLedger);
    const before = fs.readFileSync(file, 'utf8');
    expect(() => runtime.upgradeCheckpoint(file, input(missingLedger), root)).toThrow(/unsealed plan/);
    expect(fs.readFileSync(file, 'utf8')).toBe(before);

    const malformed = legacy({ work_id: 'malformed', acceptance_manifest: { ...checkpoint().acceptance_manifest, contracts: undefined } });
    const malformedFile = save(root, malformed);
    const report = runtime.upgradeActiveCheckpoints(root, { reason: 'Align active protocol.', pointer: 'WORK.md#protocol-upgrade', actor: 'runtime:checkpoint-upgrader', timestamp: now });
    expect(report.schema).toBe('CheckpointUpgradeReport/v1');
    expect(report.items.find(item => item.work_id === 'missing-ledger')).toMatchObject({ status: 'blocked' });
    expect(report.items.find(item => item.work_id === 'malformed')).toMatchObject({ status: 'blocked' });
    expect(report.items.find(item => item.work_id === 'malformed').next_action).toBe('verify');
    expect(fs.readFileSync(malformedFile, 'utf8')).toContain('v2.2.0');
  });

  test('audits and explicitly normalizes an EXECUTE feedback checkpoint without fabricating authorization', () => {
    const root = repo();
    const f = fixtures();
    const c = checkpoint({
      work_id: 'feedback-upgrade',
      lifecycle_state: 'EXECUTE',
      sealed_at: undefined,
      sealed_revision: undefined,
      implementation_fingerprint: undefined,
      delivery_cycle_id: 'cycle-1',
      feedback_analysis: { ...f['delivery-feedback-analysis.v1.schema.json'], origin: 'delivery', source_receipt_id: 'delivery:feedback', status: 'accepted', decision: 'rework', scope: 'local' },
      correction_authorization: null,
      next_action: 'Analyze the attributable delivery feedback, then record a fresh PlatformKnowledgeContext/v1.'
    });
    const file = save(root, c);
    const before = fs.readFileSync(file, 'utf8');
    const options = { timestamp: now, actor: 'runtime:checkpoint-upgrader', pointer: 'WORK.md#feedback-upgrade', reason: 'Expose the typed feedback correction route.' };
    const dry = runtime.upgradeActiveCheckpoints(root, options);
    expect(dry.items.find(item => item.work_id === c.work_id)).toMatchObject({
      status: 'correction_authorization_required',
      health: 'feedback_correction_authorization_required',
      next_operation: expect.stringMatching(/PlatformKnowledgeContext.*CorrectionAuthorization/)
    });
    expect(fs.readFileSync(file, 'utf8')).toBe(before);

    const applied = runtime.upgradeActiveCheckpoints(root, { ...options, apply: true });
    expect(applied.items.find(item => item.work_id === c.work_id)).toMatchObject({ status: 'applied', revision: c.revision + 1 });
    const upgraded = JSON.parse(fs.readFileSync(file, 'utf8'));
    expect(upgraded.correction_authorization).toBeNull();
    expect(upgraded.next_action).toMatch(/PlatformKnowledgeContext.*CorrectionAuthorization/);
    expect(upgraded.protocol_migration_history.at(-1).normalizations).toEqual(['reconciled feedback correction next action']);
    expect(runtime.upgradeActiveCheckpoints(root, options).items.find(item => item.work_id === c.work_id).status).toBe('already_current');
  });

  test('routes sealed VERIFY with recoverable knowledge history to typed recovery without mutating it', () => {
    const root = repo();
    const c = checkpoint({
      work_id: 'knowledge-recovery-upgrade', lifecycle_state: 'VERIFY', sealed_at: now,
      sealed_revision: 9, implementation_fingerprint: 'a'.repeat(64), platform_knowledge_required: true,
      platform_knowledge_context: null, platform_knowledge_context_history: [{
        context_id: 'knowledge-cycle-1', cycle_id: 'cycle-1', source_revision: 'source-1', scope_id: 'scope-1', digest: 'b'.repeat(64)
      }], source_revision: 'source-1', scope_id: 'scope-1', next_action: 'verify'
    });
    const file = save(root, c);
    const before = fs.readFileSync(file, 'utf8');
    const options = { mode: 'audit', actor: 'runtime:test', reason: 'audit recoverable knowledge context', pointer: 'WORK.md#knowledge-recovery', timestamp: now };
    const report = runtime.upgradeActiveCheckpoints(root, options);
    expect(report.items.find(item => item.work_id === c.work_id)).toMatchObject({
      status: 'knowledge_context_recovery_available',
      health: 'knowledge_context_recovery_available',
      next_operation: expect.stringMatching(/restorePlatformKnowledgeContext/)
    });
    expect(fs.readFileSync(file, 'utf8')).toBe(before);
    const applied = runtime.upgradeActiveCheckpoints(root, { ...options, apply: true });
    expect(applied.items.find(item => item.work_id === c.work_id)).toMatchObject({ status: 'knowledge_context_recovery_available', revision: c.revision });
    expect(fs.readFileSync(file, 'utf8')).toBe(before);
  });

  test('dry-run and apply scan active work, skip COMPLETE, and filter by work id', () => {
    const root = repo();
    const active = legacy({ work_id: 'active-legacy', lifecycle_state: 'DELIVERY' });
    const complete = legacy({ work_id: 'complete-legacy', lifecycle_state: 'COMPLETE' });
    save(root, active); save(root, complete);
    const dry = runtime.upgradeActiveCheckpoints(root, { timestamp: now, actor: 'runtime:checkpoint-upgrader', pointer: 'WORK.md#protocol-upgrade', reason: 'Align active protocol.' });
    expect(dry.counts.upgrade).toBe(1);
    expect(dry.items.find(item => item.work_id === 'complete-legacy')).toMatchObject({ status: 'immutable' });
    const applied = runtime.upgradeActiveCheckpoints(root, { apply: true, timestamp: now, actor: 'runtime:checkpoint-upgrader', pointer: 'WORK.md#protocol-upgrade', reason: 'Align active protocol.' });
    expect(applied.items.find(item => item.work_id === 'active-legacy')).toMatchObject({ status: 'applied', revision: 10 });
    const filtered = runtime.upgradeActiveCheckpoints(root, { workId: 'complete-legacy', timestamp: now, actor: 'runtime:checkpoint-upgrader', pointer: 'WORK.md#protocol-upgrade', reason: 'Align active protocol.' });
    expect(filtered.items).toHaveLength(1);
    expect(filtered.items[0].status).toBe('immutable');
    expect(filtered.items[0].next_action).toBe('verify');
    expect(() => runtime.upgradeActiveCheckpoints(root, { mode: 'unsupported', timestamp: now, actor: 'runtime:checkpoint-upgrader', pointer: 'WORK.md#protocol-upgrade', reason: 'Reject unsupported mode.' })).toThrow(/upgrade mode invalid/);
  });

  test('apply_safe is a non-mutating plan and missing correction counters become a scope audit', () => {
    const root = repo();
    const active = legacy({ work_id: 'safe-plan', lifecycle_state: 'PLAN' });
    const safeFile = save(root, active);
    const before = fs.readFileSync(safeFile, 'utf8');
    const safe = runtime.upgradeActiveCheckpoints(root, { mode: 'apply_safe', timestamp: now, actor: 'runtime:checkpoint-upgrader', pointer: 'WORK.md#protocol-upgrade', reason: 'Plan the active checkpoint upgrade.' });
    expect(safe.mode).toBe('apply_safe');
    expect(safe.items.find(item => item.work_id === 'safe-plan')).toMatchObject({ status: 'upgrade' });
    expect(fs.readFileSync(safeFile, 'utf8')).toBe(before);

    const missing = legacy({ work_id: 'missing-counter', lifecycle_state: 'VERIFY', review_generation: 1 });
    delete missing.correction_count;
    const missingFile = save(root, missing);
    const audit = runtime.upgradeActiveCheckpoints(root, { workId: 'missing-counter', timestamp: now, actor: 'runtime:checkpoint-upgrader', pointer: 'WORK.md#protocol-upgrade', reason: 'Audit active convergence state.' });
    expect(audit.items[0]).toMatchObject({ status: 'scope_audit_required', health: 'scope_audit_required' });
    expect(fs.readFileSync(missingFile, 'utf8')).toContain('missing-counter');

    const followUp = checkpoint({ work_id: 'follow-up-health', lifecycle_state: 'EXECUTE', assurance_policy: { schema: 'AssurancePolicy/v1', scope_triage: true, max_corrections_per_epoch: 2 }, scope_contract: {}, scope_recovery_history: [{}], epoch_correction_count: 2 });
    const followUpPlan = checkpointUpgrader.planCheckpoint(followUp, input(followUp), () => {});
    expect(followUpPlan).toMatchObject({ status: 'scope_follow_up_required', next_operation: expect.stringMatching(/recordScopeFollowUpAuthorization/) });
    const recoveryHealth = checkpoint({ work_id: 'recovery-health', lifecycle_state: 'EXECUTE', assurance_policy: { schema: 'AssurancePolicy/v1', scope_triage: true, max_corrections_per_epoch: 2 }, scope_contract: {}, epoch_correction_count: 2 });
    const recoveryPlan = checkpointUpgrader.planCheckpoint(recoveryHealth, input(recoveryHealth), () => {});
    expect(recoveryPlan).toMatchObject({ status: 'scope_recovery_required', next_operation: expect.stringMatching(/scope recovery/) });
    const contractHealth = checkpoint({ work_id: 'contract-health', lifecycle_state: 'EXECUTE', assurance_policy: { schema: 'AssurancePolicy/v1', scope_triage: true, max_corrections_per_epoch: 2 }, scope_contract: undefined });
    const contractPlan = checkpointUpgrader.planCheckpoint(contractHealth, input(contractHealth), () => {});
    expect(contractPlan).toMatchObject({ status: 'scope_contract_required', next_operation: expect.stringMatching(/ImplementationScope/) });
  });

  test('keeps a current verify checkpoint without typed architect escalation unchanged', () => {
    const root = repo();
    const c = checkpoint({ work_id: 'current-without-reviews', lifecycle_state: 'VERIFY' });
    const file = save(root, c);
    const result = runtime.upgradeCheckpoint(file, input(c), root);
    expect(result).toMatchObject({ protocol_version: c.protocol_version, revision: c.revision });
    expect(() => checkpointUpgrader.planCheckpoint(null, input(c), () => {})).toThrow(/checkpoint unreadable/);
  });

  test('rejects unknown protocol, unsafe attribution, downgrade and malformed migration history', () => {
    const root = repo();
    const unknown = checkpoint({ work_id: 'unknown', protocol_version: 'agent-development-runtime/v9' });
    const unknownFile = save(root, unknown);
    expect(() => runtime.upgradeCheckpoint(unknownFile, input(unknown), root)).toThrow(/unsupported checkpoint protocol/);
    expect(() => runtime.upgradeCheckpoint(unknownFile, input(unknown, { pointer: 'token=secret' }), root)).toThrow(/pointer unsafe/);
    const canonical = checkpoint({ work_id: 'canonical', protocol_version: 'agent-development-runtime/v3', coordination: { schema: 'CoordinationBinding/v1', work_id: 'canonical', thread_id: 'thread', ticket_id: 'ticket', generation: 1, exclusive_resources: ['file:a'], active_resources: ['file:a'], blocked_resources: [] }, review_dispatch_reservation_ledger: [] });
    const canonicalFile = save(root, canonical);
    expect(() => runtime.upgradeCheckpoint(canonicalFile, input(canonical, { targetProtocol: 'agent-development-runtime/v2' }), root)).toThrow(/downgrade/);
    expect(() => runtime.assertCheckpoint({ ...canonical, protocol_migration_history: [{ schema: 'CheckpointProtocolMigration/v1' }] })).toThrow(/protocol migration/);
    expect(() => runtime.assertCheckpoint({ ...canonical, protocol_migration_history: [null] })).toThrow(/protocol migration/);
    expect(() => runtime.assertCheckpoint({ ...canonical, protocol_migration_history: { invalid: true } })).toThrow(/protocol migration history invalid/);
  });

  test('fails closed for malformed upgrade inputs and incomplete target bindings', () => {
    const root = repo();
    const c = legacy({ work_id: 'invalid-inputs', lifecycle_state: 'DELIVERY' });
    const file = save(root, c);
    expect(() => runtime.upgradeCheckpoint(file, { ...input(c), expectedRevision: 0 }, root)).toThrow(/expected revision required/);
    expect(() => runtime.upgradeCheckpoint(file, { ...input(c), reason: '' }, root)).toThrow(/reason missing/);
    expect(() => runtime.upgradeCheckpoint(file, { ...input(c), timestamp: 'not-a-date' }, root)).toThrow(/timestamp invalid/);
    expect(() => runtime.upgradeCheckpoint(file, { ...input(c), actor: 'secret' }, root)).toThrow(/actor unsafe/);
    expect(() => runtime.upgradeCheckpoint(file, { ...input(c), targetProtocol: 'agent-development-runtime/v9' }, root)).toThrow(/unsupported target protocol/);
    expect(() => runtime.upgradeCheckpoint(file, { ...input(c), expectedRevision: c.revision + 1 }, root)).toThrow(/compare-and-swap mismatch/);

    const wrongSchema = save(root, { ...c, work_id: 'wrong-schema', schema: 'WorkCheckpoint/v1' });
    expect(() => runtime.upgradeCheckpoint(wrongSchema, input({ ...c, work_id: 'wrong-schema' }), root)).toThrow(/schema upgrade unsupported/);

    const v3MissingBinding = legacy({ work_id: 'v3-missing-binding', lifecycle_state: 'PLAN' });
    const v3MissingFile = save(root, v3MissingBinding);
    expect(() => runtime.upgradeCheckpoint(v3MissingFile, input(v3MissingBinding, { targetProtocol: 'agent-development-runtime/v3' }), root)).toThrow(/coordination binding missing/);

    const v4Incomplete = legacy({ work_id: 'v4-incomplete', lifecycle_state: 'PLAN', review_dispatch_reservation_ledger: [], user_testing_receipts: [] });
    const v4IncompleteFile = save(root, v4Incomplete);
    expect(() => runtime.upgradeCheckpoint(v4IncompleteFile, input(v4Incomplete, { targetProtocol: 'agent-development-runtime/v4' }), root)).toThrow(/v4 binding incomplete/);

    const v4Sealed = legacy({ work_id: 'v4-sealed-ledger', lifecycle_state: 'DELIVERY', review_dispatch_reservation_ledger: [] });
    delete v4Sealed.user_testing_receipts;
    const v4SealedFile = save(root, v4Sealed);
    expect(() => runtime.upgradeCheckpoint(v4SealedFile, input(v4Sealed, { targetProtocol: 'agent-development-runtime/v4' }), root)).toThrow(/user-testing ledger initialization/);
  });

  test('reports an apply-time typed GAP instead of fabricating a migration result', () => {
    const root = repo();
    const active = legacy({ work_id: 'apply-gap', lifecycle_state: 'DELIVERY' });
    save(root, active);
    save(root, legacy({ work_id: 'apply-gap-no-code', lifecycle_state: 'DELIVERY' }));
    const report = checkpointUpgrader.upgradeActiveCheckpoints(root, {
      apply: true, timestamp: now, actor: 'runtime:checkpoint-upgrader', pointer: 'WORK.md#protocol-upgrade', reason: 'Align active protocol.'
    }, {
      read: file => {
        if (file.includes('apply-gap-no-code')) throw new Error('simulated untyped gap');
        return fs.readFileSync(file);
      },
      withLock: (_file, fn) => fn(),
      assertCheckpoint: () => {},
      atomicReplace: (file) => {
        if (file.includes('apply-gap')) {
        /** @type {Error & {code?: string}} */
        const error = new Error('simulated compare-and-swap gap');
        error.code = 'GAP-CHECKPOINT-UPGRADE-001';
        throw error;
        }
      }
    });
    expect(report.items.find(item => item.work_id === 'apply-gap')).toMatchObject({ status: 'blocked', code: 'GAP-CHECKPOINT-UPGRADE-001' });
    expect(report.items.find(item => item.work_id === 'apply-gap-no-code')).toMatchObject({ status: 'blocked', code: 'GAP-CHECKPOINT-UPGRADE-001' });
  });

  test('applies each checkpoint from one locked read and records mutable-scope normalization', () => {
    const root = repo();
    fs.writeFileSync(path.join(root, 'scope.txt'), 'scope');
    const c = legacy({ work_id: 'one-pass', lifecycle_state: 'PLAN', sealed_at: undefined, sealed_revision: undefined, implementation_fingerprint: undefined, allowed_paths: ['scope.txt'], fingerprint_paths: ['scope.txt', '.agent/work/one-pass/resume.json'] });
    const file = save(root, c);
    let reads = 0;
    const report = checkpointUpgrader.upgradeActiveCheckpoints(root, {
      apply: true, timestamp: now, actor: 'runtime:checkpoint-upgrader', pointer: 'WORK.md#protocol-upgrade', reason: 'Align the active checkpoint with the current runtime protocol.'
    }, {
      read: value => { reads += 1; return fs.readFileSync(value); },
      withLock: (_file, fn) => fn(),
      assertCheckpoint: () => {},
      atomicReplace: (value, checkpoint) => fs.writeFileSync(value, `${JSON.stringify(checkpoint)}\n`)
    });
    expect(reads).toBe(1);
    expect(report.items.find(item => item.work_id === c.work_id)).toMatchObject({ status: 'applied', revision: c.revision + 1 });
    expect(report.items.find(item => item.work_id === c.work_id).normalizations).toContain('removed mutable checkpoint path from fingerprint scope');
    const upgraded = JSON.parse(fs.readFileSync(file, 'utf8'));
    expect(upgraded.fingerprint_paths).toEqual(['scope.txt']);
    expect(upgraded.protocol_migration_history[0].normalizations).toContain('removed mutable checkpoint path from fingerprint scope');

    const filtered = checkpointUpgrader.upgradeActiveCheckpoints(root, {
      apply: true, workId: 'does-not-match', timestamp: now, actor: 'runtime:checkpoint-upgrader', pointer: 'WORK.md#protocol-upgrade', reason: 'Align the active checkpoint with the current runtime protocol.'
    }, {
      read: value => fs.readFileSync(value), withLock: (_file, fn) => fn(), assertCheckpoint: () => {}, atomicReplace: () => {}
    });
    expect(filtered.items).toEqual([]);
  });

  test('uses allowed scope as a safe fallback and blocks a scope made only of mutable state', () => {
    const root = repo();
    fs.writeFileSync(path.join(root, 'scope.txt'), 'scope');
    const fallback = legacy({ work_id: 'fallback-scope', lifecycle_state: 'PLAN', sealed_at: undefined, sealed_revision: undefined, implementation_fingerprint: undefined, allowed_paths: ['scope.txt'], fingerprint_paths: ['.agent/work/fallback-scope/resume.json'] });
    const fallbackFile = save(root, fallback);
    const upgraded = runtime.upgradeCheckpoint(fallbackFile, input(fallback), root);
    expect(upgraded.fingerprint_paths).toEqual(['scope.txt']);

    const onlyMutable = legacy({ work_id: 'only-mutable-scope', lifecycle_state: 'PLAN', sealed_at: undefined, sealed_revision: undefined, implementation_fingerprint: undefined, allowed_paths: ['.agent/work/only-mutable-scope/resume.json'], fingerprint_paths: ['.agent/work/only-mutable-scope/resume.json'] });
    const onlyMutableFile = save(root, onlyMutable);
    expect(() => runtime.upgradeCheckpoint(onlyMutableFile, input(onlyMutable), root)).toThrow(/only mutable checkpoint state/);
  });

  test('keeps a missing fingerprint list compatible with the typed migration', () => {
    const root = repo();
    const c = legacy({ work_id: 'missing-fingerprint-list', lifecycle_state: 'PLAN', sealed_at: undefined, sealed_revision: undefined, implementation_fingerprint: undefined });
    delete c.fingerprint_paths;
    const file = save(root, c);
    const upgraded = runtime.upgradeCheckpoint(file, input(c), root);
    expect(upgraded.revision).toBe(c.revision + 1);
    expect(upgraded.fingerprint_paths).toBeUndefined();
  });

  test('does not rewrite a sealed scope that contains mutable checkpoint state', () => {
    const root = repo();
    const c = legacy({ work_id: 'sealed-scope', lifecycle_state: 'DELIVERY', fingerprint_paths: ['agent-runtime/lib/runtime.cjs', '.agent/work/sealed-scope/resume.json'] });
    const file = save(root, c);
    const before = fs.readFileSync(file, 'utf8');
    expect(() => runtime.upgradeCheckpoint(file, input(c), root)).toThrow(/cannot be normalized after plan/);
    expect(fs.readFileSync(file, 'utf8')).toBe(before);
  });

  test('reports missing work roots and unreadable checkpoint JSON without throwing', () => {
    const emptyRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-upgrader-empty-'));
    expect(checkpointUpgrader.filesFor(emptyRoot)).toEqual([]);
    const root = repo();
    const file = path.join(root, '.agent', 'work', 'unreadable', 'resume.json');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, '{not-json');
    const report = runtime.upgradeActiveCheckpoints(root, { timestamp: now, actor: 'runtime:checkpoint-upgrader', pointer: 'WORK.md#protocol-upgrade', reason: 'Align active protocol.' });
    expect(report.items.find(item => item.work_id === 'unreadable')).toMatchObject({ status: 'blocked', lifecycle_state: null, revision: null });
  });
});
