'use strict';

// Critical-profile tests intentionally use only the public CJS surface.  They
// are deterministic so any generated counterexample can be reproduced manually.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const Ajv2020 = require('ajv/dist/2020').default;
const fc = require('fast-check');
const runtime = require('../../lib/runtime.cjs');
const { checkpoint, fixtures } = require('./fixtures.cjs');
const propertyRuns = Number(process.env.FC_RUNS || 10_000);

function writeCheckpoint(dir, state = 'INTAKE') {
  const file = path.join(dir, 'resume.json');
  const initial = checkpoint({ lifecycle_state: state, revision: 1, sealed_at: undefined, sealed_revision: undefined, implementation_fingerprint: undefined });
  fs.writeFileSync(file, JSON.stringify(initial));
  return { file, initial };
}

function childBeginTrace(file, sourceRevision) {
  const source = [
    "const r=require(process.argv[1]);",
    "try { r.beginTrace(process.argv[2],{expectedRevision:1,sourceRevision:process.argv[3]}); process.stdout.write('ok'); }",
    "catch (e) { process.stdout.write(e.code || 'error'); process.exitCode=1; }"
  ].join('');
  return new Promise(resolve => {
    const child = spawn(process.execPath, ['-e', source, path.resolve(__dirname, '../../lib/runtime.cjs'), file, sourceRevision], { stdio: ['ignore', 'pipe', 'ignore'] });
    let output = ''; child.stdout.on('data', chunk => { output += chunk; });
    child.on('close', code => resolve({ code, output }));
  });
}

describe('strict critical protocol: ZOMBIES public surface', () => {
  test('exports the closed lifecycle and all named transition verbs', () => {
    expect(runtime.transitions).toEqual({ INTAKE: ['TRACE'], TRACE: ['PLAN'], PLAN: ['EXECUTE'], EXECUTE: [], VERIFY: ['DELIVERY', 'EXECUTE'], DELIVERY: ['COMPLETE', 'EXECUTE'], COMPLETE: [] });
    for (const name of ['stable', 'resolveScope', 'implementationFingerprint', 'assertCheckpoint', 'assertTransition', 'validateContinuity', 'validateAttestationSet', 'validateReviewDispatchReservation', 'validateReviews', 'validateEvidence', 'validateReverseValidation', 'validateDelivery', 'validateArchitectDiagnosticDispatch', 'validateArchitectDispatchDisqualification', 'validateArchitectureDiagnosis', 'architectDiagnosticRequired', 'validateGate', 'validateGateFile', 'checkpointPath', 'trustedRepoRoot', 'replanWork', 'repairAcceptanceManifest', 'retagUnsealedExecution', 'beginTrace', 'beginExecution', 'registerCoordinationScope', 'claimCoordinationResources', 'recoverCoordinationClaim', 'refreshCoordination', 'sealMutation', 'freezeReviewPacket', 'refreezeReviewPacket', 'recordReviewDispatchReservation', 'recordDispatchAttestationSet', 'recordReviewReceipt', 'recordCorrectionAuthorization', 'recordArchitectDiagnosticDispatch', 'disqualifyArchitectDiagnosticDispatch', 'recordArchitectureDiagnosis', 'recordReverseValidationReceipt', 'recordRecoveryEvidence', 'recordEvidence', 'recordImportAttribution', 'advanceToDelivery', 'recordDeliveryReceipt', 'recordDeliveryFeedbackAnalysis', 'recordRuntimeReceipt', 'completeWork', 'beginCorrection', 'restorePlatformKnowledgeContext']) expect(runtime[name]).toBeTypeOf('function');
  });

  test('ZOMBIES checkpoint contract mutations exercise every mandatory input boundary', () => {
    const variants = [
      state => ({ ...state, schema: 'wrong' }), state => ({ ...state, revision: 0 }), state => ({ ...state, work_id: '' }),
      state => ({ ...state, protocol_version: '' }), state => ({ ...state, source_revision: '' }), state => ({ ...state, next_action: '' }),
      state => ({ ...state, lifecycle_state: 'UNKNOWN' }), state => ({ ...state, allowed_paths: [] }), state => ({ ...state, acceptance: [] }), state => ({ ...state, test_plan: [] }),
      state => ({ ...state, route: 'R9' }), state => ({ ...state, route: '' }), state => ({ ...state, route: 'R0', lifecycle_state: 'PLAN' }), state => ({ ...state, route: 'R0', lifecycle_state: 'EXECUTE' }),
      state => ({ ...state, risk: 'critical' }), state => ({ ...state, change_kind: 'unknown' }), state => ({ ...state, risk: 'medium', change_kind: 'migration' }),
      state => ({ ...state, source_plan: null }), state => ({ ...state, source_plan: { ...state.source_plan, br: '' } }), state => ({ ...state, source_plan: { ...state.source_plan, sr: '' } }),
      state => ({ ...state, source_plan: { ...state.source_plan, ac: '' } }), state => ({ ...state, source_plan: { ...state.source_plan, gaps: null } }), state => ({ ...state, source_plan: { ...state.source_plan, scope: '' } }),
      state => ({ ...state, source_plan: { ...state.source_plan, verification: '' } }), state => ({ ...state, source_plan: { ...state.source_plan, rollback_cleanup: '' } }),
      state => ({ ...state, acceptance_manifest: null }), state => ({ ...state, acceptance_manifest: { ...state.acceptance_manifest, id: '' } }), state => ({ ...state, acceptance_manifest: { ...state.acceptance_manifest, version: 0 } }),
      state => ({ ...state, acceptance_manifest: { ...state.acceptance_manifest, ac_ids: [] } }), state => ({ ...state, acceptance_manifest: { ...state.acceptance_manifest, source: '' } }),
      state => ({ ...state, acceptance_manifest: { ...state.acceptance_manifest, scope: '' } }), state => ({ ...state, acceptance_manifest: { ...state.acceptance_manifest, source_revision: 'old' } }),
      state => ({ ...state, acceptance_manifest: { ...state.acceptance_manifest, contracts: [] } }), state => ({ ...state, reviews: {} }), state => ({ ...state, verification: {} }),
      state => ({ ...state, evidence: {} }), state => ({ ...state, leases: {} }), state => ({ ...state, imports: {} }), state => ({ ...state, recovery_evidence: {} }), state => ({ ...state, review_generation_ledger: {} }),
      state => ({ ...state, review_generation: -1 }), state => ({ ...state, implementation_fingerprint: 'short' }), state => ({ ...state, sealed_revision: null }), state => ({ ...state, sealed_at: 'not-a-time' })
    ];
    for (const [index, mutate] of variants.entries()) expect(() => runtime.assertCheckpoint(mutate(checkpoint())), `variant ${index}`).toThrow();
  });

  test('ZOMBIES: zero/one/many transition boundaries stay closed (10k deterministic cases)', () => {
    const edges = Object.entries(runtime.transitions).flatMap(([from, tos]) => tos.map(to => ({ from, to })));
    fc.assert(fc.property(fc.constantFrom(...edges), ({ from, to }) => {
      const left = checkpoint({ lifecycle_state: from });
      const right = checkpoint({ lifecycle_state: to });
      expect(() => runtime.assertTransition(left, right)).not.toThrow();
      const wrong = checkpoint({ lifecycle_state: from === 'INTAKE' ? 'PLAN' : 'INTAKE' });
      expect(() => runtime.assertTransition(left, wrong)).toThrow();
    }), { seed: 20260816, numRuns: propertyRuns });
  });

  test('R0 is a closed read-only evidence route and cannot enter implementation or delivery state', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-r0-'));
    const intake = checkpoint({ route: 'R0', lifecycle_state: 'INTAKE', revision: 1, sealed_at: undefined, sealed_revision: undefined, implementation_fingerprint: undefined });
    const file = path.join(root, 'resume.json');
    fs.writeFileSync(file, JSON.stringify(intake));
    expect(runtime.beginTrace(file, { expectedRevision: 1, sourceRevision: intake.source_revision })).toMatchObject({ route: 'R0', lifecycle_state: 'TRACE', revision: 2 });
    const trace = JSON.parse(fs.readFileSync(file, 'utf8'));
    const plan = { ...trace, lifecycle_state: 'PLAN' };
    const execute = { ...trace, lifecycle_state: 'EXECUTE' };
    const verify = { ...trace, lifecycle_state: 'VERIFY', implementation_fingerprint: 'a'.repeat(64), sealed_revision: trace.revision, sealed_at: new Date().toISOString() };
    const delivery = { ...verify, lifecycle_state: 'DELIVERY' };
    for (const state of [plan, execute, verify, delivery]) expect(() => runtime.assertCheckpoint(state)).toThrow(/R0 evidence route is read-only/);
    const workSchema = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../schemas/work-checkpoint.v2.schema.json'), 'utf8'));
    const validateWork = new Ajv2020({ strict: false, allErrors: true, validateFormats: false }).compile(workSchema);
    expect(validateWork({ ...trace, route: 'R9' })).toBe(false);
    expect(() => runtime.assertCheckpoint({ ...trace, route: 'R9' })).toThrow(/closed route required/);
    expect(() => runtime.beginExecution(file, { expectedRevision: 2, sourceRevision: trace.source_revision, approval: { source_revision: trace.source_revision, pointer: 'WORK.md#approval' } })).toThrow(/begin execution requires plan/);
    expect(JSON.parse(fs.readFileSync(file, 'utf8'))).toMatchObject({ lifecycle_state: 'TRACE', revision: 2 });
  });

  test('execute:post preserves a sealed fingerprint for its own mutation gate without resolving repository scope', () => {
    const state = checkpoint({ lifecycle_state: 'EXECUTE', implementation_fingerprint: 'a'.repeat(64), sealed_at: undefined, sealed_revision: undefined });
    expect(runtime.validateGate(state, 'execute:post', { expectedRevision: state.revision, sourceRevision: state.source_revision })).toBe(true);
  });

  test('two concurrent writers are linearizable: exactly one CAS succeeds', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-cas-'));
    const { file, initial } = writeCheckpoint(dir);
    const result = await Promise.all([childBeginTrace(file, initial.source_revision), childBeginTrace(file, initial.source_revision)]);
    expect(result.filter(x => x.code === 0 && x.output === 'ok')).toHaveLength(1);
    expect(result.filter(x => x.code !== 0 && x.output === 'GATE_BLOCKED')).toHaveLength(1);
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    expect(saved.lifecycle_state).toBe('TRACE');
    expect(saved.revision).toBe(2);
  });
});

describe('strict critical protocol: schema/runtime differential fuzz', () => {
  const schema = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../schemas/evidence.v1.schema.json'), 'utf8'));
  const validate = new Ajv2020({ strict: false, allErrors: true, validateFormats: false }).compile(schema);

  test('structural class mutations are rejected by Ajv and runtime (10k deterministic cases)', () => {
    fc.assert(fc.property(fc.string().filter(value => !['Decision', 'Code', 'Static', 'Runtime', 'GAP'].includes(value)), badClass => {
      const evidence = { ...fixtures()['evidence.v1.schema.json'], class: badClass };
      expect(validate(evidence)).toBe(false);
      expect(() => runtime.validateEvidence([evidence], checkpoint({ evidence }))).toThrow();
    }), { seed: 20260817, numRuns: propertyRuns });
  });

  test('runtime-only evidence rule rejects a static receipt that claims Runtime closure', () => {
    const evidence = { ...fixtures()['evidence.v1.schema.json'], class: 'Static', closes_runtime: true };
    expect(validate(evidence)).toBe(false);
    expect(() => runtime.validateEvidence([evidence], checkpoint({ evidence: [evidence] }))).toThrow(/cannot close Runtime/);
  });

  test('evidence ZOMBIES paths distinguish Runtime closure from Code, Static and GAP', () => {
    const state = checkpoint();
    const base = fixtures()['evidence.v1.schema.json'];
    for (const evidenceClass of ['Decision', 'Code', 'Static', 'Runtime', 'GAP']) {
      const evidence = { ...base, id: `e-${evidenceClass}`, class: evidenceClass, closes_runtime: false };
      expect(() => runtime.validateEvidence([evidence], state)).not.toThrow();
    }
    const runtimeClosing = { ...base, id: 'runtime-closing', class: 'Runtime', closes_runtime: true, actor: 'manual-user' };
    expect(() => runtime.validateEvidence([runtimeClosing], state)).not.toThrow();
    for (const malformed of [
      { ...runtimeClosing, id: 'old', timestamp: '2000-01-01T00:00:00Z' },
      { ...runtimeClosing, id: 'missing-actor', actor: '' },
      { ...runtimeClosing, id: 'unsafe', pointer: 'token=secret' },
      { ...runtimeClosing, id: 'wrong-ac', ac_refs: ['AC-NOT-BOUND'] },
      { ...runtimeClosing, id: 'wrong-binding', source_revision: 'old' },
      { ...runtimeClosing, id: 'runtime-closing' }
    ]) expect(() => runtime.validateEvidence([runtimeClosing, malformed], state)).toThrow();
  });
});

describe('strict critical protocol: public-seam failure handling', () => {
  test('malformed JSON checkpoint fails closed without producing a replacement', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-json-'));
    const file = path.join(dir, 'resume.json');
    fs.writeFileSync(file, '{broken');
    expect(() => runtime.beginTrace(file, { expectedRevision: 1, sourceRevision: 'source' })).toThrow();
    expect(fs.readFileSync(file, 'utf8')).toBe('{broken');
  });

  test('existing public lock blocks a writer and preserves the checkpoint', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-lock-'));
    const { file, initial } = writeCheckpoint(dir);
    fs.mkdirSync(`${file}.lock`);
    expect(() => runtime.beginTrace(file, { expectedRevision: initial.revision, sourceRevision: initial.source_revision })).toThrow(/checkpoint lock unavailable/);
    expect(JSON.parse(fs.readFileSync(file, 'utf8')).revision).toBe(1);
  }, 15_000);
});

describe('strict critical protocol: previously uncovered public verbs', () => {
  test('retagging an unsealed execution and correction both preserve closed state rules', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-retag-'));
    const { file, initial } = writeCheckpoint(dir, 'EXECUTE');
    const nextManifest = { ...initial.acceptance_manifest, source_revision: 'retag-source' };
    fs.writeFileSync(file, JSON.stringify(initial));
    const retagged = runtime.retagUnsealedExecution(file, { expectedRevision: 1, sourceRevision: initial.source_revision, newSourceRevision: 'retag-source', sourcePlan: initial.source_plan, acceptanceManifest: nextManifest });
    expect(retagged.source_revision).toBe('retag-source');
    expect(retagged.question_candidates).toEqual([]);
    expect(retagged.review_generation_ledger).toEqual([]);
    const correctionFile = path.join(dir, 'correction.json');
    const verify = checkpoint({ lifecycle_state: 'VERIFY', revision: 3 });
    fs.writeFileSync(correctionFile, JSON.stringify(verify));
    const corrected = runtime.beginCorrection(correctionFile, { expectedRevision: verify.revision, sourceRevision: verify.source_revision, correction: { reason: 'test', pointer: 'WORK.md#test' } });
    expect(corrected.lifecycle_state).toBe('EXECUTE');
  });

  test('execution approval and frozen review packet contracts reject each independent public alternative', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-packet-contract-'));
    const { file, initial } = writeCheckpoint(dir, 'PLAN');
    expect(() => runtime.beginExecution(file, { expectedRevision: 1, sourceRevision: initial.source_revision, approval: { source_revision: initial.source_revision, pointer: 'token=unsafe' } })).toThrow(/sanitized pointer invalid/);
    const verify = checkpoint({ lifecycle_state: 'VERIFY', revision: 1 });
    const verifyFile = path.join(dir, 'verify.json'); fs.writeFileSync(verifyFile, JSON.stringify(verify));
    for (const packet of [
      null,
      { schema: 'Wrong/v2', status: 'frozen' },
      { schema: 'BlindReviewPacket/v2', status: 'draft' }
    ]) expect(() => runtime.freezeReviewPacket(verifyFile, packet, 1, verify.source_revision)).toThrow(/review packet invalid/);
    const incompleteContextPacket = {
      schema: 'BlindReviewPacket/v2', status: 'frozen', packet_id: 'incomplete-context', packet_version: 1, wave: 1,
      generation: 1, work_id: verify.work_id, source_revision: verify.source_revision, sealed_revision: verify.sealed_revision,
      implementation_fingerprint: verify.implementation_fingerprint, acceptance_manifest_id: verify.acceptance_manifest.id,
      acceptance_manifest_version: verify.acceptance_manifest.version, required_profile: { model: 'configured', reasoning: 'high' },
      review_scope: { paths: verify.fingerprint_paths, absence_assertions: {} }, profile_attestation_set: 'dispatch.json',
      acceptance: [], acceptance_trace: [], non_goals: []
    };
    expect(() => runtime.freezeReviewPacket(verifyFile, incompleteContextPacket, 1, verify.source_revision)).toThrow(/external context incomplete/);
    const dirty = { ...verify, reviews: [{}] }; fs.writeFileSync(verifyFile, JSON.stringify(dirty));
    expect(() => runtime.freezeReviewPacket(verifyFile, { schema: 'BlindReviewPacket/v2', status: 'frozen' }, 1, dirty.source_revision)).toThrow(/unreviewed verify/);
  });

  test('an explicit unsealed replan can expand only a safe frozen scope', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-scope-retag-'));
    const { file, initial } = writeCheckpoint(dir, 'EXECUTE');
    const manifest = { ...initial.acceptance_manifest, source_revision: 'scope-v2' };
    const expanded = runtime.retagUnsealedExecution(file, {
      expectedRevision: 1,
      sourceRevision: initial.source_revision,
      newSourceRevision: 'scope-v2',
      sourcePlan: initial.source_plan,
      acceptanceManifest: manifest,
      allowedPaths: ['src/**', 'package.json'],
      fingerprintPaths: ['src/**', 'package.json'],
      absenceAssertions: { 'retired/runtime': true }
    });
    expect(expanded.allowed_paths).toEqual(['src/**', 'package.json']);
    expect(expanded.fingerprint_paths).toEqual(['src/**', 'package.json']);
    expect(expanded.absence_assertions).toEqual({ 'retired/runtime': true });
    const unsafeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-unsafe-retag-'));
    const { file: unsafe } = writeCheckpoint(unsafeDir, 'EXECUTE');
    expect(() => runtime.retagUnsealedExecution(unsafe, {
      expectedRevision: 1,
      sourceRevision: initial.source_revision,
      newSourceRevision: 'scope-v2',
      sourcePlan: initial.source_plan,
      acceptanceManifest: manifest,
      allowedPaths: ['../escape'],
      fingerprintPaths: ['src/**']
    })).toThrow(/unsafe scope path/);
    expect(() => runtime.retagUnsealedExecution(unsafe, {
      expectedRevision: 1,
      sourceRevision: initial.source_revision,
      newSourceRevision: 'scope-v2',
      sourcePlan: initial.source_plan,
      acceptanceManifest: manifest,
      allowedPaths: [],
      fingerprintPaths: []
    })).toThrow(/unsealed execution scope missing/);
    expect(() => runtime.retagUnsealedExecution(unsafe, {
      expectedRevision: 1,
      sourceRevision: initial.source_revision,
      newSourceRevision: 'scope-v2',
      sourcePlan: initial.source_plan,
      acceptanceManifest: manifest,
      allowedPaths: [],
      fingerprintPaths: ['src/**']
    })).toThrow(/unsealed execution scope missing/);
    expect(() => runtime.retagUnsealedExecution(unsafe, {
      expectedRevision: 1,
      sourceRevision: initial.source_revision,
      newSourceRevision: 'scope-v2',
      sourcePlan: initial.source_plan,
      acceptanceManifest: manifest,
      allowedPaths: ['src/**'],
      fingerprintPaths: []
    })).toThrow(/unsealed execution scope missing/);
    expect(() => runtime.retagUnsealedExecution(unsafe, {
      expectedRevision: 1,
      sourceRevision: initial.source_revision,
      newSourceRevision: 'scope-v2',
      sourcePlan: initial.source_plan,
      acceptanceManifest: manifest,
      absenceAssertions: { '../outside': true }
    })).toThrow(/unsafe absence assertion/);
    const missingRevisionDir = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-missing-retag-revision-'));
    const { file: missingRevision, initial: missingInitial } = writeCheckpoint(missingRevisionDir, 'EXECUTE');
    expect(() => runtime.retagUnsealedExecution(missingRevision, {
      expectedRevision: 1,
      sourceRevision: missingInitial.source_revision,
      sourcePlan: missingInitial.source_plan,
      acceptanceManifest: missingInitial.acceptance_manifest
    })).toThrow(/new source revision missing/);
    const wrongStateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-retag-wrong-state-'));
    const { file: wrongState, initial: wrongInitial } = writeCheckpoint(wrongStateDir, 'INTAKE');
    expect(() => runtime.retagUnsealedExecution(wrongState, {
      expectedRevision: 1,
      sourceRevision: wrongInitial.source_revision,
      newSourceRevision: 'scope-v2',
      sourcePlan: wrongInitial.source_plan,
      acceptanceManifest: { ...wrongInitial.acceptance_manifest, source_revision: 'scope-v2' }
    })).toThrow(/clean execute state/);
  });

  test('CLI status is a non-mutating public seam', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-cli-'));
    const { file } = writeCheckpoint(dir);
    const output = require('child_process').execFileSync(process.execPath, [path.resolve(__dirname, '../../bin/runtime.cjs'), 'status', file], { encoding: 'utf8' });
    expect(JSON.parse(output)).toMatchObject({ lifecycle_state: 'INTAKE', revision: 1 });
  });

  test('in-process CLI dispatch covers status, checkpoint validation and unsupported commands', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-cli-dispatch-'));
    const { file } = writeCheckpoint(dir);
    const output = []; const original = console.log; console.log = value => output.push(value);
    try {
      runtime.runCli(['status', file]);
      runtime.runCli(['validate-checkpoint', file]);
      const previous = process.exitCode; process.exitCode = undefined;
      runtime.runCli(['unsupported']);
      expect(process.exitCode).toBe(2); process.exitCode = previous;
    } finally { console.log = original; }
    expect(JSON.parse(output[0])).toMatchObject({ lifecycle_state: 'INTAKE' });
    expect(output[1]).toBe('checkpoint: valid');
  });

  test('CLI validates gates and seals mutations through its public command surface', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-cli-gates-'));
    require('child_process').execFileSync('git', ['init', '-q'], { cwd: root });
    require('child_process').execFileSync('git', ['config', 'user.email', 'quality@test'], { cwd: root });
    require('child_process').execFileSync('git', ['config', 'user.name', 'quality'], { cwd: root });
    fs.writeFileSync(path.join(root, 'safe.txt'), 'safe');
    require('child_process').execFileSync('git', ['add', '.'], { cwd: root });
    require('child_process').execFileSync('git', ['commit', '-qm', 'base'], { cwd: root });
    const work = path.join(root, '.agent', 'work', 'quality'); fs.mkdirSync(work, { recursive: true });
    const file = path.join(work, 'resume.json');
    const state = checkpoint({ work_id: 'quality', lifecycle_state: 'EXECUTE', revision: 1, allowed_paths: ['safe.txt'], fingerprint_paths: ['safe.txt'], sealed_at: undefined, sealed_revision: undefined, implementation_fingerprint: undefined });
    fs.writeFileSync(file, JSON.stringify(state));
    const cli = path.resolve(__dirname, '../../bin/runtime.cjs');
    const sealedOutput = require('child_process').execFileSync(process.execPath, [cli, 'seal-mutation', file, '1', state.source_revision], { cwd: root, encoding: 'utf8' });
    JSON.parse(fs.readFileSync(file, 'utf8'));
    const validationOutput = require('child_process').execFileSync(process.execPath, [cli, 'validate-checkpoint', file], { cwd: root, encoding: 'utf8' });
    expect(JSON.parse(sealedOutput)).toMatchObject({ revision: 2, implementation_fingerprint: expect.any(String) });
    expect(validationOutput.trim()).toBe('checkpoint: valid');
  });

  test('a reused review packet generation is rejected before a second freeze', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-packet-reuse-'));
    const file = path.join(dir, 'resume.json');
    const initial = checkpoint({ lifecycle_state: 'VERIFY', revision: 1 });
    initial.review_generation = 1; initial.review_generation_ledger = [{ generation: 1, packet_id: 'p', packet_version: 1, wave: 1 }];
    fs.writeFileSync(file, JSON.stringify(initial));
    const packet = { schema: 'BlindReviewPacket/v2', packet_id: 'p', packet_version: 1, wave: 1, generation: 1, status: 'frozen', work_id: initial.work_id, source_revision: initial.source_revision, sealed_revision: initial.sealed_revision, implementation_fingerprint: initial.implementation_fingerprint, acceptance_manifest_id: initial.acceptance_manifest.id, acceptance_manifest_version: initial.acceptance_manifest.version, required_profile: { model: 'configured', reasoning: 'high' }, review_scope: { paths: initial.fingerprint_paths, absence_assertions: {} }, profile_attestation_set: 'dispatch.json' };
    packet.generation = 2;
    expect(() => runtime.freezeReviewPacket(file, packet, initial.revision, initial.source_revision)).toThrow(/prior review packet generation/);
  });
});
