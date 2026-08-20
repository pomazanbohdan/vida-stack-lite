'use strict';
const fs=require('fs');
const os=require('os');
const path=require('path');
const runtime=require('../../lib/runtime.cjs');
const {checkpoint}=require('./fixtures.cjs');

function repo(){const root=fs.mkdtempSync(path.join(os.tmpdir(),'runtime-reservation-'));fs.mkdirSync(path.join(root,'.git'));return root;}
function binding(c){return {work_id:c.work_id,source_revision:c.source_revision,sealed_revision:c.sealed_revision,implementation_fingerprint:c.implementation_fingerprint,acceptance_manifest_id:c.acceptance_manifest.id,acceptance_manifest_version:c.acceptance_manifest.version};}
function packet(c,generation=1){return {schema:'BlindReviewPacket/v2',status:'frozen',...binding(c),packet_id:`packet-${generation}`,packet_version:1,wave:generation,generation,required_profile:{model:'configured',reasoning:'high'},review_scope:{paths:c.fingerprint_paths,absence_assertions:{}},profile_attestation_set:`dispatch-${generation}.json`};}
function reservation(c,p,overrides={}){return {schema:'ReviewDispatchReservation/v1',status:'complete',...binding(c),packet_id:p.packet_id,packet_version:p.packet_version,wave:p.wave,generation:p.generation,requested_model:'configured',requested_reasoning_effort:'high',reserved_at:new Date().toISOString(),entries:runtime.lenses.map((lens,n)=>({handle_id:`handle-${p.generation}-${n}`,task_id:`task-${p.generation}-${n}`,dispatch_id:`dispatch-${p.generation}-${n}`,reviewer_id:`reviewer-${p.generation}-${n}`,lens})),...overrides};}
function attestation(c,p,r){return {schema:'DispatchProfileAttestationSet/v1',...binding(c),packet_id:p.packet_id,packet_version:p.packet_version,wave:p.wave,orchestrator:'root',selector_source:'test',requested_model:'configured',requested_reasoning_effort:'high',runtime_metadata_observed:false,issued_at:new Date().toISOString(),root_task_id:'root-task',root_dispatch_id:'root-dispatch',entries:r.entries.map(entry=>({task_id:entry.task_id,dispatch_id:entry.dispatch_id,reviewer_id:entry.reviewer_id,lens:entry.lens,profile_verified:true,profile_verification:{verified_model:'configured',verified_reasoning_effort:'high',verification_source:'tests/profile',verification_pointer:`tests/${entry.handle_id}`,verified_at:new Date().toISOString()}}))};}
function state(root,generation=1,ledger=[]){const base=checkpoint({work_id:`reservation-${generation}`,revision:1,protocol_version:'agent-development-runtime/v3',coordination:{schema:'CoordinationBinding/v1',work_id:`reservation-${generation}`,thread_id:'thread',ticket_id:'ticket',generation:1,exclusive_resources:['file:scope.txt'],active_resources:['file:scope.txt'],blocked_resources:[]},review_generation:generation,review_dispatch_reservation_ledger:ledger}),p=packet(base,generation),c={...base,review_packet:p,review_generation_ledger:[{generation,packet_id:p.packet_id,packet_version:1,wave:generation}]};const dir=path.join(root,'.agent','work',c.work_id);fs.mkdirSync(dir,{recursive:true});const file=path.join(dir,'resume.json');fs.writeFileSync(file,JSON.stringify(c));return {c,p,file};}
function read(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function blocked(action,message){let error;try{action();}catch(caught){error=caught;}expect(error).toBeInstanceOf(Error);expect({message:error.message,code:error.code}).toEqual({message,code:'GATE_BLOCKED'});}

describe('protocol v3 review handle reservation',()=>{
  test('missing, partial, cancelled and duplicate reservations fail atomically before dispatch authority',()=>{const root=repo(),{c,p,file}=state(root),valid=reservation(c,p);for(const invalid of [{...valid,entries:valid.entries.slice(0,2)},{...valid,status:'cancelled'},{...valid,entries:[valid.entries[0],valid.entries[0],valid.entries[2]]}]){expect(()=>runtime.recordReviewDispatchReservation(file,invalid,1,c.source_revision)).toThrow(/complete review dispatch reservation|entry invalid/);const persisted=read(file);expect(persisted.revision).toBe(1);expect(persisted).not.toHaveProperty('review_dispatch_reservation');expect(persisted).not.toHaveProperty('dispatch_attestation_set');}expect(()=>runtime.recordDispatchAttestationSet(file,attestation(c,p,valid),1,c.source_revision,root)).toThrow(/current complete reservation/);expect(read(file).revision).toBe(1);});

  test('one atomic reservation binds three actual handles and exact dispatch identities',()=>{const root=repo(),{c,p,file}=state(root),reserved=reservation(c,p);let next=runtime.recordReviewDispatchReservation(file,reserved,1,c.source_revision);expect(next).toMatchObject({revision:2,review_dispatch_reservation:{schema:'ReviewDispatchReservation/v1',status:'complete'},review_dispatch_reservation_ledger:[{generation:1,packet_id:'packet-1',handle_ids:['handle-1-0','handle-1-1','handle-1-2']}]});expect(()=>runtime.recordReviewDispatchReservation(file,reserved,2,c.source_revision)).toThrow(/unreserved verify/);const wrong=attestation(next,p,reserved);wrong.entries[0]={...wrong.entries[0],dispatch_id:'foreign-dispatch'};expect(()=>runtime.recordDispatchAttestationSet(file,wrong,2,c.source_revision,root)).toThrow(/current complete reservation/);expect(read(file).revision).toBe(2);next=runtime.recordDispatchAttestationSet(file,attestation(next,p,reserved),2,c.source_revision,root);expect(next).toMatchObject({revision:3,dispatch_attestation_set:{packet_id:'packet-1',packet_version:1,wave:1,pointer:'dispatch-1.json'}});});

  test('a handle from an earlier generation is stale and v2 remains compatible',()=>{const root=repo(),prior=[{generation:1,packet_id:'packet-1',handle_ids:['handle-2-0','old-1','old-2']}],{c,p,file}=state(root,2,prior),reused=reservation(c,p);expect(()=>runtime.recordReviewDispatchReservation(file,reused,1,c.source_revision)).toThrow(/entry invalid or stale/);const v2=checkpoint({work_id:'reservation-v2',revision:1,review_generation:1}),v2packet=packet(v2),legacy={...v2,review_packet:v2packet,review_generation_ledger:[{generation:1,packet_id:v2packet.packet_id,packet_version:1,wave:1}]},dir=path.join(root,'.agent','work',legacy.work_id);fs.mkdirSync(dir,{recursive:true});const v2file=path.join(dir,'resume.json');fs.writeFileSync(v2file,JSON.stringify(legacy));const r=reservation(legacy,v2packet);expect(()=>runtime.recordReviewDispatchReservation(v2file,r,1,legacy.source_revision)).toThrow(/requires protocol v3/);expect(read(v2file).revision).toBe(1);expect(runtime.recordDispatchAttestationSet(v2file,attestation(legacy,v2packet,r),1,legacy.source_revision,root).revision).toBe(2);});

  test('malformed persisted ledger, reservation and operation state fail closed',()=>{const root=repo(),{c,p,file}=state(root),valid=reservation(c,p);for(const ledger of [[null],[{generation:1,packet_id:'packet',handle_ids:'not-array'}],[{generation:'1',packet_id:'packet',handle_ids:['one','two','three']}],[{generation:0,packet_id:'packet',handle_ids:['one','two','three']}],[{generation:1,packet_id:'',handle_ids:['one','two','three']}],[{generation:1,packet_id:'packet',handle_ids:['one','two']}],[{generation:1,packet_id:'packet',handle_ids:['one','two','three','four']}],[{generation:1,packet_id:'packet',handle_ids:['one','two','two']}]] )expect(()=>runtime.assertCheckpoint({...c,review_dispatch_reservation_ledger:ledger})).toThrow(/reservation ledger|packet id/);for(const invalid of [null,{...valid,entries:{}},{...valid,entries:[null,valid.entries[1],valid.entries[2]]}])expect(()=>runtime.validateReviewDispatchReservation(invalid,c,p)).toThrow(/complete review dispatch reservation|entry invalid/);const persisted={...c,review_dispatch_reservation:valid,review_dispatch_reservation_ledger:[{generation:1,packet_id:p.packet_id,handle_ids:['different-0','different-1','different-2']}]};expect(()=>runtime.assertCheckpoint(persisted)).toThrow(/ledger mismatch/);for(const changed of [{lifecycle_state:'PLAN'},{dispatch_attestation_set:{pointer:'dispatch.json'}}]){fs.writeFileSync(file,JSON.stringify({...c,...changed}));expect(()=>runtime.recordReviewDispatchReservation(file,valid,1,c.source_revision)).toThrow(/unreserved verify/);expect(read(file).revision).toBe(1);}});

  test('reservation validator distinguishes every identity, packet, profile, freshness and timestamp boundary',()=>{
    const root=repo(),{c,p}=state(root),valid=reservation(c,p),core='complete review dispatch reservation required',entry='review dispatch reservation entry invalid or stale';
    expect(runtime.validateReviewDispatchReservation(valid,c,p)).toBe(valid);
    const coreCases=[
      null,{...valid,schema:'ReviewDispatchReservation/v0'},{...valid,status:'cancelled'},{...valid,entries:valid.entries.slice(0,2)},
      {...valid,generation:p.generation+1},{...valid,packet_id:'other'},{...valid,packet_version:p.packet_version+1},{...valid,wave:p.wave+1},
      {...valid,requested_model:'other'},{...valid,requested_reasoning_effort:'other'}
    ];
    for(const value of coreCases)blocked(()=>runtime.validateReviewDispatchReservation(value,c,p),core);
    blocked(()=>runtime.validateReviewDispatchReservation({...valid,reserved_at:'2000-01-01T00:00:00.000Z'},c,p),'review dispatch reservation timestamp predates required seal');
    const fields=[['handle_id','review handle id missing'],['task_id','reserved task id missing'],['dispatch_id','reserved dispatch id missing'],['reviewer_id','reserved reviewer id missing']];
    for(const [field,message] of fields){const entries=valid.entries.map(x=>({...x}));entries[0][field]='';blocked(()=>runtime.validateReviewDispatchReservation({...valid,entries},c,p),message);}
    for(const lens of runtime.lenses){const entries=valid.entries.map(x=>({...x}));entries[0].lens=lens;entries[1].lens=runtime.lenses.find(x=>x!==lens);entries[2].lens=runtime.lenses.find(x=>x!==lens&&x!==entries[1].lens);expect(runtime.validateReviewDispatchReservation({...valid,entries},c,p)).toBeTruthy();}
    const duplicateFields=['handle_id','task_id','dispatch_id','reviewer_id','lens'];
    for(const field of duplicateFields){const entries=valid.entries.map(x=>({...x}));entries[1][field]=entries[0][field];blocked(()=>runtime.validateReviewDispatchReservation({...valid,entries},c,p),entry);}
    const prior={...c,review_dispatch_reservation_ledger:[{generation:0,packet_id:'prior',handle_ids:[valid.entries[0].handle_id,'prior-1','prior-2']}]};
    blocked(()=>runtime.validateReviewDispatchReservation(valid,prior,p),entry);
    const currentPrior={...c,review_dispatch_reservation_ledger:[{generation:p.generation,packet_id:'prior-current',handle_ids:[valid.entries[0].handle_id,'prior-1','prior-2']}]};
    blocked(()=>runtime.validateReviewDispatchReservation(valid,currentPrior,p),entry);
    const stored={...c,review_dispatch_reservation_ledger:[{generation:p.generation,packet_id:p.packet_id,handle_ids:valid.entries.map(x=>x.handle_id)}]};
    expect(runtime.validateReviewDispatchReservation(valid,stored,p,true)).toBe(valid);
    for(const field of ['work_id','source_revision','sealed_revision','implementation_fingerprint','acceptance_manifest_id','acceptance_manifest_version']){
      const changed=field==='implementation_fingerprint'?'b'.repeat(64):field.includes('revision')||field.includes('version')?99:'other';
      blocked(()=>runtime.validateReviewDispatchReservation({...valid,[field]:changed},c,p),'review dispatch reservation binding invalid');
    }
  });

  test('stored reservation ledger and attestation match every identity independently',()=>{
    const root=repo(),{c,p,file}=state(root),valid=reservation(c,p),matching={generation:p.generation,packet_id:p.packet_id,handle_ids:valid.entries.map(x=>x.handle_id)};
    expect(()=>runtime.assertCheckpoint({...c,review_dispatch_reservation:valid,review_dispatch_reservation_ledger:[{generation:99,packet_id:'other',handle_ids:['x','y','z']},matching]})).not.toThrow();
    for(const ledger of [
      [{...matching,generation:99,handle_ids:['x','y','z']}],[{...matching,packet_id:'other'}],[{...matching,handle_ids:['x','y','z']}]
    ])blocked(()=>runtime.assertCheckpoint({...c,review_dispatch_reservation:valid,review_dispatch_reservation_ledger:ledger}),'stored review dispatch reservation ledger mismatch');
    let next=runtime.recordReviewDispatchReservation(file,valid,c.revision,c.source_revision);
    const base=attestation(next,p,valid);
    for(const field of ['task_id','dispatch_id','reviewer_id','lens']){
      const entries=base.entries.map(x=>({...x}));
      if(field==='lens')[entries[0].lens,entries[1].lens]=[entries[1].lens,entries[0].lens];else entries[0][field]=`other-${field}`;
      expect(()=>runtime.recordDispatchAttestationSet(file,{...base,entries},next.revision,next.source_revision,root)).toThrow();
    }
  });
});
