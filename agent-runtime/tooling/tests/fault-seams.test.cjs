'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const runtime = require('../../lib/runtime.cjs');
const backlog = require('../../lib/backlog-adapter.cjs');
const { checkpoint } = require('./fixtures.cjs');

function blocked(action) {
  expect(action).toThrow(/GATE_BLOCKED|lock unavailable|invalid checkpoint/);
}

/** @returns {Error & { code: string }} */
function errorWithCode(message, code) {
  const error = /** @type {Error & { code: string }} */ (new Error(message));
  error.code = code;
  return error;
}

describe('public deterministic fault seams', () => {
  test('checkpoint lock acquires, releases and cleans up after a failing action', () => {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'checkpoint-io-')), 'resume.json');
    const lock = runtime.acquireCheckpointLock(file);
    expect(fs.existsSync(lock)).toBe(true);
    runtime.releaseCheckpointLock(lock);
    expect(fs.existsSync(lock)).toBe(false);
    expect(() => runtime.withCheckpointLock(file, () => { throw new Error('test failure'); })).toThrow('test failure');
    expect(fs.existsSync(`${file}.lock`)).toBe(false);
  });

  test('checkpoint IO faults fail closed and do not report a typed result', () => {
    const file = path.join(os.tmpdir(), 'checkpoint-io-fault');
    let attempts = 0;
    const locked = { mkdirSync: () => { const error = /** @type {Error & { code?: string }} */ (new Error('busy')); error.code = 'EEXIST'; throw error; }, now: () => attempts++ ? 10_001 : 0, wait: () => {}, rmdirSync: () => {}, pid: 1, writeFileSync: () => {}, renameSync: () => {}, readFileSync: () => '{}' };
    blocked(() => runtime.acquireCheckpointLock(file, /** @type {any} */ (locked)));
    const writeFailure = { ...runtime.checkpointIo, pid: 7, now: () => 3, writeFileSync: () => { throw new Error('write fault'); } };
    expect(() => runtime.atomicReplace(file, { ok: true }, writeFailure)).toThrow('write fault');
    const previous = checkpoint();
    expect(runtime.validateTypedOperationResult(previous, { ...previous })).toMatchObject({ work_id: previous.work_id });
    blocked(() => runtime.validateTypedOperationResult(previous, null));
    blocked(() => runtime.validateTypedOperationResult(previous, { ...previous, work_id: 'other' }));
  });

  test('checkpoint lock distinguishes acquisition, contention wait, exact deadline and foreign I/O failures',()=>{
    const file=path.join(os.tmpdir(),'checkpoint-lock-matrix');
    const events=[];let calls=0;
    const eventually={mkdirSync:target=>{events.push(`mkdir:${target}`);if(calls++===0)throw errorWithCode('busy','EEXIST');},now:()=>calls===1?0:1,wait:()=>events.push('wait'),rmdirSync:()=>{},pid:1,writeFileSync:()=>{},renameSync:()=>{},readFileSync:()=>''};
    expect(runtime.acquireCheckpointLock(file,/** @type {any} */(eventually))).toBe(`${file}.lock`);expect(events).toContain('wait');
    {const io={...eventually,mkdirSync:()=>{throw errorWithCode('EACCES','EACCES');},now:()=>0,wait:()=>{throw new Error('must not wait after foreign failure');}};expect(()=>runtime.acquireCheckpointLock(file,/** @type {any} */(io))).toThrow(/checkpoint lock unavailable/);}
    {let ticks=0;const io={...eventually,mkdirSync:()=>{throw errorWithCode('EEXIST','EEXIST');},now:()=>ticks++===0?0:10001,wait:()=>{throw new Error('must not wait after deadline');}};expect(()=>runtime.acquireCheckpointLock(file,/** @type {any} */(io))).toThrow(/checkpoint lock unavailable/);}
    const equality={...eventually,mkdirSync:()=>{throw errorWithCode('busy','EEXIST');},now:()=>10000,wait:()=>{throw new Error('wait at exact deadline');}};expect(()=>runtime.acquireCheckpointLock(file,/** @type {any} */(equality))).toThrow(/wait at exact deadline/);
    {let attempts=0,waits=0;const io={...eventually,mkdirSync:()=>{if(attempts++===0)throw errorWithCode('busy','EEXIST');},now:()=>attempts===0?0:10000,wait:()=>{waits++;},};expect(runtime.acquireCheckpointLock(file,/** @type {any} */(io))).toBe(`${file}.lock`);expect(waits).toBe(1);}
    const previous=checkpoint();for(const next of [{...previous,schema:'Other/v2'},{...previous,work_id:''}])expect(()=>runtime.validateTypedOperationResult(previous,next)).toThrow(/typed operation produced invalid checkpoint/);
    expect(()=>runtime.validateTypedOperationResult(previous,{...previous,work_id:'other'})).toThrow(/typed operation produced invalid checkpoint/);
  });

  test('Backlog lock fault injection preserves the action boundary and cleanup', () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'ledger-io-'));
    fs.mkdirSync(path.join(cwd, 'backlog'));
    const events = [];
    const io = { mkdirSync: target => { events.push('mkdir'); fs.mkdirSync(target); }, rmdirSync: target => { events.push('rmdir'); fs.rmdirSync(target); }, now: () => 0, wait: () => events.push('wait') };
    expect(backlog.withLedgerLock(cwd, () => 'done', /** @type {any} */ (io))).toBe('done');
    expect(events).toEqual(['mkdir', 'rmdir']);
    let lockAttempts = 0;
    const unavailable = { mkdirSync: () => { const error = /** @type {Error & { code?: string }} */ (new Error('busy')); error.code = 'EEXIST'; throw error; }, rmdirSync: () => {}, now: () => lockAttempts++ ? 10_001 : 0, wait: () => {} };
    expect(backlog.withLedgerLock(cwd, () => 'never', /** @type {any} */ (unavailable))).toMatchObject({ failure: true });
  });
});
