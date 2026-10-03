import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, test } from 'bun:test';
import { boundedSpawnSync, executionBudget, commandOutcomeUnknown, requireTerminalCommand } from '../bin/bun.mjs';
import { maintainedSourceInventory } from '../tooling/maintained-source-inventory.mjs';
import { sdkCompatibilityManifest } from '../tooling/pack-sdk.mjs';

const candidateRoot = path.resolve(import.meta.dirname, '..');
const phaseBudget = executionBudget(undefined, 30_000);

test('default npm packaging verifies the available SDK contract without advertising unfinished standalone assets', () => {
  const manifest = JSON.parse(readFileSync(path.join(candidateRoot, 'package.json'), 'utf8'));
  assert.equal(manifest.scripts.prepack, 'node bin/bun.mjs run prepack:pinned');
  assert.equal(manifest.scripts['prepack:pinned'], 'bun tooling/pack-sdk.mjs --verify');
  assert.ok(manifest.files.includes('tooling/pack-sdk.mjs'));
  assert.ok(manifest.files.includes('tests/bun/runtime-initialization.test.mjs'));
  assert.ok(
    manifest.files.every((entry) => !/standalone|release-notes|release-publish/.test(entry)),
    'npm package files must not promise unavailable standalone assets',
  );
  assert.ok(
    Object.keys(manifest.scripts).every((name) => !/standalone/.test(name)),
    'npm scripts must not advertise unavailable standalone commands',
  );
  const sdk = sdkCompatibilityManifest({ root: candidateRoot });
  assert.ok(sdk.value.files.includes('tooling/pack-sdk.mjs'));
  assert.equal(sdk.value.scripts.prepack, 'node bin/bun.mjs tooling/pack-sdk.mjs --verify');
  assert.ok(
    sdk.value.files.every((entry) => !/standalone|release-notes|release-publish/.test(entry)),
    'SDK release projection must use the same explicit distribution boundary',
  );
});

test('the internal research implementation ships for the CLI without becoming a public export', () => {
  const manifest = JSON.parse(readFileSync(path.join(candidateRoot, 'package.json'), 'utf8'));
  const inventory = maintainedSourceInventory(candidateRoot);
  assert.ok(manifest.files.includes('src/research-decision.ts'));
  assert.ok(manifest.files.includes('!tests/research-decision.test.mjs'));
  assert.ok(!inventory.repositoryOnlySources.includes('src/research-decision.ts'));
  assert.ok(inventory.mutationSources.includes('src/research-decision.ts'));
  const exports = readFileSync(path.join(candidateRoot, 'dist/src/index.js'), 'utf8');
  assert.ok(!exports.includes('recordResearchResult'));
  assert.ok(existsSync(path.join(candidateRoot, 'dist/src/research-decision.d.ts')));
  assert.equal(Object.hasOwn(manifest.exports, './research-decision'), false);
  assert.ok(inventory.typescriptSources.includes('src/config/runtime-config.ts'));
  assert.ok(manifest.files.includes('schemas/research-result.v1.schema.json'));
});

test('every schema copied by the portable build is included in source and built package files', () => {
  const manifest = JSON.parse(readFileSync(path.join(candidateRoot, 'package.json'), 'utf8'));
  const buildSource = readFileSync(path.join(candidateRoot, 'tooling/build-package.mjs'), 'utf8');
  const declaration = buildSource.match(/const schemaNames = \[([\s\S]*?)\];/u);
  assert.ok(declaration, 'portable build must declare its schema copy list');
  const names = [...declaration[1].matchAll(/(['"])([^'"]+\.schema\.json)\1/gu)].map((match) => match[2]);
  assert.ok(names.length > 0);
  for (const name of names) {
    assert.ok(manifest.files.includes(`schemas/${name}`), `source schema is not packed: ${name}`);
    assert.ok(manifest.files.includes(`dist/schemas/${name}`), `built schema is not packed: ${name}`);
  }
});

test('every literal relative import from shipped source resolves inside the package allowlist', () => {
  const manifest = JSON.parse(readFileSync(path.join(candidateRoot, 'package.json'), 'utf8'));
  const inventory = maintainedSourceInventory(candidateRoot);
  const included = manifest.files.filter((entry) => !entry.startsWith('!')).map((entry) => new Bun.Glob(entry));
  const excluded = manifest.files.filter((entry) => entry.startsWith('!')).map((entry) => new Bun.Glob(entry.slice(1)));
  const packed = (relative) =>
    included.some((glob) => glob.match(relative)) && !excluded.some((glob) => glob.match(relative));
  for (const sourcePath of inventory.mutationSources) {
    const absolute = path.join(candidateRoot, sourcePath);
    const source = readFileSync(absolute, 'utf8');
    const imports = [
      ...source.matchAll(/\b(?:from\s*|import\s*\(\s*)['"](\.[^'"]+)['"]/gu),
      ...source.matchAll(/\bimport\s*['"](\.[^'"]+)['"]/gu),
    ];
    for (const [, specifier] of imports) {
      const resolved = path.resolve(path.dirname(absolute), specifier);
      const target = existsSync(resolved)
        ? resolved
        : resolved.endsWith('.js') && existsSync(resolved.slice(0, -3) + '.ts')
          ? resolved.slice(0, -3) + '.ts'
          : resolved;
      const relative = path.relative(candidateRoot, target).replaceAll('\\', '/');
      assert.ok(
        existsSync(target) && !relative.startsWith('../') && packed(relative),
        `${sourcePath} imports ${specifier}, but ${relative} is not a shipped file`,
      );
    }
  }
});

test('public declaration graph closes inside the portable package', () => {
  const manifest = JSON.parse(readFileSync(path.join(candidateRoot, 'package.json'), 'utf8'));
  const included = manifest.files.filter((entry) => !entry.startsWith('!')).map((entry) => new Bun.Glob(entry));
  const excluded = manifest.files.filter((entry) => entry.startsWith('!')).map((entry) => new Bun.Glob(entry.slice(1)));
  const packed = (relative) =>
    included.some((glob) => glob.match(relative)) && !excluded.some((glob) => glob.match(relative));
  const pending = ['dist/src/index.d.ts', 'dist/src/trusted-host.d.ts'];
  const checked = new Set();
  const missing = [];
  while (pending.length) {
    const relative = pending.pop();
    if (checked.has(relative)) continue;
    checked.add(relative);
    if (!packed(relative)) missing.push(relative);
    if (!existsSync(path.join(candidateRoot, relative))) {
      missing.push(`${relative} (not built)`);
      continue;
    }
    const source = readFileSync(path.join(candidateRoot, relative), 'utf8');
    for (const [, specifier] of source.matchAll(/(?:\bfrom\s*|\bimport\s*\()['"](\.[^'"]+)['"]/gu)) {
      const target = path.posix.normalize(
        path.posix.join(path.posix.dirname(relative), specifier.replace(/\.js$/u, '.d.ts')),
      );
      if (!existsSync(path.join(candidateRoot, target))) missing.push(`${target} (not built; from ${relative})`);
      pending.push(target);
    }
  }
  assert.deepEqual(missing.sort(), [], `public declarations missing from package: ${missing.join(', ')}`);
});

test('installed-bundle verification has only shipped generic test inputs and preserves development release gates', () => {
  const manifest = JSON.parse(readFileSync(path.join(candidateRoot, 'package.json'), 'utf8'));
  assert.ok(manifest.files.includes('bin/init-core.mjs'));
  assert.equal(manifest.bin['vida-agent-documentation-clear'], './bin/documentation-clear.mjs');
  for (const file of [
    'bin/documentation-clear.mjs',
    'schemas/documentation-policy.v1.schema.json',
    'schemas/documentation-change-event.v1.schema.json',
    'schemas/documentation-clear-checkpoint.v1.schema.json',
    'dist/schemas/documentation-policy.v1.schema.json',
    'dist/schemas/documentation-change-event.v1.schema.json',
    'dist/schemas/documentation-clear-checkpoint.v1.schema.json',
  ])
    assert.ok(manifest.files.includes(file), `portable package must include ${file}`);
  assert.equal(Object.hasOwn(manifest.exports, './bin/init-core.mjs'), false);
  for (const file of [
    'tests/fuzz.test.mjs',
    'tests/zombies.test.mjs',
    'tests/bun-coverage.test.mjs',
    'stryker.config.mjs',
    'tooling/portable-smoke.mjs',
  ])
    assert.ok(manifest.files.includes(file), `portable package must include ${file}`);
  for (const dependency of ['fast-check', 'vitest', '@vitest/coverage-v8', 'istanbul-lib-instrument'])
    assert.ok(manifest.devDependencies[dependency], `portable test dependency must be declared: ${dependency}`);

  assert.equal(manifest.scripts.verify, 'node bin/bun.mjs run verify:pinned');
  assert.equal(manifest.scripts['verify:pinned'], 'bun run verify:portable:pinned');
  assert.match(manifest.scripts['verify:portable:pinned'], /^bun install --frozen-lockfile/);
  assert.equal(manifest.scripts.ci, 'node bin/bun.mjs run ci:pinned');
  assert.equal(manifest.scripts['ci:pinned'], 'bun run verify:portable:pinned');
  assert.equal(manifest.scripts['ci:candidate'], 'node bin/bun.mjs run ci:candidate:pinned');
  for (const retiredDiagnostic of ['test:differential:pinned', 'test:parity:pinned']) {
    assert.equal(Object.hasOwn(manifest.scripts, retiredDiagnostic), false);
    assert.equal(manifest.scripts['ci:candidate:pinned'].includes(retiredDiagnostic), false);
  }
  for (const repositoryOnlyGate of ['test:coverage:pinned', 'crap:pinned']) {
    assert.equal(manifest.scripts['ci:pinned'].includes(repositoryOnlyGate), false);
    const candidateGate =
      repositoryOnlyGate === 'test:coverage:pinned' ? 'test:coverage:built:pinned' : repositoryOnlyGate;
    assert.ok(
      manifest.scripts['ci:candidate:pinned'].includes(candidateGate),
      `candidate-repository ci retains ${repositoryOnlyGate}`,
    );
    if (candidateGate !== repositoryOnlyGate) {
      assert.equal(manifest.scripts['ci:pinned'].includes(candidateGate), false);
      assert.equal(
        manifest.scripts[candidateGate],
        manifest.scripts[repositoryOnlyGate].replace(/^bun run build:pinned && /, ''),
      );
    }
  }
  assert.equal(manifest.scripts['test:mutation'], 'node bin/bun.mjs run test:mutation:pinned');
  assert.match(manifest.scripts['test:mutation:pinned'], /\bbun tooling\/mutation-gate\.mjs\b/u);
  for (const aggregate of ['ci:pinned', 'ci:candidate:pinned', 'verify:portable:pinned'])
    assert.ok(!manifest.scripts[aggregate].includes('test:mutation'), `${aggregate} must keep mutation manual`);
});

const roots = [];
const retainedRoots = new Set();
afterEach(() => {
  for (const root of roots.splice(0)) {
    if (retainedRoots.has(root)) continue;
    rmSync(root, { recursive: true, force: true });
  }
}, 60_000);

function fixture() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'runtime-dist-clean-'));
  roots.push(root);
  mkdirSync(path.join(root, 'tooling'));
  cpSync(new URL('../tooling/clean.mjs', import.meta.url), path.join(root, 'tooling/clean.mjs'));
  for (const dir of ['dist', 'coverage', '.pack-inspect']) {
    mkdirSync(path.join(root, dir));
    writeFileSync(path.join(root, dir, 'owner.txt'), dir + ' bytes');
  }
  return root;
}

function run(root, args) {
  return spawnSync(process.execPath, [path.join(root, 'tooling/clean.mjs'), ...args], {
    cwd: os.tmpdir(),
    encoding: 'utf8',
    windowsHide: true,
    timeout: 30_000,
  });
}

test('dist-only rebuild cleanup preserves coverage and inspection bytes from an unrelated cwd', () => {
  const root = fixture();
  const result = run(root, ['--dist-only']);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(existsSync(path.join(root, 'dist')), false);
  for (const dir of ['coverage', '.pack-inspect']) {
    assert.equal(readFileSync(path.join(root, dir, 'owner.txt'), 'utf8'), dir + ' bytes');
  }
  assert.equal(run(root, ['--dist-only']).status, 0);
}, 60_000);

test('unknown or repeated cleanup flags fail before removing anything', () => {
  const root = fixture();
  for (const args of [['--all'], ['--dist-only', '--dist-only'], ['--dist-only', '../coverage']]) {
    const result = run(root, args);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Usage/);
    for (const dir of ['dist', 'coverage', '.pack-inspect'])
      assert.equal(readFileSync(path.join(root, dir, 'owner.txt'), 'utf8'), dir + ' bytes');
  }
}, 60_000);

test('coverage cleanup cannot remove the portable smoke default receipt outside the package root', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'vida-clean-receipt-root-'));
  const receipt = path.join(os.tmpdir(), `vida-portable-receipt-${process.pid}-${Date.now()}.json`);
  try {
    mkdirSync(path.join(root, 'tooling'), { recursive: true });
    cpSync(path.join(candidateRoot, 'tooling', 'clean.mjs'), path.join(root, 'tooling', 'clean.mjs'));
    mkdirSync(path.join(root, 'coverage'), { recursive: true });
    writeFileSync(path.join(root, 'coverage', 'ephemeral.txt'), 'coverage');
    writeFileSync(receipt, 'portable-smoke');
    const result = spawnSync('node', ['tooling/clean.mjs'], { cwd: root, encoding: 'utf8', windowsHide: true });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(existsSync(path.join(root, 'coverage')), false);
    assert.equal(readFileSync(receipt, 'utf8'), 'portable-smoke');
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(receipt, { force: true });
  }
});

test('explicit general clean retains its existing three-directory behavior', () => {
  const root = fixture();
  const result = run(root, []);
  assert.equal(result.status, 0, result.stderr);
  for (const dir of ['dist', 'coverage', '.pack-inspect']) assert.equal(existsSync(path.join(root, dir)), false);
}, 60_000);

test('dist-only cleanup rejects a linked target and preserves its destination', () => {
  const root = fixture();
  rmSync(path.join(root, 'dist'), { recursive: true });
  symlinkSync(path.join(root, 'coverage'), path.join(root, 'dist'), process.platform === 'win32' ? 'junction' : 'dir');
  const result = run(root, ['--dist-only']);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /not a real directory/);
  assert.equal(readFileSync(path.join(root, 'coverage/owner.txt'), 'utf8'), 'coverage bytes');
}, 60_000);

test('dist-only cleanup rejects a regular file target and preserves its bytes', () => {
  const root = fixture();
  rmSync(path.join(root, 'dist'), { recursive: true });
  writeFileSync(path.join(root, 'dist'), 'keep this file');
  const result = run(root, ['--dist-only']);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /not a real directory/);
  assert.equal(readFileSync(path.join(root, 'dist'), 'utf8'), 'keep this file');
}, 60_000);

test('dist-only cleanup rejects a linked target outside the candidate root', () => {
  const root = fixture();
  const external = mkdtempSync(path.join(os.tmpdir(), 'runtime-dist-external-'));
  roots.push(external);
  writeFileSync(path.join(external, 'owner.txt'), 'external bytes');
  rmSync(path.join(root, 'dist'), { recursive: true });
  symlinkSync(external, path.join(root, 'dist'), process.platform === 'win32' ? 'junction' : 'dir');
  const result = run(root, ['--dist-only']);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /not a real directory/);
  assert.equal(readFileSync(path.join(external, 'owner.txt'), 'utf8'), 'external bytes');
}, 60_000);

test('packed isolated copy executes the portable verification contract without this checkout', () => {
  const budget = phaseBudget.child(Infinity, 30_000);
  const staging = mkdtempSync(path.join(os.tmpdir(), 'runtime-portable-package-'));
  roots.push(staging);
  const packed = boundedSpawnSync(
    spawnSync,
    process.execPath,
    ['pm', 'pack', '--destination', staging, '--quiet'],
    {
      cwd: candidateRoot,
      encoding: 'utf8',
      windowsHide: true,
      timeout: 180_000,
      budget,
      diagnostics: true,
    },
    'portable archive packing',
  );
  if (commandOutcomeUnknown(packed) || packed.status !== 0) retainedRoots.add(staging);
  requireTerminalCommand(packed, 'portable archive packing');
  assert.equal(packed.status, 0, packed.stderr);
  const archive = packed.stdout.trim().split(/\r?\n/).at(-1);
  assert.ok(archive, 'pack must report the archive path');
  const packageSha256 = createHash('sha256').update(readFileSync(archive)).digest('hex');

  const resultPath = path.join(staging, 'portable-smoke.result.json');
  const smoke = boundedSpawnSync(
    spawnSync,
    'node',
    [path.join(candidateRoot, 'tooling/portable-smoke.mjs'), '--archive', archive, '--result', resultPath],
    {
      cwd: staging,
      encoding: 'utf8',
      windowsHide: true,
      timeout: Infinity,
      budget,
      diagnostics: true,
    },
    'extracted portable smoke',
  );
  // A completed smoke failure can carry an uncertain nested child. Keep its
  // archive and result as well as the smoke owner's independently retained root.
  if (commandOutcomeUnknown(smoke) || smoke.status !== 0) retainedRoots.add(staging);
  requireTerminalCommand(smoke, 'extracted portable smoke');
  assert.equal(smoke.status, 0, smoke.stderr);
  assert.deepEqual(JSON.parse(readFileSync(resultPath, 'utf8')), {
    schema: 'VidaAgentPortableSmoke/v1',
    status: 'passed',
    package_sha256: packageSha256,
    copied_bundle: true,
    initialization_files: [
      'AGENTS.md',
      'AGENT.sidecar.md',
      'agent-runtime.config.v1.yaml',
      'docs/agent-instructions/documentation-policy.v1.json',
      '.agent/runtime-initialization.v1.json',
    ],
    run_result: { schema: 'VidaAgentRunResult/v1', status: 'prepared', execution_status: 'suspended' },
  });
}, 0);
