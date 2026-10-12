import { test, expect } from 'bun:test';
import { Database } from 'bun:sqlite';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import type { SpawnSyncReturns } from 'node:child_process';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ResearchResult } from '../src/research-decision.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { loadRuntimeConfig, runtimeConfigDigest } from '../src/config/runtime-config.ts';
import { snapshotDeclaredSources } from '../src/orchestration/scoped-source-snapshot.ts';
import { main } from '../bin/run.ts';
import { runtimeExecutableInventory } from '../tooling/maintained-source-inventory.ts';
import { citedResearchConstraints } from '../src/orchestration/admitted-development-packet.ts';
import { HostStateStore } from '../src/host-state.ts';
import { MastraSessionLedger } from '../src/orchestration/persistent-session-handoff.ts';
import { parseSessionBridgeRequest } from '../src/orchestration/mastra-session-bridge.ts';
import { runSourcePrewriterPublicActions, runTaskSynthesisPublicActions } from './helpers/public-prewriter-fixture.ts';

type PublicFailure = { readonly status: string; readonly message: string };
type ChildResult = {
  readonly payload: unknown;
  readonly status: number | null;
  readonly stdout: string;
  readonly stderr: string;
};
type HostStateRow = { readonly kind: string; readonly payload: string };
type LedgerProjection = {
  readonly claims: readonly { readonly status: string; readonly resources: readonly string[] }[];
  readonly tickets: readonly { readonly status: string }[];
};
type WorkProjection = {
  readonly execution: {
    readonly assignment_attempts: readonly {
      readonly status: string;
      readonly lease: { readonly ticket_id: string };
    }[];
  };
  readonly lease: { readonly ticket_id: string };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`${label} must be an object`);
  return value;
}

function requireUnknownArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  return value;
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== 'string') throw new Error(`${label} must be a string`);
  return value;
}

function requireStringArray(value: unknown, label: string): string[] {
  const values = requireUnknownArray(value, label);
  return values.map((entry, index) => {
    if (typeof entry !== 'string') throw new Error(`${label} item ${index} must be a string`);
    return entry;
  });
}

function parsePublicFailure(value: unknown): PublicFailure {
  const failure = requireRecord(value, 'public failure');
  return {
    status: requireString(failure.status, 'public failure status'),
    message: requireString(failure.message, 'public failure message'),
  };
}

function readLedger(value: unknown): LedgerProjection {
  const ledger = requireRecord(value, 'ledger');
  const claims = requireUnknownArray(ledger.claims, 'ledger claims').map((entry, index) => {
    const claim = requireRecord(entry, `ledger claim ${index}`);
    return {
      status: requireString(claim.status, `ledger claim ${index} status`),
      resources: requireStringArray(claim.resources, `ledger claim ${index} resources`),
    };
  });
  const tickets = requireUnknownArray(ledger.tickets, 'ledger tickets').map((entry, index) => {
    const ticket = requireRecord(entry, `ledger ticket ${index}`);
    return { status: requireString(ticket.status, `ledger ticket ${index} status`) };
  });
  return { claims, tickets };
}

function readWork(value: unknown): WorkProjection {
  const work = requireRecord(value, 'work');
  const execution = requireRecord(work.execution, 'work execution');
  const assignmentAttempts = requireUnknownArray(execution.assignment_attempts, 'assignment attempts').map(
    (entry, index) => {
      const attempt = requireRecord(entry, `assignment attempt ${index}`);
      const lease = requireRecord(attempt.lease, `assignment attempt ${index} lease`);
      return {
        status: requireString(attempt.status, `assignment attempt ${index} status`),
        lease: { ticket_id: requireString(lease.ticket_id, `assignment attempt ${index} ticket id`) },
      };
    },
  );
  const lease = requireRecord(work.lease, 'work lease');
  return {
    execution: { assignment_attempts: assignmentAttempts },
    lease: { ticket_id: requireString(lease.ticket_id, 'work lease ticket id') },
  };
}

function rowValue(rows: readonly { readonly kind: string; readonly value: unknown }[], kind: string): unknown {
  const row = rows.find((candidate) => candidate.kind === kind);
  if (row === undefined) throw new Error(`Host state row ${kind} is missing`);
  return row.value;
}

function parseInvocation(result: SpawnSyncReturns<string>): ChildResult {
  if (result.error !== undefined || result.signal !== null || !Number.isInteger(result.status))
    throw new Error('child process outcome is unknown');
  const stdout = result.stdout;
  const stderr = result.stderr;
  const output = result.status === 0 ? stdout : stderr;
  const lastLine = output.trim().split(/\r?\n/).at(-1);
  if (lastLine === undefined) throw new Error('child process returned invalid JSON result');
  let payload: unknown;
  try {
    payload = JSON.parse(lastLine);
  } catch {
    throw new Error('child process returned invalid JSON result');
  }
  return { status: result.status, stdout, stderr, payload };
}

function invocationResult(overrides: Partial<SpawnSyncReturns<string>> = {}): SpawnSyncReturns<string> {
  return {
    pid: 1,
    output: [null, '', ''],
    stdout: '',
    stderr: '',
    status: 0,
    signal: null,
    ...overrides,
  };
}

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('audit invocation rejects unknown process outcomes before reading output', () => {
  const secret = 'private-timeout-output';
  for (const result of [
    invocationResult({ status: null, signal: 'SIGTERM', stderr: secret }),
    invocationResult({ status: 1, signal: 'SIGTERM', stderr: secret }),
    invocationResult({ status: null, stderr: secret }),
    invocationResult({ status: 1, error: new Error(secret), stderr: secret }),
  ]) {
    expect(() => parseInvocation(result)).toThrow('child process outcome is unknown');
  }
});

test('audit invocation rejects terminal malformed JSON without exposing stderr', () => {
  const secret = 'private-malformed-output';
  expect(() => parseInvocation(invocationResult({ status: 1, stderr: secret }))).toThrow(
    'child process returned invalid JSON result',
  );
});

test('audit invocation accepts a terminal status-one JSON denial from stderr', () => {
  const result = parseInvocation(invocationResult({ status: 1, stderr: '{"status":"blocked"}\n' }));
  expect(result.status).toBe(1);
  expect(result.payload).toEqual({ status: 'blocked' });
});

test('audit diagnostics distinguish expiry, CAS and artifact validation without exposing supplied secrets', async () => {
  const publicFailure = async (error: Error): Promise<PublicFailure> => {
    const output: unknown[] = [];
    await main({
      isMain: true,
      args: [],
      execute: async () => {
        throw error;
      },
      io: {
        log: () => {
          throw new Error('failure diagnostic fixture emitted success output');
        },
        error: (value: string) => {
          const parsed: unknown = JSON.parse(value);
          output.push(parsed);
        },
      },
      exit: {},
    });
    return parsePublicFailure(output[0]);
  };
  const expired = await publicFailure(new Error('ownership lease expired token=private-expiry-secret'));
  const stale = await publicFailure(new Error('CAS version changed Authorization: Bearer private-cas-secret'));
  const malformed = await publicFailure(
    new Error('synthesis summary has unsupported fields secret://private-artifact-secret'),
  );
  expect(new Set([expired.message, stale.message, malformed.message]).size).toBe(3);
  for (const result of [expired, stale, malformed]) {
    expect(result.status).toBe('blocked');
    expect(result.message).toContain('Phase:');
    expect(result.message).toContain('Next action:');
    expect(JSON.stringify(result)).not.toContain('private-');
  }
  const unknown = await publicFailure(new Error('password=never-publish-this https://example.test/private-path'));
  expect(unknown.message).not.toContain('never-publish-this');
  expect(unknown.message).not.toContain('private-path');
});

test('audit research constraints retain confirmed citations and reject missing sources without inventing classifications', () => {
  const result = {
    result_id: 'research-fixture',
    source_refs: [
      {
        source_kind: 'internal',
        source_id: 'current-code',
        locator: 'fixture:current-code',
        title: 'Current code',
        claim: 'Current fixture source.',
        retrieved_at: '2026-10-11T00:00:00.000Z',
      },
    ],
    findings: [
      {
        finding_id: 'scope-guard',
        statement: 'Retain the exact same-file writer guard.',
        source_ids: ['current-code'],
        evidence_class: 'Code',
        status: 'confirmed',
      },
      {
        finding_id: 'unproven',
        statement: 'Do not promote this hypothesis.',
        source_ids: ['current-code'],
        evidence_class: 'Code',
        status: 'tentative',
      },
    ],
  } satisfies Pick<ResearchResult, 'result_id' | 'source_refs' | 'findings'>;
  expect(citedResearchConstraints(result)).toEqual([
    'Research research-fixture/scope-guard [current-code]: Retain the exact same-file writer guard.',
  ]);
  expect(() => citedResearchConstraints({ ...result, source_refs: [] })).toThrow('matching cited source');
});

test('audit core preserves risk and labels through resumed prewriter and admits the configured writer packet', async () => {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-writer-admission-'));
  let fixtureComplete = false;
  let closeSessionDatabase: (() => void) | undefined;
  try {
    const bundle = path.join(root, 'tools', 'agents');
    mkdirSync(bundle, { recursive: true });
    for (const entry of [
      'src',
      'dist',
      'bin',
      'schemas',
      'instructions',
      'templates',
      'tooling',
      'package.json',
      'TESTING.md',
      'bun.lock',
      '.bun-version',
    ])
      cpSync(path.join(packageRoot, entry), path.join(bundle, entry), { recursive: true, dereference: false });
    symlinkSync(
      path.join(packageRoot, 'node_modules'),
      path.join(bundle, 'node_modules'),
      process.platform === 'win32' ? 'junction' : 'dir',
    );
    const invoke = (entry: string, args: string[]) =>
      spawnSync('bun', [path.join(bundle, 'bin', entry), ...args], {
        cwd: bundle,
        encoding: 'utf8',
        windowsHide: true,
      });
    const initialized = invoke('init.ts', [
      '--project-root',
      root,
      '--repository',
      'writer-repository',
      '--project',
      'writer-project',
    ]);
    expect(initialized.status, initialized.stderr).toBe(0);
    mkdirSync(path.join(root, 'src'), { recursive: true });
    writeFileSync(path.join(root, 'src', 'task.ts'), 'export const task = true;\n');
    const source = snapshotDeclaredSources(requireSafeRepositoryAccess(root), ['src/task.ts']);
    const config = loadRuntimeConfig(root);
    const workDir = path.join(root, '.agent', 'work', 'writer-work');
    mkdirSync(workDir, { recursive: true });
    const relative = (name: string) => '.agent/work/writer-work/' + name;
    const put = (name: string, value: unknown) => writeFileSync(path.join(workDir, name), JSON.stringify(value));
    put('scope.json', {
      schema: 'ImplementationScope/v1',
      scope_id: 'writer-scope',
      work_id: 'writer-work',
      source_revision: source.digest,
      ac_ids: ['AC-WRITER-1'],
      allowed_paths: ['src/task.ts'],
      implementation_paths: ['src/task.ts'],
      documentation_paths: [],
      changed_symbols: [],
      non_goals: [],
      acceptance_trace: ['AC-WRITER-1'],
      behavior_trace: ['SR-WRITER-1'],
      test_trace: ['public writer issue'],
      diagnostic_trace: ['fixture'],
      attribution: { thread_id: 'writer-thread', pointer: relative('intake.json') },
      owner: 'fixture',
      created_at: new Date().toISOString(),
    });
    put('acceptance.json', {
      schema: 'AcceptanceManifest/v1',
      id: 'writer-acceptance',
      version: 1,
      ac_ids: ['AC-WRITER-1'],
      source: 'AGENT.sidecar.md',
      scope: 'writer-scope',
      source_revision: source.digest,
      contracts: [
        { id: 'AC-WRITER-1', definition: 'Reserve the exact writer files.', sr: 'SR-WRITER-1', evidence: ['fixture'] },
      ],
    });
    put('source-authorization.json', {
      schema: 'LocalSourceWriteAuthorization/v1',
      action: 'source.write',
      user_instruction_ref: 'fixture:source-write-authorized',
      work_id: 'writer-work',
      attempt: 1,
      scope_digest: source.digest,
      config_digest: runtimeConfigDigest(config),
      workflow_id: 'task_execution',
      stage_ids: ['develop_task'],
      implementation_paths: ['src/task.ts'],
      native_session_handle: 'writer-thread',
    });
    put('intake.json', {
      schema: 'VidaLocalSessionIntake/v1',
      native_session_handle: 'writer-thread',
      work_item: {
        schema: 'WorkItem/v1',
        id: 'writer-work',
        provider: 'local',
        provider_type: 'Task',
        canonical_kind: 'task',
        intent: 'task_execution',
        project_id: 'writer-project',
        title: 'Public writer boundary fixture',
        description: 'Issue the configured writer.',
        labels: ['audit-sensitive'],
        risk_flags: ['concurrency'],
      },
      scope_path: relative('scope.json'),
      acceptance_path: relative('acceptance.json'),
      source_authorization_path: relative('source-authorization.json'),
      runtime_code_paths: runtimeExecutableInventory(bundle).map((file) => 'tools/agents/' + file),
      route: 'R2',
      risk: 'low',
      change_kind: 'fix',
    });
    const args = [
      '--project-root',
      root,
      '--repository',
      'writer-repository',
      '--project',
      'writer-project',
      '--work-path',
      'src',
      '--work-id',
      'writer-work',
      '--attempt',
      '1',
      '--scope-digest',
      source.digest,
      '--team',
      'default-development',
      '--kind',
      'task',
      '--intent',
      'task_execution',
      '--workflow',
      'task_execution',
    ];
    const prepared = parseInvocation(invoke('run.ts', [...args, '--intake', path.join(workDir, 'intake.json')]));
    expect(prepared.status, prepared.stderr).toBe(0);
    const dbPath = path.join(root, '.agent', 'work', 'session-handoff.v1.sqlite');
    const rows = (): Array<{ readonly kind: string; readonly value: unknown }> => {
      const db = new Database(dbPath, { readonly: true });
      try {
        return db
          .query<HostStateRow, []>('SELECT kind,payload FROM agent_host_state')
          .all()
          .map((row) => {
            const value: unknown = JSON.parse(row.payload);
            return { kind: row.kind, value };
          });
      } finally {
        db.close();
      }
    };
    const initialLedger = rowValue(rows(), 'ledger');
    const activeClaim = readLedger(initialLedger).claims.find((claim) => claim.status === 'active');
    expect(activeClaim).toBeDefined();
    expect(activeClaim?.resources).toEqual(['execution:writer-work']);
    const workPayload = requireRecord(rowValue(rows(), 'work'), 'persisted work state');
    const workspaceId = requireString(workPayload.workspace_id, 'work workspace id');
    const sessionDatabase = new Database(dbPath);
    closeSessionDatabase = () => sessionDatabase.close();
    const sessionHost = new HostStateStore(
      sessionDatabase,
      workspaceId,
      undefined,
      undefined,
      undefined,
      undefined,
      root,
    );
    const sessionLedger = new MastraSessionLedger(
      sessionDatabase,
      workspaceId,
      loadRuntimeConfig(root),
      root,
      sessionHost,
    );
    const workBinding = requireRecord(workPayload.binding, 'persisted work binding');
    const identity = {
      repository_id: requireString(workBinding.repository_id, 'work repository id'),
      project_ids: requireStringArray(workBinding.project_ids, 'work project ids'),
      integrations_digest: requireString(workBinding.integrations_digest, 'work integrations digest'),
      work_id: requireString(workBinding.lifecycle_work_id, 'work identity id'),
    };
    const fixtureWork = sessionHost.readHostStateSnapshot(identity).work;
    if (!fixtureWork || fixtureWork.workspace_id !== workspaceId)
      throw new Error('current Host snapshot did not contain the expected work');
    const publicFixture = {
      args,
      publicRun: (publicArgs: string[]) => {
        const result = parseInvocation(invoke('run.ts', publicArgs));
        expect(result.status, result.stderr).toBe(0);
        return result.payload;
      },
      sync: () => sessionLedger.resume('writer-work', 1),
      repositoryRoot: root,
      workId: 'writer-work',
      attempt: 1,
      work: fixtureWork,
    };
    await runTaskSynthesisPublicActions(publicFixture);
    const prewriter = await runSourcePrewriterPublicActions(publicFixture);
    const priorRows = rows();
    const priorLedger = rowValue(priorRows, 'ledger');
    const priorWork = rowValue(priorRows, 'work');
    const priorSessionJournal = sessionLedger.resume('writer-work', 1);
    if (!priorSessionJournal) throw new Error('prewriter session journal is unavailable');
    expect(priorSessionJournal).toEqual(prewriter);
    const version = requireRecord(prewriter.version, 'prewriter state version');
    const revision = version.revision;
    const digest = requireString(version.digest, 'state version digest');
    if (typeof revision !== 'number') throw new Error('state version revision must be a number');
    const stale = parseInvocation(
      invoke('run.ts', [
        ...args,
        '--issue-wave',
        'true',
        '--expected-revision',
        String(revision + 1),
        '--expected-digest',
        digest,
      ]),
    );
    expect(stale.status).toBe(1);
    const staleRows = rows();
    expect(rowValue(staleRows, 'ledger')).toEqual(priorLedger);
    expect(rowValue(staleRows, 'work')).toEqual(priorWork);
    expect(sessionLedger.resume('writer-work', 1)).toEqual(priorSessionJournal);
    const issued = parseInvocation(
      invoke('run.ts', [
        ...args,
        '--issue-wave',
        'true',
        '--expected-revision',
        String(revision),
        '--expected-digest',
        digest,
      ]),
    );
    expect(issued.status, issued.stderr).toBe(0);
    const issuedPayload = requireRecord(issued.payload, 'issued result');
    expect(issuedPayload.status).toBe('wave_issued');
    const issuedActions = requireUnknownArray(issuedPayload.issued_actions, 'issued actions');
    const firstIssuedAction = requireRecord(issuedActions[0], 'first issued action');
    expect(firstIssuedAction.host_attempt_id).toBeDefined();
    const issuedRequest = parseSessionBridgeRequest(firstIssuedAction.request);
    const taskWorkflow = config.workflows.task_execution;
    if (!taskWorkflow) throw new Error('configured task workflow is missing');
    const writerStage = taskWorkflow.stages.find((stage) => stage.id === 'develop_task');
    if (!writerStage) throw new Error('configured task writer stage is missing');
    const configuredWriterIndex = writerStage.assignments.findIndex(
      (assignment) => assignment.role === 'developer-orchestrator' && assignment.profile === 'executor',
    );
    expect(writerStage.kind).toBe('develop');
    expect(configuredWriterIndex).toBeGreaterThanOrEqual(0);
    const configuredWriter = writerStage.assignments[configuredWriterIndex];
    if (!configuredWriter) throw new Error('configured task writer assignment is missing');
    expect(issuedRequest.workflow_id).toBe('task_execution');
    expect(issuedRequest.stage_id).toBe(writerStage.id);
    expect(issuedRequest.assignment_index).toBe(configuredWriterIndex);
    expect(issuedRequest.role).toBe(configuredWriter.role);
    const packet = firstIssuedAction.development_packet;
    expect(packet).toBeDefined();
    const developmentPacket = requireRecord(packet, 'development packet');
    const workItem = requireRecord(developmentPacket.work_item, 'development packet work item');
    expect(developmentPacket.workflow_id).toBe('task_execution');
    expect(workItem.kind).toBe('task');
    expect(workItem.intent).toBe('task_execution');
    expect(workItem.risk_flags).toEqual(['concurrency']);
    expect(workItem.labels).toEqual(['audit-sensitive']);
    expect(requireStringArray(developmentPacket.implementation_constraints, 'implementation constraints')).toContain(
      'Modify only admitted implementation paths: src/task.ts',
    );
    expect(firstIssuedAction.implementation_result).toBeUndefined();
    const finalRows = rows();
    const ledger = readLedger(rowValue(finalRows, 'ledger'));
    const work = readWork(rowValue(finalRows, 'work'));
    const finalActiveClaim = ledger.claims.find((claim) => claim.status === 'active');
    expect(finalActiveClaim).toBeDefined();
    expect(finalActiveClaim?.resources).toEqual(['execution:writer-work', 'file:src/task.ts']);
    expect(ledger.tickets[0]?.status).toBe('released');
    const firstAttempt = work.execution.assignment_attempts[0];
    expect(firstAttempt?.status).toBe('started');
    expect(firstAttempt?.lease.ticket_id).toBe(work.lease.ticket_id);
    expect(readFileSync(path.join(root, 'src', 'task.ts'), 'utf8')).toBe('export const task = true;\n');
    fixtureComplete = true;
  } finally {
    closeSessionDatabase?.();
    if (fixtureComplete) rmSync(root, { recursive: true, force: true });
    else console.error(`Retained incomplete audit writer fixture: ${root}`);
  }
}, 120_000);
