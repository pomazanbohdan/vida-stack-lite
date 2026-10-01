import { afterAll, expect, test } from 'bun:test';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const isolatedRoot = process.env.VIDA_CLEAR_BUNDLE ? null : mkdtempSync(path.join(tmpdir(), 'vida-clear-package-'));
const bundle = process.env.VIDA_CLEAR_BUNDLE ?? path.join(isolatedRoot, 'vida-agent');
if (isolatedRoot) {
  mkdirSync(bundle);
  for (const entry of ['src', 'dist', 'bin', 'schemas', 'instructions', 'templates', 'package.json', 'TESTING.md'])
    cpSync(path.join(packageRoot, entry), path.join(bundle, entry), { recursive: true });
  symlinkSync(
    path.join(packageRoot, 'node_modules'),
    path.join(bundle, 'node_modules'),
    process.platform === 'win32' ? 'junction' : 'dir',
  );
}
afterAll(() => {
  if (isolatedRoot) rmSync(isolatedRoot, { recursive: true, force: true });
});
const write = (root, relative, content) => {
  const file = path.join(root, relative);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content);
};
const run = (root, mode) => {
  if (!bundle || !path.isAbsolute(bundle))
    throw new Error('VIDA_CLEAR_BUNDLE must name an absolute isolated built bundle');
  const result = spawnSync(
    process.execPath,
    [
      path.join(bundle, 'bin/documentation-clear.mjs'),
      '--mode',
      mode,
      '--project-root',
      root,
      '--repository',
      'creatio-sample-repository',
      '--project',
      'refactoring',
      '--work-id',
      'doc-clear-test',
      '--source-revision',
      'revision-one',
    ],
    { cwd: bundle, encoding: 'utf8', timeout: 30_000 },
  );
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
};
const sha = (value) => createHash('sha256').update(value).digest('hex');
const initializeFixture = (root, { localSchemas = true } = {}) => {
  mkdirSync(path.join(root, '.git'));
  for (const [destination, template] of [
    ['AGENTS.md', 'AGENTS.template.md'],
    ['AGENT.sidecar.md', 'AGENT.sidecar.template.md'],
    ['agent-runtime.config.v1.yaml', 'agent-runtime.config.template.v1.yaml'],
  ])
    write(
      root,
      destination,
      readFileSync(path.join(packageRoot, 'templates', template), 'utf8')
        .replaceAll('{{REPOSITORY}}', 'creatio-sample-repository')
        .replaceAll('{{PROJECTS}}', 'refactoring')
        .replaceAll('{{PROJECT}}', 'refactoring')
        .replaceAll('{{BUNDLE}}', 'vida-agent'),
    );
  if (localSchemas) {
    mkdirSync(path.join(root, 'vida-agent/schemas'), { recursive: true });
    for (const name of ['documentation-policy', 'documentation-change-event'])
      cpSync(
        path.join(packageRoot, `schemas/${name}.v1.schema.json`),
        path.join(root, `vida-agent/schemas/${name}.v1.schema.json`),
      );
    write(root, 'vida-agent/TESTING.md', 'fixture testing\n');
  }
};

test('public CLEAR uses package policy schema without local assets and rejects consumer schema overrides', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-clear-package-schema-'));
  try {
    initializeFixture(root, { localSchemas: false });
    expect(existsSync(path.join(root, 'vida-agent'))).toBe(false);
    const policy = {
      schema: 'DocumentationPolicy/v1',
      policy_id: 'clear-package-schema',
      project_id: 'refactoring',
      source_path: 'docs/agent-instructions/documentation-policy.v1.json',
      owner: 'project:refactoring',
      required: true,
      canonical_roots: ['docs/agent-instructions'],
      map_paths: ['docs/agent-instructions/index.md'],
      excluded_roots: ['.agent', '.planning'],
      changelog_required: false,
      changelog_path: null,
      relations: ['owns'],
      updated_at: new Date().toISOString(),
    };
    write(root, policy.source_path, JSON.stringify(policy) + '\n');
    write(root, policy.map_paths[0], 'Current map\n');
    write(root, 'docs/agent-instructions/current.md', 'Current policy-governed document\n');
    write(
      root,
      '.agent/work/doc-clear-test/scope.json',
      JSON.stringify({
        schema: 'ImplementationScope/v1',
        work_id: 'doc-clear-test',
        source_revision: 'revision-one',
        allowed_paths: ['docs/agent-instructions/current.md'],
      }) + '\n',
    );
    const accepted = run(root, 'baseline');
    expect(accepted.status, accepted.stderr).toBe(0);
    expect(existsSync(path.join(root, 'vida-agent'))).toBe(false);
    const invalidPolicy = { ...policy, unexpected_contract_override: true };
    write(root, policy.source_path, JSON.stringify(invalidPolicy) + '\n');
    const rejected = run(root, 'baseline');
    expect(rejected.status).toBe(1);
    expect(rejected.stderr).toContain('documentation policy schema invalid');
    write(root, 'vida-agent/schemas/documentation-policy.v1.schema.json', '{}\n');
    const acceptanceShadow = run(root, 'baseline');
    expect(acceptanceShadow.status).toBe(1);
    expect(acceptanceShadow.stderr).toContain('documentation policy schema invalid');
    write(root, policy.source_path, JSON.stringify(policy) + '\n');
    write(root, 'vida-agent/schemas/documentation-policy.v1.schema.json', 'false\n');
    const denialShadow = run(root, 'baseline');
    expect(denialShadow.status, denialShadow.stderr).toBe(0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}, 60_000);

test('authorized new document passes baseline but closeout requires existence and typed init lineage', () => {
  if (!bundle) throw new Error('VIDA_CLEAR_BUNDLE must name an isolated built bundle');
  const root = mkdtempSync(path.join(tmpdir(), 'vida-clear-create-'));
  try {
    initializeFixture(root);
    const governed = 'docs/agent-instructions/new.md';
    const policy = {
      schema: 'DocumentationPolicy/v1',
      policy_id: 'clear-creation',
      project_id: 'refactoring',
      source_path: 'docs/agent-instructions/documentation-policy.v1.json',
      owner: 'project:refactoring',
      required: true,
      canonical_roots: ['docs/agent-instructions'],
      map_paths: ['docs/agent-instructions/index.md'],
      excluded_roots: ['.agent', '.planning'],
      changelog_required: true,
      changelog_path: 'docs/agent-instructions/agent-instructions.changelog.jsonl',
      relations: ['owns'],
      updated_at: new Date().toISOString(),
    };
    write(root, policy.source_path, JSON.stringify(policy) + '\n');
    write(root, policy.map_paths[0], 'Current documentation map\n');
    write(root, policy.changelog_path, '');
    write(
      root,
      '.agent/work/doc-clear-test/scope.json',
      JSON.stringify({
        schema: 'ImplementationScope/v1',
        work_id: 'doc-clear-test',
        source_revision: 'revision-one',
        allowed_paths: [governed],
      }) + '\n',
    );
    const baseline = run(root, 'baseline');
    expect(baseline.status, baseline.stderr).toBe(0);
    const baselineCheckpoint = JSON.parse(readFileSync(path.join(root, JSON.parse(baseline.stdout).path), 'utf8'));
    expect(baselineCheckpoint.status).toBe('pass');
    expect(baselineCheckpoint.documents.some((document) => document.path === governed)).toBe(false);
    const absent = run(root, 'closeout');
    expect(absent.status).toBe(1);
    expect(absent.stderr).toContain('GAP-DOCUMENTATION-SCOPE-001');
    const body = 'Authorized new document\n';
    write(root, governed, body);
    const noInit = run(root, 'closeout');
    expect(noInit.status).toBe(1);
    expect(noInit.stderr).toContain('GAP-DOCUMENTATION-CHANGELOG-001');
    const event = {
      schema: 'DocumentationChangeEvent/v1',
      event_id: 'init-1',
      logical_edit_id: 'init-1',
      work_id: 'doc-clear-test',
      source_revision: 'revision-one',
      operation: 'init',
      document_id: governed,
      path_before: null,
      path_after: governed,
      before_sha256: '0'.repeat(64),
      after_sha256: sha(body),
      actor: 'test',
      pointer: 'test:init-1',
      timestamp: new Date().toISOString(),
    };
    write(root, policy.changelog_path, JSON.stringify(event) + '\n');
    const closeout = run(root, 'closeout');
    expect(closeout.status, closeout.stderr).toBe(0);
    const verify = run(root, 'verify');
    expect(verify.status, verify.stderr).toBe(0);
    expect(JSON.parse(verify.stdout).status).toBe('verified');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}, 60_000);

test('public documentation CLEAR command binds baseline and closeout to current project files', () => {
  if (!bundle) throw new Error('VIDA_CLEAR_BUNDLE must name an isolated built bundle');
  const root = mkdtempSync(path.join(tmpdir(), 'vida-clear-public-'));
  try {
    initializeFixture(root);
    write(root, 'docs/creatio/map.md', 'map\n');
    write(root, 'docs/agent-instructions/index.md', '[Change lineage](agent-instructions.changelog.jsonl)\n');
    write(root, 'docs/agent-instructions/current.md', 'current\n');
    const policy = {
      schema: 'DocumentationPolicy/v1',
      policy_id: 'clear-fixture',
      project_id: 'refactoring',
      source_path: 'docs/agent-instructions/documentation-policy.v1.json',
      owner: 'project:refactoring',
      required: true,
      canonical_roots: ['docs/agent-instructions'],
      map_paths: ['docs/agent-instructions/index.md'],
      excluded_roots: ['.agent', '.planning', 'docs/agent-instructions/agent-instructions.changelog.jsonl'],
      changelog_required: true,
      changelog_path: 'docs/agent-instructions/agent-instructions.changelog.jsonl',
      relations: ['owns'],
      updated_at: new Date().toISOString(),
    };
    write(root, policy.source_path, JSON.stringify(policy) + '\n');
    expect(run(root, 'baseline').status).toBe(1);
    write(root, policy.changelog_path, '');
    write(
      root,
      '.agent/work/doc-clear-test/scope.json',
      JSON.stringify({
        schema: 'ImplementationScope/v1',
        work_id: 'doc-clear-test',
        source_revision: 'revision-one',
        allowed_paths: ['docs/agent-instructions/current.md'],
      }) + '\n',
    );
    expect(run(root, 'verify').status).toBe(1);
    expect(run(root, 'closeout').status).toBe(1);
    write(root, policy.source_path, JSON.stringify({ ...policy, project_id: 'foreign-project' }) + '\n');
    expect(run(root, 'baseline').status).toBe(1);
    write(root, policy.source_path, JSON.stringify(policy) + '\n');
    const baseline = run(root, 'baseline');
    expect(baseline.status, baseline.stderr).toBe(0);
    const closeout = run(root, 'closeout');
    expect(closeout.status, closeout.stderr).toBe(0);
    const verified = run(root, 'verify');
    expect(verified.status, verified.stderr).toBe(0);
    expect(JSON.parse(verified.stdout).status).toBe('verified');
    const configPath = path.join(root, 'agent-runtime.config.v1.yaml');
    const originalConfig = readFileSync(configPath, 'utf8');
    writeFileSync(
      configPath,
      originalConfig.replace(
        'documentation_policy_path: docs/agent-instructions/documentation-policy.v1.json',
        'documentation_policy_path: docs/agent-instructions/missing-policy.v1.json',
      ),
    );
    expect(run(root, 'verify').status).toBe(1);
    writeFileSync(configPath, originalConfig);
    write(root, 'docs/agent-instructions/current.md', 'changed\n');
    expect(run(root, 'verify').status).toBe(1);
    write(root, 'docs/agent-instructions/current.md', 'current\n');
    const closeoutPath = path.join(root, JSON.parse(closeout.stdout).path);
    const tampered = JSON.parse(readFileSync(closeoutPath, 'utf8'));
    tampered.status = 'blocked';
    writeFileSync(closeoutPath, JSON.stringify(tampered) + '\n');
    expect(run(root, 'verify').status).toBe(1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}, 60_000);

test('deletion requires a typed event and removal of stale map links, then a new cycle verifies', () => {
  if (!bundle) throw new Error('VIDA_CLEAR_BUNDLE must name an isolated built bundle');
  const root = mkdtempSync(path.join(tmpdir(), 'vida-clear-delete-'));
  try {
    initializeFixture(root);
    const governed = 'docs/agent-instructions/nested/current.md';
    const mapPath = 'docs/agent-instructions/index.md';
    const beforeBody = 'current\n';
    const beforeMap = '[current](nested/current.md)\n';
    write(root, 'docs/creatio/map.md', 'map\n');
    write(root, mapPath, beforeMap);
    write(root, governed, beforeBody);
    const policy = {
      schema: 'DocumentationPolicy/v1',
      policy_id: 'clear-deletion',
      project_id: 'refactoring',
      source_path: 'docs/agent-instructions/documentation-policy.v1.json',
      owner: 'project:refactoring',
      required: true,
      canonical_roots: ['docs/agent-instructions'],
      map_paths: [mapPath],
      excluded_roots: ['.agent', '.planning'],
      changelog_required: true,
      changelog_path: 'docs/agent-instructions/agent-instructions.changelog.jsonl',
      relations: ['owns'],
      updated_at: new Date().toISOString(),
    };
    write(root, policy.source_path, JSON.stringify(policy) + '\n');
    write(root, policy.changelog_path, '');
    write(
      root,
      '.agent/work/doc-clear-test/scope.json',
      JSON.stringify({
        schema: 'ImplementationScope/v1',
        work_id: 'doc-clear-test',
        source_revision: 'revision-one',
        allowed_paths: [mapPath],
      }) + '\n',
    );
    expect(run(root, 'baseline').status).toBe(0);
    const first = run(root, 'closeout');
    expect(first.status, first.stderr).toBe(0);
    expect(run(root, 'baseline').status).toBe(0);
    rmSync(path.join(root, governed));
    expect(run(root, 'closeout').status).toBe(1);
    const timestamp = new Date().toISOString();
    const deletion = {
      schema: 'DocumentationChangeEvent/v1',
      event_id: 'delete-1',
      logical_edit_id: 'delete-1',
      work_id: 'doc-clear-test',
      source_revision: 'revision-one',
      operation: 'delete',
      document_id: governed,
      path_before: governed,
      path_after: null,
      before_sha256: sha(beforeBody),
      after_sha256: '0'.repeat(64),
      actor: 'test',
      pointer: 'test:delete-1',
      timestamp,
    };
    write(root, policy.changelog_path, JSON.stringify(deletion) + '\n');
    expect(run(root, 'closeout').status).toBe(1);
    const afterMap = 'Current document removed.\n';
    write(root, mapPath, afterMap);
    const mapEvent = {
      ...deletion,
      event_id: 'map-1',
      logical_edit_id: 'map-1',
      operation: 'finalize',
      document_id: mapPath,
      path_before: mapPath,
      path_after: mapPath,
      before_sha256: sha(beforeMap),
      after_sha256: sha(afterMap),
      pointer: 'test:map-1',
    };
    write(root, policy.changelog_path, JSON.stringify(deletion) + '\n' + JSON.stringify(mapEvent) + '\n');
    const second = run(root, 'closeout');
    expect(second.status, second.stderr).toBe(0);
    expect(JSON.parse(second.stdout).path).toContain('documentation-closeout-0002.v1.json');
    expect(run(root, 'verify').status).toBe(0);
    expect(readFileSync(path.join(root, JSON.parse(first.stdout).path), 'utf8')).toContain(
      'documentation-clear-doc-clear-test-closeout-0001',
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}, 60_000);
