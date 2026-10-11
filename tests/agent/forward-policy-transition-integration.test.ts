import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  symlinkSync,
  writeFileSync,
  unlinkSync,
  readdirSync,
} from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { parseMastraSessionLedgerState } from '../../packages/agent/src/orchestration/mastra-session-ledger-codec.js';
import { parseDocumentationPolicyTransition } from '../../packages/agent/src/documentation/policy-transition.js';
import { validateImplementationScope } from '../../packages/agent/src/contracts/implementation-scope.js';
import {
  parseForwardClearCheckpoint,
  parseForwardDocumentationEvent,
} from '../../packages/agent/src/documentation/transition-proof.js';

const repo = path.resolve(process.env.VIDA_POLICY_FORWARD_REPOSITORY_ROOT ?? process.cwd());
const stage = path.join(repo, '.tmp/vida-project-config-rebind-20260929');
const parent = path.join(repo, '.tmp/vida-runtime-code-rebind-stage-20260929/parent');
const successor = path.join(stage, 'correction-overlay');
const scratchRoot = path.resolve(
  process.env.VIDA_POLICY_FORWARD_FIXTURE_ROOT ?? path.join(stage, 'policy-forward-fixtures'),
);
assert.ok(scratchRoot.startsWith(path.join(repo, '.tmp') + path.sep));
mkdirSync(scratchRoot, { recursive: true });
const scratch = mkdtempSync(path.join(scratchRoot, 'forward-')),
  root = path.join(scratch, 'project');
mkdirSync(root);
mkdirSync(path.join(root, '.git'));
type JsonRecord = Record<string, unknown>;
interface PayloadEntry extends JsonRecord {
  path: string;
  sha256: string;
  size: number;
}
interface PayloadManifest extends JsonRecord {
  files: PayloadEntry[];
}
interface ForwardOptions {
  root: string;
  oldPayloadRoot: string;
  payloadRoot: string;
  operationId: string;
  operator: string;
  documentationWorkId: string;
  preserveConfiguredResearchChangelog: boolean;
  completedReadonlyCapture?: string;
}
interface ForwardInspection extends JsonRecord {
  apply_ready: boolean;
  generation: string;
  selector_sha256: string;
  cutoff_witness_sha256: string;
  first_admitted_work_attempt: string;
  old_payload_manifest_sha256: string;
  new_payload_manifest_sha256: string;
  changed: Array<{ path: string; [key: string]: unknown }>;
  preserved_mutable_outputs: unknown[];
}
interface ForwardPlanApi {
  inspectForwardUpdate(options: ForwardOptions): unknown;
}
interface ForwardPrepareApi {
  prepareForwardBundle(
    options: ForwardOptions & { resume?: boolean; onPhase?: (phase: string, file?: string) => void },
  ): unknown;
}
interface ForwardFinalizeApi {
  finalizeForwardBundle(options: ForwardOptions): unknown;
}
interface ForwardAuthorityApi {
  forwardUpdateAuthority(root: string, selector: JsonRecord, selectorSha256: string, cutoverRoot: string): unknown;
}
interface AppliedPolicyOperation extends JsonRecord {
  phase: string;
  maintenance_released: boolean;
  plan: JsonRecord & {
    baseline_digest: string;
    baseline_path: string;
    source_admission: JsonRecord & { successor_manifest_sha256: string };
  };
  closeout: JsonRecord & { path: string };
}
function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function isForwardPlanApi(value: unknown): value is ForwardPlanApi {
  return isJsonRecord(value) && typeof value.inspectForwardUpdate === 'function';
}
function isForwardPrepareApi(value: unknown): value is ForwardPrepareApi {
  return isJsonRecord(value) && typeof value.prepareForwardBundle === 'function';
}
function isForwardFinalizeApi(value: unknown): value is ForwardFinalizeApi {
  return isJsonRecord(value) && typeof value.finalizeForwardBundle === 'function';
}
function isForwardAuthorityApi(value: unknown): value is ForwardAuthorityApi {
  return isJsonRecord(value) && typeof value.forwardUpdateAuthority === 'function';
}
function parseAppliedPolicyOperation(value: Uint8Array): AppliedPolicyOperation {
  const parsed = parseDocumentationPolicyTransition(value);
  if (
    typeof parsed.phase !== 'string' ||
    typeof parsed.maintenance_released !== 'boolean' ||
    !isJsonRecord(parsed.plan) ||
    !isJsonRecord(parsed.closeout) ||
    typeof parsed.plan.baseline_digest !== 'string' ||
    typeof parsed.plan.baseline_path !== 'string' ||
    !isJsonRecord(parsed.plan.source_admission) ||
    typeof parsed.plan.source_admission.successor_manifest_sha256 !== 'string' ||
    typeof parsed.closeout.path !== 'string'
  )
    throw new Error('applied policy transition has an incomplete closure');
  return {
    ...parsed,
    phase: parsed.phase,
    maintenance_released: parsed.maintenance_released,
    plan: {
      ...parsed.plan,
      baseline_digest: parsed.plan.baseline_digest,
      baseline_path: parsed.plan.baseline_path,
      source_admission: {
        ...parsed.plan.source_admission,
        successor_manifest_sha256: parsed.plan.source_admission.successor_manifest_sha256,
      },
    },
    closeout: { ...parsed.closeout, path: parsed.closeout.path },
  };
}
function statusValue(value: unknown): string {
  if (!isJsonRecord(value) || typeof value.status !== 'string')
    throw new Error('forward finalization status is malformed');
  return value.status;
}
function parseInspection(value: unknown): ForwardInspection {
  if (
    !isJsonRecord(value) ||
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
    throw new Error('forward update inspection is malformed');
  const changed = value.changed.map((entry: unknown) => {
    if (!isJsonRecord(entry) || typeof entry.path !== 'string') throw new Error('changed payload path is malformed');
    return { ...entry, path: entry.path };
  });
  return {
    ...value,
    apply_ready: value.apply_ready,
    generation: value.generation,
    selector_sha256: value.selector_sha256,
    cutoff_witness_sha256: value.cutoff_witness_sha256,
    first_admitted_work_attempt: value.first_admitted_work_attempt,
    old_payload_manifest_sha256: value.old_payload_manifest_sha256,
    new_payload_manifest_sha256: value.new_payload_manifest_sha256,
    changed,
    preserved_mutable_outputs: value.preserved_mutable_outputs,
  };
}
function parseRecord(value: string | Uint8Array, description: string): JsonRecord {
  const parsed: unknown = JSON.parse(typeof value === 'string' ? value : Buffer.from(value).toString('utf8'));
  if (!isJsonRecord(parsed)) throw new Error(`${description} must be a JSON object`);
  return parsed;
}
function parseRecordLines(value: string, description: string): JsonRecord[] {
  return value
    .trim()
    .split('\n')
    .map((line: string) => parseRecord(line, description));
}
function requiredString(record: JsonRecord, key: string, description: string): string {
  const value = record[key];
  if (typeof value !== 'string') throw new Error(`${description}.${key} must be a string`);
  return value;
}
function parseManifest(value: string | Uint8Array, description: string): PayloadManifest {
  const parsed = parseRecord(value, description);
  if (!Array.isArray(parsed.files)) throw new Error(`${description}.files must be an array`);
  const files: PayloadEntry[] = parsed.files.map((entry: unknown) => {
    if (
      !isJsonRecord(entry) ||
      typeof entry.path !== 'string' ||
      typeof entry.sha256 !== 'string' ||
      typeof entry.size !== 'number' ||
      !Number.isSafeInteger(entry.size) ||
      entry.size < 0
    )
      throw new Error(`${description} contains an invalid entry`);
    return { ...entry, path: entry.path, sha256: entry.sha256, size: entry.size };
  });
  return { ...parsed, files };
}
function parseDocumentationEvents(value: string): JsonRecord[] {
  return value
    .trim()
    .split('\n')
    .map((line: string) => parseForwardDocumentationEvent(Buffer.from(line)));
}
const sha = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');
const json = (value: unknown): Buffer => Buffer.from(JSON.stringify(value, null, 2) + '\n');
interface CapturedWork extends JsonRecord {
  lease: unknown;
  execution: JsonRecord;
  lifecycle: JsonRecord;
  binding: unknown;
  artifacts: unknown;
}
function parseWorkState(value: unknown): CapturedWork {
  if (
    !isJsonRecord(value) ||
    !isJsonRecord(value.execution) ||
    !isJsonRecord(value.lifecycle) ||
    !('lease' in value) ||
    !('binding' in value) ||
    !('artifacts' in value)
  )
    throw new Error('persisted work assertion projection is incomplete');
  return {
    ...value,
    lease: value.lease,
    execution: value.execution,
    lifecycle: value.lifecycle,
    binding: value.binding,
    artifacts: value.artifacts,
  };
}
function requiredSqlText(row: Record<string, unknown> | undefined, key: string, description: string): string {
  const value = row?.[key];
  if (typeof value !== 'string') throw new Error(`${description}.${key} must be persisted text`);
  return value;
}
function requiredSqlCount(row: Record<string, unknown> | undefined, description: string): number {
  if (!row || typeof row.count !== 'number' || !Number.isSafeInteger(row.count))
    throw new Error(`${description}.count must be a safe integer`);
  return row.count;
}
function parseCapturedBefore(value: Uint8Array): {
  work: CapturedWork;
  journal: ReturnType<typeof parseMastraSessionLedgerState>;
  run_args: string[];
} {
  const captured = parseRecord(value, 'completed readonly capture preimage');
  if (!Array.isArray(captured.run_args) || !captured.run_args.every((item: unknown) => typeof item === 'string'))
    throw new Error('completed readonly capture preimage.run_args must be strings');
  if (!isJsonRecord(captured.journal) || !('state' in captured.journal))
    throw new Error('completed readonly capture preimage.journal.state is required');
  return {
    work: parseWorkState(captured.work),
    journal: parseMastraSessionLedgerState(captured.journal.state),
    run_args: captured.run_args,
  };
}
const put = (relative: string, bytes: Uint8Array): void => {
  const target = path.join(root, relative);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, bytes);
};
const oldManifest = parseManifest(
  readFileSync(path.join(parent, 'vida-agent-payload.manifest.v1.json')),
  'parent manifest',
);
for (const entry of oldManifest.files) put(entry.path, readFileSync(path.join(parent, entry.path)));
for (const file of [
  '.agent/active-runtime-selector.v1.json',
  '.agent/runtime-initialization.v1.json',
  'docs/agent-instructions/agent-instructions.changelog.jsonl',
  'docs/agent-instructions/decisions/index.md',
])
  put(file, readFileSync(path.join(repo, file)));
cpSync(path.join(repo, '.agent/cutover'), path.join(root, '.agent/cutover'), { recursive: true });
// Preserve genuine committed-parent CLEAR inputs as explicitly labelled test data.
const retainedEvents = parseDocumentationEvents(
  readFileSync(path.join(repo, 'docs/agent-instructions/agent-instructions.changelog.jsonl'), 'utf8'),
);
for (const work of new Set(
  retainedEvents
    .filter(
      (event) =>
        event.operation === 'finalize' && event.path_after === 'docs/agent-instructions/documentation-policy.v1.json',
    )
    .map((event) => requiredString(event, 'work_id', 'retained documentation event')),
)) {
  const directory = '.agent/work/' + work;
  for (const name of readdirSync(path.join(repo, directory)).filter((name) =>
    /^documentation-(baseline|closeout)-[0-9]{4}\.v1\.json$/.test(name),
  ))
    put(directory + '/' + name, readFileSync(path.join(repo, directory, name)));
}

symlinkSync(path.join(repo, 'vida-agent/node_modules'), path.join(root, 'vida-agent/node_modules'), 'junction');
mkdirSync(path.join(root, 'project/crmbx'), { recursive: true });
const workId = 'fixture-new-policy-docflow',
  operationId = 'fixture-policy-forward';
const setup = path.join(scratch, 'setup.mjs');
writeFileSync(
  setup,
  `import {writeFileSync,mkdirSync} from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';
const root=process.argv[2],workId=process.argv[3],module=(file)=>pathToFileURL(path.join(root,'vida-agent',file)).href;
const {loadRuntimeConfig}=await import(module('src/config/runtime-config.ts'));
const {requireSafeRepositoryAccess}=await import(module('src/config/safe-repository-access.ts'));
const {snapshotDeclaredSources}=await import(module('src/orchestration/scoped-source-snapshot.ts'));
const {HostStateStore,openHostStateDatabase}=await import(module('src/host-state.ts'));
const {deriveWorkspaceId}=await import(module('src/workspace-identity.ts'));
const {sessionHandoffDatabasePath}=await import(module('src/orchestration/persistent-session-handoff.ts'));
const allowed=['docs/agent-instructions/documentation-policy.v1.json','vida-agent/TESTING.md','vida-agent/instructions/development-lifecycle.md'];
const source=snapshotDeclaredSources(requireSafeRepositoryAccess(root),allowed),dir='.agent/work/'+workId;mkdirSync(path.join(root,dir),{recursive:true});
const scope={schema:'ImplementationScope/v1',scope_id:workId+'-scope',work_id:workId,source_revision:source.digest,ac_ids:['AC-FIXTURE'],
allowed_paths:allowed,implementation_paths:allowed,documentation_paths:allowed,changed_symbols:[],non_goals:[],acceptance_trace:['AC-FIXTURE'],
behavior_trace:['SR-FIXTURE'],test_trace:['fixture'],diagnostic_trace:['fixture'],attribution:{thread_id:'fixture-session',pointer:dir+'/WORK.md'},
owner:'project:refactoring',created_at:new Date().toISOString()};writeFileSync(path.join(root,dir,'scope.json'),JSON.stringify(scope,null,2)+'\\n');
const config=loadRuntimeConfig(root),db=openHostStateDatabase(sessionHandoffDatabasePath(root,config));new HostStateStore(db,deriveWorkspaceId(config.repository.repository_id,root));db.close();
console.log(JSON.stringify({status:'setup',synthetic:'TEST SETUP ONLY'}));`,
);
const setupRun = spawnSync(process.execPath, [path.join(repo, 'vida-agent/bin/bun.mjs'), setup, root, workId], {
  cwd: repo,
  encoding: 'utf8',
  windowsHide: true,
  timeout: 120000,
});
assert.equal(setupRun.status, 0, setupRun.stderr + '\n' + setupRun.stdout);
const controller = (file: string): Promise<unknown> =>
  import(pathToFileURL(path.join(stage, 'controllers', file)).href);
const planApiValue: unknown = await controller('forward-update-plan.mjs');
if (!isForwardPlanApi(planApiValue)) throw new Error('forward plan API is unavailable');
const planApi = planApiValue;
const prepareApiValue: unknown = await controller('forward-update-prepare.mjs');
if (!isForwardPrepareApi(prepareApiValue)) throw new Error('forward prepare API is unavailable');
const prepareApi = prepareApiValue;
const finalizeApiValue: unknown = await controller('forward-update-finalize.mjs');
if (!isForwardFinalizeApi(finalizeApiValue)) throw new Error('forward finalize API is unavailable');
const finalizeApi = finalizeApiValue;
const options: ForwardOptions = {
  root,
  oldPayloadRoot: parent,
  payloadRoot: successor,
  operationId,
  operator: 'fixture-operator',
  documentationWorkId: workId,
  preserveConfiguredResearchChangelog: true,
};
const captureEnabled = process.env.VIDA_POLICY_FORWARD_CAPTURE === 'true';
let captureRequest: string | undefined;
if (captureEnabled) {
  const factory = readFileSync(path.join(stage, 'combined-public-steps.mjs'), 'utf8').replaceAll('\r\n', '\n');
  const prefix = factory.slice(0, factory.indexOf("const oldArgs = task('fixture-old-settings');"));
  const captureSetup = path.join(scratch, 'capture-setup.mjs');
  writeFileSync(
    captureSetup,
    prefix +
      `
const workId='fixture-completed-readonly',args=task(workId),continuing=args.slice(0,-2);
const prepared=await run(args,false);
const issued=await run([...continuing,'--expected-revision',String(prepared.state_version.revision),'--expected-digest',prepared.state_version.digest,'--issue-wave','true'],false);
assert.ok(issued.issued_actions.length>0);
const context=loadProjectSetContext(root,oldConfig,oldConfig.repository.repository_id,['refactoring']);
const identity={repository_id:context.repository_id,project_ids:context.project_ids,integrations_digest:context.integrations_digest,work_id:workId};
const ledger=openConfiguredMastraSessionLedger(root,oldConfig);
try {
 const host=ledger.hostState.readHostStateSnapshot(identity),journal=ledger.resume(workId,1);
 assert.deepEqual(journal.version,issued.state_version);assert.ok(host.work.lease);
 const reports=issued.issued_actions.map((action,index)=>{
  assert.equal(action.request.stage_id,'synthesize_task');
  const file='.agent/work/'+workId+'/completed-'+index+'.json';
  const summary='TEST SETUP ONLY: actual task packet child completed';
  writeFileSync(path.join(root,file),record({schema:'VidaSessionObservation/v1',action_id:action.request.action_id,issue_id:action.issue_id,
   agent_id:'fixture-readonly-child',tool_call_ref:'TEST SETUP ONLY completed child',status:'reported_complete',summary,
   output_digest:canonicalJsonDigest(summary),evidence_refs:['TEST SETUP ONLY']}));return file;
 });
 const request={work_id:workId,project_ids:context.project_ids,attempt:1,native_session_handle:'fixture-native-session',
  user_request_pointer:'TEST SETUP ONLY completed readonly owner closure',expected_work:host.workVersion,expected_ledger:host.ledgerVersion,expected_journal:journal.version,reports};
 writeFileSync(path.join(root,'.agent/work/'+workId+'/capture.json'),record(request));
 writeFileSync(path.join(root,'.agent/work/'+workId+'/before.json'),record({work:host.work,journal,
  run_args:continuing}));
}finally{ledger.close();}
console.log(JSON.stringify({status:'capture_fixture_ready',native_calls:0,synthetic:'TEST SETUP ONLY'}));`,
  );
  const result = spawnSync(process.execPath, [path.join(repo, 'vida-agent/bin/bun.mjs'), captureSetup, root], {
    cwd: repo,
    encoding: 'utf8',
    timeout: 120000,
    windowsHide: true,
    env: { ...process.env, BUN_RUNTIME_TRANSPILER_CACHE_PATH: path.join(scratch, 'old-owner-cache') },
  });
  assert.equal(result.status, 0, result.stderr + '\n' + result.stdout);
  captureRequest = '.agent/work/fixture-completed-readonly/capture.json';
  options.completedReadonlyCapture = captureRequest;
}
const inspection = parseInspection(planApi.inspectForwardUpdate(options));
assert.equal(inspection.apply_ready, true);
const intent = {
  schema: 'VidaForwardUpdateMaintenance/v1',
  operation_id: operationId,
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
  const base = '.agent/cutover/' + operationId,
    actor = 'fixture-' + kind,
    history = 'fixture-history-' + kind;
  const receipt = json({
    schema: 'VidaForwardReviewReceipt/v1',
    operation_id: operationId,
    kind,
    actor,
    history_id: history,
    native_tool_ref: 'TEST SETUP ONLY ' + kind,
    sealed_fingerprint: sha(json(intent)),
    fresh_blind: true,
    verdict: 'pass',
    scope_reviewed: 'complete',
  });
  const reverse = json({
    schema: 'VidaForwardReverseValidation/v1',
    operation_id: operationId,
    kind,
    actor,
    history_id: history,
    sealed_fingerprint: sha(json(intent)),
    review_sha256: sha(receipt),
    result: 'pass',
  });
  put(base + '/' + kind + '.json', receipt);
  put(base + '/' + kind + '-reverse.json', reverse);
  return {
    kind,
    path: base + '/' + kind + '.json',
    sha256: sha(receipt),
    reverse_path: base + '/' + kind + '-reverse.json',
    reverse_sha256: sha(reverse),
    status: 'passed',
  };
});
put(
  '.agent/cutover/' + operationId + '/forward-authorization.v1.json',
  json({
    schema: 'VidaForwardUpdateAuthorization/v1',
    operation_id: operationId,
    operator: options.operator,
    outcome: 'approved',
    pointer: 'TEST SETUP ONLY',
    plan_sha256: sha(json(intent)),
    evidence,
  }),
);
const yaml = readFileSync(path.join(root, 'agent-runtime.config.v1.yaml')),
  sidecar = readFileSync(path.join(root, 'AGENT.sidecar.md'));
const policyBefore = readFileSync(path.join(root, 'docs/agent-instructions/documentation-policy.v1.json'));
const policyInodeBefore = String(
  (await import('node:fs')).statSync(path.join(root, 'docs/agent-instructions/documentation-policy.v1.json')).ino,
);
let firstReplacement = false,
  baselineDigest;
if (captureEnabled) {
  const interruptedCapture = path.join(scratch, 'capture-interruption.mjs');
  writeFileSync(
    interruptedCapture,
    `import {runCompletedReadOnlyCapture} from ${JSON.stringify(pathToFileURL(path.join(successor, 'vida-agent/bin/capture-completed-readonly.ts')).href)};
await runCompletedReadOnlyCapture({root:process.argv[2],payloadRoot:process.argv[3],operationId:process.argv[4],requestPath:process.argv[5]},
{onPhase(phase){if(phase==='observation_captured')throw Error('injected after observation CAS before release')}});`,
  );
  assert.throws(
    () =>
      prepareApi.prepareForwardBundle({
        ...options,
        onPhase(phase: string) {
          if (phase === 'acquired') {
            const result = spawnSync(
              process.execPath,
              [
                path.join(successor, 'vida-agent/bin/bun.mjs'),
                interruptedCapture,
                root,
                successor,
                operationId,
                captureRequest ??
                  (() => {
                    throw new Error('completed readonly capture request path is missing');
                  })(),
              ],
              {
                cwd: root,
                encoding: 'utf8',
                timeout: 120000,
                windowsHide: true,
                env: { ...process.env, BUN_RUNTIME_TRANSPILER_CACHE_PATH: path.join(scratch, 'capture-admin-cache') },
              },
            );
            assert.equal(result.status, 1, result.stderr);
            assert.match(result.stderr, /injected after observation CAS before release/);
            const db = new DatabaseSync(path.join(root, '.agent/work/session-handoff.v1.sqlite'), { readOnly: true });
            try {
              assert.equal(
                requiredSqlCount(
                  db.prepare('SELECT COUNT(*) AS count FROM agent_host_maintenance').get(),
                  'maintenance count',
                ),
                0,
              );
              const row = db
                .prepare(
                  "SELECT payload FROM agent_host_state WHERE kind='work' AND payload LIKE '%fixture-completed-readonly%'",
                )
                .get();
              assert.notEqual(
                parseWorkState(JSON.parse(requiredSqlText(row, 'payload', 'captured work row'))).lease,
                null,
              );
            } finally {
              db.close();
            }
            const original = parseCapturedBefore(
              readFileSync(path.join(root, '.agent/work/fixture-completed-readonly/before.json')),
            );
            const blockedDatabaseBefore = readFileSync(path.join(root, '.agent/work/session-handoff.v1.sqlite'));
            const blocked = spawnSync(
              process.execPath,
              [path.join(root, 'vida-agent/bin/run.mjs'), ...original.run_args],
              {
                cwd: root,
                encoding: 'utf8',
                timeout: 120000,
                env: { ...process.env, BUN_RUNTIME_TRANSPILER_CACHE_PATH: path.join(scratch, 'old-owner-cache') },
              },
            );
            writeFileSync(
              path.join(scratch, 'old-run-overlay-denial.json'),
              json({
                args: original.run_args,
                exit_code: blocked.status,
                stdout: blocked.stdout,
                stderr: blocked.stderr,
                synthetic: 'TEST SETUP ONLY',
              }),
            );
            assert.equal(blocked.status, 1);
            assert.equal(
              parseRecord(blocked.stderr.trim(), 'blocked owner CLI result').code,
              'GAP-VIDA-RUN-SELECTOR-001',
            );
            assert.deepEqual(
              readFileSync(path.join(root, '.agent/work/session-handoff.v1.sqlite')),
              blockedDatabaseBefore,
            );
            throw Error('injected partial capture controller interruption');
          }
        },
      }),
    /injected partial capture controller interruption/,
  );
}
assert.throws(
  () =>
    prepareApi.prepareForwardBundle({
      ...options,
      ...(captureEnabled ? { resume: true } : {}),
      onPhase(phase: string) {
        if (captureEnabled && phase === 'completed_readonly_owner_closed') {
          const before = parseCapturedBefore(
            readFileSync(path.join(root, '.agent/work/fixture-completed-readonly/before.json')),
          );
          const db = new DatabaseSync(path.join(root, '.agent/work/session-handoff.v1.sqlite'), { readOnly: true });
          try {
            const row = db
              .prepare(
                "SELECT payload FROM agent_host_state WHERE kind='work' AND payload LIKE '%fixture-completed-readonly%'",
              )
              .get();
            const work = parseWorkState(JSON.parse(requiredSqlText(row, 'payload', 'closed work row')));
            assert.equal(work.lease, null);
            assert.equal(work.execution.status, 'suspended');
            assert.equal(work.execution.phase, before.work.execution.phase);
            assert.equal(work.lifecycle.phase, before.work.lifecycle.phase);
            assert.deepEqual(work.binding, before.work.binding);
            assert.deepEqual(work.artifacts, before.work.artifacts);
            const journal = parseMastraSessionLedgerState(
              JSON.parse(
                requiredSqlText(
                  db
                    .prepare(
                      "SELECT payload FROM agent_host_mastra_session_ledger WHERE work_id='fixture-completed-readonly'",
                    )
                    .get(),
                  'payload',
                  'completed readonly ledger row',
                ),
              ),
            );
            assert.equal(journal.step_id, before.journal.step_id);
            assert.deepEqual(journal.completed, before.journal.completed);
            assert.ok(
              journal.items.every(
                (item: (typeof journal.items)[number]) =>
                  item.observation?.status === 'reported_complete' && !item.research_normalization,
              ),
            );
            assert.equal(
              requiredSqlCount(
                db.prepare('SELECT COUNT(*) AS count FROM agent_host_maintenance').get(),
                'maintenance count',
              ),
              0,
            );
          } finally {
            db.close();
          }
        }
        if (phase === 'documentation_baseline_ready') {
          const op = parseAppliedPolicyOperation(
            readFileSync(path.join(root, '.agent/work/' + workId + '/documentation-policy-transition.v1.json')),
          );
          assert.equal(op.phase, 'fenced');
          assert.equal(op.plan.source_admission.successor_manifest_sha256, intent.new_payload_manifest_sha256);
          baselineDigest = op.plan.baseline_digest;
        }
        if (phase === 'file_replaced' && !firstReplacement) {
          firstReplacement = true;
          const db = new DatabaseSync(path.join(root, '.agent/work/session-handoff.v1.sqlite'), {
            readOnly: true,
          });
          try {
            const row = db.prepare('SELECT payload FROM agent_host_maintenance').get();
            const maintenance = parseRecord(requiredSqlText(row, 'payload', 'maintenance row'), 'maintenance payload');
            assert.equal(maintenance.status, 'held');
          } finally {
            db.close();
          }
          assert.deepEqual(
            readFileSync(path.join(root, 'docs/agent-instructions/documentation-policy.v1.json')),
            policyBefore,
          );
          throw Error('injected interruption after first fenced prefix publication');
        }
      },
    }),
  /injected interruption after first fenced prefix publication/,
);
assert.equal(firstReplacement, true);
const interrupted = parseAppliedPolicyOperation(
  readFileSync(path.join(root, '.agent/work/' + workId + '/documentation-policy-transition.v1.json')),
);
assert.equal(interrupted.phase, 'fenced');
assert.equal(interrupted.maintenance_released, false);
assert.deepEqual(readFileSync(path.join(root, 'docs/agent-instructions/documentation-policy.v1.json')), policyBefore);
if (captureEnabled) {
  const proofTamper = path.join(scratch, 'capture-release-proof-tamper.mjs');
  writeFileSync(
    proofTamper,
    `import {Database} from 'bun:sqlite';import {readFileSync,writeFileSync} from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';
const root=process.argv[2],saved=process.argv[3],mode=process.argv[4];
const {canonicalJsonDigest}=await import(pathToFileURL(path.join(root,'vida-agent/src/contracts/public-ingress.ts')));
const db=new Database(path.join(root,'.agent/work/session-handoff.v1.sqlite'));
try {if(mode==='hide_table')db.exec('ALTER TABLE agent_host_state RENAME TO fixture_saved_host_state');
else if(mode==='show_table')db.exec('ALTER TABLE fixture_saved_host_state RENAME TO agent_host_state');
else {const row=db.query("SELECT rowid,payload,digest FROM agent_host_state WHERE kind='ledger'").get();
if(mode==='remove'){writeFileSync(saved,JSON.stringify(row));const value=JSON.parse(row.payload);value.operations=value.operations.filter(entry=>!entry.operation_id.startsWith('completed-readonly-release-'));
db.query('UPDATE agent_host_state SET payload=?,digest=? WHERE rowid=?').run(JSON.stringify(value),canonicalJsonDigest(value),row.rowid);}
else{const old=JSON.parse(readFileSync(saved));db.query('UPDATE agent_host_state SET payload=?,digest=? WHERE rowid=?').run(old.payload,old.digest,old.rowid);}
}}finally{db.close();}`,
  );
  const saved = path.join(scratch, 'capture-release-proof-preimage.json');
  const alter = (mode: 'hide_table' | 'show_table' | 'remove' | 'restore'): void => {
    const result = spawnSync(
      process.execPath,
      [path.join(successor, 'vida-agent/bin/bun.mjs'), proofTamper, root, saved, mode],
      {
        cwd: root,
        encoding: 'utf8',
        timeout: 120000,
        env: { ...process.env, BUN_RUNTIME_TRANSPILER_CACHE_PATH: path.join(scratch, 'capture-proof-test-cache') },
      },
    );
    assert.equal(result.status, 0, result.stderr);
  };
  alter('hide_table');
  const missingTableBefore = readFileSync(path.join(root, '.agent/work/session-handoff.v1.sqlite'));
  assert.throws(() => prepareApi.prepareForwardBundle({ ...options, resume: true }), /no such table.*agent_host_state/);
  assert.deepEqual(readFileSync(path.join(root, '.agent/work/session-handoff.v1.sqlite')), missingTableBefore);
  alter('show_table');
  alter('remove');
  const before = readFileSync(path.join(root, '.agent/work/session-handoff.v1.sqlite'));
  assert.throws(
    () => prepareApi.prepareForwardBundle({ ...options, resume: true }),
    /terminal capture or exact owner release proof differs/,
  );
  assert.deepEqual(readFileSync(path.join(root, '.agent/work/session-handoff.v1.sqlite')), before);
  alter('restore');
}
prepareApi.prepareForwardBundle({ ...options, resume: true });
const op = parseAppliedPolicyOperation(
  readFileSync(path.join(root, '.agent/work/' + workId + '/documentation-policy-transition.v1.json')),
);
assert.equal(op.phase, 'applied');
assert.equal(op.maintenance_released, true);
assert.equal(op.plan.baseline_digest, baselineDigest);
assert.notEqual(
  String(
    (await import('node:fs')).statSync(path.join(root, 'docs/agent-instructions/documentation-policy.v1.json')).ino,
  ),
  policyInodeBefore,
);
const baselineBytes = readFileSync(path.join(root, op.plan.baseline_path));
const closeoutBytes = readFileSync(path.join(root, op.closeout.path));
const selectorBefore = readFileSync(path.join(root, '.agent/active-runtime-selector.v1.json'));
const journalBefore = readFileSync(path.join(root, '.agent/cutover/' + operationId + '/forward-journal.v1.jsonl'));
const operationBefore = readFileSync(
  path.join(root, '.agent/work/' + workId + '/documentation-policy-transition.v1.json'),
);
put(op.closeout.path, json({ ...parseForwardClearCheckpoint(closeoutBytes), policy_digest: '0'.repeat(64) }));
assert.throws(() => finalizeApi.finalizeForwardBundle(options), /documentation.*blocked/);
assert.deepEqual(readFileSync(path.join(root, '.agent/active-runtime-selector.v1.json')), selectorBefore);
assert.deepEqual(
  readFileSync(path.join(root, '.agent/work/' + workId + '/documentation-policy-transition.v1.json')),
  operationBefore,
);
assert.deepEqual(
  readFileSync(path.join(root, '.agent/cutover/' + operationId + '/forward-journal.v1.jsonl')),
  journalBefore,
);
put(op.closeout.path, closeoutBytes);
assert.equal(statusValue(finalizeApi.finalizeForwardBundle(options)), 'released');
// Exercise the exact installed public reader, including real committed ancestors.
const authorityApiValue: unknown = await import(pathToFileURL(path.join(root, 'vida-agent/bin/run.mjs')).href);
if (!isForwardAuthorityApi(authorityApiValue)) throw new Error('forward authority API is unavailable');
const authorityApi = authorityApiValue;
const readSelected = (): unknown => {
  const bytes = readFileSync(path.join(root, '.agent/active-runtime-selector.v1.json'));
  return authorityApi.forwardUpdateAuthority(
    root,
    parseRecord(bytes, 'active runtime selector'),
    sha(bytes),
    path.join(root, '.agent/cutover/' + operationId),
  );
};
assert.doesNotThrow(readSelected);
const scopePath = '.agent/work/' + workId + '/scope.json',
  scopeBytes = readFileSync(path.join(root, scopePath));
unlinkSync(path.join(root, scopePath));
assert.throws(readSelected, /Forward policy proof invalid/);
put(scopePath, scopeBytes);
const changedScope = parseRecord(scopeBytes, 'implementation scope');
if (
  !validateImplementationScope(changedScope) ||
  !Array.isArray(changedScope.documentation_paths) ||
  !changedScope.documentation_paths.every((item: unknown) => typeof item === 'string')
)
  throw new Error('implementation scope documentation_paths must be strings');
changedScope.documentation_paths = [...changedScope.documentation_paths, 'docs/unapproved.md'];
put(scopePath, json(changedScope));
assert.throws(readSelected, /Forward policy proof invalid/);
put(scopePath, scopeBytes);
assert.doesNotThrow(readSelected);
const operationPath = '.agent/work/' + workId + '/documentation-policy-transition.v1.json';
const appliedBytes = readFileSync(path.join(root, operationPath));
unlinkSync(path.join(root, operationPath));
assert.throws(readSelected, /Forward policy proof invalid/);
put(operationPath, appliedBytes);
const ancestorPolicyEvent = retainedEvents.find(
  (event) =>
    event.operation === 'finalize' && event.path_after === 'docs/agent-instructions/documentation-policy.v1.json',
);
if (!ancestorPolicyEvent) throw new Error('retained ancestor policy event is missing');
const ancestorPolicyEventId = requiredString(ancestorPolicyEvent, 'event_id', 'ancestor policy event');
const lineagePath = 'docs/agent-instructions/agent-instructions.changelog.jsonl',
  lineageBytes = readFileSync(path.join(root, lineagePath));
const lineageEvents = parseDocumentationEvents(lineageBytes.toString('utf8'));
put(
  lineagePath,
  Buffer.from(
    lineageEvents
      .filter((event) => event.event_id !== ancestorPolicyEventId)
      .map((event) => JSON.stringify(event) + '\n')
      .join(''),
    'utf8',
  ),
);
assert.throws(readSelected, /Forward policy proof invalid/);
put(lineagePath, lineageBytes);
const ancestorDirectory = '.agent/work/' + requiredString(ancestorPolicyEvent, 'work_id', 'ancestor policy event');
const ancestorCloseout = ancestorDirectory + '/documentation-closeout-0001.v1.json',
  ancestorBytes = readFileSync(path.join(root, ancestorCloseout));
const forgedAncestor = parseForwardClearCheckpoint(ancestorBytes);
forgedAncestor.policy_digest = '0'.repeat(64);
put(ancestorCloseout, json(forgedAncestor));
assert.throws(readSelected, /Forward policy proof invalid/);
put(ancestorCloseout, ancestorBytes);
assert.doesNotThrow(readSelected);

assert.deepEqual(readFileSync(path.join(root, op.plan.baseline_path)), baselineBytes);
assert.deepEqual(readFileSync(path.join(root, 'agent-runtime.config.v1.yaml')), yaml);
assert.deepEqual(readFileSync(path.join(root, 'AGENT.sidecar.md')), sidecar);
const journal = parseRecordLines(
  readFileSync(path.join(root, '.agent/cutover/' + operationId + '/forward-journal.v1.jsonl'), 'utf8'),
  'forward journal event',
);
assert.equal(journal.filter((event) => event.phase === 'documentation_closeout_verified').length, 1);
const report = {
  status: 'pass',
  fixture: root,
  real_fence_before_prefix: true,
  atomic_policy: true,
  same_baseline: true,
  prepare_finalize: true,
  prefix_interruption_recovered: true,
  stale_closeout_denied_without_journal_or_selector_mutation: true,
  installed_reader_ancestor_proof: true,
  missing_scope_denied: true,
  tampered_scope_denied: true,
  missing_leaf_operation_denied: true,
  missing_ancestor_event_denied: true,
  tampered_ancestor_clear_denied: true,
  native_calls: 0,
  runtime_acceptance: false,
  synthetic: 'TEST SETUP ONLY',
  completed_readonly_capture_replayed: captureEnabled,
};
writeFileSync(path.join(scratch, 'result.json'), json(report));
console.log(JSON.stringify(report));
