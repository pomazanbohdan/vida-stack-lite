import z from 'zod';
import { randomUUID, createHash } from 'node:crypto';
import type { AgentRuntimeConfig } from '../config/runtime-config.js';
import { runtimeConfigDigest } from '../config/runtime-config.js';
import { requireSafeRepositoryAccess } from '../config/safe-repository-access.js';
import { canonicalJson, canonicalJsonDigest, freezeJsonValue } from '../contracts/public-ingress.js';
import type { HostStateStore, WorkState, WorkIdentity, StateVersion,HostStateSnapshot } from '../host-state.js';
import { transitionLifecycleState, type LifecycleArtifactReference } from '../lifecycle/lifecycle-state.js';
import { snapshotDeclaredSources } from './scoped-source-snapshot.js';
import type { MastraSessionLedgerSnapshot, MastraSessionLedgerState } from './persistent-session-handoff.js';
import { parseObservedValidatorVerdict } from './observed-validation.js';
import { parseObservedTesterVerdict } from './observed-testing.js';
import { verifyDocumentationClearReference } from '../documentation/clear.js';
import { validateObservedEvidenceReferences } from './observed-receipt-evidence.js';

const text = z.string().min(1).max(512);
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const perspectives = ['correctness', 'security', 'assurance'] as const;
const prerequisiteKinds = ['source_plan', 'platform_knowledge', 'implementation_policy', 'change_impact_pre', 'documentation_validation'] as const;
export const lifecyclePreparationObservationSchema=z.object({schema:z.literal('LifecyclePreparationObservation/v1'),record_id:text,kind:z.enum(prerequisiteKinds),work_id:text,attempt:z.number().int().positive(),source_revision:text,scope_id:text,config_digest:digest,ac_ids:z.array(text).min(1),observed_at:z.string().datetime(),observer_id:text,status:z.enum(['pass','gap']),evidence_refs:z.array(text).min(1),observations:z.array(z.object({mechanic:text,actual:text,evidence_ref:text}).strict()).min(1),gaps:z.array(text)}).strict();
export const correctiveAssignmentAuthorizationSchema=z.object({
  schema:z.literal('CorrectiveAssignmentAuthorization/v1'),work_id:text,attempt:z.number().int().positive(),run_id:text,
  correction_generation:z.number().int().positive(),source_revision:text,scope_id:text,config_digest:digest,
  implementation_fingerprint:digest,ac_ids:z.array(text).min(1),allowed_paths:z.array(text).min(1),stage_ids:z.array(text).min(1),
  predecessor_attempt_ids:z.array(digest),failed_action_ids:z.array(digest).min(1),user_instruction_ref:text,
  issued_at:z.string().datetime(),work_version:z.object({revision:z.number().int().positive(),digest}).strict(),
  ledger_version:z.object({revision:z.number().int().positive(),digest}).strict(),
  journal_version:z.object({revision:z.number().int().positive(),digest}).strict(),
  engine_run_id:z.string().uuid(),base_run_id:text,
}).strict();
export const correctiveExecutionSchema=z.object({schema:z.literal('CorrectiveExecution/v1'),base_run_id:text,engine_run_id:z.string().uuid(),correction_generation:z.number().int().positive(),stage_ids:z.array(text).min(1),authorization:z.object({schema:z.literal('CorrectiveAssignmentAuthorization/v1'),path:text,sha256:digest}).strict()}).strict();
export type CorrectiveExecution=z.infer<typeof correctiveExecutionSchema>;
/** One current Host binding for the base run and explicitly authorized engine subrun. */
export function validateWorkSessionBinding(work:WorkState,state:{attempt:number;run_id:string;corrective_execution?:CorrectiveExecution|null},root?:string):void {
  const execution=state.corrective_execution;
  if(!execution){requireAssurance(state.run_id===work.execution.run_id&&work.lifecycle.assurance.correction_count===0,'base session binding differs');return;}
  correctiveExecutionSchema.parse(execution);
  requireAssurance(root&&state.run_id===execution.engine_run_id&&execution.base_run_id===work.execution.run_id&&execution.correction_generation===work.lifecycle.assurance.correction_count,'corrective session binding differs');
  requireAssurance(work.lifecycle.references.some(ref=>ref.kind==='correction_authorization'&&ref.decision==='approved'&&ref.artifact_schema===execution.authorization.schema&&ref.path===execution.authorization.path&&ref.sha256===execution.authorization.sha256),'consumed Host correction authority missing');
  const bytes=requireSafeRepositoryAccess(root).readBytes(execution.authorization.path,'current corrective binding');
  requireAssurance(bytes.length<=64*1024&&sha256(bytes)===execution.authorization.sha256,'corrective authority bytes differ');
  const authority=correctiveAssignmentAuthorizationSchema.parse(JSON.parse(bytes.toString('utf8')));
  requireAssurance(authority.attempt===state.attempt&&authority.work_id===work.binding.lifecycle_work_id&&authority.run_id===work.execution.run_id&&authority.base_run_id===execution.base_run_id&&authority.engine_run_id===execution.engine_run_id&&authority.correction_generation===execution.correction_generation&&authority.source_revision===work.binding.work_source_revision&&authority.scope_id===work.binding.scope_id&&authority.config_digest===work.binding.config_digest&&canonicalJson(authority.ac_ids)===canonicalJson(work.binding.ac_ids)&&canonicalJson(authority.allowed_paths)===canonicalJson(work.lifecycle.scope.allowed_paths)&&canonicalJson(authority.stage_ids)===canonicalJson(execution.stage_ids),'corrective authority contract differs');
}
/** Completed waves retain terminal failures; a downstream wave may remain wholly unissued. */
export function settledSessionItems(journal:MastraSessionLedgerState) {
  const terminal=(item:MastraSessionLedgerState['items'][number])=>Boolean(item.issue_id&&item.observation&&item.observation.action_id===item.request.action_id&&item.observation.issue_id===item.issue_id&&['reported_complete','reported_failed'].includes(item.observation.status));
  const inert=(item:MastraSessionLedgerState['items'][number])=>item.issue_id===null&&item.observation===null&&!item.host_reservation&&!item.research_activation&&!item.research_normalization;
  const completed=journal.completed.flatMap(wave=>wave.items);
  requireAssurance(completed.every(terminal)&&(journal.items.every(terminal)||journal.items.every(inert)),'session journal has unfinished issued effects');
  return {observed:[...completed,...journal.items.filter(terminal)],inert:journal.items.filter(inert)};
}

/** Read-only capability is configured, not inferred from an egress-policy name. */
export function configuredReadonlyAssignment(config:AgentRuntimeConfig,request:MastraSessionLedgerState['items'][number]['request']):boolean {
  const assignment=config.workflows[request.workflow_id]?.stages.find(stage=>stage.id===request.stage_id)?.assignments[request.assignment_index];
  const profile=assignment&&config.agents.profiles[assignment.profile];
  const tools=profile&&config.agents.tool_policies[profile.tools_policy];
  const egress=profile&&config.agents.egress_policies[profile.egress_policy];
  return Boolean(assignment?.role===request.role&&profile?.mutation_scope==='none'&&tools?.source_write===false&&tools.allowed_tools.every(tool=>['runtime.read','source.read','docs.read','web.search'].includes(tool))&&egress&&egress.allowed_hosts.every(host=>/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/i.test(host)));
}

export function selectCorrectiveEvidence(journal:MastraSessionLedgerState,workflow:AgentRuntimeConfig['workflows'][string]) {
  const {observed}=settledSessionItems(journal);
  const failed=observed.filter(item=>item.observation!.status==='reported_failed');
  requireAssurance(failed.length>0,'corrective operation requires accepted focused negative findings');
  for(const item of failed){
    const kind=workflow.stages.find(stage=>stage.id===item.request.stage_id)?.kind;
    requireAssurance(kind==='validate'||kind==='test','corrective failure is not a focused verdict');
    if(kind==='validate')requireAssurance(parseObservedValidatorVerdict(item.observation!).verdict==='fail','corrective validator verdict differs');
    else requireAssurance(parseObservedTesterVerdict(item.observation!).status==='fail','corrective tester verdict differs');
  }
  return {observed,failed};
}
export const correctiveExecutionPlanSchema=z.object({schema:z.literal('CorrectiveExecutionPlan/v1'),work_id:text,attempt:z.number().int().positive(),stage_ids:z.array(text).min(1),user_instruction_ref:text,preparation_path:text}).strict();
/** Read immutable original planning as evidence, without projecting it into the current engine state. */
export function readCorrectivePlanningJournal(root:string,work:WorkState,journal:MastraSessionLedgerSnapshot):MastraSessionLedgerState {
  validateWorkSessionBinding(work,journal.state,root);
  requireAssurance(journal.state.corrective_execution,'corrective planning requested for base execution');
  const access=requireSafeRepositoryAccess(root);
  for(const ref of work.lifecycle.references.filter(ref=>ref.kind==='recovery'&&ref.artifact_schema==='CorrectiveExecutionRecovery/v1')) {
    const bytes=access.readBytes(ref.path,'immutable corrective planning provenance');
    requireAssurance(sha256(bytes)===ref.sha256,'corrective planning recovery bytes differ');
    const recovery=JSON.parse(bytes.toString('utf8')) as {schema:string;work_id:string;attempt:number;generation:number;original_work:WorkState;original_journal:{version:StateVersion;state:MastraSessionLedgerState}};
    if(recovery.generation!==1)continue;
    const original=recovery.original_journal;
    requireAssurance(recovery.schema==='CorrectiveExecutionRecovery/v1'&&recovery.work_id===work.binding.lifecycle_work_id&&recovery.attempt===journal.state.attempt&&canonicalJsonDigest(recovery.original_work.binding)===canonicalJsonDigest(work.binding)&&original.state.work_id===journal.state.work_id&&original.state.attempt===journal.state.attempt&&original.state.run_id===work.execution.run_id&&!original.state.corrective_execution&&canonicalJsonDigest(original.state)===original.version.digest,'original corrective planning identity differs');
    return freezeJsonValue(original.state);
  }
  throw new Error('GAP-FINAL-ASSURANCE-001: immutable original planning recovery missing');
}
export const finalAssurancePreparationSchema = z.object({
  schema: z.literal('FinalAssurancePreparation/v1'),
  work_id: text, attempt: z.number().int().positive(),
  prerequisites: z.array(z.object({kind: z.enum(prerequisiteKinds), path: text}).strict()).length(5),
  delivery_manifest_path: text, clear_path: text,
  documentation_precheck_path:text,
}).strict();
export const finalAssurancePacketSchema = z.object({
  schema: z.literal('FinalAssurancePacket/v1'), packet_id: text, work_id: text, attempt: z.number().int().positive(),
  source_revision: text, scope_id: text, config_digest: digest, implementation_fingerprint: digest,
  generation: z.number().int().positive(), ac_ids: z.array(text).min(1),
  excluded_actor_ids: z.array(text), preparation_path: text,
  role: text, model: text, reasoning: text,
}).strict();
const reportBinding = {
  work_id: text, attempt: z.number().int().positive(), packet_id: text,
  action_id: digest, issue_id: z.string().uuid(), generation: z.number().int().positive(),
  implementation_fingerprint: digest, scope_id: text,
  agent_id: text, history_id: text, tool_call_ref: text,
  verdict: z.enum(['pass','fail']), evidence_refs: z.array(text).min(1).max(64),
};
export const finalAssuranceReviewSchema = z.object({
  schema: z.literal('FinalAssuranceReview/v1'), ...reportBinding,
  perspective: z.enum(perspectives), findings: z.array(text).max(64),
  checks: z.object({scope_and_trace: z.enum(['pass','fail']), tests_security_rollback: z.enum(['pass','fail']), evidence_invalidation_binding: z.enum(['pass','fail'])}).strict(),
}).strict();
export const finalAssuranceReverseSchema = z.object({
  schema: z.literal('FinalAssuranceReverse/v1'), ...reportBinding,
  review_action_id: digest, review_issue_id: z.string().uuid(),
  checks: z.object({scope_and_trace: z.enum(['pass','fail']), tests_security_rollback: z.enum(['pass','fail']), evidence_invalidation_binding: z.enum(['pass','fail'])}).strict(),
}).strict();
const actionSchema = z.object({
  action_id: digest, kind: z.enum(['review','reverse']), perspective: z.enum(perspectives),
  issue_id: z.string().uuid().nullable(), target_agent_id: text.nullable(),
  observation: z.union([finalAssuranceReviewSchema,finalAssuranceReverseSchema]).nullable(),
}).strict();
export const finalAssuranceStateSchema = z.object({
  schema: z.literal('FinalAssuranceState/v1'), packet: finalAssurancePacketSchema,
  actions: z.array(actionSchema).length(6),
}).strict();
export type FinalAssuranceState = z.infer<typeof finalAssuranceStateSchema>;
export type FinalAssurancePacket = z.infer<typeof finalAssurancePacketSchema>;
export type FinalAssuranceReport = z.infer<typeof finalAssuranceReviewSchema> | z.infer<typeof finalAssuranceReverseSchema>;
export interface FinalAssuranceSnapshot { readonly version: StateVersion; readonly state: FinalAssuranceState; }
function requireAssurance(value: unknown, message: string): asserts value {
  if (!value) throw new Error('GAP-FINAL-ASSURANCE-001: '+message);
}
const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
export function finalAssuranceStatus(state: FinalAssuranceState): 'ready'|'issued_outcome_uncertain'|'blocked'|'reviewed' {
  if (state.actions.some(action => action.observation?.verdict==='fail')) return 'blocked';
  if (state.actions.some(action => action.issue_id && !action.observation)) return 'issued_outcome_uncertain';
  return state.actions.every(action => action.observation?.verdict==='pass') ? 'reviewed' : 'ready';
}
export function createFinalAssuranceState(packet: FinalAssurancePacket): FinalAssuranceState {
  finalAssurancePacketSchema.parse(packet);
  return freezeJsonValue({schema:'FinalAssuranceState/v1',packet,actions: (['review','reverse'] as const).flatMap(kind => perspectives.map(perspective => ({
    action_id:canonicalJsonDigest({packet,kind,perspective}),kind,perspective,issue_id:null,target_agent_id:null,observation:null,
  })))});
}
export function issueFinalAssuranceWave(state: FinalAssuranceState): FinalAssuranceState {
  validateFinalAssuranceState(state);
  requireAssurance(finalAssuranceStatus(state)==='ready','an issued, failed or completed wave cannot be reissued');
  const reviews=state.actions.filter(action=>action.kind==='review');
  const kind=reviews.every(action=>action.observation?.verdict==='pass')?'reverse':'review';
  return freezeJsonValue({...state,actions:state.actions.map(action=> action.kind!==kind || action.issue_id ? action : {
    ...action,issue_id:randomUUID(),target_agent_id:kind==='reverse'?reviews.find(review=>review.perspective===action.perspective)!.observation!.agent_id:null,
  })});
}
export function reportFinalAssurance(state: FinalAssuranceState, value: unknown): FinalAssuranceState {
  validateFinalAssuranceState(state);
  const report = (value as {schema?:unknown})?.schema==='FinalAssuranceReview/v1' ? finalAssuranceReviewSchema.parse(value) : finalAssuranceReverseSchema.parse(value);
  validateObservedEvidenceReferences(report.evidence_refs);
  const action=state.actions.find(candidate=>candidate.action_id===report.action_id);
  requireAssurance(action?.issue_id===report.issue_id,'report has no matching issued action');
  if (action.observation) {
    requireAssurance(canonicalJson(action.observation)===canonicalJson(report),'changed report retry conflicts');
    return state;
  }
  const packet=state.packet;
  requireAssurance(report.work_id===packet.work_id && report.attempt===packet.attempt && report.packet_id===packet.packet_id && report.scope_id===packet.scope_id && report.generation===packet.generation && report.implementation_fingerprint===packet.implementation_fingerprint,'foreign or stale report binding');
  requireAssurance((action.kind==='review')===(report.schema==='FinalAssuranceReview/v1'),'report kind differs from issued action');
  requireAssurance(!state.actions.some(candidate=>candidate.observation?.tool_call_ref===report.tool_call_ref),'tool-call reference was replayed');
  requireAssurance(report.verdict==='fail' || Object.values(report.checks).every(check=>check==='pass'),'pass requires three explicit passing checks');
  const reviews=state.actions.filter(candidate=>candidate.kind==='review');
  if (report.schema==='FinalAssuranceReview/v1') {
    requireAssurance(report.perspective===action.perspective,'review perspective differs');
    requireAssurance(!packet.excluded_actor_ids.includes(report.agent_id),'reviewer was a focused or writing actor');
    requireAssurance(!reviews.some(candidate=>candidate.observation?.agent_id===report.agent_id || candidate.observation?.history_id===report.history_id),'review actors and histories must be distinct');
  } else {
    const review=reviews.find(candidate=>candidate.perspective===action.perspective)!;
    requireAssurance(review.observation?.verdict==='pass' && report.review_action_id===review.action_id && report.review_issue_id===review.issue_id && report.agent_id===review.observation.agent_id && report.history_id===review.observation.history_id && report.agent_id===action.target_agent_id,'reverse does not match its fresh reviewer and review');
  }
  const next=freezeJsonValue({...state,actions:state.actions.map(candidate=>candidate.action_id===action.action_id?{...candidate,observation:report}:candidate)});
  validateFinalAssuranceState(next); return next;
}
export function validateFinalAssuranceState(value: unknown): FinalAssuranceState {
  const state=finalAssuranceStateSchema.parse(value), expected=createFinalAssuranceState(state.packet);
  requireAssurance(state.actions.every((action,index)=> action.action_id===expected.actions[index]!.action_id && action.kind===expected.actions[index]!.kind && action.perspective===expected.actions[index]!.perspective && (!action.observation || action.issue_id===action.observation.issue_id)),'assurance action identity changed');
  const observed=state.actions.flatMap(action=>action.observation?[action.observation]:[]);
  requireAssurance(new Set(observed.map(report=>report.tool_call_ref)).size===observed.length,'duplicate tool references');
  const reviews=observed.filter(report=>report.schema==='FinalAssuranceReview/v1');
  requireAssurance(new Set(reviews.map(report=>report.agent_id)).size===reviews.length && new Set(reviews.map(report=>report.history_id)).size===reviews.length,'duplicate reviewers or histories');
  const issued = state.actions.filter(action=>action.issue_id!==null);
  requireAssurance(new Set(issued.map(action=>action.issue_id)).size===issued.length,'duplicate issued identities');
  for (const action of state.actions) {
    const report=action.observation, packet=state.packet;
    if(action.kind==='review') requireAssurance(action.target_agent_id===null,'blind review cannot target a selected actor');
    else if(action.issue_id) requireAssurance(state.actions.filter(item=>item.kind==='review').every(item=>item.observation?.verdict==='pass'),'reverse requires all three accepted reviews');
    if(!report)continue;
    validateObservedEvidenceReferences(report.evidence_refs);
    requireAssurance(report.action_id===action.action_id && report.issue_id===action.issue_id && report.work_id===packet.work_id && report.attempt===packet.attempt && report.packet_id===packet.packet_id && report.scope_id===packet.scope_id && report.generation===packet.generation && report.implementation_fingerprint===packet.implementation_fingerprint,'persisted report binding differs');
    requireAssurance(report.verdict==='fail' || Object.values(report.checks).every(check=>check==='pass'),'persisted passing report lacks explicit checks');
    if(action.kind==='review') requireAssurance(report.schema==='FinalAssuranceReview/v1' && report.perspective===action.perspective && !packet.excluded_actor_ids.includes(report.agent_id),'persisted review is foreign or not independent');
    else {
      const review=state.actions.find(item=>item.kind==='review'&&item.perspective===action.perspective)!;
      requireAssurance(report.schema==='FinalAssuranceReverse/v1' && review.observation?.verdict==='pass' && report.review_action_id===review.action_id && report.review_issue_id===review.issue_id && report.agent_id===review.observation.agent_id && report.history_id===review.observation.history_id && report.agent_id===action.target_agent_id,'persisted reverse binding differs');
    }
  }
  return state;
}
export function validateFinalAssuranceProgress(before: FinalAssuranceState|null, after: FinalAssuranceState): void {
  validateFinalAssuranceState(after);
  if (!before) { requireAssurance(canonicalJson(after)===canonicalJson(createFinalAssuranceState(after.packet)),'initial assurance cannot contain issues or reports'); return; }
  validateFinalAssuranceState(before);
  requireAssurance(canonicalJson(before.packet)===canonicalJson(after.packet),'sealed packet cannot be replaced');
  const changed=after.actions.filter((action,index)=>canonicalJson(action)!==canonicalJson(before.actions[index]));
  requireAssurance(changed.length>0,'assurance CAS must make progress');
  if (changed.every(action=>action.observation===null)) {
    const generated=issueFinalAssuranceWave(before);
    requireAssurance(after.actions.every((action,index)=>{
      const previous=before.actions[index]!, expected=generated.actions[index]!;
      return previous.issue_id ? canonicalJson(action)===canonicalJson(previous) : action.kind===expected.kind && action.target_agent_id===expected.target_agent_id && Boolean(action.issue_id)===Boolean(expected.issue_id);
    }),'issue must bind the complete ready wave');
  } else {
    requireAssurance(changed.length===1 && changed[0]!.observation,'one report is committed at a time');
    requireAssurance(canonicalJson(reportFinalAssurance(before,changed[0]!.observation))===canonicalJson(after),'report transition differs from issued observation');
  }
}

function reference(work:WorkState, kind:LifecycleArtifactReference['kind'], path:string, bytes:Uint8Array, schema:string, id:string, decision:LifecycleArtifactReference['decision']=null, principal:string|null=null):LifecycleArtifactReference {
  return {schema:'LifecycleArtifactReference/v1',kind,artifact_schema:schema,record_id:id,path,sha256:sha256(bytes),source_revision:work.binding.work_source_revision,scope_id:work.binding.scope_id,ac_ids:[...work.binding.ac_ids],generation:['review_packet','review_receipt','reverse_validation','documentation_clear'].includes(kind)?work.lifecycle.assurance.review_generation:null,implementation_fingerprint:['implementation_result','validation_receipt','test_receipt','review_packet','review_receipt','reverse_validation','documentation_clear','delivery_manifest'].includes(kind)?work.lifecycle.seal?.implementation_fingerprint??null:null,delivery_cycle_id:kind==='delivery_manifest'?work.lifecycle.assurance.delivery_cycle_id:null,principal,decision,disposition:'current'};
}
function publish(root:string,file:string,value:unknown):Buffer {
  const access=requireSafeRepositoryAccess(root),bytes=Buffer.from(canonicalJson(value)+'\n');
  if (access.fileExists(file,'assurance artifact retry')) requireAssurance(access.readBytes(file,'assurance artifact').equals(bytes),'artifact retry differs');
  else access.writeExclusive(file,bytes.toString('utf8'),'assurance artifact');
  return bytes;
}
/** Explicit current revalidation is not a claim that missing prerequisites passed before an earlier writer. */
type AssurancePreparationInput={root:string;config:AgentRuntimeConfig;store:HostStateStore;identity:WorkIdentity;journal:MastraSessionLedgerSnapshot;preparationPath:string;};
export function prepareFinalAssurance(input:AssurancePreparationInput):FinalAssuranceSnapshot{return prepareLifecycleAssurance(input,'final') as FinalAssuranceSnapshot;}
export function prepareLifecycleForCorrection(input:AssurancePreparationInput):HostStateSnapshot{return prepareLifecycleAssurance(input,'correction') as HostStateSnapshot;}
function prepareLifecycleAssurance(input:AssurancePreparationInput,goal:'final'|'correction'):FinalAssuranceSnapshot|HostStateSnapshot {
  const {root,config,store,identity,journal,preparationPath}=input,access=requireSafeRepositoryAccess(root);
  const raw=access.readBytes(preparationPath,'final assurance preparation');
  requireAssurance(raw.length<=64*1024,'preparation is unbounded');
  const preparation=finalAssurancePreparationSchema.parse(JSON.parse(raw.toString('utf8')));
  let host=store.readHostStateSnapshot(identity),work=host.work;
  requireAssurance(work && host.ledger && preparation.work_id===identity.work_id && preparation.attempt===journal.state.attempt,'preparation work/attempt differs');
  validateWorkSessionBinding(work,journal.state,root);
  requireAssurance(journal.state.work_id===identity.work_id && (goal==='correction'||journal.state.step_id===null&&journal.state.items.length===0),'configured workflow has unfinished actions');
  const workflow=config.workflows[work.binding.workflow_id];
  requireAssurance(workflow,'configured workflow missing');
  const completed=goal==='correction'?selectCorrectiveEvidence(journal.state,workflow).observed:journal.state.completed.flatMap(wave=>wave.items);
  requireAssurance(workflow && completed.length>0 && completed.every(item=>item.issue_id&&item.observation&&(goal==='correction'||item.observation.status==='reported_complete')),'focused workflow has failed or unknown outcomes');
  const kinds=completed.map(item=>workflow.stages.find(stage=>stage.id===item.request.stage_id)?.kind);
  requireAssurance(kinds.includes('develop')&&kinds.includes('validate')&&(goal==='correction'||kinds.includes('test')),'accepted writer and required focused stages are missing');
  for (const item of completed) {
    const kind=workflow.stages.find(stage=>stage.id===item.request.stage_id)?.kind;
    if (kind==='validate'){const verdict=parseObservedValidatorVerdict(item.observation!);requireAssurance(goal==='correction'||verdict.verdict==='pass','focused validator failed');}
    if (kind==='test'){const verdict=parseObservedTesterVerdict(item.observation!);requireAssurance(goal==='correction'||verdict.status==='pass','focused tester failed');}
  }
  const source=snapshotDeclaredSources(access,work.lifecycle.scope.allowed_paths);
  requireAssurance(source.digest===journal.state.source_scope?.digest,'current source differs from accepted focused evidence');
  const existing=goal==='final'?store.readFinalAssurance(identity,preparation.attempt):null;
  if (existing) { requireAssurance(existing.state.packet.implementation_fingerprint===source.digest && existing.state.packet.preparation_path===preparationPath,'existing assurance requires normal correction/revalidation');return existing; }
  const precheckBytes=access.readBytes(preparation.documentation_precheck_path,'actual current documentation precheck'),precheck=JSON.parse(precheckBytes.toString('utf8')) as {clear_id:string};
  const precheckCycle=/\/documentation-closeout-(\d{4})\.v1\.json$/u.exec(preparation.documentation_precheck_path);
  requireAssurance(precheckCycle,'current documentation precheck cycle missing');
  verifyDocumentationClearReference({repository_root:root,repository_id:work.binding.repository_id,project_id:work.binding.project_ids[0]!,work_id:identity.work_id,source_revision:work.binding.work_source_revision,scope_paths:[...work.lifecycle.scope.allowed_paths],reference_path:preparation.documentation_precheck_path,reference_sha256:sha256(precheckBytes),reference_id:precheck.clear_id,expected_cycle:Number(precheckCycle[1])});
  requireAssurance(new Set(preparation.prerequisites.map(item=>item.kind)).size===5,'all five genuine prerequisites required');
  const prerequisites=preparation.prerequisites.map(item=>{
    const bytes=access.readBytes(item.path,'current prerequisite');
    requireAssurance(bytes.length<=64*1024,'current prerequisite is unbounded');
    const record=lifecyclePreparationObservationSchema.parse(JSON.parse(bytes.toString('utf8')));
    requireAssurance(record.kind===item.kind&&record.work_id===identity.work_id&&record.attempt===preparation.attempt&&record.source_revision===work!.binding.work_source_revision&&record.scope_id===work!.binding.scope_id&&record.config_digest===work!.binding.config_digest&&canonicalJson(record.ac_ids)===canonicalJson(work!.binding.ac_ids)&&record.status==='pass'&&record.gaps.length===0,'genuine current prerequisite has a GAP or foreign binding: '+item.kind);
    validateObservedEvidenceReferences(record.evidence_refs);
    requireAssurance(record.observations.every(observation=>record.evidence_refs.includes(observation.evidence_ref)),'prerequisite observation has no evidence reference');
    const required={source_plan:['scope_acceptance_trace','verification_rollback'],platform_knowledge:['platform_contracts','official_reference_lookup'],implementation_policy:['root_cause_owner','affected_callers','existing_primitives'],change_impact_pre:['affected_paths','invalidation','rollback'],documentation_validation:['current_inventory','current_clear']}[item.kind];
    requireAssurance(required.every(mechanic=>record.observations.some(observation=>observation.mechanic===mechanic)),'required preparation observations missing: '+item.kind);
    return reference(work!,item.kind,item.path,bytes,record.schema,record.record_id,item.kind==='documentation_validation'?'pass':null);
  });
  const commit=(next:WorkState)=>{host=store.compareAndSwapHostState({expectedWork:host.workVersion,expectedLedger:host.ledgerVersion,expectedSessionJournal:{attempt:preparation.attempt,version:journal.version},nextWork:next,nextLedger:{...host.ledger!,revision:host.ledger!.revision+1}});work=host.work!;};
  const append=(refs:LifecycleArtifactReference[],extra:Partial<WorkState['lifecycle']>={})=>{
    const fresh=refs.filter(ref=>{const old=work!.lifecycle.references.find(old=>old.disposition==='current'&&old.kind===ref.kind&&old.record_id===ref.record_id);if(!old)return true;requireAssurance(canonicalJson(old)===canonicalJson(ref),'preparation reference retry differs');return false;});
    if(fresh.length||Object.keys(extra).length)commit({...work!,revision:work!.revision+1,lifecycle:{...work!.lifecycle,...extra,revision:work!.revision+1,references:[...work!.lifecycle.references,...fresh]}});
  };
  const transition=(phase:'TRACE'|'PLAN'|'EXECUTE'|'VERIFY')=>commit(transitionLifecycleState(work!,phase,'Current explicit assurance preparation; preserve original execution observations.'));
  if(work.lifecycle.phase==='INTAKE')transition('TRACE');
  if(work.lifecycle.phase==='TRACE') {
    append([prerequisites[preparation.prerequisites.findIndex(item=>item.kind==='source_plan')]!,reference(work,'implementation_scope',work.contracts.scope.path,access.readBytes(work.contracts.scope.path,'scope'),work.contracts.scope.schema,work.binding.scope_id),reference(work,'acceptance_manifest',work.contracts.acceptance.path,access.readBytes(work.contracts.acceptance.path,'acceptance'),work.contracts.acceptance.schema,'acceptance-'+identity.work_id)]);
    transition('PLAN');
  }
  if(work!.lifecycle.phase==='PLAN') {append(prerequisites.filter(ref=>ref.kind!=='source_plan'));transition('EXECUTE');}
  const base=`.agent/work/${identity.work_id}/final-assurance-${work!.lifecycle.assurance.correction_count+1}`;
  if(work!.lifecycle.phase==='EXECUTE') {
    if(work!.lifecycle.seal){
      requireAssurance(work!.lifecycle.seal.implementation_fingerprint===source.digest&&work!.lifecycle.references.some(ref=>ref.kind==='implementation_result'&&ref.disposition==='current'&&ref.implementation_fingerprint===source.digest),'execution seal has no matching current implementation evidence');
      transition('VERIFY');
    }else{
    const implementation={schema:'FinalAssuranceImplementation/v1',work_id:identity.work_id,attempt:preparation.attempt,source_revision:work!.binding.work_source_revision,implementation_fingerprint:source.digest,observations:completed.filter((_,index)=>kinds[index]==='develop').map(item=>item.observation)};
    const file=base+'-implementation.json',bytes=publish(root,file,implementation),revision=work!.revision+1;
    const sealed={...work!,revision,lifecycle:{...work!.lifecycle,revision,seal:{sealed_revision:revision,sealed_at:new Date().toISOString(),implementation_fingerprint:source.digest}}};
    commit({...sealed,lifecycle:{...sealed.lifecycle,references:[...sealed.lifecycle.references,reference(sealed,'implementation_result',file,bytes,implementation.schema,'implementation-'+identity.work_id+'-'+work!.lifecycle.assurance.correction_count)]}});
    transition('VERIFY');
    }
  }
  requireAssurance(work!.lifecycle.phase==='VERIFY','work is not in verification');
  if(goal==='correction')return host;
  const currentAssurance=store.readFinalAssurance(identity,preparation.attempt);
  if(currentAssurance)return currentAssurance;
  const pendingPacket=work!.lifecycle.references.find(ref=>ref.kind==='review_packet'&&ref.disposition==='current');
  if(pendingPacket){
    const bytes=access.readBytes(pendingPacket.path,'pending atomic assurance publication'),packet=finalAssurancePacketSchema.parse(JSON.parse(bytes.toString('utf8')));
    requireAssurance(sha256(bytes)===pendingPacket.sha256&&packet.preparation_path===preparationPath&&packet.implementation_fingerprint===source.digest,'pending assurance publication differs');
    return store.compareAndSwapFinalAssurance({identity,attempt:preparation.attempt,expected:null,expectedWork:host.workVersion!,expectedLedger:host.ledgerVersion!,next:createFinalAssuranceState(packet)});
  }
  const generation=work!.lifecycle.assurance.review_generation+1;
  const assignment=workflow.stages.filter(stage=>stage.kind==='validate').flatMap(stage=>stage.assignments).find(entry=>config.agents.profiles[entry.profile]?.mutation_scope==='none');
  requireAssurance(assignment,'configured readonly validator profile missing');
  const profile=config.agents.profiles[assignment.profile]!;
  const packet:FinalAssurancePacket={schema:'FinalAssurancePacket/v1',packet_id:'final-'+identity.work_id+'-'+generation,work_id:identity.work_id,attempt:preparation.attempt,source_revision:work!.binding.work_source_revision,scope_id:work!.binding.scope_id,config_digest:runtimeConfigDigest(config),implementation_fingerprint:source.digest,generation,ac_ids:[...work!.binding.ac_ids],excluded_actor_ids:[...new Set(completed.map(item=>item.observation!.agent_id))],preparation_path:preparationPath,role:assignment.role,model:profile.model,reasoning:profile.reasoning};
  const packetPath=base+'-packet.json',packetBytes=publish(root,packetPath,packet);
  const packetWork={...work!,lifecycle:{...work!.lifecycle,assurance:{...work!.lifecycle.assurance,review_generation:generation,delivery_cycle_id:'delivery-'+packet.packet_id}}};
  const receipts=completed.flatMap((item,index)=>{
    const kind=kinds[index];if(kind!=='validate'&&kind!=='test')return [];
    const file=base+'-focused-'+item.request.action_id+'.json',bytes=publish(root,file,item.observation);
    return [reference(packetWork,kind==='test'?'test_receipt':'validation_receipt',file,bytes,'VidaSessionObservation/v1',item.request.action_id,'pass',item.observation!.agent_id)];
  });
  append([reference(packetWork,'review_packet',packetPath,packetBytes,packet.schema,packet.packet_id),...receipts],{assurance:packetWork.lifecycle.assurance});
  return store.compareAndSwapFinalAssurance({identity,attempt:preparation.attempt,expected:null,expectedWork:host.workVersion!,expectedLedger:host.ledgerVersion!,next:createFinalAssuranceState(packet)});
}

export function finalAssuranceReceiptReferences(root:string,work:WorkState,state:FinalAssuranceState):LifecycleArtifactReference[] {
  requireAssurance(finalAssuranceStatus(state)==='reviewed','exactly three passing review/reverse pairs required');
  const preparation=finalAssurancePreparationSchema.parse(JSON.parse(requireSafeRepositoryAccess(root).readText(state.packet.preparation_path,'assurance preparation')));
  const refs=state.actions.map(action=>{
    const file=`.agent/work/${work.binding.lifecycle_work_id}/final-${action.action_id}.json`,report=action.observation!,bytes=publish(root,file,report);
    return reference(work,action.kind==='review'?'review_receipt':'reverse_validation',file,bytes,report.schema,action.action_id,'pass',report.agent_id);
  });
  const access=requireSafeRepositoryAccess(root),clearBytes=access.readBytes(preparation.clear_path,'current CLEAR'),clear=JSON.parse(clearBytes.toString('utf8')) as {clear_id:string};
  verifyDocumentationClearReference({repository_root:root,repository_id:work.binding.repository_id,project_id:work.binding.project_ids[0]!,work_id:work.binding.lifecycle_work_id,source_revision:work.binding.work_source_revision,scope_paths:[...work.lifecycle.scope.allowed_paths],reference_path:preparation.clear_path,reference_sha256:sha256(clearBytes),reference_id:clear.clear_id,expected_cycle:state.packet.generation});
  refs.push(reference(work,'documentation_clear',preparation.clear_path,clearBytes,'DocumentationClearCheckpoint/v1',clear.clear_id,'pass'));
  const manifestBytes=access.readBytes(preparation.delivery_manifest_path,'delivery manifest'),manifest=JSON.parse(manifestBytes.toString('utf8')) as {schema:string;work_id:string;implementation_fingerprint:string;destination:string;order:string[];post_deployment_checks:string[]};
  requireAssurance(manifest.schema==='FinalAssuranceDelivery/v1' && manifest.work_id===state.packet.work_id && manifest.implementation_fingerprint===state.packet.implementation_fingerprint && typeof manifest.destination==='string' && manifest.destination.length>0 && Array.isArray(manifest.order) && Array.isArray(manifest.post_deployment_checks) && manifest.post_deployment_checks.length>0,'current explicit delivery manifest missing');
  refs.push(reference(work,'delivery_manifest',preparation.delivery_manifest_path,manifestBytes,manifest.schema,'delivery-'+state.packet.packet_id));
  return refs;
}
