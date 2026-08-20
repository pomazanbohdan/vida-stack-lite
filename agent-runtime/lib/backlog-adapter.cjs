/* Optional Backlog.md adapter. The official CLI is the only ledger writer.
 * A ledger revision is updatedAt when supplied; otherwise it is an ordinary
 * provider token (CLI version plus task-file mtime/size), never a digest. */
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const backlogPackage = require('../backlog-package.json');
const pinnedPackage = `${backlogPackage.package}@${backlogPackage.version}`;
const pinned = ['--yes', pinnedPackage];
const agentId = /^(?:AGENT|[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*)-[1-9][0-9]*$/;
const ledgerIo = Object.freeze({ mkdirSync:fs.mkdirSync, rmdirSync:fs.rmdirSync, now:Date.now, wait:Atomics.wait });
function invalidLinkInput(url) { return typeof url !== 'string' || !url || url.length > 512 || /[\r\n]/.test(url); }
function all(...values) { return values.every(Boolean); }
function any(...values) { return values.some(Boolean); }
function permittedLink(parsed) { return all(['https:', 'http:'].includes(parsed.protocol),!parsed.username,!parsed.password,!parsed.search,!parsed.hash); }
function sanitizeLink(url) { if (invalidLinkInput(url)) return null; try { const parsed = new URL(url); return permittedLink(parsed) ? `${parsed.protocol}//${parsed.host}${parsed.pathname}` : null; } catch { return null; } }
function selectedPlatform(options) { return options.platform||process.platform; }
function selectedNpx(options,platform) { if(options.npxCommand)return options.npxCommand;return platform==='win32'?'npx.cmd':'npx'; }
function localCliAvailable(options,cli) { if(options.cliExists!==undefined)return options.cliExists;return fs.existsSync(cli); }
function invocation(options, command) { const cli = path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npx-cli.js');const platform=selectedPlatform(options),npxCommand=selectedNpx(options,platform);if(localCliAvailable(options,cli))return [process.execPath,[cli,...command]];return [npxCommand,command]; }
function failed(result) { return result.error || result.status !== 0; }
function resultError(result) { return result.stderr||result.stdout||result.error?.message||'Backlog CLI unavailable'; }
function runnerOptions(options) { return {encoding:'utf8',cwd:options.cwd,timeout:options.timeout||30000,windowsHide:true}; }
function run(args, options = {}) { const invoke=options.runner||spawnSync,spec=invocation(options,[...pinned,...args]),result=invoke(spec[0],spec[1],runnerOptions(options));if(failed(result))return {available:false,failure:true,error:resultError(result).trim()};return {available:true,output:String(result.stdout||'').trim()}; }
function parse(response) { if (!response.available) return response; try { return { ...response, data: JSON.parse(response.output || '{}') }; } catch { return { ...response, failure: true, error: 'Backlog CLI did not return JSON' }; } }
function taskFrom(data) { return data.task || data.data || data; }
function ledgerRoot(cwd) { return cwd||process.cwd(); }
function backlogDirectory(cwd) { const root=ledgerRoot(cwd);return fs.existsSync(path.join(root,'tasks'))?root:path.join(root,'backlog'); }
function localRevision(id, cwd, cliVersion = pinnedPackage) { const tasks=path.join(backlogDirectory(cwd),'tasks');if(!fs.existsSync(tasks))return `${cliVersion}:missing`;const file=fs.readdirSync(tasks).find(name=>name.toUpperCase().startsWith(`${id.toUpperCase()} `));if(!file)return `${cliVersion}:missing`;const stat=fs.statSync(path.join(tasks,file));return `${cliVersion}:${stat.mtimeMs}:${stat.size}`; }
function providerRevision(task, id, cwd) { return task?.updatedAt || task?.updated_at || localRevision(id, cwd); }
function discover(cwd, options) { return parse(run(['task', 'list', '--json'], { cwd, ...options })); }
function read(id, cwd, options) { if (!agentId.test(id)) return { available: true, failure: true, error: 'invalid agent-style Backlog id' }; return parse(run(['task', 'view', id, '--json'], { cwd, ...options })); }
function unavailable(result) { return any(!result.available,result.failure); }
function guardRead(id, expectedRevision, cwd, options) { if(!expectedRevision)return {available:true,failure:true,error:'expected provider revision required'};const current=read(id,cwd,options);if(unavailable(current))return current;const task=taskFrom(current.data),revision=providerRevision(task,id,cwd);if(revision!==expectedRevision)return {available:true,drift:true,error:'provider revision drift; ledger write blocked',task,revision};return {available:true,task,revision}; }
function taskId(task) { return task.id || task.taskId || task.task_id; }
function acquireLedgerLock(lock,deadline,io) { while(true){try{io.mkdirSync(lock);return true;}catch(error){if(any(error.code!=='EEXIST',io.now()>deadline))return false;io.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,25);}} }
function withLedgerLock(cwd, action, io=ledgerIo) { const lock=path.join(backlogDirectory(cwd),'.agent-runtime-write.lock');if(!acquireLedgerLock(lock,io.now()+10000,io))return {available:true,failure:true,error:'Backlog local write lock unavailable'};try{return action();}finally{io.rmdirSync(lock);} }
function failedRead(result) { return !result.available || result.failure ? result : null; }
function wrongTask(task, id, phase) { return taskId(task) && taskId(task) !== id ? { available: true, failure: true, error: `provider returned wrong ${phase}-write task id` } : null; }
function statusMismatch(task,intended) { return all(intended.status,String(task.status||'').toLowerCase()!==String(intended.status).toLowerCase()); }
function titleMismatch(task,intended) { return all(intended.title,task.title!==intended.title); }
function verifyIntent(task, intended) { if(statusMismatch(task,intended))return 'post-write status verification failed';if(titleMismatch(task,intended))return 'post-write title verification failed';return null; }
function mutation(id, args, expectedRevision, cwd, options, intended = {}) { if (!expectedRevision) return { available: true, failure: true, error: 'expected provider revision required' }; return withLedgerLock(cwd, () => mutateLocked(id, args, expectedRevision, cwd, options, intended)); }
function beforeMutation(id,expectedRevision,cwd,options) { const before=guardRead(id,expectedRevision,cwd,options);if(any(!before.available,before.failure,before.drift))return {stop:before};const mismatch=wrongTask(before.task,id,'pre');if(mismatch)return {stop:mismatch};return {before}; }
function afterMutation(id,cwd,options) { const readback=read(id,cwd,options),failure=failedRead(readback);if(failure)return {stop:failure};const task=taskFrom(readback.data),mismatch=wrongTask(task,id,'post');if(mismatch)return {stop:mismatch};return {task}; }
function mutationResult(before,after,intended,id,cwd) { const revision=providerRevision(after,id,cwd);if(revision===before.revision)return {available:true,failure:true,error:'provider revision did not advance after write'};const error=verifyIntent(after,intended);if(error)return {available:true,failure:true,error};return {available:true,before_revision:before.revision,revision,task:after}; }
function mutateLocked(id, args, expectedRevision, cwd, options, intended) { const pre=beforeMutation(id,expectedRevision,cwd,options);if(pre.stop)return pre.stop;const write=run(args,{cwd,...options});if(!write.available)return write;const post=afterMutation(id,cwd,options);if(post.stop)return post.stop;return mutationResult(pre.before,post.task,intended,id,cwd); }
function createOrUpdate(item, expectedRevision, cwd, options) { if (!item?.id || !agentId.test(item.id)) return { available: true, failure: true, error: 'valid AGENT-style id required' }; if (!item.title) return { available: true, failure: true, error: 'title required' }; return mutation(item.id, ['task', 'edit', item.id, '--title', item.title], expectedRevision, cwd, options, { title: item.title }); }
function transition(id, status, expectedRevision, cwd, options) { if (!agentId.test(id)) return { available: true, failure: true, error: 'invalid agent-style Backlog id' }; return mutation(id, ['task', 'edit', id, '--status', status], expectedRevision, cwd, options, { status }); }
function link(id, url, expectedRevision, cwd, options) { const safe = sanitizeLink(url); if (!agentId.test(id) || !safe) return { available: true, failure: true, error: 'valid sanitized id and link required' }; return mutation(id, ['task', 'edit', id, '--comment', `Derived link: ${safe}`, '--comment-author', 'codex'], expectedRevision, cwd, options); }
function reconcile(item, expectedRevision, cwd, options) { return createOrUpdate(item, expectedRevision, cwd, options); }
function isTerminalLedgerStatus(status) { return ['done', 'closed', 'completed'].includes(String(status).toLowerCase()); }
/** @param {unknown} _ledgerStatus */
function closesDeliveryOrRuntime(_ledgerStatus) { return false; }
module.exports = { run, discover, read, providerRevision, guardRead, createOrUpdate, transition, link, reconcile, sanitizeLink, isTerminalLedgerStatus, closesDeliveryOrRuntime, withLedgerLock, ledgerIo, pinnedPackage };
