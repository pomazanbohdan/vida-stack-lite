import {test,expect} from 'bun:test';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {canonicalJson,canonicalJsonDigest} from '../src/contracts/public-ingress.ts';
import {loadRuntimeConfig} from '../src/config/runtime-config.ts';
import {requireSafeRepositoryAccess} from '../src/config/safe-repository-access.ts';
import {snapshotDeclaredSources} from '../src/orchestration/scoped-source-snapshot.ts';
import {HostStateStore,openHostStateDatabase} from '../src/host-state.ts';
import {admitLocalSessionWork} from '../src/orchestration/local-work-admission.ts';
import {runWorkStateRepair} from '../bin/repair-work-state.mjs';
const bundle=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

function fixture(){
 const root=mkdtempSync(path.join(tmpdir(),'vida-absorption-'));
 writeFileSync(path.join(root,'agent-runtime.config.v1.yaml'),readFileSync(path.join(bundle,'templates/agent-runtime.config.template.v1.yaml'),'utf8')
  .replaceAll('{{REPOSITORY}}','absorption-repository').replaceAll('{{PROJECT}}','sample').replaceAll('{{BUNDLE}}','vida-agent'));
 writeFileSync(path.join(root,'AGENTS.md'),'Test fixture policy');
 writeFileSync(path.join(root,'AGENT.sidecar.md'),'Test fixture source map');
 const config=loadRuntimeConfig(root),database=openHostStateDatabase(path.join(root,'fixture.sqlite')),
  store=new HostStateStore(database,'a'.repeat(64)), source=snapshotDeclaredSources(requireSafeRepositoryAccess(root),['AGENT.sidecar.md']);
 database.exec('CREATE TABLE IF NOT EXISTS agent_host_mastra_session_ledger (workspace_id TEXT,work_id TEXT,attempt INTEGER,revision INTEGER,payload TEXT,digest TEXT,PRIMARY KEY(workspace_id,work_id,attempt))');
 const selection={team:'default-development',kind:'research',intent:'information_research',project:'sample',risk_flags:[],labels:[]};
 function prepare(id,pointer,thread='session'){
  mkdirSync(path.join(root,'.agent','work',id),{recursive:true});
  const scope={schema:'ImplementationScope/v1',scope_id:'scope-'+id,work_id:id,source_revision:source.digest,
   ac_ids:['AC-SHARED'],allowed_paths:['AGENT.sidecar.md'],implementation_paths:['AGENT.sidecar.md'],documentation_paths:[],
   changed_symbols:[],non_goals:['Source mutation'],acceptance_trace:['AC-SHARED'],behavior_trace:['SR-SHARED'],test_trace:['fixture'],diagnostic_trace:['fixture'],
   attribution:{thread_id:thread,pointer},owner:'fixture',created_at:new Date().toISOString()};
  const acceptance={schema:'AcceptanceManifest/v1',id:'acceptance-'+id,version:1,ac_ids:scope.ac_ids,source:'AGENT.sidecar.md',scope:scope.scope_id,
   source_revision:source.digest,contracts:[{id:'AC-SHARED',definition:'Preserve unfinished scope',sr:'SR-SHARED',evidence:['fixture']}]};
  const scopePath=`.agent/work/${id}/scope.json`,acceptancePath=`.agent/work/${id}/acceptance.json`;
  writeFileSync(path.join(root,scopePath),JSON.stringify(scope));writeFileSync(path.join(root,acceptancePath),JSON.stringify(acceptance));
  return {repositoryRoot:root,config,store,selection,context:{work_id:id,attempt:1,scope_digest:source.digest},nativeSessionHandle:thread,
   workItem:{schema:'WorkItem/v1',id,canonical_kind:'research',intent:'information_research',project_id:'sample',title:'Fixture '+id,
    description:'Unfinished acceptance',risk_flags:[],labels:[],provider:'local',provider_type:'Research'},scopePath,acceptancePath,
   runtimeCodePaths:['vida-agent/bin/run.mjs'],route:'R2',risk:'low',changeKind:'feature'};
 }
 function admit(input){
  const admitted=admitLocalSessionWork(input);
  const journal={schema:'MastraSessionLedger/v1',workspace_id:store.workspaceId,work_id:input.context.work_id,attempt:1,
   run_id:admitted.host.work.execution.run_id,step_id:'unissued-fixture-wave',items:[],completed:[]};
  database.query('INSERT INTO agent_host_mastra_session_ledger VALUES(?,?,?,?,?,?)')
   .run(store.workspaceId,input.context.work_id,1,1,canonicalJson(journal),canonicalJsonDigest(journal));
  return admitted;
 }
 return {root,config,database,store,prepare,admit,close(){database.close();rmSync(root,{recursive:true,force:true});}};
}

test('public admission preserves same-request parallel contours and atomically absorbs old same-session requests',()=>{
 const f=fixture();try{
  const first=f.prepare('first','user:one'), parallel=f.prepare('parallel','user:one');
  f.admit(first);f.admit(parallel);
  const before=f.store.readWorkspaceSnapshot();
  expect(before.work.every(entry=>entry.work.execution.status==='active')).toBe(true);
  const successor=f.prepare('next','user:two');
  const admitted=admitLocalSessionWork(successor);
  expect(admitted.host.work.request_transition.predecessor_work_ids).toEqual(['first','parallel']);
  const after=f.store.readWorkspaceSnapshot();
  expect(after.work.filter(entry=>entry.work.execution.status==='suspended')).toHaveLength(2);
  expect(after.ledger.claims.filter(claim=>claim.status==='active')).toHaveLength(1);
  expect(admitLocalSessionWork(successor).host).toEqual(admitted.host);
  successor.workItem={...successor.workItem,title:'Changed retry'};
  expect(()=>admitLocalSessionWork(successor)).toThrow(/retry differs/);
 }finally{f.close();}
});

test('public admission rejects drifted predecessor attribution without any effects and preserves foreign sessions',()=>{
 const f=fixture();try{
  const foreign=f.prepare('foreign','user:foreign','another-session');f.admit(foreign);
  const old=f.prepare('old','user:old');f.admit(old);
  const foreignBefore=f.store.readWorkspaceSnapshot().work.find(entry=>entry.work.binding.lifecycle_work_id==='foreign').work;
  const previous=f.store.readWorkspaceSnapshot();
  const bytes=readFileSync(path.join(f.root,old.scopePath));
  writeFileSync(path.join(f.root,old.scopePath),Buffer.concat([bytes,Buffer.from('\n')]));
  const next=f.prepare('next','user:next');
  expect(()=>admitLocalSessionWork(next)).toThrow(/scope artifact changed/);
  expect(f.store.readWorkspaceSnapshot()).toEqual(previous);
  writeFileSync(path.join(f.root,old.scopePath),bytes);
  const admitted=admitLocalSessionWork(next);
  expect(admitted.host.work.request_transition.predecessor_work_ids).toEqual(['old']);
  expect(f.store.readWorkspaceSnapshot().work.find(entry=>entry.work.binding.lifecycle_work_id==='foreign').work).toEqual(foreignBefore);
 }finally{f.close();}
});

test('work-state inspection CLI refuses missing canonical SQLite without creating it',()=>{
 const f=fixture();try{
  expect(()=>runWorkStateRepair(['--kind','work-state','--mode','inspect','--project-root',f.root])).toThrow(/unavailable/);
 }finally{f.close();}
});
