'use strict';

const fs=require('fs');
const os=require('os');
const path=require('path');
const runtime=require('../../lib/runtime.cjs');
const {checkpoint,fixtures}=require('./fixtures.cjs');

function clone(value){return JSON.parse(JSON.stringify(value));}
function save(root,state){const dir=path.join(root,'.agent','work',state.work_id);fs.mkdirSync(dir,{recursive:true});const file=path.join(dir,'resume.json');fs.writeFileSync(file,JSON.stringify(state));return file;}
function read(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function candidate(c,extra={}){return {...clone(fixtures()['question-candidate.v1.schema.json']),work_id:c.work_id,source_revision:c.source_revision,...extra};}
function answer(c,q,extra={}){return {question_id:q.question_id,source_revision:c.source_revision,outcome:'decision',selected:['A'],quote:'The first outcome is normative.',pointer:'WORK.md#human-answer',answered_at:new Date().toISOString(),...extra};}
function manifestFor(c,source){const value=clone(c.acceptance_manifest);value.source_revision=source;return value;}

describe('typed clarification verbs: QuestionCandidate ZOMBIES',()=>{
  test('closed checkpoint and question vocabularies preserve each named member',()=>{
    const c=checkpoint({work_id:'question-vocab',revision:1,lifecycle_state:'TRACE',sealed_at:undefined,sealed_revision:undefined,implementation_fingerprint:undefined});
    expect(()=>runtime.assertCheckpoint({...c,source_plan:null})).toThrow(/checkpoint BR\/SR\/AC\/GAP trace missing/);
    for(const [field,message] of [['br','BR missing'],['sr','SR missing'],['ac','AC missing'],['scope','scope missing'],['verification','verification missing'],['rollback_cleanup','rollback cleanup missing']])expect(()=>runtime.assertCheckpoint({...c,source_plan:{...c.source_plan,[field]:''}})).toThrow(message);
    for(const field of ['reviews','verification','evidence','leases','imports','recovery_evidence','review_generation_ledger','question_candidates'])expect(()=>runtime.assertCheckpoint({...c,[field]:{}})).toThrow(new RegExp(`checkpoint ${field} invalid`));
    const types=['single_choice','multi_choice','yes_no_confirm','numeric_range','date_or_deadline','rank_priorities','select_artifact','select_scope','constrained_free_text','confirm_inference','resolve_conflict','provide_source_or_file','permission_request'];
    const choice=new Set(['single_choice','multi_choice','yes_no_confirm','rank_priorities','select_artifact','select_scope','confirm_inference','resolve_conflict','permission_request']);
    const single=new Set(['single_choice','yes_no_confirm','select_artifact','select_scope','confirm_inference','resolve_conflict','permission_request']);
    for(const type of types){
      const valid=candidate(c,{question_id:`Q-${type}`,type});
      expect(runtime.assertCheckpoint({...c,question_candidates:[valid]})).toBe(true);
      if(choice.has(type))expect(()=>runtime.assertCheckpoint({...c,question_candidates:[{...valid,options:[valid.options[0]]}]})).toThrow(/question candidate invalid/);
      if(single.has(type))expect(()=>runtime.assertCheckpoint({...c,question_candidates:[{...valid,status:'answered',answer:{outcome:'decision',selected:['A','B'],quote:'Choose one.',pointer:'WORK.md#choice',answered_at:new Date().toISOString()}}]})).toThrow(/question candidate invalid/);
    }
    const option={id:'A',label:'A',consequence:'Use A.',recommended:false};
    for(const malformed of [null,{...option,recommended:undefined},{...option,recommended:'false'},{...option,unexpected:true}])expect(()=>runtime.assertCheckpoint({...c,question_candidates:[{...candidate(c),options:[malformed]}]})).toThrow(/question candidate invalid/);
    const typeIsolated=candidate(c,{type:'constrained_free_text'});
    expect(()=>runtime.assertCheckpoint({...c,question_candidates:[{...typeIsolated,options:[{...typeIsolated.options[0],recommended:'false'},typeIsolated.options[1]]}]})).toThrow(/question candidate invalid/);
    expect(runtime.assertCheckpoint({...c,question_candidates:[{...candidate(c),options:[{...candidate(c).options[0],recommended:true},candidate(c).options[1]],recommendation_rationale:'The first option best matches current evidence.'}]})).toBe(true);
    for(const [field,message] of [['id','question option id missing'],['label','question option label missing'],['consequence','question option consequence missing']])expect(()=>runtime.assertCheckpoint({...c,question_candidates:[{...candidate(c),options:[{...option,[field]:''}]}]})).toThrow(message);
    expect(()=>runtime.assertCheckpoint({...c,question_candidates:[{...candidate(c),evidence_pointers:null}]})).toThrow(/question evidence pointers invalid/);
  });

  test('QuestionCandidate core and answer enums retain their closed typed contract',()=>{
    const c=checkpoint({work_id:'question-core',revision:1,lifecycle_state:'TRACE',sealed_at:undefined,sealed_revision:undefined,implementation_fingerprint:undefined}),base=candidate(c);
    const invalid=value=>expect(()=>runtime.assertCheckpoint({...c,question_candidates:[value]})).toThrow(/question candidate invalid/);
    for(const value of [null,{...base,options:null},{...base,targets:null},{...base,dependencies:null},{...base,action:'retrieve'},{...base,blocking:'yes'},{...base,allow_other:'yes'},{...base,allow_cannot_answer:'yes'}])invalid(value);
    for(const [field,message] of [['question_id','question id missing'],['work_id','question work id missing'],['source_revision','question source revision missing'],['context','question context missing'],['why_asked','question reason missing'],['impact_if_unanswered','question impact missing'],['text','question text missing']])expect(()=>runtime.assertCheckpoint({...c,question_candidates:[{...base,[field]:''}]})).toThrow(message);
    for(const gap_class of ['missing','ambiguous','conflicting','inferred_unconfirmed','retrievable','blocked','ready'])expect(runtime.assertCheckpoint({...c,question_candidates:[{...base,gap_class}]})).toBe(true);
    for(const criticality of ['blocking','high','medium','low'])expect(runtime.assertCheckpoint({...c,question_candidates:[{...base,criticality,blocking:criticality==='blocking'}]})).toBe(true);
    for(const decision_owner of ['user','project_source','policy','external_authority'])expect(runtime.assertCheckpoint({...c,question_candidates:[{...base,decision_owner}]})).toBe(true);
    for(const status of ['open','waived','expired'])expect(runtime.assertCheckpoint({...c,question_candidates:[{...base,status,answer:null}]})).toBe(true);
    const attribution={quote:'A documented decision.',pointer:'WORK.md#decision',answered_at:new Date().toISOString()},answered={...base,status:'answered',answer:{outcome:'decision',selected:['A'],...attribution}};
    expect(runtime.assertCheckpoint({...c,question_candidates:[answered]})).toBe(true);
    expect(runtime.assertCheckpoint({...c,question_candidates:[{...base,status:'open',answer:{outcome:'defer',selected:[],...attribution}}]})).toBe(true);
    for(const value of [{...base,type:'multi_choice',status:'answered',answer:{outcome:'decision',selected:[],...attribution}},{...base,status:'open',answer:{outcome:'defer',selected:['A'],...attribution}},{...base,status:'waived',answer:{outcome:'defer',selected:[],...attribution}}])invalid(value);
    expect(()=>runtime.assertCheckpoint({...c,question_candidates:[{...base,options:[{...base.options[0],recommended:true},base.options[1]],recommendation_rationale:''}]})).toThrow(/question recommendation rationale missing/);
    for(const value of [null,{...answered,answer:null},{...answered,answer:{...answered.answer,outcome:'invalid'}}])invalid(value);
    for(const [field,message] of [['quote','answer quote missing'],['pointer','answer pointer missing'],['answered_at','answer timestamp missing']])expect(()=>runtime.assertCheckpoint({...c,question_candidates:[{...answered,answer:{...answered.answer,[field]:''}}]})).toThrow(message);
    expect(()=>runtime.assertCheckpoint({...c,question_candidates:[{...answered,answer:{...answered.answer,answered_at:'not-a-time'}}]})).toThrow(/answer timestamp/);
    expect(()=>runtime.assertCheckpoint({...c,question_candidates:[{...base,work_id:'other'}]})).toThrow(/question candidate binding invalid/);
    expect(()=>runtime.assertCheckpoint({...c,question_candidates:[{...base,criticality:'high',blocking:true}]})).toThrow(/question blocking contract invalid/);
  });

  test('zero, one and duplicate candidates retain a typed active collection',()=>{
    const root=fs.mkdtempSync(path.join(os.tmpdir(),'runtime-question-zombies-')),c=checkpoint({work_id:'question-zombies',revision:1,lifecycle_state:'TRACE',sealed_at:undefined,sealed_revision:undefined,implementation_fingerprint:undefined});
    expect(runtime.assertCheckpoint({...c,question_candidates:[]})).toBe(true);
    const file=save(root,c),q=candidate(c),next=runtime.recordQuestionCandidate(file,q,1,c.source_revision);
    expect(next).toMatchObject({revision:2,question_candidates:[{question_id:q.question_id,status:'open',blocking:true}],next_action:expect.stringMatching(/human answer/)});
    expect(()=>runtime.recordQuestionCandidate(file,q,2,c.source_revision)).toThrow(/duplicate question/);
    expect(read(file)).toEqual(next);
  });

  test('candidate schema, binding, options, recommendation and blocking semantics fail closed',()=>{
    const root=fs.mkdtempSync(path.join(os.tmpdir(),'runtime-question-invalid-')),c=checkpoint({work_id:'question-invalid',revision:1,lifecycle_state:'TRACE',sealed_at:undefined,sealed_revision:undefined,implementation_fingerprint:undefined});
    const cases=[
      candidate(c,{schema:'QuestionCandidate/v0'}),
      candidate(c,{work_id:'other'}),
      candidate(c,{source_revision:'stale'}),
      candidate(c,{targets:[]}),
      candidate(c,{targets:['SR-1','SR-1']}),
      candidate(c,{type:'unknown'}),
      candidate(c,{options:[]}),
      candidate(c,{options:[{id:'A',label:'A',consequence:'A',recommended:false},{id:'A',label:'B',consequence:'B',recommended:false}]}),
      candidate(c,{options:[{id:'A',label:'A',consequence:'A',recommended:true},{id:'B',label:'B',consequence:'B',recommended:false}],recommendation_rationale:null}),
      candidate(c,{criticality:'high',blocking:true}),
      candidate(c,{status:'answered',answer:null}),
      candidate(c,{unexpected:true})
    ];
    for(const [index,q] of cases.entries()){
      const state={...c,work_id:`question-invalid-${index}`},file=save(root,state),bound={...q,work_id:q.work_id===c.work_id?state.work_id:q.work_id};
      expect(()=>runtime.recordQuestionCandidate(file,bound,1,state.source_revision)).toThrow();
      expect(read(file).revision).toBe(1);
    }
    expect(()=>runtime.assertCheckpoint({...c,question_candidates:{}})).toThrow(/question_candidates invalid/);
  });

  test('option collection and null-candidate ZOMBIES exercise each structural guard',()=>{
    const root=fs.mkdtempSync(path.join(os.tmpdir(),'runtime-question-options-')),c=checkpoint({work_id:'question-options',revision:1,lifecycle_state:'TRACE',sealed_at:undefined,sealed_revision:undefined,implementation_fingerprint:undefined});
    const option={id:'A',label:'A',consequence:'Use A.',recommended:false};
    const cases=[
      null,
      candidate(c,{options:null}),
      candidate(c,{options:[option,null]}),
      candidate(c,{options:[option,{...option,label:'duplicate'}]}),
      candidate(c,{options:[{...option,recommended:true},{id:'B',label:'B',consequence:'Use B.',recommended:true}],recommendation_rationale:'Either could work.'}),
      candidate(c,{options:[option]})
    ];
    for(const [index,q] of cases.entries()){
      const state={...c,work_id:`question-options-${index}`},file=save(root,state),value=q&&{...q,work_id:state.work_id};
      expect(()=>runtime.recordQuestionCandidate(file,value,1,state.source_revision)).toThrow();
      expect(read(file).revision).toBe(1);
    }
  });

  test('evidence pointers are optional but invalid, duplicate and unsafe pointers fail closed',()=>{
    const root=fs.mkdtempSync(path.join(os.tmpdir(),'runtime-question-evidence-')),c=checkpoint({work_id:'question-evidence',revision:1,lifecycle_state:'TRACE',sealed_at:undefined,sealed_revision:undefined,implementation_fingerprint:undefined});
    const without= candidate(c);delete without.evidence_pointers;
    expect(runtime.recordQuestionCandidate(save(root,c),without,1,c.source_revision).question_candidates[0].evidence_pointers).toBeUndefined();
    for(const [index,evidence_pointers] of [null,'pointer',[''],['WORK.md#same','WORK.md#same'],['secret=value']].entries()){
      const state={...c,work_id:`question-evidence-${index}`},file=save(root,state),q=candidate(state,{evidence_pointers});
      expect(()=>runtime.recordQuestionCandidate(file,q,1,state.source_revision)).toThrow();
    }
  });

  test('stored waived/expired states accept null answers, while contradictory status/outcome pairs fail',()=>{
    const c=checkpoint({work_id:'question-status'}),base=candidate(c);
    for(const status of ['waived','expired'])expect(runtime.assertCheckpoint({...c,question_candidates:[{...base,status,answer:null}]})).toBe(true);
    const attribution={quote:'No decision yet.',pointer:'WORK.md#answer',answered_at:new Date().toISOString()};
    const answeredNondecision={...base,status:'answered',answer:{outcome:'cannot_answer',selected:[],...attribution}};
    const openDecision={...base,status:'open',answer:{outcome:'decision',selected:['A'],...attribution}};
    expect(()=>runtime.assertCheckpoint({...c,question_candidates:[answeredNondecision]})).toThrow(/question candidate invalid/);
    expect(()=>runtime.assertCheckpoint({...c,question_candidates:[openDecision]})).toThrow(/question candidate invalid/);
    expect(()=>runtime.assertCheckpoint({...c,question_candidates:[base,clone(base)]})).toThrow(/duplicate question candidate/);
  });

  test('record verb rejects schema-valid answered and open-with-answer candidates',()=>{
    const root=fs.mkdtempSync(path.join(os.tmpdir(),'runtime-question-record-status-')),c=checkpoint({work_id:'question-record-status',revision:1,lifecycle_state:'TRACE',sealed_at:undefined,sealed_revision:undefined,implementation_fingerprint:undefined}),attribution={quote:'Use A.',pointer:'WORK.md#answer',answered_at:new Date().toISOString()};
    const cases=[
      candidate(c,{status:'answered',answer:{outcome:'decision',selected:['A'],...attribution}}),
      candidate(c,{status:'open',answer:{outcome:'cannot_answer',selected:[],...attribution}})
    ];
    for(const [index,q] of cases.entries()){
      const state={...c,work_id:`question-record-status-${index}`},file=save(root,state);
      expect(()=>runtime.recordQuestionCandidate(file,{...q,work_id:state.work_id},1,state.source_revision)).toThrow(/must be open/);
    }
  });
});

describe('typed clarification verbs: attributable human answers',()=>{
  test('unknown, empty, ambiguous and stale selections leave the question open',()=>{
    const root=fs.mkdtempSync(path.join(os.tmpdir(),'runtime-answer-invalid-')),c=checkpoint({work_id:'answer-invalid',revision:1,lifecycle_state:'TRACE',sealed_at:undefined,sealed_revision:undefined,implementation_fingerprint:undefined}),q=candidate(c),file=save(root,c);
    runtime.recordQuestionCandidate(file,q,1,c.source_revision);
    const invalid=[
      answer(c,q,{outcome:'invalid'}),
      answer(c,q,{selected:[]}),
      answer(c,q,{selected:['A','B']}),
      answer(c,q,{selected:['UNKNOWN']}),
      answer(c,q,{quote:''}),
      answer(c,q,{pointer:''}),
      answer(c,q,{pointer:'secret=value'}),
      answer(c,q,{answered_at:'not-a-time'}),
      answer(c,q,{answered_at:new Date(Date.now()+600000).toISOString()})
    ];
    for(const value of invalid)expect(()=>runtime.recordHumanAnswer(file,value,2,c.source_revision)).toThrow();
    for(const value of [answer(c,q,{outcome:'invalid'}),answer(c,q,{selected:null})])expect(()=>runtime.recordHumanAnswer(file,value,2,c.source_revision)).toThrow(/^human answer invalid$/);
    for(const [value,error] of [[answer(c,q,{quote:''}),/^answer quote missing$/],[answer(c,q,{pointer:''}),/^answer pointer missing$/],[answer(c,q,{answered_at:''}),/^answer timestamp missing$/]])expect(()=>runtime.recordHumanAnswer(file,value,2,c.source_revision)).toThrow(error);
    expect(()=>runtime.recordHumanAnswer(file,answer(c,q,{source_revision:'stale'}),2,c.source_revision)).toThrow(/source revision stale/);
    expect(()=>runtime.recordHumanAnswer(file,answer(c,q,{question_id:'Q-UNKNOWN'}),2,c.source_revision)).toThrow(/unknown question candidate/);
    expect(read(file)).toMatchObject({revision:2,question_candidates:[{question_id:q.question_id,status:'open',answer:null}]});
  });

  test('one attributable answer closes exactly one open question and replay is rejected',()=>{
    const root=fs.mkdtempSync(path.join(os.tmpdir(),'runtime-answer-valid-')),c=checkpoint({work_id:'answer-valid',revision:1,lifecycle_state:'TRACE',sealed_at:undefined,sealed_revision:undefined,implementation_fingerprint:undefined}),q=candidate(c),file=save(root,c);
    runtime.recordQuestionCandidate(file,q,1,c.source_revision);
    const input=answer(c,q),next=runtime.recordHumanAnswer(file,input,2,c.source_revision);
    expect(next).toMatchObject({revision:3,question_candidates:[{question_id:q.question_id,status:'answered',answer:{outcome:'decision',selected:['A'],quote:input.quote,pointer:input.pointer,answered_at:input.answered_at}}],next_action:expect.stringMatching(/human decision/)});
    expect(()=>runtime.recordHumanAnswer(file,input,3,c.source_revision)).toThrow(/not open/);
  });

  test('answer next-action is derived from the addressed question when another question remains open',()=>{
    const root=fs.mkdtempSync(path.join(os.tmpdir(),'runtime-answer-addressed-')),c=checkpoint({work_id:'answer-addressed',revision:1,lifecycle_state:'TRACE',sealed_at:undefined,sealed_revision:undefined,implementation_fingerprint:undefined}),first=candidate(c,{question_id:'Q-FIRST'}),second=candidate(c,{question_id:'Q-SECOND'}),file=save(root,c);
    let n=runtime.recordQuestionCandidate(file,first,1,c.source_revision);
    n=runtime.recordQuestionCandidate(file,second,n.revision,c.source_revision);
    n=runtime.recordHumanAnswer(file,answer(c,second),n.revision,c.source_revision);
    expect(n).toMatchObject({question_candidates:[{question_id:'Q-FIRST',status:'open'},{question_id:'Q-SECOND',status:'answered'}],next_action:'Continue from the attributable human decision.'});
  });

  test('constrained free-text answer is attributable without inventing an option selection',()=>{
    const root=fs.mkdtempSync(path.join(os.tmpdir(),'runtime-answer-text-')),c=checkpoint({work_id:'answer-text',revision:1,lifecycle_state:'TRACE',sealed_at:undefined,sealed_revision:undefined,implementation_fingerprint:undefined}),q=candidate(c,{question_id:'Q-TEXT',type:'constrained_free_text',options:[],criticality:'medium',blocking:false}),file=save(root,c);
    runtime.recordQuestionCandidate(file,q,1,c.source_revision);
    expect(runtime.recordHumanAnswer(file,answer(c,q,{selected:[]}),2,c.source_revision).question_candidates[0].status).toBe('answered');
  });

  test('human answer null, missing IDs, stale source and unknown question fail before mutation',()=>{
    const root=fs.mkdtempSync(path.join(os.tmpdir(),'runtime-answer-input-')),c=checkpoint({work_id:'answer-input',revision:1,lifecycle_state:'TRACE',sealed_at:undefined,sealed_revision:undefined,implementation_fingerprint:undefined}),q=candidate(c),file=save(root,c);
    runtime.recordQuestionCandidate(file,q,1,c.source_revision);
    const missingQuestion=answer(c,q);delete missingQuestion.question_id;
    const missingSource=answer(c,q);delete missingSource.source_revision;
    const emptySource=answer(c,q,{source_revision:'   '});
    for(const value of [null,missingQuestion,missingSource,emptySource]){
      expect(()=>runtime.recordHumanAnswer(file,value,2,c.source_revision)).toThrow(/human answer invalid/);
      expect(read(file).revision).toBe(2);
    }
    for(const value of [answer(c,q,{source_revision:'stale'}),answer(c,q,{question_id:'Q-UNKNOWN'})]){
      expect(()=>runtime.recordHumanAnswer(file,value,2,c.source_revision)).toThrow();
      expect(read(file).revision).toBe(2);
    }
  });

  test('omitted outcome defaults to a decision and closes the selected open question',()=>{
    const root=fs.mkdtempSync(path.join(os.tmpdir(),'runtime-answer-default-')),c=checkpoint({work_id:'answer-default',revision:1,lifecycle_state:'TRACE',sealed_at:undefined,sealed_revision:undefined,implementation_fingerprint:undefined}),q=candidate(c),file=save(root,c);
    runtime.recordQuestionCandidate(file,q,1,c.source_revision);
    const input=answer(c,q);delete input.outcome;
    expect(runtime.recordHumanAnswer(file,input,2,c.source_revision)).toMatchObject({question_candidates:[{status:'answered',answer:{outcome:'decision',selected:['A']}}]});
  });

  test('other is a decision, while cannot-answer preserves provenance without closing the question',()=>{
    const root=fs.mkdtempSync(path.join(os.tmpdir(),'runtime-answer-disposition-')),c=checkpoint({work_id:'answer-disposition',revision:1,lifecycle_state:'TRACE',sealed_at:undefined,sealed_revision:undefined,implementation_fingerprint:undefined}),other=candidate(c,{question_id:'Q-OTHER'}),otherFile=save(root,c);
    runtime.recordQuestionCandidate(otherFile,other,1,c.source_revision);
    expect(runtime.recordHumanAnswer(otherFile,answer(c,other,{selected:['other'],quote:'Use a third documented outcome.'}),2,c.source_revision).question_candidates[0].status).toBe('answered');
    const pendingState={...c,work_id:'answer-cannot',lifecycle_state:'EXECUTE'},pending=candidate(pendingState,{question_id:'Q-CANNOT'}),pendingFile=save(root,pendingState);
    runtime.recordQuestionCandidate(pendingFile,pending,1,pendingState.source_revision);
    const cannot=runtime.recordHumanAnswer(pendingFile,answer(pendingState,pending,{outcome:'cannot_answer',selected:[],quote:'I cannot decide this yet.'}),2,pendingState.source_revision);
    expect(cannot).toMatchObject({question_candidates:[{status:'open',answer:{outcome:'cannot_answer',selected:[]}}],next_action:'Clarification remains open; defer with a safe owner/evidence target or obtain a decision.'});
    expect(()=>runtime.sealMutation(pendingFile,3,pendingState.source_revision,root)).toThrow(/blocking clarification/);
  });
});

describe('typed clarification verbs: blocking and invalidation',()=>{
  test('blocking-open clarification blocks execute seal/gate, delivery advance and delivery receipt',()=>{
    const root=fs.mkdtempSync(path.join(os.tmpdir(),'runtime-question-block-'));
    const execute=checkpoint({work_id:'question-execute',revision:1,lifecycle_state:'EXECUTE',sealed_at:undefined,sealed_revision:undefined,implementation_fingerprint:undefined}),executeFile=save(root,{...execute,question_candidates:[candidate(execute)]});
    expect(()=>runtime.validateGate(read(executeFile),'execute:post',{expectedRevision:1,sourceRevision:execute.source_revision,root})).toThrow(/blocking clarification/);
    expect(()=>runtime.sealMutation(executeFile,1,execute.source_revision,root)).toThrow(/blocking clarification/);
    const verify=checkpoint({work_id:'question-verify',revision:1,lifecycle_state:'VERIFY',question_candidates:[candidate(checkpoint({work_id:'question-verify'}))]}),verifyFile=save(root,verify);
    expect(()=>runtime.advanceToDelivery(verifyFile,{expectedRevision:1,sourceRevision:verify.source_revision,root})).toThrow(/blocking clarification/);
    const delivery=checkpoint({work_id:'question-delivery',revision:1,lifecycle_state:'DELIVERY',question_candidates:[candidate(checkpoint({work_id:'question-delivery'}))]}),deliveryFile=save(root,delivery);
    expect(()=>runtime.recordDeliveryReceipt(deliveryFile,{},1,delivery.source_revision)).toThrow(/blocking clarification/);
  });

  test('nonblocking-open and blocking-answered clarifications do not block execute:post',()=>{
    const base=checkpoint({work_id:'question-pass',revision:1,lifecycle_state:'EXECUTE',sealed_at:undefined,sealed_revision:undefined,implementation_fingerprint:undefined});
    const nonblocking=candidate(base,{question_id:'Q-NONBLOCK',criticality:'high',blocking:false});
    expect(runtime.validateGate({...base,question_candidates:[nonblocking]},'execute:post',{expectedRevision:1,sourceRevision:base.source_revision})).toBe(true);
    const open=candidate(base),answered={...open,status:'answered',answer:{outcome:'decision',selected:['A'],quote:'Use A.',pointer:'WORK.md#answer',answered_at:new Date().toISOString()}};
    expect(runtime.validateGate({...base,question_candidates:[answered]},'execute:post',{expectedRevision:1,sourceRevision:base.source_revision})).toBe(true);
  });

  test('source replan, unsealed retag and correction invalidate open or answered question state',()=>{
    const root=fs.mkdtempSync(path.join(os.tmpdir(),'runtime-question-invalidate-'));
    const trace=checkpoint({work_id:'question-replan',revision:1,lifecycle_state:'TRACE',sealed_at:undefined,sealed_revision:undefined,implementation_fingerprint:undefined}),traceFile=save(root,{...trace,question_candidates:[candidate(trace)]}),newSource='source-new';
    const replanned=runtime.replanWork(traceFile,{expectedRevision:1,sourceRevision:trace.source_revision,newSourceRevision:newSource,sourcePlan:trace.source_plan,acceptance:trace.acceptance,testPlan:trace.test_plan,acceptanceManifest:manifestFor(trace,newSource)});
    expect(replanned.question_candidates).toEqual([]);
    const execute=checkpoint({work_id:'question-retag',revision:1,lifecycle_state:'EXECUTE',sealed_at:undefined,sealed_revision:undefined,implementation_fingerprint:undefined}),executeFile=save(root,{...execute,question_candidates:[candidate(execute)]});
    const retagged=runtime.retagUnsealedExecution(executeFile,{expectedRevision:1,sourceRevision:execute.source_revision,newSourceRevision:newSource,sourcePlan:execute.source_plan,acceptanceManifest:manifestFor(execute,newSource)});
    expect(retagged.question_candidates).toEqual([]);
    const verify=checkpoint({work_id:'question-correction',revision:1,lifecycle_state:'VERIFY'}),open=candidate(verify),answered={...open,status:'answered',answer:{outcome:'decision',selected:['A'],quote:'Use A.',pointer:'WORK.md#answer',answered_at:new Date().toISOString()}},verifyFile=save(root,{...verify,question_candidates:[answered]});
    expect(runtime.beginCorrection(verifyFile,{expectedRevision:1,sourceRevision:verify.source_revision,correction:{reason:'Clarify scope',pointer:'WORK.md#correction'}}).question_candidates).toEqual([]);
  });

  test('same-source replan preserves a valid question while a new source clears it',()=>{
    const root=fs.mkdtempSync(path.join(os.tmpdir(),'runtime-question-same-source-'));
    const trace=checkpoint({work_id:'question-same-source',revision:1,lifecycle_state:'TRACE',sealed_at:undefined,sealed_revision:undefined,implementation_fingerprint:undefined});
    const open=candidate(trace),file=save(root,{...trace,question_candidates:[open]});
    const same=runtime.replanWork(file,{expectedRevision:1,sourceRevision:trace.source_revision,sourcePlan:trace.source_plan,acceptance:trace.acceptance,testPlan:trace.test_plan,acceptanceManifest:trace.acceptance_manifest});
    expect(same.question_candidates).toEqual([open]);
    const nextSource='question-same-source-v2';
    const changed=runtime.replanWork(file,{expectedRevision:same.revision,sourceRevision:same.source_revision,newSourceRevision:nextSource,sourcePlan:same.source_plan,acceptance:same.acceptance,testPlan:same.test_plan,acceptanceManifest:manifestFor(same,nextSource)});
    expect(changed.question_candidates).toEqual([]);
  });

  test('null question candidates fail at the typed record boundary',()=>{
    const root=fs.mkdtempSync(path.join(os.tmpdir(),'runtime-question-null-record-')),c=checkpoint({work_id:'question-null-record',revision:1,lifecycle_state:'TRACE'}),file=save(root,c);
    expect(()=>runtime.recordQuestionCandidate(file,null,1,c.source_revision)).toThrow(/new question candidate must be open/);
  });
});
