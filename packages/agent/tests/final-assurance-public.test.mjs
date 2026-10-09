import { test, expect } from 'bun:test';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { canonicalJson, canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import { loadRuntimeConfig, runtimeConfigDigest } from '../src/config/runtime-config.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { snapshotDeclaredSources } from '../src/orchestration/scoped-source-snapshot.ts';
import { HostStateStore, openHostStateDatabase } from '../src/host-state.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';
import { admitLocalSessionWork, acquireLocalSourceWriterLease } from '../src/orchestration/local-work-admission.ts';
import { executeDocumentationClearOperation } from '../src/documentation/clear.ts';
import { sessionActionsForWave } from '../src/orchestration/session-handoff.ts';
import { compileDevelopmentWorkflow } from '../src/orchestration/workflow-plan.ts';
import { validateLifecycleReferencePreservation } from '../src/lifecycle/lifecycle-state.ts';
const bundle = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function fixture(sourceWriter = false, publicStore = false) {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-absorption-'));
  writeFileSync(
    path.join(root, 'agent-runtime.config.v1.yaml'),
    readFileSync(path.join(bundle, 'templates/agent-runtime.config.template.v1.yaml'), 'utf8')
      .replaceAll('{{REPOSITORY}}', 'absorption-repository')
      .replaceAll('{{PROJECT}}', 'sample')
      .replaceAll('{{BUNDLE}}', 'vida-agent'),
  );
  writeFileSync(path.join(root, 'AGENTS.md'), 'Test fixture policy');
  writeFileSync(path.join(root, 'AGENT.sidecar.md'), 'Test fixture source map');
  mkdirSync(path.join(root, 'docs', 'agent-instructions'), { recursive: true });
  writeFileSync(path.join(root, 'docs', 'agent-instructions', 'documentation-policy.v1.json'), '{}');
  const config = loadRuntimeConfig(root);
  if (publicStore) mkdirSync(path.join(root, config.control.work_root), { recursive: true });
  const database = openHostStateDatabase(
      publicStore
        ? path.join(root, config.control.work_root, 'session-handoff.v1.sqlite')
        : path.join(root, 'fixture.sqlite'),
    ),
    store = new HostStateStore(
      database,
      publicStore ? deriveWorkspaceId(config.repository.repository_id, root) : 'a'.repeat(64),
    ),
    source = snapshotDeclaredSources(requireSafeRepositoryAccess(root), ['AGENT.sidecar.md']);
  database.exec(
    'CREATE TABLE IF NOT EXISTS agent_host_mastra_session_ledger (workspace_id TEXT,work_id TEXT,attempt INTEGER,revision INTEGER,payload TEXT,digest TEXT,PRIMARY KEY(workspace_id,work_id,attempt))',
  );
  const selection = {
    team: 'default-development',
    kind: sourceWriter ? 'feature' : 'research',
    intent: sourceWriter ? 'implementation_change' : 'information_research',
    project: 'sample',
    risk_flags: [],
    labels: [],
  };
  function prepare(id, pointer, thread = 'session') {
    mkdirSync(path.join(root, '.agent', 'work', id), { recursive: true });
    const scope = {
      schema: 'ImplementationScope/v1',
      scope_id: 'scope-' + id,
      work_id: id,
      source_revision: source.digest,
      ac_ids: ['AC-SHARED'],
      allowed_paths: ['AGENT.sidecar.md'],
      implementation_paths: ['AGENT.sidecar.md'],
      documentation_paths: [],
      changed_symbols: [],
      non_goals: ['Source mutation'],
      acceptance_trace: ['AC-SHARED'],
      behavior_trace: ['SR-SHARED'],
      test_trace: ['fixture'],
      diagnostic_trace: ['fixture'],
      attribution: { thread_id: thread, pointer },
      owner: 'fixture',
      created_at: new Date().toISOString(),
    };
    const acceptance = {
      schema: 'AcceptanceManifest/v1',
      id: 'acceptance-' + id,
      version: 1,
      ac_ids: scope.ac_ids,
      source: 'AGENT.sidecar.md',
      scope: scope.scope_id,
      source_revision: source.digest,
      contracts: [{ id: 'AC-SHARED', definition: 'Preserve unfinished scope', sr: 'SR-SHARED', evidence: ['fixture'] }],
    };
    const scopePath = `.agent/work/${id}/scope.json`,
      acceptancePath = `.agent/work/${id}/acceptance.json`;
    writeFileSync(path.join(root, scopePath), JSON.stringify(scope));
    writeFileSync(path.join(root, acceptancePath), JSON.stringify(acceptance));
    return {
      repositoryRoot: root,
      config,
      store,
      selection,
      context: { work_id: id, attempt: 1, scope_digest: source.digest },
      nativeSessionHandle: thread,
      workItem: {
        schema: 'WorkItem/v1',
        id,
        canonical_kind: selection.kind,
        intent: selection.intent,
        project_id: 'sample',
        title: 'Fixture ' + id,
        description: 'Unfinished acceptance',
        risk_flags: [],
        labels: [],
        provider: 'local',
        provider_type: 'Research',
      },
      scopePath,
      acceptancePath,
      runtimeCodePaths: ['vida-agent/bin/run.mjs'],
      route: 'R2',
      risk: 'low',
      changeKind: 'feature',
    };
  }
  return {
    root,
    config,
    database,
    store,
    prepare,
    close() {
      database.close();
      rmSync(root, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    },
  };
}

test('public final assurance commits three synthetic review reverse pairs at a released nonzero maintenance generation', async () => {
  const f = fixture(true, true);
  const invoke = (args) =>
    spawnSync(
      process.execPath,
      [
        '--no-env-file',
        '--no-install',
        '--config=' + path.join(bundle, 'bunfig.toml'),
        path.join(bundle, 'bin/run.mjs'),
        ...args,
      ],
      { cwd: bundle, encoding: 'utf8', windowsHide: true, timeout: 30000 },
    );
  const publicRun = (args) => {
    const result = invoke(args);
    expect(result.error).toBeUndefined();
    expect(result.signal).toBeNull();
    if (result.status !== 0) throw new Error(result.stderr);
    return JSON.parse(result.stdout);
  };
  const denied = (args) => {
    const result = invoke(args);
    expect(result.status).toBe(1);
    expect(result.error).toBeUndefined();
    const lines = result.stderr
      .trim()
      .split(/\r?\n/u)
      .filter((line) => line.startsWith('{"schema":"VidaAgentRunResult/v1"'));
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0]).status).toBe('blocked');
  };
  try {
    const maintenancePrincipal = 'fixture:maintenance-host',
      maintenanceStore = new HostStateStore(f.database, f.store.workspaceId, undefined, undefined, undefined, {
        principal: maintenancePrincipal,
        projectIds: ['sample'],
        verify: (fence) => ({
          schema: 'MaintenanceReleaseAuthorization/v1',
          principal: maintenancePrincipal,
          fence_digest: canonicalJsonDigest(fence),
          closure_digest: fence.binding.closure_digest,
          bundle_digest: fence.binding.bundle_digest,
        }),
      }),
      maintenanceReceipt = maintenanceStore.acquireMaintenanceFence({
        schema: 'MaintenanceFenceBinding/v1',
        project_ids: ['sample'],
        operation_id: 'assurance-public-maintenance',
        manifest_digest: '1'.repeat(64),
        request_digest: '2'.repeat(64),
        bindings_digest: '3'.repeat(64),
        closure_digest: '4'.repeat(64),
        bundle_digest: '5'.repeat(64),
      });
    expect(maintenanceReceipt.fence.generation).toBe(1);
    expect((await maintenanceStore.releaseMaintenanceFence(maintenanceReceipt)).status).toBe('released');

    const id = 'assurance-public',
      input = f.prepare(id, 'user:current-correction');
    input.selection.kind = 'task';
    input.selection.intent = 'task_execution';
    input.workItem = { ...input.workItem, canonical_kind: 'task', intent: 'task_execution', provider_type: 'Task' };
    input.sourceAuthorizationPath = `.agent/work/${id}/authorization.json`;
    writeFileSync(
      path.join(f.root, input.sourceAuthorizationPath),
      JSON.stringify({
        schema: 'LocalSourceWriteAuthorization/v1',
        action: 'source.write',
        user_instruction_ref: 'fixture:actual-owner-directive',
        work_id: id,
        attempt: 1,
        scope_digest: input.context.scope_digest,
        config_digest: runtimeConfigDigest(f.config),
        workflow_id: 'task_execution',
        stage_ids: ['develop_task'],
        implementation_paths: ['AGENT.sidecar.md'],
        native_session_handle: 'session',
      }),
    );
    input.intakePath = `.agent/work/${id}/raw-intake.json`;
    writeFileSync(
      path.join(f.root, input.intakePath),
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
    const initial = admitLocalSessionWork(input);
    expect(initial.host.maintenanceGeneration).toBe(1);
    const work = initial.host.work,
      identity = {
        repository_id: work.binding.repository_id,
        project_ids: work.binding.project_ids,
        integrations_digest: work.binding.integrations_digest,
        work_id: id,
      };
    writeFileSync(
      path.join(f.root, '.agent/runtime-initialization.v1.json'),
      JSON.stringify({
        schema: 'RuntimeInitialization/v1',
        version: 1,
        repository_id: f.config.repository.repository_id,
        project_ids: ['sample'],
        integrations_digest: canonicalJsonDigest(f.config.integrations),
        workspace_id: f.store.workspaceId,
        workspace_binding_status: 'pending',
        bundle: f.config.runtime.bundle,
        config_digest: runtimeConfigDigest(f.config),
        schema_sha256: createHash('sha256')
          .update(readFileSync(path.join(bundle, 'schemas/runtime-initialization.v1.schema.json')))
          .digest('hex'),
        templates: [],
        created_at: new Date().toISOString(),
      }),
    );
    const sourceLease = acquireLocalSourceWriterLease({
      repositoryRoot: f.root,
      config: f.config,
      store: f.store,
      identity,
      nativeSessionHandle: 'session',
      stageId: 'develop_task',
      assignmentIndex: 0,
      expectedWork: initial.host.workVersion,
      expectedLedger: initial.host.ledgerVersion,
    });
    const claimed = f.store.claimWorkflowAttempt({
      identity,
      expectedWork: sourceLease.workVersion,
      expectedLedger: sourceLease.ledgerVersion,
      expectedMaintenanceGeneration: sourceLease.maintenanceGeneration,
      stageId: 'develop_task',
      assignmentIndex: 0,
      requestDigest: '1'.repeat(64),
      lease: sourceLease.work.lease,
    });
    const args = [
      '--project-root',
      f.root,
      '--repository',
      f.config.repository.repository_id,
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

    // Synthetic focused history is a fixture precondition, not an observation of native workers.
    const source = snapshotDeclaredSources(requireSafeRepositoryAccess(f.root), work.lifecycle.scope.allowed_paths);
    const waves = compileDevelopmentWorkflow(f.config, input.selection.team, 'task_execution', []).waves;
    const makeItem = (stage, index = 0) => {
      const wave = waves.findIndex((stages) => stages.some((value) => value.id === stage));
      expect(wave).toBeGreaterThanOrEqual(0);
      const action = sessionActionsForWave(f.config, input.selection, input.context, 'task_execution', wave, []).find(
        (action) => action.stage_id === stage && action.assignment_index === index,
      );
      const request = {
        schema: 'VidaSessionRequest/v1',
        run_id: work.execution.run_id,
        workflow_id: 'task_execution',
        wave_index: wave,
        action_id: action.action_id,
        assignment_index: index,
        stage_id: stage,
        role: action.role,
        config_digest: work.binding.config_digest,
        scope_digest: work.binding.work_source_revision,
        bindings_manifest_ref: '3'.repeat(64),
      };
      const summary =
        stage === 'review_source_prewrite'
          ? JSON.stringify({
              schema: 'LifecyclePreparationObservation/v1',
              record_id: 'synthetic-source-plan',
              kind: 'source_plan',
              work_id: id,
              attempt: 1,
              source_revision: work.binding.work_source_revision,
              scope_id: work.binding.scope_id,
              config_digest: work.binding.config_digest,
              ac_ids: work.binding.ac_ids,
              observed_at: new Date().toISOString(),
              observer_id: 'synthetic-source-planner',
              status: 'pass',
              evidence_refs: ['local://synthetic-fixture/focused'],
              observations: ['scope_acceptance_trace', 'verification_rollback'].map((mechanic) => ({
                mechanic,
                actual: 'Explicit synthetic prerequisite fixture',
                evidence_ref: 'local://synthetic-fixture/focused',
              })),
              gaps: [],
            })
          : stage === 'validate_focused'
          ? JSON.stringify({
              schema: 'VidaValidatorVerdict/v1',
              verdict: 'pass',
              findings: [],
              evidence_refs: ['local://synthetic-fixture/focused'],
            })
          : stage === 'test_task'
            ? JSON.stringify({
                schema: 'VidaTesterVerdict/v1',
                status: 'pass',
                evidence_refs: ['local://synthetic-fixture/focused'],
              })
            : 'Synthetic fixture focused writer outcome';
      const observation = {
        schema: 'VidaSessionObservation/v1',
        action_id: action.action_id,
        issue_id: randomUUID(),
        agent_id: 'synthetic-focused-' + stage + '-' + index,
        tool_call_ref: 'local:synthetic-focused-' + action.action_id,
        status: 'reported_complete',
        summary,
        output_digest: canonicalJsonDigest(summary),
        evidence_refs: ['local://synthetic-fixture/focused'],
        ...(stage === 'develop_task' ? { host_attempt_id: claimed.attempt.attempt_id, changed_paths: [] } : {}),
      };
      return { request, issue_id: observation.issue_id, observation };
    };
    const focused = [
      makeItem('develop_task'),
      makeItem('validate_focused', 0),
      makeItem('validate_focused', 1),
      makeItem('test_task'),
    ];
    f.store.completeWorkflowAttempt(claimed, focused[0].observation);
    focused[0].host_reservation = {
      schema: 'WorkflowSessionReservation/v1',
      receipt: { ...claimed, attempt: f.store.readHostStateSnapshot(identity).work.execution.assignment_attempts[0] },
      request: { workItemId: id, stageId: 'develop_task', assignmentIndex: 0 },
    };
    const journal = {
      schema: 'MastraSessionLedger/v1',
      workspace_id: f.store.workspaceId,
      work_id: id,
      attempt: 1,
      run_id: work.execution.run_id,
      source_scope: source,
      step_id: null,
      items: [],
      completed: [makeItem('review_source_prewrite'), ...focused].map((item, index) => ({
        step_id: 'synthetic-focused-' + index, items: [item],
      })),
    };
    f.database
      .query('INSERT INTO agent_host_mastra_session_ledger VALUES(?,?,?,?,?,?)')
      .run(f.store.workspaceId, id, 1, 1, canonicalJson(journal), canonicalJsonDigest(journal));
    const originalVersion = f.store.readWorkSessionJournal(identity).version;
    const policyPath = 'docs/agent-instructions/documentation-policy.v1.json';
    writeFileSync(
      path.join(f.root, policyPath),
      JSON.stringify({
        schema: 'DocumentationPolicy/v1',
        policy_id: 'corrective-public-fixture',
        project_id: 'sample',
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
      repository_root: f.root,
      repository_id: work.binding.repository_id,
      project_id: 'sample',
      work_id: id,
      source_revision: work.binding.work_source_revision,
      scope_paths: ['AGENT.sidecar.md'],
    };
    await executeDocumentationClearOperation(doc, 'baseline');
    const clear = await executeDocumentationClearOperation(doc, 'closeout');
    const mechanics = {
      source_plan: ['scope_acceptance_trace', 'verification_rollback'],
      platform_knowledge: ['platform_contracts', 'official_reference_lookup'],
      implementation_policy: ['root_cause_owner', 'affected_callers', 'existing_primitives'],
      change_impact_pre: ['affected_paths', 'invalidation', 'rollback'],
      documentation_validation: ['current_inventory', 'current_clear'],
    };
    const prerequisites = Object.entries(mechanics).map(([kind, labels]) => {
      const file = `.agent/work/${id}/${kind}.json`;
      writeFileSync(
        path.join(f.root, file),
        JSON.stringify({
          schema: 'LifecyclePreparationObservation/v1',
          record_id: kind,
          kind,
          work_id: id,
          attempt: 1,
          source_revision: work.binding.work_source_revision,
          scope_id: work.binding.scope_id,
          config_digest: work.binding.config_digest,
          ac_ids: work.binding.ac_ids,
          observed_at: new Date().toISOString(),
          observer_id: 'fixture-observer',
          status: 'pass',
          evidence_refs: ['local://fixture/current-source'],
          observations: labels.map((mechanic) => ({
            mechanic,
            actual: 'Explicit isolated current contract fixture observation',
            evidence_ref: 'local://fixture/current-source',
          })),
          gaps: [],
        }),
      );
      return { kind, path: file };
    });
    const preparationPath = `.agent/work/${id}/preparation.json`;
    writeFileSync(
      path.join(f.root, preparationPath),
      JSON.stringify({
        schema: 'FinalAssurancePreparation/v1',
        work_id: id,
        attempt: 1,
        prerequisites,
        documentation_precheck_path: clear.path,
        clear_path: clear.path,
        delivery_manifest_path: `.agent/work/${id}/delivery.json`,
      }),
    );

    writeFileSync(
      path.join(f.root, '.agent/work/' + id + '/delivery.json'),
      JSON.stringify({
        schema: 'FinalAssuranceDelivery/v1',
        work_id: id,
        implementation_fingerprint: source.digest,
        destination: 'synthetic-fixture-only',
        order: ['AGENT.sidecar.md'],
        post_deployment_checks: ['Inspect isolated fixture source'],
        created_files: [],
        modified_files: ['AGENT.sidecar.md'],
        repository_only_files: [],
      }),
    );
    const preparation = path.join(f.root, preparationPath);
    const withVersion = (version, ...tail) => [
      ...args,
      ...tail,
      '--expected-revision',
      String(version.revision),
      '--expected-digest',
      version.digest,
    ];
    const sourceFile = path.join(f.root, 'AGENT.sidecar.md'),
      originalSource = readFileSync(sourceFile);
    writeFileSync(sourceFile, 'Synthetic source drift');
    denied(withVersion(originalVersion, '--prepare-assurance', preparation));
    writeFileSync(sourceFile, originalSource);

    const retainedReferences = f.store.readHostStateSnapshot(identity).work.lifecycle.references;
    let response = publicRun(withVersion(originalVersion, '--prepare-assurance', preparation));
    const preparedReferences = f.store.readHostStateSnapshot(identity).work.lifecycle.references;
    expect(preparedReferences.length).toBeGreaterThan(retainedReferences.length);
    expect(() => validateLifecycleReferencePreservation(retainedReferences, preparedReferences)).not.toThrow();
    expect(response.assurance_status).toBe('ready');
    expect(response.next_actions).toHaveLength(3);
    expect(f.store.readHostStateSnapshot(identity).work.lifecycle.references.filter(
      (item) => item.kind === 'validation_receipt',
    )).toHaveLength(2);
    response = publicRun(withVersion(response.state_version, '--issue-wave', 'true'));
    expect(response.issued_actions).toHaveLength(3);
    const initialAssuranceVersion = response.state_version,
      packet = response.issued_actions[0].packet,
      reviews = [];
    expect(packet.role).toBe('correctness-validator');
    const checks = { scope_and_trace: 'pass', tests_security_rollback: 'pass', evidence_invalidation_binding: 'pass' };
    const reportFile = path.join(f.root, '.agent/work/' + id + '/synthetic-assurance-report.json');
    const report = (value, version = response.state_version) => {
      writeFileSync(reportFile, JSON.stringify(value));
      return publicRun(withVersion(version, '--report', reportFile));
    };
    for (const [index, action] of response.issued_actions.entries())
      reviews.push({
        schema: 'FinalAssuranceReview/v1',
        work_id: id,
        attempt: 1,
        packet_id: packet.packet_id,
        action_id: action.action_id,
        issue_id: action.issue_id,
        generation: packet.generation,
        implementation_fingerprint: packet.implementation_fingerprint,
        scope_id: packet.scope_id,
        agent_id: 'synthetic-reviewer-' + index,
        history_id: 'synthetic-isolated-history-' + index,
        tool_call_ref: 'local:synthetic-review-' + index,
        verdict: 'pass',
        evidence_refs: ['local://synthetic-fixture/review-' + index],
        perspective: action.perspective,
        findings: [],
        checks,
      });
    writeFileSync(reportFile, JSON.stringify({ ...reviews[0], attempt: 2 }));
    denied(withVersion(response.state_version, '--report', reportFile));
    response = report(reviews[0]);
    expect(response.assurance_status).toBe('issued_outcome_uncertain');
    expect(report(reviews[0], initialAssuranceVersion).status).toBe('assurance_report_retrieved');
    writeFileSync(reportFile, JSON.stringify(reviews[1]));
    denied(withVersion(initialAssuranceVersion, '--report', reportFile));
    response = report(reviews[1]);
    expect(f.store.readHostStateSnapshot(identity).work.lifecycle.phase).toBe('VERIFY');
    response = report(reviews[2]);
    response = publicRun(withVersion(response.state_version, '--issue-wave', 'true'));
    expect(response.issued_actions).toHaveLength(3);
    const reverses = response.issued_actions.map((action) => {
      const prior = reviews.find((review) => review.perspective === action.perspective);
      const { schema: _schema, perspective: _perspective, findings: _findings, ...binding } = prior;
      return {
        ...binding,
        schema: 'FinalAssuranceReverse/v1',
        action_id: action.action_id,
        issue_id: action.issue_id,
        tool_call_ref: 'local:synthetic-reverse-' + prior.perspective,
        evidence_refs: ['local://synthetic-fixture/reverse-' + prior.perspective],
        review_action_id: prior.action_id,
        review_issue_id: prior.issue_id,
      };
    });
    for (const reverse of reverses.slice(0, 2)) {
      response = report(reverse);
      expect(f.store.readHostStateSnapshot(identity).work.lifecycle.phase).toBe('VERIFY');
    }
    // A changed CLEAR artifact cannot publish DELIVERY. The six reports stay durable.
    const clearFile = path.join(f.root, clear.path),
      clearBytes = readFileSync(clearFile),
      badClear = JSON.parse(clearBytes);
    badClear.work_id = 'synthetic-foreign-work';
    writeFileSync(clearFile, JSON.stringify(badClear));
    response = report(reverses[2]);
    expect(response.assurance_status).toBe('reviewed');
    expect(response.delivery_gap).toBeTruthy();
    expect(f.store.readHostStateSnapshot(identity).work.lifecycle.phase).toBe('VERIFY');
    expect(
      f.store
        .readHostStateSnapshot(identity)
        .work.lifecycle.references.filter(
          (ref) =>
            ref.disposition === 'current' &&
            ['review_receipt', 'reverse_validation', 'documentation_clear', 'delivery_manifest'].includes(ref.kind),
        ),
    ).toHaveLength(0);
    writeFileSync(clearFile, clearBytes);
    response = report(reverses[2]);
    expect(response.status).toBe('delivery');
    expect(response.runtime_acceptance).toBe('pending_attributable_user_testing');
    expect(response.delivery_gap).toBeNull();
    const final = f.store.readHostStateSnapshot(identity).work,
      current = final.lifecycle.references.filter((ref) => ref.disposition === 'current');
    expect(final.lifecycle.phase).toBe('DELIVERY');
    expect(final.execution.run_id).toBe(work.execution.run_id);
    const eight = current.filter((ref) =>
      ['review_receipt', 'reverse_validation', 'documentation_clear', 'delivery_manifest'].includes(ref.kind),
    );
    expect(eight).toHaveLength(8);
    expect(eight.every((ref) => ref.generation === packet.generation || ref.kind === 'delivery_manifest')).toBe(true);
    expect(response.delivery_manifest.path).toBe('.agent/work/' + id + '/delivery.json');
  } finally {
    f.close();
  }
}, 90000);
