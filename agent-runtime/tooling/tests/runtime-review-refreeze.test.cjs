'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const runtime = require('../../lib/runtime.cjs');
const { checkpoint } = require('./fixtures.cjs');

function stamp() { return new Date().toISOString(); }
function repo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-refreeze-'));
  execFileSync('git', ['init', '-q'], { cwd: root });
  execFileSync('git', ['config', 'user.email', 'refreeze@example.test'], { cwd: root });
  execFileSync('git', ['config', 'user.name', 'refreeze'], { cwd: root });
  fs.writeFileSync(path.join(root, 'scope.txt'), 'current source\n');
  execFileSync('git', ['add', '.'], { cwd: root });
  execFileSync('git', ['commit', '-qm', 'base'], { cwd: root });
  return root;
}
function save(root, c) {
  const dir = path.join(root, '.agent', 'work', c.work_id);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'resume.json');
  fs.writeFileSync(file, JSON.stringify(c));
  return file;
}
function binding(c) {
  return {
    work_id: c.work_id,
    source_revision: c.source_revision,
    sealed_revision: c.sealed_revision,
    implementation_fingerprint: c.implementation_fingerprint,
    acceptance_manifest_id: c.acceptance_manifest.id,
    acceptance_manifest_version: c.acceptance_manifest.version
  };
}
function packet(c, generation) {
  return {
    schema: 'BlindReviewPacket/v2', status: 'frozen', packet_id: `packet-${generation}`,
    packet_version: 1, wave: generation, generation, ...binding(c),
    required_profile: { model: 'configured', reasoning: 'high' },
    review_scope: { paths: ['scope.txt'], absence_assertions: {} }, profile_attestation_set: 'dispatch.json'
  };
}
function dispatch(c, p) {
  return {
    schema: 'DispatchProfileAttestationSet/v1', ...binding(c), packet_id: p.packet_id,
    packet_version: p.packet_version, wave: p.wave, orchestrator: 'root', selector_source: 'test',
    requested_model: 'configured', requested_reasoning_effort: 'high', runtime_metadata_observed: false,
    issued_at: stamp(), root_task_id: 'root-task', root_dispatch_id: 'root-dispatch',
    entries: runtime.lenses.map((lens, index) => ({
      task_id: `task-${index}`, dispatch_id: `dispatch-${index}`, reviewer_id: `reviewer-${index}`, lens,
      profile_verified: true,
      profile_verification: { verified_model: 'configured', verified_reasoning_effort: 'high', verification_source: 'tests/profile', verification_pointer: `tests/profile-${index}`, verified_at: stamp() }
    }))
  };
}
function receipt(c, p, index) {
  return {
    schema: 'ReviewReceipt/v2', ...binding(c), receipt_id: `receipt-${index}`, reviewer_id: `reviewer-${index}`,
    dispatch_task_id: `task-${index}`, dispatch_id: `dispatch-${index}`, lens: runtime.lenses[index],
    history_isolation: true, findings: ['source scope requires a fresh review cycle'], verdict: 'changes_required',
    packet_id: p.packet_id, packet_version: p.packet_version, wave: p.wave
  };
}
function reviewedState() {
  const root = repo();
  const base = checkpoint({
    work_id: 'review-refreeze', revision: 1, lifecycle_state: 'VERIFY', source_revision: 'source-old',
    allowed_paths: ['scope.txt'], fingerprint_paths: ['scope.txt'], review_generation: 35,
    acceptance_manifest: { ...checkpoint().acceptance_manifest, source_revision: 'source-old' },
    sealed_revision: 1, sealed_at: stamp(), implementation_fingerprint: 'a'.repeat(64)
  });
  const p = packet(base, 35);
  const state = { ...base, review_packet: p, review_generation_ledger: [{ generation: 35, packet_id: p.packet_id, packet_version: 1, wave: 35 }], dispatch_attestation_set: { packet_id: p.packet_id, packet_version: 1, wave: 35, pointer: 'dispatch.json' } };
  const dir = path.join(root, '.agent', 'work', state.work_id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'dispatch.json'), JSON.stringify(dispatch(state, p)));
  const file = save(root, state);
  let current = state;
  for (let index = 0; index < 3; index++) current = runtime.recordReviewReceipt(file, receipt(current, p, index), current.revision, current.source_revision, root);
  return { root, file, state: current, packet: p };
}

describe('reviewed VERIFY refreeze transition', () => {
  test('reopens a reviewed VERIFY checkpoint through a typed source-bound refreeze and permits a new packet', () => {
    const { root, file, state } = reviewedState();
    const nextSource = 'source-current';
    const nextManifest = { ...state.acceptance_manifest, source_revision: nextSource };
    const refrozen = runtime.refreezeReviewPacket(file, {
      expectedRevision: state.revision, sourceRevision: state.source_revision, newSourceRevision: nextSource,
      acceptanceManifest: nextManifest, reason: 'Source revision drifted after the reviewed packet was frozen.',
      pointer: 'WORK.md#source-drift', actor: 'root', timestamp: stamp()
    }, root);
    expect(refrozen).toMatchObject({ lifecycle_state: 'VERIFY', source_revision: nextSource, review_packet: null, reviews: [], verification: [], next_action: expect.stringMatching(/fresh blind-review packet/) });
    expect(refrozen.implementation_fingerprint).not.toBe(state.implementation_fingerprint);
    expect(refrozen.review_generation).toBe(35);
    expect(refrozen.review_generation_ledger).toHaveLength(1);
    expect(refrozen.review_refreeze_history).toHaveLength(1);
    expect(refrozen.review_refreeze_history[0]).toMatchObject({ schema: 'ReviewRefreeze/v1', from_revision: state.revision, to_revision: refrozen.revision, from_packet_id: 'packet-35', from_generation: 35, to_source_revision: nextSource });
    const entry = refrozen.review_refreeze_history[0];
    const invalidEntries = [
      { schema: 'Wrong/v1' }, { work_id: '' }, { from_revision: 0 },
      { to_revision: entry.from_revision }, { from_source_revision: '' },
      { to_source_revision: '' }, { from_sealed_revision: 0 },
      { from_fingerprint: 'invalid' }, { to_fingerprint: 'invalid' },
      { from_packet_id: '' }, { from_generation: 0 }, { reason: '' },
      { pointer: '' }, { actor: '' }, { timestamp: 'not-a-time' }
    ];
    for (const change of invalidEntries) expect(() => runtime.assertCheckpoint({ ...refrozen, review_refreeze_history: [{ ...entry, ...change }] })).toThrow(/review refreeze/);
    // Use the lower legal boundary values as a positive control. Without this
    // counterexample, mutations such as `>= 1` -> `> 1` and anchored hash
    // regex changes can survive while the ordinary refreeze history starts at
    // a larger revision/generation.
    const boundaryEntry = {
      ...entry, from_revision: 1, to_revision: 2, from_generation: 1,
      from_fingerprint: 'a'.repeat(64), to_fingerprint: 'b'.repeat(64)
    };
    expect(() => runtime.assertCheckpoint({ ...refrozen, review_refreeze_history: [boundaryEntry] })).not.toThrow();
    for (const change of [
      { from_revision: 0, to_revision: 1 }, { from_generation: 0 },
      { from_fingerprint: `!${'a'.repeat(64)}` }, { from_fingerprint: `${'a'.repeat(64)}!` },
      { to_fingerprint: `!${'b'.repeat(64)}` }, { to_fingerprint: `${'b'.repeat(64)}!` }
    ]) expect(() => runtime.assertCheckpoint({ ...refrozen, review_refreeze_history: [{ ...boundaryEntry, ...change }] })).toThrow(/review refreeze/);
    expect(() => runtime.assertCheckpoint({ ...refrozen, review_refreeze_history: [boundaryEntry, { ...boundaryEntry, actor: '' }] })).toThrow(/actor missing/);
    const fresh = packet(refrozen, 36);
    const frozen = runtime.freezeReviewPacket(file, fresh, refrozen.revision, refrozen.source_revision);
    expect(frozen.review_packet).toMatchObject({ packet_id: 'packet-36', generation: 36 });
  });

  test('refreeze rejects unchanged source, incomplete review and incompatible manifest', () => {
    const first = reviewedState();
    expect(() => runtime.refreezeReviewPacket(first.file, { expectedRevision: first.state.revision, sourceRevision: first.state.source_revision, newSourceRevision: first.state.source_revision, acceptanceManifest: first.state.acceptance_manifest, reason: 'same', pointer: 'WORK.md#source-drift', actor: 'root', timestamp: stamp() }, first.root)).toThrow(/requires new source revision/);
    const incomplete = reviewedState();
    const one = JSON.parse(fs.readFileSync(incomplete.file, 'utf8'));
    one.reviews = one.reviews.slice(0, 2);
    fs.writeFileSync(incomplete.file, JSON.stringify(one));
    expect(() => runtime.refreezeReviewPacket(incomplete.file, { expectedRevision: one.revision, sourceRevision: one.source_revision, newSourceRevision: 'source-current', acceptanceManifest: { ...one.acceptance_manifest, source_revision: 'source-current' }, reason: 'source drift', pointer: 'WORK.md#source-drift', actor: 'root', timestamp: stamp() }, incomplete.root)).toThrow(/exactly three/);
    const incompatible = reviewedState();
    expect(() => runtime.refreezeReviewPacket(incompatible.file, { expectedRevision: incompatible.state.revision, sourceRevision: incompatible.state.source_revision, newSourceRevision: 'source-current', acceptanceManifest: { ...incompatible.state.acceptance_manifest, source_revision: 'source-current', id: 'other-manifest' }, reason: 'source drift', pointer: 'WORK.md#source-drift', actor: 'root', timestamp: stamp() }, incompatible.root)).toThrow(/identity mismatch/);
    const invalidManifest = reviewedState();
    expect(() => runtime.refreezeReviewPacket(invalidManifest.file, { expectedRevision: invalidManifest.state.revision, sourceRevision: invalidManifest.state.source_revision, newSourceRevision: 'source-current', acceptanceManifest: { schema: 'Wrong/schema', id: 'manifest', version: 1, ac_ids: ['AC-QUALITY-1'], source: 'WORK.md', scope: 'runtime', source_revision: 'source-current' }, reason: 'source drift', pointer: 'WORK.md#source-drift', actor: 'root', timestamp: stamp() }, invalidManifest.root)).toThrow(/acceptance manifest invalid/);
    const missingManifest = reviewedState();
    expect(() => runtime.refreezeReviewPacket(missingManifest.file, { expectedRevision: missingManifest.state.revision, sourceRevision: missingManifest.state.source_revision, newSourceRevision: 'source-current', reason: 'source drift', pointer: 'WORK.md#source-drift', actor: 'root', timestamp: stamp() }, missingManifest.root)).toThrow(/acceptance manifest required/);
  });

  test('refreeze history is fail-closed and cannot be used from EXECUTE', () => {
    const { root, file, state } = reviewedState();
    const missingPacket = reviewedState();
    const packetless = { ...missingPacket.state, review_packet: null };
    fs.writeFileSync(missingPacket.file, JSON.stringify(packetless));
    expect(() => runtime.refreezeReviewPacket(missingPacket.file, { expectedRevision: packetless.revision, sourceRevision: packetless.source_revision, newSourceRevision: 'source-current', acceptanceManifest: { ...packetless.acceptance_manifest, source_revision: 'source-current' }, reason: 'source drift', pointer: 'WORK.md#source-drift', actor: 'root', timestamp: stamp() }, missingPacket.root)).toThrow(/exactly three/);
    const execute = { ...state, lifecycle_state: 'EXECUTE' };
    fs.writeFileSync(file, JSON.stringify(execute));
    expect(() => runtime.refreezeReviewPacket(file, { expectedRevision: execute.revision, sourceRevision: execute.source_revision, newSourceRevision: 'source-current', acceptanceManifest: { ...execute.acceptance_manifest, source_revision: 'source-current' }, reason: 'source drift', pointer: 'WORK.md#source-drift', actor: 'root', timestamp: stamp() }, root)).toThrow(/requires verify/);
    const feedback = reviewedState();
    const withFeedback = { ...feedback.state, delivery_receipt: { schema: 'DeliveryReceipt/v2' } };
    fs.writeFileSync(feedback.file, JSON.stringify(withFeedback));
    expect(() => runtime.refreezeReviewPacket(feedback.file, { expectedRevision: withFeedback.revision, sourceRevision: withFeedback.source_revision, newSourceRevision: 'source-current', acceptanceManifest: { ...withFeedback.acceptance_manifest, source_revision: 'source-current' }, reason: 'source drift', pointer: 'WORK.md#source-drift', actor: 'root', timestamp: stamp() }, feedback.root)).toThrow(/unavailable after delivery feedback/);
    const unchanged = reviewedState();
    const currentFingerprint = runtime.implementationFingerprint({ fingerprint_paths: ['scope.txt'] }, unchanged.root);
    const unchangedState = { ...unchanged.state, implementation_fingerprint: currentFingerprint };
    fs.writeFileSync(unchanged.file, JSON.stringify(unchangedState));
    expect(() => runtime.refreezeReviewPacket(unchanged.file, { expectedRevision: unchangedState.revision, sourceRevision: unchangedState.source_revision, newSourceRevision: 'source-current', acceptanceManifest: { ...unchangedState.acceptance_manifest, source_revision: 'source-current' }, reason: 'source drift', pointer: 'WORK.md#source-drift', actor: 'root', timestamp: stamp() }, unchanged.root)).toThrow(/requires implementation scope change/);
    expect(() => runtime.assertCheckpoint({ ...state, review_refreeze_history: { invalid: true } })).toThrow(/history invalid/);
    expect(() => runtime.assertCheckpoint({ ...state, review_refreeze_history: [null] })).toThrow(/history entry invalid/);
    expect(() => runtime.assertCheckpoint({ ...state, review_refreeze_history: [{ schema: 'ReviewRefreeze/v1', from_revision: 1 }] })).toThrow(/review refreeze/);
  });
});
