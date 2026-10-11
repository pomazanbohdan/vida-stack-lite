import z from 'zod';
import { rfc3339TimestampMilliseconds } from '../contracts/public-ingress.js';
import type { WorkflowApprovalConsumptionRecord } from './edictum-boundary.js';

const identityText = z.string().min(1).max(256);
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const timestamp = z.string().refine((value) => rfc3339TimestampMilliseconds(value) !== null);
const binding = z
  .object({
    stage_id: identityText,
    approval_id: identityText,
    operation_hash: digest,
    tenant: identityText,
    project: identityText,
  })
  .strict();

export const workflowApprovalConsumptionRecordSchema = z
  .object({
    schema: z.literal('EdictumWorkflowApprovalConsumption/v1'),
    store_id: z.string().regex(/^(?!\.{1,2}$)[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/),
    store_generation: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
    binding,
    fencing_token: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
    status: z.enum(['reserved', 'commit_unknown', 'applied', 'aborted']),
    reserved_at: timestamp,
    approval_expires_at: timestamp.nullable(),
    attempt_id: digest.nullable(),
    terminal_at: timestamp.optional(),
  })
  .strict()
  .superRefine((record, context) => {
    if (record.status === 'reserved' && record.terminal_at !== undefined)
      context.addIssue({ code: 'custom', message: 'reserved approval cannot have terminal_at' });
    if (record.status !== 'reserved' && record.terminal_at === undefined)
      context.addIssue({ code: 'custom', message: 'terminal approval requires terminal_at' });
  });

export function parseWorkflowApprovalConsumptionRecord(value: unknown): WorkflowApprovalConsumptionRecord {
  return workflowApprovalConsumptionRecordSchema.parse(value) as WorkflowApprovalConsumptionRecord;
}
