'use strict';
/* global vi */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const runtime = require('../../lib/runtime.cjs');

test('contained path seam rejects escape and accepts a child', () => {
  const base = path.join(process.cwd(), '.agent', 'work');
  expect(runtime.resolveContainedPath(base, 'work-id/dispatch.json')).toBe(path.resolve(base, 'work-id/dispatch.json'));
  expect(() => runtime.resolveContainedPath(base, '../outside.json')).toThrow(/path escapes trusted base/);
});

test('scoped file seam accepts files and rejects directories', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'scoped-file-'));
  fs.writeFileSync(path.join(root, 'file.txt'), 'value');
  expect(runtime.resolveScopedFile(root, 'file.txt').relative).toBe('file.txt');
  expect(() => runtime.resolveScopedFile(root, '.')).toThrow(/scope path is not file/);
  const outside = path.join(path.dirname(root), `${path.basename(root)}-outside.txt`);
  fs.writeFileSync(outside, 'outside');
  expect(() => runtime.resolveScopedFile(root, `../${path.basename(outside)}`)).toThrow(/path escapes repository/);
});
const { checkpoint, deploymentManifest } = require('./fixtures.cjs');
function clone(value) { return JSON.parse(JSON.stringify(value)); }

function repo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-replay-'));
  execFileSync('git', ['init', '-q'], { cwd: root });
  execFileSync('git', ['config', 'user.email', 'replay@example.test'], { cwd: root });
  execFileSync('git', ['config', 'user.name', 'replay'], { cwd: root });
  fs.writeFileSync(path.join(root, 'scope.txt'), 'scope');
  execFileSync('git', ['add', '.'], { cwd: root }); execFileSync('git', ['commit', '-qm', 'base'], { cwd: root });
  return root;
}
function save(root, state) {
  const dir = path.join(root, '.agent', 'work', state.work_id); fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'resume.json'); fs.writeFileSync(file, JSON.stringify(state)); return file;
}
function bind(c) { return { work_id:c.work_id, source_revision:c.source_revision, sealed_revision:c.sealed_revision, implementation_fingerprint:c.implementation_fingerprint, acceptance_manifest_id:c.acceptance_manifest.id, acceptance_manifest_version:c.acceptance_manifest.version }; }
function packet(c, extra={}) { return { schema:'BlindReviewPacket/v2',status:'frozen',packet_id:'packet',packet_version:1,wave:1,generation:1,...bind(c),required_profile:{model:'configured',reasoning:'high'},review_scope:{paths:c.fingerprint_paths,absence_assertions:c.absence_assertions||{}},profile_attestation_set:'dispatch.json',...extra }; }
function dispatch(c,p) { return { schema:'DispatchProfileAttestationSet/v1',...bind(c),packet_id:p.packet_id,packet_version:p.packet_version,wave:p.wave,orchestrator:'root',selector_source:'test',requested_model:'configured',requested_reasoning_effort:'high',runtime_metadata_observed:false,issued_at:new Date().toISOString(),root_task_id:'root',root_dispatch_id:'root-d',entries:runtime.lenses.map((lens,n)=>({task_id:`t${n}`,dispatch_id:`d${n}`,reviewer_id:`r${n}`,lens,profile_verified:true,profile_verification:{verified_model:'configured',verified_reasoning_effort:'high',verification_source:'test/profile-verifier',verification_pointer:`tests/profile-${n}`,verified_at:new Date().toISOString()}})) }; }
function review(c,p,n,extra={}) { return { schema:'ReviewReceipt/v2',...bind(c),reviewer_id:`r${n}`,dispatch_task_id:`t${n}`,dispatch_id:`d${n}`,lens:runtime.lenses[n],history_isolation:true,findings:[],verdict:'clean',packet_id:p.packet_id,packet_version:p.packet_version,wave:p.wave,...extra }; }
function reverse(c,p,n,extra={}) { return { schema:'ReverseValidationReceipt/v1',...bind(c),receipt_id:`rv${n}`,reviewer_id:`vr${n}`,type:['trace_scope','technical_safety','evidence_truth'][n],verdict:'pass',validator:'test',timestamp:new Date().toISOString(),evidence:['test'],ac_refs:['AC-QUALITY-1'],packet_id:p.packet_id,packet_version:p.packet_version,...extra }; }
function evidence(c,id='e') { return { schema:'Evidence/v1',...bind(c),id,class:'Static',timestamp:new Date().toISOString(),ac_refs:['AC-QUALITY-1'],pointer:'tests/replay' }; }
function recovery(c,id='recovery') { return { schema:'RecoveryEvidence/v1',...bind(c),id,action:'restore',actor:'tester',attribution:'tests/replay',result:'pass',rollback:'restore',timestamp:new Date().toISOString(),ac_refs:['AC-QUALITY-1'] }; }
function imported(c,id='import') { return { schema:'ImportAttribution/v1',...bind(c),import_id:id,provider:'test',receipt_pointer:'tests/import',imported_at:new Date().toISOString(),status:'accepted' }; }

test('trusted gate-file path validates every input field and each repository custody boundary',()=>{
  const root=repo(),state=checkpoint({work_id:'gate-file-exact',revision:1,lifecycle_state:'TRACE',sealed_at:undefined,sealed_revision:undefined,implementation_fingerprint:undefined}),file=save(root,state),input={checkpointPath:file,sourceRevision:state.source_revision,repoRoot:root,point:'plan:pre',expectedRevision:1};
  expect(runtime.checkpointPath(input,root)).toBe(path.resolve(file));
  expect(runtime.validateGateFile(input)).toBe(true);
  for(const field of ['checkpointPath','sourceRevision','repoRoot','point'])expect(()=>runtime.validateGateFile({...input,[field]:''})).toThrow(new RegExp(`^gate ${field} missing$`));
  expect(()=>runtime.validateGateFile(null)).toThrow(/^typed gate input required$/);
  expect(()=>runtime.validateGateFile('input')).toThrow(/^typed gate input required$/);
  expect(()=>runtime.validateGateFile({...input,expectedRevision:'1'})).toThrow(/^gate expectedRevision required$/);
  const wrongName=path.join(path.dirname(file),'checkpoint.json');fs.writeFileSync(wrongName,JSON.stringify(state));
  expect(()=>runtime.checkpointPath({checkpointPath:wrongName},root)).toThrow(/^checkpoint path outside trusted work root$/);
  const outside=path.join(root,'resume.json');fs.writeFileSync(outside,JSON.stringify(state));
  expect(()=>runtime.checkpointPath({checkpointPath:outside},root)).toThrow(/^checkpoint path outside trusted work root$/);
  const wrongCustody=path.join(root,'.agent','other','resume.json');fs.mkdirSync(path.dirname(wrongCustody),{recursive:true});fs.writeFileSync(wrongCustody,JSON.stringify(state));
  expect(()=>runtime.checkpointPath({checkpointPath:wrongCustody},root)).toThrow(/^checkpoint path outside trusted work root$/);
  const original=fs.lstatSync,targets=[path.join(root,'.agent'),path.join(root,'.agent','work'),path.dirname(file),file];
  for(const target of targets){const spy=vi.spyOn(fs,'lstatSync').mockImplementation(/** @type {any} */(value=>{const stat=original(value);return path.resolve(String(value))===path.resolve(target)?new Proxy(stat,{get(current,key){return key==='isSymbolicLink'?()=>true:Reflect.get(current,key);}}):stat;}));try{expect(()=>runtime.checkpointPath(input,root)).toThrow(/reparse point is not allowed/);}finally{spy.mockRestore();}}
});

test('runCli default argv and missing checkpoint preserve the public command boundary',()=>{
  const root=repo(),state=checkpoint({work_id:'cli-default',revision:1,lifecycle_state:'TRACE',sealed_at:undefined,sealed_revision:undefined,implementation_fingerprint:undefined}),file=save(root,state),priorArgv=process.argv,priorExit=process.exitCode,log=vi.spyOn(console,'log').mockImplementation(()=>{});
  try{
    process.argv=['node','runtime.cjs','status',file];process.exitCode=undefined;runtime.runCli();expect(log).toHaveBeenCalledWith(expect.stringContaining('"work_id":"cli-default"'));expect(process.exitCode).toBeUndefined();
    const exists=vi.spyOn(fs,'existsSync');
    try{expect(()=>runtime.runCli(['status'])).toThrow(/^checkpoint schema\/revision$/);expect(()=>runtime.runCli(['status',undefined])).toThrow(/^checkpoint schema\/revision$/);expect(()=>runtime.runCli(['status',''])).toThrow(/^checkpoint schema\/revision$/);expect(exists).not.toHaveBeenCalled();}finally{exists.mockRestore();}
  }finally{process.argv=priorArgv;process.exitCode=priorExit;log.mockRestore();}
});

describe('typed verb replay and duplicate matrix', () => {
  test('scope and fingerprint public APIs close unsafe, missing, empty, absence and ignore unrelated git metadata', () => {
    const root=repo();
    expect(runtime.resolveScope({fingerprint_paths:['**']},root).length).toBeGreaterThan(0);
    expect(runtime.resolveScope({fingerprint_paths:['scope.tx?']},root)).toHaveLength(1);
    for(const pattern of ['../scope.txt','C:/scope.txt','-scope.txt','a\\b']) expect(()=>runtime.resolveScope({fingerprint_paths:[pattern]},root)).toThrow(/unsafe scope/);
    expect(()=>runtime.resolveScope({fingerprint_paths:['missing.txt']},root)).toThrow(/scope path missing/);
    expect(()=>runtime.resolveScope({fingerprint_paths:['missing/**']},root)).toThrow(/resolves to no files/);
    expect(()=>runtime.resolveScope({fingerprint_paths:[]},root)).toThrow(/implementation scope missing/);
    expect(()=>runtime.implementationFingerprint({fingerprint_paths:['scope.txt'],absence_assertions:{'../gone':true}},root)).toThrow(/unsafe absence/);
    expect(()=>runtime.implementationFingerprint({fingerprint_paths:['scope.txt'],absence_assertions:{'scope.txt':true}},root)).toThrow(/required absence/);
    const fake=fs.mkdtempSync(path.join(os.tmpdir(),'runtime-fake-git-'));fs.mkdirSync(path.join(fake,'.git'));fs.writeFileSync(path.join(fake,'scope.txt'),'x');expect(runtime.implementationFingerprint({fingerprint_paths:['scope.txt']},fake)).toMatch(/^[a-f0-9]{64}$/);
    const nested=path.join(root,'nested'),target=path.join(root,'target');fs.mkdirSync(nested);fs.mkdirSync(target);fs.symlinkSync(target,path.join(nested,'junction'),'junction');expect(()=>runtime.resolveScope({fingerprint_paths:['nested/**']},root)).toThrow(/reparse point in scope/);
    expect(()=>runtime.implementationFingerprint({fingerprint_paths:['scope.txt'],absence_assertions:{'nested/junction/gone':true}},root)).toThrow(/absence assertion ancestor reparse/);
  });

  test('continuity rejects malformed and duplicate imports and stale revision/source', () => {
    const c=checkpoint();
    expect(()=>runtime.validateContinuity(c,{expectedRevision:c.revision-1,sourceRevision:c.source_revision})).toThrow(/expected revision/);
    expect(()=>runtime.validateContinuity(c,{expectedRevision:c.revision,sourceRevision:'stale'})).toThrow(/source revision/);
    const malformed={...c,imports:[{}]};expect(()=>runtime.validateContinuity(malformed,{expectedRevision:c.revision,sourceRevision:c.source_revision})).toThrow(/invalid result import/);
    const item=imported(c);const duplicate={...c,imports:[item,item]};expect(()=>runtime.validateContinuity(duplicate,{expectedRevision:c.revision,sourceRevision:c.source_revision})).toThrow(/duplicate import/);
  });

  test('typed entry verbs reject wrong states, incomplete input and replay revisions', () => {
    const root=repo(), intake=checkpoint({work_id:'entry-guards',revision:1,lifecycle_state:'INTAKE',sealed_at:undefined,sealed_revision:undefined,implementation_fingerprint:undefined}),file=save(root,intake);
    expect(()=>runtime.beginTrace(file,{expectedRevision:'1',sourceRevision:intake.source_revision})).toThrow(/expected revision and source/);
    expect(()=>runtime.replanWork(file,{expectedRevision:1,sourceRevision:intake.source_revision})).toThrow(/replan requires/);
    const trace={...intake,lifecycle_state:'TRACE'};fs.writeFileSync(file,JSON.stringify(trace));expect(()=>runtime.replanWork(file,{expectedRevision:1,sourceRevision:trace.source_revision,sourcePlan:trace.source_plan,acceptance:[],testPlan:[]})).toThrow(/replan contract/);
    const plan=checkpoint({work_id:'plan-guards',revision:1,lifecycle_state:'PLAN',sealed_at:undefined,sealed_revision:undefined,implementation_fingerprint:undefined}),planFile=save(root,plan);expect(()=>runtime.beginExecution(planFile,{expectedRevision:1,sourceRevision:plan.source_revision})).toThrow(/current approval/);
    const execute={...plan,lifecycle_state:'EXECUTE'};fs.writeFileSync(planFile,JSON.stringify(execute));expect(()=>runtime.beginExecution(planFile,{expectedRevision:1,sourceRevision:execute.source_revision,approval:{source_revision:execute.source_revision,pointer:'x'}})).toThrow(/begin execution requires plan/);
    expect(()=>runtime.retagUnsealedExecution(planFile,{expectedRevision:1,sourceRevision:execute.source_revision,newSourceRevision:'new'})).toThrow(/replan contract/);
    const verify=checkpoint({work_id:'seal-guard',revision:1,lifecycle_state:'VERIFY'}),verifyFile=save(root,verify);expect(()=>runtime.sealMutation(verifyFile,1,verify.source_revision,root)).toThrow(/seal requires execute/);
  });

  test('public validators close packet, attestation, review, reverse, recovery and delivery cores', () => {
    const root=repo(),c=checkpoint({work_id:'validator-guards',revision:1,lifecycle_state:'VERIFY',allowed_paths:['scope.txt'],fingerprint_paths:['scope.txt']});
    expect(()=>runtime.validateReviews([],c,root)).toThrow(/current frozen review packet/);
    const p=packet(c);expect(()=>runtime.validateAttestationSet({},p,c)).toThrow(/trusted dispatch/);expect(()=>runtime.validateAttestationSet(dispatch(c,p),p)).toThrow(/checkpoint required/);
    const malformedRecovery=save(root,c);expect(()=>runtime.recordRecoveryEvidence(malformedRecovery,{},1,c.source_revision)).toThrow(/typed recovery/);
    expect(()=>runtime.validateReverseValidation([],c)).toThrow(/three reverse/);
    expect(()=>runtime.validateDelivery({},c)).toThrow(/delivery receipt invalid/);
  });

  test('attestation lookup and review packet/duplicate guards fail through validateReviews', () => {
    const root=repo(),c=checkpoint({work_id:'review-guards',revision:1,lifecycle_state:'VERIFY',allowed_paths:['scope.txt'],fingerprint_paths:['scope.txt']}),p=packet(c);Object.assign(c,{review_packet:p,review_generation:1,review_generation_ledger:[{generation:1,packet_id:p.packet_id,packet_version:1,wave:1}]});save(root,c);
    expect(()=>runtime.validateReviews([],c,root)).toThrow(/attestation set missing/);
    c.dispatch_attestation_set={packet_id:p.packet_id,packet_version:1,wave:1,pointer:'missing.json'};expect(()=>runtime.validateReviews([],c,root)).toThrow(/attestation set unavailable/);
    const dir=path.join(root,'.agent','work',c.work_id),set=dispatch(c,p);fs.writeFileSync(path.join(dir,'dispatch.json'),JSON.stringify(set));c.dispatch_attestation_set.pointer='dispatch.json';
    expect(()=>runtime.validateReviews(null,c,root)).toThrow(/^exactly three review receipts required$/);
    const wrong=[0,1,2].map(n=>review(c,p,n));wrong[0].packet_id='other';expect(()=>runtime.validateReviews(wrong,c,root)).toThrow(/review packet binding/);
    const duplicate=[review(c,p,0),review(c,p,0),review(c,p,2)];expect(()=>runtime.validateReviews(duplicate,c,root)).toThrow(/duplicate reviewer/);
  });

  test('review receipt core preserves every typed field, finding and verdict boundary',()=>{
    const root=repo(),c=checkpoint({work_id:'review-core',revision:1,lifecycle_state:'VERIFY',allowed_paths:['scope.txt'],fingerprint_paths:['scope.txt']}),p=packet(c);Object.assign(c,{review_packet:p,review_generation:1,review_generation_ledger:[{generation:1,packet_id:p.packet_id,packet_version:1,wave:1}]});save(root,c);
    const dir=path.join(root,'.agent','work',c.work_id),set=dispatch(c,p);fs.writeFileSync(path.join(dir,'dispatch.json'),JSON.stringify(set));c.dispatch_attestation_set={packet_id:p.packet_id,packet_version:1,wave:1,pointer:'dispatch.json'};
    const valid=[0,1,2].map(n=>review(c,p,n));
    const exactCases=/** @type {Array<[(r:any)=>void, RegExp]>} */ ([
      [r=>{r.reviewer_id='';},/^reviewer missing$/],
      [r=>{r.dispatch_task_id='';},/^task missing$/],
      [r=>{r.dispatch_id='';},/^dispatch missing$/],
      [r=>{r.finding_objects=[{finding_id:'',summary:'summary',escalation:'persistent'}];},/^finding id missing$/],
      [r=>{r.finding_objects=[{finding_id:'f',summary:'',escalation:'persistent'}];},/^finding summary missing$/],
      [r=>{r.receipt_id='';},/^review receipt id missing$/]
    ]);
    for(const [mutate,error] of exactCases){const xs=clone(valid);mutate(xs[0]);expect(()=>runtime.validateReviews(xs,c,root)).toThrow(error);}
    const invalidCases=[
      r=>{r.schema='Wrong';},r=>{r.lens='other';},r=>{r.history_isolation=false;},r=>{r.findings={};},r=>{r.finding_objects=[null];},
      r=>{r.finding_objects=[{finding_id:'f',summary:'summary',escalation:'other'}];},
      r=>{r.finding_objects=[{finding_id:'f',summary:'one',escalation:'persistent'},{finding_id:'f',summary:'two',escalation:'cross_scope'}];},
      r=>{r.verdict='other';}
    ];
    for(const mutate of invalidCases){const xs=clone(valid);mutate(xs[0]);expect(()=>runtime.validateReviews(xs,c,root)).toThrow(/^review receipt binding invalid$/);}
    const nullReceipt=clone(valid);nullReceipt[0]=null;expect(()=>runtime.validateReviews(nullReceipt,c,root)).toThrow(/^review receipt binding invalid$/);
    const mixedFindings=clone(valid);mixedFindings[0].finding_objects=[{finding_id:'f-valid',summary:'valid',escalation:'persistent'},null];expect(()=>runtime.validateReviews(mixedFindings,c,root)).toThrow(/^review receipt binding invalid$/);
    const twoFindings=clone(valid);twoFindings[0].finding_objects=[{finding_id:'f-one',summary:'one',escalation:'persistent'},{finding_id:'f-two',summary:'two',escalation:'cross_scope'}];expect(runtime.validateReviews(twoFindings,c,root)).toBe(true);
    const cleanWithFinding=clone(valid);cleanWithFinding[0].findings=['unexpected'];expect(()=>runtime.validateReviews(cleanWithFinding,c,root)).toThrow(/^review receipt binding invalid$/);
    for(const verdict of ['changes_required','blocked']){const empty=clone(valid);empty[0].verdict=verdict;expect(()=>runtime.validateReviews(empty,c,root)).toThrow(/^review receipt binding invalid$/);}
    for(const verdict of ['changes_required','blocked']){const xs=clone(valid);xs[0].verdict=verdict;xs[0].findings=['finding'];expect(()=>runtime.validateReviews(xs,c,root)).toThrow(/^review changes required$/);}
  });

  test('delivery/runtime temporal, deferred and blocking alternatives fail at their final guards', () => {
    const c=checkpoint({revision:1,lifecycle_state:'DELIVERY',verification_completed_at:'2026-08-16T13:00:00.000Z',delivery_cycle_id:'cycle'}),deliveryReceipt={schema:'DeliveryReceipt/v2',...bind(c),delivery_cycle_id:'cycle',decision:'approved',actor:'user',source:'chat',timestamp:'2026-08-16T12:30:00.000Z',sanitized_pointers:['WORK.md#ok'],deployment_manifest:deploymentManifest(c)};
    expect(()=>runtime.validateDelivery(deliveryReceipt,c)).toThrow(/predates verification/);
    const root=repo(),file=save(root,{...c,delivery_receipt:{...deliveryReceipt,timestamp:'2026-08-16T13:10:00.000Z'}}),base={schema:'RuntimeReceipt/v2',...bind(c),status:'deferred',blocking:false,environment:'dev',actor:'tester',timestamp:'2026-08-16T13:20:00.000Z',ac_refs:['AC-QUALITY-1'],sanitized_pointers:[]};
    expect(()=>runtime.recordRuntimeReceipt(file,base,1,c.source_revision)).toThrow(/needs GAP/);
    expect(()=>runtime.recordRuntimeReceipt(file,{...base,status:'not_required',blocking:true},1,c.source_revision)).toThrow(/disposition invalid/);
    expect(()=>runtime.recordRuntimeReceipt(file,{...base,gap_or_defect_pointer:'GAP-1',timestamp:'2026-08-16T13:05:00.000Z'},1,c.source_revision)).toThrow(/predates verification\/delivery/);
    const acceptedFile=save(root,{...c,work_id:'runtime-gap',delivery_receipt:{...deliveryReceipt,timestamp:'2026-08-16T13:10:00.000Z'}}),acceptedState=JSON.parse(fs.readFileSync(acceptedFile,'utf8'));
    const recorded=runtime.recordRuntimeReceipt(acceptedFile,{...base,...bind(acceptedState),gap_or_defect_pointer:'GAP-1'},1,acceptedState.source_revision);expect(recorded.runtime_receipt.gap_or_defect_pointer).toBe('GAP-1');
  });

  test('gate fingerprint/state, trace state and dirty retag guards are public failures', () => {
    const root=repo(),trace=checkpoint({work_id:'gate-guard',revision:1,lifecycle_state:'TRACE',allowed_paths:['scope.txt'],fingerprint_paths:['scope.txt'],sealed_at:undefined,sealed_revision:undefined,implementation_fingerprint:undefined});
    expect(()=>runtime.validateGate(trace,'plan:post',{expectedRevision:1,sourceRevision:trace.source_revision,root})).toThrow(/invalid in TRACE/);
    const sealed=checkpoint({work_id:'gate-fingerprint',revision:1,lifecycle_state:'VERIFY',allowed_paths:['scope.txt'],fingerprint_paths:['scope.txt']});expect(()=>runtime.validateGate(sealed,'verify:pre',{expectedRevision:1,sourceRevision:sealed.source_revision,root})).toThrow(/implementation scope changed/);
    const file=save(root,trace);expect(()=>runtime.beginTrace(file,{expectedRevision:1,sourceRevision:trace.source_revision})).toThrow(/trace requires intake/);
    const dirty=checkpoint({work_id:'dirty-retag',revision:1,lifecycle_state:'EXECUTE',sealed_at:new Date().toISOString(),sealed_revision:1,implementation_fingerprint:'a'.repeat(64)}),dirtyFile=save(root,dirty);expect(()=>runtime.retagUnsealedExecution(dirtyFile,{expectedRevision:1,sourceRevision:dirty.source_revision,newSourceRevision:'new',acceptanceManifest:dirty.acceptance_manifest,sourcePlan:dirty.source_plan})).toThrow(/clean execute state/);
    expect(runtime.validateGate(trace,'plan:pre',{expectedRevision:1,sourceRevision:trace.source_revision})).toBe(true);
    const actual=runtime.implementationFingerprint({fingerprint_paths:['scope.txt']},root),verify={...sealed,implementation_fingerprint:actual};expect(()=>runtime.validateGate(verify,'verify:pre',{expectedRevision:1,sourceRevision:verify.source_revision,root})).toThrow(/current frozen review packet/);
  });

  test('full verification covers non-high, high-missing and duplicate recovery alternatives', () => {
    const root=repo(),build=(risk,recoveryEvidence=[])=>{const c=checkpoint({work_id:`recovery-${risk}-${recoveryEvidence.length}`,revision:1,lifecycle_state:'VERIFY',risk,allowed_paths:['scope.txt'],fingerprint_paths:['scope.txt'],implementation_fingerprint:runtime.implementationFingerprint({fingerprint_paths:['scope.txt']},root),recovery_evidence:recoveryEvidence}),p=packet(c),set=dispatch(c,p);Object.assign(c,{review_packet:p,review_generation:1,review_generation_ledger:[{generation:1,packet_id:p.packet_id,packet_version:1,wave:1}],dispatch_attestation_set:{packet_id:p.packet_id,packet_version:1,wave:1,pointer:'dispatch.json'},reviews:[0,1,2].map(n=>review(c,p,n)),verification:[0,1,2].map(n=>reverse(c,p,n))});const dir=path.join(root,'.agent','work',c.work_id);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'dispatch.json'),JSON.stringify(set));return c;};
    const medium=build('medium');expect(runtime.validateGate(medium,'verify:post',{expectedRevision:1,sourceRevision:medium.source_revision,root})).toBe(true);
    for(const [field,value,error] of /** @type {Array<[string, any, RegExp]>} */ ([
      ['leases',[null],/stale or invalid lease/],['imports',[{}],/invalid result import/],['reviews',[],/exactly three review/],['verification',[],/three reverse/],['evidence',[{}],/evidence id missing/]
    ]))expect(()=>runtime.validateGate({...medium,[field]:value},'verify:post',{expectedRevision:medium.revision,sourceRevision:medium.source_revision,root})).toThrow(error);
    for(const [field,value,error] of /** @type {Array<[string, any, RegExp]>} */ ([
      ['leases',[null],/stale or invalid lease/],['imports',[{}],/invalid result import/],['reviews',[],/exactly three review/],['verification',[],/three reverse/],['evidence',[{}],/evidence id missing/]
    ])){const file=save(root,{...medium,[field]:value});expect(()=>runtime.advanceToDelivery(file,{expectedRevision:medium.revision,sourceRevision:medium.source_revision,root})).toThrow(error);}
    const high=build('high');expect(()=>runtime.validateGate(high,'verify:post',{expectedRevision:1,sourceRevision:high.source_revision,root})).toThrow(/high risk recovery/);
    const duplicate=build('high'),item=recovery(duplicate);duplicate.recovery_evidence=[item,item];expect(()=>runtime.validateGate(duplicate,'verify:post',{expectedRevision:1,sourceRevision:duplicate.source_revision,root})).toThrow(/duplicate recovery/);
  });
  test('freeze rejects invalid, reused, stale generation and scope mismatch', () => {
    const root=repo(), c=checkpoint({work_id:'freeze',revision:1,lifecycle_state:'VERIFY',allowed_paths:['scope.txt'],fingerprint_paths:['scope.txt']});
    let file=save(root,c); expect(()=>runtime.freezeReviewPacket(file,{},1,c.source_revision)).toThrow(/packet invalid/);
    c.review_generation=1;c.review_generation_ledger=[{generation:1,packet_id:'packet',packet_version:1,wave:1}];file=save(root,c);
    expect(()=>runtime.freezeReviewPacket(file,packet(c,{generation:2}),1,c.source_revision)).toThrow(/cannot be reused/);
    c.review_generation_ledger=[];file=save(root,c);expect(()=>runtime.freezeReviewPacket(file,packet(c,{generation:3}),1,c.source_revision)).toThrow(/strictly newer/);
    file=save(root,{...c,review_generation:0});expect(()=>runtime.freezeReviewPacket(file,packet({...c,review_generation:0},{review_scope:{paths:['other'],absence_assertions:{}}}),1,c.source_revision)).toThrow(/scope mismatch/);
  });

  test('fresh packet generation may retain protocol packet version one', () => {
    const root=repo(),c=checkpoint({work_id:'fresh-version',revision:1,lifecycle_state:'VERIFY',allowed_paths:['scope.txt'],fingerprint_paths:['scope.txt'],review_generation:1,review_generation_ledger:[{generation:1,packet_id:'packet-1',packet_version:1,wave:1}]});
    const file=save(root,c),fresh=packet(c,{packet_id:'packet-2',packet_version:1,wave:2,generation:2});
    const next=runtime.freezeReviewPacket(file,fresh,1,c.source_revision);
    expect(next.review_packet).toMatchObject({packet_id:'packet-2',packet_version:1,wave:2,generation:2});
    expect(next.review_generation_ledger).toEqual([
      {generation:1,packet_id:'packet-1',packet_version:1,wave:1},
      {generation:2,packet_id:'packet-2',packet_version:1,wave:2}
    ]);
  });

  test('dispatch, review and reverse replay identities fail closed', () => {
    const root=repo(), c=checkpoint({work_id:'receipts',revision:1,lifecycle_state:'VERIFY',allowed_paths:['scope.txt'],fingerprint_paths:['scope.txt']}); const p=packet(c);
    Object.assign(c,{review_packet:p,review_generation:1,review_generation_ledger:[{generation:1,packet_id:p.packet_id,packet_version:1,wave:1}]});
    const set=dispatch(c,p), dir=path.join(root,'.agent','work',c.work_id);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'dispatch.json'),JSON.stringify(set));c.dispatch_attestation_set={packet_id:p.packet_id,packet_version:1,wave:1,pointer:'dispatch.json'};
    let file=save(root,c);expect(()=>runtime.recordDispatchAttestationSet(file,set,1,c.source_revision,root)).toThrow(/unissued verify/);
    const wrongDispatch={...c,lifecycle_state:'DELIVERY',dispatch_attestation_set:null},wrongDispatchFile=save(root,wrongDispatch);
    expect(()=>runtime.recordDispatchAttestationSet(wrongDispatchFile,set,1,c.source_revision,root)).toThrow(/^dispatch set requires unissued verify$/);
    const firstReview=review(c,p,0);c.reviews=[firstReview];file=save(root,c);expect(()=>runtime.recordReviewReceipt(file,review(c,p,1,{reviewer_id:firstReview.reviewer_id}),1,c.source_revision,root)).toThrow(/root-attested|duplicate/);
    c.reviews=[];file=save(root,c);const clean=runtime.recordReviewReceipt(file,firstReview,1,c.source_revision,root);expect(clean).toMatchObject({reviews:[firstReview],next_action:expect.stringMatching(/remaining reviews/)});
    c.reviews=[0,1,2].map(n=>review(c,p,n));const firstReverse=reverse(c,p,0);c.verification=[firstReverse];
    for(const override of [{receipt_id:firstReverse.receipt_id},{type:firstReverse.type},{reviewer_id:firstReverse.reviewer_id}]) {
      file=save(root,c);expect(()=>runtime.recordReverseValidationReceipt(file,reverse(c,p,1,override),1,c.source_revision,root)).toThrow(/replay/);
    }
  });

  test('dispatch rejects an unsafe attestation path after validating its binding', () => {
    const root=repo(),c=checkpoint({work_id:'dispatch-path',revision:1,lifecycle_state:'VERIFY',allowed_paths:['scope.txt'],fingerprint_paths:['scope.txt']}),p=packet(c,{profile_attestation_set:'../dispatch.json'});Object.assign(c,{review_packet:p,review_generation:1,review_generation_ledger:[{generation:1,packet_id:p.packet_id,packet_version:1,wave:1}]});
    const file=save(root,c);expect(()=>runtime.recordDispatchAttestationSet(file,dispatch(c,p),1,c.source_revision,root)).toThrow(/dispatch set path unsafe/);
    const validPacket=packet(c);c.review_packet=validPacket;fs.writeFileSync(file,JSON.stringify(c));expect(()=>runtime.recordDispatchAttestationSet(file,{...dispatch(c,validPacket),work_id:'other'},1,c.source_revision,root)).toThrow(/binding invalid/);
    const outside=fs.mkdtempSync(path.join(os.tmpdir(),'dispatch-junction-target-')),workDir=path.dirname(file),moved=path.join(outside,c.work_id);
    fs.renameSync(workDir,moved);fs.symlinkSync(moved,workDir,'junction');
    expect(()=>runtime.recordDispatchAttestationSet(file,dispatch(c,validPacket),1,c.source_revision,root)).toThrow(/reparse point/);
  });

  test('dispatch normalizes a repository-relative in-work attestation pointer once', () => {
    const root=repo(),c=checkpoint({work_id:'dispatch-repository-relative',revision:1,lifecycle_state:'VERIFY',allowed_paths:['scope.txt'],fingerprint_paths:['scope.txt']}),p=packet(c,{profile_attestation_set:`.agent/work/${c.work_id}/dispatch.json`});
    Object.assign(c,{review_packet:p,review_generation:1,review_generation_ledger:[{generation:1,packet_id:p.packet_id,packet_version:1,wave:1}]});
    const file=save(root,c),set=dispatch(c,p),next=runtime.recordDispatchAttestationSet(file,set,1,c.source_revision,root);
    expect(next.dispatch_attestation_set.pointer).toBe('dispatch.json');
    expect(fs.readFileSync(path.join(root,'.agent','work',c.work_id,'dispatch.json'),'utf8')).toBe(`${JSON.stringify(set,null,2)}\n`);
    expect(fs.existsSync(path.join(root,'.agent','work',c.work_id,'.agent'))).toBe(false);
  });

  test('a nonclean review is recorded once and directs correction', () => {
    const root=repo(),c=checkpoint({work_id:'nonclean',revision:1,lifecycle_state:'VERIFY',allowed_paths:['scope.txt'],fingerprint_paths:['scope.txt']}),p=packet(c),set=dispatch(c,p);Object.assign(c,{review_packet:p,review_generation:1,review_generation_ledger:[{generation:1,packet_id:p.packet_id,packet_version:1,wave:1}],dispatch_attestation_set:{packet_id:p.packet_id,packet_version:1,wave:1,pointer:'dispatch.json'}});const dir=path.join(root,'.agent','work',c.work_id);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'dispatch.json'),JSON.stringify(set));const file=save(root,c),receipt=review(c,p,0,{verdict:'changes_required',findings:['fix']});const next=runtime.recordReviewReceipt(file,receipt,1,c.source_revision,root);expect(next.next_action).toBe('Begin bounded correction.');expect(next.reviews).toHaveLength(1);
    const wrong={...c,lifecycle_state:'DELIVERY'},wrongFile=save(root,wrong);expect(()=>runtime.recordReviewReceipt(wrongFile,receipt,1,c.source_revision,root)).toThrow(/review receipt requires verify/);
  });

  test('recovery, evidence and import duplicate IDs are rejected', () => {
    const root=repo(), c=checkpoint({work_id:'typed-duplicates',revision:1,lifecycle_state:'VERIFY'});
    /** @type {Array<[string, any, Function]>} */
    const duplicateCases = [['recovery_evidence',recovery(c),runtime.recordRecoveryEvidence],['evidence',evidence(c),runtime.recordEvidence],['imports',imported(c),runtime.recordImportAttribution]];
    for(const [field,item,call] of duplicateCases) {
      const clean={...c,[field]:[]},cleanFile=save(root,clean),next=call(cleanFile,item,1,c.source_revision);
      expect(next[field]).toEqual([item]);expect(next.next_action).toMatch(/Continue/);
      expect(()=>call(cleanFile,item,next.revision,c.source_revision)).toThrow(/^duplicate/);
      const wrong={...c,lifecycle_state:'EXECUTE',[field]:[]},wrongFile=save(root,wrong);
      const label=field==='recovery_evidence'?'recovery evidence':field==='evidence'?'evidence':'import attribution';
      expect(()=>call(wrongFile,item,1,c.source_revision)).toThrow(new RegExp(`^${label} requires verify/delivery$`));
    }
  });

  test('reverse validation requires verify, three valid reviews and one valid receipt before persistence',()=>{
    const root=repo(),c=checkpoint({work_id:'reverse-contract',revision:1,lifecycle_state:'VERIFY',allowed_paths:['scope.txt'],fingerprint_paths:['scope.txt']}),p=packet(c),set=dispatch(c,p),dir=path.join(root,'.agent','work',c.work_id);
    Object.assign(c,{review_packet:p,review_generation:1,review_generation_ledger:[{generation:1,packet_id:p.packet_id,packet_version:1,wave:1}],dispatch_attestation_set:{packet_id:p.packet_id,packet_version:1,wave:1,pointer:'dispatch.json'},reviews:[0,1,2].map(n=>review(c,p,n)),verification:[]});
    fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'dispatch.json'),JSON.stringify(set));
    const receipt=reverse(c,p,0),file=save(root,c),next=runtime.recordReverseValidationReceipt(file,receipt,1,c.source_revision,root);
    expect(next).toMatchObject({verification:[receipt],next_action:'Record remaining reverse-validation receipts.'});
    for(const broken of [{...c,lifecycle_state:'DELIVERY'},{...c,reviews:c.reviews.slice(0,2)}]) { const brokenFile=save(root,broken);expect(()=>runtime.recordReverseValidationReceipt(brokenFile,receipt,1,c.source_revision,root)).toThrow(/^reverse validation requires three reviews$/); }
    const invalidReviews={...c,reviews:[{},c.reviews[1],c.reviews[2]]},invalidReviewsFile=save(root,invalidReviews);expect(()=>runtime.recordReverseValidationReceipt(invalidReviewsFile,receipt,1,c.source_revision,root)).toThrow();
    const invalidFile=save(root,c);expect(()=>runtime.recordReverseValidationReceipt(invalidFile,{},1,c.source_revision,root)).toThrow(/reverse validation invalid/);
  });

  test('delivery/runtime duplicates and incomplete correction are rejected before mutation', () => {
    const root=repo(), c=checkpoint({work_id:'delivery-replay',revision:1,lifecycle_state:'DELIVERY',delivery_receipt:{schema:'DeliveryReceipt/v2'}});let file=save(root,c);
    expect(()=>runtime.recordDeliveryReceipt(file,{},1,c.source_revision)).toThrow(/delivery receipt requires/);
    c.runtime_receipt={schema:'RuntimeReceipt/v2'};file=save(root,c);expect(()=>runtime.recordRuntimeReceipt(file,{},1,c.source_revision)).toThrow(/runtime receipt requires/);
    const verify=checkpoint({work_id:'correction',revision:1,lifecycle_state:'VERIFY'});file=save(root,verify);expect(()=>runtime.beginCorrection(file,{expectedRevision:1,sourceRevision:verify.source_revision,correction:{reason:''}})).toThrow(/correction reason|bounded correction/);
  });

  test('fingerprint drift blocks delivery and completion before state advancement', () => {
    const root=repo(), verify=checkpoint({work_id:'fingerprint-verify',revision:1,lifecycle_state:'VERIFY',allowed_paths:['scope.txt'],fingerprint_paths:['scope.txt']});let file=save(root,verify);
    expect(()=>runtime.advanceToDelivery(file,{expectedRevision:1,sourceRevision:verify.source_revision,root})).toThrow(/implementation scope changed/);
    const delivery=checkpoint({work_id:'fingerprint-delivery',revision:1,lifecycle_state:'DELIVERY',allowed_paths:['scope.txt'],fingerprint_paths:['scope.txt']});file=save(root,delivery);
    expect(()=>runtime.completeWork(file,{expectedRevision:1,sourceRevision:delivery.source_revision,root})).toThrow(/implementation scope changed/);
    const cwdVerify=checkpoint({work_id:'cwd-verify',revision:1,lifecycle_state:'VERIFY',allowed_paths:['scope.txt'],fingerprint_paths:['scope.txt']}),cwdFile=save(root,cwdVerify);
    expect(()=>runtime.advanceToDelivery(cwdFile,{expectedRevision:1,sourceRevision:cwdVerify.source_revision})).toThrow();
    const cwdDelivery=checkpoint({work_id:'cwd-delivery',revision:1,lifecycle_state:'DELIVERY',allowed_paths:['scope.txt'],fingerprint_paths:['scope.txt']}),completeFile=save(root,cwdDelivery);
    expect(()=>runtime.completeWork(completeFile,{expectedRevision:1,sourceRevision:cwdDelivery.source_revision})).toThrow();
  });

  test('delivery and runtime receipt structural, cycle, timestamp and pointer alternatives fail closed', () => {
    const root=repo(), c=checkpoint({work_id:'receipt-shapes',revision:1,lifecycle_state:'DELIVERY',verification_completed_at:new Date().toISOString(),delivery_cycle_id:'cycle'}),file=save(root,c);
    const base={schema:'DeliveryReceipt/v2',...bind(c),delivery_cycle_id:'wrong',decision:'approved',actor:'user',source:'chat',timestamp:new Date(Date.now()+20).toISOString(),sanitized_pointers:['WORK.md#ok'],deployment_manifest:deploymentManifest({...c,delivery_cycle_id:'wrong'})};
    expect(()=>runtime.recordDeliveryReceipt(file,base,1,c.source_revision)).toThrow(/cycle/);
    expect(()=>runtime.recordDeliveryReceipt(file,{...base,delivery_cycle_id:'cycle',sanitized_pointers:[]},1,c.source_revision)).toThrow(/pointers/);
    expect(()=>runtime.recordDeliveryReceipt(file,{...base,delivery_cycle_id:'cycle',timestamp:'2000-01-01T00:00:00Z'},1,c.source_revision)).toThrow(/predates/);
    const approved={...base,delivery_cycle_id:'cycle'};c.delivery_receipt=approved;fs.writeFileSync(file,JSON.stringify(c));
    const receipt={schema:'RuntimeReceipt/v2',...bind(c),status:'accepted',blocking:false,environment:'dev',actor:'tester',timestamp:new Date(Date.now()+30).toISOString(),ac_refs:['AC-QUALITY-1'],sanitized_pointers:[]};
    expect(()=>runtime.recordRuntimeReceipt(file,receipt,1,c.source_revision)).toThrow(/attributable pointers/);
    expect(()=>runtime.recordRuntimeReceipt(file,{...receipt,status:'unknown'},1,c.source_revision)).toThrow(/runtime receipt invalid/);
    expect(()=>runtime.recordRuntimeReceipt(file,{...receipt,blocking:'yes'},1,c.source_revision)).toThrow(/runtime receipt invalid/);
  });

  test('validateGateFile and CLI reject missing/stale inputs while checkpoint commands succeed', () => {
    const root=repo(), work=path.join(root,'.agent','work','cli');fs.mkdirSync(work,{recursive:true});const c=checkpoint({work_id:'cli',revision:1,lifecycle_state:'TRACE',allowed_paths:['scope.txt'],fingerprint_paths:['scope.txt'],sealed_at:undefined,sealed_revision:undefined,implementation_fingerprint:undefined}),file=path.join(work,'resume.json');fs.writeFileSync(file,JSON.stringify(c));
    expect(()=>runtime.validateGateFile({})).toThrow(/checkpointPath missing/);
    for(const missing of ['repoRoot','point','sourceRevision']) { const input={checkpointPath:file,repoRoot:root,point:'plan:pre',sourceRevision:c.source_revision,expectedRevision:1};delete input[missing];expect(()=>runtime.validateGateFile(input)).toThrow(/missing/); }
    expect(()=>runtime.validateGateFile({checkpointPath:file,repoRoot:root,point:'plan:pre',sourceRevision:c.source_revision})).toThrow(/expectedRevision/);
    expect(()=>runtime.validateGateFile({checkpointPath:file,repoRoot:root,point:'plan:pre',sourceRevision:c.source_revision,expectedRevision:2})).toThrow(/expected revision/);
    expect(()=>runtime.validateGateFile({checkpointPath:file,repoRoot:root,point:'bad',sourceRevision:c.source_revision,expectedRevision:1})).toThrow(/unsupported/);
    const logs=[],old=console.log;console.log=x=>logs.push(x);try{runtime.runCli(['validate-checkpoint',file]);runtime.runCli(['validate-gate',file,'plan:pre','1',c.source_revision]);expect(()=>runtime.runCli(['validate-gate',file,'bad','1',c.source_revision])).toThrow(/unsupported/);}finally{console.log=old;}expect(logs).toContain('checkpoint: valid');expect(logs).toContain('gate: plan:pre valid');
  });

  test('CLI seal-mutation succeeds once and rejects stale replay', () => {
    const root=repo(),c=checkpoint({work_id:'cli-seal',revision:1,lifecycle_state:'EXECUTE',allowed_paths:['scope.txt'],fingerprint_paths:['scope.txt'],sealed_at:undefined,sealed_revision:undefined,implementation_fingerprint:undefined}),file=save(root,c);
    const cli=path.resolve(__dirname,'../../bin/runtime.cjs');
    const first=execFileSync(process.execPath,[cli,'seal-mutation',file,'1',c.source_revision],{cwd:root,encoding:'utf8'});
    expect(JSON.parse(first).revision).toBe(2);
    expect(()=>execFileSync(process.execPath,[cli,'seal-mutation',file,'1',c.source_revision],{cwd:root,encoding:'utf8',stdio:'pipe'})).toThrow();
  });
});
