'use strict';
/* global vi */

const fs=require('fs');
const os=require('os');
const path=require('path');
const {execFileSync}=require('child_process');
const Ajv2020=require('ajv/dist/2020').default;
const runtime=require('../../lib/runtime.cjs');
const {checkpoint,fixtures}=require('./fixtures.cjs');

function clone(value){return JSON.parse(JSON.stringify(value));}
function binding(c){return {work_id:c.work_id,source_revision:c.source_revision,sealed_revision:c.sealed_revision,implementation_fingerprint:c.implementation_fingerprint,acceptance_manifest_id:c.acceptance_manifest.id,acceptance_manifest_version:c.acceptance_manifest.version};}
function repo(){const root=fs.mkdtempSync(path.join(os.tmpdir(),'runtime-profile-attestation-'));execFileSync('git',['init','-q'],{cwd:root});execFileSync('git',['config','user.email','profile@example.test'],{cwd:root});execFileSync('git',['config','user.name','profile-test'],{cwd:root});fs.writeFileSync(path.join(root,'scope.txt'),'scope');execFileSync('git',['add','.'],{cwd:root});execFileSync('git',['commit','-qm','base'],{cwd:root});return root;}
function gateFixture(){
  const root=repo(),base=checkpoint({work_id:'profile-gate',revision:9,lifecycle_state:'VERIFY',allowed_paths:['scope.txt'],fingerprint_paths:['scope.txt'],review_generation:1}),fingerprint=runtime.implementationFingerprint({fingerprint_paths:['scope.txt']},root),c={...base,implementation_fingerprint:fingerprint},bind=binding(c);
  const p={...clone(fixtures()['blind-review-packet.v2.schema.json']),...bind,packet_id:'profile-packet',generation:1,review_scope:{paths:['scope.txt'],absence_assertions:{}},profile_attestation_set:'dispatch.json'};
  const set={...clone(fixtures()['dispatch-profile-attestation-set.v1.schema.json']),...bind,packet_id:p.packet_id,packet_version:p.packet_version,wave:p.wave,issued_at:new Date().toISOString(),entries:clone(fixtures()['dispatch-profile-attestation-set.v1.schema.json'].entries).map(entry=>({...entry,profile_verification:{...entry.profile_verification,verified_at:new Date().toISOString()}}))};
  const reviews=set.entries.map((entry,index)=>({schema:'ReviewReceipt/v2',...bind,reviewer_id:entry.reviewer_id,dispatch_task_id:entry.task_id,dispatch_id:entry.dispatch_id,lens:entry.lens,history_isolation:true,findings:[],verdict:'clean',packet_id:p.packet_id,packet_version:p.packet_version,wave:p.wave,index}));
  Object.assign(c,{review_packet:p,review_generation_ledger:[{generation:1,packet_id:p.packet_id,packet_version:p.packet_version,wave:p.wave}],dispatch_attestation_set:{packet_id:p.packet_id,packet_version:p.packet_version,wave:p.wave,pointer:'dispatch.json'},reviews});
  const directory=path.join(root,'.agent','work',c.work_id);fs.mkdirSync(directory,{recursive:true});
  return {root,c,p,set,file:path.join(directory,'dispatch.json')};
}

describe('dispatch profile attestation assurance',()=>{
  test('canonical verified evidence passes runtime and JSON schema',()=>{
    const values=fixtures(),set=values['dispatch-profile-attestation-set.v1.schema.json'],packet=values['blind-review-packet.v2.schema.json'],c=checkpoint({review_generation:1});
    expect(runtime.validateAttestationSet(set,packet,c)).toEqual(set);
    const schema=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../schemas/dispatch-profile-attestation-set.v1.schema.json'),'utf8'));
    expect(new Ajv2020({strict:false,validateFormats:false}).compile(schema)(set)).toBe(true);
  });

  test('false, missing, mismatched, stale and unsafe per-entry verification fails closed',()=>{
    const values=fixtures(),set=values['dispatch-profile-attestation-set.v1.schema.json'],packet=values['blind-review-packet.v2.schema.json'],c=checkpoint({review_generation:1});
    const cases=[
      entry=>{entry.profile_verified=false;},
      entry=>{delete entry.profile_verified;},
      entry=>{delete entry.profile_verification;},
      entry=>{entry.profile_verification.verified_model='other';},
      entry=>{entry.profile_verification.verified_reasoning_effort='low';},
      entry=>{entry.profile_verification.verification_source='secret=value';},
      entry=>{entry.profile_verification.verification_pointer='Authorization: bearer value';},
      entry=>{entry.profile_verification.verified_at='2026-08-16T11:59:59.999Z';},
      entry=>{entry.profile_verification.verified_at=new Date(Date.now()+600000).toISOString();}
    ];
    for(const mutate of cases){const invalid=clone(set);mutate(invalid.entries[0]);expect(()=>runtime.validateAttestationSet(invalid,packet,c)).toThrow();}
  });

  test('profile, packet and duplicate identity guards preserve exact public failures',()=>{
    const values=fixtures(),set=values['dispatch-profile-attestation-set.v1.schema.json'],packet=values['blind-review-packet.v2.schema.json'],c=checkpoint({review_generation:1});
    const fieldCases=[
      ['verified_model','verified model missing'],
      ['verified_reasoning_effort','verified reasoning effort missing'],
      ['verification_source','profile verification source missing'],
      ['verification_pointer','profile verification pointer missing'],
      ['verified_at','profile verification timestamp missing']
    ];
    for(const [field,message] of fieldCases){const invalid=clone(set);invalid.entries[0].profile_verification[field]='';expect(()=>runtime.validateAttestationSet(invalid,packet,c)).toThrow(new RegExp(`^${message}$`));}
    expect(()=>runtime.validateAttestationSet(set,packet,null)).toThrow(/^dispatch set checkpoint required$/);
    expect(()=>runtime.validateAttestationSet({...clone(set),orchestrator:''},packet,c)).toThrow(/^dispatch set orchestrator missing$/);
    expect(()=>runtime.validateAttestationSet({...clone(set),work_id:'other'},packet,c)).toThrow(/^dispatch set binding invalid$/);
    expect(()=>runtime.validateAttestationSet({...clone(set),issued_at:'2026-08-16T11:59:59.999Z'},packet,c)).toThrow(/^dispatch set timestamp predates required seal$/);
    expect(()=>runtime.validateAttestationSet({...clone(set),packet_id:'other'},packet,c)).toThrow(/^dispatch set packet\/profile mismatch$/);
    const mismatchedModel=clone(set);mismatchedModel.entries[0].profile_verification.verified_model='other';expect(()=>runtime.validateAttestationSet(mismatchedModel,packet,c)).toThrow(/^dispatch entry profile verification mismatch$/);
    const staleProfile=clone(set);staleProfile.entries[0].profile_verification.verified_at='2026-08-16T11:59:59.999Z';expect(()=>runtime.validateAttestationSet(staleProfile,packet,c)).toThrow(/^profile verification timestamp predates required seal$/);
    for(const field of ['task_id','dispatch_id','reviewer_id','lens']){const invalid=clone(set);invalid.entries[1][field]=invalid.entries[0][field];expect(()=>runtime.validateAttestationSet(invalid,packet,c)).toThrow(/^dispatch set entry invalid$/);}
    for(const [field,source] of [['task_id','root_task_id'],['dispatch_id','root_dispatch_id']]){const invalid=clone(set);invalid.entries[0][field]=invalid[source];expect(()=>runtime.validateAttestationSet(invalid,packet,c)).toThrow(/^dispatch set entry invalid$/);}
  });

  test('attestation custody checks both the work root and receipt file for reparse points',()=>{
    const {root,c,set,file}=gateFixture();fs.writeFileSync(file,JSON.stringify(set));
    const original=fs.lstatSync,targets=[path.join(root,'.agent','work',c.work_id),file];
    for(const target of targets){const spy=vi.spyOn(fs,'lstatSync').mockImplementation(/** @type {any} */(value=>{const stat=original(value);return path.resolve(String(value))===path.resolve(target)?new Proxy(stat,{get(current,key){return key==='isSymbolicLink'?()=>true:Reflect.get(current,key);}}):stat;}));try{expect(()=>runtime.validateGate(c,'verify:pre',{expectedRevision:c.revision,sourceRevision:c.source_revision,root})).toThrow(/reparse point is not allowed/);}finally{spy.mockRestore();}}
  });

  test('verify gate rejects an unverified dispatch entry and accepts three attributable verified entries',()=>{
    const {root,c,set,file}=gateFixture();
    fs.writeFileSync(file,JSON.stringify(set));
    expect(runtime.validateGate(c,'verify:pre',{expectedRevision:c.revision,sourceRevision:c.source_revision,root})).toBe(true);
    const falseProfile=clone(set);falseProfile.entries[1].profile_verified=false;fs.writeFileSync(file,JSON.stringify(falseProfile));
    expect(()=>runtime.validateGate(c,'verify:pre',{expectedRevision:c.revision,sourceRevision:c.source_revision,root})).toThrow(/profile verification/);
    const missingProfile=clone(set);delete missingProfile.entries[2].profile_verified;fs.writeFileSync(file,JSON.stringify(missingProfile));
    expect(()=>runtime.validateGate(c,'verify:pre',{expectedRevision:c.revision,sourceRevision:c.source_revision,root})).toThrow(/profile verification/);
  });
});
