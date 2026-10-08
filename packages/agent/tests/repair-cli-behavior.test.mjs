import { afterEach, expect, test as baseTest } from 'bun:test';
import { Database } from 'bun:sqlite';
import { createHash, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runReconcileArtifacts as executeReconcileArtifacts } from '../bin/reconcile-artifacts.mjs';
import { boundedSpawnSync, executionBudget, commandOutcomeUnknown, requireTerminalCommand } from '../bin/bun.mjs';
import { canonicalJson, canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import { loadRuntimeConfig, runtimeConfigDigest } from '../src/config/runtime-config.ts';
import { loadProjectSetContext } from '../src/config/project-context.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { snapshotDeclaredSources } from '../src/orchestration/scoped-source-snapshot.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';
import { HostStateStore, openHostStateDatabase } from '../src/host-state.ts';

const bundle = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repository = path.resolve(bundle, '../..');
const timestamp = new Date(Date.now() - 60_000).toISOString();
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const sha = (value) => createHash('sha256').update(value).digest('hex');
const sealed = (body) => ({ ...body, digest: canonicalJsonDigest(body) });
const roots = [];
const databases = [];
const phaseBudget = executionBudget(undefined, 1_000);
let repairOutcomeUnknown = false;
let caseName;
function report(stage, started, detail = {}) {
  process.stderr.write(
    JSON.stringify({ stage, case: caseName, elapsed_ms: performance.now() - started, ...detail }) + '\n',
  );
}
function test(name, execute) {
  return baseTest(
    name,
    async () => {
      if (repairOutcomeUnknown) throw Error('Prior repair child outcome prevents fixture reuse.');
      caseName = name;
      const started = performance.now();
      try {
        return await execute(phaseBudget.child(5_000, 250));
      } finally {
        report('repair case', started, { outcome_unknown: repairOutcomeUnknown });
      }
    },
    5_000,
  );
}
async function runReconcileArtifacts(args, options) {
  const started = performance.now();
  try {
    return await executeReconcileArtifacts(args, options);
  } finally {
    report('repair operation', started, {
      kind: args.includes('--kind') ? args[args.indexOf('--kind') + 1] : 'research-identity',
      mode: args[args.indexOf('--mode') + 1],
    });
  }
}
afterEach(() => {
  const started = performance.now();
  if (repairOutcomeUnknown) {
    report('repair fixture retained', started, { roots: roots.length, databases: databases.length });
    return;
  }
  for (const database of databases.splice(0)) database.close();
  report('repair databases closed', started);
  const cleanup = performance.now();
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
  report('repair fixture cleanup', cleanup);
});

function fixture() {
  if (repairOutcomeUnknown) throw Error('Prior repair child outcome prevents fixture reuse.');
  const started = performance.now();
  const root = mkdtempSync(path.join(tmpdir(), 'vida-repair-cli-'));
  roots.push(root);
  mkdirSync(path.join(root, '.git'));
  const copiedBundle = path.join(root, 'packages/agent');
  for (const relative of ['agent-runtime.config.v1.yaml', 'AGENTS.md', 'AGENT.sidecar.md'])
    writeFileSync(path.join(root, relative), readFileSync(path.join(repository, relative)));
  cpSync(bundle, copiedBundle, {
    recursive: true,
    // Source repair runs physical JS/TS; native assets have their own qualification fixtures.
    filter: (entry) =>
      entry !== path.join(bundle, 'dist', 'standalone') &&
      !['node_modules', '.tmp', '.agent', 'coverage', '.pack-inspect'].includes(path.basename(entry)),
  });
  symlinkSync(path.join(bundle, 'node_modules'), path.join(copiedBundle, 'node_modules'), 'junction');
  cpSync(path.join(repository, 'packages/plugin'), path.join(root, 'packages/plugin'), { recursive: true });
  cpSync(path.join(repository, 'docs'), path.join(root, 'docs'), { recursive: true });
  const config = loadRuntimeConfig(root);
  const records = config.research_decision.paths.research_records;
  const changelog = config.research_decision.paths.changelog;
  mkdirSync(path.join(root, records), { recursive: true });
  mkdirSync(path.dirname(path.join(root, changelog)), { recursive: true });
  writeFileSync(path.join(root, changelog), '\n');
  mkdirSync(path.join(root, '.agent/work'), { recursive: true });
  writeFileSync(
    path.join(root, '.agent/active-runtime-selector.v1.json'),
    json({
      schema: 'ActiveRuntimeSelector/v1',
      generation: 'test-setup',
      payload_manifest_sha256: 'a'.repeat(64),
    }),
  );
  const workspace = deriveWorkspaceId(config.repository.repository_id, root);
  const source = snapshotDeclaredSources(requireSafeRepositoryAccess(root), ['packages/agent/TESTING.md']);
  report('repair fresh fixture', started);
  return { root, config, records, changelog, workspace, source };
}

const activation = {
  use_id: 'use-repair',
  risk: 'medium',
  phase: 'trace',
  lane: 'researcher',
  trigger: 'research_intent',
  required_instruction_ids: [],
  instruction_ids: ['research-protocol'],
  registry_digest: 'b'.repeat(64),
  source_digests: [{ instruction_id: 'research-protocol', source_sha256: 'c'.repeat(64) }],
};
const completeness = {
  status: 'pass',
  required_questions: ['Which source?'],
  answered_questions: ['Which source?'],
  missing_questions: [],
  material_gaps: [],
  external_validation: {
    required: false,
    source_count: 0,
    minimum_sources: 0,
    status: 'not_required',
    live_check: null,
  },
};
function research(context, id, locator) {
  return sealed({
    schema: 'ResearchResult/v1',
    result_id: id,
    work_item_id: 'work-repair',
    source_revision: context.source.digest,
    scope_id: 'scope-repair',
    contour: 'scope-repair',
    topic: 'Source identity',
    objective: 'Resolve exact source provenance',
    question: 'Which source?',
    source_refs: [
      {
        source_id: 'shared',
        source_kind: 'internal',
        locator,
        title: 'Current source',
        version_or_date: '2026-09-30',
        claim: 'AC-1 SR-1 evidence.',
        retrieved_at: timestamp,
        independence_group: locator,
        digest: 'd'.repeat(64),
      },
    ],
    findings: [
      {
        finding_id: 'finding-1',
        statement: 'Current evidence.',
        source_ids: ['shared'],
        evidence_class: 'Static',
        status: 'confirmed',
      },
    ],
    uncertainties: [],
    conflicts: [],
    evidence_classes: ['Static'],
    br_ids: ['BR-1'],
    sr_ids: ['SR-1'],
    ac_ids: ['AC-1'],
    gap_ids: [],
    options: [
      { option_id: 'option-1', label: 'Use source', description: 'Use scoped evidence.', evidence_refs: ['shared'] },
    ],
    recommendation: { option_id: 'option-1', rationale: 'Current evidence.', evidence_refs: ['shared'] },
    completeness,
    readiness: 'ready',
    instruction_activation: activation,
    actor: 'test-setup',
    pointer: 'TEST-SETUP',
    created_at: timestamp,
    updated_at: timestamp,
  });
}
function writeResearch(context, results) {
  return results.map((result) => {
    const relative = `${context.records}/${result.result_id}.research.json`;
    writeFileSync(path.join(context.root, relative), json(result));
    return relative;
  });
}
const planning = (context, mode, extra = []) => [
  '--mode',
  mode,
  '--project-root',
  context.root,
  '--repair-id',
  'repair-test',
  '--actor',
  'test-setup',
  '--timestamp',
  timestamp,
  ...extra,
];

test('research identity dispatcher plans exact rewrites and rejects dependencies without overwriting records', async () => {
  const context = fixture();
  const results = [research(context, 'research-a', 'source-a.md'), research(context, 'research-b', 'source-b.md')];
  const paths = writeResearch(context, results);
  const recordsFile = path.join(context.root, 'records.json');
  writeFileSync(recordsFile, json(paths));
  const inspected = await runReconcileArtifacts(planning(context, 'inspect', ['--records', recordsFile]));
  expect(inspected.status).toBe('repairable_current_v1');
  expect(inspected.changed_paths).toEqual(paths);
  expect(inspected.historical_observations_changed).toBe(false);
  expect(await runReconcileArtifacts(planning(context, 'plan', ['--records', recordsFile]))).toMatchObject({
    status: 'planned',
  });
  const plan = JSON.parse(readFileSync(path.join(context.root, '.agent/work/repair-test/repair-plan.v1.json'), 'utf8'));
  const newIds = plan.changes.map((change) => change.new_source_id);
  expect(new Set(newIds).size).toBe(2);
  for (const change of plan.changes) {
    const transformed = JSON.parse(change.after);
    expect(transformed.source_refs[0].source_id).toBe(change.new_source_id);
    expect(transformed.findings[0].source_ids).toEqual([change.new_source_id]);
    expect(transformed.options[0].evidence_refs).toEqual([change.new_source_id]);
    expect(transformed.recommendation.evidence_refs).toEqual([change.new_source_id]);
  }
  const before = paths.map((relative) => readFileSync(path.join(context.root, relative), 'utf8'));
  const dependent = synthesis(context, results);
  writeFileSync(path.join(context.root, `${context.records}/dependent.synthesis.json`), json(dependent));
  await Promise.resolve(expect(runReconcileArtifacts(planning(context, 'inspect', ['--records', recordsFile]))).rejects.toThrow(
    'dependent synthesis',
  ));
  expect(paths.map((relative) => readFileSync(path.join(context.root, relative), 'utf8'))).toEqual(before);
  expect(readFileSync(path.join(context.root, context.changelog), 'utf8')).toBe('\n');
});

test('research identity dispatcher fails closed on third-party post-plan bytes', async () => {
  const context = fixture();
  const results = [research(context, 'research-a', 'source-a.md'), research(context, 'research-b', 'source-b.md')];
  const paths = writeResearch(context, results);
  const recordsFile = path.join(context.root, 'records.json');
  writeFileSync(recordsFile, json(paths));
  await runReconcileArtifacts(planning(context, 'plan', ['--records', recordsFile]));
  const beforeSecond = readFileSync(path.join(context.root, paths[1]), 'utf8');
  writeFileSync(path.join(context.root, paths[0]), 'third-party bytes\n');
  await Promise.resolve(expect(
    runReconcileArtifacts(['--mode', 'apply', '--project-root', context.root, '--repair-id', 'repair-test']),
  ).rejects.toThrow('third-party bytes'));
  expect(readFileSync(path.join(context.root, paths[0]), 'utf8')).toBe('third-party bytes\n');
  expect(readFileSync(path.join(context.root, paths[1]), 'utf8')).toBe(beforeSecond);
  expect(readFileSync(path.join(context.root, context.changelog), 'utf8')).toBe('\n');
});

test('research identity dispatcher publishes both transformed records and exactly two lineage events', async () => {
  const context = fixture();
  const results = [research(context, 'research-a', 'source-a.md'), research(context, 'research-b', 'source-b.md')];
  const paths = writeResearch(context, results);
  const recordsFile = path.join(context.root, 'records.json');
  writeFileSync(recordsFile, json(paths));
  await runReconcileArtifacts(planning(context, 'plan', ['--records', recordsFile]));
  const plan = JSON.parse(readFileSync(path.join(context.root, '.agent/work/repair-test/repair-plan.v1.json'), 'utf8'));
  const result = await runReconcileArtifacts([
    '--mode',
    'apply',
    '--project-root',
    context.root,
    '--repair-id',
    'repair-test',
  ]);
  expect(result.status).toBe('complete');
  for (const change of plan.changes) {
    expect(readFileSync(path.join(context.root, change.path), 'utf8')).toBe(change.after);
    expect(JSON.parse(change.after).findings[0].source_ids).toEqual([change.new_source_id]);
  }
  const events = readFileSync(path.join(context.root, context.changelog), 'utf8').trim().split('\n').map(JSON.parse);
  expect(events.map((event) => event.document_id)).toEqual(results.map((record) => record.result_id));
  expect(events.every((event) => event.schema === 'DocumentationChangeEvent/v1')).toBe(true);
});

function synthesis(context, results) {
  return sealed({
    schema: 'ResearchSynthesis/v1',
    bundle_id: 'synthesis-test',
    work_item_id: 'work-repair',
    source_revision: context.source.digest,
    scope_id: 'scope-repair',
    topic: 'Source provenance',
    result_refs: results.map(({ result_id, digest }) => ({ result_id, digest })),
    findings: [
      {
        finding_id: 'finding-1',
        statement: 'Current evidence.',
        source_refs: ['shared'],
        evidence_class: 'Static',
        status: 'confirmed',
      },
    ],
    uncertainties: [],
    conflicts: [],
    br_ids: ['BR-1'],
    sr_ids: ['SR-1'],
    ac_ids: ['AC-1'],
    gap_ids: [],
    options: [
      { option_id: 'option-1', label: 'Use source', description: 'Use current source.', evidence_refs: ['shared'] },
    ],
    recommendation: { option_id: 'option-1', rationale: 'Current source.', evidence_refs: ['shared'] },
    completeness,
    readiness: 'ready',
    instruction_activation: activation,
    actor: 'test-setup',
    pointer: 'TEST-SETUP',
    created_at: timestamp,
    updated_at: timestamp,
  });
}

function insert(database, table, columns, values) {
  database
    .query(`INSERT INTO ${table} (${columns.join(',')}) VALUES (${columns.map(() => '?').join(',')})`)
    .run(...values);
}
function persisted(context, results, record, normalized = true) {
  const database = openHostStateDatabase(path.join(context.root, '.agent/work/session-handoff.v1.sqlite'));
  databases.push(database);
  new HostStateStore(database, context.workspace);
  database.exec(
    'CREATE TABLE IF NOT EXISTS agent_host_mastra_session_ledger (workspace_id TEXT, work_id TEXT, attempt INTEGER, revision INTEGER, payload TEXT, digest TEXT, PRIMARY KEY(workspace_id,work_id,attempt))',
  );
  const projectIds = ['agent'];
  const project = loadProjectSetContext(
    context.root,
    context.config,
    context.config.repository.repository_id,
    projectIds,
  );
  const binding = {
    repository_id: project.repository_id,
    project_ids: projectIds,
    integrations_digest: project.integrations_digest,
    lifecycle_work_id: 'work-repair',
    work_source_revision: context.source.digest,
    scope_id: 'scope-repair',
    ac_ids: ['AC-1'],
    config_digest: runtimeConfigDigest(context.config),
    team_id: 'default-development',
    workflow_id: 'implementation_change',
    provider_work_item_id: 'work-repair',
    work_item_digest: '1'.repeat(64),
    scope_contract_digest: '2'.repeat(64),
    acceptance_manifest_digest: '3'.repeat(64),
    implementation_paths: ['packages/agent/TESTING.md'],
    allowed_resources: ['file:packages/agent/TESTING.md'],
    runtime_source_revision: 'test-setup',
    schema_digest: '4'.repeat(64),
    runtime_code_digest: '5'.repeat(64),
  };
  const identityKey = JSON.stringify([
    binding.repository_id,
    projectIds,
    binding.integrations_digest,
    binding.lifecycle_work_id,
  ]);
  const pathToRecord = `${context.records}/synthesis-test.synthesis.json`;
  const observation = {
    schema: 'VidaSessionObservation/v1',
    action_id: 'e'.repeat(64),
    issue_id: randomUUID(),
    agent_id: 'test-setup',
    tool_call_ref: 'TEST-SETUP',
    status: 'reported_complete',
    summary: JSON.stringify({ ...record, schema: 'VidaSynthesisObservationOutput/v1' }),
    output_digest: '',
    evidence_refs: ['shared'],
  };
  observation.output_digest = canonicalJsonDigest(observation.summary);
  const workflowId = 'implementation_change';
  const stage = context.config.workflows[workflowId].stages.find((entry) => entry.kind === 'synthesize');
  const item = {
    request: {
      schema: 'VidaSessionRequest/v1',
      action_id: observation.action_id,
      workflow_id: workflowId,
      stage_id: stage.id,
      assignment_index: 0,
      role: stage.assignments[0].role,
      run_id: 'run-repair',
      config_digest: binding.config_digest,
      scope_digest: context.source.digest,
    },
    issue_id: observation.issue_id,
    observation,
    research_activation: { use: activation },
  };
  const work = {
    schema: 'WorkState/v1',
    workspace_id: context.workspace,
    revision: 1,
    binding,
    lease: null,
    contracts: {
      scope: { schema: 'ImplementationScope/v1', path: '.agent/scope.json', sha256: binding.scope_contract_digest },
      acceptance: {
        schema: 'AcceptanceManifest/v1',
        path: '.agent/acceptance.json',
        sha256: binding.acceptance_manifest_digest,
      },
      decisions: [],
    },
    lifecycle: {
      schema: 'LifecycleState/v1',
      phase: 'INTAKE',
      revision: 1,
      source_revision: binding.work_source_revision,
      next_action: 'Test scoped repair',
      route: 'R3',
      risk: 'medium',
      change_kind: 'migration',
      config_binding: {
        config_digest: binding.config_digest,
        schema_digest: binding.schema_digest,
        runtime_code_digest: binding.runtime_code_digest,
      },
      scope: {
        scope_id: binding.scope_id,
        allowed_paths: binding.implementation_paths,
        fingerprint_paths: binding.implementation_paths,
        implementation_paths: binding.implementation_paths,
        documentation_paths: [],
      },
      seal: null,
      assurance: {
        epoch: 'epoch-test',
        review_generation: 0,
        correction_count: 0,
        review_failure_count: 0,
        delivery_cycle_id: null,
      },
      references: [],
    },
    execution: {
      run_id: 'run-repair',
      input_digest: '6'.repeat(64),
      phase: 'implementation',
      status: 'suspended',
      assignment_attempts: [],
    },
    artifacts: [],
  };
  const state = {
    schema: 'MastraSessionLedger/v1',
    workspace_id: context.workspace,
    work_id: 'work-repair',
    attempt: 1,
    run_id: 'run-repair',
    step_id: 'step-synthesis',
    source_scope: context.source,
    items: [item],
    completed: [],
  };
  const observedBinding = (actionId, issueId) => ({
    work_id: state.work_id,
    attempt: state.attempt,
    run_id: state.run_id,
    action_id: actionId,
    issue_id: issueId,
    scope_id: binding.scope_id,
    scope_digest: context.source.digest,
    source_revision: binding.work_source_revision,
    source_scope_digest: context.source.digest,
    config_digest: binding.config_digest,
    maintenance_generation: 0,
    lease_ticket_id: 'ticket-test',
    lease_thread_id: 'thread-test',
    lease_generation: 1,
  });
  const activated = (request) => {
    const use = sealed({
      schema: 'InstructionActivationUse/v1',
      ...activation,
      work_item_id: state.work_id,
      source_revision: binding.work_source_revision,
      scope_id: binding.scope_id,
      cache_status: 'cold',
      actor: 'test-setup',
      pointer: 'TEST-SETUP',
      timestamp,
    });
    return {
      use,
      plan: sealed({
        schema: 'ObservedActivationUseWritePlan/v1',
        binding: observedBinding(request.action_id, request.issue_id),
        use_digest: use.digest,
        history_path: '.agent/work/work-repair/instruction-activation-history.jsonl',
        history_pre_sha256: null,
        history_sha256: sha(canonicalJson(use) + '\n'),
      }),
    };
  };
  item.research_activation = activated({ action_id: item.request.action_id, issue_id: item.issue_id });
  const normalizedPlan = (recordPath, recordSha, result, observed) =>
    sealed({
      schema:
        result.schema === 'ResearchResult/v1' ? 'ObservedResearchRecordPlan/v1' : 'ObservedSynthesisRecordPlan/v1',
      binding: observedBinding(observed.action_id, observed.issue_id),
      observation_digest: canonicalJsonDigest(observed),
      result_digest: result.digest,
      record_path: recordPath,
      record_pre_sha256: null,
      record_sha256: recordSha,
      changelog_path: context.changelog,
      changelog_pre_sha256: null,
      changelog_sha256: sha('\n'),
      before_digest: null,
    });
  const ledger = {
    tickets: [
      {
        ticket_id: 'ticket-test',
        work_id: 'work-repair',
        thread_id: 'thread-test',
        repository_id: binding.repository_id,
        project_ids: projectIds,
        integrations_digest: binding.integrations_digest,
        status: 'released',
        source_revision: context.source.digest,
      },
    ],
    claims: [{ ticket_id: 'ticket-test', status: 'released' }],
    operations: [{ kind: 'release', ticket_id: 'ticket-test', thread_id: 'thread-test' }],
  };
  writeResearch(context, results);
  if (record && normalized) {
    writeFileSync(path.join(context.root, pathToRecord), json(record));
    const recordSha = sha(json(record));
    item.research_normalization = normalizedPlan(pathToRecord, recordSha, record, observation);
    work.artifacts.push({
      schema: 'ResearchSynthesis/v1',
      artifact_id: record.bundle_id,
      stage_id: stage.id,
      path: pathToRecord,
      sha256: recordSha,
    });
  }
  const researchStage = context.config.workflows[workflowId].stages.find((entry) =>
    entry.produces.includes('ResearchResult/v1'),
  );
  state.completed.push({
    items: results.map((result, index) => {
      const recordPath = `${context.records}/${result.result_id}.research.json`;
      const recordSha = sha(json(result));
      const researchObservation = {
        action_id: String(index + 1).repeat(64),
        issue_id: randomUUID(),
        status: 'reported_complete',
      };
      work.artifacts.push({
        schema: 'ResearchResult/v1',
        artifact_id: result.result_id,
        stage_id: researchStage.id,
        path: recordPath,
        sha256: recordSha,
      });
      return {
        request: {
          action_id: researchObservation.action_id,
          run_id: state.run_id,
          workflow_id: workflowId,
          stage_id: researchStage.id,
          scope_digest: context.source.digest,
          config_digest: binding.config_digest,
        },
        issue_id: researchObservation.issue_id,
        observation: researchObservation,
        research_activation: activated(researchObservation),
        research_normalization: normalizedPlan(recordPath, recordSha, result, researchObservation),
      };
    }),
  });
  for (const artifact of work.artifacts)
    Object.assign(artifact, {
      source_revision: binding.work_source_revision,
      scope_id: binding.scope_id,
      ac_ids: binding.ac_ids,
    });
  if (normalized)
    Object.assign(ledger, {
      schema: 'CoordinationLedger/v1',
      workspace_id: context.workspace,
      revision: 1,
      open_generation: 1,
      next_sequence: 1,
      tickets: [],
      claims: [],
      operations: [],
      notices: [],
      dispositions: [],
      contours: [],
      batches: [],
      rebinds: [],
      retirements: [],
    });
  const writeRows = () => {
    database.exec('DELETE FROM agent_host_state; DELETE FROM agent_host_mastra_session_ledger');
    for (const [kind, id, value] of [
      ['work', identityKey, work],
      ['ledger', 'shared', ledger],
    ])
      insert(
        database,
        'agent_host_state',
        ['workspace_id', 'kind', 'id', 'revision', 'payload', 'digest'],
        [context.workspace, kind, id, 1, canonicalJson(value), canonicalJsonDigest(value)],
      );
    insert(
      database,
      'agent_host_mastra_session_ledger',
      ['workspace_id', 'work_id', 'attempt', 'revision', 'payload', 'digest'],
      [context.workspace, 'work-repair', 1, 1, canonicalJson(state), canonicalJsonDigest(state)],
    );
  };
  writeRows();
  database.close();
  return { item, work, state, ledger, identityKey, pathToRecord };
}

test('synthesis qualification dispatcher freezes qualified observation and rejects active owners before any write', async () => {
  const context = fixture();
  const results = [
    research(context, 'research-a', 'same-source.md'),
    research(context, 'research-b', 'same-source.md'),
  ];
  const record = synthesis(context, results);
  const stored = persisted(context, results, record);
  const args = planning(context, 'inspect', ['--kind', 'synthesis-qualification']);
  expect(await runReconcileArtifacts(args)).toMatchObject({
    status: 'repairable_current_v1',
    changed_paths: [stored.pathToRecord],
  });
  expect(await runReconcileArtifacts(planning(context, 'plan', ['--kind', 'synthesis-qualification']))).toMatchObject({
    status: 'planned',
  });
  const plan = JSON.parse(readFileSync(path.join(context.root, '.agent/work/repair-test/repair-plan.v1.json'), 'utf8'));
  const target = plan.targets[0];
  expect(JSON.parse(target.after_record).findings[0].source_refs).toEqual(['r0:shared']);
  expect(JSON.parse(target.after_observation.summary).recommendation.evidence_refs).toEqual(['r0:shared']);
  expect(target.after_observation.issue_id).toBe(stored.item.issue_id);
  expect(target.after_observation.evidence_refs).toEqual(['r0:shared']);
  const database = new Database(path.join(context.root, '.agent/work/session-handoff.v1.sqlite'));
  databases.push(database);
  const changed = { ...stored.work, execution: { ...stored.work.execution, status: 'active' } };
  database
    .query("UPDATE agent_host_state SET payload=?,digest=? WHERE kind='work'")
    .run(canonicalJson(changed), canonicalJsonDigest(changed));
  database.close();
  await Promise.resolve(expect(runReconcileArtifacts(args)).rejects.toThrow('not quiescent'));
  expect(readFileSync(path.join(context.root, stored.pathToRecord), 'utf8')).toBe(json(record));
  expect(readFileSync(path.join(context.root, context.changelog), 'utf8')).toBe('\n');
});

test('synthesis observation dispatcher plans the real provenance collision and preserves the reported native outcome', async () => {
  const context = fixture();
  const results = [research(context, 'research-a', 'source-a.md'), research(context, 'research-b', 'source-b.md')];
  const stored = persisted(context, results, synthesis(context, results), false);
  const args = (mode) => [
    '--kind',
    'synthesis-observation-correction',
    '--mode',
    mode,
    '--project-root',
    context.root,
    '--correction-id',
    'correction-test',
    '--projects',
    'agent',
    '--work-id',
    'work-repair',
    '--attempt',
    '1',
    '--action-id',
    stored.item.request.action_id,
    '--issue-id',
    stored.item.issue_id,
    '--native-handle',
    'thread-test',
    '--owner-correction-pointer',
    'TEST-SETUP-owner-decision',
    '--actor',
    'test-setup',
    '--timestamp',
    timestamp,
  ];
  expect(await runReconcileArtifacts(args('inspect'))).toMatchObject({
    status: 'correctable_current_v1',
    retained_native_outcome: 'reported_complete',
    prior_issue_id: stored.item.issue_id,
  });
  expect(await runReconcileArtifacts(args('plan'))).toMatchObject({
    status: 'planned',
    retained_native_outcome: 'reported_complete',
  });
  const plan = JSON.parse(
    readFileSync(
      path.join(context.root, '.agent/work/correction-test/synthesis-observation-correction-plan.v1.json'),
      'utf8',
    ),
  );
  expect(plan.original_item.observation).toEqual(stored.item.observation);
  expect(plan.predecessor_refs).toEqual(results.map(({ result_id, digest }) => ({ result_id, digest })));
  const database = new Database(path.join(context.root, '.agent/work/session-handoff.v1.sqlite'));
  databases.push(database);
  const row = database.query('SELECT payload FROM agent_host_mastra_session_ledger').get();
  expect(JSON.parse(row.payload).items[0].observation).toEqual(stored.item.observation);
  const wrongIssue = args('inspect');
  wrongIssue[wrongIssue.indexOf('--issue-id') + 1] = 'foreign-issue';
  await Promise.resolve(expect(runReconcileArtifacts(wrongIssue)).rejects.toThrow('correction scope'));
  expect(database.query('SELECT payload FROM agent_host_mastra_session_ledger').get().payload).toBe(row.payload);
  writeFileSync(path.join(context.root, 'packages/agent/TESTING.md'), 'changed source\n');
  await Promise.resolve(expect(runReconcileArtifacts(args('inspect'))).rejects.toThrow('declared source changed'));
  await Promise.resolve(expect(
    runReconcileArtifacts([
      '--kind',
      'synthesis-observation-correction',
      '--mode',
      'apply',
      '--project-root',
      context.root,
      '--correction-id',
      'correction-test',
    ]),
  ).rejects.toThrow('declared source changed'));
  expect(database.query('SELECT payload FROM agent_host_mastra_session_ledger').get().payload).toBe(row.payload);
  database.close();
  expect(readFileSync(path.join(context.root, context.changelog), 'utf8')).toBe('\n');
});

test('synthesis qualification dispatcher applies its database projection and replays the same receipt', async () => {
  const context = fixture();
  const results = [
    research(context, 'research-a', 'same-source.md'),
    research(context, 'research-b', 'same-source.md'),
  ];
  const stored = persisted(context, results, synthesis(context, results));
  await runReconcileArtifacts(planning(context, 'plan', ['--kind', 'synthesis-qualification']));
  const apply = [
    '--kind',
    'synthesis-qualification',
    '--mode',
    'apply',
    '--project-root',
    context.root,
    '--repair-id',
    'repair-test',
  ];
  expect(await runReconcileArtifacts(apply)).toMatchObject({ status: 'applied' });
  const database = new Database(path.join(context.root, '.agent/work/session-handoff.v1.sqlite'));
  databases.push(database);
  const work = database.query("SELECT payload,revision FROM agent_host_state WHERE kind='work'").get();
  const journal = database.query('SELECT payload,revision FROM agent_host_mastra_session_ledger').get();
  expect(work.revision).toBe(2);
  expect(journal.revision).toBe(2);
  const written = JSON.parse(readFileSync(path.join(context.root, stored.pathToRecord), 'utf8'));
  expect(written.findings[0].source_refs).toEqual(['r0:shared']);
  expect(JSON.parse(journal.payload).items[0].observation.issue_id).toBe(stored.item.issue_id);
  expect(JSON.parse(journal.payload).items[0].observation.evidence_refs).toEqual(['r0:shared']);
  expect(await runReconcileArtifacts(apply)).toMatchObject({ status: 'already_applied' });
  expect(database.query("SELECT payload FROM agent_host_state WHERE kind='work'").get().payload).toBe(work.payload);
  expect(database.query('SELECT payload FROM agent_host_mastra_session_ledger').get().payload).toBe(journal.payload);
});

test('synthesis qualification database CAS rejects a journal revision changed after file publication', async (budget) => {
  const context = fixture();
  const results = [
    research(context, 'research-a', 'same-source.md'),
    research(context, 'research-b', 'same-source.md'),
  ];
  const stored = persisted(context, results, synthesis(context, results));
  const priorPath = `${context.records}/prior.txt`;
  const priorBytes = 'TEST SETUP prior source bytes\n';
  writeFileSync(path.join(context.root, priorPath), priorBytes);
  const priorEvent = {
    schema: 'DocumentationChangeEvent/v1',
    event_id: 'documentation-event-prior',
    logical_edit_id: priorPath,
    work_id: 'test-setup-prior',
    source_revision: context.source.digest,
    operation: 'init',
    document_id: 'prior-document',
    path_before: null,
    path_after: priorPath,
    before_sha256: sha(''),
    after_sha256: sha(priorBytes),
    actor: 'test-setup',
    pointer: 'TEST-SETUP-prior',
    timestamp,
  };
  const lineagePrefix = canonicalJson(priorEvent) + '\n';
  writeFileSync(path.join(context.root, context.changelog), lineagePrefix);
  await runReconcileArtifacts(planning(context, 'plan', ['--kind', 'synthesis-qualification']));
  const plan = JSON.parse(readFileSync(path.join(context.root, '.agent/work/repair-test/repair-plan.v1.json'), 'utf8'));
  const database = new Database(path.join(context.root, '.agent/work/session-handoff.v1.sqlite'));
  databases.push(database);
  const workBefore = database.query("SELECT payload,revision FROM agent_host_state WHERE kind='work'").get();
  const journalBefore = database.query('SELECT payload,revision FROM agent_host_mastra_session_ledger').get();
  const args = [
    '--kind',
    'synthesis-qualification',
    '--mode',
    'apply',
    '--project-root',
    context.root,
    '--repair-id',
    'repair-test',
  ];
  await Promise.resolve(expect(
    runReconcileArtifacts(args, {
      onPhase: (phase) => {
        if (phase === 'changelog')
          database.query('UPDATE agent_host_mastra_session_ledger SET revision=revision+1').run();
      },
    }),
  ).rejects.toThrow('Mastra journal CAS changed'));
  expect(database.query("SELECT payload,revision FROM agent_host_state WHERE kind='work'").get()).toEqual(workBefore);
  const journalAfter = database.query('SELECT payload,revision FROM agent_host_mastra_session_ledger').get();
  expect(journalAfter.payload).toBe(journalBefore.payload);
  expect(journalAfter.revision).toBe(journalBefore.revision + 1);
  expect(
    database
      .query(
        "SELECT COUNT(*) AS count FROM sqlite_master WHERE type='table' AND name='agent_host_synthesis_qualification_repair'",
      )
      .get().count,
  ).toBe(0);
  expect(readFileSync(path.join(context.root, plan.targets[0].path), 'utf8')).toBe(plan.targets[0].after_record);
  expect(readFileSync(path.join(context.root, context.changelog), 'utf8')).toBe(plan.changelog_after);
  const lineage = readFileSync(path.join(context.root, context.changelog), 'utf8');
  expect(lineage.startsWith(lineagePrefix)).toBe(true);
  expect(lineage.trim().split('\n').map(JSON.parse)).toEqual([
    priorEvent,
    {
      schema: 'DocumentationChangeEvent/v1',
      event_id: expect.any(String),
      logical_edit_id: `ResearchSynthesis/v1:${plan.targets[0].path}`,
      work_id: 'work-repair',
      source_revision: context.source.digest,
      operation: 'finalize',
      document_id: 'synthesis-test',
      path_before: plan.targets[0].path,
      path_after: plan.targets[0].path,
      before_sha256: plan.targets[0].before_sha256,
      after_sha256: plan.targets[0].after_sha256,
      actor: 'test-setup',
      pointer: '.agent/work/repair-test/repair-plan.v1.json',
      timestamp,
    },
  ]);
  expect(readFileSync(path.join(context.root, priorPath), 'utf8')).toBe(priorBytes);
  const phases = readFileSync(path.join(context.root, '.agent/work/repair-test/repair-journal.v1.jsonl'), 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line).phase);
  expect(phases).toEqual(['record_0', 'changelog']);
  expect(
    JSON.parse(readFileSync(path.join(context.root, '.agent/work/repair-test/repair-plan.v1.json'), 'utf8')),
  ).toEqual(plan);
  expect(readFileSync(path.join(context.root, '.agent/work/repair-test/archive/record-0.json'), 'utf8')).toBe(
    plan.targets[0].before_record,
  );
  expect(plan.changelog_before).toBe(lineagePrefix);
  expect(plan.targets[0].work_row.payload).toBe(workBefore.payload);
  expect(plan.targets[0].journal_row.payload).toBe(journalBefore.payload);
  const hostState = new HostStateStore(database, context.workspace);
  expect(hostState.readMaintenanceFence().status).toBe('held');
  expect(() =>
    hostState.readHostStateSnapshot({
      repository_id: stored.work.binding.repository_id,
      project_ids: stored.work.binding.project_ids,
      integrations_digest: stored.work.binding.integrations_digest,
      work_id: 'work-repair',
    }),
  ).toThrow('working access blocked by maintenance fence');
  const resumed = boundedSpawnSync(
    spawnSync,
    process.execPath,
    [
      path.join(bundle, 'bin/reconcile-artifacts.mjs'),
      '--kind',
      'synthesis-qualification',
      '--mode',
      'resume',
      '--project-root',
      context.root,
      '--repair-id',
      'repair-test',
    ],
    { cwd: bundle, encoding: 'utf8', windowsHide: true, timeout: 15_000, budget, diagnostics: true },
    'repair synthesis qualification resume',
  );
  if (commandOutcomeUnknown(resumed)) repairOutcomeUnknown = true;
  requireTerminalCommand(resumed, 'repair synthesis qualification resume');
  expect(resumed.status).toBe(1);
  expect(JSON.parse(resumed.stderr.trim())).toMatchObject({
    status: 'blocked',
    message: expect.stringContaining('repair journal preimage changed'),
  });
  expect(database.query('SELECT payload,revision FROM agent_host_mastra_session_ledger').get()).toEqual(journalAfter);
  expect(readFileSync(path.join(context.root, plan.targets[0].path), 'utf8')).toBe(plan.targets[0].after_record);
  expect(readFileSync(path.join(context.root, context.changelog), 'utf8')).toBe(plan.changelog_after);
  expect(hostState.readMaintenanceFence().status).toBe('held');
});

test('research identity dispatcher resumes an interrupted exact two-record publication', async () => {
  const context = fixture();
  const results = [research(context, 'research-a', 'source-a.md'), research(context, 'research-b', 'source-b.md')];
  const paths = writeResearch(context, results);
  const recordsFile = path.join(context.root, 'records.json');
  writeFileSync(recordsFile, json(paths));
  await runReconcileArtifacts(planning(context, 'plan', ['--records', recordsFile]));
  const plan = JSON.parse(readFileSync(path.join(context.root, '.agent/work/repair-test/repair-plan.v1.json'), 'utf8'));
  const args = ['--mode', 'apply', '--project-root', context.root, '--repair-id', 'repair-test'];
  await Promise.resolve(expect(
    runReconcileArtifacts(args, {
      onPhase: (phase) => {
        if (phase === 'record_0') throw new Error('injected interruption');
      },
    }),
  ).rejects.toThrow('injected interruption'));
  expect(readFileSync(path.join(context.root, paths[0]), 'utf8')).toBe(plan.changes[0].after);
  expect(readFileSync(path.join(context.root, paths[1]), 'utf8')).toBe(plan.changes[1].before);
  expect(readFileSync(path.join(context.root, context.changelog), 'utf8')).toBe('\n');
  const resumed = await runReconcileArtifacts([
    '--mode',
    'resume',
    '--project-root',
    context.root,
    '--repair-id',
    'repair-test',
  ]);
  expect(resumed.status).toBe('complete');
  for (const change of plan.changes)
    expect(readFileSync(path.join(context.root, change.path), 'utf8')).toBe(change.after);
  const events = readFileSync(path.join(context.root, context.changelog), 'utf8').trim().split('\n').map(JSON.parse);
  expect(events).toHaveLength(2);
  const database = new Database(path.join(context.root, '.agent/work/session-handoff.v1.sqlite'));
  databases.push(database);
  expect(JSON.parse(database.query('SELECT payload FROM agent_host_maintenance').get().payload).status).toBe(
    'released',
  );
});

test('synthesis qualification dispatcher resumes partial publication without duplicating lineage', async () => {
  const context = fixture();
  const results = [
    research(context, 'research-a', 'same-source.md'),
    research(context, 'research-b', 'same-source.md'),
  ];
  persisted(context, results, synthesis(context, results));
  await runReconcileArtifacts(planning(context, 'plan', ['--kind', 'synthesis-qualification']));
  const args = [
    '--kind',
    'synthesis-qualification',
    '--mode',
    'apply',
    '--project-root',
    context.root,
    '--repair-id',
    'repair-test',
  ];
  await Promise.resolve(expect(
    runReconcileArtifacts(args, {
      onPhase: (phase) => {
        if (phase === 'record_0') throw new Error('injected interruption');
      },
    }),
  ).rejects.toThrow('injected interruption'));
  expect(
    await runReconcileArtifacts([
      '--kind',
      'synthesis-qualification',
      '--mode',
      'resume',
      '--project-root',
      context.root,
      '--repair-id',
      'repair-test',
    ]),
  ).toMatchObject({ status: 'applied' });
  expect(readFileSync(path.join(context.root, context.changelog), 'utf8').trim().split('\n')).toHaveLength(1);
});

test('synthesis observation dispatcher prepares a new issue while keeping the original native report immutable', async () => {
  const context = fixture();
  const results = [research(context, 'research-a', 'source-a.md'), research(context, 'research-b', 'source-b.md')];
  const stored = persisted(context, results, synthesis(context, results), false);
  await runReconcileArtifacts([
    '--kind',
    'synthesis-observation-correction',
    '--mode',
    'plan',
    '--project-root',
    context.root,
    '--correction-id',
    'correction-test',
    '--projects',
    'agent',
    '--work-id',
    'work-repair',
    '--attempt',
    '1',
    '--action-id',
    stored.item.request.action_id,
    '--issue-id',
    stored.item.issue_id,
    '--native-handle',
    'thread-test',
    '--owner-correction-pointer',
    'TEST-SETUP-owner-decision',
    '--actor',
    'test-setup',
    '--timestamp',
    timestamp,
  ]);
  const args = [
    '--kind',
    'synthesis-observation-correction',
    '--mode',
    'apply',
    '--project-root',
    context.root,
    '--correction-id',
    'correction-test',
  ];
  expect(await runReconcileArtifacts(args)).toMatchObject({
    status: 'prepared',
    retained_native_outcome: 'reported_complete',
  });
  const database = new Database(path.join(context.root, '.agent/work/session-handoff.v1.sqlite'));
  databases.push(database);
  const journal = database.query('SELECT payload,revision FROM agent_host_mastra_session_ledger').get();
  expect(JSON.parse(journal.payload).items[0]).toEqual({
    request: stored.item.request,
    issue_id: null,
    observation: null,
  });
  const correction = database.query('SELECT payload FROM agent_host_synthesis_observation_correction').get();
  expect(JSON.parse(correction.payload).original_item.observation).toEqual(stored.item.observation);
  args[args.indexOf('--mode') + 1] = 'resume';
  expect(await runReconcileArtifacts(args)).toMatchObject({ status: 'already_prepared' });
  expect(database.query('SELECT payload FROM agent_host_mastra_session_ledger').get().payload).toBe(journal.payload);
});
