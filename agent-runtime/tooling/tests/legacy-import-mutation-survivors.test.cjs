/* global afterEach, vi */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const legacy = require('../../lib/legacy-import.cjs');

const temporaryRoots=[];
function temporaryRoot(prefix) {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),prefix));
  temporaryRoots.push(root);
  return root;
}
function writeJson(file,value) {
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,JSON.stringify(value));
}
function derivedCache(root) { return path.join(root,'.planning','agent-flow','cache','legacy-import.v1.json'); }

afterEach(()=>{
  while(temporaryRoots.length)fs.rmSync(temporaryRoots.pop(),{recursive:true,force:true});
  vi.restoreAllMocks();
});

describe('legacy importer mutation boundary contracts',()=>{
  test('configuration boundaries preserve exact defaults and fail-closed diagnostics',()=>{
    const root=temporaryRoot('legacy-mutation-options-');
    expect(legacy.importLegacy(root,{maxFiles:101}).inventory).toMatchObject({max_files:101,max_entries:1010});
    const invalid = [
      [{now:null},'legacy import clock must be a function'],
      [{maxFiles:0},'legacy import maxFiles must be an integer from 1 to 5000'],
      [{maxEntries:0},'legacy import maxEntries must be an integer from maxFiles to 50000'],
      [{timeBudgetMs:0},'legacy import timeBudgetMs must be an integer from 1 to 2000'],
      [{maxFileBytes:0},'legacy import maxFileBytes must be an integer from 1 to 5242880']
    ];
    for(const [options,message] of invalid)expect(()=>legacy.importLegacy(root,options)).toThrow(message);
  });

  test('selection validates each trust-boundary class and accepts the raw-count boundary',()=>{
    const root=temporaryRoot('legacy-mutation-selection-');
    writeJson(path.join(root,'ok.json'),{id:'ok'});
    const invalid = [
      [[1],'legacy import selection entries must be non-empty strings'],
      [[''],'legacy import selection entries must be non-empty strings'],
      [['note.txt'],'legacy import selection entries must be relative JSON paths'],
      [[path.resolve(root,'ok.json')],'legacy import selection entries must be relative JSON paths'],
      [['../escape.json'],'legacy import selection escapes the source root']
    ];
    for(const [selection,message] of invalid)expect(()=>legacy.importLegacy(root,{selection:/** @type {any} */ (selection)})).toThrow(message);
    expect(()=>legacy.importLegacy(root,{selection:/** @type {any} */ ('ok.json')})).toThrow('legacy import selection must be an array');
    expect(()=>legacy.importLegacy(root,{selection:Array(5001).fill('ok.json'),maxFiles:1})).toThrow('legacy import selection exceeds 5000 entries');
    expect(legacy.importLegacy(root,{selection:Array(5000).fill('ok.json'),maxFiles:1,now:()=>0}).records.map(record=>record.pointer)).toEqual(['ok.json']);
    expect(()=>legacy.importLegacy(root,{selection:['ok.json','other.json'],maxFiles:1})).toThrow('legacy import selection exceeds maxFiles');
  });

  test('canonical nested selection validates intermediate directories and exact file-size/time boundaries',()=>{
    const root=temporaryRoot('legacy-mutation-boundaries-');
    writeJson(path.join(root,'nested','exact.json'),{});
    const exact=legacy.importLegacy(root,{selection:['nested/other/../exact.json'],maxFileBytes:2,now:()=>0}).records[0];
    expect(exact.pointer).toBe('nested/exact.json');
    expect(exact).not.toHaveProperty('parse_error');
    const exactDeadline=[0,1,1,1];
    expect(legacy.importLegacy(root,{selection:['nested/exact.json'],timeBudgetMs:1,now:()=>exactDeadline.shift()??1}).inventory).toMatchObject({
      truncated:true,bound_reason:'time_budget',visited_entries:0,imported_files:0
    });
    const normalizeDeadline=[0,0,1,1];
    expect(legacy.importLegacy(root,{selection:['nested/exact.json'],timeBudgetMs:1,now:()=>normalizeDeadline.shift()??1}).inventory).toMatchObject({
      truncated:true,bound_reason:'time_budget',visited_entries:1,imported_files:0
    });
    const oversizedFile=path.join(root,'oversized.json');fs.writeFileSync(oversizedFile,'[ ]');
    const oversizedStat=fs.statSync(oversizedFile);
    expect(legacy.importLegacy(root,{selection:['oversized.json'],maxFileBytes:2,now:()=>0}).records[0]).toMatchObject({
      source_revision:`${oversizedStat.mtimeMs}:${oversizedStat.size}`,
      parse_error:'legacy file exceeds configured byte bound'
    });
    fs.writeFileSync(path.join(root,'bad.json'),'{bad');
    expect(legacy.importLegacy(root,{selection:['bad.json'],now:()=>0}).records[0].parse_error).toMatch(/Unexpected|JSON/);
  });

  test('elapsed time is the non-negative clock delta and cache is optional',()=>{
    const root=temporaryRoot('legacy-mutation-elapsed-');
    const ticks=[10,15];
    const receipt=legacy.importLegacy(root,{selection:[],now:()=>ticks.shift()??15});
    expect(receipt.inventory.elapsed_ms).toBe(5);
    expect(receipt).not.toHaveProperty('cache');
  });
});

describe('legacy derived cache mutation contracts',()=>{
  test('every receipt authority field is mandatory and malformed cache shapes are misses',()=>{
    const root=temporaryRoot('legacy-mutation-cache-authority-'),cache=derivedCache(root),source=path.join(root,'one.json');
    const options={selection:['one.json'],cacheFile:cache,now:()=>0};
    writeJson(source,{id:'cached'});
    legacy.importLegacy(root,options);
    const baseline=JSON.parse(fs.readFileSync(cache,'utf8'));
    writeJson(source,{id:'source'});
    const modifiers = [
      value=>{value.schema='wrong';},
      value=>{value.entries[0].receipt=null;},
      value=>{value.entries[0].receipt.schema='wrong';},
      value=>{value.entries[0].receipt.mode='write';},
      value=>{value.entries[0].receipt.assertions=null;},
      ...Object.keys(baseline.entries[0].receipt.assertions).map(name=>value=>{value.entries[0].receipt.assertions[name]=false;})
    ];
    for(const modify of modifiers) {
      const value=JSON.parse(JSON.stringify(baseline));modify(value);fs.writeFileSync(cache,JSON.stringify(value));
      expect(legacy.importLegacy(root,options).records[0].id).toBe('source');
    }
    for(const invalid of [null,{schema:'wrong',entries:[]},{schema:'LegacyImportCache/v1',entries:{}}]) {
      fs.writeFileSync(cache,JSON.stringify(invalid));
      expect(legacy.importLegacy(root,options).records[0].id).toBe('source');
    }
  });

  test('cache retains different keys, replaces one key, and serves the refreshed value',()=>{
    const root=temporaryRoot('legacy-mutation-cache-entries-'),cache=derivedCache(root);
    writeJson(path.join(root,'one.json'),{id:'one-old'});
    writeJson(path.join(root,'two.json'),{id:'two'});
    const one={selection:['one.json'],cacheFile:cache,now:()=>0};
    const two={selection:['two.json'],cacheFile:cache,now:()=>0};
    legacy.importLegacy(root,one);legacy.importLegacy(root,two);
    expect(JSON.parse(fs.readFileSync(cache,'utf8')).entries).toHaveLength(2);
    writeJson(path.join(root,'one.json'),{id:'one-new'});
    legacy.importLegacy(root,{...one,refresh:true});
    expect(JSON.parse(fs.readFileSync(cache,'utf8')).entries).toHaveLength(2);
    expect(legacy.importLegacy(root,one).records[0].id).toBe('one-new');
    expect(legacy.importLegacy(root,two).records[0].id).toBe('two');
  });

  test('cache lock/directory failures short-circuit and temporary names advance monotonically',()=>{
    const root=temporaryRoot('legacy-mutation-cache-fault-'),source=path.join(root,'one.json'),cache=derivedCache(root);
    writeJson(source,{id:'one'});
    const originalMkdir=fs.mkdirSync;let mkdirCalls=0;
    vi.spyOn(fs,'mkdirSync').mockImplementation(/** @type {any} */ ((file,options)=>{
      mkdirCalls++;
      if(path.resolve(String(file))===path.resolve(path.dirname(cache)))throw new Error('directory denied');
      return originalMkdir(file,options);
    }));
    expect(legacy.importLegacy(root,{selection:['one.json'],cacheFile:cache,now:()=>0}).cache.stored).toBe(false);
    expect(mkdirCalls).toBe(1);
    vi.restoreAllMocks();

    const successfulUnlink=vi.spyOn(fs,'unlinkSync');
    expect(legacy.importLegacy(root,{selection:['one.json'],cacheFile:cache,refresh:true,now:()=>0}).cache.stored).toBe(true);
    expect(successfulUnlink).not.toHaveBeenCalled();
    successfulUnlink.mockRestore();

    const temporary=[];
    const originalUnlink=fs.unlinkSync;
    vi.spyOn(fs,'renameSync').mockImplementation(()=>{throw new Error('rename denied');});
    vi.spyOn(fs,'unlinkSync').mockImplementation(file=>{temporary.push(String(file));return originalUnlink(file);});
    for(let index=0;index<2;index++)expect(legacy.importLegacy(root,{selection:['one.json'],cacheFile:cache,refresh:true,now:()=>0}).cache.stored).toBe(false);
    expect(temporary).toHaveLength(2);
    const sequences=temporary.map(file=>Number(/\.(\d+)\.tmp$/.exec(file)?.[1]));
    expect(sequences[1]-sequences[0]).toBe(1);
  });
});

describe('legacy CLI mutation contracts',()=>{
  test('all numeric/selection/refresh flags and derived cache path are honored in-process',()=>{
    const workspace=temporaryRoot('legacy-mutation-cli-'),root=path.join(workspace,'source'),selectionFile=path.join(workspace,'selection.json'),cache=derivedCache(workspace),libDir=path.join(__dirname,'..','..','lib');
    writeJson(path.join(root,'one.json'),{id:'old'});writeJson(selectionFile,['one.json']);
    legacy.importLegacy(root,{selection:['one.json'],maxFiles:1,maxEntries:2,timeBudgetMs:100,maxFileBytes:100,cacheFile:cache,now:()=>0});
    writeJson(path.join(root,'one.json'),{id:'new'});
    const originalResolve=path.resolve;
    const resolve=vi.spyOn(path,'resolve').mockImplementation((...values)=>values.slice(-6).join('|')==='..|..|.planning|agent-flow|cache|legacy-import.v1.json'
      ? cache
      : originalResolve(...values));
    let output='';
    legacy.runCli([root,'--selection-file',selectionFile,'--max-files','1','--max-entries','2','--time-budget-ms','100','--max-file-bytes','100','--refresh'],value=>{output+=value;});
    const receipt=JSON.parse(output);
    expect(receipt.records.map(record=>record.pointer)).toEqual(['one.json']);
    expect(receipt.records[0].id).toBe('new');
    expect(receipt.inventory).toMatchObject({max_files:1,max_entries:2,time_budget_ms:100,max_file_bytes:100});
    expect(receipt.cache).toEqual({policy:'derived_non_authoritative',hit:false,stored:true});
    expect(fs.existsSync(cache)).toBe(true);
    expect(resolve).toHaveBeenCalledWith(libDir,'..','..','.planning','agent-flow','cache','legacy-import.v1.json');
  });

  test('CLI exposes exact usage, index-zero flag behavior and selection-file diagnostics',()=>{
    expect(()=>legacy.runCli([],()=>{})).toThrow('Usage: node legacy-import.cjs <legacy-root> [--selection-file FILE] [--max-files N] [--max-entries N] [--time-budget-ms N] [--max-file-bytes N] [--refresh]');
    const cliWorkspace=temporaryRoot('legacy-mutation-index-zero-'),cliCache=derivedCache(cliWorkspace),originalResolve=path.resolve;
    vi.spyOn(path,'resolve').mockImplementation((...values)=>values.slice(-6).join('|')==='..|..|.planning|agent-flow|cache|legacy-import.v1.json'
      ? cliCache
      : originalResolve(...values));
    let output='';legacy.runCli(['--max-files','1'],value=>{output+=value;});
    expect(JSON.parse(output).inventory.max_files).toBe(1);
    const workspace=temporaryRoot('legacy-mutation-selection-file-'),root=path.join(workspace,'source'),selectionFile=path.join(workspace,'selection.json');
    fs.mkdirSync(root,{recursive:true});
    fs.writeFileSync(selectionFile,' '.repeat(262144));
    expect(()=>legacy.runCli([root,'--selection-file',selectionFile],()=>{})).toThrow('legacy import selection file must contain valid JSON');
    fs.writeFileSync(selectionFile,'{bad');
    expect(()=>legacy.runCli([root,'--selection-file',selectionFile],()=>{})).toThrow('legacy import selection file must contain valid JSON');
  });
});
