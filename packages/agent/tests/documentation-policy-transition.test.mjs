import { tmpdir } from 'node:os';
import { afterEach, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, cpSync, rmSync } from 'node:fs';
import path from 'node:path';
import { runReconcileArtifacts } from '../bin/reconcile-artifacts.mjs';
import { loadRuntimeConfig } from '../src/config/runtime-config.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';
import { HostStateStore } from '../src/host-state.ts';
import { snapshotDeclaredSources } from '../src/orchestration/scoped-source-snapshot.ts';
import { executeDocumentationClearFromWork } from '../src/documentation/clear.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import {
  validatePolicyMapAddition,
  parseDocumentationPolicyTransition,
} from '../src/documentation/policy-transition.ts';

const policy = {
  schema: 'DocumentationPolicy/v1',
  source_path: 'docs/policy.json',
  owner: 'project:fixture',
  map_paths: ['docs/map.md'],
  updated_at: '2026-09-29T00:00:00.000Z',
  relations: ['documents'],
};
const target = { ...policy, map_paths: [...policy.map_paths, 'bundle/TESTING.md'] };
const bytes = JSON.stringify;

test('policy registration accepts additive maps with every other field exact', () => {
  expect(validatePolicyMapAddition(bytes(policy), bytes(target))).toEqual(['bundle/TESTING.md']);
});
test('policy registration rejects ownership, timestamp and relations changes', () => {
  for (const change of [{ owner: 'different' }, { updated_at: '2026-09-30T00:00:00.000Z' }, { relations: [] }])
    expect(() => validatePolicyMapAddition(bytes(policy), bytes({ ...target, ...change }))).toThrow('non-map');
});
test('policy registration rejects removal, duplicate, reorder and empty additions', () => {
  for (const maps of [[], ['docs/map.md', 'docs/map.md'], policy.map_paths])
    expect(() => validatePolicyMapAddition(bytes(policy), bytes({ ...policy, map_paths: maps }))).toThrow();
  const before = { ...policy, map_paths: ['docs/a.md', 'docs/b.md'] };
  expect(() =>
    validatePolicyMapAddition(
      bytes(before),
      bytes({ ...before, map_paths: ['docs/b.md', 'docs/a.md', 'bundle/TESTING.md'] }),
    ),
  ).toThrow('order');
});
test('policy transition parser rejects unknown fields and incomplete forged closure', () => {
  expect(() =>
    parseDocumentationPolicyTransition(
      Buffer.from(
        bytes({
          schema: 'DocumentationPolicyTransition/v1',
          phase: 'applied',
          maintenance_released: true,
          unexpected: true,
        }),
      ),
    ),
  ).toThrow('schema');
});

const fixtureRoots = [];
afterEach(() => {
  for (const root of fixtureRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function fixture() {
  const bundle = process.env.VIDA_POLICY_TEST_BUNDLE ?? path.resolve(import.meta.dirname, '..');
  const scratch = process.env.VIDA_DOCUMENTATION_POLICY_FIXTURE_ROOT ?? tmpdir();
  if (!scratch || !path.isAbsolute(scratch)) throw Error('absolute private fixture root required');
  mkdirSync(scratch, { recursive: true });
  const root = mkdtempSync(path.join(scratch, 'policy-'));
  fixtureRoots.push(root);
  const put = (file, content) => {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), content);
  };
  mkdirSync(path.join(root, '.git'));
  const template = (file) =>
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
  cpSync(path.join(bundle, 'schemas'), path.join(root, 'vida-agent/schemas'), { recursive: true });
  const policyPath = 'docs/agent-instructions/documentation-policy.v1.json';
  const oldPolicy = {
    ...JSON.parse(template('documentation-policy.template.v1.json')),
    required: true,
    changelog_required: true,
    changelog_path: 'docs/agent-instructions/events.jsonl',
    map_paths: ['vida-agent/instructions/development-lifecycle.md'],
  };
  const json = (value) => JSON.stringify(value, null, 2) + '\n';
  put(policyPath, json(oldPolicy));
  put(oldPolicy.changelog_path, '');
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
    files = [policyPath, 'vida-agent/TESTING.md', 'vida-agent/instructions/development-lifecycle.md'];
  return { root, put, config, workspace, policyPath, oldPolicy, json, work, files, bundle };
}

export async function preparedFixture() {
  const f = fixture(),
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
  const args = (mode) => [
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

test('public policy transition preserves genuine baseline and completes one audited cycle', async () => {
  const { f, input, baseline, before, targetPolicy, args } = await preparedFixture();
  expect((await runReconcileArtifacts(args('inspect'))).status).toBe('inspect_ready_unauthorized');
  expect((await runReconcileArtifacts(args('plan'))).status).toBe('planned');
  expect((await runReconcileArtifacts(args('apply'))).status).toBe('author_policy_required');
  expect(readFileSync(path.join(f.root, f.policyPath), 'utf8')).toBe(f.json(f.oldPolicy));
  f.put(f.policyPath, targetPolicy);
  expect((await runReconcileArtifacts(args('resume'))).status).toBe('applied');
  const lineage = readFileSync(path.join(f.root, f.oldPolicy.changelog_path), 'utf8');
  expect(lineage.trim().split('\n')).toHaveLength(1);
  expect((await runReconcileArtifacts(args('resume'))).status).toBe('applied');
  expect(readFileSync(path.join(f.root, f.oldPolicy.changelog_path), 'utf8')).toBe(lineage);
  expect(readFileSync(path.join(f.root, baseline.path)).equals(before)).toBe(true);
  expect((await executeDocumentationClearFromWork(input, 'verify')).status).toBe('verified');
  await expect(runReconcileArtifacts(args('restore'))).rejects.toThrow('rollback');
}, 30000);

for (const phase of ['fence_acquired', 'events_frozen', 'events_published', 'applied', 'released']) {
  test(`public policy transition resumes interruption at ${phase} without duplicate lineage`, async () => {
    const { f, input, baseline, before, targetPolicy, args } = await preparedFixture();
    await runReconcileArtifacts(args('plan'));
    const fault = {
      onPhase: (actual) => {
        if (actual === phase) throw Error('fixture interruption');
      },
    };
    if (phase === 'fence_acquired') {
      await expect(runReconcileArtifacts(args('apply'), fault)).rejects.toThrow('fixture interruption');
      expect((await runReconcileArtifacts(args('resume'))).status).toBe('author_policy_required');
      f.put(f.policyPath, targetPolicy);
    } else {
      await runReconcileArtifacts(args('apply'));
      f.put(f.policyPath, targetPolicy);
      await expect(runReconcileArtifacts(args('resume'), fault)).rejects.toThrow('fixture interruption');
    }
    expect((await runReconcileArtifacts(args('resume'))).status).toBe('applied');
    const lineage = readFileSync(path.join(f.root, f.oldPolicy.changelog_path), 'utf8');
    expect(lineage.trim().split('\n')).toHaveLength(1);
    expect((await executeDocumentationClearFromWork(input, 'verify')).status).toBe('verified');
    expect(readFileSync(path.join(f.root, baseline.path)).equals(before)).toBe(true);
  }, 30000);
}

test('public CLEAR rejects forged phase, events and closure references', async () => {
  const { f, input, targetPolicy, args } = await preparedFixture();
  await runReconcileArtifacts(args('plan'));
  await runReconcileArtifacts(args('apply'));
  f.put(f.policyPath, targetPolicy);
  await expect(
    runReconcileArtifacts(args('resume'), {
      onPhase: (phase) => {
        if (phase === 'events_published') throw Error('before closeout');
      },
    }),
  ).rejects.toThrow('before closeout');
  const file = `.agent/work/${f.work}/documentation-policy-transition.v1.json`,
    original = readFileSync(path.join(f.root, file), 'utf8');
  const forged = JSON.parse(original);
  forged.phase = 'applied';
  forged.maintenance_released = true;
  delete forged.operation_digest;
  forged.operation_digest = canonicalJsonDigest(forged);
  f.put(file, f.json(forged));
  await expect(executeDocumentationClearFromWork(input, 'closeout')).rejects.toThrow('closeout reference');
  f.put(file, original);
  await runReconcileArtifacts(args('resume'));
  const applied = readFileSync(path.join(f.root, file), 'utf8');
  for (const mutation of [
    (record) => {
      record.events[0].bytes = record.events[0].bytes.replace('finalize', 'init');
    },
    (record) => {
      record.closeout.sha256 = '0'.repeat(64);
    },
  ]) {
    const record = JSON.parse(applied);
    mutation(record);
    delete record.operation_digest;
    record.operation_digest = canonicalJsonDigest(record);
    f.put(file, f.json(record));
    await expect(executeDocumentationClearFromWork(input, 'verify')).rejects.toThrow();
  }
  f.put(file, applied);
  expect((await executeDocumentationClearFromWork(input, 'verify')).status).toBe('verified');
}, 30000);

test('public policy planning denies an extra or substituted map outside exact scope', async () => {
  const { f, targetPath, args } = await preparedFixture();
  for (const additions of [['docs/unapproved.md'], ['vida-agent/TESTING.md', 'docs/unapproved.md']]) {
    f.put(targetPath, f.json({ ...f.oldPolicy, map_paths: [...f.oldPolicy.map_paths, ...additions] }));
    await expect(runReconcileArtifacts(args('plan'))).rejects.toThrow('exact accepted documentation scope');
  }
}, 30000);
