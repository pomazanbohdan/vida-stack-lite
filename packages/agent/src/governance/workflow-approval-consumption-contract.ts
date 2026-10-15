import z from 'zod';
import { isPlainRecord, rfc3339TimestampMilliseconds } from '../contracts/public-ingress.js';
import type { WorkflowApprovalConsumptionRecord } from './edictum-boundary.js';

export const WORKFLOW_APPROVAL_IDENTITY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
export const WORKFLOW_STORE_ID_PATTERN = /^(?!\.{1,2}$)[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
export const RESERVATION_FENCING_TOKEN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const identityText = z.string().regex(WORKFLOW_APPROVAL_IDENTITY_PATTERN);
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const timestamp = z.string().refine((value) => rfc3339TimestampMilliseconds(value) !== null);
const plainRecord = z.custom<Record<string, unknown>>(isPlainRecord);
const bindingFields = {
  stage_id: identityText,
  approval_id: identityText,
  operation_hash: digest,
  tenant: identityText,
  project: identityText,
};
const bindingFieldCount = Object.keys(bindingFields).length;
const binding = plainRecord
  .refine((value) => Object.keys(value).length === bindingFieldCount)
  .pipe(z.object(bindingFields).strict());

const recordFields = {
  schema: z.literal('EdictumWorkflowApprovalConsumption/v1'),
  store_id: z.string().regex(WORKFLOW_STORE_ID_PATTERN),
  store_generation: z.string().regex(RESERVATION_FENCING_TOKEN),
  binding,
  fencing_token: z.string().regex(RESERVATION_FENCING_TOKEN),
  reserved_at: timestamp,
  approval_expires_at: timestamp.nullable(),
  attempt_id: digest.nullable(),
};

const recordFieldCount = Object.keys(recordFields).length;
export const workflowApprovalConsumptionRecordSchema = plainRecord
  .refine((value) => Object.keys(value).length === recordFieldCount + (value.status === 'reserved' ? 1 : 2))
  .pipe(
    z.discriminatedUnion('status', [
      z.object({ ...recordFields, status: z.literal('reserved') }).strict(),
      z
        .object({ ...recordFields, status: z.enum(['commit_unknown', 'applied', 'aborted']), terminal_at: timestamp })
        .strict(),
    ]),
  );

export function parseWorkflowApprovalConsumptionRecord(value: unknown): WorkflowApprovalConsumptionRecord {
  const parsed = workflowApprovalConsumptionRecordSchema.safeParse(value);
  if (!parsed.success) throw new Error('host workflow approval record is invalid');
  return parsed.data;
}
