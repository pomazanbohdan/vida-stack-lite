import { beforeAll, test, expect } from 'bun:test';
import { createHash } from 'node:crypto';
import {
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Every receipt, pause and report in this file is TEST SETUP ONLY.
// No native call, owner approval or installed Runtime acceptance is asserted.
// Repeated imported-run brand failure remains an unresolved API/harness GAP.
// Each public command below instead uses its unmodified existing CLI in a fresh pinned Bun child.
const repository = path.resolve(process.env.VIDA_STALE_REPORT_REPOSITORY_ROOT ?? process.cwd());
const inputs = path.resolve(
  process.env.VIDA_STALE_REPORT_INPUTS ??
    path.join(repository, '.tmp/vida-quality-inventory-20260930/stale-report-inputs256'),
);
const payload = process.env.VIDA_STALE_REPORT_PAYLOAD_ROOT ?? path.join(inputs, 'correction-overlay-pure');
if (!path.isAbsolute(payload) || path.resolve(payload) !== payload)
  throw Error('absolute canonical VIDA_STALE_REPORT_PAYLOAD_ROOT required');
const scratch = path.resolve(
  process.env.VIDA_STALE_REPORT_FIXTURE_ROOT ??
    path.join(repository, '.tmp/vida-quality-inventory-20260930/stale-report-fixtures'),
);
const dependencyRoot = process.env.VIDA_STALE_REPORT_DEPENDENCY_ROOT;
const parent = path.resolve(
  process.env.VIDA_STALE_REPORT_PARENT_ROOT ??
    path.join(repository, '.tmp/vida-runtime-code-rebind-stage-20260929/parent'),
);
const preflightOnly = process.env.VIDA_STALE_REPORT_PREFLIGHT_ONLY === '1';
const importExperiment = process.env.VIDA_STALE_REPORT_IMPORT_EXPERIMENT === '1';
if (!scratch.startsWith(path.join(repository, '.tmp') + path.sep)) throw Error('private .tmp fixture root required');
mkdirSync(scratch, { recursive: true });

async function preflight() {
  if (!dependencyRoot || !path.isAbsolute(dependencyRoot) || path.resolve(dependencyRoot) !== dependencyRoot)
    throw Error('explicit absolute VIDA_STALE_REPORT_DEPENDENCY_ROOT required');
  const privatePrefix = path.join(realpathSync(repository), '.tmp') + path.sep;
  if (!realpathSync(dependencyRoot).startsWith(privatePrefix) || path.basename(dependencyRoot) !== 'vida-agent')
    throw Error('isolated dependency bundle must be a private .tmp/…/vida-agent directory');
  if (dependencyRoot.startsWith(payload + path.sep)) throw Error('dependencies must be outside sealed payload');
  for (const name of ['package.json', 'bun.lock', '.bun-version'])
    if (!readFileSync(path.join(dependencyRoot, name)).equals(readFileSync(path.join(payload, 'vida-agent', name))))
      throw Error(`dependency installation input differs from frozen candidate: ${name}`);
  const dependencies = path.join(dependencyRoot, 'node_modules');
  const realDependencies = realpathSync(dependencies);
  if (!realDependencies.startsWith(realpathSync(dependencyRoot) + path.sep))
    throw Error('dependency tree is not isolated');
  function checkLinks(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name),
        info = lstatSync(file);
      if (info.isSymbolicLink()) {
        if (!realpathSync(file).startsWith(realpathSync(dependencyRoot) + path.sep))
          throw Error('dependency link escapes private installation');
      } else if (info.isDirectory()) checkLinks(file);
    }
  }
  checkLinks(dependencies);
  // The stage ancestor supplies imports without adding anything to the sealed manifest tree.
  const ancestorDependencies = path.join(inputs, 'node_modules');
  try {
    if (realpathSync(ancestorDependencies) !== realDependencies)
      throw Error('existing stage dependency link differs; preserve it and use a fresh input directory');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    symlinkSync(dependencies, ancestorDependencies, process.platform === 'win32' ? 'junction' : 'dir');
  }
  for (const name of ['forward-policy-transition-integration.test.mjs', 'combined-public-steps.mjs'])
    readFileSync(path.join(inputs, name));
  const { verifyStagedPayloadManifest, assertGeneratedRootAgents } = await import(
    pathToFileURL(path.join(inputs, 'controllers/forward-update-plan.mjs')).href
  );
  for (const name of ['forward-update-prepare.mjs', 'forward-update-finalize.mjs', 'forward-payload-runtime.mjs'])
    await import(pathToFileURL(path.join(inputs, 'controllers', name)).href);
  const manifestName = 'vida-agent-payload.manifest.v1.json';
  const binding = (directory) =>
    createHash('sha256')
      .update(readFileSync(path.join(directory, manifestName)))
      .digest('hex');
  const selectedManifest = verifyStagedPayloadManifest(payload, binding(payload));
  verifyStagedPayloadManifest(parent, binding(parent));
  // TEST SETUP preflight mirrors the selected successor's same-byte provenance
  // contract. Parent repair-base preimages are not selected-source authority.
  for (const [relative, entry] of selectedManifest.files) {
    if (
      relative !== 'AGENTS.md' &&
      entry.source_path !== undefined &&
      (entry.source_path !== relative || entry.source_sha256 !== entry.sha256)
    )
      throw Error('Selected source provenance differs: ' + relative);
  }
  const agents = selectedManifest.files.get('AGENTS.md');
  const template = selectedManifest.files.get('vida-agent/templates/AGENTS.template.md');
  if (
    !agents ||
    !template ||
    agents.source_path !== 'vida-agent/templates/AGENTS.template.md' ||
    agents.source_sha256 !== template.sha256
  )
    throw Error('Generated root AGENTS provenance differs');
  assertGeneratedRootAgents(payload);
  const frozenManifest = JSON.parse(readFileSync(path.join(payload, manifestName)));
  let verifiedExperimentDelta = false;
  for (const entry of frozenManifest.files.filter((entry) => entry.path.startsWith('vida-agent/'))) {
    const relative = entry.path.slice('vida-agent/'.length);
    const selectedBytes = readFileSync(path.join(payload, entry.path));
    const baselineBytes = readFileSync(path.join(dependencyRoot, relative));
    if (selectedBytes.equals(baselineBytes)) continue;
    if (importExperiment && relative === 'bin/run.mjs') {
      let replacements = 0;
      const restored = selectedBytes
        .toString('utf8')
        .replace(
          /(await\s+import\s*\(\s*(['"])\.\.\/src\/config\/runtime-config)\.js(\2\s*\))/g,
          (_match, prefix, _quote, suffix) => {
            replacements++;
            return prefix + '.ts' + suffix;
          },
        );
      if (replacements === 1 && Buffer.from(restored, 'utf8').equals(baselineBytes)) {
        verifiedExperimentDelta = true;
        continue;
      }
    }
    throw Error('external dependency bundle differs from frozen candidate: ' + relative);
  }
  if (importExperiment && !verifiedExperimentDelta)
    throw Error('exact one-import TEST SETUP experiment delta required');
  const provenance = path.join(inputs, 'provenance');
  for (const name of [
    '.agent/active-runtime-selector.v1.json',
    '.agent/runtime-initialization.v1.json',
    'docs/agent-instructions/decisions/index.md',
  ])
    readFileSync(path.join(provenance, name));
  const events = readFileSync(
    path.join(provenance, 'docs/agent-instructions/agent-instructions.changelog.jsonl'),
    'utf8',
  )
    .trim()
    .split('\n')
    .map(JSON.parse);
  const policyEvents = events.filter(
    (event) =>
      event.operation === 'finalize' && event.path_after === 'docs/agent-instructions/documentation-policy.v1.json',
  );
  if (!policyEvents.length) throw Error('genuine retained ancestor policy event required');
  for (const event of policyEvents) {
    const directory = path.join(provenance, '.agent/work', event.work_id);
    for (const name of ['documentation-baseline-0001.v1.json', 'documentation-closeout-0001.v1.json'])
      JSON.parse(readFileSync(path.join(directory, name)));
  }
  const selector = JSON.parse(readFileSync(path.join(provenance, '.agent/active-runtime-selector.v1.json')));
  readFileSync(path.join(provenance, '.agent/cutover', selector.generation, 'cutoff-witness.json'));
  const probe = `import path from 'node:path'; import {realpathSync} from 'node:fs';
const root=process.cwd(),pkg=await Bun.file(path.join(root,'package.json')).json();
// Probe Cedar's actual production entry; its package-root ESM/WASM entry is not consumed here.
const directImports=Object.keys(pkg.dependencies).map(name=>name==='@cedar-policy/cedar-wasm'?name+'/nodejs':name);
for(const name of [...directImports, '@babel/parser', '@mastra/core/workflows', '@mastra/core/mastra', '@openclaw/fs-safe/advanced', '@openclaw/fs-safe/file-lock', 'ajv/dist/2020.js']) {
 const resolved=Bun.resolveSync(name,root); if(!realpathSync(resolved).startsWith(realpathSync(root)+path.sep)) throw Error('module escaped isolated install: '+name);
 const module=await import(name); if(!Object.keys(module).length) throw Error('empty module exports: '+name);
}
const workflows=await import('@mastra/core/workflows'),mastra=await import('@mastra/core/mastra'),storage=await import('@mastra/libsql');
if(typeof workflows.createWorkflow!=='function'||typeof workflows.createStep!=='function'||typeof workflows.createWorkflowStateReader!=='function'||typeof mastra.Mastra!=='function'||typeof storage.LibSQLStore!=='function') throw Error('required Mastra exports missing');
const safe=await import('@openclaw/fs-safe'),advanced=await import('@openclaw/fs-safe/advanced'),locks=await import('@openclaw/fs-safe/file-lock');
if(typeof safe.root!=='function'||typeof advanced.assertNoSymlinkParentsSync!=='function'||typeof advanced.openRootFileSync!=='function'||typeof advanced.sameFileIdentity!=='function'||typeof locks.withFileLock!=='function') throw Error('required filesystem safety exports missing');
const cedar=await import('@cedar-policy/cedar-wasm/nodejs');
for(const name of ['checkParsePolicySet','checkParseSchema','isAuthorized','validate']) if(typeof cedar[name]!=='function') throw Error('required production Cedar export missing: '+name);
console.log(JSON.stringify({status:'pass',complete_dependency_imports:true}));`;
  const probeResult = spawnSync(process.execPath, ['-e', probe], {
    cwd: dependencyRoot,
    env: { ...process.env, TEMP: scratch, TMP: scratch },
    encoding: 'utf8',
    windowsHide: true,
    timeout: 30000,
  });
  if (probeResult.error || probeResult.status !== 0)
    throw Error('actual Bun dependency preflight failed: ' + probeResult.stderr);
  if (JSON.parse(probeResult.stdout.trim()).status !== 'pass') throw Error('dependency preflight did not pass');
  const { loadForwardPayloadRuntime } = await import(
    pathToFileURL(path.join(inputs, 'controllers/forward-payload-runtime.mjs')).href
  );
  await loadForwardPayloadRuntime(path.dirname(dependencyRoot), payload, binding(payload));
}

if (preflightOnly) test('complete private fixture and dependency preflight', preflight, 60000);
else beforeAll(preflight, 60000);

function selectedFixture(label) {
  const directory = mkdtempSync(path.join(scratch, label + '-'));
  // TEST SETUP cache conditioning: fresh per fixture, warm within that fixture.
  // Preserve the cache and outputs; this is not a measured speed improvement.
  const transpilerCache = path.join(directory, 'bun-transpiler-cache');
  mkdirSync(transpilerCache);
  const maintained = readFileSync(
    path.join(inputs, 'forward-policy-transition-integration.test.mjs'),
    'utf8',
  ).replaceAll('\r\n', '\n');
  // Reuse the frozen maintained real parent/selector/cutover constructor and controllers.
  const source = maintained
    .replace(
      "const stage = path.join(repo,'.tmp/vida-project-config-rebind-20260929');",
      `const stage = ${JSON.stringify(inputs)};`,
    )
    .replace(
      'const parent = path.join(repo',
      `const provenance = ${JSON.stringify(path.join(inputs, 'provenance'))};\nconst parent = path.join(repo`,
    )
    .replace("path.join(repo,'.tmp/vida-runtime-code-rebind-stage-20260929/parent')", JSON.stringify(parent))
    .replace("path.join(stage,'correction-overlay')", JSON.stringify(payload))
    .replace('symlinkSync, writeFileSync }', 'symlinkSync, writeFileSync, readdirSync }')
    .replaceAll('path.join(repo,file)', 'path.join(provenance,file)')
    .replace(
      "cpSync(path.join(repo,'.agent/cutover'),path.join(root,'.agent/cutover'),{recursive:true});",
      `
cpSync(path.join(provenance,'.agent/cutover'),path.join(root,'.agent/cutover'),{recursive:true});
// TEST SETUP provenance: genuine retained ancestor events and bounded current-v1 checkpoints.
const retainedEvents=readFileSync(path.join(provenance,'docs/agent-instructions/agent-instructions.changelog.jsonl'),'utf8').trim().split('\\n').map(JSON.parse);
for(const work of new Set(retainedEvents.filter(event=>event.operation==='finalize'&&event.path_after==='docs/agent-instructions/documentation-policy.v1.json').map(event=>event.work_id))) {
 const directory='.agent/work/'+work;
 for(const name of readdirSync(path.join(provenance,directory)).filter(name=>/^documentation-(baseline|closeout)-[0-9]{4}\\.v1\\.json$/.test(name)))
  put(directory+'/'+name,readFileSync(path.join(provenance,directory,name)));
}`,
    )
    .replace(
      "const scratchRoot = path.resolve(process.env.VIDA_POLICY_FORWARD_FIXTURE_ROOT ?? path.join(stage,'policy-forward-fixtures'));",
      `const scratchRoot = ${JSON.stringify(directory)};`,
    )
    .replace('import {writeFileSync,mkdirSync}', 'import {writeFileSync,mkdirSync,readFileSync}')
    .replace(
      "console.log(JSON.stringify({status:'setup',synthetic:'TEST SETUP ONLY'}));",
      `
const receiptFile=path.join(root,'.agent/runtime-initialization.v1.json'),receipt=JSON.parse(readFileSync(receiptFile));
receipt.workspace_id=deriveWorkspaceId(config.repository.repository_id,root);receipt.workspace_binding_status='bound';
writeFileSync(receiptFile,JSON.stringify(receipt,null,2)+'\\\\n');
console.log(JSON.stringify({status:'setup',synthetic:'TEST SETUP ONLY'}));`,
    )
    .replace("path.join(repo,'vida-agent/node_modules')", JSON.stringify(path.join(dependencyRoot, 'node_modules')));
  const isolatedSource = source.replaceAll(
    "path.join(repo,'vida-agent/bin/bun.mjs')",
    JSON.stringify(path.join(dependencyRoot, 'bin/bun.mjs')),
  );
  const script = path.join(directory, 'selected-fixture.mjs');
  writeFileSync(script, isolatedSource);
  const result = spawnSync('node', [script], {
    cwd: repository,
    encoding: 'utf8',
    windowsHide: true,
    timeout: 180000,
    env: {
      ...process.env,
      BUN_RUNTIME_TRANSPILER_CACHE_PATH: transpilerCache,
      VIDA_POLICY_FORWARD_REPOSITORY_ROOT: repository,
      TEMP: directory,
      TMP: directory,
      NODE_PATH: path.join(dependencyRoot, 'node_modules'),
    },
  });
  expect(result.status, result.stdout + result.stderr).toBe(0);
  const outcome = JSON.parse(result.stdout.trim().split('\n').at(-1));
  expect(outcome.status).toBe('pass');
  expect(outcome.native_calls).toBe(0);
  return { directory, root: outcome.fixture, transpilerCache };
}

function publicSteps(mode) {
  const maintained = readFileSync(path.join(inputs, 'combined-public-steps.mjs'), 'utf8').replaceAll('\r\n', '\n');
  const factory = maintained
    .slice(0, maintained.indexOf("const oldArgs = task('fixture-old-settings');"))
    .replace("const { run } = await import(source('bin/run.mjs'));\n", '')
    .replace("const { runReconcileArtifacts } = await import(source('bin/reconcile-artifacts.mjs'));\n", '')
    .replace(
      "initial.workspace_id = deriveWorkspaceId(oldConfig.repository.repository_id, root);\ninitial.workspace_binding_status = 'bound';\nwriteFileSync(path.join(root,'.agent/runtime-initialization.v1.json'), record(initial));",
      '',
    )
    .replace('function task(workId) {', "function task(workId, workflow = 'task_execution') {")
    .replace("canonical_kind:'task',intent:'task_execution'", "canonical_kind:'task',intent:workflow")
    .replace("'--intent','task_execution','--workflow','task_execution'", "'--intent',workflow,'--workflow',workflow");
  const pause = maintained
    .slice(maintained.indexOf('const project = loadProjectSetContext'), maintained.indexOf('const pausedLedger='))
    .replaceAll("'fixture-old-settings'", 'workId');
  return (
    factory +
    `
const { Database } = await import('bun:sqlite');
const { spawnSync } = await import('node:child_process');
assert.ok(typeof Bun !== 'undefined','generated command driver requires pinned Bun');
let commandIndex=0;
async function publicCommand(entry,args) {
 const result=spawnSync(process.execPath,[path.join(root,'vida-agent/bin',entry),...args],{
  cwd:path.join(root,'vida-agent'),env:{...process.env},encoding:'utf8',windowsHide:true,timeout:120000,
 });
 assert.equal(result.error,undefined,'public command spawn failed');
 const transcript={entry,args,exit_code:result.status,stdout:result.stdout,stderr:result.stderr,synthetic:'TEST SETUP ONLY'};
 writeFileSync(path.join(path.dirname(process.argv[1]),'public-command-'+String(++commandIndex).padStart(2,'0')+'.json'),record(transcript));
 if(result.status!==0) {
  assert.equal(result.status,1,'unexpected public command exit');
  assert.equal(result.stdout.trim(),'','blocked command emitted success stdout');
  const failure=JSON.parse(result.stderr.trim());
  assert.equal(failure.status,'blocked');assert.equal(typeof failure.message,'string');
  throw Object.assign(new Error(failure.message),{public_result:failure,public_exit_code:result.status});
 }
 // Parse the complete stdout; extra lines or non-JSON output invalidate the command evidence.
 const outcome=JSON.parse(result.stdout.trim());
 assert.ok(outcome && typeof outcome==='object' && !Array.isArray(outcome));
 return outcome;
}
const run=args=>publicCommand('run.mjs',args);
const runReconcileArtifacts=args=>publicCommand('reconcile-artifacts.mjs',args);
const mode = ${JSON.stringify(mode)}, workId = 'fixture-' + mode;
const workflow = mode === 'research-denial' ? 'implementation_change' : 'task_execution';
const args = task(workId, workflow), continuing = args.slice(0,-2);
const expected = version => ['--expected-revision',String(version.revision),'--expected-digest',version.digest];
const prepared = await run(args,false);
const issued = await run([...continuing,...expected(prepared.state_version),'--issue-wave','true'],false);
assert.ok(issued.issued_actions.length > 0);
const original = issued.issued_actions[0];
assert.equal(original.request.workflow_id,workflow);
assert.equal(original.request.stage_id,mode === 'research-denial' ? 'research_parallel' : 'synthesize_task');
assert.equal(original.request.config_digest,runtimeConfigDigest(oldConfig));
const originalJournal = openConfiguredMastraSessionLedger(root,oldConfig);
let issueBeforePause;
try {
 issueBeforePause = originalJournal.resume(workId,1);
 assert.deepEqual(issueBeforePause.version,issued.state_version);
 assert.ok(issueBeforePause.state.items.every(item=>item.issue_id && item.observation === null));
 if(mode === 'research-denial') assert.ok(issueBeforePause.state.items.every(item=>item.research_activation));
 else assert.ok(issueBeforePause.state.items.every(item=>item.research_activation === undefined && item.host_reservation === undefined));
} finally { originalJournal.close(); }
${pause}
const paused = openConfiguredMastraSessionLedger(root,oldConfig);
try { assert.deepEqual(paused.resume(workId,1),issueBeforePause); } finally { paused.close(); }
const databaseFile=path.join(root,'.agent/work/session-handoff.v1.sqlite');
function snapshot() {
 const db=new Database(databaseFile,{readonly:true});
 try {
  const tables=db.query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
  return tables.map(({name})=>({name,rows:db.query('SELECT * FROM "'+name.replaceAll('"','""')+'"').all().map(row=>JSON.stringify(row)).sort()}));
 } finally { db.close(); }
}
const yamlPath=path.join(root,'agent-runtime.config.v1.yaml'),oldYaml=readFileSync(yamlPath,'utf8');
const target=oldYaml.replace(/(    executor:\\r?\\n      model: )[^\\r\\n]+(\\r?\\n      reasoning: )[^\\r\\n]+/,'$1gpt-6.1-sol$2medium');
assert.notEqual(target,oldYaml);
writeFileSync(path.join(root,'proposed.yaml'),target);
const repair=mode=>['--kind','runtime-config','--mode',mode,'--project-root',root,'--repair-id','fixture-profile-rebind',
 ...(['inspect','plan'].includes(mode)?['--actor','fixture-owner','--timestamp',new Date().toISOString(),'--instruction-ref','TEST SETUP ONLY','--target-config','proposed.yaml']:[])];
if(mode === 'research-denial') {
 const before=snapshot();
 await assert.rejects(()=>runReconcileArtifacts(repair('inspect')),/issued native outcome is pending.unknown.*original journal authority invalid/);
 assert.deepEqual(snapshot(),before);
 const journal=openConfiguredMastraSessionLedger(root,oldConfig);
 try { assert.deepEqual(journal.resume(workId,1),issueBeforePause); } finally { journal.close(); }
 console.log(JSON.stringify({status:'pass',mode,preserved_activated_unknown:true,native_calls:0,synthetic:'TEST SETUP ONLY'}));
} else {
 const oldReceipt=JSON.parse(readFileSync(path.join(root,'.agent/runtime-initialization.v1.json')));
 assert.equal((await runReconcileArtifacts(repair('inspect'))).status,'inspect_ready_unauthorized');
 assert.equal((await runReconcileArtifacts(repair('plan'))).status,'planned');
 assert.equal((await runReconcileArtifacts(repair('apply'))).status,'author_config_required');
 // TEST SETUP fixture owner authors the planned current YAML; the command never writes it.
 writeFileSync(yamlPath,target);
 assert.equal((await runReconcileArtifacts(repair('resume'))).status,'applied');
 const config=loadRuntimeConfig(root); assert.notEqual(runtimeConfigDigest(config),runtimeConfigDigest(oldConfig));
 const currentReceipt=JSON.parse(readFileSync(path.join(root,'.agent/runtime-initialization.v1.json')));
 assert.deepEqual(currentReceipt,{...oldReceipt,config_digest:runtimeConfigDigest(config)});
 const observation=item=>({schema:'VidaSessionObservation/v1',action_id:item.request.action_id,issue_id:item.issue_id,
  agent_id:'fixture-test-agent',tool_call_ref:'TEST SETUP ONLY '+item.request.action_id,status:'reported_complete',
  summary:'TEST SETUP ONLY: research-free task synthesis fixture',
  output_digest:canonicalJsonDigest('TEST SETUP ONLY: research-free task synthesis fixture'),evidence_refs:['TEST SETUP ONLY']});
 const reportFile=path.join(root,'.agent/work/'+workId+'/report.json');
 writeFileSync(reportFile,record(observation(original)));
 const before=snapshot();
 const reportArgs=[...continuing,...expected(issued.state_version),'--report',reportFile];
 await assert.rejects(()=>run(reportArgs,false),error=>{
  assert.equal(error.public_exit_code,1);
  assert.equal(error.public_result.schema,'VidaAgentRunResult/v1');
  assert.equal(error.public_result.status,'blocked');
  assert.equal(error.public_result.code,'GAP-VIDA-RUN-EXECUTION-001');
  assert.equal(error.public_result.message,'The requested run was blocked by runtime validation.');
  return true;
 });
 assert.deepEqual(snapshot(),before);
 // Separate TEST SETUP diagnostic: one imported run call in a fresh child on exactly the same report.
 // The supported public CLI deliberately sanitizes its message; this diagnostic supplies cause evidence.
 const diagnosticFile=path.join(path.dirname(process.argv[1]),'internal-stale-report-diagnostic.mjs');
 const diagnosticSource=[
  "import path from 'node:path';",
  "import {pathToFileURL} from 'node:url';",
  "const root=process.argv[2],args=JSON.parse(process.argv[3]);",
  "const {run}=await import(pathToFileURL(path.join(root,'vida-agent/bin/run.mjs')).href);",
  "try { await run(args,false); console.log(JSON.stringify({status:'unexpected_success',synthetic:'TEST SETUP ONLY'})); process.exitCode=2; } catch(error) { console.log(JSON.stringify({status:'blocked',message:error.message,synthetic:'TEST SETUP ONLY'})); process.exitCode=1; }",
 ].join('\\n');
 writeFileSync(diagnosticFile,diagnosticSource);
 const diagnostic=spawnSync(process.execPath,[diagnosticFile,root,JSON.stringify(reportArgs)],{
  cwd:path.join(root,'vida-agent'),env:{...process.env},encoding:'utf8',windowsHide:true,timeout:120000,
 });
 writeFileSync(path.join(path.dirname(process.argv[1]),'internal-stale-report-diagnostic.json'),record({
  exit_code:diagnostic.status,stdout:diagnostic.stdout,stderr:diagnostic.stderr,synthetic:'TEST SETUP ONLY',
 }));
 assert.equal(diagnostic.error,undefined);
 assert.equal(diagnostic.status,1);
 const diagnosed=JSON.parse(diagnostic.stdout.trim());
 assert.equal(diagnosed.status,'blocked');
 assert.equal(diagnosed.message,'Mastra run binding differs from current context');
 assert.deepEqual(snapshot(),before);
 const retained=openConfiguredMastraSessionLedger(root,config);
 try { assert.deepEqual(retained.resume(workId,1),issueBeforePause); } finally { retained.close(); }
 // Same schema-valid report through a freshly admitted current public task is the control.
 const freshArgs=task('fixture-current-control'),freshContinuing=freshArgs.slice(0,-2);
 const freshPrepared=await run(freshArgs,false);
 const freshIssued=await run([...freshContinuing,...expected(freshPrepared.state_version),'--issue-wave','true'],false);
 assert.equal(freshIssued.issued_actions[0].request.stage_id,'synthesize_task');
 const freshReport=path.join(root,'.agent/work/fixture-current-control/report.json');
 writeFileSync(freshReport,record(observation(freshIssued.issued_actions[0])));
 const accepted=await run([...freshContinuing,...expected(freshIssued.state_version),'--report',freshReport],false);
 assert.ok(accepted);
 const current=openConfiguredMastraSessionLedger(root,config);
 try {
  const journal=current.resume('fixture-current-control',1);
  assert.ok(journal.state.completed.some(wave=>wave.items.some(item=>item.issue_id===freshIssued.issued_actions[0].issue_id && item.observation?.status==='reported_complete')));
 } finally { current.close(); }
 console.log(JSON.stringify({status:'pass',mode,stale_public_report_denied:true,current_public_report_accepted:true,unchanged_database_rows:true,native_calls:0,synthetic:'TEST SETUP ONLY'}));
}
`
  );
}

for (const mode of preflightOnly ? [] : ['research-denial', 'stale-report']) {
  test(`public config rebind ${mode} preserves original issued evidence`, () => {
    const fixture = selectedFixture(mode);
    const script = path.join(fixture.directory, 'public-steps.mjs');
    writeFileSync(script, publicSteps(mode));
    const result = spawnSync('node', [path.join(dependencyRoot, 'bin/bun.mjs'), script, fixture.root], {
      cwd: repository,
      encoding: 'utf8',
      windowsHide: true,
      timeout: 180000,
      env: {
        ...process.env,
        BUN_RUNTIME_TRANSPILER_CACHE_PATH: fixture.transpilerCache,
        TEMP: fixture.directory,
        TMP: fixture.directory,
      },
    });
    writeFileSync(path.join(fixture.directory, 'public-steps.log'), result.stdout + result.stderr);
    expect(result.status, result.stdout + result.stderr).toBe(0);
    const outcome = JSON.parse(result.stdout.trim().split('\n').at(-1));
    expect(outcome.status).toBe('pass');
    expect(outcome.native_calls).toBe(0);
    if (mode === 'stale-report') expect(outcome.current_public_report_accepted).toBe(true);
  }, 360000);
}
