import { test, expect } from 'bun:test';
import { Database } from 'bun:sqlite';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { loadRuntimeConfig, runtimeConfigDigest } from '../src/config/runtime-config.ts';
import { canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import { snapshotDeclaredSources } from '../src/orchestration/scoped-source-snapshot.ts';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('public writer issue acquires file ownership after execution-only intake and before native reservation', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-writer-admission-'));
  try {
    const bundle = path.join(root, 'tools', 'agents');
    mkdirSync(bundle, { recursive: true });
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
      cpSync(path.join(packageRoot, entry), path.join(bundle, entry), { recursive: true, dereference: false });
    symlinkSync(
      path.join(packageRoot, 'node_modules'),
      path.join(bundle, 'node_modules'),
      process.platform === 'win32' ? 'junction' : 'dir',
    );
    const invoke = (entry, args) =>
      spawnSync(process.execPath, [path.join(bundle, 'bin', entry), ...args], {
        cwd: bundle,
        encoding: 'utf8',
        windowsHide: true,
      });
    const initialized = invoke('init.mjs', [
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
    const relative = (name) => '.agent/work/writer-work/' + name;
    const put = (name, value) => writeFileSync(path.join(workDir, name), JSON.stringify(value));
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
        labels: [],
        risk_flags: ['high'],
      },
      scope_path: relative('scope.json'),
      acceptance_path: relative('acceptance.json'),
      source_authorization_path: relative('source-authorization.json'),
      runtime_code_paths: ['tools/agents/bin/run.mjs'],
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
      'src/task.ts',
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
    const parse = (result) => ({
      ...result,
      payload: JSON.parse((result.status === 0 ? result.stdout : result.stderr).trim().split(/\r?\n/).at(-1)),
    });
    const prepared = parse(invoke('run.mjs', [...args, '--intake', path.join(workDir, 'intake.json')]));
    expect(prepared.status, prepared.stderr).toBe(0);
    const dbPath = path.join(root, '.agent', 'work', 'session-handoff.v1.sqlite');
    const rows = () => {
      const db = new Database(dbPath, { readonly: true });
      try {
        return db
          .query('SELECT kind,payload FROM agent_host_state')
          .all()
          .map((row) => ({ kind: row.kind, value: JSON.parse(row.payload) }));
      } finally {
        db.close();
      }
    };
    const priorLedger = rows().find((row) => row.kind === 'ledger').value;
    expect(priorLedger.claims.filter((claim) => claim.status === 'active')[0].resources).toEqual([
      'execution:writer-work',
    ]);
    const expected = (version) => [
        '--expected-revision',
        String(version.revision),
        '--expected-digest',
        version.digest,
      ],
      call = (extra) => parse(invoke('run.mjs', [...args, ...extra])),
      synthesisIssue = call(['--issue-wave', 'true', ...expected(prepared.payload.state_version)]);
    expect(synthesisIssue.status, synthesisIssue.stderr).toBe(0);
    expect(synthesisIssue.payload.issued_actions[0].request.stage_id).toBe('synthesize_task');
    const synthesis = synthesisIssue.payload.issued_actions[0],
      synthesisSummary = 'The accepted task and scope are ready for current Source planning.',
      synthesisReportPath = path.join(workDir, 'synthesis-report.json');
    writeFileSync(
      synthesisReportPath,
      JSON.stringify({
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
    const synthesisReport = call([...expected(synthesisIssue.payload.state_version), '--report', synthesisReportPath]);
    expect(synthesisReport.status, synthesisReport.stderr).toBe(0);

    const prewriterIssue = call(['--issue-wave', 'true', ...expected(synthesisReport.payload.state_version)]);
    expect(prewriterIssue.status, prewriterIssue.stderr).toBe(0);
    expect(prewriterIssue.payload.issued_actions.map((item) => item.request.role).sort()).toEqual([
      'security-prewriter',
      'source-planner',
    ]);
    const preparationRecord = (item, kind) => {
        const evidence = kind === 'source_plan' ? 'source-plan.md' : 'security-review.md';
        return {
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
        };
      },
      reportPreparation = (item, kind, version) => {
        const record = preparationRecord(item, kind),
          summary = JSON.stringify(record),
          reportPath = path.join(workDir, kind + '-report.json');
        writeFileSync(
          reportPath,
          JSON.stringify({
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
        return call([...expected(version), '--report', reportPath]);
      },
      planAction = prewriterIssue.payload.issued_actions.find((item) => item.request.role === 'source-planner'),
      securityAction = prewriterIssue.payload.issued_actions.find((item) => item.request.role === 'security-prewriter'),
      planReport = reportPreparation(planAction, 'source_plan', prewriterIssue.payload.state_version);
    expect(planReport.status, planReport.stderr).toBe(0);
    const planRows = rows(),
      plannedWork = planRows.find((row) => row.kind === 'work').value,
      planReference = plannedWork.lifecycle.references.find((reference) => reference.kind === 'source_plan');
    expect(plannedWork.lifecycle.phase).toBe('PLAN');
    expect(plannedWork.execution.assignment_attempts).toHaveLength(0);
    expect(
      plannedWork.lifecycle.references.filter((reference) => reference.kind === 'implementation_policy'),
    ).toHaveLength(0);
    expect(
      planRows.find((row) => row.kind === 'ledger').value.claims.filter((claim) => claim.status === 'active')[0]
        .resources,
    ).toEqual(['execution:writer-work']);
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
    const policyReport = reportPreparation(securityAction, 'implementation_policy', planReport.payload.state_version);
    expect(policyReport.status, policyReport.stderr).toBe(0);
    const prewriteRows = rows(),
      prewriteWork = prewriteRows.find((row) => row.kind === 'work').value;
    expect(
      prewriteWork.lifecycle.references.filter((reference) => reference.kind === 'implementation_policy'),
    ).toHaveLength(1);
    expect(prewriteWork.execution.assignment_attempts).toHaveLength(0);
    expect(
      prewriteRows.find((row) => row.kind === 'ledger').value.claims.filter((claim) => claim.status === 'active')[0]
        .resources,
    ).toEqual(['execution:writer-work']);
    const beforeStale = rows().find((row) => row.kind === 'ledger').value,
      stale = call(['--issue-wave', 'true', ...expected(prepared.payload.state_version)]);
    expect(stale.status).toBe(1);
    expect(stale.payload.code).toBe('GAP-VIDA-RUN-CONTEXT-001');
    expect(rows().find((row) => row.kind === 'ledger').value).toEqual(beforeStale);
    const issued = call(['--issue-wave', 'true', ...expected(policyReport.payload.state_version)]);
    expect(issued.status, issued.stderr).toBe(0);
    expect(issued.payload.status).toBe('wave_issued');
    expect(issued.payload.issued_actions[0].request.stage_id).toBe('develop_task');
    expect(issued.payload.issued_actions[0].host_attempt_id).toBeDefined();
    const final = rows();
    const ledger = final.find((row) => row.kind === 'ledger').value;
    const work = final.find((row) => row.kind === 'work').value;
    expect(ledger.claims.filter((claim) => claim.status === 'active')[0].resources).toEqual([
      'execution:writer-work',
      'file:src/task.ts',
    ]);
    expect(ledger.tickets[0].status).toBe('released');
    expect(work.execution.assignment_attempts[0].status).toBe('started');
    expect(work.execution.assignment_attempts[0].lease.ticket_id).toBe(work.lease.ticket_id);
    expect(readFileSync(path.join(root, 'src', 'task.ts'), 'utf8')).toBe('export const task = true;\n');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}, 120_000);
