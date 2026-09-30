import { Buffer } from 'node:buffer';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import {
  createEnvelope,
  Decision,
  Edictum,
  EdictumDenied,
  loadWorkflowString,
  MemoryBackend,
  Session,
  WorkflowRuntime,
  type EvaluationResult,
  type Session as EdictumSession,
  type ToolCall,
  type WorkflowDefinition,
  type WorkflowEvaluation,
  type WorkflowState,
} from '@edictum/core';
import type { ProjectAuthorizer } from '../authorization/cedar-boundary.js';
import { stringify as stringifyYaml } from 'yaml';
import { Result, ResultAsync } from 'neverthrow';
import { requireSafeRepositoryAccess } from '../config/safe-repository-access.js';
import {
  detectNativeNoFollowCapability,
  requireNativeNoFollowCapability,
  type NativeNoFollowCapability,
} from '../config/host-capability.js';
import {
  requireAbsoluteRepositoryRoot,
  validateProjectContext,
  type ProjectContext,
} from '../config/project-context.js';
import {
  assertCanonicalJsonValue,
  buildGovernedWriteRequest,
  canonicalJson,
  canonicalJsonDigest,
  computeGovernedWriteRequestDigest,
  computeWriteOperationHash,
  isPlainRecord,
  isStrictRfc3339Timestamp,
  rfc3339TimestampMilliseconds,
  validateGovernedWriteIntent,
  validateGovernedWriteRequest,
  type ApprovalEvidence,
  type AuthorizationReceipt,
  type GovernedWriteIntent,
  type GovernedWriteRequest,
  type TrustedProjectIdentity,
  type VerifiedApprovalEvidence,
} from '../contracts/public-ingress.js';
import { consumeRuntimeEnvelope, type RuntimeEnvelopeRevisionBinding } from '../contracts/envelopes.js';
import { loadRuntimeConfig, runtimeConfigDigest, type AgentRuntimeConfig } from '../config/runtime-config.js';

const pick = <T>(condition: boolean, whenTrue: T, whenFalse: T): T => [whenFalse, whenTrue][Number(condition)] as T;
const all = (...conditions: readonly boolean[]): boolean => conditions.every(Boolean);
const any = (...conditions: readonly boolean[]): boolean => conditions.some(Boolean);
const requireCondition = (condition: boolean, message: string): void =>
  [
    () => undefined,
    () => {
      throw new Error(message);
    },
  ][Number(!condition)]!();
const optionalObject = <T extends object>(condition: boolean, value: T): T => pick(condition, value, {} as T);
const deferPick = <T>(condition: boolean, whenTrue: () => T, whenFalse: () => T): T =>
  pick(condition, whenTrue, whenFalse)();
const errorText = (error: unknown, defaultMessage: string): string =>
  pick(error instanceof Error, (error as Error).message, defaultMessage);
const stringValue = (value: unknown): string => pick(typeof value === 'string', value as string, '');
const numberValue = (value: unknown): number => pick(typeof value === 'number', value as number, Number.NaN);
function hasExactOwnKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const required = [...expected].sort();
  return all(
    actual.length === required.length,
    actual.every((key, index) => key === required[index]),
  );
}

const WORKFLOW_APPROVAL_SCHEMA = 'EdictumWorkflowApproval/v1' as const;
const WORKFLOW_STORE_IDENTITY_SCHEMA = 'EdictumWorkflowApprovalStoreIdentity/v1' as const;
const WORKFLOW_APPROVAL_KEYS = [
  'schema',
  'stage_id',
  'approval_id',
  'approver',
  'operation_hash',
  'tenant',
  'project',
  'approved_at',
  'expires_at',
  'evidence_digest',
] as const;
const WORKFLOW_APPROVAL_IDENTITY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const WORKFLOW_STORE_ID_PATTERN = /^(?!\.{1,2}$)[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const WORKFLOW_APPROVAL_IDENTITY_MAX_BYTES = 128;
const WORKFLOW_APPROVAL_COMMIT_UNKNOWN_GAP = 'GAP-RTNEW-EDICTUM-COMMIT-UNKNOWN-001';
function workflowApprovalCommitUnknownError(recoveryRecorded = true): Error {
  const detail = recoveryRecorded ? 'recovery marker recorded' : 'durable recovery marker unavailable';
  const error = new Error(
    'Edictum workflow approval commit state is unknown; ' + detail + '; recovery is required before replay',
  );
  Object.assign(error, { code: WORKFLOW_APPROVAL_COMMIT_UNKNOWN_GAP });
  return error;
}
const workflowHostAuthenticationProofBrand: unique symbol = Symbol(
  'candidate-edictum-workflow-host-authentication-proof',
);
const trustedWorkflowHostAuthenticationProofs = new WeakSet<object>();
const workflowHostAuthenticationProofBindings = new WeakMap<object, WorkflowHostAuthenticationProofBindings>();
const composingWorkflowHostAuthenticationProofs = new WeakSet<object>();

const trustedWorkflowHostCapabilities = new WeakSet<object>();
const workflowHostCapabilityBindings = new WeakMap<object, WorkflowHostBindings>();

export interface EdictumWorkflowApprovalReceipt {
  readonly schema: typeof WORKFLOW_APPROVAL_SCHEMA;
  readonly stage_id: string;
  readonly approval_id: string;
  readonly approver: string;
  readonly operation_hash: string;
  readonly tenant: string;
  readonly project: string;
  readonly approved_at: string;
  readonly expires_at: string;
  readonly evidence_digest: string;
}

export type EdictumWorkflowApprovalReceiptInput = Omit<EdictumWorkflowApprovalReceipt, 'evidence_digest'>;

export interface WorkflowHostCapability {
  readonly schema: 'WorkflowHostCapability/v1';
  readonly authenticatedPrincipal: string;
  readonly repositoryRoot: string;
  readonly storeId: string;
  readonly configDigest?: string;
  readonly consumeApproval: (binding: WorkflowApprovalBinding, apply: () => Promise<void>) => Promise<void>;
}

export interface WorkflowHostAuthenticationProof {
  readonly [workflowHostAuthenticationProofBrand]: true;
}

interface WorkflowHostAuthenticationProofBindings {
  readonly repositoryRoot: string;
  readonly authenticatedPrincipal: string;
  readonly configuredStoreId?: string;
}

export interface WorkflowApprovalBinding {
  readonly stage_id: string;
  readonly approval_id: string;
  readonly operation_hash: string;
  readonly tenant: string;
  readonly project: string;
}

interface WorkflowHostBindings {
  readonly authenticatedPrincipal: string;
  /** Durable hosts are bound to the canonical repository they protect. */
  readonly repositoryRoot: string;
  readonly storeId: string;
  readonly configDigest?: string;
  readonly repositoryRootIdentity?: string;
  readonly storeRoot?: string;
  readonly storeRootIdentity?: string;
  readonly storeGeneration?: string;
  readonly consumeApproval: (binding: WorkflowApprovalBinding, apply: () => Promise<void>) => Promise<void>;
}

export function computeEdictumWorkflowApprovalEvidenceDigest(value: EdictumWorkflowApprovalReceiptInput): string {
  return canonicalJsonDigest(value);
}

export interface ConfiguredEdictumWorkflow {
  readonly config_digest: string;
  /** Edictum only gates workflow progression; Cedar and host verification remain write authority. */
  readonly approval_authority: 'workflow-gate-only';
  readonly definition: WorkflowDefinition;
  readonly runtime: WorkflowRuntime;
  readonly session: EdictumSession;
  readonly evaluate: (tool: string, args?: Record<string, unknown>) => Promise<WorkflowEvaluation>;
  readonly approve: (receipt: unknown) => Promise<void>;
  readonly recordResult: (
    stageId: string,
    tool: string,
    args?: Record<string, unknown>,
    mcpResult?: Record<string, unknown>,
  ) => Promise<readonly Record<string, unknown>[]>;
  /**
   * Verifies the configured evidence contract. Terminal result recording calls
   * this automatically; it is exposed for an explicit acceptance boundary.
   */
  readonly assertRequiredStageEvidence: () => Promise<void>;
  readonly state: () => Promise<WorkflowState>;
}

function requireSupportedEdictumSandbox(policy: AgentRuntimeConfig['governance']['edictum']): void {
  requireCondition(policy.sandbox.allowlist.length === 0, 'unsupported Edictum sandbox allowlist');
}

/** Load the hash-bound Edictum limits/tools used by the composition root. */
export function loadConfiguredEdictumGovernancePolicy(
  repositoryRoot: string,
  config: AgentRuntimeConfig,
): EdictumGovernancePolicy {
  const root = requireAbsoluteRepositoryRoot(repositoryRoot);
  const current = loadRuntimeConfig(root);
  requireCondition(
    runtimeConfigDigest(current) === runtimeConfigDigest(config),
    'Edictum policy config snapshot is stale',
  );
  const policy = current.governance.edictum;
  requireSupportedEdictumSandbox(policy);
  const maxReadCalls = policy.limits.max_calls_per_tool['runtime.read'];
  const maxWriteCalls = policy.limits.max_calls_per_tool['runtime.write'];
  requireCondition(
    all(
      Number.isSafeInteger(policy.limits.max_attempts),
      policy.limits.max_attempts > 0,
      Number.isSafeInteger(policy.limits.max_tool_calls),
      policy.limits.max_tool_calls > 0,
      Boolean(maxReadCalls),
      Boolean(maxWriteCalls),
      policy.tool_allowlist.includes('runtime.read'),
      policy.tool_allowlist.includes('runtime.write'),
    ),
    'Edictum policy limits or tool allowlist are invalid',
  );
  return Object.freeze({
    policyVersion: policy.policy_version,
    maxAttempts: policy.limits.max_attempts,
    maxToolCalls: policy.limits.max_tool_calls,
    maxCallsPerTool: Object.freeze({ ...policy.limits.max_calls_per_tool }),
    tools: Object.freeze(
      Object.fromEntries(
        policy.tool_allowlist.map((tool) => [
          tool,
          Object.freeze({
            side_effect: pick(tool === 'runtime.read', 'read' as const, 'write' as const),
            idempotent: tool === 'runtime.read',
          }),
        ]),
      ),
    ),
  });
}

export function compileConfiguredEdictumWorkflow(config: AgentRuntimeConfig): WorkflowDefinition {
  const edictum = config.governance.edictum;
  requireSupportedEdictumSandbox(edictum);
  const raw = stringifyYaml(
    {
      apiVersion: 'edictum/v1',
      kind: 'Workflow',
      metadata: {
        name: edictum.workflow_id,
        description: 'Configured runtime governance workflow.',
        version: '1',
      },
      stages: edictum.workflow.stages.map((stage) => ({
        id: stage.id,
        description: 'Configured ' + stage.id + ' governance stage.',
        ...optionalObject(stage.tools.length > 0, { tools: stage.tools }),
        ...optionalObject(stage.approval_required, { approval: { message: 'Attributable approval is required.' } }),
        ...optionalObject(stage.require_result, {
          exit: [
            {
              condition: `mcp_result_matches("${stage.tools[0]}", "accepted", "true")`,
              message: 'Result evidence is required.',
            },
          ],
        }),
      })),
    },
    { lineWidth: 0 },
  );
  return loadWorkflowString(raw);
}

/**
 * Load the candidate Edictum workflow from repository configuration.
 *
 * This is deliberately a pure governance adapter: it owns only workflow
 * state/evidence for a session and never receives Cedar identity, checkpoint
 * writers, or lifecycle authority. Reads use the repository's no-follow
 * boundary, so an unsafe host fails closed before YAML is parsed.
 */
export function createConfiguredEdictumWorkflow(
  repositoryRoot: string,
  sessionId = 'candidate-edictum-workflow',
  host: WorkflowHostCapability,
): ConfiguredEdictumWorkflow {
  requireCondition(/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(sessionId), 'Edictum workflow session id is invalid');
  const hostBindings = workflowHostBindingsFromCapability(host);
  const root = requireAbsoluteRepositoryRoot(repositoryRoot);
  const access = requireSafeRepositoryAccess(root);
  const canonicalRoot = access.repository_root;
  requireCondition(hostBindings.repositoryRoot === canonicalRoot, 'Edictum workflow host repository root mismatch');
  const runtimeConfig = loadRuntimeConfig(root);
  const composedConfigDigest = runtimeConfigDigest(runtimeConfig);
  requireCondition(
    hostBindings.configDigest === undefined || hostBindings.configDigest === composedConfigDigest,
    'Edictum workflow host configuration snapshot is stale',
  );
  const assertRuntimeConfigCurrent = (): void =>
    requireCondition(
      runtimeConfigDigest(loadRuntimeConfig(root)) === composedConfigDigest,
      'Edictum workflow runtime configuration changed after composition',
    );
  const edictum = runtimeConfig.governance.edictum;
  const configuredStages = new Map(edictum.workflow.stages.map((stage) => [stage.id, stage] as const));
  const terminalStageId = edictum.workflow.stages.at(-1)?.id;
  const requiredStageEvidence = new Set<string>();
  const approvalClockSkewMs = edictum.approval.clock_skew_ms;
  const approvalMaxAgeMs = edictum.approval.max_age_ms;
  const definition = compileConfiguredEdictumWorkflow(runtimeConfig);
  const runtime = new WorkflowRuntime(definition);
  const session = new Session(sessionId, new MemoryBackend());
  let operationBinding: {
    operation_hash: string;
    tenant: string;
    project: string;
  } | null = null;
  const bindOperation = (tool: string, args: Record<string, unknown>): void => {
    deferPick(
      tool === 'runtime.write',
      () => {
        const operation_hash = args.operation_hash;
        const tenant = args.tenant;
        const project = args.project;
        requireCondition(
          all(typeof operation_hash === 'string', /^[a-f0-9]{64}$/.test(operation_hash as string)),
          'Edictum runtime.write operation hash is required',
        );
        requireCondition(
          all(typeof tenant === 'string', /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(tenant as string)),
          'Edictum runtime.write tenant is required',
        );
        requireCondition(
          all(typeof project === 'string', /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(project as string)),
          'Edictum runtime.write project is required',
        );
        const next = { operation_hash: operation_hash as string, tenant: tenant as string, project: project as string };
        requireCondition(
          any(!operationBinding, canonicalJson(operationBinding) === canonicalJson(next)),
          'Edictum workflow operation binding changed',
        );
        operationBinding = next;
      },
      () => undefined,
    );
  };
  const assertRequiredStageEvidence = async (): Promise<void> => {
    assertRuntimeConfigCurrent();
    const missing = edictum.evidence.required_stages.filter((stageId) => !requiredStageEvidence.has(stageId));
    requireCondition(
      missing.length === 0,
      'GAP-RTNEW-EDICTUM-EVIDENCE-001: required Edictum stage evidence is incomplete: ' + missing.join(', '),
    );
    // Edictum clears the active stage after a terminal result. Evidence is
    // captured only after its promise resolves, so terminal completion does
    // not depend on an implementation-specific post-terminal state shape.
    await runtime.state(session);
    assertRuntimeConfigCurrent();
  };
  const snapshotApproval = (input: unknown): EdictumWorkflowApprovalReceipt => {
    const record = pick(isPlainRecord(input), input as Record<string, unknown>, {});
    const keys = Reflect.ownKeys(record);
    requireCondition(
      all(isPlainRecord(input), Object.getPrototypeOf(record) === Object.prototype),
      'Edictum workflow approval receipt must be a plain object',
    );
    requireCondition(
      keys.every((key) => typeof key === 'string'),
      'Edictum workflow approval receipt fields are invalid',
    );
    const descriptors = keys.map((key) => Object.getOwnPropertyDescriptor(record, key as string));
    requireCondition(
      descriptors.every((descriptor) => all(Boolean(descriptor), 'value' in (descriptor as PropertyDescriptor))),
      'Edictum workflow approval receipt accessors are invalid',
    );
    const names = keys as string[];
    requireCondition(
      all(
        names.length === WORKFLOW_APPROVAL_KEYS.length,
        names.every((key) => WORKFLOW_APPROVAL_KEYS.includes(key as (typeof WORKFLOW_APPROVAL_KEYS)[number])),
      ),
      'Edictum workflow approval receipt fields are invalid',
    );
    const snapshot = Object.create(Object.prototype) as Record<string, unknown>;
    names.forEach((key, index) => {
      snapshot[key] = descriptors[index]?.value;
    });
    requireCondition(
      WORKFLOW_APPROVAL_KEYS.every((key) => typeof snapshot[key] === 'string'),
      'Edictum workflow approval receipt field types are invalid',
    );
    return Object.freeze(snapshot) as unknown as EdictumWorkflowApprovalReceipt;
  };
  const validateIdentity = (value: string, label: string): void => {
    requireCondition(
      all(
        WORKFLOW_APPROVAL_IDENTITY_PATTERN.test(value),
        Buffer.byteLength(value, 'utf8') <= WORKFLOW_APPROVAL_IDENTITY_MAX_BYTES,
      ),
      `Edictum workflow approval ${label} identity is invalid`,
    );
  };
  const validateApproval = (
    receipt: EdictumWorkflowApprovalReceipt,
    binding: { operation_hash: string; tenant: string; project: string },
  ): void => {
    requireCondition(
      receipt.schema === WORKFLOW_APPROVAL_SCHEMA,
      'Edictum workflow approval receipt schema is invalid',
    );
    validateIdentity(receipt.stage_id, 'stage');
    validateIdentity(receipt.approval_id, 'approval');
    validateIdentity(receipt.approver, 'approver');
    requireCondition(
      receipt.approver === hostBindings.authenticatedPrincipal,
      'Edictum workflow approval approver is not the authenticated host principal',
    );
    requireCondition(
      all(
        /^[a-f0-9]{64}$/.test(receipt.operation_hash),
        /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(receipt.tenant),
        Buffer.byteLength(receipt.tenant, 'utf8') <= WORKFLOW_APPROVAL_IDENTITY_MAX_BYTES,
        /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(receipt.project),
        Buffer.byteLength(receipt.project, 'utf8') <= WORKFLOW_APPROVAL_IDENTITY_MAX_BYTES,
      ),
      'Edictum workflow approval operation fields are invalid',
    );
    requireCondition(
      all(
        receipt.operation_hash === binding.operation_hash,
        receipt.tenant === binding.tenant,
        receipt.project === binding.project,
      ),
      'Edictum workflow approval operation binding is invalid',
    );
    requireCondition(
      all(isStrictRfc3339Timestamp(receipt.approved_at), isStrictRfc3339Timestamp(receipt.expires_at)),
      'Edictum workflow approval expiry is invalid',
    );
    const approvedAt = rfc3339TimestampMilliseconds(receipt.approved_at);
    const expiresAt = rfc3339TimestampMilliseconds(receipt.expires_at);
    const now = Date.now();
    requireCondition(
      all(
        approvedAt !== null,
        expiresAt !== null,
        approvedAt! <= now + approvalClockSkewMs,
        now - approvedAt! <= approvalMaxAgeMs,
        expiresAt! > approvedAt!,
        expiresAt! > now,
      ),
      'Edictum workflow approval expiry is invalid',
    );
    requireCondition(
      /^[a-f0-9]{64}$/.test(receipt.evidence_digest),
      'Edictum workflow approval evidence digest format is invalid',
    );
    const { evidence_digest: _evidenceDigest, ...unsignedReceipt } = receipt;
    requireCondition(
      receipt.evidence_digest === computeEdictumWorkflowApprovalEvidenceDigest(unsignedReceipt),
      'Edictum workflow approval evidence digest is invalid',
    );
  };
  let approvalQueue: Promise<void> = Promise.resolve();
  const envelope = (tool: string, args: Record<string, unknown> = {}): ToolCall =>
    createEnvelope(tool, args, {
      runId: session.sessionId,
      environment: 'candidate',
      caller: 'candidate-edictum-workflow',
    });
  return Object.freeze({
    config_digest: runtimeConfigDigest(runtimeConfig),
    approval_authority: 'workflow-gate-only',
    definition,
    runtime,
    session,
    evaluate: (tool: string, args: Record<string, unknown> = {}) => {
      assertRuntimeConfigCurrent();
      bindOperation(tool, args);
      return runtime.evaluate(session, envelope(tool, args)).then((result) => {
        assertRuntimeConfigCurrent();
        return result;
      });
    },
    approve: async (input: unknown) => {
      assertRuntimeConfigCurrent();
      const receipt = snapshotApproval(input);
      const binding = pick(Boolean(operationBinding), Object.freeze({ ...operationBinding! }), null);
      requireCondition(Boolean(binding), 'Edictum workflow approval requires a pending operation binding');
      validateApproval(receipt, binding!);
      assertRuntimeConfigCurrent();
      const run = approvalQueue.then(async () => {
        assertRuntimeConfigCurrent();
        const approvalBinding = Object.freeze({
          stage_id: receipt.stage_id,
          approval_id: receipt.approval_id,
          ...binding!,
        });
        const current = await runtime.state(session);
        requireCondition(
          current.pendingApproval?.stageId === receipt.stage_id,
          'Edictum workflow approval stage is not pending (stale request or receipt replay)',
        );
        assertRuntimeConfigCurrent();
        await hostBindings.consumeApproval(approvalBinding, async () => {
          assertRuntimeConfigCurrent();
          try {
            await runtime.recordApproval(session, receipt.stage_id);
            requiredStageEvidence.add(receipt.stage_id);
            assertRuntimeConfigCurrent();
          } catch (error) {
            await runtime.reset(session, current.activeStage);
            throw error;
          }
        });
      });
      approvalQueue = run.catch(() => undefined);
      return run;
    },
    recordResult: (
      stageId: string,
      tool: string,
      args: Record<string, unknown> = {},
      mcpResult?: Record<string, unknown>,
    ) => {
      assertRuntimeConfigCurrent();
      bindOperation(tool, args);
      const resultRecord = pick(isPlainRecord(mcpResult), mcpResult as Record<string, unknown>, {});
      requireCondition(
        any(
          tool !== 'runtime.write',
          !isPlainRecord(mcpResult),
          !('accepted' in resultRecord),
          typeof resultRecord.accepted === 'boolean',
        ),
        'Edictum runtime.write accepted result must be boolean',
      );
      const normalized = deferPick(
        all(isPlainRecord(mcpResult), typeof resultRecord.accepted === 'boolean'),
        () => ({ ...resultRecord, accepted: String(resultRecord.accepted) }),
        () => mcpResult,
      );
      const stage = configuredStages.get(stageId);
      requireCondition(Boolean(stage), 'Edictum result stage is not configured');
      requireCondition(stage!.tools.includes(tool), 'Edictum result tool is not configured for the stage');
      return runtime.recordResult(session, stageId, envelope(tool, args), normalized).then(async (result) => {
        requiredStageEvidence.add(stageId);
        assertRuntimeConfigCurrent();
        if (stageId === terminalStageId) await assertRequiredStageEvidence();
        return result;
      });
    },
    assertRequiredStageEvidence,
    state: () => {
      assertRuntimeConfigCurrent();
      return runtime.state(session).then((result) => {
        assertRuntimeConfigCurrent();
        return result;
      });
    },
  });
}

function issueWorkflowHostCapability(bindings: WorkflowHostBindings): WorkflowHostCapability {
  validateWorkflowHostBindings(bindings);
  const capability = Object.freeze({
    schema: 'WorkflowHostCapability/v1' as const,
    authenticatedPrincipal: bindings.authenticatedPrincipal,
    repositoryRoot: bindings.repositoryRoot,
    storeId: bindings.storeId,
    ...(bindings.configDigest === undefined ? {} : { configDigest: bindings.configDigest }),
    consumeApproval: bindings.consumeApproval,
  });
  trustedWorkflowHostCapabilities.add(capability);
  workflowHostCapabilityBindings.set(capability, Object.freeze({ ...bindings }));
  return capability;
}

function validateWorkflowHostBindings(bindings: WorkflowHostBindings): void {
  requireCondition(
    all(Boolean(bindings), typeof bindings === 'object', typeof bindings.consumeApproval === 'function'),
    'Edictum workflow host approval consumer is required',
  );
  validateWorkflowIdentity(bindings.authenticatedPrincipal, 'authenticated host principal');
  requireAbsoluteRepositoryRoot(bindings.repositoryRoot);
  requireCondition(
    all(
      typeof bindings.storeId === 'string',
      WORKFLOW_STORE_ID_PATTERN.test(bindings.storeId),
      bindings.configDigest === undefined || /^[a-f0-9]{64}$/.test(bindings.configDigest),
    ),
    'Edictum workflow host durable store binding is invalid',
  );
}

function workflowHostBindingsFromCapability(value: WorkflowHostCapability): WorkflowHostBindings {
  requireCondition(value !== null && typeof value === 'object', 'Edictum workflow host capability is required');
  const capabilityObject = value as unknown as object;
  requireCondition(
    trustedWorkflowHostCapabilities.has(capabilityObject),
    'Edictum workflow host capability must be issued by a trusted host and remain opaque',
  );
  const bindings = workflowHostCapabilityBindings.get(capabilityObject);
  requireCondition(Boolean(bindings), 'Edictum workflow host capability binding is unavailable');
  return bindings!;
}

function validateWorkflowIdentity(value: string, label: string): void {
  const normalized = stringValue(value);
  requireCondition(
    all(
      typeof value === 'string',
      WORKFLOW_APPROVAL_IDENTITY_PATTERN.test(normalized),
      Buffer.byteLength(normalized, 'utf8') <= WORKFLOW_APPROVAL_IDENTITY_MAX_BYTES,
    ),
    `${label} is invalid`,
  );
}

export interface WorkflowApprovalConsumptionRecord {
  readonly schema: 'EdictumWorkflowApprovalConsumption/v1';
  readonly store_id: string;
  readonly store_generation: string;
  readonly binding: WorkflowApprovalBinding;
  readonly fencing_token: string;
  readonly status: 'reserved' | 'commit_unknown' | 'applied' | 'aborted';
  readonly reserved_at: string;
  readonly approval_expires_at: string | null;
  readonly attempt_id: string | null;
  readonly terminal_at?: string;
}

/** Internal host storage port; its methods are pinned before an opaque capability is issued. */
export interface HostGovernancePersistence {
  readonly workspaceId: string;
  readonly reserveOperation: (storeId: string, key: string, requestDigest: string) => OperationReservation | null;
  readonly inspectOperation: (storeId: string, key: string) => OperationReservation | null;
  readonly transitionOperation: (
    reservation: OperationReservation,
    status: OperationReservationStatus,
    resultDigest?: string,
  ) => void;
  readonly consumeApproval: (
    storeId: string,
    binding: WorkflowApprovalBinding,
    apply: () => Promise<void>,
  ) => Promise<void>;
}
const hostGovernanceBrand: unique symbol = Symbol('host-sqlite-governance');
export interface HostGovernanceCapability {
  readonly [hostGovernanceBrand]: true;
}
const hostGovernanceBindings = new WeakMap<object, Readonly<HostGovernancePersistence>>();

/** @internal Issued by HostStateStore; not part of the published package API. */
export function issueHostGovernanceCapability(storage: HostGovernancePersistence): HostGovernanceCapability {
  requireCondition(/^[a-f0-9]{64}$/.test(storage.workspaceId), 'host governance workspace is invalid');
  const capability = Object.freeze({ [hostGovernanceBrand]: true }) as HostGovernanceCapability;
  hostGovernanceBindings.set(
    capability,
    Object.freeze({
      workspaceId: storage.workspaceId,
      reserveOperation: storage.reserveOperation.bind(storage),
      inspectOperation: storage.inspectOperation.bind(storage),
      transitionOperation: storage.transitionOperation.bind(storage),
      consumeApproval: storage.consumeApproval.bind(storage),
    }),
  );
  return capability;
}
export function requireHostGovernanceCapability(capability: HostGovernanceCapability): void {
  requireCondition(
    typeof capability === 'object' && capability !== null && hostGovernanceBindings.has(capability),
    'host governance requires an opaque SQLite capability',
  );
}

export function validateHostWorkflowApprovalRecord(value: unknown): WorkflowApprovalConsumptionRecord {
  requireCondition(isPlainRecord(value), 'host workflow approval record is invalid');
  const record = value as WorkflowApprovalConsumptionRecord;
  const keys = [
    'schema',
    'store_id',
    'store_generation',
    'binding',
    'fencing_token',
    'status',
    'reserved_at',
    'approval_expires_at',
    'attempt_id',
  ];
  if (record.status !== 'reserved') keys.push('terminal_at');
  requireCondition(
    hasExactOwnKeys(record as unknown as Record<string, unknown>, keys) &&
      record.schema === 'EdictumWorkflowApprovalConsumption/v1' &&
      validWorkflowApprovalBinding(record.binding) &&
      WORKFLOW_STORE_ID_PATTERN.test(record.store_id) &&
      RESERVATION_FENCING_TOKEN.test(record.store_generation) &&
      RESERVATION_FENCING_TOKEN.test(record.fencing_token) &&
      ['reserved', 'commit_unknown', 'applied', 'aborted'].includes(record.status) &&
      isStrictRfc3339Timestamp(record.reserved_at) &&
      (record.approval_expires_at === null || isStrictRfc3339Timestamp(record.approval_expires_at)) &&
      (record.attempt_id === null || /^[0-9a-f]{64}$/.test(record.attempt_id)) &&
      (record.status === 'reserved' || isStrictRfc3339Timestamp(record.terminal_at)),
    'host workflow approval record is invalid',
  );
  return record;
}

interface WorkflowApprovalStoreIdentity {
  readonly schema: typeof WORKFLOW_STORE_IDENTITY_SCHEMA;
  readonly repository_root: string;
  readonly store_id: string;
  readonly repository_root_identity: string;
  readonly store_root_identity: string;
  readonly generation: string;
}

function workflowApprovalStorePath(repositoryRoot: string, storeId: string): string {
  return path.join(repositoryRoot, '.agent', 'work', 'runtime-workflow-approvals', storeId);
}

function workflowApprovalStoreIdentityPath(storeRoot: string): string {
  return path.join(storeRoot, '.identity.json');
}

function parseWorkflowStoreIdentity(raw: string): WorkflowApprovalStoreIdentity {
  const value = Result.fromThrowable(
    () => JSON.parse(raw) as unknown,
    () => new Error('Edictum workflow approval store identity is invalid'),
  )().match(
    (parsed) => parsed,
    (error) => {
      throw error;
    },
  );
  const record = pick(isPlainRecord(value), value as Record<string, unknown>, {});
  const repositoryRoot = stringValue(record.repository_root);
  const storeId = stringValue(record.store_id);
  const repositoryIdentity = stringValue(record.repository_root_identity);
  const storeIdentity = stringValue(record.store_root_identity);
  const generation = stringValue(record.generation);
  requireCondition(
    all(
      isPlainRecord(value),
      hasExactOwnKeys(record, [
        'schema',
        'repository_root',
        'store_id',
        'repository_root_identity',
        'store_root_identity',
        'generation',
      ]),
      record.schema === WORKFLOW_STORE_IDENTITY_SCHEMA,
      typeof record.repository_root === 'string',
      typeof record.store_id === 'string',
      typeof record.repository_root_identity === 'string',
      typeof record.store_root_identity === 'string',
      typeof record.generation === 'string',
      path.isAbsolute(repositoryRoot),
      WORKFLOW_APPROVAL_IDENTITY_PATTERN.test(storeId),
      repositoryIdentity.length > 0,
      storeIdentity.length > 0,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(generation),
    ),
    'Edictum workflow approval store identity is invalid',
  );
  return value as WorkflowApprovalStoreIdentity;
}

function readWorkflowStoreIdentity(
  access: ReturnType<typeof requireSafeRepositoryAccess>,
  identityPath: string,
): WorkflowApprovalStoreIdentity | null {
  const read = (): WorkflowApprovalStoreIdentity =>
    parseWorkflowStoreIdentity(access.readText(identityPath, 'Edictum workflow approval store identity'));
  return deferPick(access.fileExists(identityPath, 'Edictum workflow approval store identity'), read, () => null);
}
function assertWorkflowStoreIdentity(
  access: ReturnType<typeof requireSafeRepositoryAccess>,
  identityPath: string,
  repositoryRoot: string,
  storeRoot: string,
  storeId: string,
  repositoryRootIdentity: string,
  storeRootIdentity: string,
  generation: string,
): void {
  requireCondition(
    access.directoryIdentity('.', 'repository root') === repositoryRootIdentity,
    'Edictum workflow repository root identity mismatch',
  );
  requireCondition(
    access.directoryIdentity(path.relative(repositoryRoot, storeRoot), 'approval store') === storeRootIdentity,
    'Edictum workflow approval store identity mismatch',
  );
  const identity = readWorkflowStoreIdentity(access, identityPath);
  requireCondition(
    all(
      Boolean(identity),
      identity?.repository_root === repositoryRoot,
      identity?.store_id === storeId,
      identity?.repository_root_identity === repositoryRootIdentity,
      identity?.store_root_identity === storeRootIdentity,
      identity?.generation === generation,
    ),
    'Edictum workflow approval store generation mismatch',
  );
}

function workflowApprovalMarkerPath(storeRoot: string, binding: WorkflowApprovalBinding): string {
  const digest = canonicalJsonDigest(binding);
  return path.join(storeRoot, `${digest}.json`);
}

function validWorkflowApprovalBinding(value: unknown): value is WorkflowApprovalBinding {
  const record = pick(isPlainRecord(value), value as Record<string, unknown>, {});
  const keys = Object.keys(record).sort();
  return all(
    isPlainRecord(value),
    keys.join(',') === 'approval_id,operation_hash,project,stage_id,tenant',
    typeof record.stage_id === 'string',
    WORKFLOW_APPROVAL_IDENTITY_PATTERN.test(record.stage_id as string),
    typeof record.approval_id === 'string',
    WORKFLOW_APPROVAL_IDENTITY_PATTERN.test(record.approval_id as string),
    typeof record.operation_hash === 'string',
    /^[a-f0-9]{64}$/.test(record.operation_hash as string),
    typeof record.tenant === 'string',
    WORKFLOW_APPROVAL_IDENTITY_PATTERN.test(record.tenant as string),
    typeof record.project === 'string',
    WORKFLOW_APPROVAL_IDENTITY_PATTERN.test(record.project as string),
  );
}

function readWorkflowApprovalMarker(
  access: ReturnType<typeof requireSafeRepositoryAccess>,
  target: string,
): { raw: string; record: WorkflowApprovalConsumptionRecord } | null {
  const read = (candidate: string): { raw: string; record: WorkflowApprovalConsumptionRecord } => {
    const raw = access.readText(candidate, 'Edictum workflow approval consumption marker');
    const parsed = JSON.parse(raw) as unknown;
    const record = pick(
      isPlainRecord(parsed),
      parsed as Record<string, unknown>,
      {},
    ) as unknown as WorkflowApprovalConsumptionRecord;
    const expectedKeys = pick(
      record.status === 'reserved',
      [
        'schema',
        'store_id',
        'store_generation',
        'binding',
        'fencing_token',
        'status',
        'reserved_at',
        'approval_expires_at',
        'attempt_id',
      ],
      [
        'schema',
        'store_id',
        'store_generation',
        'binding',
        'fencing_token',
        'status',
        'reserved_at',
        'approval_expires_at',
        'attempt_id',
        'terminal_at',
      ],
    );
    requireCondition(
      all(
        isPlainRecord(record),
        record.schema === 'EdictumWorkflowApprovalConsumption/v1',
        validWorkflowApprovalBinding(record.binding),
        Boolean(record.fencing_token),
        Boolean(record.store_generation),
        ['reserved', 'commit_unknown', 'applied', 'aborted'].includes(record.status),
        hasExactOwnKeys(record as unknown as Record<string, unknown>, expectedKeys),
        WORKFLOW_APPROVAL_IDENTITY_PATTERN.test(record.store_id),
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(record.store_generation),
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(record.fencing_token),
        isStrictRfc3339Timestamp(record.reserved_at),
        record.approval_expires_at === null,
        record.attempt_id === null,
        any(record.status === 'reserved', isStrictRfc3339Timestamp(record.terminal_at)),
      ),
      'Edictum workflow approval consumption marker is invalid',
    );
    return { raw, record };
  };
  const unknownTarget = target + '.commit-unknown';
  return deferPick(
    access.fileExists(unknownTarget, 'Edictum workflow approval commit-unknown marker'),
    () => read(unknownTarget),
    () =>
      deferPick(
        access.fileExists(target, 'Edictum workflow approval consumption marker'),
        () => read(target),
        () => null,
      ),
  );
}
function markerHash(raw: string): string {
  return createHash('sha256').update(raw, 'utf8').digest('hex');
}

function workflowApprovalRecord(
  binding: WorkflowApprovalBinding,
  storeId: string,
  storeGeneration: string,
  fencingToken: string,
  status: WorkflowApprovalConsumptionRecord['status'],
): WorkflowApprovalConsumptionRecord {
  return Object.freeze({
    schema: 'EdictumWorkflowApprovalConsumption/v1',
    store_id: storeId,
    store_generation: storeGeneration,
    binding: Object.freeze({ ...binding }),
    fencing_token: fencingToken,
    status,
    reserved_at: new Date().toISOString(),
    approval_expires_at: null,
    attempt_id: null,
    ...optionalObject(any(status === 'applied', status === 'aborted', status === 'commit_unknown'), {
      terminal_at: new Date().toISOString(),
    }),
  });
}

async function consumeWorkflowLocked(
  access: ReturnType<typeof requireSafeRepositoryAccess>,
  marker: string,
  storeId: string,
  generation: string,
  binding: WorkflowApprovalBinding,
  assertIdentity: () => void,
  apply: () => Promise<void>,
  setReserved: (value: WorkflowApprovalConsumptionRecord) => void,
  beforeCommit: () => void,
): Promise<void> {
  assertIdentity();
  const current = readWorkflowApprovalMarker(access, marker);
  const reserved = { value: undefined as WorkflowApprovalConsumptionRecord | undefined };
  const reserve = (value: WorkflowApprovalConsumptionRecord): void => {
    reserved.value = value;
    setReserved(value);
  };
  await deferPick(
    Boolean(current),
    async () => {
      requireCondition(
        all(
          current!.record.store_id === storeId,
          current!.record.store_generation === generation,
          canonicalJson(current!.record.binding) === canonicalJson(binding),
        ),
        'Edictum workflow approval consumption binding conflict',
      );
      if (current!.record.status === 'commit_unknown') throw workflowApprovalCommitUnknownError();
      requireCondition(
        all(current!.record.status !== 'reserved', current!.record.status !== 'applied'),
        'Edictum workflow approval receipt replay',
      );
      const next = workflowApprovalRecord(binding, storeId, generation, randomUUID(), 'reserved');
      reserve(next);
      await access.replaceAtomicAsync(
        marker,
        markerHash(current!.raw),
        JSON.stringify(next),
        'Edictum workflow approval consumption reservation',
      );
    },
    async () => {
      const next = workflowApprovalRecord(binding, storeId, generation, randomUUID(), 'reserved');
      reserve(next);
      await access.writeExclusiveAsync(
        marker,
        JSON.stringify(next),
        'Edictum workflow approval consumption reservation',
      );
    },
  );
  await ResultAsync.fromPromise(apply(), (error) => error).match(
    () => undefined,
    async (error) => {
      assertIdentity();
      const abortedCurrent = readWorkflowApprovalMarker(access, marker);
      requireCondition(
        all(
          Boolean(abortedCurrent),
          abortedCurrent?.record.fencing_token === reserved.value!.fencing_token,
          abortedCurrent?.record.status === 'reserved',
        ),
        'Edictum workflow approval consumption fencing conflict',
      );
      const aborted = workflowApprovalRecord(binding, storeId, generation, reserved.value!.fencing_token, 'aborted');
      await access.replaceAtomicAsync(
        marker,
        markerHash(abortedCurrent!.raw),
        JSON.stringify(aborted),
        'Edictum workflow approval consumption abort',
      );
      throw error;
    },
  );
  assertIdentity();
  const appliedCurrent = readWorkflowApprovalMarker(access, marker);
  requireCondition(
    all(
      Boolean(appliedCurrent),
      appliedCurrent?.record.fencing_token === reserved.value!.fencing_token,
      appliedCurrent?.record.status === 'reserved',
    ),
    'Edictum workflow approval consumption fencing conflict',
  );
  const applied = workflowApprovalRecord(binding, storeId, generation, reserved.value!.fencing_token, 'applied');
  try {
    beforeCommit();
    await access.replaceAtomicAsync(
      marker,
      markerHash(appliedCurrent!.raw),
      JSON.stringify(applied),
      'Edictum workflow approval consumption commit',
    );
  } catch {
    const unknown = workflowApprovalRecord(
      binding,
      storeId,
      generation,
      reserved.value!.fencing_token,
      'commit_unknown',
    );
    let recorded = false;
    try {
      await access.replaceAtomicAsync(
        marker,
        markerHash(appliedCurrent!.raw),
        JSON.stringify(unknown),
        'Edictum workflow approval commit-unknown recovery',
      );
      recorded = true;
    } catch {
      try {
        await access.writeExclusiveAsync(
          marker + '.commit-unknown',
          JSON.stringify(unknown),
          'Edictum workflow approval commit-unknown marker',
        );
        recorded = true;
      } catch {
        recorded = false;
      }
    }
    if (!recorded) throw workflowApprovalCommitUnknownError(false);
    throw workflowApprovalCommitUnknownError(true);
  }
}
async function consumeFileWorkflowApproval(
  access: ReturnType<typeof requireSafeRepositoryAccess>,
  marker: string,
  storeId: string,
  repositoryRoot: string,
  storeRoot: string,
  identityPath: string,
  repositoryRootIdentity: string,
  storeRootIdentity: string,
  generation: string,
  binding: WorkflowApprovalBinding,
  apply: () => Promise<void>,
  beforeCommit: () => void = () => undefined,
): Promise<void> {
  const lock = `${marker}.lock`;
  const assertIdentity = (): void =>
    assertWorkflowStoreIdentity(
      access,
      identityPath,
      repositoryRoot,
      storeRoot,
      storeId,
      repositoryRootIdentity,
      storeRootIdentity,
      generation,
    );
  await access.withExclusiveLockAsync(lock, 'Edictum workflow approval consumption lock', () =>
    consumeWorkflowLocked(
      access,
      marker,
      storeId,
      generation,
      binding,
      assertIdentity,
      apply,
      () => undefined,
      beforeCommit,
    ),
  );
}

/** Shared file-backed composition used by the proof-backed host and internal tests. */
async function createFileWorkflowHostCapabilityInternal(
  repositoryRoot: string,
  authenticatedPrincipal: string,
  configuredStoreId?: string,
  beforeCommit: () => void = () => undefined,
): Promise<WorkflowHostCapability> {
  validateWorkflowIdentity(authenticatedPrincipal, 'authenticated host principal');
  const root = requireAbsoluteRepositoryRoot(repositoryRoot);
  const access = requireSafeRepositoryAccess(root);
  const initialConfig = loadRuntimeConfig(root);
  const configDigest = runtimeConfigDigest(initialConfig);
  const defaultStoreId = initialConfig.governance.edictum.workflow_id;
  const storeId = [defaultStoreId, configuredStoreId as string][Number(configuredStoreId !== undefined)]!;
  requireCondition(WORKFLOW_STORE_ID_PATTERN.test(storeId), 'Edictum workflow approval store id is invalid');
  const storeRoot = workflowApprovalStorePath(root, storeId);
  await access.ensureDirectoryAsync(storeRoot, 'Edictum workflow approval store');
  requireCondition(
    runtimeConfigDigest(loadRuntimeConfig(root)) === configDigest,
    'Edictum workflow host configuration changed during composition',
  );
  const canonicalRoot = access.repository_root;
  const repositoryRootIdentity = access.directoryIdentity('.', 'repository root');
  const storeRootIdentity = access.directoryIdentity(path.relative(root, storeRoot), 'approval store');
  const identityPath = workflowApprovalStoreIdentityPath(storeRoot);
  const identityMatches = (candidate: WorkflowApprovalStoreIdentity | null): boolean =>
    Boolean(candidate) &&
    all(
      candidate?.repository_root === canonicalRoot,
      candidate?.store_id === storeId,
      candidate?.repository_root_identity === repositoryRootIdentity,
      candidate?.store_root_identity === storeRootIdentity,
    );
  let existingIdentity = readWorkflowStoreIdentity(access, identityPath);
  requireCondition(
    !existingIdentity || identityMatches(existingIdentity),
    'Edictum workflow approval store identity conflict',
  );
  let storeGeneration = existingIdentity?.generation ?? randomUUID();
  if (!existingIdentity) {
    const identity: WorkflowApprovalStoreIdentity = {
      schema: WORKFLOW_STORE_IDENTITY_SCHEMA,
      repository_root: canonicalRoot,
      store_id: storeId,
      repository_root_identity: repositoryRootIdentity,
      store_root_identity: storeRootIdentity,
      generation: storeGeneration,
    };
    try {
      await access.writeExclusiveAsync(
        identityPath,
        JSON.stringify(identity),
        'Edictum workflow approval store identity',
      );
    } catch (error) {
      const concurrentIdentity = readWorkflowStoreIdentity(access, identityPath);
      if (!identityMatches(concurrentIdentity)) throw error;
      existingIdentity = concurrentIdentity;
      storeGeneration = concurrentIdentity!.generation;
    }
  }
  requireCondition(
    runtimeConfigDigest(loadRuntimeConfig(root)) === configDigest,
    'Edictum workflow host configuration changed during composition',
  );
  return issueWorkflowHostCapability({
    authenticatedPrincipal,
    configDigest,
    repositoryRoot: canonicalRoot,
    storeId,
    repositoryRootIdentity,
    storeRoot,
    storeRootIdentity,
    storeGeneration,
    consumeApproval: (binding, apply) =>
      consumeFileWorkflowApproval(
        access,
        workflowApprovalMarkerPath(storeRoot, binding),
        storeId,
        canonicalRoot,
        storeRoot,
        identityPath,
        repositoryRootIdentity,
        storeRootIdentity,
        storeGeneration,
        binding,
        apply,
        beforeCommit,
      ),
  });
}

/** Internal composition adapter; the published root exposes only the proof-backed wrapper. */
export async function createFileWorkflowHostCapability(
  repositoryRoot: string,
  authenticatedPrincipal: string,
  configuredStoreId?: string,
): Promise<WorkflowHostCapability> {
  return createFileWorkflowHostCapabilityInternal(repositoryRoot, authenticatedPrincipal, configuredStoreId);
}

/** @internal Test-only file-backed issuer; never re-export from the package root. */
export async function createTestFileWorkflowHostCapability(
  repositoryRoot: string,
  authenticatedPrincipal = 'human:workflow-reviewer',
  configuredStoreId = 'test-file-workflow-' + randomUUID(),
  beforeCommit: () => void = () => undefined,
): Promise<WorkflowHostCapability> {
  return createFileWorkflowHostCapabilityInternal(
    repositoryRoot,
    authenticatedPrincipal,
    configuredStoreId,
    beforeCommit,
  );
}

/** Internal composition-root proof issuer; deliberately not re-exported by src/index.ts. */
function issueWorkflowHostProof(
  repositoryRoot: string,
  authenticatedPrincipal: string,
  configuredStoreId?: string,
): WorkflowHostAuthenticationProof {
  const root = requireAbsoluteRepositoryRoot(repositoryRoot);
  validateWorkflowIdentity(authenticatedPrincipal, 'authenticated host principal');
  requireCondition(
    configuredStoreId === undefined || WORKFLOW_STORE_ID_PATTERN.test(configuredStoreId),
    'Edictum workflow host store id is invalid',
  );
  const proof = Object.freeze({
    [workflowHostAuthenticationProofBrand]: true,
  }) as WorkflowHostAuthenticationProof;
  trustedWorkflowHostAuthenticationProofs.add(proof);
  const proofBindings: WorkflowHostAuthenticationProofBindings = {
    repositoryRoot: root,
    authenticatedPrincipal,
    ...(configuredStoreId === undefined ? {} : { configuredStoreId }),
  };
  workflowHostAuthenticationProofBindings.set(proof, Object.freeze(proofBindings));
  return proof;
}
export { issueWorkflowHostProof as createWorkflowHostAuthenticationProofForCompositionRoot };

function workflowHostBindingsFromAuthenticationProof(proof: unknown): WorkflowHostAuthenticationProofBindings {
  requireCondition(
    typeof proof === 'object' && proof !== null && trustedWorkflowHostAuthenticationProofs.has(proof as object),
    'Edictum workflow host authentication proof is required',
  );
  const bindings = workflowHostAuthenticationProofBindings.get(proof as object);
  requireCondition(bindings !== undefined, 'Edictum workflow host authentication proof is invalid');
  return bindings as WorkflowHostAuthenticationProofBindings;
}

/** Published composition-root adapter; identity and repository bindings come from the proof. */
export async function createFileWorkflowHostCapabilityWithProof(
  proof: WorkflowHostAuthenticationProof,
  storageCapability?: HostGovernanceCapability,
): Promise<WorkflowHostCapability> {
  const proofObject = proof as object;
  const bindings = workflowHostBindingsFromAuthenticationProof(proof);
  requireCondition(
    !composingWorkflowHostAuthenticationProofs.has(proofObject),
    'Edictum workflow host authentication proof composition is already in progress',
  );
  composingWorkflowHostAuthenticationProofs.add(proofObject);
  try {
    const capability =
      storageCapability === undefined
        ? await createFileWorkflowHostCapability(
            bindings.repositoryRoot,
            bindings.authenticatedPrincipal,
            bindings.configuredStoreId,
          )
        : createHostWorkflowCapability(bindings, storageCapability);
    trustedWorkflowHostAuthenticationProofs.delete(proofObject);
    workflowHostAuthenticationProofBindings.delete(proofObject);
    return capability;
  } finally {
    composingWorkflowHostAuthenticationProofs.delete(proofObject);
  }
}

function createHostWorkflowCapability(
  bindings: WorkflowHostAuthenticationProofBindings,
  capability: HostGovernanceCapability,
): WorkflowHostCapability {
  requireHostGovernanceCapability(capability);
  const config = loadRuntimeConfig(bindings.repositoryRoot);
  const configDigest = runtimeConfigDigest(config);
  const storeId = bindings.configuredStoreId ?? config.governance.edictum.workflow_id;
  const storage = hostGovernanceBindings.get(capability)!;
  return issueWorkflowHostCapability({
    authenticatedPrincipal: bindings.authenticatedPrincipal,
    repositoryRoot: bindings.repositoryRoot,
    configDigest,
    storeId,
    consumeApproval: async (binding, apply) => {
      requireCondition(
        runtimeConfigDigest(loadRuntimeConfig(bindings.repositoryRoot)) === configDigest,
        'Edictum workflow host configuration changed',
      );
      requireCondition(validWorkflowApprovalBinding(binding), 'host workflow approval binding is invalid');
      await storage.consumeApproval(storeId, Object.freeze({ ...binding }), apply);
    },
  });
}

/** @internal Test-only issuer; never re-export from the package root. */
export function createTestWorkflowHostCapability(
  repositoryRoot: string,
  authenticatedPrincipal = 'human:workflow-reviewer',
): WorkflowHostCapability {
  const root = requireAbsoluteRepositoryRoot(repositoryRoot);
  const access = requireSafeRepositoryAccess(root);
  const canonicalRoot = access.repository_root;
  const configDigest = (() => {
    try {
      return runtimeConfigDigest(loadRuntimeConfig(canonicalRoot));
    } catch {
      return undefined;
    }
  })();
  const configBinding = configDigest === undefined ? {} : { configDigest };
  const consumed = new Set<string>();
  return issueWorkflowHostCapability({
    authenticatedPrincipal,
    ...configBinding,
    repositoryRoot: canonicalRoot,
    storeId: 'test-workflow',
    consumeApproval: async (binding, apply) => {
      const key = canonicalJson(binding);
      requireCondition(!consumed.has(key), 'Edictum workflow approval receipt replay');
      consumed.add(key);
      await ResultAsync.fromPromise(apply(), (error) => error).match(
        () => undefined,
        (error) => {
          consumed.delete(key);
          throw error;
        },
      );
    },
  });
}

export interface GovernanceBindings {
  readonly verifyApproval: (
    approval: ApprovalEvidence,
    operationHash: string,
    authorization: AuthorizationReceipt,
  ) => VerifiedApprovalEvidence | null | Promise<VerifiedApprovalEvidence | null>;
  readonly resolveIdentity: (
    intent: GovernedWriteIntent,
  ) => TrustedProjectIdentity | null | Promise<TrustedProjectIdentity | null>;
  /** Resolves the immutable registry-backed tenant/project context for this operation. */
  readonly resolveProjectContext: (
    intent: GovernedWriteIntent,
  ) => ProjectContext | null | Promise<ProjectContext | null>;
  /** Canonical absolute repository root captured by the composition root. */
  readonly repositoryRoot: string;
  readonly reservationStore: OperationReservationStore;
  readonly casWriter: (request: GovernedWriteRequest, context: GovernedWriteCommitContext) => unknown;
  readonly runtimeRevision: () => RuntimeEnvelopeRevisionBinding | Promise<RuntimeEnvelopeRevisionBinding>;
  readonly assertRuntimeConfigCurrent: () => void;
  readonly authorizeProject: ProjectAuthorizer;
  readonly governancePolicy: EdictumGovernancePolicy;
}

export interface EdictumGovernancePolicy {
  readonly policyVersion: string;
  readonly maxAttempts: number;
  readonly maxToolCalls: number;
  readonly maxCallsPerTool: Readonly<Record<string, number>>;
  readonly tools: Readonly<Record<string, { readonly side_effect: 'read' | 'write'; readonly idempotent: boolean }>>;
}

export type OperationReservationStatus = 'reserved' | 'commit_unknown' | 'applied' | 'aborted';

export interface OperationReservation {
  readonly schema: 'OperationReservation/v1';
  readonly operation_key: string;
  readonly store_id: string;
  readonly revision: number;
  readonly fencing_token: string;
  readonly status: OperationReservationStatus;
  readonly created_at: string;
  readonly request_digest: string;
  readonly terminal_revision?: number;
  readonly result_digest?: string;
}

export interface GovernedWriteCommitContext {
  readonly operation_hash: string;
  readonly request_digest: string;
  readonly reservation_revision: number;
  readonly fencing_token: string;
  readonly source_revision: string;
  readonly expected_revision: number;
}

export interface OperationReservationStore {
  readonly schema: 'OperationReservationStore/v1';
  readonly store_id: string;
  readonly scope: 'file-durable' | 'test-memory' | 'host-sqlite';
  readonly host_capability?: NativeNoFollowCapability;
  readonly reserve: (
    operationKey: string,
    request: GovernedWriteRequest,
  ) => OperationReservation | null | Promise<OperationReservation | null>;
  readonly markCommitStarted: (reservation: OperationReservation) => void | Promise<void>;
  readonly complete: (reservation: OperationReservation, resultDigest?: string) => void | Promise<void>;
  readonly abort: (reservation: OperationReservation) => void | Promise<void>;
  readonly inspect: (operationKey: string) => OperationReservation | null | Promise<OperationReservation | null>;
}

const guardBindings = new WeakMap<Edictum, GovernanceBindings>();
const consumedOperationKeys = new WeakMap<Edictum, Set<string>>();
const guardIngressCapabilities = new WeakMap<
  Edictum,
  Map<
    string,
    {
      operationHash: string;
      requestDigest: string;
      reservation: OperationReservation;
      operationKey: string;
      sourceRevision: string;
      expectedRevision: number;
    }
  >
>();
const trustedReservationStores = new WeakSet<object>();
const sqliteReservationCapabilities = new WeakMap<object, HostGovernanceCapability>();
const controlKernelBrand: unique symbol = Symbol('candidate-control-kernel');
const trustedControlKernels = new WeakSet<object>();
const controlKernelBindings = new WeakMap<object, GovernanceBindings>();

/** @internal Composition adapter over the same SQLite owner as workflow attempts. */
export function createHostOperationReservationStore(
  capability: HostGovernanceCapability,
  storeId = 'candidate-governed-writes',
): OperationReservationStore {
  requireHostGovernanceCapability(capability);
  requireCondition(WORKFLOW_STORE_ID_PATTERN.test(storeId), 'host reservation store id is invalid');
  const storage = hostGovernanceBindings.get(capability)!;
  const transition = (
    reservation: OperationReservation,
    status: OperationReservationStatus,
    resultDigest?: string,
  ): void => {
    requireCondition(reservation.store_id === storeId, 'host reservation belongs to a different store');
    storage.transitionOperation(reservation, status, resultDigest);
  };
  const store: OperationReservationStore = Object.freeze({
    schema: 'OperationReservationStore/v1',
    store_id: storeId,
    scope: 'host-sqlite',
    reserve: (key: string, request: GovernedWriteRequest) =>
      storage.reserveOperation(storeId, key, computeGovernedWriteRequestDigest(request)),
    inspect: (key: string) => storage.inspectOperation(storeId, key),
    markCommitStarted: (reservation: OperationReservation) => transition(reservation, 'commit_unknown'),
    complete: (reservation: OperationReservation, resultDigest?: string) =>
      transition(reservation, 'applied', resultDigest),
    abort: (reservation: OperationReservation) => transition(reservation, 'aborted'),
  });
  trustedReservationStores.add(store);
  sqliteReservationCapabilities.set(store, capability);
  return store;
}

function reservationStorageIsTrusted(store: OperationReservationStore | undefined): boolean {
  if (store?.scope === 'host-sqlite') {
    const capability = sqliteReservationCapabilities.get(store);
    return capability !== undefined && hostGovernanceBindings.has(capability);
  }
  return (
    (store?.scope === 'file-durable' || store?.scope === 'test-memory') &&
    store.host_capability?.schema === 'NativeNoFollowCapability/v1' &&
    store.host_capability.attested === true
  );
}

/** @internal Test-only in-memory issuer; never re-export from the package root. */
export function createTestOperationReservationStore(
  repositoryRoot: string,
  storeId = 'test-governed-writes',
  beforeCommit: () => void = () => undefined,
  beforeAbort: (reservation: OperationReservation) => void = () => undefined,
): OperationReservationStore {
  requireCondition(WORKFLOW_STORE_ID_PATTERN.test(storeId), 'test reservation store id is invalid');
  const root = requireAbsoluteRepositoryRoot(repositoryRoot);
  const hostCapability = detectNativeNoFollowCapability(root);
  requireCondition(
    hostCapability?.attested === true,
    'test reservation store requires an attested native no-follow capability',
  );
  const records = new Map<string, OperationReservation>();
  const reserve = (operationKey: string, request: GovernedWriteRequest): OperationReservation | null => {
    const reservation: OperationReservation = Object.freeze({
      schema: 'OperationReservation/v1',
      operation_key: operationKey,
      store_id: storeId,
      revision: Date.now(),
      fencing_token: randomUUID(),
      status: 'reserved',
      created_at: new Date().toISOString(),
      request_digest: computeGovernedWriteRequestDigest(request),
    });
    return deferPick(
      records.has(operationKey),
      () => null,
      () => {
        records.set(operationKey, reservation);
        return reservation;
      },
    );
  };
  const transition = (
    reservation: OperationReservation,
    status: OperationReservationStatus,
    resultDigest?: string,
  ): void => {
    const current = records.get(reservation.operation_key);
    requireCondition(
      all(
        Boolean(current),
        current?.fencing_token === reservation.fencing_token,
        current?.revision === reservation.revision,
      ),
      'test reservation fencing or revision mismatch',
    );
    const terminal = Object.freeze({
      ...current!,
      status,
      terminal_revision: current!.revision + 1,
      ...optionalObject(typeof resultDigest === 'string', { result_digest: resultDigest }),
    }) as OperationReservation;
    records.set(reservation.operation_key, terminal);
  };
  const store: OperationReservationStore = Object.freeze({
    schema: 'OperationReservationStore/v1',
    store_id: storeId,
    scope: 'test-memory',
    host_capability: hostCapability!,
    reserve,
    markCommitStarted: (reservation: OperationReservation) => {
      beforeCommit();
      transition(reservation, 'commit_unknown');
    },
    complete: (reservation: OperationReservation, resultDigest?: string) =>
      transition(reservation, 'applied', resultDigest),
    abort: (reservation: OperationReservation) => {
      beforeAbort(reservation);
      transition(reservation, 'aborted');
    },
    inspect: (operationKey: string) =>
      pick(records.has(operationKey), records.get(operationKey) as OperationReservation, null),
  });
  trustedReservationStores.add(store);
  return store;
}

/**
 * A control-kernel capability is intentionally not constructible by package
 * consumers.  The public package entry point does not export the binding
 * constructor; only the composition root in this module can issue a kernel.
 * The test-only adapter below is kept out of `src/index.ts` so tests can
 * exercise the Edictum boundary without turning caller-provided authority
 * into a production API.
 */
export interface GovernanceControlKernel {
  readonly [controlKernelBrand]: true;
}

function reservationFile(root: string, operationKey: string): string {
  const digest = createHash('sha256').update(operationKey).digest('hex');
  return path.join(root, `${digest}.json`);
}

async function ensureReservationRoot(root: string): Promise<string> {
  const resolved = requireAbsoluteRepositoryRoot(root);
  requireNativeNoFollowCapability(resolved);
  const parentRoot = path.dirname(resolved);
  const access = requireSafeRepositoryAccess(parentRoot);
  await access.ensureDirectoryAsync(resolved, 'durable reservation root');
  access.assertDirectory(resolved, 'durable reservation root');
  return resolved;
}
async function writeExclusiveJson(root: string, file: string, value: unknown): Promise<void> {
  await requireSafeRepositoryAccess(root).writeExclusiveAsync(
    file,
    `${JSON.stringify(value)}\n`,
    'durable reservation record',
  );
}

function hasErrorCode(error: unknown, code: string): boolean {
  const candidate = error as NodeJS.ErrnoException & { cause?: NodeJS.ErrnoException };
  return [candidate.code, candidate.cause?.code].includes(code);
}
function readJson(root: string, file: string): Record<string, unknown> | null {
  const access = requireSafeRepositoryAccess(root);
  const read = (): Record<string, unknown> =>
    JSON.parse(access.readText(file, 'durable reservation record')) as Record<string, unknown>;
  return deferPick(access.fileExists(file, 'durable reservation record'), read, () => null);
}

const RESERVATION_BASE_KEYS = [
  'schema',
  'operation_key',
  'store_id',
  'revision',
  'fencing_token',
  'status',
  'created_at',
  'request_digest',
] as const;
const RESERVATION_TERMINAL_KEYS = [...RESERVATION_BASE_KEYS, 'terminal_revision'] as const;
const RESERVATION_APPLIED_KEYS = [...RESERVATION_TERMINAL_KEYS, 'result_digest'] as const;
const RESERVATION_FENCING_TOKEN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateReservationBase(value: Record<string, unknown>): void {
  const operationKey = stringValue(value.operation_key);
  const storeId = stringValue(value.store_id);
  const fencingToken = stringValue(value.fencing_token);
  const revision = numberValue(value.revision);
  const createdAt = value.created_at;
  const digest = stringValue(value.request_digest);
  requireCondition(
    all(
      isPlainRecord(value),
      hasExactOwnKeys(value, RESERVATION_BASE_KEYS),
      value.schema === 'OperationReservation/v1',
      /^[a-f0-9]{64}$/.test(operationKey),
      WORKFLOW_STORE_ID_PATTERN.test(storeId),
      Number.isSafeInteger(revision),
      revision > 0,
      RESERVATION_FENCING_TOKEN.test(fencingToken),
      value.status === 'reserved',
      isStrictRfc3339Timestamp(createdAt),
      /^[a-f0-9]{64}$/.test(digest),
    ),
    'durable reservation record is invalid',
  );
}

function validateReservationTerminal(base: OperationReservation, terminal: Record<string, unknown>): void {
  const status = isPlainRecord(terminal) ? terminal.status : undefined;
  const terminalKeys = status === 'applied' ? RESERVATION_APPLIED_KEYS : RESERVATION_TERMINAL_KEYS;
  requireCondition(
    all(
      isPlainRecord(terminal),
      hasExactOwnKeys(terminal, terminalKeys),
      terminal.schema === base.schema,
      terminal.operation_key === base.operation_key,
      terminal.store_id === base.store_id,
      terminal.revision === base.revision,
      terminal.fencing_token === base.fencing_token,
      terminal.created_at === base.created_at,
      terminal.request_digest === base.request_digest,
      ['commit_unknown', 'applied', 'aborted'].includes(terminal.status as string),
      typeof terminal.terminal_revision === 'number',
      Number.isSafeInteger(terminal.terminal_revision),
      terminal.terminal_revision === base.revision + 1,
      any(
        terminal.status !== 'applied',
        typeof terminal.result_digest === 'string' && /^[a-f0-9]{64}$/.test(terminal.result_digest as string),
      ),
      any(terminal.status === 'applied', terminal.result_digest === undefined),
    ),
    'durable reservation terminal record is invalid',
  );
}

function validateReservationRecovery(base: OperationReservation, final: Record<string, unknown>): void {
  const resultDigest = stringValue(final.result_digest);
  requireCondition(
    all(
      isPlainRecord(final),
      hasExactOwnKeys(final, RESERVATION_APPLIED_KEYS),
      final.schema === base.schema,
      final.operation_key === base.operation_key,
      final.store_id === base.store_id,
      final.fencing_token === base.fencing_token,
      final.revision === base.revision,
      final.created_at === base.created_at,
      final.request_digest === base.request_digest,
      final.status === 'applied',
      final.terminal_revision === base.revision + 2,
      typeof final.result_digest === 'string',
      /^[a-f0-9]{64}$/.test(resultDigest),
    ),
    'durable reservation recovery record is invalid',
  );
}

export function validateHostOperationReservation(value: unknown): OperationReservation {
  requireCondition(isPlainRecord(value), 'host reservation record is invalid');
  const record = value as OperationReservation;
  const base = { ...record, status: 'reserved' } as Record<string, unknown>;
  delete base.terminal_revision;
  delete base.result_digest;
  validateReservationBase(base);
  if (record.status === 'reserved') validateReservationBase(record as unknown as Record<string, unknown>);
  else if (record.status === 'applied' && record.terminal_revision === record.revision + 2)
    validateReservationRecovery(base as unknown as OperationReservation, record as unknown as Record<string, unknown>);
  else
    validateReservationTerminal(base as unknown as OperationReservation, record as unknown as Record<string, unknown>);
  return record;
}

function readReservationTerminal(
  base: OperationReservation,
  terminal: Record<string, unknown>,
  final: Record<string, unknown> | null,
): OperationReservation {
  return deferPick(
    terminal.status === 'commit_unknown',
    () =>
      deferPick(
        Boolean(final),
        () => {
          validateReservationRecovery(base, final!);
          return {
            ...base,
            status: 'applied',
            terminal_revision: final!.terminal_revision as number,
            result_digest: final!.result_digest as string,
          } as OperationReservation;
        },
        () =>
          ({
            ...base,
            status: 'commit_unknown',
            terminal_revision: terminal.terminal_revision as number,
          }) as OperationReservation,
      ),
    () =>
      ({
        ...base,
        status: terminal.status as OperationReservationStatus,
        terminal_revision: terminal.terminal_revision as number,
        ...optionalObject(typeof terminal.result_digest === 'string', {
          result_digest: terminal.result_digest as string,
        }),
      }) as OperationReservation,
  );
}
function readReservation(root: string, file: string): OperationReservation | null {
  const value = readJson(root, file);
  return deferPick(
    Boolean(value),
    () => {
      validateReservationBase(value!);
      const base = value as unknown as OperationReservation;
      const terminal = readJson(root, `${file}.terminal`);
      return deferPick(
        Boolean(terminal),
        () => {
          validateReservationTerminal(base, terminal!);
          const final = deferPick(
            all(Boolean(terminal), terminal!.status === 'commit_unknown'),
            () => readJson(root, `${file}.final`),
            () => null,
          );
          return readReservationTerminal(base, terminal!, final);
        },
        () => base,
      );
    },
    () => null,
  );
}

/**
 * A small Bun-compatible durable consume-once store. Exclusive create is the
 * cross-process reservation boundary; one exclusive terminal record is the
 * linearization point and remains inspectable after a restart.
 */
function validateSameReservationTransition(
  current: OperationReservation,
  status: OperationReservationStatus,
  resultDigest: string | undefined,
): void {
  requireCondition(
    any(status !== 'commit_unknown', resultDigest === undefined),
    'commit-unknown reservation cannot carry a result digest',
  );
  requireCondition(
    any(status !== 'applied', current.result_digest === resultDigest),
    'durable reservation result digest conflict',
  );
  requireCondition(
    any(status !== 'aborted', resultDigest === undefined),
    'aborted reservation cannot carry a result digest',
  );
}

function validateNewReservationTransition(
  current: OperationReservation,
  status: OperationReservationStatus,
  resultDigest: string | undefined,
): void {
  requireCondition(
    any(status !== 'aborted', current.status === 'reserved'),
    'durable reservation can abort only before commit starts',
  );
  requireCondition(
    any(status !== 'applied', current.status === 'reserved', current.status === 'commit_unknown'),
    'durable reservation terminal state conflict',
  );
  requireCondition(
    any(status !== 'commit_unknown', current.status === 'reserved'),
    'durable reservation commit-start transition conflict',
  );
  requireCondition(
    any(status !== 'commit_unknown', resultDigest === undefined),
    'commit-unknown reservation cannot carry a result digest',
  );
  requireCondition(
    any(status !== 'applied', all(Boolean(resultDigest), /^[a-f0-9]{64}$/.test(resultDigest as string))),
    'applied reservation requires a valid result digest',
  );
  requireCondition(
    any(status !== 'aborted', resultDigest === undefined),
    'aborted reservation cannot carry a result digest',
  );
}

async function writeReservationTransition(
  reservationRoot: string,
  file: string,
  current: OperationReservation,
  status: OperationReservationStatus,
  resultDigest: string | undefined,
): Promise<void> {
  const recovery = all(current.status === 'commit_unknown', status === 'applied');
  const terminal = {
    ...current,
    status,
    terminal_revision: current.revision + pick(recovery, 2, 1),
    ...optionalObject(Boolean(resultDigest), { result_digest: resultDigest as string }),
  };
  const marker = pick(recovery, `${file}.final`, `${file}.terminal`);
  await ResultAsync.fromPromise(writeExclusiveJson(reservationRoot, marker, terminal), (error) => error).match(
    () => undefined,
    (error) => {
      requireCondition(hasErrorCode(error, 'EEXIST'), 'durable reservation terminal write failed');
      const after = readReservation(reservationRoot, file);
      requireCondition(
        all(after?.status === status, after?.fencing_token === current.fencing_token),
        'durable reservation terminal state conflict',
      );
      requireCondition(
        any(status !== 'applied', after?.result_digest === resultDigest),
        'durable reservation result digest conflict',
      );
      requireCondition(
        any(status !== 'aborted', resultDigest === undefined),
        'aborted reservation cannot carry a result digest',
      );
    },
  );
}

export async function createFileOperationReservationStore(
  root: string,
  storeId = 'candidate-governed-writes',
): Promise<OperationReservationStore> {
  requireCondition(WORKFLOW_STORE_ID_PATTERN.test(storeId), 'durable reservation store id is invalid');
  const reservationRoot = await ensureReservationRoot(root);
  const hostCapability = detectNativeNoFollowCapability(reservationRoot);
  requireCondition(
    Boolean(hostCapability),
    'durable reservation store requires an attested native no-follow capability',
  );
  const reserve = async (operationKey: string, request: GovernedWriteRequest): Promise<OperationReservation | null> => {
    const file = reservationFile(reservationRoot, operationKey);
    const now = new Date().toISOString();
    const reservation: OperationReservation = {
      schema: 'OperationReservation/v1',
      operation_key: operationKey,
      store_id: storeId,
      revision: Date.now(),
      fencing_token: randomUUID(),
      status: 'reserved',
      created_at: now,
      request_digest: computeGovernedWriteRequestDigest(request),
    };
    return ResultAsync.fromPromise(
      writeExclusiveJson(reservationRoot, file, reservation).then(() => reservation),
      (error) => error,
    ).match(
      (value) => value,
      (error) => {
        requireCondition(hasErrorCode(error, 'EEXIST'), 'durable reservation write failed');
        return null;
      },
    );
  };
  const transition = async (
    reservation: OperationReservation,
    status: OperationReservationStatus,
    resultDigest?: string,
  ): Promise<void> => {
    const file = reservationFile(reservationRoot, reservation.operation_key);
    const current = readReservation(reservationRoot, file);
    requireCondition(Boolean(current), 'durable reservation record is missing');
    requireCondition(
      all(
        current!.store_id === storeId,
        current!.fencing_token === reservation.fencing_token,
        current!.revision === reservation.revision,
      ),
      'durable reservation fencing or revision mismatch',
    );
    await deferPick(
      current!.status === status,
      async () => validateSameReservationTransition(current!, status, resultDigest),
      async () => {
        validateNewReservationTransition(current!, status, resultDigest);
        await writeReservationTransition(reservationRoot, file, current!, status, resultDigest);
      },
    );
  };
  const store: OperationReservationStore = Object.freeze({
    schema: 'OperationReservationStore/v1',
    store_id: storeId,
    scope: 'file-durable',
    host_capability: hostCapability!,
    reserve,
    markCommitStarted: (reservation: OperationReservation) => transition(reservation, 'commit_unknown'),
    complete: (reservation: OperationReservation, resultDigest?: string) =>
      transition(reservation, 'applied', resultDigest),
    abort: (reservation: OperationReservation) => transition(reservation, 'aborted'),
    inspect: (operationKey: string) => readReservation(reservationRoot, reservationFile(reservationRoot, operationKey)),
  });
  trustedReservationStores.add(store);
  return store;
}

function governedWriteOperationKey(request: GovernedWriteRequest): string {
  return request.authorization.operation_hash;
}

function consumeGovernedWriteOnce(guard: Edictum, request: GovernedWriteRequest): void {
  const existing = consumedOperationKeys.get(guard);
  const keys = pick(Boolean(existing), existing!, new Set<string>());
  const key = governedWriteOperationKey(request);
  requireCondition(!keys.has(key), 'governed write replay rejected');
  keys.add(key);
  consumedOperationKeys.set(guard, keys);
}

function validateGovernanceBindings(bindings: GovernanceBindings): void {
  const candidate = pick(Boolean(bindings), bindings, {} as GovernanceBindings);
  requireCondition(typeof candidate.repositoryRoot === 'string', 'trusted governance bindings are required');
  const canonicalRoot = requireAbsoluteRepositoryRoot(candidate.repositoryRoot);
  requireCondition(
    canonicalRoot === candidate.repositoryRoot,
    'trusted governance bindings repository root must be canonical',
  );
  requireCondition(
    all(
      typeof candidate.verifyApproval === 'function',
      typeof candidate.authorizeProject === 'function',
      Boolean(candidate.governancePolicy),
      Boolean(candidate.reservationStore),
      trustedReservationStores.has(candidate.reservationStore as object),
      candidate.reservationStore?.schema === 'OperationReservationStore/v1',
      reservationStorageIsTrusted(candidate.reservationStore),
      typeof candidate.resolveIdentity === 'function',
      typeof candidate.resolveProjectContext === 'function',
      typeof candidate.reservationStore?.reserve === 'function',
      typeof candidate.reservationStore?.markCommitStarted === 'function',
      typeof candidate.reservationStore?.complete === 'function',
      typeof candidate.reservationStore?.abort === 'function',
      typeof candidate.reservationStore?.inspect === 'function',
      typeof candidate.casWriter === 'function',
      typeof candidate.runtimeRevision === 'function',
      typeof candidate.assertRuntimeConfigCurrent === 'function',
    ),
    'trusted governance bindings are required',
  );
}

function issueControlKernel(bindings: GovernanceBindings): GovernanceControlKernel {
  validateGovernanceBindings(bindings);
  const kernel = Object.freeze({
    [controlKernelBrand]: true,
  }) as GovernanceControlKernel;
  trustedControlKernels.add(kernel);
  controlKernelBindings.set(kernel, bindings);
  return kernel;
}

export function createCompositionRootControlKernel(bindings: GovernanceBindings): GovernanceControlKernel {
  return issueControlKernel(bindings);
}

export function isTrustedGovernanceControlKernel(value: unknown): value is GovernanceControlKernel {
  return all(Boolean(value), typeof value === 'object', trustedControlKernels.has(value as object));
}

function createGuardFromBindings(bindings: GovernanceBindings): Edictum {
  validateGovernanceBindings(bindings);
  const governancePolicy = bindings.governancePolicy;
  requireCondition(
    all(
      /^[A-Za-z0-9._:-]{1,128}$/.test(governancePolicy.policyVersion),
      Number.isSafeInteger(governancePolicy.maxAttempts),
      governancePolicy.maxAttempts > 0,
      Number.isSafeInteger(governancePolicy.maxToolCalls),
      governancePolicy.maxToolCalls > 0,
      Boolean(governancePolicy.maxCallsPerTool['runtime.read']),
      Boolean(governancePolicy.maxCallsPerTool['runtime.write']),
      Boolean(governancePolicy.tools['runtime.read']),
      Boolean(governancePolicy.tools['runtime.write']),
    ),
    'Edictum governance policy is invalid',
  );
  let guard: Edictum;
  guard = new Edictum({
    environment: 'candidate',
    mode: 'enforce',
    limits: {
      maxAttempts: governancePolicy.maxAttempts,
      maxToolCalls: governancePolicy.maxToolCalls,
      maxCallsPerTool: governancePolicy.maxCallsPerTool,
    },
    policyVersion: governancePolicy.policyVersion,
    tools: governancePolicy.tools,
    rules: [
      {
        tool: 'runtime.write',
        check: (call: ToolCall) =>
          Result.fromThrowable(
            () => {
              const record = pick(isPlainRecord(call.args), call.args as Record<string, unknown>, {});
              const capability = pick(
                all(isPlainRecord(call.args), typeof record.ingress_token === 'string'),
                guardIngressCapabilities.get(guard)?.get(record.ingress_token as string),
                undefined,
              );
              requireCondition(Boolean(capability), 'governed write must originate from the canonical Cedar ingress');
              validateGovernedWriteRequest(call.args);
              requireCondition(
                (call.args.authorization as Record<string, unknown>).operation_hash === capability!.operationHash,
                'governed write capability is bound to a different operation',
              );
              const { ingress_token: _ingressToken, ...request } = call.args as Record<string, unknown>;
              requireCondition(
                computeGovernedWriteRequestDigest(request as unknown as GovernedWriteRequest) ===
                  capability!.requestDigest,
                'governed write capability is bound to a different request digest',
              );
              return Decision.pass_();
            },
            (error) => error,
          )().match(
            (decision) => decision,
            (error) => Decision.fail(errorText(error, 'governed write evidence rejected')),
          ),
      },
      {
        contractType: 'post',
        tool: 'runtime.write',
        check: (_call: ToolCall, result: unknown) =>
          Result.fromThrowable(
            () => {
              assertCanonicalJsonValue(result, '$.result');
              return Decision.pass_();
            },
            (error) => error,
          )().match(
            (decision) => decision,
            (error) => Decision.fail(errorText(error, 'governed write result rejected')),
          ),
      },
      {
        check: async (session: Session) => {
          const executions = await session.executionCount();
          return pick(
            executions < governancePolicy.maxToolCalls,
            Decision.pass_(),
            Decision.fail('governed write session execution limit reached'),
          );
        },
      },
    ],
  });
  guardBindings.set(guard, bindings);
  guardIngressCapabilities.set(guard, new Map());
  return guard;
}

/**
 * Internal composition-root entry point.  A plain object that merely matches
 * the TypeScript shape is rejected because the kernel must be issued by this
 * module's private WeakSet/WeakMap pair.
 */
export function createGovernanceGuard(kernel: GovernanceControlKernel): Edictum {
  requireCondition(
    all(Boolean(kernel), trustedControlKernels.has(kernel as object)),
    'governance guard requires a control-kernel capability',
  );
  const bindings = controlKernelBindings.get(kernel as object) as GovernanceBindings;
  requireCondition(Boolean(bindings), 'governance control-kernel bindings are unavailable');
  return createGuardFromBindings(bindings);
}

/** @internal test-only adapter; deliberately not re-exported by src/index.ts. */
export function createTestGovernanceGuard(bindings: GovernanceBindings): Edictum {
  return createGovernanceGuard(createCompositionRootControlKernel(bindings));
}

/** @internal Package composition-root bridge; never re-export from src/index.ts. */
export function createCompositionRootGovernanceGuard(bindings: GovernanceBindings): Edictum {
  return createGovernanceGuard(createCompositionRootControlKernel(bindings));
}

export async function evaluateGovernance(
  guard: Edictum,
  tool: 'runtime.read' | 'runtime.write',
  args: unknown,
): Promise<EvaluationResult> {
  return guard.evaluate(tool, pick(isPlainRecord(args), args as Record<string, unknown>, {}));
}

interface GovernedWritePreparation {
  readonly args: Record<string, unknown>;
  readonly ingressToken: string;
  readonly reservation: OperationReservation;
  readonly operationKey?: string;
  readonly sourceRevision?: string;
  readonly expectedRevision?: number;
}
function requireMatchingRuntimeRevision(
  expected: RuntimeEnvelopeRevisionBinding,
  actual: RuntimeEnvelopeRevisionBinding,
): void {
  requireCondition(
    all(actual?.sourceRevision === expected.sourceRevision, actual?.currentRevision === expected.currentRevision),
    'runtime envelope revision changed during governed write',
  );
}
async function prepareGovernedWrite(
  guard: Edictum,
  bindings: GovernanceBindings | undefined,
  input: unknown,
): Promise<GovernedWritePreparation> {
  requireCondition(Boolean(bindings), 'trusted governance bindings are unavailable');
  const trusted = bindings as GovernanceBindings;
  trusted.assertRuntimeConfigCurrent();
  const record = pick(isPlainRecord(input), input as Record<string, unknown>, {});
  requireCondition(
    all(isPlainRecord(input), isPlainRecord(record.envelope), Object.prototype.hasOwnProperty.call(record, 'intent')),
    'governed write requires a runtime envelope wrapper',
  );
  const revision = await trusted.runtimeRevision();
  trusted.assertRuntimeConfigCurrent();
  const envelope = consumeRuntimeEnvelope(record.envelope, revision);
  requireCondition(
    all(envelope.kind === 'governed-write', envelope.operation === 'runtime.write'),
    'governed write requires a runtime.write envelope',
  );
  const intent = validateGovernedWriteIntent(record.intent);
  const payload = pick(isPlainRecord(envelope.payload), envelope.payload as Record<string, unknown>, {});
  requireCondition(
    all(isPlainRecord(envelope.payload), payload.operation === intent.operation),
    'runtime.write envelope is not bound to the governed intent',
  );
  const projectContext = await trusted.resolveProjectContext(intent);
  trusted.assertRuntimeConfigCurrent();
  requireCondition(Boolean(projectContext), 'registry-backed project context is unavailable');
  validateProjectContext(projectContext!, trusted.repositoryRoot);
  requireCondition(
    intent.authorization.registryHash === projectContext!.registry_hash,
    'write intent registry context is stale',
  );
  requireCondition(
    projectContext!.integration_bindings.some((binding) => binding.project_id === intent.authorization.project),
    'write intent project does not match the bound integration binding',
  );
  const operationHash = computeWriteOperationHash({
    operation: intent.operation,
    payload: intent.payload,
    principal: intent.authorization.principal,
    role: intent.authorization.role,
    tenant: intent.authorization.tenant,
    project: intent.authorization.project,
    resourceTenant: intent.authorization.resourceTenant,
    resourceProject: intent.authorization.resourceProject,
    registryHash: projectContext!.registry_hash,
  });
  requireCondition(
    intent.approval.operation_hash === operationHash,
    'approval is not bound to the requested operation',
  );
  const identity = await trusted.resolveIdentity(intent);
  trusted.assertRuntimeConfigCurrent();
  requireCondition(Boolean(identity), 'trusted authenticated identity context is unavailable');
  const authorization = trusted.authorizeProject(
    { ...intent.authorization, operationHash, registryHash: projectContext!.registry_hash },
    identity!,
    projectContext!,
  );
  requireCondition(
    all(authorization.decision === 'allow', Boolean(authorization.receipt)),
    'Cedar denied governed write: ' + authorization.diagnostics.join('; '),
  );
  const approval = await trusted.verifyApproval(intent.approval, operationHash, authorization.receipt!);
  trusted.assertRuntimeConfigCurrent();
  requireCondition(Boolean(approval), 'approval authority rejected governed write evidence');
  const parsed = buildGovernedWriteRequest(intent, authorization.receipt!, approval!);
  const operationKey = governedWriteOperationKey(parsed);
  const reservation = await trusted.reservationStore.reserve(operationKey, parsed);
  requireCondition(Boolean(reservation), 'governed write operation already reserved');
  let consumed = false;
  let ingressToken: string | undefined;
  try {
    trusted.assertRuntimeConfigCurrent();
    consumeGovernedWriteOnce(guard, parsed);
    consumed = true;
    ingressToken = randomUUID();
    guardIngressCapabilities.get(guard)?.set(ingressToken, {
      operationHash: parsed.authorization.operation_hash,
      requestDigest: reservation!.request_digest,
      reservation: reservation!,
      operationKey,
      sourceRevision: envelope.sourceRevision,
      expectedRevision: envelope.expectedRevision,
    });
    return {
      args: { ...(parsed as unknown as Record<string, unknown>), ingress_token: ingressToken },
      ingressToken,
      reservation: reservation!,
      operationKey,
      sourceRevision: envelope.sourceRevision,
      expectedRevision: envelope.expectedRevision,
    };
  } catch (error) {
    try {
      await trusted.reservationStore.abort(reservation!);
    } catch (cleanupError) {
      // Cleanup is best-effort; the preparation error remains authoritative.
      void cleanupError;
    } finally {
      if (consumed) consumedOperationKeys.get(guard)?.delete(operationKey);
      if (ingressToken !== undefined) guardIngressCapabilities.get(guard)?.delete(ingressToken);
    }
    throw error;
  }
}

async function executeGovernedWrite(
  bindings: GovernanceBindings | undefined,
  args: Record<string, unknown>,
  guard: Edictum,
  commitStarted: { value: boolean },
): Promise<unknown> {
  requireCondition(
    all(Boolean(bindings), typeof args.ingress_token === 'string'),
    'canonical governance request is not trusted',
  );
  const capabilities = guardIngressCapabilities.get(guard) as Map<
    string,
    {
      operationHash: string;
      requestDigest: string;
      reservation: OperationReservation;
      operationKey: string;
      sourceRevision: string;
      expectedRevision: number;
    }
  >;
  const capability = capabilities?.get(args.ingress_token as string);
  requireCondition(Boolean(capability), 'canonical governance capability was already consumed or is not bound');
  capabilities.delete(args.ingress_token as string);
  const { ingress_token: _ingressToken, ...sanitized } = args;
  const expectedRevision: RuntimeEnvelopeRevisionBinding = {
    sourceRevision: capability!.sourceRevision,
    currentRevision: capability!.expectedRevision,
  };
  bindings!.assertRuntimeConfigCurrent();
  requireMatchingRuntimeRevision(expectedRevision, await bindings!.runtimeRevision());
  bindings!.assertRuntimeConfigCurrent();
  await bindings!.reservationStore.markCommitStarted(capability!.reservation);
  commitStarted.value = true;
  bindings!.assertRuntimeConfigCurrent();
  requireMatchingRuntimeRevision(expectedRevision, await bindings!.runtimeRevision());
  bindings!.assertRuntimeConfigCurrent();
  return bindings!.casWriter(sanitized as unknown as GovernedWriteRequest, {
    operation_hash: capability!.operationHash,
    request_digest: capability!.requestDigest,
    reservation_revision: capability!.reservation.revision,
    fencing_token: capability!.reservation.fencing_token,
    source_revision: capability!.sourceRevision,
    expected_revision: capability!.expectedRevision,
  });
}

async function finalizeGovernedWrite(
  bindings: GovernanceBindings | undefined,
  reservation: OperationReservation | null,
  result: unknown,
  expectedRevision?: RuntimeEnvelopeRevisionBinding,
): Promise<unknown> {
  requireCondition(result !== undefined, 'governed CAS writer must return a canonical JSON result');
  assertCanonicalJsonValue(result, '$.result');
  requireCondition(
    all(Boolean(reservation), Boolean(bindings)),
    'governed CAS completion requires its reservation context',
  );
  if (expectedRevision !== undefined) {
    bindings!.assertRuntimeConfigCurrent();
    requireMatchingRuntimeRevision(expectedRevision, await bindings!.runtimeRevision());
    bindings!.assertRuntimeConfigCurrent();
  }
  await bindings!.reservationStore.complete(reservation!, canonicalJsonDigest(result));
  return result;
}

async function abortGovernedWrite(
  guard: Edictum,
  bindings: GovernanceBindings | undefined,
  reservation: OperationReservation | null,
  operationKey: string | undefined,
  commitStarted: boolean,
  error: unknown,
): Promise<never> {
  try {
    await deferPick(
      all(Boolean(reservation), Boolean(bindings), !commitStarted),
      async () => {
        await bindings!.reservationStore.abort(reservation!);
        if (operationKey !== undefined) consumedOperationKeys.get(guard)?.delete(operationKey);
      },
      () => Promise.resolve(),
    );
  } catch (cleanupError) {
    // Cleanup is best-effort; the governed operation error remains authoritative.
    void cleanupError;
  }
  throw error;
}

function cleanupGovernedWrite(guard: Edictum, ingressToken: string | undefined): void {
  deferPick(
    Boolean(ingressToken),
    () => guardIngressCapabilities.get(guard)?.delete(ingressToken!),
    () => undefined,
  );
}
export async function runGovernedWrite(guard: Edictum, input: unknown): Promise<unknown> {
  const bindings = guardBindings.get(guard);
  const preparation = await ResultAsync.fromPromise(
    prepareGovernedWrite(guard, bindings, input),
    (error) => error,
  ).match(
    (value) => value,
    () => ({
      args: pick(isPlainRecord(input), input as Record<string, unknown>, {}),
      ingressToken: undefined,
      reservation: null,
      operationKey: undefined,
    }),
  );
  const commitStarted = { value: false };
  return guard
    .run('runtime.write', preparation.args, () =>
      executeGovernedWrite(bindings, preparation.args, guard, commitStarted),
    )
    .then((result) =>
      finalizeGovernedWrite(
        bindings,
        preparation.reservation,
        result,
        'sourceRevision' in preparation &&
          preparation.sourceRevision !== undefined &&
          preparation.expectedRevision !== undefined
          ? { sourceRevision: preparation.sourceRevision, currentRevision: preparation.expectedRevision }
          : undefined,
      ),
    )
    .catch((error) =>
      abortGovernedWrite(
        guard,
        bindings,
        preparation.reservation,
        preparation.operationKey,
        commitStarted.value,
        error,
      ),
    )
    .finally(() => cleanupGovernedWrite(guard, preparation.ingressToken));
}

export function isGovernanceDenied(error: unknown): error is EdictumDenied {
  return error instanceof EdictumDenied;
}
