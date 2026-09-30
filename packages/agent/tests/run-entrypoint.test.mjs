import { afterAll, describe, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import {
  cpSync,
  existsSync,
  linkSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { assertNoActiveCutoverMaintenance, run } from '../bin/run.mjs';
import { canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import { deriveWorkspaceId, loadRuntimeConfig, runtimeConfigDigest } from '../src/index.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { snapshotDeclaredSources } from '../src/orchestration/scoped-source-snapshot.ts';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
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
const launcher = path.join(packageRoot, 'bin', 'run.mjs');
const mutationMode = process.env.AGENT_RUNTIME_MUTATION_PART === 'bun';
const v8CoverageMode = process.env.AGENT_RUNTIME_V8_COVERAGE === '1';
const ordinaryDescribe = mutationMode ? describe.skip : describe;
const liveInstallTest = v8CoverageMode ? test.skip : test;
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

function invoke(args, env = {}) {
  return spawnSync('bun', [launcher, ...args], {
    cwd: packageRoot,
    env: { ...process.env, ...env },
    encoding: 'utf8',
    windowsHide: true,
  });
}

describe('vida-agent run entrypoint fast checks', () => {
  test('loads the session Mastra bridge and trusted evidence authority from declared dependencies', async () => {
    const build = await Bun.build({
      entrypoints: [launcher],
      target: 'bun',
      packages: 'external',
      write: false,
    });
    expect(build.success).toBe(true);
    const bundle = await build.outputs[0].text();
    expect(bundle).toMatch(/^\/\/ (?:[^\n]*\/)?src\/orchestration\/workflow-plan\.ts$/m);
    // The boundary supplies authority-issued receipts; MastraSessionBridge owns stage progression.
    expect(bundle).toMatch(/^\/\/ (?:[^\n]*\/)?src\/orchestration\/mastra-boundary\.ts$/m);
    expect(bundle).toMatch(/^\/\/ (?:[^\n]*\/)?src\/orchestration\/mastra-session-bridge\.ts$/m);
    expect(bundle).toContain('from "@mastra/');
    const dependencies = JSON.parse(readFileSync(path.join(packageRoot, 'package.json'), 'utf8')).dependencies;
    expect(dependencies['@mastra/core']).toBe('1.71.0');
    expect(dependencies['@mastra/libsql']).toBe('1.23.3');
    expect(dependencies.zod).toBe('4.4.3');
  });

  test('blocks admission while the selected cutover still holds maintenance', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'vida-run-maintenance-'));
    try {
      writeFileSync(path.join(root, 'maintenance-lock.v1.json'), '{}\n');
      let blocked;
      try {
        assertNoActiveCutoverMaintenance({ generationRoot: root });
      } catch (error) {
        blocked = error;
      }
      expect(blocked).toMatchObject({
        code: 'GAP-VIDA-RUN-SELECTOR-001',
        message: 'Cutover maintenance is still active.',
      });
      unlinkSync(path.join(root, 'maintenance-lock.v1.json'));
      expect(() => assertNoActiveCutoverMaintenance({ generationRoot: root })).toThrow('authority');
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
      await expect(run([...args, ...extra])).rejects.toMatchObject({ code: 'GAP-VIDA-RUN-CLI-001' });
    }
  });
});

ordinaryDescribe('vida-agent run entrypoint', () => {
  test('requires every explicit argument and rejects raw authority inputs', () => {
    const missing = invoke(common);
    expect(missing.status).toBe(1);
    expect(missing.stdout).toBe('');
    expect(missing.stderr).toContain('GAP-VIDA-RUN-CLI-001');
    const rawThread = invoke([...common, '--workflow', 'information_research_light', '--thread-id', 'forged']);
    expect(rawThread.status).toBe(1);
    expect(rawThread.stderr).toContain('GAP-VIDA-RUN-CLI-001');
    const legacyTenant = invoke([
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
    ]);
    expect(legacyTenant.status).toBe(1);
    expect(legacyTenant.stderr).toContain('GAP-VIDA-RUN-CLI-001');
  });

  test('blocks before workflow selection when the trusted initialization binding is absent', () => {
    const result = invoke([...common, '--workflow', 'information_research_light']);
    expect(result.status).toBe(1);
    const payload = JSON.parse(result.stderr);
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
    expect(JSON.parse(result.stderr).code).toBe('GAP-VIDA-RUN-CONTEXT-001');
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
    expect(JSON.parse(result.stderr)).toEqual({
      schema: 'VidaAgentRunResult/v1',
      status: 'blocked',
      code: 'GAP-VIDA-RUN-CLI-004',
      message: 'The project root is unavailable or is not a canonical directory.',
    });
    expect(result.stderr).not.toContain(invalidRoot);
    expect(result.stderr.length).toBeLessThan(512);
  });

  liveInstallTest(
    'copied bundle issues an admitted parallel wave before reports and advances by CAS',
    () => {
      const root = mkdtempSync(path.join(tmpdir(), 'vida-run-session-'));
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
        const externalConfig = path.join(root, 'source-config.yaml');
        writeFileSync(
          externalConfig,
          readFileSync(path.join(packageRoot, 'templates/agent-runtime.config.template.v1.yaml'), 'utf8')
            .replaceAll('{{REPOSITORY}}', 'ignored-repository')
            .replaceAll('{{PROJECT}}', 'ignored-project')
            .replaceAll('{{BUNDLE}}', 'ignored-runtime'),
        );
        const invokeCopy = (args, env = {}) =>
          spawnSync('bun', args, {
            cwd: bundle,
            encoding: 'utf8',
            windowsHide: true,
            env: { ...process.env, ...env },
          });
        const initialized = invokeCopy(
          [
            path.join(bundle, 'bin/init.mjs'),
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
        const source = snapshotDeclaredSources(requireSafeRepositoryAccess(root), ['AGENT.sidecar.md']);
        const workDir = path.join(root, '.agent', 'work', 'session-work');
        mkdirSync(workDir, { recursive: true });
        const relative = (name) => `.agent/work/session-work/${name}`;
        const put = (name, value) => writeFileSync(path.join(workDir, name), JSON.stringify(value));
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
            canonical_kind: 'research',
            intent: 'information_research',
            project_id: 'different-project',
            title: 'Read-only parallel research fixture',
            description: '',
            labels: [],
            risk_flags: [],
          },
          scope_path: relative('scope.json'),
          acceptance_path: relative('acceptance.json'),
          runtime_code_paths: ['tools/agents/bin/run.mjs'],
          route: 'R2',
          risk: 'low',
          change_kind: 'fix',
        });
        const args = [
          path.join(bundle, 'bin/run.mjs'),
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
          'research',
          '--intent',
          'information_research',
          '--workflow',
          'information_research_light',
        ];
        const call = (extra = []) => {
          const result = invokeCopy([...args, ...extra]);
          return { ...result, payload: JSON.parse(result.status === 0 ? result.stdout : result.stderr) };
        };
        const prepared = call(['--intake', path.join(workDir, 'intake.json')]);
        expect(prepared.status, prepared.stderr).toBe(0);
        expect(prepared.payload.next_actions.length).toBeGreaterThan(1);
        const expected = (version) => [
          '--expected-revision',
          String(version.revision),
          '--expected-digest',
          version.digest,
        ];
        const issued = call([...expected(prepared.payload.state_version), '--issue-wave', 'true']);
        if (issued.status !== 0) {
          const diagnostic = invokeCopy([
            '-e',
            `const {run}=await import(${JSON.stringify(pathToFileURL(path.join(bundle, 'bin/run.mjs')).href)});try{await run(${JSON.stringify([...args.slice(1), ...expected(prepared.payload.state_version), '--issue-wave', 'true'])});}catch(error){console.error(error.message);process.exitCode=1;}`,
          ]);
          expect(issued.status, diagnostic.stderr).toBe(0);
        }
        expect(issued.status, issued.stderr).toBe(0);
        expect(issued.payload.status).toBe('wave_issued');
        expect(issued.payload.issued_actions.map((item) => item.request.action_id)).toEqual(
          prepared.payload.next_actions.map((item) => item.request.action_id),
        );
        expect(new Set(issued.payload.issued_actions.map((item) => item.issue_id)).size).toBe(
          issued.payload.issued_actions.length,
        );
        const stale = call([...expected(prepared.payload.state_version), '--issue-wave', 'true']);
        expect(stale.status).toBe(1);
        const mixed = call([
          ...expected(issued.payload.state_version),
          '--issue-wave',
          'true',
          '--report',
          path.join(root, 'report.json'),
        ]);
        expect(mixed.status).toBe(1);
        expect(mixed.payload.code).toBe('GAP-VIDA-RUN-CLI-001');
        const reportFile = path.join(root, 'report.json');
        writeFileSync(reportFile, 'x'.repeat(32769));
        const oversized = call([...expected(issued.payload.state_version), '--report', reportFile]);
        expect(oversized.status).toBe(1);
        expect(oversized.payload.code).toBe('GAP-VIDA-RUN-REPORT-001');
        writeFileSync(reportFile, '{');
        const malformed = call([...expected(issued.payload.state_version), '--report', reportFile]);
        expect(malformed.status).toBe(1);
        expect(malformed.payload.code).toBe('GAP-VIDA-RUN-REPORT-001');
        writeFileSync(reportFile, '{}');
        const secondLink = path.join(root, 'report-hardlink.json');
        linkSync(reportFile, secondLink);
        const linked = call([...expected(issued.payload.state_version), '--report', reportFile]);
        expect(linked.status).toBe(1);
        expect(linked.payload.code).toBe('GAP-VIDA-RUN-REPORT-001');
        unlinkSync(secondLink);
        let version = issued.payload.state_version;
        let final;
        for (const item of issued.payload.issued_actions) {
          const action = item.request;
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
                digest: source.entries[0].sha256,
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
            expect(call().payload.state_version).toEqual(version);
          }
          writeFileSync(reportFile, JSON.stringify(outcome));
          final = call([...expected(version), '--report', reportFile]);
          expect(final.status, final.stderr).toBe(0);
          version = final.payload.state_version;
        }
        expect(final.payload.resume_status).toBe('ready');
        expect(final.payload.next_actions.length).toBeGreaterThan(0);
        expect(final.payload.next_actions[0].request.wave_index).toBe(1);
        const replay = call([...expected(version), '--report', path.join(root, 'report.json')]);
        expect(replay.status).toBe(1);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
    180_000,
  );
});

if (mutationMode || v8CoverageMode) {
  const record = (value) => `${JSON.stringify(value, null, 2)}\n`;
  const createFixture = (root, bundleName = 'agent-runtime-new', multiProject = false) => {
    const fixtureBundle = path.join(root, bundleName);
    if (bundleName === 'vida-agent') {
      mkdirSync(fixtureBundle);
      for (const entry of [
        'src',
        'dist',
        'bin',
        'schemas',
        'instructions',
        'templates',
        'package.json',
        'TESTING.md',
        'bun.lock',
        '.bun-version',
      ])
        cpSync(path.join(packageRoot, entry), path.join(fixtureBundle, entry), { recursive: true, dereference: false });
      symlinkSync(
        path.join(packageRoot, 'node_modules'),
        path.join(fixtureBundle, 'node_modules'),
        process.platform === 'win32' ? 'junction' : 'dir',
      );
    } else {
      mkdirSync(path.join(fixtureBundle, 'schemas'), { recursive: true });
      cpSync(
        path.join(packageRoot, 'schemas', 'runtime-initialization.v1.schema.json'),
        path.join(fixtureBundle, 'schemas', 'runtime-initialization.v1.schema.json'),
      );
      cpSync(path.join(packageRoot, 'TESTING.md'), path.join(fixtureBundle, 'TESTING.md'));
    }
    writeFileSync(path.join(root, 'AGENTS.md'), '# Mutation fixture\n');
    writeFileSync(path.join(root, 'AGENT.sidecar.md'), '# Mutation fixture\n');
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
    const initialization = {
      schema: 'RuntimeInitialization/v1',
      version: 1,
      repository_id: config.repository.repository_id,
      project_ids: config.projects.map((project) => project.project_id).sort(),
      integrations_digest: canonicalJsonDigest(config.integrations),
      workspace_id: deriveWorkspaceId(config.repository.repository_id, root),
      workspace_binding_status: 'pending',
      bundle: config.runtime.bundle,
      config_digest: runtimeConfigDigest(config),
      schema_sha256: createHash('sha256').update(schema).digest('hex'),
      templates: [],
      created_at: new Date().toISOString(),
    };
    mkdirSync(path.dirname(initializationPath), { recursive: true });
    writeFileSync(initializationPath, record(initialization));
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
    return { args, initialization, initializationPath, fixtureBundle };
  };

  describe('vida-agent run mutation path', () => {
    test('rejects unsafe roots and identifiers before reading project authority', async () => {
      const args = [...common, '--workflow', 'information_research_light'];
      const withValue = (key, value) => args.map((entry, index) => (args[index - 1] === key ? value : entry));
      for (const [candidate, code] of [
        [withValue('--project-root', 'relative-root'), 'GAP-VIDA-RUN-CLI-002'],
        [withValue('--project-root', path.join(tmpdir(), `vida-run-absent-${randomUUID()}`)), 'GAP-VIDA-RUN-CLI-004'],
        [withValue('--repository', 'Uppercase'), 'GAP-VIDA-RUN-CLI-003'],
        [withValue('--project', 'invalid_project'), 'GAP-VIDA-RUN-CLI-003'],
        [withValue('--work-id', 'unsafe/id'), 'GAP-VIDA-RUN-CLI-003'],
        [withValue('--attempt', '0'), 'GAP-VIDA-RUN-CLI-003'],
        [withValue('--scope-digest', 'z'.repeat(64)), 'GAP-VIDA-RUN-CLI-003'],
      ]) {
        await expect(run(candidate)).rejects.toMatchObject({ code });
      }
    });

    test('rejects invalid initialization status and an escaping work path without creating work', async () => {
      const root = mkdtempSync(path.join(tmpdir(), 'vida-run-context-'));
      try {
        const { args, initialization, initializationPath } = createFixture(root);
        writeFileSync(initializationPath, record({ ...initialization, workspace_binding_status: 'unknown' }));
        await expect(run(args)).rejects.toMatchObject({
          code: 'GAP-VIDA-RUN-CONTEXT-001',
          message: 'Runtime initialization status is invalid.',
        });
        writeFileSync(initializationPath, record(initialization));
        const escaping = args.map((entry, index) => (args[index - 1] === '--work-path' ? '../escape' : entry));
        await expect(run(escaping)).rejects.toMatchObject({
          code: 'GAP-VIDA-RUN-CONTEXT-001',
          message: 'The work path is not bound to the selected project context.',
        });
        expect(existsSync(path.join(root, '.agent', 'work'))).toBe(false);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });

    test('rejects a changed scope for a persisted attempt before issuing its wave', async () => {
      const root = mkdtempSync(path.join(tmpdir(), 'vida-run-persisted-'));
      try {
        const { args } = createFixture(root);
        const prepared = await run(args);
        const changed = args.map((entry, index) => (args[index - 1] === '--scope-digest' ? 'b'.repeat(64) : entry));
        await expect(
          run([
            ...changed,
            '--expected-revision',
            String(prepared.state_version.revision),
            '--expected-digest',
            prepared.state_version.digest,
            '--issue-wave',
            'true',
          ]),
        ).rejects.toMatchObject({
          code: 'GAP-VIDA-RUN-CONTEXT-001',
          message: 'The persisted attempt differs from the current launcher context.',
        });
        expect((await run(args)).state_version).toEqual(prepared.state_version);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });

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
        await expect(run([...args, '--workflow', 'information_research_light'])).rejects.toMatchObject({
          code: 'GAP-VIDA-RUN-SELECTOR-001',
        });
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });

    test('rejects independent repository and requested-project drift before creating state', async () => {
      const root = mkdtempSync(path.join(tmpdir(), 'vida-run-identity-'));
      try {
        const { args, initialization, initializationPath } = createFixture(root);
        const withRepository = (repository) =>
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
          await expect(run(entry.args)).rejects.toMatchObject({
            code: 'GAP-VIDA-RUN-CONTEXT-001',
            message: entry.message,
          });
          expect(existsSync(path.join(root, '.agent', 'work'))).toBe(false);
        }
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });

    test('accepts the same configured project set in either receipt order', async () => {
      const root = mkdtempSync(path.join(tmpdir(), 'vida-run-project-set-'));
      try {
        const { args, initialization, initializationPath } = createFixture(root, 'agent-runtime-new', true);
        expect(initialization.project_ids).toEqual(['alpha-project', 'mutation-project']);
        expect((await run(args)).status).toBe('prepared');
        writeFileSync(
          initializationPath,
          record({ ...initialization, project_ids: [...initialization.project_ids].reverse() }),
        );
        const secondArgs = args.map((value, index) =>
          args[index - 1] === '--work-id' ? `mutation-run-${randomUUID()}` : value,
        );
        expect((await run(secondArgs)).status).toBe('prepared');
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });

    test('keeps CLI validation, workflow selection, CAS and report handling bound to one attempt', async () => {
      const root = mkdtempSync(path.join(tmpdir(), 'vida-run-mutation-'));
      try {
        const { args, initialization, initializationPath } = createFixture(root);
        for (const [changed, message] of [
          [{ repository_id: 'other-repository' }, 'Runtime initialization repository identity is stale.'],
          [{ project_ids: ['other-project'] }, 'Runtime initialization project configuration is stale.'],
          [{ integrations_digest: 'b'.repeat(64) }, 'Runtime initialization integrations are stale.'],
          [{ config_digest: 'b'.repeat(64) }, 'Runtime initialization configuration is stale.'],
          [{ workspace_id: 'other-workspace' }, 'Runtime initialization workspace identity is stale.'],
          [{ schema_sha256: 'b'.repeat(64) }, 'Runtime initialization schema is stale.'],
        ]) {
          writeFileSync(initializationPath, record({ ...initialization, ...changed }));
          await expect(run(args)).rejects.toMatchObject({ code: 'GAP-VIDA-RUN-CONTEXT-001', message });
        }
        writeFileSync(initializationPath, record(initialization));
        await expect(run(args.slice(0, -2))).rejects.toMatchObject({ code: 'GAP-VIDA-RUN-CLI-001' });
        await expect(run([...args, '--thread-id', 'forged'])).rejects.toMatchObject({ code: 'GAP-VIDA-RUN-CLI-001' });
        await expect(run(args.slice(0, -1).concat('task_execution'))).rejects.toMatchObject({
          code: 'GAP-VIDA-RUN-WORKFLOW-001',
        });
        const prepared = await run(args);
        expect(prepared.status).toBe('prepared');
        expect(prepared.next_actions.length).toBeGreaterThan(1);
        const expected = (version) => [
          '--expected-revision',
          String(version.revision),
          '--expected-digest',
          version.digest,
        ];
        const issued = await run([...args, ...expected(prepared.state_version), '--issue-wave', 'true']);
        expect(issued.status).toBe('wave_issued');
        expect(issued.issued_actions.map((item) => item.action.action_id)).toEqual(
          prepared.next_actions.map((item) => item.request.action_id),
        );
        await expect(run([...args, ...expected(prepared.state_version), '--issue-wave', 'true'])).rejects.toThrow();
        const reportFile = path.join(root, 'report.json');
        for (const invalid of ['', '{', 'x'.repeat(32769)]) {
          writeFileSync(reportFile, invalid);
          await expect(run([...args, ...expected(issued.state_version), '--report', reportFile])).rejects.toMatchObject(
            {
              code: 'GAP-VIDA-RUN-REPORT-001',
            },
          );
        }
        writeFileSync(reportFile, '{}');
        const secondLink = path.join(root, 'report-hardlink.json');
        linkSync(reportFile, secondLink);
        await expect(run([...args, ...expected(issued.state_version), '--report', reportFile])).rejects.toMatchObject({
          code: 'GAP-VIDA-RUN-REPORT-001',
        });
        unlinkSync(secondLink);
        expect((await run(args)).state_version).toEqual(issued.state_version);
        let version = issued.state_version;
        for (const item of issued.issued_actions) {
          const action = item.action;
          const summary = `Observed ${action.stage_id}`;
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
              evidence_refs: [],
            }),
          );
          const result = await run([...args, ...expected(version), '--report', reportFile]);
          version = result.state_version;
          if (item === issued.issued_actions.at(-1)) {
            expect(result.resume_status).toBe('ready');
            expect(result.next_actions[0].request.wave_index).toBe(1);
          }
        }
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });

    test('binds admission to the selected journal and released maintenance proof', async () => {
      const root = mkdtempSync(path.join(tmpdir(), 'vida-run-selected-'));
      const dependenciesLink = path.join(root, 'vida-agent', 'node_modules');
      try {
        const { args, fixtureBundle } = createFixture(root, 'vida-agent');
        const selectedRun = (await import(pathToFileURL(path.join(fixtureBundle, 'bin', 'run.mjs')).href)).run;
        const generation = `selected-${randomUUID()}`;
        const generationRoot = path.join(root, '.agent', 'cutover', generation);
        mkdirSync(generationRoot, { recursive: true });
        const selector = {
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
          plan_sha256: selector.plan_sha256,
          archive_manifest_sha256: selector.archive_manifest_sha256,
          payload_manifest_sha256: selector.payload_manifest_sha256,
          state_policy: selector.state_policy,
        };
        const release = {
          schema: 'VidaCutoverMaintenanceRelease/v1',
          cutover_id: generation,
          operator: 'test',
          lock_sha256: createHash('sha256').update(record(releasedLock)).digest('hex'),
          status: 'released_by_explicit_operator_action',
        };
        const records = [
          [
            'prepared-install.json',
            journal,
            { plan_sha256: 'd'.repeat(64) },
            'Prepared cutover journal is incomplete.',
          ],
          ['install-ready.json', ready, { status: 'not-ready' }, 'Prepared cutover journal is incomplete.'],
          [
            'maintenance-lock.released.v1.json',
            releasedLock,
            { cutover_id: 'other-generation' },
            'Cutover maintenance release proof is invalid.',
          ],
          [
            'maintenance-release.v1.json',
            release,
            { lock_sha256: 'd'.repeat(64) },
            'Cutover maintenance release proof is invalid.',
          ],
        ];
        writeFileSync(path.join(root, '.agent', 'active-runtime-selector.v1.json'), record(selector));
        for (const [name, value] of records) writeFileSync(path.join(generationRoot, name), record(value));
        writeFileSync(
          path.join(generationRoot, 'cutoff-witness.json'),
          record({
            schema: 'VidaNewWorkCutoffWitness/v1',
            generation,
            selector_sha256: createHash('sha256').update(record(selector)).digest('hex'),
            first_admitted_work_attempt: null,
          }),
        );
        expect((await selectedRun(args)).runtime_selector_observed).toBe(true);
        for (const [name, value, changed, message] of records) {
          const file = path.join(generationRoot, name);
          writeFileSync(file, record({ ...value, ...changed }));
          await expect(selectedRun(args)).rejects.toMatchObject({ code: 'GAP-VIDA-RUN-SELECTOR-001', message });
          writeFileSync(file, record(value));
        }
        const retainedPath = path.join(generationRoot, 'maintenance-lock.released.v1.json');
        const releasePath = path.join(generationRoot, 'maintenance-release.v1.json');
        for (const [field, value] of [
          ['cutover_id', 'other-generation'],
          ['plan_sha256', 'd'.repeat(64)],
          ['archive_manifest_sha256', 'd'.repeat(64)],
          ['payload_manifest_sha256', 'd'.repeat(64)],
        ]) {
          const changedLock = { ...releasedLock, [field]: value };
          writeFileSync(retainedPath, record(changedLock));
          writeFileSync(
            releasePath,
            record({ ...release, lock_sha256: createHash('sha256').update(record(changedLock)).digest('hex') }),
          );
          await expect(selectedRun(args)).rejects.toMatchObject({
            code: 'GAP-VIDA-RUN-SELECTOR-001',
            message: 'Cutover maintenance release proof is invalid.',
          });
          writeFileSync(retainedPath, record(releasedLock));
          writeFileSync(releasePath, record(release));
        }
        for (const changed of [{ cutover_id: 'other-generation' }, { status: 'not-released' }]) {
          writeFileSync(releasePath, record({ ...release, ...changed }));
          await expect(selectedRun(args)).rejects.toMatchObject({
            code: 'GAP-VIDA-RUN-SELECTOR-001',
            message: 'Cutover maintenance release proof is invalid.',
          });
          writeFileSync(releasePath, record(release));
        }
        const cutoffPath = path.join(generationRoot, 'cutoff-witness.json');
        const witness = JSON.parse(readFileSync(cutoffPath, 'utf8'));
        unlinkSync(cutoffPath);
        await expect(selectedRun(args)).rejects.toMatchObject({
          code: 'GAP-VIDA-RUN-CUTOFF-001',
          message: 'Cutoff witness is missing.',
        });
        for (const [changed, message] of [
          [{ generation: 'other-generation' }, 'Cutoff witness is bound to another selector.'],
          [{ selector_sha256: 'd'.repeat(64) }, 'Cutoff witness is bound to another selector.'],
          [{ first_admitted_work_attempt: '' }, 'Cutoff witness identity is invalid.'],
          [{ first_admitted_work_attempt: 0 }, 'Cutoff witness identity is invalid.'],
        ]) {
          writeFileSync(cutoffPath, record({ ...witness, ...changed }));
          await expect(selectedRun(args)).rejects.toMatchObject({ code: 'GAP-VIDA-RUN-CUTOFF-001', message });
        }
        writeFileSync(cutoffPath, record(witness));
        const cutoffLock = path.join(generationRoot, 'cutoff-witness.lock');
        writeFileSync(cutoffLock, 'held');
        await expect(selectedRun(args)).rejects.toMatchObject({
          code: 'GAP-VIDA-RUN-CUTOFF-001',
          message: 'Cutoff witness is held or unsafe.',
        });
        unlinkSync(cutoffLock);
        writeFileSync(
          path.join(root, '.agent', 'active-runtime-selector.v1.json'),
          record({
            ...selector,
            plan_sha256: 'd'.repeat(64),
          }),
        );
        await expect(selectedRun(args)).rejects.toMatchObject({ code: 'GAP-VIDA-RUN-SELECTOR-001' });
        const stagedGeneration = `staged-${randomUUID()}`;
        const stagedRoot = path.join(root, '.agent', 'cutover', stagedGeneration);
        mkdirSync(stagedRoot);
        const stagedSelector = { ...selector, generation: stagedGeneration };
        delete stagedSelector.payload_manifest_sha256;
        delete stagedSelector.state_policy;
        const stagedJournal = {
          schema: 'VidaCutoverStageJournal/v1',
          cutover_id: stagedGeneration,
          plan_sha256: stagedSelector.plan_sha256,
          archive_manifest_sha256: stagedSelector.archive_manifest_sha256,
          selector_sha256: createHash('sha256').update(record(stagedSelector)).digest('hex'),
          status: 'staged',
        };
        const stagedLock = { ...releasedLock, cutover_id: stagedGeneration };
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
        expect((await selectedRun(stagedArgs)).runtime_selector_observed).toBe(true);
        for (const changed of [
          { cutover_id: 'other-generation' },
          { plan_sha256: 'd'.repeat(64) },
          { archive_manifest_sha256: 'd'.repeat(64) },
          { selector_sha256: 'd'.repeat(64) },
          { status: 'not-staged' },
        ]) {
          writeFileSync(stagedJournalPath, record({ ...stagedJournal, ...changed }));
          await expect(selectedRun(stagedArgs)).rejects.toMatchObject({
            code: 'GAP-VIDA-RUN-SELECTOR-001',
            message: 'Cutover journal is incomplete.',
          });
        }
      } finally {
        if (existsSync(dependenciesLink)) unlinkSync(dependenciesLink);
        rmSync(root, { recursive: true, force: true });
      }
    });
  });
}
