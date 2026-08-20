'use strict';
/* global vi */

const fs=require('fs'),os=require('os'),path=require('path');
const coordination=require('../../lib/workstream-coordination.cjs');

function root(){return fs.mkdtempSync(path.join(os.tmpdir(),'coordination-branches-'));}
function future(ms=60000){return new Date(Date.now()+ms).toISOString();}
function scope(work='work',file='src/a.js'){return {work_id:work,thread_id:`thread-${work}`,source_revision:'source-v1',contour_keys:['br:BR-1',`file:${file}`],exclusive_resources:[`file:${file}`]};}
function writeLedger(rootPath,value){const file=coordination.ledgerPath(rootPath);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value));return file;}
function ticket(rootPath,work){return coordination.status(rootPath,work).tickets[0];}
function enqueueClaim(rootPath,work='work',file='src/a.js',expiry=future()){coordination.enqueue(rootPath,scope(work,file));const current=ticket(rootPath,work);coordination.requestClaim(rootPath,{ticket_id:current.ticket_id,lease_expires_at:expiry});return current;}
function readyContour(rootPath){const current=enqueueClaim(rootPath);coordination.ready(rootPath,{ticket_id:current.ticket_id});coordination.freezeContour(rootPath,{ticket_id:current.ticket_id});return coordination.status(rootPath).contours[0];}

describe('workstream coordination closed branch matrix',()=>{
  test('scope, keys and arrays reject malformed or ambiguous resources',()=>{
    for(const value of [null,'x'])expect(()=>coordination.scope(value)).toThrow(/scope required/);
    for(const value of ['missing-colon','unknown:value','file:'])expect(()=>coordination.scope({...scope(),contour_keys:[value]})).toThrow(/resource invalid/);
    for(const values of [null,[],['file:src/a.js','file:src/a.js']])expect(()=>coordination.scope({...scope(),contour_keys:values})).toThrow(/contour keys/);
    expect(()=>coordination.scope({...scope(),exclusive_resources:['component:Case']})).toThrow(/exclusive resource kind/);
    expect(()=>coordination.scope({...scope(),exclusive_resources:['file:src/b.js']})).toThrow(/outside contour/);
  });

  test('corrupt ledgers and lock failures are typed and leave no false state',()=>{
    const malformed=root(),malformedFile=coordination.ledgerPath(malformed);fs.mkdirSync(path.dirname(malformedFile),{recursive:true});fs.writeFileSync(malformedFile,'not-json');expect(()=>coordination.status(malformed)).toThrow(/ledger corrupt/);
    const invalid=root();writeLedger(invalid,{schema:'bad'});expect(()=>coordination.status(invalid)).toThrow(/ledger invalid/);
    const denied=root(),original=fs.mkdirSync;
    const mkdir=/** @type {any} */ ((target,options)=>{if(String(target).endsWith('.lock')){const error=/** @type {Error & {code?:string}} */(new Error('denied'));error.code='EACCES';throw error;}return original(target,options);});
    const spy=vi.spyOn(fs,'mkdirSync').mockImplementation(mkdir);
    try{expect(()=>coordination.enqueue(denied,scope())).toThrow(/lock unavailable/);}finally{spy.mockRestore();}
    const timed=root(),lock=`${coordination.ledgerPath(timed)}.lock`;fs.mkdirSync(lock,{recursive:true});const now=vi.spyOn(Date,'now').mockReturnValueOnce(0).mockReturnValue(10001);
    try{expect(()=>coordination.enqueue(timed,scope())).toThrow(/lock unavailable/);}finally{now.mockRestore();fs.rmdirSync(lock);}
    const retried=root(),realMkdir=fs.mkdirSync;let firstLock=true;const retryMkdir=/** @type {any} */ ((target,options)=>{if(String(target).endsWith('.lock')&&firstLock){firstLock=false;const error=/** @type {Error & {code?:string}} */(new Error('busy'));error.code='EEXIST';throw error;}return realMkdir(target,options);});const retrySpy=vi.spyOn(fs,'mkdirSync').mockImplementation(retryMkdir);
    try{coordination.enqueue(retried,scope());expect(ticket(retried,'work')).toBeTruthy();}finally{retrySpy.mockRestore();}
  });

  test('ticket, enqueue, extension, claim and renewal boundaries are exact',()=>{
    const r=root();expect(()=>coordination.refresh(r,{ticket_id:'missing'})).toThrow(/ticket missing/);
    coordination.enqueue(r,scope());expect(()=>coordination.enqueue(r,scope())).toThrow(/active work/);
    const first=ticket(r,'work');expect(()=>coordination.extendProjectContour(r,{ticket_id:first.ticket_id,contour_keys:['component:Case']})).toThrow(/project contour key/);
    expect(()=>coordination.requestClaim(r,{ticket_id:first.ticket_id,resources:['file:src/b.js'],lease_expires_at:future()})).toThrow(/outside ticket/);
    expect(()=>coordination.requestClaim(r,{ticket_id:first.ticket_id,lease_expires_at:'2000-01-01T00:00:00Z'})).toThrow(/expired/);
    coordination.requestClaim(r,{ticket_id:first.ticket_id,lease_expires_at:future()});
    expect(()=>coordination.renewClaim(r,{ticket_id:first.ticket_id,resources:['file:src/b.js'],lease_expires_at:future()})).toThrow(/outside ticket/);
    expect(()=>coordination.renewClaim(r,{ticket_id:first.ticket_id,lease_expires_at:'2000-01-01T00:00:00Z'})).toThrow(/expired/);
    expect(coordination.renewClaim(r,{ticket_id:first.ticket_id,lease_expires_at:future(120000)}).claims[0].status).toBe('active');
    coordination.ready(r,{ticket_id:first.ticket_id});coordination.freezeContour(r,{ticket_id:first.ticket_id});coordination.recordContourAssurance(r,{contour_id:coordination.status(r).contours[0].contour_id,integration_work_id:'integration',test_receipts:['test'],review_receipt_ids:['r1','r2','r3'],reverse_receipt_ids:['v1','v2','v3']});coordination.buildBatch(r,{contour_id:coordination.status(r).contours[0].contour_id,operations:[{order:1,source:'src/a.js',destination:'DEV',operation:'copy'}]});coordination.recordBatchDecision(r,{batch_id:coordination.status(r).batches[0].batch_id,decision:'accepted',decision_pointer:'WORK.md#accepted'});expect(()=>coordination.extendProjectContour(r,{ticket_id:first.ticket_id,contour_keys:['tenant:sample-tenant']})).toThrow(/cannot be extended/);expect(()=>coordination.requestClaim(r,{ticket_id:first.ticket_id,lease_expires_at:future()})).toThrow(/cannot claim/);
    const noClaim=root();coordination.enqueue(noClaim,scope());const unclaimed=ticket(noClaim,'work');expect(()=>coordination.renewClaim(noClaim,{ticket_id:unclaimed.ticket_id,lease_expires_at:future()})).toThrow(/cannot be renewed/);
    const expiredClaim=root(),expired=enqueueClaim(expiredClaim);const expiredLedger=coordination.read(coordination.ledgerPath(expiredClaim));expiredLedger.claims[0].lease_expires_at='2000-01-01T00:00:00Z';writeLedger(expiredClaim,expiredLedger);expect(()=>coordination.renewClaim(expiredClaim,{ticket_id:expired.ticket_id,lease_expires_at:future()})).toThrow(/cannot be renewed/);
    const frozen=root(),frozenLedger=coordination.initial();frozenLedger.contours.push({generation:1,frozen:true});writeLedger(frozen,frozenLedger);expect(()=>coordination.enqueue(frozen,scope())).toThrow(/generation frozen/);
  });

  test('expired claims cannot shadow a fresh re-claim and recovery is audited',()=>{
    const r=root(),current=enqueueClaim(r),ledger=coordination.read(coordination.ledgerPath(r));
    ledger.claims[0].lease_expires_at='2000-01-01T00:00:00Z';writeLedger(r,ledger);
    coordination.requestClaim(r,{ticket_id:current.ticket_id,resources:['file:src/a.js'],lease_expires_at:future()});
    const after=coordination.read(coordination.ledgerPath(r)),claims=after.claims.filter(x=>x.ticket_id===current.ticket_id);
    expect(claims.filter(x=>x.status==='recovered')).toHaveLength(1);expect(claims.filter(x=>x.status==='active')).toHaveLength(1);
    expect(coordination.validateClaim(r,{ticket_id:current.ticket_id}).claims).toHaveLength(1);
    expect(after.dispositions.some(x=>x.kind==='recover_expired'&&x.notice_id.startsWith('claim-recovery:'))).toBe(true);
    const explicit=root(),owner=enqueueClaim(explicit),expired=coordination.read(coordination.ledgerPath(explicit));expired.claims[0].lease_expires_at='2000-01-01T00:00:00Z';writeLedger(explicit,expired);
    coordination.recoverExpiredClaim(explicit,{ticket_id:owner.ticket_id,resources:['file:src/a.js'],decided_by:'operator',decision_pointer:'WORK.md#claim-recovery'});
    expect(()=>coordination.recoverExpiredClaim(explicit,{ticket_id:owner.ticket_id,resources:['file:src/a.js'],decided_by:'operator',decision_pointer:'WORK.md#claim-recovery'})).toThrow(/recovery not allowed/);
    coordination.requestClaim(explicit,{ticket_id:owner.ticket_id,lease_expires_at:future()});expect(coordination.validateClaim(explicit,{ticket_id:owner.ticket_id})).toBeTruthy();
  });

  test('notice acknowledgement and every disposition path are attributable and fail closed',()=>{
    const missing=root();expect(()=>coordination.acknowledge(missing,{notice_id:'missing',actor:'thread'})).toThrow(/notice missing/);expect(()=>coordination.disposition(missing,{notice_id:'missing',kind:'serialize',decided_by:'root',decision_pointer:'WORK.md'})).toThrow(/notice missing/);
    for(const kind of ['serialize','adopt','read_only']){const r=root();coordination.enqueue(r,scope('owner'));coordination.enqueue(r,scope('contender'));const notice=coordination.status(r).notices[0];coordination.disposition(r,{notice_id:notice.notice_id,kind,decided_by:'root',decision_pointer:'WORK.md#decision'});expect(coordination.status(r).notices[0].status).toBe('resolved');if(kind==='read_only')expect(ticket(r,'contender').status).toBe('read_only');}
    const live=root();const owner=enqueueClaim(live,'owner');coordination.enqueue(live,scope('contender'));const notice=coordination.status(live).notices[0];expect(()=>coordination.disposition(live,{notice_id:notice.notice_id,kind:'recover_expired',decided_by:'root',decision_pointer:'WORK.md'})).toThrow(/recovery not allowed/);
    const ledger=coordination.read(coordination.ledgerPath(live));ledger.claims[0].lease_expires_at='2000-01-01T00:00:00Z';writeLedger(live,ledger);coordination.disposition(live,{notice_id:notice.notice_id,kind:'recover_expired',decided_by:'root',decision_pointer:'WORK.md#recover'});expect(ticket(live,'owner').blocked_resources).toContain('file:src/a.js');expect(owner.ticket_id).toBeTruthy();
    const noOwnerClaim=root();coordination.enqueue(noOwnerClaim,scope('owner'));coordination.enqueue(noOwnerClaim,scope('contender'));const handoffNotice=coordination.status(noOwnerClaim).notices[0];expect(()=>coordination.disposition(noOwnerClaim,{notice_id:handoffNotice.notice_id,kind:'handoff',decided_by:'root',decision_pointer:'WORK.md'})).toThrow(/owner claim/);
  });

  test('FIFO, contour, batch and user-test decision invalid alternatives do not mutate authority',()=>{
    const fifo=root();const owner=enqueueClaim(fifo,'owner');coordination.enqueue(fifo,scope('middle'));coordination.enqueue(fifo,scope('last'));const fifoLedger=coordination.read(coordination.ledgerPath(fifo));fifoLedger.tickets.find(x=>x.work_id==='middle').blocked_resources=['file:src/a.js'];fifoLedger.tickets.find(x=>x.work_id==='last').blocked_resources=['file:src/a.js'];writeLedger(fifo,fifoLedger);const lastNotice=coordination.status(fifo).notices.find(x=>x.contender_work_id==='last');expect(()=>coordination.disposition(fifo,{notice_id:lastNotice.notice_id,kind:'handoff',decided_by:'root',decision_pointer:'WORK.md'})).toThrow(/FIFO/);expect(owner.ticket_id).toBeTruthy();
    const notReady=root();coordination.enqueue(notReady,scope());const queued=ticket(notReady,'work');expect(()=>coordination.freezeContour(notReady,{ticket_id:queued.ticket_id})).toThrow(/ready/);
    const staleGeneration=root(),stale=enqueueClaim(staleGeneration);coordination.ready(staleGeneration,{ticket_id:stale.ticket_id});const ledger=coordination.read(coordination.ledgerPath(staleGeneration));ledger.open_generation=2;writeLedger(staleGeneration,ledger);expect(()=>coordination.freezeContour(staleGeneration,{ticket_id:stale.ticket_id})).toThrow(/not open/);
    const batchRoot=root(),contour=readyContour(batchRoot);coordination.recordContourAssurance(batchRoot,{contour_id:contour.contour_id,integration_work_id:'integration',test_receipts:['test'],review_receipt_ids:['r1','r2','r3'],reverse_receipt_ids:['v1','v2','v3']});for(const operations of [[],[{order:0,source:'src/a.js',destination:'DEV',operation:'copy'}],[{order:1,source:'../a.js',destination:'DEV',operation:'copy'}],[{order:1,source:'src/a.js',destination:'DEV',operation:'unknown'}],[{order:1,source:'src/a.js',destination:'DEV',operation:'copy'},{order:1,source:'src/a.js',destination:'DEV',operation:'copy'}]])expect(()=>coordination.buildBatch(batchRoot,{contour_id:contour.contour_id,operations})).toThrow(/operation/);
    expect(()=>coordination.recordContourAssurance(batchRoot,{contour_id:'missing',integration_work_id:'x',test_receipts:['t'],review_receipt_ids:['1','2','3'],reverse_receipt_ids:['1','2','3']})).toThrow(/frozen contour/);
    const changed=coordination.read(coordination.ledgerPath(batchRoot));changed.tickets[0].status='queued';writeLedger(batchRoot,changed);expect(()=>coordination.recordContourAssurance(batchRoot,{contour_id:contour.contour_id,integration_work_id:'x',test_receipts:['t'],review_receipt_ids:['1','2','3'],reverse_receipt_ids:['1','2','3']})).toThrow(/member is not ready/);changed.tickets[0].status='ready_for_handoff';writeLedger(batchRoot,changed);
    coordination.buildBatch(batchRoot,{contour_id:contour.contour_id,operations:[{order:1,source:'src/a.js',destination:'DEV',operation:'copy'}]});const batch=coordination.status(batchRoot).batches[0];expect(()=>coordination.recordBatchDecision(batchRoot,{batch_id:'missing',decision:'accepted',decision_pointer:'WORK.md'})).toThrow(/not awaiting/);expect(()=>coordination.recordBatchDecision(batchRoot,{batch_id:batch.batch_id,decision:'unknown',decision_pointer:'WORK.md'})).toThrow(/decision invalid/);
    for(const decision of ['feedback','rejected']){const r=root(),c=readyContour(r);coordination.recordContourAssurance(r,{contour_id:c.contour_id,integration_work_id:'integration',test_receipts:['test'],review_receipt_ids:['r1','r2','r3'],reverse_receipt_ids:['v1','v2','v3']});coordination.buildBatch(r,{contour_id:c.contour_id,operations:[{order:1,source:'src/a.js',destination:'DEV',operation:'copy'}]});const b=coordination.status(r).batches[0];coordination.recordBatchDecision(r,{batch_id:b.batch_id,decision,decision_pointer:`WORK.md#${decision}`});expect(ticket(r,'work').status).toBe('queued');}
  });
});

