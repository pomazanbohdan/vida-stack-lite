'use strict';
const fs=require('fs');
const os=require('os');
const path=require('path');
const runtime=require('../../lib/runtime.cjs');
const {checkpoint,fixtures,now}=require('./fixtures.cjs');

const root=fs.mkdtempSync(path.join(os.tmpdir(),'runtime-manifest-repair-'));
function save(value){const file=path.join(root,`${value.work_id}-${Math.random().toString(16).slice(2)}.json`);fs.writeFileSync(file,JSON.stringify(value));return file;}
function unsealedPlan(overrides={}){return checkpoint({lifecycle_state:'PLAN',sealed_revision:undefined,sealed_at:undefined,implementation_fingerprint:undefined,...overrides});}
function repair(c){return {...fixtures()['acceptance-manifest-repair.v1.schema.json'],work_id:c.work_id,source_revision:c.source_revision,manifest:{...c.acceptance_manifest,contracts:fixtures()['acceptance-manifest-repair.v1.schema.json'].manifest.contracts},timestamp:'2026-08-16T12:00:00.000Z'};}
function future(){return new Date(Date.now()+1000).toISOString();}
function binding(c){return {work_id:c.work_id,source_revision:c.source_revision,sealed_revision:c.sealed_revision,implementation_fingerprint:c.implementation_fingerprint,acceptance_manifest_id:c.acceptance_manifest.id,acceptance_manifest_version:c.acceptance_manifest.version};}
function deliveryState(){return checkpoint({protocol_version:'agent-development-runtime/v2',lifecycle_state:'DELIVERY',sealed_revision:9,sealed_at:now,implementation_fingerprint:'a'.repeat(64),delivery_cycle_id:'cycle-1',verification_completed_at:now});}
function delivery(c){const f=fixtures()['delivery-receipt.v2.schema.json'];return {...f,...binding(c),delivery_cycle_id:c.delivery_cycle_id,decision:'feedback',timestamp:future(),sanitized_pointers:['current-thread#feedback'],deployment_manifest:{...f.deployment_manifest,...binding(c),delivery_cycle_id:c.delivery_cycle_id}};}
function analysis(c){return {...c.feedback_analysis,status:'accepted',decision:'rework',summary:'The delivered behavior requires a bounded correction.',affected_ac_ids:['AC-QUALITY-1'],affected_files:['agent-runtime/lib/runtime.cjs'],evidence_pointers:['current-thread#feedback'],proposed_correction:'Apply the bounded correction.',analyzed_by:'runtime-test',analyzed_at:future(),scope:'local'};}

describe('typed acceptance manifest repair',()=>{
  test('repairs only missing contract definitions, increments revision, and preserves audit history',()=>{
    const c=unsealedPlan({acceptance_manifest:{...checkpoint().acceptance_manifest,contracts:undefined}}),file=save(c);
    expect(()=>runtime.assertCheckpoint(c)).toThrow(/contract definitions missing/);
    const repaired=runtime.repairAcceptanceManifest(file,{expectedRevision:c.revision,sourceRevision:c.source_revision,repair:repair(c)});
    expect(()=>runtime.assertCheckpoint(repaired)).not.toThrow();
    expect(repaired.revision).toBe(c.revision+1);
    expect(repaired.lifecycle_state).toBe('PLAN');
    expect(repaired.acceptance_manifest.contracts).toHaveLength(c.acceptance_manifest.ac_ids.length);
    expect(repaired.acceptance_manifest_repair_history).toHaveLength(1);
    expect(repaired.acceptance_manifest_repair_history[0]).toMatchObject({schema:'AcceptanceManifestRepair/v1',from_revision:c.revision,to_revision:c.revision+1});
  });

  test('typed repair initializes only the missing v3 reservation ledger on an unsealed plan',()=>{
    const c=unsealedPlan({protocol_version:'agent-development-runtime/v3',coordination:{schema:'CoordinationBinding/v1',work_id:checkpoint().work_id,thread_id:'thread',ticket_id:'ticket',generation:1,exclusive_resources:['file:a'],active_resources:[],blocked_resources:[]},acceptance_manifest:{...checkpoint().acceptance_manifest,contracts:undefined}});
    delete c.review_dispatch_reservation_ledger;
    expect(Object.hasOwn(c,'review_dispatch_reservation_ledger')).toBe(false);
    const file=save(c);
    expect(()=>runtime.assertCheckpoint({...c,acceptance_manifest:{...c.acceptance_manifest,contracts:repair(c).manifest.contracts}})).toThrow(/reservation ledger/);
    const repaired=runtime.repairAcceptanceManifest(file,{expectedRevision:c.revision,sourceRevision:c.source_revision,repair:repair(c)});
    expect(repaired.review_dispatch_reservation_ledger).toEqual([]);
    expect(repaired.acceptance_manifest.contracts).toHaveLength(c.acceptance_manifest.ac_ids.length);
    expect(()=>runtime.assertCheckpoint(repaired)).not.toThrow();
  });

  test('typed repair initializes a missing review generation before validating the repaired manifest',()=>{
    const c=unsealedPlan({protocol_version:'agent-development-runtime/v3',coordination:{schema:'CoordinationBinding/v1',work_id:checkpoint().work_id,thread_id:'thread',ticket_id:'ticket',generation:1,exclusive_resources:['file:a'],active_resources:[],blocked_resources:[]},acceptance_manifest:{...checkpoint().acceptance_manifest,contracts:undefined}});
    delete c.review_generation;
    const file=save(c);
    const repaired=runtime.repairAcceptanceManifest(file,{expectedRevision:c.revision,sourceRevision:c.source_revision,repair:repair(c)});
    expect(repaired.review_generation).toBe(0);
    expect(repaired.acceptance_manifest.contracts).toHaveLength(c.acceptance_manifest.ac_ids.length);
    expect(repaired.acceptance_manifest_repair_history[0].normalizations).toContain('initialize review_generation=0');
    expect(()=>runtime.assertCheckpoint(repaired)).not.toThrow();
  });

  test('rejects identity changes, sealed checkpoints, and stale compare-and-swap without rewriting',()=>{
    const base=unsealedPlan({acceptance_manifest:{...checkpoint().acceptance_manifest,contracts:undefined}}),file=save(base),before=fs.readFileSync(file,'utf8');
    expect(()=>runtime.repairAcceptanceManifest(file,{expectedRevision:base.revision,sourceRevision:base.source_revision,repair:{...repair(base),manifest:{...repair(base).manifest,id:'other-manifest'}}})).toThrow(/identity mismatch/);
    expect(()=>runtime.repairAcceptanceManifest(file,{expectedRevision:base.revision,sourceRevision:base.source_revision,repair:{...repair(base),manifest:{...repair(base).manifest,scope:'other-scope'}}})).toThrow(/identity mismatch/);
    expect(fs.readFileSync(file,'utf8')).toBe(before);
    expect(()=>runtime.repairAcceptanceManifest(file,{expectedRevision:base.revision-1,sourceRevision:base.source_revision,repair:repair(base)})).toThrow(/compare-and-swap/);
    expect(fs.readFileSync(file,'utf8')).toBe(before);
    const sealed=unsealedPlan({sealed_revision:9,sealed_at:'2026-08-16T12:00:00.000Z',implementation_fingerprint:'a'.repeat(64),acceptance_manifest:{...checkpoint().acceptance_manifest,contracts:undefined}}),sealedFile=save(sealed);
    expect(()=>runtime.repairAcceptanceManifest(sealedFile,{expectedRevision:sealed.revision,sourceRevision:sealed.source_revision,repair:repair(sealed)})).toThrow(/unsealed checkpoint/);
  });

  test('covers typed repair guards and feedback-analysis fail-closed boundaries',()=>{
    expect(()=>runtime.assertCheckpoint(checkpoint({feedback_analysis:{schema:'Wrong/v1'}}))).toThrow(/feedback analysis invalid/);
    expect(()=>runtime.assertCheckpoint(checkpoint({feedback_analysis_history:{}}))).toThrow(/feedback analysis history invalid/);
    expect(()=>runtime.assertCheckpoint(checkpoint({correction_count:-1}))).toThrow(/correction count invalid/);

    const base=unsealedPlan({acceptance_manifest:{...checkpoint().acceptance_manifest,contracts:undefined}}),file=save(base),validRepair=repair(base);
    expect(()=>runtime.repairAcceptanceManifest(file,{expectedRevision:base.revision,sourceRevision:base.source_revision,repair:{...validRepair,schema:'Wrong/v1'}})).toThrow(/repair input invalid/);
    expect(()=>runtime.repairAcceptanceManifest(file,{expectedRevision:base.revision,sourceRevision:base.source_revision,repair:{...validRepair,source_revision:'stale'}})).toThrow(/repair binding invalid/);
    expect(()=>runtime.repairAcceptanceManifest(file,{expectedRevision:base.revision,sourceRevision:base.source_revision,repair:{...validRepair,manifest:undefined}})).toThrow(/manifest missing/);
    expect(()=>runtime.repairAcceptanceManifest(file,{expectedRevision:base.revision,sourceRevision:base.source_revision,repair:{...validRepair,manifest:{...validRepair.manifest,source:''}}})).toThrow(/manifest (invalid|source)/);
    expect(()=>runtime.repairAcceptanceManifest(file,{expectedRevision:base.revision,sourceRevision:base.source_revision,repair:{...validRepair,manifest:{...validRepair.manifest,schema:'Wrong/v1'}}})).toThrow(/manifest invalid/);
    const verify=unsealedPlan({lifecycle_state:'VERIFY',acceptance_manifest:{...checkpoint().acceptance_manifest,contracts:undefined}}),verifyFile=save(verify);
    expect(()=>runtime.repairAcceptanceManifest(verifyFile,{expectedRevision:verify.revision,sourceRevision:verify.source_revision,repair:repair(verify)})).toThrow(/trace or plan/);
    const verifyV3=unsealedPlan({protocol_version:'agent-development-runtime/v3',lifecycle_state:'VERIFY',coordination:{schema:'CoordinationBinding/v1',work_id:checkpoint().work_id,thread_id:'thread',ticket_id:'ticket',generation:1,exclusive_resources:['file:a'],active_resources:[],blocked_resources:[]},acceptance_manifest:{...checkpoint().acceptance_manifest,contracts:undefined}}),verifyV3File=save(verifyV3);
    delete verifyV3.review_dispatch_reservation_ledger;
    expect(()=>runtime.repairAcceptanceManifest(verifyV3File,{expectedRevision:verifyV3.revision,sourceRevision:verifyV3.source_revision,repair:repair(verifyV3)})).toThrow();
    expect(()=>runtime.repairAcceptanceManifest(file,{expectedRevision:undefined,sourceRevision:base.source_revision,repair:validRepair})).toThrow(/expected revision/);

    const delivered=deliveryState(),deliveryFile=save(delivered),receipt=delivery(delivered);
    const current=runtime.recordDeliveryReceipt(deliveryFile,receipt,delivered.revision,delivered.source_revision);
    const validAnalysis=analysis(current);
    const attempt=(overrides)=>expect(()=>runtime.recordDeliveryFeedbackAnalysis(deliveryFile,{...validAnalysis,...overrides},current.revision,current.source_revision)).toThrow();
    attempt({schema:'Wrong/v1'});attempt({decision:'other'});attempt({source_receipt_id:'delivery:wrong'});attempt({work_id:'other-work'});attempt({affected_ac_ids:[]});attempt({affected_files:['../unsafe']});attempt({evidence_pointers:[]});attempt({scope:'global'});
    const deliveryStateFile=save(delivered);
    expect(()=>runtime.recordDeliveryFeedbackAnalysis(deliveryStateFile,validAnalysis,delivered.revision,delivered.source_revision)).toThrow(/requires execute/);
    const noAnalysis=unsealedPlan({lifecycle_state:'EXECUTE'}),noAnalysisFile=save(noAnalysis);
    expect(()=>runtime.recordDeliveryFeedbackAnalysis(noAnalysisFile,validAnalysis,noAnalysis.revision,noAnalysis.source_revision)).toThrow(/open delivery feedback analysis required/);
    const closedAnalysis=unsealedPlan({lifecycle_state:'EXECUTE',feedback_analysis:{...validAnalysis,status:'accepted'}}),closedAnalysisFile=save(closedAnalysis);
    expect(()=>runtime.recordDeliveryFeedbackAnalysis(closedAnalysisFile,validAnalysis,closedAnalysis.revision,closedAnalysis.source_revision)).toThrow(/open delivery feedback analysis required/);
    const feedbackWithoutAnalysis=unsealedPlan({lifecycle_state:'EXECUTE',delivery_feedback_receipt:receipt}),feedbackFile=save(feedbackWithoutAnalysis);
    expect(()=>runtime.beginCorrection(feedbackFile,{expectedRevision:feedbackWithoutAnalysis.revision,sourceRevision:feedbackWithoutAnalysis.source_revision,correction:{reason:'feedback guard',pointer:'WORK.md#feedback'}})).toThrow(/feedback analysis required/);
  });

  test('checkpoint feedback analysis and optional histories preserve every named field and decision',()=>{
    const canonical=fixtures()['delivery-feedback-analysis.v1.schema.json'];
    for(const decision of [null,'defect','clarification','rework'])expect(()=>runtime.assertCheckpoint(checkpoint({feedback_analysis:{...canonical,decision}}))).not.toThrow();
    expect(()=>runtime.assertCheckpoint(checkpoint({feedback_analysis:{...canonical,decision:'other'}}))).toThrow(/delivery feedback analysis invalid/);
    const requiredText={analysis_id:'feedback analysis id',work_id:'feedback analysis work id',source_revision:'feedback analysis source revision',delivery_cycle_id:'feedback analysis delivery cycle',source_receipt_id:'feedback source receipt',summary:'feedback summary',proposed_correction:'feedback correction',analyzed_by:'feedback analyst',analyzed_at:'feedback analysis timestamp'};
    for(const [field,message] of Object.entries(requiredText))expect(()=>runtime.assertCheckpoint(checkpoint({feedback_analysis:{...canonical,[field]:''}}))).toThrow(message);
    const optionalArrays={feedback_analysis_history:'checkpoint feedback analysis history invalid',correction_history:'checkpoint correction history invalid',delivery_history:'checkpoint delivery history invalid',testing_history:'checkpoint testing history invalid',acceptance_manifest_repair_history:'checkpoint acceptance manifest repair history invalid',architect_dispatch_ledger:'checkpoint architect dispatch ledger invalid',architect_dispatch_disqualification_history:'checkpoint architect dispatch disqualification history invalid',architecture_diagnosis_history:'checkpoint architecture diagnosis history invalid'};
    for(const [field,message] of Object.entries(optionalArrays))expect(()=>runtime.assertCheckpoint(checkpoint({[field]:{}}))).toThrow(message);
    const withoutOptionalCount=checkpoint();delete withoutOptionalCount.correction_count;expect(()=>runtime.assertCheckpoint(withoutOptionalCount)).not.toThrow();
  });
});
