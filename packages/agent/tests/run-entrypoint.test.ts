import { recoverFailedPrewriterOwner } from '../bin/recover-failed-prewriter-owner.ts';
import { afterAll, describe, expect, test, spyOn } from 'bun:test';
import { Database, type SQLQueryBindings } from 'bun:sqlite';
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
  openConfiguredMastraSessionLedger,
  sessionHandoffDatabasePath,
} from '../src/orchestration/persistent-session-handoff.ts';
import { loadProjectSetContext } from '../src/config/project-context.ts';
import { sessionBridgeRunId } from '../src/orchestration/mastra-session-bridge.ts';
import { boundedSpawnSync, commandOutcomeUnknown, executionBudget, pinnedEnvironment } from '../bin/bun.ts';
import { spawn, spawnSync, type SpawnSyncReturns } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import {
  cpSync,
  existsSync,
  linkSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { advanceCutoff, assertNoActiveCutoverMaintenance, run, writeDurable } from '../bin/run.ts';
import { initializeProject } from '../bin/init.ts';
import { inspectLocalSession } from '../src/orchestration/inspect-local-session.ts';
import { fixtureInitializationTemplates } from './helpers/runtime-initialization-fixture.js';
import type { RuntimeInitializationReceipt } from '../src/config/initialization-record.js';
import { readRuntimeInitializationReceipt } from '../src/config/initialization-record.js';
import { coordinationLedgerDigest, validateCoordinationLedgerV1 } from '../src/contracts/envelopes.ts';
import type { AgentRuntimeConfig } from '../src/config/runtime-config.ts';
import type { SessionAgentAction } from '../src/orchestration/session-handoff.ts';
import type { SessionHandoffContext } from '../src/orchestration/session-handoff.ts';
import {
  parseSessionBridgeRequest,
  type SessionBridgeRequest,
} from '../src/orchestration/mastra-session-bridge-contract.ts';
import { correctiveExecutionSchema } from '../src/orchestration/corrective-execution-contract.ts';
import type { SessionAgentOutcome } from '../src/orchestration/session-handoff.ts';
import type { ConfiguredContext, ConfiguredContextEntry } from '../src/orchestration/configured-context.ts';
import type { DeliveredWorkContinuationRequest } from '../src/orchestration/delivered-work-continuation.ts';
import type { LocalWorkAdmissionInput } from '../src/orchestration/local-work-admission.ts';
import { Console } from 'node:console';
import { Writable } from 'node:stream';
import { createAutomaticWorkAdmissionFixture } from './helpers/automatic-work-admission-fixture.ts';

test('readonly local inspection validates decoded rows and retains uncertain journal custody without writes', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-readonly-inspection-'));
  if (!path.resolve(root).startsWith(path.resolve(tmpdir(), 'vida-readonly-inspection-')))
    throw Error('owned inspection fixture cleanup target differs');
  const config = loadRuntimeConfig(path.resolve(import.meta.dirname, '..', '..', '..'));
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
    const originalExitCode = process.exitCode;
    await main({
      isMain: true,
      args: [],
      execute: async () => {
        throw Error(message);
      },
      io,
      exit: process,
    });
    expect(process.exitCode).toBe(1);
    process.exitCode = originalExitCode;
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
import type { FlowIntent, WorkItemKind, WorkItemSelection } from '../src/config/runtime-config.ts';
import { runtimePackageAccess, runtimePackageCodePaths } from '../src/config/runtime-config.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { snapshotDeclaredSources, snapshotRuntimePackageSources } from '../src/orchestration/scoped-source-snapshot.ts';
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
import { applyDeliveredWorkContinuationPlan } from '../bin/runtime-code-rebind.ts';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

type ActiveSelectorState = Parameters<typeof advanceCutoff>[0];

function requireFixtureWorkState(store: HostStateStore, identity: WorkIdentity): WorkState {
  const state = store.readHostStateSnapshot(identity).work;
  if (!state) throw Error('fixture work state is missing');
  return state;
}

type TerminalUtf8SpawnResult = SpawnSyncReturns<string> & {
  readonly status: number;
  readonly signal: null;
  readonly stdout: string;
  readonly stderr: string;
  readonly error?: undefined;
};

function isTerminalUtf8SpawnResult(value: unknown): value is TerminalUtf8SpawnResult {
  return (
    isPlainRecord(value) &&
    typeof value.pid === 'number' &&
    Array.isArray(value.output) &&
    typeof value.status === 'number' &&
    value.signal === null &&
    value.error === undefined &&
    typeof value.stdout === 'string' &&
    typeof value.stderr === 'string'
  );
}

type PublicRunChildOptions = {
  readonly budget?: ReturnType<typeof executionBudget>;
  readonly childTimeout?: number;
  readonly onUnknown?: () => void;
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

interface TestRunAction {
  readonly request: SessionBridgeRequest;
  readonly action: SessionAgentAction;
  readonly issue_id?: string | null;
  readonly host_attempt_id?: string | undefined;
  readonly instruction_activation?: unknown;
  readonly instruction_bindings?: unknown;
  readonly research_instruction_activation?: unknown;
  readonly research_instruction_bindings?: unknown;
  readonly configured_context?: ConfiguredContext | null;
  readonly development_packet?: unknown;
  readonly research_output_contract?: unknown;
  readonly synthesis_output_contract?: unknown;
  readonly synthesis_source_catalog?: unknown;
  readonly historical_review_input?: {
    readonly body_base64: string;
    readonly body_sha256: string;
    readonly body_byte_length: number;
    readonly body_ref: string;
    readonly original_request_pointer: string;
  };
  readonly prior_issue_outcome?: 'unknown';
  readonly logical_action_id?: string;
}

interface TestRunPayload {
  readonly schema: 'VidaAgentRunResult/v1';
  readonly status: string;
  readonly code?: string;
  readonly message?: string;
  readonly runtime_selector_observed?: boolean;
  readonly rights_granted?: boolean;
  readonly runtime_acceptance?: boolean;
  readonly runtime_accepted?: boolean;
  readonly accepted_result?: boolean;
  readonly next_operation?: string | null;
  readonly resume_status?: string;
  readonly research_preparation_status?: string | null;
  readonly code_digest?: string;
  readonly digest?: string;
  readonly revision?: number;
  readonly state_version?: StateVersion;
  readonly work_version?: StateVersion;
  readonly ledger_version?: StateVersion;
  readonly next_actions?: readonly TestRunAction[];
  readonly issued_actions?: readonly TestRunAction[];
  readonly action_statuses?: readonly { readonly action_id: string; readonly status: string }[];
  readonly continuation_review?: TestContinuationReview;
  readonly recorded_observation?: unknown;
  readonly reported_observation?: unknown;
  readonly request?: unknown;
}

interface TestHistoricalReviewInput {
  readonly body_base64: string;
  readonly body_sha256: string;
  readonly body_byte_length: number;
  readonly body_ref: string;
  readonly original_request_pointer: string;
}

interface TestContinuationReview {
  readonly action_id: string;
  readonly status: string;
  readonly prior_issue_outcome?: 'unknown';
  readonly accepted_result: false;
  readonly runtime_accepted: false;
}

function requireStateVersion(value: StateVersion | undefined): StateVersion {
  if (!value) throw Error('run result state version is missing');
  return value;
}

function requireNextActions(payload: TestRunPayload): readonly TestRunAction[] {
  if (!payload.next_actions) throw Error('run result next actions are missing');
  return payload.next_actions;
}

function requireIssuedActions(payload: TestRunPayload): readonly TestRunAction[] {
  if (!payload.issued_actions) throw Error('run result issued actions are missing');
  return payload.issued_actions;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item: unknown) => typeof item === 'string');
}

function isConfiguredContextEntry(value: unknown): value is ConfiguredContextEntry {
  return (
    isPlainRecord(value) &&
    typeof value.id === 'string' &&
    (value.kind === 'official' || value.kind === 'local' || value.kind === 'skill') &&
    typeof value.location === 'string' &&
    typeof value.title === 'string' &&
    (value.status === 'unfetched_reference' || value.status === 'local_excerpt') &&
    (value.sha256 === null || typeof value.sha256 === 'string') &&
    (value.bytes === null || typeof value.bytes === 'number') &&
    (value.content === null || typeof value.content === 'string') &&
    typeof value.truncated === 'boolean'
  );
}

function isConfiguredContext(value: unknown): value is ConfiguredContext {
  return (
    isPlainRecord(value) &&
    value.schema === 'ConfiguredContext/v1' &&
    typeof value.work_id === 'string' &&
    typeof value.attempt === 'number' &&
    Array.isArray(value.entries) &&
    value.entries.every(isConfiguredContextEntry) &&
    typeof value.digest === 'string'
  );
}

function isHistoricalReviewInput(value: unknown): value is TestHistoricalReviewInput {
  return (
    isPlainRecord(value) &&
    typeof value.body_base64 === 'string' &&
    typeof value.body_sha256 === 'string' &&
    typeof value.body_byte_length === 'number' &&
    typeof value.body_ref === 'string' &&
    typeof value.original_request_pointer === 'string'
  );
}

function isContinuationReview(value: unknown): value is TestContinuationReview {
  return (
    isPlainRecord(value) &&
    typeof value.action_id === 'string' &&
    typeof value.status === 'string' &&
    (value.prior_issue_outcome === undefined || value.prior_issue_outcome === 'unknown') &&
    value.accepted_result === false &&
    value.runtime_accepted === false
  );
}

function isSessionAgentOutcome(value: unknown): value is SessionAgentOutcome {
  return (
    isPlainRecord(value) &&
    typeof value.action_id === 'string' &&
    typeof value.handoff_digest === 'string' &&
    typeof value.work_id === 'string' &&
    typeof value.attempt === 'number' &&
    typeof value.scope_digest === 'string' &&
    typeof value.wave_index === 'number' &&
    typeof value.action_order === 'number' &&
    typeof value.stage_id === 'string' &&
    typeof value.role === 'string' &&
    (value.status === 'reported_complete' || value.status === 'reported_failed') &&
    typeof value.summary === 'string' &&
    isPlainRecord(value.session_result) &&
    typeof value.session_result.issue_id === 'string' &&
    typeof value.session_result.agent_id === 'string' &&
    typeof value.session_result.tool_call_ref === 'string' &&
    typeof value.session_result.output_digest === 'string' &&
    isStringArray(value.evidence_refs)
  );
}

function isSessionAgentAction(value: unknown): value is SessionAgentAction {
  if (!isPlainRecord(value)) return false;
  const profile = value.resolved_profile;
  return (
    typeof value.action_id === 'string' &&
    typeof value.work_id === 'string' &&
    typeof value.attempt === 'number' &&
    typeof value.scope_digest === 'string' &&
    typeof value.wave_index === 'number' &&
    typeof value.action_order === 'number' &&
    typeof value.assignment_index === 'number' &&
    typeof value.stage_id === 'string' &&
    typeof value.stage_kind === 'string' &&
    (value.stage_mode === 'single' || value.stage_mode === 'parallel') &&
    isStringArray(value.required_after) &&
    typeof value.role === 'string' &&
    (value.contour === undefined || typeof value.contour === 'string') &&
    typeof value.model === 'string' &&
    typeof value.reasoning === 'string' &&
    typeof value.mutation_scope === 'string' &&
    isStringArray(value.context_skill_refs) &&
    typeof value.role_description === 'string' &&
    isStringArray(value.role_rules) &&
    isStringArray(value.consumes) &&
    isStringArray(value.produces) &&
    Array.isArray(value.prior_outcomes) &&
    value.prior_outcomes.every(isSessionAgentOutcome) &&
    (value.corrective_execution === undefined ||
      correctiveExecutionSchema.safeParse(value.corrective_execution).success) &&
    isPlainRecord(profile) &&
    profile.schema === 'ResolvedAgentProfile/v1' &&
    typeof profile.config_digest === 'string' &&
    typeof profile.profile_id === 'string' &&
    typeof profile.model === 'string' &&
    typeof profile.reasoning === 'string' &&
    (profile.execution_mode === 'fast' || profile.execution_mode === 'standard') &&
    typeof profile.mutation_scope === 'string' &&
    isPlainRecord(profile.tools_policy) &&
    typeof profile.tools_policy.id === 'string' &&
    typeof profile.tools_policy.source_write === 'boolean' &&
    isStringArray(profile.tools_policy.allowed_tools) &&
    isPlainRecord(profile.egress_policy) &&
    typeof profile.egress_policy.id === 'string' &&
    isStringArray(profile.egress_policy.allowed_hosts) &&
    profile.enforcement_status === 'not_asserted'
  );
}

function parseTestRunAction(value: unknown): TestRunAction {
  const record = requireRecord(value, 'run action');
  const request = parseSessionBridgeRequest(record.request);
  const actionValue = record.action;
  if (!isSessionAgentAction(actionValue)) throw Error('run action body is invalid');
  const issueId = record.issue_id;
  if (issueId !== undefined && issueId !== null && typeof issueId !== 'string')
    throw Error('run action issue identity is invalid');
  const hostAttemptId = record.host_attempt_id;
  if (hostAttemptId !== undefined && typeof hostAttemptId !== 'string')
    throw Error('run action attempt identity is invalid');
  const configuredContext = record.configured_context;
  if (configuredContext !== undefined && configuredContext !== null && !isConfiguredContext(configuredContext))
    throw Error('run action configured context is invalid');
  if (Object.hasOwn(record, 'configured_context') && configuredContext === undefined)
    throw Error('run action configured context is missing');
  const reviewInput = record.historical_review_input;
  if (reviewInput !== undefined && !isHistoricalReviewInput(reviewInput))
    throw Error('run action retained review input is invalid');
  if (record.prior_issue_outcome !== undefined && record.prior_issue_outcome !== 'unknown')
    throw Error('run action prior outcome is invalid');
  if (record.logical_action_id !== undefined && typeof record.logical_action_id !== 'string')
    throw Error('run action logical identity is invalid');
  return {
    request,
    action: actionValue,
    ...(issueId === undefined ? {} : { issue_id: issueId }),
    ...(hostAttemptId === undefined ? {} : { host_attempt_id: hostAttemptId }),
    ...(Object.hasOwn(record, 'instruction_activation')
      ? { instruction_activation: record.instruction_activation }
      : {}),
    ...(Object.hasOwn(record, 'instruction_bindings') ? { instruction_bindings: record.instruction_bindings } : {}),
    ...(Object.hasOwn(record, 'research_instruction_activation')
      ? { research_instruction_activation: record.research_instruction_activation }
      : {}),
    ...(Object.hasOwn(record, 'research_instruction_bindings')
      ? { research_instruction_bindings: record.research_instruction_bindings }
      : {}),
    ...(configuredContext === undefined ? {} : { configured_context: configuredContext }),
    ...(Object.hasOwn(record, 'development_packet') ? { development_packet: record.development_packet } : {}),
    ...(Object.hasOwn(record, 'research_output_contract')
      ? { research_output_contract: record.research_output_contract }
      : {}),
    ...(Object.hasOwn(record, 'synthesis_output_contract')
      ? { synthesis_output_contract: record.synthesis_output_contract }
      : {}),
    ...(Object.hasOwn(record, 'synthesis_source_catalog')
      ? { synthesis_source_catalog: record.synthesis_source_catalog }
      : {}),
    ...(reviewInput === undefined ? {} : { historical_review_input: reviewInput }),
    ...(record.prior_issue_outcome === undefined ? {} : { prior_issue_outcome: 'unknown' }),
    ...(record.logical_action_id === undefined ? {} : { logical_action_id: record.logical_action_id }),
  };
}

function parseTestRunPayload(value: unknown): TestRunPayload {
  const record = requireRecord(value, 'run result');
  if (record.schema !== 'VidaAgentRunResult/v1' || typeof record.status !== 'string')
    throw Error('run result identity is invalid');
  const parseStateVersion = (candidate: unknown): StateVersion | undefined => {
    if (
      !isPlainRecord(candidate) ||
      typeof candidate.revision !== 'number' ||
      !Number.isSafeInteger(candidate.revision) ||
      candidate.revision < 1 ||
      typeof candidate.digest !== 'string' ||
      !/^[a-f0-9]{64}$/u.test(candidate.digest)
    )
      return undefined;
    return { revision: candidate.revision, digest: candidate.digest };
  };
  const optionalString = (key: string): string | undefined => {
    const candidate = record[key];
    return typeof candidate === 'string' ? candidate : undefined;
  };
  const optionalBoolean = (key: string): boolean | undefined => {
    const candidate = record[key];
    return typeof candidate === 'boolean' ? candidate : undefined;
  };
  const optionalVersion = (key: string): StateVersion | undefined =>
    record[key] === undefined ? undefined : parseStateVersion(record[key]);
  const optionalActions = (key: string): readonly TestRunAction[] | undefined => {
    const candidate = record[key];
    if (candidate === undefined) return undefined;
    if (!Array.isArray(candidate)) throw Error(`run result ${key} is invalid`);
    return candidate.map(parseTestRunAction);
  };
  const rawStatuses = record.action_statuses;
  if (rawStatuses !== undefined && !Array.isArray(rawStatuses)) throw Error('run result action statuses are invalid');
  const actionStatuses = Array.isArray(rawStatuses)
    ? rawStatuses.map((item: unknown) => {
        const status = requireRecord(item, 'action status');
        if (typeof status.action_id !== 'string' || typeof status.status !== 'string')
          throw Error('run result action status fields are invalid');
        return { action_id: status.action_id, status: status.status };
      })
    : undefined;
  const optionalStateVersion = (key: string): StateVersion | undefined => {
    const candidate = optionalVersion(key);
    if (record[key] !== undefined && !candidate) throw Error(`run result ${key} is invalid`);
    return candidate;
  };
  const continuationReview = record.continuation_review;
  if (continuationReview !== undefined && !isContinuationReview(continuationReview))
    throw Error('run result continuation review is invalid');
  const code = optionalString('code');
  const message = optionalString('message');
  const runtimeSelectorObserved = optionalBoolean('runtime_selector_observed');
  const rightsGranted = optionalBoolean('rights_granted');
  const runtimeAcceptance = optionalBoolean('runtime_acceptance');
  const runtimeAccepted = optionalBoolean('runtime_accepted');
  const acceptedResult = optionalBoolean('accepted_result');
  const nextOperation = optionalString('next_operation');
  const resumeStatus = optionalString('resume_status');
  const codeDigest = optionalString('code_digest');
  const digest = optionalString('digest');
  const stateVersion = optionalStateVersion('state_version');
  const workVersion = optionalStateVersion('work_version');
  const ledgerVersion = optionalStateVersion('ledger_version');
  const nextActions = optionalActions('next_actions');
  const issuedActions = optionalActions('issued_actions');
  const revision = typeof record.revision === 'number' ? record.revision : undefined;
  const runResult: TestRunPayload = {
    schema: 'VidaAgentRunResult/v1',
    status: record.status,
    ...(code === undefined ? {} : { code }),
    ...(message === undefined ? {} : { message }),
    ...(runtimeSelectorObserved === undefined ? {} : { runtime_selector_observed: runtimeSelectorObserved }),
    ...(rightsGranted === undefined ? {} : { rights_granted: rightsGranted }),
    ...(runtimeAcceptance === undefined ? {} : { runtime_acceptance: runtimeAcceptance }),
    ...(runtimeAccepted === undefined ? {} : { runtime_accepted: runtimeAccepted }),
    ...(acceptedResult === undefined ? {} : { accepted_result: acceptedResult }),
    ...(nextOperation === undefined ? {} : { next_operation: nextOperation }),
    ...(resumeStatus === undefined ? {} : { resume_status: resumeStatus }),
    ...(record.research_preparation_status === null || typeof record.research_preparation_status === 'string'
      ? { research_preparation_status: record.research_preparation_status }
      : {}),
    ...(codeDigest === undefined ? {} : { code_digest: codeDigest }),
    ...(digest === undefined ? {} : { digest }),
    ...(revision === undefined ? {} : { revision }),
    ...(stateVersion === undefined ? {} : { state_version: stateVersion }),
    ...(workVersion === undefined ? {} : { work_version: workVersion }),
    ...(ledgerVersion === undefined ? {} : { ledger_version: ledgerVersion }),
    ...(nextActions === undefined ? {} : { next_actions: nextActions }),
    ...(issuedActions === undefined ? {} : { issued_actions: issuedActions }),
    ...(actionStatuses === undefined ? {} : { action_statuses: actionStatuses }),
    ...(continuationReview === undefined ? {} : { continuation_review: continuationReview }),
    ...(Object.hasOwn(record, 'recorded_observation') ? { recorded_observation: record.recorded_observation } : {}),
    ...(Object.hasOwn(record, 'reported_observation') ? { reported_observation: record.reported_observation } : {}),
    ...(Object.hasOwn(record, 'request') ? { request: record.request } : {}),
  };
  return runResult;
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

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isPlainRecord(value)) throw Error(`${label} must be an object`);
  return value;
}

function parseJsonUnknown(text: string): unknown {
  const value: unknown = JSON.parse(text);
  return value;
}

// A interrupted admission fixture: real Host CAS, no Mastra producer or installation.
function unpreparedRecoveryFixture(): {
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
    reopen() {
      db.close();
      db = new Database(file, { strict: true });
      store = new HostStateStore(db, workspace, undefined, undefined, undefined, undefined, root);
    },
    close() {
      db.close();
      rmSync(root, { recursive: true, force: true });
    },
  };
}

describe('unprepared recovery', () => {
  test('held maintenance and pending FIFO ownership deny even with matching versions', () => {
    for (const fault of ['maintenance', 'fifo']) {
      const f = unpreparedRecoveryFixture();
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
      } finally {
        f.close();
      }
    }
  });
  test('failure between Work and Ledger publication rolls back and same request can retry', () => {
    const f = unpreparedRecoveryFixture();
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
    } finally {
      spy?.mockRestore();
      f.close();
    }
  });
  test('read-only CLI exposes a retained request; release and lost-ack retry preserve original evidence', async () => {
    const f = unpreparedRecoveryFixture();
    try {
      const beforeDiagnosis = f.observed();
      const diagnosis = inspectLocalSession({
        repositoryRoot: f.root,
        config: f.config,
        projectIds: f.identity.project_ids,
        integrationsDigest: f.identity.integrations_digest,
        workId: f.identity.work_id,
        attempt: 1,
      });
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
      expect(f.observed()).toEqual(beforeDiagnosis);
      const baseline = readFileSync(path.join(f.root, 'baseline.yaml'));
      const delivered = baseline.toString('utf8').replace('config_revision: 1', 'config_revision: 2');
      writeFileSync(path.join(f.root, 'agent-runtime.config.v1.yaml'), delivered);
      expect(loadRuntimeConfig(f.root).config_revision).toBe(2);
      expect(f.config.config_revision).toBe(1);
      const before = f.observed();
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
      if (
        inspected.next_operation !== 'release_unprepared_work' ||
        inspected.rights_granted !== false ||
        !isPlainRecord(inspectedEnvelope.request)
      )
        throw Error('unprepared recovery inspection result is invalid');
      const inspectedRequest = inspectedEnvelope.request;
      const currentRequest = f.store.inspectUnpreparedWorkRecovery(f.input);
      expect(inspectedRequest).toEqual({ ...currentRequest });
      expect(f.observed()).toEqual(before);
      writeFileSync(path.join(f.root, 'apply.json'), JSON.stringify(inspectedEnvelope));
      const apply = args.map((value, index) =>
        args[index - 1] === '--mode' ? 'apply' : args[index - 1] === '--request' ? 'apply.json' : value,
      );
      const released = parseUnpreparedRecoveryResult(await run(apply));
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
      const operation = after.ledger.operations.find(
        (item) => item.kind === 'release' && item.ticket_id === currentRequest.originalTicket.ticket_id,
      );
      if (!operation || typeof operation.created_at !== 'string') throw Error('release operation is missing');
      expect(rfc3339TimestampMilliseconds(operation.created_at)).not.toBeNull();
      const releasedClaims = after.ledger.claims.filter((item) => item.ticket_id === operation.ticket_id);
      expect(releasedClaims.length).toBe(currentRequest.originalClaims.length);
      for (const claim of releasedClaims) {
        expect(claim.status).toBe('released');
        expect(claim.renewed_at).toBe(operation.created_at);
      }
      f.reopen();
      const retried = parseUnpreparedRecoveryResult(await run(apply));
      expect(retried.work_version).toEqual(released.work_version);
      expect(retried.ledger_version).toEqual(released.ledger_version);
      expect(f.observed()).toEqual(after);
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
      expect(f.observed()).toEqual(after);
    } finally {
      f.close();
    }
  });
  test('shape-valid impossible retained timestamp denies exact retry without effects', () => {
    const f = unpreparedRecoveryFixture();
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
    } finally {
      f.close();
    }
  });
  test('retained apply rejects current selected project integration and storage drift without effects', async () => {
    for (const fault of ['project', 'integration', 'storage']) {
      const f = unpreparedRecoveryFixture();
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
      } finally {
        f.close();
      }
    }
  });
  test('stale Work Ledger maintenance and foreign caller deny without changes', () => {
    const f = unpreparedRecoveryFixture();
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
    } finally {
      f.close();
    }
  });
  test('missing engine journal and surviving base or unknown alias deny with custody intact', () => {
    for (const fault of ['missing', 'journal', 'base', 'alias', 'malformed', 'correction']) {
      const f = unpreparedRecoveryFixture();
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
      } finally {
        f.close();
      }
    }
  });
  test.each(['unrelated', 'same-run', 'same-work', 'malformed', 'null', 'json5'])(
    'binary snapshot %s preserves absence controls and engine custody',
    (fault: string) => {
      const f = unpreparedRecoveryFixture();
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
      } finally {
        f.close();
      }
    },
  );
  test('oversized engine snapshots deny before any payload census fetch', () => {
    const f = unpreparedRecoveryFixture();
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
    } finally {
      guard?.mockRestore();
      f.close();
    }
  });

  test('decoded JSONB census bytes deny before fetching payloads even when storage fits', () => {
    const f = unpreparedRecoveryFixture();
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
    } finally {
      guard?.mockRestore();
      f.close();
    }
  });

  test('pending and UNKNOWN producer markers block recovery and remain untouched', () => {
    for (const status of ['reserved', 'commit_unknown']) {
      const f = unpreparedRecoveryFixture();
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
      } finally {
        f.close();
      }
    }
  });
  test("producer reservation cannot race recovery apply's Host-state writer fence", () => {
    const f = unpreparedRecoveryFixture();
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
    } finally {
      spy?.mockRestore();
      peer?.close();
      f.close();
    }
  });
});
const phaseBudget = executionBudget(undefined, 30_000);
const copiedEntries = [
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
];
let sharedRecoveryBundle: string | undefined;
let sharedRecoveryRoot: string | undefined;
let sharedRecoveryBinding: string | undefined;
let recoveryOutcomeUnknown = false;

function copiedPackageBinding(bundle: string): string {
  const access = requireSafeRepositoryAccess(bundle);
  const files = copiedEntries
    .flatMap((entry) => {
      if (!lstatSync(path.join(bundle, entry)).isDirectory()) return [entry];
      return readdirSync(path.join(bundle, entry), { recursive: true, encoding: 'utf8' })
        .map((file) => path.posix.join(entry, file.replaceAll(path.sep, '/')))
        .filter((file) => lstatSync(path.join(bundle, file)).isFile());
    })
    .sort();
  const snapshots = [];
  for (let index = 0; index < files.length; index += 512)
    snapshots.push(snapshotDeclaredSources(access, files.slice(index, index + 512)));
  return canonicalJsonDigest(snapshots);
}

function recoveryBundle(): string {
  if (recoveryOutcomeUnknown) throw new Error('Prior recovery child outcome prevents shared fixture reuse.');
  if (sharedRecoveryBundle) {
    if (copiedPackageBinding(sharedRecoveryBundle) !== sharedRecoveryBinding) {
      recoveryOutcomeUnknown = true;
      throw new Error('Shared copied package changed before recovery route.');
    }
    return sharedRecoveryBundle;
  }
  const started = performance.now();
  sharedRecoveryRoot = mkdtempSync(path.join(tmpdir(), 'vida-recovery-package-'));
  sharedRecoveryBundle = path.join(sharedRecoveryRoot, 'tools', 'agents');
  mkdirSync(sharedRecoveryBundle, { recursive: true });
  for (const entry of copiedEntries)
    cpSync(path.join(packageRoot, entry), path.join(sharedRecoveryBundle, entry), {
      recursive: true,
      dereference: false,
      filter: (source) => path.resolve(source) !== path.join(packageRoot, 'dist', 'standalone'),
    });
  symlinkSync(
    path.join(packageRoot, 'node_modules'),
    path.join(sharedRecoveryBundle, 'node_modules'),
    process.platform === 'win32' ? 'junction' : 'dir',
  );
  sharedRecoveryBinding = copiedPackageBinding(sharedRecoveryBundle);
  phaseBudget.remaining();
  process.stderr.write(
    JSON.stringify({ stage: 'shared recovery package preparation', elapsed_ms: performance.now() - started }) + '\n',
  );
  return sharedRecoveryBundle;
}
afterAll(() => {
  if (sharedRecoveryRoot && !recoveryOutcomeUnknown) rmSync(sharedRecoveryRoot, { recursive: true, force: true });
});
const repositoryRoot = mkdtempSync(path.join(tmpdir(), 'vida-run-uninitialized-'));
afterAll(() => rmSync(repositoryRoot, { recursive: true, force: true }));
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
const ordinaryDescribe = mutationMode ? describe.skip : describe;
const liveInstallTest = v8CoverageMode ? test.skip : test;

test('durable controller publication cleans only its own pending file when publication fails', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-durable-fault-'));
  try {
    const target = path.join(root, 'occupied');
    mkdirSync(target);
    expect(() => writeDurable(target, { schema: 'FixtureController/v1' })).toThrow();
    expect(readdirSync(root)).toEqual(['occupied']);
    expect(readdirSync(target)).toEqual([]);
  } finally {
    rmSync(root, { recursive: true, force: true });
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
    const config = loadRuntimeConfig(root);
    mkdirSync(path.join(root, config.control.work_root), { recursive: true });
    const databasePath = path.join(root, config.control.work_root, 'session-handoff.v1.sqlite');
    const sourceUrl = pathToFileURL(path.join(packageRoot, 'src', 'host-state.ts')).href;
    const transactionInput: Parameters<typeof import('../src/host-state.ts').withHostStateExclusiveTransaction>[0] = {
      repositoryRoot: root,
      databaseRelativePath: path.relative(root, databasePath).replaceAll('\\', '/'),
      workspaceId: deriveWorkspaceId(config.repository.repository_id, root),
    };
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
  const result = boundedSpawnSync(
    spawnSync,
    process.execPath,
    [entrypoint, ...args],
    {
      cwd: packageRoot,
      env: { ...process.env, ...env },
      encoding: 'utf8',
      windowsHide: true,
      timeout: options.childTimeout ?? 5_000,
      budget,
    },
    `public run ${path.basename(entrypoint)}`,
  );
  if (commandOutcomeUnknown(result) || !isTerminalUtf8SpawnResult(result)) {
    options.onUnknown?.();
    const tail = (value: unknown): string => {
      if (typeof value === 'string') return value.slice(-2048);
      if (value instanceof Uint8Array)
        return Buffer.from(value.buffer, value.byteOffset, value.byteLength).toString('utf8').slice(-2048);
      return '';
    };
    throw new Error(
      `Public run child outcome is unknown (status=${result.status ?? 'null'} signal=${result.signal ?? 'none'} ` +
        `error=${result.error?.code ?? 'none'}).\nstdout tail:\n${tail(result.stdout)}\nstderr tail:\n${tail(result.stderr)}`,
    );
  }
  return result;
}

describe('vida-agent run entrypoint fast checks', () => {
  test('blocks admission while the selected cutover still holds maintenance', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'vida-run-maintenance-'));
    const selectedGeneration: ActiveSelectorState = {
      generationRoot: root,
      generation: 'fixture-generation',
      selectorSha: 'a'.repeat(64),
      planSha256: 'b'.repeat(64),
      archiveManifestSha256: 'c'.repeat(64),
      repaired: false,
      forward: false,
      currentMutableOutput: null,
    };
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
      expect(() => assertNoActiveCutoverMaintenance(selectedGeneration)).toThrow('authority');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('rejects incomplete or malformed CAS versions before opening a report', async () => {
    const args = [...common, '--workflow', 'information_research_light'];
    for (const extra of [
      ['--issue-wave', 'true'],
      ['--issue-wave', 'true', '--expected-revision', '0', '--expected-digest', 'a'.repeat(64)],
      ['--issue-wave', 'true', '--expected-revision', '2', '--expected-digest', 'not-a-digest'],
      ['--report', 'relative.json', '--expected-revision', '2', '--expected-digest', 'a'.repeat(64)],
    ]) {
      await Promise.resolve(expect(run([...args, ...extra])).rejects.toMatchObject({ code: 'GAP-VIDA-RUN-CLI-001' }));
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
      expect(requireRecord(parseJsonUnknown(chosenEqualMember.stderr), 'CLI result').code).toBe(
        'GAP-VIDA-RUN-WORKFLOW-001',
      );
      const outsideRoot = invokeRoot([...base, '--project', 'alpha', '--work-path', 'wiki/skills/guide.md']);
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
      expect(requireRecord(parseJsonUnknown(ambiguous.stderr), 'CLI result').code).toBe('GAP-VIDA-RUN-CONTEXT-001');
      const nestedForeign = invokeRoot([...base, '--project', 'broad', '--work-path', 'products/foreign/src/probe.ts']);
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

  const researchFirstRoutes: readonly {
    readonly workflow: string;
    readonly kind: WorkItemKind;
    readonly intent: FlowIntent;
  }[] = [
    { workflow: 'information_research_light', kind: 'research', intent: 'information_research' },
    { workflow: 'implementation_new', kind: 'feature', intent: 'implementation_new' },
    { workflow: 'implementation_change', kind: 'task', intent: 'implementation_change' },
    { workflow: 'bug_fix', kind: 'bug', intent: 'bug_fix' },
  ];
  for (const route of researchFirstRoutes)
    liveInstallTest(
      `copied bundle recovers interrupted ${route.workflow} research preparation by CAS`,
      async () => {
        const budget = phaseBudget.child(180_000);
        const root = mkdtempSync(path.join(tmpdir(), 'vida-run-session-'));
        let recoveryFailure: unknown;
        let recoveryFailed = false;
        let finalizationFailure: unknown;
        try {
          const bundle = recoveryBundle();
          mkdirSync(path.join(root, 'tools', 'agents'), { recursive: true });
          const externalConfig = path.join(root, 'source-config.yaml');
          writeFileSync(
            externalConfig,
            readFileSync(path.join(packageRoot, 'templates/agent-runtime.config.template.v1.yaml'), 'utf8')
              .replaceAll('{{REPOSITORY}}', 'ignored-repository')
              .replaceAll('{{PROJECT}}', 'ignored-project')
              .replaceAll('{{BUNDLE}}', 'ignored-runtime'),
          );
          const invokeCopy = (args: readonly string[], env: NodeJS.ProcessEnv = {}) => {
            const commandPath = args[0];
            if (typeof commandPath !== 'string') throw Error('recovery command path is missing');
            const result: unknown = boundedSpawnSync(
              spawnSync,
              process.execPath,
              args,
              {
                cwd: bundle,
                encoding: 'utf8',
                windowsHide: true,
                env: pinnedEnvironment(process.execPath, { ...process.env, ...env }, bundle),
                timeout: 180_000,
                budget,
                diagnostics: true,
              },
              `recovery ${route.workflow}/${path.basename(commandPath)}`,
            );
            if (!isTerminalUtf8SpawnResult(result)) {
              recoveryOutcomeUnknown = true;
              throw Error(`recovery ${route.workflow}/${path.basename(commandPath)} has an uncertain process outcome`);
            }
            return result;
          };
          const initialized = invokeCopy(
            [
              path.join(bundle, 'bin/init.ts'),
              '--project-root',
              root,
              '--repository',
              'different-repository',
              '--project',
              'different-project',
            ],
            { AGENT_RUNTIME_CONFIG: externalConfig },
          );
          expect(initialized.status, initialized.stderr).toBe(0);
          expect(loadRuntimeConfig(root).runtime.bundle).toBe('vida-agent');
          expect(
            requireRecord(
              parseJsonUnknown(readFileSync(path.join(root, '.agent/runtime-initialization.v1.json'), 'utf8')),
              'initialization receipt',
            ).bundle,
          ).toBe('vida-agent');
          const source = snapshotDeclaredSources(requireSafeRepositoryAccess(root), ['AGENT.sidecar.md']);
          const workDir = path.join(root, '.agent', 'work', 'session-work');
          mkdirSync(workDir, { recursive: true });
          const relative = (name: string) => `.agent/work/session-work/${name}`;
          const put = (name: string, value: unknown) => writeFileSync(path.join(workDir, name), JSON.stringify(value));
          put('scope.json', {
            schema: 'ImplementationScope/v1',
            scope_id: 'session-scope',
            work_id: 'session-work',
            source_revision: source.digest,
            ac_ids: ['AC-RESEARCH-1'],
            allowed_paths: ['AGENT.sidecar.md'],
            implementation_paths: ['AGENT.sidecar.md'],
            documentation_paths: [],
            changed_symbols: [],
            non_goals: ['Source mutation'],
            acceptance_trace: ['AC-RESEARCH-1'],
            behavior_trace: ['SR-RESEARCH-1'],
            test_trace: ['parallel wave and CAS fixture'],
            diagnostic_trace: ['fixture'],
            attribution: { thread_id: 'fixture-native-session', pointer: relative('intake.json') },
            owner: 'fixture',
            created_at: new Date().toISOString(),
          });
          put('acceptance.json', {
            schema: 'AcceptanceManifest/v1',
            id: 'session-acceptance',
            version: 1,
            ac_ids: ['AC-RESEARCH-1'],
            source: 'AGENT.sidecar.md',
            scope: 'session-scope',
            source_revision: source.digest,
            contracts: [
              {
                id: 'AC-RESEARCH-1',
                definition: 'Inspect the fixture without source mutation.',
                sr: 'SR-RESEARCH-1',
                evidence: ['fixture'],
              },
            ],
          });
          put('intake.json', {
            schema: 'VidaLocalSessionIntake/v1',
            native_session_handle: 'fixture-native-session',
            work_item: {
              schema: 'WorkItem/v1',
              id: 'session-work',
              provider: 'local',
              provider_type: 'Research',
              canonical_kind: route.kind,
              intent: route.intent,
              project_id: 'different-project',
              title: 'Read-only parallel research fixture',
              description: '',
              labels: [],
              risk_flags: [],
            },
            scope_path: relative('scope.json'),
            acceptance_path: relative('acceptance.json'),
            runtime_code_paths: ['vida-agent/bin/run.ts'],
            route: 'R2',
            risk: 'low',
            change_kind: 'fix',
          });
          const args = [
            path.join(bundle, 'bin/run.ts'),
            '--project-root',
            root,
            '--repository',
            'different-repository',
            '--project',
            'different-project',
            '--work-path',
            'tools/agents',
            '--work-id',
            'session-work',
            '--attempt',
            '1',
            '--scope-digest',
            source.digest,
            '--team',
            'default-development',
            '--kind',
            route.kind,
            '--intent',
            route.intent,
            '--workflow',
            route.workflow,
          ];
          const call = (extra: readonly string[] = []) => {
            const result = invokeCopy([...args, ...extra]);
            const output = result.status === 0 ? result.stdout : result.stderr;
            if (typeof output !== 'string') throw Error('run output is not UTF-8 text');
            return {
              ...result,
              payload: parseTestRunPayload(
                parseJsonUnknown(
                  output
                    .split('\n')
                    .filter((line) => !line.startsWith('runtime call: '))
                    .join('\n'),
                ),
              ),
            };
          };
          const prepared = call(['--intake', path.join(workDir, 'intake.json')]);
          expect(prepared.status, prepared.stderr).toBe(0);
          const preparedActions = requireNextActions(prepared.payload);
          const preparedVersion = requireStateVersion(prepared.payload.state_version);
          const admittedIntake = requireRecord(
            parseJsonUnknown(readFileSync(path.join(workDir, 'local-session-intake.v1.json'), 'utf8')),
            'admitted intake',
          );
          if (!isStringArray(admittedIntake.runtime_code_paths)) throw Error('admitted runtime paths are invalid');
          expect(admittedIntake.runtime_code_paths).toContain('vida-agent/bin/run.ts');
          expect(admittedIntake.runtime_code_paths.every((file: string) => file.startsWith('vida-agent/'))).toBe(true);
          expect(preparedActions.length).toBeGreaterThan(1);
          const expected = (version: StateVersion) => [
            '--expected-revision',
            String(version.revision),
            '--expected-digest',
            version.digest,
          ];
          // Fail after durable issue reservation but before activation history append.
          // A live lock owner simulates a local preparation interruption without
          // making the external issued_actions response possible.
          const activationHistory = path.join(root, '.agent/work/session-work/instruction-activation-history.jsonl');
          writeFileSync(
            `${activationHistory}.lock.lock`,
            JSON.stringify({
              schema: 'SafeRepositoryAccessLock/v1',
              owner_pid: process.pid,
            }),
          );
          const interrupted = call([...expected(preparedVersion), '--issue-wave', 'true']);
          expect(interrupted.status, interrupted.stderr).toBe(1);
          unlinkSync(`${activationHistory}.lock.lock`);
          const { openConfiguredMastraSessionLedger } =
            await import('../src/orchestration/persistent-session-handoff.ts');
          const interruptedLedger = openConfiguredMastraSessionLedger(root);
          const interruptedSnapshot = interruptedLedger.resume('session-work', 1);
          interruptedLedger.close();
          if (!interruptedSnapshot) throw Error('interrupted session snapshot is missing');
          expect(interruptedSnapshot.state.research_wave_exposure).toBe('preparing');
          const reservedIssues = interruptedSnapshot.state.items
            .filter((item) => item.issue_id !== null)
            .map((item) => ({ action_id: item.request.action_id, issue_id: item.issue_id }));
          expect(reservedIssues).toHaveLength(preparedActions.length);
          expect(interruptedSnapshot.state.items.filter((item) => item.research_activation)).toHaveLength(1);
          expect(existsSync(activationHistory)).toBe(false);
          // The shared readonly incomplete-status branch has one copied-bundle
          // witness; every route retains its interrupted state and recovery CAS.
          if (route.workflow === researchFirstRoutes[0]?.workflow) {
            const preparationStatus = call();
            expect(preparationStatus.status, preparationStatus.stderr).toBe(0);
            expect(preparationStatus.payload.research_preparation_status).toBe('preparation_incomplete');
            const preparationActionStatuses = preparationStatus.payload.action_statuses;
            if (!preparationActionStatuses) throw Error('preparation action statuses are missing');
            expect(preparationActionStatuses.every((item) => item.status === 'research_preparation_incomplete')).toBe(
              true,
            );
          }

          const issued = call([...expected(interruptedSnapshot.version), '--issue-wave', 'true']);
          expect(issued.status, issued.stderr).toBe(0);
          const issuedActions = requireIssuedActions(issued.payload);
          const issuedVersion = requireStateVersion(issued.payload.state_version);
          expect(issued.payload.status).toBe('wave_recovered');
          expect(issued.payload.research_preparation_status).toBe('exposure_possible');
          if (!issued.payload.action_statuses) throw Error('issued action statuses are missing');
          expect(issued.payload.action_statuses.every((item) => item.status === 'issued_outcome_uncertain')).toBe(true);
          expect(
            issuedActions.every(
              (item) =>
                item.action.resolved_profile?.schema === 'ResolvedAgentProfile/v1' &&
                item.action.resolved_profile.enforcement_status === 'not_asserted',
            ),
          ).toBe(true);
          expect(issuedActions.map((item) => item.request.action_id)).toEqual(
            preparedActions.map((item) => item.request.action_id),
          );
          expect(issuedActions.map(({ request, issue_id }) => ({ action_id: request.action_id, issue_id }))).toEqual(
            reservedIssues,
          );
          expect(issuedActions.every((item) => item.instruction_activation)).toBe(true);
          expect(new Set(issuedActions.map((item) => item.issue_id)).size).toBe(issuedActions.length);
          const stale = call([...expected(issuedVersion), '--issue-wave', 'true']);
          expect(stale.status).toBe(1);
          const reportFile = path.join(root, 'report.json');
          // Shared CLI/report byte ingress needs one copied-bundle witness.
          // Duplicate issuance and action/issue/CAS denials remain in every route.
          if (route.workflow === researchFirstRoutes[0]?.workflow) {
            const mixed = call([...expected(issuedVersion), '--issue-wave', 'true', '--report', reportFile]);
            expect(mixed.status).toBe(1);
            expect(mixed.payload.code).toBe('GAP-VIDA-RUN-CLI-001');
            writeFileSync(reportFile, 'x'.repeat(32769));
            const oversized = call([...expected(issuedVersion), '--report', reportFile]);
            expect(oversized.status).toBe(1);
            expect(oversized.payload.code).toBe('GAP-VIDA-RUN-REPORT-001');
            writeFileSync(reportFile, '{');
            const malformed = call([...expected(issuedVersion), '--report', reportFile]);
            expect(malformed.status).toBe(1);
            expect(malformed.payload.code).toBe('GAP-VIDA-RUN-REPORT-001');
            writeFileSync(reportFile, '{}');
            const secondLink = path.join(root, 'report-hardlink.json');
            linkSync(reportFile, secondLink);
            const linked = call([...expected(issuedVersion), '--report', reportFile]);
            expect(linked.status).toBe(1);
            expect(linked.payload.code).toBe('GAP-VIDA-RUN-REPORT-001');
            unlinkSync(secondLink);
          }
          let version = issuedVersion;
          let final: ReturnType<typeof call> | undefined;
          for (const item of issuedActions) {
            const action = item.request;
            if (typeof item.issue_id !== 'string') throw Error('issued action lacks its issue identity');
            const sourceEntry = source.entries[0];
            if (!sourceEntry) throw Error('fixture source entry is missing');
            const sourceId = `fixture-source-${action.assignment_index}`;
            const summary = JSON.stringify({
              schema: 'VidaResearchObservationOutput/v1',
              topic: `Read-only fixture research ${action.assignment_index}`,
              objective: 'Inspect fixture source without changing code.',
              question: 'What does the fixture show?',
              source_refs: [
                {
                  source_id: sourceId,
                  source_kind: 'internal',
                  locator: `AGENT.sidecar.md#fixture-${action.assignment_index}`,
                  title: 'Fixture sidecar',
                  claim: 'AC-RESEARCH-1 SR-RESEARCH-1: this fixture is read-only research.',
                  retrieved_at: '2026-09-30T00:00:00Z',
                  version_or_date: '2026-09-30',
                  independence_group: 'fixture',
                  digest: sourceEntry.sha256,
                },
              ],
              findings: [
                {
                  finding_id: `fixture-${action.assignment_index}`,
                  statement: 'The fixture source is present.',
                  source_ids: [sourceId],
                  evidence_class: 'Code',
                  status: 'confirmed',
                },
              ],
              evidence_classes: ['Code'],
              uncertainties: [],
              conflicts: [],
              br_ids: [],
              sr_ids: ['SR-RESEARCH-1'],
              ac_ids: ['AC-RESEARCH-1'],
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
                rationale: 'Fixture source supports the finding.',
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
            const outcome = {
              schema: 'VidaSessionObservation/v1',
              action_id: action.action_id,
              issue_id: item.issue_id,
              agent_id: `test-${action.assignment_index}`,
              tool_call_ref: `tool-${action.assignment_index}`,
              status: 'reported_complete',
              summary,
              output_digest: canonicalJsonDigest(summary),
              evidence_refs: [sourceId],
            };
            if (action.assignment_index === 0) {
              writeFileSync(reportFile, JSON.stringify({ ...outcome, action_id: 'wrong-action' }));
              const mismatched = call([...expected(version), '--report', reportFile]);
              expect(mismatched.status).toBe(1);
              expect(requireStateVersion(call().payload.state_version)).toEqual(version);
            }
            writeFileSync(reportFile, JSON.stringify(outcome));
            final = call([...expected(version), '--report', reportFile]);
            expect(final.status, final.stderr).toBe(0);
            version = requireStateVersion(final.payload.state_version);
          }
          if (!final) throw Error('report sequence produced no final result');
          const finalActions = requireNextActions(final.payload);
          expect(final.payload.resume_status).toBe('ready');
          expect(finalActions.length).toBeGreaterThan(0);
          expect(finalActions[0]?.request.wave_index).toBe(1);
          const replay = call([...expected(version), '--report', path.join(root, 'report.json')]);
          expect(replay.status).toBe(0);
          expect(replay.payload.status).toBe('report_retrieved');
          expect(replay.payload.state_version).toEqual(requireStateVersion(final.payload.state_version));
          expect(requireIssuedActions(replay.payload)).toEqual([]);
        } catch (error) {
          recoveryFailed = true;
          recoveryFailure = error;
        } finally {
          try {
            if (sharedRecoveryBundle && !recoveryOutcomeUnknown) {
              const started = performance.now();
              const observedBinding = copiedPackageBinding(sharedRecoveryBundle);
              if (sharedRecoveryBinding === undefined) {
                finalizationFailure = Error('shared recovery package binding is missing');
              } else if (observedBinding !== sharedRecoveryBinding) {
                recoveryOutcomeUnknown = true;
                finalizationFailure = Error('recovery package binding changed during the test');
              } else {
                process.stderr.write(
                  JSON.stringify({
                    stage: `recovery ${route.workflow} package immutability`,
                    elapsed_ms: performance.now() - started,
                  }) + '\n',
                );
                rmSync(root, { recursive: true, force: true });
              }
            }
          } catch (error) {
            finalizationFailure = error;
          }
        }
        if (recoveryFailed) {
          if (finalizationFailure !== undefined)
            throw new AggregateError(
              [recoveryFailure, finalizationFailure],
              'recovery test and finalization both failed',
            );
          throw recoveryFailure;
        }
        if (finalizationFailure !== undefined) throw finalizationFailure;
      },
      180_000,
    );
});

if (mutationMode || v8CoverageMode) {
  const record = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
  const createFixture = (root: string, bundleName = 'agent-runtime-new', multiProject = false) => {
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
  const invokeMutation = (
    args: readonly string[],
    expectedStatus = 0,
    entrypoint = launcher,
    options: PublicRunChildOptions = {},
  ): TestRunPayload => {
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
    const payload = parseTestRunPayload(parseJsonUnknown(output.trim()));
    if (expectedStatus !== 0) {
      expect(payload).toMatchObject({ schema: 'VidaAgentRunResult/v1', status: 'blocked' });
      if (typeof payload.message !== 'string') throw Error('blocked CLI message is missing');
      expect(payload.message.length).toBeGreaterThan(0);
    }
    return payload;
  };

  const ownedMutationFixture = (root: string, caseTimeout: number, entrypoint = launcher) => {
    const budget = executionBudget(caseTimeout, 250);
    let unknown = false;
    return {
      invoke(args: readonly string[], status = 0, selectedEntrypoint = entrypoint): TestRunPayload {
        if (unknown) throw new Error(`Refusing to reuse retained run fixture: ${root}`);
        return invokeMutation(args, status, selectedEntrypoint, {
          budget,
          childTimeout: caseTimeout,
          onUnknown: () => (unknown = true),
        });
      },
      hasUnknown: () => unknown,
    };
  };

  const prepareMutationIntake = (
    args: readonly string[],
    config: AgentRuntimeConfig,
    options: { readonly sourcePath?: string } = {},
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
      risk: 'low',
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
      sourceEntry,
    };
  };

  test('public run handles delivered-work inspect, issue retry, report retry and conflict without opening the old engine', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'vida-run-continuation-'));
    try {
      const fixtureSetup = createFixture(root, 'vida-agent');
      mkdirSync(path.join(root, 'docs/agent-instructions'), { recursive: true });
      cpSync(
        path.resolve(packageRoot, '../../docs/agent-instructions/documentation-policy.v1.json'),
        path.join(root, 'docs/agent-instructions/documentation-policy.v1.json'),
      );
      const { config } = fixtureSetup,
        workId = 'work-' + randomUUID(),
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
          engine = await import('../src/orchestration/session-engine-snapshot.ts'),
          snapshotSpy = spyOn(engine, 'readSessionEngineSnapshot'),
          bridgeSpy = spyOn(MastraSessionBridge, 'open');
        if (!initial) throw Error('fixture continuation state is missing');
        expect(initial.action_status).toBe('unissued');
        fixture.closeDatabase();
        const inspected = parseTestRunPayload(await run([...args, '--inspect', 'true']));
        expect(inspected.status).toBe('continuation_review_ready');
        const inspectedActions = requireNextActions(inspected);
        expect(inspectedActions).toHaveLength(1);
        expect(inspectedActions[0]?.historical_review_input?.body_sha256).toBe(fixture.capture.body_sha256);
        expect(inspected.accepted_result).toBe(false);
        const issued = parseTestRunPayload(
          await run([...args, ...expected(requireStateVersion(inspected.state_version)), '--issue-wave', 'true']),
        );
        expect(issued.status).toBe('issued');
        const issuedActions = requireIssuedActions(issued);
        expect(issuedActions).toHaveLength(1);
        expect(issuedActions[0]?.historical_review_input?.body_sha256).toBe(fixture.capture.body_sha256);
        const issuedStateVersion = requireStateVersion(issued.state_version);
        const issueRetry = parseTestRunPayload(
          await run([...args, ...expected(issuedStateVersion), '--issue-wave', 'true']),
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
          await run([...args, ...expected(issuedStateVersion), '--report', reportPath]),
        );
        expect(reported.status).toBe('continuation_review_reported');
        expect(reported.accepted_result).toBe(false);
        expect(reported.runtime_accepted).toBe(false);
        const reportRetry = parseTestRunPayload(
          await run([...args, ...expected(requireStateVersion(reported.state_version)), '--report', reportPath]),
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
        snapshotSpy.mockRestore();
        bridgeSpy.mockRestore();
      } finally {
        fixture.closeDatabase();
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  describe('vida-agent run mutation path', () => {
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
      try {
        const { args, initialization, initializationPath } = createFixture(root);
        writeFileSync(initializationPath, record({ ...initialization, workspace_binding_status: 'unknown' }));
        await Promise.resolve(
          expect(run(args)).rejects.toMatchObject({
            code: 'GAP-VIDA-RUN-CONTEXT-001',
            message: 'Runtime initialization status is invalid.',
          }),
        );
        writeFileSync(initializationPath, record(initialization));
        const escaping = args.map((entry, index) => (args[index - 1] === '--work-path' ? '../escape' : entry));
        await Promise.resolve(
          expect(run(escaping)).rejects.toMatchObject({
            code: 'GAP-VIDA-RUN-CONTEXT-001',
            message: 'The work path is not bound to the selected project context.',
          }),
        );
        expect(existsSync(path.join(root, '.agent', 'work'))).toBe(false);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });

    test('rejects a changed scope for a persisted attempt before issuing its wave', async () => {
      const root = mkdtempSync(path.join(tmpdir(), 'vida-run-persisted-'));
      const fixture = ownedMutationFixture(root, 30_000);
      let completed = false;
      try {
        const { args, config } = createFixture(root);
        const admitted = prepareMutationIntake(args, config);
        const prepared = fixture.invoke(admitted.admissionArgs);
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
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });

    test('rejects independent repository and requested-project drift before creating state', async () => {
      const root = mkdtempSync(path.join(tmpdir(), 'vida-run-identity-'));
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
      } finally {
        rmSync(root, { recursive: true, force: true });
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
        expect(fixture.invoke(admitted.admissionArgs).status).toBe('prepared');
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
    ] as const;
    for (const denial of contextDenials) {
      test(`rejects ${denial.name} without creating Work`, () => {
        const root = mkdtempSync(path.join(tmpdir(), 'vida-run-negative-context-'));
        const fixture = ownedMutationFixture(root, 5_000);
        let completed = false;
        try {
          const { args, initialization, initializationPath, config } = createFixture(root);
          if ('changed' in denial) writeFileSync(initializationPath, record({ ...initialization, ...denial.changed }));
          const candidate = 'candidate' in denial ? denial.candidate(args) : args;
          expect(fixture.invoke(candidate, 1)).toMatchObject(denial.expected);
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
          if (completed && !fixture.hasUnknown()) rmSync(root, { recursive: true, force: true });
          else
            process.stderr.write(
              `Retained ${fixture.hasUnknown() ? 'uncertain' : 'failed'} public run fixture: ${root}\n`,
            );
        }
      }, 5_000);
    }

    test('keeps CAS and report handling bound to one admitted attempt', async () => {
      const root = mkdtempSync(path.join(tmpdir(), 'vida-run-mutation-'));
      const fixture = ownedMutationFixture(root, 60_000);
      let completed = false;
      try {
        const { args, config } = createFixture(root);
        const admitted = prepareMutationIntake(args, config, { sourcePath: 'AGENT.sidecar.md' });
        const { sourceEntry } = admitted;
        const runtimePaths = runtimePackageCodePaths(config.runtime.bundle);
        const runtimeSnapshot = snapshotRuntimePackageSources(
          runtimePackageAccess(),
          config.runtime.bundle,
          runtimePaths,
        );
        expect(runtimeSnapshot.entries.every((entry) => entry.exists)).toBe(true);
        const prepared = fixture.invoke(admitted.admissionArgs);
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
        const issued = fixture.invoke([...admitted.args, ...expected(preparedVersion), '--issue-wave', 'true']);
        expect(issued.status).toBe('wave_issued');
        const issuedActions = requireIssuedActions(issued);
        const issuedVersion = requireStateVersion(issued.state_version);
        expect(issuedActions.map((item) => item.action.action_id)).toEqual(
          preparedActions.map((item) => item.request.action_id),
        );
        fixture.invoke([...admitted.args, ...expected(preparedVersion), '--issue-wave', 'true'], 1);
        const reportFile = path.join(root, 'report.json');
        for (const invalid of ['', '{', 'x'.repeat(32769)]) {
          writeFileSync(reportFile, invalid);
          expect(
            fixture.invoke([...admitted.args, ...expected(issuedVersion), '--report', reportFile], 1),
          ).toMatchObject({
            code: 'GAP-VIDA-RUN-REPORT-001',
            message:
              'The session report is missing, unsafe, oversized, or invalid JSON. Next action: inspect the exact work and check its issued contract before retrying.',
          });
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
        expect(requireStateVersion(fixture.invoke(admitted.args).state_version)).toEqual(issuedVersion);
        let version = issuedVersion;
        for (const item of issuedActions) {
          const action = item.action;
          if (typeof item.issue_id !== 'string') throw Error('issued action lacks its issue identity');
          const sourceId = `fixture-source-${action.action_order}`;
          const summary = JSON.stringify({
            schema: 'VidaResearchObservationOutput/v1',
            topic: `Public CLI research action ${action.action_order}`,
            objective: 'Inspect the fixture without changing code.',
            question: 'What does the fixture show?',
            source_refs: [
              {
                source_id: sourceId,
                source_kind: 'internal',
                locator: `AGENT.sidecar.md#fixture-${action.action_order}`,
                title: 'Fixture sidecar',
                claim: 'AC-CLI-1 SR-CLI-1: the fixture supports read-only research.',
                retrieved_at: '2026-10-07T00:00:00Z',
                version_or_date: '2026-10-07',
                independence_group: 'fixture',
                digest: sourceEntry.sha256,
              },
            ],
            findings: [
              {
                finding_id: `fixture-${action.action_order}`,
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
          const result = fixture.invoke([...admitted.args, ...expected(version), '--report', reportFile]);
          version = requireStateVersion(result.state_version);
          if (item === issuedActions.at(-1)) {
            expect(result.resume_status).toBe('ready');
            expect(requireNextActions(result)[0]?.request.wave_index).toBe(1);
          }
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

    for (const selectorPhase of ['released', 'staged'] as const) {
      test(`binds admission to the ${selectorPhase} journal and released maintenance proof`, async () => {
        const root = mkdtempSync(path.join(tmpdir(), 'vida-run-selected-'));
        const dependenciesLink = path.join(root, 'vida-agent', 'node_modules');
        const fixture = ownedMutationFixture(root, 90_000);
        let completed = false;
        try {
          const { args, fixtureBundle, config } = createFixture(root, 'vida-agent');
          const admitted = prepareMutationIntake(args, config);
          const selectedLauncher = path.join(fixtureBundle, 'bin', 'run.ts');
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
          expect(fixture.invoke(admitted.admissionArgs, 0, selectedLauncher).runtime_selector_observed).toBe(true);
          if (selectorPhase === 'released') {
            for (const [name, value, changed] of records) {
              const file = path.join(generationRoot, name);
              writeFileSync(file, record({ ...value, ...changed }));
              expect(fixture.invoke(admitted.args, 1, selectedLauncher)).toMatchObject({
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
              expect(fixture.invoke(admitted.args, 1, selectedLauncher)).toMatchObject({
                code: 'GAP-VIDA-RUN-SELECTOR-001',
                message:
                  'The active runtime selector or cutover journal is invalid. Next action: inspect the exact work and check its issued contract before retrying.',
              });
              writeFileSync(retainedPath, record(releasedLock));
              writeFileSync(releasePath, record(release));
            }
            for (const changed of [{ cutover_id: 'other-generation' }, { status: 'not-released' }]) {
              writeFileSync(releasePath, record({ ...release, ...changed }));
              expect(fixture.invoke(admitted.args, 1, selectedLauncher)).toMatchObject({
                code: 'GAP-VIDA-RUN-SELECTOR-001',
                message:
                  'The active runtime selector or cutover journal is invalid. Next action: inspect the exact work and check its issued contract before retrying.',
              });
              writeFileSync(releasePath, record(release));
            }
            const cutoffPath = path.join(generationRoot, 'cutoff-witness.json');
            const witness = requireRecord(parseJsonUnknown(readFileSync(cutoffPath, 'utf8')), 'cutoff witness');
            unlinkSync(cutoffPath);
            expect(fixture.invoke(admitted.args, 1, selectedLauncher)).toMatchObject({
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
              expect(fixture.invoke(admitted.args, 1, selectedLauncher)).toMatchObject({
                code: 'GAP-VIDA-RUN-CUTOFF-001',
                message:
                  'The new-work cutoff witness could not be recorded. Next action: inspect the exact work and check its issued contract before retrying.',
              });
            }
            writeFileSync(cutoffPath, record(witness));
            const cutoffLock = path.join(generationRoot, 'cutoff-witness.lock');
            writeFileSync(cutoffLock, 'held');
            expect(fixture.invoke(admitted.args, 1, selectedLauncher)).toMatchObject({
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
          expect(fixture.invoke(admitted.args, 1, selectedLauncher)).toMatchObject({
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
            writeFileSync(path.join(root, '.agent', 'active-runtime-selector.v1.json'), record(stagedSelector));
            writeFileSync(stagedJournalPath, record(stagedJournal));
            writeFileSync(path.join(stagedRoot, 'maintenance-lock.released.v1.json'), record(stagedLock));
            writeFileSync(path.join(stagedRoot, 'maintenance-release.v1.json'), record(stagedReceipt));
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
            expect(fixture.invoke(stagedAdmitted.admissionArgs, 0, selectedLauncher).runtime_selector_observed).toBe(
              true,
            );
            for (const changed of [
              { cutover_id: 'other-generation' },
              { plan_sha256: 'd'.repeat(64) },
              { archive_manifest_sha256: 'd'.repeat(64) },
              { selector_sha256: 'd'.repeat(64) },
              { status: 'not-staged' },
            ]) {
              writeFileSync(stagedJournalPath, record({ ...stagedJournal, ...changed }));
              expect(fixture.invoke(stagedAdmitted.args, 1, selectedLauncher)).toMatchObject({
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
