import assert from 'node:assert/strict';
import { spawnSync, type SpawnSyncOptionsWithStringEncoding, type SpawnSyncReturns } from 'node:child_process';
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test, { type TestContext } from 'node:test';
import {
  measuredMaxima,
  pushedHead,
  rejectFocusedTests,
  stableInputs,
  verifyStagedObjects,
} from '../../packages/agent/tooling/git-quality-hooks.ts';
import {
  checkPrecommitFixture,
  createPrecommitFixture,
  fixtureGit,
} from '../../packages/agent/tests/helpers/precommit-repository-fixture.ts';

const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const uncertainFixtureRoots = new Set<string>();
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function execute(
  root: string,
  executable: string,
  args: string[],
  options: Omit<SpawnSyncOptionsWithStringEncoding, 'encoding'> = {},
): SpawnSyncReturns<string> {
  const result = spawnSync(executable, args, { cwd: root, encoding: 'utf8', windowsHide: true, ...options });
  if (result.error || result.signal || !Number.isInteger(result.status)) uncertainFixtureRoots.add(root);
  return result;
}
function git(root: string, ...args: string[]): string {
  const result = execute(root, 'git', args);
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}
function temporary(t: TestContext): string {
  const root = mkdtempSync(path.join(tmpdir(), 'vida hook Україна '));
  t.after(() => {
    assert.ok(root.startsWith(path.join(tmpdir(), 'vida hook Україна ')));
    if (uncertainFixtureRoots.has(root)) {
      console.warn('Retained Git fixture with an uncertain child outcome: ' + root);
      return;
    }
    rmSync(root, { recursive: true, force: true });
  });
  return root;
}
function fixture(t: TestContext): string {
  const root = createPrecommitFixture();
  t.after(() => {
    assert.ok(root.startsWith(path.join(tmpdir(), 'vida-knip-gate-')));
    if (uncertainFixtureRoots.has(root)) {
      console.warn('Retained Git fixture with an uncertain child outcome: ' + root);
      return;
    }
    rmSync(root, { recursive: true, force: true });
  });
  for (const file of ['AGENTS.md', 'AGENT.sidecar.md', 'agent-runtime.config.v1.yaml', '.gitattributes'])
    writeFileSync(path.join(root, file), file === '.gitattributes' ? '*.ts text eol=lf\n' : 'Fixture root input\n');
  writeFileSync(path.join(root, '.gitignore'), 'packages/agent/node_modules\n');
  fixtureGit(root, ['add', '.']);
  fixtureGit(root, [
    '-c',
    'user.email=fixture@example.invalid',
    '-c',
    'user.name=Fixture',
    'commit',
    '-qm',
    'fixture controls',
  ]);
  return root;
}

// Complete format/type/lint/focus and partial-stage enforcement is owned by
// packages/agent/tests/git-precommit-entrypoint.test.ts. This file verifies
// indexed-input exclusions, Source drift and report orchestration contracts.
void test('pre-commit checks the index snapshot and excludes an invalid maintained untracked file', async (t: TestContext) => {
  const root = fixture(t);
  const file = 'packages/agent/src/disconnected.ts';
  const bytes = 'export const invalid: number = "not a number";\n';
  writeFileSync(path.join(root, file), bytes);
  await checkPrecommitFixture(root, () => {});
  assert.equal(readFileSync(path.join(root, file), 'utf8'), bytes);
  assert.equal(fixtureGit(root, ['ls-files', '--', file]), '');
});

void test(
  'root instruction, sidecar, YAML and attributes drift invalidate checked inputs',
  { timeout: 30_000 },
  (t: TestContext) => {
    const root = fixture(t);
    const before = stableInputs(root);
    for (const file of ['AGENTS.md', 'AGENT.sidecar.md', 'agent-runtime.config.v1.yaml', '.gitattributes']) {
      const original = readFileSync(path.join(root, file));
      writeFileSync(path.join(root, file), Buffer.concat([original, Buffer.from('Changed\n')]));
      assert.throws(() => stableInputs(root), /Checked inputs differ/);
      writeFileSync(path.join(root, file), original);
      assert.equal(stableInputs(root), before);
    }
  },
);

for (const flag of ['assume-unchanged', 'skip-worktree']) {
  void test(`checked inputs reject drift hidden by ${flag}`, { timeout: 30_000 }, (t: TestContext) => {
    const root = fixture(t);
    for (const file of [
      'AGENTS.md',
      'AGENT.sidecar.md',
      'agent-runtime.config.v1.yaml',
      '.gitattributes',
      'packages/agent/src/index.ts',
    ]) {
      const original = readFileSync(path.join(root, file));
      git(root, 'update-index', '--' + flag, '--', file);
      try {
        assert.doesNotThrow(() => stableInputs(root));
        writeFileSync(path.join(root, file), Buffer.concat([original, Buffer.from('Hidden change\n')]));
        assert.equal(git(root, 'diff', '--name-only', '--', file), '');
        assert.throws(() => stableInputs(root), /Staged bytes or mode changed/);
      } finally {
        writeFileSync(path.join(root, file), original);
        git(root, 'update-index', '--no-' + flag, '--', file);
      }
    }
  });
}

void test(
  'staging validation uses Git path filters and rejects byte or mode changes',
  { timeout: 30_000 },
  (t: TestContext) => {
    const root = fixture(t),
      file = 'packages/agent/src/index.ts';
    const index = git(root, 'ls-files', '--stage', '-z');
    const bytes = Buffer.from('export const initial = 2;\r\n');
    writeFileSync(path.join(root, file), bytes);
    const expected = execute(root, 'git', ['hash-object', '--path=' + file, '--stdin'], { input: bytes });
    assert.equal(expected.status, 0, expected.stderr);
    const objects: Array<[string, string]> = [[file, expected.stdout.trim()]];
    git(root, 'add', '--', file);
    verifyStagedObjects(root, objects, index);
    writeFileSync(path.join(root, 'unrelated.txt'), 'concurrent index change\n');
    git(root, 'add', '--', 'unrelated.txt');
    assert.throws(() => verifyStagedObjects(root, objects, index), /Staged bytes or mode changed/);
    git(root, 'rm', '--cached', '--', 'unrelated.txt');
    verifyStagedObjects(root, objects, index);
    git(root, 'update-index', '--chmod=+x', '--', file);
    assert.throws(() => verifyStagedObjects(root, objects, index), /Staged bytes or mode changed/);
    git(root, 'update-index', '--chmod=-x', '--', file);
    writeFileSync(path.join(root, file), 'export const initial = 3;\n');
    git(root, 'add', '--', file);
    assert.throws(() => verifyStagedObjects(root, objects, index), /Staged bytes or mode changed/);
  },
);

void test('focused-test AST checks catch Bun aliases and namespaces and allow comments and strings', async (t: TestContext) => {
  const root = temporary(t),
    file = path.join(root, 'focused.test.mjs');
  const pkg = path.join(source, 'packages/agent');
  for (const body of [
    "import { test } from 'bun:test'; test.only('x', () => {});",
    "import { test as check } from 'bun:test'; check['only']('x', () => {});",
    "import * as suite from 'bun:test'; suite.test.only('x', () => {});",
    "import { describe as group } from 'vitest'; group.only('x', () => {});",
  ]) {
    writeFileSync(file, body);
    await assert.rejects(rejectFocusedTests(pkg, [file]), /Focused test is forbidden/);
  }
  writeFileSync(
    file,
    "import { test } from 'bun:test'; // test.only('x')\nconst text = 'test.only'; test('ordinary', () => {});\n",
  );
  await rejectFocusedTests(pkg, [file]);
});

void test('all ref rows are checked, deletions ignored, alternate local OIDs denied', () => {
  const head = 'a'.repeat(40),
    zero = '0'.repeat(40);
  assert.equal(
    pushedHead(
      `refs/heads/a ${head} refs/heads/a ${zero}\nrefs/tags/b ${head} refs/tags/b ${head}\nrefs/heads/gone ${zero} refs/heads/gone ${head}\n`,
      head,
    ),
    2,
  );
  assert.equal(pushedHead(`delete ${zero} remote ${head}\n`, head), 0);
  assert.throws(() => pushedHead(`a ${head} b ${zero}\nc ${'b'.repeat(40)} d ${head}\n`, head), /current HEAD/);
  assert.throws(() => pushedHead('invalid row', head), /Malformed/);
});

function currentCrapRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    file: 'src/a.ts',
    start_offset: 0,
    end_offset: 10,
    complexity: 6,
    coverage: 1,
    crap: 6,
    identity: 'src/a.ts#measured',
    maximum_complexity: 10,
    maximum_crap: 10,
    ...overrides,
  };
}
function currentCrapReport(rows: Array<Record<string, unknown>> = [currentCrapRow()]): Record<string, unknown> {
  return {
    schema: 'VidaCrapBudgetReport/v1',
    formula: 'CC^2 * (1 - function_coverage)^3 + CC',
    status: 'pass',
    coverage_run_id: 'coverage-run-0001',
    selector_receipt: { tests: ['tests/a.test.ts'] },
    functions: rows,
  };
}
void test('current CRAP report returns measured maxima and rejects malformed, incomplete, or over-budget rows', () => {
  const inventory = new Map([['src/a.ts:0:10', 6]]);
  assert.deepEqual(measuredMaxima(currentCrapReport(), 0, inventory), { maximum_crap: 6, maximum_complexity: 6 });
  const missingIdentity = currentCrapRow();
  delete missingIdentity.identity;
  const alterations: unknown[] = [
    { ...currentCrapReport(), schema: 'CandidateCrapReport/v1' },
    { ...currentCrapReport(), formula: 'complexity^2 * (1-coverage)^3 + complexity' },
    { ...currentCrapReport(), status: 'fail' },
    currentCrapReport([currentCrapRow({ crap: 5 })]),
    currentCrapReport([currentCrapRow({ coverage: 0.99 })]),
    currentCrapReport([currentCrapRow({ identity: 17 })]),
    currentCrapReport([missingIdentity]),
    currentCrapReport([currentCrapRow({ maximum_crap: 5 })]),
    currentCrapReport([currentCrapRow({ maximum_complexity: 5 })]),
    currentCrapReport([currentCrapRow({ complexity: 11 })]),
    { ...currentCrapReport(), selector_receipt: undefined },
    { ...currentCrapReport(), coverage_run_id: undefined },
  ];
  for (const report of alterations) assert.throws(() => measuredMaxima(report, 0, inventory));
  assert.throws(
    () => measuredMaxima(currentCrapReport(), 0, new Map([...inventory, ['src/a.ts:11:20', 1]])),
    /incomplete/,
  );
  assert.throws(() => measuredMaxima(currentCrapReport(), 0, new Map()), /unmapped|incomplete/);
  assert.throws(() => measuredMaxima(currentCrapReport(), 1, inventory), /Technical CRAP failure/);
  const overComplexity = currentCrapReport([currentCrapRow({ complexity: 11, crap: 11, maximum_crap: 12 })]);
  assert.throws(() => measuredMaxima(overComplexity, 0, new Map([['src/a.ts:0:10', 11]])), /Malformed/);
  assert.throws(
    () => measuredMaxima(currentCrapReport([currentCrapRow(), currentCrapRow()]), 0, inventory),
    /Malformed/,
  );
});

// This fixture replaces the coverage collector only to test pre-push orchestration.
// It builds rows from the real shared function inventory and emits current report
// schemas with a shared run ID; it is not coverage, CRAP, or qualification evidence.
type PipelineOutcome =
  | 'pass'
  | 'collection-failure'
  | 'crap-failure'
  | 'crap-schema'
  | 'coverage-schema'
  | 'run-mismatch'
  | 'input-drift';
function pipelineFixture(t: TestContext, outcome: PipelineOutcome = 'pass'): string {
  const root = fixture(t);
  const pkg = path.join(root, 'packages/agent');
  mkdirSync(path.join(root, '.githooks'), { recursive: true });
  for (const file of [
    '.bun-version',
    'bunfig.toml',
    'tooling/git-quality-hooks.ts',
    'tooling/focused-test-guard.ts',
    'tooling/function-inventory.ts',
    'tooling/environment-path.ts',
  ]) {
    const target = path.join(pkg, file);
    mkdirSync(path.dirname(target), { recursive: true });
    copyFileSync(path.join(source, 'packages/agent', file), target);
  }
  copyFileSync(path.join(source, '.githooks/pre-push'), path.join(root, '.githooks/pre-push'));
  chmodSync(path.join(root, '.githooks/pre-push'), 0o755);
  rmSync(path.join(pkg, 'node_modules'), { recursive: true });
  symlinkSync(
    path.join(source, 'packages/agent/node_modules'),
    path.join(pkg, 'node_modules'),
    process.platform === 'win32' ? 'junction' : 'dir',
  );
  const manifestValue: unknown = JSON.parse(readFileSync(path.join(pkg, 'package.json'), 'utf8'));
  if (!isRecord(manifestValue)) throw new Error('Fixture package manifest must be an object.');
  const scriptsValue = manifestValue.scripts;
  if (!isRecord(scriptsValue)) throw new Error('Fixture package scripts must be an object.');
  manifestValue.scripts = {
    ...scriptsValue,
    'test:coverage:pinned': 'bun tooling/fixture-coverage.mjs',
  };
  writeFileSync(path.join(pkg, 'package.json'), JSON.stringify(manifestValue));
  writeFileSync(path.join(pkg, '.bun-version'), '1.4.2\n');
  writeFileSync(
    path.join(pkg, 'tooling/maintained-source-inventory.ts'),
    "export function maintainedSourceInventory() { return { mutationSources: ['src/initial.ts'] }; }\n",
  );
  writeFileSync(path.join(pkg, 'src/initial.ts'), 'export function measured() { return 1; }\n');
  writeFileSync(
    path.join(pkg, 'tooling/fixture-coverage.mjs'),
    `
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { functionInventory } from './function-inventory.ts';
const outcome = ${JSON.stringify(outcome)};
mkdirSync('.tmp', { recursive: true });
appendFileSync('.tmp/calls', 'test:coverage:pinned\\n');
if (outcome === 'collection-failure') process.exit(1);
const runId = 'synthetic-run-0001';
const selectorReceipt = { tests: ['tests/fixture.test.ts'], test_selection: { mode: 'full-current-test-set' }, test_inputs: [], test_fingerprint: 'fixture-only' };
const source = readFileSync('src/initial.ts', 'utf8');
const functions = functionInventory(source, 'src/initial.ts').map((row) => ({
  identity: row.identity,
  file: row.file,
  start_offset: row.start,
  end_offset: row.end,
  complexity: row.complexity,
  coverage: 1,
  crap: row.complexity,
  maximum_complexity: 10,
  maximum_crap: 10,
}));
const report = {
  schema: outcome === 'crap-schema' ? 'CandidateCrapReport/v1' : 'VidaCrapBudgetReport/v1',
  status: outcome === 'crap-failure' ? 'fail' : 'pass',
  baseline_ref: 'fixture-only',
  budget_plan_sha256: '0'.repeat(64),
  source_fingerprint: 'fixture-only',
  coverage_run_id: runId,
  baseline_coverage_report_ref: 'fixture-only',
  baseline_coverage_report_sha256: '0'.repeat(64),
  selector_receipt: selectorReceipt,
  formula: 'CC^2 * (1 - function_coverage)^3 + CC',
  existing_policy: 'fixture-only',
  new_function_policy: 'fixture-only',
  new_sources: [],
  removed_sources: [],
  functions,
};
const coverage = {
  schema: outcome === 'coverage-schema' ? 'CandidateCoverageReport/v1' : 'VidaBunCoverageReport/v1',
  run_id: outcome === 'run-mismatch' ? 'different-run' : runId,
  manifest_path: 'fixture-only', manifest_sha256: '0'.repeat(64), sources: [], tests: ['tests/fixture.test.ts'],
  test_selection: selectorReceipt.test_selection, module_inputs: [], execution_scope: {}, active_argv: [],
  test_inputs: selectorReceipt.test_inputs, tool_inputs: [], source_maps: {}, source_fingerprint: 'fixture-only', test_fingerprint: selectorReceipt.test_fingerprint,
  tool_fingerprint: 'fixture-only', runtime_executable_sha256: '0'.repeat(64), shards: [], processes: [], coverage: {},
};
mkdirSync('coverage/bun-unified', { recursive: true });
writeFileSync('coverage/bun-unified/crap-budget-report.json', JSON.stringify(report));
writeFileSync('coverage/bun-unified/coverage-final.json', JSON.stringify(coverage));
if (outcome === 'input-drift') writeFileSync('src/initial.ts', 'export const drift = 1;\\n');
`,
  );
  git(root, 'add', '.');
  git(
    root,
    '-c',
    'user.email=fixture@example.invalid',
    '-c',
    'user.name=Fixture',
    'commit',
    '-qm',
    'coverage hook fixture',
  );
  return root;
}
function runPrePush(
  root: string,
  options: Omit<SpawnSyncOptionsWithStringEncoding, 'encoding'> = {},
): SpawnSyncReturns<string> {
  const shell = process.platform === 'win32' ? 'C:/Program Files/Git/bin/sh.exe' : '/bin/sh';
  return execute(root, shell, ['.githooks/pre-push', 'origin', 'unused'], options);
}

void test('isolated pre-push accepts one synthetic current report pair from the collector command', (t: TestContext) => {
  const root = pipelineFixture(t);
  const head = git(root, 'rev-parse', 'HEAD').trim();
  const result = runPrePush(root, { input: `local ${head} remote ${'0'.repeat(40)}\n` });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(path.join(root, 'packages/agent/.tmp/calls'), 'utf8'), 'test:coverage:pinned\n');
});

const pipelineFailures: readonly PipelineOutcome[] = [
  'collection-failure',
  'crap-failure',
  'crap-schema',
  'coverage-schema',
  'run-mismatch',
  'input-drift',
];
for (const outcome of pipelineFailures)
  void test(`isolated pre-push rejects ${outcome} without accepting stale CRAP output`, (t: TestContext) => {
    const root = pipelineFixture(t, outcome);
    const crap = path.join(root, 'packages/agent/coverage/bun-unified/crap-budget-report.json');
    mkdirSync(path.dirname(crap), { recursive: true });
    writeFileSync(crap, JSON.stringify(currentCrapReport()));
    const head = git(root, 'rev-parse', 'HEAD').trim();
    const result = runPrePush(root, { input: `local ${head} remote ${'0'.repeat(40)}\n` });
    assert.notEqual(result.status, 0);
    if (outcome === 'collection-failure') assert.equal(existsSync(crap), false);
    if (outcome !== 'input-drift')
      assert.equal(readFileSync(path.join(root, 'packages/agent/.tmp/calls'), 'utf8'), 'test:coverage:pinned\n');
  });

void test('isolated pre-push returns before collection for deletions and denies alternate local objects', (t: TestContext) => {
  const root = pipelineFixture(t);
  const head = git(root, 'rev-parse', 'HEAD').trim();
  const zero = '0'.repeat(40);
  const deletion = runPrePush(root, { input: `gone ${zero} remote ${head}\n` });
  assert.equal(deletion.status, 0, deletion.stderr);
  assert.equal(existsSync(path.join(root, 'packages/agent/.tmp/calls')), false);
  const alternate = runPrePush(root, { input: `local ${'a'.repeat(40)} remote ${zero}\n` });
  assert.notEqual(alternate.status, 0);
  assert.match(alternate.stderr, /current HEAD/);
  assert.equal(existsSync(path.join(root, 'packages/agent/.tmp/calls')), false);
});

void test('isolated pre-push preserves an existing collection lock without invoking the collector', (t: TestContext) => {
  const root = pipelineFixture(t);
  const lock = path.join(root, '.git/vida-quality-run.lock');
  mkdirSync(lock);
  const head = git(root, 'rev-parse', 'HEAD').trim();
  const result = runPrePush(root, { input: `local ${head} remote ${'0'.repeat(40)}\n` });
  assert.notEqual(result.status, 0);
  assert.ok(existsSync(lock));
  assert.equal(existsSync(path.join(root, 'packages/agent/.tmp/calls')), false);
});

void test('isolated pre-push does not resolve or download Bun when the hook runtime is absent', (t: TestContext) => {
  const root = pipelineFixture(t);
  const environment = { ...process.env };
  const pathKey = Object.keys(environment).find((key) => key.toUpperCase() === 'PATH');
  if (pathKey === undefined) throw new Error('PATH is required for this fixture.');
  const currentPath = environment[pathKey];
  if (currentPath === undefined) throw new Error('PATH is required for this fixture.');
  const executable = process.platform === 'win32' ? 'bun.exe' : 'bun';
  environment[pathKey] = currentPath
    .split(path.delimiter)
    .filter((directory) => !existsSync(path.join(directory.replace(/^"(.*)"$/u, '$1'), executable)))
    .join(path.delimiter);
  const head = git(root, 'rev-parse', 'HEAD').trim();
  const result = runPrePush(root, { input: `local ${head} remote ${'0'.repeat(40)}\n`, env: environment });
  assert.notEqual(result.status, 0);
  assert.equal(existsSync(path.join(root, 'packages/agent/.tmp/calls')), false);
  assert.match(result.stderr, /bun.*(?:not found|not recognized)|command not found/iu);
});
