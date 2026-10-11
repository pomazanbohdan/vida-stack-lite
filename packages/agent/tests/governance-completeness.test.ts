import { afterAll, describe, expect, test } from 'bun:test';
import path from 'node:path';
import os from 'node:os';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { initializeProject } from '../bin/init.ts';
import {
  buildGovernedWriteRequest,
  computeWriteOperationHash,
  loadProjectContext,
  loadRuntimeConfig,
} from '../src/index.ts';
import { toAuthorizationReceipt } from '../src/contracts/public-ingress.ts';
import type {
  GovernedWriteIntent,
  TrustedProjectIdentity,
  VerifiedApprovalEvidence,
} from '../src/contracts/public-ingress.ts';
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
import type { GovernanceBindings } from '../src/governance/edictum-boundary.ts';
import { nativeNoFollowAvailable } from '../src/config/host-capability.ts';
const repositoryRoot = await createInitializedRepositoryRoot();
const config = loadRuntimeConfig(repositoryRoot);
const selectedProject = config.projects[0];
if (selectedProject === undefined) throw new Error('initialized governance fixture has no project');
const project = loadProjectContext(repositoryRoot, config, config.repository.repository_id, selectedProject.project_id);
const projectBinding = project.project_bindings.find((binding) => binding.project_id === selectedProject.project_id);
if (projectBinding === undefined) throw new Error('test project binding is missing');
const projectId = projectBinding.project_id;
const tenantId = projectBinding.integration_binding.tenant_id;
let sequence = 0;

// Install cleanup only after full fixture initialization and binding. Bun runs
// this after suite callbacks settle; partial initialization failures retain the root.
afterAll(async () => {
  await rm(repositoryRoot, { recursive: true, force: true });
});

async function createInitializedRepositoryRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'agent-runtime-governance-'));
  await mkdir(path.join(root, '.git'), { recursive: true });
  await initializeProject({
    projectRoot: root,
    repository: 'governance-completeness-fixture',
    projectMappings: ['governance=.'],
  });
  return root;
}

function evidence() {
  sequence += 1;
  const operation = 'repository.write';
  const payload = { path: `agent-runtime-new/quality-${sequence}.txt`, value: 'updated' };
  const authorization = {
    principal: 'principal-1',
    role: 'developer-orchestrator',
    action: 'write',
    tenant: tenantId,
    project: projectId,
    resourceTenant: tenantId,
    resourceProject: projectId,
    registryHash: project.registry_hash,
  } satisfies GovernedWriteIntent['authorization'];
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
    tenant: tenantId,
    project: projectId,
    operation_hash: operationHash,
    approved_at: approvedAt,
    expires_at: new Date(Date.now() + 60_000).toISOString(),
  } satisfies GovernedWriteIntent['approval'];
  const intent: GovernedWriteIntent = { operation, payload, authorization, approval };
  const receipt = toAuthorizationReceipt({ ...authorization, operationHash }, `decision-${sequence}`, approvedAt);
  if (receipt === undefined) throw new Error('test authorization receipt could not be created');
  const verifiedApproval = {
    ...approval,
    verified: true,
    issuer: 'test-authority',
    verification_id: `verification-${sequence}`,
    verified_at: approvedAt,
  } satisfies VerifiedApprovalEvidence;
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

function identity(): TrustedProjectIdentity {
  return Object.freeze({
    schema: 'TrustedProjectIdentity/v1',
    source: 'authenticated-context',
    principal: 'principal-1',
    role: 'developer-orchestrator',
    tenant: tenantId,
    project: projectId,
    registry_hash: project.registry_hash,
  });
}

function bindings(
  fixture: ReturnType<typeof evidence>,
  overrides: Partial<GovernanceBindings> = {},
): GovernanceBindings {
  // These canned boundary responses exercise orchestration only; they do not
  // prove physical Cedar or approval authority, or a database write effect.
  const { reservationStore, ...bindingOverrides } = overrides;
  const store = reservationStore ?? createTestOperationReservationStore(repositoryRoot, `quality-store-${sequence}`);
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
    ...bindingOverrides,
    reservationStore: store,
  };
}

function wrapped(fixture: ReturnType<typeof evidence>, overrides: Record<string, unknown> = {}) {
  return { envelope: { ...fixture.envelope, ...overrides }, intent: fixture.intent };
}

async function expectGovernanceDenied(promise: Promise<unknown>): Promise<void> {
  const error: unknown = await promise.then(
    () => null,
    (candidate: unknown) => candidate,
  );
  expect(isGovernanceDenied(error)).toBe(true);
}

function callWithMalformedArgument<Target extends (...arguments_: never[]) => unknown>(
  target: Target,
  argument: unknown,
): unknown {
  return Reflect.apply(target, undefined, [argument]);
}

describe('governed write completeness', () => {
  test('rejects an unsupported flat Edictum sandbox allowlist', () => {
    const unsupported = {
      ...config,
      governance: {
        ...config.governance,
        edictum: {
          ...config.governance.edictum,
          sandbox: { ...config.governance.edictum.sandbox, allowlist: ['workspace'] },
        },
      },
    };
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
      expect(() => callWithMalformedArgument(createGovernanceGuard, {})).toThrow(/control-kernel/);
      expect(() => callWithMalformedArgument(createCompositionRootControlKernel, null)).toThrow(/bindings/);
      expect(() =>
        callWithMalformedArgument(createCompositionRootControlKernel, { ...configured, reservationStore: {} }),
      ).toThrow(/bindings/);

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
      let context: Parameters<GovernanceBindings['casWriter']>[1] | undefined;
      const guard = createTestGovernanceGuard(
        bindings(fixture, {
          reservationStore: store,
          casWriter: (_request, commitContext) => {
            context = commitContext;
            return { applied: true, nested: ['ok', 1] };
          },
        }),
      );
      await Promise.resolve(
        expect(runGovernedWrite(guard, wrapped(fixture))).resolves.toEqual({ applied: true, nested: ['ok', 1] }),
      );
      if (context === undefined) throw new Error('CAS commit context was not captured');
      expect(context.operation_hash).toBe(fixture.operationHash);
      expect(context.request_digest).toMatch(/^[a-f0-9]{64}$/);
      expect(context.source_revision).toBe('quality-source');
      expect(context.expected_revision).toBe(1);
      const completedReservation = await store.inspect(fixture.operationHash);
      if (completedReservation === null) throw new Error('completed reservation is missing');
      expect(completedReservation.status).toBe('applied');
      expect(completedReservation.result_digest).toMatch(/^[a-f0-9]{64}$/);
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
    await Promise.resolve(
      expect(runGovernedWrite(guard, wrapped(fixture))).rejects.toThrow(
        'runtime configuration changed after composition',
      ),
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
    await Promise.resolve(
      expect(runGovernedWrite(guard, wrapped(fixture))).rejects.toThrow(
        'runtime configuration changed after composition',
      ),
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
      await Promise.resolve(
        expect(runGovernedWrite(guard, wrapped(fixture))).rejects.toThrow(
          'runtime configuration changed after CAS result',
        ),
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
    const error: unknown = await runGovernedWrite(guard, wrapped(fixture)).then(
      () => null,
      (candidate: unknown) => candidate,
    );
    const errorMessage = error instanceof Error ? error.message : String(error);
    expect(errorMessage).toMatch(/runtime envelope revision changed during governed write/);
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
      if (first === null) throw new Error('reservation was not created');
      await store.markCommitStarted(first);
      expect(await store.inspect(fixture.operationHash)).toMatchObject({ status: 'commit_unknown' });
      await store.complete(first);
      expect(await store.inspect(fixture.operationHash)).toMatchObject({ status: 'applied' });

      const secondFixture = evidence();
      const second = await store.reserve(secondFixture.operationHash, secondFixture.request);
      if (second === null) throw new Error('second reservation was not created');
      await store.abort(second);
      expect(await store.inspect(secondFixture.operationHash)).toMatchObject({ status: 'aborted' });
      expect(() => store.complete({ ...second, fencing_token: 'wrong' })).toThrow(/fencing/);
      expect(() => createTestOperationReservationStore(repositoryRoot, '')).toThrow(/id/);
    },
  );

  test.skipIf(!nativeNoFollowAvailable)(
    'preparation rejects malformed wrappers, stale envelopes, missing authorities, and binding drift',
    async () => {
      const cases: readonly (readonly [unknown, Record<string, unknown>, RegExp])[] = [
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

      const variants: readonly Partial<GovernanceBindings>[] = [
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
        await Promise.resolve(expect(runGovernedWrite(guard, wrapped(fixture))).rejects.toBeDefined());
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
    await Promise.resolve(
      expect(runGovernedWrite(abortGuard, wrapped(abortFixture))).rejects.toThrow(/transition unavailable/),
    );
    expect(await abortStore.inspect(abortFixture.operationHash)).toMatchObject({ status: 'aborted' });
  });

  test.skipIf(!nativeNoFollowAvailable)(
    'durable reservation store persists every legal transition and rejects replay',
    async () => {
      const temporaryRoot = mkdtempSync(path.join(os.tmpdir(), 'agent-runtime-reservations-'));
      let safeToCleanup = false;
      try {
        const reservationRoot = path.join(temporaryRoot, 'reservations');
        const store = await createFileOperationReservationStore(reservationRoot, 'quality-durable');
        const firstFixture = evidence();
        expect(store.scope).toBe('file-durable');
        expect(await store.inspect(firstFixture.operationHash)).toBeNull();
        const first = await store.reserve(firstFixture.operationHash, firstFixture.request);
        expect(first).toMatchObject({ operation_key: firstFixture.operationHash, status: 'reserved' });
        expect(await store.reserve(firstFixture.operationHash, firstFixture.request)).toBeNull();
        if (first === null) throw new Error('first durable reservation was not created');
        await store.markCommitStarted(first);
        await store.markCommitStarted(first);
        expect(await store.inspect(firstFixture.operationHash)).toMatchObject({ status: 'commit_unknown' });
        await store.complete(first, 'a'.repeat(64));
        await store.complete(first, 'a'.repeat(64));
        expect(await store.inspect(firstFixture.operationHash)).toMatchObject({
          status: 'applied',
          result_digest: 'a'.repeat(64),
        });
        await Promise.resolve(expect(store.abort(first)).rejects.toThrow(/abort|transition/));
        await Promise.resolve(expect(store.complete(first, 'b'.repeat(64))).rejects.toThrow(/digest|conflict/));
        await Promise.resolve(
          expect(store.abort({ ...first, operation_key: 'missing-operation' })).rejects.toThrow(/missing/),
        );

        const secondFixture = evidence();
        const second = await store.reserve(secondFixture.operationHash, secondFixture.request);
        if (second === null) throw new Error('second durable reservation was not created');
        await store.abort(second);
        await store.abort(second);
        expect(await store.inspect(secondFixture.operationHash)).toMatchObject({ status: 'aborted' });
        await Promise.resolve(expect(store.markCommitStarted(second)).rejects.toThrow(/transition/));

        const concurrentFixture = evidence();
        const concurrent = await store.reserve(concurrentFixture.operationHash, concurrentFixture.request);
        if (concurrent === null) throw new Error('concurrent durable reservation was not created');
        await Promise.all([store.markCommitStarted(concurrent), store.markCommitStarted(concurrent)]);
        expect(await store.inspect(concurrentFixture.operationHash)).toMatchObject({ status: 'commit_unknown' });
        // This direct store fixture has no external effect; settle its synthetic outcome explicitly.
        await store.complete(concurrent, 'c'.repeat(64));
        expect(await store.inspect(concurrentFixture.operationHash)).toMatchObject({
          status: 'applied',
          result_digest: 'c'.repeat(64),
        });
        expect(store.inspect('bad-key')).toBeNull();
        await Promise.resolve(
          expect(createFileOperationReservationStore(reservationRoot, '')).rejects.toThrow(/store id/),
        );
        const blockedFixture = evidence();
        const blocked = await store.reserve(blockedFixture.operationHash, blockedFixture.request);
        if (blocked === null) throw new Error('blocked durable reservation was not created');
        expect(store.inspect(blockedFixture.operationHash)).toMatchObject({ status: 'reserved' });
        await store.abort(blocked);
        expect(await store.inspect(blockedFixture.operationHash)).toMatchObject({ status: 'aborted' });

        const brokenReservationRoot = path.join(temporaryRoot, 'broken', 'reservations');
        await mkdir(path.dirname(brokenReservationRoot));
        const brokenRootStore = await createFileOperationReservationStore(brokenReservationRoot, 'quality-broken');
        const brokenFixture = evidence();
        const brokenReservation = await brokenRootStore.reserve(brokenFixture.operationHash, brokenFixture.request);
        if (brokenReservation === null) throw new Error('broken-root reservation was not created');
        await brokenRootStore.abort(brokenReservation);
        expect(await brokenRootStore.inspect(brokenFixture.operationHash)).toMatchObject({ status: 'aborted' });
        rmSync(brokenReservationRoot, { recursive: true, force: true });
        writeFileSync(brokenReservationRoot, 'blocked', 'utf8');
        let inspectionError: unknown;
        try {
          await brokenRootStore.inspect(brokenFixture.operationHash);
        } catch (error) {
          inspectionError = error;
        }
        expect(inspectionError).toMatchObject({ code: 'ENOTDIR' });
        await Promise.resolve(
          expect(brokenRootStore.markCommitStarted(brokenReservation)).rejects.toMatchObject({ code: 'ENOTDIR' }),
        );
        safeToCleanup = true;
      } finally {
        if (safeToCleanup) {
          console.error(`reservation fixture cleanup starting: ${temporaryRoot}`);
          rmSync(temporaryRoot, { recursive: true, force: true });
          console.error(`reservation fixture cleanup completed: ${temporaryRoot}`);
        } else {
          console.error(`reservation fixture retained after failed or unresolved outcome: ${temporaryRoot}`);
        }
      }
    },
  );
});
