'use strict';

const fs=require('fs'),os=require('os'),path=require('path');
const projects=require('../../lib/project-context.cjs');
const {checkpoint,fixtures,projectRegistry}=require('./fixtures.cjs');

function registry(){return JSON.parse(JSON.stringify(projectRegistry));}
function context(){return fixtures()['project-context.v1.schema.json'];}
function projection(){return fixtures()['backlog-projection.v1.schema.json'];}
function receipt(){return fixtures()['user-testing-receipt.v1.schema.json'];}

describe('project context closed branch matrix',()=>{
  test('registry lookup and tenant/project resolution fail closed at every binding boundary',()=>{
    const empty=fs.mkdtempSync(path.join(os.tmpdir(),'project-registry-missing-'));
    expect(()=>projects.readRegistry(empty)).toThrow(/registry missing/);
    const current=registry(),base=context();
    expect(projects.resolveContext({...base,primary_project_id:null,ledger_id:'tenant:sample-tenant',task_id:'SAMPLE-TENANT-1'},current)).toMatchObject({project:null,ledger_root:'backlogs/tenants/sample-tenant/backlog',contour_keys:['tenant:sample-tenant']});
    for(const invalid of [null,{}, {...current,schemaVersion:'bad'}, {...current,tenants:null}])expect(()=>projects.resolveContext(base,invalid)).toThrow(/registry invalid/);
    for(const invalid of [{...base,extra:true},{...base,schema:'bad'}])expect(()=>projects.validateContextShape(invalid)).toThrow(/context invalid/);
    for(const invalid of [{...base,tenant_id:''},{...base,primary_project_id:''}])expect(()=>projects.validateContextShape(invalid)).toThrow(/identity/);
    for(const invalid of [{...base,wiki_roots:'wiki'},{...base,ledger_id:''},{...base,task_id:''},{...base,provider_revision:''}])expect(()=>projects.validateContextShape(invalid)).toThrow(/collections/);
    expect(()=>projects.resolveContext({...base,affected_project_ids:[]},current)).toThrow(/primary project/);
    expect(()=>projects.resolveContext({...base,affected_project_ids:['sample-project','missing']},current)).toThrow(/outside tenant/);
  });

  test('Backlog projection validation covers closed shape, binding, state and failure evidence',()=>{
    const ctx=context(),base=projection();
    expect(projects.validateProjection(base,ctx)).toBe(true);
    for(const invalid of [{...base,extra:true},{...base,schema:'bad'}])expect(()=>projects.validateProjection(invalid,ctx)).toThrow(/projection invalid/);
    for(const invalid of [{...base,ledger_id:'other'},{...base,task_id:'other'},{...base,provider_revision:'other'}])expect(()=>projects.validateProjection(invalid,ctx)).toThrow(/binding/);
    for(const invalid of [{...base,desired_status:'Unknown'},{...base,sync_status:'unknown'},{...base,observed_status:'Unknown'},{...base,updated_at:''}])expect(()=>projects.validateProjection(invalid,ctx)).toThrow(/state/);
    expect(()=>projects.validateProjection({...base,sync_status:'failed'},ctx)).toThrow(/failure evidence/);
    expect(()=>projects.validateProjection({...base,gap_pointer:'GAP-X'},ctx)).toThrow(/failure evidence/);
    expect(projects.validateProjection({...base,sync_status:'failed',gap_pointer:'GAP-X',error:'provider failed'},ctx)).toBe(true);
  });

  test('status projection includes returned delivery decisions and pending readback preservation',()=>{
    const base={lifecycle_state:'DELIVERY',reviews:[],verification:[],question_candidates:[],user_testing_receipts:[],delivery_receipt:{}};
    for(const decision of ['feedback','rejected'])expect(projects.desiredStatus({...base,user_testing_receipts:[{decision}]})).toBe('Returned for Rework');
    expect(projects.pendingProjection(context(),'In Review',projection())).toMatchObject({desired_status:'In Review',observed_status:'In Development',sync_status:'pending'});
  });

  test('user testing receipt shape, attribution and binding are independently closed',()=>{
    const c=checkpoint({delivery_cycle_id:'cycle-1'}),base=receipt();
    expect(projects.validateTestingReceipt(base,c)).toBe(true);
    for(const invalid of [{...base,extra:true},{...base,schema:'bad'},{...base,decision:'unknown'}])expect(()=>projects.validateTestingReceipt(invalid,c)).toThrow(/receipt invalid/);
    for(const invalid of [{...base,actor:''},{...base,source:''},{...base,timestamp:''},{...base,sanitized_pointers:[]},{...base,sanitized_pointers:['x','x']}])expect(()=>projects.validateTestingReceipt(invalid,c)).toThrow(/attribution/);
    for(const invalid of [{...base,work_id:'other'},{...base,acceptance_manifest_id:'other'},{...base,acceptance_manifest_version:2},{...base,delivery_cycle_id:'other'}])expect(()=>projects.validateTestingReceipt(invalid,c)).toThrow(/binding/);
  });
});

