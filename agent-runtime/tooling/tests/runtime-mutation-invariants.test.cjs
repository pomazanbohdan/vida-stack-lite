'use strict';
/* global vi */

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const runtime = require('../../lib/runtime.cjs');
const { checkpoint, fixtures, manifest } = require('./fixtures.cjs');

function clone(value) { return JSON.parse(JSON.stringify(value)); }

function blocked(action, message) {
  let error;
  try { action(); } catch (caught) { error = caught; }
  expect(error).toBeInstanceOf(Error);
  expect({ message: error.message, code: error.code }).toEqual({ message, code: 'GATE_BLOCKED' });
}

function repo(prefix = 'runtime-mutation-') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  fs.mkdirSync(path.join(root, '.git'));
    fs.mkdirSync(path.join(root, 'src'));
    fs.writeFileSync(path.join(root, 'src', 'a.js'), 'a');
    fs.writeFileSync(path.join(root, 'src', 'b.cjs'), 'b');
  return root;
}

function save(root, state) {
  const directory = path.join(root, '.agent', 'work', state.work_id);
  fs.mkdirSync(directory, { recursive: true });
  const file = path.join(directory, 'resume.json');
  fs.writeFileSync(file, JSON.stringify(state));
  return file;
}

function binding(c) {
  return {
    work_id: c.work_id,
    source_revision: c.source_revision,
    sealed_revision: c.sealed_revision,
    implementation_fingerprint: c.implementation_fingerprint,
    acceptance_manifest_id: c.acceptance_manifest.id,
    acceptance_manifest_version: c.acceptance_manifest.version
  };
}

describe('runtime mutation invariants: canonical data and checkpoint ZOMBIES', () => {
  test('exported closed sets and stable canonicalization are exact', () => {
    expect(runtime.lenses).toEqual(['correctness_regression', 'edge_security_data', 'requirements_evidence']);
    expect(runtime.points).toEqual(['plan:pre', 'plan:post', 'execute:pre', 'execute:post', 'verify:pre', 'verify:post', 'ship:pre', 'ship:post']);
    expect(runtime.transitions).toEqual({ INTAKE: ['TRACE'], TRACE: ['PLAN'], PLAN: ['EXECUTE'], EXECUTE: [], VERIFY: ['DELIVERY', 'EXECUTE'], DELIVERY: ['COMPLETE', 'EXECUTE'], COMPLETE: [] });
    expect(runtime.stable({ z: [3, { b: true, a: null }], a: 'x' })).toBe('{"a":"x","z":[3,{"a":null,"b":true}]}');
    expect(runtime.stable([undefined, false, 0, ''])).toBe('[,false,0,""]');
  });

  test('checkpoint identity, text, closed risk/kind and list contracts fail with exact reasons', () => {
    const cases = /** @type {Array<[(value: any) => void, string]>} */ ([
      [c => { c.schema = 'WorkCheckpoint/v1'; }, 'checkpoint schema/revision'],
      [c => { c.revision = 0; }, 'checkpoint schema/revision'],
      [c => { c.revision = 1.5; }, 'checkpoint schema/revision'],
      [c => { c.work_id = '  '; }, 'checkpoint work_id missing'],
      [c => { c.protocol_version = null; }, 'checkpoint protocol_version missing'],
      [c => { c.source_revision = ''; }, 'checkpoint source_revision missing'],
      [c => { c.next_action = 0; }, 'checkpoint next_action missing'],
      [c => { c.risk = 'urgent'; }, 'closed risk profile required'],
      [c => { c.change_kind = 'migration'; c.risk = 'medium'; }, 'migration/destructive work must be high risk'],
      [c => { c.change_kind = 'destructive'; c.risk = 'low'; }, 'migration/destructive work must be high risk'],
      [c => { c.change_kind = 'unknown'; }, 'closed change kind required'],
      [c => { c.allowed_paths = []; }, 'checkpoint required fields'],
      [c => { c.acceptance = 'x'; }, 'checkpoint required fields'],
      [c => { c.test_plan = []; }, 'checkpoint required fields'],
      [c => { c.lifecycle_state = 'UNKNOWN'; }, 'checkpoint required fields'],
      [c => { c.source_plan = null; }, 'checkpoint BR/SR/AC/GAP trace missing'],
      [c => { c.source_plan.br = ''; }, 'BR missing'],
      [c => { c.source_plan.sr = ''; }, 'SR missing'],
      [c => { c.source_plan.ac = ''; }, 'AC missing'],
      [c => { c.source_plan.gaps = null; }, 'checkpoint BR/SR/AC/GAP trace missing'],
      [c => { c.source_plan.scope = ''; }, 'scope missing'],
      [c => { c.source_plan.verification = ''; }, 'verification missing'],
      [c => { c.source_plan.rollback_cleanup = ''; }, 'rollback cleanup missing']
    ]);
    for (const [mutate, message] of cases) {
      const value = checkpoint(); mutate(value); blocked(() => runtime.assertCheckpoint(value), message);
    }
    for (const kind of ['documentation', 'feature', 'defect', 'refactor', 'incident', 'migration', 'destructive']) {
      const value = checkpoint({ change_kind: kind, risk: ['migration', 'destructive'].includes(kind) ? 'high' : 'low' });
      expect(runtime.assertCheckpoint(value)).toBe(true);
    }
    for (const risk of ['low', 'medium', 'high']) expect(runtime.assertCheckpoint(checkpoint({ risk }))).toBe(true);

    for (const field of ['reviews', 'verification', 'evidence', 'leases', 'imports', 'recovery_evidence']) {
      const omitted = checkpoint(); delete omitted[field];
      expect(runtime.assertCheckpoint(omitted)).toBe(true);
      const invalid = checkpoint({ [field]: {} });
      blocked(() => runtime.assertCheckpoint(invalid), `checkpoint ${field} invalid`);
    }
    const omittedLedger = checkpoint(); delete omittedLedger.review_generation_ledger;
    blocked(() => runtime.assertCheckpoint(omittedLedger), 'checkpoint review_generation_ledger invalid');
    blocked(() => runtime.assertCheckpoint(checkpoint({ review_generation_ledger: {} })), 'checkpoint review_generation_ledger invalid');
    const omittedQuestions = checkpoint(); delete omittedQuestions.question_candidates;
    blocked(() => runtime.assertCheckpoint(omittedQuestions), 'checkpoint question_candidates invalid');
    for (const generation of [-1, 1.5]) blocked(() => runtime.assertCheckpoint(checkpoint({ review_generation: generation })), 'review generation invalid');
  });

  test('manifest identity, references and contract definitions are independently enforced', () => {
    const cases = /** @type {Array<[(value: any) => void, string]>} */ ([
      [m => { m.schema = 'AcceptanceManifest/v0'; }, 'acceptance manifest binding missing'],
      [m => { m.id = ''; }, 'manifest id missing'],
      [m => { m.version = 0; }, 'acceptance manifest binding missing'],
      [m => { m.version = 1.5; }, 'acceptance manifest binding missing'],
      [m => { m.ac_ids = 'AC'; }, 'acceptance manifest binding missing'],
      [m => { m.ac_ids = []; }, 'acceptance manifest binding missing'],
      [m => { m.ac_ids = ['AC-QUALITY-1', 'AC-QUALITY-1']; m.contracts.push(clone(m.contracts[0])); }, 'acceptance manifest binding missing'],
      [m => { m.source = ''; }, 'manifest source missing'],
      [m => { m.scope = ''; }, 'manifest scope missing'],
      [m => { m.source_revision = 'stale'; }, 'acceptance manifest binding missing'],
      [m => { m.contracts = null; }, 'acceptance manifest contract definitions missing'],
      [m => { m.contracts = []; }, 'acceptance manifest contract count'],
      [m => { m.contracts[0].id = ''; }, 'AC definition id missing'],
      [m => { m.contracts[0].id = 'outside'; }, 'acceptance manifest contract incomplete'],
      [m => { m.contracts[0].definition = ''; }, 'AC definition missing'],
      [m => { m.contracts[0].sr = ''; }, 'AC SR trace missing'],
      [m => { m.contracts[0].evidence = []; }, 'acceptance manifest contract incomplete']
    ]);
    for (const [mutate, message] of cases) {
      const value = checkpoint({ acceptance_manifest: clone(manifest) });
      mutate(value.acceptance_manifest);
      blocked(() => runtime.assertCheckpoint(value), message);
    }
    blocked(() => runtime.assertCheckpoint(checkpoint({ acceptance_manifest: null })), 'acceptance manifest binding missing');
    const scalarEvidence = checkpoint({ acceptance_manifest: clone(manifest) });
    scalarEvidence.acceptance_manifest.contracts[0].evidence = 'Static';
    blocked(() => runtime.assertCheckpoint(scalarEvidence), 'acceptance manifest contract incomplete');
    const duplicateContract = checkpoint({ acceptance_manifest: clone(manifest) });
    duplicateContract.acceptance_manifest.ac_ids = ['AC-QUALITY-1', 'AC-QUALITY-2'];
    duplicateContract.acceptance_manifest.contracts.push({ ...clone(duplicateContract.acceptance_manifest.contracts[0]), definition: 'duplicate' });
    blocked(() => runtime.assertCheckpoint(duplicateContract), 'acceptance manifest contract incomplete');
  });

  test('sealed-state timestamp and fingerprint boundaries are exact', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-16T12:00:00.000Z'));
    try {
      expect(runtime.assertCheckpoint(checkpoint({ sealed_at: '2026-08-16T12:05:00.000Z' }))).toBe(true);
      blocked(() => runtime.assertCheckpoint(checkpoint({ sealed_at: '2026-08-16T12:05:00.001Z' })), 'sealed_at too far in future');
      blocked(() => runtime.assertCheckpoint(checkpoint({ sealed_at: 'not-time' })), 'sealed_at invalid');
      for (const fingerprint of [`z${'a'.repeat(64)}`, `${'a'.repeat(64)}z`, '', null]) {
        blocked(() => runtime.assertCheckpoint(checkpoint({ implementation_fingerprint: fingerprint })), 'sealed state binding missing');
      }
      blocked(() => runtime.assertCheckpoint(checkpoint({ sealed_revision: 1.5 })), 'sealed state binding missing');
      for (const state of ['DELIVERY', 'COMPLETE']) blocked(() => runtime.assertCheckpoint(checkpoint({ lifecycle_state: state, implementation_fingerprint: 'bad' })), 'sealed state binding missing');
    } finally { vi.useRealTimers(); }
  });

  test('transition edges are closed and direct jumps retain the exact failure', () => {
    for (const [from, tos] of Object.entries(runtime.transitions)) {
      for (const to of tos) expect(() => runtime.assertTransition(checkpoint({ lifecycle_state: from }), checkpoint({ lifecycle_state: to }))).not.toThrow();
    }
    blocked(() => runtime.assertTransition(checkpoint({ lifecycle_state: 'INTAKE' }), checkpoint({ lifecycle_state: 'EXECUTE' })), 'direct lifecycle phase jump');
    blocked(() => runtime.assertTransition(checkpoint({ schema: 'bad', lifecycle_state: 'INTAKE' }), checkpoint({ lifecycle_state: 'TRACE' })), 'checkpoint schema/revision');
    blocked(() => runtime.assertTransition(checkpoint({ lifecycle_state: 'INTAKE' }), checkpoint({ schema: 'bad', lifecycle_state: 'TRACE' })), 'checkpoint schema/revision');
  });

  test('persisted public updates preserve bytes on CAS or immutable rejection and advance exactly once on success',()=>{
    const root=repo('runtime-update-public-'),initial=checkpoint({work_id:'update-public',revision:1,lifecycle_state:'INTAKE'}),file=save(root,initial),before=fs.readFileSync(file,'utf8');
    expect(()=>runtime.beginTrace(file,{expectedRevision:2,sourceRevision:initial.source_revision})).toThrow(/checkpoint compare-and-swap mismatch/);
    expect(fs.readFileSync(file,'utf8')).toBe(before);
    expect(()=>runtime.beginTrace(file,{expectedRevision:1,sourceRevision:'different-source'})).toThrow(/checkpoint compare-and-swap mismatch/);
    expect(fs.readFileSync(file,'utf8')).toBe(before);
    const traced=runtime.beginTrace(file,{expectedRevision:1,sourceRevision:initial.source_revision});
    expect(traced).toMatchObject({revision:2,lifecycle_state:'TRACE'});
    const complete=checkpoint({work_id:'update-complete',revision:1,lifecycle_state:'COMPLETE'}),completeFile=save(root,complete),completeBytes=fs.readFileSync(completeFile,'utf8');
    expect(()=>runtime.beginTrace(completeFile,{expectedRevision:1,sourceRevision:complete.source_revision})).toThrow(/complete work is immutable/);
    expect(fs.readFileSync(completeFile,'utf8')).toBe(completeBytes);
    const malformed=checkpoint({work_id:'update-malformed',revision:1,lifecycle_state:'UNKNOWN'}),malformedFile=save(root,malformed),malformedBytes=fs.readFileSync(malformedFile,'utf8');
    expect(()=>runtime.beginTrace(malformedFile,{expectedRevision:1,sourceRevision:malformed.source_revision})).toThrow(/checkpoint required fields/);
    expect(fs.readFileSync(malformedFile,'utf8')).toBe(malformedBytes);
    const invalidRoute=checkpoint({work_id:'gate-invalid-route',revision:1,lifecycle_state:'TRACE',route:'R9'});
    expect(()=>runtime.validateGate(invalidRoute,'plan:pre',{expectedRevision:1,sourceRevision:invalidRoute.source_revision,root})).toThrow(/closed route required/);
  });

  test('typed evidence entry verbs enforce their own state boundary and preserve rejected checkpoint bytes',()=>{
    const typed=fixtures();
    const cases=/** @type {Array<[string, (file:string, state:any, value?:any)=>any, any, string]>} */ ([
      ['recovery', (file,state,value=typed['recovery-evidence.v1.schema.json'])=>runtime.recordRecoveryEvidence(file,value,state.revision,state.source_revision), typed['recovery-evidence.v1.schema.json'], 'recovery evidence requires verify/delivery'],
      ['evidence', (file,state,value=typed['evidence.v1.schema.json'])=>runtime.recordEvidence(file,value,state.revision,state.source_revision), typed['evidence.v1.schema.json'], 'evidence requires verify/delivery'],
      ['import', (file,state,value=typed['import-attribution.v1.schema.json'])=>runtime.recordImportAttribution(file,value,state.revision,state.source_revision), typed['import-attribution.v1.schema.json'], 'import attribution requires verify/delivery']
    ]);
    for(const [name,record,value,error] of cases){
      const validRoot=repo(`runtime-${name}-valid-`),valid=checkpoint({revision:9,lifecycle_state:'VERIFY'}),validFile=save(validRoot,valid);
      const next=record(validFile,valid);
      expect(next.revision).toBe(10);
      const collection=name==='recovery'?'recovery_evidence':name==='evidence'?'evidence':'imports';
      expect(next[collection]).toEqual([value]);
      const identity=name==='import'?'import_id':'id',second={...value,[identity]:`${value[identity]}-second`};
      const twice=record(validFile,next,second);
      expect(twice[collection]).toEqual([value,second]);

      const deliveryRoot=repo(`runtime-${name}-delivery-`),delivery=checkpoint({revision:9,lifecycle_state:'DELIVERY'}),deliveryFile=save(deliveryRoot,delivery);
      expect(record(deliveryFile,delivery)[collection]).toEqual([value]);

      const wrongRoot=repo(`runtime-${name}-wrong-`),wrong=checkpoint({revision:9,lifecycle_state:'INTAKE',sealed_at:undefined,sealed_revision:undefined,implementation_fingerprint:undefined}),wrongFile=save(wrongRoot,wrong),before=fs.readFileSync(wrongFile,'utf8');
      blocked(()=>record(wrongFile,wrong),error);
      expect(fs.readFileSync(wrongFile,'utf8')).toBe(before);
    }
  });

  test('null question candidate fails with the typed runtime error and leaves the checkpoint unchanged',()=>{
    const root=repo('runtime-question-null-'),state=checkpoint({work_id:'question-null',revision:9,lifecycle_state:'VERIFY'}),file=save(root,state),before=fs.readFileSync(file,'utf8');
    blocked(()=>runtime.recordQuestionCandidate(file,null,state.revision,state.source_revision),'new question candidate must be open');
    expect(fs.readFileSync(file,'utf8')).toBe(before);
    const typed=fixtures()['question-candidate.v1.schema.json'],closed={...typed,status:'waived',answer:null},closedRoot=repo('runtime-question-closed-'),closedState=checkpoint({revision:9,lifecycle_state:'VERIFY'}),closedFile=save(closedRoot,closedState),closedBefore=fs.readFileSync(closedFile,'utf8');
    blocked(()=>runtime.recordQuestionCandidate(closedFile,closed,closedState.revision,closedState.source_revision),'new question candidate must be open');
    expect(fs.readFileSync(closedFile,'utf8')).toBe(closedBefore);
  });
});

describe('runtime mutation invariants: paths, pointers and optional collections', () => {
  test('scope glob syntax has exact safe-relative boundaries and matching semantics', () => {
    const root = repo();
    expect(runtime.resolveScope({ allowed_paths: ['src/*.?s'] }, root).map(x => x.relative)).toEqual(['src/a.js']);
    expect(runtime.resolveScope({ allowed_paths: ['src/**'] }, root).map(x => x.relative)).toEqual(['src/a.js', 'src/b.cjs']);
    expect(runtime.resolveScope({ allowed_paths: ['src/a.*'] }, root).map(x => x.relative)).toEqual(['src/a.js']);
    expect(runtime.resolveScope({ allowed_paths: ['src/?.js'] }, root).map(x => x.relative)).toEqual(['src/a.js']);
    fs.writeFileSync(path.join(root, 'top.js'), 'top');
    fs.mkdirSync(path.join(root, 'src', 'nested'));
    fs.writeFileSync(path.join(root, 'src', 'nested', 'a.js'), 'nested');
    fs.mkdirSync(path.join(root, 'src', 'nested', 'deeper'));
    fs.writeFileSync(path.join(root, 'src', 'nested', 'deeper', 'deep.js'), 'deep');
    expect(runtime.resolveScope({ allowed_paths: ['*.js'] }, root).map(x => x.relative)).toEqual(['top.js']);
    expect(runtime.resolveScope({ allowed_paths: ['src/*'] }, root).map(x => x.relative)).toEqual(['src/a.js', 'src/b.cjs']);
    expect(runtime.resolveScope({ allowed_paths: ['src/**/a.js'] }, root).map(x => x.relative)).toEqual(['src/nested/a.js']);
    expect(runtime.resolveScope({ allowed_paths: ['src/nested/**'] }, root).map(x => x.relative)).toEqual(['src/nested/a.js', 'src/nested/deeper/deep.js']);
    expect(runtime.resolveScope({ allowed_paths: ['src/**/deep.js'] }, root).map(x => x.relative)).toEqual(['src/nested/deeper/deep.js']);
    fs.mkdirSync(path.join(root, 'coverage'));
    fs.writeFileSync(path.join(root, 'coverage', 'generated.js'), 'generated');
    expect(runtime.resolveScope({ allowed_paths: ['**'] }, root).map(x => x.relative)).not.toContain('coverage/generated.js');
    blocked(() => runtime.resolveScope({}, root), 'implementation scope missing');
    for (const pattern of ['', '/src/a.js', '../a', './src/a.js', 'src//a.js', 'src\\a.js', 'C:/x', '-src/a', '!src/a', 'src/[a].js']) {
      blocked(() => runtime.resolveScope({ allowed_paths: [pattern] }, root), `unsafe scope path: ${pattern}`);
    }
    blocked(() => runtime.resolveScope({ allowed_paths: ['missing.txt'] }, root), 'scope path missing: missing.txt');
    blocked(() => runtime.resolveScope({ allowed_paths: ['missing/*.js'] }, root), 'implementation scope resolves to no files');
    blocked(() => runtime.trustedRepoRoot(path.join(root, 'missing')), `path component missing: ${path.join(root, 'missing')}`);
    const noGit = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-no-git-'));
    blocked(() => runtime.trustedRepoRoot(noGit), 'repository root must be a real non-reparse repository');

    const originalLstat = fs.lstatSync;
    const lstat = vi.spyOn(fs, 'lstatSync').mockImplementation(/** @type {any} */ (target => {
      if (path.resolve(String(target)) === path.resolve(root)) return { isSymbolicLink: () => true, attributes: 0 };
      return originalLstat(target);
    }));
    try { blocked(() => runtime.trustedRepoRoot(root), `reparse point is not allowed: ${root}`); }
    finally { lstat.mockRestore(); }

    let attributes = 1;
    const attributeLstat = vi.spyOn(fs, 'lstatSync').mockImplementation(/** @type {any} */ (target => {
      const stat = originalLstat(target);
      if (path.resolve(String(target)) !== path.resolve(root)) return stat;
      return new Proxy(stat, { get(value, property) { return property === 'attributes' ? attributes : Reflect.get(value, property); } });
    }));
    try {
      expect(runtime.trustedRepoRoot(root)).toBe(path.resolve(root));
      attributes = 1024;
      blocked(() => runtime.trustedRepoRoot(root), `reparse point is not allowed: ${root}`);
    } finally { attributeLstat.mockRestore(); }

    const target = path.join(root, 'src');
    const targetLstat = vi.spyOn(fs, 'lstatSync').mockImplementation(/** @type {any} */ (value => {
      const stat = originalLstat(value);
      if (path.resolve(String(value)) !== path.resolve(target)) return stat;
      return new Proxy(stat, { get(item, property) { return property === 'attributes' ? 1024 : Reflect.get(item, property); } });
    }));
    try { blocked(() => runtime.resolveScope({ allowed_paths: ['src/**'] }, root), `reparse point is not allowed: ${target}`); }
    finally { targetLstat.mockRestore(); }

    const linked = path.join(root, 'linked-src');
    fs.symlinkSync(target, linked, 'junction');
    blocked(() => runtime.resolveScope({ allowed_paths: ['linked-src/**'] }, root), `reparse point is not allowed: ${linked}`);
  });

  test('scope ordering and fingerprint framing include only asserted absences', () => {
    const root = repo('runtime-fingerprint-');
    spawnSync('git', ['init'], { cwd: root });
    spawnSync('git', ['config', 'user.email', 'runtime@example.test'], { cwd: root });
    spawnSync('git', ['config', 'user.name', 'Runtime Test'], { cwd: root });
    spawnSync('git', ['add', '.'], { cwd: root });
    spawnSync('git', ['commit', '-m', 'fixture'], { cwd: root });
    const scope = { allowed_paths: ['src/**'], absence_assertions: { 'missing-z': true, 'missing-a': true, 'ignored': false } };
    const expectedFiles = runtime.resolveScope(scope, root);
    const hash = crypto.createHash('sha256');
    for (const file of expectedFiles) {
      const bytes = fs.readFileSync(file.absolute);
      const fileHash = crypto.createHash('sha256').update(bytes).digest('hex');
      hash.update(`file\0${file.relative}\0${file.mode}\0${bytes.length}\0${fileHash}\0`);
      hash.update('\0');
    }
    hash.update(runtime.stable({ absence: [
      { path: 'missing-a', required: true, present: false },
      { path: 'missing-z', required: true, present: false }
    ] }));
    const expectedFingerprint = hash.digest('hex');
    expect(runtime.implementationFingerprint(scope, root)).toBe(expectedFingerprint);
    expect(runtime.implementationFingerprint({ ...scope, absence_assertions: { ignored: false, 'missing-a': true, 'missing-z': true } }, root)).toBe(runtime.implementationFingerprint(scope, root));

    fs.writeFileSync(path.join(root, 'README.md'), 'unrelated repository metadata\n');
    spawnSync('git', ['add', 'README.md'], { cwd: root });
    spawnSync('git', ['commit', '-qm', 'unrelated repository change'], { cwd: root });
    expect(runtime.implementationFingerprint(scope, root)).toBe(expectedFingerprint);

    const originalReadDir = fs.readdirSync;
    const readDir = vi.spyOn(fs, 'readdirSync').mockImplementation(/** @type {any} */ ((target, options) => {
      const values = originalReadDir(target, options);
      return path.resolve(String(target)) === path.resolve(path.join(root, 'src')) ? [...values].reverse() : values;
    }));
    try { expect(runtime.resolveScope({ allowed_paths: ['src/**'] }, root).map(x => x.relative)).toEqual(['src/a.js', 'src/b.cjs']); }
    finally { readDir.mockRestore(); }
  });

  test('runtime control state never changes the sealed implementation fingerprint', () => {
    const root = repo('runtime-control-fingerprint-');
    const checkpointPath = path.join(root, '.agent', 'work', 'fingerprint-test', 'resume.json');
    const planningPath = path.join(root, '.planning', 'agent-flow', 'workstreams', 'fingerprint-test', 'state.json');
    fs.mkdirSync(path.dirname(checkpointPath), { recursive: true });
    fs.mkdirSync(path.dirname(planningPath), { recursive: true });
    fs.writeFileSync(checkpointPath, '{"revision":1}');
    fs.writeFileSync(planningPath, '{"derived":1}');
    spawnSync('git', ['init', '-q'], { cwd: root });
    spawnSync('git', ['config', 'user.email', 'runtime@example.test'], { cwd: root });
    spawnSync('git', ['config', 'user.name', 'Runtime Test'], { cwd: root });
    spawnSync('git', ['add', '.'], { cwd: root });
    spawnSync('git', ['commit', '-qm', 'fixture'], { cwd: root });

    const explicit = { fingerprint_paths: ['src/a.js', '.agent/work/fingerprint-test/resume.json', '.planning/agent-flow/workstreams/fingerprint-test/state.json'] };
    const broad = { fingerprint_paths: ['**'] };
    const explicitBefore = runtime.implementationFingerprint(explicit, root);
    const broadBefore = runtime.implementationFingerprint(broad, root);
    fs.writeFileSync(checkpointPath, '{"revision":2,"reviews":[1,2,3]}');
    fs.writeFileSync(planningPath, '{"derived":2}');
    expect(runtime.implementationFingerprint(explicit, root)).toBe(explicitBefore);
    expect(runtime.implementationFingerprint(broad, root)).toBe(broadBefore);
    fs.writeFileSync(path.join(root, 'src', 'a.js'), 'changed implementation');
    expect(runtime.implementationFingerprint(explicit, root)).not.toBe(explicitBefore);
    expect(runtime.implementationFingerprint(broad, root)).not.toBe(broadBefore);
    blocked(
      () => runtime.implementationFingerprint({ fingerprint_paths: ['.agent/work/fingerprint-test/resume.json'] }, root),
      'implementation scope contains only runtime control state'
    );

    const directRoot = repo('runtime-control-direct-');
    fs.writeFileSync(path.join(directRoot, '.agent'), 'control agent');
    fs.writeFileSync(path.join(directRoot, '.planning'), 'control planning');
    spawnSync('git', ['init', '-q'], { cwd: directRoot });
    spawnSync('git', ['config', 'user.email', 'runtime@example.test'], { cwd: directRoot });
    spawnSync('git', ['config', 'user.name', 'Runtime Test'], { cwd: directRoot });
    spawnSync('git', ['add', '.'], { cwd: directRoot });
    spawnSync('git', ['commit', '-qm', 'fixture'], { cwd: directRoot });
    const directScope = { fingerprint_paths: ['src/a.js', '.agent', '.planning'] };
    const directBefore = runtime.implementationFingerprint(directScope, directRoot);
    fs.writeFileSync(path.join(directRoot, '.agent'), 'control agent changed');
    fs.writeFileSync(path.join(directRoot, '.planning'), 'control planning changed');
    expect(runtime.implementationFingerprint(directScope, directRoot)).toBe(directBefore);
  });

  test('pointer zero/one/many boundaries and optional arrays retain exact behavior', () => {
    const c = checkpoint();
    const evidence = fixtures()['evidence.v1.schema.json'];
    for (const pointer of ['', ' ', 0, null]) blocked(() => runtime.validateEvidence([{ ...evidence, pointer }], c), 'evidence pointer missing');
    for (const pointer of ['x'.repeat(513), 'line\nbreak', 'secret=value', 'TOKEN abc', 'Authorization: x', 'bearer x']) {
      blocked(() => runtime.validateEvidence([{ ...evidence, pointer }], c), 'sanitized pointer invalid');
    }
    const prefix = 'p/';
    const boundary = `${prefix}${'x'.repeat(512 - prefix.length)}`;
    expect(runtime.validateEvidence([{ ...evidence, pointer: boundary }], c)).toBe(true);
    for (const override of [
      { sealed_revision: c.sealed_revision + 1 },
      { acceptance_manifest_id: 'other-manifest' },
      { acceptance_manifest_version: c.acceptance_manifest.version + 1 }
    ]) blocked(() => runtime.validateEvidence([{ ...evidence, ...override }], c), 'evidence binding invalid');
    expect(runtime.validateEvidence(undefined, c)).toBe(true);
    expect(runtime.validateContinuity(checkpoint({ leases: undefined, imports: undefined }), { expectedRevision: 9, sourceRevision: 'f10-quality-tooling' })).toBe(true);

    const imported = fixtures()['import-attribution.v1.schema.json'];
    expect(runtime.validateContinuity(checkpoint({ imports: [imported] }), { expectedRevision: 9, sourceRevision: 'f10-quality-tooling' })).toBe(true);
    const invalidFloor = checkpoint({ sealed_at: 'invalid', imports: [{ ...imported, imported_at: '2026-08-16T12:00:01.000Z' }] });
    blocked(() => runtime.validateContinuity(invalidFloor, { expectedRevision: 9, sourceRevision: 'f10-quality-tooling' }), 'sealed_at invalid');
  });

  test('evidence and recovery ZOMBIES preserve exact closure, binding and attribution reasons', () => {
    const values = fixtures();
    const c = checkpoint();
    const evidence = values['evidence.v1.schema.json'];
    expect(runtime.validateEvidence([evidence], c)).toBe(true);
    for (const [mutate, message] of /** @type {Array<[(value: any) => void, string]>} */ ([
      [x => { x.schema = 'Evidence/v0'; }, 'typed evidence incomplete'],
      [x => { x.id = ''; }, 'evidence id missing'],
      [x => { x.timestamp = ''; }, 'evidence timestamp missing'],
      [x => { x.timestamp = 'invalid'; }, 'evidence timestamp invalid'],
      [x => { x.class = 'Static'; x.closes_runtime = true; }, 'static/code evidence cannot close Runtime']
    ])) {
      const value = clone(evidence); mutate(value);
      blocked(() => runtime.validateEvidence([value], c), message);
    }
    const runtimeEvidence = { ...clone(evidence), class: 'Runtime', closes_runtime: true, actor: 'operator' };
    blocked(() => runtime.validateEvidence([{ ...runtimeEvidence, actor: '' }], c), 'runtime actor missing');
    blocked(() => runtime.validateEvidence([runtimeEvidence], { ...c, sealed_at: 'invalid' }), 'sealed_at invalid');
    blocked(() => runtime.validateEvidence([{ ...runtimeEvidence, timestamp: '2026-08-16T11:59:59.999Z' }], c), 'runtime evidence predates seal');

    const recovery = values['recovery-evidence.v1.schema.json'];
    const recoveryRoot = repo('runtime-recovery-matrix-');
    const recoveryFile = save(recoveryRoot, c);
    for (const [mutate, message] of /** @type {Array<[(value: any) => void, string]>} */ ([
      [x => { x.schema = 'RecoveryEvidence/v0'; }, 'typed recovery evidence incomplete'],
      [x => { x.id = ''; }, 'recovery id missing'],
      [x => { x.action = ''; }, 'recovery action missing'],
      [x => { x.actor = ''; }, 'recovery actor missing'],
      [x => { x.attribution = ''; }, 'recovery attribution missing'],
      [x => { x.result = ''; }, 'recovery result missing'],
      [x => { x.rollback = ''; }, 'recovery rollback missing'],
      [x => { x.timestamp = ''; }, 'recovery timestamp missing'],
      [x => { x.work_id = 'other-work'; }, 'recovery evidence binding invalid'],
      [x => { x.timestamp = '2026-08-16T11:59:59.999Z'; }, 'recovery timestamp predates required seal'],
      [x => { x.attribution = 'secret=value'; }, 'sanitized pointer invalid'],
      [x => { x.ac_refs = ['AC-OUTSIDE']; }, 'recovery AC refs outside active manifest']
    ])) {
      const value = clone(recovery); mutate(value);
      blocked(() => runtime.recordRecoveryEvidence(recoveryFile, value, c.revision, c.source_revision), message);
    }

    const gateRoot = repo('runtime-persisted-recovery-');
    spawnSync('git', ['init', '-q'], { cwd: gateRoot });
    spawnSync('git', ['config', 'user.email', 'runtime@example.test'], { cwd: gateRoot });
    spawnSync('git', ['config', 'user.name', 'Runtime Test'], { cwd: gateRoot });
    spawnSync('git', ['add', '.'], { cwd: gateRoot });
    spawnSync('git', ['commit', '-qm', 'fixture'], { cwd: gateRoot });
    const gate = checkpoint({ risk: 'high', lifecycle_state: 'VERIFY', allowed_paths: ['src/**'], fingerprint_paths: ['src/**'], review_generation: 1 });
    gate.implementation_fingerprint = runtime.implementationFingerprint(gate, gateRoot);
    const packet = { ...clone(values['blind-review-packet.v2.schema.json']), ...binding(gate), review_scope: { paths: gate.fingerprint_paths, absence_assertions: {} } };
    gate.review_packet = packet;
    const set = { ...clone(values['dispatch-profile-attestation-set.v1.schema.json']), ...binding(gate), packet_id: packet.packet_id, packet_version: packet.packet_version, wave: packet.wave };
    gate.dispatch_attestation_set = { pointer: 'set.json' };
    const gateDir = path.join(gateRoot, '.agent', 'work', gate.work_id);
    fs.mkdirSync(gateDir, { recursive: true });
    fs.writeFileSync(path.join(gateDir, 'set.json'), JSON.stringify(set));
    const review = values['review-receipt.v2.schema.json'];
    gate.reviews = set.entries.map(entry => ({ ...clone(review), ...binding(gate), reviewer_id: entry.reviewer_id, dispatch_task_id: entry.task_id, dispatch_id: entry.dispatch_id, lens: entry.lens, packet_id: packet.packet_id, packet_version: packet.packet_version, wave: packet.wave }));
    const reverse = values['reverse-validation-receipt.v1.schema.json'];
    gate.verification = ['trace_scope', 'technical_safety', 'evidence_truth'].map((type, index) => ({ ...clone(reverse), ...binding(gate), receipt_id: `persisted-${index}`, reviewer_id: `persisted-reviewer-${index}`, type, packet_id: packet.packet_id, packet_version: packet.packet_version }));
    gate.evidence = [{ ...clone(evidence), ...binding(gate) }];
    gate.recovery_evidence = [{ ...clone(recovery), ...binding(gate), schema: 'RecoveryEvidence/v0' }];
    blocked(() => runtime.validateGate(gate, 'verify:post', { expectedRevision: gate.revision, sourceRevision: gate.source_revision, root: gateRoot }), 'typed recovery evidence incomplete');
  });

  test('actor and dispatch path boundaries reject exact counterexamples', () => {
    const delivery = fixtures()['delivery-receipt.v2.schema.json'];
    const c = checkpoint({ lifecycle_state: 'DELIVERY', sealed_at: '2026-08-16T11:00:00.000Z', verification_completed_at: '2026-08-16T12:00:00.000Z', delivery_cycle_id: 'cycle-1' });
    expect(() => runtime.validateDelivery({ ...delivery, actor: 'a'.repeat(256) }, c)).not.toThrow();
    blocked(() => runtime.validateDelivery(delivery, { ...c, sealed_at: 'invalid' }), 'delivery timestamp floor invalid');
    blocked(() => runtime.validateDelivery({ ...delivery, actor: 'a'.repeat(257) }, c), 'delivery actor unsafe');
    blocked(() => runtime.validateDelivery({ ...delivery, source: 'secret=value' }, c), 'delivery source unsafe');
    blocked(() => runtime.validateDelivery({ ...delivery, sanitized_pointers: [{}] }, c), 'sanitized pointer invalid');
    blocked(() => runtime.validateDelivery({ ...delivery, sanitized_pointers: ['   '] }, c), 'sanitized pointer invalid');

    const root = repo('runtime-dispatch-path-');
    const packet = fixtures()['blind-review-packet.v2.schema.json'];
    const reviewCheckpoint = checkpoint({ review_packet: packet, review_generation: 1, dispatch_attestation_set: { pointer: {} } });
    blocked(() => runtime.validateReviews([], reviewCheckpoint, root), 'review attestation set missing');
  });

  test('delivery ZOMBIES preserve cycle, timestamp, binding and pointer boundaries', () => {
    const delivery = fixtures()['delivery-receipt.v2.schema.json'];
    const c = checkpoint({ lifecycle_state: 'DELIVERY', sealed_at: '2026-08-16T11:00:00.000Z', verification_completed_at: '2026-08-16T12:00:00.000Z', delivery_cycle_id: 'cycle-1' });
    expect(runtime.validateDelivery(delivery, c)).toBeUndefined();
    for (const [value, message] of [
      [{ ...delivery, schema: 'DeliveryReceipt/v1' }, 'delivery receipt invalid'],
      [{ ...delivery, work_id: 'other-work' }, 'delivery receipt binding invalid'],
      [{ ...delivery, timestamp: 'invalid' }, 'delivery timestamp invalid'],
      [{ ...delivery, timestamp: '2026-08-16T11:59:59.999Z' }, 'delivery approval predates verification completion'],
      [{ ...delivery, sanitized_pointers: null }, 'delivery pointers missing']
    ]) blocked(() => runtime.validateDelivery(value, c), message);
    blocked(() => runtime.validateDelivery(delivery, { ...c, verification_completed_at: undefined }), 'verification completed at missing');
    blocked(() => runtime.validateDelivery(delivery, { ...c, verification_completed_at: 'invalid' }), 'verification completed at invalid');
    blocked(() => runtime.validateDelivery(delivery, { ...c, delivery_cycle_id: undefined }), 'delivery cycle missing');
  });

  test('runtime ZOMBIES preserve status, time, binding, attribution and blocking boundaries', () => {
    const values = fixtures();
    const delivery = values['delivery-receipt.v2.schema.json'];
    const receipt = values['runtime-receipt.v2.schema.json'];
    const c = checkpoint({ lifecycle_state: 'DELIVERY', verification_completed_at: '2026-08-16T12:00:00.000Z', delivery_cycle_id: 'cycle-1', delivery_receipt: delivery });
    const root = repo('runtime-receipt-matrix-');
    const file = save(root, c);
    const record = value => runtime.recordRuntimeReceipt(file, value, c.revision, c.source_revision);
    for (const [value, message] of [
      [{ ...receipt, schema: 'RuntimeReceipt/v1' }, 'runtime receipt invalid'],
      [{ ...receipt, work_id: 'other-work' }, 'runtime receipt binding invalid'],
      [{ ...receipt, environment: '' }, 'runtime environment missing'],
      [{ ...receipt, actor: '' }, 'runtime actor missing'],
      [{ ...receipt, timestamp: 'invalid' }, 'runtime timestamp invalid'],
      [{ ...receipt, ac_refs: ['AC-OUTSIDE'] }, 'runtime AC refs outside active manifest'],
      [{ ...receipt, sanitized_pointers: ['secret=value'] }, 'sanitized pointer invalid'],
      [{ ...receipt, status: 'deferred', gap_or_defect_pointer: 'secret=value' }, 'sanitized pointer invalid'],
      [{ ...receipt, status: 'accepted', blocking: true }, 'accepted Runtime receipt needs attributable pointers'],
      [{ ...receipt, status: 'deferred' }, 'deferred/pending/failed Runtime needs GAP/defect'],
      [{ ...receipt, status: 'pending' }, 'deferred/pending/failed Runtime needs GAP/defect'],
      [{ ...receipt, status: 'failed' }, 'deferred/pending/failed Runtime needs GAP/defect'],
      [{ ...receipt, blocking: true }, 'runtime disposition invalid']
    ]) blocked(() => record(value), message);

    const validStatuses = [
      receipt,
      { ...receipt, status: 'deferred', gap_or_defect_pointer: 'GAP-1' },
      { ...receipt, status: 'pending', gap_or_defect_pointer: 'GAP-1' },
      { ...receipt, status: 'failed', gap_or_defect_pointer: 'GAP-1' },
      { ...receipt, status: 'accepted', blocking: true, sanitized_pointers: ['runtime/receipt'] }
    ];
    for (const [index, value] of validStatuses.entries()) {
      const state = { ...c, work_id: `runtime-status-${index}`, delivery_receipt: { ...delivery, work_id: `runtime-status-${index}` } };
      const boundValue = { ...value, ...binding(state) };
      expect(runtime.recordRuntimeReceipt(save(root, state), boundValue, state.revision, state.source_revision).runtime_receipt.status).toBe(value.status);
    }

    const earlierDelivery = { ...delivery, timestamp: '2026-08-16T11:00:00.000Z' };
    const temporal = { ...c, work_id: 'runtime-temporal', sealed_at: '2026-08-16T10:00:00.000Z', delivery_receipt: { ...earlierDelivery, work_id: 'runtime-temporal' } };
    const temporalReceipt = { ...receipt, ...binding(temporal), timestamp: '2026-08-16T11:30:00.000Z' };
    blocked(() => runtime.recordRuntimeReceipt(save(root, temporal), temporalReceipt, temporal.revision, temporal.source_revision), 'runtime receipt predates verification/delivery');
    const invalidDeliveryTime = { ...c, work_id: 'runtime-invalid-delivery', delivery_receipt: { ...delivery, work_id: 'runtime-invalid-delivery', timestamp: 'invalid' } };
    blocked(() => runtime.recordRuntimeReceipt(save(root, invalidDeliveryTime), { ...receipt, ...binding(invalidDeliveryTime) }, invalidDeliveryTime.revision, invalidDeliveryTime.source_revision), 'delivery timestamp invalid');
    const invalidVerificationTime = { ...c, work_id: 'runtime-invalid-verification', verification_completed_at: 'invalid', delivery_receipt: { ...delivery, work_id: 'runtime-invalid-verification' } };
    blocked(() => runtime.recordRuntimeReceipt(save(root, invalidVerificationTime), { ...receipt, ...binding(invalidVerificationTime) }, invalidVerificationTime.revision, invalidVerificationTime.source_revision), 'verification completed at invalid');
  });

  test('runCli default argv is sliced and unsupported commands set the public exit code', () => {
    const originalArgv = process.argv;
    const originalExitCode = process.exitCode;
    process.argv = ['node', 'runtime.cjs', 'unsupported-default'];
    process.exitCode = undefined;
    try {
      runtime.runCli();
      expect(process.exitCode).toBe(2);
    } finally {
      process.argv = originalArgv;
      process.exitCode = originalExitCode;
    }
  });
});

describe('runtime mutation invariants: continuity, packet and attestation matrices', () => {
  test('mixed AC refs, imports and lease expiry/identity remain closed', () => {
    const c = checkpoint();
    const values = fixtures();
    const evidence = values['evidence.v1.schema.json'];
    blocked(() => runtime.validateEvidence([{ ...evidence, ac_refs: ['AC-QUALITY-1', 'OUTSIDE'] }], c), 'evidence AC refs outside active manifest');

    const imported = values['import-attribution.v1.schema.json'];
    const importCases = /** @type {Array<[(value: any) => void, string]>} */ ([
      [x => { x.schema = 'ImportAttribution/v0'; }, 'invalid result import'],
      [x => { x.status = 'pending'; }, 'invalid result import'],
      [x => { x.import_id = ''; }, 'import id missing'],
      [x => { x.provider = ''; }, 'import provider missing'],
      [x => { x.receipt_pointer = ''; }, 'import pointer missing'],
      [x => { x.imported_at = ''; }, 'import timestamp missing']
    ]);
    for (const [mutate, message] of importCases) {
      const value = clone(imported); mutate(value);
      blocked(() => runtime.validateContinuity(checkpoint({ imports: [value] }), { expectedRevision: 9, sourceRevision: 'f10-quality-tooling' }), message);
    }
    blocked(() => runtime.validateContinuity(checkpoint({ imports: [{ ...imported, work_id: 'other-work' }] }), { expectedRevision: 9, sourceRevision: 'f10-quality-tooling' }), 'import attribution binding invalid');
    blocked(() => runtime.validateContinuity(checkpoint({ imports: [{ ...imported, receipt_pointer: 'secret=value' }] }), { expectedRevision: 9, sourceRevision: 'f10-quality-tooling' }), 'sanitized pointer invalid');
    blocked(() => runtime.validateContinuity(checkpoint({ imports: [{ ...imported, imported_at: '2026-08-16T11:59:59.999Z' }] }), { expectedRevision: 9, sourceRevision: 'f10-quality-tooling' }), 'import timestamp predates required seal');
    blocked(() => runtime.validateContinuity(checkpoint({ imports: [imported, { ...imported }] }), { expectedRevision: 9, sourceRevision: 'f10-quality-tooling' }), 'duplicate import');

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-16T12:00:00.000Z'));
    try {
      const lease = { id: 'lease-1', holder: 'worker', purpose: 'review', status: 'active', expires_at: '2026-08-16T12:00:00.001Z' };
      expect(runtime.validateContinuity(checkpoint({ leases: [lease] }), { expectedRevision: 9, sourceRevision: 'f10-quality-tooling' })).toBe(true);
      blocked(() => runtime.validateContinuity(checkpoint({ leases: [{ ...lease, expires_at: 'invalid' }] }), { expectedRevision: 9, sourceRevision: 'f10-quality-tooling' }), 'lease expiry invalid');
      blocked(() => runtime.validateContinuity(checkpoint({ leases: [{ ...lease, expires_at: '2026-08-16T12:00:00.000Z' }] }), { expectedRevision: 9, sourceRevision: 'f10-quality-tooling' }), 'stale or invalid lease');
      blocked(() => runtime.validateContinuity(checkpoint({ leases: [lease, { ...lease }] }), { expectedRevision: 9, sourceRevision: 'f10-quality-tooling' }), 'stale or invalid lease');
      const leaseCases = /** @type {Array<[(value: any) => void, string]>} */ ([
        [x => { x.id = ''; }, 'lease id missing'],
        [x => { x.holder = ''; }, 'lease holder missing'],
        [x => { x.purpose = ''; }, 'lease purpose missing'],
        [x => { x.status = 'expired'; }, 'stale or invalid lease']
      ]);
      for (const [mutate, message] of leaseCases) {
        const value = clone(lease); mutate(value);
        blocked(() => runtime.validateContinuity(checkpoint({ leases: [value] }), { expectedRevision: 9, sourceRevision: 'f10-quality-tooling' }), message);
      }
    } finally { vi.useRealTimers(); }
  });

  test('packet scope and attestation core/text/binding/profile matrices are exact', () => {
    const values = fixtures();
    const packet = values['blind-review-packet.v2.schema.json'];
    const set = values['dispatch-profile-attestation-set.v1.schema.json'];
    const c = checkpoint({ review_generation: 1 });
    expect(runtime.validateAttestationSet(set, packet, c)).toEqual(set);
    blocked(() => runtime.validateAttestationSet(null, packet, c), 'trusted dispatch attestation set invalid');

    for (const mutate of [
      x => { x.schema = 'DispatchProfileAttestationSet/v0'; },
      x => { x.runtime_metadata_observed = true; },
      x => { x.entries = null; },
      x => { x.entries = x.entries.slice(0, 2); }
    ]) {
      const value = clone(set); mutate(value);
      blocked(() => runtime.validateAttestationSet(value, packet, c), 'trusted dispatch attestation set invalid');
    }
    for (const field of ['packet_id', 'orchestrator', 'selector_source', 'requested_model', 'requested_reasoning_effort', 'issued_at', 'root_task_id', 'root_dispatch_id']) {
      const value = clone(set); value[field] = '';
      blocked(() => runtime.validateAttestationSet(value, packet, c), `dispatch set ${field} missing`);
    }
    blocked(() => runtime.validateAttestationSet(set, packet, null), 'dispatch set checkpoint required');
    for (const override of [
      { sealed_revision: c.sealed_revision + 1 },
      { acceptance_manifest_id: 'other' },
      { acceptance_manifest_version: 2 }
    ]) blocked(() => runtime.validateAttestationSet({ ...set, ...override }, packet, c), 'dispatch set binding invalid');
    blocked(() => runtime.validateAttestationSet({ ...set, issued_at: '2026-08-16T11:59:59.999Z' }, packet, c), 'dispatch set timestamp predates required seal');
    for (const mutate of [
      x => { x.packet_id = 'other'; },
      x => { x.packet_version = 2; },
      x => { x.wave = 2; },
      x => { x.requested_model = 'other'; },
      x => { x.requested_reasoning_effort = 'low'; }
    ]) {
      const value = clone(set); mutate(value);
      blocked(() => runtime.validateAttestationSet(value, packet, c), 'dispatch set packet/profile mismatch');
    }
    const noProfile = clone(packet);
    delete noProfile.required_profile;
    blocked(() => runtime.validateAttestationSet(set, noProfile, c), 'dispatch set packet/profile mismatch');

    const baseReparseRoot = repo('runtime-attestation-base-');
    const baseReparseCheckpoint = checkpoint({ review_generation: 1, review_packet: packet, dispatch_attestation_set: { pointer: 'set.json' } });
    const baseParent = path.join(baseReparseRoot, '.agent', 'work');
    const outsideBase = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-outside-base-'));
    fs.mkdirSync(baseParent, { recursive: true });
    const linkedBase = path.join(baseParent, baseReparseCheckpoint.work_id);
    fs.symlinkSync(outsideBase, linkedBase, 'junction');
    blocked(() => runtime.validateReviews([], baseReparseCheckpoint, baseReparseRoot), `reparse point is not allowed: ${linkedBase}`);

    const fileReparseRoot = repo('runtime-attestation-file-');
    const fileReparseCheckpoint = checkpoint({ review_generation: 1, review_packet: packet, dispatch_attestation_set: { pointer: 'linked/set.json' } });
    const realBase = path.join(fileReparseRoot, '.agent', 'work', fileReparseCheckpoint.work_id);
    const outsideFile = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-outside-file-'));
    fs.mkdirSync(realBase, { recursive: true });
    fs.writeFileSync(path.join(outsideFile, 'set.json'), JSON.stringify(set));
    const linkedFileParent = path.join(realBase, 'linked');
    fs.symlinkSync(outsideFile, linkedFileParent, 'junction');
    blocked(() => runtime.validateReviews([], fileReparseCheckpoint, fileReparseRoot), `reparse point is not allowed: ${linkedFileParent}`);
  });

  test('review and reverse receipt matrices preserve exact identities and reasons', () => {
    const values = fixtures();
    const packet = values['blind-review-packet.v2.schema.json'];
    const set = values['dispatch-profile-attestation-set.v1.schema.json'];
    const reviewsRoot = repo('runtime-review-matrix-');
    const reviewsCheckpoint = checkpoint({ review_generation: 1, review_packet: packet, dispatch_attestation_set: { pointer: 'set.json' } });
    const reviewsDir = path.join(reviewsRoot, '.agent', 'work', reviewsCheckpoint.work_id);
    fs.mkdirSync(reviewsDir, { recursive: true });
    fs.writeFileSync(path.join(reviewsDir, 'set.json'), JSON.stringify(set));
    const reviewFixture = values['review-receipt.v2.schema.json'];
    const reviews = set.entries.map(entry => ({
      ...clone(reviewFixture),
      reviewer_id: entry.reviewer_id,
      dispatch_task_id: entry.task_id,
      dispatch_id: entry.dispatch_id,
      lens: entry.lens,
      packet_id: packet.packet_id,
      packet_version: packet.packet_version,
      wave: packet.wave,
      findings: [],
      verdict: 'clean'
    }));
    expect(runtime.validateReviews(reviews, reviewsCheckpoint, reviewsRoot)).toBe(true);
    blocked(() => runtime.validateReviews(null, reviewsCheckpoint, reviewsRoot), 'exactly three review receipts required');
    for (const [mutate, message] of /** @type {Array<[(value: any) => void, string]>} */ ([
      [x => { x[0] = null; }, 'review receipt binding invalid'],
      [x => { x[0].schema = 'ReviewReceipt/v1'; }, 'review receipt binding invalid'],
      [x => { x[0].reviewer_id = ''; }, 'reviewer missing'],
      [x => { x[0].dispatch_task_id = ''; }, 'task missing'],
      [x => { x[0].dispatch_id = ''; }, 'dispatch missing'],
      [x => { x[0].history_isolation = false; }, 'review receipt binding invalid'],
      [x => { x[0].verdict = 'changes_required'; }, 'review receipt binding invalid'],
      [x => { x[0].findings = ['unexpected']; }, 'review receipt binding invalid'],
      [x => { x[0].packet_version += 1; }, 'review packet binding invalid'],
      [x => { x[0].wave += 1; }, 'review packet binding invalid'],
      [x => { x[0].work_id = 'other-work'; }, 'review receipt binding invalid'],
      [x => { x[0].reviewer_id = 'other-reviewer'; }, 'review receipt is not root-attested'],
      [x => { x[0].dispatch_task_id = 'other-task'; }, 'review receipt is not root-attested'],
      [x => { x[0].dispatch_id = 'other-dispatch'; }, 'review receipt is not root-attested'],
      [x => { x[0].lens = runtime.lenses[1]; }, 'review receipt is not root-attested'],
      [x => { x[1] = clone(x[0]); }, 'duplicate reviewer receipt']
    ])) {
      const value = clone(reviews); mutate(value);
      blocked(() => runtime.validateReviews(value, reviewsCheckpoint, reviewsRoot), message);
    }
    const blockedReview = clone(reviews);
    blockedReview[0].verdict = 'blocked';
    blockedReview[0].findings = ['blocking finding'];
    blocked(() => runtime.validateReviews(blockedReview, reviewsCheckpoint, reviewsRoot), 'review changes required');

    const reverseFixture = values['reverse-validation-receipt.v1.schema.json'];
    const reverseTypes = ['trace_scope', 'technical_safety', 'evidence_truth'];
    const reverses = reverseTypes.map((type, index) => ({
      ...clone(reverseFixture),
      receipt_id: `reverse-${index}`,
      reviewer_id: `reverse-reviewer-${index}`,
      type,
      packet_id: packet.packet_id,
      packet_version: packet.packet_version
    }));
    expect(runtime.validateReverseValidation(reverses, reviewsCheckpoint)).toBe(true);
    blocked(() => runtime.validateReverseValidation(null, reviewsCheckpoint), 'three reverse validations required');
    for (const [mutate, message] of /** @type {Array<[(value: any) => void, string]>} */ ([
      [x => { x[0].schema = 'ReverseValidationReceipt/v0'; }, 'reverse validation invalid'],
      [x => { x[0].receipt_id = ''; }, 'reverse id missing'],
      [x => { x[0].reviewer_id = ''; }, 'reverse reviewer missing'],
      [x => { x[0].verdict = 'fail'; }, 'reverse validation invalid'],
      [x => { x[0].validator = ''; }, 'validator missing'],
      [x => { x[0].timestamp = ''; }, 'reverse timestamp missing'],
      [x => { x[0].timestamp = 'invalid'; }, 'reverse timestamp invalid'],
      [x => { x[0].work_id = 'other-work'; }, 'reverse receipt binding invalid'],
      [x => { x[0].packet_version += 1; }, 'reverse packet binding invalid'],
      [x => { x[0].ac_refs = ['AC-OUTSIDE']; }, 'reverse AC refs outside active manifest'],
      [x => { x[1].receipt_id = x[0].receipt_id; }, 'reverse receipt duplicate'],
      [x => { x[1].type = x[0].type; }, 'reverse receipt duplicate'],
      [x => { x[1].reviewer_id = x[0].reviewer_id; }, 'reverse receipt duplicate']
    ])) {
      const value = clone(reverses); mutate(value);
      blocked(() => runtime.validateReverseValidation(value, reviewsCheckpoint), message);
    }
  });

  test('attestation entry uniqueness and packet identity/scope matrices are exact', () => {
    const values = fixtures();
    const packet = values['blind-review-packet.v2.schema.json'];
    const set = values['dispatch-profile-attestation-set.v1.schema.json'];
    const c = checkpoint({ review_generation: 1 });
    const entryCases = /** @type {Array<[(value: any) => void, string]>} */ ([
      [x => { x.task_id = ''; }, 'task id missing'],
      [x => { x.dispatch_id = ''; }, 'dispatch id missing'],
      [x => { x.reviewer_id = ''; }, 'reviewer id missing'],
      [x => { x.lens = 'unknown'; }, 'dispatch set entry invalid'],
      [x => { x.task_id = set.root_task_id; }, 'dispatch set entry invalid'],
      [x => { x.dispatch_id = set.root_dispatch_id; }, 'dispatch set entry invalid']
    ]);
    for (const [mutate, message] of entryCases) {
      const value = clone(set); mutate(value.entries[0]);
      blocked(() => runtime.validateAttestationSet(value, packet, c), message);
    }
    for (const field of ['task_id', 'dispatch_id', 'reviewer_id', 'lens']) {
      const value = clone(set); value.entries[1][field] = value.entries[0][field];
      blocked(() => runtime.validateAttestationSet(value, packet, c), 'dispatch set entry invalid');
    }

    const reviewBase = checkpoint({ review_packet: packet, review_generation: 1, dispatch_attestation_set: { pointer: {} } });
    const fingerprintScope = clone(reviewBase);
    fingerprintScope.allowed_paths = ['different/from/fingerprint.js'];
    blocked(() => runtime.validateReviews([], fingerprintScope, repo('runtime-fingerprint-scope-')), 'review attestation set missing');
    const packetBinding = clone(reviewBase);
    packetBinding.review_packet.work_id = 'other-work';
    blocked(() => runtime.validateReviews([], packetBinding, repo('runtime-packet-binding-')), 'review packet binding invalid');
    for (const mutate of [
      p => { p.schema = 'BlindReviewPacket/v1'; },
      p => { p.status = 'draft'; },
      p => { p.generation = 2; }
    ]) {
      const value = clone(reviewBase); mutate(value.review_packet);
      blocked(() => runtime.validateReviews([], value, repo('runtime-packet-core-')), 'current frozen review packet required');
    }
    const missingPacketId = clone(reviewBase);
    missingPacketId.review_packet.packet_id = '';
    blocked(() => runtime.validateReviews([], missingPacketId, repo('runtime-packet-id-')), 'packet id missing');
    for (const mutate of [
      p => { p.review_scope = null; },
      p => { p.review_scope.paths = ['other']; },
      p => { p.review_scope.absence_assertions = { unexpected: true }; }
    ]) {
      const value = clone(reviewBase); mutate(value.review_packet);
      blocked(() => runtime.validateReviews([], value, repo('runtime-packet-scope-')), 'review packet scope mismatch');
    }
    const incompleteContext = clone(reviewBase);
    incompleteContext.review_packet.acceptance = [];
    blocked(() => runtime.validateReviews([], incompleteContext, repo('runtime-packet-context-')), 'current frozen review packet required');
  });
});
