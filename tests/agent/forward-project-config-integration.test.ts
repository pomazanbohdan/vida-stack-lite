import assert from 'node:assert/strict';
import { isPlainRecord } from '../../packages/agent/src/contracts/canonical-json-core.ts';
import { createHash } from 'node:crypto';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

// Exercises a project configuration rebind across the forward-update integration boundary.
const repository = path.resolve(process.env.VIDA_CONFIG_REBIND_REPOSITORY_ROOT ?? process.cwd());
const workRoot = path.resolve(
  repository,
  process.env.VIDA_CONFIG_REBIND_STAGE ?? '.tmp/vida-project-config-rebind-20260929',
);
const controllerRoot = path.resolve(
  repository,
  process.env.VIDA_CONFIG_REBIND_CONTROLLERS ?? '.agent/work/vida-runtime-forward-fix-20260928/proposal',
);
const selectedStage = path.resolve(
  repository,
  process.env.VIDA_CONFIG_REBIND_PARENT ?? '.tmp/vida-runtime-code-rebind-stage-20260929/parent',
);
const stagedSuccessor = path.join(workRoot, 'verification-overlay');
type JsonObject = Record<string, unknown>;
interface PayloadEntry {
  path: string;
  sha256: string;
  size: number;
  [key: string]: unknown;
}
interface PayloadManifest extends JsonObject {
  schema: 'VidaAgentPreparedPayload/v1';
  files: PayloadEntry[];
  unresolved_integration_paths: unknown[];
}
interface ForwardOptions {
  root: string;
  oldPayloadRoot: string;
  payloadRoot: string;
  operationId: string;
  operator: string;
  preserveConfiguredResearchChangelog?: boolean;
  resume?: boolean;
  documentationWorkId?: string;
}
interface ForwardInspection extends JsonObject {
  apply_ready: boolean;
  generation: string;
  selector_sha256: string;
  cutoff_witness_sha256: string;
  first_admitted_work_attempt: string;
  old_payload_manifest_sha256: string;
  new_payload_manifest_sha256: string;
  changed: unknown[];
  preserved_mutable_outputs: Array<{ path: string; [key: string]: unknown }>;
}
interface ForwardPlanModule {
  inspectForwardUpdate(
    options: Pick<ForwardOptions, 'root' | 'oldPayloadRoot' | 'payloadRoot' | 'preserveConfiguredResearchChangelog'>,
  ): unknown;
  assertProjectOwnedIntegrationRetirement(
    root: string,
    oldFiles: Map<string, PayloadEntry>,
    nextFiles: Map<string, PayloadEntry>,
  ): string[];
}
interface ForwardEffectModule {
  prepareForwardBundle(options: ForwardOptions & { onPhase?: (phase: string, file?: string) => void }): unknown;
}
interface ForwardFinalizeModule {
  finalizeForwardBundle(options: ForwardOptions): unknown;
}
interface ForwardAuthorityModule {
  forwardUpdateAuthority(root: string, selector: JsonObject, selectorSha256: string, cutoverRoot: string): unknown;
}
function parseObject(bytes: Uint8Array, description: string): JsonObject {
  const value: unknown = JSON.parse(Buffer.from(bytes).toString('utf8'));
  if (!isPlainRecord(value)) throw new Error(`${description} must be an object`);
  return value;
}
function entriesByPath(entries: readonly PayloadEntry[]): Map<string, PayloadEntry> {
  const result = new Map<string, PayloadEntry>();
  for (const entry of entries) result.set(entry.path, entry);
  return result;
}
function isForwardPlanModule(value: unknown): value is ForwardPlanModule {
  return (
    isPlainRecord(value) &&
    typeof value.inspectForwardUpdate === 'function' &&
    typeof value.assertProjectOwnedIntegrationRetirement === 'function'
  );
}
function isForwardEffectModule(value: unknown): value is ForwardEffectModule {
  return isPlainRecord(value) && typeof value.prepareForwardBundle === 'function';
}
function isForwardFinalizeModule(value: unknown): value is ForwardFinalizeModule {
  return isPlainRecord(value) && typeof value.finalizeForwardBundle === 'function';
}
function isForwardAuthorityModule(value: unknown): value is ForwardAuthorityModule {
  return isPlainRecord(value) && typeof value.forwardUpdateAuthority === 'function';
}
function parseManifest(bytes: Uint8Array, description: string): PayloadManifest {
  const value: unknown = JSON.parse(Buffer.from(bytes).toString('utf8'));
  if (
    !isPlainRecord(value) ||
    value.schema !== 'VidaAgentPreparedPayload/v1' ||
    !Array.isArray(value.files) ||
    !Array.isArray(value.unresolved_integration_paths)
  )
    throw new Error(`${description} must be a prepared-payload manifest`);
  const files: PayloadEntry[] = value.files.map((entry: unknown) => {
    if (
      !isPlainRecord(entry) ||
      typeof entry.path !== 'string' ||
      typeof entry.sha256 !== 'string' ||
      typeof entry.size !== 'number' ||
      !Number.isSafeInteger(entry.size) ||
      entry.size < 0
    )
      throw new Error(`${description} contains an invalid payload entry`);
    return { ...entry, path: entry.path, sha256: entry.sha256, size: entry.size };
  });
  return {
    ...value,
    schema: 'VidaAgentPreparedPayload/v1',
    files,
    unresolved_integration_paths: value.unresolved_integration_paths,
  };
}
function parseInspection(value: unknown): ForwardInspection {
  if (
    !isPlainRecord(value) ||
    typeof value.apply_ready !== 'boolean' ||
    typeof value.generation !== 'string' ||
    typeof value.selector_sha256 !== 'string' ||
    typeof value.cutoff_witness_sha256 !== 'string' ||
    typeof value.first_admitted_work_attempt !== 'string' ||
    typeof value.old_payload_manifest_sha256 !== 'string' ||
    typeof value.new_payload_manifest_sha256 !== 'string' ||
    !Array.isArray(value.changed) ||
    !Array.isArray(value.preserved_mutable_outputs)
  )
    throw new Error('forward inspection result is malformed');
  const preserved: Array<{ path: string; [key: string]: unknown }> = value.preserved_mutable_outputs.map(
    (entry: unknown) => {
      if (!isPlainRecord(entry) || typeof entry.path !== 'string')
        throw new Error('preserved output path is malformed');
      return { ...entry, path: entry.path };
    },
  );
  return {
    ...value,
    apply_ready: value.apply_ready,
    generation: value.generation,
    selector_sha256: value.selector_sha256,
    cutoff_witness_sha256: value.cutoff_witness_sha256,
    first_admitted_work_attempt: value.first_admitted_work_attempt,
    old_payload_manifest_sha256: value.old_payload_manifest_sha256,
    new_payload_manifest_sha256: value.new_payload_manifest_sha256,
    changed: value.changed,
    preserved_mutable_outputs: preserved,
  };
}
const planModuleValue: unknown = await import(pathToFileURL(path.join(controllerRoot, 'forward-update-plan.mjs')).href);
if (!isForwardPlanModule(planModuleValue)) throw new Error('forward plan exports are unavailable');
const planModule = planModuleValue;
const effectModuleValue: unknown = await import(
  pathToFileURL(path.join(controllerRoot, 'forward-update-prepare.mjs')).href
);
if (!isForwardEffectModule(effectModuleValue)) throw new Error('forward prepare export is unavailable');
const effectModule = effectModuleValue;
const finalizeModuleValue: unknown = await import(
  pathToFileURL(path.join(controllerRoot, 'forward-update-finalize.mjs')).href
);
if (!isForwardFinalizeModule(finalizeModuleValue)) throw new Error('forward finalize export is unavailable');
const finalizeModule = finalizeModuleValue;
const authorityModuleValue: unknown = await import(
  pathToFileURL(path.join(stagedSuccessor, 'vida-agent/bin/run.mjs')).href
);
if (!isForwardAuthorityModule(authorityModuleValue))
  throw new Error('selected forward authority export is unavailable');
const authorityModule = authorityModuleValue;
const publicStepsSource =
  "import assert from 'node:assert/strict';\nimport { readFileSync, writeFileSync, mkdirSync } from 'node:fs';\nimport path from 'node:path';\nimport { pathToFileURL } from 'node:url';\nconst root = process.argv[2];\nconst source = relative => pathToFileURL(path.join(root, 'vida-agent', relative)).href;\nconst { run } = await import(source('bin/run.mjs'));\nconst { runReconcileArtifacts } = await import(source('bin/reconcile-artifacts.ts'));\nconst { loadRuntimeConfig, runtimeConfigDigest } = await import(source('src/config/runtime-config.ts'));\nconst { deriveWorkspaceId } = await import(source('src/workspace-identity.ts'));\nconst { canonicalJsonDigest } = await import(source('src/contracts/public-ingress.ts'));\nconst { snapshotDeclaredSources } = await import(source('src/orchestration/scoped-source-snapshot.ts'));\nconst { requireSafeRepositoryAccess } = await import(source('src/config/safe-repository-access.ts'));\nconst { openConfiguredMastraSessionLedger } = await import(source('src/orchestration/persistent-session-handoff.ts'));\nconst { loadProjectSetContext } = await import(source('src/config/project-context.ts'));\nconst record = value => JSON.stringify(value,null,2)+'\\n';\nconst initial = JSON.parse(readFileSync(path.join(root,'.agent/runtime-initialization.v1.json')));\nconst oldConfig = loadRuntimeConfig(root);\ninitial.workspace_id = deriveWorkspaceId(oldConfig.repository.repository_id, root);\ninitial.workspace_binding_status = 'bound';\nwriteFileSync(path.join(root,'.agent/runtime-initialization.v1.json'), record(initial));\nmkdirSync(path.join(root, 'project/crmbx'), { recursive:true });\nfunction task(workId) {\n  const dir = `.agent/work/${workId}`; mkdirSync(path.join(root,dir),{recursive:true});\n  const target = 'vida-agent/TESTING.md';\n  const source = snapshotDeclaredSources(requireSafeRepositoryAccess(root), [target]);\n  const scope = { schema:'ImplementationScope/v1',scope_id:workId+'-scope',work_id:workId,\n    source_revision:source.digest, ac_ids:['AC-FIXTURE'],allowed_paths:[target],implementation_paths:[target],\n    documentation_paths:[],changed_symbols:[],non_goals:[],acceptance_trace:['AC-FIXTURE'],\n    behavior_trace:['SR-FIXTURE'],test_trace:['fixture'],diagnostic_trace:['fixture'],\n    attribution:{thread_id:'fixture-native-session',pointer:dir+'/intake.json'},owner:'fixture',created_at:new Date().toISOString() };\n  const acceptance = {schema:'AcceptanceManifest/v1',id:workId+'-acceptance',version:1,ac_ids:scope.ac_ids,\n    source:target,scope:scope.scope_id,source_revision:source.digest,\n    contracts:[{id:'AC-FIXTURE',definition:'Fixture only admission.',sr:'SR-FIXTURE',evidence:['fixture']}]};\n  const intake = {schema:'VidaLocalSessionIntake/v1',native_session_handle:'fixture-native-session',\n    work_item:{schema:'WorkItem/v1',id:workId,provider:'local',provider_type:'Task',canonical_kind:'task',intent:'task_execution',\n      project_id:'refactoring',title:'Fixture only intake',description:'',labels:[],risk_flags:[]},\n    scope_path:dir+'/scope.json',acceptance_path:dir+'/acceptance.json',runtime_code_paths:['vida-agent/bin/run.mjs'],\n    route:'R2',risk:'medium',change_kind:'fix'};\n  for(const [name,value] of [['scope',scope],['acceptance',acceptance],['intake',intake]])\n    writeFileSync(path.join(root,dir,name+'.json'),record(value));\n  return ['--project-root',root,'--repository',oldConfig.repository.repository_id,'--project','refactoring',\n    '--work-path','vida-agent','--work-id',workId,'--attempt','1','--scope-digest',source.digest,\n    '--team','default-development','--kind','task','--intent','task_execution','--workflow','task_execution',\n    '--intake',path.join(root,dir,'intake.json')];\n}\nconst oldArgs = task('fixture-old-settings');\nawait run(oldArgs, false);\nconst project = loadProjectSetContext(root, oldConfig,oldConfig.repository.repository_id,['refactoring']);\nconst identity = {repository_id:project.repository_id,project_ids:project.project_ids,integrations_digest:project.integrations_digest,work_id:'fixture-old-settings'};\nconst ledger = openConfiguredMastraSessionLedger(root,oldConfig);\ntry {\n  const host=ledger.hostState.readHostStateSnapshot(identity);\n  assert.ok(host.work.lease);\n  const ticket=host.ledger.tickets.find(t=>t.ticket_id===host.work.lease.ticket_id);\n  const time=new Date().toISOString();\n  // TEST SETUP: pause an unissued admitted work; no native action/effect is fabricated.\n  ledger.hostState.compareAndSwapHostState({expectedWork:host.workVersion,expectedLedger:host.ledgerVersion,\n    expectedMaintenanceGeneration:host.maintenanceGeneration,\n    nextWork:{...host.work,revision:host.work.revision+1,lifecycle:{...host.work.lifecycle,revision:host.work.revision+1},\n      lease:null,execution:{...host.work.execution,status:'suspended',phase:'awaiting_followup'}},\n    nextLedger:{...host.ledger,revision:host.ledger.revision+1,\n      tickets:host.ledger.tickets.map(t=>t.ticket_id===ticket.ticket_id?{...t,status:'released',active_resources:[],blocked_resources:[],expires_at:null}:t),\n      claims:host.ledger.claims.map(c=>c.ticket_id===ticket.ticket_id?{...c,status:'released',renewed_at:time}:c),\n      operations:[...host.ledger.operations,{schema:'CoordinationOperation/v1',operation_id:'fixture-pause',kind:'release',\n        ticket_id:ticket.ticket_id,work_id:identity.work_id,thread_id:ticket.thread_id,source_revision:ticket.source_revision,\n        resources:ticket.exclusive_resources,from_ledger_revision:host.ledger.revision,to_ledger_revision:host.ledger.revision+1,\n        decided_by:ticket.thread_id,decision_pointer:'TEST SETUP pause',created_at:time}]}});\n} finally { ledger.close(); }\nconst pausedLedger=openConfiguredMastraSessionLedger(root);\nlet pausedWork,pausedJournal;\ntry {\n  pausedWork=pausedLedger.hostState.readHostStateSnapshot(identity).work;\n  pausedJournal=pausedLedger.resume(identity.work_id,1);\n  assert.equal(pausedWork.binding.config_digest,runtimeConfigDigest(oldConfig));\n} finally { pausedLedger.close(); }\nconst yamlPath=path.join(root,'agent-runtime.config.v1.yaml');\nconst oldYaml=readFileSync(yamlPath,'utf8');\nconst target=oldYaml.replace(/(    executor:\\r?\\n      model: )[^\\r\\n]+(\\r?\\n      reasoning: )[^\\r\\n]+/,'$1gpt-6.1-sol$2medium');\nwriteFileSync(path.join(root,'proposed.yaml'),target);\nconst args=mode=>['--kind','runtime-config','--mode',mode,'--project-root',root,'--repair-id','fixture-profile-rebind',\n  ...(mode==='plan'?['--actor','fixture-owner','--timestamp',new Date().toISOString(),'--instruction-ref','TEST SETUP only','--target-config','proposed.yaml']:[])];\nawait runReconcileArtifacts(args('plan'));\nassert.equal((await runReconcileArtifacts(args('apply'))).status,'author_config_required');\nwriteFileSync(yamlPath,target);\nassert.equal((await runReconcileArtifacts(args('resume'))).status,'applied');\nconst config=loadRuntimeConfig(root);\nassert.notEqual(runtimeConfigDigest(config),runtimeConfigDigest(oldConfig));\nassert.equal(config.agents.profiles.executor.model,'gpt-6.1-sol');\nassert.equal(config.agents.profiles.executor.reasoning,'medium');\nawait assert.rejects(()=>run(oldArgs.filter((value,index)=>oldArgs[index-1]!=='--intake'&&value!=='--intake'),false),\n  /Mastra run binding differs from current context/);\nconst fresh=await run(task('fixture-fresh-settings'),false);\nassert.ok(fresh);\nconst newLedger=openConfiguredMastraSessionLedger(root,config);\ntry {\n  const old=newLedger.hostState.readHostStateSnapshot(identity);\n  assert.deepEqual(old.work,pausedWork);\n  assert.deepEqual(newLedger.resume(identity.work_id,1),pausedJournal);\n  assert.equal(old.work.binding.config_digest,runtimeConfigDigest(oldConfig));\n  const current=newLedger.hostState.readHostStateSnapshot({...identity,work_id:'fixture-fresh-settings'});\n  assert.equal(current.work.binding.config_digest,runtimeConfigDigest(config));\n} finally { newLedger.close(); }\nconsole.log(JSON.stringify({status:'pass',fresh_public_intake:true,old_config_stale_denied:true,\n  executor_model:config.agents.profiles.executor.model,executor_reasoning:config.agents.profiles.executor.reasoning,\n  native_calls:0,runtime_acceptance:false}));\n";
const sha = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');
const json = (value: unknown): Buffer => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
function put(root: string, relative: string, bytes: Uint8Array): void {
  const target = path.join(root, relative);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, bytes);
}
function selectedAuthority(root: string): JsonObject {
  const selected = readFileSync(path.join(root, '.agent/active-runtime-selector.v1.json'));
  const selectorValue: unknown = JSON.parse(selected.toString('utf8'));
  if (!isPlainRecord(selectorValue) || typeof selectorValue.generation !== 'string')
    throw new Error('active selector generation is malformed');
  authorityModule.forwardUpdateAuthority(
    root,
    selectorValue,
    sha(selected),
    path.join(root, '.agent/cutover', selectorValue.generation),
  );
  return selectorValue;
}
function authorizedForward(options: ForwardOptions, verifySelected = true): JsonObject {
  const inspection = parseInspection(planModule.inspectForwardUpdate(options));
  assert.equal(inspection.apply_ready, true);
  const intent = {
    schema: 'VidaForwardUpdateMaintenance/v1',
    operation_id: options.operationId,
    operator: options.operator,
    parent_generation: inspection.generation,
    parent_selector_sha256: inspection.selector_sha256,
    parent_cutoff_sha256: inspection.cutoff_witness_sha256,
    first_admitted_work_attempt: inspection.first_admitted_work_attempt,
    old_payload_manifest_sha256: inspection.old_payload_manifest_sha256,
    new_payload_manifest_sha256: inspection.new_payload_manifest_sha256,
    changed: inspection.changed,
    preserved_mutable_outputs: inspection.preserved_mutable_outputs,
  };
  const evidence = ['correctness', 'security', 'assurance'].map((kind) => {
    const base = `.agent/cutover/${options.operationId}`;
    const actor = `test-${options.operationId}-${kind}`;
    const historyId = `test-history-${options.operationId}-${kind}`;
    const body = json({
      schema: 'VidaForwardReviewReceipt/v1',
      operation_id: options.operationId,
      kind,
      actor,
      history_id: historyId,
      native_tool_ref: `fixture-${kind}`,
      sealed_fingerprint: sha(json(intent)),
      fresh_blind: true,
      verdict: 'pass',
      scope_reviewed: 'complete',
    });
    const reverse = json({
      schema: 'VidaForwardReverseValidation/v1',
      operation_id: options.operationId,
      kind,
      actor,
      history_id: historyId,
      sealed_fingerprint: sha(json(intent)),
      review_sha256: sha(body),
      result: 'pass',
    });
    put(options.root, `${base}/${kind}.json`, body);
    put(options.root, `${base}/${kind}-reverse.json`, reverse);
    return {
      kind,
      path: `${base}/${kind}.json`,
      sha256: sha(body),
      reverse_path: `${base}/${kind}-reverse.json`,
      reverse_sha256: sha(reverse),
      status: 'passed',
    };
  });
  put(
    options.root,
    `.agent/cutover/${options.operationId}/forward-authorization.v1.json`,
    json({
      schema: 'VidaForwardUpdateAuthorization/v1',
      operation_id: options.operationId,
      operator: options.operator,
      outcome: 'approved',
      pointer: 'fixture-only',
      plan_sha256: sha(json(intent)),
      evidence,
    }),
  );
  effectModule.prepareForwardBundle(options);
  const final = finalizeModule.finalizeForwardBundle(options);
  if (!isPlainRecord(final) || final.status !== 'released') throw new Error('forward finalize did not release');
  return verifySelected
    ? selectedAuthority(options.root)
    : parseObject(
        readFileSync(path.join(options.root, '.agent/active-runtime-selector.v1.json')),
        'active runtime selector',
      );
}

// Synthetic forward receipts below establish test setup only, never assurance.
const fixtureBase = process.env.VIDA_CONFIG_REBIND_INTEGRATION_ROOT ?? path.join(workRoot, 'integration-fixtures');
mkdirSync(fixtureBase, { recursive: true });
const scratch = mkdtempSync(path.join(fixtureBase, 'combined-'));
const root = path.join(scratch, 'project');
mkdirSync(root);
mkdirSync(path.join(root, '.git'));
const manifest = parseManifest(
  readFileSync(path.join(selectedStage, 'vida-agent-payload.manifest.v1.json')),
  'parent payload',
);
for (const entry of manifest.files) put(root, entry.path, readFileSync(path.join(selectedStage, entry.path)));
put(
  root,
  'docs/agent-instructions/agent-instructions.changelog.jsonl',
  readFileSync(path.join(repository, 'docs/agent-instructions/agent-instructions.changelog.jsonl')),
);
cpSync(path.join(repository, '.agent/cutover'), path.join(root, '.agent/cutover'), { recursive: true });
put(
  root,
  '.agent/active-runtime-selector.v1.json',
  readFileSync(path.join(repository, '.agent/active-runtime-selector.v1.json')),
);
put(
  root,
  '.agent/runtime-initialization.v1.json',
  readFileSync(path.join(repository, '.agent/runtime-initialization.v1.json')),
);
// Project documentation input is outside the portable payload, but is required
// by the unchanged bound CLEAR policy's index links.
put(
  root,
  'docs/agent-instructions/decisions/index.md',
  readFileSync(path.join(repository, 'docs/agent-instructions/decisions/index.md')),
);
mkdirSync(path.join(root, '.agent/work/vida-runtime-forward-fix-20260928'), { recursive: true });
symlinkSync(path.join(repository, 'vida-agent/node_modules'), path.join(root, 'vida-agent/node_modules'), 'junction');
const baselineYaml = readFileSync(path.join(root, 'agent-runtime.config.v1.yaml'));
const baselineSidecar = readFileSync(path.join(root, 'AGENT.sidecar.md'));
const options = {
  root,
  oldPayloadRoot: selectedStage,
  payloadRoot: stagedSuccessor,
  operationId: 'fixture-project-files-retired',
  operator: 'fixture-operator',
  preserveConfiguredResearchChangelog: true,
};
const originalManifest = readFileSync(path.join(stagedSuccessor, 'vida-agent-payload.manifest.v1.json'));
// Exercise the shared production retirement guard, with exact entry maps.
const candidate = parseManifest(originalManifest, 'successor payload');
for (const missing of [['AGENT.sidecar.md'], ['agent-runtime.config.v1.yaml'], ['AGENTS.md']]) {
  const byPath = entriesByPath(candidate.files);
  for (const entry of manifest.files.filter((e) =>
    ['AGENT.sidecar.md', 'agent-runtime.config.v1.yaml'].includes(e.path),
  ))
    if (!missing.includes(entry.path)) byPath.set(entry.path, entry);
  for (const entry of missing) byPath.delete(entry);
  const invalid = { ...candidate, files: [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path)) };
  assert.throws(
    () =>
      planModule.assertProjectOwnedIntegrationRetirement(
        root,
        entriesByPath(manifest.files),
        entriesByPath(invalid.files),
      ),
    /retire|omit|omission|root/i,
  );
}
const inspection = parseInspection(planModule.inspectForwardUpdate(options));
assert.equal(inspection.apply_ready, true);
assert.deepEqual(
  inspection.preserved_mutable_outputs.map((e) => e.path),
  ['docs/agent-instructions/agent-instructions.changelog.jsonl'],
);
authorizedForward(options);
assert.deepEqual(readFileSync(path.join(root, 'agent-runtime.config.v1.yaml')), baselineYaml);
assert.deepEqual(readFileSync(path.join(root, 'AGENT.sidecar.md')), baselineSidecar);
put(scratch, 'public-steps.mjs', Buffer.from(publicStepsSource));
const publicSteps = spawnSync(
  process.execPath,
  [path.join(root, 'vida-agent/bin/bun.mjs'), path.join(scratch, 'public-steps.mjs'), root],
  { cwd: root, encoding: 'utf8', timeout: 60000 },
);
assert.equal(publicSteps.status, 0, publicSteps.stderr + '\n' + publicSteps.stdout);
selectedAuthority(root);
assert.deepEqual(readFileSync(path.join(root, 'AGENT.sidecar.md')), baselineSidecar);
const report = {
  status: 'pass',
  fixture: root,
  project_owned_pair_retired: true,
  partial_unrelated_omissions_denied: true,
  changelog_retained: true,
  receipt_rebound: true,
  fresh_public_intake: true,
  old_work_stale_denied: true,
  native_calls: 0,
  runtime_acceptance: false,
  synthetic_proofs: 'TEST SETUP ONLY',
};
writeFileSync(path.join(scratch, 'result.json'), json(report));
console.log(JSON.stringify(report));
