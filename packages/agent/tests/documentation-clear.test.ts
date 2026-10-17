import { expect, test } from 'bun:test';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { isUnknownSynchronousChild } from './helpers/synchronous-child-outcome.ts';
import { canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import { expectAsyncReturned, expectRejection, expectReturned } from './helpers/expect-rejection.ts';
import { runDocumentationClear } from '../bin/documentation-clear.ts';

type Mode = 'baseline' | 'closeout' | 'verify';

interface RunResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Development CLI checks execute package Source; spawned children do not prove native formation or coverage.
const bundle = process.env.VIDA_CLEAR_BUNDLE ?? packageRoot;
if (!path.isAbsolute(bundle)) throw new Error('VIDA_CLEAR_BUNDLE must name an absolute CLI package root');
const unknownFixtureRoots = new Set<string>();
const disposeFixture = (root: string): void => {
  if (unknownFixtureRoots.has(root)) console.error(`Preserved UNKNOWN CLEAR fixture at ${root}`);
  else rmSync(root, { recursive: true, force: true });
};
const write = (root: string, relative: string, content: string): void => {
  const file = path.join(root, relative);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content);
};
const run = (root: string, mode: Mode): RunResult => {
  const result = spawnSync(
    process.execPath,
    [
      path.join(bundle, 'bin/documentation-clear.ts'),
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
  if (isUnknownSynchronousChild(result)) {
    unknownFixtureRoots.add(root);
    throw new Error(
      `UNKNOWN CLEAR child: pid=${result.pid} status=${result.status} signal=${result.signal} error=${String(result.error)}; retained fixture=${root}`,
      { cause: result.error },
    );
  }
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
};
const successful = (operation: () => RunResult): Record<string, unknown> => {
  const result = expectReturned(operation);
  expect(result.status, result.stderr).toBe(0);
  expect(typeof result.stdout).toBe('string');
  if (typeof result.stdout !== 'string') throw new Error('Expected documentation CLEAR success JSON.');
  const value: unknown = JSON.parse(result.stdout);
  expect(value !== null && typeof value === 'object' && !Array.isArray(value)).toBe(true);
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Documentation CLEAR success result must be an object.');
  const record = value as Record<string, unknown>;
  expect(typeof record.status).toBe('string');
  expect(typeof record.path).toBe('string');
  expect(typeof record.sha256).toBe('string');
  expect(typeof record.checkpoint_digest).toBe('string');
  return record;
};
const sha = (value: string): string => createHash('sha256').update(value).digest('hex');
const initializeFixture = (root: string, { localSchemas = true }: { localSchemas?: boolean } = {}): void => {
  mkdirSync(path.join(root, '.git'));
  for (const [destination, template] of [
    ['AGENTS.md', 'AGENTS.template.md'],
    ['AGENT.sidecar.md', 'AGENT.sidecar.template.md'],
    ['agent-runtime.config.v1.yaml', 'agent-runtime.config.template.v1.yaml'],
  ] as const)
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
      map_paths: ['docs/agent-instructions/index.md'] as const,
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
    disposeFixture(root);
  }
}, 60_000);

test('authorized new document passes baseline but closeout requires existence and typed init lineage', () => {
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
      map_paths: ['docs/agent-instructions/index.md'] as const,
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
    const baselineCheckpoint = JSON.parse(
      readFileSync(path.join(root, (JSON.parse(baseline.stdout ?? '') as { path: string }).path), 'utf8'),
    ) as {
      status: string;
      documents: Array<{ path: string }>;
    };
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
    expect((JSON.parse(verify.stdout ?? '') as { status: string }).status).toBe('verified');
  } finally {
    disposeFixture(root);
  }
}, 60_000);

test('public documentation CLEAR command binds baseline and closeout to current project files', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-clear-public-'));
  let passed = false;
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
      map_paths: ['docs/agent-instructions/index.md'] as const,
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
    const baseline = successful(() => run(root, 'baseline'));
    expect(baseline.path).toBe('.agent/work/doc-clear-test/documentation-baseline-0001.v1.json');
    const baselinePath = path.join(root, baseline.path as string);
    const baselineBytes = readFileSync(baselinePath);
    expect(baseline.sha256).toBe(sha(baselineBytes.toString('utf8')));
    const baselineValue: unknown = JSON.parse(baselineBytes.toString('utf8'));
    expect(baselineValue !== null && typeof baselineValue === 'object' && !Array.isArray(baselineValue)).toBe(true);
    if (!baselineValue || typeof baselineValue !== 'object' || Array.isArray(baselineValue))
      throw new Error('Expected persisted documentation baseline object.');
    const baselineRecord = baselineValue as Record<string, unknown>;
    expect(baselineRecord.digest).toBe(baseline.checkpoint_digest);
    const closeoutPath = '.agent/work/doc-clear-test/documentation-closeout-0001.v1.json';
    for (const [key, foreign] of [
      ['repository_id', 'foreign-repository'],
      ['project_id', 'foreign-project'],
      ['policy_id', 'foreign-policy'],
    ] as const) {
      const { digest: _digest, ...baselineBody } = baselineRecord;
      const forgedBody = { ...baselineBody, [key]: foreign };
      writeFileSync(
        baselinePath,
        JSON.stringify({ ...forgedBody, digest: canonicalJsonDigest(forgedBody) }, null, 2) + '\n',
      );
      const rejectedForeignBaseline = run(root, 'closeout');
      expect(rejectedForeignBaseline.status).toBe(1);
      expect(rejectedForeignBaseline.stderr).toContain('GAP-DOCUMENTATION-BASELINE-STALE-001');
      expect(existsSync(path.join(root, closeoutPath))).toBe(false);
      writeFileSync(baselinePath, baselineBytes);
    }
    const closeout = successful(() => run(root, 'closeout'));
    expect(closeout.path).toBe(closeoutPath);
    const closeoutBytes = readFileSync(path.join(root, closeoutPath));
    expect(closeout.sha256).toBe(sha(closeoutBytes.toString('utf8')));
    const closeoutValue: unknown = JSON.parse(closeoutBytes.toString('utf8'));
    expect(closeoutValue !== null && typeof closeoutValue === 'object' && !Array.isArray(closeoutValue)).toBe(true);
    if (!closeoutValue || typeof closeoutValue !== 'object' || Array.isArray(closeoutValue))
      throw new Error('Expected persisted documentation closeout object.');
    expect((closeoutValue as Record<string, unknown>).digest).toBe(closeout.checkpoint_digest);
    const verified = successful(() => run(root, 'verify'));
    expect(verified.status).toBe('verified');
    expect(verified.path).toBe(closeout.path);
    expect(verified.sha256).toBe(closeout.sha256);
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
    const staleVerify = run(root, 'verify');
    expect(staleVerify.status).toBe(1);
    expect(staleVerify.stderr.trim()).toBe('documentation CLEAR inventory_digest is stale');
    expect(readFileSync(path.join(root, closeoutPath))).toEqual(closeoutBytes);
    write(root, 'docs/agent-instructions/current.md', 'current\n');
    const persistedCloseoutPath = path.join(root, closeout.path as string);
    const tampered = JSON.parse(readFileSync(persistedCloseoutPath, 'utf8')) as { status: string };
    tampered.status = 'blocked';
    writeFileSync(persistedCloseoutPath, JSON.stringify(tampered) + '\n');
    const invalidDigestVerify = run(root, 'verify');
    expect(invalidDigestVerify.status).toBe(1);
    expect(invalidDigestVerify.stderr.trim()).toBe('documentation CLEAR checkpoint digest invalid');
    passed = true;
  } finally {
    if (passed) disposeFixture(root);
    else console.error(`Retained failed documentation CLEAR fixture: ${root}`);
  }
}, 60_000);

test('deletion requires a typed event and removal of stale map links, then a new cycle verifies', () => {
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
    expect((JSON.parse(second.stdout ?? '') as { path: string }).path).toContain('documentation-closeout-0002.v1.json');
    expect(run(root, 'verify').status).toBe(0);
    expect(readFileSync(path.join(root, (JSON.parse(first.stdout ?? '') as { path: string }).path), 'utf8')).toContain(
      'documentation-clear-doc-clear-test-closeout-0001',
    );
  } finally {
    disposeFixture(root);
  }
}, 60_000);

test('closeout rejects an otherwise current baseline whose status is blocked', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-clear-blocked-baseline-'));
  let passed = false;
  try {
    initializeFixture(root);
    const policy = {
      schema: 'DocumentationPolicy/v1',
      policy_id: 'clear-blocked-baseline',
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
    write(root, policy.map_paths[0]!, 'Current documentation map\n');
    write(root, 'docs/agent-instructions/current.md', 'Current governed document\n');
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
    const baselineResult = successful(() => run(root, 'baseline'));
    const baselinePath = path.join(root, baselineResult.path as string);
    const baselineBytes = readFileSync(baselinePath);
    const parsed: unknown = JSON.parse(baselineBytes.toString('utf8'));
    expect(parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)).toBe(true);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
      throw new Error('Expected persisted documentation baseline object.');
    const { digest: _oldDigest, ...baselineBody } = parsed as Record<string, unknown>;
    const blockedBody = { ...baselineBody, status: 'blocked' as const };
    const blockedBaseline: Record<string, unknown> = { ...blockedBody, digest: canonicalJsonDigest(blockedBody) };
    expect(blockedBaseline.status).toBe('blocked');
    expect(blockedBaseline.phase).toBe('baseline');
    expect(blockedBaseline.repository_id).toBe('creatio-sample-repository');
    expect(blockedBaseline.project_id).toBe('refactoring');
    expect(blockedBaseline.work_id).toBe('doc-clear-test');
    expect(blockedBaseline.source_revision).toBe('revision-one');
    writeFileSync(baselinePath, JSON.stringify(blockedBaseline, null, 2) + '\n');
    const blockedBytes = readFileSync(baselinePath);

    const closeout = run(root, 'closeout');
    expect(closeout.status).toBe(1);
    expect(closeout.stderr.trim()).toBe('documentation CLEAR blocked: GAP-DOCUMENTATION-BASELINE-STALE-001');
    expect(readFileSync(baselinePath)).toEqual(blockedBytes);
    expect(existsSync(path.join(root, '.agent/work/doc-clear-test/documentation-closeout-0001.v1.json'))).toBe(false);
    expect(readFileSync(baselinePath)).not.toEqual(baselineBytes);
    passed = true;
  } finally {
    if (passed) disposeFixture(root);
    else console.error(`Retained failed blocked-baseline CLEAR fixture: ${root}`);
  }
}, 60_000);

test('CLEAR command parser rejects malformed invocations and accepts a complete public baseline request', async () => {
  const required = [
    '--mode',
    'baseline',
    '--project-root',
    path.join(tmpdir(), 'vida-clear-parser-project'),
    '--repository',
    'creatio-sample-repository',
    '--project',
    'refactoring',
    '--work-id',
    'cli-clear',
    '--source-revision',
    'revision-one',
  ];
  const malformedCases: ReadonlyArray<readonly [readonly string[], string]> = [
    [[], 'documentation CLEAR missing --mode'],
    [['--unknown', 'value'], 'documentation CLEAR arguments invalid'],
    [['--mode'], 'documentation CLEAR arguments invalid'],
    [['--mode', 'baseline', '--mode', 'closeout'], 'documentation CLEAR arguments invalid'],
    [required.map((value, index) => (index === 1 ? 'unknown' : value)), 'documentation CLEAR mode invalid'],
    [required.map((value, index) => (index === 3 ? 'relative' : value)), 'documentation project root must be absolute'],
    [required.map((value, index) => (index === 9 ? '../bad' : value)), 'documentation work id invalid'],
    [required.slice(0, -2), 'documentation CLEAR missing --source-revision'],
    [required.map((value, index) => (index === 9 ? 'a'.repeat(129) : value)), 'documentation work id invalid'],
  ];
  for (const [args, message] of malformedCases) await expectRejection(runDocumentationClear(args), message);

  const root = mkdtempSync(path.join(tmpdir(), 'vida-clear-cli-direct-'));
  let completed = false;
  try {
    initializeFixture(root);
    const policy = {
      schema: 'DocumentationPolicy/v1',
      policy_id: 'cli-direct',
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
    write(root, policy.map_paths[0]!, 'Current documentation map\n');
    write(root, 'docs/agent-instructions/current.md', 'Current document\n');
    write(
      root,
      '.agent/work/cli-clear/scope.json',
      JSON.stringify({
        schema: 'ImplementationScope/v1',
        work_id: 'cli-clear',
        source_revision: 'revision-one',
        allowed_paths: ['docs/agent-instructions/current.md'],
      }) + '\n',
    );
    const args = [...required];
    args[3] = root;
    const result = await expectAsyncReturned(() => runDocumentationClear(args));
    expect(result).toMatchObject({
      status: 'pass',
      path: '.agent/work/cli-clear/documentation-baseline-0001.v1.json',
    });
    expect(existsSync(path.join(root, '.agent/work/cli-clear/documentation-baseline-0001.v1.json'))).toBe(true);
    completed = true;
  } finally {
    if (completed) rmSync(root, { recursive: true, force: true });
    else console.error(`Retained failed direct CLEAR command fixture: ${root}`);
  }
});
