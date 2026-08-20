'use strict';

const crypto=require('crypto');
const fs=require('fs');
const os=require('os');
const path=require('path');
const {execFileSync}=require('child_process');
const runtime=require('../../lib/runtime.cjs');
const {checkpoint}=require('./fixtures.cjs');

function now(){return new Date().toISOString();}
function repo(){const root=fs.mkdtempSync(path.join(os.tmpdir(),'runtime-blind-architect-'));execFileSync('git',['init','-q'],{cwd:root});execFileSync('git',['config','user.email','architect@example.test'],{cwd:root});execFileSync('git',['config','user.name','architect'],{cwd:root});fs.writeFileSync(path.join(root,'scope.txt'),'scope');execFileSync('git',['add','.'],{cwd:root});execFileSync('git',['commit','-qm','base'],{cwd:root});return root;}
function save(root,c){const dir=path.join(root,'.agent','work',c.work_id);fs.mkdirSync(dir,{recursive:true});const file=path.join(dir,'resume.json');fs.writeFileSync(file,JSON.stringify(c));return file;}
function binding(c){return {work_id:c.work_id,source_revision:c.source_revision,sealed_revision:c.sealed_revision,implementation_fingerprint:c.implementation_fingerprint,acceptance_manifest_id:c.acceptance_manifest.id,acceptance_manifest_version:c.acceptance_manifest.version};}
function packet(c,generation){return {schema:'BlindReviewPacket/v2',status:'frozen',packet_id:`packet-${generation}`,packet_version:generation,wave:generation,generation,...binding(c),required_profile:{model:'configured',reasoning:'high'},review_scope:{paths:['scope.txt'],absence_assertions:{}},profile_attestation_set:`dispatch-${generation}.json`};}
function dispatch(c,p){return {schema:'DispatchProfileAttestationSet/v1',...binding(c),packet_id:p.packet_id,packet_version:p.packet_version,wave:p.wave,orchestrator:'root',selector_source:'tests',requested_model:'configured',requested_reasoning_effort:'high',runtime_metadata_observed:false,issued_at:now(),root_task_id:'root-task',root_dispatch_id:`root-dispatch-${p.generation}`,entries:runtime.lenses.map((lens,index)=>({task_id:`task-${p.generation}-${index}`,dispatch_id:`dispatch-${p.generation}-${index}`,reviewer_id:`reviewer-${p.generation}-${index}`,lens,profile_verified:true,profile_verification:{verified_model:'configured',verified_reasoning_effort:'high',verification_source:'tests/profile',verification_pointer:`tests/profile-${p.generation}-${index}`,verified_at:now()}}))};}
function review(c,p,index,verdict){return {schema:'ReviewReceipt/v2',...binding(c),receipt_id:`review-${p.generation}-${index}`,reviewer_id:`reviewer-${p.generation}-${index}`,dispatch_task_id:`task-${p.generation}-${index}`,dispatch_id:`dispatch-${p.generation}-${index}`,lens:runtime.lenses[index],history_isolation:true,findings:verdict==='clean'?[]:['Externally observable acceptance mismatch.'],verdict,packet_id:p.packet_id,packet_version:p.packet_version,wave:p.wave};}
function reverse(c,p,index){return {schema:'ReverseValidationReceipt/v1',...binding(c),receipt_id:`reverse-${p.generation}-${index}`,reviewer_id:`reverse-reviewer-${p.generation}-${index}`,type:['trace_scope','technical_safety','evidence_truth'][index],verdict:'pass',validator:'tests',timestamp:now(),evidence:[`tests/reverse-${index}`],ac_refs:c.acceptance_manifest.ac_ids,packet_id:p.packet_id,packet_version:p.packet_version};}
function start(){const root=repo(),base=checkpoint({work_id:'blind-architect-cycle',revision:1,lifecycle_state:'EXECUTE',allowed_paths:['scope.txt'],fingerprint_paths:['scope.txt'],sealed_revision:undefined,sealed_at:undefined,implementation_fingerprint:undefined,review_generation:0,review_generation_ledger:[],reviews:[],verification:[]}),file=save(root,base);return {root,file,state:base};}
function seal(state,file,root){return runtime.sealMutation(file,state.revision,state.source_revision,root);}
function openReview(state,file,root){const p=packet(state,state.review_generation+1);let next=runtime.freezeReviewPacket(file,p,state.revision,state.source_revision);next=runtime.recordDispatchAttestationSet(file,dispatch(next,p),next.revision,next.source_revision,root);return {state:next,packet:p};}
function failCycle(state,file,root){const opened=openReview(state,file,root),failed=runtime.recordReviewReceipt(file,review(opened.state,opened.packet,0,'changes_required'),opened.state.revision,opened.state.source_revision,root),corrected=runtime.beginCorrection(file,{expectedRevision:failed.revision,sourceRevision:failed.source_revision,correction:{reason:'review acceptance mismatch',pointer:'WORK.md#correction'}});return {state:corrected,packet:opened.packet};}
function architectDispatch(c,id='1'){return {schema:'ArchitectDiagnosticDispatch/v1',...binding(c),dispatch_id:`architect-dispatch-${id}`,task_id:`architect-task-${id}`,handle_id:`architect-handle-${id}`,architect_id:`architect-${id}`,requested_model:'gpt-5.6-sol',requested_reasoning_effort:'high',history_isolation:true,requirement_pointers:['BR:current-request','SR:observable-behavior',`AC:${c.acceptance_manifest.ac_ids[0]}`],external_observation_pointers:['observation:acceptance-mismatch'],forbidden_context_asserted:true,reserved_at:now()};}
function dispatchDigest(d){return crypto.createHash('sha256').update(runtime.stable({requirement_pointers:d.requirement_pointers,external_observation_pointers:d.external_observation_pointers,requested_model:d.requested_model,requested_reasoning_effort:d.requested_reasoning_effort,history_isolation:d.history_isolation,forbidden_context_asserted:d.forbidden_context_asserted})).digest('hex');}
function diagnosis(c,d,outcome='defect_found'){return {schema:'ArchitectureDiagnosis/v1',...binding(c),diagnosis_id:`diagnosis-${d.dispatch_id}`,dispatch_id:d.dispatch_id,task_id:d.task_id,handle_id:d.handle_id,architect_id:d.architect_id,history_isolation:true,blind_context_asserted:true,profile_verified:true,profile_verification:{verified_model:'gpt-5.6-sol',verified_reasoning_effort:'high',verification_source:'tests/architect-profile',verification_pointer:'tests/architect-profile',verified_at:now()},outcome,affected_ac_ids:c.acceptance_manifest.ac_ids,root_cause_hypothesis:'The externally observable state transition conflicts with the current acceptance contract.',correction_direction:outcome==='defect_found'?'Correct the system transition without weakening acceptance.':'Continue independent verification; no architecture correction is indicated.',dispatch_digest:dispatchDigest(d),timestamp:now()};}
function disqualification(c,d,id='1',reason='history_isolation_failed'){return {schema:'ArchitectDispatchDisqualification/v1',...binding(c),disqualification_id:`architect-disqualification-${id}`,dispatch_id:d.dispatch_id,task_id:d.task_id,handle_id:d.handle_id,architect_id:d.architect_id,reason,evidence_pointer:`current-thread#architect-disqualification-${id}`,disqualified_by:'root',timestamp:now()};}
function exactBlocked(action,message){let error;try{action();}catch(caught){error=caught;}expect(error).toBeInstanceOf(Error);expect({message:error.message,code:error.code}).toEqual({message,code:'GATE_BLOCKED'});}
function verifyDispatchValidator(sealed,d){
  expect(runtime.validateArchitectDiagnosticDispatch(d,sealed)).toBe(d);
  const textFields={dispatch_id:'architect dispatch id',task_id:'architect task id',handle_id:'architect handle id',architect_id:'architect id',reserved_at:'architect dispatch timestamp'};
  for(const [field,message] of Object.entries(textFields))expect(()=>runtime.validateArchitectDiagnosticDispatch({...d,[field]:''},sealed)).toThrow(message);
  for(const bad of [null,[],['BR:one','BR:one'],['BR:one','code:runtime'],['BR:'],['prefixBR:one'],[1],['BR:one',1]])exactBlocked(()=>runtime.validateArchitectDiagnosticDispatch({...d,requirement_pointers:bad},sealed),'architect diagnostic dispatch invalid');
  for(const bad of [null,[],['runtime:one','runtime:one'],['runtime:one','review:prior'],['runtime:'],['prefixruntime:one'],[1],['runtime:one',1]])exactBlocked(()=>runtime.validateArchitectDiagnosticDispatch({...d,external_observation_pointers:bad},sealed),'architect diagnostic dispatch invalid');
  for(const pointer of ['BR:one','SR:one','AC:one'])expect(runtime.validateArchitectDiagnosticDispatch({...d,requirement_pointers:[pointer]},sealed)).toBeTruthy();
  for(const pointer of ['observation:one','runtime:one'])expect(runtime.validateArchitectDiagnosticDispatch({...d,external_observation_pointers:[pointer]},sealed)).toBeTruthy();
  exactBlocked(()=>runtime.validateArchitectDiagnosticDispatch({...d,schema:'ArchitectDiagnosticDispatch/v0'},sealed),'architect diagnostic dispatch invalid');
  for(const field of ['work_id','source_revision','acceptance_manifest_id'])expect(()=>runtime.validateArchitectDiagnosticDispatch({...d,[field]:'other'},sealed)).toThrow(/binding invalid/);
  for(const field of ['sealed_revision','implementation_fingerprint','acceptance_manifest_version'])expect(()=>runtime.validateArchitectDiagnosticDispatch({...d,[field]:field==='implementation_fingerprint'?'b'.repeat(64):99},sealed)).toThrow(/binding invalid/);
  exactBlocked(()=>runtime.validateArchitectDiagnosticDispatch({...d,reserved_at:'2000-01-01T00:00:00.000Z'},sealed),'architect dispatch timestamp predates required seal');
  const prior={...sealed,architect_dispatch_ledger:[{dispatch_id:d.dispatch_id,task_id:d.task_id,handle_id:d.handle_id,architect_id:d.architect_id}]};
  for(const field of ['dispatch_id','task_id','handle_id','architect_id'])expect(()=>runtime.validateArchitectDiagnosticDispatch({...architectDispatch(sealed,`fresh-${field}`),[field]:d[field]},prior)).toThrow(/identity reused/);
}
function verifyDisqualificationValidator(assigned,d,q){
  expect(runtime.validateArchitectDispatchDisqualification(q,assigned)).toBe(q);
  const boundary=checkpoint({sealed_revision:1,review_failure_streak:2}),boundaryDispatch=architectDispatch(boundary,'sealed-one'),boundaryState={...boundary,architect_diagnostic_dispatch:boundaryDispatch,architect_dispatch_ledger:[{dispatch_id:boundaryDispatch.dispatch_id,task_id:boundaryDispatch.task_id,handle_id:boundaryDispatch.handle_id,architect_id:boundaryDispatch.architect_id}]},boundaryReceipt=disqualification(boundaryState,boundaryDispatch,'sealed-one');
  expect(runtime.validateArchitectDispatchDisqualification(boundaryReceipt,boundaryState)).toBe(boundaryReceipt);
  for(const reason of ['history_isolation_failed','forbidden_context_exposed','profile_mismatch','dispatch_failed','cancelled'])expect(runtime.validateArchitectDispatchDisqualification({...q,reason},assigned)).toMatchObject({reason});
  exactBlocked(()=>runtime.validateArchitectDispatchDisqualification({...q,schema:'ArchitectDispatchDisqualification/v0'},assigned),'architect dispatch disqualification invalid');
  const textFields={work_id:'work id',source_revision:'source revision',acceptance_manifest_id:'manifest id',disqualification_id:'disqualification id',dispatch_id:'identity',task_id:'identity',handle_id:'identity',architect_id:'identity',evidence_pointer:'evidence',disqualified_by:'actor',timestamp:'timestamp'};
  for(const [field,message] of Object.entries(textFields))expect(()=>runtime.validateArchitectDispatchDisqualification({...q,[field]:''},assigned)).toThrow(new RegExp(message));
  for(const bad of [0,1.5])expect(()=>runtime.validateArchitectDispatchDisqualification({...q,sealed_revision:bad},assigned)).toThrow(/disqualification invalid/);
  for(const bad of [0,1.5])expect(()=>runtime.validateArchitectDispatchDisqualification({...q,acceptance_manifest_version:bad},assigned)).toThrow(/disqualification invalid/);
  for(const bad of [`b${'a'.repeat(64)}`,`${'a'.repeat(64)}b`])expect(()=>runtime.validateArchitectDispatchDisqualification({...q,implementation_fingerprint:bad},assigned)).toThrow(/disqualification invalid/);
  verifyDisqualificationBindings(assigned,q);
  for(const field of ['dispatch_id','task_id','handle_id','architect_id'])exactBlocked(()=>runtime.validateArchitectDispatchDisqualification({...q,[field]:`wrong-${field}`},assigned),'architect dispatch disqualification binding invalid');
  exactBlocked(()=>runtime.validateArchitectDispatchDisqualification({...q,evidence_pointer:'secret=forbidden'},assigned),'sanitized pointer invalid');
  exactBlocked(()=>runtime.validateArchitectDispatchDisqualification({...q,disqualified_by:'root\nother'},assigned),'architect dispatch disqualification actor unsafe');
  exactBlocked(()=>runtime.validateArchitectDispatchDisqualification({...q,timestamp:'2000-01-01T00:00:00.000Z'},assigned),'architect dispatch disqualification timestamp predates required seal');
}
function verifyDisqualificationBindings(assigned,q){
  for(const field of ['work_id','source_revision','sealed_revision','implementation_fingerprint','acceptance_manifest_id','acceptance_manifest_version']){
    const changed=field==='implementation_fingerprint'?'b'.repeat(64):['sealed_revision','acceptance_manifest_version'].includes(field)?99:'other';
    exactBlocked(()=>runtime.validateArchitectDispatchDisqualification({...q,[field]:changed},assigned),'architect dispatch disqualification binding invalid');
  }
}
function verifyDiagnosisValidator(assigned,d){
  const good=diagnosis(assigned,d);
  expect(runtime.validateArchitectureDiagnosis(good,assigned)).toBe(good);
  const textFields={diagnosis_id:'diagnosis id',dispatch_id:'diagnosis dispatch id',task_id:'diagnosis task id',handle_id:'diagnosis handle id',architect_id:'diagnosis architect id',root_cause_hypothesis:'root cause hypothesis',correction_direction:'correction direction',timestamp:'diagnosis timestamp'};
  for(const [field,message] of Object.entries(textFields))expect(()=>runtime.validateArchitectureDiagnosis({...good,[field]:''},assigned)).toThrow(new RegExp(message));
  for(const outcome of ['defect_found','no_architectural_defect_found'])expect(runtime.validateArchitectureDiagnosis({...good,outcome},assigned)).toMatchObject({outcome});
  exactBlocked(()=>runtime.validateArchitectureDiagnosis({...good,schema:'ArchitectureDiagnosis/v0'},assigned),'architecture diagnosis invalid');
  exactBlocked(()=>runtime.validateArchitectureDiagnosis({...good,history_isolation:false},assigned),'architecture diagnosis invalid');
  exactBlocked(()=>runtime.validateArchitectureDiagnosis({...good,profile_verification:{...good.profile_verification,verified_reasoning_effort:'max'}},assigned),'architecture diagnosis profile mismatch');
  for(const field of ['work_id','source_revision','sealed_revision','implementation_fingerprint','acceptance_manifest_id','acceptance_manifest_version']){
    const changed=field==='implementation_fingerprint'?'b'.repeat(64):field.includes('revision')||field.includes('version')?99:'other';
    exactBlocked(()=>runtime.validateArchitectureDiagnosis({...good,[field]:changed},assigned),'architecture diagnosis binding invalid');
  }
  for(const field of ['dispatch_id','task_id','handle_id','architect_id'])exactBlocked(()=>runtime.validateArchitectureDiagnosis({...good,[field]:`wrong-${field}`},assigned),'architecture diagnosis dispatch binding invalid');
  for(const bad of [`b${'a'.repeat(64)}`,`${'a'.repeat(64)}b`])expect(()=>runtime.validateArchitectureDiagnosis({...good,dispatch_digest:bad},assigned)).toThrow(/diagnosis invalid/);
  for(const field of ['verification_source','verification_pointer','verified_at'])expect(()=>runtime.validateArchitectureDiagnosis({...good,profile_verification:{...good.profile_verification,[field]:''}},assigned)).toThrow(/profile/);
  expect(()=>runtime.validateArchitectureDiagnosis({...good,profile_verification:{...good.profile_verification,verification_pointer:'secret=forbidden'}},assigned)).toThrow(/pointer invalid/);
  expect(()=>runtime.validateArchitectureDiagnosis({...good,profile_verification:{...good.profile_verification,verified_at:'2000-01-01T00:00:00.000Z'}},assigned)).toThrow(/predates required seal/);
  expect(()=>runtime.validateArchitectureDiagnosis({...good,affected_ac_ids:['AC-QUALITY-1','AC-QUALITY-1']},assigned)).toThrow(/AC refs invalid/);
  exactBlocked(()=>runtime.validateArchitectureDiagnosis({...good,affected_ac_ids:['AC-QUALITY-1','AC-OUTSIDE']},assigned),'architecture diagnosis AC refs invalid');
  exactBlocked(()=>runtime.validateArchitectureDiagnosis({...good,timestamp:'2000-01-01T00:00:00.000Z'},assigned),'architecture diagnosis timestamp predates required seal');
  exactBlocked(()=>runtime.validateArchitectureDiagnosis({...good,profile_verification:{...good.profile_verification,verification_source:'secret=forbidden'}},assigned),'sanitized pointer invalid');
  exactBlocked(()=>runtime.validateArchitectureDiagnosis({...good,profile_verification:{...good.profile_verification,verified_at:'2000-01-01T00:00:00.000Z'}},assigned),'architecture diagnosis profile timestamp predates required seal');
}

describe('repeating blind architect diagnosis cycle',()=>{
  test('two failed review cycles trigger one requirements-only architect, then require three fresh reviews before delivery',()=>{
    const {root,file,state}=start();
    const first=failCycle(seal(state,file,root),file,root).state;
    expect(first).toMatchObject({lifecycle_state:'EXECUTE',correction_count:1,review_failure_count:1,review_failure_streak:1});
    const second=failCycle(seal(first,file,root),file,root).state;
    expect(second).toMatchObject({lifecycle_state:'EXECUTE',correction_count:2,review_failure_count:2,review_failure_streak:2});
    const architectSeal=seal(second,file,root);
    expect(runtime.blindArchitectDiagnosisRequired(architectSeal)).toBe(true);
    expect(architectSeal.next_action).toMatch(/fresh blind gpt-5\.6-sol\/high architect/);
    expect(()=>runtime.freezeReviewPacket(file,packet(architectSeal,architectSeal.review_generation+1),architectSeal.revision,architectSeal.source_revision)).toThrow(/architect diagnosis required/);
    const d=architectDispatch(architectSeal),assigned=runtime.recordArchitectDiagnosticDispatch(file,d,architectSeal.revision,architectSeal.source_revision);
    const diagnosed=runtime.recordArchitectureDiagnosis(file,diagnosis(assigned,d),assigned.revision,assigned.source_revision);
    expect(diagnosed).toMatchObject({architect_diagnosis_count:1,review_failure_streak:2,architecture_diagnosis:{outcome:'defect_found'}});
    expect(()=>runtime.freezeReviewPacket(file,packet(diagnosed,diagnosed.review_generation+1),diagnosed.revision,diagnosed.source_revision)).toThrow(/architect-directed correction/);
    expect(()=>runtime.beginCorrection(file,{expectedRevision:diagnosed.revision,sourceRevision:diagnosed.source_revision,correction:{reason:'architect direction',pointer:'WORK.md#architect-correction',implementer_id:'architect-1',approved_by:'owner'}})).toThrow(/architect-separated/);
    const corrected=runtime.beginCorrection(file,{expectedRevision:diagnosed.revision,sourceRevision:diagnosed.source_revision,correction:{reason:'architect direction',pointer:'WORK.md#architect-correction',implementer_id:'executor-1',approved_by:'owner'}});
    expect(corrected).toMatchObject({lifecycle_state:'EXECUTE',correction_count:3,review_failure_count:2,review_failure_streak:0,architecture_diagnosis:null});
    let next=seal(corrected,file,root),opened=openReview(next,file,root);next=opened.state;
    expect(opened.packet.generation).toBe(3);
    expect(()=>runtime.advanceToDelivery(file,{expectedRevision:next.revision,sourceRevision:next.source_revision,root})).toThrow(/exactly three review receipts/);
    for(let index=0;index<3;index++)next=runtime.recordReviewReceipt(file,review(next,opened.packet,index,'clean'),next.revision,next.source_revision,root);
    for(let index=0;index<3;index++)next=runtime.recordReverseValidationReceipt(file,reverse(next,opened.packet,index),next.revision,next.source_revision,root);
    expect(runtime.advanceToDelivery(file,{expectedRevision:next.revision,sourceRevision:next.source_revision,root}).lifecycle_state).toBe('DELIVERY');
  });

  test('a no-defect architecture diagnosis resets the streak but never replaces the next three-review cycle',()=>{
    const {root,file,state}=start();let next=seal(state,file,root);next={...next,review_failure_count:2,review_failure_streak:2};fs.writeFileSync(file,JSON.stringify(next));const d=architectDispatch(next,'no-defect'),assigned=runtime.recordArchitectDiagnosticDispatch(file,d,next.revision,next.source_revision),diagnosed=runtime.recordArchitectureDiagnosis(file,diagnosis(assigned,d,'no_architectural_defect_found'),assigned.revision,assigned.source_revision);expect(diagnosed.review_failure_streak).toBe(0);const opened=openReview(diagnosed,file,root);expect(opened.state.reviews).toEqual([]);expect(()=>runtime.advanceToDelivery(file,{expectedRevision:opened.state.revision,sourceRevision:opened.state.source_revision,root})).toThrow(/exactly three review receipts/);
  });

  test('dispatch fails closed for code/review context, wrong profile, history reuse and stale diagnosis binding',()=>{
    const {root,file,state}=start();let next=seal(state,file,root);next={...next,review_failure_count:2,review_failure_streak:2};fs.writeFileSync(file,JSON.stringify(next));const base=architectDispatch(next);
    expect(()=>runtime.recordArchitectureDiagnosis(file,{},next.revision,next.source_revision)).toThrow(/assigned blind architect/);
    for(const bad of [null,{...base,requirement_pointers:['code:runtime.cjs']},{...base,external_observation_pointers:['review:prior-finding']},{...base,requested_model:'gpt-5.6-terra'},{...base,requested_reasoning_effort:'max'},{...base,requested_reasoning_effort:'xhigh'},{...base,history_isolation:false},{...base,forbidden_context_asserted:false}])expect(()=>runtime.recordArchitectDiagnosticDispatch(file,bad,next.revision,next.source_revision)).toThrow(/dispatch/);
    const assigned=runtime.recordArchitectDiagnosticDispatch(file,base,next.revision,next.source_revision),good=diagnosis(assigned,base);
    expect(()=>runtime.recordArchitectDiagnosticDispatch(file,base,assigned.revision,assigned.source_revision)).toThrow(/pending blind escalation/);
    for(const bad of [null,{...good,dispatch_digest:'0'.repeat(64)},{...good,profile_verified:false},{...good,profile_verification:null},{...good,profile_verification:{...good.profile_verification,verified_model:'gpt-5.6-terra'}},{...good,blind_context_asserted:false},{...good,affected_ac_ids:[]},{...good,affected_ac_ids:['AC-OTHER']}])expect(()=>runtime.recordArchitectureDiagnosis(file,bad,assigned.revision,assigned.source_revision)).toThrow(/diagnosis/);
    const diagnosed=runtime.recordArchitectureDiagnosis(file,good,assigned.revision,assigned.source_revision),corrected=runtime.beginCorrection(file,{expectedRevision:diagnosed.revision,sourceRevision:diagnosed.source_revision,correction:{reason:'architect direction',pointer:'WORK.md#architect-correction',implementer_id:'executor-1',approved_by:'owner'}}),resealed=seal(corrected,file,root),pending={...resealed,review_failure_streak:2};fs.writeFileSync(file,JSON.stringify(pending));const fresh=architectDispatch(pending,'fresh'),reused={...fresh,dispatch_id:base.dispatch_id,task_id:base.task_id,handle_id:base.handle_id,architect_id:base.architect_id};expect(()=>runtime.recordArchitectDiagnosticDispatch(file,reused,pending.revision,pending.source_revision)).toThrow(/identity reused/);
  });

  test('an invalid architect handle is audibly disqualified before one fresh unique dispatch can diagnose',()=>{
    const {root,file,state}=start();let next=seal(state,file,root);next={...next,review_failure_count:2,review_failure_streak:2};fs.writeFileSync(file,JSON.stringify(next));
    const invalidDispatch=architectDispatch(next,'invalid'),assigned=runtime.recordArchitectDiagnosticDispatch(file,invalidDispatch,next.revision,next.source_revision),receipt=disqualification(assigned,invalidDispatch,'invalid');
    const before=fs.readFileSync(file,'utf8');
    expect(()=>runtime.disqualifyArchitectDiagnosticDispatch(file,null,assigned.revision,assigned.source_revision)).toThrow(/disqualification invalid/);
    for(const bad of [{...receipt,reason:'unknown'},{...receipt,evidence_pointer:'secret=forbidden'},{...receipt,disqualified_by:'root\nother'}])expect(()=>runtime.disqualifyArchitectDiagnosticDispatch(file,bad,assigned.revision,assigned.source_revision)).toThrow(/invalid|unsafe/);
    expect(fs.readFileSync(file,'utf8')).toBe(before);
    expect(()=>runtime.disqualifyArchitectDiagnosticDispatch(file,{...receipt,dispatch_id:'other-dispatch'},assigned.revision,assigned.source_revision)).toThrow(/binding invalid/);
    const retired=runtime.disqualifyArchitectDiagnosticDispatch(file,receipt,assigned.revision,assigned.source_revision);
    expect(retired).toMatchObject({architect_diagnostic_dispatch:null,review_failure_streak:2,next_action:'Reserve one new unique history-isolated blind architect dispatch.'});
    expect(retired.architect_dispatch_disqualification_history).toEqual([receipt]);
    expect(()=>runtime.disqualifyArchitectDiagnosticDispatch(file,receipt,retired.revision,retired.source_revision)).toThrow(/active pending dispatch/);
    expect(()=>runtime.recordArchitectureDiagnosis(file,diagnosis(retired,invalidDispatch),retired.revision,retired.source_revision)).toThrow(/assigned blind architect/);
    expect(()=>runtime.recordArchitectDiagnosticDispatch(file,invalidDispatch,retired.revision,retired.source_revision)).toThrow(/identity reused/);
    const freshDispatch=architectDispatch(retired,'replacement'),freshAssigned=runtime.recordArchitectDiagnosticDispatch(file,freshDispatch,retired.revision,retired.source_revision);
    expect(()=>runtime.disqualifyArchitectDiagnosticDispatch(file,{...disqualification(freshAssigned,freshDispatch,'duplicate'),disqualification_id:receipt.disqualification_id},freshAssigned.revision,freshAssigned.source_revision)).toThrow(/disqualification duplicate/);
    const diagnosed=runtime.recordArchitectureDiagnosis(file,diagnosis(freshAssigned,freshDispatch,'no_architectural_defect_found'),freshAssigned.revision,freshAssigned.source_revision);
    expect(diagnosed).toMatchObject({architect_diagnosis_count:1,review_failure_streak:0,architecture_diagnosis:{dispatch_id:freshDispatch.dispatch_id,outcome:'no_architectural_defect_found'}});
    expect(diagnosed.architect_dispatch_ledger).toHaveLength(2);
    expect(diagnosed.architect_dispatch_disqualification_history).toEqual([receipt]);
  });

  test('checkpoint validation rejects malformed architect ledgers and orphan active dispatches',()=>{
    const base=checkpoint({architect_dispatch_ledger:[null]});expect(()=>runtime.assertCheckpoint(base)).toThrow(/ledger entry/);
    const active=architectDispatch(checkpoint({review_failure_streak:2}));expect(()=>runtime.assertCheckpoint(checkpoint({review_failure_streak:2,architect_diagnostic_dispatch:active,architect_dispatch_ledger:[]}))).toThrow(/ledger binding/);
    expect(()=>runtime.assertCheckpoint(checkpoint({architect_dispatch_disqualification_history:[null]}))).toThrow(/disqualification invalid/);
    const retired=disqualification(checkpoint(),active);expect(()=>runtime.assertCheckpoint(checkpoint({architect_dispatch_disqualification_history:[retired]}))).toThrow(/disqualification ledger binding/);
    expect(()=>runtime.assertCheckpoint(checkpoint({architect_dispatch_ledger:[active],architect_dispatch_disqualification_history:[retired,{...retired}]}))).toThrow(/disqualification duplicate/);
    for(const field of ['dispatch_id','task_id','handle_id','architect_id'])expect(()=>runtime.assertCheckpoint(checkpoint({architect_dispatch_ledger:[{...active,[field]:field==='dispatch_id'?1:''}]}))).toThrow(/ledger entry/);
    for(const field of ['dispatch_id','task_id','handle_id','architect_id'])expect(()=>runtime.assertCheckpoint(checkpoint({architect_dispatch_ledger:[{...active,[field]:'   '}]}))).toThrow(/ledger entry/);
    const bound=checkpoint({review_failure_streak:2}),dispatch=architectDispatch(bound,'persisted'),entry={dispatch_id:dispatch.dispatch_id,task_id:dispatch.task_id,handle_id:dispatch.handle_id,architect_id:dispatch.architect_id};
    exactBlocked(()=>runtime.assertCheckpoint({...bound,architect_diagnostic_dispatch:{...dispatch,work_id:'other'},architect_dispatch_ledger:[entry]}),'architect diagnostic dispatch binding invalid');
    const diagnosed=diagnosis({...bound,architect_diagnostic_dispatch:dispatch},dispatch);
    exactBlocked(()=>runtime.assertCheckpoint({...bound,architect_diagnostic_dispatch:dispatch,architect_dispatch_ledger:[entry],architecture_diagnosis:{...diagnosed,dispatch_digest:'0'.repeat(64)}}),'architecture diagnosis dispatch binding invalid');
    const withoutLedger=checkpoint({review_failure_streak:2});delete withoutLedger.architect_dispatch_ledger;expect(runtime.validateArchitectDiagnosticDispatch(architectDispatch(withoutLedger,'no-ledger'),withoutLedger)).toBeTruthy();
    const validRetired=disqualification(bound,dispatch,'persisted'),persisted={...bound,architect_dispatch_ledger:[entry],architect_dispatch_disqualification_history:[validRetired]};
    exactBlocked(()=>runtime.assertCheckpoint({...persisted,architect_dispatch_disqualification_history:[{...validRetired,evidence_pointer:'secret=forbidden'}]}),'sanitized pointer invalid');
    exactBlocked(()=>runtime.assertCheckpoint({...persisted,architect_dispatch_disqualification_history:[{...validRetired,disqualified_by:'root\nother'}]}),'architect dispatch disqualification actor unsafe');
    exactBlocked(()=>runtime.assertCheckpoint({...persisted,architect_dispatch_disqualification_history:[{...validRetired,timestamp:'not-time'}]}),'architect dispatch disqualification timestamp invalid');
  });

  test('legacy checkpoint without an architect ledger normalizes to exactly one fresh dispatch identity',()=>{
    const {root,file,state}=start();let sealed=seal(state,file,root);sealed={...sealed,review_failure_count:2,review_failure_streak:2};delete sealed.architect_dispatch_ledger;fs.writeFileSync(file,JSON.stringify(sealed));
    const d=architectDispatch(sealed,'legacy-ledger'),assigned=runtime.recordArchitectDiagnosticDispatch(file,d,sealed.revision,sealed.source_revision);
    expect(assigned.architect_dispatch_ledger).toEqual([{dispatch_id:d.dispatch_id,task_id:d.task_id,handle_id:d.handle_id,architect_id:d.architect_id}]);
  });

  test('architect dispatch, disqualification and diagnosis validators preserve every binding and identity boundary',()=>{
    const {root,file,state}=start();let sealed=seal(state,file,root);sealed={...sealed,review_failure_count:2,review_failure_streak:2};fs.writeFileSync(file,JSON.stringify(sealed));
    const d=architectDispatch(sealed,'matrix');
    verifyDispatchValidator(sealed,d);
    const assigned=runtime.recordArchitectDiagnosticDispatch(file,d,sealed.revision,sealed.source_revision),q=disqualification(assigned,d,'matrix');
    verifyDisqualificationValidator(assigned,d,q);
    verifyDiagnosisValidator(assigned,d);
    const legacy=checkpoint();delete legacy.architect_dispatch_disqualification_history;expect(()=>runtime.assertCheckpoint(legacy)).not.toThrow();
  });
});
