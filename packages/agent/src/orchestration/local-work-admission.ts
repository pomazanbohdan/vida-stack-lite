import { createHash } from 'node:crypto';
import Ajv2020 from 'ajv/dist/2020.js';
import acceptanceSchema from '../../schemas/acceptance-manifest.v1.schema.json' with { type: 'json' };
import scopeSchema from '../../schemas/implementation-scope.v1.schema.json' with { type: 'json' };
import {
  type AgentRuntimeConfig,
  type WorkItemSelection,
  runtimeConfigDigest,
  runtimePackageAccess,
  selectWorkflow,
} from '../config/runtime-config.js';
import { requireSafeRepositoryAccess } from '../config/safe-repository-access.js';
import { loadProjectSetContext } from '../config/project-context.js';
import { canonicalJsonDigest } from '../contracts/public-ingress.js';
import { HostStateStore, type HostStateSnapshot } from '../host-state.js';
import {
  type ScopedSourceSnapshot,
  snapshotDeclaredSources,
  snapshotRuntimePackageSources,
} from './scoped-source-snapshot.js';
import { type SessionHandoffContext } from './session-handoff.js';
import { sessionBridgeRunId } from './mastra-session-bridge.js';
import { readLocalSourceWriteAuthorization } from './local-source-authorization.js';

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

/** Admit only a fresh accepted task; CAS creates its WorkState and shared exact-path lease atomically. */
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
  const access = requireSafeRepositoryAccess(repositoryRoot);
  const scopeBytes = access.readBytes(input.scopePath, 'accepted implementation scope');
  const acceptanceBytes = access.readBytes(input.acceptancePath, 'accepted acceptance manifest');
  const intakeBytes =
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
    attribution: { thread_id: string };
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
    input.runtimeCodePaths,
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
  requireAdmission(before.work === null, 'local work was already admitted');
  const ticketId = 'ticket-' + canonicalJsonDigest({ identity, nativeSessionHandle }).slice(0, 40);
  const claimId = 'claim-' + canonicalJsonDigest({ ticketId, source: source.digest }).slice(0, 40);
  const resources = scope.implementation_paths.map((item) => 'file:' + item).sort();
  const allowedResources = scope.allowed_paths.map((item) => 'file:' + item).sort();
  const now = new Date().toISOString();
  const expiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();
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
              path: input.intakePath!,
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
  const host = store.compareAndSwapHostState({
    expectedWork: null,
    expectedLedger: before.ledgerVersion,
    expectedMaintenanceGeneration: before.maintenanceGeneration,
    nextWork,
    nextLedger,
  });
  return { host, source };
}
