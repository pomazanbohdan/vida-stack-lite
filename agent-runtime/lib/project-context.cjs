'use strict';

const fs = require('fs');
const path = require('path');

const contextKeys = ['schema','tenant_id','primary_project_id','affected_project_ids','ledger_id','task_id','wiki_roots','provider_revision'];
const projectionKeys = ['schema','ledger_id','task_id','desired_status','observed_status','provider_revision','sync_status','gap_pointer','error','updated_at'];
const statuses = ['To Do','In Development','In Review','Ready for Delivery','Awaiting Testing','Testing','Returned for Rework','Done','Blocked'];

function validText(value) { return typeof value === 'string' && Boolean(value.trim()) && !/[\r\n]/.test(value); }
function onlyKeys(value, keys) { return value && Object.keys(value).every(key => keys.includes(key)); }
function uniqueText(values) { return Array.isArray(values) && values.every(validText) && new Set(values).size === values.length; }
function relativePath(value) { return validText(value) && !path.isAbsolute(value) && !value.includes('\\') && !value.split('/').some(part => !part || part === '.' || part === '..'); }
function registryPath(root) { return path.join(root, 'docs', 'tenants', 'project-registry.v1.json'); }
function locateRegistry(start) { let cursor=path.resolve(start);for(;;){const candidate=registryPath(cursor);if(fs.existsSync(candidate))return candidate;const parent=path.dirname(cursor);if(parent===cursor)throw new Error('project registry missing');cursor=parent;} }
function readRegistry(root) { return JSON.parse(String(fs.readFileSync(locateRegistry(root)))); }
function tenant(registry, id) { return registry.tenants.find(item => item.tenant_id === id); }
function project(registry, tenantId, id) { return registry.projects.find(item => item.tenant_id === tenantId && item.project_id === id); }
function expectedLedgerId(context) { return context.primary_project_id === null ? `tenant:${context.tenant_id}` : `project:${context.tenant_id}/${context.primary_project_id}`; }
function expectedTaskPrefix(record) { return `${record.task_prefix}-`; }
function expectedWikiRoots(tenantRecord, projectRecords) { return [tenantRecord.wiki_root, ...projectRecords.map(item=>item.wiki_root).sort()]; }
function sameValues(actual, expected) { return actual.length === expected.length && actual.every((value, index) => value === expected[index]); }
function registryCore(registry) { return registry && registry.schemaVersion === 'project-registry.v1' && Array.isArray(registry.tenants) && Array.isArray(registry.projects); }
function contextIdentityValid(context) { return validText(context.tenant_id) && (context.primary_project_id === null || validText(context.primary_project_id)); }
function contextCollectionsValid(context) { return uniqueText(context.affected_project_ids) && uniqueText(context.wiki_roots) && validText(context.ledger_id) && validText(context.task_id) && validText(context.provider_revision); }
function validateContextShape(context) {
  if (!onlyKeys(context, contextKeys) || context.schema !== 'ProjectContext/v1') throw new Error('project context invalid');
  if (!contextIdentityValid(context)) throw new Error('project context identity invalid');
  if (!contextCollectionsValid(context)) throw new Error('project context collections invalid');
  return true;
}
function registryRecords(context,registry) { const tenantRecord=tenant(registry,context.tenant_id),projectRecord=context.primary_project_id===null?null:project(registry,context.tenant_id,context.primary_project_id);if(!tenantRecord||(context.primary_project_id!==null&&!projectRecord))throw new Error('project context registry binding invalid');return {tenantRecord,projectRecord}; }
function affectedRecords(context,registry,projectRecord) { if(projectRecord&&!context.affected_project_ids.includes(projectRecord.project_id))throw new Error('primary project must be affected');const records=context.affected_project_ids.map(id=>project(registry,context.tenant_id,id));if(records.some(item=>!item))throw new Error('affected project outside tenant');return records; }
function validateLedgerBinding(context,ledgerRecord) { const taskPattern=new RegExp(`^${expectedTaskPrefix(ledgerRecord)}[1-9][0-9]*$`);if(context.ledger_id!==expectedLedgerId(context)||!taskPattern.test(context.task_id))throw new Error('project context ledger/task binding invalid'); }
function validateContextPaths(context,tenantRecord,records,ledgerRecord) { const roots=expectedWikiRoots(tenantRecord,records);if(!sameValues(context.wiki_roots,roots)||!roots.every(relativePath)||!relativePath(ledgerRecord.ledger_root))throw new Error('project context wiki/ledger path invalid'); }

function resolveContext(context, registry) {
  if (!registryCore(registry)) throw new Error('project registry invalid');
  validateContextShape(context);
  const {tenantRecord,projectRecord}=registryRecords(context,registry),records=affectedRecords(context,registry,projectRecord);
  const ledgerRecord = projectRecord || tenantRecord;
  validateLedgerBinding(context,ledgerRecord);validateContextPaths(context,tenantRecord,records,ledgerRecord);
  return { tenant: tenantRecord, project: projectRecord, ledger_root: ledgerRecord.ledger_root, contour_keys: [`tenant:${context.tenant_id}`, ...(projectRecord ? [`project:${context.tenant_id}/${projectRecord.project_id}`] : [])] };
}

function projectionBindingValid(projection,context) { return projection.ledger_id===context.ledger_id&&projection.task_id===context.task_id&&projection.provider_revision===context.provider_revision; }
function projectionStateValid(projection) { return statuses.includes(projection.desired_status)&&['pending','synced','failed'].includes(projection.sync_status)&&(projection.observed_status===null||statuses.includes(projection.observed_status))&&validText(projection.updated_at); }
function projectionFailureValid(projection) { if(projection.sync_status==='failed')return validText(projection.gap_pointer)&&validText(projection.error);return projection.gap_pointer===null&&projection.error===null; }
function validateProjection(projection, context) {
  if (!onlyKeys(projection, projectionKeys) || projection.schema !== 'BacklogProjection/v1') throw new Error('Backlog projection invalid');
  if (!projectionBindingValid(projection,context)) throw new Error('Backlog projection binding invalid');
  if (!projectionStateValid(projection)) throw new Error('Backlog projection state invalid');
  if (!projectionFailureValid(projection)) throw new Error('Backlog projection failure evidence invalid');
  return true;
}

function deliveryStatus(checkpoint,latest) { if(latest&&['started','accepted'].includes(latest.decision))return 'Testing';if(latest&&['feedback','rejected'].includes(latest.decision))return 'Returned for Rework';return checkpoint.delivery_receipt?'Awaiting Testing':'Ready for Delivery'; }
function verifyStatus(checkpoint) { return checkpoint.reviews?.length===3&&checkpoint.verification?.length===3?'Ready for Delivery':'In Review'; }
function activeWorkStatus(checkpoint) { return checkpoint.user_testing_feedback_receipt?'Returned for Rework':'In Development'; }
function desiredStatus(checkpoint) {
  const latest = checkpoint.user_testing_receipts?.at(-1);
  if (checkpoint.question_candidates?.some(item=>item.blocking&&item.status==='open')) return 'Blocked';
  if (checkpoint.lifecycle_state === 'COMPLETE') return 'Done';
  if (checkpoint.lifecycle_state === 'DELIVERY') return deliveryStatus(checkpoint,latest);
  if (checkpoint.lifecycle_state === 'VERIFY') return verifyStatus(checkpoint);
  if (checkpoint.lifecycle_state === 'PLAN' || checkpoint.lifecycle_state === 'EXECUTE') return activeWorkStatus(checkpoint);
  return 'To Do';
}

function pendingProjection(context, desired, previous = null) {
  return { schema:'BacklogProjection/v1', ledger_id:context.ledger_id, task_id:context.task_id, desired_status:desired, observed_status:previous?.observed_status ?? null, provider_revision:context.provider_revision, sync_status:'pending', gap_pointer:null, error:null, updated_at:new Date().toISOString() };
}

function validateTestingReceipt(receipt, checkpoint) {
  const keys=['schema','work_id','source_revision','sealed_revision','implementation_fingerprint','acceptance_manifest_id','acceptance_manifest_version','delivery_cycle_id','decision','actor','source','timestamp','sanitized_pointers'];
  if (!onlyKeys(receipt,keys) || receipt.schema !== 'UserTestingReceipt/v1' || !['started','accepted','feedback','rejected'].includes(receipt.decision)) throw new Error('user testing receipt invalid');
  if (!validText(receipt.actor) || !validText(receipt.source) || !validText(receipt.timestamp) || !uniqueText(receipt.sanitized_pointers) || !receipt.sanitized_pointers.length) throw new Error('user testing attribution invalid');
  const binding=['work_id','source_revision','sealed_revision','implementation_fingerprint','acceptance_manifest_id','acceptance_manifest_version','delivery_cycle_id'];
  if (binding.some(key => receipt[key] !== (key === 'acceptance_manifest_id' ? checkpoint.acceptance_manifest.id : key === 'acceptance_manifest_version' ? checkpoint.acceptance_manifest.version : checkpoint[key]))) throw new Error('user testing receipt binding invalid');
  return true;
}

module.exports = { statuses, readRegistry, validateContextShape, resolveContext, validateProjection, desiredStatus, pendingProjection, validateTestingReceipt };
