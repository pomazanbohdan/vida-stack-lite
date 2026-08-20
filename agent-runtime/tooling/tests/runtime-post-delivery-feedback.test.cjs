'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const runtime = require('../../lib/runtime.cjs');
const scopeConvergence = require('../../lib/scope-convergence.cjs');
const { checkpoint, fixtures, now, projectRegistry } = require('./fixtures.cjs');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-feedback-'));
fs.mkdirSync(path.join(root, '.agent', 'work'), { recursive: true });
fs.mkdirSync(path.join(root, 'docs', 'tenants'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs', 'tenants', 'project-registry.v1.json'), JSON.stringify(projectRegistry));
function future() { return new Date(Date.now() + 1000).toISOString(); }
function binding(c) { return { work_id:c.work_id, source_revision:c.source_revision, sealed_revision:c.sealed_revision, implementation_fingerprint:c.implementation_fingerprint, acceptance_manifest_id:c.acceptance_manifest.id, acceptance_manifest_version:c.acceptance_manifest.version }; }
function deliveryState(overrides = {}) {
  const f=fixtures(), context=f['project-context.v1.schema.json'];
  return checkpoint({ protocol_version:'agent-development-runtime/v4', lifecycle_state:'DELIVERY', coordination:{schema:'CoordinationBinding/v1',work_id:'quality-tooling',thread_id:'thread-quality',ticket_id:'ticket-quality',generation:1,exclusive_resources:['file:runtime'],active_resources:['file:runtime'],blocked_resources:[]}, project_context:context, backlog_projection:f['backlog-projection.v1.schema.json'], user_testing_receipts:[], delivery_cycle_id:'cycle-1', verification_completed_at:now, delivery_receipt:null, runtime_receipt:null, ...overrides });
}
function save(value) { const file=path.join(root, `${value.work_id}-${Math.random().toString(16).slice(2)}.json`);fs.writeFileSync(file,JSON.stringify(value));return file; }
function delivery(c,decision='feedback') { const f=fixtures()['delivery-receipt.v2.schema.json'];return {...f,...binding(c),delivery_cycle_id:c.delivery_cycle_id,decision,timestamp:future(),sanitized_pointers:[`current-thread#${decision}`],deployment_manifest:{...f.deployment_manifest,...binding(c),delivery_cycle_id:c.delivery_cycle_id}}; }
function analysis(c,origin='delivery') { return {...c.feedback_analysis,status:'accepted',decision:'rework',summary:'The delivered behavior does not satisfy the reported acceptance path.',affected_ac_ids:['AC-QUALITY-1'],affected_files:['agent-runtime/lib/runtime.cjs'],evidence_pointers:['current-thread#feedback','logs/runtime.txt'],proposed_correction:'Apply the bounded correction and rerun the affected acceptance checks.',analyzed_by:'agent-quality-analyzer',analyzed_at:future(),scope:'local',origin}; }
function knowledge() { return fixtures()['platform-knowledge-context.v1.schema.json']; }
function authorization(c) { const context=knowledge();return { schema:'CorrectionAuthorization/v1',authorization_id:`correction-auth-${c.revision}`,work_id:c.work_id,source_revision:c.source_revision,delivery_cycle_id:c.delivery_cycle_id,origin:c.feedback_analysis.origin,source_receipt_id:c.feedback_analysis.source_receipt_id,feedback_analysis_id:c.feedback_analysis.analysis_id,decision:c.feedback_analysis.decision,scope:c.feedback_analysis.scope,affected_ac_ids:[...c.feedback_analysis.affected_ac_ids],affected_files:[...c.feedback_analysis.affected_files],platform_knowledge_context_id:context.context_id,platform_knowledge_digest:context.digest,disposition:'feedback_bounded_correction',actor:'agent-quality-analyzer',pointer:'current-thread#feedback-auth',created_at:future()}; }

describe('post-delivery feedback lifecycle', () => {
  test('delivery feedback opens a durable analysis, preserves the prior receipt and counts correction at beginCorrection', () => {
    const initial=deliveryState({correction_count:29,review_failure_count:7,review_failure_streak:2}), receipt=delivery(initial);initial.delivery_history=[{...receipt,history_kind:'delivery',history_recorded_at:now}];const file=save(initial);
    const returned=runtime.recordDeliveryReceipt(file,receipt,initial.revision,initial.source_revision);
    expect(returned).toMatchObject({lifecycle_state:'EXECUTE',delivery_receipt:null,delivery_feedback_receipt:receipt,feedback_analysis:{status:'open',origin:'delivery',decision:null},review_failure_streak:0,review_failure_count:7});
    const analyzed=runtime.recordDeliveryFeedbackAnalysis(file,analysis(returned),returned.revision,returned.source_revision);
    expect(analyzed.feedback_analysis).toMatchObject({status:'accepted',decision:'rework',affected_ac_ids:['AC-QUALITY-1']});
    const authorized=runtime.recordCorrectionAuthorization(file,{expectedRevision:analyzed.revision,sourceRevision:analyzed.source_revision,authorization:authorization(analyzed),platform_knowledge_context:knowledge()});
    expect(authorized).toMatchObject({correction_authorization:{schema:'CorrectionAuthorization/v1',disposition:'feedback_bounded_correction'},next_action:'Begin the authorized bounded correction.'});
    const corrected=runtime.beginAuthorizedCorrection(file,{expectedRevision:authorized.revision,sourceRevision:authorized.source_revision,correction:{reason:'bounded correction from human delivery feedback',pointer:'current-thread#feedback'}});
    expect(corrected).toMatchObject({lifecycle_state:'EXECUTE',correction_count:30,review_failure_streak:0,review_failure_count:7,feedback_analysis:null});
    expect(corrected.delivery_feedback_receipt).toBeNull();
    expect(corrected.user_testing_feedback_receipt).toBeNull();
    expect(corrected.feedback_consumption_history).toHaveLength(1);
    expect(corrected.feedback_consumption_history[0]).toMatchObject({
      schema:'FeedbackReceiptConsumption/v1', origin:'delivery', source_receipt_id:`delivery:${receipt.timestamp}`,
      feedback_analysis_id:corrected.correction_history[0].analysis_id, correction_id:'correction-30'
    });
    expect(runtime.blindArchitectDiagnosisRequired(corrected)).toBe(false);
    expect(corrected.correction_history).toHaveLength(1);
    expect(corrected.feedback_analysis_history).toHaveLength(1);
    expect(corrected.correction_authorization_history).toHaveLength(1);
    expect(corrected.platform_knowledge_context_history).toHaveLength(1);
    expect(corrected.platform_knowledge_context_history[0]).toMatchObject({
      context_id: knowledge().context_id,
      cycle_id: knowledge().cycle_id,
      digest: knowledge().digest,
      invalidated_by_revision: authorized.revision
    });
    expect(corrected.delivery_history).toHaveLength(1);
    expect(corrected.delivery_history[0]).toMatchObject({...receipt,history_kind:'delivery'});
  });

  test('feedback correction appends after an unrelated consumed history entry and reuses an active knowledge snapshot', () => {
    const prior={schema:'FeedbackReceiptConsumption/v1',consumption_id:'prior-testing-consumption',work_id:'prior-work',source_revision:'git:prior',delivery_cycle_id:'prior-cycle',origin:'testing',source_receipt_id:'testing:prior',feedback_analysis_id:'prior-analysis',authorization_id:null,correction_id:'prior-correction',pointer:'current-thread#prior',consumed_by:'runtime:test',consumed_at:future()};
    const initial=deliveryState({feedback_consumption_history:[prior]}),receipt=delivery(initial),file=save(initial);
    let current=runtime.recordDeliveryReceipt(file,receipt,initial.revision,initial.source_revision);
    current=runtime.recordDeliveryFeedbackAnalysis(file,analysis(current),current.revision,current.source_revision);
    current=runtime.recordPlatformKnowledgeContext(file,{expectedRevision:current.revision,sourceRevision:current.source_revision,context:knowledge()});
    current=runtime.recordCorrectionAuthorization(file,{expectedRevision:current.revision,sourceRevision:current.source_revision,authorization:authorization(current),platform_knowledge_context:knowledge()});
    const corrected=runtime.beginCorrection(file,{expectedRevision:current.revision,sourceRevision:current.source_revision,correction:{reason:'append after unrelated feedback history',pointer:'current-thread#feedback-history'}});
    expect(corrected.feedback_consumption_history).toHaveLength(2);
    expect(corrected.feedback_consumption_history.at(-1).source_receipt_id).toBe(`delivery:${receipt.timestamp}`);
  });

  test('testing feedback is retained separately and a blocking clarification must be answered before correction', () => {
    const f=fixtures(), started={...f['user-testing-receipt.v1.schema.json'],decision:'started',timestamp:now}, initial=deliveryState({review_failure_streak:2,user_testing_receipts:[started],testing_history:[{...started,history_kind:'user_testing',history_recorded_at:now}]}), file=save(initial);
    const approved={...delivery(initial,'approved'),deployment_manifest:{...delivery(initial,'approved').deployment_manifest}};
    let current=runtime.recordDeliveryReceipt(file,approved,initial.revision,initial.source_revision);
    current=runtime.recordRuntimeReceipt(file,{...f['runtime-receipt.v2.schema.json'],...binding(current),timestamp:future()},current.revision,current.source_revision);
    const feedback={...f['user-testing-receipt.v1.schema.json'],...binding(current),delivery_cycle_id:current.delivery_cycle_id,decision:'feedback',timestamp:future(),sanitized_pointers:['current-thread#testing-feedback']};
    current=runtime.recordUserTestingReceipt(file,feedback,current.revision,current.source_revision);
    expect(current).toMatchObject({lifecycle_state:'EXECUTE',user_testing_receipts:[],user_testing_feedback_receipt:feedback,feedback_analysis:{status:'open',origin:'testing'},review_failure_streak:0});
    current=runtime.recordDeliveryFeedbackAnalysis(file,{...analysis(current,'testing'),decision:'clarification'},current.revision,current.source_revision);
    const q={...f['question-candidate.v1.schema.json'],work_id:current.work_id,source_revision:current.source_revision,question_id:'Q-FEEDBACK-1'};
    current=runtime.recordQuestionCandidate(file,q,current.revision,current.source_revision);
    expect(()=>runtime.beginCorrection(file,{expectedRevision:current.revision,sourceRevision:current.source_revision,correction:{reason:'clarify feedback',pointer:'current-thread#testing-feedback'}})).toThrow(/blocking clarification/);
    current=runtime.recordHumanAnswer(file,{question_id:q.question_id,source_revision:current.source_revision,outcome:'decision',selected:['A'],quote:'Proceed with the bounded correction.',pointer:'current-thread#clarification',answered_at:future()},current.revision,current.source_revision);
    const corrected=runtime.beginCorrection(file,{expectedRevision:current.revision,sourceRevision:current.source_revision,correction:{reason:'apply clarified feedback',pointer:'current-thread#clarification'}});
    expect(corrected).toMatchObject({lifecycle_state:'EXECUTE',correction_count:1});
    expect(corrected.testing_history).toHaveLength(2);
    expect(corrected.testing_history.map(x=>x.history_kind)).toEqual(['user_testing','user_testing']);
    expect(corrected.testing_history.map(x=>x.decision)).toEqual(['started','feedback']);
  });

  test('bounded feedback cannot start correction without a fresh authorization', () => {
    const initial=deliveryState(), receipt=delivery(initial), file=save(initial);
    let current=runtime.recordDeliveryReceipt(file,receipt,initial.revision,initial.source_revision);
    current=runtime.recordDeliveryFeedbackAnalysis(file,analysis(current),current.revision,current.source_revision);
    let thrown;
    try {
      runtime.beginCorrection(file,{expectedRevision:current.revision,sourceRevision:current.source_revision,correction:{reason:'missing authorization',pointer:'WORK.md#feedback'}});
    } catch (error) { thrown=error; }
    expect(thrown?.code).toBe('GAP-CORRECTION-AUTHORIZATION-001');
    expect(thrown?.message).toMatch(/authorization required/);
  });

  test('persistent feedback retains the triage route instead of using bounded correction', () => {
    const scope={...fixtures()['implementation-scope.v1.schema.json'],scope_id:knowledge().scope_id};
    const initial=deliveryState({scope_contract:scope,scope_contract_digest:scopeConvergence.digest(scope),assurance_policy:{schema:'AssurancePolicy/v1',scope_triage:true,max_corrections_per_epoch:2},assurance_epoch:1,epoch_correction_count:0}), receipt=delivery(initial), file=save(initial);
    let current=runtime.recordDeliveryReceipt(file,receipt,initial.revision,initial.source_revision);
    current=runtime.recordDeliveryFeedbackAnalysis(file,{...analysis(current),scope:'persistent'},current.revision,current.source_revision);
    const auth={...authorization(current),scope:'persistent',disposition:'architect_required'};
    current=runtime.recordCorrectionAuthorization(file,{expectedRevision:current.revision,sourceRevision:current.source_revision,authorization:auth,platform_knowledge_context:knowledge()});
    expect(current.correction_authorization.disposition).toBe('architect_required');
    expect(()=>runtime.beginCorrection(file,{expectedRevision:current.revision,sourceRevision:current.source_revision,correction:{reason:'persistent correction',pointer:'WORK.md#persistent'}})).toThrow(/review set triage required/);
  });

  test('authorization is single-use and rejects replay', () => {
    const initial=deliveryState(), receipt=delivery(initial), file=save(initial);
    let current=runtime.recordDeliveryReceipt(file,receipt,initial.revision,initial.source_revision);
    current=runtime.recordDeliveryFeedbackAnalysis(file,analysis(current),current.revision,current.source_revision);
    const auth=authorization(current);
    current=runtime.recordCorrectionAuthorization(file,{expectedRevision:current.revision,sourceRevision:current.source_revision,authorization:auth,platform_knowledge_context:knowledge()});
    expect(()=>runtime.recordCorrectionAuthorization(file,{expectedRevision:current.revision,sourceRevision:current.source_revision,authorization:auth,platform_knowledge_context:knowledge()})).toThrow(/already recorded/);
  });

  test('reconciles a legacy consumed delivery pointer without reusing its authority', () => {
    const initial=deliveryState(), receipt=delivery(initial), file=save(initial);
    let opened=runtime.recordDeliveryReceipt(file,receipt,initial.revision,initial.source_revision);
    const accepted=runtime.recordDeliveryFeedbackAnalysis(file,analysis(opened),opened.revision,opened.source_revision);
    const legacy={...accepted,lifecycle_state:'VERIFY',sealed_at:initial.sealed_at,sealed_revision:initial.sealed_revision,implementation_fingerprint:initial.implementation_fingerprint,delivery_feedback_receipt:receipt,feedback_analysis:null,correction_authorization:null,review_packet:null,reviews:[],review_triage:null,verification:[],correction_history:[{correction_id:'correction-legacy-1',origin:'delivery',analysis_id:accepted.feedback_analysis.analysis_id,source_revision:accepted.source_revision,delivery_cycle_id:accepted.delivery_cycle_id}]};
    fs.writeFileSync(file,`${JSON.stringify(legacy)}\n`);
    const before={fingerprint:legacy.implementation_fingerprint,sealed_revision:legacy.sealed_revision,source_revision:legacy.source_revision};
    const reconciled=runtime.reconcileConsumedFeedback(file,{expectedRevision:legacy.revision,sourceRevision:legacy.source_revision,reason:'Retire the already-consumed delivery pointer before the next sealed review packet.',pointer:'current-thread#legacy-feedback-reconciliation',actor:'runtime:test',timestamp:future()});
    expect(reconciled.revision).toBe(legacy.revision+1);
    expect(reconciled.delivery_feedback_receipt).toBeNull();
    expect(reconciled.feedback_consumption_history).toHaveLength(1);
    expect(reconciled.feedback_consumption_history[0]).toMatchObject({origin:'delivery',source_receipt_id:`delivery:${receipt.timestamp}`,feedback_analysis_id:accepted.feedback_analysis.analysis_id,correction_id:'correction-legacy-1'});
    expect(reconciled).toMatchObject({implementation_fingerprint:before.fingerprint,sealed_revision:before.sealed_revision,source_revision:before.source_revision,next_action:'Freeze blind-review packet for sealed implementation.'});
  });

  test('rejects replay analysis against a consumed receipt with a typed GAP', () => {
    const initial=deliveryState(), receipt=delivery(initial), file=save(initial);
    let current=runtime.recordDeliveryReceipt(file,receipt,initial.revision,initial.source_revision);
    current=runtime.recordDeliveryFeedbackAnalysis(file,analysis(current),current.revision,current.source_revision);
    const auth=authorization(current);
    current=runtime.recordCorrectionAuthorization(file,{expectedRevision:current.revision,sourceRevision:current.source_revision,authorization:auth,platform_knowledge_context:knowledge()});
    const acceptedAnalysis=current.feedback_analysis;
    current=runtime.beginCorrection(file,{expectedRevision:current.revision,sourceRevision:current.source_revision,correction:{reason:'consume feedback',pointer:'current-thread#consume'}});
    const replay={...current,lifecycle_state:'EXECUTE',delivery_feedback_receipt:receipt,feedback_analysis:{...acceptedAnalysis,status:'open',decision:null}};
    fs.writeFileSync(file,`${JSON.stringify(replay)}\n`);
    expect(()=>runtime.recordDeliveryFeedbackAnalysis(file,analysis(replay),replay.revision,replay.source_revision)).toThrow(expect.objectContaining({code:'GAP-FEEDBACK-REPLAY-001'}));
  });

  test('does not reconcile an unproven stale feedback pointer', () => {
    const initial=deliveryState({lifecycle_state:'VERIFY',delivery_feedback_receipt:delivery(deliveryState()),feedback_analysis:null,correction_authorization:null}),file=save(initial);
    expect(()=>runtime.reconcileConsumedFeedback(file,{expectedRevision:initial.revision,sourceRevision:initial.source_revision,reason:'Unproven pointer',pointer:'current-thread#unproven',actor:'runtime:test',timestamp:future()})).toThrow(expect.objectContaining({code:'GAP-FEEDBACK-RECONCILIATION-001'}));
  });

  test('history invalidation preserves distinct receipts and deduplicates the exact same current receipt', () => {
    const current=deliveryState(),receipt=delivery(current),other={...receipt,timestamp:'2026-08-16T13:00:00.000Z',sanitized_pointers:['current-thread#older']};
    current.delivery_history=[{...other,history_kind:'delivery',history_recorded_at:now},{...receipt,history_kind:'delivery',history_recorded_at:now}];
    const file=save(current),returned=runtime.recordDeliveryReceipt(file,receipt,current.revision,current.source_revision);
    expect(returned.delivery_history).toHaveLength(2);
    expect(returned.delivery_history.map(x=>x.sanitized_pointers[0])).toEqual(['current-thread#older','current-thread#feedback']);
    expect(returned.delivery_history.every(x=>x.history_kind==='delivery')).toBe(true);
    const fresh=deliveryState(),freshReceipt=delivery(fresh),freshResult=runtime.recordDeliveryReceipt(save(fresh),freshReceipt,fresh.revision,fresh.source_revision);
    expect(freshResult.delivery_history).toHaveLength(1);
    expect(freshResult.delivery_history[0]).toMatchObject({...freshReceipt,history_kind:'delivery'});
    const unrelated=deliveryState(),unrelatedReceipt=delivery(unrelated),old={...unrelatedReceipt,timestamp:'2026-08-16T13:00:00.000Z',sanitized_pointers:['current-thread#unrelated']};
    unrelated.delivery_history=[{...old,history_kind:'delivery',history_recorded_at:now}];
    const unrelatedResult=runtime.recordDeliveryReceipt(save(unrelated),unrelatedReceipt,unrelated.revision,unrelated.source_revision);
    expect(unrelatedResult.delivery_history).toHaveLength(2);
  });

  test('delivery invalidation records existing authorization and knowledge history exactly once', () => {
    const f=fixtures(), context=f['platform-knowledge-context.v1.schema.json'];
    const activeAuthorization=f['correction-authorization.v1.schema.json'];
    const initial=deliveryState({
      platform_knowledge_required:true,
      platform_knowledge_context:context,
      platform_knowledge_cycle_id:context.cycle_id,
      correction_authorization:activeAuthorization,
      correction_authorization_history:[{ authorization_id:activeAuthorization.authorization_id }]
    });
    const receipt=delivery(initial), file=save(initial);
    const returned=runtime.recordDeliveryReceipt(file,receipt,initial.revision,initial.source_revision);
    expect(returned.correction_authorization).toBeNull();
    expect(returned.correction_authorization_history).toHaveLength(1);
    expect(returned.correction_authorization_history[0]).toMatchObject({ authorization_id: initial.correction_authorization.authorization_id });
    expect(returned.platform_knowledge_context).toBeNull();
    expect(returned.platform_knowledge_context_history).toHaveLength(1);
    expect(returned.platform_knowledge_context_history[0]).toMatchObject({ context_id: context.context_id, cycle_id: context.cycle_id, digest: context.digest });
  });

  test('legacy optional testing history fields normalize without invented entries', () => {
    const f=fixtures(), started={...f['user-testing-receipt.v1.schema.json'],decision:'started',timestamp:now};
    const missingReceipts=deliveryState({protocol_version:'agent-development-runtime/v3',testing_history:[{...started,history_kind:'user_testing',history_recorded_at:now}]});
    delete missingReceipts.user_testing_receipts;
    const firstReceipt=delivery(missingReceipts), first=runtime.recordDeliveryReceipt(save(missingReceipts),firstReceipt,missingReceipts.revision,missingReceipts.source_revision);
    expect(first.testing_history).toHaveLength(1);
    expect(first.testing_history[0]).toMatchObject({...started,history_kind:'user_testing'});

    const missingHistory=deliveryState({protocol_version:'agent-development-runtime/v3',user_testing_receipts:[started]});
    delete missingHistory.testing_history;
    const secondReceipt=delivery(missingHistory), second=runtime.recordDeliveryReceipt(save(missingHistory),secondReceipt,missingHistory.revision,missingHistory.source_revision);
    expect(second.testing_history).toHaveLength(1);
    expect(second.testing_history[0]).toMatchObject({...started,history_kind:'user_testing'});
  });
});
