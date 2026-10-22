/** Private witness of an authorized same-database resource binding transition. */
import Ajv2020 from 'ajv/dist/2020.js';
import type { ValidateFunction } from 'ajv';
import { canonicalJson, canonicalJsonDigest } from '../contracts/public-ingress.js';
import { validateWorkState } from '../contracts/work-state-schema.js';
import { coordinationLedgerDigest } from '../contracts/envelopes.js';
import type {
  CoordinationLedger,
  CoordinationTicket,
  HostStateSnapshot,
  StateVersion,
  WorkState,
} from '../host-state.js';
import {
  taskSourceResourcePair,
  validateTaskSourceBindingRequest,
  type TaskSourceBindingRequest,
} from './task-source-binding.js';

interface TaskSourceResourceTransitionAuthority {
  readonly source_authorization_sha256: string;
  readonly source_scope_digest: string;
}

type TicketProjection = Pick<
  CoordinationTicket,
  | 'ticket_id'
  | 'repository_id'
  | 'project_ids'
  | 'integrations_digest'
  | 'work_id'
  | 'thread_id'
  | 'source_revision'
  | 'generation'
  | 'sequence'
  | 'exclusive_resources'
> & { readonly status_at_issue: 'queued' | 'active' };

interface TaskSourceResourceTransitionReceiptV1 {
  readonly schema: 'TaskSourceResourceTransitionReceipt/v1';
  readonly workspace_id: string;
  readonly integrations_digest: string;
  readonly request: TaskSourceBindingRequest;
  readonly prepared_state_version: StateVersion;
  readonly authority_digest: string;
  readonly prior_work_version: StateVersion;
  readonly successor_work_version: StateVersion;
  readonly prior_ledger_version: StateVersion;
  readonly successor_ledger_version: StateVersion;
  readonly prior_binding_digest: string;
  readonly successor_binding_digest: string;
  readonly added_resources: readonly string[];
  readonly ticket: TicketProjection;
}

export type TaskSourceResourceTransitionReceipt =
  | TaskSourceResourceTransitionReceiptV1
  | (Omit<TaskSourceResourceTransitionReceiptV1, 'schema'> & {
      readonly schema: 'TaskSourceResourceTransitionReceipt/v2';
      readonly prior_work: WorkState;
    });

export interface TaskSourceResourceTransitionInput {
  readonly request: unknown;
  readonly prepared_state_version: StateVersion;
  readonly authority: unknown;
  readonly before: HostStateSnapshot;
  readonly nextWork: WorkState;
  readonly nextLedger: CoordinationLedger;
  readonly additions: readonly string[];
}

/** SQL owner fills work_id only when the installed table has that projection column. */
export interface JoinedPreparedOperationRow {
  readonly workspace_id: unknown;
  readonly work_id?: unknown;
  readonly operation_id: unknown;
  readonly request_id: unknown;
  readonly request_digest: unknown;
  readonly revision: unknown;
  readonly payload: unknown;
  readonly digest: unknown;
}

type JsonRecord = Record<string, unknown>;
type CheckedTransitionInput = Omit<TaskSourceResourceTransitionInput, 'before' | 'authority'> & {
  readonly before: {
    readonly work: WorkState;
    readonly ledger: CoordinationLedger;
    readonly workVersion: StateVersion;
    readonly ledgerVersion: StateVersion;
  };
  readonly authority: TaskSourceResourceTransitionAuthority;
};
type ValidatedPreparedOperation = {
  readonly operation: Readonly<JsonRecord>;
  readonly state_version: StateVersion;
};
type AjvCompiler = new (options?: Record<string, unknown>) => {
  compile<T>(schema: object): ValidateFunction<T>;
};
const Ajv = Ajv2020 as unknown as AjvCompiler;
const digestSchema = { type: 'string', pattern: '^[a-f0-9]{64}$' } as const;
const versionSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['revision', 'digest'],
  properties: { revision: { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER }, digest: digestSchema },
} as const;
const ticketSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'ticket_id',
    'repository_id',
    'project_ids',
    'integrations_digest',
    'work_id',
    'thread_id',
    'source_revision',
    'generation',
    'sequence',
    'exclusive_resources',
    'status_at_issue',
  ],
  properties: {
    ticket_id: { type: 'string', minLength: 1 },
    repository_id: { type: 'string', minLength: 1 },
    project_ids: { type: 'array', minItems: 1, uniqueItems: true, items: { type: 'string', minLength: 1 } },
    integrations_digest: digestSchema,
    work_id: { type: 'string', minLength: 1 },
    thread_id: { type: 'string', minLength: 1 },
    source_revision: { type: 'string', minLength: 1 },
    generation: { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER },
    sequence: { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER },
    exclusive_resources: { type: 'array', uniqueItems: true, items: { type: 'string', minLength: 1 } },
    status_at_issue: { enum: ['queued', 'active'] },
  },
} as const;
const receiptSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema',
    'workspace_id',
    'integrations_digest',
    'request',
    'prepared_state_version',
    'authority_digest',
    'prior_work_version',
    'successor_work_version',
    'prior_ledger_version',
    'successor_ledger_version',
    'prior_binding_digest',
    'successor_binding_digest',
    'added_resources',
    'ticket',
  ],
  properties: {
    schema: { const: 'TaskSourceResourceTransitionReceipt/v1' },
    workspace_id: { type: 'string', minLength: 1 },
    integrations_digest: digestSchema,
    request: { type: 'object' },
    prepared_state_version: versionSchema,
    authority_digest: digestSchema,
    prior_work_version: versionSchema,
    successor_work_version: versionSchema,
    prior_ledger_version: versionSchema,
    successor_ledger_version: versionSchema,
    prior_binding_digest: digestSchema,
    successor_binding_digest: digestSchema,
    added_resources: {
      type: 'array',
      minItems: 1,
      maxItems: 2,
      uniqueItems: true,
      items: { type: 'string', pattern: '^(branch:|worktree:).+' },
    },
    ticket: ticketSchema,
  },
} as const;
const authoritySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['source_authorization_sha256', 'source_scope_digest'],
  properties: { source_authorization_sha256: digestSchema, source_scope_digest: digestSchema },
} as const;
const preparedOperationSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'authority',
    'created_at',
    'operation_id',
    'request',
    'request_digest',
    'request_id',
    'revision',
    'schema',
    'status',
  ],
  properties: {
    authority: authoritySchema,
    created_at: { type: 'string', minLength: 1 },
    operation_id: { type: 'string', minLength: 1 },
    request: { type: 'object' },
    request_digest: digestSchema,
    request_id: { type: 'string', minLength: 1 },
    revision: { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER },
    schema: { const: 'TaskSourceBindingOperation/v1' },
    status: { const: 'prepared' },
  },
} as const;
const schemaCompiler = new Ajv({ allErrors: false });
const validateReceiptShape = schemaCompiler.compile<TaskSourceResourceTransitionReceipt>({
  anyOf: [
    receiptSchema,
    {
      ...receiptSchema,
      required: [...receiptSchema.required, 'prior_work'],
      properties: {
        ...receiptSchema.properties,
        schema: { const: 'TaskSourceResourceTransitionReceipt/v2' },
        prior_work: { type: 'object' },
      },
    },
  ],
});
const validatePreparedShape = schemaCompiler.compile<JsonRecord>(preparedOperationSchema as object);
const validateAuthorityShape = schemaCompiler.compile<TaskSourceResourceTransitionAuthority>(authoritySchema as object);

function reject(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function same(left: unknown, right: unknown): boolean {
  return canonicalJson(left) === canonicalJson(right);
}

function checkedInput(input: TaskSourceResourceTransitionInput): CheckedTransitionInput {
  reject(
    input.before.work !== null &&
      input.before.ledger !== null &&
      input.before.workVersion !== null &&
      input.before.ledgerVersion !== null,
    'TaskSource resource transition requires a complete Host before snapshot',
  );
  reject(validateAuthorityShape(input.authority), 'TaskSource prepared authority shape invalid');
  return {
    ...input,
    before: {
      work: input.before.work!,
      ledger: input.before.ledger!,
      workVersion: input.before.workVersion!,
      ledgerVersion: input.before.ledgerVersion!,
    },
    authority: input.authority as TaskSourceResourceTransitionAuthority,
  };
}

function stateVersion(value: StateVersion): StateVersion {
  reject(
    Number.isSafeInteger(value.revision) && value.revision > 0 && /^[a-f0-9]{64}$/.test(value.digest),
    'invalid StateVersion',
  );
  return value;
}

function workVersion(work: WorkState): StateVersion {
  return { revision: work.revision, digest: canonicalJsonDigest(work) };
}

function ledgerVersion(ledger: CoordinationLedger): StateVersion {
  return { revision: ledger.revision, digest: coordinationLedgerDigest(ledger) };
}

function expectedTicketResources(
  work: WorkState,
  predecessor: CoordinationTicket,
  requested: readonly string[],
): string[] {
  const resources: string[] = [];
  for (const file of work.binding.implementation_paths) resources.push(`file:${file}`);
  for (const resource of predecessor.exclusive_resources)
    if (!resource.startsWith('file:') && !requested.includes(resource)) resources.push(resource);
  for (const resource of requested) resources.push(resource);
  return [...new Set(resources)].sort();
}

function uniqueTicket(tickets: readonly CoordinationTicket[], id: string | undefined): CoordinationTicket | undefined {
  let found: CoordinationTicket | undefined;
  for (const ticket of tickets) {
    if (ticket.ticket_id !== id) continue;
    reject(found === undefined, 'duplicate TaskSource reservation ticket');
    found = ticket;
  }
  return found;
}
function issuanceTicket(
  input: CheckedTransitionInput,
  request: TaskSourceBindingRequest,
  requested: readonly string[],
): {
  readonly ticket: CoordinationTicket & { readonly status: 'queued' | 'active' };
  readonly predecessor: CoordinationTicket;
} {
  const id = `task-source-ticket:${request.work_id}:${request.attempt}:${request.operation_id}`;
  const predecessor = uniqueTicket(input.before.ledger.tickets, input.before.work.lease?.ticket_id),
    target = uniqueTicket(input.nextLedger.tickets, id);
  reject(predecessor?.status === 'active', 'receipt has no active predecessor ticket');
  reject(
    uniqueTicket(input.before.ledger.tickets, id) === undefined,
    'resource addition must be the first ticket reservation',
  );
  reject(target !== undefined, 'issued TaskSource ticket is missing');
  reject(target.status === 'queued' || target.status === 'active', 'issued TaskSource ticket status differs');
  const expected = expectedTicketResources(input.before.work, predecessor, requested);
  reject(
    same(target.exclusive_resources, expected) &&
      same(
        [
          target.work_id,
          target.repository_id,
          target.project_ids,
          target.integrations_digest,
          target.thread_id,
          target.source_revision,
          target.generation,
          target.sequence,
        ],
        [
          request.work_id,
          request.repository_id,
          request.project_ids,
          input.before.work.binding.integrations_digest,
          request.thread_id,
          predecessor.source_revision,
          input.before.ledger.open_generation,
          input.before.ledger.next_sequence,
        ],
      ),
    'TaskSource issuance ticket projection differs from request and prior reservation',
  );
  return { ticket: { ...target, status: target.status }, predecessor };
}

function validateLivePair(
  input: CheckedTransitionInput,
  request: TaskSourceBindingRequest,
  requested: readonly string[],
  ticket: CoordinationTicket,
  additions: readonly string[],
): { readonly successor_work_version: StateVersion; readonly successor_ledger_version: StateVersion } {
  const { work, ledger } = input.before,
    afterWorkVersion = workVersion(input.nextWork),
    afterLedgerVersion = ledgerVersion(input.nextLedger),
    expectedLease =
      ticket.status === 'active'
        ? { ticket_id: ticket.ticket_id, thread_id: request.thread_id, generation: ticket.generation }
        : work.lease;
  reject(
    same(
      [
        work.workspace_id,
        ledger.workspace_id,
        work.binding.lifecycle_work_id,
        work.binding.repository_id,
        work.binding.project_ids,
        work.binding.integrations_digest,
        input.authority.source_scope_digest,
      ],
      [
        input.nextWork.workspace_id,
        input.nextLedger.workspace_id,
        request.work_id,
        request.repository_id,
        request.project_ids,
        input.nextWork.binding.integrations_digest,
        work.binding.work_source_revision,
      ],
    ),
    'TaskSource resource transition identity or authority scope differs',
  );
  reject(
    input.nextWork.revision === work.revision + 1 &&
      input.nextLedger.revision === ledger.revision + 1 &&
      additions.length > 0 &&
      additions.length <= 2 &&
      same(additions, input.additions),
    'TaskSource resource transition CAS versions or additions differ',
  );
  reject(
    same(input.nextWork.binding, {
      ...work.binding,
      allowed_resources: [...new Set([...work.binding.allowed_resources, ...requested])].sort(),
    }) &&
      same(input.nextWork, {
        ...work,
        revision: work.revision + 1,
        binding: input.nextWork.binding,
        lifecycle: { ...work.lifecycle, revision: work.lifecycle.revision + 1 },
        lease: expectedLease,
      }),
    'TaskSource resource transition Work postimage differs from exact issue projection',
  );
  return { successor_work_version: afterWorkVersion, successor_ledger_version: afterLedgerVersion };
}

function resourceTransitionWitness(work: WorkState) {
  return work.execution.assignment_attempts.length > 0
    ? { schema: 'TaskSourceResourceTransitionReceipt/v2' as const, prior_work: work }
    : { schema: 'TaskSourceResourceTransitionReceipt/v1' as const };
}

export function createTaskSourceResourceTransitionReceipt(
  input: TaskSourceResourceTransitionInput,
): TaskSourceResourceTransitionReceipt | undefined {
  const request = validateTaskSourceBindingRequest(input.request);
  if (input.additions.length === 0) return undefined;
  const checked = checkedInput(input);
  const requested = taskSourceResourcePair(request.canonical_host_root, request),
    priorResources = new Set(checked.before.work.binding.allowed_resources),
    successorResources = new Set(checked.nextWork.binding.allowed_resources),
    additions: string[] = [];
  for (const resource of requested) {
    reject(successorResources.has(resource), 'request resource missing from successor binding');
    if (!priorResources.has(resource)) additions.push(resource);
  }
  reject(same(additions, [...checked.additions].sort()), 'TaskSource additions or prepared authority shape differs');
  const priorWorkVersion = workVersion(checked.before.work),
    priorLedgerVersion = ledgerVersion(checked.before.ledger);
  reject(
    same([priorWorkVersion, priorLedgerVersion], [checked.before.workVersion, checked.before.ledgerVersion]),
    'TaskSource before snapshot StateVersions do not match their states',
  );
  const { ticket, predecessor } = issuanceTicket(checked, request, requested),
    successorVersions = validateLivePair(checked, request, requested, ticket, additions);
  const expectedLedger = taskSourceReservationLedger(
    checked.before.ledger,
    predecessor,
    ticket,
    'task-source-claim:' + request.work_id + ':' + request.attempt + ':' + request.operation_id,
    request.source_root!,
    ticket.created_at,
  );
  reject(
    coordinationLedgerDigest(expectedLedger) === successorVersions.successor_ledger_version.digest,
    'TaskSource Ledger postimage differs from exact reservation',
  );
  const receipt: TaskSourceResourceTransitionReceipt = {
    ...resourceTransitionWitness(checked.before.work),
    workspace_id: checked.before.work.workspace_id,
    integrations_digest: checked.before.work.binding.integrations_digest,
    request,
    prepared_state_version: stateVersion(input.prepared_state_version),
    authority_digest: canonicalJsonDigest(checked.authority),
    prior_work_version: stateVersion(checked.before.workVersion),
    successor_work_version: successorVersions.successor_work_version,
    prior_ledger_version: stateVersion(checked.before.ledgerVersion),
    successor_ledger_version: successorVersions.successor_ledger_version,
    prior_binding_digest: canonicalJsonDigest(checked.before.work.binding),
    successor_binding_digest: canonicalJsonDigest(checked.nextWork.binding),
    added_resources: additions,
    ticket: {
      ticket_id: ticket.ticket_id,
      repository_id: ticket.repository_id,
      project_ids: ticket.project_ids,
      integrations_digest: ticket.integrations_digest,
      work_id: ticket.work_id,
      thread_id: ticket.thread_id,
      source_revision: ticket.source_revision,
      generation: ticket.generation,
      sequence: ticket.sequence,
      exclusive_resources: ticket.exclusive_resources,
      status_at_issue: ticket.status,
    },
  };
  return parseTaskSourceResourceTransitionReceipt(receipt);
}

function validateTerminalWorkWitness(
  receipt: TaskSourceResourceTransitionReceipt,
  request: TaskSourceBindingRequest,
): void {
  if (receipt.schema === 'TaskSourceResourceTransitionReceipt/v2') {
    const prior = receipt.prior_work;
    reject(
      validateWorkState(prior) &&
        same(workVersion(prior), receipt.prior_work_version) &&
        canonicalJsonDigest(prior.binding) === receipt.prior_binding_digest &&
        same(
          [
            prior.workspace_id,
            prior.binding.lifecycle_work_id,
            prior.binding.repository_id,
            prior.binding.project_ids,
            prior.binding.integrations_digest,
            prior.binding.config_digest,
          ],
          [
            receipt.workspace_id,
            request.work_id,
            request.repository_id,
            request.project_ids,
            receipt.integrations_digest,
            request.config_digest,
          ],
        ) &&
        prior.execution.assignment_attempts.length > 0 &&
        prior.execution.assignment_attempts.every(
          (attempt) => attempt.status === 'completed' || attempt.status === 'no_effect',
        ),
      'TaskSource resource history prior terminal Work witness differs',
    );
  }
}

export function parseTaskSourceResourceTransitionReceipt(candidate: unknown): TaskSourceResourceTransitionReceipt {
  reject(validateReceiptShape(candidate), 'TaskSource resource transition receipt schema invalid');
  const receipt = candidate as TaskSourceResourceTransitionReceipt,
    request = validateTaskSourceBindingRequest(receipt.request),
    requested = taskSourceResourcePair(request.canonical_host_root, request),
    ticket = receipt.ticket;
  validateTerminalWorkWitness(receipt, request);
  reject(
    receipt.successor_work_version.revision === receipt.prior_work_version.revision + 1 &&
      receipt.successor_ledger_version.revision === receipt.prior_ledger_version.revision + 1 &&
      same(
        [receipt.prior_work_version, receipt.prior_ledger_version],
        [request.expected_host.work, request.expected_host.ledger],
      ) &&
      same(receipt.added_resources, [...receipt.added_resources].sort()),
    'TaskSource resource receipt identity or version order invalid',
  );
  for (const resource of receipt.added_resources)
    reject(requested.includes(resource), 'receipt addition is not request-derived');
  reject(
    same(
      [ticket.ticket_id, ticket.work_id, ticket.repository_id, ticket.project_ids, ticket.thread_id],
      [
        `task-source-ticket:${request.work_id}:${request.attempt}:${request.operation_id}`,
        request.work_id,
        request.repository_id,
        request.project_ids,
        request.thread_id,
      ],
    ) && same(ticket.exclusive_resources, [...new Set(ticket.exclusive_resources)].sort()),
    'receipt issuance ticket identity or resources invalid',
  );
  reject(ticket.integrations_digest === receipt.integrations_digest, 'receipt ticket integrations identity differs');
  for (const resource of requested)
    reject(ticket.exclusive_resources.includes(resource), 'receipt ticket omits a request resource');
  return receipt;
}

export function rewindTaskSourceResourceBinding(
  candidate: WorkState,
  expectedBinding: WorkState['binding'],
  candidateReceipt: unknown,
): WorkState['binding'] {
  const receipt = parseTaskSourceResourceTransitionReceipt(candidateReceipt),
    requested = taskSourceResourcePair(receipt.request.canonical_host_root, receipt.request),
    binding = expectedBinding,
    candidateVersion = workVersion(candidate);
  reject(
    same(
      [
        binding.lifecycle_work_id,
        binding.repository_id,
        binding.project_ids,
        binding.integrations_digest,
        candidate.workspace_id,
        binding.config_digest,
      ],
      [
        receipt.request.work_id,
        receipt.request.repository_id,
        receipt.request.project_ids,
        receipt.integrations_digest,
        receipt.workspace_id,
        receipt.request.config_digest,
      ],
    ),
    'receipt candidate Work/binding identity differs',
  );
  reject(
    candidateVersion.revision >= receipt.successor_work_version.revision &&
      (candidateVersion.revision !== receipt.successor_work_version.revision ||
        same(candidateVersion, receipt.successor_work_version)) &&
      canonicalJsonDigest(binding) === receipt.successor_binding_digest,
    'receipt is future or does not match successor Work/binding',
  );
  const removed = new Set(receipt.added_resources),
    priorResources: string[] = [],
    expectedAdded: string[] = [];
  for (const resource of binding.allowed_resources) if (!removed.has(resource)) priorResources.push(resource);
  for (const resource of requested) {
    reject(binding.allowed_resources.includes(resource), 'request resource missing from successor binding');
    if (!priorResources.includes(resource)) expectedAdded.push(resource);
  }
  reject(
    same(expectedAdded.sort(), receipt.added_resources),
    'receipt is not the exact request-derived set difference',
  );
  const priorBinding = { ...binding, allowed_resources: priorResources };
  reject(
    canonicalJsonDigest(priorBinding) === receipt.prior_binding_digest,
    'receipt rewind differs from prior binding digest',
  );
  return priorBinding;
}

export function validateJoinedPreparedTaskSourceOperation(
  candidate: unknown,
  row: JoinedPreparedOperationRow,
): ValidatedPreparedOperation {
  const receipt = parseTaskSourceResourceTransitionReceipt(candidate);
  reject(typeof row.payload === 'string', 'joined prepared payload is missing');
  const parsed: unknown = JSON.parse(row.payload);
  reject(validatePreparedShape(parsed), 'joined prepared operation schema invalid');
  const operation = parsed as JsonRecord,
    request = validateTaskSourceBindingRequest(operation.request),
    authority = operation.authority as TaskSourceResourceTransitionAuthority,
    requestDigest = canonicalJsonDigest(request);
  reject(
    same(
      [
        row.workspace_id,
        row.work_id === undefined || row.work_id === request.work_id,
        row.operation_id,
        row.request_id,
        row.request_digest,
        row.revision,
        row.digest,
        row.payload,
        [operation.operation_id, operation.revision, operation.request_id, operation.request_digest],
        Number.isFinite(Date.parse(String(operation.created_at))),
      ],
      [
        receipt.workspace_id,
        true,
        request.operation_id,
        request.request_id,
        requestDigest,
        receipt.prepared_state_version.revision,
        receipt.prepared_state_version.digest,
        canonicalJson(operation),
        [request.operation_id, receipt.prepared_state_version.revision, request.request_id, requestDigest],
        true,
      ],
    ),
    'joined prepared operation row identity, checksum, or StateVersion differs',
  );
  reject(
    same(
      [request, canonicalJsonDigest(authority), canonicalJsonDigest(operation)],
      [receipt.request, receipt.authority_digest, receipt.prepared_state_version.digest],
    ),
    'prepared request or authority differs from resource receipt',
  );
  return {
    operation,
    state_version: receipt.prepared_state_version,
  };
}

/** The maintained pure reservation recipe; Host still owns checking and atomic persistence. */
export function taskSourceReservationLedger(
  ledger: CoordinationLedger,
  prior: CoordinationTicket,
  sourceTicket: CoordinationTicket,
  claimId: string,
  sourceRoot: string,
  now: string,
): CoordinationLedger {
  const queued = sourceTicket.status === 'queued',
    ticketId = sourceTicket.ticket_id,
    existingTicket = ledger.tickets.some((ticket) => ticket.ticket_id === ticketId);
  const releasedPrior: CoordinationTicket = {
    ...prior,
    status: 'released',
    active_resources: [],
    blocked_resources: [],
    expires_at: null,
  };
  const nextTickets = ledger.tickets.map((ticket) =>
    ticket.ticket_id === ticketId
      ? sourceTicket
      : !queued && ticket.ticket_id === prior.ticket_id
        ? releasedPrior
        : ticket,
  );
  if (!existingTicket) nextTickets.push(sourceTicket);
  const nextClaims: CoordinationLedger['claims'][number][] = ledger.claims.map((claim) =>
    !queued && claim.ticket_id === prior.ticket_id && claim.status === 'active'
      ? { ...claim, status: 'released' as const, renewed_at: now }
      : claim,
  );
  if (!queued)
    nextClaims.push({
      schema: 'WorkstreamClaim/v1',
      claim_id: claimId,
      ticket_id: ticketId,
      work_id: sourceTicket.work_id,
      thread_id: sourceTicket.thread_id,
      generation: sourceTicket.generation,
      resources: [...sourceTicket.exclusive_resources],
      lease_expires_at: sourceTicket.expires_at!,
      status: 'active',
      created_at: now,
      renewed_at: now,
    });
  const nextOperations: CoordinationLedger['operations'] = !queued
    ? [
        ...ledger.operations,
        {
          schema: 'CoordinationOperation/v1',
          operation_id: 'task-source-release-' + ticketId,
          kind: 'release',
          ticket_id: prior.ticket_id,
          work_id: prior.work_id,
          thread_id: prior.thread_id,
          source_revision: prior.source_revision,
          resources: [...prior.exclusive_resources],
          from_ledger_revision: ledger.revision,
          to_ledger_revision: ledger.revision + 1,
          decided_by: sourceTicket.thread_id,
          decision_pointer: sourceRoot,
          created_at: now,
        },
      ]
    : ledger.operations;
  return {
    ...ledger,
    revision: ledger.revision + 1,
    next_sequence: ledger.next_sequence + Number(!existingTicket),
    tickets: nextTickets,
    claims: nextClaims,
    operations: nextOperations,
  };
}
