import { describe, expect, test } from 'vitest';
import path from 'node:path';
import os from 'node:os';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  buildGovernedWriteRequest,
  computeWriteOperationHash,
  loadProjectContext,
  loadRuntimeConfig,
} from '../src/index.ts';
import { toAuthorizationReceipt } from '../src/contracts/public-ingress.ts';
import {
  compileConfiguredEdictumWorkflow,
  createCompositionRootControlKernel,
  createCompositionRootGovernanceGuard,
  createFileOperationReservationStore,
  createGovernanceGuard,
  createTestGovernanceGuard,
  createTestOperationReservationStore,
  evaluateGovernance,
  isGovernanceDenied,
  isTrustedGovernanceControlKernel,
  loadConfiguredEdictumGovernancePolicy,
  runGovernedWrite,
} from '../src/governance/edictum-boundary.ts';
import { nativeNoFollowAvailable } from '../src/config/host-capability.ts';
const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const repositoryRoot = process.env.AGENT_RUNTIME_TEST_REPOSITORY_ROOT ?? path.resolve(packageRoot, '..');
const config = loadRuntimeConfig(repositoryRoot);
const project = loadProjectContext(repositoryRoot, config, config.repository.repository_id, '3mob');
let sequence = 0;

function evidence() {
  sequence += 1;
  const operation = 'repository.write';
  const payload = { path: `agent-runtime-new/quality-${sequence}.txt`, value: 'updated' };
  const authorization = {
    principal: 'principal-1',
    role: 'developer-orchestrator',
    action: 'write',
    tenant: project.tenant_id,
    project: project.project_id,
    resourceTenant: project.tenant_id,
    resourceProject: project.project_id,
    registryHash: project.registry_hash,
  };
  const operationHash = computeWriteOperationHash({
    operation,
    payload,
    ...authorization,
  });
  const approvedAt = new Date(Date.now() - 1_000).toISOString();
  const approval = {
    decision: 'approved',
    decision_id: `approval-${sequence}`,
    approver: 'operator-1',
    tenant: project.tenant_id,
    project: project.project_id,
    operation_hash: operationHash,
    approved_at: approvedAt,
    expires_at: new Date(Date.now() + 60_000).toISOString(),
  };
  const intent = { operation, payload, authorization, approval };
  const receipt = toAuthorizationReceipt({ ...authorization, operationHash }, `decision-${sequence}`, approvedAt);
  const verifiedApproval = {
    ...approval,
    verified: true,
    issuer: 'test-authority',
    verification_id: `verification-${sequence}`,
    verified_at: approvedAt,
  };
  const request = buildGovernedWriteRequest(intent, receipt, verifiedApproval);
  const envelope = {
    schema: 'RuntimeEnvelope/v1',
    kind: 'governed-write',
    operation: 'runtime.write',
    sourceRevision: 'quality-source',
    expectedRevision: 1,
    payload: { operation },
  };
  return { envelope, intent, operationHash, receipt, request, verifiedApproval };
}

function identity() {
  return Object.freeze({
    schema: 'TrustedProjectIdentity/v1',
    source: 'authenticated-context',
    principal: 'principal-1',
    role: 'developer-orchestrator',
    tenant: project.tenant_id,
    project: project.project_id,
    registry_hash: project.registry_hash,
  });
}

function bindings(fixture, overrides = {}) {
  const store =
    overrides.reservationStore ?? createTestOperationReservationStore(repositoryRoot, `quality-store-${sequence}`);
  return {
    repositoryRoot,
    verifyApproval: () => fixture.verifiedApproval,
    authorizeProject: () => ({ decision: 'allow', receipt: fixture.receipt, diagnostics: [] }),
    governancePolicy: loadConfiguredEdictumGovernancePolicy(repositoryRoot, config),
    resolveIdentity: () => identity(),
    resolveProjectContext: () => project,
    casWriter: (_request, context) => ({ applied: true, fencing_token: context.fencing_token }),
    runtimeRevision: () => ({ sourceRevision: 'quality-source', currentRevision: 1 }),
    assertRuntimeConfigCurrent: () => undefined,
    ...Object.fromEntries(Object.entries(overrides).filter(([key]) => key !== 'reservationStore')),
    reservationStore: store,
  };
}

function wrapped(fixture, overrides = {}) {
  return { envelope: { ...fixture.envelope, ...overrides }, intent: fixture.intent };
}

async function expectGovernanceDenied(promise) {
  const error = await promise.then(
    () => null,
    (candidate) => candidate,
  );
  expect(isGovernanceDenied(error)).toBe(true);
}
describe('governed write completeness', () => {
  test('rejects an unsupported flat Edictum sandbox allowlist', () => {
    const unsupported = structuredClone(config);
    unsupported.governance.edictum.sandbox.allowlist = ['workspace'];
    expect(() => compileConfiguredEdictumWorkflow(unsupported)).toThrow(/unsupported Edictum sandbox allowlist/);
  });
  test('classifies only runtime governance denials as denials', () => {
    expect(isGovernanceDenied(null)).toBe(false);
    expect(isGovernanceDenied({ code: 'GAP-GOVERNANCE-DENIED-001' })).toBe(false);
    expect(isGovernanceDenied(new Error('unrelated failure'))).toBe(false);
  });
  test.skipIf(!nativeNoFollowAvailable)(
    'issued kernels and all guard composition adapters enforce trusted bindings',
    async () => {
      const fixture = evidence();
      const configured = bindings(fixture);
      expect(isTrustedGovernanceControlKernel(null)).toBe(false);
      expect(isTrustedGovernanceControlKernel({})).toBe(false);
      const kernel = createCompositionRootControlKernel(configured);
      expect(isTrustedGovernanceControlKernel(kernel)).toBe(true);
      expect(createGovernanceGuard(kernel)).toBeDefined();
      expect(createTestGovernanceGuard(bindings(evidence()))).toBeDefined();
      expect(createCompositionRootGovernanceGuard(bindings(evidence()))).toBeDefined();
      expect(() => createGovernanceGuard({})).toThrow(/control-kernel/);
      expect(() => createCompositionRootControlKernel(null)).toThrow(/bindings/);
      expect(() => createCompositionRootControlKernel({ ...configured, reservationStore: {} })).toThrow(/bindings/);

      const guard = createTestGovernanceGuard(bindings(evidence()));
      expect((await evaluateGovernance(guard, 'runtime.read', null)).decision).toBe('allow');
      expect((await evaluateGovernance(guard, 'runtime.write', {})).decision).toBe('deny');
    },
  );

  test.skipIf(!nativeNoFollowAvailable)(
    'valid governed write consumes Cedar, approval, reservation, CAS, and result evidence once',
    async () => {
      const fixture = evidence();
      const store = createTestOperationReservationStore(repositoryRoot, `quality-store-${sequence}`);
      let context;
      const guard = createTestGovernanceGuard(
        bindings(fixture, {
          reservationStore: store,
          casWriter: (_request, commitContext) => {
            context = commitContext;
            return { applied: true, nested: ['ok', 1] };
          },
        }),
      );
      await expect(runGovernedWrite(guard, wrapped(fixture))).resolves.toEqual({ applied: true, nested: ['ok', 1] });
      expect(context).toMatchObject({
        operation_hash: fixture.operationHash,
        request_digest: expect.stringMatching(/^[a-f0-9]{64}$/),
        source_revision: 'quality-source',
        expected_revision: 1,
      });
      expect(await store.inspect(fixture.operationHash)).toMatchObject({
        status: 'applied',
        result_digest: expect.stringMatching(/^[a-f0-9]{64}$/),
      });
      await expectGovernanceDenied(runGovernedWrite(guard, wrapped(fixture)));
    },
  );

  test.skipIf(!nativeNoFollowAvailable)('rejects configuration drift after reservation commit starts', async () => {
    const fixture = evidence();
    let commitMarked = false;
    let writeCalls = 0;
    const store = createTestOperationReservationStore(repositoryRoot, 'quality-store-' + sequence, () => {
      commitMarked = true;
    });
    const guard = createTestGovernanceGuard(
      bindings(fixture, {
        reservationStore: store,
        assertRuntimeConfigCurrent: () => {
          if (commitMarked) throw new Error('runtime configuration changed after composition');
        },
        casWriter: () => {
          writeCalls += 1;
          return { applied: true };
        },
      }),
    );
    await expect(runGovernedWrite(guard, wrapped(fixture))).rejects.toThrow(
      'runtime configuration changed after composition',
    );
    expect(commitMarked).toBe(true);
    expect(writeCalls).toBe(0);
    expect(await store.inspect(fixture.operationHash)).toMatchObject({ status: 'commit_unknown' });
  });
  test.skipIf(!nativeNoFollowAvailable)('preserves the governed error when reservation cleanup fails', async () => {
    const fixture = evidence();
    let commitMarked = false;
    const store = createTestOperationReservationStore(
      repositoryRoot,
      'quality-store-' + sequence,
      () => {
        commitMarked = true;
      },
      () => {
        throw new Error('reservation cleanup failed');
      },
    );
    const guard = createTestGovernanceGuard(
      bindings(fixture, {
        reservationStore: store,
        assertRuntimeConfigCurrent: () => {
          if (commitMarked) throw new Error('runtime configuration changed after composition');
        },
      }),
    );
    await expect(runGovernedWrite(guard, wrapped(fixture))).rejects.toThrow(
      'runtime configuration changed after composition',
    );
  });
  test.skipIf(!nativeNoFollowAvailable)(
    'leaves commit-unknown when the final fence detects post-CAS drift',
    async () => {
      const fixture = evidence();
      let casReturned = false;
      const store = createTestOperationReservationStore(repositoryRoot, 'quality-store-' + sequence);
      const guard = createTestGovernanceGuard(
        bindings(fixture, {
          reservationStore: store,
          casWriter: () => {
            casReturned = true;
            return { applied: true };
          },
          assertRuntimeConfigCurrent: () => {
            if (casReturned) throw new Error('runtime configuration changed after CAS result');
          },
        }),
      );
      await expect(runGovernedWrite(guard, wrapped(fixture))).rejects.toThrow(
        'runtime configuration changed after CAS result',
      );
      expect(await store.inspect(fixture.operationHash)).toMatchObject({ status: 'commit_unknown' });
    },
  );
  test.skipIf(!nativeNoFollowAvailable)('rejects envelope revision drift before commit begins', async () => {
    const fixture = evidence();
    let revisionCalls = 0;
    let writeCalls = 0;
    const store = createTestOperationReservationStore(repositoryRoot, `quality-store-${sequence}`);
    const guard = createTestGovernanceGuard(
      bindings(fixture, {
        runtimeRevision: () => ({ sourceRevision: 'quality-source', currentRevision: revisionCalls++ === 0 ? 1 : 2 }),
        casWriter: () => {
          writeCalls += 1;
          return { applied: true };
        },
        reservationStore: store,
      }),
    );
    const error = await runGovernedWrite(guard, wrapped(fixture)).then(
      () => null,
      (candidate) => candidate,
    );
    expect(String(error?.message ?? error)).toMatch(/runtime envelope revision changed during governed write/);
    expect(revisionCalls).toBe(2);
    expect(writeCalls).toBe(0);
    expect(await store.inspect(fixture.operationHash)).toMatchObject({ status: 'aborted' });
  });
  test.skipIf(!nativeNoFollowAvailable)('aborts reservation when configuration drifts after reservation', async () => {
    const fixture = evidence();
    let assertions = 0;
    const store = createTestOperationReservationStore(repositoryRoot, `quality-store-${sequence}`);
    const guard = createTestGovernanceGuard(
      bindings(fixture, {
        reservationStore: store,
        assertRuntimeConfigCurrent: () => {
          assertions += 1;
          if (assertions === 6) throw new Error('runtime configuration changed after reservation');
        },
      }),
    );
    await expectGovernanceDenied(runGovernedWrite(guard, wrapped(fixture)));
    expect(assertions).toBe(6);
    expect(await store.inspect(fixture.operationHash)).toMatchObject({ status: 'aborted' });
  });
  test.skipIf(!nativeNoFollowAvailable)(
    'test reservation store reports duplicate reservations and all terminal states',
    async () => {
      const fixture = evidence();
      const store = createTestOperationReservationStore(repositoryRoot, `quality-store-${sequence}`);
      expect(await store.inspect('missing')).toBeNull();
      const first = await store.reserve(fixture.operationHash, fixture.request);
      expect(first).toMatchObject({ status: 'reserved' });
      expect(await store.reserve(fixture.operationHash, fixture.request)).toBeNull();
      await store.markCommitStarted(first);
      expect(await store.inspect(fixture.operationHash)).toMatchObject({ status: 'commit_unknown' });
      await store.complete(first);
      expect(await store.inspect(fixture.operationHash)).toMatchObject({ status: 'applied' });

      const secondFixture = evidence();
      const second = await store.reserve(secondFixture.operationHash, secondFixture.request);
      await store.abort(second);
      expect(await store.inspect(secondFixture.operationHash)).toMatchObject({ status: 'aborted' });
      expect(() => store.complete({ ...second, fencing_token: 'wrong' })).toThrow(/fencing/);
      expect(() => createTestOperationReservationStore(repositoryRoot, '')).toThrow(/id/);
    },
  );

  test.skipIf(!nativeNoFollowAvailable)(
    'preparation rejects malformed wrappers, stale envelopes, missing authorities, and binding drift',
    async () => {
      const cases = [
        [null, {}, /wrapper|denied|governed/i],
        [{}, {}, /wrapper|denied|governed/i],
        ['wrong envelope operation', { operation: 'runtime.read' }, /envelope|denied|governed/i],
        ['wrong envelope kind', { kind: 'read' }, /envelope|denied|governed/i],
        ['stale source', { sourceRevision: 'stale' }, /stale|denied|governed/i],
        ['stale revision', { expectedRevision: 2 }, /stale|denied|governed/i],
      ];
      for (const [label, envelopeOverrides] of cases) {
        const fixture = evidence();
        const guard = createTestGovernanceGuard(bindings(fixture));
        const input = label === null || typeof label === 'object' ? label : wrapped(fixture, envelopeOverrides);
        await expectGovernanceDenied(runGovernedWrite(guard, input));
      }

      const variants = [
        { resolveProjectContext: () => null },
        { resolveIdentity: () => null },
        { authorizeProject: () => ({ decision: 'deny', diagnostics: ['no'] }) },
        { verifyApproval: () => null },
      ];
      for (const overrides of variants) {
        const fixture = evidence();
        const guard = createTestGovernanceGuard(bindings(fixture, overrides));
        await expectGovernanceDenied(runGovernedWrite(guard, wrapped(fixture)));
      }
    },
  );

  test.skipIf(!nativeNoFollowAvailable)(
    'CAS failures and noncanonical results remain commit-unknown and fail closed',
    async () => {
      for (const result of [undefined, Number.NaN, new Error('cas failed')]) {
        const fixture = evidence();
        const store = createTestOperationReservationStore(repositoryRoot, `quality-store-${sequence}`);
        const guard = createTestGovernanceGuard(
          bindings(fixture, {
            reservationStore: store,
            casWriter: () => {
              if (result instanceof Error) throw result;
              return result;
            },
          }),
        );
        await expect(runGovernedWrite(guard, wrapped(fixture))).rejects.toBeDefined();
        expect(await store.inspect(fixture.operationHash)).toMatchObject({ status: 'commit_unknown' });
      }
    },
  );

  test.skipIf(!nativeNoFollowAvailable)('failed reservation transition aborts before any commit begins', async () => {
    const abortFixture = evidence();
    const abortStore = createTestOperationReservationStore(repositoryRoot, 'quality-store-' + sequence, () => {
      throw new Error('transition unavailable');
    });
    const abortGuard = createTestGovernanceGuard(bindings(abortFixture, { reservationStore: abortStore }));
    await expect(runGovernedWrite(abortGuard, wrapped(abortFixture))).rejects.toThrow(/transition unavailable/);
    expect(await abortStore.inspect(abortFixture.operationHash)).toMatchObject({ status: 'aborted' });
  });

  test.skipIf(!nativeNoFollowAvailable)(
    'durable reservation store persists every legal transition and rejects replay',
    async () => {
      const temporaryRoot = mkdtempSync(path.join(os.tmpdir(), 'agent-runtime-reservations-'));
      try {
        const reservationRoot = path.join(temporaryRoot, 'reservations');
        const store = await createFileOperationReservationStore(reservationRoot, 'quality-durable');
        const firstFixture = evidence();
        expect(store.scope).toBe('file-durable');
        expect(await store.inspect(firstFixture.operationHash)).toBeNull();
        const first = await store.reserve(firstFixture.operationHash, firstFixture.request);
        expect(first).toMatchObject({ operation_key: firstFixture.operationHash, status: 'reserved' });
        expect(await store.reserve(firstFixture.operationHash, firstFixture.request)).toBeNull();
        await store.markCommitStarted(first);
        await store.markCommitStarted(first);
        expect(await store.inspect(firstFixture.operationHash)).toMatchObject({ status: 'commit_unknown' });
        await store.complete(first, 'a'.repeat(64));
        await store.complete(first, 'a'.repeat(64));
        expect(await store.inspect(firstFixture.operationHash)).toMatchObject({
          status: 'applied',
          result_digest: 'a'.repeat(64),
        });
        await expect(store.abort(first)).rejects.toThrow(/abort|transition/);
        await expect(store.complete(first, 'b'.repeat(64))).rejects.toThrow(/digest|conflict/);
        await expect(store.abort({ ...first, operation_key: 'missing-operation' })).rejects.toThrow(/missing/);

        const secondFixture = evidence();
        const second = await store.reserve(secondFixture.operationHash, secondFixture.request);
        await store.abort(second);
        await store.abort(second);
        expect(await store.inspect(secondFixture.operationHash)).toMatchObject({ status: 'aborted' });
        await expect(store.markCommitStarted(second)).rejects.toThrow(/transition/);

        const concurrentFixture = evidence();
        const concurrent = await store.reserve(concurrentFixture.operationHash, concurrentFixture.request);
        await Promise.all([store.markCommitStarted(concurrent), store.markCommitStarted(concurrent)]);
        expect(await store.inspect(concurrentFixture.operationHash)).toMatchObject({ status: 'commit_unknown' });
        expect(store.inspect('bad-key')).toBeNull();
        await expect(createFileOperationReservationStore(reservationRoot, '')).rejects.toThrow(/store id/);
        const blockedFixture = evidence();
        const blocked = await store.reserve(blockedFixture.operationHash, blockedFixture.request);
        expect(store.inspect(blockedFixture.operationHash)).toMatchObject({ status: 'reserved' });
        rmSync(reservationRoot, { recursive: true, force: true });
        writeFileSync(reservationRoot, 'blocked', 'utf8');
        expect(store.inspect(blockedFixture.operationHash)).toBeNull();
        await expect(store.markCommitStarted(blocked)).rejects.toBeDefined();
      } finally {
        rmSync(temporaryRoot, { recursive: true, force: true });
      }
    },
  );
});
