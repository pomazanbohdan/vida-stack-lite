import { describe, expect, mock, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import type { TrustedProjectIdentity, ProjectAuthorizationRequest } from '../src/contracts/public-ingress.js';
import type { RuntimeEnvelope, RuntimeEnvelopeRevisionBinding } from '../src/contracts/envelopes.js';
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
