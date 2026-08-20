'use strict';

const assurance = require('../../lib/review-assurance.cjs');
const ponytailPolicy = require('../../lib/ponytail-policy.cjs');

const now = Date.parse('2026-08-18T10:00:00.000Z');
const hash = 'b'.repeat(64);
const packet = {
  packet_id: 'packet-review-1', packet_version: 1, wave: 1, generation: 1, sealed_revision: 10,
  source_revision: 'git:review-1', implementation_fingerprint: 'a'.repeat(64),
  review_scope: { paths: ['agent-runtime/lib/runtime.cjs'] }, acceptance: ['AC-1'], acceptance_trace: ['WORK.md#AC-1'], non_goals: ['product source outside declared path']
};

function input(overrides = {}) {
  return {
    operation_id: 'operation-review-1', work_id: 'work-review-1', packet,
    review_mode: 'exact-three', risk: 'medium', change_kind: 'feature', policy_authorized: false,
    source_hashes: [{ path: 'agent-runtime/lib/runtime.cjs', sha256: hash }],
    document_hashes: [{ path: 'agent-runtime/TESTING.md', sha256: hash }],
    dirty_overlap: [], profile: { model: 'gpt-5.6-sol', reasoning: 'xhigh', available: true, attestable: true },
    lease: { status: 'active', expires_at: '2026-08-18T11:00:00.000Z' }, reviewer_slots: 3,
    active_dispatch: null, previous_packet_id: null, capability_epoch: 'host-1', ...overrides
  };
}

function entries(lenses = assurance.lenses) {
  return lenses.map((lens, index) => ({ handle_id: `handle-${index}`, task_id: `task-${index}`, dispatch_id: `dispatch-${index}`, reviewer_id: `reviewer-${index}`, lens }));
}

function blindPolicy() {
  const value = { schema: 'PonytailPolicyDecision/v1', work_id: 'work-review-1', source_revision: 'git:review-1', role: 'blind-architect', phase: 'architect', mode: 'off', stack_release: null, gsd_version: null, ponytail_version: null, skill_path: 'surface/.codex/skills/ponytail/SKILL.md', skill_sha256: null, capability_epoch: 'host-1', degraded: true, cache_hit: false, mutation_allowed: false, evidence_pointer: 'GAP-PONYTAIL-CAPABILITY-001', reason: 'Ponytail disabled for independent assurance', policy_fragment: '', next_action: 'Continue independent assurance without Ponytail context.' };
  return { ...value, decision_digest: ponytailPolicy.decisionDigest(value) };
}

function blocked(action, pattern, code = 'GATE_BLOCKED') {
  let error;
  try { action(); } catch (caught) { error = caught; }
  expect(error).toBeInstanceOf(Error);
  expect(error.code).toBe(code);
  expect(error.message).toMatch(pattern);
}

describe('review assurance preflight and batching', () => {
  test('builds and validates one immutable exact-three snapshot', () => {
    const receipt = assurance.preflight(input(), { now });
    expect(receipt).toMatchObject({ schema: 'ReviewPreflight/v1', status: 'pass', requested_reviewers: 3, review_mode: 'exact-three', active_dispatch: false });
    expect(receipt.snapshot).toEqual(expect.objectContaining({ packet_id: packet.packet_id, implementation_fingerprint: packet.implementation_fingerprint }));
    expect(receipt).toMatchObject({ work_id: 'work-review-1', source_revision: packet.source_revision, sealed_revision: 10, packet_id: packet.packet_id, packet_version: 1, wave: 1, generation: 1, capability_epoch: 'host-1', previous_packet_id: null });
    expect(receipt.source_hashes).toEqual([{ path: 'agent-runtime/lib/runtime.cjs', sha256: hash }]);
    expect(receipt.document_hashes).toEqual([{ path: 'agent-runtime/TESTING.md', sha256: hash }]);
    expect(receipt.profile).toEqual({ model: 'gpt-5.6-sol', reasoning: 'xhigh', attestable: true });
    expect(receipt.lease).toEqual({ status: 'active', expires_at: '2026-08-18T11:00:00.000Z' });
    expect(receipt.next_action).toMatch(/exactly three/);
    expect(Object.isFrozen(receipt)).toBe(true);
    expect(Object.isFrozen(receipt.snapshot)).toBe(true);
    expect(Object.isFrozen(receipt.source_hashes)).toBe(true);
    const defaults = assurance.preflight(input({ operation_id: undefined, capability_epoch: undefined }), { now });
    expect(defaults.operation_id).toBe('preflight-packet-review-1-1');
    expect(defaults.capability_epoch).toBe('host-default');
    blocked(() => assurance.preflight(input({ operation_id: 1 }), { now }), /preflight operation id missing/);
    blocked(() => assurance.preflight(input({ capability_epoch: '' }), { now }), /capability epoch missing/);
    expect(assurance.validatePreflight(receipt, input(), { now })).toBe(receipt);
    blocked(() => assurance.validatePreflight({ ...receipt, context_id: 'c'.repeat(64), snapshot: { ...receipt.snapshot, context_id: 'c'.repeat(64) } }, input(), { now }), /assurance context binding invalid/);
    blocked(() => assurance.validatePreflight({ ...receipt, snapshot: { ...receipt.snapshot, packet_id: 'other' } }, input(), { now }), /snapshot binding invalid/);
    blocked(() => assurance.validatePreflight({ ...receipt, snapshot: { ...receipt.snapshot, source_hashes: [] } }, input(), { now }), /snapshot hashes invalid/);
    blocked(() => assurance.validatePreflight({ ...receipt, review_mode: 'single-composite' }, input(), { now }), /review mode binding invalid/);
    blocked(() => assurance.validatePreflight({ ...receipt, source_hashes: [], snapshot: { ...receipt.snapshot, source_hashes: [] } }, input(), { now }), /source hashes binding invalid/);
    blocked(() => assurance.validatePreflight({ ...receipt, implementation_fingerprint: 'c'.repeat(64), snapshot: { ...receipt.snapshot, implementation_fingerprint: 'c'.repeat(64) } }, input(), { now }), /preflight implementation_fingerprint binding invalid/);
    blocked(() => assurance.validatePreflight({ ...receipt, capability_epoch: 'host-2', snapshot: { ...receipt.snapshot, capability_epoch: 'host-2' } }, input(), { now }), /preflight capability epoch stale/);
    blocked(() => assurance.validatePreflight({ ...receipt, snapshot: undefined }, input(), { now }), /snapshot invalid/);
    blocked(() => assurance.validatePreflight({ ...receipt, snapshot: { ...receipt.snapshot, profile: null } }, input(), { now }), /snapshot binding invalid/);
    blocked(() => assurance.validatePreflight(receipt, { ...input(), requested_reviewers: 2 }, { now }), /reviewer count binding invalid/);
    blocked(() => assurance.validatePreflight(receipt, { ...input(), document_hashes: [] }, { now }), /document hashes binding invalid/);

    blocked(() => assurance.preflight(input({ packet: { ...packet, acceptance: [] } }), { now }), /packet acceptance context missing/);
    blocked(() => assurance.preflight(input({ packet: { ...packet, review_scope: { paths: [] } } }), { now }), /packet review scope missing/);
    blocked(() => assurance.preflight(input({ packet: { ...packet, acceptance_trace: [] } }), { now }), /packet acceptance trace missing/);
    blocked(() => assurance.preflight(input({ packet: { ...packet, non_goals: [] } }), { now }), /packet non-goals missing/);
  });

  test('fails before dispatch for stale or unsafe preflight state', () => {
    const cases = [
      [{ dirty_overlap: ['agent-runtime/lib/runtime.cjs'] }, /dirty overlap/],
      [{ dirty_overlap: ['file:x', 'file:x'] }, /dirty overlap duplicate/],
      [{ active_dispatch: { batch_id: 'active' } }, /active review dispatch/],
      [{ previous_packet_id: packet.packet_id }, /previous packet/],
      [{ reviewer_slots: 2 }, /reviewer slots/],
      [{ profile: { ...input().profile, available: false } }, /profile unavailable/],
      [{ lease: { status: 'active', expires_at: '2020-01-01T00:00:00.000Z' } }, /lease expired/],
      [{ source_hashes: [{ path: '../escape', sha256: hash }] }, /source hashes path unsafe/],
      [{ document_hashes: [{ path: 'docs/a.md', sha256: 'bad' }] }, /document hashes hash invalid/]
    ];
    for (const [overrides, pattern] of cases) blocked(() => assurance.preflight(input(overrides), { now }), pattern);
    for (const unsafePath of ['/escape', '\\escape', 'C:escape', './escape', 'a//b', 'a/./b', 'a/../b', 'a/']) {
      blocked(() => assurance.preflight(input({ source_hashes: [{ path: unsafePath, sha256: hash }] }), { now }), /source hashes path unsafe/);
    }
    blocked(() => assurance.preflight(input({ source_hashes: [{ sha256: hash }] }), { now }), /source hashes path missing/);
    blocked(() => assurance.preflight(input({ source_hashes: [{ path: 'a', sha256: 'A'.repeat(64) }] }), { now }), /source hashes hash invalid/);
    blocked(() => assurance.buildReviewerPrompt(packet, assurance.preflight(input(), { now }), assurance.lenses[0], null), /external observations invalid/);
  });

  test('allows explicit composite only for eligible low-risk work', () => {
    const value = assurance.preflight(input({ review_mode: 'single-composite', risk: 'low', policy_authorized: true, reviewer_slots: 1 }), { now });
    expect(value).toMatchObject({ review_mode: 'single-composite', requested_reviewers: 1 });
    for (const overrides of [
      { risk: 'high' }, { security_risk: true }, { data_loss_risk: true }, { runtime_gap: true },
      { public_contract: true }, { migration: true }, { destructive: true }, { dirty_overlap: ['file:x'] }, { policy_authorized: false }
    ]) blocked(() => assurance.preflight(input({ review_mode: 'single-composite', risk: 'low', policy_authorized: true, reviewer_slots: 1, ...overrides }), { now }), /single-composite review policy/);
    blocked(() => assurance.preflight(input({ review_mode: 'unknown' }), { now }), /review mode invalid/);
  });

  test('generates isolated prompts with only external context', () => {
    const receipt = assurance.preflight(input(), { now });
    const prompt = assurance.buildReviewerPrompt({ ...packet, implementation_notes: 'do not include', prior_review_history: ['secret'] }, receipt, assurance.lenses[0], ['observation:operator-failure']);
    expect(prompt).toContain('packet-review-1');
    expect(prompt).toContain('observation:operator-failure');
    expect(prompt).not.toContain('do not include');
    expect(prompt).toContain('prior-review-history');
    const defaults = assurance.buildReviewerPrompt({ ...packet, acceptance: undefined, review_scope: undefined }, receipt, assurance.lenses[1]);
    expect(defaults).toContain('"acceptance_manifest":[]');
    expect(defaults).toContain('"scope":[]');
    const structured = assurance.buildReviewerPrompt({ ...packet, acceptance: [{ id: 'AC-1', definition: 'd'.repeat(2000), evidence: ['pointer-1', 2], ignored: 'secret' }], review_scope: { paths: ['agent-runtime/lib/runtime.cjs'] } }, receipt, assurance.lenses[1]);
    expect(structured).toContain('"id":"AC-1"');
    expect(structured).not.toContain('ignored');
    expect(assurance.buildReviewerPrompt({ ...packet, acceptance: [42], review_scope: {} }, receipt, assurance.lenses[1])).toContain('42');
    expect(assurance.buildReviewerPrompt({ ...packet, acceptance: {}, review_scope: {} }, receipt, assurance.lenses[1])).toContain('"acceptance_manifest":[]');
    blocked(() => assurance.buildReviewerPrompt(packet, receipt, 'wrong-lens'), /review lens invalid/);
    const long = assurance.buildReviewerPrompt({ ...packet, acceptance: ['x'.repeat(10000)] }, receipt, assurance.lenses[0], ['y'.repeat(10000)]);
    expect(long.length).toBeLessThan(3000);
    expect(long).toContain('preflight_id');
    const factory = assurance.buildReviewerPromptFactory(packet, receipt, ['shared-observation']);
    expect(factory(assurance.lenses[1])).toContain('shared-observation');
    blocked(() => factory('wrong-lens'), /review lens invalid/);
  });

  test('dispatches exact-three or composite through host callbacks', () => {
    const calls = [];
    const host = { reserve: value => { calls.push(['reserve', value.lenses]); return { entries: entries(value.lenses) }; }, spawn: value => { calls.push(['spawn', value.entry.lens]); return `host-${value.entry.lens}`; } };
    const result = assurance.dispatchReviewBatch(input(), host, { now });
    expect(result.batch).toMatchObject({ schema: 'ReviewBatch/v1', requested: 3, started: 3, status: 'running' });
    expect(calls).toHaveLength(4);
    const composite = assurance.dispatchReviewBatch(input({ review_mode: 'single-composite', risk: 'low', policy_authorized: true, reviewer_slots: 1 }), { ...host, reserve: value => ({ entries: entries(value.lenses) }) }, { now });
    expect(composite.batch).toMatchObject({ review_mode: 'single-composite', requested: 1, completed: 0, cancelled: 0, preflight_id: composite.preflight.operation_id, next_action: 'Wait for the review batch summary.' });
    expect(composite.batch.entries[0]).toMatchObject({ lens: 'single-composite', host_handle: 'host-single-composite' });
    expect(composite.preflight.next_action).toMatch(/composite/);
    const custom = assurance.dispatchReviewBatch(input({ batch_id: 'custom-batch' }), host, { now, created_at: '2026-08-18T10:01:00.000Z' });
    expect(custom.batch).toMatchObject({ batch_id: 'custom-batch', created_at: '2026-08-18T10:01:00.000Z' });
    blocked(() => assurance.dispatchReviewBatch(input(), { reserve: value => ({ entries: entries(value.lenses) }), spawn: () => undefined, cancel: () => {} }, { now }), /review handle missing/);
  });

  test('records compact off policy for independent assurance without injecting Ponytail into prompts', () => {
    const calls = [];
    const result = assurance.dispatchReviewBatch(input({ policy_decision: blindPolicy() }), {
      reserve: value => ({ entries: entries(value.lenses) }),
      spawn: value => { calls.push(value.prompt); return value.entry.handle_id; }
    }, { now });
    expect(result.summary.policy).toMatchObject({ role: 'blind-architect', mode: 'off', mutation_allowed: false });
    expect(calls).toHaveLength(3);
    expect(calls.join('\n')).not.toContain('Ponytail');
    const full = { ...blindPolicy(), role: 'executor', phase: 'review', mode: 'full', mutation_allowed: true, degraded: false, stack_release: 'gsd-1.11.0_ponytail-4.9.0', gsd_version: '1.11.0', ponytail_version: '4.9.0', skill_sha256: '1'.repeat(64), reason: 'trusted', policy_fragment: 'Ponytail implementation mechanics.' };
    full.decision_digest = ponytailPolicy.decisionDigest(full);
    expect(() => assurance.dispatchReviewBatch(input({ policy_decision: full }), { reserve: value => ({ entries: entries(value.lenses) }), spawn: value => value.entry.handle_id }, { now })).toThrow(/policy must be off/);
  });

  test('compacts an explicitly supplied policy decision without duplicating the dispatch path', () => {
    const summary = assurance.executionSummary({ policy_decision: blindPolicy(), next_action: 'continue' });
    expect(summary.policy).toMatchObject({ role: 'blind-architect', mode: 'off', mutation_allowed: false });
  });

  test('cancels partial spawn and reports missing host release as GAP', () => {
    let cancelled = false;
    const base = { reserve: value => ({ entries: entries(value.lenses) }), spawn: value => { if (value.entry.lens === assurance.lenses[1]) throw new Error('slot failed'); return value.entry.handle_id; }, cancel: () => { cancelled = true; } };
    blocked(() => assurance.dispatchReviewBatch(input(), base, { now }), /review batch dispatch failed/);
    expect(cancelled).toBe(true);
    blocked(() => assurance.dispatchReviewBatch(input(), { reserve: value => ({ entries: entries(value.lenses) }), spawn: _value => { throw new Error('slot failed'); } }, { now }), /without cancellable host/, 'GAP-AGENT-HANDLE-RELEASE-001');
    blocked(() => assurance.dispatchReviewBatch(input(), null, { now }), /host adapter unavailable/, 'GAP-REVIEW-HOST-ADAPTER-001');
  });

  test('returns bounded batch wait counts', () => {
    const batch = assurance.dispatchReviewBatch(input(), { reserve: value => ({ entries: entries(value.lenses) }), spawn: value => value.entry.handle_id }, { now }).batch;
    const result = assurance.waitReviewBatch(batch, { wait: () => ({ completed: 2, running: 1, blocked: 0, cancelled: 0, next_poll_ms: 5000 }) }, 1000);
    expect(result).toEqual({ batch_id: batch.batch_id, completed: 2, running: 1, blocked: 0, cancelled: 0, next_poll_ms: 5000 });
    expect(assurance.waitReviewBatch({ ...batch, status: 'complete' }, { wait: () => ({}) })).toEqual({ batch_id: batch.batch_id, completed: 0, running: 0, blocked: 0, cancelled: 0, next_poll_ms: 10000 });
    expect(assurance.waitReviewBatch({ ...batch, status: 'blocked' }, { wait: () => ({ cancelled: 1 }) })).toMatchObject({ cancelled: 1 });
    blocked(() => assurance.waitReviewBatch(batch, { wait: () => ({ completed: 4 }) }), /counts exceed/);
    blocked(() => assurance.waitReviewBatch(batch, { wait: () => ({ completed: 1, running: 1, blocked: 1, cancelled: 1 }) }), /counts exceed/);
    blocked(() => assurance.waitReviewBatch(batch, { wait: () => ({ next_poll_ms: -1 }) }), /next poll invalid/);
    blocked(() => assurance.waitReviewBatch(batch, { wait: () => ({ completed: 1 }) }, 300001), /timeout invalid/);
    blocked(() => assurance.waitReviewBatch(batch, null), /wait host adapter unavailable/, 'GAP-REVIEW-HOST-ADAPTER-001');
    blocked(() => assurance.waitReviewBatch({ ...batch, status: 'cancelled' }, { wait: () => ({ completed: 3 }) }), /review batch/);
  });
});

describe('review assurance output, cache and scope planning', () => {
  test('reuses an immutable preflight snapshot only when the full binding key matches', () => {
    const cache = assurance.createPreflightCache({ now: () => now });
    const first = assurance.preflight(input(), { now, preflightCache: cache });
    const second = assurance.preflight(input(), { now, preflightCache: cache });
    expect(second).not.toBe(first);
    expect(second).toEqual(first);
    expect(assurance.dispatchReviewBatch(input(), { reserve: value => ({ entries: entries(value.lenses) }), spawn: value => value.entry.handle_id }, { now, preflightCache: cache }).summary.cache.preflight_hit).toBe(true);
    expect(assurance.preflight(input({ capability_epoch: 'host-2' }), { now, preflightCache: cache }).capability_epoch).toBe('host-2');
  });

  test('creates cache entries and invalidates by key or globally', () => {
    const cache = assurance.createCapabilityCache();
    expect(cache.get('profile')).toBeNull();
    cache.set('profile', { model: 'sol' }, 'epoch-1');
    expect(cache.get('profile', 'epoch-1')).toEqual({ model: 'sol' });
    expect(cache.get('profile', 'epoch-2')).toBeNull();
    expect(cache.size()).toBe(1);
    cache.invalidate('profile');
    expect(cache.size()).toBe(0);
    cache.set('profile', { model: 'sol' });
    cache.invalidate();
    expect(cache.size()).toBe(0);
    expect(cache.get('missing', 'epoch-1')).toBeNull();
    blocked(() => cache.set('', {}), /cache key missing/);
    blocked(() => cache.set('x', null), /cache value invalid/);
    const composite = { model: 'gpt-5.6-sol', reasoning: 'xhigh', profile_attestation: 'attested', reviewer_slots: 3, capability_epoch: 'epoch-2', lease: 'lease-2', quota: 3 };
    const frozen = cache.set(composite, { model: 'sol' });
    expect(Object.isFrozen(frozen)).toBe(true);
    expect(cache.get({ ...composite })).toEqual({ model: 'sol' });
    expect(cache.get({ ...composite, reviewer_slots: 2 })).toBeNull();
    expect(cache.key(composite)).toBe(cache.key({ ...composite }));
    cache.set({ ...composite, lease: ['lease-2'] }, { nested: [1, { ok: true }] });
    expect(cache.get({ ...composite, lease: ['lease-2'] })).toEqual({ nested: [1, { ok: true }] });
    blocked(() => cache.get(null), /cache key invalid/);
    cache.invalidate(composite);
    cache.set(composite, { model: 'sol' });
    cache.invalidate(composite, 'host-default');
  });

  test('bounds capability cache entries and expires stale capability epochs', () => {
    let clock = 1000;
    const cache = assurance.createCapabilityCache({ maxEntries: 2, ttlMs: 10, now: () => clock });
    cache.set('a', { value: 1 });
    cache.set('b', { value: 2 });
    cache.get('a');
    cache.set('c', { value: 3 });
    expect(cache.get('b')).toBeNull();
    expect(cache.get('a')).toEqual({ value: 1 });
    clock += 11;
    expect(cache.get('a')).toBeNull();
    expect(cache.size()).toBe(0);
    blocked(() => assurance.createCapabilityCache({ maxEntries: 0 }), /max entries invalid/);
    blocked(() => assurance.createCapabilityCache({ ttlMs: -1 }), /ttl invalid/);
  });

  test('renders bounded summary/evidence/full output with redaction', () => {
    const summary = assurance.executionSummary({ status: 'pass', passed: 9, failed: 0, duration_ms: 100, preflight: 'pass', reviewers: { requested: 3, started: 3, completed: 3, cancelled: 0 }, cache: { profile_hit: true, preflight_hit: true }, artifacts: ['summary.json'], next_action: 'continue' });
    expect(summary).toMatchObject({ status: 'pass', passed: 9, cache: { profile_hit: true } });
    expect(JSON.parse(assurance.formatOutput({ summary, logs: 'token=secret-value\nline2', evidence: 'password=abc\nline2', artifacts: ['evidence.json'] }, 'summary'))).toEqual({ summary });
    const evidence = JSON.parse(assurance.formatOutput({ summary, logs: 'token=secret-value\nline2', evidence: 'password=abc\nline2', artifacts: ['evidence.json'] }, 'evidence', { maxEvidenceLines: 1 }));
    expect(evidence.evidence).toContain('[REDACTED]');
    expect(evidence.evidence).not.toContain('line2');
    expect(JSON.parse(assurance.formatOutput({ summary, logs: 'token=secret-value', evidence: 'evidence' }, 'full')).logs).toContain('[REDACTED]');
    const structured = JSON.parse(assurance.formatOutput({ summary, evidence: '{"token":"secret","nested":{"authorization":"Bearer abc"},"list":[1]}' }, 'evidence'));
    expect(structured.evidence).toContain('"token":"[REDACTED]"');
    expect(structured.evidence).toContain('"authorization":"[REDACTED]"');
    const findings = JSON.parse(assurance.formatOutput({ summary, findings: [null, { id: 'F-1', severity: 'high', path: 'a.js', line: 3, error: 'e'.repeat(1000) }] }, 'evidence'));
    expect(findings.findings[0]).toEqual({ message: 'null' });
    expect(findings.findings[1].error.length).toBeLessThanOrEqual(501);
    expect(assurance.formatOutput({ summary }, 'summary', { maxOutputTokens: 1 }).length).toBeLessThanOrEqual(5);
    blocked(() => assurance.formatOutput({ summary }, 'wrong'), /output mode invalid/);
    blocked(() => assurance.executionSummary({ artifacts: ['x'], next_action: '' }), /next action missing/);
  });

  test('keeps compact execution telemetry optional and bounded', () => {
    const summary = assurance.executionSummary({ status: 'pass', operation_counts: { preflight: 1, test: 2 }, bytes_read: 12, bytes_emitted: 5, agent_profile: 'executor', model: 'gpt-5.6-luna', reasoning: 'high', evidence_pointers: ['WORK.md#summary'], token_telemetry: { input: 8, output: 3 }, next_action: 'continue' });
    expect(summary).toMatchObject({ operation_counts: { preflight: 1, test: 2 }, bytes_read: 12, agent_profile: 'executor', token_telemetry: { input: 8 } });
    blocked(() => assurance.executionSummary({ operation_counts: { preflight: -1 }, next_action: 'continue' }), /operation count invalid/);
    blocked(() => assurance.executionSummary({ token_telemetry: { input: 'unknown' }, next_action: 'continue' }), /token telemetry value invalid/);
  });

  test('selects changed-only verification safely', () => {
    expect(assurance.classifyChangedPaths([])).toMatchObject({ kind: 'unknown', fullProfile: true });
    expect(assurance.classifyChangedPaths([]).checks).toEqual(['full-runtime-profile']);
    expect(assurance.classifyChangedPaths(['docs/a.md'])).toEqual({ kind: 'docs-only', fullProfile: false, checks: ['documentation-links', 'wiki-drift'] });
    expect(assurance.classifyChangedPaths(['script/Invoke-AgentDevelopmentRuntime.ps1'])).toEqual({ kind: 'launcher-only', fullProfile: false, checks: ['launcher-contract', 'runtime-smoke'] });
    expect(assurance.classifyChangedPaths(['tests/a.ps1'])).toEqual({ kind: 'test-only', fullProfile: false, checks: ['changed-tests', 'runtime-contracts'] });
    expect(assurance.classifyChangedPaths(['agent-runtime/lib/runtime.cjs'])).toEqual({ kind: 'runtime-contract', fullProfile: true, checks: ['runtime-contracts', 'full-runtime-profile'] });
    expect(assurance.classifyChangedPaths(['agent-runtime/README.md'])).toEqual({ kind: 'runtime-contract', fullProfile: true, checks: ['runtime-contracts', 'full-runtime-profile'] });
    expect(assurance.classifyChangedPaths(['src/project/a.js'])).toEqual({ kind: 'mixed', fullProfile: true, checks: ['full-runtime-profile'] });
    expect(assurance.classifyChangedPaths(['docs/a.md', 'agent-runtime/lib/runtime.cjs']).fullProfile).toBe(true);
    blocked(() => assurance.classifyChangedPaths([null]), /changed paths invalid/);
  });

  test('retention only selects old derived outputs', () => {
    const old = '2020-01-01T00:00:00.000Z';
    const entries = [{ path: '.planning/agent-flow/test-output/a.json', modified_at: old }, { path: 'agent-runtime/.stryker-tmp/a', modified_at: old }, { path: '.agent/work/current/resume.json', modified_at: old }, { path: 'docs/current.md', modified_at: old }, { path: '.planning/agent-flow/test-output/new.json', modified_at: '2099-01-01T00:00:00.000Z' }];
    expect(assurance.retentionPlan(entries, now, 1000)).toEqual([{ path: '.planning/agent-flow/test-output/a.json', action: 'archive_or_delete_derived_only' }, { path: 'agent-runtime/.stryker-tmp/a', action: 'archive_or_delete_derived_only' }]);
    expect(assurance.retentionPlan([{ path: '.planning/agent-flow/test-output/a.json', modified_at: new Date(now - 1000).toISOString() }], now, 1000)).toEqual([{ path: '.planning/agent-flow/test-output/a.json', action: 'archive_or_delete_derived_only' }]);
    expect(assurance.retentionPlan([{ path: '.planning/agent-flow/test-output/a.json', modified_at: 'bad' }, null, { path: 'not-derived/a', modified_at: old }], now, 1000)).toEqual([]);
    blocked(() => assurance.retentionPlan([], Number.NaN, 1000), /retention window invalid/);
    blocked(() => assurance.retentionPlan([], now, Number.NaN), /retention window invalid/);
    blocked(() => assurance.retentionPlan(null), /retention entries invalid/);
    blocked(() => assurance.retentionPlan([], now, -1), /retention window invalid/);
  });
});

describe('review assurance fail-closed boundary matrix', () => {
  test('rejects malformed packet, profile, lease, hash and preflight inputs', () => {
    blocked(() => assurance.preflight(null, { now }), /preflight input required/);
    blocked(() => assurance.preflight(input({ packet: null }), { now }), /packet missing/);
    blocked(() => assurance.preflight(input({ packet: { ...packet, packet_id: ' ' } }), { now }), /packet id missing/);
    blocked(() => assurance.preflight(input({ packet: { ...packet, source_revision: '' } }), { now }), /source revision missing/);
    blocked(() => assurance.preflight(input({ packet: { ...packet, packet_version: 0 } }), { now }), /packet packet_version invalid/);
    blocked(() => assurance.preflight(input({ packet: { ...packet, implementation_fingerprint: 'bad' } }), { now }), /packet fingerprint invalid/);
    blocked(() => assurance.preflight(input({ profile: null }), { now }), /profile missing/);
    blocked(() => assurance.preflight(input({ profile: { ...input().profile, model: ' ' } }), { now }), /review model missing/);
    blocked(() => assurance.preflight(input({ profile: { ...input().profile, reasoning: '' } }), { now }), /review reasoning missing/);
    blocked(() => assurance.preflight(input({ profile: { ...input().profile, attestable: false } }), { now }), /profile unavailable/);
    blocked(() => assurance.preflight(input({ lease: null }), { now }), /lease invalid/);
    blocked(() => assurance.preflight(input({ lease: { status: 'expired', expires_at: '2026-08-18T11:00:00.000Z' } }), { now }), /lease invalid/);
    blocked(() => assurance.preflight(input({ lease: { status: 'active', expires_at: 'bad' } }), { now }), /lease expiry invalid/);
    blocked(() => assurance.preflight(input(), { now, created_at: '2099-01-01T00:00:00.000Z' }), /preflight timestamp invalid/);
    blocked(() => assurance.preflight(input({ source_hashes: null }), { now }), /source hashes invalid/);
    blocked(() => assurance.preflight(input({ source_hashes: [null] }), { now }), /source hashes entry invalid/);
    blocked(() => assurance.preflight(input({ source_hashes: [1] }), { now }), /source hashes entry invalid/);
    blocked(() => assurance.preflight(input({ source_hashes: [{ path: 'a', sha256: hash }, { path: 'a', sha256: hash }] }), { now }), /source hashes/);
    blocked(() => assurance.validatePreflight(null, input(), { now }), /preflight receipt invalid/);
    const receipt = assurance.preflight(input(), { now });
    expect(assurance.validatePreflight(receipt, undefined, { now })).toBe(receipt);
    blocked(() => assurance.validatePreflight({ ...receipt, active_dispatch: true }, input(), { now }), /snapshot invalid/);
    blocked(() => assurance.validatePreflight({ ...receipt, dirty_overlap: ['file:x'] }, input(), { now }), /snapshot invalid/);
  });

  test('rejects malformed reservation entries, duplicate identities and counts', () => {
    const baseHost = { reserve: value => ({ entries: value.lenses.map(lens => ({ handle_id: `h-${lens}`, task_id: `t-${lens}`, dispatch_id: `d-${lens}`, reviewer_id: `r-${lens}`, lens })) }), spawn: value => value.entry.handle_id };
    blocked(() => assurance.dispatchReviewBatch(input(), { ...baseHost, reserve: () => ({ entries: [] }) }, { now }), /reservation incomplete/);
    blocked(() => assurance.dispatchReviewBatch(input(), { ...baseHost, reserve: value => ({ entries: [null, ...value.lenses.slice(1).map(lens => ({ handle_id: `h-${lens}`, task_id: `t-${lens}`, dispatch_id: `d-${lens}`, reviewer_id: `r-${lens}`, lens }))] }) }, { now }), /batch entry invalid/);
    blocked(() => assurance.dispatchReviewBatch(input(), { ...baseHost, reserve: value => ({ entries: [{ handle_id: 'h', task_id: 't', dispatch_id: 'd', reviewer_id: 'r', lens: 'wrong' }, ...value.lenses.slice(1).map(lens => ({ handle_id: `h-${lens}`, task_id: `t-${lens}`, dispatch_id: `d-${lens}`, reviewer_id: `r-${lens}`, lens }))] }) }, { now }), /lens invalid/);
    blocked(() => assurance.dispatchReviewBatch(input(), { ...baseHost, reserve: value => ({ entries: value.lenses.map(lens => ({ handle_id: 'same', task_id: `t-${lens}`, dispatch_id: `d-${lens}`, reviewer_id: `r-${lens}`, lens })) }) }, { now }), /duplicate handle_id/);
    for (const field of ['handle_id', 'task_id', 'dispatch_id', 'reviewer_id']) {
      blocked(() => assurance.dispatchReviewBatch(input(), { ...baseHost, reserve: value => ({ entries: value.lenses.map((lens, index) => ({ handle_id: field === 'handle_id' && index === 0 ? '' : `h-${lens}`, task_id: field === 'task_id' && index === 0 ? '' : `t-${lens}`, dispatch_id: field === 'dispatch_id' && index === 0 ? '' : `d-${lens}`, reviewer_id: field === 'reviewer_id' && index === 0 ? '' : `r-${lens}`, lens })) }) }, { now }), new RegExp(`review batch ${field} missing`));
    }
    const batch = assurance.dispatchReviewBatch(input(), baseHost, { now }).batch;
    blocked(() => assurance.waitReviewBatch(batch, { wait: () => ({ completed: -1 }) }), /completed count invalid/);
  });
});

