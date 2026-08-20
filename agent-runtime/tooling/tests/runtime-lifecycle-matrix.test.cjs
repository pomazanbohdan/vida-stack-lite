'use strict';

// Native public-API lifecycle matrix.  Values are deliberately fixed except for
// receipt times, which must follow the runtime-generated seal timestamp.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const runtime = require('../../lib/runtime.cjs');
const { checkpoint, deploymentManifest, fixtures } = require('./fixtures.cjs');

function repo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-lifecycle-matrix-'));
  execFileSync('git', ['init', '-q'], { cwd: root });
  execFileSync('git', ['config', 'user.email', 'matrix@example.test'], { cwd: root });
  execFileSync('git', ['config', 'user.name', 'matrix'], { cwd: root });
  fs.mkdirSync(path.join(root, 'src'));
  fs.writeFileSync(path.join(root, 'src', 'scope.txt'), 'initial\n');
  execFileSync('git', ['add', '.'], { cwd: root });
  execFileSync('git', ['commit', '-qm', 'initial'], { cwd: root });
  return root;
}
function save(root, state) {
  const dir = path.join(root, '.agent', 'work', state.work_id);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'resume.json'); fs.writeFileSync(file, JSON.stringify(state));
  return file;
}
function binding(c) {
  return { work_id: c.work_id, source_revision: c.source_revision, sealed_revision: c.sealed_revision,
    implementation_fingerprint: c.implementation_fingerprint, acceptance_manifest_id: c.acceptance_manifest.id,
    acceptance_manifest_version: c.acceptance_manifest.version };
}
function afterSeal() { return new Date(Date.now() + 20).toISOString(); }
function packet(c) {
  return { schema: 'BlindReviewPacket/v2', status: 'frozen', packet_id: 'matrix-packet', packet_version: 7, wave: 3,
    generation: 1, ...binding(c), required_profile: { model: 'configured', reasoning: 'high' },
    review_scope: { paths: c.fingerprint_paths, absence_assertions: c.absence_assertions || {} }, profile_attestation_set: 'dispatch.json' };
}
function dispatch(c, p) {
  return { schema: 'DispatchProfileAttestationSet/v1', ...binding(c), packet_id: p.packet_id, packet_version: p.packet_version,
    wave: p.wave, orchestrator: 'matrix-root', selector_source: 'native-test', requested_model: 'configured',
    requested_reasoning_effort: 'high', runtime_metadata_observed: false, issued_at: afterSeal(), root_task_id: 'root-task',
    root_dispatch_id: 'root-dispatch', entries: runtime.lenses.map((lens, n) => ({ task_id: `task-${n}`, dispatch_id: `dispatch-${n}`, reviewer_id: `reviewer-${n}`, lens, profile_verified: true, profile_verification: { verified_model: 'configured', verified_reasoning_effort: 'high', verification_source: 'native/profile-verifier', verification_pointer: `tests/profile-${n}`, verified_at: afterSeal() } })) };
}
function review(c, p, n, verdict = 'clean') {
  return { schema: 'ReviewReceipt/v2', ...binding(c), reviewer_id: `reviewer-${n}`, dispatch_task_id: `task-${n}`,
    dispatch_id: `dispatch-${n}`, lens: runtime.lenses[n], history_isolation: true, findings: verdict === 'clean' ? [] : ['finding'], verdict,
    packet_id: p.packet_id, packet_version: p.packet_version, wave: p.wave };
}
function reverse(c, p, n) {
  return { schema: 'ReverseValidationReceipt/v1', ...binding(c), receipt_id: `reverse-${n}`, reviewer_id: `reverse-reviewer-${n}`,
    type: ['trace_scope', 'technical_safety', 'evidence_truth'][n], verdict: 'pass', validator: 'native', timestamp: afterSeal(),
    evidence: ['tests/matrix'], ac_refs: ['AC-QUALITY-1'], packet_id: p.packet_id, packet_version: p.packet_version };
}
function evidence(c, id, kind = 'Static') {
  return { schema: 'Evidence/v1', ...binding(c), id, class: kind, timestamp: afterSeal(), ac_refs: ['AC-QUALITY-1'], pointer: `tests/${id}`, ...(kind === 'Runtime' ? { closes_runtime: true, actor: 'manual-user' } : {}) };
}
function exactBlocked(action, message) { let error; try { action(); } catch (caught) { error = caught; } expect(error).toBeInstanceOf(Error); expect({ message: error.message, code: error.code }).toEqual({ message, code: 'GATE_BLOCKED' }); }
function deploymentFixture() {
  const state=checkpoint({work_id:'deployment-zombies',lifecycle_state:'DELIVERY',delivery_cycle_id:'cycle-deployment',verification_completed_at:afterSeal()}),manifestValue=deploymentManifest(state,'src/changed.js');
  return {state,manifestValue,receipt:{schema:'DeliveryReceipt/v2',...binding(state),delivery_cycle_id:state.delivery_cycle_id,decision:'approved',actor:'owner',source:'current-thread',timestamp:afterSeal(),sanitized_pointers:['WORK.md#delivery'],deployment_manifest:manifestValue}};
}
function verifyDeploymentCollections(check,base){
  for(const field of ['created','modified','do_not_deploy']){
    const message=`deployment ${field==='do_not_deploy'?'excluded files':`${field} files`} invalid`;
    check({...base,[field]:null},message);check({...base,[field]:['../outside.js']},message);check({...base,[field]:['src/changed.js','src/changed.js']},message);
  }
  check({...base,created:['src/changed.js']},'deployment changed files overlap');
}
function verifyDeploymentEntries(check,base,receipt,state){
  check({...base,deploy:null},'deployment entries invalid');check({...base,deploy:[null],do_not_deploy:[]},'deployment entry invalid');
  const entry={source:'src/changed.js',destination:'target/changed.js',operation:'copy',order:1};
  for(const operation of ['deploy','import','copy'])expect(()=>runtime.validateDelivery({...receipt,deployment_manifest:{...base,deploy:[{...entry,operation}],do_not_deploy:[]}},state)).not.toThrow();
  const changes=/** @type {Array<[Record<string, any>, string]>} */ ([[{source:'../outside.js'},'deployment entry invalid'],[{source:'src/other.js'},'deployment entry invalid'],[{destination:''},'deployment destination missing'],[{operation:'remove'},'deployment entry invalid'],[{order:0},'deployment entry invalid'],[{order:1.5},'deployment entry invalid'],[{extra:true},'deployment entry invalid']]);
  for(const [change,message] of changes)check({...base,deploy:[{...entry,...change}],do_not_deploy:[]},message);
  check({...base,created:['src/second.js'],modified:['src/changed.js'],deploy:[entry,{...entry,source:'src/second.js',destination:'target/second.js',order:1}],do_not_deploy:[]},'deployment entry invalid');
  check({...base,deploy:[entry,{...entry,destination:'target/copy.js',order:2}],do_not_deploy:[]},'deployment entry invalid');
  check({...base,do_not_deploy:['src/other.js']},'deployment classification invalid');check({...base,deploy:[entry],do_not_deploy:['src/changed.js']},'deployment classification invalid');check({...base,do_not_deploy:[]},'deployment classification incomplete');
}
function verifyDeploymentChecks(check,base){
  check({...base,post_deployment_checks:null},'post-deployment checks missing');check({...base,post_deployment_checks:[]},'post-deployment checks missing');
  const post=base.post_deployment_checks[0];check({...base,post_deployment_checks:[null]},'post-deployment check invalid');check({...base,post_deployment_checks:[{...post,extra:true}]},'post-deployment check invalid');
  for(const [field,message] of [['id','post-deployment check id missing'],['step','post-deployment check step missing'],['expected','post-deployment check expected missing']])check({...base,post_deployment_checks:[{...post,[field]:''}]},message);
  check({...base,post_deployment_checks:[post,{...post}]},'post-deployment check invalid');check({...base,post_deployment_checks:[{...post,ac_refs:['outside']}]},'post-deployment check AC refs outside active manifest');
}

describe('native lifecycle matrix', () => {
  test('traces, plans, seals, attests, verifies, delivers, and completes an immutable high-risk work order', () => {
    const root = repo();
    const initial = checkpoint({ work_id: 'matrix', revision: 1, lifecycle_state: 'INTAKE', risk: 'high', allowed_paths: ['src/scope.txt'], fingerprint_paths: ['src/scope.txt', '.agent/work/matrix/resume.json'], sealed_at: undefined, sealed_revision: undefined, implementation_fingerprint: undefined });
    const file = save(root, initial);
    expect(() => runtime.validateGate(initial, 'plan:pre', { expectedRevision: 1, sourceRevision: initial.source_revision, root })).toThrow();
    let c = runtime.beginTrace(file, { expectedRevision: 1, sourceRevision: initial.source_revision });
    expect(() => runtime.replanWork(file, { expectedRevision: c.revision, sourceRevision: c.source_revision, acceptance: [], testPlan: [] })).toThrow(/replan contract/);
    const plan = { ...c.source_plan, scope: 'matrix scope' };
    c = runtime.replanWork(file, { expectedRevision: c.revision, sourceRevision: c.source_revision, sourcePlan: plan, acceptance: ['AC-QUALITY-1'], testPlan: ['vitest'], acceptanceManifest: { ...c.acceptance_manifest } });
    expect(runtime.validateGate(c, 'plan:post', { expectedRevision: c.revision, sourceRevision: c.source_revision, root })).toBe(true);
    expect(() => runtime.beginExecution(file, { expectedRevision: c.revision, sourceRevision: c.source_revision, approval: { source_revision: 'stale', pointer: 'WORK.md#approval' } })).toThrow();
    expect(runtime.validateGate(c, 'execute:pre', { expectedRevision: c.revision, sourceRevision: c.source_revision, root })).toBe(true);
    c = runtime.beginExecution(file, { expectedRevision: c.revision, sourceRevision: c.source_revision, approval: { source_revision: c.source_revision, pointer: 'WORK.md#approval' } });
    fs.writeFileSync(path.join(root, 'src', 'scope.txt'), 'sealed implementation\n');
    c = runtime.sealMutation(file, c.revision, c.source_revision, root);
    expect(c.lifecycle_state).toBe('VERIFY');
    const sealedFingerprint = c.implementation_fingerprint;
    const p = packet(c);
    expect(() => runtime.freezeReviewPacket(file, { ...p, generation: 2 }, c.revision, c.source_revision)).toThrow(/strictly newer/);
    c = runtime.freezeReviewPacket(file, p, c.revision, c.source_revision);
    const set = dispatch(c, p);
    expect(() => runtime.recordDispatchAttestationSet(file, { ...set, entries: [set.entries[0], set.entries[0], set.entries[2]] }, c.revision, c.source_revision, root)).toThrow(/entry invalid/);
    c = runtime.recordDispatchAttestationSet(file, set, c.revision, c.source_revision, root);
    expect(() => runtime.validateReviews([review(c, p, 0, 'changes_required'), review(c, p, 1), review(c, p, 2)], c, root)).toThrow(/changes required/);
    for (let n = 0; n < 3; n++) c = runtime.recordReviewReceipt(file, review(c, p, n), c.revision, c.source_revision, root);
    expect(() => runtime.recordReviewReceipt(file, review(c, p, 0), c.revision, c.source_revision, root)).toThrow(/duplicate/);
    for (let n = 0; n < 3; n++) c = runtime.recordReverseValidationReceipt(file, reverse(c, p, n), c.revision, c.source_revision, root);
    expect(runtime.implementationFingerprint(c, root)).toBe(sealedFingerprint);
    c = runtime.recordEvidence(file, evidence(c, 'static'), c.revision, c.source_revision);
    expect(() => runtime.recordEvidence(file, { ...evidence(c, 'bad-static'), closes_runtime: true }, c.revision, c.source_revision)).toThrow(/cannot close Runtime/);
    c = runtime.recordEvidence(file, evidence(c, 'runtime', 'Runtime'), c.revision, c.source_revision);
    c = runtime.recordRecoveryEvidence(file, { schema: 'RecoveryEvidence/v1', ...binding(c), id: 'recovery', action: 'restore', actor: 'operator', attribution: 'tests/recovery', result: 'pass', rollback: 'revert', timestamp: afterSeal(), ac_refs: ['AC-QUALITY-1'] }, c.revision, c.source_revision);
    c = runtime.recordImportAttribution(file, { schema: 'ImportAttribution/v1', ...binding(c), import_id: 'import-1', provider: 'native', receipt_pointer: 'imports/receipt', imported_at: afterSeal(), status: 'accepted' }, c.revision, c.source_revision);
    const blockingQuestion = { ...fixtures()['question-candidate.v1.schema.json'], work_id: c.work_id, source_revision: c.source_revision };
    expect(() => runtime.validateGate({ ...c, question_candidates: [blockingQuestion] }, 'verify:post', { expectedRevision: c.revision, sourceRevision: c.source_revision, root })).toThrow(/blocking clarification remains open/);
    expect(() => runtime.validateGate({ ...c, reviews: [] }, 'verify:post', { expectedRevision: c.revision, sourceRevision: c.source_revision, root })).toThrow(/exactly three review receipts required/);
    expect(runtime.validateGate(c, 'verify:post', { expectedRevision: c.revision, sourceRevision: c.source_revision, root })).toBe(true);
    c = runtime.advanceToDelivery(file, { expectedRevision: c.revision, sourceRevision: c.source_revision, root });
    const delivery = { schema: 'DeliveryReceipt/v2', ...binding(c), delivery_cycle_id: c.delivery_cycle_id, decision: 'approved', actor: 'owner', source: 'chat', timestamp: afterSeal(), sanitized_pointers: ['WORK.md#approval'], deployment_manifest: deploymentManifest(c) };
    c = runtime.recordDeliveryReceipt(file, delivery, c.revision, c.source_revision);
    const disposition = { schema: 'RuntimeReceipt/v2', ...binding(c), status: 'accepted', blocking: true, environment: 'DEV', actor: 'operator', timestamp: afterSeal(), ac_refs: ['AC-QUALITY-1'], sanitized_pointers: ['runtime/observation'] };
    c = runtime.recordRuntimeReceipt(file, disposition, c.revision, c.source_revision);
    expect(() => runtime.validateGate({ ...c, question_candidates: [blockingQuestion] }, 'ship:pre', { expectedRevision: c.revision, sourceRevision: c.source_revision, root })).toThrow(/blocking clarification remains open/);
    expect(() => runtime.validateGate({ ...c, runtime_receipt: null }, 'ship:pre', { expectedRevision: c.revision, sourceRevision: c.source_revision, root })).toThrow(/runtime receipt invalid/);
    expect(runtime.validateGate(c, 'ship:pre', { expectedRevision: c.revision, sourceRevision: c.source_revision, root })).toBe(true);
    expect(() => runtime.validateGate({ ...c, delivery_receipt: { ...c.delivery_receipt, sanitized_pointers: [] } }, 'ship:pre', { expectedRevision: c.revision, sourceRevision: c.source_revision, root })).toThrow(/delivery pointers missing/);
    expect(() => runtime.validateGate({ ...c, runtime_receipt: { ...c.runtime_receipt, sanitized_pointers: [] } }, 'ship:pre', { expectedRevision: c.revision, sourceRevision: c.source_revision, root })).toThrow(/accepted Runtime receipt needs attributable pointers/);
    expect(() => runtime.validateGate({ ...c, evidence: c.evidence.map(item => item.class === 'Runtime' ? { ...item, closes_runtime: false } : item) }, 'ship:pre', { expectedRevision: c.revision, sourceRevision: c.source_revision, root })).toThrow(/blocking Runtime AC evidence incomplete/);
    expect(runtime.validateGate({ ...c, runtime_receipt: { ...c.runtime_receipt, blocking: false }, evidence: c.evidence.filter(item => item.class !== 'Runtime') }, 'ship:pre', { expectedRevision: c.revision, sourceRevision: c.source_revision, root })).toBe(true);
    expect(() => runtime.validateGate({ ...c, recovery_evidence: [] }, 'ship:pre', { expectedRevision: c.revision, sourceRevision: c.source_revision, root })).toThrow(/high risk recovery evidence required/);
    expect(() => runtime.validateGate({ ...c, delivery_receipt: { ...c.delivery_receipt, decision: 'feedback' } }, 'ship:pre', { expectedRevision: c.revision, sourceRevision: c.source_revision, root })).toThrow(/current delivery approval missing/);
    expect(() => runtime.validateGate({ ...c, evidence: c.evidence.filter(item => item.class !== 'Runtime') }, 'ship:pre', { expectedRevision: c.revision, sourceRevision: c.source_revision, root })).toThrow(/blocking Runtime AC evidence incomplete/);
    const ac2 = { id: 'AC-QUALITY-2', definition: 'second runtime behavior', sr: 'SR-QUALITY-2', evidence: ['Runtime'] };
    const twoAcManifest = { ...c.acceptance_manifest, ac_ids: [...c.acceptance_manifest.ac_ids, ac2.id], contracts: [...c.acceptance_manifest.contracts, ac2] };
    const runtimeEvidence = c.evidence.find(item => item.class === 'Runtime');
    const secondRuntimeEvidence = { ...runtimeEvidence, id: 'runtime-ac-2', ac_refs: [ac2.id] };
    const coveredState = { ...c, acceptance_manifest: twoAcManifest, runtime_receipt: { ...c.runtime_receipt, ac_refs: ['AC-QUALITY-1', ac2.id] }, evidence: [...c.evidence, secondRuntimeEvidence] };
    expect(runtime.validateGate(coveredState, 'ship:pre', { expectedRevision: c.revision, sourceRevision: c.source_revision, root })).toBe(true);
    expect(() => runtime.validateGate({ ...coveredState, evidence: c.evidence }, 'ship:pre', { expectedRevision: c.revision, sourceRevision: c.source_revision, root })).toThrow(/blocking Runtime AC evidence incomplete/);
    c = runtime.completeWork(file, { expectedRevision: c.revision, sourceRevision: c.source_revision, root });
    expect(runtime.validateGate(c, 'ship:post', { expectedRevision: c.revision, sourceRevision: c.source_revision, root })).toBe(true);
    expect(() => runtime.beginCorrection(file, { expectedRevision: c.revision, sourceRevision: c.source_revision, correction: { reason: 'late', pointer: 'WORK.md#late' } })).toThrow(/immutable/);
  }, 60_000);

  test('correction invalidates downstream evidence and scope/absence/checkpoint boundary APIs fail closed', () => {
    const root = repo();
    const state = checkpoint({ work_id: 'matrix-correction', revision: 1, lifecycle_state: 'VERIFY', allowed_paths: ['src/scope.txt'], fingerprint_paths: ['src/scope.txt'], absence_assertions: { 'missing.txt': true }, review_packet: null, sealed_at: new Date().toISOString() });
    const file = save(root, state);
    expect(() => runtime.resolveScope({ fingerprint_paths: ['src/../scope.txt'] }, root)).toThrow();
    expect(() => runtime.implementationFingerprint({ fingerprint_paths: ['src/scope.txt'], absence_assertions: { 'src/scope.txt': true } }, root)).toThrow(/required absence/);
    expect(() => runtime.checkpointPath({ checkpointPath: path.join(root, 'outside.json') }, root)).toThrow();
    const next = runtime.beginCorrection(file, { expectedRevision: state.revision, sourceRevision: state.source_revision, correction: { reason: 'bounded', pointer: 'WORK.md#correction' } });
    expect(next).toMatchObject({ lifecycle_state: 'EXECUTE', implementation_fingerprint: undefined, review_packet: null, reviews: [], verification: [], evidence: [], recovery_evidence: [] });
    expect(() => runtime.validateContinuity(next, { expectedRevision: next.revision - 1, sourceRevision: next.source_revision })).toThrow();
  });

  test('attributable delivery feedback or rejection returns to a clean correction cycle without an approval or runtime claim', () => {
    const root = repo();
    for (const decision of ['feedback', 'rejected']) {
      const state = checkpoint({ work_id: `delivery-${decision}`, lifecycle_state: 'DELIVERY', revision: 1, verification_completed_at: afterSeal(), delivery_cycle_id: `cycle-${decision}` });
      const file = save(root, state);
      const receipt = { schema: 'DeliveryReceipt/v2', ...binding(state), delivery_cycle_id: state.delivery_cycle_id, decision, actor: 'owner', source: 'chat', timestamp: afterSeal(), sanitized_pointers: [`WORK.md#${decision}`], deployment_manifest: deploymentManifest(state) };
      expect(() => runtime.validateDelivery(receipt, state)).not.toThrow();
      const next = runtime.recordDeliveryReceipt(file, receipt, state.revision, state.source_revision);
      expect(next).toMatchObject({ lifecycle_state: 'EXECUTE', implementation_fingerprint: undefined, sealed_at: null, sealed_revision: null, review_packet: null, reviews: [], verification: [], evidence: [], recovery_evidence: [], delivery_receipt: null, runtime_receipt: null, delivery_feedback_receipt: receipt, correction: { pointer: receipt.sanitized_pointers[0] }, next_action: expect.stringMatching(/feedback/) });
      expect(() => runtime.recordRuntimeReceipt(file, { schema: 'RuntimeReceipt/v2' }, next.revision, next.source_revision)).toThrow(/runtime receipt requires delivery approval/);
      expect(JSON.parse(fs.readFileSync(file, 'utf8'))).toEqual(next);
    }
  });

  test('table-driven public validator negatives close timestamp, manifest, continuity, path, and evidence alternatives', () => {
    const root = repo();
    const c = checkpoint({ allowed_paths: ['src/scope.txt'], fingerprint_paths: ['src/scope.txt'], leases: [], imports: [] });
    const future = new Date(Date.now() + 600_000).toISOString();
    for (const bad of [
      { ...c, acceptance_manifest: { ...c.acceptance_manifest, ac_ids: ['AC-QUALITY-1', 'AC-QUALITY-1'] } },
      { ...c, acceptance_manifest: { ...c.acceptance_manifest, contracts: [{ ...c.acceptance_manifest.contracts[0], id: 'not-active' }] } },
      { ...c, review_generation: '1' },
      { ...c, risk: 'medium', change_kind: 'destructive' },
      { ...c, lifecycle_state: 'VERIFY', sealed_at: future },
      { ...c, lifecycle_state: 'VERIFY', implementation_fingerprint: 'bad' }
    ]) expect(() => runtime.assertCheckpoint(bad)).toThrow();
    const validLease = { id: 'lease-a', holder: 'holder', purpose: 'test', status: 'active', expires_at: afterSeal() };
    expect(runtime.validateContinuity({ ...c, leases: [validLease] }, { expectedRevision: c.revision, sourceRevision: c.source_revision })).toBe(true);
    for (const leases of [
      [{ ...validLease, expires_at: '2000-01-01T00:00:00Z' }], [validLease, validLease],
      [{ ...validLease, status: 'released' }], [{ ...validLease, holder: '' }]
    ]) expect(() => runtime.validateContinuity({ ...c, leases }, { expectedRevision: c.revision, sourceRevision: c.source_revision })).toThrow();
    for (const spec of [
      { fingerprint_paths: ['src/*.txt'] }, { fingerprint_paths: ['src/scope.txt'] }, { fingerprint_paths: ['src/no-match*.txt'] },
      { fingerprint_paths: ['src/missing.txt'] }, { fingerprint_paths: ['src'] }, { fingerprint_paths: ['src/scope.txt', 'src/scope.txt'] }
    ]) {
      if (spec.fingerprint_paths[0] === 'src/missing.txt' || spec.fingerprint_paths[0] === 'src' || spec.fingerprint_paths[0] === 'src/no-match*.txt') expect(() => runtime.resolveScope(spec, root)).toThrow();
      else expect(runtime.resolveScope(spec, root).map(x => x.relative)).toEqual(['src/scope.txt']);
    }
    const base = evidence(c, 'base');
    for (const bad of [
      { ...base, id: '' }, { ...base, id: 'future', timestamp: future }, { ...base, id: 'pointer', pointer: 'Authorization: Bearer secret' },
      { ...base, id: 'refs', ac_refs: [] }, { ...base, id: 'binding', implementation_fingerprint: 'b'.repeat(64) },
      { ...base, id: 'runtime-actor', class: 'Runtime', closes_runtime: true, actor: 'x\nunsafe' },
      { ...base, id: 'runtime-old', class: 'Runtime', closes_runtime: true, actor: 'operator', timestamp: '2000-01-01T00:00:00Z' }
    ]) expect(() => runtime.validateEvidence([bad], c)).toThrow();
    expect(() => runtime.implementationFingerprint({ fingerprint_paths: ['src/scope.txt'], absence_assertions: { '../unsafe': true } }, root)).toThrow();
  });

  test('public API regression matrix covers sealed lists, ignored traversal, imports, evidence duplication, packet identity, and dispatch persistence', () => {
    const root = repo();
    const c = checkpoint({ work_id: 'mutation-regressions', allowed_paths: ['src/scope.txt'], fingerprint_paths: ['**/*.txt'] });

    // Every persisted list is part of the public checkpoint contract, including
    // empty lists. A non-array must fail before any lifecycle operation.
    for (const field of ['reviews', 'verification', 'evidence', 'leases', 'imports', 'recovery_evidence', 'review_generation_ledger']) {
      expect(() => runtime.assertCheckpoint({ ...c, [field]: {} })).toThrow(new RegExp(`checkpoint ${field} invalid`));
    }
    expect(runtime.assertCheckpoint(c)).toBe(true);

    // Recursive discovery must omit generated directories rather than merely
    // tolerate them; otherwise derived test/build output alters a fingerprint.
    fs.mkdirSync(path.join(root, 'coverage'), { recursive: true });
    fs.mkdirSync(path.join(root, 'node_modules', 'ignored'), { recursive: true });
    fs.writeFileSync(path.join(root, 'coverage', 'report.txt'), 'derived');
    fs.writeFileSync(path.join(root, 'node_modules', 'ignored', 'package.txt'), 'derived');
    expect(runtime.resolveScope(c, root).map(row => row.relative)).toEqual(['src/scope.txt']);

    const imported = {
      schema: 'ImportAttribution/v1', work_id: c.work_id, source_revision: c.source_revision,
      sealed_revision: c.sealed_revision, implementation_fingerprint: c.implementation_fingerprint,
      acceptance_manifest_id: c.acceptance_manifest.id, acceptance_manifest_version: c.acceptance_manifest.version,
      import_id: 'import-regression', provider: 'test-provider', receipt_pointer: 'receipts/import.json',
      imported_at: afterSeal(), status: 'accepted'
    };
    expect(runtime.validateContinuity({ ...c, imports: [imported] }, { expectedRevision: c.revision, sourceRevision: c.source_revision })).toBe(true);
    expect(() => runtime.validateContinuity({ ...c, imports: [imported, imported] }, { expectedRevision: c.revision, sourceRevision: c.source_revision })).toThrow(/duplicate import/);

    const staticEvidence = evidence(c, 'duplicate-evidence');
    expect(runtime.validateEvidence([staticEvidence], c)).toBe(true);
    expect(() => runtime.validateEvidence([staticEvidence, staticEvidence], c)).toThrow(/duplicate evidence id/);

    const verify = checkpoint({ work_id: 'packet-identity', review_generation: 1, review_generation_ledger: [{ generation: 1, packet_id: 'old', packet_version: 7, wave: 3 }], allowed_paths: ['src/scope.txt'], fingerprint_paths: ['src/scope.txt'] });
    const file = save(root, verify);
    expect(() => runtime.freezeReviewPacket(file, { ...packet(verify), packet_id: 'old', packet_version: 7, wave: 3, generation: 2 }, verify.revision, verify.source_revision)).toThrow(/cannot be reused/);
    for (const [index, changed] of [
      { packet_id: 'new', packet_version: 7, wave: 3 },
      { packet_id: 'old', packet_version: 8, wave: 3 },
      { packet_id: 'old', packet_version: 7, wave: 4 }
    ].entries()) {
      const fresh={...verify,work_id:`packet-identity-${index}`},freshFile=save(root,fresh);
      expect(runtime.freezeReviewPacket(freshFile, { ...packet(fresh), ...changed, generation: 2 }, fresh.revision, fresh.source_revision).review_packet).toMatchObject(changed);
    }

    expect(() => runtime.assertCheckpoint({ ...verify, review_generation_ledger: ['malformed'] })).toThrow(/review_generation_ledger entry/);
    const planState = checkpoint({ work_id: 'packet-wrong-state', lifecycle_state: 'PLAN', review_generation: 0, review_generation_ledger: [], sealed_at: undefined, sealed_revision: undefined, implementation_fingerprint: undefined });
    const planFile = save(root, planState);
    expect(() => runtime.freezeReviewPacket(planFile, packet(planState), planState.revision, planState.source_revision)).toThrow(/unreviewed verify/);

    const dispatchState = checkpoint({ work_id: 'dispatch-persisted', review_generation: 1, allowed_paths: ['src/scope.txt'], fingerprint_paths: ['src/scope.txt'] });
    const dispatchPacket = packet(dispatchState);
    const dispatchFile = save(root, { ...dispatchState, review_packet: dispatchPacket, review_generation_ledger: [{ generation: 1, packet_id: dispatchPacket.packet_id, packet_version: dispatchPacket.packet_version, wave: dispatchPacket.wave }] });
    const next = runtime.recordDispatchAttestationSet(dispatchFile, dispatch(dispatchState, dispatchPacket), dispatchState.revision, dispatchState.source_revision, root);
    expect(next.dispatch_attestation_set).toMatchObject({ packet_id: dispatchPacket.packet_id, pointer: 'dispatch.json' });
    expect(fs.existsSync(path.join(root, '.agent', 'work', dispatchState.work_id, 'dispatch.json'))).toBe(true);
  });

  test('receipt validators reject every public packet, review, reverse, delivery, and runtime binding alternative', () => {
    const root = repo();
    let c = checkpoint({ work_id: 'matrix-receipts', review_generation: 1, allowed_paths: ['src/scope.txt'], fingerprint_paths: ['src/scope.txt'] });
    const p = packet(c); c = { ...c, review_packet: p };
    const set = dispatch(c, p);
    for (const bad of [null, { ...set, runtime_metadata_observed: true }, { ...set, packet_id: 'other' }, { ...set, issued_at: '2000-01-01T00:00:00Z' }, { ...set, entries: set.entries.slice(0, 2) }, { ...set, entries: [{ ...set.entries[0], task_id: 'root-task' }, set.entries[1], set.entries[2]] }]) expect(() => runtime.validateAttestationSet(bad, p, c)).toThrow();
    const dir = path.join(root, '.agent', 'work', c.work_id); fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, 'dispatch.json'), JSON.stringify(set));
    c = { ...c, dispatch_attestation_set: { pointer: 'dispatch.json' } };
    const reviews = [0, 1, 2].map(n => review(c, p, n));
    expect(runtime.validateReviews(reviews, c, root)).toBe(true);
    for (const bad of [[reviews[0]], [{ ...reviews[0], findings: ['x'] }, reviews[1], reviews[2]], [{ ...reviews[0], reviewer_id: reviews[1].reviewer_id }, reviews[1], reviews[2]], [{ ...reviews[0], profile_attestation: {} }, reviews[1], reviews[2]]]) expect(() => runtime.validateReviews(bad, c, root)).toThrow();
    const reverseRows = [0, 1, 2].map(n => reverse(c, p, n));
    expect(runtime.validateReverseValidation(reverseRows, c)).toBe(true);
    for (const bad of [[reverseRows[0]], [{ ...reverseRows[0], packet_id: 'bad' }, reverseRows[1], reverseRows[2]], [{ ...reverseRows[0], type: 'technical_safety' }, reverseRows[1], reverseRows[2]], [{ ...reverseRows[0], evidence: [] }, reverseRows[1], reverseRows[2]]]) expect(() => runtime.validateReverseValidation(bad, c)).toThrow();
    const deliveryState = { ...c, lifecycle_state: 'DELIVERY', verification_completed_at: afterSeal(), delivery_cycle_id: 'cycle-matrix' };
    const receipt = { schema: 'DeliveryReceipt/v2', ...binding(deliveryState), decision: 'approved', actor: 'owner', source: 'chat', timestamp: afterSeal(), delivery_cycle_id: 'cycle-matrix', sanitized_pointers: ['WORK.md#approval'], deployment_manifest: deploymentManifest(deliveryState) };
    expect(() => runtime.validateDelivery(receipt, deliveryState)).not.toThrow();
    const deployment = receipt.deployment_manifest;
    const invalidDeliveries = [
      { ...receipt, decision: 'pending' }, { ...receipt, delivery_cycle_id: 'old' }, { ...receipt, sanitized_pointers: [] },
      { ...receipt, actor: '' }, { ...receipt, timestamp: '2000-01-01T00:00:00Z' }, { ...receipt, extra: true },
      { ...receipt, deployment_manifest: null }, { ...receipt, deployment_manifest: { ...deployment, delivery_cycle_id: 'old' } },
      { ...receipt, deployment_manifest: { ...deployment, modified: ['agent-runtime/lib/runtime.cjs', 'agent-runtime/lib/runtime.cjs'] } },
      { ...receipt, deployment_manifest: { ...deployment, created: ['agent-runtime/lib/runtime.cjs'] } },
      { ...receipt, deployment_manifest: { ...deployment, deploy: null } },
      { ...receipt, deployment_manifest: { ...deployment, deploy: [null] } },
      { ...receipt, deployment_manifest: { ...deployment, deploy: [{ source: 'agent-runtime/lib/runtime.cjs', destination: 'target', operation: 'remove', order: 1 }], do_not_deploy: [] } },
      { ...receipt, deployment_manifest: { ...deployment, deploy: [{ source: 'outside.txt', destination: 'target', operation: 'copy', order: 1 }] } },
      { ...receipt, deployment_manifest: { ...deployment, do_not_deploy: ['outside.txt'] } },
      { ...receipt, deployment_manifest: { ...deployment, do_not_deploy: [] } },
      { ...receipt, deployment_manifest: { ...deployment, post_deployment_checks: [] } },
      { ...receipt, deployment_manifest: { ...deployment, post_deployment_checks: [null] } },
      { ...receipt, deployment_manifest: { ...deployment, post_deployment_checks: [deployment.post_deployment_checks[0], { ...deployment.post_deployment_checks[0] }] } },
      { ...receipt, deployment_manifest: { ...deployment, post_deployment_checks: [{ ...deployment.post_deployment_checks[0], step: '' }] } }
    ];
    invalidDeliveries.forEach((bad, index) => expect(() => runtime.validateDelivery(bad, deliveryState), `invalid delivery ${index}`).toThrow());
    for (const argv of [['status'], ['validate-checkpoint'], ['validate-gate'], ['unsupported']]) { const prior = process.exitCode; process.exitCode = undefined; try { if (argv[0] === 'unsupported') runtime.runCli(argv); else expect(() => runtime.runCli(argv)).toThrow(); } finally { process.exitCode = prior; } }
  });

  test('deployment manifest validation distinguishes every collection, entry, classification and post-check contract', () => {
    const {state:c,manifestValue:base,receipt}=deploymentFixture();expect(()=>runtime.validateDelivery(receipt,c)).not.toThrow();
    const check=(manifest,message)=>exactBlocked(()=>runtime.validateDelivery({...receipt,deployment_manifest:manifest},c),message);
    check(null,'deployment manifest invalid');
    check({...base,schema:'DeploymentManifest/v0'},'deployment manifest invalid');
    check({...base,unknown:true},'deployment manifest invalid');
    check({...base,delivery_cycle_id:'other'},'deployment manifest cycle invalid');
    for(const field of ['work_id','source_revision','sealed_revision','implementation_fingerprint','acceptance_manifest_id','acceptance_manifest_version']){
      const changed=field==='implementation_fingerprint'?'b'.repeat(64):['sealed_revision','acceptance_manifest_version'].includes(field)?99:'other';
      check({...base,[field]:changed},'deployment manifest binding invalid');
    }
    verifyDeploymentCollections(check,base);verifyDeploymentEntries(check,base,receipt,c);verifyDeploymentChecks(check,base);
  });

  test('every typed mutation verb rejects an otherwise valid wrong-state snapshot without changing it', () => {
    const root = repo();
    function blocked(invoke, state = 'INTAKE') {
      const initial = checkpoint({ work_id: `matrix-${Math.random().toString(16).slice(2)}`, revision: 1, lifecycle_state: state, sealed_at: state === 'VERIFY' || state === 'DELIVERY' ? checkpoint().sealed_at : undefined, sealed_revision: state === 'VERIFY' || state === 'DELIVERY' ? 9 : undefined, implementation_fingerprint: state === 'VERIFY' || state === 'DELIVERY' ? checkpoint().implementation_fingerprint : undefined });
      const file = save(root, initial); const before = fs.readFileSync(file, 'utf8'); expect(() => invoke(file, initial)).toThrow(); expect(fs.readFileSync(file, 'utf8')).toBe(before);
    }
    blocked((f, c) => runtime.freezeReviewPacket(f, {}, c.revision, c.source_revision));
    blocked((f, c) => runtime.recordDispatchAttestationSet(f, {}, c.revision, c.source_revision, root));
    blocked((f, c) => runtime.recordReviewReceipt(f, {}, c.revision, c.source_revision, root));
    blocked((f, c) => runtime.recordReverseValidationReceipt(f, {}, c.revision, c.source_revision, root));
    blocked((f, c) => runtime.recordRecoveryEvidence(f, {}, c.revision, c.source_revision));
    blocked((f, c) => runtime.recordEvidence(f, {}, c.revision, c.source_revision));
    blocked((f, c) => runtime.recordImportAttribution(f, {}, c.revision, c.source_revision));
    blocked((f, c) => runtime.advanceToDelivery(f, { expectedRevision: c.revision, sourceRevision: c.source_revision, root }));
    blocked((f, c) => runtime.recordDeliveryReceipt(f, {}, c.revision, c.source_revision));
    blocked((f, c) => runtime.recordRuntimeReceipt(f, {}, c.revision, c.source_revision));
    blocked((f, c) => runtime.completeWork(f, { expectedRevision: c.revision, sourceRevision: c.source_revision, root }));
    blocked((f, c) => runtime.beginCorrection(f, { expectedRevision: c.revision, sourceRevision: c.source_revision }));
    const outside = path.join(root, 'outside.json'); fs.writeFileSync(outside, JSON.stringify(checkpoint()));
    for (const input of [null, {}, { checkpointPath: outside, sourceRevision: 's', repoRoot: root, point: 'plan:pre', expectedRevision: 1 }, { checkpointPath: outside, sourceRevision: 's', repoRoot: root, point: 'plan:pre', expectedRevision: '1' }]) expect(() => runtime.validateGateFile(input)).toThrow();
  });

  test('in-process seal CLI uses the same typed production operation', () => {
    const root = repo();
    const initial = checkpoint({
      work_id: 'matrix-cli-seal', revision: 1, lifecycle_state: 'EXECUTE',
      allowed_paths: ['src/scope.txt'],
      fingerprint_paths: ['src/scope.txt'],
      sealed_at: undefined, sealed_revision: undefined,
      implementation_fingerprint: undefined
    });
    const file = save(root, initial);
    const output = [];
    const priorLog = console.log;
    console.log = value => output.push(String(value));
    try {
      runtime.runCli(['seal-mutation', file, String(initial.revision), initial.source_revision], root);
    } finally {
      console.log = priorLog;
    }
    const sealed = JSON.parse(fs.readFileSync(file, 'utf8'));
    expect(sealed).toMatchObject({ lifecycle_state: 'VERIFY', revision: 2, sealed_revision: 2 });
    expect(JSON.parse(output[0])).toMatchObject({ revision: 2, implementation_fingerprint: sealed.implementation_fingerprint });
  });

  test('strict manifest, checkpoint, import and derived-directory shape guards stay observable', () => {
    const root = repo();
    const c = checkpoint({ work_id: 'strict-shapes', allowed_paths: ['src/scope.txt'], fingerprint_paths: ['**/*.txt'] });
    expect(() => runtime.assertCheckpoint({ ...c, acceptance_manifest: { ...c.acceptance_manifest, ac_ids: {} } })).toThrow(/manifest binding/);
    expect(() => runtime.assertCheckpoint({ ...c, acceptance_manifest: { ...c.acceptance_manifest, contracts: [null] } })).toThrow(/contract incomplete/);
    expect(() => runtime.assertCheckpoint({ ...c, acceptance_manifest: { ...c.acceptance_manifest, contracts: [{ ...c.acceptance_manifest.contracts[0], evidence: {} }] } })).toThrow(/contract incomplete/);
    expect(() => runtime.assertCheckpoint({ ...c, allowed_paths: {} })).toThrow(/required fields/);
    expect(() => runtime.validateContinuity({ ...c, imports: [{ schema: 'Other/v1' }] }, { expectedRevision: c.revision, sourceRevision: c.source_revision })).toThrow(/invalid result import/);
    fs.mkdirSync(path.join(root, 'coverage'), { recursive: true });
    fs.writeFileSync(path.join(root, 'coverage', 'derived.txt'), 'ignored');
    expect(runtime.resolveScope(c, root).map(row => row.relative)).toEqual(['src/scope.txt']);
  });

  test('null and malformed typed records fail through every public validator boundary', () => {
    const root = repo();
    let c = checkpoint({ work_id: 'null-boundaries', review_generation: 1, allowed_paths: ['src/scope.txt'], fingerprint_paths: ['src/scope.txt'] });
    expect(() => runtime.validateContinuity({ ...c, imports: [null] }, { expectedRevision: c.revision, sourceRevision: c.source_revision })).toThrow(/invalid result import/);
    expect(() => runtime.validateContinuity({ ...c, leases: [null] }, { expectedRevision: c.revision, sourceRevision: c.source_revision })).toThrow(/stale or invalid lease/);
    expect(() => runtime.validateEvidence([null], c)).toThrow(/typed evidence/);
    expect(() => runtime.validateReverseValidation([null, null, null], c)).toThrow(/reverse validation/);
    expect(() => runtime.validateReverseValidation([{ evidence: {} }, null, null], c)).toThrow(/reverse validation/);
    expect(() => runtime.validateDelivery(null, c)).toThrow(/delivery receipt invalid/);

    const p = packet(c), set = dispatch(c, p);
    expect(() => runtime.validateAttestationSet({ ...set, entries: [null, set.entries[1], set.entries[2]] }, p, c)).toThrow(/entry invalid/);
    const dir = path.join(root, '.agent', 'work', c.work_id);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'dispatch.json'), JSON.stringify(set));
    c = { ...c, review_packet: p, review_generation_ledger: [{ generation: 1, packet_id: p.packet_id, packet_version: p.packet_version, wave: p.wave }], dispatch_attestation_set: { pointer: 'dispatch.json' } };
    expect(() => runtime.validateReviews([null, review(c, p, 1), review(c, p, 2)], c, root)).toThrow(/review receipt/);

    let file = save(root, c);
    expect(() => runtime.recordRecoveryEvidence(file, null, c.revision, c.source_revision)).toThrow(/typed recovery/);
    expect(() => runtime.beginCorrection(file, { expectedRevision: c.revision, sourceRevision: c.source_revision })).toThrow(/bounded correction/);
    const deliveryState = { ...c, lifecycle_state: 'DELIVERY', delivery_receipt: { present: true } };
    file = save(root, deliveryState);
    expect(() => runtime.recordRuntimeReceipt(file, null, deliveryState.revision, deliveryState.source_revision)).toThrow(/runtime receipt invalid/);
    expect(() => runtime.runCli(['status', path.join(root, 'missing-resume.json')], root)).toThrow(/checkpoint schema/);
  });
});
