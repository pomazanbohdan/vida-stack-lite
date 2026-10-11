import { assertCanonicalJsonValue } from '../contracts/public-ingress.js';
import { PATH_PROFILE_KEYS } from '../config/runtime-config.js';
import type { WorkflowSessionReservation } from '../runtime-kernel.js';
import { workflowApprovalConsumptionRecordSchema } from '../governance/workflow-approval-consumption-contract.js';
import z from 'zod';

export const workflowWorkItemSchema = z
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
export const workExecutionContextSchema = z
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

export const workflowAttemptReceiptSchema = z
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
        correction_authorization: z
          .object({
            schema: workContextTextSchema.regex(/^[A-Za-z][A-Za-z0-9]*\/v1$/),
            path: workContextTextSchema,
            sha256: workContextDigestSchema,
          })
          .strict()
          .nullable(),
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

const digest = z.string().regex(/^[a-f0-9]{64}$/);
const text = z.string().min(1);
const repositoryMode = z.literal('monorepo');
const processingScope = z.enum(['whole_repository', 'selected_project']);
const pathLayer = z.enum(['root-config', 'tenant-config', 'project-config', 'trusted-override']);
const pathKind = z.enum(PATH_PROFILE_KEYS);
const pathProfileSchema = z
  .object({
    schema: z.literal('ResolvedPathProfile/v1'),
    repository_root: text,
    repository_mode: repositoryMode,
    processing_scope: processingScope,
    scope_id: text,
    registry_hash: digest.nullable(),
    path_config_hash: digest,
    path_identities: z.record(pathKind, text.nullable()),
    paths: z.record(pathKind, text),
    resolved_paths: z.record(pathKind, text),
    provenance: z.record(pathKind, z.object({ layer: pathLayer, pointer: text }).strict()),
    digest,
  })
  .strict();
const integrationBindingSchema = z
  .object({
    schema: z.literal('ProjectIntegrationBinding/v1'),
    project_id: text,
    provider_id: text,
    provider: text,
    tenant_id: text,
    namespace: text,
    digest,
  })
  .strict();
const pathBindingsSchema = z
  .object({
    schema: z.literal('ProjectPathBindings/v1'),
    repository_root: text,
    contour: text,
    provider: z.literal('agent-runtime.config.v1.yaml'),
    repository_mode: repositoryMode,
    processing_scope: processingScope,
    digest,
    paths: z.array(
      z
        .object({
          kind: pathKind,
          relative: text,
          resolved: text,
          expected_type: z.enum(['directory', 'file', 'file-parent']),
          source: pathLayer,
          source_pointer: text,
        })
        .strict(),
    ),
  })
  .strict();
const projectBindingSchema = z
  .object({
    schema: z.literal('ProjectContextProjectBinding/v1'),
    project_id: text,
    project_title: text,
    task_prefix: text,
    code_selectors: z.array(text),
    delivery_group: text,
    project_root: text,
    integration_binding: integrationBindingSchema,
    path_profile: pathProfileSchema,
    path_bindings: pathBindingsSchema,
  })
  .strict();
const projectContextSchema = z
  .object({
    schema: z.literal('ProjectContext/v1'),
    source: z.literal('runtime-config'),
    config_digest: digest,
    registry_hash: digest,
    integrations_digest: digest,
    repository_id: text,
    project_ids: z.array(text),
    repository_title: text,
    project_bindings: z.array(projectBindingSchema),
    integration_bindings: z.array(integrationBindingSchema),
    path_profiles: z.array(pathProfileSchema),
    path_bindings: z.array(pathBindingsSchema),
    project_context_digest: digest,
    path_bindings_digest: digest,
  })
  .strict();
const operationSchema = z
  .object({
    id: text,
    profile: text,
    tool: text,
    governance_stage: text,
    evidence_class: z.enum(['Decision', 'Code', 'Static', 'Runtime']),
  })
  .strict();
const authenticationSchema = z
  .object({
    schema: z.literal('TrustedHostAuthentication/v1'),
    repositoryRoot: text,
    repositoryId: text,
    projectIds: z.array(text),
    integrationsDigest: digest,
    tenantId: text.optional(),
    projectId: text.optional(),
    principal: text,
    configRevision: z.number().int().positive(),
    permittedOperations: z.array(z.enum(['runtime.read', 'runtime.write', 'workflow'])),
  })
  .strict();
const assignmentSchema = z
  .object({
    role: text,
    profile: text,
    contour: z.enum(['requirements', 'documentation', 'code', 'platform', 'diagnostics', 'security_data']).optional(),
    risk_flags: z.array(text).optional(),
  })
  .strict();
const stageSchema = z
  .object({
    id: text,
    kind: z.enum(['research', 'synthesize', 'develop', 'validate', 'test', 'deliver']),
    mode: z.enum(['single', 'parallel']),
    assignments: z.array(assignmentSchema),
    consumes: z.array(text),
    produces: z.array(text),
    required_after: z.array(text),
    risk_flags: z.array(text).optional(),
    context_source_ids: z.array(text).optional(),
    context_skill_refs: z.array(text).optional(),
  })
  .strict();
const profileSchema = z
  .object({
    model: text,
    reasoning: text,
    execution_mode: z.enum(['fast', 'standard']),
    mutation_scope: z.enum(['none', 'repository_source']),
    tools_policy: text,
    egress_policy: text,
  })
  .strict();
const roleInstructionSchema = z
  .object({
    description: text,
    consumes: z.array(text),
    produces: z.array(text),
    rules: z.array(text),
  })
  .strict();
const assignmentAttemptSchema = workflowAttemptReceiptSchema.shape.attempt;
const approvalAuthorizationSchema = z
  .object({
    receipt: workflowAttemptReceiptSchema,
    approval: workflowApprovalConsumptionRecordSchema.nullable(),
  })
  .strict();
const workflowSessionReservationSchema = z
  .object({
    schema: z.literal('WorkflowSessionReservation/v1'),
    request: z
      .object({
        repositoryRoot: text,
        configDigest: digest,
        teamId: text,
        workflowId: text,
        stageId: text,
        assignmentIndex: z.number().int().nonnegative(),
        workItemId: text,
        workItemDigest: digest,
        workContextDigest: digest,
        input: z.unknown(),
      })
      .strict(),
    invocation: z
      .object({
        operation: operationSchema,
        authentication: authenticationSchema,
        configDigest: digest,
        project: projectContextSchema,
        teamId: text,
        workflowId: text,
        stage: stageSchema,
        assignment: assignmentSchema,
        assignmentIndex: z.number().int().nonnegative(),
        attempt: assignmentAttemptSchema.optional(),
        profile: profileSchema,
        roleInstruction: roleInstructionSchema,
        roleInstructionDigest: digest,
        riskFlags: z.array(text),
        workItem: workflowWorkItemSchema,
        workContext: workExecutionContextSchema,
        input: z.unknown(),
      })
      .strict(),
    receipt: workflowAttemptReceiptSchema,
    requestDigest: digest,
    approvalAction: z.enum(['source.write', 'delivery.execute']).nullable(),
    authorization: approvalAuthorizationSchema.nullable(),
  })
  .strict();

/** Parse one complete persisted runtime-kernel reservation as data, without granting rights. */
export function parseWorkflowSessionReservationData(value: unknown): WorkflowSessionReservation {
  assertCanonicalJsonValue(value, '$.host_reservation');
  return workflowSessionReservationSchema.parse(value) as WorkflowSessionReservation;
}
