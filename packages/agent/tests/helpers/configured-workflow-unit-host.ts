import { randomUUID } from 'node:crypto';
import { canonicalJsonDigest } from '../../src/contracts/public-ingress.ts';
import { issueHostGovernanceCapability } from '../../src/governance/edictum-boundary.ts';
import {
  createTestTrustedHostLauncherCapability,
  createTrustedHostComposition,
  type TrustedHostComposition,
  type TrustedHostCompositionInput,
  type TrustedHostServices,
  type TrustedWorkflowAssignment,
  type WorkExecutionContextRequest,
} from '../../src/runtime-kernel.ts';
import type { WorkExecutionContext } from '../../src/orchestration/workflow-session-reservation-contract.ts';
import { runtimeConfigDigest, type AgentRuntimeConfig } from '../../src/config/runtime-config.ts';
import type { WorkflowAttemptApprovalAuthorization, WorkflowAttemptReceipt } from '../../src/host-state.ts';
import type { WorkflowApprovalConsumptionRecord } from '../../src/governance/edictum-boundary.ts';

export type ApprovalConsumer = (
  invocation: TrustedWorkflowAssignment,
  action: 'source.write' | 'delivery.execute',
  requestDigest: string,
  apply: () => Promise<boolean>,
) => unknown;

type AttemptPort = NonNullable<TrustedHostServices['workflowAttempts']>;
type MutableAttemptPort = { -readonly [Key in keyof AttemptPort]: AttemptPort[Key] };

export type AttemptFixture = Omit<
  MutableAttemptPort,
  | 'claimWorkflowAssignment'
  | 'completeWorkflowAttempt'
  | 'markWorkflowAttemptUncertain'
  | 'claimWorkflowAssignmentWithApproval'
  | 'beginWorkflowAttemptEffect'
  | 'completeWorkflowAttemptWithApproval'
> & {
  governanceCapability: NonNullable<TrustedHostServices['governanceCapability']>;
  attemptCount: () => number;
  approvalPolicy: ApprovalConsumer | null;
  claimWorkflowAssignment: (
    invocation: TrustedWorkflowAssignment,
    requestDigest: string,
  ) => Promise<WorkflowAttemptReceipt>;
  completeWorkflowAttempt: (receipt: WorkflowAttemptReceipt, result: unknown) => Promise<WorkflowAttemptReceipt>;
  markWorkflowAttemptUncertain: (receipt: WorkflowAttemptReceipt) => Promise<WorkflowAttemptReceipt>;
  claimWorkflowAssignmentWithApproval: (
    invocation: TrustedWorkflowAssignment,
    requestDigest: string,
    action: 'source.write' | 'delivery.execute',
  ) => Promise<WorkflowAttemptApprovalAuthorization>;
  beginWorkflowAttemptEffect: (
    authorization: WorkflowAttemptApprovalAuthorization,
  ) => Promise<WorkflowAttemptApprovalAuthorization>;
  completeWorkflowAttemptWithApproval: (
    authorization: WorkflowAttemptApprovalAuthorization,
    result: unknown,
  ) => Promise<WorkflowAttemptApprovalAuthorization>;
};

/** Per-call controlled attempt adapter for isolated workflow unit/adapter cases. */
export function createControlledWorkflowAttemptFixture(): AttemptFixture {
  const records = new Map<string, WorkflowAttemptReceipt>();
  const previewReceipt = (invocation: TrustedWorkflowAssignment, requestDigest: string): WorkflowAttemptReceipt => {
    const { binding, permit } = invocation.workContext;
    const assignmentId = canonicalJsonDigest({
      binding,
      stage: invocation.stage.id,
      index: invocation.assignmentIndex,
    });
    const { ticket_id, thread_id, generation } = permit.lease;
    const lease = { ticket_id, thread_id, generation };
    return {
      identity: {
        repository_id: binding.repository_id,
        project_ids: [...binding.project_ids],
        integrations_digest: binding.integrations_digest,
        work_id: binding.lifecycle_work_id,
      },
      workVersion: { revision: permit.checkpoint_revision, digest: permit.checkpoint_digest },
      maintenanceGeneration: 0,
      attempt: {
        assignment_id: assignmentId,
        attempt_id: canonicalJsonDigest({
          assignment_id: assignmentId,
          request_digest: requestDigest,
          lease,
          previous_attempt_id: null,
        }),
        previous_attempt_id: null,
        request_digest: requestDigest,
        stage_id: invocation.stage.id,
        assignment_index: invocation.assignmentIndex,
        correction_generation: 0,
        correction_authorization: null,
        lease,
        status: 'started',
        result: null,
        result_digest: null,
        reconciliation: null,
      },
    };
  };
  return {
    attemptCount: () => records.size,
    approvalPolicy: null,
    governanceCapability: issueHostGovernanceCapability({
      workspaceId: 'f'.repeat(64),
      reserveOperation: () => null,
      inspectOperation: () => null,
      transitionOperation: () => {},
      consumeApproval: async () => {},
    }),
    async claimWorkflowAssignment(
      invocation: TrustedWorkflowAssignment,
      requestDigest: string,
    ): Promise<WorkflowAttemptReceipt> {
      const { binding, permit } = invocation.workContext;
      const assignmentId = canonicalJsonDigest({
        binding,
        stage: invocation.stage.id,
        index: invocation.assignmentIndex,
      });
      const prior = records.get(assignmentId);
      if (prior) {
        if (prior.attempt.request_digest !== requestDigest || prior.attempt.status !== 'completed')
          throw new Error('attempt requires reconciliation');
        return { ...prior, workVersion: { revision: permit.checkpoint_revision, digest: permit.checkpoint_digest } };
      }
      const receipt = previewReceipt(invocation, requestDigest);
      records.set(assignmentId, receipt);
      return receipt;
    },
    async claimWorkflowAssignmentWithApproval(
      invocation: TrustedWorkflowAssignment,
      requestDigest: string,
      action: 'source.write' | 'delivery.execute',
    ): Promise<WorkflowAttemptApprovalAuthorization> {
      const preview = previewReceipt(invocation, requestDigest);
      const prior = records.get(preview.attempt.assignment_id);
      if (prior?.attempt.status === 'completed')
        return { receipt: await this.claimWorkflowAssignment(invocation, requestDigest), approval: null };
      if (prior) throw new Error('attempt requires reconciliation');
      let approved = false;
      await this.approvalPolicy?.({ ...invocation, attempt: preview.attempt }, action, requestDigest, async () => {
        if (approved) throw new Error('workflow approval callback replay');
        approved = true;
        return true;
      });
      if (!approved) throw new Error('workflow approval consumer did not invoke the authorization callback');
      const receipt = await this.claimWorkflowAssignment(invocation, requestDigest);
      const projectId = invocation.workContext.binding.project_ids[0];
      if (!projectId) throw new Error('configured workflow fixture requires a project id');
      const approval: WorkflowApprovalConsumptionRecord = {
        schema: 'EdictumWorkflowApprovalConsumption/v1',
        store_id: 'fixture-store',
        store_generation: randomUUID(),
        binding: {
          stage_id: invocation.stage.id,
          approval_id: randomUUID(),
          operation_hash: requestDigest,
          tenant: invocation.workContext.binding.repository_id,
          project: projectId,
        },
        fencing_token: randomUUID(),
        status: 'reserved',
        reserved_at: new Date().toISOString(),
        approval_expires_at: null,
        attempt_id: receipt.attempt.attempt_id,
      };
      return { receipt, approval };
    },
    async beginWorkflowAttemptEffect(
      authorization: WorkflowAttemptApprovalAuthorization,
    ): Promise<WorkflowAttemptApprovalAuthorization> {
      if (authorization.approval?.status !== 'reserved') throw new Error('approval reservation invalid');
      return {
        ...authorization,
        approval: { ...authorization.approval, status: 'commit_unknown', terminal_at: new Date().toISOString() },
      };
    },
    async completeWorkflowAttemptWithApproval(
      authorization: WorkflowAttemptApprovalAuthorization,
      result: unknown,
    ): Promise<WorkflowAttemptApprovalAuthorization> {
      if (authorization.approval?.status !== 'commit_unknown') throw new Error('approval outcome invalid');
      return {
        receipt: await this.completeWorkflowAttempt(authorization.receipt, result),
        approval: {
          ...authorization.approval,
          status: 'applied',
          terminal_at: new Date().toISOString(),
        },
      };
    },
    abortUnstartedWorkflowAttempt(
      authorization: Parameters<
        NonNullable<TrustedHostServices['workflowAttempts']>['abortUnstartedWorkflowAttempt']
      >[0],
    ) {
      if ('receipt' in authorization) {
        if (authorization.approval?.status !== 'reserved') throw new Error('approval outcome unknown');
        records.delete(authorization.receipt.attempt.assignment_id);
      } else {
        records.delete(authorization.attempt.assignment_id);
      }
    },
    async completeWorkflowAttempt(receipt: WorkflowAttemptReceipt, result: unknown): Promise<WorkflowAttemptReceipt> {
      const completed: WorkflowAttemptReceipt = {
        ...receipt,
        attempt: { ...receipt.attempt, status: 'completed', result, result_digest: canonicalJsonDigest(result) },
      };
      records.set(receipt.attempt.assignment_id, completed);
      return completed;
    },
    async markWorkflowAttemptUncertain(receipt: WorkflowAttemptReceipt): Promise<WorkflowAttemptReceipt> {
      const uncertain: WorkflowAttemptReceipt = { ...receipt, attempt: { ...receipt.attempt, status: 'uncertain' } };
      records.set(receipt.attempt.assignment_id, uncertain);
      return uncertain;
    },
  };
}

/** Issues the supported opaque test capability, then composes its unit adapter. */
export function createWorkflowUnitComposition(input: TrustedHostCompositionInput): Promise<TrustedHostComposition> {
  return createTrustedHostComposition(createTestTrustedHostLauncherCapability(input));
}

export interface ControlledContextState {
  readonly checkpointRevision: number;
  readonly checkpointDigest: string;
  readonly runtimeRevision: number;
  readonly ledgerRevision: number;
  readonly expiresAt: string;
}

export function createControlledWorkExecutionContext(input: {
  readonly config: AgentRuntimeConfig;
  readonly integrationsDigest: string;
  readonly contextState: ControlledContextState;
  readonly invocation: Pick<
    WorkExecutionContextRequest,
    'teamId' | 'workflowId' | 'workItem' | 'stageId' | 'assignmentIndex'
  >;
}): WorkExecutionContext {
  const { config, integrationsDigest, contextState, invocation } = input;
  const binding = {
    repository_id: config.repository.repository_id,
    project_ids: [...config.projects.map((entry) => entry.project_id)].sort(),
    integrations_digest: integrationsDigest,
    team_id: invocation.teamId,
    workflow_id: invocation.workflowId,
    provider_work_item_id: invocation.workItem.id,
    lifecycle_work_id: 'lifecycle-task-fixture',
    work_item_digest: canonicalJsonDigest(invocation.workItem),
    work_source_revision: 'work-source',
    scope_id: 'approved-work-scope',
    scope_contract_digest: 'a'.repeat(64),
    acceptance_manifest_digest: 'b'.repeat(64),
    ac_ids: ['AC-UNIT'],
    implementation_paths: ['src/task.ts'],
    allowed_resources: ['file:src/task.ts'],
    config_digest: runtimeConfigDigest(config),
    runtime_source_revision: 'fixture-source',
    schema_digest: 'd'.repeat(64),
    runtime_code_digest: 'e'.repeat(64),
  };
  return {
    schema: 'WorkExecutionContext/v1',
    binding,
    permit: {
      context_digest: canonicalJsonDigest(binding),
      checkpoint_revision: contextState.checkpointRevision,
      checkpoint_digest: contextState.checkpointDigest,
      runtime_current_revision: contextState.runtimeRevision,
      stage_id: invocation.stageId,
      assignment_index: invocation.assignmentIndex,
      dispatch_authorized: true,
      lease: {
        thread_id: 'fixture-thread',
        ticket_id: 'fixture-ticket',
        generation: 1,
        ledger_revision: contextState.ledgerRevision,
        expires_at: contextState.expiresAt,
        active_resources: ['file:src/task.ts'],
        blocked_resources: [],
      },
    },
  };
}

export function controlledWorkContextDigest(context: WorkExecutionContext): string {
  const lease = context.permit.lease;
  return canonicalJsonDigest({
    binding: context.binding,
    lease: {
      thread_id: lease.thread_id,
      ticket_id: lease.ticket_id,
      generation: lease.generation,
      active_resources: [...lease.active_resources].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)),
    },
  });
}
