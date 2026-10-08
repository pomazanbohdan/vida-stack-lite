import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
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
import test from 'node:test';
import { baseline, measuredMaxima, pushedHead, rejectFocusedTests, stableInputs, verifyStagedObjects } from '../../tooling/agent/git-quality-hooks.mjs';

const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const uncertainFixtureRoots = new Set();
function execute(root, executable, args, options = {}) {
  const result = spawnSync(executable, args, { cwd: root, encoding: 'utf8', windowsHide: true, ...options });
  if (result.error || result.signal || !Number.isInteger(result.status)) uncertainFixtureRoots.add(root);
  return result;
}
function git(root, ...args) {
  const result = execute(root, 'git', args);
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}
function temporary(t) {
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
function fixture(t) {
  const root = temporary(t);
  for (const directory of ['.githooks', 'tooling/agent', 'packages/agent/src', 'packages/agent/bin', 'packages/agent/tests', 'packages/agent/tooling'])
    mkdirSync(path.join(root, directory), { recursive: true });
  for (const file of ['.githooks/pre-commit', '.githooks/pre-push', 'tooling/agent/git-quality-hooks.mjs'])
    copyFileSync(path.join(source, file), path.join(root, file));
  const pkg = path.join(root, 'packages/agent');
  symlinkSync(
    path.join(source, 'packages/agent/node_modules'),
    path.join(pkg, 'node_modules'),
    process.platform === 'win32' ? 'junction' : 'dir',
  );
  copyFileSync(path.join(source, 'packages/agent/.oxfmtrc.json'), path.join(pkg, '.oxfmtrc.json'));
  copyFileSync(path.join(source, 'packages/agent/oxlint.config.json'), path.join(pkg, 'oxlint.config.json'));
  copyFileSync(path.join(source, 'packages/agent/bin/bun.mjs'), path.join(pkg, 'bin/bun.mjs'));
  copyFileSync(path.join(source, 'packages/agent/.bun-version'), path.join(pkg, '.bun-version'));
  writeFileSync(path.join(pkg, 'package.json'), JSON.stringify({type: 'module', packageManager: 'bun@1.4.2', engines: {bun: '1.4.2'}}));
  for (const file of ['AGENTS.md', 'AGENT.sidecar.md', 'agent-runtime.config.v1.yaml', '.gitattributes'])
    writeFileSync(path.join(root, file), file === '.gitattributes' ? '*.ts text eol=lf\n' : 'Fixture root input\n');
  writeFileSync(
    path.join(pkg, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: { strict: true, noEmit: true, target: 'ES2024', types: [] },
      include: ['src/**/*.ts'],
    }),
  );
  writeFileSync(path.join(root, '.gitignore'), 'packages/agent/node_modules/\n');
  writeFileSync(path.join(pkg, 'src/initial.ts'), 'export const initial = 1;\n');
  git(root, 'init', '-q');
  git(root, 'config', 'user.email', 'fixture@example.invalid');
  git(root, 'config', 'user.name', 'Fixture');
  git(root, 'add', '.');
  git(root, 'commit', '-qm', 'fixture baseline');
  git(root, 'config', 'core.hooksPath', '.githooks');
  return root;
}

test('real Git pre-commit formats a new Unicode/spaces TS module and checks full project', {timeout: 60_000}, (t) => {
  const root = fixture(t);
  const file = 'packages/agent/src/новий модуль.ts';
  writeFileSync(path.join(root, file), 'export const value:number=3');
  git(root, 'add', '--', file);
  git(root, 'commit', '-qm', 'formatted module');
  assert.match(git(root, 'show', `HEAD:${file}`), /value: number = 3;/);
  writeFileSync(path.join(root, file), 'export const value: number = "wrong";\n');
  git(root, 'add', '--', file);
  const result = execute(root, 'git', ['commit', '-qm', 'must fail']);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /TS2322/);
});

test('partial staging rejects before writes and preserves unrelated index/worktree', {timeout: 30_000}, (t) => {
  const root = fixture(t);
  const file = 'packages/agent/src/initial.ts';
  writeFileSync(path.join(root, file), 'export const initial=2');
  git(root, 'add', '--', file);
  writeFileSync(path.join(root, file), 'export const initial=3');
  writeFileSync(path.join(root, 'unrelated.txt'), 'staged\n');
  git(root, 'add', 'unrelated.txt');
  writeFileSync(path.join(root, 'unrelated.txt'), 'unstaged\n');
  const index = git(root, 'ls-files', '--stage', '-z');
  const result = execute(root, 'git', ['commit', '-qm', 'must fail']);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Partially staged/);
  assert.equal(git(root, 'ls-files', '--stage', '-z'), index);
  assert.equal(readFileSync(path.join(root, file), 'utf8'), 'export const initial=3');
  assert.equal(readFileSync(path.join(root, 'unrelated.txt'), 'utf8'), 'unstaged\n');
});

test('untracked maintained graph input rejects before staged formatting', {timeout: 30_000}, (t) => {
  const root = fixture(t);
  writeFileSync(path.join(root, 'packages/agent/src/initial.ts'), 'export const initial=2');
  git(root, 'add', 'packages/agent/src/initial.ts');
  writeFileSync(path.join(root, 'packages/agent/src/disconnected.ts'), 'export const bad: number = "wrong";');
  const result = execute(root, 'git', ['commit', '-qm', 'must fail']);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Checked inputs differ/);
  assert.equal(readFileSync(path.join(root, 'packages/agent/src/initial.ts'), 'utf8'), 'export const initial=2');
});

test('successful formatting preserves unrelated staged and separate unstaged text bytes', {timeout: 60_000}, (t) => {
  const root = fixture(t);
  writeFileSync(path.join(root, 'packages/agent/src/initial.ts'), 'export const initial=2');
  git(root, 'add', 'packages/agent/src/initial.ts');
  writeFileSync(path.join(root, 'unrelated.txt'), 'staged\n');
  git(root, 'add', 'unrelated.txt');
  writeFileSync(path.join(root, 'separate-untracked.txt'), 'unstaged\n');
  git(root, 'commit', '-qm', 'preserve unrelated');
  assert.equal(git(root, 'show', 'HEAD:unrelated.txt'), 'staged\n');
  assert.equal(readFileSync(path.join(root, 'separate-untracked.txt'), 'utf8'), 'unstaged\n');
  assert.equal(git(root, 'ls-files', '--', 'separate-untracked.txt'), '');
});

test('real pre-commit rejects a type-correct floating promise through the complete lint profile', {timeout: 60_000}, (t) => {
  const root = fixture(t), file = 'packages/agent/src/initial.ts';
  writeFileSync(path.join(root, file), 'export async function observed() { return 1; }\nobserved();\n');
  git(root, 'add', '--', file);
  const before = git(root, 'rev-parse', 'HEAD');
  const result = execute(root, 'git', ['commit', '-qm', 'must reject lint']);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /no-floating-promises/);
  assert.equal(git(root, 'rev-parse', 'HEAD'), before);
});

test('real pre-commit rejects a focused Bun test before allowing a commit', {timeout: 60_000}, (t) => {
  const root = fixture(t), file = 'packages/agent/tests/focused.test.mjs';
  writeFileSync(path.join(root, file), "import { test as check } from 'bun:test'; check.only('fixture', () => {});\n");
  git(root, 'add', '--', file);
  const before = git(root, 'rev-parse', 'HEAD');
  const result = execute(root, 'git', ['commit', '-qm', 'must reject focused test']);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Focused test is forbidden/);
  assert.equal(git(root, 'rev-parse', 'HEAD'), before);
});

test('root instruction, sidecar, YAML and attributes drift invalidate checked inputs', {timeout: 30_000}, (t) => {
  const root = fixture(t);
  const before = stableInputs(root);
  for (const file of ['AGENTS.md', 'AGENT.sidecar.md', 'agent-runtime.config.v1.yaml', '.gitattributes']) {
    const original = readFileSync(path.join(root, file));
    writeFileSync(path.join(root, file), Buffer.concat([original, Buffer.from('Changed\n')]));
    assert.throws(() => stableInputs(root), /Checked inputs differ/);
    writeFileSync(path.join(root, file), original);
    assert.equal(stableInputs(root), before);
  }
});

for (const flag of ['assume-unchanged', 'skip-worktree']) {
  test(`checked inputs reject drift hidden by ${flag}`, {timeout: 30_000}, (t) => {
    const root = fixture(t);
    for (const file of ['AGENTS.md', 'AGENT.sidecar.md', 'agent-runtime.config.v1.yaml', '.gitattributes', 'packages/agent/src/initial.ts']) {
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

test('staging validation uses Git path filters and rejects byte or mode changes', {timeout: 30_000}, (t) => {
  const root = fixture(t), file = 'packages/agent/src/initial.ts';
  const index = git(root, 'ls-files', '--stage', '-z');
  const bytes = Buffer.from('export const initial = 2;\r\n');
  writeFileSync(path.join(root, file), bytes);
  const expected = execute(root, 'git', ['hash-object', '--path=' + file, '--stdin'], {input: bytes});
  assert.equal(expected.status, 0, expected.stderr);
  const objects = [[file, expected.stdout.trim()]];
  git(root, 'add', '--', file);
  verifyStagedObjects(root, objects, index);
  git(root, 'update-index', '--chmod=+x', '--', file);
  assert.throws(() => verifyStagedObjects(root, objects, index), /Staged bytes or mode changed/);
  git(root, 'update-index', '--chmod=-x', '--', file);
  writeFileSync(path.join(root, file), 'export const initial = 3;\n');
  git(root, 'add', '--', file);
  assert.throws(() => verifyStagedObjects(root, objects, index), /Staged bytes or mode changed/);
});

test('focused-test AST checks catch Bun aliases and namespaces and allow comments and strings', async (t) => {
  const root = temporary(t), file = path.join(root, 'focused.test.mjs');
  const pkg = path.join(source, 'packages/agent');
  for (const body of ["import { test } from 'bun:test'; test.only('x', () => {});",
    "import { test as check } from 'bun:test'; check['only']('x', () => {});",
    "import * as suite from 'bun:test'; suite.test.only('x', () => {});",
    "import { describe as group } from 'vitest'; group.only('x', () => {});"]) {
    writeFileSync(file, body);
    await assert.rejects(rejectFocusedTests(pkg, [file]), /Focused test is forbidden/);
  }
  writeFileSync(file, "import { test } from 'bun:test'; // test.only('x')\nconst text = 'test.only'; test('ordinary', () => {});\n");
  await rejectFocusedTests(pkg, [file]);
});

test('all ref rows are checked, deletions ignored, alternate local OIDs denied', () => {
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

test('actual pre-push entrypoint accepts deletion-only and rejects alternate object without collection', (t) => {
  const root = fixture(t),
    head = git(root, 'rev-parse', 'HEAD').trim();
  const shell = process.platform === 'win32' ? 'C:/Program Files/Git/bin/sh.exe' : 'sh';
  const deletion = execute(root, shell, ['.githooks/pre-push', 'origin', 'unused'], {
    input: `delete ${'0'.repeat(40)} remote ${head}\n`,
  });
  assert.equal(deletion.status, 0, deletion.stderr);
  const alternate = execute(root, shell, ['.githooks/pre-push', 'origin', 'unused'], {
    input: `local ${'a'.repeat(40)} remote ${head}\n`,
  });
  assert.notEqual(alternate.status, 0);
  assert.match(alternate.stderr, /current HEAD/);
  assert.equal(existsSync(path.join(root, '.git/vida-quality-allowance')), false);
});

const row = {
  file: 'src/a.ts',
  start_offset: 0,
  end_offset: 10,
  complexity: 6,
  coverage: 1,
  crap: 6,
  covered: true,
  executions: 1,
  coverage_source: 'v8-statements',
};
function numericReport() {
  return {
    schema: 'CandidateCrapReport/v1',
    formula: 'complexity^2 * (1-coverage)^3 + complexity',
    required_crap: '<5',
    maximum_complexity: 10,
    status: 'fail',
    reason: 'one or more maintained functions do not satisfy CRAP <5 and complexity <=10',
    details: { functions: [{ ...row }], failed: [{ ...row }] },
  };
}
test('only complete numeric CRAP results are accepted; formula, mapping and technical errors fail', () => {
  const inventory = new Map([['src/a.ts:0:10', 6]]);
  assert.deepEqual(measuredMaxima(numericReport(), 1, inventory), { maximum_crap: 6, maximum_complexity: 6 });
  for (const alteration of [
    (r) => (r.reason = 'coverage/source fingerprint mismatch'),
    (r) => (r.details.functions[0].crap = 1),
    (r) => (r.details.functions[0].coverage_source = 'missing'),
    (r) => (r.details.failed = []),
  ]) {
    const report = numericReport();
    alteration(report);
    assert.throws(() => measuredMaxima(report, 1, inventory));
  }
  assert.throws(() => measuredMaxima(numericReport(), 1, new Map([...inventory, ['src/a.ts:11:20', 1]])), /incomplete/);
});

test('atomic single baseline never raises allowance and missing/corrupt initialized state fails', (t) => {
  const directory = path.join(temporary(t), 'allowance');
  baseline(directory, { maximum_crap: 6, maximum_complexity: 6 });
  const before = readFileSync(path.join(directory, 'allowance.json'), 'utf8');
  baseline(directory, { maximum_crap: 5, maximum_complexity: 5 });
  assert.equal(readFileSync(path.join(directory, 'allowance.json'), 'utf8'), before);
  assert.throws(() => baseline(directory, { maximum_crap: 7, maximum_complexity: 6 }), /allowance/);
  writeFileSync(path.join(directory, 'allowance.json'), '{}');
  assert.throws(() => baseline(directory, { maximum_crap: 1, maximum_complexity: 1 }), /Corrupt/);
  rmSync(path.join(directory, 'allowance.json'));
  assert.throws(() => baseline(directory, { maximum_crap: 1, maximum_complexity: 1 }));
  rmSync(directory, { recursive: true });
  assert.throws(() => baseline(directory, { maximum_crap: 1, maximum_complexity: 1 }), /missing initialized/);
});

test('production orchestration has one coverage pipeline, no mutation/install resolver or ordinary duplicate suite', () => {
  const implementation = readFileSync(path.join(source, 'tooling/agent/git-quality-hooks.mjs'), 'utf8');
  assert.equal((implementation.match(/run\('test:coverage:pinned'\)/g) ?? []).length, 1);
  assert.equal((implementation.match(/run\('coverage:gate:pinned', true\)/g) ?? []).length, 1);
  assert.equal((implementation.match(/run\('crap:pinned'\)/g) ?? []).length, 1);
  assert.doesNotMatch(implementation, /run\('(?:test:pinned|build:pinned|test:mutation|ci)/);
  assert.doesNotMatch(implementation, /resolvePinnedBun|findNpmCli|npm.*exec.*--yes/);
});

// These temporary scripts prove orchestration only; they do not collect or claim production coverage.
function pipelineFixture(t, outcome = 'pass') {
  const root = fixture(t),
    pkg = path.join(root, 'packages/agent');
  git(root, 'config', 'core.hooksPath', '.git/hooks');
  mkdirSync(path.join(pkg, 'tooling'), { recursive: true });
  writeFileSync(path.join(pkg, '.bun-version'), '1.4.2\n');
  writeFileSync(path.join(pkg, 'bunfig.toml'), '');
  writeFileSync(
    path.join(pkg, 'src/initial.ts'),
    'function measured() { if (true) {} if (true) {} if (true) {} if (true) {} if (true) {} }\n',
  );
  writeFileSync(
    path.join(pkg, 'package.json'),
    JSON.stringify({
      type: 'module',
      packageManager: 'bun@1.4.2',
      engines: { bun: '1.4.2' },
      scripts: {
        'test:coverage:pinned': 'bun tooling/fixture.mjs collect',
        'coverage:gate:pinned': 'bun tooling/fixture.mjs coverage',
        'crap:pinned': 'bun tooling/fixture.mjs crap',
      },
    }),
  );
  writeFileSync(
    path.join(pkg, 'tooling/maintained-source-inventory.mjs'),
    "export function maintainedSourceInventory() { return { v8CoverageSources: ['src/initial.ts'], bunCoverageSources: [], typescriptSources: ['src/initial.ts'] }; }\n",
  );
  writeFileSync(
    path.join(pkg, 'tooling/fixture.mjs'),
    `
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parse } from '@babel/parser';
mkdirSync('.tmp', { recursive: true });
const stage = process.argv[2];
appendFileSync('.tmp/calls', stage + '\\n');
if (stage === 'collect') {
  appendFileSync('.tmp/calls', 'build\\nv8\\nnative\\n');
  mkdirSync('coverage', { recursive: true });
  if (${JSON.stringify(outcome)} === 'collection-failure') process.exit(1);
}
if (stage === 'coverage') {
  console.log(JSON.stringify({ schema: 'CandidateCoverageReport/v1', status: ${JSON.stringify(outcome)} === 'coverage-failure' ? 'gap' : 'pass' }));
  if (${JSON.stringify(outcome)} === 'coverage-failure') process.exit(1);
}
if (stage === 'crap') {
  const node = parse(readFileSync('src/initial.ts', 'utf8'), { sourceType: 'module' }).program.body[0];
  const row = { file: 'src/initial.ts', start_offset: node.start, end_offset: node.end, complexity: 6, coverage: 1, crap: 6, covered: true, executions: 1, coverage_source: 'v8-statements' };
  const report = ${JSON.stringify(numericReport())};
  report.details.functions = [row]; report.details.failed = [row];
  if (${JSON.stringify(outcome)} === 'technical-failure') report.reason = 'coverage/source fingerprint mismatch';
  writeFileSync('coverage/crap-report.json', JSON.stringify(report));
  if (${JSON.stringify(outcome)} === 'input-drift') writeFileSync('src/initial.ts', 'export const drift = 1;');
  process.exit(1);
}
`,
  );
  git(root, 'add', '.');
  git(root, 'commit', '-qm', 'fixture orchestration inputs');
  return root;
}
function pushFixture(root, options = {}) {
  const head = git(root, 'rev-parse', 'HEAD').trim();
  return execute(root, process.execPath, ['tooling/agent/git-quality-hooks.mjs', 'pre-push'], {
    input: `local ${head} remote ${'0'.repeat(40)}\n`,
    ...options,
  });
}

test('real pinned Bun fixture orchestration runs one build/each lane, controlled roots, fixed baseline', (t) => {
  const root = pipelineFixture(t);
  const result = pushFixture(root, {
    env: {
      ...process.env,
      COVERAGE_GATE_ROOT: 'untrusted',
      CRAP_GATE_ROOT: 'untrusted',
      BUN_NATIVE_COVERAGE_OUTPUT_ROOT: 'untrusted',
    },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    readFileSync(path.join(root, 'packages/agent/.tmp/calls'), 'utf8'),
    'collect\nbuild\nv8\nnative\ncoverage\ncrap\n',
  );
  const allowed = JSON.parse(readFileSync(path.join(root, '.git/vida-quality-allowance/allowance.json')));
  assert.equal(allowed.maximum_crap, 6);
  assert.equal(allowed.maximum_complexity, 6);
  assert.equal(existsSync(path.join(root, 'untrusted')), false);
});

for (const failure of ['collection-failure', 'coverage-failure', 'technical-failure', 'input-drift'])
  test(`fixture ${failure} rejects without baseline initialization or stale reuse`, (t) => {
    const root = pipelineFixture(t, failure);
    mkdirSync(path.join(root, 'packages/agent/coverage'), { recursive: true });
    writeFileSync(path.join(root, 'packages/agent/coverage/crap-report.json'), JSON.stringify(numericReport()));
    const result = pushFixture(root);
    assert.notEqual(result.status, 0);
    assert.equal(existsSync(path.join(root, '.git/vida-quality-allowance')), false);
    assert.equal(
      readFileSync(path.join(root, 'packages/agent/.tmp/calls'), 'utf8'),
      'collect\nbuild\nv8\nnative\ncoverage\ncrap\n',
    );
  });

test('missing installed Bun rejects with no npm/download or collection fallback', (t) => {
  const root = pipelineFixture(t);
  const env = { ...process.env };
  const key = Object.keys(env).find((entry) => entry.toUpperCase() === 'PATH');
  env[key] = env[key]
    .split(path.delimiter)
    .filter(
      (directory) =>
        !existsSync(path.join(directory.replace(/^"(.*)"$/, '$1'), process.platform === 'win32' ? 'bun.exe' : 'bun')),
    )
    .join(path.delimiter);
  const result = pushFixture(root, { env });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /no npm-exec\/download fallback/);
  assert.equal(existsSync(path.join(root, 'packages/agent/.tmp/calls')), false);
});

test('existing collection lock rejects without deleting another run lock or collecting', (t) => {
  const root = pipelineFixture(t);
  const lock = path.join(root, '.git/vida-quality-run.lock');
  mkdirSync(lock);
  const result = pushFixture(root);
  assert.notEqual(result.status, 0);
  assert.ok(existsSync(lock));
  assert.equal(existsSync(path.join(root, 'packages/agent/.tmp/calls')), false);
});
