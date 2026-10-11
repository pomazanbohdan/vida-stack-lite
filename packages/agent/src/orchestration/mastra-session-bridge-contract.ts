import z from 'zod';
import type { WorkItemSelection } from '../config/runtime-config.js';
import { canonicalJsonDigest } from '../contracts/public-ingress.js';
import type { SessionAgentAction, SessionHandoffContext } from './session-handoff.js';
import type { ConfiguredContext } from './configured-context.js';
import type { CorrectiveExecution } from './corrective-execution-contract.js';
import { correctiveExecutionSchema } from './corrective-execution-contract.js';

export const observationSchema = z
  .object({
    schema: z.literal('VidaSessionObservation/v1'),
    action_id: z.string().regex(/^[a-f0-9]{64}$/),
    host_attempt_id: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
    changed_paths: z.array(z.string().min(1).max(512)).optional(),
    issue_id: z.string().uuid(),
    agent_id: z.string().min(1).max(256),
    tool_call_ref: z.string().min(1).max(256),
    status: z.enum(['reported_complete', 'reported_failed']),
    summary: z.string().min(1).max(4096),
    output_digest: z.string().regex(/^[a-f0-9]{64}$/),
    evidence_refs: z.array(z.string().min(1).max(512)),
  })
  .strict();

export type SessionBridgeObservation = z.infer<typeof observationSchema>;

export function parseSessionBridgeObservation(value: unknown): SessionBridgeObservation {
  return observationSchema.parse(value);
}

export const requestSchema = z
  .object({
    schema: z.literal('VidaSessionRequest/v1'),
    run_id: z.string(),
    workflow_id: z.string(),
    wave_index: z.number().int().nonnegative(),
    action_id: z.string().regex(/^[a-f0-9]{64}$/),
    assignment_index: z.number().int().nonnegative(),
    stage_id: z.string(),
    role: z.string(),
    config_digest: z.string().regex(/^[a-f0-9]{64}$/),
    scope_digest: z.string().regex(/^[a-f0-9]{64}$/),
    bindings_manifest_ref: z.string().regex(/^[a-f0-9]{64}$/),
    corrective_execution: correctiveExecutionSchema.optional(),
    configured_context_digest: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
    configured_context_files: z
      .array(
        z
          .object({
            path: z.string().min(1).max(512),
            sha256: z.string().regex(/^[a-f0-9]{64}$/),
          })
          .strict(),
      )
      .optional(),
  })
  .strict();

export type SessionBridgeRequest = z.infer<typeof requestSchema>;

/** Pure persisted-request validation; does not initialize workflow storage. */
export function parseSessionBridgeRequest(value: unknown): SessionBridgeRequest {
  return requestSchema.parse(value);
}

export const runStateSchema = z.object({
  work_id: z.string(),
  attempt: z.number().int().positive(),
  workflow_id: z.string(),
  scope_digest: z.string(),
  config_digest: z.string(),
  selection: z.custom<WorkItemSelection>(),
  observations: z.array(observationSchema),
});

export function parseSessionBridgeRunState(value: unknown): z.infer<typeof runStateSchema> {
  return runStateSchema.parse(value);
}

export function buildSessionBridgeRequest(args: {
  runId: string;
  workflowId: string;
  configDigest: string;
  context: SessionHandoffContext;
  waveIndex: number;
  action: SessionAgentAction;
  configuredContext: ConfiguredContext | null;
  priorResults: readonly SessionBridgeObservation[];
  correctiveExecution?: CorrectiveExecution;
}): SessionBridgeRequest {
  const {
    runId,
    workflowId,
    configDigest,
    context,
    waveIndex,
    action,
    configuredContext,
    priorResults,
    correctiveExecution,
  } = args;
  return {
    ...(configuredContext ? { configured_context_digest: configuredContext.digest } : {}),
    ...(configuredContext
      ? {
          configured_context_files: configuredContext.entries
            .filter((entry) => entry.sha256 !== null)
            .map((entry) => ({ path: entry.location, sha256: entry.sha256 as string })),
        }
      : {}),
    schema: 'VidaSessionRequest/v1',
    ...(correctiveExecution ? { corrective_execution: correctiveExecution } : {}),
    run_id: runId,
    workflow_id: workflowId,
    wave_index: waveIndex,
    action_id: action.action_id,
    assignment_index: action.assignment_index,
    stage_id: action.stage_id,
    role: action.role,
    config_digest: configDigest,
    scope_digest: context.scope_digest,
    bindings_manifest_ref: canonicalJsonDigest({
      config_digest: configDigest,
      scope_digest: context.scope_digest,
      work_id: context.work_id,
      attempt: context.attempt,
      action_id: action.action_id,
      stage_id: action.stage_id,
      configured_context_digest: configuredContext?.digest ?? null,
      wave_index: waveIndex,
      prior_results: priorResults.map((entry) => entry.output_digest),
    }),
  };
}

export function requireBridge(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
