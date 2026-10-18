import { afterAll, describe, expect, mock, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import path from 'node:path';
import os from 'node:os';
import { lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { initializeProject } from '../bin/init.ts';
import {
  buildGovernedWriteRequest,
  computeWriteOperationHash,
  loadProjectContext,
  loadRuntimeConfig,
} from '../src/index.ts';
import { toAuthorizationReceipt } from '../src/contracts/public-ingress.ts';
import { computeGovernedWriteRequestDigest } from '../src/contracts/public-ingress.ts';
import { GovernanceDenied, OperationPolicyGuard, PolicySession } from '../src/governance/operation-policy.js';
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
  createHostOperationReservationStore,
  createGovernanceGuard,
  createTestGovernanceGuard,
  createTestOperationReservationStore,
  evaluateGovernance,
  isGovernanceDenied,
  isTrustedGovernanceControlKernel,
  loadConfiguredEdictumGovernancePolicy,
  runGovernedWrite,
  validateHostOperationReservation,
} from '../src/governance/edictum-boundary.ts';
import type { GovernanceBindings } from '../src/governance/edictum-boundary.ts';
import { HostStateStore } from '../src/host-state.ts';
import { completeOwnedCleanup } from '../tooling/owned-cleanup-completion.ts';
import { withWorkspaceDatabaseCloseAsync } from '../src/config/workspace-database-raw.ts';
import { nativeNoFollowAvailable } from '../src/config/host-capability.ts';
import { expectAsyncReturned, expectRejection, expectReturned } from './helpers/expect-rejection.ts';
import * as repositoryAccess from '../src/config/safe-repository-access.ts';
const originalRepositoryAccess = Object.freeze({ ...repositoryAccess });
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
  test('policy session counters stay isolated and the operation guard records post-effect failures', async () => {
    const session = new PolicySession('counter-session');
    const peerSession = new PolicySession('peer-counter-session');
    expect(await session.getValue('cursor')).toBeNull();
    await session.setValue('cursor', 'first');
    expect(await session.getValue('cursor')).toBe('first');
    await session.deleteValue('cursor');
    expect(await session.getValue('cursor')).toBeNull();
    expect(await session.incrementAttempts()).toBe(1);
    expect(await session.incrementAttempts()).toBe(2);
    await session.recordExecution('runtime.read', false);
    expect(await session.executionCount()).toBe(1);
    expect(await session.toolExecutionCount('runtime.read')).toBe(1);
    expect(await session.consecutiveFailures()).toBe(1);
    await session.recordExecution('runtime.read', true);
    expect(await session.consecutiveFailures()).toBe(0);
    expect(await peerSession.attemptCount()).toBe(0);
    expect(await peerSession.executionCount()).toBe(0);
    expect(await session.batchGetCounters()).toEqual({ attempts: 2, execs: 2, consec_fail: 0 });
    expect(await session.batchGetCounters({ includeTool: 'runtime.read' })).toEqual({
      attempts: 2,
      execs: 2,
      consec_fail: 0,
      'tool:runtime.read': 2,
    });

    const guard = new OperationPolicyGuard(
      {
        policyVersion: 'test-v1',
        maxAttempts: 5,
        maxToolCalls: 5,
        maxCallsPerTool: { 'runtime.read': 3 },
        tools: { 'runtime.read': { side_effect: 'read', idempotent: true } },
      },
      () => undefined,
    );
    expect((await guard.evaluate('runtime.read', {})).decision).toBe('allow');
    expect((await guard.evaluate('runtime.write', {})).decision).toBe('deny');
    await expectRejection(guard.evaluate('invalid/name', {}), /tool name is invalid/);

    const args = { value: 'captured-before-effect' };
    const completed = guard.run('runtime.read', args, async (snapshot) => {
      expect(Object.isFrozen(snapshot)).toBe(true);
      return { accepted: snapshot.value };
    });
    args.value = 'caller-mutated-after-admission';
    expect(await expectAsyncReturned(() => completed)).toEqual({ accepted: 'captured-before-effect' });

    for (const { result, expectedMessage } of [
      { result: { is_error: true, message: 'tool denied' }, expectedMessage: '[object Object]' },
      { result: 'fatal: tool failed', expectedMessage: 'fatal: tool failed' },
    ]) {
      const error: unknown = await guard
        .run('runtime.read', {}, () => result)
        .then(
          () => null,
          (candidate: unknown) => candidate,
        );
      expect(error).toMatchObject({ name: 'EdictumToolError', message: expectedMessage });
    }
    const limited: unknown = await guard
      .run('runtime.read', {}, () => ({ accepted: true }))
      .then(
        () => null,
        (candidate: unknown) => candidate,
      );
    expect(limited).toMatchObject({ name: 'EdictumDenied', decisionSource: 'operation_limit' });
  });

  test('operation policy limits preserve pre-effect denial and reserve concurrent tool capacity', async () => {
    expect(new GovernanceDenied('denied')).toMatchObject({
      name: 'EdictumDenied',
      reason: 'denied',
      decisionSource: null,
      decisionName: null,
    });
    const counters = new PolicySession('unknown-tool-counter');
    expect(await counters.batchGetCounters({ includeTool: 'never-executed' })).toEqual({
      attempts: 0,
      execs: 0,
      consec_fail: 0,
      'tool:never-executed': 0,
    });

    const validationFailure: unknown = 'write arguments are malformed';
    const writeValidation = new OperationPolicyGuard(
      {
        policyVersion: 'write-validation-v1',
        maxAttempts: 2,
        maxToolCalls: 2,
        maxCallsPerTool: {},
        tools: { 'runtime.write': { side_effect: 'write', idempotent: false } },
      },
      () => {
        throw validationFailure;
      },
    );
    expect(await expectAsyncReturned(() => writeValidation.evaluate('runtime.write', {}))).toMatchObject({
      decision: 'deny',
      rules: [{ passed: false, message: 'write arguments are malformed' }],
    });
    let unconfiguredEffectCalls = 0;
    const unconfiguredError: unknown = await writeValidation
      .run('runtime.read', {}, () => {
        unconfiguredEffectCalls += 1;
        return { accepted: true };
      })
      .then(
        () => null,
        (error: unknown) => error,
      );
    expect(unconfiguredError).toMatchObject({ name: 'EdictumDenied', decisionSource: 'precondition' });
    expect(unconfiguredEffectCalls).toBe(0);

    const uncappedTool = new OperationPolicyGuard(
      {
        policyVersion: 'uncapped-tool-v1',
        maxAttempts: 3,
        maxToolCalls: 2,
        maxCallsPerTool: {},
        tools: { 'runtime.read': { side_effect: 'read', idempotent: true } },
      },
      () => undefined,
    );
    expect(await expectAsyncReturned(() => uncappedTool.run('runtime.read', {}, () => ({ count: 1 })))).toEqual({
      count: 1,
    });
    expect(await expectAsyncReturned(() => uncappedTool.run('runtime.read', {}, () => ({ count: 2 })))).toEqual({
      count: 2,
    });

    const attemptLimited = new OperationPolicyGuard(
      {
        policyVersion: 'attempt-limit-v1',
        maxAttempts: 2,
        maxToolCalls: 5,
        maxCallsPerTool: {},
        tools: { 'runtime.read': { side_effect: 'read', idempotent: true } },
      },
      () => undefined,
    );
    // Preparation denials consume attempts under either interpretation of the
    // equality boundary; the following tool call is strictly beyond the limit.
    for (let index = 0; index < 2; index += 1) {
      const preparationError = new GovernanceDenied('preparation denied', 'precondition', 'preparation');
      const denied: unknown = await attemptLimited.rejectPreparation(preparationError).then(
        () => null,
        (error: unknown) => error,
      );
      expect(denied).toBeInstanceOf(GovernanceDenied);
    }
    let deniedEffectCalls = 0;
    const attemptError: unknown = await attemptLimited
      .run('runtime.read', {}, () => {
        deniedEffectCalls += 1;
        return { accepted: true };
      })
      .then(
        () => null,
        (error: unknown) => error,
      );
    expect(attemptError).toMatchObject({ name: 'EdictumDenied', decisionSource: 'attempt_limit' });
    expect(deniedEffectCalls).toBe(0);

    const globalLimited = new OperationPolicyGuard(
      {
        policyVersion: 'global-limit-v1',
        maxAttempts: 5,
        maxToolCalls: 1,
        maxCallsPerTool: { 'runtime.read': 1 },
        tools: { 'runtime.read': { side_effect: 'read', idempotent: true } },
      },
      () => undefined,
    );
    let globalEffects = 0;
    const globalEffect = () => {
      globalEffects += 1;
      return { accepted: true };
    };
    expect(await expectAsyncReturned(() => globalLimited.run('runtime.read', {}, globalEffect))).toEqual({
      accepted: true,
    });
    const globalError: unknown = await globalLimited.run('runtime.read', {}, globalEffect).then(
      () => null,
      (error: unknown) => error,
    );
    expect(globalError).toMatchObject({ name: 'EdictumDenied', decisionName: 'max_tool_calls' });
    expect(globalEffects).toBe(1);

    const concurrentLimit = new OperationPolicyGuard(
      {
        policyVersion: 'concurrent-limit-v1',
        maxAttempts: 5,
        maxToolCalls: 2,
        maxCallsPerTool: { 'runtime.read': 1 },
        tools: { 'runtime.read': { side_effect: 'read', idempotent: true } },
      },
      () => undefined,
    );
    let enterEffect: () => void = () => undefined;
    let releaseEffect: () => void = () => undefined;
    const effectEntered = new Promise<void>((resolve) => {
      enterEffect = resolve;
    });
    const effectReleased = new Promise<void>((resolve) => {
      releaseEffect = resolve;
    });
    const first = concurrentLimit.run('runtime.read', {}, async () => {
      enterEffect();
      await effectReleased;
      return { accepted: true };
    });
    let deniedConcurrentEffects = 0;
    await withWorkspaceDatabaseCloseAsync(
      first,
      async () => {
        const entered = await Promise.race([effectEntered.then(() => true), first.then(() => false)]);
        expect(entered).toBe(true);
        const concurrentError: unknown = await concurrentLimit
          .run('runtime.read', {}, () => {
            deniedConcurrentEffects += 1;
            return { accepted: true };
          })
          .then(
            () => null,
            (error: unknown) => error,
          );
        expect(concurrentError).toMatchObject({
          name: 'EdictumDenied',
          decisionName: 'max_calls_per_tool:runtime.read',
        });
        expect(deniedConcurrentEffects).toBe(0);
      },
      async (pending) => {
        releaseEffect();
        expect(await expectAsyncReturned(() => pending)).toEqual({ accepted: true });
      },
      'Concurrent admission assertion and pending effect completion failed',
    );
  });

  test('rejects a stale config snapshot when loading the configured Edictum policy', () => {
    const matching = expectReturned(() => loadConfiguredEdictumGovernancePolicy(repositoryRoot, config));
    expect(matching.policyVersion).toBe(config.governance.edictum.policy_version);
    const stale = { ...config, config_revision: config.config_revision + 1 };
    expect(() => loadConfiguredEdictumGovernancePolicy(repositoryRoot, stale)).toThrow(
      'Edictum policy config snapshot is stale',
    );
    expect(loadRuntimeConfig(repositoryRoot).config_revision).toBe(config.config_revision);
  });
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
  test.skipIf(!nativeNoFollowAvailable)(
    'retains commit-unknown without abort after post-start configuration drift',
    async () => {
      const fixture = evidence();
      let commitMarked = false;
      let abortCalls = 0;
      let writeCalls = 0;
      const store = createTestOperationReservationStore(
        repositoryRoot,
        'quality-store-' + sequence,
        () => {
          commitMarked = true;
        },
        () => {
          abortCalls += 1;
          throw new Error('reservation cleanup failed');
        },
      );
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
      expect(abortCalls).toBe(0);
      expect(writeCalls).toBe(0);
      expect(await store.inspect(fixture.operationHash)).toMatchObject({ status: 'commit_unknown' });
    },
  );
  test.skipIf(!nativeNoFollowAvailable)(
    'reports post-reservation preparation cleanup failure with both causes and retains the reservation',
    async () => {
      const fixture = evidence();
      const originalError = new Error('runtime configuration changed after reservation');
      const cleanupError = new Error('reservation abort cleanup failed');
      let configAssertions = 0;
      let abortCalls = 0;
      let writeCalls = 0;
      const store = createTestOperationReservationStore(
        repositoryRoot,
        'quality-store-' + sequence,
        () => undefined,
        () => {
          abortCalls += 1;
          throw cleanupError;
        },
      );
      const guard = createTestGovernanceGuard(
        bindings(fixture, {
          reservationStore: store,
          assertRuntimeConfigCurrent: () => {
            configAssertions += 1;
            if (configAssertions === 6) throw originalError;
          },
          casWriter: () => {
            writeCalls += 1;
            return { applied: true };
          },
        }),
      );

      const error: unknown = await runGovernedWrite(guard, wrapped(fixture)).then(
        () => null,
        (candidate: unknown) => candidate,
      );
      expect(isGovernanceDenied(error)).toBe(true);
      if (!isGovernanceDenied(error)) throw new Error('preparation cleanup failure was not a governance denial');
      expect(error.reason).toBe('governed write reservation cleanup failed; retain the current operation');
      expect(error.decisionSource).toBe('preparation');
      expect(error.decisionName).toBe('cleanup');
      expect(error.cause).toBeInstanceOf(AggregateError);
      if (!(error.cause instanceof AggregateError)) throw new Error('preparation cleanup causes were not retained');
      expect(error.cause.errors).toEqual([originalError, cleanupError]);
      expect(error.cause.errors[0]).toBe(originalError);
      expect(error.cause.errors[1]).toBe(cleanupError);
      expect(configAssertions).toBe(6);
      expect(abortCalls).toBe(1);
      expect(writeCalls).toBe(0);
      expect(await store.inspect(fixture.operationHash)).toMatchObject({ status: 'reserved' });
    },
  );
  test.skipIf(!nativeNoFollowAvailable)(
    'reports execution revision cleanup failure with both causes and retains the reservation',
    async () => {
      const fixture = evidence();
      const originalError = new Error('runtime revision unavailable before commit');
      const cleanupError = new Error('reservation abort cleanup failed');
      let revisionCalls = 0;
      let abortCalls = 0;
      let writeCalls = 0;
      const store = createTestOperationReservationStore(
        repositoryRoot,
        'quality-store-' + sequence,
        () => undefined,
        () => {
          abortCalls += 1;
          throw cleanupError;
        },
      );
      const guard = createTestGovernanceGuard(
        bindings(fixture, {
          reservationStore: store,
          runtimeRevision: () => {
            revisionCalls += 1;
            if (revisionCalls === 2) throw originalError;
            return { sourceRevision: 'quality-source', currentRevision: 1 };
          },
          casWriter: () => {
            writeCalls += 1;
            return { applied: true };
          },
        }),
      );

      const error: unknown = await runGovernedWrite(guard, wrapped(fixture)).then(
        () => null,
        (candidate: unknown) => candidate,
      );
      expect(isGovernanceDenied(error)).toBe(true);
      if (!isGovernanceDenied(error)) throw new Error('execution cleanup failure was not a governance denial');
      expect(error.reason).toBe('governed write reservation cleanup failed; retain the current operation');
      expect(error.decisionSource).toBe('preparation');
      expect(error.decisionName).toBe('cleanup');
      expect(error.cause).toBeInstanceOf(AggregateError);
      if (!(error.cause instanceof AggregateError)) throw new Error('execution cleanup causes were not retained');
      expect(error.cause.errors).toEqual([originalError, cleanupError]);
      expect(error.cause.errors[0]).toBe(originalError);
      expect(error.cause.errors[1]).toBe(cleanupError);
      expect(revisionCalls).toBe(2);
      expect(abortCalls).toBe(1);
      expect(writeCalls).toBe(0);
      expect(await store.inspect(fixture.operationHash)).toMatchObject({ status: 'reserved' });
    },
  );
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
      const defaultStore = createTestOperationReservationStore(repositoryRoot);
      expect(defaultStore.store_id).toBe('test-governed-writes');
      const defaultFixture = evidence();
      const defaultReservation = await defaultStore.reserve(defaultFixture.operationHash, defaultFixture.request);
      if (defaultReservation === null) throw new Error('default test reservation was not created');
      expect(defaultReservation).toMatchObject({ store_id: 'test-governed-writes', status: 'reserved' });
      await defaultStore.abort(defaultReservation);
      expect(await defaultStore.inspect(defaultFixture.operationHash)).toMatchObject({ status: 'aborted' });
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

  test('HostState reservation adapter persists native reservation transitions across reopen', async () => {
    const caseDeadline = performance.now() + 5_000;
    const temporaryRoot = mkdtempSync(path.join(os.tmpdir(), 'agent-runtime-host-reservation-'));
    const openDatabases = new Set<Database>();
    const closeAttempted = new Set<Database>();
    let bodyFailure: { readonly error: unknown } | undefined;
    let caseSucceeded = false;

    try {
      const databasePath = path.join(temporaryRoot, 'governance.sqlite');
      const workspaceId = 'a'.repeat(64);
      const database = new Database(databasePath, { create: true, strict: true });
      openDatabases.add(database);
      database.exec('PRAGMA journal_mode=DELETE');
      database.exec('PRAGMA synchronous=FULL');
      const host = new HostStateStore(database, workspaceId);
      const storeId = 'native-reservation-test';
      const store = createHostOperationReservationStore(host.governanceCapability, storeId);
      const defaultStore = createHostOperationReservationStore(host.governanceCapability);
      const otherStore = createHostOperationReservationStore(host.governanceCapability, 'other-reservation-test');
      const firstFixture = evidence();

      expect(store.scope).toBe('host-sqlite');
      expect(defaultStore.store_id).toBe('candidate-governed-writes');

      // This uses real HostState SQLite reservation transitions at the public guard boundary.
      // The Cedar and approval callbacks remain test controls; this does not prove external authority
      // or a database write performed by the callback.
      const guardedFixture = evidence();
      let guardedWriteCalls = 0;
      const guard = createTestGovernanceGuard(
        bindings(guardedFixture, {
          reservationStore: defaultStore,
          casWriter: (_request, context) => {
            guardedWriteCalls += 1;
            return { applied: true, fencing_token: context.fencing_token };
          },
        }),
      );
      await Promise.resolve(
        expect(runGovernedWrite(guard, wrapped(guardedFixture))).resolves.toMatchObject({ applied: true }),
      );
      expect(guardedWriteCalls).toBe(1);
      const guardedReservation = await defaultStore.inspect(guardedFixture.operationHash);
      if (guardedReservation === null) throw new Error('guarded HostState reservation is missing');
      expect(expectReturned(() => validateHostOperationReservation(guardedReservation))).toEqual(guardedReservation);
      expect(guardedReservation).toMatchObject({ status: 'applied', store_id: 'candidate-governed-writes' });

      expect(await store.inspect(firstFixture.operationHash)).toBeNull();
      const first = await store.reserve(firstFixture.operationHash, firstFixture.request);
      if (first === null) throw new Error('native reservation was not created');
      expect(expectReturned(() => validateHostOperationReservation(first))).toEqual(first);
      for (const storeId of [123, true, null, undefined, {}, ['store']])
        expect(() => validateHostOperationReservation({ ...first, store_id: storeId })).toThrow(
          'durable reservation record is invalid',
        );
      let revisionCoercions = 0;
      const nonNumericRevision = {
        valueOf: () => {
          revisionCoercions++;
          return 1;
        },
      };
      expect(() => validateHostOperationReservation({ ...first, revision: nonNumericRevision })).toThrow(
        'durable reservation record is invalid',
      );
      expect(revisionCoercions).toBe(0);
      expect(first).toMatchObject({
        store_id: storeId,
        operation_key: firstFixture.operationHash,
        request_digest: computeGovernedWriteRequestDigest(firstFixture.request),
        status: 'reserved',
      });
      expect(await store.reserve(firstFixture.operationHash, firstFixture.request)).toBeNull();
      expect(await store.inspect(firstFixture.operationHash)).toEqual(first);

      expect(() => otherStore.markCommitStarted(first)).toThrow(/different store/);
      expect(() => {
        Reflect.apply(createHostOperationReservationStore, undefined, [{}, storeId]);
      }).toThrow(/opaque/);
      expect(await store.inspect(firstFixture.operationHash)).toEqual(first);

      await store.markCommitStarted(first);
      const unknown = await store.inspect(firstFixture.operationHash);
      if (unknown === null) throw new Error('commit-unknown reservation is missing');
      expect(expectReturned(() => validateHostOperationReservation(unknown))).toEqual(unknown);
      expect(unknown).toMatchObject({ status: 'commit_unknown', request_digest: first.request_digest });
      const resultDigest = 'b'.repeat(64);
      await store.complete(first, resultDigest);
      const applied = await store.inspect(firstFixture.operationHash);
      if (applied === null) throw new Error('applied reservation is missing');
      expect(expectReturned(() => validateHostOperationReservation(applied))).toEqual(applied);
      expect(applied).toMatchObject({ status: 'applied', result_digest: resultDigest });

      const secondFixture = evidence();
      const second = await store.reserve(secondFixture.operationHash, secondFixture.request);
      if (second === null) throw new Error('second native reservation was not created');
      await store.abort(second);
      const aborted = await store.inspect(secondFixture.operationHash);
      if (aborted === null) throw new Error('aborted reservation is missing');
      expect(expectReturned(() => validateHostOperationReservation(aborted))).toEqual(aborted);
      expect(aborted).toMatchObject({ status: 'aborted', request_digest: second.request_digest });

      closeAttempted.add(database);
      database.close(true);
      openDatabases.delete(database);

      const reopenedDatabase = new Database(databasePath, { strict: true });
      openDatabases.add(reopenedDatabase);
      reopenedDatabase.exec('PRAGMA synchronous=FULL');
      const reopenedHost = new HostStateStore(reopenedDatabase, workspaceId);
      const reopenedStore = createHostOperationReservationStore(reopenedHost.governanceCapability, storeId);
      const reopenedApplied = await reopenedStore.inspect(firstFixture.operationHash);
      const reopenedAborted = await reopenedStore.inspect(secondFixture.operationHash);
      if (reopenedApplied === null || reopenedAborted === null)
        throw new Error('reopened native reservation records are missing');
      expect(expectReturned(() => validateHostOperationReservation(reopenedApplied))).toEqual(reopenedApplied);
      expect(expectReturned(() => validateHostOperationReservation(reopenedAborted))).toEqual(reopenedAborted);
      expect(reopenedApplied).toEqual(applied);
      expect(reopenedAborted).toEqual(aborted);

      caseSucceeded = true;
    } catch (error) {
      bodyFailure = { error };
      throw error;
    } finally {
      completeOwnedCleanup(
        [
          () => {
            const closeErrors: unknown[] = [];
            for (const database of openDatabases) {
              if (closeAttempted.has(database)) {
                continue;
              }
              closeAttempted.add(database);
              try {
                database.close(true);
                openDatabases.delete(database);
              } catch (error) {
                closeErrors.push(error);
              }
            }
            if (closeErrors.length > 0)
              throw new AggregateError(closeErrors, 'Native reservation database close failed');
            if (!caseSucceeded || bodyFailure !== undefined || performance.now() >= caseDeadline) return undefined;
            rmSync(temporaryRoot, { recursive: true, force: true });
            return 'removed';
          },
        ],
        bodyFailure,
      );
    }
  });

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
    'durable reservation inspection rejects malformed emitted terminal rows and retains their bytes',
    async () => {
      const nonRecordRoot = mkdtempSync(path.join(os.tmpdir(), 'agent-runtime-terminal-nonrecord-'));
      const invalidDigestRoot = mkdtempSync(path.join(os.tmpdir(), 'agent-runtime-terminal-digest-'));
      try {
        const nonRecordStore = await createFileOperationReservationStore(nonRecordRoot, 'quality-terminal-nonrecord');
        const nonRecordFixture = evidence();
        const nonRecordReservation = await expectAsyncReturned(async () =>
          nonRecordStore.reserve(nonRecordFixture.operationHash, nonRecordFixture.request),
        );
        if (nonRecordReservation === null) throw new Error('non-record terminal reservation was not created');
        await expectAsyncReturned(async () => nonRecordStore.markCommitStarted(nonRecordReservation));
        const nonRecordFiles = readdirSync(nonRecordRoot).filter((name) => name.endsWith('.json'));
        expect(nonRecordFiles).toHaveLength(1);
        const nonRecordPath = path.join(nonRecordRoot, nonRecordFiles[0]!);
        const nonRecordTerminalPath = nonRecordPath + '.terminal';
        const baseBytesBefore = readFileSync(nonRecordPath, 'utf8');
        const malformedNonRecordBytes = '[]';
        writeFileSync(nonRecordTerminalPath, malformedNonRecordBytes, 'utf8');
        await expectRejection(
          Promise.resolve().then(() => nonRecordStore.inspect(nonRecordFixture.operationHash)),
          'durable reservation terminal record is invalid',
        );
        expect(readFileSync(nonRecordPath, 'utf8')).toBe(baseBytesBefore);
        expect(readFileSync(nonRecordTerminalPath, 'utf8')).toBe(malformedNonRecordBytes);

        const invalidDigestStore = await createFileOperationReservationStore(
          invalidDigestRoot,
          'quality-terminal-invalid-digest',
        );
        const invalidDigestFixture = evidence();
        const invalidDigestReservation = await expectAsyncReturned(async () =>
          invalidDigestStore.reserve(invalidDigestFixture.operationHash, invalidDigestFixture.request),
        );
        if (invalidDigestReservation === null) throw new Error('invalid-digest reservation was not created');
        // This direct store control has no external effect; complete emits a real applied terminal row.
        await expectAsyncReturned(async () => invalidDigestStore.complete(invalidDigestReservation, 'a'.repeat(64)));
        const invalidDigestFiles = readdirSync(invalidDigestRoot).filter((name) => name.endsWith('.json'));
        expect(invalidDigestFiles).toHaveLength(1);
        const invalidDigestPath = path.join(invalidDigestRoot, invalidDigestFiles[0]!);
        const invalidDigestTerminalPath = invalidDigestPath + '.terminal';
        const invalidDigestBaseBytes = readFileSync(invalidDigestPath, 'utf8');
        const emittedAppliedBytes = readFileSync(invalidDigestTerminalPath, 'utf8');
        const emittedApplied: unknown = JSON.parse(emittedAppliedBytes);
        if (typeof emittedApplied !== 'object' || emittedApplied === null || Array.isArray(emittedApplied))
          throw new Error('The emitted terminal must be a record.');
        expect(emittedApplied).toMatchObject({
          operation_key: invalidDigestFixture.operationHash,
          fencing_token: invalidDigestReservation.fencing_token,
          status: 'applied',
          result_digest: 'a'.repeat(64),
        });
        const malformedApplied = { ...emittedApplied, result_digest: 'not-a-digest' };
        const malformedAppliedBytes = JSON.stringify(malformedApplied);
        writeFileSync(invalidDigestTerminalPath, malformedAppliedBytes, 'utf8');
        await expectRejection(
          Promise.resolve().then(() => invalidDigestStore.inspect(invalidDigestFixture.operationHash)),
          'durable reservation terminal record is invalid',
        );
        expect(readFileSync(invalidDigestPath, 'utf8')).toBe(invalidDigestBaseBytes);
        expect(readFileSync(invalidDigestTerminalPath, 'utf8')).toBe(malformedAppliedBytes);
      } finally {
        // These corrupt regular terminal rows are unresolved negative-test evidence; retain both roots.
        process.stderr.write(`Retained malformed terminal fixtures: ${nonRecordRoot}, ${invalidDigestRoot}\n`);
      }
    },
  );

  test.skipIf(!nativeNoFollowAvailable)(
    'durable reservation store rejects an obstructed terminal path and retains its reservation bytes',
    async () => {
      const temporaryRoot = mkdtempSync(path.join(os.tmpdir(), 'agent-runtime-reservation-obstruction-'));
      try {
        const store = await createFileOperationReservationStore(temporaryRoot, 'quality-obstruction');
        const fixture = evidence();
        const reservation = await store.reserve(fixture.operationHash, fixture.request);
        if (reservation === null) throw new Error('obstruction reservation was not created');
        const records = readdirSync(temporaryRoot).filter((name) => name.endsWith('.json'));
        expect(records).toHaveLength(1);
        const reservationPath = path.join(temporaryRoot, records[0]!);
        const originalBytes = readFileSync(reservationPath, 'utf8');
        const originalRecord: unknown = JSON.parse(originalBytes);
        expect(originalRecord).toMatchObject({
          operation_key: fixture.operationHash,
          fencing_token: reservation.fencing_token,
          status: 'reserved',
        });
        // Obstruct the exact terminal path of an actually emitted reservation.
        // This is invalid filesystem input, never a fabricated trusted terminal record.
        const terminalPath = reservationPath + '.terminal';
        mkdirSync(terminalPath);
        await Promise.resolve(
          expect(store.markCommitStarted(reservation)).rejects.toThrow(
            'safe repository access unavailable: durable reservation record must be a regular single-link file',
          ),
        );
        expect(readFileSync(reservationPath, 'utf8')).toBe(originalBytes);
        expect(lstatSync(terminalPath).isDirectory()).toBe(true);
        expect(readdirSync(terminalPath)).toEqual([]);
      } finally {
        // The terminal state is unreadable; a passing denial does not resolve it.
        process.stderr.write(`Retained obstructed reservation fixture root: ${temporaryRoot}\n`);
      }
    },
  );
  test.skipIf(!nativeNoFollowAvailable)(
    'durable reservation rereads actual peer terminal writes after a stale transition read',
    async () => {
      const temporaryRoot = mkdtempSync(path.join(os.tmpdir(), 'agent-runtime-reservation-peer-'));
      let safeToCleanup = false;
      let pending: { marker: string; beforeWrite: () => Promise<void> } | undefined;
      let intercepted = 0;
      try {
        const store = await createFileOperationReservationStore(temporaryRoot, 'quality-peer');
        const peer = await createFileOperationReservationStore(temporaryRoot, 'quality-peer');
        await mock.module('../src/config/safe-repository-access.ts', () => ({
          ...originalRepositoryAccess,
          requireSafeRepositoryAccess: (...args: Parameters<typeof repositoryAccess.requireSafeRepositoryAccess>) => {
            const access = originalRepositoryAccess.requireSafeRepositoryAccess(...args);
            return {
              ...access,
              writeExclusiveAsync: async (...writeArgs: Parameters<typeof access.writeExclusiveAsync>) => {
                if (pending?.marker === writeArgs[0]) {
                  const checkpoint = pending;
                  pending = undefined;
                  intercepted++;
                  // The peer uses its real public store and native exclusive write.
                  // Only scheduling is controlled; the subject observes the real EEXIST.
                  await checkpoint.beforeWrite();
                }
                return access.writeExclusiveAsync(...writeArgs);
              },
            };
          },
        }));
        for (const kind of [
          'same-unknown',
          'same-applied',
          'different-digest',
          'same-aborted',
          'different-status',
        ] as const) {
          const fixture = evidence();
          const reservation = await store.reserve(fixture.operationHash, fixture.request);
          if (reservation === null) throw new Error('peer fixture reservation was not created');
          const filename = readdirSync(temporaryRoot).find((name) => {
            if (!name.endsWith('.json')) return false;
            const value = JSON.parse(readFileSync(path.join(temporaryRoot, name), 'utf8')) as { operation_key: string };
            return value.operation_key === fixture.operationHash;
          });
          if (filename === undefined) throw new Error('peer fixture reservation file is missing');
          const basePath = path.join(temporaryRoot, filename);
          const baseBytes = readFileSync(basePath);
          const digest = 'a'.repeat(64);
          const peerAction = async () => {
            if (kind === 'same-unknown') await peer.markCommitStarted(reservation);
            else if (kind === 'same-aborted' || kind === 'different-status') await peer.abort(reservation);
            else await peer.complete(reservation, kind === 'different-digest' ? 'b'.repeat(64) : digest);
          };
          pending = { marker: `${basePath}.terminal`, beforeWrite: peerAction };
          const result = Promise.resolve(
            kind === 'same-aborted'
              ? store.abort(reservation)
              : kind === 'same-unknown' || kind === 'different-status'
                ? store.markCommitStarted(reservation)
                : store.complete(reservation, digest),
          );
          if (kind === 'different-status') await expectRejection(result, 'durable reservation terminal state conflict');
          else if (kind === 'different-digest')
            await expectRejection(result, 'durable reservation result digest conflict');
          else await expectAsyncReturned(() => result);
          expect(pending).toBeUndefined();
          expect(readFileSync(basePath)).toEqual(baseBytes);
          const observed = await peer.inspect(fixture.operationHash);
          expect(observed).toMatchObject({
            fencing_token: reservation.fencing_token,
            status:
              kind === 'same-unknown'
                ? 'commit_unknown'
                : kind === 'same-aborted' || kind === 'different-status'
                  ? 'aborted'
                  : 'applied',
          });
          if (kind === 'different-digest' || kind === 'same-applied')
            expect(observed?.result_digest).toBe(kind === 'different-digest' ? 'b'.repeat(64) : digest);
          // This fixture has no external effect; settle its synthetic unknown outcome.
          if (kind === 'same-unknown') await peer.complete(reservation, digest);
        }
        expect(intercepted).toBe(5);
        safeToCleanup = true;
      } finally {
        pending = undefined;
        await mock.module('../src/config/safe-repository-access.ts', () => originalRepositoryAccess);
        const restored = await import('../src/config/safe-repository-access.ts');
        expect(restored.requireSafeRepositoryAccess).toBe(originalRepositoryAccess.requireSafeRepositoryAccess);
        if (safeToCleanup) rmSync(temporaryRoot, { recursive: true, force: true });
        else process.stderr.write(`Retained peer reservation fixture root: ${temporaryRoot}\n`);
      }
    },
  );

  test.skipIf(!nativeNoFollowAvailable)(
    'durable reservation store persists every legal transition and rejects replay',
    async () => {
      const caseDeadline = performance.now() + 5_000;
      const temporaryRoot = mkdtempSync(path.join(os.tmpdir(), 'agent-runtime-reservations-'));
      let safeToCleanup = false;
      try {
        const reservationRoot = path.join(temporaryRoot, 'reservations');
        const store = await createFileOperationReservationStore(reservationRoot, 'quality-durable');
        const peerStore = await createFileOperationReservationStore(reservationRoot, 'quality-durable');
        const defaultStore = await createFileOperationReservationStore(
          path.join(temporaryRoot, 'default-reservations'),
        );
        expect(defaultStore.store_id).toBe('candidate-governed-writes');
        const defaultFixture = evidence();
        const defaultReservation = await defaultStore.reserve(defaultFixture.operationHash, defaultFixture.request);
        if (defaultReservation === null) throw new Error('default durable reservation was not created');
        expect(defaultReservation).toMatchObject({ store_id: 'candidate-governed-writes', status: 'reserved' });
        await defaultStore.abort(defaultReservation);
        const defaultAborted = await defaultStore.inspect(defaultFixture.operationHash);
        if (defaultAborted === null) throw new Error('default durable aborted reservation is missing');
        expect(defaultAborted).toMatchObject({ status: 'aborted', store_id: 'candidate-governed-writes' });

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
        await Promise.resolve(expect(store.complete(first, 'invalid-digest')).rejects.toThrow(/digest/));
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
        const aborted = await store.inspect(secondFixture.operationHash);
        if (aborted === null) throw new Error('durable aborted reservation is missing');
        expect(aborted).toMatchObject({ status: 'aborted', terminal_revision: second.revision + 1 });
        expect(Object.keys(aborted).sort()).toEqual(
          [
            'schema',
            'operation_key',
            'store_id',
            'revision',
            'fencing_token',
            'status',
            'created_at',
            'request_digest',
            'terminal_revision',
          ].sort(),
        );
        await Promise.resolve(expect(store.markCommitStarted(second)).rejects.toThrow(/transition/));

        const concurrentFixture = evidence();
        const concurrent = await store.reserve(concurrentFixture.operationHash, concurrentFixture.request);
        if (concurrent === null) throw new Error('concurrent durable reservation was not created');
        await Promise.all([store.markCommitStarted(concurrent), peerStore.markCommitStarted(concurrent)]);
        const concurrentUnknown = await peerStore.inspect(concurrentFixture.operationHash);
        if (concurrentUnknown === null) throw new Error('concurrent commit-unknown terminal is missing');
        expect(concurrentUnknown).toMatchObject({
          operation_key: concurrentFixture.operationHash,
          store_id: 'quality-durable',
          revision: concurrent.revision,
          fencing_token: concurrent.fencing_token,
          created_at: concurrent.created_at,
          request_digest: concurrent.request_digest,
          status: 'commit_unknown',
          terminal_revision: concurrent.revision + 1,
        });
        // This direct store fixture has no external effect; settle its synthetic outcome explicitly.
        await store.complete(concurrent, 'c'.repeat(64));
        expect(await peerStore.inspect(concurrentFixture.operationHash)).toMatchObject({
          status: 'applied',
          result_digest: 'c'.repeat(64),
        });

        const competingTerminalFixture = evidence();
        const competingTerminal = await store.reserve(
          competingTerminalFixture.operationHash,
          competingTerminalFixture.request,
        );
        if (competingTerminal === null) throw new Error('competing terminal reservation was not created');
        const competingTerminalResults = await Promise.allSettled([
          store.abort(competingTerminal),
          peerStore.markCommitStarted(competingTerminal),
        ]);
        expect(competingTerminalResults).toHaveLength(2);
        const competingWinner = await peerStore.inspect(competingTerminalFixture.operationHash);
        if (competingWinner === null) throw new Error('competing terminal winner is missing');
        expect(competingWinner).toMatchObject({
          schema: 'OperationReservation/v1',
          operation_key: competingTerminalFixture.operationHash,
          store_id: 'quality-durable',
          revision: competingTerminal.revision,
          fencing_token: competingTerminal.fencing_token,
          created_at: competingTerminal.created_at,
          request_digest: competingTerminal.request_digest,
          terminal_revision: competingTerminal.revision + 1,
        });
        const abortResult = competingTerminalResults[0];
        const commitStartResult = competingTerminalResults[1];
        if (competingWinner.status === 'aborted') {
          expect(abortResult.status).toBe('fulfilled');
          expect(commitStartResult.status).toBe('rejected');
          if (commitStartResult.status !== 'rejected')
            throw new Error('persisted aborted winner did not reject commit start');
          expect(String(commitStartResult.reason)).toMatch(
            /durable reservation (terminal state conflict|commit-start transition conflict)/,
          );
        } else if (competingWinner.status === 'commit_unknown') {
          expect(abortResult.status).toBe('rejected');
          expect(commitStartResult.status).toBe('fulfilled');
          if (abortResult.status !== 'rejected')
            throw new Error('persisted commit-unknown winner did not reject abort');
          expect(String(abortResult.reason)).toMatch(
            /durable reservation (terminal state conflict|can abort only before commit starts)/,
          );
          // This isolated store fixture has no external effect; settle its known outcome explicitly.
          await store.complete(competingTerminal, 'e'.repeat(64));
        } else {
          throw new Error(`unexpected persisted competing terminal state: ${competingWinner.status}`);
        }

        const competingDigestFixture = evidence();
        const competingDigest = await store.reserve(
          competingDigestFixture.operationHash,
          competingDigestFixture.request,
        );
        if (competingDigest === null) throw new Error('competing digest reservation was not created');
        await store.markCommitStarted(competingDigest);
        const digestResults = await Promise.allSettled([
          store.complete(competingDigest, 'f'.repeat(64)),
          peerStore.complete(competingDigest, '0'.repeat(64)),
        ]);
        expect(digestResults.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
        const digestLoser = digestResults.find((result) => result.status === 'rejected');
        if (digestLoser?.status !== 'rejected')
          throw new Error('competing result digest did not observe a persisted conflict');
        const loserReason: unknown = digestLoser.reason;
        expect(loserReason).toBeInstanceOf(Error);
        if (!(loserReason instanceof Error)) throw new Error('competing digest rejection is not an Error');
        expect(loserReason.message).toBe('durable reservation result digest conflict');
        const appliedWinner = await peerStore.inspect(competingDigestFixture.operationHash);
        if (appliedWinner === null) throw new Error('competing digest winner is missing');
        expect(appliedWinner).toMatchObject({
          schema: 'OperationReservation/v1',
          operation_key: competingDigestFixture.operationHash,
          store_id: 'quality-durable',
          revision: competingDigest.revision,
          fencing_token: competingDigest.fencing_token,
          created_at: competingDigest.created_at,
          request_digest: competingDigest.request_digest,
          status: 'applied',
          terminal_revision: competingDigest.revision + 2,
        });
        const appliedDigest = appliedWinner.result_digest;
        if (appliedDigest === undefined) throw new Error('competing applied winner has no result digest');
        expect(['f'.repeat(64), '0'.repeat(64)]).toContain(appliedDigest);
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
        if (safeToCleanup && performance.now() < caseDeadline) {
          rmSync(temporaryRoot, { recursive: true, force: true });
          console.error(`reservation fixture cleanup completed: ${temporaryRoot}`);
        } else {
          console.error(
            `reservation fixture retained after failure, unresolved outcome, or deadline: ${temporaryRoot}`,
          );
        }
      }
    },
  );
});
