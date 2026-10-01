import { createConsumerFixture } from './helpers/consumer-fixture.mjs';
import { rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterAll, afterEach, describe, expect, test, vi } from 'vitest';
import path from 'node:path';

const repositoryRoot =
  process.env.AGENT_RUNTIME_TEST_REPOSITORY_ROOT ??
  createConsumerFixture(path.resolve(fileURLToPath(new URL('..', import.meta.url))));
afterAll(() => {
  if (!process.env.AGENT_RUNTIME_TEST_REPOSITORY_ROOT) rmSync(repositoryRoot, { recursive: true, force: true });
});

afterEach(() => {
  vi.resetModules();
  vi.doUnmock('../src/contracts/public-ingress.ts');
  vi.doUnmock('@cedar-policy/cedar-wasm/nodejs');
});

describe('runtime envelope canonicalization boundary', () => {
  test('consumes only the exact current revision binding and rejects unsafe workflow paths', async () => {
    const { consumeRuntimeEnvelope, safeWorkflowOwnedPath } = await import('../src/contracts/envelopes.ts');
    const envelope = {
      schema: 'RuntimeEnvelope/v1',
      kind: 'quality-check',
      operation: 'runtime.read',
      sourceRevision: 'source-1',
      expectedRevision: 3,
      payload: { checks: ['static'] },
    };

    expect(consumeRuntimeEnvelope(envelope, { sourceRevision: 'source-1', currentRevision: 3 })).toBe(envelope);
    for (const [binding, message] of [
      [{ sourceRevision: 'source-2', currentRevision: 3 }, /source revision is stale/],
      [{ sourceRevision: 'source-1', currentRevision: 4 }, /expected revision is stale/],
      [{ sourceRevision: '', currentRevision: 3 }, /source revision binding is required/],
      [{ sourceRevision: 'source-1', currentRevision: 0 }, /current revision binding is invalid/],
      [
        { sourceRevision: 'source-1', currentRevision: Number.MAX_SAFE_INTEGER + 1 },
        /current revision binding is invalid/,
      ],
    ])
      expect(() => consumeRuntimeEnvelope(envelope, binding)).toThrow(message);

    for (const unsafe of ['', '.', '..', '.git/config', 'folder/../file', 'folder\\file', 'C:/file', 'NUL.txt'])
      expect(safeWorkflowOwnedPath(unsafe), unsafe).toBe(false);
    for (const safe of ['WORK.md', '.agent/work/run/WORK.md', 'folder name/file.json'])
      expect(safeWorkflowOwnedPath(safe), safe).toBe(true);
  });

  test("rejects a ticket that lists another ticket's claim", async () => {
    const { validateCoordinationLedgerV1 } = await import('../src/contracts/envelopes.ts');
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
    };
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
    };
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
    };
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
  test('normalizes a non-Error canonicalizer failure before rejecting', async () => {
    vi.doMock('../src/contracts/public-ingress.ts', () => ({
      assertCanonicalJsonValue: () => {
        throw 'string canonical failure';
      },
    }));
    const envelopes = await import('../src/contracts/envelopes.ts?string-canonical-error');

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
  });
  test('normalizes a non-Error authorization failure before denying', async () => {
    vi.doMock('../src/contracts/public-ingress.ts', () => ({
      canonicalJsonDigest: () => 'a'.repeat(64),
      toAuthorizationReceipt: () => undefined,
      validateAuthorizationRequest: () => {
        throw 'string authorization failure';
      },
    }));
    const cedar = await import('../src/authorization/cedar-boundary.ts?string-authorization-error');

    expect(cedar.authorizeProject({}, undefined, undefined, 'ignored-root', '', '')).toEqual({
      decision: 'deny',
      diagnostics: ['string authorization failure'],
    });
  });
  test('rejects unauthenticated configured Cedar runtime snapshots', async () => {
    const cedar = await import('../src/authorization/cedar-boundary.ts?config-authenticity-error');

    expect(() =>
      cedar.createConfiguredProjectAuthorizer(process.cwd(), {
        authorization: { cedar: { policy: 'policy', schema_text: 'schema' } },
      }),
    ).toThrow('runtime config must come from loadRuntimeConfig');
  });

  test('preserves Cedar execution failure diagnostics and request validation', async () => {
    vi.doMock('@cedar-policy/cedar-wasm/nodejs', () => ({
      isAuthorized: (value) => {
        if (value.validateRequest !== true) throw new Error('validateRequest flag missing');
        return { type: 'failure', errors: [{ message: 'cedar execution failure' }] };
      },
    }));
    const cedar = await import('../src/authorization/cedar-boundary.ts?execution-failure');
    const { loadRuntimeConfig } = await import('../src/config/runtime-config.ts');
    const { loadProjectContext } = await import('../src/config/project-context.ts');
    const root = repositoryRoot;
    const config = loadRuntimeConfig(root);
    const project = loadProjectContext(root, config, config.repository.repository_id, config.projects[0].project_id);
    const request = {
      principal: 'principal-1',
      role: 'developer-orchestrator',
      action: 'write',
      tenant: project.repository_id,
      project: project.project_ids[0],
      resourceTenant: project.repository_id,
      resourceProject: project.project_ids[0],
      registryHash: project.registry_hash,
      operationHash: 'a'.repeat(64),
    };
    const trustedIdentity = {
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
  });
});
