import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID, createHash } from 'node:crypto';
import { createAutomaticWorkAdmissionFixture } from './automatic-work-admission-fixture.js';
import { fixtureInitializationTemplates } from './runtime-initialization-fixture.js';
import { runSourcePrewriterPublicActions } from './public-prewriter-fixture.js';
import { runWithInitialSourceTiming } from './initial-source-run-timing-diagnostic.js';
import { admitLocalSessionWork, acquireLocalSourceWriterLease } from '../../src/orchestration/local-work-admission.js';
import { runtimeConfigDigest } from '../../src/config/runtime-config.js';
import { snapshotDeclaredSources } from '../../src/orchestration/scoped-source-snapshot.js';
import { requireSafeRepositoryAccess } from '../../src/config/safe-repository-access.js';
import { HostStateStore, type HostStateSnapshot, type WorkIdentity, type WorkState } from '../../src/host-state.js';
import { executeDocumentationClearOperation } from '../../src/documentation/clear.js';
import { MastraSessionBridge } from '../../src/orchestration/mastra-session-bridge.js';
import {
  MastraSessionLedger,
  type MastraSessionLedgerSnapshot,
  type MastraSessionLedgerState,
} from '../../src/orchestration/persistent-session-handoff.js';
import { canonicalJsonDigest } from '../../src/contracts/public-ingress.js';
import { run } from '../../bin/run.ts';
import type { RuntimeInitializationReceipt } from '../../src/config/initialization-record.js';
import type { SessionBridgeObservation } from '../../src/orchestration/mastra-session-bridge-contract.js';
import type { AgentRuntimeConfig } from '../../src/config/runtime-config.js';

const bundle = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(label + ' is malformed');
  return value as Record<string, unknown>;
}

function requireSnapshot(value: MastraSessionLedgerSnapshot | null): MastraSessionLedgerSnapshot {
  if (!value) throw new Error('Failed-final fixture journal is unavailable');
  return value;
}

function requireWork(snapshot: HostStateSnapshot): WorkState {
  if (!snapshot.work) throw new Error('Failed-final fixture Work is unavailable');
  return snapshot.work;
}

export interface FailedFinalCorrectionFixture {
  readonly root: string;
  readonly config: AgentRuntimeConfig;
  readonly store: HostStateStore;
  readonly identity: WorkIdentity;
  readonly journal: MastraSessionLedgerSnapshot;
  readonly plannedHost: HostStateSnapshot | null;
  readonly preparationPath: string;
  close(completed: boolean): void;
}

/** Write current, work-bound documentation and lifecycle inputs for a terminal failed-work correction. */
export async function writeFailedFinalPreparationInputs(input: {
  readonly root: string;
  readonly work: WorkState;
  readonly attempt: number;
  readonly policyId?: string;
}): Promise<{ readonly preparationPath: string; readonly clearPath: string }> {
  const { root, work, attempt, policyId = 'failed-final-correction-fixture' } = input,
    id = work.binding.lifecycle_work_id,
    projectId = work.binding.project_ids[0],
    policyPath = 'docs/agent-instructions/documentation-policy.v1.json';
  if (!projectId) throw new Error('Failed-final fixture has no bound project');
  writeFileSync(
    path.join(root, policyPath),
    JSON.stringify({
      schema: 'DocumentationPolicy/v1',
      policy_id: policyId,
      project_id: projectId,
      source_path: policyPath,
      owner: 'fixture',
      required: false,
      canonical_roots: ['docs'],
      map_paths: ['AGENT.sidecar.md'],
      excluded_roots: [],
      changelog_required: false,
      changelog_path: null,
      relations: ['documents'],
      updated_at: new Date().toISOString(),
    }),
  );
  const doc = {
    repository_root: root,
    repository_id: work.binding.repository_id,
    project_id: projectId,
    work_id: id,
    source_revision: work.binding.work_source_revision,
    scope_paths: [...work.lifecycle.scope.allowed_paths],
  };
  await executeDocumentationClearOperation(doc, 'baseline');
  const clear = await executeDocumentationClearOperation(doc, 'closeout');
  const mechanics: Record<string, string[]> = {
    source_plan: ['scope_acceptance_trace', 'verification_rollback'],
    platform_knowledge: ['platform_contracts', 'official_reference_lookup'],
    implementation_policy: ['root_cause_owner', 'affected_callers', 'existing_primitives'],
    change_impact_pre: ['affected_paths', 'invalidation', 'rollback'],
    documentation_validation: ['current_inventory', 'current_clear'],
  };
  const prerequisites = Object.entries(mechanics).map(([kind, labels]) => {
    const recordPath = `.agent/work/${id}/${kind}.json`;
    writeFileSync(
      path.join(root, recordPath),
      JSON.stringify({
        schema: 'LifecyclePreparationObservation/v1',
        record_id: kind,
        kind,
        work_id: id,
        attempt,
        source_revision: work.binding.work_source_revision,
        scope_id: work.binding.scope_id,
        config_digest: work.binding.config_digest,
        ac_ids: work.binding.ac_ids,
        observed_at: new Date().toISOString(),
        observer_id: 'synthetic-caller-report-fixture',
        status: 'pass',
        evidence_refs: ['local://fixture/current-source'],
        observations: labels.map((mechanic) => ({
          mechanic,
          actual: 'Synthetic typed fixture input; no native planning, research, or documentation observation occurred.',
          evidence_ref: 'local://fixture/current-source',
        })),
        gaps: [],
      }),
    );
    return { kind, path: recordPath };
  });
  const preparationPath = `.agent/work/${id}/preparation.json`;
  writeFileSync(
    path.join(root, preparationPath),
    JSON.stringify({
      schema: 'FinalAssurancePreparation/v1',
      work_id: id,
      attempt,
      prerequisites,
      documentation_precheck_path: clear.path,
      clear_path: clear.path,
      delivery_manifest_path: `.agent/work/${id}/delivery.json`,
    }),
  );
  return { preparationPath, clearPath: clear.path };
}

/** Persist the configured two-validator outcome through the caller's existing Journal report boundary. */
export async function reportFailedFinalValidatorWave(input: {
  readonly journal: MastraSessionLedgerSnapshot;
  readonly outcome?: 'failed' | 'passing';
  readonly evidenceRef?: string;
  readonly report: (
    item: MastraSessionLedgerState['items'][number],
    summary: string,
    status: 'reported_failed' | 'reported_complete',
  ) => Promise<MastraSessionLedgerSnapshot>;
}): Promise<MastraSessionLedgerSnapshot> {
  let journal = input.journal;
  if (
    journal.state.items.length !== 2 ||
    journal.state.items.some((item) => item.request.stage_id !== 'validate_focused')
  )
    throw new Error('Expected the configured two-validator final assurance wave');
  for (const item of [...journal.state.items]) {
    const passing = input.outcome === 'passing';
    const evidenceRef =
      input.evidenceRef ??
      `local://fixture/${passing ? 'synthetic-validator-caller-report' : 'failed-final-validator'}`;
    const summary = JSON.stringify({
      schema: 'VidaValidatorVerdict/v1',
      verdict: passing ? 'pass' : 'fail',
      findings: passing ? [] : ['Synthetic fixture correctness finding'],
      evidence_refs: [evidenceRef],
    });
    journal = await input.report(item, summary, passing ? 'reported_complete' : 'reported_failed');
  }
  return journal;
}

/** Build a real failed final-validation state through admission, Host CAS and persisted Journal report APIs. */
export async function createFailedFinalCorrectionFixture(
  outcome: 'failed' | 'passing' = 'failed',
): Promise<FailedFinalCorrectionFixture> {
  const fixture = createAutomaticWorkAdmissionFixture(true, true);
  let bridge: MastraSessionBridge | undefined;
  let fixtureClosed = false;
  const close = (completed: boolean) => {
    if (fixtureClosed) return;
    fixture.close({ retainRoot: !completed });
    fixtureClosed = true;
  };
  try {
    const id = 'final-assurance-failed-' + randomUUID(),
      input = fixture.prepare(id, 'user:failed-final-correction');
    input.selection = { ...input.selection, kind: 'task', intent: 'task_execution' };
    input.workItem = { ...input.workItem, canonical_kind: 'task', intent: 'task_execution', provider_type: 'Task' };
    input.sourceAuthorizationPath = `.agent/work/${id}/authorization.json`;
    writeFileSync(
      path.join(fixture.root, input.sourceAuthorizationPath),
      JSON.stringify({
        schema: 'LocalSourceWriteAuthorization/v1',
        action: 'source.write',
        user_instruction_ref: 'fixture:actual-owner-directive',
        work_id: id,
        attempt: 1,
        scope_digest: input.context.scope_digest,
        config_digest: runtimeConfigDigest(fixture.config),
        workflow_id: 'task_execution',
        stage_ids: ['develop_task'],
        implementation_paths: ['AGENT.sidecar.md'],
        native_session_handle: 'session',
      }),
    );
    input.intakePath = `.agent/work/${id}/raw-intake.json`;
    writeFileSync(
      path.join(fixture.root, input.intakePath),
      JSON.stringify({
        schema: 'VidaLocalSessionIntake/v1',
        work_item: input.workItem,
        native_session_handle: input.nativeSessionHandle,
        scope_path: input.scopePath,
        acceptance_path: input.acceptancePath,
        source_authorization_path: input.sourceAuthorizationPath,
        runtime_code_paths: input.runtimeCodePaths,
        route: input.route,
        risk: input.risk,
        change_kind: input.changeKind,
      }),
    );
    const admitted = admitLocalSessionWork(input),
      work = requireWork(admitted.host),
      identity: WorkIdentity = {
        repository_id: work.binding.repository_id,
        project_ids: work.binding.project_ids,
        integrations_digest: work.binding.integrations_digest,
        work_id: id,
      };
    if (!admitted.host.workVersion || !admitted.host.ledgerVersion)
      throw new Error('Admitted fixture has no persisted Work and Ledger versions');
    const initialization = {
      schema: 'RuntimeInitialization/v1',
      version: 1,
      repository_id: fixture.config.repository.repository_id,
      project_ids: ['sample'],
      integrations_digest: canonicalJsonDigest(fixture.config.integrations),
      workspace_id: fixture.store.workspaceId,
      workspace_binding_status: 'pending',
      bundle: fixture.config.runtime.bundle,
      config_digest: runtimeConfigDigest(fixture.config),
      schema_sha256: createHash('sha256')
        .update(readFileSync(path.join(bundle, 'schemas/runtime-initialization.v1.schema.json')))
        .digest('hex'),
      templates: fixtureInitializationTemplates(fixture.root, bundle),
      created_at: new Date().toISOString(),
    } satisfies RuntimeInitializationReceipt;
    writeFileSync(path.join(fixture.root, '.agent/runtime-initialization.v1.json'), JSON.stringify(initialization));
    acquireLocalSourceWriterLease({
      repositoryRoot: fixture.root,
      config: fixture.config,
      store: fixture.store,
      identity,
      nativeSessionHandle: 'session',
      stageId: 'develop_task',
      assignmentIndex: 0,
      expectedWork: admitted.host.workVersion,
      expectedLedger: admitted.host.ledgerVersion,
    });
    const args = [
      '--project-root',
      fixture.root,
      '--repository',
      fixture.config.repository.repository_id,
      '--project',
      'sample',
      '--work-path',
      'AGENT.sidecar.md',
      '--work-id',
      id,
      '--attempt',
      '1',
      '--scope-digest',
      work.binding.work_source_revision,
      '--team',
      'default-development',
      '--kind',
      'task',
      '--intent',
      'task_execution',
      '--workflow',
      'task_execution',
    ];
    const source = snapshotDeclaredSources(
        requireSafeRepositoryAccess(fixture.root),
        work.lifecycle.scope.allowed_paths,
      ),
      host = new HostStateStore(
        fixture.database,
        fixture.store.workspaceId,
        undefined,
        undefined,
        undefined,
        undefined,
        fixture.root,
      ),
      ledger = new MastraSessionLedger(fixture.database, fixture.store.workspaceId, fixture.config, fixture.root, host),
      sync = () => requireSnapshot(ledger.resume(id, 1)),
      publicRun = async (runArgs: string[]) => {
        const canonicalArgs = runArgs.map((argument, index) =>
          runArgs[index - 1] === '--report' ? path.resolve(fixture.root, argument) : argument,
        );
        const result: unknown = await runWithInitialSourceTiming(runArgs, () => run(canonicalArgs));
        const record = requireRecord(result, 'In-process configured run result');
        if (record.status === 'blocked') throw new Error('Configured fixture run was blocked');
        return result;
      };
    bridge = await MastraSessionBridge.open({
      ledger,
      projectIds: [input.selection.project],
      repositoryRoot: fixture.root,
      config: fixture.config,
      selection: input.selection,
      context: input.context,
      workflowId: 'task_execution',
      workspaceId: fixture.store.workspaceId,
    });
    await bridge.start(source);
    let journal = sync();
    journal = requireSnapshot(ledger.issueWave(id, 1, journal.version));
    const suspendedStepId = journal.state.step_id;
    if (suspendedStepId === null) throw new Error('Initial fixture workflow has no suspended synthesis step');
    const suspendedObservations: SessionBridgeObservation[] = [];
    for (const item of journal.state.items) {
      if (!item.issue_id) throw new Error('Initial fixture synthesis issue ID is absent');
      const summary = 'Accepted isolated task synthesis prerequisite';
      const observation: SessionBridgeObservation = {
        schema: 'VidaSessionObservation/v1',
        action_id: item.request.action_id,
        issue_id: item.issue_id,
        agent_id: 'fixture:' + item.request.role,
        tool_call_ref: 'fixture:failed-final-synthesis-' + item.request.action_id,
        status: 'reported_complete',
        summary,
        output_digest: canonicalJsonDigest(summary),
        evidence_refs: [],
      };
      journal = requireSnapshot(ledger.report(id, 1, journal.version, observation, source));
      suspendedObservations.push(observation);
    }
    await bridge.resume(suspendedStepId, suspendedObservations, source);
    journal = await runSourcePrewriterPublicActions({
      args,
      publicRun,
      sync,
      repositoryRoot: fixture.root,
      workId: id,
      attempt: 1,
      work,
    });
    const plannedHost = outcome === 'failed' ? host.readHostStateSnapshot(identity) : null;

    const issuedWriter = requireRecord(
      await publicRun([
        ...args,
        '--issue-wave',
        'true',
        '--expected-revision',
        String(journal.version.revision),
        '--expected-digest',
        journal.version.digest,
      ]),
      'Issued writer result',
    );
    const issuedActions = issuedWriter.issued_actions;
    if (!Array.isArray(issuedActions) || issuedActions.length !== 1)
      throw new Error('Expected one configured writer issue');
    journal = sync();
    const writer = journal.state.items[0];
    if (!writer?.host_reservation || !writer.issue_id)
      throw new Error('Writer issue has no persisted Host reservation');
    const attemptId = writer.host_reservation.receipt.attempt.attempt_id;
    if (outcome === 'passing') {
      const sourcePath = path.join(fixture.root, 'AGENT.sidecar.md');
      writeFileSync(
        sourcePath,
        Buffer.concat([readFileSync(sourcePath), Buffer.from('\nSynthetic final-assurance fixture implementation.\n')]),
      );
    }
    const writerSummary =
      outcome === 'passing'
        ? 'The admitted fixture writer updated its owned AGENT.sidecar.md.'
        : 'The admitted writer completed with no Source byte changes.';
    const writerObservation: SessionBridgeObservation = {
      schema: 'VidaSessionObservation/v1',
      action_id: writer.request.action_id,
      issue_id: writer.issue_id,
      agent_id: 'fixture:failed-final-writer',
      tool_call_ref: 'fixture:failed-final-writer-' + writer.issue_id,
      status: 'reported_complete',
      summary: writerSummary,
      output_digest: canonicalJsonDigest(writerSummary),
      evidence_refs: ['local://fixture/failed-final-writer'],
      host_attempt_id: attemptId,
      changed_paths: outcome === 'passing' ? ['AGENT.sidecar.md'] : [],
    };
    const writerReport = `.agent/work/${id}/failed-final-writer.json`;
    writeFileSync(path.join(fixture.root, writerReport), JSON.stringify(writerObservation));
    await publicRun([
      ...args,
      '--report',
      writerReport,
      '--expected-revision',
      String(journal.version.revision),
      '--expected-digest',
      journal.version.digest,
    ]);
    journal = sync();
    journal = requireSnapshot(ledger.issueWave(id, 1, journal.version));
    const reportFocused = async (
      item: MastraSessionLedgerState['items'][number],
      summary: string,
      status: 'reported_failed' | 'reported_complete',
      evidenceRef: string,
      actor: string,
    ) => {
      if (!item.issue_id) throw new Error('Focused fixture issue ID is absent');
      const observation: SessionBridgeObservation = {
        schema: 'VidaSessionObservation/v1',
        action_id: item.request.action_id,
        issue_id: item.issue_id,
        agent_id: actor,
        tool_call_ref: `${actor}-${item.issue_id}`,
        status,
        summary,
        output_digest: canonicalJsonDigest(summary),
        evidence_refs: [evidenceRef],
      };
      const reportPath = `.agent/work/${id}/focused-${item.request.action_id}.json`;
      writeFileSync(path.join(fixture.root, reportPath), JSON.stringify(observation));
      await publicRun([
        ...args,
        '--report',
        reportPath,
        '--expected-revision',
        String(journal.version.revision),
        '--expected-digest',
        journal.version.digest,
      ]);
      journal = sync();
      return journal;
    };
    journal = await reportFailedFinalValidatorWave({
      journal,
      outcome,
      report: (item, summary, status) =>
        reportFocused(
          item,
          summary,
          status,
          outcome === 'passing'
            ? 'local://fixture/synthetic-validator-caller-report'
            : 'local://fixture/failed-final-validator',
          `fixture:${outcome}-final-validator-${item.request.assignment_index}`,
        ),
    });
    if (outcome === 'passing') {
      journal = requireSnapshot(ledger.issueWave(id, 1, journal.version));
      if (journal.state.items.length !== 1 || journal.state.items[0]?.request.stage_id !== 'test_task')
        throw new Error('Expected the configured single tester wave after validator completion');
      const tester = journal.state.items[0];
      const evidenceRef = 'local://fixture/synthetic-tester-caller-report';
      const summary = JSON.stringify({
        schema: 'VidaTesterVerdict/v1',
        status: 'pass',
        evidence_refs: [evidenceRef],
      });
      await reportFocused(tester, summary, 'reported_complete', evidenceRef, 'fixture:synthetic-tester-caller-report');
      journal = requireSnapshot(ledger.issueWave(id, 1, journal.version));
      if (journal.state.items.length !== 1 || journal.state.items[0]?.request.stage_id !== 'prepare_delivery')
        throw new Error('Expected the configured single delivery proposal wave after tester completion');
      const delivery = journal.state.items[0],
        deliveryEvidence = 'local://fixture/synthetic-delivery-proposal';
      await reportFocused(
        delivery,
        JSON.stringify({
          schema: 'VidaDeliveryProposal/v1',
          created: [],
          modified: ['AGENT.sidecar.md'],
          deploy: ['AGENT.sidecar.md'],
          do_not_deploy: [],
          destination: 'isolated-fixture',
          order: ['AGENT.sidecar.md'],
          post_deployment_checks: ['Synthetic caller proposal only; no deployment or Runtime acceptance.'],
          evidence_refs: [deliveryEvidence],
        }),
        'reported_complete',
        deliveryEvidence,
        'fixture:synthetic-delivery-proposal',
      );
    }
    await bridge.close();
    bridge = undefined;

    const { preparationPath } = await writeFailedFinalPreparationInputs({ root: fixture.root, work, attempt: 1 });
    return {
      root: fixture.root,
      config: fixture.config,
      store: host,
      identity,
      journal,
      plannedHost,
      preparationPath,
      close,
    };
  } catch (error) {
    const cleanupErrors: unknown[] = [];
    try {
      await bridge?.close();
    } catch (failure) {
      cleanupErrors.push(failure);
    }
    try {
      close(false);
    } catch (failure) {
      cleanupErrors.push(failure);
    }
    if (cleanupErrors.length)
      throw new AggregateError([error, ...cleanupErrors], 'Failed-final fixture setup and cleanup failed');
    throw error;
  }
}
