import { expect, spyOn, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, linkSync, renameSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRuntimeConfig, runtimeConfigDigest } from '../src/config/runtime-config.ts';
import { canonicalJsonDigest, isPlainRecord } from '../src/contracts/public-ingress.ts';
import {
  readRetainedUnissuedSessionEngineSnapshot,
  readSessionEngineSnapshot,
  type RetainedSessionEngineWorkEvidence,
} from '../src/orchestration/session-engine-snapshot.ts';
import { parseMastraSessionLedgerState } from '../src/orchestration/mastra-session-ledger-codec.ts';
import { retryPendingWorkspaceDatabaseCloses } from '../src/config/workspace-database-raw.ts';
import { assertWorkspaceDatabaseAdmission } from '../src/config/storage-read-admission.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';
import { PROJECT_UPGRADE_OPERATION_PATH } from '../src/config/project-paths.ts';
import type { MastraSessionLedgerState } from '../src/orchestration/persistent-session-handoff.ts';
import {
  buildSessionBridgeRequest,
  type SessionBridgeObservation,
  type SessionBridgeRequest,
} from '../src/orchestration/mastra-session-bridge-contract.ts';
import type { WorkItemSelection } from '../src/config/runtime-config.ts';
import { createSessionActionProjector } from '../src/orchestration/session-handoff.ts';
import type { CorrectiveExecution } from '../src/orchestration/corrective-execution-contract.ts';

type MutableScopeFixture = {
  schema: 'ScopedSourceSnapshot/v1';
  digest: string;
  entries: Array<{ path: string; exists: boolean; bytes: number | null; sha256: string | null }>;
};
type MutableJournalFixture = {
  schema: 'MastraSessionLedger/v1';
  workspace_id: string;
  work_id: string;
  attempt: number;
  run_id: string;
  source_scope: MutableScopeFixture;
  step_id: string;
  items: Array<{
    request: SessionBridgeRequest;
    issue_id: string | null;
    observation: SessionBridgeObservation | null;
  }>;
  completed: Array<{
    step_id: string;
    items: Array<{
      request: SessionBridgeRequest;
      issue_id: string | null;
      observation: SessionBridgeObservation | null;
    }>;
  }>;
};
const bundle = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-session-engine-frontier-'));
  writeFileSync(
    path.join(root, 'agent-runtime.config.v1.yaml'),
    readFileSync(path.join(bundle, 'templates/agent-runtime.config.template.v1.yaml'), 'utf8')
      .replaceAll('{{REPOSITORY}}', 'frontier-fixture')
      .replaceAll('{{PROJECT}}', 'sample')
      .replaceAll('{{BUNDLE}}', 'vida-agent')
      .replaceAll('.agent/work', '.agent/current-work'),
  );
  writeFileSync(path.join(root, 'AGENTS.md'), 'Fixture policy');
  writeFileSync(path.join(root, 'AGENT.sidecar.md'), 'Fixture source map');
  mkdirSync(path.join(root, 'docs', 'agent-instructions'), { recursive: true });
  writeFileSync(path.join(root, 'docs', 'agent-instructions', 'documentation-policy.v1.json'), '{}');
  const config = loadRuntimeConfig(root),
    project = config.projects[0]!.project_id,
    workId = 'frontier-work',
    attempt = 4,
    workflowId = 'old-configured-workflow',
    runId = 'vida-old-frontier-run',
    oldConfigDigest = '1'.repeat(64),
    scope: MutableScopeFixture = {
      schema: 'ScopedSourceSnapshot/v1',
      digest: '',
      entries: [{ path: 'src/example.ts', exists: true, bytes: 10, sha256: '2'.repeat(64) }],
    };
  scope.digest = canonicalJsonDigest({ schema: scope.schema, entries: scope.entries });
  const workItem = {
      schema: 'WorkItem/v1',
      id: workId,
      provider: 'fixture',
      provider_type: 'fixture',
      canonical_kind: 'bug' as const,
      intent: 'bug_fix' as const,
      project_id: project,
      title: 'Retained frontier fixture',
      description: '',
      labels: [],
      risk_flags: [],
    },
    intake = {
      schema: 'VidaLocalSessionIntake/v1',
      native_session_handle: 'fixture-session',
      risk: 'high',
      work_item: workItem,
      runtime_code_paths: [],
    },
    intakeBytes = Buffer.from(JSON.stringify(intake));
  writeFileSync(path.join(root, 'accepted-intake.json'), intakeBytes);
  const selection: WorkItemSelection = {
    team: 'default-development',
    kind: workItem.canonical_kind,
    intent: workItem.intent,
    project,
    risk_flags: workItem.risk_flags,
    labels: workItem.labels,
  };
  const work = {
    schema: 'WorkState/v1' as const,
    workspace_id: 'workspace-fixture',
    revision: 1,
    binding: {
      repository_id: config.repository.repository_id,
      project_ids: [project],
      integrations_digest: '3'.repeat(64),
      team_id: selection.team,
      workflow_id: workflowId,
      provider_work_item_id: workId,
      lifecycle_work_id: workId,
      work_item_digest: canonicalJsonDigest(workItem),
      work_source_revision: scope.digest,
      scope_id: 'fixture-scope',
      scope_contract_digest: '4'.repeat(64),
      acceptance_manifest_digest: '5'.repeat(64),
      ac_ids: [],
      implementation_paths: [],
      allowed_resources: [],
      config_digest: oldConfigDigest,
      runtime_source_revision: 'fixture-runtime-revision',
      schema_digest: '6'.repeat(64),
      runtime_code_digest: '7'.repeat(64),
    },
    execution: {
      run_id: runId,
      input_digest: '8'.repeat(64),
      phase: 'execute',
      status: 'active',
      assignment_attempts: [],
    },
    lease: null,
    lifecycle: { risk: 'high' as const },
    artifacts: [
      {
        artifact_id: 'local-session-intake',
        schema: 'VidaLocalSessionIntake/v1',
        path: 'accepted-intake.json',
        sha256: createHash('sha256').update(intakeBytes).digest('hex'),
      },
    ],
  };
  const retainedWorkEvidence = work satisfies RetainedSessionEngineWorkEvidence;
  const input = {
    work_id: workId,
    attempt,
    workflow_id: workflowId,
    scope_digest: scope.digest,
    config_digest: oldConfigDigest,
    selection,
    observations: [],
  };
  const request = ({
    waveIndex,
    actionId,
    stageId,
    role,
    priorState,
  }: {
    waveIndex: number;
    actionId: string;
    stageId: string;
    role: string;
    priorState: { observations: readonly { output_digest: string }[] };
  }): SessionBridgeRequest => ({
    schema: 'VidaSessionRequest/v1',
    run_id: runId,
    workflow_id: workflowId,
    wave_index: waveIndex,
    action_id: actionId,
    assignment_index: 0,
    stage_id: stageId,
    role,
    config_digest: oldConfigDigest,
    scope_digest: scope.digest,
    bindings_manifest_ref: canonicalJsonDigest({
      config_digest: oldConfigDigest,
      scope_digest: scope.digest,
      work_id: workId,
      attempt,
      action_id: actionId,
      stage_id: stageId,
      configured_context_digest: null,
      wave_index: waveIndex,
      prior_results: priorState.observations.map((observation) => observation.output_digest),
    }),
  });
  const prefixRequest = request({
      waveIndex: 0,
      actionId: 'a'.repeat(64),
      stageId: 'research_code',
      role: 'code-researcher',
      priorState: input,
    }),
    prefixObservation = {
      schema: 'VidaSessionObservation/v1',
      action_id: prefixRequest.action_id,
      issue_id: randomUUID(),
      agent_id: 'code-researcher',
      tool_call_ref: 'fixture-prefix-call',
      status: 'reported_complete',
      summary: 'Retained successful research result',
      output_digest: canonicalJsonDigest('Retained successful research result'),
      evidence_refs: [],
    } satisfies SessionBridgeObservation,
    prefixOutput = { ...input, observations: [prefixObservation] },
    frontierRequest = request({
      waveIndex: 3,
      actionId: 'b'.repeat(64),
      stageId: 'develop_change',
      role: 'developer-orchestrator',
      priorState: prefixOutput,
    });
  const journal: MutableJournalFixture = {
    schema: 'MastraSessionLedger/v1',
    workspace_id: work.workspace_id,
    work_id: workId,
    attempt,
    run_id: runId,
    source_scope: scope,
    step_id: 'wave-3',
    items: [{ request: frontierRequest, issue_id: null, observation: null }],
    completed: [
      {
        step_id: 'wave-0',
        items: [{ request: prefixRequest, issue_id: prefixObservation.issue_id, observation: prefixObservation }],
      },
    ],
  } satisfies MastraSessionLedgerState;
  const snapshot = {
    runId,
    status: 'suspended' as 'suspended' | 'unknown',
    context: {
      input,
      'wave-0': {
        status: 'success',
        payload: input,
        suspendPayload: { requests: [prefixRequest] },
        resumePayload: { observations: [prefixObservation] },
        output: prefixOutput,
      },
      'wave-3': {
        status: 'suspended',
        payload: prefixOutput,
        suspendPayload: { requests: [frontierRequest] },
      },
    },
    suspendedPaths: { 'wave-3': [1] },
  };
  const storageRoot = path.join(root, config.control.work_root);
  mkdirSync(storageRoot, { recursive: true });
  const databasePath = path.join(storageRoot, 'mastra-workflows.v1.sqlite'),
    database = new Database(databasePath, { create: true, strict: true });
  try {
    database.exec('CREATE TABLE mastra_workflow_snapshot (workflow_name TEXT,run_id TEXT,snapshot BLOB)');
    database
      .query('INSERT INTO mastra_workflow_snapshot VALUES(?,?,jsonb(?))')
      .run(workflowId, runId, JSON.stringify(snapshot));
  } finally {
    database.close();
  }
  const oldStorageRoot = path.join(root, '.agent', 'work');
  mkdirSync(oldStorageRoot, { recursive: true });
  writeFileSync(path.join(oldStorageRoot, 'mastra-workflows.v1.sqlite'), 'decoy old-config database');
  const binding = {
    repositoryRoot: root,
    config,
    selection,
    context: { work_id: workId, attempt, scope_digest: scope.digest },
    workflowId,
    runId,
  };
  return {
    root,
    databasePath,
    binding,
    work: retainedWorkEvidence,
    journal,
    snapshot,
    runId,
    frontierRequest,
    prefixObservation,
    prefixOutput,
  };
}

function withFixture(
  callback: (value: ReturnType<typeof fixture>) => void,
  options: { readonly disposeWhen?: () => boolean } = {},
): void {
  const value = fixture();
  let completed = false;
  try {
    callback(value);
    completed = true;
  } finally {
    if (completed && (options.disposeWhen?.() ?? true)) rmSync(value.root, { recursive: true, force: true });
    else console.error(`Retained failed or expired session engine frontier fixture: ${value.root}`);
  }
}

test('retains unknown frontier validation with its admitted source close failure and retries the same owner', () => {
  const started = process.hrtime.bigint();
  let mayDispose = false;
  withFixture(
    ({ binding, work, journal, snapshot, runId, databasePath }) => {
      // Persist the invalid frontier before installing any database observers.
      snapshot.status = 'unknown';
      const setup = new Database(databasePath, { strict: true });
      try {
        setup
          .query('UPDATE mastra_workflow_snapshot SET snapshot=jsonb(?) WHERE run_id=?')
          .run(JSON.stringify(snapshot), runId);
      } finally {
        setup.close();
      }
      let bodyOnlyError: unknown;
      try {
        readRetainedUnissuedSessionEngineSnapshot(binding, {
          work,
          journal: parseMastraSessionLedgerState(journal),
        });
      } catch (error) {
        bodyOnlyError = error;
      }
      expect(bodyOnlyError).toBeInstanceOf(Error);
      const validationMessage = bodyOnlyError instanceof Error ? bodyOnlyError.message : '';
      const closeError = new Error('injected admitted source close interruption');
      const closeOrder: string[] = [];
      let source: Database | undefined;
      let gate: Database | undefined;
      const sourceHandles: Database[] = [];
      const gateHandles: Database[] = [];
      let admissionWasLiveBeforeValidation = false;
      const originalClose = Reflect.get(Database.prototype, 'close') as typeof Database.prototype.close;
      const originalExec = Reflect.get(Database.prototype, 'exec') as typeof Database.prototype.exec;
      const closeSpy = spyOn(Database.prototype, 'close').mockImplementation(function (
        this: Database,
        force?: boolean,
      ) {
        if (this === source) {
          closeOrder.push('source');
          if (closeOrder.filter((entry) => entry === 'source').length === 1) throw closeError;
        }
        if (this === gate) closeOrder.push('gate');
        return Reflect.apply(originalClose, this, [force]);
      });
      const execSpy = spyOn(Database.prototype, 'exec').mockImplementation(function (this: Database, sql: string) {
        const statement = sql.trim();
        if (statement === 'BEGIN DEFERRED') {
          gateHandles.push(this);
          gate = gateHandles.at(-1);
        }
        const result = Reflect.apply(originalExec, this, [sql]);
        if (path.resolve(this.filename) === databasePath && statement === 'PRAGMA busy_timeout=1000') {
          assertWorkspaceDatabaseAdmission(
            this,
            binding.repositoryRoot,
            path.relative(binding.repositoryRoot, databasePath),
            deriveWorkspaceId(binding.config.repository.repository_id, binding.repositoryRoot),
          );
          sourceHandles.push(this);
          source = sourceHandles.at(-1);
          admissionWasLiveBeforeValidation = true;
        }
        return result;
      });
      let spiesRestored = false;
      let bodyError: unknown;
      const cleanupErrors: unknown[] = [];
      try {
        let readError: unknown;
        try {
          readRetainedUnissuedSessionEngineSnapshot(binding, {
            work,
            journal: parseMastraSessionLedgerState(journal),
          });
        } catch (error) {
          readError = error;
        }
        const containsCause = (error: unknown, target: (nested: unknown) => boolean): boolean =>
          target(error) ||
          (error instanceof AggregateError && error.errors.some((nested) => containsCause(nested, target)));
        expect(admissionWasLiveBeforeValidation).toBe(true);
        if (!source || !gate) throw new Error('admitted source or paired gate was not captured');
        const admittedSource = source;
        const pairedGate = gate;
        expect(readError).toBeInstanceOf(AggregateError);
        expect(containsCause(readError, (error) => error === closeError)).toBe(true);
        expect(containsCause(readError, (error) => error instanceof Error && error.message === validationMessage)).toBe(
          true,
        );
        expect(closeOrder).toEqual(['source']);
        expect(admittedSource.query('PRAGMA busy_timeout').get()).toBeDefined();
        expect(pairedGate.inTransaction).toBe(true);
        expect(
          pairedGate
            .query<{ schema: string; workspace_id: string }, []>(
              'SELECT schema,workspace_id FROM storage_admission_meta WHERE id=1',
            )
            .get()?.schema,
        ).toBe('VidaStorageAdmission/v1');

        closeSpy.mockRestore();
        execSpy.mockRestore();
        spiesRestored = true;
        retryPendingWorkspaceDatabaseCloses();
        expect(() => admittedSource.query('PRAGMA busy_timeout').get()).toThrow();
        expect(() => pairedGate.query('SELECT workspace_id FROM storage_admission_meta').get()).toThrow();

        snapshot.status = 'suspended';
        const retrySetup = new Database(databasePath, { strict: true });
        try {
          retrySetup
            .query('UPDATE mastra_workflow_snapshot SET snapshot=jsonb(?) WHERE run_id=?')
            .run(JSON.stringify(snapshot), runId);
        } finally {
          retrySetup.close();
        }
        expect(
          readRetainedUnissuedSessionEngineSnapshot(binding, {
            work,
            journal: parseMastraSessionLedgerState(journal),
          }).status,
        ).toBe('suspended');
      } catch (error) {
        bodyError = error;
      } finally {
        if (!spiesRestored) {
          closeSpy.mockRestore();
          execSpy.mockRestore();
        }
        try {
          retryPendingWorkspaceDatabaseCloses();
        } catch (error) {
          cleanupErrors.push(error);
        }
      }
      if (bodyError !== undefined && cleanupErrors.length > 0)
        throw new AggregateError([bodyError, ...cleanupErrors], 'frontier validation and close retry failed');
      if (bodyError !== undefined) throw bodyError;
      if (cleanupErrors.length > 0) throw new AggregateError(cleanupErrors, 'frontier close retry remained pending');
      if (process.hrtime.bigint() - started >= 5_000_000_000n)
        throw new Error('frontier validation and close retry exceeded the default five-second deadline');
      mayDispose = true;
    },
    { disposeWhen: () => mayDispose },
  );
});

test.each([
  ['identity', 'success'],
  ['identity', 'failure'],
  ['upgrade', 'success'],
  ['upgrade', 'failure'],
] as const)('post-close %s fence retains the frontier outcome after read %s', (fence, outcome) => {
  const bodyFails = outcome === 'failure';
  const started = process.hrtime.bigint();
  withFixture(
    ({ binding, work, journal, snapshot, runId, databasePath }) => {
      // Prime admission and establish the actual successful caller before arming the close observer.
      expect(readRetainedUnissuedSessionEngineSnapshot(binding, { work, journal }).status).toBe('suspended');
      if (bodyFails) {
        snapshot.status = 'unknown';
        const setup = new Database(databasePath, { strict: true });
        try {
          setup
            .query('UPDATE mastra_workflow_snapshot SET snapshot=jsonb(?) WHERE run_id=?')
            .run(JSON.stringify(snapshot), runId);
        } finally {
          setup.close();
        }
      }
      const beforeBytes = readFileSync(databasePath);
      const originalClose = Reflect.get(Database.prototype, 'close') as typeof Database.prototype.close;
      const originalExec = Reflect.get(Database.prototype, 'exec') as typeof Database.prototype.exec;
      const closedSources: Database[] = [];
      const closedGates: Database[] = [];
      const pairedGates: Database[] = [];
      const closeOrder: string[] = [];
      const gatePath = path.join(binding.repositoryRoot, '.vida/storage-admission.v1.sqlite');
      const execSpy = spyOn(Database.prototype, 'exec').mockImplementation(function (this: Database, sql: string) {
        if (path.resolve(this.filename) === gatePath && sql === 'BEGIN DEFERRED') pairedGates.push(this);
        return Reflect.apply(originalExec, this, [sql]);
      });
      const closeSpy = spyOn(Database.prototype, 'close').mockImplementation(function (
        this: Database,
        force?: boolean,
      ) {
        const source = path.resolve(this.filename) === databasePath;
        const gate = this === pairedGates[0];
        const result = originalClose.call(this, force);
        if (gate) {
          closedGates.push(this);
          closeOrder.push('gate');
        }
        if (source) {
          closedSources.push(this);
          closeOrder.push('source');
          if (fence === 'identity') {
            renameSync(databasePath, databasePath + '.original');
            writeFileSync(databasePath, beforeBytes, { flag: 'wx' });
          } else {
            const operation = path.join(binding.repositoryRoot, PROJECT_UPGRADE_OPERATION_PATH);
            mkdirSync(path.dirname(operation), { recursive: true });
            writeFileSync(operation, '{}', { flag: 'wx' });
          }
        }
        return result;
      });
      let failure: unknown;
      try {
        readRetainedUnissuedSessionEngineSnapshot(binding, { work, journal });
      } catch (error) {
        failure = error;
      } finally {
        closeSpy.mockRestore();
        execSpy.mockRestore();
        retryPendingWorkspaceDatabaseCloses();
      }
      expect(closedSources).toHaveLength(1);
      expect(closedGates).toHaveLength(1);
      expect(closeOrder).toEqual(['source', 'gate']);
      const closedSource = closedSources[0];
      const closedGate = closedGates[0];
      if (!closedSource) throw new Error('post-close fence did not observe its exact source');
      if (!closedGate) throw new Error('post-close fence did not observe its paired gate close');
      expect(() => closedSource.query('SELECT 1').get()).toThrow();
      expect(() => closedGate.query('SELECT 1').get()).toThrow();
      const fenceError: unknown = bodyFails && failure instanceof AggregateError ? failure.errors[1] : failure;
      if (bodyFails) {
        expect(failure).toBeInstanceOf(AggregateError);
        if (!(failure instanceof AggregateError))
          throw new Error('frontier validation was lost at its post-close fence');
        expect(failure.errors).toHaveLength(2);
        expect(failure.errors[0]).toHaveProperty(
          'message',
          'Session engine: retained original run is not a suspended snapshot',
        );
      }
      expect(fenceError).toBeInstanceOf(Error);
      if (!(fenceError instanceof Error)) throw new Error('post-close fence did not reject');
      expect(fenceError.message).toMatch(
        fence === 'identity' ? /database was substituted/u : /Project upgrade is in progress/u,
      );
    },
    { disposeWhen: () => process.hrtime.bigint() - started < 5_000_000_000n },
  );
});

test('reads a retained unissued developer frontier and verifies the successful old prefix', () => {
  withFixture(
    ({ binding, work, journal, snapshot, frontierRequest, prefixObservation, prefixOutput, databasePath }) => {
      // The current config's storage path is valid even though the protected old config digest differs.
      expect(binding.config.repository.repository_id).toBe(work.binding.repository_id);
      expect(binding.config.control.work_root).toBe('.agent/current-work');
      expect(runtimeConfigDigest(binding.config)).not.toBe(work.binding.config_digest);
      const before = new Database(databasePath, { readonly: true, strict: true });
      const beforeRow = before
        .query<{ snapshot: string }, []>('SELECT json(snapshot) AS snapshot FROM mastra_workflow_snapshot')
        .get();
      if (beforeRow === null) throw new Error('retained fixture snapshot is missing');
      const beforeBytes = beforeRow.snapshot;
      before.close(true);

      const persistedJournal = parseMastraSessionLedgerState(journal);
      expect(Object.getPrototypeOf(persistedJournal.items[0]!.request)).toBeNull();
      expect(Object.isFrozen(persistedJournal.items[0]!.request)).toBe(true);
      expect(readRetainedUnissuedSessionEngineSnapshot(binding, { work, journal: persistedJournal })).toEqual({
        run_id: work.execution.run_id,
        status: 'suspended',
        step_id: journal.step_id,
        requests: [frontierRequest],
        observations: [prefixObservation],
      });

      const after = new Database(databasePath, { readonly: true, strict: true });
      const afterRow = after
        .query<{ snapshot: string }, []>('SELECT json(snapshot) AS snapshot FROM mastra_workflow_snapshot')
        .get();
      if (afterRow === null) throw new Error('retained fixture snapshot disappeared');
      expect(afterRow.snapshot).toBe(beforeBytes);
      after.close(true);
      expect(snapshot.context['wave-0'].output).toEqual(prefixOutput);
    },
  );
});

test('rejects retained config, scope, run, selection, and successful-prefix drift', () => {
  const mutations = [
    (fixtureValue: ReturnType<typeof fixture>) => {
      const { journal } = fixtureValue;
      journal.items[0]!.request.config_digest = '9'.repeat(64);
    },
    (fixtureValue: ReturnType<typeof fixture>) => {
      const { journal } = fixtureValue;
      journal.source_scope!.digest = '9'.repeat(64);
    },
    (fixtureValue: ReturnType<typeof fixture>) => {
      const { binding, work, journal } = fixtureValue;
      Object.assign(journal.source_scope!.entries[0]!, { extra: 'reject' });
      journal.source_scope!.digest = canonicalJsonDigest({
        schema: journal.source_scope!.schema,
        entries: journal.source_scope!.entries,
      });
      work.binding.work_source_revision = journal.source_scope!.digest;
      binding.context.scope_digest = journal.source_scope!.digest;
    },
    (fixtureValue: ReturnType<typeof fixture>) => {
      const { snapshot } = fixtureValue;
      snapshot.runId = 'vida-substituted-run';
    },
    (fixtureValue: ReturnType<typeof fixture>) => {
      const { snapshot } = fixtureValue;
      snapshot.context.input.selection = { ...snapshot.context.input.selection, project: 'foreign-project' };
    },
    (fixtureValue: ReturnType<typeof fixture>) => {
      const { snapshot } = fixtureValue;
      const observation = snapshot.context['wave-0'].output.observations[0];
      if (observation === undefined) throw new Error('fixture prefix observation is missing');
      observation.summary = 'changed prefix';
    },
  ];
  for (const mutate of mutations) {
    withFixture((fixtureValue) => {
      const { binding, work, journal, snapshot, runId, databasePath } = fixtureValue;
      mutate(fixtureValue);
      const database = new Database(databasePath, { strict: true });
      try {
        database
          .query('UPDATE mastra_workflow_snapshot SET snapshot=jsonb(?) WHERE run_id=?')
          .run(JSON.stringify(snapshot), runId);
      } finally {
        database.close();
      }
      expect(() => readRetainedUnissuedSessionEngineSnapshot(binding, { work, journal })).toThrow();
    });
  }
});

test('rejects issued and unknown frontier outcomes, and corrective work', () => {
  const mutations = [
    (fixtureValue: ReturnType<typeof fixture>) => {
      const { journal } = fixtureValue;
      journal.items[0]!.issue_id = randomUUID();
    },
    (fixtureValue: ReturnType<typeof fixture>) => {
      const { journal, frontierRequest } = fixtureValue;
      const issueId = randomUUID();
      journal.items[0]!.issue_id = issueId;
      journal.items[0]!.observation = {
        ...journal.completed[0]!.items[0]!.observation!,
        action_id: frontierRequest.action_id,
        issue_id: issueId,
      };
    },
    (fixtureValue: ReturnType<typeof fixture>) => {
      const { snapshot } = fixtureValue;
      snapshot.status = 'unknown';
    },
    (fixtureValue: ReturnType<typeof fixture>) => {
      const { journal } = fixtureValue;
      Object.assign(journal.items[0]!.request, { corrective_execution: { schema: 'CorrectiveExecution/v1' } });
    },
  ];
  for (const mutate of mutations) {
    withFixture((fixtureValue) => {
      const { binding, work, journal, snapshot, runId, databasePath } = fixtureValue;
      mutate(fixtureValue);
      if (snapshot.status !== 'suspended') {
        const database = new Database(databasePath, { strict: true });
        try {
          database
            .query('UPDATE mastra_workflow_snapshot SET snapshot=jsonb(?) WHERE run_id=?')
            .run(JSON.stringify(snapshot), runId);
        } finally {
          database.close();
        }
      }
      expect(() => readRetainedUnissuedSessionEngineSnapshot(binding, { work, journal })).toThrow();
    });
  }
});

test('reads a codec-parsed corrective execution from a configured suspended engine frontier', () => {
  withFixture(({ binding: originalBinding, databasePath, runId: originalRunId }) => {
    const config = originalBinding.config,
      workflowId = 'task_execution',
      workId = originalBinding.context.work_id,
      attempt = originalBinding.context.attempt,
      scopeDigest = originalBinding.context.scope_digest,
      engineRunId = randomUUID(),
      baseRunId = 'vida-corrective-base-run',
      context = { work_id: workId, attempt, scope_digest: scopeDigest },
      selection: WorkItemSelection = {
        team: 'default-development',
        kind: 'task',
        intent: 'task_execution',
        project: config.projects[0]!.project_id,
        risk_flags: ['high'],
        labels: [],
      },
      correctiveExecution: CorrectiveExecution = {
        schema: 'CorrectiveExecution/v1',
        base_run_id: baseRunId,
        engine_run_id: engineRunId,
        correction_generation: 1,
        stage_ids: ['develop_task', 'validate_focused', 'test_task'],
        authorization: {
          schema: 'CorrectiveAssignmentAuthorization/v1',
          path: `.agent/work/${workId}/correction-authorization.json`,
          sha256: 'a'.repeat(64),
        },
      },
      projector = createSessionActionProjector(config, selection, workflowId, 'high'),
      waveIndex = projector.executableWaveIndices(correctiveExecution.stage_ids)[0];
    if (waveIndex === undefined) throw new Error('configured correction has no executable wave');
    const actions = projector.actionsForWave(context, waveIndex, [], correctiveExecution),
      action = actions.find((entry) => entry.stage_id === 'develop_task');
    if (!action) throw new Error('configured corrective develop action is missing');
    expect(actions).toHaveLength(1);
    const request = buildSessionBridgeRequest({
        runId: engineRunId,
        workflowId,
        configDigest: runtimeConfigDigest(config),
        context,
        waveIndex,
        action,
        configuredContext: null,
        priorResults: [],
        correctiveExecution,
      }),
      input = {
        work_id: workId,
        attempt,
        workflow_id: workflowId,
        scope_digest: scopeDigest,
        config_digest: runtimeConfigDigest(config),
        selection,
        observations: [],
      },
      stepId = `wave-${waveIndex}`,
      snapshot: Record<string, unknown> = {
        runId: engineRunId,
        status: 'suspended',
        context: {
          input,
          [stepId]: {
            status: 'suspended',
            payload: input,
            suspendPayload: { requests: [request] },
          },
        },
        suspendedPaths: { [stepId]: [0] },
      },
      journal = parseMastraSessionLedgerState({
        schema: 'MastraSessionLedger/v1',
        workspace_id: 'workspace-fixture',
        work_id: workId,
        attempt,
        run_id: engineRunId,
        step_id: stepId,
        items: [{ request, issue_id: null, observation: null }],
        completed: [],
        corrective_execution: correctiveExecution,
      }),
      parsedCorrection = journal.corrective_execution;
    if (!parsedCorrection) throw new Error('codec-parsed corrective request omitted its authority');
    expect(Object.getPrototypeOf(parsedCorrection)).toBeNull();
    expect(Object.isFrozen(parsedCorrection)).toBe(true);

    const database = new Database(databasePath, { strict: true });
    try {
      database
        .query('UPDATE mastra_workflow_snapshot SET workflow_name=?,run_id=?,snapshot=jsonb(?) WHERE run_id=?')
        .run(workflowId, engineRunId, JSON.stringify(snapshot), originalRunId);
    } finally {
      database.close();
    }
    const currentBinding = {
      ...originalBinding,
      config,
      selection,
      context,
      workflowId,
      runId: engineRunId,
      lifecycleRisk: 'high' as const,
      correctiveExecution: parsedCorrection,
    };
    let inspected: ReturnType<typeof readSessionEngineSnapshot> | undefined;
    expect(() => {
      inspected = readSessionEngineSnapshot(currentBinding);
    }).not.toThrow();
    expect(inspected).toEqual({
      run_id: engineRunId,
      status: 'suspended',
      step_id: stepId,
      requests: [request],
      observations: [],
    });

    const malformed = { ...parsedCorrection, correction_generation: 0 };
    expect(() => readSessionEngineSnapshot({ ...currentBinding, correctiveExecution: malformed })).toThrow(
      /correction_generation/,
    );

    const malformedAuthorization = { ...parsedCorrection };
    Reflect.set(malformedAuthorization, 'authorization', null);
    expect(() => readSessionEngineSnapshot({ ...currentBinding, correctiveExecution: malformedAuthorization })).toThrow(
      /authorization/,
    );

    const extraField = { ...parsedCorrection, extra: true };
    expect(() => readSessionEngineSnapshot({ ...currentBinding, correctiveExecution: extraField })).toThrow(
      /unrecognized_keys/,
    );

    const symbolic = { ...parsedCorrection, [Symbol('extra')]: true };
    expect(() => readSessionEngineSnapshot({ ...currentBinding, correctiveExecution: symbolic })).toThrow(
      'symbol property at $.correctiveExecution',
    );

    let generationReads = 0;
    const accessor = { ...parsedCorrection };
    Object.defineProperty(accessor, 'correction_generation', {
      enumerable: true,
      get() {
        generationReads += 1;
        return 1;
      },
    });
    expect(() => readSessionEngineSnapshot({ ...currentBinding, correctiveExecution: accessor })).toThrow(
      'non-canonical property descriptor at $.correctiveExecution.correction_generation',
    );
    expect(generationReads).toBe(0);

    for (const field of ['correction_generation', 'sha256'] as const) {
      const inherited = { ...parsedCorrection, authorization: { ...parsedCorrection.authorization } },
        owner = field === 'correction_generation' ? inherited : inherited.authorization,
        previous = Object.getOwnPropertyDescriptor(Object.prototype, field);
      const value: unknown = Reflect.get(owner, field);
      let inheritedReads = 0;
      Reflect.deleteProperty(owner, field);
      Object.defineProperty(Object.prototype, field, {
        configurable: true,
        get() {
          inheritedReads += 1;
          return value;
        },
      });
      try {
        let rejection: unknown;
        try {
          readSessionEngineSnapshot({ ...currentBinding, correctiveExecution: inherited });
        } catch (error) {
          rejection = error;
        }
        expect(inheritedReads).toBe(0);
        expect(rejection).toBeInstanceOf(Error);
        expect(rejection instanceof Error ? rejection.message : rejection).toMatch(new RegExp(field));
      } finally {
        if (previous === undefined) Reflect.deleteProperty(Object.prototype, field);
        else Object.defineProperty(Object.prototype, field, previous);
      }
    }

    const changedSnapshot = structuredClone(snapshot),
      snapshotContext = changedSnapshot.context;
    if (!isPlainRecord(snapshotContext)) throw new Error('corrective snapshot context is invalid');
    const suspendedStep = snapshotContext[stepId];
    if (!isPlainRecord(suspendedStep) || !isPlainRecord(suspendedStep.suspendPayload))
      throw new Error('corrective suspended step is invalid');
    const requests = suspendedStep.suspendPayload.requests;
    if (!Array.isArray(requests) || !isPlainRecord(requests[0]) || !isPlainRecord(requests[0].corrective_execution))
      throw new Error('corrective suspended request is invalid');
    requests[0].corrective_execution.stage_ids = ['test_task'];
    const changedDatabase = new Database(databasePath, { strict: true });
    try {
      changedDatabase
        .query('UPDATE mastra_workflow_snapshot SET snapshot=jsonb(?) WHERE run_id=?')
        .run(JSON.stringify(changedSnapshot), engineRunId);
    } finally {
      changedDatabase.close();
    }
    expect(() => readSessionEngineSnapshot(currentBinding)).toThrow(/configured frontier requests/);
  });
});

test('rejects a substituted database inode and duplicate retained run rows', () => {
  withFixture(({ binding, work, journal, databasePath }) => {
    const alias = databasePath + '.alias';
    linkSync(databasePath, alias);
    try {
      expect(() => readRetainedUnissuedSessionEngineSnapshot(binding, { work, journal })).toThrow(/unsafe/);
    } finally {
      rmSync(alias, { force: true });
    }
    const database = new Database(databasePath, { strict: true });
    try {
      const original = database
        .query<{ workflow_name: string; run_id: string; snapshot: string }, []>(
          'SELECT workflow_name,run_id,json(snapshot) AS snapshot FROM mastra_workflow_snapshot',
        )
        .get();
      if (original === null) throw new Error('retained fixture row is missing');
      database
        .query('INSERT INTO mastra_workflow_snapshot VALUES(?,?,jsonb(?))')
        .run(original.workflow_name, original.run_id, original.snapshot);
    } finally {
      database.close();
    }
    expect(() => readRetainedUnissuedSessionEngineSnapshot(binding, { work, journal })).toThrow(/ambiguous/);
  });
});
