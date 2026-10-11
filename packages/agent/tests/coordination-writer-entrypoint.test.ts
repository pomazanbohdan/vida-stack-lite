import { expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import type { SpawnSyncReturns } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { loadRuntimeConfig, runtimeConfigDigest } from '../src/config/runtime-config.ts';
import { canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import type { CoordinationLedger } from '../src/contracts/envelopes.ts';
import { validateCoordinationLedgerV1 } from '../src/contracts/envelopes.ts';
import type { StateVersion, WorkState } from '../src/host-state.ts';
import type { LifecycleArtifactReference } from '../src/lifecycle/lifecycle-state.ts';
import { lifecyclePreparationObservationSchema } from '../src/orchestration/final-assurance.ts';
import { snapshotDeclaredSources } from '../src/orchestration/scoped-source-snapshot.ts';
import { workflowWorkItemSchema } from '../src/orchestration/workflow-session-reservation-contract.ts';
import { runtimeExecutableInventory } from '../tooling/maintained-source-inventory.ts';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

interface RunAction {
  readonly issue_id: string;
  readonly request: {
    readonly action_id: string;
    readonly stage_id: string;
    readonly role: string;
  };
  readonly host_attempt_id?: string;
}

interface RunPayload {
  readonly schema: 'VidaAgentRunResult/v1';
  readonly status: string;
  readonly code?: string;
  readonly state_version?: StateVersion;
  readonly issued_actions?: readonly RunAction[];
}

interface ProcessResult extends SpawnSyncReturns<string> {
  readonly stdout: string;
  readonly stderr: string;
}

interface ParsedProcessResult {
  readonly status: number | null;
  readonly signal: NodeJS.Signals | null;
  readonly error: Error | undefined;
  readonly stdout: string;
  readonly stderr: string;
  readonly payload: RunPayload;
}

interface PersistedRow {
  readonly kind: string;
  readonly value: unknown;
}

type AssignmentEvidence = Pick<WorkState['execution']['assignment_attempts'][number], 'status' | 'lease'>;
interface WorkRowEvidence {
  readonly lifecycle: {
    readonly phase: string;
    readonly references: readonly Pick<
      LifecycleArtifactReference,
      'kind' | 'disposition' | 'source_revision' | 'path'
    >[];
  };
  readonly execution: { readonly assignment_attempts: readonly AssignmentEvidence[] };
  readonly lease: WorkState['lease'];
}
type WriterPreparationKind = Extract<
  ReturnType<typeof lifecyclePreparationObservationSchema.parse>['kind'],
  'source_plan' | 'implementation_policy'
>;

const lifecycleArtifactKinds = new Set<string>([
  'source_plan',
  'acceptance_manifest',
  'implementation_scope',
  'scope_snapshot',
  'execution_approval',
  'platform_knowledge',
  'implementation_policy',
  'change_impact_pre',
  'change_impact_post',
  'documentation_validation',
  'documentation_clear',
  'implementation_result',
  'validation_receipt',
  'test_receipt',
  'review_packet',
  'review_receipt',
  'reverse_validation',
  'dispatch_reservation',
  'dispatch_attestation',
  'architect_decision',
  'delivery_manifest',
  'delivery_receipt',
  'runtime_receipt',
  'user_testing_receipt',
  'feedback',
  'feedback_consumption',
  'correction_authorization',
  'decision',
  'recovery',
]);

function isLifecycleArtifactKind(value: unknown): value is LifecycleArtifactReference['kind'] {
  return typeof value === 'string' && lifecycleArtifactKinds.has(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, description: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`${description} must be an object`);
  return value;
}

function serializeJson(value: unknown): string {
  const serialized = JSON.stringify(value);
  if (serialized === undefined) throw new Error('fixture value is not JSON serializable');
  return serialized;
}

function requireStateVersion(value: unknown): StateVersion {
  const record = requireRecord(value, 'state version');
  if (
    typeof record.revision !== 'number' ||
    !Number.isSafeInteger(record.revision) ||
    record.revision < 1 ||
    typeof record.digest !== 'string' ||
    !/^[a-f0-9]{64}$/u.test(record.digest)
  )
    throw new Error('state version is invalid');
  return { revision: record.revision, digest: record.digest };
}

function parseRunPayload(value: unknown): RunPayload {
  const record = requireRecord(value, 'run result');
  if (record.schema !== 'VidaAgentRunResult/v1' || typeof record.status !== 'string')
    throw new Error('run result identity is invalid');
  const code = record.code;
  if (code !== undefined && typeof code !== 'string') throw new Error('run result code is invalid');
  const stateVersion = record.state_version === undefined ? undefined : requireStateVersion(record.state_version);
  const actions = record.issued_actions;
  if (actions !== undefined && !Array.isArray(actions)) throw new Error('issued actions are invalid');
  const issuedActions = actions?.map((candidate: unknown): RunAction => {
    const action = requireRecord(candidate, 'issued action');
    const request = requireRecord(action.request, 'issued action request');
    if (
      typeof action.issue_id !== 'string' ||
      typeof request.action_id !== 'string' ||
      typeof request.stage_id !== 'string' ||
      typeof request.role !== 'string' ||
      (action.host_attempt_id !== undefined && typeof action.host_attempt_id !== 'string')
    )
      throw new Error('issued action fields are invalid');
    return {
      issue_id: action.issue_id,
      request: { action_id: request.action_id, stage_id: request.stage_id, role: request.role },
      ...(action.host_attempt_id === undefined ? {} : { host_attempt_id: action.host_attempt_id }),
    };
  });
  return {
    schema: 'VidaAgentRunResult/v1',
    status: record.status,
    ...(code === undefined ? {} : { code }),
    ...(stateVersion === undefined ? {} : { state_version: stateVersion }),
    ...(issuedActions === undefined ? {} : { issued_actions: issuedActions }),
  };
}

function parseCoordinationLedger(value: unknown): CoordinationLedger {
  const result = validateCoordinationLedgerV1(value);
  if (!result.ok) throw new Error('persisted coordination ledger is invalid');
  return result.ledger;
}

function parseWorkRowEvidence(value: unknown): WorkRowEvidence {
  const work = requireRecord(value, 'persisted work');
  const lifecycle = requireRecord(work.lifecycle, 'work lifecycle');
  const execution = requireRecord(work.execution, 'work execution');
  if (
    typeof lifecycle.phase !== 'string' ||
    !Array.isArray(lifecycle.references) ||
    !Array.isArray(execution.assignment_attempts)
  )
    throw new Error('persisted work lifecycle or execution is invalid');
  const references = lifecycle.references.map(
    (candidate: unknown): WorkRowEvidence['lifecycle']['references'][number] => {
      const reference = requireRecord(candidate, 'lifecycle reference');
      if (
        !isLifecycleArtifactKind(reference.kind) ||
        (reference.disposition !== 'current' &&
          reference.disposition !== 'consumed' &&
          reference.disposition !== 'retired') ||
        typeof reference.source_revision !== 'string' ||
        typeof reference.path !== 'string'
      )
        throw new Error('persisted lifecycle reference is invalid');
      return {
        kind: reference.kind,
        disposition: reference.disposition,
        source_revision: reference.source_revision,
        path: reference.path,
      };
    },
  );
  const assignmentAttempts = execution.assignment_attempts.map((candidate: unknown): AssignmentEvidence => {
    const attempt = requireRecord(candidate, 'assignment attempt');
    const attemptLease = requireRecord(attempt.lease, 'assignment lease');
    if (
      (attempt.status !== 'started' &&
        attempt.status !== 'completed' &&
        attempt.status !== 'uncertain' &&
        attempt.status !== 'no_effect') ||
      typeof attemptLease.ticket_id !== 'string' ||
      typeof attemptLease.thread_id !== 'string' ||
      typeof attemptLease.generation !== 'number'
    )
      throw new Error('persisted assignment attempt is invalid');
    return {
      status: attempt.status,
      lease: {
        ticket_id: attemptLease.ticket_id,
        thread_id: attemptLease.thread_id,
        generation: attemptLease.generation,
      },
    };
  });
  const lease = work.lease;
  const parsedLease = parseWorkLease(lease);
  return {
    lifecycle: { phase: lifecycle.phase, references },
    execution: { assignment_attempts: assignmentAttempts },
    lease: parsedLease,
  };
}

function parseWorkLease(value: unknown): WorkState['lease'] {
  if (value === null) return null;
  const lease = requireRecord(value, 'persisted work lease');
  const ticketId = lease.ticket_id;
  const threadId = lease.thread_id;
  const generation = lease.generation;
  if (typeof ticketId !== 'string' || typeof threadId !== 'string' || typeof generation !== 'number')
    throw new Error('persisted work lease is invalid');
  return { ticket_id: ticketId, thread_id: threadId, generation };
}

function parsePersistedRows(value: unknown): PersistedRow[] {
  if (!Array.isArray(value)) throw new Error('persisted rows are invalid');
  return value.map((candidate: unknown) => {
    const row = requireRecord(candidate, 'persisted row');
    if (typeof row.kind !== 'string' || typeof row.payload !== 'string')
      throw new Error('persisted row fields are invalid');
    const value: unknown = JSON.parse(row.payload);
    return { kind: row.kind, value };
  });
}

function requiredRow(rows: readonly PersistedRow[], kind: string): unknown {
  const row = rows.find((candidate) => candidate.kind === kind);
  if (!row) throw new Error(`persisted ${kind} row is missing`);
  return row.value;
}

function requiredIssuedAction(payload: RunPayload, index: number): RunAction {
  const action = payload.issued_actions?.[index];
  if (!action) throw new Error(`issued action ${index} is missing`);
  return action;
}

function requiredEntry<T>(entries: readonly T[], index: number, description: string): T {
  const entry = entries[index];
  if (entry === undefined) throw new Error(`${description} ${index} is missing`);
  return entry;
}

function requiredActionForRole(actions: readonly RunAction[], role: string): RunAction {
  const action = actions.find((candidate) => candidate.request.role === role);
  if (!action) throw new Error(`issued action for ${role} is missing`);
  return action;
}

function activeClaim(ledger: CoordinationLedger) {
  const claim = ledger.claims.find((candidate) => candidate.status === 'active');
  if (!claim) throw new Error('active coordination claim is missing');
  return claim;
}

function expectedVersion(version: StateVersion): string[] {
  return ['--expected-revision', String(version.revision), '--expected-digest', version.digest];
}

function processDiagnostics(result: ProcessResult | ParsedProcessResult): string {
  return `status=${String(result.status)} signal=${String(result.signal)} error=${result.error?.message ?? 'none'} stderr=${result.stderr}`;
}

test('public writer issue acquires file ownership after execution-only intake and before native reservation', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-writer-admission-'));
  let nativeInvocationStarted = false;
  let fixtureCompleted = false;
  try {
    const bundle = path.join(root, 'tools', 'agents');
    mkdirSync(bundle, { recursive: true });
    for (const entry of [
      'src',
      'dist',
      'bin',
      'tooling',
      'instructions',
      'templates',
      'package.json',
      'TESTING.md',
      'bun.lock',
      '.bun-version',
    ])
      cpSync(path.join(packageRoot, entry), path.join(bundle, entry), { recursive: true, dereference: false });
    for (const entry of runtimeExecutableInventory(packageRoot).filter((file) => file.startsWith('schemas/'))) {
      const destination = path.join(bundle, entry);
      mkdirSync(path.dirname(destination), { recursive: true });
      cpSync(path.join(packageRoot, entry), destination, { dereference: false });
    }
    symlinkSync(
      path.join(packageRoot, 'node_modules'),
      path.join(bundle, 'node_modules'),
      process.platform === 'win32' ? 'junction' : 'dir',
    );
    const invoke = (entry: string, args: readonly string[], capturePrivateFailureCause = false): ProcessResult => {
      nativeInvocationStarted = true;
      if (capturePrivateFailureCause && process.env.VIDA_WRITER_ENTRY_PRIVATE_CAUSE === '1' && entry === 'run.ts') {
        const moduleUrl = pathToFileURL(path.join(bundle, 'bin', entry)).href;
        const program =
          `const {main,run}=await import(${JSON.stringify(moduleUrl)});\n` +
          `await main({isMain:true,args:${JSON.stringify(args)},io:console,exit:process,execute:async(argv)=>{try{return await run(argv)}catch(error){const detail=error instanceof Error?(error.stack??error.message):String(error);process.stderr.write('TEST_ONLY_PRIVATE_RUN_CAUSE\\n'+detail+'\\n');throw error;}}});`;
        return spawnSync(process.execPath, ['--no-env-file', '--no-install', '--eval', program], {
          cwd: bundle,
          encoding: 'utf8',
          windowsHide: true,
        });
      }
      return spawnSync(process.execPath, [path.join(bundle, 'bin', entry), ...args], {
        cwd: bundle,
        encoding: 'utf8',
        windowsHide: true,
      });
    };
    const initialized = invoke('init.ts', [
      '--project-root',
      root,
      '--repository',
      'writer-repository',
      '--project',
      'writer-project',
    ]);
    if (initialized.status === null || initialized.signal !== null || initialized.error !== undefined)
      throw new Error(
        `initialization process did not reach an observed terminal status: ${processDiagnostics(initialized)}`,
      );
    expect(initialized.status, processDiagnostics(initialized)).toBe(0);
    mkdirSync(path.join(root, 'src'), { recursive: true });
    writeFileSync(path.join(root, 'src', 'task.ts'), 'export const task = true;\n');
    const source = snapshotDeclaredSources(requireSafeRepositoryAccess(root), ['src/task.ts']);
    const config = loadRuntimeConfig(root);
    const workDir = path.join(root, '.agent', 'work', 'writer-work');
    mkdirSync(workDir, { recursive: true });
    const relative = (name: string) => '.agent/work/writer-work/' + name;
    const put = (name: string, value: unknown) => writeFileSync(path.join(workDir, name), serializeJson(value));
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
    const workItem = workflowWorkItemSchema.parse({
      schema: 'WorkItem/v1',
      id: 'writer-work',
      provider: 'local',
      provider_type: 'Task',
      canonical_kind: 'task',
      intent: 'task_execution',
      project_id: 'writer-project',
      title: 'Public writer boundary fixture',
      description: 'Issue the configured writer.',
      labels: [],
      risk_flags: ['high'],
    });
    put('intake.json', {
      schema: 'VidaLocalSessionIntake/v1',
      native_session_handle: 'writer-thread',
      work_item: workItem,
      scope_path: relative('scope.json'),
      acceptance_path: relative('acceptance.json'),
      source_authorization_path: relative('source-authorization.json'),
      runtime_code_paths: ['tools/agents/bin/run.ts'],
      route: 'R3',
      risk: 'high',
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
    const parse = (result: ProcessResult): ParsedProcessResult => {
      if (result.status === null || result.signal !== null || result.error !== undefined)
        throw new Error(`run process did not reach an observed terminal status: ${processDiagnostics(result)}`);
      const output = result.status === 0 ? result.stdout : result.stderr;
      const serialized = output.trim().split(/\r?\n/u).at(-1);
      if (serialized === undefined) throw new Error('run result output is empty');
      const value: unknown = JSON.parse(serialized);
      return {
        status: result.status,
        signal: result.signal,
        error: result.error,
        stdout: result.stdout,
        stderr: result.stderr,
        payload: parseRunPayload(value),
      };
    };
    const prepared = parse(invoke('run.ts', [...args, '--intake', path.join(workDir, 'intake.json')], true));
    expect(prepared.status, processDiagnostics(prepared)).toBe(0);
    const dbPath = path.join(root, '.agent', 'work', 'session-handoff.v1.sqlite');
    const rows = () => {
      const db = new Database(dbPath, { readonly: true });
      try {
        return parsePersistedRows(db.query('SELECT kind,payload FROM agent_host_state').all());
      } finally {
        db.close();
      }
    };
    const priorLedger = parseCoordinationLedger(requiredRow(rows(), 'ledger'));
    expect(activeClaim(priorLedger).resources).toEqual(['execution:writer-work']);
    const call = (extra: readonly string[]) => parse(invoke('run.ts', [...args, ...extra]));
    const synthesisIssue = call([
      '--issue-wave',
      'true',
      ...expectedVersion(requireStateVersion(prepared.payload.state_version)),
    ]);
    expect(synthesisIssue.status, processDiagnostics(synthesisIssue)).toBe(0);
    const synthesis = requiredIssuedAction(synthesisIssue.payload, 0);
    expect(synthesis.request.stage_id).toBe('synthesize_task');
    const synthesisSummary = 'The accepted task and scope are ready for current Source planning.';
    const synthesisReportPath = path.join(workDir, 'synthesis-report.json');
    writeFileSync(
      synthesisReportPath,
      serializeJson({
        schema: 'VidaSessionObservation/v1',
        action_id: synthesis.request.action_id,
        issue_id: synthesis.issue_id,
        agent_id: 'fixture:research-synthesizer',
        tool_call_ref: 'fixture:task-synthesis',
        status: 'reported_complete',
        summary: synthesisSummary,
        output_digest: canonicalJsonDigest(synthesisSummary),
        evidence_refs: [],
      }),
    );
    const synthesisReport = call([
      ...expectedVersion(requireStateVersion(synthesisIssue.payload.state_version)),
      '--report',
      synthesisReportPath,
    ]);
    expect(synthesisReport.status, processDiagnostics(synthesisReport)).toBe(0);

    const prewriterIssue = call([
      '--issue-wave',
      'true',
      ...expectedVersion(requireStateVersion(synthesisReport.payload.state_version)),
    ]);
    expect(prewriterIssue.status, processDiagnostics(prewriterIssue)).toBe(0);
    const prewriterActions = prewriterIssue.payload.issued_actions;
    if (!prewriterActions) throw new Error('prewriter actions are missing');
    expect(prewriterActions.map((item) => item.request.role).sort()).toEqual(['security-prewriter', 'source-planner']);
    const preparationRecord = (item: RunAction, kind: WriterPreparationKind) => {
        const evidence = kind === 'source_plan' ? 'source-plan.md' : 'security-review.md';
        return lifecyclePreparationObservationSchema.parse({
          schema: 'LifecyclePreparationObservation/v1',
          record_id: 'writer-' + kind + '-' + item.request.action_id,
          kind,
          work_id: 'writer-work',
          attempt: 1,
          source_revision: source.digest,
          scope_id: 'writer-scope',
          config_digest: runtimeConfigDigest(config),
          ac_ids: ['AC-WRITER-1'],
          observed_at: new Date().toISOString(),
          observer_id: 'fixture:' + item.request.role,
          status: 'pass',
          evidence_refs: [evidence],
          observations:
            kind === 'source_plan'
              ? [
                  {
                    mechanic: 'scope_acceptance_trace',
                    actual: 'The current file scope and AC-WRITER-1 trace to the accepted contract.',
                    evidence_ref: evidence,
                  },
                  {
                    mechanic: 'verification_rollback',
                    actual: 'The focused check and source restoration path are identified.',
                    evidence_ref: evidence,
                  },
                ]
              : [
                  {
                    mechanic: 'root_cause_owner',
                    actual: 'The source owner and cause are identified.',
                    evidence_ref: evidence,
                  },
                  {
                    mechanic: 'affected_callers',
                    actual: 'The affected writer entrypoint is identified.',
                    evidence_ref: evidence,
                  },
                  {
                    mechanic: 'existing_primitives',
                    actual: 'The current Host and filesystem coordination primitives are retained.',
                    evidence_ref: evidence,
                  },
                  {
                    mechanic: 'prewriter_security_gate',
                    actual: 'The exact scoped write and its pre-effect gates are preserved.',
                    evidence_ref: evidence,
                  },
                ],
          gaps: [],
        });
      },
      reportPreparation = (item: RunAction, kind: WriterPreparationKind, version: StateVersion) => {
        const record = preparationRecord(item, kind),
          summary = serializeJson(record),
          reportPath = path.join(workDir, kind + '-report.json');
        writeFileSync(
          reportPath,
          serializeJson({
            schema: 'VidaSessionObservation/v1',
            action_id: item.request.action_id,
            issue_id: item.issue_id,
            agent_id: record.observer_id,
            tool_call_ref: 'fixture:' + kind,
            status: 'reported_complete',
            summary,
            output_digest: canonicalJsonDigest(summary),
            evidence_refs: record.evidence_refs,
          }),
        );
        return call([...expectedVersion(version), '--report', reportPath]);
      },
      planAction = requiredActionForRole(prewriterActions, 'source-planner'),
      securityAction = requiredActionForRole(prewriterActions, 'security-prewriter'),
      planReport = reportPreparation(
        planAction,
        'source_plan',
        requireStateVersion(prewriterIssue.payload.state_version),
      );
    expect(planReport.status, processDiagnostics(planReport)).toBe(0);
    const planRows = rows();
    const plannedWork = parseWorkRowEvidence(requiredRow(planRows, 'work'));
    const planLedger = parseCoordinationLedger(requiredRow(planRows, 'ledger'));
    const planReference = plannedWork.lifecycle.references.find((reference) => reference.kind === 'source_plan');
    expect(plannedWork.lifecycle.phase).toBe('PLAN');
    expect(plannedWork.execution.assignment_attempts).toHaveLength(0);
    expect(
      plannedWork.lifecycle.references.filter((reference) => reference.kind === 'implementation_policy'),
    ).toHaveLength(0);
    expect(activeClaim(planLedger).resources).toEqual(['execution:writer-work']);
    if (!planReference) throw new Error('current source plan reference is missing');
    expect(planReference).toMatchObject({
      kind: 'source_plan',
      disposition: 'current',
      source_revision: source.digest,
    });
    expect(JSON.parse(readFileSync(path.join(root, planReference.path), 'utf8'))).toMatchObject({
      kind: 'source_plan',
      status: 'pass',
      observer_id: 'fixture:source-planner',
    });
    const policyReport = reportPreparation(
      securityAction,
      'implementation_policy',
      requireStateVersion(planReport.payload.state_version),
    );
    expect(policyReport.status, processDiagnostics(policyReport)).toBe(0);
    const prewriteRows = rows();
    const prewriteWork = parseWorkRowEvidence(requiredRow(prewriteRows, 'work'));
    const prewriteLedger = parseCoordinationLedger(requiredRow(prewriteRows, 'ledger'));
    expect(
      prewriteWork.lifecycle.references.filter((reference) => reference.kind === 'implementation_policy'),
    ).toHaveLength(1);
    expect(prewriteWork.execution.assignment_attempts).toHaveLength(0);
    expect(activeClaim(prewriteLedger).resources).toEqual(['execution:writer-work']);
    const beforeStaleRows = rows();
    const beforeStaleWork = requiredRow(beforeStaleRows, 'work');
    const beforeStaleLedger = requiredRow(beforeStaleRows, 'ledger');
    const stale = call([
      '--issue-wave',
      'true',
      ...expectedVersion(requireStateVersion(prepared.payload.state_version)),
    ]);
    expect(stale.status).toBe(1);
    expect(stale.payload.code).toBe('GAP-VIDA-RUN-CONTEXT-001');
    const afterStaleRows = rows();
    expect(requiredRow(afterStaleRows, 'work')).toEqual(beforeStaleWork);
    expect(requiredRow(afterStaleRows, 'ledger')).toEqual(beforeStaleLedger);
    const issued = call([
      '--issue-wave',
      'true',
      ...expectedVersion(requireStateVersion(policyReport.payload.state_version)),
    ]);
    expect(issued.status, processDiagnostics(issued)).toBe(0);
    expect(issued.payload.status).toBe('wave_issued');
    const developmentAction = requiredIssuedAction(issued.payload, 0);
    expect(developmentAction.request.stage_id).toBe('develop_task');
    expect(developmentAction.host_attempt_id).toBeDefined();
    const final = rows();
    const ledger = parseCoordinationLedger(requiredRow(final, 'ledger'));
    const work = parseWorkRowEvidence(requiredRow(final, 'work'));
    expect(activeClaim(ledger).resources).toEqual(['execution:writer-work', 'file:src/task.ts']);
    expect(requiredEntry(ledger.tickets, 0, 'coordination ticket').status).toBe('released');
    const startedAttempt = requiredEntry(work.execution.assignment_attempts, 0, 'assignment attempt');
    expect(startedAttempt.status).toBe('started');
    if (!work.lease) throw new Error('persisted work lease is missing');
    expect(startedAttempt.lease.ticket_id).toBe(work.lease.ticket_id);
    expect(readFileSync(path.join(root, 'src', 'task.ts'), 'utf8')).toBe('export const task = true;\n');
    fixtureCompleted = true;
  } finally {
    if (!nativeInvocationStarted || fixtureCompleted) rmSync(root, { recursive: true, force: true });
    else console.error(`retained uncertain public-writer fixture: ${root}`);
  }
}, 120_000);
