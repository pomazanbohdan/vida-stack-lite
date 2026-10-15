import { describe, expect, mock, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import type { TrustedProjectIdentity, ProjectAuthorizationRequest } from '../src/contracts/public-ingress.js';
import type {
  RuntimeEnvelope,
  RuntimeEnvelopeRevisionBinding,
  CoordinationLedger,
  CoordinationTicket,
  CoordinationClaim,
} from '../src/contracts/envelopes.js';
import { configuredTestContext } from './configured-context.js';
import fc from 'fast-check';
import { assertProperty } from './helpers/assert-property.js';
import { requireSynchronousChildSuccess } from './helpers/synchronous-child-outcome.ts';

function runIsolatedMockCase(name: string): void {
  const child = spawnSync(process.execPath, ['test', '--test-name-pattern', name, 'tests/envelopes-boundary.test.ts'], {
    cwd: process.cwd(),
    env: { ...process.env, ENVELOPES_BOUNDARY_ISOLATED_CASE: name },
    encoding: 'utf8',
    timeout: 120_000,
  });
  const completionMarker = `BUN_TEST_CASE_COMPLETE:${name}`;
  requireSynchronousChildSuccess(child, completionMarker);
}

function hasValidateRequest(value: unknown): value is { readonly validateRequest: true } {
  return typeof value === 'object' && value !== null && 'validateRequest' in value && value.validateRequest === true;
}

function coordinationLedgerFixture(): CoordinationLedger {
  const leaseExpiresAt = '2099-09-18T00:00:00.000Z';
  const resource = 'file:src/task.ts';
  const ticket: CoordinationTicket = {
    schema: 'CoordinationTicket/v1',
    ticket_id: 'ticket-owner',
    repository_id: 'repository',
    project_ids: ['project'],
    integrations_digest: 'b'.repeat(64),
    work_id: 'work-owner',
    thread_id: 'thread-owner',
    source_revision: 'source-1',
    generation: 1,
    sequence: 1,
    contour_keys: [],
    exclusive_resources: [resource],
    status: 'active',
    claim_ids: ['claim-owner'],
    expires_at: leaseExpiresAt,
    active_resources: [resource],
    blocked_resources: [],
    created_at: '2026-09-18T00:00:00.000Z',
  };
  const claim: CoordinationClaim = {
    schema: 'WorkstreamClaim/v1',
    claim_id: 'claim-owner',
    ticket_id: ticket.ticket_id,
    work_id: ticket.work_id,
    thread_id: ticket.thread_id,
    generation: ticket.generation,
    resources: [resource],
    lease_expires_at: leaseExpiresAt,
    status: 'active',
    created_at: '2026-09-18T00:00:00.000Z',
    renewed_at: '2026-09-18T00:00:00.000Z',
  };
  return {
    schema: 'CoordinationLedger/v1',
    workspace_id: 'a'.repeat(64),
    revision: 1,
    open_generation: 1,
    next_sequence: 2,
    tickets: [ticket],
    claims: [claim],
    notices: [],
    dispositions: [],
    contours: [],
    batches: [],
    rebinds: [],
    operations: [],
    retirements: [],
  };
}

describe('runtime envelope canonicalization boundary', () => {
  test('owned paths preserve Unicode, device and historical wildcard boundaries', async () => {
    const { safeWorkflowOwnedPath, safeHistoricalWorkflowOwnedPath } = await import('../src/contracts/envelopes.js');
    const controls = Array.from({ length: 32 }, (_, index) => String.fromCodePoint(index)).concat(
      Array.from({ length: 33 }, (_, index) => String.fromCodePoint(0x7f + index)),
    );
    for (const segment of [
      '',
      '.',
      '..',
      '.GiT',
      'trailing.',
      'trailing ',
      'CON',
      'prn.json',
      'AUX',
      'nul.txt',
      'clock$',
      'CONIN$',
      'conout$.json',
      'com1',
      'COM9.txt',
      'com¹',
      'lpt².txt',
      'LPT³',
      '<',
      '>',
      '|',
      '"',
      '?',
      '*',
      ...controls,
    ])
      expect(safeWorkflowOwnedPath(`docs/${segment}/file.txt`), segment).toBe(false);
    for (const value of [
      'docs/ї🚀.txt',
      'docs/clocK$.txt',
      'docs/ſafe.txt',
      'docs/COM10.txt',
      'docs/LPT0.txt',
      'docs/ordinary.\u2028',
      'docs/ordinary \u2029',
      'docs/.GiT\u2028',
      'docs/\u2029',
    ])
      expect(safeWorkflowOwnedPath(value), value).toBe(true);
    for (const value of [null, undefined, 1, {}, []]) {
      expect(Reflect.apply(safeWorkflowOwnedPath, undefined, [value])).toBe(false);
      expect(Reflect.apply(safeHistoricalWorkflowOwnedPath, undefined, [value])).toBe(false);
    }
    const ordinarySegment = fc
      .array(fc.constantFrom('a', 'Z', '0', '_', '-', 'ї', 'α', 'K', 'ſ'), {
        minLength: 1,
        maxLength: 16,
      })
      .map((characters) => `part-${characters.join('')}`);
    const ordinaryPath = fc
      .array(ordinarySegment, { minLength: 1, maxLength: 5 })
      .map((segments) => segments.join('/'));
    assertProperty(
      fc.property(ordinaryPath, fc.constantFrom(...controls), (value, control) => {
        expect(safeWorkflowOwnedPath(value)).toBe(true);
        expect(safeWorkflowOwnedPath(`${value}${control}.txt`)).toBe(false);
      }),
      { seed: 20261011, numRuns: 256 },
    );
    const probeCharacters = new Set(['*', '?', '[', ']', '{', '}']);
    const arbitraryPath = fc
      .array(fc.integer({ min: 0, max: 0x10ffff }), { maxLength: 48 })
      .map((points) => String.fromCodePoint(...points));
    assertProperty(
      fc.property(
        fc.oneof(arbitraryPath, fc.constantFrom('src/**', 'docs/[a-z]/{x,y}.?', 'a\\b', '.git/**')),
        (value) => {
          const probe = Array.from(value, (character) => (probeCharacters.has(character) ? 'x' : character)).join('');
          expect(safeHistoricalWorkflowOwnedPath(value)).toBe(safeWorkflowOwnedPath(probe));
        },
      ),
      { seed: 20261012, numRuns: 256 },
    );
  });

  test('consumes only the exact current revision binding and rejects unsafe workflow paths', async () => {
    const { consumeRuntimeEnvelope, safeWorkflowOwnedPath } = await import('../src/contracts/envelopes.js');
    const envelope: RuntimeEnvelope<{ readonly checks: readonly string[] }> = {
      schema: 'RuntimeEnvelope/v1',
      kind: 'quality-check',
      operation: 'runtime.read',
      sourceRevision: 'source-1',
      expectedRevision: 3,
      payload: { checks: ['static'] },
    };

    expect(
      consumeRuntimeEnvelope(envelope, {
        sourceRevision: 'source-1',
        currentRevision: 3,
      }),
    ).toBe(envelope);
    const staleSource: RuntimeEnvelopeRevisionBinding = { sourceRevision: 'source-2', currentRevision: 3 };
    const staleRevision: RuntimeEnvelopeRevisionBinding = { sourceRevision: 'source-1', currentRevision: 4 };
    const missingSource: RuntimeEnvelopeRevisionBinding = { sourceRevision: '', currentRevision: 3 };
    const zeroRevision: RuntimeEnvelopeRevisionBinding = { sourceRevision: 'source-1', currentRevision: 0 };
    const unsafeRevision: RuntimeEnvelopeRevisionBinding = {
      sourceRevision: 'source-1',
      currentRevision: Number.MAX_SAFE_INTEGER + 1,
    };
    const invalidBindings: ReadonlyArray<readonly [RuntimeEnvelopeRevisionBinding, RegExp]> = [
      [staleSource, /source revision is stale/],
      [staleRevision, /expected revision is stale/],
      [missingSource, /source revision binding is required/],
      [zeroRevision, /current revision binding is invalid/],
      [unsafeRevision, /current revision binding is invalid/],
    ];
    for (const [binding, message] of invalidBindings)
      expect(() => consumeRuntimeEnvelope(envelope, binding)).toThrow(message);

    for (const unsafe of ['', '.', '..', '.git/config', 'folder/../file', 'folder\\file', 'C:/file', 'NUL.txt'])
      expect(safeWorkflowOwnedPath(unsafe), unsafe).toBe(false);
    for (const safe of ['WORK.md', '.agent/work/run/WORK.md', 'folder name/file.json'])
      expect(safeWorkflowOwnedPath(safe), safe).toBe(true);
  });

  test("rejects a ticket that lists another ticket's claim", async () => {
    const { validateCoordinationLedgerV1 } = await import('../src/contracts/envelopes.js');
    const created = '2026-09-18T00:00:00.000Z';
    const expires = '2099-09-18T00:00:00.000Z';
    const ticket = {
      schema: 'CoordinationTicket/v1',
      ticket_id: 'ticket-owner',
      repository_id: 'repository',
      project_ids: ['project'],
      integrations_digest: 'b'.repeat(64),
      work_id: 'work-owner',
      thread_id: 'thread-owner',
      source_revision: 'source',
      generation: 1,
      sequence: 1,
      contour_keys: [],
      exclusive_resources: ['file:src/task.ts'],
      status: 'active',
      claim_ids: ['claim-owner'],
      expires_at: expires,
      active_resources: ['file:src/task.ts'],
      blocked_resources: [],
      created_at: created,
    } satisfies Record<string, unknown>;
    const claim = {
      schema: 'WorkstreamClaim/v1',
      claim_id: 'claim-owner',
      ticket_id: ticket.ticket_id,
      work_id: ticket.work_id,
      thread_id: ticket.thread_id,
      generation: 1,
      resources: ['file:src/task.ts'],
      lease_expires_at: expires,
      status: 'active',
      created_at: created,
      renewed_at: created,
    } satisfies Record<string, unknown>;
    const ledger = {
      schema: 'CoordinationLedger/v1',
      workspace_id: 'a'.repeat(64),
      revision: 1,
      open_generation: 1,
      next_sequence: 3,
      tickets: [ticket],
      claims: [claim],
      notices: [],
      dispositions: [],
      contours: [],
      batches: [],
      rebinds: [],
      operations: [],
      retirements: [],
    } satisfies Record<string, unknown>;
    expect(validateCoordinationLedgerV1(ledger).ok).toBe(true);
    const foreign = {
      ...ticket,
      ticket_id: 'ticket-foreign',
      work_id: 'work-foreign',
      thread_id: 'thread-foreign',
      sequence: 2,
      status: 'queued',
      exclusive_resources: [],
      active_resources: [],
      claim_ids: ['claim-owner'],
      expires_at: null,
    };
    expect(validateCoordinationLedgerV1({ ...ledger, tickets: [ticket, foreign] })).toMatchObject({
      ok: false,
      issues: [{ code: 'TICKET_CLAIM_BINDING_INVALID', path: '$.tickets.1.claim_ids' }],
    });
    const ownClaim = {
      ...claim,
      claim_id: 'claim-foreign-own',
      ticket_id: foreign.ticket_id,
      work_id: foreign.work_id,
      thread_id: foreign.thread_id,
      status: 'released',
      resources: [],
    };
    const bothClaims = {
      ...ledger,
      tickets: [ticket, { ...foreign, claim_ids: [ownClaim.claim_id] }],
      claims: [claim, ownClaim],
    };
    expect(validateCoordinationLedgerV1(bothClaims).ok).toBe(true);
    expect(
      validateCoordinationLedgerV1({
        ...bothClaims,
        tickets: [ticket, { ...foreign, claim_ids: [ownClaim.claim_id, claim.claim_id] }],
      }),
    ).toMatchObject({
      ok: false,
      issues: [{ code: 'TICKET_CLAIM_BINDING_INVALID', path: '$.tickets.1.claim_ids' }],
    });
  });

  test('coordination ledger codec preserves typed ticket and claim records without mutation', async () => {
    const {
      coordinationComponentJson,
      coordinationLedgerDigest,
      coordinationLedgerJson,
      validateCoordinationLedgerV1,
    } = await import('../src/contracts/envelopes.js');
    const ledger = coordinationLedgerFixture();
    const before = structuredClone(ledger);

    expect(validateCoordinationLedgerV1(ledger)).toMatchObject({ ok: true, ledger });
    const encoded = coordinationLedgerJson(ledger);
    expect(JSON.parse(encoded)).toEqual(ledger);
    const ticketBytes = coordinationComponentJson({ ticket: ledger.tickets[0], claims: ledger.claims });
    expect(JSON.parse(ticketBytes)).toEqual({ ticket: ledger.tickets[0], claims: ledger.claims });

    const digest = coordinationLedgerDigest(ledger);
    expect(digest).toBe(createHash('sha256').update(encoded).digest('hex'));
    expect(coordinationLedgerDigest(Object.fromEntries(Object.entries(ledger).reverse()))).toBe(digest);
    expect(coordinationLedgerDigest({ ...ledger, revision: 2 })).not.toBe(digest);
    const invalid = { ...ledger, workspace_id: 'not-a-workspace-digest' };
    expect(() => coordinationLedgerJson(invalid)).toThrow(/coordination ledger rejected/);
    expect(() => coordinationLedgerDigest(invalid)).toThrow(/coordination ledger rejected/);
    expect(() => coordinationComponentJson({ missing: undefined })).toThrow();
    expect(ledger).toEqual(before);
  });

  test('coordination ledger semantics bind claim authority, projections, FIFO, and notice history', async () => {
    const { validateCoordinationLedgerV1 } = await import('../src/contracts/envelopes.js');
    const ledger = coordinationLedgerFixture();
    const ledgerBefore = structuredClone(ledger);
    const owner = ledger.tickets[0]!;
    const claim = ledger.claims[0]!;
    const earlierQueued = {
      ...owner,
      ticket_id: 'ticket-waiting',
      work_id: 'work-waiting',
      thread_id: 'thread-waiting',
      sequence: 1,
      status: 'queued' as const,
      claim_ids: [],
      expires_at: null,
      active_resources: [],
      blocked_resources: [...owner.exclusive_resources],
    };
    const activeAfterWaiter = { ...owner, sequence: 2 };
    const contender = {
      ...earlierQueued,
      ticket_id: 'ticket-contender',
      work_id: 'work-contender',
      thread_id: 'thread-contender',
      sequence: 2,
    };
    const notice = {
      schema: 'ConflictNotice/v1',
      notice_id: 'notice-1',
      generation: 1,
      contender_ticket_id: contender.ticket_id,
      contender_work_id: contender.work_id,
      owner_ticket_id: owner.ticket_id,
      owner_work_id: owner.work_id,
      owner_thread_id: owner.thread_id,
      resources: [...owner.exclusive_resources],
      status: 'resolved',
      acknowledgements: [{ actor: 'operator-1', at: '2026-09-18T00:00:01.000Z' }],
      created_at: '2026-09-18T00:00:00.000Z',
    };
    const disposition = {
      schema: 'ConflictDisposition/v1',
      disposition_id: 'disposition-1',
      subject_kind: 'notice',
      subject_id: notice.notice_id,
      kind: 'serialize',
      decided_by: 'operator-1',
      decision_pointer: 'decision:serialize',
      created_at: '2026-09-18T00:00:02.000Z',
    };
    const historicalLedger = {
      ...ledger,
      tickets: [owner, contender],
      notices: [notice],
      dispositions: [disposition],
      next_sequence: 3,
    };
    expect(validateCoordinationLedgerV1(historicalLedger).ok).toBe(true);

    const cases: ReadonlyArray<{
      readonly value: unknown;
      readonly code: string;
      readonly path: string;
    }> = [
      {
        value: { ...ledger, claims: [{ ...claim, thread_id: 'foreign-thread' }] },
        code: 'CLAIM_AUTHORITY_INVALID',
        path: '$.claims.0',
      },
      {
        value: { ...ledger, tickets: [{ ...owner, active_resources: [] }] },
        code: 'ACTIVE_RESOURCE_PROJECTION_INVALID',
        path: '$.tickets.0.active_resources',
      },
      {
        value: { ...ledger, tickets: [{ ...owner, expires_at: null }] },
        code: 'TICKET_EXPIRY_PROJECTION_INVALID',
        path: '$.tickets.0.expires_at',
      },
      {
        value: { ...ledger, tickets: [earlierQueued, activeAfterWaiter], next_sequence: 3 },
        code: 'FIFO_VIOLATION',
        path: '$.tickets.1.active_resources',
      },
      {
        value: { ...historicalLedger, notices: [{ ...notice, status: 'acknowledged', acknowledgements: [] }] },
        code: 'NOTICE_ACKNOWLEDGEMENT_MISSING',
        path: '$.notices.0.acknowledgements',
      },
    ];
    for (const row of cases) {
      const before = structuredClone(row.value);
      const result = validateCoordinationLedgerV1(row.value);
      expect(result.ok).toBe(false);
      expect(result.issues.map(({ code, path }) => ({ code, path }))).toEqual([{ code: row.code, path: row.path }]);
      expect(row.value).toEqual(before);
    }
    const readyLedger = { ...ledger, tickets: [{ ...owner, status: 'ready_for_handoff' as const }] };
    expect(
      validateCoordinationLedgerV1(readyLedger, { currentTimeMs: Date.parse('2098-09-18T00:00:00.000Z') }).ok,
    ).toBe(true);
    const expired = validateCoordinationLedgerV1(readyLedger, {
      currentTimeMs: Date.parse('2100-09-18T00:00:00.000Z'),
    });
    expect(expired.issues.map(({ code, path }) => ({ code, path }))).toEqual([
      { code: 'READY_LEASE_EXPIRED', path: '$.tickets.0' },
    ]);
    expect(ledger).toEqual(ledgerBefore);
  });

  test('coordination release history binds contour assurance, batch state, rebind, and retirement', async () => {
    const { validateCoordinationLedgerV1 } = await import('../src/contracts/envelopes.js');
    const { canonicalJsonDigest } = await import('../src/contracts/public-ingress.js');
    const base = coordinationLedgerFixture();
    const owner = base.tickets[0]!;
    const ownerClaim = base.claims[0]!;
    const resource = owner.exclusive_resources[0]!;
    const oldTicket = {
      ...owner,
      ticket_id: 'ticket-old',
      work_id: 'work-old',
      thread_id: 'thread-old',
      sequence: 2,
      exclusive_resources: [],
      status: 'read_only' as const,
      claim_ids: ['claim-old'],
      expires_at: null,
      active_resources: [],
      blocked_resources: [],
    };
    const supersedingTicket = {
      ...owner,
      ticket_id: 'ticket-next',
      work_id: 'work-next',
      thread_id: 'thread-next',
      source_revision: 'source-2',
      sequence: 3,
      status: 'queued' as const,
      claim_ids: [],
      expires_at: null,
      active_resources: [],
      blocked_resources: [resource],
    };
    const oldClaim = {
      ...ownerClaim,
      claim_id: 'claim-old',
      ticket_id: oldTicket.ticket_id,
      work_id: oldTicket.work_id,
      thread_id: oldTicket.thread_id,
      status: 'released' as const,
      resources: [],
    };
    const contourIdentity = {
      schema: 'ReleaseContour/v1',
      contour_id: 'contour-1',
      generation: owner.generation,
      work_ids: [owner.work_id],
      ticket_ids: [owner.ticket_id],
      frozen: true,
      created_at: '2026-09-18T00:00:00.000Z',
    };
    const contour = { ...contourIdentity, contour_digest: canonicalJsonDigest(contourIdentity) };
    const assurance = {
      schema: 'CoordinationOperation/v1',
      operation_id: 'operation-assurance-1',
      kind: 'contour_assurance',
      contour_id: contour.contour_id,
      contour_digest: contour.contour_digest,
      integration_work_id: 'work-integration',
      test_receipts: ['test-receipt-1'],
      review_receipt_ids: ['review-1', 'review-2', 'review-3'],
      reverse_receipt_ids: ['reverse-1', 'reverse-2', 'reverse-3'],
      from_ledger_revision: 2,
      to_ledger_revision: 3,
      created_at: '2026-09-18T00:00:03.000Z',
    };
    const release = {
      schema: 'CoordinationOperation/v1',
      operation_id: 'operation-release-1',
      kind: 'release',
      ticket_id: owner.ticket_id,
      work_id: owner.work_id,
      thread_id: owner.thread_id,
      source_revision: owner.source_revision,
      resources: [resource],
      from_ledger_revision: 1,
      to_ledger_revision: 2,
      decided_by: 'operator-1',
      decision_pointer: 'decision:release',
      created_at: '2026-09-18T00:00:02.000Z',
    };
    const rebind = {
      schema: 'CoordinationScopeRebind/v1',
      rebind_id: 'rebind-1',
      work_id: supersedingTicket.work_id,
      previous_ticket_id: oldTicket.ticket_id,
      previous_source_revision: 'source-1',
      ticket_id: supersedingTicket.ticket_id,
      thread_id: supersedingTicket.thread_id,
      source_revision: supersedingTicket.source_revision,
      resources: [resource],
      claimed_resources: [resource],
      retired_claim_ids: [oldClaim.claim_id],
      reason: 'source changed',
      decided_by: 'operator-1',
      decision_pointer: 'decision:rebind',
      from_ledger_revision: 2,
      to_ledger_revision: 3,
      created_at: '2026-09-18T00:00:03.000Z',
    };
    const retirement = {
      schema: 'CoordinationTicketRetirement/v1',
      retirement_id: 'retirement-1',
      work_id: oldTicket.work_id,
      thread_id: oldTicket.thread_id,
      ticket_id: oldTicket.ticket_id,
      generation: oldTicket.generation,
      source_revision: 'source-2',
      ticket_source_revision: oldTicket.source_revision,
      superseding_ticket_id: supersedingTicket.ticket_id,
      superseding_source_revision: supersedingTicket.source_revision,
      from_status: 'queued',
      to_status: 'read_only',
      resources: [resource],
      reason: 'source changed',
      pointer: 'decision:retire',
      actor: 'operator-1',
      from_revision: 1,
      to_revision: 2,
      from_ledger_revision: 2,
      to_ledger_revision: 3,
      timestamp: '2026-09-18T00:00:03.000Z',
    };
    const makeLedger = (status: 'ready_for_user_testing' | 'accepted' | 'feedback' | 'rejected') => {
      const released = status === 'accepted';
      const returned = status === 'feedback' || status === 'rejected';
      const ticket = {
        ...owner,
        status: released ? ('released' as const) : returned ? ('queued' as const) : ('active' as const),
        expires_at: released || returned ? null : owner.expires_at,
        active_resources: released || returned ? [] : [...owner.active_resources],
        blocked_resources: returned ? [resource] : [],
      };
      const claim = released || returned ? { ...ownerClaim, status: 'released' as const } : ownerClaim;
      const batch = {
        schema: 'ReleaseBatch/v1',
        batch_id: 'batch-1',
        contour_id: contour.contour_id,
        generation: contour.generation,
        work_ids: [...contour.work_ids],
        operations: [
          { order: 1, source: 'packages/agent/src/index.ts', destination: 'release/agent', operation: 'copy' },
        ],
        do_not_deploy: [],
        post_deployment_checks: [],
        status,
        ...(status === 'ready_for_user_testing' ? {} : { decision_pointer: `decision:${status}` }),
        created_at: '2026-09-18T00:00:04.000Z',
      };
      return {
        ...base,
        revision: 3,
        next_sequence: 4,
        tickets: [ticket, oldTicket, supersedingTicket],
        claims: [claim, oldClaim],
        contours: [contour],
        batches: [batch],
        rebinds: [rebind],
        operations: [release, assurance],
        retirements: [retirement],
      };
    };

    const ready = makeLedger('ready_for_user_testing');
    const accepted = makeLedger('accepted');
    const feedback = makeLedger('feedback');
    const rejected = makeLedger('rejected');
    const readyBatch = ready.batches[0]!;
    const acceptedBatch = accepted.batches[0]!;
    for (const ledger of [ready, accepted, feedback, rejected])
      expect(validateCoordinationLedgerV1(ledger).ok).toBe(true);

    const cases: ReadonlyArray<{ readonly value: unknown; readonly code: string; readonly path: string }> = [
      {
        value: { ...ready, contours: [{ ...contour, contour_digest: 'c'.repeat(64) }] },
        code: 'CONTOUR_DIGEST_INVALID',
        path: '$.contours.0.contour_digest',
      },
      {
        value: { ...ready, operations: [release, { ...assurance, contour_digest: 'c'.repeat(64) }] },
        code: 'ASSURANCE_CONTOUR_BINDING_INVALID',
        path: '$.operations.1',
      },
      {
        value: { ...ready, batches: [{ ...readyBatch, generation: 2 }] },
        code: 'BATCH_CONTOUR_BINDING_INVALID',
        path: '$.batches.0',
      },
      {
        value: { ...ready, operations: [release] },
        code: 'BATCH_ASSURANCE_MISSING',
        path: '$.batches.0',
      },
      {
        value: { ...ready, batches: [{ ...readyBatch, status: 'accepted', decision_pointer: 'decision:accepted' }] },
        code: 'ACCEPTED_BATCH_NOT_RELEASED',
        path: '$.batches.0',
      },
      {
        value: {
          ...accepted,
          batches: [{ ...acceptedBatch, status: 'feedback', decision_pointer: 'decision:feedback' }],
        },
        code: 'RETURNED_BATCH_NOT_QUEUED',
        path: '$.batches.0',
      },
      {
        value: { ...ready, rebinds: [{ ...rebind, claimed_resources: ['file:src/other.ts'] }] },
        code: 'REBIND_REFERENCE_INVALID',
        path: '$.rebinds.0',
      },
      {
        value: { ...ready, retirements: [{ ...retirement, to_revision: 3 }] },
        code: 'RETIREMENT_REVISION_INVALID',
        path: '$.retirements.0',
      },
    ];
    for (const row of cases) {
      const before = structuredClone(row.value);
      const result = validateCoordinationLedgerV1(row.value);
      expect(result.ok).toBe(false);
      expect(result.issues.map(({ code, path }) => ({ code, path }))).toEqual([{ code: row.code, path: row.path }]);
      expect(row.value).toEqual(before);
    }
  });

  test('normalizes a non-Error canonicalizer failure before rejecting', async () => {
    const name = 'normalizes a non-Error canonicalizer failure before rejecting';
    if (process.env.ENVELOPES_BOUNDARY_ISOLATED_CASE !== name) return runIsolatedMockCase(name);
    await mock.module('../src/contracts/public-ingress.js', () => ({
      assertCanonicalJsonValue: () => {
        throw 'string canonical failure';
      },
    }));
    const envelopes = await import('../src/contracts/envelopes.js');

    expect(() =>
      envelopes.validateRuntimeEnvelope({
        schema: 'RuntimeEnvelope/v1',
        kind: 'quality-check',
        operation: 'runtime.read',
        sourceRevision: 'source-1',
        expectedRevision: 1,
        payload: {},
      }),
    ).toThrow('runtime envelope rejected: string canonical failure');
    process.stdout.write(`BUN_TEST_CASE_COMPLETE:${name}\n`);
  });

  test('normalizes a non-Error authorization failure before denying', async () => {
    const name = 'normalizes a non-Error authorization failure before denying';
    if (process.env.ENVELOPES_BOUNDARY_ISOLATED_CASE !== name) return runIsolatedMockCase(name);
    await mock.module('../src/contracts/public-ingress.js', () => ({
      canonicalJsonDigest: () => 'a'.repeat(64),
      toAuthorizationReceipt: () => undefined,
      validateAuthorizationRequest: () => {
        throw 'string authorization failure';
      },
    }));
    const cedar = await import('../src/authorization/cedar-boundary.js');

    expect(cedar.authorizeProject({}, undefined, undefined, 'ignored-root', '', '')).toEqual({
      decision: 'deny',
      diagnostics: ['string authorization failure'],
    });
    process.stdout.write(`BUN_TEST_CASE_COMPLETE:${name}\n`);
  });

  test('rejects unauthenticated configured Cedar runtime snapshots', async () => {
    const cedar = (await import(
      String('../src/authorization/cedar-boundary.js?config-authenticity-error')
    )) as typeof import('../src/authorization/cedar-boundary.js');
    const { config } = configuredTestContext();

    expect(() => cedar.createConfiguredProjectAuthorizer(process.cwd(), { ...config })).toThrow(
      'runtime config must come from loadRuntimeConfig',
    );
  });

  test('preserves Cedar execution failure diagnostics and request validation', async () => {
    const name = 'preserves Cedar execution failure diagnostics and request validation';
    if (process.env.ENVELOPES_BOUNDARY_ISOLATED_CASE !== name) return runIsolatedMockCase(name);
    const actualCedar = await import('@cedar-policy/cedar-wasm/nodejs');
    await mock.module('@cedar-policy/cedar-wasm/nodejs', () => ({
      ...actualCedar,
      isAuthorized: (value: unknown) => {
        if (!hasValidateRequest(value)) throw new Error('validateRequest flag missing');
        return {
          type: 'failure',
          errors: [{ message: 'cedar execution failure' }],
        };
      },
    }));
    const cedar = await import('../src/authorization/cedar-boundary.js');
    const { repositoryRoot: root, config, context: project } = configuredTestContext();
    const projectId = project.project_ids[0];
    if (!projectId) throw new Error('Test configuration requires a project');
    const request: ProjectAuthorizationRequest = {
      principal: 'principal-1',
      role: 'developer-orchestrator',
      action: 'write',
      tenant: project.repository_id,
      project: projectId,
      resourceTenant: project.repository_id,
      resourceProject: projectId,
      registryHash: project.registry_hash,
      operationHash: 'a'.repeat(64),
    };
    const trustedIdentity: TrustedProjectIdentity = {
      schema: 'TrustedProjectIdentity/v1',
      source: 'authenticated-context',
      principal: request.principal,
      role: request.role,
      tenant: request.tenant,
      project: request.project,
      registry_hash: project.registry_hash,
    };

    expect(
      cedar.authorizeProject(
        request,
        trustedIdentity,
        project,
        root,
        config.authorization.cedar.policy,
        config.authorization.cedar.schema_text,
      ),
    ).toEqual({
      decision: 'deny',
      diagnostics: ['cedar execution failure'],
    });
    process.stdout.write(`BUN_TEST_CASE_COMPLETE:${name}\n`);
  });
});
