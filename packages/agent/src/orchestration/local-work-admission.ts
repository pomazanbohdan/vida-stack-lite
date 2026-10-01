import { createHash } from 'node:crypto';
import Ajv2020 from 'ajv/dist/2020.js';
import acceptanceSchema from '../../schemas/acceptance-manifest.v1.schema.json' with { type: 'json' };
import scopeSchema from '../../schemas/implementation-scope.v1.schema.json' with { type: 'json' };
import {
  type AgentRuntimeConfig,
  type WorkItemSelection,
  runtimeConfigDigest,
  runtimePackageAccess,
  runtimePackageCodePaths,
  selectWorkflow,
} from '../config/runtime-config.js';
import { requireSafeRepositoryAccess } from '../config/safe-repository-access.js';
import { loadProjectSetContext } from '../config/project-context.js';
import { canonicalJson, canonicalJsonDigest } from '../contracts/public-ingress.js';
import { HostStateStore, completedSourceJournalObservationMatches, type HostStateSnapshot, type WorkIdentity, type StateVersion } from '../host-state.js';
import {
  type ScopedSourceSnapshot,
  snapshotDeclaredSources,
  snapshotRuntimePackageSources,
} from './scoped-source-snapshot.js';
import { type SessionHandoffContext } from './session-handoff.js';
import { sessionBridgeRunId } from './mastra-session-bridge.js';
import { readLocalSourceWriteAuthorization } from './local-source-authorization.js';
import {
  validateObservedResearchRecordPlan,
  validateResearchResult,
  validateResearchSynthesis,
} from '../research-decision.js';

const Ajv2020Constructor = Ajv2020 as unknown as new (options: { strict: boolean; allErrors: boolean }) => {
  compile(schema: object): (value: unknown) => boolean;
};
const validator = new Ajv2020Constructor({ strict: true, allErrors: true });
const validScope = validator.compile(scopeSchema);
const validAcceptance = validator.compile(acceptanceSchema);
const digest = (bytes: Buffer): string => createHash('sha256').update(bytes).digest('hex');

export interface LocalWorkAdmissionInput {
  readonly repositoryRoot: string;
  readonly config: AgentRuntimeConfig;
  readonly store: HostStateStore;
  readonly selection: WorkItemSelection;
  readonly context: SessionHandoffContext;
  readonly nativeSessionHandle: string;
  readonly workItem: {
    readonly schema: 'WorkItem/v1';
    readonly id: string;
    readonly canonical_kind: string;
    readonly intent: string;
    readonly project_id: string;
    readonly title: string;
    readonly description: string;
    readonly risk_flags: readonly string[];
    readonly labels: readonly string[];
    readonly provider: string;
    readonly provider_type: string;
  };
  readonly scopePath: string;
  readonly acceptancePath: string;
  readonly intakePath?: string;
  readonly sourceAuthorizationPath?: string;
  readonly runtimeCodePaths: readonly string[];
  readonly route: 'R1' | 'R2' | 'R3' | 'R4';
  readonly risk: 'low' | 'medium' | 'high';
  readonly changeKind: 'feature' | 'fix' | 'refactor' | 'migration' | 'documentation' | 'incident';
}

function requireAdmission(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

/** Admit a fresh task with same-work execution fencing, without reserving future files. */
export function admitLocalSessionWork(input: LocalWorkAdmissionInput): {
  readonly host: HostStateSnapshot;
  readonly source: ScopedSourceSnapshot;
} {
  const { repositoryRoot, config, store, selection, context, nativeSessionHandle, workItem } = input;
  requireAdmission(
    nativeSessionHandle.length > 0 && nativeSessionHandle.length <= 256 && !/\p{Cc}/u.test(nativeSessionHandle),
    'native session handle is invalid',
  );
  requireAdmission(store.workspaceId.length === 64, 'local work workspace is invalid');
  const selected = selectWorkflow(config, selection);
  requireAdmission(
    workItem.schema === 'WorkItem/v1' &&
      workItem.id === context.work_id &&
      workItem.canonical_kind === selection.kind &&
      workItem.intent === selection.intent &&
      workItem.project_id === selection.project &&
      workItem.title.length > 0 &&
      Array.isArray(workItem.risk_flags) &&
      Array.isArray(workItem.labels),
    'accepted work item differs from selected task',
  );
  loadProjectSetContext(repositoryRoot, config, config.repository.repository_id, [selection.project]);
  store.recordAdmissionAttempt(context.work_id, context.attempt, {
    workItem,
    nativeSessionHandle,
    context,
    scopePath: input.scopePath,
    acceptancePath: input.acceptancePath,
  });
  const access = requireSafeRepositoryAccess(repositoryRoot);
  const scopeBytes = access.readBytes(input.scopePath, 'accepted implementation scope');
  const acceptanceBytes = access.readBytes(input.acceptancePath, 'accepted acceptance manifest');
  let intakeBytes =
    input.intakePath === undefined ? null : access.readBytes(input.intakePath, 'local session intake');
  if (intakeBytes !== null) {
    requireAdmission(intakeBytes.length <= 32768, 'local session intake exceeds the bounded artifact size');
    const intake = JSON.parse(intakeBytes.toString('utf8')) as { work_item?: unknown };
    requireAdmission(
      canonicalJsonDigest(intake.work_item) === canonicalJsonDigest(workItem),
      'local session intake work item differs from admitted task',
    );
  }
  const scope = JSON.parse(scopeBytes.toString('utf8')) as {
    scope_id: string;
    work_id: string;
    source_revision: string;
    ac_ids: string[];
    allowed_paths: string[];
    implementation_paths: string[];
    documentation_paths?: string[];
    attribution: { thread_id: string; pointer: string };
  };
  const acceptance = JSON.parse(acceptanceBytes.toString('utf8')) as {
    ac_ids: string[];
    source_revision: string;
    scope: string;
  };
  requireAdmission(
    validScope(scope) && validAcceptance(acceptance),
    'accepted work scope or acceptance schema is invalid',
  );
  requireAdmission(
    scope.work_id === context.work_id &&
      scope.attribution.thread_id === nativeSessionHandle &&
      acceptance.scope === scope.scope_id &&
      canonicalJsonDigest(scope.ac_ids) === canonicalJsonDigest(acceptance.ac_ids) &&
      scope.implementation_paths.length > 0 &&
      scope.implementation_paths.every((item) => scope.allowed_paths.includes(item)),
    'accepted task scope, AC or session binding differs',
  );
  const source = snapshotDeclaredSources(access, scope.allowed_paths);
  requireAdmission(
    context.scope_digest === source.digest &&
      scope.source_revision === source.digest &&
      acceptance.source_revision === source.digest,
    'accepted scope or AC source revision is stale',
  );
  const runtimeCode = snapshotRuntimePackageSources(
    runtimePackageAccess(),
    config.runtime.bundle,
    runtimePackageCodePaths(config.runtime.bundle),
  );
  requireAdmission(
    runtimeCode.entries.every((entry) => entry.exists),
    'runtime code binding has a missing file',
  );
  const schemaBytes = runtimePackageAccess().readBytes(
    'schemas/agent-runtime-config.v1.schema.json',
    'runtime schema binding',
  );
  const schemaDigest = digest(schemaBytes);
  const codeDigest = runtimeCode.digest;
  const canonicalIntakePath = input.intakePath === undefined ? null : `.agent/work/${context.work_id}/local-session-intake.v1.json`;
  if(intakeBytes !== null) {
    const raw=JSON.parse(intakeBytes.toString('utf8'));
    intakeBytes=Buffer.from(canonicalJson({...raw,runtime_code_paths:runtimeCode.entries.map(entry=>entry.path)}));
    requireAdmission(intakeBytes.length <= 32768, 'canonical local session intake exceeds the bounded artifact size');
  }
  const configDigest = runtimeConfigDigest(config);
  const sourceAuthorization =
    input.sourceAuthorizationPath === undefined
      ? null
      : readLocalSourceWriteAuthorization(repositoryRoot, input.sourceAuthorizationPath);
  if (sourceAuthorization !== null) {
    const authorized = sourceAuthorization.authorization;
    requireAdmission(
      authorized.work_id === context.work_id &&
        authorized.attempt === context.attempt &&
        authorized.scope_digest === source.digest &&
        authorized.config_digest === configDigest &&
        authorized.workflow_id === selected.workflow_id &&
        authorized.native_session_handle === nativeSessionHandle &&
        canonicalJsonDigest([...authorized.implementation_paths].sort()) ===
          canonicalJsonDigest([...scope.implementation_paths].sort()) &&
        authorized.stage_ids.every((stageId) => {
          const stage = config.workflows[selected.workflow_id]?.stages.find((entry) => entry.id === stageId);
          return stage?.assignments.some(
            (assignment) => config.agents.profiles[assignment.profile]?.mutation_scope === 'repository_source',
          );
        }),
      'local source authorization differs from admitted scope or configured writer',
    );
  }
  const projectIds = [selection.project];
  const project = loadProjectSetContext(repositoryRoot, config, config.repository.repository_id, projectIds);
  const integration = config.integrations.providers.find((entry) => entry.project_id === selection.project);
  requireAdmission(integration, 'accepted project has no configured integration');
  const identity = {
    repository_id: config.repository.repository_id,
    project_ids: projectIds,
    integrations_digest: project.integrations_digest,
    work_id: context.work_id,
  };
  const before = store.readHostStateSnapshot(identity);
  if (before.work) {
    const admittedIntake=before.work.artifacts.find(artifact=>artifact.artifact_id==='local-session-intake');
    requireAdmission(intakeBytes===null ? !admittedIntake : admittedIntake?.path===canonicalIntakePath &&
      admittedIntake.sha256===digest(intakeBytes) && digest(access.readBytes(admittedIntake.path,'canonical admitted intake'))===admittedIntake.sha256,
      'canonical local work intake retry differs');
    requireAdmission(
      before.work.request_transition?.request_pointer === scope.attribution.pointer &&
        before.work.request_transition.native_session_handle === nativeSessionHandle &&
        before.work.binding.work_item_digest === canonicalJsonDigest(workItem) &&
        before.work.binding.scope_contract_digest === digest(scopeBytes) &&
        before.work.binding.acceptance_manifest_digest === digest(acceptanceBytes) &&
        before.work.binding.work_source_revision === source.digest &&
        before.work.binding.config_digest === configDigest &&
        before.work.binding.runtime_code_digest === codeDigest &&
        before.work.binding.workflow_id === selected.workflow_id &&
        before.work.request_transition.successor_work_id === null,
      'local work retry differs from the admitted successor',
    );
    return { host: before, source };
  }
  if(canonicalIntakePath !== null && intakeBytes !== null) {
    access.ensureDirectory(`.agent/work/${context.work_id}`,'canonical intake directory');
    if(access.fileExists(canonicalIntakePath,'canonical intake existence'))
      requireAdmission(access.readBytes(canonicalIntakePath,'canonical intake existing bytes').equals(intakeBytes),'canonical intake publication differs');
    else access.writeExclusive(canonicalIntakePath,intakeBytes.toString('utf8'),'canonical local session intake');
  }
  const ticketId = 'ticket-' + canonicalJsonDigest({ identity, nativeSessionHandle }).slice(0, 40);
  const resources = ['execution:' + context.work_id];
  const allowedResources = [...scope.allowed_paths.map((item) => 'file:' + item), ...resources].sort();
  const now = new Date().toISOString();
  const expiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const claimId = 'claim-' + canonicalJsonDigest({ ticketId, source: source.digest }).slice(0, 40);
  const generation = before.ledger?.open_generation ?? 1;
  const sequence = before.ledger?.next_sequence ?? 1;
  const sourceRevision = source.digest;
  const binding = {
    repository_id: identity.repository_id,
    project_ids: projectIds,
    integrations_digest: identity.integrations_digest,
    team_id: selection.team,
    workflow_id: selected.workflow_id,
    provider_work_item_id: workItem.id,
    lifecycle_work_id: context.work_id,
    work_item_digest: canonicalJsonDigest(workItem),
    work_source_revision: sourceRevision,
    scope_id: scope.scope_id,
    scope_contract_digest: digest(scopeBytes),
    acceptance_manifest_digest: digest(acceptanceBytes),
    ac_ids: scope.ac_ids,
    implementation_paths: scope.implementation_paths,
    allowed_resources: allowedResources,
    config_digest: configDigest,
    runtime_source_revision: codeDigest,
    schema_digest: schemaDigest,
    runtime_code_digest: codeDigest,
  };
  const ticket = {
    schema: 'CoordinationTicket/v1' as const,
    ticket_id: ticketId,
    repository_id: identity.repository_id,
    project_ids: projectIds,
    integrations_digest: identity.integrations_digest,
    work_id: context.work_id,
    thread_id: nativeSessionHandle,
    source_revision: sourceRevision,
    generation,
    sequence,
    contour_keys: [
      `tenant:${integration.tenant_id}`,
      `project:${integration.tenant_id}/${selection.project}`,
      ...resources,
    ],
    exclusive_resources: resources,
    status: 'active' as const,
    claim_ids: [claimId],
    expires_at: expiry,
    active_resources: resources,
    blocked_resources: [],
    created_at: now,
  };
  const claim = {
    schema: 'WorkstreamClaim/v1' as const,
    claim_id: claimId,
    ticket_id: ticketId,
    work_id: context.work_id,
    thread_id: nativeSessionHandle,
    generation,
    resources,
    lease_expires_at: expiry,
    status: 'active' as const,
    created_at: now,
    renewed_at: now,
  };
  const nextWork = {
    schema: 'WorkState/v1' as const,
    workspace_id: store.workspaceId,
    revision: 1,
    binding,
    contracts: {
      scope: {
        schema: 'ImplementationScope/v1' as const,
        path: input.scopePath,
        sha256: binding.scope_contract_digest,
      },
      acceptance: {
        schema: 'AcceptanceManifest/v1' as const,
        path: input.acceptancePath,
        sha256: binding.acceptance_manifest_digest,
      },
      decisions: [],
    },
    lease: { ticket_id: ticketId, thread_id: nativeSessionHandle, generation },
    execution: {
      run_id: sessionBridgeRunId(store.workspaceId, context, selected.workflow_id),
      input_digest: canonicalJsonDigest({
        workItem,
        scope: binding.scope_contract_digest,
        acceptance: binding.acceptance_manifest_digest,
        source: source.digest,
      }),
      phase: 'implementation',
      status: 'active' as const,
      assignment_attempts: [],
    },
    lifecycle: {
      schema: 'LifecycleState/v1' as const,
      revision: 1,
      phase: 'INTAKE' as const,
      source_revision: sourceRevision,
      next_action: 'Execute the accepted configured workflow.',
      route: input.route,
      risk: input.risk,
      change_kind: input.changeKind,
      config_binding: { config_digest: configDigest, schema_digest: schemaDigest, runtime_code_digest: codeDigest },
      scope: {
        scope_id: scope.scope_id,
        allowed_paths: scope.allowed_paths,
        fingerprint_paths: scope.allowed_paths,
        implementation_paths: scope.implementation_paths,
        documentation_paths: scope.documentation_paths ?? [],
      },
      seal: null,
      assurance: {
        epoch: 'epoch-' + context.attempt,
        review_generation: 0,
        correction_count: 0,
        review_failure_count: 0,
        delivery_cycle_id: null,
      },
      references:
        sourceAuthorization === null
          ? []
          : [
              {
                schema: 'LifecycleArtifactReference/v1' as const,
                kind: 'execution_approval' as const,
                artifact_schema: 'LocalSourceWriteAuthorization/v1',
                record_id: sourceAuthorization.authorization.user_instruction_ref,
                path: input.sourceAuthorizationPath!,
                sha256: sourceAuthorization.sha256,
                source_revision: sourceRevision,
                scope_id: scope.scope_id,
                ac_ids: scope.ac_ids,
                generation: null,
                implementation_fingerprint: null,
                delivery_cycle_id: null,
                principal: 'local-session:' + canonicalJsonDigest(nativeSessionHandle),
                decision: 'approved' as const,
                disposition: 'current' as const,
              },
            ],
    },
    artifacts:
      intakeBytes === null
        ? []
        : [
            {
              artifact_id: 'local-session-intake',
              schema: 'VidaLocalSessionIntake/v1',
              path: canonicalIntakePath!,
              sha256: digest(intakeBytes),
              stage_id: 'intake',
              source_revision: sourceRevision,
              scope_id: scope.scope_id,
              ac_ids: scope.ac_ids,
            },
          ],
  };
  const oldLedger = before.ledger;
  const nextLedger = oldLedger
    ? {
        ...oldLedger,
        revision: oldLedger.revision + 1,
        next_sequence: oldLedger.next_sequence + 1,
        tickets: [...oldLedger.tickets, ticket],
        claims: [...oldLedger.claims, claim],
      }
    : {
        schema: 'CoordinationLedger/v1' as const,
        workspace_id: store.workspaceId,
        revision: 1,
        open_generation: generation,
        next_sequence: 2,
        tickets: [ticket],
        claims: [claim],
        notices: [],
        dispositions: [],
        contours: [],
        batches: [],
        rebinds: [],
        operations: [],
        retirements: [],
      };
  const predecessors: Parameters<HostStateStore['admitSuccessorWork']>[0]['predecessors'][number][] = [];
  const verifyPredecessor = (
    work: NonNullable<HostStateSnapshot['work']>,
    journal: Readonly<Record<string, unknown>>,
    requestPointer: string,
  ) => {
    requireAdmission(work.binding.config_digest === configDigest, 'predecessor configured rights are stale');
    const priorScopeBytes = access.readBytes(work.contracts.scope.path, 'predecessor bound implementation scope');
    requireAdmission(digest(priorScopeBytes) === work.contracts.scope.sha256, 'predecessor scope artifact changed');
    const priorScope = JSON.parse(priorScopeBytes.toString('utf8')) as typeof scope;
    requireAdmission(
      validScope(priorScope) &&
        priorScope.work_id === work.binding.lifecycle_work_id &&
        priorScope.attribution.thread_id === nativeSessionHandle &&
        priorScope.attribution.pointer.length > 0 &&
        priorScope.attribution.pointer === requestPointer &&
        !/\p{Cc}/u.test(priorScope.attribution.pointer),
      'predecessor request attribution invalid',
    );
    const items = [
      ...(journal.items as {
        request: { stage_id: string; assignment_index: number; role: string };
        issue_id: string | null;
        host_reservation?: unknown;
        research_normalization?: unknown;
        observation?: { status: string; action_id: string; issue_id: string };
      }[]),
      ...(journal.completed as { items: typeof items }[]).flatMap((wave) => wave.items),
    ];
    requireAdmission(
      items.every((item) => {
        const assignment = config.workflows[work.binding.workflow_id]?.stages.find(
          (stage) => stage.id === item.request.stage_id,
        )?.assignments[item.request.assignment_index];
        const profile = assignment && config.agents.profiles[assignment.profile];
        if (item.research_normalization) {
          const plan = validateObservedResearchRecordPlan(item.research_normalization);
          const artifact = work.artifacts.find(
            (entry) =>
              entry.path === plan.record_path &&
              entry.sha256 === plan.record_sha256 &&
              entry.stage_id === item.request.stage_id,
          );
          requireAdmission(
            item.observation?.status === 'reported_complete' &&
              plan.observation_digest === canonicalJsonDigest(item.observation) &&
              artifact &&
              plan.binding.work_id === work.binding.lifecycle_work_id &&
              plan.binding.run_id === work.execution.run_id &&
              plan.binding.scope_id === work.binding.scope_id &&
              plan.binding.scope_digest === work.binding.work_source_revision &&
              plan.binding.config_digest === work.binding.config_digest &&
              plan.binding.issue_id === item.issue_id &&
              plan.binding.action_id === item.observation.action_id,
            'predecessor research normalization is pending or mismatched',
          );
          const bytes = access.readBytes(artifact.path, 'predecessor accepted research provenance');
          requireAdmission(digest(bytes) === artifact.sha256, 'predecessor canonical research artifact changed');
          const record = JSON.parse(bytes.toString('utf8'));
          if (artifact.schema === 'ResearchResult/v1') validateResearchResult(record);
          else if (artifact.schema === 'ResearchSynthesis/v1') validateResearchSynthesis(record);
          else requireAdmission(false, 'predecessor normalized artifact has an unexpected contract');
          requireAdmission(
            record.digest === plan.result_digest &&
              record.work_item_id === work.binding.lifecycle_work_id &&
              record.source_revision === work.binding.work_source_revision &&
              record.scope_id === work.binding.scope_id,
            'predecessor normalized artifact authority differs',
          );
        }
        return (
          assignment?.role === item.request.role &&
          profile &&
          (item.host_reservation ? completedSourceJournalObservationMatches(work,item as never) :
            !(item.issue_id !== null && profile.mutation_scope === 'repository_source'))
        );
      }),
      'predecessor active or reserved source effect prevents absorption',
    );
    if (input.changeKind === 'fix') {
      const oldAcceptanceBytes = access.readBytes(work.contracts.acceptance.path, 'unfinished predecessor acceptance');
      requireAdmission(
        digest(oldAcceptanceBytes) === work.contracts.acceptance.sha256,
        'predecessor acceptance artifact changed',
      );
      const oldAcceptance = JSON.parse(oldAcceptanceBytes.toString('utf8')) as {
        contracts: { id: string; definition: string; sr: string }[];
      };
      const newAcceptance = JSON.parse(acceptanceBytes.toString('utf8')) as typeof oldAcceptance;
      requireAdmission(
        work.binding.ac_ids.every((id) => scope.ac_ids.includes(id)),
        'debug correction must carry unfinished predecessor acceptance',
      );
      requireAdmission(
        oldAcceptance.contracts.every((old) =>
          newAcceptance.contracts.some(
            (current) => current.id === old.id && current.definition === old.definition && current.sr === old.sr,
          ),
        ) && work.binding.implementation_paths.every((item) => scope.implementation_paths.includes(item)),
        'debug correction must preserve unfinished predecessor intent and scope',
      );
    }
  };
  const workspace = store.readWorkspaceSnapshot();
  requireAdmission(
    canonicalJsonDigest(workspace.ledger_version) === canonicalJsonDigest(before.ledgerVersion),
    'coordination changed during successor discovery',
  );
  for (const prior of workspace.work) {
    const work = prior.work!;
    if (
      work.binding.lifecycle_work_id === context.work_id ||
      work.binding.repository_id !== identity.repository_id ||
      canonicalJsonDigest(work.binding.project_ids) !== canonicalJsonDigest(identity.project_ids) ||
      work.binding.integrations_digest !== identity.integrations_digest ||
      work.execution.status === 'complete' ||
      work.lifecycle.phase === 'COMPLETE' ||
      work.request_transition?.successor_work_id != null
    )
      continue;
    const owners =
      workspace.ledger?.tickets.filter(
        (ticket) =>
          ticket.work_id === work.binding.lifecycle_work_id &&
          ticket.repository_id === identity.repository_id &&
          canonicalJsonDigest(ticket.project_ids) === canonicalJsonDigest(identity.project_ids) &&
          ticket.integrations_digest === identity.integrations_digest &&
          ['active', 'queued', 'blocked'].includes(ticket.status),
      ) ?? [];
    if (owners.length === 0 || owners.some((ticket) => ticket.thread_id !== nativeSessionHandle)) continue;
    const priorScopeBytes = access.readBytes(work.contracts.scope.path, 'predecessor request group');
    requireAdmission(digest(priorScopeBytes) === work.contracts.scope.sha256, 'predecessor scope artifact changed');
    const priorScope = JSON.parse(priorScopeBytes.toString('utf8')) as typeof scope;
    requireAdmission(
      validScope(priorScope) &&
        priorScope.attribution.thread_id === nativeSessionHandle &&
        priorScope.attribution.pointer.length > 0,
      'predecessor request group invalid',
    );
    if (priorScope.attribution.pointer === scope.attribution.pointer) continue;
    const priorIdentity = { ...identity, work_id: work.binding.lifecycle_work_id };
    const journal = store.readWorkSessionJournal(priorIdentity);
    requireAdmission(journal && prior.workVersion, 'predecessor bound journal unavailable');
    verifyPredecessor(work, journal.state, priorScope.attribution.pointer);
    predecessors.push({
      identity: priorIdentity,
      expectedWork: prior.workVersion,
      attempt: journal.attempt,
      expectedJournal: journal.version,
      requestPointer: priorScope.attribution.pointer,
    });
  }
  const host = store.admitSuccessorWork({
    expectedLedger: before.ledgerVersion,
    expectedMaintenanceGeneration: before.maintenanceGeneration,
    nextWork,
    nextLedger,
    nativeSessionHandle,
    requestPointer: scope.attribution.pointer,
    predecessors,
    verifySuccessor: () => {
      requireAdmission(
        digest(access.readBytes(input.scopePath, 'successor current scope')) === binding.scope_contract_digest &&
          digest(access.readBytes(input.acceptancePath, 'successor current acceptance')) ===
            binding.acceptance_manifest_digest &&
          snapshotDeclaredSources(access, scope.allowed_paths).digest === source.digest,
        'successor contracts or source changed before atomic admission',
      );
      if (sourceAuthorization !== null)
        requireAdmission(
          readLocalSourceWriteAuthorization(repositoryRoot, input.sourceAuthorizationPath!).sha256 ===
            sourceAuthorization.sha256,
          'successor source authorization changed before admission',
        );
    },
    verifyCurrent: verifyPredecessor,
  });
  return { host, source };
}

/** Queue or acquire exact ownership immediately before the configured source writer is issued. */
export function acquireLocalSourceWriterLease(input: {
  readonly repositoryRoot: string;
  readonly config: AgentRuntimeConfig;
  readonly store: HostStateStore;
  readonly identity: WorkIdentity;
  readonly nativeSessionHandle: string;
  readonly stageId: string;
  readonly assignmentIndex: number;
  readonly expectedWork: StateVersion;
  readonly expectedLedger: StateVersion;
  readonly expectedSessionJournal?: { readonly attempt: number; readonly version: StateVersion };
}): HostStateSnapshot {
  const before = input.store.readHostStateSnapshot(input.identity);
  const work = before.work;
  const ledger = before.ledger;
  requireAdmission(
    work && ledger && work.lease && work.execution.status === 'active',
    'source writer admission is unavailable',
  );
  requireAdmission(
    canonicalJsonDigest(before.workVersion) === canonicalJsonDigest(input.expectedWork) &&
      canonicalJsonDigest(before.ledgerVersion) === canonicalJsonDigest(input.expectedLedger),
    'source writer admission CAS changed',
  );
  const assignment = input.config.workflows[work.binding.workflow_id]?.stages.find(
    (stage) => stage.id === input.stageId,
  )?.assignments[input.assignmentIndex];
  const profile = assignment && input.config.agents.profiles[assignment.profile];
  requireAdmission(
    profile?.mutation_scope === 'repository_source' &&
      input.config.agents.tool_policies[profile.tools_policy]?.source_write,
    'configured assignment is not a source writer',
  );
  requireAdmission(
    work.binding.config_digest === runtimeConfigDigest(input.config) &&
      work.lease.thread_id === input.nativeSessionHandle,
    'source writer configuration or owner changed',
  );
  const source = snapshotDeclaredSources(
    requireSafeRepositoryAccess(input.repositoryRoot),
    work.lifecycle.scope.allowed_paths,
  );
  requireAdmission(
    source.digest === work.binding.work_source_revision,
    'declared source changed before source writer acquisition',
  );
  const reconciled=input.store.reconcileCompletedSourceOwnership({identity:input.identity,nativeSessionHandle:input.nativeSessionHandle,
    verifyCurrent:()=>requireAdmission(runtimeConfigDigest(input.config)===work.binding.config_digest &&
      snapshotDeclaredSources(requireSafeRepositoryAccess(input.repositoryRoot),work.lifecycle.scope.allowed_paths).digest===source.digest,
      'completed source ownership changed before reconciliation')});
  if(reconciled.workVersion?.digest!==before.workVersion?.digest)
    return acquireLocalSourceWriterLease({...input,expectedWork:reconciled.workVersion!,expectedLedger:reconciled.ledgerVersion!});
  const prior = ledger.tickets.find((ticket) => ticket.ticket_id === work.lease!.ticket_id);
  requireAdmission(
    prior?.status === 'active' &&
      prior.thread_id === input.nativeSessionHandle &&
      prior.generation === work.lease.generation &&
      prior.source_revision === work.binding.work_source_revision,
    'source writer lease ticket changed',
  );
  const resources = [
    ...work.binding.implementation_paths.map((item) => 'file:' + item),
    ...prior.exclusive_resources.filter((resource) => !resource.startsWith('file:')),
  ].sort();
  if (prior.exclusive_resources.some((resource) => resource.startsWith('file:'))) {
    requireAdmission(
      prior.blocked_resources.length === 0 &&
        resources.every((resource) => prior.active_resources.includes(resource)) &&
        Date.parse(prior.expires_at ?? '') > Date.now(),
      'source writer exact ownership is stale',
    );
    return before;
  }
  const queued = ledger.tickets.find(
    (ticket) =>
      ticket.work_id === input.identity.work_id &&
      ticket.status === 'queued' &&
      ticket.thread_id === input.nativeSessionHandle &&
      canonicalJsonDigest(ticket.exclusive_resources) === canonicalJsonDigest(resources),
  );
  const ticketId =
    queued?.ticket_id ??
    'writer-ticket-' + canonicalJsonDigest({ prior: prior.ticket_id, sequence: ledger.next_sequence }).slice(0, 40);
  const sequence = queued?.sequence ?? ledger.next_sequence;
  const conflicts = ledger.tickets.some(
    (ticket) =>
      ticket.ticket_id !== ticketId &&
      ticket.ticket_id !== prior.ticket_id &&
      ticket.sequence < sequence &&
      ['queued', 'active', 'ready_for_handoff', 'blocked'].includes(ticket.status) &&
      ticket.exclusive_resources.some((resource) =>
        resources.some((item) => item.toLowerCase() === resource.toLowerCase()),
      ),
  );
  if (conflicts && queued) throw new Error('source writer ownership is queued behind an earlier exclusive resource');
  const now = new Date().toISOString();
  const expiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const claimId = 'writer-claim-' + canonicalJsonDigest({ ticketId, source: source.digest }).slice(0, 40);
  const ticket = {
    ...prior,
    ticket_id: ticketId,
    sequence,
    generation: queued?.generation ?? ledger.open_generation,
    contour_keys: [...new Set([...prior.contour_keys, ...resources])],
    exclusive_resources: resources,
    status: conflicts ? ('queued' as const) : ('active' as const),
    claim_ids: conflicts ? [] : [claimId],
    expires_at: conflicts ? null : expiry,
    active_resources: conflicts ? [] : resources,
    blocked_resources: conflicts ? resources : [],
    created_at: queued?.created_at ?? now,
  };
  const releasedPrior = {
    ...prior,
    status: 'released' as const,
    active_resources: [],
    blocked_resources: [],
    expires_at: null,
  };
  const nextLedger = {
    ...ledger,
    revision: ledger.revision + 1,
    next_sequence: ledger.next_sequence + (queued ? 0 : 1),
    tickets: [
      ...ledger.tickets.map((item) =>
        item.ticket_id === ticketId ? ticket : !conflicts && item.ticket_id === prior.ticket_id ? releasedPrior : item,
      ),
      ...(queued ? [] : [ticket]),
    ],
    claims: [
      ...ledger.claims.map((claim) =>
        !conflicts && claim.ticket_id === prior.ticket_id && claim.status === 'active'
          ? { ...claim, status: 'released' as const, renewed_at: now }
          : claim,
      ),
      ...(conflicts
        ? []
        : [
            {
              schema: 'WorkstreamClaim/v1' as const,
              claim_id: claimId,
              ticket_id: ticketId,
              work_id: ticket.work_id,
              thread_id: ticket.thread_id,
              generation: ticket.generation,
              resources,
              lease_expires_at: expiry,
              status: 'active' as const,
              created_at: now,
              renewed_at: now,
            },
          ]),
    ],
    operations: [
      ...ledger.operations,
      ...(conflicts
        ? []
        : [
            {
              schema: 'CoordinationOperation/v1' as const,
              operation_id: 'writer-admission-release-' + ticketId,
              kind: 'release' as const,
              ticket_id: prior.ticket_id,
              work_id: prior.work_id,
              thread_id: prior.thread_id,
              source_revision: prior.source_revision,
              resources: [...prior.exclusive_resources],
              from_ledger_revision: ledger.revision,
              to_ledger_revision: ledger.revision + 1,
              decided_by: input.nativeSessionHandle,
              decision_pointer: work.contracts.scope.path,
              created_at: now,
            },
          ]),
    ],
  };
  const host = input.store.compareAndSwapHostState({
    expectedWork: input.expectedWork,
    expectedLedger: input.expectedLedger,
    expectedMaintenanceGeneration: before.maintenanceGeneration,
    ...(input.expectedSessionJournal ? { expectedSessionJournal: input.expectedSessionJournal } : {}),
    nextWork: {
      ...work,
      revision: work.revision + 1,
      lifecycle: { ...work.lifecycle, revision: work.revision + 1 },
      lease: conflicts
        ? work.lease
        : { ticket_id: ticketId, thread_id: ticket.thread_id, generation: ticket.generation },
    },
    nextLedger,
  });
  if (conflicts) throw new Error('source writer ownership is queued behind an earlier exclusive resource');
  return host;
}
