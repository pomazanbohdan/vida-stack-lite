import { Database } from 'bun:sqlite';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { loadRuntimeConfig } from '../../src/config/runtime-config.ts';
import { deriveWorkspaceId } from '../../src/workspace-identity.ts';
import { HostStateStore } from '../../src/host-state.ts';
import { snapshotDeclaredSources } from '../../src/orchestration/scoped-source-snapshot.ts';
import { executeDocumentationClearFromWork } from '../../src/documentation/clear.ts';
import { requireSafeRepositoryAccess } from '../../src/config/safe-repository-access.ts';
import { validateDocumentationPolicy } from '../../src/documentation/policy.ts';

export const policy = {
  schema: 'DocumentationPolicy/v1',
  source_path: 'docs/policy.json',
  owner: 'project:fixture',
  map_paths: ['docs/map.md'],
  updated_at: '2026-09-29T00:00:00.000Z',
  relations: ['documents'],
};

type PreparedFixtureOptions = {
  readonly extraMappedDocument?: {
    readonly path: string;
    readonly originalBytes: string;
  };
};

function fixture(options: PreparedFixtureOptions = {}) {
  const bundle = process.env.VIDA_POLICY_TEST_BUNDLE ?? path.resolve(import.meta.dirname, '../..');
  const scratch = process.env.VIDA_DOCUMENTATION_POLICY_FIXTURE_ROOT ?? process.env.TEMP ?? tmpdir();
  if (!scratch || !path.isAbsolute(scratch)) throw Error('absolute private fixture root required');
  mkdirSync(scratch, { recursive: true });
  const root = mkdtempSync(path.join(scratch, 'policy-'));
  const put = (file: string, content: string | Uint8Array) => {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), content);
  };
  mkdirSync(path.join(root, '.git'));
  const template = (file: string) =>
    readFileSync(path.join(bundle, 'templates', file), 'utf8')
      .replaceAll('{{REPOSITORY}}', 'fixture-repository')
      .replaceAll('{{PROJECTS}}', 'fixture-project')
      .replaceAll('{{PROJECT}}', 'fixture-project')
      .replaceAll('{{BUNDLE}}', 'vida-agent')
      .replaceAll('{{CREATED_AT}}', '2026-09-30T00:00:00.000Z');
  put('AGENTS.md', template('AGENTS.template.md'));
  put('AGENT.sidecar.md', template('AGENT.sidecar.template.md'));
  put('agent-runtime.config.v1.yaml', template('agent-runtime.config.template.v1.yaml'));
  for (const file of ['package.json', 'TESTING.md', 'instructions/development-lifecycle.md'])
    put('vida-agent/' + file, readFileSync(path.join(bundle, file)));
  cpSync(path.join(bundle, 'schemas'), path.join(root, 'vida-agent/schemas'), {
    recursive: true,
    filter: (file) => !/^\..+\.cas\.lock(?:\.|$)/u.test(path.basename(file)),
  });
  const policyPath = 'docs/agent-instructions/documentation-policy.v1.json';
  const templatePolicy: unknown = JSON.parse(template('documentation-policy.template.v1.json'));
  const oldPolicy = {
    ...validateDocumentationPolicy(templatePolicy, policyPath),
    required: true,
    changelog_required: true,
    changelog_path: 'docs/agent-instructions/events.jsonl',
    map_paths: [
      'vida-agent/instructions/development-lifecycle.md',
      ...(options.extraMappedDocument ? [options.extraMappedDocument.path] : []),
    ],
  };
  const json = (value: unknown) => JSON.stringify(value, null, 2) + '\n';
  put(policyPath, json(oldPolicy));
  put(oldPolicy.changelog_path, '');
  if (options.extraMappedDocument) put(options.extraMappedDocument.path, options.extraMappedDocument.originalBytes);
  const config = loadRuntimeConfig(root),
    workspace = deriveWorkspaceId(config.repository.repository_id, root);
  mkdirSync(path.join(root, '.agent/work'), { recursive: true });
  const db = new Database(path.join(root, '.agent/work/session-handoff.v1.sqlite'), { create: true, strict: true });
  new HostStateStore(db, workspace, undefined, undefined, undefined, undefined, root);
  db.close();
  put(
    '.agent/active-runtime-selector.v1.json',
    json({ schema: 'ActiveRuntimeSelector/v1', generation: 'fixture-parent', payload_manifest_sha256: '1'.repeat(64) }),
  );
  const work = 'fixture-policy-transition',
    files = [
      policyPath,
      'vida-agent/TESTING.md',
      'vida-agent/instructions/development-lifecycle.md',
      ...(options.extraMappedDocument ? [options.extraMappedDocument.path] : []),
    ];
  return { root, put, config, workspace, policyPath, oldPolicy, json, work, files, bundle, ...options };
}

export async function preparedFixture(options: PreparedFixtureOptions = {}) {
  const f = fixture(options),
    revision = snapshotDeclaredSources(requireSafeRepositoryAccess(f.root), f.files).digest;
  const scope = {
    schema: 'ImplementationScope/v1',
    scope_id: 'scope-fixture-policy',
    work_id: f.work,
    source_revision: revision,
    ac_ids: ['AC-MAP-REGISTRATION'],
    allowed_paths: f.files,
    implementation_paths: f.files,
    documentation_paths: f.files,
    changed_symbols: [],
    non_goals: ['TEST SETUP ONLY'],
    acceptance_trace: ['map registration'],
    behavior_trace: ['public CLEAR'],
    test_trace: ['policy transition test'],
    diagnostic_trace: ['public result'],
    attribution: { thread_id: 'fixture-session', pointer: 'TEST SETUP: authorized policy addition' },
    owner: 'project:fixture',
    created_at: new Date().toISOString(),
  };
  f.put(`.agent/work/${f.work}/scope.json`, f.json(scope));
  const input = {
    repository_root: f.root,
    repository_id: f.config.repository.repository_id,
    project_id: 'fixture-project',
    work_id: f.work,
    source_revision: revision,
  };
  const baseline = await executeDocumentationClearFromWork(input, 'baseline'),
    before = readFileSync(path.join(f.root, baseline.path));
  const targetPolicy = f.json({ ...f.oldPolicy, map_paths: [...f.oldPolicy.map_paths, 'vida-agent/TESTING.md'] });
  const targetPath = `.agent/work/${f.work}/target-policy.json`;
  f.put(targetPath, targetPolicy);
  const args = (mode: string) => [
    '--kind',
    'documentation-policy',
    '--mode',
    mode,
    '--project-root',
    f.root,
    '--repository',
    input.repository_id,
    '--project',
    input.project_id,
    '--work-id',
    f.work,
    '--repair-id',
    'fixture-map-registration',
    ...(['inspect', 'plan'].includes(mode)
      ? [
          '--target-policy',
          targetPath,
          '--baseline',
          baseline.path,
          '--actor',
          scope.owner,
          '--instruction-ref',
          scope.attribution.pointer,
          '--timestamp',
          new Date().toISOString(),
        ]
      : []),
  ];
  return { f, scope, input, baseline, before, targetPolicy, targetPath, args };
}
