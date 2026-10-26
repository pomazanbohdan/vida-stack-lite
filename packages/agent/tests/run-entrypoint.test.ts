import assert from 'node:assert/strict';
import { recoverFailedPrewriterOwner } from '../bin/recover-failed-prewriter-owner.ts';
import { afterAll, beforeAll, describe, expect, mock, setSystemTime, test, spyOn } from 'bun:test';
import { Database, type SQLQueryBindings } from 'bun:sqlite';
import {
  openAdmittedWorkspaceDatabase,
  closeWorkspaceDatabaseWithAdmission,
} from '../src/config/storage-read-admission.ts';
import { documentationPolicyTransitionFence } from '../src/documentation/policy-transition.ts';
import { sessionBridgeDatabaseRelativePath, sessionHandoffDatabaseRelativePath } from '../src/config/project-paths.ts';
import { nativeDatabaseSnapshotReader } from './helpers/native-database-snapshot.ts';
import { observeWorkStateSchemaCompiles } from './helpers/ajv-compile-observer.ts';
import {
  HostStateStore,
  inspectHostWorkspaceDatabase,
  type CoordinationLedger,
  type StateVersion,
  type WorkIdentity,
  type WorkState,
} from '../src/host-state.ts';
import {
  MastraSessionLedger,
  openConfiguredMastraSessionLedger,
  sessionHandoffDatabasePath,
} from '../src/orchestration/persistent-session-handoff.ts';
import { loadProjectSetContext } from '../src/config/project-context.ts';
import {
  finishWorkspaceDatabaseClose,
  withWorkspaceDatabaseCloseAsync,
  type DatabaseWorkOutcome,
} from '../src/config/workspace-database-raw.ts';
import { sessionBridgeRunId } from '../src/orchestration/mastra-session-bridge.ts';
import type { SessionBridgeRequest } from '../src/orchestration/mastra-session-bridge-contract.ts';
import { boundedSpawnSync, commandOutcomeUnknown, executionBudget, pinnedEnvironment } from '../bin/bun.ts';
import { spawn, spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import {
  cpSync,
  existsSync,
  linkSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  readdirSync,
  renameSync,
  rmSync,
  symlinkSync,
  truncateSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import * as fs from 'node:fs';
import { tmpdir } from 'node:os';
import { createServer } from 'node:net';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  addObservationForAction,
  advanceCutoff,
  assertNoActiveCutoverMaintenance,
  checkedDirectory,
  compareStrings,
  describeIssuedAction,
  forwardUpdateAuthority,
  historicalConfiguredContexts,
  historicalReleaseInspection,
  isActiveRuntimeSelectorRecord,
  isHistoricalRunHistory,
  isPacketOnlyDevelopmentStage,
  isResearchSourceReference,
  isReadonlyReleasePlan,
  markUncertainResearchStatus,
  parseReadonlyReleaseArray,
  pathExists,
  recordField,
  repairAuthority,
  requireNoCompletedReadonlyRelease,
  hasCompletedTerminalStage,
  requireHistoricalItem,
  requireOneReadonlyReleaseMatch,
  requireRecoveryOperation,
  readonlyReleaseThreadId,
  main,
  run,
  isHistoricalScopedSnapshot,
  writeDurable,
} from '../bin/run.ts';
import { runOptionDetails, runSpecialModeOptions } from '../bin/run-cli-options.ts';
import * as observedResearchActivation from '../src/orchestration/observed-research-activation.ts';
import { cliCommandContracts } from '../bin/cli-command-contracts.ts';
import { initializeProject } from '../bin/init.ts';
import { inspectLocalSession } from '../src/orchestration/inspect-local-session.ts';
import { fixtureInitializationTemplates } from './helpers/runtime-initialization-fixture.js';
import { bindControlledRuntimeInitialization } from './helpers/controlled-runtime-initialization-fixture.js';
import { pauseReadonlyDispatchHostFixture } from './helpers/readonly-dispatch-host-fixture.js';
import { runReconcileArtifacts } from '../bin/reconcile-artifacts.ts';
import {
  admittedInput,
  continuationState,
  createInitialSourceWorkFixture,
  expiredOwnerTime,
  issueInitialSourceFixtureWriter,
  prepareInitialSourceFrontier,
  workLease,
} from './helpers/initial-source-work-fixture.js';
import { prepareNativeUnnormalizedSynthesis } from './helpers/native-synthesis-correction-fixture.ts';
import type { RuntimeInitializationReceipt } from '../src/config/initialization-record.js';
import { readRuntimeInitializationReceipt } from '../src/config/initialization-record.js';
import { parseForwardJournal } from '../src/documentation/forward-journal.ts';
import { executeDocumentationClearFromWork } from '../src/documentation/clear.ts';
import { preparedFixture } from './helpers/documentation-policy-fixture.ts';
import { coordinationLedgerDigest, validateCoordinationLedgerV1 } from '../src/contracts/envelopes.ts';
import type { AgentRuntimeConfig } from '../src/config/runtime-config.ts';
import type { SessionAgentAction } from '../src/orchestration/session-handoff.ts';
import type { SessionHandoffContext } from '../src/orchestration/session-handoff.ts';
import type { SessionBridgeObservation } from '../src/orchestration/mastra-session-bridge-contract.ts';
import { parseSessionBridgeObservation } from '../src/orchestration/mastra-session-bridge-contract.ts';
import type { DeliveredWorkContinuationRequest } from '../src/orchestration/delivered-work-continuation.ts';
import type { LocalWorkAdmissionInput } from '../src/orchestration/local-work-admission.ts';
import { Console } from 'node:console';
import { markInitialSourceTimingPhase } from './helpers/initial-source-run-timing-diagnostic.ts';
import { Writable } from 'node:stream';
import {
  createAutomaticWorkAdmissionFixture,
  withAutomaticWorkAdmissionCase,
} from './helpers/automatic-work-admission-fixture.ts';
import {
  createFailedFinalCorrectionFixture,
  type FailedFinalCorrectionFixture,
} from './helpers/failed-final-correction-fixture.ts';
import { configuredTestContext } from './configured-context.ts';
import { completeOwnedCleanup } from '../tooling/owned-cleanup-completion.ts';
import {
  isTerminalUtf8SpawnResult,
  parseJsonUnknown,
  parseTestRunPayload,
  requireIssuedActions,
  requireNextActions,
  requireRecord,
  requireStateVersion,
  type TerminalUtf8SpawnResult,
  type TestRunPayload,
} from './helpers/run-entrypoint-test-support.ts';

// Bun updates imported module namespaces when a module mock is registered.
const originalFs = Object.freeze({ ...fs });

test('readonly local inspection validates decoded rows and retains uncertain journal custody without writes', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-readonly-inspection-'));
  if (!path.resolve(root).startsWith(path.resolve(tmpdir(), 'vida-readonly-inspection-')))
    throw Error('owned inspection fixture cleanup target differs');
  const { config } = configuredTestContext();
  const workspaceId = deriveWorkspaceId(config.repository.repository_id, root);
  const file = path.join(root, config.control.work_root, 'session-handoff.v1.sqlite');
  mkdirSync(path.dirname(file), { recursive: true });
  const database = new Database(file);
  try {
    database.exec(
      'CREATE TABLE agent_host_state (workspace_id TEXT,kind TEXT,id TEXT,revision INTEGER,payload TEXT,digest TEXT)',
    );
    database.exec(
      'CREATE TABLE agent_host_mastra_session_ledger (workspace_id TEXT,work_id TEXT,attempt INTEGER,revision INTEGER,payload TEXT,digest TEXT)',
    );
    const input = {
      repositoryRoot: root,
      config,
      projectIds: ['agent'],
      integrationsDigest: 'a'.repeat(64),
      workId: 'fixture-inspection',
      attempt: 1,
    };
    const emptyInspection = inspectLocalSession(input);
    expect(emptyInspection).toMatchObject({
      status: 'inspected',
      recovery_required: false,
      pending_actions: [],
      journal_version: null,
      work_version: null,
      ledger_version: null,
      diagnosis: {
        reason: 'session_absent',
        evidence: { journal_version: null, work_version: null, ledger_version: null },
        advisory_routes: [],
        rights_granted: false,
      },
    });
    expect(database.query('SELECT * FROM agent_host_mastra_session_ledger').all()).toEqual([]);
    expect(database.query('SELECT * FROM agent_host_state').all()).toEqual([]);
    const state = {
      schema: 'MastraSessionLedger/v1',
      workspace_id: workspaceId,
      work_id: input.workId,
      attempt: 1,
      items: [
        {
          issue_id: 'retained-issue',
          observation: null,
          request: { action_id: 'retained-action', stage_id: 'review' },
        },
      ],
    };
    const saveJournal = (value: unknown) => {
      database.exec('DELETE FROM agent_host_mastra_session_ledger');
      database
        .query('INSERT INTO agent_host_mastra_session_ledger VALUES(?,?,?,?,?,?)')
        .run(workspaceId, input.workId, 1, 1, JSON.stringify(value), canonicalJsonDigest(value));
    };
    saveJournal(state);
    const before = database.query('SELECT * FROM agent_host_mastra_session_ledger').all();
    const pendingInspection = inspectLocalSession(input);
    expect(pendingInspection).toMatchObject({
      status: 'inspected',
      recovery_required: true,
      pending_actions: [{ action_id: 'retained-action', issue_id: 'retained-issue', stage_id: 'review' }],
      diagnosis: {
        reason: 'pending_observation',
        evidence: {
          journal_version: pendingInspection.journal_version,
          work_version: pendingInspection.work_version,
          ledger_version: pendingInspection.ledger_version,
        },
        advisory_routes: [],
        rights_granted: false,
      },
    });
    expect(database.query('SELECT * FROM agent_host_mastra_session_ledger').all()).toEqual(before);
    for (const candidate of [
      null,
      { ...state, items: [null] },
      { ...state, items: [{ ...state.items[0], request: { action_id: 1, stage_id: 'review' } }] },
    ]) {
      saveJournal(candidate);
      const retained = database.query('SELECT * FROM agent_host_mastra_session_ledger').all();
      expect(() => inspectLocalSession(input)).toThrow(/local session inspection/);
      expect(database.query('SELECT * FROM agent_host_mastra_session_ledger').all()).toEqual(retained);
    }
    saveJournal(state);
    const workKey = JSON.stringify([
      config.repository.repository_id,
      input.projectIds,
      input.integrationsDigest,
      input.workId,
    ]);
    database
      .query('INSERT INTO agent_host_state VALUES(?,?,?,?,?,?)')
      .run(workspaceId, 'work', workKey, 1, 'null', canonicalJsonDigest(null));
    expect(() => inspectLocalSession(input)).toThrow(/work identity/);
    database.exec('DELETE FROM agent_host_state');
    database
      .query('INSERT INTO agent_host_state VALUES(?,?,?,?,?,?)')
      .run(workspaceId, 'ledger', 'shared', 1, '{}', canonicalJsonDigest({}));
    expect(() => inspectLocalSession(input)).toThrow(/coordination ledger/);
  } finally {
    database.close(true);
    rmSync(root, { recursive: true, force: true });
  }
});

test('readonly local inspection keeps Work, Ledger and Journal on one committed snapshot', async () => {
  const deadline = performance.now() + 5_000;
  const fixture = createAutomaticWorkAdmissionFixture(false, true);
  const databaseFile = path.join(fixture.root, fixture.config.control.work_root, 'session-handoff.v1.sqlite');
  let writerDatabase: Database | undefined;
  const errors: unknown[] = [];
  try {
    const workId = 'inspection-snapshot-' + randomUUID().slice(0, 8),
      admitted = fixture.admit(fixture.prepare(workId, 'user:inspection-snapshot')),
      admittedWork = admitted.host.work,
      admittedLedger = admitted.host.ledger;
    if (!admittedWork || !admittedLedger || !admitted.host.workVersion || !admitted.host.ledgerVersion)
      throw Error('inspection snapshot fixture did not admit complete Host state');
    const identity: WorkIdentity = {
        repository_id: admittedWork.binding.repository_id,
        project_ids: [...admittedWork.binding.project_ids],
        integrations_digest: admittedWork.binding.integrations_digest,
        work_id: workId,
      },
      input = {
        repositoryRoot: fixture.root,
        config: fixture.config,
        projectIds: identity.project_ids,
        integrationsDigest: identity.integrations_digest,
        workId,
        attempt: 1,
      };
    const compilation = observeWorkStateSchemaCompiles();
    let initialInspection: ReturnType<typeof inspectLocalSession>;
    try {
      // Admission already used the shared schema. A fresh inspection module
      // must reuse it, including during its first actual persisted read.
      const fresh = (await import(
        `../src/orchestration/inspect-local-session.ts?shared=${randomUUID()}`
      )) as typeof import('../src/orchestration/inspect-local-session.ts');
      initialInspection = fresh.inspectLocalSession(input);
      expect(compilation.schemas).toHaveLength(0);
    } finally {
      compilation.restore();
    }
    expect(initialInspection.status).toBe('inspected');

    fixture.database.exec('PRAGMA journal_mode=WAL');
    writerDatabase = new Database(databaseFile, { strict: true });
    const workKey = JSON.stringify([
      identity.repository_id,
      identity.project_ids,
      identity.integrations_digest,
      identity.work_id,
    ]);
    let barrierReached = false,
      mutationQueries = 0;
    const commitNextSnapshot = () => {
      const currentWorkRow = writerDatabase!
          .query("SELECT revision,payload,digest FROM agent_host_state WHERE workspace_id=? AND kind='work' AND id=?")
          .get(fixture.store.workspaceId, workKey) as { revision: number; payload: string; digest: string } | null,
        currentLedgerRow = writerDatabase!
          .query(
            "SELECT revision,payload,digest FROM agent_host_state WHERE workspace_id=? AND kind='ledger' AND id='shared'",
          )
          .get(fixture.store.workspaceId) as { revision: number; payload: string; digest: string } | null,
        currentJournalRow = writerDatabase!
          .query(
            'SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?',
          )
          .get(fixture.store.workspaceId, workId, 1) as { revision: number; payload: string; digest: string } | null;
      if (!currentWorkRow || !currentLedgerRow || !currentJournalRow)
        throw Error('inspection snapshot writer is missing a valid persisted row');
      const currentWork = admittedWork,
        currentLedger = admittedLedger,
        nextWork: WorkState = {
          ...currentWork,
          revision: currentWork.revision + 1,
          lifecycle: {
            ...currentWork.lifecycle,
            revision: currentWork.lifecycle.revision + 1,
            next_action: 'Inspect the newly committed Host snapshot.',
          },
        },
        nextLedger: CoordinationLedger = { ...currentLedger, revision: currentLedger.revision + 1 };
      const tx = writerDatabase!.transaction(() => {
        const workUpdate = writerDatabase!
          .query(
            "UPDATE agent_host_state SET revision=?,payload=?,digest=? WHERE workspace_id=? AND kind='work' AND id=? AND revision=? AND digest=?",
          )
          .run(
            nextWork.revision,
            canonicalJson(nextWork),
            canonicalJsonDigest(nextWork),
            fixture.store.workspaceId,
            workKey,
            currentWorkRow.revision,
            currentWorkRow.digest,
          );
        const ledgerUpdate = writerDatabase!
          .query(
            "UPDATE agent_host_state SET revision=?,payload=?,digest=? WHERE workspace_id=? AND kind='ledger' AND id='shared' AND revision=? AND digest=?",
          )
          .run(
            nextLedger.revision,
            canonicalJson(nextLedger),
            coordinationLedgerDigest(nextLedger),
            fixture.store.workspaceId,
            currentLedgerRow.revision,
            currentLedgerRow.digest,
          );
        const journalUpdate = writerDatabase!
          .query(
            'UPDATE agent_host_mastra_session_ledger SET revision=revision+1 WHERE workspace_id=? AND work_id=? AND attempt=? AND revision=? AND digest=?',
          )
          .run(fixture.store.workspaceId, workId, 1, currentJournalRow.revision, currentJournalRow.digest);
        if (workUpdate.changes !== 1 || ledgerUpdate.changes !== 1 || journalUpdate.changes !== 1)
          throw Error('inspection snapshot writer CAS did not update all three rows');
      });
      tx.immediate();
    };
    const originalQuery: unknown = Object.getOwnPropertyDescriptor(Database.prototype, 'query')?.value;
    if (typeof originalQuery !== 'function') throw Error('SQLite query method is unavailable');
    const observedQuery = function (this: Database, sql: string) {
      const statement = Reflect.apply(originalQuery, this, [sql]) as ReturnType<Database['query']>;
      if (/^\s*(?:UPDATE|INSERT|DELETE|REPLACE)\b/iu.test(sql)) mutationQueries += 1;
      if (
        barrierReached ||
        !/^\s*SELECT\s+revision\s*,\s*payload\s*,\s*digest\s+FROM\s+agent_host_mastra_session_ledger\b/iu.test(sql)
      )
        return statement;
      return new Proxy(statement, {
        get(target, property) {
          const value: unknown = Reflect.get(target, property, target);
          if (typeof value !== 'function') return value;
          return (...args: unknown[]) => {
            const row: unknown = Reflect.apply(value, target, args);
            if (property === 'get' && !barrierReached) {
              barrierReached = true;
              commitNextSnapshot();
            }
            return row;
          };
        },
      }) as typeof statement;
    };
    const querySpy = spyOn(Database.prototype, 'query').mockImplementation(
      observedQuery as typeof Database.prototype.query,
    );
    let duringCommit: ReturnType<typeof inspectLocalSession>;
    try {
      duringCommit = inspectLocalSession(input);
    } finally {
      querySpy.mockRestore();
    }
    expect(barrierReached).toBe(true);
    expect(mutationQueries).toBe(3);
    expect(duringCommit.work_version).toEqual(initialInspection.work_version);
    expect(duringCommit.ledger_version).toEqual(initialInspection.ledger_version);
    expect(duringCommit.journal_version).toEqual(initialInspection.journal_version);
    expect(duringCommit).toMatchObject({
      diagnosis: {
        reason: 'persisted_snapshot',
        evidence: {
          journal_version: duringCommit.journal_version,
          work_version: duringCommit.work_version,
          ledger_version: duringCommit.ledger_version,
        },
        advisory_routes: [],
        rights_granted: false,
      },
    });
    expect(duringCommit.lifecycle_phase).toBe(initialInspection.lifecycle_phase);

    const afterCommitRows = fixture.database
      .query('SELECT kind,id,revision,payload,digest FROM agent_host_state WHERE workspace_id=? ORDER BY kind,id')
      .all(fixture.store.workspaceId);
    const afterCommitJournal = fixture.database
      .query(
        'SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?',
      )
      .get(fixture.store.workspaceId, workId, 1);
    const nextInspection = inspectLocalSession(input);
    expect(nextInspection.work_version?.revision).toBe((initialInspection.work_version?.revision ?? 0) + 1);
    expect(nextInspection.ledger_version?.revision).toBe((initialInspection.ledger_version?.revision ?? 0) + 1);
    expect(nextInspection.journal_version?.revision).toBe((initialInspection.journal_version?.revision ?? 0) + 1);
    expect(nextInspection).toMatchObject({
      diagnosis: {
        reason: 'persisted_snapshot',
        evidence: {
          journal_version: nextInspection.journal_version,
          work_version: nextInspection.work_version,
          ledger_version: nextInspection.ledger_version,
        },
        advisory_routes: [],
        rights_granted: false,
      },
    });
    expect(nextInspection.lifecycle_phase).toBe(initialInspection.lifecycle_phase);
    expect(
      fixture.database
        .query('SELECT kind,id,revision,payload,digest FROM agent_host_state WHERE workspace_id=? ORDER BY kind,id')
        .all(fixture.store.workspaceId),
    ).toEqual(afterCommitRows);
    expect(
      fixture.database
        .query(
          'SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?',
        )
        .get(fixture.store.workspaceId, workId, 1),
    ).toEqual(afterCommitJournal);

    const inspectionRows = () => ({
      host: fixture.database
        .query('SELECT kind,id,revision,payload,digest FROM agent_host_state WHERE workspace_id=? ORDER BY kind,id')
        .all(fixture.store.workspaceId),
      journal: fixture.database
        .query(
          'SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?',
        )
        .get(fixture.store.workspaceId, workId, 1),
    });
    const lease = admittedWork.lease;
    if (!lease) throw Error('inspection expiry fixture has no admitted lease');
    const currentLedgerRow = writerDatabase
      .query(
        "SELECT revision,payload,digest FROM agent_host_state WHERE workspace_id=? AND kind='ledger' AND id='shared'",
      )
      .get(fixture.store.workspaceId) as { revision: number; payload: string; digest: string } | null;
    if (!currentLedgerRow) throw Error('inspection expiry fixture has no persisted ledger');
    const parsedLedger: unknown = JSON.parse(currentLedgerRow.payload);
    const currentLedgerResult = validateCoordinationLedgerV1(parsedLedger);
    if (!currentLedgerResult.ok) throw Error('inspection expiry fixture current ledger is invalid');
    const currentLedger = currentLedgerResult.ledger;
    const expiredAt = new Date(Date.now() - 60_000).toISOString();
    const expiredLedger: CoordinationLedger = {
      ...currentLedger,
      revision: currentLedger.revision + 1,
      tickets: currentLedger.tickets.map((ticket) =>
        ticket.ticket_id === lease.ticket_id ? { ...ticket, expires_at: expiredAt } : ticket,
      ),
      claims: currentLedger.claims.map((claim) =>
        claim.ticket_id === lease.ticket_id && claim.status === 'active'
          ? { ...claim, lease_expires_at: expiredAt }
          : claim,
      ),
    };
    const validatedExpiredLedger = validateCoordinationLedgerV1(expiredLedger);
    if (
      !validatedExpiredLedger.ok ||
      !expiredLedger.tickets.some(
        (ticket) => ticket.ticket_id === lease.ticket_id && ticket.expires_at === expiredAt,
      ) ||
      !expiredLedger.claims.some(
        (claim) =>
          claim.ticket_id === lease.ticket_id && claim.status === 'active' && claim.lease_expires_at === expiredAt,
      )
    )
      throw Error('inspection expiry ledger fixture is invalid');
    const expiredLedgerUpdate = writerDatabase
      .query(
        "UPDATE agent_host_state SET revision=?,payload=?,digest=? WHERE workspace_id=? AND kind='ledger' AND id='shared' AND revision=? AND digest=?",
      )
      .run(
        expiredLedger.revision,
        JSON.stringify(expiredLedger),
        coordinationLedgerDigest(expiredLedger),
        fixture.store.workspaceId,
        currentLedgerRow.revision,
        currentLedgerRow.digest,
      );
    if (expiredLedgerUpdate.changes !== 1) throw Error('inspection expiry ledger fixture CAS failed');
    const beforeExpiredInspection = inspectionRows();
    const expiredInspection = inspectLocalSession(input);
    expect(expiredInspection).toMatchObject({
      diagnosis: {
        reason: 'expired_lease',
        evidence: {
          journal_version: expiredInspection.journal_version,
          work_version: expiredInspection.work_version,
          ledger_version: expiredInspection.ledger_version,
        },
        advisory_routes: [],
        rights_granted: false,
      },
    });
    expect(inspectionRows()).toEqual(beforeExpiredInspection);

    const journalRow = writerDatabase
      .query(
        'SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?',
      )
      .get(fixture.store.workspaceId, workId, 1) as { revision: number; payload: string; digest: string } | null;
    if (!journalRow) throw Error('inspection priority fixture has no persisted journal');
    const parsedJournal: unknown = JSON.parse(journalRow.payload);
    if (!isPlainRecord(parsedJournal)) throw Error('inspection priority fixture journal is invalid');
    const journal = parsedJournal;
    journal.items = [
      {
        issue_id: 'inspection-pending-issue',
        observation: null,
        request: { action_id: 'inspection-pending-action', stage_id: 'review' },
      },
    ];
    const pendingJournalUpdate = writerDatabase
      .query(
        'UPDATE agent_host_mastra_session_ledger SET revision=?,payload=?,digest=? WHERE workspace_id=? AND work_id=? AND attempt=? AND revision=? AND digest=?',
      )
      .run(
        journalRow.revision + 1,
        JSON.stringify(journal),
        canonicalJsonDigest(journal),
        fixture.store.workspaceId,
        workId,
        1,
        journalRow.revision,
        journalRow.digest,
      );
    if (pendingJournalUpdate.changes !== 1) throw Error('inspection priority journal fixture CAS failed');
    const beforePendingInspection = inspectionRows();
    const pendingInspection = inspectLocalSession(input);
    expect(pendingInspection).toMatchObject({
      diagnosis: {
        reason: 'pending_observation',
        evidence: {
          journal_version: pendingInspection.journal_version,
          work_version: pendingInspection.work_version,
          ledger_version: pendingInspection.ledger_version,
        },
        advisory_routes: [],
        rights_granted: false,
      },
    });
    expect(inspectionRows()).toEqual(beforePendingInspection);
    expect(performance.now()).toBeLessThan(deadline);
  } catch (error) {
    errors.push(error);
  }
  try {
    writerDatabase?.close(true);
  } catch (error) {
    errors.push(error);
  }
  try {
    fixture.close({ retainRoot: errors.length > 0 || performance.now() >= deadline });
  } catch (error) {
    errors.push(error);
  }
  if (errors.length === 1) throw errors[0];
  if (errors.length > 1) throw new AggregateError(errors, 'Snapshot inspection and cleanup failed');
});

test('run CLI main forwards parsed arguments and preserves integer and JSON result routes', async () => {
  const { main } = await import('../bin/run.ts');
  const logged: string[] = [];
  const errors: string[] = [];
  const args = ['--project', 'agent', '--workflow', 'review'];
  let received: string[] | undefined;
  const integerExit: { exitCode?: number } = {};
  await main({
    isMain: true,
    args,
    execute: async (forwarded) => {
      received = forwarded;
      return 7;
    },
    io: { log: (value: string) => logged.push(value), error: (value: string) => errors.push(value) },
    exit: integerExit,
  });
  expect(received).toEqual(args);
  expect(integerExit.exitCode).toBe(7);
  expect(logged).toEqual([]);
  expect(errors).toEqual([]);

  const jsonExit: { exitCode?: number } = {};
  await main({
    isMain: true,
    args: ['--inspect'],
    execute: () => ({ status: 'inspected', rights_granted: false }),
    io: { log: (value: string) => logged.push(value), error: (value: string) => errors.push(value) },
    exit: jsonExit,
  });
  expect(jsonExit.exitCode).toBeUndefined();
  expect(logged).toEqual(['{"status":"inspected","rights_granted":false}']);
  expect(errors).toEqual([]);
});

test('run CLI main sanitizes non-Error failures into one blocked diagnostic', async () => {
  const { main } = await import('../bin/run.ts');
  const failures: readonly unknown[] = [
    null,
    undefined,
    false,
    0,
    'fixture-private-marker',
    Symbol('fixture-private-marker'),
    12n,
    [],
    {},
    { message: undefined },
    { message: null },
    { message: 7, code: 17 },
    { message: 'fixture-private-marker', code: 'UNRECOGNIZED-FIXTURE-CODE' },
  ];
  for (const failure of failures) {
    const logged: string[] = [];
    const errors: string[] = [];
    const exit: { exitCode?: number } = {};
    await main({
      isMain: true,
      args: [],
      execute: () => Promise.reject(failure),
      io: { log: (value: string) => logged.push(value), error: (value: string) => errors.push(value) },
      exit,
    });
    expect(exit.exitCode).toBe(1);
    expect(logged).toEqual([]);
    expect(errors).toHaveLength(1);
    const payload: unknown = JSON.parse(errors[0]!);
    expect(payload).toEqual({
      schema: 'VidaAgentRunResult/v1',
      status: 'blocked',
      code: 'GAP-VIDA-RUN-EXECUTION-001',
      message:
        'The requested run was blocked by runtime validation. Next action: inspect the exact work and check its issued contract before retrying.',
    });
  }
});

test('completed readonly release guard blocks only a matching current-work release', () => {
  const workId = 'work-current';
  const matching = {
    schema: 'CoordinationOperation/v1',
    kind: 'release',
    work_id: workId,
    operation_id: 'completed-readonly-release-current',
  };
  const allowed: readonly [string, readonly unknown[] | undefined][] = [
    ['missing ledger', undefined],
    ['empty ledger', []],
    ['missing operation', [null]],
    ['non-record operation', [[]]],
    ['primitive operation', ['release']],
    ['foreign work', [{ ...matching, work_id: 'work-other' }]],
    ['other operation kind', [{ ...matching, kind: 'contour_assurance' }]],
    ['other release identity', [{ ...matching, operation_id: 'session-release-current' }]],
    ['non-string operation identity', [{ ...matching, operation_id: 42 }]],
  ];

  for (const [label, operations] of allowed)
    assert.doesNotThrow(() => requireNoCompletedReadonlyRelease(operations, workId), label);
  assert.throws(
    () => requireNoCompletedReadonlyRelease([matching], workId),
    (error: unknown) => {
      expect(error).toMatchObject({
        code: 'GAP-VIDA-RUN-EXECUTION-001',
        message: 'Captured native completion remains normalization pending; ordinary execution cannot accept it.',
      });
      return true;
    },
  );
});

test('research source reference guards the JSON record and source_id string type', () => {
  const arrayWithIdentifier: unknown = Object.assign([], { source_id: 'source-1' });
  const cases: readonly [string, unknown, boolean][] = [
    ['rich source reference', { source_id: 'source-1', claim: 'A bound source.' }, true],
    ['missing source reference', null, false],
    ['array with an identifier property', arrayWithIdentifier, false],
    ['primitive instead of record', 'source-1', false],
    ['missing identifier', { claim: 'No identifier.' }, false],
    ['numeric identifier', { source_id: 1 }, false],
    ['null identifier', { source_id: null }, false],
  ];

  for (const [label, value, expected] of cases) assert.equal(isResearchSourceReference(value), expected, label);
});

test('recovery operation guard returns a retained operation and rejects a missing one', () => {
  const operation = Object.freeze({ operation_id: 'recovery-1' });
  assert.equal(requireRecoveryOperation(operation), operation);
  assert.throws(
    () => requireRecoveryOperation(null),
    (error: unknown) => error instanceof Error && error.message === 'Recovery review operation is unavailable',
  );
});

test('historical release inspection selects supplied CAS only for apply mode', () => {
  const current = {
    expectedWork: { revision: 1, digest: 'work-current' },
    expectedLedger: { revision: 2, digest: 'ledger-current' },
    expectedJournal: { revision: 3, digest: 'journal-current' },
    expectedMaintenanceGeneration: 4,
    baseline_binding: 'baseline-current',
    receipt_binding: 'receipt-current',
    current_config_binding: 'config-current',
    engine_binding: 'engine-current',
    request_binding: 'request-current',
    preimage_binding: null,
    nativeSessionHandle: 'session-current',
  };
  const supplied = { ...current, request_binding: 'request-supplied' };

  assert.equal(historicalReleaseInspection('apply', supplied, current), supplied);
  assert.equal(historicalReleaseInspection('inspect', supplied, current), current);
  assert.equal(historicalReleaseInspection('apply', undefined, current), current);
});

test('historical context guards preserve only configured action context records', () => {
  const context = { schema: 'ConfiguredContext/v1', digest: 'context-digest', source: 'retained' };
  const arrayHistory: unknown = Object.assign([], {
    schema: 'VidaAgentRunResult/v1',
    next_actions: [],
  });
  const arrayContext: unknown = Object.assign([], { schema: 'ConfiguredContext/v1', digest: 'context-digest' });
  const historyCases: readonly [string, unknown, boolean][] = [
    ['run result record', { schema: 'VidaAgentRunResult/v1', next_actions: [] }, true],
    ['null history', null, false],
    ['array with run result fields', arrayHistory, false],
    ['wrong run-result schema', { schema: 'Other/v1', next_actions: [] }, false],
    ['missing action array', { schema: 'VidaAgentRunResult/v1', next_actions: null }, false],
  ];

  for (const [label, value, expected] of historyCases) assert.equal(isHistoricalRunHistory(value), expected, label);

  assert.deepEqual(
    historicalConfiguredContexts([
      null,
      {},
      { configured_context: null },
      { configured_context: arrayContext },
      { configured_context: { schema: 'Other/v1', digest: 'wrong-context' } },
      { configured_context: { schema: 'ConfiguredContext/v1', digest: 1 } },
      { configured_context: context },
    ]),
    [context],
  );
  assert.equal(requireHistoricalItem(context), context);
  assert.throws(() => requireHistoricalItem(undefined), {
    name: 'Error',
    message: 'Historical context history action differs',
  });
});

test('historical scoped snapshot guard validates ordered entries and readonly owner records', () => {
  const digest = 'a'.repeat(64);
  const present = (entryPath: string, bytes: unknown = 0, sha256: unknown = digest) => ({
    path: entryPath,
    exists: true,
    bytes,
    sha256,
  });
  const absent = (entryPath: string, bytes: unknown = null, sha256: unknown = null) => ({
    path: entryPath,
    exists: false,
    bytes,
    sha256,
  });
  const makeSnapshot = (entries: unknown[], snapshotDigest: unknown = 'snapshot-digest') => ({
    schema: 'ScopedSourceSnapshot/v1',
    entries,
    digest: snapshotDigest,
  });
  const relative = (value: unknown): value is string =>
    typeof value === 'string' && value.startsWith('src/') && !value.includes('\\');
  const valid = makeSnapshot([present('src/a.ts'), absent('src/b.ts')]);
  const arraySnapshot: unknown = Object.assign([], valid);
  const invalidSnapshots: readonly [string, unknown][] = [
    ['non-record snapshot', null],
    ['array with snapshot fields', arraySnapshot],
    ['snapshot extra key', { ...valid, extra: true }],
    ['wrong snapshot schema', { ...valid, schema: 'ScopedSourceSnapshot/v0' }],
    ['empty entries', makeSnapshot([])],
    ['entries over limit', makeSnapshot(Array(513).fill(null))],
    ['non-string snapshot digest', makeSnapshot([present('src/a.ts')], 1)],
    ['non-record entry', makeSnapshot([null])],
    ['entry extra key', makeSnapshot([{ ...present('src/a.ts'), extra: true }])],
    ['relative path refusal', makeSnapshot([present('/outside/file.ts')])],
    ['path over limit', makeSnapshot([present(`src/${'x'.repeat(509)}`)])],
    ['descending entry paths', makeSnapshot([present('src/b.ts'), absent('src/a.ts')])],
    ['entry existence type', makeSnapshot([{ ...present('src/a.ts'), exists: 1 }])],
    ['absent entry bytes must be null', makeSnapshot([absent('src/a.ts', 0)])],
    ['absent entry digest must be null', makeSnapshot([absent('src/a.ts', null, digest)])],
    ['present entry bytes must be a safe integer', makeSnapshot([present('src/a.ts', 1.5)])],
    ['present entry bytes must be nonnegative', makeSnapshot([present('src/a.ts', -1)])],
    ['present entry digest must be a string', makeSnapshot([present('src/a.ts', 0, 1)])],
    ['present entry digest must be lowercase hex', makeSnapshot([present('src/a.ts', 0, 'A'.repeat(64))])],
  ];

  assert.equal(isHistoricalScopedSnapshot(valid, relative), true);
  for (const [label, value] of invalidSnapshots)
    assert.equal(isHistoricalScopedSnapshot(value, relative), false, label);
  assert.equal(readonlyReleaseThreadId({ thread_id: 'thread-1' }), 'thread-1');
  assert.equal(readonlyReleaseThreadId({}), undefined);
  assert.equal(readonlyReleaseThreadId(null), undefined);
  assert.equal(readonlyReleaseThreadId(Object.assign([], { thread_id: 'thread-1' })), undefined);
});

test('run filesystem and selector guards preserve caller-visible decisions', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-run-selector-guards-'));
  try {
    const file = path.join(root, 'regular-file'),
      link = path.join(root, 'directory-link'),
      missing = path.join(root, 'missing');
    writeFileSync(file, 'fixture');
    symlinkSync(root, link, process.platform === 'win32' ? 'junction' : 'dir');

    expect(() => checkedDirectory(root)).not.toThrow();
    expect(() => checkedDirectory(file)).toThrow('Cutover authority directory is unsafe.');
    expect(() => checkedDirectory(link)).toThrow('Cutover authority directory is unsafe.');
    expect(() => checkedDirectory(missing)).toThrow('Cutover authority directory is missing.');
    expect(pathExists(file)).toBe(true);
    expect(pathExists(missing)).toBe(false);
    assert.throws(() => pathExists(path.join(file, 'child')), { code: 'ENOTDIR' });

    expect(compareStrings('a', 'b')).toBe(-1);
    expect(compareStrings('b', 'a')).toBe(1);
    expect(compareStrings('a', 'a')).toBe(0);

    const activeSelector = {
      schema: 'VidaActiveRuntimeSelector/v1',
      generation: 'generation-1',
      runtime: 'bun',
      bundle_root: '/bundle',
      config_path: '/config',
      archive_manifest_sha256: 'a'.repeat(64),
      plan_sha256: 'b'.repeat(64),
    };
    expect(isActiveRuntimeSelectorRecord(activeSelector)).toBe(true);
    expect(isActiveRuntimeSelectorRecord(null)).toBe(false);
    expect(() => recordField(null, 'schema')).toThrow('Cutover authority is invalid.');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('readonly release validators preserve plans, unique matches, arrays and CLI errors', async () => {
  const plan = { schema: 'ReadonlyReleasePlan/v1', request_digest: 'c'.repeat(64) };
  expect(isReadonlyReleasePlan(plan)).toBe(true);
  expect(isReadonlyReleasePlan({ ...plan, schema: 1 })).toBe(false);
  expect(isReadonlyReleasePlan(null)).toBe(false);

  const match = { work_id: 'work-1' };
  expect(requireOneReadonlyReleaseMatch([match])).toBe(match);
  expect(() => requireOneReadonlyReleaseMatch([])).toThrow('Readonly release actual engine completion differs');
  expect(() => requireOneReadonlyReleaseMatch([match, match])).toThrow(
    'Readonly release actual engine completion differs',
  );
  expect(() => requireOneReadonlyReleaseMatch([undefined])).toThrow(
    'Readonly release actual engine completion differs',
  );

  const visited: unknown[] = [];
  expect(
    parseReadonlyReleaseArray(['inspect', 'apply'], (value) => {
      visited.push(value);
      return typeof value === 'string' ? value.toUpperCase() : '';
    }),
  ).toEqual(['INSPECT', 'APPLY']);
  expect(visited).toEqual(['inspect', 'apply']);
  expect(() => parseReadonlyReleaseArray(null, (value) => value)).toThrow(
    'Readonly release actual engine completion differs',
  );

  const args: string[] = [
    '--release-completed-readonly',
    'true',
    '--mode',
    undefined as unknown as string,
    '--project-root',
    '/unused',
    '--request',
    'request.json',
  ];
  await assert.rejects(run(args), { message: 'Readonly release requires mode, exact root and request' });
});

test('run action helpers preserve packet-only, observation, and non-research decisions', () => {
  expect(isPacketOnlyDevelopmentStage({ consumes: ['DevelopmentTaskPacket/v1'] })).toBe(true);
  expect(isPacketOnlyDevelopmentStage({ consumes: ['DevelopmentTaskPacket/v1', 'ImplementationResult/v1'] })).toBe(
    false,
  );

  const item = { request: { action_id: 'delivery-action' }, status: 'issued' };
  const observation = { action_id: 'delivery-action', status: 'reported_complete' };
  expect(addObservationForAction(item, 'different-action', observation)).toBe(item);
  expect(addObservationForAction(item, 'delivery-action', observation)).toEqual({ ...item, observation });

  expect(
    markUncertainResearchStatus({ action_id: 'research-action', status: 'research_preparation_incomplete' }),
  ).toEqual({ action_id: 'research-action', status: 'issued_outcome_uncertain' });
  expect(markUncertainResearchStatus({ action_id: 'research-action', status: 'reported' })).toEqual({
    action_id: 'research-action',
    status: 'reported',
  });

  const activation = { schema: 'InstructionActivationUse/v1' };
  const bindings = [{ instruction_id: 'stage-instruction' }];
  const request: SessionBridgeRequest = {
    schema: 'VidaSessionRequest/v1',
    run_id: 'development-run',
    workflow_id: 'development-workflow',
    wave_index: 0,
    action_id: 'a'.repeat(64),
    assignment_index: 0,
    stage_id: 'development-stage',
    role: 'developer',
    config_digest: 'b'.repeat(64),
    scope_digest: 'c'.repeat(64),
    bindings_manifest_ref: 'd'.repeat(64),
  };
  const described = describeIssuedAction(
    {
      request,
      issue_id: 'development-issue',
      research_activation: { use: activation },
    },
    new Map([[request.action_id, bindings]]),
    [{ id: 'development-stage', kind: 'develop' }],
  );
  expect(described).toMatchObject({
    issue_id: 'development-issue',
    instruction_activation: activation,
    instruction_bindings: bindings,
  });
  expect(described).not.toHaveProperty('research_instruction_activation');
  expect(described).not.toHaveProperty('research_instruction_bindings');
});

test('lease recovery eligibility denies repeat advice while retaining expiry, CAS and redaction diagnostics', async () => {
  const { main } = await import('../bin/run.ts');
  const diagnose = async (message: string): Promise<{ readonly message: string }> => {
    let output = '';
    const sink = new Writable({
      write(chunk: Buffer | string, _encoding, callback) {
        output += chunk.toString();
        callback();
      },
    });
    const io = new Console({ stdout: sink, stderr: sink });
    const exit: { exitCode?: number } = {};
    await main({
      isMain: true,
      args: [],
      execute: async () => {
        throw Error(message);
      },
      io,
      exit,
    });
    expect(exit.exitCode).toBe(1);
    const lines = output.trimEnd().split('\n');
    expect(lines).toHaveLength(1);
    const parsed: unknown = JSON.parse(lines[0]!);
    if (!isPlainRecord(parsed) || typeof parsed.message !== 'string') throw Error('run error result is invalid');
    return { message: parsed.message };
  };
  for (const message of [
    'issued writer outcome must settle before expired lease recovery',
    'issued writer-bound wave must advance before expired lease recovery',
    'expired recovery requires an entirely unissued current wave',
    'failed prewriter recovery: exact expired full-resource ticket and claim differ',
    'failed prewriter owner recovery: retained human Source authority missing',
  ]) {
    const result = await diagnose(message);
    expect(result.message).toContain('Phase: recovery eligibility.');
    expect(result.message).toContain('do not repeat lease recovery');
    expect(result.message).not.toContain('ownership lease expired');
  }
  expect((await diagnose('active ownership lease expired')).message).toContain('ownership lease expired');
  expect((await diagnose('journal CAS changed')).message).toContain('current state revision changed');
  expect((await diagnose('C:/secret/token confidential')).message).not.toContain('confidential');
});
import {
  canonicalJson,
  canonicalJsonDigest,
  isPlainRecord,
  rfc3339TimestampMilliseconds,
} from '../src/contracts/public-ingress.ts';
import { deriveWorkspaceId, loadRuntimeConfig, runtimeConfigDigest } from '../src/index.ts';
import type { WorkItemSelection } from '../src/config/runtime-config.ts';
import { runtimePackageAccess, runtimePackageCodePaths } from '../src/config/runtime-config.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import {
  snapshotDeclaredSources,
  snapshotRuntimePackageSources,
  compareScopedSourceSnapshots,
} from '../src/orchestration/scoped-source-snapshot.ts';
import { sessionActionsForWave } from '../src/orchestration/session-handoff.ts';
import {
  buildSessionBridgeRequest,
  configuredContextForStage,
  MastraSessionBridge,
} from '../src/orchestration/mastra-session-bridge.ts';
import {
  continuationFixture,
  continuationRequestFor,
  trackContinuationFixtureRoot,
} from './helpers/delivered-work-continuation-fixture.ts';
import {
  bindConfiguredFrontierCurrentRuntimeEndpoint,
  seedFrontierHostFixture,
  withConfiguredFrontierHostFixture,
} from './helpers/configured-frontier-host-fixture.ts';
import {
  createPrewriterPreparationObservation,
  runSourcePrewriterPublicActions,
} from './helpers/public-prewriter-fixture.ts';
import { applyDeliveredWorkContinuationPlan } from '../bin/runtime-code-rebind.ts';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function runSuccessfully(args: readonly string[]): Promise<unknown> {
  let result: unknown;
  await assert.doesNotReject(async () => {
    result = await run([...args]);
  });
  assert.notEqual(result, undefined, 'run target resolved without a result');
  return result;
}

test('unknown prepared group retains native raw output when post-return diagnostics fail', async () => {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-run-prepared-unknown-'));
  const program = path.join(root, 'inert.ts');
  const stdout = 'prepared-before-tail\n' + 'x'.repeat(8192);
  const stderr = 'native-stderr-before-tail\n' + 'y'.repeat(8192);
  writeFileSync(
    program,
    `process.stdout.write(${JSON.stringify(stdout)}); process.stderr.write(${JSON.stringify(stderr)});\n`,
  );
  const native = await import('node:child_process');
  const original = native.spawnSync;
  const diagnosticFailure = new Error('terminal evidence write failed');
  let observed: ReturnType<typeof boundedSpawnSync> | undefined;
  let retained = false;
  const failing = spyOn(native, 'spawnSync').mockImplementation((...call: unknown[]) => {
    const [command, args, settings] = call;
    observed = Reflect.apply(original, native, [
      command,
      args,
      { ...requireRecord(settings, 'inert native child settings'), encoding: 'buffer' },
    ]) as ReturnType<typeof boundedSpawnSync>;
    throw diagnosticFailure;
  });
  Object.assign(failing, {
    armPrepared: () => {},
    preparedProcessGroupState: () => 'unknown' as const,
    preparedNativeResult: () => observed,
  });
  let caught: unknown;
  try {
    try {
      invoke(['--project-root', root], {}, program, {
        coverageRole: 'run-admission-prepared',
        onUnknown: () => {
          retained = true;
        },
      });
    } catch (error) {
      caught = error;
    }
  } finally {
    failing.mockRestore();
  }
  expect(caught).toBe(diagnosticFailure);
  expect(retained).toBe(true);
  expect(observed?.status).toBe(0);
  expect(Buffer.isBuffer(observed?.stdout)).toBe(true);
  const failure = caught as Error & { evidenceRoot?: string };
  expect(typeof failure.evidenceRoot).toBe('string');
  const evidence = failure.evidenceRoot!;
  expect(readFileSync(path.join(evidence, 'stdout.log'), 'utf8')).toBe(stdout);
  expect(readFileSync(path.join(evidence, 'stderr.log'), 'utf8')).toBe(stderr);
  const terminal: unknown = JSON.parse(readFileSync(path.join(evidence, 'terminal.json'), 'utf8'));
  expect(terminal).toMatchObject({
    status: 0,
    unknown: true,
    command_outcome_unknown: false,
    process_group_state: 'unknown',
    capture_encoding: 'buffer',
  });
  expect(readFileSync(program, 'utf8')).toContain('prepared-before-tail');
});

type ActiveSelectorState = Parameters<typeof advanceCutoff>[0];

function requireFixtureWorkState(store: HostStateStore, identity: WorkIdentity): WorkState {
  const state = store.readHostStateSnapshot(identity).work;
  if (!state) throw Error('fixture work state is missing');
  return state;
}

type PublicRunChildOptions = {
  readonly budget?: ReturnType<typeof executionBudget>;
  readonly childTimeout?: number;
  readonly bundleRoot?: string;
  readonly onUnknown?: (result?: ReturnType<typeof boundedSpawnSync>) => void;
  readonly coverageRole?: 'run-admission-prepared' | 'run-issue-wave';
};

interface QuerySpyHandle {
  mockRestore(): void;
}

function observeDatabaseQuery(database: Database, observe: (sql: string) => void): QuerySpyHandle {
  const actualQuery: typeof database.query = database.query.bind(database);
  const observedQuery: typeof database.query = (sql) => {
    observe(sql);
    return actualQuery(sql);
  };
  return spyOn(database, 'query').mockImplementation(observedQuery);
}

function failDatabaseQueryRun(database: Database, matches: (sql: string) => boolean, message: string): QuerySpyHandle {
  const actualQuery: typeof database.query = database.query.bind(database);
  const failingQuery: typeof database.query = <Result, Bindings extends SQLQueryBindings | SQLQueryBindings[]>(
    sql: string,
  ): ReturnType<typeof actualQuery<Result, Bindings>> => {
    const statement = actualQuery<Result, Bindings>(sql);
    if (!matches(sql)) return statement;
    return new Proxy(statement, {
      get(target, property, receiver) {
        if (property === 'run')
          return () => {
            throw Error(message);
          };
        const forwardedValue: unknown = Reflect.get(target, property, receiver);
        return forwardedValue;
      },
    });
  };
  return spyOn(database, 'query').mockImplementation(failingQuery);
}

function parseUnpreparedRecoveryResult(value: unknown): Record<string, unknown> {
  const record = requireRecord(value, 'unprepared recovery result');
  if (
    (record.status !== 'unprepared_recovery_inspected' && record.status !== 'unprepared_execution_released') ||
    record.rights_granted !== false ||
    record.runtime_acceptance !== false
  )
    throw Error('unprepared recovery result identity is invalid');
  if (record.status === 'unprepared_recovery_inspected') {
    if (record.next_operation !== 'release_unprepared_work' || !isPlainRecord(record.request))
      throw Error('unprepared recovery inspection result is invalid');
  } else {
    const version = (candidate: unknown): boolean =>
      isPlainRecord(candidate) &&
      typeof candidate.revision === 'number' &&
      Number.isSafeInteger(candidate.revision) &&
      candidate.revision > 0 &&
      typeof candidate.digest === 'string' &&
      /^[a-f0-9]{64}$/u.test(candidate.digest);
    if (
      record.next_operation !== null ||
      typeof record.gap !== 'string' ||
      !version(record.work_version) ||
      !version(record.ledger_version)
    )
      throw Error('unprepared recovery release result is invalid');
  }
  return record;
}

// A interrupted admission fixture: real Host CAS, no Mastra producer or installation.
function unpreparedRecoveryFixture(deadlineAt: number): {
  readonly root: string;
  readonly file: string;
  readonly engineFile: string;
  readonly identity: WorkIdentity;
  readonly workspace: string;
  readonly config: AgentRuntimeConfig;
  readonly input: Parameters<HostStateStore['inspectUnpreparedWorkRecovery']>[0];
  readonly context: { readonly work_id: string; readonly attempt: number; readonly scope_digest: string };
  readonly observed: () => ReturnType<typeof inspectHostWorkspaceDatabase>;
  readonly db: Database;
  readonly store: HostStateStore;
  complete(): void;
  fail(error: unknown): void;
  reopen(): void;
  close(): void;
} {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-unprepared-state-'));
  const yaml = readFileSync(path.join(packageRoot, 'templates/agent-runtime.config.template.v1.yaml'), 'utf8')
    .replaceAll('{{REPOSITORY}}', 'recovery-repository')
    .replaceAll('{{PROJECT}}', 'project')
    .replaceAll('{{BUNDLE}}', 'vida-agent');
  writeFileSync(path.join(root, 'agent-runtime.config.v1.yaml'), yaml);
  writeFileSync(path.join(root, 'baseline.yaml'), yaml);
  writeFileSync(path.join(root, 'AGENTS.md'), 'Fixture policy');
  writeFileSync(path.join(root, 'AGENT.sidecar.md'), 'Fixture sources');
  mkdirSync(path.join(root, 'docs/agent-instructions'), { recursive: true });
  writeFileSync(path.join(root, 'docs/agent-instructions/documentation-policy.v1.json'), '{}');
  const config = loadRuntimeConfig(root),
    project = loadProjectSetContext(root, config, 'recovery-repository', ['project']);
  const workspace = deriveWorkspaceId(project.repository_id, root),
    identity: WorkIdentity = {
      repository_id: project.repository_id,
      project_ids: project.project_ids,
      integrations_digest: project.integrations_digest,
      work_id: 'partial-preparation',
    };
  const source = 'a'.repeat(64),
    resources = ['execution:' + identity.work_id],
    now = new Date().toISOString(),
    expiry = new Date(Date.now() + 3600000).toISOString(),
    owner = 'fixture-owner';
  const item = {
    schema: 'WorkItem/v1',
    id: identity.work_id,
    canonical_kind: 'task',
    intent: 'task_execution',
    project_id: 'project',
    title: 'Interrupted preparation',
    description: 'No issued work',
    risk_flags: [],
    labels: [],
    provider: 'local-project',
    provider_type: 'local',
  };
  const intakePath = '.agent/work/' + identity.work_id + '/local-session-intake.v1.json',
    intakeBytes = Buffer.from(
      JSON.stringify({ schema: 'VidaLocalSessionIntake/v1', work_item: item, native_session_handle: owner }),
    );
  mkdirSync(path.dirname(path.join(root, intakePath)), { recursive: true });
  writeFileSync(path.join(root, intakePath), intakeBytes);
  const binding: WorkState['binding'] = {
    repository_id: identity.repository_id,
    project_ids: [...identity.project_ids],
    integrations_digest: identity.integrations_digest,
    team_id: 'default-development',
    workflow_id: 'task_execution',
    provider_work_item_id: identity.work_id,
    lifecycle_work_id: identity.work_id,
    work_item_digest: canonicalJsonDigest(item),
    work_source_revision: source,
    scope_id: 'scope-preparation',
    scope_contract_digest: 'c'.repeat(64),
    acceptance_manifest_digest: 'd'.repeat(64),
    ac_ids: ['AC-PREPARATION'],
    implementation_paths: ['task.ts'],
    allowed_resources: ['file:task.ts', ...resources],
    config_digest: runtimeConfigDigest(config),
    runtime_source_revision: 'runtime-source',
    schema_digest: 'f'.repeat(64),
    runtime_code_digest: '0'.repeat(64),
  };
  const context = { work_id: identity.work_id, attempt: 1, scope_digest: source };
  const work: WorkState = {
    schema: 'WorkState/v1',
    workspace_id: workspace,
    revision: 1,
    binding,
    contracts: {
      scope: { schema: 'ImplementationScope/v1', path: '.agent/scope.json', sha256: binding.scope_contract_digest },
      acceptance: {
        schema: 'AcceptanceManifest/v1',
        path: '.agent/acceptance.json',
        sha256: binding.acceptance_manifest_digest,
      },
      decisions: [],
    },
    lease: { ticket_id: 'preparation-ticket', thread_id: owner, generation: 1 },
    execution: {
      run_id: sessionBridgeRunId(workspace, context, 'task_execution'),
      input_digest: '1'.repeat(64),
      phase: 'implementation',
      status: 'active',
      assignment_attempts: [],
    },
    lifecycle: {
      schema: 'LifecycleState/v1',
      revision: 1,
      phase: 'INTAKE',
      source_revision: source,
      next_action: 'Trace the accepted request.',
      route: 'R3',
      risk: 'high',
      change_kind: 'fix',
      config_binding: {
        config_digest: binding.config_digest,
        schema_digest: binding.schema_digest,
        runtime_code_digest: binding.runtime_code_digest,
      },
      scope: {
        scope_id: binding.scope_id,
        allowed_paths: ['task.ts'],
        fingerprint_paths: ['task.ts'],
        implementation_paths: ['task.ts'],
        documentation_paths: [],
      },
      seal: null,
      assurance: {
        epoch: 'epoch-1',
        review_generation: 0,
        correction_count: 0,
        review_failure_count: 0,
        delivery_cycle_id: null,
      },
      references: [],
    },
    artifacts: [
      {
        artifact_id: 'local-session-intake',
        schema: 'VidaLocalSessionIntake/v1',
        path: intakePath,
        sha256: createHash('sha256').update(intakeBytes).digest('hex'),
        stage_id: 'intake',
        source_revision: source,
        scope_id: binding.scope_id,
        ac_ids: binding.ac_ids,
      },
    ],
  };
  const ticketId = 'preparation-ticket';
  const ticket: CoordinationLedger['tickets'][number] = {
    schema: 'CoordinationTicket/v1',
    ticket_id: ticketId,
    ...identity,
    thread_id: owner,
    source_revision: source,
    generation: 1,
    sequence: 1,
    contour_keys: resources,
    exclusive_resources: resources,
    status: 'active',
    claim_ids: ['preparation-claim'],
    expires_at: expiry,
    active_resources: resources,
    blocked_resources: [],
    created_at: now,
  };
  const claim: CoordinationLedger['claims'][number] = {
    schema: 'WorkstreamClaim/v1',
    claim_id: 'preparation-claim',
    ticket_id: ticket.ticket_id,
    work_id: identity.work_id,
    thread_id: owner,
    generation: 1,
    resources,
    lease_expires_at: expiry,
    status: 'active',
    created_at: now,
    renewed_at: now,
  };
  const ledger: CoordinationLedger = {
    schema: 'CoordinationLedger/v1',
    workspace_id: workspace,
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
  const file = path.join(root, config.control.work_root, 'session-handoff.v1.sqlite');
  mkdirSync(path.dirname(file), { recursive: true });
  let db = new Database(file, { strict: true }),
    store = new HostStateStore(db, workspace, undefined, undefined, undefined, undefined, root);
  type FixtureOutcome =
    | { readonly status: 'pending' }
    | { readonly status: 'completed' }
    | { readonly status: 'failed'; readonly error: unknown };
  let outcome: FixtureOutcome = { status: 'pending' };
  store.compareAndSwapHostState({ expectedWork: null, expectedLedger: null, nextWork: work, nextLedger: ledger });
  const journalOwner = openConfiguredMastraSessionLedger(root);
  journalOwner.close();
  const engineFile = path.join(root, config.control.work_root, 'mastra-workflows.v1.sqlite'),
    engine = new Database(engineFile);
  engine.exec('CREATE TABLE mastra_workflow_snapshot (workflow_name TEXT,run_id TEXT,snapshot TEXT)');
  engine.close();
  const input = { identity, attempt: 1, operatorHandle: owner, decisionPointer: 'user:fixture-recovery', config };
  const observed = () => inspectHostWorkspaceDatabase(root, path.relative(root, file), workspace);
  return {
    root,
    file,
    engineFile,
    identity,
    workspace,
    config,
    input,
    context,
    observed,
    get db() {
      return db;
    },
    get store() {
      return store;
    },
    complete() {
      outcome = { status: 'completed' };
    },
    fail(error) {
      outcome = { status: 'failed', error };
    },
    reopen() {
      db.close();
      db = new Database(file, { strict: true });
      store = new HostStateStore(db, workspace, undefined, undefined, undefined, undefined, root);
    },
    close() {
      const workOutcome: DatabaseWorkOutcome<void> =
        outcome.status === 'failed' ? { ok: false, error: outcome.error } : { ok: true, value: undefined };
      finishWorkspaceDatabaseClose(
        db,
        workOutcome,
        (database) => {
          try {
            database.close();
          } catch (error) {
            console.error(
              JSON.stringify({
                operation: 'unprepared-recovery-fixture',
                root,
                cleanup: 'retained',
                reason: 'database-close-failed',
              }),
            );
            throw error;
          }
          if (outcome.status === 'completed' && Number.isFinite(deadlineAt) && performance.now() < deadlineAt) {
            console.log(JSON.stringify({ operation: 'unprepared-recovery-fixture', root, cleanup: 'remove-started' }));
            try {
              rmSync(root, { recursive: true, force: true });
              console.log(JSON.stringify({ operation: 'unprepared-recovery-fixture', root, cleanup: 'removed' }));
            } catch (error) {
              console.error(
                JSON.stringify({ operation: 'unprepared-recovery-fixture', root, cleanup: 'remove-failed' }),
              );
              throw error;
            }
          } else {
            console.error(
              JSON.stringify({
                operation: 'unprepared-recovery-fixture',
                root,
                cleanup: 'retained',
                reason:
                  outcome.status === 'failed'
                    ? 'case-failed'
                    : outcome.status === 'pending'
                      ? 'completion-not-marked'
                      : !Number.isFinite(deadlineAt)
                        ? 'invalid-deadline'
                        : 'deadline-expired',
              }),
            );
          }
        },
        'Unprepared recovery fixture work and close failed',
      );
    },
  };
}

describe('unprepared recovery', () => {
  test('current registry descriptor and path metadata are resolved without changing recovery identity', () => {
    const f = unpreparedRecoveryFixture(performance.now() + 5_000);
    try {
      const configPath = path.join(f.root, 'agent-runtime.config.v1.yaml');
      const currentConfig = readFileSync(configPath, 'utf8');
      const metadataChanged = currentConfig
        .replace(
          "  - project_id: 'project'\n    title: 'project'",
          "  - project_id: 'project'\n    title: 'Current recovery descriptor'",
        )
        .replace('    task_prefix: TASK\n', '    task_prefix: RECOVERY\n')
        .replace(
          '    wiki_output_root: .planning/agent-flow/wiki-output\n    internal_root: docs/internal',
          '    wiki_output_root: .planning/agent-flow/recovery-output\n    internal_root: docs/internal',
        );
      if (
        metadataChanged === currentConfig ||
        !metadataChanged.includes("title: 'Current recovery descriptor'") ||
        !metadataChanged.includes('    task_prefix: RECOVERY\n') ||
        !metadataChanged.includes('    wiki_output_root: .planning/agent-flow/recovery-output\n')
      )
        throw Error('current registry metadata fixture did not apply every intended change');
      writeFileSync(configPath, metadataChanged);

      const before = f.observed();
      const beforeWork = before.work.find((row) => row.identity.work_id === f.identity.work_id);
      if (!beforeWork?.state) throw Error('original recovery work state is missing');
      const request = f.store.inspectUnpreparedWorkRecovery(f.input);
      expect(f.observed()).toEqual(before);
      expect(request.identity).toEqual(f.identity);
      expect(request.originalWork.binding.project_ids).toEqual([...f.identity.project_ids]);

      const released = f.store.releaseUnpreparedWork(f.input, request);
      expect(released.work?.execution.status).toBe('suspended');
      expect(released.work?.lease).toBeNull();
      expect(released.work?.execution.run_id).toBe(beforeWork.state.execution.run_id);
      f.complete();
    } catch (error) {
      f.fail(error);
      throw error;
    } finally {
      f.close();
    }
  });

  test('uncompleted fixture close retains its root', () => {
    const f = unpreparedRecoveryFixture(performance.now() + 5_000);
    f.close();
    expect(existsSync(f.root)).toBe(true);
  });

  test('completed fixture close removes its root before the case deadline', () => {
    const f = unpreparedRecoveryFixture(performance.now() + 5_000);
    f.complete();
    f.close();
    expect(existsSync(f.root)).toBe(false);
  });

  test('expired case deadline retains a completed fixture root', () => {
    const f = unpreparedRecoveryFixture(performance.now() - 1);
    f.complete();
    f.close();
    expect(existsSync(f.root)).toBe(true);
  });

  test('fixture close retains undefined body failure and native close cause in order', () => {
    const f = unpreparedRecoveryFixture(performance.now() + 5_000);
    const closeError = new Error('injected native close after real close');
    const nativeClose = f.db.close.bind(f.db);
    const closeSpy = spyOn(f.db, 'close').mockImplementation(() => {
      nativeClose();
      throw closeError;
    });
    f.fail(undefined);
    let didThrow = false;
    let thrown: unknown;
    try {
      f.close();
    } catch (error) {
      didThrow = true;
      thrown = error;
    } finally {
      closeSpy.mockRestore();
    }
    expect(didThrow).toBe(true);
    expect(thrown).toBeInstanceOf(AggregateError);
    if (!(thrown instanceof AggregateError)) throw Error('fixture close did not preserve both failure causes');
    const causes: unknown[] = thrown.errors;
    expect(causes).toHaveLength(2);
    expect(causes[0]).toBe(undefined);
    expect(causes[1]).toBe(closeError);
    expect(existsSync(f.root)).toBe(true);
  });

  test('held maintenance and pending FIFO ownership deny even with matching versions', () => {
    const deadlineAt = performance.now() + 5_000;
    for (const fault of ['maintenance', 'fifo']) {
      const f = unpreparedRecoveryFixture(deadlineAt);
      try {
        if (fault === 'maintenance') {
          const digest = 'a'.repeat(64),
            fence = {
              schema: 'MaintenanceFence/v1',
              workspace_id: f.workspace,
              revision: 1,
              generation: 1,
              status: 'held',
              token_digest: digest,
              binding: {
                schema: 'MaintenanceFenceBinding/v1',
                project_ids: ['project'],
                operation_id: 'fixture-maintenance',
                manifest_digest: digest,
                request_digest: digest,
                bindings_digest: digest,
                closure_digest: digest,
                bundle_digest: digest,
              },
            };
          f.db
            .query('INSERT INTO agent_host_maintenance VALUES(?,?,?,?)')
            .run(f.workspace, 1, JSON.stringify(fence), canonicalJsonDigest(fence));
        } else {
          const row: unknown = f.db
            .query<{ payload: string }, []>("SELECT payload FROM agent_host_state WHERE kind='ledger'")
            .get();
          const payload = requireRecord(row, 'ledger database row').payload;
          if (typeof payload !== 'string') throw Error('ledger database payload is invalid');
          const ledger = requireRecord(parseJsonUnknown(payload), 'ledger payload');
          const validated = validateCoordinationLedgerV1(ledger);
          if (!validated.ok) throw Error('fixture coordination ledger is invalid');
          const revision = ledger.revision;
          const nextSequence = ledger.next_sequence;
          const tickets = ledger.tickets;
          if (typeof revision !== 'number' || typeof nextSequence !== 'number' || !Array.isArray(tickets))
            throw Error('ledger publication fields are invalid');
          const ticket = requireRecord(tickets[0], 'ledger ticket');
          if (ticket.sequence !== 1) throw Error('ledger ticket sequence is invalid');
          ledger.revision = revision + 1;
          ledger.next_sequence = 3;
          ticket.sequence = 2;
          tickets.push({
            ...ticket,
            ticket_id: 'earlier-queue',
            thread_id: 'foreign-owner',
            sequence: 1,
            status: 'queued',
            claim_ids: [],
            active_resources: [],
            expires_at: null,
          });
          f.db
            .query("UPDATE agent_host_state SET revision=?,payload=?,digest=? WHERE kind='ledger'")
            .run(revision + 1, JSON.stringify(ledger), canonicalJsonDigest(ledger));
        }
        const before = f.observed();
        expect(() => f.store.inspectUnpreparedWorkRecovery(f.input)).toThrow(
          fault === 'maintenance' ? /maintenance fence/ : /FIFO conflict/,
        );
        expect(f.observed()).toEqual(before);
        f.complete();
      } catch (error) {
        f.fail(error);
        throw error;
      } finally {
        f.close();
      }
    }
  });
  test('failure between Work and Ledger publication rolls back and same request can retry', () => {
    const deadlineAt = performance.now() + 5_000;
    const f = unpreparedRecoveryFixture(deadlineAt);
    let spy: QuerySpyHandle | undefined;
    try {
      const request = f.store.inspectUnpreparedWorkRecovery(f.input);
      const before = f.observed();
      let updates = 0;
      spy = failDatabaseQueryRun(
        f.db,
        (sql) => sql.startsWith('UPDATE agent_host_state SET revision=') && ++updates === 2,
        'injected ledger publication failure',
      );
      expect(() => f.store.releaseUnpreparedWork(f.input, request)).toThrow(/injected ledger publication/);
      spy.mockRestore();
      spy = undefined;
      expect(f.observed()).toEqual(before);
      const retried = f.store.releaseUnpreparedWork(f.input, request);
      if (!retried.work) throw Error('retry work state is missing');
      expect(retried.work.execution.status).toBe('suspended');
      expect(retried.work.lease).toBeNull();
      f.complete();
    } catch (error) {
      f.fail(error);
      throw error;
    } finally {
      spy?.mockRestore();
      f.close();
    }
  });
  test('read-only CLI exposes a retained request; release and lost-ack retry preserve original evidence', async () => {
    const started = performance.now();
    const deadlineAt = started + 8_000;
    const f = unpreparedRecoveryFixture(deadlineAt);
    const phase = (name: string) =>
      console.log(
        JSON.stringify({
          operation: 'unprepared-recovery-sequence',
          phase: name,
          elapsed_ms: performance.now() - started,
        }),
      );
    phase('fixture-created');
    try {
      const beforeDiagnosis = f.observed();
      phase('diagnosis-before-observed');
      const diagnosis = inspectLocalSession({
        repositoryRoot: f.root,
        config: f.config,
        projectIds: f.identity.project_ids,
        integrationsDigest: f.identity.integrations_digest,
        workId: f.identity.work_id,
        attempt: 1,
      });
      phase('diagnosis-returned');
      expect(diagnosis).toMatchObject({
        diagnosis: {
          reason: 'preparation_incomplete',
          evidence: {
            journal_version: diagnosis.journal_version,
            work_version: diagnosis.work_version,
            ledger_version: diagnosis.ledger_version,
          },
          advisory_routes: ['recover-unprepared-work'],
          rights_granted: false,
        },
      });
      expect(diagnosis.journal_version).toBeNull();
      expect(diagnosis.work_version).not.toBeNull();
      expect(diagnosis.lease).not.toBeNull();
      const diagnosedState = f.observed();
      expect(diagnosedState).toEqual(beforeDiagnosis);
      phase('diagnosis-complete');
      const baseline = readFileSync(path.join(f.root, 'baseline.yaml'));
      const delivered = baseline.toString('utf8').replace('config_revision: 1', 'config_revision: 2');
      writeFileSync(path.join(f.root, 'agent-runtime.config.v1.yaml'), delivered);
      expect(loadRuntimeConfig(f.root).config_revision).toBe(2);
      expect(f.config.config_revision).toBe(1);
      const before = diagnosedState;
      const originalWork = before.work[0];
      const originalTicket = before.ledger?.tickets[0];
      if (!originalWork || !originalTicket || !before.ledger || !before.ledger_version)
        throw Error('seeded recovery work or ledger is missing');
      expect(before.work).toHaveLength(1);
      expect(before.ledger.tickets).toHaveLength(1);
      expect(before.ledger.claims).toHaveLength(1);
      expect(
        f.db.query('SELECT COUNT(*) AS count FROM agent_host_maintenance WHERE workspace_id=?').get(f.workspace),
      ).toEqual({ count: 0 });
      const expectedRequest = {
        identity: f.identity,
        attempt: 1,
        operatorHandle: f.input.operatorHandle,
        decisionPointer: f.input.decisionPointer,
        expectedWork: originalWork.version,
        expectedLedger: before.ledger_version,
        expectedMaintenanceGeneration: 0,
        originalWork: originalWork.state,
        originalTicket,
        originalClaims: before.ledger.claims,
      };
      const base = {
        identity: f.identity,
        attempt: 1,
        baselinePath: 'baseline.yaml',
        decisionPointer: f.input.decisionPointer,
      };
      writeFileSync(path.join(f.root, 'inspect.json'), JSON.stringify(base));
      const args = [
        '--recover-unprepared-work',
        'true',
        '--mode',
        'inspect',
        '--project-root',
        f.root,
        '--native-session-handle',
        f.input.operatorHandle,
        '--request',
        'inspect.json',
      ];
      const inspectedResult = await runSuccessfully(args);
      phase('public-inspect-returned');
      const inspected = parseUnpreparedRecoveryResult(inspectedResult);
      const inspectedEnvelope = requireRecord(inspected.request, 'unprepared recovery request envelope');
      if (
        inspected.next_operation !== 'release_unprepared_work' ||
        inspected.rights_granted !== false ||
        !isPlainRecord(inspectedEnvelope.request)
      )
        throw Error('unprepared recovery inspection result is invalid');
      const inspectedRequest = inspectedEnvelope.request;
      expect(inspectedRequest).toEqual(expectedRequest);
      expect(f.observed()).toEqual(before);
      phase('inspect-complete');
      writeFileSync(path.join(f.root, 'apply.json'), JSON.stringify(inspectedEnvelope));
      const apply = args.map((value, index) =>
        args[index - 1] === '--mode' ? 'apply' : args[index - 1] === '--request' ? 'apply.json' : value,
      );
      const releasedResult = await runSuccessfully(apply);
      phase('public-apply-returned');
      const released = parseUnpreparedRecoveryResult(releasedResult);
      if (released.status !== 'unprepared_execution_released' || released.rights_granted !== false)
        throw Error('unprepared recovery release result is invalid');
      const after = f.observed();
      const matchingWork = after.work.find((row) => row.identity.work_id === f.identity.work_id);
      if (!matchingWork?.state || !after.ledger) throw Error('released work or ledger is missing');
      const state = matchingWork.state;
      const beforeWork = before.work[0];
      if (!beforeWork) throw Error('before work snapshot is missing');
      expect(state.lease).toBeNull();
      expect(state.execution.status).toBe('suspended');
      expect(state.artifacts).toEqual(beforeWork.state.artifacts);
      expect(state.binding).toEqual(beforeWork.state.binding);
      expect(state.execution.run_id).toBe(beforeWork.state.execution.run_id);
      expect(after.journals).toEqual(before.journals);
      phase('apply-complete');
      const operation = after.ledger.operations.find(
        (item) => item.kind === 'release' && item.ticket_id === expectedRequest.originalTicket.ticket_id,
      );
      if (!operation || typeof operation.created_at !== 'string') throw Error('release operation is missing');
      expect(rfc3339TimestampMilliseconds(operation.created_at)).not.toBeNull();
      const releasedClaims = after.ledger.claims.filter((item) => item.ticket_id === operation.ticket_id);
      expect(releasedClaims.length).toBe(expectedRequest.originalClaims.length);
      for (const claim of releasedClaims) {
        expect(claim.status).toBe('released');
        expect(claim.renewed_at).toBe(operation.created_at);
      }
      f.reopen();
      const retriedResult = await runSuccessfully(apply);
      phase('public-retry-returned');
      const retried = parseUnpreparedRecoveryResult(retriedResult);
      expect(retried.work_version).toEqual(released.work_version);
      expect(retried.ledger_version).toEqual(released.ledger_version);
      expect(f.observed()).toEqual(after);
      phase('retry-complete');
      expect(readFileSync(path.join(f.root, 'baseline.yaml'))).toEqual(baseline);
      expect(readFileSync(path.join(f.root, 'agent-runtime.config.v1.yaml'), 'utf8')).toBe(delivered);
      writeFileSync(
        path.join(f.root, 'changed.json'),
        JSON.stringify({ ...inspectedEnvelope, decisionPointer: 'user:changed' }),
      );
      await Promise.resolve(
        expect(
          run(apply.map((value, index) => (apply[index - 1] === '--request' ? 'changed.json' : value))),
        ).rejects.toThrow(),
      );
      phase('changed-request-rejected');
      expect(f.observed()).toEqual(after);
      phase('changed-request-denied');
      f.complete();
    } catch (error) {
      f.fail(error);
      throw error;
    } finally {
      f.close();
    }
  }, 8_000);
  test('shape-valid impossible retained timestamp denies exact retry without effects', () => {
    const deadlineAt = performance.now() + 5_000;
    const f = unpreparedRecoveryFixture(deadlineAt);
    try {
      const request = f.store.inspectUnpreparedWorkRecovery(f.input);
      f.store.releaseUnpreparedWork(f.input, request);
      const row: unknown = f.db
        .query<{ payload: string }, []>("SELECT payload FROM agent_host_state WHERE kind='ledger'")
        .get();
      const payload = requireRecord(row, 'ledger database row').payload;
      if (typeof payload !== 'string') throw Error('ledger database payload is invalid');
      const ledger = requireRecord(parseJsonUnknown(payload), 'ledger payload');
      const validated = validateCoordinationLedgerV1(ledger);
      if (!validated.ok || !Array.isArray(ledger.operations)) throw Error('fixture coordination ledger is invalid');
      const operation = ledger.operations
        .map((item: unknown) => requireRecord(item, 'ledger operation'))
        .find((item) => item.kind === 'release' && item.ticket_id === request.originalTicket.ticket_id);
      if (!operation) throw Error('release operation is missing');
      expect(operation).toBeDefined();
      operation.created_at = '2026-02-31T00:00:00Z';
      f.db
        .query("UPDATE agent_host_state SET payload=?,digest=? WHERE kind='ledger'")
        .run(JSON.stringify(ledger), canonicalJsonDigest(ledger));
      f.reopen();
      const before = f.observed();
      expect(() => f.store.releaseUnpreparedWork(f.input, request)).toThrow(
        'unprepared recovery operation timestamp invalid',
      );
      expect(f.observed()).toEqual(before);
      f.complete();
    } catch (error) {
      f.fail(error);
      throw error;
    } finally {
      f.close();
    }
  });
  test.each([
    ['project', 'project identity'],
    ['integration', 'integration identity'],
    ['storage', 'storage root'],
  ] as const)('retained apply rejects current selected %s drift (%s) without effects', async (fault) => {
    const deadlineAt = performance.now() + 5_000;
    const f = unpreparedRecoveryFixture(deadlineAt);
    try {
      const base = {
        identity: f.identity,
        attempt: 1,
        baselinePath: 'baseline.yaml',
        decisionPointer: f.input.decisionPointer,
      };
      writeFileSync(path.join(f.root, 'inspect.json'), JSON.stringify(base));
      const args = [
        '--recover-unprepared-work',
        'true',
        '--mode',
        'inspect',
        '--project-root',
        f.root,
        '--native-session-handle',
        f.input.operatorHandle,
        '--request',
        'inspect.json',
      ];
      const inspected = parseUnpreparedRecoveryResult(await run(args));
      const inspectedEnvelope = requireRecord(inspected.request, 'unprepared recovery request envelope');
      if (!isPlainRecord(inspectedEnvelope.request)) throw Error('unprepared recovery inspection request is invalid');
      const currentRequest = f.store.inspectUnpreparedWorkRecovery(f.input);
      expect(inspectedEnvelope.request).toEqual({ ...currentRequest });
      writeFileSync(path.join(f.root, 'apply.json'), JSON.stringify(inspectedEnvelope));
      const baseline = readFileSync(path.join(f.root, 'baseline.yaml'));
      const current = baseline.toString('utf8').replace('config_revision: 1', 'config_revision: 2');
      const delivered =
        fault === 'project'
          ? current.replaceAll("'project'", "'other'")
          : fault === 'integration'
            ? current.replace('tenant_id: local', 'tenant_id: changed')
            : current.replaceAll('work_root: .agent/work', 'work_root: .agent/other');
      writeFileSync(path.join(f.root, 'agent-runtime.config.v1.yaml'), delivered);
      expect(loadRuntimeConfig(f.root).config_revision).toBe(2);
      const before = f.observed(),
        engine = readFileSync(f.engineFile);
      expect(() => f.store.releaseUnpreparedWork(f.input, currentRequest)).toThrow();
      expect(f.observed()).toEqual(before);
      const apply = args.map((value, index) =>
        args[index - 1] === '--mode' ? 'apply' : args[index - 1] === '--request' ? 'apply.json' : value,
      );
      await Promise.resolve(expect(run(apply)).rejects.toThrow());
      expect(f.observed()).toEqual(before);
      expect(readFileSync(f.engineFile)).toEqual(engine);
      expect(readFileSync(path.join(f.root, 'baseline.yaml'))).toEqual(baseline);
      expect(readFileSync(path.join(f.root, 'agent-runtime.config.v1.yaml'), 'utf8')).toBe(delivered);
      expect(existsSync(path.join(f.root, '.agent/other/session-handoff.v1.sqlite'))).toBe(false);
      f.complete();
    } catch (error) {
      f.fail(error);
      throw error;
    } finally {
      f.close();
    }
  });
  test('stale Work Ledger maintenance and foreign caller deny without changes', () => {
    const deadlineAt = performance.now() + 5_000;
    const f = unpreparedRecoveryFixture(deadlineAt);
    try {
      const request = f.store.inspectUnpreparedWorkRecovery(f.input),
        before = f.observed();
      for (const change of [
        { expectedWork: { ...request.expectedWork, revision: 99 } },
        { expectedLedger: { ...request.expectedLedger, revision: 99 } },
        { expectedMaintenanceGeneration: 99 },
        { operatorHandle: 'foreign' },
        { attempt: 2 },
      ]) {
        expect(() => f.store.releaseUnpreparedWork(f.input, { ...request, ...change })).toThrow();
        expect(f.observed()).toEqual(before);
      }
      expect(() => f.store.inspectUnpreparedWorkRecovery({ ...f.input, operatorHandle: 'foreign' })).toThrow(
        /same-owner/,
      );
      expect(f.observed()).toEqual(before);
      f.complete();
    } catch (error) {
      f.fail(error);
      throw error;
    } finally {
      f.close();
    }
  });
  test.each([
    ['missing', 'missing engine database'],
    ['journal', 'retained session journal row'],
    ['base', 'surviving base snapshot'],
    ['alias', 'unknown alias snapshot'],
    ['malformed', 'malformed snapshot'],
    ['correction', 'corrective recovery row'],
  ] as const)('%s (%s) denies inspection with custody intact', (fault) => {
    const deadlineAt = performance.now() + 5_000;
    const f = unpreparedRecoveryFixture(deadlineAt);
    try {
      if (fault === 'missing') unlinkSync(f.engineFile);
      else if (fault === 'journal') {
        const retained = {
          schema: 'MastraSessionLedger/v1',
          workspace_id: f.workspace,
          work_id: f.identity.work_id,
          attempt: 1,
          run_id: requireFixtureWorkState(f.store, f.identity).execution.run_id,
          step_id: null,
          items: [],
          completed: [],
        };
        f.db
          .query('INSERT INTO agent_host_mastra_session_ledger VALUES(?,?,?,?,?,?)')
          .run(f.workspace, f.identity.work_id, 1, 1, JSON.stringify(retained), canonicalJsonDigest(retained));
      } else if (fault === 'correction') {
        f.db.exec(
          'CREATE TABLE agent_host_corrective_recovery (workspace_id TEXT,work_id TEXT,attempt INTEGER,generation INTEGER,payload TEXT,digest TEXT)',
        );
        f.db
          .query('INSERT INTO agent_host_corrective_recovery VALUES(?,?,?,?,?,?)')
          .run(f.workspace, f.identity.work_id, 1, 1, '{}', 'a'.repeat(64));
      } else {
        const engine = new Database(f.engineFile),
          runId =
            fault === 'base'
              ? requireFixtureWorkState(f.store, f.identity).execution.run_id
              : 'unknown-corrective-alias';
        const state = {
          work_id: f.identity.work_id,
          attempt: 1,
          workflow_id: 'task_execution',
          scope_digest: f.context.scope_digest,
          config_digest: runtimeConfigDigest(f.config),
          selection: {
            team: 'default-development',
            kind: 'task',
            intent: 'task_execution',
            project: 'project',
            risk_flags: [],
            labels: [],
          },
          observations: [],
        };
        engine
          .query('INSERT INTO mastra_workflow_snapshot VALUES(?,?,?)')
          .run(
            'task_execution',
            runId,
            fault === 'malformed' ? '{}' : JSON.stringify({ runId, status: 'suspended', context: { input: state } }),
          );
        engine.close();
      }
      const before = f.observed();
      expect(() => f.store.inspectUnpreparedWorkRecovery(f.input)).toThrow();
      expect(f.observed()).toEqual(before);
      f.complete();
    } catch (error) {
      f.fail(error);
      throw error;
    } finally {
      f.close();
    }
  });
  test.each(['unrelated', 'same-run', 'same-work', 'malformed', 'null', 'json5'])(
    'binary snapshot %s preserves absence controls and engine custody',
    (fault: string) => {
      const deadlineAt = performance.now() + 5_000;
      const f = unpreparedRecoveryFixture(deadlineAt);
      try {
        const workId = fault === 'same-work' ? f.identity.work_id : 'unrelated-work';
        const attempt = fault === 'same-work' ? 2 : 1;
        const runId =
          fault === 'same-run'
            ? requireFixtureWorkState(f.store, f.identity).execution.run_id
            : sessionBridgeRunId(f.workspace, { ...f.context, work_id: workId, attempt }, 'task_execution');
        if (fault === 'same-work')
          expect(runId).not.toBe(requireFixtureWorkState(f.store, f.identity).execution.run_id);
        if (fault === 'same-run') expect(workId).not.toBe(f.identity.work_id);
        const state = {
          work_id: workId,
          attempt,
          workflow_id: 'task_execution',
          scope_digest: f.context.scope_digest,
          config_digest: runtimeConfigDigest(f.config),
          selection: {
            team: 'default-development',
            kind: 'task',
            intent: 'task_execution',
            project: 'project',
            risk_flags: [],
            labels: [],
          },
          observations: [],
        };
        const snapshot = JSON.stringify({ runId, status: 'success', context: { input: state } });
        const engine = new Database(f.engineFile);
        try {
          if (['malformed', 'null', 'json5'].includes(fault)) {
            engine
              .query('INSERT INTO mastra_workflow_snapshot VALUES(?,?,?)')
              .run(
                'task_execution',
                runId,
                fault === 'null'
                  ? null
                  : fault === 'malformed'
                    ? Buffer.from([255, 238])
                    : snapshot.replace('{', '{/* comment */'),
              );
          } else {
            engine
              .query('INSERT INTO mastra_workflow_snapshot VALUES(?,?,jsonb(?))')
              .run('task_execution', runId, snapshot);
            const storageRow: unknown = engine
              .query<{ kind: string }, []>('SELECT typeof(snapshot) AS kind FROM mastra_workflow_snapshot')
              .get();
            expect(requireRecord(storageRow, 'engine storage row').kind).toBe('blob');
          }
        } finally {
          engine.close();
        }
        const before = f.observed(),
          bytes = readFileSync(f.engineFile);
        if (fault === 'unrelated') {
          const request = f.store.inspectUnpreparedWorkRecovery(f.input);
          expect(f.observed()).toEqual(before);
          const released = f.store.releaseUnpreparedWork(f.input, request);
          if (!released.work) throw Error('unrelated recovery work state is missing');
          expect(released.work.execution.status).toBe('suspended');
        } else {
          expect(() => f.store.inspectUnpreparedWorkRecovery(f.input)).toThrow();
          expect(f.observed()).toEqual(before);
        }
        expect(readFileSync(f.engineFile)).toEqual(bytes);
        f.complete();
      } catch (error) {
        f.fail(error);
        throw error;
      } finally {
        f.close();
      }
    },
  );
  test('oversized engine snapshots deny before any payload census fetch', () => {
    const deadlineAt = performance.now() + 5_000;
    const f = unpreparedRecoveryFixture(deadlineAt);
    let guard: QuerySpyHandle | undefined;
    try {
      const engine = new Database(f.engineFile);
      try {
        engine
          .query('INSERT INTO mastra_workflow_snapshot VALUES(?,?,?)')
          .run('unrelated', 'unrelated', 'x'.repeat(8 * 1024 * 1024 + 1));
      } finally {
        engine.close();
      }
      const before = f.observed();
      let payloadFetches = 0;
      guard = observeDatabaseQuery(f.db, (sql) => {
        if (sql.startsWith('SELECT workflow_name,run_id,')) payloadFetches++;
      });
      expect(() => f.store.inspectUnpreparedWorkRecovery(f.input)).toThrow('census bytes exceed bound');
      expect(payloadFetches).toBe(0);
      expect(f.observed()).toEqual(before);
      guard.mockRestore();
      guard = undefined;
      f.complete();
    } catch (error) {
      f.fail(error);
      throw error;
    } finally {
      guard?.mockRestore();
      f.close();
    }
  });

  test('decoded JSONB census bytes deny before fetching payloads even when storage fits', () => {
    const deadlineAt = performance.now() + 5_000;
    const f = unpreparedRecoveryFixture(deadlineAt);
    let guard: QuerySpyHandle | undefined;
    try {
      const engine = new Database(f.engineFile);
      try {
        engine
          .query('INSERT INTO mastra_workflow_snapshot VALUES(?,?,jsonb(?))')
          .run('unrelated', 'unrelated', JSON.stringify({ padding: Array(1800000).fill(null) }));
        const size = engine
          .query<{ stored: number; decoded: number }, []>(
            'SELECT length(CAST(snapshot AS BLOB)) AS stored, length(CAST(json(snapshot) AS BLOB)) AS decoded FROM mastra_workflow_snapshot',
          )
          .get();
        if (!size) throw Error('engine snapshot size row is missing');
        expect(size.stored).toBeLessThan(8 * 1024 * 1024);
        expect(size.decoded).toBeGreaterThan(8 * 1024 * 1024);
      } finally {
        engine.close();
      }
      const before = f.observed(),
        bytes = readFileSync(f.engineFile);
      let payloadFetches = 0;
      guard = observeDatabaseQuery(f.db, (sql) => {
        if (sql.startsWith('SELECT workflow_name,run_id,')) payloadFetches++;
      });
      expect(() => f.store.inspectUnpreparedWorkRecovery(f.input)).toThrow('decoded census bytes exceed bound');
      expect(payloadFetches).toBe(0);
      expect(f.observed()).toEqual(before);
      expect(readFileSync(f.engineFile)).toEqual(bytes);
      guard.mockRestore();
      guard = undefined;
      f.complete();
    } catch (error) {
      f.fail(error);
      throw error;
    } finally {
      guard?.mockRestore();
      f.close();
    }
  });

  test('pending and UNKNOWN producer markers block recovery and remain untouched', () => {
    const deadlineAt = performance.now() + 5_000;
    for (const status of ['reserved', 'commit_unknown']) {
      const f = unpreparedRecoveryFixture(deadlineAt);
      try {
        const marker = {
          schema: 'OperationReservation/v1',
          store_id: 'vida-session-producers',
          operation_key: 'b'.repeat(64),
          request_digest: 'c'.repeat(64),
          revision: 1,
          fencing_token: randomUUID(),
          status,
          created_at: new Date().toISOString(),
          ...(status === 'commit_unknown' ? { terminal_revision: 2 } : {}),
        };
        const generation = randomUUID();
        f.db.query('INSERT INTO agent_host_governance_stores VALUES(?,?,?,?)').run(
          f.workspace,
          marker.store_id,
          generation,
          canonicalJsonDigest({
            workspace_id: f.workspace,
            store_id: marker.store_id,
            kind: 'store',
            record_key: generation,
            revision: 1,
            payload: null,
          }),
        );
        f.db.query('INSERT INTO agent_host_governance VALUES(?,?,?,?,?,?,?)').run(
          f.workspace,
          marker.store_id,
          'operation',
          marker.operation_key,
          status === 'reserved' ? 1 : 2,
          JSON.stringify(marker),
          canonicalJsonDigest({
            workspace_id: f.workspace,
            store_id: marker.store_id,
            kind: 'operation',
            record_key: marker.operation_key,
            revision: status === 'reserved' ? 1 : 2,
            payload: marker,
          }),
        );
        const before = f.observed();
        expect(() => f.store.inspectUnpreparedWorkRecovery(f.input)).toThrow(/pending or unknown/);
        expect(f.observed()).toEqual(before);
        f.complete();
      } catch (error) {
        f.fail(error);
        throw error;
      } finally {
        f.close();
      }
    }
  });
  test("producer reservation cannot race recovery apply's Host-state writer fence", () => {
    const deadlineAt = performance.now() + 5_000;
    const f = unpreparedRecoveryFixture(deadlineAt);
    let peer: ReturnType<typeof openConfiguredMastraSessionLedger> | undefined;
    let spy: QuerySpyHandle | undefined;
    try {
      const request = f.store.inspectUnpreparedWorkRecovery(f.input);
      peer = openConfiguredMastraSessionLedger(f.root);
      const activePeer = peer;
      const originalRunId = request.originalWork.execution.run_id;
      if (!originalRunId) throw Error('recovery run identity is missing');
      let attempted = false;
      spy = observeDatabaseQuery(f.db, (sql) => {
        if (sql.startsWith('SELECT workspace_id,kind,id,revision,digest,') && !attempted) {
          attempted = true;
          expect(f.db.inTransaction).toBe(true);
          expect(() =>
            activePeer.beginSessionProducer({
              projectIds: ['project'],
              selection: {
                team: 'default-development',
                kind: 'task',
                intent: 'task_execution',
                project: 'project',
                risk_flags: [],
                labels: [],
              },
              context: f.context,
              workflowId: 'task_execution',
              runId: originalRunId,
              phase: 'start',
            }),
          ).toThrow(/locked|busy/i);
        }
      });
      f.store.releaseUnpreparedWork(f.input, request);
      expect(attempted).toBe(true);
      expect(f.observed().governance).toEqual([]);
      spy.mockRestore();
      spy = undefined;
      peer.close();
      peer = undefined;
      f.complete();
    } catch (error) {
      f.fail(error);
      throw error;
    } finally {
      spy?.mockRestore();
      peer?.close();
      f.close();
    }
  });
});
const repositoryRoot = mkdtempSync(path.join(tmpdir(), 'vida-run-uninitialized-'));
let sharedRunOutcomeUnknown = false;
function closeUninitializedRunFixture(): void {
  if (sharedRunOutcomeUnknown) {
    console.error(
      JSON.stringify({
        operation: 'uninitialized-run-fixture',
        root: repositoryRoot,
        cleanup: 'retained',
        reason: 'child-outcome-unknown',
      }),
    );
    return;
  }
  rmSync(repositoryRoot, { recursive: true, force: true });
}
afterAll(closeUninitializedRunFixture);
writeFileSync(
  path.join(repositoryRoot, 'agent-runtime.config.v1.yaml'),
  readFileSync(path.join(packageRoot, 'templates/agent-runtime.config.template.v1.yaml'), 'utf8')
    .replaceAll('{{REPOSITORY}}', 'fixture-repository')
    .replaceAll('{{PROJECT}}', 'fixture-project')
    .replaceAll('{{BUNDLE}}', 'vida-agent'),
);
writeFileSync(path.join(repositoryRoot, 'AGENTS.md'), '# Uninitialized fixture\n');
writeFileSync(path.join(repositoryRoot, 'AGENT.sidecar.md'), '# Uninitialized fixture\n');
const launcher = path.join(packageRoot, 'bin', 'run.ts');
const mutationMode = process.env.AGENT_RUNTIME_MUTATION_PART === 'bun';
const v8CoverageMode = process.env.AGENT_RUNTIME_V8_COVERAGE === '1';
const nativeCoverageMode = process.env.AGENT_RUNTIME_NATIVE_COVERAGE_MAIN === '1';
const ordinaryDescribe = mutationMode ? describe.skip : describe;

// `mock.module` changes Bun's process-wide module registry; keep fault injection isolated from sibling tests.
test.serial('durable controller publication preserves cleanup and afterimage failures', async () => {
  const root = originalFs.mkdtempSync(path.join(tmpdir(), 'vida-durable-fault-'));
  let assertionsPassed = false;
  try {
    const target = path.join(root, 'occupied');
    originalFs.mkdirSync(target);
    expect(() => writeDurable(target, { schema: 'FixtureController/v1' })).toThrow();
    expect(originalFs.readdirSync(root)).toEqual(['occupied']);
    expect(originalFs.readdirSync(target)).toEqual([]);

    for (const cleanupCode of ['EIO', 'ENOENT'] as const) {
      const faultTarget = path.join(root, `fault-${cleanupCode}.json`);
      const bodyError = Object.assign(new Error('injected controller fsync failure'), { code: 'EIO' });
      const cleanupError = Object.assign(new Error(`injected pending unlink ${cleanupCode}`), {
        code: cleanupCode,
      });
      const events: string[] = [];
      let pendingPath: string | undefined;
      let ownedFd: number | undefined;

      try {
        await mock.module('node:fs', () => ({
          ...originalFs,
          openSync(...args: Parameters<typeof originalFs.openSync>): number {
            const file = args[0];
            const fd = originalFs.openSync(...args);
            if (typeof file === 'string' && file.startsWith(`${faultTarget}.pending-`)) {
              pendingPath = file;
              ownedFd = fd;
              events.push('open');
            }
            return fd;
          },
          writeFileSync(
            ...args: Parameters<typeof originalFs.writeFileSync>
          ): ReturnType<typeof originalFs.writeFileSync> {
            if (typeof args[0] === 'number' && args[0] === ownedFd) events.push('write');
            return originalFs.writeFileSync(...args);
          },
          fsyncSync(fd: number): void {
            if (fd === ownedFd) {
              events.push('fsync');
              throw bodyError;
            }
            return originalFs.fsyncSync(fd);
          },
          closeSync(fd: number): void {
            if (fd === ownedFd) events.push('close');
            return originalFs.closeSync(fd);
          },
          unlinkSync(file: Parameters<typeof originalFs.unlinkSync>[0]): void {
            if (file === pendingPath) {
              events.push('unlink');
              if (cleanupCode === 'ENOENT') originalFs.unlinkSync(file);
              throw cleanupError;
            }
            return originalFs.unlinkSync(file);
          },
        }));

        let outcome: unknown;
        try {
          writeDurable(faultTarget, { schema: 'FixtureController/v1' });
        } catch (error) {
          outcome = error;
        }
        expect(events).toEqual(['open', 'write', 'fsync', 'close', 'unlink']);
        expect(pendingPath).toBeDefined();
        if (!pendingPath) throw new Error('durable writer did not expose its owned pending path');
        if (cleanupCode === 'ENOENT') expect(originalFs.existsSync(pendingPath)).toBe(false);
        else {
          expect(originalFs.existsSync(pendingPath)).toBe(true);
          expect(originalFs.readFileSync(pendingPath)).toEqual(
            Buffer.from('{\n  "schema": "FixtureController/v1"\n}\n'),
          );
        }
        if (cleanupCode === 'EIO') {
          expect(outcome).toBeInstanceOf(AggregateError);
          expect((outcome as AggregateError).errors).toEqual([bodyError, cleanupError]);
        } else expect(outcome).toBe(bodyError);
      } finally {
        await mock.module('node:fs', () => originalFs);
      }

      if (pendingPath && originalFs.existsSync(pendingPath)) originalFs.unlinkSync(pendingPath);
    }

    const afterimageTarget = path.join(root, 'fault-afterimage.json');
    const expectedBytes = Buffer.from('{\n  "schema": "FixtureController/v1"\n}\n');
    const corruptedBytes = Buffer.from('changed after publication\n');
    const events: string[] = [];
    let publishedBytes: Buffer | undefined;
    let outcome: unknown;
    try {
      await mock.module('node:fs', () => ({
        ...originalFs,
        renameSync(...args: Parameters<typeof originalFs.renameSync>): void {
          const destination = args[1];
          originalFs.renameSync(...args);
          if (typeof destination === 'string' && destination === afterimageTarget) {
            events.push('rename');
            publishedBytes = originalFs.readFileSync(afterimageTarget);
            originalFs.writeFileSync(afterimageTarget, corruptedBytes);
            events.push('corrupt-afterimage');
          }
        },
      }));

      try {
        writeDurable(afterimageTarget, { schema: 'FixtureController/v1' });
      } catch (error) {
        outcome = error;
      }
    } finally {
      await mock.module('node:fs', () => originalFs);
    }

    expect(events).toEqual(['rename', 'corrupt-afterimage']);
    expect(publishedBytes).toEqual(expectedBytes);
    expect(outcome).toMatchObject({
      code: 'GAP-VIDA-RUN-CUTOFF-001',
      message: 'Cutoff witness publication failed.',
    });
    expect(originalFs.readFileSync(afterimageTarget)).toEqual(corruptedBytes);
    expect(originalFs.readdirSync(root).sort()).toEqual(['fault-afterimage.json', 'occupied']);
    assertionsPassed = true;
  } finally {
    if (assertionsPassed) originalFs.rmSync(root, { recursive: true, force: true });
    else process.stderr.write(`Retained durable fault fixture after failed assertions: ${root}\n`);
  }
});

test('cutoff SQLite exclusion rejects a live owner and recovers after process termination without an orphan marker', async () => {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-cutoff-process-'));
  let child: ReturnType<typeof spawn> | undefined;
  let childCloseObserved = false;
  let childTerminationRequested = false;
  let assertionsPassed = false;
  let preserveRoot = false;
  let stdout = '';
  let stderr = '';
  let childError: string | null = null;
  let closed: Promise<{ readonly code: number | null; readonly signal: NodeJS.Signals | null }> | null = null;
  let closeWaitAttempted = false;
  let closeWaitResult: { readonly code: number | null; readonly signal: NodeJS.Signals | null } | null = null;
  const waitForChildClose = async () => {
    const childClosed = closed;
    if (!childClosed || closeWaitAttempted) return closeWaitResult;
    closeWaitAttempted = true;
    let closeTimer: ReturnType<typeof setTimeout> | undefined;
    const result = await Promise.race([
      childClosed,
      new Promise<null>((resolve) => (closeTimer = setTimeout(() => resolve(null), 5000))),
    ]);
    if (closeTimer) clearTimeout(closeTimer);
    closeWaitResult = result;
    return result;
  };
  try {
    for (const file of ['agent-runtime.config.v1.yaml', 'AGENTS.md', 'AGENT.sidecar.md'])
      writeFileSync(path.join(root, file), readFileSync(path.join(repositoryRoot, file)));
    const generationRoot = path.join(root, '.agent', 'cutover', 'fixture-generation');
    mkdirSync(generationRoot, { recursive: true });
    const selectorBytes = Buffer.from(JSON.stringify({ schema: 'FixtureSelector', generation: 'fixture-generation' }));
    const selectorSha = createHash('sha256').update(selectorBytes).digest('hex');
    writeFileSync(path.join(root, '.agent', 'active-runtime-selector.v1.json'), selectorBytes);
    const witnessPath = path.join(generationRoot, 'cutoff-witness.json');
    writeFileSync(
      witnessPath,
      JSON.stringify(
        {
          schema: 'VidaNewWorkCutoffWitness/v1',
          generation: 'fixture-generation',
          selector_sha256: selectorSha,
          first_admitted_work_attempt: null,
        },
        null,
        2,
      ) + '\n',
    );
    const selector: ActiveSelectorState = {
      generationRoot,
      generation: 'fixture-generation',
      selectorSha,
      planSha256: 'a'.repeat(64),
      archiveManifestSha256: 'b'.repeat(64),
      repaired: false,
      forward: false,
      currentMutableOutput: null,
    };
    const values = {
      project_root: root,
      repository: 'fixture-repository',
      work_id: 'new-work',
      attempt: '1',
      scope_digest: 'a'.repeat(64),
    };
    const cutoffLockPath = path.join(generationRoot, 'cutoff-witness.lock');
    const cutoffLockBytes = Buffer.from('fixture-owned cutoff marker\n');
    const witnessBeforeMarkerCheck = readFileSync(witnessPath);
    writeFileSync(cutoffLockPath, cutoffLockBytes, { flag: 'wx' });
    let markerChecksPassed = false;
    try {
      await Promise.resolve(
        expect(advanceCutoff(selector, values)).rejects.toMatchObject({
          code: 'GAP-VIDA-RUN-CUTOFF-001',
          message: 'Cutoff witness is held or unsafe.',
        }),
      );
      expect(existsSync(cutoffLockPath)).toBe(true);
      expect(readFileSync(cutoffLockPath)).toEqual(cutoffLockBytes);
      expect(readFileSync(witnessPath)).toEqual(witnessBeforeMarkerCheck);
      markerChecksPassed = true;
    } finally {
      if (markerChecksPassed && existsSync(cutoffLockPath) && readFileSync(cutoffLockPath).equals(cutoffLockBytes))
        unlinkSync(cutoffLockPath);
    }
    expect(existsSync(cutoffLockPath)).toBe(false);

    const config = loadRuntimeConfig(root);
    mkdirSync(path.join(root, config.control.work_root), { recursive: true });
    const databasePath = path.join(root, config.control.work_root, 'session-handoff.v1.sqlite');
    const sourceUrl = pathToFileURL(path.join(packageRoot, 'src', 'host-state.ts')).href;
    const transactionInput: Parameters<typeof import('../src/host-state.ts').withHostStateExclusiveTransaction>[0] = {
      repositoryRoot: root,
      databaseRelativePath: path.relative(root, databasePath).replaceAll('\\', '/'),
      workspaceId: deriveWorkspaceId(config.repository.repository_id, root),
    };
    unlinkSync(witnessPath);
    await Promise.resolve(
      expect(advanceCutoff(selector, values)).rejects.toMatchObject({
        code: 'GAP-VIDA-RUN-CUTOFF-001',
        message: 'Cutoff witness is missing.',
      }),
    );
    expect(existsSync(witnessPath)).toBe(false);
    expect(existsSync(cutoffLockPath)).toBe(false);
    writeFileSync(witnessPath, witnessBeforeMarkerCheck);
    expect(readFileSync(witnessPath)).toEqual(witnessBeforeMarkerCheck);

    const otherSelectorWitnessBytes = Buffer.from(
      JSON.stringify(
        {
          schema: 'VidaNewWorkCutoffWitness/v1',
          generation: 'other-generation',
          selector_sha256: selector.selectorSha,
          first_admitted_work_attempt: null,
        },
        null,
        2,
      ) + '\n',
    );
    writeFileSync(witnessPath, otherSelectorWitnessBytes);
    await Promise.resolve(
      expect(advanceCutoff(selector, values)).rejects.toMatchObject({
        code: 'GAP-VIDA-RUN-CUTOFF-001',
        message: 'Cutoff witness is bound to another selector.',
      }),
    );
    expect(readFileSync(witnessPath)).toEqual(otherSelectorWitnessBytes);
    expect(existsSync(cutoffLockPath)).toBe(false);
    writeFileSync(witnessPath, witnessBeforeMarkerCheck);
    expect(readFileSync(witnessPath)).toEqual(witnessBeforeMarkerCheck);

    const existingAdmissionWitnessBytes = Buffer.from(
      JSON.stringify(
        {
          schema: 'VidaNewWorkCutoffWitness/v1',
          generation: selector.generation,
          selector_sha256: selector.selectorSha,
          first_admitted_work_attempt: `${values.repository}/${values.work_id}/${values.attempt}/${values.scope_digest}`,
        },
        null,
        2,
      ) + '\n',
    );
    writeFileSync(witnessPath, existingAdmissionWitnessBytes);
    await advanceCutoff(selector, values);
    expect(readFileSync(witnessPath)).toEqual(existingAdmissionWitnessBytes);
    expect(existsSync(cutoffLockPath)).toBe(false);
    writeFileSync(witnessPath, witnessBeforeMarkerCheck);
    expect(readFileSync(witnessPath)).toEqual(witnessBeforeMarkerCheck);

    const invalidIdentityWitnessBytes = Buffer.from(
      JSON.stringify(
        {
          schema: 'VidaNewWorkCutoffWitness/v1',
          generation: selector.generation,
          selector_sha256: selector.selectorSha,
          first_admitted_work_attempt: '',
        },
        null,
        2,
      ) + '\n',
    );
    writeFileSync(witnessPath, invalidIdentityWitnessBytes);
    await Promise.resolve(
      expect(advanceCutoff(selector, values)).rejects.toMatchObject({
        code: 'GAP-VIDA-RUN-CUTOFF-001',
        message: 'Cutoff witness identity is invalid.',
      }),
    );
    expect(readFileSync(witnessPath)).toEqual(invalidIdentityWitnessBytes);
    expect(existsSync(cutoffLockPath)).toBe(false);
    writeFileSync(witnessPath, witnessBeforeMarkerCheck);
    expect(readFileSync(witnessPath)).toEqual(witnessBeforeMarkerCheck);

    const staleSelector: ActiveSelectorState = {
      ...selector,
      selectorSha: `${selector.selectorSha[0] === '0' ? '1' : '0'}${selector.selectorSha.slice(1)}`,
    };
    await Promise.resolve(
      expect(advanceCutoff(staleSelector, values)).rejects.toMatchObject({
        code: 'GAP-VIDA-RUN-CUTOFF-001',
        message: 'Cutoff selector changed while acquiring exclusion.',
      }),
    );
    expect(readFileSync(witnessPath)).toEqual(witnessBeforeMarkerCheck);
    expect(existsSync(cutoffLockPath)).toBe(false);

    const runningChild = spawn(
      process.execPath,
      [
        '-e',
        `import {writeSync} from 'node:fs';
    import {withHostStateExclusiveTransaction} from ${JSON.stringify(sourceUrl)};
    writeSync(1,'opening\\n');
    withHostStateExclusiveTransaction(${JSON.stringify(transactionInput)},()=>{writeSync(1,'locked\\n');
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0);});`,
      ],
      { cwd: packageRoot, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] },
    );
    child = runningChild;
    let resolveReady!: () => void;
    const ready = new Promise<void>((resolve) => (resolveReady = resolve));
    closed = new Promise<{ readonly code: number | null; readonly signal: NodeJS.Signals | null }>((resolve) =>
      runningChild.once('close', (code, signal) => {
        childCloseObserved = true;
        resolve({ code, signal });
      }),
    );
    runningChild.stdout.on('data', (bytes: Buffer) => {
      stdout += bytes.toString();
      if (stdout.includes('locked')) {
        resolveReady();
      }
    });
    runningChild.stderr.on('data', (bytes: Buffer) => {
      stderr += bytes.toString();
    });
    runningChild.once('error', (error) => {
      childError = error.message;
    });
    let readinessTimer: ReturnType<typeof setTimeout> | undefined;
    const readiness = await Promise.race([
      ready.then(() => ({ kind: 'ready' as const })),
      closed.then((receipt) => ({ kind: 'closed' as const, receipt })),
      new Promise<{ readonly kind: 'timeout' }>(
        (resolve) => (readinessTimer = setTimeout(() => resolve({ kind: 'timeout' }), 10000)),
      ),
    ]);
    if (readinessTimer) clearTimeout(readinessTimer);
    if (readiness.kind !== 'ready') {
      const terminal =
        readiness.kind === 'closed'
          ? `exit=${readiness.receipt.code ?? 'null'} signal=${readiness.receipt.signal ?? 'none'}`
          : 'readiness deadline expired; child terminal state pending';
      throw Error(
        `fixture writer did not report SQLite exclusion (${terminal}; spawnError=${childError ?? 'none'})` +
          `\nstdout:\n${stdout}\nstderr:\n${stderr}`,
      );
    }
    await Promise.resolve(
      expect(advanceCutoff(selector, values)).rejects.toMatchObject({ code: 'GAP-VIDA-RUN-CUTOFF-001' }),
    );
    expect(
      requireRecord(parseJsonUnknown(readFileSync(witnessPath, 'utf8')), 'cutoff witness').first_admitted_work_attempt,
    ).toBeNull();
    childTerminationRequested = true;
    expect(runningChild.kill('SIGKILL')).toBe(true);
    const stopped = await waitForChildClose();
    if (!stopped) throw Error(`fixture writer close was not observed after termination request\n${stderr}`);
    expect(stopped.signal).toBe('SIGKILL');
    await advanceCutoff(selector, values);
    expect(
      requireRecord(parseJsonUnknown(readFileSync(witnessPath, 'utf8')), 'cutoff witness').first_admitted_work_attempt,
    ).toBe('fixture-repository/new-work/1/' + values.scope_digest);
    expect(existsSync(path.join(generationRoot, 'cutoff-witness.lock'))).toBe(false);
    assertionsPassed = true;
  } finally {
    if (child && !childCloseObserved && !childTerminationRequested) {
      childTerminationRequested = true;
      child.kill('SIGKILL');
    }
    if (child && !childCloseObserved && !closeWaitAttempted) await waitForChildClose();
    preserveRoot = !assertionsPassed || (child !== undefined && !childCloseObserved);
    if (preserveRoot)
      process.stderr.write(
        `Retained failed or nonterminal cutoff fixture: ${root}\n` +
          `childCloseObserved=${childCloseObserved} childError=${childError ?? 'none'}\nstdout:\n${stdout}\nstderr:\n${stderr}\n`,
      );
    else rmSync(root, { recursive: true, force: true });
  }
}, 20000);
const common = [
  '--project-root',
  repositoryRoot,
  '--repository',
  'fixture-repository',
  '--project',
  'fixture-project',
  '--work-path',
  'agent-runtime-new',
  '--work-id',
  'work-17',
  '--attempt',
  '2',
  '--scope-digest',
  'a'.repeat(64),
  '--team',
  'default-development',
  '--kind',
  'research',
  '--intent',
  'information_research',
];

function invoke(
  args: readonly string[],
  env: NodeJS.ProcessEnv = {},
  entrypoint = launcher,
  options: PublicRunChildOptions = {},
): TerminalUtf8SpawnResult {
  const budget = options.budget ?? executionBudget(5_000, 250);
  const observer = spawnSync as typeof spawnSync & {
    armPrepared?: () => void;
    armIssue?: () => void;
    preparedProcessGroupState?: () => 'gone' | 'present' | 'unknown' | undefined;
    preparedNativeResult?: () => ReturnType<typeof boundedSpawnSync> | undefined;
  };
  const arm = options.coverageRole === 'run-issue-wave' ? observer.armIssue : observer.armPrepared;
  const observingPrepared = options.coverageRole !== undefined && typeof arm === 'function';
  const nativeSpawn = observingPrepared
    ? (...call: Parameters<typeof spawnSync>) => {
        if (typeof arm !== 'function') throw new Error('Prepared CLI coverage observer is unavailable.');
        arm();
        return Reflect.apply(spawnSync, undefined, call) as ReturnType<typeof spawnSync>;
      }
    : spawnSync;
  let result: ReturnType<typeof boundedSpawnSync>;
  let observationFailure: { error: unknown } | undefined;
  try {
    result = boundedSpawnSync(
      nativeSpawn,
      process.execPath,
      [entrypoint, ...args],
      {
        cwd: packageRoot,
        env: pinnedEnvironment(process.execPath, { ...process.env, ...env }, options.bundleRoot ?? packageRoot),
        encoding: 'utf8',
        windowsHide: true,
        timeout: options.childTimeout ?? 5_000,
        budget,
      },
      `public run ${path.basename(entrypoint)}`,
    );
  } catch (error) {
    const nativeResult = observingPrepared ? observer.preparedNativeResult?.() : undefined;
    if (nativeResult === undefined) {
      if (observingPrepared) {
        try {
          options.onUnknown?.(undefined);
        } catch (retentionError) {
          throw new AggregateError([error, retentionError], 'Prepared observation and fixture retention failed.', {
            cause: error,
          });
        }
      }
      throw error;
    }
    result = nativeResult;
    observationFailure = { error };
  }
  const processGroupState = observingPrepared ? observer.preparedProcessGroupState?.() : undefined;
  if (
    observationFailure !== undefined ||
    (observingPrepared && processGroupState !== 'gone') ||
    commandOutcomeUnknown(result) ||
    !isTerminalUtf8SpawnResult(result)
  ) {
    if (args.some((argument, index) => argument === '--project-root' && args[index + 1] === repositoryRoot))
      sharedRunOutcomeUnknown = true;
    const tail = (value: unknown): string => {
      if (typeof value === 'string') return value.slice(-2048);
      if (value instanceof Uint8Array)
        return Buffer.from(value.buffer, value.byteOffset, value.byteLength).toString('utf8').slice(-2048);
      return '';
    };
    const failure: Error & { evidenceRoot?: string } =
      observationFailure?.error instanceof Error
        ? observationFailure.error
        : new Error(
            `Public run child outcome is unknown (status=${result.status ?? 'null'} signal=${result.signal ?? 'none'} ` +
              `error=${result.error?.code ?? 'none'}).\nstdout tail:\n${tail(result.stdout)}\nstderr tail:\n${tail(result.stderr)}`,
            { cause: observationFailure === undefined ? result.error : observationFailure.error },
          );
    const diagnosticFailures: unknown[] = [];
    try {
      options.onUnknown?.(result);
    } catch (error) {
      diagnosticFailures.push(error);
    }
    try {
      const evidence = mkdtempSync(path.join(tmpdir(), 'vida-run-unknown-child-'));
      failure.evidenceRoot = evidence;
      failure.message += `\nUNKNOWN child evidence directory: ${evidence}`;
      writeFileSync(
        path.join(evidence, 'launch.json'),
        JSON.stringify({
          executable: process.execPath,
          args: [entrypoint, ...args],
          cwd: packageRoot,
          requested_timeout_ms: options.childTimeout ?? 5_000,
          encoding: 'utf8',
        }),
        { flag: 'wx' },
      );
      writeFileSync(path.join(evidence, 'stdout.log'), result.stdout ?? '', { flag: 'wx' });
      writeFileSync(path.join(evidence, 'stderr.log'), result.stderr ?? '', { flag: 'wx' });
      writeFileSync(
        path.join(evidence, 'terminal.json'),
        JSON.stringify({
          pid: result.pid ?? null,
          status: result.status,
          signal: result.signal ?? null,
          error: result.error
            ? { name: result.error.name, message: result.error.message, code: result.error.code ?? null }
            : null,
          timeout_ms: result.timeoutMs ?? null,
          timed_out: result.timedOut ?? false,
          cleanup_attempted: result.cleanupAttempted ?? false,
          cleanup_outcome: result.cleanupOutcome ?? null,
          cleanup_status: result.cleanupStatus ?? null,
          cleanup_error_code: result.cleanupErrorCode ?? null,
          unknown: true,
          command_outcome_unknown: commandOutcomeUnknown(result),
          ...(observingPrepared ? { process_group_state: processGroupState ?? 'unknown' } : {}),
          stdout_available: result.stdout !== undefined && result.stdout !== null,
          stderr_available: result.stderr !== undefined && result.stderr !== null,
          stdout_encoding:
            typeof result.stdout === 'string' ? 'utf8' : Buffer.isBuffer(result.stdout) ? 'buffer' : null,
          stderr_encoding:
            typeof result.stderr === 'string' ? 'utf8' : Buffer.isBuffer(result.stderr) ? 'buffer' : null,
          capture_encoding: Buffer.isBuffer(result.stdout) || Buffer.isBuffer(result.stderr) ? 'buffer' : 'utf8',
          capture_complete: false,
        }),
        { flag: 'wx' },
      );
    } catch (error) {
      diagnosticFailures.push(error);
    }
    if (diagnosticFailures.length)
      throw new AggregateError([failure, ...diagnosticFailures], failure.message, { cause: failure });
    throw failure;
  }
  return result;
}

describe('vida-agent run entrypoint fast checks', () => {
  test('run help completes through the captured canonical CLI without loading operations', () => {
    const result = spawnSync(
      process.execPath,
      ['--no-env-file', '--no-install', '--config=' + path.join(packageRoot, 'bunfig.toml'), launcher, '--help'],
      { encoding: 'utf8', windowsHide: true, timeout: 4000 },
    );
    expect(result.error).toBeUndefined();
    expect(result.signal).toBeNull();
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    const help = requireRecord(parseJsonUnknown(result.stdout), 'run help result');
    expect(help).toMatchObject({
      schema: 'VidaAgentCommandResult/v1',
      status: 'help',
      command: 'run',
      syntax: cliCommandContracts.run.syntax,
    });
    expect(help.options).toEqual(runOptionDetails());
  });

  test('unknown public child result retains the shared uninitialized fixture at cleanup', () => {
    const program = path.join(repositoryRoot, 'inert-timeout-fixture.ts');
    const configFile = path.join(repositoryRoot, 'agent-runtime.config.v1.yaml');
    const before = readFileSync(configFile);
    const stdout = 'full-stdout-before-tail\n' + 'x'.repeat(8192) + '\ninert-child-started\n';
    const stderr = 'full-stderr-before-tail\n' + 'y'.repeat(8192) + '\n';
    writeFileSync(
      program,
      `process.stdout.write(${JSON.stringify(stdout)}); process.stderr.write(${JSON.stringify(stderr)}); setInterval(() => {}, 1000);\n`,
    );
    const callbackFailure = new Error('fixture UNKNOWN callback failed');
    let observed: ReturnType<typeof boundedSpawnSync> | undefined;
    let failure: unknown;
    try {
      invoke(['--project-root', repositoryRoot], {}, program, {
        budget: executionBudget(1_000, 250),
        childTimeout: 1_000,
        onUnknown(result) {
          observed = result;
          throw callbackFailure;
        },
      });
    } catch (error) {
      failure = error;
    }
    expect(failure).toBeInstanceOf(Error);
    if (!(failure instanceof Error)) throw Error('inert child did not produce an UNKNOWN error');
    expect(failure.message).toContain('Public run child outcome is unknown');
    expect(failure.message).toContain('inert-child-started');
    expect(failure.message).not.toContain('full-stdout-before-tail');
    expect(failure.message).not.toContain('full-stderr-before-tail');
    expect(failure).toBeInstanceOf(AggregateError);
    if (!(failure instanceof AggregateError) || !(failure.cause instanceof Error))
      throw Error('UNKNOWN callback failure lost the primary operation error');
    const primary = failure.cause;
    expect(failure.errors).toEqual([primary, callbackFailure]);
    expect(primary.cause).toBe(observed?.error);
    if (!('evidenceRoot' in primary) || typeof primary.evidenceRoot !== 'string')
      throw Error('UNKNOWN child capture directory was not retained');
    const evidence = primary.evidenceRoot;
    expect(requireRecord(parseJsonUnknown(readFileSync(path.join(evidence, 'launch.json'), 'utf8')), 'launch')).toEqual(
      {
        executable: process.execPath,
        args: [program, '--project-root', repositoryRoot],
        cwd: packageRoot,
        requested_timeout_ms: 1000,
        encoding: 'utf8',
      },
    );
    expect(readFileSync(path.join(evidence, 'stdout.log'), 'utf8')).toBe(stdout);
    expect(readFileSync(path.join(evidence, 'stderr.log'), 'utf8')).toBe(stderr);
    const terminal = requireRecord(
      parseJsonUnknown(readFileSync(path.join(evidence, 'terminal.json'), 'utf8')),
      'timeout terminal',
    );
    expect(observed).toBeDefined();
    if (observed === undefined) throw Error('native timeout observation was not retained');
    expect(terminal).toMatchObject({
      pid: observed.pid ?? null,
      status: observed.status,
      signal: observed.signal ?? null,
      timeout_ms: observed.timeoutMs ?? null,
      cleanup_attempted: observed.cleanupAttempted ?? false,
      cleanup_outcome: observed.cleanupOutcome ?? null,
      cleanup_status: observed.cleanupStatus ?? null,
      unknown: true,
      capture_complete: false,
      capture_encoding: 'utf8',
      timed_out: true,
    });
    expect(requireRecord(terminal.error, 'timeout spawn error').code).toBe('ETIMEDOUT');
    closeUninitializedRunFixture();
    expect(existsSync(repositoryRoot)).toBe(true);
    expect(readFileSync(configFile)).toEqual(before);
    expect(readFileSync(program, 'utf8')).toContain('inert-child-started');
  });

  test('blocks admission while the selected cutover still holds maintenance', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'vida-run-maintenance-'));
    const selectedGeneration: ActiveSelectorState = {
      generationRoot: root,
      generation: 'fixture-generation',
      selectorSha: 'a'.repeat(64),
      planSha256: 'b'.repeat(64),
      archiveManifestSha256: 'c'.repeat(64),
      payloadManifestSha256: 'd'.repeat(64),
      activationDecisionSha256: 'e'.repeat(64),
      repaired: false,
      forward: false,
      currentMutableOutput: null,
    };
    const record = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
    const recordDigest = (value: unknown) => createHash('sha256').update(record(value)).digest('hex');
    try {
      writeFileSync(path.join(root, 'maintenance-lock.v1.json'), '{}\n');
      let blocked: unknown;
      try {
        assertNoActiveCutoverMaintenance(selectedGeneration);
      } catch (error) {
        blocked = error;
      }
      expect(blocked).toMatchObject({
        code: 'GAP-VIDA-RUN-SELECTOR-001',
        message: 'Cutover maintenance is still active.',
      });
      unlinkSync(path.join(root, 'maintenance-lock.v1.json'));
      expect(() => assertNoActiveCutoverMaintenance(selectedGeneration)).toThrow('Cutover authority is missing.');

      const releasedLock = {
        schema: 'VidaCutoverMaintenanceLock/v1',
        cutover_id: selectedGeneration.generation,
        operator: 'fixture-owner',
        attestation: 'old_runtime_quiesced',
        archive_manifest_sha256: selectedGeneration.archiveManifestSha256,
        plan_sha256: selectedGeneration.planSha256,
        payload_manifest_sha256: selectedGeneration.payloadManifestSha256,
        expected_file_count: 0,
        archive_manifest: { manifest_sha256: selectedGeneration.archiveManifestSha256 },
        plan: {
          schema: 'VidaPreparedInstallPlan/v1',
          plan_sha256: selectedGeneration.planSha256,
        },
        state_policy: 'clean_start_no_ticket_transfer',
        activation_decision_path: `.agent/cutover/${selectedGeneration.generation}/activation-decision.v1.json`,
        activation_decision_sha256: selectedGeneration.activationDecisionSha256,
      };
      const release = {
        schema: 'VidaCutoverMaintenanceRelease/v1',
        cutover_id: selectedGeneration.generation,
        operator: releasedLock.operator,
        lock_sha256: recordDigest(releasedLock),
        status: 'released_by_explicit_operator_action',
      };
      const lockPath = path.join(root, 'maintenance-lock.released.v1.json');
      const releasePath = path.join(root, 'maintenance-release.v1.json');
      const writeProof = (lock: typeof releasedLock) => {
        writeFileSync(lockPath, record(lock));
        writeFileSync(releasePath, record({ ...release, lock_sha256: recordDigest(lock) }));
      };
      writeProof(releasedLock);
      expect(() => assertNoActiveCutoverMaintenance(selectedGeneration)).not.toThrow();

      const invalidBindings: readonly (typeof releasedLock)[] = [
        { ...releasedLock, attestation: 'runtime_not_quiesced' },
        { ...releasedLock, activation_decision_path: '.agent/other/decision.json' },
        { ...releasedLock, plan: null as unknown as typeof releasedLock.plan },
        { ...releasedLock, plan: { ...releasedLock.plan, schema: 'OtherPlan/v1' } },
        { ...releasedLock, plan: { ...releasedLock.plan, plan_sha256: 'f'.repeat(64) } },
        { ...releasedLock, archive_manifest: null as unknown as typeof releasedLock.archive_manifest },
        { ...releasedLock, archive_manifest: { manifest_sha256: 'f'.repeat(64) } },
      ];
      for (const lock of invalidBindings) {
        writeProof(lock);
        expect(() => assertNoActiveCutoverMaintenance(selectedGeneration)).toThrow(
          'Cutover maintenance release proof is invalid.',
        );
      }
      writeProof({ ...releasedLock, activation_decision_sha256: 'f'.repeat(64) });
      expect(() => assertNoActiveCutoverMaintenance(selectedGeneration)).toThrow(
        'Cutover maintenance release proof is invalid.',
      );

      const activeMaintenancePath = path.join(root, 'maintenance-lock.v1.json');
      const activeMaintenanceBytes = Buffer.from('{"fixture":"forward authority already validated"}\n');
      writeFileSync(activeMaintenancePath, activeMaintenanceBytes);
      const forwardSelector = { ...selectedGeneration, forward: true };
      expect(() => assertNoActiveCutoverMaintenance(forwardSelector)).not.toThrow();
      expect(readFileSync(activeMaintenancePath)).toEqual(activeMaintenanceBytes);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('validates operation and lease options before accepting a project root', async () => {
    const args = [...common, '--workflow', 'information_research_light'].map((value, index) =>
      common[index - 1] === '--project-root' ? 'relative-root' : value,
    );
    const state = ['--expected-revision', '2', '--expected-digest', 'a'.repeat(64)];
    const recovery = ['--recover-expired-lease', 'true', '--rebind-current-bundle', 'true'];
    const renewal = ['--renew-lease', 'true'];
    const intakePath = path.join(repositoryRoot, 'unused-intake.json');
    const owner = ['--native-session-handle', 'fixture-owner', '--lease-generation', '1'];
    for (const extra of [
      ['--issue-wave', 'true'],
      ['--issue-wave', 'true', '--expected-revision', '0', '--expected-digest', 'a'.repeat(64)],
      ['--issue-wave', 'true', '--expected-revision', '2', '--expected-digest', 'not-a-digest'],
      ['--report', 'relative.json', '--expected-revision', '2', '--expected-digest', 'a'.repeat(64)],
      ['--issue-wave', 'false', ...state],
      ['--issue-wave', 'true', '--expected-revision', '9007199254740992', '--expected-digest', 'a'.repeat(64)],
      ['--expected-revision', '2'],
      ['--expected-digest', 'a'.repeat(64)],
      [...recovery, ...state, '--native-session-handle', 'fixture-owner'],
      [...recovery, ...state, '--native-session-handle', 'fixture-owner', '--lease-generation', '9007199254740992'],
      [...recovery, ...state, '--native-session-handle', 'owner\n', '--lease-generation', '1'],
      [...recovery, ...state, '--native-session-handle', 'a'.repeat(257), '--lease-generation', '1'],
      [...renewal, ...state, '--native-session-handle', 'fixture-owner'],
      [...renewal, ...state, '--native-session-handle', 'fixture-owner', '--lease-generation', '9007199254740992'],
      [...renewal, ...state, '--native-session-handle', 'owner\n', '--lease-generation', '1'],
      [...renewal, ...state, '--native-session-handle', 'a'.repeat(257), '--lease-generation', '1'],
      ['--native-session-handle', 'fixture-owner'],
      ['--lease-generation', '1'],
      ['--rebind-current-bundle', 'true'],
      ['--export-staged-witness', 'unsafe/id', '--payload-manifest-sha256', 'a'.repeat(64)],
      ['--export-staged-witness', 'fixture-witness', '--payload-manifest-sha256', 'not-a-digest'],
      ['--export-staged-witness', 'fixture-witness'],
      ['--payload-manifest-sha256', 'a'.repeat(64)],
      ['--intake', 'relative.json'],
      ['--intake', intakePath, '--continuation', 'relative.json'],
      ['--continuation', intakePath],
      ['--inspect', 'false'],
      ['--inspect', 'true', '--scope-path', 'source.ts'],
    ]) {
      await Promise.resolve(
        expect(run([...args, ...extra])).rejects.toMatchObject({
          code: 'GAP-VIDA-RUN-CLI-001',
          message:
            'Mutation modes require one mode and an exact expected state version; renewal also requires the current owner and lease generation.',
        }),
      );
    }
    for (const valid of [
      [],
      ['--issue-wave', 'true', ...state],
      [...recovery, ...state, ...owner],
      [...renewal, ...state, ...owner],
      ['--export-staged-witness', 'fixture-witness', '--payload-manifest-sha256', 'a'.repeat(64)],
      ['--intake', intakePath, '--continuation', intakePath],
    ]) {
      await Promise.resolve(
        expect(run([...args, ...valid])).rejects.toMatchObject({
          code: 'GAP-VIDA-RUN-CLI-002',
          message: 'The project root must be one canonical absolute path.',
        }),
      );
    }
  });

  test('requires exact special-run signals and rejects selectors that conflict with normal operations', async () => {
    const invalidDispatches = [
      {
        args: ['--continue-initial-source', 'false'],
        message: 'Initial source continuation requires its exact separate signal',
      },
      {
        args: ['--recover-completed-source-report', 'true', '--report', 'report.json'],
        message: 'Completed Source report recovery requires its exact separate signal',
      },
      {
        args: ['--resume-historical-normalization', 'true', '--issue-wave', 'true'],
        message: 'Historical normalization resume requires its exact separate signal',
      },
    ] as const;

    for (const { args, message } of invalidDispatches) {
      await assert.rejects(run([...args]), (error: unknown) => error instanceof Error && error.message === message);
    }
  });

  test('selects an equal-root work path from one explicit project and fails closed on ambiguous or foreign roots', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'vida-run-project-membership-'));
    let preserveRoot = false;
    const childBudget = executionBudget(60_000, 250);
    try {
      for (const directory of ['products/shared', 'products/foreign'])
        mkdirSync(path.join(root, directory), { recursive: true });
      await initializeProject({
        projectRoot: root,
        repository: 'shared-run-fixture',
        projectMappings: [
          'alpha=products/shared',
          'peer=products/shared',
          'broad=products',
          'foreign=products/foreign',
        ],
      });
      const base = [
        '--project-root',
        root,
        '--repository',
        'shared-run-fixture',
        '--work-id',
        'membership-work',
        '--attempt',
        '1',
        '--scope-digest',
        'a'.repeat(64),
        '--team',
        'default-development',
        '--kind',
        'research',
        '--intent',
        'information_research',
        '--workflow',
        'unsupported-for-membership-check',
      ];
      const invokeRoot = (args: readonly string[]) => {
        if (preserveRoot) throw new Error('Equal-root fixture is retained after an uncertain CLI outcome.');
        return invoke(args, {}, launcher, {
          budget: childBudget,
          childTimeout: 60_000,
          onUnknown: () => (preserveRoot = true),
        });
      };
      const chosenEqualMember = invokeRoot([
        ...base,
        '--project',
        'alpha',
        '--work-path',
        'products/shared/src/probe.ts',
      ]);
      expect(chosenEqualMember.status).toBe(1);
      expect(requireRecord(parseJsonUnknown(chosenEqualMember.stderr), 'CLI result').code).toBe(
        'GAP-VIDA-RUN-WORKFLOW-001',
      );
      const outsideRoot = invokeRoot([...base, '--project', 'alpha', '--work-path', 'wiki/skills/guide.md']);
      expect(outsideRoot.status).toBe(1);
      expect(requireRecord(parseJsonUnknown(outsideRoot.stderr), 'CLI result').code).toBe('GAP-VIDA-RUN-WORKFLOW-001');
      const ambiguous = invokeRoot([
        ...base,
        '--project',
        'alpha',
        '--project',
        'peer',
        '--work-path',
        'products/shared/src/probe.ts',
      ]);
      expect(ambiguous.status).toBe(1);
      expect(requireRecord(parseJsonUnknown(ambiguous.stderr), 'CLI result').code).toBe('GAP-VIDA-RUN-CONTEXT-001');
      const nestedForeign = invokeRoot([...base, '--project', 'broad', '--work-path', 'products/foreign/src/probe.ts']);
      expect(nestedForeign.status).toBe(1);
      expect(requireRecord(parseJsonUnknown(nestedForeign.stderr), 'CLI result').code).toBe('GAP-VIDA-RUN-CONTEXT-001');
    } finally {
      if (preserveRoot) process.stderr.write(`Retained uncertain public run fixture: ${root}\n`);
      else rmSync(root, { recursive: true, force: true });
    }
  }, 60_000);
});

ordinaryDescribe('vida-agent run entrypoint', () => {
  test('requires every explicit argument', () => {
    const childOptions = { budget: executionBudget(5_000, 250) };
    const missing = invoke(common, {}, launcher, childOptions);
    expect(missing.status).toBe(1);
    expect(missing.stdout).toBe('');
    expect(missing.stderr).toContain('GAP-VIDA-RUN-CLI-001');
  });

  test('rejects a raw thread authority input', () => {
    const childOptions = { budget: executionBudget(5_000, 250) };
    const rawThread = invoke(
      [...common, '--workflow', 'information_research_light', '--thread-id', 'forged'],
      {},
      launcher,
      childOptions,
    );
    expect(rawThread.status).toBe(1);
    expect(rawThread.stderr).toContain('GAP-VIDA-RUN-CLI-001');
  });

  test('rejects a legacy tenant authority input', () => {
    const childOptions = { budget: executionBudget(5_000, 250) };
    const legacyTenant = invoke(
      [
        '--project-root',
        repositoryRoot,
        '--tenant',
        'legacy-tenant',
        '--project',
        'fixture-project',
        '--work-path',
        'agent-runtime-new',
        '--work-id',
        'work-17',
        '--attempt',
        '2',
        '--scope-digest',
        'a'.repeat(64),
        '--team',
        'default-development',
        '--kind',
        'research',
        '--intent',
        'information_research',
        '--workflow',
        'information_research_light',
      ],
      {},
      launcher,
      childOptions,
    );
    expect(legacyTenant.status).toBe(1);
    expect(legacyTenant.stderr).toContain('GAP-VIDA-RUN-CLI-001');
  });

  test('blocks before workflow selection when the trusted initialization binding is absent', () => {
    const result = invoke([...common, '--workflow', 'information_research_light']);
    expect(result.status).toBe(1);
    const payload = requireRecord(parseJsonUnknown(result.stderr), 'CLI result');
    expect(payload).toMatchObject({
      schema: 'VidaAgentRunResult/v1',
      status: 'blocked',
      code: 'GAP-VIDA-RUN-CONTEXT-001',
    });
  });

  test('accepts a repeatable exact project set before trusted-host binding', () => {
    const result = invoke([
      '--project-root',
      repositoryRoot,
      '--repository',
      'fixture-repository',
      '--project',
      'fixture-project',
      '--project',
      'second-project',
      '--work-path',
      'agent-runtime-new',
      '--work-id',
      'work-17',
      '--attempt',
      '2',
      '--scope-digest',
      'a'.repeat(64),
      '--team',
      'default-development',
      '--kind',
      'research',
      '--intent',
      'information_research',
      '--workflow',
      'information_research_light',
    ]);
    expect(result.status).toBe(1);
    expect(requireRecord(parseJsonUnknown(result.stderr), 'CLI result').code).toBe('GAP-VIDA-RUN-CONTEXT-001');
    expect(result.stderr).not.toContain('GAP-VIDA-RUN-CLI-001');
  });

  test('does not bypass trusted initialization for a workflow ID that is not configured', () => {
    const result = invoke([...common, '--workflow', 'task_execution']);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('GAP-VIDA-RUN-CONTEXT-001');
  });

  test('does not use process environment as project or thread authority', () => {
    const result = invoke([...common, '--workflow', 'information_research_light'], {
      VIDA_PROJECT_ROOT: repositoryRoot,
      CODEX_THREAD_ID: 'forged',
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('GAP-VIDA-RUN-CONTEXT-001');
    expect(result.stderr).not.toContain('forged');
  });

  test('redacts absolute roots and config-derived diagnostics with a bounded stable error', () => {
    const secret = 'run-secret-' + 'x'.repeat(5000);
    const invalidRoot = path.join(repositoryRoot, secret);
    const result = invoke([
      '--project-root',
      invalidRoot,
      '--repository',
      'fixture-repository',
      '--project',
      'fixture-project',
      '--work-path',
      'agent-runtime-new',
      '--work-id',
      'work-17',
      '--attempt',
      '2',
      '--scope-digest',
      'a'.repeat(64),
      '--team',
      'default-development',
      '--kind',
      'research',
      '--intent',
      'information_research',
      '--workflow',
      'information_research_light',
    ]);
    expect(result.status).toBe(1);
    const payload = requireRecord(parseJsonUnknown(result.stderr), 'CLI result');
    expect(payload).toMatchObject({
      schema: 'VidaAgentRunResult/v1',
      status: 'blocked',
      code: 'GAP-VIDA-RUN-CLI-004',
    });
    expect(payload.message).toMatch(/^The project root is unavailable or is not a canonical directory\. Next action: /);
    expect(result.stderr).not.toContain(invalidRoot);
    expect(result.stderr.length).toBeLessThan(512);
  });
});

if (mutationMode || v8CoverageMode || nativeCoverageMode) {
  const record = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
  const createFixture = (
    root: string,
    bundleName = 'agent-runtime-new',
    multiProject = false,
    configureConfigText: (configText: string) => string = (configText) => configText,
  ) => {
    const fixtureBundle = path.join(root, bundleName);
    if (bundleName === 'vida-agent') {
      mkdirSync(fixtureBundle);
      for (const entry of [
        'src',
        'dist',
        'bin',
        'tooling',
        'schemas',
        'instructions',
        'templates',
        'package.json',
        'TESTING.md',
        'bun.lock',
        '.bun-version',
      ])
        cpSync(path.join(packageRoot, entry), path.join(fixtureBundle, entry), {
          recursive: true,
          dereference: false,
          filter: (source) => path.resolve(source) !== path.join(packageRoot, 'dist', 'standalone'),
        });
      symlinkSync(
        path.join(packageRoot, 'node_modules'),
        path.join(fixtureBundle, 'node_modules'),
        process.platform === 'win32' ? 'junction' : 'dir',
      );
    } else {
      mkdirSync(path.join(fixtureBundle, 'schemas'), { recursive: true });
      cpSync(path.join(packageRoot, 'templates'), path.join(fixtureBundle, 'templates'), { recursive: true });
      cpSync(
        path.join(packageRoot, 'schemas', 'runtime-initialization.v1.schema.json'),
        path.join(fixtureBundle, 'schemas', 'runtime-initialization.v1.schema.json'),
      );
      cpSync(path.join(packageRoot, 'TESTING.md'), path.join(fixtureBundle, 'TESTING.md'));
    }
    writeFileSync(path.join(root, 'AGENTS.md'), '# Mutation fixture\n');
    writeFileSync(path.join(root, 'AGENT.sidecar.md'), '# Mutation fixture\n');
    const documentationPolicy = path.join(root, 'docs', 'agent-instructions', 'documentation-policy.v1.json');
    mkdirSync(path.dirname(documentationPolicy), { recursive: true });
    cpSync(
      path.resolve(packageRoot, '../../docs/agent-instructions/documentation-policy.v1.json'),
      documentationPolicy,
    );
    let configText = readFileSync(path.join(packageRoot, 'templates', 'agent-runtime.config.template.v1.yaml'), 'utf8')
      .replaceAll('{{REPOSITORY}}', 'mutation-repository')
      .replaceAll('{{PROJECT}}', 'mutation-project')
      .replaceAll('{{BUNDLE}}', bundleName);
    if (multiProject) {
      configText = configText.replaceAll('\r\n', '\n');
      const projectBlock = configText.match(/(?<=\nprojects:\n)[\s\S]*?(?=\nagents:)/)?.[0];
      if (!projectBlock) throw new Error('Mutation fixture project template is missing.');
      mkdirSync(path.join(root, 'mutation-project-root', bundleName), { recursive: true });
      mkdirSync(path.join(root, 'alpha-project-root'));
      configText = configText.replace(
        projectBlock,
        projectBlock.replace('    project_root: .', '    project_root: mutation-project-root') +
          '\n' +
          projectBlock
            .replaceAll('mutation-project', 'alpha-project')
            .replace('    project_root: .', '    project_root: alpha-project-root'),
      );
      configText = configText.replace(
        '\nruntime:',
        '\n    - id: local-alpha-project\n      provider: local\n      project_id: "alpha-project"\n      tenant_id: local\n      namespace: "alpha-project"\nruntime:',
      );
    }
    configText = configureConfigText(configText);
    writeFileSync(path.join(root, 'agent-runtime.config.v1.yaml'), configText);
    const config = loadRuntimeConfig(root);
    const schema = readFileSync(path.join(fixtureBundle, 'schemas', 'runtime-initialization.v1.schema.json'));
    const initializationPath = path.join(root, '.agent', 'runtime-initialization.v1.json');
    const initialization: RuntimeInitializationReceipt = {
      schema: 'RuntimeInitialization/v1',
      version: 1,
      provenance: 'generated',
      repository_id: config.repository.repository_id,
      project_ids: config.projects.map((project) => project.project_id).sort(),
      integrations_digest: canonicalJsonDigest(config.integrations),
      workspace_id: deriveWorkspaceId(config.repository.repository_id, root),
      workspace_binding_status: 'pending',
      bundle: config.runtime.bundle,
      config_digest: runtimeConfigDigest(config),
      schema_sha256: createHash('sha256').update(schema).digest('hex'),
      templates: fixtureInitializationTemplates(root, fixtureBundle),
      created_at: new Date().toISOString(),
    };
    mkdirSync(path.dirname(initializationPath), { recursive: true });
    writeFileSync(initializationPath, record(initialization));
    expect(readRuntimeInitializationReceipt(requireSafeRepositoryAccess(root)).receipt).toEqual(initialization);
    const args = [
      '--project-root',
      root,
      '--repository',
      'mutation-repository',
      '--project',
      'mutation-project',
      '--work-path',
      multiProject ? `mutation-project-root/${bundleName}` : bundleName,
      '--work-id',
      `mutation-run-${randomUUID()}`,
      '--attempt',
      '1',
      '--scope-digest',
      'a'.repeat(64),
      '--team',
      'default-development',
      '--kind',
      'research',
      '--intent',
      'information_research',
      '--workflow',
      'information_research_light',
    ];
    return { args, initialization, initializationPath, fixtureBundle, config };
  };
  const invokeMutationRecord = (
    args: readonly string[],
    expectedStatus = 0,
    entrypoint = launcher,
    options: PublicRunChildOptions = {},
  ): Record<string, unknown> => {
    const result = invoke(args, {}, entrypoint, options);
    expect(Number.isInteger(result.status)).toBe(true);
    expect(result.signal).toBeNull();
    expect(result.error).toBeUndefined();
    if (result.status !== expectedStatus) {
      throw new Error(
        `Public CLI exited with ${result.status}; expected ${expectedStatus}. stderr: ${result.stderr.trim()} stdout: ${result.stdout.trim()}`,
      );
    }
    const output = expectedStatus === 0 ? result.stdout : result.stderr;
    if (typeof output !== 'string') throw Error('mutation run output is not UTF-8 text');
    const payload = requireRecord(parseJsonUnknown(output.trim()), 'mutation run result');
    if (expectedStatus !== 0) {
      expect(payload).toMatchObject({ schema: 'VidaAgentRunResult/v1', status: 'blocked' });
      if (typeof payload.message !== 'string') throw Error('blocked CLI message is missing');
      expect(payload.message.length).toBeGreaterThan(0);
    }
    return payload;
  };
  const ownedMutationFixture = (root: string, caseTimeout: number, bundleRoot = packageRoot) => {
    const entrypoint = path.join(bundleRoot, 'bin', 'run.ts');
    const budget = executionBudget(caseTimeout, 250);
    let unknown = false;
    const invokeOwnedRecord = (args: readonly string[], status: number): Record<string, unknown> => {
      if (unknown) throw new Error(`Refusing to reuse retained run fixture: ${root}`);
      return invokeMutationRecord(args, status, entrypoint, {
        bundleRoot,
        budget,
        childTimeout: caseTimeout,
        onUnknown: () => (unknown = true),
      });
    };
    return {
      invoke(
        args: readonly string[],
        status = 0,
        coverageRole?: 'run-admission-prepared' | 'run-issue-wave',
      ): TestRunPayload {
        if (coverageRole) {
          if (status !== 0) throw new Error('Prepared CLI coverage requires its existing successful caller.');
          if (unknown) throw new Error(`Refusing to reuse retained run fixture: ${root}`);
          const payload = invokeMutationRecord(args, status, entrypoint, {
            bundleRoot,
            budget,
            childTimeout: caseTimeout,
            onUnknown: () => (unknown = true),
            coverageRole,
          });
          return parseTestRunPayload(payload);
        }
        return parseTestRunPayload(invokeOwnedRecord(args, status));
      },
      invokeInspection(args: readonly string[]): Record<string, unknown> {
        return invokeOwnedRecord(args, 0);
      },
      hasUnknown: () => unknown,
    };
  };

  const observeOwnedDatabaseLifetime = async (databasePath: string) => {
    const openedHandles = new Set<Database>();
    const closedHandles = new Set<Database>();
    const rawDatabase = await import('../src/config/workspace-database-raw.ts');
    const hostDatabase = await import('../src/host-state.ts');
    const track = (database: Database) => {
      if (path.resolve(database.filename) === databasePath) openedHandles.add(database);
      return database;
    };
    const originalOpen = rawDatabase.openUnadmittedWorkspaceDatabase;
    const openSpy = spyOn(rawDatabase, 'openUnadmittedWorkspaceDatabase').mockImplementation(
      (...parameters: Parameters<typeof originalOpen>) => track(originalOpen(...parameters)),
    );
    const originalHostOpen = hostDatabase.openHostStateDatabase;
    const hostOpenSpy = spyOn(hostDatabase, 'openHostStateDatabase').mockImplementation(
      (...parameters: Parameters<typeof originalHostOpen>) => track(originalHostOpen(...parameters)),
    );
    const originalClose = Reflect.get(Database.prototype, 'close') as Database['close'];
    const closeSpy = spyOn(Database.prototype, 'close').mockImplementation(function (
      this: Database,
      ...parameters: Parameters<Database['close']>
    ) {
      Reflect.apply(originalClose, this, parameters);
      if (openedHandles.has(this)) closedHandles.add(this);
    });
    return {
      assertAllClosed(): void {
        expect(openedHandles.size).toBeGreaterThan(0);
        expect(closedHandles.size).toBe(openedHandles.size);
        expect([...openedHandles].every((database) => closedHandles.has(database))).toBe(true);
      },
      restore: (): void => {
        const errors: unknown[] = [];
        for (const spy of [closeSpy, openSpy, hostOpenSpy]) {
          try {
            spy.mockRestore();
          } catch (error) {
            errors.push(error);
          }
        }
        if (errors.length === 1) throw errors[0];
        if (errors.length > 1) throw new AggregateError(errors, 'Database lifetime observers could not both restore');
      },
    };
  };

  const initialSourceRunArguments = (
    sourceFixture: Awaited<ReturnType<typeof createInitialSourceWorkFixture>>,
  ): string[] => {
    const input = admittedInput(sourceFixture);
    const projectId = sourceFixture.identity.project_ids[0];
    assert.ok(projectId);
    return [
      '--project-root',
      sourceFixture.root,
      '--repository',
      sourceFixture.config.repository.repository_id,
      '--project',
      projectId,
      '--work-path',
      sourceFixture.documents[0],
      '--work-id',
      sourceFixture.identity.work_id,
      '--attempt',
      '1',
      '--scope-digest',
      sourceFixture.originalSource.digest,
      '--team',
      input.selection.team,
      '--kind',
      input.selection.kind,
      '--intent',
      input.selection.intent,
      '--workflow',
      'task_execution',
    ];
  };

  const researchFixtureSummary = (actionOrder: number, sourceDigest: string | null) => {
    assert.ok(sourceDigest);
    const sourceId = `fixture-source-${actionOrder}`;
    return JSON.stringify({
      schema: 'VidaResearchObservationOutput/v1',
      topic: `Public CLI research action ${actionOrder}`,
      objective: 'Inspect the fixture without changing code.',
      question: 'What does the fixture show?',
      source_refs: [
        {
          source_id: sourceId,
          source_kind: 'internal',
          locator: `AGENT.sidecar.md#fixture-${actionOrder}`,
          title: 'Fixture sidecar',
          claim: 'AC-CLI-1 SR-CLI-1: the fixture supports read-only research.',
          retrieved_at: '2026-10-07T00:00:00Z',
          version_or_date: '2026-10-07',
          independence_group: 'fixture',
          digest: sourceDigest,
        },
      ],
      findings: [
        {
          finding_id: `fixture-${actionOrder}`,
          statement: 'The fixture source is present.',
          source_ids: [sourceId],
          evidence_class: 'Code',
          status: 'confirmed',
        },
      ],
      uncertainties: [],
      conflicts: [],
      evidence_classes: ['Code'],
      br_ids: [],
      sr_ids: ['SR-CLI-1'],
      ac_ids: ['AC-CLI-1'],
      gap_ids: [],
      options: [
        {
          option_id: 'retain',
          label: 'Retain evidence',
          description: 'Preserve the read-only finding.',
          evidence_refs: [sourceId],
        },
      ],
      recommendation: {
        option_id: 'retain',
        rationale: 'The fixture source supports the finding.',
        evidence_refs: [sourceId],
      },
      completeness: {
        status: 'pass',
        required_questions: ['What does the fixture show?'],
        answered_questions: ['What does the fixture show?'],
        missing_questions: [],
        material_gaps: [],
        external_validation: {
          required: false,
          source_count: 0,
          minimum_sources: 0,
          status: 'not_required',
          live_check: null,
        },
      },
      readiness: 'informational',
    });
  };

  const prepareMutationIntake = (
    args: readonly string[],
    config: AgentRuntimeConfig,
    options: { readonly sourcePath?: string; readonly risk?: 'low' | 'medium' | 'high' } = {},
  ) => {
    const valueAfter = (flag: string) => {
      const index = args.indexOf(flag);
      const value = args[index + 1];
      if (index < 0 || !value) throw new Error(`Mutation fixture is missing ${flag}.`);
      return value;
    };
    const root = valueAfter('--project-root');
    const workId = valueAfter('--work-id');
    const projectId = valueAfter('--project');
    const project = config.projects.find((candidate) => candidate.project_id === projectId);
    if (!project) throw new Error(`Mutation fixture project is missing: ${projectId}`);
    const projectRoot = path.resolve(root, project.project_root);
    const sourcePath = options.sourcePath ?? path.relative(root, path.join(projectRoot, 'mutation-fixture-source.md'));
    const sourceAbsolutePath = path.resolve(root, sourcePath);
    if (!sourceAbsolutePath.startsWith(`${path.resolve(root)}${path.sep}`))
      throw new Error('Mutation fixture source must be inside the repository root.');
    mkdirSync(path.dirname(sourceAbsolutePath), { recursive: true });
    if (!existsSync(sourceAbsolutePath)) writeFileSync(sourceAbsolutePath, '# Public CLI mutation fixture source\n');
    const source = snapshotDeclaredSources(requireSafeRepositoryAccess(root), [sourcePath]);
    const sourceEntry = source.entries[0];
    if (!sourceEntry) throw new Error('Mutation fixture source snapshot entry is missing');
    const workDir = path.join(root, '.agent', 'work', workId);
    mkdirSync(workDir, { recursive: true });
    const relative = (name: string) => `.agent/work/${workId}/${name}`;
    const runtimePaths = runtimePackageCodePaths(config.runtime.bundle);
    const scope = {
      schema: 'ImplementationScope/v1',
      scope_id: `scope-${workId}`,
      work_id: workId,
      source_revision: source.digest,
      ac_ids: ['AC-CLI-1'],
      allowed_paths: [sourcePath],
      implementation_paths: [sourcePath],
      documentation_paths: [],
      changed_symbols: [],
      non_goals: ['Source mutation'],
      acceptance_trace: ['AC-CLI-1'],
      behavior_trace: ['SR-CLI-1'],
      test_trace: ['Public CLI mutation fixture'],
      diagnostic_trace: ['Fixture'],
      attribution: { thread_id: 'mutation-native-session', pointer: relative('intake.json') },
      owner: 'fixture',
      created_at: new Date().toISOString(),
    };
    const acceptance = {
      schema: 'AcceptanceManifest/v1',
      id: `acceptance-${workId}`,
      version: 1,
      ac_ids: scope.ac_ids,
      source: sourcePath,
      scope: scope.scope_id,
      source_revision: source.digest,
      contracts: [
        {
          id: 'AC-CLI-1',
          definition: 'Keep public CLI state and report handling bound to this admitted attempt.',
          sr: 'SR-CLI-1',
          evidence: ['fixture'],
        },
      ],
    };
    const workItem: LocalWorkAdmissionInput['workItem'] = {
      schema: 'WorkItem/v1',
      id: workId,
      provider: 'local',
      provider_type: 'Research',
      canonical_kind: 'research',
      intent: 'information_research',
      project_id: projectId,
      title: 'Public CLI mutation fixture',
      description: 'Exercise the public CLI with explicitly admitted work.',
      risk_flags: [],
      labels: [],
    };
    const intake = {
      schema: 'VidaLocalSessionIntake/v1',
      native_session_handle: 'mutation-native-session',
      work_item: workItem,
      scope_path: relative('scope.json'),
      acceptance_path: relative('acceptance.json'),
      runtime_code_paths: runtimePaths,
      route: 'R2',
      risk: options.risk ?? 'low',
      change_kind: 'fix',
    };
    writeFileSync(path.join(workDir, 'scope.json'), record(scope));
    writeFileSync(path.join(workDir, 'acceptance.json'), record(acceptance));
    const intakePath = path.join(workDir, 'intake.json');
    writeFileSync(intakePath, record(intake));
    const admittedArgs = args.map((value, index) => (args[index - 1] === '--scope-digest' ? source.digest : value));
    return {
      args: admittedArgs,
      admissionArgs: [...admittedArgs, '--intake', intakePath],
      nativeSessionHandle: intake.native_session_handle,
      sourceEntry,
    };
  };

  test('task-source routing rejects mixed, invalid and incomplete options before project side effects', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'vida-run-task-source-cli-'));
    const before = readdirSync(root).sort();
    let completed = false;
    const cases = [
      {
        args: [
          '--project-root',
          root,
          '--task-source-operation',
          'inspect',
          '--task-source-request',
          'request.json',
          '--repository',
          'mutation-repository',
        ],
      },
      {
        args: ['--project-root', root, '--task-source-operation', 'mutate', '--task-source-request', 'request.json'],
      },
      {
        args: ['--project-root', root, '--task-source-operation', 'report', '--task-source-request', 'request.json'],
      },
      {
        args: [
          '--project-root',
          root,
          '--task-source-operation',
          'inspect',
          '--task-source-request',
          'request.json',
          '--task-source-report',
          'report.json',
        ],
      },
    ];
    try {
      for (const scenario of cases) {
        await Promise.resolve(
          expect(run(scenario.args)).rejects.toMatchObject({
            code: 'GAP-VIDA-RUN-CLI-001',
            message:
              'Task source operations require --project-root ABSOLUTE_PATH, --task-source-operation prepare|inspect|issue|report|recover and --task-source-request RELATIVE_PATH; report also requires --task-source-report RELATIVE_PATH.',
          }),
        );
        expect(readdirSync(root).sort()).toEqual(before);
      }
      completed = true;
    } finally {
      if (completed) rmSync(root, { recursive: true, force: true });
      else process.stderr.write(`Retained failed task-source CLI fixture: ${root}\n`);
    }
  });

  test('public run handles delivered-work inspect, issue retry, report retry and conflict without opening the old engine', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'vida-run-continuation-'));
    let completed = false;
    try {
      const fixtureSetup = createFixture(root, 'vida-agent', false, (configText) => {
        const workflowMarker = '  implementation_change:\n';
        const workflowStart = configText.indexOf(workflowMarker);
        const nextWorkflowHeader = /\n  [A-Za-z0-9_-]+:\n/g;
        nextWorkflowHeader.lastIndex = workflowStart + workflowMarker.length;
        const nextWorkflowMatch = nextWorkflowHeader.exec(configText);
        if (workflowStart < 0 || !nextWorkflowMatch)
          throw new Error('Implementation-change workflow boundaries are unavailable');
        const nextWorkflowStart = nextWorkflowMatch.index;
        const workflowText = configText.slice(workflowStart, nextWorkflowStart),
          validateStageMarker = '      - id: validate_parallel\n';
        if (workflowText.split(validateStageMarker).length !== 2)
          throw new Error('Implementation-change validation stage is unavailable or ambiguous');
        return (
          configText.slice(0, workflowStart) +
          workflowText.replace(
            validateStageMarker,
            '      - id: validate_parallel\n        context_source_ids:\n          - project-context\n',
          ) +
          configText.slice(nextWorkflowStart)
        );
      });
      const contextSourceBytes = Buffer.from(
          '# Project-owned continuation context\nRetained review instructions for this fixture.\n',
        ),
        contextSourcePath = path.join(root, 'AGENT.sidecar.md');
      writeFileSync(contextSourcePath, contextSourceBytes);
      const { config } = fixtureSetup;
      const workId = 'work-' + randomUUID(),
        nativeSessionHandle = 'fixture-continuation-thread',
        project = config.projects[0],
        sourcePath = path.join(root, 'src', 'task.ts');
      if (!project) throw Error('fixture project is missing');
      const projectId = project.project_id;
      trackContinuationFixtureRoot(root);
      mkdirSync(path.join(root, '.git'), { recursive: true });
      mkdirSync(path.dirname(sourcePath), { recursive: true });
      writeFileSync(sourcePath, 'original current task source\n');
      const repositoryAccess = requireSafeRepositoryAccess(root),
        originalSource = snapshotDeclaredSources(repositoryAccess, ['src/task.ts']),
        workspaceId = deriveWorkspaceId(config.repository.repository_id, root),
        identity: WorkIdentity = {
          repository_id: config.repository.repository_id,
          project_ids: config.projects.map((project) => project.project_id).sort(),
          integrations_digest: loadProjectSetContext(root, config, config.repository.repository_id, [projectId])
            .integrations_digest,
          work_id: workId,
        },
        workItem = {
          schema: 'WorkItem/v1',
          id: workId,
          provider: 'local',
          provider_type: 'Task',
          canonical_kind: 'task',
          intent: 'implementation_change',
          project_id: projectId,
          title: 'Review retained terminal synthesis',
          description: 'Retain the original result for one current read-only review.',
          risk_flags: [],
          labels: [],
        },
        intakePath = `.agent/work/${workId}/local-session-intake.v1.json`,
        intakeBytes = Buffer.from(
          JSON.stringify({
            schema: 'VidaLocalSessionIntake/v1',
            work_item: workItem,
            native_session_handle: nativeSessionHandle,
          }),
        );
      mkdirSync(path.dirname(path.join(root, intakePath)), { recursive: true });
      writeFileSync(path.join(root, intakePath), intakeBytes);
      const fixture = await continuationFixture({
        root,
        config,
        identity,
        workspaceId,
        databasePath: sessionHandoffDatabasePath(root, config),
        repositoryRoot: root,
        workflowId: 'implementation_change',
        nativeSessionHandle,
        runId: 'run-' + randomUUID(),
        workItemDigest: canonicalJsonDigest(workItem),
        intakeArtifacts: [
          {
            artifact_id: 'local-session-intake',
            schema: 'VidaLocalSessionIntake/v1',
            path: intakePath,
            sha256: createHash('sha256').update(intakeBytes).digest('hex'),
            stage_id: 'intake',
            source_revision: originalSource.digest,
            scope_id: 'scope-fixture',
            ac_ids: ['AC-1'],
          },
        ],
        originalSource,
      });
      let snapshotSpy: QuerySpyHandle | undefined;
      let bridgeSpy: QuerySpyHandle | undefined;
      try {
        const currentSourceScope = snapshotDeclaredSources(requireSafeRepositoryAccess(root), ['src/task.ts']),
          selection: WorkItemSelection = {
            team: 'default-development',
            kind: 'task',
            intent: 'implementation_change',
            project: projectId,
            risk_flags: [],
            labels: [],
          },
          context: SessionHandoffContext = { work_id: workId, attempt: 1, scope_digest: currentSourceScope.digest };
        let candidate: SessionAgentAction | undefined;
        for (let waveIndex = 0; waveIndex < 16 && !candidate; waveIndex++)
          candidate = sessionActionsForWave(config, selection, context, 'implementation_change', waveIndex, []).find(
            (action) => action.stage_id === 'validate_parallel' && action.role === 'correctness-validator',
          );
        if (!candidate) throw Error('fixture correctness validator action is missing');
        const configuredContext = configuredContextForStage(
            root,
            config,
            'implementation_change',
            candidate.stage_id,
            context,
          ),
          actionRequest = buildSessionBridgeRequest({
            runId: fixture.runId,
            workflowId: 'implementation_change',
            configDigest: runtimeConfigDigest(config),
            context,
            waveIndex: candidate.wave_index,
            action: candidate,
            configuredContext,
            priorResults: [],
          }),
          expectedContextEntry = {
            id: 'project-context',
            kind: 'local' as const,
            location: 'AGENT.sidecar.md',
            title: 'Project-owned requirements and source map',
            status: 'local_excerpt' as const,
            sha256: createHash('sha256').update(contextSourceBytes).digest('hex'),
            bytes: contextSourceBytes.length,
            content: contextSourceBytes.toString('utf8'),
            truncated: false,
          },
          expectedContextDigest = canonicalJsonDigest({
            schema: 'ConfiguredContext/v1',
            work_id: workId,
            attempt: 1,
            entries: [expectedContextEntry],
          }),
          request: DeliveredWorkContinuationRequest = continuationRequestFor(fixture, {
            currentSourceScope,
            targetConfigDigest: runtimeConfigDigest(config),
            actionRequest,
          }),
          planBody: Omit<Parameters<typeof applyDeliveredWorkContinuationPlan>[0]['plan'], 'digest'> = {
            schema: 'VidaDeliveredWorkContinuationPlan/v1',
            repair_id: 'run-entry-continuation-' + randomUUID(),
            actor: 'fixture-owner',
            timestamp: new Date().toISOString(),
            source_transition_id: request.sourceTransition.operation_id,
            runtime_code_paths: ['vida-agent/src/runtime-kernel.ts'],
            request,
          },
          plan = { ...planBody, digest: canonicalJsonDigest(planBody) };
        expect(configuredContext?.entries).toEqual([expectedContextEntry]);
        expect(configuredContext?.digest).toBe(expectedContextDigest);
        expect(actionRequest.configured_context_digest).toBe(expectedContextDigest);
        expect(actionRequest.configured_context_files).toEqual([
          { path: 'AGENT.sidecar.md', sha256: expectedContextEntry.sha256 },
        ]);
        expect(configuredContext?.entries[0]?.bytes).toBe(contextSourceBytes.length);
        await applyDeliveredWorkContinuationPlan({
          database: fixture.db,
          root,
          workspaceId,
          plan,
          rebuildPlan: async () => plan,
        });
        const initial = fixture.store.readDeliveredWorkContinuation(identity, 1),
          args = [
            '--project-root',
            root,
            '--repository',
            config.repository.repository_id,
            '--project',
            projectId,
            '--work-path',
            'src/task.ts',
            '--work-id',
            workId,
            '--attempt',
            '1',
            '--scope-digest',
            currentSourceScope.digest,
            '--team',
            'default-development',
            '--kind',
            'task',
            '--intent',
            'implementation_change',
            '--workflow',
            'implementation_change',
          ],
          expected = (version: StateVersion) => [
            '--expected-revision',
            String(version.revision),
            '--expected-digest',
            version.digest,
          ],
          engine = await import('../src/orchestration/session-engine-snapshot.ts');
        snapshotSpy = spyOn(engine, 'readSessionEngineSnapshot');
        bridgeSpy = spyOn(MastraSessionBridge, 'open');
        if (!initial) throw Error('fixture continuation state is missing');
        expect(initial.action_status).toBe('unissued');
        fixture.closeDatabase();
        const contextHostBefore = inspectHostWorkspaceDatabase(
            root,
            sessionHandoffDatabaseRelativePath(config),
            workspaceId,
          ),
          reconciliationProofPath = path.join(root, '.agent', 'work', workId, 'unwritten-reconciliation-proof.json');
        await Promise.resolve(
          expect(
            run([
              ...args,
              ...expected(requireStateVersion(initial.journal.version)),
              '--reconcile',
              reconciliationProofPath,
            ]),
          ).rejects.toMatchObject({
            code: 'GAP-VIDA-RUN-EXECUTION-001',
            message: 'Delivered-work review does not permit native-attempt reconciliation.',
          }),
        );
        expect(inspectHostWorkspaceDatabase(root, sessionHandoffDatabaseRelativePath(config), workspaceId)).toEqual(
          contextHostBefore,
        );
        expect(existsSync(reconciliationProofPath)).toBe(false);
        expect(snapshotSpy).not.toHaveBeenCalled();
        expect(bridgeSpy).not.toHaveBeenCalled();
        const mismatchedScopeDigest =
          (currentSourceScope.digest[0] === '0' ? '1' : '0') + currentSourceScope.digest.slice(1);
        expect(mismatchedScopeDigest).toMatch(/^[a-f0-9]{64}$/u);
        const mismatchedScopeArgs = args.map((value, index) =>
          args[index - 1] === '--scope-digest' ? mismatchedScopeDigest : value,
        );
        const mismatchedWorkflowArgs = args.map((value, index) =>
          args[index - 1] === '--intent' || args[index - 1] === '--workflow' ? 'task_execution' : value,
        );
        for (const refusalArgs of [mismatchedScopeArgs, mismatchedWorkflowArgs]) {
          await Promise.resolve(
            expect(run([...refusalArgs, '--inspect', 'true'])).rejects.toMatchObject({
              code: 'GAP-VIDA-RUN-CONTEXT-001',
              message: 'Delivered-work review differs from the current Work, Journal or workflow.',
            }),
          );
          expect(inspectHostWorkspaceDatabase(root, sessionHandoffDatabaseRelativePath(config), workspaceId)).toEqual(
            contextHostBefore,
          );
          expect(snapshotSpy).not.toHaveBeenCalled();
          expect(bridgeSpy).not.toHaveBeenCalled();
        }
        const staleContextErrors: unknown[] = [];
        try {
          writeFileSync(
            contextSourcePath,
            Buffer.from(contextSourceBytes.toString('utf8') + 'Changed after capture.\n'),
          );
          await Promise.resolve(
            expect(run([...args, '--inspect', 'true'])).rejects.toMatchObject({
              code: 'GAP-VIDA-RUN-CONTEXT-001',
              message: 'Delivered-work review action or configured context is stale.',
            }),
          );
          expect(inspectHostWorkspaceDatabase(root, sessionHandoffDatabaseRelativePath(config), workspaceId)).toEqual(
            contextHostBefore,
          );
          expect(snapshotSpy).not.toHaveBeenCalled();
          expect(bridgeSpy).not.toHaveBeenCalled();
        } catch (error) {
          staleContextErrors.push(error);
        } finally {
          try {
            writeFileSync(contextSourcePath, contextSourceBytes);
          } catch (restoreError) {
            staleContextErrors.push(restoreError);
          }
        }
        if (staleContextErrors.length === 1) throw staleContextErrors[0];
        if (staleContextErrors.length > 1)
          throw new AggregateError(staleContextErrors, 'Stale-context assertion and restoration both failed');
        expect(readFileSync(contextSourcePath)).toEqual(contextSourceBytes);
        const inspected = parseTestRunPayload(await runSuccessfully([...args, '--inspect', 'true']));
        expect(inspected.status).toBe('continuation_review_ready');
        const inspectedActions = requireNextActions(inspected);
        expect(inspectedActions).toHaveLength(1);
        expect(inspectedActions[0]?.historical_review_input?.body_sha256).toBe(fixture.capture.body_sha256);
        expect(inspected.accepted_result).toBe(false);
        const assurancePath = path.join(root, '.agent', 'work', workId, 'unissued-assurance.json');
        const hostRelativePath = sessionHandoffDatabaseRelativePath(config);
        expect(existsSync(path.join(root, hostRelativePath))).toBe(true);
        const hostBeforeAssurance = inspectHostWorkspaceDatabase(root, hostRelativePath, workspaceId);
        await Promise.resolve(
          expect(
            run([
              ...args,
              ...expected(requireStateVersion(inspected.state_version)),
              '--prepare-assurance',
              assurancePath,
            ]),
          ).rejects.toMatchObject({
            code: 'GAP-VIDA-RUN-CONTEXT-001',
            message: 'The retained-source review must be reported before final assurance or correction.',
          }),
        );
        expect(existsSync(assurancePath)).toBe(false);
        expect(inspectHostWorkspaceDatabase(root, hostRelativePath, workspaceId)).toEqual(hostBeforeAssurance);
        const witnessDirectory = path.join(root, '.agent', 'cutover', 'unadmitted-witness');
        expect(existsSync(witnessDirectory)).toBe(false);
        expect(hostBeforeAssurance.work.some((entry) => entry.identity.work_id === workId)).toBe(true);
        await Promise.resolve(
          expect(
            run([
              ...args.map((value, index) => (args[index - 1] === '--work-id' ? 'unadmitted-witness-work' : value)),
              '--export-staged-witness',
              'unadmitted-witness',
              '--payload-manifest-sha256',
              'a'.repeat(64),
            ]),
          ).rejects.toMatchObject({
            code: 'GAP-VIDA-RUN-CONTEXT-001',
            message: 'Current admitted Work lifecycle risk is unavailable.',
          }),
        );
        expect(existsSync(witnessDirectory)).toBe(false);
        expect(inspectHostWorkspaceDatabase(root, hostRelativePath, workspaceId)).toEqual(hostBeforeAssurance);
        const issued = parseTestRunPayload(
          await runSuccessfully([
            ...args,
            ...expected(requireStateVersion(inspected.state_version)),
            '--issue-wave',
            'true',
          ]),
        );
        expect(issued.status).toBe('issued');
        const issuedActions = requireIssuedActions(issued);
        expect(issuedActions).toHaveLength(1);
        expect(issuedActions[0]?.historical_review_input?.body_sha256).toBe(fixture.capture.body_sha256);
        const issuedStateVersion = requireStateVersion(issued.state_version);
        const issueRetry = parseTestRunPayload(
          await runSuccessfully([...args, ...expected(issuedStateVersion), '--issue-wave', 'true']),
        );
        expect(issueRetry.status).toBe('wave_retrieved');
        const retryActions = requireIssuedActions(issueRetry);
        expect(retryActions[0]?.issue_id).toBe(issuedActions[0]?.issue_id);
        expect(retryActions[0]?.prior_issue_outcome).toBe('unknown');
        const reportPath = path.join(root, '.agent', 'work', workId, 'review-report.json'),
          observationBody = (summary: string) => {
            const issuedAction = issuedActions[0];
            if (!issuedAction || typeof issuedAction.issue_id !== 'string')
              throw Error('historical review issuance is missing');
            const observation = {
              schema: 'VidaSessionObservation/v1',
              action_id: issuedAction.request.action_id,
              issue_id: issuedAction.issue_id,
              agent_id: 'fixture:correctness-validator',
              tool_call_ref: 'fixture:review-call',
              status: 'reported_complete',
              summary,
              output_digest: canonicalJsonDigest(summary),
              evidence_refs: ['fixture:review-evidence'],
            };
            return JSON.stringify(observation);
          };
        writeFileSync(reportPath, observationBody('Reviewed the retained synthesis without accepting it.'));
        const reported = parseTestRunPayload(
          await runSuccessfully([...args, ...expected(issuedStateVersion), '--report', reportPath]),
        );
        expect(reported.status).toBe('continuation_review_reported');
        expect(reported.accepted_result).toBe(false);
        expect(reported.runtime_accepted).toBe(false);
        const reportRetry = parseTestRunPayload(
          await runSuccessfully([
            ...args,
            ...expected(requireStateVersion(reported.state_version)),
            '--report',
            reportPath,
          ]),
        );
        expect(reportRetry.status).toBe('report_retrieved');
        expect(reportRetry.state_version).toEqual(reported.state_version);
        expect(reportRetry.recorded_observation).toEqual(reported.reported_observation);
        writeFileSync(reportPath, observationBody('Conflicting retry must be denied.'));
        await Promise.resolve(
          expect(
            run([...args, ...expected(requireStateVersion(reported.state_version)), '--report', reportPath]),
          ).rejects.toThrow(/retry differs/),
        );
        expect(snapshotSpy).not.toHaveBeenCalled();
        expect(bridgeSpy).not.toHaveBeenCalled();
      } finally {
        snapshotSpy?.mockRestore();
        bridgeSpy?.mockRestore();
        fixture.closeDatabase();
      }
      completed = true;
    } finally {
      if (completed) rmSync(root, { recursive: true, force: true });
      else process.stderr.write(`Retained failed run continuation fixture: ${root}\n`);
    }
  });

  test('owned run fixtures pin the selected bundle before the child starts', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'vida-run-cache-owner-'));
    const bundleRoot = path.join(root, 'vida-agent');
    const entrypoint = path.join(bundleRoot, 'bin', 'run.ts');
    const fixture = ownedMutationFixture(root, 5_000, bundleRoot);
    const inherited = process.env.BUN_RUNTIME_TRANSPILER_CACHE_PATH;
    let completed = false;
    try {
      mkdirSync(path.dirname(entrypoint), { recursive: true });
      cpSync(path.join(packageRoot, '.bun-version'), path.join(bundleRoot, '.bun-version'));
      cpSync(path.join(packageRoot, 'package.json'), path.join(bundleRoot, 'package.json'));
      writeFileSync(
        entrypoint,
        'console.log(JSON.stringify({cache: process.env.BUN_RUNTIME_TRANSPILER_CACHE_PATH, entry: import.meta.url}));\n',
      );
      const derived = pinnedEnvironment(
        process.execPath,
        { BUN_RUNTIME_TRANSPILER_CACHE_PATH: undefined },
        packageRoot,
      ).BUN_RUNTIME_TRANSPILER_CACHE_PATH;
      assert.ok(derived);
      for (const cache of [derived, '0', path.join(root, 'explicit-cache')]) {
        process.env.BUN_RUNTIME_TRANSPILER_CACHE_PATH = cache;
        const observed = fixture.invokeInspection([]);
        const expected = pinnedEnvironment(process.execPath, process.env, bundleRoot).BUN_RUNTIME_TRANSPILER_CACHE_PATH;
        expect(observed).toEqual({ cache: expected, entry: pathToFileURL(entrypoint).href });
        if (cache === derived) expect(observed.cache).not.toBe(derived);
        else expect(observed.cache).toBe(cache);
      }
      completed = true;
    } finally {
      if (inherited === undefined) delete process.env.BUN_RUNTIME_TRANSPILER_CACHE_PATH;
      else process.env.BUN_RUNTIME_TRANSPILER_CACHE_PATH = inherited;
      if (completed && !fixture.hasUnknown()) rmSync(root, { recursive: true, force: true });
      else process.stderr.write(`Retained failed or uncertain run cache fixture: ${root}\n`);
    }
  });

  const authorityRefusalSelector: Parameters<typeof forwardUpdateAuthority>[1] = {
    schema: 'ActiveRuntimeSelector/v1',
    generation: 'selected-generation',
    runtime: 'vida-agent',
    bundle_root: 'vida-agent',
    config_path: 'agent-runtime.config.v1.yaml',
    archive_manifest_sha256: 'a'.repeat(64),
    plan_sha256: 'b'.repeat(64),
  };

  const snapshotAuthorityFixture = (root: string, includeMetadata = false) => {
    const entries: {
      path: string;
      kind: 'directory' | 'file';
      bytes?: string;
      metadata?: { device: bigint; inode: bigint; mode: bigint; size: bigint; modified: bigint; changed: bigint };
    }[] = [];
    const visit = (relative: string) => {
      for (const name of readdirSync(path.join(root, relative)).sort()) {
        const child = relative ? `${relative}/${name}` : name;
        const file = path.join(root, ...child.split('/'));
        const info = lstatSync(file, { bigint: true });
        if (info.isSymbolicLink()) throw new Error('authority fixture contains a symbolic link');
        const metadata = includeMetadata
          ? {
              device: info.dev,
              inode: info.ino,
              mode: info.mode,
              size: info.size,
              modified: info.mtimeNs,
              changed: info.ctimeNs,
            }
          : undefined;
        if (info.isDirectory()) {
          entries.push({ path: child, kind: 'directory', ...(metadata ? { metadata } : {}) });
          visit(child);
        } else if (info.isFile()) {
          entries.push({
            path: child,
            kind: 'file',
            bytes: readFileSync(file).toString('base64'),
            ...(metadata ? { metadata } : {}),
          });
        } else throw new Error('authority fixture contains an unsupported entry');
      }
    };
    visit('');
    return entries;
  };

  const snapshotAuthorityMetadata = (file: string) => {
    const info = lstatSync(file, { bigint: true });
    return {
      device: info.dev,
      inode: info.ino,
      mode: info.mode,
      size: info.size,
      modified: info.mtimeNs,
      changed: info.ctimeNs,
    };
  };

  test('forward journal parser returns JSON records and rejects non-record lines', () => {
    const events = [
      { schema: 'VidaForwardUpdateEvent/v1', phase: 'documentation_closeout_verified', operation_id: 'first' },
      { schema: 'VidaForwardUpdateEvent/v1', phase: 'retained', operation_id: 'second' },
    ];
    expect(parseForwardJournal(events.map((event) => JSON.stringify(event)).join('\n'))).toEqual(events);
    expect(() => parseForwardJournal('[]')).toThrow('leaf forward journal event is invalid');
  });

  const buildForwardRefusalFixture = (
    root: string,
    change: (records: {
      plan: Record<string, unknown>;
      authorization: Record<string, unknown>;
      parent: Record<string, unknown>;
      evidence: Record<string, unknown>[];
    }) => void,
  ) => {
    const digestRecord = (value: unknown) => createHash('sha256').update(record(value)).digest('hex');
    const generation = 'fixture-forward-child';
    const parentGeneration = 'fixture-forward-parent';
    const archiveManifestSha256 = 'a'.repeat(64);
    const oldPayloadManifestSha256 = 'c'.repeat(64);
    const newPayloadManifestSha256 = 'e'.repeat(64);
    const parent = {
      schema: 'ActiveRuntimeSelector/v1',
      generation: parentGeneration,
      runtime: 'vida-agent',
      bundle_root: 'vida-agent',
      config_path: 'agent-runtime.config.v1.yaml',
      archive_manifest_sha256: archiveManifestSha256,
      plan_sha256: 'b'.repeat(64),
      payload_manifest_sha256: oldPayloadManifestSha256,
      state_policy: 'forward_only_preserve_work',
      activation_decision_sha256: '8'.repeat(64),
    };
    const changed = [
      {
        path: 'vida-agent/bin/run.mjs',
        old_sha256: 'd'.repeat(64),
        new_sha256: 'e'.repeat(64),
        old_size: 1,
        new_size: 1,
      },
    ];
    const evidence: Record<string, unknown>[] = [
      {
        kind: 'assurance',
        path: 'fixture-assurance.json',
        sha256: '1'.repeat(64),
        reverse_path: 'fixture-assurance-reverse.json',
        reverse_sha256: '2'.repeat(64),
        status: 'passed',
      },
      {
        kind: 'correctness',
        path: 'fixture-correctness.json',
        sha256: '3'.repeat(64),
        reverse_path: 'fixture-correctness-reverse.json',
        reverse_sha256: '4'.repeat(64),
        status: 'passed',
      },
      {
        kind: 'security',
        path: 'fixture-security.json',
        sha256: '5'.repeat(64),
        reverse_path: 'fixture-security-reverse.json',
        reverse_sha256: '6'.repeat(64),
        status: 'passed',
      },
    ];
    const plan: Record<string, unknown> = {
      schema: 'VidaForwardUpdateMaintenance/v1',
      operation_id: generation,
      operator: 'fixture-owner',
      parent_generation: parentGeneration,
      parent_selector_sha256: digestRecord(parent),
      parent_cutoff_sha256: '7'.repeat(64),
      first_admitted_work_attempt: null,
      old_payload_manifest_sha256: oldPayloadManifestSha256,
      new_payload_manifest_sha256: newPayloadManifestSha256,
      changed,
      preserved_mutable_outputs: [],
    };
    const authorization: Record<string, unknown> = {
      schema: 'VidaForwardUpdateAuthorization/v1',
      operation_id: generation,
      operator: 'fixture-owner',
      outcome: 'approved',
      pointer: 'fixture:untrusted-forward-parser-input',
      plan_sha256: digestRecord(plan),
      evidence,
    };
    change({ plan, authorization, parent, evidence });
    plan.parent_selector_sha256 = digestRecord(parent);
    authorization.plan_sha256 = digestRecord(plan);
    const decision = {
      schema: 'VidaForwardUpdateDecision/v1',
      operation_id: generation,
      operator: 'fixture-owner',
      plan_sha256: digestRecord(plan),
      authorization_sha256: digestRecord(authorization),
      selector_intent_sha256: '',
      outcome: 'approved',
    };
    const selectorIntent: Parameters<typeof forwardUpdateAuthority>[1] = {
      schema: 'ActiveRuntimeSelector/v1',
      generation,
      runtime: 'vida-agent',
      bundle_root: 'vida-agent',
      config_path: 'agent-runtime.config.v1.yaml',
      archive_manifest_sha256: parent.archive_manifest_sha256,
      plan_sha256: digestRecord(plan),
      payload_manifest_sha256: newPayloadManifestSha256,
      state_policy: 'forward_only_preserve_work',
    };
    decision.selector_intent_sha256 = digestRecord(selectorIntent);
    const selector = { ...selectorIntent, activation_decision_sha256: digestRecord(decision) };
    const selectorSha = digestRecord(selector);
    const commit = {
      schema: 'VidaForwardUpdateSelectorCommit/v1',
      operation_id: generation,
      plan_sha256: selector.plan_sha256,
      decision_sha256: selector.activation_decision_sha256,
      selector_sha256: selectorSha,
    };
    const cutoff = {
      schema: 'VidaNewWorkCutoffWitness/v1',
      generation,
      selector_sha256: selectorSha,
      first_admitted_work_attempt: plan.first_admitted_work_attempt,
    };
    const release = {
      schema: 'VidaForwardUpdateRelease/v1',
      operation_id: generation,
      operator: 'fixture-owner',
      lock_sha256: digestRecord(plan),
      status: 'released_by_explicit_operator_action',
    };
    mkdirSync(root, { recursive: true });
    writeFileSync(path.join(root, 'forward-intent.v1.json'), record(plan));
    writeFileSync(path.join(root, 'forward-authorization.v1.json'), record(authorization));
    writeFileSync(path.join(root, 'forward-decision.v1.json'), record(decision));
    writeFileSync(path.join(root, 'forward-selector-commit.v1.json'), record(commit));
    writeFileSync(path.join(root, 'parent-selector.v1.json'), record(parent));
    writeFileSync(path.join(root, 'maintenance-lock.released.v1.json'), record(plan));
    writeFileSync(path.join(root, 'maintenance-release.v1.json'), record(release));
    writeFileSync(path.join(root, 'cutoff-witness.json'), record(cutoff));
    return { selector, selectorSha };
  };

  const buildForwardLeafFixture = (
    projectRoot: string,
    parentSelector: Parameters<typeof forwardUpdateAuthority>[1],
    parentSelectorSha: string,
    parentCutoffSha: string,
    parentManifest: {
      schema: string;
      files: { path: string; sha256: string; size: number; source_path?: string; source_sha256?: string }[];
      unresolved_integration_paths: unknown[];
    },
    preservedMutableOutput?: Record<string, string>,
    documentationChange?: { path: string; bytes: Uint8Array },
    options: {
      generation?: string;
      launcher?: Uint8Array;
      additionalChanges?: { path: string; bytes: Uint8Array }[];
      additionalPreservedMutableOutputs?: Record<string, string>[];
      additionalSuccessorFiles?: {
        path: string;
        bytes: Uint8Array;
        source_path: string;
        source_sha256: string;
      }[];
      additionalRetiredPaths?: string[];
      omitPlanChangedPaths?: string[];
    } = {},
  ) => {
    const digestBytes = (bytes: string | Uint8Array) => createHash('sha256').update(bytes).digest('hex');
    const generation = options.generation ?? 'fixture-forward-leaf';
    const forwardRoot = path.join(projectRoot, '.agent', 'cutover', generation);
    mkdirSync(forwardRoot, { recursive: true });

    const launcher = Buffer.from(options.launcher ?? 'fixture selected forward launcher\n');
    const launcherSha = digestBytes(launcher);
    const launcherEntry = parentManifest.files.find((entry) => entry.path === 'vida-agent/bin/run.mjs');
    if (!launcherEntry) throw new Error('forward fixture parent launcher is missing');
    const documentationChanges = [
      ...(documentationChange ? [documentationChange] : []),
      ...(options.additionalChanges ?? []),
    ];
    const documentationEntries = documentationChanges.map((change) => {
      const entry = parentManifest.files.find((candidate) => candidate.path === change.path);
      if (!entry) throw new Error(`forward fixture parent documentation is missing: ${change.path}`);
      return { change, entry };
    });
    if (new Set(documentationChanges.map((change) => change.path)).size !== documentationChanges.length)
      throw new Error('forward fixture repeats a documentation path');
    const documentationChangeByPath = new Map(documentationChanges.map((change) => [change.path, change]));
    const successorManifest = {
      schema: parentManifest.schema,
      files: [
        ...parentManifest.files
          .filter((entry) => !(options.additionalRetiredPaths ?? []).includes(entry.path))
          .map((entry) => {
            const change = documentationChangeByPath.get(entry.path);
            if (entry.path === 'vida-agent/bin/run.mjs')
              return {
                path: entry.path,
                sha256: launcherSha,
                size: launcher.length,
                ...(entry.source_sha256 === undefined ? {} : { source_sha256: launcherSha }),
              };
            return change ? { path: entry.path, sha256: digestBytes(change.bytes), size: change.bytes.length } : entry;
          }),
        ...(options.additionalSuccessorFiles ?? []).map(({ path, bytes, source_path, source_sha256 }) => ({
          path,
          sha256: digestBytes(bytes),
          size: bytes.length,
          source_path,
          source_sha256,
        })),
      ],
      unresolved_integration_paths: parentManifest.unresolved_integration_paths,
    };
    const oldManifestSha = digestBytes(record(parentManifest));
    const newManifestSha = digestBytes(record(successorManifest));
    const changed = [
      {
        path: 'vida-agent/bin/run.mjs',
        old_sha256: launcherEntry.sha256,
        new_sha256: launcherSha,
        old_size: launcherEntry.size,
        new_size: launcher.length,
      },
      ...documentationEntries.map(({ change, entry }) => ({
        path: change.path,
        old_sha256: entry.sha256,
        new_sha256: digestBytes(change.bytes),
        old_size: entry.size,
        new_size: change.bytes.length,
      })),
      ...(options.additionalSuccessorFiles ?? []).map(({ path, bytes }) => ({
        path,
        old_sha256: null,
        new_sha256: digestBytes(bytes),
        old_size: null,
        new_size: bytes.length,
      })),
    ].sort((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0));
    const omittedPlanChanges = new Set(options.omitPlanChangedPaths ?? []);
    if ([...omittedPlanChanges].some((item) => !changed.some((entry) => entry.path === item)))
      throw new Error('forward fixture omitted plan path is not changed');
    const plan: Record<string, unknown> = {
      schema: 'VidaForwardUpdateMaintenance/v1',
      operation_id: generation,
      operator: 'fixture-owner',
      parent_generation: parentSelector.generation,
      parent_selector_sha256: parentSelectorSha,
      parent_cutoff_sha256: parentCutoffSha,
      first_admitted_work_attempt: null,
      old_payload_manifest_sha256: oldManifestSha,
      new_payload_manifest_sha256: newManifestSha,
      changed: changed.filter((entry) => !omittedPlanChanges.has(entry.path)),
      preserved_mutable_outputs: [
        ...(preservedMutableOutput ? [preservedMutableOutput] : []),
        ...(options.additionalPreservedMutableOutputs ?? []),
      ],
    };
    const planSha = digestBytes(record(plan));
    const evidence: Record<string, unknown>[] = [];
    for (const kind of ['assurance', 'correctness', 'security'] as const) {
      const reviewPath = `.agent/cutover/${generation}/${kind}-review.json`;
      const reversePath = `.agent/cutover/${generation}/${kind}-reverse.json`;
      const attribution = { actor: `fixture-${kind}`, history_id: `history-${kind}`, native_tool_ref: `tool-${kind}` };
      const review = {
        schema: 'VidaForwardReviewReceipt/v1',
        operation_id: generation,
        kind,
        ...attribution,
        sealed_fingerprint: planSha,
        fresh_blind: true,
        verdict: 'pass',
        scope_reviewed: 'complete',
      };
      const reviewSha = digestBytes(record(review));
      const reverse = {
        schema: 'VidaForwardReverseValidation/v1',
        operation_id: generation,
        kind,
        actor: attribution.actor,
        history_id: attribution.history_id,
        sealed_fingerprint: planSha,
        review_sha256: reviewSha,
        result: 'pass',
      };
      const reverseSha = digestBytes(record(reverse));
      writeFileSync(path.join(projectRoot, ...reviewPath.split('/')), record(review));
      writeFileSync(path.join(projectRoot, ...reversePath.split('/')), record(reverse));
      evidence.push({
        kind,
        path: reviewPath,
        sha256: reviewSha,
        reverse_path: reversePath,
        reverse_sha256: reverseSha,
        status: 'passed',
      });
    }
    const authorization = {
      schema: 'VidaForwardUpdateAuthorization/v1',
      operation_id: generation,
      operator: 'fixture-owner',
      outcome: 'approved',
      pointer: 'fixture:forward-leaf-read-only-validation',
      plan_sha256: planSha,
      evidence,
    };
    const selectorIntent: Parameters<typeof forwardUpdateAuthority>[1] = {
      schema: 'ActiveRuntimeSelector/v1',
      generation,
      runtime: 'vida-agent',
      bundle_root: 'vida-agent',
      config_path: 'agent-runtime.config.v1.yaml',
      archive_manifest_sha256: parentSelector.archive_manifest_sha256,
      plan_sha256: planSha,
      payload_manifest_sha256: newManifestSha,
      state_policy: 'forward_only_preserve_work',
    };
    const decision = {
      schema: 'VidaForwardUpdateDecision/v1',
      operation_id: generation,
      operator: 'fixture-owner',
      plan_sha256: planSha,
      authorization_sha256: digestBytes(record(authorization)),
      selector_intent_sha256: digestBytes(record(selectorIntent)),
      outcome: 'approved',
    };
    const selector = { ...selectorIntent, activation_decision_sha256: digestBytes(record(decision)) };
    const selectorSha = digestBytes(record(selector));
    const release = {
      schema: 'VidaForwardUpdateRelease/v1',
      operation_id: generation,
      operator: 'fixture-owner',
      lock_sha256: digestBytes(record(plan)),
      status: 'released_by_explicit_operator_action',
    };
    const cutoff = {
      schema: 'VidaNewWorkCutoffWitness/v1',
      generation,
      selector_sha256: selectorSha,
      first_admitted_work_attempt: null,
    };
    const commit = {
      schema: 'VidaForwardUpdateSelectorCommit/v1',
      operation_id: generation,
      plan_sha256: planSha,
      decision_sha256: selector.activation_decision_sha256,
      selector_sha256: selectorSha,
    };

    writeFileSync(path.join(forwardRoot, 'forward-intent.v1.json'), record(plan));
    writeFileSync(path.join(forwardRoot, 'forward-authorization.v1.json'), record(authorization));
    writeFileSync(path.join(forwardRoot, 'forward-decision.v1.json'), record(decision));
    writeFileSync(path.join(forwardRoot, 'forward-selector-commit.v1.json'), record(commit));
    writeFileSync(path.join(forwardRoot, 'parent-selector.v1.json'), record(parentSelector));
    writeFileSync(path.join(forwardRoot, 'parent-payload.manifest.v1.json'), record(parentManifest));
    writeFileSync(path.join(forwardRoot, 'successor-payload.manifest.v1.json'), record(successorManifest));
    writeFileSync(path.join(forwardRoot, 'maintenance-lock.released.v1.json'), record(plan));
    writeFileSync(path.join(forwardRoot, 'maintenance-release.v1.json'), record(release));
    writeFileSync(path.join(forwardRoot, 'cutoff-witness.json'), record(cutoff));
    mkdirSync(path.join(projectRoot, 'vida-agent', 'bin'), { recursive: true });
    writeFileSync(path.join(projectRoot, 'vida-agent', 'bin', 'run.mjs'), launcher);
    return {
      generation,
      generationRoot: forwardRoot,
      selector,
      selectorSha,
      cutoffSha: digestBytes(record(cutoff)),
      launcher,
      successorManifest,
    };
  };

  const buildRepairParentFixture = (
    root: string,
    parentManifest: {
      schema: string;
      files: { path: string; sha256: string; size: number }[];
      unresolved_integration_paths: unknown[];
    },
    successorManifest: {
      schema: string;
      files: { path: string; sha256: string; size: number }[];
      unresolved_integration_paths: unknown[];
    },
  ) => {
    const digestRecord = (value: unknown) => createHash('sha256').update(record(value)).digest('hex');
    const parentGeneration = 'fixture-forward-parent';
    const repairGeneration = 'fixture-forward-repair';
    const archiveManifestSha256 = 'a'.repeat(64);
    const parentManifestSha256 = digestRecord(parentManifest);
    const successorManifestSha256 = digestRecord(successorManifest);
    const parentLauncher = parentManifest.files.find((entry) => entry.path === 'vida-agent/bin/run.mjs');
    const successorLauncher = successorManifest.files.find((entry) => entry.path === 'vida-agent/bin/run.mjs');
    if (!parentLauncher || !successorLauncher) throw new Error('repair fixture launcher entry is missing');
    const parentRoot = path.join(root, '.agent', 'cutover', parentGeneration);
    const repairRoot = path.join(root, '.agent', 'cutover', repairGeneration);
    mkdirSync(parentRoot, { recursive: true });
    mkdirSync(repairRoot, { recursive: true });
    const parentEvidence = Object.fromEntries(
      ['parity', 'security', 'assurance', 'rollback', 'dev', 'staged_runtime'].map((kind) => {
        const relativePath = `.agent/cutover/${parentGeneration}/${kind}-evidence.json`;
        const bytes = Buffer.from(record({ schema: 'FixtureCutoverEvidence/v1', kind }));
        writeFileSync(path.join(root, ...relativePath.split('/')), bytes);
        return [
          kind,
          {
            actor: 'fixture-owner',
            path: relativePath,
            pointer: `fixture:${kind}`,
            sha256: createHash('sha256').update(bytes).digest('hex'),
            status: 'passed',
          },
        ];
      }),
    );
    const parentIntent = {
      schema: 'ActiveRuntimeSelector/v1',
      generation: parentGeneration,
      runtime: 'vida-agent',
      bundle_root: 'vida-agent',
      config_path: 'agent-runtime.config.v1.yaml',
      archive_manifest_sha256: archiveManifestSha256,
      plan_sha256: 'b'.repeat(64),
      payload_manifest_sha256: parentManifestSha256,
      state_policy: 'clean_start_no_ticket_transfer',
    };
    const parentDecision = {
      schema: 'VidaCutoverActivationDecision/v1',
      actor: 'fixture-owner',
      cutover_id: parentGeneration,
      evidence: parentEvidence,
      outcome: 'approved',
      payload_manifest_sha256: parentManifestSha256,
      plan_sha256: parentIntent.plan_sha256,
      pointer: 'fixture:prepared-parent',
      selector_intent_sha256: digestRecord(parentIntent),
    };
    const parentSelector = {
      ...parentIntent,
      activation_decision_sha256: digestRecord(parentDecision),
    };
    const parentSelectorSha = digestRecord(parentSelector);
    const parentLock = {
      schema: 'VidaCutoverMaintenanceLock/v1',
      cutover_id: parentGeneration,
      operator: 'fixture-owner',
      attestation: 'old_runtime_quiesced',
      archive_manifest_sha256: archiveManifestSha256,
      plan_sha256: parentSelector.plan_sha256,
      payload_manifest_sha256: parentManifestSha256,
      expected_file_count: 0,
      archive_manifest: { manifest_sha256: archiveManifestSha256 },
      plan: {
        schema: 'VidaPreparedInstallPlan/v1',
        plan_sha256: parentSelector.plan_sha256,
        payload_manifest_sha256: parentManifestSha256,
        archive_manifest_sha256: archiveManifestSha256,
      },
      state_policy: parentSelector.state_policy,
      activation_decision_path: `.agent/cutover/${parentGeneration}/activation-decision.v1.json`,
      activation_decision_sha256: parentSelector.activation_decision_sha256,
    };
    const parentCutoff = {
      schema: 'VidaNewWorkCutoffWitness/v1',
      generation: parentGeneration,
      selector_sha256: parentSelectorSha,
      first_admitted_work_attempt: null,
    };
    for (const [name, value] of [
      [
        'selector-commit.json',
        {
          schema: 'VidaPreparedSelectorCommit/v1',
          cutover_id: parentGeneration,
          plan_sha256: parentSelector.plan_sha256,
          activation_decision_sha256: parentSelector.activation_decision_sha256,
          selector_sha256: parentSelectorSha,
        },
      ],
      ['activation-decision.v1.json', parentDecision],
      [
        'prepared-install.json',
        {
          schema: 'VidaPreparedInstallJournal/v1',
          cutover_id: parentGeneration,
          plan_sha256: parentSelector.plan_sha256,
          archive_manifest_sha256: archiveManifestSha256,
          payload_manifest_sha256: parentManifestSha256,
          archive_scope: 'fixture-parent-scope',
          state_policy: parentSelector.state_policy,
          status: 'installing',
        },
      ],
      [
        'install-ready.json',
        {
          schema: 'VidaPreparedInstallReady/v1',
          cutover_id: parentGeneration,
          plan_sha256: parentSelector.plan_sha256,
          archive_scope: 'fixture-parent-scope',
          state_policy: parentSelector.state_policy,
          status: 'ready_for_selector',
        },
      ],
      ['maintenance-lock.released.v1.json', parentLock],
      [
        'maintenance-release.v1.json',
        {
          schema: 'VidaCutoverMaintenanceRelease/v1',
          cutover_id: parentGeneration,
          operator: 'fixture-owner',
          lock_sha256: digestRecord(parentLock),
          status: 'released_by_explicit_operator_action',
        },
      ],
      ['cutoff-witness.json', parentCutoff],
    ] as const)
      writeFileSync(path.join(parentRoot, name), record(value));

    const repairEvidence = ['assurance', 'correctness', 'security'].map((kind) => {
      const relativePath = `.agent/cutover/${repairGeneration}/${kind}-evidence.json`;
      const bytes = Buffer.from(record({ schema: 'FixtureCutoverEvidence/v1', kind }));
      writeFileSync(path.join(root, ...relativePath.split('/')), bytes);
      return { kind, path: relativePath, sha256: createHash('sha256').update(bytes).digest('hex'), status: 'passed' };
    });
    const authorization = {
      schema: 'VidaActiveLauncherRepairAuthorization/v1',
      repair_id: repairGeneration,
      operator: 'fixture-owner',
      outcome: 'approved',
      pointer: 'fixture:forward-parent-repair',
      old_generation: parentGeneration,
      old_selector_sha256: parentSelectorSha,
      old_payload_manifest_sha256: parentManifestSha256,
      old_launcher_sha256: parentLauncher.sha256,
      new_payload_manifest_sha256: successorManifestSha256,
      new_launcher_sha256: successorLauncher.sha256,
      evidence: repairEvidence,
    };
    const repairPlan = {
      schema: 'VidaActiveLauncherRepairPlan/v1',
      repair_id: repairGeneration,
      operator: 'fixture-owner',
      parent_cutover_id: parentGeneration,
      parent_selector_sha256: parentSelectorSha,
      parent_payload_manifest_sha256: parentManifestSha256,
      parent_launcher_sha256: parentLauncher.sha256,
      successor_payload_manifest_sha256: successorManifestSha256,
      successor_launcher_sha256: successorLauncher.sha256,
      archive_manifest_sha256: archiveManifestSha256,
      authorization_sha256: digestRecord(authorization),
    };
    const selectorIntent: Parameters<typeof repairAuthority>[1] = {
      schema: 'ActiveRuntimeSelector/v1',
      generation: repairGeneration,
      runtime: 'vida-agent',
      bundle_root: 'vida-agent',
      config_path: 'agent-runtime.config.v1.yaml',
      archive_manifest_sha256: archiveManifestSha256,
      plan_sha256: digestRecord(repairPlan),
      payload_manifest_sha256: successorManifestSha256,
      state_policy: 'clean_start_no_ticket_transfer',
    };
    const decision = {
      schema: 'VidaActiveLauncherRepairDecision/v1',
      repair_id: repairGeneration,
      operator: 'fixture-owner',
      plan_sha256: selectorIntent.plan_sha256,
      authorization_sha256: repairPlan.authorization_sha256,
      selector_intent_sha256: digestRecord(selectorIntent),
      outcome: 'approved',
    };
    const selector = { ...selectorIntent, activation_decision_sha256: digestRecord(decision) };
    const selectorSha = digestRecord(selector);
    const lock = {
      schema: 'VidaActiveLauncherRepairMaintenance/v1',
      repair_id: repairGeneration,
      operator: 'fixture-owner',
      plan_sha256: selector.plan_sha256,
      decision_sha256: selector.activation_decision_sha256,
      selector_sha256: selectorSha,
    };
    const cutoff = {
      schema: 'VidaNewWorkCutoffWitness/v1',
      generation: repairGeneration,
      selector_sha256: selectorSha,
      first_admitted_work_attempt: null,
    };
    const release = {
      schema: 'VidaActiveLauncherRepairRelease/v1',
      repair_id: repairGeneration,
      operator: 'fixture-owner',
      lock_sha256: digestRecord(lock),
      status: 'released_by_explicit_operator_action',
    };
    for (const [name, value] of [
      ['repair-plan.v1.json', repairPlan],
      ['repair-authorization.v1.json', authorization],
      ['repair-decision.v1.json', decision],
      [
        'repair-selector-commit.v1.json',
        {
          schema: 'VidaActiveLauncherRepairSelectorCommit/v1',
          repair_id: repairGeneration,
          plan_sha256: selector.plan_sha256,
          decision_sha256: selector.activation_decision_sha256,
          selector_sha256: selectorSha,
        },
      ],
      ['parent-selector.v1.json', parentSelector],
      ['parent-payload.manifest.v1.json', parentManifest],
      ['successor-payload.manifest.v1.json', successorManifest],
      ['maintenance-lock.released.v1.json', lock],
      ['maintenance-release.v1.json', release],
      ['cutoff-witness.json', cutoff],
    ] as const)
      writeFileSync(path.join(repairRoot, name), record(value));
    return { selector, selectorSha, cutoffSha: digestRecord(cutoff), repairRoot };
  };

  const runForwardAuthorityJournalFixture = async (extraMappedDocument?: {
    readonly path: string;
    readonly originalBytes: string;
  }) => {
    const prepared = await preparedFixture(extraMappedDocument ? { extraMappedDocument } : undefined);
    const { f, input, baseline, targetPolicy, args } = prepared;
    const root = f.root;
    const extraDocumentBytes = Buffer.from('# Forward extra document after the admitted transition\n');
    let completed = false;
    try {
      const digestBytes = (bytes: string | Uint8Array) => createHash('sha256').update(bytes).digest('hex');
      const digestRecord = (value: unknown) => digestBytes(record(value));
      const bundleRoot = path.join(root, 'vida-agent');
      const includeBundleFile = (file: string): boolean =>
        !['node_modules', '.tmp', 'coverage'].includes(path.basename(file)) &&
        !/^\..+\.cas\.lock(?:\.|$)/u.test(path.basename(file));
      rmSync(bundleRoot, { recursive: true, force: true });
      cpSync(f.bundle, bundleRoot, { recursive: true, filter: includeBundleFile });
      const installedDeps = path.join(f.bundle, 'node_modules');
      symlinkSync(installedDeps, path.join(bundleRoot, 'node_modules'), 'junction');
      const lock = existsSync(path.join(f.bundle, 'bun.lock')) ? 'bun.lock' : 'dist/portable/bun.lock';
      const lockBytes = readFileSync(path.join(f.bundle, lock));
      const pinBytes = readFileSync(path.join(f.bundle, '.bun-version'));
      writeFileSync(path.join(bundleRoot, 'bun.lock'), lockBytes);
      writeFileSync(path.join(bundleRoot, '.bun-version'), pinBytes);

      const parentLauncher = Buffer.from('fixture repaired forward launcher\n');
      const originalLauncher = Buffer.from('fixture original forward launcher\n');
      const historyLauncher = Buffer.from('fixture forward history launcher\n');
      const selectedLauncher = Buffer.from('fixture selected forward launcher\n');
      const documentPath = 'vida-agent/instructions/development-lifecycle.md';
      const documentFile = path.join(bundleRoot, 'instructions', 'development-lifecycle.md');
      const oldDocumentBytes = readFileSync(documentFile);
      const newDocumentBytes = Buffer.concat([
        oldDocumentBytes,
        Buffer.from('\nForward parent fixture document change.\n'),
      ]);
      writeFileSync(path.join(bundleRoot, 'bin', 'run.mjs'), parentLauncher);

      const payloadRoot = path.join(root, 'forward-candidate-payload');
      const payloadBundle = path.join(payloadRoot, 'vida-agent');
      mkdirSync(payloadRoot);
      if (extraMappedDocument) {
        const extraPayloadPath = path.join(payloadRoot, extraMappedDocument.path);
        mkdirSync(path.dirname(extraPayloadPath), { recursive: true });
        writeFileSync(extraPayloadPath, extraMappedDocument.originalBytes);
      }
      cpSync(bundleRoot, payloadBundle, { recursive: true, filter: includeBundleFile });
      writeFileSync(path.join(payloadBundle, 'bin', 'run.mjs'), historyLauncher);
      writeFileSync(path.join(payloadBundle, 'instructions', 'development-lifecycle.md'), newDocumentBytes);
      const payloadPolicyPath = path.join(payloadRoot, ...f.policyPath.split('/'));
      mkdirSync(path.dirname(payloadPolicyPath), { recursive: true });
      writeFileSync(payloadPolicyPath, targetPolicy);

      const payloadFiles: { path: string; sha256: string; size: number }[] = [];
      const walkPayload = (relative = ''): void => {
        for (const name of readdirSync(path.join(payloadRoot, relative)).sort()) {
          const file = relative ? `${relative}/${name}` : name;
          const absolute = path.join(payloadRoot, ...file.split('/'));
          const info = lstatSync(absolute);
          if (info.isSymbolicLink()) throw new Error('forward candidate fixture contains a symlink');
          if (info.isDirectory()) walkPayload(file);
          else if (info.isFile()) {
            const bytes = readFileSync(absolute);
            payloadFiles.push({ path: file, sha256: digestBytes(bytes), size: bytes.length });
          } else throw new Error('forward candidate fixture contains an unsupported entry');
        }
      };
      walkPayload();
      payloadFiles.sort((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0));
      const candidateManifest = {
        schema: 'VidaAgentPreparedPayload/v1',
        files: payloadFiles,
        unresolved_integration_paths: [],
      };
      let candidateManifestBytes = Buffer.from(record(candidateManifest));
      const candidateManifestPath = path.join(payloadRoot, 'vida-agent-payload.manifest.v1.json');
      writeFileSync(candidateManifestPath, candidateManifestBytes);
      const oldPolicyBytes = readFileSync(path.join(root, ...f.policyPath.split('/')));
      const withPreimages = (launcher: Uint8Array) => ({
        schema: candidateManifest.schema,
        files: payloadFiles.map((entry) =>
          entry.path === 'vida-agent/bin/run.mjs'
            ? { path: entry.path, sha256: digestBytes(launcher), size: launcher.length }
            : entry.path === f.policyPath
              ? { path: entry.path, sha256: digestBytes(oldPolicyBytes), size: oldPolicyBytes.length }
              : entry.path === documentPath
                ? { path: entry.path, sha256: digestBytes(oldDocumentBytes), size: oldDocumentBytes.length }
                : entry,
        ),
        unresolved_integration_paths: candidateManifest.unresolved_integration_paths,
      });
      const grandparentManifest = withPreimages(originalLauncher);
      const repairSuccessorManifest = withPreimages(parentLauncher);
      const lineage = buildRepairParentFixture(root, grandparentManifest, repairSuccessorManifest);
      const history = buildForwardLeafFixture(
        root,
        lineage.selector,
        lineage.selectorSha,
        lineage.cutoffSha,
        repairSuccessorManifest,
        undefined,
        { path: f.policyPath, bytes: Buffer.from(targetPolicy) },
        {
          generation: 'fixture-forward-history',
          launcher: historyLauncher,
          additionalChanges: [
            { path: documentPath, bytes: newDocumentBytes },
            ...(extraMappedDocument ? [{ path: extraMappedDocument.path, bytes: extraDocumentBytes }] : []),
          ],
        },
      );
      if (extraMappedDocument) {
        const entry = payloadFiles.find((candidate) => candidate.path === extraMappedDocument.path);
        if (!entry) throw new Error('forward extra mapped document preimage is missing');
        entry.sha256 = digestBytes(extraDocumentBytes);
        entry.size = extraDocumentBytes.length;
        writeFileSync(path.join(payloadRoot, extraMappedDocument.path), extraDocumentBytes);
        candidateManifestBytes = Buffer.from(record(candidateManifest));
        writeFileSync(candidateManifestPath, candidateManifestBytes);
      }
      const forwardRoot = path.join(root, '.agent', 'cutover', 'fixture-forward-leaf');
      const forward = buildForwardLeafFixture(
        root,
        history.selector,
        history.selectorSha,
        history.cutoffSha,
        history.successorManifest,
        undefined,
        undefined,
        { launcher: selectedLauncher },
      );
      const historyIntentBytes = readFileSync(path.join(history.generationRoot, 'forward-intent.v1.json'));
      const successorManifestSha = history.selector.payload_manifest_sha256;
      if (typeof successorManifestSha !== 'string') throw new Error('forward candidate manifest digest is absent');
      expect(digestBytes(candidateManifestBytes)).toBe(successorManifestSha);
      writeFileSync(path.join(root, '.agent', 'active-runtime-selector.v1.json'), record(lineage.selector));
      writeFileSync(path.join(lineage.repairRoot, 'maintenance-lock.v1.json'), historyIntentBytes);

      const reconcilerUrl = pathToFileURL(path.join(bundleRoot, 'bin', 'reconcile-artifacts.ts')).href;
      const importedReconciler: unknown = await import(reconcilerUrl);
      if (
        importedReconciler === null ||
        typeof importedReconciler !== 'object' ||
        !('runReconcileArtifacts' in importedReconciler) ||
        typeof importedReconciler.runReconcileArtifacts !== 'function'
      )
        throw new Error('reconcile entrypoint export is absent');
      const runTransition = importedReconciler.runReconcileArtifacts as (values: string[]) => Promise<unknown>;
      const transitionArgs = (mode: string): string[] => {
        const values = args(mode);
        const repairIndex = values.indexOf('--repair-id');
        if (repairIndex < 0) throw new Error('documentation policy fixture repair option is absent');
        const targetIndex = values.indexOf('--target-policy');
        values[repairIndex + 1] = history.selector.generation;
        if (targetIndex >= 0) values[targetIndex + 1] = f.policyPath;
        else if (mode === 'plan') throw new Error('documentation policy fixture target option is absent');
        values.push('--forward-operation', history.selector.generation, '--payload-root', payloadRoot);
        return values;
      };
      const planResult = requireRecord(
        await runTransition(transitionArgs('plan')),
        'forward documentation transition plan result',
      );
      expect(planResult.status).toBe('planned');
      const applyResult = requireRecord(
        await runTransition(transitionArgs('apply')),
        'forward documentation transition apply result',
      );
      expect(applyResult.status).toBe('author_policy_required');
      f.put(f.policyPath, targetPolicy);
      if (extraMappedDocument) f.put(extraMappedDocument.path, extraDocumentBytes);
      const resumeResult = requireRecord(
        await runTransition(transitionArgs('resume')),
        'forward documentation transition resume result',
      );
      expect(resumeResult.status).toBe('applied');

      const transitionPath = `.agent/work/${f.work}/documentation-policy-transition.v1.json`;
      const transitionFile = path.join(root, ...transitionPath.split('/'));
      const transitionBytes = readFileSync(transitionFile);
      const transition = requireRecord(JSON.parse(transitionBytes.toString('utf8')), 'applied policy transition');
      const transitionPlan = requireRecord(transition.plan, 'applied policy transition plan');
      const historyPlan = requireRecord(JSON.parse(historyIntentBytes.toString('utf8')), 'forward history plan');
      const sourceAdmission = requireRecord(transitionPlan.source_admission, 'verified forward source admission');
      const closeout = requireRecord(transition.closeout, 'applied policy closeout');
      expect(sourceAdmission.operation_id).toBe(history.selector.generation);
      expect(sourceAdmission.payload_root).toBe(payloadRoot);
      expect(sourceAdmission.parent_selector_sha256).toBe(historyPlan.parent_selector_sha256);
      expect(sourceAdmission.parent_manifest_sha256).toBe(historyPlan.old_payload_manifest_sha256);
      expect(sourceAdmission.successor_manifest_sha256).toBe(historyPlan.new_payload_manifest_sha256);
      expect(sourceAdmission.intent_sha256).toBe(digestBytes(historyIntentBytes));
      expect(sourceAdmission.target_path).toBe(f.policyPath);
      expect(sourceAdmission.target_sha256).toBe(digestBytes(Buffer.from(targetPolicy)));
      assert.ok(typeof closeout.path === 'string');
      assert.ok(typeof closeout.sha256 === 'string');
      const closeoutPath = closeout.path;
      const closeoutBytes = readFileSync(path.join(root, ...closeoutPath.split('/')));
      expect(digestBytes(closeoutBytes)).toBe(closeout.sha256);
      const baselineBytes = readFileSync(path.join(root, ...baseline.path.split('/')));
      const baselineRecord = requireRecord(JSON.parse(baselineBytes.toString('utf8')), 'actual CLEAR baseline');
      const receiptPath = 'documentation-forward.v1.json';
      const binding = {
        schema: 'VidaForwardLifecycleClearBinding/v1',
        operation_id: history.selector.generation,
        baseline_path: baseline.path,
        baseline_digest: baselineRecord.digest,
        policy_sha256: sourceAdmission.target_sha256,
        parent_manifest_sha256: historyPlan.old_payload_manifest_sha256,
        successor_manifest_sha256: historyPlan.new_payload_manifest_sha256,
      };
      const event = {
        schema: 'VidaForwardUpdateEvent/v1',
        phase: 'documentation_closeout_verified',
        operation_id: history.selector.generation,
        lock_sha256: digestRecord(historyPlan),
        receipt_path: `.agent/cutover/${history.selector.generation}/${receiptPath}`,
        closeout_sha256: closeout.sha256,
      };
      writeFileSync(path.join(history.generationRoot, receiptPath), record(binding));
      const forwardJournalPath = path.join(history.generationRoot, 'forward-journal.v1.jsonl'),
        forwardJournalBytes = Buffer.from(JSON.stringify(event) + '\n');
      writeFileSync(forwardJournalPath, forwardJournalBytes);
      unlinkSync(path.join(lineage.repairRoot, 'maintenance-lock.v1.json'));

      const agentRoot = path.join(root, '.agent');
      const databasePath = path.join(agentRoot, 'work', 'session-handoff.v1.sqlite');
      const policyPath = path.join(root, ...f.policyPath.split('/'));
      const changelogPath = path.join(root, ...f.oldPolicy.changelog_path.split('/'));
      const workRoot = path.join(root, '.agent', 'work', f.work);
      const launcherPath = path.join(bundleRoot, 'bin', 'run.mjs');
      const snapshot = () => ({
        agent: snapshotAuthorityFixture(agentRoot, true),
        database: readFileSync(databasePath),
        policy: readFileSync(policyPath),
        changelog: readFileSync(changelogPath),
        launcher: readFileSync(launcherPath),
        document: readFileSync(documentFile),
        candidateManifest: readFileSync(candidateManifestPath),
        candidatePolicy: readFileSync(payloadPolicyPath),
        extraDocument: extraMappedDocument ? readFileSync(path.join(root, extraMappedDocument.path)) : null,
        extraPayloadDocument: extraMappedDocument
          ? readFileSync(path.join(payloadRoot, extraMappedDocument.path))
          : null,
        evidenceMetadata: [
          snapshotAuthorityMetadata(databasePath),
          snapshotAuthorityMetadata(agentRoot),
          snapshotAuthorityMetadata(policyPath),
          snapshotAuthorityMetadata(changelogPath),
          snapshotAuthorityMetadata(launcherPath),
          snapshotAuthorityMetadata(documentFile),
          snapshotAuthorityMetadata(workRoot),
          snapshotAuthorityMetadata(candidateManifestPath),
          snapshotAuthorityMetadata(payloadPolicyPath),
          ...(extraMappedDocument ? [snapshotAuthorityMetadata(path.join(root, extraMappedDocument.path))] : []),
          ...(extraMappedDocument ? [snapshotAuthorityMetadata(path.join(payloadRoot, extraMappedDocument.path))] : []),
        ],
      });
      const expectReadOnly = (before: ReturnType<typeof snapshot>) => expect(snapshot()).toEqual(before);
      const withRestoredBytes = (file: string, bytes: string | Uint8Array, action: () => void) => {
        const original = readFileSync(file);
        writeFileSync(file, bytes);
        try {
          action();
        } finally {
          writeFileSync(file, original);
        }
      };
      const expectAuthorityRefusal = (
        selector: Parameters<typeof forwardUpdateAuthority>[1],
        selectorSha: string,
        generationRoot: string,
        reason: string,
      ) => {
        const before = snapshot();
        let caught: unknown;
        try {
          forwardUpdateAuthority(root, selector, selectorSha, generationRoot);
        } catch (error) {
          caught = error;
        }
        expect(caught).toMatchObject({
          code: 'GAP-VIDA-RUN-SELECTOR-001',
          message: `Forward policy proof invalid: ${reason}`,
        });
        expectReadOnly(before);
      };
      const rebindForwardTransition = (updates: Record<string, unknown>) => {
        const { operation_digest: _operationDigest, ...operationBody } = transition;
        const nextBody = { ...operationBody, ...updates };
        return { ...nextBody, operation_digest: canonicalJsonDigest(nextBody) };
      };
      const withoutForwardSourceAdmission = () => {
        const plan: Record<string, unknown> = { ...transitionPlan, source_admission: null };
        plan.fence_binding = documentationPolicyTransitionFence(plan);
        return rebindForwardTransition({ plan, plan_digest: canonicalJsonDigest(plan) });
      };
      const withoutForwardCloseout = () =>
        rebindForwardTransition({ closeout: null, phase: 'fenced', maintenance_released: false });
      const encodeEvents = (events: unknown[]) =>
        Buffer.from(events.map((event) => JSON.stringify(event)).join('\n') + '\n');
      writeFileSync(documentFile, newDocumentBytes);
      writeFileSync(path.join(bundleRoot, 'bin', 'run.mjs'), historyLauncher);
      const beforeHistory = snapshot();
      if (extraMappedDocument) {
        expectAuthorityRefusal(
          history.selector,
          history.selectorSha,
          history.generationRoot,
          'leaf canonical identity differs',
        );
        completed = true;
        return;
      }
      expect(forwardUpdateAuthority(root, history.selector, history.selectorSha, history.generationRoot)).toBeNull();
      expectReadOnly(beforeHistory);

      withRestoredBytes(forwardJournalPath, Buffer.concat([forwardJournalBytes, forwardJournalBytes]), () =>
        expectAuthorityRefusal(
          history.selector,
          history.selectorSha,
          history.generationRoot,
          'leaf forward journal/receipt differs',
        ),
      );

      withRestoredBytes(transitionFile, record(withoutForwardCloseout()), () =>
        expectAuthorityRefusal(
          history.selector,
          history.selectorSha,
          history.generationRoot,
          'leaf closeout work path differs',
        ),
      );

      withRestoredBytes(transitionFile, record(withoutForwardSourceAdmission()), () =>
        expectAuthorityRefusal(
          history.selector,
          history.selectorSha,
          history.generationRoot,
          'leaf transition plan is invalid',
        ),
      );

      writeFileSync(documentFile, oldDocumentBytes);
      const historicalBaseline = await executeDocumentationClearFromWork(input, 'baseline');
      expect(historicalBaseline.status).toBe('pass');
      writeFileSync(documentFile, newDocumentBytes);
      const beforeHistoricalChangelog = readFileSync(changelogPath);
      const matchingPolicyEvent = beforeHistoricalChangelog
        .toString('utf8')
        .trim()
        .split('\n')
        .map((line) => requireRecord(JSON.parse(line), 'actual policy transition event'))
        .find(
          (entry) =>
            entry.path_after === f.policyPath &&
            entry.before_sha256 === digestBytes(oldPolicyBytes) &&
            entry.after_sha256 === sourceAdmission.target_sha256,
        );
      if (
        !matchingPolicyEvent ||
        typeof matchingPolicyEvent.actor !== 'string' ||
        typeof matchingPolicyEvent.pointer !== 'string'
      )
        throw new Error('applied transition policy event is absent');
      const historicalDocumentEvent = {
        schema: 'DocumentationChangeEvent/v1',
        event_id: 'fixture-forward-parent-document-finalize',
        logical_edit_id: 'fixture-forward-parent-document-finalize',
        work_id: f.work,
        source_revision: input.source_revision,
        operation: 'finalize',
        document_id: documentPath,
        path_before: documentPath,
        path_after: documentPath,
        before_sha256: digestBytes(oldDocumentBytes),
        after_sha256: digestBytes(newDocumentBytes),
        actor: matchingPolicyEvent.actor,
        pointer: matchingPolicyEvent.pointer,
        timestamp: new Date().toISOString(),
      };
      const historicalChangelogBytes = Buffer.concat([
        beforeHistoricalChangelog,
        Buffer.from(JSON.stringify(historicalDocumentEvent) + '\n'),
      ]);
      writeFileSync(changelogPath, historicalChangelogBytes);
      unlinkSync(transitionFile);
      let historicalCloseout: Awaited<ReturnType<typeof executeDocumentationClearFromWork>>;
      try {
        historicalCloseout = await executeDocumentationClearFromWork(input, 'closeout');
      } finally {
        writeFileSync(transitionFile, transitionBytes);
      }
      expect(historicalCloseout.status).toBe('pass');

      writeFileSync(path.join(bundleRoot, 'bin', 'run.mjs'), selectedLauncher);
      writeFileSync(path.join(root, '.agent', 'active-runtime-selector.v1.json'), record(forward.selector));
      const beforeLeaf = snapshot();
      expect(forwardUpdateAuthority(root, forward.selector, forward.selectorSha, forwardRoot)).toBeNull();
      expectReadOnly(beforeLeaf);

      const installedPolicyBytes = readFileSync(policyPath);
      const installedPolicy = requireRecord(
        JSON.parse(installedPolicyBytes.toString('utf8')),
        'installed policy identity',
      );
      const missingChangelogPolicy = record({ ...installedPolicy, changelog_path: null, changelog_required: false });
      withRestoredBytes(policyPath, missingChangelogPolicy, () =>
        expectAuthorityRefusal(
          forward.selector,
          forward.selectorSha,
          forwardRoot,
          'committed policy changelog path is invalid',
        ),
      );

      withRestoredBytes(changelogPath, encodeEvents([historicalDocumentEvent]), () =>
        expectAuthorityRefusal(
          forward.selector,
          forward.selectorSha,
          forwardRoot,
          'committed policy event missing or ambiguous',
        ),
      );
      const invalidWorkEvent = { ...matchingPolicyEvent, work_id: 'bad work id' };
      withRestoredBytes(changelogPath, encodeEvents([invalidWorkEvent, historicalDocumentEvent]), () =>
        expectAuthorityRefusal(forward.selector, forward.selectorSha, forwardRoot, 'committed event work invalid'),
      );
      withRestoredBytes(changelogPath, encodeEvents([matchingPolicyEvent]), () =>
        expectAuthorityRefusal(
          forward.selector,
          forward.selectorSha,
          forwardRoot,
          'committed policy event/CLEAR closure missing or ambiguous',
        ),
      );

      const malformedCheckpoint = path.join(workRoot, 'documentation-baseline-9999.v1.json');
      writeFileSync(malformedCheckpoint, '{}\n');
      try {
        const beforeMalformedCheckpoint = snapshot();
        expect(forwardUpdateAuthority(root, forward.selector, forward.selectorSha, forwardRoot)).toBeNull();
        expectReadOnly(beforeMalformedCheckpoint);
      } finally {
        rmSync(malformedCheckpoint, { force: true });
      }

      const excessCheckpoints = Array.from({ length: 257 }, (_, index) =>
        path.join(workRoot, `documentation-baseline-${String(7000 + index).padStart(4, '0')}.v1.json`),
      );
      for (const file of excessCheckpoints) writeFileSync(file, '');
      try {
        expectAuthorityRefusal(
          forward.selector,
          forward.selectorSha,
          forwardRoot,
          'committed checkpoint inventory exceeds bound',
        );
      } finally {
        for (const file of excessCheckpoints) rmSync(file, { force: true });
      }

      const incompleteHistory = buildForwardLeafFixture(
        root,
        lineage.selector,
        lineage.selectorSha,
        lineage.cutoffSha,
        repairSuccessorManifest,
        undefined,
        { path: f.policyPath, bytes: Buffer.from(targetPolicy) },
        {
          generation: 'fixture-forward-history-missing-change',
          launcher: historyLauncher,
          additionalChanges: [{ path: documentPath, bytes: newDocumentBytes }],
          omitPlanChangedPaths: [f.policyPath],
        },
      );
      const incompleteOuter = buildForwardLeafFixture(
        root,
        incompleteHistory.selector,
        incompleteHistory.selectorSha,
        incompleteHistory.cutoffSha,
        incompleteHistory.successorManifest,
        undefined,
        undefined,
        { generation: 'fixture-forward-leaf-missing-change', launcher: selectedLauncher },
      );
      writeFileSync(path.join(root, '.agent', 'active-runtime-selector.v1.json'), record(incompleteOuter.selector));
      expectAuthorityRefusal(
        incompleteOuter.selector,
        incompleteOuter.selectorSha,
        incompleteOuter.generationRoot,
        'committed policy change is missing',
      );
      completed = true;
    } finally {
      if (completed) rmSync(root, { recursive: true, force: true });
      else process.stderr.write(`Retained failed admitted forward journal fixture: ${root}\n`);
    }
  };

  test('forward authority parses an admitted CLEAR journal and rejects a noncanonical mapped-document identity', async () => {
    await runForwardAuthorityJournalFixture();
    await runForwardAuthorityJournalFixture({
      path: 'docs/agent-instructions/zz-forward-extra.md',
      originalBytes: '# Forward extra document before the admitted transition\n',
    });
  }, 120000);

  test('forward authority rejects a repeated generation and an eight-record parent chain before reading', () => {
    for (const [name, seen] of [
      ['repeated generation', new Set(['selected-generation'])],
      ['parent-chain bound', new Set(Array.from({ length: 8 }, (_, index) => `ancestor-${index}`))],
    ] as const) {
      const root = mkdtempSync(path.join(tmpdir(), 'vida-forward-authority-guard-'));
      let completed = false;
      try {
        const before = readdirSync(root).sort();
        let caught: unknown;
        try {
          forwardUpdateAuthority(root, authorityRefusalSelector, '', root, true, seen);
        } catch (error) {
          caught = error;
        }
        expect(caught).toMatchObject({
          code: 'GAP-VIDA-RUN-SELECTOR-001',
          message: 'Forward parent chain cycles or exceeds bound.',
        });
        expect(readdirSync(root).sort()).toEqual(before);
        completed = true;
      } finally {
        if (completed) rmSync(root, { recursive: true, force: true });
        else process.stderr.write(`Retained failed forward authority guard fixture (${name}): ${root}\n`);
      }
    }
  });

  const rejectFirstAuthorityRecord = (
    reader: 'repair' | 'forward',
    kind: 'missing' | 'nonregular' | 'json' | 'scalar' | 'noncanonical' | 'schema' | 'fields',
  ): void => {
    const root = mkdtempSync(path.join(tmpdir(), `vida-${reader}-authority-${kind}-`));
    const filename = reader === 'repair' ? 'repair-plan.v1.json' : 'forward-intent.v1.json';
    const schema = reader === 'repair' ? 'VidaActiveLauncherRepairPlan/v1' : 'VidaForwardUpdateMaintenance/v1';
    const recordPath = path.join(root, filename);
    const companionRecords =
      reader === 'repair'
        ? ([
            ['repair-authorization.v1.json', 'VidaActiveLauncherRepairAuthorization/v1'],
            ['repair-decision.v1.json', 'VidaActiveLauncherRepairDecision/v1'],
            ['repair-selector-commit.v1.json', 'VidaActiveLauncherRepairSelectorCommit/v1'],
          ] as const)
        : ([
            ['forward-authorization.v1.json', 'VidaForwardUpdateAuthorization/v1'],
            ['forward-decision.v1.json', 'VidaForwardUpdateDecision/v1'],
            ['forward-selector-commit.v1.json', 'VidaForwardUpdateSelectorCommit/v1'],
            ['parent-selector.v1.json', 'ActiveRuntimeSelector/v1'],
            ['maintenance-lock.released.v1.json', 'VidaForwardUpdateMaintenance/v1'],
            ['maintenance-release.v1.json', 'VidaForwardUpdateRelease/v1'],
            ['cutoff-witness.json', 'VidaNewWorkCutoffWitness/v1'],
          ] as const);
    let completed = false;
    try {
      if (kind === 'nonregular') mkdirSync(recordPath);
      if (kind === 'json') writeFileSync(recordPath, '{');
      if (kind === 'scalar') writeFileSync(recordPath, 'null\n');
      if (kind === 'noncanonical') writeFileSync(recordPath, `{"schema":"${schema}","controlled":true}\n`);
      if (kind === 'schema')
        writeFileSync(recordPath, `${JSON.stringify({ schema: 'WrongControlledSchema' }, null, 2)}\n`);
      if (kind === 'fields') {
        writeFileSync(recordPath, `${JSON.stringify({ schema, unexpected: 'negative decoder input' }, null, 2)}\n`);
        for (const [name, companionSchema] of companionRecords)
          writeFileSync(path.join(root, name), `${JSON.stringify({ schema: companionSchema }, null, 2)}\n`);
      }
      const before = snapshotAuthorityFixture(root);
      let caught: unknown;
      try {
        if (reader === 'repair') repairAuthority(root, authorityRefusalSelector, '', root, true);
        else forwardUpdateAuthority(root, authorityRefusalSelector, '', root, true);
      } catch (error) {
        caught = error;
      }
      const message =
        kind === 'json'
          ? 'Cutover authority is invalid.'
          : kind === 'missing'
            ? 'Cutover authority is missing.'
            : kind === 'nonregular'
              ? 'Cutover authority is not a regular file.'
              : kind === 'fields'
                ? reader === 'repair'
                  ? 'Repair authority is invalid.'
                  : 'Forward update proof is invalid.'
                : 'Cutover authority has an invalid shape or encoding.';
      expect(caught).toMatchObject({
        code: 'GAP-VIDA-RUN-SELECTOR-001',
        message,
      });
      expect(snapshotAuthorityFixture(root)).toEqual(before);
      completed = true;
    } finally {
      if (completed) rmSync(root, { recursive: true, force: true });
      else process.stderr.write(`Retained failed ${reader} authority ${kind} fixture: ${root}\n`);
    }
  };

  test('repair authority rejects malformed first controller records without writes', () => {
    for (const kind of ['missing', 'nonregular', 'json', 'scalar', 'noncanonical', 'schema', 'fields'] as const)
      rejectFirstAuthorityRecord('repair', kind);
  });

  test('repair authority rejects malformed review evidence at its evidence boundary without writes', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'vida-repair-review-evidence-'));
    let completed = false;
    try {
      const digestRecord = (value: unknown) => createHash('sha256').update(record(value)).digest('hex');
      const invalidEvidence: readonly unknown[] = [
        [],
        [{ kind: 'correctness' }, { kind: 'security' }, { kind: 'other' }],
        [null],
        'string control',
      ];
      for (const evidence of invalidEvidence) {
        const authorization = {
          schema: 'VidaActiveLauncherRepairAuthorization/v1',
          repair_id: authorityRefusalSelector.generation,
          operator: 'fixture-owner',
          outcome: 'approved',
          pointer: 'fixture:invalid-review-evidence',
          old_generation: 'parent-generation',
          old_selector_sha256: 'c'.repeat(64),
          old_payload_manifest_sha256: 'd'.repeat(64),
          old_launcher_sha256: 'e'.repeat(64),
          new_payload_manifest_sha256: 'b'.repeat(64),
          new_launcher_sha256: 'f'.repeat(64),
          evidence,
        };
        const plan = {
          schema: 'VidaActiveLauncherRepairPlan/v1',
          repair_id: authorityRefusalSelector.generation,
          operator: 'fixture-owner',
          parent_cutover_id: 'parent-generation',
          parent_selector_sha256: 'c'.repeat(64),
          parent_payload_manifest_sha256: 'd'.repeat(64),
          parent_launcher_sha256: 'e'.repeat(64),
          successor_payload_manifest_sha256: 'b'.repeat(64),
          successor_launcher_sha256: 'f'.repeat(64),
          archive_manifest_sha256: 'a'.repeat(64),
          authorization_sha256: digestRecord(authorization),
        };
        const selectorIntent: Parameters<typeof repairAuthority>[1] = {
          schema: 'ActiveRuntimeSelector/v1',
          generation: authorityRefusalSelector.generation,
          runtime: 'vida-agent',
          bundle_root: 'vida-agent',
          config_path: 'agent-runtime.config.v1.yaml',
          archive_manifest_sha256: plan.archive_manifest_sha256,
          plan_sha256: digestRecord(plan),
          payload_manifest_sha256: plan.successor_payload_manifest_sha256,
          state_policy: 'clean_start_no_ticket_transfer',
        };
        const decision = {
          schema: 'VidaActiveLauncherRepairDecision/v1',
          repair_id: selectorIntent.generation,
          operator: plan.operator,
          plan_sha256: selectorIntent.plan_sha256,
          authorization_sha256: plan.authorization_sha256,
          selector_intent_sha256: digestRecord(selectorIntent),
          outcome: 'approved',
        };
        const selector = {
          ...selectorIntent,
          activation_decision_sha256: digestRecord(decision),
        };
        const selectorSha = digestRecord(selector);
        const commit = {
          schema: 'VidaActiveLauncherRepairSelectorCommit/v1',
          repair_id: selector.generation,
          plan_sha256: selector.plan_sha256,
          decision_sha256: selector.activation_decision_sha256,
          selector_sha256: selectorSha,
        };
        writeFileSync(path.join(root, 'repair-plan.v1.json'), record(plan));
        writeFileSync(path.join(root, 'repair-authorization.v1.json'), record(authorization));
        writeFileSync(path.join(root, 'repair-decision.v1.json'), record(decision));
        writeFileSync(path.join(root, 'repair-selector-commit.v1.json'), record(commit));
        const before = snapshotAuthorityFixture(root);
        let caught: unknown;
        try {
          repairAuthority(root, selector, selectorSha, root, true);
        } catch (error) {
          caught = error;
        }
        expect(caught).toMatchObject({
          code: 'GAP-VIDA-RUN-SELECTOR-001',
          message: 'Repair review bindings are invalid.',
        });
        expect(snapshotAuthorityFixture(root)).toEqual(before);
      }
      completed = true;
    } finally {
      if (completed) rmSync(root, { recursive: true, force: true });
      else process.stderr.write(`Retained failed repair review-evidence fixture: ${root}\n`);
    }
  });

  test('forward authority rejects malformed first controller records without writes', () => {
    for (const kind of ['missing', 'nonregular', 'json', 'scalar', 'noncanonical', 'schema', 'fields'] as const)
      rejectFirstAuthorityRecord('forward', kind);
  });

  test('forward authority refuses linked malformed records before reading review receipts or writing', () => {
    const changedMemberFieldCases: readonly [
      string,
      'path' | 'old_sha256' | 'new_sha256' | 'old_size' | 'new_size',
      unknown,
    ][] = [
      ['path', 'path', null],
      ['old digest', 'old_sha256', 7],
      ['new digest', 'new_sha256', null],
      ['old size', 'old_size', '1'],
      ['new size', 'new_size', null],
    ];
    const cases: readonly {
      name: string;
      change: Parameters<typeof buildForwardRefusalFixture>[1];
      message: string;
    }[] = [
      {
        name: 'plan required header type',
        change: ({ plan }) => {
          plan.parent_generation = 7;
        },
        message: 'Forward update proof is invalid.',
      },
      {
        name: 'authorization required header type',
        change: ({ authorization }) => {
          authorization.pointer = null;
        },
        message: 'Forward update proof is invalid.',
      },
      {
        name: 'optional first admitted attempt type',
        change: ({ plan }) => {
          plan.first_admitted_work_attempt = true;
        },
        message: 'Forward update records are invalid.',
      },
      {
        name: 'changed collection type',
        change: ({ plan }) => {
          plan.changed = null;
        },
        message: 'Forward update records are invalid.',
      },
      {
        name: 'preserved collection type',
        change: ({ plan }) => {
          plan.preserved_mutable_outputs = null;
        },
        message: 'Forward update records are invalid.',
      },
      {
        name: 'changed collection member type',
        change: ({ plan }) => {
          plan.changed = [null];
        },
        message: 'Forward update records are invalid.',
      },
      ...changedMemberFieldCases.map(([fieldName, field, value]) => ({
        name: `changed collection member ${fieldName} type`,
        change: ({ plan }: { plan: Record<string, unknown> }) => {
          plan.changed = [
            {
              path: 'vida-agent/bin/run.mjs',
              old_sha256: 'd'.repeat(64),
              new_sha256: 'e'.repeat(64),
              old_size: 1,
              new_size: 1,
              [field]: value,
            },
          ];
        },
        message: 'Forward update records are invalid.',
      })),
      {
        name: 'parent selector missing required fields',
        change: ({ parent }) => {
          for (const key of ['generation', 'runtime', 'bundle_root', 'config_path', 'plan_sha256']) delete parent[key];
        },
        message: 'Forward parent selector is invalid.',
      },
      {
        name: 'parent selector extra field',
        change: ({ parent }) => {
          parent.unexpected = 'untrusted fixture field';
        },
        message: 'Forward parent selector is invalid.',
      },
      {
        name: 'review evidence wrong length',
        change: ({ authorization }) => {
          authorization.evidence = [];
        },
        message: 'Forward review bindings are invalid.',
      },
      {
        name: 'review evidence wrong kinds',
        change: ({ evidence }) => {
          const first = evidence[0];
          if (!first) throw new Error('forward review fixture item is missing');
          evidence[0] = { ...first, kind: 'other' };
        },
        message: 'Forward review bindings are invalid.',
      },
      {
        name: 'review evidence null',
        change: ({ authorization }) => {
          authorization.evidence = null;
        },
        message: 'Forward review bindings are invalid.',
      },
      {
        name: 'review evidence string',
        change: ({ authorization }) => {
          authorization.evidence = 'untrusted parser input';
        },
        message: 'Forward review bindings are invalid.',
      },
      {
        name: 'kind-valid review item with invalid status',
        change: ({ evidence }) => {
          const first = evidence[0];
          if (!first) throw new Error('forward review fixture item is missing');
          evidence[0] = { ...first, status: 'reviewed' };
        },
        message: 'Forward review evidence is invalid.',
      },
      {
        name: 'kind-valid review item with invalid field shape',
        change: ({ evidence }) => {
          const first = evidence[0];
          if (!first) throw new Error('forward review fixture item is missing');
          evidence[0] = { ...first, path: null };
        },
        message: 'Forward review evidence is invalid.',
      },
    ];
    for (const scenario of cases) {
      const root = mkdtempSync(path.join(tmpdir(), 'vida-forward-linked-refusal-'));
      let completed = false;
      try {
        const { selector, selectorSha } = buildForwardRefusalFixture(root, scenario.change);
        const before = snapshotAuthorityFixture(root);
        let caught: unknown;
        try {
          forwardUpdateAuthority(root, selector, selectorSha, root, true);
        } catch (error) {
          caught = error;
        }
        expect(caught).toMatchObject({ code: 'GAP-VIDA-RUN-SELECTOR-001', message: scenario.message });
        expect(snapshotAuthorityFixture(root)).toEqual(before);
        completed = true;
      } finally {
        if (completed) rmSync(root, { recursive: true, force: true });
        else process.stderr.write(`Retained failed forward linked refusal (${scenario.name}): ${root}\n`);
      }
    }
  });

  test('repair and forward authority validate evidence without mutating inputs', async () => {
    for (const scenario of [
      'parent-evidence-mismatch',
      'repair-review-entry-status',
      'repair-parent-selector-extra-field',
      'repair-default-installed-bundle',
      'repair-payload-delta-mismatch',
      'repair-installed-payload-drift',
      'repair-maintenance-lock-active',
      'repair-release-proof-extra-field',
      'repair-cutoff-admitted-attempt',
      'malformed-source-path',
      'malformed-payload-manifest',
      'duplicate-payload-path',
      'forward-leaf',
      'forward-payload-manifest-digest',
      'forward-installed-bundle-inventory-mismatch',
      'forward-installed-bundle-symlink',
      'forward-parent-cutoff-drift',
      'forward-parent-authority-ambiguous',
      'forward-preserved-output-overbound',
      'forward-partial-integration-retirement',
      'forward-preserved-output-pointer-mismatch',
      'forward-generated-root-agents-added',
      'forward-generated-root-agents-provenance-mismatch',
      'forward-generated-root-agents-installed-drift',
      'forward-generated-root-agents-parent-lineage',
      'forward-source-provenance-mismatch',
      'forward-installed-bundle-leaf-drift',
      'forward-changed-path-proof-mismatch',
      ...(process.platform === 'win32' ? [] : (['forward-installed-bundle-unsupported-node'] as const)),
      'forward-documentation-path-refusal',
      'forward-documentation-baseline-path-non-string',
      'forward-documentation-baseline-work-id-mismatch',
      'forward-documentation-evidence-under-bound',
      'forward-documentation-evidence-over-bound',
    ] as const) {
      const root = mkdtempSync(
        path.join(
          tmpdir(),
          scenario === 'forward-installed-bundle-unsupported-node' ? 'vuns-' : `vida-repair-${scenario}-`,
        ),
      );
      let completed = false;
      let unsupportedNodeServer: ReturnType<typeof createServer> | null = null;
      let unsupportedNodePath: string | null = null;
      try {
        const digestRecord = (value: unknown) => createHash('sha256').update(record(value)).digest('hex');
        const parentGeneration = 'fixture-repair-parent';
        const childGeneration = 'fixture-repair-child';
        const parentRoot = path.join(root, '.agent', 'cutover', parentGeneration);
        const childRoot = path.join(root, '.agent', 'cutover', childGeneration);
        mkdirSync(parentRoot, { recursive: true });
        mkdirSync(childRoot, { recursive: true });
        const archiveManifestSha256 = 'a'.repeat(64);
        const parentLauncherSha256 = 'c'.repeat(64);
        const successorLauncherBytes = Buffer.from('x');
        const successorLauncherSha256 = createHash('sha256').update(successorLauncherBytes).digest('hex');
        const sharedPayloadSha256 = '1'.repeat(64);
        const changelogPath = 'docs/agent-instructions/agent-instructions.changelog.jsonl';
        const documentationPath = 'docs/agent-instructions/documentation-policy.v1.json';
        const changelogBytes = Buffer.from('installed changelog fixture\n');
        const stagedChangelogBytes = Buffer.from('staged changelog fixture\n');
        const documentationOldBytes = Buffer.from('old documentation policy fixture\n');
        const documentationNewBytes = Buffer.from('forwarded documentation policy fixture\n');
        const documentationChange =
          scenario === 'forward-documentation-path-refusal' ||
          scenario === 'forward-documentation-baseline-path-non-string' ||
          scenario === 'forward-documentation-baseline-work-id-mismatch' ||
          scenario === 'forward-documentation-evidence-under-bound' ||
          scenario === 'forward-documentation-evidence-over-bound'
            ? { path: documentationPath, bytes: documentationNewBytes }
            : null;
        const forwardScenario =
          scenario === 'forward-leaf' ||
          scenario === 'forward-payload-manifest-digest' ||
          scenario === 'forward-installed-bundle-inventory-mismatch' ||
          scenario === 'forward-installed-bundle-symlink' ||
          scenario === 'forward-parent-cutoff-drift' ||
          scenario === 'forward-parent-authority-ambiguous' ||
          scenario === 'forward-preserved-output-overbound' ||
          scenario === 'forward-partial-integration-retirement' ||
          scenario === 'forward-preserved-output-pointer-mismatch' ||
          scenario === 'forward-generated-root-agents-added' ||
          scenario === 'forward-generated-root-agents-provenance-mismatch' ||
          scenario === 'forward-generated-root-agents-installed-drift' ||
          scenario === 'forward-generated-root-agents-parent-lineage' ||
          scenario === 'forward-source-provenance-mismatch' ||
          scenario === 'forward-installed-bundle-leaf-drift' ||
          scenario === 'forward-changed-path-proof-mismatch' ||
          scenario === 'forward-installed-bundle-unsupported-node' ||
          scenario === 'repair-default-installed-bundle' ||
          scenario === 'repair-installed-payload-drift' ||
          scenario === 'repair-maintenance-lock-active' ||
          documentationChange !== null;
        const configBytes = forwardScenario
          ? Buffer.from(
              readFileSync(
                path.join(packageRoot, 'templates/agent-runtime.config.template.v1.yaml'),
                'utf8',
              ).replaceAll('{{BUNDLE}}', 'vida-agent'),
            )
          : null;
        const digestBytes = (bytes: string | Uint8Array) => createHash('sha256').update(bytes).digest('hex');
        const configSha256 = configBytes ? digestBytes(configBytes) : null;
        const generatedRootAgentsScenario =
          scenario === 'forward-generated-root-agents-added' ||
          scenario === 'forward-generated-root-agents-provenance-mismatch' ||
          scenario === 'forward-generated-root-agents-installed-drift' ||
          scenario === 'forward-generated-root-agents-parent-lineage';
        const agentsTemplatePath = 'vida-agent/templates/AGENTS.template.md';
        const agentsTemplateBytes = generatedRootAgentsScenario
          ? readFileSync(path.join(packageRoot, 'templates/AGENTS.template.md'))
          : null;
        const agentsTemplateSha256 = agentsTemplateBytes ? digestBytes(agentsTemplateBytes) : null;
        const generatedRootAgentsBytes = agentsTemplateBytes
          ? Buffer.from(agentsTemplateBytes.toString('utf8').replaceAll('{{BUNDLE}}', 'vida-agent'))
          : null;
        const agentsTemplateEntry =
          agentsTemplateBytes && agentsTemplateSha256
            ? {
                path: agentsTemplatePath,
                sha256: agentsTemplateSha256,
                size: agentsTemplateBytes.length,
                source_path: agentsTemplatePath,
                source_sha256: agentsTemplateSha256,
              }
            : null;
        const sidecarBytes =
          scenario === 'forward-partial-integration-retirement'
            ? readFileSync(path.join(packageRoot, '..', '..', 'AGENT.sidecar.md'))
            : null;
        const sidecarManifestEntry = sidecarBytes
          ? {
              path: 'AGENT.sidecar.md',
              sha256: digestBytes(sidecarBytes),
              size: sidecarBytes.length,
            }
          : null;
        const stagedChangelogSha256 = digestBytes(stagedChangelogBytes);
        const preservedMutableOutput =
          configSha256 === null || generatedRootAgentsScenario
            ? null
            : {
                path: changelogPath,
                config_path: 'agent-runtime.config.v1.yaml',
                config_pointer:
                  scenario === 'forward-preserved-output-pointer-mismatch'
                    ? 'research_decision.paths.wrong'
                    : 'research_decision.paths.changelog',
                config_sha256: configSha256,
                staged_sha256: stagedChangelogSha256,
                installed_sha256_at_inspection: digestBytes(changelogBytes),
              };
        const preservedManifestEntries =
          configSha256 === null || !configBytes
            ? []
            : [
                { path: 'agent-runtime.config.v1.yaml', sha256: configSha256, size: configBytes.length },
                { path: changelogPath, sha256: stagedChangelogSha256, size: stagedChangelogBytes.length },
              ];
        if (configBytes) {
          mkdirSync(path.dirname(path.join(root, changelogPath)), { recursive: true });
          writeFileSync(path.join(root, 'agent-runtime.config.v1.yaml'), configBytes);
          writeFileSync(path.join(root, changelogPath), changelogBytes);
        }
        if (sidecarManifestEntry && sidecarBytes)
          writeFileSync(path.join(root, sidecarManifestEntry.path), sidecarBytes);
        if (agentsTemplateEntry && agentsTemplateBytes && generatedRootAgentsBytes) {
          mkdirSync(path.dirname(path.join(root, agentsTemplatePath)), { recursive: true });
          writeFileSync(path.join(root, agentsTemplatePath), agentsTemplateBytes);
          writeFileSync(path.join(root, 'AGENTS.md'), generatedRootAgentsBytes);
        }
        if (documentationChange) {
          mkdirSync(path.dirname(path.join(root, documentationChange.path)), { recursive: true });
          writeFileSync(path.join(root, documentationChange.path), documentationChange.bytes);
        }
        const parentManifest = {
          schema: 'VidaAgentPreparedPayload/v1',
          files: [
            { path: 'fixture/payload.json', sha256: sharedPayloadSha256, size: 1, source_sha256: sharedPayloadSha256 },
            {
              path: 'vida-agent/bin/run.mjs',
              sha256: parentLauncherSha256,
              size: 1,
              source_sha256: parentLauncherSha256,
            },
            ...(documentationChange
              ? [
                  {
                    path: documentationChange.path,
                    sha256: digestBytes(documentationOldBytes),
                    size: documentationOldBytes.length,
                    source_sha256: digestBytes(documentationOldBytes),
                  },
                ]
              : []),
            ...preservedManifestEntries,
            ...(agentsTemplateEntry ? [agentsTemplateEntry] : []),
            ...(sidecarManifestEntry ? [sidecarManifestEntry] : []),
          ],
          unresolved_integration_paths: [],
        };
        const successorPayloadEntry = {
          path: 'fixture/payload.json',
          sha256: scenario === 'repair-payload-delta-mismatch' ? '2'.repeat(64) : sharedPayloadSha256,
          size: 1,
          source_path:
            forwardScenario ||
            scenario === 'duplicate-payload-path' ||
            scenario === 'repair-payload-delta-mismatch' ||
            scenario === 'repair-release-proof-extra-field' ||
            scenario === 'repair-cutoff-admitted-attempt'
              ? 'fixture/payload.json'
              : '../outside',
          source_sha256: scenario === 'repair-payload-delta-mismatch' ? '2'.repeat(64) : sharedPayloadSha256,
        };
        const successorManifest = {
          schema: 'VidaAgentPreparedPayload/v1',
          files: [
            successorPayloadEntry,
            ...(scenario === 'duplicate-payload-path' ? [successorPayloadEntry] : []),
            ...(documentationChange
              ? [
                  {
                    path: documentationChange.path,
                    sha256: digestBytes(documentationOldBytes),
                    size: documentationOldBytes.length,
                    source_sha256: digestBytes(documentationOldBytes),
                  },
                ]
              : []),
            ...preservedManifestEntries,
            ...(agentsTemplateEntry ? [agentsTemplateEntry] : []),
            ...(sidecarManifestEntry ? [sidecarManifestEntry] : []),
            {
              path: 'vida-agent/bin/run.mjs',
              sha256: successorLauncherSha256,
              size: 1,
              source_sha256: successorLauncherSha256,
            },
          ],
          unresolved_integration_paths: scenario === 'malformed-payload-manifest' ? ['fixture unresolved path'] : [],
        };
        const parentPayloadManifestSha256 = digestRecord(parentManifest);
        const successorPayloadManifestSha256 = digestRecord(successorManifest);
        const parentIntent = {
          schema: 'ActiveRuntimeSelector/v1',
          generation: parentGeneration,
          runtime: 'vida-agent',
          bundle_root: 'vida-agent',
          config_path: 'agent-runtime.config.v1.yaml',
          archive_manifest_sha256: archiveManifestSha256,
          plan_sha256: 'f'.repeat(64),
          payload_manifest_sha256: parentPayloadManifestSha256,
          state_policy: 'clean_start_no_ticket_transfer',
          ...(scenario === 'repair-parent-selector-extra-field' ? { unexpected_field: 'fixture' } : {}),
        };
        const parentEvidence = Object.fromEntries(
          ['parity', 'security', 'assurance', 'rollback', 'dev', 'staged_runtime'].map((kind, index) => {
            const relativePath = `.agent/cutover/${parentGeneration}/${kind}-evidence.json`;
            const bytes = Buffer.from(record({ schema: 'FixtureCutoverEvidence/v1', kind }));
            writeFileSync(path.join(root, ...relativePath.split('/')), bytes);
            return [
              kind,
              {
                actor: 'untrusted fixture datum',
                path: relativePath,
                pointer: `fixture:untrusted-parent-${kind}`,
                sha256:
                  scenario === 'parent-evidence-mismatch' && index === 0
                    ? '0'.repeat(64)
                    : createHash('sha256').update(bytes).digest('hex'),
                status: 'passed',
              },
            ];
          }),
        );
        const parentDecision = {
          schema: 'VidaCutoverActivationDecision/v1',
          actor: 'untrusted fixture datum',
          cutover_id: parentGeneration,
          evidence: parentEvidence,
          outcome: 'approved',
          payload_manifest_sha256: parentIntent.payload_manifest_sha256,
          plan_sha256: parentIntent.plan_sha256,
          pointer: 'fixture:untrusted-parent-decision',
          selector_intent_sha256: digestRecord(parentIntent),
        };
        const parentSelector = {
          ...parentIntent,
          activation_decision_sha256: digestRecord(parentDecision),
        };
        const parentSha = digestRecord(parentSelector);
        const parentCommit = {
          schema: 'VidaPreparedSelectorCommit/v1',
          cutover_id: parentGeneration,
          plan_sha256: parentSelector.plan_sha256,
          activation_decision_sha256: parentSelector.activation_decision_sha256,
          selector_sha256: parentSha,
        };
        const parentJournal = {
          schema: 'VidaPreparedInstallJournal/v1',
          cutover_id: parentGeneration,
          plan_sha256: parentSelector.plan_sha256,
          archive_manifest_sha256: archiveManifestSha256,
          payload_manifest_sha256: parentPayloadManifestSha256,
          archive_scope: 'fixture-parent-scope',
          state_policy: parentSelector.state_policy,
          status: 'installing',
        };
        const parentReady = {
          schema: 'VidaPreparedInstallReady/v1',
          cutover_id: parentGeneration,
          plan_sha256: parentSelector.plan_sha256,
          archive_scope: parentJournal.archive_scope,
          state_policy: parentSelector.state_policy,
          status: 'ready_for_selector',
        };
        const parentLock = {
          schema: 'VidaCutoverMaintenanceLock/v1',
          cutover_id: parentGeneration,
          operator: 'fixture-owner',
          attestation: 'old_runtime_quiesced',
          archive_manifest_sha256: archiveManifestSha256,
          plan_sha256: parentSelector.plan_sha256,
          payload_manifest_sha256: parentPayloadManifestSha256,
          expected_file_count: 0,
          archive_manifest: { manifest_sha256: archiveManifestSha256 },
          plan: {
            schema: 'VidaPreparedInstallPlan/v1',
            plan_sha256: parentSelector.plan_sha256,
            payload_manifest_sha256: parentPayloadManifestSha256,
            archive_manifest_sha256: archiveManifestSha256,
          },
          state_policy: parentSelector.state_policy,
          activation_decision_path: `.agent/cutover/${parentGeneration}/activation-decision.v1.json`,
          activation_decision_sha256: parentSelector.activation_decision_sha256,
        };
        const parentRelease = {
          schema: 'VidaCutoverMaintenanceRelease/v1',
          cutover_id: parentGeneration,
          operator: parentLock.operator,
          lock_sha256: digestRecord(parentLock),
          status: 'released_by_explicit_operator_action',
        };
        const parentCutoff = {
          schema: 'VidaNewWorkCutoffWitness/v1',
          generation: parentGeneration,
          selector_sha256: parentSha,
          first_admitted_work_attempt: null,
        };
        writeFileSync(path.join(root, '.agent', 'cutover', 'active-runtime-selector.v1.json'), record(parentSelector));
        for (const [name, value] of [
          ['selector-commit.json', parentCommit],
          ['activation-decision.v1.json', parentDecision],
          ['prepared-install.json', parentJournal],
          ['install-ready.json', parentReady],
          ['maintenance-lock.released.v1.json', parentLock],
          ['maintenance-release.v1.json', parentRelease],
          ['cutoff-witness.json', parentCutoff],
        ] as const)
          writeFileSync(path.join(parentRoot, name), record(value));

        const childEvidence = ['assurance', 'correctness', 'security'].map((kind) => {
          const relativePath = `.agent/cutover/${childGeneration}/${kind}-evidence.json`;
          const bytes = Buffer.from(record({ schema: 'FixtureCutoverEvidence/v1', kind }));
          writeFileSync(path.join(root, ...relativePath.split('/')), bytes);
          return {
            kind,
            path: relativePath,
            sha256: createHash('sha256').update(bytes).digest('hex'),
            status: scenario === 'repair-review-entry-status' && kind === 'assurance' ? 'failed' : 'passed',
          };
        });
        const repairAuthorization = {
          schema: 'VidaActiveLauncherRepairAuthorization/v1',
          repair_id: childGeneration,
          operator: 'fixture-owner',
          outcome: 'approved',
          pointer: 'fixture:untrusted-child-parser-input',
          old_generation: parentGeneration,
          old_selector_sha256: parentSha,
          old_payload_manifest_sha256: parentPayloadManifestSha256,
          old_launcher_sha256: parentLauncherSha256,
          new_payload_manifest_sha256: successorPayloadManifestSha256,
          new_launcher_sha256: successorLauncherSha256,
          evidence: childEvidence,
        };
        const repairPlan = {
          schema: 'VidaActiveLauncherRepairPlan/v1',
          repair_id: childGeneration,
          operator: 'fixture-owner',
          parent_cutover_id: parentGeneration,
          parent_selector_sha256: parentSha,
          parent_payload_manifest_sha256: parentPayloadManifestSha256,
          parent_launcher_sha256: parentLauncherSha256,
          successor_payload_manifest_sha256: successorPayloadManifestSha256,
          successor_launcher_sha256: successorLauncherSha256,
          archive_manifest_sha256: archiveManifestSha256,
          authorization_sha256: digestRecord(repairAuthorization),
        };
        const childIntent: Parameters<typeof repairAuthority>[1] = {
          schema: 'ActiveRuntimeSelector/v1',
          generation: childGeneration,
          runtime: 'vida-agent',
          bundle_root: 'vida-agent',
          config_path: 'agent-runtime.config.v1.yaml',
          archive_manifest_sha256: archiveManifestSha256,
          plan_sha256: digestRecord(repairPlan),
          payload_manifest_sha256: successorPayloadManifestSha256,
          state_policy: 'clean_start_no_ticket_transfer',
        };
        const repairDecision = {
          schema: 'VidaActiveLauncherRepairDecision/v1',
          repair_id: childGeneration,
          operator: 'fixture-owner',
          plan_sha256: childIntent.plan_sha256,
          authorization_sha256: repairPlan.authorization_sha256,
          selector_intent_sha256: digestRecord(childIntent),
          outcome: 'approved',
        };
        const childSelector = {
          ...childIntent,
          activation_decision_sha256: digestRecord(repairDecision),
        };
        const childSha = digestRecord(childSelector);
        const repairLock = {
          schema: 'VidaActiveLauncherRepairMaintenance/v1',
          repair_id: childGeneration,
          operator: repairPlan.operator,
          plan_sha256: childSelector.plan_sha256,
          decision_sha256: childSelector.activation_decision_sha256,
          selector_sha256: childSha,
        };
        const repairRelease = {
          schema: 'VidaActiveLauncherRepairRelease/v1',
          repair_id: childGeneration,
          operator: repairLock.operator,
          lock_sha256: digestRecord(repairLock),
          status: 'released_by_explicit_operator_action',
        };
        const repairCutoff = {
          schema: 'VidaNewWorkCutoffWitness/v1',
          generation: childGeneration,
          selector_sha256: childSha,
          first_admitted_work_attempt: null,
          ...(scenario === 'repair-release-proof-extra-field' ? { unexpected_field: 'fixture' } : {}),
        };
        const childCommit = {
          schema: 'VidaActiveLauncherRepairSelectorCommit/v1',
          repair_id: childGeneration,
          plan_sha256: childSelector.plan_sha256,
          decision_sha256: childSelector.activation_decision_sha256,
          selector_sha256: childSha,
        };
        writeFileSync(path.join(childRoot, 'repair-plan.v1.json'), record(repairPlan));
        writeFileSync(path.join(childRoot, 'repair-authorization.v1.json'), record(repairAuthorization));
        writeFileSync(path.join(childRoot, 'repair-decision.v1.json'), record(repairDecision));
        writeFileSync(path.join(childRoot, 'repair-selector-commit.v1.json'), record(childCommit));
        writeFileSync(path.join(childRoot, 'parent-selector.v1.json'), record(parentSelector));
        writeFileSync(path.join(childRoot, 'parent-payload.manifest.v1.json'), record(parentManifest));
        writeFileSync(path.join(childRoot, 'successor-payload.manifest.v1.json'), record(successorManifest));
        writeFileSync(path.join(childRoot, 'maintenance-lock.released.v1.json'), record(repairLock));
        writeFileSync(path.join(childRoot, 'maintenance-release.v1.json'), record(repairRelease));
        writeFileSync(path.join(childRoot, 'cutoff-witness.json'), record(repairCutoff));
        if (scenario === 'repair-maintenance-lock-active')
          writeFileSync(path.join(childRoot, 'maintenance-lock.v1.json'), record(repairLock));
        const buildScenarioForwardLeaf = (
          parentSelector: Parameters<typeof forwardUpdateAuthority>[1],
          parentSelectorSha: string,
          parentCutoffSha: string,
          parentManifest: Parameters<typeof buildForwardLeafFixture>[4],
          generation: string,
          launcher: Uint8Array,
          additionalSuccessorFiles: {
            path: string;
            bytes: Uint8Array;
            source_path: string;
            source_sha256: string;
          }[] = [],
        ) =>
          buildForwardLeafFixture(
            root,
            parentSelector,
            parentSelectorSha,
            parentCutoffSha,
            parentManifest,
            preservedMutableOutput ?? undefined,
            documentationChange ?? undefined,
            {
              generation,
              launcher,
              additionalPreservedMutableOutputs:
                scenario === 'forward-preserved-output-overbound' && preservedMutableOutput
                  ? [preservedMutableOutput]
                  : [],
              additionalRetiredPaths: scenario === 'forward-partial-integration-retirement' ? ['AGENT.sidecar.md'] : [],
              additionalSuccessorFiles,
              omitPlanChangedPaths:
                scenario === 'forward-changed-path-proof-mismatch' ? ['vida-agent/bin/run.mjs'] : [],
            },
          );
        const forwardRoot = path.join(root, '.agent', 'cutover', 'fixture-forward-leaf');
        const generatedAgentsSuccessorFile =
          generatedRootAgentsScenario && generatedRootAgentsBytes && agentsTemplateSha256
            ? [
                {
                  path: 'AGENTS.md',
                  bytes: generatedRootAgentsBytes,
                  source_path: agentsTemplatePath,
                  source_sha256:
                    scenario === 'forward-generated-root-agents-provenance-mismatch'
                      ? '0'.repeat(64)
                      : agentsTemplateSha256,
                },
              ]
            : [];
        const sourceProvenanceSuccessorFile =
          scenario === 'forward-source-provenance-mismatch'
            ? [
                {
                  path: 'vida-agent/forward-source-provenance.txt',
                  bytes: Buffer.from('forward source provenance fixture\n'),
                  source_path: 'vida-agent/forward-source-provenance.txt',
                  source_sha256: digestBytes(Buffer.from('different source preimage\n')),
                },
              ]
            : [];
        const changedPathProofBytes = Buffer.from('forward selector proof fixture\n');
        const changedPathProofSuccessorFile =
          scenario === 'forward-changed-path-proof-mismatch'
            ? [
                {
                  path: 'vida-agent/forward-selector-proof.txt',
                  bytes: changedPathProofBytes,
                  source_path: 'vida-agent/forward-selector-proof.txt',
                  source_sha256: digestBytes(changedPathProofBytes),
                },
              ]
            : [];
        let generatedRootParentForwardFixture: ReturnType<typeof buildForwardLeafFixture> | null = null;
        let forwardFixture: ReturnType<typeof buildForwardLeafFixture> | null = null;
        if (scenario === 'forward-generated-root-agents-parent-lineage') {
          assert.ok(generatedRootAgentsBytes);
          assert.ok(agentsTemplateSha256);
          generatedRootParentForwardFixture = buildScenarioForwardLeaf(
            childSelector,
            childSha,
            digestRecord(repairCutoff),
            successorManifest,
            'fixture-forward-generated-parent',
            Buffer.from('fixture generated-root parent launcher\n'),
            generatedAgentsSuccessorFile,
          );
          forwardFixture = buildScenarioForwardLeaf(
            generatedRootParentForwardFixture.selector,
            generatedRootParentForwardFixture.selectorSha,
            generatedRootParentForwardFixture.cutoffSha,
            generatedRootParentForwardFixture.successorManifest,
            'fixture-forward-leaf',
            Buffer.from('fixture generated-root lineage leaf launcher\n'),
          );
        } else if (forwardScenario) {
          forwardFixture = buildScenarioForwardLeaf(
            childSelector,
            childSha,
            digestRecord(repairCutoff),
            successorManifest,
            'fixture-forward-leaf',
            scenario === 'repair-default-installed-bundle' ||
              scenario === 'repair-installed-payload-drift' ||
              scenario === 'repair-maintenance-lock-active'
              ? successorLauncherBytes
              : Buffer.from('y'),
            [...generatedAgentsSuccessorFile, ...sourceProvenanceSuccessorFile, ...changedPathProofSuccessorFile],
          );
        }
        if (scenario === 'forward-generated-root-agents-installed-drift')
          writeFileSync(path.join(root, 'AGENTS.md'), 'installed generated AGENTS drift\n');
        if (scenario === 'forward-installed-bundle-leaf-drift')
          writeFileSync(path.join(root, 'vida-agent', 'bin', 'run.mjs'), 'installed forward bundle drift\n');
        if (scenario === 'forward-changed-path-proof-mismatch')
          writeFileSync(path.join(root, 'vida-agent', 'forward-selector-proof.txt'), changedPathProofBytes);
        if (scenario === 'forward-parent-cutoff-drift') {
          assert.ok(forwardFixture);
          writeFileSync(
            path.join(childRoot, 'cutoff-witness.json'),
            record({
              ...repairCutoff,
              first_admitted_work_attempt: `fixture-repository/parent-cutoff-work/1/${'e'.repeat(64)}`,
            }),
          );
        }
        if (scenario === 'forward-parent-authority-ambiguous') {
          assert.ok(forwardFixture);
          writeFileSync(
            path.join(childRoot, 'forward-intent.v1.json'),
            record({ schema: 'VidaForwardUpdateMaintenance/v1', operation_id: parentGeneration }),
          );
        }
        if (scenario === 'forward-installed-bundle-inventory-mismatch')
          writeFileSync(path.join(root, 'vida-agent', 'bin', 'unlisted.mjs'), 'unlisted installed bundle file\n');
        if (scenario === 'forward-payload-manifest-digest') {
          assert.ok(forwardFixture);
          const manifestPath = path.join(forwardFixture.generationRoot, 'parent-payload.manifest.v1.json');
          writeFileSync(manifestPath, Buffer.concat([readFileSync(manifestPath), Buffer.from(' \n')]));
        }
        const forwardEvidencePath =
          scenario === 'forward-documentation-evidence-under-bound'
            ? 'forward-evidence-under-bound.json'
            : scenario === 'forward-documentation-evidence-over-bound'
              ? 'forward-evidence-over-bound.json'
              : null;
        if (forwardEvidencePath) {
          const evidenceFile = path.join(root, forwardEvidencePath);
          writeFileSync(evidenceFile, '');
          if (scenario === 'forward-documentation-evidence-over-bound')
            truncateSync(evidenceFile, 16 * 1024 * 1024 + 1);
          else writeFileSync(evidenceFile, '{}\n');
        }
        if (scenario === 'forward-documentation-baseline-work-id-mismatch') {
          const baselineBody = {
            schema: 'DocumentationClearCheckpoint/v1',
            clear_id: 'fixture-forward-baseline',
            work_id: 'fixture-forward-baseline-owner',
            source_revision: 'fixture-source-revision',
            repository_id: 'fixture-repository',
            project_id: 'fixture-project',
            project_context_digest: '1'.repeat(64),
            config_digest: '2'.repeat(64),
            scope_digest: '3'.repeat(64),
            policy_id: 'fixture-policy',
            policy_path: documentationPath,
            policy_digest: '4'.repeat(64),
            inventory_digest: '5'.repeat(64),
            documents: [],
            baseline_path: null,
            baseline_digest: null,
            phase: 'baseline',
            status: 'pass',
            required: false,
            gaps: [],
            created_at: '2026-10-24T00:00:00.000Z',
          };
          const baselinePath = path.join(root, '.agent/work/decoy/documentation-baseline-0001.v1.json');
          mkdirSync(path.dirname(baselinePath), { recursive: true });
          writeFileSync(baselinePath, record({ ...baselineBody, digest: canonicalJsonDigest(baselineBody) }));
        }
        if (documentationChange)
          writeFileSync(
            path.join(forwardRoot, 'documentation-forward.v1.json'),
            record({
              schema: 'VidaForwardLifecycleClearBinding/v1',
              baseline_path:
                scenario === 'forward-documentation-baseline-work-id-mismatch'
                  ? '.agent/work/decoy/documentation-baseline-0001.v1.json'
                  : scenario === 'forward-documentation-baseline-path-non-string'
                    ? null
                    : (forwardEvidencePath ??
                      `.agent/work/${childGeneration}/documentation-baseline-0001.v1.json/../refused.json`),
            }),
          );
        const bundleRoot = path.join(root, 'vida-agent');
        const bundlePaths = [bundleRoot, path.join(bundleRoot, 'bin'), path.join(bundleRoot, 'bin', 'run.mjs')];
        if (scenario === 'repair-installed-payload-drift')
          writeFileSync(path.join(bundleRoot, 'bin', 'run.mjs'), Buffer.from('drifted launcher'));
        const preservedPaths = [
          ...(configBytes ? ['agent-runtime.config.v1.yaml', changelogPath] : []),
          ...(scenario === 'forward-partial-integration-retirement' ? ['AGENT.sidecar.md'] : []),
          ...(generatedRootAgentsBytes ? ['AGENTS.md'] : []),
        ].map((relative) => path.join(root, relative));
        const beforePreservedBytes = preservedPaths.map((file) => readFileSync(file));
        const beforePreservedMetadata = preservedPaths.map(snapshotAuthorityMetadata);
        const beforeBundle = forwardFixture ? snapshotAuthorityFixture(bundleRoot) : null;
        const beforeBundleMetadata = forwardFixture ? bundlePaths.map(snapshotAuthorityMetadata) : null;
        const documentationFile = documentationChange ? path.join(root, documentationChange.path) : null;
        const beforeDocumentationBytes = documentationFile ? readFileSync(documentationFile) : null;
        const beforeDocumentationMetadata = documentationFile ? snapshotAuthorityMetadata(documentationFile) : null;
        const beforeForwardEvidenceBytes = forwardEvidencePath
          ? readFileSync(path.join(root, forwardEvidencePath))
          : null;
        const beforeForwardEvidenceMetadata = forwardEvidencePath
          ? snapshotAuthorityMetadata(path.join(root, forwardEvidencePath))
          : null;
        let before = snapshotAuthorityFixture(path.join(root, '.agent'));
        const hostDatabasePath = path.join(root, '.agent', 'work', 'session-handoff.v1.sqlite');
        expect(existsSync(hostDatabasePath)).toBe(false);
        if (scenario === 'repair-cutoff-admitted-attempt') {
          for (const file of ['agent-runtime.config.v1.yaml', 'AGENTS.md', 'AGENT.sidecar.md'])
            writeFileSync(path.join(root, file), readFileSync(path.join(repositoryRoot, file)));
          writeFileSync(path.join(root, '.agent', 'active-runtime-selector.v1.json'), record(childSelector));
          await advanceCutoff(
            {
              generationRoot: childRoot,
              generation: childGeneration,
              selectorSha: childSha,
              planSha256: childSelector.plan_sha256,
              archiveManifestSha256,
              repaired: true,
              forward: false,
              currentMutableOutput: null,
            },
            {
              project_root: root,
              repository: 'fixture-repository',
              work_id: 'repair-authority-cutoff-work',
              attempt: '1',
              scope_digest: 'd'.repeat(64),
            },
          );
          before = snapshotAuthorityFixture(path.join(root, '.agent'));
        }
        if (scenario === 'forward-installed-bundle-unsupported-node') {
          const server = createServer();
          const socketPath = path.join(bundleRoot, 'bin', 'unsupported-node.sock');
          unsupportedNodeServer = server;
          unsupportedNodePath = socketPath;
          await new Promise<void>((resolve, reject) => {
            server.once('error', reject);
            server.listen(socketPath, resolve);
          });
        }
        if (scenario === 'parent-evidence-mismatch') {
          let caught: unknown;
          try {
            repairAuthority(root, childSelector, childSha, childRoot, true);
          } catch (error) {
            caught = error;
          }
          expect(caught).toMatchObject({
            code: 'GAP-VIDA-RUN-SELECTOR-001',
            message: 'Repair parent evidence is invalid.',
          });
        } else if (scenario === 'repair-default-installed-bundle') {
          assert.ok(beforeBundle);
          assert.ok(beforeBundleMetadata);
          expect(repairAuthority(root, childSelector, childSha, childRoot)).toBeUndefined();
          expect(snapshotAuthorityFixture(bundleRoot)).toEqual(beforeBundle);
          expect(bundlePaths.map(snapshotAuthorityMetadata)).toEqual(beforeBundleMetadata);
        } else if (
          scenario === 'malformed-source-path' ||
          scenario === 'malformed-payload-manifest' ||
          scenario === 'duplicate-payload-path' ||
          scenario === 'repair-review-entry-status' ||
          scenario === 'repair-parent-selector-extra-field' ||
          scenario === 'repair-payload-delta-mismatch' ||
          scenario === 'repair-release-proof-extra-field'
        ) {
          let caught: unknown;
          try {
            repairAuthority(root, childSelector, childSha, childRoot, true);
          } catch (error) {
            caught = error;
          }
          expect(caught).toMatchObject({
            code: 'GAP-VIDA-RUN-SELECTOR-001',
            message:
              scenario === 'malformed-payload-manifest'
                ? 'Repair payload manifest is invalid.'
                : scenario === 'repair-review-entry-status'
                  ? 'Repair review bindings are invalid.'
                  : scenario === 'repair-parent-selector-extra-field'
                    ? 'Repair parent authority is invalid.'
                    : scenario === 'repair-payload-delta-mismatch'
                      ? 'Repair payload delta is invalid.'
                      : scenario === 'repair-release-proof-extra-field'
                        ? 'Repair release proof is invalid.'
                        : 'Repair payload entry is invalid.',
          });
        } else if (scenario === 'repair-installed-payload-drift' || scenario === 'repair-maintenance-lock-active') {
          assert.ok(beforeBundle);
          assert.ok(beforeBundleMetadata);
          let caught: unknown;
          try {
            repairAuthority(root, childSelector, childSha, childRoot);
          } catch (error) {
            caught = error;
          }
          expect(caught).toMatchObject({
            code: 'GAP-VIDA-RUN-SELECTOR-001',
            message:
              scenario === 'repair-installed-payload-drift'
                ? 'Installed repair payload drift.'
                : 'Launcher repair maintenance is still active.',
          });
          expect(snapshotAuthorityFixture(bundleRoot)).toEqual(beforeBundle);
          expect(bundlePaths.map(snapshotAuthorityMetadata)).toEqual(beforeBundleMetadata);
        } else if (
          scenario === 'forward-parent-cutoff-drift' ||
          scenario === 'forward-parent-authority-ambiguous' ||
          scenario === 'forward-preserved-output-overbound' ||
          scenario === 'forward-partial-integration-retirement' ||
          scenario === 'forward-preserved-output-pointer-mismatch' ||
          scenario === 'forward-payload-manifest-digest' ||
          scenario === 'forward-installed-bundle-inventory-mismatch' ||
          scenario === 'forward-source-provenance-mismatch' ||
          scenario === 'forward-generated-root-agents-provenance-mismatch' ||
          scenario === 'forward-generated-root-agents-installed-drift' ||
          scenario === 'forward-installed-bundle-leaf-drift' ||
          scenario === 'forward-changed-path-proof-mismatch'
        ) {
          assert.ok(forwardFixture);
          assert.ok(beforeBundle);
          assert.ok(beforeBundleMetadata);
          if (scenario === 'forward-partial-integration-retirement') {
            const parentPaths = new Set(successorManifest.files.map((entry) => entry.path));
            const childPaths = new Set(forwardFixture.successorManifest.files.map((entry) => entry.path));
            expect(parentPaths.has('AGENT.sidecar.md')).toBe(true);
            expect(parentPaths.has('agent-runtime.config.v1.yaml')).toBe(true);
            expect(childPaths.has('AGENT.sidecar.md')).toBe(false);
            expect(childPaths.has('agent-runtime.config.v1.yaml')).toBe(true);
          }
          let caught: unknown;
          try {
            forwardUpdateAuthority(root, forwardFixture.selector, forwardFixture.selectorSha, forwardRoot);
          } catch (error) {
            caught = error;
          }
          expect(caught).toMatchObject({
            code: 'GAP-VIDA-RUN-SELECTOR-001',
            message:
              scenario === 'forward-parent-cutoff-drift'
                ? 'Forward parent selector or cutoff drift.'
                : scenario === 'forward-parent-authority-ambiguous'
                  ? 'Forward parent authority type is ambiguous.'
                  : scenario === 'forward-preserved-output-overbound'
                    ? 'Forward manifest deletion or preservation proof invalid.'
                    : scenario === 'forward-partial-integration-retirement'
                      ? 'Only the complete project-owned integration pair may retire.'
                      : scenario === 'forward-preserved-output-pointer-mismatch'
                        ? 'Configured mutable-output preservation proof invalid.'
                        : scenario === 'forward-source-provenance-mismatch'
                          ? 'Selected source provenance differs.'
                          : scenario === 'forward-generated-root-agents-provenance-mismatch'
                            ? 'Generated root AGENTS provenance differs.'
                            : scenario === 'forward-generated-root-agents-installed-drift'
                              ? 'Installed generated root AGENTS drift.'
                              : scenario === 'forward-installed-bundle-leaf-drift'
                                ? 'Installed forward bundle drift.'
                                : scenario === 'forward-changed-path-proof-mismatch'
                                  ? 'Forward changed-path proof differs.'
                                  : scenario === 'forward-payload-manifest-digest'
                                    ? 'Repair payload manifest drift.'
                                    : 'Installed bundle inventory differs from forward manifest.',
          });
          expect(snapshotAuthorityFixture(bundleRoot)).toEqual(beforeBundle);
          expect(bundlePaths.map(snapshotAuthorityMetadata)).toEqual(beforeBundleMetadata);
          expect(preservedPaths.map((file) => readFileSync(file))).toEqual(beforePreservedBytes);
          expect(preservedPaths.map(snapshotAuthorityMetadata)).toEqual(beforePreservedMetadata);
          if (scenario === 'forward-source-provenance-mismatch')
            expect(existsSync(path.join(root, 'vida-agent', 'forward-source-provenance.txt'))).toBe(false);
        } else if (scenario === 'forward-installed-bundle-symlink') {
          assert.ok(forwardFixture);
          assert.ok(beforeBundle);
          assert.ok(beforeBundleMetadata);
          const symlinkPath = path.join(bundleRoot, 'bin', 'unsafe-link.mjs');
          symlinkSync('run.mjs', symlinkPath, 'file');
          const symlinkTarget = readlinkSync(symlinkPath);
          const symlinkMetadata = snapshotAuthorityMetadata(symlinkPath);
          const binMetadata = snapshotAuthorityMetadata(path.dirname(symlinkPath));
          let caught: unknown;
          try {
            forwardUpdateAuthority(root, forwardFixture.selector, forwardFixture.selectorSha, forwardRoot);
          } catch (error) {
            caught = error;
          }
          expect(caught).toMatchObject({
            code: 'GAP-VIDA-RUN-SELECTOR-001',
            message: 'Installed bundle symlink is unsafe.',
          });
          expect(readlinkSync(symlinkPath)).toBe(symlinkTarget);
          expect(snapshotAuthorityMetadata(symlinkPath)).toEqual(symlinkMetadata);
          assert.ok(beforeBundleMetadata[0]);
          expect(snapshotAuthorityMetadata(bundleRoot)).toEqual(beforeBundleMetadata[0]);
          expect(snapshotAuthorityMetadata(path.dirname(symlinkPath))).toEqual(binMetadata);
          assert.ok(beforeBundleMetadata[2]);
          expect(snapshotAuthorityMetadata(path.join(bundleRoot, 'bin', 'run.mjs'))).toEqual(beforeBundleMetadata[2]);
          unlinkSync(symlinkPath);
          expect(snapshotAuthorityFixture(bundleRoot)).toEqual(beforeBundle);
        } else if (scenario === 'forward-installed-bundle-unsupported-node') {
          assert.ok(forwardFixture);
          assert.ok(beforeBundle);
          assert.ok(beforeBundleMetadata);
          assert.ok(unsupportedNodePath);
          const nodeMetadata = snapshotAuthorityMetadata(unsupportedNodePath);
          const binMetadata = snapshotAuthorityMetadata(path.dirname(unsupportedNodePath));
          let caught: unknown;
          try {
            forwardUpdateAuthority(root, forwardFixture.selector, forwardFixture.selectorSha, forwardRoot);
          } catch (error) {
            caught = error;
          }
          expect(caught).toMatchObject({
            code: 'GAP-VIDA-RUN-SELECTOR-001',
            message: 'Installed bundle node is unsafe.',
          });
          expect(snapshotAuthorityMetadata(unsupportedNodePath)).toEqual(nodeMetadata);
          assert.ok(beforeBundleMetadata[0]);
          expect(snapshotAuthorityMetadata(bundleRoot)).toEqual(beforeBundleMetadata[0]);
          expect(snapshotAuthorityMetadata(path.dirname(unsupportedNodePath))).toEqual(binMetadata);
          assert.ok(beforeBundleMetadata[2]);
          expect(snapshotAuthorityMetadata(path.join(bundleRoot, 'bin', 'run.mjs'))).toEqual(beforeBundleMetadata[2]);
          await new Promise<void>((resolve, reject) => {
            unsupportedNodeServer?.close((error) => (error ? reject(error) : resolve()));
          });
          unsupportedNodeServer = null;
          if (existsSync(unsupportedNodePath)) unlinkSync(unsupportedNodePath);
          expect(snapshotAuthorityFixture(bundleRoot)).toEqual(beforeBundle);
        } else if (
          scenario === 'forward-documentation-path-refusal' ||
          scenario === 'forward-documentation-baseline-path-non-string' ||
          scenario === 'forward-documentation-baseline-work-id-mismatch' ||
          scenario === 'forward-documentation-evidence-under-bound' ||
          scenario === 'forward-documentation-evidence-over-bound'
        ) {
          assert.ok(forwardFixture);
          assert.ok(beforeBundle);
          assert.ok(beforeBundleMetadata);
          assert.ok(documentationFile);
          let caught: unknown;
          try {
            forwardUpdateAuthority(root, forwardFixture.selector, forwardFixture.selectorSha, forwardRoot);
          } catch (error) {
            caught = error;
          }
          expect(caught).toMatchObject({
            code: 'GAP-VIDA-RUN-SELECTOR-001',
            message:
              scenario === 'forward-documentation-baseline-work-id-mismatch'
                ? 'Forward policy proof invalid: leaf baseline work path differs'
                : scenario === 'forward-documentation-baseline-path-non-string'
                  ? 'Forward policy proof invalid: leaf baseline path is invalid'
                  : scenario === 'forward-documentation-path-refusal'
                    ? 'Forward policy proof invalid: Forward documentation evidence path invalid.'
                    : scenario === 'forward-documentation-evidence-under-bound'
                      ? 'Forward policy proof invalid: forward documentation proof: CLEAR checkpoint schema invalid'
                      : 'Forward policy proof invalid: Forward documentation evidence exceeds bound.',
          });
          assert.ok(beforeDocumentationBytes);
          assert.ok(beforeDocumentationMetadata);
          expect(snapshotAuthorityFixture(bundleRoot)).toEqual(beforeBundle);
          expect(bundlePaths.map(snapshotAuthorityMetadata)).toEqual(beforeBundleMetadata);
          expect(readFileSync(documentationFile)).toEqual(beforeDocumentationBytes);
          expect(snapshotAuthorityMetadata(documentationFile)).toEqual(beforeDocumentationMetadata);
          expect(preservedPaths.map((file) => readFileSync(file))).toEqual(beforePreservedBytes);
          expect(preservedPaths.map(snapshotAuthorityMetadata)).toEqual(beforePreservedMetadata);
          if (forwardEvidencePath) {
            assert.ok(beforeForwardEvidenceBytes);
            assert.ok(beforeForwardEvidenceMetadata);
            expect(readFileSync(path.join(root, forwardEvidencePath))).toEqual(beforeForwardEvidenceBytes);
            expect(snapshotAuthorityMetadata(path.join(root, forwardEvidencePath))).toEqual(
              beforeForwardEvidenceMetadata,
            );
          }
        } else if (scenario === 'repair-cutoff-admitted-attempt') {
          const cutoff = requireRecord(
            parseJsonUnknown(readFileSync(path.join(childRoot, 'cutoff-witness.json'), 'utf8')),
            'cutoff witness',
          );
          expect(cutoff.first_admitted_work_attempt).toBe(
            `fixture-repository/repair-authority-cutoff-work/1/${'d'.repeat(64)}`,
          );
          expect(repairAuthority(root, childSelector, childSha, childRoot, true)).toBeUndefined();
        } else {
          assert.ok(forwardFixture);
          assert.ok(beforeBundle);
          assert.ok(beforeBundleMetadata);
          if (generatedRootAgentsScenario) {
            const selectedParentManifest = generatedRootParentForwardFixture?.successorManifest ?? successorManifest;
            const parentPaths = new Set(selectedParentManifest.files.map((entry) => entry.path));
            const generatedAgentsEntry = forwardFixture.successorManifest.files.find(
              (entry) => entry.path === 'AGENTS.md',
            );
            expect(parentPaths.has(agentsTemplatePath)).toBe(true);
            expect(parentPaths.has('AGENTS.md')).toBe(scenario === 'forward-generated-root-agents-parent-lineage');
            assert.ok(agentsTemplateSha256);
            assert.ok(generatedRootAgentsBytes);
            expect(generatedAgentsEntry).toMatchObject({
              path: 'AGENTS.md',
              sha256: digestBytes(generatedRootAgentsBytes),
              size: generatedRootAgentsBytes.length,
              source_path: agentsTemplatePath,
              source_sha256: agentsTemplateSha256,
            });
            if (scenario === 'forward-generated-root-agents-parent-lineage')
              expect(selectedParentManifest.files.find((entry) => entry.path === 'AGENTS.md')).toMatchObject({
                path: 'AGENTS.md',
                sha256: digestBytes(generatedRootAgentsBytes),
                size: generatedRootAgentsBytes.length,
                source_path: agentsTemplatePath,
                source_sha256: agentsTemplateSha256,
              });
          }
          expect(
            forwardUpdateAuthority(root, forwardFixture.selector, forwardFixture.selectorSha, forwardRoot),
          ).toEqual(preservedMutableOutput);
          expect(snapshotAuthorityFixture(bundleRoot)).toEqual(beforeBundle);
          expect(bundlePaths.map(snapshotAuthorityMetadata)).toEqual(beforeBundleMetadata);
          expect(readFileSync(path.join(bundleRoot, 'bin', 'run.mjs'))).toEqual(forwardFixture.launcher);
          expect(preservedPaths.map((file) => readFileSync(file))).toEqual(beforePreservedBytes);
          expect(preservedPaths.map(snapshotAuthorityMetadata)).toEqual(beforePreservedMetadata);
        }
        expect(existsSync(hostDatabasePath)).toBe(scenario === 'repair-cutoff-admitted-attempt');
        expect(snapshotAuthorityFixture(path.join(root, '.agent'))).toEqual(before);
        completed = true;
      } finally {
        if (unsupportedNodeServer?.listening) {
          await new Promise<void>((resolve) => unsupportedNodeServer?.close(() => resolve()));
        }
        if (unsupportedNodePath && existsSync(unsupportedNodePath)) unlinkSync(unsupportedNodePath);
        if (completed) rmSync(root, { recursive: true, force: true });
        else process.stderr.write(`Retained failed repair authority fixture (${scenario}): ${root}\n`);
      }
    }
  });

  describe('vida-agent run mutation path', () => {
    test('rejects missing scope and duplicate or excessive derived scope paths', async () => {
      const args = [...common, '--workflow', 'information_research_light'];
      args.splice(args.indexOf('--scope-digest'), 2);
      const cases: readonly (readonly [string[], string, string])[] = [
        [[], 'GAP-VIDA-RUN-CLI-001', 'All launcher arguments are required.'],
        [
          ['--scope-path', 'source.ts', '--inspect', 'true'],
          'GAP-VIDA-RUN-CLI-001',
          'All launcher arguments are required.',
        ],
        [
          ['--scope-path', 'source.ts', '--scope-path', 'source.ts'],
          'GAP-VIDA-RUN-CLI-003',
          'Scope paths must be unique and bounded.',
        ],
        [
          Array.from({ length: 513 }, (_, index) => ['--scope-path', `source-${index}.ts`]).flat(),
          'GAP-VIDA-RUN-CLI-003',
          'Scope paths must be unique and bounded.',
        ],
      ];
      for (const [options, code, message] of cases) {
        await Promise.resolve(expect(run([...args, ...options])).rejects.toMatchObject({ code, message }));
      }
    });

    test('rejects unsafe roots and identifiers before reading project authority', async () => {
      const args = [...common, '--workflow', 'information_research_light'];
      const withValue = (key: string, value: string): string[] =>
        args.map((entry, index) => (args[index - 1] === key ? value : entry));
      const invalidArguments: readonly (readonly [string[], string])[] = [
        [withValue('--project-root', 'relative-root'), 'GAP-VIDA-RUN-CLI-002'],
        [withValue('--project-root', path.join(tmpdir(), `vida-run-absent-${randomUUID()}`)), 'GAP-VIDA-RUN-CLI-004'],
        [withValue('--repository', 'Uppercase'), 'GAP-VIDA-RUN-CLI-003'],
        [withValue('--project', 'invalid_project'), 'GAP-VIDA-RUN-CLI-003'],
        [withValue('--work-id', 'unsafe/id'), 'GAP-VIDA-RUN-CLI-003'],
        [withValue('--attempt', '0'), 'GAP-VIDA-RUN-CLI-003'],
        [withValue('--scope-digest', 'z'.repeat(64)), 'GAP-VIDA-RUN-CLI-003'],
      ];
      for (const [candidate, code] of invalidArguments) {
        await Promise.resolve(expect(run(candidate)).rejects.toMatchObject({ code }));
      }
    });

    test('rejects invalid initialization status and an escaping work path without creating work', async () => {
      const root = mkdtempSync(path.join(tmpdir(), 'vida-run-context-'));
      let completed = false;
      try {
        const { args, config, initialization, initializationPath } = createFixture(root);
        writeFileSync(initializationPath, record({ ...initialization, workspace_binding_status: 'unknown' }));
        const deniedReceipt = readFileSync(initializationPath);
        const scopePath = path.join(root, 'AGENTS.md'),
          scopeBefore = readFileSync(scopePath);
        const derivedScopeArgs = [...args];
        derivedScopeArgs.splice(derivedScopeArgs.indexOf('--scope-digest'), 2);
        derivedScopeArgs.push('--scope-path', 'AGENTS.md');
        for (const candidate of [
          args,
          derivedScopeArgs,
          ['--project-root', root, '--task-source-operation', 'inspect', '--task-source-request', 'request.json'],
          [
            '--project-root',
            root,
            '--task-source-operation',
            'report',
            '--task-source-request',
            'request.json',
            '--task-source-report',
            'report.json',
          ],
        ]) {
          await Promise.resolve(
            expect(run(candidate)).rejects.toMatchObject({
              code: 'GAP-VIDA-RUN-CONTEXT-001',
              message: 'Runtime initialization authority is unavailable.',
            }),
          );
          expect(readFileSync(initializationPath)).toEqual(deniedReceipt);
          expect(existsSync(path.join(root, '.agent', 'work'))).toBe(false);
        }
        expect(readFileSync(scopePath)).toEqual(scopeBefore);
        expect(existsSync(sessionHandoffDatabasePath(root, config))).toBe(false);
        const fileRoot = args.map((entry, index) =>
          args[index - 1] === '--project-root' ? initializationPath : entry,
        );
        await Promise.resolve(
          expect(run(fileRoot)).rejects.toMatchObject({
            code: 'GAP-VIDA-RUN-CLI-004',
            message: 'The project root must be an existing canonical directory.',
          }),
        );
        expect(readFileSync(initializationPath)).toEqual(deniedReceipt);
        expect(existsSync(path.join(root, '.agent', 'work'))).toBe(false);
        writeFileSync(initializationPath, record(initialization));
        const escaping = args.map((entry, index) => (args[index - 1] === '--work-path' ? '../escape' : entry));
        await Promise.resolve(
          expect(run(escaping)).rejects.toMatchObject({
            code: 'GAP-VIDA-RUN-CONTEXT-001',
            message: 'The work path is not bound to the selected project context.',
          }),
        );
        expect(existsSync(path.join(root, '.agent', 'work'))).toBe(false);
        completed = true;
      } finally {
        if (completed) rmSync(root, { recursive: true, force: true });
        else process.stderr.write(`Retained failed run refusal fixture: ${root}\n`);
      }
    });

    test('requires current Host Work before starting a configured workflow', async () => {
      const root = mkdtempSync(path.join(tmpdir(), 'vida-run-no-work-'));
      let completed = false;
      try {
        const { args, config } = createFixture(root);
        const databasePath = sessionHandoffDatabasePath(root, config);
        expect(existsSync(databasePath)).toBe(false);
        await Promise.resolve(
          expect(run(args)).rejects.toMatchObject({
            code: 'GAP-VIDA-RUN-CONTEXT-001',
            message: 'Current admitted Work is unavailable for workflow execution.',
          }),
        );
        expect(existsSync(databasePath)).toBe(true);
        const after = inspectHostWorkspaceDatabase(
          root,
          path.relative(root, databasePath),
          deriveWorkspaceId(config.repository.repository_id, root),
        );
        expect(after.work).toEqual([]);
        expect(after.journals).toEqual([]);
        expect(after.admission_attempts).toEqual([]);
        completed = true;
      } finally {
        if (completed) rmSync(root, { recursive: true, force: true });
        else process.stderr.write(`Retained failed run missing-Host fixture: ${root}\n`);
      }
    });

    for (const risk of ['medium', 'high'] as const) {
      test(`accepts ${risk} lifecycle risk on admitted workflow work`, async () => {
        const root = mkdtempSync(path.join(tmpdir(), 'vida-run-lifecycle-risk-'));
        const fixture = ownedMutationFixture(root, 30_000);
        let completed = false;
        try {
          const { args, config } = createFixture(root);
          const admitted = prepareMutationIntake(args, config, { risk });
          expect(fixture.invoke(admitted.admissionArgs).status).toBe('prepared');
          completed = true;
        } finally {
          if (completed && !fixture.hasUnknown()) rmSync(root, { recursive: true, force: true });
          else
            process.stderr.write(
              `Retained ${fixture.hasUnknown() ? 'uncertain' : 'failed'} ${risk}-risk run fixture: ${root}\n`,
            );
        }
      }, 30_000);
    }

    test('CLI rejects a changed scope after component preparation without issuing its wave', async () => {
      const root = mkdtempSync(path.join(tmpdir(), 'vida-run-persisted-'));
      const fixture = ownedMutationFixture(root, 30_000);
      let completed = false;
      try {
        const { args, config } = createFixture(root);
        const admitted = prepareMutationIntake(args, config);
        const prepared = parseTestRunPayload(await runSuccessfully(admitted.admissionArgs));
        expect(prepared.status).toBe('prepared');
        expect(requireIssuedActions(prepared)).toEqual([]);
        const nextActions = requireNextActions(prepared);
        expect(nextActions.length).toBeGreaterThan(0);
        const databaseRelativePath = path.relative(root, sessionHandoffDatabasePath(root, config));
        const workspaceId = deriveWorkspaceId(config.repository.repository_id, root);
        const before = inspectHostWorkspaceDatabase(root, databaseRelativePath, workspaceId);
        expect(before.work).toHaveLength(1);
        expect(before.journals).toHaveLength(1);
        const journal = before.journals[0];
        assert.ok(journal);
        expect(journal.version).toEqual(requireStateVersion(prepared.state_version));
        expect(
          journal.state.items.map((item) => ({
            action_id: item.request.action_id,
            issue_id: item.issue_id,
            observation: item.observation,
          })),
        ).toEqual(
          nextActions.map((item) => ({
            action_id: item.request.action_id,
            issue_id: null,
            observation: null,
          })),
        );
        const changed = admitted.args.map((entry, index) =>
          admitted.args[index - 1] === '--scope-digest' ? 'b'.repeat(64) : entry,
        );
        const preparedVersion = requireStateVersion(prepared.state_version);
        expect(
          fixture.invoke(
            [
              ...changed,
              '--expected-revision',
              String(preparedVersion.revision),
              '--expected-digest',
              preparedVersion.digest,
              '--issue-wave',
              'true',
            ],
            1,
          ),
        ).toMatchObject({
          code: 'GAP-VIDA-RUN-CONTEXT-001',
          message:
            'The requested project context could not be bound. Next action: inspect the exact work and check its issued contract before retrying.',
        });
        expect(requireStateVersion(fixture.invoke(admitted.args).state_version)).toEqual(preparedVersion);
        const after = inspectHostWorkspaceDatabase(root, databaseRelativePath, workspaceId);
        expect(after.work).toEqual(before.work);
        expect(after.journals).toEqual(before.journals);
        completed = true;
      } finally {
        if (completed && !fixture.hasUnknown()) rmSync(root, { recursive: true, force: true });
        else
          process.stderr.write(
            `Retained ${fixture.hasUnknown() ? 'uncertain' : 'failed'} public run fixture: ${root}\n`,
          );
      }
    }, 30_000);

    test('rejects incomplete selector authority before project context', async () => {
      const root = mkdtempSync(path.join(tmpdir(), 'vida-run-selector-'));
      let completed = false;
      try {
        mkdirSync(path.join(root, '.agent', 'cutover'), { recursive: true });
        writeFileSync(path.join(root, '.agent', 'cutover', 'incomplete'), 'x');
        const args = [...common].map((value, index) =>
          common[index - 1] === '--project-root'
            ? root
            : common[index - 1] === '--work-id'
              ? `mutation-run-${randomUUID()}`
              : value,
        );
        await Promise.resolve(
          expect(run([...args, '--workflow', 'information_research_light'])).rejects.toMatchObject({
            code: 'GAP-VIDA-RUN-SELECTOR-001',
          }),
        );
        const selectorPath = path.join(root, '.agent', 'active-runtime-selector.v1.json');
        const selectorBytes = Buffer.from(record({ schema: 'ActiveRuntimeSelector/v1' }));
        writeFileSync(selectorPath, selectorBytes);
        await Promise.resolve(
          expect(run([...args, '--workflow', 'information_research_light'])).rejects.toMatchObject({
            code: 'GAP-VIDA-RUN-SELECTOR-001',
            message: 'Active selector fields are invalid.',
          }),
        );
        expect(readFileSync(selectorPath)).toEqual(selectorBytes);
        expect(readdirSync(path.join(root, '.agent', 'cutover'))).toEqual(['incomplete']);
        completed = true;
      } finally {
        if (completed) rmSync(root, { recursive: true, force: true });
        else process.stderr.write(`Retained failed run refusal fixture: ${root}\n`);
      }
    });

    test('rejects independent repository and requested-project drift before creating state', async () => {
      const root = mkdtempSync(path.join(tmpdir(), 'vida-run-identity-'));
      let completed = false;
      try {
        const { args, initialization, initializationPath } = createFixture(root);
        const withRepository = (repository: string) =>
          args.map((value, index) => (args[index - 1] === '--repository' ? repository : value));
        const cases = [
          {
            initialization,
            args: withRepository('other-repository'),
            message: 'Runtime initialization repository identity is stale.',
          },
          {
            initialization: { ...initialization, repository_id: 'other-repository' },
            args: withRepository('other-repository'),
            message: 'Runtime initialization repository identity is stale.',
          },
          {
            initialization,
            args: [...args, '--project', 'foreign-project'],
            message: 'The project context is not bound to the requested identity.',
          },
        ];
        for (const entry of cases) {
          writeFileSync(initializationPath, record(entry.initialization));
          await Promise.resolve(
            expect(run(entry.args)).rejects.toMatchObject({
              code: 'GAP-VIDA-RUN-CONTEXT-001',
              message: entry.message,
            }),
          );
          expect(existsSync(path.join(root, '.agent', 'work'))).toBe(false);
        }
        completed = true;
      } finally {
        if (completed) rmSync(root, { recursive: true, force: true });
        else process.stderr.write(`Retained failed run refusal fixture: ${root}\n`);
      }
    });

    test('accepts the same configured project set in either receipt order', async () => {
      const root = mkdtempSync(path.join(tmpdir(), 'vida-run-project-set-'));
      const fixture = ownedMutationFixture(root, 30_000);
      let completed = false;
      try {
        const { args, initialization, initializationPath, config } = createFixture(root, 'agent-runtime-new', true);
        const admitted = prepareMutationIntake(args, config);
        expect(initialization.project_ids).toEqual(['alpha-project', 'mutation-project']);
        const prepared = parseTestRunPayload(await runSuccessfully(admitted.admissionArgs));
        expect(prepared.status).toBe('prepared');
        expect(requireIssuedActions(prepared)).toEqual([]);
        writeFileSync(
          initializationPath,
          record({ ...initialization, project_ids: [...initialization.project_ids].reverse() }),
        );
        const secondArgs = args.map((value, index) =>
          args[index - 1] === '--work-id' ? `mutation-run-${randomUUID()}` : value,
        );
        const secondAdmitted = prepareMutationIntake(secondArgs, config);
        expect(fixture.invoke(secondAdmitted.admissionArgs).status).toBe('prepared');
        completed = true;
      } finally {
        if (completed && !fixture.hasUnknown()) rmSync(root, { recursive: true, force: true });
        else
          process.stderr.write(
            `Retained ${fixture.hasUnknown() ? 'uncertain' : 'failed'} public run fixture: ${root}\n`,
          );
      }
    }, 30_000);

    test('closes the intake ledger when a secondary project path profile fails', async () => {
      const root = mkdtempSync(path.join(tmpdir(), 'vida-run-project-set-close-'));
      const fixture = ownedMutationFixture(root, 30_000);
      let completed = false;
      try {
        const { args, initialization, initializationPath, config } = createFixture(root, 'agent-runtime-new', true);
        const defaultTeam = config.teams['default-development'];
        assert.ok(defaultTeam);
        const missingPolicyPath = 'docs/agent-instructions/unavailable-alpha-policy.v1.json';
        const secondaryProfileFailure: AgentRuntimeConfig = {
          ...config,
          teams: {
            ...config.teams,
            'default-development': {
              ...defaultTeam,
              allowed_projects: [...defaultTeam.allowed_projects, 'alpha-project'],
            },
          },
          projects: config.projects.map((project) =>
            project.project_id === 'alpha-project'
              ? {
                  ...project,
                  path_overrides: {
                    ...project.path_overrides,
                    documentation_policy_path: missingPolicyPath,
                  },
                }
              : project,
          ),
        };
        writeFileSync(path.join(root, 'agent-runtime.config.v1.yaml'), record(secondaryProfileFailure));
        const activeConfig = loadRuntimeConfig(root);
        expect(
          activeConfig.projects.find((project) => project.project_id === 'alpha-project')?.path_overrides
            ?.documentation_policy_path,
        ).toBe(missingPolicyPath);
        writeFileSync(
          initializationPath,
          record({ ...initialization, config_digest: runtimeConfigDigest(activeConfig) }),
        );
        const admitted = prepareMutationIntake([...args, '--project', 'alpha-project'], activeConfig);
        await Promise.resolve(
          expect(run(admitted.admissionArgs)).rejects.toMatchObject({
            code: 'GAP-RTNEW-PATH-PROFILE-001',
            message: `GAP-RTNEW-PATH-PROFILE-001: path documentation_policy_path is unavailable: ${missingPolicyPath}`,
          }),
        );
        const databaseRelativePath = path.relative(root, sessionHandoffDatabasePath(root, activeConfig));
        const afterFailure = inspectHostWorkspaceDatabase(
          root,
          databaseRelativePath,
          deriveWorkspaceId(activeConfig.repository.repository_id, root),
        );
        expect({
          work: afterFailure.work,
          journals: afterFailure.journals,
          attempts: afterFailure.admission_attempts,
        }).toEqual({ work: [], journals: [], attempts: [] });
        expect(existsSync(path.join(root, missingPolicyPath))).toBe(false);
        completed = true;
      } finally {
        if (completed && !fixture.hasUnknown()) rmSync(root, { recursive: true, force: true });
        else
          process.stderr.write(
            `Retained ${fixture.hasUnknown() ? 'uncertain' : 'failed'} project-set close fixture: ${root}\n`,
          );
      }
    }, 30_000);

    test('rejects unreadable and malformed caller intake before Host database creation', async () => {
      const root = mkdtempSync(path.join(tmpdir(), 'vida-run-intake-before-db-'));
      const deadline = performance.now() + 5_000;
      let completed = false;
      try {
        const { args, config } = createFixture(root);
        const admitted = prepareMutationIntake(args, config);
        const originalIntakePath = admitted.admissionArgs[admitted.admissionArgs.indexOf('--intake') + 1];
        assert.ok(originalIntakePath);
        const originalIntake = requireRecord(
          JSON.parse(readFileSync(originalIntakePath, 'utf8')),
          'valid intake fixture',
        );
        const intakeDir = path.dirname(originalIntakePath);
        const cases: readonly { readonly name: string; readonly bytes?: Buffer }[] = [
          { name: 'missing' },
          { name: 'unreadable-json', bytes: Buffer.from('{') },
          { name: 'schema-invalid', bytes: Buffer.from(record({ ...originalIntake, schema: 'Wrong/v1' })) },
        ];
        for (const [index, entry] of cases.entries()) {
          const intakePath = path.join(intakeDir, `caller-${index}-${entry.name}.json`);
          if (entry.bytes) writeFileSync(intakePath, entry.bytes);
          else expect(existsSync(intakePath)).toBe(false);
          await Promise.resolve(
            expect(run([...admitted.args, '--intake', intakePath])).rejects.toMatchObject({
              code: 'GAP-VIDA-RUN-CONTEXT-001',
              message: 'The local session intake is invalid.',
            }),
          );
          expect(existsSync(sessionHandoffDatabasePath(root, config))).toBe(false);
        }
        completed = true;
      } finally {
        if (completed && performance.now() < deadline - 250) rmSync(root, { recursive: true, force: true });
        else process.stderr.write(`Retained failed or over-budget early intake fixture: ${root}\n`);
      }
    }, 5_000);

    test('closes an empty admission ledger for a valid intake with foreign Work identity', async () => {
      const root = mkdtempSync(path.join(tmpdir(), 'vida-run-intake-identity-'));
      const deadline = performance.now() + 5_000;
      let completed = false;
      let restoreDatabaseCloseSpy: (() => void) | undefined;
      try {
        const { args, config } = createFixture(root);
        const admitted = prepareMutationIntake(args, config);
        const originalIntakePath = admitted.admissionArgs[admitted.admissionArgs.indexOf('--intake') + 1];
        assert.ok(originalIntakePath);
        const originalIntake = requireRecord(
          JSON.parse(readFileSync(originalIntakePath, 'utf8')),
          'valid intake fixture',
        );
        const workItem = requireRecord(originalIntake.work_item, 'valid intake work item');
        const mismatchedPath = path.join(path.dirname(originalIntakePath), 'caller-identity-mismatch.json');
        writeFileSync(
          mismatchedPath,
          record({ ...originalIntake, work_item: { ...workItem, id: 'other-admitted-work' } }),
        );
        const databasePath = path.resolve(sessionHandoffDatabasePath(root, config));
        const databaseLifetime = await observeOwnedDatabaseLifetime(databasePath);
        restoreDatabaseCloseSpy = databaseLifetime.restore;
        await Promise.resolve(
          expect(run([...admitted.args, '--intake', mismatchedPath])).rejects.toMatchObject({
            code: 'GAP-VIDA-RUN-CONTEXT-001',
            message: 'Intake identity differs from current configured work.',
          }),
        );
        restoreDatabaseCloseSpy();
        restoreDatabaseCloseSpy = undefined;
        databaseLifetime.assertAllClosed();
        const after = inspectHostWorkspaceDatabase(
          root,
          path.relative(root, databasePath),
          deriveWorkspaceId(config.repository.repository_id, root),
        );
        expect({
          work: after.work,
          journals: after.journals,
          attempts: after.admission_attempts,
        }).toEqual({ work: [], journals: [], attempts: [] });
        completed = true;
      } finally {
        restoreDatabaseCloseSpy?.();
        if (completed && performance.now() < deadline - 250) rmSync(root, { recursive: true, force: true });
        else process.stderr.write(`Retained failed or over-budget intake identity fixture: ${root}\n`);
      }
    }, 5_000);

    test('closes admitted ownership validation after intake changes between public reads', async () => {
      const root = mkdtempSync(path.join(tmpdir(), 'vida-run-owned-intake-drift-'));
      const deadline = performance.now() + 5_000;
      let completed = false;
      let primaryFailure: { error: unknown } | undefined;
      let restoreRead: (() => void) | undefined;
      let restoreLifetime: (() => void) | undefined;
      let restoreIntake: (() => void) | undefined;
      try {
        const { args, config } = createFixture(root);
        const admitted = prepareMutationIntake(args, config);
        const prepared = parseTestRunPayload(await run(admitted.admissionArgs));
        expect(prepared.status).toBe('prepared');
        const databasePath = sessionHandoffDatabasePath(root, config);
        const databaseRelativePath = path.relative(root, databasePath);
        const workspaceId = deriveWorkspaceId(config.repository.repository_id, root);
        const before = inspectHostWorkspaceDatabase(root, databaseRelativePath, workspaceId);
        const work = before.work[0];
        assert.ok(work?.state.lease);
        const intake = work.state.artifacts.find((entry) => entry.artifact_id === 'local-session-intake');
        assert.ok(intake);
        const intakeFile = path.join(root, intake.path);
        const intakeBytes = readFileSync(intakeFile);
        restoreIntake = () => writeFileSync(intakeFile, intakeBytes);
        const lifetime = await observeOwnedDatabaseLifetime(databasePath);
        restoreLifetime = lifetime.restore;
        const execution = await import('../src/orchestration/admitted-session-execution.ts');
        const originalRead = execution.readAdmittedSessionIntake;
        let driftObserved = false;
        const readSpy = spyOn(execution, 'readAdmittedSessionIntake').mockImplementation(
          (...parameters: Parameters<typeof originalRead>) => {
            if (parameters[0] === root) {
              driftObserved = true;
              writeFileSync(intakeFile, Buffer.concat([intakeBytes, Buffer.from('\n')]));
            }
            return originalRead(...parameters);
          },
        );
        restoreRead = () => readSpy.mockRestore();
        await assert.rejects(run(admitted.args), { message: 'admitted local session intake changed' });
        expect(driftObserved).toBe(true);
        lifetime.assertAllClosed();
        restoreRead();
        restoreRead = undefined;
        restoreIntake();
        restoreIntake = undefined;
        expect(readFileSync(intakeFile).equals(intakeBytes)).toBe(true);
        expect(inspectHostWorkspaceDatabase(root, databaseRelativePath, workspaceId)).toEqual(before);
        const resumed = parseTestRunPayload(await run(admitted.args));
        expect(resumed.status).toBe('resumed');
        expect(resumed.state_version).toEqual(prepared.state_version);
        expect(requireNextActions(resumed)).toEqual(requireNextActions(prepared));
        lifetime.assertAllClosed();
        expect(inspectHostWorkspaceDatabase(root, databaseRelativePath, workspaceId)).toEqual(before);
        expect(performance.now()).toBeLessThan(deadline - 250);
        completed = true;
      } catch (error) {
        primaryFailure = { error };
        throw error;
      } finally {
        completeOwnedCleanup(
          [
            () => {
              restoreRead?.();
              restoreRead = undefined;
            },
            () => {
              restoreIntake?.();
              restoreIntake = undefined;
            },
            () => {
              restoreLifetime?.();
              restoreLifetime = undefined;
            },
            () => {
              if (completed && !restoreRead && !restoreIntake && !restoreLifetime && performance.now() < deadline - 250)
                rmSync(root, { recursive: true, force: true });
              else process.stderr.write(`Retained failed or over-budget owned intake drift fixture: ${root}\n`);
            },
          ],
          primaryFailure,
        );
      }
    }, 5_000);

    test('closes admission after the caller intake changes between public reads', async () => {
      const root = mkdtempSync(path.join(tmpdir(), 'vida-run-intake-toctou-'));
      const deadline = performance.now() + 5_000;
      let completed = false;
      let primaryFailed = false;
      let primaryError: unknown;
      let restoreDatabaseCloseSpy: (() => void) | undefined;
      let restoreHandoffSpy: (() => void) | undefined;
      let originalIntakeBytes: Buffer | undefined;
      let callerPath: string | undefined;
      let intakeRestored = false;
      try {
        const { args, config } = createFixture(root);
        const admitted = prepareMutationIntake(args, config);
        const candidatePath = admitted.admissionArgs[admitted.admissionArgs.indexOf('--intake') + 1];
        assert.ok(candidatePath);
        const callerIntakePath: string = candidatePath;
        callerPath = callerIntakePath;
        const savedIntakeBytes = readFileSync(callerIntakePath);
        originalIntakeBytes = savedIntakeBytes;
        const databasePath = path.resolve(sessionHandoffDatabasePath(root, config));
        const databaseLifetime = await observeOwnedDatabaseLifetime(databasePath);
        restoreDatabaseCloseSpy = databaseLifetime.restore;

        const handoff = await import('../src/orchestration/persistent-session-handoff.ts');
        const originalOpen = handoff.openConfiguredMastraSessionLedger;
        let changedCallerIntake = false;
        const openSpy = spyOn(handoff, 'openConfiguredMastraSessionLedger').mockImplementation(
          (...parameters: Parameters<typeof originalOpen>) => {
            const ledger = originalOpen(...parameters);
            if (!changedCallerIntake && parameters[0] === root) {
              changedCallerIntake = true;
              writeFileSync(callerIntakePath, Buffer.from('{'));
            }
            return ledger;
          },
        );
        restoreHandoffSpy = () => openSpy.mockRestore();

        await Promise.resolve(
          expect(run(admitted.admissionArgs)).rejects.toMatchObject({
            code: 'GAP-VIDA-RUN-CONTEXT-001',
            message: 'The local session intake is invalid.',
          }),
        );
        expect(changedCallerIntake).toBe(true);
        databaseLifetime.assertAllClosed();
        writeFileSync(callerIntakePath, savedIntakeBytes);
        expect(readFileSync(callerIntakePath).equals(savedIntakeBytes)).toBe(true);
        intakeRestored = true;
        restoreDatabaseCloseSpy?.();
        restoreDatabaseCloseSpy = undefined;
        restoreHandoffSpy?.();
        restoreHandoffSpy = undefined;
        const after = inspectHostWorkspaceDatabase(
          root,
          path.relative(root, databasePath),
          deriveWorkspaceId(config.repository.repository_id, root),
        );
        expect({
          work: after.work,
          journals: after.journals,
          attempts: after.admission_attempts,
        }).toEqual({ work: [], journals: [], attempts: [] });
        completed = true;
      } catch (error) {
        primaryFailed = true;
        primaryError = error;
      }
      const flatErrors: unknown[] = [];
      if (primaryFailed) flatErrors.push(primaryError);
      try {
        if (!intakeRestored && callerPath && originalIntakeBytes) {
          writeFileSync(callerPath, originalIntakeBytes);
          expect(readFileSync(callerPath).equals(originalIntakeBytes)).toBe(true);
          intakeRestored = true;
        }
      } catch (error) {
        flatErrors.push(error);
      }
      try {
        restoreDatabaseCloseSpy?.();
      } catch (error) {
        flatErrors.push(error);
      }
      try {
        restoreHandoffSpy?.();
      } catch (error) {
        flatErrors.push(error);
      }
      if (completed && flatErrors.length === 0 && performance.now() < deadline - 250) {
        try {
          rmSync(root, { recursive: true, force: true });
        } catch (error) {
          flatErrors.push(error);
        }
      } else process.stderr.write(`Retained failed or over-budget intake TOCTOU fixture: ${root}\n`);
      if (flatErrors.length === 1) throw flatErrors[0];
      if (flatErrors.length > 1) throw new AggregateError(flatErrors, 'Intake TOCTOU case and cleanup failed');
    }, 5_000);

    test('closes admission when recording a valid intake attempt fails', async () => {
      const root = mkdtempSync(path.join(tmpdir(), 'vida-run-intake-attempt-close-'));
      const deadline = performance.now() + 5_000;
      let completed = false;
      let restoreAdmissionSpy: (() => void) | undefined;
      let restoreDatabaseCloseSpy: (() => void) | undefined;
      try {
        const { args, config } = createFixture(root);
        const admitted = prepareMutationIntake(args, config);
        const workId = args[args.indexOf('--work-id') + 1];
        assert.ok(workId);
        const databasePath = path.resolve(sessionHandoffDatabasePath(root, config));
        const failure = new Error('injected valid admission-attempt write failure');
        let failureInjected = false;
        const originalRecord = Reflect.get(
          HostStateStore.prototype,
          'recordAdmissionAttempt',
        ) as HostStateStore['recordAdmissionAttempt'];
        const admissionSpy = spyOn(HostStateStore.prototype, 'recordAdmissionAttempt').mockImplementation(function (
          this: HostStateStore,
          ...parameters: Parameters<HostStateStore['recordAdmissionAttempt']>
        ) {
          if (!failureInjected && parameters[0] === workId) {
            failureInjected = true;
            throw failure;
          }
          return Reflect.apply(originalRecord, this, parameters);
        });
        restoreAdmissionSpy = () => admissionSpy.mockRestore();
        const databaseLifetime = await observeOwnedDatabaseLifetime(databasePath);
        restoreDatabaseCloseSpy = databaseLifetime.restore;

        await Promise.resolve(expect(run(admitted.admissionArgs)).rejects.toBe(failure));
        expect(failureInjected).toBe(true);
        restoreAdmissionSpy();
        restoreAdmissionSpy = undefined;
        restoreDatabaseCloseSpy();
        restoreDatabaseCloseSpy = undefined;
        databaseLifetime.assertAllClosed();
        const after = inspectHostWorkspaceDatabase(
          root,
          path.relative(root, databasePath),
          deriveWorkspaceId(config.repository.repository_id, root),
        );
        expect({
          work: after.work,
          journals: after.journals,
          attempts: after.admission_attempts,
        }).toEqual({ work: [], journals: [], attempts: [] });
        completed = true;
      } finally {
        restoreAdmissionSpy?.();
        restoreDatabaseCloseSpy?.();
        if (completed && performance.now() < deadline - 250) rmSync(root, { recursive: true, force: true });
        else process.stderr.write(`Retained failed or over-budget admission-attempt fixture: ${root}\n`);
      }
    }, 5_000);

    test('closes both owned ledgers when a shape-valid correction plan belongs to other work', async () => {
      const root = mkdtempSync(path.join(tmpdir(), 'vida-run-correction-refusal-'));
      const deadline = performance.now() + 5_000;
      let completed = false;
      let restoreDatabaseCloseSpy: (() => void) | undefined;
      try {
        const { args, config } = createFixture(root);
        const planPath = path.join(root, 'caller-correction-plan.json');
        writeFileSync(
          planPath,
          record({
            schema: 'CorrectiveExecutionPlan/v1',
            work_id: 'other-admitted-work',
            attempt: 1,
            stage_ids: ['develop_task'],
            user_instruction_ref: 'fixture:caller-correction-plan',
            preparation_path: '.agent/work/other-admitted-work/preparation.json',
          }),
        );
        const databasePath = path.resolve(sessionHandoffDatabasePath(root, config));
        const databaseLifetime = await observeOwnedDatabaseLifetime(databasePath);
        restoreDatabaseCloseSpy = databaseLifetime.restore;
        await Promise.resolve(
          expect(
            run([...args, '--correct', planPath, '--expected-revision', '1', '--expected-digest', 'a'.repeat(64)]),
          ).rejects.toMatchObject({
            code: 'GAP-VIDA-RUN-CONTEXT-001',
            message: 'Correction plan belongs to another work or attempt.',
          }),
        );
        restoreDatabaseCloseSpy();
        restoreDatabaseCloseSpy = undefined;
        databaseLifetime.assertAllClosed();
        const after = inspectHostWorkspaceDatabase(
          root,
          path.relative(root, databasePath),
          deriveWorkspaceId(config.repository.repository_id, root),
        );
        expect({
          work: after.work,
          journals: after.journals,
          attempts: after.admission_attempts,
        }).toEqual({ work: [], journals: [], attempts: [] });
        completed = true;
      } finally {
        restoreDatabaseCloseSpy?.();
        if (completed && performance.now() < deadline - 250) rmSync(root, { recursive: true, force: true });
        else process.stderr.write(`Retained failed or over-budget correction refusal fixture: ${root}\n`);
      }
    }, 5_000);

    test('closes the intake ledger when the admission Host snapshot read fails', async () => {
      const root = mkdtempSync(path.join(tmpdir(), 'vida-run-admission-snapshot-close-'));
      let completed = false;
      let restoreSnapshotSpy: (() => void) | undefined;
      let restoreDatabaseCloseSpy: (() => void) | undefined;
      try {
        const { args, config } = createFixture(root);
        const admitted = prepareMutationIntake(args, config);
        const workId = args[args.indexOf('--work-id') + 1];
        assert.ok(workId);
        const databasePath = path.resolve(sessionHandoffDatabasePath(root, config));
        const failure = new Error('injected admission Host snapshot read failure');
        let snapshotFailureInjected = false;
        const originalRead = Reflect.get(
          HostStateStore.prototype,
          'readHostStateSnapshot',
        ) as HostStateStore['readHostStateSnapshot'];
        const snapshotSpy = spyOn(HostStateStore.prototype, 'readHostStateSnapshot').mockImplementation(function (
          this: HostStateStore,
          identity: WorkIdentity,
        ) {
          if (!snapshotFailureInjected && identity.work_id === workId) {
            snapshotFailureInjected = true;
            throw failure;
          }
          return Reflect.apply(originalRead, this, [identity]) as ReturnType<HostStateStore['readHostStateSnapshot']>;
        });
        restoreSnapshotSpy = () => snapshotSpy.mockRestore();
        const originalClose = Reflect.get(Database.prototype, 'close') as Database['close'];
        const closedDatabasePaths: string[] = [];
        const closeSpy = spyOn(Database.prototype, 'close').mockImplementation(function (
          this: Database,
          ...parameters: Parameters<Database['close']>
        ) {
          const filename = path.resolve(this.filename);
          Reflect.apply(originalClose, this, parameters);
          if (filename === databasePath) closedDatabasePaths.push(filename);
        });
        restoreDatabaseCloseSpy = () => closeSpy.mockRestore();

        await Promise.resolve(expect(run(admitted.admissionArgs)).rejects.toBe(failure));
        expect(snapshotFailureInjected).toBe(true);
        expect(closedDatabasePaths).toEqual([databasePath]);

        restoreSnapshotSpy();
        restoreSnapshotSpy = undefined;
        restoreDatabaseCloseSpy();
        restoreDatabaseCloseSpy = undefined;
        const afterFailure = inspectHostWorkspaceDatabase(
          root,
          path.relative(root, databasePath),
          deriveWorkspaceId(config.repository.repository_id, root),
        );
        expect({
          work: afterFailure.work,
          journals: afterFailure.journals,
          attempts: afterFailure.admission_attempts,
        }).toEqual({ work: [], journals: [], attempts: [] });
        completed = true;
      } finally {
        restoreSnapshotSpy?.();
        restoreDatabaseCloseSpy?.();
        if (completed) rmSync(root, { recursive: true, force: true });
        else process.stderr.write(`Retained failed admission snapshot close fixture: ${root}\n`);
      }
    }, 30_000);

    const configuredFrontierRunArgs = (root: string, request: DeliveredWorkContinuationRequest, inspect = true) => {
      const sourcePaths = request.currentSourceScope.entries.map((entry) => entry.path);
      const workPath = sourcePaths[0];
      const projectId = request.identity.project_ids[0];
      if (!workPath || !projectId) throw new Error('Configured frontier is missing its current Source or project path');
      return {
        sourcePaths,
        args: [
          '--project-root',
          root,
          '--repository',
          request.identity.repository_id,
          '--project',
          projectId,
          '--work-path',
          workPath,
          '--work-id',
          request.identity.work_id,
          '--attempt',
          String(request.attempt),
          '--scope-digest',
          request.currentSourceScope.digest,
          '--team',
          'default-development',
          '--kind',
          'task',
          '--intent',
          'task_execution',
          '--workflow',
          request.action.workflow_id,
          ...(inspect ? ['--inspect', 'true'] : []),
        ],
      };
    };
    type ConfiguredFrontierHostAction = Parameters<typeof withConfiguredFrontierHostFixture>[0];
    type ConfiguredFrontierRunFixture = Parameters<ConfiguredFrontierHostAction>[0];
    type ConfiguredFrontierRunSetup = Parameters<ConfiguredFrontierHostAction>[1];
    const issueConfiguredFrontierWave = async (
      fixture: ConfiguredFrontierRunFixture,
      setup: ConfiguredFrontierRunSetup,
    ) => {
      const { root, config, input, intakePath } = setup;
      const { request } = bindConfiguredFrontierCurrentRuntimeEndpoint(input, { root, config, intakePath });
      seedFrontierHostFixture(fixture, input);
      await bindControlledRuntimeInitialization(root, config, fixture.store);
      const { args } = configuredFrontierRunArgs(root, request, false),
        expected = (version: StateVersion) => [
          '--expected-revision',
          String(version.revision),
          '--expected-digest',
          version.digest,
        ],
        issued = parseTestRunPayload(
          await runSuccessfully([
            ...args,
            ...expected(requireStateVersion(input.receipt.journal_version)),
            '--issue-wave',
            'true',
          ]),
        ),
        initial = fixture.store.readDeliveredWorkContinuation(request.identity, request.attempt);
      if (!initial) throw new Error('Configured-frontier issue did not persist its native continuation');
      expect(issued.status).toBe('issued');
      expect(initial.action_status).toBe('issued');
      expect(initial.items.length).toBeGreaterThan(0);
      return {
        request,
        initial,
        successorWork: input.receipt.successor_work,
        reportArgs: (version: StateVersion, reportPath: string) => [
          ...args,
          ...expected(version),
          '--report',
          reportPath,
        ],
        stateVersion: requireStateVersion(issued.state_version),
      };
    };

    test('maps configured-frontier Source paths and closes the ledger when its snapshot fails', async () => {
      await withConfiguredFrontierHostFixture(async (fixture, setup) => {
        const { root, config, workspaceId, input, intakePath } = setup;
        const { request } = bindConfiguredFrontierCurrentRuntimeEndpoint(input, { root, config, intakePath });
        seedFrontierHostFixture(fixture, input);
        await bindControlledRuntimeInitialization(root, config, fixture.store);
        const workId = request.identity.work_id;
        const databasePath = path.resolve(sessionHandoffDatabasePath(root, config));
        const databaseRelativePath = path.relative(root, databasePath);
        const { args, sourcePaths } = configuredFrontierRunArgs(root, request);
        const before = inspectHostWorkspaceDatabase(root, databaseRelativePath, workspaceId);
        const failure = new Error('injected configured-frontier Source snapshot failure');
        const capturedSourcePaths: string[][] = [];
        let snapshotFailureInjected = false;
        const failedHostStates = new WeakSet<HostStateStore>();
        const originalSnapshot = Reflect.get(
          HostStateStore.prototype,
          'snapshotCurrentTaskSourceSources',
        ) as HostStateStore['snapshotCurrentTaskSourceSources'];
        const snapshotSpy = spyOn(HostStateStore.prototype, 'snapshotCurrentTaskSourceSources').mockImplementation(
          function (
            this: HostStateStore,
            identity: WorkIdentity,
            threadId: string,
            paths: readonly string[],
            attempt?: number,
          ) {
            if (!snapshotFailureInjected && identity.work_id === workId) {
              snapshotFailureInjected = true;
              failedHostStates.add(this);
              capturedSourcePaths.push([...paths]);
              throw failure;
            }
            return Reflect.apply(originalSnapshot, this, [identity, threadId, paths, attempt]) as ReturnType<
              HostStateStore['snapshotCurrentTaskSourceSources']
            >;
          },
        );
        const originalClose = Reflect.get(MastraSessionLedger.prototype, 'close') as MastraSessionLedger['close'];
        const closedOwnerLedgers: MastraSessionLedger[] = [];
        const closeSpy = spyOn(MastraSessionLedger.prototype, 'close').mockImplementation(function (
          this: MastraSessionLedger,
          ...parameters: Parameters<MastraSessionLedger['close']>
        ) {
          Reflect.apply(originalClose, this, parameters);
          if (failedHostStates.has(this.hostState)) closedOwnerLedgers.push(this);
        });
        try {
          await Promise.resolve(expect(run(args)).rejects.toBe(failure));
          expect(snapshotFailureInjected).toBe(true);
          expect(capturedSourcePaths).toEqual([sourcePaths]);
          expect(closedOwnerLedgers).toHaveLength(1);
          const after = inspectHostWorkspaceDatabase(root, databaseRelativePath, workspaceId);
          expect({
            work: after.work,
            ledger: after.ledger,
            ledger_version: after.ledger_version,
            journals: after.journals,
          }).toEqual({
            work: before.work,
            ledger: before.ledger,
            ledger_version: before.ledger_version,
            journals: before.journals,
          });
        } finally {
          snapshotSpy.mockRestore();
          closeSpy.mockRestore();
        }
      }, 'normal');
    }, 30_000);

    test('rejects a configured-frontier report whose action was not issued', async () => {
      await withConfiguredFrontierHostFixture(
        async (fixture, setup) => {
          const { root, config, input, intakePath } = setup;
          const { request } = bindConfiguredFrontierCurrentRuntimeEndpoint(input, { root, config, intakePath });
          seedFrontierHostFixture(fixture, input);
          await bindControlledRuntimeInitialization(root, config, fixture.store);
          const { args } = configuredFrontierRunArgs(root, request, false);
          const expected = (version: ReturnType<typeof requireStateVersion>) => [
            '--expected-revision',
            String(version.revision),
            '--expected-digest',
            version.digest,
          ];
          const issued = parseTestRunPayload(
            await runSuccessfully([
              ...args,
              ...expected(requireStateVersion(input.receipt.journal_version)),
              '--issue-wave',
              'true',
            ]),
          );
          expect(issued.status).toBe('issued');
          const issuedActions = requireIssuedActions(issued);
          expect(issuedActions.length).toBeGreaterThan(0);
          const issuedAction = issuedActions[0];
          if (!issuedAction || typeof issuedAction.issue_id !== 'string')
            throw new Error('Configured-frontier issue is missing its retained ID');
          const issuedActionIds = new Set(issuedActions.map((action) => action.request.action_id));
          const unmatchedActionId = Array.from({ length: issuedActions.length + 1 }, (_, index) =>
            index.toString(16).padStart(64, '0'),
          ).find((actionId) => !issuedActionIds.has(actionId));
          if (!unmatchedActionId)
            throw new Error('Configured-frontier report action unexpectedly matched an issued ID');
          const summary = 'Rejected the configured-frontier report because its action was not issued.';
          const observation = {
            schema: 'VidaSessionObservation/v1',
            action_id: unmatchedActionId,
            issue_id: issuedAction.issue_id,
            agent_id: 'fixture:configured-frontier-rejection',
            tool_call_ref: 'fixture:configured-frontier-rejection-call',
            status: 'reported_complete',
            summary,
            output_digest: canonicalJsonDigest(summary),
            evidence_refs: ['fixture:configured-frontier-rejection-evidence'],
          } as const;
          const reportPath = path.join(root, 'configured-frontier-report.json');
          writeFileSync(reportPath, JSON.stringify(observation));
          const readDatabase = nativeDatabaseSnapshotReader(fixture.db);
          const reportBefore = readFileSync(reportPath);
          const beforeReport = readDatabase();
          await Promise.resolve(
            expect(run([...args, '--report', reportPath])).rejects.toMatchObject({
              code: 'GAP-VIDA-RUN-CLI-001',
              message:
                'Mutation modes require one mode and an exact expected state version; renewal also requires the current owner and lease generation.',
            }),
          );
          expect(readDatabase()).toEqual(beforeReport);
          expect(readFileSync(reportPath)).toEqual(reportBefore);
          await Promise.resolve(
            expect(
              run([...args, ...expected(requireStateVersion(issued.state_version)), '--report', reportPath]),
            ).rejects.toThrow('Prewriter report has no matching retained issuance.'),
          );
          expect(readDatabase()).toEqual(beforeReport);
          expect(readFileSync(reportPath)).toEqual(reportBefore);

          const originalSnapshot = Reflect.get(
            HostStateStore.prototype,
            'readHostStateSnapshot',
          ) as HostStateStore['readHostStateSnapshot'];
          let matchingSnapshotCount = 0;
          const snapshotSpy = spyOn(HostStateStore.prototype, 'readHostStateSnapshot').mockImplementation(function (
            this: HostStateStore,
            identity: WorkIdentity,
          ): ReturnType<HostStateStore['readHostStateSnapshot']> {
            const snapshot = Reflect.apply(originalSnapshot, this, [identity]) as ReturnType<
              HostStateStore['readHostStateSnapshot']
            >;
            if (identity.work_id === request.identity.work_id) {
              matchingSnapshotCount += 1;
              if (matchingSnapshotCount === 2) return { ...snapshot, work: null };
            }
            return snapshot;
          });
          try {
            await Promise.resolve(
              expect(
                run([...args, ...expected(requireStateVersion(issued.state_version)), '--report', reportPath]),
              ).rejects.toMatchObject({
                code: 'GAP-VIDA-RUN-CONTEXT-001',
                message: 'Delivered prewriter continuation has no current Host work.',
              }),
            );
            expect(matchingSnapshotCount).toBe(3);
            expect(readDatabase()).toEqual(beforeReport);
            expect(readFileSync(reportPath)).toEqual(reportBefore);
          } finally {
            snapshotSpy.mockRestore();
          }
        },
        'normal',
        'unmatched-prewriter-report',
      );
    }, 30_000);

    test('rejects a reported_failed configured-frontier observation before resuming the wave', async () => {
      await withConfiguredFrontierHostFixture(
        async (fixture, setup) => {
          const root = setup.root;
          const {
            request,
            initial,
            reportArgs,
            stateVersion: issuedVersion,
          } = await issueConfiguredFrontierWave(fixture, setup);
          let stateVersion = issuedVersion;
          const bridgeOpenSpy = spyOn(MastraSessionBridge, 'open');
          try {
            for (const [index, item] of initial.items.entries()) {
              if (typeof item.issue_id !== 'string')
                throw new Error('Configured-frontier issue is missing its retained ID');
              const summary = `Configured-frontier failed report ${index}`;
              const observation = {
                schema: 'VidaSessionObservation/v1',
                action_id: item.request.action_id,
                issue_id: item.issue_id,
                agent_id: 'fixture:configured-frontier-failed-report',
                tool_call_ref: 'fixture:configured-frontier-failed-report-' + index,
                status: 'reported_failed',
                summary,
                output_digest: canonicalJsonDigest(summary),
                evidence_refs: ['fixture:configured-frontier-failed-report-evidence'],
              } as const;
              const reportPath = path.join(root, `configured-frontier-failed-report-${index}.json`);
              writeFileSync(reportPath, JSON.stringify(observation));
              const reportArguments = reportArgs(stateVersion, reportPath);
              if (index === initial.items.length - 1) {
                await Promise.resolve(
                  expect(run(reportArguments)).rejects.toMatchObject({
                    code: 'GAP-VIDA-RUN-CONTEXT-001',
                    message: 'The current prewriter wave contains a failed or incomplete report.',
                  }),
                );
                expect(bridgeOpenSpy).not.toHaveBeenCalled();
              } else await runSuccessfully(reportArguments);
              const current = fixture.store.readDeliveredWorkContinuation(request.identity, request.attempt);
              if (!current) throw new Error('Configured-frontier report removed its native continuation');
              stateVersion = current.journal.version;
            }
          } finally {
            bridgeOpenSpy.mockRestore();
          }
          const reported = fixture.store.readDeliveredWorkContinuation(request.identity, request.attempt);
          if (!reported) throw new Error('Configured-frontier report did not remain in the native ledger');
          expect(reported.action_status).toBe('reported');
          expect(reported.items.map((item) => item.observation?.status)).toEqual(
            initial.items.map(() => 'reported_failed'),
          );
          expect(reported.journal.state.completed).toEqual(initial.journal.state.completed);
        },
        'normal',
        'unmatched-prewriter-report',
      );
    }, 30_000);

    test('accepts a complete prewriter report before bridge resume', async () => {
      await withConfiguredFrontierHostFixture(
        async (fixture, setup) => {
          const root = setup.root;
          const {
            request,
            initial,
            successorWork,
            reportArgs,
            stateVersion: issuedVersion,
          } = await issueConfiguredFrontierWave(fixture, setup);
          let stateVersion = issuedVersion;
          const bridgeOpenSpy = spyOn(MastraSessionBridge, 'open');
          try {
            bridgeOpenSpy.mockRejectedValue(new Error('configured-frontier-resume-sentinel'));
            for (const [index, item] of initial.items.entries()) {
              if (typeof item.issue_id !== 'string')
                throw new Error('Configured-frontier issue is missing its retained ID');
              const preparation = createPrewriterPreparationObservation(
                { issue_id: item.issue_id, request: item.request },
                { work: successorWork, workId: request.identity.work_id },
                request.attempt,
              );
              const summary = JSON.stringify(preparation);
              const observation = {
                schema: 'VidaSessionObservation/v1',
                action_id: item.request.action_id,
                issue_id: item.issue_id,
                agent_id: preparation.observer_id,
                tool_call_ref: 'fixture:configured-frontier-complete-report-' + index,
                status: 'reported_complete',
                summary,
                output_digest: canonicalJsonDigest(summary),
                evidence_refs: preparation.evidence_refs,
              } as const;
              const reportPath = path.join(root, `configured-frontier-complete-report-${index}.json`);
              writeFileSync(reportPath, JSON.stringify(observation));
              const reportArguments = reportArgs(stateVersion, reportPath);
              if (index === initial.items.length - 1) {
                await Promise.resolve(
                  expect(run(reportArguments)).rejects.toThrow('configured-frontier-resume-sentinel'),
                );
                expect(bridgeOpenSpy).toHaveBeenCalledTimes(1);
                expect(bridgeOpenSpy.mock.calls[0]?.[0]).toMatchObject({
                  configuredFrontier: { identity: request.identity, attempt: request.attempt },
                });
              } else await runSuccessfully(reportArguments);
              const current = fixture.store.readDeliveredWorkContinuation(request.identity, request.attempt);
              if (!current) throw new Error('Configured-frontier report removed its native continuation');
              stateVersion = current.journal.version;
            }
          } finally {
            bridgeOpenSpy.mockRestore();
          }
          const reported = fixture.store.readDeliveredWorkContinuation(request.identity, request.attempt);
          if (!reported) throw new Error('Complete configured-frontier reports lost their native continuation');
          expect(reported.action_status).toBe('reported');
          expect(reported.items.map((item) => item.observation?.status)).toEqual(
            initial.items.map(() => 'reported_complete'),
          );
          expect(reported.journal.state.items.map((item) => item.observation?.status)).toEqual(
            initial.items.map(() => 'reported_complete'),
          );
          expect(reported.journal.state.completed).toEqual(initial.journal.state.completed);
        },
        'normal',
        'unmatched-prewriter-report',
      );
    }, 30_000);

    const withRunOption = (args: readonly string[], flag: string, value: string) => {
      const candidate = [...args];
      const index = candidate.indexOf(flag);
      if (index < 0 || index + 1 >= candidate.length) throw Error(`fixture does not include a value for ${flag}`);
      candidate[index + 1] = value;
      return candidate;
    };
    const contextDenials = [
      {
        name: 'stale repository identity',
        changed: { repository_id: 'other-repository' },
        expected: {
          code: 'GAP-VIDA-RUN-CONTEXT-001',
          message:
            'Phase: context binding. Reason: configured context is unavailable or stale. Next action: Inspect project initialization and configured package resources before continuing.',
        },
      },
      {
        name: 'stale project identity',
        changed: { project_ids: ['other-project'] },
        expected: {
          code: 'GAP-VIDA-RUN-CONTEXT-001',
          message:
            'Phase: context binding. Reason: configured context is unavailable or stale. Next action: Inspect project initialization and configured package resources before continuing.',
        },
      },
      {
        name: 'stale integrations digest',
        changed: { integrations_digest: 'b'.repeat(64) },
        expected: {
          code: 'GAP-VIDA-RUN-CONTEXT-001',
          message:
            'Phase: context binding. Reason: configured context is unavailable or stale. Next action: Inspect project initialization and configured package resources before continuing.',
        },
      },
      {
        name: 'stale config digest',
        changed: { config_digest: 'b'.repeat(64) },
        expected: {
          code: 'GAP-VIDA-RUN-CONTEXT-001',
          message:
            'Phase: context binding. Reason: configured context is unavailable or stale. Next action: Inspect project initialization and configured package resources before continuing.',
        },
      },
      {
        name: 'stale workspace identity',
        changed: { workspace_id: 'other-workspace' },
        expected: {
          code: 'GAP-VIDA-RUN-CONTEXT-001',
          message:
            'Phase: context binding. Reason: configured context is unavailable or stale. Next action: Inspect project initialization and configured package resources before continuing.',
        },
      },
      {
        name: 'stale schema digest',
        changed: { schema_sha256: 'b'.repeat(64) },
        expected: {
          code: 'GAP-VIDA-RUN-CONTEXT-001',
          message:
            'Phase: context binding. Reason: configured context is unavailable or stale. Next action: Inspect project initialization and configured package resources before continuing.',
        },
      },
      {
        name: 'incomplete CLI arguments',
        candidate: (args: readonly string[]) => args.slice(0, -2),
        expected: {
          code: 'GAP-VIDA-RUN-CLI-001',
          message:
            'Launcher arguments are incomplete or contain an unsupported option. Next action: inspect the exact work and check its issued contract before retrying.',
        },
      },
      {
        name: 'forged thread authority',
        candidate: (args: readonly string[]) => [...args, '--thread-id', 'forged'],
        expected: {
          code: 'GAP-VIDA-RUN-CLI-001',
          message:
            'Launcher arguments are incomplete or contain an unsupported option. Next action: inspect the exact work and check its issued contract before retrying.',
        },
      },
      {
        name: 'unsupported workflow',
        candidate: (args: readonly string[]) => args.slice(0, -1).concat('task_execution'),
        expected: {
          code: 'GAP-VIDA-RUN-WORKFLOW-001',
          message:
            'The requested workflow is not configured for this selection. Next action: inspect the exact work and check its issued contract before retrying.',
        },
      },
      {
        name: 'invalid workflow kind',
        candidate: (args: readonly string[]) => withRunOption(args, '--kind', 'not-a-work-item-kind'),
        expected: {
          code: 'GAP-VIDA-RUN-EXECUTION-001',
          message:
            'The requested run was blocked by runtime validation. Next action: inspect the exact work and check its issued contract before retrying.',
        },
      },
      {
        name: 'invalid workflow intent',
        candidate: (args: readonly string[]) => withRunOption(args, '--intent', 'not-a-work-item-intent'),
        expected: {
          code: 'GAP-VIDA-RUN-EXECUTION-001',
          message:
            'The requested run was blocked by runtime validation. Next action: inspect the exact work and check its issued contract before retrying.',
        },
      },
    ] as const;
    for (const denial of contextDenials) {
      test(`rejects ${denial.name} without creating Work`, async () => {
        const root = mkdtempSync(path.join(tmpdir(), 'vida-run-negative-context-'));
        let completed = false;
        try {
          const { args, initialization, initializationPath, config } = createFixture(root);
          if ('changed' in denial) writeFileSync(initializationPath, record({ ...initialization, ...denial.changed }));
          const candidate = 'candidate' in denial ? denial.candidate(args) : args;
          const logged: string[] = [];
          const errors: string[] = [];
          const exit: { exitCode?: number } = {};
          await main({
            isMain: true,
            args: candidate,
            execute: run,
            io: {
              log: (value: string) => logged.push(value),
              error: (value: string) => errors.push(value),
            },
            exit,
          });
          expect(logged).toEqual([]);
          expect(exit.exitCode).toBe(1);
          expect(errors).toHaveLength(1);
          expect(JSON.parse(errors[0] ?? 'null')).toEqual({
            schema: 'VidaAgentRunResult/v1',
            status: 'blocked',
            ...denial.expected,
          });
          const databasePath = sessionHandoffDatabasePath(root, config);
          if (existsSync(databasePath)) {
            const observed = inspectHostWorkspaceDatabase(
              root,
              path.relative(root, databasePath),
              deriveWorkspaceId(config.repository.repository_id, root),
            );
            expect(observed.work).toEqual([]);
            expect(observed.journals).toEqual([]);
          }
          completed = true;
        } finally {
          if (completed) rmSync(root, { recursive: true, force: true });
          else process.stderr.write(`Retained failed public run fixture: ${root}\n`);
        }
      }, 5_000);
    }

    test('returns terminal research synthesis bound to its admitted artifact and rejects changed bytes', async () => {
      const root = mkdtempSync(path.join(tmpdir(), 'vida-terminal-research-'));
      let completed = false;
      let pendingIssue = false;
      try {
        const { args, config } = createFixture(root);
        const admitted = prepareMutationIntake(args, config, { sourcePath: 'AGENT.sidecar.md' });
        const expected = (version: StateVersion) => [
          '--expected-revision',
          String(version.revision),
          '--expected-digest',
          version.digest,
        ];
        const prepared = parseTestRunPayload(await runSuccessfully(admitted.admissionArgs));
        let version = requireStateVersion(prepared.state_version);
        const issue = async () => {
          pendingIssue = true;
          const raw = requireRecord(
            await runSuccessfully([...admitted.args, ...expected(version), '--issue-wave', 'true']),
            'Issued terminal research wave',
          );
          expect(raw.status).toBe('wave_issued');
          version = requireStateVersion(parseTestRunPayload(raw).state_version);
          return raw;
        };
        const report = async (
          item: ReturnType<typeof requireIssuedActions>[number],
          summary: string,
          evidenceRefs: string[],
        ) => {
          const observation = {
            schema: 'VidaSessionObservation/v1',
            action_id: item.request.action_id,
            issue_id: item.issue_id,
            agent_id: 'fixture:terminal-research',
            tool_call_ref: `fixture:${item.request.action_id}`,
            status: 'reported_complete',
            summary,
            output_digest: canonicalJsonDigest(summary),
            evidence_refs: evidenceRefs,
          };
          const file = path.join(root, `report-${item.request.stage_id}-${item.request.assignment_index}.json`);
          writeFileSync(file, JSON.stringify(observation), { flag: 'wx' });
          const raw = requireRecord(
            await runSuccessfully([...admitted.args, ...expected(version), '--report', file]),
            'Terminal research report result',
          );
          version = requireStateVersion(parseTestRunPayload(raw).state_version);
          return raw;
        };
        const researchRaw = await issue();
        const researchActions = requireIssuedActions(parseTestRunPayload(researchRaw));
        expect(researchActions).toHaveLength(3);
        for (const item of researchActions) {
          expect(item.request.stage_id).toBe('research_parallel');
          await report(item, researchFixtureSummary(item.action.action_order, admitted.sourceEntry.sha256), [
            `fixture-source-${item.action.action_order}`,
          ]);
        }
        pendingIssue = false;
        const synthesisRaw = await issue();
        const synthesisActions = requireIssuedActions(parseTestRunPayload(synthesisRaw));
        expect(synthesisActions).toHaveLength(1);
        const synthesisAction = synthesisActions[0]!;
        assert.ok(typeof synthesisAction.issue_id === 'string');
        expect(synthesisAction.request.stage_id).toBe('synthesize_research');
        const catalog = requireRecord(
          requireRecord((synthesisRaw.issued_actions as unknown[])[0], 'Issued synthesis').synthesis_source_catalog,
          'Admitted synthesis source catalog',
        );
        assert.ok(Array.isArray(catalog.sources) && catalog.sources.length > 0);
        const key = requireRecord(catalog.sources[0], 'Admitted synthesis source').key;
        assert.equal(typeof key, 'string');
        const researchOutput = JSON.parse(researchFixtureSummary(0, admitted.sourceEntry.sha256)) as {
          completeness: unknown;
        };
        const summary = JSON.stringify({
          schema: 'VidaSynthesisObservationOutput/v1',
          topic: 'Public terminal research',
          findings: [
            {
              finding_id: 'terminal-finding',
              statement: 'AC-CLI-1 SR-CLI-1: the fixture supports read-only research.',
              source_refs: [key],
              evidence_class: 'Code',
              status: 'confirmed',
            },
          ],
          uncertainties: [],
          conflicts: [],
          br_ids: [],
          sr_ids: ['SR-CLI-1'],
          ac_ids: ['AC-CLI-1'],
          gap_ids: [],
          options: [
            {
              option_id: 'retain',
              label: 'Retain evidence',
              description: 'Preserve the admitted finding.',
              evidence_refs: [key],
            },
          ],
          recommendation: { option_id: 'retain', rationale: 'Use admitted research.', evidence_refs: [key] },
          completeness: researchOutput.completeness,
          readiness: 'informational',
        });
        const result = await report(synthesisAction, summary, [String(key)]);
        pendingIssue = false;
        expect(result.resume_status).toBe('complete');
        expect(result.next_actions).toEqual([]);
        expect(result.issued_actions).toEqual([]);
        expect(result.delivery_instruction).toBeNull();
        const synthesis = requireRecord(result.research_synthesis, 'Terminal synthesis');
        expect(synthesis.schema).toBe('ResearchSynthesis/v1');
        assert.ok(typeof synthesis.digest === 'string');
        const relativeDatabase = path.relative(root, sessionHandoffDatabasePath(root, config));
        const workspaceId = deriveWorkspaceId(config.repository.repository_id, root);
        const before = inspectHostWorkspaceDatabase(root, relativeDatabase, workspaceId);
        const artifact = before.work[0]?.state.artifacts.find(
          (item) => item.schema === 'ResearchSynthesis/v1' && item.artifact_id === synthesis.bundle_id,
        );
        assert.ok(artifact);
        expect(before.journals).toHaveLength(1);
        const terminalJournal = { ...before.journals[0]!, resume_status: 'blocked' as const };
        const observations = terminalJournal.state.completed.flatMap((wave) =>
          wave.items.map((item) => {
            assert.ok(item.observation);
            return item.observation;
          }),
        );
        const engine = {
          run_id: terminalJournal.state.run_id,
          status: 'success' as const,
          step_id: null,
          requests: [],
          observations,
        };
        const terminalStage = config.workflows.information_research_light?.stages.find(
          (stage) => stage.id === 'synthesize_research',
        );
        const qualifies = (
          snapshot: import('../src/orchestration/mastra-session-bridge.ts').SessionBridgeSnapshot,
          journal = terminalJournal,
        ) => hasCompletedTerminalStage(journal, snapshot, terminalStage, engine.run_id, false);
        expect(qualifies(engine)).toBe(true);
        expect(qualifies({ ...engine, observations: observations.map(parseSessionBridgeObservation) })).toBe(true);
        expect(
          qualifies({
            ...engine,
            observations: observations.map((observation, index) =>
              index === 0 ? { ...observation, unexpected: true } : observation,
            ),
          }),
        ).toBe(false);
        const firstObservation = observations[0]!;
        assert.throws(() => parseSessionBridgeObservation({ ...firstObservation, summary: undefined }));
        assert.throws(() => parseSessionBridgeObservation({ ...firstObservation, unexpected: true }));
        assert.throws(() => parseSessionBridgeObservation({ ...firstObservation, summary: Symbol('non-JSON') }));
        for (const status of ['failed', 'canceled', 'unknown', 'suspended'] as const)
          expect(qualifies({ ...engine, status })).toBe(false);
        expect(qualifies({ ...engine, run_id: 'foreign-run' })).toBe(false);
        expect(qualifies({ ...engine, step_id: 'wave-0' })).toBe(false);
        expect(qualifies({ ...engine, requests: [synthesisAction.request] })).toBe(false);
        expect(qualifies({ ...engine, observations: observations.slice(1) })).toBe(false);
        expect(
          qualifies({
            ...engine,
            observations: observations.map((observation, index) =>
              index === 0 ? { ...observation, summary: 'altered retained observation' } : observation,
            ),
          }),
        ).toBe(false);
        expect(qualifies({ ...engine, observations: [...observations].reverse() })).toBe(false);
        expect(qualifies(engine, { ...terminalJournal, state: { ...terminalJournal.state, step_id: 'wave-0' } })).toBe(
          false,
        );
        expect(qualifies(engine, { ...terminalJournal, state: { ...terminalJournal.state, completed: [] } })).toBe(
          false,
        );
        expect(hasCompletedTerminalStage(terminalJournal, engine, terminalStage, 'foreign-run', false)).toBe(false);
        expect(hasCompletedTerminalStage(terminalJournal, engine, terminalStage, engine.run_id, true)).toBe(false);
        expect(hasCompletedTerminalStage(terminalJournal, engine, undefined, engine.run_id, false)).toBe(false);
        expect(
          hasCompletedTerminalStage(
            terminalJournal,
            engine,
            { id: 'fixture-terminal-delivery', kind: 'deliver', produces: [] },
            engine.run_id,
            false,
          ),
        ).toBe(false);
        expect(
          hasCompletedTerminalStage(
            terminalJournal,
            engine,
            { id: 'fixture-terminal-synthesis', kind: 'synthesize', produces: [] },
            engine.run_id,
            false,
          ),
        ).toBe(false);
        expect(
          hasCompletedTerminalStage(
            terminalJournal,
            engine,
            { id: 'fixture-implement', kind: 'implement', produces: [] },
            engine.run_id,
            false,
          ),
        ).toBe(false);
        const deliveryStage = { id: 'fixture-terminal-delivery', kind: 'deliver', produces: [] };
        const deliveryJournal = {
          ...terminalJournal,
          state: {
            ...terminalJournal.state,
            completed: terminalJournal.state.completed.map((wave, waveIndex) => ({
              ...wave,
              items: wave.items.map((item, itemIndex) =>
                waveIndex === 0 && itemIndex === 0
                  ? { ...item, request: { ...item.request, stage_id: deliveryStage.id } }
                  : item,
              ),
            })),
          },
        };
        expect(hasCompletedTerminalStage(deliveryJournal, engine, deliveryStage, engine.run_id, false)).toBe(true);
        expect(
          hasCompletedTerminalStage(
            deliveryJournal,
            engine,
            { ...deliveryStage, id: 'foreign-terminal' },
            engine.run_id,
            false,
          ),
        ).toBe(false);
        expect(
          hasCompletedTerminalStage(
            {
              ...deliveryJournal,
              state: {
                ...deliveryJournal.state,
                completed: [...deliveryJournal.state.completed, deliveryJournal.state.completed[0]!],
              },
            },
            {
              ...engine,
              observations: [
                ...engine.observations,
                ...deliveryJournal.state.completed[0]!.items.map((item) => item.observation!),
              ],
            },
            deliveryStage,
            engine.run_id,
            false,
          ),
        ).toBe(false);
        const synthesisItem = before.journals[0]!.state.completed.flatMap((wave) => wave.items).find(
          (item) => item.request.action_id === synthesisAction.request.action_id,
        );
        assert.ok(synthesisItem?.research_normalization && synthesisItem.observation);
        expect(
          qualifies(engine, { ...terminalJournal, state: { ...terminalJournal.state, run_id: 'foreign-run' } }),
        ).toBe(false);
        expect(
          qualifies(engine, { ...terminalJournal, state: { ...terminalJournal.state, items: [synthesisItem] } }),
        ).toBe(false);
        expect(
          qualifies(engine, {
            ...terminalJournal,
            state: {
              ...terminalJournal.state,
              completed: [{ step_id: 'wave-0', items: [{ ...synthesisItem, observation: null }] }],
            },
          }),
        ).toBe(false);
        expect(synthesisItem.issue_id).toBe(synthesisAction.issue_id);
        expect(synthesisItem.observation.summary).toBe(summary);
        const plan = synthesisItem.research_normalization;
        expect(plan.binding.action_id).toBe(synthesisAction.request.action_id);
        expect(plan.binding.issue_id).toBe(synthesisAction.issue_id);
        expect(plan.observation_digest).toBe(canonicalJsonDigest(synthesisItem.observation));
        expect(plan.record_path).toBe(artifact.path);
        expect(plan.record_sha256).toBe(artifact.sha256);
        expect(plan.result_digest).toBe(synthesis.digest);
        expect(artifact.stage_id).toBe(synthesisAction.request.stage_id);
        const artifactPath = path.join(root, artifact.path);
        const original = readFileSync(artifactPath);
        expect(JSON.parse(original.toString())).toEqual(synthesis);
        expect(createHash('sha256').update(original).digest('hex')).toBe(artifact.sha256);
        try {
          writeFileSync(artifactPath, Buffer.concat([original, Buffer.from(' ')]));
          await assert.rejects(run(admitted.args), { message: 'Terminal synthesis bytes changed.' });
          expect(inspectHostWorkspaceDatabase(root, relativeDatabase, workspaceId)).toEqual(before);
        } finally {
          writeFileSync(artifactPath, original);
        }
        const retried = requireRecord(await runSuccessfully(admitted.args), 'Restored terminal synthesis');
        expect(retried.research_synthesis).toEqual(synthesis);
        expect(retried.state_version).toEqual(version);
        expect(inspectHostWorkspaceDatabase(root, relativeDatabase, workspaceId)).toEqual(before);
        completed = true;
      } finally {
        if (completed && !pendingIssue) rmSync(root, { recursive: true, force: true });
        else process.stderr.write(`Retained terminal research fixture: ${root}\n`);
      }
    }, 60_000);

    test('keeps CAS and report handling bound to one admitted attempt', async () => {
      const root = mkdtempSync(path.join(tmpdir(), 'vida-run-mutation-'));
      const fixture = ownedMutationFixture(root, 60_000);
      let completed = false;
      try {
        const { args, config } = createFixture(root);
        const admitted = prepareMutationIntake(args, config, { sourcePath: 'AGENT.sidecar.md', risk: 'high' });
        const { sourceEntry } = admitted;
        const runtimePaths = runtimePackageCodePaths(config.runtime.bundle);
        const runtimeSnapshot = snapshotRuntimePackageSources(
          runtimePackageAccess(),
          config.runtime.bundle,
          runtimePaths,
        );
        expect(runtimeSnapshot.entries.every((entry) => entry.exists)).toBe(true);
        const prepared = fixture.invoke(admitted.admissionArgs, 0, 'run-admission-prepared');
        expect(prepared.status).toBe('prepared');
        const preparedActions = requireNextActions(prepared);
        const preparedVersion = requireStateVersion(prepared.state_version);
        expect(preparedActions.length).toBeGreaterThan(1);
        const expected = (version: StateVersion) => [
          '--expected-revision',
          String(version.revision),
          '--expected-digest',
          version.digest,
        ];
        const databaseRelativePath = path.relative(root, sessionHandoffDatabasePath(root, config));
        const workspaceId = deriveWorkspaceId(config.repository.repository_id, root);
        const beforeRenewal = inspectHostWorkspaceDatabase(root, databaseRelativePath, workspaceId);
        const beforeWork = beforeRenewal.work[0];
        const beforeJournal = beforeRenewal.journals[0];
        assert.ok(beforeWork?.state.lease && beforeJournal);
        const preparedWorkId = beforeWork.identity.work_id;
        expect(beforeJournal.version).toEqual(preparedVersion);
        const retirementRequestRef = 'unissued-retirement-inspect.json';
        const retirementRequestPath = path.join(root, retirementRequestRef);
        const retirementRequestBytes = Buffer.from(
          JSON.stringify({ identity: beforeWork.identity, attempt: beforeJournal.attempt }),
        );
        const retirementInspectArgs = [
          '--retire-interrupted-source-owner',
          'true',
          '--mode',
          'inspect',
          '--project-root',
          root,
          '--native-session-handle',
          admitted.nativeSessionHandle,
          '--request',
          retirementRequestRef,
        ];
        writeFileSync(retirementRequestPath, retirementRequestBytes);
        await assert.rejects(run(retirementInspectArgs), {
          message: 'Interrupted Source retirement requires one exact pending Source issue',
        });
        expect(readFileSync(retirementRequestPath)).toEqual(retirementRequestBytes);
        expect(inspectHostWorkspaceDatabase(root, databaseRelativePath, workspaceId)).toEqual(beforeRenewal);
        const incompleteWitnessDirectory = path.join(root, '.agent', 'cutover', 'uncompleted-witness');
        expect(existsSync(incompleteWitnessDirectory)).toBe(false);
        await assert.rejects(
          run([
            ...admitted.args,
            '--export-staged-witness',
            'uncompleted-witness',
            '--payload-manifest-sha256',
            'a'.repeat(64),
          ]),
          { message: 'staged runtime witness: journal identity or checksum differs' },
        );
        expect(existsSync(incompleteWitnessDirectory)).toBe(false);
        expect(inspectHostWorkspaceDatabase(root, databaseRelativePath, workspaceId)).toEqual(beforeRenewal);
        const inspectedPrepared = requireRecord(
          await runSuccessfully([...admitted.args, '--inspect', 'true']),
          'prepared attempt public inspection',
        );
        expect(inspectedPrepared).toMatchObject({
          schema: 'VidaLocalSessionInspection/v1',
          status: 'inspected',
          work_id: preparedWorkId,
          attempt: 1,
          journal_version: preparedVersion,
          work_version: beforeWork.version,
          ledger_version: beforeRenewal.ledger_version,
          lease: beforeWork.state.lease,
        });
        expect(inspectHostWorkspaceDatabase(root, databaseRelativePath, workspaceId)).toEqual(beforeRenewal);
        const resumedPrepared = requireRecord(
          await runSuccessfully(admitted.args),
          'persisted prepared attempt public re-entry',
        );
        assert.ok(beforeJournal.state.source_scope && preparedActions[0]);
        expect(resumedPrepared).toMatchObject({
          status: 'resumed',
          workflow: preparedActions[0].request.workflow_id,
          mastra_run_id: beforeJournal.state.run_id,
          mastra_step_id: beforeJournal.state.step_id,
          state_version: preparedVersion,
          source_snapshot_digest: beforeJournal.state.source_scope.digest,
          reconciliation_required: null,
          issued_actions: [],
          completed_observations: [],
        });
        expect(parseTestRunPayload(resumedPrepared)).toEqual({ ...prepared, status: 'resumed' });
        expect(inspectHostWorkspaceDatabase(root, databaseRelativePath, workspaceId)).toEqual(beforeRenewal);
        const renewalArgs = [
          ...admitted.args,
          ...expected(preparedVersion),
          '--renew-lease',
          'true',
          '--native-session-handle',
          admitted.nativeSessionHandle,
          '--lease-generation',
          String(beforeWork.state.lease.generation),
        ];
        for (const [flag, value] of [
          ['--native-session-handle', admitted.nativeSessionHandle + '-foreign'],
          ['--lease-generation', String(beforeWork.state.lease.generation + 1)],
        ] as const) {
          const changed = renewalArgs.map((entry, index) => (renewalArgs[index - 1] === flag ? value : entry));
          await assert.rejects(run(changed), /lease renewal owner, fencing identity or live expiry differs/);
          expect(inspectHostWorkspaceDatabase(root, databaseRelativePath, workspaceId)).toEqual(beforeRenewal);
        }
        const renewed = requireRecord(await run(renewalArgs), 'lease renewal inspection');
        expect(renewed).toMatchObject({
          schema: 'VidaLocalSessionInspection/v1',
          status: 'inspected',
          work_id: preparedWorkId,
          attempt: 1,
          lease: {
            ticket_id: beforeWork.state.lease.ticket_id,
            thread_id: admitted.nativeSessionHandle,
            generation: beforeWork.state.lease.generation,
          },
        });
        const renewedVersion = requireStateVersion(renewed.journal_version as StateVersion | undefined);
        expect(renewedVersion).toEqual({ revision: preparedVersion.revision + 1, digest: preparedVersion.digest });
        const afterRenewal = inspectHostWorkspaceDatabase(root, databaseRelativePath, workspaceId);
        const afterWork = afterRenewal.work[0];
        const afterJournal = afterRenewal.journals[0];
        assert.ok(afterWork?.state.lease && afterJournal);
        const beforeTicket = beforeRenewal.ledger?.tickets.find(
          (ticket) => ticket.ticket_id === beforeWork.state.lease?.ticket_id,
        );
        const afterTicket = afterRenewal.ledger?.tickets.find(
          (ticket) => ticket.ticket_id === afterWork.state.lease?.ticket_id,
        );
        assert.ok(beforeTicket?.expires_at && afterTicket?.expires_at);
        expect(afterWork.version).not.toEqual(beforeWork.version);
        expect(afterRenewal.ledger_version).not.toEqual(beforeRenewal.ledger_version);
        expect(afterWork.state.lease).toEqual(beforeWork.state.lease);
        expect(Date.parse(afterTicket.expires_at)).toBeGreaterThan(Date.parse(beforeTicket.expires_at));
        expect(afterJournal).toEqual({ ...beforeJournal, version: renewedVersion });
        expect(afterRenewal.admission_attempts).toEqual(beforeRenewal.admission_attempts);
        expect(renewed.work_version).toEqual(afterWork.version);
        expect(renewed.ledger_version).toEqual(afterRenewal.ledger_version);
        expect(renewed.journal_version).toEqual(afterJournal.version);
        expect(afterJournal.state.source_scope).toEqual(beforeJournal.state.source_scope);
        const preservedScope = beforeJournal.state.source_scope;
        assert.ok(preservedScope);
        expect(preservedScope.entries.find((entry) => entry.path === 'AGENT.sidecar.md')).toMatchObject({
          path: 'AGENT.sidecar.md',
          sha256: sourceEntry.sha256,
        });
        expect(preservedScope).toEqual(
          snapshotDeclaredSources(requireSafeRepositoryAccess(root), ['AGENT.sidecar.md']),
        );
        const intakeReference = afterWork.state.artifacts.find((entry) => entry.artifact_id === 'local-session-intake');
        assert.ok(intakeReference);
        const intakeFile = path.join(root, intakeReference.path);
        const originalIntakeBytes = readFileSync(intakeFile);
        const malformedIntakeBytes = Buffer.from('[]');
        const malformedIntakeWork: WorkState = {
          ...afterWork.state,
          artifacts: afterWork.state.artifacts.map((entry) =>
            entry.artifact_id === 'local-session-intake'
              ? {
                  ...entry,
                  sha256: createHash('sha256').update(malformedIntakeBytes).digest('hex'),
                }
              : entry,
          ),
        };
        const persistedWorkRowId = JSON.stringify([
          afterWork.identity.repository_id,
          afterWork.identity.project_ids,
          afterWork.identity.integrations_digest,
          afterWork.identity.work_id,
        ]);
        const updatePersistedWork = (expectedVersion: StateVersion, next: WorkState): void => {
          const database = openAdmittedWorkspaceDatabase(root, databaseRelativePath, workspaceId, false);
          let outcome: DatabaseWorkOutcome<number>;
          try {
            const result = database
              .query(
                "UPDATE agent_host_state SET payload=?,digest=? WHERE workspace_id=? AND kind='work' AND id=? AND revision=? AND digest=?",
              )
              .run(
                canonicalJson(next),
                canonicalJsonDigest(next),
                workspaceId,
                persistedWorkRowId,
                expectedVersion.revision,
                expectedVersion.digest,
              );
            outcome = { ok: true, value: result.changes };
          } catch (error) {
            outcome = { ok: false, error };
          }
          expect(
            finishWorkspaceDatabaseClose(
              database,
              outcome,
              closeWorkspaceDatabaseWithAdmission,
              'Malformed intake Work reseal and database close failed',
            ),
          ).toBe(1);
        };
        let malformedIntakeRefusalVerified = false;
        try {
          writeFileSync(intakeFile, malformedIntakeBytes);
          updatePersistedWork(afterWork.version, malformedIntakeWork);
          const beforeMalformedIntake = inspectHostWorkspaceDatabase(root, databaseRelativePath, workspaceId);
          const persistedIntakeReference = beforeMalformedIntake.work[0]?.state.artifacts.find(
            (entry) => entry.artifact_id === 'local-session-intake',
          );
          assert.ok(persistedIntakeReference);
          const persistedIntakeBytes = readFileSync(intakeFile);
          expect(persistedIntakeBytes).toEqual(malformedIntakeBytes);
          expect(persistedIntakeBytes.length).toBeLessThanOrEqual(32768);
          expect(createHash('sha256').update(persistedIntakeBytes).digest('hex')).toBe(persistedIntakeReference.sha256);
          expect(JSON.parse(persistedIntakeBytes.toString('utf8'))).toEqual([]);
          await Promise.resolve(
            expect(
              run([
                ...admitted.args,
                ...expected(renewedVersion),
                '--renew-lease',
                'true',
                '--native-session-handle',
                admitted.nativeSessionHandle,
                '--lease-generation',
                String(afterWork.state.lease.generation),
              ]),
            ).rejects.toMatchObject({
              code: 'GAP-VIDA-RUN-CONTEXT-001',
              message: 'Current admitted intake changed.',
            }),
          );
          expect(inspectHostWorkspaceDatabase(root, databaseRelativePath, workspaceId)).toEqual(beforeMalformedIntake);
          malformedIntakeRefusalVerified = true;
        } finally {
          if (malformedIntakeRefusalVerified) {
            writeFileSync(intakeFile, originalIntakeBytes);
            updatePersistedWork(
              { revision: afterWork.version.revision, digest: canonicalJsonDigest(malformedIntakeWork) },
              afterWork.state,
            );
            expect(inspectHostWorkspaceDatabase(root, databaseRelativePath, workspaceId)).toEqual(afterRenewal);
          }
        }
        const sourceFile = path.join(root, 'AGENT.sidecar.md');
        const originalSourceBytes = readFileSync(sourceFile);
        try {
          writeFileSync(sourceFile, '# Changed after lease admission\n');
          await Promise.resolve(
            expect(
              run([
                ...admitted.args,
                ...expected(renewedVersion),
                '--renew-lease',
                'true',
                '--native-session-handle',
                admitted.nativeSessionHandle,
                '--lease-generation',
                String(afterWork.state.lease.generation),
              ]),
            ).rejects.toMatchObject({
              code: 'GAP-VIDA-RUN-CONTEXT-001',
              message: 'Lease renewal source changed outside issued writer authority.',
            }),
          );
          expect(inspectHostWorkspaceDatabase(root, databaseRelativePath, workspaceId)).toEqual(afterRenewal);
        } finally {
          writeFileSync(sourceFile, originalSourceBytes);
        }
        await assert.rejects(run(renewalArgs), /lease renewal journal CAS changed/);
        expect(inspectHostWorkspaceDatabase(root, databaseRelativePath, workspaceId)).toEqual(afterRenewal);
        const issued = fixture.invoke(
          [...admitted.args, ...expected(renewedVersion), '--issue-wave', 'true'],
          0,
          'run-issue-wave',
        );
        expect(issued.status).toBe('wave_issued');
        const issuedActions = requireIssuedActions(issued);
        const issuedVersion = requireStateVersion(issued.state_version);
        expect(issuedActions.map((item) => item.action.action_id)).toEqual(
          preparedActions.map((item) => item.request.action_id),
        );
        const beforeInvalidReports = inspectHostWorkspaceDatabase(root, databaseRelativePath, workspaceId);
        await assert.rejects(run([...admitted.args, ...expected(preparedVersion), '--issue-wave', 'true']), {
          code: 'GAP-VIDA-RUN-CONTEXT-001',
          message: 'The Mastra session ledger version is stale.',
        });
        expect(inspectHostWorkspaceDatabase(root, databaseRelativePath, workspaceId)).toEqual(beforeInvalidReports);
        const reportFile = path.join(root, 'report.json');
        for (const invalid of ['', '{', 'x'.repeat(32769)]) {
          writeFileSync(reportFile, invalid);
          await assert.rejects(run([...admitted.args, ...expected(issuedVersion), '--report', reportFile]), {
            code: 'GAP-VIDA-RUN-REPORT-001',
            message: 'Report file is unavailable or invalid.',
          });
          expect(inspectHostWorkspaceDatabase(root, databaseRelativePath, workspaceId)).toEqual(beforeInvalidReports);
        }
        writeFileSync(reportFile, '{}');
        const secondLink = path.join(root, 'report-hardlink.json');
        linkSync(reportFile, secondLink);
        expect(fixture.invoke([...admitted.args, ...expected(issuedVersion), '--report', reportFile], 1)).toMatchObject(
          {
            code: 'GAP-VIDA-RUN-REPORT-001',
            message:
              'The session report is missing, unsafe, oversized, or invalid JSON. Next action: inspect the exact work and check its issued contract before retrying.',
          },
        );
        unlinkSync(secondLink);
        expect(requireStateVersion(parseTestRunPayload(await runSuccessfully(admitted.args)).state_version)).toEqual(
          issuedVersion,
        );
        let version = issuedVersion;
        for (const item of issuedActions) {
          const action = item.action;
          if (typeof item.issue_id !== 'string') throw Error('issued action lacks its issue identity');
          const sourceId = `fixture-source-${action.action_order}`;
          const summary = researchFixtureSummary(action.action_order, sourceEntry.sha256);
          writeFileSync(
            reportFile,
            JSON.stringify({
              schema: 'VidaSessionObservation/v1',
              action_id: action.action_id,
              issue_id: item.issue_id,
              agent_id: `test-${action.action_order}`,
              tool_call_ref: `tool-${action.action_order}`,
              status: 'reported_complete',
              summary,
              output_digest: canonicalJsonDigest(summary),
              evidence_refs: [sourceId],
            }),
          );
          const reportArgs = [...admitted.args, ...expected(version), '--report', reportFile];
          const result =
            item === issuedActions[0]
              ? fixture.invoke(reportArgs)
              : parseTestRunPayload(await runSuccessfully(reportArgs));
          version = requireStateVersion(result.state_version);
          if (item === issuedActions.at(-1)) {
            expect(result.resume_status).toBe('ready');
            expect(requireNextActions(result)[0]?.request.wave_index).toBe(1);
            expect(requireIssuedActions(result)).toEqual([]);
            const observed = inspectHostWorkspaceDatabase(
              root,
              path.relative(root, sessionHandoffDatabasePath(root, config)),
              deriveWorkspaceId(config.repository.repository_id, root),
            );
            expect(observed.journals).toHaveLength(1);
            const journal = observed.journals[0];
            assert.ok(journal);
            expect(journal.version).toEqual(version);
            expect(
              journal.state.items.map((entry) => ({
                action_id: entry.request.action_id,
                issue_id: entry.issue_id,
                observation: entry.observation,
              })),
            ).toEqual(
              requireNextActions(result).map((entry) => ({
                action_id: entry.request.action_id,
                issue_id: null,
                observation: null,
              })),
            );
            const selected = observed.work[0];
            assert.ok(selected && observed.ledger_version);
            expect(observed.work).toHaveLength(1);
            expect(selected.state.execution.assignment_attempts).toEqual([]);
            const request = {
              schema: 'CompletedReadonlyReleaseRequest/v1',
              workspace_id: observed.workspace_id,
              identity: selected.identity,
              attempt: journal.attempt,
              expectedWork: selected.version,
              expectedLedger: observed.ledger_version,
              expectedJournal: journal.version,
              nativeSessionHandle: admitted.nativeSessionHandle,
              userRequestPointer: 'fixture:readonly-release-inspection',
              requestIntent: 'linked_correction',
            };
            const requestRef = 'readonly-request.json';
            const requestFile = path.join(root, requestRef);
            const requestBytes = Buffer.from(JSON.stringify(request));
            const planRef = `readonly-release-plan-${selected.identity.work_id}.json`;
            const planFile = path.join(root, planRef);
            const inspectDatabases = () =>
              [
                path.relative(root, sessionHandoffDatabasePath(root, config)),
                sessionBridgeDatabaseRelativePath(config),
              ].map((relative) => {
                const database = openAdmittedWorkspaceDatabase(root, relative, observed.workspace_id, true);
                let outcome: DatabaseWorkOutcome<ReturnType<ReturnType<typeof nativeDatabaseSnapshotReader>>>;
                try {
                  outcome = { ok: true, value: nativeDatabaseSnapshotReader(database)() };
                } catch (error) {
                  outcome = { ok: false, error };
                }
                return finishWorkspaceDatabaseClose(
                  database,
                  outcome,
                  closeWorkspaceDatabaseWithAdmission,
                  'Readonly release snapshot and database close failed',
                );
              });
            const databasesBefore = inspectDatabases();
            const releaseArgs = (mode: string) => [
              '--release-completed-readonly',
              'true',
              '--mode',
              mode,
              '--project-root',
              root,
              '--request',
              requestRef,
            ];
            const completedResearch = journal.state.completed.flatMap((wave) => wave.items);
            expect(completedResearch).toHaveLength(issuedActions.length);
            expect(completedResearch.every((item) => item.research_activation && item.research_normalization)).toBe(
              true,
            );
            expect(journal.attempt).toBe(beforeJournal.attempt);
            await assert.rejects(run(retirementInspectArgs), {
              message: 'Interrupted Source retirement requires one exact pending Source issue',
            });
            expect(readFileSync(retirementRequestPath)).toEqual(retirementRequestBytes);
            expect(inspectDatabases()).toEqual(databasesBefore);
            const staleJournal = { ...request.expectedJournal, revision: request.expectedJournal.revision - 1 };
            for (const [mode, changed, message] of [
              ['inspect', request, 'Readonly release actual accepted readonly action differs'],
              ['plan', request, 'Readonly release actual accepted readonly action differs'],
              [
                'inspect',
                { ...request, expectedJournal: staleJournal },
                'Readonly release journal identity/CAS differs',
              ],
              [
                'inspect',
                { ...request, identity: { ...request.identity, project_ids: [] } },
                'Readonly release identity differs',
              ],
            ] as const) {
              const changedBytes = changed === request ? requestBytes : Buffer.from(JSON.stringify(changed));
              writeFileSync(requestFile, changedBytes);
              await assert.rejects(
                run(releaseArgs(mode)),
                (error: unknown) => error instanceof Error && error.message === message,
              );
              expect(readFileSync(requestFile)).toEqual(changedBytes);
              expect(inspectDatabases()).toEqual(databasesBefore);
              expect(existsSync(planFile)).toBe(false);
            }
          }
        }
        const originalReportBytes = readFileSync(reportFile);
        const submittedObservation = requireRecord(
          parseJsonUnknown(originalReportBytes.toString('utf8')),
          'last accepted session report',
        );
        const inspectClaimProjection = () => {
          const observed = inspectHostWorkspaceDatabase(root, databaseRelativePath, workspaceId);
          return {
            work: observed.work,
            ledger: observed.ledger,
            ledger_version: observed.ledger_version,
            journals: observed.journals,
            admission_attempts: observed.admission_attempts,
          };
        };
        const beforeExactRetry = inspectClaimProjection();
        const exactRetry = parseTestRunPayload(
          await runSuccessfully([...admitted.args, ...expected(version), '--report', reportFile]),
        );
        expect(exactRetry.status).toBe('report_retrieved');
        expect(exactRetry.recorded_observation).toEqual(submittedObservation);
        expect(requireStateVersion(exactRetry.state_version)).toEqual(version);
        expect(inspectClaimProjection()).toEqual(beforeExactRetry);

        const originalSummary = submittedObservation.summary;
        if (typeof originalSummary !== 'string') throw new Error('last accepted report summary is invalid');
        const conflictingSummary = `${originalSummary}!`;
        const conflictingReport = {
          ...submittedObservation,
          summary: conflictingSummary,
          output_digest: canonicalJsonDigest(conflictingSummary),
        };
        try {
          writeFileSync(reportFile, JSON.stringify(conflictingReport));
          await assert.rejects(run([...admitted.args, ...expected(version), '--report', reportFile]), /retry differs/);
          expect(inspectClaimProjection()).toEqual(beforeExactRetry);
        } finally {
          writeFileSync(reportFile, originalReportBytes);
        }
        const beforeExpiredRecovery = inspectClaimProjection();
        const recoveryWork = beforeExpiredRecovery.work[0];
        const recoveryJournal = beforeExpiredRecovery.journals[0];
        assert.ok(recoveryWork?.state.lease && beforeExpiredRecovery.ledger && recoveryJournal);
        const recoveryLease = recoveryWork.state.lease;
        const recoveryTicket = beforeExpiredRecovery.ledger.tickets.find(
          (ticket) => ticket.ticket_id === recoveryLease.ticket_id,
        );
        assert.ok(recoveryTicket?.expires_at);
        const recoveryClaims = beforeExpiredRecovery.ledger.claims.filter(
          (claim) => claim.ticket_id === recoveryLease.ticket_id && claim.status === 'active',
        );
        expect(recoveryClaims).toHaveLength(1);
        expect(recoveryClaims[0]).toMatchObject({
          work_id: recoveryWork.identity.work_id,
          thread_id: recoveryLease.thread_id,
          generation: recoveryLease.generation,
          lease_expires_at: recoveryTicket.expires_at,
        });
        expect(recoveryWork.state.lifecycle.phase).toBe('INTAKE');
        expect(recoveryWork.state.execution.assignment_attempts).toEqual([]);
        expect(recoveryJournal.state.completed.length).toBeGreaterThan(0);
        expect(
          recoveryJournal.state.completed.every(
            (wave) =>
              wave.items.length > 0 &&
              wave.items.every(
                (item) =>
                  item.issue_id !== null &&
                  item.observation?.status === 'reported_complete' &&
                  item.host_reservation === undefined,
              ),
          ),
        ).toBe(true);
        expect(recoveryJournal.state.items.length).toBeGreaterThan(0);
        expect(
          recoveryJournal.state.items.every(
            (item) => item.issue_id === null && item.observation === null && item.host_reservation === undefined,
          ),
        ).toBe(true);
        expect(
          recoveryWork.state.lifecycle.references.some(
            (reference) =>
              reference.kind === 'execution_approval' &&
              reference.disposition === 'current' &&
              reference.decision === 'approved',
          ),
        ).toBe(false);
        const recoveryScope = recoveryJournal.state.source_scope;
        assert.ok(recoveryScope);
        const recoveryExpiresAt = Date.parse(recoveryTicket.expires_at) + 1;
        expect(Number.isFinite(recoveryExpiresAt)).toBe(true);
        try {
          setSystemTime(new Date(recoveryExpiresAt));
          await assert.rejects(
            run([
              ...admitted.args,
              ...expected(recoveryJournal.version),
              '--recover-expired-lease',
              'true',
              '--rebind-current-bundle',
              'true',
              '--native-session-handle',
              admitted.nativeSessionHandle,
              '--lease-generation',
              String(recoveryLease.generation),
            ]),
            (error: unknown) => {
              expect(error).toMatchObject({
                code: 'GAP-VIDA-RUN-CONTEXT-001',
                message: 'Expired recovery requires the existing attributable source authority.',
              });
              return true;
            },
          );
          expect(inspectClaimProjection()).toEqual(beforeExpiredRecovery);

          const nullSourceScopeJournal = { ...recoveryJournal.state, source_scope: null };
          const journalDatabase = openAdmittedWorkspaceDatabase(root, databaseRelativePath, workspaceId, false);
          let resealOutcome: DatabaseWorkOutcome<number>;
          try {
            const update = journalDatabase
              .query(
                'UPDATE agent_host_mastra_session_ledger SET revision=?,payload=?,digest=? WHERE workspace_id=? AND work_id=? AND attempt=? AND revision=? AND digest=?',
              )
              .run(
                recoveryJournal.version.revision + 1,
                canonicalJson(nullSourceScopeJournal),
                canonicalJsonDigest(nullSourceScopeJournal),
                workspaceId,
                recoveryWork.identity.work_id,
                recoveryJournal.state.attempt,
                recoveryJournal.version.revision,
                recoveryJournal.version.digest,
              );
            resealOutcome = { ok: true, value: update.changes };
          } catch (error) {
            resealOutcome = { ok: false, error };
          }
          expect(
            finishWorkspaceDatabaseClose(
              journalDatabase,
              resealOutcome,
              closeWorkspaceDatabaseWithAdmission,
              'Null source-scope Journal reseal and database close failed',
            ),
          ).toBe(1);
          const nullSourceScopeVersion = {
            revision: recoveryJournal.version.revision + 1,
            digest: canonicalJsonDigest(nullSourceScopeJournal),
          };
          const beforeNullSourceScopeRecovery = inspectClaimProjection();
          expect(beforeNullSourceScopeRecovery.journals[0]?.version).toEqual(nullSourceScopeVersion);
          expect(beforeNullSourceScopeRecovery.journals[0]?.state.source_scope).toBeNull();
          await assert.rejects(
            run([
              ...admitted.args,
              ...expected(nullSourceScopeVersion),
              '--recover-expired-lease',
              'true',
              '--rebind-current-bundle',
              'true',
              '--native-session-handle',
              admitted.nativeSessionHandle,
              '--lease-generation',
              String(recoveryLease.generation),
            ]),
            (error: unknown) => {
              expect(error).toMatchObject({
                code: 'GAP-VIDA-RUN-CONTEXT-001',
                message: 'Expired recovery source scope is unavailable.',
              });
              return true;
            },
          );
          expect(inspectClaimProjection()).toEqual(beforeNullSourceScopeRecovery);
        } finally {
          setSystemTime();
        }
        completed = true;
      } finally {
        if (completed && !fixture.hasUnknown()) rmSync(root, { recursive: true, force: true });
        else
          process.stderr.write(
            `Retained ${fixture.hasUnknown() ? 'uncertain' : 'failed'} public run fixture: ${root}\n`,
          );
      }
    }, 60_000);

    test('inspects completed task_execution readonly owner against the suspended configured frontier', async () => {
      let root: string | undefined;
      let completed = false;
      let pendingIssue = false;
      try {
        const fixture = await createInitialSourceWorkFixture({ onRoot: (value) => (root = value) });
        const f = fixture;
        await withWorkspaceDatabaseCloseAsync(
          f,
          async () => {
            assert.ok(f.store && f.ledger && f.bridge);
            const input = admittedInput(f);
            await bindControlledRuntimeInitialization(f.root, f.config, f.store);
            const args = initialSourceRunArguments(f);
            const beforeIssue = f.ledger.resume(f.identity.work_id, 1);
            assert.ok(beforeIssue);
            expect(beforeIssue.state.items.map((item) => item.request.stage_id)).toEqual(['synthesize_task']);
            const expected = (version: StateVersion) => [
              '--expected-revision',
              String(version.revision),
              '--expected-digest',
              version.digest,
            ];
            pendingIssue = true;
            const issued = parseTestRunPayload(
              await runSuccessfully([...args, ...expected(beforeIssue.version), '--issue-wave', 'true']),
            );
            expect(issued.status).toBe('wave_issued');
            const actions = requireIssuedActions(issued);
            expect(actions).toHaveLength(1);
            const action = actions[0]!;
            assert.ok(typeof action.issue_id === 'string');
            expect(action.request.stage_id).toBe('synthesize_task');
            const stage = f.config.workflows.task_execution?.stages.find(
              (entry) => entry.id === action.request.stage_id,
            );
            assert.ok(stage);
            expect(stage.produces).not.toContain('ResearchResult/v1');
            expect(stage.produces).not.toContain('ResearchSynthesis/v1');
            const summary = 'Controlled readonly task synthesis; no external dispatch';
            const report: SessionBridgeObservation = {
              schema: 'VidaSessionObservation/v1',
              action_id: action.request.action_id,
              issue_id: action.issue_id,
              agent_id: 'fixture:readonly-synthesizer',
              tool_call_ref: 'fixture:readonly-synthesis',
              status: 'reported_complete',
              summary,
              output_digest: canonicalJsonDigest(summary),
              evidence_refs: ['local://fixture/readonly-synthesis'],
            };
            const reportPath = path.join(f.root, 'readonly-synthesis-report.json');
            writeFileSync(reportPath, JSON.stringify(report), { flag: 'wx' });
            const reported = parseTestRunPayload(
              await runSuccessfully([
                ...args,
                ...expected(requireStateVersion(issued.state_version)),
                '--report',
                reportPath,
              ]),
            );
            expect(reported.resume_status).toBe('ready');
            pendingIssue = false;
            const databaseRelative = path.relative(f.root, sessionHandoffDatabasePath(f.root, f.config));
            const workspaceId = deriveWorkspaceId(f.config.repository.repository_id, f.root);
            const before = inspectHostWorkspaceDatabase(f.root, databaseRelative, workspaceId);
            expect(before.work).toHaveLength(1);
            expect(before.journals).toHaveLength(1);
            const selected = before.work[0]!;
            const journal = before.journals[0]!;
            const observed = journal.state.completed.flatMap((wave) => wave.items);
            expect(observed).toHaveLength(1);
            expect(observed[0]!.issue_id).toBe(action.issue_id);
            expect(observed[0]!.observation).toEqual(report);
            expect(observed[0]!.host_reservation).toBeUndefined();
            expect(observed[0]!.research_activation).toBeUndefined();
            expect(observed[0]!.research_normalization).toBeUndefined();
            expect(selected.state.execution.assignment_attempts).toEqual([]);
            expect(journal.state.items.length).toBeGreaterThan(0);
            expect(journal.state.items.every((item) => item.issue_id === null && item.observation === null)).toBe(true);
            const engineBefore = await f.bridge.snapshot();
            assert.ok(engineBefore);
            expect(engineBefore.status).toBe('suspended');
            expect(engineBefore.step_id).toBe(journal.state.step_id);
            expect(engineBefore.requests).toEqual(journal.state.items.map((item) => item.request));
            assert.ok(before.ledger_version);
            const request = {
              schema: 'CompletedReadonlyReleaseRequest/v1',
              workspace_id: workspaceId,
              identity: selected.identity,
              attempt: journal.attempt,
              expectedWork: selected.version,
              expectedLedger: before.ledger_version,
              expectedJournal: journal.version,
              nativeSessionHandle: input.nativeSessionHandle,
              userRequestPointer: 'fixture:completed-readonly-inspect',
              requestIntent: 'linked_correction',
            };
            const requestPath = path.join(f.root, 'readonly-release-request.json');
            const requestBytes = Buffer.from(JSON.stringify(request));
            writeFileSync(requestPath, requestBytes, { flag: 'wx' });
            const inspectArgs = [
              '--release-completed-readonly',
              'true',
              '--mode',
              'inspect',
              '--project-root',
              f.root,
              '--request',
              'readonly-release-request.json',
            ];
            const result = requireRecord(await runSuccessfully(inspectArgs), 'Readonly release inspection');
            expect(result.status).toBe('readonly_release_inspected');
            expect(result.rights_granted).toBe(false);
            assert.ok(typeof result.plan_ref === 'string');
            expect(existsSync(path.join(f.root, result.plan_ref))).toBe(false);
            expect(readFileSync(requestPath)).toEqual(requestBytes);
            expect(inspectHostWorkspaceDatabase(f.root, databaseRelative, workspaceId)).toEqual(before);
            expect(await f.bridge.snapshot()).toEqual(engineBefore);
            try {
              for (const field of ['expectedWork', 'expectedLedger'] as const) {
                writeFileSync(
                  requestPath,
                  JSON.stringify({ ...request, [field]: { ...request[field], revision: request[field].revision + 1 } }),
                );
                await assert.rejects(run(inspectArgs), { message: 'Readonly release work/ledger CAS differs' });
                expect(inspectHostWorkspaceDatabase(f.root, databaseRelative, workspaceId)).toEqual(before);
                expect(await f.bridge.snapshot()).toEqual(engineBefore);
                expect(existsSync(path.join(f.root, result.plan_ref))).toBe(false);
              }
            } finally {
              writeFileSync(requestPath, requestBytes);
            }
            expect(readFileSync(requestPath)).toEqual(requestBytes);
          },
          (owner) => owner.close(),
          'Readonly inspection operation and fixture close failed',
        );
        completed = true;
      } finally {
        if (root && completed && !pendingIssue) rmSync(root, { recursive: true, force: true });
        else if (root) process.stderr.write(`Retained readonly release inspection fixture: ${root}\n`);
      }
    }, 60_000);

    test('persists maintained synthesis and issues the configured developer frontier without dispatch', async () => {
      let root: string | undefined;
      let fixture: Awaited<ReturnType<typeof createInitialSourceWorkFixture>> | undefined;
      let sessionLedger: ReturnType<typeof openConfiguredMastraSessionLedger> | undefined;
      let completed = false;
      let pendingNativeIssue = false;
      const failures: unknown[] = [];
      try {
        fixture = await createInitialSourceWorkFixture({
          researchSynthesis: true,
          configure: (config) => {
            const contextSource = config.knowledge.sources.find((source) => source.id === 'project-context');
            if (!contextSource || contextSource.kind !== 'local' || contextSource.location !== 'AGENT.sidecar.md')
              throw new Error('Configured context fixture source must be its owned AGENT.sidecar.md file');
            const productContextSource = {
              ...contextSource,
              id: 'project-product-context',
              location: 'docs/PRODUCT.md',
            };
            const taskWorkflow = config.workflows.task_execution;
            if (!taskWorkflow) throw new Error('Configured context fixture task workflow is unavailable');
            let developerStages = 0;
            const stages = taskWorkflow.stages.map((stage) => {
              if (stage.id !== 'develop_task') return stage;
              developerStages += 1;
              return { ...stage, context_source_ids: [contextSource.id, productContextSource.id] };
            });
            if (developerStages !== 1) throw new Error('Configured context fixture developer stage is ambiguous');
            return {
              ...config,
              knowledge: {
                ...config.knowledge,
                sources: [...config.knowledge.sources, productContextSource],
              },
              workflows: {
                ...config.workflows,
                task_execution: { ...taskWorkflow, stages },
              },
            };
          },
          onRoot: (value) => (root = value),
        });
        const sourceFixture = fixture;
        const input = admittedInput(sourceFixture);
        assert.ok(sourceFixture.store && sourceFixture.bridge && sourceFixture.ledger);
        const configuredSynthesis = sourceFixture.config.workflows.task_execution?.stages.find(
          (stage) => stage.id === 'synthesize_task',
        );
        assert.ok(configuredSynthesis);
        expect(configuredSynthesis.produces).toContain('ResearchSynthesis/v1');
        await bindControlledRuntimeInitialization(sourceFixture.root, sourceFixture.config, sourceFixture.store);
        const produced = await prepareNativeUnnormalizedSynthesis(sourceFixture, {
          stopBeforeSynthesisReport: true,
        });
        expect(produced.originalItem.request.stage_id).toBe('synthesize_task');
        expect(produced.originalItem.observation).toBeNull();
        const synthesisActivation = produced.originalItem.research_activation;
        assert.ok(synthesisActivation);
        expect(produced.validatedSynthesis.schema).toBe('ResearchSynthesis/v1');
        expect(produced.validatedSynthesis.bundle_id).toBe(
          `synthesis-${produced.originalItem.request.action_id.slice(0, 40)}`,
        );
        expect(produced.validatedSynthesis.created_at).toBe(synthesisActivation.use.timestamp);
        expect(produced.validatedSynthesis.updated_at).toBe(synthesisActivation.use.timestamp);

        const projectId = sourceFixture.identity.project_ids[0];
        assert.ok(projectId);
        const args = initialSourceRunArguments(sourceFixture);
        const expected = (version: StateVersion) => [
          '--expected-revision',
          String(version.revision),
          '--expected-digest',
          version.digest,
        ];
        const reportPath = path.join(
          sourceFixture.root,
          '.agent/work',
          sourceFixture.identity.work_id,
          'synthesis-report.json',
        );
        writeFileSync(reportPath, JSON.stringify(produced.synthesisReport));
        const reportBytes = readFileSync(reportPath);
        expect(reportBytes.length).toBeLessThanOrEqual(32 * 1024);
        const reportArguments = [...args, ...expected(produced.journal.version), '--report', reportPath];
        const ownerToClose = fixture;
        fixture = undefined;
        await ownerToClose.close();
        const reportedRaw = requireRecord(await runSuccessfully(reportArguments), 'Public synthesis report result');
        const reported = parseTestRunPayload(reportedRaw);
        expect(reported.status).toBe('resumed');
        expect(requireIssuedActions(reported)).toHaveLength(0);
        assert.ok(Array.isArray(reportedRaw.completed_observations));
        expect(reportedRaw.completed_observations).toContainEqual(produced.synthesisReport);

        sessionLedger = openConfiguredMastraSessionLedger(sourceFixture.root);
        const reportedWork = sessionLedger.hostState.readHostStateSnapshot(sourceFixture.identity).work;
        assert.ok(reportedWork);
        const publicInput = {
          args,
          publicRun: runSuccessfully,
          sync: () => sessionLedger?.resume(sourceFixture.identity.work_id, 1) ?? null,
          repositoryRoot: sourceFixture.root,
          workId: sourceFixture.identity.work_id,
          attempt: 1,
          work: reportedWork,
        };
        const beforePrewriter = sessionLedger.resume(sourceFixture.identity.work_id, 1);
        assert.ok(beforePrewriter);
        expect(beforePrewriter.state.items.length).toBeGreaterThan(0);
        expect(
          beforePrewriter.state.items.every(
            (item) =>
              item.request.stage_id === 'review_source_prewrite' &&
              item.request.workflow_id === 'task_execution' &&
              item.issue_id === null &&
              item.host_reservation === undefined,
          ),
        ).toBe(true);
        const prepared = await runSourcePrewriterPublicActions(publicInput);
        expect(prepared.state.items.some((item) => item.request.stage_id === 'develop_task')).toBe(true);
        expect(
          prepared.state.items.every((item) => item.issue_id === null && item.host_reservation === undefined),
        ).toBe(true);
        const current = sessionLedger.resume(sourceFixture.identity.work_id, 1);
        assert.ok(current);
        expect(current.state.items).toEqual(prepared.state.items);
        const ledgerToClose = sessionLedger;
        sessionLedger = undefined;
        ledgerToClose.close();

        const databaseRelativePath = sessionHandoffDatabaseRelativePath(sourceFixture.config);
        const workspaceId = deriveWorkspaceId(sourceFixture.config.repository.repository_id, sourceFixture.root);
        const inspected = inspectHostWorkspaceDatabase(sourceFixture.root, databaseRelativePath, workspaceId);
        const persistedWork = inspected.work.find(
          (entry) => entry.identity.work_id === sourceFixture.identity.work_id,
        )?.state;
        const persistedJournal = inspected.journals.find(
          (entry) => entry.work_id === sourceFixture.identity.work_id && entry.attempt === 1,
        )?.state;
        const persistedLedger = inspected.ledger;
        assert.ok(persistedWork && persistedJournal && persistedLedger);
        const priorWriterLease = persistedWork.lease;
        assert.ok(priorWriterLease);
        const priorWriterTicket = persistedLedger.tickets.find(
          (ticket) => ticket.ticket_id === priorWriterLease.ticket_id,
        );
        assert.ok(priorWriterTicket);
        expect(priorWriterTicket.status).toBe('active');
        expect(priorWriterTicket.thread_id).toBe(priorWriterLease.thread_id);
        expect(priorWriterTicket.generation).toBe(priorWriterLease.generation);
        expect(priorWriterTicket.source_revision).toBe(persistedWork.binding.work_source_revision);
        expect(persistedWork.binding.work_source_revision).toBe(sourceFixture.originalSource.digest);
        const writerResources = [
          ...persistedWork.binding.implementation_paths.map((implementationPath) => 'file:' + implementationPath),
          ...priorWriterTicket.exclusive_resources.filter((resource) => !resource.startsWith('file:')),
        ].sort();
        expect(priorWriterTicket.exclusive_resources.some((resource) => resource.startsWith('file:'))).toBe(false);
        const completedSynthesis = persistedJournal.completed
          .flatMap((wave) => wave.items)
          .find((item) => item.request.action_id === produced.originalItem.request.action_id);
        assert.ok(completedSynthesis);
        expect(completedSynthesis.observation).toEqual(produced.synthesisReport);
        const plan = completedSynthesis.research_normalization;
        assert.ok(plan);
        expect(plan.schema).toBe('ObservedSynthesisRecordPlan/v1');
        expect(plan.observation_digest).toBe(canonicalJsonDigest(produced.synthesisReport));
        expect(plan.result_digest).toBe(produced.validatedSynthesis.digest);
        expect(typeof plan.record_path).toBe('string');
        expect(plan.record_path.length).toBeGreaterThan(0);
        expect(typeof plan.record_sha256).toBe('string');
        expect(plan.record_sha256).toMatch(/^[a-f0-9]{64}$/u);
        expect(plan.record_path.startsWith(sourceFixture.config.research_decision.paths.research_records + '/')).toBe(
          true,
        );
        expect(plan.record_path.endsWith('.synthesis.json')).toBe(true);
        const synthesisArtifacts = persistedWork.artifacts.filter(
          (artifact) =>
            artifact.schema === produced.validatedSynthesis.schema &&
            artifact.stage_id === 'synthesize_task' &&
            artifact.path === plan.record_path &&
            artifact.sha256 === plan.record_sha256,
        );
        expect(synthesisArtifacts).toHaveLength(1);
        const synthesisArtifact = synthesisArtifacts[0];
        assert.ok(synthesisArtifact);
        expect(synthesisArtifact.artifact_id).toBe(produced.validatedSynthesis.bundle_id);
        const synthesisBytes = readFileSync(path.join(sourceFixture.root, synthesisArtifact.path));
        expect(synthesisBytes.length).toBeLessThanOrEqual(64 * 1024);
        expect(createHash('sha256').update(synthesisBytes).digest('hex')).toBe(plan.record_sha256);
        expect(JSON.parse(synthesisBytes.toString('utf8'))).toEqual(produced.validatedSynthesis);
        expect(persistedJournal.items.some((item) => item.request.stage_id === 'develop_task')).toBe(true);
        expect(
          persistedJournal.items.every((item) => item.issue_id === null && item.host_reservation === undefined),
        ).toBe(true);
        expect(
          persistedJournal.completed
            .flatMap((wave) => wave.items)
            .some((item) => item.request.stage_id === 'develop_task' && item.issue_id !== null),
        ).toBe(false);
        expect(readFileSync(reportPath)).toEqual(reportBytes);

        const developerItem = persistedJournal.items.find((item) => item.request.stage_id === 'develop_task');
        assert.ok(developerItem);
        const implementationPaths = reportedWork.lifecycle.scope.implementation_paths;
        expect(implementationPaths.length).toBeGreaterThan(0);
        const implementationBytes = implementationPaths.map(
          (implementationPath) =>
            [implementationPath, readFileSync(path.join(sourceFixture.root, implementationPath))] as const,
        );
        const contextSourceBytes = readFileSync(path.join(sourceFixture.root, 'AGENT.sidecar.md'));
        const productContextBytes = readFileSync(path.join(sourceFixture.root, 'docs/PRODUCT.md'));
        const contextSourceSha256 = createHash('sha256').update(contextSourceBytes).digest('hex');
        const productContextSha256 = createHash('sha256').update(productContextBytes).digest('hex');
        const issueArgs = [...args, ...expected(current.version), '--issue-wave', 'true'];
        pendingNativeIssue = true;
        const issuedValue = await runSuccessfully(issueArgs);
        const issueResponsePath = path.join(
          sourceFixture.root,
          '.agent/work',
          sourceFixture.identity.work_id,
          'developer-issue-return.json',
        );
        const issueResponseBytes = `${JSON.stringify(issuedValue, null, 2)}\n`;
        if (Buffer.byteLength(issueResponseBytes) > 32 * 1024)
          throw new Error('Public developer issue response exceeds the bounded retained evidence size');
        writeDurable(issueResponsePath, issuedValue);
        const issuedRaw = requireRecord(issuedValue, 'Public developer issue result');
        const issued = parseTestRunPayload(issuedRaw);
        expect(issued.status).toBe('wave_issued');
        const issuedActions = requireIssuedActions(issued);
        expect(issuedActions).toHaveLength(1);
        const issuedDeveloper = issuedActions[0];
        assert.ok(issuedDeveloper);
        const developerIssueId = issuedDeveloper.issue_id;
        assert.ok(typeof developerIssueId === 'string');
        const developerHostAttemptId = issuedDeveloper.host_attempt_id;
        assert.ok(typeof developerHostAttemptId === 'string');
        expect(issuedDeveloper.request).toEqual(developerItem.request);
        expect(issuedDeveloper.request.schema).toBe('VidaSessionRequest/v1');
        expect(issuedDeveloper.request.run_id).toBe(current.state.run_id);
        expect(issuedDeveloper.request.action_id).toBe(developerItem.request.action_id);
        expect(issuedDeveloper.request.workflow_id).toBe('task_execution');
        expect(issuedDeveloper.request.stage_id).toBe('develop_task');
        expect(issuedDeveloper.request.scope_digest).toBe(sourceFixture.originalSource.digest);
        expect(issuedDeveloper.request.assignment_index).toBe(0);
        expect(issuedDeveloper.action.stage_kind).toBe('develop');
        expect(issuedDeveloper.action.role).toBe('developer-orchestrator');
        expect(issuedDeveloper.action.mutation_scope).toBe('repository_source');
        expect(issuedDeveloper.action.resolved_profile.profile_id).toBe('executor');
        expect(issuedDeveloper.action.resolved_profile.mutation_scope).toBe('repository_source');
        expect(issuedDeveloper.action.consumes).toEqual(['DevelopmentTaskPacket/v1']);
        expect(issuedDeveloper.action.produces).toEqual(['ImplementationResult/v1']);
        const developerContext = issuedDeveloper.configured_context;
        assert.ok(developerContext);
        expect(developerContext.schema).toBe('ConfiguredContext/v1');
        expect(developerContext.work_id).toBe(sourceFixture.identity.work_id);
        expect(developerContext.attempt).toBe(1);
        expect(developerContext.entries).toEqual([
          {
            id: 'project-context',
            kind: 'local',
            location: 'AGENT.sidecar.md',
            title: 'Project-owned requirements and source map',
            status: 'local_excerpt',
            sha256: contextSourceSha256,
            bytes: contextSourceBytes.length,
            content: contextSourceBytes.toString('utf8'),
            truncated: false,
          },
          {
            id: 'project-product-context',
            kind: 'local',
            location: 'docs/PRODUCT.md',
            title: 'Project-owned requirements and source map',
            status: 'local_excerpt',
            sha256: productContextSha256,
            bytes: productContextBytes.length,
            content: productContextBytes.toString('utf8'),
            truncated: false,
          },
        ]);
        expect(developerContext.digest).toMatch(/^[a-f0-9]{64}$/u);
        expect(issuedDeveloper.request.configured_context_digest).toBe(developerContext.digest);
        expect(issuedDeveloper.request.configured_context_files).toEqual([
          {
            path: 'AGENT.sidecar.md',
            sha256: contextSourceSha256,
          },
          {
            path: 'docs/PRODUCT.md',
            sha256: productContextSha256,
          },
        ]);
        const developerPacket = requireRecord(issuedDeveloper.development_packet, 'Issued DevelopmentTaskPacket');
        const packetId = developerPacket.packet_id;
        assert.ok(typeof packetId === 'string');
        const packetDigest = developerPacket.digest;
        assert.ok(typeof packetDigest === 'string');
        expect(developerPacket.schema).toBe('DevelopmentTaskPacket/v1');
        expect(developerPacket.work_item_id).toBe(sourceFixture.identity.work_id);
        expect(developerPacket.attempt).toBe(1);
        expect(developerPacket.team_id).toBe(input.selection.team);
        expect(developerPacket.workflow_id).toBe('task_execution');
        expect(developerPacket.source_revision).toBe(sourceFixture.originalSource.digest);
        expect(packetId).toMatch(/^[A-Za-z0-9._:-]+$/u);
        expect(packetDigest).toMatch(/^[a-f0-9]{64}$/u);
        expect(developerPacket.owned_paths).toEqual(reportedWork.lifecycle.scope.implementation_paths);
        expect(developerPacket.documentation_refs).toEqual([...sourceFixture.documents, 'AGENT.sidecar.md'].sort());

        sessionLedger = openConfiguredMastraSessionLedger(sourceFixture.root);
        const issuedJournal = sessionLedger.resume(sourceFixture.identity.work_id, 1);
        assert.ok(issuedJournal);
        expect(issued.state_version).toEqual(issuedJournal.version);
        const pendingDeveloper = issuedJournal.state.items.find(
          (item) => item.request.action_id === developerItem.request.action_id,
        );
        assert.ok(pendingDeveloper);
        const hostReservation = pendingDeveloper.host_reservation;
        assert.ok(hostReservation);
        expect(hostReservation.schema).toBe('WorkflowSessionReservation/v1');
        expect(hostReservation.request.workItemId).toBe(sourceFixture.identity.work_id);
        expect(hostReservation.request.workflowId).toBe('task_execution');
        expect(hostReservation.request.stageId).toBe('develop_task');
        expect(hostReservation.request.assignmentIndex).toBe(0);
        expect(hostReservation.receipt.identity).toEqual(sourceFixture.identity);
        expect(pendingDeveloper.issue_id).toBe(developerIssueId);
        expect(hostReservation.receipt.attempt.attempt_id).toBe(developerHostAttemptId);
        expect(hostReservation.approvalAction).toBe('source.write');
        expect(hostReservation.receipt.attempt.status).toBe('started');
        expect(pendingDeveloper.observation).toBeNull();
        expect(
          issuedJournal.state.items.every(
            (item) => item.request.stage_id !== 'develop_task' || item.observation === null,
          ),
        ).toBe(true);
        const issuedHost = sessionLedger.hostState.readHostStateSnapshot(sourceFixture.identity);
        const issuedWork = issuedHost.work;
        const issuedLedger = issuedHost.ledger;
        assert.ok(issuedWork);
        assert.ok(issuedLedger);
        assert.ok(issuedHost.workVersion);
        expect(hostReservation.receipt.workVersion).toEqual(issuedHost.workVersion);
        const issuedLease = hostReservation.receipt.attempt.lease;
        assert.ok(issuedLease);
        expect(issuedLease.thread_id).toBe(priorWriterLease.thread_id);
        expect(issuedLease.generation).toBe(persistedLedger.open_generation);
        expect(issuedLease.ticket_id).not.toBe(priorWriterLease.ticket_id);
        expect(hostReservation.authorization?.approval?.status).toBe('commit_unknown');
        const activeWriterTicket = issuedLedger.tickets.find((ticket) => ticket.ticket_id === issuedLease.ticket_id);
        assert.ok(activeWriterTicket);
        expect(activeWriterTicket.ticket_id).toBeTruthy();
        expect(activeWriterTicket.ticket_id).not.toBe(priorWriterTicket.ticket_id);
        expect(activeWriterTicket.work_id).toBe(sourceFixture.identity.work_id);
        expect(activeWriterTicket.thread_id).toBe(issuedLease.thread_id);
        expect(activeWriterTicket.generation).toBe(issuedLease.generation);
        expect(activeWriterTicket.source_revision).toBe(persistedWork.binding.work_source_revision);
        expect(activeWriterTicket.status).toBe('active');
        expect(activeWriterTicket.exclusive_resources).toEqual(writerResources);
        expect(activeWriterTicket.active_resources).toEqual(writerResources);
        expect(activeWriterTicket.blocked_resources).toEqual([]);
        expect(activeWriterTicket.claim_ids).toHaveLength(1);
        const activeClaimId = activeWriterTicket.claim_ids[0];
        assert.ok(activeClaimId);
        expect(activeClaimId).not.toBe(priorWriterTicket.claim_ids[0]);
        const activeWriterClaim = issuedLedger.claims.find((claim) => claim.claim_id === activeClaimId);
        assert.ok(activeWriterClaim);
        expect(activeWriterClaim.ticket_id).toBe(activeWriterTicket.ticket_id);
        expect(activeWriterClaim.work_id).toBe(activeWriterTicket.work_id);
        expect(activeWriterClaim.thread_id).toBe(issuedLease.thread_id);
        expect(activeWriterClaim.generation).toBe(issuedLease.generation);
        expect(activeWriterClaim.resources).toEqual(writerResources);
        expect(activeWriterClaim.status).toBe('active');
        expect(issuedLedger.claims.filter((claim) => claim.ticket_id === activeWriterTicket.ticket_id)).toEqual([
          activeWriterClaim,
        ]);
        const releasedPriorTicket = issuedLedger.tickets.find(
          (ticket) => ticket.ticket_id === priorWriterTicket.ticket_id,
        );
        assert.ok(releasedPriorTicket);
        expect(releasedPriorTicket.status).toBe('released');
        expect(releasedPriorTicket.active_resources).toEqual([]);
        expect(issuedWork.lease).toEqual(issuedLease);
        const startedAttempt = issuedWork.execution.assignment_attempts.find(
          (attempt) => attempt.attempt_id === developerHostAttemptId,
        );
        assert.ok(startedAttempt);
        expect(startedAttempt).toEqual(hostReservation.receipt.attempt);
        expect(startedAttempt.status).toBe('started');
        expect(startedAttempt.stage_id).toBe('develop_task');
        expect(startedAttempt.assignment_index).toBe(0);
        const expectedWorkRevision = persistedWork.revision + 2;
        expect(issuedWork).toEqual({
          ...persistedWork,
          revision: expectedWorkRevision,
          lease: issuedLease,
          execution: {
            ...persistedWork.execution,
            assignment_attempts: [...persistedWork.execution.assignment_attempts, hostReservation.receipt.attempt],
          },
          lifecycle: {
            ...persistedWork.lifecycle,
            revision: expectedWorkRevision,
          },
        });
        for (const [implementationPath, bytes] of implementationBytes)
          expect(readFileSync(path.join(sourceFixture.root, implementationPath))).toEqual(bytes);

        const syntheticSummary = 'Controlled unit-test observation; no developer was dispatched.';
        const syntheticObservation = {
          schema: 'VidaSessionObservation/v1',
          action_id: issuedDeveloper.request.action_id,
          host_attempt_id: developerHostAttemptId,
          changed_paths: ['docs/PRODUCT.md'],
          issue_id: developerIssueId,
          agent_id: 'fixture:controlled-report',
          tool_call_ref: `fixture:controlled-report:${developerIssueId}`,
          status: 'reported_complete',
          summary: syntheticSummary,
          output_digest: canonicalJsonDigest(syntheticSummary),
          evidence_refs: ['fixture:synthetic-unit-observation'],
        } satisfies SessionBridgeObservation;
        const syntheticReportPath = path.join(
          sourceFixture.root,
          '.agent/work',
          sourceFixture.identity.work_id,
          'controlled-developer-report.json',
        );
        writeDurable(syntheticReportPath, syntheticObservation);
        const reportExpected = expected(issuedJournal.version);
        const reportArgs = [...args, ...reportExpected, '--report', syntheticReportPath];
        const beforeRefusalHost = sessionLedger.hostState.readHostStateSnapshot(sourceFixture.identity);
        const beforeRefusalJournal = sessionLedger.resume(sourceFixture.identity.work_id, 1);
        assert.ok(beforeRefusalJournal);
        const changedProductBytes = Buffer.concat([productContextBytes, Buffer.from('\nControlled fixture output.\n')]);
        const changedSidecarBytes = Buffer.concat([contextSourceBytes, Buffer.from('\nTemporary context drift.\n')]);
        writeFileSync(path.join(sourceFixture.root, 'docs/PRODUCT.md'), changedProductBytes);
        writeFileSync(path.join(sourceFixture.root, 'AGENT.sidecar.md'), changedSidecarBytes);
        const driftedDatabase = inspectHostWorkspaceDatabase(sourceFixture.root, databaseRelativePath, workspaceId);
        await assert.rejects(run(reportArgs), (error: unknown) => {
          expect(error).toMatchObject({
            code: 'GAP-VIDA-RUN-CONTEXT-001',
            message: 'Configured context changed outside the admitted native output.',
          });
          return true;
        });
        expect(sessionLedger.hostState.readHostStateSnapshot(sourceFixture.identity)).toEqual(beforeRefusalHost);
        const afterRefusalJournal = sessionLedger.resume(sourceFixture.identity.work_id, 1);
        assert.ok(afterRefusalJournal);
        expect(afterRefusalJournal).toEqual(beforeRefusalJournal);
        const afterRefusalDatabase = inspectHostWorkspaceDatabase(
          sourceFixture.root,
          databaseRelativePath,
          workspaceId,
        );
        expect(afterRefusalDatabase).toEqual(driftedDatabase);
        writeFileSync(path.join(sourceFixture.root, 'AGENT.sidecar.md'), contextSourceBytes);
        expect(readFileSync(path.join(sourceFixture.root, 'docs/PRODUCT.md'))).toEqual(changedProductBytes);
        const acceptedRaw = requireRecord(await runSuccessfully(reportArgs), 'Controlled synthetic developer report');
        expect(acceptedRaw.status).toBe('resumed');
        expect(acceptedRaw.completed_observations).toContainEqual(syntheticObservation);
        const acceptedJournal = sessionLedger.resume(sourceFixture.identity.work_id, 1);
        assert.ok(acceptedJournal);
        const completedDeveloper = acceptedJournal.state.completed
          .flatMap((wave) => wave.items)
          .find((item) => item.request.action_id === issuedDeveloper.request.action_id);
        assert.ok(completedDeveloper);
        expect(completedDeveloper.issue_id).toBe(developerIssueId);
        expect(completedDeveloper.observation).toEqual(syntheticObservation);
        const acceptedHost = sessionLedger.hostState.readHostStateSnapshot(sourceFixture.identity);
        assert.ok(acceptedHost.work && acceptedHost.ledger);
        const completedAttempt = acceptedHost.work.execution.assignment_attempts.find(
          (attempt) => attempt.attempt_id === developerHostAttemptId,
        );
        assert.ok(completedAttempt);
        expect(completedAttempt.status).toBe('completed');
        assert.ok(acceptedHost.work.lease);
        const executionTicket = acceptedHost.ledger.tickets.find(
          (ticket) => ticket.ticket_id === acceptedHost.work?.lease?.ticket_id,
        );
        assert.ok(executionTicket);
        expect(executionTicket.exclusive_resources).toEqual(['execution:' + sourceFixture.identity.work_id]);
        const releasedWriterTicket = acceptedHost.ledger.tickets.find(
          (ticket) => ticket.ticket_id === issuedLease.ticket_id,
        );
        assert.ok(releasedWriterTicket);
        expect(releasedWriterTicket.status).toBe('released');
        expect(releasedWriterTicket.active_resources).toEqual([]);
        expect(acceptedJournal.state.items.some((item) => item.request.stage_id === 'develop_task')).toBe(false);
        pendingNativeIssue = false;
        const validationVersion = acceptedJournal.version;
        pendingNativeIssue = true;
        const validationRaw = requireRecord(
          await runSuccessfully([...args, ...expected(validationVersion), '--issue-wave', 'true']),
          'Issued validation wave',
        );
        const validationIssued = parseTestRunPayload(validationRaw);
        expect(validationIssued.status).toBe('wave_issued');
        const validationActions = requireIssuedActions(validationIssued);
        expect(validationActions).toHaveLength(2);
        expect(validationActions.every((item) => item.request.stage_id === 'validate_focused')).toBe(true);
        assert.ok(Array.isArray(validationRaw.issued_actions));
        for (const rawAction of validationRaw.issued_actions) {
          const issuedAction = requireRecord(rawAction, 'Issued validation action');
          const implementation = requireRecord(issuedAction.implementation_result, 'Issued implementation result');
          const packet = requireRecord(issuedAction.development_packet, 'Issued validation packet');
          expect(implementation).toMatchObject({
            schema: 'ImplementationResult/v1',
            packet_id: packet.packet_id,
            implementation_fingerprint: acceptedJournal.state.source_scope?.digest,
            changed_paths: ['docs/PRODUCT.md'],
          });
        }
        const validationJournal = sessionLedger.resume(sourceFixture.identity.work_id, 1);
        assert.ok(validationJournal);
        expect(validationIssued.state_version).toEqual(validationJournal.version);
        expect(validationJournal.state.items.every((item) => item.issue_id !== null && item.observation === null)).toBe(
          true,
        );
        const afterValidationIssue = sessionLedger.hostState.readHostStateSnapshot(sourceFixture.identity);
        assert.ok(afterValidationIssue.work?.lease && afterValidationIssue.ledger);
        expect(afterValidationIssue.work.execution.assignment_attempts).toEqual(
          acceptedHost.work.execution.assignment_attempts,
        );
        const validationTicket = afterValidationIssue.ledger.tickets.find(
          (ticket) => ticket.ticket_id === afterValidationIssue.work?.lease?.ticket_id,
        );
        assert.ok(validationTicket);
        expect(validationTicket.exclusive_resources).toEqual(['execution:' + sourceFixture.identity.work_id]);
        expect(validationRaw.validation_receipt_statuses).toEqual([]);
        let validatorVersion = validationJournal.version;
        for (const item of validationActions) {
          const summary = JSON.stringify({
            schema: 'VidaValidatorVerdict/v1',
            verdict: 'pass',
            findings: [],
            evidence_refs: ['local://fixture/controlled-validator-result'],
          });
          const observation = {
            schema: 'VidaSessionObservation/v1',
            action_id: item.request.action_id,
            issue_id: item.issue_id,
            agent_id: `fixture:validator-${item.request.role}`,
            tool_call_ref: `fixture:validator-${item.request.action_id}`,
            status: 'reported_complete',
            summary,
            output_digest: canonicalJsonDigest(summary),
            evidence_refs: ['local://fixture/controlled-validator-result'],
          };
          const reportFile = path.join(sourceFixture.root, `validator-${item.request.assignment_index}.json`);
          writeFileSync(reportFile, JSON.stringify(observation), { flag: 'wx' });
          const reported = parseTestRunPayload(
            await runSuccessfully([...args, ...expected(validatorVersion), '--report', reportFile]),
          );
          validatorVersion = requireStateVersion(reported.state_version);
          const observedJournal = sessionLedger.resume(sourceFixture.identity.work_id, 1);
          assert.ok(observedJournal);
          const observedItems: readonly unknown[] = [
            ...observedJournal.state.items,
            ...observedJournal.state.completed.flatMap((wave) => wave.items),
          ];
          const observedItem = requireRecord(
            observedItems.find((candidate) => {
              const entry = requireRecord(candidate, 'Observed validator journal item');
              return requireRecord(entry.request, 'Observed validator request').action_id === item.request.action_id;
            }),
            'Matching observed validator journal item',
          );
          expect(observedItem.issue_id).toBe(item.issue_id);
          expect(observedItem.observation).toEqual(observation);
        }
        pendingNativeIssue = false;
        const nextJournal = sessionLedger.resume(sourceFixture.identity.work_id, 1);
        assert.ok(nextJournal);
        expect(nextJournal.state.items.every((item) => item.issue_id === null)).toBe(true);
        expect(
          nextJournal.state.items.every((item) => {
            const stage = sourceFixture.config.workflows.task_execution?.stages.find(
              (entry) => entry.id === item.request.stage_id,
            );
            return stage?.kind === 'test' && stage.consumes.includes('ValidationReceipt/v1');
          }),
        ).toBe(true);
        pendingNativeIssue = true;
        const testerRaw = requireRecord(
          await runSuccessfully([...args, ...expected(validatorVersion), '--issue-wave', 'true']),
          'Issued tester with observed validation receipts',
        );
        expect(testerRaw.status).toBe('wave_issued');
        const testerActions = requireIssuedActions(parseTestRunPayload(testerRaw));
        expect(testerActions).toHaveLength(nextJournal.state.items.length);
        expect(testerActions.map((item) => item.request.action_id)).toEqual(
          nextJournal.state.items.map((item) => item.request.action_id),
        );
        assert.ok(Array.isArray(testerRaw.validation_receipt_statuses));
        expect(testerRaw.validation_receipt_statuses).toHaveLength(validationActions.length);
        expect(
          testerRaw.validation_receipt_statuses
            .map((value) => {
              const receipt = requireRecord(value, 'Observed validation receipt status');
              expect(receipt.receipt_id).toMatch(/^validation-[a-f0-9]{40}$/);
              expect(receipt.verdict).toBe('pass');
              expect(receipt.implementation_fingerprint).toBe(acceptedJournal.state.source_scope?.digest);
              assert.equal(typeof receipt.validator_role, 'string');
              return receipt.validator_role;
            })
            .sort((left, right) => String(left).localeCompare(String(right))),
        ).toEqual(validationActions.map((item) => item.request.role).sort((left, right) => left.localeCompare(right)));
        completed = true;
      } catch (error) {
        failures.push(error);
      } finally {
        if (sessionLedger) {
          const ledgerToClose = sessionLedger;
          sessionLedger = undefined;
          try {
            ledgerToClose.close();
          } catch (error) {
            failures.push(error);
          }
        }
        if (fixture) {
          const ownerToClose = fixture;
          fixture = undefined;
          try {
            await ownerToClose.close();
          } catch (error) {
            failures.push(error);
          }
        }
      }
      if (failures.length > 0 || !completed) {
        if (root) process.stderr.write(`Retained failed native synthesis CLI fixture: ${root}\n`);
        if (failures.length === 1) throw failures[0];
        if (failures.length > 1)
          throw new AggregateError(failures, 'Native synthesis CLI operation or resource close failed');
        throw new Error('Native synthesis CLI fixture did not complete');
      }
      if (root && pendingNativeIssue)
        process.stderr.write(
          JSON.stringify({
            operation: 'native-synthesis-cli',
            root,
            cleanup: 'retained',
            reason: 'issued-readonly-outcome-unobserved',
          }) + '\n',
        );
      else if (root) rmSync(root, { recursive: true, force: true });
    }, 60_000);

    test('reports a fresh paused read-only replacement through public run', async () => {
      let root: string | undefined;
      let fixture: Awaited<ReturnType<typeof createInitialSourceWorkFixture>> | undefined;
      let observerLedger: ReturnType<typeof openConfiguredMastraSessionLedger> | undefined;
      let completed = false;
      const failures: unknown[] = [];
      try {
        fixture = await createInitialSourceWorkFixture({
          cooperativeSynthesis: true,
          researchSynthesis: true,
          researchAssignments: 1,
          onRoot: (value) => (root = value),
        });
        const sourceFixture = fixture;
        const input = admittedInput(sourceFixture);
        const initial = continuationState(sourceFixture);
        const sourceScope = initial.journal.source_scope;
        assert.ok(sourceScope && sourceFixture.store && sourceFixture.bridge && sourceFixture.ledger);
        const projectId = sourceFixture.identity.project_ids[0];
        const sourceEntry = sourceScope.entries[0];
        const acceptedAcIds = initial.work.binding.ac_ids;
        assert.ok(projectId && sourceEntry && acceptedAcIds.length > 0);
        await bindControlledRuntimeInitialization(sourceFixture.root, sourceFixture.config, sourceFixture.store);
        const pausedFixture = pauseReadonlyDispatchHostFixture(sourceFixture);
        const oldItem = pausedFixture.item;
        const oldActionId = oldItem.request.action_id;
        const oldIssueId = pausedFixture.issueId;
        const repair = [
          '--kind',
          'readonly-dispatch',
          '--project-root',
          sourceFixture.root,
          '--repair-id',
          pausedFixture.plan.repair_id,
          '--actor',
          pausedFixture.plan.actor,
          '--timestamp',
          pausedFixture.plan.timestamp,
          '--projects',
          sourceFixture.identity.project_ids.join(','),
          '--work-id',
          sourceFixture.identity.work_id,
          '--attempt',
          '1',
          '--action-id',
          oldActionId,
          '--issue-id',
          oldIssueId,
          '--native-handle',
          pausedFixture.plan.prior_native_handle,
        ];
        const planned = requireRecord(
          await runReconcileArtifacts(['--mode', 'plan', ...repair]),
          'readonly repair plan',
        );
        expect(planned.status).toBe('planned');
        const applied = requireRecord(
          await runReconcileArtifacts(['--mode', 'apply', ...repair.slice(0, 6)]),
          'readonly repair apply',
        );
        expect(applied.status).toBe('prepared');
        expect(applied.old_issue_outcome).toBe('unknown');

        await sourceFixture.close();
        const args = [
          '--project-root',
          sourceFixture.root,
          '--repository',
          sourceFixture.config.repository.repository_id,
          '--project',
          projectId,
          '--work-path',
          sourceFixture.documents[0],
          '--work-id',
          sourceFixture.identity.work_id,
          '--attempt',
          '1',
          '--scope-digest',
          sourceScope.digest,
          '--team',
          input.selection.team,
          '--kind',
          input.selection.kind,
          '--intent',
          input.selection.intent,
          '--workflow',
          initial.work.binding.workflow_id,
        ];
        const expected = (version: StateVersion) => [
          '--expected-revision',
          String(version.revision),
          '--expected-digest',
          version.digest,
        ];
        const issuedRaw = requireRecord(
          await run([...args, ...expected(pausedFixture.journal.version), '--issue-wave', 'true']),
          'issued readonly replacement',
        );
        const issued = parseTestRunPayload({
          schema: issuedRaw.schema,
          status: issuedRaw.status,
          state_version: issuedRaw.state_version,
        });
        assert.ok(Array.isArray(issuedRaw.issued_actions));
        expect(issuedRaw.issued_actions).toHaveLength(1);
        const replacement = requireRecord(issuedRaw.issued_actions[0], 'readonly replacement action');
        const replacementRequest = requireRecord(replacement.request, 'readonly replacement request');
        assert.ok(typeof replacement.issue_id === 'string' && typeof replacementRequest.action_id === 'string');
        const replacementActionId = replacementRequest.action_id;
        const replacementIssueId = replacement.issue_id;
        expect(replacementRequest.action_id).not.toBe(oldActionId);
        expect(replacement.issue_id).not.toBe(oldIssueId);
        expect(replacementRequest.stage_id).toBe('research_parallel');
        expect(replacement.instruction_activation).toBeDefined();
        const sourceId = 'replacement-admitted-source';
        const output = {
          schema: 'VidaResearchObservationOutput/v1',
          topic: 'Replacement read-only research',
          objective: 'Report the admitted fixture source after replacement activation.',
          question: 'What does the admitted fixture document support?',
          source_refs: [
            {
              source_id: sourceId,
              source_kind: 'internal',
              locator: sourceEntry.path,
              title: 'Admitted fixture document',
              claim: `${acceptedAcIds.join(' ')}: the admitted source supports this read-only finding.`,
              retrieved_at: '2026-10-25T00:00:00Z',
              version_or_date: '2026-10-25',
              independence_group: 'fixture',
              digest: sourceEntry.sha256,
            },
          ],
          findings: [
            {
              finding_id: 'replacement-admitted-source',
              statement: 'The admitted fixture document is present.',
              source_ids: [sourceId],
              evidence_class: 'Code',
              status: 'confirmed',
            },
          ],
          uncertainties: [],
          conflicts: [],
          evidence_classes: ['Code'],
          br_ids: [],
          sr_ids: [],
          ac_ids: [...acceptedAcIds],
          gap_ids: [],
          options: [
            {
              option_id: 'retain',
              label: 'Retain evidence',
              description: 'Preserve the bounded result.',
              evidence_refs: [sourceId],
            },
          ],
          recommendation: {
            option_id: 'retain',
            rationale: 'The admitted source supports the finding.',
            evidence_refs: [sourceId],
          },
          completeness: {
            status: 'pass',
            required_questions: ['What does the admitted fixture document support?'],
            answered_questions: ['What does the admitted fixture document support?'],
            missing_questions: [],
            material_gaps: [],
            external_validation: {
              required: false,
              source_count: 0,
              minimum_sources: 0,
              status: 'not_required',
              live_check: null,
            },
          },
          readiness: 'informational',
        };
        const summary = JSON.stringify(output);
        const reportPath = path.join(
          sourceFixture.root,
          '.agent',
          'work',
          sourceFixture.identity.work_id,
          'replacement-report.json',
        );
        const observation = (reportSummary: string): SessionBridgeObservation => ({
          schema: 'VidaSessionObservation/v1',
          action_id: replacementActionId,
          issue_id: replacementIssueId,
          agent_id: 'fixture:replacement-researcher',
          tool_call_ref: `fixture:replacement:${replacementActionId}`,
          status: 'reported_complete',
          summary: reportSummary,
          output_digest: canonicalJsonDigest(reportSummary),
          evidence_refs: [sourceId],
        });
        const foreignReportPath = path.join(path.dirname(reportPath), 'replacement-foreign-report.json');
        writeFileSync(
          foreignReportPath,
          JSON.stringify(observation(JSON.stringify({ ...output, ac_ids: ['AC-FOREIGN'] }))),
          { flag: 'wx' },
        );
        const workspaceId = deriveWorkspaceId(sourceFixture.config.repository.repository_id, sourceFixture.root);
        const databaseRelativePath = path.relative(
          sourceFixture.root,
          sessionHandoffDatabasePath(sourceFixture.root, sourceFixture.config),
        );
        const inspectReplacementState = () =>
          inspectHostWorkspaceDatabase(sourceFixture.root, databaseRelativePath, workspaceId);
        const beforeDenied = inspectReplacementState();
        const issuedJournal = beforeDenied.journals[0];
        const activation = issuedJournal?.state.items[0]?.research_activation;
        assert.ok(activation);
        expect(issuedJournal?.state.items[0]?.research_normalization).toBeUndefined();
        const activationHistoryFile = path.join(sourceFixture.root, activation.plan.history_path);
        const activationHistory = readFileSync(activationHistoryFile);
        const retrieved = requireRecord(
          await run([...args, ...expected(requireStateVersion(issued.state_version)), '--issue-wave', 'true']),
          'retrieved readonly replacement',
        );
        expect(retrieved.status).toBe('wave_retrieved');
        expect(retrieved.issued_actions).toEqual(issuedRaw.issued_actions);
        expect(retrieved.state_version).toEqual(issued.state_version);
        expect(inspectReplacementState()).toEqual(beforeDenied);
        expect(readFileSync(activationHistoryFile).equals(activationHistory)).toBe(true);
        await assert.rejects(
          run([...args, ...expected(requireStateVersion(issued.state_version)), '--report', foreignReportPath]),
          { code: 'GAP-VIDA-RUN-REPORT-001', message: 'Replacement research output differs from required scope.' },
        );
        const afterDenied = inspectReplacementState();
        expect(afterDenied).toEqual(beforeDenied);
        writeFileSync(reportPath, JSON.stringify(observation(summary)), { flag: 'wx' });
        const reported = requireRecord(
          await run([...args, ...expected(requireStateVersion(issued.state_version)), '--report', reportPath]),
          'replacement public report',
        );
        expect(reported.status).toBe('replacement_observed');
        expect(reported.prior_issue_outcome).toBe('unknown');
        expect(reported.issued_actions).toEqual([]);
        expect(reported.next_actions).toEqual([]);
        expect(reported.resume_status).toBe('ready_to_resume');
        const afterReport = inspectReplacementState();
        const resultingJournal = afterReport.journals[0];
        assert.ok(resultingJournal);
        const replacementResult = resultingJournal.state.items.find((item) => item.request.action_id === oldActionId);
        expect(replacementResult?.issue_id).toBe(replacement.issue_id);
        expect(replacementResult?.observation?.status).toBe('reported_complete');
        expect(replacementResult?.observation).toEqual({ ...observation(summary), action_id: oldActionId });
        const normalization = replacementResult?.research_normalization;
        assert.ok(normalization);
        const normalizedRecord = requireRecord(
          parseJsonUnknown(readFileSync(path.join(sourceFixture.root, normalization.record_path), 'utf8')),
          'normalized replacement research',
        );
        expect(normalizedRecord).toMatchObject({
          schema: 'ResearchResult/v1',
          work_item_id: sourceFixture.identity.work_id,
          source_refs: output.source_refs,
          ac_ids: acceptedAcIds,
          digest: normalization.result_digest,
        });
        observerLedger = openConfiguredMastraSessionLedger(sourceFixture.root);
        expect(observerLedger.replacementDispatch(sourceFixture.identity.work_id, 1, oldActionId)?.prior_issue_id).toBe(
          oldIssueId,
        );
        completed = true;
      } catch (error) {
        failures.push(error);
      } finally {
        try {
          observerLedger?.close();
        } catch (error) {
          failures.push(error);
        }
        try {
          await fixture?.close();
        } catch (error) {
          failures.push(error);
        }
      }
      if (failures.length > 0 || !completed) {
        if (root) process.stderr.write(`Retained failed readonly replacement report fixture: ${root}\n`);
        if (failures.length === 1) throw failures[0];
        if (failures.length > 1)
          throw new AggregateError(failures, 'Readonly replacement report or resource close failed');
        throw new Error('Readonly replacement public report fixture did not complete');
      }
      if (root)
        process.stderr.write(
          JSON.stringify({
            operation: 'readonly-replacement-public-report',
            root,
            cleanup: 'retained',
            reason: 'original-readonly-issue-unknown',
          }) + '\n',
        );
    }, 60_000);

    test('recovers an unexposed research wave after activation preparation fails', async () => {
      let root: string | undefined;
      let fixture: Awaited<ReturnType<typeof createInitialSourceWorkFixture>> | undefined;
      let activationSpy: { mockRestore(): void } | undefined;
      let completed = false;
      const failures: unknown[] = [];
      const marker = new Error('second research activation preparation failed');
      try {
        fixture = await createInitialSourceWorkFixture({
          researchSynthesis: true,
          researchAssignments: 2,
          onRoot: (value) => (root = value),
        });
        const sourceFixture = fixture;
        const input = admittedInput(sourceFixture);
        const initial = continuationState(sourceFixture);
        const sourceScope = initial.journal.source_scope;
        assert.ok(sourceScope && sourceFixture.store && sourceFixture.bridge && sourceFixture.ledger);
        const projectId = sourceFixture.identity.project_ids[0];
        assert.ok(projectId);
        const args = [
          '--project-root',
          sourceFixture.root,
          '--repository',
          sourceFixture.config.repository.repository_id,
          '--project',
          projectId,
          '--work-path',
          sourceFixture.documents[0],
          '--work-id',
          sourceFixture.identity.work_id,
          '--attempt',
          '1',
          '--scope-digest',
          sourceScope.digest,
          '--team',
          input.selection.team,
          '--kind',
          input.selection.kind,
          '--intent',
          input.selection.intent,
          '--workflow',
          'task_execution',
        ];
        await bindControlledRuntimeInitialization(sourceFixture.root, sourceFixture.config, sourceFixture.store);
        const ownerToClose = fixture;
        fixture = undefined;
        await ownerToClose.close();

        const expected = (version: StateVersion) => [
          '--expected-revision',
          String(version.revision),
          '--expected-digest',
          version.digest,
        ];
        const prepared = parseTestRunPayload(await run(args));
        const preparedVersion = requireStateVersion(prepared.state_version);
        const databaseRelativePath = sessionHandoffDatabaseRelativePath(sourceFixture.config);
        const workspaceId = deriveWorkspaceId(sourceFixture.config.repository.repository_id, sourceFixture.root);
        const readSnapshot = () => inspectHostWorkspaceDatabase(sourceFixture.root, databaseRelativePath, workspaceId);
        let activationCalls = 0;
        const activate = observedResearchActivation.issueObservedResearchActivation;
        activationSpy = spyOn(observedResearchActivation, 'issueObservedResearchActivation').mockImplementation(
          async (activationInput) => {
            activationCalls += 1;
            if (activationCalls === 2) throw marker;
            return await activate(activationInput);
          },
        );
        let issueFailure: unknown;
        try {
          await run([...args, ...expected(preparedVersion), '--issue-wave', 'true']);
        } catch (error) {
          issueFailure = error;
        } finally {
          activationSpy.mockRestore();
          activationSpy = undefined;
        }
        expect(issueFailure).toBe(marker);
        expect(activationCalls).toBe(2);

        const beforeRecovery = readSnapshot();
        const beforeJournal = beforeRecovery.journals.find(
          (entry) => entry.work_id === sourceFixture.identity.work_id && entry.attempt === 1,
        );
        assert.ok(beforeJournal);
        expect(beforeJournal.state.research_wave_exposure).toBe('preparing');
        expect(beforeJournal.state.items).toHaveLength(2);
        const originalIssueIds = beforeJournal.state.items.map((item) => item.issue_id);
        expect(originalIssueIds.every((issueId) => typeof issueId === 'string')).toBe(true);
        expect(new Set(originalIssueIds).size).toBe(2);
        const firstActivation = beforeJournal.state.items[0]?.research_activation;
        assert.ok(firstActivation);
        expect(firstActivation.plan.history_path).toBe(
          path.posix.join(
            sourceFixture.config.research_decision.paths.activation_history,
            sourceFixture.identity.work_id,
            'instruction-activation-history.jsonl',
          ),
        );
        const historyFile = path.join(sourceFixture.root, firstActivation.plan.history_path);
        const beforeHistory = readFileSync(historyFile);
        expect(beforeHistory.toString('utf8').endsWith('\n')).toBe(true);
        expect(beforeHistory.toString('utf8').trimEnd().split('\n').map(parseJsonUnknown)).toEqual([
          firstActivation.use,
        ]);
        expect(beforeJournal.state.items[1]?.research_activation).toBeUndefined();
        expect(beforeJournal.state.items.every((item) => item.observation === null)).toBe(true);
        expect(beforeJournal.state.items.every((item) => item.host_reservation === undefined)).toBe(true);
        const beforeWork = beforeRecovery.work.find(
          (entry) => entry.identity.work_id === sourceFixture.identity.work_id,
        );
        assert.ok(beforeWork);
        expect(beforeWork.state.execution.assignment_attempts).toEqual([]);

        const recoveredRaw = requireRecord(
          await run([...args, ...expected(beforeJournal.version), '--issue-wave', 'true']),
          'Recovered public research wave result',
        );
        const recovered = parseTestRunPayload(recoveredRaw);
        expect(recovered.status).toBe('wave_recovered');
        expect(recovered.research_preparation_status).toBe('exposure_possible');
        const recoveredActions = requireIssuedActions(recovered);
        expect(recoveredActions).toHaveLength(2);
        expect(recoveredActions.map((action) => action.issue_id)).toEqual(originalIssueIds);
        const afterRecovery = readSnapshot();
        const recoveredJournal = afterRecovery.journals.find(
          (entry) => entry.work_id === sourceFixture.identity.work_id && entry.attempt === 1,
        );
        assert.ok(recoveredJournal);
        expect(recovered.state_version).toEqual(recoveredJournal.version);
        expect(recoveredJournal.state.research_wave_exposure).toBe('possible');
        expect(recoveredJournal.state.items.map((item) => item.issue_id)).toEqual(originalIssueIds);
        expect(recoveredJournal.state.items[0]?.research_activation).toEqual(firstActivation);
        assert.ok(recoveredJournal.state.items[1]?.research_activation);
        const recoveredHistory = readFileSync(historyFile);
        expect(recoveredHistory.subarray(0, beforeHistory.length).equals(beforeHistory)).toBe(true);
        expect(recoveredHistory.toString('utf8').endsWith('\n')).toBe(true);
        expect(recoveredHistory.toString('utf8').trimEnd().split('\n').map(parseJsonUnknown)).toEqual(
          recoveredJournal.state.items.map((item) => item.research_activation?.use),
        );
        expect(recoveredActions.map((action) => action.instruction_activation)).toEqual(
          recoveredJournal.state.items.map((item) => item.research_activation?.use),
        );
        expect(recoveredJournal.state.items.every((item) => item.observation === null)).toBe(true);
        expect(recoveredJournal.state.items.every((item) => item.host_reservation === undefined)).toBe(true);
        expect(afterRecovery.work).toEqual(beforeRecovery.work);
        expect(afterRecovery.ledger).toEqual(beforeRecovery.ledger);

        let repeatedIssueFailure: unknown;
        try {
          await run([...args, ...expected(requireStateVersion(recovered.state_version)), '--issue-wave', 'true']);
        } catch (error) {
          repeatedIssueFailure = error;
        }
        expect(repeatedIssueFailure).toMatchObject({
          code: 'GAP-VIDA-RUN-EXECUTION-001',
          message:
            'Research batch exposure may already have occurred; report or reconcile the existing issue before any retry.',
        });
        const afterDeniedRetry = readSnapshot();
        expect(afterDeniedRetry.work).toEqual(afterRecovery.work);
        expect(afterDeniedRetry.ledger).toEqual(afterRecovery.ledger);
        expect(afterDeniedRetry.journals).toEqual(afterRecovery.journals);
        expect(afterDeniedRetry.admission_attempts).toEqual(afterRecovery.admission_attempts);
        expect(readFileSync(historyFile).equals(recoveredHistory)).toBe(true);
        completed = true;
      } catch (error) {
        failures.push(error);
      } finally {
        try {
          activationSpy?.mockRestore();
        } catch (error) {
          failures.push(error);
        }
        try {
          await fixture?.close();
        } catch (error) {
          failures.push(error);
        }
      }
      if (failures.length > 0 || !completed) {
        if (root) process.stderr.write(`Retained failed research preparation recovery fixture: ${root}\n`);
        if (failures.length === 1) throw failures[0];
        if (failures.length > 1)
          throw new AggregateError(failures, 'Research preparation recovery assertions or resource close failed');
        throw new Error('Research preparation recovery fixture did not complete');
      }
      if (root)
        process.stderr.write(
          JSON.stringify({
            operation: 'research-preparation-recovery',
            root,
            cleanup: 'retained',
            reason: 'issued-readonly-outcome-unobserved',
          }) + '\n',
        );
    }, 60_000);

    test('refuses partially issued research preparation before context admission through public run', async () => {
      let root: string | undefined;
      let fixture: Awaited<ReturnType<typeof createInitialSourceWorkFixture>> | undefined;
      let completed = false;
      try {
        fixture = await createInitialSourceWorkFixture({
          researchSynthesis: true,
          researchAssignments: 2,
          onRoot: (value) => (root = value),
        });
        const sourceFixture = fixture;
        const input = admittedInput(sourceFixture);
        const initial = continuationState(sourceFixture);
        const sourceScope = initial.journal.source_scope;
        assert.ok(sourceScope && sourceFixture.store && sourceFixture.bridge && sourceFixture.ledger);
        const projectId = sourceFixture.identity.project_ids[0];
        assert.ok(projectId);
        const args = [
          '--project-root',
          sourceFixture.root,
          '--repository',
          sourceFixture.config.repository.repository_id,
          '--project',
          projectId,
          '--work-path',
          sourceFixture.documents[0],
          '--work-id',
          sourceFixture.identity.work_id,
          '--attempt',
          '1',
          '--scope-digest',
          sourceScope.digest,
          '--team',
          input.selection.team,
          '--kind',
          input.selection.kind,
          '--intent',
          input.selection.intent,
          '--workflow',
          'task_execution',
        ];
        await bindControlledRuntimeInitialization(sourceFixture.root, sourceFixture.config, sourceFixture.store);
        await sourceFixture.bridge.close();
        sourceFixture.bridge = null;
        sourceFixture.ledger.close();
        sourceFixture.ledger = null;
        sourceFixture.database?.close(true);
        sourceFixture.database = null;
        sourceFixture.store = null;

        const expected = (version: StateVersion) => [
          '--expected-revision',
          String(version.revision),
          '--expected-digest',
          version.digest,
        ];
        const prepared = parseTestRunPayload(await run(args));
        const preparedVersion = requireStateVersion(prepared.state_version);
        const issued = parseTestRunPayload(await run([...args, ...expected(preparedVersion), '--issue-wave', 'true']));
        const issuedActions = requireIssuedActions(issued);
        expect(issuedActions).toHaveLength(2);
        const issuedAction = issuedActions[0];
        assert.ok(issuedAction?.issue_id);
        let journalVersion: StateVersion | undefined;
        const workspaceId = deriveWorkspaceId(sourceFixture.config.repository.repository_id, sourceFixture.root);
        const databasePath = sessionHandoffDatabasePath(sourceFixture.root, sourceFixture.config);
        const database = new Database(databasePath);
        try {
          const row = database
            .query(
              'SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?',
            )
            .get(workspaceId, sourceFixture.identity.work_id, 1) as {
            revision: number;
            payload: string;
            digest: string;
          } | null;
          assert.ok(row);
          const state = JSON.parse(row.payload) as {
            research_wave_exposure?: string;
            items: { readonly issue_id: string | null }[];
          };
          expect(state.research_wave_exposure).toBe('possible');
          expect(state.items).toHaveLength(2);
          expect(state.items.every((item) => item.issue_id !== null)).toBe(true);
          const partial = {
            ...state,
            research_wave_exposure: 'preparing' as const,
            items: state.items.map((item, index) => {
              if (index !== 1) return item;
              const unprepared = { ...item, issue_id: null, observation: null } as Record<string, unknown>;
              delete unprepared.host_reservation;
              delete unprepared.research_activation;
              delete unprepared.research_normalization;
              return unprepared as typeof item;
            }),
          };
          const update = database
            .query(
              'UPDATE agent_host_mastra_session_ledger SET revision=?,payload=?,digest=? WHERE workspace_id=? AND work_id=? AND attempt=? AND revision=? AND digest=?',
            )
            .run(
              row.revision + 1,
              canonicalJson(partial),
              canonicalJsonDigest(partial),
              workspaceId,
              sourceFixture.identity.work_id,
              1,
              row.revision,
              row.digest,
            );
          expect(update.changes).toBe(1);
          journalVersion = { revision: row.revision + 1, digest: canonicalJsonDigest(partial) };
        } finally {
          database.close(true);
        }

        const databaseRelativePath = path.relative(sourceFixture.root, databasePath);
        const beforeRecovery = inspectHostWorkspaceDatabase(sourceFixture.root, databaseRelativePath, workspaceId);
        const journal = beforeRecovery.journals[0];
        assert.ok(journal);
        expect(journal.state.research_wave_exposure).toBe('preparing');
        expect(journal.state.items.map((item) => item.issue_id)).toEqual([issuedAction.issue_id, null]);
        expect(journal.state.items[0]?.issue_id).toBe(issuedAction.issue_id);
        assert.ok(journalVersion);
        const validatingLedger = openConfiguredMastraSessionLedger(sourceFixture.root);
        try {
          expect(validatingLedger.resume(sourceFixture.identity.work_id, 1)?.state).toEqual(journal.state);
        } finally {
          validatingLedger.close();
        }
        await Promise.resolve(
          expect(run([...args, ...expected(journalVersion), '--issue-wave', 'true'])).rejects.toMatchObject({
            code: 'GAP-VIDA-RUN-EXECUTION-001',
            message: 'Research preparation is not safely resumable for the current wave.',
          }),
        );
        const afterRecovery = inspectHostWorkspaceDatabase(sourceFixture.root, databaseRelativePath, workspaceId);
        expect(afterRecovery.work).toEqual(beforeRecovery.work);
        expect(afterRecovery.ledger).toEqual(beforeRecovery.ledger);
        expect(afterRecovery.journals).toEqual(beforeRecovery.journals);
        expect(afterRecovery.admission_attempts).toEqual(beforeRecovery.admission_attempts);
        completed = true;
      } finally {
        try {
          await fixture?.close();
        } finally {
          if (root && completed) rmSync(root, { recursive: true, force: true });
          else if (root) process.stderr.write(`Retained unsafe research preparation fixture: ${root}\n`);
        }
      }
    }, 60_000);

    test('validates an accepted delivery proposal through public run', async () => {
      let fixture: FailedFinalCorrectionFixture | undefined;
      let completed = false,
        pendingAssuranceIssue = false;
      try {
        fixture = await createFailedFinalCorrectionFixture('passing', { noEffectRetry: 'next-writer' });
        const assuranceFixture = fixture;
        const delivery = fixture.journal.state.completed
          .flatMap((wave) => wave.items)
          .find((item) => item.request.stage_id === 'prepare_delivery');
        assert.ok(delivery?.issue_id && delivery.observation);
        expect(delivery.observation).toMatchObject({
          action_id: delivery.request.action_id,
          issue_id: delivery.issue_id,
          status: 'reported_complete',
        });
        const deliveryProposal = requireRecord(
          parseJsonUnknown(delivery.observation.summary),
          'accepted delivery proposal summary',
        );
        expect(deliveryProposal).toMatchObject({
          schema: 'VidaDeliveryProposal/v1',
          destination: 'isolated-fixture',
        });

        const work = fixture.store.readHostStateSnapshot(fixture.identity).work;
        assert.ok(work);
        const noEffectAttempt = work.execution.assignment_attempts.find((attempt) => attempt.status === 'no_effect');
        const writerAttempt = work.execution.assignment_attempts.find((attempt) => attempt.stage_id === 'develop_task');
        assert.ok(noEffectAttempt?.reconciliation && writerAttempt);
        expect(noEffectAttempt.stage_id).not.toBe(writerAttempt.stage_id);
        expect(writerAttempt.status).toBe('completed');
        expect(writerAttempt.previous_attempt_id).toBeNull();
        const sourceScope = fixture.journal.state.source_scope;
        assert.ok(sourceScope);
        const preparation = requireRecord(
          parseJsonUnknown(readFileSync(path.join(fixture.root, fixture.preparationPath), 'utf8')),
          'fixture final assurance preparation',
        );
        if (typeof preparation.delivery_manifest_path !== 'string')
          throw new Error('Fixture preparation has no declared delivery manifest path.');
        const deliveryManifestPath = preparation.delivery_manifest_path;
        expect(deliveryManifestPath).toBe(`.agent/work/${fixture.identity.work_id}/delivery.json`);
        expect(sourceScope.entries.some((entry) => entry.path === deliveryManifestPath)).toBe(false);
        writeFileSync(
          path.join(fixture.root, ...deliveryManifestPath.split('/')),
          JSON.stringify({
            schema: 'FinalAssuranceDelivery/v1',
            work_id: fixture.identity.work_id,
            implementation_fingerprint: sourceScope.digest,
            destination: deliveryProposal.destination,
            order: deliveryProposal.order,
            post_deployment_checks: deliveryProposal.post_deployment_checks,
            created_files: deliveryProposal.created,
            modified_files: deliveryProposal.modified,
            repository_only_files: deliveryProposal.do_not_deploy,
          }),
        );
        const projectId = fixture.identity.project_ids[0];
        assert.ok(projectId);
        const version = fixture.journal.version;
        const runArgs = [
            '--project-root',
            fixture.root,
            '--repository',
            fixture.config.repository.repository_id,
            '--project',
            projectId,
            '--work-path',
            'AGENT.sidecar.md',
            '--work-id',
            fixture.identity.work_id,
            '--attempt',
            '1',
            '--scope-digest',
            work.binding.work_source_revision,
            '--team',
            fixture.producerInput.selection.team,
            '--kind',
            fixture.producerInput.selection.kind,
            '--intent',
            fixture.producerInput.selection.intent,
            '--workflow',
            fixture.producerInput.workflowId,
          ],
          expected = (stateVersion: { revision: number; digest: string }) => [
            '--expected-revision',
            String(stateVersion.revision),
            '--expected-digest',
            stateVersion.digest,
          ],
          publicRun = async (args: string[]): Promise<Record<string, unknown> & { state_version: StateVersion }> => {
            const result = requireRecord(await run([...runArgs, ...args]), 'public final assurance operation result');
            const typedResult = parseTestRunPayload({
              schema: result.schema,
              status: result.status,
              state_version: result.state_version,
            });
            return { ...result, state_version: requireStateVersion(typedResult.state_version) };
          };
        const terminalHost = fixture.store.readHostStateSnapshot(fixture.identity);
        const terminalJournal = fixture.ledger.resume(fixture.identity.work_id, 1);
        assert.ok(terminalJournal);
        expect(terminalJournal.resume_status).toBe('blocked');
        const terminal = await publicRun([]);
        expect(terminal.resume_status).toBe('complete');
        expect(terminal.state_version).toEqual(terminalJournal.version);
        expect(terminal.next_actions).toEqual([]);
        expect(terminal.issued_actions).toEqual([]);
        const instruction = requireRecord(terminal.delivery_instruction, 'terminal delivery instruction');
        expect(instruction).toMatchObject({
          implementation_fingerprint: sourceScope.digest,
          destination: deliveryProposal.destination,
          order: deliveryProposal.order,
        });
        expect(fixture.store.readHostStateSnapshot(fixture.identity)).toEqual(terminalHost);
        expect(fixture.ledger.resume(fixture.identity.work_id, 1)).toEqual(terminalJournal);
        const currentSourcePath = path.join(fixture.root, 'AGENT.sidecar.md');
        const currentSourceBytes = readFileSync(currentSourcePath);
        try {
          writeFileSync(
            currentSourcePath,
            Buffer.concat([currentSourceBytes, Buffer.from('\nchanged terminal Source\n')]),
          );
          await assert.rejects(run(runArgs), { code: 'GAP-VIDA-RUN-CONTEXT-001' });
          expect(fixture.store.readHostStateSnapshot(fixture.identity)).toEqual(terminalHost);
          expect(fixture.ledger.resume(fixture.identity.work_id, 1)).toEqual(terminalJournal);
        } finally {
          writeFileSync(currentSourcePath, currentSourceBytes);
        }
        expect(readFileSync(currentSourcePath)).toEqual(currentSourceBytes);
        const terminalRetry = await publicRun([]);
        expect(terminalRetry.delivery_instruction).toEqual(instruction);
        expect(terminalRetry.state_version).toEqual(terminalJournal.version);
        expect(fixture.store.readHostStateSnapshot(fixture.identity)).toEqual(terminalHost);
        expect(fixture.ledger.resume(fixture.identity.work_id, 1)).toEqual(terminalJournal);
        markInitialSourceTimingPhase('case.assurance.started');
        const assurance = await publicRun([
          ...expected(version),
          '--prepare-assurance',
          path.join(fixture.root, fixture.preparationPath),
        ]);
        expect(assurance.status).toBe('assurance_resumed');
        expect(assurance.assurance_status).toBe('ready');
        expect(assurance.issued_actions).toEqual([]);
        assert.ok(Array.isArray(assurance.next_actions));
        const nextActions = assurance.next_actions.map((action) => requireRecord(action, 'final assurance action'));
        expect(
          nextActions.map(
            (action) => requireRecord(action.packet, 'current assurance packet').implementation_fingerprint,
          ),
        ).toEqual([sourceScope.digest, sourceScope.digest, sourceScope.digest]);
        expect(nextActions.map((action) => [action.kind, action.perspective, action.issue_id])).toEqual([
          ['review', 'correctness', null],
          ['review', 'security', null],
          ['review', 'assurance', null],
        ]);
        expect(nextActions.every((action) => action.tool === 'spawn_agent')).toBe(true);
        pendingAssuranceIssue = true;
        const issueReviews = await publicRun([
          ...expected(requireStateVersion(assurance.state_version)),
          '--issue-wave',
          'true',
        ]);
        expect(issueReviews.status).toBe('assurance_wave_issued');
        expect(issueReviews.assurance_status).toBe('issued_outcome_uncertain');
        expect(issueReviews.next_actions).toEqual([]);
        assert.ok(Array.isArray(issueReviews.issued_actions));
        const issuedReviews = issueReviews.issued_actions.map((action) =>
          requireRecord(action, 'issued final assurance review'),
        );
        expect(issuedReviews.map((action) => [action.kind, action.perspective])).toEqual([
          ['review', 'correctness'],
          ['review', 'security'],
          ['review', 'assurance'],
        ]);
        expect(issuedReviews.every((action) => typeof action.issue_id === 'string')).toBe(true);
        const reportBody = (
          action: Record<string, unknown>,
          kind: 'review' | 'reverse',
          review?: Record<string, unknown>,
        ) => {
          const packet = requireRecord(action.packet, 'issued assurance packet');
          const actionId = action.action_id,
            issueId = action.issue_id;
          if (typeof actionId !== 'string' || typeof issueId !== 'string')
            throw new Error('Issued assurance action lacks its returned IDs.');
          let reviewActionId: string | undefined,
            reviewIssueId: string | undefined,
            agentId = `fixture:reviewer-${String(action.perspective)}`,
            historyId = `fixture:review-history-${String(action.perspective)}`;
          if (kind === 'reverse') {
            const acceptedReview = requireRecord(review, 'accepted review observation');
            if (
              typeof acceptedReview.action_id !== 'string' ||
              typeof acceptedReview.issue_id !== 'string' ||
              typeof acceptedReview.agent_id !== 'string' ||
              typeof acceptedReview.history_id !== 'string'
            )
              throw new Error('Accepted review observation lacks its returned bindings.');
            reviewActionId = acceptedReview.action_id;
            reviewIssueId = acceptedReview.issue_id;
            agentId = acceptedReview.agent_id;
            historyId = acceptedReview.history_id;
          }
          return {
            schema: kind === 'review' ? 'FinalAssuranceReview/v1' : 'FinalAssuranceReverse/v1',
            work_id: packet.work_id,
            attempt: packet.attempt,
            packet_id: packet.packet_id,
            action_id: actionId,
            issue_id: issueId,
            generation: packet.generation,
            implementation_fingerprint: packet.implementation_fingerprint,
            scope_id: packet.scope_id,
            ...(kind === 'review' ? { perspective: action.perspective } : {}),
            ...(kind === 'reverse' ? { review_action_id: reviewActionId, review_issue_id: reviewIssueId } : {}),
            agent_id: agentId,
            history_id: historyId,
            tool_call_ref: `fixture:${kind}-${String(action.perspective)}`,
            verdict: 'pass',
            evidence_refs: [`local://fixture/${kind}-${String(action.perspective)}`],
            checks: {
              scope_and_trace: 'pass',
              tests_security_rollback: 'pass',
              evidence_invalidation_binding: 'pass',
            },
            ...(kind === 'review' ? { findings: [] } : {}),
          };
        };
        const reportPathFor = (kind: string, action: Record<string, unknown>) => {
          const perspective = String(action.perspective);
          return path.join(
            assuranceFixture.root,
            '.agent',
            'work',
            assuranceFixture.identity.work_id,
            `${kind}-${perspective}.json`,
          );
        };
        const firstReview = issuedReviews[0];
        assert.ok(firstReview);
        const firstReviewPath = reportPathFor('final-review', firstReview);
        writeFileSync(firstReviewPath, JSON.stringify(reportBody(firstReview, 'review')));
        const hostBeforeStaleReport = fixture.store.readHostStateSnapshot(fixture.identity),
          finalBeforeStaleReport = fixture.store.readFinalAssurance(fixture.identity, 1);
        assert.ok(finalBeforeStaleReport);
        await Promise.resolve(
          expect(
            publicRun([...expected(requireStateVersion(assurance.state_version)), '--report', firstReviewPath]),
          ).rejects.toMatchObject({
            code: 'GAP-VIDA-RUN-CONTEXT-001',
            message: 'Final assurance journal version is stale.',
          }),
        );
        expect(fixture.store.readHostStateSnapshot(fixture.identity)).toEqual(hostBeforeStaleReport);
        expect(fixture.store.readFinalAssurance(fixture.identity, 1)).toEqual(finalBeforeStaleReport);

        let currentVersion = requireStateVersion(issueReviews.state_version),
          finalReviewResult: Record<string, unknown> | undefined;
        for (const [index, review] of issuedReviews.entries()) {
          const reportPath = reportPathFor('final-review', review);
          writeFileSync(reportPath, JSON.stringify(reportBody(review, 'review')));
          const expectedBeforeReport = currentVersion;
          const reported = await publicRun([...expected(currentVersion), '--report', reportPath]);
          expect(reported.status).toBe('assurance_reported');
          currentVersion = requireStateVersion(reported.state_version);
          finalReviewResult = reported;
          if (review === firstReview) {
            const retry = await publicRun([...expected(currentVersion), '--report', reportPath]);
            expect(retry.status).toBe('assurance_report_retrieved');
            expect(retry.state_version).toEqual(reported.state_version);
            const hostBeforeConflict = fixture.store.readHostStateSnapshot(fixture.identity),
              finalBeforeConflict = fixture.store.readFinalAssurance(fixture.identity, 1),
              conflictingReportPath = reportPathFor('conflicting-final-review', review);
            writeFileSync(
              conflictingReportPath,
              JSON.stringify({ ...reportBody(review, 'review'), findings: ['conflicting retry'] }),
            );
            await Promise.resolve(
              expect(publicRun([...expected(currentVersion), '--report', conflictingReportPath])).rejects.toThrow(
                /changed report retry conflicts/u,
              ),
            );
            expect(fixture.store.readHostStateSnapshot(fixture.identity)).toEqual(hostBeforeConflict);
            expect(fixture.store.readFinalAssurance(fixture.identity, 1)).toEqual(finalBeforeConflict);
          }
          if (index < issuedReviews.length - 1) {
            expect(reported.assurance_status).toBe('issued_outcome_uncertain');
            expect(reported.next_actions).toEqual([]);
          } else {
            assert.ok(Array.isArray(reported.next_actions));
            const reportedReverseActions = reported.next_actions.map((action) =>
              requireRecord(action, 'third-review response reverse action'),
            );
            expect(reportedReverseActions.map((action) => [action.kind, action.perspective])).toEqual([
              ['reverse', 'correctness'],
              ['reverse', 'security'],
              ['reverse', 'assurance'],
            ]);
            const hostBeforeRetry = fixture.store.readHostStateSnapshot(fixture.identity),
              finalBeforeRetry = fixture.store.readFinalAssurance(fixture.identity, 1),
              retry = await publicRun([...expected(expectedBeforeReport), '--report', reportPath]);
            assert.ok(finalBeforeRetry);
            expect(finalBeforeRetry.version).toEqual(reported.state_version);
            expect(retry.status).toBe('assurance_report_retrieved');
            expect(retry.state_version).toEqual(finalBeforeRetry.version);
            expect(retry.assurance_status).toBe('ready');
            expect(retry.next_actions).toEqual(reported.next_actions);
            expect(fixture.store.readHostStateSnapshot(fixture.identity)).toEqual(hostBeforeRetry);
            expect(fixture.store.readFinalAssurance(fixture.identity, 1)).toEqual(finalBeforeRetry);
            finalReviewResult = retry;
          }
        }
        assert.ok(finalReviewResult);
        expect(finalReviewResult.assurance_status).toBe('ready');
        assert.ok(Array.isArray(finalReviewResult.next_actions));
        const reverseActions = finalReviewResult.next_actions.map((action) =>
          requireRecord(action, 'public next final assurance reverse action'),
        );
        expect(reverseActions.map((action) => [action.kind, action.perspective])).toEqual([
          ['reverse', 'correctness'],
          ['reverse', 'security'],
          ['reverse', 'assurance'],
        ]);
        for (const reverse of reverseActions) {
          expect(reverse.issue_id).toBeNull();
          expect(reverse.target_agent_id).toBeNull();
          expect(reverse.tool).toBe('followup_task');
          const review = requireRecord(reverse.review, 'perspective-bound accepted review');
          expect(review.schema).toBe('FinalAssuranceReview/v1');
          expect(review.perspective).toBe(reverse.perspective);
          expect(review.verdict).toBe('pass');
          expect(review.action_id).toBe(
            issuedReviews.find((candidate) => candidate.perspective === reverse.perspective)?.action_id,
          );
          expect(review.issue_id).toBe(
            issuedReviews.find((candidate) => candidate.perspective === reverse.perspective)?.issue_id,
          );
        }
        const issueReverses = await publicRun([...expected(currentVersion), '--issue-wave', 'true']);
        expect(issueReverses.status).toBe('assurance_wave_issued');
        assert.ok(Array.isArray(issueReverses.issued_actions));
        const issuedReverses = issueReverses.issued_actions.map((action) =>
          requireRecord(action, 'issued final assurance reverse'),
        );
        expect(issuedReverses.map((action) => [action.kind, action.perspective])).toEqual([
          ['reverse', 'correctness'],
          ['reverse', 'security'],
          ['reverse', 'assurance'],
        ]);
        currentVersion = requireStateVersion(issueReverses.state_version);
        let reverseResult: Record<string, unknown> | undefined;
        for (const [index, reverse] of issuedReverses.entries()) {
          const acceptedReview = requireRecord(
            fixture.store
              .readFinalAssurance(fixture.identity, 1)
              ?.state.actions.find((action) => action.kind === 'review' && action.perspective === reverse.perspective)
              ?.observation,
            'persisted perspective review observation',
          );
          expect(reverse.target_agent_id).toBe(acceptedReview.agent_id);
          const reportPath = reportPathFor('final-reverse', reverse);
          writeFileSync(reportPath, JSON.stringify(reportBody(reverse, 'reverse', acceptedReview)));
          const reported = await publicRun([...expected(currentVersion), '--report', reportPath]);
          expect(reported.delivery_gap).toBeNull();
          expect(reported.status).toBe(index === issuedReverses.length - 1 ? 'delivery' : 'assurance_reported');
          currentVersion = requireStateVersion(reported.state_version);
          reverseResult = reported;
        }
        assert.ok(reverseResult);
        expect(reverseResult.assurance_status).toBe('reviewed');
        const finalAssurance = fixture.store.readFinalAssurance(fixture.identity, 1);
        assert.ok(finalAssurance);
        expect(finalAssurance.version).toEqual(currentVersion);
        expect(finalAssurance.state.actions.every((action) => action.issue_id && action.observation)).toBe(true);
        for (const action of finalAssurance.state.actions) {
          const observation = action.observation;
          assert.ok(observation);
          if (typeof action.issue_id !== 'string') throw new Error('Persisted assurance issue ID is absent.');
          expect(observation.action_id).toBe(action.action_id);
          expect(observation.issue_id).toBe(action.issue_id);
          if (action.kind === 'reverse') {
            if (observation.schema !== 'FinalAssuranceReverse/v1')
              throw new Error('Persisted reverse action has a non-reverse observation.');
            const pairedReview = finalAssurance.state.actions.find(
              (candidate) => candidate.kind === 'review' && candidate.perspective === action.perspective,
            );
            if (!pairedReview || typeof pairedReview.issue_id !== 'string' || !pairedReview.observation)
              throw new Error('Persisted reverse action lacks its accepted review binding.');
            expect(observation.schema).toBe('FinalAssuranceReverse/v1');
            expect(observation.review_action_id).toBe(pairedReview.action_id);
            expect(observation.review_issue_id).toBe(pairedReview.issue_id);
          }
        }
        const completedHost = fixture.store.readHostStateSnapshot(fixture.identity);
        assert.ok(completedHost.work);
        expect(completedHost.work.lifecycle.phase).toBe('DELIVERY');
        const deliveryManifest = requireRecord(reverseResult.delivery_manifest, 'public delivery manifest');
        const deliveryReference = completedHost.work.lifecycle.references.find(
          (reference) => reference.kind === 'delivery_manifest' && reference.disposition === 'current',
        );
        assert.ok(deliveryReference);
        assert.ok(typeof deliveryManifest.path === 'string');
        expect(deliveryReference.path).toBe(deliveryManifest.path);
        markInitialSourceTimingPhase('case.assurance.complete');
        const witnessHost = fixture.store.readHostStateSnapshot(fixture.identity);
        const witnessGeneration = 'fixture-completed-delivery';
        const payloadManifest = Buffer.from(
          JSON.stringify({
            schema: 'FixtureEvidencePayload/v1',
            journal: terminalJournal.version,
            runtime_acceptance: false,
          }),
        );
        const payloadManifestPath = path.join(fixture.root, 'fixture-evidence-payload.json');
        writeFileSync(payloadManifestPath, payloadManifest, { flag: 'wx' });
        const payloadManifestSha256 = createHash('sha256').update(payloadManifest).digest('hex');
        const witnessArgs = [
          ...runArgs,
          '--export-staged-witness',
          witnessGeneration,
          '--payload-manifest-sha256',
          payloadManifestSha256,
        ];
        const exported = requireRecord(await runSuccessfully(witnessArgs), 'completed staged witness export');
        expect(exported.status).toBe('staged_witness_exported');
        const exportDirectory = path.join(fixture.root, '.agent', 'cutover', witnessGeneration);
        const witnessBytes = readFileSync(path.join(exportDirectory, 'witness.json'));
        const witness = requireRecord(parseJsonUnknown(witnessBytes.toString('utf8')), 'native staged witness');
        expect(witness).toMatchObject({
          schema: 'VidaStagedRuntimeWitness/v1',
          payload_manifest_sha256: payloadManifestSha256,
          work_id: fixture.identity.work_id,
          attempt: 1,
          run_id: terminalJournal.state.run_id,
          ledger_revision: terminalJournal.version.revision,
          ledger_digest: terminalJournal.version.digest,
          mastra_status: 'success',
        });
        expect(witness.ledger_state).toEqual(terminalJournal.state);
        const witnessEvidenceBytes = readFileSync(path.join(exportDirectory, 'staged_runtime.json'));
        expect(exported.path).toBe(`.agent/cutover/${witnessGeneration}/staged_runtime.json`);
        expect(exported.sha256).toBe(createHash('sha256').update(witnessEvidenceBytes).digest('hex'));
        const witnessEvidence = requireRecord(
          parseJsonUnknown(witnessEvidenceBytes.toString('utf8')),
          'staged witness evidence',
        );
        expect(witnessEvidence.witness).toEqual({
          path: `.agent/cutover/${witnessGeneration}/witness.json`,
          sha256: createHash('sha256').update(witnessBytes).digest('hex'),
        });
        const expectedObservations = terminalJournal.state.completed.flatMap((wave) =>
          wave.items.map((item) => item.observation),
        );
        assert.ok(Array.isArray(witnessEvidence.observations));
        expect(witnessEvidence.observations).toHaveLength(expectedObservations.length);
        for (const [index, reference] of witnessEvidence.observations.entries()) {
          const ref = requireRecord(reference, 'staged observation reference');
          expect(ref.path).toBe(`.agent/cutover/${witnessGeneration}/observation-${index}.json`);
          const bytes = readFileSync(path.join(exportDirectory, `observation-${index}.json`));
          expect(ref.sha256).toBe(createHash('sha256').update(bytes).digest('hex'));
          expect(parseJsonUnknown(bytes.toString('utf8'))).toEqual(expectedObservations[index]);
        }
        const exportBeforeRetry = snapshotAuthorityFixture(exportDirectory);
        await assert.rejects(run(witnessArgs), { code: 'EEXIST' });
        expect(snapshotAuthorityFixture(exportDirectory)).toEqual(exportBeforeRetry);
        expect(readFileSync(payloadManifestPath)).toEqual(payloadManifest);
        expect(fixture.store.readHostStateSnapshot(fixture.identity)).toEqual(witnessHost);
        expect(fixture.ledger.resume(fixture.identity.work_id, 1)).toEqual(terminalJournal);
        markInitialSourceTimingPhase('case.export.complete');
        pendingAssuranceIssue = false;
        completed = true;
      } finally {
        fixture?.close(() => completed && !pendingAssuranceIssue);
      }
    }, 90_000);

    test('accepts a changed initial Source writer report through public run', async () => {
      let root: string | undefined;
      let fixture: Awaited<ReturnType<typeof createInitialSourceWorkFixture>> | undefined;
      let completed = false;
      let clockHeld = false;
      const failures: unknown[] = [];
      try {
        fixture = await createInitialSourceWorkFixture({ onRoot: (value) => (root = value) });
        const sourceFixture = fixture;
        const input = admittedInput(sourceFixture);
        const clockFloor = expiredOwnerTime(sourceFixture);
        setSystemTime(new Date(clockFloor));
        clockHeld = true;
        await prepareInitialSourceFrontier(sourceFixture, 'writer');
        const originalReceipt = sourceFixture.store?.readInitialSourceContinuationReceipt(sourceFixture.identity, 1);
        assert.ok(originalReceipt);
        const issued = await issueInitialSourceFixtureWriter(sourceFixture);
        const before = continuationState(sourceFixture);
        const item = before.journal.items[0];
        const sourceScope = before.journal.source_scope;
        assert.ok(item?.issue_id && sourceScope && sourceFixture.store);
        expect(item.issue_id).toBe(issued.writer.issue_id);
        expect(item.host_reservation?.approvalAction).toBe('source.write');
        expect(item.host_reservation?.receipt.attempt.attempt_id).toBe(issued.hostAttemptId);
        expect(item.request.scope_digest).toBe(originalReceipt.request.currentSourceScope.digest);
        expect(sourceScope.digest).toBe(originalReceipt.request.currentSourceScope.digest);
        const projectId = sourceFixture.identity.project_ids[0];
        assert.ok(projectId);
        const args = [
          '--project-root',
          sourceFixture.root,
          '--repository',
          sourceFixture.config.repository.repository_id,
          '--project',
          projectId,
          '--work-path',
          sourceFixture.documents[0],
          '--work-id',
          sourceFixture.identity.work_id,
          '--attempt',
          '1',
          '--scope-digest',
          originalReceipt.request.currentSourceScope.digest,
          '--team',
          input.selection.team,
          '--kind',
          input.selection.kind,
          '--intent',
          input.selection.intent,
          '--workflow',
          'task_execution',
        ];
        const expected = (version: StateVersion) => [
          '--expected-revision',
          String(version.revision),
          '--expected-digest',
          version.digest,
        ];
        const changedPath = sourceFixture.documents[0];
        const sourceAuthorizationReference = before.work.lifecycle.references.find(
          (reference) =>
            reference.kind === 'execution_approval' &&
            reference.artifact_schema === 'LocalSourceWriteAuthorization/v1' &&
            reference.disposition === 'current' &&
            reference.decision === 'approved',
        );
        assert.ok(sourceAuthorizationReference);
        const sourceAuthorizationBytes = readFileSync(path.join(sourceFixture.root, sourceAuthorizationReference.path));
        expect(createHash('sha256').update(sourceAuthorizationBytes).digest('hex')).toBe(
          sourceAuthorizationReference.sha256,
        );
        const sourceAuthorization = requireRecord(
          parseJsonUnknown(sourceAuthorizationBytes.toString('utf8')),
          'initial Source writer authorization',
        );
        expect(sourceAuthorization.scope_digest).not.toBe(before.work.binding.work_source_revision);
        await assert.rejects(
          run([
            ...args,
            ...expected(before.journalVersion),
            '--renew-lease',
            'true',
            '--native-session-handle',
            input.nativeSessionHandle,
            '--lease-generation',
            String(workLease(before.work).generation),
          ]),
          { code: 'GAP-VIDA-RUN-CONTEXT-001', message: 'Writer heartbeat source authority changed.' },
        );
        expect(continuationState(sourceFixture)).toEqual(before);
        writeFileSync(
          path.join(sourceFixture.root, changedPath),
          readFileSync(path.join(sourceFixture.root, changedPath), 'utf8') + 'public initial-source writer report\n',
        );
        const sourceAfter = snapshotDeclaredSources(
          requireSafeRepositoryAccess(sourceFixture.root),
          sourceFixture.documents,
        );
        const changedPaths = compareScopedSourceSnapshots(sourceScope, sourceAfter)
          .map((change) => change.path)
          .sort();
        expect(changedPaths).toEqual([changedPath]);
        const reportPath = path.join(
          sourceFixture.root,
          '.agent',
          'work',
          sourceFixture.identity.work_id,
          'initial-source-writer-report.json',
        );
        const summary = 'The issued initial Source writer changed one implementation path.';
        const observation: SessionBridgeObservation = {
          schema: 'VidaSessionObservation/v1',
          action_id: item.request.action_id,
          issue_id: item.issue_id,
          host_attempt_id: issued.hostAttemptId,
          agent_id: 'fixture:initial-source-public-writer',
          tool_call_ref: 'fixture:initial-source-public-writer-call',
          status: 'reported_complete',
          summary,
          output_digest: canonicalJsonDigest(summary),
          changed_paths: changedPaths,
          evidence_refs: ['fixture://initial-source-public-writer'],
        };
        await assert.rejects(
          run([...args, ...expected(before.journalVersion), '--issue-wave', 'true']),
          /Initial Source continuation does not match the current scoped Source snapshot/,
        );
        expect(continuationState(sourceFixture)).toEqual(before);
        const foreignReportPath = path.join(path.dirname(reportPath), 'initial-source-writer-foreign-report.json');
        writeFileSync(
          foreignReportPath,
          JSON.stringify({ ...observation, action_id: canonicalJsonDigest('foreign initial-source action') }),
          { flag: 'wx' },
        );
        await assert.rejects(
          run([...args, ...expected(before.journalVersion), '--report', foreignReportPath]),
          /Initial Source continuation does not match the current scoped Source snapshot/,
        );
        expect(continuationState(sourceFixture)).toEqual(before);
        writeFileSync(reportPath, JSON.stringify(observation), { flag: 'wx' });
        const raw = requireRecord(
          await runSuccessfully([...args, ...expected(before.journalVersion), '--report', reportPath]),
          'accepted public initial Source writer report',
        );
        const result = parseTestRunPayload(raw);
        expect(raw.mastra_run_id).toBe(before.work.execution.run_id);
        const after = continuationState(sourceFixture);
        expect(result.state_version).toEqual(after.journalVersion);
        expect(sourceFixture.store.readInitialSourceContinuationReceipt(sourceFixture.identity, 1)).toEqual(
          originalReceipt,
        );
        const observedItem = [...after.journal.completed.flatMap((wave) => wave.items), ...after.journal.items].find(
          (candidate) => candidate.request.action_id === item.request.action_id,
        );
        expect(observedItem?.observation).toEqual(observation);
        const completedAttempt = after.work.execution.assignment_attempts.find(
          (attempt) => attempt.attempt_id === issued.hostAttemptId,
        );
        expect(completedAttempt).toMatchObject({
          status: 'completed',
          result: observation,
          result_digest: canonicalJsonDigest(observation),
        });
        expect(after.journal.source_scope).toEqual(sourceAfter);
        expect(after.work.execution.run_id).toBe(before.work.execution.run_id);
        expect(
          after.ledger.claims.some(
            (claim) => claim.status === 'active' && claim.resources.some((resource) => resource.startsWith('file:')),
          ),
        ).toBe(false);
        const reportBytes = readFileSync(reportPath);
        const retried = requireRecord(
          await runSuccessfully([...args, ...expected(after.journalVersion), '--report', reportPath]),
          'retried public initial Source writer report',
        );
        expect(retried.mastra_run_id).toBe(before.work.execution.run_id);
        expect(continuationState(sourceFixture)).toEqual(after);
        expect(readFileSync(reportPath).equals(reportBytes)).toBe(true);
        completed = true;
      } catch (error) {
        failures.push(error);
      } finally {
        try {
          await fixture?.close();
        } catch (error) {
          failures.push(error);
        }
        try {
          if (clockHeld) setSystemTime();
        } catch (error) {
          failures.push(error);
        }
      }
      if (failures.length > 0 || !completed) {
        if (root) process.stderr.write(`Retained failed initial Source public report fixture: ${root}\n`);
        if (failures.length === 1) throw failures[0];
        if (failures.length > 1)
          throw new AggregateError(failures, 'Initial Source public report assertions or resource close failed');
        throw new Error('Initial Source public report fixture did not complete');
      }
      if (root) rmSync(root, { recursive: true, force: true });
    }, 60_000);

    test('recovers an authorized source lease after accepted research through public run', async () => {
      let root: string | undefined;
      let fixture: Awaited<ReturnType<typeof createInitialSourceWorkFixture>> | undefined;
      let completed = false;
      try {
        fixture = await createInitialSourceWorkFixture({
          researchSynthesis: true,
          onRoot: (value) => (root = value),
        });
        const sourceFixture = fixture;
        const input = admittedInput(sourceFixture);
        const initial = continuationState(sourceFixture);
        const initialSourceScope = initial.journal.source_scope;
        assert.ok(initialSourceScope && sourceFixture.store && sourceFixture.bridge && sourceFixture.ledger);
        expect(initial.work.lifecycle.phase).toBe('INTAKE');
        expect(initial.work.execution.assignment_attempts).toEqual([]);
        const initialAuthority = initial.work.lifecycle.references.find(
          (reference) =>
            reference.kind === 'execution_approval' &&
            reference.artifact_schema === 'LocalSourceWriteAuthorization/v1' &&
            reference.disposition === 'current' &&
            reference.decision === 'approved',
        );
        assert.ok(initialAuthority);
        const initialAuthorityBytes = readFileSync(path.join(sourceFixture.root, initialAuthority.path));
        expect(createHash('sha256').update(initialAuthorityBytes).digest('hex')).toBe(initialAuthority.sha256);
        const projectId = sourceFixture.identity.project_ids[0];
        assert.ok(projectId);
        const args = [
          '--project-root',
          sourceFixture.root,
          '--repository',
          sourceFixture.config.repository.repository_id,
          '--project',
          projectId,
          '--work-path',
          sourceFixture.documents[0],
          '--work-id',
          sourceFixture.identity.work_id,
          '--attempt',
          '1',
          '--scope-digest',
          initialSourceScope.digest,
          '--team',
          input.selection.team,
          '--kind',
          input.selection.kind,
          '--intent',
          input.selection.intent,
          '--workflow',
          'task_execution',
        ];
        await bindControlledRuntimeInitialization(sourceFixture.root, sourceFixture.config, sourceFixture.store);
        await sourceFixture.bridge.close();
        sourceFixture.bridge = null;
        sourceFixture.ledger.close();
        sourceFixture.ledger = null;
        sourceFixture.database?.close(true);
        sourceFixture.database = null;
        sourceFixture.store = null;

        const expected = (version: StateVersion) => [
          '--expected-revision',
          String(version.revision),
          '--expected-digest',
          version.digest,
        ];
        const prepared = parseTestRunPayload(await run(args));
        const preparedVersion = requireStateVersion(prepared.state_version);
        const issued = parseTestRunPayload(await run([...args, ...expected(preparedVersion), '--issue-wave', 'true']));
        const issuedActions = requireIssuedActions(issued);
        expect(issuedActions).toHaveLength(1);
        const issuedAction = issuedActions[0];
        assert.ok(issuedAction?.issue_id);
        expect(issuedAction.action.stage_id).toBe('research_parallel');
        const issuedVersion = requireStateVersion(issued.state_version);
        const sourceEntry = initialSourceScope.entries[0];
        assert.ok(sourceEntry);
        const sourceId = 'accepted-initial-source';
        const summary = JSON.stringify({
          schema: 'VidaResearchObservationOutput/v1',
          topic: 'Initial source recovery prerequisite',
          objective: 'Accept the read-only research prerequisite.',
          question: 'What does the admitted fixture document support?',
          source_refs: [
            {
              source_id: sourceId,
              source_kind: 'internal',
              locator: sourceEntry.path,
              title: 'Admitted fixture document',
              claim: 'AC-INITIAL-SOURCE SR-INITIAL-SOURCE: the accepted source supports the initial work item.',
              retrieved_at: '2026-10-07T00:00:00Z',
              version_or_date: '2026-10-07',
              independence_group: 'fixture',
              digest: sourceEntry.sha256,
            },
          ],
          findings: [
            {
              finding_id: 'accepted-initial-source',
              statement: 'The admitted fixture document is present.',
              source_ids: [sourceId],
              evidence_class: 'Code',
              status: 'confirmed',
            },
          ],
          uncertainties: [],
          conflicts: [],
          evidence_classes: ['Code'],
          br_ids: [],
          sr_ids: ['SR-INITIAL-SOURCE'],
          ac_ids: ['AC-INITIAL-SOURCE'],
          gap_ids: [],
          options: [
            {
              option_id: 'retain',
              label: 'Retain accepted evidence',
              description: 'Use the bounded read-only result.',
              evidence_refs: [sourceId],
            },
          ],
          recommendation: {
            option_id: 'retain',
            rationale: 'The admitted fixture document supports the result.',
            evidence_refs: [sourceId],
          },
          completeness: {
            status: 'pass',
            required_questions: ['What does the admitted fixture document support?'],
            answered_questions: ['What does the admitted fixture document support?'],
            missing_questions: [],
            material_gaps: [],
            external_validation: {
              required: false,
              source_count: 0,
              minimum_sources: 0,
              status: 'not_required',
              live_check: null,
            },
          },
          readiness: 'informational',
        });
        const reportPath = path.join(
          sourceFixture.root,
          '.agent',
          'work',
          sourceFixture.identity.work_id,
          'initial-research-report.json',
        );
        writeFileSync(
          reportPath,
          JSON.stringify({
            schema: 'VidaSessionObservation/v1',
            action_id: issuedAction.action.action_id,
            issue_id: issuedAction.issue_id,
            agent_id: 'fixture:accepted-researcher',
            tool_call_ref: 'fixture:accepted-initial-source-research',
            status: 'reported_complete',
            summary,
            output_digest: canonicalJsonDigest(summary),
            evidence_refs: [sourceId],
          }),
        );
        const reported = requireRecord(
          await run([...args, ...expected(issuedVersion), '--report', reportPath]),
          'accepted initial research report',
        );
        expect(reported.resume_status).toBe('ready');

        const workspaceId = deriveWorkspaceId(sourceFixture.config.repository.repository_id, sourceFixture.root);
        const databaseRelativePath = path.relative(
          sourceFixture.root,
          sessionHandoffDatabasePath(sourceFixture.root, sourceFixture.config),
        );
        const inspectRecoveryState = () =>
          inspectHostWorkspaceDatabase(sourceFixture.root, databaseRelativePath, workspaceId);
        const beforeRecovery = inspectRecoveryState();
        const recoveryWork = beforeRecovery.work[0];
        const recoveryJournal = beforeRecovery.journals[0];
        assert.ok(recoveryWork?.state.lease && beforeRecovery.ledger && recoveryJournal);
        const recoveryLease = recoveryWork.state.lease;
        const recoveryTicket = beforeRecovery.ledger.tickets.find(
          (ticket) => ticket.ticket_id === recoveryLease.ticket_id,
        );
        assert.ok(recoveryTicket?.expires_at);
        const recoveryClaims = beforeRecovery.ledger.claims.filter(
          (claim) => claim.ticket_id === recoveryLease.ticket_id && claim.status === 'active',
        );
        expect(recoveryClaims).toHaveLength(1);
        expect(recoveryClaims[0]).toMatchObject({
          work_id: recoveryWork.identity.work_id,
          thread_id: recoveryLease.thread_id,
          generation: recoveryLease.generation,
          lease_expires_at: recoveryTicket.expires_at,
        });
        expect(recoveryWork.state.lifecycle.phase).toBe('INTAKE');
        expect(recoveryWork.state.execution.assignment_attempts).toEqual([]);
        expect(recoveryJournal.state.completed.length).toBeGreaterThan(0);
        expect(
          recoveryJournal.state.completed.every(
            (wave) =>
              wave.items.length > 0 &&
              wave.items.every(
                (item) =>
                  item.issue_id !== null &&
                  item.observation?.status === 'reported_complete' &&
                  item.host_reservation === undefined &&
                  item.research_normalization !== undefined,
              ),
          ),
        ).toBe(true);
        expect(
          recoveryJournal.state.items.every(
            (item) => item.issue_id === null && item.observation === null && item.host_reservation === undefined,
          ),
        ).toBe(true);
        const approvedAuthority = recoveryWork.state.lifecycle.references.find(
          (reference) =>
            reference.kind === 'execution_approval' &&
            reference.artifact_schema === 'LocalSourceWriteAuthorization/v1' &&
            reference.disposition === 'current' &&
            reference.decision === 'approved',
        );
        assert.ok(approvedAuthority);
        expect(approvedAuthority.sha256).toBe(initialAuthority.sha256);
        const recoveryVersion = recoveryJournal.version;
        const recoveryExpiresAt = expiredOwnerTime(sourceFixture, {
          work: recoveryWork.state,
          ledger: beforeRecovery.ledger,
        });
        try {
          setSystemTime(new Date(recoveryExpiresAt));
          const recovered = requireRecord(
            await run([
              ...args,
              ...expected(recoveryVersion),
              '--recover-expired-lease',
              'true',
              '--rebind-current-bundle',
              'true',
              '--native-session-handle',
              input.nativeSessionHandle,
              '--lease-generation',
              String(recoveryLease.generation),
            ]),
            'authorized expired initial-source recovery',
          );
          expect(recovered.status).toBe('inspected');
          expect(recovered.work_id).toBe(sourceFixture.identity.work_id);
          const afterRecovery = inspectRecoveryState();
          const recoveredWork = afterRecovery.work[0];
          assert.ok(recoveredWork?.state.lease && afterRecovery.journals[0] && afterRecovery.ledger);
          expect(recoveredWork.state.lease.thread_id).toBe(recoveryLease.thread_id);
          expect(recoveredWork.state.lease.generation).toBe(recoveryLease.generation);
          expect(recoveredWork.state.lease.ticket_id).not.toBe(recoveryLease.ticket_id);
          const retiredTicket = afterRecovery.ledger.tickets.find(
            (ticket) => ticket.ticket_id === recoveryLease.ticket_id,
          );
          const retiredClaim = afterRecovery.ledger.claims.find((claim) => claim.ticket_id === recoveryLease.ticket_id);
          const successorTicket = afterRecovery.ledger.tickets.find(
            (ticket) => ticket.ticket_id === recoveredWork.state.lease!.ticket_id,
          );
          const successorClaims = afterRecovery.ledger.claims.filter(
            (claim) => claim.ticket_id === recoveredWork.state.lease!.ticket_id && claim.status === 'active',
          );
          const rebind = afterRecovery.ledger.rebinds.find(
            (entry) => entry.previous_ticket_id === recoveryLease.ticket_id,
          );
          expect({ retiredTicket: retiredTicket?.status, retiredClaim: retiredClaim?.status }).toEqual({
            retiredTicket: 'read_only',
            retiredClaim: 'recovered',
          });
          expect(successorTicket).toMatchObject({
            status: 'active',
            thread_id: recoveryLease.thread_id,
            generation: beforeRecovery.ledger.open_generation,
          });
          expect(successorClaims).toHaveLength(1);
          expect(successorClaims[0]).toMatchObject({
            work_id: recoveredWork.identity.work_id,
            thread_id: recoveryLease.thread_id,
            generation: beforeRecovery.ledger.open_generation,
            lease_expires_at: successorTicket!.expires_at,
          });
          expect(rebind).toMatchObject({
            previous_ticket_id: recoveryLease.ticket_id,
            ticket_id: recoveredWork.state.lease.ticket_id,
            thread_id: recoveryLease.thread_id,
            decided_by: recoveryLease.thread_id,
            reason: 'expired same-owner quiescent lease recovery',
          });
          expect(afterRecovery.journals[0]!.state).toEqual(recoveryJournal.state);
          expect(afterRecovery.admission_attempts).toEqual(beforeRecovery.admission_attempts);
          completed = true;
        } finally {
          setSystemTime();
        }
      } finally {
        try {
          await fixture?.close();
        } finally {
          if (root && completed) rmSync(root, { recursive: true, force: true });
          else if (root) process.stderr.write(`Retained authorized recovery fixture: ${root}\n`);
        }
      }
    }, 60_000);

    for (const selectorPhase of ['released', 'staged'] as const) {
      test(`binds admission to the ${selectorPhase} journal and released maintenance proof`, async () => {
        const root = mkdtempSync(path.join(tmpdir(), 'vida-run-selected-'));
        const dependenciesLink = path.join(root, 'vida-agent', 'node_modules');
        const fixture = ownedMutationFixture(root, 90_000, path.join(root, 'vida-agent'));
        let completed = false;
        try {
          const { args, config } = createFixture(root, 'vida-agent');
          const admitted = prepareMutationIntake(args, config);
          const generation = `selected-${randomUUID()}`;
          const generationRoot = path.join(root, '.agent', 'cutover', generation);
          mkdirSync(generationRoot, { recursive: true });
          const selectorIntent = {
            schema: 'ActiveRuntimeSelector/v1',
            generation,
            runtime: 'vida-agent',
            bundle_root: 'vida-agent',
            config_path: 'agent-runtime.config.v1.yaml',
            archive_manifest_sha256: 'a'.repeat(64),
            plan_sha256: 'b'.repeat(64),
            payload_manifest_sha256: 'c'.repeat(64),
            state_policy: 'clean_start_no_ticket_transfer',
          };
          const evidence = Object.fromEntries(
            ['parity', 'security', 'assurance', 'rollback', 'dev', 'staged_runtime'].map((kind) => {
              const relativePath = `.agent/cutover/${generation}/${kind}-evidence.json`;
              const bytes = Buffer.from(record({ schema: 'FixtureCutoverEvidence/v1', kind }));
              writeFileSync(path.join(root, ...relativePath.split('/')), bytes);
              return [
                kind,
                {
                  actor: 'fixture',
                  path: relativePath,
                  pointer: `fixture:${kind}`,
                  sha256: createHash('sha256').update(bytes).digest('hex'),
                  status: 'passed',
                },
              ];
            }),
          );
          const activationDecision = {
            schema: 'VidaCutoverActivationDecision/v1',
            actor: 'fixture',
            cutover_id: generation,
            evidence,
            outcome: 'approved',
            payload_manifest_sha256: selectorIntent.payload_manifest_sha256,
            plan_sha256: selectorIntent.plan_sha256,
            pointer: 'fixture:activation',
            selector_intent_sha256: createHash('sha256').update(record(selectorIntent)).digest('hex'),
          };
          const activationDecisionSha256 = createHash('sha256').update(record(activationDecision)).digest('hex');
          const selector = { ...selectorIntent, activation_decision_sha256: activationDecisionSha256 };
          const selectorSha256 = createHash('sha256').update(record(selector)).digest('hex');
          const selectorCommit = {
            schema: 'VidaPreparedSelectorCommit/v1',
            cutover_id: generation,
            plan_sha256: selector.plan_sha256,
            activation_decision_sha256: selector.activation_decision_sha256,
            selector_sha256: selectorSha256,
          };
          const journal = {
            schema: 'VidaPreparedInstallJournal/v1',
            cutover_id: generation,
            plan_sha256: selector.plan_sha256,
            archive_manifest_sha256: selector.archive_manifest_sha256,
            payload_manifest_sha256: selector.payload_manifest_sha256,
            state_policy: selector.state_policy,
            status: 'installing',
          };
          const ready = {
            schema: 'VidaPreparedInstallReady/v1',
            cutover_id: generation,
            plan_sha256: selector.plan_sha256,
            state_policy: selector.state_policy,
            status: 'ready_for_selector',
          };
          const releasedLock = {
            schema: 'VidaCutoverMaintenanceLock/v1',
            cutover_id: generation,
            operator: 'test',
            attestation: 'old_runtime_quiesced',
            plan_sha256: selector.plan_sha256,
            archive_manifest_sha256: selector.archive_manifest_sha256,
            payload_manifest_sha256: selector.payload_manifest_sha256,
            expected_file_count: 0,
            archive_manifest: { manifest_sha256: selector.archive_manifest_sha256 },
            plan: { schema: 'VidaPreparedInstallPlan/v1', plan_sha256: selector.plan_sha256 },
            state_policy: selector.state_policy,
            activation_decision_path: `.agent/cutover/${generation}/activation-decision.v1.json`,
            activation_decision_sha256: selector.activation_decision_sha256,
          };
          const release = {
            schema: 'VidaCutoverMaintenanceRelease/v1',
            cutover_id: generation,
            operator: 'test',
            lock_sha256: createHash('sha256').update(record(releasedLock)).digest('hex'),
            status: 'released_by_explicit_operator_action',
          };
          const records: readonly (readonly [string, Record<string, unknown>, Record<string, unknown>])[] = [
            ['prepared-install.json', journal, { plan_sha256: 'd'.repeat(64) }],
            ['install-ready.json', ready, { status: 'not-ready' }],
            ['maintenance-lock.released.v1.json', releasedLock, { cutover_id: 'other-generation' }],
            ['maintenance-release.v1.json', release, { lock_sha256: 'd'.repeat(64) }],
          ];
          writeFileSync(path.join(root, '.agent', 'active-runtime-selector.v1.json'), record(selector));
          for (const [name, value] of records) writeFileSync(path.join(generationRoot, name), record(value));
          writeFileSync(path.join(generationRoot, 'activation-decision.v1.json'), record(activationDecision));
          writeFileSync(path.join(generationRoot, 'selector-commit.json'), record(selectorCommit));
          writeFileSync(
            path.join(generationRoot, 'cutoff-witness.json'),
            record({
              schema: 'VidaNewWorkCutoffWitness/v1',
              generation,
              selector_sha256: selectorSha256,
              first_admitted_work_attempt: null,
            }),
          );
          const databasePath = path.join(root, config.control.work_root, 'session-handoff.v1.sqlite');
          const bundlePath = path.join(root, 'vida-agent');
          const retainedBundlePath = path.join(root, '.vida-agent-fixture-original');
          const withPackageIdentity = async <T>(action: () => T | Promise<T>): Promise<T> => {
            renameSync(bundlePath, retainedBundlePath);
            let bundleRestored = false;
            try {
              symlinkSync(packageRoot, bundlePath, process.platform === 'win32' ? 'junction' : 'dir');
              return await action();
            } finally {
              const currentBundle = lstatSync(bundlePath, { throwIfNoEntry: false });
              if (currentBundle?.isSymbolicLink()) unlinkSync(bundlePath);
              if (!existsSync(bundlePath)) renameSync(retainedBundlePath, bundlePath);
              bundleRestored =
                existsSync(bundlePath) && !lstatSync(bundlePath).isSymbolicLink() && !existsSync(retainedBundlePath);
              expect(bundleRestored).toBe(true);
            }
          };
          const runWithPackageIdentity = async (expected: { code: string; message: string }, runArgs = admitted.args) =>
            withPackageIdentity(async () => {
              await Promise.resolve(expect(run(runArgs)).rejects.toMatchObject(expected));
            });
          const initializeHostDatabase = () => {
            mkdirSync(path.dirname(databasePath), { recursive: true });
            const database = new Database(databasePath, { strict: true });
            new HostStateStore(
              database,
              deriveWorkspaceId(config.repository.repository_id, root),
              undefined,
              undefined,
              undefined,
              undefined,
              root,
            );
            database.close();
          };
          if (selectorPhase === 'released') {
            const invalidDecision = {
              ...activationDecision,
              evidence: { ...evidence, parity: { ...evidence.parity, unexpected: 'reject-extra-field' } },
            };
            const invalidDecisionSha256 = createHash('sha256').update(record(invalidDecision)).digest('hex');
            const invalidSelector = { ...selector, activation_decision_sha256: invalidDecisionSha256 };
            const invalidSelectorSha256 = createHash('sha256').update(record(invalidSelector)).digest('hex');
            const invalidCommit = {
              ...selectorCommit,
              activation_decision_sha256: invalidDecisionSha256,
              selector_sha256: invalidSelectorSha256,
            };
            const invalidEvidenceSelectorPath = path.join(root, '.agent', 'active-runtime-selector.v1.json');
            const invalidEvidenceDecisionPath = path.join(generationRoot, 'activation-decision.v1.json');
            const invalidEvidenceCommitPath = path.join(generationRoot, 'selector-commit.json');
            writeFileSync(invalidEvidenceSelectorPath, record(invalidSelector));
            writeFileSync(invalidEvidenceDecisionPath, record(invalidDecision));
            writeFileSync(invalidEvidenceCommitPath, record(invalidCommit));
            const beforeInvalidEvidenceRun = snapshotAuthorityFixture(path.join(root, '.agent'));
            expect(existsSync(databasePath)).toBe(false);
            await runWithPackageIdentity({
              code: 'GAP-VIDA-RUN-SELECTOR-001',
              message: 'Prepared cutover decision or selector commit is invalid.',
            });
            expect(snapshotAuthorityFixture(path.join(root, '.agent'))).toEqual(beforeInvalidEvidenceRun);
            expect(existsSync(databasePath)).toBe(false);

            writeFileSync(invalidEvidenceSelectorPath, record(selector));
            writeFileSync(invalidEvidenceDecisionPath, record(activationDecision));
            writeFileSync(invalidEvidenceCommitPath, record(selectorCommit));
            const maintenanceLockPath = path.join(generationRoot, 'maintenance-lock.v1.json');
            writeFileSync(maintenanceLockPath, record({ schema: 'VidaCutoverMaintenanceLock/v1' }));
            const beforeValidEvidenceRun = snapshotAuthorityFixture(path.join(root, '.agent'));
            await runWithPackageIdentity({
              code: 'GAP-VIDA-RUN-SELECTOR-001',
              message: 'Cutover maintenance is still active.',
            });
            expect(snapshotAuthorityFixture(path.join(root, '.agent'))).toEqual(beforeValidEvidenceRun);
            expect(existsSync(databasePath)).toBe(false);
            unlinkSync(maintenanceLockPath);

            initializeHostDatabase();

            const inspectWorkId = `inspect-absent-${randomUUID()}`;
            const inspectArgs = admitted.args.map((value, index) =>
              admitted.args[index - 1] === '--work-id' ? inspectWorkId : value,
            );
            const selectorPath = path.join(root, '.agent', 'active-runtime-selector.v1.json');
            const cutoffPath = path.join(generationRoot, 'cutoff-witness.json');
            const selectorBytes = readFileSync(selectorPath);
            const cutoffBytes = readFileSync(cutoffPath);
            const inspected = fixture.invokeInspection([...inspectArgs, '--inspect', 'true']);
            expect(inspected).toMatchObject({ schema: 'VidaLocalSessionInspection/v1', status: 'inspected' });
            expect(inspected.diagnosis).toMatchObject({ reason: 'session_absent' });
            expect(readFileSync(selectorPath).equals(selectorBytes)).toBe(true);
            expect(readFileSync(cutoffPath).equals(cutoffBytes)).toBe(true);
            expect(
              inspectHostWorkspaceDatabase(
                root,
                path.relative(root, databasePath).replaceAll('\\', '/'),
                deriveWorkspaceId(config.repository.repository_id, root),
              ).admission_attempts,
            ).toEqual([]);
            const databaseRelativePath = path.relative(root, databasePath).replaceAll('\\', '/');
            const workspaceId = deriveWorkspaceId(config.repository.repository_id, root);
            const expectReadOnlyRefusal = async (expected: { code: string; message: string }) => {
              const beforeAuthority = snapshotAuthorityFixture(path.join(root, '.agent'));
              const beforeDatabase = inspectHostWorkspaceDatabase(root, databaseRelativePath, workspaceId);
              expect(beforeDatabase.admission_attempts).toEqual([]);
              await Promise.resolve(expect(run([...inspectArgs, '--inspect', 'true'])).rejects.toMatchObject(expected));
              expect(snapshotAuthorityFixture(path.join(root, '.agent'))).toEqual(beforeAuthority);
              expect(inspectHostWorkspaceDatabase(root, databaseRelativePath, workspaceId)).toEqual(beforeDatabase);
            };
            await withPackageIdentity(async () => {
              const preparedInstallPath = path.join(generationRoot, 'prepared-install.json');
              const preparedInstallBytes = readFileSync(preparedInstallPath);
              const activationDecisionPath = path.join(generationRoot, 'activation-decision.v1.json');
              const activationDecisionBytes = readFileSync(activationDecisionPath);
              const selectorCommitPath = path.join(generationRoot, 'selector-commit.json');
              const selectorCommitBytes = readFileSync(selectorCommitPath);
              const releasedLockPath = path.join(generationRoot, 'maintenance-lock.released.v1.json');
              const releasedLockBytes = readFileSync(releasedLockPath);
              const maintenanceReleasePath = path.join(generationRoot, 'maintenance-release.v1.json');
              const maintenanceReleaseBytes = readFileSync(maintenanceReleasePath);
              try {
                writeFileSync(selectorPath, record({ ...selector, state_policy: 'forward_only_preserve_work' }));
                await expectReadOnlyRefusal({
                  code: 'GAP-VIDA-RUN-SELECTOR-001',
                  message: 'Prepared selector is incomplete.',
                });
                writeFileSync(selectorPath, selectorBytes);

                const incompleteJournal = { ...journal, status: 'not-installing' };
                writeFileSync(preparedInstallPath, record(incompleteJournal));
                await expectReadOnlyRefusal({
                  code: 'GAP-VIDA-RUN-SELECTOR-001',
                  message: 'Prepared cutover journal is incomplete.',
                });
                writeFileSync(preparedInstallPath, preparedInstallBytes);

                writeFileSync(selectorPath, record(invalidSelector));
                writeFileSync(activationDecisionPath, record(invalidDecision));
                writeFileSync(selectorCommitPath, record(invalidCommit));
                await expectReadOnlyRefusal({
                  code: 'GAP-VIDA-RUN-SELECTOR-001',
                  message: 'Prepared cutover decision or selector commit is invalid.',
                });

                const invalidDecisionShape = { ...activationDecision, unexpected: 'reject-extra-field' };
                const invalidDecisionShapeSha256 = createHash('sha256')
                  .update(record(invalidDecisionShape))
                  .digest('hex');
                const invalidShapeSelector = {
                  ...selector,
                  activation_decision_sha256: invalidDecisionShapeSha256,
                };
                const invalidShapeSelectorSha256 = createHash('sha256')
                  .update(record(invalidShapeSelector))
                  .digest('hex');
                const invalidShapeCommit = {
                  ...selectorCommit,
                  activation_decision_sha256: invalidDecisionShapeSha256,
                  selector_sha256: invalidShapeSelectorSha256,
                };
                const invalidShapeReleasedLock = {
                  ...releasedLock,
                  activation_decision_sha256: invalidDecisionShapeSha256,
                };
                const invalidShapeMaintenanceRelease = {
                  ...release,
                  lock_sha256: createHash('sha256').update(record(invalidShapeReleasedLock)).digest('hex'),
                };
                writeFileSync(selectorPath, record(invalidShapeSelector));
                writeFileSync(activationDecisionPath, record(invalidDecisionShape));
                writeFileSync(selectorCommitPath, record(invalidShapeCommit));
                writeFileSync(releasedLockPath, record(invalidShapeReleasedLock));
                writeFileSync(maintenanceReleasePath, record(invalidShapeMaintenanceRelease));
                await expectReadOnlyRefusal({
                  code: 'GAP-VIDA-RUN-SELECTOR-001',
                  message: 'Prepared cutover decision or selector commit is invalid.',
                });
              } finally {
                writeFileSync(selectorPath, selectorBytes);
                writeFileSync(preparedInstallPath, preparedInstallBytes);
                writeFileSync(activationDecisionPath, activationDecisionBytes);
                writeFileSync(selectorCommitPath, selectorCommitBytes);
                writeFileSync(releasedLockPath, releasedLockBytes);
                writeFileSync(maintenanceReleasePath, maintenanceReleaseBytes);
              }
              expect(readFileSync(selectorPath).equals(selectorBytes)).toBe(true);
              expect(readFileSync(preparedInstallPath).equals(preparedInstallBytes)).toBe(true);
              expect(readFileSync(activationDecisionPath).equals(activationDecisionBytes)).toBe(true);
              expect(readFileSync(selectorCommitPath).equals(selectorCommitBytes)).toBe(true);
              expect(readFileSync(releasedLockPath).equals(releasedLockBytes)).toBe(true);
              expect(readFileSync(maintenanceReleasePath).equals(maintenanceReleaseBytes)).toBe(true);

              const forwardIntentPath = path.join(generationRoot, 'forward-intent.v1.json');
              expect(existsSync(forwardIntentPath)).toBe(false);
              const beforeForwardAuthority = snapshotAuthorityFixture(path.join(root, '.agent'));
              try {
                writeFileSync(forwardIntentPath, record({ schema: 'WrongForwardUpdateIntent/v1' }));
                writeFileSync(selectorPath, record({ ...selector, state_policy: 'clean_start_no_ticket_transfer' }));
                await expectReadOnlyRefusal({
                  code: 'GAP-VIDA-RUN-SELECTOR-001',
                  message: 'Forward selector is incomplete.',
                });
                writeFileSync(selectorPath, record({ ...selector, state_policy: 'forward_only_preserve_work' }));
                await expectReadOnlyRefusal({
                  code: 'GAP-VIDA-RUN-SELECTOR-001',
                  message: 'Cutover authority has an invalid shape or encoding.',
                });
              } finally {
                writeFileSync(selectorPath, selectorBytes);
                rmSync(forwardIntentPath, { force: true });
              }
              expect(existsSync(forwardIntentPath)).toBe(false);
              expect(snapshotAuthorityFixture(path.join(root, '.agent'))).toEqual(beforeForwardAuthority);

              const repairRecords = [
                ['repair-plan.v1.json', 'VidaActiveLauncherRepairPlan/v1'],
                ['repair-authorization.v1.json', 'VidaActiveLauncherRepairAuthorization/v1'],
                ['repair-decision.v1.json', 'VidaActiveLauncherRepairDecision/v1'],
                ['repair-selector-commit.v1.json', 'VidaActiveLauncherRepairSelectorCommit/v1'],
              ] as const;
              const repairPaths = repairRecords.map(([name]) => path.join(generationRoot, name));
              expect(repairPaths.every((file) => !existsSync(file))).toBe(true);
              const beforeRepairAuthority = snapshotAuthorityFixture(path.join(root, '.agent'));
              try {
                for (const [name, schema] of repairRecords)
                  writeFileSync(path.join(generationRoot, name), record({ schema }));
                const incompleteRepairSelector: Record<string, unknown> = { ...selector };
                delete incompleteRepairSelector.payload_manifest_sha256;
                delete incompleteRepairSelector.state_policy;
                delete incompleteRepairSelector.activation_decision_sha256;
                writeFileSync(selectorPath, record(incompleteRepairSelector));
                await expectReadOnlyRefusal({
                  code: 'GAP-VIDA-RUN-SELECTOR-001',
                  message: 'Repair selector is incomplete.',
                });
                writeFileSync(selectorPath, selectorBytes);
                await expectReadOnlyRefusal({
                  code: 'GAP-VIDA-RUN-SELECTOR-001',
                  message: 'Repair authority is invalid.',
                });
              } finally {
                writeFileSync(selectorPath, selectorBytes);
                for (const file of repairPaths) rmSync(file, { force: true });
              }
              expect(repairPaths.every((file) => !existsSync(file))).toBe(true);
              expect(snapshotAuthorityFixture(path.join(root, '.agent'))).toEqual(beforeRepairAuthority);
            });
            expect(fixture.invoke(admitted.admissionArgs, 0).runtime_selector_observed).toBe(true);
          }
          if (selectorPhase === 'released') {
            for (const [name, value, changed] of records) {
              const file = path.join(generationRoot, name);
              writeFileSync(file, record({ ...value, ...changed }));
              expect(fixture.invoke(admitted.args, 1)).toMatchObject({
                code: 'GAP-VIDA-RUN-SELECTOR-001',
                message:
                  'The active runtime selector or cutover journal is invalid. Next action: inspect the exact work and check its issued contract before retrying.',
              });
              writeFileSync(file, record(value));
            }
            const retainedPath = path.join(generationRoot, 'maintenance-lock.released.v1.json');
            const releasePath = path.join(generationRoot, 'maintenance-release.v1.json');
            const lockFieldChanges: readonly (readonly [string, string])[] = [
              ['cutover_id', 'other-generation'],
              ['plan_sha256', 'd'.repeat(64)],
              ['archive_manifest_sha256', 'd'.repeat(64)],
              ['payload_manifest_sha256', 'd'.repeat(64)],
            ];
            for (const [field, value] of lockFieldChanges) {
              const changedLock = { ...releasedLock, [field]: value };
              writeFileSync(retainedPath, record(changedLock));
              writeFileSync(
                releasePath,
                record({ ...release, lock_sha256: createHash('sha256').update(record(changedLock)).digest('hex') }),
              );
              expect(fixture.invoke(admitted.args, 1)).toMatchObject({
                code: 'GAP-VIDA-RUN-SELECTOR-001',
                message:
                  'The active runtime selector or cutover journal is invalid. Next action: inspect the exact work and check its issued contract before retrying.',
              });
              writeFileSync(retainedPath, record(releasedLock));
              writeFileSync(releasePath, record(release));
            }
            for (const changed of [{ cutover_id: 'other-generation' }, { status: 'not-released' }]) {
              writeFileSync(releasePath, record({ ...release, ...changed }));
              expect(fixture.invoke(admitted.args, 1)).toMatchObject({
                code: 'GAP-VIDA-RUN-SELECTOR-001',
                message:
                  'The active runtime selector or cutover journal is invalid. Next action: inspect the exact work and check its issued contract before retrying.',
              });
              writeFileSync(releasePath, record(release));
            }
            const cutoffPath = path.join(generationRoot, 'cutoff-witness.json');
            const witness = requireRecord(parseJsonUnknown(readFileSync(cutoffPath, 'utf8')), 'cutoff witness');
            unlinkSync(cutoffPath);
            expect(fixture.invoke(admitted.args, 1)).toMatchObject({
              code: 'GAP-VIDA-RUN-CUTOFF-001',
              message:
                'The new-work cutoff witness could not be recorded. Next action: inspect the exact work and check its issued contract before retrying.',
            });
            for (const changed of [
              { generation: 'other-generation' },
              { selector_sha256: 'd'.repeat(64) },
              { first_admitted_work_attempt: '' },
              { first_admitted_work_attempt: 0 },
            ]) {
              writeFileSync(cutoffPath, record({ ...witness, ...changed }));
              expect(fixture.invoke(admitted.args, 1)).toMatchObject({
                code: 'GAP-VIDA-RUN-CUTOFF-001',
                message:
                  'The new-work cutoff witness could not be recorded. Next action: inspect the exact work and check its issued contract before retrying.',
              });
            }
            writeFileSync(cutoffPath, record(witness));
            const cutoffLock = path.join(generationRoot, 'cutoff-witness.lock');
            writeFileSync(cutoffLock, 'held');
            expect(fixture.invoke(admitted.args, 1)).toMatchObject({
              code: 'GAP-VIDA-RUN-CUTOFF-001',
              message:
                'The new-work cutoff witness could not be recorded. Next action: inspect the exact work and check its issued contract before retrying.',
            });
            unlinkSync(cutoffLock);
          }
          writeFileSync(
            path.join(root, '.agent', 'active-runtime-selector.v1.json'),
            record({
              ...selector,
              plan_sha256: 'd'.repeat(64),
            }),
          );
          expect(fixture.invoke(admitted.args, 1)).toMatchObject({
            code: 'GAP-VIDA-RUN-SELECTOR-001',
            message:
              'The active runtime selector or cutover journal is invalid. Next action: inspect the exact work and check its issued contract before retrying.',
          });
          if (selectorPhase === 'staged') {
            const stagedGeneration = `staged-${randomUUID()}`;
            const stagedRoot = path.join(root, '.agent', 'cutover', stagedGeneration);
            mkdirSync(stagedRoot);
            const stagedSelector: Record<string, unknown> = { ...selector, generation: stagedGeneration };
            delete stagedSelector.payload_manifest_sha256;
            delete stagedSelector.state_policy;
            delete stagedSelector.activation_decision_sha256;
            const stagedJournal = {
              schema: 'VidaCutoverStageJournal/v1',
              cutover_id: stagedGeneration,
              plan_sha256: stagedSelector.plan_sha256,
              archive_manifest_sha256: stagedSelector.archive_manifest_sha256,
              selector_sha256: createHash('sha256').update(record(stagedSelector)).digest('hex'),
              status: 'staged',
            };
            const stagedLock: Record<string, unknown> = { ...releasedLock, cutover_id: stagedGeneration };
            delete stagedLock.payload_manifest_sha256;
            const stagedReceipt = {
              ...release,
              cutover_id: stagedGeneration,
              lock_sha256: createHash('sha256').update(record(stagedLock)).digest('hex'),
            };
            const stagedJournalPath = path.join(stagedRoot, 'journal.json');
            const stagedLockPath = path.join(stagedRoot, 'maintenance-lock.released.v1.json');
            const stagedReleasePath = path.join(stagedRoot, 'maintenance-release.v1.json');
            writeFileSync(path.join(root, '.agent', 'active-runtime-selector.v1.json'), record(stagedSelector));
            writeFileSync(stagedJournalPath, record(stagedJournal));
            writeFileSync(stagedLockPath, record(stagedLock));
            writeFileSync(stagedReleasePath, record(stagedReceipt));
            writeFileSync(
              path.join(stagedRoot, 'cutoff-witness.json'),
              record({
                schema: 'VidaNewWorkCutoffWitness/v1',
                generation: stagedGeneration,
                selector_sha256: stagedJournal.selector_sha256,
                first_admitted_work_attempt: null,
              }),
            );
            const stagedArgs = args.map((value, index) =>
              args[index - 1] === '--work-id' ? `mutation-run-${randomUUID()}` : value,
            );
            const stagedAdmitted = prepareMutationIntake(stagedArgs, config);
            initializeHostDatabase();
            const inspectWorkId = `inspect-staged-${randomUUID()}`;
            const inspectArgs = stagedAdmitted.args.map((value, index) =>
              stagedAdmitted.args[index - 1] === '--work-id' ? inspectWorkId : value,
            );
            const selectorPath = path.join(root, '.agent', 'active-runtime-selector.v1.json');
            const cutoffPath = path.join(stagedRoot, 'cutoff-witness.json');
            const selectorBytes = readFileSync(selectorPath);
            const cutoffBytes = readFileSync(cutoffPath);
            const databaseRelativePath = path.relative(root, databasePath).replaceAll('\\', '/');
            const workspaceId = deriveWorkspaceId(config.repository.repository_id, root);
            const beforeDatabaseInspection = inspectHostWorkspaceDatabase(root, databaseRelativePath, workspaceId);
            expect(beforeDatabaseInspection.admission_attempts).toEqual([]);
            const inspected = requireRecord(
              await withPackageIdentity(() => run([...inspectArgs, '--inspect', 'true'])),
              'staged selector public inspection',
            );
            expect(inspected).toMatchObject({ schema: 'VidaLocalSessionInspection/v1', status: 'inspected' });
            expect(inspected.diagnosis).toMatchObject({ reason: 'session_absent' });
            expect(readFileSync(selectorPath).equals(selectorBytes)).toBe(true);
            expect(readFileSync(cutoffPath).equals(cutoffBytes)).toBe(true);
            const afterDatabaseInspection = inspectHostWorkspaceDatabase(root, databaseRelativePath, workspaceId);
            expect(afterDatabaseInspection).toEqual(beforeDatabaseInspection);
            expect(afterDatabaseInspection.admission_attempts).toEqual([]);
            const stagedJournalBytes = readFileSync(stagedJournalPath);
            const stagedLockBytes = readFileSync(stagedLockPath);
            const stagedReleaseBytes = readFileSync(stagedReleasePath);
            const beforeIncompleteStagedJournal = snapshotAuthorityFixture(path.join(root, '.agent'));
            try {
              writeFileSync(stagedJournalPath, record({ ...stagedJournal, status: 'not-staged' }));
              await runWithPackageIdentity(
                {
                  code: 'GAP-VIDA-RUN-SELECTOR-001',
                  message: 'Cutover journal is incomplete.',
                },
                [...inspectArgs, '--inspect', 'true'],
              );
            } finally {
              writeFileSync(stagedJournalPath, stagedJournalBytes);
            }
            expect(snapshotAuthorityFixture(path.join(root, '.agent'))).toEqual(beforeIncompleteStagedJournal);
            expect(readFileSync(stagedJournalPath).equals(stagedJournalBytes)).toBe(true);
            expect(inspectHostWorkspaceDatabase(root, databaseRelativePath, workspaceId)).toEqual(
              afterDatabaseInspection,
            );
            const inconsistentLock = { ...stagedLock, payload_manifest_sha256: 'd'.repeat(64) };
            const inconsistentReceipt = {
              ...stagedReceipt,
              lock_sha256: createHash('sha256').update(record(inconsistentLock)).digest('hex'),
            };
            try {
              writeFileSync(stagedLockPath, record(inconsistentLock));
              writeFileSync(stagedReleasePath, record(inconsistentReceipt));
              await runWithPackageIdentity(
                {
                  code: 'GAP-VIDA-RUN-SELECTOR-001',
                  message: 'Cutover maintenance release proof is invalid.',
                },
                [...inspectArgs, '--inspect', 'true'],
              );
            } finally {
              writeFileSync(stagedLockPath, stagedLockBytes);
              writeFileSync(stagedReleasePath, stagedReleaseBytes);
            }
            expect(readFileSync(selectorPath).equals(selectorBytes)).toBe(true);
            expect(readFileSync(stagedJournalPath).equals(stagedJournalBytes)).toBe(true);
            expect(readFileSync(stagedLockPath).equals(stagedLockBytes)).toBe(true);
            expect(readFileSync(stagedReleasePath).equals(stagedReleaseBytes)).toBe(true);
            expect(readFileSync(cutoffPath).equals(cutoffBytes)).toBe(true);
            expect(inspectHostWorkspaceDatabase(root, databaseRelativePath, workspaceId)).toEqual(
              afterDatabaseInspection,
            );
            const cutoverRoot = path.join(root, '.agent', 'cutover');
            const retainedCutoverRoot = path.join(root, `.fixture-cutover-retained-${randomUUID()}`);
            const retainedSelectorPath = path.join(root, `.fixture-selector-retained-${randomUUID()}`);
            const cutoverBeforeInspection = snapshotAuthorityFixture(cutoverRoot);
            let cutoverMoved = false;
            let selectorMoved = false;
            let emptyCutoverCreated = false;
            try {
              renameSync(cutoverRoot, retainedCutoverRoot);
              cutoverMoved = true;
              renameSync(selectorPath, retainedSelectorPath);
              selectorMoved = true;
              mkdirSync(cutoverRoot);
              emptyCutoverCreated = true;
              expect(readdirSync(cutoverRoot)).toEqual([]);
              expect(existsSync(selectorPath)).toBe(false);
              const inspectedWithoutSelector = requireRecord(
                await withPackageIdentity(() => run([...inspectArgs, '--inspect', 'true'])),
                'empty cutover public inspection',
              );
              expect(inspectedWithoutSelector).toMatchObject({
                schema: 'VidaLocalSessionInspection/v1',
                status: 'inspected',
              });
              expect(inspectedWithoutSelector.diagnosis).toMatchObject({ reason: 'session_absent' });
              expect(readdirSync(cutoverRoot)).toEqual([]);
              expect(existsSync(selectorPath)).toBe(false);
              expect(inspectHostWorkspaceDatabase(root, databaseRelativePath, workspaceId)).toEqual(
                afterDatabaseInspection,
              );
            } finally {
              if (emptyCutoverCreated) rmSync(cutoverRoot, { recursive: true, force: true });
              if (cutoverMoved) renameSync(retainedCutoverRoot, cutoverRoot);
              if (selectorMoved) renameSync(retainedSelectorPath, selectorPath);
            }
            expect(snapshotAuthorityFixture(cutoverRoot)).toEqual(cutoverBeforeInspection);
            expect(readFileSync(selectorPath).equals(selectorBytes)).toBe(true);
            const invalidBindingBytes = Buffer.from(record({ ...stagedSelector, runtime: 'foreign-runtime' }));
            writeFileSync(selectorPath, invalidBindingBytes);
            try {
              const beforeInvalidBindingInspection = snapshotAuthorityFixture(path.join(root, '.agent'));
              await runWithPackageIdentity(
                {
                  code: 'GAP-VIDA-RUN-SELECTOR-001',
                  message: 'Active selector does not bind this installed bundle.',
                },
                [...inspectArgs, '--inspect', 'true'],
              );
              expect(snapshotAuthorityFixture(path.join(root, '.agent'))).toEqual(beforeInvalidBindingInspection);
              expect(readFileSync(selectorPath).equals(invalidBindingBytes)).toBe(true);
              expect(inspectHostWorkspaceDatabase(root, databaseRelativePath, workspaceId)).toEqual(
                afterDatabaseInspection,
              );
              expect(inspectHostWorkspaceDatabase(root, databaseRelativePath, workspaceId).admission_attempts).toEqual(
                [],
              );
            } finally {
              writeFileSync(selectorPath, selectorBytes);
            }
            expect(readFileSync(selectorPath).equals(selectorBytes)).toBe(true);
            const forwardIntentPath = path.join(stagedRoot, 'forward-intent.v1.json');
            expect(existsSync(forwardIntentPath)).toBe(false);
            const beforeForwardMarker = snapshotAuthorityFixture(path.join(root, '.agent'));
            let forwardMarkerOwned = false;
            try {
              forwardMarkerOwned = true;
              writeFileSync(forwardIntentPath, record({ schema: 'VidaForwardUpdateMaintenance/v1' }));
              const beforeForwardInspection = snapshotAuthorityFixture(path.join(root, '.agent'));
              await runWithPackageIdentity(
                {
                  code: 'GAP-VIDA-RUN-SELECTOR-001',
                  message: 'Forward selector is incomplete.',
                },
                [...inspectArgs, '--inspect', 'true'],
              );
              expect(snapshotAuthorityFixture(path.join(root, '.agent'))).toEqual(beforeForwardInspection);
              expect(readFileSync(selectorPath).equals(selectorBytes)).toBe(true);
              expect(inspectHostWorkspaceDatabase(root, databaseRelativePath, workspaceId)).toEqual(
                afterDatabaseInspection,
              );
              expect(inspectHostWorkspaceDatabase(root, databaseRelativePath, workspaceId).admission_attempts).toEqual(
                [],
              );
            } finally {
              if (forwardMarkerOwned) rmSync(forwardIntentPath, { force: true });
            }
            expect(existsSync(forwardIntentPath)).toBe(false);
            expect(snapshotAuthorityFixture(path.join(root, '.agent'))).toEqual(beforeForwardMarker);
            expect(fixture.invoke(stagedAdmitted.admissionArgs, 0).runtime_selector_observed).toBe(true);
            for (const changed of [
              { cutover_id: 'other-generation' },
              { plan_sha256: 'd'.repeat(64) },
              { archive_manifest_sha256: 'd'.repeat(64) },
              { selector_sha256: 'd'.repeat(64) },
              { status: 'not-staged' },
            ]) {
              writeFileSync(stagedJournalPath, record({ ...stagedJournal, ...changed }));
              expect(fixture.invoke(stagedAdmitted.args, 1)).toMatchObject({
                code: 'GAP-VIDA-RUN-SELECTOR-001',
                message:
                  'The active runtime selector or cutover journal is invalid. Next action: inspect the exact work and check its issued contract before retrying.',
              });
            }
          }
          completed = true;
        } finally {
          if (completed && !fixture.hasUnknown()) {
            if (existsSync(dependenciesLink)) unlinkSync(dependenciesLink);
            rmSync(root, { recursive: true, force: true });
          } else
            process.stderr.write(
              `Retained ${fixture.hasUnknown() ? 'uncertain' : 'failed'} public run fixture and dependency link: ${root}\n`,
            );
        }
      }, 90_000);
    }
  });

  test('run special commands reject malformed separate signals before helper dispatch', async () => {
    const messages = [
      'Initial source continuation requires its exact separate signal',
      'Unprepared recovery requires its exact separate signal',
      'Completed Source report recovery requires its exact separate signal',
      'Failed prewriter transition requires its exact separate signal',
      'Failed prewriter owner recovery requires its exact separate signal',
      'Recovery review requires its exact separate signal',
      'Historical release requires its exact separate signal',
      'Historical normalization resume requires its exact separate signal',
      'Historical terminal synthesis capture requires its exact separate signal',
      'Unissued owner release requires its exact separate signal',
      'Settled research release requires its exact separate signal',
      'Readonly bookkeeping release requires its exact separate signal',
      'Interrupted Source retirement requires its exact separate signal',
      'Readonly release requires separate exact signal',
      'Retired-source capture requires its exact separate capture signal',
      'Stopped-source capture requires exact separate capture signal',
    ];
    expect(runSpecialModeOptions).toHaveLength(messages.length);
    const precedingSelectors = new Set<string>();
    for (const [index, contract] of runSpecialModeOptions.entries()) {
      const message = messages[index];
      if (!message) throw new Error(`Missing special-command refusal for ${contract.selector}`);
      for (const args of [
        [contract.selector, 'false'],
        ['--mode', 'true', contract.selector],
      ])
        await assert.rejects(run(args), (error: unknown) => error instanceof Error && error.message === message);
      for (const conflict of contract.conflicts ?? []) {
        if (precedingSelectors.has(conflict)) continue;
        await assert.rejects(
          run([contract.selector, 'true', conflict, 'true']),
          (error: unknown) => error instanceof Error && error.message === message,
        );
      }
      precedingSelectors.add(contract.selector);
    }
  });

  test('run special helper tops reject malformed argv and modes before repository effects', async () => {
    const cases = [
      {
        selector: '--capture-stopped-source',
        wrong: (root: string) => ['--request', 'request.json', '--mode', 'inspect', '--project-root', root],
        wrongMessage:
          'Usage: run.mjs --capture-stopped-source true --mode inspect|plan|apply|resume --project-root ABS --request REL',
        invalid: (root: string) => ['--mode', 'invalid', '--project-root', root, '--request', 'request.json'],
        invalidMessage: 'Capture operation mode invalid',
      },
      {
        selector: '--recover-unprepared-work',
        wrong: (root: string) => [
          '--project-root',
          root,
          '--mode',
          'inspect',
          '--native-session-handle',
          'owner',
          '--request',
          'request.json',
        ],
        wrongMessage: 'Unprepared recovery requires mode, exact root, original owner handle and request',
        invalid: (root: string) => [
          '--mode',
          'invalid',
          '--project-root',
          root,
          '--native-session-handle',
          'owner',
          '--request',
          'request.json',
        ],
        invalidMessage: 'Unprepared recovery mode invalid',
      },
      {
        selector: '--capture-retired-source',
        wrong: (root: string) => [
          '--native-session-handle',
          'owner',
          '--project-root',
          root,
          '--request',
          'request.json',
        ],
        wrongMessage: 'Retired-source capture requires exact root, current owner handle and request',
      },
      {
        selector: '--retire-interrupted-source-owner',
        wrong: (root: string) => [
          '--project-root',
          root,
          '--mode',
          'inspect',
          '--native-session-handle',
          'owner',
          '--request',
          'request.json',
        ],
        wrongMessage: 'Interrupted Source retirement requires mode, exact root, current owner handle and request',
        invalid: (root: string) => [
          '--mode',
          'invalid',
          '--project-root',
          root,
          '--native-session-handle',
          'owner',
          '--request',
          'request.json',
        ],
        invalidMessage: 'Interrupted Source retirement mode invalid',
      },
      {
        selector: '--release-completed-readonly',
        wrong: (root: string) => ['--project-root', root, '--mode', 'inspect', '--request', 'request.json'],
        wrongMessage: 'Readonly release requires mode, exact root and request',
        invalid: (root: string) => ['--mode', 'invalid', '--project-root', root, '--request', 'request.json'],
        invalidMessage: 'Readonly release mode invalid',
      },
      {
        selector: '--recovery-review',
        wrong: (root: string) => ['--mode', 'inspect', '--project-root', root],
        wrongMessage: 'Recovery review requires exact mode, root and caller-history export',
        invalid: (root: string) => ['--mode', 'invalid', '--project-root', root, '--request', 'request.json'],
        invalidMessage: 'Recovery review mode or argument set invalid',
        missingMode: (root: string) => [
          '--project-root',
          root,
          '--request',
          'request.json',
          '--unexpected-option',
          'value',
        ],
      },
    ];
    for (const entry of cases) {
      const refuseOnEmptyRoot = async (argsForRoot: (root: string) => string[], message: string) => {
        const root = mkdtempSync(path.join(tmpdir(), 'vida-run-special-empty-'));
        let complete = false;
        try {
          await assert.rejects(
            run([entry.selector, 'true', ...argsForRoot(root)]),
            (error: unknown) => error instanceof Error && error.message === message,
          );
          expect(readdirSync(root)).toEqual([]);
          complete = true;
        } finally {
          if (complete) rmSync(root, { recursive: true, force: true });
          else process.stderr.write(`Retained failed run-special empty root: ${root}\n`);
        }
      };
      await refuseOnEmptyRoot(entry.wrong, entry.wrongMessage);
      if (entry.invalid && entry.invalidMessage) await refuseOnEmptyRoot(entry.invalid, entry.invalidMessage);
      if ('missingMode' in entry)
        await refuseOnEmptyRoot(entry.missingMode, 'Recovery review mode or argument set invalid');
    }
  });

  test('interrupted source retirement decoders reject malformed requests before database access', async () => {
    type Mode = 'inspect' | 'apply';
    type DecoderCase = { mode: Mode; change: (input: Record<string, unknown>) => void };
    const cases: DecoderCase[] = [];
    for (const mode of ['inspect', 'apply'] as const) {
      cases.push(
        {
          mode,
          change: (input) => {
            input.extra = true;
          },
        },
        {
          mode,
          change: (input) => {
            delete input.identity;
          },
        },
        {
          mode,
          change: (input) => {
            input.identity = null;
          },
        },
        {
          mode,
          change: (input) => {
            requireRecord(input.identity, 'identity').extra = true;
          },
        },
        {
          mode,
          change: (input) => {
            requireRecord(input.identity, 'identity').project_ids = [1];
          },
        },
      );
      for (const attempt of ['1', 0, 1.5, 9007199254740992])
        cases.push({
          mode,
          change: (input) => {
            input.attempt = attempt;
          },
        });
    }
    for (const field of ['actionId', 'issueId', 'decisionPointer']) {
      cases.push(
        {
          mode: 'apply',
          change: (input) => {
            delete input[field];
          },
        },
        {
          mode: 'apply',
          change: (input) => {
            input[field] = 1;
          },
        },
      );
    }
    for (const field of ['expectedWork', 'expectedLedger', 'expectedJournal']) {
      for (const malformed of [
        null,
        { revision: 1 },
        { revision: 1, digest: 'fixture', extra: true },
        { revision: '1', digest: 'fixture' },
        { revision: 1, digest: 1 },
      ])
        cases.push({
          mode: 'apply',
          change: (input) => {
            input[field] = malformed;
          },
        });
    }
    for (const generation of ['0', -1, 0.5, 9007199254740992])
      cases.push({
        mode: 'apply',
        change: (input) => {
          input.expectedMaintenanceGeneration = generation;
        },
      });
    for (const [field, value] of [
      ['extra', true],
      ['schema', 'wrong-schema'],
      ['source_thread_id', 1],
      ['source_thread_status', 'running'],
      ['read_thread_ref', 1],
      ['list_agents_ref', 1],
      ['active_source_writer_ids', null],
      ['active_source_writer_ids', [1]],
    ] as const)
      cases.push({
        mode: 'apply',
        change: (input) => {
          requireRecord(input.evidence, 'evidence')[field] = value;
        },
      });

    const root = mkdtempSync(path.join(tmpdir(), 'vida-run-interrupted-decoder-'));
    let complete = false;
    try {
      const { config, initializationPath } = createFixture(root);
      const configPath = path.join(root, 'agent-runtime.config.v1.yaml'),
        requestPath = path.join(root, 'request.json');
      const configBefore = readFileSync(configPath),
        initializationBefore = readFileSync(initializationPath);
      writeFileSync(requestPath, '');
      const fixtureBefore = snapshotAuthorityFixture(root);
      const makeInput = (mode: Mode): Record<string, unknown> => ({
        identity: {
          repository_id: `${config.repository.repository_id}-foreign`,
          project_ids: config.projects.map((project) => project.project_id),
          integrations_digest: canonicalJsonDigest(config.integrations),
          work_id: 'unaccepted-retirement-fixture',
        },
        attempt: 1,
        ...(mode === 'apply'
          ? {
              actionId: 'unaccepted-action',
              issueId: 'unaccepted-issue',
              expectedWork: { revision: 1, digest: 'fixture-work' },
              expectedLedger: { revision: 1, digest: 'fixture-ledger' },
              expectedJournal: { revision: 1, digest: 'fixture-journal' },
              expectedMaintenanceGeneration: 0,
              decisionPointer: 'fixture:decision',
              evidence: {
                schema: 'InterruptedSourceRetirementEvidence/v1',
                source_thread_id: 'fixture-thread',
                source_thread_status: 'interrupted',
                read_thread_ref: 'fixture:read',
                list_agents_ref: 'fixture:list',
                active_source_writer_ids: [],
              },
            }
          : {}),
      });
      let finalBytes = '';
      for (const entry of [
        ...cases,
        { mode: 'inspect' as const, change: null },
        { mode: 'apply' as const, change: null },
      ]) {
        const input = makeInput(entry.mode);
        entry.change?.(input);
        finalBytes = record(input);
        writeFileSync(requestPath, finalBytes);
        await assert.rejects(
          run([
            '--retire-interrupted-source-owner',
            'true',
            '--mode',
            entry.mode,
            '--project-root',
            root,
            '--native-session-handle',
            'fixture-owner',
            '--request',
            'request.json',
          ]),
          {
            message: entry.change
              ? 'Interrupted Source retirement request shape differs'
              : 'Interrupted Source retirement identity differs',
          },
        );
        expect(readFileSync(requestPath, 'utf8')).toBe(finalBytes);
        expect(readFileSync(configPath)).toEqual(configBefore);
        expect(readFileSync(initializationPath)).toEqual(initializationBefore);
        expect(existsSync(sessionHandoffDatabasePath(root, config))).toBe(false);
        expect(existsSync(path.join(root, '.agent', 'work'))).toBe(false);
      }
      expect(snapshotAuthorityFixture(root)).toEqual(
        fixtureBefore.map((entry) =>
          entry.path === 'request.json' ? { ...entry, bytes: Buffer.from(finalBytes).toString('base64') } : entry,
        ),
      );
      complete = true;
    } finally {
      if (complete) rmSync(root, { recursive: true, force: true });
      else process.stderr.write(`Retained failed interrupted-retirement decoder root: ${root}\n`);
    }
  });

  test('run special helper request decoders refuse empty records before opening a workspace database', async () => {
    const cases = [
      {
        selector: '--capture-stopped-source',
        args: (root: string) => ['--mode', 'inspect', '--project-root', root, '--request', 'request.json'],
        message: 'Capture workspace/root binding differs',
      },
      {
        selector: '--recover-unprepared-work',
        args: (root: string) => [
          '--mode',
          'inspect',
          '--project-root',
          root,
          '--native-session-handle',
          'owner',
          '--request',
          'request.json',
        ],
        message: 'Unprepared recovery request shape differs',
      },
      {
        selector: '--capture-retired-source',
        args: (root: string) => [
          '--project-root',
          root,
          '--native-session-handle',
          'owner',
          '--request',
          'request.json',
        ],
        message: 'Retired-source request workspace or owner binding differs',
      },
      {
        selector: '--retire-interrupted-source-owner',
        args: (root: string) => [
          '--mode',
          'inspect',
          '--project-root',
          root,
          '--native-session-handle',
          'owner',
          '--request',
          'request.json',
        ],
        message: 'Interrupted Source retirement request shape differs',
      },
      {
        selector: '--release-completed-readonly',
        args: (root: string) => ['--mode', 'inspect', '--project-root', root, '--request', 'request.json'],
        message: 'Readonly release identity differs',
      },
      {
        selector: '--recovery-review',
        args: (root: string) => ['--mode', 'inspect', '--project-root', root, '--request', 'request.json'],
        message: 'Recovery caller-history export shape invalid',
      },
    ];
    for (const entry of cases) {
      const root = mkdtempSync(path.join(tmpdir(), 'vida-run-special-request-'));
      let complete = false;
      try {
        const { config, initializationPath } = createFixture(root);
        const configPath = path.join(root, 'agent-runtime.config.v1.yaml');
        const requestPath = path.join(root, 'request.json');
        const configBefore = readFileSync(configPath);
        const initializationBefore = readFileSync(initializationPath);
        const requestBytes = Buffer.from('{}');
        writeFileSync(requestPath, requestBytes);
        await assert.rejects(
          run([entry.selector, 'true', ...entry.args(root)]),
          (error: unknown) => error instanceof Error && error.message === entry.message,
        );
        expect(readFileSync(configPath)).toEqual(configBefore);
        expect(readFileSync(initializationPath)).toEqual(initializationBefore);
        expect(readFileSync(requestPath)).toEqual(requestBytes);
        expect(existsSync(sessionHandoffDatabasePath(root, config))).toBe(false);
        expect(existsSync(path.join(root, '.agent', 'work'))).toBe(false);
        complete = true;
      } finally {
        if (complete) rmSync(root, { recursive: true, force: true });
        else process.stderr.write(`Retained failed run-special request root: ${root}\n`);
      }
    }
  });

  test('recovery review caller-history decoder refuses malformed nested shapes before workspace effects', async () => {
    type DecoderCase = {
      name: string;
      mode: 'prepare' | 'begin' | 'complete' | 'inspect';
      mutate: (input: Record<string, unknown>) => void;
    };
    const cases: DecoderCase[] = [];
    const add = (name: string, mode: DecoderCase['mode'], mutate: DecoderCase['mutate']) =>
      cases.push({ name, mode, mutate });
    const objectAt = (value: Record<string, unknown>, key: string) =>
      requireRecord(value[key], `recovery decoder fixture ${key}`);
    const requestAt = (value: Record<string, unknown>) => objectAt(value, 'request');
    const sourceAt = (value: Record<string, unknown>) => objectAt(requestAt(value), 'source');
    const entryAt = (value: Record<string, unknown>) => {
      const entries = sourceAt(value).entries;
      assert.ok(Array.isArray(entries), 'recovery decoder fixture entries');
      return requireRecord(entries[0], 'recovery decoder fixture entry');
    };
    const versionAt = (value: Record<string, unknown>, key: string) => objectAt(requestAt(value), key);

    for (const key of ['identity', 'attempt', 'baselinePath', 'callerSession', 'controllerId', 'userInstructionRef']) {
      add(`outer missing ${key}`, 'inspect', (input) => delete input[key]);
    }
    add('outer identity is not a record', 'inspect', (input) => (input.identity = null));
    add('outer identity has an extra key', 'inspect', (input) => (objectAt(input, 'identity').extra = 'fixture'));
    for (const [key, invalid] of [
      ['repository_id', null],
      ['project_ids', {}],
      ['integrations_digest', null],
      ['work_id', 1],
    ] as const) {
      add(`outer identity ${key} type`, 'inspect', (input) => (objectAt(input, 'identity')[key] = invalid));
      add(`outer identity missing ${key}`, 'inspect', (input) => delete objectAt(input, 'identity')[key]);
    }
    add('outer identity project_ids item type', 'inspect', (input) => (objectAt(input, 'identity').project_ids = [1]));
    add('outer attempt type', 'inspect', (input) => (input.attempt = '1'));
    add('outer baselinePath type', 'inspect', (input) => (input.baselinePath = null));
    for (const key of ['callerSession', 'controllerId', 'userInstructionRef']) {
      add(`outer ${key} type`, 'inspect', (input) => (input[key] = null));
    }
    add('outer unknown key', 'inspect', (input) => (input.extra = 'fixture'));
    add('prepare mode rejects a request key', 'prepare', (input) => (input.request = {}));
    add('inspect mode requires request', 'inspect', (input) => delete input.request);
    add('inspect mode rejects observation key', 'inspect', (input) => (input.observation = true));
    add('originalContexts must be nonempty', 'inspect', (input) => (input.originalContexts = []));
    add('originalContexts must be an array', 'inspect', (input) => (input.originalContexts = 'fixture'));

    add('binding is not a record', 'begin', (input) => (input.request = null));
    add('binding has an extra key', 'begin', (input) => (requestAt(input).extra = 'fixture'));
    for (const key of [
      'identity',
      'attempt',
      'callerSession',
      'controllerId',
      'userInstructionRef',
      'historicalOwner',
      'expectedWork',
      'expectedLedger',
      'expectedJournal',
      'maintenanceGeneration',
      'source',
      'context',
    ]) {
      add(`binding missing ${key}`, 'begin', (input) => delete requestAt(input)[key]);
    }
    add('binding identity is not a record', 'begin', (input) => (requestAt(input).identity = null));
    add(
      'binding identity has an extra key',
      'begin',
      (input) => (objectAt(requestAt(input), 'identity').extra = 'fixture'),
    );
    for (const [key, invalid] of [
      ['repository_id', null],
      ['project_ids', {}],
      ['integrations_digest', null],
      ['work_id', 1],
    ] as const) {
      add(`binding identity ${key} type`, 'begin', (input) => (objectAt(requestAt(input), 'identity')[key] = invalid));
      add(`binding identity missing ${key}`, 'begin', (input) => delete objectAt(requestAt(input), 'identity')[key]);
    }
    add(
      'binding identity project_ids item type',
      'begin',
      (input) => (objectAt(requestAt(input), 'identity').project_ids = [1]),
    );
    add('binding attempt type', 'begin', (input) => (requestAt(input).attempt = '1'));
    for (const key of ['callerSession', 'controllerId', 'userInstructionRef', 'historicalOwner']) {
      add(`binding ${key} type`, 'begin', (input) => (requestAt(input)[key] = null));
    }
    for (const key of ['expectedWork', 'expectedLedger', 'expectedJournal']) {
      add(`binding ${key} record`, 'begin', (input) => (requestAt(input)[key] = null));
      add(`binding ${key} missing revision`, 'begin', (input) => delete versionAt(input, key).revision);
      add(`binding ${key} revision type`, 'begin', (input) => (versionAt(input, key).revision = '1'));
      add(`binding ${key} missing digest`, 'begin', (input) => delete versionAt(input, key).digest);
      add(`binding ${key} digest type`, 'begin', (input) => (versionAt(input, key).digest = null));
      add(`binding ${key} extra key`, 'begin', (input) => (versionAt(input, key).extra = true));
    }
    add('binding maintenanceGeneration type', 'begin', (input) => (requestAt(input).maintenanceGeneration = '1'));
    add('source snapshot is not a record', 'begin', (input) => (requestAt(input).source = null));
    add('source snapshot has an extra key', 'begin', (input) => (sourceAt(input).extra = true));
    for (const key of ['schema', 'entries', 'digest']) {
      add(`source snapshot missing ${key}`, 'begin', (input) => delete sourceAt(input)[key]);
    }
    add('source snapshot schema', 'begin', (input) => (sourceAt(input).schema = 'ScopedSourceSnapshot/v0'));
    add('source snapshot entries type', 'begin', (input) => (sourceAt(input).entries = {}));
    add('source snapshot digest type', 'begin', (input) => (sourceAt(input).digest = null));
    add('source entry is not a record', 'begin', (input) => (sourceAt(input).entries = [null]));
    add('source entry has an extra key', 'begin', (input) => (entryAt(input).extra = true));
    for (const key of ['path', 'exists', 'bytes', 'sha256']) {
      add(`source entry missing ${key}`, 'begin', (input) => delete entryAt(input)[key]);
    }
    add('source entry path type', 'begin', (input) => (entryAt(input).path = null));
    add('source entry exists type', 'begin', (input) => (entryAt(input).exists = 1));
    add('source entry bytes type', 'begin', (input) => (entryAt(input).bytes = {}));
    add('source entry sha256 type', 'begin', (input) => (entryAt(input).sha256 = 1));
    add('binding context must be a record', 'begin', (input) => (requestAt(input).context = []));
    for (const field of ['bytes', 'sha256']) {
      add(`nullable source entry ${field} preserves later context refusal`, 'begin', (input) => {
        entryAt(input)[field] = null;
        requestAt(input).context = [];
      });
    }
    add('empty source entries preserve later context refusal', 'begin', (input) => {
      sourceAt(input).entries = [];
      requestAt(input).context = [];
    });
    add('complete mode requires observation', 'complete', (input) => delete input.observation);
    for (const value of [null, false, 0, '']) {
      add(
        `complete mode rejects falsey observation ${String(value)}`,
        'complete',
        (input) => (input.observation = value),
      );
    }

    const root = mkdtempSync(path.join(tmpdir(), 'vida-run-recovery-review-shape-'));
    let complete = false;
    try {
      const { config } = createFixture(root);
      const requestPath = path.join(root, 'request.json');
      const integrationsDigest = canonicalJsonDigest(config.integrations);
      writeFileSync(requestPath, '');
      const fixtureBefore = snapshotAuthorityFixture(root);
      const makeInput = (mode: DecoderCase['mode']): Record<string, unknown> => {
        const identity = {
          repository_id: config.repository.repository_id,
          project_ids: config.projects.map((project) => project.project_id),
          integrations_digest: integrationsDigest,
          work_id: 'unaccepted-fixture-work',
        };
        const version = (digest: string) => ({ revision: 1, digest });
        const input: Record<string, unknown> = {
          identity,
          attempt: 1,
          baselinePath: 'fixture-baseline.json',
          callerSession: 'fixture-session',
          controllerId: 'fixture-controller',
          userInstructionRef: 'fixture:pointer',
        };
        if (mode !== 'prepare') {
          input.request = {
            identity: { ...identity },
            attempt: 1,
            callerSession: 'fixture-session',
            controllerId: 'fixture-controller',
            userInstructionRef: 'fixture:pointer',
            historicalOwner: 'fixture-historical-owner',
            expectedWork: version('fixture-work-version'),
            expectedLedger: version('fixture-ledger-version'),
            expectedJournal: version('fixture-journal-version'),
            maintenanceGeneration: 1,
            source: {
              schema: 'ScopedSourceSnapshot/v1',
              entries: [{ path: 'fixture/source', exists: true, bytes: 0, sha256: 'fixture-source-entry' }],
              digest: 'fixture-source-snapshot',
            },
            context: {},
          };
        }
        if (mode === 'complete') input.observation = { fixture: 'unaccepted-observation' };
        return input;
      };
      for (const entry of cases) {
        const input = makeInput(entry.mode);
        entry.mutate(input);
        const requestBytes = Buffer.from(record(input));
        writeFileSync(requestPath, requestBytes);
        const before = fixtureBefore.map((item) =>
          item.path === 'request.json' ? { ...item, bytes: requestBytes.toString('base64') } : item,
        );
        await assert.rejects(
          run(['--recovery-review', 'true', '--mode', entry.mode, '--project-root', root, '--request', 'request.json']),
          (error: unknown) =>
            error instanceof Error && error.message === 'Recovery caller-history export shape invalid',
          entry.name,
        );
        expect(snapshotAuthorityFixture(root)).toEqual(before);
        expect(existsSync(sessionHandoffDatabasePath(root, config))).toBe(false);
        expect(existsSync(path.join(root, '.agent', 'work'))).toBe(false);
      }
      complete = true;
    } finally {
      if (complete) rmSync(root, { recursive: true, force: true });
      else process.stderr.write(`Retained failed recovery-review decoder root: ${root}\n`);
    }
  });

  test('historical owner release decoders reject malformed requests before authority or effects', async () => {
    type SelectorContract = {
      selector: string;
      schema: string;
      predicates: readonly string[];
    };
    type DecoderCase = {
      name: string;
      selector: SelectorContract;
      mode: 'inspect' | 'apply';
      argv?: (args: string[]) => string[];
      error?: string;
    } & ({ mutate: (request: Record<string, unknown>) => void; raw?: never } | { raw: string; mutate?: never });
    const selectors: readonly SelectorContract[] = [
      {
        selector: '--release-historical-owner',
        schema: 'HistoricalOwnerReleaseRequest/v1',
        predicates: ['completed_readonly', 'unknown_readonly', 'settled_writer_failed_validators'],
      },
      {
        selector: '--release-unissued-owner',
        schema: 'UnissuedOwnerReleaseRequest/v1',
        predicates: ['unissued_prepared'],
      },
      {
        selector: '--release-settled-research-owner',
        schema: 'SettledResearchOwnerReleaseRequest/v1',
        predicates: ['settled_research'],
      },
      {
        selector: '--release-readonly-bookkeeping-owner',
        schema: 'ReadonlyBookkeepingOwnerReleaseRequest/v1',
        predicates: ['readonly_bookkeeping'],
      },
    ];
    const cases: DecoderCase[] = [];
    const add = (
      name: string,
      selector: SelectorContract,
      mode: DecoderCase['mode'],
      mutate: NonNullable<DecoderCase['mutate']>,
    ) => cases.push({ name, selector, mode, mutate });
    const historical = selectors[0];
    if (!historical) throw new Error('historical owner release selector contract is missing');
    const identityAt = (request: Record<string, unknown>) =>
      requireRecord(request.identity, 'historical owner release identity');
    const inspectionAt = (request: Record<string, unknown>) =>
      requireRecord(request.inspection, 'historical owner release inspection');
    const versionAt = (request: Record<string, unknown>, key: string) =>
      requireRecord(inspectionAt(request)[key], `historical owner release ${key}`);

    cases.push({ name: 'malformed JSON', selector: historical, mode: 'inspect', raw: '{' });
    for (const raw of ['null', '[]', '0', ' '.repeat(65_536)])
      cases.push({
        name: `non-record or boundary JSON (${raw.length} bytes)`,
        selector: historical,
        mode: 'inspect',
        raw,
      });
    cases.push({
      name: 'oversized request',
      selector: historical,
      mode: 'inspect',
      raw: 'x'.repeat(65_537),
      error: 'Historical release request exceeds bound',
    });
    const withValue = (args: string[], flag: string, value: string) =>
      args.map((item, index) => (args[index - 1] === flag ? value : item));
    const argumentCases: readonly {
      name: string;
      argv: (args: string[]) => string[];
      error: string;
    }[] = [
      {
        name: 'missing helper arguments',
        argv: (args) => args.slice(0, 2),
        error: 'Historical release requires mode, exact root, owner, baseline and request',
      },
      {
        name: 'duplicate helper flag',
        argv: (args) => args.map((item) => (item === '--request' ? '--mode' : item)),
        error: 'Historical release arguments invalid',
      },
      {
        name: 'empty owner handle',
        argv: (args) => withValue(args, '--native-session-handle', ''),
        error: 'Historical release arguments invalid',
      },
      {
        name: 'unknown helper flag',
        argv: (args) => [...args, '--unexpected', 'fixture'],
        error: 'Historical release mode or argument set invalid',
      },
      {
        name: 'invalid helper mode',
        argv: (args) => withValue(args, '--mode', 'unsupported'),
        error: 'Historical release mode or argument set invalid',
      },
      {
        name: 'relative project root',
        argv: (args) => withValue(args, '--project-root', 'relative-root'),
        error: 'Historical release mode or argument set invalid',
      },
      {
        name: 'escaping baseline reference',
        argv: (args) => withValue(args, '--baseline-config', '../baseline.json'),
        error: 'Historical release references must be bounded repository-relative paths',
      },
      ...[
        '../request.json',
        './request.json',
        'nested//request.json',
        '/request.json',
        'C:/request.json',
        'nested\\request.json',
        'request\n.json',
        'x'.repeat(2049),
      ].map((value) => ({
        name: `invalid request reference (${value.length} chars)`,
        argv: (args: string[]) => withValue(args, '--request', value),
        error: 'Historical release references must be bounded repository-relative paths',
      })),
    ];
    for (const entry of argumentCases) cases.push({ ...entry, selector: historical, mode: 'inspect', raw: '{}' });
    for (const key of ['schema', 'identity', 'attempt', 'userRequestPointer', 'requestIntent', 'predicate']) {
      add(`header missing ${key}`, historical, 'inspect', (request) => delete request[key]);
    }
    add('header has an extra key', historical, 'inspect', (request) => (request.extra = 'fixture'));
    add(
      'schema value differs',
      historical,
      'inspect',
      (request) => (request.schema = 'HistoricalOwnerReleaseRequest/v0'),
    );
    add('identity is not a record', historical, 'inspect', (request) => (request.identity = null));
    add('identity has an extra key', historical, 'inspect', (request) => (identityAt(request).extra = 'fixture'));
    for (const key of ['repository_id', 'project_ids', 'integrations_digest', 'work_id']) {
      add(`identity missing ${key}`, historical, 'inspect', (request) => delete identityAt(request)[key]);
    }
    for (const [key, invalid] of [
      ['repository_id', null],
      ['project_ids', {}],
      ['integrations_digest', null],
      ['work_id', 1],
    ] as const) {
      add(`identity ${key} type`, historical, 'inspect', (request) => (identityAt(request)[key] = invalid));
    }
    add('identity project id item type', historical, 'inspect', (request) => (identityAt(request).project_ids = [1]));
    add('attempt type', historical, 'inspect', (request) => (request.attempt = '1'));
    add('request pointer type', historical, 'inspect', (request) => (request.userRequestPointer = null));
    add('request intent invalid', historical, 'inspect', (request) => (request.requestIntent = 'unsupported'));
    add('predicate invalid', historical, 'inspect', (request) => (request.predicate = 'unsupported'));
    add('inspect mode rejects inspection key', historical, 'inspect', (request) => (request.inspection = {}));
    add('apply mode requires inspection', historical, 'apply', (request) => delete request.inspection);
    add('apply inspection is not a record', historical, 'apply', (request) => (request.inspection = null));
    add('extra inspection metadata preserves later malformed owner refusal', historical, 'apply', (request) => {
      inspectionAt(request).extra = true;
      inspectionAt(request).nativeSessionHandle = null;
    });
    for (const key of ['expectedWork', 'expectedLedger', 'expectedJournal']) {
      add(`inspection missing ${key}`, historical, 'apply', (request) => delete inspectionAt(request)[key]);
      add(`inspection ${key} is not a record`, historical, 'apply', (request) => (inspectionAt(request)[key] = null));
      add(
        `inspection ${key} missing revision`,
        historical,
        'apply',
        (request) => delete versionAt(request, key).revision,
      );
      add(
        `inspection ${key} revision type`,
        historical,
        'apply',
        (request) => (versionAt(request, key).revision = '1'),
      );
      add(`inspection ${key} missing digest`, historical, 'apply', (request) => delete versionAt(request, key).digest);
      add(`inspection ${key} digest type`, historical, 'apply', (request) => (versionAt(request, key).digest = null));
      add(
        `inspection ${key} has an extra key`,
        historical,
        'apply',
        (request) => (versionAt(request, key).extra = true),
      );
    }
    add(
      'inspection maintenance generation type',
      historical,
      'apply',
      (request) => (inspectionAt(request).expectedMaintenanceGeneration = '1'),
    );
    for (const key of [
      'baseline_binding',
      'receipt_binding',
      'current_config_binding',
      'engine_binding',
      'request_binding',
      'preimage_binding',
      'nativeSessionHandle',
    ]) {
      add(`inspection missing ${key}`, historical, 'apply', (request) => delete inspectionAt(request)[key]);
    }
    for (const key of [
      'baseline_binding',
      'receipt_binding',
      'current_config_binding',
      'engine_binding',
      'request_binding',
      'nativeSessionHandle',
    ]) {
      add(`inspection ${key} type`, historical, 'apply', (request) => (inspectionAt(request)[key] = null));
    }
    add(
      'inspection preimage binding type',
      historical,
      'apply',
      (request) => (inspectionAt(request).preimage_binding = false),
    );
    for (const value of [null, 'fixture-preimage-binding']) {
      add(
        `nullable preimage binding ${String(value)} still rejects later malformed binding`,
        historical,
        'apply',
        (request) => {
          inspectionAt(request).preimage_binding = value;
          inspectionAt(request).nativeSessionHandle = null;
        },
      );
    }
    for (const requestIntent of ['next_work', 'linked_correction']) {
      add(`request intent ${requestIntent} still rejects later malformed key set`, historical, 'inspect', (request) => {
        request.requestIntent = requestIntent;
        request.preimage_ref = 'preimage.json';
      });
    }
    for (const predicate of historical.predicates) {
      add(`allowed predicate ${predicate} still rejects malformed preimage rule`, historical, 'inspect', (request) => {
        request.predicate = predicate;
        request.preimage_ref = predicate === 'settled_writer_failed_validators' ? null : 'preimage.json';
      });
    }
    add('writer predicate requires preimage reference', historical, 'inspect', (request) => {
      request.predicate = 'settled_writer_failed_validators';
      delete request.preimage_ref;
    });
    add('writer preimage reference type', historical, 'inspect', (request) => {
      request.predicate = 'settled_writer_failed_validators';
      request.preimage_ref = null;
    });
    add(
      'nonwriter predicate rejects preimage reference',
      historical,
      'inspect',
      (request) => (request.preimage_ref = 'preimage.json'),
    );

    const aliases = selectors.slice(1);
    for (const selector of aliases) {
      for (const mode of ['inspect', 'apply'] as const) {
        for (const predicate of selector.predicates) {
          add(`${selector.selector} allowed ${predicate} reaches malformed key set`, selector, mode, (request) => {
            request.predicate = predicate;
            request.preimage_ref = 'preimage.json';
          });
        }
        add(`${selector.selector} rejects another schema`, selector, mode, (request) => {
          request.schema = 'HistoricalOwnerReleaseRequest/v1';
        });
        add(`${selector.selector} rejects another predicate`, selector, mode, (request) => {
          request.predicate = 'completed_readonly';
        });
        add(`${selector.selector} preserves ${mode} inspection key set`, selector, mode, (request) => {
          if (mode === 'inspect') request.inspection = {};
          else request.inspection = null;
        });
        if (selector.predicates[0] !== 'settled_writer_failed_validators') {
          add(`${selector.selector} rejects writer-only preimage reference`, selector, mode, (request) => {
            request.preimage_ref = 'preimage.json';
          });
        }
      }
    }

    const root = mkdtempSync(path.join(tmpdir(), 'vida-run-historical-owner-shape-'));
    let complete = false;
    try {
      const { config } = createFixture(root);
      const requestPath = path.join(root, 'request.json');
      writeFileSync(requestPath, '');
      const fixtureBefore = snapshotAuthorityFixture(root);
      const identity = {
        repository_id: config.repository.repository_id,
        project_ids: config.projects.map((project) => project.project_id),
        integrations_digest: canonicalJsonDigest(config.integrations),
        work_id: 'unaccepted-historical-owner-fixture',
      };
      const makeRequest = (selector: SelectorContract, mode: DecoderCase['mode']): Record<string, unknown> => {
        const predicate = selector.predicates[0];
        if (!predicate) throw new Error('historical owner release predicate is missing');
        const request: Record<string, unknown> = {
          schema: selector.schema,
          identity: { ...identity },
          attempt: 1,
          userRequestPointer: 'fixture:user-request',
          requestIntent: 'next_work',
          predicate,
        };
        if (predicate === 'settled_writer_failed_validators') request.preimage_ref = 'preimage.json';
        if (mode === 'apply') {
          request.inspection = {
            expectedWork: { revision: 1, digest: 'fixture-work-version' },
            expectedLedger: { revision: 1, digest: 'fixture-ledger-version' },
            expectedJournal: { revision: 1, digest: 'fixture-journal-version' },
            expectedMaintenanceGeneration: 1,
            baseline_binding: 'fixture-baseline-binding',
            receipt_binding: 'fixture-receipt-binding',
            current_config_binding: 'fixture-config-binding',
            engine_binding: 'fixture-engine-binding',
            request_binding: 'fixture-request-binding',
            preimage_binding: null,
            nativeSessionHandle: 'fixture-native-session',
          };
        }
        return request;
      };
      for (const entry of cases) {
        const request = makeRequest(entry.selector, entry.mode);
        entry.mutate?.(request);
        const requestBytes = Buffer.from(entry.raw ?? record(request));
        writeFileSync(requestPath, requestBytes);
        const expectedAfterimage = fixtureBefore.map((item) =>
          item.path === 'request.json' ? { ...item, bytes: requestBytes.toString('base64') } : item,
        );
        const argv = [
          entry.selector.selector,
          'true',
          '--mode',
          entry.mode,
          '--project-root',
          root,
          '--native-session-handle',
          'fixture-native-session',
          '--baseline-config',
          'agent-runtime.config.v1.yaml',
          '--request',
          'request.json',
        ];
        await assert.rejects(
          run(entry.argv?.(argv) ?? argv),
          (error: unknown) =>
            error instanceof Error &&
            error.message === (entry.error ?? 'Historical release request shape or predicate invalid'),
          entry.name,
        );
        expect(snapshotAuthorityFixture(root)).toEqual(expectedAfterimage);
        expect(existsSync(sessionHandoffDatabasePath(root, config))).toBe(false);
        expect(existsSync(path.join(root, '.agent', 'work'))).toBe(false);
      }
      complete = true;
    } finally {
      if (complete) rmSync(root, { recursive: true, force: true });
      else process.stderr.write(`Retained failed historical owner decoder root: ${root}\n`);
    }
  });

  const retiredSourceDecoderRequest = (config: AgentRuntimeConfig, root: string, ownerHandle: string) => ({
    schema: 'RetiredSourceCapture/v1',
    workspace_id: deriveWorkspaceId(config.repository.repository_id, root),
    operatorHandle: ownerHandle,
    nativeTurnEvidenceRef: 'unread-fixture-native-turn',
    identity: {
      repository_id: config.repository.repository_id,
      project_ids: config.projects.map((project) => project.project_id),
      integrations_digest: canonicalJsonDigest(config.integrations),
      work_id: 'unaccepted-fixture-work',
    },
    attempt: 1,
    actionId: 'unaccepted-fixture-action',
    issueId: 'unaccepted-fixture-issue',
    expectedWork: { revision: 1, digest: 'fixture-work-digest' },
    expectedLedger: { revision: 1, digest: 'fixture-ledger-digest' },
    expectedJournal: { revision: 1, digest: 'fixture-journal-digest' },
    expectedMaintenanceGeneration: 0,
    retirementOperationId: 'unaccepted-fixture-operation',
    retirementClaimId: 'unaccepted-fixture-claim',
    observation: { host_attempt_id: 'unaccepted-fixture-host-attempt' },
    terminalEvidence: {
      schema: 'RetiredSourceTerminalEvidence/v1',
      source_thread_id: 'fixture-thread',
      source_turn_id: 'fixture-turn',
      source_thread_status: 'interrupted',
      source_turn_status: 'interrupted',
      operator_thread_id: 'fixture-operator-thread',
      original_actor_id: 'fixture-actor',
      final_message_id: null,
      action_id: 'unaccepted-fixture-action',
      issue_id: 'unaccepted-fixture-issue',
      host_attempt_id: 'unaccepted-fixture-host-attempt',
      active_source_writer_ids: [],
      observed_commands: [],
      original_tool_records: [],
      later_grants: [],
    },
    candidateSnapshot: { schema: 'UnverifiedSourceSnapshot/v1', entries: [] },
  });

  test('run retired-source decoder rejects deeper malformed request fields before native reads or workspace writes', async () => {
    const expectedMessage = 'Retired-source request workspace or owner binding differs';
    type DecoderPrefix = ReturnType<typeof retiredSourceDecoderRequest>;
    const cases = [
      {
        name: 'maintenance generation type',
        change: (request: DecoderPrefix) => ({ ...request, expectedMaintenanceGeneration: '0' }),
      },
      {
        name: 'safe positive attempt',
        change: (request: DecoderPrefix) => ({ ...request, attempt: 1.5 }),
      },
      {
        name: 'observation host attempt type',
        change: (request: DecoderPrefix) => ({ ...request, observation: { host_attempt_id: 1 } }),
      },
      {
        name: 'terminal evidence schema',
        change: (request: DecoderPrefix) => ({
          ...request,
          terminalEvidence: { ...request.terminalEvidence, schema: 'RetiredSourceTerminalEvidence/v0' },
        }),
      },
      {
        name: 'terminal final message nullability',
        change: (request: DecoderPrefix) => ({
          ...request,
          terminalEvidence: { ...request.terminalEvidence, final_message_id: 'message' },
        }),
      },
      {
        name: 'observed command truncation flag',
        change: (request: DecoderPrefix) => ({
          ...request,
          terminalEvidence: {
            ...request.terminalEvidence,
            observed_commands: [
              {
                ref: 'command-ref',
                status: 'completed',
                exit_code: 0,
                command_sha256: 'command-digest',
                output_sha256: null,
                output_present: false,
              },
            ],
          },
        }),
      },
      {
        name: 'candidate entry nonnegative size',
        change: (request: DecoderPrefix) => ({
          ...request,
          candidateSnapshot: {
            ...request.candidateSnapshot,
            entries: [{ path: 'candidate.ts', sha256: 'candidate-digest', size: -1 }],
          },
        }),
      },
      {
        name: 'original tool record must be completed',
        change: (request: DecoderPrefix) => ({
          ...request,
          terminalEvidence: {
            ...request.terminalEvidence,
            original_tool_records: [
              {
                call_ref: 'untrusted-record',
                actor_id: 'untrusted-actor',
                action_id: request.actionId,
                issue_id: request.issueId,
                host_attempt_id: request.observation.host_attempt_id,
                status: 'failed',
                changed_paths: [],
              },
            ],
          },
        }),
      },
      {
        name: 'original tool record changed paths must be strings',
        change: (request: DecoderPrefix) => ({
          ...request,
          terminalEvidence: {
            ...request.terminalEvidence,
            original_tool_records: [
              {
                call_ref: 'untrusted-record',
                actor_id: 'untrusted-actor',
                action_id: request.actionId,
                issue_id: request.issueId,
                host_attempt_id: request.observation.host_attempt_id,
                status: 'completed',
                changed_paths: [null],
              },
            ],
          },
        }),
      },
      {
        name: 'later grant requires a string evidence reference',
        change: (request: DecoderPrefix) => ({
          ...request,
          terminalEvidence: {
            ...request.terminalEvidence,
            later_grants: [
              {
                work_id: 'untrusted-work',
                ticket_id: 'untrusted-ticket',
                claim_id: 'untrusted-claim',
                actor_id: 'untrusted-actor',
                action_id: request.actionId,
                issue_id: request.issueId,
                host_attempt_id: request.observation.host_attempt_id,
                changed_paths: [],
                evidence_ref: 7,
              },
            ],
          },
        }),
      },
    ];
    for (const entry of cases) {
      const root = mkdtempSync(path.join(tmpdir(), 'vida-run-retired-decoder-'));
      let complete = false;
      try {
        const { config, initializationPath } = createFixture(root),
          configPath = path.join(root, 'agent-runtime.config.v1.yaml'),
          requestPath = path.join(root, 'request.json'),
          ownerHandle = `fixture-owner-${randomUUID()}`,
          base = retiredSourceDecoderRequest(config, root, ownerHandle),
          requestBytes = Buffer.from(`${JSON.stringify(entry.change(base))}\n`),
          configBefore = readFileSync(configPath),
          initializationBefore = readFileSync(initializationPath);
        const args = [
          '--capture-retired-source',
          'true',
          '--project-root',
          root,
          '--native-session-handle',
          ownerHandle,
          '--request',
          'request.json',
        ];
        writeFileSync(requestPath, JSON.stringify(base));
        await assert.rejects(run(args), { name: 'ZodError' });
        writeFileSync(requestPath, requestBytes);
        await assert.rejects(
          run(args),
          (error: unknown) => error instanceof Error && error.message === expectedMessage,
        );
        expect(readFileSync(configPath)).toEqual(configBefore);
        expect(readFileSync(initializationPath)).toEqual(initializationBefore);
        expect(readFileSync(requestPath)).toEqual(requestBytes);
        expect(existsSync(sessionHandoffDatabasePath(root, config))).toBe(false);
        expect(existsSync(path.join(root, '.agent', 'work'))).toBe(false);
        complete = true;
      } finally {
        if (complete) rmSync(root, { recursive: true, force: true });
        else process.stderr.write(`Retained failed retired-source decoder root (${entry.name}): ${root}\n`);
      }
    }
  });

  const stoppedSourceDecoderRequest = (
    initialization: Pick<
      RuntimeInitializationReceipt,
      'workspace_id' | 'repository_id' | 'project_ids' | 'integrations_digest'
    >,
  ) => ({
    workspace_id: initialization.workspace_id,
    identity: {
      repository_id: initialization.repository_id,
      project_ids: [...initialization.project_ids],
      integrations_digest: initialization.integrations_digest,
      work_id: 'decoder-prefix-only',
    },
    attempt: 1,
    expectedWork: { revision: 1, digest: 'a'.repeat(64) },
    expectedLedger: { revision: 1, digest: 'b'.repeat(64) },
    expectedJournal: { revision: 1, digest: 'c'.repeat(64) },
    nativeSessionHandle: 'decoder-prefix-only',
    observation: {
      schema: 'VidaSessionObservation/v1',
      status: 'reported_complete',
      summary: 'decoder prefix only',
      output_digest: 'd'.repeat(64),
      action_id: 'decoder-prefix-only',
      host_attempt_id: 'decoder-prefix-only',
      issue_id: 'decoder-prefix-only',
      agent_id: 'decoder-prefix-only',
      tool_call_ref: 'decoder-prefix-only',
      changed_paths: [],
      evidence_refs: [],
    },
    terminalEvidence: {
      schema: 'StoppedSourceTerminalEvidence/v1',
      native_actor: 'decoder-prefix-only',
      observation_ref: 'missing-terminal-record.json',
      owner_decision_ref: 'missing-owner-record.json',
      terminal: 'partial_stopped',
    },
    candidateSnapshot: { schema: 'UnverifiedSourceSnapshot/v1', entries: [] },
  });

  type StoppedDecoderPrefix = ReturnType<typeof stoppedSourceDecoderRequest>;
  const stoppedSourceDecoderMalformedCases = [
    [
      'request byte bounds',
      [
        {
          label: 'exact request limit still validates the decoded binding',
          byteLength: 1048576,
          change: (r: StoppedDecoderPrefix) => ({ ...r, identity: { ...r.identity, repository_id: 7 } }),
        },
        {
          label: 'request beyond one MiB',
          byteLength: 1048577,
          change: (r: StoppedDecoderPrefix) => ({ ...r, identity: { ...r.identity, repository_id: 7 } }),
          message: 'Capture request exceeds bound',
        },
      ],
    ],
    [
      'context',
      [
        {
          label: 'repository binding',
          change: (r: StoppedDecoderPrefix) => ({ ...r, identity: { ...r.identity, repository_id: 7 } }),
        },
        {
          label: 'revision',
          change: (r: StoppedDecoderPrefix) => ({ ...r, expectedWork: { ...r.expectedWork, revision: '1' } }),
        },
        { label: 'attempt', change: (r: StoppedDecoderPrefix) => ({ ...r, attempt: '1' }) },
        { label: 'owner handle', change: (r: StoppedDecoderPrefix) => ({ ...r, nativeSessionHandle: 7 }) },
      ],
    ],
    [
      'observation',
      [
        {
          label: 'action binding',
          change: (r: StoppedDecoderPrefix) => ({ ...r, observation: { ...r.observation, action_id: 7 } }),
        },
        {
          label: 'status',
          change: (r: StoppedDecoderPrefix) => ({ ...r, observation: { ...r.observation, status: 'unknown' } }),
        },
        {
          label: 'changed paths',
          change: (r: StoppedDecoderPrefix) => ({ ...r, observation: { ...r.observation, changed_paths: [7] } }),
        },
      ],
    ],
    [
      'evidence',
      [
        {
          label: 'terminal state',
          change: (r: StoppedDecoderPrefix) => ({
            ...r,
            terminalEvidence: { ...r.terminalEvidence, terminal: 'completed' },
          }),
        },
        {
          label: 'entry collection',
          change: (r: StoppedDecoderPrefix) => ({ ...r, candidateSnapshot: { ...r.candidateSnapshot, entries: {} } }),
        },
        {
          label: 'entry size',
          change: (r: StoppedDecoderPrefix) => ({
            ...r,
            candidateSnapshot: {
              ...r.candidateSnapshot,
              entries: [{ path: 'candidate.ts', sha256: 'e'.repeat(64), size: null }],
            },
          }),
        },
      ],
    ],
  ] as const;

  test.each(stoppedSourceDecoderMalformedCases)(
    'run stopped-source request %s rejects malformed nested predicates before workspace access',
    async (_group, cases) => {
      for (const [index, entry] of cases.entries()) {
        const root = mkdtempSync(path.join(tmpdir(), 'vida-run-stopped-decoder-'));
        let complete = false;
        try {
          const { config, initialization, initializationPath } = createFixture(root);
          const configPath = path.join(root, 'agent-runtime.config.v1.yaml');
          const requestPath = path.join(root, 'request.json');
          const configBefore = readFileSync(configPath);
          const initializationBefore = readFileSync(initializationPath);
          const request = stoppedSourceDecoderRequest(initialization);
          const args = [
            '--capture-stopped-source',
            'true',
            '--mode',
            'inspect',
            '--project-root',
            root,
            '--request',
            'request.json',
          ];
          if (index === 0) {
            writeFileSync(requestPath, JSON.stringify(request));
            await assert.rejects(
              run(args),
              (error: unknown) =>
                error instanceof Error &&
                'code' in error &&
                error.code === 'ENOENT' &&
                'path' in error &&
                error.path === path.join(root, 'missing-terminal-record.json'),
            );
          }
          const payload = Buffer.from(JSON.stringify(entry.change(request)));
          const requestBytes = 'byteLength' in entry ? Buffer.alloc(entry.byteLength, 0x20) : payload;
          if ('byteLength' in entry) {
            expect(payload.length).toBeLessThanOrEqual(entry.byteLength);
            payload.copy(requestBytes);
          }
          writeFileSync(requestPath, requestBytes);
          const message = 'message' in entry ? entry.message : 'Capture workspace/root binding differs';
          await assert.rejects(run(args), (error: unknown) => error instanceof Error && error.message === message);
          expect(readFileSync(configPath)).toEqual(configBefore);
          expect(readFileSync(initializationPath)).toEqual(initializationBefore);
          expect(readFileSync(requestPath)).toEqual(requestBytes);
          expect(existsSync(sessionHandoffDatabasePath(root, config))).toBe(false);
          expect(existsSync(path.join(root, 'fixture.sqlite'))).toBe(false);
          expect(existsSync(path.join(root, '.agent', 'work'))).toBe(false);
          complete = true;
        } finally {
          if (complete) rmSync(root, { recursive: true, force: true });
          else process.stderr.write(`Retained failed stopped-source decoder root (${entry.label}): ${root}\n`);
        }
      }
    },
  );

  test('run stopped-source capture rejects an unrecognized terminal record before workspace access', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'vida-run-stopped-terminal-'));
    let complete = false;
    try {
      const { config, initialization, initializationPath } = createFixture(root),
        configPath = path.join(root, 'agent-runtime.config.v1.yaml'),
        requestPath = path.join(root, 'request.json'),
        terminalPath = path.join(root, 'terminal-record.json'),
        baseRequest = stoppedSourceDecoderRequest(initialization),
        request = {
          ...baseRequest,
          terminalEvidence: {
            ...baseRequest.terminalEvidence,
            observation_ref: 'terminal-record.json',
          },
        },
        requestBytes = Buffer.from(JSON.stringify(request)),
        terminalBytes = Buffer.from('{}\n'),
        configBefore = readFileSync(configPath),
        initializationBefore = readFileSync(initializationPath);
      writeFileSync(requestPath, requestBytes);
      for (const [byteLength, message] of [
        [terminalBytes.length, 'actual terminal fixture evidence differs'],
        [65536, 'actual terminal fixture evidence differs'],
        [65537, 'Terminal evidence exceeds bound'],
      ] as const) {
        const candidateBytes = Buffer.alloc(byteLength, 0x20);
        terminalBytes.copy(candidateBytes);
        writeFileSync(terminalPath, candidateBytes);
        await assert.rejects(
          run([
            '--capture-stopped-source',
            'true',
            '--mode',
            'inspect',
            '--project-root',
            root,
            '--request',
            'request.json',
          ]),
          (error: unknown) => error instanceof Error && error.message === message,
        );

        expect(readFileSync(configPath)).toEqual(configBefore);
        expect(readFileSync(initializationPath)).toEqual(initializationBefore);
        expect(readFileSync(requestPath)).toEqual(requestBytes);
        expect(readFileSync(terminalPath)).toEqual(candidateBytes);
        expect(existsSync(sessionHandoffDatabasePath(root, config))).toBe(false);
        expect(existsSync(path.join(root, 'fixture.sqlite'))).toBe(false);
        expect(existsSync(path.join(root, '.agent', 'work'))).toBe(false);
      }
      complete = true;
    } finally {
      if (complete) rmSync(root, { recursive: true, force: true });
      else process.stderr.write(`Retained failed stopped-source terminal root: ${root}\n`);
    }
  });

  describe(() => {
    let expectedCandidateBinding: string;
    beforeAll(async () => {
      const { developmentControllerBinding } = await import('../bin/development-controller.ts');
      expectedCandidateBinding = developmentControllerBinding(packageRoot);
    });

    test('run stopped-source apply rejects an escaping authorization path before validating review receipts', async () => {
      await withAutomaticWorkAdmissionCase(async ({ createFixture }) => {
        const fixture = createFixture(false, true);
        const workId = `stopped-source-${randomUUID()}`,
          ownerHandle = `fixture-owner-${randomUUID()}`,
          nativeActor = `fixture-source-${randomUUID()}`,
          actionId = `fixture-action-${randomUUID()}`,
          issueId = `fixture-issue-${randomUUID()}`,
          hostAttemptId = `fixture-attempt-${randomUUID()}`,
          admitted = fixture.admit(fixture.prepare(workId, `user:${workId}`, ownerHandle)),
          admittedWork = admitted.host.work,
          workVersion = admitted.host.workVersion,
          ledgerVersion = admitted.host.ledgerVersion;
        if (!admittedWork || !workVersion || !ledgerVersion)
          throw Error('Stopped-source authorization fixture did not admit complete Host state');

        const initialization = {
            workspace_id: deriveWorkspaceId(fixture.config.repository.repository_id, fixture.root),
            repository_id: admittedWork.binding.repository_id,
            project_ids: [...admittedWork.binding.project_ids],
            integrations_digest: admittedWork.binding.integrations_digest,
          },
          baseRequest = stoppedSourceDecoderRequest(initialization),
          request = {
            ...baseRequest,
            workspace_id: fixture.store.workspaceId,
            identity: { ...baseRequest.identity, work_id: workId },
            expectedWork: workVersion,
            expectedLedger: ledgerVersion,
            nativeSessionHandle: ownerHandle,
            observation: {
              ...baseRequest.observation,
              action_id: actionId,
              issue_id: issueId,
              host_attempt_id: hostAttemptId,
              agent_id: nativeActor,
            },
            terminalEvidence: {
              ...baseRequest.terminalEvidence,
              native_actor: nativeActor,
              observation_ref: 'terminal-record.json',
              owner_decision_ref: 'authorization.json',
            },
          },
          operation = (({ workspace_id: _workspaceId, ...value }) => value)(request),
          requestDigest = canonicalJsonDigest(operation),
          configPath = path.join(fixture.root, 'agent-runtime.config.v1.yaml'),
          requestPath = path.join(fixture.root, 'request.json'),
          terminalPath = path.join(fixture.root, 'terminal-record.json'),
          authorizationPath = path.join(fixture.root, 'authorization.json'),
          planPath = path.join(fixture.root, `capture-plan-${workId}.json`),
          reviewPaths = [1, 2, 3].map((index) => path.join(fixture.root, `review-${index}.json`)),
          protectedPaths = [
            configPath,
            path.join(fixture.root, 'AGENTS.md'),
            path.join(fixture.root, 'AGENT.sidecar.md'),
            path.join(fixture.root, 'docs/agent-instructions/documentation-policy.v1.json'),
            requestPath,
            terminalPath,
            authorizationPath,
            planPath,
            ...reviewPaths,
          ],
          databaseRelativePath = path.relative(fixture.root, sessionHandoffDatabasePath(fixture.root, fixture.config)),
          workspaceBefore = inspectHostWorkspaceDatabase(fixture.root, databaseRelativePath, fixture.store.workspaceId);

        const terminal = {
          schema: 'RootObservedStoppedSource/v1',
          status: 'partial_stopped',
          actor: nativeActor,
          action_id: actionId,
          issue_id: issueId,
          host_attempt_id: hostAttemptId,
          observation_ref: 'terminal-record.json',
          native_status: 'completed',
          source_turn_id: `source-turn-${workId}`,
          final_message_id: `final-message-${workId}`,
          current_tmp_only_turn_id: `temporary-turn-${workId}`,
          owner_thread_id: ownerHandle,
        };
        writeFileSync(requestPath, record(request));
        writeFileSync(terminalPath, record(terminal));
        writeFileSync(planPath, record({ schema: 'StoppedSourceCapturePlan/v1', request_digest: 'wrong-digest' }));
        writeFileSync(authorizationPath, record({}));
        for (const reviewPath of reviewPaths) writeFileSync(reviewPath, record({}));

        const args = [
          '--capture-stopped-source',
          'true',
          '--mode',
          'apply',
          '--project-root',
          fixture.root,
          '--request',
          'request.json',
        ];
        const assertRefusalPreservedFixture = (before: ReadonlyMap<string, Buffer<ArrayBufferLike>>) => {
          for (const [file, bytes] of before) expect(readFileSync(file).equals(bytes)).toBe(true);
          expect(inspectHostWorkspaceDatabase(fixture.root, databaseRelativePath, fixture.store.workspaceId)).toEqual(
            workspaceBefore,
          );
        };
        const captureInput = () => new Map(protectedPaths.map((file) => [file, readFileSync(file)] as const));
        const authorizationPrefix = {
          action: 'source.capture-failed-and-release',
          owner_thread_id: ownerHandle,
          request_digest: requestDigest,
          candidate_binding: 'candidate-binding',
          source_turn_id: terminal.source_turn_id,
          status: 'approved_exact_manifest',
        };
        writeFileSync(
          requestPath,
          record({
            ...request,
            terminalEvidence: { ...request.terminalEvidence, owner_decision_ref: '../outside-authorization.json' },
          }),
        );
        const escapingAuthorizationBefore = captureInput();
        await assert.rejects(
          run(args),
          (error: unknown) => error instanceof Error && error.message === 'Capture authorization path differs',
          'an authorization reference outside the project root is refused',
        );
        assertRefusalPreservedFixture(escapingAuthorizationBefore);
        writeFileSync(requestPath, record(request));
        for (const [byteLength, message] of [
          [65536, 'Capture exact manifest/owner authorization differs'],
          [65537, 'Capture authorization exceeds bound'],
        ] as const) {
          const bytes = Buffer.alloc(byteLength, 0x20);
          Buffer.from(record({})).copy(bytes);
          writeFileSync(authorizationPath, bytes);
          const before = captureInput();
          await assert.rejects(run(args), (error: unknown) => error instanceof Error && error.message === message);
          assertRefusalPreservedFixture(before);
        }
        const malformedAuthorizations = [
          { label: 'top-level schema', value: { ...authorizationPrefix, schema: 7, reviews: [] } },
          {
            label: 'candidate review fields',
            value: {
              ...authorizationPrefix,
              schema: 'StoppedSourceCaptureAuthorization/v1',
              reviews: [{}],
            },
          },
        ];
        for (const entry of malformedAuthorizations) {
          writeFileSync(authorizationPath, record(entry.value));
          const before = captureInput();
          await assert.rejects(
            run(args),
            (error: unknown) =>
              error instanceof Error && error.message === 'Capture exact manifest/owner authorization differs',
            entry.label,
          );
          assertRefusalPreservedFixture(before);
        }

        const candidateBinding = expectedCandidateBinding,
          reviews = [1, 2, 3].map((index) => {
            const review = {
              actor_id: `fixture-reviewer-${index}`,
              history_ref: `history-${index}`,
              tool_call_ref: `tool-call-${index}`,
              verdict: 'pass',
              candidate_binding: candidateBinding,
              receipt_ref: `review-${index}.json`,
            };
            writeFileSync(
              reviewPaths[index - 1]!,
              record({
                schema: 'StoppedSourceCandidateReview/v1',
                verdict: review.verdict,
                candidate_binding: review.candidate_binding,
                actor_id: review.actor_id,
                history_ref: review.history_ref,
                tool_call_ref: review.tool_call_ref,
                request_digest: requestDigest,
              }),
            );
            return review;
          });
        const authorization = {
          schema: 'StoppedSourceCaptureAuthorization/v1',
          action: 'source.capture-failed-and-release',
          owner_thread_id: ownerHandle,
          request_digest: requestDigest,
          candidate_binding: candidateBinding,
          source_turn_id: terminal.source_turn_id,
          status: 'approved_exact_manifest',
          reviews,
        };
        writeFileSync(authorizationPath, record(authorization));

        const reviewPath = reviewPaths[0];
        assert.ok(reviewPath);
        const originalReviewBytes = readFileSync(reviewPath);
        for (const [byteLength, message] of [
          [65536, 'Capture frozen review receipt differs'],
          [65537, 'Capture review receipt exceeds bound'],
        ] as const) {
          const bytes = Buffer.alloc(byteLength, 0x20);
          Buffer.from(record({})).copy(bytes);
          writeFileSync(reviewPath, bytes);
          const before = captureInput();
          await assert.rejects(run(args), (error: unknown) => error instanceof Error && error.message === message);
          assertRefusalPreservedFixture(before);
        }
        writeFileSync(reviewPath, originalReviewBytes);

        const before = captureInput();
        await assert.rejects(
          run(args),
          (error: unknown) => error instanceof Error && error.message === 'frozen capture plan differs',
          'shape-valid plan with a different request digest is rejected',
        );
        assertRefusalPreservedFixture(before);
      });
    });
  });

  type RetiredSourceNativeCase = {
    name: string;
    artifact: unknown;
    message: string;
    patch?: string;
    requestByteLength?: number;
    reference?: string;
    fileKind?: 'symlink' | 'hardlink' | 'directory' | 'oversized';
  };

  type RetiredSourceNativeGroup = {
    name: string;
    cases: readonly RetiredSourceNativeCase[];
  };

  const retiredDecoderTurn = (items: unknown[], turnId = 'fixture-turn') => ({
    id: turnId,
    status: 'interrupted',
    items,
  });
  const retiredDecoderArtifact = (
    turns: unknown[],
    threadId = 'fixture-thread',
    schema = 'RetiredSourceTurnRead/v1',
  ) => ({
    schema,
    data: { thread: { id: threadId, status: { type: 'interrupted' } }, turns },
  });
  const retiredDecoderCommand = (outputText = 'fixture readonly output') => ({
    id: 'fixture-command',
    type: 'commandExecution',
    command: 'fixture readonly output',
    status: 'completed',
    exitCode: 0,
    output: { text: outputText, truncated: false },
  });
  const untrustedIssuedAction = {
    request: { action_id: 'foreign-action', stage_id: 'foreign-stage', scope_digest: 'd'.repeat(64) },
    action: { action_id: 'foreign-action', stage_id: 'foreign-stage', scope_digest: 'd'.repeat(64) },
    issue_id: 'foreign-issue',
    host_attempt_id: 'foreign-attempt',
    development_packet: {
      schema: 'DevelopmentTaskPacket/v1',
      work_item_id: 'foreign-work',
      attempt: 1,
      packet_id: 'foreign-packet',
      digest: 'e'.repeat(64),
    },
  };
  const unmatchedRequest = { ...untrustedIssuedAction.request, action_id: 'a'.repeat(64) };
  const unmatchedAction = { ...untrustedIssuedAction.action, action_id: 'a'.repeat(64) };
  const noIssuedActionOutput = JSON.stringify([
    null,
    { status: 'wave_issued', issue_id: 'foreign-issue', host_attempt_id: 'foreign-attempt' },
    {
      status: 'wave_issued',
      issue_id: '00000000-0000-4000-8000-000000000001',
      host_attempt_id: 'foreign-attempt',
    },
    {
      schema: 'VidaAgentRunResult/v1',
      issued_actions: [
        null,
        {},
        { ...untrustedIssuedAction, development_packet: null },
        untrustedIssuedAction,
        { ...untrustedIssuedAction, request: unmatchedRequest },
        { ...untrustedIssuedAction, request: unmatchedRequest, action: unmatchedAction },
        {
          ...untrustedIssuedAction,
          request: unmatchedRequest,
          action: unmatchedAction,
          issue_id: '00000000-0000-4000-8000-000000000001',
        },
      ],
      stdout: '{invalid-json',
    },
    0,
  ]);
  const retiredDecoderBaselineArtifact = retiredDecoderArtifact([
    retiredDecoderTurn([retiredDecoderCommand(noIssuedActionOutput)]),
  ]);
  const retiredDecoderBaselineBytes = Buffer.from(JSON.stringify(retiredDecoderBaselineArtifact));
  // These matching strings are untrusted decoder inputs, never an admitted issue or native witness.
  const untrustedBoundAction = {
    ...untrustedIssuedAction,
    request: unmatchedRequest,
    action: unmatchedAction,
    issue_id: '00000000-0000-4000-8000-000000000001',
    host_attempt_id: 'b'.repeat(64),
    development_packet: { ...untrustedIssuedAction.development_packet, work_item_id: 'unaccepted-fixture-work' },
  };
  const untrustedBoundWave = {
    status: 'wave_issued',
    issue_id: untrustedBoundAction.issue_id,
    host_attempt_id: untrustedBoundAction.host_attempt_id,
    packet_id: untrustedBoundAction.development_packet.packet_id,
  };
  const retiredDecoderIssuedArtifact = (actions: unknown[], waves: unknown[], extraItems: unknown[] = []) =>
    retiredDecoderArtifact([
      retiredDecoderTurn([
        retiredDecoderCommand(JSON.stringify([{ schema: 'VidaAgentRunResult/v1', issued_actions: actions }, ...waves])),
        ...extraItems,
      ]),
    ]);
  const untrustedEditCommand =
    'def edit(file,transform):\n p=root/file\n p.write_bytes(transform(p.read_bytes()))\nedit("docs/untrusted.ts", transform)';

  test('untrusted retired-source decoder reaches missing workspace refusal without accepting a capture', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'vida-retired-decoder-scope-'));
    let complete = false;
    try {
      const { config, initializationPath } = createFixture(root);
      const sourcePath = 'docs/untrusted.ts';
      const candidatePath = path.join(root, sourcePath);
      const candidateBytes = Buffer.from('export const untrustedFixture = true;\n');
      writeFileSync(candidatePath, candidateBytes);
      const ownerHandle = `fixture-owner-${randomUUID()}`;
      const base = retiredSourceDecoderRequest(config, root, ownerHandle);
      const summary = 'Untrusted parser input, never an admitted native outcome';
      const request = {
        ...base,
        nativeTurnEvidenceRef: '.tmp/untrusted-turn.json',
        actionId: untrustedBoundAction.request.action_id,
        issueId: untrustedBoundAction.issue_id,
        expectedWork: { revision: 1, digest: 'c'.repeat(64) },
        expectedLedger: { revision: 1, digest: 'd'.repeat(64) },
        expectedJournal: { revision: 1, digest: 'e'.repeat(64) },
        observation: {
          schema: 'VidaSessionObservation/v1',
          action_id: untrustedBoundAction.request.action_id,
          issue_id: untrustedBoundAction.issue_id,
          host_attempt_id: untrustedBoundAction.host_attempt_id,
          agent_id: base.terminalEvidence.original_actor_id,
          tool_call_ref: 'fixture:untrusted-decoder',
          status: 'reported_failed',
          summary,
          output_digest: canonicalJsonDigest(summary),
          changed_paths: [sourcePath],
          evidence_refs: ['local://fixture/untrusted-decoder'],
        },
        terminalEvidence: {
          ...base.terminalEvidence,
          operator_thread_id: ownerHandle,
          action_id: untrustedBoundAction.request.action_id,
          issue_id: untrustedBoundAction.issue_id,
          host_attempt_id: untrustedBoundAction.host_attempt_id,
        },
        candidateSnapshot: {
          ...base.candidateSnapshot,
          entries: [
            {
              path: sourcePath,
              exists: true,
              size: candidateBytes.length,
              sha256: createHash('sha256').update(candidateBytes).digest('hex'),
            },
          ],
        },
      };
      const artifact = retiredDecoderIssuedArtifact(
        [untrustedBoundAction],
        [untrustedBoundWave],
        [
          {
            id: 'untrusted-source-path',
            type: 'fileChange',
            status: 'completed',
            changes: [{ path: candidatePath, diff: { text: 'untrusted fixture diff', truncated: false } }],
          },
        ],
      );
      const artifactPath = path.join(root, '.tmp/untrusted-turn.json');
      const requestPath = path.join(root, 'request.json');
      const requestBytes = Buffer.from(JSON.stringify(request));
      const artifactBytes = Buffer.from(JSON.stringify(artifact));
      const configPath = path.join(root, 'agent-runtime.config.v1.yaml');
      const configBytes = readFileSync(configPath);
      const initializationBytes = readFileSync(initializationPath);
      mkdirSync(path.dirname(artifactPath), { recursive: true });
      writeFileSync(artifactPath, artifactBytes);
      writeFileSync(requestPath, requestBytes);
      expect(existsSync(path.join(root, config.control.work_root))).toBe(false);
      const args = [
        '--capture-retired-source',
        'true',
        '--project-root',
        root,
        '--native-session-handle',
        ownerHandle,
        '--request',
        'request.json',
      ];
      const alteredCandidate = Buffer.from(candidateBytes);
      alteredCandidate[0] = alteredCandidate[0]! ^ 1;
      try {
        writeFileSync(candidatePath, alteredCandidate);
        await assert.rejects(run(args), { message: 'Retired-source candidate changed after attribution' });
        expect(existsSync(sessionHandoffDatabasePath(root, config))).toBe(false);
        expect(existsSync(path.join(root, config.control.work_root))).toBe(false);
      } finally {
        writeFileSync(candidatePath, candidateBytes);
      }
      await assert.rejects(run(args), (error: unknown) => {
        assert.ok(error && typeof error === 'object' && 'code' in error && 'path' in error);
        assert.equal(error.code, 'ENOENT');
        assert.ok(typeof error.path === 'string');
        assert.equal(path.basename(error.path), path.basename(config.control.work_root));
        return true;
      });
      expect(readFileSync(requestPath)).toEqual(requestBytes);
      expect(readFileSync(artifactPath)).toEqual(artifactBytes);
      expect(readFileSync(candidatePath)).toEqual(candidateBytes);
      expect(readFileSync(configPath)).toEqual(configBytes);
      expect(readFileSync(initializationPath)).toEqual(initializationBytes);
      expect(existsSync(sessionHandoffDatabasePath(root, config))).toBe(false);
      expect(existsSync(path.join(root, config.control.work_root))).toBe(false);
      complete = true;
    } finally {
      if (complete) rmSync(root, { recursive: true, force: true });
      else process.stderr.write(`Retained untrusted retired-source decoder fixture: ${root}\n`);
    }
  });

  const retiredSourceNativeGroups: readonly RetiredSourceNativeGroup[] = [
    {
      name: 'raw request byte bounds',
      cases: [
        {
          name: 'request at one MiB still reaches issue mapping',
          requestByteLength: 1048576,
          artifact: retiredDecoderBaselineArtifact,
          message: 'Retired-source original issue mapping differs',
        },
        {
          name: 'request beyond one MiB is rejected before decoding',
          requestByteLength: 1048577,
          artifact: retiredDecoderBaselineArtifact,
          message: 'Retired-source request exceeds bound',
        },
      ],
    },
    {
      name: 'untrusted patch descriptor guards',
      cases: [
        {
          name: 'retained patch has no path headers',
          patch: 'untrusted non-patch text\n',
          message: 'Retired-source patch paths are missing',
        },
        {
          name: 'retained patch path is outside scope',
          patch: 'diff --git a/docs/untrusted.ts b/docs/untrusted.ts\n',
          message: 'Retired-source mutation path is outside the original scope',
        },
        {
          name: 'excluded patch path cannot hide a remaining out-of-scope path',
          patch: 'diff --git a/docs/skipped.ts b/docs/skipped.ts\ndiff --git a/docs/untrusted.ts b/docs/untrusted.ts\n',
          command: 'git apply --exclude="docs/skipped.ts" .tmp/untrusted.patch',
          message: 'Retired-source mutation path is outside the original scope',
        },
      ].map(({ name, patch, command = 'git apply .tmp/untrusted.patch', message }) => ({
        name,
        patch,
        artifact: retiredDecoderIssuedArtifact(
          [untrustedBoundAction],
          [untrustedBoundWave],
          [{ ...retiredDecoderCommand(), id: 'untrusted-patch-descriptor', command }],
        ),
        message,
      })),
    },
    {
      name: 'untrusted source path guards',
      cases: ['docs/untrusted.ts', '/untrusted-source.ts'].map((sourcePath) => ({
        name: `file change outside the empty decoder scope: ${sourcePath}`,
        artifact: retiredDecoderIssuedArtifact(
          [untrustedBoundAction],
          [untrustedBoundWave],
          [
            {
              id: 'untrusted-source-path',
              type: 'fileChange',
              status: 'completed',
              changes: [{ path: sourcePath, diff: { text: 'untrusted diff text', truncated: false } }],
            },
          ],
        ),
        message: 'Retired-source mutation path is outside the original scope',
      })),
    },
    {
      name: 'untrusted command attribution guards',
      cases: [
        {
          name: 'write syntax without resolved paths',
          command: 'writeFileSync("docs/untrusted.ts", "untrusted")',
          message: 'Retired-source command mutation paths are unresolved: untrusted-command-attribution',
        },
        {
          name: 'direct Path write is outside scope',
          command: 'Path("docs/untrusted.ts").write_text("untrusted")',
        },
        {
          name: 'bound Path variable write is outside scope',
          command: 'p = Path("docs/untrusted.ts")\np.write_text("untrusted")',
        },
        {
          name: 'Path writable context is outside scope',
          command: 'with Path("docs/untrusted.ts").open("w") as stream: pass',
        },
        {
          name: 'root-relative writable context is outside scope',
          command: 'with (root/"docs/untrusted.ts").open("w") as stream: pass',
        },
        {
          name: 'failed command is unresolved',
          command: 'Path("docs/untrusted.ts").write_text("untrusted")',
          exitCode: 1,
          message: 'Retired-source command effect is unresolved',
        },
        {
          name: 'patch command has no retained reference',
          command: 'git apply',
          message: 'Retired-source patch outcome is unresolved',
        },
        {
          name: 'patch command has ambiguous retained references',
          command: 'git apply .tmp/first.patch .tmp/second.patch',
          message: 'Retired-source patch outcome is unresolved',
        },
        {
          name: 'failed patch command is unresolved',
          command: 'git apply .tmp/untrusted.patch',
          exitCode: 1,
          message: 'Retired-source patch outcome is unresolved',
        },
        {
          name: 'patch check cannot conceal an out-of-scope write',
          command: 'git apply --check .tmp/untrusted.patch; Path("docs/untrusted.ts").write_text("untrusted")',
        },
      ].map(
        ({ name, command, exitCode = 0, message = 'Retired-source mutation path is outside the original scope' }) => ({
          name,
          artifact: retiredDecoderIssuedArtifact(
            [untrustedBoundAction],
            [untrustedBoundWave],
            [{ ...retiredDecoderCommand(), id: 'untrusted-command-attribution', command, exitCode }],
          ),
          message,
        }),
      ),
    },
    {
      name: 'untrusted edit report guards',
      cases: [
        {
          name: 'edit report is not JSON',
          output: 'untrusted non-JSON output',
          message: 'Retired-source document edit result is unresolved',
        },
        {
          name: 'edit report is not an object',
          output: 'null',
          message: 'Retired-source document edit paths differ from the recorded command',
        },
        {
          name: 'edit report claims an undeclared path',
          output: JSON.stringify({ updated: ['docs/foreign.ts'] }),
          message: 'Retired-source document edit paths differ from the recorded command',
        },
        {
          name: 'declared edit path remains outside the original scope',
          output: JSON.stringify({ updated: ['docs/untrusted.ts'] }),
          message: 'Retired-source mutation path is outside the original scope',
        },
      ].map(({ name, output, message }) => ({
        name,
        artifact: retiredDecoderIssuedArtifact(
          [untrustedBoundAction],
          [untrustedBoundWave],
          [{ ...retiredDecoderCommand(output), id: 'untrusted-edit-report', command: untrustedEditCommand }],
        ),
        message,
      })),
    },
    {
      name: 'untrusted issue mapping cardinality guards',
      cases: [
        { name: 'matching action without matching wave', actions: [untrustedBoundAction], waves: [] },
        { name: 'matching wave without matching action', actions: [], waves: [untrustedBoundWave] },
        {
          name: 'ambiguous matching actions',
          actions: [untrustedBoundAction, untrustedBoundAction],
          waves: [untrustedBoundWave],
        },
        {
          name: 'ambiguous matching waves',
          actions: [untrustedBoundAction],
          waves: [untrustedBoundWave, untrustedBoundWave],
        },
      ].map(({ name, actions, waves }) => ({
        name,
        artifact: retiredDecoderIssuedArtifact(actions, waves),
        message: 'Retired-source original issue mapping differs',
      })),
    },
    {
      name: 'untrusted packet binding guards',
      cases: [
        {
          name: 'packet belongs to another work',
          candidate: {
            ...untrustedBoundAction,
            development_packet: { ...untrustedBoundAction.development_packet, work_item_id: 'foreign-work' },
          },
        },
        {
          name: 'packet belongs to another attempt',
          candidate: {
            ...untrustedBoundAction,
            development_packet: { ...untrustedBoundAction.development_packet, attempt: 2 },
          },
        },
        {
          name: 'packet differs from the issued wave',
          candidate: {
            ...untrustedBoundAction,
            development_packet: { ...untrustedBoundAction.development_packet, packet_id: 'foreign-packet-id' },
          },
        },
        {
          name: 'packet digest is not a SHA-256 value',
          candidate: {
            ...untrustedBoundAction,
            development_packet: { ...untrustedBoundAction.development_packet, digest: 'untrusted-digest' },
          },
        },
        {
          name: 'action stage differs from its request',
          candidate: { ...untrustedBoundAction, action: { ...untrustedBoundAction.action, stage_id: 'other-stage' } },
        },
        {
          name: 'action scope differs from its request',
          candidate: {
            ...untrustedBoundAction,
            action: { ...untrustedBoundAction.action, scope_digest: 'f'.repeat(64) },
          },
        },
      ].map(({ name, candidate }) => ({
        name,
        artifact: retiredDecoderIssuedArtifact([candidate], [untrustedBoundWave]),
        message: 'Retired-source original issued packet binding differs',
      })),
    },
    {
      name: 'untrusted file change guards',
      cases: [
        { name: 'file change status is unresolved', status: 'unknown', changes: [] },
        { name: 'file change collection is absent', changes: null },
        { name: 'file change entry is not an object', changes: [null] },
        { name: 'file change path is not a string', changes: [{ path: null, diff: { text: '', truncated: false } }] },
        { name: 'file change diff is not an object', changes: [{ path: 'src/probe.ts', diff: null }] },
        {
          name: 'file change diff text is not a string',
          changes: [{ path: 'src/probe.ts', diff: { text: null, truncated: false } }],
        },
        {
          name: 'file change truncation is not a boolean',
          changes: [{ path: 'src/probe.ts', diff: { text: '', truncated: null } }],
        },
        {
          name: 'file change diff is truncated',
          changes: [{ path: 'src/probe.ts', diff: { text: 'untrusted partial diff', truncated: true } }],
          message: 'Retired-source file-change evidence is incomplete',
        },
      ].map(({ name, status = 'completed', changes, message = 'Retired-source file-change event is unresolved' }) => ({
        name,
        artifact: retiredDecoderIssuedArtifact(
          [untrustedBoundAction],
          [untrustedBoundWave],
          [{ id: 'untrusted-file-change', type: 'fileChange', status, changes }],
        ),
        message,
      })),
    },
    {
      name: 'artifact and item shape guards',
      cases: [
        {
          name: 'unsupported read schema',
          artifact: retiredDecoderArtifact([retiredDecoderTurn([])], 'fixture-thread', 'RetiredSourceTurnRead/v0'),
          message: 'Retired-source native evidence contract differs',
        },
        {
          name: 'turn cardinality',
          artifact: retiredDecoderArtifact([]),
          message: 'Retired-source native evidence contract differs',
        },
        {
          name: 'turn item collection',
          artifact: retiredDecoderArtifact([{ id: 'fixture-turn', status: 'interrupted', items: null }]),
          message: 'Retired-source turn is invalid',
        },
        {
          name: 'item record shape',
          artifact: retiredDecoderArtifact([retiredDecoderTurn([null])]),
          message: 'Retired-source thread item is invalid',
        },
      ],
    },
    {
      name: 'thread and turn binding guards',
      cases: [
        {
          name: 'thread identity',
          artifact: retiredDecoderArtifact([retiredDecoderTurn([])], 'unbound-thread'),
          message: 'Retired-source original thread or interrupted turn differs',
        },
        {
          name: 'turn identity',
          artifact: retiredDecoderArtifact([retiredDecoderTurn([], 'unbound-turn')]),
          message: 'Retired-source original thread or interrupted turn differs',
        },
        {
          name: 'forbidden final agent message',
          artifact: retiredDecoderArtifact([
            retiredDecoderTurn([{ id: 'fixture-final', type: 'agentMessage', phase: 'final' }]),
          ]),
          message: 'Retired-source original thread or interrupted turn differs',
        },
      ],
    },
    {
      name: 'command inventory guards',
      cases: [
        {
          name: 'empty command inventory',
          artifact: retiredDecoderArtifact([retiredDecoderTurn([])]),
          message: 'Retired-source complete command inventory is absent',
        },
        {
          name: 'unresolved command outcome',
          artifact: retiredDecoderArtifact([retiredDecoderTurn([{ ...retiredDecoderCommand(), status: 'unknown' }])]),
          message: 'Retired-source command inventory has a duplicate or unresolved outcome',
        },
        {
          name: 'duplicate command identity',
          artifact: retiredDecoderArtifact([retiredDecoderTurn([retiredDecoderCommand(), retiredDecoderCommand()])]),
          message: 'Retired-source command inventory has a duplicate or unresolved outcome',
        },
        {
          name: 'incomplete command output',
          artifact: retiredDecoderArtifact([
            retiredDecoderTurn([{ ...retiredDecoderCommand(), output: { text: 1, truncated: false } }]),
          ]),
          message: 'Retired-source command output is incomplete',
        },
      ],
    },
    {
      name: 'command evidence guards',
      cases: [
        {
          name: 'truncated command output remains incomplete evidence',
          artifact: retiredDecoderArtifact([
            retiredDecoderTurn([
              { ...retiredDecoderCommand(), output: { text: 'untrusted partial output', truncated: true } },
            ]),
          ]),
          message: 'Retired-source truncated command output could hide an effect',
        },
        {
          name: 'truncated command with a write command remains unsafe',
          artifact: retiredDecoderArtifact([
            retiredDecoderTurn([
              {
                ...retiredDecoderCommand(),
                command: 'Get-Content source.ts | Set-Content source.ts',
                output: { text: 'partial read', truncated: true },
              },
            ]),
          ]),
          message: 'Retired-source truncated command output could hide an effect',
        },
      ],
    },
    {
      name: 'remaining artifact and command shape bounds',
      cases: [
        {
          name: 'decoded artifact must be an object',
          artifact: [],
          message: 'Retired-source native evidence must be an object',
        },
        {
          name: 'thread status type must be nonempty',
          artifact: {
            ...retiredDecoderArtifact([retiredDecoderTurn([retiredDecoderCommand()])]),
            data: {
              ...retiredDecoderArtifact([retiredDecoderTurn([retiredDecoderCommand()])]).data,
              thread: { id: 'fixture-thread', status: { type: '' } },
            },
          },
          message: 'Retired-source original thread or interrupted turn differs',
        },
        {
          name: 'turn status must remain interrupted',
          artifact: retiredDecoderArtifact([{ ...retiredDecoderTurn([retiredDecoderCommand()]), status: 'completed' }]),
          message: 'Retired-source original thread or interrupted turn differs',
        },
        {
          name: 'turn item count is bounded',
          artifact: retiredDecoderArtifact([
            retiredDecoderTurn(
              Array.from({ length: 4097 }, (_, index) => ({
                ...retiredDecoderCommand(),
                id: `fixture-command-${index}`,
              })),
            ),
          ]),
          message: 'Retired-source original thread or interrupted turn differs',
        },
      ],
    },
    {
      name: 'remaining command inventory bounds',
      cases: [
        {
          name: 'item identity must be a string',
          artifact: retiredDecoderArtifact([retiredDecoderTurn([{ ...retiredDecoderCommand(), id: null }])]),
          message: 'Retired-source thread item is invalid',
        },
        {
          name: 'command text must be a string',
          artifact: retiredDecoderArtifact([retiredDecoderTurn([{ ...retiredDecoderCommand(), command: null }])]),
          message: 'Retired-source command inventory has a duplicate or unresolved outcome',
        },
        {
          name: 'command exit code must be an integer',
          artifact: retiredDecoderArtifact([retiredDecoderTurn([{ ...retiredDecoderCommand(), exitCode: 0.5 }])]),
          message: 'Retired-source command inventory has a duplicate or unresolved outcome',
        },
        {
          name: 'command inventory has a maximum size',
          artifact: retiredDecoderArtifact([
            retiredDecoderTurn(
              Array.from({ length: 513 }, (_, index) => ({
                ...retiredDecoderCommand(),
                id: `fixture-command-${index}`,
              })),
            ),
          ]),
          message: 'Retired-source complete command inventory is absent',
        },
      ],
    },
    {
      name: 'native evidence reference guards',
      cases: [
        {
          name: 'reference must name retained temporary evidence',
          artifact: retiredDecoderArtifact([retiredDecoderTurn([retiredDecoderCommand()])]),
          reference: 'request.json',
          message: 'Retired-source native evidence must reference a retained .tmp read',
        },
        {
          name: 'reference must remain inside the project root',
          artifact: retiredDecoderArtifact([retiredDecoderTurn([retiredDecoderCommand()])]),
          reference: '.tmp/../..',
          message: 'Retired-source native evidence path differs',
        },
      ],
    },
    {
      name: 'native evidence file identity guards',
      cases: [
        {
          name: 'symbolic link is refused',
          artifact: retiredDecoderArtifact([retiredDecoderTurn([retiredDecoderCommand()])]),
          fileKind: 'symlink',
          message: 'Retired-source native evidence path differs',
        },
        {
          name: 'hard link is refused',
          artifact: retiredDecoderArtifact([retiredDecoderTurn([retiredDecoderCommand()])]),
          fileKind: 'hardlink',
          message: 'Retired-source native evidence path differs',
        },
        {
          name: 'directory is refused as evidence',
          artifact: retiredDecoderArtifact([retiredDecoderTurn([retiredDecoderCommand()])]),
          fileKind: 'directory',
          message: 'Retired-source native evidence path differs',
        },
      ],
    },
    {
      name: 'native evidence byte bound',
      cases: [
        {
          name: 'artifact exceeds five MiB',
          artifact: null,
          fileKind: 'oversized',
          message: 'Retired-source native evidence changed or exceeds its bound',
        },
      ],
    },
    {
      name: 'command forms accepted up to original issue mapping',
      cases: [
        {
          name: 'missing output remains a valid absent output',
          artifact: retiredDecoderArtifact([retiredDecoderTurn([{ ...retiredDecoderCommand(), output: undefined }])]),
          message: 'Retired-source original issue mapping differs',
        },
        {
          name: 'truncated read-only command remains prefix-accepted',
          artifact: retiredDecoderArtifact([
            retiredDecoderTurn([
              {
                ...retiredDecoderCommand(),
                command: 'Get-Content source.ts',
                output: { text: 'partial read', truncated: true },
              },
            ]),
          ]),
          message: 'Retired-source original issue mapping differs',
        },
      ],
    },
  ];

  test.each(retiredSourceNativeGroups.map(({ name, cases }) => [name, cases] as const))(
    'run retired-source native decoder rejects %s before persistence',
    async (_name, cases) => {
      for (const [index, entry] of cases.entries()) {
        const root = mkdtempSync(path.join(tmpdir(), 'vida-run-retired-native-'));
        let complete = false;
        try {
          const { config, initializationPath } = createFixture(root),
            configPath = path.join(root, 'agent-runtime.config.v1.yaml'),
            requestPath = path.join(root, 'request.json'),
            artifactPath = path.join(root, '.tmp', 'untrusted-turn.json'),
            targetPath = path.join(root, '.tmp', 'private-target.json'),
            patchPath = path.join(root, '.tmp', 'untrusted.patch'),
            patchBytes = entry.patch === undefined ? undefined : Buffer.from(entry.patch),
            ownerHandle = `fixture-owner-${randomUUID()}`,
            actionId = 'a'.repeat(64),
            hostAttemptId = 'b'.repeat(64),
            issueId = '00000000-0000-4000-8000-000000000001',
            base = retiredSourceDecoderRequest(config, root, ownerHandle),
            request = {
              ...base,
              nativeTurnEvidenceRef: '.tmp/untrusted-turn.json',
              actionId,
              issueId,
              observation: {
                schema: 'VidaSessionObservation/v1',
                action_id: actionId,
                host_attempt_id: hostAttemptId,
                issue_id: issueId,
                agent_id: 'fixture:decoder-only',
                tool_call_ref: 'fixture:decoder-only',
                status: 'reported_failed',
                summary: 'Untrusted decoder fixture',
                output_digest: 'c'.repeat(64),
                evidence_refs: [],
              },
              terminalEvidence: {
                ...base.terminalEvidence,
                action_id: actionId,
                issue_id: issueId,
                host_attempt_id: hostAttemptId,
              },
            },
            requestBytes = Buffer.from(JSON.stringify(request)),
            artifactBytes = Buffer.from(JSON.stringify(entry.artifact)),
            configBefore = readFileSync(configPath),
            initializationBefore = readFileSync(initializationPath),
            args = [
              '--capture-retired-source',
              'true',
              '--project-root',
              root,
              '--native-session-handle',
              ownerHandle,
              '--request',
              'request.json',
            ];
          let expectedRequestBytes = requestBytes;
          const assertUnchanged = (
            expectedArtifact: typeof artifactBytes,
            fileKind?: RetiredSourceNativeCase['fileKind'],
          ) => {
            expect(readFileSync(configPath)).toEqual(configBefore);
            expect(readFileSync(initializationPath)).toEqual(initializationBefore);
            expect(readFileSync(requestPath)).toEqual(expectedRequestBytes);
            if (fileKind === 'directory') {
              expect(lstatSync(artifactPath).isDirectory()).toBe(true);
              expect(readdirSync(artifactPath)).toEqual([]);
            } else expect(readFileSync(artifactPath)).toEqual(expectedArtifact);
            if (fileKind === 'symlink') {
              expect(lstatSync(artifactPath).isSymbolicLink()).toBe(true);
              expect(readlinkSync(artifactPath)).toBe(targetPath);
            }
            if (fileKind === 'hardlink') {
              expect(lstatSync(artifactPath).nlink).toBe(2);
              expect(lstatSync(artifactPath).ino).toBe(lstatSync(targetPath).ino);
            }
            if (fileKind === 'symlink' || fileKind === 'hardlink')
              expect(readFileSync(targetPath)).toEqual(artifactBytes);
            if (patchBytes !== undefined) expect(readFileSync(patchPath)).toEqual(patchBytes);
            expect(existsSync(sessionHandoffDatabasePath(root, config))).toBe(false);
            expect(existsSync(path.join(root, '.agent', 'work'))).toBe(false);
          };
          mkdirSync(path.dirname(artifactPath), { recursive: true });
          writeFileSync(requestPath, requestBytes);
          if (patchBytes !== undefined) writeFileSync(patchPath, patchBytes);
          if (index === 0) {
            // Each group checks the shared control once; candidate fixtures stay isolated.
            writeFileSync(artifactPath, retiredDecoderBaselineBytes);
            await assert.rejects(
              run(args),
              (error: unknown) =>
                error instanceof Error && error.message === 'Retired-source original issue mapping differs',
            );
            assertUnchanged(retiredDecoderBaselineBytes);
          }
          let candidateBytes = artifactBytes;
          if (entry.reference !== undefined) {
            expectedRequestBytes = Buffer.from(JSON.stringify({ ...request, nativeTurnEvidenceRef: entry.reference }));
            writeFileSync(requestPath, expectedRequestBytes);
          }
          if (entry.requestByteLength !== undefined) {
            expect(requestBytes.length).toBeLessThanOrEqual(entry.requestByteLength);
            expectedRequestBytes = Buffer.alloc(entry.requestByteLength, 0x20);
            requestBytes.copy(expectedRequestBytes);
            writeFileSync(requestPath, expectedRequestBytes);
          }
          if (entry.fileKind !== undefined && index === 0) unlinkSync(artifactPath);
          if (entry.fileKind === 'symlink' || entry.fileKind === 'hardlink') {
            writeFileSync(targetPath, artifactBytes);
            if (entry.fileKind === 'symlink') symlinkSync(targetPath, artifactPath);
            else linkSync(targetPath, artifactPath);
          } else if (entry.fileKind === 'directory') {
            mkdirSync(artifactPath);
          } else if (entry.fileKind === 'oversized') {
            candidateBytes = Buffer.alloc(5 * 1024 * 1024 + 1, 0x20);
            writeFileSync(artifactPath, candidateBytes);
          } else {
            writeFileSync(artifactPath, artifactBytes);
          }
          await assert.rejects(
            run(args),
            (error: unknown) => error instanceof Error && error.message === entry.message,
          );
          assertUnchanged(candidateBytes, entry.fileKind);
          complete = true;
        } finally {
          if (complete) rmSync(root, { recursive: true, force: true });
          else process.stderr.write(`Retained failed retired-source native decoder root (${entry.name}): ${root}\n`);
        }
      }
    },
  );
}

test('failed prewriter owner recovery rejects non-string arguments before repository access', () => {
  const cases: unknown[][] = [
    ['--mode', null, '--project-root', '/unused', '--request', 'request.json'],
    [null, 'inspect', '--project-root', '/unused', '--request', 'request.json'],
    ['--mode', 1, '--project-root', '/unused', '--request', 'request.json'],
    [1, 'inspect', '--project-root', '/unused', '--request', 'request.json'],
    ['--mode', { length: 1 }, '--project-root', '/unused', '--request', 'request.json'],
    ['--mode', undefined, '--project-root', '/unused', '--request', 'request.json'],
  ];
  for (const args of cases) {
    expect(() => {
      Reflect.apply(recoverFailedPrewriterOwner, undefined, [args]);
    }).toThrow(/^failed prewriter owner recovery: arguments invalid$/);
  }
});
