'use strict';
const fs = require('fs');
const path = require('path');
const Ajv2020 = require('ajv/dist/2020').default;
const runtime = require('../../lib/runtime.cjs');
const { checkpoint, fixtures, projectRegistry } = require('./fixtures.cjs');

const schemaDir = path.resolve(__dirname, '../../schemas');
const canonical = fixtures();
const fixtureRoot = fs.mkdtempSync(path.join(require('os').tmpdir(), 'schema-parity-registry-'));
fs.mkdirSync(path.join(fixtureRoot, 'docs', 'tenants'), { recursive: true });
fs.writeFileSync(path.join(fixtureRoot, 'docs', 'tenants', 'project-registry.v1.json'), JSON.stringify(projectRegistry));
const ajv = new Ajv2020({ strict: false, allErrors: true, validateFormats: false });
const schemas = Object.fromEntries(fs.readdirSync(schemaDir).filter(name => name.endsWith('.schema.json')).map(name => [name, JSON.parse(fs.readFileSync(path.join(schemaDir, name), 'utf8'))]));
for (const [name, schema] of Object.entries(schemas)) ajv.addSchema(schema, name);

describe('Draft 2020-12 schema compilation and canonical fixtures', () => {
  for (const name of fs.readdirSync(schemaDir).filter(name => name.endsWith('.schema.json'))) {
    test(`${name} accepts its positive fixture and rejects its negative fixture`, () => {
      const validate = ajv.getSchema(name);
      const positive = canonical[name];
      expect(validate(positive), JSON.stringify(validate.errors)).toBe(true);
      const negative = { ...positive, schema: 'Wrong/schema' };
      expect(validate(negative)).toBe(false);
    });
  }
});

describe('shared runtime/schema parity', () => {
  test('checkpoint positive and negative fixtures agree with runtime assertion', () => {
    const validate = ajv.getSchema('work-checkpoint.v2.schema.json');
    const positive = checkpoint();
    expect(validate(positive)).toBe(true);
    expect(() => runtime.assertCheckpoint(positive)).not.toThrow();
    const negative = checkpoint({ revision: 0 });
    expect(validate(negative)).toBe(false);
    expect(() => runtime.assertCheckpoint(negative)).toThrow(/checkpoint schema\/revision/);
    const missingLedger = checkpoint();
    delete missingLedger.review_generation_ledger;
    expect(validate(missingLedger)).toBe(false);
    expect(() => runtime.assertCheckpoint(missingLedger)).toThrow(/checkpoint review_generation_ledger invalid/);
    const malformedLedger = checkpoint({ review_generation_ledger: [{ generation: 0, packet_id: '', packet_version: 0, wave: 0 }] });
    expect(validate(malformedLedger)).toBe(false);
    expect(() => runtime.assertCheckpoint(malformedLedger)).toThrow(/checkpoint review_generation_ledger entry invalid/);
    const validLedgerEntry = { generation: 1, packet_id: 'packet-1', packet_version: 1, wave: 1 };
    const invalidLedgerEntries = [
      null, 7,
      { ...validLedgerEntry, generation: undefined },
      { ...validLedgerEntry, generation: '1' },
      { ...validLedgerEntry, generation: 0 },
      { ...validLedgerEntry, packet_id: undefined },
      { ...validLedgerEntry, packet_id: 1 },
      { ...validLedgerEntry, packet_id: '   ' },
      { ...validLedgerEntry, packet_version: undefined },
      { ...validLedgerEntry, packet_version: '1' },
      { ...validLedgerEntry, packet_version: 0 },
      { ...validLedgerEntry, wave: undefined },
      { ...validLedgerEntry, wave: '1' },
      { ...validLedgerEntry, wave: 0 }
    ];
    for (const entry of invalidLedgerEntries) {
      const malformed = checkpoint({ review_generation_ledger: [entry] });
      expect(validate(malformed)).toBe(false);
      expect(() => runtime.assertCheckpoint(malformed)).toThrow(/checkpoint review_generation_ledger entry invalid/);
    }
    const missingQuestions = checkpoint();
    delete missingQuestions.question_candidates;
    expect(validate(missingQuestions)).toBe(false);
    expect(() => runtime.assertCheckpoint(missingQuestions)).toThrow(/checkpoint question_candidates invalid/);
  });

  test('Ponytail policy schema and runtime binding agree across v2/v4 compatibility', () => {
    const policyValidate = ajv.getSchema('ponytail-policy-decision.v1.schema.json');
    const positive = canonical['ponytail-policy-decision.v1.schema.json'];
    expect(policyValidate(positive), JSON.stringify(policyValidate.errors)).toBe(true);
    expect(() => runtime.ponytailPolicy.validateDecision(positive, { work_id: positive.work_id, mutation: true })).not.toThrow();
    const missing = { ...positive }; delete missing.decision_digest;
    expect(policyValidate(missing)).toBe(false);
    const tampered = { ...positive, decision_digest: '0'.repeat(64) };
    expect(policyValidate(tampered)).toBe(true);
    expect(() => runtime.ponytailPolicy.validateDecision(tampered)).toThrow(/digest invalid/);

    const v2WithoutPolicy = checkpoint();
    delete v2WithoutPolicy.implementation_policy;
    expect(ajv.getSchema('work-checkpoint.v2.schema.json')(v2WithoutPolicy)).toBe(true);
    expect(() => runtime.assertCheckpoint(v2WithoutPolicy)).not.toThrow();

    const base = checkpoint({
      protocol_version: 'agent-development-runtime/v4',
      coordination: { schema: 'CoordinationBinding/v1', work_id: checkpoint().work_id, thread_id: 'thread-v4', ticket_id: 'ticket-v4', generation: 1, exclusive_resources: ['file:agent-runtime/lib/runtime.cjs'], active_resources: ['file:agent-runtime/lib/runtime.cjs'], blocked_resources: [] },
      project_context: canonical['project-context.v1.schema.json'],
      backlog_projection: canonical['backlog-projection.v1.schema.json'],
      user_testing_receipts: []
    });
    expect(ajv.getSchema('work-checkpoint.v2.schema.json')(base)).toBe(true);
    expect(() => runtime.assertCheckpoint(base, fixtureRoot)).not.toThrow();
    const invalidV4Policy = { ...base, implementation_policy: { ...base.implementation_policy, work_id: 'other-work' } };
    expect(() => runtime.assertCheckpoint(invalidV4Policy, fixtureRoot)).toThrow(/v4 Ponytail policy binding invalid/);
    const missingV4Policy = { ...base }; delete missingV4Policy.implementation_policy;
    expect(ajv.getSchema('work-checkpoint.v2.schema.json')(missingV4Policy)).toBe(false);
    expect(() => runtime.assertCheckpoint(missingV4Policy, fixtureRoot)).toThrow(/v4 Ponytail policy binding required/);
  });

  test('evidence class mismatch is rejected by both contract layers', () => {
    const validate = ajv.getSchema('evidence.v1.schema.json');
    const evidence = { ...canonical['evidence.v1.schema.json'], class: 'Unknown' };
    expect(validate(evidence)).toBe(false);
    const state = checkpoint({ evidence: [evidence] });
    expect(() => runtime.validateEvidence(state.evidence, state)).toThrow(/typed evidence incomplete/);
  });

  test('DeliveryReceipt/v2 binding, cycle, manifest and closed properties agree across schema and runtime', () => {
    const validate = ajv.getSchema('delivery-receipt.v2.schema.json');
    const state = checkpoint({ lifecycle_state: 'DELIVERY', delivery_cycle_id: 'cycle-1', verification_completed_at: '2026-08-16T12:00:00.000Z' });
    const positive = canonical['delivery-receipt.v2.schema.json'];
    expect(validate(positive), JSON.stringify(validate.errors)).toBe(true);
    expect(() => runtime.validateDelivery(positive, state)).not.toThrow();
    for (const invalid of [
      { ...positive, delivery_cycle_id: undefined },
      { ...positive, source_revision: undefined },
      { ...positive, deployment_manifest: undefined },
      { ...positive, unknown: true },
      { ...positive, deployment_manifest: { ...positive.deployment_manifest, unknown: true } }
    ]) {
      expect(validate(invalid)).toBe(false);
      expect(() => runtime.validateDelivery(invalid, state)).toThrow();
    }
  });

  test('a checkpoint never accepts a manifest with omitted contracts', () => {
    const state = checkpoint({ acceptance_manifest: { ...checkpoint().acceptance_manifest, contracts: undefined } });
    expect(() => runtime.assertCheckpoint(state)).toThrow(/contract definitions missing/);
  });

  test('protocol v3 requires the dispatch reservation ledger and reservation schema is closed', () => {
    const checkpointSchema = ajv.getSchema('work-checkpoint.v2.schema.json');
    const v3 = checkpoint({ protocol_version: 'agent-development-runtime/v3', coordination: { schema:'CoordinationBinding/v1', work_id:checkpoint().work_id, thread_id:'thread', ticket_id:'ticket', generation:1, exclusive_resources:['file:a'], active_resources:['file:a'], blocked_resources:[] } });
    expect(checkpointSchema(v3), JSON.stringify(checkpointSchema.errors)).toBe(true);
    const missing = { ...v3 }; delete missing.review_dispatch_reservation_ledger;
    expect(checkpointSchema(missing)).toBe(false);
    expect(() => runtime.assertCheckpoint(missing)).toThrow(/reservation ledger/);
    const validate = ajv.getSchema('review-dispatch-reservation.v1.schema.json');
    const positive = canonical['review-dispatch-reservation.v1.schema.json'];
    expect(validate(positive), JSON.stringify(validate.errors)).toBe(true);
    for (const invalid of [{...positive,status:'cancelled'},{...positive,entries:positive.entries.slice(0,2)},{...positive,unknown:true}]) expect(validate(invalid)).toBe(false);
  });

  test('blind architect schemas and checkpoint counters remain closed and fail-safe', () => {
    const dispatchSchema = ajv.getSchema('architect-diagnostic-dispatch.v1.schema.json');
    const disqualificationSchema = ajv.getSchema('architect-dispatch-disqualification.v1.schema.json');
    const diagnosisSchema = ajv.getSchema('architecture-diagnosis.v1.schema.json');
    const checkpointSchema = ajv.getSchema('work-checkpoint.v2.schema.json');
    const dispatch = canonical['architect-diagnostic-dispatch.v1.schema.json'];
    const disqualification = canonical['architect-dispatch-disqualification.v1.schema.json'];
    const diagnosis = canonical['architecture-diagnosis.v1.schema.json'];
    expect(dispatchSchema(dispatch), JSON.stringify(dispatchSchema.errors)).toBe(true);
    expect(disqualificationSchema(disqualification), JSON.stringify(disqualificationSchema.errors)).toBe(true);
    expect(diagnosisSchema(diagnosis), JSON.stringify(diagnosisSchema.errors)).toBe(true);
    for (const invalid of [{...dispatch,requirement_pointers:['code:runtime.cjs']},{...dispatch,external_observation_pointers:['review:prior']},{...dispatch,requested_model:'gpt-5.6-terra'},{...dispatch,history_isolation:false}]) expect(dispatchSchema(invalid)).toBe(false);
    for (const invalid of [{...disqualification,reason:'unknown'},{...disqualification,evidence_pointer:''},{...disqualification,unknown:true}]) expect(disqualificationSchema(invalid)).toBe(false);
    for (const invalid of [{...diagnosis,outcome:'clean'},{...diagnosis,blind_context_asserted:false},{...diagnosis,profile_verification:{...diagnosis.profile_verification,verified_reasoning_effort:'low'}}]) expect(diagnosisSchema(invalid)).toBe(false);
    for (const field of ['review_failure_count','review_failure_streak','architect_diagnosis_count']) {
      const invalid = checkpoint({ [field]: -1 });
      expect(checkpointSchema(invalid)).toBe(false);
      expect(() => runtime.assertCheckpoint(invalid)).toThrow(/checkpoint/);
    }
  });
});
