import { createHash, randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { afterAll, afterEach, describe, expect, spyOn, test } from 'bun:test';
import path from 'node:path';
import type {
  ProjectAuthorizationRequest,
  ApprovalEvidence,
  TrustedProjectIdentity,
  VerifiedApprovalEvidence,
} from '../src/contracts/public-ingress.js';
import { computeWriteOperationHash } from '../src/contracts/public-ingress.ts';
import type {
  RuntimeKernelHost,
  RuntimeKernelHostBindings,
  TrustedHostCompositionInput,
  TrustedHostOperation,
  TrustedHostServices,
  WorkExecutionContextRequest,
} from '../src/runtime-kernel.js';
import { issueHostGovernanceCapability, type OperationReservation } from '../src/governance/edictum-boundary.ts';
import { nativeNoFollowAvailable } from '../src/config/host-capability.ts';
import { loadProjectContext, loadProjectSetContext } from '../src/config/project-context.ts';
import { loadRuntimeConfig, runtimeConfigDigest } from '../src/config/runtime-config.ts';
import { initializeProject } from '../bin/init.ts';
import type { RuntimeTimingEvent } from '../src/runtime-timing.js';
import {
  createAutomaticWorkAdmissionFixture,
  withAutomaticWorkAdmissionCase,
  retainPendingAutomaticWorkAdmissionCase,
} from './helpers/automatic-work-admission-fixture.js';
import { completeOwnedCleanup } from '../tooling/owned-cleanup-completion.ts';
import { canonicalJson, canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import {
  HostStateStore,
  type CoordinationLedger,
  type WorkIdentity,
  type WorkflowAttemptReceipt,
} from '../src/host-state.ts';
import type { WorkExecutionContext } from '../src/orchestration/workflow-session-reservation-contract.ts';
import { validateCoordinationLedgerV1 } from '../src/contracts/envelopes.ts';
import { createWorkflowReconciliationAuthorization } from './helpers/workflow-reconciliation-authorization-fixture.ts';
type TrustedAuthentication = TrustedHostCompositionInput['authentication'];
import {
  assertRuntimeConfigUnchanged,
  compareRuntimeKernelRepositoryRoots,
  createRuntimeKernel,
  createRuntimeKernelSourcePreflightPolicySession,
  createRuntimeKernelHost,
  createRuntimeKernelHostProofForCompositionRoot,
  createRuntimeKernelHostWithProof,
  createTestTrustedHostLauncherCapability,
  createTrustedLocalSessionComposition,
  createTrustedHostComposition,
  dispatchWorkflowAssignment,
  prepareWorkflowExecution,
  reserveWorkflowAssignmentForSession,
  completeWorkflowAssignmentForSession,
  retireInterruptedSourceOwnerForSession,
  requireLiveLocalSessionAdmission,
  readStableRuntimeConfig,
} from '../src/runtime-kernel.ts';

test('workflow capability APIs reject non-object capabilities before reading request data', async () => {
  const targets = [
    prepareWorkflowExecution,
    dispatchWorkflowAssignment,
    reserveWorkflowAssignmentForSession,
    completeWorkflowAssignmentForSession,
    retireInterruptedSourceOwnerForSession,
  ];
  for (const capability of [null, undefined, false, 0, 'forged', Symbol('forged'), () => undefined])
    for (const target of targets)
      await assert.rejects(async () => invokeUntrusted(target, [capability, null, null]), /opaque host capability/);
});

function invokeUntrusted(
  target: (...args: never[]) => unknown,
  ...invocation: [readonly unknown[]] | [unknown, readonly unknown[]]
): unknown {
  const [receiver, args] = invocation.length === 1 ? [undefined, invocation[0]] : invocation;
  const result: unknown = Reflect.apply(target, receiver, args);
  return result;
}
const fixtureProjectName = 'kernel';
const localDispatchCaseMs = 10000;
const malformedProjectIdLists = [
  ['duplicate', 'duplicate'],
  ['z', 'a'],
  ['a', 0],
];
afterEach(retainPendingAutomaticWorkAdmissionCase);
const repositoryRoot = await createRuntimeRepositoryRoot();
const config = loadRuntimeConfig(repositoryRoot);
const project = loadProjectContext(
  repositoryRoot,
  config,
  config.repository.repository_id,
  firstProjectId(config.projects.map((entry) => entry.project_id)),
);
const hostProject = loadProjectSetContext(
  repositoryRoot,
  config,
  config.repository.repository_id,
  config.projects.map((entry) => entry.project_id).sort(),
);
afterAll(async () => {
  await rm(repositoryRoot, { recursive: true, force: true });
});

function tenantId(): string {
  return project.repository_id;
}

function projectId(): string {
  return firstProjectId(project.project_ids);
}

function firstProjectId(projectIds: readonly string[]): string {
  const id = projectIds[0];
  if (id === undefined) throw new Error('runtime test project id is required');
  return id;
}

function parseCoordinationLedgerJson(text: string): CoordinationLedger {
  const result = validateCoordinationLedgerV1(JSON.parse(text));
  if (!result.ok)
    throw new Error(result.issues[0]?.message ?? 'fixture payload is not a current CoordinationLedger/v1 record');
  return result.ledger;
}

async function prepareAdmittedSessionFixture(
  workId: string,
  caseFixture?: ReturnType<typeof createAutomaticWorkAdmissionFixture>,
) {
  const fixture = caseFixture ?? createAutomaticWorkAdmissionFixture(false, true);
  try {
    const input = fixture.prepare(workId, 'user:' + workId);
    if (!input.nativeSessionHandle) throw new Error('lease fixture has no native session handle');
    input.intakePath = `.agent/work/${workId}/raw-intake.json`;
    await writeFile(
      path.join(fixture.root, input.intakePath),
      JSON.stringify({
        schema: 'VidaLocalSessionIntake/v1',
        work_item: input.workItem,
        native_session_handle: input.nativeSessionHandle,
        scope_path: input.scopePath,
        acceptance_path: input.acceptancePath,
        runtime_code_paths: input.runtimeCodePaths,
        route: input.route,
        risk: input.risk,
        change_kind: input.changeKind,
      }),
    );
    const admitted = fixture.admit(input);
    const work = admitted.host.work;
    if (!work) throw new Error('lease fixture has no admitted Work');
    return {
      fixture,
      identity: {
        repository_id: work.binding.repository_id,
        project_ids: work.binding.project_ids,
        integrations_digest: work.binding.integrations_digest,
        work_id: work.binding.lifecycle_work_id,
      },
      nativeSessionHandle: input.nativeSessionHandle,
      workItem: input.workItem,
    };
  } catch (error) {
    if (caseFixture === undefined)
      completeOwnedCleanup(
        [
          () => {
            fixture.close({ retainRoot: true });
            return undefined;
          },
        ],
        { error },
      );
    throw error;
  }
}

async function createRuntimeRepositoryRoot(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'agent-runtime-new-kernel-'));
  await mkdir(path.join(root, '.git'), { recursive: true });
  await initializeProject({
    projectRoot: root,
    repository: 'runtime-kernel-fixture',
    projectMappings: [`${fixtureProjectName}=.`],
  });
  const initializedConfig = loadRuntimeConfig(root);
  await Promise.all([
    mkdir(path.join(root, initializedConfig.control.work_root), { recursive: true }),
    mkdir(path.join(root, 'agent-runtime-new'), { recursive: true }),
  ]);
  await Promise.all([
    writeFile(path.join(root, 'agent-runtime-new/PLAN.md'), '# isolated candidate plan\n', 'utf8'),
    writeFile(path.join(root, 'agent-runtime-new/TESTING.md'), '# isolated candidate testing\n', 'utf8'),
  ]);
  return root;
}

function identity(): TrustedProjectIdentity {
  return {
    schema: 'TrustedProjectIdentity/v1',
    source: 'authenticated-context',
    principal: 'principal-1',
    role: 'developer-orchestrator',
    tenant: tenantId(),
    project: projectId(),
    registry_hash: project.registry_hash ?? project.config_digest,
  };
}

function invalidIdentity(field: keyof TrustedProjectIdentity, value: string): TrustedProjectIdentity {
  const candidate = identity();
  Object.defineProperty(candidate, field, { configurable: true, enumerable: true, value, writable: true });
  return candidate;
}

function evidence(overrides: Partial<ProjectAuthorizationRequest> = {}) {
  const payload = { path: 'agent-runtime-new/runtime-kernel-boundary-' + randomUUID() + '.txt', value: 'updated' };
  const authorization: ProjectAuthorizationRequest = {
    principal: 'principal-1',
    role: 'developer-orchestrator',
    action: 'write',
    tenant: tenantId(),
    project: projectId(),
    resourceTenant: tenantId(),
    resourceProject: projectId(),
    registryHash: project.registry_hash ?? project.config_digest,
    ...overrides,
  };
  const operationHash = computeWriteOperationHash({
    operation: 'repository.write',
    payload,
    ...authorization,
  });
  const approvedAt = new Date(Date.now() + 10_000).toISOString();
  const approval: ApprovalEvidence = {
    decision: 'approved',
    decision_id: 'runtime-kernel-approval',
    approver: 'operator-1',
    tenant: authorization.tenant,
    project: authorization.project,
    operation_hash: operationHash,
    approved_at: approvedAt,
    expires_at: new Date(Date.now() + 60_000).toISOString(),
  };
  const verifiedApproval: VerifiedApprovalEvidence = {
    ...approval,
    verified: true,
    issuer: 'test-authority',
    verification_id: 'runtime-kernel-verification',
    verified_at: approvedAt,
  };
  return {
    approval,
    verifiedApproval,
    input: {
      envelope: {
        schema: 'RuntimeEnvelope/v1',
        kind: 'governed-write',
        operation: 'runtime.write',
        sourceRevision: 'source-1',
        expectedRevision: 1,
        payload: { operation: 'repository.write' },
      },
      intent: {
        operation: 'repository.write',
        payload,
        authorization,
        approval,
      },
    },
  };
}

function hostBindings(overrides: Partial<RuntimeKernelHostBindings> = {}): RuntimeKernelHostBindings {
  return {
    repositoryRoot,
    repositoryId: config.repository.repository_id,
    projectIds: config.projects.map((entry) => entry.project_id).sort(),
    integrationsDigest: hostProject.integrations_digest,
    resolveIdentity: () => identity(),
    verifyApproval: () => null,
    runtimeRevision: () => ({ sourceRevision: 'source-1', currentRevision: 1 }),
    casWriter: () => ({ applied: true }),
    ...overrides,
  };
}

function host(overrides: Partial<RuntimeKernelHostBindings> = {}): RuntimeKernelHost {
  return createRuntimeKernelHost(hostBindings(overrides));
}

function trustedHostCapability(input: TrustedHostCompositionInput, permitReservation = false) {
  // Test callbacks exercise composition wiring; they do not qualify physical authority or database behavior.
  const reservations = new Map<string, OperationReservation>();
  const governanceCapability = issueHostGovernanceCapability({
    workspaceId: 'f'.repeat(64),
    reserveOperation: (storeId, key, requestDigest) => {
      if (!permitReservation || reservations.has(key)) return null;
      const reservation: OperationReservation = {
        schema: 'OperationReservation/v1',
        operation_key: key,
        store_id: storeId,
        revision: 1,
        fencing_token: randomUUID(),
        status: 'reserved',
        created_at: new Date().toISOString(),
        request_digest: requestDigest,
      };
      reservations.set(key, reservation);
      return reservation;
    },
    inspectOperation: (_storeId, key) => reservations.get(key) ?? null,
    transitionOperation: (reservation, status, resultDigest) => {
      const current = reservations.get(reservation.operation_key);
      if (
        current === undefined ||
        current.fencing_token !== reservation.fencing_token ||
        current.revision !== reservation.revision
      )
        throw new Error('test reservation fencing or revision mismatch');
      reservations.set(reservation.operation_key, {
        ...current,
        status,
        terminal_revision: current.revision + 1,
        ...(resultDigest === undefined ? {} : { result_digest: resultDigest }),
      });
    },
    consumeApproval: async () => undefined,
  });
  return createTestTrustedHostLauncherCapability({
    ...input,
    services: { governanceCapability, ...input.services },
  });
}

function composeTrustedHost(input: TrustedHostCompositionInput, permitReservation = false) {
  return createTrustedHostComposition(trustedHostCapability(input, permitReservation));
}

async function observeLocalSessionComposition(input: Parameters<typeof createTrustedLocalSessionComposition>[0]) {
  let result: Awaited<ReturnType<typeof createTrustedLocalSessionComposition>> | undefined;
  await assert.doesNotReject(async () => {
    result = await createTrustedLocalSessionComposition(input);
  });
  assert.ok(result);
  return result;
}

function localSessionServices(
  governanceCapability: NonNullable<TrustedHostServices['governanceCapability']>,
  observe = () => {},
): TrustedHostServices {
  return {
    governanceCapability,
    resolveIdentity: () => {
      observe();
      return null;
    },
    verifyApproval: () => {
      observe();
      return null;
    },
    runtimeRevision: () => {
      observe();
      return { sourceRevision: 'source-1', currentRevision: 1 };
    },
    casWriter: () => {
      observe();
      return { applied: true };
    },
  };
}

function admittedFixtureWorkContext(
  store: HostStateStore,
  identity: WorkIdentity,
  request: WorkExecutionContextRequest,
): WorkExecutionContext {
  const current = store.readHostStateSnapshot(identity);
  const work = current.work;
  assert.ok(work?.lease && current.workVersion && current.ledgerVersion && current.ledger);
  const lease = work.lease;
  const ticket = current.ledger.tickets.find((entry) => entry.ticket_id === lease.ticket_id);
  assert.ok(ticket?.expires_at);
  return {
    schema: 'WorkExecutionContext/v1',
    binding: work.binding,
    permit: {
      context_digest: canonicalJsonDigest(work.binding),
      checkpoint_revision: current.workVersion.revision,
      checkpoint_digest: current.workVersion.digest,
      runtime_current_revision: 1,
      stage_id: request.stageId,
      assignment_index: request.assignmentIndex,
      dispatch_authorized: true,
      lease: {
        thread_id: lease.thread_id,
        ticket_id: lease.ticket_id,
        generation: lease.generation,
        ledger_revision: current.ledgerVersion.revision,
        expires_at: ticket.expires_at,
        active_resources: [...ticket.active_resources],
        blocked_resources: [...ticket.blocked_resources],
      },
    },
  };
}

async function prepareAdmittedWorkflowAssignment(
  admitted: Awaited<ReturnType<typeof prepareAdmittedSessionFixture>>,
  services: TrustedHostServices,
  compose: (
    input: Parameters<typeof createTrustedLocalSessionComposition>[0],
  ) => Promise<Awaited<ReturnType<typeof createTrustedLocalSessionComposition>>> = observeLocalSessionComposition,
) {
  const { fixture, identity, nativeSessionHandle } = admitted;
  const composition = await compose({
    repositoryRoot: fixture.root,
    repositoryId: identity.repository_id,
    projectIds: identity.project_ids,
    nativeSessionHandle,
    admittedWork: { workId: identity.work_id, store: fixture.store },
    services,
  });
  const capability = composition.workflowExecutionCapability;
  assert.ok(capability);
  let prepared: Awaited<ReturnType<typeof prepareWorkflowExecution>> | undefined;
  await assert.doesNotReject(async () => {
    prepared = await prepareWorkflowExecution(capability, {
      repositoryRoot: fixture.root,
      configDigest: runtimeConfigDigest(fixture.config),
      teamId: 'default-development',
      workItemId: identity.work_id,
    });
  });
  assert.ok(prepared);
  const workflow = fixture.config.workflows[prepared.workflowId];
  assert.ok(workflow);
  const stage = workflow.stages.find((entry) => entry.id === workflow.entry_stage);
  const assignment = stage?.assignments[0];
  assert.ok(stage && assignment);
  return {
    capability,
    stage,
    assignment,
    request: {
      repositoryRoot: fixture.root,
      configDigest: runtimeConfigDigest(fixture.config),
      teamId: 'default-development',
      workflowId: prepared.workflowId,
      stageId: stage.id,
      assignmentIndex: 0,
      workItemId: identity.work_id,
      workItemDigest: prepared.workItemDigest,
      workContextDigest: prepared.workContextDigest,
      input: { work_item_id: identity.work_id },
    },
  };
}

describe('runtime kernel boundary', () => {
  test.each(['reservation', 'provider'] as const)(
    'local session preserves a %s failure and its durable attempt outcome',
    (failurePhase) =>
      withAutomaticWorkAdmissionCase(async ({ createFixture }) => {
        const admitted = await prepareAdmittedSessionFixture(
          'local-failure-' + randomUUID(),
          createFixture(false, true),
        );
        const { fixture, identity, workItem } = admitted;
        const failure = new Error('injected local ' + failurePhase + ' failure');
        let providerCalls = 0;
        let validationCalls = 0;
        let claimedBeforeFailure = false;
        const { capability, request } = await prepareAdmittedWorkflowAssignment(admitted, {
          ...localSessionServices(fixture.store.governanceCapability),
          runtimeRevision: () => ({
            sourceRevision: fixture.store.readHostStateSnapshot(identity).work!.binding.runtime_code_digest,
            currentRevision: 1,
          }),
          resolveWorkflowWorkItem: () => workItem,
          resolveWorkExecutionContext: (contextRequest) => {
            const state = fixture.store.readHostStateSnapshot(identity);
            if (failurePhase === 'reservation' && state.work?.execution.assignment_attempts.length) {
              claimedBeforeFailure = true;
              throw failure;
            }
            return admittedFixtureWorkContext(fixture.store, identity, contextRequest);
          },
          dispatchWorkflowAssignment: () => {
            providerCalls++;
            const state = fixture.store.readHostStateSnapshot(identity);
            claimedBeforeFailure = state.work?.execution.assignment_attempts[0]?.status === 'started';
            throw failure;
          },
          validateWorkflowAssignmentResult: () => {
            validationCalls++;
          },
        });
        await assert.rejects(dispatchWorkflowAssignment(capability, request), (error: unknown) => error === failure);
        expect(claimedBeforeFailure).toBe(true);
        expect(providerCalls).toBe(failurePhase === 'provider' ? 1 : 0);
        expect(validationCalls).toBe(0);
        const attempts = fixture.store.readHostStateSnapshot(identity).work?.execution.assignment_attempts;
        if (failurePhase === 'reservation') {
          expect(attempts).toEqual([]);
        } else {
          expect(attempts).toHaveLength(1);
          expect(attempts?.[0]).toMatchObject({
            status: 'uncertain',
            stage_id: request.stageId,
            assignment_index: request.assignmentIndex,
            result: null,
            result_digest: null,
          });
        }
      }),
  );
  test(
    'local session completes a fresh ordinary assignment through its admitted store',
    () =>
      withAutomaticWorkAdmissionCase(async ({ createFixture, onCleanup }) => {
        let phaseStarted = performance.now();
        const phase = (name: string): void => {
          const now = performance.now();
          console.log(
            JSON.stringify({ schema: 'LocalWorkflowFixtureTiming/v1', phase: name, elapsed_ms: now - phaseStarted }),
          );
          phaseStarted = now;
        };
        const admitted = await prepareAdmittedSessionFixture(
          'local-dispatch-' + randomUUID(),
          createFixture(false, true),
        );
        const { fixture, identity, nativeSessionHandle, workItem } = admitted;
        phase('admit');
        const originalClaim = fixture.store.claimWorkflowAssignment.bind(fixture.store);
        const snapshotReads = spyOn(fixture.store, 'readHostStateSnapshot');
        const claimObserver = spyOn(fixture.store, 'claimWorkflowAssignment').mockImplementation((...args) => {
          const beforeReads = snapshotReads.mock.calls.length;
          const started = performance.now();
          try {
            return originalClaim(...args);
          } finally {
            console.log(
              JSON.stringify({
                schema: 'LocalWorkflowFixtureTiming/v1',
                phase: 'store-claim',
                elapsed_ms: performance.now() - started,
                public_snapshot_calls: snapshotReads.mock.calls.length - beforeReads,
              }),
            );
          }
        });
        onCleanup(() => {
          claimObserver.mockRestore();
          snapshotReads.mockRestore();
        });
        const observed: string[] = [];
        const { capability, request, stage, assignment } = await prepareAdmittedWorkflowAssignment(admitted, {
          ...localSessionServices(fixture.store.governanceCapability),
          runtimeRevision: () => ({
            sourceRevision: fixture.store.readHostStateSnapshot(identity).work!.binding.runtime_code_digest,
            currentRevision: 1,
          }),
          resolveWorkflowWorkItem: () => workItem,
          resolveWorkExecutionContext: (request) => admittedFixtureWorkContext(fixture.store, identity, request),
          dispatchWorkflowAssignment: (invocation) => {
            observed.push('dispatch');
            const persistedWork = fixture.store.readHostStateSnapshot(identity).work;
            assert.ok(persistedWork);
            expect(invocation.workContext.binding).toEqual(persistedWork.binding);
            expect(invocation.workContext.permit.lease.thread_id).toBe(nativeSessionHandle);
            return { observed: invocation.assignment.role };
          },
          validateWorkflowAssignmentResult: (invocation, result) => {
            observed.push('validate');
            expect(result).toEqual({ observed: invocation.assignment.role });
          },
        });
        phase('compose-prepare');
        let result: unknown;
        await assert.doesNotReject(async () => {
          result = await dispatchWorkflowAssignment(capability, request);
        });
        phase('dispatch-complete');
        expect(result).toEqual({ observed: assignment.role });
        expect(observed).toEqual(['dispatch', 'validate']);
        const state = fixture.store.readHostStateSnapshot(identity);
        expect(state.work?.execution.assignment_attempts).toHaveLength(1);
        const attempt = state.work?.execution.assignment_attempts[0];
        expect(attempt).toMatchObject({
          status: 'completed',
          stage_id: stage.id,
          assignment_index: 0,
          result_digest: canonicalJsonDigest(result),
        });
        expect(attempt?.lease).toMatchObject({
          thread_id: nativeSessionHandle,
          ticket_id: state.work?.lease?.ticket_id,
          generation: state.work?.lease?.generation,
        });
      }, localDispatchCaseMs),
    localDispatchCaseMs,
  );
  test.each(['no_effect', 'completed'] as const)(
    'persisted %s receipt is handled at the public workflow boundary',
    (outcome) =>
      withAutomaticWorkAdmissionCase(async ({ createFixture }) => {
        const admitted = await prepareAdmittedSessionFixture(outcome + '-' + randomUUID(), createFixture(false, true));
        const { fixture, identity, nativeSessionHandle, workItem } = admitted;
        const evidenceDirectory = path.join(fixture.root, '.agent', 'work', identity.work_id, 'reconciliation');
        await mkdir(evidenceDirectory, { recursive: true });
        const decisionBytes = Buffer.from(JSON.stringify({ schema: 'DecisionRecord/v1', outcome: 'retry_no_effect' }));
        const providerBytes = Buffer.from(JSON.stringify({ schema: 'ProviderObservation/v1', outcome: 'quiescent' }));
        const decision = {
          schema: 'DecisionRecord/v1',
          path: `.agent/work/${identity.work_id}/reconciliation/decision.json`,
          sha256: createHash('sha256').update(decisionBytes).digest('hex'),
        } as const;
        const providerEvidence = {
          schema: 'ProviderObservation/v1',
          path: `.agent/work/${identity.work_id}/reconciliation/provider-observation.json`,
          sha256: createHash('sha256').update(providerBytes).digest('hex'),
        } as const;
        await Promise.all([
          writeFile(path.join(fixture.root, decision.path), decisionBytes),
          writeFile(path.join(fixture.root, providerEvidence.path), providerBytes),
        ]);
        if (outcome === 'no_effect') {
          const beforeDecision = fixture.store.readHostStateSnapshot(identity);
          assert.ok(
            beforeDecision.work && beforeDecision.ledger && beforeDecision.workVersion && beforeDecision.ledgerVersion,
          );
          const nextWork = structuredClone(beforeDecision.work);
          Reflect.set(nextWork, 'revision', nextWork.revision + 1);
          Reflect.set(nextWork.lifecycle, 'revision', nextWork.revision);
          Reflect.set(nextWork.contracts, 'decisions', [...nextWork.contracts.decisions, decision]);
          const nextLedger = structuredClone(beforeDecision.ledger);
          Reflect.set(nextLedger, 'revision', nextLedger.revision + 1);
          fixture.store.compareAndSwapHostState({
            expectedWork: beforeDecision.workVersion,
            expectedLedger: beforeDecision.ledgerVersion,
            nextWork,
            nextLedger,
          });
        }

        const principal = 'runtime:kernel-boundary-test-verifier';
        const reconciliationStore = new HostStateStore(
          fixture.database,
          fixture.store.workspaceId,
          {
            principal,
            verify: (request, state) => createWorkflowReconciliationAuthorization(principal, request, state),
          },
          undefined,
          undefined,
          undefined,
          fixture.root,
        );
        let providerCalls = 0;
        if (outcome === 'completed') {
          const persistedResult = { recovered: true };
          const services: TrustedHostServices = {
            ...localSessionServices(reconciliationStore.governanceCapability),
            runtimeRevision: () => ({
              sourceRevision: fixture.store.readHostStateSnapshot(identity).work!.binding.runtime_code_digest,
              currentRevision: 1,
            }),
            resolveWorkflowWorkItem: () => workItem,
            resolveWorkExecutionContext: (contextRequest) =>
              admittedFixtureWorkContext(fixture.store, identity, contextRequest),
            validateWorkflowAssignmentResult: (_invocation, result) => expect(result).toEqual(persistedResult),
            dispatchWorkflowAssignment: () => {
              providerCalls++;
              throw new Error('a reconciled completed attempt must replay its persisted result');
            },
          };
          const nativeComposition = (input: Parameters<typeof createTrustedLocalSessionComposition>[0]) =>
            observeLocalSessionComposition({
              ...input,
              admittedWork: { workId: identity.work_id, store: reconciliationStore },
            });
          const { capability, request } = await prepareAdmittedWorkflowAssignment(
            admitted,
            services,
            nativeComposition,
          );
          const startedReservation = await reserveWorkflowAssignmentForSession(capability, request);
          expect(startedReservation.receipt.attempt.status).toBe('started');
          const afterStart = reconciliationStore.readHostStateSnapshot(identity);
          assert.ok(afterStart.ledgerVersion);
          const reconciledReceipt = await reconciliationStore.reconcileWorkflowAttempt({
            identity,
            expectedWork: startedReservation.receipt.workVersion,
            expectedLedger: afterStart.ledgerVersion,
            attemptId: startedReservation.receipt.attempt.attempt_id,
            outcome: 'completed',
            result: persistedResult,
            providerEvidence,
            decision: null,
            retryLease: null,
          });
          const afterReconciliation = reconciliationStore.readHostStateSnapshot(identity);
          const persistedAttempt = afterReconciliation.work?.execution.assignment_attempts.find(
            (entry) => entry.attempt_id === startedReservation.receipt.attempt.attempt_id,
          );
          assert.ok(persistedAttempt && afterReconciliation.ledger);
          expect(persistedAttempt).toEqual(reconciledReceipt.attempt);
          expect(persistedAttempt).toMatchObject({
            status: 'completed',
            result: persistedResult,
            result_digest: canonicalJsonDigest(persistedResult),
            reconciliation: {
              principal,
              outcome: 'completed',
              result_digest: canonicalJsonDigest(persistedResult),
              provider_evidence: providerEvidence,
              decision: null,
              retry_lease: null,
            },
          });
          const replayBefore = reconciliationStore.readHostStateSnapshot(identity);
          let result: unknown;
          await assert.doesNotReject(async () => {
            result = await dispatchWorkflowAssignment(capability, request);
          });
          expect(result).toEqual(persistedResult);
          expect(providerCalls).toBe(0);
          expect(reconciliationStore.readHostStateSnapshot(identity)).toEqual(replayBefore);
          return;
        }
        let reconciledReceipt: WorkflowAttemptReceipt | undefined;
        let replayReconciledReceipt = false;
        const workflowAttempts: NonNullable<TrustedHostServices['workflowAttempts']> = {
          governanceCapability: fixture.store.governanceCapability,
          reconciliationPrincipal: principal,
          claimWorkflowAssignment: (invocation, requestDigest) => {
            if (replayReconciledReceipt) {
              if (!reconciledReceipt) throw new Error('persisted no-effect receipt was not prepared');
              return reconciledReceipt;
            }
            return fixture.store.claimWorkflowAssignment(invocation, requestDigest);
          },
          completeWorkflowAttempt: (receipt, result) => fixture.store.completeWorkflowAttempt(receipt, result),
          markWorkflowAttemptUncertain: (receipt) => fixture.store.markWorkflowAttemptUncertain(receipt),
          abortUnstartedWorkflowAttempt: (authorization) => fixture.store.abortUnstartedWorkflowAttempt(authorization),
        };
        const services: TrustedHostServices = {
          ...localSessionServices(fixture.store.governanceCapability),
          workflowAttempts,
          runtimeRevision: () => ({
            sourceRevision: fixture.store.readHostStateSnapshot(identity).work!.binding.runtime_code_digest,
            currentRevision: 1,
          }),
          resolveWorkflowWorkItem: () => workItem,
          resolveWorkExecutionContext: (contextRequest) =>
            admittedFixtureWorkContext(fixture.store, identity, contextRequest),
          validateWorkflowAssignmentResult: () => {
            throw new Error('a denied reservation must not validate a provider result');
          },
          dispatchWorkflowAssignment: () => {
            providerCalls++;
            throw new Error('a reconciled no-effect attempt must not dispatch');
          },
        };
        const launcher = createTestTrustedHostLauncherCapability({
          authentication: {
            schema: 'TrustedHostAuthentication/v1',
            repositoryRoot: fixture.root,
            repositoryId: identity.repository_id,
            projectIds: [...identity.project_ids].sort(),
            integrationsDigest: identity.integrations_digest,
            principal: 'fixture:no-effect-boundary',
            configRevision: fixture.config.config_revision,
            permittedOperations: ['runtime.read', 'runtime.write', 'workflow'],
          },
          services,
        });
        const { capability, request } = await prepareAdmittedWorkflowAssignment(admitted, services, () =>
          createTrustedHostComposition(launcher),
        );

        const startedReservation = await reserveWorkflowAssignmentForSession(capability, request);
        expect(startedReservation.receipt.attempt.status).toBe('started');
        expect(providerCalls).toBe(0);
        const afterStart = fixture.store.readHostStateSnapshot(identity);
        assert.ok(afterStart.ledger && afterStart.ledgerVersion);
        const retryLease = {
          ...startedReservation.receipt.attempt.lease,
          thread_id: nativeSessionHandle + '-retry',
          generation: startedReservation.receipt.attempt.lease.generation + 1,
        };
        reconciledReceipt = await reconciliationStore.reconcileWorkflowAttempt({
          identity,
          expectedWork: startedReservation.receipt.workVersion,
          expectedLedger: afterStart.ledgerVersion,
          attemptId: startedReservation.receipt.attempt.attempt_id,
          outcome: 'no_effect',
          result: null,
          providerEvidence,
          decision,
          retryLease,
        });
        replayReconciledReceipt = true;
        const afterReconciliation = reconciliationStore.readHostStateSnapshot(identity);
        const persistedAttempt = afterReconciliation.work?.execution.assignment_attempts.find(
          (entry) => entry.attempt_id === startedReservation.receipt.attempt.attempt_id,
        );
        assert.ok(persistedAttempt && afterReconciliation.ledger);
        expect(persistedAttempt).toEqual(reconciledReceipt.attempt);
        expect(persistedAttempt).toMatchObject({
          status: 'no_effect',
          result: null,
          result_digest: null,
          lease: startedReservation.receipt.attempt.lease,
          reconciliation: {
            principal,
            outcome: 'no_effect',
            result_digest: null,
            provider_evidence: providerEvidence,
            decision,
            retry_lease: retryLease,
          },
        });
        expect(afterReconciliation.ledger).toEqual(afterStart.ledger);
        const deniedBefore = afterReconciliation;
        await assert.rejects(
          reserveWorkflowAssignmentForSession(capability, request),
          /workflow session action was already completed or requires reconciliation/,
        );
        expect(providerCalls).toBe(0);
        expect(reconciliationStore.readHostStateSnapshot(identity)).toEqual(deniedBefore);
      }),
  );

  test('local session without admitted work remains read and workflow only', () =>
    withAutomaticWorkAdmissionCase(async ({ createFixture }) => {
      const fixture = createFixture(false, true);
      let serviceCalls = 0;
      const composition = await observeLocalSessionComposition({
        repositoryRoot: fixture.root,
        repositoryId: fixture.config.repository.repository_id,
        projectIds: fixture.config.projects.map((entry) => entry.project_id).sort(),
        nativeSessionHandle: 'read-only-local-session',
        services: localSessionServices(fixture.store.governanceCapability, () => {
          serviceCalls++;
        }),
      });

      expect(composition.authentication.permittedOperations).toEqual(['runtime.read', 'workflow']);
      expect(composition.authentication.principal).toBe(
        'local-session:' + canonicalJsonDigest('read-only-local-session'),
      );
      expect(composition.workflowHostCapability).not.toBeNull();
      let current: Awaited<ReturnType<typeof composition.runtimeKernel.readConfig>> | undefined;
      await assert.doesNotReject(async () => {
        current = await composition.runtimeKernel.readConfig();
      });
      assert.ok(current);
      expect(runtimeConfigDigest(current)).toBe(runtimeConfigDigest(fixture.config));
      await Promise.resolve(
        expect(
          Promise.resolve().then(() => composition.runtimeKernel.evaluateGovernance('runtime.write', {})),
        ).rejects.toThrow('trusted host operation is not permitted: runtime.write'),
      );
      expect(serviceCalls).toBe(0);
    }));

  test('local session binds the live lease and gates foreign work before callbacks', () =>
    withAutomaticWorkAdmissionCase(async ({ createFixture }) => {
      const { fixture, identity, nativeSessionHandle } = await prepareAdmittedSessionFixture(
        'local-session-boundary-' + randomUUID(),
        createFixture(false, true),
      );
      const callbackCalls = { workItem: 0, context: 0, dispatch: 0, validate: 0 };
      const services: TrustedHostServices = {
        ...localSessionServices(fixture.store.governanceCapability),
        resolveWorkflowWorkItem: () => {
          callbackCalls.workItem += 1;
          throw new Error('foreign work must be rejected before resolution');
        },
        resolveWorkExecutionContext: () => {
          callbackCalls.context += 1;
          throw new Error('foreign work must be rejected before context resolution');
        },
        dispatchWorkflowAssignment: () => {
          callbackCalls.dispatch += 1;
          throw new Error('foreign work must be rejected before dispatch');
        },
        validateWorkflowAssignmentResult: () => {
          callbackCalls.validate += 1;
          throw new Error('foreign work must be rejected before validation');
        },
      };
      const configDigest = runtimeConfigDigest(fixture.config);
      const input = {
        repositoryRoot: fixture.root,
        repositoryId: identity.repository_id,
        projectIds: identity.project_ids,
        nativeSessionHandle,
        admittedWork: { workId: identity.work_id, store: fixture.store },
        services,
      };
      const composition = await observeLocalSessionComposition(input);
      expect(composition.authentication).toMatchObject({
        repositoryId: identity.repository_id,
        projectIds: identity.project_ids,
        principal: 'local-session:' + canonicalJsonDigest(nativeSessionHandle),
        permittedOperations: ['runtime.read', 'runtime.write', 'workflow'],
      });
      expect(composition.workflowExecutionCapability).not.toBeNull();

      await Promise.resolve(
        expect(
          createTrustedLocalSessionComposition({ ...input, nativeSessionHandle: 'wrong-native-session' }),
        ).rejects.toThrow('local workflow admission or exact-path lease is stale'),
      );
      await Promise.resolve(
        expect(
          prepareWorkflowExecution(composition.workflowExecutionCapability!, {
            repositoryRoot: fixture.root,
            configDigest,
            teamId: 'default-development',
            workItemId: identity.work_id + '-foreign',
          }),
        ).rejects.toThrow('local workflow work item is not the admitted work'),
      );
      expect(callbackCalls).toEqual({ workItem: 0, context: 0, dispatch: 0, validate: 0 });
    }));

  test('local session pins SourcePreflight policy to current configuration', () =>
    withAutomaticWorkAdmissionCase(async ({ createFixture, onCleanup }) => {
      const fixture = createFixture(false, true);
      const configDigest = runtimeConfigDigest(fixture.config);
      const configPath = path.join(fixture.root, 'agent-runtime.config.v1.yaml');
      const originalConfig = await readFile(configPath, 'utf8');
      onCleanup(() => writeFileSync(configPath, originalConfig, 'utf8'));
      const composition = await observeLocalSessionComposition({
        repositoryRoot: fixture.root,
        repositoryId: fixture.config.repository.repository_id,
        projectIds: fixture.config.projects.map((entry) => entry.project_id).sort(),
        nativeSessionHandle: 'local-policy-session',
        services: localSessionServices(fixture.store.governanceCapability),
      });
      const workflowHostCapability = composition.workflowHostCapability;
      if (workflowHostCapability === null) throw new Error('local composition has no workflow host capability');
      let policy: ReturnType<typeof createRuntimeKernelSourcePreflightPolicySession> | undefined;
      assert.doesNotThrow(() => {
        policy = createRuntimeKernelSourcePreflightPolicySession(
          fixture.root,
          configDigest,
          'source-preflight-local-session',
          workflowHostCapability,
        );
      });
      assert.ok(policy);
      const issuedPolicy = policy;
      expect(Object.isFrozen(issuedPolicy)).toBe(true);
      expect(issuedPolicy.workflow.config_digest).toBe(configDigest);
      expect(issuedPolicy.workflow.approval_authority).toBe('workflow-gate-only');
      expect(() => issuedPolicy.assertCurrent()).not.toThrow();
      expect(() =>
        createRuntimeKernelSourcePreflightPolicySession(
          fixture.root,
          '0'.repeat(64),
          'stale-source-preflight-local-session',
          workflowHostCapability,
        ),
      ).toThrow('source preflight configuration differs from the current Host request');

      const changedConfig = originalConfig.replace(
        /config_revision: (\d+)/,
        (_match, revision: string) => `config_revision: ${Number(revision) + 1}`,
      );
      if (changedConfig === originalConfig) throw new Error('fixture config revision was not changed');
      await writeFile(configPath, changedConfig, 'utf8');
      expect(() => issuedPolicy.assertCurrent()).toThrow('runtime configuration changed after composition');
    }));

  test('local session rejects caller-owned attempts and a foreign governance store', () =>
    withAutomaticWorkAdmissionCase(async ({ createFixture }) => {
      const { fixture, identity, nativeSessionHandle } = await prepareAdmittedSessionFixture(
        'local-session-owner-' + randomUUID(),
        createFixture(false, true),
      );
      const foreignOwner = createFixture(false, true);
      let callbackCalls = 0;
      const services = localSessionServices(fixture.store.governanceCapability, () => {
        callbackCalls++;
      });
      const input = {
        repositoryRoot: fixture.root,
        repositoryId: identity.repository_id,
        projectIds: identity.project_ids,
        nativeSessionHandle,
        admittedWork: { workId: identity.work_id, store: fixture.store },
      };
      const callerAttempts: NonNullable<TrustedHostServices['workflowAttempts']> = {
        governanceCapability: fixture.store.governanceCapability,
        claimWorkflowAssignment: async () => {
          callbackCalls += 1;
          throw new Error('caller attempts must not be used');
        },
        completeWorkflowAttempt: async () => {
          callbackCalls += 1;
          throw new Error('caller attempts must not be used');
        },
        markWorkflowAttemptUncertain: async () => {
          callbackCalls += 1;
          throw new Error('caller attempts must not be used');
        },
        abortUnstartedWorkflowAttempt: () => {
          callbackCalls += 1;
          throw new Error('caller attempts must not be used');
        },
      };
      await Promise.resolve(
        expect(
          createTrustedLocalSessionComposition({
            ...input,
            services: { ...services, workflowAttempts: callerAttempts },
          }),
        ).rejects.toThrow('local workflow attempts must be issued from the admitted host state store'),
      );
      await Promise.resolve(
        expect(
          createTrustedLocalSessionComposition({
            ...input,
            services: { ...services, governanceCapability: foreignOwner.store.governanceCapability },
          }),
        ).rejects.toThrow('local workflow attempts must be issued from the admitted host state store'),
      );
      expect(callbackCalls).toBe(0);
    }));

  test.skipIf(!nativeNoFollowAvailable)(
    'executes a fully trusted governed write and uses host timing bindings',
    async () => {
      const fixture = evidence();
      const events: RuntimeTimingEvent[] = [];
      const clock = { monotonicNs: () => 1_000_000n };
      let identityCalls = 0;
      let approvalCalls = 0;
      let writeCalls = 0;
      const kernel = await createRuntimeKernel(
        repositoryRoot,
        host({
          resolveIdentity: () => {
            identityCalls += 1;
            return identity();
          },
          verifyApproval: () => {
            approvalCalls += 1;
            return fixture.verifiedApproval;
          },
          casWriter: (request) => {
            writeCalls += 1;
            return { applied: true, path: request.payload.path };
          },
          clock,
          timingSink: {
            record: (event) => {
              events.push(event);
            },
          },
        }),
      );

      await Promise.resolve(
        expect(kernel.runGovernedWrite(fixture.input)).resolves.toEqual({
          applied: true,
          path: fixture.input.intent.payload.path,
        }),
      );
      expect(identityCalls).toBe(1);
      expect(approvalCalls).toBe(1);
      expect(writeCalls).toBe(1);
      const reservationPath = path.join(
        repositoryRoot,
        config.control.work_root,
        'runtime-reservations',
        createHash('sha256').update(fixture.approval.operation_hash).digest('hex') + '.json',
      );
      const terminalPath = reservationPath + '.final';
      try {
        const reservation: unknown = JSON.parse(await readFile(terminalPath, 'utf8'));
        expect(reservation).toMatchObject({ status: 'applied' });
      } finally {
        await Promise.all([
          rm(reservationPath, { force: true }),
          rm(reservationPath + '.terminal', { force: true }),
          rm(terminalPath, { force: true }),
        ]);
      }
      expect(events.some((event) => event.operation === 'createRuntimeKernel')).toBe(true);
      await Promise.resolve(expect(kernel.readConfig()).resolves.toMatchObject({ schema: 'AgentRuntimeConfig/v1' }));
      await Promise.resolve(
        expect(kernel.readProjectContext()).resolves.toMatchObject({ project_ids: project.project_ids }),
      );
      await Promise.resolve(
        expect(kernel.evaluateGovernance('runtime.read', {})).resolves.toMatchObject({ decision: 'allow' }),
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
      const operations = events.map((event) => event.operation);
      const requiredOperations: RuntimeTimingEvent['operation'][] = [
        'createRuntimeKernel',
        'runGovernedWrite',
        'readConfig',
        'readProjectContext',
        'evaluateGovernance',
      ];
      for (const operation of requiredOperations) {
        expect(operations).toContain(operation);
      }
      expect(events.find((event) => event.operation === 'runGovernedWrite')).toMatchObject({
        started_at_ns: '1000000',
      });
    },
  );
  test('trusted host composition binds authenticated context before exposing capabilities', async () => {
    let serviceCalls = 0;
    const input: TrustedHostCompositionInput = {
      authentication: {
        schema: 'TrustedHostAuthentication/v1',
        repositoryRoot,
        repositoryId: config.repository.repository_id,
        projectIds: config.projects.map((entry) => entry.project_id).sort(),
        integrationsDigest: hostProject.integrations_digest,
        principal: 'principal-1',
        configRevision: config.config_revision,
        permittedOperations: ['runtime.read'],
      },
      services: {
        resolveIdentity: () => {
          serviceCalls += 1;
          return identity();
        },
        verifyApproval: () => {
          serviceCalls += 1;
          return null;
        },
        runtimeRevision: () => {
          serviceCalls += 1;
          return { sourceRevision: 'source-1', currentRevision: 1 };
        },
        casWriter: () => {
          serviceCalls += 1;
          return { applied: true };
        },
      },
    };
    await Promise.resolve(
      expect(Promise.resolve(invokeUntrusted(createTrustedHostComposition, [input]))).rejects.toThrow(
        /launcher capability is required/,
      ),
    );
    await assert.rejects(
      () => createTrustedHostComposition(createTestTrustedHostLauncherCapability(input)),
      /trusted host governance capability is required for composition/,
    );
    expect(serviceCalls).toBe(0);
    if (!nativeNoFollowAvailable) {
      const composition = await composeTrustedHost(input);
      expect(composition.schema).toBe('TrustedHostComposition/v1');
      expect(serviceCalls).toBe(0);
      return;
    }
    const composition = await composeTrustedHost(input);
    expect(composition.schema).toBe('TrustedHostComposition/v1');
    expect(composition.authentication).toMatchObject({
      repositoryRoot,
      repositoryId: config.repository.repository_id,
      projectIds: config.projects.map((entry) => entry.project_id).sort(),
      integrationsDigest: hostProject.integrations_digest,
      principal: 'principal-1',
      configRevision: config.config_revision,
    });
    expect(composition.authentication.permittedOperations).toEqual(['runtime.read']);
    expect(composition.runtimeKernel).toBeDefined();
    let observed: Awaited<ReturnType<typeof composition.runtimeKernel.readConfig>> | undefined;
    await assert.doesNotReject(async () => {
      observed = await composition.runtimeKernel.readConfig();
    });
    assert.ok(observed);
    expect(runtimeConfigDigest(observed)).toBe(runtimeConfigDigest(config));
    expect(composition.workflowHostCapability).toBeNull();
    await Promise.resolve(
      expect(
        Promise.resolve().then(() => composition.runtimeKernel.evaluateGovernance('runtime.write', {})),
      ).rejects.toThrow('trusted host operation is not permitted: runtime.write'),
    );
    await Promise.resolve(
      expect(
        Promise.resolve().then(() =>
          invokeUntrusted(composition.runtimeKernel.runGovernedWrite, composition.runtimeKernel, [{}]),
        ),
      ).rejects.toThrow('trusted host operation is not permitted: runtime.write'),
    );
    expect(serviceCalls).toBe(0);
  });
  test('trusted host composition reaches a governed write through bound services', async () => {
    const fixture = evidence();
    let identityCalls = 0;
    let approvalCalls = 0;
    let writeCalls = 0;
    const input: TrustedHostCompositionInput = {
      authentication: {
        schema: 'TrustedHostAuthentication/v1',
        repositoryRoot,
        repositoryId: config.repository.repository_id,
        projectIds: config.projects.map((entry) => entry.project_id).sort(),
        integrationsDigest: hostProject.integrations_digest,
        principal: 'principal-1',
        configRevision: config.config_revision,
        permittedOperations: ['runtime.write'],
      },
      services: {
        resolveIdentity: () => {
          identityCalls += 1;
          return identity();
        },
        verifyApproval: () => {
          approvalCalls += 1;
          return fixture.verifiedApproval;
        },
        runtimeRevision: () => ({ sourceRevision: 'source-1', currentRevision: 1 }),
        casWriter: (request) => {
          writeCalls += 1;
          return { applied: true, path: request.payload.path };
        },
      },
    };
    const reservationPath = path.join(
      repositoryRoot,
      config.control.work_root,
      'runtime-reservations',
      createHash('sha256').update(fixture.approval.operation_hash).digest('hex') + '.json',
    );
    try {
      if (!nativeNoFollowAvailable) {
        const composition = await composeTrustedHost(input);
        expect(composition.schema).toBe('TrustedHostComposition/v1');
        return;
      }
      const composition = await composeTrustedHost(input, true);
      await Promise.resolve(
        expect(composition.runtimeKernel.runGovernedWrite(fixture.input)).resolves.toEqual({
          applied: true,
          path: fixture.input.intent.payload.path,
        }),
      );
      expect(identityCalls).toBe(1);
      expect(approvalCalls).toBe(1);
      expect(writeCalls).toBe(1);
      const denied = await composeTrustedHost({
        ...input,
        services: {
          ...input.services,
          resolveIdentity: () => {
            identityCalls += 1;
            return null;
          },
        },
      });
      await assert.rejects(
        () => denied.runtimeKernel.runGovernedWrite(fixture.input),
        (error: unknown) => {
          assert.ok(error instanceof Error);
          expect(error.message).toBe('governed write identity or project authorization was rejected');
          assert.ok(error.cause instanceof Error);
          expect(error.cause.message).toBe('trusted authenticated identity context is unavailable');
          return true;
        },
      );
      expect(identityCalls).toBe(2);
      expect(approvalCalls).toBe(1);
      expect(writeCalls).toBe(1);
    } finally {
      await Promise.all([
        rm(reservationPath, { force: true }),
        rm(reservationPath + '.terminal', { force: true }),
        rm(reservationPath + '.final', { force: true }),
      ]);
    }
  });
  test.skipIf(!nativeNoFollowAvailable)(
    'failed kernel initialization preserves the launcher for a healthy retry',
    async () => {
      const root = await createRuntimeRepositoryRoot();
      let passed = false;
      try {
        const configPath = path.join(root, 'agent-runtime.config.v1.yaml');
        const original = await readFile(configPath, 'utf8');
        const invalid = original.replace('permit (principal, action, resource) when', 'permit invalid syntax when');
        expect(invalid).not.toBe(original);
        await writeFile(configPath, invalid);
        const current = loadRuntimeConfig(root);
        expect(current.authorization.cedar.policy).toContain('permit invalid syntax when');
        const projects = current.projects.map((entry) => entry.project_id).sort();
        const context = loadProjectSetContext(root, current, current.repository.repository_id, projects);
        const events: RuntimeTimingEvent[] = [];
        let ticks = 0n;
        let serviceCalls = 0;
        const unexpectedService = (): never => {
          serviceCalls += 1;
          throw new Error('failed or readonly kernel must not call write services');
        };
        const capability = trustedHostCapability({
          authentication: {
            schema: 'TrustedHostAuthentication/v1',
            repositoryRoot: root,
            repositoryId: current.repository.repository_id,
            projectIds: projects,
            integrationsDigest: context.integrations_digest,
            principal: 'principal-1',
            configRevision: current.config_revision,
            permittedOperations: ['runtime.read'],
          },
          services: {
            resolveIdentity: unexpectedService,
            verifyApproval: unexpectedService,
            runtimeRevision: unexpectedService,
            casWriter: unexpectedService,
            clock: { monotonicNs: () => (ticks += 1_000_000n) },
            timingSink: {
              record: (event) => {
                events.push(event);
              },
            },
          },
        });
        await assert.rejects(() => createTrustedHostComposition(capability), /configured Cedar policy is invalid/);
        expect(events).toMatchObject([{ operation: 'createRuntimeKernel', outcome: 'error', elapsed_ms: 1 }]);
        expect(serviceCalls).toBe(0);
        await writeFile(configPath, original);
        let composition: Awaited<ReturnType<typeof createTrustedHostComposition>> | undefined;
        await assert.doesNotReject(async () => {
          composition = await createTrustedHostComposition(capability);
        });
        assert.ok(composition);
        const initialized = composition;
        await assert.doesNotReject(() => initialized.runtimeKernel.readConfig());
        expect(events.map(({ operation, outcome, elapsed_ms }) => ({ operation, outcome, elapsed_ms }))).toEqual([
          { operation: 'createRuntimeKernel', outcome: 'error', elapsed_ms: 1 },
          { operation: 'createRuntimeKernel', outcome: 'success', elapsed_ms: 1 },
          { operation: 'readConfig', outcome: 'success', elapsed_ms: 1 },
        ]);
        await assert.rejects(() => createTrustedHostComposition(capability), /launcher capability/);
        expect(serviceCalls).toBe(0);
        passed = true;
      } finally {
        if (passed) {
          console.log('Removing owned kernel initialization fixture: ' + root);
          await rm(root, { recursive: true, force: true }).catch((error: unknown) => {
            console.error('Retained or uncertain kernel initialization fixture after cleanup failure: ' + root);
            throw error;
          });
          console.log('Removed owned kernel initialization fixture: ' + root);
        } else console.error('Retained failed kernel initialization fixture: ' + root);
      }
    },
  );

  test('trusted launcher capability snapshots context and consumes only after success', async () => {
    const mutableAuthentication: {
      schema: 'TrustedHostAuthentication/v1';
      repositoryRoot: string;
      repositoryId: string;
      projectIds: string[];
      integrationsDigest: string;
      principal: string;
      configRevision: number;
      permittedOperations: TrustedHostOperation[];
    } = {
      schema: 'TrustedHostAuthentication/v1',
      repositoryRoot,
      repositoryId: config.repository.repository_id,
      projectIds: config.projects.map((entry) => entry.project_id).sort(),
      integrationsDigest: hostProject.integrations_digest,
      principal: 'principal-1',
      configRevision: config.config_revision,
      permittedOperations: ['runtime.read'],
    };
    const originalResolver = () => null;
    const mutableServices = {
      resolveIdentity: originalResolver,
      verifyApproval: () => null,
      runtimeRevision: () => ({ sourceRevision: 'source-1', currentRevision: 1 }),
      casWriter: () => ({ applied: true }),
    };
    const capability = trustedHostCapability({ authentication: mutableAuthentication, services: mutableServices });
    mutableAuthentication.principal = 'mutated-principal';
    mutableAuthentication.permittedOperations.push('runtime.write');
    mutableServices.resolveIdentity = () => {
      throw new Error('mutated service must not be captured');
    };
    if (!nativeNoFollowAvailable) {
      const composition = await createTrustedHostComposition(capability);
      expect(composition.authentication.principal).toBe('principal-1');
      return;
    }
    const composition = await createTrustedHostComposition(capability);
    expect(composition.authentication.principal).toBe('principal-1');
    expect(composition.authentication.permittedOperations).toEqual(['runtime.read']);
    await Promise.resolve(expect(createTrustedHostComposition(capability)).rejects.toThrow(/launcher capability/));
  });
  test('derives workflow store namespaces from authenticated context', async () => {
    if (!nativeNoFollowAvailable) return;
    const root = await createRuntimeRepositoryRoot();
    try {
      const isolatedConfig = loadRuntimeConfig(root);
      const isolatedProjectSet = loadProjectSetContext(
        root,
        isolatedConfig,
        isolatedConfig.repository.repository_id,
        isolatedConfig.projects.map((entry) => entry.project_id).sort(),
      );
      const baseInput: TrustedHostCompositionInput = {
        authentication: {
          schema: 'TrustedHostAuthentication/v1',
          repositoryRoot: root,
          repositoryId: isolatedConfig.repository.repository_id,
          projectIds: isolatedConfig.projects.map((entry) => entry.project_id).sort(),
          integrationsDigest: isolatedProjectSet.integrations_digest,
          principal: 'principal-1',
          configRevision: isolatedConfig.config_revision,
          permittedOperations: ['workflow'],
        },
        services: {
          resolveIdentity: () => null,
          verifyApproval: () => null,
          runtimeRevision: () => ({ sourceRevision: 'source-1', currentRevision: 1 }),
          casWriter: () => ({ applied: true }),
        },
      };
      const first = await createTrustedHostComposition(
        trustedHostCapability(Object.assign({}, baseInput, { workflowStoreId: 'caller-store-a' })),
      );
      const second = await createTrustedHostComposition(
        trustedHostCapability(Object.assign({}, baseInput, { workflowStoreId: 'caller-store-b' })),
      );
      expect(first.workflowHostCapability?.storeId).toMatch(/^trusted-[a-f0-9]{32}$/);
      expect(second.workflowHostCapability?.storeId).toBe(first.workflowHostCapability?.storeId);
      expect(first.workflowHostCapability?.storeId).not.toBe('caller-store-a');
      expect(second.workflowHostCapability?.storeId).not.toBe('caller-store-b');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
  test.skipIf(!nativeNoFollowAvailable)(
    'trusted host rejects stale configuration before invoking authenticated services',
    async () => {
      let serviceCalls = 0;
      const services = {
        resolveIdentity: () => {
          serviceCalls += 1;
          return identity();
        },
        verifyApproval: () => {
          serviceCalls += 1;
          return null;
        },
        runtimeRevision: () => {
          serviceCalls += 1;
          return { sourceRevision: 'source-1', currentRevision: 1 };
        },
        casWriter: () => {
          serviceCalls += 1;
          return { applied: true };
        },
      };

      await Promise.resolve(
        expect(
          composeTrustedHost({
            authentication: {
              schema: 'TrustedHostAuthentication/v1',
              repositoryRoot,
              repositoryId: config.repository.repository_id,
              projectIds: config.projects.map((entry) => entry.project_id).sort(),
              integrationsDigest: hostProject.integrations_digest,
              principal: 'principal-1',
              configRevision: config.config_revision + 1,
              permittedOperations: ['runtime.read'],
            },
            services,
          }),
        ).rejects.toThrow(/stale|forged/),
      );
      expect(serviceCalls).toBe(0);
    },
  );
  test.skipIf(!nativeNoFollowAvailable)('trusted host rejects wrong repository and project contexts', async () => {
    let serviceCalls = 0;
    const services = {
      resolveIdentity: () => {
        serviceCalls += 1;
        return identity();
      },
      verifyApproval: () => {
        serviceCalls += 1;
        return null;
      },
      runtimeRevision: () => {
        serviceCalls += 1;
        return { sourceRevision: 'source-1', currentRevision: 1 };
      },
      casWriter: () => {
        serviceCalls += 1;
        return { applied: true };
      },
    };
    const invalidContexts: TrustedAuthentication[] = [
      {
        schema: 'TrustedHostAuthentication/v1',
        repositoryRoot: path.join(repositoryRoot, 'not-a-repository'),
        repositoryId: config.repository.repository_id,
        projectIds: config.projects.map((entry) => entry.project_id).sort(),
        integrationsDigest: hostProject.integrations_digest,
        principal: 'principal-1',
        configRevision: config.config_revision,
        permittedOperations: ['runtime.read'],
      },
      {
        schema: 'TrustedHostAuthentication/v1',
        repositoryRoot,
        repositoryId: config.repository.repository_id,
        projectIds: ['not-configured'],
        integrationsDigest: hostProject.integrations_digest,
        principal: 'principal-1',
        configRevision: config.config_revision,
        permittedOperations: ['runtime.read'],
      },
      {
        schema: 'TrustedHostAuthentication/v1',
        repositoryRoot,
        repositoryId: 'not-configured',
        projectIds: project.project_ids,
        integrationsDigest: project.integrations_digest,
        principal: 'principal-1',
        configRevision: config.config_revision,
        permittedOperations: ['runtime.read'],
      },
    ];
    for (const authentication of invalidContexts) {
      await Promise.resolve(
        expect(composeTrustedHost({ authentication, services })).rejects.toThrow(/configured|config|repository|root/i),
      );
    }
    expect(serviceCalls).toBe(0);
  });
  test.skipIf(!nativeNoFollowAvailable)(
    'does not resolve identity when the governed intent is outside the project scope',
    async () => {
      for (const overrides of [
        { tenant: 'other-tenant', resourceTenant: 'other-tenant' },
        { project: 'other-project', resourceProject: 'other-project' },
      ]) {
        const fixture = evidence(overrides);
        let identityCalls = 0;
        let approvalCalls = 0;
        let writeCalls = 0;
        const kernel = await createRuntimeKernel(
          repositoryRoot,
          host({
            resolveIdentity: () => {
              identityCalls += 1;
              return identity();
            },
            verifyApproval: () => {
              approvalCalls += 1;
              return fixture.verifiedApproval;
            },
            casWriter: () => {
              writeCalls += 1;
              return { applied: true };
            },
          }),
        );

        await Promise.resolve(expect(kernel.runGovernedWrite(fixture.input)).rejects.toThrow());
        expect(identityCalls).toBe(0);
        expect(approvalCalls).toBe(0);
        expect(writeCalls).toBe(0);
      }
    },
  );

  test.skipIf(!nativeNoFollowAvailable)(
    'rejects null and malformed trusted identities before approval verification',
    async () => {
      const fixture = evidence();
      const invalidIdentities: Array<TrustedProjectIdentity | null> = [
        null,
        invalidIdentity('schema', 'TrustedProjectIdentity/v2'),
        invalidIdentity('source', 'untrusted-context'),
        invalidIdentity('tenant', 'other-tenant'),
        invalidIdentity('project', 'other-project'),
        invalidIdentity('registry_hash', 'b'.repeat(64)),
      ];

      for (const invalidIdentity of invalidIdentities) {
        let approvalCalls = 0;
        let writeCalls = 0;
        const kernel = await createRuntimeKernel(
          repositoryRoot,
          host({
            resolveIdentity: () => invalidIdentity,
            verifyApproval: () => {
              approvalCalls += 1;
              return fixture.verifiedApproval;
            },
            casWriter: () => {
              writeCalls += 1;
              return { applied: true };
            },
          }),
        );
        await Promise.resolve(expect(kernel.runGovernedWrite(fixture.input)).rejects.toThrow());
        expect(approvalCalls).toBe(0);
        expect(writeCalls).toBe(0);
      }
    },
  );

  test('keeps required host-field errors at their validation boundary', () => {
    const base: RuntimeKernelHostBindings = {
      repositoryRoot,
      repositoryId: config.repository.repository_id,
      projectIds: config.projects.map((entry) => entry.project_id).sort(),
      integrationsDigest: hostProject.integrations_digest,
      resolveIdentity: () => null,
      verifyApproval: () => null,
      runtimeRevision: () => ({ sourceRevision: 'source-1', currentRevision: 1 }),
      casWriter: () => null,
    };
    for (const [field, message, invalid] of [
      ['repositoryRoot', 'runtime kernel host repository root is required'],
      ['repositoryId', 'runtime kernel host repository id is required'],
      ['projectIds', 'runtime kernel host project ids are required', []],
      ['integrationsDigest', 'runtime kernel host integrations digest is required'],
    ] as const) {
      const value = invalid === undefined ? '' : invalid;
      expect(() => invokeUntrusted(createRuntimeKernelHost, [{ ...base, [field]: value }])).toThrow(message);
      if (typeof value === 'string')
        expect(() => invokeUntrusted(createRuntimeKernelHost, [{ ...base, [field]: '   ' }])).toThrow(message);
    }
    expect(() => invokeUntrusted(createRuntimeKernelHost, [null])).toThrow('runtime kernel host bindings are required');
    expect(() => invokeUntrusted(createRuntimeKernelHost, [0])).toThrow('runtime kernel host bindings are required');
    for (const projectIds of malformedProjectIdLists)
      expect(() => invokeUntrusted(createRuntimeKernelHost, [{ ...base, projectIds }])).toThrow(
        'runtime kernel host project ids must be sorted',
      );
  });
  test('rejects malformed host callbacks before creating a trusted host', () => {
    const base = hostBindings();
    for (const [field, message] of [
      ['resolveIdentity', 'runtime kernel host identity resolver is required'],
      ['verifyApproval', 'runtime kernel host approval verifier is required'],
      ['runtimeRevision', 'runtime kernel host revision provider is required'],
      ['casWriter', 'runtime kernel host CAS writer is required'],
    ] as const) {
      expect(() => invokeUntrusted(createRuntimeKernelHost, [{ ...base, [field]: undefined }])).toThrow(message);
    }
  });
  test('rejects a non-absolute host repository root before creating a trusted host', () => {
    expect(() => createRuntimeKernelHost({ ...hostBindings(), repositoryRoot: 'relative-root' })).toThrow(
      /absolute repository root|GAP-RTNEW-PATH-PROFILE-001/i,
    );
  });

  test('compares canonical host roots using the active platform semantics', () => {
    const caseVariant = repositoryRoot.toUpperCase();
    if (process.platform === 'win32') {
      expect(compareRuntimeKernelRepositoryRoots(caseVariant, repositoryRoot)).toBe(true);
    }

    const descriptor = Object.getOwnPropertyDescriptor(process, 'platform');
    if (descriptor === undefined) throw new Error('process platform descriptor is required by this test');
    Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
    try {
      expect(compareRuntimeKernelRepositoryRoots(repositoryRoot, repositoryRoot)).toBe(true);
      expect(compareRuntimeKernelRepositoryRoots(caseVariant, repositoryRoot)).toBe(caseVariant === repositoryRoot);
    } finally {
      Object.defineProperty(process, 'platform', descriptor);
    }
  });

  test('rejects stale runtime configuration snapshots', () => {
    const digest = runtimeConfigDigest(config);
    expect(() => assertRuntimeConfigUnchanged(config, digest)).not.toThrow();
    const changed = { ...config, control: { ...config.control, work_root: config.control.work_root + '-changed' } };
    expect(() => assertRuntimeConfigUnchanged(changed, digest)).toThrow(
      'runtime configuration changed after composition',
    );
    expect(() => readStableRuntimeConfig(repositoryRoot, '0'.repeat(64))).toThrow(
      'runtime configuration changed after composition',
    );
  });
  test('local admission requires every implementation path in its persisted file claim', () =>
    withAutomaticWorkAdmissionCase(async ({ createFixture }) => {
      const { fixture, identity, nativeSessionHandle } = await prepareAdmittedSessionFixture(
        'local-file-claim-' + randomUUID(),
        createFixture(false, true),
      );
      const before = fixture.store.readHostStateSnapshot(identity);
      assert.ok(before.work?.lease && before.ledger);
      const workRow = fixture.database.query<{ payload: string; digest: string }, []>(
        "SELECT payload,digest FROM agent_host_state WHERE kind='work'",
      );
      const workBefore = workRow.get();
      assert.ok(workBefore);
      const ticketId = before.work.lease.ticket_id;
      expect(before.work.binding.implementation_paths).toEqual(['AGENT.sidecar.md']);
      const request = { repositoryRoot: fixture.root, identity, store: fixture.store, nativeSessionHandle };
      for (const resources of [
        ['file:AGENT.sidecar.md'],
        ['execution:' + identity.work_id],
        ['file:AGENT.sidecar.md', 'execution:' + identity.work_id],
      ]) {
        const ledger: CoordinationLedger = {
          ...before.ledger,
          tickets: before.ledger.tickets.map((entry) =>
            entry.ticket_id === ticketId
              ? {
                  ...entry,
                  contour_keys: ['file:AGENT.sidecar.md', 'execution:' + identity.work_id],
                  exclusive_resources: ['file:AGENT.sidecar.md', 'execution:' + identity.work_id],
                  active_resources: resources,
                }
              : entry,
          ),
          claims: before.ledger.claims.map((entry) => (entry.ticket_id === ticketId ? { ...entry, resources } : entry)),
        };
        const encoded = canonicalJson(ledger);
        expect(parseCoordinationLedgerJson(encoded)).toEqual(ledger);
        fixture.database
          .query("UPDATE agent_host_state SET payload=?,digest=? WHERE kind='ledger'")
          .run(encoded, canonicalJsonDigest(ledger));
        if (resources.includes('file:AGENT.sidecar.md')) {
          let admitted: ReturnType<typeof requireLiveLocalSessionAdmission> | undefined;
          assert.doesNotThrow(() => {
            admitted = requireLiveLocalSessionAdmission(request);
          });
          expect(admitted?.workVersion).toEqual(before.workVersion);
          expect(admitted?.ledger).toEqual(ledger);
        } else {
          expect(() => requireLiveLocalSessionAdmission(request)).toThrow('work lease is blocked or incomplete');
        }
        expect(workRow.get()).toEqual(workBefore);
        const ledgerRow = fixture.database
          .query<{ payload: string; digest: string }, []>(
            "SELECT payload,digest FROM agent_host_state WHERE kind='ledger'",
          )
          .get();
        expect(ledgerRow).toEqual({ payload: encoded, digest: canonicalJsonDigest(ledger) });
      }
    }));
  test('denies an expired lease before reading malformed current configuration', async () => {
    const { fixture, identity, nativeSessionHandle } = await prepareAdmittedSessionFixture('preflight-expired-lease');
    try {
      const ledgerRow = fixture.database
        .query<{ payload: string }, []>("SELECT payload FROM agent_host_state WHERE kind='ledger'")
        .get();
      if (!ledgerRow) throw new Error('lease fixture has no persisted coordination ledger');
      const ledger = parseCoordinationLedgerJson(ledgerRow.payload);
      const ticket = ledger.tickets.find((entry) => entry.work_id === identity.work_id);
      if (!ticket) throw new Error('lease fixture has no coordination ticket');
      const expiredAt = '2020-01-01T00:00:00.000Z';
      const expiredLedger: CoordinationLedger = {
        ...ledger,
        tickets: ledger.tickets.map((entry) =>
          entry.ticket_id === ticket.ticket_id ? { ...entry, expires_at: expiredAt } : entry,
        ),
        claims: ledger.claims.map((entry) =>
          entry.ticket_id === ticket.ticket_id ? { ...entry, lease_expires_at: expiredAt } : entry,
        ),
      };
      fixture.database
        .query("UPDATE agent_host_state SET payload=?,digest=? WHERE kind='ledger'")
        .run(canonicalJson(expiredLedger), canonicalJsonDigest(expiredLedger));
      await writeFile(path.join(fixture.root, 'agent-runtime.config.v1.yaml'), 'invalid: [configuration');

      expect(() =>
        requireLiveLocalSessionAdmission({
          repositoryRoot: fixture.root,
          identity,
          store: fixture.store,
          nativeSessionHandle,
        }),
      ).toThrow('local workflow admission or exact-path lease is stale');
    } finally {
      fixture.close();
    }
  });
  test('still compares a live lease with current configuration', async () => {
    const { fixture, identity, nativeSessionHandle } =
      await prepareAdmittedSessionFixture('preflight-live-config-drift');
    try {
      const configPath = path.join(fixture.root, 'agent-runtime.config.v1.yaml');
      const configText = await readFile(configPath, 'utf8');
      await writeFile(
        configPath,
        configText.replace(
          /config_revision: (\d+)/,
          (_match, revision: string) => `config_revision: ${Number(revision) + 1}`,
        ),
      );

      expect(() =>
        requireLiveLocalSessionAdmission({
          repositoryRoot: fixture.root,
          identity,
          store: fixture.store,
          nativeSessionHandle,
        }),
      ).toThrow('local workflow admission or exact-path lease is stale');
    } finally {
      fixture.close();
    }
  });
  test.skipIf(!nativeNoFollowAvailable)(
    'rechecks the composed configuration before governance evaluation',
    async () => {
      const root = await createRuntimeRepositoryRoot();
      try {
        const isolatedConfig = loadRuntimeConfig(root);
        const isolatedProject = loadProjectContext(
          root,
          isolatedConfig,
          isolatedConfig.repository.repository_id,
          firstProjectId(isolatedConfig.projects.map((entry) => entry.project_id)),
        );
        const isolatedHost = createRuntimeKernelHost({
          repositoryRoot: root,
          repositoryId: isolatedConfig.repository.repository_id,
          projectIds: [firstProjectId(isolatedProject.project_ids)],
          integrationsDigest: isolatedProject.integrations_digest,
          resolveIdentity: () => null,
          verifyApproval: () => null,
          runtimeRevision: () => ({ sourceRevision: 'source-1', currentRevision: 1 }),
          casWriter: () => ({ applied: true }),
        });
        const kernel = await createRuntimeKernel(root, isolatedHost);
        const authorityText = await readFile(path.join(root, 'agent-runtime.config.v1.yaml'), 'utf8');
        await writeFile(
          path.join(root, 'agent-runtime.config.v1.yaml'),
          authorityText.replace(
            /config_revision: (\d+)/,
            (_match, revision) => 'config_revision: ' + (Number(revision) + 1),
          ),
          'utf8',
        );
        await Promise.resolve(
          expect(kernel.evaluateGovernance('runtime.read', {})).rejects.toThrow(
            'runtime configuration changed after composition',
          ),
        );
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  );
  test('composition-root authentication proofs are single-use', () => {
    const proof = createRuntimeKernelHostProofForCompositionRoot(hostBindings());
    expect(() => createRuntimeKernelHostWithProof(proof)).not.toThrow();
    expect(() => createRuntimeKernelHostWithProof(proof)).toThrow(/authentication proof/);
  });
  test('rejects malformed composition proofs before exposing a host', () => {
    const candidates: unknown[] = [null, {}, Object.freeze({ schema: 'RuntimeKernelHostProof/v1' })];
    for (const candidate of candidates) {
      expect(() => invokeUntrusted(createRuntimeKernelHostWithProof, [candidate])).toThrow(/authentication proof/);
    }
  });
  test('rejects structurally copied composition proofs while accepting the original identity', () => {
    const proof = createRuntimeKernelHostProofForCompositionRoot(hostBindings());
    const copiedProof = Object.freeze({ ...proof });

    expect(() => invokeUntrusted(createRuntimeKernelHostWithProof, [copiedProof])).toThrow(/authentication proof/);
    expect(() => createRuntimeKernelHostWithProof(proof)).not.toThrow();
  });
  test('rejects forged trusted-host authentication before any service callback', () => {
    const callbacks = {
      resolveIdentity: () => {
        throw new Error('identity callback must not run');
      },
      verifyApproval: () => {
        throw new Error('approval callback must not run');
      },
      runtimeRevision: () => {
        throw new Error('revision callback must not run');
      },
      casWriter: () => {
        throw new Error('CAS callback must not run');
      },
    };
    const valid: TrustedAuthentication = {
      schema: 'TrustedHostAuthentication/v1',
      repositoryRoot,
      repositoryId: config.repository.repository_id,
      projectIds: config.projects.map((entry) => entry.project_id).sort(),
      integrationsDigest: hostProject.integrations_digest,
      principal: 'principal-1',
      configRevision: config.config_revision,
      permittedOperations: ['runtime.read'],
    };
    const invalidAuthentications: unknown[] = [
      { ...valid, schema: 'TrustedHostAuthentication/v2' },
      { ...valid, repositoryRoot: '' },
      { ...valid, repositoryId: '' },
      { ...valid, projectIds: [] },
      ...malformedProjectIdLists.map((projectIds) => ({ ...valid, projectIds })),
      { ...valid, integrationsDigest: '' },
      { ...valid, principal: '' },
      { ...valid, configRevision: 0 },
      { ...valid, configRevision: 1.5 },
      { ...valid, permittedOperations: ['runtime.read', 'runtime.read'] },
      { ...valid, permittedOperations: ['runtime.admin'] },
    ];
    for (const authentication of invalidAuthentications) {
      expect((): unknown => invokeUntrusted(trustedHostCapability, [{ authentication, services: callbacks }])).toThrow(
        /schema|repository|tenant|project|integration|principal|config revision|permitted operations/i,
      );
    }
  });
  test('rejects stale trusted-host configuration before loading project services', async () => {
    let serviceCalls = 0;
    const services = {
      resolveIdentity: () => {
        serviceCalls += 1;
        return identity();
      },
      verifyApproval: () => {
        serviceCalls += 1;
        return null;
      },
      runtimeRevision: () => {
        serviceCalls += 1;
        return { sourceRevision: 'source-1', currentRevision: 1 };
      },
      casWriter: () => {
        serviceCalls += 1;
        return { applied: true };
      },
    };
    const authentication: TrustedAuthentication = {
      schema: 'TrustedHostAuthentication/v1',
      repositoryRoot,
      repositoryId: config.repository.repository_id,
      projectIds: config.projects.map((entry) => entry.project_id).sort(),
      integrationsDigest: hostProject.integrations_digest,
      principal: 'principal-1',
      configRevision: config.config_revision + 1,
      permittedOperations: ['runtime.read'],
    };
    await Promise.resolve(
      expect(createTrustedHostComposition(trustedHostCapability({ authentication, services }))).rejects.toThrow(
        /configuration revision is stale or forged/i,
      ),
    );
    expect(serviceCalls).toBe(0);
  });
  test('test-only composition proof issuer refuses production mode', () => {
    const previousNodeEnvironment = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      expect(() => createRuntimeKernelHostProofForCompositionRoot(hostBindings())).toThrow(
        /test-only trusted host issuer is unavailable outside a test process/,
      );
    } finally {
      if (previousNodeEnvironment === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousNodeEnvironment;
    }
  });
  test.each([
    ['NODE_ENV test', 'test', undefined, undefined, true],
    ['no process marker', undefined, undefined, undefined, false],
    ['VITEST alone', undefined, 'true', undefined, true],
    ['BUN_TEST alone', undefined, undefined, '1', true],
    ['production with test markers', 'production', 'true', '1', false],
  ] as const)('test-only composition proof issuer gate: %s', (_label, nodeEnv, vitest, bunTest, accepted) => {
    const previous = {
      NODE_ENV: process.env.NODE_ENV,
      VITEST: process.env.VITEST,
      BUN_TEST: process.env.BUN_TEST,
    };
    try {
      for (const [key, value] of Object.entries({ NODE_ENV: nodeEnv, VITEST: vitest, BUN_TEST: bunTest })) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
      if (accepted) expect(() => createRuntimeKernelHostProofForCompositionRoot(hostBindings())).not.toThrow();
      else
        expect(() => createRuntimeKernelHostProofForCompositionRoot(hostBindings())).toThrow(
          /test-only trusted host issuer is unavailable outside a test process/,
        );
    } finally {
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });
  test('rejects forged workflow capabilities before inspecting requests', async () => {
    let inspected = false;
    const request = new Proxy(
      {},
      {
        ownKeys() {
          inspected = true;
          return [];
        },
        get() {
          inspected = true;
          return undefined;
        },
      },
    );
    await Promise.resolve(
      expect(Promise.resolve(invokeUntrusted(prepareWorkflowExecution, [{}, request]))).rejects.toThrow(
        /opaque host capability/,
      ),
    );
    await Promise.resolve(
      expect(
        Promise.resolve(invokeUntrusted(dispatchWorkflowAssignment, [Object.create(null), request])),
      ).rejects.toThrow(/opaque host capability/),
    );
    expect(inspected).toBe(false);
  });
});
