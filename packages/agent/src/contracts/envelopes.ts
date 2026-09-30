import Ajv2020 from 'ajv/dist/2020.js';
import type { ValidateFunction } from 'ajv';
import path from 'node:path';
import coordinationLedgerSchema from '../../schemas/coordination-ledger.v1.schema.json' with { type: 'json' };
import envelopeSchema from '../../schemas/runtime-envelope.v1.schema.json' with { type: 'json' };
import { Result } from 'neverthrow';
import z from 'zod';
import { assertCanonicalJsonValue, canonicalJsonDigest, rfc3339TimestampMilliseconds } from './public-ingress.js';

export interface RuntimeEnvelope<TPayload = unknown> {
  readonly schema: 'RuntimeEnvelope/v1';
  readonly kind: string;
  readonly operation: string;
  readonly sourceRevision: string;
  readonly expectedRevision: number;
  readonly payload: TPayload;
}

export interface RuntimeEnvelopeRevisionBinding {
  readonly sourceRevision: string;
  readonly currentRevision: number;
}

type AjvConstructor = new (options?: Record<string, unknown>) => {
  compile<T>(schema: object): ValidateFunction<T>;
};
const Ajv2020Constructor = Ajv2020 as unknown as AjvConstructor;
const validator: ValidateFunction<RuntimeEnvelope> = new Ajv2020Constructor({
  allErrors: true,
}).compile<RuntimeEnvelope>(envelopeSchema);

function reject(conditions: readonly boolean[], message: string): void {
  conditions.filter(Boolean).forEach(() => {
    throw new Error(message);
  });
}

function errorMessage(error: unknown): string {
  return [String(error), (error as Error).message][Number(error instanceof Error)]!;
}
function rejectCanonical(message: string): never {
  throw new Error('runtime envelope rejected: ' + message);
}
const canonicalAttempt = Result.fromThrowable(assertCanonicalJsonValue, errorMessage);
function assertDataOnlyJson(value: unknown): void {
  canonicalAttempt(value).match(Boolean, rejectCanonical);
}

export function validateRuntimeEnvelope(value: unknown): RuntimeEnvelope {
  assertDataOnlyJson(value);
  reject(
    [!validator(value)],
    `runtime envelope rejected: ${[validator.errors, [] as NonNullable<typeof validator.errors>]
      .find(Array.isArray)!
      .map((error) => error.message)
      .join('; ')}`,
  );
  return value as RuntimeEnvelope;
}

/** Consumes the envelope revision pair at a mutation boundary. Schema shape
 * alone is insufficient: both revisions must match the authority that is
 * about to perform the operation. */
export function consumeRuntimeEnvelope(value: unknown, binding: RuntimeEnvelopeRevisionBinding): RuntimeEnvelope {
  const envelope = validateRuntimeEnvelope(value);
  const sourceRevision = binding?.sourceRevision;
  const currentRevision = binding?.currentRevision;
  reject([typeof sourceRevision !== 'string', !sourceRevision], 'runtime envelope source revision binding is required');
  reject(
    [!Number.isSafeInteger(currentRevision), currentRevision < 1],
    'runtime envelope current revision binding is invalid',
  );
  reject([envelope.sourceRevision !== sourceRevision], 'runtime envelope source revision is stale');
  reject([envelope.expectedRevision !== currentRevision], 'runtime envelope expected revision is stale');
  return envelope;
}

export const localToolEnvelope = z
  .object({
    tool: z.string().min(1),
    tenant: z.string().min(1),
    project: z.string().min(1),
    input: z.record(z.string(), z.unknown()),
  })
  .strict();

export type LocalToolEnvelope = z.infer<typeof localToolEnvelope>;

export interface CoordinationTicket {
  readonly schema: 'CoordinationTicket/v1';
  readonly ticket_id: string;
  readonly repository_id: string;
  readonly project_ids: readonly string[];
  readonly integrations_digest: string;
  readonly work_id: string;
  readonly thread_id: string;
  readonly source_revision: string;
  readonly generation: number;
  readonly sequence: number;
  readonly contour_keys: readonly string[];
  readonly exclusive_resources: readonly string[];
  readonly status: 'queued' | 'active' | 'ready_for_handoff' | 'released' | 'read_only' | 'blocked';
  readonly claim_ids: readonly string[];
  readonly expires_at: string | null;
  readonly active_resources: readonly string[];
  readonly blocked_resources: readonly string[];
  readonly created_at: string;
}

export interface CoordinationClaim {
  readonly schema: 'WorkstreamClaim/v1';
  readonly claim_id: string;
  readonly ticket_id: string;
  readonly work_id: string;
  readonly thread_id: string;
  readonly generation: number;
  readonly resources: readonly string[];
  readonly lease_expires_at: string;
  readonly status: 'active' | 'released' | 'recovered';
  readonly created_at: string;
  readonly renewed_at: string;
}

export interface CoordinationLedger {
  readonly schema: 'CoordinationLedger/v1';
  readonly workspace_id: string;
  readonly revision: number;
  readonly open_generation: number;
  readonly next_sequence: number;
  readonly tickets: readonly CoordinationTicket[];
  readonly claims: readonly CoordinationClaim[];
  readonly notices: readonly Readonly<Record<string, unknown>>[];
  readonly dispositions: readonly Readonly<Record<string, unknown>>[];
  readonly contours: readonly Readonly<Record<string, unknown>>[];
  readonly batches: readonly Readonly<Record<string, unknown>>[];
  readonly rebinds: readonly Readonly<Record<string, unknown>>[];
  readonly operations: readonly Readonly<Record<string, unknown>>[];
  readonly retirements: readonly Readonly<Record<string, unknown>>[];
}

export interface CoordinationLedgerValidationIssue {
  readonly code: string;
  readonly path: string;
  readonly message: string;
}

export type CoordinationLedgerValidationResult =
  | { readonly ok: true; readonly ledger: CoordinationLedger; readonly issues: readonly [] }
  | { readonly ok: false; readonly ledger: null; readonly issues: readonly CoordinationLedgerValidationIssue[] };

class CoordinationValidationFailure extends Error {
  constructor(readonly issue: CoordinationLedgerValidationIssue) {
    super(issue.message);
  }
}

const ledgerValidator = new Ajv2020Constructor({ allErrors: true }).compile<CoordinationLedger>(
  coordinationLedgerSchema,
);

function invalidPathSegment(segment: string): boolean {
  return [
    !segment,
    segment === '.',
    segment === '..',
    segment.toLowerCase() === '.git',
    segment.endsWith('.') || segment.endsWith(' '),
    /\p{Cc}/u.test(segment),
    /[<>|"?*]/.test(segment),
    /^(?:con|prn|aux|nul|clock\$|conin\$|conout\$|com[1-9¹²³]|lpt[1-9¹²³])(?:\..*)?$/i.test(segment),
  ].some(Boolean);
}

export function safeWorkflowOwnedPath(value: string): boolean {
  if (typeof value !== 'string') return false;
  const normalized = path.posix.normalize(value);
  return ![
    !value,
    path.isAbsolute(value),
    value.startsWith('~'),
    value.includes('\\'),
    value.includes(':'),
    normalized !== value,
    value.split('/').some(invalidPathSegment),
  ].some(Boolean);
}

export function safeHistoricalWorkflowOwnedPath(value: string): boolean {
  if (typeof value !== 'string') return false;
  const pathProbe = value
    .replaceAll('*', 'x')
    .replaceAll('?', 'x')
    .replace(/[\[\]{}]/g, 'x');
  return safeWorkflowOwnedPath(pathProbe);
}

function ledgerFail(code: string, path: string, message: string): never {
  throw new CoordinationValidationFailure({ code, path, message });
}

function ledgerRequire(condition: unknown, code: string, path: string, message: string): asserts condition {
  if (!condition) ledgerFail(code, path, message);
}

function uniqueLedgerValues(values: readonly string[], code: string, path: string, label: string): void {
  ledgerRequire(
    new Set(values).size === values.length,
    code,
    path,
    label + ' contains aliases or duplicate identifiers',
  );
}

function ledgerTimestamp(value: string, path: string): number {
  const parsed = rfc3339TimestampMilliseconds(value);
  ledgerRequire(parsed !== null && Number.isFinite(parsed), 'TIMESTAMP_INVALID', path, 'lease expiry is invalid');
  return parsed;
}

function ledgerResourceKey(resource: string, path: string): string {
  ledgerRequire(
    resource.trim() === resource && !/\p{Cc}/u.test(resource),
    'RESOURCE_KEY_INVALID',
    path,
    'resource key is invalid',
  );
  if (!resource.startsWith('file:')) return resource;
  ledgerRequire(safeWorkflowOwnedPath(resource.slice(5)), 'RESOURCE_PATH_UNSAFE', path, 'resource file path is unsafe');
  return resource.toLowerCase();
}

function ledgerHistoricalResourceKey(resource: string, path: string): string {
  ledgerRequire(
    resource.trim() === resource && !/\p{Cc}/u.test(resource),
    'RESOURCE_KEY_INVALID',
    path,
    'resource key is invalid',
  );
  if (!resource.startsWith('file:')) return resource;
  ledgerRequire(
    safeHistoricalWorkflowOwnedPath(resource.slice(5)),
    'RESOURCE_PATH_UNSAFE',
    path,
    'resource file path is unsafe',
  );
  return resource.toLowerCase();
}

function ledgerRecordId(value: Readonly<Record<string, unknown>>, field: string, path: string): string {
  const id = value[field];
  ledgerRequire(typeof id === 'string' && id.length > 0, 'HISTORY_ID_MISSING', path, 'history identifier missing');
  return id;
}

function validateLedgerSemantics(ledger: CoordinationLedger, currentTimeMs: number | null): void {
  ledgerRequire(
    ledger.tickets.length +
      ledger.claims.length +
      ledger.notices.length +
      ledger.dispositions.length +
      ledger.contours.length +
      ledger.batches.length +
      ledger.rebinds.length +
      ledger.operations.length +
      ledger.retirements.length <=
      4096,
    'AGGREGATE_RECORD_LIMIT',
    '$',
    'coordination ledger aggregate record limit exceeded',
  );
  ledgerRequire(
    ledger.tickets.reduce(
      (total, ticket) =>
        total +
        ticket.contour_keys.length +
        ticket.exclusive_resources.length +
        ticket.active_resources.length +
        ticket.blocked_resources.length +
        ticket.claim_ids.length,
      0,
    ) +
      ledger.claims.reduce((total, claim) => total + claim.resources.length, 0) <=
      65536,
    'AGGREGATE_RESOURCE_LIMIT',
    '$',
    'coordination ledger aggregate resource limit exceeded',
  );
  uniqueLedgerValues(
    ledger.tickets.map((ticket) => ticket.ticket_id),
    'TICKET_ID_DUPLICATE',
    '$.tickets',
    'ticket identifiers',
  );
  uniqueLedgerValues(
    ledger.tickets.map((ticket) => String(ticket.sequence)),
    'TICKET_SEQUENCE_DUPLICATE',
    '$.tickets',
    'ticket sequences',
  );
  uniqueLedgerValues(
    ledger.claims.map((claim) => claim.claim_id),
    'CLAIM_ID_DUPLICATE',
    '$.claims',
    'claim identifiers',
  );
  for (const [field, id] of [
    ['notices', 'notice_id'],
    ['dispositions', 'disposition_id'],
    ['contours', 'contour_id'],
    ['batches', 'batch_id'],
    ['rebinds', 'rebind_id'],
    ['operations', 'operation_id'],
    ['retirements', 'retirement_id'],
  ] as const)
    uniqueLedgerValues(
      ledger[field].map((entry, index) => ledgerRecordId(entry, id, `$.${field}.${index}.${id}`)),
      'HISTORY_ID_DUPLICATE',
      `$.${field}`,
      field + ' identifiers',
    );

  const tickets = new Map(ledger.tickets.map((ticket) => [ticket.ticket_id, ticket]));
  const claims = new Map(ledger.claims.map((claim) => [claim.claim_id, claim]));
  const claimsByTicket = new Map<string, CoordinationClaim[]>();
  ledger.claims.forEach((claim, index) => {
    const ticket = tickets.get(claim.ticket_id);
    ledgerRequire(ticket, 'CLAIM_TICKET_MISSING', `$.claims.${index}.ticket_id`, 'claim ticket is missing');
    ledgerRequire(
      ticket.work_id === claim.work_id &&
        claim.generation <= ticket.generation &&
        (claim.status !== 'active' ||
          (claim.generation === ticket.generation && claim.thread_id === ticket.thread_id)) &&
        ticket.claim_ids.includes(claim.claim_id),
      'CLAIM_AUTHORITY_INVALID',
      `$.claims.${index}`,
      'claim authority binding invalid',
    );
    uniqueLedgerValues(
      claim.resources.map((resource, resourceIndex) =>
        claim.status === 'active'
          ? ledgerResourceKey(resource, `$.claims.${index}.resources.${resourceIndex}`)
          : ledgerHistoricalResourceKey(resource, `$.claims.${index}.resources.${resourceIndex}`),
      ),
      'CLAIM_RESOURCE_DUPLICATE',
      `$.claims.${index}.resources`,
      'claim resources',
    );
    if (claim.status === 'active')
      ledgerRequire(
        claim.resources.length > 0 &&
          claim.resources.every((resource) => ticket.exclusive_resources.includes(resource)),
        'ACTIVE_CLAIM_SCOPE_INVALID',
        `$.claims.${index}.resources`,
        'active claim exceeds ticket resource scope',
      );
    ledgerTimestamp(claim.lease_expires_at, `$.claims.${index}.lease_expires_at`);
    ledgerTimestamp(claim.created_at, `$.claims.${index}.created_at`);
    ledgerTimestamp(claim.renewed_at, `$.claims.${index}.renewed_at`);
    const entries = claimsByTicket.get(claim.ticket_id) ?? [];
    entries.push(claim);
    claimsByTicket.set(claim.ticket_id, entries);
  });

  const occupied = new Set<string>();
  ledger.tickets.forEach((ticket, index) => {
    ledgerTimestamp(ticket.created_at, `$.tickets.${index}.created_at`);
    uniqueLedgerValues(
      ticket.contour_keys.map((resource, resourceIndex) =>
        ledgerHistoricalResourceKey(resource, `$.tickets.${index}.contour_keys.${resourceIndex}`),
      ),
      'TICKET_CONTOUR_DUPLICATE',
      `$.tickets.${index}.contour_keys`,
      'ticket contour keys',
    );
    uniqueLedgerValues(
      ticket.exclusive_resources.map((resource, resourceIndex) =>
        ledgerHistoricalResourceKey(resource, `$.tickets.${index}.exclusive_resources.${resourceIndex}`),
      ),
      'TICKET_RESOURCE_DUPLICATE',
      `$.tickets.${index}.exclusive_resources`,
      'ticket exclusive resources',
    );
    uniqueLedgerValues(
      ticket.claim_ids,
      'TICKET_CLAIM_DUPLICATE',
      `$.tickets.${index}.claim_ids`,
      'ticket claim identifiers',
    );
    uniqueLedgerValues(
      [...ticket.active_resources, ...ticket.blocked_resources].map((resource, resourceIndex) =>
        ledgerResourceKey(resource, `$.tickets.${index}.resources.${resourceIndex}`),
      ),
      'TICKET_ACTIVE_RESOURCE_DUPLICATE',
      `$.tickets.${index}`,
      'ticket resources',
    );
    ledgerRequire(
      ticket.sequence < ledger.next_sequence,
      'TICKET_SEQUENCE_INVALID',
      `$.tickets.${index}.sequence`,
      'ticket sequence is outside ledger order',
    );
    ledgerRequire(
      [...ticket.active_resources, ...ticket.blocked_resources].every((resource) =>
        ticket.exclusive_resources.includes(resource),
      ),
      'TICKET_RESOURCE_SCOPE_INVALID',
      `$.tickets.${index}`,
      'ticket resources exceed exclusive scope',
    );
    ledgerRequire(
      ticket.claim_ids.every((claimId) => claims.has(claimId)),
      'TICKET_CLAIM_MISSING',
      `$.tickets.${index}.claim_ids`,
      'ticket references a missing claim',
    );
    ledgerRequire(
      ticket.claim_ids.every((claimId) => claims.get(claimId)!.ticket_id === ticket.ticket_id),
      'TICKET_CLAIM_BINDING_INVALID',
      `$.tickets.${index}.claim_ids`,
      'ticket references a claim owned by another ticket',
    );
    const activeClaims = (claimsByTicket.get(ticket.ticket_id) ?? []).filter((claim) => claim.status === 'active');
    uniqueLedgerValues(
      activeClaims.flatMap((claim) =>
        claim.resources.map((resource) => ledgerResourceKey(resource, `$.tickets.${index}.active_resources`)),
      ),
      'ACTIVE_CLAIM_RESOURCE_DUPLICATE',
      `$.tickets.${index}.active_resources`,
      'active claim ownership',
    );
    const projected = [...new Set(activeClaims.flatMap((claim) => claim.resources))].sort();
    ledgerRequire(
      canonicalJsonDigest(projected) === canonicalJsonDigest([...ticket.active_resources].sort()),
      'ACTIVE_RESOURCE_PROJECTION_INVALID',
      `$.tickets.${index}.active_resources`,
      'ticket active resource projection differs from claims',
    );
    const expiry = activeClaims.map((claim) => claim.lease_expires_at).sort()[0] ?? null;
    ledgerRequire(
      ticket.expires_at === expiry,
      'TICKET_EXPIRY_PROJECTION_INVALID',
      `$.tickets.${index}.expires_at`,
      'ticket effective lease differs from claims',
    );
    ledgerRequire(
      ['queued', 'active', 'ready_for_handoff'].includes(ticket.status) || ticket.active_resources.length === 0,
      'INACTIVE_TICKET_OWNS_RESOURCE',
      `$.tickets.${index}.active_resources`,
      'inactive ticket cannot own resources',
    );
    ledgerRequire(
      !['released', 'read_only'].includes(ticket.status) || ticket.blocked_resources.length === 0,
      'CLOSED_TICKET_BLOCKED',
      `$.tickets.${index}.blocked_resources`,
      'closed ticket cannot request resources',
    );
    if (ticket.status === 'ready_for_handoff') {
      ledgerRequire(
        ticket.blocked_resources.length === 0 &&
          canonicalJsonDigest([...ticket.active_resources].sort()) ===
            canonicalJsonDigest([...ticket.exclusive_resources].sort()),
        'READY_OWNERSHIP_INCOMPLETE',
        `$.tickets.${index}`,
        'ready ticket requires complete current ownership',
      );
      if (currentTimeMs !== null)
        ledgerRequire(
          activeClaims.every((claim) => ledgerTimestamp(claim.lease_expires_at, '$.claims') > currentTimeMs),
          'READY_LEASE_EXPIRED',
          `$.tickets.${index}`,
          'ready ticket requires complete current ownership',
        );
    }
    for (const [resourceIndex, resource] of ticket.active_resources.entries()) {
      const key = ledgerResourceKey(resource, `$.tickets.${index}.active_resources.${resourceIndex}`);
      const earlier = ledger.tickets.find(
        (candidate) =>
          candidate.ticket_id !== ticket.ticket_id &&
          candidate.sequence < ticket.sequence &&
          ['queued', 'active', 'ready_for_handoff'].includes(candidate.status) &&
          [...candidate.active_resources, ...candidate.blocked_resources].some(
            (claimed) => ledgerResourceKey(claimed, '$.tickets') === key,
          ),
      );
      ledgerRequire(
        !earlier,
        'FIFO_VIOLATION',
        `$.tickets.${index}.active_resources`,
        'resource activation violates coordination FIFO',
      );
      ledgerRequire(
        !occupied.has(key),
        'ACTIVE_RESOURCE_CONFLICT',
        `$.tickets.${index}.active_resources`,
        'resource has conflicting owners',
      );
      occupied.add(key);
    }
  });

  const notices = new Map(ledger.notices.map((entry) => [String(entry.notice_id), entry]));
  ledger.notices.forEach((notice, index) => {
    ledgerRequire(
      tickets.has(String(notice.owner_ticket_id)) && tickets.has(String(notice.contender_ticket_id)),
      'NOTICE_TICKET_MISSING',
      `$.notices.${index}`,
      'notice ticket is missing',
    );
    const resources = notice.resources as readonly string[];
    uniqueLedgerValues(
      resources.map((resource, resourceIndex) =>
        ledgerResourceKey(resource, `$.notices.${index}.resources.${resourceIndex}`),
      ),
      'NOTICE_RESOURCE_DUPLICATE',
      `$.notices.${index}.resources`,
      'notice resources',
    );
    uniqueLedgerValues(
      (notice.acknowledgements as readonly Readonly<Record<string, unknown>>[]).map((entry) => String(entry.actor)),
      'NOTICE_ACKNOWLEDGEMENT_DUPLICATE',
      `$.notices.${index}.acknowledgements`,
      'notice acknowledgement actors',
    );
    if (notice.status === 'acknowledged')
      ledgerRequire(
        (notice.acknowledgements as readonly unknown[]).length > 0,
        'NOTICE_ACKNOWLEDGEMENT_MISSING',
        `$.notices.${index}.acknowledgements`,
        'acknowledged notice requires an acknowledgement',
      );
    if (notice.status === 'resolved')
      ledgerRequire(
        ledger.dispositions.some((entry) => entry.subject_kind === 'notice' && entry.subject_id === notice.notice_id),
        'NOTICE_DISPOSITION_MISSING',
        `$.notices.${index}`,
        'resolved notice requires a disposition',
      );
  });
  ledger.dispositions.forEach((disposition, index) => {
    const kind = String(disposition.subject_kind);
    const id = String(disposition.subject_id);
    ledgerRequire(
      (kind === 'notice' && notices.has(id)) || (kind === 'claim' && claims.has(id)),
      'DISPOSITION_SUBJECT_MISSING',
      `$.dispositions.${index}`,
      'disposition subject is missing',
    );
    ledgerRequire(
      disposition.kind !== 'recover_expired' || kind === 'claim',
      'DISPOSITION_SUBJECT_KIND_INVALID',
      `$.dispositions.${index}`,
      'claim recovery disposition requires a claim subject',
    );
    ledgerRequire(
      disposition.kind === 'recover_expired' || kind === 'notice',
      'DISPOSITION_SUBJECT_KIND_INVALID',
      `$.dispositions.${index}`,
      'conflict disposition requires a notice subject',
    );
  });

  const contours = new Map(ledger.contours.map((entry) => [String(entry.contour_id), entry]));
  ledger.contours.forEach((contour, index) => {
    const ticketIds = contour.ticket_ids as readonly string[];
    const contourTickets = ticketIds.map((id) => tickets.get(id));
    ledgerRequire(
      contourTickets.every(Boolean),
      'CONTOUR_TICKET_MISSING',
      `$.contours.${index}`,
      'contour ticket is missing',
    );
    ledgerRequire(
      contourTickets.every((ticket) => ticket?.generation === contour.generation) &&
        canonicalJsonDigest(contour.work_ids) === canonicalJsonDigest(contourTickets.map((ticket) => ticket?.work_id)),
      'CONTOUR_TICKET_BINDING_INVALID',
      `$.contours.${index}`,
      'contour ticket binding invalid',
    );
    const identity = {
      schema: contour.schema,
      contour_id: contour.contour_id,
      generation: contour.generation,
      work_ids: contour.work_ids,
      ticket_ids: contour.ticket_ids,
      frozen: contour.frozen,
      created_at: contour.created_at,
    };
    ledgerRequire(
      contour.contour_digest === canonicalJsonDigest(identity),
      'CONTOUR_DIGEST_INVALID',
      `$.contours.${index}.contour_digest`,
      'contour digest binding invalid',
    );
  });
  ledger.batches.forEach((batch, index) => {
    const contour = contours.get(String(batch.contour_id));
    ledgerRequire(
      contour &&
        batch.generation === contour.generation &&
        canonicalJsonDigest(batch.work_ids) === canonicalJsonDigest(contour.work_ids),
      'BATCH_CONTOUR_BINDING_INVALID',
      `$.batches.${index}`,
      'release batch contour binding invalid',
    );
    uniqueLedgerValues(
      (batch.operations as readonly Readonly<Record<string, unknown>>[]).map((entry) => String(entry.order)),
      'BATCH_OPERATION_ORDER_DUPLICATE',
      `$.batches.${index}.operations`,
      'release batch operation orders',
    );
    for (const [operationIndex, operation] of (
      batch.operations as readonly Readonly<Record<string, unknown>>[]
    ).entries())
      ledgerRequire(
        safeWorkflowOwnedPath(String(operation.source)),
        'BATCH_SOURCE_PATH_UNSAFE',
        `$.batches.${index}.operations.${operationIndex}.source`,
        'release batch source path is unsafe',
      );
    for (const [excludedIndex, excludedPath] of (batch.do_not_deploy as readonly string[]).entries())
      ledgerRequire(
        safeWorkflowOwnedPath(excludedPath),
        'BATCH_EXCLUDED_PATH_UNSAFE',
        `$.batches.${index}.do_not_deploy.${excludedIndex}`,
        'release batch excluded path is unsafe',
      );
    uniqueLedgerValues(
      (batch.post_deployment_checks as readonly Readonly<Record<string, unknown>>[]).map((entry) => String(entry.id)),
      'POST_DEPLOYMENT_CHECK_DUPLICATE',
      `$.batches.${index}.post_deployment_checks`,
      'post-deployment check identifiers',
    );
    if (batch.status !== 'ready_for_user_testing') {
      const contourTickets = (contour.ticket_ids as readonly string[]).map((id) => tickets.get(id));
      ledgerRequire(
        contourTickets.every(Boolean),
        'BATCH_TICKET_MISSING',
        `$.batches.${index}`,
        'release batch ticket is missing',
      );
      if (batch.status === 'accepted')
        ledgerRequire(
          contourTickets.every(
            (ticket) =>
              ticket?.status === 'released' &&
              ticket.active_resources.length === 0 &&
              ticket.blocked_resources.length === 0 &&
              !(claimsByTicket.get(ticket.ticket_id) ?? []).some((claim) => claim.status === 'active'),
          ),
          'ACCEPTED_BATCH_NOT_RELEASED',
          `$.batches.${index}`,
          'accepted release batch must atomically release contour tickets',
        );
      else
        ledgerRequire(
          contourTickets.every((ticket) => ticket?.status === 'queued'),
          'RETURNED_BATCH_NOT_QUEUED',
          `$.batches.${index}`,
          'returned release batch must atomically queue contour tickets',
        );
    }
  });
  ledger.operations.forEach((operation, index) => {
    ledgerRequire(
      operation.to_ledger_revision === Number(operation.from_ledger_revision) + 1 &&
        Number(operation.to_ledger_revision) <= ledger.revision,
      'OPERATION_REVISION_INVALID',
      `$.operations.${index}`,
      'coordination operation revision binding invalid',
    );
    if (operation.kind === 'release') {
      ledgerRequire(
        tickets.has(String(operation.ticket_id)),
        'RELEASE_TICKET_MISSING',
        `$.operations.${index}.ticket_id`,
        'release operation ticket is missing',
      );
      const resources = operation.resources as readonly string[];
      ledgerRequire(
        resources.length > 0,
        'RELEASE_RESOURCE_EMPTY',
        `$.operations.${index}.resources`,
        'release operation requires resources',
      );
      resources.forEach((resource, resourceIndex) =>
        ledgerHistoricalResourceKey(resource, `$.operations.${index}.resources.${resourceIndex}`),
      );
    } else {
      const contour = contours.get(String(operation.contour_id));
      ledgerRequire(
        contour?.contour_digest === operation.contour_digest,
        'ASSURANCE_CONTOUR_BINDING_INVALID',
        `$.operations.${index}`,
        'assurance operation contour binding invalid',
      );
    }
  });
  ledger.batches.forEach((batch, index) =>
    ledgerRequire(
      ledger.operations.some(
        (operation) =>
          operation.kind === 'contour_assurance' &&
          operation.contour_id === batch.contour_id &&
          operation.contour_digest === contours.get(String(batch.contour_id))?.contour_digest,
      ),
      'BATCH_ASSURANCE_MISSING',
      `$.batches.${index}`,
      'release batch requires contour assurance',
    ),
  );
  ledger.retirements.forEach((retirement, index) => {
    const target = tickets.get(String(retirement.ticket_id));
    const superseding = tickets.get(String(retirement.superseding_ticket_id));
    ledgerRequire(
      target && superseding,
      'RETIREMENT_TICKET_MISSING',
      `$.retirements.${index}`,
      'retirement ticket is missing',
    );
    ledgerRequire(
      Number(retirement.to_ledger_revision) === Number(retirement.from_ledger_revision) + 1 &&
        Number(retirement.to_ledger_revision) <= ledger.revision &&
        Number(retirement.to_revision) === Number(retirement.from_revision) + 1,
      'RETIREMENT_REVISION_INVALID',
      `$.retirements.${index}`,
      'retirement revision binding invalid',
    );
    (retirement.resources as readonly string[]).forEach((resource, resourceIndex) =>
      ledgerHistoricalResourceKey(resource, `$.retirements.${index}.resources.${resourceIndex}`),
    );
  });
  ledger.rebinds.forEach((rebind, index) => {
    const retiredClaimIds = rebind.retired_claim_ids as readonly string[];
    ledgerRequire(
      tickets.has(String(rebind.ticket_id)),
      'REBIND_TICKET_MISSING',
      `$.rebinds.${index}`,
      'coordination rebind ticket is missing',
    );
    const resources = rebind.resources as readonly string[];
    const claimedResources = (rebind.claimed_resources as readonly string[] | undefined) ?? [];
    ledgerRequire(
      claimedResources.every((resource) => resources.includes(resource)) &&
        retiredClaimIds.every((id) => {
          const claim = claims.get(id);
          return Boolean(claim && claim.status !== 'active');
        }) &&
        Number(rebind.to_ledger_revision) === Number(rebind.from_ledger_revision) + 1 &&
        Number(rebind.to_ledger_revision) <= ledger.revision,
      'REBIND_REFERENCE_INVALID',
      `$.rebinds.${index}`,
      'coordination rebind binding invalid',
    );
    resources.forEach((resource, resourceIndex) =>
      ledgerHistoricalResourceKey(resource, `$.rebinds.${index}.resources.${resourceIndex}`),
    );
  });
}

/** Current-v1 coordination validation shared by migration and the trusted host.
 * Historical entries validate their immutable snapshots and references; only
 * active claims are rebound to the current ticket scope. Lease freshness is a
 * host observation and is checked only when currentTimeMs is supplied. */
export function validateCoordinationLedgerV1(
  value: unknown,
  options: { readonly currentTimeMs?: number | null } = {},
): CoordinationLedgerValidationResult {
  if (!ledgerValidator(value))
    return {
      ok: false,
      ledger: null,
      issues: (ledgerValidator.errors ?? []).map((error) => ({
        code: 'SCHEMA_INVALID',
        path: '$' + error.instancePath.replaceAll('/', '.'),
        message: 'ledger record must match current CoordinationLedger/v1: ' + (error.message ?? 'invalid value'),
      })),
    };
  try {
    validateLedgerSemantics(value, options.currentTimeMs ?? null);
    return { ok: true, ledger: value, issues: [] };
  } catch (error) {
    if (error instanceof CoordinationValidationFailure) return { ok: false, ledger: null, issues: [error.issue] };
    throw error;
  }
}
