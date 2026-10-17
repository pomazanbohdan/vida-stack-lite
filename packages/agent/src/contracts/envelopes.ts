import Ajv2020 from 'ajv/dist/2020.js';
import type { ValidateFunction } from 'ajv';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';
import {
  canonicalJsonImageWithNodeLimit,
  canonicalJsonWithNodeLimit,
  MAX_CANONICAL_NODES,
  MAX_CANONICAL_BYTES,
} from './canonical-json-core.js';
import coordinationLedgerSchema from '../../schemas/coordination-ledger.v1.schema.json' with { type: 'json' };
import envelopeSchema from '../../schemas/runtime-envelope.v1.schema.json' with { type: 'json' };
import { Result } from 'neverthrow';
import z from 'zod';
import { canonicalJsonDigest, rfc3339TimestampMilliseconds } from './public-ingress.js';
import { errorMessage } from './forward-controller-values.js';

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

function rejectCanonical(cause: unknown): never {
  throw new Error('runtime envelope rejected: ' + errorMessage(cause), { cause });
}
const canonicalAttempt = Result.fromThrowable(canonicalJsonImageWithNodeLimit);
function assertDataOnlyJson(value: unknown): unknown {
  return canonicalAttempt(value, 0, MAX_CANONICAL_NODES).mapErr(rejectCanonical)._unsafeUnwrap().image;
}

export function validateRuntimeEnvelope(value: unknown): RuntimeEnvelope {
  const image = assertDataOnlyJson(value);
  if (!validator(image)) rejectCanonical(validator.errors!.map((error) => error.message).join('; '));
  return image as RuntimeEnvelope;
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

/** A typed ledger has record/resource limits, not the node budget of one ingress message. */
export function coordinationLedgerJson(value: unknown, depth = 0): string {
  const { image, json: payload } = canonicalJsonImageWithNodeLimit(value, depth, MAX_CANONICAL_BYTES);
  reject([Buffer.byteLength(payload) > MAX_CANONICAL_BYTES], 'coordination ledger byte budget exceeded');
  const result = validateCoordinationLedgerImageV1(image, {});
  reject([!result.ok], 'coordination ledger rejected: ' + result.issues.map((issue) => issue.message).join('; '));
  return payload;
}

/** Internal components selected from a validated ledger retain its byte/depth bounds. */
export function coordinationComponentJson(value: unknown, depth = 0): string {
  // Each encoded JSON node consumes at least one byte. The encoded component cap
  // therefore bounds traversal independently of the schema's collection limits.
  const payload = canonicalJsonWithNodeLimit(value, depth, MAX_CANONICAL_BYTES);
  reject([Buffer.byteLength(payload) > MAX_CANONICAL_BYTES], 'coordination ledger byte budget exceeded');
  return payload;
}

export function coordinationLedgerDigest(value: unknown): string {
  return createHash('sha256').update(coordinationLedgerJson(value)).digest('hex');
}

/** Order-sensitive comparison of string lists after their domain boundary validation. */
export function sameCoordinationStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

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

interface CoordinationLedgerValidationIssue {
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

const ledgerValidator = new Ajv2020Constructor({ allErrors: true, messages: true }).compile<CoordinationLedger>(
  coordinationLedgerSchema,
);

// Require the actual end of a segment: `$` also matches before a final Unicode line separator.
const invalidPathSegmentSyntax = /(?:^|^\.[gG][iI][tT]|[. ])(?![\s\S])|\p{Cc}|[<>|"?*]/u;
const reservedPathSegment =
  /^(?:con|prn|aux|nul|clock\$|conin\$|conout\$|com[1-9¹²³]|lpt[1-9¹²³])(?:\.[\s\S]*)?(?![\s\S])/i;

function invalidPathSegment(segment: string): boolean {
  return invalidPathSegmentSyntax.test(segment) || reservedPathSegment.test(segment);
}

export function safeWorkflowOwnedPath(value: string): boolean {
  if (typeof value !== 'string') return false;
  return ![
    !value,
    !value.isWellFormed(),
    path.isAbsolute(value),
    value.startsWith('~'),
    value.includes('\\'),
    value.includes(':'),
    value.split('/').some(invalidPathSegment),
  ].some(Boolean);
}

export function safeHistoricalWorkflowOwnedPath(value: string): boolean {
  if (typeof value !== 'string') return false;
  const pathProbe = value.replace(/[*?[\]{}]/g, 'x');
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
  ledgerRequire(parsed !== null, 'TIMESTAMP_INVALID', path, 'lease expiry is invalid');
  return parsed;
}

type ClaimLeaseOrderingValue = {
  readonly claim: Pick<CoordinationClaim, 'lease_expires_at'>;
  readonly leaseExpiry: number;
  readonly leaseSubmillisecond: number;
};

function compareClaimLeaseExpiry(left: ClaimLeaseOrderingValue, right: ClaimLeaseOrderingValue): number {
  return (
    left.leaseExpiry - right.leaseExpiry ||
    left.leaseSubmillisecond - right.leaseSubmillisecond ||
    (left.claim.lease_expires_at < right.claim.lease_expires_at
      ? -1
      : Number(left.claim.lease_expires_at > right.claim.lease_expires_at))
  );
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

function releaseOperationMatchesTicketIdentity(
  operation: Readonly<Record<string, unknown>>,
  ticket: CoordinationTicket,
): boolean {
  return (
    operation.work_id === ticket.work_id &&
    operation.thread_id === ticket.thread_id &&
    operation.source_revision === ticket.source_revision
  );
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
      ledger[field].map((entry) => entry[id] as string),
      'HISTORY_ID_DUPLICATE',
      `$.${field}`,
      field + ' identifiers',
    );

  const activeClaimsByTicket = new Map<
    string,
    {
      readonly claim: CoordinationClaim;
      readonly resourceKeys: readonly string[];
      readonly leaseExpiry: number;
      readonly leaseSubmillisecond: number;
    }[]
  >();
  const tickets = new Map(
    ledger.tickets.map((ticket) => {
      activeClaimsByTicket.set(ticket.ticket_id, []);
      return [ticket.ticket_id, ticket];
    }),
  );
  const claims = new Map(ledger.claims.map((claim) => [claim.claim_id, claim]));
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
    const resourceKeys = claim.resources.map((resource, resourceIndex) =>
      claim.status === 'active'
        ? ledgerResourceKey(resource, `$.claims.${index}.resources.${resourceIndex}`)
        : ledgerHistoricalResourceKey(resource, `$.claims.${index}.resources.${resourceIndex}`),
    );
    uniqueLedgerValues(resourceKeys, 'CLAIM_RESOURCE_DUPLICATE', `$.claims.${index}.resources`, 'claim resources');
    if (claim.status === 'active') {
      ledgerRequire(
        claim.resources.every((resource) => ticket.exclusive_resources.includes(resource)),
        'ACTIVE_CLAIM_SCOPE_INVALID',
        `$.claims.${index}.resources`,
        'active claim exceeds ticket resource scope',
      );
    }
    const leaseExpiry = ledgerTimestamp(claim.lease_expires_at, `$.claims.${index}.lease_expires_at`);
    ledgerTimestamp(claim.created_at, `$.claims.${index}.created_at`);
    ledgerTimestamp(claim.renewed_at, `$.claims.${index}.renewed_at`);
    if (claim.status === 'active')
      activeClaimsByTicket.get(claim.ticket_id)!.push({
        claim,
        resourceKeys,
        leaseExpiry,
        // Timestamp validation above permits nine fractional digits; Date.parse retains only three.
        leaseSubmillisecond: Number((/\.(\d+)/u.exec(claim.lease_expires_at)?.[1] ?? '').padEnd(9, '0').slice(3)),
      });
  });

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
    const ticketResourceKeys = [...ticket.active_resources, ...ticket.blocked_resources].map(
      (resource, resourceIndex) => ledgerResourceKey(resource, `$.tickets.${index}.resources.${resourceIndex}`),
    );
    uniqueLedgerValues(
      ticketResourceKeys,
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
    const activeClaims = activeClaimsByTicket.get(ticket.ticket_id)!;
    uniqueLedgerValues(
      activeClaims.flatMap((row) => row.resourceKeys),
      'ACTIVE_CLAIM_RESOURCE_DUPLICATE',
      `$.tickets.${index}.active_resources`,
      'active claim ownership',
    );
    const projected = activeClaims.flatMap((row) => row.claim.resources).sort();
    ledgerRequire(
      sameCoordinationStrings(projected, [...ticket.active_resources].sort()),
      'ACTIVE_RESOURCE_PROJECTION_INVALID',
      `$.tickets.${index}.active_resources`,
      'ticket active resource projection differs from claims',
    );
    const expiry = activeClaims.toSorted(compareClaimLeaseExpiry)[0]?.claim.lease_expires_at ?? null;
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
        sameCoordinationStrings([...ticket.active_resources].sort(), [...ticket.exclusive_resources].sort()),
        'READY_OWNERSHIP_INCOMPLETE',
        `$.tickets.${index}`,
        'ready ticket requires complete current ownership',
      );
      if (currentTimeMs !== null)
        ledgerRequire(
          activeClaims.every((row) => row.leaseExpiry > currentTimeMs),
          'READY_LEASE_EXPIRED',
          `$.tickets.${index}`,
          'ready ticket requires complete current ownership',
        );
    }
    for (const [resourceIndex] of ticket.active_resources.entries()) {
      const key = ticketResourceKeys[resourceIndex]!;
      const earlier = ledger.tickets.find(
        (candidate) =>
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
      contourTickets.every((ticket) => ticket!.generation === contour.generation) &&
        canonicalJsonDigest(contour.work_ids) === canonicalJsonDigest(contourTickets.map((ticket) => ticket!.work_id)),
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
      if (batch.status === 'accepted')
        ledgerRequire(
          contourTickets.every((ticket) => ticket!.status === 'released'),
          'ACCEPTED_BATCH_NOT_RELEASED',
          `$.batches.${index}`,
          'accepted release batch must atomically release contour tickets',
        );
      else
        ledgerRequire(
          contourTickets.every((ticket) => ticket!.status === 'queued'),
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
      const ticket = tickets.get(String(operation.ticket_id));
      ledgerRequire(
        ticket,
        'RELEASE_TICKET_MISSING',
        `$.operations.${index}.ticket_id`,
        'release operation ticket is missing',
      );
      ledgerRequire(
        releaseOperationMatchesTicketIdentity(operation, ticket),
        'RELEASE_TICKET_BINDING_INVALID',
        `$.operations.${index}`,
        'release operation identity differs from its ticket',
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
      ledger.operations.some((operation) => operation.contour_id === batch.contour_id),
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

function validateCoordinationLedgerImageV1(
  value: unknown,
  options: { readonly currentTimeMs?: number | null },
): CoordinationLedgerValidationResult {
  if (!ledgerValidator(value))
    return {
      ok: false,
      ledger: null,
      // Synchronous Ajv failure supplies errors; messages are enabled above.
      issues: ledgerValidator.errors!.map((error) => ({
        code: 'SCHEMA_INVALID',
        path: '$' + error.instancePath.replaceAll('/', '.'),
        message: 'ledger record must match current CoordinationLedger/v1: ' + error.message!,
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

/** Validate one owned descriptor image; later caller mutation cannot change
 * what schema and semantic checks observed. History keeps immutable bindings;
 * host lease freshness is checked only when currentTimeMs is supplied. */
function captureCoordinationLedgerV1(
  value: unknown,
  options: { readonly currentTimeMs?: number | null } = {},
): CoordinationLedgerValidationResult {
  const captured = canonicalAttempt(value, 0, MAX_CANONICAL_BYTES);
  if (captured.isErr() || Buffer.byteLength(captured.value.json) > MAX_CANONICAL_BYTES)
    return {
      ok: false,
      ledger: null,
      issues: [
        {
          code: 'SCHEMA_INVALID',
          path: '$',
          message: 'ledger record must match current CoordinationLedger/v1: canonical JSON input is invalid',
        },
      ],
    };
  return validateCoordinationLedgerImageV1(captured.value.image, options);
}

export { captureCoordinationLedgerV1 as validateCoordinationLedgerV1 };
