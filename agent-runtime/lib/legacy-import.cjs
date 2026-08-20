'use strict';

// Read-only adapter for preservation-only legacy evidence. It never changes a
// ledger, consumes a lease, repairs a receipt, or turns historical status into
// current authority.
const fs = require('fs');
const path = require('path');
const CACHE_ASSERTIONS = Object.freeze({
  historical_non_authoritative: true,
  does_not_consume_approvals: true,
  does_not_consume_leases: true,
  ready_for_decision_is_not_human_approval: true,
  static_is_not_runtime: true
});
const SELECTION_FILE_MAX_BYTES = 262144;
let cacheWriteSequence = 0;
function any(...values) { return values.some(Boolean); }

function sourceRevision(file) {
  const stat = fs.statSync(file);
  return `${stat.mtimeMs}:${stat.size}`;
}
function optionOr(options,name,fallback) { return options[name] === undefined ? fallback : options[name]; }
function integerInRange(value,min,max,message) {
  if (!Number.isInteger(value) || value < min || value > max) throw new Error(message);
}
function clock(value) {
  if (typeof value !== 'function') throw new Error('legacy import clock must be a function');
  return value;
}
function boundedOptions(options = {}) {
  const source = options || {};
  const maxFiles = optionOr(source,'maxFiles',100);
  const maxEntries = optionOr(source,'maxEntries',Math.max(1000,maxFiles * 10));
  const timeBudgetMs = optionOr(source,'timeBudgetMs',1000);
  const maxFileBytes = optionOr(source,'maxFileBytes',262144);
  const now = clock(optionOr(source,'now',Date.now));
  integerInRange(maxFiles,1,5000,'legacy import maxFiles must be an integer from 1 to 5000');
  integerInRange(maxEntries,maxFiles,50000,'legacy import maxEntries must be an integer from maxFiles to 50000');
  integerInRange(timeBudgetMs,1,2000,'legacy import timeBudgetMs must be an integer from 1 to 2000');
  integerInRange(maxFileBytes,1,5242880,'legacy import maxFileBytes must be an integer from 1 to 5242880');
  const selection = canonicalSelection(source.selection, maxFiles);
  const startedAt = now();
  return { maxFiles, maxEntries, timeBudgetMs, maxFileBytes, selection, now, startedAt, deadline: startedAt + timeBudgetMs };
}
function selectionString(value) {
  if (typeof value !== 'string' || value.length === 0) throw new Error('legacy import selection entries must be non-empty strings');
}
function relativeJsonSelection(value) {
  if (path.isAbsolute(value) || path.extname(value).toLowerCase() !== '.json') throw new Error('legacy import selection entries must be relative JSON paths');
}
function containedSelection(value) {
  if (value.startsWith(`..${path.sep}`)) throw new Error('legacy import selection escapes the source root');
}
function selectionPath(value) {
  selectionString(value);
  const normalized = path.normalize(value);
  relativeJsonSelection(normalized);
  containedSelection(normalized);
  return normalized.split(path.sep).join('/');
}
function selectionArray(selection) {
  if (!Array.isArray(selection)) throw new Error('legacy import selection must be an array');
  if (selection.length > 5000) throw new Error('legacy import selection exceeds 5000 entries');
  return selection;
}
function selectionWithinFileBound(selection,maxFiles) {
  if (selection.length > maxFiles) throw new Error('legacy import selection exceeds maxFiles');
  return selection;
}
function canonicalSelection(selection, maxFiles) {
  if (selection === undefined) return null;
  const canonical=[...new Set(selectionArray(selection).map(selectionPath))].sort();
  return selectionWithinFileBound(canonical,maxFiles);
}
function walk(root, options) {
  const state = { files: [], visited: 0, truncated: false, ...options };
  if (state.selection) walkSelection(root,state);
  else if (fs.existsSync(root)) walkDirectory(root,state);
  return state;
}
function walkDirectory(root,state) {
  const directory = fs.opendirSync(root);
  try {
    while (!state.truncated) {
      const reason=boundReason(state);
      if(reason){truncate(state,reason);return;}
      const entry=directory.readSync();
      if(!entry)return;
      state.visited++;
      walkEntry(root,entry,state);
    }
  } finally { directory.closeSync(); }
}
function boundReason(state) {
  if (state.now() >= state.deadline) return 'time_budget';
  if (state.files.length === state.maxFiles) return 'max_files';
  if (state.visited === state.maxEntries) return 'max_entries';
  return null;
}
function truncate(state,reason) { state.truncated=true;state.reason=reason; }
function walkEntry(root,entry,state) {
  const absolute=path.join(root,entry.name);
  if(entry.isDirectory()) { walkDirectory(absolute,state); return; }
  if(!entry.isFile()||!entry.name.endsWith('.json'))return;
  state.files.push(absolute);
}
function assertSelectionNode(stat, isFile) {
  if (stat.isSymbolicLink()) throw new Error('legacy import selection cannot traverse a reparse point');
  if (isFile ? !stat.isFile() : !stat.isDirectory()) throw new Error('legacy import selection must resolve to regular JSON files under the source root');
}
function selectedFile(root, relative) {
  const segments=relative.split('/'),absolute=path.resolve(root,...segments);
  assertSelectionNode(fs.lstatSync(root),false);
  let current=root;
  for (let index=0;index<segments.length;index++) {
    current=path.join(current,segments[index]);
    assertSelectionNode(fs.lstatSync(current),index===segments.length-1);
  }
  return absolute;
}
function walkSelection(root,state) {
  for(const relative of state.selection) {
    const reason=boundReason(state);
    if(reason){truncate(state,reason);return;}
    state.files.push(selectedFile(root,relative));
    state.visited++;
  }
}
function present(object,name) { return object&&object[name]!==undefined&&object[name]!==null; }
function valueAt(object, names) {
  for (const name of names) if (present(object,name)) return object[name];
  return null;
}
function asList(value) { return Array.isArray(value) ? value : value == null ? [] : [value]; }
function classifyEvidence(value) {
  const raw = String(valueAt(value, ['class', 'evidenceClass', 'evidence_type', 'layer', 'kind'])).toLowerCase();
  if (raw.includes('runtime')) return 'Runtime';
  if (any(raw.includes('static'),raw.includes('test'))) return 'Static';
  if (raw.includes('code')) return 'Code';
  return 'Decision';
}
function failedRecord(relative,revision,message) { return { pointer: relative, source_revision: revision, parse_error: message, historical: true, non_authoritative: true }; }
function readLegacyJson(file) {
  try { return {parsed:JSON.parse(fs.readFileSync(file,'utf8'))}; }
  catch (error) { return {error}; }
}
function evidencePointer(item) { return typeof item === 'string' ? item : valueAt(item, ['path', 'pointer', 'id']) || null; }
function normalizeEvidence(parsed) {
  return asList(valueAt(parsed, ['evidence', 'receipts', 'results'])).map(item => ({
    class: classifyEvidence(item), pointer: evidencePointer(item), historical: true, non_authoritative: true
  }));
}
function approvalStatus(status,parsed) { return status === 'ready_for_decision' ? 'pending_human_decision' : valueAt(parsed, ['approval', 'approved', 'approval_status']); }
function runtimeStatus(status) { return status.includes('runtime') ? status : 'not_asserted'; }
function normalizedRecord(file,relative,parsed) {
  const status = String(valueAt(parsed, ['status', 'state', 'disposition'])).toLowerCase();
  return {
    pointer: relative, source_revision: sourceRevision(file), schema: valueAt(parsed, ['schema', '$schema', 'protocol_id']),
    id: valueAt(parsed, ['id', 'run_id', 'session_id', 'item_id', 'packet_id']),
    version: valueAt(parsed, ['version', 'protocol_version', 'schemaVersion']),
    approval: { status: approvalStatus(status,parsed), historical: true, non_authoritative: true },
    leases: asList(valueAt(parsed, ['leases', 'lease', 'agent_leases'])),
    findings: asList(valueAt(parsed, ['findings', 'gaps', 'issues'])),
    evidence: normalizeEvidence(parsed),
    gaps: asList(valueAt(parsed, ['gaps', 'open_gaps'])),
    runtime: { status: runtimeStatus(status), historical: true, non_authoritative: true }
  };
}
function normalize(file, root, maxFileBytes) {
  const relative = path.relative(root, file).split(path.sep).join('/');
  const stat = fs.statSync(file);
  if (stat.size > maxFileBytes) return failedRecord(relative,`${stat.mtimeMs}:${stat.size}`,'legacy file exceeds configured byte bound');
  const result=readLegacyJson(file);
  if(result.error)return failedRecord(relative,sourceRevision(file),result.error.message);
  return normalizedRecord(file,relative,result.parsed);
}
function normalizeFiles(inventory, root) {
  const records=[];
  for(const file of inventory.files) {
    if(inventory.now()>=inventory.deadline){truncate(inventory,'time_budget');break;}
    records.push(normalize(file,root,inventory.maxFileBytes));
  }
  return records;
}
function cacheKey(root,options) { return JSON.stringify({root,maxFiles:options.maxFiles,maxEntries:options.maxEntries,timeBudgetMs:options.timeBudgetMs,maxFileBytes:options.maxFileBytes,selection:options.selection}); }
function validCachedReceipt(receipt) {
  if (!receipt || receipt.schema !== 'LegacyImportReceipt/v1' || receipt.mode !== 'read_only') return false;
  return Object.keys(CACHE_ASSERTIONS).every(name=>receipt.assertions?.[name]===true);
}
function parsedCache(file) {
  try { return JSON.parse(fs.readFileSync(file).toString()); }
  catch { return null; }
}
function normalizedCache(cache) {
  if(cache===null)return emptyCache();
  if(cache.schema==='LegacyImportCache/v1'&&Array.isArray(cache.entries))return cache;
  return emptyCache();
}
function receiptFromCache(cache,key) {
  const receipt=cache.entries.find(entry=>entry.key===key)?.receipt||null;
  if(!validCachedReceipt(receipt))return null;
  return receipt;
}
function readCache(file,key) {
  return receiptFromCache(normalizedCache(parsedCache(file)),key);
}
function cacheReceipt(receipt,hit) { return {...receipt,mode:'read_only',assertions:{...receipt.assertions,...CACHE_ASSERTIONS},cache:{policy:'derived_non_authoritative',hit}}; }
function cacheLock(file) {
  const lock=`${file}.lock`;
  try { fs.mkdirSync(lock);return lock; } catch { return null; }
}
function ensureCacheDirectory(file) {
  try { fs.mkdirSync(path.dirname(file),{recursive:true});return true; } catch { return false; }
}
function emptyCache() { return {schema:'LegacyImportCache/v1',entries:[]}; }
function existingCache(file) {
  return normalizedCache(parsedCache(file));
}
function removeTemporary(file) {
  if(!fs.existsSync(file))return;
  try{fs.unlinkSync(file);}catch{ /* derived temporary is non-authoritative */ }
}
function releaseCacheLock(lock) {
  try{fs.rmdirSync(lock);}catch{ /* cache locking is fail-safe and non-blocking */ }
}
function writableCacheLock(file) {
  if(ensureCacheDirectory(file)===false)return null;
  return cacheLock(file);
}
function cacheTemporary(file) { return `${file}.${process.pid}.${++cacheWriteSequence}.tmp`; }
function persistCache(file,key,receipt,temporary) {
  const cache=existingCache(file);
  const entries=cache.entries.filter(entry=>entry.key!==key);entries.push({key,receipt});
  fs.writeFileSync(temporary,`${JSON.stringify({...cache,entries},null,2)}\n`);
  fs.renameSync(temporary,file);
}
function writeCacheLocked(file,key,receipt,lock) {
  const temporary=cacheTemporary(file);
  try {
    persistCache(file,key,receipt,temporary);return true;
  } catch { return false; }
  finally {
    removeTemporary(temporary);
    releaseCacheLock(lock);
  }
}
function writeCache(file,key,receipt) {
  const lock=writableCacheLock(file);
  if(lock===null)return false;
  return writeCacheLocked(file,key,receipt,lock);
}
function cachedImport(source,key) {
  if(source.refresh)return null;
  return readCache(source.cacheFile,key);
}
function importReceipt(root,inventory,records) {
  const elapsedMs = Math.max(0,inventory.now()-inventory.startedAt);
  return {
    schema: 'LegacyImportReceipt/v1', mode: 'read_only', source_root: root,
    imported_at: new Date().toISOString(), records,
    inventory: {
      complete: !inventory.truncated, truncated: inventory.truncated,
      visited_entries: inventory.visited, imported_files: records.length,
      max_files: inventory.maxFiles, max_entries: inventory.maxEntries,
      time_budget_ms: inventory.timeBudgetMs, max_file_bytes: inventory.maxFileBytes,
      elapsed_ms: elapsedMs, bound_reason: inventory.reason||null,
      gap: inventory.truncated ? 'GAP-LEGACY-IMPORT-BOUNDS-001' : null
    },
    assertions: {...CACHE_ASSERTIONS}
  };
}
function cacheImportReceipt(receipt,source,key) {
  if(!source.cacheFile)return receipt;
  const cache=cacheReceipt(receipt,false),stored=writeCache(source.cacheFile,key,receipt);
  return {...cache,cache:{...cache.cache,stored}};
}
function importLegacy(root, options) {
  const source=options||{};
  const absoluteRoot = path.resolve(root);
  const bounded = boundedOptions(source),key=cacheKey(absoluteRoot,bounded),cached=cachedImport(source,key);
  if(cached)return cacheReceipt(cached,true);
  const inventory = walk(absoluteRoot, bounded);
  const records = normalizeFiles(inventory, absoluteRoot);
  return cacheImportReceipt(importReceipt(absoluteRoot,inventory,records),source,key);
}
function writeStdout(value) { process.stdout.write(value); }
function argumentValue(argv,name) { const index=argv.indexOf(name);return index<0?undefined:argv[index+1]; }
function numberArgument(argv,name) { const value=argumentValue(argv,name);return value===undefined?undefined:Number(value); }
function selectionFilePath(file) {
  const absolute=path.resolve(file),stat=fs.lstatSync(absolute);
  if(stat.isSymbolicLink()||!stat.isFile())throw new Error('legacy import selection file must be a regular JSON file');
  if(stat.size>SELECTION_FILE_MAX_BYTES)throw new Error('legacy import selection file exceeds 262144 bytes');
  return absolute;
}
function parsedSelectionFile(file) {
  try{return JSON.parse(fs.readFileSync(file).toString());}
  catch{throw new Error('legacy import selection file must contain valid JSON');}
}
function selectionFileArray(selection) {
  if(!Array.isArray(selection))throw new Error('legacy import selection file must contain a JSON array');
  return selection;
}
function readSelectionFile(file) {
  if (!file) return undefined;
  return selectionFileArray(parsedSelectionFile(selectionFilePath(file)));
}
function runCli(argv = process.argv.slice(2), write = writeStdout) {
  const root = argv[0];
  if (!root) throw new Error('Usage: node legacy-import.cjs <legacy-root> [--selection-file FILE] [--max-files N] [--max-entries N] [--time-budget-ms N] [--max-file-bytes N] [--refresh]');
  const cacheFile=path.resolve(__dirname,'..','..','.planning','agent-flow','cache','legacy-import.v1.json');
  const selection=readSelectionFile(argumentValue(argv,'--selection-file'));
  write(`${JSON.stringify(importLegacy(root,{maxFiles:numberArgument(argv,'--max-files'),maxEntries:numberArgument(argv,'--max-entries'),timeBudgetMs:numberArgument(argv,'--time-budget-ms'),maxFileBytes:numberArgument(argv,'--max-file-bytes'),selection,cacheFile,refresh:argv.includes('--refresh')}), null, 2)}\n`);
}
module.exports = { importLegacy, runCli };
