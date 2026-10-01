import path from 'node:path';
import z from 'zod';
import type {
  AssignmentAttempt,
  WorkflowAttemptReceipt,
  WorkflowAttemptApprovalAuthorization,
  MigrationRebindRequest,
  HostStateSnapshot,
  MigrationRebindVerifier,
  WorkIdentity,
  HostStateStore,
} from './host-state.js';
import {
  createFileOperationReservationStore,
  createHostOperationReservationStore,
  requireHostGovernanceCapability,
  createCompositionRootControlKernel,
  createFileWorkflowHostCapabilityWithProof,
  createGovernanceGuard,
  createWorkflowHostAuthenticationProofForCompositionRoot as issueWorkflowHostProof,
  evaluateGovernance,
  loadConfiguredEdictumGovernancePolicy,
  runGovernedWrite,
  type GovernanceBindings,
  type GovernedWriteCommitContext,
  type WorkflowHostCapability,
  type HostGovernanceCapability,
} from './governance/edictum-boundary.js';
import { createConfiguredProjectAuthorizer } from './authorization/cedar-boundary.js';
import {
  loadRuntimeConfig,
  runtimeConfigDigest,
  resolveProviderWorkItemKind,
  selectWorkflow,
  type AgentRuntimeConfig,
  type WorkflowStage,
} from './config/runtime-config.js';
import { loadProjectSetContext, requireAbsoluteRepositoryRoot, type ProjectContext } from './config/project-context.js';
import {
  canonicalJsonDigest,
  assertCanonicalJsonValue,
  freezeJsonValue,
  type ApprovalEvidence,
  type AuthorizationReceipt,
  type GovernedWriteIntent,
  type GovernedWriteRequest,
  type TrustedProjectIdentity,
  type VerifiedApprovalEvidence,
} from './contracts/public-ingress.js';
import { safeWorkflowOwnedPath, type RuntimeEnvelopeRevisionBinding } from './contracts/envelopes.js';
export { safeWorkflowOwnedPath } from './contracts/envelopes.js';
import type { EvaluationResult } from '@edictum/core';
import {
  defaultRuntimeClock,
  defaultRuntimeTimingSink,
  invokeTimed,
  type RuntimeClock,
  type RuntimeTimingOperation,
  type RuntimeTimingOptions,
  type RuntimeTimingSink,
} from './runtime-timing.js';
const hostBrand: unique symbol = Symbol('candidate-runtime-kernel-host');
const trustedHosts = new WeakSet<object>();
const hostBindings = new WeakMap<object, RuntimeKernelHostBindings>();
const hostAuthenticationProofBrand: unique symbol = Symbol('candidate-runtime-kernel-host-authentication-proof');
const trustedHostAuthenticationProofs = new WeakSet<object>();
const hostAuthenticationProofBindings = new WeakMap<object, RuntimeKernelHostBindings>();
const trustedHostLauncherBrand: unique symbol = Symbol('candidate-runtime-kernel-launcher-capability');
const trustedHostLauncherCapabilities = new WeakSet<object>();
const trustedHostLauncherBindings = new WeakMap<object, TrustedHostCompositionInput>();
const composingTrustedHostLauncherCapabilities = new WeakSet<object>();
const workflowExecutionBrand: unique symbol = Symbol('host-workflow-execution');
const workflowExecutors = new WeakMap<object, (request: WorkflowAssignmentRequest) => Promise<unknown>>();
export interface WorkflowSessionReservation {
  readonly schema: 'WorkflowSessionReservation/v1';
  readonly request: WorkflowAssignmentRequest;
  readonly invocation: TrustedWorkflowAssignment;
  readonly receipt: WorkflowAttemptReceipt;
  readonly requestDigest: string;
  readonly approvalAction: WorkflowApprovalAction | null;
  readonly authorization: WorkflowAttemptApprovalAuthorization | null;
}
const workflowSessionReservers = new WeakMap<
  object,
  (request: WorkflowAssignmentRequest) => Promise<WorkflowSessionReservation>
>();
const workflowSessionCompleters = new WeakMap<
  object,
  (reservation: WorkflowSessionReservation, observed: unknown) => Promise<void>
>();
const workflowPreparers = new WeakMap<
  object,
  (request: WorkflowPreparationRequest) => Promise<PreparedWorkflowExecution>
>();
const workflowWorkItemSchema = z
  .object({
    schema: z.literal('WorkItem/v1'),
    id: z.string().min(1),
    provider: z.string().min(1),
    provider_type: z.string().min(1),
    canonical_kind: z.enum(['epic', 'feature', 'pbi', 'story', 'bug', 'task', 'research']),
    intent: z.enum([
      'information_research',
      'implementation_new',
      'implementation_change',
      'bug_fix',
      'task_execution',
    ]),
    project_id: z.string().min(1),
    title: z.string().min(1),
    description: z.string(),
    labels: z.array(z.string().min(1)).max(64),
    risk_flags: z.array(z.string().min(1)).max(64),
  })
  .strict();

const workContextDigestSchema = z.string().regex(/^[a-f0-9]{64}$/);
const workContextTextSchema = z.string().min(1).max(2048);
const workExecutionContextSchema = z
  .object({
    schema: z.literal('WorkExecutionContext/v1'),
    binding: z
      .object({
        repository_id: workContextTextSchema,
        project_ids: z.array(workContextTextSchema).min(1),
        integrations_digest: workContextDigestSchema,
        team_id: workContextTextSchema,
        workflow_id: workContextTextSchema,
        provider_work_item_id: workContextTextSchema,
        lifecycle_work_id: workContextTextSchema,
        work_item_digest: workContextDigestSchema,
        work_source_revision: workContextTextSchema,
        scope_id: workContextTextSchema,
        scope_contract_digest: workContextDigestSchema,
        acceptance_manifest_digest: workContextDigestSchema,
        ac_ids: z.array(workContextTextSchema).min(1),
        implementation_paths: z.array(workContextTextSchema),
        allowed_resources: z.array(workContextTextSchema),
        config_digest: workContextDigestSchema,
        runtime_source_revision: workContextTextSchema,
        schema_digest: workContextDigestSchema,
        runtime_code_digest: workContextDigestSchema,
      })
      .strict(),
    permit: z
      .object({
        context_digest: workContextDigestSchema,
        checkpoint_revision: z.number().int().positive(),
        checkpoint_digest: workContextDigestSchema,
        runtime_current_revision: z.number().int().positive(),
        stage_id: workContextTextSchema.nullable(),
        assignment_index: z.number().int().nonnegative().nullable(),
        dispatch_authorized: z.boolean(),
        lease: z
          .object({
            thread_id: workContextTextSchema,
            ticket_id: workContextTextSchema,
            generation: z.number().int().positive(),
            ledger_revision: z.number().int().positive(),
            expires_at: z.iso.datetime({ offset: true }),
            active_resources: z.array(workContextTextSchema),
            blocked_resources: z.array(workContextTextSchema),
          })
          .strict(),
      })
      .strict(),
  })
  .strict();
export type WorkExecutionContext = z.infer<typeof workExecutionContextSchema>;
export interface WorkExecutionContextRequest {
  readonly authentication: Readonly<TrustedHostAuthentication>;
  readonly project: ProjectContext;
  readonly teamId: string;
  readonly workflowId: string;
  readonly workItem: z.infer<typeof workflowWorkItemSchema>;
  readonly stageId: string | null;
  readonly assignmentIndex: number | null;
}

function workContextAuthorityDigest(context: WorkExecutionContext): string {
  const lease = context.permit.lease;
  return canonicalJsonDigest({
    binding: context.binding,
    lease: {
      thread_id: lease.thread_id,
      ticket_id: lease.ticket_id,
      generation: lease.generation,
      active_resources: [...lease.active_resources].sort(),
    },
  });
}

export interface WorkflowExecutionCapability {
  readonly [workflowExecutionBrand]: true;
}

export interface WorkflowAssignmentRequest {
  readonly repositoryRoot: string;
  readonly configDigest: string;
  readonly teamId: string;
  readonly workflowId: string;
  readonly stageId: string;
  readonly assignmentIndex: number;
  readonly workItemId: string;
  readonly workItemDigest: string;
  readonly workContextDigest: string;
  readonly input: unknown;
}

export interface WorkflowPreparationRequest {
  readonly repositoryRoot: string;
  readonly configDigest: string;
  readonly teamId: string;
  readonly workItemId: string;
}

/** `internal/Migration` is a reconciler-only carrier, never external ingress. */
export function assertOrdinaryWorkItemIngress(workItem: z.infer<typeof workflowWorkItemSchema>): void {
  requireCondition(
    !(workItem.provider === 'internal' && workItem.provider_type === 'Migration'),
    'internal/Migration work items are reconciler-only and cannot enter the ordinary runtime',
  );
}

export interface PreparedWorkflowExecution {
  readonly workItem: z.infer<typeof workflowWorkItemSchema>;
  readonly workItemDigest: string;
  readonly workflowId: string;
  readonly workContextDigest: string;
}

export async function prepareWorkflowExecution(
  capability: WorkflowExecutionCapability,
  request: WorkflowPreparationRequest,
): Promise<PreparedWorkflowExecution> {
  const prepare = capability !== null && typeof capability === 'object' ? workflowPreparers.get(capability) : undefined;
  requireCondition(prepare !== undefined, 'workflow execution requires an opaque host capability');
  assertCanonicalJsonValue(request, '$');
  const keys = ['repositoryRoot', 'configDigest', 'teamId', 'workItemId'];
  requireCondition(
    Object.keys(request).length === keys.length && keys.every((key) => Object.hasOwn(request, key)),
    'workflow preparation request fields are invalid',
  );
  for (const key of keys) requireTrustedHostText(request[key as keyof WorkflowPreparationRequest], 'workflow ' + key);
  return prepare!(freezeJsonValue(JSON.parse(JSON.stringify(request))) as WorkflowPreparationRequest);
}

export interface TrustedWorkflowAssignment {
  readonly operation: AgentRuntimeConfig['operations']['registry'][number];
  readonly authentication: Readonly<TrustedHostAuthentication>;
  readonly configDigest: string;
  readonly project: ProjectContext;
  readonly teamId: string;
  readonly workflowId: string;
  readonly stage: WorkflowStage;
  readonly assignment: WorkflowStage['assignments'][number];
  readonly assignmentIndex: number;
  readonly attempt?: AssignmentAttempt;
  readonly profile: AgentRuntimeConfig['agents']['profiles'][string];
  readonly roleInstruction: AgentRuntimeConfig['agents']['role_instructions'][string];
  readonly roleInstructionDigest: string;
  readonly riskFlags: readonly string[];
  readonly workItem: z.infer<typeof workflowWorkItemSchema>;
  readonly workContext: WorkExecutionContext;
  readonly input: unknown;
}

export type WorkflowApprovalAction = 'source.write' | 'delivery.execute';

export async function dispatchWorkflowAssignment(
  capability: WorkflowExecutionCapability,
  request: WorkflowAssignmentRequest,
): Promise<unknown> {
  const executor =
    capability !== null && typeof capability === 'object' ? workflowExecutors.get(capability) : undefined;
  requireCondition(executor !== undefined, 'workflow execution requires an opaque host capability');
  assertCanonicalJsonValue(request, '$');
  const snapshot = freezeJsonValue(JSON.parse(JSON.stringify(request))) as WorkflowAssignmentRequest;
  return executor!(snapshot);
}

/** Reserve one native session action without asserting that its effect has happened. */
export async function reserveWorkflowAssignmentForSession(
  capability: WorkflowExecutionCapability,
  request: WorkflowAssignmentRequest,
): Promise<WorkflowSessionReservation> {
  const reserve =
    capability !== null && typeof capability === 'object' ? workflowSessionReservers.get(capability) : undefined;
  requireCondition(reserve !== undefined, 'workflow session reservation requires an opaque host capability');
  assertCanonicalJsonValue(request, '$');
  return reserve!(freezeJsonValue(JSON.parse(JSON.stringify(request))) as WorkflowAssignmentRequest);
}

/** Commit only a matching observed native action through its durable HostState receipt. */
export async function completeWorkflowAssignmentForSession(
  capability: WorkflowExecutionCapability,
  reservation: WorkflowSessionReservation,
  observed: unknown,
): Promise<void> {
  const complete =
    capability !== null && typeof capability === 'object' ? workflowSessionCompleters.get(capability) : undefined;
  requireCondition(complete !== undefined, 'workflow session completion requires an opaque host capability');
  assertCanonicalJsonValue(reservation, '$');
  assertCanonicalJsonValue(observed, '$');
  await complete!(freezeJsonValue(reservation), freezeJsonValue(observed));
}

export interface RuntimeKernelHost {
  readonly [hostBrand]: true;
}
export interface RuntimeKernelHostAuthenticationProof {
  readonly [hostAuthenticationProofBrand]: true;
}
export interface RuntimeKernelHostBindings {
  readonly governanceCapability?: HostGovernanceCapability;
  readonly repositoryRoot: string;
  readonly repositoryId: string;
  readonly projectIds: readonly string[];
  readonly integrationsDigest: string;
  readonly tenantId?: string;
  readonly projectId?: string;
  readonly resolveIdentity: (
    intent: GovernedWriteIntent,
    projectContext: ProjectContext,
  ) => TrustedProjectIdentity | null | Promise<TrustedProjectIdentity | null>;
  readonly verifyApproval: (
    approval: ApprovalEvidence,
    operationHash: string,
    authorization: AuthorizationReceipt,
  ) => VerifiedApprovalEvidence | null | Promise<VerifiedApprovalEvidence | null>;
  readonly runtimeRevision: () => RuntimeEnvelopeRevisionBinding | Promise<RuntimeEnvelopeRevisionBinding>;
  readonly casWriter: (request: GovernedWriteRequest, context: GovernedWriteCommitContext) => unknown;
  readonly clock?: RuntimeClock;
  readonly timingSink?: RuntimeTimingSink;
}
export interface RuntimeKernel {
  readonly schema: 'RuntimeKernel/v1';
  readonly repositoryRoot: string;
  readonly readConfig: () => Promise<AgentRuntimeConfig>;
  readonly readProjectContext: () => Promise<ProjectContext>;
  readonly evaluateGovernance: (tool: 'runtime.read' | 'runtime.write', args: unknown) => Promise<EvaluationResult>;
  readonly runGovernedWrite: (input: unknown) => Promise<unknown>;
}

function requireCondition(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}
function text(value: unknown, label: string): asserts value is string {
  requireCondition(typeof value === 'string' && value.trim().length > 0, label + ' is required');
}
export function assertRuntimeConfigUnchanged(config: AgentRuntimeConfig, initialDigest: string): void {
  requireCondition(runtimeConfigDigest(config) === initialDigest, 'runtime configuration changed after composition');
}
export function readStableRuntimeConfig(repositoryRoot: string, initialDigest: string): AgentRuntimeConfig {
  const config = loadRuntimeConfig(repositoryRoot);
  assertRuntimeConfigUnchanged(config, initialDigest);
  return config;
}
/** @internal Test-only adapter; deliberately not re-exported by src/index.ts. */
export function compareRuntimeKernelRepositoryRoots(left: string, right: string): boolean {
  const normalizedLeft = requireAbsoluteRepositoryRoot(left);
  const normalizedRight = requireAbsoluteRepositoryRoot(right);
  return process.platform === 'win32'
    ? normalizedLeft.toLowerCase() === normalizedRight.toLowerCase()
    : normalizedLeft === normalizedRight;
}
function timedFacadeCall<T>(
  operation: RuntimeTimingOperation,
  action: () => T | Promise<T>,
  timing: RuntimeTimingOptions,
): Promise<T> {
  return invokeTimed(operation, action, timing);
}
function requireConfiguredKernelOperation(
  config: AgentRuntimeConfig,
  id: RuntimeTimingOperation | 'selectWorkflow',
  tool: 'runtime.read' | 'runtime.write',
  governanceStage: string,
  evidenceClass: 'Code' | 'Decision' | 'Runtime',
): void {
  const operation = config.operations.registry.find((entry) => entry.id === id);
  requireCondition(
    [
      operation?.tool === tool,
      operation?.governance_stage === governanceStage,
      operation?.evidence_class === evidenceClass,
      operation?.profile === config.orchestration.mastra.default_profile,
    ].every(Boolean),
    'configured kernel operation is unavailable: ' + id,
  );
}
function validateHostBindings(bindings: RuntimeKernelHostBindings): string {
  requireCondition(bindings !== null && typeof bindings === 'object', 'runtime kernel host bindings are required');
  text(bindings.repositoryRoot, 'runtime kernel host repository root');
  const repositoryRoot = requireAbsoluteRepositoryRoot(bindings.repositoryRoot);
  text(bindings.repositoryId, 'runtime kernel host repository id');
  requireCondition(
    Array.isArray(bindings.projectIds) && bindings.projectIds.length > 0,
    'runtime kernel host project ids are required',
  );
  requireCondition(
    bindings.projectIds.every(
      (id, index) => typeof id === 'string' && (index === 0 || bindings.projectIds[index - 1]! < id),
    ),
    'runtime kernel host project ids must be sorted',
  );
  text(bindings.integrationsDigest, 'runtime kernel host integrations digest');
  requireCondition(typeof bindings.resolveIdentity === 'function', 'runtime kernel host identity resolver is required');
  requireCondition(typeof bindings.verifyApproval === 'function', 'runtime kernel host approval verifier is required');
  requireCondition(typeof bindings.runtimeRevision === 'function', 'runtime kernel host revision provider is required');
  requireCondition(typeof bindings.casWriter === 'function', 'runtime kernel host CAS writer is required');
  return repositoryRoot;
}

function requireTestOnlyIssuer(): void {
  requireCondition(
    process.env.NODE_ENV !== 'production' &&
      (process.env.NODE_ENV === 'test' || process.env.VITEST === 'true' || process.env.BUN_TEST === '1'),
    'test-only trusted host issuer is unavailable outside a test process',
  );
}
function issueHost(bindings: RuntimeKernelHostBindings): RuntimeKernelHost {
  const repositoryRoot = validateHostBindings(bindings);
  const host = Object.freeze({ [hostBrand]: true }) as RuntimeKernelHost;
  trustedHosts.add(host);
  hostBindings.set(host, Object.freeze({ ...bindings, repositoryRoot }));
  return host;
}

/** Internal composition-root proof issuer; deliberately not re-exported by src/index.ts. */
function issueRuntimeKernelHostProof(bindings: RuntimeKernelHostBindings): RuntimeKernelHostAuthenticationProof {
  const repositoryRoot = validateHostBindings(bindings);
  const proof = Object.freeze({
    [hostAuthenticationProofBrand]: true,
  }) as RuntimeKernelHostAuthenticationProof;
  trustedHostAuthenticationProofs.add(proof);
  hostAuthenticationProofBindings.set(proof, Object.freeze({ ...bindings, repositoryRoot }));
  return proof;
}
export function createRuntimeKernelHostProofForCompositionRoot(
  bindings: RuntimeKernelHostBindings,
): RuntimeKernelHostAuthenticationProof {
  requireTestOnlyIssuer();
  return issueRuntimeKernelHostProof(bindings);
}

function hostBindingsFromAuthenticationProof(proof: unknown): RuntimeKernelHostBindings {
  requireCondition(
    typeof proof === 'object' && proof !== null && trustedHostAuthenticationProofs.has(proof as object),
    'runtime kernel host authentication proof is required',
  );
  const bindings = hostAuthenticationProofBindings.get(proof as object);
  requireCondition(bindings !== undefined, 'runtime kernel host authentication proof is invalid');
  return bindings as RuntimeKernelHostBindings;
}

function stageRuntimeKernelHostFromProof(proof: RuntimeKernelHostAuthenticationProof): {
  readonly proofObject: object;
  readonly host: RuntimeKernelHost;
} {
  const proofObject = proof as object;
  const bindings = hostBindingsFromAuthenticationProof(proof);
  return Object.freeze({ proofObject, host: issueHost(bindings) });
}

function consumeStagedRuntimeKernelHostProof(proofObject: object): void {
  trustedHostAuthenticationProofs.delete(proofObject);
  hostAuthenticationProofBindings.delete(proofObject);
}

function discardStagedRuntimeKernelHost(proofObject: object, host: RuntimeKernelHost): void {
  consumeStagedRuntimeKernelHostProof(proofObject);
  trustedHosts.delete(host as object);
  hostBindings.delete(host as object);
}

/** Published composition-root adapter; raw caller-supplied bindings are not accepted here. */
export function createRuntimeKernelHostWithProof(proof: RuntimeKernelHostAuthenticationProof): RuntimeKernelHost {
  const staged = stageRuntimeKernelHostFromProof(proof);
  consumeStagedRuntimeKernelHostProof(staged.proofObject);
  return staged.host;
}

/** Internal raw issuer for source-level composition and boundary tests; not a package-root export. */
export function createRuntimeKernelHost(bindings: RuntimeKernelHostBindings): RuntimeKernelHost {
  requireTestOnlyIssuer();
  return issueHost(bindings);
}
export function isRuntimeKernelHost(value: unknown): value is RuntimeKernelHost {
  return typeof value === 'object' && value !== null && trustedHosts.has(value);
}
function governanceProjectContext(
  current: () => Promise<AgentRuntimeConfig>,
  root: string,
  bindings: RuntimeKernelHostBindings,
): () => Promise<ProjectContext> {
  return async () => loadProjectSetContext(root, await current(), bindings.repositoryId, bindings.projectIds);
}
function identityResolver(
  bindings: RuntimeKernelHostBindings,
  project: () => Promise<ProjectContext>,
): GovernanceBindings['resolveIdentity'] {
  return async (intent) => {
    const context = await project();
    if (
      context.repository_id !== intent.authorization.tenant ||
      !context.project_ids.includes(intent.authorization.project)
    )
      return null;
    return bindings.resolveIdentity(intent, context);
  };
}
async function createGovernanceBindings(
  root: string,
  initial: AgentRuntimeConfig,
  initialDigest: string,
  bindings: RuntimeKernelHostBindings,
  project: () => Promise<ProjectContext>,
): Promise<GovernanceBindings> {
  if (bindings.governanceCapability === undefined) requireTestOnlyIssuer();
  const reservationRoot = path.join(root, initial.control.work_root, 'runtime-reservations');
  return {
    repositoryRoot: root,
    resolveProjectContext: project,
    resolveIdentity: identityResolver(bindings, project),
    verifyApproval: bindings.verifyApproval,
    runtimeRevision: bindings.runtimeRevision,
    reservationStore:
      bindings.governanceCapability === undefined
        ? await createFileOperationReservationStore(reservationRoot, 'candidate-governed-writes')
        : createHostOperationReservationStore(bindings.governanceCapability),
    casWriter: (request, context) => {
      assertRuntimeConfigUnchanged(loadRuntimeConfig(root), initialDigest);
      return bindings.casWriter(request, context);
    },
    assertRuntimeConfigCurrent: () => assertRuntimeConfigUnchanged(loadRuntimeConfig(root), initialDigest),
    authorizeProject: createConfiguredProjectAuthorizer(root, initial),
    governancePolicy: loadConfiguredEdictumGovernancePolicy(root, initial),
  };
}
function hostTimingFor(host: RuntimeKernelHost): RuntimeTimingOptions {
  const bindings = hostBindings.get(host as object)!;
  return { clock: bindings.clock ?? defaultRuntimeClock(), sink: bindings.timingSink ?? defaultRuntimeTimingSink() };
}
export async function createRuntimeKernel(repositoryRoot: string, host: RuntimeKernelHost): Promise<RuntimeKernel> {
  const root = requireAbsoluteRepositoryRoot(repositoryRoot);
  requireCondition(trustedHosts.has(host as object), 'runtime kernel requires an opaque host capability');
  const bindings = hostBindings.get(host as object)!;
  requireCondition(
    compareRuntimeKernelRepositoryRoots(bindings.repositoryRoot, root),
    'runtime kernel host is bound to a different repository root',
  );
  const hostTiming = hostTimingFor(host);
  return timedFacadeCall(
    'createRuntimeKernel',
    async () => {
      const initial = loadRuntimeConfig(root);
      const initialDigest = runtimeConfigDigest(initial);
      const timing: RuntimeTimingOptions = Object.freeze({
        ...hostTiming,
        thresholdMs: initial.timing.threshold_ms,
        optimizationReason: initial.timing.optimization_reason,
      });
      const current = async (): Promise<AgentRuntimeConfig> => readStableRuntimeConfig(root, initialDigest);
      const project = governanceProjectContext(current, root, bindings);
      const controlKernel = createCompositionRootControlKernel(
        await createGovernanceBindings(root, initial, initialDigest, bindings, project),
      );
      const guard = createGovernanceGuard(controlKernel);
      return Object.freeze({
        schema: 'RuntimeKernel/v1' as const,
        repositoryRoot: root,
        readConfig: () =>
          timedFacadeCall(
            'readConfig',
            async () => {
              const config = await current();
              requireConfiguredKernelOperation(config, 'readConfig', 'runtime.read', 'read-evidence', 'Code');
              return config;
            },
            timing,
          ),
        readProjectContext: () =>
          timedFacadeCall(
            'readProjectContext',
            async () => {
              requireConfiguredKernelOperation(
                await current(),
                'readProjectContext',
                'runtime.read',
                'read-evidence',
                'Code',
              );
              return project();
            },
            timing,
          ),
        evaluateGovernance: (tool: 'runtime.read' | 'runtime.write', args: unknown) =>
          timedFacadeCall(
            'evaluateGovernance',
            async () => {
              requireConfiguredKernelOperation(
                await current(),
                'evaluateGovernance',
                'runtime.read',
                'read-evidence',
                'Decision',
              );
              const result = await evaluateGovernance(guard, tool, args);
              await current();
              return result;
            },
            timing,
          ),
        runGovernedWrite: (input: unknown) =>
          timedFacadeCall(
            'runGovernedWrite',
            async () => {
              requireConfiguredKernelOperation(
                await current(),
                'runGovernedWrite',
                'runtime.write',
                'source-write',
                'Runtime',
              );
              return runGovernedWrite(guard, input);
            },
            timing,
          ),
      });
    },
    hostTiming,
  );
}
export type TrustedHostOperation = 'runtime.read' | 'runtime.write' | 'workflow';

export interface TrustedHostLauncherCapability {
  readonly [trustedHostLauncherBrand]: true;
}

export interface TrustedHostAuthentication {
  readonly schema: 'TrustedHostAuthentication/v1';
  readonly repositoryRoot: string;
  readonly repositoryId: string;
  readonly projectIds: readonly string[];
  readonly integrationsDigest: string;
  readonly tenantId?: string;
  readonly projectId?: string;
  readonly principal: string;
  readonly configRevision: number;
  readonly permittedOperations: readonly TrustedHostOperation[];
}

/**
 * The launcher owns these service closures. They are copied into the opaque
 * launcher capability before composition; the package never accepts a plain
 * authentication/services pair as a trusted boundary.
 */
export interface TrustedHostServices {
  readonly governanceCapability?: HostGovernanceCapability;
  readonly migrationRebindVerifier?: MigrationRebindVerifier;
  readonly workflowAttempts?: {
    readonly governanceCapability?: HostGovernanceCapability;
    readonly reconciliationPrincipal?: string | undefined;
    readonly claimWorkflowAssignment: (
      invocation: TrustedWorkflowAssignment,
      requestDigest: string,
    ) => WorkflowAttemptReceipt | Promise<WorkflowAttemptReceipt>;
    readonly completeWorkflowAttempt: (
      receipt: WorkflowAttemptReceipt,
      result: unknown,
    ) => WorkflowAttemptReceipt | Promise<WorkflowAttemptReceipt>;
    readonly markWorkflowAttemptUncertain: (
      receipt: WorkflowAttemptReceipt,
    ) => WorkflowAttemptReceipt | Promise<WorkflowAttemptReceipt>;
    readonly claimWorkflowAssignmentWithApproval?: (
      invocation: TrustedWorkflowAssignment,
      requestDigest: string,
      action: WorkflowApprovalAction,
    ) => WorkflowAttemptApprovalAuthorization | Promise<WorkflowAttemptApprovalAuthorization>;
    readonly beginWorkflowAttemptEffect?: (
      authorization: WorkflowAttemptApprovalAuthorization,
    ) => WorkflowAttemptApprovalAuthorization | Promise<WorkflowAttemptApprovalAuthorization>;
    readonly completeWorkflowAttemptWithApproval?: (
      authorization: WorkflowAttemptApprovalAuthorization,
      result: unknown,
    ) => WorkflowAttemptApprovalAuthorization | Promise<WorkflowAttemptApprovalAuthorization>;
    readonly abortUnstartedWorkflowAttempt: (
      authorization: WorkflowAttemptApprovalAuthorization | WorkflowAttemptReceipt,
    ) => unknown;
  };
  readonly resolveWorkflowWorkItem?: (workItemId: string, project: ProjectContext) => unknown;
  readonly dispatchWorkflowAssignment?: (invocation: TrustedWorkflowAssignment) => unknown;
  readonly resolveWorkExecutionContext?: (request: WorkExecutionContextRequest) => unknown;
  readonly validateWorkflowAssignmentResult?: (
    invocation: TrustedWorkflowAssignment,
    result: unknown,
  ) => void | Promise<void>;
  readonly resolveIdentity: (
    intent: GovernedWriteIntent,
    projectContext: ProjectContext,
  ) => TrustedProjectIdentity | null | Promise<TrustedProjectIdentity | null>;
  readonly verifyApproval: (
    approval: ApprovalEvidence,
    operationHash: string,
    authorization: AuthorizationReceipt,
  ) => VerifiedApprovalEvidence | null | Promise<VerifiedApprovalEvidence | null>;
  readonly runtimeRevision: () => RuntimeEnvelopeRevisionBinding | Promise<RuntimeEnvelopeRevisionBinding>;
  readonly casWriter: (request: GovernedWriteRequest, context: GovernedWriteCommitContext) => unknown;
  readonly clock?: RuntimeClock;
  readonly timingSink?: RuntimeTimingSink;
}

/** Source-only input used by the separately authenticated launcher adapter. */
export interface TrustedHostCompositionInput {
  readonly authentication: TrustedHostAuthentication;
  readonly services: TrustedHostServices;
}

export interface TrustedHostComposition {
  readonly schema: 'TrustedHostComposition/v1';
  readonly authentication: Readonly<{
    readonly repositoryRoot: string;
    readonly repositoryId: string;
    readonly projectIds: readonly string[];
    readonly integrationsDigest: string;
    readonly principal: string;
    readonly configRevision: number;
    readonly permittedOperations: readonly TrustedHostOperation[];
  }>;
  readonly runtimeKernel: RuntimeKernel;
  readonly workflowHostCapability: WorkflowHostCapability | null;
  readonly workflowExecutionCapability: WorkflowExecutionCapability | null;
  readonly migrationRebindVerifier: MigrationRebindVerifier | null;
  readonly deliveryEvidenceAuthority: import('./orchestration/mastra-boundary.js').DeliveryEvidenceAuthority;
}

const trustedHostOperations = new Set<TrustedHostOperation>(['runtime.read', 'runtime.write', 'workflow']);

function requireTrustedHostText(value: unknown, label: string): string {
  requireCondition(typeof value === 'string' && value.trim().length > 0, label + ' is required');
  return value as string;
}

function requireTrustedHostAuthentication(value: TrustedHostAuthentication): Readonly<TrustedHostAuthentication> {
  requireCondition(value !== null && typeof value === 'object', 'trusted host authentication is required');
  requireCondition(value.schema === 'TrustedHostAuthentication/v1', 'trusted host authentication schema is invalid');
  const repositoryRoot = requireTrustedHostText(value.repositoryRoot, 'trusted host repository root');
  const repositoryId = requireTrustedHostText(value.repositoryId, 'trusted host repository id');
  requireCondition(
    Array.isArray(value.projectIds) &&
      value.projectIds.length > 0 &&
      value.projectIds.every(
        (id, index) => typeof id === 'string' && (index === 0 || value.projectIds[index - 1]! < id),
      ),
    'trusted host project ids are invalid',
  );
  const integrationsDigest = requireTrustedHostText(value.integrationsDigest, 'trusted host integrations digest');
  const principal = requireTrustedHostText(value.principal, 'trusted host principal');
  requireCondition(
    Number.isInteger(value.configRevision) && value.configRevision >= 1,
    'trusted host config revision is invalid',
  );
  requireCondition(
    Array.isArray(value.permittedOperations) &&
      value.permittedOperations.length > 0 &&
      new Set(value.permittedOperations).size === value.permittedOperations.length &&
      value.permittedOperations.every((operation) => trustedHostOperations.has(operation)),
    'trusted host permitted operations are invalid',
  );
  return Object.freeze({
    schema: 'TrustedHostAuthentication/v1' as const,
    repositoryRoot,
    repositoryId,
    projectIds: Object.freeze([...value.projectIds]),
    integrationsDigest,
    principal,
    configRevision: value.configRevision,
    permittedOperations: Object.freeze([...value.permittedOperations]),
  });
}

function requireWorkflowAttemptShape(attempts: TrustedHostServices['workflowAttempts']): void {
  if (attempts === undefined) return;
  requireCondition(attempts !== null && typeof attempts === 'object', 'trusted attempt persistence service is invalid');
  for (const method of [
    'claimWorkflowAssignment',
    'completeWorkflowAttempt',
    'markWorkflowAttemptUncertain',
    'abortUnstartedWorkflowAttempt',
  ] as const)
    requireCondition(typeof attempts[method] === 'function', 'trusted attempt persistence service is invalid');
  for (const method of [
    'claimWorkflowAssignmentWithApproval',
    'beginWorkflowAttemptEffect',
    'completeWorkflowAttemptWithApproval',
  ] as const)
    requireOptionalTrustedHostFunction(attempts[method], 'trusted protected attempt persistence service is invalid');
}

function requireWorkflowAttemptOwner(
  attempts: TrustedHostServices['workflowAttempts'],
  governanceCapability: TrustedHostServices['governanceCapability'],
): void {
  if (attempts === undefined) return;
  requireCondition(
    governanceCapability !== undefined && attempts.governanceCapability === governanceCapability,
    'workflow attempts and governance must share one host state owner',
  );
}

function requireOptionalTrustedHostFunction(value: unknown, message: string): void {
  requireCondition(value === undefined || typeof value === 'function', message);
}

function definedTrustedHostProperties(entries: readonly (readonly [string, unknown])[]): Record<string, unknown> {
  return Object.fromEntries(entries.filter(([, value]) => value !== undefined));
}

function snapshotWorkflowAttempts(
  attempts: TrustedHostServices['workflowAttempts'],
): TrustedHostServices['workflowAttempts'] {
  if (attempts === undefined) return undefined;
  return Object.freeze({
    ...definedTrustedHostProperties([['governanceCapability', attempts.governanceCapability]]),
    reconciliationPrincipal: attempts.reconciliationPrincipal,
    claimWorkflowAssignment: attempts.claimWorkflowAssignment.bind(attempts),
    completeWorkflowAttempt: attempts.completeWorkflowAttempt.bind(attempts),
    markWorkflowAttemptUncertain: attempts.markWorkflowAttemptUncertain.bind(attempts),
    abortUnstartedWorkflowAttempt: attempts.abortUnstartedWorkflowAttempt.bind(attempts),
    ...definedTrustedHostProperties([
      ['claimWorkflowAssignmentWithApproval', attempts.claimWorkflowAssignmentWithApproval?.bind(attempts)],
      ['beginWorkflowAttemptEffect', attempts.beginWorkflowAttemptEffect?.bind(attempts)],
      ['completeWorkflowAttemptWithApproval', attempts.completeWorkflowAttemptWithApproval?.bind(attempts)],
    ]),
  });
}

function snapshotTrustedHostServices(value: TrustedHostServices): Readonly<TrustedHostServices> {
  return Object.freeze({
    ...definedTrustedHostProperties([
      ['governanceCapability', value.governanceCapability],
      ['workflowAttempts', snapshotWorkflowAttempts(value.workflowAttempts)],
      [
        'migrationRebindVerifier',
        value.migrationRebindVerifier === undefined
          ? undefined
          : Object.freeze({
              principal: value.migrationRebindVerifier.principal,
              verify: value.migrationRebindVerifier.verify.bind(value.migrationRebindVerifier),
            }),
      ],
    ]),
    resolveIdentity: value.resolveIdentity,
    verifyApproval: value.verifyApproval,
    runtimeRevision: value.runtimeRevision,
    casWriter: value.casWriter,
    ...definedTrustedHostProperties([
      ['dispatchWorkflowAssignment', value.dispatchWorkflowAssignment],
      ['validateWorkflowAssignmentResult', value.validateWorkflowAssignmentResult],
      ['resolveWorkflowWorkItem', value.resolveWorkflowWorkItem],
      ['resolveWorkExecutionContext', value.resolveWorkExecutionContext],
      ['clock', value.clock],
      ['timingSink', value.timingSink],
    ]),
  });
}

function validMigrationRebindPrincipal(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.trim() === value && !/\p{Cc}/u.test(value);
}

function requireMigrationRebindVerifierShape(value: TrustedHostServices['migrationRebindVerifier']): void {
  if (value === undefined) return;
  requireCondition(value !== null, 'trusted migration rebind verifier is invalid');
  requireCondition(typeof value === 'object', 'trusted migration rebind verifier is invalid');
  requireCondition(Object.keys(value).length === 2, 'trusted migration rebind verifier is invalid');
  requireCondition(validMigrationRebindPrincipal(value.principal), 'trusted migration rebind verifier is invalid');
  requireCondition(typeof value.verify === 'function', 'trusted migration rebind verifier is invalid');
}

function requireTrustedHostServices(value: TrustedHostServices): Readonly<TrustedHostServices> {
  requireCondition(value !== null && typeof value === 'object', 'trusted host services are required');
  requireCondition(typeof value.resolveIdentity === 'function', 'trusted host identity service is required');
  requireCondition(typeof value.verifyApproval === 'function', 'trusted host approval service is required');
  requireCondition(typeof value.runtimeRevision === 'function', 'trusted host revision service is required');
  requireCondition(typeof value.casWriter === 'function', 'trusted host CAS service is required');
  const attempts = value.workflowAttempts;
  if (value.governanceCapability !== undefined) requireHostGovernanceCapability(value.governanceCapability);
  requireWorkflowAttemptShape(attempts);
  requireWorkflowAttemptOwner(attempts, value.governanceCapability);
  requireMigrationRebindVerifierShape(value.migrationRebindVerifier);
  if (attempts?.reconciliationPrincipal !== undefined)
    requireTrustedHostText(attempts.reconciliationPrincipal, 'trusted reconciliation principal');
  requireOptionalTrustedHostFunction(
    value.resolveWorkExecutionContext,
    'trusted work execution context resolver is invalid',
  );
  requireOptionalTrustedHostFunction(value.dispatchWorkflowAssignment, 'trusted host workflow service is invalid');
  requireOptionalTrustedHostFunction(
    value.validateWorkflowAssignmentResult,
    'trusted workflow result validator is invalid',
  );
  requireOptionalTrustedHostFunction(value.resolveWorkflowWorkItem, 'trusted host work item resolver is invalid');
  return snapshotTrustedHostServices(value);
}

function snapshotTrustedHostCompositionInput(input: TrustedHostCompositionInput): TrustedHostCompositionInput {
  requireCondition(input !== null && typeof input === 'object', 'trusted host launcher input is required');
  return Object.freeze({
    authentication: requireTrustedHostAuthentication(input.authentication),
    services: requireTrustedHostServices(input.services),
  });
}

function issueTrustedHostLauncherCapability(input: TrustedHostCompositionInput): TrustedHostLauncherCapability {
  const bindings = snapshotTrustedHostCompositionInput(input);
  const capability = Object.freeze({ [trustedHostLauncherBrand]: true }) as TrustedHostLauncherCapability;
  trustedHostLauncherCapabilities.add(capability);
  trustedHostLauncherBindings.set(capability, bindings);
  return capability;
}

/** @internal Test-only issuer; production uses the trusted local session composition root. */
export function createTestTrustedHostLauncherCapability(
  input: TrustedHostCompositionInput,
): TrustedHostLauncherCapability {
  requireTestOnlyIssuer();
  return issueTrustedHostLauncherCapability(input);
}

/**
 * In-process composition for an active local session. The native handle is a
 * correlation identity, not an OS or Desktop attestation. Write authority is
 * deliberately absent until a live WorkState lease and approval are bound.
 */
export async function createTrustedLocalSessionComposition(input: {
  readonly repositoryRoot: string;
  readonly repositoryId: string;
  readonly projectIds: readonly string[];
  readonly nativeSessionHandle: string;
  readonly services: TrustedHostServices;
  /** An already admitted work item in the same durable host state store. */
  readonly admittedWork?: { readonly workId: string; readonly store: HostStateStore };
}): Promise<TrustedHostComposition> {
  const handle = requireTrustedHostText(input.nativeSessionHandle, 'native session handle');
  requireCondition(handle.length <= 256 && !/\p{Cc}/u.test(handle), 'native session handle is invalid');
  const root = requireAbsoluteRepositoryRoot(input.repositoryRoot);
  const config = loadRuntimeConfig(root);
  requireCondition(
    config.repository.repository_id === input.repositoryId,
    'local session repository identity differs from current YAML',
  );
  const project = loadProjectSetContext(root, config, input.repositoryId, input.projectIds);
  const admitted = input.admittedWork;
  const identity: WorkIdentity | null =
    admitted === undefined
      ? null
      : {
          repository_id: input.repositoryId,
          project_ids: [...input.projectIds].sort(),
          integrations_digest: project.integrations_digest,
          work_id: admitted.workId,
        };
  const requireLiveAdmission = (workId: string): HostStateSnapshot => {
    requireCondition(
      identity !== null && admitted !== undefined && workId === identity.work_id,
      'local workflow work item is not the admitted work',
    );
    if (identity === null || admitted === undefined) throw new Error('local workflow admission is unavailable');
    const state = admitted.store.readHostStateSnapshot(identity);
    const work = state.work;
    const lease = work?.lease;
    const ticket = state.ledger?.tickets.find((entry) => entry.ticket_id === lease?.ticket_id);
    const claim = state.ledger?.claims.find(
      (entry) => entry.ticket_id === lease?.ticket_id && entry.thread_id === handle && entry.status === 'active',
    );
    const resources = work?.binding.implementation_paths.map((item) => 'file:' + item).sort() ?? [];
    requireCondition(
      Boolean(
        work &&
        lease &&
        ticket &&
        claim &&
        work.binding.config_digest === runtimeConfigDigest(loadRuntimeConfig(root)) &&
        work.binding.repository_id === identity.repository_id &&
        canonicalJsonDigest(work.binding.project_ids) === canonicalJsonDigest(identity.project_ids) &&
        work.binding.integrations_digest === identity.integrations_digest &&
        work.binding.lifecycle_work_id === identity.work_id &&
        lease.thread_id === handle &&
        ticket.thread_id === handle &&
        lease.generation === ticket.generation &&
        claim.generation === lease.generation &&
        ticket.status === 'active' &&
        ticket.work_id === identity.work_id &&
        claim.work_id === identity.work_id &&
        ticket.blocked_resources.length === 0 &&
        (ticket.exclusive_resources.some((resource) => resource.startsWith('file:'))
          ? resources.every((item) => ticket.active_resources.includes(item) && claim.resources.includes(item))
          : ticket.exclusive_resources.length === 1 &&
            ticket.exclusive_resources[0] === 'execution:' + identity.work_id &&
            claim.resources.includes(ticket.exclusive_resources[0]) &&
            ticket.active_resources.includes(ticket.exclusive_resources[0])) &&
        Date.parse(ticket.expires_at ?? '') > Date.now() &&
        Date.parse(claim.lease_expires_at) > Date.now(),
      ),
      'local workflow admission or exact-path lease is stale',
    );
    return state;
  };
  if (admitted !== undefined) {
    requireCondition(
      input.services.governanceCapability === admitted.store.governanceCapability &&
        input.services.workflowAttempts === undefined,
      'local workflow attempts must be issued from the admitted host state store',
    );
    requireLiveAdmission(admitted.workId);
  }
  const authentication: TrustedHostAuthentication = {
    schema: 'TrustedHostAuthentication/v1',
    repositoryRoot: root,
    repositoryId: input.repositoryId,
    projectIds: [...input.projectIds],
    integrationsDigest: project.integrations_digest,
    principal: 'local-session:' + canonicalJsonDigest(handle),
    configRevision: config.config_revision,
    permittedOperations:
      admitted === undefined ? ['runtime.read', 'workflow'] : ['runtime.read', 'runtime.write', 'workflow'],
  };
  const approvalStoreId = deriveTrustedWorkflowStoreId(authentication, project, config);
  const services: TrustedHostServices =
    admitted === undefined
      ? input.services
      : {
          ...input.services,
          workflowAttempts: {
            governanceCapability: admitted.store.governanceCapability,
            claimWorkflowAssignment: (invocation, requestDigest) => {
              requireLiveAdmission(invocation.workItem.id);
              return admitted.store.claimWorkflowAssignment(invocation, requestDigest);
            },
            claimWorkflowAssignmentWithApproval: (invocation, requestDigest, action) => {
              requireLiveAdmission(invocation.workItem.id);
              return admitted.store.claimWorkflowAssignmentWithApproval(
                invocation,
                requestDigest,
                action,
                approvalStoreId,
              );
            },
            beginWorkflowAttemptEffect: (authorization) => {
              requireLiveAdmission(authorization.receipt.identity.work_id);
              return admitted.store.beginWorkflowAttemptEffect(authorization);
            },
            completeWorkflowAttemptWithApproval: (authorization, result) => {
              requireLiveAdmission(authorization.receipt.identity.work_id);
              return admitted.store.completeWorkflowAttemptWithApproval(authorization, result);
            },
            completeWorkflowAttempt: (receipt, result) => {
              requireLiveAdmission(receipt.identity.work_id);
              return admitted.store.completeWorkflowAttempt(receipt, result);
            },
            markWorkflowAttemptUncertain: (receipt) => {
              requireLiveAdmission(receipt.identity.work_id);
              return admitted.store.markWorkflowAttemptUncertain(receipt);
            },
            abortUnstartedWorkflowAttempt: (receipt) => {
              requireLiveAdmission('receipt' in receipt ? receipt.receipt.identity.work_id : receipt.identity.work_id);
              return admitted.store.abortUnstartedWorkflowAttempt(receipt);
            },
          },
          resolveWorkflowWorkItem: (workId, context) => {
            requireLiveAdmission(workId);
            return input.services.resolveWorkflowWorkItem?.(workId, context);
          },
          resolveWorkExecutionContext: (request) => {
            requireLiveAdmission(request.workItem.id);
            return input.services.resolveWorkExecutionContext?.(request);
          },
          dispatchWorkflowAssignment: (invocation) => {
            requireLiveAdmission(invocation.workItem.id);
            return input.services.dispatchWorkflowAssignment?.(invocation);
          },
          validateWorkflowAssignmentResult: (invocation, result) => {
            requireLiveAdmission(invocation.workItem.id);
            return input.services.validateWorkflowAssignmentResult?.(invocation, result);
          },
        };
  const capability = issueTrustedHostLauncherCapability({
    authentication,
    services,
  });
  return createTrustedHostComposition(capability);
}

function launcherBindingsFromCapability(value: unknown): TrustedHostCompositionInput {
  requireCondition(
    typeof value === 'object' && value !== null && trustedHostLauncherCapabilities.has(value as object),
    'trusted host launcher capability is required',
  );
  const bindings = trustedHostLauncherBindings.get(value as object);
  requireCondition(bindings !== undefined, 'trusted host launcher capability is invalid');
  return bindings as TrustedHostCompositionInput;
}

function trustedHostPermitted(authentication: TrustedHostAuthentication, operation: TrustedHostOperation): boolean {
  return authentication.permittedOperations.includes(operation);
}

function requireTrustedHostOperation(authentication: TrustedHostAuthentication, operation: TrustedHostOperation): void {
  requireCondition(
    trustedHostPermitted(authentication, operation),
    'trusted host operation is not permitted: ' + operation,
  );
}

function wrapTrustedHostServices(
  authentication: TrustedHostAuthentication,
  services: TrustedHostServices,
  project: ProjectContext,
): TrustedHostServices {
  return Object.freeze({
    ...(services.governanceCapability === undefined ? {} : { governanceCapability: services.governanceCapability }),
    resolveIdentity: async (intent: GovernedWriteIntent, context: ProjectContext) => {
      requireTrustedHostOperation(authentication, 'runtime.write');
      requireCondition(
        context.repository_id === authentication.repositoryId &&
          canonicalJsonDigest(context.project_ids) === canonicalJsonDigest(authentication.projectIds) &&
          context.registry_hash === project.registry_hash,
        'trusted host service context is not bound to authenticated context',
      );
      const resolved = await services.resolveIdentity(intent, context);
      if (resolved === null) return null;
      requireCondition(
        typeof resolved === 'object' &&
          resolved.principal === authentication.principal &&
          resolved.tenant === authentication.repositoryId &&
          authentication.projectIds.includes(resolved.project) &&
          resolved.registry_hash === project.registry_hash,
        'trusted host identity is not bound to authenticated context',
      );
      return resolved;
    },
    verifyApproval: (approval: ApprovalEvidence, operationHash: string, authorization: AuthorizationReceipt) => {
      requireTrustedHostOperation(authentication, 'runtime.write');
      requireCondition(
        authorization.tenant === authentication.repositoryId &&
          authentication.projectIds.includes(authorization.project),
        'trusted host authorization is not bound to authenticated context',
      );
      return services.verifyApproval(approval, operationHash, authorization);
    },
    runtimeRevision: () => {
      requireTrustedHostOperation(authentication, 'runtime.write');
      return services.runtimeRevision();
    },
    casWriter: (request: GovernedWriteRequest, context: GovernedWriteCommitContext) => {
      requireTrustedHostOperation(authentication, 'runtime.write');
      return services.casWriter(request, context);
    },
    ...(services.clock === undefined ? {} : { clock: services.clock }),
    ...(services.timingSink === undefined ? {} : { timingSink: services.timingSink }),
  });
}

function checkedMigrationRebindIdentity(request: MigrationRebindRequest): WorkIdentity {
  requireCondition(
    request !== null &&
      typeof request === 'object' &&
      request.identity !== null &&
      typeof request.identity === 'object',
    'migration rebind identity is invalid',
  );
  return request.identity;
}

function requireAuthenticatedMigrationIdentity(
  identity: WorkIdentity,
  authentication: TrustedHostAuthentication,
): void {
  requireCondition(
    identity.repository_id === authentication.repositoryId &&
      canonicalJsonDigest(identity.project_ids) === canonicalJsonDigest(authentication.projectIds),
    'migration rebind is not bound to authenticated work',
  );
}

function requirePersistedMigrationIdentity(identity: WorkIdentity, state: HostStateSnapshot): void {
  requireCondition(
    state.work?.binding.repository_id === identity.repository_id &&
      canonicalJsonDigest(identity.project_ids) === canonicalJsonDigest(state.work!.binding.project_ids) &&
      state.work.binding.lifecycle_work_id === identity.work_id,
    'migration rebind is not bound to authenticated work',
  );
}

function bindMigrationRebindVerifier(
  authentication: TrustedHostAuthentication,
  services: TrustedHostServices,
): MigrationRebindVerifier | null {
  const verifier = services.migrationRebindVerifier;
  if (verifier === undefined) return null;
  requireTrustedHostOperation(authentication, 'runtime.write');
  requireCondition(verifier.principal === authentication.principal, 'migration rebind principal is not authenticated');
  return Object.freeze({
    principal: authentication.principal,
    verify: (request: MigrationRebindRequest, state: HostStateSnapshot) => {
      const identity = checkedMigrationRebindIdentity(request);
      requireAuthenticatedMigrationIdentity(identity, authentication);
      requirePersistedMigrationIdentity(identity, state);
      return verifier.verify(request, state);
    },
  });
}

function restrictTrustedRuntimeKernel(kernel: RuntimeKernel, authentication: TrustedHostAuthentication): RuntimeKernel {
  return Object.freeze({
    schema: kernel.schema,
    repositoryRoot: kernel.repositoryRoot,
    readConfig: () => {
      requireTrustedHostOperation(authentication, 'runtime.read');
      return kernel.readConfig();
    },
    readProjectContext: () => {
      requireTrustedHostOperation(authentication, 'runtime.read');
      return kernel.readProjectContext();
    },
    evaluateGovernance: (tool: 'runtime.read' | 'runtime.write', args: unknown) => {
      requireTrustedHostOperation(authentication, tool);
      return kernel.evaluateGovernance(tool, args);
    },
    runGovernedWrite: (input: unknown) => {
      requireTrustedHostOperation(authentication, 'runtime.write');
      return kernel.runGovernedWrite(input);
    },
  });
}

function deriveTrustedWorkflowStoreId(
  authentication: TrustedHostAuthentication,
  project: ProjectContext,
  config: AgentRuntimeConfig,
): string {
  const bindingDigest = canonicalJsonDigest({
    schema: 'TrustedHostWorkflowStoreBinding/v1',
    repositoryRoot: requireAbsoluteRepositoryRoot(authentication.repositoryRoot),
    repositoryId: authentication.repositoryId,
    projectIds: [...authentication.projectIds],
    integrationsDigest: project.integrations_digest,
    principal: authentication.principal,
    configRevision: authentication.configRevision,
    configDigest: runtimeConfigDigest(config),
    registryHash: project.registry_hash,
  });
  return 'trusted-' + bindingDigest.slice(0, 32);
}

function requireWorkflowAssignmentRequest(request: WorkflowAssignmentRequest): void {
  const keys = [
    'repositoryRoot',
    'configDigest',
    'teamId',
    'workflowId',
    'stageId',
    'assignmentIndex',
    'workItemId',
    'workItemDigest',
    'workContextDigest',
    'input',
  ];
  requireCondition(
    Object.keys(request).length === keys.length && Object.keys(request).every((key) => keys.includes(key)),
    'workflow assignment request fields are invalid',
  );
  for (const key of ['repositoryRoot', 'configDigest', 'teamId', 'workflowId', 'stageId', 'workItemId'] as const)
    requireTrustedHostText(request[key], 'workflow ' + key);
  requireCondition(
    typeof request.workItemDigest === 'string' && /^[a-f0-9]{64}$/.test(request.workItemDigest),
    'workflow work item digest is invalid',
  );
  requireCondition(
    typeof request.workContextDigest === 'string' && /^[a-f0-9]{64}$/.test(request.workContextDigest),
    'workflow work context digest is invalid',
  );
  requireCondition(
    Number.isInteger(request.assignmentIndex) && request.assignmentIndex >= 0,
    'workflow assignment index is invalid',
  );
}

function validateWorkExecutionContext(
  context: WorkExecutionContext,
  authentication: TrustedHostAuthentication,
  request: WorkflowPreparationRequest,
  workItem: z.infer<typeof workflowWorkItemSchema>,
  workflowId: string,
  runtimeRevision: RuntimeEnvelopeRevisionBinding,
  stageId: string | null,
  assignmentIndex: number | null,
  sourceWriter: boolean,
): void {
  const { binding, permit } = context;
  if (binding.repository_id !== undefined || binding.project_ids !== undefined) {
    requireCondition(
      binding.repository_id === authentication.repositoryId &&
        Array.isArray(binding.project_ids) &&
        canonicalJsonDigest(binding.project_ids) === canonicalJsonDigest(authentication.projectIds) &&
        binding.project_ids.every((id, index) => index === 0 || binding.project_ids![index - 1]! < id),
      'workflow current-v1 project binding is invalid',
    );
  }
  requireCondition(
    binding.repository_id === authentication.repositoryId &&
      canonicalJsonDigest(binding.project_ids) === canonicalJsonDigest(authentication.projectIds) &&
      binding.team_id === request.teamId &&
      binding.workflow_id === workflowId &&
      binding.provider_work_item_id === workItem.id &&
      binding.work_item_digest === canonicalJsonDigest(workItem) &&
      binding.config_digest === request.configDigest,
    'workflow work context identity binding is invalid',
  );
  requireCondition(
    binding.runtime_source_revision === runtimeRevision.sourceRevision &&
      permit.runtime_current_revision === runtimeRevision.currentRevision,
    'workflow live runtime revision is stale',
  );
  requireCondition(
    permit.context_digest === canonicalJsonDigest(binding) &&
      permit.stage_id === stageId &&
      permit.assignment_index === assignmentIndex &&
      permit.dispatch_authorized,
    'workflow live permit is not authorized',
  );
  requireCondition(
    new Set(binding.ac_ids).size === binding.ac_ids.length &&
      new Set(binding.implementation_paths).size === binding.implementation_paths.length &&
      new Set(binding.allowed_resources).size === binding.allowed_resources.length,
    'workflow work scope contains duplicates',
  );
  requireCondition(
    binding.implementation_paths.every(safeWorkflowOwnedPath) &&
      binding.allowed_resources.every((resource) =>
        resource.startsWith('file:') ? safeWorkflowOwnedPath(resource.slice(5)) : !/\p{Cc}/u.test(resource),
      ),
    'workflow implementation path is unsafe',
  );
  const lease = permit.lease;
  requireCondition(
    lease.blocked_resources.length === 0 &&
      Date.parse(lease.expires_at) > Date.now() &&
      new Set(lease.active_resources).size === lease.active_resources.length &&
      lease.active_resources.every((resource) => binding.allowed_resources.includes(resource)) &&
      (!sourceWriter ||
        binding.implementation_paths.every((value) => lease.active_resources.includes('file:' + value))),
    'workflow live ownership lease is blocked, expired or incomplete',
  );
}

function assertWorkContextProgress(previous: WorkExecutionContext, current: WorkExecutionContext): void {
  requireCondition(
    workContextAuthorityDigest(previous) === workContextAuthorityDigest(current),
    'workflow work authority changed; explicit rebind required',
  );
  const before = previous.permit,
    after = current.permit;
  requireCondition(
    after.checkpoint_revision >= before.checkpoint_revision &&
      after.runtime_current_revision >= before.runtime_current_revision &&
      after.lease.ledger_revision >= before.lease.ledger_revision &&
      Date.parse(after.lease.expires_at) >= Date.parse(before.lease.expires_at),
    'workflow live permit revision regressed',
  );
  requireCondition(
    after.checkpoint_revision !== before.checkpoint_revision || after.checkpoint_digest === before.checkpoint_digest,
    'workflow checkpoint changed without revision',
  );
  requireCondition(
    after.lease.ledger_revision !== before.lease.ledger_revision ||
      canonicalJsonDigest(after.lease) === canonicalJsonDigest(before.lease),
    'workflow lease changed without ledger revision',
  );
}

const workflowAttemptReceiptSchema = z
  .object({
    identity: z
      .object({
        repository_id: workContextTextSchema,
        project_ids: z.array(workContextTextSchema).min(1),
        integrations_digest: workContextDigestSchema,
        work_id: workContextTextSchema,
      })
      .strict(),
    workVersion: z.object({ revision: z.number().int().positive(), digest: workContextDigestSchema }).strict(),
    maintenanceGeneration: z.number().int().nonnegative(),
    attempt: z
      .object({
        assignment_id: workContextDigestSchema,
        attempt_id: workContextDigestSchema,
        previous_attempt_id: workContextDigestSchema.nullable(),
        request_digest: workContextDigestSchema,
        stage_id: workContextTextSchema,
        assignment_index: z.number().int().nonnegative(),
        correction_generation: z.number().int().nonnegative(),
        correction_authorization: z.object({schema:workContextTextSchema.regex(/^[A-Za-z][A-Za-z0-9]*\/v1$/),path:workContextTextSchema,sha256:workContextDigestSchema}).strict().nullable(),
        lease: z
          .object({
            ticket_id: workContextTextSchema,
            thread_id: workContextTextSchema,
            generation: z.number().int().positive(),
          })
          .strict(),
        status: z.enum(['started', 'completed', 'uncertain', 'no_effect']),
        result: z.unknown(),
        result_digest: workContextDigestSchema.nullable(),
        reconciliation: z
          .object({
            schema: z.literal('WorkflowAttemptReconciliationAuthorization/v1'),
            principal: workContextTextSchema,
            work_binding_digest: workContextDigestSchema,
            work_version: z.object({ revision: z.number().int().positive(), digest: workContextDigestSchema }).strict(),
            ledger_version: z
              .object({ revision: z.number().int().positive(), digest: workContextDigestSchema })
              .strict(),
            attempt_id: workContextDigestSchema,
            request_digest: workContextDigestSchema,
            outcome: z.enum(['completed', 'no_effect']),
            result_digest: workContextDigestSchema.nullable(),
            provider_evidence: z
              .object({
                schema: workContextTextSchema.regex(/^[A-Za-z][A-Za-z0-9]*\/v1$/),
                path: workContextTextSchema,
                sha256: workContextDigestSchema,
              })
              .strict(),
            decision: z
              .object({
                schema: z.enum(['DecisionRecord/v1', 'WorkflowAttemptRecoveryDecision/v1']),
                path: workContextTextSchema,
                sha256: workContextDigestSchema,
              })
              .strict()
              .nullable(),
            retry_lease: z
              .object({
                ticket_id: workContextTextSchema,
                thread_id: workContextTextSchema,
                generation: z.number().int().positive(),
              })
              .strict()
              .nullable(),
          })
          .strict()
          .nullable(),
      })
      .strict(),
  })
  .strict();

function validateAttemptReceipt(
  value: unknown,
  invocation: TrustedWorkflowAssignment,
  requestDigest: string,
  reconciliationPrincipal: string | undefined,
): WorkflowAttemptReceipt {
  assertCanonicalJsonValue(value, '$');
  const receipt = workflowAttemptReceiptSchema.parse(value);
  const { binding, permit } = invocation.workContext;
  const attempt = receipt.attempt;
  const permitVersionMatches =
    receipt.workVersion.revision === permit.checkpoint_revision &&
    receipt.workVersion.digest === permit.checkpoint_digest;
  requireCondition(
    receipt.identity.repository_id === binding.repository_id &&
      canonicalJsonDigest(receipt.identity.project_ids) === canonicalJsonDigest(binding.project_ids) &&
      receipt.identity.work_id === binding.lifecycle_work_id &&
      receipt.workVersion.revision >= permit.checkpoint_revision &&
      (receipt.workVersion.revision > permit.checkpoint_revision || permitVersionMatches),
    'workflow attempt work binding invalid',
  );
  requireCondition(
    attempt.request_digest === requestDigest &&
      attempt.stage_id === invocation.stage.id &&
      attempt.assignment_index === invocation.assignmentIndex,
    'workflow attempt request binding invalid',
  );
  requireCondition(
    attempt.attempt_id ===
      canonicalJsonDigest({
        assignment_id: attempt.assignment_id,
        request_digest: attempt.request_digest,
        lease: attempt.lease,
        previous_attempt_id: attempt.previous_attempt_id,
      }),
    'workflow attempt identity invalid',
  );
  if (attempt.status !== 'completed')
    requireCondition(
      attempt.lease.ticket_id === permit.lease.ticket_id &&
        attempt.lease.thread_id === permit.lease.thread_id &&
        attempt.lease.generation === permit.lease.generation,
      'workflow attempt fencing binding invalid',
    );
  requireCondition(
    attempt.status === 'completed'
      ? attempt.result_digest === canonicalJsonDigest(attempt.result)
      : attempt.result === null && attempt.result_digest === null,
    'workflow attempt result binding invalid',
  );
  if (attempt.reconciliation) {
    const authorization = attempt.reconciliation;
    requireCondition(
      authorization.outcome === attempt.status &&
        authorization.principal === reconciliationPrincipal &&
        authorization.attempt_id === attempt.attempt_id &&
        authorization.request_digest === requestDigest &&
        authorization.work_binding_digest === canonicalJsonDigest(binding) &&
        authorization.result_digest === attempt.result_digest &&
        authorization.work_version.revision < receipt.workVersion.revision &&
        authorization.work_version.revision <= permit.checkpoint_revision &&
        authorization.ledger_version.revision <= permit.lease.ledger_revision &&
        (authorization.work_version.revision !== permit.checkpoint_revision ||
          authorization.work_version.digest === permit.checkpoint_digest) &&
        safeWorkflowOwnedPath(authorization.provider_evidence.path) &&
        (authorization.decision === null || safeWorkflowOwnedPath(authorization.decision.path)) &&
        (attempt.status === 'completed'
          ? authorization.retry_lease === null
          : authorization.decision !== null && authorization.retry_lease !== null),
      'workflow reconciliation binding invalid',
    );
  } else requireCondition(attempt.status !== 'no_effect', 'workflow no-effect proof required');
  return freezeJsonValue(receipt) as WorkflowAttemptReceipt;
}

function issueWorkflowExecutionCapability(
  authentication: TrustedHostAuthentication,
  services: TrustedHostServices,
  config: AgentRuntimeConfig,
  project: ProjectContext,
): WorkflowExecutionCapability | null {
  const dispatch = services.dispatchWorkflowAssignment;
  const resolveWorkItem = services.resolveWorkflowWorkItem;
  const validateResult = services.validateWorkflowAssignmentResult;
  const resolveContext = services.resolveWorkExecutionContext;
  const attempts = services.workflowAttempts;
  if (
    !trustedHostPermitted(authentication, 'workflow') ||
    !dispatch ||
    !resolveWorkItem ||
    !validateResult ||
    !resolveContext ||
    !attempts
  )
    return null;
  requireCondition(
    JSON.stringify([...(config.artifact_contracts['WorkItem/v1']?.required_fields ?? [])].sort()) ===
      JSON.stringify(Object.keys(workflowWorkItemSchema.shape).sort()),
    'configured work item artifact contract does not match the executable schema',
  );
  const configDigest = runtimeConfigDigest(config);
  const root = requireAbsoluteRepositoryRoot(authentication.repositoryRoot);
  const capability = Object.freeze({ [workflowExecutionBrand]: true }) as WorkflowExecutionCapability;
  const contexts = new Map<string, WorkExecutionContext>();
  let stateTail: Promise<unknown> = Promise.resolve();
  const serializeState = <T>(operation: () => Promise<T>): Promise<T> => {
    const pending = stateTail.then(operation);
    stateTail = pending.then(
      () => undefined,
      () => undefined,
    );
    return pending;
  };
  const pinContext = (context: WorkExecutionContext) => {
    const previous = contexts.get(context.binding.lifecycle_work_id);
    if (previous) assertWorkContextProgress(previous, context);
    contexts.set(context.binding.lifecycle_work_id, context);
  };
  const resolve = async (
    request: WorkflowPreparationRequest,
    stageId: string | null = null,
    assignmentIndex: number | null = null,
  ) => {
    requireCondition(
      compareRuntimeKernelRepositoryRoots(root, request.repositoryRoot),
      'workflow repository binding is invalid',
    );
    requireCondition(request.configDigest === configDigest, 'workflow configuration binding is stale');
    const current = readStableRuntimeConfig(root, configDigest);
    const currentProject = loadProjectSetContext(root, current, authentication.repositoryId, authentication.projectIds);
    requireCondition(
      canonicalJsonDigest(currentProject) === canonicalJsonDigest(project),
      'workflow project binding is stale',
    );
    const operation = current.operations.registry.find((entry) => entry.id === 'executeConfiguredWorkflow');
    requireCondition(
      [
        operation?.tool === 'runtime.write',
        operation?.governance_stage === 'source-write',
        operation?.evidence_class === 'Runtime',
        operation?.profile === current.orchestration.mastra.default_profile,
      ].every(Boolean),
      'configured workflow operation is unavailable',
    );
    requireTrustedHostOperation(authentication, 'runtime.write');
    requireConfiguredKernelOperation(current, 'selectWorkflow', 'runtime.read', 'read-evidence', 'Decision');
    const resolved = await resolveWorkItem(request.workItemId, currentProject);
    assertCanonicalJsonValue(resolved, '$');
    const workItem = workflowWorkItemSchema.parse(resolved);
    requireCondition(
      workItem.id === request.workItemId && authentication.projectIds.includes(workItem.project_id),
      'workflow work item identity binding is invalid',
    );
    assertOrdinaryWorkItemIngress(workItem);
    requireCondition(
      resolveProviderWorkItemKind(current, workItem.provider, workItem.provider_type) === workItem.canonical_kind,
      'workflow work item kind binding is invalid',
    );
    const selected = selectWorkflow(current, {
      team: request.teamId,
      kind: workItem.canonical_kind,
      intent: workItem.intent,
      project: workItem.project_id,
      risk_flags: workItem.risk_flags,
      labels: workItem.labels,
    });
    const rawContext = await resolveContext(
      freezeJsonValue({
        authentication,
        project: currentProject,
        teamId: request.teamId,
        workflowId: selected.workflow_id,
        workItem,
        stageId,
        assignmentIndex,
      }),
    );
    assertCanonicalJsonValue(rawContext, '$');
    const parsedWorkContext = workExecutionContextSchema.parse(rawContext);
    const workContext = freezeJsonValue({
      ...parsedWorkContext,
      binding: {
        ...parsedWorkContext.binding,
        ...(authentication.repositoryId === undefined
          ? {}
          : { repository_id: currentProject.repository_id, project_ids: [...currentProject.project_ids].sort() }),
        ...(authentication.repositoryId === undefined
          ? {}
          : { integrations_digest: currentProject.integrations_digest }),
      },
    });
    const reboundWorkContext = freezeJsonValue({
      ...workContext,
      permit: { ...workContext.permit, context_digest: canonicalJsonDigest(workContext.binding) },
    });
    validateWorkExecutionContext(
      reboundWorkContext,
      authentication,
      request,
      workItem,
      selected.workflow_id,
      await services.runtimeRevision(),
      stageId,
      assignmentIndex,
      stageId !== null &&
        assignmentIndex !== null &&
        (() => {
          const assignment = current.workflows[selected.workflow_id]?.stages.find((stage) => stage.id === stageId)
            ?.assignments[assignmentIndex];
          const profile = assignment && current.agents.profiles[assignment.profile];
          return Boolean(
            profile?.mutation_scope === 'repository_source' &&
            current.agents.tool_policies[profile.tools_policy]?.source_write,
          );
        })(),
    );
    readStableRuntimeConfig(root, configDigest);
    return {
      current,
      currentProject,
      operation: operation!,
      workItem: freezeJsonValue(workItem),
      workflowId: selected.workflow_id,
      workContext: reboundWorkContext,
    };
  };
  workflowPreparers.set(capability, async (request) => {
    return serializeState(async () => {
      const resolved = await resolve(request);
      pinContext(resolved.workContext);
      return freezeJsonValue({
        workItem: resolved.workItem,
        workItemDigest: canonicalJsonDigest(resolved.workItem),
        workflowId: resolved.workflowId,
        workContextDigest: workContextAuthorityDigest(resolved.workContext),
      });
    });
  });
  const reserveAssignment = async (request: WorkflowAssignmentRequest): Promise<WorkflowSessionReservation> =>
    serializeState(async () => {
      requireWorkflowAssignmentRequest(request);
      const { current, currentProject, operation, workItem, workflowId, workContext } = await resolve(
        request,
        request.stageId,
        request.assignmentIndex,
      );
      requireCondition(workflowId === request.workflowId, 'workflow work item route binding is invalid');
      requireCondition(
        canonicalJsonDigest(workItem) === request.workItemDigest,
        'workflow work item changed after preparation',
      );
      requireCondition(
        workContextAuthorityDigest(workContext) === request.workContextDigest,
        'workflow work context binding is stale',
      );
      const team = current.teams[request.teamId];
      const workflow = current.workflows[request.workflowId];
      requireCondition(
        Boolean(team?.enabled && workflow) &&
          current.orchestration.mastra.workflow_allowlist.includes(request.workflowId),
        'workflow is not permitted',
      );
      const stage = workflow!.stages.find((entry) => entry.id === request.stageId);
      const assignment = stage?.assignments[request.assignmentIndex];
      requireCondition(stage !== undefined && assignment !== undefined, 'workflow assignment is not configured');
      requireCondition(
        (team!.stage_overrides[stage!.id] ?? team!.roles[assignment!.role]) === assignment!.profile,
        'workflow assignment profile binding is invalid',
      );
      for (const risks of [stage!.risk_flags, assignment!.risk_flags])
        requireCondition(
          !risks || risks.some((risk) => workItem.risk_flags.includes(risk)),
          'workflow assignment risk binding is invalid',
        );
      const profile = current.agents.profiles[assignment!.profile]!;
      const toolPolicy = current.agents.tool_policies[profile.tools_policy]!;
      const protectedAction: WorkflowApprovalAction | null =
        profile.mutation_scope === 'repository_source'
          ? 'source.write'
          : stage!.kind === 'deliver' && toolPolicy.allowed_tools.includes('delivery.execute')
            ? 'delivery.execute'
            : null;
      const approvalAction =
        protectedAction !== null &&
        current.orchestration.mastra.hitl.enabled &&
        current.orchestration.mastra.hitl.approval_required_for.includes(protectedAction)
          ? protectedAction
          : null;
      if (approvalAction !== null)
        for (const method of [
          'claimWorkflowAssignmentWithApproval',
          'beginWorkflowAttemptEffect',
          'completeWorkflowAttemptWithApproval',
          'abortUnstartedWorkflowAttempt',
        ] as const)
          requireCondition(
            typeof attempts[method] === 'function',
            'trusted host atomic workflow approval service is required',
          );
      const roleInstruction = current.agents.role_instructions[assignment!.role];
      requireCondition(roleInstruction !== undefined, 'workflow role instruction is not configured');
      const roleInstructionDigest = canonicalJsonDigest(roleInstruction);
      if (profile.mutation_scope === 'repository_source') requireTrustedHostOperation(authentication, 'runtime.write');
      if (profile.mutation_scope === 'repository_source')
        requireCondition(
          workContext.binding.implementation_paths.length > 0,
          'source-writing assignment requires owned implementation paths',
        );
      pinContext(workContext);
      const invocation = freezeJsonValue({
        operation: operation!,
        authentication,
        configDigest,
        project: currentProject,
        teamId: request.teamId,
        workflowId: request.workflowId,
        stage: stage!,
        assignment: assignment!,
        assignmentIndex: request.assignmentIndex,
        profile,
        roleInstruction: roleInstruction!,
        roleInstructionDigest,
        riskFlags: workItem.risk_flags,
        workItem,
        workContext,
        input: request.input,
      });
      readStableRuntimeConfig(root, configDigest);
      const requestDigest = canonicalJsonDigest({
        binding: workContext.binding,
        operation_digest: canonicalJsonDigest(operation!),
        stage_id: stage!.id,
        assignment_index: request.assignmentIndex,
        role_instruction_digest: roleInstructionDigest,
        input: request.input,
      });
      const authorization =
        approvalAction === null
          ? null
          : await attempts.claimWorkflowAssignmentWithApproval!(invocation, requestDigest, approvalAction);
      const claimed = authorization?.receipt ?? (await attempts.claimWorkflowAssignment(invocation, requestDigest));
      let receipt: WorkflowAttemptReceipt;
      try {
        receipt = validateAttemptReceipt(claimed, invocation, requestDigest, attempts.reconciliationPrincipal);
        if (authorization !== null)
          requireCondition(
            receipt.attempt.status === 'completed'
              ? authorization.approval === null
              : authorization.approval?.status === 'reserved',
            'workflow approval reservation receipt invalid',
          );
        const currentContext = await resolve(request, request.stageId, request.assignmentIndex);
        requireCondition(
          receipt.attempt.reconciliation !== null ||
            currentContext.workContext.permit.checkpoint_revision > receipt.workVersion.revision ||
            (currentContext.workContext.permit.checkpoint_revision === receipt.workVersion.revision &&
              currentContext.workContext.permit.checkpoint_digest === receipt.workVersion.digest),
          'workflow attempt work version is not current',
        );
      } catch (error) {
        try {
          if (authorization?.approval?.status === 'reserved')
            await attempts.abortUnstartedWorkflowAttempt!(authorization);
          else if (authorization === null && claimed.attempt.status === 'started')
            await attempts.abortUnstartedWorkflowAttempt(claimed);
        } catch {
          // A failed abort retains the attempt for explicit reconciliation.
        }
        throw error;
      }
      return freezeJsonValue({
        schema: 'WorkflowSessionReservation/v1' as const,
        request,
        invocation,
        receipt,
        requestDigest,
        approvalAction,
        authorization,
      });
    });
  workflowSessionReservers.set(capability, async (request) => {
    const reserved = await reserveAssignment(request);
    requireCondition(
      reserved.receipt.attempt.status === 'started',
      'workflow session action was already completed or requires reconciliation',
    );
    if (reserved.approvalAction === null) return reserved;
    await serializeState(async () => {
      const fresh = await resolve(request, request.stageId, request.assignmentIndex);
      requireCondition(
        canonicalJsonDigest(fresh.workItem) === request.workItemDigest &&
          workContextAuthorityDigest(fresh.workContext) === request.workContextDigest,
        'workflow approval context changed before native session issue',
      );
      pinContext(fresh.workContext);
    });
    const entered = await serializeState(async () => attempts.beginWorkflowAttemptEffect!(reserved.authorization!));
    return freezeJsonValue({ ...reserved, authorization: entered });
  });
  workflowSessionCompleters.set(capability, async (reservation, observed) => {
    requireCondition(
      reservation.schema === 'WorkflowSessionReservation/v1' &&
        reservation.receipt.attempt.status === 'started' &&
        reservation.request.workItemId === reservation.invocation.workItem.id &&
        reservation.request.workItemDigest === canonicalJsonDigest(reservation.invocation.workItem) &&
        reservation.invocation.stage.id === reservation.request.stageId &&
        reservation.invocation.assignmentIndex === reservation.request.assignmentIndex,
      'workflow native reservation binding is invalid',
    );
    validateAttemptReceipt(
      reservation.receipt,
      reservation.invocation,
      reservation.requestDigest,
      attempts.reconciliationPrincipal,
    );
    const fresh = await serializeState(async () =>
      resolve(reservation.request, reservation.request.stageId, reservation.request.assignmentIndex),
    );
    requireCondition(
      canonicalJsonDigest(fresh.workItem) === reservation.request.workItemDigest &&
        workContextAuthorityDigest(fresh.workContext) === reservation.request.workContextDigest,
      'workflow native result context changed',
    );
    const result = observed as { readonly status?: string };
    requireCondition(
      result !== null &&
        typeof result === 'object' &&
        (result.status === 'reported_complete' || result.status === 'reported_failed'),
      'workflow native observation status is invalid',
    );
    if (result.status === 'reported_failed') {
      await serializeState(async () => attempts.markWorkflowAttemptUncertain(reservation.receipt));
      return;
    }
    const invocation = freezeJsonValue({ ...reservation.invocation, attempt: reservation.receipt.attempt });
    await validateResult(invocation, observed);
    const completed =
      reservation.approvalAction === null
        ? await serializeState(async () => attempts.completeWorkflowAttempt(reservation.receipt, observed))
        : (
            await serializeState(async () =>
              attempts.completeWorkflowAttemptWithApproval!(reservation.authorization!, observed),
            )
          ).receipt;
    const checked = validateAttemptReceipt(
      completed,
      reservation.invocation,
      reservation.requestDigest,
      attempts.reconciliationPrincipal,
    );
    requireCondition(
      checked.attempt.status === 'completed' && checked.attempt.result_digest === canonicalJsonDigest(observed),
      'workflow native completion receipt invalid',
    );
  });
  workflowExecutors.set(capability, async (request) => {
    const { invocation, receipt, requestDigest, approvalAction, authorization } = await reserveAssignment(request);
    let snapshot: unknown;
    const dispatchedInvocation = freezeJsonValue({ ...invocation, attempt: receipt.attempt });
    if (receipt.attempt.status === 'completed') {
      snapshot = receipt.attempt.result;
    } else {
      requireCondition(receipt.attempt.status === 'started', 'workflow attempt requires reconciliation');
      let entered = false;
      let activeAuthorization = authorization;
      let completed: WorkflowAttemptReceipt;
      try {
        if (approvalAction !== null) {
          await serializeState(async () => {
            const fresh = await resolve(request, request.stageId, request.assignmentIndex);
            requireCondition(
              canonicalJsonDigest(fresh.workItem) === request.workItemDigest &&
                workContextAuthorityDigest(fresh.workContext) === request.workContextDigest,
              'workflow approval context changed before provider dispatch',
            );
            pinContext(fresh.workContext);
          });
          activeAuthorization = await serializeState(async () => attempts.beginWorkflowAttemptEffect!(authorization!));
          entered = true;
        }
        const output = await dispatch(dispatchedInvocation);
        assertCanonicalJsonValue(output, '$');
        snapshot = freezeJsonValue(JSON.parse(JSON.stringify(output)));
        await validateResult(dispatchedInvocation, snapshot);
        completed = validateAttemptReceipt(
          approvalAction === null
            ? await serializeState(async () => attempts.completeWorkflowAttempt(receipt, snapshot))
            : (
                await serializeState(async () =>
                  attempts.completeWorkflowAttemptWithApproval!(activeAuthorization!, snapshot),
                )
              ).receipt,
          invocation,
          requestDigest,
          attempts.reconciliationPrincipal,
        );
      } catch (error) {
        let aborted = false;
        if (approvalAction !== null && !entered)
          try {
            await serializeState(async () => attempts.abortUnstartedWorkflowAttempt!(authorization!));
            aborted = true;
          } catch {
            // The entry marker may have committed before acknowledgement; retain uncertainty.
          }
        if (!aborted) {
          const uncertain = validateAttemptReceipt(
            await serializeState(async () => attempts.markWorkflowAttemptUncertain(receipt)),
            invocation,
            requestDigest,
            attempts.reconciliationPrincipal,
          );
          requireCondition(
            uncertain.attempt.status === 'uncertain' && uncertain.attempt.attempt_id === receipt.attempt.attempt_id,
            'workflow uncertainty receipt invalid',
          );
        }
        throw error;
      }
      const current = await serializeState(async () => resolve(request, request.stageId, request.assignmentIndex));
      requireCondition(
        completed.attempt.reconciliation !== null ||
          current.workContext.permit.checkpoint_revision > completed.workVersion.revision ||
          (current.workContext.permit.checkpoint_revision === completed.workVersion.revision &&
            current.workContext.permit.checkpoint_digest === completed.workVersion.digest),
        'workflow completion work version is not current',
      );
      requireCondition(
        completed.attempt.status === 'completed' &&
          completed.attempt.attempt_id === receipt.attempt.attempt_id &&
          completed.attempt.result_digest === canonicalJsonDigest(snapshot),
        'workflow completion receipt invalid',
      );
    }
    if (receipt.attempt.status === 'completed') await validateResult(dispatchedInvocation, snapshot);
    await serializeState(async () => {
      const after = await resolve(request, request.stageId, request.assignmentIndex);
      requireCondition(
        canonicalJsonDigest(after.workItem) === request.workItemDigest,
        'workflow work item changed during assignment',
      );
      pinContext(after.workContext);
    });
    return snapshot;
  });
  return capability;
}

/**
 * Trusted launcher boundary for the packed candidate. It validates the
 * local session context against the current YAML authority, privately issues
 * module-local proofs, and returns only composed capabilities.
 */
export async function createTrustedHostComposition(
  capability: TrustedHostLauncherCapability,
): Promise<TrustedHostComposition> {
  const capabilityObject = capability as object;
  const input = launcherBindingsFromCapability(capability);
  requireCondition(
    !composingTrustedHostLauncherCapabilities.has(capabilityObject),
    'trusted host launcher capability composition is already in progress',
  );
  composingTrustedHostLauncherCapabilities.add(capabilityObject);
  try {
    const authentication = input.authentication;
    const services = input.services;
    requireCondition(
      services.governanceCapability !== undefined,
      'trusted host governance capability is required for composition',
    );
    const root = requireAbsoluteRepositoryRoot(authentication.repositoryRoot);
    const config = loadRuntimeConfig(root);
    requireCondition(
      config.config_revision === authentication.configRevision,
      'trusted host configuration revision is stale or forged',
    );
    const project = loadProjectSetContext(root, config, authentication.repositoryId, authentication.projectIds);
    requireCondition(
      authentication.integrationsDigest === project.integrations_digest,
      'trusted host integrations digest does not match the current project context',
    );
    const migrationRebindVerifier = bindMigrationRebindVerifier(authentication, services);
    const bindings = wrapTrustedHostServices(authentication, services, project);
    const runtimeProof = issueRuntimeKernelHostProof({
      repositoryRoot: root,
      repositoryId: authentication.repositoryId,
      projectIds: [...authentication.projectIds],
      integrationsDigest: authentication.integrationsDigest,
      ...bindings,
    });
    const stagedRuntime = stageRuntimeKernelHostFromProof(runtimeProof);
    let runtimeKernel: RuntimeKernel;
    let deliveryEvidenceAuthority: import('./orchestration/mastra-boundary.js').DeliveryEvidenceAuthority;
    try {
      runtimeKernel = await createRuntimeKernel(root, stagedRuntime.host);
      const { createDeliveryEvidenceAuthority } = await import('./orchestration/mastra-boundary.js');
      deliveryEvidenceAuthority = createDeliveryEvidenceAuthority(stagedRuntime.host);
    } catch (error) {
      discardStagedRuntimeKernelHost(stagedRuntime.proofObject, stagedRuntime.host);
      throw error;
    }
    discardStagedRuntimeKernelHost(stagedRuntime.proofObject, stagedRuntime.host);
    const restrictedRuntimeKernel = restrictTrustedRuntimeKernel(runtimeKernel, authentication);
    let workflowHostCapability: WorkflowHostCapability | null = null;
    if (trustedHostPermitted(authentication, 'workflow')) {
      const workflowStoreId = deriveTrustedWorkflowStoreId(authentication, project, config);
      const workflowProof = issueWorkflowHostProof(root, authentication.principal, workflowStoreId);
      workflowHostCapability = await createFileWorkflowHostCapabilityWithProof(
        workflowProof,
        services.governanceCapability,
      );
    }
    trustedHostLauncherCapabilities.delete(capabilityObject);
    trustedHostLauncherBindings.delete(capabilityObject);
    return Object.freeze({
      schema: 'TrustedHostComposition/v1' as const,
      authentication: Object.freeze({
        repositoryRoot: root,
        repositoryId: authentication.repositoryId,
        projectIds: [...authentication.projectIds],
        integrationsDigest: authentication.integrationsDigest,
        principal: authentication.principal,
        configRevision: authentication.configRevision,
        permittedOperations: Object.freeze([...authentication.permittedOperations]),
      }),
      runtimeKernel: restrictedRuntimeKernel,
      workflowHostCapability,
      workflowExecutionCapability: issueWorkflowExecutionCapability(authentication, services, config, project),
      migrationRebindVerifier,
      deliveryEvidenceAuthority,
    });
  } finally {
    composingTrustedHostLauncherCapabilities.delete(capabilityObject);
  }
}
