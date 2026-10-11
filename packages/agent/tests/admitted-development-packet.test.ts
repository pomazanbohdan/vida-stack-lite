/**
 * Private v375 builder-contract candidate. `controlledPacketSnapshot` creates
 * bounded synthetic Host/ledger snapshots to exercise packet projection shape
 * and binding checks only. These fixtures are not public admission evidence and
 * do not establish opaque runtime or kernel authority. Trusted admission remains
 * a separate formation GAP.
 */
import { afterAll, describe, expect, test } from 'bun:test';
import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { WorkItemSelection } from '../src/config/runtime-config.ts';
import type { CoordinationLedger } from '../src/contracts/envelopes.ts';
import type { HostStateSnapshot, WorkState } from '../src/host-state.ts';
import type { LocalWorkAdmissionInput } from '../src/orchestration/local-work-admission.ts';
import type { MastraSessionLedgerState } from '../src/orchestration/persistent-session-handoff.ts';
import type {
  SessionBridgeObservation,
  SessionBridgeRequest,
} from '../src/orchestration/mastra-session-bridge-contract.ts';
import type {
  ActivationUse,
  ObservedActivationUseWritePlan,
  ObservedResearchRecordPlan,
  RecordInstructionActivation,
  ResearchResult,
  ResearchSourceRef,
  ResearchSynthesis,
} from '../src/research-decision.ts';
import { configuredTestContext } from './configured-context.ts';
import { runtimeConfigDigest } from '../src/config/runtime-config.ts';
import { loadProjectSetContext } from '../src/config/project-context.ts';
import { canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import { buildAdmittedDevelopmentPacket } from '../src/orchestration/admitted-development-packet.ts';
import { snapshotDeclaredSources } from '../src/orchestration/scoped-source-snapshot.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { configuredFrontierRepairFixture } from './helpers/configured-frontier-fixture.ts';
import { compileDevelopmentWorkflow } from '../src/orchestration/workflow-plan.ts';
import { sessionActionsForWave } from '../src/orchestration/session-handoff.ts';
import { configuredFrontierRecoveryViewDigest } from '../src/orchestration/failed-prewriter-transition.ts';
import {
  runtimeCodeContinuationProtectedWorkDigest,
  validateQualifiedRuntimeCodeContinuationRequest,
  validateQualifiedRuntimeCodeContinuationReceipt,
} from '../src/orchestration/qualified-runtime-code-continuation.ts';

const { repositoryRoot: root, config } = configuredTestContext();
const selectedProject = config.projects[0];
if (!selectedProject) throw new Error('configured packet fixture requires a selected project');
const projectId = selectedProject.project_id;
const scratchRoot = path.join(root, '.planning', 'agent-flow');
mkdirSync(scratchRoot, { recursive: true });
const fixture = mkdtempSync(path.join(scratchRoot, 'packet-adapter-'));
const ownedResearchPaths = new Set<string>();
afterAll(() => {
  for (const file of ownedResearchPaths) rmSync(file, { force: true });
  if (!fixture.startsWith(scratchRoot + path.sep)) throw new Error('unsafe packet fixture cleanup');
  rmSync(fixture, { recursive: true, force: true });
});
const digest = (bytes: Buffer): string => createHash('sha256').update(bytes).digest('hex');
let fixtureNumber = 0;

function controlledPacketSnapshot(
  intent: WorkItemSelection['intent'] = 'task_execution',
  lifecycleRisk: WorkState['lifecycle']['risk'] = 'medium',
  configDigest: string = runtimeConfigDigest(config),
) {
  const directory = path.join(fixture, String(++fixtureNumber));
  mkdirSync(directory);
  const relative = (name: string): string => path.relative(root, path.join(directory, name)).replaceAll('\\', '/');
  const selectedKind: WorkItemSelection['kind'] = intent === 'task_execution' ? 'task' : 'story';
  const workItem = {
    schema: 'WorkItem/v1',
    id: 'packet-test-work',
    provider: 'local',
    provider_type: 'Task',
    canonical_kind: selectedKind,
    intent,
    project_id: projectId,
    title: 'Add one scoped file',
    description: 'Create the agreed scoped file and verify its acceptance.',
    risk_flags: [],
    labels: [],
  } satisfies LocalWorkAdmissionInput['workItem'];
  const selection = {
    team: 'default-development',
    kind: workItem.canonical_kind,
    intent,
    project: projectId,
    risk_flags: [],
    labels: [],
  } satisfies WorkItemSelection;
  const target = relative('new-file.ts');
  const contextPath = 'packages/agent/TESTING.md';
  const allowedPaths = [target, contextPath].sort();
  const source = snapshotDeclaredSources(requireSafeRepositoryAccess(root), allowedPaths);
  const scope = {
    schema: 'ImplementationScope/v1',
    scope_id: 'packet-test-scope',
    work_id: workItem.id,
    source_revision: source.digest,
    ac_ids: ['AC-1'],
    allowed_paths: allowedPaths,
    implementation_paths: [target],
    documentation_paths: [],
    changed_symbols: [],
    non_goals: [],
    acceptance_trace: ['AC-1'],
    behavior_trace: ['Create the scoped file.'],
    test_trace: ['Run the focused acceptance check.'],
    diagnostic_trace: ['Observe the file result.'],
    attribution: { thread_id: 'packet-test-thread', pointer: 'local:packet-test' },
    owner: 'packet-test-owner',
    created_at: '2026-09-25T00:00:00.000Z',
  };
  const acceptance = {
    schema: 'AcceptanceManifest/v1',
    id: 'packet-test-acceptance',
    version: 1,
    ac_ids: ['AC-1'],
    source: 'local:packet-test',
    scope: scope.scope_id,
    source_revision: source.digest,
    contracts: [
      {
        id: 'AC-1',
        definition: 'The scoped file is created.',
        sr: 'Create only the admitted file.',
        evidence: ['focused acceptance check'],
      },
    ],
  };
  const scopePath = relative('scope.json');
  const acceptancePath = relative('acceptance.json');
  writeFileSync(path.join(root, scopePath), JSON.stringify(scope));
  writeFileSync(path.join(root, acceptancePath), JSON.stringify(acceptance));
  const scopeBytes = readFileSync(path.join(root, scopePath));
  const acceptanceBytes = readFileSync(path.join(root, acceptancePath));
  const expiry = new Date(Date.now() + 60_000).toISOString();
  const workflowId = intent;
  const binding = {
    repository_id: config.repository.repository_id,
    project_ids: [projectId],
    integrations_digest: loadProjectSetContext(root, config, config.repository.repository_id, [projectId])
      .integrations_digest,
    lifecycle_work_id: workItem.id,
    provider_work_item_id: workItem.id,
    work_item_digest: canonicalJsonDigest(workItem),
    team_id: selection.team,
    workflow_id: workflowId,
    config_digest: configDigest,
    scope_id: scope.scope_id,
    scope_contract_digest: digest(scopeBytes),
    acceptance_manifest_digest: digest(acceptanceBytes),
    ac_ids: scope.ac_ids,
    implementation_paths: scope.implementation_paths,
    allowed_resources: [
      `execution:${workItem.id}`,
      ...scope.implementation_paths.map((entry) => `file:${entry}`),
    ].sort(),
    work_source_revision: source.digest,
    runtime_source_revision: 'e'.repeat(64),
    schema_digest: 'd'.repeat(64),
    runtime_code_digest: 'f'.repeat(64),
  };
  const work = {
    schema: 'WorkState/v1',
    workspace_id: 'a'.repeat(64),
    revision: 1,
    binding,
    contracts: {
      scope: { schema: 'ContractReference/v1', path: scopePath, sha256: digest(scopeBytes) },
      acceptance: { schema: 'ContractReference/v1', path: acceptancePath, sha256: digest(acceptanceBytes) },
      decisions: [],
    },
    lease: { ticket_id: 'packet-test-ticket', thread_id: 'packet-test-thread', generation: 1 },
    execution: {
      run_id: 'packet-test-run',
      input_digest: 'c'.repeat(64),
      phase: 'execute',
      status: 'active',
      assignment_attempts: [],
    },
    lifecycle: {
      schema: 'LifecycleState/v1',
      revision: 1,
      phase: 'EXECUTE',
      source_revision: source.digest,
      next_action: 'Build the admitted packet.',
      route: 'R2',
      risk: lifecycleRisk,
      change_kind: 'feature',
      config_binding: {
        config_digest: configDigest,
        schema_digest: 'd'.repeat(64),
        runtime_code_digest: 'e'.repeat(64),
      },
      scope: {
        scope_id: scope.scope_id,
        allowed_paths: scope.allowed_paths,
        fingerprint_paths: scope.allowed_paths,
        implementation_paths: scope.implementation_paths,
        documentation_paths: [],
      },
      seal: null,
      assurance: {
        epoch: 'packet-test-epoch',
        review_generation: 0,
        correction_count: 0,
        review_failure_count: 0,
        delivery_cycle_id: null,
      },
      references: [],
    },
    artifacts: [],
  } satisfies WorkState;
  const coordinationLedger = {
    schema: 'CoordinationLedger/v1',
    workspace_id: 'a'.repeat(64),
    revision: 1,
    open_generation: 1,
    next_sequence: 2,
    claims: [
      {
        schema: 'WorkstreamClaim/v1',
        claim_id: 'packet-test-claim',
        ticket_id: 'packet-test-ticket',
        work_id: workItem.id,
        thread_id: 'packet-test-thread',
        generation: 1,
        resources: [],
        status: 'active',
        lease_expires_at: expiry,
        created_at: new Date().toISOString(),
        renewed_at: new Date().toISOString(),
      },
    ],
    tickets: [
      {
        schema: 'CoordinationTicket/v1',
        ticket_id: 'packet-test-ticket',
        repository_id: config.repository.repository_id,
        project_ids: [projectId],
        integrations_digest: 'b'.repeat(64),
        work_id: workItem.id,
        thread_id: 'packet-test-thread',
        source_revision: source.digest,
        generation: 1,
        sequence: 1,
        contour_keys: [],
        exclusive_resources: [],
        status: 'active',
        claim_ids: ['packet-test-claim'],
        expires_at: expiry,
        active_resources: [],
        blocked_resources: [],
        created_at: new Date().toISOString(),
      },
    ],
    notices: [],
    dispositions: [],
    contours: [],
    batches: [],
    rebinds: [],
    operations: [],
    retirements: [],
  } satisfies CoordinationLedger;
  const host = {
    work,
    ledger: coordinationLedger,
    workVersion: null,
    ledgerVersion: null,
    maintenanceGeneration: 0,
  } satisfies HostStateSnapshot;
  const workflow = config.workflows[workflowId];
  if (!workflow) throw new Error(`configured packet workflow ${workflowId} is missing`);
  const taskSynthesisStage = requiredValue(
    workflow.stages.find((stage) => stage.produces.includes('DevelopmentTaskPacket/v1')),
    `configured packet synthesis stage for ${workflowId}`,
  );
  const taskSummary = 'Baseline task synthesis summary for the admitted fixture.';
  const completed: MastraSessionLedgerState['completed'] =
    intent === 'task_execution'
      ? [
          {
            step_id: taskSynthesisStage.id,
            items: [
              {
                request: packetSessionRequest(
                  taskSynthesisStage.id,
                  workflowId,
                  source.digest,
                  binding.config_digest,
                  'd'.repeat(64),
                  selection,
                ),
                issue_id: '11111111-1111-4111-8111-111111111111',
                observation: packetObservation('11111111-1111-4111-8111-111111111111', 'd'.repeat(64), taskSummary),
              },
            ],
          },
        ]
      : [];
  const state: MastraSessionLedgerState = {
    schema: 'MastraSessionLedger/v1',
    workspace_id: 'a'.repeat(64),
    work_id: workItem.id,
    attempt: 1,
    run_id: 'packet-test-run',
    step_id: 'develop',
    source_scope: source,
    items: [],
    completed,
  } satisfies MastraSessionLedgerState;
  const ledger = {
    version: { revision: 1, digest: canonicalJsonDigest(state) },
    state,
    resume_status: 'ready',
  } satisfies Parameters<typeof buildAdmittedDevelopmentPacket>[0]['ledger'];
  return {
    repositoryRoot: root,
    config,
    host,
    ledger,
    workItem,
    selection,
    scopeBytes,
    acceptanceBytes,
    configuredContext: null,
    target,
    allowedPaths,
  } satisfies Parameters<typeof buildAdmittedDevelopmentPacket>[0] & {
    target: string;
    allowedPaths: string[];
  };
}

function addObservedSynthesis(input: ReturnType<typeof controlledPacketSnapshot>, completeWave = false) {
  const recordPrefix = 'packet-fixture-' + randomUUID();
  const workflow = config.workflows[input.selection.intent];
  if (!workflow) throw new Error(`configured packet workflow ${input.selection.intent} is missing`);
  const researchStage = requiredValue(
    workflow.stages.find((stage) => stage.produces.includes('ResearchResult/v1')),
    'research stage',
  );
  const synthesisStage = requiredValue(
    workflow.stages.find((stage) => stage.produces.includes('ResearchSynthesis/v1')),
    'synthesis stage',
  );
  const issueIds = ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222'] satisfies readonly [
    string,
    string,
  ];
  const actionIds = ['f'.repeat(64), 'e'.repeat(64)] satisfies readonly [string, string];
  const timestamp = new Date(Date.now() - 60_000).toISOString();
  const sourceRevision = input.host.work.binding.work_source_revision;
  const activation: RecordInstructionActivation = {
    use_id: 'use-packet-synthesis',
    risk: 'medium',
    phase: 'trace',
    lane: 'documentation-researcher',
    trigger: 'research_intent',
    required_instruction_ids: [],
    instruction_ids: ['research-protocol'],
    registry_digest: 'a'.repeat(64),
    source_digests: [{ instruction_id: 'research-protocol', source_sha256: 'b'.repeat(64) }],
  };
  const source: ResearchSourceRef = {
    source_id: 'source-1',
    source_kind: 'internal',
    locator: 'repository://current/source',
    title: 'Current source',
    version_or_date: 'current',
    claim: 'The admitted AC-1 requirement is supported by the current source.',
    retrieved_at: timestamp,
    independence_group: null,
    digest: null,
  };
  const resultBody = {
    schema: 'ResearchResult/v1',
    result_id: recordPrefix + '-research',
    work_item_id: input.workItem.id,
    source_revision: sourceRevision,
    scope_id: 'packet-test-scope',
    contour: 'requirements',
    topic: 'Current source requirements',
    objective: 'Identify supported requirements.',
    question: 'What must be preserved?',
    source_refs: [source],
    findings: [
      {
        finding_id: 'research-finding',
        statement: 'Preserve the current file format.',
        source_ids: [source.source_id],
        evidence_class: 'Static',
        status: 'confirmed',
      },
    ],
    uncertainties: [],
    conflicts: [],
    evidence_classes: ['Static'],
    br_ids: [],
    sr_ids: [],
    ac_ids: ['AC-1'],
    gap_ids: [],
    options: [
      {
        option_id: 'research-option',
        label: 'Preserve',
        description: 'Keep the current format.',
        evidence_refs: [source.source_id],
      },
    ],
    recommendation: {
      option_id: 'research-option',
      rationale: 'The source supports preserving the format.',
      evidence_refs: [source.source_id],
    },
    completeness: {
      status: 'blocked',
      required_questions: ['What must be preserved?'],
      answered_questions: [],
      missing_questions: ['What must be preserved?'],
      material_gaps: [],
      external_validation: {
        required: false,
        source_count: 0,
        minimum_sources: 0,
        status: 'not_required',
        live_check: false,
      },
    },
    readiness: 'blocked',
    instruction_activation: activation,
    actor: 'fixture-agent',
    pointer: 'WORK.md',
    created_at: timestamp,
    updated_at: timestamp,
  } satisfies Omit<ResearchResult, 'digest'>;
  const result = { ...resultBody, digest: canonicalJsonDigest(resultBody) } satisfies ResearchResult;
  const plan = compileDevelopmentWorkflow(
    config,
    input.selection.team,
    input.selection.intent,
    input.selection.risk_flags,
  );
  const researchWave = plan.waves.findIndex((wave) => wave.some((stage) => stage.id === researchStage.id));
  const researchActions = sessionActionsForWave(
    config,
    input.selection,
    { work_id: input.workItem.id, attempt: 1, scope_digest: sourceRevision },
    input.selection.intent,
    researchWave,
    [],
  );
  const results = completeWave
    ? researchActions.map((_, index) => {
        const body = {
          ...resultBody,
          result_id: index === 0 ? resultBody.result_id : `${resultBody.result_id}-${index}`,
        };
        return { ...body, digest: canonicalJsonDigest(body) };
      })
    : [result];
  const synthesisBody = {
    schema: 'ResearchSynthesis/v1',
    bundle_id: recordPrefix + '-synthesis',
    work_item_id: input.workItem.id,
    source_revision: sourceRevision,
    scope_id: 'packet-test-scope',
    topic: 'Current source requirements',
    result_refs: results.map((record) => ({ result_id: artifactRecordId(record), digest: record.digest })),
    findings: [
      {
        finding_id: 'synthesis-requirement',
        statement: 'Unique synthesis requirement: preserve the canonical file format.',
        source_refs: ['r0:source-1'],
        evidence_class: 'Static',
        status: 'confirmed',
      },
    ],
    uncertainties: [],
    conflicts: [],
    br_ids: [],
    sr_ids: [],
    ac_ids: ['AC-1'],
    gap_ids: [],
    options: [
      {
        option_id: 'option-preserve',
        label: 'Preserve',
        description: 'Keep the format.',
        evidence_refs: ['r0:source-1'],
      },
    ],
    recommendation: {
      option_id: 'option-preserve',
      rationale: 'The source confirms this requirement.',
      evidence_refs: ['r0:source-1'],
    },
    completeness: {
      status: 'blocked',
      required_questions: [],
      answered_questions: [],
      missing_questions: [],
      material_gaps: ['Synthesis leaves one acceptance question open.'],
      external_validation: {
        required: false,
        source_count: 0,
        minimum_sources: 0,
        status: 'not_required',
        live_check: false,
      },
    },
    readiness: 'blocked',
    instruction_activation: activation,
    actor: 'fixture-agent',
    pointer: 'WORK.md',
    created_at: timestamp,
    updated_at: timestamp,
  } satisfies Omit<ResearchSynthesis, 'digest'>;
  const synthesis = { ...synthesisBody, digest: canonicalJsonDigest(synthesisBody) } satisfies ResearchSynthesis;
  const recordsRoot = path.join(root, config.research_decision.paths.research_records);
  mkdirSync(recordsRoot, { recursive: true });
  const artifacts = [
    ...results.map((record, index) => ({
      record,
      stage: researchStage,
      schema: 'ResearchResult/v1',
      suffix: '.research.json',
      issue:
        index === 0
          ? requiredAt(issueIds, 0, 'first research issue id')
          : `${String(index + 3).repeat(8)}-${String(index + 3).repeat(4)}-4${String(index + 3).repeat(3)}-8${String(index + 3).repeat(3)}-${String(index + 3).repeat(12)}`,
      action: index === 0 ? requiredAt(actionIds, 0, 'first research action id') : String(index + 1).repeat(64),
      assignment_index: index,
    })),
    {
      record: synthesis,
      stage: synthesisStage,
      schema: 'ResearchSynthesis/v1',
      suffix: '.synthesis.json',
      issue: requiredAt(issueIds, 1, 'synthesis issue id'),
      action: requiredAt(actionIds, 1, 'synthesis action id'),
      assignment_index: 0,
    },
  ];
  const entries: WorkState['artifacts'][number][] = [];
  const completed: MastraSessionLedgerState['completed'][number][] = [];
  for (const fixtureArtifact of artifacts) {
    const bytes = Buffer.from(JSON.stringify(fixtureArtifact.record));
    const recordName = `${artifactRecordId(fixtureArtifact.record)}${fixtureArtifact.suffix}`;
    const fullPath = path.join(recordsRoot, recordName);
    writeFileSync(fullPath, bytes, { flag: 'wx' });
    ownedResearchPaths.add(fullPath);
    const recordPath = path.relative(root, fullPath).replaceAll('\\', '/');
    const changelogPath = `${recordPath}.jsonl`;
    const recordSha = digest(bytes);
    const sourceScope = requiredValue(input.ledger.state.source_scope, 'current source scope');
    const binding = {
      work_id: input.workItem.id,
      attempt: input.ledger.state.attempt,
      run_id: input.ledger.state.run_id,
      action_id: fixtureArtifact.action,
      issue_id: fixtureArtifact.issue,
      scope_id: 'packet-test-scope',
      scope_digest: sourceRevision,
      source_revision: sourceRevision,
      source_scope_digest: sourceScope.digest,
      config_digest: input.host.work.binding.config_digest,
      maintenance_generation: 0,
      lease_ticket_id: input.host.work.lease.ticket_id,
      lease_thread_id: input.host.work.lease.thread_id,
      lease_generation: input.host.work.lease.generation,
    };
    const observation = packetObservation(
      fixtureArtifact.issue,
      fixtureArtifact.action,
      `Observed ${fixtureArtifact.schema}`,
      [recordPath],
    );
    const activationUseBody = {
      schema: 'InstructionActivationUse/v1',
      ...{
        use_id: `use-${fixtureArtifact.action.slice(0, 8)}`,
        work_item_id: input.workItem.id,
        source_revision: sourceRevision,
        scope_id: 'packet-test-scope',
        risk: 'medium',
        phase: 'trace',
        lane: 'documentation-researcher',
        trigger: 'research_intent',
        required_instruction_ids: [],
        instruction_ids: ['research-protocol'],
        registry_digest: 'a'.repeat(64),
        source_digests: [{ instruction_id: 'research-protocol', source_sha256: 'b'.repeat(64) }],
        cache_status: 'cold',
        actor: 'fixture-agent',
        pointer: 'WORK.md',
        timestamp,
      },
    } satisfies Omit<ActivationUse, 'digest'>;
    const activationUse: ActivationUse = { ...activationUseBody, digest: canonicalJsonDigest(activationUseBody) };
    const activationPlanBody = {
      schema: 'ObservedActivationUseWritePlan/v1',
      binding,
      use_digest: activationUse.digest,
      history_path: `${config.research_decision.paths.research_records}/packet-synthesis-instruction-activation-history.jsonl`,
      history_pre_sha256: null,
      history_sha256: digest(Buffer.from('')),
    } satisfies Omit<ObservedActivationUseWritePlan, 'digest'>;
    const activationPlan: ObservedActivationUseWritePlan = {
      ...activationPlanBody,
      digest: canonicalJsonDigest(activationPlanBody),
    };
    const planBody = {
      schema:
        fixtureArtifact.schema === 'ResearchSynthesis/v1'
          ? 'ObservedSynthesisRecordPlan/v1'
          : 'ObservedResearchRecordPlan/v1',
      binding,
      observation_digest: canonicalJsonDigest(observation),
      result_digest: fixtureArtifact.record.digest,
      record_path: recordPath,
      record_pre_sha256: null,
      record_sha256: recordSha,
      changelog_path: changelogPath,
      changelog_pre_sha256: null,
      changelog_sha256: digest(Buffer.from('')),
      before_digest: null,
    } satisfies Omit<ObservedResearchRecordPlan, 'digest'>;
    const plan: ObservedResearchRecordPlan = { ...planBody, digest: canonicalJsonDigest(planBody) };
    entries.push({
      artifact_id: artifactRecordId(fixtureArtifact.record),
      schema: fixtureArtifact.schema,
      stage_id: fixtureArtifact.stage.id,
      path: recordPath,
      sha256: recordSha,
      source_revision: sourceRevision,
      scope_id: 'packet-test-scope',
      ac_ids: ['AC-1'],
    });
    completed.push({
      step_id: fixtureArtifact.stage.id,
      items: [
        {
          request: packetSessionRequest(
            fixtureArtifact.stage.id,
            input.selection.intent,
            sourceRevision,
            input.host.work.binding.config_digest,
            fixtureArtifact.action,
            input.selection,
            fixtureArtifact.assignment_index,
          ),
          issue_id: fixtureArtifact.issue,
          observation,
          research_activation: { plan: activationPlan, use: activationUse },
          research_normalization: plan,
        },
      ],
    });
  }
  const work = { ...input.host.work, artifacts: entries };
  const host = { ...input.host, work };
  const state: MastraSessionLedgerState = { ...input.ledger.state, completed };
  return {
    ...input,
    host,
    ledger: {
      ...input.ledger,
      version: { revision: 2, digest: canonicalJsonDigest(state) },
      state,
    },
    artifactPaths: artifacts.map((item) => path.join(recordsRoot, `${artifactRecordId(item.record)}${item.suffix}`)),
  };
}

function packetWithDescription(input: ReturnType<typeof controlledPacketSnapshot>, description: string) {
  const workItem = { ...input.workItem, description };
  const hostWork = {
    ...input.host.work,
    binding: { ...input.host.work.binding, work_item_digest: canonicalJsonDigest(workItem) },
  };
  return { ...input, workItem, host: { ...input.host, work: hostWork } };
}

type FrontierRepairPacketSeed = NonNullable<Parameters<typeof configuredFrontierRepairFixture>[4]>;

function frontierRepairPacketSeed(
  input: Omit<FrontierRepairPacketSeed, 'ledger'> & {
    readonly ledger: { readonly state: Pick<MastraSessionLedgerState, 'source_scope' | 'completed'> };
  },
): FrontierRepairPacketSeed {
  return {
    workItem: input.workItem,
    selection: input.selection,
    host: { work: input.host.work },
    ledger: {
      state: {
        source_scope: requiredValue(input.ledger.state.source_scope, 'frontier repair source scope'),
        completed: input.ledger.state.completed,
      },
    },
  };
}

function requiredValue<T>(value: T | null | undefined, label: string): T {
  if (value === undefined || value === null) throw new Error(`packet fixture is missing ${label}`);
  return value;
}

function requiredAt<T>(values: readonly T[], index: number, label: string): T {
  return requiredValue(values[index], label);
}

function artifactRecordId(record: { readonly result_id: string } | { readonly bundle_id: string }): string {
  return 'result_id' in record ? record.result_id : record.bundle_id;
}

function packetSessionRequest(
  stageId: string,
  workflowId: WorkItemSelection['intent'],
  scopeDigest: string,
  configDigest: string,
  actionId: string,
  selection: WorkItemSelection | null = null,
  assignmentIndex: number = 0,
): SessionBridgeRequest {
  const plan = selection ? compileDevelopmentWorkflow(config, selection.team, workflowId, selection.risk_flags) : null;
  const waveIndex = plan?.waves.findIndex((wave) => wave.some((stage) => stage.id === stageId)) ?? 0;
  const action = selection
    ? requiredValue(
        sessionActionsForWave(
          config,
          selection,
          { work_id: 'packet-test-work', attempt: 1, scope_digest: scopeDigest },
          workflowId,
          waveIndex,
          [],
        ).find((candidate) => candidate.stage_id === stageId && candidate.assignment_index === assignmentIndex),
        'configured packet session action',
      )
    : null;
  return {
    schema: 'VidaSessionRequest/v1',
    run_id: 'packet-test-run',
    workflow_id: workflowId,
    wave_index: waveIndex,
    action_id: actionId,
    assignment_index: assignmentIndex,
    stage_id: stageId,
    role: action?.role ?? 'packet-fixture-agent',
    config_digest: configDigest,
    scope_digest: scopeDigest,
    bindings_manifest_ref: canonicalJsonDigest({ stageId, workflowId, scopeDigest, configDigest, actionId }),
  };
}

function packetObservation(
  issueId: string,
  actionId: string,
  summary: string,
  evidenceRefs: readonly string[] = [],
): SessionBridgeObservation {
  return {
    schema: 'VidaSessionObservation/v1',
    issue_id: issueId,
    action_id: actionId,
    agent_id: 'packet-fixture-agent',
    tool_call_ref: `packet-fixture:${actionId}`,
    status: 'reported_complete',
    summary,
    output_digest: canonicalJsonDigest(summary),
    evidence_refs: [...evidenceRefs],
  };
}

function packetLedgerSnapshot(
  previous: Parameters<typeof buildAdmittedDevelopmentPacket>[0]['ledger'],
  state: MastraSessionLedgerState,
  revision: number,
): Parameters<typeof buildAdmittedDevelopmentPacket>[0]['ledger'] {
  return { ...previous, version: { revision, digest: canonicalJsonDigest(state) }, state };
}

function recordValue(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`packet fixture ${label} is not a record`);
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function withObservationSummary(state: MastraSessionLedgerState, summary: string) {
  return {
    ...state,
    completed: state.completed.map((wave) => ({
      ...wave,
      items: wave.items.map((item) =>
        item.observation === null ? item : { ...item, observation: { ...item.observation, summary } },
      ),
    })),
  };
}

function expectPublicPacketDenial(value: unknown, denial: RegExp): void {
  const boundary: unknown = Reflect.get({ buildAdmittedDevelopmentPacket }, 'buildAdmittedDevelopmentPacket');
  if (typeof boundary !== 'function') throw new Error('packet public boundary is unavailable');
  const invoke = (): void => {
    Reflect.apply(boundary, undefined, [value]);
  };
  expect(invoke).toThrow(denial);
}

describe('admitted development packet', () => {
  test('projects human description line breaks without changing the admitted work item', () => {
    const input = controlledPacketSnapshot();
    const description = 'First requirement.\r\nSecond requirement.\tKeep both.';
    const described = packetWithDescription(input, description);
    const boundDigest = described.host.work.binding.work_item_digest;
    const packet = buildAdmittedDevelopmentPacket(described);
    expect(packet.objective).toBe('First requirement.  Second requirement. Keep both.');
    expect(input.workItem.description).not.toBe(description);
    expect(described.workItem.description).toBe(description);
    expect(described.host.work.binding.work_item_digest).toBe(boundDigest);
  });

  test('keeps other controls and sensitive assignments rejected in the projected objective', () => {
    for (const description of ['Requirement\u0000payload', 'Requirement\u001bpayload', 'token=not-for-packet']) {
      const input = controlledPacketSnapshot();
      expect(() => buildAdmittedDevelopmentPacket(packetWithDescription(input, description))).toThrow(
        /packet objective/,
      );
    }
  });

  test('preserves exact denial through the unknown public boundary without granting packet authority', () => {
    expectPublicPacketDenial(null, /Cannot destructure property/);
    expectPublicPacketDenial({}, /runtime config must come from loadRuntimeConfig/);
  });

  test('keeps an absent new file truthful and derives stable task content', () => {
    const input = controlledPacketSnapshot();
    const first = buildAdmittedDevelopmentPacket(input);
    const second = buildAdmittedDevelopmentPacket(input);
    expect(first).toEqual(second);
    expect(first.in_scope).toEqual([input.target]);
    expect(first.owned_paths).toEqual(input.allowedPaths);
    expect(first.code_evidence_refs).toEqual([]);
    expect(first.skill_refs).toEqual([]);
    expect(first.documentation_refs).toEqual([]);
    expect(first.acceptance).toEqual(['AC-1: The scoped file is created.']);
    expect(first.expected_tests).toEqual(['Run the focused acceptance check.']);
  });

  test('continued packet retains only exact Host-bound original contracts and observed task synthesis', () => {
    const originalInput = controlledPacketSnapshot('task_execution', 'medium', '5'.repeat(64));
    const originalWork = structuredClone(originalInput.host.work);
    writeFileSync(path.join(root, originalInput.target), 'export const changed = true;');
    const source = snapshotDeclaredSources(requireSafeRepositoryAccess(root), originalInput.allowedPaths);
    const { receipt } = configuredFrontierRepairFixture(
      true,
      false,
      { config, root, workspaceId: originalWork.workspace_id },
      'implementation',
      frontierRepairPacketSeed(originalInput),
      source,
    );
    const work = receipt.successor_work,
      state = receipt.successor_journal;
    const current = {
      ...originalInput,
      host: { ...originalInput.host, work, ledger: receipt.successor_ledger },
      ledger: { ...originalInput.ledger, state, version: receipt.journal_version },
    };
    const sourceStore = {
      snapshotCurrentTaskSourceSources: () => source,
      readDeliveredWorkContinuationReceipt: () => receipt,
    };
    expect(() => buildAdmittedDevelopmentPacket(current)).toThrow(/scope, acceptance or thread/);
    const packet = buildAdmittedDevelopmentPacket({ ...current, sourceStore });
    const configuredStore = { ...sourceStore, readQualifiedRuntimeCodeContinuations: () => [] };
    expect(buildAdmittedDevelopmentPacket({ ...current, sourceStore: configuredStore }).source_revision).toBe(
      source.digest,
    );
    const baseView = { original: receipt, recovery: null };
    expect(configuredFrontierRecoveryViewDigest({ ...baseView, runtimeCodeContinuations: [] })).toBe(
      configuredFrontierRecoveryViewDigest(baseView),
    );
    const nextCode = canonicalJsonDigest('fixture-qualified-next-code');
    const codeRequest = validateQualifiedRuntimeCodeContinuationRequest({
      schema: 'QualifiedRuntimeCodeContinuationRequest/v1',
      identity: receipt.request.identity,
      attempt: receipt.attempt,
      nativeSessionHandle: receipt.request.nativeSessionHandle,
      leaseGeneration: 1,
      expectedWork: receipt.work_version,
      expectedLedger: receipt.ledger_version,
      expectedJournal: receipt.journal_version,
      expectedMaintenanceGeneration: 0,
      originalSourceScopeDigest: work.binding.work_source_revision,
      journalSourceScopeDigest: requiredValue(state.source_scope, 'continued journal source scope').digest,
      oldRuntimeCodeDigest: work.binding.runtime_code_digest,
      currentRuntimeCodeDigest: nextCode,
      oldRuntimeCodePaths: ['packages/agent/bin/run.mjs'],
      currentRuntimeCodePaths: ['packages/agent/bin/run.mjs'],
      oldManifestRef: '.tmp/fixture/old.json',
      oldManifestDigest: canonicalJsonDigest('fixture-old-manifest'),
      oldInstallRef: '.tmp/fixture/old-install.json',
      currentManifestRef: '.tmp/fixture/next.json',
      currentManifestDigest: canonicalJsonDigest('fixture-next-manifest'),
      currentInstallRef: '.tmp/fixture/next-install.json',
      systemUpdateRef: '.tmp/fixture/next-install.json',
      systemUpdateOperationId: 'fixture-next-operation',
      nativeSelfAttestationDigest: canonicalJsonDigest('fixture-self'),
    });
    const nextWork = {
      ...work,
      revision: work.revision + 1,
      binding: { ...work.binding, runtime_code_digest: nextCode, runtime_source_revision: nextCode },
      lifecycle: {
        ...work.lifecycle,
        revision: work.lifecycle.revision + 1,
        config_binding: { ...work.lifecycle.config_binding, runtime_code_digest: nextCode },
      },
    };
    const codeReceipt = validateQualifiedRuntimeCodeContinuationReceipt({
      schema: 'QualifiedRuntimeCodeContinuationReceipt/v1',
      request: codeRequest,
      request_digest: canonicalJsonDigest(codeRequest),
      protected_work_digest: runtimeCodeContinuationProtectedWorkDigest(work),
      work_version: { revision: nextWork.revision, digest: canonicalJsonDigest(nextWork) },
      endpoint_proof: {
        oldRuntime: {
          codeDigest: codeRequest.oldRuntimeCodeDigest,
          codePaths: codeRequest.oldRuntimeCodePaths,
          manifestRef: codeRequest.oldManifestRef,
          manifestDigest: codeRequest.oldManifestDigest,
          installRef: codeRequest.oldInstallRef,
        },
        currentRuntime: {
          codeDigest: codeRequest.currentRuntimeCodeDigest,
          codePaths: codeRequest.currentRuntimeCodePaths,
          manifestRef: codeRequest.currentManifestRef,
          manifestDigest: codeRequest.currentManifestDigest,
          installRef: codeRequest.currentInstallRef,
        },
        systemUpdate: { ref: codeRequest.systemUpdateRef, operationId: codeRequest.systemUpdateOperationId },
        nativeSelfAttestationDigest: codeRequest.nativeSelfAttestationDigest,
      },
      status: 'adopted',
      rights_granted: false,
      accepted_result: false,
      runtime_acceptance: false,
    });
    const adoptedView = { ...baseView, runtimeCodeContinuations: [codeReceipt] };
    expect(configuredFrontierRecoveryViewDigest(adoptedView)).not.toBe(configuredFrontierRecoveryViewDigest(baseView));
    const adoptedStore = { ...sourceStore, readQualifiedRuntimeCodeContinuations: () => [codeReceipt] };
    expect(
      buildAdmittedDevelopmentPacket({
        ...current,
        host: { ...current.host, work: nextWork },
        sourceStore: adoptedStore,
      }).source_revision,
    ).toBe(source.digest);
    expect(packet.source_revision).toBe(source.digest);
    expect(packet.acceptance).toEqual(['AC-1: The scoped file is created.']);
    expect(packet.implementation_constraints.some((value) => value.includes('Baseline task synthesis summary'))).toBe(
      true,
    );
    expect(packet.code_evidence_refs).toEqual([originalInput.target]);
    const corrupted = withObservationSummary(state, 'changed protected body');
    expect(() =>
      buildAdmittedDevelopmentPacket({
        ...current,
        sourceStore,
        ledger: packetLedgerSnapshot(current.ledger, corrupted, 2),
      }),
    ).toThrow(/completed prefix/);
    const foreign = { ...receipt, successor_binding: { ...work.binding, scope_id: 'foreign-scope' } };
    expect(() =>
      buildAdmittedDevelopmentPacket({
        ...current,
        sourceStore: { ...sourceStore, readDeliveredWorkContinuationReceipt: () => foreign },
      }),
    ).toThrow(/future configured-frontier snapshot, prefix or prior CAS differs/);
  });

  test('continued packet preserves exact original typed research and synthesis with changed current Source', () => {
    const input = addObservedSynthesis(
      controlledPacketSnapshot('implementation_change', 'medium', '5'.repeat(64)),
      true,
    );
    try {
      const priorWork = structuredClone(input.host.work);
      writeFileSync(path.join(root, input.target), 'export const continued = true;');
      const source = snapshotDeclaredSources(requireSafeRepositoryAccess(root), input.allowedPaths);
      const { receipt } = configuredFrontierRepairFixture(
        true,
        false,
        { config, root, workspaceId: priorWork.workspace_id },
        'implementation',
        frontierRepairPacketSeed(input),
        source,
      );
      const work = receipt.successor_work,
        state = receipt.successor_journal;
      const current = {
        ...input,
        host: { ...input.host, work, ledger: receipt.successor_ledger },
        ledger: {
          ...input.ledger,
          state,
          version: receipt.journal_version,
        },
        sourceStore: {
          snapshotCurrentTaskSourceSources: () => source,
          readDeliveredWorkContinuationReceipt: () => receipt,
        },
      };
      const packet = buildAdmittedDevelopmentPacket(current);
      expect(packet.source_revision).toBe(source.digest);
      expect(packet.research_artifact_refs.length).toBe(4);
      expect(packet.implementation_constraints.some((value) => value.includes('Unique synthesis requirement'))).toBe(
        true,
      );
      const damaged = withObservationSummary(state, 'changed protected research');
      expect(() =>
        buildAdmittedDevelopmentPacket({
          ...current,
          ledger: packetLedgerSnapshot(current.ledger, damaged, 2),
        }),
      ).toThrow(/completed prefix/);
    } finally {
      for (const artifactPath of input.artifactPaths) rmSync(artifactPath, { force: true });
    }
  });

  test('keeps high lifecycle risk separate from raw WorkItem and packet risk flags', () => {
    const input = controlledPacketSnapshot('task_execution', 'high');
    const packet = buildAdmittedDevelopmentPacket(input);

    expect(input.host.work.lifecycle.risk).toBe('high');
    expect(input.workItem.intent).toBe('task_execution');
    expect(input.workItem.risk_flags).toEqual([]);
    expect(packet.work_item).toMatchObject({ intent: 'task_execution', risk_flags: [] });
    expect(packet.risk_flags).toEqual([]);
  });

  test('projects a digest-bound task synthesis observation into the next packet', () => {
    const input = controlledPacketSnapshot();
    const taskWorkflow = config.workflows.task_execution;
    if (!taskWorkflow) throw new Error('configured task workflow is missing');
    const stage = requiredValue(
      taskWorkflow.stages.find((entry) => entry.produces.includes('DevelopmentTaskPacket/v1')),
      'task synthesis stage',
    );
    const summary = 'Unique task synthesis requirement: preserve the current file format.';
    const item = {
      request: packetSessionRequest(
        stage.id,
        'task_execution',
        input.host.work.binding.work_source_revision,
        input.host.work.binding.config_digest,
        'b'.repeat(64),
      ),
      issue_id: '22222222-2222-4222-8222-222222222222',
      observation: packetObservation('22222222-2222-4222-8222-222222222222', 'b'.repeat(64), summary),
    };
    const state = {
      ...input.ledger.state,
      completed: [...input.ledger.state.completed, { step_id: stage.id, items: [item] }],
    };
    const withSynthesis = {
      ...input,
      ledger: packetLedgerSnapshot(input.ledger, state, 2),
    };
    const packet = buildAdmittedDevelopmentPacket(withSynthesis);
    expect(packet.implementation_constraints).toContain(
      `Observed task synthesis ${item.request.action_id}/${canonicalJsonDigest(summary)}: ${summary}`,
    );

    const staleState = {
      ...state,
      completed: [
        ...input.ledger.state.completed,
        {
          step_id: stage.id,
          items: [{ ...item, observation: { ...item.observation, output_digest: 'c'.repeat(64) } }],
        },
      ],
    };
    expect(() =>
      buildAdmittedDevelopmentPacket({
        ...withSynthesis,
        ledger: packetLedgerSnapshot(withSynthesis.ledger, staleState, 3),
      }),
    ).toThrow(/task synthesis summary is missing, stale, mismatched or over budget/);
  });

  test('projects task synthesis line breaks while retaining its raw observation and digest', () => {
    const input = controlledPacketSnapshot();
    const wave = requiredAt(input.ledger.state.completed, 0, 'task synthesis wave');
    const item = requiredAt(wave.items, 0, 'task synthesis item');
    const priorObservation = requiredValue(item.observation, 'task synthesis observation');
    const summary = 'alpha\rbravo\ncharlie\tdelta';
    const outputDigest = canonicalJsonDigest(summary);
    const observation = { ...priorObservation, summary, output_digest: outputDigest };
    const state = {
      ...input.ledger.state,
      completed: [{ ...wave, items: [{ ...item, observation }] }],
    };
    const withSynthesis = {
      ...input,
      ledger: packetLedgerSnapshot(input.ledger, state, 2),
    };

    const packet = buildAdmittedDevelopmentPacket(withSynthesis);

    expect(packet.implementation_constraints).toContain(
      `Observed task synthesis ${item.request.action_id}/${outputDigest}: alpha bravo charlie delta`,
    );
    expect(observation.summary).toBe(summary);
    expect(observation.output_digest).toBe(outputDigest);
    expect(packet.implementation_constraints.every((entry) => !/[\r\n\t]/.test(entry))).toBe(true);
  });

  test('keeps task synthesis credential screening and other control rejection fail-closed', () => {
    const withSummary = (summary: string) => {
      const input = controlledPacketSnapshot();
      const wave = requiredAt(input.ledger.state.completed, 0, 'task synthesis wave');
      const item = requiredAt(wave.items, 0, 'task synthesis item');
      const priorObservation = requiredValue(item.observation, 'task synthesis observation');
      const observation = { ...priorObservation, summary, output_digest: canonicalJsonDigest(summary) };
      const state = {
        ...input.ledger.state,
        completed: [{ ...wave, items: [{ ...item, observation }] }],
      };
      return {
        input: { ...input, ledger: packetLedgerSnapshot(input.ledger, state, 2) },
        observation,
      };
    };

    const credential = withSummary('token=\nfake-token');
    expect(() => buildAdmittedDevelopmentPacket(credential.input)).toThrow(/contains sensitive material/);

    for (const control of ['\0', '\v']) {
      const invalid = withSummary(`before${control}after`);
      expect(() => buildAdmittedDevelopmentPacket(invalid.input)).toThrow(/is invalid/);
    }

    const untampered = withSummary('a\nb');
    const tamperedState = withObservationSummary(untampered.input.ledger.state, 'a b');
    const tampered = {
      ...untampered.input,
      ledger: packetLedgerSnapshot(untampered.input.ledger, tamperedState, 3),
    };
    expect(untampered.observation.summary).toBe('a\nb');
    expect(() => buildAdmittedDevelopmentPacket(tampered)).toThrow(
      /task synthesis summary is missing, stale, mismatched or over budget/,
    );
  });

  test('consumes a current validated synthesis artifact and rejects changed artifact bytes', () => {
    const input = addObservedSynthesis(controlledPacketSnapshot('implementation_change'));
    try {
      const packet = buildAdmittedDevelopmentPacket(input);
      const synthesisRef = requiredValue(
        input.host.work.artifacts.find((entry) => entry.schema === 'ResearchSynthesis/v1'),
        'synthesis artifact reference',
      );
      expect(packet.research_artifact_refs).toContain(
        `artifact://research/${synthesisRef.artifact_id}/${synthesisRef.sha256}`,
      );
      expect(
        packet.implementation_constraints.some((entry) =>
          entry.includes('Unique synthesis requirement: preserve the canonical file format.'),
        ),
      ).toBe(true);
      expect(
        packet.implementation_constraints.some((entry) =>
          entry.includes('Synthesis recommendation option-preserve: The source confirms this requirement.'),
        ),
      ).toBe(true);
      expect(packet.implementation_constraints).toContain(
        'Synthesis completeness gap: Synthesis leaves one acceptance question open.',
      );

      const synthesisPath = requiredValue(
        input.artifactPaths.find((entry) => entry.endsWith('.synthesis.json')),
        'synthesis artifact path',
      );
      const originalSynthesisBytes = readFileSync(synthesisPath);
      const parsedForeignRecord: unknown = JSON.parse(originalSynthesisBytes.toString('utf8'));
      const { digest: _originalRecordDigest, ...unsignedForeignRecord } = recordValue(
        parsedForeignRecord,
        'synthesis artifact',
      );
      const foreignRecordBody = { ...unsignedForeignRecord, scope_id: 'foreign-scope' };
      const foreignRecord = { ...foreignRecordBody, digest: canonicalJsonDigest(foreignRecordBody) };
      const foreignBytes = Buffer.from(JSON.stringify(foreignRecord));
      writeFileSync(synthesisPath, foreignBytes);
      const foreignSha = digest(foreignBytes);
      const synthesisItem = requiredValue(
        input.ledger.state.completed
          .flatMap((wave) => wave.items)
          .find((item) => item.request.stage_id === 'synthesize_task'),
        'synthesis ledger item',
      );
      const normalization = requiredValue(synthesisItem.research_normalization, 'synthesis normalization plan');
      const foreignPlanBody = {
        ...normalization,
        record_sha256: foreignSha,
        result_digest: foreignRecord.digest,
      };
      const { digest: _priorPlanDigest, ...unsignedForeignPlan } = foreignPlanBody;
      const foreignPlan = { ...unsignedForeignPlan, digest: canonicalJsonDigest(unsignedForeignPlan) };
      const foreignState = {
        ...input.ledger.state,
        completed: input.ledger.state.completed.map((wave) => ({
          ...wave,
          items: wave.items.map((item) =>
            item === synthesisItem ? { ...item, research_normalization: foreignPlan } : item,
          ),
        })),
      };
      const foreignInput = {
        ...input,
        host: {
          ...input.host,
          work: {
            ...input.host.work,
            artifacts: input.host.work.artifacts.map((entry) =>
              entry.schema === 'ResearchSynthesis/v1' ? { ...entry, sha256: foreignSha } : entry,
            ),
          },
        },
        ledger: {
          ...input.ledger,
          version: { revision: 3, digest: canonicalJsonDigest(foreignState) },
          state: foreignState,
        },
      };
      expect(() => buildAdmittedDevelopmentPacket(foreignInput)).toThrow(/synthesis differs from admitted work/);

      writeFileSync(synthesisPath, originalSynthesisBytes);
      writeFileSync(synthesisPath, `${readFileSync(synthesisPath, 'utf8')} `);
      expect(() => buildAdmittedDevelopmentPacket(input)).toThrow(/synthesis artifact bytes changed/);
    } finally {
      for (const artifactPath of input.artifactPaths) rmSync(artifactPath, { force: true });
    }
  });

  test('rejects changed accepted bytes and missing substantive research artifact', () => {
    const input = controlledPacketSnapshot();
    expect(() => buildAdmittedDevelopmentPacket({ ...input, acceptanceBytes: Buffer.from('{}') })).toThrow(
      /scope or acceptance bytes differ/,
    );
    const research = controlledPacketSnapshot('implementation_change');
    expect(() => buildAdmittedDevelopmentPacket(research)).toThrow(/typed research artifact/);
    const implementationWorkflow = config.workflows.implementation_change;
    if (!implementationWorkflow) throw new Error('configured implementation workflow is missing');
    const researchStage = requiredValue(
      implementationWorkflow.stages.find((stage) => stage.produces.includes('ResearchResult/v1')),
      'implementation research stage',
    );
    const researchIssue = '33333333-3333-4333-8333-333333333333';
    const researchAction = 'a'.repeat(64);
    const researchState = {
      ...research.ledger.state,
      completed: [
        ...research.ledger.state.completed,
        {
          step_id: researchStage.id,
          items: [
            {
              request: packetSessionRequest(
                researchStage.id,
                'implementation_change',
                research.host.work.binding.work_source_revision,
                research.host.work.binding.config_digest,
                researchAction,
              ),
              issue_id: researchIssue,
              observation: packetObservation(
                researchIssue,
                researchAction,
                'A complete research observation with no admitted normalization.',
                [`artifact://research/foreign-result/${'a'.repeat(64)}`],
              ),
            },
          ],
        },
      ],
    };
    const foreign = {
      ...research,
      ledger: packetLedgerSnapshot(research.ledger, researchState, 2),
    };
    expect(() => buildAdmittedDevelopmentPacket(foreign)).toThrow(/canonical normalization reservation/);
  });

  test('accepts the observed sanctioned write and keeps identity after later validator reports', () => {
    const input = controlledPacketSnapshot();
    writeFileSync(path.join(root, input.target), 'export const created = true;');
    const source = snapshotDeclaredSources(requireSafeRepositoryAccess(root), input.allowedPaths);
    const state = { ...input.ledger.state, source_scope: source };
    const afterWrite = {
      ...input,
      ledger: packetLedgerSnapshot(input.ledger, state, 2),
    };
    const packet = buildAdmittedDevelopmentPacket(afterWrite);
    expect(packet.source_revision).toBe(input.host.work.binding.work_source_revision);
    expect(packet.code_evidence_refs).toEqual([input.target]);
    const validatorState = {
      ...state,
      completed: [
        ...state.completed,
        {
          step_id: 'validate_parallel',
          items: [
            {
              request: packetSessionRequest(
                'validate',
                'task_execution',
                input.host.work.binding.work_source_revision,
                input.host.work.binding.config_digest,
                'c'.repeat(64),
              ),
              issue_id: '44444444-4444-4444-8444-444444444444',
              observation: packetObservation(
                '44444444-4444-4444-8444-444444444444',
                'c'.repeat(64),
                'Validation remained complete after implementation.',
              ),
            },
          ],
        },
      ],
    };
    const later = {
      ...afterWrite,
      ledger: packetLedgerSnapshot(afterWrite.ledger, validatorState, 3),
    };
    const repeated = buildAdmittedDevelopmentPacket(later);
    expect(repeated.packet_id).toBe(packet.packet_id);
    expect(repeated.digest).toBe(packet.digest);
  });
});
