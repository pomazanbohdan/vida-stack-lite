import { prewriterProjectionFixture, configuredFrontierRepairFixture } from './helpers/configured-frontier-fixture.ts';
import { afterEach, test, expect } from 'bun:test';
import { Database } from 'bun:sqlite';
import { createStep, createWorkflow } from '@mastra/core/workflows';
import { Mastra } from '@mastra/core/mastra';
import { LibSQLStore } from '@mastra/libsql';
import z from 'zod';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { pinnedEnvironment, boundedSpawnSync, executionBudget } from '../bin/bun.ts';
import { createHash, randomUUID } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { runRuntimeCodeRebind, assertCommittedSourceChanges } from '../bin/runtime-code-rebind.ts';
import type { AgentRuntimeConfig, WorkItemSelection } from '../src/config/runtime-config.ts';
import type {
  CoordinationClaim,
  CoordinationLedger,
  CoordinationTicket,
  ContractReference,
  StateVersion,
  WorkIdentity,
  WorkState,
} from '../src/host-state.ts';
import { HostStateStore } from '../src/host-state.ts';
import type {
  FailedPrewriterRecoveryReceipt,
  FailedPrewriterTransitionRequest,
} from '../src/orchestration/failed-prewriter-transition.ts';
import type { MastraSessionLedgerState } from '../src/orchestration/persistent-session-handoff.ts';
import type { SessionBridgeObservation, SessionBridgeSnapshot } from '../src/orchestration/mastra-session-bridge.ts';
import type { SessionHandoffContext } from '../src/orchestration/session-handoff.ts';
import type { ConfiguredFrontierReceipt } from '../src/orchestration/delivered-work-continuation-repair.ts';
import type {
  ConfiguredRuntimeEndpointTransition,
  DeliveredWorkContinuationRequest,
  ClosedConfigRebindProof,
} from '../src/orchestration/delivered-work-continuation.ts';
import {
  canonicalJson,
  canonicalJsonAtDepth,
  canonicalJsonDigest,
  isPlainRecord,
  MAX_CANONICAL_BYTES,
} from '../src/contracts/public-ingress.ts';
import { validateLifecycleAggregate } from '../src/lifecycle/lifecycle-state.ts';
import {
  runtimeConfigDigest,
  loadRuntimeConfig,
  runtimePackageAccess,
  runtimePackageCodePaths,
} from '../src/config/runtime-config.ts';
import { loadProjectSetContext } from '../src/config/project-context.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';
import {
  parseSessionBridgeObservation,
  parseSessionBridgeRequest,
} from '../src/orchestration/mastra-session-bridge.ts';
import { validateFailedPrewriterRecoveryBasis } from '../src/orchestration/failed-prewriter-recovery.ts';
import { readConfiguredContinuationSessionEngineSnapshot } from '../src/orchestration/session-engine-snapshot.ts';
import {
  validateFailedPrewriterRecoveryReceipt,
  serializeFailedPrewriterRecoveryReceipt,
  failedPrewriterRecoveryDigest,
  configuredFrontierRecoveryViewDigest,
  effectiveConfiguredFrontier,
} from '../src/orchestration/failed-prewriter-transition.ts';
import {
  runtimeCodeContinuationProtectedWorkDigest,
  validateQualifiedRuntimeCodeContinuationRequest,
  validateQualifiedRuntimeCodeContinuationReceipt,
} from '../src/orchestration/qualified-runtime-code-continuation.ts';
import { transitionFailedPrewriter } from '../bin/transition-failed-prewriter.ts';
import { run as runAgent } from '../bin/run.ts';
import { acceptedContractSourceRevision } from '../src/orchestration/admitted-development-packet.ts';
import { expectHistorySnapshotAfterOwner } from './helpers/ledger-cache-observer.ts';
import { expectRejection } from './helpers/expect-rejection.ts';

type MutableCoordinationTicket = {
  -readonly [
    Key in keyof Omit<
      CoordinationTicket,
      'claim_ids' | 'exclusive_resources' | 'active_resources' | 'blocked_resources'
    >
  ]: CoordinationTicket[Key];
} & {
  claim_ids: string[];
  exclusive_resources: string[];
  active_resources: string[];
  blocked_resources: string[];
};
type MutableCoordinationClaim = {
  -readonly [Key in keyof Omit<CoordinationClaim, 'resources'>]: CoordinationClaim[Key];
} & { resources: string[] };
type MutableCoordinationLedger = Omit<
  CoordinationLedger,
  'revision' | 'next_sequence' | 'tickets' | 'claims' | 'operations'
> & {
  revision: number;
  next_sequence: number;
  tickets: MutableCoordinationTicket[];
  claims: MutableCoordinationClaim[];
  operations: Record<string, unknown>[];
};
type PrewriterConfiguredFrontierFixture = Omit<
  ReturnType<typeof configuredFrontierRepairFixture>,
  'prewriterBinding'
> & {
  prewriterBinding: Parameters<typeof continuationProjection.projectConfiguredPrewriterContinuationRequests>[0];
};

function mutableCoordinationLedger(ledger: CoordinationLedger): MutableCoordinationLedger {
  return {
    ...ledger,
    tickets: ledger.tickets.map((ticket) => ({
      ...ticket,
      claim_ids: [...ticket.claim_ids],
      exclusive_resources: [...ticket.exclusive_resources],
      active_resources: [...ticket.active_resources],
      blocked_resources: [...ticket.blocked_resources],
    })),
    claims: ledger.claims.map((claim) => ({ ...claim, resources: [...claim.resources] })),
    operations: ledger.operations.map((operation) => ({ ...operation })),
  };
}

/** Copy the synthetic builder's current v1 receipt into the writable shape needed by these test mutations. */
function mutableFrontierFixture(fixture: PrewriterConfiguredFrontierFixture) {
  const priorLedger = mutableCoordinationLedger(fixture.receipt.prior_ledger),
    successorLedger = mutableCoordinationLedger(fixture.receipt.successor_ledger);
  if (fixture.receipt.prior_ledger.operations === fixture.receipt.successor_ledger.operations)
    successorLedger.operations = priorLedger.operations;
  return {
    ...fixture,
    receipt: {
      ...fixture.receipt,
      prior_ledger: priorLedger,
      successor_ledger: successorLedger,
    },
    current: { ...fixture.current },
    ...(fixture.prewriterBinding ? { prewriterBinding: fixture.prewriterBinding } : {}),
  };
}

function requireFixtureValue<T>(value: T | null | undefined, label: string): T {
  if (value === null || value === undefined) throw new Error(`Fixture is missing ${label}`);
  return value;
}

function invokeUnknownBoundary(
  target: (...arguments_: never[]) => unknown,
  thisArgument: unknown,
  argumentsList: readonly unknown[],
): unknown {
  const result: unknown = Reflect.apply(target, thisArgument, [...argumentsList]);
  return result;
}

function assertFixtureValue<T>(value: T | null | undefined, label: string): asserts value is T {
  if (value === null || value === undefined) throw new Error(`Fixture is missing ${label}`);
}

function requireFixtureTextColumn(row: unknown, column: string): string {
  if (!isPlainRecord(row)) throw new Error(`Fixture query returned no row for ${column}`);
  const value: unknown = row[column];
  if (typeof value !== 'string') throw new Error(`Fixture row has no text value for ${column}`);
  return value;
}

function requireFixtureNumberColumn(row: unknown, column: string): number {
  if (!isPlainRecord(row)) throw new Error(`Fixture query returned no row for ${column}`);
  const value: unknown = row[column];
  if (typeof value !== 'number') throw new Error(`Fixture row has no numeric value for ${column}`);
  return value;
}

function requireFixturePayloadDigest(row: unknown): { payload: string; digest: string } {
  return {
    payload: requireFixtureTextColumn(row, 'payload'),
    digest: requireFixtureTextColumn(row, 'digest'),
  };
}

function requireFixtureJournalRow(row: unknown): { revision: number; payload: string; digest: string } {
  if (!isPlainRecord(row) || typeof row.revision !== 'number')
    throw new Error('Fixture journal query returned no numeric revision');
  return { revision: row.revision, ...requireFixturePayloadDigest(row) };
}

function requireSessionBridgeSnapshot(value: unknown): SessionBridgeSnapshot {
  if (!isPlainRecord(value)) throw new Error('Fixture bridge snapshot is not an object');
  const status = value.status;
  if (
    typeof value.run_id !== 'string' ||
    !(
      status === 'suspended' ||
      status === 'success' ||
      status === 'failed' ||
      status === 'canceled' ||
      status === 'unknown'
    ) ||
    !(value.step_id === null || typeof value.step_id === 'string') ||
    !Array.isArray(value.requests) ||
    !Array.isArray(value.observations)
  )
    throw new Error('Fixture bridge snapshot has an invalid shape');
  return {
    run_id: value.run_id,
    status,
    step_id: value.step_id,
    requests: value.requests.map((request) => parseSessionBridgeRequest(request)),
    observations: value.observations.map((observation) => parseSessionBridgeObservation(observation)),
  };
}

test('canonical envelope depth keeps exact ordinary component node and byte budgets', () => {
  const nodes = Array.from({ length: 9999 }, () => null);
  expect(canonicalJsonAtDepth(nodes, 2)).toBe(canonicalJson(nodes));
  expect(() => canonicalJsonAtDepth([...nodes, null], 2)).toThrow(/node budget/);
  const text = 'x'.repeat(MAX_CANONICAL_BYTES);
  expect(canonicalJsonAtDepth(text, 2).length).toBe(MAX_CANONICAL_BYTES + 2);
  expect(() => canonicalJsonAtDepth(text + 'x', 2)).toThrow(/byte budget/);
  for (const depth of [-1, 65, 0.5, Infinity])
    expect(() => canonicalJsonAtDepth(null, depth)).toThrow(/root depth invalid/);
});

test.each([0, 12])(
  'failed prewriter transition preserves the failed wave and original receipt while binding fresh current Source reviewers [shared ledger %i]',
  async (extraTickets) => {
    const { root, config, workspaceId, input } = configuredFrontierRepairHostRoot('normal');
    const priorLedger = input.receipt.prior_ledger,
      successorLedger = input.receipt.successor_ledger;
    const priorTicket = requireFixtureValue(priorLedger.tickets[0], 'prior coordination ticket'),
      priorClaim = requireFixtureValue(priorLedger.claims[0], 'prior coordination claim'),
      priorOperation = requireFixtureValue(priorLedger.operations[0], 'prior coordination operation');
    for (let index = 0; index < extraTickets; index++) {
      const resources = Array.from(
        { length: 64 },
        (_, item) => `file:unrelated/${index}/${String(item).padStart(3, '0')}.ts`,
      );
      const ticketId = `unrelated-ticket-${index}`,
        claimId = `unrelated-claim-${index}`,
        workId = `unrelated-work-${index}`;
      const ticket = {
        ...priorTicket,
        ticket_id: ticketId,
        claim_ids: [claimId],
        work_id: workId,
        thread_id: workId,
        sequence: priorLedger.next_sequence++,
        exclusive_resources: resources,
      };
      const claim = {
        ...priorClaim,
        claim_id: claimId,
        ticket_id: ticketId,
        work_id: workId,
        thread_id: workId,
        resources,
      };
      const release = {
        ...priorOperation,
        operation_id: `unrelated-release-${index}`,
        ticket_id: ticketId,
        work_id: workId,
        thread_id: workId,
        resources,
        from_ledger_revision: priorLedger.revision,
        to_ledger_revision: ++priorLedger.revision,
      };
      priorLedger.tickets.push(ticket);
      priorLedger.claims.push(claim);
      priorLedger.operations.push(release);
      successorLedger.tickets.splice(-1, 0, ticket);
      successorLedger.claims.splice(-1, 0, claim);
      if (successorLedger.operations !== priorLedger.operations) successorLedger.operations.push(release);
    }
    successorLedger.revision = priorLedger.revision + 1;
    const finalTicket = requireFixtureValue(successorLedger.tickets.at(-1), 'successor coordination ticket');
    finalTicket.sequence = priorLedger.next_sequence;
    successorLedger.next_sequence = priorLedger.next_sequence + 1;
    const ledgerBeforeVersion: StateVersion = {
      revision: priorLedger.revision,
      digest: canonicalJsonDigest(priorLedger),
    };
    input.receipt.prior_ledger_version = ledgerBeforeVersion;
    input.receipt.ledger_version = { revision: successorLedger.revision, digest: canonicalJsonDigest(successorLedger) };
    input.receipt.request = { ...input.receipt.request, expectedLedger: ledgerBeforeVersion };
    const referencePairs: readonly (readonly [
      'implementation_scope' | 'acceptance_manifest',
      WorkState['contracts']['scope'],
    ])[] = [
      ['implementation_scope', input.receipt.prior_work.contracts.scope],
      ['acceptance_manifest', input.receipt.prior_work.contracts.acceptance],
    ];
    const references: WorkState['lifecycle']['references'] = referencePairs.map(([kind, ref]) => ({
      schema: 'LifecycleArtifactReference/v1',
      kind,
      artifact_schema: ref.schema,
      record_id: kind,
      path: ref.path,
      sha256: ref.sha256,
      source_revision: input.receipt.prior_work.binding.work_source_revision,
      scope_id: input.receipt.prior_work.binding.scope_id,
      ac_ids: input.receipt.prior_work.binding.ac_ids,
      generation: null,
      implementation_fingerprint: null,
      delivery_cycle_id: null,
      principal: 'fixture-original-owner',
      decision: 'approved',
      disposition: 'current',
    }));
    const priorWork = { ...input.receipt.prior_work, lifecycle: { ...input.receipt.prior_work.lifecycle, references } };
    const successorWork = {
      ...input.receipt.successor_work,
      lifecycle: { ...input.receipt.successor_work.lifecycle, references },
    };
    const priorVersion = { revision: priorWork.revision, digest: canonicalJsonDigest(priorWork) };
    const originalRequest = { ...input.receipt.request, expectedWork: priorVersion };
    input.receipt = {
      ...input.receipt,
      prior_work: priorWork,
      prior_work_version: priorVersion,
      successor_work: successorWork,
      work_version: { revision: successorWork.revision, digest: canonicalJsonDigest(successorWork) },
      request: originalRequest,
      request_digest: canonicalJsonDigest(originalRequest),
      authorization: { ...input.receipt.authorization, request_digest: canonicalJsonDigest(originalRequest) },
    };
    const databasePath = path.join(root, config.control.work_root, 'session-handoff.v1.sqlite');
    mkdirSync(path.dirname(databasePath), { recursive: true });
    const f = await continuationFixture({
      root,
      config,
      workspaceId,
      databasePath,
      repositoryRoot: root,
      identity: input.receipt.request.identity,
    });
    seedFrontierHostFixture(f, input);
    await seedOriginalFrontierEngine(root, config, input);
    const h1 = extraTickets === 0 ? seedQualifiedCodeReaderHop(f, 'H1') : null;
    const failedBase = input.receipt.successor_journal;
    const failed: MastraSessionLedgerState = {
      ...failedBase,
      items: failedBase.items.map((item) => {
        const issue_id = randomUUID(),
          summary = 'Known fixture packet failure';
        return {
          ...item,
          issue_id,
          observation: {
            schema: 'VidaSessionObservation/v1',
            action_id: item.request.action_id,
            issue_id,
            agent_id: 'fixture:reviewer',
            tool_call_ref: 'fixture:failed',
            status: 'reported_failed',
            summary,
            output_digest: canonicalJsonDigest(summary),
            evidence_refs: ['fixture:gap'],
          },
        };
      }),
    };
    f.db
      .query(
        'UPDATE agent_host_mastra_session_ledger SET payload=?,digest=? WHERE workspace_id=? AND work_id=? AND attempt=1',
      )
      .run(canonicalJson(failed), canonicalJsonDigest(failed), workspaceId, f.identity.work_id);
    const before = f.store.readHostStateSnapshot(f.identity),
      journal = requireFixtureValue(f.store.readWorkSessionJournal(f.identity), 'work session journal'),
      failedSourceScope = requireFixtureValue(failed.source_scope, 'failed journal source scope');
    assertFixtureValue(before.work, 'prior work');
    assertFixtureValue(before.workVersion, 'prior work version');
    assertFixtureValue(before.ledgerVersion, 'prior ledger version');
    const originalBytes = canonicalJson(input.receipt),
      changed = sourceScope(
        failedSourceScope.entries.map((item) => ({
          ...item,
          bytes: requireFixtureValue(item.bytes, `byte count for ${item.path}`) + 1,
          sha256: '9'.repeat(64),
        })),
      );
    const originalProof = input.receipt.request.sourceTransition;
    if (originalProof.status !== 'closed_config_rebind_proven')
      throw new Error('Configured frontier fixture did not provide a closed config rebind proof');
    const transition = {
      ...originalProof.transition,
      target_runtime_code_digest: h1?.request.currentRuntimeCodeDigest ?? 'd'.repeat(64),
    };
    const proof: FailedPrewriterTransitionRequest['sourceTransition'] = {
      ...originalProof,
      transition,
      transition_digest: canonicalJsonDigest(transition),
    };
    const request: FailedPrewriterTransitionRequest = {
      schema: 'FailedPrewriterTransitionRequest/v1',
      recovery_id: 'fixture-failed-wave',
      identity: f.identity,
      attempt: 1,
      nativeSessionHandle: input.receipt.request.nativeSessionHandle,
      original_receipt_digest: canonicalJsonDigest(input.receipt),
      expectedWork: requireFixtureValue(before.workVersion, 'work version'),
      expectedLedger: requireFixtureValue(before.ledgerVersion, 'ledger version'),
      expectedJournal: journal.version,
      expectedMaintenanceGeneration: before.maintenanceGeneration,
      currentSourceScope: changed,
      authorizedSourceChanges: compareScopedSourceSnapshots(failedSourceScope, changed),
      sourceTransition: proof,
      targetProjectContextDigest: input.receipt.request.targetProjectContextDigest,
    };
    const versionKeys: readonly ('expectedWork' | 'expectedLedger' | 'expectedJournal')[] = [
      'expectedWork',
      'expectedLedger',
      'expectedJournal',
    ];
    for (const key of versionKeys) {
      expect(() =>
        f.store.transitionFailedPrewriter({
          request: { ...request, [key]: { ...request[key], revision: request[key].revision + 1 } },
          verifyCurrent: () => {},
        }),
      ).toThrow();
      expect(f.store.readHostStateSnapshot(f.identity)).toEqual(before);
      expect(f.store.readWorkSessionJournal(f.identity)).toEqual(journal);
    }
    expect(() =>
      invokeUnknownBoundary(f.store.transitionFailedPrewriter.bind(f.store), undefined, [
        { request, verifyCurrent: () => Promise.resolve() },
      ]),
    ).toThrow(/synchronously/);
    expect(() =>
      invokeUnknownBoundary(f.store.transitionFailedPrewriter.bind(f.store), undefined, [
        { request, verifyCurrent: async () => {} },
      ]),
    ).toThrow(/synchronous/);
    expect(f.store.readHostStateSnapshot(f.identity)).toEqual(before);
    expect(f.store.readWorkSessionJournal(f.identity)).toEqual(journal);
    expect(() =>
      f.store.transitionFailedPrewriter({
        request,
        verifyCurrent: () => {
          throw Error('fixture current native proof changed');
        },
      }),
    ).toThrow(/current native proof changed/);
    expect(f.store.readHostStateSnapshot(f.identity)).toEqual(before);
    expect(f.store.readWorkSessionJournal(f.identity)).toEqual(journal);
    expect(f.store.readFailedPrewriterRecoveryReceipt(f.identity, 1)).toBeNull();
    f.db.exec(
      "CREATE TRIGGER reject_failed_wave_write BEFORE UPDATE ON agent_host_mastra_session_ledger BEGIN SELECT RAISE(ABORT,'injected failed wave update'); END",
    );
    try {
      expect(() => f.store.transitionFailedPrewriter({ request, verifyCurrent: () => {} })).toThrow(
        /injected failed wave update/,
      );
      expect(f.store.readHostStateSnapshot(f.identity)).toEqual(before);
      expect(f.store.readWorkSessionJournal(f.identity)).toEqual(journal);
      expect(f.store.readFailedPrewriterRecoveryReceipt(f.identity, 1)).toBeNull();
      expect(
        requireFixtureTextColumn(
          f.db
            .query('SELECT payload FROM agent_host_delivered_work_continuation WHERE workspace_id=?')
            .get(workspaceId),
          'payload',
        ),
      ).toBe(originalBytes);
    } finally {
      f.db.exec('DROP TRIGGER reject_failed_wave_write');
    }
    expect(() =>
      f.store.transitionFailedPrewriter({
        request,
        verifyCurrent: (inspected) => {
          Reflect.set(inspected.sourceTransition.transition, 'target_runtime_code_digest', 'c'.repeat(64));
          throw Error('fixture current proof rejected');
        },
      }),
    ).toThrow(/current proof rejected/);
    expect(f.store.readHostStateSnapshot(f.identity)).toEqual(before);
    expect(f.store.readWorkSessionJournal(f.identity)).toEqual(journal);
    expect(f.store.readFailedPrewriterRecoveryReceipt(f.identity, 1)).toBeNull();
    const result = f.store.transitionFailedPrewriter({
      request,
      verifyCurrent: (inspected) => {
        expect(Object.isFrozen(inspected)).toBe(true);
        expect(Reflect.set(inspected.sourceTransition.transition, 'target_runtime_code_digest', 'c'.repeat(64))).toBe(
          false,
        );
      },
    });
    assertFixtureValue(result.work, 'recovered work');
    assertFixtureValue(result.ledger, 'recovered ledger');
    const recoveredWork = requireFixtureValue(result.work, 'recovered work');
    expect(recoveredWork.binding.work_source_revision).toBe(changed.digest);
    expect(recoveredWork.binding.runtime_code_digest).toBe(transition.target_runtime_code_digest);
    expect(recoveredWork.execution.assignment_attempts).toEqual([]);
    expect(
      requireFixtureTextColumn(
        f.db.query('SELECT payload FROM agent_host_delivered_work_continuation WHERE workspace_id=?').get(workspaceId),
        'payload',
      ),
    ).toBe(originalBytes);
    const recovered = requireFixtureValue(
      f.store.readFailedPrewriterRecoveryReceipt(f.identity, 1),
      'failed-prewriter recovery receipt',
    );
    expect(recovered.request).toEqual(request);
    const recoveryView = requireFixtureValue(
      f.store.readConfiguredFrontierRecoveryView(f.identity, 1),
      'configured-frontier recovery view',
    );
    if (h1) {
      expect(recovered.prior_work_version).toEqual(h1.work_version);
      expect(effectiveConfiguredFrontier(recoveryView).currentBinding).toEqual(recovered.successor_work.binding);
    }
    for (const value of [
      recovered,
      recovered.prior_ledger.tickets,
      requireFixtureValue(recovered.successor_ledger.tickets.at(-1), 'last successor ticket').exclusive_resources,
      recoveryView,
      recoveryView.original,
      recoveryView.recovery,
    ])
      expect(Object.isFrozen(value)).toBe(true);
    if (extraTickets) {
      let receiptError: unknown, viewError: unknown;
      try {
        canonicalJson(recovered);
      } catch (error) {
        receiptError = error;
      }
      try {
        canonicalJson(recoveryView);
      } catch (error) {
        viewError = error;
      }
      expect(receiptError instanceof Error ? receiptError.message : '').toMatch(/node budget/);
      expect(viewError instanceof Error ? viewError.message : '').toMatch(/node budget/);
    } else {
      expect(serializeFailedPrewriterRecoveryReceipt(recovered)).toBe(canonicalJson(recovered));
      expect(failedPrewriterRecoveryDigest(recovered)).toBe(canonicalJsonDigest(recovered));
      expect(configuredFrontierRecoveryViewDigest(recoveryView)).toBe(canonicalJsonDigest(recoveryView));
    }
    expect(configuredFrontierRecoveryViewDigest(recoveryView)).toMatch(/^[a-f0-9]{64}$/);
    const getter = { ...recovered };
    Object.defineProperty(getter, 'created_at', {
      enumerable: true,
      get: () => {
        throw Error('Getter must not execute');
      },
    });
    expect(() => serializeFailedPrewriterRecoveryReceipt(getter)).toThrow(/data properties/);
    for (const depth of [-1, -2, 0.5, Infinity, NaN])
      expect(() => serializeFailedPrewriterRecoveryReceipt(recovered, depth)).toThrow(/root depth invalid/);
    expect(() => serializeFailedPrewriterRecoveryReceipt(recovered, 64)).toThrow(/root depth invalid/);
    let nested: unknown = null;
    for (let index = 0; index < 64; index++) nested = { v: nested };
    const malformedReceipt: unknown = { ...recovered, created_at: nested };
    expect(() => invokeUnknownBoundary(serializeFailedPrewriterRecoveryReceipt, undefined, [malformedReceipt])).toThrow(
      /depth budget/,
    );
    let viewNested: unknown = null;
    for (let index = 0; index < 63; index++) viewNested = { v: viewNested };
    const malformedView: unknown = {
      ...recoveryView,
      recovery: { ...recovered, created_at: viewNested },
    };
    expect(() => invokeUnknownBoundary(configuredFrontierRecoveryViewDigest, undefined, [malformedView])).toThrow(
      /depth budget/,
    );
    const missingRecovery: unknown = { ...recoveryView, recovery: undefined };
    expect(() => invokeUnknownBoundary(configuredFrontierRecoveryViewDigest, undefined, [missingRecovery])).toThrow();
    const recoveredJournal = requireFixtureValue(f.store.readWorkSessionJournal(f.identity), 'recovered journal');
    expect(acceptedContractSourceRevision(recoveredWork, recoveredJournal, recoveryView)).toBe(
      input.receipt.prior_work.binding.work_source_revision,
    );
    expect(acceptedContractSourceRevision(recoveredWork, recoveredJournal)).toBe(changed.digest);
    expect(() =>
      acceptedContractSourceRevision(recoveredWork, recoveredJournal, { ...recoveryView, recovery: null }),
    ).toThrow(h1 ? /protected same-attempt descendant/ : /original admission/);
    expect(() =>
      acceptedContractSourceRevision(
        recoveredWork,
        { ...recoveredJournal, state: { ...recoveredJournal.state, run_id: 'foreign-run' } },
        recoveryView,
      ),
    ).toThrow(/original admission/);
    expect(recovered.prior_journal).toEqual(failed);
    expect(recovered.successor_journal.completed).toEqual(input.receipt.prior_journal.completed);
    expect(recovered.rights_granted).toBe(false);
    expect(recovered.successor_journal.items.every((item) => item.issue_id === null && item.observation === null)).toBe(
      true,
    );
    expect(
      recovered.successor_journal.items.every(
        (item) => !failed.items.some((prior) => prior.request.action_id === item.request.action_id),
      ),
    ).toBe(true);
    expect(
      requireFixtureValue(f.store.readDeliveredWorkContinuation(f.identity, 1), 'delivered continuation').items.map(
        (item) => item.request,
      ),
    ).toEqual(recovered.successor_journal.items.map((item) => item.request));
    const priorRunId = requireFixtureValue(input.receipt.prior_work.execution.run_id, 'prior work run id');
    const currentEngine = readConfiguredContinuationSessionEngineSnapshot(
      {
        ...input.prewriterBinding,
        context: { ...input.prewriterBinding.context, scope_digest: changed.digest },
        runId: priorRunId,
      },
      input.receipt,
      recovered,
      recoveryView.runtimeCodeContinuations,
    );
    expect(currentEngine.status).toBe('suspended');
    expect(currentEngine.run_id).toBe(priorRunId);
    expect(currentEngine.requests).toEqual(recovered.successor_journal.items.map((item) => item.request));
    const firstFailedItem = requireFixtureValue(failed.items[0], 'first failed wave item'),
      firstFailedObservation = requireFixtureValue(firstFailedItem.observation, 'first failed observation');
    expect(f.store.findArchivedReportedObservation(f.identity.work_id, 1, firstFailedObservation)).toEqual(
      firstFailedItem,
    );
    const malformedObservation: unknown = {
      ...firstFailedObservation,
      summary: 'changed archived report',
    };
    expect(() =>
      invokeUnknownBoundary(f.store.findArchivedReportedObservation.bind(f.store), undefined, [
        f.identity.work_id,
        1,
        malformedObservation,
      ]),
    ).toThrow();
    const recordedTransition = request.sourceTransition.transition;
    if (recordedTransition.schema !== 'ConfiguredRuntimeEndpointTransition/v1')
      throw new Error('Fixture expected the current configured endpoint transition');
    const recordedInput = {
      schema: 'FailedPrewriterTransitionInput/v1',
      identity: f.identity,
      attempt: 1,
      nativeSessionHandle: request.nativeSessionHandle,
      recovery_id: request.recovery_id,
      sourceTransitionId: request.sourceTransition.operation_id,
      parentManifestRef: recordedTransition.parent_manifest_ref,
      successorManifestRef: recordedTransition.successor_manifest_ref,
      systemUpdateRef: recordedTransition.system_update_ref,
      sourceCorrectionRef: recordedTransition.source_correction_ref,
    };
    const requestPath = '.agent/failed-transition-retry.json';
    const after = f.store.readHostStateSnapshot(f.identity),
      afterJournal = requireFixtureValue(f.store.readWorkSessionJournal(f.identity), 'post-recovery journal');
    for (const mode of ['status', 'inspect', 'apply']) {
      writeFileSync(
        path.join(root, requestPath),
        canonicalJson({ ...recordedInput, ...(mode === 'apply' ? { request } : {}) }),
      );
      const status = transitionFailedPrewriter(['--mode', mode, '--project-root', root, '--request', requestPath]);
      expect(status.status).toBe('failed_prewriter_transition_recorded');
      if (status.status !== 'failed_prewriter_transition_recorded')
        throw new Error('fixture expected the recorded transition result');
      expect(status.effects_reissued).toBe(false);
      expect(status.request).toEqual(request);
      expect(f.store.readHostStateSnapshot(f.identity)).toEqual(after);
      expect(f.store.readWorkSessionJournal(f.identity)).toEqual(afterJournal);
    }
    writeFileSync(
      path.join(root, requestPath),
      canonicalJson({ ...recordedInput, request: { ...request, recovery_id: 'foreign' } }),
    );
    expect(() =>
      transitionFailedPrewriter(['--mode', 'apply', '--project-root', root, '--request', requestPath]),
    ).toThrow(/recorded recovery intent differs/);
    expect(f.store.readHostStateSnapshot(f.identity)).toEqual(after);
    expect(f.store.readWorkSessionJournal(f.identity)).toEqual(afterJournal);
    writeFileSync(path.join(root, requestPath), canonicalJson(recordedInput));
    const dispatched: unknown = await runAgent([
      '--transition-failed-prewriter',
      'true',
      '--mode',
      'status',
      '--project-root',
      root,
      '--request',
      requestPath,
    ]);
    if (!isPlainRecord(dispatched)) throw new Error('Fixture CLI dispatch returned no public result record');
    expect(dispatched.status).toBe('failed_prewriter_transition_recorded');
    expect(dispatched.effects_reissued).toBe(false);
    expect(dispatched.request).toEqual(request);
    expect(f.store.readHostStateSnapshot(f.identity)).toEqual(after);
    expect(f.store.readWorkSessionJournal(f.identity)).toEqual(afterJournal);
    const invalidRecoveryCases: readonly ((value: FailedPrewriterRecoveryReceipt) => FailedPrewriterRecoveryReceipt)[] =
      [
        (value) => ({
          ...value,
          successor_work: {
            ...value.successor_work,
            lifecycle: { ...value.successor_work.lifecycle, phase: 'EXECUTE' },
          },
        }),
        (value) => ({
          ...value,
          successor_journal: {
            ...value.successor_journal,
            items: value.successor_journal.items.map((item, index) =>
              index === 0
                ? { ...item, observation: requireFixtureValue(failed.items[0]?.observation, 'failed observation') }
                : item,
            ),
          },
        }),
        (value) => ({ ...value, successor_ledger: { ...value.successor_ledger, notices: [{}] } }),
        (value) => ({
          ...value,
          successor_journal: { ...value.successor_journal, items: value.successor_journal.items.slice(0, -1) },
        }),
      ];
    for (const mutate of invalidRecoveryCases) {
      const changed = mutate(recovered);
      const invalid: FailedPrewriterRecoveryReceipt = {
        ...changed,
        work_version: { ...changed.work_version, digest: canonicalJsonDigest(changed.successor_work) },
        ledger_version: { ...changed.ledger_version, digest: canonicalJsonDigest(changed.successor_ledger) },
        journal_version: { ...changed.journal_version, digest: canonicalJsonDigest(changed.successor_journal) },
      };
      expect(() => validateFailedPrewriterRecoveryReceipt(invalid)).toThrow();
    }
    const session = new MastraSessionLedger(f.db, workspaceId, config, root, f.store);
    let issued = session.issueWave(f.identity.work_id, 1, afterJournal.version);
    const evidence_ref = '.agent/recovered-fixture-evidence.md';
    writeFileSync(
      path.join(root, evidence_ref),
      'Synthetic current Source preparation for the recovery bridge regression.\n',
    );
    const observations: SessionBridgeObservation[] = issued.state.items.map((item, index) => {
      const kind = item.request.role === 'source-planner' ? 'source_plan' : 'implementation_policy';
      const agent_id = `fixture:recovered-prewriter-${index}`;
      const mechanics =
        kind === 'source_plan'
          ? ['scope_acceptance_trace', 'verification_rollback']
          : ['root_cause_owner', 'affected_callers', 'existing_primitives'];
      const summary = canonicalJson({
        schema: 'LifecyclePreparationObservation/v1',
        record_id: `recovered-${index}`,
        kind,
        work_id: f.identity.work_id,
        attempt: 1,
        source_revision: changed.digest,
        scope_id: recoveredWork.binding.scope_id,
        config_digest: recoveredWork.binding.config_digest,
        ac_ids: recoveredWork.binding.ac_ids,
        status: 'pass',
        observer_id: agent_id,
        observed_at: new Date().toISOString(),
        evidence_refs: [evidence_ref],
        gaps: [],
        observations: mechanics.map((mechanic) => ({
          mechanic,
          actual: 'Fixture current preparation observed',
          evidence_ref,
        })),
      });
      return {
        schema: 'VidaSessionObservation/v1',
        action_id: item.request.action_id,
        issue_id: requireFixtureValue(item.issue_id, `issue id for ${item.request.action_id}`),
        agent_id,
        tool_call_ref: `fixture:recovered-${index}`,
        status: 'reported_complete',
        summary,
        output_digest: canonicalJsonDigest(summary),
        evidence_refs: [evidence_ref],
      };
    });
    // This isolates physical engine continuation; native endpoint/admission is a separate qualification boundary.
    const reportedJournal: MastraSessionLedgerState = {
      ...issued.state,
      items: issued.state.items.map((item, index) => ({
        ...item,
        observation: requireFixtureValue(observations[index], `bridge observation ${index}`),
      })),
    };
    f.db
      .query(
        'UPDATE agent_host_mastra_session_ledger SET revision=?,payload=?,digest=? WHERE workspace_id=? AND work_id=? AND attempt=1',
      )
      .run(
        issued.version.revision + 1,
        canonicalJson(reportedJournal),
        canonicalJsonDigest(reportedJournal),
        workspaceId,
        f.identity.work_id,
      );
    const advanced = resumeFrontierBridgeFixture({
      root,
      workspaceId,
      identity: f.identity,
      context: { ...input.prewriterBinding.context, scope_digest: changed.digest },
      selection: input.prewriterBinding.selection,
      observations,
      runId: requireFixtureValue(input.receipt.prior_journal.run_id, 'prior journal run id'),
    });
    expect(advanced.before.run_id).toBe(input.receipt.prior_journal.run_id);
    expect(advanced.before.requests).toEqual(recovered.successor_journal.items.map((item) => item.request));
    expect(advanced.after.run_id).toBe(input.receipt.prior_journal.run_id);
    expect(advanced.after.step_id).toBe('wave-2');
    expect(advanced.after.requests.map((item) => item.role)).toEqual(['developer-orchestrator']);
    expect(
      advanced.after.requests.every(
        (item) => !failed.items.some((prior) => prior.request.action_id === item.action_id),
      ),
    ).toBe(true);
    expect(advanced.restart).toEqual(advanced.after);
    expect(advanced.retained).toEqual(input.receipt);
    expect(f.store.readFailedPrewriterRecoveryReceipt(f.identity, 1)).toEqual(recovered);
    expect(f.store.findArchivedReportedObservation(f.identity.work_id, 1, firstFailedObservation)).toEqual(
      firstFailedItem,
    );
    const reopenedDb = new Database(databasePath, { readonly: true, strict: true });
    try {
      const reopened = new HostStateStore(reopenedDb, workspaceId, undefined, undefined, undefined, undefined, root);
      expect(reopened.readFailedPrewriterRecoveryReceipt(f.identity, 1)).toEqual(recovered);
      expect(reopened.readConfiguredFrontierRecoveryView(f.identity, 1)).toEqual(recoveryView);
      expect(
        requireFixtureValue(reopened.readHostStateSnapshot(f.identity).work, 'reopened recovered work').binding,
      ).toEqual(recovered.successor_work.binding);
    } finally {
      reopenedDb.close(true);
    }
    if (h1) {
      const h2 = seedQualifiedCodeReaderHop(f, 'H2');
      const adopted = requireFixtureValue(
        f.store.readConfiguredFrontierRecoveryView(f.identity, 1),
        'adopted configured-frontier recovery view',
      );
      expect(adopted.runtimeCodeContinuations).toEqual([h1, h2]);
      expect(effectiveConfiguredFrontier(adopted).currentBinding.runtime_code_digest).toBe(
        h2.request.currentRuntimeCodeDigest,
      );
      expect(f.store.readDeliveredWorkContinuationReceipt(f.identity, 1)).toEqual(input.receipt);
      expect(f.store.readDeliveredWorkContinuation(f.identity, 1)).toBeNull();
      const adoptedHost = f.store.readHostStateSnapshot(f.identity),
        adoptedJournal = f.store.readWorkSessionJournal(f.identity);
      for (const mode of ['status', 'inspect', 'apply']) {
        writeFileSync(
          path.join(root, requestPath),
          canonicalJson({ ...recordedInput, ...(mode === 'apply' ? { request } : {}) }),
        );
        expect(
          transitionFailedPrewriter(['--mode', mode, '--project-root', root, '--request', requestPath]).status,
        ).toBe('failed_prewriter_transition_recorded');
        expect(f.store.readHostStateSnapshot(f.identity)).toEqual(adoptedHost);
        expect(f.store.readWorkSessionJournal(f.identity)).toEqual(adoptedJournal);
      }
      expect(
        acceptedContractSourceRevision(
          requireFixtureValue(f.store.readHostStateSnapshot(f.identity).work, 'adopted host work'),
          requireFixtureValue(f.store.readWorkSessionJournal(f.identity), 'adopted host journal'),
          adopted,
        ),
      ).toBe(input.receipt.prior_work.binding.work_source_revision);
      expect(
        requireFixtureTextColumn(
          f.db
            .query('SELECT payload FROM agent_host_delivered_work_continuation WHERE workspace_id=?')
            .get(workspaceId),
          'payload',
        ),
      ).toBe(originalBytes);
    }
  },
  90_000,
);

test('public failed prewriter owner recovery inspects, denies a changed owner and applies without rewriting failed reports', async () => {
  const { root, config, workspaceId, input, intakePath } = configuredFrontierRepairHostRoot();
  let receipt = input.receipt;
  const prior = receipt.prior_work,
    successor = receipt.successor_work;
  const authorizationPath = '.agent/source-authority.json';
  const authority = {
    schema: 'LocalSourceWriteAuthorization/v1',
    action: 'source.write',
    user_instruction_ref: receipt.request.originalRequestPointer,
    work_id: receipt.request.identity.work_id,
    attempt: 1,
    scope_digest: prior.binding.work_source_revision,
    config_digest: prior.binding.config_digest,
    workflow_id: prior.binding.workflow_id,
    stage_ids: ['develop_task'],
    implementation_paths: prior.binding.implementation_paths,
    native_session_handle: receipt.request.nativeSessionHandle,
  };
  const authorityBytes = Buffer.from(canonicalJson(authority));
  writeFileSync(path.join(root, authorizationPath), authorityBytes);
  const decodedIntake: unknown = JSON.parse(readFileSync(path.join(root, intakePath), 'utf8'));
  if (!isPlainRecord(decodedIntake)) throw new Error('Fixture intake is not an object');
  const intake = decodedIntake;
  const intakeBytes = Buffer.from(canonicalJson({ ...intake, source_authorization_path: authorizationPath }));
  writeFileSync(path.join(root, intakePath), intakeBytes);
  const approval: WorkState['lifecycle']['references'][number] = {
    schema: 'LifecycleArtifactReference/v1',
    kind: 'execution_approval',
    artifact_schema: 'LocalSourceWriteAuthorization/v1',
    record_id: authority.user_instruction_ref,
    path: authorizationPath,
    sha256: createHash('sha256').update(authorityBytes).digest('hex'),
    source_revision: prior.binding.work_source_revision,
    scope_id: prior.binding.scope_id,
    ac_ids: prior.binding.ac_ids,
    generation: null,
    implementation_fingerprint: null,
    delivery_cycle_id: null,
    principal: 'local-session:' + canonicalJsonDigest(receipt.request.nativeSessionHandle),
    decision: 'approved',
    disposition: 'current',
  };
  const workWithApproval = (work: WorkState): WorkState => ({
    ...work,
    artifacts: work.artifacts.map((item) =>
      item.artifact_id === 'local-session-intake'
        ? { ...item, sha256: createHash('sha256').update(intakeBytes).digest('hex') }
        : item,
    ),
    lifecycle: { ...work.lifecycle, references: [approval] },
  });
  const priorWork = workWithApproval(prior),
    successorWork = workWithApproval(successor),
    priorWorkVersion = { revision: priorWork.revision, digest: canonicalJsonDigest(priorWork) },
    workVersion = { revision: successorWork.revision, digest: canonicalJsonDigest(successorWork) },
    request = { ...receipt.request, expectedWork: priorWorkVersion };
  receipt = {
    ...receipt,
    prior_work: priorWork,
    prior_work_version: priorWorkVersion,
    successor_work: successorWork,
    work_version: workVersion,
    request,
    request_digest: canonicalJsonDigest(request),
    authorization: { ...receipt.authorization, request_digest: canonicalJsonDigest(request) },
  };
  input.receipt = receipt;
  const databasePath = path.join(root, config.control.work_root, 'session-handoff.v1.sqlite');
  mkdirSync(path.dirname(databasePath), { recursive: true });
  const f = await continuationFixture({
    root,
    config,
    workspaceId,
    databasePath,
    repositoryRoot: root,
    identity: receipt.request.identity,
  });
  seedFrontierHostFixture(f, input);
  const ledger = mutableCoordinationLedger(receipt.successor_ledger),
    journal = { ...receipt.successor_journal };
  const expiry = new Date(Date.now() - 1000).toISOString();
  const activeTicket = requireFixtureValue(
      ledger.tickets.find((item) => item.status === 'active'),
      'active ticket',
    ),
    activeClaim = requireFixtureValue(
      ledger.claims.find((item) => item.status === 'active'),
      'active claim',
    );
  activeTicket.expires_at = expiry;
  activeClaim.lease_expires_at = expiry;
  const updatedJournal: MastraSessionLedgerState = {
    ...journal,
    items: receipt.successor_journal.items.map((item) => {
      const issue_id = randomUUID(),
        summary = 'Known readonly fixture gap';
      return {
        ...item,
        issue_id,
        observation: {
          schema: 'VidaSessionObservation/v1',
          action_id: item.request.action_id,
          issue_id,
          agent_id: 'fixture:reviewer',
          tool_call_ref: 'fixture:result',
          status: 'reported_failed',
          summary,
          output_digest: canonicalJsonDigest(summary),
          evidence_refs: ['fixture:gap'],
        },
      };
    }),
  };
  f.db
    .query("UPDATE agent_host_state SET payload=?,digest=? WHERE workspace_id=? AND kind='ledger'")
    .run(canonicalJson(ledger), canonicalJsonDigest(ledger), workspaceId);
  f.db
    .query(
      'UPDATE agent_host_mastra_session_ledger SET payload=?,digest=? WHERE workspace_id=? AND work_id=? AND attempt=1',
    )
    .run(canonicalJson(updatedJournal), canonicalJsonDigest(updatedJournal), workspaceId, f.identity.work_id);
  const before = f.store.readHostStateSnapshot(f.identity),
    originalBytes = canonicalJson(receipt);
  const requestPath = '.agent/owner-recovery-request.json',
    file = path.join(root, requestPath);
  writeFileSync(
    file,
    canonicalJson({
      schema: 'FailedPrewriterOwnerRecoveryRequest/v1',
      identity: f.identity,
      attempt: 1,
      nativeSessionHandle: receipt.request.nativeSessionHandle,
    }),
  );
  const bundle = path.join(runtimeRoot, 'packages/agent'),
    budget = executionBudget(60_000);
  const invoke = (mode: string, status: number): Record<string, unknown> => {
    const result = boundedSpawnSync(
      spawnSync,
      process.execPath,
      [
        path.join(bundle, 'bin/run.ts'),
        '--recover-failed-prewriter-owner',
        'true',
        '--mode',
        mode,
        '--project-root',
        root,
        '--request',
        requestPath,
      ],
      {
        cwd: root,
        env: pinnedEnvironment(process.execPath, process.env, bundle),
        windowsHide: true,
        encoding: 'utf8',
        budget,
      },
      'public failed prewriter owner recovery',
    );
    expect(result.error).toBeUndefined();
    expect(result.signal).toBeNull();
    expect(result.status).toBe(status);
    if (status !== 0) expect(result.stdout).toBe('');
    const output = status === 0 ? result.stdout : result.stderr;
    if (typeof output !== 'string') throw new Error('Fixture CLI response has no UTF-8 text output');
    const parsed: unknown = JSON.parse(output);
    if (!isPlainRecord(parsed)) throw new Error('Fixture CLI response is not an object');
    if (!isPlainRecord(parsed.request)) throw new Error('Fixture CLI response has no request record');
    return parsed;
  };
  const inspected = invoke('inspect', 0);
  if (!isPlainRecord(inspected.request)) throw new Error('Fixture CLI request is not an object');
  const inspectedRequest = inspected.request;
  expect(inspected.status).toBe('failed_prewriter_owner_recovery_ready');
  expect(f.store.readHostStateSnapshot(f.identity)).toEqual(before);
  writeFileSync(file, canonicalJson({ ...inspectedRequest, nativeSessionHandle: 'foreign' }));
  expect(invoke('apply', 1)).toMatchObject({ schema: 'VidaAgentRunResult/v1', status: 'blocked' });
  expect(f.store.readHostStateSnapshot(f.identity)).toEqual(before);
  writeFileSync(file, canonicalJson(inspectedRequest));
  expect(invoke('apply', 0)).toMatchObject({
    status: 'failed_prewriter_owner_recovered',
    rights_granted: false,
    failed_reports_preserved: true,
    source_bindings_changed: false,
  });
  expect(requireFixtureValue(f.store.readWorkSessionJournal(f.identity), 'recovered journal').state).toEqual(journal);
  expect(requireFixtureValue(f.store.readHostStateSnapshot(f.identity).work, 'recovered work').binding).toEqual(
    requireFixtureValue(before.work, 'before work').binding,
  );
  expect(
    requireFixtureTextColumn(
      f.db.query('SELECT payload FROM agent_host_delivered_work_continuation WHERE workspace_id=?').get(workspaceId),
      'payload',
    ),
  ).toBe(originalBytes);
  const current = f.store.readHostStateSnapshot(f.identity);
  expect(invoke('apply', 1).status).toBe('blocked');
  expect(f.store.readHostStateSnapshot(f.identity)).toEqual(current);
}, 60_000);

test('failed prewriter owner recovery atomically reacquires full resources without changing reports, bindings or the original receipt', async () => {
  const { root, config, workspaceId, input } = configuredFrontierRepairHostRoot();
  const databasePath = path.join(root, config.control.work_root, 'session-handoff.v1.sqlite');
  mkdirSync(path.dirname(databasePath), { recursive: true });
  const f = await continuationFixture({
    root,
    config,
    workspaceId,
    databasePath,
    repositoryRoot: root,
    identity: input.receipt.request.identity,
  });
  seedFrontierHostFixture(f, input);
  const ledger = mutableCoordinationLedger(input.receipt.successor_ledger),
    originalJournal = input.receipt.successor_journal;
  const expired = new Date(Date.now() - 1000).toISOString();
  const activeTicket = requireFixtureValue(
      ledger.tickets.find((item) => item.status === 'active'),
      'active ticket',
    ),
    activeClaim = requireFixtureValue(
      ledger.claims.find((item) => item.status === 'active'),
      'active claim',
    );
  activeTicket.expires_at = expired;
  activeClaim.lease_expires_at = expired;
  const journal: MastraSessionLedgerState = {
    ...originalJournal,
    items: originalJournal.items.map((item) => {
      const issue_id = randomUUID(),
        summary = 'Fixture known packet gap';
      return {
        ...item,
        issue_id,
        observation: {
          schema: 'VidaSessionObservation/v1',
          action_id: item.request.action_id,
          issue_id,
          agent_id: 'fixture:readonly',
          tool_call_ref: 'fixture:result',
          status: 'reported_failed',
          summary,
          output_digest: canonicalJsonDigest(summary),
          evidence_refs: ['fixture:gap'],
        },
      };
    }),
  };
  f.db
    .query("UPDATE agent_host_state SET payload=?,digest=? WHERE workspace_id=? AND kind='ledger'")
    .run(canonicalJson(ledger), canonicalJsonDigest(ledger), workspaceId);
  f.db
    .query(
      'UPDATE agent_host_mastra_session_ledger SET payload=?,digest=? WHERE workspace_id=? AND work_id=? AND attempt=1',
    )
    .run(canonicalJson(journal), canonicalJsonDigest(journal), workspaceId, f.identity.work_id);
  const before = f.store.readHostStateSnapshot(f.identity),
    beforeJournal = requireFixtureValue(f.store.readWorkSessionJournal(f.identity), 'pre-recovery journal');
  assertFixtureValue(before.work, 'pre-recovery work');
  assertFixtureValue(before.work.lease, 'pre-recovery lease');
  assertFixtureValue(before.workVersion, 'pre-recovery work version');
  assertFixtureValue(before.ledgerVersion, 'pre-recovery ledger version');
  const receiptBytes = requireFixtureTextColumn(
    f.db.query('SELECT payload FROM agent_host_delivered_work_continuation WHERE workspace_id=?').get(workspaceId),
    'payload',
  );
  const request = {
    identity: f.identity,
    attempt: 1,
    nativeSessionHandle: input.receipt.request.nativeSessionHandle,
    expectedWork: requireFixtureValue(before.workVersion, 'pre-recovery work version'),
    expectedLedger: requireFixtureValue(before.ledgerVersion, 'pre-recovery ledger version'),
    expectedJournal: beforeJournal.version,
    expectedMaintenanceGeneration: before.maintenanceGeneration,
    verifyCurrent: () => {},
  } satisfies Parameters<typeof f.store.recoverFailedPrewriterOwner>[0];
  const versionKeys: readonly ('expectedWork' | 'expectedLedger' | 'expectedJournal')[] = [
    'expectedWork',
    'expectedLedger',
    'expectedJournal',
  ];
  for (const key of versionKeys) {
    expect(() =>
      f.store.recoverFailedPrewriterOwner({
        ...request,
        [key]: { ...request[key], revision: request[key].revision + 1 },
      }),
    ).toThrow();
    expect(f.store.readHostStateSnapshot(f.identity)).toEqual(before);
  }
  expect(() =>
    f.store.recoverFailedPrewriterOwner({
      ...request,
      verifyCurrent: () => {
        throw Error('fixture current proof changed');
      },
    }),
  ).toThrow('fixture current proof changed');
  expect(() =>
    invokeUnknownBoundary(f.store.recoverFailedPrewriterOwner.bind(f.store), undefined, [
      { ...request, verifyCurrent: () => Promise.resolve() },
    ]),
  ).toThrow('must finish synchronously');
  expect(() =>
    invokeUnknownBoundary(f.store.recoverFailedPrewriterOwner.bind(f.store), undefined, [
      { ...request, verifyCurrent: async () => {} },
    ]),
  ).toThrow();
  expect(f.store.readHostStateSnapshot(f.identity)).toEqual(before);
  const result = f.store.recoverFailedPrewriterOwner(request);
  assertFixtureValue(result.work, 'recovered owner work');
  assertFixtureValue(result.ledger, 'recovered owner ledger');
  assertFixtureValue(result.work.lease, 'recovered owner lease');
  const recoveredOwnerWork = requireFixtureValue(result.work, 'recovered owner work');
  assertFixtureValue(recoveredOwnerWork.lease, 'recovered owner lease');
  const recoveredOwnerLease = requireFixtureValue(recoveredOwnerWork.lease, 'recovered owner lease');
  expect(recoveredOwnerWork.binding).toEqual(requireFixtureValue(before.work, 'before owner work').binding);
  expect(recoveredOwnerWork.execution).toEqual(requireFixtureValue(before.work, 'before owner work').execution);
  expect(recoveredOwnerLease.ticket_id).not.toBe(
    requireFixtureValue(before.work, 'before owner work').lease?.ticket_id,
  );
  const ticket = requireFixtureValue(
    result.ledger.tickets.find((item) => item.ticket_id === recoveredOwnerLease.ticket_id),
    'recovered owner ticket',
  );
  const originalActiveTicket = requireFixtureValue(
    ledger.tickets.find((item) => item.status === 'active'),
    'original active ticket',
  );
  expect(ticket.exclusive_resources).toEqual(originalActiveTicket.exclusive_resources);
  expect(Date.parse(requireFixtureValue(ticket.expires_at, 'recovered ticket expiry'))).toBeGreaterThan(Date.now());
  expect(requireFixtureValue(f.store.readWorkSessionJournal(f.identity), 'recovered journal').state).toEqual(journal);
  expect(
    requireFixtureTextColumn(
      f.db.query('SELECT payload FROM agent_host_delivered_work_continuation WHERE workspace_id=?').get(workspaceId),
      'payload',
    ),
  ).toBe(receiptBytes);
  expect(
    requireFixtureValue(f.store.readDeliveredWorkContinuation(f.identity, 1), 'delivered continuation').item_statuses,
  ).toEqual(['reported', 'reported']);
  expectHistorySnapshotAfterOwner(f.store, result.work);
  const current = f.store.readHostStateSnapshot(f.identity),
    currentJournal = requireFixtureValue(f.store.readWorkSessionJournal(f.identity), 'current journal');
  expect(() =>
    f.store.recoverFailedPrewriterOwner({
      ...request,
      expectedWork: requireFixtureValue(current.workVersion, 'current work version'),
      expectedLedger: requireFixtureValue(current.ledgerVersion, 'current ledger version'),
      expectedJournal: currentJournal.version,
    }),
  ).toThrow();
  expect(f.store.readHostStateSnapshot(f.identity)).toEqual(current);
});

test('failed prewriter recovery basis preserves full resources and rejects unknown outcomes, foreign FIFO and stale cohorts', () => {
  const fixture = configuredFrontierRepairFixture(true),
    original = fixture.receipt;
  const work = original.successor_work,
    ledger = mutableCoordinationLedger(original.successor_ledger),
    now = Date.now();
  const lease = requireFixtureValue(work.lease, 'successor work lease'),
    ticket = requireFixtureValue(
      ledger.tickets.find((item) => item.ticket_id === lease.ticket_id),
      'successor ticket',
    ),
    claim = requireFixtureValue(
      ledger.claims.find((item) => item.ticket_id === ticket.ticket_id && item.status === 'active'),
      'successor claim',
    );
  ticket.expires_at = claim.lease_expires_at = new Date(now - 1000).toISOString();
  const journal: MastraSessionLedgerState = {
    ...original.successor_journal,
    items: original.successor_journal.items.map((item, index) => {
      const issue_id = randomUUID(),
        summary = JSON.stringify({ status: 'gap', message: 'packet missing' });
      return {
        ...item,
        issue_id,
        observation: {
          schema: 'VidaSessionObservation/v1',
          action_id: item.request.action_id,
          issue_id,
          agent_id: 'fixture:readonly',
          tool_call_ref: 'fixture:prewriter-' + index,
          status: 'reported_failed',
          summary,
          output_digest: canonicalJsonDigest(summary),
          evidence_refs: ['fixture:packet-gap'],
        },
      };
    }),
  };
  const input = { original, work, ledger, journal, nativeSessionHandle: original.request.nativeSessionHandle, now };
  const originalBytes = canonicalJson(original),
    failedBytes = canonicalJson(journal);
  expect(() => validateFailedPrewriterRecoveryBasis(input)).not.toThrow();
  expect(ticket.exclusive_resources.some((item) => item.startsWith('file:'))).toBe(true);
  expect(canonicalJson(original)).toBe(originalBytes);
  expect(canonicalJson(journal)).toBe(failedBytes);
  const invalidBasisCases: readonly ((value: typeof input) => unknown)[] = [
    (value) => ({
      ...value,
      journal: {
        ...value.journal,
        items: value.journal.items.map((item, index) => (index === 0 ? { ...item, observation: null } : item)),
      },
    }),
    (value) => ({
      ...value,
      journal: {
        ...value.journal,
        items: value.journal.items.map((item, index) =>
          index === 0 && item.observation
            ? { ...item, observation: { ...item.observation, status: 'reported_complete' } }
            : item,
        ),
      },
    }),
    (value) => ({
      ...value,
      journal: {
        ...value.journal,
        items: value.journal.items.map((item, index) =>
          index === 0 && item.observation
            ? { ...item, observation: { ...item.observation, output_digest: '0'.repeat(64) } }
            : item,
        ),
      },
    }),
    (value) => ({
      ...value,
      journal: {
        ...value.journal,
        items: value.journal.items.map((item, index) => (index === 0 ? { ...item, host_reservation: {} } : item)),
      },
    }),
    (value) => ({
      ...value,
      journal: {
        ...value.journal,
        items: value.journal.items.map((item, index) => (index === 0 ? { ...item, research_activation: {} } : item)),
      },
    }),
    (value) => ({
      ...value,
      work: { ...value.work, execution: { ...value.work.execution, assignment_attempts: [{}] } },
    }),
    (value) => ({ ...value, nativeSessionHandle: 'foreign' }),
    (value) => ({
      ...value,
      ledger: {
        ...value.ledger,
        tickets: value.ledger.tickets.map((item, index) =>
          index === 1 ? { ...item, expires_at: new Date(now + 1000).toISOString() } : item,
        ),
      },
    }),
    (value) => ({
      ...value,
      ledger: {
        ...value.ledger,
        tickets: value.ledger.tickets.map((item, index) =>
          index === 1 ? { ...item, exclusive_resources: item.exclusive_resources.slice(0, -1) } : item,
        ),
      },
    }),
    (value) => ({
      ...value,
      ledger: {
        ...value.ledger,
        claims: [
          ...value.ledger.claims,
          { ...requireFixtureValue(value.ledger.claims[1], 'claim for foreign-owner case'), ticket_id: 'foreign' },
        ],
      },
    }),
    (value) => ({
      ...value,
      ledger: {
        ...value.ledger,
        tickets: [
          ...value.ledger.tickets,
          {
            ...requireFixtureValue(value.ledger.tickets[1], 'ticket for queued-owner case'),
            ticket_id: 'queued',
            status: 'queued',
          },
        ],
      },
    }),
    (value) => ({ ...value, journal: { ...value.journal, completed: [] } }),
    (value) => ({
      ...value,
      journal: {
        ...value.journal,
        items: value.journal.items.map((item, index) =>
          index === 0 ? { ...item, request: { ...item.request, role: 'developer-orchestrator' } } : item,
        ),
      },
    }),
    (value) => ({
      ...value,
      work: { ...value.work, execution: { ...value.work.execution, run_id: 'foreign-run' } },
      journal: { ...value.journal, run_id: 'foreign-run' },
    }),
  ];
  for (const invalid of invalidBasisCases.map((mutate) => mutate(input))) {
    expect(() => invokeUnknownBoundary(validateFailedPrewriterRecoveryBasis, undefined, [invalid])).toThrow();
  }
});
import {
  compareScopedSourceSnapshots,
  snapshotRuntimePackageSources,
} from '../src/orchestration/scoped-source-snapshot.ts';
import type { ScopedSourceChange } from '../src/orchestration/scoped-source-snapshot.ts';
import { assertAdmittedRuntimeCodeCurrent } from '../src/orchestration/admitted-session-execution.ts';
import * as continuationProjection from '../src/orchestration/delivered-work-continuation.ts';
import { MastraSessionLedger } from '../src/orchestration/persistent-session-handoff.ts';
import {
  cleanupContinuationFixtures,
  continuationFixture,
  continuationRequestFor,
  fixtureWorkspace,
  requestFixture,
  runtimeConfig,
  runtimeRoot,
  sourceScope,
  trackContinuationFixtureRoot,
  retainContinuationFixtureRoot,
} from './helpers/delivered-work-continuation-fixture.ts';
import {
  projectConfiguredFrontierContinuationAction,
  projectHistoricalTerminalReviewAction,
  validateClosedConfigTransitionProof,
  validateCurrentSourceScopeBridge,
  validateDeliveredWorkContinuationAuthorization,
  validateDeliveredWorkContinuationRequest,
} from '../src/orchestration/delivered-work-continuation.ts';
import { applyDeliveredWorkContinuationPlan } from '../bin/runtime-code-rebind.ts';
import {
  assertApplicableRepairBranch,
  validateConfiguredFrontierRepairReceipt,
  runDeliveredWorkContinuationRepair,
} from '../bin/repair-delivered-work-continuation.ts';
import * as continuationRepair from '../bin/repair-delivered-work-continuation.ts';

afterEach(() => cleanupContinuationFixtures());

test('configured frontier joins released writer custody despite later unrelated ledger revisions', () => {
  const input = configuredFrontierRepairFixture(true),
    work = input.receipt.prior_work,
    ledger = mutableCoordinationLedger(input.receipt.prior_ledger),
    identity = input.receipt.request.identity,
    owner = input.receipt.request.nativeSessionHandle;
  const release = requireFixtureValue(ledger.operations.at(-1), 'released coordination operation'),
    releaseTicketId = release.ticket_id;
  if (typeof releaseTicketId !== 'string') throw new Error('Fixture release lacks its ticket identity');
  const ticket = requireFixtureValue(
      ledger.tickets.find((entry) => entry.ticket_id === releaseTicketId),
      'released coordination ticket',
    ),
    claim = requireFixtureValue(
      ledger.claims.find((entry) => entry.ticket_id === ticket.ticket_id),
      'released coordination claim',
    );
  const resources = [
    'execution:' + identity.work_id,
    ...work.binding.implementation_paths.map((path) => 'file:' + path),
  ].sort();
  ticket.exclusive_resources = resources;
  claim.resources = resources;
  release.resources = resources;
  release.decision_pointer = 'owner:original-release-disposition';
  ledger.revision += 1;
  const joined = continuationProjection.validateConfiguredFrontierOwnerRelease({
    work,
    ledger,
    identity,
    nativeSessionHandle: owner,
  });
  expect(joined.ticket).toEqual(ticket);
  expect(joined.claim).toEqual(claim);
  expect(joined.release).toEqual(release);
  const invalid = (mutate: (value: MutableCoordinationLedger) => void) => {
    const changed = mutableCoordinationLedger(ledger);
    mutate(changed);
    expect(() =>
      continuationProjection.validateConfiguredFrontierOwnerRelease({
        work,
        ledger: changed,
        identity,
        nativeSessionHandle: owner,
      }),
    ).toThrow();
  };
  invalid((value) =>
    requireFixtureValue(value.tickets.at(-1), 'ticket to mutate').exclusive_resources.push('file:foreign.ts'),
  );
  invalid(
    (value) =>
      (requireFixtureValue(value.claims.at(-1), 'claim to mutate').resources = ['execution:' + identity.work_id]),
  );
  invalid(
    (value) =>
      (requireFixtureValue(value.operations.at(-1), 'operation to mutate').to_ledger_revision = value.revision + 1),
  );
  invalid((value) => (requireFixtureValue(value.operations.at(-1), 'operation to mutate').decision_pointer = ''));
  invalid((value) =>
    value.operations.push({
      ...requireFixtureValue(value.operations.at(-1), 'operation to copy'),
      operation_id: 'new-owner-op',
      kind: 'acquire',
      from_ledger_revision: value.revision - 1,
      to_ledger_revision: value.revision,
    }),
  );
  invalid((value) =>
    value.tickets.push({
      ...ticket,
      ticket_id: 'foreign-active',
      work_id: 'foreign',
      thread_id: 'foreign',
      status: 'active',
    }),
  );
});

test.each(['implementation', 'awaiting_followup'])(
  'unissued frontier repair preserves the actual suspended %s phase',
  (phase) => {
    const input = configuredFrontierRepairFixture(true, false, undefined, phase);
    expect(() => continuationRepair.validateConfiguredFrontierReceiptStructure(input)).not.toThrow();
    expect(input.receipt.prior_work.execution.phase).toBe(phase);
    const other = configuredFrontierRepairFixture(true, false, undefined, 'review');
    expect(() => continuationRepair.validateConfiguredFrontierReceiptStructure(other)).toThrow();
  },
);

test('configured continuation reads actual regular commit blobs instead of trusting a Source hash report', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'frontier-commit-proof-'));
  trackContinuationFixtureRoot(root);
  const git = (args: string[], input?: string): string => {
    const result = spawnSync('git', args, {
      cwd: root,
      windowsHide: true,
      encoding: 'utf8',
      ...(input === undefined ? {} : { input }),
    });
    expect(result.status, result.stderr).toBe(0);
    return result.stdout.trim();
  };
  git(['init', '--quiet']);
  writeFileSync(path.join(root, 'literal[one].ts'), 'actual committed bytes');
  git(['add', '--', 'literal[one].ts']);
  git([
    '-c',
    'user.name=Fixture',
    '-c',
    'user.email=fixture@example.invalid',
    'commit',
    '--quiet',
    '-m',
    'fixture Source',
  ]);
  const commit = git(['rev-parse', 'HEAD']);
  const after = {
    path: 'literal[one].ts',
    exists: true,
    bytes: Buffer.byteLength('actual committed bytes'),
    sha256: createHash('sha256').update('actual committed bytes').digest('hex'),
  };
  const change = {
    path: after.path,
    kind: 'appeared',
    before: { path: after.path, exists: false, bytes: null, sha256: null },
    after,
  };
  expect(assertCommittedSourceChanges(root, commit, [change])).toMatchObject({
    checked_paths: 1,
    remote_publication_verified: false,
  });
  expect(() =>
    assertCommittedSourceChanges(root, commit, [{ ...change, after: { ...after, sha256: '0'.repeat(64) } }]),
  ).toThrow();
  expect(() => assertCommittedSourceChanges(root, '0'.repeat(40), [change])).toThrow();
  expect(() =>
    assertCommittedSourceChanges(root, commit, [{ ...change, after: { ...after, bytes: after.bytes + 1 } }]),
  ).toThrow();
  const blob = git(['hash-object', '-w', '--stdin'], 'literal[one].ts');
  git(['update-index', '--add', '--cacheinfo', '120000,' + blob + ',link.ts']);
  git([
    '-c',
    'user.name=Fixture',
    '-c',
    'user.email=fixture@example.invalid',
    'commit',
    '--quiet',
    '-m',
    'fixture link',
  ]);
  const linkedCommit = git(['rev-parse', 'HEAD']);
  const linkedAfter = {
    path: 'link.ts',
    exists: true,
    bytes: Buffer.byteLength('literal[one].ts'),
    sha256: createHash('sha256').update('literal[one].ts').digest('hex'),
  };
  const linkedChange = { path: linkedAfter.path, after: linkedAfter };
  expect(() => assertCommittedSourceChanges(root, linkedCommit, [linkedChange])).toThrow(/regular/);
});

/** Construct parser-contract fixture data only; these values are not native delivery or acceptance evidence. */
function normalConfigEndpointProof(request: DeliveredWorkContinuationRequest): ClosedConfigRebindProof {
  const originalTransition = request.sourceTransition.transition;
  const workspaceId =
    originalTransition.schema === 'RuntimeConfigDeliveryTransition/v1'
      ? originalTransition.fence.workspace_id
      : originalTransition.workspace_id;
  const transition: ConfiguredRuntimeEndpointTransition = {
    schema: 'ConfiguredRuntimeEndpointTransition/v1',
    workspace_id: workspaceId,
    repository_id: request.identity.repository_id,
    project_ids: request.identity.project_ids,
    operation_path: '.agent/work/config-only/runtime-config-rebind-operation.v1.json',
    target_config_digest: request.targetConfigDigest,
    target_schema_digest: request.targetSchemaDigest,
    receipt_path: '.agent/runtime-initialization.v1.json',
    prior_runtime_code_digest: request.priorRuntimeCodeDigest,
    target_runtime_code_digest: request.targetRuntimeCodeDigest,
    parent_manifest_digest: request.parentManifestDigest,
    successor_manifest_digest: request.successorManifestDigest,
    parent_manifest_ref: '.tmp/endpoint/parent/manifest.json',
    successor_manifest_ref: '.tmp/endpoint/current/manifest.json',
    system_update_operation_id: request.forwardOperationId,
    system_update_ref: '.tmp/endpoint/system-updated-result.json',
    system_update_sha256: 'a'.repeat(64),
    source_correction_ref: '.tmp/endpoint/source-publication.json',
    source_correction_sha256: 'a'.repeat(64),
    original_intake_ref: '.agent/work/original/local-session-intake.v1.json',
    original_intake_sha256: 'a'.repeat(64),
    operation_sha256: 'a'.repeat(64),
    operation_plan_digest: 'a'.repeat(64),
    operation_release_digest: 'a'.repeat(64),
    target_yaml_sha256: 'a'.repeat(64),
    receipt_sha256: 'a'.repeat(64),
    native_self_attestation_digest: 'a'.repeat(64),
    runtime_accepted: false,
  };
  return {
    status: 'closed_config_rebind_proven',
    operation_id: 'config-only',
    baseline_config_digest: request.priorConfigDigest,
    transition,
    transition_digest: canonicalJsonDigest(transition),
    caller_owner_cas_required: true,
    runtime_accepted: false,
    writes_host_state: false,
  };
}

function useNormalConfigEndpointProof(input: { receipt: ConfiguredFrontierReceipt }) {
  const receipt = input.receipt;
  const request = { ...receipt.request, sourceTransition: normalConfigEndpointProof(receipt.request) };
  input.receipt = {
    ...receipt,
    request,
    request_digest: canonicalJsonDigest(request),
    authorization: {
      ...receipt.authorization,
      request_digest: canonicalJsonDigest(request),
      transition_digest: request.sourceTransition.transition_digest,
    },
    continuation_id: canonicalJsonDigest({
      identity: request.identity,
      attempt: request.attempt,
      action_id: request.action.request.action_id,
      transition_digest: request.sourceTransition.transition_digest,
    }),
  };
  return input;
}

test('normal config endpoint receipt repair retains current maintenance CAS without inventing a delivery fence', () => {
  const input = useNormalConfigEndpointProof(mutableFrontierFixture(configuredFrontierRepairFixture(true)));
  expect(() => continuationRepair.validateConfiguredFrontierReceiptStructure(input)).not.toThrow();
  const request = {
    ...input.receipt.request,
    expectedMaintenanceGeneration: input.receipt.request.expectedMaintenanceGeneration + 1,
  };
  const receipt = {
    ...input.receipt,
    request,
    request_digest: canonicalJsonDigest(request),
    authorization: { ...input.receipt.authorization, request_digest: canonicalJsonDigest(request) },
  };
  expect(() => continuationRepair.validateConfiguredFrontierReceiptStructure({ ...input, receipt })).not.toThrow();
});

test('continuation separates accepted implementation and documentation paths from read-only evidence paths', () => {
  const originalWork = configuredFrontierRepairFixture(true).receipt.prior_work;
  const work: WorkState = {
    ...originalWork,
    binding: { ...originalWork.binding, implementation_paths: ['src/code.ts'] },
    lifecycle: {
      ...originalWork.lifecycle,
      scope: {
        ...originalWork.lifecycle.scope,
        allowed_paths: ['src/code.ts', 'docs/state.md', 'reference.txt'],
        documentation_paths: ['docs/state.md'],
      },
    },
  };
  const change = (path: string): ScopedSourceChange => ({
    path,
    kind: 'appeared',
    before: { path, exists: false, bytes: null, sha256: null },
    after: { path, exists: true, bytes: 1, sha256: 'a'.repeat(64) },
  });
  expect(() =>
    continuationProjection.validateContinuationSourceChangePaths(work, [
      change('src/code.ts'),
      change('docs/state.md'),
    ]),
  ).not.toThrow();
  expect(() => continuationProjection.validateContinuationSourceChangePaths(work, [change('reference.txt')])).toThrow();
  expect(() => continuationProjection.validateContinuationSourceChangePaths(work, [change('foreign.ts')])).toThrow();
  const changedDocumentationWork: WorkState = {
    ...work,
    lifecycle: {
      ...work.lifecycle,
      scope: { ...work.lifecycle.scope, documentation_paths: ['reference.txt', 'not-accepted.md'] },
    },
  };
  expect(() =>
    continuationProjection.validateContinuationSourceChangePaths(changedDocumentationWork, [change('not-accepted.md')]),
  ).toThrow();
});

test('normal config endpoint proof is separate from delivery and binds only the configured unissued frontier', () => {
  const input = configuredFrontierRepairFixture(true);
  const original = input.receipt.request;
  const proof = normalConfigEndpointProof(original);
  const request = {
    ...original,
    expectedMaintenanceGeneration: original.expectedMaintenanceGeneration + 1,
    sourceTransition: proof,
  };
  expect(validateDeliveredWorkContinuationRequest(request)).toEqual(request);
  expect(() => validateClosedConfigTransitionProof(proof)).toThrow();
  const historical = requestFixture();
  expect(() => validateDeliveredWorkContinuationRequest({ ...historical, sourceTransition: proof })).toThrow();
  for (const patch of [
    { workspace_id: 'bad' },
    { project_ids: [...proof.transition.project_ids, ...proof.transition.project_ids] },
    { parent_manifest_ref: '../outside.json' },
    { operation_sha256: 'bad' },
    { extra: true },
    { runtime_accepted: true },
    { target_schema_digest: '1'.repeat(64) },
    { target_runtime_code_digest: '2'.repeat(64) },
    { system_update_operation_id: 'unrelated' },
    { repository_id: 'foreign' },
  ]) {
    const malformedRequest: unknown = {
      ...request,
      sourceTransition: {
        ...proof,
        transition: { ...proof.transition, ...patch },
        transition_digest: canonicalJsonDigest({ ...proof.transition, ...patch }),
      },
    };
    expect(() =>
      invokeUnknownBoundary(validateDeliveredWorkContinuationRequest, undefined, [malformedRequest]),
    ).toThrow();
  }
  expect(() =>
    validateDeliveredWorkContinuationRequest({
      ...request,
      sourceTransition: { ...proof, transition_digest: '0'.repeat(64) },
    }),
  ).toThrow();
});

test('admitted runtime uses the Host stored normal continuation endpoint without rewriting the protected old inventory', async () => {
  const { root, config, workspaceId, input, intakePath } = configuredFrontierRepairHostRoot('normal');
  const access = runtimePackageAccess();
  const currentCode = snapshotRuntimePackageSources(
    access,
    config.runtime.bundle,
    runtimePackageCodePaths(config.runtime.bundle),
  );
  const schemaDigest = createHash('sha256')
    .update(access.readBytes('schemas/agent-runtime-config.v1.schema.json', 'fixture schema'))
    .digest('hex');
  const original = input.receipt;
  const intakeRef = requireFixtureValue(
    original.prior_work.artifacts.find((ref) => ref.artifact_id === 'local-session-intake'),
    'original local-session intake artifact',
  );
  const originalProof = original.request.sourceTransition;
  if (originalProof.status !== 'closed_config_rebind_proven')
    throw new Error('Configured frontier fixture did not provide a closed config rebind proof');
  const transition = {
    ...originalProof.transition,
    target_runtime_code_digest: currentCode.digest,
    target_schema_digest: schemaDigest,
    original_intake_ref: intakeRef.path,
    original_intake_sha256: intakeRef.sha256,
  };
  const sourceTransition = {
    ...originalProof,
    transition,
    transition_digest: canonicalJsonDigest(transition),
  };
  const project = loadProjectSetContext(
    root,
    config,
    config.repository.repository_id,
    original.request.identity.project_ids,
  );
  const request: DeliveredWorkContinuationRequest = {
    ...original.request,
    targetRuntimeCodeDigest: currentCode.digest,
    targetSchemaDigest: schemaDigest,
    targetProjectContextDigest: project.project_context_digest,
    sourceTransition,
  };
  const successorBinding = {
    ...original.successor_binding,
    runtime_source_revision: currentCode.digest,
    runtime_code_digest: currentCode.digest,
    schema_digest: schemaDigest,
  };
  const successorWork = {
    ...original.successor_work,
    binding: successorBinding,
    lifecycle: {
      ...original.successor_work.lifecycle,
      config_binding: {
        ...original.successor_work.lifecycle.config_binding,
        schema_digest: schemaDigest,
        runtime_code_digest: currentCode.digest,
      },
    },
  };
  input.receipt = {
    ...original,
    request,
    request_digest: canonicalJsonDigest(request),
    successor_binding: successorBinding,
    successor_work: successorWork,
    work_version: { revision: successorWork.revision, digest: canonicalJsonDigest(successorWork) },
    authorization: {
      ...original.authorization,
      request_digest: canonicalJsonDigest(request),
      transition_digest: sourceTransition.transition_digest,
    },
    continuation_id: canonicalJsonDigest({
      identity: request.identity,
      attempt: request.attempt,
      action_id: request.action.request.action_id,
      transition_digest: sourceTransition.transition_digest,
    }),
  };
  const databasePath = path.join(root, config.control.work_root, 'session-handoff.v1.sqlite');
  mkdirSync(path.dirname(databasePath), { recursive: true });
  const f = await continuationFixture({
    root,
    config,
    workspaceId,
    databasePath,
    repositoryRoot: root,
    identity: request.identity,
  });
  seedFrontierHostFixture(f, input);
  const before = readFileSync(path.join(root, intakePath));
  expect(assertAdmittedRuntimeCodeCurrent(root, f.store, f.identity).native_session_handle).toBe(
    request.nativeSessionHandle,
  );
  expect(readFileSync(path.join(root, intakePath))).toEqual(before);
  const row: unknown = f.db
    .query('SELECT payload,digest FROM agent_host_delivered_work_continuation WHERE workspace_id=?')
    .get(workspaceId);
  if (!isPlainRecord(row) || typeof row.payload !== 'string' || typeof row.digest !== 'string')
    throw new Error('Fixture continuation row is missing its payload or digest');
  for (const patch of [
    { original_intake_sha256: '0'.repeat(64) },
    { original_intake_ref: '.agent/work/foreign/intake.json' },
    { target_runtime_code_digest: '0'.repeat(64) },
  ]) {
    const badTransition = { ...transition, ...patch };
    const badRequest = {
      ...request,
      sourceTransition: {
        ...sourceTransition,
        transition: badTransition,
        transition_digest: canonicalJsonDigest(badTransition),
      },
    };
    const badReceipt = {
      ...input.receipt,
      request: badRequest,
      request_digest: canonicalJsonDigest(badRequest),
      authorization: {
        ...input.receipt.authorization,
        request_digest: canonicalJsonDigest(badRequest),
        transition_digest: badRequest.sourceTransition.transition_digest,
      },
      continuation_id: canonicalJsonDigest({
        identity: badRequest.identity,
        attempt: badRequest.attempt,
        action_id: badRequest.action.request.action_id,
        transition_digest: badRequest.sourceTransition.transition_digest,
      }),
    };
    f.db
      .query('UPDATE agent_host_delivered_work_continuation SET payload=?,digest=? WHERE workspace_id=?')
      .run(canonicalJson(badReceipt), canonicalJsonDigest(badReceipt), workspaceId);
    expect(() => assertAdmittedRuntimeCodeCurrent(root, f.store, f.identity)).toThrow();
  }
  f.db
    .query('UPDATE agent_host_delivered_work_continuation SET payload=?,digest=? WHERE workspace_id=?')
    .run(row.payload, row.digest, workspaceId);
  writeFileSync(path.join(root, intakePath), '{}');
  expect(() => assertAdmittedRuntimeCodeCurrent(root, f.store, f.identity)).toThrow(/intake changed/);
});
/** @param {ReturnType<typeof loadRuntimeConfig>} [config] @param {string} [repositoryRoot] @param {string} [workspaceId] */
test('current prewriter projection preserves the unissued developer and offers every configured reviewer', () => {
  const { binding, engine, journal, source, context, waveIndex, developerIndex, oldRequest } =
    prewriterProjectionFixture();
  const before = structuredClone({ engine, journal });
  const requests = continuationProjection.projectConfiguredPrewriterContinuationRequests(binding);
  expect(requests.map((request) => request.role).sort()).toEqual(['security-prewriter', 'source-planner']);
  expect(
    requests.every(
      (request) =>
        request.run_id === engine.run_id &&
        request.wave_index === waveIndex &&
        request.stage_id === 'review_source_prewrite' &&
        request.config_digest === runtimeConfigDigest(runtimeConfig),
    ),
  ).toBe(true);
  expect(new Set(requests.map((request) => request.action_id)).size).toBe(2);
  expect({ engine, journal }).toEqual(before);
  const changedScope = sourceScope(
    source.entries.map((entry) => ({
      ...entry,
      bytes: requireFixtureValue(entry.bytes, `byte count for ${entry.path}`) + 1,
      sha256: '7'.repeat(64),
    })),
  );
  const changedBinding = {
    ...binding,
    currentSourceScope: changedScope,
    context: { ...context, scope_digest: changedScope.digest },
  };
  const changedRequests = continuationProjection.projectConfiguredPrewriterContinuationRequests(changedBinding);
  expect(changedRequests.every((request) => request.scope_digest === changedScope.digest)).toBe(true);
  expect(
    projectConfiguredFrontierContinuationAction({
      engine,
      journal,
      targetConfigDigest: runtimeConfigDigest(runtimeConfig),
      currentSourceScope: changedScope,
    }),
  ).toMatchObject({ source_scope_digest: changedScope.digest, request: oldRequest });
  expect({ engine, journal }).toEqual(before);
  const malformedBindings: readonly unknown[] = [
    { ...binding, journal: { ...journal, items: [{ ...journal.items[0], issue_id: 'already-issued' }] } },
    { ...binding, engine: { ...engine, observations: [] } },
    { ...binding, context: { ...context, work_id: 'another-work' } },
    {
      ...binding,
      engine: { ...engine, step_id: 'wave-' + developerIndex },
      journal: { ...journal, step_id: 'wave-' + developerIndex },
    },
    { ...binding, journal: { ...journal, research_wave_exposure: 'possible' } },
  ];
  for (const changed of malformedBindings)
    expect(() =>
      invokeUnknownBoundary(continuationProjection.projectConfiguredPrewriterContinuationRequests, undefined, [
        changed,
      ]),
    ).toThrow();
});
test('a configured frontier is offered only when its exact persisted request is wholly unissued', () => {
  const fixture = requestFixture();
  const request = fixture.action.request,
    engine: SessionBridgeSnapshot = {
      run_id: 'run-1',
      status: 'suspended',
      step_id: 'validate_parallel',
      requests: [request],
      observations: [],
    },
    journal: MastraSessionLedgerState = {
      schema: 'MastraSessionLedger/v1',
      workspace_id: fixtureWorkspace,
      work_id: fixture.identity.work_id,
      attempt: fixture.attempt,
      run_id: 'run-1',
      step_id: 'validate_parallel',
      items: [{ request, issue_id: null, observation: null }],
      completed: [],
    },
    currentSourceScope = fixture.currentSourceScope;

  expect(
    projectConfiguredFrontierContinuationAction({
      engine,
      journal,
      targetConfigDigest: '6'.repeat(64),
      currentSourceScope,
    }),
  ).toMatchObject({ kind: 'configured_frontier', request });

  for (const changed of [
    { ...journal.items[0], issue_id: 'issued-once' },
    { ...journal.items[0], observation: { status: 'reported_failed' } },
    { ...journal.items[0], host_reservation: { issued: true } },
    { ...journal.items[0], research_activation: { issued: true } },
  ]) {
    expect(() =>
      invokeUnknownBoundary(projectConfiguredFrontierContinuationAction, undefined, [
        {
          engine,
          journal: { ...journal, items: [changed] },
          targetConfigDigest: '6'.repeat(64),
          currentSourceScope,
        },
      ]),
    ).toThrow();
  }

  expect(() =>
    projectConfiguredFrontierContinuationAction({
      engine,
      journal: {
        ...journal,
        items: [
          requireFixtureValue(journal.items[0], 'fixture journal action'),
          requireFixtureValue(journal.items[0], 'fixture journal action'),
        ],
      },
      targetConfigDigest: '6'.repeat(64),
      currentSourceScope,
    }),
  ).toThrow(/one exact unissued journal action/);
});

test('an authorized Source bridge preserves the original path set and rejects any unmatched drift', () => {
  const original = sourceScope([
      { path: 'packages/agent/src/work.ts', exists: true, bytes: 4, sha256: '1'.repeat(64) },
      { path: 'packages/agent/tests/work.test.mjs', exists: true, bytes: 3, sha256: '2'.repeat(64) },
    ]),
    current = sourceScope([
      { path: 'packages/agent/src/work.ts', exists: true, bytes: 5, sha256: '3'.repeat(64) },
      { path: 'packages/agent/tests/work.test.mjs', exists: true, bytes: 3, sha256: '2'.repeat(64) },
    ]);
  const originalWorkEntry = requireFixtureValue(original.entries[0], 'first original Source entry'),
    originalTestEntry = requireFixtureValue(original.entries[1], 'second original Source entry'),
    currentWorkEntry = requireFixtureValue(current.entries[0], 'first current Source entry');
  const authorizedChanges: ScopedSourceChange[] = [
    {
      path: 'packages/agent/src/work.ts',
      kind: 'changed',
      before: originalWorkEntry,
      after: currentWorkEntry,
    },
  ];

  expect(validateCurrentSourceScopeBridge({ original, current, authorizedChanges })).toEqual(current);
  expect(() =>
    validateCurrentSourceScopeBridge({
      original,
      current,
      authorizedChanges: [
        ...authorizedChanges,
        {
          path: originalTestEntry.path,
          kind: 'changed',
          before: originalTestEntry,
          after: { ...originalTestEntry, bytes: 4, sha256: '8'.repeat(64) },
        },
      ],
    }),
  ).toThrow();
  expect(() => validateCurrentSourceScopeBridge({ original, current, authorizedChanges: [] })).toThrow(
    /outside the accepted beforeimage bridge/,
  );
  expect(() =>
    validateCurrentSourceScopeBridge({
      original,
      current: sourceScope([
        { path: 'packages/agent/src/work.ts', exists: true, bytes: 5, sha256: '3'.repeat(64) },
        { path: 'packages/agent/tests/work.test.mjs', exists: true, bytes: 4, sha256: '4'.repeat(64) },
      ]),
      authorizedChanges,
    }),
  ).toThrow(/outside the accepted beforeimage bridge/);
  expect(() =>
    validateCurrentSourceScopeBridge({
      original,
      current: sourceScope([{ path: 'packages/agent/src/work.ts', exists: true, bytes: 5, sha256: '3'.repeat(64) }]),
      authorizedChanges,
    }),
  ).toThrow(/different scope/);
});

test('closed transition and continuation request bind the original configuration, current scope, and one real next action', () => {
  const request = requestFixture(),
    validated = validateDeliveredWorkContinuationRequest(request);
  expect(validateClosedConfigTransitionProof(request.sourceTransition).baseline_config_digest).toBe(
    request.priorConfigDigest,
  );
  expect(validated.action).toEqual(request.action);
  // The action validator is also a public ingress independent of the complete
  // request. Keep its direct normalization and fail-closed shape/binding proof.
  expect(continuationProjection.validateDeliveredWorkContinuationAction(request.action)).toEqual(validated.action);
  for (const nonobject of [null, [], 0])
    expect(() => continuationProjection.validateDeliveredWorkContinuationAction(nonobject)).toThrow(
      /next action must be an object/,
    );
  expect(() =>
    continuationProjection.validateDeliveredWorkContinuationAction({ ...request.action, unexpected: true }),
  ).toThrow(/action fields are invalid/);
  expect(() =>
    continuationProjection.validateDeliveredWorkContinuationAction({ ...request.action, run_id: 'foreign-run' }),
  ).toThrow(/action binding is invalid/);

  const authorization = {
    schema: 'VidaDeliveredWorkContinuationAuthorization/v1',
    request_digest: canonicalJsonDigest(validated),
    principal: 'vida-agent-delivered-work-continuation',
    transition_digest: validated.sourceTransition.transition_digest,
    action_digest: canonicalJsonDigest(validated.action),
  } as const satisfies Parameters<typeof validateDeliveredWorkContinuationAuthorization>[0];
  expect(
    validateDeliveredWorkContinuationAuthorization(authorization, validated, 'vida-agent-delivered-work-continuation'),
  ).toEqual(authorization);

  const wrongBaseline: unknown = {
    ...request,
    sourceTransition: { ...request.sourceTransition, baseline_config_digest: 'e'.repeat(64) },
  };
  expect(() => invokeUnknownBoundary(validateDeliveredWorkContinuationRequest, undefined, [wrongBaseline])).toThrow();

  const wrongSource: unknown = {
    ...request,
    action: { ...request.action, source_scope_digest: 'f'.repeat(64) },
  };
  expect(() => invokeUnknownBoundary(validateDeliveredWorkContinuationRequest, undefined, [wrongSource])).toThrow();

  const historical = projectHistoricalTerminalReviewAction({
    workflowId: 'implementation_change',
    sourceScopeDigest: request.currentSourceScope.digest,
    targetConfigDigest: request.targetConfigDigest,
    capture: {
      action_id: '1'.repeat(64),
      issue_id: 'original-terminal-issue',
      receipt_digest: '2'.repeat(64),
      body_sha256: '3'.repeat(64),
      body_ref: '.tmp/captured-body.json',
    },
    originalRequestPointer: request.originalRequestPointer,
    request: {
      ...request.action.request,
      action_id: '4'.repeat(64),
      assignment_index: 0,
      role: 'correctness-validator',
      config_digest: request.targetConfigDigest,
      bindings_manifest_ref: '5'.repeat(64),
    },
  });
  expect(historical.kind).toBe('historical_terminal_review');
  expect(continuationProjection.validateDeliveredWorkContinuationAction(historical)).toEqual(historical);
  expect(historical.request.stage_id).toBe('validate_parallel');
  expect(historical.request.role).toBe('correctness-validator');

  const pointerMismatch = {
    ...request,
    action: historical,
    originalRequestPointer: 'WORK.md#different-request',
  };
  expect(() => validateDeliveredWorkContinuationRequest(pointerMismatch)).toThrow(/action binding is invalid/);
});

test('public runtime-code entry requires and accepts the finite delivered-config continuation basis', async () => {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-delivered-continuation-cli-'));
  trackContinuationFixtureRoot(root);
  const args = [
    '--kind',
    'runtime-code',
    '--mode',
    'plan',
    '--project-root',
    root,
    '--repair-id',
    'continuation-plan-20261007',
    '--actor',
    'test-owner',
    '--timestamp',
    '2026-10-07T00:00:00.000Z',
    '--projects',
    'agent',
    '--work-id',
    'audit-36-core-20261001',
    '--attempt',
    '1',
    '--action-id',
    '4'.repeat(64),
    '--issue-id',
    'original-terminal-issue',
    '--native-handle',
    'original-thread',
    '--forward-operation-id',
    'forward-20261007',
    '--owner-no-call-ref',
    'WORK.md#accepted-request',
    '--basis',
    'delivered-config-continuation',
  ];

  await Promise.resolve(expect(runRuntimeCodeRebind(args)).rejects.toThrow(/missing or unexpected arguments/));
  const completeArgs = [...args, '--source-transition-id', 'p0-delivered-config-local-20261006'];
  let message = '';
  try {
    await runRuntimeCodeRebind(completeArgs);
  } catch (error) {
    if (!(error instanceof Error)) throw new Error('Runtime rebind failed with a non-Error fixture value');
    message = error.message;
  }
  expect(message.length).toBeGreaterThan(0);
  expect(message).not.toMatch(/missing or unexpected arguments/);
});

test('Host atomically bridges the original capture to one current Core review under the same owner and attempt', async () => {
  const f = await continuationFixture();
  try {
    const request = continuationRequestFor(f),
      beforeJournal = requireFixtureValue(
        f.store.readWorkSessionJournal(f.identity),
        'before continuation journal',
      ).state,
      planBody = {
        schema: 'VidaDeliveredWorkContinuationPlan/v1',
        repair_id: 'continuation-plan-20261007',
        actor: 'fixture-owner',
        timestamp: '2026-10-07T00:00:00.000Z',
        source_transition_id: request.sourceTransition.operation_id,
        runtime_code_paths: ['packages/agent/src/runtime-kernel.ts'],
        request,
      } satisfies Omit<Parameters<typeof applyDeliveredWorkContinuationPlan>[0]['plan'], 'digest'>,
      plan = { ...planBody, digest: canonicalJsonDigest(planBody) } satisfies Parameters<
        typeof applyDeliveredWorkContinuationPlan
      >[0]['plan'],
      result = await applyDeliveredWorkContinuationPlan({
        database: f.db,
        root: f.root,
        workspaceId: fixtureWorkspace,
        plan,
        rebuildPlan: async () => plan,
      }),
      after = result.snapshot,
      afterJournalRow: unknown = f.db
        .query(
          'SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?',
        )
        .get(fixtureWorkspace, f.identity.work_id, 1);
    if (!isPlainRecord(afterJournalRow)) throw new Error('Fixture journal query returned no row');
    const afterJournal = {
      revision: afterJournalRow.revision,
      payload: requireFixtureTextColumn(afterJournalRow, 'payload'),
      digest: requireFixtureTextColumn(afterJournalRow, 'digest'),
    };
    if (typeof afterJournal.revision !== 'number') throw new Error('Fixture journal revision is not numeric');
    const nextJournal = requireFixtureValue(f.store.readWorkSessionJournal(f.identity), 'continued journal').state;
    const afterWork = requireFixtureValue(after.work, 'continued work'),
      afterLease = requireFixtureValue(afterWork.lease, 'continued work lease'),
      afterLedger = requireFixtureValue(after.ledger, 'continued coordination ledger');

    expect(result.status).toBe('continued');
    expect(result.action).toEqual(request.action);
    expect(afterWork.binding).toMatchObject({
      config_digest: request.targetConfigDigest,
      work_source_revision: request.currentSourceScope.digest,
      runtime_source_revision: request.targetRuntimeCodeDigest,
      runtime_code_digest: request.targetRuntimeCodeDigest,
      schema_digest: request.targetSchemaDigest,
    });
    expect(afterWork.binding.lifecycle_work_id).toBe(f.identity.work_id);
    expect(afterWork.execution.run_id).toBe('run-fixture');
    expect(afterWork.execution.status).toBe('active');
    expect(afterLease.thread_id).toBe('fixture-thread');
    expect(afterWork.lifecycle.phase).toBe('INTAKE');
    expect(afterWork.lifecycle.next_action).toContain('body remains unaccepted');
    expect(result.receipt.rights_granted).toBe(false);
    expect(result.receipt.accepted_result).toBe(false);
    expect(result.receipt.runtime_acceptance).toBe(false);
    expect(result.receipt.prior_work.binding.config_digest).toBe(request.priorConfigDigest);
    expect(result.receipt.prior_work.binding.work_source_revision).toBe(f.originalSource.digest);
    expect(result.receipt.prior_journal).toEqual(beforeJournal);
    expect(result.receipt.historical_capture).toEqual(f.capture);
    expect(nextJournal.source_scope).toEqual(request.currentSourceScope);
    expect(nextJournal.completed).toEqual([
      { step_id: requireFixtureValue(beforeJournal.step_id, 'prior journal step id'), items: beforeJournal.items },
    ]);
    expect(nextJournal.items).toEqual([{ request: request.action.request, issue_id: null, observation: null }]);
    expect(afterJournal.revision).toBe(request.expectedJournal.revision + 1);
    expect(afterJournal.digest).toBe(canonicalJsonDigest(nextJournal));
    const finalTicket = requireFixtureValue(afterLedger.tickets.at(-1), 'continued final ticket');
    expect(finalTicket.exclusive_resources).toEqual(['execution:' + f.identity.work_id]);
    expect(finalTicket.source_revision).toBe(request.currentSourceScope.digest);

    const lookup = requireFixtureValue(
      f.store.readDeliveredWorkContinuation(f.identity, 1),
      'continued frontier lookup',
    );
    const lookupSnapshot = lookup.snapshot,
      lookupJournal = requireFixtureValue(lookup.journal, 'continued frontier journal'),
      lookupItem = requireFixtureValue(lookup.item, 'continued frontier item'),
      lookupLedger = requireFixtureValue(lookupSnapshot.ledger, 'continued lookup ledger');
    expect(lookup.action_status).toBe('unissued');
    expect(lookup.receipt).toEqual(result.receipt);
    for (const value of [
      lookup,
      lookup.receipt,
      lookup.snapshot,
      lookupJournal,
      lookupJournal.state,
      lookupItem,
      lookup.items,
      lookup.item_statuses,
      lookupItem.request,
      requireFixtureValue(lookupLedger.tickets[0], 'continued lookup ticket').exclusive_resources,
    ])
      expect(Object.isFrozen(value)).toBe(true);
    expect(requireFixtureValue(lookupSnapshot.work, 'continued lookup work').binding).toEqual(
      result.receipt.successor_binding,
    );
    expect(lookupJournal.version).toEqual({ revision: afterJournal.revision, digest: afterJournal.digest });
    expect(lookupItem).toEqual(requireFixtureValue(nextJournal.items[0], 'continued journal item'));

    const replay: unknown = await applyDeliveredWorkContinuationPlan({
      database: f.db,
      root: f.root,
      workspaceId: fixtureWorkspace,
      plan,
      rebuildPlan: async () => plan,
    });
    if (!isPlainRecord(replay)) throw new Error('Continuation replay returned no result record');
    expect(replay.status).toBe('already_continued');
    expect(replay.action).toBeNull();
    expect(replay.snapshot).toEqual(after);
  } finally {
  }
});

test('the current read-only review issue and report are recoverable without reissue or engine resume', async () => {
  const f = await continuationFixture();
  try {
    const request = continuationRequestFor(f),
      planBody = {
        schema: 'VidaDeliveredWorkContinuationPlan/v1',
        repair_id: 'continuation-plan-20261007',
        actor: 'fixture-owner',
        timestamp: '2026-10-07T00:00:00.000Z',
        source_transition_id: request.sourceTransition.operation_id,
        runtime_code_paths: ['packages/agent/src/runtime-kernel.ts'],
        request,
      } satisfies Omit<Parameters<typeof applyDeliveredWorkContinuationPlan>[0]['plan'], 'digest'>,
      plan = { ...planBody, digest: canonicalJsonDigest(planBody) } satisfies Parameters<
        typeof applyDeliveredWorkContinuationPlan
      >[0]['plan'];
    await applyDeliveredWorkContinuationPlan({
      database: f.db,
      root: f.root,
      workspaceId: fixtureWorkspace,
      plan,
      rebuildPlan: async () => plan,
    });
    const ledger = new MastraSessionLedger(f.db, fixtureWorkspace, runtimeConfig, runtimeRoot, f.store),
      beforeIssue = requireFixtureValue(ledger.resume(f.identity.work_id, 1), 'continuation journal before issue'),
      issued = ledger.issueWave(f.identity.work_id, 1, beforeIssue.version),
      issuedItem = requireFixtureValue(issued.state.items[0], 'issued continuation item'),
      firstLookup = requireFixtureValue(
        f.store.readDeliveredWorkContinuation(f.identity, 1),
        'first continuation lookup',
      ),
      retryLookup = requireFixtureValue(
        f.store.readDeliveredWorkContinuation(f.identity, 1),
        'retry continuation lookup',
      );
    expect(issuedItem.request).toEqual(request.action.request);
    expect(firstLookup.action_status).toBe('issued');
    expect(firstLookup.item.issue_id).toBe(issuedItem.issue_id);
    expect(retryLookup.item.issue_id).toBe(issuedItem.issue_id);
    expect(retryLookup.journal.version).toEqual(issued.version);
    expect(retryLookup.receipt.accepted_result).toBe(false);

    const summary = 'Current read-only review completed; captured synthesis remains unaccepted.',
      observation: SessionBridgeObservation = {
        schema: 'VidaSessionObservation/v1',
        action_id: request.action.request.action_id,
        issue_id: requireFixtureValue(issuedItem.issue_id, 'issued continuation item issue id'),
        agent_id: 'fixture:correctness-validator',
        tool_call_ref: 'fixture:review-call',
        status: 'reported_complete',
        summary,
        output_digest: canonicalJsonDigest(summary),
        evidence_refs: ['fixture:review-evidence'],
      },
      reported = ledger.report(f.identity.work_id, 1, issued.version, observation, request.currentSourceScope),
      retryReport = ledger.report(f.identity.work_id, 1, issued.version, observation, request.currentSourceScope),
      reportedLookup = requireFixtureValue(
        f.store.readDeliveredWorkContinuation(f.identity, 1),
        'reported continuation lookup',
      );
    expect(requireFixtureValue(reported.state.items[0], 'reported continuation item').observation).toEqual(observation);
    expect(retryReport.version).toEqual(reported.version);
    expect(reportedLookup.action_status).toBe('reported');
    expect(reportedLookup.item.observation).toEqual(observation);
    expect(reportedLookup.receipt.runtime_acceptance).toBe(false);
    expect(reportedLookup.receipt.accepted_result).toBe(false);
    expect(() =>
      ledger.report(
        f.identity.work_id,
        1,
        issued.version,
        { ...observation, summary: 'different' },
        request.currentSourceScope,
      ),
    ).toThrow(/retry differs/);
  } finally {
  }
});

test('public runtime-code apply denies a changed rebuild before any Host or Journal write', async () => {
  const f = await continuationFixture();
  try {
    const request = continuationRequestFor(f),
      stateBefore = f.store.readHostStateSnapshot(f.identity),
      journalBefore = f.db
        .query(
          'SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?',
        )
        .get(fixtureWorkspace, f.identity.work_id, 1),
      planBody = {
        schema: 'VidaDeliveredWorkContinuationPlan/v1',
        repair_id: 'continuation-plan-20261007',
        actor: 'fixture-owner',
        timestamp: '2026-10-07T00:00:00.000Z',
        source_transition_id: request.sourceTransition.operation_id,
        runtime_code_paths: ['packages/agent/src/runtime-kernel.ts'],
        request,
      } satisfies Omit<Parameters<typeof applyDeliveredWorkContinuationPlan>[0]['plan'], 'digest'>,
      plan = { ...planBody, digest: canonicalJsonDigest(planBody) } satisfies Parameters<
        typeof applyDeliveredWorkContinuationPlan
      >[0]['plan'];
    await Promise.resolve(
      expect(
        applyDeliveredWorkContinuationPlan({
          database: f.db,
          root: f.root,
          workspaceId: fixtureWorkspace,
          plan,
          rebuildPlan: async () => ({ ...plan, digest: 'f'.repeat(64) }),
        }),
      ).rejects.toThrow(/plan, owner CAS or current Source proof changed/),
    );
    expect(f.store.readHostStateSnapshot(f.identity)).toEqual(stateBefore);
    expect(
      f.db
        .query(
          'SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?',
        )
        .get(fixtureWorkspace, f.identity.work_id, 1),
    ).toEqual(journalBefore);
  } finally {
  }
});

test('Host denies a current CAS conflict without changing the newer Host or Journal state', async () => {
  const f = await continuationFixture();
  try {
    const request = continuationRequestFor(f),
      before = f.store.readHostStateSnapshot(f.identity),
      beforeWork = requireFixtureValue(before.work, 'CAS baseline work'),
      beforeLedger = requireFixtureValue(before.ledger, 'CAS baseline ledger'),
      nextWork: WorkState = {
        ...beforeWork,
        revision: beforeWork.revision + 1,
        lifecycle: { ...beforeWork.lifecycle, revision: beforeWork.revision + 1 },
      },
      nextLedger: CoordinationLedger = { ...beforeLedger, revision: beforeLedger.revision + 1 };
    f.store.compareAndSwapHostState({
      expectedWork: requireFixtureValue(before.workVersion, 'CAS baseline work version'),
      expectedLedger: requireFixtureValue(before.ledgerVersion, 'CAS baseline ledger version'),
      expectedMaintenanceGeneration: before.maintenanceGeneration,
      nextWork,
      nextLedger,
    });
    const afterConcurrentWrite = f.store.readHostStateSnapshot(f.identity),
      journalBefore = f.db
        .query(
          'SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?',
        )
        .get(fixtureWorkspace, f.identity.work_id, 1);
    await Promise.resolve(expect(f.store.continueDeliveredWork(request)).rejects.toThrow());
    expect(f.store.readHostStateSnapshot(f.identity)).toEqual(afterConcurrentWrite);
    expect(
      f.db
        .query(
          'SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?',
        )
        .get(fixtureWorkspace, f.identity.work_id, 1),
    ).toEqual(journalBefore);
  } finally {
  }
});

test('Host denies a fresh overlapping FIFO owner before any continuation write', async () => {
  const f = await continuationFixture({ queued: true });
  try {
    const request = continuationRequestFor(f),
      before = f.store.readHostStateSnapshot(f.identity),
      journalBefore = f.db
        .query(
          'SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?',
        )
        .get(fixtureWorkspace, f.identity.work_id, 1);
    await Promise.resolve(expect(f.store.continueDeliveredWork(request)).rejects.toThrow(/FIFO/));
    expect(f.store.readHostStateSnapshot(f.identity)).toEqual(before);
    expect(
      f.db
        .query(
          'SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?',
        )
        .get(fixtureWorkspace, f.identity.work_id, 1),
    ).toEqual(journalBefore);
  } finally {
  }
});

test('stale continuation digest repair fences producers and changes only the row binding', async () => {
  const f = await continuationFixture();
  try {
    const request = continuationRequestFor(f);
    if (request.action.kind !== 'historical_terminal_review')
      throw new Error('Continuation fixture did not provide a historical capture action');
    const captureAction = request.action,
      body = {
        schema: 'VidaDeliveredWorkContinuationPlan/v1',
        repair_id: 'continuation-integrity-20261007',
        actor: 'fixture-owner',
        timestamp: '2026-10-07T00:00:00.000Z',
        source_transition_id: request.sourceTransition.operation_id,
        runtime_code_paths: ['packages/agent/src/runtime-kernel.ts'],
        request,
      } satisfies Omit<Parameters<typeof applyDeliveredWorkContinuationPlan>[0]['plan'], 'digest'>,
      continuation = await applyDeliveredWorkContinuationPlan({
        database: f.db,
        root: f.root,
        workspaceId: f.workspaceId,
        plan: { ...body, digest: canonicalJsonDigest(body) } satisfies Parameters<
          typeof applyDeliveredWorkContinuationPlan
        >[0]['plan'],
        rebuildPlan: async () =>
          ({ ...body, digest: canonicalJsonDigest(body) }) satisfies Parameters<
            typeof applyDeliveredWorkContinuationPlan
          >[0]['plan'],
      }),
      before = continuation.snapshot,
      journalBefore = requireFixtureJournalRow(
        f.db
          .query(
            'SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?',
          )
          .get(f.workspaceId, f.identity.work_id, 1),
      ),
      rowBefore = requireFixturePayloadDigest(
        f.db
          .query(
            'SELECT payload,digest FROM agent_host_delivered_work_continuation WHERE workspace_id=? AND work_id=? AND attempt=? AND action_id=?',
          )
          .get(f.workspaceId, f.identity.work_id, 1, captureAction.capture.action_id),
      );
    expect(continuation.status).toBe('continued');
    f.db
      .query(
        'UPDATE agent_host_delivered_work_continuation SET digest=? WHERE workspace_id=? AND work_id=? AND attempt=? AND action_id=?',
      )
      .run('0'.repeat(64), f.workspaceId, f.identity.work_id, 1, captureAction.capture.action_id);
    const inspection = f.store.inspectDeliveredWorkContinuationRepair(f.identity, 1, captureAction.capture.action_id),
      planBody = {
        schema: 'DeliveredWorkContinuationIntegrityRepairPlan/v1',
        branch: 'historical_terminal_review',
        repair_id: 'continuation-integrity-20261007',
        actor: 'fixture-owner',
        timestamp: '2026-10-07T00:00:00.000Z',
        inspection,
      },
      plan = { ...planBody, digest: canonicalJsonDigest(planBody) } satisfies Parameters<
        typeof f.store.reserveDeliveredWorkContinuationRepair
      >[0];
    f.store.reserveDeliveredWorkContinuationRepair(plan);
    expect(() => f.store.readDeliveredWorkContinuation(f.identity, 1)).toThrow(/repair is pending or unknown/);
    expect(() => f.store.assertSessionProducerWriteAllowed()).toThrow(/repair is pending or unknown/);
    f.db.exec(`CREATE TRIGGER interrupt_continuation_repair
      BEFORE UPDATE OF digest ON agent_host_delivered_work_continuation
      BEGIN SELECT RAISE(ABORT, 'continuation repair interrupted'); END`);
    expect(() => f.store.applyDeliveredWorkContinuationRepair(plan)).toThrow(/repair interrupted/);
    expect(() => f.store.assertSessionProducerWriteAllowed()).toThrow(/repair is pending or unknown/);
    expect(() => f.store.readDeliveredWorkContinuation(f.identity, 1)).toThrow(/repair is pending or unknown/);
    const interruptedRow = requireFixturePayloadDigest(
      f.db
        .query(
          'SELECT payload,digest FROM agent_host_delivered_work_continuation WHERE workspace_id=? AND work_id=? AND attempt=? AND action_id=?',
        )
        .get(f.workspaceId, f.identity.work_id, 1, captureAction.capture.action_id),
    );
    expect(interruptedRow.payload).toBe(rowBefore.payload);
    expect(interruptedRow.digest).toBe('0'.repeat(64));
    f.db.exec('DROP TRIGGER interrupt_continuation_repair');
    expect(f.store.applyDeliveredWorkContinuationRepair(plan).status).toBe('applied');
    const repaired = f.store.readHostStateSnapshot(f.identity),
      rowAfter = requireFixturePayloadDigest(
        f.db
          .query(
            'SELECT payload,digest FROM agent_host_delivered_work_continuation WHERE workspace_id=? AND work_id=? AND attempt=? AND action_id=?',
          )
          .get(f.workspaceId, f.identity.work_id, 1, captureAction.capture.action_id),
      ),
      journalAfter = requireFixtureJournalRow(
        f.db
          .query(
            'SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?',
          )
          .get(f.workspaceId, f.identity.work_id, 1),
      );
    expect(rowAfter.payload).toBe(rowBefore.payload);
    expect(rowAfter.digest).toBe(canonicalJsonDigest(JSON.parse(rowBefore.payload)));
    expect(repaired).toEqual(before);
    expect(journalAfter).toEqual(journalBefore);
    expect(
      requireFixtureValue(f.store.readDeliveredWorkContinuation(f.identity, 1), 'repaired continuation').action_status,
    ).toBe('unissued');
    expect(f.store.applyDeliveredWorkContinuationRepair(plan)).toEqual({
      status: 'already_applied',
      digest: rowAfter.digest,
    });
    f.db
      .query(
        'UPDATE agent_host_mastra_session_ledger SET revision=revision+1 WHERE workspace_id=? AND work_id=? AND attempt=?',
      )
      .run(f.workspaceId, f.identity.work_id, 1);
    expect(() => f.store.applyDeliveredWorkContinuationRepair(plan)).toThrow(/afterimage differs/);
  } finally {
  }
});

test('configured-frontier snapshot validation rejects changed bytes and unsupported repair branches', () => {
  const input = configuredFrontierRepairFixture(true);
  const { receipt } = input;
  expect(validateConfiguredFrontierRepairReceipt(input).branch).toBe('configured_frontier');
  expect(() => assertApplicableRepairBranch('configured_frontier')).not.toThrow();
  expect(() => assertApplicableRepairBranch('unvalidated-frontier')).toThrow(/unsupported/);
  const altered: unknown = {
    ...input,
    receipt: {
      ...receipt,
      frontier_snapshot: {
        ...receipt.frontier_snapshot,
        snapshot_bytes_base64: Buffer.from('changed').toString('base64'),
      },
    },
  };
  expect(() => invokeUnknownBoundary(validateConfiguredFrontierRepairReceipt, undefined, [altered])).toThrow();
  expect(() =>
    continuationRepair.validateConfiguredFrontierReceiptStructure(configuredFrontierRepairFixture()),
  ).toThrow();
});

test('future repair validates the full current prewriter wave and rejects omitted security or old developer requests', () => {
  const input = configuredFrontierRepairFixture(true);
  expect(validateConfiguredFrontierRepairReceipt(input).branch).toBe('configured_frontier');
  expect(input.receipt.successor_journal.items).toHaveLength(2);
  expect(input.receipt.successor_journal.completed).toEqual(input.receipt.prior_journal.completed);
  const replaceJournal = (journal: unknown): unknown => {
    const receipt = {
      ...input.receipt,
      successor_journal: journal,
      journal_version: { ...input.receipt.journal_version, digest: canonicalJsonDigest(journal) },
    };
    return { ...input, receipt, current: { ...input.current, journal, journal_version: receipt.journal_version } };
  };
  const original = input.receipt.successor_journal;
  const malformedItemSets: readonly unknown[][] = [
    original.items.filter((item) => item.request.role !== 'security-prewriter'),
    [{ ...original.items[0], request: input.receipt.request.action.request }, original.items[1]],
    [original.items[0], original.items[0]],
    [original.items[0], { ...original.items[1], issue_id: 'already-issued' }],
  ];
  for (const items of malformedItemSets) {
    const malformed: unknown = replaceJournal({ ...original, items });
    expect(() => invokeUnknownBoundary(validateConfiguredFrontierRepairReceipt, undefined, [malformed])).toThrow();
  }
  const mismatchedBinding: unknown = {
    ...input,
    prewriterBinding: { ...input.prewriterBinding, workflowId: 'bug_fix' },
  };
  expect(() =>
    invokeUnknownBoundary(validateConfiguredFrontierRepairReceipt, undefined, [mismatchedBinding]),
  ).toThrow();
  const missingSecurity = replaceJournal({
    ...original,
    items: original.items.filter((item) => item.request.role !== 'security-prewriter'),
  });
  const missingRisk: unknown = {
    ...(isPlainRecord(missingSecurity) ? missingSecurity : {}),
    prewriterBinding: {
      ...input.prewriterBinding,
      selection: { ...input.prewriterBinding.selection, risk_flags: [] },
      lifecycleRisk: 'low',
    },
  };
  expect(() => invokeUnknownBoundary(validateConfiguredFrontierRepairReceipt, undefined, [missingRisk])).toThrow();
  const changedSource = configuredFrontierRepairFixture(true, true);
  expect(validateConfiguredFrontierRepairReceipt(changedSource).branch).toBe('configured_frontier');
  expect(changedSource.receipt.request.action.request.scope_digest).not.toBe(
    changedSource.receipt.request.action.source_scope_digest,
  );
  const missingSourceChanges: unknown = {
    ...changedSource,
    receipt: { ...changedSource.receipt, request: { ...changedSource.receipt.request, authorizedSourceChanges: [] } },
  };
  expect(() =>
    invokeUnknownBoundary(validateConfiguredFrontierRepairReceipt, undefined, [missingSourceChanges]),
  ).toThrow();
});

test('frontier receipt history survives lease expiry while live repair still rejects expired or advanced dependencies', () => {
  const input = configuredFrontierRepairFixture(true);
  const ledger = {
    ...input.receipt.successor_ledger,
    tickets: input.receipt.successor_ledger.tickets.map((ticket) =>
      ticket.status === 'active' ? { ...ticket, expires_at: '2020-01-01T00:00:00.000Z' } : ticket,
    ),
    claims: input.receipt.successor_ledger.claims.map((claim) =>
      claim.status === 'active' ? { ...claim, lease_expires_at: '2020-01-01T00:00:00.000Z' } : claim,
    ),
  };
  const receipt = {
    ...input.receipt,
    successor_ledger: ledger,
    ledger_version: { ...input.receipt.ledger_version, digest: canonicalJsonDigest(ledger) },
  };
  const current = { ...input.current, ledger, ledger_version: receipt.ledger_version };
  const historical = { receipt, prewriterBinding: input.prewriterBinding };
  expect(continuationRepair.validateConfiguredFrontierReceiptStructure(historical).branch).toBe('configured_frontier');
  expect(() => validateConfiguredFrontierRepairReceipt({ ...historical, current })).toThrow(/expired/);
  const currentWork = requireFixtureValue(input.current.work, 'current frontier work');
  const advanced: unknown = {
    ...input,
    current: { ...input.current, work: { ...currentWork, revision: currentWork.revision + 1 } },
  };
  expect(() => invokeUnknownBoundary(validateConfiguredFrontierRepairReceipt, undefined, [advanced])).toThrow(
    /dependency/,
  );
  expect(
    invokeUnknownBoundary(continuationRepair.validateConfiguredFrontierReceiptStructure, undefined, [advanced]),
  ).toMatchObject({ branch: 'configured_frontier' });
  expect(continuationRepair.validateConfiguredFrontierReceiptStructure({ receipt }).branch).toBe('configured_frontier');
  expect(() => validateConfiguredFrontierRepairReceipt({ receipt: input.receipt, current: input.current })).toThrow(
    /trusted current prewriter binding/,
  );
});

test('frontier receipt rejects changes to successor run, risk, scope, contracts and retained artifacts', () => {
  const input = configuredFrontierRepairFixture(true);
  const work = input.receipt.successor_work;
  const changed: readonly WorkState[] = [
    { ...work, execution: { ...work.execution, run_id: 'replacement-run' } },
    { ...work, lifecycle: { ...work.lifecycle, risk: 'low' } },
    {
      ...work,
      lifecycle: {
        ...work.lifecycle,
        scope: { ...work.lifecycle.scope, allowed_paths: [...work.lifecycle.scope.allowed_paths, 'extra.ts'] },
      },
    },
    {
      ...work,
      contracts: { ...work.contracts, scope: { ...work.contracts.scope, path: '.agent/another-scope.json' } },
    },
    {
      ...work,
      artifacts: [
        {
          artifact_id: 'forged',
          path: 'extra.json',
          schema: 'WorkItem/v1',
          sha256: '7'.repeat(64),
          stage_id: 'intake',
          source_revision: work.binding.work_source_revision,
          scope_id: work.binding.scope_id,
          ac_ids: ['AC-1'],
        },
      ],
    },
  ];
  for (const successor of changed) {
    const receipt = {
      ...input.receipt,
      successor_work: successor,
      successor_binding: successor.binding,
      work_version: { revision: successor.revision, digest: canonicalJsonDigest(successor) },
    };
    expect(() =>
      invokeUnknownBoundary(continuationRepair.validateConfiguredFrontierReceiptStructure, undefined, [{ receipt }]),
    ).toThrow();
  }
});

test('frontier repair joins prior Work with the exact run and accepted scope and rejects a ledger revision jump', () => {
  const input = configuredFrontierRepairFixture(true);
  const rebind = (
    prior: WorkState,
    successor: WorkState,
    priorLedger = input.receipt.prior_ledger,
    successorLedger = input.receipt.successor_ledger,
  ) => {
    const priorVersion = { revision: prior.revision, digest: canonicalJsonDigest(prior) };
    const priorLedgerVersion = { revision: priorLedger.revision, digest: canonicalJsonDigest(priorLedger) };
    const request = { ...input.receipt.request, expectedWork: priorVersion, expectedLedger: priorLedgerVersion };
    return {
      receipt: {
        ...input.receipt,
        request,
        request_digest: canonicalJsonDigest(request),
        authorization: { ...input.receipt.authorization, request_digest: canonicalJsonDigest(request) },
        prior_work: prior,
        prior_work_version: priorVersion,
        prior_ledger: priorLedger,
        prior_ledger_version: priorLedgerVersion,
        successor_work: successor,
        successor_binding: successor.binding,
        work_version: { revision: successor.revision, digest: canonicalJsonDigest(successor) },
        successor_ledger: successorLedger,
        ledger_version: { revision: successorLedger.revision, digest: canonicalJsonDigest(successorLedger) },
      },
    };
  };
  const prior = input.receipt.prior_work,
    next = input.receipt.successor_work;
  expect(() =>
    continuationRepair.validateConfiguredFrontierReceiptStructure(
      rebind(
        { ...prior, execution: { ...prior.execution, run_id: 'borrowed-run' } },
        { ...next, execution: { ...next.execution, run_id: 'borrowed-run' } },
      ),
    ),
  ).toThrow();
  const scope = {
    ...prior.lifecycle.scope,
    allowed_paths: ['unrelated.ts'],
    fingerprint_paths: ['unrelated.ts'],
    implementation_paths: ['unrelated.ts'],
  };
  expect(() =>
    continuationRepair.validateConfiguredFrontierReceiptStructure(
      rebind(
        { ...prior, lifecycle: { ...prior.lifecycle, scope } },
        { ...next, lifecycle: { ...next.lifecycle, scope } },
      ),
    ),
  ).toThrow();
  const wrongSource = '7'.repeat(64);
  const wrongPriorLedger = {
    ...input.receipt.prior_ledger,
    tickets: input.receipt.prior_ledger.tickets.map((ticket) => ({ ...ticket, source_revision: wrongSource })),
    operations: input.receipt.prior_ledger.operations.map((operation) => ({
      ...operation,
      source_revision: wrongSource,
    })),
  };
  const wrongNextLedger = {
    ...input.receipt.successor_ledger,
    tickets: input.receipt.successor_ledger.tickets.map((ticket) =>
      ticket.status === 'released' ? { ...ticket, source_revision: wrongSource } : ticket,
    ),
    operations: wrongPriorLedger.operations,
  };
  expect(() =>
    continuationRepair.validateConfiguredFrontierReceiptStructure(
      rebind(
        {
          ...prior,
          binding: { ...prior.binding, work_source_revision: wrongSource },
          lifecycle: { ...prior.lifecycle, source_revision: wrongSource },
        },
        next,
        wrongPriorLedger,
        wrongNextLedger,
      ),
    ),
  ).toThrow();
  const malformedLedgerMutators: readonly ((ledger: MutableCoordinationLedger) => void)[] = [
    (ledger) => {
      requireFixtureValue(ledger.operations[0], 'first ledger operation')['from_ledger_revision'] = 1.5;
    },
    (ledger) => {
      requireFixtureValue(ledger.operations[0], 'first ledger operation')['to_ledger_revision'] =
        Number.MAX_SAFE_INTEGER + 1;
    },
    (ledger) => {
      const firstOperation = requireFixtureValue(ledger.operations[0], 'first ledger operation');
      ledger.operations.push({ ...firstOperation, operation_id: 'malformed-kind', kind: 'acquire' });
    },
    (ledger) => {
      requireFixtureValue(ledger.tickets[0], 'first ledger ticket').generation = 1.5;
      requireFixtureValue(ledger.claims[0], 'first ledger claim').generation = 1.5;
    },
    (ledger) => {
      requireFixtureValue(ledger.tickets[0], 'first ledger ticket').sequence = Number.MAX_SAFE_INTEGER + 1;
    },
  ];
  for (const mutate of malformedLedgerMutators) {
    const malformed = mutableCoordinationLedger(input.receipt.prior_ledger);
    mutate(malformed);
    const nextLedger = {
      ...input.receipt.successor_ledger,
      operations: malformed.operations,
      tickets: [
        requireFixtureValue(malformed.tickets[0], 'malformed first ticket'),
        requireFixtureValue(input.receipt.successor_ledger.tickets[1], 'successor second ticket'),
      ],
      claims: [
        requireFixtureValue(malformed.claims[0], 'malformed first claim'),
        requireFixtureValue(input.receipt.successor_ledger.claims[1], 'successor second claim'),
      ],
    };
    expect(() =>
      continuationRepair.validateConfiguredFrontierReceiptStructure(rebind(prior, next, malformed, nextLedger)),
    ).toThrow(/ledger contract|non-canonical JSON number/);
  }
  const wrongRevision = { ...input.receipt.successor_ledger, revision: input.receipt.prior_ledger.revision + 2 };
  expect(() =>
    continuationRepair.validateConfiguredFrontierReceiptStructure(
      rebind(prior, next, input.receipt.prior_ledger, wrongRevision),
    ),
  ).toThrow();
  const originalTransition = input.receipt.request.sourceTransition.transition;
  if (originalTransition.schema !== 'RuntimeConfigDeliveryTransition/v1')
    throw new Error('Frontier fixture did not provide its runtime config delivery transition');
  const request = {
    ...input.receipt.request,
    expectedMaintenanceGeneration: originalTransition.fence.generation + 1,
  };
  const receipt = {
    ...input.receipt,
    request,
    request_digest: canonicalJsonDigest(request),
    authorization: { ...input.receipt.authorization, request_digest: canonicalJsonDigest(request) },
  };
  expect(() => continuationRepair.validateConfiguredFrontierReceiptStructure({ receipt })).toThrow();
});

/** Seed validated code history in an isolated reader fixture; this is not native adoption proof. */
function seedQualifiedCodeReaderHop(f: Awaited<ReturnType<typeof continuationFixture>>, label: 'H1' | 'H2') {
  const current = f.store.readHostStateSnapshot(f.identity),
    journal = requireFixtureValue(f.store.readWorkSessionJournal(f.identity), 'code reader journal');
  const work = requireFixtureValue(current.work, 'code reader work'),
    lease = requireFixtureValue(work.lease, 'code reader work lease'),
    journalSourceScope = requireFixtureValue(journal.state.source_scope, 'code reader journal source scope'),
    currentWorkVersion = requireFixtureValue(current.workVersion, 'code reader work version'),
    currentLedgerVersion = requireFixtureValue(current.ledgerVersion, 'code reader ledger version'),
    prior = f.store.readQualifiedRuntimeCodeContinuations(f.identity, 1).at(-1);
  const paths = prior?.request.currentRuntimeCodePaths ?? ['packages/agent/bin/run.mjs'];
  const request = validateQualifiedRuntimeCodeContinuationRequest({
    schema: 'QualifiedRuntimeCodeContinuationRequest/v1',
    identity: f.identity,
    attempt: 1,
    nativeSessionHandle: lease.thread_id,
    leaseGeneration: lease.generation,
    expectedWork: currentWorkVersion,
    expectedLedger: currentLedgerVersion,
    expectedJournal: journal.version,
    expectedMaintenanceGeneration: current.maintenanceGeneration,
    originalSourceScopeDigest: work.binding.work_source_revision,
    journalSourceScopeDigest: journalSourceScope.digest,
    oldRuntimeCodeDigest: work.binding.runtime_code_digest,
    currentRuntimeCodeDigest: canonicalJsonDigest('fixture-code-' + label),
    oldRuntimeCodePaths: paths,
    currentRuntimeCodePaths: paths,
    oldManifestRef: prior?.request.currentManifestRef ?? '.tmp/fixture/old-manifest.json',
    oldManifestDigest: prior?.request.currentManifestDigest ?? canonicalJsonDigest('fixture-old-manifest'),
    oldInstallRef: prior?.request.currentInstallRef ?? '.tmp/fixture/old-install.json',
    currentManifestRef: '.tmp/fixture/' + label + '-manifest.json',
    currentManifestDigest: canonicalJsonDigest(label + '-manifest'),
    currentInstallRef: '.tmp/fixture/' + label + '-install.json',
    systemUpdateRef: '.tmp/fixture/' + label + '-install.json',
    systemUpdateOperationId: 'fixture-update-' + label,
    nativeSelfAttestationDigest: canonicalJsonDigest(label + '-self'),
  });
  const next = {
    ...work,
    revision: work.revision + 1,
    binding: {
      ...work.binding,
      runtime_code_digest: request.currentRuntimeCodeDigest,
      runtime_source_revision: request.currentRuntimeCodeDigest,
    },
    lifecycle: {
      ...work.lifecycle,
      revision: work.revision + 1,
      config_binding: { ...work.lifecycle.config_binding, runtime_code_digest: request.currentRuntimeCodeDigest },
    },
  };
  const endpoint = (current: boolean) =>
    current
      ? {
          codeDigest: request.currentRuntimeCodeDigest,
          codePaths: request.currentRuntimeCodePaths,
          manifestRef: request.currentManifestRef,
          manifestDigest: request.currentManifestDigest,
          installRef: request.currentInstallRef,
        }
      : {
          codeDigest: request.oldRuntimeCodeDigest,
          codePaths: request.oldRuntimeCodePaths,
          manifestRef: request.oldManifestRef,
          manifestDigest: request.oldManifestDigest,
          installRef: request.oldInstallRef,
        };
  const receipt = validateQualifiedRuntimeCodeContinuationReceipt({
    schema: 'QualifiedRuntimeCodeContinuationReceipt/v1',
    request,
    request_digest: canonicalJsonDigest(request),
    protected_work_digest: runtimeCodeContinuationProtectedWorkDigest(work),
    work_version: { revision: next.revision, digest: canonicalJsonDigest(next) },
    endpoint_proof: {
      oldRuntime: endpoint(false),
      currentRuntime: endpoint(true),
      systemUpdate: { ref: request.systemUpdateRef, operationId: request.systemUpdateOperationId },
      nativeSelfAttestationDigest: request.nativeSelfAttestationDigest,
    },
    status: 'adopted',
    rights_granted: false,
    accepted_result: false,
    runtime_acceptance: false,
  });
  f.db
    .transaction(() => {
      f.db.exec(
        'CREATE TABLE IF NOT EXISTS agent_host_qualified_runtime_code_continuation (workspace_id TEXT NOT NULL,work_id TEXT NOT NULL,attempt INTEGER NOT NULL,request_id TEXT NOT NULL,work_revision INTEGER NOT NULL,payload TEXT NOT NULL,digest TEXT NOT NULL,PRIMARY KEY(workspace_id,work_id,attempt,request_id),UNIQUE(workspace_id,work_id,work_revision))',
      );
      f.db
        .query("UPDATE agent_host_state SET revision=?,payload=?,digest=? WHERE workspace_id=? AND kind='work'")
        .run(next.revision, canonicalJson(next), canonicalJsonDigest(next), f.workspaceId);
      f.db
        .query('INSERT INTO agent_host_qualified_runtime_code_continuation VALUES(?,?,?,?,?,?,?)')
        .run(
          f.workspaceId,
          f.identity.work_id,
          1,
          receipt.request_digest,
          next.revision,
          canonicalJson(receipt),
          canonicalJsonDigest(receipt),
        );
    })
    .immediate();
  return receipt;
}

function seedFrontierHostFixture(
  f: Awaited<ReturnType<typeof continuationFixture>>,
  input: { receipt: ConfiguredFrontierReceipt },
  staleDigest = false,
) {
  const { receipt } = input;
  const stateRows: readonly (
    | readonly ['work', WorkState, StateVersion]
    | readonly ['ledger', CoordinationLedger, StateVersion]
  )[] = [
    ['work', receipt.successor_work, receipt.work_version],
    ['ledger', receipt.successor_ledger, receipt.ledger_version],
  ];
  for (const [kind, state, version] of stateRows)
    f.db
      .query('UPDATE agent_host_state SET revision=?,payload=?,digest=? WHERE workspace_id=? AND kind=?')
      .run(version.revision, canonicalJson(state), version.digest, f.workspaceId, kind);
  f.db
    .query(
      'UPDATE agent_host_mastra_session_ledger SET revision=?,payload=?,digest=? WHERE workspace_id=? AND work_id=? AND attempt=?',
    )
    .run(
      receipt.journal_version.revision,
      canonicalJson(receipt.successor_journal),
      receipt.journal_version.digest,
      f.workspaceId,
      f.identity.work_id,
      1,
    );
  f.db.exec(
    'CREATE TABLE IF NOT EXISTS agent_host_delivered_work_continuation (workspace_id TEXT NOT NULL,work_id TEXT NOT NULL,attempt INTEGER NOT NULL,action_id TEXT NOT NULL,payload TEXT NOT NULL,digest TEXT NOT NULL,PRIMARY KEY(workspace_id,work_id,attempt,action_id))',
  );
  f.db
    .query('INSERT INTO agent_host_delivered_work_continuation VALUES(?,?,?,?,?,?)')
    .run(
      f.workspaceId,
      f.identity.work_id,
      1,
      receipt.request.action.request.action_id,
      canonicalJson(receipt),
      staleDigest ? '0'.repeat(64) : canonicalJsonDigest(receipt),
    );
}

test('Host reads configured-frontier binding history after later Work progress without replaying the old developer', async () => {
  const input = configuredFrontierRepairFixture(true);
  const f = await continuationFixture({ identity: input.receipt.request.identity });
  seedFrontierHostFixture(f, input);
  expect(f.store.readHostStateSnapshot(f.identity).workVersion).toEqual(input.receipt.work_version);
  const progressed = {
    ...input.receipt.successor_work,
    revision: 12,
    lifecycle: { ...input.receipt.successor_work.lifecycle, revision: 12 },
  };
  f.db
    .query("UPDATE agent_host_state SET revision=?,payload=?,digest=? WHERE workspace_id=? AND kind='work'")
    .run(12, canonicalJson(progressed), canonicalJsonDigest(progressed), f.workspaceId);
  expect(f.store.readHostStateSnapshot(f.identity).work).toEqual(progressed);
  expect(
    requireFixtureTextColumn(
      f.db.query('SELECT payload FROM agent_host_delivered_work_continuation WHERE workspace_id=?').get(f.workspaceId),
      'payload',
    ),
  ).toBe(canonicalJson(input.receipt));
  expect(input.receipt.successor_journal.completed).toEqual(input.receipt.prior_journal.completed);
});

test('configured continuation lookup exposes the complete prewriter wave and each retained issue status', async () => {
  const { root, config, workspaceId, input } = configuredFrontierRepairHostRoot();
  const databasePath = path.join(root, config.control.work_root, 'session-handoff.v1.sqlite');
  mkdirSync(path.dirname(databasePath), { recursive: true });
  const f = await continuationFixture({
    root,
    config,
    workspaceId,
    databasePath,
    repositoryRoot: root,
    identity: input.receipt.request.identity,
  });
  seedFrontierHostFixture(f, input);
  const before = requireFixtureValue(
    f.store.readDeliveredWorkContinuation(f.identity, 1),
    'configured continuation before lookup',
  );
  const beforeJournal = requireFixtureValue(before.journal, 'configured continuation journal');
  const beforeItem = requireFixtureValue(before.item, 'configured continuation item');
  const beforeLedger = requireFixtureValue(before.snapshot.ledger, 'configured continuation ledger');
  const beforeTicket = requireFixtureValue(beforeLedger.tickets[0], 'configured continuation ticket');
  for (const value of [
    before,
    before.receipt,
    before.snapshot,
    beforeJournal,
    beforeJournal.state,
    beforeItem,
    before.items,
    before.item_statuses,
    beforeItem.request,
    beforeTicket.exclusive_resources,
  ])
    expect(Object.isFrozen(value)).toBe(true);
  expect(before.items.map((item) => item.request.role)).toEqual(['source-planner', 'security-prewriter']);
  expect(before.item_statuses).toEqual(['unissued', 'unissued']);
  expect(before.items.some((item) => item.request.action_id === input.receipt.request.action.request.action_id)).toBe(
    false,
  );
  const journal = {
    ...input.receipt.successor_journal,
    items: input.receipt.successor_journal.items.map((item, index) =>
      index === 0 ? { ...item, issue_id: '71e62a38-b44b-470e-b732-81cefbaf983a' } : item,
    ),
  };
  f.db
    .query(
      'UPDATE agent_host_mastra_session_ledger SET revision=revision+1,payload=?,digest=? WHERE workspace_id=? AND work_id=? AND attempt=1',
    )
    .run(canonicalJson(journal), canonicalJsonDigest(journal), workspaceId, f.identity.work_id);
  const issued = requireFixtureValue(
    f.store.readDeliveredWorkContinuation(f.identity, 1),
    'configured continuation issued lookup',
  );
  expect(issued.item_statuses).toEqual(['issued', 'unissued']);
  expect(issued.action_status).toBe('issued');
  expect(requireFixtureValue(issued.journal, 'issued continuation journal').state.completed).toEqual(
    input.receipt.prior_journal.completed,
  );
  const corrupt = { ...journal, items: [journal.items[0]] };
  f.db
    .query(
      'UPDATE agent_host_mastra_session_ledger SET revision=revision+1,payload=?,digest=? WHERE workspace_id=? AND work_id=? AND attempt=1',
    )
    .run(canonicalJson(corrupt), canonicalJsonDigest(corrupt), workspaceId, f.identity.work_id);
  expect(() => f.store.readDeliveredWorkContinuation(f.identity, 1)).toThrow();
});

async function createOriginalFrontierEngine(
  root: string,
  config: AgentRuntimeConfig,
  input: {
    receipt: ConfiguredFrontierReceipt;
    prewriterBinding: Parameters<typeof continuationProjection.projectConfiguredPrewriterContinuationRequests>[0];
  },
) {
  const receipt = input.receipt,
    journal = receipt.prior_journal,
    selection = input.prewriterBinding.selection;
  const journalSourceScope = requireFixtureValue(journal.source_scope, 'engine fixture journal source scope');
  const initial = {
    work_id: receipt.request.identity.work_id,
    attempt: 1,
    workflow_id: receipt.request.action.workflow_id,
    scope_digest: journalSourceScope.digest,
    config_digest: receipt.request.priorConfigDigest,
    selection,
    observations: [],
  };
  const stateSchema = z.object({
    work_id: z.string(),
    attempt: z.number().int(),
    workflow_id: z.string(),
    scope_digest: z.string(),
    config_digest: z.string(),
    selection: z.unknown(),
    observations: z.array(z.unknown()),
  });
  const workflow = createWorkflow({ id: initial.workflow_id, inputSchema: stateSchema, outputSchema: stateSchema });
  for (const wave of journal.completed) {
    workflow.then(
      createStep({
        id: wave.step_id,
        inputSchema: stateSchema,
        outputSchema: stateSchema,
        suspendSchema: z.object({ requests: z.array(z.unknown()) }),
        resumeSchema: z.object({ observations: z.array(z.unknown()).min(1) }),
        execute: async ({ inputData, resumeData, suspend }) => {
          if (!resumeData) return await suspend({ requests: wave.items.map((item) => item.request) });
          return { ...inputData, observations: [...inputData.observations, ...resumeData.observations] };
        },
      }),
    );
  }
  workflow.then(
    createStep({
      id: requireFixtureValue(journal.step_id, 'fixture journal step id'),
      inputSchema: stateSchema,
      outputSchema: stateSchema,
      suspendSchema: z.object({ requests: z.array(z.unknown()) }),
      resumeSchema: z.object({ observations: z.array(z.unknown()).min(1) }),
      execute: async ({ suspend }) => await suspend({ requests: journal.items.map((item) => item.request) }),
    }),
  );
  workflow.commit();
  const file = path.join(root, config.control.work_root, 'mastra-workflows.v1.sqlite');
  mkdirSync(path.dirname(file), { recursive: true });
  const storage = new LibSQLStore({ id: 'original-frontier-fixture', url: pathToFileURL(file).href });
  new Mastra({ workflows: { original: workflow }, storage, logger: false });
  const run = await workflow.createRun({ runId: journal.run_id });
  await run.start({ inputData: initial });
  for (const wave of journal.completed)
    await run.resume({ step: wave.step_id, resumeData: { observations: wave.items.map((item) => item.observation) } });
  await storage.close();
}

async function seedOriginalFrontierEngine(
  root: string,
  config: AgentRuntimeConfig,
  input: {
    receipt: ConfiguredFrontierReceipt;
    prewriterBinding: Parameters<typeof continuationProjection.projectConfiguredPrewriterContinuationRequests>[0];
  },
) {
  const payload = path.join(root, 'original-engine-fixture.json');
  writeFileSync(
    payload,
    JSON.stringify({
      root,
      workRoot: config.control.work_root,
      receipt: input.receipt,
      selection: input.prewriterBinding.selection,
    }),
  );
  const code = `import fs from 'node:fs'; import path from 'node:path'; import {pathToFileURL} from 'node:url'; import {createRequire} from 'node:module';
const require=createRequire(process.env.VIDA_FRONTIER_PACKAGE); const {createStep,createWorkflow}=require('@mastra/core/workflows'); const {Mastra}=require('@mastra/core/mastra'); const {LibSQLStore}=require('@mastra/libsql'); const {z}=require('zod');
const {mkdirSync}=fs; const data=JSON.parse(fs.readFileSync(process.env.VIDA_FRONTIER_INPUT,'utf8'));
${requireFixtureValue.toString()}
${createOriginalFrontierEngine.toString()}
await createOriginalFrontierEngine(data.root,{control:{work_root:data.workRoot}},{receipt:data.receipt,prewriterBinding:{selection:data.selection}}); process.exit(0);`;
  expect(process.versions.bun).toBe('1.4.2');
  const executable = process.execPath;
  const result = boundedSpawnSync(
    spawnSync,
    executable,
    ['-e', code],
    {
      cwd: path.join(runtimeRoot, 'packages', 'agent'),
      windowsHide: true,
      encoding: 'utf8',
      env: {
        ...pinnedEnvironment(executable),
        VIDA_FRONTIER_PACKAGE: path.join(runtimeRoot, 'packages', 'agent', 'package.json'),
        VIDA_FRONTIER_INPUT: payload,
      },
      budget: executionBudget(60_000),
    },
    'fixture original frontier engine',
  );
  if (result.error || result.signal || result.status !== 0) retainContinuationFixtureRoot(root);
  if (result.signal || result.status !== 0)
    process.stderr.write('Fixture child output: ' + result.stdout + result.stderr + '\n');
  expect(result.error).toBeUndefined();
  expect(result.signal).toBeNull();
  expect(result.status, typeof result.stderr === 'string' ? result.stderr : 'Fixture original frontier failed').toBe(0);
}

function resumeFrontierBridgeFixture({
  root,
  workspaceId,
  identity,
  context,
  selection,
  observations,
  runId,
}: {
  root: string;
  workspaceId: string;
  identity: WorkIdentity;
  context: SessionHandoffContext;
  selection: WorkItemSelection;
  observations: SessionBridgeObservation[];
  runId: string;
}) {
  const bridgePayload = path.join(root, 'current-bridge-fixture.json');
  writeFileSync(
    bridgePayload,
    JSON.stringify({ root, workspaceId, identity, context, selection, observations, runId }),
  );
  const sourceBase = pathToFileURL(path.join(runtimeRoot, 'packages', 'agent', 'src') + path.sep).href;
  const code = `import fs from 'node:fs'; import {Database} from 'bun:sqlite';
import {loadRuntimeConfig} from '${sourceBase}config/runtime-config.ts';
import {HostStateStore} from '${sourceBase}host-state.ts';
import {MastraSessionLedger,sessionHandoffDatabasePath} from '${sourceBase}orchestration/persistent-session-handoff.ts';
import {MastraSessionBridge} from '${sourceBase}orchestration/mastra-session-bridge.ts';
const value=JSON.parse(fs.readFileSync(process.env.VIDA_BRIDGE_INPUT,'utf8')); const config=loadRuntimeConfig(value.root);
const traceEnabled=process.env.VIDA_FRONTIER_PHASE_TRACE==='1';
const mark=(phase,edge,started)=>{if(traceEnabled)process.stderr.write(JSON.stringify({event:'frontier-phase',phase,edge,elapsed_ms:Math.round((performance.now()-started)*100)/100})+'\\n')};
const timed=(phase,run)=>{const started=traceEnabled?performance.now():0;mark(phase,'start',started);try{return run()}finally{mark(phase,'end',started)}};
const timedAsync=async(phase,run)=>{const started=traceEnabled?performance.now():0;mark(phase,'start',started);try{return await run()}finally{mark(phase,'end',started)}};
if(traceEnabled){
let profileOne;
if(process.env.VIDA_FRONTIER_CPU_PROFILE_PATH){const {profile}=await import('bun:jsc');let sampled=false;profileOne=(label,call)=>{if(label!=='host.assertSessionProducerCurrent'||sampled)return call();sampled=true;let result;const report=profile(()=>{result=call()},1000);fs.writeFileSync(process.env.VIDA_FRONTIER_CPU_PROFILE_PATH,JSON.stringify(report),{flag:'wx'});return result}};
const traceMethod=(owner,name,label,asyncResult=false)=>{const original=owner[name];if(typeof original!=='function')throw Error('Fixture trace method is missing: '+label);owner[name]=function(...args){const call=()=>Reflect.apply(original,this,args);return asyncResult?timedAsync(label,call):timed(label,()=>profileOne?profileOne(label,call):call())}};
for(const name of ['readDeliveredWorkContinuationReceipt','readFailedPrewriterRecoveryReceipt','readQualifiedRuntimeCodeContinuations','readHostStateSnapshot','assertSessionProducerCurrent','settleSessionProducer'])traceMethod(HostStateStore.prototype,name,'host.'+name);
for(const name of ['beginSessionProducer','syncFromSessionProducer','resume'])traceMethod(MastraSessionLedger.prototype,name,'ledger.'+name);
traceMethod(MastraSessionBridge.prototype,'snapshot','bridge.inner-snapshot',true);
const {LibSQLStore}=await import('@mastra/libsql');traceMethod(LibSQLStore.prototype,'init','storage.init',true);
}
const database=new Database(sessionHandoffDatabasePath(value.root,config),{strict:true}); const host=new HostStateStore(database,value.workspaceId,undefined,undefined,undefined,undefined,value.root);
const ledger=new MastraSessionLedger(database,value.workspaceId,config,value.root,host);
const args={repositoryRoot:value.root,config,selection:value.selection,context:value.context,workflowId:'task_execution',workspaceId:value.workspaceId,ledger,projectIds:['agent'],lifecycleRisk:'high',configuredFrontier:{identity:value.identity,attempt:1}};
const bridge=await timedAsync('bridge.open',()=>MastraSessionBridge.open(args)); const before=await timedAsync('bridge.snapshot',()=>bridge.snapshot()); const after=await timedAsync('bridge.resume',()=>bridge.resume(before.step_id,value.observations,ledger.resume(value.identity.work_id,1).state.source_scope));
const reopened=await timedAsync('bridge.reopen',()=>MastraSessionBridge.open(args)); const restart=await timedAsync('bridge.restart-snapshot',()=>reopened.snapshot());
fs.writeFileSync(value.root+'/bridge-result.json',JSON.stringify({before,after,restart,retained:host.readDeliveredWorkContinuationReceipt(value.identity,1)})); process.exit(0);`;
  const child = boundedSpawnSync(
    spawnSync,
    process.execPath,
    ['-e', code],
    {
      cwd: path.join(runtimeRoot, 'packages', 'agent'),
      windowsHide: true,
      encoding: 'utf8',
      env: {
        ...pinnedEnvironment(process.execPath),
        VIDA_BRIDGE_INPUT: bridgePayload,
        VIDA_FRONTIER_PHASE_TRACE: process.env.VIDA_FRONTIER_PHASE_TRACE === '1' ? '1' : '0',
        ...(process.env.VIDA_FRONTIER_CPU_PROFILE_PATH === undefined
          ? {}
          : { VIDA_FRONTIER_CPU_PROFILE_PATH: process.env.VIDA_FRONTIER_CPU_PROFILE_PATH }),
      },
      budget: executionBudget(60_000),
    },
    'fixture same-run frontier resume',
  );
  if (process.env.VIDA_FRONTIER_PHASE_TRACE === '1' && typeof child.stderr === 'string')
    for (const line of child.stderr.split('\n'))
      if (line.startsWith('{"event":"frontier-phase"')) process.stderr.write(line + '\n');
  if (child.error || child.signal || child.status !== 0) retainContinuationFixtureRoot(root);
  expect(child.error).toBeUndefined();
  expect(child.signal).toBeNull();
  if (child.status !== 0) throw new Error(typeof child.stderr === 'string' ? child.stderr : 'Fixture bridge failed');
  const decoded: unknown = JSON.parse(readFileSync(path.join(root, 'bridge-result.json'), 'utf8'));
  if (!isPlainRecord(decoded)) throw new Error('Fixture bridge result is not an object');
  return {
    before: requireSessionBridgeSnapshot(decoded.before),
    after: requireSessionBridgeSnapshot(decoded.after),
    restart: requireSessionBridgeSnapshot(decoded.restart),
    retained: decoded.retained,
  };
}

test.each(['delivery', 'normal', 'normal-large'])(
  'Host produces the current full prewriter wave atomically from the actual unissued old engine and preserves its original attempt [%s]',
  async (proofKind) => {
    const { root, config, workspaceId, input } = configuredFrontierRepairHostRoot(
      proofKind === 'normal-large' ? 'normal' : proofKind,
    );
    // Another completed operation may advance the ledger after this work's release.
    const priorLedger = input.receipt.prior_ledger;
    priorLedger.revision += 1;
    priorLedger.tickets.push({
      ...requireFixtureValue(priorLedger.tickets[0], 'prior ledger ticket'),
      ticket_id: 'other-ticket',
      work_id: 'other-work',
      thread_id: 'other-thread',
      sequence: priorLedger.next_sequence++,
      claim_ids: ['other-claim'],
      exclusive_resources: ['file:other.ts'],
    });
    priorLedger.claims.push({
      ...requireFixtureValue(priorLedger.claims[0], 'prior ledger claim'),
      claim_id: 'other-claim',
      ticket_id: 'other-ticket',
      work_id: 'other-work',
      thread_id: 'other-thread',
      resources: ['file:other.ts'],
    });
    priorLedger.operations.push({
      ...requireFixtureValue(priorLedger.operations[0], 'prior ledger operation'),
      operation_id: 'unrelated-release',
      ticket_id: 'other-ticket',
      work_id: 'other-work',
      thread_id: 'other-thread',
      resources: ['file:other.ts'],
      from_ledger_revision: priorLedger.revision - 1,
      to_ledger_revision: priorLedger.revision,
    });
    if (proofKind === 'normal-large') {
      for (let index = 0; index < 16; index++) {
        const resources = Array.from(
          { length: 64 },
          (_, resource) => `file:unrelated/${index}/${String(resource).padStart(3, '0')}.ts`,
        );
        const ticketId = 'unrelated-ticket-' + index,
          claimId = 'unrelated-claim-' + index,
          workId = 'unrelated-work-' + index;
        priorLedger.tickets.push({
          ...requireFixtureValue(priorLedger.tickets[0], 'prior ledger ticket'),
          ticket_id: ticketId,
          work_id: workId,
          thread_id: workId,
          sequence: priorLedger.next_sequence++,
          exclusive_resources: resources,
          claim_ids: [claimId],
        });
        priorLedger.claims.push({
          ...requireFixtureValue(priorLedger.claims[0], 'prior ledger claim'),
          claim_id: claimId,
          ticket_id: ticketId,
          work_id: workId,
          thread_id: workId,
          resources,
        });
        priorLedger.operations.push({
          ...requireFixtureValue(priorLedger.operations[0], 'prior ledger operation'),
          operation_id: 'unrelated-release-' + index,
          ticket_id: ticketId,
          work_id: workId,
          thread_id: workId,
          resources,
          from_ledger_revision: priorLedger.revision,
          to_ledger_revision: ++priorLedger.revision,
        });
      }
    }
    const priorVersion = { revision: priorLedger.revision, digest: canonicalJsonDigest(priorLedger) };
    const request = { ...input.receipt.request, expectedLedger: priorVersion };
    input.receipt = {
      ...input.receipt,
      prior_ledger_version: priorVersion,
      request,
      request_digest: canonicalJsonDigest(request),
      authorization: { ...input.receipt.authorization, request_digest: canonicalJsonDigest(request) },
    };
    const databasePath = path.join(root, config.control.work_root, 'session-handoff.v1.sqlite');
    mkdirSync(path.dirname(databasePath), { recursive: true });
    const f = await continuationFixture({
      root,
      config,
      workspaceId,
      databasePath,
      repositoryRoot: root,
      identity: input.receipt.request.identity,
    });
    const prior = input.receipt;
    const priorStateRows: readonly (
      | readonly ['work', WorkState, StateVersion]
      | readonly ['ledger', CoordinationLedger, StateVersion]
    )[] = [
      ['work', prior.prior_work, prior.prior_work_version],
      ['ledger', prior.prior_ledger, prior.prior_ledger_version],
    ];
    for (const [kind, value, version] of priorStateRows)
      f.db
        .query('UPDATE agent_host_state SET revision=?,payload=?,digest=? WHERE workspace_id=? AND kind=?')
        .run(version.revision, canonicalJson(value), version.digest, workspaceId, kind);
    f.db
      .query(
        'UPDATE agent_host_mastra_session_ledger SET revision=?,payload=?,digest=? WHERE workspace_id=? AND work_id=? AND attempt=1',
      )
      .run(
        prior.prior_journal_version.revision,
        canonicalJson(prior.prior_journal),
        prior.prior_journal_version.digest,
        workspaceId,
        f.identity.work_id,
      );
    await seedOriginalFrontierEngine(root, config, input);
    const before = f.store.readHostStateSnapshot(f.identity);
    await Promise.resolve(
      expect(
        f.store.continueDeliveredWork({
          ...prior.request,
          expectedLedger: { ...prior.request.expectedLedger, revision: prior.request.expectedLedger.revision - 1 },
        }),
      ).rejects.toThrow(),
    );
    expect(f.store.readHostStateSnapshot(f.identity)).toEqual(before);
    const result = await f.store.continueDeliveredWork(prior.request);
    if (proofKind === 'normal-large') {
      expect(() => canonicalJsonDigest(result)).toThrow(/node budget/);
      expect(() => canonicalJsonDigest(result.snapshot)).not.toThrow();
      expect(() => canonicalJsonDigest(result.receipt)).not.toThrow();
      for (const value of [
        result,
        result.snapshot,
        result.snapshot.ledger,
        result.receipt,
        result.receipt.prior_ledger,
        result.receipt.successor_ledger,
        result.action,
      ])
        expect(Object.isFrozen(value)).toBe(true);
      expect(
        Object.isFrozen(
          requireFixtureValue(result.receipt.prior_ledger.tickets[0], 'prior ledger first ticket').exclusive_resources,
        ),
      ).toBe(true);
    }
    expect(
      requireFixtureValue(result.receipt.successor_ledger.tickets.at(-1), 'successor active ticket')
        .exclusive_resources,
    ).toEqual(requireFixtureValue(prior.prior_ledger.tickets[0], 'prior frontier ticket').exclusive_resources);
    expect(
      requireFixtureValue(result.receipt.successor_ledger.claims.at(-1), 'successor active claim').resources,
    ).toEqual(requireFixtureValue(prior.prior_ledger.claims[0], 'prior frontier claim').resources);
    expect(result.status).toBe('continued');
    expect(result.receipt.historical_capture).toBeNull();
    expect(result.receipt.successor_journal.run_id).toBe(prior.prior_journal.run_id);
    expect(result.receipt.successor_journal.items.map((item) => item.request.role)).toEqual([
      'source-planner',
      'security-prewriter',
    ]);
    expect(result.receipt.successor_journal.completed).toEqual(prior.prior_journal.completed);
    expect(requireFixtureValue(result.receipt.prior_journal.items[0], 'prior journal item').request).toEqual(
      prior.request.action.request,
    );
    expect(result.receipt.successor_work.contracts).toEqual(prior.prior_work.contracts);
    expect(result.receipt.successor_work.artifacts).toEqual(prior.prior_work.artifacts);
    expect(result.receipt.successor_work.lifecycle.risk).toBe(prior.prior_work.lifecycle.risk);
    expect(result.receipt.rights_granted).toBe(false);
    const retry = await f.store.continueDeliveredWork(prior.request);
    expect(retry.status).toBe('already_continued');
    expect(retry.receipt).toEqual(result.receipt);
    expect(retry.action).toBeNull();
    expect(retry.snapshot.workVersion).toEqual(result.snapshot.workVersion);
    expect(retry.snapshot.ledgerVersion).toEqual(result.snapshot.ledgerVersion);
    expect(Object.isFrozen(retry.receipt.prior_ledger)).toBe(true);
    expect(
      requireFixtureValue(f.store.readDeliveredWorkContinuation(f.identity, 1), 'continued lookup').items,
    ).toHaveLength(2);
    const delivered = f.store.readHostStateSnapshot(f.identity),
      deliveredLedger = requireFixtureValue(delivered.ledger, 'delivered frontier ledger'),
      activeTicket = requireFixtureValue(deliveredLedger.tickets.at(-1), 'active frontier ticket');
    const fileResource = requireFixtureValue(
      activeTicket.exclusive_resources.find((resource) => resource.startsWith('file:')),
      'frontier file resource',
    );
    const conflict = {
      ...activeTicket,
      ticket_id: 'foreign-file-only',
      work_id: 'other-work',
      thread_id: 'other-thread',
      sequence: activeTicket.sequence + 1,
      claim_ids: ['foreign-claim'],
      exclusive_resources: [fileResource],
      active_resources: [fileResource],
    };
    const conflictClaim: MutableCoordinationClaim = {
      ...requireFixtureValue(deliveredLedger.claims.at(-1), 'active frontier claim'),
      claim_id: 'foreign-claim',
      ticket_id: conflict.ticket_id,
      work_id: conflict.work_id,
      thread_id: conflict.thread_id,
      resources: [fileResource],
    };
    const writeLedger = (ledger: CoordinationLedger) =>
      f.db
        .query("UPDATE agent_host_state SET revision=?,payload=?,digest=? WHERE workspace_id=? AND kind='ledger'")
        .run(ledger.revision, canonicalJson(ledger), canonicalJsonDigest(ledger), workspaceId);
    writeLedger({
      ...deliveredLedger,
      next_sequence: conflict.sequence + 1,
      tickets: [...deliveredLedger.tickets, conflict],
      claims: [...deliveredLedger.claims, conflictClaim],
    });
    expect(() => f.store.readDeliveredWorkContinuation(f.identity, 1)).toThrow(/FIFO/);
    writeLedger({
      ...deliveredLedger,
      next_sequence: conflict.sequence + 1,
      tickets: [
        ...deliveredLedger.tickets,
        { ...conflict, status: 'queued', claim_ids: [], expires_at: null, active_resources: [] },
      ],
    });
    expect(
      requireFixtureValue(f.store.readDeliveredWorkContinuation(f.identity, 1), 'queued owner lookup').items,
    ).toHaveLength(2);
    writeLedger(deliveredLedger);

    const reports: MastraSessionLedgerState['items'] = result.receipt.successor_journal.items.map((item, index) => {
      const issue = index === 0 ? '71e62a38-b44b-470e-b732-81cefbaf983a' : 'fa354d58-05f9-4a5f-8f39-5b594cb9d95d';
      const summary = 'Fixture current prewriter report ' + index;
      return {
        ...item,
        issue_id: issue,
        observation: {
          schema: 'VidaSessionObservation/v1',
          action_id: item.request.action_id,
          issue_id: issue,
          agent_id: 'fixture-prewriter-' + index,
          tool_call_ref: 'fixture-call-' + index,
          status: 'reported_complete',
          summary,
          output_digest: canonicalJsonDigest(summary),
          evidence_refs: [],
        },
      };
    });
    const reportedJournal = { ...result.receipt.successor_journal, items: reports };
    f.db
      .query(
        'UPDATE agent_host_mastra_session_ledger SET revision=revision+1,payload=?,digest=? WHERE workspace_id=? AND work_id=? AND attempt=1',
      )
      .run(canonicalJson(reportedJournal), canonicalJsonDigest(reportedJournal), workspaceId, f.identity.work_id);
    const bridgeResult = resumeFrontierBridgeFixture({
      root,
      workspaceId,
      identity: f.identity,
      context: input.prewriterBinding.context,
      selection: input.prewriterBinding.selection,
      observations: reports.map((item) => requireFixtureValue(item.observation, 'prewriter report observation')),
      runId: prior.prior_journal.run_id,
    });
    expect(bridgeResult.after.run_id).toBe(prior.prior_journal.run_id);
    expect(bridgeResult.after.step_id).toBe('wave-2');
    expect(bridgeResult.after.requests.map((request) => request.role)).toEqual(['developer-orchestrator']);
    expect(bridgeResult.restart).toEqual(bridgeResult.after);
    expect(bridgeResult.retained).toEqual(result.receipt);
  },
  30000,
);

function configuredFrontierRepairHostRoot(
  proofKind: 'delivery' | 'normal' | 'normal-large' = 'delivery',
  changedSource = false,
) {
  const root = mkdtempSync(path.join(tmpdir(), 'frontier-repair-host-'));
  trackContinuationFixtureRoot(root);
  mkdirSync(path.join(root, 'docs', 'agent-instructions'), { recursive: true });
  const template = readFileSync(
    path.join(runtimeRoot, 'packages', 'agent', 'templates', 'agent-runtime.config.template.v1.yaml'),
    'utf8',
  )
    .replaceAll('{{REPOSITORY}}', 'vida-agent')
    .replaceAll('{{PROJECT}}', 'agent')
    .replaceAll('{{BUNDLE}}', 'vida-agent');
  writeFileSync(path.join(root, 'agent-runtime.config.v1.yaml'), template);
  writeFileSync(path.join(root, 'AGENTS.md'), 'Fixture policy\n');
  writeFileSync(path.join(root, 'AGENT.sidecar.md'), 'Fixture map\n');
  writeFileSync(path.join(root, 'docs', 'agent-instructions', 'documentation-policy.v1.json'), '{}');
  const config = loadRuntimeConfig(root),
    workspaceId = deriveWorkspaceId('vida-agent', root);
  const input = mutableFrontierFixture(
    configuredFrontierRepairFixture(true, changedSource, { root, config, workspaceId }, 'implementation'),
  );
  const item = {
    schema: 'WorkItem/v1',
    id: input.receipt.request.identity.work_id,
    provider: 'local',
    provider_type: 'Task',
    canonical_kind: 'task',
    intent: 'task_execution',
    project_id: 'agent',
    title: 'Repair the original frontier',
    description: 'Fixture task',
    risk_flags: ['high'],
    labels: [],
  };
  const intake = {
    schema: 'VidaLocalSessionIntake/v1',
    native_session_handle: input.receipt.request.nativeSessionHandle,
    runtime_code_paths: [config.runtime.bundle + '/bin/run.mjs'],
    risk: 'high',
    route: 'R4',
    change_kind: 'fix',
    work_item: item,
  };
  const intakePath = '.agent/work/work-1/local-session-intake.v1.json',
    bytes = Buffer.from(canonicalJson(intake));
  mkdirSync(path.dirname(path.join(root, intakePath)), { recursive: true });
  writeFileSync(path.join(root, intakePath), bytes);
  const prior = {
    ...input.receipt.prior_work,
    binding: { ...input.receipt.prior_work.binding, work_item_digest: canonicalJsonDigest(item) },
    artifacts: [
      {
        artifact_id: 'local-session-intake',
        schema: 'VidaLocalSessionIntake/v1',
        path: intakePath,
        sha256: createHash('sha256').update(bytes).digest('hex'),
        stage_id: 'intake',
        scope_id: 'scope-fixture',
        source_revision: input.receipt.prior_work.binding.work_source_revision,
        ac_ids: ['AC-1'],
      },
    ],
  };
  const successor = {
    ...input.receipt.successor_work,
    binding: { ...input.receipt.successor_work.binding, work_item_digest: canonicalJsonDigest(item) },
    artifacts: prior.artifacts,
  };
  const priorVersion = { revision: prior.revision, digest: canonicalJsonDigest(prior) };
  const successorVersion = { revision: successor.revision, digest: canonicalJsonDigest(successor) };
  const request = { ...input.receipt.request, expectedWork: priorVersion };
  input.receipt = {
    ...input.receipt,
    prior_work: prior,
    prior_work_version: priorVersion,
    successor_work: successor,
    successor_binding: successor.binding,
    work_version: successorVersion,
    request,
    request_digest: canonicalJsonDigest(request),
    authorization: { ...input.receipt.authorization, request_digest: canonicalJsonDigest(request) },
  };
  input.current = { ...input.current, work: successor, work_version: successorVersion };
  if (proofKind === 'normal') useNormalConfigEndpointProof(input);
  return { root, config, workspaceId, input, intakePath };
}

test('Host keeps nonempty original admission references and intake through a changed Source continuation', async () => {
  const { root, config, workspaceId, input } = configuredFrontierRepairHostRoot('normal', true);
  const priorBase = input.receipt.prior_work;
  const priorSourceScope = requireFixtureValue(input.receipt.prior_journal.source_scope, 'admission source scope');
  const scopeBytes = Buffer.from(canonicalJson(priorSourceScope));
  const scopePath = '.agent/admission-source-snapshot.json';
  writeFileSync(path.join(root, scopePath), scopeBytes);
  const sourceArtifact = requireFixtureValue(priorBase.artifacts[0], 'prior source artifact');
  const artifacts: WorkState['artifacts'] = [
    {
      ...sourceArtifact,
      artifact_id: 'admission-source-snapshot',
      schema: 'ScopedSourceSnapshot/v1',
      path: scopePath,
      sha256: createHash('sha256').update(scopeBytes).digest('hex'),
    },
    ...priorBase.artifacts,
  ];
  type LifecycleReferenceRecord = Extract<
    WorkState['lifecycle']['references'][number],
    { schema: 'LifecycleArtifactReference/v1' }
  >;
  const referencePairs: readonly (readonly [LifecycleReferenceRecord['kind'], ContractReference])[] = [
    ['implementation_scope', priorBase.contracts.scope],
    ['acceptance_manifest', priorBase.contracts.acceptance],
    [
      'execution_approval',
      { schema: 'LocalSourceWriteAuthorization/v1', path: '.agent/source-approval.json', sha256: '8'.repeat(64) },
    ],
  ];
  const references: WorkState['lifecycle']['references'] = referencePairs.map(([kind, ref]) => ({
    schema: 'LifecycleArtifactReference/v1',
    kind,
    artifact_schema: ref.schema,
    record_id: kind,
    path: ref.path,
    sha256: ref.sha256,
    source_revision: priorBase.binding.work_source_revision,
    scope_id: priorBase.binding.scope_id,
    ac_ids: priorBase.binding.ac_ids,
    generation: null,
    implementation_fingerprint: null,
    delivery_cycle_id: null,
    principal: 'fixture-owner',
    decision: 'approved',
    disposition: 'current',
  }));
  const prior: WorkState = {
    ...priorBase,
    artifacts,
    lifecycle: { ...priorBase.lifecycle, references },
  };
  const priorVersion = { revision: prior.revision, digest: canonicalJsonDigest(prior) };
  const request = { ...input.receipt.request, expectedWork: priorVersion };
  input.receipt = {
    ...input.receipt,
    prior_work: prior,
    prior_work_version: priorVersion,
    request,
    request_digest: canonicalJsonDigest(request),
    authorization: { ...input.receipt.authorization, request_digest: canonicalJsonDigest(request) },
  };
  const databasePath = path.join(root, config.control.work_root, 'session-handoff.v1.sqlite');
  mkdirSync(path.dirname(databasePath), { recursive: true });
  const f = await continuationFixture({
    root,
    config,
    workspaceId,
    databasePath,
    repositoryRoot: root,
    identity: request.identity,
  });
  const priorStateRows: readonly (
    | readonly ['work', WorkState, StateVersion]
    | readonly ['ledger', CoordinationLedger, StateVersion]
  )[] = [
    ['work', prior, priorVersion],
    ['ledger', input.receipt.prior_ledger, input.receipt.prior_ledger_version],
  ];
  for (const [kind, value, version] of priorStateRows)
    f.db
      .query('UPDATE agent_host_state SET revision=?,payload=?,digest=? WHERE workspace_id=? AND kind=?')
      .run(version.revision, canonicalJson(value), version.digest, workspaceId, kind);
  f.db
    .query(
      'UPDATE agent_host_mastra_session_ledger SET revision=?,payload=?,digest=? WHERE workspace_id=? AND work_id=? AND attempt=1',
    )
    .run(
      input.receipt.prior_journal_version.revision,
      canonicalJson(input.receipt.prior_journal),
      input.receipt.prior_journal_version.digest,
      workspaceId,
      request.identity.work_id,
    );
  await seedOriginalFrontierEngine(root, config, input);
  const result = await f.store.continueDeliveredWork(request);
  expect(result.status).toBe('continued');
  expect(result.receipt.successor_work.lifecycle.references).toEqual(prior.lifecycle.references);
  expect(result.receipt.successor_work.artifacts).toEqual(prior.artifacts);
  expect(f.store.readHostStateSnapshot(request.identity).work).toEqual(result.receipt.successor_work);
  expect(result.receipt.rights_granted).toBe(false);
  const continued = f.store.readHostStateSnapshot(request.identity);
  const continuedWork = requireFixtureValue(continued.work, 'continued lifecycle work');
  expect(() => validateLifecycleAggregate(continuedWork)).toThrow(/authority binding/);
  const tampered: WorkState = {
    ...continuedWork,
    lifecycle: {
      ...continuedWork.lifecycle,
      references: continuedWork.lifecycle.references.map((reference, index) =>
        index === 0 && typeof reference !== 'string' ? { ...reference, sha256: '2'.repeat(64) } : reference,
      ),
    },
  };
  expect(() => f.store.projectLifecycleTransition(tampered, 'TRACE', 'Trace the retained admission.')).toThrow(
    /authority binding/,
  );
  const oldReference = requireFixtureValue(prior.lifecycle.references[0], 'prior lifecycle reference');
  if (typeof oldReference === 'string') throw new Error('Fixture lifecycle reference is not a contract record');
  const staleTest: WorkState = {
    ...continuedWork,
    lifecycle: {
      ...continuedWork.lifecycle,
      references: [
        ...continuedWork.lifecycle.references,
        {
          ...oldReference,
          kind: 'test_receipt',
          record_id: 'old-test',
          artifact_schema: 'TestReceipt/v1',
          path: '.agent/old-test.json',
          decision: 'pass',
        },
      ],
    },
  };
  expect(() => f.store.projectLifecycleTransition(staleTest, 'TRACE', 'Trace the retained admission.')).toThrow(
    /authority binding/,
  );
  for (const index of [0, 1]) {
    const wrongIntake: WorkState = {
      ...continuedWork,
      artifacts: continuedWork.artifacts.map((artifact, artifactIndex) =>
        artifactIndex === index ? { ...artifact, sha256: '2'.repeat(64) } : artifact,
      ),
    };
    expect(() => f.store.projectLifecycleTransition(wrongIntake, 'TRACE', 'Trace the retained admission.')).toThrow(
      /artifact reference/,
    );
  }
  const priorArtifact = requireFixtureValue(prior.artifacts[0], 'prior artifact');
  const unrelatedArtifact: WorkState = {
    ...continuedWork,
    artifacts: [
      ...continuedWork.artifacts,
      {
        ...priorArtifact,
        artifact_id: 'old-other',
        schema: 'TestReceipt/v1',
        path: '.agent/foreign-artifact.json',
      },
    ],
  };
  expect(() => f.store.projectLifecycleTransition(unrelatedArtifact, 'TRACE', 'Trace the retained admission.')).toThrow(
    /artifact reference/,
  );
  const advance = (nextWork: WorkState) => {
    const current = f.store.readHostStateSnapshot(request.identity);
    const currentLedger = requireFixtureValue(current.ledger, 'lifecycle current ledger');
    return f.store.compareAndSwapHostState({
      expectedWork: requireFixtureValue(current.workVersion, 'lifecycle current work version'),
      expectedLedger: requireFixtureValue(current.ledgerVersion, 'lifecycle current ledger version'),
      expectedMaintenanceGeneration: current.maintenanceGeneration,
      nextWork,
      nextLedger: { ...currentLedger, revision: currentLedger.revision + 1 },
    });
  };
  const traced = advance(f.store.projectLifecycleTransition(continuedWork, 'TRACE', 'Trace the retained admission.'));
  const tracedWork = requireFixtureValue(traced.work, 'traced lifecycle work');
  const planRef: LifecycleReferenceRecord = {
    schema: 'LifecycleArtifactReference/v1',
    kind: 'source_plan',
    artifact_schema: 'SourcePlan/v1',
    record_id: 'current-plan',
    path: '.agent/current-plan.json',
    sha256: '9'.repeat(64),
    source_revision: tracedWork.binding.work_source_revision,
    scope_id: tracedWork.binding.scope_id,
    ac_ids: tracedWork.binding.ac_ids,
    generation: null,
    implementation_fingerprint: null,
    delivery_cycle_id: null,
    principal: 'fixture-owner',
    decision: 'pass',
    disposition: 'current',
  };
  const prepared = advance({
    ...tracedWork,
    revision: tracedWork.revision + 1,
    lifecycle: {
      ...tracedWork.lifecycle,
      revision: tracedWork.revision + 1,
      references: [...tracedWork.lifecycle.references, planRef],
    },
  });
  const preparedWork = requireFixtureValue(prepared.work, 'prepared lifecycle work');
  const planned = advance(f.store.projectLifecycleTransition(preparedWork, 'PLAN', 'Plan the current Source work.'));
  const plannedWork = requireFixtureValue(planned.work, 'planned lifecycle work');
  expect(plannedWork.lifecycle.phase).toBe('PLAN');
  expect(() => f.store.projectLifecycleTransition(plannedWork, 'EXECUTE', 'Execute current Source work.')).toThrow(
    /current execution_approval/,
  );
  expect(plannedWork.lifecycle.references.slice(0, 3)).toEqual([...prior.lifecycle.references]);
  expect(plannedWork.artifacts).toEqual(prior.artifacts);
  expect(f.store.readHostStateSnapshot(request.identity).work).toEqual(plannedWork);
  const storedReceipt = requireFixturePayloadDigest(
    f.db
      .query('SELECT payload,digest FROM agent_host_delivered_work_continuation WHERE workspace_id=?')
      .get(workspaceId),
  );
  f.db.query('DELETE FROM agent_host_delivered_work_continuation WHERE workspace_id=?').run(workspaceId);
  expect(() => f.store.readHostStateSnapshot(request.identity)).toThrow(/authority binding/);
  f.db
    .query('INSERT INTO agent_host_delivered_work_continuation VALUES(?,?,?,?,?,?)')
    .run(
      workspaceId,
      request.identity.work_id,
      1,
      request.action.request.action_id,
      storedReceipt.payload,
      storedReceipt.digest,
    );
  expect(f.store.readHostStateSnapshot(request.identity).work).toEqual(plannedWork);
});

test.each(['delivery', 'normal'])(
  'configured-frontier public repair plans, applies and resumes the exact full-wave receipt without changing Host state [%s]',
  async (proofKind) => {
    const fixture = configuredFrontierRepairHostRoot(proofKind),
      { root, config, workspaceId, input } = fixture;
    const databasePath = path.join(root, config.control.work_root, 'session-handoff.v1.sqlite');
    mkdirSync(path.dirname(databasePath), { recursive: true });
    const f = await continuationFixture({
      root,
      config,
      workspaceId,
      databasePath,
      repositoryRoot: root,
      identity: input.receipt.request.identity,
    });
    seedFrontierHostFixture(f, input, true);
    const prefix = [
      '--kind',
      'delivered-work-continuation',
      '--project-root',
      root,
      '--repair-id',
      'frontier-integrity',
    ];
    const details = [
      '--actor',
      'fixture-owner',
      '--timestamp',
      '2026-10-08T00:00:00.000Z',
      '--projects',
      'agent',
      '--work-id',
      f.identity.work_id,
      '--attempt',
      '1',
      '--action-id',
      input.receipt.request.action.request.action_id,
    ];
    const planned: unknown = await runDeliveredWorkContinuationRepair([...prefix, '--mode', 'plan', ...details]);
    if (!isPlainRecord(planned)) throw new Error('Fixture repair plan returned no result record');
    expect(planned.branch).toBe('configured_frontier');
    expect((await runDeliveredWorkContinuationRepair([...prefix, '--mode', 'apply'])).status).toBe('applied');
    expect((await runDeliveredWorkContinuationRepair([...prefix, '--mode', 'resume'])).status).toBe('already_applied');
    expect(f.store.readHostStateSnapshot(f.identity).work).toEqual(input.receipt.successor_work);
    expect(f.store.readHostStateSnapshot(f.identity).ledger).toEqual(input.receipt.successor_ledger);
    const row: unknown = f.db
      .query('SELECT payload,digest FROM agent_host_delivered_work_continuation WHERE workspace_id=?')
      .get(workspaceId);
    expect(requireFixtureTextColumn(row, 'payload')).toBe(canonicalJson(input.receipt));
    expect(requireFixtureTextColumn(row, 'digest')).toBe(canonicalJsonDigest(input.receipt));
  },
);

test.each(['delivery', 'normal'])(
  'frontier repair rechecks accepted intake before reservation and retains exact UNKNOWN recovery after interruption [%s]',
  async (proofKind) => {
    const { root, config, workspaceId, input, intakePath } = configuredFrontierRepairHostRoot(proofKind);
    const databasePath = path.join(root, config.control.work_root, 'session-handoff.v1.sqlite');
    mkdirSync(path.dirname(databasePath), { recursive: true });
    const f = await continuationFixture({
      root,
      config,
      workspaceId,
      databasePath,
      repositoryRoot: root,
      identity: input.receipt.request.identity,
    });
    seedFrontierHostFixture(f, input, true);
    const prefix = [
      '--kind',
      'delivered-work-continuation',
      '--project-root',
      root,
      '--repair-id',
      'frontier-interrupted',
    ];
    const details = [
      '--actor',
      'fixture-owner',
      '--timestamp',
      '2026-10-08T00:00:00.000Z',
      '--projects',
      'agent',
      '--work-id',
      f.identity.work_id,
      '--attempt',
      '1',
      '--action-id',
      input.receipt.request.action.request.action_id,
    ];
    await runDeliveredWorkContinuationRepair([...prefix, '--mode', 'plan', ...details]);
    const original = readFileSync(path.join(root, intakePath));
    writeFileSync(path.join(root, intakePath), '{}');
    await expectRejection(runDeliveredWorkContinuationRepair([...prefix, '--mode', 'apply']), /intake bytes differ/);
    expect(
      requireFixtureNumberColumn(
        f.db
          .query(
            "SELECT count(*) AS n FROM agent_host_governance WHERE workspace_id=? AND store_id='vida-delivered-continuation-repairs'",
          )
          .get(workspaceId),
        'n',
      ),
    ).toBe(0);
    writeFileSync(path.join(root, intakePath), original);
    f.db.exec(
      "CREATE TRIGGER frontier_repair_interrupt BEFORE UPDATE OF digest ON agent_host_delivered_work_continuation BEGIN SELECT RAISE(ABORT,'fixture interrupted frontier repair'); END",
    );
    await expectRejection(
      runDeliveredWorkContinuationRepair([...prefix, '--mode', 'apply']),
      /fixture interrupted frontier repair/,
    );
    const operation: unknown = f.db
      .query(
        "SELECT payload FROM agent_host_governance WHERE workspace_id=? AND store_id='vida-delivered-continuation-repairs' AND kind='operation'",
      )
      .get(workspaceId);
    const decodedOperation: unknown = JSON.parse(requireFixtureTextColumn(operation, 'payload'));
    if (!isPlainRecord(decodedOperation)) throw new Error('Fixture repair operation is not an object');
    expect(decodedOperation.status).toBe('commit_unknown');
    expect(() => f.store.assertSessionProducerWriteAllowed()).toThrow(/repair/);
    expect(
      requireFixtureTextColumn(
        f.db.query('SELECT digest FROM agent_host_delivered_work_continuation WHERE workspace_id=?').get(workspaceId),
        'digest',
      ),
    ).toBe('0'.repeat(64));
    f.db.exec('DROP TRIGGER frontier_repair_interrupt');
    expect((await runDeliveredWorkContinuationRepair([...prefix, '--mode', 'resume'])).status).toBe('applied');
    expect((await runDeliveredWorkContinuationRepair([...prefix, '--mode', 'resume'])).status).toBe('already_applied');
    expect(f.store.readHostStateSnapshot(f.identity).work).toEqual(input.receipt.successor_work);
    expect(f.store.readHostStateSnapshot(f.identity).ledger).toEqual(input.receipt.successor_ledger);
  },
);

test('Host preserves an issued UNKNOWN journal action and denies continuation without reissue', async () => {
  const f = await continuationFixture({ uncertain: true });
  try {
    const request = continuationRequestFor(f),
      before = f.store.readHostStateSnapshot(f.identity),
      journalBefore = f.db
        .query(
          'SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?',
        )
        .get(fixtureWorkspace, f.identity.work_id, 1);
    await Promise.resolve(expect(f.store.continueDeliveredWork(request)).rejects.toThrow(/unresolved outcome/));
    expect(f.store.readHostStateSnapshot(f.identity)).toEqual(before);
    expect(
      f.db
        .query(
          'SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?',
        )
        .get(fixtureWorkspace, f.identity.work_id, 1),
    ).toEqual(journalBefore);
  } finally {
  }
});
