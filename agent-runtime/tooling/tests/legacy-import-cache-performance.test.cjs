/* global afterEach, vi */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawn } = require('child_process');
const { performance } = require('perf_hooks');
const legacy = require('../../lib/legacy-import.cjs');

const temporaryRoots=[];
function temporaryRoot(prefix) {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),prefix));
  temporaryRoots.push(root);
  return root;
}
function writeJson(file,value) { fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value)); }
function cachePath(root) { return path.join(root,'.planning','agent-flow','cache','legacy-import.v1.json'); }
function waitForLine(child) {
  return new Promise((resolve,reject)=>{
    child.once('error',reject);
    child.stdout.once('data',resolve);
    child.once('exit',code=>{if(code!==null&&code!==0)reject(new Error(`lock holder exited ${code}`));});
  });
}

afterEach(()=>{
  while(temporaryRoots.length)fs.rmSync(temporaryRoots.pop(),{recursive:true,force:true});
  vi.restoreAllMocks();
});

describe('bounded legacy discovery and selection-first import',()=>{
  test('default discovery publishes exact bounds and representative real traversal stays below three seconds',()=>{
    const empty=temporaryRoot('legacy-default-bounds-');
    expect(legacy.importLegacy(empty).inventory).toMatchObject({
      complete:true,max_files:100,max_entries:1000,time_budget_ms:1000,max_file_bytes:262144
    });
    const root=temporaryRoot('legacy-real-directory-');
    for(let index=0;index<50;index++)fs.writeFileSync(path.join(root,`${String(index).padStart(4,'0')}.txt`),'ignored');
    const started=performance.now();
    const receipt=legacy.importLegacy(root,{maxFiles:1,maxEntries:25});
    const wallMs=performance.now()-started;
    expect(receipt.inventory).toMatchObject({
      truncated:true,bound_reason:'max_entries',visited_entries:25,imported_files:0,
      max_files:1,max_entries:25,time_budget_ms:1000,max_file_bytes:262144,
      gap:'GAP-LEGACY-IMPORT-BOUNDS-001'
    });
    expect(wallMs).toBeLessThan(3000);
    for(const options of [{maxFiles:0},{maxEntries:0},{timeBudgetMs:0},{timeBudgetMs:2001},{maxFileBytes:0},{now:/** @type {any} */ (1)}]) {
      expect(()=>legacy.importLegacy(empty,options)).toThrow();
    }
  });

  test('lazy directory iteration stops reading a representative huge directory at the entry bound',()=>{
    const root=temporaryRoot('legacy-lazy-directory-');
    let reads=0,closed=0;
    vi.spyOn(fs,'readdirSync').mockImplementation(()=>{throw new Error('eager enumeration is forbidden');});
    vi.spyOn(fs,'opendirSync').mockReturnValue(/** @type {any} */ ({
      readSync:()=>{reads++;return {name:`entry-${reads}.txt`,isDirectory:()=>false,isFile:()=>false};},
      closeSync:()=>{closed++;}
    }));
    const receipt=legacy.importLegacy(root,{maxFiles:1,maxEntries:25});
    expect(receipt.inventory).toMatchObject({truncated:true,bound_reason:'max_entries',visited_entries:25});
    expect(reads).toBe(25);
    expect(closed).toBe(1);
  });

  test('lazy discovery reports the max-file boundary before reading another entry',()=>{
    const root=temporaryRoot('legacy-max-files-');let reads=0;
    writeJson(path.join(root,'one.json'),{id:'one'});
    vi.spyOn(fs,'opendirSync').mockReturnValue(/** @type {any} */ ({readSync:()=>{reads++;return {name:'one.json',isDirectory:()=>false,isFile:()=>true};},closeSync:()=>{}}));
    const receipt=legacy.importLegacy(root,{maxFiles:1,maxEntries:25,now:()=>0});
    expect(receipt.inventory).toMatchObject({truncated:true,bound_reason:'max_files',visited_entries:1,imported_files:1});
    expect(reads).toBe(1);
  });

  test('canonical selection is sorted, deduplicated, selection-first and part of the descriptive cache key',()=>{
    const root=temporaryRoot('legacy-selection-'),cache=cachePath(root);
    writeJson(path.join(root,'b.json'),{id:'b'});
    writeJson(path.join(root,'a.json'),{id:'a'});
    writeJson(path.join(root,'not-selected.json'),{id:'ignored'});
    const reads=vi.spyOn(fs,'readFileSync');
    const receipt=legacy.importLegacy(root,{selection:['b.json','a.json','b.json'],maxFiles:2,cacheFile:cache});
    const sourceReads=reads.mock.calls.map(call=>path.resolve(String(call[0]))).filter(file=>file.startsWith(path.resolve(root))&&file.endsWith('.json'));
    expect(receipt.records.map(record=>record.pointer)).toEqual(['a.json','b.json']);
    expect(receipt.inventory).toMatchObject({complete:true,visited_entries:2,imported_files:2});
    expect(sourceReads).not.toContain(path.resolve(root,'not-selected.json'));
    const stored=JSON.parse(fs.readFileSync(cache,'utf8'));
    expect(JSON.parse(stored.entries[0].key).selection).toEqual(['a.json','b.json']);
    expect(JSON.stringify(stored)).not.toMatch(/"(?:hash|digest|fingerprint)"\s*:/i);
  });

  test('selection rejects invalid, excessive, escaping, missing and reparse-point inputs',()=>{
    const root=temporaryRoot('legacy-selection-invalid-');
    writeJson(path.join(root,'ok.json'),{});
    for(const selection of ['ok.json',[],[''],['note.txt'],['../escape.json'],[path.resolve(root,'ok.json')]]) {
      if(Array.isArray(selection)&&selection.length===0)continue;
      expect(()=>legacy.importLegacy(root,{selection:/** @type {any} */ (selection)})).toThrow(/selection/);
    }
    expect(legacy.importLegacy(root,{selection:[]}).records).toEqual([]);
    expect(()=>legacy.importLegacy(root,{selection:['missing.json']})).toThrow();
    expect(()=>legacy.importLegacy(root,{selection:['ok.json','other.json'],maxFiles:1})).toThrow(/maxFiles/);
    expect(()=>legacy.importLegacy(root,{selection:Array(5001).fill('ok.json'),maxFiles:5000,maxEntries:5000})).toThrow(/5000/);
    expect(()=>legacy.importLegacy(path.join(root,'ok.json'),{selection:['child.json']})).toThrow(/regular JSON files/);
    const original=fs.lstatSync;
    vi.spyOn(fs,'lstatSync').mockImplementation(/** @type {any} */ (file=>path.resolve(String(file))===path.resolve(root,'ok.json')
      ? {isSymbolicLink:()=>true,isFile:()=>true,isDirectory:()=>false}
      : original(file)));
    expect(()=>legacy.importLegacy(root,{selection:['ok.json']})).toThrow(/reparse/);
  });

  test('time and per-file byte boundaries stop deterministically before parsing',()=>{
    const root=temporaryRoot('legacy-time-bytes-');
    fs.writeFileSync(path.join(root,'large.json'),JSON.stringify({value:'x'.repeat(100)}));
    const read=vi.spyOn(fs,'readFileSync');
    const oversized=legacy.importLegacy(root,{selection:['large.json'],maxFileBytes:10});
    expect(oversized.records[0]).toMatchObject({parse_error:'legacy file exceeds configured byte bound',historical:true,non_authoritative:true});
    expect(read).not.toHaveBeenCalledWith(path.join(root,'large.json'),'utf8');
    let time=-1;
    const timed=legacy.importLegacy(root,{selection:['large.json'],timeBudgetMs:1,now:()=>++time});
    expect(timed.inventory).toMatchObject({truncated:true,bound_reason:'time_budget',visited_entries:0,imported_files:0});
    const ticks=[0,0,2];
    const normalizeTimed=legacy.importLegacy(root,{selection:['large.json'],timeBudgetMs:1,now:()=>ticks.shift()??2});
    expect(normalizeTimed.inventory).toMatchObject({truncated:true,bound_reason:'time_budget',visited_entries:1,imported_files:0});
  });
});

describe('derived non-authoritative legacy cache',()=>{
  test('zero/miss/hit/corruption/refresh preserve non-authority and never use cache as source truth',()=>{
    const root=temporaryRoot('legacy-cache-zombies-'),cache=cachePath(root),source=path.join(root,'one.json');
    const options={selection:['one.json'],cacheFile:cache,now:()=>0};
    writeJson(source,{id:'one'});
    const first=legacy.importLegacy(root,options);
    expect(first.cache).toEqual({policy:'derived_non_authoritative',hit:false,stored:true});
    writeJson(source,{id:'two'});
    const hit=legacy.importLegacy(root,options);
    expect(hit.records[0].id).toBe('one');
    expect(hit).toMatchObject({mode:'read_only',cache:{policy:'derived_non_authoritative',hit:true},assertions:{historical_non_authoritative:true,does_not_consume_approvals:true,does_not_consume_leases:true}});
    const refreshed=legacy.importLegacy(root,{...options,refresh:true});
    expect(refreshed.records[0].id).toBe('two');
    expect(refreshed.cache).toEqual({policy:'derived_non_authoritative',hit:false,stored:true});
    fs.writeFileSync(cache,'{corrupt');
    writeJson(source,{id:'three'});
    const rebuilt=legacy.importLegacy(root,options);
    expect(rebuilt.records[0].id).toBe('three');
    expect(rebuilt.cache).toEqual({policy:'derived_non_authoritative',hit:false,stored:true});
    fs.writeFileSync(cache,JSON.stringify({schema:'LegacyImportCache/invalid',entries:[]}));
    writeJson(source,{id:'four'});
    expect(legacy.importLegacy(root,options).records[0].id).toBe('four');
  });

  test('authority-tampered cache entries are misses and cache-write failure does not block import',()=>{
    const root=temporaryRoot('legacy-cache-tamper-'),cache=cachePath(root),source=path.join(root,'one.json');
    writeJson(source,{id:'safe'});
    legacy.importLegacy(root,{selection:['one.json'],cacheFile:cache});
    const stored=JSON.parse(fs.readFileSync(cache,'utf8'));
    stored.entries[0].receipt.assertions.historical_non_authoritative=false;
    stored.entries[0].receipt.records[0].id='forged';
    fs.writeFileSync(cache,JSON.stringify(stored));
    expect(legacy.importLegacy(root,{selection:['one.json'],cacheFile:cache}).records[0].id).toBe('safe');
    fs.mkdirSync(`${cache}.lock`);
    const started=performance.now();
    const receipt=legacy.importLegacy(root,{selection:['one.json'],cacheFile:cache,refresh:true});
    expect(performance.now()-started).toBeLessThan(3000);
    expect(receipt.cache).toEqual({policy:'derived_non_authoritative',hit:false,stored:false});
    expect(fs.existsSync(`${cache}.lock`)).toBe(true);
  });

  test('cache directory, atomic rename and temporary cleanup faults stay non-authoritative',()=>{
    const root=temporaryRoot('legacy-cache-faults-'),source=path.join(root,'one.json');writeJson(source,{id:'safe'});
    const directoryCache=path.join(root,'blocked','cache.json'),originalMkdir=fs.mkdirSync,mkdir=vi.spyOn(fs,'mkdirSync');
    mkdir.mockImplementation(/** @type {any} */ ((file,options)=>{if(path.resolve(String(file))===path.resolve(path.dirname(directoryCache)))throw new Error('mkdir fault');return originalMkdir(file,options);}));
    expect(legacy.importLegacy(root,{selection:['one.json'],cacheFile:directoryCache,now:()=>0}).cache.stored).toBe(false);
    mkdir.mockRestore();
    const cache=cachePath(root),rename=vi.spyOn(fs,'renameSync').mockImplementation(()=>{throw new Error('rename fault');}),unlink=vi.spyOn(fs,'unlinkSync').mockImplementation(()=>{throw new Error('cleanup fault');});
    expect(legacy.importLegacy(root,{selection:['one.json'],cacheFile:cache,refresh:true,now:()=>0}).cache.stored).toBe(false);
    expect(unlink).toHaveBeenCalledWith(expect.stringMatching(/\.tmp$/));
    rename.mockRestore();unlink.mockRestore();
  });

  test('a lock owned by another process makes cache persistence fail fast without waiting',async()=>{
    const root=temporaryRoot('legacy-cache-interprocess-'),cache=cachePath(root);
    writeJson(path.join(root,'one.json'),{id:'one'});
    fs.mkdirSync(path.dirname(cache),{recursive:true});
    const script=`const fs=require('fs');const lock=${JSON.stringify(`${cache}.lock`)};fs.mkdirSync(lock);process.stdout.write('ready\\n');const done=()=>{fs.rmSync(lock,{recursive:true,force:true});process.exit(0)};process.on('SIGTERM',done);setTimeout(done,2000);`;
    const holder=spawn(process.execPath,['-e',script],{stdio:['ignore','pipe','pipe']});
    const exited=new Promise(resolve=>holder.once('exit',resolve));
    await waitForLine(holder);
    try {
      const started=performance.now();
      const receipt=legacy.importLegacy(root,{selection:['one.json'],cacheFile:cache});
      expect(performance.now()-started).toBeLessThan(3000);
      expect(receipt.cache.stored).toBe(false);
    } finally { holder.kill();await exited; }
  },10000);

  test('CLI selection file is bounded and defaults cache under the derived .planning namespace',()=>{
    const workspace=temporaryRoot('legacy-cli-workspace-'),root=path.join(workspace,'legacy'),selectionFile=path.join(workspace,'selection.json');
    writeJson(path.join(root,'chosen.json'),{id:'chosen'});
    writeJson(path.join(root,'ignored.json'),{id:'ignored'});
    fs.writeFileSync(selectionFile,JSON.stringify(['chosen.json']));
    const cli=path.resolve(__dirname,'../../bin/legacy-import.cjs');
    const receipt=JSON.parse(execFileSync(process.execPath,[cli,root,'--selection-file',selectionFile],{cwd:workspace,encoding:'utf8'}));
    expect(receipt.records.map(record=>record.pointer)).toEqual(['chosen.json']);
    expect(fs.existsSync(cachePath(path.resolve(__dirname,'../../..')))).toBe(true);
    let direct='';legacy.runCli([root,'--selection-file',selectionFile],value=>{direct+=value;});
    expect(JSON.parse(direct).records.map(record=>record.pointer)).toEqual(['chosen.json']);
    expect(()=>legacy.runCli([root,'--selection-file',workspace],()=>{})).toThrow(/regular JSON file/);
    fs.writeFileSync(selectionFile,' '.repeat(262145));
    expect(()=>legacy.runCli([root,'--selection-file',selectionFile],()=>{})).toThrow(/262144 bytes/);
    fs.writeFileSync(selectionFile,'{}');
    expect(()=>legacy.runCli([root,'--selection-file',selectionFile],()=>{})).toThrow(/JSON array/);
    fs.writeFileSync(selectionFile,'{bad');
    expect(()=>legacy.runCli([root,'--selection-file',selectionFile],()=>{})).toThrow(/valid JSON/);
  });
});
