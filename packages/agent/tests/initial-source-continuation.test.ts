import { qualifiedRuntimeCodeEndpointFixture } from './helpers/qualified-runtime-code-fixture.ts';
import {
  createInitialSourceWorkFixture,
  withInitialSourceCleanup as withCleanup,
  assertOwnedFixtureParent,
  hostStore,
  hostLedger,
  hostBridge,
  hostDatabase,
  admittedInput,
  originalEngine,
  workLease,
  workRunId,
  completeHostState,
  currentJournal,
  continuationState,
  changeOneAcceptedDocument,
  currentProof,
  initialRequest,
  expiredOwnerTime,
  frontierCodeRequest,
  fixtureFrontierProof,
  trustedHostFixtureVerifier,
  withExpiredOwner,
  type InitialWorkFixture,
} from './helpers/initial-source-work-fixture.ts';
import { expectRejection, rejectionReason } from './helpers/expect-rejection.ts';
import { test, expect, setSystemTime, spyOn } from 'bun:test';
import { runBoundedSubprocess, subprocessFailure } from './helpers/bounded-subprocess.ts';
import { pinnedEnvironment } from '../bin/bun.ts';
import { Database, type SQLQueryBindings } from 'bun:sqlite';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { canonicalJsonDigest, isPlainRecord } from '../src/contracts/public-ingress.ts';
import * as runtimeConfig from '../src/config/runtime-config.ts';
import {
  loadRuntimeConfig,
  runtimeConfigDigest,
  runtimePackageAccess,
  runtimePackageCodePaths,
} from '../src/config/runtime-config.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { snapshotDeclaredSources, compareScopedSourceSnapshots } from '../src/orchestration/scoped-source-snapshot.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';
import { HostStateStore } from '../src/host-state.ts';
import { createCompletedSourceReportRecoveryFixture } from './helpers/completed-source-report-recovery-fixture.ts';
import { expectHistorySnapshotAfterOwner } from './helpers/ledger-cache-observer.ts';
import { captureInitialSourceEngineDiagnostic } from './helpers/initial-source-engine-diagnostic.ts';
import { runWithInitialSourceTiming } from './helpers/initial-source-run-timing-diagnostic.ts';
import { initialSourcePhases } from './helpers/initial-source-phase-timing.ts';
import { validateInitialSourceFrontierCodeRebindReceipt } from '../src/orchestration/initial-source-frontier-code-rebind.ts';
import {
  validateQualifiedRuntimeCodeContinuationRequest,
  validateQualifiedRuntimeCodePreparedPlanRefresh,
  projectQualifiedRuntimeCodeAncestor,
  refreshQualifiedRuntimeCodePreparedPlan,
} from '../src/orchestration/qualified-runtime-code-continuation.ts';
import {
  validateCompletedSourceReportRecoveryCurrentWorkJoin,
  validateCompletedSourceReportRecoveryReceipt,
} from '../src/orchestration/completed-source-report-recovery.ts';

import { MastraSessionBridge, parseSessionBridgeRequest } from '../src/orchestration/mastra-session-bridge.ts';
import {
  MastraSessionLedger,
  openConfiguredMastraSessionLedger,
} from '../src/orchestration/persistent-session-handoff.ts';

import { readInitialSourceContinuationSessionEngineSnapshot } from '../src/orchestration/session-engine-snapshot.ts';
import { bindControlledRuntimeInitialization } from './helpers/controlled-runtime-initialization-fixture.ts';
import { lifecyclePreparationObservationSchema } from '../src/orchestration/final-assurance.ts';
import { run } from '../bin/run.ts';
import { runQualifiedRuntimeCodeContinuation } from '../bin/qualified-runtime-code-continuation.ts';
import {
  validateInitialSourceContinuationReceipt,
  validateInitialSourceContinuationRequest,
} from '../src/orchestration/initial-source-continuation.ts';

import type { SafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import type { LifecycleArtifactReference } from '../src/lifecycle/lifecycle-state.ts';
import type { CoordinationLedger } from '../src/contracts/envelopes.ts';
import type { StateVersion, WorkState } from '../src/host-state.ts';
import type { InitialSourceContinuationRequest } from '../src/orchestration/initial-source-continuation.ts';
import type { InitialSourceFrontierCodeRebindRequest } from '../src/orchestration/initial-source-frontier-code-rebind.ts';
import type { CompletedSourceReportRecoveryVerifyCurrent } from '../src/orchestration/completed-source-report-recovery.ts';

import type { SessionBridgeObservation } from '../src/orchestration/mastra-session-bridge.ts';
import type { MastraSessionLedger as MastraSessionLedgerType } from '../src/orchestration/persistent-session-handoff.ts';

type InitialSourceCommandResult = {
  status: 'initial_source_continuation_applied' | 'initial_source_continuation_already_ready';
  continuation_id: string;
  request_digest: string;
  work_version: StateVersion;
  ledger_version: StateVersion;
  journal_version: StateVersion;
  rights_granted: false;
  accepted_result: false;
  runtime_acceptance: false;
};

const bundle = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const sha256 = (bytes: string | Uint8Array) => createHash('sha256').update(bytes).digest('hex');

const record = (value: unknown) => JSON.stringify(value) + '\n';
const fixtureChild = process.env.VIDA_INITIAL_SOURCE_FIXTURE_CHILD === '1';
const fixtureParentRoot = process.env.VIDA_INITIAL_SOURCE_FIXTURE_ROOT;

/** Pure request fixtures establish no Host authority or native qualification. */
if (!fixtureChild) {
  test('prepared code refresh permits only the current native target fields', () => {
    const prior = validateQualifiedRuntimeCodeContinuationRequest({
      schema: 'QualifiedRuntimeCodeContinuationRequest/v1',
      identity: {
        repository_id: 'fixture',
        project_ids: ['agent'],
        integrations_digest: 'a'.repeat(64),
        work_id: 'work',
      },
      attempt: 1,
      nativeSessionHandle: 'fixture-owner',
      leaseGeneration: 1,
      expectedWork: { revision: 2, digest: 'b'.repeat(64) },
      expectedLedger: { revision: 3, digest: 'c'.repeat(64) },
      expectedJournal: { revision: 4, digest: 'd'.repeat(64) },
      expectedMaintenanceGeneration: 0,
      originalSourceScopeDigest: 'e'.repeat(64),
      journalSourceScopeDigest: 'f'.repeat(64),
      oldRuntimeCodeDigest: '0'.repeat(64),
      currentRuntimeCodeDigest: '1'.repeat(64),
      oldRuntimeCodePaths: ['bin/run.mjs'],
      currentRuntimeCodePaths: ['bin/run.mjs'],
      oldManifestRef: '.tmp/parent/manifest.json',
      oldManifestDigest: '2'.repeat(64),
      oldInstallRef: '.tmp/parent/install.json',
      currentManifestRef: '.tmp/current/manifest.json',
      currentManifestDigest: '3'.repeat(64),
      currentInstallRef: '.tmp/current/install.json',
      systemUpdateRef: '.tmp/current/install.json',
      systemUpdateOperationId: 'fixture-current',
      nativeSelfAttestationDigest: '4'.repeat(64),
    });
    const target = {
      ...prior,
      currentRuntimeCodeDigest: '5'.repeat(64),
      currentRuntimeCodePaths: ['bin/run.mjs', 'src/host-state.ts'],
      currentManifestRef: '.tmp/next/manifest.json',
      currentManifestDigest: '6'.repeat(64),
      currentInstallRef: '.tmp/next/install.json',
      systemUpdateRef: '.tmp/next/install.json',
      systemUpdateOperationId: 'fixture-next',
      nativeSelfAttestationDigest: '7'.repeat(64),
    };
    expect(validateQualifiedRuntimeCodePreparedPlanRefresh(prior, target)).toEqual(target);
    expect(validateQualifiedRuntimeCodePreparedPlanRefresh(prior, prior)).toEqual(prior);
    for (const changed of [
      { identity: { ...prior.identity, repository_id: 'foreign' } },
      { identity: { ...prior.identity, project_ids: ['plugin'] } },
      { identity: { ...prior.identity, integrations_digest: '8'.repeat(64) } },
      { identity: { ...prior.identity, work_id: 'other-work' } },
      { attempt: 2 },
      { nativeSessionHandle: 'foreign-owner' },
      { leaseGeneration: 2 },
      { expectedWork: { ...prior.expectedWork, revision: 3 } },
      { expectedLedger: { ...prior.expectedLedger, digest: '8'.repeat(64) } },
      { expectedJournal: { ...prior.expectedJournal, revision: 5 } },
      { expectedMaintenanceGeneration: 1 },
      { originalSourceScopeDigest: '8'.repeat(64) },
      { journalSourceScopeDigest: '8'.repeat(64) },
      { oldRuntimeCodeDigest: '8'.repeat(64) },
      { oldRuntimeCodePaths: ['src/host-state.ts'] },
      { oldManifestRef: '.tmp/foreign/manifest.json' },
      { oldManifestDigest: '8'.repeat(64) },
      { oldInstallRef: '.tmp/foreign/install.json' },
    ])
      expect(() => validateQualifiedRuntimeCodePreparedPlanRefresh(prior, { ...target, ...changed })).toThrow(
        /changed original identity, parent, Source or CAS/,
      );
    for (const changed of [
      { currentRuntimeCodeDigest: prior.oldRuntimeCodeDigest },
      { currentRuntimeCodePaths: ['../escape'] },
      { currentManifestRef: '/outside/manifest.json' },
      { nativeSelfAttestationDigest: 'invalid' },
      { extra: true },
    ])
      expect(() => validateQualifiedRuntimeCodePreparedPlanRefresh(prior, { ...target, ...changed })).toThrow();
  });
}

function removeOwnedFixtureParent(root: string) {
  const owned = assertOwnedFixtureParent(root);
  rmSync(owned, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
}

async function withInitialWork<T>(callback: (fixture: InitialWorkFixture) => T | Promise<T>) {
  const f = await makeInitialWork();
  return withCleanup(
    async () => {
      try {
        return await callback(f);
      } catch (error) {
        const outputFile = process.env.VIDA_INITIAL_SOURCE_ENGINE_DIAGNOSTIC_FILE;
        if (typeof outputFile === 'string' && outputFile.length > 0 && f.originalEngine) {
          try {
            captureInitialSourceEngineDiagnostic({
              repositoryRoot: f.root,
              config: f.config,
              runId: f.originalEngine.run_id,
              outputFile,
            });
          } catch (diagnosticError) {
            throw new AggregateError(
              [error, diagnosticError],
              'Initial Source operation and diagnostic capture failed',
              {
                cause: error,
              },
            );
          }
        }
        throw error;
      }
    },
    () => f.close(),
    'Initial Source operation',
  );
}

async function makeInitialWork(): Promise<InitialWorkFixture> {
  const f = await createInitialSourceWorkFixture(
    fixtureChild ? { parentRoot: requireString(fixtureParentRoot, 'initial-source subprocess fixture root') } : {},
  );
  let verified = false;
  return withCleanup(
    () => {
      expect(originalEngine(f).step_id).toBe('wave-0');
      expect(originalEngine(f).requests).toHaveLength(1);
      verified = true;
      return f;
    },
    () => (verified ? undefined : f.close()),
    'Initial Source fixture preconditions',
  );
}

function holdExpiredOwnerClockForFixture(f: InitialWorkFixture) {
  const originalClose = f.close;
  const expiredAt = expiredOwnerTime(f);
  setSystemTime(new Date(expiredAt));
  f.close = async () => {
    try {
      await originalClose.call(f);
    } finally {
      setSystemTime();
    }
  };
}

async function withExpiredOwnerAsync<T>(f: InitialWorkFixture, callback: () => Promise<T>) {
  const expiredAt = expiredOwnerTime(f);
  const originalNow = Date.now;
  Date.now = () => expiredAt;
  return withCleanup(
    callback,
    () => {
      Date.now = originalNow;
    },
    'Initial Source owner clock restoration',
  );
}

async function bindFixtureRuntimeInitialization(f: InitialWorkFixture): Promise<void> {
  await bindControlledRuntimeInitialization(f.root, f.config, hostStore(f));
}

function initialSourceRunArgs(f: InitialWorkFixture, scopeDigest: string) {
  const projectId = f.identity.project_ids[0];
  if (!projectId) throw new Error('Initial Source fixture has no project binding');
  const selection = admittedInput(f).selection;
  return [
    '--project-root',
    f.root,
    '--repository',
    f.config.repository.repository_id,
    '--project',
    projectId,
    '--work-path',
    f.documents[0],
    '--work-id',
    f.identity.work_id,
    '--attempt',
    '1',
    '--scope-digest',
    scopeDigest,
    '--team',
    selection.team,
    '--kind',
    selection.kind,
    '--intent',
    selection.intent,
    '--workflow',
    'task_execution',
  ];
}

function expectedRunVersion(version: StateVersion) {
  return ['--expected-revision', String(version.revision), '--expected-digest', version.digest];
}

function requireRecord(value: unknown, label: string) {
  if (!isPlainRecord(value)) throw new Error(label + ' must be a plain record');
  return value;
}

function requireString(value: unknown, label: string) {
  if (typeof value !== 'string') throw new Error(label + ' must be a string');
  return value;
}

function requireStateVersion(value: unknown, label: string) {
  const version = requireRecord(value, label);
  if (
    typeof version.revision !== 'number' ||
    !Number.isSafeInteger(version.revision) ||
    version.revision < 1 ||
    typeof version.digest !== 'string' ||
    !/^[a-f0-9]{64}$/.test(version.digest)
  )
    throw new Error(label + ' is not a valid state version');
  return { revision: version.revision, digest: version.digest };
}

function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function requireArray(value: unknown, label: string) {
  if (!isUnknownArray(value)) throw new Error(label + ' must be an array');
  return value;
}

function firstValue<T>(values: readonly T[], label: string) {
  const value = values[0];
  if (value === undefined) throw new Error(label + ' is empty');
  return value;
}

function parsePendingRequests(value: unknown, label: string) {
  return requireArray(value, label).map((entry, index) => {
    const action = requireRecord(entry, label + '[' + index + ']');
    return parseSessionBridgeRequest(action.request);
  });
}

function parseIssuedActions(value: unknown, label: string) {
  return requireArray(value, label).map((entry, index) => {
    const action = requireRecord(entry, label + '[' + index + ']');
    const request = parseSessionBridgeRequest(action.request);
    const issueId = requireString(action.issue_id, label + '[' + index + '].issue_id');
    if (action.development_packet === undefined) return { request, issue_id: issueId };
    const packet = requireRecord(action.development_packet, label + '[' + index + '].development_packet');
    const constraints = requireArray(
      packet.implementation_constraints,
      label + '[' + index + '].implementation_constraints',
    ).map((constraint, constraintIndex) =>
      requireString(constraint, label + '[' + index + '].implementation_constraints[' + constraintIndex + ']'),
    );
    return { request, issue_id: issueId, development_packet: { implementation_constraints: constraints } };
  });
}

async function runAgent(args: readonly string[]) {
  const result: unknown = await runWithInitialSourceTiming(args, () => run([...args]));
  return result;
}

function parseInitialSourceInspection(value: unknown, f: InitialWorkFixture) {
  const result = requireRecord(value, 'initial-source inspect result');
  if (
    result.status !== 'initial_source_continuation_ready' ||
    result.next_operation !== 'apply' ||
    result.rights_granted !== false ||
    result.accepted_result !== false ||
    result.runtime_acceptance !== false
  )
    throw new Error('initial-source inspect result has an invalid status or grants a result/right');
  return {
    status: 'initial_source_continuation_ready',
    next_operation: 'apply',
    rights_granted: false,
    accepted_result: false,
    runtime_acceptance: false,
    request: validateInitialSourceContinuationRequest(result.request, continuationState(f), f.config),
  };
}

function parseInitialSourceCommandResult(value: unknown, expectedStatus: InitialSourceCommandResult['status']) {
  const result = requireRecord(value, 'initial-source command result');
  if (
    result.status !== expectedStatus ||
    result.rights_granted !== false ||
    result.accepted_result !== false ||
    result.runtime_acceptance !== false
  )
    throw new Error('initial-source command result has an invalid status or grants a result/right');
  return {
    status: expectedStatus,
    continuation_id: requireString(result.continuation_id, 'continuation_id'),
    request_digest: requireString(result.request_digest, 'request_digest'),
    work_version: requireStateVersion(result.work_version, 'work_version'),
    ledger_version: requireStateVersion(result.ledger_version, 'ledger_version'),
    journal_version: requireStateVersion(result.journal_version, 'journal_version'),
    rights_granted: false,
    accepted_result: false,
    runtime_acceptance: false,
  };
}

async function expectRejectedMessage(pending: Promise<unknown>, pattern: RegExp) {
  let rejected = false;
  let rejection: unknown;
  try {
    await pending;
  } catch (error) {
    rejected = true;
    rejection = error;
  }
  if (!rejected) throw new Error('Expected the operation to reject with ' + pattern);
  if (!(rejection instanceof Error) || !pattern.test(rejection.message))
    throw new Error('The operation rejected with an unexpected error', { cause: rejection });
}

function expectNoChange(f: InitialWorkFixture, request: InitialSourceContinuationRequest, expire = true) {
  const beforeHost = completeHostState(hostStore(f).readHostStateSnapshot(f.identity));
  const beforeJournal = currentJournal(f);
  const invoke = () => hostStore(f).continueInitialSource(request, (state) => currentProof(f, state));
  expect(() => (expire ? withExpiredOwner(f, invoke) : invoke())).toThrow();
  expect(completeHostState(hostStore(f).readHostStateSnapshot(f.identity))).toEqual(beforeHost);
  expect(currentJournal(f)).toEqual(beforeJournal);
  expect(hostStore(f).readInitialSourceContinuationReceipt(f.identity, 1)).toBeNull();
}

async function runOwnedInitialSourceFixture(name: string) {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-initial-source-owned-'));
  let successfulExitObserved = false;
  await withCleanup(
    async () => {
      const result = await runBoundedSubprocess(
        process.execPath,
        [
          'test',
          ...(initialSourcePhases.enabled
            ? ['--preload', fileURLToPath(new URL('./helpers/initial-source-phase-preload.ts', import.meta.url))]
            : []),
          '--timeout',
          '60000',
          '--test-name-pattern',
          '^' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$',
          fileURLToPath(import.meta.url),
        ],
        {
          cwd: bundle,
          env: {
            ...pinnedEnvironment(process.execPath, process.env, bundle),
            VIDA_INITIAL_SOURCE_FIXTURE_CHILD: '1',
            VIDA_INITIAL_SOURCE_FIXTURE_ROOT: root,
          },
          timeoutMs: 180_000,
        },
      );
      successfulExitObserved =
        result.closeObserved &&
        !result.timedOut &&
        result.exitCode === 0 &&
        result.signal === null &&
        result.childError === null &&
        result.terminationRequestConfirmed === null &&
        result.stderrForwardingError === null &&
        !result.stdoutTruncated &&
        !result.stderrTruncated;
      process.stderr.write(result.stderr);
      if (!successfulExitObserved) throw new Error(subprocessFailure('initial-source fixture subprocess', result));
      return result;
    },
    () => {
      if (!successfulExitObserved) throw new Error('Initial Source child did not pass; fixture retained at ' + root);
      removeOwnedFixtureParent(root);
    },
    'Initial Source subprocess',
  );
}

// Each real Host case owns its child and cleanup; existing case/child bounds stay fixed.

function registerFixtureTest(name: string, operation: () => Promise<void>) {
  if (fixtureChild) test(name, operation);
  else test(name, () => runOwnedInitialSourceFixture(name), 190_000);
}

/** Public inspect/apply preparation stops at the real same-run unissued wave-1 frontier. */
async function prepareInitialSourceWaveOne(f: InitialWorkFixture, checkInitialRetries = true) {
  const currentSource = changeOneAcceptedDocument(f);
  const requestPath = '.agent/work/' + f.identity.work_id + '/initial-source-continuation.json';
  writeFileSync(
    path.join(f.root, requestPath),
    record({
      identity: f.identity,
      attempt: 1,
      nativeSessionHandle: admittedInput(f).nativeSessionHandle,
    }),
  );
  const inspectArgs = [
    '--continue-initial-source',
    'true',
    '--mode',
    'inspect',
    '--project-root',
    f.root,
    '--request',
    requestPath,
  ];
  const inspected = await withExpiredOwnerAsync(f, async () =>
    parseInitialSourceInspection(await runAgent(inspectArgs), f),
  );
  expect(inspected.status).toBe('initial_source_continuation_ready');
  expect(inspected.next_operation).toBe('apply');
  expect(inspected.rights_granted).toBe(false);
  expect(inspected.accepted_result).toBe(false);
  expect(inspected.runtime_acceptance).toBe(false);
  expect(inspected.request.configDigest).toBe(runtimeConfigDigest(f.config));
  const request = inspected.request;
  writeFileSync(path.join(f.root, requestPath), record(request));
  expect(request.authorizedSourceChanges.map((change) => change.path)).toEqual([f.documents[1]]);
  expect(request.currentInitialRequest.stage_id).toBe('synthesize_task');
  expect(request.currentInitialRequest.wave_index).toBe(0);
  const originalRequest = firstValue(originalEngine(f).requests, 'Original Initial Source engine request');
  expect(originalRequest.stage_id).toBe('synthesize_task');
  expect(originalEngine(f).observations).toEqual([]);
  expect(request.currentRuntimeCodeDigest).toBe(request.priorRuntimeCodeDigest);
  expect(request.currentSourceScope.digest).toBe(currentSource.digest);
  const beforeHost = completeHostState(hostStore(f).readHostStateSnapshot(f.identity));
  const retainedPaths = [f.scopePath, f.acceptancePath, f.sourceAuthorizationPath, f.intakePath, f.rawIntakePath];
  const retainedBytes = retainedPaths.map((relative) => readFileSync(path.join(f.root, relative)));
  const intakeBytes = retainedBytes[3];
  if (!intakeBytes) throw new Error('Initial Source fixture intake beforeimage is unavailable');
  const intakeBefore = canonicalJsonDigest(JSON.parse(intakeBytes.toString('utf8')));
  const applied = parseInitialSourceCommandResult(
    await withExpiredOwnerAsync(f, () =>
      runAgent([
        '--continue-initial-source',
        'true',
        '--mode',
        'apply',
        '--project-root',
        f.root,
        '--request',
        requestPath,
      ]),
    ),
    'initial_source_continuation_applied',
  );
  expect(applied.status).toBe('initial_source_continuation_applied');
  expect(applied.rights_granted).toBe(false);
  expect(applied.accepted_result).toBe(false);
  expect(applied.runtime_acceptance).toBe(false);
  const storedReceipt = hostStore(f).readInitialSourceContinuationReceipt(f.identity, 1);
  if (!storedReceipt) throw new Error('Initial Source continuation receipt was not retained');
  const receipt = validateInitialSourceContinuationReceipt(storedReceipt);
  const priorRunId = workRunId(receipt.prior_work);
  expect(receipt.status).toBe('initial_request_ready');
  expect(receipt.rights_granted).toBe(false);
  expect(receipt.accepted_result).toBe(false);
  expect(receipt.runtime_acceptance).toBe(false);
  expect(receipt.prior_work).toEqual(beforeHost.work);
  expect(receipt.successor_work.binding.lifecycle_work_id).toBe(request.identity.work_id);
  expect(receipt.successor_work.binding.workflow_id).toBe(beforeHost.work.binding.workflow_id);
  expect(receipt.successor_work.binding.scope_id).toBe(beforeHost.work.binding.scope_id);
  expect(receipt.successor_work.binding.ac_ids).toEqual(beforeHost.work.binding.ac_ids);
  expect(workRunId(receipt.successor_work)).toBe(workRunId(beforeHost.work));
  expect(receipt.successor_work.execution.assignment_attempts).toEqual([]);
  expect(workLease(receipt.successor_work).thread_id).toBe(request.nativeSessionHandle);
  expect(workLease(receipt.successor_work).ticket_id).not.toBe(workLease(beforeHost.work).ticket_id);
  expect(receipt.successor_journal.completed).toEqual([]);
  expect(receipt.successor_journal.items).toHaveLength(1);
  const continuedItem = firstValue(receipt.successor_journal.items, 'Continued Initial Source Journal item');
  expect(continuedItem.request).toEqual(request.currentInitialRequest);
  expect(continuedItem.issue_id).toBeNull();
  expect(continuedItem.observation).toBeNull();
  const lastRebind = receipt.successor_ledger.rebinds.at(-1);
  if (!lastRebind) throw new Error('Initial Source continuation rebind record is missing');
  expect(lastRebind.resources).toEqual(['execution:' + request.identity.work_id]);
  for (const [index, relative] of retainedPaths.entries()) {
    const retained = retainedBytes[index];
    if (retained === undefined) throw new Error('Initial Source fixture beforeimage is missing');
    expect(readFileSync(path.join(f.root, relative))).toEqual(retained);
  }
  expect(canonicalJsonDigest(JSON.parse(readFileSync(path.join(f.root, f.intakePath), 'utf8')))).toBe(intakeBefore);
  expect(hostStore(f).readInitialSourceContinuationReceipt(f.identity, 1)).toEqual(receipt);

  await hostBridge(f).close();
  f.bridge = null;
  hostLedger(f).close();
  f.ledger = null;
  const receiptLedger = openConfiguredMastraSessionLedger(f.root);
  f.ledger = receiptLedger;
  f.store = receiptLedger.hostState;
  expect(hostStore(f).readInitialSourceContinuationReceipt(f.identity, 1)).toEqual(receipt);
  if (checkInitialRetries) {
    const retry = parseInitialSourceCommandResult(
      await runAgent([
        '--continue-initial-source',
        'true',
        '--mode',
        'apply',
        '--project-root',
        f.root,
        '--request',
        requestPath,
      ]),
      'initial_source_continuation_already_ready',
    );
    expect(retry.status).toBe('initial_source_continuation_already_ready');
    expect(retry.continuation_id).toBe(receipt.continuation_id);
    expect(retry.request_digest).toBe(receipt.request_digest);
    expect(hostStore(f).readInitialSourceContinuationReceipt(f.identity, 1)).toEqual(receipt);
  }

  const reopenedContext = { ...admittedInput(f).context, scope_digest: currentSource.digest };
  const reopenedBridge = await MastraSessionBridge.open({
    repositoryRoot: f.root,
    config: f.config,
    ledger: hostLedger(f),
    projectIds: f.identity.project_ids,
    selection: admittedInput(f).selection,
    context: reopenedContext,
    workflowId: 'task_execution',
    workspaceId: deriveWorkspaceId(f.config.repository.repository_id, f.root),
    initialSourceContinuation: { identity: f.identity, attempt: 1 },
  });
  f.bridge = reopenedBridge;
  const reopened = await hostBridge(f).snapshot();
  expect(reopened).toMatchObject({
    run_id: priorRunId,
    status: 'suspended',
    step_id: 'wave-0',
    requests: [request.currentInitialRequest],
    observations: [],
  });

  await bindFixtureRuntimeInitialization(f);
  const args = initialSourceRunArgs(f, currentSource.digest);
  await hostBridge(f).close();
  f.bridge = null;
  hostLedger(f).close();
  f.ledger = null;
  hostDatabase(f).close(true);
  f.database = null;
  f.store = null;

  const prepared = requireRecord(await runAgent(args), 'initial Source workflow preparation');
  expect(requireString(prepared.mastra_run_id, 'prepared mastra_run_id')).toBe(priorRunId);
  expect(requireString(prepared.mastra_step_id, 'prepared mastra_step_id')).toBe('wave-0');
  expect(requireString(prepared.source_snapshot_digest, 'prepared source_snapshot_digest')).toBe(currentSource.digest);
  const preparedStateVersion = requireStateVersion(prepared.state_version, 'prepared state_version');
  const preparedAction = firstValue(
    parsePendingRequests(prepared.next_actions, 'prepared next_actions'),
    'prepared next_actions',
  );
  expect(preparedAction).toEqual(request.currentInitialRequest);

  const issued = requireRecord(
    await runAgent([...args, ...expectedRunVersion(preparedStateVersion), '--issue-wave', 'true']),
    'initial Source first-wave issue',
  );
  expect(requireString(issued.status, 'issued status')).toBe('wave_issued');
  expect(requireString(issued.mastra_run_id, 'issued mastra_run_id')).toBe(priorRunId);
  const issuedStateVersion = requireStateVersion(issued.state_version, 'issued state_version');
  const issuedActions = parseIssuedActions(issued.issued_actions, 'issued actions');
  expect(issuedActions).toHaveLength(1);
  const issuedAction = firstValue(issuedActions, 'issued actions');
  expect(issuedAction.request).toEqual(request.currentInitialRequest);
  const firstIssueId = issuedAction.issue_id;
  if (checkInitialRetries) {
    await expectRejectedMessage(
      runAgent([...args, ...expectedRunVersion(issuedStateVersion), '--issue-wave', 'true']),
      /Initial Source continuation has an issued action with unknown outcome; automatic reissue is forbidden/,
    );
  }

  const unknownOutcomeLedger = openConfiguredMastraSessionLedger(f.root);
  f.ledger = unknownOutcomeLedger;
  f.store = unknownOutcomeLedger.hostState;
  let journal = currentJournal(f);
  expect(journal.state.run_id).toBe(priorRunId);
  expect(journal.state.items).toHaveLength(1);
  const unresolvedItem = firstValue(journal.state.items, 'Issued unknown Initial Source Journal item');
  expect(unresolvedItem.issue_id).toBe(firstIssueId);
  expect(unresolvedItem.observation).toBeNull();
  hostLedger(f).close();
  f.ledger = null;
  f.store = null;

  const summary = 'Current accepted AC synthesized into a DevelopmentTaskPacket for the prewriter review.';
  const observation: SessionBridgeObservation = {
    schema: 'VidaSessionObservation/v1',
    action_id: issuedAction.request.action_id,
    issue_id: firstIssueId,
    agent_id: 'fixture:research-synthesizer',
    tool_call_ref: 'fixture:initial-source-task-synthesis',
    status: 'reported_complete',
    summary,
    output_digest: canonicalJsonDigest(summary),
    evidence_refs: ['fixture://initial-source-task-synthesis'],
  };
  const reportPath = path.join(f.root, '.agent', 'work', f.identity.work_id, 'initial-source-synthesis-report.json');
  writeFileSync(reportPath, record(observation));
  const reported = requireRecord(
    await runAgent([...args, ...expectedRunVersion(issuedStateVersion), '--report', reportPath]),
    'reported initial synthesis',
  );
  expect(requireString(reported.status, 'reported status')).toBe('resumed');
  expect(requireString(reported.mastra_run_id, 'reported mastra_run_id')).toBe(priorRunId);
  expect(requireString(reported.mastra_step_id, 'reported mastra_step_id')).not.toBe('wave-0');
  const reportedStateVersion = requireStateVersion(reported.state_version, 'reported state_version');
  const reportedRequests = parsePendingRequests(reported.next_actions, 'reported next_actions');
  expect(reportedRequests.length).toBeGreaterThan(0);
  expect(firstValue(reportedRequests, 'reported next_actions').stage_id).toBe('review_source_prewrite');

  const reopenedLedger = openConfiguredMastraSessionLedger(f.root);
  f.ledger = reopenedLedger;
  f.store = reopenedLedger.hostState;
  const waveOne = currentJournal(f);
  const frontier = firstValue(waveOne.state.items, 'Current unissued Initial Source wave-1 frontier');
  expect(frontier.request.wave_index).toBe(1);
  expect(waveOne.state.items.length).toBeGreaterThan(0);
  for (const item of waveOne.state.items) {
    expect(item.issue_id).toBeNull();
    expect(item.observation).toBeNull();
    expect(item.host_reservation).toBeUndefined();
    const stage = f.config.workflows[item.request.workflow_id]?.stages.find(
      (candidate) => candidate.id === item.request.stage_id,
    );
    if (!stage) throw new Error('Initial Source fixture stage is not configured');
    for (const assignment of stage.assignments) {
      const profile = f.config.agents.profiles[assignment.profile];
      if (!profile) throw new Error('Initial Source fixture profile is not configured');
      expect(profile.mutation_scope).toBe('none');
      expect(f.config.agents.tool_policies[profile.tools_policy]?.source_write).toBe(false);
    }
  }
  return {
    currentSource,
    requestPath,
    request,
    receipt,
    priorRunId,
    args,
    reportedStateVersion,
    reportedRequests,
    summary,
    observation,
  };
}

function withoutFrontierCodeBinding(work: WorkState) {
  return {
    ...work,
    revision: 0,
    binding: { ...work.binding, runtime_code_digest: '', runtime_source_revision: '' },
    lifecycle: {
      ...work.lifecycle,
      revision: 0,
      config_binding: { ...work.lifecycle.config_binding, runtime_code_digest: '' },
    },
  };
}

registerFixtureTest(
  'continues real admitted initial work on the same attempt and replays its durable receipt',
  async () =>
    withInitialWork(async (f) => {
      const { priorRunId, args, reportedStateVersion, summary, observation } = await prepareInitialSourceWaveOne(f);
      const reportedLedger = hostLedger(f);
      reportedLedger.close();
      f.ledger = null;
      f.store = null;
      const prewriter = requireRecord(
        await runAgent([...args, ...expectedRunVersion(reportedStateVersion), '--issue-wave', 'true']),
        'initial Source prewriter issue',
      );
      expect(requireString(prewriter.status, 'prewriter status')).toBe('wave_issued');
      expect(requireString(prewriter.mastra_run_id, 'prewriter mastra_run_id')).toBe(priorRunId);
      const prewriterActions = parseIssuedActions(prewriter.issued_actions, 'prewriter actions');
      expect(prewriterActions.length).toBeGreaterThan(0);
      expect(prewriterActions.every((item) => item.request.stage_id === 'review_source_prewrite')).toBe(true);
      const firstPrewriter = firstValue(prewriterActions, 'prewriter actions');
      expect(
        firstPrewriter.development_packet?.implementation_constraints.some((value) => value.includes(summary)),
      ).toBe(true);

      const completedLedger = openConfiguredMastraSessionLedger(f.root);
      f.ledger = completedLedger;
      f.store = completedLedger.hostState;
      const journal = currentJournal(f);
      expect(journal.state.run_id).toBe(priorRunId);
      expect(journal.state.completed).toHaveLength(1);
      const completedWave = firstValue(journal.state.completed, 'Completed Initial Source Journal wave');
      expect(firstValue(completedWave.items, 'Completed Initial Source Journal observation').observation).toEqual(
        observation,
      );
      expect(journal.state.items.every((item) => item.issue_id !== null)).toBe(true);
      expect(journal.state.items.every((item) => item.request.stage_id === 'review_source_prewrite')).toBe(true);
    }),
);

function completedSourceRecoveryCase(refreshOnly: 'none' | 'guards' | 'crash-before' | 'crash-after') {
  return async () => {
    await withInitialWork(async (f) => {
      holdExpiredOwnerClockForFixture(f);
      const { args } = await prepareInitialSourceWaveOne(f, false);
      let stateVersion = continuationState(f).journalVersion;
      const prewriterIssue = requireRecord(
        await runAgent([...args, ...expectedRunVersion(stateVersion), '--issue-wave', 'true']),
        'Initial Source prewriter issue',
      );
      const prewriterActions = parseIssuedActions(prewriterIssue.issued_actions, 'Initial Source prewriter actions');
      expect(prewriterActions.length).toBeGreaterThan(0);
      expect(prewriterActions.every((action) => action.request.stage_id === 'review_source_prewrite')).toBe(true);
      stateVersion = requireStateVersion(prewriterIssue.state_version, 'prewriter state_version');
      for (const [index, action] of prewriterActions.entries()) {
        const work = continuationState(f).work;
        const journal = currentJournal(f);
        const kind =
          action.request.role === 'source-planner'
            ? 'source_plan'
            : action.request.role === 'security-prewriter'
              ? 'implementation_policy'
              : null;
        if (!kind) throw new Error('Initial Source prewriter role has no typed preparation kind');
        const evidenceRef = 'local://initial-source-prewriter/' + action.issue_id;
        const preparationObservations =
          kind === 'source_plan'
            ? [
                {
                  mechanic: 'scope_acceptance_trace',
                  actual: 'The admitted implementation paths and AC trace to the retained acceptance contract.',
                  evidence_ref: evidenceRef,
                },
                {
                  mechanic: 'verification_rollback',
                  actual: 'Focused verification and source restoration are identified for this scoped change.',
                  evidence_ref: evidenceRef,
                },
              ]
            : [
                {
                  mechanic: 'root_cause_owner',
                  actual: 'The source owner and root cause for this scoped change are identified.',
                  evidence_ref: evidenceRef,
                },
                {
                  mechanic: 'affected_callers',
                  actual: 'Affected callers within the accepted change are identified.',
                  evidence_ref: evidenceRef,
                },
                {
                  mechanic: 'existing_primitives',
                  actual: 'Existing Host and filesystem coordination primitives are retained.',
                  evidence_ref: evidenceRef,
                },
                {
                  mechanic: 'prewriter_security_gate',
                  actual: 'The exact scoped write and its pre-effect gates are preserved.',
                  evidence_ref: evidenceRef,
                },
              ];
        const preparation = lifecyclePreparationObservationSchema.parse({
          schema: 'LifecyclePreparationObservation/v1',
          record_id: kind + '-' + action.request.action_id,
          kind,
          work_id: work.binding.lifecycle_work_id,
          attempt: journal.state.attempt,
          source_revision: work.binding.work_source_revision,
          scope_id: work.binding.scope_id,
          config_digest: work.binding.config_digest,
          ac_ids: work.binding.ac_ids,
          observed_at: new Date().toISOString(),
          observer_id: 'fixture:initial-source-prewriter-' + index,
          status: 'pass',
          evidence_refs: [evidenceRef],
          observations: preparationObservations,
          gaps: [],
        });
        const summary = JSON.stringify(preparation);
        const observation = {
          schema: 'VidaSessionObservation/v1',
          action_id: action.request.action_id,
          issue_id: action.issue_id,
          agent_id: preparation.observer_id,
          tool_call_ref: 'fixture:initial-source-prewriter-call-' + action.issue_id,
          status: 'reported_complete',
          summary,
          output_digest: canonicalJsonDigest(summary),
          evidence_refs: preparation.evidence_refs,
        };
        const reportPath = path.join(
          f.root,
          '.agent',
          'work',
          f.identity.work_id,
          'initial-source-prewriter-' + index + '.json',
        );
        writeFileSync(reportPath, record(observation));
        const reported = requireRecord(
          await runAgent([...args, ...expectedRunVersion(stateVersion), '--report', reportPath]),
          'Initial Source prewriter report',
        );
        stateVersion = requireStateVersion(reported.state_version, 'prewriter report state_version');
      }

      // This case creates and admits its own fixture above; only its current unissued writer is observed.
      if (initialSourcePhases.enabled) {
        const pendingWriters = currentJournal(f).state.items.filter(
          (item) => item.request.stage_id === 'develop_task' && item.issue_id === null,
        );
        if (pendingWriters.length !== 1) throw new Error('Initial Source phase capture requires one fresh writer');
        const pendingWriter = firstValue(pendingWriters, 'fresh Initial Source writer');
        if (
          !initialSourcePhases.arm({
            repositoryRoot: f.root,
            workId: f.identity.work_id,
            actionId: pendingWriter.request.action_id,
            stageId: 'develop_task',
          })
        )
          throw new Error('Initial Source phase capture is not installed or its sink is unavailable');
      }
      let writerIssue: Record<string, unknown>;
      try {
        writerIssue = requireRecord(
          await runAgent([...args, ...expectedRunVersion(stateVersion), '--issue-wave', 'true']),
          'Initial Source writer issue',
        );
      } finally {
        initialSourcePhases.disarm();
      }
      const writerActions = parseIssuedActions(writerIssue.issued_actions, 'Initial Source writer actions');
      expect(writerActions).toHaveLength(1);
      const writer = firstValue(writerActions, 'Initial Source writer actions');
      expect(writer.request.stage_id).toBe('develop_task');
      const writerJournal = currentJournal(f);
      const pendingWriter = writerJournal.state.items.find(
        (item) => item.request.action_id === writer.request.action_id,
      );
      if (!pendingWriter?.host_reservation) throw new Error('Initial Source writer reservation is unavailable');
      expect(pendingWriter.issue_id).toBe(writer.issue_id);
      expect(pendingWriter.host_reservation.approvalAction).toBe('source.write');
      const writerAttemptId = requireString(
        pendingWriter.host_reservation.receipt.attempt.attempt_id,
        'Initial Source writer attempt id',
      );
      const writerStateVersion = requireStateVersion(writerIssue.state_version, 'writer issue state_version');
      const initialReceipt = hostStore(f).readInitialSourceContinuationReceipt(f.identity, 1);
      if (!initialReceipt) throw new Error('Initial Source writer receipt is unavailable');
      const beforeDrift = continuationState(f);
      // Keep the ordinary live-owner lease; this case does not use expired-owner recovery.
      const liveOwnerLease = workLease(beforeDrift.work);
      const startedAttempt = beforeDrift.work.execution.assignment_attempts.find(
        (attempt) => attempt.attempt_id === writerAttemptId,
      );
      expect(startedAttempt).toMatchObject({ status: 'started', result: null, result_digest: null });
      expect(pendingWriter.observation).toBeNull();

      const sourceBefore = writerJournal.state.source_scope;
      if (!sourceBefore) throw new Error('Initial Source writer Journal scope is unavailable');
      const changedPath = f.documents[0];
      writeFileSync(
        path.join(f.root, changedPath),
        readFileSync(path.join(f.root, changedPath), 'utf8') + 'authorized source-writer output\n',
      );
      const sourceAfter = snapshotDeclaredSources(requireSafeRepositoryAccess(f.root), f.documents);
      const changedPaths = compareScopedSourceSnapshots(sourceBefore, sourceAfter)
        .map((change) => change.path)
        .sort();
      expect(changedPaths).toEqual([changedPath]);

      await expectRejectedMessage(
        runAgent([...args, ...expectedRunVersion(writerStateVersion), '--issue-wave', 'true']),
        /Initial Source continuation does not match the current scoped Source snapshot/,
      );
      expect(continuationState(f)).toEqual(beforeDrift);

      const writerSummary = 'The authorized source writer updated one implementation path.';
      const writerObservation: SessionBridgeObservation = {
        schema: 'VidaSessionObservation/v1',
        action_id: writer.request.action_id,
        host_attempt_id: writerAttemptId,
        changed_paths: changedPaths,
        issue_id: writer.issue_id,
        agent_id: 'fixture:initial-source-writer',
        tool_call_ref: 'fixture:initial-source-writer-call',
        status: 'reported_complete',
        summary: writerSummary,
        output_digest: canonicalJsonDigest(writerSummary),
        evidence_refs: ['fixture://initial-source-writer'],
      };
      const writerReportPath = path.join(
        f.root,
        '.agent',
        'work',
        f.identity.work_id,
        'initial-source-writer-report.json',
      );
      const invalidReports = [
        { ...writerObservation, action_id: canonicalJsonDigest('foreign initial-source action') },
        { ...writerObservation, issue_id: randomUUID() },
        { ...writerObservation, host_attempt_id: canonicalJsonDigest('foreign initial-source attempt') },
        { ...writerObservation, changed_paths: [...changedPaths, 'docs/outside-scope.md'].sort() },
      ];
      for (const invalid of invalidReports) {
        writeFileSync(writerReportPath, record(invalid));
        await expectRejectedMessage(
          runAgent([...args, ...expectedRunVersion(writerStateVersion), '--report', writerReportPath]),
          /Initial Source continuation does not match the current scoped Source snapshot/,
        );
        expect(continuationState(f)).toEqual(beforeDrift);
      }

      writeFileSync(writerReportPath, record(writerObservation));
      const recoveryFixture = createCompletedSourceReportRecoveryFixture(
          {
            root: f.root,
            identity: f.identity,
            documents: f.documents,
            config: f.config,
            hostStore: hostStore(f),
            continuationState: () => continuationState(f),
            currentJournal: () => currentJournal(f),
          },
          writer,
          writerAttemptId,
          writerObservation,
          sourceBefore,
          sourceAfter,
          null,
          writerReportPath,
        ),
        beforeRecovery = continuationState(f),
        request = recoveryFixture.request,
        commit = (candidate = request, verifyCurrent = recoveryFixture.verifyCurrent) =>
          hostStore(f).commitCompletedSourceReportRecovery(candidate, verifyCurrent);
      expect(() => commit()).toThrow(/completed Source report recovery original Source ticket or claim differs/);
      expect(continuationState(f)).toEqual(beforeRecovery);
      holdExpiredOwnerClockForFixture(f);

      const retainedReportBytes = readFileSync(writerReportPath);
      try {
        writeFileSync(writerReportPath, record({ ...writerObservation, summary: 'altered report body' }));
        expect(() => {
          commit();
        }).toThrow();
      } finally {
        writeFileSync(writerReportPath, retainedReportBytes);
      }
      expect(continuationState(f)).toEqual(beforeRecovery);

      const sourceFile = path.join(f.root, changedPath);
      const evolvedSourceBytes = readFileSync(sourceFile);
      try {
        writeFileSync(sourceFile, evolvedSourceBytes.toString('utf8') + 'tampered before report\n');
        expect(() => {
          commit();
        }).toThrow();
      } finally {
        writeFileSync(sourceFile, evolvedSourceBytes);
      }
      expect(continuationState(f)).toEqual(beforeRecovery);

      const alteredProof: CompletedSourceReportRecoveryVerifyCurrent = (candidate, state) => ({
        ...recoveryFixture.verifyCurrent(candidate, state),
        nativeSelfAttestationDigest: canonicalJsonDigest('altered fixture proof'),
      });
      expect(() => {
        commit(request, alteredProof);
      }).toThrow();
      expect(continuationState(f)).toEqual(beforeRecovery);
      const recovery = validateCompletedSourceReportRecoveryReceipt(commit());
      expect(recovery.status).toBe('completed_report_recovered');
      expect(recovery.source_write_rights).toBe(false);
      expect(recovery.runtime_acceptance).toBe(false);
      expect(recovery.record.prior_work).toEqual(beforeRecovery.work);
      expect(recovery.record.prior_work_version).toEqual(beforeRecovery.workVersion);
      expect(recovery.record.prior_ledger_version).toEqual(beforeRecovery.ledgerVersion);
      expect(recovery.record.prior_journal).toEqual(beforeRecovery.journal);
      expect(recovery.record.prior_journal_version).toEqual(beforeRecovery.journalVersion);
      expect(recovery.record.original_reservation).toEqual(pendingWriter.host_reservation);
      const originalTicketId = pendingWriter.host_reservation?.receipt.attempt.lease.ticket_id;
      if (!originalTicketId) throw new Error('Initial Source original reservation ticket is unavailable');
      const originalTicket = beforeRecovery.ledger.tickets.find((ticket) => ticket.ticket_id === originalTicketId);
      if (!originalTicket) throw new Error('Initial Source original reservation ticket is not retained');
      expect(recovery.record.original_source_ticket).toEqual(originalTicket);
      expect(recovery.record.completed_attempt).toMatchObject({
        attempt_id: writerAttemptId,
        status: 'completed',
        result: writerObservation,
        result_digest: canonicalJsonDigest(writerObservation),
      });

      const afterRecovery = continuationState(f),
        completedReport = [
          ...afterRecovery.journal.completed.flatMap((wave) => wave.items),
          ...afterRecovery.journal.items,
        ].find((item) => item.request.action_id === writer.request.action_id);
      expect(afterRecovery.journal.source_scope?.digest).toBe(sourceAfter.digest);
      expect(completedReport?.observation).toEqual(writerObservation);
      expect(afterRecovery.work.binding.work_source_revision).toBe(sourceBefore.digest);
      expect(afterRecovery.work.binding.runtime_code_digest).toBe(request.currentRuntimeCodeDigest);
      expect(afterRecovery.work.lifecycle.scope).toEqual(beforeRecovery.work.lifecycle.scope);
      const completedAttempt = afterRecovery.work.execution.assignment_attempts.find(
        (attempt) => attempt.attempt_id === writerAttemptId,
      );
      expect(completedAttempt).toMatchObject({
        status: 'completed',
        result: writerObservation,
        result_digest: canonicalJsonDigest(writerObservation),
      });
      const executionLease = workLease(afterRecovery.work);
      expect(executionLease.thread_id).toBe(liveOwnerLease.thread_id);
      expect(executionLease.ticket_id).not.toBe(liveOwnerLease.ticket_id);
      const executionClaim = afterRecovery.ledger.claims.find(
        (claim) => claim.ticket_id === executionLease.ticket_id && claim.status === 'active',
      );
      expect(executionClaim?.resources).toEqual(['execution:' + f.identity.work_id]);
      expect(recovery.record.execution_ticket.thread_id).toBe(liveOwnerLease.thread_id);
      expect(recovery.record.execution_ticket.exclusive_resources).toEqual(['execution:' + f.identity.work_id]);
      expect(recovery.record.execution_claim.thread_id).toBe(liveOwnerLease.thread_id);
      expect(recovery.record.execution_claim.resources).toEqual(['execution:' + f.identity.work_id]);
      expect(afterRecovery.ledger.tickets.find((ticket) => ticket.ticket_id === liveOwnerLease.ticket_id)?.status).toBe(
        'released',
      );
      expect(
        afterRecovery.ledger.claims.some(
          (claim) => claim.status === 'active' && claim.resources.some((resource) => resource.startsWith('file:')),
        ),
      ).toBe(false);
      expect(hostStore(f).readInitialSourceContinuationReceipt(f.identity, 1)).toEqual(initialReceipt);
      expect(
        hostStore(f).readInitialSourceFrontierCodeRebindReceipt(f.identity, 1, initialReceipt.continuation_id),
      ).toBeNull();
      expect(hostStore(f).readCompletedSourceReportRecoveryReceipt(f.identity, 1)).toEqual(recovery);
      expectHistorySnapshotAfterOwner(hostStore(f), afterRecovery.work);

      // Exact retry models a lost acknowledgement; it returns the same immutable receipt once.
      expect(commit()).toEqual(recovery);
      expect(continuationState(f)).toEqual(afterRecovery);

      for (const altered of [
        { ...request, expectedJournal: { ...request.expectedJournal, revision: request.expectedJournal.revision + 1 } },
        { ...request, nativeSessionHandle: 'fixture:foreign-controller' },
        { ...request, reportDigest: canonicalJsonDigest('altered report identity') },
        { ...request, currentRuntimeCodeDigest: canonicalJsonDigest('altered current code') },
      ]) {
        expect(() => commit(altered)).toThrow();
        expect(continuationState(f)).toEqual(afterRecovery);
      }

      // These injected endpoint proofs exercise Host consistency only, not native qualification.

      const codeFixtureRequest = (nextCode: string, label: string) => {
        const current = continuationState(f),
          previous = hostStore(f).readQualifiedRuntimeCodeContinuations(f.identity, 1).at(-1)?.request;
        return validateQualifiedRuntimeCodeContinuationRequest({
          schema: 'QualifiedRuntimeCodeContinuationRequest/v1',
          identity: f.identity,
          attempt: 1,
          nativeSessionHandle: executionLease.thread_id,
          leaseGeneration: executionLease.generation,
          expectedWork: current.workVersion,
          expectedLedger: current.ledgerVersion,
          expectedJournal: current.journalVersion,
          expectedMaintenanceGeneration: hostStore(f).readHostStateSnapshot(f.identity).maintenanceGeneration,
          originalSourceScopeDigest: sourceBefore.digest,
          journalSourceScopeDigest: sourceAfter.digest,
          oldRuntimeCodeDigest: current.work.binding.runtime_code_digest,
          currentRuntimeCodeDigest: nextCode,
          oldRuntimeCodePaths: request.currentRuntimeCodePaths,
          currentRuntimeCodePaths: request.currentRuntimeCodePaths,
          oldManifestRef:
            previous?.currentManifestRef ??
            (request.currentManifestRef.includes(':')
              ? '.tmp/fixture/recovered-code-manifest.json'
              : request.currentManifestRef),
          oldManifestDigest: previous?.currentManifestDigest ?? request.currentManifestDigest,
          oldInstallRef:
            previous?.currentInstallRef ??
            (request.currentInstallRef.includes(':')
              ? '.tmp/fixture/recovered-code-install.json'
              : request.currentInstallRef),
          currentManifestRef: '.tmp/fixture/' + label + '-manifest.json',
          currentManifestDigest: canonicalJsonDigest(label + '-manifest'),
          currentInstallRef: '.tmp/fixture/' + label + '-install.json',
          systemUpdateRef: '.tmp/fixture/' + label + '-install.json',
          systemUpdateOperationId: 'fixture-' + label,
          nativeSelfAttestationDigest: canonicalJsonDigest('fixture-' + label),
        });
      };

      const codeFixtureProof = qualifiedRuntimeCodeEndpointFixture;
      const beforeCodeAdoption = continuationState(f),
        codeRequest = codeFixtureRequest(canonicalJsonDigest('fixture-next-code'), 'next-code');
      if (refreshOnly !== 'none') {
        holdExpiredOwnerClockForFixture(f);
        const expiredTicket = beforeCodeAdoption.ledger.tickets.find(
          (ticket) => ticket.ticket_id === executionLease.ticket_id,
        );
        expect(Date.parse(expiredTicket?.expires_at ?? '')).toBeLessThan(Date.now());
        // Exercise the production publication handler with real isolated Host state.
        // Fixture endpoint callbacks remain Static proof, never native qualification.
        const planAccess = requireSafeRepositoryAccess(f.root),
          planDirectory = '.agent/work/fixture-prepared-code',
          planPath = planDirectory + '/qualified-runtime-code-continuation-plan.v1.json',
          oldPlanBytes = Buffer.from(JSON.stringify(codeRequest, null, '\t') + '\n'),
          priorRequestId = canonicalJsonDigest(codeRequest),
          historyPath = planDirectory + '/qualified-code-plan-history/' + priorRequestId + '.json',
          newTarget = validateQualifiedRuntimeCodePreparedPlanRefresh(codeRequest, {
            ...codeRequest,
            currentRuntimeCodeDigest: canonicalJsonDigest('fixture-refreshed-code'),
            currentManifestRef: '.tmp/fixture/refreshed-manifest.json',
            currentManifestDigest: canonicalJsonDigest('fixture-refreshed-manifest'),
            currentInstallRef: '.tmp/fixture/refreshed-install.json',
            systemUpdateRef: '.tmp/fixture/refreshed-install.json',
            systemUpdateOperationId: 'fixture-refreshed-install',
            nativeSelfAttestationDigest: canonicalJsonDigest('fixture-refreshed-native'),
          });
        planAccess.ensureDirectory(planDirectory, 'fixture plan');
        planAccess.writeExclusive(planPath, oldPlanBytes.toString('utf8'), 'fixture original plan');
        const sourceBeforeRefresh = snapshotDeclaredSources(planAccess, f.documents);
        const verifyRefreshSource = () => {
          expect(snapshotDeclaredSources(planAccess, f.documents)).toEqual(sourceBeforeRefresh);
        };
        const refreshInput = {
          access: planAccess,
          store: hostStore(f),
          relative: planPath,
          request: newTarget,
          expectedRequestId: priorRequestId,
          verifyCurrent: verifyRefreshSource,
        };
        if (refreshOnly === 'crash-before' || refreshOnly === 'crash-after') {
          const childFile = path.join(f.root, '.tmp/refresh-publication-child.mjs');
          mkdirSync(path.dirname(childFile), { recursive: true });
          for (const phase of [refreshOnly === 'crash-before' ? 'before-replacement' : 'after-replacement']) {
            writeFileSync(path.join(f.root, planPath), oldPlanBytes);
            const childCode = `
            import { Database } from 'bun:sqlite';
            import {HostStateStore} from ${JSON.stringify(new URL('../src/host-state.ts', import.meta.url).href)};
            import {deriveWorkspaceId} from ${JSON.stringify(new URL('../src/workspace-identity.ts', import.meta.url).href)};
            import {requireSafeRepositoryAccess} from ${JSON.stringify(new URL('../src/config/safe-repository-access.ts', import.meta.url).href)};
            import {refreshQualifiedRuntimeCodePreparedPlan} from ${JSON.stringify(new URL('../src/orchestration/qualified-runtime-code-continuation.ts', import.meta.url).href)};
            const root=${JSON.stringify(f.root)}, request=${JSON.stringify(newTarget)};
            const database=new Database(${JSON.stringify(path.join(f.root, f.config.control.work_root, 'session-handoff.v1.sqlite'))});
            const store=new HostStateStore(database, deriveWorkspaceId(request.identity.repository_id,root),undefined,undefined,undefined,undefined,root);
            const real=requireSafeRepositoryAccess(root);
            const access={...real,replaceAtomicAsync:async(...args)=>{
              if(${JSON.stringify(phase)}==='after-replacement') await real.replaceAtomicAsync(...args);
              process.exit(${phase === 'before-replacement' ? 31 : 32});
            }};
            await refreshQualifiedRuntimeCodePreparedPlan({access,store,relative:${JSON.stringify(planPath)},
              request,expectedRequestId:${JSON.stringify(priorRequestId)},verifyCurrent:()=>{}});
            throw Error('Crash injection was not reached');
          `;
            writeFileSync(childFile, childCode);
            const child = await runBoundedSubprocess(process.execPath, [childFile], {
              cwd: f.root,
              env: pinnedEnvironment(process.execPath, process.env, bundle),
              timeoutMs: 10_000,
            });
            expect(child.timedOut).toBe(false);
            expect(child.signal).toBeNull();
            expect(child.exitCode, Buffer.from(child.stderr).toString()).toBe(phase === 'before-replacement' ? 31 : 32);
            expect(child.stderrTruncated || child.stdoutTruncated).toBe(false);
            expect(planAccess.readBytes(historyPath, 'terminated child history')).toEqual(oldPlanBytes);
            const expectedBytes =
              phase === 'before-replacement' ? oldPlanBytes : Buffer.from(JSON.stringify(newTarget, null, 2) + '\n');
            expect(planAccess.readBytes(planPath, 'terminated child plan')).toEqual(expectedBytes);
            expect(continuationState(f)).toEqual(beforeCodeAdoption);
            await refreshQualifiedRuntimeCodePreparedPlan(refreshInput);
            expect(planAccess.readBytes(planPath, 'interrupted exact retry')).toEqual(
              Buffer.from(JSON.stringify(newTarget, null, 2) + '\n'),
            );
            expect(planAccess.readBytes(historyPath, 'retained interrupted history')).toEqual(oldPlanBytes);
            expect(continuationState(f)).toEqual(beforeCodeAdoption);
            expect(snapshotDeclaredSources(planAccess, f.documents)).toEqual(sourceBeforeRefresh);
          }
          return;
        }
        await expectRejection(
          refreshQualifiedRuntimeCodePreparedPlan({ ...refreshInput, expectedRequestId: 'invalid' }),
          /expected prior request ID/,
        );
        await expectRejection(
          refreshQualifiedRuntimeCodePreparedPlan({
            ...refreshInput,
            expectedRequestId: canonicalJsonDigest('fixture-unrelated-request'),
          }),
          /neither exact old nor new request/,
        );
        await expectRejection(
          refreshQualifiedRuntimeCodePreparedPlan({
            ...refreshInput,
            request: { ...newTarget, nativeSessionHandle: 'foreign-owner' },
          }),
          /changed original/,
        );
        expect(planAccess.fileExists(historyPath, 'no history on denial')).toBe(false);
        expect(planAccess.readBytes(planPath, 'unchanged denied plan')).toEqual(oldPlanBytes);
        expect(continuationState(f)).toEqual(beforeCodeAdoption);

        // Both ordinary publication faults retain the exact prior history.
        for (const phase of ['before-replacement', 'after-replacement']) {
          let publicationEntered = false;
          const faultAccess = {
            ...planAccess,
            replaceAtomicAsync: async (target: string, expected: string, contents: string, label: string) => {
              if (label === 'prepared code plan target refresh') {
                publicationEntered = true;
                expect(planAccess.readBytes(historyPath, 'history before replace')).toEqual(oldPlanBytes);
                if (phase === 'after-replacement')
                  await planAccess.replaceAtomicAsync(target, expected, contents, label);
                throw new Error('fixture publication ' + phase);
              }
              return planAccess.replaceAtomicAsync(target, expected, contents, label);
            },
          };
          await expectRejection(
            refreshQualifiedRuntimeCodePreparedPlan({ ...refreshInput, access: faultAccess }),
            'fixture publication ' + phase,
          );
          expect(publicationEntered).toBe(true);
          expect(planAccess.readBytes(planPath, 'fault plan restoration')).toEqual(oldPlanBytes);
          expect(planAccess.readBytes(historyPath, 'exact fault history')).toEqual(oldPlanBytes);
          expect(continuationState(f)).toEqual(beforeCodeAdoption);
        }

        // A drifted target belongs to the external writer; rollback must preserve it.
        const foreignPlanBytes = Buffer.from('foreign fixture writer\n');
        const driftAccess = {
          ...planAccess,
          replaceAtomicAsync: async (target: string, expected: string, contents: string, label: string) => {
            await planAccess.replaceAtomicAsync(target, expected, contents, label);
            if (label === 'prepared code plan target refresh') {
              writeFileSync(path.join(f.root, planPath), foreignPlanBytes);
              throw new Error('fixture external publication drift');
            }
          },
        };
        await expectRejection(
          refreshQualifiedRuntimeCodePreparedPlan({ ...refreshInput, access: driftAccess }),
          /rollback failed/,
        );
        expect(planAccess.readBytes(planPath, 'foreign target preservation')).toEqual(foreignPlanBytes);
        expect(planAccess.readBytes(historyPath, 'history after drift')).toEqual(oldPlanBytes);
        expect(continuationState(f)).toEqual(beforeCodeAdoption);
        writeFileSync(path.join(f.root, planPath), oldPlanBytes);

        // The injected Source verifier must reject drift and restore only our plan.
        const sourcePath = path.join(f.root, firstValue(f.documents, 'fixture Source path')),
          retainedSourceBytes = readFileSync(sourcePath),
          foreignSourceBytes = Buffer.from('external fixture Source drift\n');
        const verificationFailure = new Error('fixture Source verification drift'),
          verifySourceDrift = () => {
            if (snapshotDeclaredSources(planAccess, f.documents).digest !== sourceBeforeRefresh.digest) {
              throw verificationFailure;
            }
          },
          sourceDriftAccess = {
            ...planAccess,
            replaceAtomicAsync: async (...replacement: Parameters<SafeRepositoryAccess['replaceAtomicAsync']>) => {
              await planAccess.replaceAtomicAsync(...replacement);
              if (replacement[3] === 'prepared code plan target refresh') writeFileSync(sourcePath, foreignSourceBytes);
            },
          };
        try {
          const reason = await rejectionReason(
            refreshQualifiedRuntimeCodePreparedPlan({
              ...refreshInput,
              access: sourceDriftAccess,
              verifyCurrent: verifySourceDrift,
            }),
          );
          expect(reason).toBe(verificationFailure);
          expect(planAccess.readBytes(planPath, 'post-publication validation rollback')).toEqual(oldPlanBytes);
          expect(readFileSync(sourcePath)).toEqual(foreignSourceBytes);
          expect(continuationState(f)).toEqual(beforeCodeAdoption);
        } finally {
          writeFileSync(sourcePath, retainedSourceBytes);
        }

        writeFileSync(path.join(f.root, historyPath), Buffer.from('foreign history\n'));
        await expectRejection(refreshQualifiedRuntimeCodePreparedPlan(refreshInput), /history differs/);
        expect(planAccess.readBytes(planPath, 'history denial plan')).toEqual(oldPlanBytes);
        expect(continuationState(f)).toEqual(beforeCodeAdoption);
        writeFileSync(path.join(f.root, historyPath), oldPlanBytes);

        // The actual SQLite writer fence excludes another connection through awaits.
        const peerDatabase = new Database(path.join(f.root, f.config.control.work_root, 'session-handoff.v1.sqlite'));
        peerDatabase.exec('PRAGMA busy_timeout=0');
        try {
          const fencedAccess = {
            ...planAccess,
            replaceAtomicAsync: async (...replacement: Parameters<SafeRepositoryAccess['replaceAtomicAsync']>) => {
              expect(() => peerDatabase.exec('BEGIN IMMEDIATE')).toThrow(/locked|busy/i);
              await expectRejection(
                hostStore(f).withQualifiedRuntimeCodePlanRefresh(
                  codeRequest,
                  () => {
                    throw new Error('nested refresh callback must not enter');
                  },
                  async () => {},
                ),
                /already active/,
              );
              await Promise.resolve();
              expect(() => peerDatabase.exec('BEGIN IMMEDIATE')).toThrow(/locked|busy/i);
              return planAccess.replaceAtomicAsync(...replacement);
            },
          };
          await refreshQualifiedRuntimeCodePreparedPlan({ ...refreshInput, access: fencedAccess });
          peerDatabase.exec('BEGIN IMMEDIATE');
          peerDatabase.exec('ROLLBACK');
        } finally {
          peerDatabase.close(true);
        }
        const newPlanBytes = Buffer.from(JSON.stringify(newTarget, null, 2) + '\n');
        expect(planAccess.readBytes(planPath, 'published refreshed plan')).toEqual(newPlanBytes);
        expect(planAccess.readBytes(historyPath, 'byte exact prepared history')).toEqual(oldPlanBytes);
        expect(continuationState(f)).toEqual(beforeCodeAdoption);
        expect(snapshotDeclaredSources(planAccess, f.documents)).toEqual(sourceBeforeRefresh);
        // A lost acknowledgement must revalidate Source and Host under the same guard.
        await expectRejection(
          refreshQualifiedRuntimeCodePreparedPlan({
            ...refreshInput,
            verifyCurrent: () => {
              throw new Error('fixture Source drift on retry');
            },
          }),
          /Source drift on retry/,
        );
        await refreshQualifiedRuntimeCodePreparedPlan(refreshInput);
        expect(planAccess.readBytes(planPath, 'exact retry')).toEqual(newPlanBytes);
        expect(continuationState(f)).toEqual(beforeCodeAdoption);

        // Both public modes contend on the same existing owner before native checks.
        await planAccess.withExclusiveLockAsync(
          planDirectory + '/.qualified-code-plan-owner',
          'fixture owner',
          async () => {
            for (const mode of ['apply', 'refresh']) {
              await expectRejection(
                runQualifiedRuntimeCodeContinuation({
                  '--project-root': f.root,
                  '--repair-id': 'fixture-prepared-code',
                  '--mode': mode,
                }),
                /lock/i,
              );
              expect(continuationState(f)).toEqual(beforeCodeAdoption);
              expect(planAccess.readBytes(planPath, 'blocked public mode')).toEqual(newPlanBytes);
            }
          },
        );
        hostStore(f).commitQualifiedRuntimeCodeContinuation(codeRequest, codeFixtureProof);
        const adoptedRefreshState = continuationState(f);
        await expectRejection(refreshQualifiedRuntimeCodePreparedPlan(refreshInput), 'state compare-and-swap conflict');
        expect(continuationState(f)).toEqual(adoptedRefreshState);
        expect(planAccess.readBytes(planPath, 'adopted successor denial')).toEqual(newPlanBytes);
        return;
      }

      const adopt = (
        candidate: import('../src/orchestration/qualified-runtime-code-continuation.ts').QualifiedRuntimeCodeContinuationRequest,
      ) => hostStore(f).commitQualifiedRuntimeCodeContinuation(candidate, codeFixtureProof);
      for (const alteration of [
        {
          ...codeRequest,
          expectedWork: { ...codeRequest.expectedWork, revision: codeRequest.expectedWork.revision + 1 },
        },
        {
          ...codeRequest,
          expectedLedger: { ...codeRequest.expectedLedger, revision: codeRequest.expectedLedger.revision + 1 },
        },
        {
          ...codeRequest,
          expectedJournal: { ...codeRequest.expectedJournal, revision: codeRequest.expectedJournal.revision + 1 },
        },
        { ...codeRequest, expectedMaintenanceGeneration: codeRequest.expectedMaintenanceGeneration + 1 },
        { ...codeRequest, nativeSessionHandle: 'fixture:foreign-owner' },
        { ...codeRequest, originalSourceScopeDigest: sourceAfter.digest },
      ]) {
        expect(() => adopt(alteration)).toThrow();
        expect(continuationState(f)).toEqual(beforeCodeAdoption);
      }
      expect(() =>
        hostStore(f).commitQualifiedRuntimeCodeContinuation(codeRequest, () => {
          throw new Error('fixture endpoint interruption');
        }),
      ).toThrow(/fixture endpoint interruption/);
      expect(continuationState(f)).toEqual(beforeCodeAdoption);
      const firstCodeReceipt = adopt(codeRequest),
        afterCodeAdoption = continuationState(f);
      expect(firstCodeReceipt.rights_granted).toBe(false);
      expect(firstCodeReceipt.runtime_acceptance).toBe(false);
      expect(afterCodeAdoption.journal).toEqual(beforeCodeAdoption.journal);
      expect(afterCodeAdoption.ledger).toEqual(beforeCodeAdoption.ledger);
      expect(afterCodeAdoption.work.lease).toEqual(beforeCodeAdoption.work.lease);
      expect(afterCodeAdoption.work.execution.assignment_attempts).toEqual(
        beforeCodeAdoption.work.execution.assignment_attempts,
      );
      expect(adopt(codeRequest)).toEqual(firstCodeReceipt);
      expect(continuationState(f)).toEqual(afterCodeAdoption);
      const historyDatabase = new Database(path.join(f.root, f.config.control.work_root, 'session-handoff.v1.sqlite'));
      try {
        historyDatabase
          .query(
            'UPDATE agent_host_qualified_runtime_code_continuation SET work_revision=work_revision+100 WHERE request_id=?',
          )
          .run(firstCodeReceipt.request_digest);
        expect(() => hostStore(f).readQualifiedRuntimeCodeContinuations(f.identity, 1)).toThrow(
          /qualified runtime code history key differs/,
        );
      } finally {
        historyDatabase
          .query('UPDATE agent_host_qualified_runtime_code_continuation SET work_revision=? WHERE request_id=?')
          .run(firstCodeReceipt.work_version.revision, firstCodeReceipt.request_digest);
        historyDatabase.close(true);
      }
      const firstCodeHost = hostStore(f).readHostStateSnapshot(f.identity);
      expect(
        validateCompletedSourceReportRecoveryCurrentWorkJoin(
          firstCodeHost,
          currentJournal(f),
          initialReceipt,
          null,
          recovery,
        ),
      ).toEqual(recovery);
      expect(
        readInitialSourceContinuationSessionEngineSnapshot(
          {
            repositoryRoot: f.root,
            config: f.config,
            selection: admittedInput(f).selection,
            context: { ...admittedInput(f).context, scope_digest: sourceBefore.digest },
            workflowId: 'task_execution',
            runId: workRunId(afterCodeAdoption.work),
          },
          initialReceipt,
          currentJournal(f),
          firstCodeHost,
          null,
          recovery,
        ).status,
      ).toBe('suspended');
      const retainedRuntime = codeFixtureRequest(request.currentRuntimeCodeDigest, 'restored-source-code');
      adopt(retainedRuntime);
      const adoptedState = continuationState(f);
      expect(hostStore(f).readQualifiedRuntimeCodeContinuations(f.identity, 1)).toHaveLength(2);
      const codeHistory = hostStore(f).readQualifiedRuntimeCodeContinuations(f.identity, 1);
      expect(projectQualifiedRuntimeCodeAncestor(adoptedState.work, codeHistory).binding.runtime_code_digest).toBe(
        codeRequest.oldRuntimeCodeDigest,
      );
      expect(
        projectQualifiedRuntimeCodeAncestor(adoptedState.work, codeHistory, firstCodeReceipt.work_version.revision)
          .binding.runtime_code_digest,
      ).toBe(codeRequest.currentRuntimeCodeDigest);
      expect(
        projectQualifiedRuntimeCodeAncestor(adoptedState.work, codeHistory, adoptedState.workVersion.revision).binding
          .runtime_code_digest,
      ).toBe(retainedRuntime.currentRuntimeCodeDigest);
      for (const anchor of [0, -1, 1.5, adoptedState.workVersion.revision + 1])
        expect(() => projectQualifiedRuntimeCodeAncestor(adoptedState.work, codeHistory, anchor)).toThrow();
      expect(adoptedState.journal).toEqual(beforeCodeAdoption.journal);
      expect(adoptedState.ledger).toEqual(beforeCodeAdoption.ledger);
      expect(hostStore(f).readCompletedSourceReportRecoveryReceipt(f.identity, 1)).toEqual(recovery);
      const beforeExpiredRecovery = continuationState(f);
      holdExpiredOwnerClockForFixture(f);
      const expiredRecoveryArgs = [
        ...args,
        '--recover-expired-lease',
        'true',
        '--rebind-current-bundle',
        'true',
        '--native-session-handle',
        executionLease.thread_id,
        '--lease-generation',
        String(executionLease.generation),
        ...expectedRunVersion(beforeExpiredRecovery.journalVersion),
      ];
      let expiredRecoveryValue: unknown;
      if (refreshOnly === 'none') {
        const nativeAccess = runtimePackageAccess();
        const originalReadBytes = nativeAccess.readBytes;
        const originalVerifiedRead = nativeAccess.readVerifiedCaptureBytes;
        if (!originalVerifiedRead)
          throw new Error('Expired recovery caller requires the native verified package-byte reader');
        let rawSchemaReads = 0;
        const verifiedSchemaReads: Buffer[] = [];
        const accessSpy = spyOn(runtimeConfig, 'runtimePackageAccess').mockImplementation(() => ({
          ...nativeAccess,
          readBytes(target: string, label: string): Buffer {
            if (target === 'schemas/agent-runtime-config.v1.schema.json' && label === 'expired lease recovery schema')
              rawSchemaReads += 1;
            return originalReadBytes.call(nativeAccess, target, label);
          },
          readVerifiedCaptureBytes(target: string, label: string, maxBytes?: number): Buffer {
            const bytes = originalVerifiedRead.call(nativeAccess, target, label, maxBytes);
            if (target === 'schemas/agent-runtime-config.v1.schema.json' && label === 'expired lease recovery schema')
              verifiedSchemaReads.push(Buffer.from(bytes));
            return bytes;
          },
        }));
        try {
          expiredRecoveryValue = await runAgent(expiredRecoveryArgs);
        } finally {
          accessSpy.mockRestore();
        }
        expect(verifiedSchemaReads).toHaveLength(1);
        const verifiedSchemaBytes = verifiedSchemaReads[0];
        if (!verifiedSchemaBytes) throw new Error('Expired recovery schema bytes were not observed');
        expect(sha256(verifiedSchemaBytes)).toBe(beforeExpiredRecovery.work.binding.schema_digest);
        expect(rawSchemaReads).toBe(0);
        expect(snapshotDeclaredSources(requireSafeRepositoryAccess(f.root), f.documents)).toEqual(sourceAfter);
      } else {
        expiredRecoveryValue = await runAgent(expiredRecoveryArgs);
      }
      const expiredRecoveryResult = requireRecord(
        expiredRecoveryValue,
        'same-attempt expired execution-lease recovery',
      );
      expect(expiredRecoveryResult.status).toBe('inspected');
      expect(expiredRecoveryResult.attempt).toBe(1);
      const inspectedLease = requireRecord(expiredRecoveryResult.lease, 'recovered execution-only lease');
      let afterExpiredRecovery = continuationState(f),
        currentHost = completeHostState(hostStore(f).readHostStateSnapshot(f.identity)),
        currentRecovery = hostStore(f).readCompletedSourceReportRecoveryReceipt(f.identity, 1),
        currentLease = workLease(afterExpiredRecovery.work),
        currentTicket = afterExpiredRecovery.ledger.tickets.find(
          (ticket) => ticket.ticket_id === currentLease.ticket_id,
        ),
        currentClaim = afterExpiredRecovery.ledger.claims.find(
          (claim) => claim.ticket_id === currentLease.ticket_id && claim.status === 'active',
        ),
        leaseRebind = afterExpiredRecovery.ledger.rebinds.find(
          (entry) =>
            entry.work_id === f.identity.work_id &&
            Number(entry.to_ledger_revision) > recovery.record.successor_ledger_version.revision,
        );
      if (!currentRecovery || !leaseRebind || !currentTicket || !currentClaim)
        throw new Error('Expired recovery receipt or current execution lease chain is unavailable');
      expect(currentRecovery).toEqual(recovery);
      expect(expiredRecoveryResult.journal_version).toEqual(afterExpiredRecovery.journalVersion);
      expect(inspectedLease).toMatchObject({
        ticket_id: currentLease.ticket_id,
        thread_id: executionLease.thread_id,
        generation: currentLease.generation,
        expired: false,
      });
      expect(afterExpiredRecovery.journalVersion).toEqual({
        revision: beforeExpiredRecovery.journalVersion.revision + 1,
        digest: beforeExpiredRecovery.journalVersion.digest,
      });
      expect(afterExpiredRecovery.journal).toEqual(beforeExpiredRecovery.journal);
      expect({
        attempt: afterExpiredRecovery.journal.attempt,
        evolved: afterExpiredRecovery.journal.source_scope?.digest,
        workSource: afterExpiredRecovery.work.binding.work_source_revision,
      }).toEqual({
        attempt: 1,
        evolved: sourceAfter.digest,
        workSource: sourceBefore.digest,
      });
      expect(currentLease.ticket_id).not.toBe(executionLease.ticket_id);
      expect({ currentTicket, currentClaim, leaseRebind }).toMatchObject({
        currentTicket: {
          status: 'active',
          thread_id: executionLease.thread_id,
          exclusive_resources: ['execution:' + f.identity.work_id],
          active_resources: ['execution:' + f.identity.work_id],
        },
        currentClaim: { status: 'active', resources: ['execution:' + f.identity.work_id] },
        leaseRebind: {
          previous_ticket_id: executionLease.ticket_id,
          ticket_id: currentLease.ticket_id,
          thread_id: executionLease.thread_id,
          decided_by: executionLease.thread_id,
          resources: ['execution:' + f.identity.work_id],
          claimed_resources: ['execution:' + f.identity.work_id],
        },
      });
      expect({
        ticket: afterExpiredRecovery.ledger.tickets.find((ticket) => ticket.ticket_id === executionLease.ticket_id)
          ?.status,
        claim: afterExpiredRecovery.ledger.claims.find((claim) => claim.ticket_id === executionLease.ticket_id)?.status,
      }).toEqual({ ticket: 'read_only', claim: 'recovered' });
      const resumedFollowup = requireRecord(await runAgent(args), 'recovered Source report engine resume');
      expect(resumedFollowup.mastra_run_id).toBe(beforeExpiredRecovery.journal.run_id);
      expect(parseIssuedActions(resumedFollowup.issued_actions, 'resume issued actions')).toHaveLength(0);
      afterExpiredRecovery = continuationState(f);
      expect(afterExpiredRecovery.journal.items.every((item) => item.issue_id === null && !item.host_reservation)).toBe(
        true,
      );
      for (const transition of [2, 3]) {
        const prior = continuationState(f);
        const priorLease = workLease(prior.work);
        holdExpiredOwnerClockForFixture(f);
        const approval = prior.work.lifecycle.references.find(
          (reference) => reference.kind === 'execution_approval' && reference.decision === 'approved',
        );
        if (!approval) throw new Error('Repeated recovery fixture approval is unavailable');
        // The first public recovery covers CLI ingress; these real Host transitions
        // exercise repeated persisted lineage without repeating subprocess setup.
        const recovered = hostStore(f).recoverExpiredLocalLease({
          identity: f.identity,
          attempt: 1,
          nativeSessionHandle: priorLease.thread_id,
          generation: priorLease.generation,
          expectedWork: prior.workVersion,
          expectedLedger: prior.ledgerVersion,
          expectedJournal: prior.journalVersion,
          expectedMaintenanceGeneration: prior.maintenanceGeneration,
          verifyCurrent: () => ({
            runtimeCodeDigest: prior.work.binding.runtime_code_digest,
            authorityPointer: approval.record_id,
          }),
        });
        expect(recovered.workVersion?.revision).toBe(prior.workVersion.revision + 1);
        expect(
          continuationState(f).ledger.rebinds.filter(
            (entry) =>
              entry.work_id === f.identity.work_id &&
              Number(entry.to_ledger_revision) > recovery.record.successor_ledger_version.revision,
          ),
        ).toHaveLength(transition);
        expect(
          validateCompletedSourceReportRecoveryCurrentWorkJoin(
            completeHostState(hostStore(f).readHostStateSnapshot(f.identity)),
            currentJournal(f),
            initialReceipt,
            null,
            recovery,
          ),
        ).toEqual(recovery);
      }
      afterExpiredRecovery = continuationState(f);
      currentHost = completeHostState(hostStore(f).readHostStateSnapshot(f.identity));
      currentLease = workLease(afterExpiredRecovery.work);
      const verifiers: readonly (() => unknown)[] = [
        () => Promise.resolve(),
        () => Promise.reject(new Error('fixture asynchronous verifier denial')),
        () => true,
      ];
      for (const verifier of verifiers) {
        const malformedInput = {
          identity: f.identity,
          attempt: 1,
          nativeSessionHandle: currentLease.thread_id,
          generation: currentLease.generation,
          expectedWork: afterExpiredRecovery.workVersion,
          expectedLedger: afterExpiredRecovery.ledgerVersion,
          expectedJournal: afterExpiredRecovery.journalVersion,
          expectedMaintenanceGeneration: afterExpiredRecovery.maintenanceGeneration,
          verifyCurrent: () => {},
        };
        Reflect.set(malformedInput, 'verifyCurrent', verifier);
        expect(() => hostStore(f).renewActiveLocalLease(malformedInput)).toThrow(/synchronously/);
        expect(continuationState(f)).toEqual(afterExpiredRecovery);
      }
      await Promise.resolve();
      expect(
        validateCompletedSourceReportRecoveryCurrentWorkJoin(
          currentHost,
          { version: afterExpiredRecovery.journalVersion, state: afterExpiredRecovery.journal },
          initialReceipt,
          null,
          recovery,
        ),
      ).toEqual(recovery);

      for (const changes of [
        { previous_ticket_id: 'fixture:foreign-ticket' },
        { thread_id: 'fixture:foreign-thread' },
        {
          resources: ['execution:' + f.identity.work_id, 'file:' + changedPath],
          claimed_resources: ['execution:' + f.identity.work_id, 'file:' + changedPath],
        },
      ]) {
        const alteredLedger = {
          ...currentHost.ledger,
          rebinds: currentHost.ledger.rebinds.map((entry) =>
            entry.rebind_id === leaseRebind.rebind_id ? { ...entry, ...changes } : entry,
          ),
        };
        expect(() =>
          validateCompletedSourceReportRecoveryCurrentWorkJoin(
            { ...currentHost, ledger: alteredLedger },
            { version: afterExpiredRecovery.journalVersion, state: afterExpiredRecovery.journal },
            initialReceipt,
            null,
            recovery,
          ),
        ).toThrow();
      }

      const readonlyFollowup = requireRecord(
        await runAgent([...args, ...expectedRunVersion(afterExpiredRecovery.journalVersion), '--issue-wave', 'true']),
        'readonly Initial Source follow-up issue',
      );
      const followupActions = parseIssuedActions(readonlyFollowup.issued_actions, 'readonly follow-up actions');
      expect(followupActions).toHaveLength(2);
      expect(followupActions.every((action) => action.request.stage_id === 'validate_focused')).toBe(true);
      const followupJournal = currentJournal(f);
      expect(followupJournal.state.source_scope?.digest).toBe(sourceAfter.digest);
      expect(followupJournal.state.items).toHaveLength(2);
      expect(followupJournal.state.items.every((item) => item.host_reservation === undefined)).toBe(true);
      expect(followupJournal.state.items.every((item) => item.request.stage_id === 'validate_focused')).toBe(true);
      expect(followupActions.every((action) => action.request.action_id !== writer.request.action_id)).toBe(true);
      expect(
        continuationState(f).ledger.claims.some(
          (claim) => claim.status === 'active' && claim.resources.some((resource) => resource.startsWith('file:')),
        ),
      ).toBe(false);
      expect(continuationState(f).work.lease).toEqual(currentLease);
      expect(
        continuationState(f).work.execution.assignment_attempts.find(
          (attempt) => attempt.attempt_id === writerAttemptId,
        ),
      ).toEqual(completedAttempt);
      // Reader consistency: lifecycle admission owns validation of any appended proof.
      // The public final-assurance fixture separately exercises that real admission.
      const referenceHost = completeHostState(hostStore(f).readHostStateSnapshot(f.identity));
      const retainedReferences = referenceHost.work.lifecycle.references;
      const reference = retainedReferences[0];
      if (!reference) throw Error('Recovery fixture retained reference is absent');

      const withReferences = (
        references: readonly import('../src/lifecycle/lifecycle-state.ts').LifecycleArtifactReference[],
      ) => ({
        ...referenceHost,
        work: { ...referenceHost.work, lifecycle: { ...referenceHost.work.lifecycle, references } },
      });
      const appended: LifecycleArtifactReference = {
        ...reference,
        kind: 'platform_knowledge',
        artifact_schema: 'LifecyclePreparationObservation/v1',
        record_id: 'fixture:post-recovery-preparation',
        path: '.agent/preparation.json',
        decision: 'pass',
      };
      expect(() =>
        validateCompletedSourceReportRecoveryCurrentWorkJoin(
          withReferences([...retainedReferences, appended]),
          followupJournal,
          initialReceipt,
          null,
          recovery,
        ),
      ).not.toThrow();
      for (const references of [
        retainedReferences.slice(1),
        [{ ...reference, sha256: '0'.repeat(64) }, ...retainedReferences.slice(1)],
      ]) {
        expect(() =>
          validateCompletedSourceReportRecoveryCurrentWorkJoin(
            withReferences(references),
            followupJournal,
            initialReceipt,
            null,
            recovery,
          ),
        ).toThrow();
      }
    });
  };
}

registerFixtureTest(
  'recovers the exact completed Initial Source writer report into a readonly follow-up under current code',
  completedSourceRecoveryCase('none'),
);
registerFixtureTest(
  'refreshes SAME prepared code plan with unchanged Host state and guarded crash concurrency',
  completedSourceRecoveryCase('guards'),
);
registerFixtureTest(
  'retries SAME prepared code plan after terminated publication before replacement',
  completedSourceRecoveryCase('crash-before'),
);
registerFixtureTest(
  'retries SAME prepared code plan after terminated publication after replacement',
  completedSourceRecoveryCase('crash-after'),
);

registerFixtureTest(
  'rebinds code at the real unissued readonly frontier without changing source authority',
  async () => {
    await withInitialWork(async (f) => {
      await prepareInitialSourceWaveOne(f);
      const request = frontierCodeRequest(f);
      const proof = fixtureFrontierProof(request);
      const before = continuationState(f);
      const initialReceiptBefore = hostStore(f).readInitialSourceContinuationReceipt(f.identity, 1);
      const sourceAuthorization = before.work.lifecycle.references.find(
        (entry) => entry.artifact_schema === 'LocalSourceWriteAuthorization/v1',
      );
      const retainedPaths = [
        f.scopePath,
        f.acceptancePath,
        f.sourceAuthorizationPath,
        f.intakePath,
        f.rawIntakePath,
        ...f.documents,
      ];
      const retainedBytes = retainedPaths.map((relative) => readFileSync(path.join(f.root, relative)));
      const commit = () =>
        hostStore(f).commitReadOnlyFrontierRuntimeCode(request, trustedHostFixtureVerifier(f, proof));
      const storedValue = commit();
      const receipt = validateInitialSourceFrontierCodeRebindReceipt(storedValue);
      expect(receipt.status).toBe('rebound');
      expect(receipt.rights_granted).toBe(false);
      expect(receipt.accepted_result).toBe(false);
      expect(receipt.runtime_acceptance).toBe(false);
      expect(receipt.record.request.runtimeCodePaths).toEqual(
        [...runtimePackageCodePaths(f.config.runtime.bundle)].sort(),
      );
      expect(receipt.record.endpoint_proof).toEqual(proof);
      expect(receipt.record.prior_ledger).toEqual(before.ledger);
      expect(receipt.record.prior_journal).toEqual(before.journal);
      const after = continuationState(f);
      expect(after.work).toEqual(receipt.record.successor_work);
      expect(withoutFrontierCodeBinding(after.work)).toEqual(withoutFrontierCodeBinding(before.work));
      expect(after.work.revision).toBe(before.work.revision + 1);
      expect(after.work.lifecycle.revision).toBe(before.work.lifecycle.revision + 1);
      expect(after.work.binding.runtime_code_digest).toBe(request.newRuntimeCodeDigest);
      expect(after.ledger).toEqual(before.ledger);
      expect(after.journal).toEqual(before.journal);
      expect(hostStore(f).readInitialSourceContinuationReceipt(f.identity, 1)).toEqual(initialReceiptBefore);
      expect(sourceAuthorization).toBeDefined();
      for (const [index, relative] of retainedPaths.entries()) {
        const retained = retainedBytes[index];
        if (retained === undefined) throw new Error('Initial Source fixture beforeimage is missing');
        expect(readFileSync(path.join(f.root, relative))).toEqual(retained);
      }
      expect(
        hostStore(f).readInitialSourceFrontierCodeRebindReceipt(f.identity, 1, receipt.original_receipt_id),
      ).toEqual(receipt);
      expect(commit()).toEqual(receipt);
      expect(continuationState(f)).toEqual(after);
      const initialReceipt = hostStore(f).readInitialSourceContinuationReceipt(f.identity, 1);
      if (!initialReceipt) throw new Error('Initial Source lineage fixture receipt is unavailable');
      const binding = {
        repositoryRoot: f.root,
        config: f.config,
        selection: admittedInput(f).selection,
        context: { ...admittedInput(f).context, scope_digest: request.sourceScopeDigest },
        workflowId: 'task_execution',
        runId: workRunId(after.work),
      };
      expect(after.journal.source_scope?.digest).toBe(initialReceipt.request.currentSourceScope.digest);
      const engineJournal = currentJournal(f);
      const engineHost = hostStore(f).readHostStateSnapshot(f.identity);
      expect(() =>
        readInitialSourceContinuationSessionEngineSnapshot(binding, initialReceipt, engineJournal, engineHost),
      ).toThrow();
      expect(
        readInitialSourceContinuationSessionEngineSnapshot(binding, initialReceipt, engineJournal, engineHost, receipt)
          .run_id,
      ).toBe(binding.runId);
      expect(() =>
        validateInitialSourceFrontierCodeRebindReceipt({
          ...receipt,
          record: {
            ...receipt.record,
            work_version: { ...receipt.record.work_version, extra: true },
          },
        }),
      ).toThrow();
      expect(() =>
        readInitialSourceContinuationSessionEngineSnapshot(binding, initialReceipt, engineJournal, engineHost, {
          ...receipt,
          current_runtime_code_digest: canonicalJsonDigest('changed-code'),
        }),
      ).toThrow();
      const producer = hostLedger(f).beginSessionProducer({
        ...binding,
        projectIds: f.identity.project_ids,
        phase: 'initialize',
      });
      hostStore(f).assertSessionProducerCurrent(producer);
      hostStore(f).settleSessionProducer(producer, after.journalVersion);
      expect(continuationState(f)).toEqual(after);

      const codeRequest = validateQualifiedRuntimeCodeContinuationRequest({
        schema: 'QualifiedRuntimeCodeContinuationRequest/v1',
        identity: f.identity,
        attempt: 1,
        nativeSessionHandle: workLease(after.work).thread_id,
        leaseGeneration: workLease(after.work).generation,
        expectedWork: after.workVersion,
        expectedLedger: after.ledgerVersion,
        expectedJournal: after.journalVersion,
        expectedMaintenanceGeneration: after.maintenanceGeneration,
        originalSourceScopeDigest: after.work.binding.work_source_revision,
        journalSourceScopeDigest: request.sourceScopeDigest,
        oldRuntimeCodeDigest: request.newRuntimeCodeDigest,
        currentRuntimeCodeDigest: canonicalJsonDigest('fixture-qualified-code-after-frontier'),
        oldRuntimeCodePaths: request.runtimeCodePaths,
        currentRuntimeCodePaths: request.runtimeCodePaths,
        oldManifestRef: request.successorManifestRef,
        oldManifestDigest: request.successorManifestDigest,
        oldInstallRef: request.systemUpdateRef,
        currentManifestRef: '.tmp/fixture/later-code-manifest.json',
        currentManifestDigest: canonicalJsonDigest('fixture-later-code-manifest'),
        currentInstallRef: '.tmp/fixture/later-code-install.json',
        systemUpdateRef: '.tmp/fixture/later-code-install.json',
        systemUpdateOperationId: 'fixture-later-code-install',
        nativeSelfAttestationDigest: canonicalJsonDigest('fixture-later-code-self'),
      });
      // Endpoint fixtures prove this reader join, not native qualification or rights.
      hostStore(f).commitQualifiedRuntimeCodeContinuation(codeRequest, qualifiedRuntimeCodeEndpointFixture);
      const later = continuationState(f);
      expect(later.journal).toEqual(after.journal);
      expect(later.ledger).toEqual(after.ledger);
      expect(later.work.lease).toEqual(after.work.lease);
      expect(
        hostStore(f).readInitialSourceFrontierCodeRebindReceipt(f.identity, 1, receipt.original_receipt_id),
      ).toEqual(receipt);
    });
  },
);

registerFixtureTest('keeps an expired exact owner claim expired during code-only recovery control', async () => {
  await withInitialWork(async (f) => {
    await prepareInitialSourceWaveOne(f);
    const request = frontierCodeRequest(f);
    const proof = fixtureFrontierProof(request);
    const before = continuationState(f);
    const receipt = withExpiredOwner(f, () =>
      hostStore(f).commitReadOnlyFrontierRuntimeCode(request, trustedHostFixtureVerifier(f, proof)),
    );
    const after = continuationState(f);
    expect(receipt.status).toBe('rebound');
    expect(after.work.lease).toEqual(before.work.lease);
    expect(after.ledger).toEqual(before.ledger);
    expect(after.journal).toEqual(before.journal);
    expect(receipt.rights_granted).toBe(false);
  });
});

registerFixtureTest('denies changed or stale frontier proof and an issued current wave without writes', async () => {
  await withInitialWork(async (f) => {
    await prepareInitialSourceWaveOne(f);
    const base = frontierCodeRequest(f);
    const proof = fixtureFrontierProof(base);
    const before = continuationState(f);

    const reject = (request: InitialSourceFrontierCodeRebindRequest) =>
      expect(() =>
        hostStore(f).commitReadOnlyFrontierRuntimeCode(request, trustedHostFixtureVerifier(f, proof)),
      ).toThrow();
    reject({ ...base, nativeSessionHandle: 'foreign-thread' });
    reject({ ...base, expectedWork: { ...base.expectedWork, digest: canonicalJsonDigest('stale') } });
    reject({ ...base, expectedJournal: { ...base.expectedJournal, digest: canonicalJsonDigest('stale-journal') } });
    reject({ ...base, initialContinuationId: 'wrong-history' });
    reject({ ...base, initialContinuationRequestDigest: canonicalJsonDigest('changed-permission-history') });
    reject({ ...base, configDigest: canonicalJsonDigest('changed-config') });
    reject({ ...base, sourceScopeDigest: canonicalJsonDigest('changed-source-scope') });
    reject({ ...base, parentManifestDigest: canonicalJsonDigest('wrong-parent') });
    reject({ ...base, runtimeCodePaths: base.runtimeCodePaths.slice(1) });

    const configPath = path.join(f.root, 'agent-runtime.config.v1.yaml');
    const configBefore = readFileSync(configPath);
    try {
      writeFileSync(
        configPath,
        configBefore.toString('utf8').replace('initial-source-repository', 'changed-source-repository'),
      );
      reject(base);
    } finally {
      writeFileSync(configPath, configBefore);
    }
    const sourceDriftPath = path.join(f.root, f.documents[0]);
    const sourceBefore = readFileSync(sourceDriftPath);
    try {
      writeFileSync(sourceDriftPath, sourceBefore.toString('utf8') + 'out-of-band source change\n');
      reject(base);
    } finally {
      writeFileSync(sourceDriftPath, sourceBefore);
    }
    const permissionRef = before.work.lifecycle.references.find(
      (entry) => entry.artifact_schema === 'LocalSourceWriteAuthorization/v1',
    );
    if (!permissionRef) throw new Error('Initial Source permission fixture is unavailable');
    const permissionPath = path.join(f.root, permissionRef.path);
    const permissionBefore = readFileSync(permissionPath);
    try {
      writeFileSync(permissionPath, permissionBefore.toString('utf8') + '\n');
      reject(base);
    } finally {
      writeFileSync(permissionPath, permissionBefore);
    }
    expect(continuationState(f)).toEqual(before);

    const issued = hostLedger(f).issueWave(f.identity.work_id, 1, before.journalVersion);
    const issuedState = continuationState(f);
    const issuedRequest = frontierCodeRequest(f);
    expect(issued.state.items.every((item) => item.issue_id !== null)).toBe(true);
    expect(() =>
      hostStore(f).commitReadOnlyFrontierRuntimeCode(
        issuedRequest,
        trustedHostFixtureVerifier(f, fixtureFrontierProof(issuedRequest)),
      ),
    ).toThrow();
    expect(continuationState(f)).toEqual(issuedState);
  });
});

registerFixtureTest(
  'denies a changed owner, a live owner, and an overlapping queued waiter without writes',
  async () => {
    for (const scenario of ['foreign', 'live', 'queued'])
      await withInitialWork(async (f) => {
        changeOneAcceptedDocument(f);
        let request = initialRequest(f);
        if (scenario === 'foreign') request = { ...request, nativeSessionHandle: 'foreign-thread' };
        if (scenario === 'queued') {
          const before = completeHostState(hostStore(f).readHostStateSnapshot(f.identity));
          const owner = before.ledger.tickets.find((ticket) => ticket.ticket_id === workLease(before.work).ticket_id);
          if (!owner) throw new Error('Initial Source fixture owner ticket is unavailable');
          const queuedTicket: CoordinationLedger['tickets'][number] = {
            ...owner,
            ticket_id: 'ticket-' + randomUUID(),
            thread_id: 'queued-thread',
            sequence: before.ledger.next_sequence,
            status: 'queued',
            claim_ids: [],
            expires_at: null,
            active_resources: [],
            blocked_resources: owner.exclusive_resources,
            created_at: new Date().toISOString(),
          };
          hostStore(f).compareAndSwapHostState({
            expectedWork: before.workVersion,
            expectedLedger: before.ledgerVersion,
            expectedMaintenanceGeneration: before.maintenanceGeneration,
            nextWork: {
              ...before.work,
              revision: before.work.revision + 1,
              lifecycle: { ...before.work.lifecycle, revision: before.work.lifecycle.revision + 1 },
            },
            nextLedger: {
              ...before.ledger,
              revision: before.ledger.revision + 1,
              next_sequence: before.ledger.next_sequence + 1,
              tickets: [...before.ledger.tickets, queuedTicket],
            },
          });
          request = initialRequest(f);
        }
        expectNoChange(f, request, scenario !== 'live');
      });
  },
);

registerFixtureTest('denies preparation and possible exposure on an unissued initial wave', async () => {
  const markers: readonly ('preparing' | 'possible')[] = ['preparing', 'possible'];
  for (const marker of markers)
    await withInitialWork(async (f) => {
      changeOneAcceptedDocument(f);
      const request = initialRequest(f);
      const baseline = continuationState(f);
      const journal = { ...baseline.journal, research_wave_exposure: marker };
      const journalVersion = { ...baseline.journalVersion, digest: canonicalJsonDigest(journal) };
      const state = { ...baseline, journal, journalVersion };
      const changedRequest = { ...request, expectedJournal: journalVersion };
      withExpiredOwner(f, () => {
        expect(() => validateInitialSourceContinuationRequest(request, baseline, f.config)).not.toThrow();
        expect(() => validateInitialSourceContinuationRequest(changedRequest, state, f.config)).toThrow(
          /Work is not the expired, execution-only, unissued first readonly wave/,
        );
      });
      expect(continuationState(f)).toEqual(baseline);
      expect(hostStore(f).readInitialSourceContinuationReceipt(f.identity, 1)).toBeNull();
    });
});

registerFixtureTest('denies an issued unknown wave, a reserved wave, and any observed first action', async () => {
  for (const scenario of ['issued', 'reserved', 'observed'])
    await withInitialWork(async (f) => {
      if (scenario === 'reserved') {
        changeOneAcceptedDocument(f);
        const request = initialRequest(f);
        const baseline = continuationState(f);
        const first = firstValue(baseline.journal.items, 'Unissued readonly action');
        expect(first.issue_id).toBeNull();
        expect(first.host_reservation).toBeUndefined();
        const ledger = hostLedger(f);
        const database = ledger.sessionProducerBinding().database;
        const row = database.query<{ revision: number; payload: string; digest: string }, [string, string, number]>(
          'SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?',
        );
        const rawBefore = row.get(hostStore(f).workspaceId, f.identity.work_id, 1);
        expect(rawBefore).not.toBeNull();
        // A partial writer reservation is rejected during the producer's transactional reread.
        // Observe exact durable bytes/CAS; never fabricate a valid readonly provider grant.
        expect(() => {
          void Reflect.apply(ledger.issueWave.bind(ledger), undefined, [
            f.identity.work_id,
            1,
            baseline.journalVersion,
            {
              [first.request.action_id]: {
                schema: 'WorkflowSessionReservation/v1',
                request: {
                  workItemId: f.identity.work_id,
                  stageId: first.request.stage_id,
                  assignmentIndex: first.request.assignment_index,
                },
                receipt: { identity: f.identity, attempt: { attempt_id: 'fixture-incomplete' } },
              },
            },
          ]);
        }).toThrow('invocation');
        expect(row.get(hostStore(f).workspaceId, f.identity.work_id, 1)).toEqual(rawBefore);
        expect(continuationState(f)).toEqual(baseline);
        // Readonly first waves never receive a real writer reservation. Test rejection of forged input.
        const malformedJournal = {
          ...baseline.journal,
          items: [{ ...first, host_reservation: { fixture: 'forged-readonly-reservation' } }],
        };
        const malformedVersion = { ...baseline.journalVersion, digest: canonicalJsonDigest(malformedJournal) };
        const malformedState = { ...baseline, journal: malformedJournal, journalVersion: malformedVersion };
        const malformedRequest = { ...request, expectedJournal: malformedVersion };
        withExpiredOwner(f, () => {
          expect(() => validateInitialSourceContinuationRequest(request, baseline, f.config)).not.toThrow();
          expect(() => {
            void Reflect.apply(validateInitialSourceContinuationRequest, undefined, [
              malformedRequest,
              malformedState,
              f.config,
            ]);
          }).toThrow('Work is not the expired, execution-only, unissued first readonly wave');
        });
        expect(continuationState(f)).toEqual(baseline);
        expect(hostStore(f).readInitialSourceContinuationReceipt(f.identity, 1)).toBeNull();
        return;
      } else {
        changeOneAcceptedDocument(f);
        let journal = currentJournal(f);
        journal = hostLedger(f).issueWave(f.identity.work_id, 1, journal.version);
        if (scenario === 'observed') {
          const item = firstValue(journal.state.items, 'issued Initial Source Journal item');
          const issueId = item.issue_id;
          if (!issueId) throw new Error('Issued Initial Source Journal item has no issue ID');
          const summary = 'Observed the initial readonly action.';
          journal = hostLedger(f).report(
            f.identity.work_id,
            1,
            journal.version,
            {
              schema: 'VidaSessionObservation/v1',
              action_id: item.request.action_id,
              issue_id: issueId,
              agent_id: item.request.stage_id + '-0',
              tool_call_ref: 'fixture:initial-observation',
              status: 'reported_complete',
              summary,
              output_digest: canonicalJsonDigest(summary),
              evidence_refs: ['fixture://initial-observation'],
            },
            f.originalSource,
          );
        }
      }
      expectNoChange(f, initialRequest(f));
    });
});

registerFixtureTest(
  'rejects request drift, an unaccepted fourth path, intake or approval byte drift, and source TOCTOU',
  async () => {
    for (const scenario of ['workflow', 'fourth-path', 'intake', 'approval', 'source'])
      await withInitialWork(async (f) => {
        changeOneAcceptedDocument(f);
        const request = initialRequest(f);
        if (scenario === 'workflow') {
          expectNoChange(f, {
            ...request,
            currentInitialRequest: { ...request.currentInitialRequest, workflow_id: 'implementation_change' },
          });
        } else if (scenario === 'fourth-path') {
          const extra = 'docs/UNACCEPTED.md';
          writeFileSync(path.join(f.root, extra), 'outside the accepted scope\n');
          expectNoChange(f, {
            ...request,
            currentSourceScope: snapshotDeclaredSources(requireSafeRepositoryAccess(f.root), [...f.documents, extra]),
          });
        } else {
          const relative =
            scenario === 'intake' ? f.intakePath : scenario === 'approval' ? f.sourceAuthorizationPath : f.documents[1];
          writeFileSync(
            path.join(f.root, relative),
            readFileSync(path.join(f.root, relative), 'utf8') + 'post-request drift\n',
          );
          expectNoChange(f, request);
        }
      });
  },
);

registerFixtureTest(
  'rejects an altered engine beforeimage and atomically rolls back a Journal CAS failure',
  async () => {
    for (const scenario of ['engine', 'journal-cas'])
      await withInitialWork(async (f) => {
        changeOneAcceptedDocument(f);
        const request = initialRequest(f);
        const beforeHost = completeHostState(hostStore(f).readHostStateSnapshot(f.identity));
        const beforeJournal = currentJournal(f);
        if (scenario === 'engine') {
          const enginePath = path.join(f.root, f.config.control.work_root, 'mastra-workflows.v1.sqlite');
          const engineDb = new Database(enginePath);
          let snapshotBytes: Uint8Array | null = null;
          let snapshotMayBeChanged = false;
          await withCleanup(
            () => {
              const savedValue: unknown = engineDb
                .query('SELECT snapshot,json(snapshot) AS parsed FROM mastra_workflow_snapshot WHERE run_id=?')
                .get(workRunId(beforeHost.work));
              const saved = requireRecord(savedValue, 'Initial Source engine snapshot beforeimage');
              if (!(saved.snapshot instanceof Uint8Array))
                throw new Error('Initial Source engine snapshot beforeimage is not bytes');
              snapshotBytes = Uint8Array.from(saved.snapshot);
              const parsedValue: unknown = JSON.parse(
                requireString(saved.parsed, 'Initial Source parsed engine snapshot'),
              );
              const altered = requireRecord(parsedValue, 'Initial Source decoded engine snapshot');
              const context = requireRecord(altered.context, 'Initial Source engine snapshot context');
              const input = requireRecord(context.input, 'Initial Source engine snapshot input');
              input.config_digest = '0'.repeat(64);
              const alteredJson = JSON.stringify(altered);
              if (typeof alteredJson !== 'string')
                throw new Error('Initial Source altered engine snapshot is not serializable');
              snapshotMayBeChanged = true;
              engineDb
                .query('UPDATE mastra_workflow_snapshot SET snapshot=jsonb(?) WHERE run_id=?')
                .run(alteredJson, workRunId(beforeHost.work));
              return expectNoChange(f, request);
            },
            async () => {
              const cleanupErrors: unknown[] = [];
              if (snapshotMayBeChanged && snapshotBytes) {
                try {
                  engineDb
                    .query('UPDATE mastra_workflow_snapshot SET snapshot=? WHERE run_id=?')
                    .run(snapshotBytes, workRunId(beforeHost.work));
                } catch (error) {
                  cleanupErrors.push(error);
                }
              }
              try {
                engineDb.close();
              } catch (error) {
                cleanupErrors.push(error);
              }
              if (cleanupErrors.length === 1) throw cleanupErrors[0];
              if (cleanupErrors.length > 1) throw new AggregateError(cleanupErrors, 'Engine snapshot cleanup failed');
            },
            'Initial Source engine beforeimage assertion',
          );
        } else {
          hostDatabase(f).exec(
            'CREATE TRIGGER fail_initial_source_journal BEFORE UPDATE ON agent_host_mastra_session_ledger ' +
              "WHEN NEW.work_id='" +
              f.identity.work_id +
              "' BEGIN SELECT RAISE(ABORT, 'fixture journal CAS failure'); END",
          );
          await withCleanup(
            () => {
              expect(() =>
                withExpiredOwner(f, () =>
                  hostStore(f).continueInitialSource(request, (state) => currentProof(f, state)),
                ),
              ).toThrow();
              expect(completeHostState(hostStore(f).readHostStateSnapshot(f.identity))).toEqual(beforeHost);
              expect(currentJournal(f)).toEqual(beforeJournal);
              expect(hostStore(f).readInitialSourceContinuationReceipt(f.identity, 1)).toBeNull();
            },
            () => {
              hostDatabase(f).exec('DROP TRIGGER fail_initial_source_journal');
            },
            'Initial Source journal rollback assertion',
          );
        }
      });
  },
);

registerFixtureTest(
  'initial-source producer reuses one validated Host snapshot in begin and settle transactions',
  async () => {
    await withInitialWork(async (f) => {
      await prepareInitialSourceWaveOne(f, false);
      const before = continuationState(f);
      const initialReceipt = hostStore(f).readInitialSourceContinuationReceipt(f.identity, 1);
      if (!initialReceipt) throw new Error('Initial Source producer fixture receipt is missing');
      expect(initialReceipt.status).toBe('initial_request_ready');
      expect(initialReceipt.rights_granted).toBe(false);
      expect(initialReceipt.accepted_result).toBe(false);
      expect(initialReceipt.runtime_acceptance).toBe(false);

      const input = {
        repositoryRoot: f.root,
        config: f.config,
        selection: admittedInput(f).selection,
        context: {
          ...admittedInput(f).context,
          scope_digest: initialReceipt.request.currentSourceScope.digest,
        },
        workflowId: 'task_execution',
        runId: workRunId(before.work),
        projectIds: f.identity.project_ids,
        phase: 'initialize' as const,
        expectedWork: before.workVersion,
        expectedLedger: before.ledgerVersion,
        expectedJournal: before.journalVersion,
        maintenanceGeneration: before.maintenanceGeneration,
      };
      const binding = hostLedger(f).sessionProducerBinding();
      const database = binding.database;
      const actualQuery: typeof database.query = database.query.bind(database);
      let hostRowQueryCalls = 0;
      const observedQuery: typeof database.query = <Result, Bindings extends SQLQueryBindings | SQLQueryBindings[]>(
        sql: string,
      ): ReturnType<typeof actualQuery<Result, Bindings>> => {
        if (
          database.inTransaction &&
          sql.startsWith('SELECT workspace_id,kind,id,revision,digest,') &&
          sql.includes(' FROM agent_host_state WHERE workspace_id=? AND kind=? AND id=?')
        ) {
          hostRowQueryCalls += 1;
        }
        return actualQuery<Result, Bindings>(sql);
      };
      const querySpy = spyOn(database, 'query').mockImplementation(observedQuery);
      try {
        // Use the actual Host entry point. The ledger adapter's separate
        // readHostStateSnapshot preflight is intentionally outside this count.
        const producer = hostStore(f).beginSessionProducer(hostLedger(f), input);
        const beginQueryCalls = hostRowQueryCalls;
        hostRowQueryCalls = 0;

        hostStore(f).settleSessionProducer(producer, before.journalVersion);
        // Receipt validators keep their live reads. Reuse the validated identity
        // and receipt snapshots to remove the caller's repeated Host reads.
        expect([beginQueryCalls, hostRowQueryCalls]).toEqual([10, 10]);
      } finally {
        querySpy.mockRestore();
      }

      expect(continuationState(f)).toEqual(before);
      expect(hostStore(f).readInitialSourceContinuationReceipt(f.identity, 1)).toEqual(initialReceipt);
      let changedConfig = false;
      const configPath = path.join(f.root, 'agent-runtime.config.v1.yaml');
      const configBefore = readFileSync(configPath);
      const configDriftBytes = configBefore
        .toString('utf8')
        .replace(/(\n  repository_id: ')[^'\r\n]+(')/, '$1' + f.config.repository.repository_id + '-drift$2');
      const producerFenceState = () => ({
        reservations: database
          .query(
            'SELECT store_id,kind,record_key,revision,payload,digest FROM agent_host_governance ' +
              'WHERE workspace_id=? AND store_id=? ORDER BY kind,record_key',
          )
          .all(binding.workspaceId, 'vida-session-producers'),
        generation: database
          .query('SELECT generation,digest FROM agent_host_governance_stores WHERE workspace_id=? AND store_id=?')
          .all(binding.workspaceId, 'vida-session-producers'),
      });
      if (Buffer.from(configDriftBytes).equals(configBefore))
        throw new Error('Initial Source config drift fixture did not change the repository identifier');
      const beforeProducerFence = producerFenceState();
      // oxlint-disable-next-line typescript/unbound-method -- Forward below with the actual receiver and restore the exact prototype method.
      const actualResume = MastraSessionLedger.prototype.resume;
      const driftResumeSpy = spyOn(MastraSessionLedger.prototype, 'resume').mockImplementation(function (
        this: MastraSessionLedgerType,
        ...args: Parameters<MastraSessionLedgerType['resume']>
      ) {
        const result = actualResume.apply(this, args);
        // Journal resume has its own current-config guard. Change bytes after
        // that real read so this witness reaches the later project reload.
        if (!changedConfig && this === hostLedger(f) && database.inTransaction) {
          writeFileSync(configPath, configDriftBytes);
          const changed = loadRuntimeConfig(f.root);
          if (
            changed.repository.repository_id !== f.config.repository.repository_id + '-drift' ||
            runtimeConfigDigest(changed) === runtimeConfigDigest(f.config)
          )
            throw new Error('Initial Source config drift fixture did not parse as a changed configuration');
          changedConfig = true;
        }
        return result;
      });
      let producer: ReturnType<HostStateStore['beginSessionProducer']> | null = null;
      await withCleanup(
        () => {
          expect(() => {
            producer = hostStore(f).beginSessionProducer(hostLedger(f), input);
          }).toThrow(/runtime config snapshot is stale or forged/);
          expect(changedConfig).toBe(true);
          expect(producer).toBeNull();
          writeFileSync(configPath, configBefore);
          expect(continuationState(f)).toEqual(before);
          expect(hostStore(f).readInitialSourceContinuationReceipt(f.identity, 1)).toEqual(initialReceipt);
          expect(producerFenceState()).toEqual(beforeProducerFence);
        },
        () => {
          const errors: unknown[] = [];
          try {
            driftResumeSpy.mockRestore();
          } catch (error) {
            errors.push(error);
          }
          try {
            writeFileSync(configPath, configBefore);
          } catch (error) {
            errors.push(error);
          }
          if (errors.length === 1) throw errors[0];
          if (errors.length > 1) throw new AggregateError(errors, 'Initial Source config drift cleanup failed');
        },
        'Initial Source config drift assertion',
      );
    });
  },
);
