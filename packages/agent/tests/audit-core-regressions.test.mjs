import { test, expect } from 'bun:test';
import { Database } from 'bun:sqlite';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'yaml';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { loadRuntimeConfig, runtimeConfigDigest } from '../src/config/runtime-config.ts';
import { snapshotDeclaredSources } from '../src/orchestration/scoped-source-snapshot.ts';
import { main } from '../bin/run.mjs';
import { runtimeExecutableInventory } from '../tooling/maintained-source-inventory.mjs';
import { citedResearchConstraints } from '../src/orchestration/admitted-development-packet.ts';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('audit diagnostics distinguish expiry, CAS and artifact validation without exposing supplied secrets', async () => {
  const publicFailure = async (error) => {
    const output = [];
    await main({
      isMain: true,
      args: [],
      execute: async () => {
        throw error;
      },
      io: { error: (value) => output.push(JSON.parse(value)) },
      exit: {},
    });
    return output[0];
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
    source_refs: [{ source_id: 'current-code' }],
    findings: [
      {
        finding_id: 'scope-guard',
        statement: 'Retain the exact same-file writer guard.',
        source_ids: ['current-code'],
        status: 'confirmed',
      },
      {
        finding_id: 'unproven',
        statement: 'Do not promote this hypothesis.',
        source_ids: ['current-code'],
        status: 'hypothesis',
      },
    ],
  };
  expect(citedResearchConstraints(result)).toEqual([
    'Research research-fixture/scope-guard [current-code]: Retain the exact same-file writer guard.',
  ]);
  expect(() => citedResearchConstraints({ ...result, source_refs: [] })).toThrow('matching cited source');
});

test('audit core preserves selection on resumed developer-only issue and returns the admitted packet', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-writer-admission-'));
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
    // Test setup: one configured source-first workflow isolates the actual public writer boundary.
    const template = path.join(bundle, 'templates', 'agent-runtime.config.template.v1.yaml');
    const authored = yaml.parse(readFileSync(template, 'utf8'));
    const developer = authored.workflows.bug_fix.stages.find((stage) => stage.id === 'develop_fix');
    developer.required_after = [];
    developer.consumes = ['WorkItem/v1'];
    authored.agents.role_instructions['developer-orchestrator'].consumes.push('WorkItem/v1');
    authored.workflows.bug_fix.entry_stage = 'develop_fix';
    const tester = authored.workflows.bug_fix.stages.find((stage) => stage.id === 'test_regression');
    tester.consumes = ['ImplementationResult/v1'];
    const validator = authored.workflows.bug_fix.stages.find((stage) => stage.id === 'validate_parallel');
    const delivery = authored.workflows.bug_fix.stages.find((stage) => stage.id === 'prepare_delivery');
    for (const stage of [validator, delivery])
      stage.consumes = stage.consumes.filter((artifact) => artifact !== 'DevelopmentTaskPacket/v1');
    authored.workflows.bug_fix.terminal_stages = ['prepare_delivery'];
    authored.workflows.bug_fix.stages = [developer, tester, validator, delivery];
    authored.workflows.bug_fix.edges = [
      ['develop_fix', 'test_regression'],
      ['test_regression', 'validate_parallel'],
      ['validate_parallel', 'prepare_delivery'],
    ];
    writeFileSync(template, yaml.stringify(authored));
    const invoke = (entry, args) =>
      spawnSync('bun', [path.join(bundle, 'bin', entry), ...args], {
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
      workflow_id: 'bug_fix',
      stage_ids: ['develop_fix'],
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
        provider_type: 'Bug',
        canonical_kind: 'bug',
        intent: 'bug_fix',
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
      'bug',
      '--intent',
      'bug_fix',
      '--workflow',
      'bug_fix',
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
    const version = prepared.payload.state_version;
    const stale = parse(
      invoke('run.mjs', [
        ...args,
        '--issue-wave',
        'true',
        '--expected-revision',
        String(version.revision + 1),
        '--expected-digest',
        version.digest,
      ]),
    );
    expect(stale.status).toBe(1);
    expect(rows().find((row) => row.kind === 'ledger').value).toEqual(priorLedger);
    const issued = parse(
      invoke('run.mjs', [
        ...args,
        '--issue-wave',
        'true',
        '--expected-revision',
        String(version.revision),
        '--expected-digest',
        version.digest,
      ]),
    );
    expect(issued.status, issued.stderr).toBe(0);
    expect(issued.payload.status).toBe('wave_issued');
    expect(issued.payload.issued_actions[0].host_attempt_id).toBeDefined();
    const packet = issued.payload.issued_actions[0].development_packet;
    expect(packet).toBeDefined();
    expect(packet.work_item.risk_flags).toEqual(['concurrency']);
    expect(packet.work_item.labels).toEqual(['audit-sensitive']);
    expect(packet.implementation_constraints).toContain('Modify only admitted implementation paths: src/task.ts');
    expect(issued.payload.issued_actions[0].implementation_result).toBeUndefined();
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
